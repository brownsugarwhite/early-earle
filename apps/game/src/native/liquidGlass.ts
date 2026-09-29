import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { LiquidGlass, type GlassHudState, type GlassLayout } from '@ee/liquid-glass';
import { useEffect, useRef, useState } from 'react';

export type { GlassAction, GlassHudState, GlassLayout, GlassTop } from '@ee/liquid-glass';

export interface NativeGlass {
  /** A native overlay is available (iOS app, iOS 16+); the CSS HUD hands over its pills and actions. */
  active: boolean;
  /** Real Liquid Glass (iOS 26+) rather than a material blur. */
  glass: boolean;
}

const NONE: NativeGlass = { active: false, glass: false };
let probe: Promise<NativeGlass> | null = null;

/** Cached availability check; resolves to `NONE` on the web without touching the bridge. */
export function probeNativeGlass(): Promise<NativeGlass> {
  if (!probe) {
    probe = Capacitor.isNativePlatform()
      ? LiquidGlass.isAvailable()
          .then((a) => ({ active: a.available, glass: a.glass }))
          .catch(() => NONE)
      : Promise.resolve(NONE);
  }
  return probe;
}

/** `{ active, glass }` once the probe has answered (`NONE` until then and on the web). */
export function useNativeGlass(): NativeGlass {
  const [state, setState] = useState<NativeGlass>(NONE);
  useEffect(() => {
    let alive = true;
    void probeNativeGlass().then((s) => {
      if (alive) setState(s);
    });
    return () => {
      alive = false;
    };
  }, []);
  return state;
}

let shown = false;
let lastJson = '';
let queue: Promise<void> = Promise.resolve();
const swallow = (): void => undefined;

/**
 * Mirrors a HUD state to the native overlay: first call shows, later calls update (pills morph), `null` hides.
 * Identical states are skipped; calls are serialised so show/update/hide keep their order.
 */
export function syncNativeGlass(state: GlassHudState | null): Promise<void> {
  queue = queue.then(async () => {
    if (!state) {
      if (!shown) return;
      shown = false;
      lastJson = '';
      await LiquidGlass.hide().catch(swallow);
      return;
    }
    const json = JSON.stringify(state);
    if (shown && json === lastJson) return;
    lastJson = json;
    if (shown) {
      await LiquidGlass.update(state).then(swallow, swallow);
    } else {
      shown = true;
      await LiquidGlass.show(state).then(swallow, swallow);
    }
  });
  return queue;
}

export function hideNativeGlass(): Promise<void> {
  return syncNativeGlass(null);
}

/** Subscribes to native action taps (ids from the `actions` sent with the state). */
export function useNativeGlassActions(handler: (id: string) => void, enabled: boolean): void {
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    let handle: PluginListenerHandle | null = null;
    void LiquidGlass.addListener('action', (e) => ref.current(e.id)).then((h) => {
      if (alive) handle = h;
      else void h.remove();
    });
    return () => {
      alive = false;
      void handle?.remove();
    };
  }, [enabled]);
}

/** Heights of the native pills (CSS px) so web elements can keep clear of them. */
export function useNativeGlassLayout(enabled: boolean): GlassLayout | null {
  const [layout, setLayout] = useState<GlassLayout | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    let handle: PluginListenerHandle | null = null;
    void LiquidGlass.addListener('layout', (l) => {
      if (alive) setLayout(l);
    }).then((h) => {
      if (alive) handle = h;
      else void h.remove();
    });
    return () => {
      alive = false;
      void handle?.remove();
    };
  }, [enabled]);
  return layout;
}
