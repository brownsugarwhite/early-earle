// Maul-Tab (Versuch 12.10.): Körperfläche S0 als Strahlraster, damit neu gesetzte Lippenpunkte ihre dritte Koordinate
// von der Fläche bekommen (wie Blenders „Face Project“). Neu gebaut nur, wenn sich die Profile ändern.

import { type Ansicht, type Dokument, type V2, type V3T, pfadAbtasten, vollerPfad } from '@ee/shape';
import { MAUL_STANDARD, type Strahlraster, flaecheS0, naechsterFlaechenpunkt, rasterAlle, treffer, unterteilenMehrfach, wirbelKaefig } from '@ee/shape/versuch';
import { useUi } from '../state/uiStore';
import { aktuellesNetz } from '../kern/netzStand';

let zwischenspeicher: { profile: Dokument['profile']; spanten: Dokument['spanten']; haupt: number | undefined; wirbel: Dokument['wirbelsaeule'] | boolean; raster: Record<Ansicht, Strahlraster> } | null = null;

/** Strahlraster der Fläche S0 (gemerkt je Profile und Spanten). */
export function strahlen(dok: Dokument): Record<Ansicht, Strahlraster> {
  // Bauweise Wirbelsäule (Versuch 12.10. nachts): Linien rasten auf dem Wirbelsäulen-Körper ein (Hals hoch, Kopf drauf)
  const wirbel = useUi.getState().bauweise === 'wirbel' ? (dok.wirbelsaeule ?? true) : false;
  if (zwischenspeicher?.profile !== dok.profile || zwischenspeicher.spanten !== dok.spanten || zwischenspeicher.haupt !== dok.hauptspant || zwischenspeicher.wirbel !== wirbel) {
    const flaeche = wirbel ? unterteilenMehrfach(wirbelKaefig(dok).netz, 2) : flaecheS0(dok, MAUL_STANDARD);
    zwischenspeicher = { profile: dok.profile, spanten: dok.spanten, haupt: dok.hauptspant, wirbel, raster: rasterAlle(flaeche) };
  }
  return zwischenspeicher.raster;
}

/**
 * Bauweise Kern (15.10., Florian: „Beim Langhals wird ein Riesenmaul direkt in die Schnauze eingezeichnet“): Die dritte
 * Koordinate kommt vom feinen Kern-Netz, nicht vom Platzhalter-Loft (dessen Front lag beim Langhals weit hinter der
 * Schnauze, eine in der Front gezeichnete Linie landete so auf Halssprossen). Seite: rechte Flanke (größtes z), Front:
 * vorn (kleinstes x), Top: oben (größtes y) in einem kleinen Fenster um den Zeiger, sonst der nächste Netzpunkt.
 */
function punktAufKern(ansicht: Ansicht, q: V2): V3T | null {
  const n = aktuellesNetz();
  if (!n) return null;
  const P = n.netz.positionen;
  const sk = n.skalierung || 1;
  const fenster = 0.006 * sk;
  let best = -1;
  let bestWert = 0;
  let naechster = -1;
  let naechsterD = Infinity;
  for (let i = 0; i + 2 < P.length; i += 3) {
    const x = P[i]!;
    const y = P[i + 1]!;
    const z = P[i + 2]!;
    const u = ansicht === 'seite' ? x : ansicht === 'front' ? z : x;
    const v = ansicht === 'top' ? z : y;
    const du = u - q.x * sk;
    const dv = v - q.y * sk;
    const d = du * du + dv * dv;
    if (d < naechsterD) {
      naechsterD = d;
      naechster = i;
    }
    if (Math.abs(du) > fenster || Math.abs(dv) > fenster) continue;
    const wert = ansicht === 'seite' ? z : ansicht === 'front' ? -x : y;
    if (best < 0 || wert > bestWert) {
      best = i;
      bestWert = wert;
    }
  }
  const i = best >= 0 ? best : naechster;
  if (i < 0) return null;
  // Zeigerlage in den zwei Blattkoordinaten behalten, nur die dritte vom Netz
  const x = ansicht === 'front' ? P[i]! / sk : q.x;
  const y = ansicht === 'top' ? P[i + 1]! / sk : q.y;
  const z = ansicht === 'seite' ? Math.max(0, P[i + 2]! / sk) : ansicht === 'front' ? Math.abs(q.x) : q.y;
  return [x, y, z];
}

/**
 * Halbe Breite der Haut an einem Seitenpunkt (x, y) aus dem zuletzt gebauten Kern-Netz (Profil-Einheiten; größtes z im
 * Fenster 0,006 um den Punkt), null außerhalb. Für `lippeAnHaut`: neue Lippenlinien liegen auf der Haut (14.10. nachts).
 */
export function hautTiefe(x: number, y: number): number | null {
  const n = aktuellesNetz();
  if (!n) return null;
  const P = n.netz.positionen;
  const sk = n.skalierung || 1;
  // Fenster wächst, bis es Netzpunkte findet (auf groben Stellen des Netzes lag sonst keiner darin, die Linie blieb flach)
  for (let fenster = 0.006 * sk; fenster <= 0.05 * sk; fenster *= 2) {
    let best = -1;
    for (let i = 0; i + 2 < P.length; i += 3) {
      if (Math.abs(P[i]! - x * sk) > fenster || Math.abs(P[i + 1]! - y * sk) > fenster) continue;
      best = Math.max(best, P[i + 2]!);
    }
    if (best > 0) return best / sk;
  }
  return null;
}

/** Punkt auf der sichtbaren Fläche unter dem Cursor (Seite: rechte Flanke, Front: vorn), sonst der nächste Flächenpunkt. */
export function punktAufFlaeche(dok: Dokument, ansicht: Ansicht, q: V2): V3T | null {
  if (useUi.getState().bauweise === 'kern') {
    const k = punktAufKern(ansicht, q);
    if (k) return k;
  }
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
