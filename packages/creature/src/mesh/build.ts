import { parseBauplan, type Bauplan } from '../bauplan/schema';
import { shapeHash } from '../bauplan/hash';
import type { Vec3 } from '../math/vec';
import { construct, type Bone, type Construction, type EyeSpec, type PartGroup } from '../sdf/build';
import { evalScene } from '../sdf/scene';
import type { Tooth } from '../mouth/mouth';
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
  /** Spitzmund-Feld (xyz je Vertex, Einheit): radiale Weitung des Lochmauls, skaliert mit `spitzmund`. */
  pucker: Float32Array;
  /** Hebel Gelenk → Maulzentrum und größter Unterkieferwinkel über dem Boden (siehe `MouthGeometry`). */
  jawLever: number;
  lowerAngleMax: number;
  /** Maximaler Öffnungswinkel (rad) der Kieferbewegung (Mesh ist geschlossen gebaut). */
  maxOpenAngle: number;
  bones: Bone[];
  groups: Array<Pick<PartGroup, 'name' | 'kind' | 'bones'>>;
  mouth: {
    center: Vec3;
    corners: [Vec3, Vec3];
    hinge: { point: Vec3; axis: Vec3 };
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
    for (let i = 0; i < ms.randOben.length; i++) {
      for (const rv of [ms.randOben[i]!, ms.randUnten[i]!]) {
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

    // --- Zähne auf dem Rand: Größenprofil (Eckzahn-Spitze, vorn mittel, hinten klein), Ansatz im Zahnfleisch --------
    const z = b.zaehne;
    if (z.stil !== 'keine' && z.groesse > 0.01 && ms.rand.length > 4) {
      const rng = makeRng((b.seed * 7919 + 13) >>> 0);
      const rand = ms.rand;
      const arc: number[] = [0];
      for (let i = 1; i < rand.length; i++) arc.push(arc[i - 1]! + Math.hypot(rand[i]!.p[0] - rand[i - 1]!.p[0], rand[i]!.p[1] - rand[i - 1]!.p[1], rand[i]!.p[2] - rand[i - 1]!.p[2]));
      const total = arc[arc.length - 1]!;
      const headH = m.host.headHeight ?? m.host.height;
      const baseSize = z.groesse * 0.3 * headH;
      // Grundabstand aus der Dichte; große Zähne nehmen mehr Platz (Abstand wächst mit der Zahnbreite), die Reihe läuft
      // entlang der Bogenlänge; Größen: vorn die Fänge (Spitze bei u ≈ 0,2), nach hinten kleiner, dazwischen im Wechsel
      // groß/klein (`streuung`) wie gezeichnet — Bild 5/11
      const spacingBase = total / (5 + 15 * Math.min(1.5, z.dichte));
      const band = (0.02 + 0.08 * clamp01(b.maul.lippe)) * H;
      // Platz im Gegenkiefer: geschlossen muss der Zahn im Gegenkiefer verschwinden (Bild 7/9), außer `aussen` will Fänge außen
      const jawDepth = m.host.jawDepth ?? Math.min(m.hLip, 0.45 * m.host.height) * 1.05;
      const at = (s: number): { p: Vec3; w: Vec3; u: Vec3; phi: number } => {
        let i = 0;
        while (i < arc.length - 2 && arc[i + 1]! < s) i++;
        const f = clamp((s - arc[i]!) / Math.max(1e-9, arc[i + 1]! - arc[i]!), 0, 1);
        const a = rand[i]!, bb = rand[i + 1]!;
        return { p: add(a.p, scale(sub(bb.p, a.p), f)), w: normalize(add(a.w, scale(sub(bb.w, a.w), f))), u: normalize(add(a.u, scale(sub(bb.u, a.u), f))), phi: a.phi + (bb.phi - a.phi) * f };
      };
      const place = (upper: boolean, offset: number): void => {
        // ohne Unterkiefer stehen untere Zähne nur als Hauer aus der Brustkante (Drache, Bild 5 rechts)
        if (!upper && b.maul.unterkiefer < 0.05 && z.hauer < 0.05) return;
        let sPos = spacingBase * (0.5 + offset);
        let i = 0;
        while (sPos < total - spacingBase * 0.3) {
          const t = sPos / total;
          const r = at(sPos);
          const u = clamp(Math.abs(r.phi) / m.theta, 0, 1);
          const canine = Math.exp(-Math.pow((u - 0.2) / 0.16, 2)) * z.eckzaehne;
          const isHauer = !upper && z.hauer > 0.05 && Math.abs(u - 0.7) < 0.08 + 0.1 * z.hauer;
          // Wechsel groß/klein plus leichte Zufallsstreuung
          const alt = i % 2 === 0 ? 1 : 1 - 0.42 * clamp01(z.streuung);
          let size = baseSize * (0.34 + 0.3 * (1 - u) + 1.0 * canine) * alt * (1 + (rng.next() - 0.5) * 0.3 * z.streuung);
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
          const dir = normalize(add(add(vertical, scale(r.w, inward)), scale(m.frame.z, lean)));
          const pos = add(add(r.p, scale(r.w, band * 0.6 + size * 0.25)), scale(vertical, -size * 0.12));
          teeth.push({ pos, dir, size, upper, hauer: isHauer, inward: r.w });
          if (t > 0.97) break;
          sPos += Math.max(spacingBase, size * 0.62);
          i++;
        }
      };
      place(true, 0);
      place(false, 0.5);
    }
    // --- Zunge auf dem Taschenboden ------------------------------------------------------------------------------
    const mid = ms.rand[Math.floor(ms.rand.length / 2)]!;
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
  if (tasche && kantenAbstand) {
    for (let v = 0; v < vertexCount; v++) {
      descriptors.region[v * 4] = tasche[v]! > 0 ? 0.5 + 0.5 * tasche[v]! : 0;
      descriptors.region[v * 4 + 1] = kantenAbstand[v]! / H;
    }
  }
  // Spitzmund-Feld (Lochmaul): die beiden Lippenränder werden senkrecht zur Maullinie auseinandergedrückt (oben nach
  // oben, unten nach unten) — voll in der Maulmitte, null an den Mundwinkeln; die Haut läuft mit dem Kantenabstand aus
  // (Lippenring), die Tasche mit ihrer Tiefe (der Rachen bleibt). Skaliert mit `spitzmund` = halbe Öffnungshöhe. (Eine
  // radiale Weitung vom Zentrum aus kann den Schlitz nicht öffnen: der Rand läuft durch das Zentrum.)
  const pucker = new Float32Array(positions.length);
  if (m && b.maul.sichtbar && b.maul.form < 0.98 && seiten && kantenAbstand && tasche) {
    const fy = m.frame.y;
    // Lippenring: beim reinen Lochmaul weit (Kugelfisch), zum Keil hin schmal (Aal, Giraffe: nur die Lippen weichen)
    const reach = Math.max(0.05 * H, m.gapeMax * (0.4 + 0.8 * (1 - clamp01(b.maul.form))));
    for (let v = 0; v < vertexCount; v++) {
      const p: Vec3 = [positions[v * 3]!, positions[v * 3 + 1]!, positions[v * 3 + 2]!];
      const { h, phi } = m.local(p);
      const u = Math.abs(phi) / m.theta;
      if (u > 1.3) continue;
      let s = seiten[v]!;
      if (s === 0) s = h > m.lipHAt(clamp(phi, -m.theta, m.theta)) ? 1 : -1;
      // Halbkreisprofil: rundes Loch statt Linse
      const along = Math.sqrt(Math.max(0, 1 - u * u));
      const skin = 1 - smoothstep(0, reach, kantenAbstand[v]!);
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
    jawLever,
    lowerAngleMax,
    maxOpenAngle,
    bones: c.bones,
    groups: c.groups.map((g) => ({ name: g.name, kind: g.kind, bones: g.bones })),
    mouth: m
      ? { center: m.center, corners: m.corners, hinge: m.jawHinge, frame: m.frame, up: m.host.up, lipLine: m.lipLine, teeth, tongue: tongue ?? { pos: m.center, dir: m.frame.z, up: m.host.up, size: 0, laenge: 0, breite: 0 }, gapeMax: m.gapeMax, randAnzahl }
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
