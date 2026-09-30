import { BufferGeometry, ExtrudeGeometry, Float32BufferAttribute, Shape, TorusGeometry, Vector2 } from 'three/webgpu';
import { hash32, mulberry32 } from '@ee/world';

/**
 * Prozedurale Müll-Geometrie in Earles Formensprache: facettierte Flächen (flache Normalen, jede Facette ein
 * Farbband), klare Silhouetten, Terrassen und Abbruchkanten statt Detailrauschen. Alles auf eine Einheit normiert:
 * Fuß bei y = 0, Höhe 1; große Formen reichen mit einer Schürze unter den Boden (nichts schwebt am Hang).
 *
 * Attribut `seg` = (Teilform, Stufe): die Teilform wählt im Vertex-Shader die Form der Instanz (die anderen fallen
 * auf einen Punkt zusammen), die Stufe (Terrasse, Kappe, Sporn) steuert Muster und Neon.
 */

type V3 = [number, number, number];

/** Stufen-Kennungen im `seg.y`-Attribut (ganzzahlig = Terrasse, ab 10 Sonderteile). */
export const SEG_CAP = 10;
export const SEG_SPIKE = 11;
export const SEG_SKIRT = 12;
export const SEG_LEDGE = 13;
/** Überwucherung (Kuppelbüsche an Ruinen): dunkle Masse mit Punktrand wie Earles Kronen. */
export const SEG_BUSH = 14;

/** Teilformen im großen Mesh: Müllberge 0..2, Ruinen 3..6. */
export const BIG_PART_HEAP = 0;
export const BIG_PART_RUIN = 3;

class FlatBuilder {
  readonly pos: number[] = [];
  readonly nor: number[] = [];
  readonly seg: number[] = [];
  part = 0;
  tier = 0;

  /** Dreieck mit flacher Normale; `hint` zeigt nach außen (Winding wird danach gerichtet). */
  tri(a: V3, b: V3, c: V3, hint: V3): void {
    const ux = b[0] - a[0];
    const uy = b[1] - a[1];
    const uz = b[2] - a[2];
    const vx = c[0] - a[0];
    const vy = c[1] - a[1];
    const vz = c[2] - a[2];
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz);
    if (l < 1e-10) return;
    nx /= l;
    ny /= l;
    nz /= l;
    let p1 = b;
    let p2 = c;
    if (nx * hint[0] + ny * hint[1] + nz * hint[2] < 0) {
      nx = -nx;
      ny = -ny;
      nz = -nz;
      p1 = c;
      p2 = b;
    }
    for (const p of [a, p1, p2]) {
      this.pos.push(p[0], p[1], p[2]);
      this.nor.push(nx, ny, nz);
      this.seg.push(this.part, this.tier);
    }
  }

  quad(a: V3, b: V3, c: V3, d: V3, hint: V3): void {
    this.tri(a, b, c, hint);
    this.tri(a, c, d, hint);
  }

  /** Fremde (nicht indizierte oder indizierte) Geometrie übernehmen, Normalen je Dreieck neu (flach). */
  addGeometry(g: BufferGeometry, transform: (p: V3) => V3, hintOf: (centroid: V3, n: V3) => V3 = (_c, n) => n): void {
    const src = g.index ? g.toNonIndexed() : g;
    const p = src.getAttribute('position');
    for (let i = 0; i + 2 < p.count; i += 3) {
      const a = transform([p.getX(i), p.getY(i), p.getZ(i)]);
      const b = transform([p.getX(i + 1), p.getY(i + 1), p.getZ(i + 1)]);
      const c = transform([p.getX(i + 2), p.getY(i + 2), p.getZ(i + 2)]);
      // Ursprüngliche Richtung beibehalten: Normale aus dem Winding, Hinweis = dieselbe Normale
      const ux = b[0] - a[0];
      const uy = b[1] - a[1];
      const uz = b[2] - a[2];
      const vx = c[0] - a[0];
      const vy = c[1] - a[1];
      const vz = c[2] - a[2];
      const n: V3 = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
      const centroid: V3 = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];
      this.tri(a, b, c, hintOf(centroid, n));
    }
    if (src !== g) src.dispose();
  }

  build(): BufferGeometry {
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new Float32BufferAttribute(this.nor, 3));
    g.setAttribute('seg', new Float32BufferAttribute(this.seg, 2));
    g.computeBoundingSphere();
    return g;
  }
}

interface Ring {
  y: number;
  /** Maßstab des Grundpolygons (1 = Radius 0.5). */
  s: number;
  /** Stufe (Terrasse) für das Muster. */
  tier: number;
  /** Drehung des Polygons (rad) und Versatz der Mitte (x, z). */
  twist?: number;
  dx?: number;
  dz?: number;
  /** Zusätzliche Höhenzacken je Ecke (Abbruchkante), nur für die oberste Reihe. */
  jag?: number[];
}

/** Unregelmäßiges Grundpolygon: `n` Ecken, Winkel und Radien leicht gestreut, größte Ausdehnung 0.5. */
function polygon(n: number, rand: () => number, spread = 0.28, rMin = 0.8): Array<[number, number]> {
  const pts: Array<[number, number]> = [];
  let maxR = 0;
  for (let i = 0; i < n; i++) {
    const a = ((i + (rand() - 0.5) * spread) / n) * Math.PI * 2;
    const r = rMin + (1 - rMin) * rand();
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
    maxR = Math.max(maxR, r);
  }
  return pts.map(([x, z]) => [(x / maxR) * 0.5, (z / maxR) * 0.5]);
}

function ringPoint(poly: Array<[number, number]>, i: number, r: Ring, yOverride?: number): V3 {
  const [px, pz] = poly[i % poly.length]!;
  const t = r.twist ?? 0;
  const c = Math.cos(t);
  const s = Math.sin(t);
  const x = (px * c - pz * s) * r.s + (r.dx ?? 0);
  const z = (px * s + pz * c) * r.s + (r.dz ?? 0);
  return [x, yOverride ?? r.y, z];
}

/**
 * Facettierter Drehkörper aus Ringen desselben Grundpolygons: Seitenflächen je Stufe eben (Earles Monolith-
 * Facetten), Absätze als schmale, fast waagrechte Bänder, oben eine gezackte Abbruchkante mit Kappe.
 */
function lathe(b: FlatBuilder, poly: Array<[number, number]>, rings: Ring[], capY: number): void {
  const n = poly.length;
  for (let k = 0; k < rings.length - 1; k++) {
    const r0 = rings[k]!;
    const r1 = rings[k + 1]!;
    const ledge = Math.abs(r1.y - r0.y) < 0.03;
    b.tier = r0.y < 0 ? SEG_SKIRT : ledge ? SEG_LEDGE : r0.tier;
    const last = k === rings.length - 2;
    for (let i = 0; i < n; i++) {
      const a0 = ringPoint(poly, i, r0);
      const a1 = ringPoint(poly, i + 1, r0);
      const b1 = ringPoint(poly, i + 1, r1, last && r1.jag ? r1.y + (r1.jag[(i + 1) % n] ?? 0) : undefined);
      const b0 = ringPoint(poly, i, r1, last && r1.jag ? r1.y + (r1.jag[i] ?? 0) : undefined);
      // Außen = weg von der Achse des Rings (Mitte kann versetzt sein, z. B. Säulen)
      const cx = ((r0.dx ?? 0) + (r1.dx ?? 0)) / 2;
      const cz = ((r0.dz ?? 0) + (r1.dz ?? 0)) / 2;
      const mid: V3 = [(a0[0] + a1[0] + b0[0] + b1[0]) / 4 - cx, 0, (a0[2] + a1[2] + b0[2] + b1[2]) / 4 - cz];
      // Absatz: nach innen springend → Fläche schaut nach oben; nach außen (Gesims) → nach unten
      const hint: V3 = ledge ? [mid[0] * 0.2, r1.s <= r0.s ? 1 : -1, mid[2] * 0.2] : [mid[0], 0.15, mid[2]];
      b.quad(a0, a1, b1, b0, hint);
    }
  }
  // Kappe: Fächer zur (leicht vertieften) Mitte der obersten Reihe
  const top = rings[rings.length - 1]!;
  b.tier = SEG_CAP;
  const c: V3 = [top.dx ?? 0, capY, top.dz ?? 0];
  for (let i = 0; i < n; i++) {
    const a0 = ringPoint(poly, i, top, top.y + (top.jag?.[i] ?? 0));
    const a1 = ringPoint(poly, i + 1, top, top.y + (top.jag?.[(i + 1) % n] ?? 0));
    b.tri(a0, a1, c, [0, 1, 0]);
  }
}

/** Dünner Sporn (dreiseitige Pyramide): Rohre und Träger, die aus Berg und Kappe ragen. */
function spike(b: FlatBuilder, base: V3, dir: V3, length: number, width: number, rand: () => number): void {
  const l = Math.hypot(dir[0], dir[1], dir[2]) || 1;
  const d: V3 = [dir[0] / l, dir[1] / l, dir[2] / l];
  // Basis senkrecht zu d
  const ax: V3 = Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  let ux = ax[1] * d[2] - ax[2] * d[1];
  let uy = ax[2] * d[0] - ax[0] * d[2];
  let uz = ax[0] * d[1] - ax[1] * d[0];
  const ul = Math.hypot(ux, uy, uz) || 1;
  ux /= ul;
  uy /= ul;
  uz /= ul;
  const vx = d[1] * uz - d[2] * uy;
  const vy = d[2] * ux - d[0] * uz;
  const vz = d[0] * uy - d[1] * ux;
  const tip: V3 = [base[0] + d[0] * length, base[1] + d[1] * length, base[2] + d[2] * length];
  const corners: V3[] = [];
  const rot = rand() * Math.PI * 2;
  for (let i = 0; i < 3; i++) {
    const a = rot + (i / 3) * Math.PI * 2;
    const c = Math.cos(a) * width;
    const s = Math.sin(a) * width;
    corners.push([base[0] + ux * c + vx * s - d[0] * width, base[1] + uy * c + vy * s - d[1] * width, base[2] + uz * c + vz * s - d[2] * width]);
  }
  b.tier = SEG_SPIKE;
  for (let i = 0; i < 3; i++) {
    const a = corners[i]!;
    const c = corners[(i + 1) % 3]!;
    const m: V3 = [(a[0] + c[0]) / 2 - base[0], (a[1] + c[1]) / 2 - base[1], (a[2] + c[2]) / 2 - base[2]];
    b.tri(a, c, tip, m);
  }
}

/**
 * Kiste auf einem Absatz (Silhouette im Gegenlicht: Kanten statt Rauschen). Mitte unten `base`, Maße (w, h, d),
 * Drehung um y; kein Boden (steht auf dem Absatz).
 */
function junkBox(b: FlatBuilder, base: V3, w: number, h: number, d: number, yaw: number, tilt = 0): void {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const ct = Math.cos(tilt);
  const st = Math.sin(tilt);
  const P = (x: number, y: number, z: number): V3 => {
    // Neigung um die lokale z-Achse, dann Drehung um y
    const x1 = x * ct - y * st;
    const y1 = x * st + y * ct;
    return [base[0] + x1 * c + z * s, base[1] + y1, base[2] - x1 * s + z * c];
  };
  const hw = w / 2;
  const hd = d / 2;
  const v = [P(-hw, 0, -hd), P(hw, 0, -hd), P(hw, 0, hd), P(-hw, 0, hd), P(-hw, h, -hd), P(hw, h, -hd), P(hw, h, hd), P(-hw, h, hd)];
  const up: V3 = [-st, ct, 0];
  const n = (x: number, z: number): V3 => [x * c + z * s, 0, -x * s + z * c];
  b.tier = 1;
  b.quad(v[4]!, v[7]!, v[6]!, v[5]!, up);
  b.quad(v[0]!, v[4]!, v[5]!, v[1]!, n(0, -1));
  b.quad(v[1]!, v[5]!, v[6]!, v[2]!, n(1, 0));
  b.quad(v[2]!, v[6]!, v[7]!, v[3]!, n(0, 1));
  b.quad(v[3]!, v[7]!, v[4]!, v[0]!, n(-1, 0));
}

/**
 * Kuppelbusch (Überwucherung): flach schattierte Halbkugel aus 3 Ringen × 7 Segmenten, Fuß leicht eingesenkt. Earle:
 * dunkle Kuppel, der Punktrand kommt aus dem Shader.
 */
function bush(b: FlatBuilder, c: V3, r: number, h: number, rand: () => number): void {
  const seg = 7;
  const rings = [
    [-0.25, 1.0],
    [0.35, 0.92],
    [0.72, 0.62],
  ] as const;
  const rot = rand() * Math.PI * 2;
  const pts: V3[][] = rings.map(([y, s]) =>
    Array.from({ length: seg }, (_, i) => {
      const a = rot + (i / seg) * Math.PI * 2;
      const j = 0.88 + 0.24 * rand();
      return [c[0] + Math.cos(a) * r * s * j, c[1] + y * h, c[2] + Math.sin(a) * r * s * j] as V3;
    }),
  );
  const top: V3 = [c[0], c[1] + h, c[2]];
  b.tier = SEG_BUSH;
  for (let k = 0; k < rings.length - 1; k++) {
    for (let i = 0; i < seg; i++) {
      const a0 = pts[k]![i]!;
      const a1 = pts[k]![(i + 1) % seg]!;
      const b1 = pts[k + 1]![(i + 1) % seg]!;
      const b0 = pts[k + 1]![i]!;
      const hint: V3 = [(a0[0] + a1[0]) / 2 - c[0], 0.3, (a0[2] + a1[2]) / 2 - c[2]];
      b.quad(a0, a1, b1, b0, hint);
    }
  }
  const last = pts[rings.length - 1]!;
  for (let i = 0; i < seg; i++) b.tri(last[i]!, last[(i + 1) % seg]!, top, [0, 1, 0]);
}

/** Büsche am Fuß einer Ruine (auf einer Ellipse um die Mitte) und ein paar oben auf Absätzen. */
function overgrow(b: FlatBuilder, rx: number, rz: number, count: number, size: number, rand: () => number, extra: V3[] = []): void {
  for (let k = 0; k < count; k++) {
    const a = (k / count) * Math.PI * 2 + rand() * 0.6;
    const r = size * (0.6 + rand() * 0.6);
    bush(b, [Math.cos(a) * rx * (0.9 + rand() * 0.25), -0.02, Math.sin(a) * rz * (0.9 + rand() * 0.25)], r, r * (0.8 + rand() * 0.5), rand);
  }
  for (const p of extra) {
    const r = size * (0.45 + rand() * 0.35);
    bush(b, p, r, r * 0.9, rand);
  }
}

/** Kisten reihum auf einem Absatz verteilen (Anzahl, Größe relativ zur Höhe 1). */
function junkOnLedge(b: FlatBuilder, poly: Array<[number, number]>, ring: Ring, count: number, size: number, rand: () => number): void {
  for (let k = 0; k < count; k++) {
    const t = (k + rand() * 0.6) / count;
    const p = onRing(poly, ring, t, 0.86 + rand() * 0.08);
    const w = size * (0.6 + rand() * 0.8);
    junkBox(b, [p[0], p[1] - 0.005, p[2]], w, w * (0.5 + rand() * 0.9), w * (0.6 + rand() * 0.6), rand() * Math.PI, (rand() - 0.5) * 0.5);
  }
}

/** Punkt auf der Außenseite eines Rings (für Sporne). */
function onRing(poly: Array<[number, number]>, r: Ring, t: number, inset = 0.92): V3 {
  const n = poly.length;
  const f = t * n;
  const i = Math.floor(f);
  const u = f - i;
  const a = ringPoint(poly, i, r);
  const c = ringPoint(poly, i + 1, r);
  const cx = r.dx ?? 0;
  const cz = r.dz ?? 0;
  const x = a[0] + (c[0] - a[0]) * u;
  const z = a[2] + (c[2] - a[2]) * u;
  return [cx + (x - cx) * inset, r.y, cz + (z - cz) * inset];
}

/** Die drei Müllberg-Formen (Halde, Turm, Grat) als Teilformen 0..2. */
function addHeaps(b: FlatBuilder): void {
  // Halde: Deponie-Terrassen (Earles waagrechte Bruchbänder), breit
  {
    const rand = mulberry32(hash32('trash-heap-halde', 3));
    b.part = BIG_PART_HEAP;
    const poly = polygon(9, rand, 0.35, 0.78);
    const tw = [0, 0.18, -0.12, 0.3];
    const off = [
      [0, 0],
      [0.03, -0.02],
      [-0.02, 0.035],
      [0.04, 0.02],
    ];
    const jag = Array.from({ length: 9 }, () => (rand() - 0.3) * 0.1);
    const rings: Ring[] = [
      { y: -0.3, s: 1.04, tier: 0 },
      { y: 0, s: 1, tier: 0 },
      { y: 0.17, s: 0.8, tier: 0 },
      { y: 0.18, s: 0.7, tier: 1, twist: tw[1]!, dx: off[1]![0]!, dz: off[1]![1]! },
      { y: 0.38, s: 0.56, tier: 1, twist: tw[1]!, dx: off[1]![0]!, dz: off[1]![1]! },
      { y: 0.39, s: 0.47, tier: 2, twist: tw[2]!, dx: off[2]![0]!, dz: off[2]![1]! },
      { y: 0.6, s: 0.36, tier: 2, twist: tw[2]!, dx: off[2]![0]!, dz: off[2]![1]! },
      { y: 0.61, s: 0.28, tier: 3, twist: tw[3]!, dx: off[3]![0]!, dz: off[3]![1]! },
      { y: 0.84, s: 0.15, tier: 3, twist: tw[3]!, dx: off[3]![0]!, dz: off[3]![1]!, jag },
    ];
    lathe(b, poly, rings, 0.88);
    // Sporne: Träger aus der Kappe, Rohre aus den Terrassen
    spike(b, onRing(poly, rings[8]!, 0.1, 0.4), [0.3, 1, 0.1], 0.22, 0.018, rand);
    spike(b, onRing(poly, rings[8]!, 0.6, 0.3), [-0.5, 0.9, 0.3], 0.16, 0.014, rand);
    spike(b, onRing(poly, rings[4]!, 0.35, 0.95), [0.9, 0.25, 0.4], 0.14, 0.016, rand);
    spike(b, onRing(poly, rings[6]!, 0.8, 0.95), [-0.3, 0.2, -0.9], 0.12, 0.012, rand);
    spike(b, onRing(poly, rings[8]!, 0.35, 0.5), [0.1, 1, -0.6], 0.2, 0.014, rand);
    spike(b, onRing(poly, rings[2]!, 0.62, 0.97), [-0.8, 0.3, 0.6], 0.16, 0.018, rand);
    // Kisten und Ballen auf den Terrassen: kantige Silhouette im Gegenlicht
    junkOnLedge(b, poly, rings[2]!, 7, 0.07, rand);
    junkOnLedge(b, poly, rings[4]!, 5, 0.06, rand);
    junkOnLedge(b, poly, rings[6]!, 4, 0.05, rand);
  }
  // Turm: Earles roter Turm (Ebene 44/45): Schürze, steiler Kern, gebrochene Krone
  {
    const rand = mulberry32(hash32('trash-heap-turm', 5));
    b.part = BIG_PART_HEAP + 1;
    const poly = polygon(7, rand, 0.3, 0.82);
    const jag = Array.from({ length: 7 }, (_, i) => (i % 2 === 0 ? 0.04 : -0.06) + (rand() - 0.5) * 0.1);
    const rings: Ring[] = [
      { y: -0.3, s: 1.02, tier: 0 },
      { y: 0, s: 1, tier: 0 },
      { y: 0.07, s: 0.8, tier: 0 },
      { y: 0.14, s: 0.62, tier: 1 },
      { y: 0.2, s: 0.52, tier: 1 },
      { y: 0.58, s: 0.46, tier: 2, twist: 0.12 },
      { y: 0.59, s: 0.41, tier: 3, twist: 0.2, dx: 0.02 },
      { y: 0.9, s: 0.36, tier: 3, twist: 0.2, dx: 0.02, jag },
    ];
    lathe(b, poly, rings, 0.86);
    spike(b, onRing(poly, rings[7]!, 0.2, 0.6), [0.2, 1, -0.2], 0.2, 0.02, rand);
    spike(b, onRing(poly, rings[7]!, 0.7, 0.5), [-0.35, 1, 0.15], 0.13, 0.016, rand);
    spike(b, onRing(poly, rings[5]!, 0.45, 0.95), [0.8, 0.35, 0.5], 0.12, 0.014, rand);
    // Krone aus Trägern (gebrochene Silhouette wie Earles Felsnadeln)
    spike(b, onRing(poly, rings[7]!, 0.45, 0.7), [0.5, 1, 0.3], 0.26, 0.018, rand);
    spike(b, onRing(poly, rings[7]!, 0.9, 0.7), [-0.2, 1, -0.5], 0.17, 0.014, rand);
    spike(b, onRing(poly, rings[3]!, 0.15, 0.97), [-0.9, 0.5, 0.2], 0.12, 0.016, rand);
    junkOnLedge(b, poly, rings[5]!, 5, 0.055, rand);
    junkOnLedge(b, poly, rings[2]!, 6, 0.08, rand);
  }
  // Grat: lang gezogener Kamm (Instanz streckt x), gezackte Firstlinie
  {
    const rand = mulberry32(hash32('trash-heap-grat', 11));
    b.part = BIG_PART_HEAP + 2;
    const poly = polygon(10, rand, 0.25, 0.84);
    const jag = Array.from({ length: 10 }, () => (rand() - 0.4) * 0.14);
    const rings: Ring[] = [
      { y: -0.3, s: 1.03, tier: 0 },
      { y: 0, s: 1, tier: 0 },
      { y: 0.24, s: 0.72, tier: 1 },
      { y: 0.25, s: 0.63, tier: 2, twist: 0.1 },
      { y: 0.52, s: 0.42, tier: 2, twist: 0.1 },
      { y: 0.76, s: 0.2, tier: 3, twist: 0.16, dz: 0.02, jag },
    ];
    lathe(b, poly, rings, 0.8);
    spike(b, onRing(poly, rings[5]!, 0.05, 0.3), [0.6, 1, 0], 0.18, 0.016, rand);
    spike(b, onRing(poly, rings[5]!, 0.55, 0.3), [-0.7, 0.8, 0.1], 0.2, 0.016, rand);
    spike(b, onRing(poly, rings[5]!, 0.3, 0.5), [0.2, 1, 0.5], 0.14, 0.014, rand);
    spike(b, onRing(poly, rings[5]!, 0.8, 0.5), [-0.3, 1, -0.4], 0.16, 0.014, rand);
    junkOnLedge(b, poly, rings[2]!, 7, 0.07, rand);
  }
}

/**
 * Gotischer Spitzbogen (Earles Kathedralen- und Ruinenbögen): zwei Kreisbögen, die sich in der Spitze treffen. Von
 * (x0, y0) — Kämpfer links (x0 < 0) oder rechts (x0 > 0) — zur Spitze (0, yTop); Punkte nach `out`.
 */
function gothicArc(x0: number, y0: number, yTop: number, steps: number, out: Vector2[], reverse = false): void {
  const pts: Vector2[] = [];
  const top = Math.PI / 3;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * top;
    pts.push(new Vector2(x0 * (2 * Math.cos(t) - 1), y0 + ((yTop - y0) * Math.sin(t)) / Math.sin(top)));
  }
  if (reverse) pts.reverse();
  out.push(...pts);
}

function extrude(b: FlatBuilder, shapes: Shape[], depth: number, dz = 0): void {
  const g = new ExtrudeGeometry(shapes, { depth, bevelEnabled: false, curveSegments: 4, steps: 1 });
  g.translate(0, 0, -depth / 2 + dz);
  b.addGeometry(g, (p) => p);
  g.dispose();
}

/** Die vier Ruinen (Bogen, Turm, Wand, Säulen) als Teilformen 3..6 in ihren eigenen Proportionen (Höhe 1). */
function addRuins(b: FlatBuilder): void {
  // Bogen: Spitzbogen, rechte Hälfte eingestürzt, rechter Pfeiler gebrochen (Maleficents Ruine)
  {
    b.part = BIG_PART_RUIN;
    b.tier = 1;
    const w = 0.525;
    // Innen ein schlanker Spitzbogen (Stich ≈ Spannweite), außen ein flacherer Giebelbogen; die rechte Bogenhälfte ist
    // knapp hinter dem Scheitel abgebrochen, der rechte Pfeiler steht als Stumpf daneben
    const iw = 0.25;
    const outline: Vector2[] = [new Vector2(-w, 0), new Vector2(-iw, 0)];
    gothicArc(-iw, 0.44, 0.84, 6, outline);
    outline.push(new Vector2(0.05, 0.8), new Vector2(0.09, 0.84), new Vector2(0.12, 0.8), new Vector2(0.15, 0.88), new Vector2(0.19, 0.85), new Vector2(0.17, 0.95));
    const outer: Vector2[] = [];
    gothicArc(-w, 0.56, 1.02, 6, outer, true);
    outline.push(...outer);
    const arch = new Shape(outline);
    const pillar = new Shape([
      new Vector2(iw, 0),
      new Vector2(w, 0),
      new Vector2(w, 0.42),
      new Vector2(0.47, 0.5),
      new Vector2(0.41, 0.44),
      new Vector2(0.35, 0.57),
      new Vector2(0.29, 0.47),
      new Vector2(iw, 0.5),
    ]);
    extrude(b, [arch, pillar], 0.24);
    // Sockel-Stufe unter beiden Pfeilern
    const plinth = new Shape([new Vector2(-w - 0.04, 0), new Vector2(w + 0.04, 0), new Vector2(w + 0.04, 0.05), new Vector2(-w - 0.04, 0.05)]);
    b.tier = SEG_LEDGE;
    extrude(b, [plinth], 0.32);
    // Schürze unter den Boden
    b.tier = SEG_SKIRT;
    const skirt = new Shape([new Vector2(-w - 0.04, -0.25), new Vector2(w + 0.04, -0.25), new Vector2(w + 0.04, 0), new Vector2(-w - 0.04, 0)]);
    extrude(b, [skirt], 0.32);
    // Überwucherung: Kuppelbüsche an den Pfeilern, einer auf dem Pfeilerstumpf
    const rb = mulberry32(hash32('trash-ruin-bogen-bush', 1));
    for (const [x, z, r] of [[-0.46, 0.2, 0.13], [-0.36, -0.19, 0.1], [0.44, 0.18, 0.12], [0.3, -0.2, 0.09], [0.05, 0.24, 0.08]] as const) bush(b, [x, -0.02, z], r, r * 1.1, rb);
    bush(b, [0.4, 0.46, 0], 0.08, 0.08, rb);
  }
  // Turm: achteckig, schief (Instanz neigt), Krone weggebrochen
  {
    const rand = mulberry32(hash32('trash-ruin-turm', 2));
    b.part = BIG_PART_RUIN + 1;
    const poly: Array<[number, number]> = Array.from({ length: 8 }, (_, i) => [Math.cos((i / 8) * Math.PI * 2) * 0.5, Math.sin((i / 8) * Math.PI * 2) * 0.5]);
    const jag = [0.1, -0.12, -0.28, -0.2, 0.02, 0.08, -0.05, 0.12].map((v) => v + (rand() - 0.5) * 0.04);
    const rings: Ring[] = [
      { y: -0.25, s: 0.56, tier: 0 },
      { y: 0, s: 0.56, tier: 0 },
      { y: 0.06, s: 0.56, tier: 0 },
      { y: 0.07, s: 0.5, tier: 1 },
      { y: 0.55, s: 0.47, tier: 1 },
      { y: 0.56, s: 0.5, tier: 2 },
      { y: 0.6, s: 0.5, tier: 2 },
      { y: 0.61, s: 0.46, tier: 3 },
      { y: 0.86, s: 0.44, tier: 3, jag },
    ];
    lathe(b, poly, rings, 0.7);
    overgrow(b, 0.3, 0.3, 6, 0.1, rand, [[0.2, 0.6, 0.05], [-0.12, 0.6, -0.17]]);
  }
  // Wand: Mauerscheibe mit zwei Spitzbogenfenstern und einer Rose, gezackte Abbruchkante
  {
    b.part = BIG_PART_RUIN + 2;
    b.tier = 1;
    const w = 0.65;
    const wall = new Shape([
      new Vector2(-w, 0),
      new Vector2(w, 0),
      new Vector2(w, 0.6),
      new Vector2(0.52, 0.76),
      new Vector2(0.4, 0.68),
      new Vector2(0.3, 0.94),
      new Vector2(0.12, 0.84),
      new Vector2(-0.02, 1.0),
      new Vector2(-0.2, 0.8),
      new Vector2(-0.34, 0.9),
      new Vector2(-0.5, 0.64),
      new Vector2(-w, 0.7),
    ]);
    for (const cx of [-0.3, 0.26]) {
      // Fenster: unten links → unten rechts → rechter Bogen hinauf zur Spitze → linker Bogen hinab
      const hole: Vector2[] = [new Vector2(cx - 0.085, 0.2), new Vector2(cx + 0.085, 0.2)];
      const arcR: Vector2[] = [];
      gothicArc(0.085, 0.46, 0.66, 4, arcR);
      for (const p of arcR) hole.push(new Vector2(cx + p.x, p.y));
      const arcL: Vector2[] = [];
      gothicArc(-0.085, 0.46, 0.66, 4, arcL, true);
      for (const p of arcL.slice(1)) hole.push(new Vector2(cx + p.x, p.y));
      wall.holes.push(new Shape(hole));
    }
    const rose: Vector2[] = [];
    for (let i = 0; i < 8; i++) rose.push(new Vector2(-0.02 + Math.cos((i / 8) * Math.PI * 2) * 0.065, 0.66 + Math.sin((i / 8) * Math.PI * 2) * 0.065));
    wall.holes.push(new Shape(rose));
    extrude(b, [wall], 0.24);
    b.tier = SEG_SKIRT;
    extrude(b, [new Shape([new Vector2(-w - 0.03, -0.25), new Vector2(w + 0.03, -0.25), new Vector2(w + 0.03, 0.02), new Vector2(-w - 0.03, 0.02)])], 0.3);
    const rw = mulberry32(hash32('trash-ruin-wand-bush', 2));
    for (const [x, z, r] of [[-0.55, 0.16, 0.14], [-0.2, -0.17, 0.11], [0.12, 0.18, 0.1], [0.5, -0.16, 0.13], [0.62, 0.14, 0.09]] as const) bush(b, [x, -0.02, z], r, r * 1.05, rw);
  }
  // Säulen: Reihe gebrochener Säulen auf einem Sockel, eine Trommel liegt davor
  {
    const rand = mulberry32(hash32('trash-ruin-saeulen', 4));
    b.part = BIG_PART_RUIN + 3;
    b.tier = SEG_LEDGE;
    const plinth = new Shape([new Vector2(-0.75, -0.25), new Vector2(0.75, -0.25), new Vector2(0.75, 0.07), new Vector2(-0.75, 0.07)]);
    extrude(b, [plinth], 0.3);
    const cols: Array<[number, number]> = [
      [-0.56, 1.0],
      [-0.18, 0.46],
      [0.22, 0.82],
      [0.58, 0.3],
    ];
    for (const [x, h] of cols) {
      const poly: Array<[number, number]> = Array.from({ length: 8 }, (_, i) => [Math.cos((i / 8) * Math.PI * 2) * 0.5, Math.sin((i / 8) * Math.PI * 2) * 0.5]);
      const jag = Array.from({ length: 8 }, (_, i) => (i < 4 ? 0.05 : -0.05) * (0.5 + rand()) * h);
      const rings: Ring[] = [
        { y: 0.07, s: 0.22, tier: 0, dx: x },
        { y: 0.11, s: 0.22, tier: 0, dx: x },
        { y: 0.12, s: 0.17, tier: 1, dx: x },
        { y: h, s: 0.16, tier: 1, dx: x, jag },
      ];
      lathe(b, poly, rings, h - 0.02);
    }
    // liegende Trommel (Achse x) vor der Reihe
    const drum: Array<[number, number]> = Array.from({ length: 8 }, (_, i) => [Math.cos((i / 8) * Math.PI * 2) * 0.5, Math.sin((i / 8) * Math.PI * 2) * 0.5]);
    const b2 = new FlatBuilder();
    b2.part = b.part;
    b2.tier = 1;
    lathe(b2, drum, [
      { y: 0, s: 0.17, tier: 1 },
      { y: 0.3, s: 0.17, tier: 1 },
    ], 0.3);
    const g = b2.build();
    // Trommel: um z drehen (liegt, Achse x; echte Drehung, damit das Winding außen bleibt), vor die Reihe
    b.addGeometry(g, (p) => [p[1] - 0.05, -p[0] + 0.07, p[2] + 0.34]);
    g.dispose();
  }
}

/** Großes Mesh: drei Müllberge und vier Ruinen (Teilform je Instanz). */
export function createBigTrashGeometry(): BufferGeometry {
  const b = new FlatBuilder();
  addHeaps(b);
  addRuins(b);
  return b.build();
}

/**
 * Röhre (Dose, Flasche, Rohr, Fass, Schornstein): 8 Seiten, weich schattiert (runde Bänder), flache Deckel; Ringe
 * bei den Höhen, an denen der Shader die Flasche einschnürt und das Fass wölbt.
 */
export function createTubeGeometry(): BufferGeometry {
  const sides = 8;
  const ys = [0, 0.08, 0.5, 0.62, 0.74, 0.92, 1];
  const pos: number[] = [];
  const nor: number[] = [];
  const idx: number[] = [];
  for (let k = 0; k < ys.length; k++) {
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2;
      pos.push(Math.cos(a) * 0.5, ys[k]!, Math.sin(a) * 0.5);
      nor.push(Math.cos(a), 0, Math.sin(a));
    }
  }
  for (let k = 0; k < ys.length - 1; k++) {
    for (let i = 0; i < sides; i++) {
      const a = k * sides + i;
      const b = k * sides + ((i + 1) % sides);
      const c = a + sides;
      const d = b + sides;
      idx.push(a, c, b, b, c, d);
    }
  }
  // Deckel (flach, eigene Vertices)
  for (const [y, ny] of [
    [0, -1],
    [1, 1],
  ] as const) {
    const base = pos.length / 3;
    pos.push(0, y, 0);
    nor.push(0, ny, 0);
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2;
      pos.push(Math.cos(a) * 0.5, y, Math.sin(a) * 0.5);
      nor.push(0, ny, 0);
    }
    for (let i = 0; i < sides; i++) {
      const a = base + 1 + i;
      const b = base + 1 + ((i + 1) % sides);
      if (ny > 0) idx.push(base, b, a);
      else idx.push(base, a, b);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

/** Reifen/Kabelrolle: Torus, Außendurchmesser 1, Höhe 1 (Instanz skaliert die Dicke), liegt auf y = 0. */
export function createRingGeometry(): BufferGeometry {
  const g = new TorusGeometry(0.35, 0.15, 6, 16);
  g.rotateX(Math.PI / 2);
  g.translate(0, 0.15, 0);
  g.scale(1, 1 / 0.3, 1);
  g.deleteAttribute('uv');
  // Normalen nach dem Skalieren neu (die y-Streckung verzerrt sie sonst)
  g.computeVertexNormals();
  return g;
}

/** Kiste/Ballen/Scherbe/Träger: Einheitswürfel mit flachen Facetten, Fuß bei y = 0. */
export function createBlockGeometry(): BufferGeometry {
  const b = new FlatBuilder();
  const c = (x: number, y: number, z: number): V3 => [x - 0.5, y, z - 0.5];
  const v: V3[] = [c(0, 0, 0), c(1, 0, 0), c(1, 0, 1), c(0, 0, 1), c(0, 1, 0), c(1, 1, 0), c(1, 1, 1), c(0, 1, 1)];
  b.quad(v[0]!, v[1]!, v[2]!, v[3]!, [0, -1, 0]);
  b.quad(v[4]!, v[7]!, v[6]!, v[5]!, [0, 1, 0]);
  b.quad(v[0]!, v[4]!, v[5]!, v[1]!, [0, 0, -1]);
  b.quad(v[1]!, v[5]!, v[6]!, v[2]!, [1, 0, 0]);
  b.quad(v[2]!, v[6]!, v[7]!, v[3]!, [0, 0, 1]);
  b.quad(v[3]!, v[7]!, v[4]!, v[0]!, [-1, 0, 0]);
  const g = b.build();
  g.deleteAttribute('seg');
  return g;
}

/** Pfütze: Fächer (Mitte + Rand) in der xz-Ebene, Radius 0.5; der Shader wellt den Rand. */
export function createGooGeometry(segments = 28): BufferGeometry {
  const pos: number[] = [0, 0, 0];
  const nor: number[] = [0, 1, 0];
  const idx: number[] = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pos.push(Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5);
    nor.push(0, 1, 0);
  }
  for (let i = 0; i < segments; i++) idx.push(0, 1 + ((i + 1) % segments), 1 + i);
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

/** Sechseck-Punkt (Billboard im View-Raum, Radius 1). */
export function createHexDot(): BufferGeometry {
  const pos: number[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    pos.push(Math.cos(a), Math.sin(a), 0);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setIndex([0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 5]);
  return g;
}
