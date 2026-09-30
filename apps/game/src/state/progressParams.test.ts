import { beforeEach, describe, expect, it } from 'vitest';
import { routeFromAppUrl } from '../native/appUrl';
import { useProgress } from './progress';
import { applyProgressParams, parseProgressParams } from './progressParams';

const L1 = 'tjorizo-001';
const OPTS = { enabled: true, firstLevelId: L1, nodeCount: 100, introStories: ['afterLevel1'] };

beforeEach(() => {
  const p = useProgress.getState();
  p.setMode('real');
  p.resetSlot('real');
  p.resetSlot('free');
});

describe('parseProgressParams', () => {
  it('reads mode, reset, level, intro and story', () => {
    expect(parseProgressParams('?mode=free')).toEqual({ mode: 'free' });
    expect(parseProgressParams('?mode=echt&reset=frei&level=12&intro=1&story=afterLevel1')).toEqual({ mode: 'real', reset: 'free', level: 12, intro: true, story: 'afterLevel1' });
    expect(parseProgressParams('?mode=nope&level=0&story=../x')).toEqual({});
    expect(parseProgressParams('')).toEqual({});
  });

  it('keeps earlyearle://play?mode=free intact through the deep link', () => {
    const route = routeFromAppUrl('earlyearle://play?mode=free');
    expect(route).toBe('/play?mode=free');
    expect(parseProgressParams(route!.slice(route!.indexOf('?')))).toEqual({ mode: 'free' });
    expect(routeFromAppUrl('earlyearle://?intro=1')).toBe('/?intro=1');
  });
});

describe('applyProgressParams', () => {
  it('switches the mode and unlocks up to a level in the active slot', () => {
    applyProgressParams({ mode: 'free', level: 51 }, useProgress.getState(), OPTS);
    const p = useProgress.getState();
    expect(p.mode).toBe('free');
    expect(p.reached).toBe(50);
    expect(p.current).toBe(50);
    expect(p.slots.real.reached).toBe(0);
  });

  it('resets a slot before anything else', () => {
    useProgress.getState().unlockTo(9);
    applyProgressParams({ reset: 'real', level: 3 }, useProgress.getState(), OPTS);
    expect(useProgress.getState().reached).toBe(2);
  });

  it('replays the intro in the real slot (and switches there)', () => {
    const p = useProgress.getState();
    p.recordWin(L1, 0, 40, 90, 100);
    p.markIntroSeen();
    p.markStorySeen('afterLevel1');
    p.setMode('free');
    applyProgressParams({ intro: true }, useProgress.getState(), OPTS);
    const q = useProgress.getState();
    expect(q.mode).toBe('real');
    expect(q.seen).toEqual({ intro: false, stories: [] });
    expect(q.levels[L1]?.wins).toBe(0);
    expect(q.levels[L1]?.bestScore).toBe(40);
    expect(q.reached).toBe(1);
  });

  it('hands the story over and does nothing without the Werkstatt', () => {
    expect(applyProgressParams({ story: 'afterLevel1' }, useProgress.getState(), OPTS)).toEqual({ story: 'afterLevel1' });
    expect(applyProgressParams({ mode: 'free', story: 'afterLevel1' }, useProgress.getState(), { ...OPTS, enabled: false })).toEqual({ story: null });
    expect(useProgress.getState().mode).toBe('real');
  });
});
