/**
 * REX's rig: 22 bones in one skeleton (one skinned draw call). Rest orientations are all identity, so a
 * part authored in bone-local coordinates lands in model space by adding the bone's rest position.
 * Model space: feet on y = 0, head top ≈ 1.0, facing +z, +x = REX's left.
 */
export type Vec3 = [number, number, number];

export const RexBone = {
  root: 0,
  hips: 1,
  chest: 2,
  neck: 3,
  head: 4,
  jaw: 5,
  armL1: 6,
  armL2: 7,
  armR1: 8,
  armR2: 9,
  legL: 10,
  footL: 11,
  legR: 12,
  footR: 13,
  tail0: 14,
  tail1: 15,
  tail2: 16,
  tail3: 17,
  halo: 18,
  sweat: 19,
  crestHead: 20,
  sparkle: 21,
} as const;
export type RexBoneId = (typeof RexBone)[keyof typeof RexBone];

export interface RexBoneDef {
  name: string;
  parent: number;
  /** Rest position in model space. */
  rest: Vec3;
}

/** Bone table in index order (parents always precede children). */
export const REX_BONES: readonly RexBoneDef[] = [
  { name: 'root', parent: -1, rest: [0, 0, 0] },
  { name: 'hips', parent: RexBone.root, rest: [0, 0.3, -0.02] },
  { name: 'chest', parent: RexBone.hips, rest: [0, 0.48, 0.03] },
  { name: 'neck', parent: RexBone.chest, rest: [0, 0.62, 0.07] },
  { name: 'head', parent: RexBone.neck, rest: [0, 0.73, 0.1] },
  { name: 'jaw', parent: RexBone.head, rest: [0, 0.71, 0.04] },
  { name: 'armL1', parent: RexBone.chest, rest: [0.15, 0.47, 0.13] },
  { name: 'armL2', parent: RexBone.armL1, rest: [0.19, 0.42, 0.19] },
  { name: 'armR1', parent: RexBone.chest, rest: [-0.15, 0.47, 0.13] },
  { name: 'armR2', parent: RexBone.armR1, rest: [-0.19, 0.42, 0.19] },
  { name: 'legL', parent: RexBone.hips, rest: [0.11, 0.22, 0.0] },
  { name: 'footL', parent: RexBone.legL, rest: [0.12, 0.06, 0.02] },
  { name: 'legR', parent: RexBone.hips, rest: [-0.11, 0.22, 0.0] },
  { name: 'footR', parent: RexBone.legR, rest: [-0.12, 0.06, 0.02] },
  { name: 'tail0', parent: RexBone.hips, rest: [0, 0.22, -0.13] },
  { name: 'tail1', parent: RexBone.tail0, rest: [0, 0.17, -0.28] },
  { name: 'tail2', parent: RexBone.tail1, rest: [0, 0.13, -0.41] },
  { name: 'tail3', parent: RexBone.tail2, rest: [0, 0.11, -0.52] },
  { name: 'halo', parent: RexBone.head, rest: [0, 1.1, 0.14] },
  { name: 'sweat', parent: RexBone.head, rest: [0.18, 0.9, 0.2] },
  { name: 'crestHead', parent: RexBone.head, rest: [0, 0.94, -0.02] },
  { name: 'sparkle', parent: RexBone.root, rest: [0, 0.62, 0.05] },
];

export const REX_BONE_COUNT = REX_BONES.length;

/** Rest position of a bone relative to its parent (identity rest rotations). */
export function boneLocalRest(i: number): Vec3 {
  const b = REX_BONES[i]!;
  if (b.parent < 0) return [...b.rest];
  const p = REX_BONES[b.parent]!.rest;
  return [b.rest[0] - p[0], b.rest[1] - p[1], b.rest[2] - p[2]];
}

/** Model-space point from a bone-local offset. */
export function atBone(i: number, local: Vec3): Vec3 {
  const r = REX_BONES[i]!.rest;
  return [r[0] + local[0], r[1] + local[1], r[2] + local[2]];
}
