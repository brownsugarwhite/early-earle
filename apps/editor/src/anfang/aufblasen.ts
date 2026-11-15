/**
 * Ablauf des Aufblasens (Probe „Anfang einer Form“, 15.11.2026): alles als Funktion der Zeit seit ↩, damit Film und Probe Bild
 * für Bild genau wiederholbar sind.
 *
 * Bild: Ein Ring mit Seifenhaut wird nach hinten gezogen. Die Haut bleibt im Fahrtwind zurück und wölbt sich nach vorn (eine
 * einzige Fläche), dann löst sich die hintere Hälfte, schlägt durch den Ring und schließt die Form spiegelgleich. Beides sind
 * gedämpfte Federn (geschlossene Lösung), die Form schwingt also zwei-, dreimal nach. Was über die ideale, ruhige Wölbung
 * hinausschwingt, staucht die Form in der Ebene ein wenig (und umgekehrt), dazu läuft eine Welle vom Rand zur Mitte.
 */

import type { Lage } from './form';

/** gedämpfte Feder ab Lage x0 mit Tempo v0 zum Ziel: Lage und Tempo nach t Sekunden */
export function feder(t: number, x0: number, v0: number, ziel: number, hz: number, zeta: number): { x: number; v: number } {
  if (t <= 0) return { x: x0, v: v0 };
  const w = 2 * Math.PI * hz;
  const c1 = x0 - ziel;
  if (zeta >= 1) {
    // kritisch gedämpft (für zeta ≥ 1 genügt hier die Grenze)
    const c2 = v0 + w * c1;
    const e = Math.exp(-w * t);
    return { x: ziel + (c1 + c2 * t) * e, v: (c2 - w * (c1 + c2 * t)) * e };
  }
  const wd = w * Math.sqrt(1 - zeta * zeta);
  const c2 = (v0 + zeta * w * c1) / wd;
  const e = Math.exp(-zeta * w * t);
  const cs = Math.cos(wd * t);
  const sn = Math.sin(wd * t);
  const x = ziel + e * (c1 * cs + c2 * sn);
  const v = e * (-zeta * w * (c1 * cs + c2 * sn) + (-c1 * wd * sn + c2 * wd * cs));
  return { x, v };
}

function glatt(x: number): number {
  const t = Math.min(1, Math.max(0, x));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

export interface Werte {
  /** wie weit der Ring zurückweicht (Anteil am Kameraabstand) */
  rueck: number;
  /** Vorderseite: Beginn (s), Tempo (Hz), Dämpfung */
  vornAb: number;
  vornHz: number;
  vornD: number;
  /** Rückseite löst sich (s), Tempo, Dämpfung */
  hintenAb: number;
  hintenHz: number;
  hintenD: number;
  /** Stauchen in der Ebene je Überschwingen, Welle */
  quer: number;
  welle: number;
  /** Kamera: Drehung zur Seite und von oben (Grad), Dauer (s) */
  gier: number;
  neigung: number;
  kameraDauer: number;
}

export const GRUNDWERTE: Werte = {
  rueck: 0.2,
  vornAb: 0.05,
  vornHz: 2.1,
  vornD: 0.38,
  hintenAb: 0.24,
  hintenHz: 1.8,
  hintenD: 0.42,
  quer: 0.16,
  welle: 0.06,
  gier: 32,
  neigung: 13,
  kameraDauer: 1.7,
};

/** so lange dauert es, bis alles ruht (s) */
export const DAUER = 2.6;

export interface Moment {
  lage: Lage;
  /** 0..1: Kamera am Ende (Ziel, Abstand) und Drehung */
  fahrt: number;
  dreh: number;
  /** Anteil der Rückseite (zeigt sich, sobald sie sich vom Film löst) */
  hintenSichtbar: number;
  /** 0..1: wie weit die Form steht (für Farben und Deckung) */
  fertig: number;
}

/** Zustand T Sekunden nach ↩; D = Rückweg des Rings in Welt-Einheiten */
export function moment(T: number, D: number, w: Werte = GRUNDWERTE): Moment {
  // Ring: weicht zurück, eine Spur über das Ziel hinaus
  const ring = feder(T, 0, 0, 1, 1.15, 0.78).x;
  const zr = -D * ring;
  // Vorderseite: Feder ab vornAb
  const v = feder(T - w.vornAb, 0, 0, 1, w.vornHz, w.vornD);
  const vorn = T > w.vornAb ? v.x : 0;
  // ideale, ruhige Wölbung (kritisch gedämpft, gleiches Tempo): was darüber hinausschwingt, ist das Nachschwingen
  const ideal = T > w.vornAb ? feder(T - w.vornAb, 0, 0, 1, w.vornHz, 1).x : 0;
  // Rückseite: bis hintenAb derselbe Film knapp hinter der Vorderseite, dann eine eigene Feder zum Spiegelbild
  let hinten: number;
  if (T <= w.hintenAb) hinten = vorn * 0.985;
  else {
    const s = feder(w.hintenAb - w.vornAb, 0, 0, 1, w.vornHz, w.vornD);
    hinten = feder(T - w.hintenAb, s.x * 0.985, s.v * 0.985, -1, w.hintenHz, w.hintenD).x;
  }
  const quer = -w.quer * (vorn - ideal);
  const welle = w.welle * Math.exp(-Math.max(0, T - 0.25) / 0.5) * glatt((T - 0.05) / 0.25);
  const zu = Math.max(0, Math.min(1, -hinten / Math.max(0.05, vorn)));
  return {
    lage: { zr, vorn, hinten, quer, welle, phase: 1.6 * T, zu },
    fahrt: glatt(T / (w.kameraDauer * 0.75)),
    dreh: glatt((T - 0.1) / w.kameraDauer),
    hintenSichtbar: glatt((0.02 - hinten) / 0.25),
    fertig: glatt(T / 1.4),
  };
}
