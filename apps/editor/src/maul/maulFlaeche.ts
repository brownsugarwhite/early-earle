// Maul-Tab (Versuch 12.10.): Körperfläche S0 als Strahlraster, damit neu gesetzte Lippenpunkte ihre dritte Koordinate
// von der Fläche bekommen (wie Blenders „Face Project“). Neu gebaut nur, wenn sich die Profile ändern.

import { type Ansicht, type Dokument, type V2, type V3T, pfadAbtasten, vollerPfad } from '@ee/shape';
import { MAUL_STANDARD, type Strahlraster, flaecheS0, naechsterFlaechenpunkt, rasterAlle, treffer } from '@ee/shape/versuch';

let zwischenspeicher: { profile: Dokument['profile']; raster: Record<Ansicht, Strahlraster> } | null = null;

export function strahlen(dok: Dokument): Record<Ansicht, Strahlraster> {
  if (zwischenspeicher?.profile !== dok.profile) zwischenspeicher = { profile: dok.profile, raster: rasterAlle(flaecheS0(dok, MAUL_STANDARD)) };
  return zwischenspeicher.raster;
}

/** Punkt auf der sichtbaren Fläche unter dem Cursor (Seite: rechte Flanke, Front: vorn), sonst der nächste Flächenpunkt. */
export function punktAufFlaeche(dok: Dokument, ansicht: Ansicht, q: V2): V3T | null {
  const r = strahlen(dok)[ansicht];
  const h = treffer(r, q)[0] ?? naechsterFlaechenpunkt(r, q);
  if (!h) return null;
  return [h.p[0], h.p[1], Math.max(0, h.p[2])];
}

/** Start der Maullinie: Front/Top auf der Achse, Seite auf der Außenkontur (Florian 12.10.); z = 0. */
export function startPunkt(dok: Dokument, ansicht: Ansicht, q: V2): V3T {
  if (ansicht === 'seite') {
    const umriss = pfadAbtasten(vollerPfad(dok.profile.seite), 24);
    let best = umriss[0]!;
    let d = Infinity;
    for (const p of umriss) {
      const e = Math.hypot(p.x - q.x, p.y - q.y);
      if (e < d) {
        d = e;
        best = p;
      }
    }
    return [best.x, best.y, 0];
  }
  if (ansicht === 'front') {
    // auf der Achse: vorderster Flächenpunkt in dieser Höhe
    const p = punktAufFlaeche(dok, 'front', { x: 0, y: q.y });
    return [p ? p[0] : 0, q.y, 0];
  }
  const p = punktAufFlaeche(dok, 'top', { x: q.x, y: 0 });
  return [q.x, p ? p[1] : 0, 0];
}
