// Plan „Vektorillustration aus einem Liniennetz“ (20.10.), V1: Grundzahlen der Extremreihe als Messlatte „nicht schlechter
// als heute“. Die Grundzahlen schreibt `apps/editor/scripts/pruefen/v1-extremreihe.ts` mit GRUNDZAHLEN=1 (Florians Ablauf,
// Editor-Standards); jede spätere Messung wird mit kleinen Toleranzen dagegen geprüft. Verbesserungen sind frei — nach einem
// Schritt, der etwas verbessert, werden die Grundzahlen neu geschrieben (eigener Commit, Diff zeigt die Wirkung). DOM-frei.
import type { Bauart, ExtremMessung } from './extremMessung';

export type Grundzahl = {
  name: string;
  art: Bauart;
  fehler: string | null;
  /** Δ max je Blatt (Seite, Front, Top), px */
  delta: [number, number, number];
  /** Falten: frei (größter Winkel, Kanten über 20°), Kappe, Ansatz (Grad) */
  frei: number;
  ueber20: number;
  kappe: number;
  ansatz: number;
  durchdringungen: number;
  /** Netzlinien aller drei Umrisse: Knicke über 45° (ohne gezeichnete Ecken und Falten des Körpers), Schleifen */
  knicke: number;
  schleifen: number;
  /** Umrisslinien (V2): größter Abstand in der eigenen Ansicht zur Silhouette und zur Haut (px) */
  umriss?: { eigen: number; haut: number };
  /** mit den P-Linien des Körpers: Art je Linie, Kante an der Linie (px, null = keine Kante), Abstand Linie ↔ Haut (px) */
  linien?: { arten: string[]; kante: number | null; aufHaut: number };
};

/** Toleranzen: Rechenrauschen zwischen Maschinen (Mac ARM gegen CI x86) und Rundung der Grundzahlen. */
export const TOLERANZ = { delta: 0.5, winkel: 2, ueber20: 3, rauschen: 2, linie: 0.5, umriss: 0.25 } as const;

/** Verstöße einer Messung gegen ihre Grundzahl (leer = nicht schlechter als heute). */
export function grundzahlVerstoesse(m: ExtremMessung, g: Grundzahl): string[] {
  const v: string[] = [];
  const t = TOLERANZ;
  if (!g.fehler && m.fehler) v.push(`Bau scheitert neu: ${m.fehler}`);
  (['seite', 'front', 'top'] as const).forEach((a, i) => {
    const w = m.delta[a].max;
    if (!Number.isFinite(w)) v.push(`Δ ${a} fehlt`);
    else if (w > g.delta[i]! + t.delta) v.push(`Δ ${a} ${w.toFixed(2)} px (Grundzahl ${g.delta[i]})`);
  });
  if (m.falten.frei.max > g.frei + t.winkel) v.push(`Falten frei ${m.falten.frei.max.toFixed(1)}° (Grundzahl ${g.frei}°)`);
  if (m.falten.frei.ueber20 > g.ueber20 + t.ueber20) v.push(`Falten frei über 20°: ${m.falten.frei.ueber20} Kanten (Grundzahl ${g.ueber20})`);
  if (m.falten.kappe.max > g.kappe + t.winkel) v.push(`Falten Kappe ${m.falten.kappe.max.toFixed(1)}° (Grundzahl ${g.kappe}°)`);
  if (m.falten.ansatz.max > g.ansatz + t.winkel) v.push(`Falten Ansatz ${m.falten.ansatz.max.toFixed(1)}° (Grundzahl ${g.ansatz}°)`);
  if (m.durchdringungen > g.durchdringungen) v.push(`Durchdringungen ${m.durchdringungen} (Grundzahl ${g.durchdringungen})`);
  const knicke = m.rauschen.seite.knicke + m.rauschen.front.knicke + m.rauschen.top.knicke;
  const schleifen = m.rauschen.seite.schleifen + m.rauschen.front.schleifen + m.rauschen.top.schleifen;
  if (knicke > g.knicke + t.rauschen) v.push(`Netzlinien: ${knicke} Knicke (Grundzahl ${g.knicke})`);
  if (schleifen > g.schleifen + t.rauschen) v.push(`Netzlinien: ${schleifen} Schleifen (Grundzahl ${g.schleifen})`);
  if (g.umriss) {
    const eigen = Math.max(m.rauschen.seite.eigen, m.rauschen.front.eigen, m.rauschen.top.eigen);
    const haut = Math.max(m.rauschen.seite.haut, m.rauschen.front.haut, m.rauschen.top.haut);
    if (eigen > g.umriss.eigen + t.umriss) v.push(`Umrisslinie ${eigen.toFixed(2)} px neben der Silhouette (Grundzahl ${g.umriss.eigen})`);
    if (haut > g.umriss.haut + t.umriss) v.push(`Umrisslinie ${haut.toFixed(2)} px neben der Haut (Grundzahl ${g.umriss.haut})`);
  }
  if (g.linien) {
    if (!m.linien) v.push('P-Linien liegen nicht mehr auf der Haut');
    else {
      if (m.linien.arten.join(',') !== g.linien.arten.join(',')) v.push(`P-Linien eingepasst als ${m.linien.arten.join(', ')} (Grundzahl ${g.linien.arten.join(', ')})`);
      if (g.linien.kante !== null && !(m.linien.kante <= g.linien.kante + t.linie)) v.push(`Kante ${m.linien.kante.toFixed(2)} px neben der Linie (Grundzahl ${g.linien.kante})`);
      if (m.linien.aufHaut > g.linien.aufHaut + t.linie) v.push(`Linie ${m.linien.aufHaut.toFixed(2)} px neben der Haut (Grundzahl ${g.linien.aufHaut})`);
    }
  }
  return v;
}

/**
 * Tor V2 (Plan 20.10., „Saubere Linien“) für eine Messung: keine Knicke über 45° außer an gezeichneten Ecken und Falten des
 * Körpers, keine Schleifen, in der eigenen Ansicht ≤ 0,5 px auf der Silhouette und ≤ 1 px auf der Haut. Leer = erfüllt.
 */
export function umrissTorVerstoesse(m: ExtremMessung): string[] {
  const v: string[] = [];
  for (const a of ['seite', 'front', 'top'] as const) {
    const r = m.rauschen[a];
    if (r.knicke) v.push(`${a}: ${r.knicke} Knicke`);
    if (r.schleifen) v.push(`${a}: ${r.schleifen} Schleifen`);
    if (r.eigen > 0.5) v.push(`${a}: ${r.eigen.toFixed(2)} px neben der Silhouette`);
    if (r.haut > 1) v.push(`${a}: ${r.haut.toFixed(2)} px neben der Haut`);
  }
  return v;
}
