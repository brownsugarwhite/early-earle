import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MiniOfflineAudioContext } from './miniOffline';

/**
 * Engine lifecycle without a browser: a fake `AudioContext` (the offline test renderer plus resume/suspend) whose
 * resume() behaves like WebKit without a gesture (pending forever) or like the iOS app (resolves at once).
 */

type Mode = 'pending' | 'resolve';
let mode: Mode = 'pending';
const created: FakeCtx[] = [];

class FakeCtx extends MiniOfflineAudioContext {
  override state: AudioContextState = 'suspended';
  baseLatency = 0;
  outputLatency = 0;
  resumes = 0;
  constructor() {
    super(2, 44100, 44100);
    created.push(this);
  }
  resume(): Promise<void> {
    this.resumes++;
    if (mode === 'pending') return new Promise<void>(() => undefined);
    this.state = 'running';
    return Promise.resolve();
  }
  suspend(): Promise<void> {
    this.state = 'suspended';
    return Promise.resolve();
  }
  close(): Promise<void> {
    this.state = 'closed';
    return Promise.resolve();
  }
}

/** Registered handlers per event type (identity matters: the module's own engine subscribes to the settings too). */
const listeners = new Map<string, Set<unknown>>();
const fakeWindow = {
  AudioContext: FakeCtx,
  addEventListener: (type: string, fn: unknown) => listeners.set(type, (listeners.get(type) ?? new Set()).add(fn)),
  removeEventListener: (type: string, fn: unknown) => listeners.get(type)?.delete(fn),
};
const fakeDocument = { hidden: false, addEventListener: () => undefined, removeEventListener: () => undefined };

describe('AudioEngine: Entsperren und Wachhund', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('window', fakeWindow);
    vi.stubGlobal('document', fakeDocument);
    listeners.clear();
    created.length = 0;
    mode = 'pending';
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const fresh = async () => {
    const { AudioEngine } = await import('./engine');
    const { useAudioSettings } = await import('./settings');
    useAudioSettings.getState().setMuted(false);
    return { engine: new AudioEngine(), settings: useAudioSettings };
  };
  /** The engine's own gesture handler is installed. */
  const armed = (engine: object): boolean => !!listeners.get('pointerdown')?.has((engine as { onGesture?: unknown }).onGesture);

  it('hängt die Gesten wieder ein, wenn resume() ohne Geste hängen bleibt (WebKit)', async () => {
    const { engine } = await fresh();
    engine.unlock();
    expect(created).toHaveLength(1);
    expect(armed(engine)).toBe(false);
    await vi.advanceTimersByTimeAsync(399);
    expect(armed(engine)).toBe(false);
    await vi.advanceTimersByTimeAsync(2);
    expect(armed(engine)).toBe(true);
    // The next tap resumes inside a gesture.
    mode = 'resolve';
    engine.unlock();
    await vi.advanceTimersByTimeAsync(0);
    expect(engine.running).toBe(true);
    expect(armed(engine)).toBe(false);
    engine.dispose();
  });

  it('App-Start (keine Geste nötig): arm(true) startet den Kontext sofort', async () => {
    mode = 'resolve';
    const { engine } = await fresh();
    engine.arm(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(created).toHaveLength(1);
    expect(engine.running).toBe(true);
    engine.dispose();
  });

  it('im Browser bleibt es bei der Geste: arm() ohne autoUnlock erzeugt keinen Kontext', async () => {
    const { engine } = await fresh();
    engine.arm(false);
    expect(created).toHaveLength(0);
    expect(armed(engine)).toBe(true);
    engine.dispose();
  });

  it('Stumm aus (Ton-Schalter): hängt resume(), kommen die Gesten nach 400 ms zurück', async () => {
    mode = 'resolve';
    const { engine, settings } = await fresh();
    engine.unlock();
    await vi.advanceTimersByTimeAsync(0);
    expect(engine.running).toBe(true);
    settings.getState().setMuted(true);
    await vi.advanceTimersByTimeAsync(200);
    expect(engine.running).toBe(false);
    mode = 'pending';
    settings.getState().setMuted(false);
    expect(armed(engine)).toBe(false);
    await vi.advanceTimersByTimeAsync(401);
    expect(armed(engine)).toBe(true);
    engine.dispose();
    settings.getState().setMuted(false);
  });
});
