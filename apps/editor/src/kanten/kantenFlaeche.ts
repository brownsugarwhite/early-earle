// Kanten (Versuch 12.10. mittags, Florian): Linien liegen auf der Fläche. Neue Punkte holen ihre Tiefe aus der
// Blickrichtung der Ansicht (Front: vordere Fläche, Back: hintere, Top: obere, Bottom: untere, Seite: rechte Flanke).
// Ändert sich die Form, legt `kantenAnFlaeche` jede Linie neu auf die Fläche; sie hängt an der Form wie das Maul.

import type { Ansicht, Blick, Dokument, Kante, V2, V3T } from '@ee/shape';
import { inAnsicht2, naechsterFlaechenpunkt, punktAuf3, segmente3, tiefeIn, treffer } from '@ee/shape/versuch';
import { strahlen } from '../maul/maulFlaeche';
import { kernRaster } from '../netz/netzRaster';
import { useUi } from '../state/uiStore';

/**
 * Raster der Fläche, auf der die Linien liegen: in der Bauweise Kern der echte Körper (S1, `kernRaster`), sonst die
 * Versuchsfläche S0.
 */
const raster = (dok: Dokument): Record<Ansicht, ReturnType<typeof strahlen>[Ansicht]> => kernRaster() ?? strahlen(dok);

/** Raster-Ansicht einer Blickrichtung (Back nutzt das Front-Raster, Bottom das Top-Raster). */
export const ansichtVon = (b: Blick): Ansicht => (b === 'hinten' ? 'front' : b === 'unten' ? 'top' : b);
const vonHinten = (b: Blick) => b === 'hinten' || b === 'unten';

/** Punkt auf der Fläche, die man aus dieser Blickrichtung unter q sieht; außerhalb des Umrisses der nächste Flächenpunkt. */
export function kantenPunkt(dok: Dokument, blick: Blick, q: V2): V3T | null {
  const r = raster(dok)[ansichtVon(blick)];
  const hs = treffer(r, q);
  const h = hs.length ? (vonHinten(blick) ? hs[hs.length - 1]! : hs[0]!) : naechsterFlaechenpunkt(r, q);
  return h ? [h.p[0], h.p[1], h.p[2]] : null;
}

/**
 * Punkt auf der Fläche unter q, stetig zu `alt` (Treffer mit der nächsten Tiefe): So bleibt ein gezogener Knoten auf
 * demselben Teil der Fläche, in jeder Ansicht (wie Blenders „Face Project“ beim Verschieben).
 */
export function kantenPunktStetig(dok: Dokument, ansicht: Ansicht, q: V2, alt: V3T): V3T | null {
  const h = naechsterFlaechenpunkt(raster(dok)[ansicht], q, tiefeIn(alt, ansicht));
  return h ? [h.p[0], h.p[1], h.p[2]] : null;
}

/** Sieht man p aus dieser Blickrichtung? Außerhalb des Umrisses: ja (die Linie liegt dann am Rand). */
export function sichtbar(dok: Dokument, blick: Blick, p: V3T, toleranz = 0.012): boolean {
  const a = ansichtVon(blick);
  const hs = treffer(raster(dok)[a], inAnsicht2(p, a));
  if (!hs.length) return true;
  const h = vonHinten(blick) ? hs[hs.length - 1]! : hs[0]!;
  return Math.abs(tiefeIn(p, a) - h.tiefe) < toleranz;
}

export type KantenProbe = { p: V3T; h: number };

/** Proben entlang der Linie mit Härte (linear zwischen den Knoten). */
export function kantenProben(k: Kante, proSegment = 12): KantenProbe[] {
  const out: KantenProbe[] = [];
  segmente3(k).forEach((seg, s) => {
    const h0 = k.haerte[s] ?? 0;
    const h1 = k.haerte[s + 1] ?? h0;
    for (let i = s === 0 ? 0 : 1; i <= proSegment; i++) {
      const t = i / proSegment;
      out.push({ p: punktAuf3(seg, t), h: h0 + (h1 - h0) * t });
    }
  });
  return out;
}

/** Härte an der Stelle (Segment s, t) – für das Einfügen eines Knotens. */
export function haerteBei(k: Kante, s: number, t: number): number {
  const h0 = k.haerte[s] ?? 0;
  const h1 = k.haerte[s + 1] ?? h0;
  return h0 + (h1 - h0) * t;
}

/**
 * Kanten folgen der Form: Jeder Knoten wird in der Ansicht seiner Linie neu auf die Fläche gelegt (Ansichtskoordinaten
 * bleiben, Tiefe stetig zur alten Lage).
 */
export function kantenAnFlaeche(dok: Dokument): Dokument {
  if (!dok.kanten?.length) return dok;
  // Bauweise Kern (S1): keine versteckten Schreibvorgänge — die Linie gilt in ihrer Zeichenansicht, die Tiefe ist nur ein
  // Hinweis; der Worker legt sie bei jedem Bau neu auf die Haut (Liniennetz)
  if (useUi.getState().bauweise === 'kern') return dok;
  let geaendert = false;
  const kanten = dok.kanten.map((k) => {
    const a = ansichtVon(k.blick);
    const knoten = k.knoten.map((kn) => {
      const p = kantenPunktStetig(dok, a, inAnsicht2(kn.p, a), kn.p);
      if (!p || Math.hypot(p[0] - kn.p[0], p[1] - kn.p[1], p[2] - kn.p[2]) < 1e-9) return kn;
      geaendert = true;
      return { ...kn, p };
    });
    return { ...k, knoten };
  });
  return geaendert ? { ...dok, kanten } : dok;
}
