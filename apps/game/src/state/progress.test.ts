import { beforeEach, describe, expect, it } from 'vitest';
import { bus } from './bus';
import { collectionKey, emptySlot, loadProgress, PROGRESS_KEY, useProgress, type CollectInput } from './progress';

const store = (items: Record<string, string>) => ({ getItem: (k: string) => items[k] ?? null });
const blob2: CollectInput = { zone: 'tjorizo', tier: 2, species: 'blob', bodyType: 'blob', seed: 38, levelId: 'tjorizo-001', node: 0 };

describe('loadProgress', () => {
  it('starts a fresh install in real mode with two empty slots', () => {
    const p = loadProgress(store({}));
    expect(p.mode).toBe('real');
    expect(p.slots.real).toEqual(emptySlot());
    expect(p.slots.free).toEqual(emptySlot());
  });

  it('moves a v1 development state into the free slot and still starts in real mode', () => {
    const v1 = { version: 1, reached: 85, current: 84, levels: { 'tjorizo-001': { wins: 2, attempts: 3, bestScore: 40, bestMovesLeft: 90 } } };
    const p = loadProgress(store({ 'ee.progress.v1': JSON.stringify(v1) }));
    expect(p.mode).toBe('real');
    expect(p.slots.real).toEqual(emptySlot());
    expect(p.slots.free.reached).toBe(85);
    expect(p.slots.free.current).toBe(84);
    expect(p.slots.free.levels['tjorizo-001']?.wins).toBe(2);
    expect(p.slots.free.seen.intro).toBe(true);
  });

  it('prefers v2 over v1 and sanitises broken fields', () => {
    const v2 = { version: 2, mode: 'free', slots: { free: { reached: -3, current: '7', levels: null }, real: { reached: 2 } } };
    const p = loadProgress(store({ [PROGRESS_KEY]: JSON.stringify(v2), 'ee.progress.v1': JSON.stringify({ version: 1, reached: 50 }) }));
    expect(p.mode).toBe('free');
    expect(p.slots.free.reached).toBe(0);
    expect(p.slots.free.current).toBe(7);
    expect(p.slots.free.levels).toEqual({});
    expect(p.slots.real.reached).toBe(2);
    expect(p.slots.real.seen).toEqual({ intro: false, stories: [] });
  });

  it('survives garbage', () => {
    expect(loadProgress(store({ [PROGRESS_KEY]: '{nope' })).mode).toBe('real');
    expect(loadProgress(null).mode).toBe('real');
  });
});

describe('useProgress', () => {
  beforeEach(() => {
    const s = useProgress.getState();
    s.setMode('real');
    s.resetSlot('real');
    s.resetSlot('free');
  });

  it('keeps real and free slots apart and mirrors the active one', () => {
    const s = useProgress.getState();
    s.recordWin('tjorizo-001', 0, 30, 5, 100);
    expect(useProgress.getState().reached).toBe(1);
    s.setMode('free');
    expect(useProgress.getState().reached).toBe(0);
    useProgress.getState().unlockTo(40);
    expect(useProgress.getState().reached).toBe(40);
    expect(useProgress.getState().current).toBe(40);
    expect(useProgress.getState().seen.intro).toBe(true);
    useProgress.getState().setMode('real');
    expect(useProgress.getState().reached).toBe(1);
    expect(useProgress.getState().slots.free.reached).toBe(40);
  });

  it('reports the first win once and clamps reached to the last node', () => {
    const won: boolean[] = [];
    const off = (e: { first: boolean }) => won.push(e.first);
    bus.on('progress/won', off);
    const s = useProgress.getState();
    s.recordWin('tjorizo-100', 99, 10, 0, 100);
    s.recordWin('tjorizo-100', 99, 12, 1, 100);
    bus.off('progress/won', off);
    expect(won).toEqual([true, false]);
    expect(useProgress.getState().reached).toBe(99);
    expect(useProgress.getState().levels['tjorizo-100']).toMatchObject({ wins: 2, bestScore: 12, bestMovesLeft: 1 });
  });

  it('collects each look once, counts repeats and tracks seen / placed', () => {
    const added: boolean[] = [];
    const on = (e: { isNew: boolean }) => added.push(e.isNew);
    bus.on('collection/added', on);
    const s = useProgress.getState();
    expect(s.recordCollect(blob2).isNew).toBe(true);
    expect(s.recordCollect({ ...blob2, seed: 99, levelId: 'tjorizo-002', node: 1 }).isNew).toBe(false);
    bus.off('collection/added', on);
    expect(added).toEqual([true, false]);
    const key = collectionKey('tjorizo', 2, 'blob');
    const e = useProgress.getState().collection[key];
    expect(e).toMatchObject({ count: 2, seed: 38, levelId: 'tjorizo-001', node: 0, seen: false, placedOnMap: false });
    expect(useProgress.getState().unseenCount()).toBe(1);
    useProgress.getState().markSeen();
    useProgress.getState().markPlaced(key);
    expect(useProgress.getState().collection[key]).toMatchObject({ seen: true, placedOnMap: true });
    expect(useProgress.getState().unseenCount()).toBe(0);
  });

  it('fills and clears the collection of the active slot only', () => {
    const s = useProgress.getState();
    s.fillCollection([blob2, { ...blob2, tier: 3 }]);
    expect(Object.keys(useProgress.getState().collection)).toHaveLength(2);
    s.setMode('free');
    expect(Object.keys(useProgress.getState().collection)).toHaveLength(0);
    useProgress.getState().setMode('real');
    useProgress.getState().clearCollection();
    expect(Object.keys(useProgress.getState().collection)).toHaveLength(0);
  });

  it('remembers intro and stories', () => {
    const s = useProgress.getState();
    s.markIntroSeen();
    s.markStorySeen('afterLevel1');
    s.markStorySeen('afterLevel1');
    expect(useProgress.getState().seen).toEqual({ intro: true, stories: ['afterLevel1'] });
  });
});
