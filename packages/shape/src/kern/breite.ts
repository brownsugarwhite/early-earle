// Wesen-Editor 2, Kern (13.10.2026): Breite aus den Silhouetten (Projektionsregel, Recherche „Schnitte“ §5).
// Top: halbe Breite bei x. Front: halbe Breite bei Höhe y. Ein Ring bekommt den größten Maßstab seiner
// Querschnittsvorlage, der in beide Silhouetten passt: liegende Teile aus dem Top, stehende (Hals) aus der Front.

import type { V2 } from '../bezier';
import type { Dokument } from '../dokument';
import { pfadAbtasten, vollerPfad } from '../profil';

export type Breiten = { top: (x: number) => number; front: (y: number) => number; topMax: number; frontMax: number };

function schnittMax(poly: readonly V2[], achse: 'x' | 'y', wert: number): number {
  let out = -Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    const a1 = achse === 'x' ? a.x : a.y;
    const b1 = achse === 'x' ? b.x : b.y;
    if ((a1 <= wert && b1 >= wert) || (a1 >= wert && b1 <= wert)) {
      const d = b1 - a1;
      const t = Math.abs(d) < 1e-12 ? 0.5 : (wert - a1) / d;
      const q = achse === 'x' ? a.y + t * (b.y - a.y) : a.x + t * (b.x - a.x);
      out = Math.max(out, Math.abs(q));
    }
  }
  return out;
}

/** Silhouettenbreiten (Welt, mit Skalierung). Außerhalb der Silhouette: −∞ (kein Schnitt). */
export function silhouettenBreite(dok: Dokument): Breiten {
  const s = dok.skalierung;
  const top = pfadAbtasten(vollerPfad(dok.profile.top), 40).map((p) => ({ x: p.x * s, y: p.y * s }));
  const front = pfadAbtasten(vollerPfad(dok.profile.front), 40).map((p) => ({ x: p.x * s, y: p.y * s }));
  return breitenAusPolygonen(top, front);
}

/** Breiten aus geschlossenen Polygonen (Top: x, z; Front: z, y) — z. B. Silhouetten des Rumpfs ohne seitliche Teile (S5). */
export function breitenAusPolygonen(top: readonly V2[], front: readonly V2[]): Breiten {
  let topMax = 0;
  for (const p of top) topMax = Math.max(topMax, Math.abs(p.y));
  let frontMax = 0;
  for (const p of front) frontMax = Math.max(frontMax, Math.abs(p.x));
  return {
    top: (x) => schnittMax(top, 'x', x),
    front: (y) => schnittMax(front, 'y', y),
    topMax,
    frontMax,
  };
}
