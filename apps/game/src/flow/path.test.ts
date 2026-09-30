import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PlanetField, spiralPath, type PlanetWorldParams, type PlanetZoneParams } from '@ee/world';
import { completeLayout, routeGroundPath, segmentOf, type PathLayout } from './path';

// The same planet as the flow (MapWorld): radius 32, 3 chunks per face, four zones, the ten worlds of content/.
const contentDir = fileURLToPath(new URL('../../../../content/zones', import.meta.url));
const zoneFiles = readdirSync(contentDir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(`${contentDir}/${f}`, 'utf8')) as { id: string; levelRange: [number, number] })
  .sort((a, b) => a.levelRange[0] - b.levelRange[0]);
const worldFiles = readdirSync(`${contentDir}/worlds`)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(`${contentDir}/worlds/${f}`, 'utf8')) as { id: string; index: number; zone: string; side: 'near' | 'far'; half?: 0 | 1; terrain: PlanetWorldParams['terrain']; vegetation: PlanetWorldParams['vegetation']; props?: PlanetWorldParams['props'] })
  .sort((a, b) => a.index - b.index);

function planet(): PlanetField {
  const zones: PlanetZoneParams[] = zoneFiles.map((z) => ({ id: z.id, hillAmplitude: 1.8, vegetation: { density: 0.2, clumpiness: 0.5, kinds: { dome: 1 }, scale: [0.8, 1.2] } }));
  const worlds: PlanetWorldParams[] = worldFiles.map((w) => ({
    id: w.id,
    zone: zoneFiles.findIndex((z) => z.id === w.zone),
    side: w.side,
    ...(w.half !== undefined ? { half: w.half } : {}),
    terrain: w.terrain,
    vegetation: w.vegetation,
    props: w.props ?? {},
  }));
  return new PlanetField({ radius: 32, seed: 7, chunksPerFace: 3, zones, worlds, spiral: { turns: 2.75 } });
}

describe('routeGroundPath', () => {
  const field = planet();
  const spiral = spiralPath(field, { nodesPerZone: 25 });
  const t0 = performance.now();
  const routed = routeGroundPath(field, spiral, { nodesPerZone: 25, seed: 7, keepGround: [78, 95] });
  const ms = performance.now() - t0;

  it('keeps every node, its zone and the order, and runs quickly', () => {
    expect(routed.nodes).toHaveLength(spiral.nodes.length);
    routed.nodes.forEach((n, i) => {
      expect(n.index).toBe(i);
      expect(n.zone).toBe(spiral.nodes[i]!.zone);
      if (i > 0) expect(n.s).toBeGreaterThan(routed.nodes[i - 1]!.s);
    });
    // Cheap enough for the map's construction (node, single thread; the browser is faster).
    expect(ms).toBeLessThan(4000);
  });

  it('meanders around the spiral but stays in its corridor', () => {
    let maxOff = 0;
    let swings = 0;
    let lastSign = 0;
    routed.nodes.forEach((n, i) => {
      const a = spiral.nodes[i]!.position;
      const d = Math.hypot(n.position[0] - a[0], n.position[1] - a[1], n.position[2] - a[2]);
      maxOff = Math.max(maxOff, d);
    });
    // Lateral offset of the centre line changes sign regularly (organic S-curves, not a straight line).
    for (let i = 0; i < routed.samples.length; i += 10) {
      const smp = routed.samples[i]!;
      const r = Math.hypot(...smp.dir);
      expect(r).toBeCloseTo(1, 5);
    }
    const offs = routed.samples.map((smp, i) => {
      const next = routed.samples[Math.min(routed.samples.length - 1, i + 1)]!;
      return Math.sign(smp.side[0] * (next.dir[0] - smp.dir[0]) + smp.side[1] * (next.dir[1] - smp.dir[1]) + smp.side[2] * (next.dir[2] - smp.dir[2]));
    });
    for (const s of offs) {
      if (s !== 0 && s !== lastSign) {
        swings++;
        lastSign = s;
      }
    }
    expect(maxOff).toBeLessThan(8);
    expect(swings).toBeGreaterThan(40);
  });

  it('puts dots and ribbon on the surface, dots between their nodes', () => {
    for (const d of routed.dots) {
      const r = Math.hypot(...d.position);
      const surf = 32 + field.heightAt(d.position[0] / r, d.position[1] / r, d.position[2] / r);
      expect(Math.abs(r - surf)).toBeLessThan(1e-3);
      expect(d.u).toBeGreaterThanOrEqual(0);
      expect(d.u).toBeLessThanOrEqual(1);
      expect(d.s).toBeGreaterThan(routed.nodeS[d.seg]!);
      expect(d.s).toBeLessThan(routed.nodeS[d.seg + 1]!);
    }
    expect(routed.dots.length).toBeGreaterThan(400);
    for (const r of routed.ribbon) expect(r.width).toBeGreaterThan(0.3);
  });

  it('gives the nodes varied sites (ledges on the spikes, trash in the start world)', () => {
    const count: Record<string, number> = {};
    for (const n of routed.nodes) count[n.site] = (count[n.site] ?? 0) + 1;
    expect(routed.nodes[12]!.site).toBe('ledge');
    expect(count['ledge'] ?? 0).toBeGreaterThan(5);
    expect((count['meadow'] ?? 0) + (count['grove'] ?? 0)).toBeGreaterThan(30);
    expect(routed.nodes[78]!.site).toBe('meadow');
    for (const n of routed.nodes) if (n.site === 'ledge') expect(n.rise).toBeGreaterThan(0.3);
  });

  it('segmentOf and completeLayout agree with the routed segments', () => {
    const d = routed.dots[37]!;
    const su = segmentOf(routed.nodeS, d.s);
    expect(su.seg).toBe(d.seg);
    expect(su.u).toBeCloseTo(d.u, 6);
    const bare: PathLayout = { nodes: routed.nodes.map((n) => ({ index: n.index, u: 0, v: 0, position: n.position, normal: n.normal })), dots: routed.dots.slice(0, 60).map((x) => ({ position: x.position, normal: x.normal })), length: routed.length };
    completeLayout(bare);
    bare.dots.forEach((x, i) => expect(Math.abs(x.seg! - routed.dots[i]!.seg)).toBeLessThanOrEqual(1));
  });
});
