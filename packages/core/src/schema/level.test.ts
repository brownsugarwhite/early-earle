import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { LevelSchema, countElementKinds, type LevelInput } from './level';
import { ZoneSchema } from './zone';

const contentDir = fileURLToPath(new URL('../../../../content/', import.meta.url));

function base(): LevelInput {
  return {
    schemaVersion: 1,
    id: 'test-001',
    zone: 'tjorizo',
    grid: { w: 4, h: 4, mask: ['....', '....', '..P.', '....'] },
    start: [{ at: [0, 0], blob: { tier: 1 } }],
    spawn: {
      sources: [],
      table: [
        { tier: 1, weight: 9 },
        { tier: 2, weight: 1 },
      ],
      preview: true,
      fallback: 'anyEmpty',
    },
    goals: [{ type: 'reachTier', tier: 5 }],
    moves: 30,
    cap: 6,
    difficulty: { targetAttempts: [1, 1.1] },
  };
}

function errorsOf(input: unknown): string[] {
  const r = LevelSchema.safeParse(input);
  return r.success ? [] : r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
}

describe('LevelSchema', () => {
  it('accepts a minimal level and fills defaults', () => {
    const lvl = LevelSchema.parse(base());
    expect(lvl.fences).toEqual([]);
    expect(lvl.specials).toEqual({ lineAt: 3, burstAt: 4 });
    expect(lvl.spawn.preview).toBe(true);
  });

  it('rejects positions that are not on a "." cell', () => {
    const bad = base();
    bad.start = [{ at: [2, 2], blob: { tier: 1 } }]; // pillar
    expect(errorsOf(bad).join()).toMatch(/not a '\.' cell/);
    const outside = base();
    outside.floors = [{ kind: 'oil', at: [7, 7] }];
    expect(errorsOf(outside).join()).toMatch(/outside/);
  });

  it('enforces cap >= reachTier and start tiers below the cap', () => {
    const bad = base();
    bad.cap = 4;
    expect(errorsOf(bad).join()).toMatch(/cap must be >= reachTier/);
    const high = base();
    high.start = [{ at: [0, 0], blob: { tier: 6 } }];
    expect(errorsOf(high).join()).toMatch(/below the cap/);
  });

  it('requires portals to come in pairs', () => {
    const bad = base();
    bad.floors = [{ kind: 'portal', at: [1, 1], portalId: 'a' }];
    expect(errorsOf(bad).join()).toMatch(/exactly two cells/);
    const ok = base();
    ok.floors = [
      { kind: 'portal', at: [1, 1], portalId: 'a' },
      { kind: 'portal', at: [3, 3], portalId: 'a' },
    ];
    expect(errorsOf(ok)).toEqual([]);
  });

  it('requires spawn sources on non-void cells and a fallback when there are none', () => {
    const voidSrc = base();
    voidSrc.grid.mask = ['#...', '....', '..P.', '....'];
    voidSrc.spawn.sources = [[0, 0]];
    expect(errorsOf(voidSrc).join()).toMatch(/non-void/);
    const noFallback = base();
    noFallback.spawn.fallback = 'none';
    expect(errorsOf(noFallback).join()).toMatch(/anyEmpty/);
    const pillarSrc = base();
    pillarSrc.spawn.sources = [[2, 2]];
    pillarSrc.spawn.fallback = 'none';
    expect(errorsOf(pillarSrc)).toEqual([]);
  });

  it('allows fences only between adjacent non-void cells', () => {
    const bad = base();
    bad.fences = [{ a: [0, 0], b: [2, 0] }];
    expect(errorsOf(bad).join()).toMatch(/adjacent/);
    const ok = base();
    ok.fences = [{ a: [0, 0], b: [1, 0] }];
    expect(errorsOf(ok)).toEqual([]);
  });

  it('limits a level to four element kinds', () => {
    const lvl = base();
    lvl.blockers = [
      { kind: 'scrap', at: [0, 1], layers: 1 },
      { kind: 'cage', at: [1, 1], content: { tier: 1 } },
    ];
    lvl.floors = [{ kind: 'spore', at: [2, 1] }];
    lvl.specials = { lineAt: 3, burstAt: 4 };
    // pillar + scrap + cage + spore + line + burst = 6
    expect(
      countElementKinds(LevelSchema.parse({ ...lvl, specials: { lineAt: 16, burstAt: 16 } })).size,
    ).toBe(4);
    expect(errorsOf(lvl).join()).toMatch(/max 4/);
  });

  it('rejects two things on one cell but lets blobs rest on floors', () => {
    const clash = base();
    clash.blockers = [{ kind: 'scrap', at: [0, 0], layers: 1 }];
    expect(errorsOf(clash).join()).toMatch(/already used/);
    const ok = base();
    ok.floors = [{ kind: 'withered', at: [0, 0] }];
    expect(errorsOf(ok)).toEqual([]);
    const crust = base();
    crust.blockers = [{ kind: 'crust', at: [0, 0] }]; // freezes the start blob
    expect(errorsOf(crust)).toEqual([]);
    const emptyCrust = base();
    emptyCrust.blockers = [{ kind: 'crust', at: [3, 3] }];
    expect(errorsOf(emptyCrust).join()).toMatch(/needs content/);
  });
});

describe('content files', () => {
  it('every content/levels/NNN.json validates', () => {
    const files = readdirSync(`${contentDir}levels`).filter((f) => /^\d{3}\.json$/.test(f));
    expect(files.length).toBeGreaterThanOrEqual(10);
    for (const f of files) {
      const json = JSON.parse(readFileSync(`${contentDir}levels/${f}`, 'utf8'));
      const r = LevelSchema.safeParse(json);
      expect(r.success, `${f}: ${r.success ? '' : JSON.stringify(r.error.issues)}`).toBe(true);
      if (r.success) {
        expect(r.data.id).toBe(`tjorizo-${f.replace('.json', '')}`);
        expect(r.data.difficulty.targetAttempts[1]).toBeLessThanOrEqual(1.1);
      }
    }
  });

  it('content/zones/tjorizo.json validates', () => {
    const json = JSON.parse(readFileSync(`${contentDir}zones/tjorizo.json`, 'utf8'));
    const zone = ZoneSchema.parse(json);
    expect(zone.levelRange).toEqual([1, 25]);
  });
});
