import { Vector3 } from 'three/webgpu';
import type { EarlePlanet, PathCorridor } from '@ee/render';
import type { Dome, TreeShape } from '@ee/render/earle/tree/index.ts';
import type { PlanePathNode, Vec3 } from '@ee/world';
import type { HeroTreeSite } from '../lab/earle/heroTreeSite';
import { segmentOf, type PathDot, type PathLayout, type PathNode, type PathWindow, type RibbonSample } from './path';

/**
 * The flow's level path on the infinite plane (ADR 0002, Route 15 + 1): the routed ground path of `@ee/world`
 * (`PlanePath`, per path segment, random access up to the gate node) plus the stretch that climbs the giant tree
 * (levels 99–114, `TREE_RANGE`). On the tree every stone lies ON it — flush on the bark while the path spirals up the
 * trunk, then resting on the crown domes — never hovering beside it. Trunk levels are played on the root terrace at the
 * trunk's foot; crown levels on the crown. Nodes without a level file and the gate node of the hinted zone 16 are
 * locked ("bald") stones; the path ends at the gate (`lastNode`).
 *
 * All positions in plane coordinates `[x, h, z]`. Windows (`window(first, last)`) feed the path renderer; `corridor`
 * keeps the scatter off the final path (stones on the tree, connectors to and from it).
 */

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

interface Connector {
  dots: PathDot[];
  ribbon: RibbonSample[];
}

/** Path segments kept in the per-segment caches (corridor points). */
const CACHE = 64;

export class FlowPath implements PathLayout {
  /** Last playable node (0-based): the last route level that has a level file. */
  readonly lastPlayable: number;
  /** Last node at all (0-based): the gate node of the hinted zone (the path ends there). */
  readonly lastNode: number;
  /** The gate node (0-based), −1 without one. */
  readonly gateNode: number;
  /** Node range on the giant tree (−1 without the tree). */
  readonly treeFirst: number;
  readonly treeLast: number;
  private readonly nodes = new Map<number, PathNode>();
  private readonly corridors = new Map<number, PathCorridor>();
  private treeDots: PathDot[] = [];
  private inConn: Connector | null = null;
  private outConn: Connector | null = null;
  private readonly treeWorld: number;

  constructor(
    readonly planet: EarlePlanet,
    readonly site: HeroTreeSite | null,
    treeWorld = 0,
    /** Levels with a file (`LEVELS.length`): later route nodes stay locked until their files exist. */
    playable = Number.POSITIVE_INFINITY,
  ) {
    this.lastPlayable = Math.min(planet.lastAuthoredNode, playable - 1);
    this.lastNode = planet.lastNode;
    const gate = planet.layout.gateLevel;
    this.gateNode = gate !== null && Number.isFinite(this.lastNode) ? gate - 1 : -1;
    this.treeWorld = treeWorld;
    this.treeFirst = site ? site.first : -1;
    this.treeLast = site ? site.last : -1;
    if (site) this.buildTree(site);
  }

  /** Is node `i` on the giant tree (drawn by the tree's own markers)? */
  isTreeNode(i: number): boolean {
    return this.site !== null && i >= this.treeFirst && i <= this.treeLast;
  }

  /** Node i (0-based), clamped to [0, lastNode] (no nodes behind the gate). */
  node(index: number): PathNode {
    const i = Math.max(0, Math.min(Math.floor(index), this.lastNode));
    let n = this.nodes.get(i);
    if (n) return n;
    n = this.isTreeNode(i) ? this.treeNode(i) : this.groundNode(this.planet.path.node(i));
    if (this.nodes.size > 600) {
      const oldest = this.nodes.keys().next().value;
      if (oldest !== undefined) this.nodes.delete(oldest);
    }
    this.nodes.set(i, n);
    return n;
  }

  private groundNode(g: PlanePathNode): PathNode {
    const node: PathNode = {
      index: g.index,
      position: g.position,
      normal: g.normal,
      s: g.s,
      site: g.site,
      world: g.world,
      rise: g.rise,
      ...(g.index > this.lastPlayable ? { locked: true } : {}),
      ...(g.index === this.gateNode ? { gate: true } : {}),
    };
    const lm = g.landmark;
    if (lm) {
      // Level oben auf dem Wahrzeichen: das Plateau steht auf dem Anker (Fels, Terrasse, Insel), die Levelkamera kommt
      // von der offenen Seite
      const a = lm.anchor;
      node.landmark = lm;
      node.stage = {
        position: [a.position[0], a.position[1], a.position[2]],
        normal: [0, 1, 0],
        site: a.site === 'island' ? 'shore' : 'ledge',
        facing: [a.facing[0], 0, a.facing[1]],
        terrain: [-0.6, 0.05],
      };
    }
    return node;
  }

  /** Nearest node to a point of the plane (ground path and the tree's nodes). */
  nearestNode(x: number, z: number): number {
    let best = this.planet.path.nearestNode(x, z);
    if (this.site) {
      const g = this.node(best).position;
      let bestD = Math.hypot(g[0] - x, g[2] - z);
      for (let i = this.treeFirst; i <= this.treeLast; i++) {
        const p = this.node(i).position;
        const d = Math.hypot(p[0] - x, p[2] - z);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
    }
    return best;
  }

  // --- windows -------------------------------------------------------------------------------------------------

  /** Knoten, Punkte und Lichtband der Knoten [first, last] (Punkte und Band ab dem Zugang zu `first`). */
  window(first: number, last: number): PathWindow {
    const a = Math.max(0, Math.min(Math.floor(first), this.lastNode));
    const b = Math.max(a, Math.min(Math.floor(last), this.lastNode));
    const nodes: PathNode[] = [];
    for (let i = a; i <= b; i++) nodes.push(this.node(i));
    const dots = this.dotsInRange(a - 1, b);
    const ribbon = this.ribbonInRange(a - 1, b);
    return { first: a, nodes, dots, ribbon };
  }

  /** Path segments whose ground data can hold seg values in [a, b]. */
  private segmentsFor(a: number, b: number): number[] {
    const layout = this.planet.layout;
    const k0 = layout.segmentOfLevel(Math.max(1, Math.min(a, this.lastNode) + 1));
    const k1 = layout.segmentOfLevel(Math.max(1, Math.min(b, this.lastNode) + 1));
    const out: number[] = [];
    for (let k = Math.max(0, k0 - 1); k <= k1; k++) out.push(k);
    return out;
  }

  private inTree(seg: number): boolean {
    return this.site !== null && seg >= this.treeFirst - 1 && seg <= this.treeLast;
  }

  /** Dots whose segment (node before the dot) lies in [a, b], the tree stretch spliced in. */
  private dotsInRange(a: number, b: number): PathDot[] {
    const out: PathDot[] = [];
    for (const k of this.segmentsFor(a, b)) {
      for (const d of this.planet.path.segment(k).dots) {
        if (d.seg < a || d.seg > b || this.inTree(d.seg)) continue;
        out.push(d);
      }
    }
    if (this.site && b >= this.treeFirst - 1 && a <= this.treeLast) {
      for (const list of [this.inConn?.dots ?? [], this.treeDots, this.outConn?.dots ?? []]) {
        for (const d of list) if ((d.seg ?? 0) >= a && (d.seg ?? 0) <= b) out.push(d);
      }
    }
    return out;
  }

  /** Ribbon strips for segments [a, b]: one strip, or two around the giant tree (connectors bring their clearings). */
  private ribbonInRange(a: number, b: number): RibbonSample[][] {
    const before: RibbonSample[] = [];
    const after: RibbonSample[] = [];
    const tree = this.site !== null;
    for (const k of this.segmentsFor(a, b)) {
      for (const r of this.planet.path.segment(k).ribbon) {
        if (r.seg < a || r.seg > b) continue;
        if (tree && this.inTree(r.seg)) continue;
        if (tree && r.seg > this.treeLast) after.push(r);
        else before.push(r);
      }
    }
    if (!tree || b < this.treeFirst - 1 || a > this.treeLast) return [[...before, ...after]].filter((s) => s.length > 1);
    const inR = (this.inConn?.ribbon ?? []).filter((r) => r.seg >= a && r.seg <= b);
    const outR = (this.outConn?.ribbon ?? []).filter((r) => r.seg >= a && r.seg <= b);
    return [
      [...before, ...inR],
      [...outR, ...after],
    ].filter((s) => s.length > 1);
  }

  // --- corridor (scatter clearing) ---------------------------------------------------------------------------

  /** Knoten und Punkte des endgültigen Pfads in einem Rechteck der Ebene. */
  corridor(x0: number, z0: number, x1: number, z1: number): PathCorridor {
    const out: PathCorridor = { nodes: [], dots: [] };
    const layout = this.planet.layout;
    const k0 = layout.segmentAtDistance(-z1) - 1;
    // Abschnitte hinter dem Tor tragen keinen Pfad (wie das Vorland)
    const k1 = Math.min(layout.segmentAtDistance(-z0) + 1, layout.lastSegment);
    for (let k = Math.max(0, k0); k <= k1; k++) {
      const c = this.segmentCorridor(k);
      for (const n of c.nodes) if (n[0] >= x0 && n[0] <= x1 && n[1] >= z0 && n[1] <= z1) out.nodes.push(n);
      for (const d of c.dots) if (d[0] >= x0 && d[0] <= x1 && d[1] >= z0 && d[1] <= z1) out.dots.push(d);
    }
    return out;
  }

  private segmentCorridor(k: number): PathCorridor {
    const hit = this.corridors.get(k);
    if (hit) return hit;
    const seg = this.planet.layout.segment(k);
    const firstIndex = Math.max(0, seg.firstLevel - 1);
    const c: PathCorridor = { nodes: [], dots: [] };
    if (seg.levels > 0) {
      const last = firstIndex + seg.levels - 1;
      for (let i = firstIndex; i <= last; i++) {
        const p = this.node(i).position;
        c.nodes.push([p[0], p[2]]);
      }
      for (const d of this.dotsInRange(firstIndex, last)) c.dots.push([d.position[0], d.position[2]]);
    }
    if (this.corridors.size > CACHE) {
      const oldest = this.corridors.keys().next().value;
      if (oldest !== undefined) this.corridors.delete(oldest);
    }
    this.corridors.set(k, c);
    return c;
  }

  // --- the giant tree ------------------------------------------------------------------------------------------

  private treeNode(i: number): PathNode {
    const site = this.site!;
    const j = i - site.first;
    const tn = site.path.nodes[j]!;
    const local = site.tree.path.nodes[j]!;
    const on = local.surface === 'dome' ? 'crown' : local.surface === 'root' ? 'ground' : 'bark';
    const before = this.planet.path.node(site.first - 1);
    const after = this.planet.path.node(site.last + 1);
    const s = before.s + ((after.s - before.s) * (j + 1)) / (site.last - site.first + 2);
    const node: PathNode = {
      index: i,
      position: tn.position,
      normal: tn.normal,
      s,
      site: on === 'bark' ? 'bark' : on === 'crown' ? 'crown' : 'grove',
      world: this.treeWorld,
      rise: 0,
    };
    const M = site.matrix;
    const treePos = new Vector3(local.position[0], local.position[1], local.position[2]);
    const foot = new Vector3(0, 0, 0).applyMatrix4(M);
    if (on === 'bark' || on === 'ground') {
      // Root terrace: out from the trunk in the node's direction, beyond the crown's overhang (a stone on a root tip
      // lies right at the trunk's foot: its plateau would stand against the trunk)
      const axis = site.tree.shape.trunk.axisAt(Math.max(0.05, treePos.y), new Vector3());
      const radial = new Vector3(treePos.x - axis.x, 0, treePos.z - axis.z).normalize();
      const out = new Vector3(0, 0, 0).addScaledVector(radial, 22).applyMatrix4(M); // tree units → ≈ 8.8 world units
      const pos: Vec3 = [0, 0, 0];
      const nor: Vec3 = [0, 0, 0];
      this.planet.surfaceAt(out.x, out.z, pos, nor);
      const facing = new Vector3(pos[0] - foot.x, 0, pos[2] - foot.z).normalize();
      node.stage = {
        position: pos,
        normal: [0, 1, 0],
        site: 'grove',
        facing: [facing.x, 0, facing.z],
        orbit: { foot: [foot.x, foot.y, foot.z], up: [0, 1, 0], radius: Math.hypot(out.x - foot.x, out.z - foot.z) },
      };
    } else {
      // The plateau stands on the crown: level with the highest dome top around (neighbouring domes must not poke
      // through the board), its rounded skirt reaching down into the crown
      const scale = Math.cbrt(Math.abs(M.determinant())) || 1;
      const reach = 3.4 / scale;
      let hi = -Infinity;
      let lo = Infinity;
      for (let k = 0; k <= 16; k++) {
        const a = (k / 16) * Math.PI * 2;
        for (const f of k === 0 ? [0] : [0.45, 1]) {
          const q = new Vector3(treePos.x + Math.cos(a) * reach * f, treePos.y + 40, treePos.z + Math.sin(a) * reach * f);
          const roof = crownPlacement(site.tree.shape.domes, q, 0);
          const y = roof ? roof.position.y : treePos.y - 3 / scale;
          hi = Math.max(hi, y);
          lo = Math.min(lo, y);
        }
      }
      node.stage = { position: tn.position, normal: [0, 1, 0], site: 'crown', terrain: [Math.min(-0.6, (lo - treePos.y) * scale - 0.2), Math.max(0, (hi - treePos.y) * scale)] };
    }
    return node;
  }

  /** Tree dots (seg/u from the tree curve) and the two ground connectors. */
  private buildTree(site: HeroTreeSite): void {
    const first = site.first;
    const last = site.last;
    const count = last - first + 1;
    // --- dots on the tree: segment from the curve parameter (tree space), positions from the plane path
    const curve: Array<{ t: number; p: Vector3 }> = [];
    for (let i = 0; i <= 1200; i++) {
      const t = i / 1200;
      curve.push({ t, p: site.tree.path.curveAt(t, new Vector3()) });
    }
    const nodeT = site.tree.path.nodes.slice(0, count).map((n) => n.t);
    const treeDots: PathDot[] = [];
    site.tree.path.dots.forEach((d, di) => {
      const p = new Vector3(d.position[0], d.position[1], d.position[2]);
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
      if (su.seg >= nodeT.length - 1 && t > (nodeT[nodeT.length - 1] ?? 1)) return;
      const pd = site.path.dots[di]!;
      treeDots.push({ position: pd.position, normal: pd.normal, seg: first + su.seg, u: su.u, on: t <= 0.36 ? 'bark' : 'crown' });
    });
    this.treeDots = treeDots;

    // --- ground connectors: last ground node → root tip; the edge of the tree's clearing → first ground node after it
    const before = this.planet.path.node(first - 1);
    const after = this.planet.path.node(last + 1);
    const firstTree = site.path.nodes[0]!.position;
    const inDots: PathDot[] = this.groundLine(before.position, firstTree, 0.46, 0.6, 0.6).map((p) => ({ position: p.position, normal: p.normal, seg: first - 1, u: p.t, on: 'ground' }));
    this.inConn = { dots: inDots, ribbon: this.connectorRibbon(before.position, firstTree, first - 1, before.world, [1.55, 1.2]) };
    // The hero glides down from the crown; the trail starts again at the edge of the tree's clearing
    const foot = site.slot.position;
    const tx = after.position[0] - foot[0];
    const tz = after.position[2] - foot[2];
    const tl = Math.hypot(tx, tz) || 1;
    const reach = Math.min(tl * 0.6, 6.5);
    const ex = foot[0] + (tx / tl) * reach;
    const ez = foot[2] + (tz / tl) * reach;
    const e: Vec3 = [ex, this.planet.heightAt(ex, ez), ez];
    const outDots: PathDot[] = this.groundLine(e, after.position, 0.46, 0.2, 0.6).map((p) => ({ position: p.position, normal: p.normal, seg: last, u: 0.45 + 0.55 * p.t, on: 'ground' }));
    const outRibbon = this.connectorRibbon(e, after.position, last, after.world, [0.5, 1.55]);
    for (const r of outRibbon) r.u = 0.45 + 0.55 * r.u;
    this.outConn = { dots: outDots, ribbon: outRibbon };
  }

  /** A ground connector between two plane points: samples on the surface every `step` (end points excluded). */
  private groundLine(a: Vec3, b: Vec3, step: number, clearA: number, clearB: number): Array<{ position: Vec3; normal: Vec3; t: number; side: Vec3 }> {
    const dx = b[0] - a[0];
    const dz = b[2] - a[2];
    const dist = Math.hypot(dx, dz);
    const n = Math.max(2, Math.ceil(dist / step));
    const out: Array<{ position: Vec3; normal: Vec3; t: number; side: Vec3 }> = [];
    const l = dist || 1;
    // right of the running direction t = (dx, dz): (−t_z, t_x)
    const side: Vec3 = [-dz / l, 0, dx / l];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      if (t * dist < clearA || (1 - t) * dist < clearB) continue;
      const pos: Vec3 = [0, 0, 0];
      const nor: Vec3 = [0, 0, 0];
      this.planet.surfaceAt(a[0] + dx * t, a[2] + dz * t, pos, nor);
      out.push({ position: pos, normal: nor, t, side });
    }
    return out;
  }

  /** Ribbon samples along a ground connector (same look as the routed ribbon). */
  private connectorRibbon(a: Vec3, b: Vec3, seg: number, world: number | undefined, widen: [number, number]): RibbonSample[] {
    const pts = this.groundLine(a, b, 0.26, 0, 0);
    const w = world ?? this.treeWorld;
    return pts.map((p, i) => {
      const t = p.t;
      const width = Math.max(0.62 + 0.14 * Math.sin(i * 0.35), widen[0] * Math.exp(-Math.pow(t / 0.12, 2)), widen[1] * Math.exp(-Math.pow((1 - t) / 0.12, 2)));
      const edge = (sgn: number): Vec3 => {
        const pos: Vec3 = [0, 0, 0];
        const nor: Vec3 = [0, 0, 0];
        this.planet.surfaceAt(p.position[0] + (p.side[0] * sgn * width) / 2, p.position[2] + (p.side[2] * sgn * width) / 2, pos, nor);
        return pos;
      };
      const amp = Math.max(0.2, this.planet.field.amplitudeAt(p.position[0], p.position[2]));
      return { position: p.position, normal: p.normal, side: p.side, width, seg, u: t, world: w, heightNorm: Math.min(1, Math.max(0, p.position[1] / amp)), left: edge(1), right: edge(-1) };
    });
  }
}
