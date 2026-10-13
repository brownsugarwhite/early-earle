// Versuch 13.10.: Bauweise „Schnitte“ zum Vergleichen (Tab am 3D-Fenster neben creation · wirbelsäule). Gleiche Profile
// und Spanten, anderer Körper: Jede Stelle bekommt ihren echten Schnitt mit beliebig vielen Teilen (Schnauze über Bauch,
// Acht, Haken im Top), siehe packages/shape/src/versuch/schnittLoft.ts.
// Während Gesten grob gebaut, beim Loslassen genau; gemerkt je Profile, Spanten, Hauptspant, Regel und Auflösung.

import type { Ansicht, Dokument, V2 } from '@ee/shape';
import { type Netz, type SchnittLoft, type SchnittRegel, type SchnittUmriss, type V3, schnittLoft, umrissAusNetz } from '@ee/shape/versuch';
import { create } from 'zustand';

/** Raster während Gesten bzw. beim Loslassen (Punkte über die größte Ausdehnung) */
export const SCHNITT_GROB = 56;
export const SCHNITT_GENAU = 112;

export type SchnittAnzeigeInfo = { millisekunden: number; dreiecke: number; aufloesung: number; maxTeile: number; gitter: [number, number, number] };

type Anzeige = {
  info: SchnittAnzeigeInfo | null;
  /** Umriss des 3D-Körpers je Ansicht (gestrichelt), nach dem genauen Bau */
  umrisse: Partial<Record<Ansicht, V2[][]>> | null;
  /** zählt neue Bauten hoch (die 2D-Ebenen zeichnen den echten Schnitt neu) */
  stand: number;
};
export const useSchnittAnzeige = create<Anzeige>(() => ({ info: null, umrisse: null, stand: 0 }));

type Bau = {
  profile: Dokument['profile'];
  spanten: Dokument['spanten'];
  hauptspant: number | undefined;
  regel: SchnittRegel;
  aufloesung: number;
  loft: SchnittLoft;
};
let letzter: Bau | null = null;
const schnitte = new Map<number, SchnittUmriss>();

export function schnittBauen(dok: Dokument, schnell: boolean, regel: SchnittRegel): SchnittLoft {
  const aufloesung = schnell ? SCHNITT_GROB : SCHNITT_GENAU;
  const l = letzter;
  if (l && l.profile === dok.profile && l.spanten === dok.spanten && l.hauptspant === dok.hauptspant && l.regel === regel && (l.aufloesung === aufloesung || (schnell && l.aufloesung > aufloesung))) return l.loft;
  const loft = schnittLoft(dok, { aufloesung, regel });
  letzter = { profile: dok.profile, spanten: dok.spanten, hauptspant: dok.hauptspant, regel, aufloesung, loft };
  schnitte.clear();
  const i = loft.info;
  useSchnittAnzeige.setState((s) => ({
    info: { millisekunden: i.millisekunden, dreiecke: i.dreiecke, aufloesung, maxTeile: i.maxTeile, gitter: i.gitter },
    stand: s.stand + 1,
  }));
  // Umriss des Körpers für die Ansichten (≈ 30–80 ms): nach dem Zeichnen, nur beim genauen Bau
  if (!schnell) {
    const bau = letzter;
    setTimeout(() => {
      if (letzter !== bau) return;
      useSchnittAnzeige.setState({ umrisse: umrisseVon(loft) });
    }, 0);
  }
  return loft;
}

/** Zuletzt gebauter Körper (für die 2D-Ebenen; sie bauen nie selbst). */
export function schnittZuletzt(): SchnittLoft | null {
  return letzter?.loft ?? null;
}

/** Echter Schnitt an der Stelle f im zuletzt gebauten Körper (gemerkt je Stelle). */
export function schnittEcht(f: number): SchnittUmriss | null {
  const loft = letzter?.loft;
  if (!loft) return null;
  let s = schnitte.get(f);
  if (!s) {
    s = loft.schnittBei(f);
    schnitte.set(f, s);
  }
  return s;
}

/** Dreiecksnetz → Netz für `umrissAusNetz`. */
export function netzAusFlaeche(positionen: Float32Array, indizes: Uint32Array): Netz {
  const punkte: V3[] = [];
  for (let i = 0; i < positionen.length; i += 3) punkte.push([positionen[i]!, positionen[i + 1]!, positionen[i + 2]!]);
  const flaechen: number[][] = [];
  for (let t = 0; t < indizes.length; t += 3) flaechen.push([indizes[t]!, indizes[t + 1]!, indizes[t + 2]!]);
  return { punkte, flaechen, schaerfe: new Map() };
}

function umrisseVon(loft: SchnittLoft): Partial<Record<Ansicht, V2[][]>> {
  const netz = netzAusFlaeche(loft.positionen, loft.indizes);
  const out: Partial<Record<Ansicht, V2[][]>> = {};
  for (const a of ['seite', 'front', 'top'] as const) out[a] = umrissAusNetz(netz, a, 300);
  return out;
}
