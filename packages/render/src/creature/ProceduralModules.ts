import { BufferGeometry, ConeGeometry, CylinderGeometry, ExtrudeGeometry, Matrix4, Shape, SphereGeometry, Vector2 } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { ModuleDef, ModulePrim, ModuleSegment } from './ModuleLibrary';

/**
 * Procedural modules (Kreaturen v3): the parts that make Florian's top-down silhouettes, built in code so
 * they fit the kneaded bodies exactly — the elephant's big ear flaps, the retriever's floppy ears, the
 * mouse's round ears and long pink tail, the giraffe's ossicones and tufted tail, the REX's spiky frills,
 * the duck's bill (its lower half opens with the mouth) and tail tuft, a black nose dot, a plume tail —
 * plus `leg_sdf`, the virtual module of a leg kneaded from the body (nothing to draw).
 *
 * Module space as for the Blender modules (ModuleLibrary): +Y = away from the body along the socket
 * normal, −Z = toward the socket's reference axis ("up"), +X = the frame's side axis (for mirrored side
 * sockets: backward). SOCKET_root is the origin. Chains grow along +Y, one short root stub first (the
 * rig bends segments 1…n). Materials: "Tint" (the slot's tint), "Accent" (the species' second colour),
 * "Ink". All flat-shaded by the part material — no outlines.
 */

export const PROCEDURAL_MODULE_IDS = ['leg_sdf', 'ear_flap', 'ear_dog', 'ear_mouse', 'horn_ossicone', 'crest_frill', 'nose_dot', 'beak_duck', 'tail_rope', 'tail_mouse', 'tail_plume', 'tail_duck'] as const;
export type ProceduralModuleId = (typeof PROCEDURAL_MODULE_IDS)[number];

const WHITE: [number, number, number] = [1, 1, 1];

function prim(geometry: BufferGeometry, materialName: 'Tint' | 'Accent' | 'Ink' | 'Bone'): ModulePrim {
  geometry.computeBoundingSphere();
  return { geometry, materialName, color: WHITE };
}

function segment(index: number, name: string, parent: number, local: Matrix4, prims: ModulePrim[], flags: Partial<Pick<ModuleSegment, 'pupil' | 'lid' | 'jaw'>> = {}): ModuleSegment {
  return { index, name, parent, local, prims, pupil: flags.pupil ?? false, lid: flags.lid ?? false, jaw: flags.jaw ?? false };
}

function faces(segs: ModuleSegment[]): number {
  let n = 0;
  for (const s of segs) for (const p of s.prims) n += Math.floor((p.geometry.index ? p.geometry.index.count : p.geometry.getAttribute('position').count) / 3);
  return n;
}

function def(id: string, slot: string, segments: ModuleSegment[], chain: boolean, tipY = 0): ModuleDef {
  const last = segments.length - 1;
  const tip = segments.length > 0 ? { segment: last, local: new Matrix4().makeTranslation(0, tipY, 0) } : null;
  return { id, slot, extras: { slot, chain, procedural: true }, segments, rootSocketInverse: new Matrix4(), tip, sockets: tip ? { tip } : {}, faces: faces(segments) };
}

/** Ellipsoid centred at (x, y, z) with radii (rx, ry, rz). */
function ellipsoid(rx: number, ry: number, rz: number, x = 0, y = 0, z = 0, w = 14, h = 10): BufferGeometry {
  const g = new SphereGeometry(1, w, h);
  g.scale(rx, ry, rz);
  g.translate(x, y, z);
  return g;
}

/** Tapered tube along +Y from y0 to y1 (radii r0 → r1). */
function tube(r0: number, r1: number, y0: number, y1: number, seg = 8): BufferGeometry {
  const g = new CylinderGeometry(r1, r0, y1 - y0, seg, 1, false);
  g.translate(0, (y0 + y1) / 2, 0);
  return g;
}

/** A flat rounded shape (outline in the X/Z plane of module space), thickness along Y, bevelled rim. */
function flatShape(outline: Array<[number, number]>, thickness: number, bevel: number): BufferGeometry {
  const shape = new Shape(outline.map(([x, z]) => new Vector2(x, z)));
  const g = new ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 6, steps: 1 });
  // Shape XY → module XZ, extrusion Z → module Y (centred on the root plane).
  g.rotateX(Math.PI / 2);
  g.translate(0, -thickness / 2, 0);
  g.computeVertexNormals();
  return g;
}

function smoothOutline(pts: Array<[number, number]>, sub = 4): Array<[number, number]> {
  // Closed Catmull-Rom through the control points.
  const out: Array<[number, number]> = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]!;
    const p1 = pts[i]!;
    const p2 = pts[(i + 1) % n]!;
    const p3 = pts[(i + 2) % n]!;
    for (let k = 0; k < sub; k++) {
      const t = k / sub;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number): number => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  return out;
}

// --- modules ---------------------------------------------------------------------------------------------

/** Elephant ear: a big fan-shaped flap hanging back from the side of the head, flaring outward. */
function earFlap(): ModuleDef {
  const outline = smoothOutline([
    [0.0, -0.14],
    [0.3, -0.22],
    [0.62, -0.16],
    [0.82, 0.08],
    [0.8, 0.4],
    [0.6, 0.64],
    [0.3, 0.66],
    [0.08, 0.46],
    [-0.04, 0.16],
  ]);
  const g = flatShape(outline, 0.035, 0.025);
  // Flare: the back and the lower edge of the flap stand well off the head (read from above as a big lobe
  // beside the head), cupped a little.
  const pos = g.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, pos.getY(i) + 0.8 * x + 0.45 * Math.max(0, z) + 0.07 * Math.sin(Math.PI * Math.min(1, Math.max(0, z + 0.2))) - 0.16 * x * x);
  }
  g.computeVertexNormals();
  return def('ear_flap', 'ear', [segment(0, 'ear_flap', -1, new Matrix4(), [prim(g, 'Accent')])], false, 0.3);
}

/** Retriever ear: a soft floppy flap in two chain segments (the rig droops it down the head's side). */
function earDog(): ModuleDef {
  // A rounded triangle: narrow at the root, widest near the bottom, tip rounded (the sketch's light ears).
  const flap = (w0: number, w1: number, len: number, thick: number): BufferGeometry => {
    const g = ellipsoid(1, 1, 1, 0, 0, 0, 14, 10);
    const pos = g.getAttribute('position');
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i); // −1..1 along the flap
      const t = (y + 1) / 2;
      const w = w0 + (w1 - w0) * t;
      pos.setXYZ(i, pos.getX(i) * w, t * len, pos.getZ(i) * thick * (1 - 0.3 * t));
    }
    g.computeVertexNormals();
    return g;
  };
  const root = segment(0, 'ear_dog_root', -1, new Matrix4(), [prim(ellipsoid(0.1, 0.07, 0.05, 0, 0.04, 0), 'Accent')]);
  const upper = segment(1, 'ear_dog_upper', 0, new Matrix4().makeTranslation(0, 0.06, 0), [prim(flap(0.1, 0.17, 0.2, 0.05), 'Accent')]);
  const lower = segment(2, 'ear_dog_lower', 1, new Matrix4().makeTranslation(0, 0.17, 0), [prim(flap(0.17, 0.13, 0.26, 0.05), 'Accent')]);
  return def('ear_dog', 'ear', [root, upper, lower], true, 0.26);
}

/** Mouse ear: a round, slightly cupped disc standing off the head. */
function earMouse(): ModuleDef {
  const g = new CylinderGeometry(0.25, 0.25, 0.035, 20, 1);
  // Disc faces ±Z (toward the reference axis), centred outward.
  g.rotateX(Math.PI / 2);
  const pos = g.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    // Cup: the rim bends toward −Z (the ear opens forward/up).
    pos.setZ(i, pos.getZ(i) - 0.35 * (x * x + y * y));
  }
  g.translate(0, 0.22, 0);
  g.computeVertexNormals();
  return def('ear_mouse', 'ear', [segment(0, 'ear_mouse', -1, new Matrix4(), [prim(g, 'Accent')])], false, 0.45);
}

/** Giraffe ossicone: a short stick with a dark knob. */
function hornOssicone(): ModuleDef {
  const stick = tube(0.055, 0.045, -0.02, 0.28, 8);
  const knob = ellipsoid(0.085, 0.08, 0.085, 0, 0.31, 0, 10, 8);
  return def('horn_ossicone', 'horn', [segment(0, 'horn_ossicone', -1, new Matrix4(), [prim(stick, 'Tint'), prim(knob, 'Accent')])], false, 0.38);
}

/** REX frill: a fan of four spikes from outward to backward (the sketch's axolotl-like gills). */
function crestFrill(): ModuleDef {
  const spikes: BufferGeometry[] = [];
  const angles = [0.12, 0.48, 0.84, 1.2];
  const lengths = [0.6, 0.62, 0.55, 0.46];
  angles.forEach((a, i) => {
    const len = lengths[i]!;
    const g = new ConeGeometry(0.12 - i * 0.012, len, 8, 1);
    g.translate(0, len / 2, 0);
    // A slight upward curl of the first spikes (−Z = up).
    g.rotateX(-0.18 + i * 0.06);
    // Fan from +Y (outward) toward +X (backward).
    g.rotateZ(-a);
    spikes.push(g.toNonIndexed());
  });
  const merged = mergeGeometries(spikes)!;
  merged.computeVertexNormals();
  return def('crest_frill', 'crest', [segment(0, 'crest_frill', -1, new Matrix4(), [prim(merged, 'Accent')])], false, 0.6);
}

/** A black nose at the snout tip. */
function noseDot(): ModuleDef {
  return def('nose_dot', 'trunk', [segment(0, 'nose_dot', -1, new Matrix4(), [prim(ellipsoid(0.1, 0.075, 0.08, 0, 0.03, 0, 12, 8), 'Ink')])], false, 0.1);
}

/** Duck bill: a flat, broad upper bill and a lower bill that opens with the mouth (segment `_jaw`). */
function beakDuck(): ModuleDef {
  const bill = (rx: number, ry: number, rz: number, y0: number, z0: number): BufferGeometry => {
    const g = ellipsoid(rx, ry, rz, 0, y0, z0, 18, 8);
    // A duck's spatula: broad and flat toward the tip, narrower at the root.
    const pos = g.getAttribute('position');
    for (let i = 0; i < pos.count; i++) {
      const t = Math.min(1, Math.max(0, (pos.getY(i) - (y0 - ry)) / (2 * ry)));
      pos.setX(i, pos.getX(i) * (0.72 + 0.4 * t));
      pos.setZ(i, z0 + (pos.getZ(i) - z0) * (1.1 - 0.5 * t));
    }
    g.computeVertexNormals();
    return g;
  };
  const upper = bill(0.24, 0.26, 0.065, 0.2, -0.02);
  const lower = bill(0.2, 0.22, 0.045, 0.17, 0.02);
  const root = segment(0, 'beak_duck', -1, new Matrix4(), [prim(upper, 'Accent')]);
  const jaw = segment(1, 'beak_duck_jaw', 0, new Matrix4().makeTranslation(0, 0.02, 0.04), [prim(lower, 'Accent')], { jaw: true });
  return def('beak_duck', 'trunk', [root, jaw], false, 0.46);
}

function chainTube(id: string, n: number, len: number, r0: number, r1: number, material: 'Tint' | 'Accent', tuft: 'Accent' | 'Ink' | null): ModuleDef {
  const segs: ModuleSegment[] = [];
  segs.push(segment(0, `${id}_root`, -1, new Matrix4(), [prim(tube(r0 * 1.15, r0, -0.02, 0.05, 8), material)]));
  for (let i = 1; i <= n; i++) {
    const a = r0 + ((r1 - r0) * (i - 1)) / n;
    const b = r0 + ((r1 - r0) * i) / n;
    const prims = [prim(tube(a, b, 0, len * 1.08, 8), material)];
    if (i === n && tuft) prims.push(prim(ellipsoid(r1 * 2.2, len * 0.75, r1 * 2.2, 0, len * 1.05, 0, 10, 8), tuft));
    segs.push(segment(i, `${id}_seg${i}`, i - 1, new Matrix4().makeTranslation(0, i === 1 ? 0.05 : len, 0), prims));
  }
  return def(id, 'tail', segs, true, len);
}

/** Retriever tail: a feathery plume (long flat locks overlapping along the chain) that curls up, cream tip. */
function tailPlume(): ModuleDef {
  const lock = (w: number, len: number): BufferGeometry => {
    const g = ellipsoid(w, len / 2, w * 0.55, 0, len / 2, 0, 10, 8);
    const pos = g.getAttribute('position');
    for (let i = 0; i < pos.count; i++) {
      const t = pos.getY(i) / len;
      // Feathered lock: widest in the middle, a soft point at the tip.
      pos.setX(i, pos.getX(i) * (0.75 + 0.5 * Math.sin(Math.PI * Math.min(1, t * 1.1))));
    }
    g.computeVertexNormals();
    return g;
  };
  const segs: ModuleSegment[] = [segment(0, 'tail_plume_root', -1, new Matrix4(), [prim(ellipsoid(0.08, 0.07, 0.07, 0, 0.03, 0, 10, 8), 'Tint')])];
  const n = 3;
  for (let i = 1; i <= n; i++) {
    segs.push(segment(i, `tail_plume_seg${i}`, i - 1, new Matrix4().makeTranslation(0, i === 1 ? 0.05 : 0.15, 0), [prim(lock(0.1 + 0.025 * i, 0.24), i === n ? 'Accent' : 'Tint')]));
  }
  return def('tail_plume', 'tail', segs, true, 0.24);
}

/** Duck tail: three small pointed feathers fanned up and back. */
function tailDuck(): ModuleDef {
  const parts: BufferGeometry[] = [];
  [-0.45, 0, 0.45].forEach((a, i) => {
    const g = new ConeGeometry(0.065, 0.24 - Math.abs(i - 1) * 0.04, 6, 1);
    g.scale(1, 1, 0.45);
    g.translate(0, 0.11, 0);
    g.rotateZ(a);
    parts.push(g.toNonIndexed());
  });
  const merged = mergeGeometries(parts)!;
  merged.computeVertexNormals();
  return def('tail_duck', 'tail', [segment(0, 'tail_duck', -1, new Matrix4(), [prim(merged, 'Tint')])], false, 0.24);
}

/** The virtual module of a kneaded leg: no segments, nothing drawn (the body spheres are the leg). */
function legSdf(): ModuleDef {
  return { id: 'leg_sdf', slot: 'leg', extras: { slot: 'leg', procedural: true, sdf: true }, segments: [], rootSocketInverse: new Matrix4(), tip: null, sockets: {}, faces: 0 };
}

/** All procedural modules (built per library: a library disposes the geometry it owns). */
export function proceduralModules(): ModuleDef[] {
  return [
    legSdf(),
    earFlap(),
    earDog(),
    earMouse(),
    hornOssicone(),
    crestFrill(),
    noseDot(),
    beakDuck(),
    chainTube('tail_rope', 5, 0.17, 0.06, 0.035, 'Tint', 'Accent'),
    chainTube('tail_mouse', 7, 0.15, 0.04, 0.018, 'Accent', null),
    tailPlume(),
    tailDuck(),
  ];
}
