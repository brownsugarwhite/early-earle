import { describe, expect, it } from 'vitest';
import { routeFromAppUrl } from './appUrl';

describe('routeFromAppUrl (earlyearle://…)', () => {
  it('opens the Werkstatt, labs, editors and the game', () => {
    expect(routeFromAppUrl('earlyearle://werkstatt')).toBe('/werkstatt');
    expect(routeFromAppUrl('earlyearle://lab/earle?world=08')).toBe('/lab/earle?world=08');
    expect(routeFromAppUrl('earlyearle://editor/levels?file=003.json')).toBe('/editor/levels?file=003.json');
    expect(routeFromAppUrl('earlyearle://play')).toBe('/play');
    expect(routeFromAppUrl('earlyearle://')).toBe('/');
    expect(routeFromAppUrl('EarlyEarle://lab/')).toBe('/lab');
  });

  it('ignores other schemes and unknown or odd paths', () => {
    expect(routeFromAppUrl('https://example.com/lab/earle')).toBeNull();
    expect(routeFromAppUrl('earlyearle://settings')).toBeNull();
    expect(routeFromAppUrl('earlyearle://lab/../../etc')).toBeNull();
    expect(routeFromAppUrl('earlyearle://editor')).toBeNull();
  });
});
