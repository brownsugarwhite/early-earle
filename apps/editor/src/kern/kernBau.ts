// Wesen-Editor 2, Phase 0 / Beweis 1 (13.10.2026): Bauweise „kern“ als Tab am 3D-Fenster. Der Seitenumriss wird einmal
// abgeleitet (Leiter, Poisson-Dicke, Röhre, Löser; packages/shape/src/kern), danach bewegt ein Zug am Seitenumriss nur
// die Ziele; Löser und Matrix liefern das feine Netz in wenigen Millisekunden. Zur Anzeige: Abweichung der Naht von
// der Kurve (px bei 461 px je Kachel) und Zeiten.

import type { Dokument, V2 } from '@ee/shape';
import { type Ableitung, ableiten, alleFlaechen, seiteZiehen, umrissBei, umrissDicht } from '@ee/shape/kern';
import { zuDreiecken, type V3 } from '@ee/shape/versuch';
import { create } from 'zustand';

export type KernInfo = {
  kaefigPunkte: number;
  feinPunkte: number;
  /** Naht → Kurve, max und Mittel (px) */
  nahtMax: number;
  nahtMittel: number;
  /** Zeiten (ms) */
  ableitung: number;
  zug: number;
  ecken: number;
  schnell: boolean;
};

export const useKernAnzeige = create<{ info: KernInfo | null }>(() => ({ info: null }));

const PX = 461;
let letzte: { dok: Dokument; abl: Ableitung } | null = null;

function gleicheTopologie(a: Dokument, b: Dokument): boolean {
  return a.profile.seite.knoten.length === b.profile.seite.knoten.length && a.profile.front === b.profile.front && a.profile.top === b.profile.top && a.skalierung === b.skalierung;
}

function nahtAbweichung(abl: Ableitung, dok: Dokument): { max: number; mittel: number } {
  const u = umrissDicht(dok);
  let max = 0;
  let summe = 0;
  const n = abl.naht.fein.length;
  for (let k = 0; k < n; k++) {
    const i = abl.naht.fein[k]!;
    const p: V2 = { x: abl.fein[3 * i]!, y: abl.fein[3 * i + 1]! };
    // Abstand zum Umriss-Polygon (dicht abgetastet): nächstes Segment
    let best = Infinity;
    const m = u.pts.length;
    for (let s = 0; s < m; s++) {
      const a = u.pts[s]!;
      const b = u.pts[(s + 1) % m]!;
      const abx = b.x - a.x;
      const aby = b.y - a.y;
      const l2 = abx * abx + aby * aby;
      const f = l2 > 1e-18 ? Math.min(1, Math.max(0, ((p.x - a.x) * abx + (p.y - a.y) * aby) / l2)) : 0;
      const d = Math.hypot(a.x + abx * f - p.x, a.y + aby * f - p.y);
      if (d < best) best = d;
    }
    max = Math.max(max, best);
    summe += best;
  }
  void umrissBei;
  return { max: max * PX, mittel: n ? (summe / n) * PX : 0 };
}

/** Feines Netz (Dreiecke mit Normalen) der Bauweise „kern“; während Gesten nur Zug, sonst Ableitung. */
export function kernBauen(dok: Dokument, schnell: boolean): { positionen: Float32Array; normalen: Float32Array } {
  let abl: Ableitung;
  let zug = 0;
  let ableitung = 0;
  if (schnell && letzte && gleicheTopologie(letzte.dok, dok)) {
    const r = seiteZiehen(letzte.abl, dok);
    abl = r;
    zug = r.zugZeit.leiter + r.zugZeit.ziele + r.zugZeit.loeser + r.zugZeit.matrix;
  } else {
    abl = ableiten(dok);
    ableitung = abl.zeiten.gesamt;
  }
  letzte = { dok, abl };
  const letzteStufe = abl.unterteilung.stufen[abl.unterteilung.stufen.length - 1]!.kaefig;
  const punkte: V3[] = [];
  const f = abl.fein;
  for (let i = 0; i < f.length / 3; i++) punkte.push([f[3 * i]!, f[3 * i + 1]!, f[3 * i + 2]!]);
  const t = zuDreiecken({ punkte, flaechen: alleFlaechen(letzteStufe), schaerfe: new Map() }, 40);
  const ab = nahtAbweichung(abl, dok);
  useKernAnzeige.setState({
    info: { kaefigPunkte: abl.kaefig.n, feinPunkte: punkte.length, nahtMax: ab.max, nahtMittel: ab.mittel, ableitung, zug, ecken: abl.ecken.length + (abl.spitzen.vorn ? 1 : 0) + (abl.spitzen.hinten ? 1 : 0), schnell },
  });
  return t;
}
