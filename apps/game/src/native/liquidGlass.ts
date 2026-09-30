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
/** Last `layout` event of the native overlay (frames of the top pill, REX line and action row). */
let latestLayout: GlassLayout | null = null;

/** Cached availability check; resolves to `NONE` on the web without touching the bridge. */
export function probeNativeGlass(): Promise<NativeGlass> {
  if (!probe) {
    probe = Capacitor.isNativePlatform()
      ? LiquidGlass.isAvailable()
          .then((a) => {
            const s = { active: a.available, glass: a.glass };
            // One app-wide listener keeps the native frames for non-React code (REX's rim, board spot).
            if (s.active) void LiquidGlass.addListener('layout', (l) => (latestLayout = l)).catch(() => undefined);
            return s;
          })
          .catch(() => NONE)
      : Promise.resolve(NONE);
  }
  return probe;
}

/**
 * Frames of the native HUD while it is shown (CSS px of the web view), else null. The DOM HUD is not rendered in
 * the app, so code that measures `.flow-hud` elements reads these instead.
 */
export function nativeGlassLayout(): GlassLayout | null {
  return shown ? latestLayout : null;
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
/** Held (a full-screen web layer such as the Setzkasten covers the HUD): states are only remembered. */
let held = false;
let requested: GlassHudState | null = null;

/**
 * Mirrors a HUD state to the native overlay: first call shows, later calls update (pills morph), `null` hides.
 * Identical states are skipped; calls are serialised so show/update/hide keep their order.
 */
export function syncNativeGlass(state: GlassHudState | null): Promise<void> {
  requested = state;
  if (held) return queue;
  return applyNativeGlass(state);
}

/**
 * Holds the native HUD back while a full-screen web layer is open (it would float above the web view): hides it and
 * remembers every state synced meanwhile; releasing shows the latest one again.
 */
export function holdNativeGlass(on: boolean): Promise<void> {
  if (on === held) return queue;
  held = on;
  return applyNativeGlass(on ? null : requested);
}

function applyNativeGlass(state: GlassHudState | null): Promise<void> {
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
