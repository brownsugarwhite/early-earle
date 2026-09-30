import { beforeEach, describe, expect, it, vi } from 'vitest';

// The engine and the native plugin are replaced: only the order of the calls matters here.
const calls = vi.hoisted(() => [] as string[]);
const fail = vi.hoisted(() => ({ unlock: false }));
vi.mock('../audio/engine', () => ({
  audio: {
    unlock: () => {
      if (fail.unlock) throw new Error('kein Audio');
      calls.push('unlock');
    },
    ui: (kind: string) => calls.push(`ui:${kind}`),
  },
}));
vi.mock('@ee/liquid-glass', () => ({ LiquidGlass: { addListener: () => Promise.resolve({ remove: () => undefined }) } }));

import { dispatchNativeAction } from './liquidGlass';

describe('native Glas-Pillen und Ton', () => {
  beforeEach(() => {
    calls.length = 0;
    fail.unlock = false;
  });

  it('entsperren den Ton und tinken wie ein Glasknopf, bevor die Aktion läuft', () => {
    dispatchNativeAction('play', (id) => calls.push(`action:${id}`));
    expect(calls).toEqual(['unlock', 'ui:glass', 'action:play']);
  });

  it('gilt für jede Pille (auch Karten-Einstiege und den Ton-Schalter)', () => {
    for (const id of ['collection', 'classic', 'sound', 'werkstatt']) dispatchNativeAction(id, (x) => calls.push(`action:${x}`));
    expect(calls.filter((c) => c === 'unlock')).toHaveLength(4);
    expect(calls.filter((c) => c.startsWith('action:'))).toEqual(['action:collection', 'action:classic', 'action:sound', 'action:werkstatt']);
  });

  it('führt die Aktion auch aus, wenn der Ton nicht startet', () => {
    fail.unlock = true;
    dispatchNativeAction('map', (id) => calls.push(`action:${id}`));
    expect(calls).toEqual(['action:map']);
  });
});
