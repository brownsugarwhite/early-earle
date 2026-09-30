import { Matrix3, Matrix4, Vector3 } from 'three/webgpu';
import type { EarlePlanet } from '@ee/render';
import type { Dome, HeroTreePath, TreeShape } from '@ee/render/earle/tree/index.ts';
import type { SpiralPath, Vec3 } from '@ee/world';
import { segmentOf, type PathDot, type PathLayout, type PathNode, type RibbonSample, type RoutedGround } from './path';

/**
 * Stitches the level path of the whole planet: the routed ground path (`routeGroundPath`) plus the stretch that
 * climbs the giant tree (levels 80–95). On the tree every stone lies ON it — flush on the bark while the path
 * spirals up the trunk, then resting on top of the crown domes — never hovering beside it. Trunk levels are
 * played on the root terrace at the trunk's foot (the plateau cannot stand on the bark); crown levels on the crown.
 *
 * Hook for the giant-tree agent: when `treePath.ts` provides surface positions and normals itself, pass them as
 * `surface` (tree space); the projection below is then skipped.
 */
export interface TreeStretch {
  /** Node indices (0-based) of the stretch on the tree. */
  first: number;
  last: number;
  /** Tree path in tree space (nodes with `phase`/`t`, dots, curve). */
  path: HeroTreePath;
  shape: TreeShape;
  domes: Dome[];
  /** Slot matrix tree space → planet space (unbent). */
  matrix: Matrix4;
  /** Earle world of the tree (palette of its levels). */
  world: number;
  /** Optional: exact surface placements from the tree (tree space), index-aligned with `path.nodes`. */
  surface?: Array<{ position: Vec3; normal: Vec3; on: 'bark' | 'crown' | 'ground' }>;
  /** The tree path's dots already lie on bark and domes (new treePath API): use them as they are. */
  dotsOnSurface?: boolean;
}

export interface LevelPathResult {
  layout: PathLayout;
  /** The same path as the planet's corridor/growth input. */
  spiral: SpiralPath;
}

const _a = new Vector3();
const _b = new Vector3();
const _c = new Vector3();

/** Point and outward normal of the bark at the height and angle of `p` (tree space). */
export function barkPlacement(shape: TreeShape, p: Vector3, lift = 0.03): { position: Vector3; normal: Vector3 } {
  const trunk = shape.trunk;
  const y = Math.min(shape.H, Math.max(0.05, p.y));
  const axis = trunk.axisAt(y, new Vector3());
  const ang = Math.atan2(p.z - axis.z, p.x - axis.x);
  const S = (yy: number, aa: number, out: Vector3): Vector3 => {
    trunk.axisAt(yy, out);
    const r = trunk.surfaceAt(yy, aa);
    return out.set(out.x + Math.cos(aa) * r, out.y, out.z + Math.sin(aa) * r);
  };
  const e = 0.012;
  const ta = S(y, ang + e, _a).sub(S(y, ang - e, _b));
  const ty = S(y + e, ang, _c).sub(S(y - e, ang, _b));
  const normal = new Vector3().crossVectors(ty, ta).normalize();
  const radial = new Vector3(Math.cos(ang), 0, Math.sin(ang));
  if (normal.dot(radial) < 0) normal.negate();
  const position = S(y, ang, new Vector3()).addScaledVector(normal, lift);
  return { position, normal };
}

/**
 * The crown dome the point rests on (the highest dome top below `p` at its x/z) and the dome's normal there
 * (tree space); null when no dome lies under the point.
 */
export function crownPlacement(domes: Dome[], p: Vector3, lift = 0.03): { position: Vector3; normal: Vector3 } | null {
  let best: Dome | null = null;
  let bestY = -Infinity;
  for (const d of domes) {
    const dx = p.x - d.center.x;
    const dz = p.z - d.center.z;
    const q = 1 - (dx * dx + dz * dz) / (d.r * d.r);
    if (q <= 0.02) continue;
    const top = d.center.y + d.r * d.sy * Math.sqrt(q);
    if (top > p.y + 0.4) continue; // an overhanging dome above the path
    if (top > bestY) {
      bestY = top;
      best = d;
    }
  }
  if (!best) return null;
  const position = new Vector3(p.x, bestY, p.z);
  const sy = best.r * best.sy;
  const normal = new Vector3((p.x - best.center.x) / (best.r * best.r), (bestY - best.center.y) / (sy * sy), (p.z - best.center.z) / (best.r * best.r)).normalize();
  position.addScaledVector(normal, lift);
  return { position, normal };
}

function toVec3(v: Vector3): Vec3 {
  return [v.x, v.y, v.z];
}

function lonLat(p: Vec3): { u: number; v: number; lat: number; lon: number } {
  const l = Math.hypot(p[0], p[1], p[2]) || 1;
  const lat = (Math.asin(Math.max(-1, Math.min(1, p[1] / l))) * 180) / Math.PI;
  const lon = (Math.atan2(p[2], p[0]) * 180) / Math.PI;
  return { u: lon / 180, v: lat / 90, lat, lon };
}

/** A ground connector between two planet points: samples on the surface every `step` (end points excluded). */
function groundLine(planet: EarlePlanet, a: Vec3, b: Vec3, step: number, clearA: number, clearB: number): Array<{ position: Vec3; normal: Vec3; t: number; side: Vec3 }> {
  const va = new Vector3(...a);
  const vb = new Vector3(...b);
  const dist = va.distanceTo(vb);
  const n = Math.max(2, Math.ceil(dist / step));
  const out: Array<{ position: Vec3; normal: Vec3; t: number; side: Vec3 }> = [];
  const pos: Vec3 = [0, 0, 0];
  const nor: Vec3 = [0, 0, 0];
  const dir = vb.clone().sub(va).normalize();
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    if (t * dist < clearA || (1 - t) * dist < clearB) continue;
    const d = va.clone().lerp(vb, t).normalize();
    planet.field.surfaceAt(d.x, d.y, d.z, pos, nor);
    const nn = new Vector3(nor[0], nor[1], nor[2]);
    const side = new Vector3().crossVectors(dir, nn).normalize();
    out.push({ position: [pos[0], pos[1], pos[2]], normal: [nor[0], nor[1], nor[2]], t, side: toVec3(side) });
  }
  return out;
}

/** Ribbon samples along a ground connector (same look as the routed ribbon). */
function connectorRibbon(planet: EarlePlanet, a: Vec3, b: Vec3, seg: number, world: number, widen: [number, number]): RibbonSample[] {
  const pts = groundLine(planet, a, b, 0.26, 0, 0);
  const R = planet.options.radius;
  const pos: Vec3 = [0, 0, 0];
  const nor: Vec3 = [0, 0, 0];
  return pts.map((p, i) => {
    const t = p.t;
    const width = Math.max(0.62 + 0.14 * Math.sin(i * 0.35), widen[0] * Math.exp(-Math.pow(t / 0.12, 2)), widen[1] * Math.exp(-Math.pow((1 - t) / 0.12, 2)));
    const edge = (sgn: number): Vec3 => {
      const q = new Vector3(...p.position).addScaledVector(new Vector3(...p.side), (sgn * width) / 2).normalize();
      planet.field.surfaceAt(q.x, q.y, q.z, pos, nor);
      return [pos[0], pos[1], pos[2]];
    };
    const l = Math.hypot(...p.position);
    const amp = Math.max(0.2, planet.field.amplitudeAt(p.position[0] / l, p.position[1] / l, p.position[2] / l));
    return { position: p.position, normal: p.normal, side: p.side, width, seg, u: t, world, heightNorm: Math.min(1, (l - R) / amp), left: edge(1), right: edge(-1) };
  });
}

/**
 * Builds the flow's level path. Without a tree stretch the routed ground path is used as is.
 */
export function buildLevelPath(planet: EarlePlanet, ground: RoutedGround, tree: TreeStretch | null): LevelPathResult {
  const nodes: PathNode[] = ground.nodes.map((n) => {
    const ll = lonLat(n.position);
    return { index: n.index, u: ll.u, v: ll.v, position: n.position, normal: n.normal, s: n.s, site: n.site, world: n.world, rise: n.rise };
  });
  let dots: PathDot[] = ground.dots.map((d) => ({ position: d.position, normal: d.normal, seg: d.seg, u: d.u, on: 'ground' as const }));
  let ribbon: RibbonSample[][] = [ground.ribbon];

  if (tree) {
    const { first, last } = tree;
    const M = tree.matrix;
    const N = new Matrix3().getNormalMatrix(M);
    const toPlanet = (p: Vector3): Vec3 => toVec3(p.clone().applyMatrix4(M));
    const toPlanetN = (n: Vector3): Vec3 => toVec3(n.clone().applyMatrix3(N).normalize());
    const tn = tree.path.nodes;
    // --- nodes on the tree
    const placed: Array<{ position: Vec3; normal: Vec3; on: 'bark' | 'crown' | 'ground'; treePos: Vector3 }> = [];
    for (let j = 0; j <= last - first; j++) {
      const src = tn[j];
      if (!src) break;
      const given = tree.surface?.[j];
      const p = new Vector3(...src.position);
      if (given) {
        placed.push({ position: toPlanet(new Vector3(...given.position)), normal: toPlanetN(new Vector3(...given.normal)), on: given.on, treePos: p });
        continue;
      }
      if (src.phase === 'trunk' && p.y < 0.4) {
        // Root tip on the ground: the stone rests on the terrain.
        const q = new Vector3(...toPlanet(p)).normalize();
        const pos: Vec3 = [0, 0, 0];
        const nor: Vec3 = [0, 0, 0];
        planet.field.surfaceAt(q.x, q.y, q.z, pos, nor);
        placed.push({ position: pos, normal: nor, on: 'ground', treePos: p });
      } else if (src.phase === 'trunk') {
        const b = barkPlacement(tree.shape, p);
        placed.push({ position: toPlanet(b.position), normal: toPlanetN(b.normal), on: 'bark', treePos: b.position });
      } else {
        const c = crownPlacement(tree.domes, p) ?? barkPlacement(tree.shape, p);
        placed.push({ position: toPlanet(c.position), normal: toPlanetN(c.normal), on: 'crown', treePos: c.position });
      }
    }
    // Foot of the tree (planet space) and the radial direction of a tree point for the root terrace.
    const foot = new Vector3(0, 0, 0).applyMatrix4(M);
    placed.forEach((pl, j) => {
      const idx = first + j;
      const node = nodes[idx];
      if (!node) return;
      const ll = lonLat(pl.position);
      node.position = pl.position;
      node.normal = pl.normal;
      node.u = ll.u;
      node.v = ll.v;
      node.site = pl.on === 'bark' ? 'bark' : pl.on === 'crown' ? 'crown' : 'grove';
      node.world = tree.world;
      node.rise = 0;
      delete node.stage;
      if (pl.on === 'bark' || pl.on === 'ground') {
        // Root terrace: out from the trunk in the node's direction, beyond the crown's overhang (a stone on a root tip
        // lies right at the trunk's foot: its plateau would stand against the trunk).
        const axis = tree.shape.trunk.axisAt(Math.max(0.05, pl.treePos.y), new Vector3());
        const radial = new Vector3(pl.treePos.x - axis.x, 0, pl.treePos.z - axis.z).normalize();
        const out = new Vector3(0, 0, 0).addScaledVector(radial, 22).applyMatrix4(M); // tree units → ≈ 8.8 world units
        const dir = out.clone().normalize();
        const pos: Vec3 = [0, 0, 0];
        const nor: Vec3 = [0, 0, 0];
        planet.field.surfaceAt(dir.x, dir.y, dir.z, pos, nor);
        const facing = new Vector3(pos[0], pos[1], pos[2]).sub(foot);
        const nn = new Vector3(...nor);
        facing.addScaledVector(nn, -facing.dot(nn)).normalize();
        const up = new Vector3(0, 1, 0).applyMatrix3(N).normalize();
        node.stage = { position: pos, normal: nor, site: 'grove', facing: toVec3(facing), orbit: { foot: toVec3(foot), up: toVec3(up), radius: out.distanceTo(foot) } };
      } else if (pl.on === 'crown') {
        // The plateau stands on the crown: level with the highest dome top around (neighbouring domes must not poke
        // through the board), its rounded skirt reaching down into the crown.
        const scale = Math.cbrt(Math.abs(M.determinant())) || 1;
        const reach = 3.4 / scale;
        let hi = -Infinity;
        let lo = Infinity;
        for (let k = 0; k <= 16; k++) {
          const a = (k / 16) * Math.PI * 2;
          for (const f of k === 0 ? [0] : [0.45, 1]) {
            const q = new Vector3(pl.treePos.x + Math.cos(a) * reach * f, pl.treePos.y + 40, pl.treePos.z + Math.sin(a) * reach * f);
            const roof = crownPlacement(tree.domes, q, 0);
            const y = roof ? roof.position.y : pl.treePos.y - 3 / scale;
            hi = Math.max(hi, y);
            lo = Math.min(lo, y);
          }
        }
        const up = toPlanetN(new Vector3(0, 1, 0));
        node.stage = { position: pl.position, normal: up, site: 'crown', terrain: [Math.min(-0.6, (lo - pl.treePos.y) * scale - 0.2), Math.max(0, (hi - pl.treePos.y) * scale)] };
      }
    });

    // --- dots on the tree: projected onto bark and domes, segment from the curve parameter
    const curve: Array<{ t: number; p: Vector3 }> = [];
    for (let i = 0; i <= 1200; i++) {
      const t = i / 1200;
      curve.push({ t, p: tree.path.curveAt(t, new Vector3()) });
    }
    const nodeT = tn.slice(0, last - first + 1).map((n) => n.t);
    const treeDots: PathDot[] = [];
    for (const d of tree.path.dots) {
      const p = new Vector3(...d.position);
      let best = 0;
      let bestD = Infinity;
      for (let i = 0; i < curve.length; i++) {
        const dd = curve[i]!.p.distanceToSquared(p);
        if (dd < bestD) {
          bestD = dd;
          best = i;
        }
      }
      const t = curve[best]!.t;
      const su = segmentOf(nodeT, t);
      if (su.seg >= nodeT.length - 1 && t > (nodeT[nodeT.length - 1] ?? 1)) continue;
      const phase = t <= 0.36 ? 'trunk' : 'crown';
      let placedDot: { position: Vector3; normal: Vector3 } | null;
      let on: 'bark' | 'crown' | 'ground';
      if (tree.dotsOnSurface) {
        treeDots.push({ position: toPlanet(p), normal: toPlanetN(new Vector3(...d.normal)), seg: first + su.seg, u: su.u, on: phase === 'trunk' ? 'bark' : 'crown' });
        continue;
      }
      if (phase === 'trunk' && p.y < 0.4) {
        const q = new Vector3(...toPlanet(p)).normalize();
        const pos: Vec3 = [0, 0, 0];
        const nor: Vec3 = [0, 0, 0];
        planet.field.surfaceAt(q.x, q.y, q.z, pos, nor);
        treeDots.push({ position: pos, normal: nor, seg: first + su.seg, u: su.u, on: 'ground' });
        continue;
      } else if (phase === 'trunk') {
        placedDot = barkPlacement(tree.shape, p, 0.02);
        on = 'bark';
      } else {
        placedDot = crownPlacement(tree.domes, p, 0.02);
        on = 'crown';
        if (!placedDot) continue;
      }
      treeDots.push({ position: toPlanet(placedDot.position), normal: toPlanetN(placedDot.normal), seg: first + su.seg, u: su.u, on });
    }

    // --- ground connectors: last ground node → root tip; tree foot → first ground node after the tree
    const before = nodes[first - 1]!;
    const firstTree = nodes[first]!;
    const after = nodes[last + 1];
    const inDots: PathDot[] = groundLine(planet, before.position, firstTree.position, 0.46, 0.6, 0.6).map((p) => ({ position: p.position, normal: p.normal, seg: first - 1, u: p.t, on: 'ground' }));
    let outDots: PathDot[] = [];
    let outRibbon: RibbonSample[] = [];
    if (after) {
      // The hero glides down from the crown; the trail starts again at the edge of the tree's clearing.
      const toAfter = new Vector3(...after.position).sub(foot);
      const edgePoint = foot.clone().addScaledVector(toAfter.clone().normalize(), Math.min(toAfter.length() * 0.6, 6.5));
      const e: Vec3 = toVec3(edgePoint);
      outDots = groundLine(planet, e, after.position, 0.46, 0.2, 0.6).map((p) => ({ position: p.position, normal: p.normal, seg: last, u: 0.45 + 0.55 * p.t, on: 'ground' }));
      outRibbon = connectorRibbon(planet, e, after.position, last, after.world ?? tree.world, [0.5, 1.55]);
    }
    const inRibbon = connectorRibbon(planet, before.position, firstTree.position, first - 1, before.world ?? tree.world, [1.55, 1.2]);
    dots = [
      ...dots.filter((d) => (d.seg ?? 0) < first - 1),
      ...inDots,
      ...treeDots,
      ...outDots,
      ...dots.filter((d) => (d.seg ?? 0) > last),
    ];
    // Strip A ends at the last ground node before the tree (its clearing continues in the connector), strip B
    // starts at the first ground node after it (the connector from the tree's clearing brings its clearing).
    const stripA = ground.ribbon.filter((r) => r.seg < first - 1);
    const stripB = ground.ribbon.filter((r) => r.seg > last);
    for (const r of outRibbon) r.u = 0.45 + 0.55 * r.u;
    ribbon = [[...stripA, ...inRibbon], [...outRibbon, ...stripB]].filter((strip) => strip.length > 1);
  }

  // Arc lengths along the final path (straight between tree nodes).
  let s = 0;
  nodes.forEach((n, i) => {
    if (i > 0) s += Math.hypot(n.position[0] - nodes[i - 1]!.position[0], n.position[1] - nodes[i - 1]!.position[1], n.position[2] - nodes[i - 1]!.position[2]);
    n.s = s;
  });
  const layout: PathLayout = { nodes, dots, length: s, ribbon };
  const spiral: SpiralPath = {
    nodes: nodes.map((n, i) => {
      const ll = lonLat(n.position);
      return { index: n.index, zone: ground.nodes[i]?.zone ?? 0, position: n.position, normal: n.normal, lat: ll.lat, lon: ll.lon };
    }),
    dots: dots.map((d) => ({ position: d.position, normal: d.normal })),
    length: s,
  };
  return { layout, spiral };
}
