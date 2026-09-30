import { describe, expect, it, vi } from 'vitest';
import { MiniOfflineAudioContext } from './miniOffline';

/**
 * The iOS app (Capacitor native): the engine starts its context when the module loads — no tap, and before any
 * component could schedule a sound (the splash mounts before the flow's effects).
 */

const created = vi.hoisted(() => ({ count: 0 }));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }));

class FakeCtx extends MiniOfflineAudioContext {
  override state: AudioContextState = 'suspended';
  baseLatency = 0;
  outputLatency = 0;
  constructor() {
    super(2, 44100, 44100);
    created.count++;
  }
  resume(): Promise<void> {
    this.state = 'running';
    return Promise.resolve();
  }
  suspend(): Promise<void> {
    this.state = 'suspended';
    return Promise.resolve();
  }
  close(): Promise<void> {
    return Promise.resolve();
  }
}

describe('AudioEngine in der App', () => {
  it('startet den Kontext beim Laden des Moduls, ohne Geste', async () => {
    vi.stubGlobal('window', { AudioContext: FakeCtx, addEventListener: () => undefined, removeEventListener: () => undefined });
    vi.stubGlobal('document', { hidden: false, addEventListener: () => undefined, removeEventListener: () => undefined });
    const { useAudioSettings } = await import('./settings');
    useAudioSettings.getState().setMuted(false);
    const { audio } = await import('./engine');
    await new Promise((r) => setTimeout(r, 0));
    expect(created.count).toBe(1);
    expect(audio.running).toBe(true);
    // The diagnostics handle is there for the Safari Web Inspector.
    expect((window as unknown as { __eeAudio?: unknown }).__eeAudio).toBe(audio);
    audio.dispose();
    vi.unstubAllGlobals();
  });
});
