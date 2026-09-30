import { beforeEach, describe, expect, it } from 'vitest';
import { asciiTiers, canRewind, countBlobs, type Dir } from '@ee/core';
import { LEVELS } from '../../content/levels';
import { DEMO_LEVEL_INDEX, useGridStore } from './gridStore';

/** Ein Zug, der das Brett ändert (reihum probiert); danach ist die Animation „fertig“. */
function anyMove(): Dir {
  for (const d of ['left', 'up', 'right', 'down'] as const) {
    if (useGridStore.getState().move(d)) {
      useGridStore.getState().setAnimating(false);
      return d;
    }
  }
  throw new Error('kein Zug möglich');
}

describe('gridStore: Klassik-Sitzung', () => {
  beforeEach(() => {
    useGridStore.getState().endClassic();
    useGridStore.getState().loadLevel(0);
  });

  it('beginnt in der Geschichte', () => {
    const s = useGridStore.getState();
    expect(s.session).toBe('story');
    expect(s.classicFormat).toBeNull();
    expect(s.level?.id).toBe(LEVELS[0]!.id);
  });

  it('startClassic lädt nichts; der nächste loadLevel spielt das Format am Knoten (in dessen Zone)', () => {
    expect(useGridStore.getState().startClassic('4x4', 500)).toBe(true);
    let s = useGridStore.getState();
    expect(s.session).toBe('classic');
    expect(s.classicFormat?.id).toBe('4x4');
    expect(s.level?.id).toBe(LEVELS[0]!.id);
    s.loadLevel(60);
    s = useGridStore.getState();
    expect(s.level).toMatchObject({ id: 'klassik-4x4', mode: 'classic', zone: LEVELS[60]!.zone, goals: [] });
    expect(s.levelIndex).toBe(60);
    expect(countBlobs(s.state!)).toBe(2);
    expect(s.rex).toBeTruthy();
  });

  it('spielt ohne Rückspulen; Neu bringt ein neues Brett mit derselben Level-Identität', () => {
    useGridStore.getState().startClassic('5x5', 77);
    useGridStore.getState().loadLevel(3);
    const level = useGridStore.getState().level;
    const first = asciiTiers(useGridStore.getState().state!);
    anyMove();
    anyMove();
    const s = useGridStore.getState();
    expect(canRewind(s.history!)).toBe(false);
    const before = s.state;
    s.rewindMove();
    expect(useGridStore.getState().state).toBe(before);
    s.restart();
    const r = useGridStore.getState();
    expect(r.attempt).toBe(2);
    expect(r.level).toBe(level);
    expect(r.session).toBe('classic');
    expect(r.moveSeq).toBe(0);
    expect(asciiTiers(r.state!)).not.toBe(first);
  });

  it('ist je Seed und Versuch deterministisch', () => {
    const board = (seed: number) => {
      useGridStore.getState().startClassic('4x4', seed);
      useGridStore.getState().loadLevel(3);
      return asciiTiers(useGridStore.getState().state!);
    };
    expect(board(1234)).toBe(board(1234));
    expect(new Set([1, 2, 3, 4, 5].map(board)).size).toBeGreaterThan(1);
  });

  it('ignoriert unbekannte Formate', () => {
    expect(useGridStore.getState().startClassic('7x7')).toBe(false);
    expect(useGridStore.getState().session).toBe('story');
  });

  it('endClassic und Schaubretter führen zurück in die Geschichte', () => {
    useGridStore.getState().startClassic('3x3');
    useGridStore.getState().endClassic();
    expect(useGridStore.getState().session).toBe('story');
    useGridStore.getState().loadLevel(2);
    expect(useGridStore.getState().level?.id).toBe(LEVELS[2]!.id);

    useGridStore.getState().startClassic('3x3');
    useGridStore.getState().loadLevel(DEMO_LEVEL_INDEX);
    expect(useGridStore.getState().session).toBe('story');
    expect(useGridStore.getState().level?.id).toBe('demo-elemente');
  });
});
