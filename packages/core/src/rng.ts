/**
 * Deterministic random numbers for the rules engine.
 *
 * All functions are pure: they take a 32-bit state and return the drawn value
 * together with the next state. The game stores the state in `LevelState`, so a
 * snapshot fully determines every future spawn (rewind never re-rolls).
 *
 * The solver never calls these functions; it enumerates chance nodes instead.
 */

/** Advances a mulberry32 state by one step (no output). */
export function mulberry32Next(state: number): number {
  return (state + 0x6d2b79f5) | 0;
}

/** Output of mulberry32 for a state that has already been advanced. */
export function mulberry32Value(advanced: number): number {
  let t = advanced;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return (t ^ (t >>> 14)) >>> 0;
}

/**
 * mulberry32 as a pure function: `(state) => [u32, nextState]`.
 * The returned u32 is uniform in [0, 2^32).
 */
export function mulberry32(state: number): [u32: number, nextState: number] {
  const next = mulberry32Next(state | 0);
  return [mulberry32Value(next), next];
}

/** Uniform float in [0, 1). */
export function randFloat(state: number): [value: number, nextState: number] {
  const [u, next] = mulberry32(state);
  return [u / 4294967296, next];
}

/** Uniform integer in [0, n). `n` must be >= 1. */
export function randInt(state: number, n: number): [value: number, nextState: number] {
  if (n <= 1) return [0, mulberry32Next(state | 0)];
  const [u, next] = mulberry32(state);
  // Multiply-shift is unbiased enough for game purposes (n << 2^32).
  return [Math.floor((u / 4294967296) * n), next];
}

/**
 * Picks an index proportional to `weights` (all >= 0, sum > 0).
 * Returns the index and the next state.
 */
export function pickWeighted(
  state: number,
  weights: readonly number[],
): [index: number, nextState: number] {
  let total = 0;
  for (const w of weights) total += w;
  const [u, next] = randFloat(state);
  let r = u * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i]!;
    if (r < 0) return [i, next];
  }
  return [weights.length - 1, next];
}

/**
 * FNV-1a (32-bit) over the string forms of all parts, separated by NUL.
 * Used for `seed = hash32(levelId, attempt)` and for generator seeds.
 * Always returns a non-zero unsigned 32-bit integer.
 */
export function hash32(...parts: readonly (string | number)[]): number {
  let h = 0x811c9dc5;
  for (let p = 0; p < parts.length; p++) {
    const s = String(parts[p]);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    h ^= 0;
    h = Math.imul(h, 0x01000193);
  }
  h >>>= 0;
  return h === 0 ? 0x9e3779b9 : h;
}
