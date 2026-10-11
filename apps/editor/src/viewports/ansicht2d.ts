// Ansichtstransformation der 2D-Viewports: Weltkoordinaten (Kachel-Einheiten, v nach oben) ↔ Bildpunkte.
// Der Maßstab hängt an der Viewportgröße: Maximieren vergrößert den Inhalt mit.

import type { V2 } from '@ee/shape';
import type { Ansicht2D } from '../state/uiStore';

export const KACHEL_ANTEIL = 0.925;
const ZOOM_MIN = 0.08;
const ZOOM_MAX = 60;

export function massstab(a: Ansicht2D, w: number, h: number): number {
  return a.zoom * KACHEL_ANTEIL * Math.min(w, h);
}

export function zuBild(a: Ansicht2D, w: number, h: number, p: V2): V2 {
  const s = massstab(a, w, h);
  return { x: w / 2 + (p.x - a.cu) * s, y: h / 2 - (p.y - a.cv) * s };
}

export function zuWelt(a: Ansicht2D, w: number, h: number, q: V2): V2 {
  const s = massstab(a, w, h);
  return { x: a.cu + (q.x - w / 2) / s, y: a.cv - (q.y - h / 2) / s };
}

/** Zoom um den Bildpunkt q (der Weltpunkt unter dem Cursor bleibt stehen). */
export function zoomUm(a: Ansicht2D, w: number, h: number, q: V2, faktor: number): Ansicht2D {
  const p = zuWelt(a, w, h, q);
  const zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, a.zoom * faktor));
  const s = zoom * KACHEL_ANTEIL * Math.min(w, h);
  return { zoom, cu: p.x - (q.x - w / 2) / s, cv: p.y + (q.y - h / 2) / s };
}

export function verschieben(a: Ansicht2D, w: number, h: number, dx: number, dy: number): Ansicht2D {
  const s = massstab(a, w, h);
  return { ...a, cu: a.cu - dx / s, cv: a.cv + dy / s };
}

/** Rad-Ereignis → Zoomfaktor (Mausrad in Stufen, Trackpad-Pinch kommt als ctrlKey). */
export function radFaktor(e: { deltaY: number; deltaMode: number; ctrlKey: boolean }): number {
  const d = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY;
  return Math.exp(-d * (e.ctrlKey ? 0.01 : 0.002));
}

/**
 * Trackpad oder Mausrad? Chrome meldet beim Trackpad wheelDeltaY = −3 · deltaY, ein Mausrad rastet in
 * festen Stufen; seitliches Wischen gibt es nur auf Trackpad/Magic Mouse. Pinch (ctrlKey) zählt als Zoom.
 */
export function istTrackpad(e: WheelEvent): boolean {
  if (e.ctrlKey || e.deltaMode !== 0) return false;
  if (e.deltaX !== 0) return true;
  const w = (e as WheelEvent & { wheelDeltaY?: number }).wheelDeltaY;
  if (w) return Math.abs(w) === Math.abs(e.deltaY * 3);
  return !Number.isInteger(e.deltaY);
}
