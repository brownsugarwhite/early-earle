/**
 * Custom creatures (Blender round trip): a creature Florian builds from spheres in Blender
 * (`tools/blender/ee_wesen.py` → "early earle: Wesen exportieren") and saves as
 * `content/genome/custom/<id>.json`. The game turns it into a regular `CreatureSpec` with
 * `buildCustomCreature` — the body is the smooth union of the spheres (same SDF as every species),
 * the skeleton comes from the sphere roles (neck, trunk, tail and spine chains, kneaded legs with knee
 * and foot spheres), the parts are modules on explicit sockets. Gait, motion, default palette and skin
 * come from the `base` species (its locomotion class).
 *
 * Coordinates: game body space, blob units — +y up, +z forward (the face), +x = the animal's left;
 * the ground is where the lowest sphere touches (y = −restLift).
 */
import { z } from 'zod';
import { ZONE_KEYS, SLOT_IDS, TINT_SOURCES, FRAME_REFS } from '../rules';
import { COATS, MATERIAL_KINDS, MAX_BODY_SPHERES, SKIN_PATTERNS, SPECIES } from '../types';

/**
 * What a sphere is for. Chains (`neck`, `trunk`, `tail`, `spine`) are ordered by `chain`; `knee`/`foot`
 * belong to a leg (`leg`). `face` spheres ride rigidly on the head (snout, cheeks, nose), `jaw` swings
 * open with the mouth, `lobe` = blob lobes, `body` = any further torso sphere (flanks).
 */
export const SPHERE_ROLES = ['core', 'rump', 'body', 'lobe', 'head', 'face', 'jaw', 'neck', 'trunk', 'tail', 'spine', 'knee', 'foot'] as const;
export type SphereRole = (typeof SPHERE_ROLES)[number];

export const SPHERE_ROLE_LABELS: Readonly<Record<SphereRole, string>> = {
  core: 'Körper (Hauptkugel)',
  rump: 'Hinterteil',
  body: 'Rumpf (weitere Kugel)',
  lobe: 'Lappen (Blob)',
  head: 'Kopf',
  face: 'Gesicht (fest am Kopf)',
  jaw: 'Unterkiefer',
  neck: 'Hals (Kette)',
  trunk: 'Rüssel (Kette)',
  tail: 'Schwanz (Kette)',
  spine: 'Wirbelsäule (Schlange)',
  knee: 'Knie',
  foot: 'Fuß',
};

/** Leg ids: FL/FR/BL/BR (front/back, left = +x) for four legs, L/R for two. */
export const LEG_IDS = ['FL', 'FR', 'BL', 'BR', 'L', 'R'] as const;
export type LegId = (typeof LEG_IDS)[number];

const Vec3Schema = z.tuple([z.number(), z.number(), z.number()]);
const Hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'sRGB hex like #d65ce4');

export const CustomSphereSchema = z.object({
  /** Unique name (Blender object name, e.g. "Kopf", "Hals.02", "Fuß.vorn.L"). */
  name: z.string().min(1),
  role: z.enum(SPHERE_ROLES),
  center: Vec3Schema,
  r: z.number().positive().max(6),
  /** Order within its chain (neck/trunk/tail: from the body outward; spine: head → tail). */
  chain: z.number().int().min(0).optional(),
  /** Leg of a knee/foot sphere. */
  leg: z.enum(LEG_IDS).optional(),
});
export type CustomSphere = z.infer<typeof CustomSphereSchema>;

export const CustomLegSchema = z.object({
  leg: z.enum(LEG_IDS),
  /** Hip joint (inside the torso). */
  hip: Vec3Schema,
  /** Knee bend along the body's forward axis: +1 forward (front legs, bipeds), −1 backward (hind legs). */
  bend: z.union([z.literal(1), z.literal(-1)]).optional(),
});
export type CustomLeg = z.infer<typeof CustomLegSchema>;

/** A module on a socket: direction from the anchor sphere's centre (theta/phi), traced to the surface. */
export const CustomPartSchema = z.object({
  slot: z.enum(SLOT_IDS),
  /** Module id (content/genome/assets/<id>.glb or a procedural module such as ear_flap). */
  asset: z.string().regex(/^[a-z][a-z0-9_]*$/),
  /** Sphere name the socket direction starts from (default: head for face parts, core otherwise). */
  anchor: z.string().min(1).optional(),
  /** Azimuth around +y (0 = forward, + toward +x) and elevation above the anchor's equator (radians). */
  theta: z.number().min(-Math.PI - 1e-6).max(Math.PI + 1e-6),
  phi: z.number().min(-Math.PI / 2).max(Math.PI / 2),
  /** −1 = mirrored module (the right one of a pair). */
  mirror: z.union([z.literal(1), z.literal(-1)]).default(1),
  /** Lean toward the reference axis, rotation about the normal (radians), sink into the body (blob units). */
  tilt: z.number().min(-Math.PI).max(Math.PI).default(0),
  roll: z.number().min(-Math.PI).max(Math.PI).default(0),
  sink: z.number().min(-0.5).max(0.5).default(0.05),
  scale: z.number().positive().max(8).default(1),
  /** Colour: a palette source (base, inner, ink, bone, accent …; default = the slot's rule) or a hex. */
  tint: z.union([z.enum(TINT_SOURCES), Hex]).optional(),
  ref: z.enum(FRAME_REFS).optional(),
});
export type CustomPart = z.infer<typeof CustomPartSchema>;

export const CustomCreatureSchema = z
  .object({
    schemaVersion: z.literal(1),
    /** File name without .json: lowercase, digits, dashes. */
    id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/, 'id: lowercase, digits, dashes'),
    name: z.string().min(1),
    /** Species it moves like (gait, mass, tempo, default palette and skin). */
    base: z.enum(SPECIES),
    zone: z.enum(ZONE_KEYS).default('tjorizo'),
    tier: z.number().int().min(1).max(12).default(6),
    seed: z.number().int().default(7),
    material: z.enum(MATERIAL_KINDS).optional(),
    colors: z.object({ base: Hex.optional(), inner: Hex.optional(), rim: Hex.optional(), accent: Hex.optional() }).optional(),
    skin: z
      .object({
        coat: z.enum(COATS).optional(),
        pattern: z.enum(SKIN_PATTERNS).optional(),
        patternScale: z.number().positive().max(4).optional(),
        patternRotation: z.number().min(-Math.PI).max(Math.PI).optional(),
      })
      .optional(),
    /** Smooth-union blend radius of the spheres (blob units; the species use 0.19–0.4). */
    sminK: z.number().min(0).max(1).default(0.2),
    /** Flat base (blob base only): body cut below this height. */
    floorY: z.number().optional(),
    /** Height of the body origin above the ground (blob units); default: the lowest sphere touches the ground. */
    restLift: z.number().positive().max(10).optional(),
    /** Multiplier on the world scale of the base species at this tier. */
    size: z.number().positive().max(4).default(1),
    spheres: z.array(CustomSphereSchema).min(1).max(MAX_BODY_SPHERES),
    legs: z.array(CustomLegSchema).default([]),
    /** Neck arc (the head leads turns): base point and maximum lead (radians). */
    neck: z.object({ base: Vec3Schema, maxBend: z.number().min(0).max(2).default(0.6) }).optional(),
    /** Trunk chain root (the point the first trunk sphere swings about). */
    trunk: z.object({ root: Vec3Schema }).optional(),
    /** Mouth crescent: anchor sphere, direction, angular half width and opening; hinge for jaw spheres. */
    mouth: z.object({ anchor: z.string().min(1), dir: Vec3Schema, width: z.number().positive().max(3), open: z.number().positive().max(3), hinge: Vec3Schema.optional() }).optional(),
    parts: z.array(CustomPartSchema).default([]),
    /** Provenance (Blender file, export time) — informational. */
    source: z.object({ tool: z.string().optional(), file: z.string().optional(), exported: z.string().optional() }).optional(),
  })
  .superRefine((def, ctx) => {
    const names = new Map<string, number>();
    def.spheres.forEach((s, i) => {
      if (names.has(s.name)) ctx.addIssue({ code: 'custom', path: ['spheres', i, 'name'], message: `sphere name "${s.name}" is used twice` });
      names.set(s.name, i);
      if ((s.role === 'knee' || s.role === 'foot') && !s.leg) ctx.addIssue({ code: 'custom', path: ['spheres', i, 'leg'], message: `${s.role} sphere "${s.name}" needs a leg (FL, FR, BL, BR, L, R)` });
    });
    for (const role of ['core', 'head', 'rump'] as const) {
      const n = def.spheres.filter((s) => s.role === role).length;
      if (n > 1) ctx.addIssue({ code: 'custom', path: ['spheres'], message: `only one "${role}" sphere allowed (found ${n})` });
    }
    if (!def.spheres.some((s) => s.role === 'core' || s.role === 'head')) ctx.addIssue({ code: 'custom', path: ['spheres'], message: 'a "core" (or at least a "head") sphere is required' });
    const legIds = new Set<string>();
    def.legs.forEach((l, i) => {
      if (legIds.has(l.leg)) ctx.addIssue({ code: 'custom', path: ['legs', i, 'leg'], message: `leg ${l.leg} is defined twice` });
      legIds.add(l.leg);
      const feet = def.spheres.filter((s) => s.role === 'foot' && s.leg === l.leg).length;
      const knees = def.spheres.filter((s) => s.role === 'knee' && s.leg === l.leg).length;
      if (feet !== 1) ctx.addIssue({ code: 'custom', path: ['legs', i], message: `leg ${l.leg} needs exactly one foot sphere (found ${feet})` });
      if (knees > 1) ctx.addIssue({ code: 'custom', path: ['legs', i], message: `leg ${l.leg} has ${knees} knee spheres (at most one)` });
    });
    def.spheres.forEach((s, i) => {
      if ((s.role === 'knee' || s.role === 'foot') && s.leg && !legIds.has(s.leg)) ctx.addIssue({ code: 'custom', path: ['spheres', i, 'leg'], message: `leg ${s.leg} of "${s.name}" is missing in legs[] (hip)` });
    });
    if (def.base === 'snake' && def.spheres.filter((s) => s.role === 'spine').length < 2) ctx.addIssue({ code: 'custom', path: ['spheres'], message: 'a snake needs a head and at least two "spine" spheres' });
    def.parts.forEach((p, i) => {
      if (p.anchor !== undefined && !names.has(p.anchor)) ctx.addIssue({ code: 'custom', path: ['parts', i, 'anchor'], message: `anchor sphere "${p.anchor}" does not exist` });
    });
    if (def.mouth && !names.has(def.mouth.anchor)) ctx.addIssue({ code: 'custom', path: ['mouth', 'anchor'], message: `mouth anchor "${def.mouth.anchor}" does not exist` });
  });

/** A validated custom creature (defaults applied). */
export type CustomCreature = z.infer<typeof CustomCreatureSchema>;
/** Accepted JSON (defaults optional). */
export type CustomCreatureInput = z.input<typeof CustomCreatureSchema>;

export interface CustomIssue {
  path: string;
  message: string;
}

export function parseCustomCreature(input: unknown): CustomCreature {
  return CustomCreatureSchema.parse(input);
}

/** Non-throwing validation (lab, tests, the content endpoint). */
export function validateCustomCreature(input: unknown): { ok: true; def: CustomCreature } | { ok: false; issues: CustomIssue[] } {
  const r = CustomCreatureSchema.safeParse(input);
  if (r.success) return { ok: true, def: r.data };
  return { ok: false, issues: r.error.issues.map((i) => ({ path: i.path.map(String).join('.'), message: i.message })) };
}
