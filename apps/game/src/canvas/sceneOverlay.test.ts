import { describe, expect, it } from 'vitest';
import { Color } from 'three/webgpu';
import { create } from 'zustand';
import type { SceneContext, SceneController } from './SceneController';
import { attachSceneOverlay, sleepBaseInput, type SceneOverlayState } from './sceneOverlay';

function fakeRenderer() {
  const clear = new Color('#081b25');
  const r = {
    shadowMap: { enabled: true },
    toneMapping: 0,
    toneMappingExposure: 1,
    autoClear: true,
    pixelRatio: 2,
    sizes: [] as Array<[number, number]>,
    clearAlpha: 1,
    getClearColor: (out: Color) => out.copy(clear),
    setClearColor: (c: Color, a: number) => {
      clear.copy(c);
      r.clearAlpha = a;
    },
    getClearAlpha: () => r.clearAlpha,
    getPixelRatio: () => r.pixelRatio,
    setPixelRatio: (p: number) => (r.pixelRatio = p),
    setSize: (w: number, h: number) => r.sizes.push([w, h]),
    clear,
  };
  return r;
}

function makeStore() {
  return create<SceneOverlayState>((set, get) => ({
    overlay: null,
    active: false,
    open: (controller) => set({ overlay: controller, active: false }),
    close: () => {
      if (get().overlay) set({ overlay: null, active: false });
    },
    setActive: (active) => set({ active }),
  }));
}

const tick = () => new Promise((r) => setTimeout(r, 0));

describe('attachSceneOverlay', () => {
  it('lets the overlay draw once mounted, pauses the base, restores the renderer on close', async () => {
    const renderer = fakeRenderer();
    const ctx = { renderer, canvas: {} as HTMLCanvasElement, width: 393, height: 852, dpr: 2, backend: 'webgl2' } as unknown as SceneContext;
    const calls: string[] = [];
    const base: SceneController = { mount: () => undefined, update: () => calls.push('base'), dispose: () => calls.push('base-dispose') };
    const overlay: SceneController = {
      mount: async (c) => {
        // The overlay changes what it needs: no shadows, a paper clear colour, a lower pixel ratio.
        c.renderer.shadowMap.enabled = false;
        c.renderer.setClearColor(new Color('#f7f6d8'), 1);
        c.renderer.setPixelRatio(1.5);
        c.renderer.toneMappingExposure = 2;
      },
      resize: () => calls.push('overlay-resize'),
      update: () => calls.push('overlay'),
      dispose: () => calls.push('overlay-dispose'),
    };
    const store = makeStore();
    const host = attachSceneOverlay(ctx, store);
    expect(host.current(base)).toBe(base);
    expect(host.busy).toBe(false);

    store.getState().open(overlay);
    // Mounting: the base keeps drawing, the governor already pauses.
    expect(host.current(base)).toBe(base);
    expect(host.busy).toBe(true);
    await tick();
    await tick();
    expect(host.current(base)).toBe(overlay);
    expect(store.getState().active).toBe(true);
    expect(calls).toContain('overlay-resize');
    host.resize(ctx);
    expect(renderer.shadowMap.enabled).toBe(false);

    store.getState().close();
    expect(host.current(base)).toBe(base);
    expect(host.busy).toBe(false);
    expect(calls).toContain('overlay-dispose');
    expect(calls).not.toContain('base-dispose');
    expect(renderer.shadowMap.enabled).toBe(true);
    expect(renderer.pixelRatio).toBe(2);
    expect(renderer.toneMappingExposure).toBe(1);
    expect(`#${renderer.clear.getHexString()}`).toBe('#081b25');
    expect(store.getState().active).toBe(false);
    host.dispose();
  });

  it('drops an overlay that is closed while it still mounts', async () => {
    const renderer = fakeRenderer();
    const ctx = { renderer, width: 10, height: 10 } as unknown as SceneContext;
    let disposed = 0;
    let release: () => void = () => undefined;
    const slow: SceneController = { mount: () => new Promise<void>((r) => (release = r)), update: () => undefined, dispose: () => disposed++ };
    const base: SceneController = { mount: () => undefined, update: () => undefined, dispose: () => undefined };
    const store = makeStore();
    const host = attachSceneOverlay(ctx, store);
    store.getState().open(slow);
    await tick();
    store.getState().close();
    release();
    await tick();
    await tick();
    expect(host.current(base)).toBe(base);
    expect(disposed).toBe(1);
    host.dispose();
  });
});

describe('sleepBaseInput', () => {
  it('swallows the game keys before the base sees them and hands them to the overlay', () => {
    const target = new EventTarget();
    const seen: string[] = [];
    const keyEvent = (key: string, mods: Partial<KeyboardEvent> = {}) => Object.assign(new Event('keydown', { cancelable: true }), { key, metaKey: false, ctrlKey: false, altKey: false, ...mods });
    const wake = sleepBaseInput((e) => seen.push(`overlay:${e.key}`), target);
    // The base listens after the overlay (a window bubble listener runs after the capture listener in a browser).
    target.addEventListener('keydown', (e) => seen.push(`base:${(e as KeyboardEvent).key}`));
    for (const k of ['Enter', ' ', 'ArrowLeft', 'Escape', 'x']) target.dispatchEvent(keyEvent(k));
    target.dispatchEvent(keyEvent('Enter', { metaKey: true }));
    expect(seen).toEqual(['overlay:Enter', 'overlay: ', 'overlay:ArrowLeft', 'overlay:Escape', 'base:x', 'base:Enter']);
    wake();
    target.dispatchEvent(keyEvent('Enter'));
    expect(seen.at(-1)).toBe('base:Enter');
  });
});
