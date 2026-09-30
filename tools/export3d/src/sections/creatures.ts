import {
  BODY_TYPE_LABELS,
  BREATH_AMPLITUDE,
  COAT_LABELS,
  RADIAL_TRACE_EXACT,
  SKIN_PATTERN_LABELS,
  SPECIES,
  SPECIES_BODY,
  SPECIES_LABELS,
  ZONES,
  bodyRuleFor,
  buildCustomCreature,
  customFromSpec,
  evalSdf,
  faceCapFor,
  orientationFrame,
  radialSurfaceDistance,
  resolveCreature,
  sdfNormal,
  socketDirection,
  validateCustomCreature,
  type CreatureGenome,
  type CreatureSpec,
  type SdfProgram,
  type Species,
  type Vec3,
  type ZoneId,
} from '@ee/genome';
import { MESH_BODY_BUDGET, makePattern, meshBody, type PatternKind } from '@ee/render';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ExportContext } from '../context';
import { GlbWriter, hexToLinearRgba } from '../glb';
import { meshSdf } from '../mesher';
import { rigFor, type CreatureRig } from '../rig';

/**
 * Wesen: every species at every tier the board can show (from the earliest zone threshold to 12, Tjorizo
 * palette), the blob line of every zone (tiers 1–12) and the custom creatures of
 * `content/genome/custom/`. One GLB per creature: the body mesh (species: the game's own surface-nets
 * mesh `meshBody`, blobs: the same recipe on the SDF with its flat base), skinned to one joint per body
 * sphere, plus all metadata as extras — skeleton roles, bones, sockets (frame matrices exactly as
 * `CreatureRig` places the modules at rest), palette, material, skin pattern and the custom-JSON form.
 */

export interface CreatureEntry {
  id: string;
  label: string;
  group: string;
  species: Species;
  bodyType: string;
  zone: ZoneId;
  tier: number;
  file: string;
  custom: boolean;
}

const SEED = 7;
const FORWARD: Vec3 = [0, 0, 1];

/** Earliest tier an archetype can appear on the board in any zone. */
function firstTier(ctx: ExportContext, species: Species): number {
  const type = SPECIES_BODY[species];
  if (type === 'blob') return 1;
  return Math.max(1, Math.min(...ZONES.map((z) => bodyRuleFor(ctx.rules, z, type).fromTier)));
}

/** Socket frame of a part at rest, exactly as `CreatureRig.update` computes it (no pose, no breathing). */
function socketMatrix(spec: CreatureSpec, part: CreatureSpec['parts'][number]): number[] {
  const program: SdfProgram = spec.body;
  const spheres = program.spheres;
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const s of spheres) {
    const r = s.r * (1 + BREATH_AMPLITUDE);
    minX = Math.min(minX, s.center[0] - r);
    maxX = Math.max(maxX, s.center[0] + r);
    minZ = Math.min(minZ, s.center[2] - r);
    maxZ = Math.max(maxZ, s.center[2] + r);
  }
  const anchor = part.anchor >= 0 ? spheres[part.anchor] : undefined;
  const origin: Vec3 = anchor ? [anchor.center[0], anchor.center[1], anchor.center[2]] : [(minX + maxX) / 2, 0, (minZ + maxZ) / 2];
  const dir = socketDirection(part.theta, part.phi);
  const opts = { noNoise: true };
  const t = radialSurfaceDistance(program, dir, opts, RADIAL_TRACE_EXACT, origin);
  const point: Vec3 = [origin[0] + dir[0] * t, origin[1] + dir[1] * t, origin[2] + dir[2] * t];
  const n = sdfNormal(program, point, opts, 0.02);
  const frame = orientationFrame(n, { ref: part.ref, mirror: part.mirror, tilt: part.tilt, roll: part.roll, forward: FORWARD });
  const lift = spec.skin.coat === 'fur' ? 0.1 : spec.skin.coat === 'feather' ? 0.05 : 0;
  const headPart = !!spec.skeleton.neckChain?.head.includes(part.anchor);
  const up = part.role !== null ? lift * 0.3 : headPart && (part.slot === 'eye' || part.slot === 'trunk' || part.slot === 'tooth') ? lift * 0.25 : lift;
  const p: Vec3 = [point[0] + n[0] * (up - part.sink), point[1] + n[1] * (up - part.sink), point[2] + n[2] * (up - part.sink)];
  const { x, y, z } = frame;
  // Column-major: module +X → frame x, module +Y → normal (frame z), module +Z → −up (−frame y).
  return [x[0], x[1], x[2], 0, z[0], z[1], z[2], 0, -y[0], -y[1], -y[2], 0, p[0], p[1], p[2], 1];
}

function bodyMesh(spec: CreatureSpec): { positions: Float32Array; normals: Float32Array; skinIndex: Float32Array; skinWeight: Float32Array; index: Uint32Array; mesher: string } {
  if (spec.bodyType !== 'blob') {
    const m = meshBody(spec.body.spheres, spec.body.sminK, { maxVertices: MESH_BODY_BUDGET.near });
    return { positions: m.positions, normals: m.normals, skinIndex: m.skinIndex, skinWeight: m.skinWeight, index: m.index, mesher: '@ee/render meshBody (near)' };
  }
  // Blob dome: the game's SDF with its flat base (no noise, no breathing).
  const program = spec.body;
  const m = meshSdf((x, y, z) => evalSdf(program, [x, y, z], { noNoise: true }), program.spheres, program.sminK, { maxVertices: MESH_BODY_BUDGET.near, cell: 0.07 });
  return { ...m, mesher: 'tools/export3d meshSdf (evalSdf, flat base)' };
}

function writeCreature(ctx: ExportContext, spec: CreatureSpec, meta: { id: string; label: string; group: string; custom: boolean; customJson?: unknown }): string {
  const rig: CreatureRig = rigFor(spec);
  const mesh = bodyMesh(spec);
  const w = new GlbWriter();

  // Joints: every bone (hierarchy), translation-only rest frames (bone heads).
  const boneIndex = new Map<string, number>();
  rig.bones.forEach((b, i) => boneIndex.set(b.name, i));
  const jointNodes: number[] = [];
  const childrenOf = new Map<string, string[]>();
  for (const b of rig.bones) if (b.parent) childrenOf.set(b.parent, [...(childrenOf.get(b.parent) ?? []), b.name]);
  const nodeOfBone = new Map<string, number>();
  const makeJoint = (name: string): number => {
    const b = rig.bones[boneIndex.get(name)!]!;
    const parent = b.parent ? rig.bones[boneIndex.get(b.parent)!]! : null;
    const t = parent ? [b.head[0] - parent.head[0], b.head[1] - parent.head[1], b.head[2] - parent.head[2]] : b.head;
    const kids = (childrenOf.get(name) ?? []).map(makeJoint);
    const node = w.node({ name, children: kids, matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, t[0]!, t[1]!, t[2]!, 1], extras: { bone: name } });
    nodeOfBone.set(name, node);
    return node;
  };
  const rootBone = rig.bones.find((b) => b.parent === null)!;
  const skeletonRoot = makeJoint(rootBone.name);
  for (const b of rig.bones) jointNodes.push(nodeOfBone.get(b.name)!);
  const ibm = new Float32Array(rig.bones.length * 16);
  rig.bones.forEach((b, i) => {
    ibm.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -b.head[0], -b.head[1], -b.head[2], 1], i * 16);
  });
  const skin = w.skin(jointNodes, ibm, skeletonRoot);

  // Body mesh: JOINTS_0 = the bone of each sphere.
  const nv = mesh.positions.length / 3;
  const joints = new Uint16Array(nv * 4);
  for (let i = 0; i < nv * 4; i++) {
    const sphere = Math.round(mesh.skinIndex[i]!);
    joints[i] = boneIndex.get(rig.sphereBone[sphere] ?? rootBone.name) ?? 0;
  }
  const body = spec.body;
  const mat = w.material(`Körper · ${meta.label}`, hexToLinearRgba(body.baseColor), { role: 'body', material: body.material });
  const meshIdx = w.mesh(`${meta.label} · Körper`, [
    {
      attributes: {
        POSITION: w.accessor(mesh.positions, 'VEC3', { minmax: true }),
        NORMAL: w.accessor(mesh.normals, 'VEC3'),
        JOINTS_0: w.accessor(joints, 'VEC4'),
        WEIGHTS_0: w.accessor(mesh.skinWeight, 'VEC4'),
      },
      indices: w.accessor(mesh.index, 'SCALAR'),
      material: mat,
    },
  ]);
  const bodyNode = w.node({ name: 'Körper', mesh: meshIdx, skin, extras: { mesher: mesh.mesher, vertices: nv, triangles: mesh.index.length / 3 } });

  const pattern = spec.skin.pattern !== 'none' ? makePattern(spec.skin.pattern as PatternKind, body.baseColor, { scale: spec.skin.patternScale, rotation: spec.skin.patternRotation }) : null;
  const sk = spec.skeleton;
  const extras = {
    ee: 'wesen',
    id: meta.id,
    label: meta.label,
    group: meta.group,
    custom: meta.custom,
    species: spec.species,
    speciesLabel: SPECIES_LABELS[spec.species],
    bodyType: spec.bodyType,
    bodyTypeLabel: BODY_TYPE_LABELS[spec.bodyType],
    zone: spec.zone,
    tier: spec.tier,
    seed: spec.genome.seed,
    material: body.material,
    legStyle: spec.legStyle,
    worldScale: spec.worldScale,
    restLift: sk.restLift,
    palette: { base: body.baseColor, inner: body.innerColor, rim: body.rimColor, highlight: body.highlightColor, bubble: body.bubbleColor },
    constants: spec.constants,
    gloss: body.gloss,
    translucency: body.translucency,
    bubbleDensity: body.bubbleDensity,
    viscosity: body.viscosity,
    sminK: body.sminK,
    noiseAmp: body.noiseAmp,
    floorY: body.floorY ?? null,
    skin: { ...spec.skin, coatLabel: COAT_LABELS[spec.skin.coat], patternLabel: SKIN_PATTERN_LABELS[spec.skin.pattern] },
    pattern,
    paintedEye: spec.paintedEye,
    eye: body.eye,
    faceCap: faceCapFor(spec),
    motion: spec.motion,
    personality: spec.personality,
    spheres: rig.spheres,
    bones: rig.bones,
    skeleton: {
      anchors: sk.anchors,
      headSphere: sk.headSphere,
      neck: sk.neckChain,
      trunk: sk.trunk,
      spine: sk.spine,
      spineArc: sk.spineArc,
      legs: sk.legs,
      mouth: sk.mouth,
      length: sk.length,
      width: sk.width,
      height: sk.height,
      neckAmount: sk.neck,
      raymarch: sk.raymarch,
    },
    parts: spec.parts.map((p) => ({
      id: p.id,
      slot: p.slot,
      asset: p.asset,
      index: p.index,
      count: p.count,
      theta: p.theta,
      phi: p.phi,
      mirror: p.mirror,
      ref: p.ref,
      tilt: p.tilt,
      roll: p.roll,
      sink: p.sink,
      scale: p.scale,
      tint: p.tint,
      family: p.family,
      chain: p.chain,
      anchor: p.anchor,
      anchorName: p.anchor >= 0 ? rig.spheres[p.anchor]?.name ?? null : null,
      role: p.role,
      knee: p.knee,
      sdf: !!p.sdf,
      socket: p.sdf ? null : socketMatrix(spec, p),
    })),
    customJson: meta.customJson ?? customFromSpec(spec, { id: meta.id, name: meta.label }),
  };
  const rootNode = w.node({ name: meta.id, children: [skeletonRoot, bodyNode], extras });
  w.root(rootNode);
  return ctx.writeGlb(`wesen/${meta.id}.glb`, w);
}

export function exportCreatures(ctx: ExportContext): CreatureEntry[] {
  const out: CreatureEntry[] = [];
  const rules = ctx.rules;
  const push = (genome: CreatureGenome, group: string, label: string, id: string): void => {
    try {
      const spec = resolveCreature(genome, rules);
      const file = writeCreature(ctx, spec, { id, label, group, custom: false });
      out.push({ id, label, group, species: spec.species, bodyType: spec.bodyType, zone: spec.zone, tier: spec.tier, file, custom: false });
    } catch (e) {
      ctx.warn('wesen', `${id}: ${String(e)}`);
    }
  };
  // Species (Tjorizo palette), every tier from the earliest board threshold to 12.
  for (const species of SPECIES) {
    if (species === 'blob') continue;
    const from = firstTier(ctx, species);
    const tiers = ctx.quick ? [Math.max(from, 8)] : Array.from({ length: 12 - from + 1 }, (_, i) => from + i);
    for (const tier of tiers) {
      const label = `${SPECIES_LABELS[species]} · Stufe ${tier}`;
      push({ zone: 'tjorizo', tier, seed: SEED, species }, SPECIES_LABELS[species], label, `${species}-t${String(tier).padStart(2, '0')}`);
    }
  }
  // The blob line of every zone (material thresholds and palettes differ per zone).
  for (const zone of ZONES) {
    const tiers = ctx.quick ? [1, 6] : Array.from({ length: 12 }, (_, i) => i + 1);
    for (const tier of tiers) {
      const zl = zone[0]!.toUpperCase() + zone.slice(1);
      push({ zone, tier, seed: SEED, species: 'blob' }, `Blob ${zl}`, `Blob ${zl} · Stufe ${tier}`, `blob-${zone}-t${String(tier).padStart(2, '0')}`);
    }
  }
  // Custom creatures (Blender round trip).
  const dir = join(ctx.root, 'content/genome/custom');
  let files: string[] = [];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
  } catch {
    files = [];
  }
  for (const f of files) {
    try {
      const raw = JSON.parse(readFileSync(join(dir, f), 'utf8'));
      const v = validateCustomCreature(raw);
      if (!v.ok) {
        ctx.warn('wesen', `custom/${f}: ${v.issues.map((i) => `${i.path}: ${i.message}`).join('; ')}`);
        continue;
      }
      const { spec, warnings } = buildCustomCreature(v.def, rules);
      for (const m of warnings) ctx.warn('wesen', `custom/${f}: ${m}`);
      const id = `eigen-${v.def.id}`;
      const file = writeCreature(ctx, spec, { id, label: v.def.name, group: 'Eigene Wesen', custom: true, customJson: raw });
      out.push({ id, label: v.def.name, group: 'Eigene Wesen', species: spec.species, bodyType: spec.bodyType, zone: spec.zone, tier: spec.tier, file, custom: true });
    } catch (e) {
      ctx.warn('wesen', `custom/${f}: ${String(e)}`);
    }
  }
  ctx.log(`Wesen: ${out.length} (${out.filter((e) => e.custom).length} eigene)`);
  return out;
}
