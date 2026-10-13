// Versuch 13.10. nachmittags: Bauweise „rund“ (Tab am 3D-Fenster). Der Seitenumriss wird rund aufgeblasen, Top und Front
// geben die Breite (packages/shape/src/versuch/aufblasen.ts). Während Gesten grob, beim Loslassen fein; gemerkt je
// Profile und Feinheit. Nach dem feinen Bau zeigen alle Ansichten den Umriss des 3D-Körpers gestrichelt.

import type { Ansicht, Dokument, V2 } from '@ee/shape';
import { RUND_GROB, RUND_STANDARD, type RundKoerper, rundKoerper, umrissAusNetz } from '@ee/shape/versuch';
import { create } from 'zustand';
import { netzAusFlaeche } from '../schnitte/schnittKoerper';

export type RundAnzeigeInfo = {
  millisekunden: number;
  dreiecke: number;
  punkte: number;
  grob: boolean;
  /** größte Abweichung der Breite von Top und Front (px bei 461 px je Kachel) */
  restTop: number;
  restFront: number;
};

type Anzeige = {
  info: RundAnzeigeInfo | null;
  /** Umriss des 3D-Körpers je Ansicht (gestrichelt), nach dem feinen Bau */
  umrisse: Partial<Record<Ansicht, V2[][]>> | null;
  stand: number;
};
export const useRundAnzeige = create<Anzeige>(() => ({ info: null, umrisse: null, stand: 0 }));

type Bau = { profile: Dokument['profile']; grob: boolean; koerper: RundKoerper };
let letzter: Bau | null = null;

const PX = 461;

export function rundBauen(dok: Dokument, schnell: boolean): RundKoerper {
  const l = letzter;
  if (l && l.profile === dok.profile && (l.grob === schnell || (schnell && !l.grob))) return l.koerper;
  const koerper = rundKoerper(dok, { abstand: schnell ? RUND_GROB : RUND_STANDARD.abstand });
  letzter = { profile: dok.profile, grob: schnell, koerper };
  const i = koerper.info;
  useRundAnzeige.setState((s) => ({
    info: { millisekunden: i.millisekunden, dreiecke: i.dreiecke, punkte: i.punkte, grob: schnell, restTop: i.restTop * PX, restFront: i.restFront * PX },
    stand: s.stand + 1,
  }));
  if (!schnell) {
    const bau = letzter;
    setTimeout(() => {
      if (letzter !== bau) return;
      const netz = netzAusFlaeche(koerper.positionen, koerper.indizes);
      const umrisse: Partial<Record<Ansicht, V2[][]>> = {};
      for (const a of ['seite', 'front', 'top'] as const) umrisse[a] = umrissAusNetz(netz, a, 300);
      useRundAnzeige.setState({ umrisse });
    }, 0);
  }
  return koerper;
}

/** Zuletzt gebauter Körper (für die 2D-Ebenen; sie bauen nie selbst). */
export function rundZuletzt(): RundKoerper | null {
  return letzter?.koerper ?? null;
}
