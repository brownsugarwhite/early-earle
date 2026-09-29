/** Small statistics helpers for calibration. */

/** Wilson score interval for a binomial proportion (z = 1.96 → 95 %). */
export function wilson(wins: number, n: number, z = 1.96): [lo: number, hi: number] {
  if (n === 0) return [0, 1];
  const p = wins / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const centre = (p + z2 / (2 * n)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom;
  return [Math.max(0, centre - half), Math.min(1, centre + half)];
}

/** Half-width of the Wilson interval (the "± x" the calibration tool stops at). */
export function wilsonHalfWidth(wins: number, n: number, z = 1.96): number {
  const [lo, hi] = wilson(wins, n, z);
  return (hi - lo) / 2;
}

export function mean(xs: readonly number[]): number {
  if (xs.length === 0) return 0;
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
}
