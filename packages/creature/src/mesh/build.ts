import { parseBauplan, type Bauplan } from '../bauplan/schema';
import { shapeHash } from '../bauplan/hash';
import type { Vec3 } from '../math/vec';
import { construct, type Bone, type Construction, type EyeSpec, type PartGroup } from '../sdf/build';
import { evalScene } from '../sdf/scene';
import type { Tooth } from '../mouth/mouth';
import { computeDescriptors, smoothWeights, type Descriptors } from './descriptors';
import { cutMouth, faceNormalsFor } from './mundschnitt';
import { makeRng } from '../math/rng';
import { add, clamp, clamp01, normalize, scale, sub } from '../math/vec';
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
    let dc = contourDual(sdf, { min: c.bounds.min, max: c.bounds.max, cell, narrowBand: opts.narrowBand ?? true });
    if (nonManifoldEdges(dc.index, dc.vertexCount) > 6) {
      const alt = contourDual(sdf, { min: c.bounds.min, max: c.bounds.max, cell, shift: 0.5, narrowBand: opts.narrowBand ?? true });
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
      const headH = m.host.height;
      const baseSize = z.groesse * 0.3 * headH;
      const spacing = Math.max(baseSize * 0.9, total / (6 + 22 * z.dichte));
      const count = Math.max(2, Math.floor(total / spacing));
      const at = (s: number): { p: Vec3; w: Vec3; u: Vec3; phi: number } => {
        let i = 0;
        while (i < arc.length - 2 && arc[i + 1]! < s) i++;
        const f = clamp((s - arc[i]!) / Math.max(1e-9, arc[i + 1]! - arc[i]!), 0, 1);
        const a = rand[i]!, bb = rand[i + 1]!;
        return { p: add(a.p, scale(sub(bb.p, a.p), f)), w: normalize(add(a.w, scale(sub(bb.w, a.w), f))), u: normalize(add(a.u, scale(sub(bb.u, a.u), f))), phi: a.phi + (bb.phi - a.phi) * f };
      };
      const band = (0.02 + 0.08 * clamp01(b.maul.lippe)) * H;
      const place = (upper: boolean, offset: number): void => {
        if (!upper && b.maul.unterkiefer < 0.05) return;
        for (let i = 0; i < count; i++) {
          const t = (i + 0.5 + offset) / count;
          if (t <= 0.03 || t >= 0.97) continue;
          const r = at(t * total);
          const u = clamp(Math.abs(r.phi) / m.theta, 0, 1);
          // Profil: Eckzahn bei u ≈ 0,33, vorn mittel, hinten klein; Streuung groß/klein
          const canine = Math.exp(-Math.pow((u - 0.33) / 0.11, 2)) * z.eckzaehne;
          const isHauer = !upper && z.hauer > 0.05 && Math.abs(u - 0.7) < 0.08 + 0.1 * z.hauer;
          let size = baseSize * (0.36 + 0.2 * (1 - u) + 0.95 * canine) * (1 + (rng.next() - 0.5) * 0.7 * z.streuung);
          if (isHauer) size = baseSize * (1.3 + 1.2 * z.hauer);
          if (!upper) size *= 0.75;
          // Ansatz: auf dem Zahnfleisch knapp innerhalb der Kante; Richtung senkrecht zur Maullinie (unten/oben), leicht
          // nach innen, `aussen` neigt nach außen (Fangzähne über der Gegenlippe)
          const aussen = isHauer ? 1 : z.aussen;
          const inward = 0.18 - 0.35 * aussen;
          const vertical = upper ? scale(r.u, -1) : r.u;
          const dir = normalize(add(vertical, scale(r.w, inward)));
          const pos = add(add(r.p, scale(r.w, band * 0.5 + size * 0.12)), scale(vertical, -size * 0.1));
          teeth.push({ pos, dir, size, upper, hauer: isHauer });
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
  // Spitzmund-Feld (Lochmaul): radiale Weitung um das Maulzentrum in der Maulebene, nahe der Kante voll, auslaufend
  const pucker = new Float32Array(positions.length);
  if (m && b.maul.sichtbar && b.maul.form < 0.98) {
    const rhoLoop = Math.max(0.02, 0.5 * Math.hypot(m.corners[1][0] - m.corners[0][0], m.corners[1][1] - m.corners[0][1], m.corners[1][2] - m.corners[0][2]));
    const fz = m.frame.z, C = m.center;
    for (let v = 0; v < vertexCount; v++) {
      const px = positions[v * 3]! - C[0], py = positions[v * 3 + 1]! - C[1], pz = positions[v * 3 + 2]! - C[2];
      const zm = px * fz[0] + py * fz[1] + pz * fz[2];
      let rx = px - fz[0] * zm, ry = py - fz[1] * zm, rz = pz - fz[2] * zm;
      const rho = Math.hypot(rx, ry, rz);
      if (rho < 1e-5 || zm < -rhoLoop * 1.5) continue;
      rx /= rho; ry /= rho; rz /= rho;
      const w = clamp01(1 - rho / (2.2 * rhoLoop)) * (tasche ? 1 - 0.7 * tasche[v]! : 1);
      pucker[v * 3] = rx * w;
      pucker[v * 3 + 1] = ry * w;
      pucker[v * 3 + 2] = rz * w;
    }
  }
  // Öffnungswinkel aus Spalthöhe und Hebel (Gelenk → Maulzentrum)
  let maxOpenAngle = 0;
  if (m) {
    const Ljaw = Math.max(0.05, Math.hypot(m.center[0] - m.jawHinge.point[0], m.center[1] - m.jawHinge.point[1], m.center[2] - m.jawHinge.point[2]));
    maxOpenAngle = Math.asin(Math.min(0.95, m.gapeMax / Ljaw));
  }
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
    maxOpenAngle,
    bones: c.bones,
    groups: c.groups.map((g) => ({ name: g.name, kind: g.kind, bones: g.bones })),
    mouth: m
      ? { center: m.center, corners: m.corners, hinge: m.jawHinge, frame: m.frame, up: m.host.up, lipLine: m.lipLine, teeth, tongue: tongue ?? { pos: m.center, dir: m.frame.z, up: m.host.up, size: 0, laenge: 0, breite: 0 }, gapeMax: m.gapeMax, randAnzahl }
      : null,
    eyes: c.eyes,
    hostBone: c.hostBone,
    jawBone: c.jawBone,
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
