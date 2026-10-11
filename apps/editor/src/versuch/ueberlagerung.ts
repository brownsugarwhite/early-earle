// VERSUCH (11.10.2026): Ebene über den 2D-Ansichten für Florians Tiger-Konzept (?versuch=tiger&zustand=zu|auf).
// Zeigt seine inneren Linien als Bild und die Maulpunkte, bis es echte 3D-Linien gibt.

import type { Ansicht, Dokument, Profil } from '@ee/shape';
import { create } from 'zustand';
import { useEditor } from '../state/editorStore';

export type UeberPunkt = { farbe: 'tuerkis' | 'schwarz' | 'rot' | 'blau'; x: number; y: number };
export type UeberBild = { url: string; x0: number; y0: number; x1: number; y1: number };
export type Ueberlagerung = { bild?: UeberBild; punkte: UeberPunkt[] };

export const useUeberlagerung = create<Partial<Record<Ansicht, Ueberlagerung>>>(() => ({}));

type TigerDaten = {
  profile: Record<string, Profil>;
  punkte: Record<string, UeberPunkt[]>;
  bilder: Record<string, { datei: string; x0: number; y0: number; x1: number; y1: number }>;
};

export async function tigerLaden(zustand: string) {
  const basis = `${import.meta.env.BASE_URL}versuch/tiger/`;
  const daten = (await (await fetch(`${basis}tiger.json`)).json()) as TigerDaten;
  const auf = zustand === 'auf';
  const quelle: Record<Ansicht, string> = { seite: auf ? 'seite_auf' : 'seite', front: auf ? 'front_auf' : 'front', top: 'top' };
  const dok: Dokument = {
    ...useEditor.getState().dok,
    name: auf ? 'Tiger (Maul offen)' : 'Tiger',
    profile: { seite: daten.profile[quelle.seite]!, front: daten.profile[quelle.front]!, top: daten.profile[quelle.top]! },
  };
  useEditor.getState().laden(dok, null);
  if (auf) useEditor.getState().setzeModus('fressen');
  const ueber: Partial<Record<Ansicht, Ueberlagerung>> = {};
  for (const a of ['seite', 'front', 'top'] as const) {
    const b = daten.bilder[quelle[a]];
    ueber[a] = { punkte: daten.punkte[quelle[a]] ?? [], ...(b ? { bild: { url: basis + b.datei, x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1 } } : {}) };
  }
  useUeberlagerung.setState(ueber);
}
