import { describe, expect, it } from 'vitest';
import { applyMove, createState, parseLevel, type LevelState } from '@ee/core';
import level1 from '../../../../../content/levels/001.json';
import { hintWanted, pickSwipeDirection, type HintFacts } from './swipeDirection';

const state = (): LevelState => createState(parseLevel(level1), 1001);

describe('pickSwipeDirection', () => {
  it('points at a swipe that merges on the first level', () => {
    const s = state();
    const dir = pickSwipeDirection(s);
    expect(dir).not.toBeNull();
    expect(applyMove(s, dir!)!.mergeCount).toBeGreaterThan(0);
  });

  it('gives no direction once the level is over', () => {
    expect(pickSwipeDirection({ ...state(), status: 'won' })).toBeNull();
    expect(pickSwipeDirection(null)).toBeNull();
  });
});

describe('hintWanted', () => {
  const facts: HintFacts = { phase: 'level', levelIndex: 0, playing: 0, moveSeq: 0, status: 'playing', firstLevelWins: 0 };

  it('shows on level 1 before the first swipe', () => {
    expect(hintWanted(facts)).toBe(true);
  });

  it('hides after a swipe, once won, in other levels and outside the level', () => {
    expect(hintWanted({ ...facts, moveSeq: 1 })).toBe(false);
    expect(hintWanted({ ...facts, firstLevelWins: 1 })).toBe(false);
    expect(hintWanted({ ...facts, levelIndex: 3, playing: 3 })).toBe(false);
    expect(hintWanted({ ...facts, phase: 'intro' })).toBe(false);
    expect(hintWanted({ ...facts, status: 'won' })).toBe(false);
  });
});
