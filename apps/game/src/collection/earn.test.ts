import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { createStore } from 'zustand/vanilla';
import type { MoveEvent } from '@ee/core';
import { lineSpecies, parseGenomeRules, type GenomeRulesInput } from '@ee/genome';
import type { MadeCreature } from '@ee/render';
import { useProgress } from '../state/progress';
import { blobSeed, earnedFromEvents } from './earn';
import { catalogFor, catalogInputs, levelIdOf, zoneFirstLevel, zoneLevels, zoneOfNode } from './catalog';
import { LEVELS } from '../content/levels';
import { wireCollection, type FlowLike, type GridLike } from './wiring';

const rules = parseGenomeRules(JSON.parse(readFileSync(new URL('../../../../content/genome/rules.json', import.meta.url), 'utf8')) as GenomeRulesInput);

const merge = (resultId: number, tier: number, at: [number, number] = [1, 1]): MoveEvent => ({ type: 'merge', phase: 1, ids: [resultId - 2, resultId - 1], at, tier, resultId, material: 'jelly' });
const spawn = (id: number, tier: number, kind: 'normal' | 'amoeba' = 'normal'): MoveEvent => ({ type: 'spawn', phase: 6, id, at: [0, 3], tier, kind, material: 'jelly' });
const slide = (id: number): MoveEvent => ({ type: 'slide', phase: 1, id, from: [0, 0], to: [1, 0], path: [[1, 0]] });

describe('earnedFromEvents', () => {
  it('counts merge results and normal spawns, never slides, amoebae or start blobs', () => {
    const looks = earnedFromEvents([slide(3), merge(40, 6), spawn(41, 1), spawn(42, 2, 'amoeba')], 'tjorizo', rules);
    expect(looks.map((l) => [l.blobId, l.via, l.tier])).toEqual([
      [40, 'merge', 6],
      [41, 'spawn', 1],
    ]);
    // The line of the new blob decides the species, exactly as the board resolves it (seed id·31+7).
    const expected = lineSpecies(rules, 'tjorizo', 6, blobSeed(40));
    expect(looks[0]).toMatchObject({ zone: 'tjorizo', seed: blobSeed(40), species: expected.species, bodyType: expected.bodyType, cell: [1, 1] });
    expect(looks[1]!.species).toBe('blob');
    expect(earnedFromEvents([], 'tjorizo', rules)).toEqual([]);
  });

  it('ignores tiers outside the catalog', () => {
    expect(earnedFromEvents([merge(50, 13)], 'syrup', rules)).toEqual([]);
  });
});

describe('catalog helpers', () => {
  it('fills the whole catalog with real seeds spread over the zone nodes', () => {
    const inputs = catalogInputs(rules);
    expect(inputs.length).toBe(catalogFor(rules).length);
    expect(inputs.length).toBe(253);
    for (const i of inputs) {
      expect(lineSpecies(rules, i.zone as never, i.tier, i.seed).species).toBe(i.species);
      expect(i.levelId.startsWith(i.zone)).toBe(true);
    }
    expect(levelIdOf(0)).toBe('tjorizo-001');
    expect(levelIdOf(25)).toBe('syrup-026');
    expect(levelIdOf(99)).toBe('wooding-100');
  });

  it('derives the story zones from the level files (Route 15 + 1: zones alternate along the route)', () => {
    // every level file belongs to exactly one zone list, ascending; the IDs of the levels 1–100 stay as they were
    const all = (['tjorizo', 'syrup', 'luzz', 'wooding'] as const).flatMap((z) => zoneLevels(z));
    expect(all.length).toBe(LEVELS.length);
    expect(new Set(all).size).toBe(LEVELS.length);
    for (const z of ['tjorizo', 'syrup', 'luzz', 'wooding'] as const) {
      const levels = zoneLevels(z);
      expect([...levels].sort((a, b) => a - b)).toEqual(levels);
      for (const no of levels) expect(zoneOfNode(no - 1)).toBe(z);
    }
    expect(zoneFirstLevel('tjorizo')).toBe(1);
    expect(zoneFirstLevel('syrup')).toBe(26);
    expect(zoneFirstLevel('luzz')).toBe(51);
    expect(zoneFirstLevel('wooding')).toBe(76);
    // nodes without a level file (yet): the old pattern, never a crash
    expect(levelIdOf(LEVELS.length + 400)).toMatch(/^[a-z]+-\d{3}$/);
  });
});

describe('wireCollection', () => {
  const level = { id: 'tjorizo-003', zone: 'tjorizo' };
  const makeGrid = () => createStore<GridLike>(() => ({ levelIndex: 2, level, attempt: 1, moveSeq: 0, lastMove: null }));
  const makeFlow = (phase = 'level') => createStore<FlowLike>(() => ({ phase, playing: 2, current: 2 }));
  const made = (blobId: number, tier: number, species = 'blob'): MadeCreature => ({ blobId, zone: 'tjorizo', tier, species, bodyType: 'blob', seed: blobSeed(blobId), via: 'merge', cell: [0, 0] });

  beforeEach(() => {
    useProgress.getState().setMode('free');
    useProgress.getState().resetSlot();
  });

  function wire(grid = makeGrid(), flow = makeFlow()) {
    const warnings: string[] = [];
    const stamps: MadeCreature[] = [];
    const w = wireCollection({ grid, flow, record: (i) => useProgress.getState().recordCollect(i), rules: () => rules, dev: true, warn: (m) => warnings.push(m), onStamp: (m) => stamps.push(m) });
    return { grid, flow, w, warnings, stamps };
  }

  const move = (grid: ReturnType<typeof makeGrid>, events: MoveEvent[]) => grid.setState((s) => ({ moveSeq: s.moveSeq + 1, lastMove: { events } }));

  it('books new looks in the active slot with level and node; the board asks once per creature', () => {
    const { grid, w, stamps } = wire();
    move(grid, [merge(20, 2), spawn(21, 1)]);
    const col = useProgress.getState().collection;
    expect(Object.keys(col).sort()).toEqual(['tjorizo:1:blob', 'tjorizo:2:blob']);
    expect(col['tjorizo:2:blob']).toMatchObject({ levelId: 'tjorizo-003', node: 2, seed: blobSeed(20), count: 1, seen: false, placedOnMap: false });
    expect(w.found.map((e) => e.key)).toEqual(['tjorizo:2:blob', 'tjorizo:1:blob']);
    expect(w.hooks.isNewCreature(made(20, 2))).toBe(true);
    expect(w.hooks.isNewCreature(made(20, 2))).toBe(false);
    expect(w.hooks.isNewCreature(made(99, 2))).toBe(false);
    w.hooks.stampShown(made(20, 2));
    expect(stamps.length).toBe(1);
    // The same look again: counted, not new.
    move(grid, [merge(30, 2)]);
    expect(useProgress.getState().collection['tjorizo:2:blob']!.count).toBe(2);
    expect(w.hooks.isNewCreature(made(30, 2))).toBe(false);
    w.dispose();
  });

  it('books nothing in classic, outside level phases, on loads or rewinds', () => {
    const grid = makeGrid();
    const flow = makeFlow('map');
    const { w } = wire(grid, flow);
    move(grid, [merge(20, 2)]);
    expect(Object.keys(useProgress.getState().collection)).toEqual([]);
    flow.setState({ phase: 'level' });
    grid.setState({ session: 'classic' });
    move(grid, [merge(21, 3)]);
    expect(Object.keys(useProgress.getState().collection)).toEqual([]);
    grid.setState({ session: 'story' });
    // Rewind: a new moveSeq without a move.
    grid.setState((s) => ({ moveSeq: s.moveSeq + 1, lastMove: null }));
    expect(Object.keys(useProgress.getState().collection)).toEqual([]);
    move(grid, [merge(22, 3)]);
    expect(Object.keys(useProgress.getState().collection)).toEqual(['tjorizo:3:blob']);
    w.dispose();
  });

  it('forgets pending stamps on a restart and warns in development when the board draws another species', () => {
    const { grid, w, warnings } = wire();
    move(grid, [merge(20, 2)]);
    expect(w.pending.size).toBe(1);
    grid.setState((s) => ({ attempt: s.attempt + 1, moveSeq: 0, lastMove: null }));
    expect(w.pending.size).toBe(0);
    move(grid, [merge(40, 4)]);
    expect(w.hooks.isNewCreature(made(40, 4, 'duck'))).toBe(true);
    expect(warnings.length).toBe(1);
    w.dispose();
  });
});
