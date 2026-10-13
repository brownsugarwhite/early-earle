// Wesen-Editor 2, Phase 0 / Beweis 1 (13.10.2026): Bauweise „kern“ als Tab am 3D-Fenster. Der Seitenumriss wird einmal
// abgeleitet (Leiter, Poisson-Dicke, Röhre, Löser; packages/shape/src/kern), danach bewegt ein Zug am Seitenumriss nur
// die Ziele; Löser und Matrix liefern das feine Netz in wenigen Millisekunden. Zur Anzeige: Abweichung der Naht von
// der Kurve (px bei 461 px je Kachel) und Zeiten.

import type { Dokument, V2 } from '@ee/shape';
import { DESKRIPTOR_FLOATS, type Ableitung, ableiten, alleFlaechen, deskriptoren, seiteZiehen, umrissBei, umrissDicht } from '@ee/shape/kern';
import { zuDreiecken, type V3 } from '@ee/shape/versuch';
import { create } from 'zustand';
import { type Auge, type Look, PALETTEN } from '../three/wesenLook';

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

const q = new URLSearchParams(location.search);
const startLook: Look = q.get('look') === 'earle' ? 'earle' : 'matcap';
const startPalette = q.get('palette') && PALETTEN[q.get('palette')!] ? q.get('palette')! : 'tiger';

export const useKernAnzeige = create<{ info: KernInfo | null; look: Look; palette: string; setzeLook: (l: Look) => void; setzePalette: (p: string) => void }>((set) => ({
  info: null,
  look: startLook,
  palette: startPalette,
  setzeLook: (look) => set({ look }),
  setzePalette: (palette) => set({ palette }),
}));

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

export type KernNetz = {
  positionen: Float32Array;
  normalen: Float32Array;
  /** 16 Deskriptor-Floats je Ecke (nur mit Look „earle“) */
  deskriptoren: Float32Array | null;
  hoehe: number;
  augen: Auge[];
};

/** Deskriptoren je feinem Punkt → je Dreiecksecke in der Reihenfolge von `zuDreiecken` (Fächer je Fläche). */
function jeEcke(d: Float32Array, flaechen: number[][]): Float32Array {
  let ecken = 0;
  for (const f of flaechen) ecken += 3 * Math.max(0, f.length - 2);
  const out = new Float32Array(ecken * DESKRIPTOR_FLOATS);
  let o = 0;
  for (const f of flaechen) {
    for (let i = 1; i < f.length - 1; i++) {
      for (const v of [f[0]!, f[i]!, f[i + 1]!]) {
        out.set(d.subarray(v * DESKRIPTOR_FLOATS, (v + 1) * DESKRIPTOR_FLOATS), o);
        o += DESKRIPTOR_FLOATS;
      }
    }
  }
  return out;
}

/** Ein gemaltes Schlitzauge rechts am Kopf (Ring 2, 45° oben rechts), gespiegelt links; Größe ≈ 11 % der Höhe. */
function augenAm(abl: Ableitung, hoehe: number): Auge[] {
  const v = abl.vorlage;
  const i = Math.min(2, v.R - 1);
  const j = Math.max(1, Math.round(v.N / 8));
  const p = v.ringPunkt(i, j);
  const f = abl.fein;
  // Ringmitte aus den feinen Lagen der Ringpunkte
  let mx = 0;
  let my = 0;
  let mz = 0;
  for (let k = 0; k < v.N; k++) {
    const r = v.ringPunkt(i, k);
    mx += f[3 * r]!;
    my += f[3 * r + 1]!;
    mz += f[3 * r + 2]!;
  }
  mx /= v.N;
  my /= v.N;
  mz /= v.N;
  const pos: [number, number, number] = [f[3 * p]!, f[3 * p + 1]!, f[3 * p + 2]!];
  const n: [number, number, number] = [pos[0] - mx, pos[1] - my, pos[2] - mz];
  const l = Math.hypot(...n) || 1;
  const normale: [number, number, number] = [n[0] / l, n[1] / l, n[2] / l];
  const groesse = 0.11 * hoehe;
  return [
    { pos, normale, groesse },
    { pos: [pos[0], pos[1], -pos[2]], normale: [normale[0], normale[1], -normale[2]], groesse },
  ];
}

/** Feines Netz (Dreiecke mit Normalen) der Bauweise „kern“; während Gesten nur Zug, sonst Ableitung. */
export function kernBauen(dok: Dokument, schnell: boolean): KernNetz {
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
  const flaechen = alleFlaechen(letzteStufe);
  const t = zuDreiecken({ punkte, flaechen, schaerfe: new Map() }, 40);
  let hoehe = 0;
  for (const p of punkte) hoehe = Math.max(hoehe, p[1]);
  const earle = useKernAnzeige.getState().look === 'earle';
  const desk = earle ? jeEcke(deskriptoren(abl), flaechen) : null;
  const augen = earle ? augenAm(abl, hoehe) : [];
  const ab = nahtAbweichung(abl, dok);
  useKernAnzeige.setState({
    info: { kaefigPunkte: abl.kaefig.n, feinPunkte: punkte.length, nahtMax: ab.max, nahtMittel: ab.mittel, ableitung, zug, ecken: abl.ecken.length + (abl.spitzen.vorn ? 1 : 0) + (abl.spitzen.hinten ? 1 : 0), schnell },
  });
  return { positionen: t.positionen, normalen: t.normalen, deskriptoren: desk, hoehe, augen };
}
