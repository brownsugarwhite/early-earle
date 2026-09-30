import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three/webgpu';
import { parseGenomeRules, type GenomeRulesInput } from '@ee/genome';
import type { CollectionEntry } from '../state/progress';

const rules = parseGenomeRules(JSON.parse(readFileSync(new URL('../../../../content/genome/rules.json', import.meta.url), 'utf8')) as GenomeRulesInput);

// The app's content modules use Vite globs; the map creatures only need the rules and (optionally) the module library.
vi.mock('../lab/creature/content', () => ({ BUNDLED_RULES: rules }));
vi.mock('./LevelBoard', () => ({ creatureLibrary: async () => null }));

const { createMapCreatures, LIVE_IN, LIVE_OUT, mapScaleForTier } = await import('./MapCreatures');
type MapGround = import('./MapCreatures').MapGround;
type GroundFrame = import('./MapCreatures').GroundFrame;

/** A rolling test ground: hills, a display bend like the map's curvature boost, a movable focus. */
function testGround(focus: Vector3): MapGround & { calls: number } {
  const height = (x: number, z: number) => 0.25 * Math.sin(0.7 * x) * Math.cos(0.5 * z) + 0.05 * x;
  const g = {
    calls: 0,
    homeSpot(node: number, slot: number, out: GroundFrame): boolean {
      const x = node * 3 + slot * 1.1;
      const z = 1.3;
      out.position.set(x, height(x, z) - 0.02, z);
      out.normal.set(-0.1, 1, 0.05).normalize();
      return true;
    },
    ground(p: Vector3, out: GroundFrame): void {
      g.calls++;
      out.position.set(p.x, height(p.x, p.z) - 0.02, p.z);
      out.normal.set(0, 1, 0);
    },
    display(p: Vector3, out: Vector3): Vector3 {
      const d = p.distanceTo(focus);
      return out.copy(p).setY(p.y - 0.004 * d * d);
    },
    focus(out: Vector3): Vector3 {
      return out.copy(focus);
    },
  };
  return g;
}

const entry = (node: number, tier: number, species: string, key = `tjorizo:${tier}:${species}`): CollectionEntry => ({ key, zone: 'tjorizo', tier, species, bodyType: species === 'blob' ? 'blob' : species === 'snake' ? 'snake' : 'quadruped', seed: node * 31 + 7, levelId: `tjorizo-${String(node + 1).padStart(3, '0')}`, node, at: 0, count: 1, seen: true, placedOnMap: true });

function run(c: ReturnType<typeof createMapCreatures>, seconds: number, cam = new PerspectiveCamera()): void {
  for (let t = 0; t < seconds; t += 1 / 30) c.update(1 / 30, cam);
}

describe('createMapCreatures', () => {
  it('keeps the feet on the displayed ground (within 0.02) while the creatures idle and wander', () => {
    const focus = new Vector3(6, 0, 0);
    const ground = testGround(focus);
    const c = createMapCreatures(ground, { cap: 6, mobile: true, shadowLayer: 1, library: null, rules });
    c.restore([entry(1, 1, 'blob'), entry(2, 6, 'retriever'), entry(3, 3, 'blob'), entry(2, 5, 'mouse', 'tjorizo:5:mouse')]);
    run(c, 12);
    const probe = c.probe!();
    const live = probe.filter((p) => p.live);
    expect(live.length).toBe(4);
    for (const p of live) {
      expect(p.contact!.distanceTo(p.ground!), p.key).toBeLessThan(0.02);
      expect(p.fromHome, p.key).toBeLessThanOrEqual(0.95);
    }
    c.dispose();
  });

  it('lives only near the focus: cap, 11 in / 13 out', () => {
    const focus = new Vector3(0, 0, 0);
    const ground = testGround(focus);
    const c = createMapCreatures(ground, { cap: 3, mobile: true, shadowLayer: 1, library: null, rules });
    // Nodes 0 … 6 → homes at x = 0, 3, …, 18.
    c.restore([0, 1, 2, 3, 4, 5, 6].map((n) => entry(n, 1 + n, 'blob', `k${n}`)));
    run(c, 1.2);
    let live = c.probe!().filter((p) => p.live).map((p) => p.key);
    expect(live).toEqual(['k0', 'k1', 'k2']);
    expect(c.liveCount).toBe(3);
    // Move the focus: k3 (x = 9) is within 11 of x = 12, k0 (x = 0) is beyond 13 of it: k0 pops out, the nearest come in.
    focus.set(12, 0, 0);
    run(c, 1.5);
    live = c.probe!().filter((p) => p.live).map((p) => p.key);
    expect(live).not.toContain('k0');
    expect(live.length).toBeLessThanOrEqual(3);
    for (const k of live) expect(['k2', 'k3', 'k4', 'k5']).toContain(k);
    // Hysteresis: a creature between 11 and 13 stays alive.
    expect(LIVE_IN).toBe(11);
    expect(LIVE_OUT).toBe(13);
    c.dispose();
  });

  it('release: walks from the plateau rim home and arrives about when it said', () => {
    const focus = new Vector3(3, 0, 0);
    const ground = testGround(focus);
    const c = createMapCreatures(ground, { cap: 6, mobile: true, shadowLayer: 1, library: null, rules });
    const arrived: Array<{ key: string; t: number }> = [];
    let t = 0;
    c.onPlaced = (key) => arrived.push({ key, t });
    const e = { ...entry(1, 6, 'retriever'), placedOnMap: false };
    const rim = new Vector3(3 + 2.2, 0, 1.3 - 1.4);
    const seconds = c.release(e, { position: rim, normal: new Vector3(0, 1, 0), scale: 0.2 });
    expect(seconds).toBeGreaterThan(0.5);
    expect(seconds).toBeLessThan(12);
    const cam = new PerspectiveCamera();
    for (; t < seconds * 1.6 + 1; t += 1 / 30) c.update(1 / 30, cam);
    expect(arrived.map((a) => a.key)).toEqual([e.key]);
    expect(arrived[0]!.t).toBeLessThan(seconds * 1.5 + 0.8);
    const p = c.probe!().find((q) => q.key === e.key)!;
    expect(p.phase).toBe('home');
    expect(p.fromHome).toBeLessThan(0.25);
    c.dispose();
  });

  it('an exclusion (a level plateau on the node) sends the creatures living there away until it is lifted', () => {
    const focus = new Vector3(3, 0, 0);
    const c = createMapCreatures(testGround(focus), { cap: 6, mobile: true, shadowLayer: 1, library: null, rules });
    c.restore([entry(1, 1, 'blob', 'near'), entry(4, 2, 'blob', 'far')]);
    run(c, 1);
    expect(c.liveCount).toBe(2);
    c.setExclusion!(new Vector3(3, 0, 1.3), 2);
    run(c, 0.6);
    expect(c.probe!().filter((p) => p.live).map((p) => p.key)).toEqual(['far']);
    c.setExclusion!(null);
    run(c, 0.6);
    expect(c.liveCount).toBe(2);
    c.dispose();
  });

  it('scales with the tier, relative to the hero on the map', () => {
    expect(mapScaleForTier(1)).toBeCloseTo(0.48 * 0.42, 5);
    expect(mapScaleForTier(9)).toBeCloseTo(0.48 * 0.9, 5);
    expect(mapScaleForTier(12)).toBeCloseTo(0.48 * 0.9, 5);
  });
});
