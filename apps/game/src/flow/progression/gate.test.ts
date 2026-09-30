import { describe, expect, it } from 'vitest';
import { canEnterNode, clampCurrent, shouldPlayIntro, storyAfterWin, STORY_AFTER_LEVEL_1, type GateProgress } from './gate';

const L1 = 'tjorizo-001';
const progress = (over: Partial<GateProgress> = {}): GateProgress => ({ mode: 'real', reached: 0, levels: {}, seen: { intro: false, stories: [] }, ...over });
const win = { wins: 1, attempts: 1, bestScore: 10, bestMovesLeft: 90 };

describe('canEnterNode', () => {
  it('lets the real mode enter only unlocked nodes', () => {
    const p = progress({ reached: 2 });
    expect(canEnterNode(0, p)).toBe(true);
    expect(canEnterNode(2, p)).toBe(true);
    expect(canEnterNode(3, p)).toBe(false);
    expect(canEnterNode(50, p)).toBe(false);
  });

  it('lets the free mode enter every node', () => {
    const p = progress({ mode: 'free', reached: 0 });
    expect(canEnterNode(50, p)).toBe(true);
    expect(canEnterNode(99, p)).toBe(true);
  });
});

describe('shouldPlayIntro', () => {
  it('plays on a fresh real start', () => {
    expect(shouldPlayIntro(progress(), L1)).toBe(true);
  });

  it('never plays in free mode, after it was seen or once level 1 is won', () => {
    expect(shouldPlayIntro(progress({ mode: 'free' }), L1)).toBe(false);
    expect(shouldPlayIntro(progress({ seen: { intro: true, stories: [] } }), L1)).toBe(false);
    expect(shouldPlayIntro(progress({ levels: { [L1]: win } }), L1)).toBe(false);
  });

  it('ignores attempts without a win', () => {
    expect(shouldPlayIntro(progress({ levels: { [L1]: { ...win, wins: 0, attempts: 4 } } }), L1)).toBe(true);
  });
});

describe('storyAfterWin', () => {
  it('tells the story after the first real win of level 1 only', () => {
    expect(storyAfterWin(0, progress({ reached: 1 }))).toBe(STORY_AFTER_LEVEL_1);
    expect(storyAfterWin(1, progress({ reached: 2 }))).toBeNull();
    expect(storyAfterWin(0, progress({ mode: 'free' }))).toBeNull();
    expect(storyAfterWin(0, progress({ seen: { intro: true, stories: [STORY_AFTER_LEVEL_1] } }))).toBeNull();
  });
});

describe('clampCurrent', () => {
  it('keeps the real mode on unlocked ground and every mode on the path', () => {
    expect(clampCurrent(7, { mode: 'real', reached: 3 }, 100)).toBe(3);
    expect(clampCurrent(7, { mode: 'free', reached: 3 }, 100)).toBe(7);
    expect(clampCurrent(140, { mode: 'free', reached: 3 }, 100)).toBe(99);
    expect(clampCurrent(-2, { mode: 'real', reached: 3 }, 100)).toBe(0);
  });
});
