import type { CapField, Vec3 } from '@ee/world';

/** One level node on the map: a point on the cap patch (patch space) with its surface normal. */
export interface PathNode {
  index: number;
  /** Gnomonic patch coordinates in [-1, 1]. */
  u: number;
  v: number;
  position: Vec3;
  normal: Vec3;
}

/** A dot of the dotted path between nodes. */
export interface PathDot {
  position: Vec3;
  normal: Vec3;
}

export interface PathLayout {
  nodes: PathNode[];
  dots: PathDot[];
  /** Total path length in world units. */
  length: number;
}

export interface PathOptions {
  /** Serpentine amplitude in uv (0..1). */
  amplitude?: number;
  /** Serpentine cycles across the patch. */
  cycles?: number;
  /** v (gnomonic) where the path starts (near the camera) and ends (far side). */
  vStart?: number;
  vEnd?: number;
  /** Dot spacing along the path in world units. */
  dotSpacing?: number;
  /** No dots closer than this to a node. */
  dotClearance?: number;
}

/**
 * Serpentine level path across the cap patch: nodes at equal arc lengths, dots in between.
 * s ∈ [0, 1] runs from the near edge (v > 0, toward the camera) to the far edge; u swings sideways.
 * Great-circle spirals come with the chunked planet; on one patch a serpentine reads the same way.
 */
export function layoutPath(field: CapField, count: number, opts: PathOptions = {}): PathLayout {
  const amplitude = opts.amplitude ?? 0.5;
  const cycles = opts.cycles ?? 0.85;
  const vStart = opts.vStart ?? 0.6;
  const vEnd = opts.vEnd ?? -0.72;
  const dotSpacing = opts.dotSpacing ?? 0.6;
  const dotClearance = opts.dotClearance ?? 0.95;

  const uvAt = (s: number): [number, number] => [amplitude * Math.sin(Math.PI * 2 * cycles * s - 0.55), vStart + (vEnd - vStart) * s];

  // Fine polyline along the curve with cumulative arc length in world units.
  const steps = 600;
  const samples: Array<{ s: number; pos: Vec3; nor: Vec3; len: number }> = [];
  const pos: Vec3 = [0, 0, 0];
  const nor: Vec3 = [0, 0, 0];
  let total = 0;
  for (let i = 0; i <= steps; i++) {
    const s = i / steps;
    const [u, v] = uvAt(s);
    field.surface(u, v, pos, nor);
    if (i > 0) {
      const p = samples[i - 1]!.pos;
      total += Math.hypot(pos[0] - p[0], pos[1] - p[1], pos[2] - p[2]);
    }
    samples.push({ s, pos: [pos[0], pos[1], pos[2]], nor: [nor[0], nor[1], nor[2]], len: total });
  }

  const at = (len: number): { s: number; pos: Vec3; nor: Vec3 } => {
    const target = Math.min(total, Math.max(0, len));
    let lo = 0;
    let hi = samples.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (samples[mid]!.len <= target) lo = mid;
      else hi = mid;
    }
    const a = samples[lo]!;
    const b = samples[hi]!;
    const t = b.len > a.len ? (target - a.len) / (b.len - a.len) : 0;
    return {
      s: a.s + (b.s - a.s) * t,
      pos: [a.pos[0] + (b.pos[0] - a.pos[0]) * t, a.pos[1] + (b.pos[1] - a.pos[1]) * t, a.pos[2] + (b.pos[2] - a.pos[2]) * t],
      nor: [a.nor[0] + (b.nor[0] - a.nor[0]) * t, a.nor[1] + (b.nor[1] - a.nor[1]) * t, a.nor[2] + (b.nor[2] - a.nor[2]) * t],
    };
  };

  const n = Math.max(1, count);
  const nodes: PathNode[] = [];
  for (let i = 0; i < n; i++) {
    const len = n > 1 ? (i / (n - 1)) * total : 0;
    const { s } = at(len);
    // Evaluate the exact surface point for the interpolated s (position and normal stay exact).
    const [u, v] = uvAt(s);
    field.surface(u, v, pos, nor);
    nodes.push({ index: i, u, v, position: [pos[0], pos[1], pos[2]], normal: [nor[0], nor[1], nor[2]] });
  }

  const dots: PathDot[] = [];
  for (let len = dotSpacing * 0.5; len < total; len += dotSpacing) {
    const { pos: p, nor: nn } = at(len);
    let nearNode = false;
    for (const node of nodes) {
      const d = Math.hypot(p[0] - node.position[0], p[1] - node.position[1], p[2] - node.position[2]);
      if (d < dotClearance) {
        nearNode = true;
        break;
      }
    }
    if (nearNode) continue;
    const l = Math.hypot(nn[0], nn[1], nn[2]) || 1;
    dots.push({ position: [p[0], p[1], p[2]], normal: [nn[0] / l, nn[1] / l, nn[2] / l] });
  }

  return { nodes, dots, length: total };
}

/** Squared distance helper for corridor clearing (trees near nodes/dots are removed). */
export function distanceToPath(p: Vec3, layout: PathLayout): number {
  let best = Infinity;
  for (const node of layout.nodes) {
    const d = Math.hypot(p[0] - node.position[0], p[1] - node.position[1], p[2] - node.position[2]);
    if (d < best) best = d;
  }
  for (const dot of layout.dots) {
    const d = Math.hypot(p[0] - dot.position[0], p[1] - dot.position[1], p[2] - dot.position[2]);
    if (d < best) best = d;
  }
  return best;
}
