// Grenzen der Welt und des Formats gehören zusammen: Was das Schema einer Hülle annimmt, muss die Welt bauen können (Plan 3.6, 4.5).
import { VIELECK_HOECHSTENS } from '@ee/studio-format/schema/physik';
import { describe, expect, it } from 'vitest';
import { VIELECK_PUNKTE } from './welt';

describe('Vertrag der Welt und Format', () => {
  it('ein Vieleck hat im Format höchstens so viele Punkte, wie die Welt annimmt', () => {
    expect(VIELECK_HOECHSTENS).toBe(VIELECK_PUNKTE);
  });
});
