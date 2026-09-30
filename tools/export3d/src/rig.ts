import { legLabel, sphereRolesOf, type CreatureSpec, type SphereRole, type SphereRoleInfo, type Vec3 } from '@ee/genome';

/**
 * The game's creature skeleton as a Blender armature: one deform bone per body sphere (bone head = sphere
 * centre — the game skins every vertex to up to four spheres, turning each about its own centre, which is
 * exactly linear blend skinning with bones there), chained like the game's chains (neck, trunk, snake
 * spine, tail), the lower jaw swinging about its hinge, legs as hip → knee → foot with an IK target per
 * foot (the game places the foot by the step cycle and solves the knee with two-bone IK). Names are
 * German with Blender's `.L`/`.R` mirror suffixes (`Fuß.vorn.L`, `Hals.02`, `Rüssel.03`).
 *
 * Coordinates: game body space (+y up, +z forward, +x = the animal's left), blob units.
 */

export type SphereInfo = SphereRoleInfo;

export interface BoneInfo {
  name: string;
  parent: string | null;
  head: Vec3;
  tail: Vec3;
  /** Deforms the body mesh (vertex group = this bone) — sphere bones and the jaw lever. */
  deform: boolean;
  /** Sphere index the bone skins (−1 = helper bone). */
  sphere: number;
  /** Bone collection (Blender armature layer) name. */
  collection: string;
  /** Connected to the parent's tail. */
  connect: boolean;
  /** IK constraint: target bone and chain length. */
  ik?: { target: string; chain: number } | undefined;
  role: string;
}

export interface CreatureRig {
  spheres: SphereInfo[];
  bones: BoneInfo[];
  /** Bone name per sphere index (the vertex group of that sphere). */
  sphereBone: string[];
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const len = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);
const norm = (a: Vec3): Vec3 => {
  const l = len(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const FORWARD: Vec3 = [0, 0, 1];

/** Armature of a creature (bones in game body space) from its sphere roles and skeleton. */
export function rigFor(spec: Pick<CreatureSpec, 'body' | 'skeleton' | 'bodyType'>): CreatureRig {
  const spheres = sphereRolesOf({ spheres: spec.body.spheres, skeleton: spec.skeleton, bodyType: spec.bodyType });
  const sk = spec.skeleton;
  const bones: BoneInfo[] = [];
  const sphereBone = spheres.map((s) => s.name);
  const byRole = (r: SphereRole): SphereInfo[] => spheres.filter((s) => s.role === r).sort((a, b) => a.chain - b.chain);
  const ground = -sk.restLift;
  const size = Math.max(0.6, Math.min(2, sk.length * 0.25));
  const push = (b: BoneInfo): BoneInfo => {
    bones.push(b);
    return b;
  };
  const tailFrom = (center: Vec3, dir: Vec3, r: number): Vec3 => add(center, scale(norm(dir), Math.max(0.08, r * 0.7)));

  push({ name: 'Wurzel', parent: null, head: [0, ground, 0], tail: [0, ground, size], deform: false, sphere: -1, collection: 'Wurzel', connect: false, role: 'root' });

  const core = byRole('core')[0] ?? byRole('head')[0] ?? spheres[0]!;
  const snake = byRole('spine').length > 0;
  const head = byRole('head')[0];
  const sphereBoneAt = (i: number): string => sphereBone[i] ?? 'Wurzel';

  // Core body bone (the snake's head is its core: the spine chain leads from it).
  if (!snake || core !== head) {
    const toward = head && head !== core ? sub(head.center, core.center) : FORWARD;
    push({ name: core.name, parent: 'Wurzel', head: core.center, tail: tailFrom(core.center, [toward[0] * 0.2, 0, Math.sign(toward[2] || 1)], core.r), deform: true, sphere: core.index, collection: 'Körper', connect: false, role: 'core' });
  }

  // --- snake: head leads, the spine chain follows head → tail ------------------------------------------
  if (snake && head) {
    const chainS = byRole('spine');
    const next = chainS[0];
    push({ name: head.name, parent: 'Wurzel', head: head.center, tail: next ? next.center : tailFrom(head.center, [0, 0, -1], head.r), deform: true, sphere: head.index, collection: 'Wirbelsäule', connect: false, role: 'head' });
    chainS.forEach((s, k) => {
      const nx = chainS[k + 1];
      const prev = k === 0 ? head : chainS[k - 1]!;
      push({ name: s.name, parent: k === 0 ? head.name : chainS[k - 1]!.name, head: s.center, tail: nx ? nx.center : tailFrom(s.center, sub(s.center, prev.center), s.r), deform: true, sphere: s.index, collection: 'Wirbelsäule', connect: true, role: 'spine' });
    });
  }

  // --- rump and other body spheres --------------------------------------------------------------------
  const coreName = snake && head ? head.name : core.name;
  for (const s of spheres) {
    if (s === core || bones.some((b) => b.sphere === s.index)) continue;
    if (s.role === 'rump' || s.role === 'body' || s.role === 'lobe') {
      push({ name: s.name, parent: coreName, head: s.center, tail: tailFrom(s.center, sub(s.center, core.center), s.r), deform: true, sphere: s.index, collection: 'Körper', connect: false, role: s.role });
    }
  }
  // Tail chain behind the rump.
  const tails = byRole('tail');
  const rumpName = byRole('rump')[0]?.name ?? coreName;
  tails.forEach((s, k) => {
    const nx = tails[k + 1];
    const prevCenter = k === 0 ? (byRole('rump')[0]?.center ?? core.center) : tails[k - 1]!.center;
    push({ name: s.name, parent: k === 0 ? rumpName : tails[k - 1]!.name, head: s.center, tail: nx ? nx.center : tailFrom(s.center, sub(s.center, prevCenter), s.r), deform: true, sphere: s.index, collection: 'Schwanz', connect: k > 0, role: 'tail' });
  });

  // --- neck chain and head --------------------------------------------------------------------------
  if (!snake && head && head !== core) {
    const necks = byRole('neck');
    const base: Vec3 = sk.neckChain ? [sk.neckChain.base[0], sk.neckChain.base[1], sk.neckChain.base[2]] : core.center;
    const first = necks[0] ?? head;
    push({ name: 'Halsansatz', parent: coreName, head: base, tail: len(sub(first.center, base)) > 0.05 ? first.center : add(base, [0, 0.1, 0.1]), deform: false, sphere: -1, collection: 'Hals', connect: false, role: 'neckBase' });
    necks.forEach((s, k) => {
      const nx = necks[k + 1] ?? head;
      push({ name: s.name, parent: k === 0 ? 'Halsansatz' : necks[k - 1]!.name, head: s.center, tail: nx.center, deform: true, sphere: s.index, collection: 'Hals', connect: true, role: 'neck' });
    });
    const faceSpheres = byRole('face');
    const faceMean = faceSpheres.length > 0 ? scale(faceSpheres.reduce((acc, f) => add(acc, f.center), [0, 0, 0] as Vec3), 1 / faceSpheres.length) : add(head.center, FORWARD);
    push({ name: head.name, parent: necks.length > 0 ? necks[necks.length - 1]!.name : 'Halsansatz', head: head.center, tail: tailFrom(head.center, sub(faceMean, head.center), head.r), deform: true, sphere: head.index, collection: 'Kopf', connect: true, role: 'head' });
  }
  const headName = head ? head.name : coreName;
  // Face spheres (snout, cheeks) ride rigidly on the head.
  for (const s of byRole('face')) {
    if (bones.some((b) => b.sphere === s.index)) continue;
    const from = head ? head.center : core.center;
    push({ name: s.name, parent: headName, head: s.center, tail: tailFrom(s.center, sub(s.center, from), s.r), deform: true, sphere: s.index, collection: 'Kopf', connect: false, role: 'face' });
  }
  // Lower jaw: swings about the mouth hinge (the game's lever): bone head at the hinge.
  for (const s of byRole('jaw')) {
    const hinge: Vec3 = [sk.mouth.hinge[0], sk.mouth.hinge[1], sk.mouth.hinge[2]];
    const lever = len(sub(s.center, hinge)) > 0.05;
    push({ name: s.name, parent: headName, head: lever ? hinge : s.center, tail: lever ? s.center : tailFrom(s.center, FORWARD, s.r), deform: true, sphere: s.index, collection: 'Kopf', connect: false, role: 'jaw' });
  }
  // Trunk chain from its root.
  const trunks = byRole('trunk');
  trunks.forEach((s, k) => {
    const nx = trunks[k + 1];
    const prevCenter = k === 0 ? (sk.trunk ? ([sk.trunk.root[0], sk.trunk.root[1], sk.trunk.root[2]] as Vec3) : head?.center ?? core.center) : trunks[k - 1]!.center;
    push({ name: s.name, parent: k === 0 ? headName : trunks[k - 1]!.name, head: s.center, tail: nx ? nx.center : tailFrom(s.center, sub(s.center, prevCenter), s.r), deform: true, sphere: s.index, collection: 'Rüssel', connect: k > 0, role: 'trunk' });
  });

  // --- legs: hip → knee → foot, IK target per foot ----------------------------------------------------
  for (const l of sk.legs) {
    const ln = legLabel(l.role);
    const foot = spheres[l.footSphere];
    if (!foot) continue;
    const knee = l.kneeSphere >= 0 ? spheres[l.kneeSphere] : undefined;
    const structural = sk.structural.find((s) => s.role === l.role);
    const parent = structural && structural.anchor >= 0 ? sphereBoneAt(structural.anchor) : coreName;
    const hipName = `Hüfte.${ln}`;
    const hipTail = knee ? knee.center : foot.center;
    push({ name: hipName, parent, head: [l.hip[0], l.hip[1], l.hip[2]], tail: hipTail, deform: false, sphere: -1, collection: 'Beine', connect: false, role: 'hip', ik: knee ? undefined : { target: `IK-Fuß.${ln}`, chain: 1 } });
    if (knee) push({ name: knee.name, parent: hipName, head: knee.center, tail: foot.center, deform: true, sphere: knee.index, collection: 'Beine', connect: true, role: 'knee', ik: { target: `IK-Fuß.${ln}`, chain: 2 } });
    const fwd: Vec3 = [0, 0, Math.max(0.12, foot.r)];
    push({ name: foot.name, parent: knee ? knee.name : hipName, head: foot.center, tail: add(foot.center, fwd), deform: true, sphere: foot.index, collection: 'Beine', connect: true, role: 'foot' });
    push({ name: `IK-Fuß.${ln}`, parent: 'Wurzel', head: foot.center, tail: add(foot.center, scale(fwd, 1.3)), deform: false, sphere: -1, collection: 'IK', connect: false, role: 'ik' });
  }

  // Any sphere still without a bone hangs off the core (robustness for new skeleton features).
  for (const s of spheres) {
    if (bones.some((b) => b.sphere === s.index)) continue;
    push({ name: s.name, parent: coreName, head: s.center, tail: tailFrom(s.center, sub(s.center, core.center), s.r), deform: true, sphere: s.index, collection: 'Körper', connect: false, role: s.role });
  }
  // Bones must have length (Blender drops zero-length bones).
  for (const b of bones) if (len(sub(b.tail, b.head)) < 0.02) b.tail = add(b.head, [0, 0.08, 0]);
  return { spheres, bones, sphereBone };
}
