import { describe, expect, it } from 'vitest';
import { Matrix4, Quaternion, Vector3 } from 'three/webgpu';
import { tubeLength, tubePointAt, tubeRadiusAt } from './curve';
import { computeTreeShape, type Dome, type TreeShape } from './shape';
import { HERO_NODE_MOTION, heroNodeScale, heroTreePath, transformHeroTreePath, type HeroPathNode } from './treePath';

const v = (a: ArrayLike<number>) => new Vector3(a[0]!, a[1]!, a[2]!);

/** Implicit value of a dome ellipsoid at p (1 = on the surface). */
function domeValue(d: Dome, p: Vector3): number {
  return Math.sqrt(((p.x - d.center.x) / d.r) ** 2 + ((p.y - d.center.y) / (d.r * d.sy)) ** 2 + ((p.z - d.center.z) / d.r) ** 2);
}

/** Distance of p from the surface of a tube (limb/root): |distance to centreline − radius|, minimum over the tube. */
function tubeSurfaceDistance(shape: TreeShape, p: Vector3, kind: 'limb' | 'root'): number {
  const tubes = kind === 'root' ? shape.trunk.roots : shape.limbs.map((l) => l.curve);
  let best = Infinity;
  const q = new Vector3();
  for (const c of tubes) {
    const len = tubeLength(c);
    for (let s = 0; s <= len; s += 0.05) {
      tubePointAt(c, s, q);
      best = Math.min(best, Math.abs(q.distanceTo(p) - tubeRadiusAt(c, s)));
    }
  }
  return best;
}

/** How far p is from the surface it claims to lie on (tree units). */
function surfaceDistance(shape: TreeShape, n: Pick<HeroPathNode, 'surface' | 'position'>): number {
  const p = v(n.position);
  if (n.surface === 'bark') {
    const a = shape.trunk.axisAt(p.y, new Vector3());
    const ang = Math.atan2(p.z - a.z, p.x - a.x);
    return Math.abs(Math.hypot(p.x - a.x, p.z - a.z) - shape.trunk.surfaceAt(p.y, ang));
  }
  if (n.surface === 'dome') {
    let onOne = Infinity;
    for (const d of shape.domes) onOne = Math.min(onOne, Math.abs(domeValue(d, p) - 1) * d.r * d.sy);
    return onOne;
  }
  return tubeSurfaceDistance(shape, p, n.surface);
}

describe('heroTreePath: nodes lie on the tree', () => {
  const shape = computeTreeShape();
  const path = heroTreePath({ nodes: 16, shape });

  it('is deterministic (default options = precomputed shape)', () => {
    const again = heroTreePath({ nodes: 16 });
    expect(again.nodes.map((n) => n.position)).toEqual(path.nodes.map((n) => n.position));
    expect(again.length).toBeCloseTo(path.length, 6);
  });

  it('walks root → spiral on the bark → ramp limb → dome crests to the top dome', () => {
    expect(path.nodes).toHaveLength(16);
    const order = ['root', 'bark', 'limb', 'dome'];
    const surfaces = path.nodes.map((n) => n.surface);
    for (let i = 1; i < surfaces.length; i++) expect(order.indexOf(surfaces[i]!)).toBeGreaterThanOrEqual(order.indexOf(surfaces[i - 1]!));
    expect(surfaces[0]).toBe('root');
    expect(surfaces.at(-1)).toBe('dome');
    // most of the climb happens around the trunk and on the crown
    expect(surfaces.filter((s) => s === 'bark').length).toBeGreaterThanOrEqual(4);
    expect(surfaces.filter((s) => s === 'dome').length).toBeGreaterThanOrEqual(5);
    // the last node rests on the top of the crown
    expect(path.nodes.at(-1)!.position[1]).toBeGreaterThan(shape.crownTop - 1);
    // the bark spiral climbs
    const bark = path.nodes.filter((n) => n.surface === 'bark');
    for (let i = 1; i < bark.length; i++) expect(bark[i]!.position[1]).toBeGreaterThan(bark[i - 1]!.position[1]);
  });

  it('every node touches its surface (no hover): distance < 0.06 tree units', () => {
    for (const n of path.nodes) expect(surfaceDistance(shape, n)).toBeLessThan(0.06);
  });

  it('no node is buried: dome nodes lie on top of the dome union', () => {
    for (const n of path.nodes.filter((x) => x.surface === 'dome')) {
      const p = v(n.position);
      for (const d of shape.domes) expect(domeValue(d, p)).toBeGreaterThan(0.985);
    }
  });

  it('dots lie on the surfaces too (small chord tolerance)', () => {
    let worst = 0;
    for (const d of path.dots) {
      const p = v(d.position);
      const a = shape.trunk.axisAt(p.y, new Vector3());
      const ang = Math.atan2(p.z - a.z, p.x - a.x);
      let best = Math.abs(Math.hypot(p.x - a.x, p.z - a.z) - shape.trunk.surfaceAt(p.y, ang));
      for (const dm of shape.domes) best = Math.min(best, Math.abs(domeValue(dm, p) - 1) * dm.r * dm.sy);
      if (best > 0.1) best = Math.min(best, tubeSurfaceDistance(shape, p, 'limb'), tubeSurfaceDistance(shape, p, 'root'));
      worst = Math.max(worst, best);
    }
    expect(worst).toBeLessThan(0.12);
  });

  it('frames: unit normal pointing out of the surface, tangent in the tangent plane, binormal = n × t', () => {
    for (const n of path.nodes) {
      const N = v(n.normal);
      const T = v(n.tangent);
      const B = v(n.binormal);
      expect(N.length()).toBeCloseTo(1, 4);
      expect(T.length()).toBeCloseTo(1, 4);
      expect(Math.abs(N.dot(T))).toBeLessThan(1e-3);
      expect(B.distanceTo(new Vector3().crossVectors(N, T))).toBeLessThan(1e-3);
      expect(v(n.seat).length()).toBeCloseTo(1, 4);
      const p = v(n.position);
      if (n.surface === 'bark') {
        const a = shape.trunk.axisAt(p.y, new Vector3());
        expect(N.x * (p.x - a.x) + N.z * (p.z - a.z)).toBeGreaterThan(0);
      }
      if (n.surface === 'dome') expect(N.dot(p.clone().sub(shape.domes[n.dome]!.center))).toBeGreaterThan(0);
      // the tangent points along the path
      if (n.t < 0.999) expect(T.dot(path.curveAt(n.t + 0.004, new Vector3()).sub(p))).toBeGreaterThan(0);
    }
  });

  it('camera rail: continuous, never inside the tree, frames each node from outside', () => {
    const a = new Vector3();
    const b = new Vector3();
    const la = new Vector3();
    const lb = new Vector3();
    let maxStep = 0;
    let minClear = Infinity;
    for (let i = 0; i <= 1200; i++) {
      path.sampleRail(i / 1200, a, la);
      path.sampleRail(Math.min(1, (i + 1) / 1200), b, lb);
      maxStep = Math.max(maxStep, a.distanceTo(b));
      minClear = Math.min(minClear, path.clearance(a));
      expect(shape.insideCanopy(a, 0.3)).toBe(false);
      expect(Number.isFinite(a.x + a.y + a.z + la.x + la.y + la.z)).toBe(true);
    }
    expect(maxStep).toBeLessThan(1.5);
    expect(minClear).toBeGreaterThan(0.5);
    const cam = new Vector3();
    const look = new Vector3();
    for (const n of path.nodes) {
      path.railFor(n.index, cam, look);
      expect(path.railTForNode(n.index)).toBeCloseTo(n.t, 6);
      const p = v(n.position);
      expect(cam.distanceTo(p)).toBeGreaterThan(4);
      expect(cam.distanceTo(p)).toBeLessThan(24);
      expect(look.distanceTo(p)).toBeLessThan(6);
      expect(cam.y).toBeGreaterThan(shape.trunk.groundY(cam.x, cam.z) + 1);
    }
  });

  it('map framing (wider rail, as the planet site uses it) stays clear of the tree too', () => {
    const wide = heroTreePath({ nodes: 16, shape, rail: { trunkDistance: 18, crownDistance: 28 } });
    const a = new Vector3();
    const la = new Vector3();
    let minClear = Infinity;
    for (let i = 0; i <= 1200; i++) {
      wide.sampleRail(i / 1200, a, la);
      minClear = Math.min(minClear, wide.clearance(a));
      expect(shape.insideCanopy(a, 0.3)).toBe(false);
    }
    expect(minClear).toBeGreaterThan(0.5);
    // the nodes themselves do not depend on the camera
    expect(wide.nodes.map((n) => n.position)).toEqual(path.nodes.map((n) => n.position));
  });

  it('colliders: negative inside the trunk and the domes, positive in the open', () => {
    const inTrunk = shape.trunk.axisAt(4, new Vector3());
    expect(path.clearance(inTrunk)).toBeLessThan(0);
    expect(path.clearance(shape.domes.at(-1)!.center)).toBeLessThan(0);
    expect(path.clearance(new Vector3(60, 40, 60))).toBeGreaterThan(1);
    expect(path.colliders.filter((c) => c.kind === 'ellipsoid')).toHaveLength(shape.domes.length);
    const p = inTrunk.clone();
    path.pushOut(p, 1);
    expect(path.clearance(p)).toBeGreaterThanOrEqual(0.9);
  });

  it('exit: down the canopy and along the ground limb until it rests on the ground', () => {
    expect(path.exit).not.toBeNull();
    const exit = path.exit!;
    expect(exit.dots.length).toBeGreaterThan(10);
    const g = v(exit.ground);
    expect(Math.abs(g.y - shape.trunk.groundY(g.x, g.z))).toBeLessThan(0.05);
    const last = v(exit.dots.at(-1)!.position);
    expect(last.y - shape.trunk.groundY(last.x, last.z)).toBeLessThan(1.2);
  });

  it('node motion stays attached: no hover, breathing and sprouting scale around the surface point', () => {
    expect(HERO_NODE_MOTION.hover).toBe(0);
    expect(heroNodeScale(HERO_NODE_MOTION, 10, false)).toBe(1);
    expect(heroNodeScale(HERO_NODE_MOTION, 10, false, 10)).toBe(0);
    expect(heroNodeScale(HERO_NODE_MOTION, 10 + HERO_NODE_MOTION.sprout, false, 10)).toBeCloseTo(1, 6);
    for (let t = 0; t < 5; t += 0.1) {
      const s = heroNodeScale(HERO_NODE_MOTION, t, true);
      expect(s).toBeLessThanOrEqual(1 + HERO_NODE_MOTION.breathAmplitude + 1e-9);
      expect(s).toBeGreaterThanOrEqual(1 - HERO_NODE_MOTION.breathAmplitude - 1e-9);
    }
  });

  it('transformHeroTreePath moves nodes, frames, rail, colliders and the exit into a slot space', () => {
    const m = new Matrix4().compose(new Vector3(10, 40, -3), new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), 0.4), new Vector3(0.5, 0.5, 0.5));
    const t = transformHeroTreePath(path, m);
    const p0 = v(path.nodes[5]!.position).applyMatrix4(m);
    expect(t.nodes[5]!.position[0]).toBeCloseTo(p0.x, 5);
    expect(t.nodes[5]!.position[1]).toBeCloseTo(p0.y, 5);
    expect(v(t.nodes[5]!.normal).length()).toBeCloseTo(1, 5);
    expect(Math.abs(v(t.nodes[5]!.normal).dot(v(t.nodes[5]!.tangent)))).toBeLessThan(1e-3);
    expect(t.length).toBeCloseTo(path.length * 0.5, 4);
    const c = t.curveAt(0.5, new Vector3());
    const c0 = path.curveAt(0.5, new Vector3()).applyMatrix4(m);
    expect(c.distanceTo(c0)).toBeLessThan(1e-6);
    // clearance scales with the slot: 2 units off the trunk in tree space = 1 unit off in slot space
    const probe = shape.trunk.axisAt(5, new Vector3()).add(new Vector3(shape.trunk.radiusAt(5) + 2, 0, 0));
    expect(t.clearance(probe.clone().applyMatrix4(m))).toBeCloseTo(path.clearance(probe) * 0.5, 4);
    expect(v(t.exit!.ground).distanceTo(v(path.exit!.ground).applyMatrix4(m))).toBeLessThan(1e-5);
  });

  it('robust across seeds: the walk lies on the tree, the rail is smooth and never clips', () => {
    for (let seed = 1; seed <= 8; seed++) {
      const sh = computeTreeShape({ seed });
      const p = heroTreePath({ nodes: 16, shape: sh });
      expect(p.nodes[0]!.surface).toBe('root');
      expect(p.nodes.at(-1)!.surface).toBe('dome');
      expect(p.nodes.at(-1)!.position[1]).toBeGreaterThan(sh.crownTop - 1);
      for (const n of p.nodes) expect(surfaceDistance(sh, n)).toBeLessThan(0.06);
      const a = new Vector3();
      const b = new Vector3();
      const l = new Vector3();
      let maxStep = 0;
      let minClear = Infinity;
      for (let i = 0; i <= 600; i++) {
        p.sampleRail(i / 600, a, l);
        if (i > 0) maxStep = Math.max(maxStep, a.distanceTo(b));
        b.copy(a);
        minClear = Math.min(minClear, p.clearance(a));
      }
      expect(minClear).toBeGreaterThan(0.8);
      expect(maxStep).toBeLessThan(2);
    }
  });

  it('on a planet slot the roots and the first node follow the curved ground', () => {
    const curved = computeTreeShape({ groundRadius: 80 });
    const p = heroTreePath({ nodes: 16, shape: curved });
    const first = v(p.nodes[0]!.position);
    expect(first.y).toBeLessThan(0);
    expect(Math.abs(first.y - curved.trunk.groundY(first.x, first.z))).toBeLessThan(2.5);
    for (const tip of curved.trunk.rootTips) expect(tip.y).toBeLessThan(curved.trunk.groundY(tip.x, tip.z) + 2.5);
  });
});
