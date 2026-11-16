// Werkzeuge für Clips: Kurven (Easing), Spuren mit Schlüsseln, kleine Rechenhilfen.
import type { Pose, PoseTeil } from './pose';

export type Kurve = 'gerade' | 'ein' | 'aus' | 'einaus' | 'feder' | 'halt' | 'plumps' | 'sanft';

export function kurve(art: Kurve, t: number): number {
  const x = Math.min(1, Math.max(0, t));
  switch (art) {
    case 'gerade':
      return x;
    case 'ein':
      return x * x * x;
    case 'aus':
      return 1 - (1 - x) ** 3;
    case 'einaus':
      return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
    case 'sanft':
      return x * x * (3 - 2 * x);
    case 'feder': {
      // leichtes Überschwingen (wie die Feder des Designsystems)
      const c = 1.70158 * 1.15;
      return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2;
    }
    case 'plumps': {
      // fällt und federt einmal kurz nach (Aufsetzen)
      if (x < 0.72) return (x / 0.72) ** 2;
      const u = (x - 0.72) / 0.28;
      return 1 - Math.sin(u * Math.PI) * 0.12 * (1 - u);
    }
    case 'halt':
      return x < 1 ? 0 : 1;
  }
}

/** Schlüssel einer Spur: [Zeit, Wert, Kurve hinein] */
export type Schl = [number, number, Kurve?];
export type Spuren = Partial<Record<keyof Pose, Schl[]>>;

/** Wert einer Spur zur Zeit t */
export function spurWert(s: Schl[], t: number): number {
  if (t <= s[0]![0]) return s[0]![1];
  for (let i = 1; i < s.length; i++) {
    const [t1, v1, k] = s[i]!;
    if (t <= t1) {
      const [t0, v0] = s[i - 1]!;
      const u = t1 > t0 ? (t - t0) / (t1 - t0) : 1;
      return v0 + (v1 - v0) * kurve(k ?? 'einaus', u);
    }
  }
  return s[s.length - 1]![1];
}

/** Alle Spuren zur Zeit t in eine Pose schreiben */
export function spurenAnwenden(sp: Spuren, t: number, p: Pose): void {
  for (const k of Object.keys(sp) as (keyof Pose)[]) p[k] = spurWert(sp[k]!, t);
}

/** Länge der Spuren (letzter Schlüssel) */
export function spurenDauer(sp: Spuren): number {
  let d = 0;
  for (const s of Object.values(sp)) if (s && s.length) d = Math.max(d, s[s.length - 1]![0]);
  return d;
}

export const sin = Math.sin;
export const cos = Math.cos;
export const TAU = Math.PI * 2;
export const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
/** weicher Puls 0→1→0 über [a, b] */
export function puls(t: number, a: number, b: number): number {
  if (t <= a || t >= b) return 0;
  return Math.sin(((t - a) / (b - a)) * Math.PI);
}
/** glatter Übergang 0→1 über [a, b] */
export function stufe(t: number, a: number, b: number): number {
  const x = clamp((t - a) / (b - a), 0, 1);
  return x * x * (3 - 2 * x);
}
/** gedämpfte Schwingung nach einem Stoß zur Zeit t0 */
export function nachschwingen(t: number, t0: number, frequenz: number, abkling: number): number {
  if (t < t0) return 0;
  const u = t - t0;
  return Math.sin(u * frequenz * TAU) * Math.exp(-u * abkling);
}
/** pseudo-zufällig, aber fest (für Zuckungen im Stehen) */
export function rausch(t: number, saat: number): number {
  const x = Math.sin(t * 1.31 + saat * 12.9898) * 0.5 + Math.sin(t * 0.73 + saat * 78.233) * 0.35 + Math.sin(t * 2.17 + saat * 3.7) * 0.15;
  return x;
}

export type PoseFn = (t: number, p: Pose) => void;
export type { PoseTeil };
