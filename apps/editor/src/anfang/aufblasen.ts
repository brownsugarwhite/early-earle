/**
 * Ablauf des Aufblasens (Probe „Anfang einer Form“, Runde 2, 15.11.2026): alles als Funktion der Zeit seit ↩, damit Film und
 * Probe Bild für Bild genau wiederholbar sind.
 *
 * Wie beim Seifenblasenmachen (Florian: „Die Seifenblase muss beim Zurückfahren noch eine Weile an der Outline hängen, während der
 * vordere Teil sich aufbläst, und dann, wenn die Spannung zu groß ist, zur Blase werden“):
 *
 * 1. Der Rahmen (die gezeichnete Linie) fährt nach hinten zur Rückwand des Kastens.
 * 2. Die Haut hängt an ihm. Vorn bläst sie sich auf (eine Kuppel an Ort und Stelle), dazwischen spannt sich ein Schlauch vom Rahmen
 *    bis zum größten Umfang der Blase.
 * 3. Wird der Schlauch zu lang, schnürt er sich ein. Zwischen zwei Ringen hält eine Seifenhaut nur bis zu einem Abstand von etwa
 *    dem 1,3-Fachen des Halbmessers (Katenoid); danach fällt der Hals in sich zusammen, immer schneller, bis er reißt.
 * 4. Die Blase schließt sich hinten, erst spitz, dann rund, und schwingt nach; sie federt dabei etwas nach vorn (der Zug des
 *    Schlauchs ist weg). Der Rest der Haut schnappt zurück in den Rahmen, fährt mit ihm zur Rückwand und wird dort zum Schatten.
 *
 * Alle Federn sind geschlossen gelöst (keine Schritte), siehe `feder`.
 */

import type { Lage } from './form';

/** gedämpfte Feder ab Lage x0 mit Tempo v0 zum Ziel: Lage und Tempo nach t Sekunden */
export function feder(t: number, x0: number, v0: number, ziel: number, hz: number, zeta: number): { x: number; v: number } {
  if (t <= 0) return { x: x0, v: v0 };
  const w = 2 * Math.PI * hz;
  const c1 = x0 - ziel;
  if (zeta >= 1) {
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

export function glatt(x: number): number {
  const t = Math.min(1, Math.max(0, x));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function weich(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export interface Werte {
  /** Rahmen: Dauer bis zur Rückwand (s) */
  rahmenDauer: number;
  /** Hals: reißt ab Schlauchlänge = hals · Halbmesser (Katenoid etwa 1,3), fällt in `halsDauer` s zusammen, sitzt beim Anteil `halsOrt` vom Rahmen */
  hals: number;
  halsDauer: number;
  halsOrt: number;
  /** Kuppel vorn beim Hängen: Tempo, Dämpfung */
  vornHz: number;
  vornD: number;
  /** nach dem Abriss: Nachschwingen der Kuppel (Tempo, Dämpfung, Stoß), Schließen hinten, Zurückschnappen im Rahmen */
  nachHz: number;
  nachD: number;
  stoss: number;
  hintenHz: number;
  hintenD: number;
  rahmenHz: number;
  rahmenD: number;
  /** wie weit der Schlauch die Blase nach hinten zieht (× Halbmesser), Stauchen beim Nachschwingen, Welle */
  zug: number;
  quer: number;
  welle: number;
  /** Kamera: Öffnungswinkel am Ende (Dolly-Zoom, die Blase bleibt gleich groß), Dauer, Drehung zur Seite und von oben (Grad) */
  fov: number;
  kameraDauer: number;
  gier: number;
  neigung: number;
}

export const GRUNDWERTE: Werte = {
  rahmenDauer: 1.9,
  hals: 1.45,
  halsDauer: 0.16,
  halsOrt: 0.42,
  vornHz: 1.45,
  vornD: 0.72,
  nachHz: 2.3,
  nachD: 0.3,
  stoss: 1.1,
  hintenHz: 2.7,
  hintenD: 0.34,
  rahmenHz: 5.5,
  rahmenD: 0.26,
  zug: 0.1,
  quer: 0.12,
  welle: 0.035,
  fov: 46,
  kameraDauer: 1.15,
  gier: 32,
  neigung: 22,
};

/** Maße der Form im Raum */
export interface Masse {
  /** Halbmesser für den Hals (aus der Fläche) und Tiefe der Rückwand (Welt) */
  a: number;
  Zw: number;
}

export interface Moment {
  lage: Lage;
  /** Zeitpunkt des Abrisses (s) und bis wann sich alles bewegt */
  riss: number;
  dauer: number;
  /** 0..1: Kamera (Dolly-Zoom, Ziel zur Mitte der Blase) */
  fahrt: number;
  /** 0..1: Rest der Haut im Rahmen wird zum Schatten der Seite; Schatten an den Wänden; die Linie des Rahmens */
  schatten: number;
  waende: number;
  linie: number;
}

/** Zeitpunkt, an dem der Schlauch die Länge `hals · a` erreicht (Anfang des Zusammenfallens) */
function halsBeginnt(m: Masse, w: Werte): number {
  const zf = (t: number): number => m.Zw * glatt(t / w.rahmenDauer);
  const grenze = w.hals * m.a;
  if (zf(w.rahmenDauer) < grenze) return w.rahmenDauer;
  let lo = 0;
  let hi = w.rahmenDauer;
  for (let k = 0; k < 40; k++) {
    const mid = (lo + hi) / 2;
    if (zf(mid) < grenze) lo = mid;
    else hi = mid;
  }
  return hi;
}

/** Zustand T Sekunden nach ↩ */
export function moment(T: number, m: Masse, w: Werte = GRUNDWERTE): Moment {
  const zfBei = (t: number): number => -m.Zw * glatt(t / w.rahmenDauer);
  const T1 = halsBeginnt(m, w);
  const riss = T1 + w.halsDauer;
  const kuppel = (t: number): { x: number; v: number } => (t > 0.04 ? feder(t - 0.04, 0, 0, 0.95, w.vornHz, w.vornD) : { x: 0, v: 0 });
  // Zug des Schlauchs an der Blase (vor dem Abriss): wächst mit der Länge des Schlauchs
  const zugBei = (t: number): number => {
    const l = Math.min(1.2, -zfBei(t) / Math.max(1, w.hals * m.a));
    return -w.zug * m.a * weich(0, 1.2, l) * (t < riss ? 1 : 0);
  };
  const zf = zfBei(T);
  const lage: Lage = {
    ze: 0,
    vorn: 0,
    hinten: 0,
    quer: 0,
    welle: 0,
    phase: 0,
    zu: 1,
    zf,
    zn: 0,
    schnitt: 0,
    gerissen: false,
    rahmen: 0,
    znRiss: 0,
    zfRiss: 0,
  };
  if (T < riss) {
    const l = Math.min(1, -zf / Math.max(1, w.hals * m.a));
    lage.schnitt = T < T1 ? 0.3 * l * l : 0.3 + 0.7 * ((T - T1) / w.halsDauer) ** 2;
    lage.vorn = kuppel(T).x;
    lage.ze = zugBei(T);
    lage.zn = zf + w.halsOrt * (lage.ze - zf);
  } else {
    const tau = T - riss;
    const kp = kuppel(riss);
    // knapp vor dem Abriss: Lage von Blase, Hals und Rahmen
    const zeP = zugBei(riss - 1e-4);
    const zfP = zfBei(riss);
    const znP = zfP + w.halsOrt * (zeP - zfP);
    const v = feder(tau, kp.x, kp.v + w.stoss, 1, w.nachHz, w.nachD);
    lage.vorn = v.x;
    lage.ze = feder(tau, zeP, 0, 0, 2.0, 0.36).x;
    lage.hinten = feder(tau, 0, 0, 1, w.hintenHz, w.hintenD).x;
    lage.rahmen = feder(tau, 0, 0, 1, w.rahmenHz, w.rahmenD).x;
    lage.quer = -w.quer * (v.x - 1);
    lage.welle = w.welle * Math.exp(-tau / 0.45) * weich(0, 0.08, tau);
    lage.phase = 1.7 * tau;
    lage.schnitt = 1;
    lage.gerissen = true;
    lage.zn = znP;
    lage.znRiss = znP;
    lage.zfRiss = zfP;
  }
  const dauer = Math.max(riss + 1.9, w.rahmenDauer + 0.9, w.kameraDauer + 0.2);
  return {
    lage,
    riss,
    dauer,
    fahrt: glatt(T / w.kameraDauer),
    schatten: weich(w.rahmenDauer - 0.3, w.rahmenDauer + 0.45, T),
    waende: weich(riss + 0.1, riss + 1.0, T),
    linie: 1 - weich(w.rahmenDauer - 0.05, w.rahmenDauer + 0.55, T),
  };
}
