// Versuch 12.10. abends: Bauweise „Wirbelsäule“ zum Vergleichen (Tab am 3D-Fenster, Florian: „Kannst du das schon so
// einbauen, dass ich es vergleichen kann?“). Gleiche Profile, anderer Körper: Ringe senkrecht zur Wirbelsäule statt
// entlang x. Gemerkt je Profile, Spanten, Hauptspant und Biegung; während einer Geste schnell (weniger Anpassung).

import type { Ansicht, Dokument, V2 } from '@ee/shape';
import { type Netz, type Sprosse, WIRBEL_STANDARD, kaefigAusSprossen, umrissAusNetz, unterteilenMehrfach, wirbelBiegen, wirbelKaefig } from '@ee/shape/versuch';
import { create } from 'zustand';

export type WirbelInfo = {
  millisekunden: number;
  ringe: number;
  stehend: number;
  vorlage: 'front' | 'oval';
  hinweise: string[];
};

type Anzeige = {
  info: WirbelInfo | null;
  sprossen: Sprosse[] | null;
  wirbel: V2[] | null;
  umrisse: Partial<Record<Ansicht, V2[]>> | null;
  /** Biege-Regler wird gerade gezogen: schnell bauen, beim Loslassen genau */
  zieht: boolean;
};
export const useWirbelAnzeige = create<Anzeige>(() => ({ info: null, sprossen: null, wirbel: null, umrisse: null, zieht: false }));

type Bau = {
  profile: Dokument['profile'];
  spanten: Dokument['spanten'];
  hauptspant: number | undefined;
  winkel: number;
  bei: number;
  schnell: boolean;
  netz: Netz;
};
let letzter: Bau | null = null;

export function wirbelBauen(dok: Dokument, schnell: boolean, biegung: { winkel: number; bei: number }): Netz {
  const l = letzter;
  if (l && l.profile === dok.profile && l.spanten === dok.spanten && l.hauptspant === dok.hauptspant && l.winkel === biegung.winkel && l.bei === biegung.bei && (!l.schnell || schnell)) return l.netz;
  const t0 = performance.now();
  const opt = schnell ? { ...WIRBEL_STANDARD, iterationen: 3, stufen: 2 } : WIRBEL_STANDARD;
  const ruhe = wirbelKaefig(dok, opt);
  let netz = ruhe.netz;
  let sprossen = ruhe.sprossen;
  let wirbel = ruhe.wirbel;
  if (biegung.winkel) {
    const b = wirbelBiegen(ruhe, biegung.bei, biegung.winkel, 0.25);
    netz = kaefigAusSprossen(b.sprossen, b.spitzeV, ruhe.wirbel[ruhe.wirbel.length - 1]!, opt).netz;
    sprossen = b.sprossen;
    wirbel = b.wirbel;
  }
  letzter = { profile: dok.profile, spanten: dok.spanten, hauptspant: dok.hauptspant, winkel: biegung.winkel, bei: biegung.bei, schnell, netz };
  // Umriss des 3D-Körpers für die Ansichten (gestrichelt), nur beim genauen Bau (≈ 50 ms)
  let umrisse: Anzeige['umrisse'] = null;
  if (!schnell) {
    const fein = unterteilenMehrfach(netz, 2);
    umrisse = {};
    for (const a of ['seite', 'front', 'top'] as const) {
      const u = umrissAusNetz(fein, a, 300)[0];
      if (u) umrisse[a] = u;
    }
  }
  useWirbelAnzeige.setState((s) => ({
    info: {
      millisekunden: performance.now() - t0,
      ringe: sprossen.length,
      stehend: sprossen.filter((x) => x.liegend < 0.5).length,
      vorlage: sprossen[0]?.vorlage ? 'front' : 'oval',
      hinweise: ruhe.hinweise,
    },
    sprossen,
    wirbel,
    umrisse: umrisse ?? s.umrisse,
  }));
  return netz;
}
