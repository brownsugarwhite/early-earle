import { BufferGeometry, Float32BufferAttribute, Uint16BufferAttribute } from 'three/webgpu';
import { hash32, mulberry32 } from '@ee/world';
import { basis, shuffleWith, type CrownTemplate } from './crowns';
import { TreeMeshBuilder, add, bezier, bezier3, dirFrom, len, norm, scale, sub, type V3 } from './mesh';
import { along, roots, stem, taperAlong } from './trunks';
import { cushionEdge, packCast, type EdgeCushion } from './cushionEdge';

/**
 * Kuppelbaum (Welt 03, Ebene 33; die Kuppeln der Bildschirmfotos 16.47.13): eine breite, niedrige, windgeformte
 * Kissenkrone auf einem kurzen, dicken Stamm, dessen Äste fast waagrecht unter der Krone hinausgreifen.
 *
 * Krone (Einheit Kronenradius r = halbe Breite, Hüllzentrum im Ursprung): etwa doppelt so breit wie hoch, der Scheitel
 * rechts der Mitte (+x), die Masse aus geschuppten, abgeplatteten Kissen in fünf Kränzen — Randkranz, drei
 * Schulterkränze, Scheitel. Von der Seite liest sich die Krone als Folge übereinanderliegender Bögen wie bei Earle. Die
 * gepunkteten Bögen (`rims`) liegen in Reihen knapp innerhalb der Oberkante jedes Kissens — dicht an der Kante, nach
 * innen lichter (Earles Blatttupfen, Ebene 33).
 *
 * Kantenwert je Vertex (0..1, `cushionEdge.ts`): Nähe zur Oberkante des eigenen Kissens, im Bruchteil von `crownCast`.
 * Das Kronenmaterial lässt die Tupfen dort voll wachsen und im Kisseninnern verschwinden (die Bögen sind dicht, das
 * Kisseninnere dunkel); der Kern bleibt 0.
 */

/** Hülle der Kissenkrone (Einheit r): Halbachsen und Mitte (Unterseite ≈ −0.34, Scheitel ≈ +0.55). */
export const KUPPEL_HULL = { ax: 1.0, ay: 0.46, az: 0.86, cy: 0.04, lean: 0.14, rise: 0.12 } as const;

/** Abplattung der Kissen längs ihrer Achse (Earles Kissen sind breiter als hoch). */
const CUSHION_FLAT = 0.64;

interface Cushion {
  /** Mittelpunkt des Kissens und Achse (nach außen und oben). */
  c: V3;
  dir: V3;
  r: number;
  /** Nimmt Schlagschatten an (1: untere Kränze) oder bleibt frei (0: Schultern, Scheitel). */
  cast: number;
}

interface KPart {
  pos: number[];
  nor: number[];
  cast: number[];
  rim: number[];
  idx: number[];
}

const UP: V3 = [0, 1, 0];

/** Windform: der Scheitel neigt sich nach +x, die rechte Seite steht höher (Ebene 33). */
function wind(p: V3): V3 {
  const H = KUPPEL_HULL;
  return [p[0] + H.lean * Math.max(0, p[1] + 0.2), p[1] * (1 + H.rise * p[0]) + 0.04 * p[0], p[2]];
}

/** Normale unter der Windform (inverse Transponierte der Jacobi-Matrix). */
function windNormal(n: V3, p: V3): V3 {
  const H = KUPPEL_HULL;
  // J = [[1, b], [c, d]] in (x, y); z unverändert → n' = J⁻ᵀ n (bis auf den Betrag)
  const b = p[1] + 0.2 > 0 ? H.lean : 0;
  const c = H.rise * p[1] + 0.04;
  const d = 1 + H.rise * p[0];
  const det = d - b * c;
  return norm([(d * n[0] - c * n[1]) / det, (n[1] - b * n[0]) / det, n[2]]);
}

/** Hüllnormale (Ellipsoid der Masse): das Licht läuft über die ganze Krone als eine Form. */
function hullNormal(p: V3): V3 {
  const H = KUPPEL_HULL;
  return norm([p[0] / (H.ax * H.ax), (p[1] - H.cy) / (H.ay * H.ay), p[2] / (H.az * H.az)]);
}

/** Schattierungsnormale: Kissen (Eigenleben der Teilkuppel) mit der Hülle gemischt. */
function shadeNormal(p: V3, nc: V3, capWeight: number): V3 {
  return norm(add(scale(nc, capWeight), scale(hullNormal(p), 1 - capWeight)));
}

/** Kissen der Krone: fünf Kränze auf der Hülle (Rand, drei Schultern, Scheitel), deterministisch. */
function kuppelCushions(): Cushion[] {
  const H = KUPPEL_HULL;
  const rand = mulberry32(hash32('kuppel-cushions-v2'));
  const out: Cushion[] = [];
  const onHull = (az: number, el: number): { p: V3; n: V3 } => {
    const p: V3 = [H.ax * Math.cos(el) * Math.cos(az), H.cy + H.ay * Math.sin(el), H.az * Math.cos(el) * Math.sin(az)];
    return { p, n: hullNormal(p) };
  };
  // (Elevation, Kissenradius, Anzahl, Einsinken, Aufrichten der Achse, Schlagschatten)
  const tiers: Array<[number, number, number, number, number, number]> = [
    [-0.16, 0.32, 12, 0.6, 0.3, 1],
    [0.32, 0.31, 10, 0.6, 0.55, 1],
    [0.74, 0.3, 6, 0.6, 0.85, 0],
    [1.1, 0.29, 3, 0.6, 1.2, 0],
    [1.5, 0.29, 1, 0.6, 2.0, 0],
  ];
  tiers.forEach(([el, rc, count, sink, lift, cast], ti) => {
    const a0 = ti * 0.61 + rand() * 0.4;
    for (let k = 0; k < count; k++) {
      const az = a0 + (k / count) * Math.PI * 2 + (rand() - 0.5) * 0.3;
      const e = el + (rand() - 0.5) * 0.1;
      const { p, n } = onHull(az, e);
      // Die Randkissen an den Enden der Längsachse hängen tiefer und sind größer (Ebene 33: links eine schwere Randkuppel)
      const end = Math.abs(Math.cos(az));
      const r = rc * (0.9 + 0.2 * rand()) * (ti === 0 ? 1 + 0.22 * end * end : 1);
      const dir = norm(add(n, scale(UP, lift)));
      const drop = ti === 0 ? -0.07 * end * end : 0;
      out.push({ c: add(sub(p, scale(dir, r * CUSHION_FLAT * sink)), [0, drop, 0]), dir, r, cast });
    }
  });
  return out;
}

/** Kern der Masse (Ellipsoid unter den Kissen, flache dunkle Unterseite). */
const CORE = { c: [0.02, 0.0, 0] as V3, rx: 0.9, ry: 0.32, rz: 0.76 };

function inCore(p: V3, k = 0.97): boolean {
  return ((p[0] - CORE.c[0]) / CORE.rx) ** 2 + ((p[1] - CORE.c[1]) / CORE.ry) ** 2 + ((p[2] - CORE.c[2]) / CORE.rz) ** 2 < k;
}

/** Punkt auf dem abgeplatteten Kissen in Richtung `nc` (Einheitsvektor um die Kissenachse) und seine Normale. */
function onCushion(c: Cushion, nc: V3): { p: V3; n: V3 } {
  const a = nc[0] * c.dir[0] + nc[1] * c.dir[1] + nc[2] * c.dir[2];
  const perp = sub(nc, scale(c.dir, a));
  const p = add(c.c, scale(add(perp, scale(c.dir, a * CUSHION_FLAT)), c.r));
  return { p, n: norm(add(perp, scale(c.dir, a / CUSHION_FLAT))) };
}

/** Liegt p (ohne Windform) in einem anderen Kissen oder im Kern? */
function hidden(p: V3, cushions: Cushion[], self: number): boolean {
  if (inCore(p)) return true;
  for (let o = 0; o < cushions.length; o++) {
    if (o === self) continue;
    const c = cushions[o]!;
    const d = sub(p, c.c);
    const a = d[0] * c.dir[0] + d[1] * c.dir[1] + d[2] * c.dir[2];
    const perp = sub(d, scale(c.dir, a));
    if (Math.hypot(len(perp), a / CUSHION_FLAT) < c.r * 0.97) return true;
  }
  return false;
}

/** Richtung auf der Kappe (Polarwinkel θ um die Achse, Azimut φ in der Tangentenbasis). */
function capDir(axis: V3, t1: V3, t2: V3, th: number, ph: number): V3 {
  return norm(add(scale(axis, Math.cos(th)), add(scale(t1, Math.sin(th) * Math.cos(ph)), scale(t2, Math.sin(th) * Math.sin(ph)))));
}

/**
 * Kissenkrone (Ebene 33). `detail`: Hoch (große Fokusbäume, Solitäre) oder Mobil. Vertices ≈ 1350 (Hoch) bzw. 950.
 * Proben (`samples`) gleichmäßig über die sichtbaren Kissen, Bögen (`rims`) in Reihen an ihren Oberkanten.
 */
export function createKuppelCrown(detail: 'hoch' | 'mobil' = 'hoch'): CrownTemplate {
  const cushions = kuppelCushions();
  const edges = edgeCushions(cushions);
  const part: KPart = { pos: [], nor: [], cast: [], rim: [], idx: [] };
  const [around, rings, coreW, coreH] = detail === 'hoch' ? [14, 4, 16, 8] : [9, 3, 10, 6];
  // Die Kappen reichen knapp über die Halbkugel: tiefer liegt jedes Kissen ohnehin im Kern oder im Nachbarn
  const thMax = (92 * Math.PI) / 180;
  const push = (p: V3, n: V3, cast: number, rim: number) => {
    const q = wind(p);
    const m = windNormal(n, p);
    part.pos.push(q[0], q[1], q[2]);
    part.nor.push(m[0], m[1], m[2]);
    part.cast.push(cast);
    part.rim.push(rim);
  };
  // Kern: flache, dunkle Unterseite (nimmt unten Schlagschatten an)
  {
    const base = part.pos.length / 3;
    for (let i = 0; i <= coreH; i++) {
      const th = (i / coreH) * Math.PI;
      for (let j = 0; j <= coreW; j++) {
        const ph = (j / coreW) * Math.PI * 2;
        const d: V3 = [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)];
        const p: V3 = [CORE.c[0] + d[0] * CORE.rx, CORE.c[1] + d[1] * CORE.ry, CORE.c[2] + d[2] * CORE.rz];
        // Der Kern nimmt ganz Schlagschatten an (seine Oberseite liegt unter den Kissen): so bleibt der Bruchteil von
        // `crownCast` auf keinem Kerndreieck zwischen 0 und 1 interpoliert (er trägt die Kante)
        push(p, shadeNormal(p, norm([d[0] / CORE.rx, d[1] / CORE.ry, d[2] / CORE.rz]), 0.1), 1, 0);
      }
    }
    const row = coreW + 1;
    for (let i = 0; i < coreH; i++) {
      for (let j = 0; j < coreW; j++) {
        const a = base + i * row + j;
        const b = a + row;
        part.idx.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
  }
  // Kissen: abgeplattete Kappen um ihre Achse (Fächer um den Scheitel, dann Ringstreifen)
  cushions.forEach((c, ci) => {
    const base = part.pos.length / 3;
    const [t1, t2] = basis(c.dir);
    const emit = (th: number, ph: number) => {
      const nc = th === 0 ? c.dir : capDir(c.dir, t1, t2, th, ph);
      const s = onCushion(c, nc);
      push(s.p, shadeNormal(s.p, s.n, 0.22), c.cast, cushionEdge(s.p, ci, edges, nc));
    };
    emit(0, 0);
    for (let i = 1; i <= rings; i++) for (let j = 0; j < around; j++) emit((i / rings) * thMax, (j / around) * Math.PI * 2);
    for (let j = 0; j < around; j++) part.idx.push(base, base + 1 + j, base + 1 + ((j + 1) % around));
    for (let i = 1; i < rings; i++) {
      const r0 = base + 1 + (i - 1) * around;
      const r1 = base + 1 + i * around;
      for (let j = 0; j < around; j++) {
        const j1 = (j + 1) % around;
        part.idx.push(r0 + j, r1 + j, r0 + j1, r0 + j1, r1 + j, r1 + j1);
      }
    }
  });
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(part.pos, 3));
  g.setAttribute('normal', new Float32BufferAttribute(part.nor, 3));
  g.setAttribute('crownCast', new Float32BufferAttribute(part.cast.map((c, i) => packCast(c, part.rim[i]!)), 1));
  g.setIndex(new Uint16BufferAttribute(part.idx, 1));
  g.computeBoundingSphere();
  return { geometry: g, ...kuppelSamples(cushions, edges, detail) };
}

/** Kissen für die Kantenwerte (abgeplattet längs der Achse). */
function edgeCushions(cushions: Cushion[]): EdgeCushion[] {
  return cushions.map((c) => ({ c: c.c, dir: c.dir, r: c.r, flat: CUSHION_FLAT }));
}

/**
 * Proben und Bögen der Kissenkrone: Proben gleichmäßig über die sichtbaren Kissenflächen; Bögen entlang der sichtbaren
 * Oberkanten (`edgeAt`): je Kissen ein dichtes Raster von Kandidaten auf der Kappe, behalten mit der Kantennähe — an
 * der Kante dicht, nach innen lichter, auf den Unterseiten keine (Earles Tupfenbögen, Ebene 33).
 */
function kuppelSamples(cushions: Cushion[], edges: EdgeCushion[], detail: 'hoch' | 'mobil'): { samples: Float32Array; sampleCast: Float32Array; rims: Float32Array; rimCast: Float32Array } {
  const rand = mulberry32(hash32('kuppel-samples-v3'));
  const list: number[] = [];
  const lc: number[] = [];
  const rims: number[] = [];
  const rc: number[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  const perCap = detail === 'hoch' ? 18 : 10;
  const perRim = detail === 'hoch' ? 150 : 80;
  const cosMax = Math.cos((90 * Math.PI) / 180);
  for (let ci = 0; ci < cushions.length; ci++) {
    const c = cushions[ci]!;
    const [t1, t2] = basis(c.dir);
    const put = (nc: V3, out: number[], outCast: number[], keep: (p: V3) => boolean) => {
      const s = onCushion(c, nc);
      if (hidden(s.p, cushions, ci) || !keep(s.p)) return;
      const q = wind(s.p);
      const n = windNormal(shadeNormal(s.p, s.n, 0.22), s.p);
      out.push(q[0], q[1], q[2], n[0], n[1], n[2]);
      outCast.push(c.cast);
    };
    for (let k = 0; k < perCap; k++) {
      const th = Math.acos(1 - rand() * (1 - Math.cos((84 * Math.PI) / 180)));
      put(capDir(c.dir, t1, t2, th, rand() * Math.PI * 2), list, lc, () => true);
    }
    // Fibonacci-Raster über die Kappe (gleichmäßige Fläche), Kandidat bleibt mit Wahrscheinlichkeit ~ Kantennähe
    const phase = rand() * Math.PI * 2;
    for (let k = 0; k < perRim; k++) {
      const th = Math.acos(1 - ((k + 0.5) / perRim) * (1 - cosMax));
      const nc = capDir(c.dir, t1, t2, th, phase + k * golden);
      const u = rand();
      put(nc, rims, rc, (p) => {
        const e = cushionEdge(p, ci, edges, nc);
        return e > 0.3 && u < Math.pow(e, 1.4);
      });
    }
  }
  const s = shuffleWith(list, lc, 6, 'kuppel-samples-order');
  const r = shuffleWith(rims, rc, 6, 'kuppel-rims-order');
  return { samples: s.list, sampleCast: s.extra, rims: r.list, rimCast: r.extra };
}

// --- Ausleger-Stamm ------------------------------------------------------------------------------------------

/** Gabelhöhe des Ausleger-Stamms (Einheit Kronenradius r): darüber greifen die Äste fast waagrecht aus. */
export const SPRAWL_FORK = 0.24;

export interface SprawlGeometry {
  geometry: BufferGeometry;
  /** Höchster Punkt und größte Ausladung (Einheit r). */
  top: number;
  spread: number;
  /** Mittellinien aller Äste (Tests). */
  paths: V3[][];
}

/**
 * Ausleger-Stamm des Kuppelbaums (Ebene 33, Einheit Kronenradius r, Fuß im Ursprung): kurzer, dicker, leicht
 * gedrehter Stamm mit Wurzelanlauf bis `SPRAWL_FORK`; dort teilen sich sechs Hauptäste, die in flachen, geknickten
 * Bögen fast waagrecht hinausgreifen (Ellenbogen, dann leicht steigend) und unter bzw. in der Kissenkrone enden. Ein
 * langer Ast reicht tief unter dem Randkissen hinaus (Ebene 33 links). Jeder Ast trägt waagrechte Nebenäste und an der
 * Spitze feine Zweige, die in die Krone steigen. Alles verjüngt sich haarfein.
 */
export function createSprawlTrunk(seed = 9): SprawlGeometry {
  const rand = mulberry32(hash32('trunk-sprawl-v1', seed));
  const b = new TreeMeshBuilder();
  const paths: V3[][] = [];
  let top = 0;
  let spread = 0;
  const note = (path: V3[]) => {
    paths.push(path);
    for (const p of path) {
      top = Math.max(top, p[1]);
      spread = Math.max(spread, Math.hypot(p[0], p[2]));
    }
  };
  const r0 = 0.068;
  const pts = stem(rand, -0.2, SPRAWL_FORK, 7, r0, 1.1, 0.018, 0.3);
  const vTop = b.tube(pts, 9, 0);
  note(pts.map((q) => q.p));
  const F = pts[pts.length - 1]!.p;
  const rF = pts[pts.length - 1]!.r;
  const limbs = 6;
  const az0 = rand() * Math.PI * 2;
  // Der lange, tiefe Ast (Ebene 33 links) liegt auf der Längsachse der Krone (−x)
  const longIndex = 0;
  for (let k = 0; k < limbs; k++) {
    const az = k === longIndex ? Math.PI + (rand() - 0.5) * 0.3 : az0 + (k / limbs) * Math.PI * 2 + (rand() - 0.5) * 0.5;
    // Längsachse (±x) weiter als die Querachse (die Krone ist breit)
    const axial = Math.abs(Math.cos(az));
    const long = k === longIndex;
    const L = long ? 1.08 + 0.1 * rand() : (0.56 + 0.26 * axial) * (0.9 + 0.2 * rand());
    const endY = long ? SPRAWL_FORK + 0.02 : SPRAWL_FORK + 0.13 + 0.12 * rand();
    const elbow = 0.3 + 0.12 * rand();
    const sway = (rand() - 0.5) * 0.35;
    const dir = (a: number): V3 => [Math.cos(a), 0, Math.sin(a)];
    const p0: V3 = [F[0], F[1] - 0.03, F[2]];
    // steil aus der Gabel, am Ellenbogen fast waagrecht, dann flach hinaus (leicht steigend; der lange Ast sinkt)
    const p1 = add(F, add(scale(dir(az), L * 0.12), [0, 0.07, 0]));
    const p2 = add(F, add(scale(dir(az + sway * 0.5), L * elbow), [0, 0.1 + 0.03 * rand(), 0]));
    const p3 = add(F, add(scale(dir(az + sway), L * 0.68), [0, (endY - SPRAWL_FORK) * 0.75 + (long ? 0.04 : 0.02), 0]));
    const p4: V3 = [F[0] + Math.cos(az + sway * 1.3) * L, endY, F[2] + Math.sin(az + sway * 1.3) * L];
    const path = [...bezier3(p0, p1, p2, p3, 6), ...bezier(p3, add(scale(add(p3, p4), 0.5), [0, long ? -0.02 : 0.015, 0]), p4, 4).slice(1)];
    const limb = taperAlong(path, rF * (long ? 0.66 : 0.58), 0.006, 0.06);
    b.tube(limb, 6, 1, vTop);
    note(path);
    // Nebenäste: waagrecht zur Seite, leicht steigend, enden in der Krone
    for (const [t, side] of [
      [0.42 + rand() * 0.08, k % 2 === 0 ? 1 : -1],
      [0.66 + rand() * 0.08, k % 2 === 0 ? -1 : 1],
    ] as const) {
      const at = along(path, t);
      const rAt = limb[at.i]!.r;
      const sAz = az + side * (0.55 + rand() * 0.45);
      const sl = L * (0.26 + 0.12 * rand());
      const q0 = at.p;
      const q1 = add(q0, add(scale(dirFrom(sAz, 0), sl * 0.5), [0, 0.03, 0]));
      const q2 = add(q0, add(scale(dirFrom(sAz + side * 0.25, 0), sl), [0, 0.08 + 0.05 * rand(), 0]));
      const branch = bezier(q0, q1, q2, 4);
      b.tube(taperAlong(branch, rAt * 0.6, 0.004), 4, 2, vTop);
      note(branch);
    }
    // Zweige an der Spitze: fächern auf und steigen in die Krone
    const end = path[path.length - 1]!;
    const endDir = norm(sub(end, path[path.length - 2]!));
    for (let m = 0; m < 3; m++) {
      const a = Math.atan2(endDir[2], endDir[0]) + (m - 1) * 0.55 + (rand() - 0.5) * 0.2;
      const tl = 0.08 + 0.06 * rand();
      const tip = add(end, add(scale(dirFrom(a, 0), tl), [0, 0.05 + 0.05 * rand(), 0]));
      const twig = bezier(end, add(scale(add(end, tip), 0.5), [0, 0.01, 0]), tip, 3);
      b.tube(taperAlong(twig, 0.006, 0.0025), 3, 2, vTop);
      note(twig);
    }
  }
  roots(b, rand, r0, 4, 0.16, 4);
  return { geometry: b.toGeometry(), top, spread, paths };
}
