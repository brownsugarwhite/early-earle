// Wesen-Editor 2, Phase 0 / Beweis 1 (13.10.2026): Bauweise „kern“ als Tab am 3D-Fenster. Der Seitenumriss wird einmal
// abgeleitet (Leiter, Poisson-Dicke, Röhre, Löser; packages/shape/src/kern), danach bewegt ein Zug am Seitenumriss nur
// die Ziele; Löser und Matrix liefern das feine Netz in wenigen Millisekunden. Zur Anzeige: Abweichung der Naht von
// der Kurve (px bei 461 px je Kachel) und Zeiten.

import type { Dokument, V2 } from '@ee/shape';
import { DESKRIPTOR_FLOATS, type Ableitung, type MaulErgebnis, ableiten, ableitenMitMaul, alleFlaechen, deskriptoren, maulLinieVorlage, maulOptionenVorlage, maulPose, seiteZiehen, umrissBei, umrissDicht } from '@ee/shape/kern';
import { useUi } from '../state/uiStore';
import { zuDreiecken, type V3 } from '@ee/shape/versuch';
import { create } from 'zustand';
import { type Auge, type Look, PALETTEN } from '../three/wesenLook';

export type MaulArt = 'aus' | 'vorn' | 'unten' | 'hals';

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
const startMaul: MaulArt = (['vorn', 'unten', 'hals'] as const).find((a) => a === q.get('maul')) ?? 'aus';
if (q.get('oeffnung')) useUi.getState().setzeOeffnung(Number(q.get('oeffnung')));

export const useKernAnzeige = create<{
  info: KernInfo | null;
  look: Look;
  palette: string;
  /** Beweis 2: Maul an einer der drei Stellen (vorgefertigte Linie je Wesen) */
  maul: MaulArt;
  /** Käfig als Linien zeigen (Röntgen) */
  kaefig: boolean;
  setzeLook: (l: Look) => void;
  setzePalette: (p: string) => void;
  setzeMaul: (m: MaulArt) => void;
  setzeKaefig: (an: boolean) => void;
}>((set) => ({
  info: null,
  look: startLook,
  palette: startPalette,
  maul: startMaul,
  kaefig: q.get('kaefig') === '1',
  setzeLook: (look) => set({ look }),
  setzePalette: (palette) => set({ palette }),
  setzeMaul: (maul) => set({ maul }),
  setzeKaefig: (kaefig) => set({ kaefig }),
}));

const PX = 461;
let letzte: { dok: Dokument; abl: Ableitung; maul: MaulArt } | null = null;

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
  /** Käfigkanten als Liniensegmente (Röntgen), sonst null */
  kaefigLinien: Float32Array | null;
  /** Lippenband-Breite (Welt) bei Maul, sonst 0 */
  lippenBand: number;
  kaefigFarben: Float32Array | null;
};

/** Käfigkanten (Lagen `xyz`) als Segmente; Lippen und Tasche in Farbe. */
function kaefigSegmente(abl: Ableitung, xyz: Float64Array): { punkte: Float32Array; farben: Float32Array } {
  const k = abl.kaefig;
  const punkte = new Float32Array(6 * k.nE);
  const farben = new Float32Array(6 * k.nE);
  const art = (abl as Partial<MaulErgebnis>).maul?.art ?? null;
  for (let e = 0; e < k.nE; e++) {
    const a = k.eA[e]!;
    const b = k.eB[e]!;
    punkte.set([xyz[3 * a]!, xyz[3 * a + 1]!, xyz[3 * a + 2]!, xyz[3 * b]!, xyz[3 * b + 1]!, xyz[3 * b + 2]!], 6 * e);
    const aa = art ? art[a]! : 0;
    const ab = art ? art[b]! : 0;
    const farbe = k.eSchaerfe[e]! > 0 ? [0.1, 0.1, 0.1] : aa >= 3 || ab >= 3 ? [0.75, 0.2, 0.3] : aa > 0 && ab > 0 ? [0.95, 0.4, 0.1] : [0.5, 0.52, 0.55];
    farben.set([...farbe, ...farbe], 6 * e);
  }
  return { punkte, farben };
}

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
  const maul = useKernAnzeige.getState().maul;
  let fein: Float64Array;
  let xyz: Float64Array;
  if (maul !== 'aus') {
    // Beweis 2: Maul im Käfig; Umbau nur bei neuem Dokument oder anderer Lage, die Pose (Öffnung) läuft auf dem Käfig
    if (letzte && letzte.maul === maul && letzte.dok === dok) abl = letzte.abl;
    else {
      abl = ableitenMitMaul(dok, maulLinieVorlage(dok, maul), {}, maulOptionenVorlage(maul));
      ableitung = abl.zeiten.gesamt;
    }
    const t0 = performance.now();
    const pose = maulPose(abl as MaulErgebnis, useUi.getState().oeffnung);
    zug = performance.now() - t0;
    fein = pose.fein;
    xyz = pose.xyz;
  } else if (schnell && letzte && letzte.maul === 'aus' && gleicheTopologie(letzte.dok, dok)) {
    const r = seiteZiehen(letzte.abl, dok);
    abl = r;
    zug = r.zugZeit.leiter + r.zugZeit.ziele + r.zugZeit.loeser + r.zugZeit.matrix;
    fein = abl.fein;
    xyz = abl.kaefig.xyz;
  } else {
    abl = ableiten(dok);
    ableitung = abl.zeiten.gesamt;
    fein = abl.fein;
    xyz = abl.kaefig.xyz;
  }
  letzte = { dok, abl, maul };
  const letzteStufe = abl.unterteilung.stufen[abl.unterteilung.stufen.length - 1]!.kaefig;
  const punkte: V3[] = [];
  const f = fein;
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
    info: { kaefigPunkte: abl.kaefig.n, feinPunkte: punkte.length, nahtMax: ab.max, nahtMittel: ab.mittel, ableitung, zug, ecken: abl.ecken.length + (abl.spitzen.vorn ? 1 : 0) + (abl.spitzen.hinten ? 1 : 0), schnell: ableitung === 0 },
  });
  const linien = useKernAnzeige.getState().kaefig ? kaefigSegmente(abl, xyz) : null;
  const lippenBand = maul !== 'aus' ? 0.03 * hoehe : 0;
  return { positionen: t.positionen, normalen: t.normalen, deskriptoren: desk, hoehe, augen, kaefigLinien: linien ? new Float32Array([...linien.punkte]) : null, lippenBand, kaefigFarben: linien?.farben ?? null };
}
