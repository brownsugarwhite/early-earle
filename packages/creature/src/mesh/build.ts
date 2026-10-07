import { parseBauplan, type Bauplan } from '../bauplan/schema';
import { shapeHash } from '../bauplan/hash';
import type { Vec3 } from '../math/vec';
import { construct, type Bone, type Construction, type EyeSpec, type PartGroup } from '../sdf/build';
import { evalScene } from '../sdf/scene';
import type { Tooth } from '../mouth/mouth';
import { computeDescriptors, smoothWeights, type Descriptors } from './descriptors';
import { adjacency, contourManifold, largestComponent, nonManifoldEdges, orientToNormals, projectAndNormals, taubin } from './surfaceNets';

export interface BuildOptions {
  /** Zellen entlang der größten Ausdehnung (32 Brett, 48 Vorschau, 64 Held). */
  resolution?: number;
  /** Taubin-Iterationen (0 = keine Glättung). */
  smoothIterations?: number;
  /** Gewichte glätten (Iterationen). */
  weightSmoothing?: number;
}

export interface CreatureBuild {
  positions: Float32Array;
  normals: Float32Array;
  index: Uint32Array;
  descriptors: Descriptors;
  bones: Bone[];
  groups: Array<Pick<PartGroup, 'name' | 'kind' | 'bones'>>;
  mouth: {
    center: Vec3;
    corners: [Vec3, Vec3];
    hinge: { point: Vec3; axis: Vec3 };
    frame: { x: Vec3; y: Vec3; z: Vec3 };
    lipLine: Vec3[];
    teeth: Tooth[];
    tongue: { pos: Vec3; dir: Vec3; size: number };
    gapFront: number;
    oeffnung: number;
  } | null;
  eyes: EyeSpec[];
  hostBone: number;
  jawBone: number;
  bounds: { min: Vec3; max: Vec3 };
  bodyScale: number;
  shapeHash: number;
  stats: { vertexCount: number; triangleCount: number; cell: number; nonManifold: number; ms: number };
}

/** Baut aus einem Bauplan (oder seinem JSON) das Mesh mit Deskriptoren und Skelett. */
export function buildCreature(input: Bauplan | unknown, opts: BuildOptions = {}): CreatureBuild {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const b = isBauplan(input) ? input : parseBauplan(input);
  const resolution = opts.resolution ?? 48;
  const c: Construction = construct(b);
  const ext = Math.max(c.bounds.max[0] - c.bounds.min[0], c.bounds.max[1] - c.bounds.min[1], c.bounds.max[2] - c.bounds.min[2]);
  const cell = ext / resolution;
  const sdf = (p: Readonly<Vec3>): number => evalScene(c.scene, p);
  let raw = contourManifold(sdf, { min: c.bounds.min, max: c.bounds.max, cell });
  raw = largestComponent(raw);
  const positions = raw.positions;
  const index = raw.index;
  const adj = adjacency(index, raw.vertexCount);
  const smoothIt = opts.smoothIterations ?? 5;
  if (smoothIt > 0) taubin(positions, adj, smoothIt);
  const normals = new Float32Array(positions.length);
  projectAndNormals(sdf, positions, normals, cell * 0.25, smoothIt > 0 ? 5 : 4);
  orientToNormals(positions, normals, index);
  const descriptors = computeDescriptors(c, positions, normals);
  const ws = opts.weightSmoothing ?? 2;
  if (ws > 0) smoothWeights(descriptors, adj, c.bones.length, ws);
  const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const m = c.mouth;
  return {
    positions,
    normals,
    index,
    descriptors,
    bones: c.bones,
    groups: c.groups.map((g) => ({ name: g.name, kind: g.kind, bones: g.bones })),
    mouth: m
      ? { center: m.center, corners: m.corners, hinge: m.jawHinge, frame: m.frame, lipLine: m.lipLine, teeth: m.teeth, tongue: m.tongue, gapFront: m.gapFront, oeffnung: m.oeffnung }
      : null,
    eyes: c.eyes,
    hostBone: c.hostBone,
    jawBone: c.jawBone,
    bounds: c.bounds,
    bodyScale: c.bodyScale,
    shapeHash: shapeHash(b, resolution),
    stats: { vertexCount: raw.vertexCount, triangleCount: index.length / 3, cell, nonManifold: nonManifoldEdges(index, raw.vertexCount), ms: t1 - t0 },
  };
}

function isBauplan(x: unknown): x is Bauplan {
  return !!x && typeof x === 'object' && (x as { schemaVersion?: unknown }).schemaVersion === 1 && 'koerper' in (x as object) && 'maul' in (x as object) && typeof (x as { koerper: { querschnitte?: unknown } }).koerper.querschnitte !== 'undefined';
}
