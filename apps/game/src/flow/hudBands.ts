import type { RexInsets, RexRect } from '@ee/render';
import { nativeGlassLayout } from '../native/liquidGlass';

/**
 * Where the HUD leaves the screen free (CSS px of the viewport): the band between the top pill and the bottom row
 * (REX line + action row). In the iOS app the native Liquid-Glass overlay reports its frames (`nativeGlassLayout`);
 * on the web the DOM HUD is measured. The level HUD is larger than the map HUD (four actions), and it only exists
 * once the level is up — the fly-in frames the board earlier, so `phase: 'level'` also assumes the level's bottom
 * row when it is not on screen yet.
 */
export interface HudBands {
  w: number;
  h: number;
  safe: RexInsets;
  /** Lower edge of the top HUD (px from the top, safe area included). */
  top: number;
  /** Upper edge of the bottom HUD band (px from the top). */
  bottom: number;
  lineBox: RexRect | null;
  actions: RexRect | null;
}

let safeProbe: HTMLDivElement | null = null;

export function safeInsets(): RexInsets {
  if (typeof document === 'undefined') return { top: 0, right: 0, bottom: 0, left: 0 };
  if (!safeProbe || !safeProbe.isConnected) {
    const d = document.createElement('div');
    d.setAttribute('aria-hidden', 'true');
    d.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);';
    document.body.appendChild(d);
    safeProbe = d;
  }
  const cs = getComputedStyle(safeProbe);
  return { top: parseFloat(cs.paddingTop) || 0, right: parseFloat(cs.paddingRight) || 0, bottom: parseFloat(cs.paddingBottom) || 0, left: parseFloat(cs.paddingLeft) || 0 };
}

function rectOf(sel: string): RexRect | null {
  const el = document.querySelector(sel);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 ? { left: r.left, top: r.top, right: r.right, bottom: r.bottom } : null;
}

/** HUD bands for a phase (see `HudBands`). `width`/`height` default to the window. */
export function readHudBands(phase: 'map' | 'level', width?: number, height?: number): HudBands {
  const w = width ?? (typeof window !== 'undefined' ? window.innerWidth : 1280);
  const h = height ?? (typeof window !== 'undefined' ? window.innerHeight : 800);
  const portrait = w < h;
  const safe = safeInsets();
  // Defaults: pill 12 px under the safe area, ≈ 50–58 px tall; bottom row 14 px over the safe area.
  let top = safe.top + (portrait ? 72 : 76);
  const levelBottom = safe.bottom + 14 + 48 + (portrait ? 64 : 58);
  let bottom = h - (phase === 'level' ? levelBottom : safe.bottom + (portrait ? 150 : 130));
  let lineBox: RexRect | null = null;
  let actions: RexRect | null = null;
  if (typeof document !== 'undefined') {
    const native = nativeGlassLayout();
    if (native) {
      if (native.top > 0) top = native.top;
      lineBox = native.line ?? null;
      actions = native.actions ?? null;
      if (!actions && native.bottom > 0) actions = { left: 0, top: h - native.bottom, right: w, bottom: h };
    } else {
      const pill = rectOf('.flow-hud [data-testid="hud-top"]');
      if (pill) top = pill.bottom;
      lineBox = rectOf('.flow-hud [data-testid="rex-line"]');
      actions = rectOf('.flow-hud .hud-actions');
    }
    const measured = Math.min(lineBox?.top ?? Infinity, actions?.top ?? Infinity);
    if (Number.isFinite(measured)) bottom = phase === 'level' ? Math.min(measured, h - levelBottom) : measured;
  }
  return { w, h, safe, top, bottom: Math.max(top + 80, bottom), lineBox, actions };
}
