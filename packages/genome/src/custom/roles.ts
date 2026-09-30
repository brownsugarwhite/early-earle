import type { BodySkeleton, LegRole } from '../body';
import type { BodyType, SpherePrim, Vec3 } from '../types';
import type { SphereRole } from './schema';

/**
 * Roles and German names of a body's spheres, read off the game skeleton (anchors, chains, legs, jaw):
 * the naming the Blender library uses for bones, vertex groups and sphere empties ("Kopf", "Hals.02",
 * "Rüssel.01", "Fuß.vorn.L") and the roles the custom-creature format stores. Legs: FL/FR/BL/BR →
 * vorn.L/vorn.R/hinten.L/hinten.R, L/R stay (the animal's left = +x = Blender's `.L`).
 */
export interface SphereRoleInfo {
  index: number;
  name: string;
  role: SphereRole;
  /** Order within its chain (neck, trunk, tail, spine); −1 otherwise. */
  chain: number;
  leg: LegRole | null;
  center: Vec3;
  r: number;
}

const LEG_NAME: Readonly<Record<LegRole, string>> = { FL: 'vorn.L', FR: 'vorn.R', BL: 'hinten.L', BR: 'hinten.R', L: 'L', R: 'R' };

/** German leg suffix of a leg role ("vorn.L", "hinten.R", "L"). */
export function legLabel(role: LegRole): string {
  return LEG_NAME[role];
}

const pad2 = (i: number): string => String(i + 1).padStart(2, '0');
const side = (x: number): string => (x > 0.12 ? '.L' : x < -0.12 ? '.R' : '');

export function sphereRolesOf(input: { spheres: readonly SpherePrim[]; skeleton: BodySkeleton; bodyType: BodyType }): SphereRoleInfo[] {
  const spheres = input.spheres;
  const sk = input.skeleton;
  const n = spheres.length;
  const role: (SphereRole | null)[] = new Array<SphereRole | null>(n).fill(null);
  const chain = new Array<number>(n).fill(-1);
  const leg: (LegRole | null)[] = new Array<LegRole | null>(n).fill(null);
  const set = (i: number, r: SphereRole, c = -1, l: LegRole | null = null): void => {
    if (i < 0 || i >= n || role[i] !== null) return;
    role[i] = r;
    chain[i] = c;
    leg[i] = l;
  };
  for (const l of sk.legs) {
    set(l.footSphere, 'foot', -1, l.role);
    set(l.kneeSphere, 'knee', -1, l.role);
  }
  if (sk.spine) {
    const spine = sk.spineArc ?? sk.spine;
    const order: number[] = [];
    for (let i = 0; i < n; i++) if ((spine[i] ?? -1) >= 0) order.push(i);
    order.sort((a, b) => spine[a]! - spine[b]!);
    // The first spine sphere is the head (it leads); the others are the chain head → tail.
    order.forEach((i, k) => (k === 0 ? set(i, 'head') : set(i, 'spine', k - 1)));
    for (let i = 0; i < n; i++) if ((spine[i] ?? 0) < 0) set(i, 'face');
  }
  for (const i of sk.mouth.jaw) set(i, 'jaw');
  if (sk.trunk) sk.trunk.spheres.forEach((i, k) => set(i, 'trunk', k));
  if (sk.neckChain) [...sk.neckChain.spheres].sort((a, b) => spheres[a]!.center[2] - spheres[b]!.center[2]).forEach((i, k) => set(i, 'neck', k));
  if (sk.headSphere >= 0) set(sk.headSphere, 'head');
  if (sk.anchors.head >= 0 && input.bodyType !== 'blob') set(sk.anchors.head, 'head');
  if (sk.neckChain) for (const i of sk.neckChain.head) set(i, 'face');
  if (input.bodyType === 'blob') {
    set(0, 'core');
    for (let i = 1; i < n; i++) set(i, i === 1 ? 'body' : 'lobe');
  }
  if (sk.anchors.core >= 0) set(sk.anchors.core, 'core');
  if (sk.anchors.rump >= 0) set(sk.anchors.rump, 'rump');
  // Tail spheres: behind the rump on the midline (REX, duck) — body-fixed in the game.
  const rump = sk.anchors.rump >= 0 ? spheres[sk.anchors.rump] : undefined;
  if (rump) {
    spheres
      .map((s, i) => ({ s, i }))
      .filter(({ s, i }) => role[i] === null && Math.abs(s.center[0]) < 0.12 && s.center[2] < rump.center[2] - 0.05)
      .sort((a, b) => b.s.center[2] - a.s.center[2])
      .forEach(({ i }, k) => set(i, 'tail', k));
  }
  if (!role.includes('core') && !role.includes('head') && n > 0) set(0, 'core');
  for (let i = 0; i < n; i++) set(i, 'body');

  const used = new Map<string, number>();
  const unique = (base: string): string => {
    const k = used.get(base) ?? 0;
    used.set(base, k + 1);
    return k === 0 ? base : `${base}.${pad2(k)}`;
  };
  let faceMid = 0;
  let lobes = 0;
  let bodies = 0;
  const out: SphereRoleInfo[] = [];
  for (let i = 0; i < n; i++) {
    const s = spheres[i]!;
    const r = role[i]!;
    let name: string;
    switch (r) {
      case 'core':
        name = 'Körper';
        break;
      case 'rump':
        name = 'Hinterteil';
        break;
      case 'head':
        name = 'Kopf';
        break;
      case 'jaw':
        name = 'Unterkiefer';
        break;
      case 'neck':
        name = `Hals.${pad2(chain[i]!)}`;
        break;
      case 'trunk':
        name = `Rüssel.${pad2(chain[i]!)}`;
        break;
      case 'spine':
        name = `Wirbel.${pad2(chain[i]!)}`;
        break;
      case 'tail':
        name = `Schwanz.${pad2(chain[i]!)}`;
        break;
      case 'knee':
        name = `Knie.${legLabel(leg[i]!)}`;
        break;
      case 'foot':
        name = `Fuß.${legLabel(leg[i]!)}`;
        break;
      case 'face': {
        const sd = side(s.center[0]);
        if (sd) name = `Backe${sd}`;
        else {
          name = faceMid === 0 ? 'Schnauze' : `Schnauze.${pad2(faceMid)}`;
          faceMid++;
        }
        break;
      }
      case 'lobe':
        name = `Lappen.${pad2(lobes++)}`;
        break;
      default: {
        if (input.bodyType === 'blob' && i === 1) name = 'Basis';
        else {
          const sd = side(s.center[0]);
          name = sd ? `Flanke${sd}` : `Rumpf.${pad2(bodies++)}`;
        }
      }
    }
    out.push({ index: i, name: unique(name), role: r, chain: chain[i]!, leg: leg[i]!, center: [s.center[0], s.center[1], s.center[2]], r: s.r });
  }
  return out;
}
