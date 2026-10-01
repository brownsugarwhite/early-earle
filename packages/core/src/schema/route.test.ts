import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { RouteSchema, parseRoute } from './route';

const contentDir = fileURLToPath(new URL('../../../../content/zones/', import.meta.url));

describe('RouteSchema (content/zones/route.json, Route 15 + 1)', () => {
  const route = parseRoute(JSON.parse(readFileSync(`${contentDir}route.json`, 'utf8')));
  const worldIds = new Set(
    readdirSync(`${contentDir}worlds`)
      .filter((f) => f.endsWith('.json'))
      .map((f) => (JSON.parse(readFileSync(`${contentDir}worlds/${f}`, 'utf8')) as { id: string }).id),
  );

  it('validates: 15 playable authored worlds, then the hinted zone 16 with the gate node, every world once', () => {
    const playable = route.entries.filter((e) => e.state !== 'hinted');
    const hinted = route.entries.filter((e) => e.state === 'hinted');
    expect(playable).toHaveLength(15);
    expect(hinted).toHaveLength(1);
    expect(route.entries[route.entries.length - 1]!.state).toBe('hinted');
    expect(hinted[0]!.levels).toBe(1);
    expect(new Set(route.entries.map((e) => e.world)).size).toBe(route.entries.length);
    for (const e of route.entries) expect(worldIds.has(e.world), e.world).toBe(true);
    expect(worldIds.has(route.beyond.world)).toBe(true);
    expect(route.beyond.world).toBe(hinted[0]!.world);
  });

  it('carries 184 playable levels, the giant tree on 99–114 and the gate on level 185', () => {
    let level = 1;
    let tree: [number, number] | null = null;
    let playable = 0;
    for (const e of route.entries) {
      if (e.tree) tree = [level, level + e.levels - 1];
      if (e.state !== 'hinted') playable += e.levels;
      level += e.levels;
    }
    expect(playable).toBe(184);
    expect(tree).toEqual([99, 114]);
    expect(level - 1).toBe(185);
    expect(route.nodeSpacing).toBeCloseTo(4.2, 9);
  });

  it('rejects playable entries after a hinted one, two trees, empty playable sections and gorges off the route', () => {
    const base = { schemaVersion: 1, nodeSpacing: 4.2, beyond: { world: 'w16' } };
    expect(RouteSchema.safeParse({ ...base, entries: [{ world: 'w16', levels: 1, state: 'hinted' }, { world: 'w01', levels: 3 }] }).success).toBe(false);
    expect(RouteSchema.safeParse({ ...base, entries: [{ world: 'w01', levels: 3, tree: true }, { world: 'w02', levels: 3, tree: true }] }).success).toBe(false);
    expect(RouteSchema.safeParse({ ...base, entries: [{ world: 'w01', levels: 0 }] }).success).toBe(false);
    expect(RouteSchema.safeParse({ ...base, entries: [{ world: 'w01', levels: 3 }], gorges: [{ after: 'w09', width: 10, depth: 5 }] }).success).toBe(false);
    // Makroform und Grenztrog sind deklariert (W3/W5c füllen sie)
    expect(RouteSchema.safeParse({ ...base, entries: [{ world: 'w01', levels: 3, shape: 'spiral', shapeParams: { turns: 1, side: -1 } }], gorges: [{ after: 'w01', width: 10, depth: 5 }] }).success).toBe(true);
  });
});
