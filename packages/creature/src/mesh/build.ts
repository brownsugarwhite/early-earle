import { parseBauplan, type Bauplan } from '../bauplan/schema';
import { shapeHash } from '../bauplan/hash';
import type { Vec3 } from '../math/vec';
import { construct, type Bone, type Construction, type EyeSpec, type PartGroup } from '../sdf/build';
import { evalScene } from '../sdf/scene';
import { lefzenTiefe, surfacePoint, type Tooth } from '../mouth/mouth';
import { computeDescriptors, smoothWeights, type Descriptors } from './descriptors';
import { cutMouth, faceNormalsFor } from './mundschnitt';
import { makeRng } from '../math/rng';
import { add, clamp, clamp01, normalize, scale, smoothstep, sub } from '../math/vec';
import { adjacency, contourManifold, largestComponent, nonManifoldEdges, orientToNormals, projectAndNormals, taubin } from './surfaceNets';
import { contourDual } from './dualContouring';

export interface BuildOptions {
  /** Zellen entlang der größten Ausdehnung (32 Brett, 48 Vorschau, 64 Held). */
  resolution?: number;
  /** Taubin-Iterationen (0 = keine Glättung). */
  smoothIterations?: number;
  /** Gewichte glätten (Iterationen). */
  weightSmoothing?: number;
  /** Narrow-Band (Standard an). */
  narrowBand?: boolean;
  /** Extraktion: Dual Contouring (scharfe Kanten, Standard) oder Surface Nets. */
  extraction?: 'dual' | 'nets';
  /**
   * Feinere Teilung um Maul und Augen (Faktor je Achse, 1 = aus, Standard). Das rechtwinklige Gitter verfeinert ganze
   * Achsenstreifen: bei Kopf ≈ Körperbreite kostet Faktor 1,8 etwa 2,5 × Vertices und Bauzeit — nur für Standbilder sinnvoll.
   */
  verfeinerung?: number;
}

export interface CreatureBuild {
  positions: Float32Array;
  normals: Float32Array;
  index: Uint32Array;
  descriptors: Descriptors;
  /** Kantenmaß je Vertex (0 glatt … 1 scharfe Kante). */
  crease: Float32Array;
  /** Gesichtslinien für den Shader (Nase, Scharte), Körperraum; null ohne W-Lippe. */
  gesicht: Construction['gesicht'];
  /** Spitzmund-Feld (xyz je Vertex, Einheit): radiale Weitung des Lochmauls, skaliert mit `spitzmund`. */
  pucker: Float32Array;
  /** Unterlippenseite je Vertex (1 = Haut des Unterkiefers am Lippenschnitt, sonst 0) — eigener Kanal, damit kein
   *  Vorzeichenwechsel im Kantenabstand quer über den Körper dünne Linien zeichnet. */
  seite: Float32Array;
  /** Hebel Gelenk → Maulzentrum und größter Unterkieferwinkel über dem Boden (siehe `MouthGeometry`). */
  jawLever: number;
  lowerAngleMax: number;
  /** Hebel Schädelgelenk → Maulzentrum. */
  upperLever: number;
  /** Anheben des Kopfs bei voller Öffnung (Körpereinheiten). */
  lift: number;
  /** Anteil der Schädelkippung am Kopfknochen (freier Kopf 1 … versunkener Kopf 0). */
  kopfFrei: number;
  /** Der Maulträger ist ein eigener Kopf (Kopfknochen kippt mit); sonst trägt der Rumpf das Maul. */
  hostIstKopf: boolean;
  /** Maximaler Öffnungswinkel (rad) der Kieferbewegung (Mesh ist geschlossen gebaut). */
  maxOpenAngle: number;
  bones: Bone[];
  groups: Array<Pick<PartGroup, 'name' | 'kind' | 'bones'>>;
  mouth: {
    center: Vec3;
    corners: [Vec3, Vec3];
    hinge: { point: Vec3; axis: Vec3 };
    /** Schädelgelenk hinten (Oberkiefer und Nacken drehen darum). */
    skullHinge: { point: Vec3; axis: Vec3 };
    frame: { x: Vec3; y: Vec3; z: Vec3 };
    /** Hochachse des Trägers. */
    up: Vec3;
    lipLine: Vec3[];
    teeth: Tooth[];
    tongue: { pos: Vec3; dir: Vec3; up: Vec3; size: number; laenge: number; breite: number };
    /** Maximale Öffnungshöhe vorn (Körpereinheiten). */
    gapeMax: number;
    /** Anzahl Randvertices des Lippenschnitts (0 = kein Maul). */
    randAnzahl: number;
  } | null;
  eyes: EyeSpec[];
  hostBone: number;
  jawBone: number;
  /** Kehlkette unter dem Unterkiefer (⅔ und ⅓ des Kieferwinkels). */
  throatBones: [number, number];
  /** Nackenkette hinter dem Oberkiefer (⅔ und ⅓ des Oberkieferwinkels). */
  napeBones: [number, number];
  upperJawBone: number;
  /** gepolsterte SDF-Grenzen (Gitter). */
  bounds: { min: Vec3; max: Vec3 };
  /** enge Grenzen der Mesh-Vertices (zum Einpassen der Kamera). */
  meshBounds: { min: Vec3; max: Vec3 };
  bodyScale: number;
  shapeHash: number;
  stats: { vertexCount: number; triangleCount: number; cell: number; nonManifold: number; ms: number };
}

/** Baut aus einem Bauplan (oder seinem JSON) das Mesh mit Deskriptoren und Skelett. */
export function buildCreature(input: Bauplan | unknown, opts: BuildOptions = {}): CreatureBuild {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const b = isBauplan(input) ? input : parseBauplan(input);
  const resolution = opts.resolution ?? 48;
  const c: Construction = construct(b, resolution);
  const ext = Math.max(c.bounds.max[0] - c.bounds.min[0], c.bounds.max[1] - c.bounds.min[1], c.bounds.max[2] - c.bounds.min[2]);
  const cell = ext / resolution;
  const sdf = (p: Readonly<Vec3>): number => evalScene(c.scene, p);
  const extraction = opts.extraction ?? 'dual';
  let positions: Float32Array;
  let index: Uint32Array;
  let normals: Float32Array;
  let crease: Float32Array;
  let vertexCount: number;
  if (extraction === 'dual') {
    // Dual Contouring: QEF-Vertices liegen auf den Tangentialebenen; Kanten bleiben scharf, Glättung entfällt.
    // Verfeinerung um Kopf und Maul: Quader um Maullinie und Augen (plus Öffnungsweite als Rand)
    const faktor = opts.verfeinerung ?? 1;
    let refine: { boxes: Array<{ min: Vec3; max: Vec3 }>; faktor: number } | undefined;
    if (faktor > 1.001 && c.mouth && b.maul.sichtbar) {
      const lo: Vec3 = [Infinity, Infinity, Infinity], hi: Vec3 = [-Infinity, -Infinity, -Infinity];
      const take = (q: Readonly<Vec3>, r: number): void => {
        for (let k = 0; k < 3; k++) {
          lo[k] = Math.min(lo[k]!, q[k]! - r);
          hi[k] = Math.max(hi[k]!, q[k]! + r);
        }
      };
      for (const q of c.mouth.lipLine) take(q, c.mouth.gapeMax * 0.6 + 0.04 * c.bodyScale);
      for (const e of c.eyes) take(e.pos, e.radius * 2.5);
      refine = { boxes: [{ min: lo, max: hi }], faktor };
    }
    const refineOpt = refine ? { refine } : {};
    let dc = contourDual(sdf, { min: c.bounds.min, max: c.bounds.max, cell, narrowBand: opts.narrowBand ?? true, ...refineOpt });
    if (nonManifoldEdges(dc.index, dc.vertexCount) > 6) {
      const alt = contourDual(sdf, { min: c.bounds.min, max: c.bounds.max, cell, shift: 0.5, narrowBand: opts.narrowBand ?? true, ...refineOpt });
      if (nonManifoldEdges(alt.index, alt.vertexCount) < nonManifoldEdges(dc.index, dc.vertexCount)) dc = alt;
    }
    const extras = [
      { array: dc.normals, size: 3 },
      { array: dc.crease, size: 1 },
    ];
    const kept = largestComponent(dc, extras);
    positions = kept.positions;
    index = kept.index;
    vertexCount = kept.vertexCount;
    const dcNormals = extras[0]!.array;
    crease = extras[1]!.array;
    // Glatte Vertices: ein Newton-Schritt auf die Fläche und Gradientnormale; Kantenvertices bleiben, wo die QEF sie setzt
    normals = new Float32Array(positions.length);
    const smoothIdx: number[] = [];
    for (let v = 0; v < vertexCount; v++) if (crease[v]! < 0.55) smoothIdx.push(v);
    const sub = new Float32Array(smoothIdx.length * 3);
    for (let q = 0; q < smoothIdx.length; q++) {
      const v = smoothIdx[q]!;
      sub[q * 3] = positions[v * 3]!;
      sub[q * 3 + 1] = positions[v * 3 + 1]!;
      sub[q * 3 + 2] = positions[v * 3 + 2]!;
    }
    const subN = new Float32Array(sub.length);
    projectAndNormals(sdf, sub, subN, cell * 0.25, 1);
    for (let q = 0; q < smoothIdx.length; q++) {
      const v = smoothIdx[q]!;
      // Projektion begrenzen (höchstens eine halbe Zelle), damit nichts springt
      const dx = sub[q * 3]! - positions[v * 3]!, dy = sub[q * 3 + 1]! - positions[v * 3 + 1]!, dz = sub[q * 3 + 2]! - positions[v * 3 + 2]!;
      const l = Math.hypot(dx, dy, dz);
      const f = l > cell * 0.5 ? (cell * 0.5) / l : 1;
      positions[v * 3] = positions[v * 3]! + dx * f;
      positions[v * 3 + 1] = positions[v * 3 + 1]! + dy * f;
      positions[v * 3 + 2] = positions[v * 3 + 2]! + dz * f;
      normals[v * 3] = subN[q * 3]!;
      normals[v * 3 + 1] = subN[q * 3 + 1]!;
      normals[v * 3 + 2] = subN[q * 3 + 2]!;
    }
    for (let v = 0; v < vertexCount; v++) {
      if (crease[v]! >= 0.55) {
        normals[v * 3] = dcNormals[v * 3]!;
        normals[v * 3 + 1] = dcNormals[v * 3 + 1]!;
        normals[v * 3 + 2] = dcNormals[v * 3 + 2]!;
      }
    }
    orientToNormals(positions, normals, index);
    // Lippen- und Augenzone: Gitterrauschen entlang der Wülste wegglätten (nur glatte Vertices, Kanten bleiben), danach
    // zurück auf das Feld — glatt wie Edgeloops, die Maullinie bleibt scharf
    const adjDc = adjacency(index, vertexCount);
    const mask = new Uint8Array(vertexCount);
    let masked = 0;
    for (let v = 0; v < vertexCount; v++) {
      if (crease[v]! >= 0.55) continue;
      const x = positions[v * 3]!, y = positions[v * 3 + 1]!, z = positions[v * 3 + 2]!;
      for (const e of c.eyes) {
        const dx = x - e.pos[0], dy = y - e.pos[1], dz = z - e.pos[2];
        if (dx * dx + dy * dy + dz * dz < (2.6 * e.radius) * (2.6 * e.radius)) {
          mask[v] = 1;
          masked++;
          break;
        }
      }
    }
    if (masked > 0) {
      smoothMasked(positions, adjDc, mask, 3, 0.5);
      const idxs: number[] = [];
      for (let v = 0; v < vertexCount; v++) if (mask[v]) idxs.push(v);
      const sub = new Float32Array(idxs.length * 3);
      for (let q = 0; q < idxs.length; q++) {
        const v = idxs[q]!;
        sub[q * 3] = positions[v * 3]!;
        sub[q * 3 + 1] = positions[v * 3 + 1]!;
        sub[q * 3 + 2] = positions[v * 3 + 2]!;
      }
      const subN = new Float32Array(sub.length);
      projectAndNormals(sdf, sub, subN, cell * 0.25, 2);
      for (let q = 0; q < idxs.length; q++) {
        const v = idxs[q]!;
        positions[v * 3] = sub[q * 3]!;
        positions[v * 3 + 1] = sub[q * 3 + 1]!;
        positions[v * 3 + 2] = sub[q * 3 + 2]!;
        normals[v * 3] = subN[q * 3]!;
        normals[v * 3 + 1] = subN[q * 3 + 1]!;
        normals[v * 3 + 2] = subN[q * 3 + 2]!;
      }
      orientToNormals(positions, normals, index);
    }
  } else {
    let raw = contourManifold(sdf, { min: c.bounds.min, max: c.bounds.max, cell, narrowBand: opts.narrowBand ?? true });
    raw = largestComponent(raw);
    positions = raw.positions;
    index = raw.index;
    vertexCount = raw.vertexCount;
    const adjN = adjacency(index, vertexCount);
    const smoothIt = opts.smoothIterations ?? 5;
    if (smoothIt > 0) taubin(positions, adjN, smoothIt);
    normals = new Float32Array(positions.length);
    projectAndNormals(sdf, positions, normals, cell * 0.25, smoothIt > 0 ? 3 : 2);
    orientToNormals(positions, normals, index);
    crease = new Float32Array(vertexCount);
  }
  // --- Lippenschnitt: Haut entlang der Maullinie aufschneiden, Maultasche anfügen ---------------------------------
  const H = c.bodyScale;
  const teeth: Tooth[] = [];
  let tongue: NonNullable<CreatureBuild['mouth']>['tongue'] | null = null;
  let randAnzahl = 0;
  let tasche: Float32Array | null = null;
  let kantenAbstand: Float32Array | null = null;
  let seiten: Float32Array | undefined;
  const m = c.mouth;
  if (m && b.maul.sichtbar) {
    // Tasche: so tief wie der Kopf bis zum Gelenk, Gaumen und Boden passen in Ober- bzw. Unterkiefer
    const tiefe = m.tiefe * (m.lipRAt(0) + m.host.jointBack) * 0.85;
    const woelbungOben = Math.max(0.02 * H, Math.min(0.5 * tiefe, 0.5 * (m.host.height - m.hLip)));
    const woelbungUnten = Math.max(0.02 * H, Math.min(0.5 * tiefe, 0.5 * m.hLip));
    const woelbung = woelbungUnten;
    const ms = cutMouth(positions, index, m, { tiefe, wölbungOben: woelbungOben, wölbungUnten: woelbungUnten, zeilen: 10 });
    const n1 = ms.vertexCount;
    const crease1 = new Float32Array(n1);
    const normals1 = new Float32Array(n1 * 3);
    const neu = new Set<number>();
    for (let v = 0; v < n1; v++) {
      const q = ms.quelle[v]!;
      if (q >= 0) {
        crease1[v] = crease[q]!;
        normals1[v * 3] = normals[q * 3]!;
        normals1[v * 3 + 1] = normals[q * 3 + 1]!;
        normals1[v * 3 + 2] = normals[q * 3 + 2]!;
      } else neu.add(v);
    }
    faceNormalsFor(ms.positions, ms.index, neu, normals1);
    // Randvertices der Haut: Normale der Haut (glatt), nicht der Tasche — die Tasche hat ihre eigenen Kopien
    const randVerts: number[] = [];
    for (let i = 0; i < ms.randOben.length; i++) randVerts.push(ms.randOben[i]!);
    for (let i = 0; i < ms.randUnten.length; i++) randVerts.push(ms.randUnten[i]!);
    {
      for (const rv of randVerts) {
        // Hautnormale aus dem Feldgradienten an der Randposition
        const q: Vec3 = [ms.positions[rv * 3]!, ms.positions[rv * 3 + 1]!, ms.positions[rv * 3 + 2]!];
        const e = cell * 0.25;
        const gx = sdf([q[0] + e, q[1], q[2]]) - sdf([q[0] - e, q[1], q[2]]);
        const gy = sdf([q[0], q[1] + e, q[2]]) - sdf([q[0], q[1] - e, q[2]]);
        const gz = sdf([q[0], q[1], q[2] + e]) - sdf([q[0], q[1], q[2] - e]);
        const gl = Math.hypot(gx, gy, gz) || 1;
        normals1[rv * 3] = gx / gl;
        normals1[rv * 3 + 1] = gy / gl;
        normals1[rv * 3 + 2] = gz / gl;
      }
    }
    positions = ms.positions;
    index = ms.index;
    vertexCount = n1;
    crease = crease1;
    normals = normals1;
    tasche = ms.tasche;
    kantenAbstand = ms.kantenAbstand;
    seiten = ms.seite;
    randAnzahl = ms.randOben.length;

    // --- Lefzen (W-Lippe, Hund — Bild 8): zwei Lappen des Oberkiefers, die als eigene dünne Schalen **über** die glatte
    // Maullinie hängen (Florian: „wie 2 Lappen, die übers Maul drüberhängen — nur die äußere Geometrie, nicht Zähne oder
    // Maulinnenraum, und nicht unten“). Gitter über φ (Philtrum → vorderes Drittel) und Höhe (etwas über der Linie, wo
    // der Lappen an der Haut ansetzt, bis zur Lefzenkante); Außen- und Innenlage als Schale, Kante geschlossen. Die
    // Lappen hängen am Oberkiefer (Seite +1), ihr Lippenband liegt an der Lefzenkante (Kantenabstand).
    if (b.maul.wForm > 0.02 && b.maul.form > 0.5) {
      const Hk = m.host.headHeight ?? m.host.height;
      const maxR = m.host.halfWidth * 3 + H;
      const nPhi = 12, nH = 5, col = nH + 1;
      const uA = 0.03, uB = 0.5;
      const dicke = 0.02 * H;
      const posL: number[] = [], nrmL: number[] = [], kanteL: number[] = [];
      const triL: number[] = [];
      const gradN = (q: Readonly<Vec3>): Vec3 => {
        const e = 0.008 * H;
        return normalize([sdf([q[0] + e, q[1], q[2]]) - sdf([q[0] - e, q[1], q[2]]), sdf([q[0], q[1] + e, q[2]]) - sdf([q[0], q[1] - e, q[2]]), sdf([q[0], q[1], q[2] + e]) - sdf([q[0], q[1], q[2] - e])]);
      };
      const nAlt = vertexCount;
      const triOri = (x: number, y: number, z: number, ref: Readonly<Vec3>): void => {
        const P = (i: number): Vec3 => (i < nAlt ? [positions[i * 3]!, positions[i * 3 + 1]!, positions[i * 3 + 2]!] : [posL[(i - nAlt) * 3]!, posL[(i - nAlt) * 3 + 1]!, posL[(i - nAlt) * 3 + 2]!]);
        const a = P(x), bq = P(y), cq = P(z);
        const e1 = sub(bq, a), e2 = sub(cq, a);
        const nx = e1[1] * e2[2] - e1[2] * e2[1], ny = e1[2] * e2[0] - e1[0] * e2[2], nz = e1[0] * e2[1] - e1[1] * e2[0];
        if (nx * ref[0] + ny * ref[1] + nz * ref[2] >= 0) triL.push(x, y, z);
        else triL.push(x, z, y);
      };
      for (const side of [-1, 1] as const) {
        const start = nAlt + posL.length / 3;
        const O = (i: number, k: number): number => start + i * col + k;
        const I = (i: number, k: number): number => start + (nPhi + 1) * col + i * col + k;
        const nOuter: Vec3[] = [];
        for (let i = 0; i <= nPhi; i++) {
          const u = uA + (uB - uA) * (i / nPhi);
          const phi = side * u * m.theta;
          const hLine = m.lipHObenAt(phi);
          const hTop = hLine + 0.06 * Hk;
          const hEdge = hLine - lefzenTiefe(b.maul, Hk, u);
          for (let k = 0; k <= nH; k++) {
            const t = k / nH;
            const h = hTop + (hEdge - hTop) * t;
            const sp = surfacePoint(m.host, h, phi, maxR);
            const n = gradN(sp.p);
            nOuter.push(n);
            // Ansatz ohne Kante: der Lappen liegt oben bündig auf der Haut (kein Versatz) und hebt sich erst im unteren
            // Drittel ab (Florian: das W-Maul machte eine Kante unter der Schnauze)
            const tt = clamp((t - 0.35) / 0.65, 0, 1);
            const ease = tt * tt * (3 - 2 * tt);
            const offOut = 0.0015 * H + (dicke - 0.0015 * H) * ease;
            posL.push(sp.p[0] + n[0] * offOut, sp.p[1] + n[1] * offOut, sp.p[2] + n[2] * offOut);
            nrmL.push(n[0], n[1], n[2]);
            kanteL.push((1 - t) * Math.max(0.01 * H, hTop - hEdge));
          }
        }
        for (let i = 0; i <= nPhi; i++) {
          for (let k = 0; k <= nH; k++) {
            const o = O(i, k) - nAlt;
            const n = nOuter[i * col + k]!;
            const offIn = 0.9 * dicke * (0.3 + 0.7 * (k / nH));
            posL.push(posL[o * 3]! - n[0] * offIn, posL[o * 3 + 1]! - n[1] * offIn, posL[o * 3 + 2]! - n[2] * offIn);
            nrmL.push(-n[0], -n[1], -n[2]);
            kanteL.push(kanteL[o]!);
          }
        }
        for (let i = 0; i < nPhi; i++) {
          for (let k = 0; k < nH; k++) {
            const n = nOuter[i * col + k]!;
            triOri(O(i, k), O(i + 1, k), O(i + 1, k + 1), n);
            triOri(O(i, k), O(i + 1, k + 1), O(i, k + 1), n);
            const nI: Vec3 = [-n[0], -n[1], -n[2]];
            triOri(I(i, k), I(i + 1, k), I(i + 1, k + 1), nI);
            triOri(I(i, k), I(i + 1, k + 1), I(i, k + 1), nI);
          }
          // Lefzenkante: Streifen zwischen Außen- und Innenlage, Normale nach unten (Richtung Kante → Ansatz umgekehrt)
          const oTop = O(i, 0) - nAlt, oEdge = O(i, nH) - nAlt;
          const down: Vec3 = normalize([posL[oEdge * 3]! - posL[oTop * 3]!, posL[oEdge * 3 + 1]! - posL[oTop * 3 + 1]!, posL[oEdge * 3 + 2]! - posL[oTop * 3 + 2]!]);
          triOri(O(i, nH), O(i + 1, nH), I(i + 1, nH), down);
          triOri(O(i, nH), I(i + 1, nH), I(i, nH), down);
        }
        // Seitenkanten (Philtrum und hinteres Ende): Streifen, Normale von der Lappenmitte weg
        for (const [i, dirSign] of [[0, -1], [nPhi, 1]] as const) {
          const a = O(Math.min(nPhi, Math.max(0, i + dirSign)), 0) - nAlt, bb = O(i, 0) - nAlt;
          const away: Vec3 = normalize([posL[bb * 3]! - posL[a * 3]!, posL[bb * 3 + 1]! - posL[a * 3 + 1]!, posL[bb * 3 + 2]! - posL[a * 3 + 2]!]);
          for (let k = 0; k < nH; k++) {
            triOri(O(i, k), O(i, k + 1), I(i, k + 1), away);
            triOri(O(i, k), I(i, k + 1), I(i, k), away);
          }
        }
      }
      const nNeu = posL.length / 3;
      if (nNeu > 0) {
        const pos2 = new Float32Array((vertexCount + nNeu) * 3);
        pos2.set(positions);
        pos2.set(posL, vertexCount * 3);
        const nrm2 = new Float32Array((vertexCount + nNeu) * 3);
        nrm2.set(normals);
        nrm2.set(nrmL, vertexCount * 3);
        const idx2 = new Uint32Array(index.length + triL.length);
        idx2.set(index);
        idx2.set(triL, index.length);
        const crease2 = new Float32Array(vertexCount + nNeu);
        crease2.set(crease);
        const tasche2 = new Float32Array(vertexCount + nNeu);
        tasche2.set(tasche);
        const kante2 = new Float32Array(vertexCount + nNeu);
        kante2.set(kantenAbstand);
        kante2.set(kanteL, vertexCount);
        const seite2 = new Float32Array(vertexCount + nNeu);
        seite2.set(seiten);
        seite2.fill(1, vertexCount);
        positions = pos2;
        normals = nrm2;
        index = idx2;
        crease = crease2;
        tasche = tasche2;
        kantenAbstand = kante2;
        seiten = seite2;
        vertexCount += nNeu;
      }
    }

    // --- Zähne auf dem Rand: Größenprofil (Eckzahn-Spitze, vorn mittel, hinten klein), Ansatz im Zahnfleisch --------
    const z = b.zaehne;
    if (z.stil !== 'keine' && z.groesse > 0.01 && ms.rand.length > 4 && ms.randU.length > 4) {
      const rng = makeRng((b.seed * 7919 + 13) >>> 0);
      const headH = m.host.headHeight ?? m.host.height;
      const baseSize = z.groesse * 0.3 * headH;
      // Grundabstand aus der Dichte; große Zähne nehmen mehr Platz (Abstand wächst mit der Zahnbreite), die Reihe läuft
      // entlang der Bogenlänge; Größen: vorn die Fänge (Spitze bei u ≈ 0,2), nach hinten kleiner, dazwischen im Wechsel
      // groß/klein (`streuung`) wie gezeichnet — Bild 5/11
      const band = (0.02 + 0.08 * clamp01(b.maul.lippe)) * H;
      // Platz im Gegenkiefer: geschlossen muss der Zahn im Gegenkiefer verschwinden (Bild 7/9), außer `aussen` will Fänge außen
      const jawDepth = m.host.jawDepth ?? Math.min(m.hLip, 0.45 * m.host.height) * 1.05;
      // Spitzmund am Rand (dieselbe Formel wie das Hautfeld unten, am Rand Abstand 0): Richtung × Gewicht
      const spitzmundMax = (1 - clamp01(b.maul.form)) * m.gapeMax * 0.5;
      const puckerRand = b.maul.form < 0.98 ? (phi: number, sSide: number): Vec3 => {
        const uu = Math.abs(phi) / m.theta;
        const along = Math.sqrt(Math.max(0, 1 - uu * uu));
        const seitig = 1 + clamp(b.maul.bohne, -1, 1) * clamp(phi / m.theta, -1, 1);
        return scale(m.frame.y, sSide * along * Math.max(0.2, seitig));
      } : null;
      // Zähne stehen auf ihrem eigenen Rand: oben auf dem Oberkieferrand, unten auf dem Unterkieferrand — bei ungleich
      // großen Kiefern liegt der Rand des größeren außen (Fänge über dem Unterkiefer, Hauer neben dem Oberkiefer),
      // nichts bohrt durch den Gegenkiefer
      const place = (upper: boolean, offset: number): void => {
        // ohne Unterkiefer stehen untere Zähne nur als Hauer aus der Brustkante (Drache, Bild 5 rechts)
        if (!upper && b.maul.unterkiefer < 0.05 && z.hauer < 0.05) return;
        const rand = upper ? ms.rand : ms.randU;
        const arc: number[] = [0];
        for (let i = 1; i < rand.length; i++) arc.push(arc[i - 1]! + Math.hypot(rand[i]!.p[0] - rand[i - 1]!.p[0], rand[i]!.p[1] - rand[i - 1]!.p[1], rand[i]!.p[2] - rand[i - 1]!.p[2]));
        const total = arc[arc.length - 1]!;
        const spacingBase = total / (5 + 15 * Math.min(1.5, z.dichte));
        const at = (s: number): { p: Vec3; w: Vec3; u: Vec3; phi: number } => {
          let i = 0;
          while (i < arc.length - 2 && arc[i + 1]! < s) i++;
          const f = clamp((s - arc[i]!) / Math.max(1e-9, arc[i + 1]! - arc[i]!), 0, 1);
          const a = rand[i]!, bb = rand[i + 1]!;
          return { p: add(a.p, scale(sub(bb.p, a.p), f)), w: normalize(add(a.w, scale(sub(bb.w, a.w), f))), u: normalize(add(a.u, scale(sub(bb.u, a.u), f))), phi: a.phi + (bb.phi - a.phi) * f };
        };
        let sPos = spacingBase * (0.5 + offset);
        let i = 0;
        while (sPos < total - spacingBase * 0.3) {
          const t = sPos / total;
          const r = at(sPos);
          const u = clamp(Math.abs(r.phi) / m.theta, 0, 1);
          // Rundmaul (form → 0): gleichmäßige Reihe rund um den Rand (Aal, Bild 16) — Fänge und Größenwechsel sind Keil-Merkmale
          const keilF = clamp01(b.maul.form);
          // Fang: ein großer Zahn je Seite (schmale Spitze bei u ≈ 0,2), nicht drei nebeneinander
          const canine = Math.exp(-Math.pow((u - 0.2) / 0.1, 2)) * z.eckzaehne * keilF;
          const isHauer = !upper && z.hauer > 0.05 && Math.abs(u - 0.7) < 0.08 + 0.1 * z.hauer;
          // Wechsel groß/klein plus leichte Zufallsstreuung
          const alt = i % 2 === 0 ? 1 : 1 - 0.42 * clamp01(z.streuung) * keilF;
          let size = baseSize * (0.34 + 0.3 * (1 - u) * keilF + 1.0 * canine) * alt * (1 + (rng.next() - 0.5) * 0.3 * z.streuung);
          if (isHauer) size = baseSize * (1.3 + 1.2 * z.hauer);
          if (!upper) size *= 0.75;
          const aussen = isHauer ? 1 : z.aussen;
          // Begrenzung: Oberzähne höchstens so lang wie der Unterkiefer tief, Unterzähne wie der Oberkopf über der Lippe hoch
          const phiC = clamp(r.phi, -m.theta, m.theta);
          const hl = m.lipHAt(phiC);
          const avail = upper ? Math.min(jawDepth, hl) : Math.max(0.02 * H, m.host.height - hl);
          // außen liegende Fänge (Drache, Bild 5 rechts) hängen über den Gegenkiefer hinaus — bis zum Dreifachen
          size = Math.min(size, avail * (0.8 + 2.2 * aussen));
          // Ansatz im Zahnfleisch innerhalb der Kante; Richtung senkrecht zur Maullinie, leicht nach innen, vorn ein
          // wenig nach vorn geneigt (Fänge), `aussen` neigt nach außen (Fangzähne über der Gegenlippe)
          const inward = 0.18 - 0.35 * aussen;
          const vertical = upper ? scale(r.u, -1) : r.u;
          const lean = 0.22 * (1 - u) * (upper ? 1 : 0.6);
          const dirKeil = normalize(add(add(vertical, scale(r.w, inward)), scale(m.frame.z, lean)));
          const pos = add(add(r.p, scale(r.w, band * 0.6 + size * 0.25)), scale(vertical, -size * 0.12));
          // Lochmaul: der Rand weitet sich (Spitzmund) statt zu drehen — der Zahn rückt mit (Versatz wie die Haut am
          // Rand) und zeigt bei voller Öffnung zur Mitte des Lochs statt senkrecht (an den Seiten sonst tangential)
          const pk = puckerRand ? puckerRand(r.phi, upper ? 1 : -1) : null;
          let dir = dirKeil;
          if (pk && keilF < 0.98) {
            const posAuf = add(pos, scale(pk, spitzmundMax));
            const dirRund = normalize(sub(m.center, posAuf));
            dir = normalize(add(scale(dirKeil, keilF), scale(dirRund, 1 - keilF)));
          }
          teeth.push({ pos, dir, size, upper, hauer: isHauer, inward: r.w, ...(pk ? { pucker: pk } : {}) });
          if (t > 0.97) break;
          sPos += Math.max(spacingBase, size * 0.62);
          i++;
        }
      };
      place(true, 0);
      place(false, 0.5);
    }
    // --- Zunge auf dem Taschenboden ------------------------------------------------------------------------------
    const mid = ms.randU[Math.floor(ms.randU.length / 2)]!;
    const tiefeMid = mid.d;
    // Zunge liegt hinten auf dem Taschenboden und reicht nach vorn bis knapp hinter die Zähne (Bild 5/14)
    const laenge = clamp01(b.zunge.groesse) * tiefeMid * 0.78;
    const breite = clamp01(b.zunge.groesse) * Math.min(0.6 * m.host.halfWidth, tiefeMid * 0.75);
    tongue = {
      pos: add(add(mid.p, scale(mid.w, tiefeMid * 0.9)), scale(mid.u, -woelbung * 0.55)),
      dir: normalize(add(scale(mid.w, -1), scale(mid.u, 0.1))),
      up: mid.u,
      size: breite,
      laenge,
      breite: Math.min(breite, woelbung * 2.2),
    };
  }
  const adj = adjacency(index, vertexCount);
  const descriptors = computeDescriptors(c, positions, normals, seiten);
  const ws = opts.weightSmoothing ?? 2;
  if (ws > 0) smoothWeights(descriptors, adj, c.bones.length, ws);
  // Regionen aus dem Lippenschnitt: Rachen (0 Haut, 0,5…1 Tasche nach Tiefe), Kantenabstand in Körpereinheiten
  const seite = new Float32Array(vertexCount);
  if (tasche && kantenAbstand) {
    for (let v = 0; v < vertexCount; v++) {
      descriptors.region[v * 4] = tasche[v]! > 0 ? 0.5 + 0.5 * tasche[v]! : 0;
      descriptors.region[v * 4 + 1] = kantenAbstand[v]! / H;
      // Seite als eigener Kanal (unten 1): der Shader färbt Ober- und Unterlippe getrennt (ω nur oben). Ein Vorzeichen im
      // Abstand wäre falsch — zwischen Nachbarn verschiedener Seite läuft der Wert durch null und zeichnet ein Band.
      if (seiten && seiten[v]! < 0) seite[v] = 1;
    }
  }
  // Spitzmund-Feld (Lochmaul): die beiden Lippenränder werden senkrecht zur Maullinie auseinandergedrückt (oben nach
  // oben, unten nach unten) — voll in der Maulmitte, null an den Mundwinkeln; die Haut läuft mit dem Kantenabstand aus
  // (Lippenring), die Tasche mit ihrer Tiefe (der Rachen bleibt). Skaliert mit `spitzmund` = halbe Öffnungshöhe. (Eine
  // radiale Weitung vom Zentrum aus kann den Schlitz nicht öffnen: der Rand läuft durch das Zentrum.)
  const pucker = new Float32Array(positions.length);
  if (m && b.maul.sichtbar && b.maul.form < 0.98 && seiten && kantenAbstand && tasche) {
    const fy = m.frame.y;
    // Lippenring: beim reinen Lochmaul weit (Kugelfisch), zum Keil hin schmal (Aal, Giraffe: nur die Lippen weichen) —
    // höchstens 0,45 Kopfhöhen: das Feld bleibt am Kopf (es lief sonst mit seiner Wurzelkante an den Mundwinkeln den
    // ganzen Rumpf hinunter — Zacken auf der Flanke des Tigers)
    const Hk = m.host.headHeight ?? m.host.height;
    const reach = Math.min(0.45 * Hk, Math.max(0.05 * H, m.gapeMax * (0.4 + 0.8 * (1 - clamp01(b.maul.form)))));
    for (let v = 0; v < vertexCount; v++) {
      const p: Vec3 = [positions[v * 3]!, positions[v * 3 + 1]!, positions[v * 3 + 2]!];
      const { h, phi } = m.local(p);
      const u = Math.abs(phi) / m.theta;
      if (u > 1.3) continue;
      let s = seiten[v]!;
      if (s === 0) s = h > m.lipHAt(clamp(phi, -m.theta, m.theta)) ? 1 : -1;
      // Halbkreisprofil am Rand (rundes Loch statt Linse); weg vom Rand weicher (Exponent 0,5 → 1,5), sonst zieht die
      // Wurzelkante bei u = 1 eine Falte über die Haut
      const skin = 1 - smoothstep(0, reach, kantenAbstand[v]!);
      const along = Math.pow(Math.max(0, 1 - u * u), 0.5 + 1.0 * (1 - skin));
      // Bohne: eine Seite öffnet weiter (Giraffe, Retriever)
      const seitig = 1 + clamp(b.maul.bohne, -1, 1) * 1.0 * clamp(phi / m.theta, -1, 1);
      const w = along * skin * (1 - tasche[v]!) * Math.max(0.2, seitig);
      if (w < 1e-4) continue;
      pucker[v * 3] = fy[0] * s * w;
      pucker[v * 3 + 1] = fy[1] * s * w;
      pucker[v * 3 + 2] = fy[2] * s * w;
    }
  }
  // Öffnungswinkel aus Spalthöhe und Hebel (Gelenk → Maulzentrum)
  let maxOpenAngle = 0;
  if (m) maxOpenAngle = Math.asin(Math.min(0.95, m.gapeMax / m.jawLever));
  const jawLever = m?.jawLever ?? 1;
  const upperLever = m?.upperLever ?? jawLever;
  const lift = m?.lift ?? 0;
  const kopfFrei = m?.kopfFrei ?? 0;
  const hostIstKopf = c.groups[c.bones[c.hostBone]!.group]?.kind === 'kopf';
  const lowerAngleMax = m?.lowerAngleMax ?? Math.PI / 2;
  const mb = { min: [Infinity, Infinity, Infinity] as Vec3, max: [-Infinity, -Infinity, -Infinity] as Vec3 };
  for (let i = 0; i < positions.length; i += 3)
    for (let k = 0; k < 3; k++) {
      const v = positions[i + k]!;
      if (v < mb.min[k]!) mb.min[k] = v;
      if (v > mb.max[k]!) mb.max[k] = v;
    }
  const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  return {
    positions,
    normals,
    index,
    descriptors,
    crease,
    pucker,
    seite,
    gesicht: c.gesicht,
    jawLever,
    upperLever,
    lift,
    kopfFrei,
    hostIstKopf,
    lowerAngleMax,
    maxOpenAngle,
    bones: c.bones,
    groups: c.groups.map((g) => ({ name: g.name, kind: g.kind, bones: g.bones })),
    mouth: m
      ? { center: m.center, corners: m.corners, hinge: m.jawHinge, skullHinge: m.skullHinge, frame: m.frame, up: m.host.up, lipLine: m.lipLine, teeth, tongue: tongue ?? { pos: m.center, dir: m.frame.z, up: m.host.up, size: 0, laenge: 0, breite: 0 }, gapeMax: m.gapeMax, randAnzahl }
      : null,
    eyes: c.eyes,
    hostBone: c.hostBone,
    jawBone: c.jawBone,
    throatBones: c.throatBones,
    napeBones: c.napeBones,
    upperJawBone: c.upperJawBone,
    bounds: c.bounds,
    meshBounds: mb,
    bodyScale: c.bodyScale,
    shapeHash: shapeHash(b, resolution),
    stats: { vertexCount, triangleCount: index.length / 3, cell, nonManifold: nonManifoldEdges(index, vertexCount), ms: t1 - t0 },
  };
}

/** Laplace-Glättung nur für maskierte Vertices (Nachbarn aller Art zählen), `iterations` Durchläufe mit Stärke `lambda`. */
function smoothMasked(positions: Float32Array, adj: { offsets: Uint32Array; neighbours: Uint32Array }, mask: Uint8Array, iterations: number, lambda: number): void {
  const n = positions.length / 3;
  const tmp = new Float32Array(positions.length);
  for (let it = 0; it < iterations; it++) {
    tmp.set(positions);
    for (let v = 0; v < n; v++) {
      if (!mask[v]) continue;
      const s = adj.offsets[v]!, e = adj.offsets[v + 1]!;
      if (e <= s) continue;
      let ax = 0, ay = 0, az = 0;
      for (let k = s; k < e; k++) {
        const w = adj.neighbours[k]!;
        ax += positions[w * 3]!;
        ay += positions[w * 3 + 1]!;
        az += positions[w * 3 + 2]!;
      }
      const inv = 1 / (e - s);
      tmp[v * 3] = positions[v * 3]! + lambda * (ax * inv - positions[v * 3]!);
      tmp[v * 3 + 1] = positions[v * 3 + 1]! + lambda * (ay * inv - positions[v * 3 + 1]!);
      tmp[v * 3 + 2] = positions[v * 3 + 2]! + lambda * (az * inv - positions[v * 3 + 2]!);
    }
    positions.set(tmp);
  }
}

function isBauplan(x: unknown): x is Bauplan {
  return !!x && typeof x === 'object' && (x as { schemaVersion?: unknown }).schemaVersion === 1 && 'koerper' in (x as object) && 'maul' in (x as object) && typeof (x as { koerper: { querschnitte?: unknown } }).koerper.querschnitte !== 'undefined';
}
