// Blender-artige Navigation im 3D-Viewport: Drehteller um das Ziel (rechte Maustaste),
// Verschieben in der Bildebene (mittlere Taste), Rad = Abstand.

import type { Kamera } from '../state/uiStore';

export type V3 = [number, number, number];

export function kameraPosition(k: Kamera): V3 {
  const ce = Math.cos(k.elevation);
  return [k.ziel[0] + k.distanz * ce * Math.sin(k.azimut), k.ziel[1] + k.distanz * Math.sin(k.elevation), k.ziel[2] + k.distanz * ce * Math.cos(k.azimut)];
}

const GRENZE = (89 * Math.PI) / 180;

/** Szene folgt der Maus: nach rechts ziehen dreht sie nach rechts, nach unten ziehen zeigt mehr von oben. */
export function drehen(k: Kamera, dx: number, dy: number): Kamera {
  return { ...k, azimut: k.azimut - dx * 0.008, elevation: Math.min(GRENZE, Math.max(-GRENZE, k.elevation + dy * 0.008)) };
}

/** Ziel in der Bildebene verschieben; `hoehe` = Viewporthöhe in px, `fov` in Grad. */
export function verschieben3d(k: Kamera, dx: number, dy: number, hoehe: number, fov: number): Kamera {
  const proPixel = (2 * k.distanz * Math.tan((fov * Math.PI) / 360)) / Math.max(1, hoehe);
  const ca = Math.cos(k.azimut);
  const sa = Math.sin(k.azimut);
  const se = Math.sin(k.elevation);
  const ce = Math.cos(k.elevation);
  // Rechts- und Hochvektor der Kamera
  const rechts: V3 = [ca, 0, -sa];
  const hoch: V3 = [-se * sa, ce, -se * ca];
  const z = k.ziel;
  return {
    ...k,
    ziel: [
      z[0] - (rechts[0] * dx - hoch[0] * dy) * proPixel,
      z[1] - (rechts[1] * dx - hoch[1] * dy) * proPixel,
      z[2] - (rechts[2] * dx - hoch[2] * dy) * proPixel,
    ],
  };
}

export function zoomen(k: Kamera, faktor: number): Kamera {
  return { ...k, distanz: Math.min(40, Math.max(0.3, k.distanz / faktor)) };
}
