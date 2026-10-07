import { parseBauplan, type Bauplan } from '../bauplan/schema';
import { shapeHash } from '../bauplan/hash';
import type { Vec3 } from '../math/vec';
import { construct, type Bone, type Construction, type EyeSpec, type PartGroup } from '../sdf/build';
import { evalScene } from '../sdf/scene';
import type { Tooth } from '../mouth/mouth';
import { computeDescriptors, smoothWeights, type Descriptors } from './descriptors';
import { computeClosing } from '../mouth/closing';
import { adjacency, contourManifold, largestComponent, nonManifoldEdges, orientToNormals, projectAndNormals, taubin } from './surfaceNets';
import { contourDual } from './dualContouring';

export interface BuildOptions {
  /** Zellen entlang der größten Ausdehnung (32 Brett, 48 Vorschau, 64 Held). */
  resolution?: number;
  /** Taubin-Iterationen (0 = keine Glättung). */
  smoothIterations?: number;
  /** Gewichte glätten (Iterationen). */
  weightSmoothing?: number;
  /** Narrow-Band (Standard an). */
  narrowBand?: boolean;
  /** Extraktion: Dual Contouring (scharfe Kanten, Standard) oder Surface Nets. */
  extraction?: 'dual' | 'nets';
}

export interface CreatureBuild {
  positions: Float32Array;
  normals: Float32Array;
  index: Uint32Array;
  descriptors: Descriptors;
  /** Kantenmaß je Vertex (0 glatt … 1 scharfe Kante), für Facettennormalen an Kanten. */
  crease: Float32Array;
  /** Verschluss-Morph (xyz je Vertex, geschlossene Pose) und Kieferwinkel. */
  closed: Float32Array;
  pucker: Float32Array;
  puckerClose: number;
  closeAngle: number;
  maxOpenAngle: number;
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
  const c: Construction = construct(b, resolution);
  const ext = Math.max(c.bounds.max[0] - c.bounds.min[0], c.bounds.max[1] - c.bounds.min[1], c.bounds.max[2] - c.bounds.min[2]);
  const cell = ext / resolution;
  const sdf = (p: Readonly<Vec3>): number => evalScene(c.scene, p);
  const extraction = opts.extraction ?? 'dual';
  let positions: Float32Array;
  let index: Uint32Array;
  let normals: Float32Array;
  let crease: Float32Array;
  let vertexCount: number;
  if (extraction === 'dual') {
    // Dual Contouring: QEF-Vertices liegen auf den Tangentialebenen; Kanten bleiben scharf, Glättung entfällt.
    let dc = contourDual(sdf, { min: c.bounds.min, max: c.bounds.max, cell, narrowBand: opts.narrowBand ?? true });
    if (nonManifoldEdges(dc.index, dc.vertexCount) > 6) {
      const alt = contourDual(sdf, { min: c.bounds.min, max: c.bounds.max, cell, shift: 0.5, narrowBand: opts.narrowBand ?? true });
      if (nonManifoldEdges(alt.index, alt.vertexCount) < nonManifoldEdges(dc.index, dc.vertexCount)) dc = alt;
    }
    const extras = [
      { array: dc.normals, size: 3 },
      { array: dc.crease, size: 1 },
    ];
    const kept = largestComponent(dc, extras);
    positions = kept.positions;
    index = kept.index;
    vertexCount = kept.vertexCount;
    const dcNormals = extras[0]!.array;
    crease = extras[1]!.array;
    // Glatte Vertices: ein Newton-Schritt auf die Fläche und Gradientnormale; Kantenvertices bleiben, wo die QEF sie setzt
    normals = new Float32Array(positions.length);
    const smoothIdx: number[] = [];
    for (let v = 0; v < vertexCount; v++) if (crease[v]! < 0.55) smoothIdx.push(v);
    const sub = new Float32Array(smoothIdx.length * 3);
    for (let q = 0; q < smoothIdx.length; q++) {
      const v = smoothIdx[q]!;
      sub[q * 3] = positions[v * 3]!;
      sub[q * 3 + 1] = positions[v * 3 + 1]!;
      sub[q * 3 + 2] = positions[v * 3 + 2]!;
    }
    const subN = new Float32Array(sub.length);
    projectAndNormals(sdf, sub, subN, cell * 0.25, 1);
    for (let q = 0; q < smoothIdx.length; q++) {
      const v = smoothIdx[q]!;
      // Projektion begrenzen (höchstens eine halbe Zelle), damit nichts springt
      const dx = sub[q * 3]! - positions[v * 3]!, dy = sub[q * 3 + 1]! - positions[v * 3 + 1]!, dz = sub[q * 3 + 2]! - positions[v * 3 + 2]!;
      const l = Math.hypot(dx, dy, dz);
      const f = l > cell * 0.5 ? (cell * 0.5) / l : 1;
      positions[v * 3] = positions[v * 3]! + dx * f;
      positions[v * 3 + 1] = positions[v * 3 + 1]! + dy * f;
      positions[v * 3 + 2] = positions[v * 3 + 2]! + dz * f;
      normals[v * 3] = subN[q * 3]!;
      normals[v * 3 + 1] = subN[q * 3 + 1]!;
      normals[v * 3 + 2] = subN[q * 3 + 2]!;
    }
    for (let v = 0; v < vertexCount; v++) {
      if (crease[v]! >= 0.55) {
        normals[v * 3] = dcNormals[v * 3]!;
        normals[v * 3 + 1] = dcNormals[v * 3 + 1]!;
        normals[v * 3 + 2] = dcNormals[v * 3 + 2]!;
      }
    }
    orientToNormals(positions, normals, index);
  } else {
    let raw = contourManifold(sdf, { min: c.bounds.min, max: c.bounds.max, cell, narrowBand: opts.narrowBand ?? true });
    raw = largestComponent(raw);
    positions = raw.positions;
    index = raw.index;
    vertexCount = raw.vertexCount;
    const adjN = adjacency(index, vertexCount);
    const smoothIt = opts.smoothIterations ?? 5;
    if (smoothIt > 0) taubin(positions, adjN, smoothIt);
    normals = new Float32Array(positions.length);
    projectAndNormals(sdf, positions, normals, cell * 0.25, smoothIt > 0 ? 3 : 2);
    orientToNormals(positions, normals, index);
    crease = new Float32Array(vertexCount);
  }
  const adj = adjacency(index, vertexCount);
  const descriptors = computeDescriptors(c, positions, normals);
  const ws = opts.weightSmoothing ?? 2;
  if (ws > 0) smoothWeights(descriptors, adj, c.bones.length, ws);
  const closing = b.maul.sichtbar ? computeClosing(c, positions, descriptors) : { closed: new Float32Array(positions.length), pucker: new Float32Array(positions.length), puckerClose: 0, closeAngle: 0, maxOpenAngle: 0 };
  const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const m = c.mouth;
  return {
    positions,
    normals,
    index,
    descriptors,
    crease,
    closed: closing.closed,
    pucker: closing.pucker,
    puckerClose: closing.puckerClose,
    closeAngle: closing.closeAngle,
    maxOpenAngle: closing.maxOpenAngle,
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
    stats: { vertexCount, triangleCount: index.length / 3, cell, nonManifold: nonManifoldEdges(index, vertexCount), ms: t1 - t0 },
  };
}

function isBauplan(x: unknown): x is Bauplan {
  return !!x && typeof x === 'object' && (x as { schemaVersion?: unknown }).schemaVersion === 1 && 'koerper' in (x as object) && 'maul' in (x as object) && typeof (x as { koerper: { querschnitte?: unknown } }).koerper.querschnitte !== 'undefined';
}
