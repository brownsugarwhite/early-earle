import type { AnchorId, BodySkeleton, LegRole, MouthDef, NeckChain, SkeletonLeg, StructuralSocket, TrunkChain } from '../body';
import { mixHex, shiftHex } from '../color';
import { SDF_LEG_ASSET, faceCapFor, resolveCreature, type CreatureGenome, type CreatureSpec, type PartSpec } from '../creature';
import type { GenomeRules, SlotId, TintSource } from '../rules';
import { SPECIES_BODY, type BlobParams, type SpherePrim, type Vec3 } from '../types';
import type { CustomCreature, CustomSphere, LegId, SphereRole } from './schema';

/**
 * Custom creature → `CreatureSpec`: the base species is resolved as usual (gait, motion traits, palette,
 * skin, personality, world scale), then its body, skeleton and parts are replaced by the custom ones.
 * Everything downstream (mesh path, raymarcher, rig, locomotion, merges) treats it like any species.
 */
export interface CustomBuild {
  spec: CreatureSpec;
  /** Non-fatal findings (unknown modules, parts on missing slots …) — shown in the lab. */
  warnings: string[];
}

const norm = (v: Vec3): Vec3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/** Genome of the base species a custom creature starts from (lab, merges). */
export function customCreatureGenome(def: CustomCreature, opts: { zone?: CustomCreature['zone']; tier?: number } = {}): CreatureGenome {
  const g: CreatureGenome = { zone: opts.zone ?? def.zone, tier: opts.tier ?? def.tier, seed: def.seed, species: def.base, legs: 'sdf' };
  if (def.material) g.material = def.material;
  return g;
}

function defaultBend(leg: LegId): 1 | -1 {
  return leg === 'BL' || leg === 'BR' ? -1 : 1;
}

export function buildCustomCreature(def: CustomCreature, rules: GenomeRules, opts: { zone?: CustomCreature['zone']; tier?: number } = {}): CustomBuild {
  const warnings: string[] = [];
  const genome = customCreatureGenome(def, opts);
  const tpl = resolveCreature(genome, rules);
  const bodyType = SPECIES_BODY[def.base];
  const spheres: SpherePrim[] = def.spheres.map((s) => ({ center: [s.center[0], s.center[1], s.center[2]] as Vec3, r: s.r }));
  const index = new Map<string, number>(def.spheres.map((s, i) => [s.name, i]));
  const ofRole = (role: SphereRole): Array<{ s: CustomSphere; i: number }> =>
    def.spheres
      .map((s, i) => ({ s, i }))
      .filter((e) => e.s.role === role)
      .sort((a, b) => (a.s.chain ?? a.i) - (b.s.chain ?? b.i));

  const head = ofRole('head')[0]?.i ?? -1;
  const core = ofRole('core')[0]?.i ?? (head >= 0 ? head : 0);
  const rump = ofRole('rump')[0]?.i ?? -1;
  const jaws = ofRole('jaw').map((e) => e.i);
  const faces = ofRole('face').map((e) => e.i);
  const necks = ofRole('neck').map((e) => e.i);
  const trunks = ofRole('trunk').map((e) => e.i);
  const tails = ofRole('tail').map((e) => e.i);
  const spineOrder = ofRole('spine').map((e) => e.i);

  // Ground: the lowest point of the body (feet) touches y = −restLift.
  let lowest = Infinity;
  for (const s of spheres) lowest = Math.min(lowest, s.center[1] - s.r);
  const restLift = def.restLift ?? (bodyType === 'blob' && def.floorY !== undefined ? -def.floorY : -lowest);

  // --- legs: foot (+ knee) spheres per hip ------------------------------------------------------------
  const legs: SkeletonLeg[] = [];
  const structural: StructuralSocket[] = [];
  const torso = def.spheres.map((s, i) => ({ s, i })).filter((e) => e.s.role === 'core' || e.s.role === 'rump' || e.s.role === 'body');
  for (const l of def.legs) {
    const foot = def.spheres.findIndex((s) => s.role === 'foot' && s.leg === l.leg);
    const knee = def.spheres.findIndex((s) => s.role === 'knee' && s.leg === l.leg);
    if (foot < 0) continue;
    const bend = l.bend ?? defaultBend(l.leg);
    const fs = spheres[foot]!;
    const hip: Vec3 = [l.hip[0], l.hip[1], l.hip[2]];
    legs.push({ role: l.leg as LegRole, hip, foot: [fs.center[0], -restLift, fs.center[2]], length: (hip[1] + restLift) / 0.9, footSphere: foot, kneeSphere: knee, footR: fs.r, kneeR: knee >= 0 ? spheres[knee]!.r : 0, bend });
    // Hip socket (module legs, step-cycle roles): from the nearest torso sphere toward the hip.
    let anchor = core;
    let best = Infinity;
    for (const t of torso) {
      const d = Math.hypot(hip[0] - t.s.center[0], hip[1] - t.s.center[1], hip[2] - t.s.center[2]) - t.s.r;
      if (d < best) {
        best = d;
        anchor = t.i;
      }
    }
    const a = spheres[anchor]!;
    const d = norm(sub(hip, a.center));
    structural.push({ slot: 'leg', role: l.leg as LegRole, anchor, theta: Math.atan2(d[0], d[2]), phi: Math.asin(clamp(d[1], -1, 1)), mirror: hip[0] >= 0 ? 1 : -1, ref: 'up', tilt: 0, roll: 0, sink: 0.06, knee: bend });
  }

  // --- chains ------------------------------------------------------------------------------------------
  let spine: number[] | null = null;
  let spineArc: number[] | null = null;
  if (spineOrder.length > 0 && head >= 0) {
    const order = [head, ...spineOrder];
    spine = new Array<number>(spheres.length).fill(-0.08);
    spineArc = new Array<number>(spheres.length).fill(-1);
    let acc = 0;
    order.forEach((i, k) => {
      if (k > 0) acc += Math.hypot(...sub(spheres[i]!.center, spheres[order[k - 1]!]!.center));
      spine![i] = order.length > 1 ? k / (order.length - 1) : 0;
      spineArc![i] = acc;
    });
  }
  let neckChain: NeckChain | null = null;
  if (head >= 0 && !spine) {
    const hs = spheres[head]!;
    const first = necks.length > 0 ? spheres[necks[0]!]! : hs;
    const c = spheres[core]!;
    const base: Vec3 = def.neck ? [def.neck.base[0], def.neck.base[1], def.neck.base[2]] : [0, (c.center[1] + first.center[1]) / 2, c.center[2] + (first.center[2] - c.center[2]) * 0.5];
    const length = Math.max(0.1, hs.center[2] - base[2]);
    const headGroup = [head, ...faces, ...jaws, ...trunks].filter((v, k, arr) => arr.indexOf(v) === k);
    neckChain = {
      base,
      spheres: necks,
      arc: necks.map((i) => clamp((spheres[i]!.center[2] - base[2]) / length, 0, 1)),
      head: headGroup,
      length,
      maxBend: def.neck?.maxBend ?? tpl.skeleton.neckChain?.maxBend ?? 0.6,
    };
  }
  let trunk: TrunkChain | null = null;
  if (trunks.length > 0) {
    const t0 = spheres[trunks[0]!]!.center;
    const from = head >= 0 ? spheres[head]!.center : spheres[core]!.center;
    const root: Vec3 = def.trunk ? [def.trunk.root[0], def.trunk.root[1], def.trunk.root[2]] : [(t0[0] + from[0]) / 2, (t0[1] + from[1]) / 2, (t0[2] + from[2]) / 2];
    trunk = { spheres: trunks, root };
  }

  // --- mouth ---------------------------------------------------------------------------------------------
  let mouth: MouthDef;
  if (def.mouth) {
    const hinge: Vec3 = def.mouth.hinge ? [def.mouth.hinge[0], def.mouth.hinge[1], def.mouth.hinge[2]] : [0, 0, 0];
    mouth = { anchor: index.get(def.mouth.anchor) ?? (head >= 0 ? head : core), dir: norm([def.mouth.dir[0], def.mouth.dir[1], def.mouth.dir[2]]), width: def.mouth.width, open: def.mouth.open, jaw: jaws, hinge };
  } else {
    const anchor = faces[0] ?? (head >= 0 ? head : core);
    let hinge: Vec3 = [0, 0, 0];
    if (jaws.length > 0 && head >= 0) {
      const h = spheres[head]!.center;
      const j = spheres[jaws[0]!]!.center;
      hinge = [0, (h[1] + j[1]) / 2, h[2] + (j[2] - h[2]) * 0.2];
    }
    mouth = { anchor, dir: norm([0, -0.2, 1]), width: 0.85, open: 0.8, jaw: jaws, hinge };
  }

  // --- skeleton ----------------------------------------------------------------------------------------
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const s of spheres) {
    minX = Math.min(minX, s.center[0] - s.r);
    maxX = Math.max(maxX, s.center[0] + s.r);
    minY = Math.min(minY, s.center[1] - s.r);
    maxY = Math.max(maxY, s.center[1] + s.r);
    minZ = Math.min(minZ, s.center[2] - s.r);
    maxZ = Math.max(maxZ, s.center[2] + s.r);
  }
  const length = maxZ - minZ;
  const width = maxX - minX;
  const anchors: Record<AnchorId, number> = {
    core,
    head,
    rump: rump >= 0 ? rump : core,
    jaw: jaws[0] ?? faces[0] ?? (head >= 0 ? head : core),
    tailBase: tails[0] ?? (rump >= 0 ? rump : core),
  };
  if (bodyType === 'blob') {
    anchors.head = -1;
  }
  const neckLen = neckChain && necks.length > 0 ? Math.hypot(...sub(spheres[head]!.center, neckChain.base)) : 0;
  const skeleton: BodySkeleton = {
    bodyType,
    species: def.base,
    anchors,
    slotAnchor: { eye: 'head', horn: 'head', ear: 'head', tooth: 'jaw', trunk: 'jaw', crest: 'head', wing: 'core', leg: 'core', tail: 'rump' },
    sockets: {},
    structural,
    legs,
    spine,
    spineArc,
    neckChain,
    trunk,
    mouth,
    length,
    width,
    height: maxY - minY,
    restLift,
    headSphere: head,
    neck: clamp(neckLen / 2.2, 0, 1),
    raymarch: tpl.skeleton.raymarch || length / Math.max(0.5, width) > 1.8 || spine !== null || necks.length > 0,
  };

  // --- palette, body ---------------------------------------------------------------------------------
  const material = def.material ?? tpl.material;
  let palette = tpl.palette;
  const c = def.colors;
  if (c?.base) palette = { ...palette, baseColor: c.base, innerColor: shiftHex(c.base, 4, 0.55, 1.1), rimColor: mixHex(c.base, '#ffffff', 0.25), bubbleColor: shiftHex(c.base, 0, 1.2, 0.6) };
  if (c?.inner) palette = { ...palette, innerColor: c.inner };
  if (c?.rim) palette = { ...palette, rimColor: c.rim };
  const constants = { ...tpl.constants, ...(c?.accent ? { accent: c.accent } : {}) };
  const headOrCore = spheres[head >= 0 ? head : core]!;
  let body: BlobParams = {
    ...tpl.body,
    ...palette,
    spheres,
    sminK: def.sminK,
    material,
    eye: { dir: norm([headOrCore.center[0] + 0.25, headOrCore.center[1] + 0.25, headOrCore.center[2] + headOrCore.r]), size: 0.28, spacing: 0.26 },
  };
  if (bodyType === 'blob') body.floorY = def.floorY ?? -restLift;
  else delete body.floorY;

  // --- parts -------------------------------------------------------------------------------------------
  const parts: PartSpec[] = [];
  const counts = new Map<SlotId, number>();
  for (const p of def.parts) counts.set(p.slot, (counts.get(p.slot) ?? 0) + 1);
  const seen = new Map<SlotId, number>();
  const tintOf = (source: string): string | null => {
    if (source.startsWith('#')) return source;
    switch (source as TintSource) {
      case 'base':
        return palette.baseColor;
      case 'inner':
        return palette.innerColor;
      case 'rim':
        return palette.rimColor;
      case 'highlight':
        return palette.highlightColor;
      case 'ink':
        return constants.ink;
      case 'bone':
        return constants.bone;
      case 'accent':
        return constants.accent;
      default:
        return null;
    }
  };
  const faceSlots = new Set<SlotId>(['eye', 'horn', 'ear', 'crest', 'tooth', 'trunk']);
  for (const p of def.parts) {
    const rule = rules.assets[p.asset];
    if (!rule) {
      warnings.push(`Modul "${p.asset}" ist unbekannt (rules.json) — Teil übersprungen`);
      continue;
    }
    if (rule.slot !== p.slot) warnings.push(`Modul "${p.asset}" gehört zum Sockel "${rule.slot}", steht aber auf "${p.slot}"`);
    const k = seen.get(p.slot) ?? 0;
    seen.set(p.slot, k + 1);
    const anchor = p.anchor !== undefined ? index.get(p.anchor) ?? core : faceSlots.has(p.slot) && head >= 0 ? head : core;
    const slotRule = rules.slots[p.slot];
    const tint = tintOf(p.tint ?? slotRule?.tint ?? 'inner');
    parts.push({
      id: `${p.slot}:${p.asset}:${k}`,
      slot: p.slot,
      asset: p.asset,
      index: k,
      count: counts.get(p.slot) ?? 1,
      theta: p.theta,
      phi: p.phi,
      mirror: p.mirror,
      ref: p.ref ?? rules.sockets[p.slot].ref,
      tilt: p.tilt,
      roll: p.roll,
      sink: p.sink,
      scale: p.scale,
      tint,
      family: rule.family,
      chain: rule.chain,
      verbs: slotRule?.verbs ?? [],
      carried: false,
      since: genome.tier,
      anchor,
      role: null,
      knee: 1,
    });
  }
  // Kneaded legs: one virtual part per leg (the step cycle addresses feet by role; nothing is drawn).
  structural.forEach((st, i) => {
    parts.push({
      id: `leg:${SDF_LEG_ASSET}:${i}`,
      slot: 'leg',
      asset: SDF_LEG_ASSET,
      index: i,
      count: structural.length,
      theta: st.theta,
      phi: st.phi,
      mirror: st.mirror,
      ref: st.ref,
      tilt: st.tilt,
      roll: st.roll,
      sink: st.sink,
      scale: 1,
      tint: null,
      family: 'jelly',
      chain: false,
      verbs: rules.slots.leg?.verbs ?? [],
      carried: false,
      since: genome.tier,
      anchor: st.anchor,
      role: st.role,
      knee: st.knee,
      sdf: true,
    });
  });
  const paintedEye = !parts.some((p) => p.slot === 'eye');
  if (!paintedEye) {
    const cap = faceCapFor({ body, parts });
    const d = cap ? cap.dir : ([0, 0.2, 1] as Vec3);
    const l = Math.hypot(d[0], d[1] * 0.5, d[2]) || 1;
    body = { ...body, eye: { dir: [d[0] / l + 0.001, (d[1] * 0.5) / l, d[2] / l], size: 0.0001, spacing: 0 } };
  }

  const skin = { ...tpl.skin };
  if (def.skin?.coat) skin.coat = def.skin.coat;
  if (def.skin?.pattern) skin.pattern = def.skin.pattern;
  if (def.skin?.patternScale !== undefined) skin.patternScale = def.skin.patternScale;
  if (def.skin?.patternRotation !== undefined) skin.patternRotation = def.skin.patternRotation;
  if (material === 'fire') skin.coat = 'bare';

  const spec: CreatureSpec = {
    ...tpl,
    genome,
    material,
    bodyType,
    species: def.base,
    legStyle: 'sdf',
    body,
    skeleton,
    skin,
    worldScale: tpl.worldScale * def.size,
    parts,
    palette,
    constants,
    paintedEye,
  };
  return { spec, warnings };
}
