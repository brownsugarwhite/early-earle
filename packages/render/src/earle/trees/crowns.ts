import { BufferGeometry, Float32BufferAttribute, Uint16BufferAttribute } from 'three/webgpu';
import { hash32, mulberry32 } from '@ee/world';
import { add, cross, dirFrom, len, norm, scale, type V3 } from './mesh';

/**
 * Kronen der Bäume v4 (Einheit: Kronenradius r = 1). Jede Krone ist eine Masse aus Teilkuppeln wie bei Earle (Bilder
 * 02, 03, Ebene_1/16/32): ein Kern, darauf Kappen, die als eigene kleine Kuppeln aus der Masse wölben. Die Normalen sind
 * Schattierungsnormalen — Mischung aus Kappennormale und Hüllnormale —, damit jede Teilkuppel ihren eigenen hellen
 * Scheitel und eine dunklere Unterseite bekommt und die Masse trotzdem als eine Form leuchtet.
 *
 * - `samples`: Oberflächenpunkte (Position + Schattierungsnormale, Objektraum) für die instanzierten Punkte, fest gemischt;
 * - `rims`: Punkte entlang der oberen Kante jeder Teilkuppel — Earles gepunktete Bögen (Ebene 1/19/32), auf der Licht-
 *   und der Schattenseite;
 * - Attribut `crownCast` und `sampleCast`/`rimCast`: 1 = diese Teilkuppel nimmt Schlagschatten an (untere Kränze), 0 =
 *   bleibt frei (Scheitel und Schultern). Je Teilkuppel ganz oder gar nicht: ein Schlagschatten liegt als klare
 *   Tintenform auf der Krone, nie als halbdurchsichtiger Verlauf.
 */
export interface CrownTemplate {
  geometry: BufferGeometry;
  /** Oberflächenproben (Stride 6: x, y, z, nx, ny, nz), deterministisch gemischt. */
  samples: Float32Array;
  /** Je Probe: nimmt Schlagschatten an (1) oder nicht (0). */
  sampleCast: Float32Array;
  /** Bögen entlang der oberen Kanten der Teilkuppeln (Stride 6), deterministisch gemischt. */
  rims: Float32Array;
  rimCast: Float32Array;
}

interface Part {
  pos: number[];
  nor: number[];
  cast: number[];
  idx: number[];
}

function emptyPart(): Part {
  return { pos: [], nor: [], cast: [], idx: [] };
}

function toGeometry(parts: Part[]): BufferGeometry {
  const pos: number[] = [];
  const nor: number[] = [];
  const cast: number[] = [];
  const idx: number[] = [];
  let base = 0;
  for (const p of parts) {
    pos.push(...p.pos);
    nor.push(...p.nor);
    cast.push(...p.cast);
    for (const i of p.idx) idx.push(i + base);
    base += p.pos.length / 3;
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new Float32BufferAttribute(nor, 3));
  g.setAttribute('crownCast', new Float32BufferAttribute(cast, 1));
  g.setIndex(new Uint16BufferAttribute(idx, 1));
  g.computeBoundingSphere();
  return g;
}

/** Tangentenbasis zu einer Achse. */
function basis(axis: V3): [V3, V3] {
  const a: V3 = Math.abs(axis[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const t1 = norm(cross(axis, a));
  const t2 = cross(axis, t1);
  return [t1, t2];
}

/**
 * Kugelkappe um `axis` (Mittelpunkt c, Radius rc) bis zum Polarwinkel `thetaMax`, `around` Segmente, `rings` Ringe.
 * `shade(p, nc)` liefert die Schattierungsnormale, `cast` den Schlagschattenanteil der ganzen Kappe.
 */
function cap(part: Part, c: V3, rc: number, axis: V3, thetaMax: number, around: number, rings: number, shade: (p: V3, nc: V3) => V3, cast: number, stretch: V3 = [1, 1, 1]): void {
  const base = part.pos.length / 3;
  const [t1, t2] = basis(axis);
  const push = (nc: V3) => {
    const local: V3 = [nc[0] * rc * stretch[0], nc[1] * rc * stretch[1], nc[2] * rc * stretch[2]];
    const p = add(c, local);
    const ncs = norm([nc[0] / stretch[0], nc[1] / stretch[1], nc[2] / stretch[2]]);
    const n = shade(p, ncs);
    part.pos.push(p[0], p[1], p[2]);
    part.nor.push(n[0], n[1], n[2]);
    part.cast.push(cast);
  };
  push(axis);
  for (let i = 1; i <= rings; i++) {
    const th = (i / rings) * thetaMax;
    for (let j = 0; j < around; j++) {
      const ph = (j / around) * Math.PI * 2;
      const nc = norm(add(scale(axis, Math.cos(th)), add(scale(t1, Math.sin(th) * Math.cos(ph)), scale(t2, Math.sin(th) * Math.sin(ph)))));
      push(nc);
    }
  }
  // Fächer um den Scheitel, dann Ringstreifen (gegen den Uhrzeigersinn von außen: φ läuft t1 → t2, t1 × t2 = Achse)
  for (let j = 0; j < around; j++) {
    const a = base + 1 + j;
    const b = base + 1 + ((j + 1) % around);
    part.idx.push(base, a, b);
  }
  for (let i = 1; i < rings; i++) {
    const r0 = base + 1 + (i - 1) * around;
    const r1 = base + 1 + i * around;
    for (let j = 0; j < around; j++) {
      const j1 = (j + 1) % around;
      part.idx.push(r0 + j, r1 + j, r0 + j1, r0 + j1, r1 + j, r1 + j1);
    }
  }
}

/** UV-Ellipsoid (Radien rx, ry, rz) um c; `cast(y)` je Vertex (untere Hälfte nimmt Schatten an). */
function ellipsoid(part: Part, c: V3, rx: number, ry: number, rz: number, wSeg: number, hSeg: number, shade: (p: V3, n: V3) => V3, castBelow: number): void {
  const base = part.pos.length / 3;
  for (let i = 0; i <= hSeg; i++) {
    const v = i / hSeg;
    const th = v * Math.PI;
    for (let j = 0; j <= wSeg; j++) {
      const ph = (j / wSeg) * Math.PI * 2;
      const d: V3 = [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)];
      const p: V3 = [c[0] + d[0] * rx, c[1] + d[1] * ry, c[2] + d[2] * rz];
      const n = shade(p, norm([d[0] / rx, d[1] / ry, d[2] / rz]));
      part.pos.push(p[0], p[1], p[2]);
      part.nor.push(n[0], n[1], n[2]);
      part.cast.push(d[1] < castBelow ? 1 : 0);
    }
  }
  const row = wSeg + 1;
  for (let i = 0; i < hSeg; i++) {
    for (let j = 0; j < wSeg; j++) {
      const a = base + i * row + j;
      const b = a + row;
      part.idx.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
}

/** Mischt Einträge (Stride `k`) und die parallele Liste `extra` gleich (deterministisch). */
function shuffleWith(list: number[], extra: number[], k: number, seed: string): { list: Float32Array; extra: Float32Array } {
  const rand = mulberry32(hash32(seed));
  const n = list.length / k;
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const t = order[i]!;
    order[i] = order[j]!;
    order[j] = t;
  }
  const out = new Float32Array(list.length);
  const ex = new Float32Array(n);
  order.forEach((src, dst) => {
    for (let c = 0; c < k; c++) out[dst * k + c] = list[src * k + c]!;
    ex[dst] = extra[src]!;
  });
  return { list: out, extra: ex };
}

interface CapSpec {
  /** Mittelpunkt der Kappe (vor dem Stauchen) und ihre Achse. */
  c: V3;
  dir: V3;
  rc: number;
  /** Nimmt Schlagschatten an (1) oder bleibt frei (0). */
  cast: number;
  stretch: V3;
}

/** Schattierungsnormale: Kappe (Eigenleben der Teilkuppel) mit Hülle gemischt. */
function blendShade(capWeight: number, hullScale: V3 = [1, 1, 1]) {
  return (p: V3, nc: V3): V3 => {
    const nh = norm([p[0] / hullScale[0] ** 2, p[1] / hullScale[1] ** 2, p[2] / hullScale[2] ** 2]);
    return norm(add(scale(nc, capWeight), scale(nh, 1 - capWeight)));
  };
}

/** Geometrie flach drücken (y · f) — Normalen mit der inversen Transponierten. */
function flatten(part: Part, f: number): void {
  for (let i = 0; i < part.pos.length; i += 3) {
    part.pos[i + 1]! *= f;
    const n = norm([part.nor[i]!, part.nor[i + 1]! / f, part.nor[i + 2]!]);
    part.nor[i] = n[0];
    part.nor[i + 1] = n[1];
    part.nor[i + 2] = n[2];
  }
}

/** Liegt p (ungestaucht) in einer anderen Kappe oder im Kern? */
function hiddenIn(p: V3, caps: CapSpec[], self: number, core: V3): boolean {
  if ((p[0] / core[0]) ** 2 + (p[1] / core[1]) ** 2 + (p[2] / core[2]) ** 2 < 0.97) return true;
  for (let o = 0; o < caps.length; o++) {
    if (o === self) continue;
    const oc = caps[o]!;
    const q: V3 = [(p[0] - oc.c[0]) / oc.stretch[0], (p[1] - oc.c[1]) / oc.stretch[1], (p[2] - oc.c[2]) / oc.stretch[2]];
    if (len(q) < oc.rc * 0.97) return true;
  }
  return false;
}

/**
 * Proben und Bögen einer Kappenmasse: Proben gleichmäßig über die sichtbaren Kappenflächen, Bögen als Punktreihe knapp
 * innerhalb der oberen Kante jeder Kappe (Polarwinkel 58–72°, oberer Halbkreis zur Außen- und Oberseite hin).
 */
function capSamples(
  caps: CapSpec[],
  core: V3,
  shade: (p: V3, nc: V3) => V3,
  flat: number,
  seed: string,
  perCap: number,
  perRim: number,
): { samples: Float32Array; sampleCast: Float32Array; rims: Float32Array; rimCast: Float32Array } {
  const rand = mulberry32(hash32(seed));
  const list: number[] = [];
  const lc: number[] = [];
  const rims: number[] = [];
  const rc: number[] = [];
  const emit = (ci: number, nc: V3, out: number[], outCast: number[]) => {
    const c = caps[ci]!;
    const p = add(c.c, [nc[0] * c.rc * c.stretch[0], nc[1] * c.rc * c.stretch[1], nc[2] * c.rc * c.stretch[2]]);
    if (hiddenIn(p, caps, ci, core)) return;
    const n = shade(p, norm([nc[0] / c.stretch[0], nc[1] / c.stretch[1], nc[2] / c.stretch[2]]));
    const nf = norm([n[0], n[1] / flat, n[2]]);
    out.push(p[0], p[1] * flat, p[2], nf[0], nf[1], nf[2]);
    outCast.push(c.cast);
  };
  for (let ci = 0; ci < caps.length; ci++) {
    const c = caps[ci]!;
    const [t1, t2] = basis(c.dir);
    for (let k = 0; k < perCap; k++) {
      const th = Math.acos(1 - rand() * (1 - Math.cos((85 * Math.PI) / 180)));
      const ph = rand() * Math.PI * 2;
      emit(ci, norm(add(scale(c.dir, Math.cos(th)), add(scale(t1, Math.sin(th) * Math.cos(ph)), scale(t2, Math.sin(th) * Math.sin(ph))))), list, lc);
    }
    // Oberer Bogen: Richtung "oben" in der Tangentialebene der Kappe (für Scheitelkappen: nach außen)
    const upT = add([0, 1, 0], scale(c.dir, -c.dir[1]));
    const outT: V3 = [c.c[0], 0, c.c[2]];
    const u = len(upT) > 0.25 ? norm(upT) : len(outT) > 1e-3 ? norm(add(outT, scale(c.dir, -(outT[0] * c.dir[0] + outT[2] * c.dir[2])))) : t1;
    const w = norm(cross(c.dir, u));
    for (let k = 0; k < perRim; k++) {
      const a = ((k + 0.5) / perRim - 0.5) * Math.PI * 1.15 + (rand() - 0.5) * 0.12;
      const th = ((58 + 14 * rand()) * Math.PI) / 180;
      const tang = add(scale(u, Math.cos(a)), scale(w, Math.sin(a)));
      emit(ci, norm(add(scale(c.dir, Math.cos(th)), scale(tang, Math.sin(th)))), rims, rc);
    }
  }
  const s = shuffleWith(list, lc, 6, `${seed}-order`);
  const r = shuffleWith(rims, rc, 6, `${seed}-rims`);
  return { samples: s.list, sampleCast: s.extra, rims: r.list, rimCast: r.extra };
}

// --- Kuppel-Masse ----------------------------------------------------------------------------------------

/** Abflachung der Kuppel-Masse (y), auf Geometrie und Normalen angewandt. */
export const DOME_FLAT = 0.86;

function domeCaps(): CapSpec[] {
  const rand = mulberry32(hash32('dome-caps-v3'));
  const out: CapSpec[] = [];
  // Gürtel und untere Kränze nehmen Schlagschatten an; Schultern und Scheitel bleiben frei (helle Kuppeln, Bild 03)
  const ring = (count: number, el: number, rc: number, dist: number, azOff: number, cast: number) => {
    for (let k = 0; k < count; k++) {
      const az = azOff + (k / count) * Math.PI * 2 + (rand() - 0.5) * 0.28;
      const dir = dirFrom(az, el + (rand() - 0.5) * 0.12);
      out.push({ dir, c: scale(dir, dist * (0.96 + 0.08 * rand())), rc: rc * (0.9 + 0.2 * rand()), cast, stretch: [1, 1, 1] });
    }
  };
  ring(5, -0.1, 0.45, 0.6, 0.2, 1); // Gürtel etwas unter dem Äquator: überhängende, dunkle Unterseiten
  ring(5, 0.52, 0.44, 0.62, 0.83, 0); // Schultern
  ring(2, 1.18, 0.4, 0.6, 0.4, 0); // Scheitel
  return out;
}

/**
 * Kuppel-Masse (Hainbaum, Schirm- und Spitzenbaum-Kappe, Juwel): Kern + 12 Teilkuppeln in drei Kränzen, Hüllzentrum
 * im Ursprung, Radius ≈ 1, y um DOME_FLAT gestaucht. ≈ 330 Vertices.
 */
export function createDomeCrown(detail: 'ultra' | 'hoch' | 'mobil' = 'hoch'): CrownTemplate {
  const caps = domeCaps();
  // Kappen wölben sich sichtbar aus der Masse, die Hülle führt das Licht (die Krone leuchtet als eine Form)
  const shade = blendShade(0.24);
  const part = emptyPart();
  // Ultra: für große Fokus- und Solitärbäume (glatte Silhouette auch bildfüllend)
  const [ew, eh, ca, cr] = detail === 'ultra' ? [20, 13, 16, 6] : detail === 'hoch' ? [12, 8, 8, 3] : [9, 6, 6, 3];
  ellipsoid(part, [0, 0, 0], 0.8, 0.8, 0.8, ew, eh, blendShade(0.1), 0.05);
  for (const c of caps) cap(part, c.c, c.rc, c.dir, (100 * Math.PI) / 180, ca, cr, shade, c.cast);
  flatten(part, DOME_FLAT);
  const s = capSamples(caps, [0.8, 0.8, 0.8], shade, DOME_FLAT, 'dome-samples-v4', 60, detail === 'mobil' ? 9 : 13);
  return { geometry: toGeometry([part]), ...s };
}

// --- Säule (Zypresse, Kathedralenkrone) -------------------------------------------------------------------

/** Hülle der Säulenkrone (Halbachsen, Einheit Kronenradius). */
export const COLUMN_HULL: V3 = [0.62, 1.05, 0.62];

/**
 * Säulenkrone (Ebene 16 Kathedralenwald, Ebene 30 Zypressen, Ebene 23): hohe, oben gerundete Säule aus vier Kränzen
 * kleiner Teilkuppeln, die sich nach oben leicht verjüngen, und einer Scheitelkuppel — die Silhouette buckelt wie bei
 * Earle, statt ein glatter Stab zu sein. Die unteren zwei Kränze nehmen Schlagschatten an.
 */
export function createColumnCrown(detail: 'hoch' | 'mobil' = 'hoch'): CrownTemplate {
  const hi = detail === 'hoch';
  const rand = mulberry32(hash32('column-caps-v4'));
  const part = emptyPart();
  const hull = COLUMN_HULL;
  const core: V3 = [0.48, 0.98, 0.48];
  ellipsoid(part, [0, 0, 0], core[0], core[1], core[2], hi ? 9 : 7, hi ? 9 : 7, blendShade(0.25, hull), -0.2);
  const caps: CapSpec[] = [];
  // (Höhe, Kappenradius, Anzahl, Abstand von der Achse, Schlagschatten)
  const tiers: Array<[number, number, number, number, number]> = [
    [-0.7, 0.33, 5, 0.29, 1],
    [-0.27, 0.33, 5, 0.29, 1],
    [0.17, 0.3, 4, 0.26, 0],
    [0.55, 0.26, 4, 0.2, 0],
  ];
  const stretch: V3 = [1, 1.3, 1];
  tiers.forEach(([y, rc, count, off, cast], ti) => {
    for (let k = 0; k < count; k++) {
      const az = (k / count) * Math.PI * 2 + ti * 0.7 + (rand() - 0.5) * 0.35;
      const dir = norm([Math.cos(az), 0.32, Math.sin(az)]);
      caps.push({ c: [Math.cos(az) * off, y + (rand() - 0.5) * 0.06, Math.sin(az) * off], rc: rc * (0.88 + 0.24 * rand()), dir, cast, stretch });
    }
  });
  caps.push({ c: [0, 0.8, 0], rc: 0.25, dir: [0, 1, 0], cast: 0, stretch });
  const shade = blendShade(0.26, hull);
  for (const c of caps) cap(part, c.c, c.rc, c.dir, (105 * Math.PI) / 180, hi ? 6 : 5, hi ? 3 : 2, shade, c.cast, c.stretch);
  const s = capSamples(caps, core, shade, 1, 'column-samples-v4', 40, hi ? 10 : 7);
  return { geometry: toGeometry([part]), ...s };
}

// --- Stufenkiefer ------------------------------------------------------------------------------------------

/** Stufen der Kiefer: (Unterkante y, Spitze y, Radius unten) in Einheiten der Kronenhöhe bzw. des Radius. */
export const PINE_TIERS: Array<[number, number, number]> = [
  [0.0, 0.42, 1.0],
  [0.17, 0.56, 0.8],
  [0.34, 0.7, 0.62],
  [0.5, 0.84, 0.45],
  [0.66, 1.0, 0.3],
];

/**
 * Stufenkiefer (Bild 05, Ebene_2/12): fünf überlappende Kegelstufen mit gezackter, leicht hängender Unterkante →
 * Sägezahn-Silhouette, auch am Waldrand. Einheit: Fuß der Krone y = 0, Spitze y = 1, unterer Radius 1. Die weißen
 * Punkte der Kiefern malt das Kronenmaterial in die Stufen (siehe crownMaterial, Punktreihen).
 */
export function createPineCrown(): CrownTemplate {
  const part = emptyPart();
  const teeth = 11;
  for (const [yb, ya, rb] of PINE_TIERS) {
    const base = part.pos.length / 3;
    part.pos.push(0, ya, 0);
    part.nor.push(0, 1, 0);
    part.cast.push(1);
    const slope = rb / Math.max(1e-3, ya - yb);
    for (let k = 0; k < teeth * 2; k++) {
      const a = (k / (teeth * 2)) * Math.PI * 2;
      const tip = k % 2 === 0;
      const r = rb * (tip ? 1 : 0.78);
      const y = yb - (tip ? 0.03 : -0.01);
      part.pos.push(Math.cos(a) * r, y, Math.sin(a) * r);
      const n = norm(add(scale(norm([Math.cos(a), 1 / slope, Math.sin(a)]), 0.75), [0, 0.25, 0]));
      part.nor.push(n[0], n[1], n[2]);
      part.cast.push(1);
    }
    for (let k = 0; k < teeth * 2; k++) {
      const a = base + 1 + k;
      const b = base + 1 + ((k + 1) % (teeth * 2));
      part.idx.push(base, b, a);
    }
  }
  // Punkte in Reihen an den Stufenkanten (Schnee auf den Zweigspitzen): von jeder Seite ein kleines Dreieck aus
  // weißen Punkten wie in Bild 05 — zwei Reihen je Stufe und die Spitze
  const list: number[] = [];
  PINE_TIERS.forEach(([yb, ya, rb], ti) => {
    const slope = rb / Math.max(1e-3, ya - yb);
    for (const [f, per] of [
      [0.94, 15],
      [0.55, 9],
    ] as const) {
      const n = Math.max(3, Math.round(per * rb));
      const y = yb + (ya - yb) * (1 - f) + 0.015;
      for (let k = 0; k < n; k++) {
        const a = ((k + (ti % 2) * 0.5 + f) / n) * Math.PI * 2;
        const nn = norm([Math.cos(a), 1 / slope, Math.sin(a)]);
        list.push(Math.cos(a) * rb * f, y, Math.sin(a) * rb * f, nn[0], nn[1], nn[2]);
      }
    }
  });
  list.push(0, 1.0, 0, 0, 1, 0);
  const ones = new Array<number>(list.length / 6).fill(1);
  const s = shuffleWith(list, ones, 6, 'pine-samples-order');
  return { geometry: toGeometry([part]), samples: s.list, sampleCast: s.extra, rims: new Float32Array(0), rimCast: new Float32Array(0) };
}
