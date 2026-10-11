// Federanimation der Layout-Rechtecke (rAF, außerhalb von React). Viewports kritisch gedämpft
// (kein Überschwingen, sonst entstehen kurz Lücken/Überlappungen), die Library leicht federnd.

import { create } from 'zustand';
import type { Rect, ViewId } from '../types';
import type { Layout } from './layout';

type Schluessel = ViewId | 'library';
type Zustand = Record<Schluessel, Rect>;

export const useRahmen = create<{ rects: Zustand | null; bewegt: boolean }>(() => ({ rects: null, bewegt: false }));

const STEIFHEIT = 230;
const DAEMPFUNG_VIEW = 1.0;
const DAEMPFUNG_LIBRARY = 0.82;

type Feder = { pos: number[]; vel: number[]; ziel: number[] };

const federn = new Map<Schluessel, Feder>();
let laeuft = false;
let zuletzt = 0;

const alsArray = (r: Rect) => [r.x, r.y, r.w, r.h];
const alsRect = (a: number[]): Rect => ({ x: a[0]!, y: a[1]!, w: a[2]!, h: a[3]! });

function veroeffentlichen(bewegt: boolean) {
  const rects = {} as Zustand;
  federn.forEach((f, k) => {
    rects[k] = alsRect(f.pos);
  });
  useRahmen.setState({ rects, bewegt });
}

function schritt(jetzt: number) {
  const dt = Math.min(1 / 30, Math.max(1 / 240, (jetzt - zuletzt) / 1000));
  zuletzt = jetzt;
  let ruhig = true;
  federn.forEach((f, k) => {
    const zeta = k === 'library' ? DAEMPFUNG_LIBRARY : DAEMPFUNG_VIEW;
    const c = 2 * zeta * Math.sqrt(STEIFHEIT);
    for (let i = 0; i < 4; i++) {
      const a = -STEIFHEIT * (f.pos[i]! - f.ziel[i]!) - c * f.vel[i]!;
      f.vel[i] = f.vel[i]! + a * dt;
      f.pos[i] = f.pos[i]! + f.vel[i]! * dt;
      if (Math.abs(f.pos[i]! - f.ziel[i]!) > 0.05 || Math.abs(f.vel[i]!) > 0.5) ruhig = false;
    }
  });
  if (ruhig) {
    federn.forEach((f) => {
      f.pos = f.ziel.slice();
      f.vel = [0, 0, 0, 0];
    });
    laeuft = false;
    veroeffentlichen(false);
    return;
  }
  veroeffentlichen(true);
  requestAnimationFrame(schritt);
}

/** Neues Ziel-Layout; `sofort` springt ohne Animation (z. B. bei Fenstergröße). */
export function setzeLayoutZiel(layout: Layout, sofort: boolean) {
  const ziele: [Schluessel, Rect][] = [...(Object.entries(layout.views) as [ViewId, Rect][]), ['library', layout.library]];
  for (const [k, r] of ziele) {
    const f = federn.get(k);
    if (!f || sofort) federn.set(k, { pos: alsArray(r), vel: [0, 0, 0, 0], ziel: alsArray(r) });
    else f.ziel = alsArray(r);
  }
  if (sofort) {
    veroeffentlichen(laeuft);
    return;
  }
  if (!laeuft) {
    laeuft = true;
    zuletzt = performance.now();
    requestAnimationFrame(schritt);
  }
}
