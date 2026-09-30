import type { CreatureSpec } from '../creature';
import { ZONE_KEYS } from '../rules';
import type { Vec3 } from '../types';
import { sphereRolesOf } from './roles';
import type { CustomCreatureInput, CustomPart } from './schema';

const r4 = (x: number): number => Math.round(x * 1e4) / 1e4;
const v4 = (v: readonly number[]): [number, number, number] => [r4(v[0]!), r4(v[1]!), r4(v[2]!)];

/**
 * A resolved creature in the custom format: the spheres with their roles and names, the legs' hips, the
 * neck/trunk/mouth parameters and every module part as an explicit socket. `buildCustomCreature` turns
 * it back into the same creature — the Blender library stores this on every creature, so any library
 * animal can be the starting point of an own one.
 */
export function customFromSpec(spec: CreatureSpec, meta: { id: string; name: string }): CustomCreatureInput {
  const sk = spec.skeleton;
  const roles = sphereRolesOf({ spheres: spec.body.spheres, skeleton: sk, bodyType: spec.bodyType });
  const nameOf = (i: number): string | undefined => (i >= 0 ? roles[i]?.name : undefined);
  const core = roles.find((r) => r.role === 'core') ?? roles.find((r) => r.role === 'head') ?? roles[0]!;
  const parts: CustomPart[] = spec.parts
    .filter((p) => !p.sdf)
    .map((p) => {
      const part: CustomPart = {
        slot: p.slot,
        asset: p.asset,
        anchor: nameOf(p.anchor) ?? core.name,
        theta: r4(p.theta),
        phi: r4(p.phi),
        mirror: p.mirror,
        tilt: r4(p.tilt),
        roll: r4(p.roll),
        sink: r4(p.sink),
        scale: r4(p.scale),
        ref: p.ref,
      };
      if (p.tint) part.tint = p.tint;
      return part;
    });
  const zone = (ZONE_KEYS as readonly string[]).includes(spec.zone) ? spec.zone : 'tjorizo';
  const out: CustomCreatureInput = {
    schemaVersion: 1,
    id: meta.id,
    name: meta.name,
    base: spec.species,
    zone,
    tier: Math.min(12, Math.max(1, spec.tier)),
    seed: typeof spec.genome.seed === 'number' ? Math.round(spec.genome.seed) : 7,
    material: spec.material,
    colors: { base: spec.palette.baseColor, inner: spec.palette.innerColor, rim: spec.palette.rimColor, accent: spec.constants.accent },
    skin: { coat: spec.skin.coat, pattern: spec.skin.pattern, patternScale: r4(spec.skin.patternScale), patternRotation: r4(spec.skin.patternRotation) },
    sminK: r4(spec.body.sminK),
    restLift: r4(sk.restLift),
    size: 1,
    spheres: roles.map((r) => {
      const s: CustomCreatureInput['spheres'][number] = { name: r.name, role: r.role, center: v4(r.center), r: r4(r.r) };
      if (r.chain >= 0) s.chain = r.chain;
      if (r.leg) s.leg = r.leg;
      return s;
    }),
    legs: sk.legs.map((l) => ({ leg: l.role, hip: v4(l.hip), bend: l.bend })),
    parts,
  };
  if (spec.bodyType === 'blob' && spec.body.floorY !== undefined && spec.body.floorY > -10) out.floorY = r4(spec.body.floorY);
  if (sk.neckChain && spec.bodyType !== 'blob') out.neck = { base: v4(sk.neckChain.base), maxBend: r4(sk.neckChain.maxBend) };
  if (sk.trunk) out.trunk = { root: v4(sk.trunk.root) };
  const mouthAnchor = nameOf(sk.mouth.anchor);
  if (mouthAnchor) {
    const m: NonNullable<CustomCreatureInput['mouth']> = { anchor: mouthAnchor, dir: v4(sk.mouth.dir), width: r4(sk.mouth.width), open: r4(sk.mouth.open) };
    if (sk.mouth.jaw.length > 0) m.hinge = v4(sk.mouth.hinge as Vec3);
    out.mouth = m;
  }
  return out;
}
