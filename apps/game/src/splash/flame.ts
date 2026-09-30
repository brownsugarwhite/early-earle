/**
 * Die kleine Flamme im Logo: Florians Ruhepolygon (~64 Punkte je Zunge) wird verformt — Auslenkung ∝ (h/H)^1,5 aus
 * zweistufigem Wertrauschen (1,3 und 3,1 Hz, ±6 px), dazu ein Einrollen um die Basis ±14°·(h/H)². Die Basis bleibt
 * stehen (die große Zunge ist mit dem Bogen verschmolzen), gezeichnet wird in 12-fps-Stufen. Alle paar Sekunden steigt
 * eine Glut auf (pinke Raute, 50 px, schrumpft in drei Stufen). Alles deterministisch pro Seed und Zeit → spulbar.
 */
import type { Pt } from './longShadow';

export interface Tongue {
  /** Ruhepolygon (Bildraum). */
  rest: ReadonlyArray<Pt>;
  /** Unterkante (y), ab der die Zunge festgehalten wird. */
  baseY: number;
  /** Höhe über der Basis (Spitze). */
  height: number;
  /** Drehpunkt für Wachsen/Einrollen (Mitte der Basis). */
  pivot: Pt;
}

export const FLAME_FPS = 12;
const AMP = 6;
const CURL_DEG = 14;

/** Zungen aus den Ruhepolygonen: Basis = unterster Bereich, Spitze = höchster Punkt. */
export function makeTongue(rest: ReadonlyArray<Pt>, baseY?: number): Tongue {
  let minY = Infinity;
  let maxY = -Infinity;
  let sx = 0;
  let n = 0;
  for (const p of rest) {
    minY = Math.min(minY, p[1]);
    maxY = Math.max(maxY, p[1]);
  }
  const by = baseY ?? maxY;
  for (const p of rest) {
    if (p[1] >= by - 6) {
      sx += p[0];
      n++;
    }
  }
  return { rest, baseY: by, height: Math.max(1, by - minY), pivot: [n ? sx / n : rest[0]![0], by] };
}

function hash(i: number, seed: number): number {
  let h = (i * 374761393 + seed * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Glattes 1D-Wertrauschen in [−1, 1]. */
export function noise1(x: number, seed: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  const a = hash(i, seed) * 2 - 1;
  const b = hash(i + 1, seed) * 2 - 1;
  return a + (b - a) * u;
}

/** Zeit auf 12-fps-Stufen. */
export function flameStep(t: number): number {
  return Math.floor(t * FLAME_FPS + 1e-9) / FLAME_FPS;
}

/**
 * Verformte Zunge zur Zeit t (bereits gestuft übergeben oder hier stufen lassen). `grow` skaliert um die Basis
 * (Zünden: 0 → 1,25 → 1), `amp` dämpft das Flackern (0 = Ruhe).
 */
export function flameShape(tongue: Tongue, t: number, seed: number, grow = 1, amp = 1): Pt[] {
  const ts = flameStep(t);
  const { pivot, baseY, height } = tongue;
  const curl = ((CURL_DEG * Math.PI) / 180) * noise1(ts * 0.9, seed + 11) * amp;
  const out: Pt[] = [];
  for (const p of tongue.rest) {
    const hN = Math.max(0, Math.min(1, (baseY - p[1]) / height));
    const w = Math.pow(hN, 1.5);
    // Welle läuft die Zunge hinauf: Rauschen über Zeit minus Höhe
    const n = 0.65 * noise1(ts * 1.3 - hN * 1.7, seed) + 0.35 * noise1(ts * 3.1 - hN * 2.9, seed + 5);
    const m = 0.65 * noise1(ts * 1.3 - hN * 1.7 + 17.3, seed + 3) + 0.35 * noise1(ts * 3.1 - hN * 2.9 + 9.1, seed + 7);
    let x = p[0] + AMP * amp * w * n;
    let y = p[1] + AMP * 0.45 * amp * w * m;
    // Einrollen um die Basis ∝ (h/H)²
    const a = curl * hN * hN;
    if (a !== 0) {
      const dx = x - pivot[0];
      const dy = y - pivot[1];
      const c = Math.cos(a);
      const s = Math.sin(a);
      x = pivot[0] + dx * c - dy * s;
      y = pivot[1] + dx * s + dy * c;
    }
    // Wachsen aus der Basis
    if (grow !== 1) {
      x = pivot[0] + (x - pivot[0]) * grow;
      y = pivot[1] + (y - pivot[1]) * grow;
    }
    out.push([x, y]);
  }
  return out;
}

/** Glatter geschlossener Pfad durch die Punkte (Catmull-Rom → kubisch); Spitzen (Index in `corners`) bleiben spitz. */
export function smoothPath(pts: ReadonlyArray<Pt>, corners: ReadonlySet<number> = new Set()): string {
  const n = pts.length;
  if (n < 3) return '';
  const r = (v: number) => Math.round(v * 10) / 10;
  let d = `M${r(pts[0]![0])} ${r(pts[0]![1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]!;
    const p1 = pts[i]!;
    const p2 = pts[(i + 1) % n]!;
    const p3 = pts[(i + 2) % n]!;
    const k1 = corners.has(i) ? 0 : 1 / 6;
    const k2 = corners.has((i + 1) % n) ? 0 : 1 / 6;
    const c1x = p1[0] + (p2[0] - p0[0]) * k1;
    const c1y = p1[1] + (p2[1] - p0[1]) * k1;
    const c2x = p2[0] - (p3[0] - p1[0]) * k2;
    const c2y = p2[1] - (p3[1] - p1[1]) * k2;
    d += `C${r(c1x)} ${r(c1y)} ${r(c2x)} ${r(c2y)} ${r(p2[0])} ${r(p2[1])}`;
  }
  return d + 'Z';
}

/** Index der Spitze (höchster Punkt) — bleibt beim Glätten spitz. */
export function tipIndex(pts: ReadonlyArray<Pt>): number {
  let best = 0;
  for (let i = 1; i < pts.length; i++) if (pts[i]![1] < pts[best]![1]) best = i;
  return best;
}

export interface Ember {
  x: number;
  y: number;
  /** Halbe Diagonale der Raute. */
  size: number;
}

/**
 * Glut zur Zeit t (seit dem Zünden): alle 2–5 s eine Raute an der Spitze, steigt 50 px in 0,9 s, schrumpft in drei
 * Stufen. Deterministisch pro Seed.
 */
export function embers(t: number, tip: Pt, seed: number): Ember[] {
  const out: Ember[] = [];
  let at = 1.2 + hash(0, seed + 21) * 1.5;
  for (let k = 1; at <= t && k < 10000; k++) {
    const age = t - at;
    if (age < 0.9) {
      const stage = Math.min(2, Math.floor((age / 0.9) * 3));
      const drift = (hash(k, seed + 31) - 0.5) * 16;
      out.push({ x: tip[0] + drift * (age / 0.9), y: tip[1] - 6 - 50 * (age / 0.9), size: [4.2, 3, 1.8][stage]! });
    }
    at += 2 + 3 * hash(k, seed + 41);
  }
  return out;
}
