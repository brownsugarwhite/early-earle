export type Vec3 = [number, number, number];

/** What the renderer consumes per blob: a volume-preserving squash plus a translation of the body. */
export interface SquashState {
  /** Unit axis of the squash/stretch (blob-local = world, blobs do not rotate). */
  axis: Vec3;
  /** Elongation along the axis: +0.3 = 30 % longer (and thinner), -0.3 = flattened. */
  amount: number;
  /** Body translation from the rest position (world units). */
  offset: Vec3;
}

/** Per-blob tuning; viscosity 0 = wobbly jelly, 1 = thick and heavily damped. */
export interface BlobPhysicsConfig {
  viscosity: number;
}

/**
 * Common interface of all squash drivers (SpringJiggle, ShapeMatching, later Rapier).
 * Ids are opaque integers; unknown ids are created lazily with default config.
 */
export interface SquashDriver {
  impulse(id: number, dir: Vec3, strength: number): void;
  step(dt: number): void;
  get(id: number): SquashState;
  configure(id: number, config: Partial<BlobPhysicsConfig>): void;
  /** Resets a blob to rest (e.g. after a merge replaced it). */
  reset(id: number): void;
  remove(id: number): void;
}

export const REST_STATE: Readonly<SquashState> = { axis: [0, 1, 0], amount: 0, offset: [0, 0, 0] };
