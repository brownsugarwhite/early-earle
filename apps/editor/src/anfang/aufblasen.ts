/**
 * Ablauf des Aufblasens (Probe „Anfang einer Form“, Runde 4, 15.11.2026): alles als Funktion der Zeit seit ↩, damit Film und
 * Probe Bild für Bild genau wiederholbar sind.
 *
 * Wie beim Seifenblasenmachen (Florian: „Die Seifenblase muss beim Zurückfahren noch eine Weile an der Outline hängen, während der
 * vordere Teil sich aufbläst, und dann, wenn die Spannung zu groß ist, zur Blase werden“; Runde 4: „mehr bubbly, die Form soll mehr
 * wobbeln und dann erst die eigentliche Form bilden wie eine echte Seifenblase; Hals und Abriss deutlicher; bessere Dynamik“):
 *
 * 1. Der Rahmen (die gezeichnete Linie) wird zügig nach hinten gerissen und gleitet dann langsamer zur Rückwand der Ecke.
 * 2. Die Haut hängt an ihm. Vorn bläst sie sich zu einer runden Blase auf (rund wie eine echte Seifenblase, noch nicht die Form),
 *    in der Strömung länglich; dazwischen spannt sich ein Schlauch vom Rahmen bis zum größten Umfang der Blase.
 * 3. Der Schlauch schnürt sich mit der Länge immer weiter ein (zwischen zwei Ringen hält eine Seifenhaut nur bis zu einer gewissen
 *    Länge, Katenoid), bis nur ein dünner Hals bleibt; dann reißt er schlagartig.
 * 4. Die Blase schließt sich hinten, erst spitz, dann rund. Sie schwingt kräftig: in der Tiefe länglich und flach im Wechsel, dazu
 *    seitlich, und eine Welle läuft vom Abrisspunkt über die ganze Haut. Während sie ausschwingt, wächst die gezeichnete Form aus
 *    der runden Blase heraus. Der Rest der Haut schnappt zurück in den Rahmen (wie ein Trommelfell), gleitet mit ihm zur Rückwand
 *    und wird dort zum Schatten der Seite.
 * 5. Die Kamera dreht beim Hängen zur Seite (so sieht man Schlauch, Hals und Abriss), danach schwenkt sie in die Ecke.
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
  /** Rahmen: Dauer bis zur Rückwand (s); wie zügig er losgerissen wird (1 = gleichmäßig, größer = schneller am Anfang) */
  rahmenDauer: number;
  ruck: number;
  /** Hals: reißt bei Schlauchlänge = hals · Halbmesser, ist dann bis auf `halsEng` zugeschnürt, fällt in `halsDauer` s zusammen, sitzt beim Anteil `halsOrt` vom Rahmen */
  hals: number;
  halsEng: number;
  halsDauer: number;
  halsOrt: number;
  /** Blase beim Hängen: wie prall (1 = Form), Tempo, Dämpfung; wie stark die Strömung sie längs zieht */
  prall: number;
  vornHz: number;
  vornD: number;
  stroemung: number;
  /** nach dem Abriss: Nachschwingen der Kuppel (Tempo, Dämpfung, Stoß), Schließen hinten, Zurückschnappen im Rahmen */
  nachHz: number;
  nachD: number;
  stoss: number;
  hintenHz: number;
  hintenD: number;
  rahmenHz: number;
  rahmenD: number;
  /** Schwingen: länglich ↔ flach (Stärke, Tempo, Abklingen in s), seitlich (Stärke, Tempo), Welle vom Abrisspunkt (Stärke) */
  wobbel: number;
  wobbelHz: number;
  wobbelAb: number;
  schwapp: number;
  schwappHz: number;
  riesel: number;
  /** rund wie eine Seifenblase: wie viel runder (0 = gleich die Form), wie lange die Form zum Herauswachsen braucht (s) */
  rund: number;
  formZeit: number;
  /** wie weit der Schlauch die Blase nach hinten zieht (× Halbmesser), Stauchen beim Nachschwingen, Welle über die Haut */
  zug: number;
  quer: number;
  welle: number;
  /** Kamera: Öffnungswinkel am Ende (Dolly-Zoom), Drehung zur Seite beim Abriss, am Ende zur Seite und von oben (Grad) */
  fov: number;
  gierAbriss: number;
  gier: number;
  neigung: number;
}

export const GRUNDWERTE: Werte = {
  rahmenDauer: 2.2,
  ruck: 2.2,
  hals: 1.5,
  halsEng: 0.88,
  halsDauer: 0.09,
  halsOrt: 0.4,
  prall: 1.18,
  vornHz: 1.7,
  vornD: 0.42,
  stroemung: 0.2,
  nachHz: 2.2,
  nachD: 0.24,
  stoss: 1.3,
  hintenHz: 3.0,
  hintenD: 0.28,
  rahmenHz: 7,
  rahmenD: 0.16,
  wobbel: 1,
  wobbelHz: 2.3,
  wobbelAb: 0.75,
  schwapp: 0.09,
  schwappHz: 3.1,
  riesel: 0.14,
  rund: 1,
  formZeit: 1.15,
  zug: 0.12,
  quer: 0.12,
  welle: 0.03,
  fov: 46,
  gierAbriss: 58,
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
  /** 0..1: Dolly-Zoom (Öffnungswinkel, Ziel zur Mitte der Blase); Drehung der Kamera zur Seite und von oben (Grad) */
  fahrt: number;
  gier: number;
  neigung: number;
  /** 0..1: Rest der Haut im Rahmen wird zum Schatten der Seite; Schatten an den Wänden; die Linie des Rahmens */
  schatten: number;
  waende: number;
  linie: number;
}

/** Weg des Rahmens (Anteil der Strecke bis zur Rückwand): zügig losgerissen, dann langsamer gleitend */
function weg(x: number, ruck: number): number {
  const t = Math.min(1, Math.max(0, x));
  // weicher Anfang (kein Sprung im Tempo), dann wie 1 − (1 − t)^ruck
  const an = t * t * (3 - 2 * t);
  const aus = 1 - Math.pow(1 - t, ruck);
  return an * (1 - t) + aus * t;
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

/** Weg durch Schlüsselbilder (Zeit, Wert), weich zwischen ihnen */
function bahn(T: number, punkte: [number, number][]): number {
  if (T <= punkte[0]![0]) return punkte[0]![1];
  for (let i = 0; i + 1 < punkte.length; i++) {
    const [t0, v0] = punkte[i]!;
    const [t1, v1] = punkte[i + 1]!;
    if (T <= t1) return v0 + (v1 - v0) * glatt((T - t0) / Math.max(1e-6, t1 - t0));
  }
  return punkte[punkte.length - 1]![1];
}

/** Zustand T Sekunden nach ↩ */
export function moment(T: number, m: Masse, w: Werte = GRUNDWERTE): Moment {
  const zfBei = (t: number): number => -m.Zw * weg(t / w.rahmenDauer, w.ruck);
  const T1 = halsBeginnt(m, w);
  const riss = T1 + w.halsDauer;
  // Spannung des Schlauchs (0..1 bis zum Abriss)
  const spannungBei = (t: number): number => Math.min(1, -zfBei(t) / Math.max(1, w.hals * m.a));
  // Blase beim Hängen: prall, schwingt mit dem Ruck des Rahmens
  const kuppel = (t: number): { x: number; v: number } => (t > 0.03 ? feder(t - 0.03, 0, 0, w.prall, w.vornHz, w.vornD) : { x: 0, v: 0 });
  const zugBei = (t: number): number => (t < riss ? -w.zug * m.a * weich(0, 1.1, spannungBei(t)) : 0);
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
    rund: w.rund,
    zStreck: 1,
    schwapp: 0,
    riesel: 0,
    rieselOrt: 0,
  };
  if (T < riss) {
    const s = spannungBei(T);
    lage.schnitt = T < T1 ? w.halsEng * Math.pow(s, 1.6) : w.halsEng + (1 - w.halsEng) * ((T - T1) / w.halsDauer) ** 2;
    lage.vorn = kuppel(T).x;
    lage.ze = zugBei(T);
    lage.zn = zf + w.halsOrt * (lage.ze - zf);
    // in der Strömung länglich (in der Tiefe), seitlich etwas schmaler
    lage.zStreck = 1 + w.stroemung * w.wobbel * weich(0, 1, s);
  } else {
    const tau = T - riss;
    const kp = kuppel(riss);
    // knapp vor dem Abriss: Lage von Blase, Hals und Rahmen
    const zeP = zugBei(riss - 1e-4);
    const zfP = zfBei(riss);
    const znP = zfP + w.halsOrt * (zeP - zfP);
    const v = feder(tau, kp.x, kp.v + w.stoss, 1, w.nachHz, w.nachD);
    lage.vorn = v.x;
    lage.ze = feder(tau, zeP, 0, 0, 2.0, 0.3).x;
    lage.hinten = feder(tau, 0, 0, 1, w.hintenHz, w.hintenD).x;
    lage.rahmen = feder(tau, 0, 0, 1, w.rahmenHz, w.rahmenD).x;
    lage.quer = -w.quer * (v.x - 1);
    lage.welle = w.welle * Math.exp(-tau / 0.5) * weich(0, 0.08, tau);
    lage.phase = 1.7 * tau;
    lage.schnitt = 1;
    lage.gerissen = true;
    lage.zn = znP;
    lage.znRiss = znP;
    lage.zfRiss = zfP;
    // Schwingen: länglich ↔ flach (beginnt dort, wo die Strömung sie hingezogen hat), seitlich schwappen, Welle vom Abrisspunkt
    const ab = Math.exp(-tau / w.wobbelAb);
    // stetig am Abriss: beginnt bei der Länge aus der Strömung, der Stoß des Abrisses staucht sie zuerst flach
    const om = 2 * Math.PI * w.wobbelHz * tau;
    lage.zStreck = 1 + w.wobbel * ab * (w.stroemung * Math.cos(om) - 0.16 * Math.sin(om));
    lage.schwapp = w.schwapp * w.wobbel * Math.exp(-tau / (w.wobbelAb * 0.9)) * Math.sin(2 * Math.PI * w.schwappHz * tau);
    lage.riesel = w.riesel * w.wobbel * Math.exp(-tau / 0.55) * weich(0, 0.05, tau);
    lage.rieselOrt = 3.4 * tau;
    // die gezeichnete Form wächst aus der runden Blase heraus
    lage.rund = w.rund * (1 - glatt((tau - 0.18) / w.formZeit));
  }
  const dauer = Math.max(riss + w.formZeit + 1.0, w.rahmenDauer + 0.9);
  // Kamera: beim Hängen zur Seite (Schlauch und Hals im Blick), nach dem Abriss in die Ecke
  const gier = bahn(T, [
    [0, 0],
    [riss * 0.95, w.gierAbriss],
    [riss + 0.35, w.gierAbriss],
    [riss + 1.5, w.gier],
  ]);
  const neigung = bahn(T, [
    [0, 0],
    [riss * 0.95, 8],
    [riss + 0.35, 10],
    [riss + 1.5, w.neigung],
  ]);
  return {
    lage,
    riss,
    dauer,
    fahrt: glatt(T / (riss + 0.9)),
    gier,
    neigung,
    schatten: weich(w.rahmenDauer - 0.3, w.rahmenDauer + 0.4, T),
    waende: weich(riss + 0.45, riss + 1.5, T),
    linie: 1 - weich(w.rahmenDauer - 0.05, w.rahmenDauer + 0.5, T),
  };
}
