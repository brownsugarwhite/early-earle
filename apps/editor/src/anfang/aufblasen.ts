/**
 * Ablauf des Aufblasens (Probe „Anfang einer Form“, Runde 5, 16.11.2026): alles als Funktion der Zeit seit ↩, damit Film und
 * Probe Bild für Bild genau wiederholbar sind.
 *
 * Florian: „Wenn ich eine Seifenblasenkontur schnell zurückziehe […] Zuerst würde sich die Mitte dehnen und es würde sich dann
 * langsam nach außen ausbreiten, wobei die Entfernung zur Silhouette wächst, und am Schluss würde es mit einem überschwingenden
 * Schnalz zur Form werden.“ Und: „Die Outline muss mit einem schnellen Zug nach hinten abgezogen werden, wobei die Kamera
 * gleichzeitig in die leichte 3D-Position bewegt. Alles elegant, recht schnell und flüssig.“
 *
 * 1. Der Rahmen wird schnell nach hinten gerissen und gleitet an der Rückwand aus; die Kamera fährt gleichzeitig in eine leichte
 *    3D-Lage (Dolly-Zoom, etwas zur Seite und von oben).
 * 2. Die Haut dehnt sich zuerst in der Mitte: eine kleine Kuppel, um sie herum die flache Haut bis zum Rahmen (ein Rock). Die Kuppel
 *    wächst nach außen (`fuss`), während der Rahmen sich entfernt; der Rock wird zum Schlauch.
 * 3. Wird der Schlauch zu lang, schnürt er sich zu einem runden Hals ein und reißt schlagartig.
 * 4. Die runde Blase schnalzt mit Überschwingen in die Form (Feder: die Form schießt etwas über ihr Ziel hinaus und kommt zurück),
 *    schwingt dabei länglich ↔ flach und seitlich, eine Welle läuft vom Abrisspunkt über die Haut; hinten erst spitz, dann rund.
 *    Der Rest der Haut schnappt in den Rahmen und verschwindet an der Rückwand im Schatten.
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
  /** Rahmen: Dauer bis zur Rückwand (s); wie schnell er losgerissen wird (1 = gleichmäßig, größer = schneller am Anfang) */
  rahmenDauer: number;
  ruck: number;
  /** Blase: Größe am Anfang (Anteil), wächst als Feder (Tempo, Dämpfung) nach außen; Kuppel: wie prall, Tempo, Dämpfung */
  fuss0: number;
  fussHz: number;
  fussD: number;
  prall: number;
  vornHz: number;
  vornD: number;
  /** Hals: reißt bei Schlauchlänge = hals · Halbmesser, ist dann bis auf `halsEng` zu, reißt in `halsDauer` s, sitzt bei `halsOrt` (0 an der Blase, 1 am Rahmen) */
  hals: number;
  halsEng: number;
  halsDauer: number;
  halsOrt: number;
  /** Schnalz in die Form (Feder von rund zu Form, überschwingt): Tempo, Dämpfung */
  schnalzHz: number;
  schnalzD: number;
  /** nach dem Abriss: Kuppel (Tempo, Dämpfung, Stoß), hinten rund werden, Rest schnappt in den Rahmen */
  nachHz: number;
  nachD: number;
  stoss: number;
  hintenHz: number;
  hintenD: number;
  rahmenHz: number;
  rahmenD: number;
  /** wie weit der Schlauch die Blase nach hinten zieht (× Halbmesser) */
  zug: number;
  /** Schwingen: länglich ↔ flach (Stärke, Tempo, Abklingen in s), seitlich (Stärke, Tempo), Welle vom Abrisspunkt */
  wobbel: number;
  wobbelHz: number;
  wobbelAb: number;
  schwapp: number;
  schwappHz: number;
  riesel: number;
  quer: number;
  welle: number;
  /** Kamera: Öffnungswinkel am Ende (Dolly-Zoom), Dauer der Fahrt, am Ende zur Seite und von oben (Grad) */
  fov: number;
  kameraDauer: number;
  gier: number;
  neigung: number;
}

export const GRUNDWERTE: Werte = {
  rahmenDauer: 1.05,
  ruck: 2.0,
  fuss0: 0.18,
  fussHz: 1.3,
  fussD: 0.7,
  prall: 1.12,
  vornHz: 2.2,
  vornD: 0.55,
  hals: 1.6,
  halsEng: 0.9,
  halsDauer: 0.07,
  halsOrt: 0.55,
  schnalzHz: 2.6,
  schnalzD: 0.32,
  nachHz: 2.3,
  nachD: 0.26,
  stoss: 1.0,
  hintenHz: 3.2,
  hintenD: 0.3,
  rahmenHz: 7.5,
  rahmenD: 0.18,
  zug: 0.1,
  wobbel: 1,
  wobbelHz: 2.4,
  wobbelAb: 0.6,
  schwapp: 0.08,
  schwappHz: 3.2,
  riesel: 0.12,
  quer: 0.1,
  welle: 0.03,
  fov: 42,
  kameraDauer: 0.95,
  gier: 24,
  neigung: 14,
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
  /** 0..1: Dolly-Zoom; Drehung der Kamera zur Seite und von oben (Grad) */
  fahrt: number;
  gier: number;
  neigung: number;
  /** 0..1: Rest der Haut im Rahmen verschwindet im Schatten der Rückwand; Schatten an den Wänden; die Linie des Rahmens */
  schatten: number;
  waende: number;
  linie: number;
}

/** Weg des Rahmens (Anteil der Strecke bis zur Rückwand): schnell losgerissen, dann ausgleitend */
function weg(x: number, ruck: number): number {
  const t = Math.min(1, Math.max(0, x));
  const an = t * t * (3 - 2 * t);
  const aus = 1 - Math.pow(1 - t, ruck + 1);
  return an * (1 - t) * 0.35 + aus * (1 - (1 - t) * 0.35);
}

/** Zeitpunkt, an dem der Schlauch die Länge `hals · a` erreicht (Anfang des Zusammenfallens) */
function halsBeginnt(m: Masse, w: Werte): number {
  const zf = (t: number): number => m.Zw * weg(t / w.rahmenDauer, w.ruck);
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
  const zfBei = (t: number): number => -m.Zw * weg(t / w.rahmenDauer, w.ruck);
  const T1 = halsBeginnt(m, w);
  const riss = T1 + w.halsDauer;
  const spannungBei = (t: number): number => Math.min(1, -zfBei(t) / Math.max(1, w.hals * m.a));
  const kuppel = (t: number): { x: number; v: number } => (t > 0 ? feder(t, 0, 0, w.prall, w.vornHz, w.vornD) : { x: 0, v: 0 });
  const zugBei = (t: number): number => (t < riss ? -w.zug * m.a * weich(0, 1.1, spannungBei(t)) : 0);
  const zf = zfBei(T);
  const fuss = T > 0 ? feder(T, w.fuss0, 0, 1, w.fussHz, w.fussD).x : w.fuss0;
  const stroemung = 0.18;
  const lage: Lage = {
    imBlatt: false,
    ze: 0,
    vorn: 0,
    hinten: 0,
    fuss,
    quer: 0,
    welle: 0,
    phase: 0,
    zu: 1,
    zf,
    eng: 0,
    halsOrt: w.halsOrt,
    seitRiss: -1,
    rahmen: 0,
    hz: 0,
    zfRiss: 0,
    rund: 1,
    zStreck: 1,
    schwapp: 0,
    riesel: 0,
    rieselOrt: 0,
  };
  if (T < riss) {
    const s = spannungBei(T);
    lage.eng = T < T1 ? w.halsEng * Math.pow(s, 1.6) : w.halsEng + (1 - w.halsEng) * ((T - T1) / w.halsDauer) ** 2;
    lage.vorn = kuppel(T).x;
    lage.ze = zugBei(T);
    // in der Strömung länglich (in der Tiefe), die Breite gleicht es aus
    lage.zStreck = 1 + stroemung * w.wobbel * weich(0, 1, s);
  } else {
    const tau = T - riss;
    const kp = kuppel(riss);
    const zeP = zugBei(riss - 1e-4);
    const zfP = zfBei(riss);
    const v = feder(tau, kp.x, kp.v + w.stoss, 1, w.nachHz, w.nachD);
    lage.vorn = v.x;
    lage.ze = feder(tau, zeP, 0, 0, 2.0, 0.3).x;
    lage.hinten = feder(tau, 0, 0, 1, w.hintenHz, w.hintenD).x;
    lage.rahmen = feder(tau, 0, 0, 1, w.rahmenHz, w.rahmenD).x;
    // der Schnalz: von rund zur Form, mit Überschwingen
    lage.rund = feder(tau, 1, 0, 0, w.schnalzHz, w.schnalzD).x;
    lage.quer = -w.quer * (v.x - 1);
    lage.welle = w.welle * Math.exp(-tau / 0.5) * weich(0, 0.08, tau);
    lage.phase = 1.7 * tau;
    lage.eng = 1;
    lage.seitRiss = tau;
    lage.hz = zeP + (zfP - zeP) * w.halsOrt;
    lage.zfRiss = zfP;
    const ab = Math.exp(-tau / w.wobbelAb);
    const om = 2 * Math.PI * w.wobbelHz * tau;
    lage.zStreck = 1 + w.wobbel * ab * (stroemung * Math.cos(om) - 0.16 * Math.sin(om));
    lage.schwapp = w.schwapp * w.wobbel * Math.exp(-tau / (w.wobbelAb * 0.9)) * Math.sin(2 * Math.PI * w.schwappHz * tau);
    lage.riesel = w.riesel * w.wobbel * Math.exp(-tau / 0.5) * weich(0, 0.05, tau);
    lage.rieselOrt = 3.6 * tau;
  }
  const dauer = Math.max(riss + 1.7, w.rahmenDauer + 0.7, w.kameraDauer + 0.3);
  const k = glatt(T / w.kameraDauer);
  return {
    lage,
    riss,
    dauer,
    fahrt: k,
    gier: w.gier * k,
    neigung: w.neigung * k,
    schatten: weich(w.rahmenDauer - 0.1, w.rahmenDauer + 0.35, T),
    waende: weich(riss + 0.15, riss + 0.9, T),
    // die Linie des Rahmens wird gleich beim Zug zur Haarlinie und verschwindet an der Rückwand
    linie: (1 - 0.6 * weich(0, 0.3, T)) * (1 - weich(w.rahmenDauer - 0.2, w.rahmenDauer + 0.25, T)),
  };
}
