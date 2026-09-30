/**
 * Scroll-Grenze des echten Modus (Iteration 4, Punkt 4): Die Karte lässt sich nur so weit drehen, dass der Blickpunkt
 * in der Nähe des schon begehbaren Pfads bleibt — Knoten 0 … `reached` plus ein Stück der nächsten Strecke als
 * Vorgeschmack. Rein und ohne three.js: Punkte sind `{x, y, z}`.
 *
 * - **Kugel (heute)**: Punkte im Planetenraum, radial auf den Radius R projiziert (`onSphere`); Abstände sind Sehnen,
 *   bei ein paar Welteinheiten auf R = 32 gleich den Bögen.
 * - **Ebene (ADR 0002)**: Punkte als (x, 0, z) (`onPlane`), dieselben Funktionen. Der Vertrag für den Pan-Ball bleibt
 *   einfach: Blickpunkt + freigeschaltete Polylinie → `nearestInRegion` → `{ anchor, excess }`.
 */
export interface P3 {
  x: number;
  y: number;
  z: number;
}

/** Ein Punkt des Pfads mit seiner Pfadstelle `s` (Knoten i hat s = i, ein Punkt dazwischen i + u). */
export interface PathStation {
  p: P3;
  s: number;
}

export interface ScrollRegion {
  /** Polylinie der erlaubten Strecke (mindestens ein Punkt). */
  points: P3[];
  /** Erlaubter Abstand des Blickpunkts von der Polylinie (Welteinheiten). */
  margin: number;
}

export interface ScrollRegionOptions {
  /** Anteil der Strecke hinter dem erreichten Knoten, der noch erreichbar ist (Vorgeschmack), Standard 0,6. */
  teaser?: number;
  /** Rand um die Polylinie: Hochformat 2,5, Querformat 3,5 (`SCROLL_MARGIN`). */
  margin: number;
}

export interface RegionHit {
  /** Nächster Punkt der Polylinie (dorthin zieht die Feder zurück). */
  anchor: P3;
  /** Abstand Blickpunkt ↔ Polylinie. */
  distance: number;
  /** Wie weit der Blickpunkt über den Rand hinaus ist (0 = innerhalb). */
  excess: number;
}

/** Rand der Region in Welteinheiten. */
export const SCROLL_MARGIN = { portrait: 2.5, landscape: 3.5 } as const;
/** Weichheit des Gummibands (Welteinheiten Überstand, bei denen der Zug auf ein Viertel fällt). */
export const RUBBER_SOFT = 2.5;
/** Standardanteil der nächsten Strecke. */
export const TEASER = 0.6;

const sub = (a: P3, b: P3): P3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const dot = (a: P3, b: P3): number => a.x * b.x + a.y * b.y + a.z * b.z;
const lerp = (a: P3, b: P3, t: number): P3 => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t });
const dist = (a: P3, b: P3): number => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

/** Knoten als Stationen (s = Index). */
export function nodeStations(points: readonly P3[]): PathStation[] {
  return points.map((p, s) => ({ p, s }));
}

/** Planetenraum → Kugel mit Radius R (radial projiziert). */
export function onSphere(p: P3, radius: number): P3 {
  const len = Math.hypot(p.x, p.y, p.z) || 1;
  return { x: (p.x / len) * radius, y: (p.y / len) * radius, z: (p.z / len) * radius };
}

/** Ebene (ADR 0002): Höhe weg. */
export function onPlane(p: P3): P3 {
  return { x: p.x, y: 0, z: p.z };
}

/**
 * Die erlaubte Strecke: alle Stationen mit s ≤ reached + teaser, die letzte auf der Strecke dorthin interpoliert.
 * `path` muss nach `s` sortiert sein.
 */
export function scrollRegion(path: readonly PathStation[], reached: number, opts: ScrollRegionOptions): ScrollRegion {
  const limit = Math.max(0, reached) + Math.max(0, opts.teaser ?? TEASER);
  const points: P3[] = [];
  let prev: PathStation | null = null;
  for (const st of path) {
    if (st.s <= limit) {
      points.push(st.p);
      prev = st;
      continue;
    }
    if (prev && limit > prev.s + 1e-9) points.push(lerp(prev.p, st.p, (limit - prev.s) / (st.s - prev.s)));
    break;
  }
  if (points.length === 0 && path[0]) points.push(path[0].p);
  return { points, margin: opts.margin };
}

/** Nächster Punkt der Region zum Blickpunkt `focus`, Abstand und Überstand über den Rand. */
export function nearestInRegion(r: ScrollRegion, focus: P3): RegionHit {
  const pts = r.points;
  if (pts.length === 0) return { anchor: { ...focus }, distance: 0, excess: 0 };
  let best = pts[0]!;
  let bestD = dist(focus, best);
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i]!;
    const ab = sub(pts[i + 1]!, a);
    const len2 = dot(ab, ab);
    const t = len2 > 1e-12 ? Math.min(1, Math.max(0, dot(sub(focus, a), ab) / len2)) : 0;
    const q = lerp(a, pts[i + 1]!, t);
    const d = dist(focus, q);
    if (d < bestD) {
      bestD = d;
      best = q;
    }
  }
  return { anchor: { ...best }, distance: bestD, excess: Math.max(0, bestD - r.margin) };
}

/** Gummiband: Zugverstärkung bei `excess` Überstand, 1/(1 + e/soft)² — 1 am Rand, fällt monoton. */
export function rubber(excess: number, soft = RUBBER_SOFT): number {
  const k = 1 + Math.max(0, excess) / Math.max(1e-6, soft);
  return 1 / (k * k);
}
