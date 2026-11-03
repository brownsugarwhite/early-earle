// Prüfplan P1 „Ansichten als Illustration“, Tag 2–3, zweiter Anlauf (03.11.2026): der Käfig aus den Schleifen.
//
// Florian (03.11.): „Die Linie und das Modell sind doch exakt das selbe … die gelbe Linie sollte eigentlich die schwarze Linie
// sein.“ Der erste Anlauf (`schleifenKoerper`) zog den heutigen Schlauch an die Schleifen und faltete dort, wo der Schlauch
// die Schleife nicht hat. Hier sind die drei Umrissschleifen **Punktreihen des Käfigs**: Die Seite ist die Naht (z = 0), die
// Schleife der Ansicht längs der Achse die Reihe N/4 samt Kappenmitte, die Schleife der Ansicht quer zur Achse ein Ring.
// Die drei Schleifen kreuzen sich in sechs Punkten (vorn, hinten, oben, unten, rechts, links) — das sind die gekoppelten
// Extrempunkte der Zeichnungen. Dazwischen liegen acht Felder; jeder Ring bekommt seine drei Ankerpunkte beim gleichen
// Bogenanteil der drei Bögen (Würfel-Kugel-Topologie der Röhre), die Form zwischen den Ankern ist die Ringschleife
// (gezeichneter Querschnitt), auf die Anker gestreckt — „so rund wie möglich“ heißt: wie der gezeichnete Querschnitt.
// Die Achse (Ringe quer zu x oder zu y) folgt der längeren Ausdehnung der Seite; Ecken-Knoten werden Falten auf Ringen
// (Ecke der Seite oder der Reihenschleife) bzw. Reihen (Ecke der Ringschleife), Ecken an einer Spitze eine Punktfalte.
// Danach ein Löser: Schleifenpunkte hart auf ihren Grenzlagen, Silhouettenbedingung (quer zur Schleife ist die Fläche
// parallel zum Blick), das Innere weich auf der Vorlage, Glättung der Abweichung von der Vorlage. Ohne die Option bitgleich.
//
// Dieser Kern hält die Stücke (Ziele eines Teils in Röhren-Topologie mit Stützstellen, Falten, Löser, Maße); der Bau eines
// Einteilers steht in `schleifenKaefig.ts`, „Teile an der Naht“ (Kinder über Fenster) in `schleifenTeile.ts`. DOM-frei.
import type { V2 } from '../bezier';
import type { Dokument } from '../dokument';
import { type Kaefig, type V3, kanteZwischen } from '../kaefig/halbkanten';
import type { Roehre } from '../kaefig/roehre';
import { grenzDifferenz, grenzZeile } from '../loeser/achsen';
import { type NormalZeile, glaettungsZeilen, kaefigNachbarlisten, normalSystem } from '../loeser/normalSystem';
import type { Unterteilung } from '../subdivision/catmullClark';
import { anwenden3, multiplizieren } from '../subdivision/matrix';
import type { Ableitung, Ecke } from './ableiten';
import { type PlanSchleife, blattKoord, punkt3, tiefeGlaetten } from './umrissPlan';

export const PX = 461;
export type Blatt = 'seite' | 'front' | 'top';
export type KaefigAchse = 'x' | 'y';

export type KaefigOptionen = {
  /** Ringe quer zur x-Achse (vorn/hinten = Kappen) oder zur y-Achse (unten/oben = Kappen); `auto` nach der längeren Ausdehnung */
  achse?: KaefigAchse | 'auto';
  /** Gewicht der Schleifenpunkte (Grenzlage = Schleife) */
  gewicht?: number;
  /** Gewicht der Silhouettenbedingung (quer zur Schleife: Fläche parallel zum Blick) */
  tangente?: number;
  /** Gewicht der Füllung (Grenzlage der übrigen Punkte ≈ Vorlage aus den Schleifen) */
  innen?: number;
  /** Glättung der Stufe 2, nur der Abweichung von der Vorlage; an den Kappen das `fairKappe`-fache */
  fair?: number;
  fairKappe?: number;
  /** Kantenschärfe an Ecken-Knoten (Falten) */
  schaerfe?: number;
  /** Anteil, mit dem die Ringe der Verdrehung der Ringschleife längs der Achse folgen (0 = eben, 1 = wie die Schleife, nach Ringbreite skaliert) */
  kippen?: number;
  /** Verhältnis Höhe : Länge der Seite, ab dem die Achse y ist (`achse: 'auto'`) */
  achseAb?: number;
  /** Teile an der Naht (Kinder über Fenster) bauen, wenn die Zeichnung welche hat (Standard ja; sonst mehrteilig = nicht gebaut) */
  teile?: boolean;
  /**
   * Ringe eben (quer zur Achse): Ring i liegt bei der Achskoordinate seines Rückenankers; Bauch- und Seitenanker sind die Punkte
   * der Bauch- bzw. Reihenschleife bei derselben Achskoordinate (statt beim gleichen Bogenanteil der drei Bögen). Liegen die
   * Kreuzungen oben, rechts und unten nicht auf einer Achskoordinate (Langhals, Robbe: der tiefste Punkt des Bauchs nahe dem
   * Schwanz), kippen die Ringe sonst gegeneinander und kreuzen sich (Kippung 100–180 px, Ringe nach innen). Die Ringschleife
   * ist dann die Vorlage der Ringform, nicht mehr selbst ein Ring. Standard aus (Einteiler bitgleich); Rümpfe mit Kindern bauen eben
   */
  eben?: boolean;
  /**
   * Dichte je Ring (Standard aus; Rümpfe mit Kindern an): Die Ringvorlage wird je Viertel nach der Wurzel der Krümmung abgetastet
   * (`dichteKruemmung`) statt gleichmäßig nach Bogenlänge. Bei Rümpfen mit Kindern ist die Ringschleife nur Vorlage, und die
   * Endstück-Ringe sind harte Kopien davon — die Bauchecke der Robbe braucht ihre Abtastpunkte (Front 7,1 → 4,4 px). Bei Einteilern
   * ist die Ringschleife selbst ein Ring; dort ließ die Dichte am Kegel die gerade Flanke neben der Kielrundung 2,0 → 7,3 px
   * überschwingen (ungeklärt, Register) — Einteiler bleiben nach Bogenlänge
   */
  ringDichte?: boolean;
};

/** Bericht über die Teile (Kinder über Fenster am Eltern-Käfig), siehe `schleifenTeile.ts` */
export type TeileBericht = {
  /**
   * je Kind: Name, Quelle der Erkennung, Art (Streifen auf Rücken/Bauch, auch über die Kappe; Fortsetzung über eine Kappe), Fenster
   * (Reihen λ der Sehnenenden längs der Naht: 0 = vordere Spitze, c/2 + i = Ring i; Seite; Spalten Cw bzw. Ring k), Ringe und
   * Punkte je Ring, Spitze (Welt), mittlere Seitenlänge (px), Knick des Rumpfs an den Sehnenenden (Grad)
   */
  kinder: { name: string; quelle: 'planer' | 'baum'; /** Streifen längs der Naht, Fortsetzung über eine Kappe (Ring ≈ Sehne) oder Endstück (Rand = Ring k hinter der Sehne, die Ringe davor laufen als Kind weiter) */ art: 'streifen' | 'fortsetzung' | 'endstueck'; /** Umrissebene: Seite (Naht-Kind) oder Top (seitliches Paar) */ ebene: 'seite' | 'top'; fenster: { lamA: number; lamB: number; seite: 'oben' | 'unten' | 'rechts' | 'links'; c: number }; ringe: number; punkte: number; spitze: V3; /** Mitte der Sehne (Welt): Fuß der Kindachse */ fuss: V3; /** Kindachse: Fuß, Ringmitten, Spitze */ achse: V3[]; laenge: number; winkel: [number, number]; /** Fensterrand (Käfigpunkte ab dem A-Punkt Richtung +z) und erster Punkt des ersten neuen Rings (Ringe liegen fortlaufend dahinter) */ rand: number[]; erster: number }[];
  /** größter Knick (Grad) an den Fensterrändern (Naht) auf Stufe 1, an Kanten, deren Zeichnung in allen Ansichten glatt ist */
  nahtKnick: number;
  /** größter Knick (Grad) an Randkanten, an denen die Zeichnung einer Ansicht selbst eine Ecke zeigt (T-Stoß); null ohne solche */
  nahtKnickEcken: number | null;
  /** Zahl der Randkanten frei bzw. an gezeichneten Ecken */
  nahtKanten: { frei: number; ecken: number };
  /** Kinder, die nicht gebaut wurden, mit Grund */
  ausgelassen: { name: string; grund: string }[];
  /** je Käfigfläche das Kind (Index in `kinder`), −1 = Rumpf; Fensterflächen gehören zum Kind (seine Spitze) */
  teilVonFlaeche?: Int16Array;
  /** Schleifen des Rumpfs (Welt): Seite mit Sehnen, Front und Top aus der Hülle (Diagnose, Zeichnen) */
  rumpf?: { seite: V3[]; front: V3[]; top: V3[]; anker: { O: V3; S: V3; U: V3 }[] };
  /** Lagen der Sehnenenden auf der Rumpfseite (Diagnose) */
  lagen?: { name: string; a: { bogen: BogenName; s: number; schritt: number; ring: number }; b: { bogen: BogenName; s: number; schritt: number; ring: number }; stuetzen: number }[];
};

export type KaefigBericht = {
  ok: boolean;
  /** Grund, wenn nicht gebaut (mehrteilig, Schleife fehlt) */
  grund?: string;
  achse: KaefigAchse;
  /** Ring der Ringschleife, Kanten je Bogen vorn/hinten */
  ringF: number;
  schritte: { vorn: number; hinten: number };
  /** Bogenlängen (px) der drei Bögen ab vorn und ab hinten */
  bogen: { vorn: [number, number, number]; hinten: [number, number, number] };
  /** Kreuzungen (Welt) */
  kreuzungen: { vorn: V3; hinten: V3; oben: V3; unten: V3; rechts: V3 };
  /** Schleifenpunkte des Käfigs: Naht, Reihenschleife, Ringschleife (Zahl) */
  punkte: { naht: number; reihe: number; ring: number };
  /** Abstand Grenzlage → Schleife an den Schleifenpunkten (px), größter und mittlerer */
  rest: { max: number; mittel: number };
  /** größter Winkel (Grad) der Fläche gegen den Blick an den Schleifenpunkten (0 = Silhouette genau dort) */
  silhouette: number;
  /** Abstand Grenzlage → Vorlage im Innern (px), größter und mittlerer */
  innen: { max: number; mittel: number };
  /** Überstand feiner Punkte über die Silhouetten der Zeichnung (px) */
  ueberstand: { front: number; top: number };
  /** größte Ausdehnung eines Rings längs der Achse (px, Kippen) */
  kippung: number;
  /** Falten: Ringe (Ecken der Seite/Reihenschleife), Reihen (Ecken der Ringschleife), Spitzen */
  falten: { ringe: number[]; kappen: number; reihen: number[]; spitzen: ('vorn' | 'hinten')[] };
  /** Bogenanteile der Schritte (gemeinsame Dichte) ab vorn und ab hinten, Vorlage oben und unten */
  dichte: { vorn: number[]; hinten: number[]; oben: number[]; unten: number[] };
  /** Teile an der Naht (nur mit Kindern) */
  teile?: TeileBericht;
  unbekannte: number;
  huelle: number;
  ms: number;
  msUnterteilung: number;
  msLoeser: number;
};

export const STANDARD: Required<KaefigOptionen> = { achse: 'auto', gewicht: 1e3, tangente: 1e3, innen: 1, fair: 30, fairKappe: 10, schaerfe: 1e6, kippen: 1, achseAb: 1.25, teile: true, eben: false, ringDichte: false };
/** Ecken verschiedener Bögen einer Seite, die näher als dieser Anteil beieinander liegen, rasten auf denselben Schritt (ein Ring) */
const ECKEN_BUENDEL = 0.08;
/** Flache Läufe an Extremen gelten als gleich weit (Welt): eine gezeichnete Gerade wackelt um 1–2 px, die Mitte des Laufs ist die Kreuzung */
const EPS_EXTREM = 3 / PX;
/** Ecken-Knoten dürfen so weit (px) neben der nächsten Probe liegen */
const ECKE_FANG = 3;

const uhr = (globalThis as { performance?: { now(): number } }).performance;
export const jetzt = () => (uhr ? uhr.now() : Date.now());

export const dist = (a: V3, b: V3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** Index des Extremums (max oder min) von `werte`; bei einem flachen Lauf (Werte innerhalb `eps`) der mittlere Index des Laufs (zyklisch). */
export function extremIndex(werte: readonly number[], max: boolean, eps: number = EPS_EXTREM): number {
  const n = werte.length;
  let best = 0;
  for (let i = 1; i < n; i++) if (max ? werte[i]! > werte[best]! : werte[i]! < werte[best]!) best = i;
  const ok = (i: number) => {
    const w = werte[((i % n) + n) % n]!;
    return max ? w >= werte[best]! - eps : w <= werte[best]! + eps;
  };
  let lo = best;
  let hi = best;
  while (hi - lo < n - 1 && ok(lo - 1)) lo--;
  while (hi - lo < n - 1 && ok(hi + 1)) hi++;
  return (((Math.round((lo + hi) / 2) % n) + n) % n);
}

/** Bogen einer geschlossenen Folge von Index a vorwärts bis b (beide einschließlich). */
export function bogen<T>(folge: readonly T[], a: number, b: number): T[] {
  const n = folge.length;
  const out: T[] = [];
  for (let i = a; ; i = (i + 1) % n) {
    out.push(folge[i]!);
    if (i === b) break;
    if (out.length > n) break;
  }
  return out;
}

/** kumulierte Bogenlängen eines Zugs */
export function laengen(zug: readonly V3[]): Float64Array {
  const L = new Float64Array(zug.length);
  for (let i = 1; i < zug.length; i++) L[i] = L[i - 1]! + dist(zug[i]!, zug[i - 1]!);
  return L;
}

/** Punkt bei Bogenlänge s auf dem Zug. */
export function punktBei(zug: readonly V3[], L: Float64Array, s: number): V3 {
  const n = zug.length;
  if (n === 1) return zug[0]!;
  const total = L[n - 1]!;
  const x = Math.min(total, Math.max(0, s));
  let i = 0;
  while (i + 2 < n && L[i + 1]! < x) i++;
  const d = L[i + 1]! - L[i]!;
  const f = d > 1e-15 ? (x - L[i]!) / d : 0;
  const a = zug[i]!;
  const b = zug[i + 1]!;
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}

/** Zug mit Bogenlängen und gewichteten Längen (Bogenlänge + Krümmung · Drehung): Schritte verteilen sich nach der gewichteten Länge. */
export type Gewichtet = { zug: readonly V3[]; L: Float64Array; Lw: Float64Array; total: number; totalW: number };

export function gewichtet(zug: readonly V3[], kruemmung = 0): Gewichtet {
  const L = laengen(zug);
  const n = zug.length;
  const Lw = new Float64Array(n);
  for (let i = 1; i < n; i++) {
    let dreh = 0;
    if (i + 1 < n) {
      const a = zug[i - 1]!;
      const b = zug[i]!;
      const c2 = zug[i + 1]!;
      const u: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const w: V3 = [c2[0] - b[0], c2[1] - b[1], c2[2] - b[2]];
      const lu = Math.hypot(u[0], u[1], u[2]);
      const lw = Math.hypot(w[0], w[1], w[2]);
      if (lu > 1e-15 && lw > 1e-15) dreh = Math.acos(Math.max(-1, Math.min(1, (u[0] * w[0] + u[1] * w[1] + u[2] * w[2]) / (lu * lw))));
    }
    Lw[i] = Lw[i - 1]! + (L[i]! - L[i - 1]!) + kruemmung * dreh;
  }
  return { zug, L, Lw, total: L[n - 1]!, totalW: Lw[n - 1]! };
}

/** gewichtete Lage einer Bogenlänge */
function gewichtetBei(g: Gewichtet, s: number): number {
  const n = g.zug.length;
  const x = Math.min(g.total, Math.max(0, s));
  let i = 0;
  while (i + 2 < n && g.L[i + 1]! < x) i++;
  const d = g.L[i + 1]! - g.L[i]!;
  const f = d > 1e-15 ? (x - g.L[i]!) / d : 0;
  return g.Lw[i]! + f * (g.Lw[i + 1]! - g.Lw[i]!);
}

/** Anteil (0 … 1) einer Bogenlänge an der gewichteten Länge */
const anteilVon = (g: Gewichtet, s: number): number => (g.totalW > 1e-15 ? gewichtetBei(g, s) / g.totalW : 0);

/**
 * Gemeinsame Dichte mehrerer Bögen: Bogenanteil φ_k (0 … 1) je Schritt k = 0 … E, gleichmäßig in der mittleren gewichteten
 * Länge der Bögen. Alle Bögen einer Seite nehmen dieselben Anteile — je Bogen eigene Krümmungsgewichte verschöben die Anker
 * gegeneinander, und die Ringe kreuzten sich (Ei: 160 umgeklappte Flächen).
 */
export function gemeinsameDichte(gs: readonly Gewichtet[], E: number): number[] {
  const M = 512;
  const W = new Float64Array(M + 1);
  for (let t = 0; t <= M; t++) {
    const phi = t / M;
    let w = 0;
    for (const g of gs) w += anteilVon(g, phi * g.total) / gs.length;
    W[t] = w;
  }
  const out: number[] = [];
  for (let k = 0; k <= E; k++) {
    const ziel = k / E;
    let t = 0;
    while (t + 1 < M && W[t + 1]! < ziel) t++;
    const d = W[t + 1]! - W[t]!;
    const f = d > 1e-15 ? (ziel - W[t]!) / d : 0;
    out.push(Math.min(1, Math.max(0, (t + f) / M)));
  }
  out[0] = 0;
  out[E] = 1;
  return out;
}

/**
 * Dichte je Ring (P1, 04.11.): Bogenanteile φ_k (k = 0 … E) eines Zugs, nach der Wurzel der Krümmung verteilt. Zwischen zwei
 * Punkten weicht die Fläche um ≈ l²·κ/8 von der Linie ab (Sagitta); gleicher Fehler je Schritt heißt l ∝ 1/√κ — die Punkte
 * sammeln sich dort, wo die Linie sich dreht (Bauchecke), gerade Stücke behalten die Grunddichte `boden` (Anteil der Dichte eines
 * Kreisbogens gleicher Länge und Drehung). Krümmung = Drehung je Bogenlänge, als Glocke über 3 % der Länge verteilt (Proben
 * rauschen), an den Enden gespiegelt; scharfe Rundungen (über 30° innerhalb eines Sechstels der Punktspanne) zählen nicht.
 */
export function dichteKruemmung(zug: readonly V3[], E: number, boden = 0.5, ebene: [number, number] = [1, 2], ausnehmen: readonly number[] = [], endzone = 0.2, kappe = 4): number[] {
  const n = zug.length;
  const L = laengen(zug);
  const total = L[n - 1]!;
  const gleich = Array.from({ length: E + 1 }, (_, k) => k / E);
  if (!(total > 1e-15) || n < 3 || E < 1) return gleich;
  const M = 512;
  const sigma = 0.03 * total;
  // Rundungen, die kleiner sind als ein Drittel der Punktspanne (Kegel: r 10 px bei 80 px je Punkt), kann der Spline mit diesen
  // Punkten nicht abbilden — sie brauchen eine Falte; die Dichte lässt sie aus wie eine gezeichnete Ecke (mit zwei Punkten in der
  // Rundung schwang der Spline auf der geraden Flanke daneben 7 px über die Zeichnung). Die Bauchecke der Robbe (r ≈ eine Spanne) zählt
  const kappa = new Float64Array(M + 1);
  /** rohe Drehung je Rasterzelle (vor der Glättung) für die Erkennung scharfer Rundungen */
  const roh = new Float64Array(M + 1);
  let drehung = 0;
  const [e0, e1] = ebene;
  for (let i = 1; i + 1 < n; i++) {
    const a = zug[i - 1]!;
    const b = zug[i]!;
    const c2 = zug[i + 1]!;
    // Drehung in der Ebene der Schleife (die Kreuzungspunkte an den Enden liegen in der dritten Koordinate daneben — der Knick
    // dorthin ist keine Krümmung der Zeichnung; am Ei lagen die Punkte sonst zu den Enden hin dichter, Front 0,4 → 0,8 px)
    const u = [b[e0]! - a[e0]!, b[e1]! - a[e1]!];
    const w = [c2[e0]! - b[e0]!, c2[e1]! - b[e1]!];
    const lu = Math.hypot(u[0]!, u[1]!);
    const lw = Math.hypot(w[0]!, w[1]!);
    if (!(lu > 1e-15 && lw > 1e-15)) continue;
    const dreh = Math.acos(Math.max(-1, Math.min(1, (u[0]! * w[0]! + u[1]! * w[1]!) / (lu * lw))));
    if (!(dreh > 0)) continue;
    const s0 = L[i]!;
    // gezeichnete Ecken sind Stützstellen mit Falte: ihre Drehung verdichtet nicht (scharfer Würfel: sonst drängten alle Punkte in die Ecke)
    if (ausnehmen.some((sa) => Math.abs(sa - s0) <= 2 * sigma)) continue;
    drehung += dreh;
    roh[Math.round((s0 / total) * M)] = roh[Math.round((s0 / total) * M)]! + dreh;
    const norm = dreh / (sigma * Math.sqrt(2 * Math.PI));
    for (let m = 0; m <= M; m++) {
      const s = (m / M) * total;
      let g = 0;
      for (const sq of [s0, -s0, 2 * total - s0]) {
        const d = (s - sq) / sigma;
        if (Math.abs(d) <= 4) g += Math.exp(-0.5 * d * d);
      }
      kappa[m] = kappa[m]! + norm * g;
    }
  }
  if (!(drehung > 1e-9)) return gleich;
  const kreis = Math.max(drehung, Math.PI / 2) / total;
  // Endzonen der Viertel: Die Kreuzungen sind Extrema, dort ist die Zeichnung höchstens so rund wie ein Kreisbogen — ein Knick nahe
  // dem Ende ist ein Schnitt der Hülle (die Rumpf-Front der Ente endet flach an der Sehne des Halses: 90°, das Halsfenster rückte
  // zusammen, Naht 20 → 29°); dort zählt höchstens die Krümmung des Kreisbogens
  for (let m = 0; m <= M; m++) if (m < endzone * M || m > (1 - endzone) * M) kappa[m] = Math.min(kappa[m]!, kreis);
  // scharfe Rundungen: dreht sich die Linie innerhalb eines Sechstels der Punktspanne um mehr als 30°, kann der Spline das mit diesen
  // Punkten nicht abbilden (Kegel: r 10 px bei 120 px je Punkt — mit zwei Punkten dicht an der Rundung schwang er auf der geraden
  // Flanke daneben 7 px über die Zeichnung); eine halbe Spanne um die Stelle zählt dann höchstens Kreiskrümmung — die Rundung
  // braucht eine Falte, keine Dichte. Die Bauchecke der Robbe (90° über 1,5 Spannen) zählt weiter
  const fenster = Math.max(1, Math.round(M / (6 * E)));
  const halbeSpanne = Math.round(M / (2 * E));
  const scharf = new Uint8Array(M + 1);
  for (let m = 0; m <= M; m++) {
    let summe = 0;
    for (let q = Math.max(0, m - fenster); q <= Math.min(M, m + fenster); q++) summe += roh[q]!;
    if (summe > Math.PI / 6) for (let q = Math.max(0, m - halbeSpanne); q <= Math.min(M, m + halbeSpanne); q++) scharf[q] = 1;
  }
  for (let m = 0; m <= M; m++) if (scharf[m]) kappa[m] = Math.min(kappa[m]!, kreis);
  const k0 = boden * boden * kreis;
  // Dichte höchstens das `kappe`-fache der Grunddichte: eine winzige Rundung (Würfel r 0,03) zöge sonst alle Punkte des Viertels an sich
  const rhoMax = kappe * Math.sqrt(k0);
  const rho = (m: number) => Math.min(rhoMax, Math.sqrt(kappa[m]! + k0));
  const W = new Float64Array(M + 1);
  for (let m = 1; m <= M; m++) W[m] = W[m - 1]! + ((rho(m - 1) + rho(m)) / 2) * (total / M);
  const out: number[] = [];
  for (let k = 0; k <= E; k++) {
    const ziel = (k / E) * W[M]!;
    let m = 0;
    while (m + 1 < M && W[m + 1]! < ziel) m++;
    const d = W[m + 1]! - W[m]!;
    out.push(Math.min(1, Math.max(0, (m + (d > 1e-15 ? (ziel - W[m]!) / d : 0)) / M)));
  }
  out[0] = 0;
  out[E] = 1;
  return out;
}

/** Schritt (gebrochen) eines Bogenanteils f in einer Dichte phi (Anteile je Schritt) */
export function schrittVon(phi: readonly number[], E: number, f: number): number {
  let k = 0;
  while (k + 1 < E && phi[k + 1]! <= f) k++;
  const d = phi[k + 1]! - phi[k]!;
  return k + (d > 1e-15 ? (f - phi[k]!) / d : 0);
}

/**
 * Zug in E Kanten abtasten: Schritte nach der gemeinsamen Dichte `phi` (Bogenanteile), Stützstellen (Bogenlängen, Schritt
 * vorgegeben oder nach der Dichte gerundet) rasten auf Gitterschritte (ab 1, aufsteigend, nie am Ende); zwischen zwei
 * Stützstellen wird die Dichte auf das Stück gestreckt. Liefert E + 1 Punkte und je Stützstelle ihren Schritt.
 */
export function abtasten(g: Gewichtet, E: number, stuetzen: readonly { s: number; k?: number }[], phi: readonly number[]): { punkte: V3[]; schritte: number[] } {
  const stuetz: { f: number; k: number }[] = [{ f: 0, k: 0 }];
  const sortiert = [...stuetzen].filter((e) => e.s > 1e-12 && e.s < g.total - 1e-12).sort((a, b) => a.s - b.s);
  const schritte: number[] = [];
  let kMin = 1;
  sortiert.forEach((e, q) => {
    const rest = sortiert.length - 1 - q;
    const f = e.s / g.total;
    let k = e.k ?? Math.round(schrittVon(phi, E, f));
    k = Math.max(kMin, Math.min(E - 1 - rest, k));
    if (k < kMin || k > E - 1) return;
    stuetz.push({ f, k });
    schritte.push(k);
    kMin = k + 1;
  });
  stuetz.push({ f: 1, k: E });
  const punkte: V3[] = [];
  for (let k = 0; k <= E; k++) {
    let q = 0;
    while (q + 2 < stuetz.length && stuetz[q + 1]!.k <= k) q++;
    const a = stuetz[q]!;
    const b = stuetz[q + 1]!;
    const dw = phi[b.k]! - phi[a.k]!;
    const lam = dw > 1e-15 ? (phi[k]! - phi[a.k]!) / dw : 0;
    punkte.push(punktBei(g.zug, g.L, (a.f + lam * (b.f - a.f)) * g.total));
  }
  return { punkte, schritte };
}

/** Bogenlänge eines Index auf einem Zug */
const bogenLaengeBis = (zug: readonly V3[], i: number): number => laengen(zug)[Math.max(0, Math.min(zug.length - 1, i))]!;

/** Schleife mit neu geglätteter Tiefe (kleinste Biegung in den Intervallen, geschlossen). */
export function tiefeNeu(s: PlanSchleife): PlanSchleife {
  const m = s.proben.length;
  const lo = new Float64Array(m);
  const hi = new Float64Array(m);
  const fest = new Uint8Array(m);
  s.proben.forEach((p, i) => {
    lo[i] = p.lo;
    hi[i] = p.hi;
    fest[i] = Number.isFinite(p.lo) && Number.isFinite(p.hi) ? 1 : 0;
  });
  if (!fest.some((f) => f)) return s;
  const d = tiefeGlaetten(lo, hi, fest, true);
  return { ...s, proben: s.proben.map((p, i) => ({ ...p, p: punkt3(s.ansicht, p.q, d[i]!) })) };
}

/** Index des Schleifenpunkts (Welt), der einem Blattpunkt am nächsten liegt (projiziert in die Ansicht), wenn näher als `ECKE_FANG` px; sonst −1. */
function knotenIndex(p: readonly V3[], ansicht: Blatt, kn: V2): number {
  let best = -1;
  let bd = (ECKE_FANG / PX) ** 2;
  p.forEach((q3, i) => {
    const q = blattKoord(ansicht, q3);
    const d = (q.x - kn.x) ** 2 + (q.y - kn.y) ** 2;
    if (d < bd) {
      bd = d;
      best = i;
    }
  });
  return best;
}

/** Index des Schleifenpunkts (Welt), der einem Weltpunkt am nächsten liegt */
function naechsterIndex(p: readonly V3[], q: V3): number {
  let best = 0;
  let bd = Infinity;
  p.forEach((x, i) => {
    const d = dist(x, q);
    if (d < bd) {
      bd = d;
      best = i;
    }
  });
  return best;
}

/** Hälfte einer geschlossenen Schleife zwischen zwei Indizes mit z ≥ 0 (mittleres z der beiden Wege). */
function halbZ(p: readonly V3[], a: number, b: number): { p: V3[]; idx: number[] } {
  const n = p.length;
  const vor: number[] = [];
  for (let i = a; ; i = (i + 1) % n) {
    vor.push(i);
    if (i === b || vor.length > n) break;
  }
  const rueck: number[] = [];
  for (let i = a; ; i = (i - 1 + n) % n) {
    rueck.push(i);
    if (i === b || rueck.length > n) break;
  }
  const mz = (l: number[]) => l.reduce((s, i) => s + p[i]![2], 0) / l.length;
  const idx = mz(vor) >= mz(rueck) ? vor : rueck;
  return { p: idx.map((i) => p[i]!), idx };
}

/** Ecken-Knoten eines Profils (Blattkoordinaten, Welt-Maßstab) */
export function eckenKnoten(dok: Dokument, a: Blatt): V2[] {
  const sk = dok.skalierung;
  return dok.profile[a].knoten.filter((k) => k.art === 'ecke' && !k.marke).map((k) => ({ x: k.p.x * sk, y: k.p.y * sk }));
}

export type FalteSeite = 'oben' | 'unten' | 'seite';

/** Winkelgewicht einer Ringkante bei θ (0 = oben, π/2 = rechts) für eine Falte von der Seite `seite` (wie `faltenSetzen`). */
function faltenGewicht(theta: number, seite: FalteSeite | 'beide'): number {
  if (seite === 'beide') return 1;
  if (seite === 'seite') return Math.sin(theta) ** 2;
  const c = Math.cos(theta);
  return seite === 'oben' ? Math.max(0, c) ** 2 : Math.max(0, -c) ** 2;
}

/** Rahmen eines Teils: Kanon (a längs der Achse, h quer in der Seite, z nach rechts) ↔ Welt, eine Drehung um z. */
export type Rahmen = { achse: KaefigAchse; K: (p: V3) => V3; W: (p: V3) => V3 };

export function rahmenFuer(achse: KaefigAchse): Rahmen {
  return achse === 'x' ? { achse, K: (p) => [p[0], p[1], p[2]], W: (p) => [p[0], p[1], p[2]] } : { achse, K: (p) => [p[1], -p[0], p[2]], W: (p) => [-p[1], p[0], p[2]] };
}

/** Achse nach der längeren Ausdehnung der Seitenschleife (Welt). */
export function achseWaehlen(seite: readonly V3[], achseAb: number): KaefigAchse {
  let xLo = Infinity;
  let xHi = -Infinity;
  let yLo = Infinity;
  let yHi = -Infinity;
  for (const p of seite) {
    xLo = Math.min(xLo, p[0]);
    xHi = Math.max(xHi, p[0]);
    yLo = Math.min(yLo, p[1]);
    yHi = Math.max(yHi, p[1]);
  }
  return yHi - yLo > achseAb * (xHi - xLo) ? 'y' : 'x';
}

/** Schleifenpunkt mit Silhouettenbedingung: Punkt, Nachbarpaar quer zur Schleife, Umrissnormale (Welt) */
export type Band = { p: number; quer: [number, number]; w: V3 };

/** Eingabe: die drei Schleifen eines Teils (Welt, geschlossen), sein Rahmen und seine Röhren-Maße. */
export type EinteilEingabe = {
  /** Seite (z = 0), Schleife der Ansicht längs der Achse (Reihenschleife), Schleife der Ansicht quer zur Achse (Ringschleife) */
  seite: readonly V3[];
  reihe: readonly V3[];
  ring: readonly V3[];
  rahmen: Rahmen;
  R: number;
  N: number;
  /** Ecken-Knoten (Blattkoordinaten der jeweiligen Ansicht) → Falten */
  ecken: { seite: V2[]; reihe: V2[]; ring: V2[] };
  /** Stützstellen der Kinder (Teile an der Naht): Bogen der Seite, Bogenlänge ab dem Bogenanfang, fester Schritt */
  stuetzen?: readonly { bogen: BogenName; s: number; k: number }[];
  /** Punkte auf der Seitenschleife (Welt), deren Lage (Bogen, Bogenlänge, natürlicher Schritt und Ring) gefragt ist */
  fragen?: readonly V3[];
  opt: Required<KaefigOptionen>;
};

/** Bögen der Seite in Laufrichtung des Käfigs: vo = vorn → oben, oh = oben → hinten (ab hinten gezählt), hu = hinten → unten, uv = unten → vorn (ab vorn gezählt) */
export type BogenName = 'vo' | 'oh' | 'hu' | 'uv';
/** Lage eines Punkts auf der Seitenschleife: Bogen, Bogenlänge ab dem Bogenanfang (Laufrichtung), Gesamtlänge, natürlicher Schritt (gebrochen) und Ring (gebrochen; < 0 bzw. > R − 1 = in der Kappe) */
export type SeitenLage = { bogen: BogenName; s: number; total: number; schritt: number; ring: number; seite: 'oben' | 'unten'; ende: 'vorn' | 'hinten' };

export type EinteilErgebnis = {
  /** Ziele (Welt, 3 je Käfigpunkt der Röhre) */
  ziele: Float64Array;
  naht: number[];
  reihe: Band[];
  ringB: Band[];
  faltenRinge: Map<number, Set<FalteSeite>>;
  faltenKappen: Map<string, Set<FalteSeite>>;
  reihenFalten: number[];
  spitzen: ('vorn' | 'hinten')[];
  ringF: number;
  schritte: { vorn: number; hinten: number };
  bogen: { vorn: [number, number, number]; hinten: [number, number, number] };
  kreuzungen: { vorn: V3; hinten: V3; oben: V3; unten: V3; rechts: V3 };
  dichte: { vorn: number[]; hinten: number[]; oben: number[]; unten: number[] };
  /** Lagen der gefragten Punkte (`fragen`) */
  lagen: SeitenLage[];
  /**
   * Ringvorlage (normiert): je Viertel c + 1 Einträge, `oben` von der Rückenkreuzung zur Seite, `unten` von der Seite zur
   * Bauchkreuzung — u = Höhenanteil ab der Seitenhöhe (0 = Seite, 1 = Rücken bzw. Bauch), v = Breite relativ zur Seitenbreite;
   * `seite` = Höhenanteil der Seite zwischen Bauch (0) und Rücken (1)
   */
  vorlage: { oben: { u: number; v: number }[]; unten: { u: number; v: number }[]; seite: number };
  /** die Anker je Ring (Welt): Rücken, Seite, Bauch — für Kinder, die ihre Breite am Eltern-Ring messen */
  anker: { O: V3; S: V3; U: V3 }[];
  /** Schrittzahl je Bogen und Schritt → Ring */
  schrittVonRing: (b: BogenName, i: number) => number;
  ringVonSchritt: (b: BogenName, k: number) => number;
};

/**
 * Ziele eines Teils in Röhren-Topologie aus seinen drei Schleifen: Kreuzungen, Bögen, Anker beim gleichen Bogenanteil (eine
 * gemeinsame Dichte je Seite, Ecken und Sehnen als Stützstellen), Ringschleife als Vorlage, Kappen als Quadratringe; dazu die
 * Schleifenpunkte, Silhouettenbedingungen und Falten.
 */
export function einteilZiele(e: EinteilEingabe, v: Roehre): EinteilErgebnis | { grund: string } {
  const { K, W } = e.rahmen;
  const { R, N } = e;
  const c = N / 4;
  const opt = e.opt;
  const reihenAnsicht: Blatt = e.rahmen.achse === 'x' ? 'top' : 'front';
  const ringAnsicht: Blatt = e.rahmen.achse === 'x' ? 'front' : 'top';
  // ---- Seite: Naht ----
  let Sp = e.seite.map(K);
  let nS = Sp.length;
  let seitenEcken = e.ecken.seite.map((kn) => knotenIndex(e.seite, 'seite', kn)).filter((i) => i >= 0);
  const kreuz = () => ({ vorn: extremIndex(Sp.map((p) => p[0]), false), hinten: extremIndex(Sp.map((p) => p[0]), true), oben: extremIndex(Sp.map((p) => p[1]), true), unten: extremIndex(Sp.map((p) => p[1]), false) });
  let kr0 = kreuz();
  const vorwaerts = (i: number, j: number) => (j - i + nS) % nS;
  let umgekehrt = false;
  if (vorwaerts(kr0.vorn, kr0.oben) > vorwaerts(kr0.vorn, kr0.unten)) {
    Sp = [...Sp].reverse();
    seitenEcken = seitenEcken.map((i) => nS - 1 - i);
    umgekehrt = true;
    kr0 = kreuz();
  }
  nS = Sp.length;
  const vorn = Sp[kr0.vorn]!;
  const hinten = Sp[kr0.hinten]!;
  const oben = Sp[kr0.oben]!;
  const unten = Sp[kr0.unten]!;
  if (kr0.vorn === kr0.oben || kr0.oben === kr0.hinten || kr0.hinten === kr0.unten || kr0.unten === kr0.vorn) return { grund: 'Seite: Kreuzungen fallen zusammen' };
  const S_vo = bogen(Sp, kr0.vorn, kr0.oben);
  const S_oh = bogen(Sp, kr0.oben, kr0.hinten);
  const S_hu = bogen(Sp, kr0.hinten, kr0.unten);
  const S_uv = bogen(Sp, kr0.unten, kr0.vorn);
  /** Lage eines Seitenindex: Bogen und Bogenlänge ab dem Bogenanfang in Laufrichtung des Käfigs (vorn-Bögen ab vorn, hinten-Bögen ab hinten) */
  const lageVon = (i: number): { bogen: BogenName; s: number } => {
    const dv = vorwaerts(kr0.vorn, i);
    if (dv <= vorwaerts(kr0.vorn, kr0.oben)) return { bogen: 'vo', s: bogenLaengeBis(S_vo, dv) };
    const doo = vorwaerts(kr0.oben, i);
    if (doo <= vorwaerts(kr0.oben, kr0.hinten)) return { bogen: 'oh', s: laengen(S_oh)[S_oh.length - 1]! - bogenLaengeBis(S_oh, doo) };
    const dh = vorwaerts(kr0.hinten, i);
    if (dh <= vorwaerts(kr0.hinten, kr0.unten)) return { bogen: 'hu', s: bogenLaengeBis(S_hu, dh) };
    const du = vorwaerts(kr0.unten, i);
    return { bogen: 'uv', s: laengen(S_uv)[S_uv.length - 1]! - bogenLaengeBis(S_uv, du) };
  };
  const spitzen: ('vorn' | 'hinten')[] = [];
  for (const i of seitenEcken) {
    if (i === kr0.vorn) spitzen.push('vorn');
    if (i === kr0.hinten) spitzen.push('hinten');
  }
  // ---- Reihenschleife (durch vorn, rechts, hinten): rechte Hälfte vorn → hinten ----
  const Rw = e.reihe.map(K);
  const rwVorn = extremIndex(Rw.map((p) => p[0]), false);
  const rwHinten = extremIndex(Rw.map((p) => p[0]), true);
  const rwHalb = halbZ(Rw, rwVorn, rwHinten);
  const rwRechts = extremIndex(rwHalb.p.map((p) => p[2]), true);
  if (rwRechts <= 0 || rwRechts >= rwHalb.p.length - 1) return { grund: 'Reihenschleife: rechts fällt mit vorn oder hinten zusammen' };
  // ---- Ringschleife (durch oben, rechts, unten): rechte Hälfte oben → unten ----
  const Rg = e.ring.map(K);
  const rgOben = extremIndex(Rg.map((p) => p[1]), true);
  const rgUnten = extremIndex(Rg.map((p) => p[1]), false);
  const rgHalb = halbZ(Rg, rgOben, rgUnten);
  const rgRechts = extremIndex(rgHalb.p.map((p) => p[2]), true);
  if (rgRechts <= 0 || rgRechts >= rgHalb.p.length - 1) return { grund: 'Ringschleife: rechts fällt mit oben oder unten zusammen' };
  const rechts: V3 = [rwHalb.p[rwRechts]![0], rgHalb.p[rgRechts]![1], (rwHalb.p[rwRechts]![2] + rgHalb.p[rgRechts]![2]) / 2];
  const mitEnden = (zug: V3[], anfang: V3, ende: V3): V3[] => {
    const out = zug.slice();
    out[0] = anfang;
    out[out.length - 1] = ende;
    return out;
  };
  const Rw_vr = mitEnden(rwHalb.p.slice(0, rwRechts + 1), vorn, rechts);
  const Rw_rh = mitEnden(rwHalb.p.slice(rwRechts), rechts, hinten);
  const Rg_or = mitEnden(rgHalb.p.slice(0, rgRechts + 1), oben, rechts);
  const Rg_ru = mitEnden(rgHalb.p.slice(rgRechts), rechts, unten);
  // Ecken der Reihen- und Ringschleife (Knoten des jeweiligen Profils) als Bogenlängen auf ihren Bögen
  const eckenHalb = (welt: readonly V3[], halb: { idx: number[] }, blatt: Blatt, knoten: V2[], teil: number, bis: number, zug: readonly V3[], umkehren: boolean): number[] => {
    const out: number[] = [];
    for (const kn of knoten) {
      const i = knotenIndex(welt, blatt, kn);
      if (i < 0) continue;
      const pos = halb.idx.indexOf(i);
      if (pos <= teil || pos >= bis) continue;
      const s = bogenLaengeBis(zug, pos - teil);
      out.push(umkehren ? laengen(zug)[zug.length - 1]! - s : s);
    }
    return out;
  };
  // ---- Schritte: Ringschleife = Ring ringF, Kanten je Bogen so, dass die Schritte beiderseits gleich lang sind ----
  const laenge = (zug: readonly V3[]) => laengen(zug)[zug.length - 1]!;
  const Lv = [laenge(S_vo), laenge(Rw_vr), laenge(S_uv)] as [number, number, number];
  const Lh = [laenge(S_oh), laenge(Rw_rh), laenge(S_hu)] as [number, number, number];
  const lv = (Lv[0] + Lv[1] + Lv[2]) / 3;
  const lh = (Lh[0] + Lh[1] + Lh[2]) / 3;
  const ringF = Math.max(1, Math.min(R - 2, Math.round((lv * (c / 2 + R - 1) - lh * (c / 2)) / (lv + lh))));
  const Ev = c / 2 + ringF;
  const Eh = c / 2 + (R - 1 - ringF);
  const gS_vo = gewichtet(S_vo);
  const gS_uv = gewichtet([...S_uv].reverse());
  const gRw_vr = gewichtet(Rw_vr);
  const gS_oh = gewichtet([...S_oh].reverse());
  const gS_hu = gewichtet(S_hu);
  const gRw_rh = gewichtet([...Rw_rh].reverse());
  const phiV = gemeinsameDichte([gS_vo, gRw_vr, gS_uv], Ev);
  const phiH = gemeinsameDichte([gS_oh, gRw_rh, gS_hu], Eh);
  // Ecken der Seite je Bogen als Bogenlänge ab dem Bogenanfang (ab vorn bzw. ab hinten)
  const eckenAuf = (b: BogenName): number[] => seitenEcken.map(lageVon).filter((l) => l.bogen === b && l.s > 1e-12).map((l) => l.s);
  // Stützstellen der Kinder (feste Schritte) und Lagen der gefragten Punkte
  type Stuetz = { s: number; k?: number };
  const stuetzen: Record<BogenName, Stuetz[]> = { vo: [], oh: [], hu: [], uv: [] };
  const ringVon = (b: BogenName, k: number) => (b === 'vo' || b === 'uv' ? k - c / 2 : R - 1 - (k - c / 2));
  const schrittVonRing = (b: BogenName, i: number) => (b === 'vo' || b === 'uv' ? i + c / 2 : R - 1 - i + c / 2);
  const gewichtetVon = (b: BogenName) => (b === 'vo' ? gS_vo : b === 'uv' ? gS_uv : b === 'oh' ? gS_oh : gS_hu);
  const phiVonBogen = (b: BogenName) => (b === 'vo' || b === 'uv' ? phiV : phiH);
  const EVonBogen = (b: BogenName) => (b === 'vo' || b === 'uv' ? Ev : Eh);
  for (const st of e.stuetzen ?? []) stuetzen[st.bogen].push({ s: st.s, k: st.k });
  const lagen: SeitenLage[] = (e.fragen ?? []).map((q) => {
    const l = lageVon(naechsterIndex(Sp, K(q)));
    const g = gewichtetVon(l.bogen);
    const schritt = schrittVon(phiVonBogen(l.bogen), EVonBogen(l.bogen), g.total > 1e-15 ? l.s / g.total : 0);
    return { bogen: l.bogen, s: l.s, total: g.total, schritt, ring: ringVon(l.bogen, schritt), seite: l.bogen === 'vo' || l.bogen === 'oh' ? 'oben' : 'unten', ende: l.bogen === 'vo' || l.bogen === 'uv' ? 'vorn' : 'hinten' };
  });
  const buendeln = (E: number, listen: { g: Gewichtet; ecken: number[] }[], phi: readonly number[]): { s: number; k: number }[][] => {
    const alle: { l: number; s: number; f: number }[] = [];
    listen.forEach((x, l) => x.ecken.forEach((s2) => alle.push({ l, s: s2, f: schrittVon(phi, E, s2 / x.g.total) / E })));
    alle.sort((a, b) => a.f - b.f);
    const out: { s: number; k: number }[][] = listen.map(() => []);
    let i = 0;
    while (i < alle.length) {
      let j = i;
      while (j + 1 < alle.length && alle[j + 1]!.f - alle[i]!.f <= ECKEN_BUENDEL && alle[j + 1]!.l !== alle[i]!.l) j++;
      let f = 0;
      for (let q = i; q <= j; q++) f += alle[q]!.f / (j - i + 1);
      const k = Math.max(1, Math.min(E - 1, Math.round(f * E)));
      for (let q = i; q <= j; q++) out[alle[q]!.l]!.push({ s: alle[q]!.s, k });
      i = j + 1;
    }
    return out;
  };
  const eV = buendeln(Ev, [
    { g: gS_vo, ecken: eckenAuf('vo') },
    { g: gRw_vr, ecken: eckenHalb(e.reihe, rwHalb, reihenAnsicht, e.ecken.reihe, 0, rwRechts, Rw_vr, false) },
    { g: gS_uv, ecken: eckenAuf('uv') },
  ], phiV);
  const eH = buendeln(Eh, [
    { g: gS_oh, ecken: eckenAuf('oh') },
    { g: gRw_rh, ecken: eckenHalb(e.reihe, rwHalb, reihenAnsicht, e.ecken.reihe, rwRechts, rwHalb.p.length - 1, Rw_rh, true) },
    { g: gS_hu, ecken: eckenAuf('hu') },
  ], phiH);
  const Ov = abtasten(gS_vo, Ev, [...eV[0]!, ...stuetzen.vo], phiV);
  const Sv = abtasten(gRw_vr, Ev, eV[1]!, phiV);
  const Uv = abtasten(gS_uv, Ev, [...eV[2]!, ...stuetzen.uv], phiV);
  const Oh = abtasten(gS_oh, Eh, [...eH[0]!, ...stuetzen.oh], phiH);
  const Sh = abtasten(gRw_rh, Eh, eH[1]!, phiH);
  const Uh = abtasten(gS_hu, Eh, [...eH[2]!, ...stuetzen.hu], phiH);
  // Ecken-Schritte (ohne die Stützstellen der Kinder, die keine Falten sind)
  const nurEcken = (ab: { schritte: number[] }, ecken: { k: number }[]) => ab.schritte.filter((k) => ecken.some((x) => x.k === k));
  // Ringe eben: Bauch- und Seitenanker bei der Achskoordinate des Rückenankers (Bauch vorn → unten → hinten, Reihe vorn → rechts →
  // hinten). Die Reihenschleife roh (`rwHalb.p`), nicht mit den Kreuzungen als Enden: `mitEnden` ersetzt ihren Endpunkt durch die
  // Spitze (z = 0) — bei einem flachen Ende (Hutunterseite, 0,075 breit) wird daraus ein V, in dem der erste Ring 0,02 breit würde
  if (opt.eben) {
    const bauch: V3[] = [...[...S_uv].reverse(), ...[...S_hu].reverse().slice(1)];
    const reiheHalb: V3[] = rwHalb.p;
    const beiA = (zug: readonly V3[], a: number, wahl: (p: V3) => number, sonst: V3): V3 => {
      let best: V3 | null = null;
      for (let i = 0; i + 1 < zug.length; i++) {
        const p = zug[i]!;
        const q = zug[i + 1]!;
        if (!((p[0] <= a && q[0] >= a) || (q[0] <= a && p[0] >= a))) continue;
        const d = q[0] - p[0];
        const f = Math.abs(d) > 1e-15 ? (a - p[0]) / d : 0;
        const r: V3 = [a, p[1] + (q[1] - p[1]) * f, p[2] + (q[2] - p[2]) * f];
        if (!best || wahl(r) > wahl(best)) best = r;
      }
      return best ?? sonst;
    };
    const unten = (p: V3) => -p[1];
    const aussen = (p: V3) => Math.abs(p[2]);
    for (let k2 = 1; k2 <= Ev; k2++) {
      const a = Ov.punkte[k2]![0];
      Uv.punkte[k2] = beiA(bauch, a, unten, Uv.punkte[k2]!);
      Sv.punkte[k2] = beiA(reiheHalb, a, aussen, Sv.punkte[k2]!);
    }
    for (let k2 = 1; k2 <= Eh; k2++) {
      const a = Oh.punkte[k2]![0];
      Uh.punkte[k2] = beiA(bauch, a, unten, Uh.punkte[k2]!);
      Sh.punkte[k2] = beiA(reiheHalb, a, aussen, Sh.punkte[k2]!);
    }
    // die Ringschleife (Schritt Ev = Eh = Ring ringF) teilen beide Seiten: dieselben Anker
    Uh.punkte[Eh] = Uv.punkte[Ev]!;
    Sh.punkte[Eh] = Sv.punkte[Ev]!;
  }
  // ---- Vorlage: die Ringschleife, je Viertel c Kanten, Ecken auf Gitterpunkten; normiert auf die Anker oben/rechts/unten ----
  const gRg_or = gewichtet(Rg_or);
  const gRg_ru = gewichtet(Rg_ru);
  const eckenO = eckenHalb(e.ring, rgHalb, ringAnsicht, e.ecken.ring, 0, rgRechts, Rg_or, false);
  const eckenU = eckenHalb(e.ring, rgHalb, ringAnsicht, e.ecken.ring, rgRechts, rgHalb.p.length - 1, Rg_ru, false);
  const phiO = opt.ringDichte ? dichteKruemmung(Rg_or, c, 0.5, [1, 2], eckenO) : gemeinsameDichte([gRg_or], c);
  const phiU = opt.ringDichte ? dichteKruemmung(Rg_ru, c, 0.5, [1, 2], eckenU) : gemeinsameDichte([gRg_ru], c);
  const To = abtasten(gRg_or, c, eckenO.map((s2) => ({ s: s2 })), phiO);
  const Tu = abtasten(gRg_ru, c, eckenU.map((s2) => ({ s: s2 })), phiU);
  const zR = rechts[2] || 1e-9;
  const norm = (T: V3[], ende: V3) => T.map((p) => {
    const dh = ende[1] - rechts[1];
    const u = Math.abs(dh) > 1e-12 ? (p[1] - rechts[1]) / dh : 0;
    const vv = p[2] / zR;
    return { u, v: vv, da: p[0] - (rechts[0] + u * (ende[0] - rechts[0])) };
  });
  const vo = norm(To.punkte, oben);
  const vu = norm(Tu.punkte, unten);
  const vorlage = (t: { u: number; v: number; da: number }[], f: number) => {
    const x = Math.min(c, Math.max(0, f * c));
    const i = Math.min(c - 1, Math.floor(x));
    const g = x - i;
    const a = t[i]!;
    const b = t[i + 1]!;
    return { u: a.u + (b.u - a.u) * g, v: a.v + (b.v - a.v) * g, da: a.da + (b.da - a.da) * g };
  };
  const lage = (O: V3, Sd: V3, U: V3, untenHalb: boolean, f: number, rechtsSeite: boolean): V3 => {
    const t = untenHalb ? vorlage(vu, f) : vorlage(vo, f);
    const B = untenHalb ? U : O;
    const kipp = opt.kippen * (Sd[2] / zR);
    const a = Sd[0] + t.u * (B[0] - Sd[0]) + t.da * kipp;
    const h = Sd[1] + t.u * (B[1] - Sd[1]);
    const z = t.v * Sd[2] * (rechtsSeite ? 1 : -1);
    return [a, h, z];
  };
  // ---- Ziele aller Käfigpunkte (Kanon → Welt) ----
  const n = v.kaefig.n;
  const ziele = new Float64Array(3 * n);
  const setze = (p: number, q: V3) => {
    const w = W(q);
    ziele[3 * p] = w[0];
    ziele[3 * p + 1] = w[1];
    ziele[3 * p + 2] = w[2];
  };
  const anker = (i: number): { O: V3; Sd: V3; U: V3 } => (i <= ringF ? { O: Ov.punkte[c / 2 + i]!, Sd: Sv.punkte[c / 2 + i]!, U: Uv.punkte[c / 2 + i]! } : { O: Oh.punkte[c / 2 + (R - 1 - i)]!, Sd: Sh.punkte[c / 2 + (R - 1 - i)]!, U: Uh.punkte[c / 2 + (R - 1 - i)]! });
  const ankerWelt: EinteilErgebnis['anker'] = [];
  for (let i = 0; i < R; i++) {
    const { O, Sd, U } = anker(i);
    ankerWelt.push({ O: W(O), S: W(Sd), U: W(U) });
    for (let j = 0; j < N; j++) {
      const rechtsSeite = j <= N / 2;
      const jj = rechtsSeite ? j : N - j;
      let q: V3;
      if (i === ringF && !opt.eben) {
        const t = jj <= c ? To.punkte[jj]! : Tu.punkte[jj - c]!;
        q = [t[0], t[1], rechtsSeite ? t[2] : -t[2]];
      } else q = jj <= c ? lage(O, Sd, U, false, jj / c, rechtsSeite) : lage(O, Sd, U, true, (jj - c) / c, rechtsSeite);
      setze(v.ringPunkt(i, j), q);
    }
  }
  type Kappe = 'vorn' | 'hinten';
  const kappenAnker = (s: Kappe, m: number) => (s === 'vorn' ? { O: Ov.punkte[m]!, Sd: Sv.punkte[m]!, U: Uv.punkte[m]! } : { O: Oh.punkte[m]!, Sd: Sh.punkte[m]!, U: Uh.punkte[m]! });
  const kappenLage = (s: Kappe, m: number, p: number, q: number): V3 => {
    const { O, Sd, U } = kappenAnker(s, m);
    const untenHalb = q < 0;
    const ap = Math.abs(p);
    const aq = Math.abs(q);
    let ee: number;
    if (!untenHalb) ee = aq === m ? ap : m + (m - aq);
    else ee = ap === m ? aq : m + (m - ap);
    return lage(O, Sd, U, untenHalb, ee / (2 * m), p >= 0);
  };
  for (const s of ['vorn', 'hinten'] as const) {
    setze(s === 'vorn' ? v.naht.spitzeVorn : v.naht.spitzeHinten, s === 'vorn' ? vorn : hinten);
    for (let a = 1; a < c; a++) {
      for (let b = 1; b < c; b++) {
        const p = a - c / 2;
        const q = b - c / 2;
        const m = Math.max(Math.abs(p), Math.abs(q));
        if (m === 0) continue;
        setze(v.kappe(s, a, b), kappenLage(s, m, p, q));
      }
    }
  }
  // ---- Schleifenpunkte und Silhouettenbedingungen (Umrissnormale in der Blattebene der Schleife, Welt) ----
  const naht = new Set<number>();
  const reihe: Band[] = [];
  const ringB: Band[] = [];
  const tangente = (ta: number, tb: number): V3 => [ziele[3 * tb]! - ziele[3 * ta]!, ziele[3 * tb + 1]! - ziele[3 * ta + 1]!, ziele[3 * tb + 2]! - ziele[3 * ta + 2]!];
  const normale = (t: V3, ebene: 'reihe' | 'ring'): V3 | null => {
    const tk = K(t);
    const wk: V3 = ebene === 'reihe' ? [tk[2], 0, -tk[0]] : [0, tk[2], -tk[1]];
    const l = Math.hypot(wk[0], wk[1], wk[2]);
    if (!(l > 1e-12)) return null;
    return W([wk[0] / l, wk[1] / l, wk[2] / l]);
  };
  const band = (liste: Band[], p: number, quer: [number, number], t: V3, ebene: 'reihe' | 'ring') => {
    const w = normale(t, ebene);
    if (w) liste.push({ p, quer, w });
  };
  for (let i = 0; i < R; i++) {
    naht.add(v.ringPunkt(i, 0));
    naht.add(v.ringPunkt(i, N / 2));
    for (const j of [c, 3 * c]) {
      const p = v.ringPunkt(i, j);
      const ta = i > 0 ? v.ringPunkt(i - 1, j) : v.kappe('vorn', j === c ? c - 1 : 1, c / 2);
      const tb = i < R - 1 ? v.ringPunkt(i + 1, j) : v.kappe('hinten', j === c ? c - 1 : 1, c / 2);
      band(reihe, p, [v.ringPunkt(i, j - 1), v.ringPunkt(i, j + 1)], tangente(ta, tb), 'reihe');
    }
  }
  for (let j = 0; j < N; j++) {
    if (j === 0 || j === N / 2) continue;
    band(ringB, v.ringPunkt(ringF, j), [v.ringPunkt(ringF - 1, j), v.ringPunkt(ringF + 1, j)], tangente(v.ringPunkt(ringF, j - 1), v.ringPunkt(ringF, j + 1)), 'ring');
  }
  for (const s of ['vorn', 'hinten'] as const) {
    naht.add(s === 'vorn' ? v.naht.spitzeVorn : v.naht.spitzeHinten);
    for (let m = 1; m < c / 2; m++) {
      naht.add(v.kappe(s, c / 2, c / 2 + m));
      naht.add(v.kappe(s, c / 2, c / 2 - m));
      for (const vz of [1, -1]) {
        const p = v.kappe(s, c / 2 + vz * m, c / 2);
        band(reihe, p, [v.kappe(s, c / 2 + vz * m, c / 2 - 1), v.kappe(s, c / 2 + vz * m, c / 2 + 1)], tangente(v.kappe(s, c / 2 + vz * (m - 1), c / 2), v.kappe(s, c / 2 + vz * (m + 1), c / 2)), 'reihe');
      }
    }
  }
  // ---- Falten: Ringe (Ecken der Seite und der Reihenschleife), Reihen (Ecken der Ringschleife), Spitzen ----
  const faltenRinge = new Map<number, Set<FalteSeite>>();
  const faltenKappen = new Map<string, Set<FalteSeite>>();
  const merke = (schritt: number, s: Kappe, seite: FalteSeite) => {
    if (schritt >= c / 2) {
      const i = s === 'vorn' ? schritt - c / 2 : R - 1 - (schritt - c / 2);
      if (!faltenRinge.has(i)) faltenRinge.set(i, new Set());
      faltenRinge.get(i)!.add(seite);
    } else if (schritt > 0) {
      const key = `${s}:${schritt}`;
      if (!faltenKappen.has(key)) faltenKappen.set(key, new Set());
      faltenKappen.get(key)!.add(seite);
    }
  };
  for (const s of nurEcken(Ov, eV[0]!)) merke(s, 'vorn', 'oben');
  for (const s of nurEcken(Uv, eV[2]!)) merke(s, 'vorn', 'unten');
  for (const s of Sv.schritte) merke(s, 'vorn', 'seite');
  for (const s of nurEcken(Oh, eH[0]!)) merke(s, 'hinten', 'oben');
  for (const s of nurEcken(Uh, eH[2]!)) merke(s, 'hinten', 'unten');
  for (const s of Sh.schritte) merke(s, 'hinten', 'seite');
  const reihenFalten: number[] = [...To.schritte, ...Tu.schritte.map((s) => c + s)];
  void umgekehrt;
  return {
    ziele,
    naht: [...naht],
    reihe,
    ringB,
    faltenRinge,
    faltenKappen,
    reihenFalten,
    spitzen,
    ringF,
    schritte: { vorn: Ev, hinten: Eh },
    bogen: { vorn: Lv.map((x) => x * PX) as [number, number, number], hinten: Lh.map((x) => x * PX) as [number, number, number] },
    kreuzungen: { vorn: W(vorn), hinten: W(hinten), oben: W(oben), unten: W(unten), rechts: W(rechts) },
    dichte: { vorn: phiV, hinten: phiH, oben: phiO, unten: phiU },
    lagen,
    vorlage: { oben: vo.map((t) => ({ u: t.u, v: t.v })), unten: vu.map((t) => ({ u: t.u, v: t.v })), seite: Math.abs(oben[1] - unten[1]) > 1e-12 ? (rechts[1] - unten[1]) / (oben[1] - unten[1]) : 0.5 },
    anker: ankerWelt,
    schrittVonRing,
    ringVonSchritt: ringVon,
  };
}

/** Falten eines Einteil-Ergebnisses auf den Käfig (Röhren-Topologie) setzen: Kantenschärfe und Punktschärfe, dazu die Ecken-Liste. */
export function faltenAnwenden(k: Kaefig, v: Roehre, erg: Pick<EinteilErgebnis, 'faltenRinge' | 'faltenKappen' | 'reihenFalten' | 'spitzen'>, schaerfe: number, eSchaerfe: Float64Array, vSchaerfe: Float64Array): Ecke[] {
  const { R, N, c } = v;
  const seiteVon = (set: Set<FalteSeite>): 'oben' | 'unten' | 'beide' => (set.has('oben') && set.has('unten') ? 'beide' : set.has('oben') ? 'oben' : set.has('unten') ? 'unten' : 'beide');
  const gewichtBei = (set: Set<FalteSeite>, theta: number) => {
    let g = 0;
    for (const s of set) g = Math.max(g, faltenGewicht(theta, s));
    if (set.has('oben') && set.has('unten')) g = 1;
    return g;
  };
  const ecken: Ecke[] = [];
  for (const [i, set] of erg.faltenRinge) {
    ecken.push({ ring: i, seite: seiteVon(set) });
    for (let j = 0; j < N; j++) {
      const e = kanteZwischen(k, v.ringPunkt(i, j), v.ringPunkt(i, j + 1));
      const g = gewichtBei(set, (2 * Math.PI * (j + 0.5)) / N);
      if (e >= 0 && g > 0) eSchaerfe[e] = Math.max(eSchaerfe[e]!, schaerfe * g * g);
    }
  }
  for (const [key, set] of erg.faltenKappen) {
    const [s, ms] = key.split(':') as ['vorn' | 'hinten', string];
    const m = Number(ms);
    const pts: { a: number; b: number }[] = [];
    for (let e = 0; e < 8 * m; e++) {
      const t = e % (2 * m);
      const q4 = Math.floor(e / (2 * m));
      let p: number;
      let q: number;
      if (q4 === 0) [p, q] = t <= m ? [t, m] : [m, 2 * m - t];
      else if (q4 === 1) [p, q] = t <= m ? [m, -t] : [2 * m - t, -m];
      else if (q4 === 2) [p, q] = t <= m ? [-t, -m] : [-m, -(2 * m - t)];
      else [p, q] = t <= m ? [-m, t] : [-(2 * m - t), m];
      pts.push({ a: c / 2 + p, b: c / 2 + q });
    }
    for (let e = 0; e < pts.length; e++) {
      const p0 = pts[e]!;
      const p1 = pts[(e + 1) % pts.length]!;
      const ka = kanteZwischen(k, v.kappe(s, p0.a, p0.b), v.kappe(s, p1.a, p1.b));
      const theta = Math.atan2((p0.a + p1.a) / 2 - c / 2, (p0.b + p1.b) / 2 - c / 2);
      const g = gewichtBei(set, theta);
      if (ka >= 0 && g > 0) eSchaerfe[ka] = Math.max(eSchaerfe[ka]!, schaerfe * g * g);
    }
  }
  for (const j0 of erg.reihenFalten) {
    for (const jj of [j0, N - j0]) {
      for (let i = 0; i + 1 < R; i++) {
        const e = kanteZwischen(k, v.ringPunkt(i, jj), v.ringPunkt(i + 1, jj));
        if (e >= 0) eSchaerfe[e] = schaerfe;
      }
      const diag = jj === c / 2 ? [1, 1] : jj === 3 * (c / 2) ? [1, -1] : jj === N - c / 2 ? [-1, 1] : jj === N - 3 * (c / 2) ? [-1, -1] : null;
      if (!diag) continue;
      for (const s of ['vorn', 'hinten'] as const) {
        for (let t = 0; t < c / 2; t++) {
          const e = kanteZwischen(k, v.kappe(s, c / 2 + diag[0]! * t, c / 2 + diag[1]! * t), v.kappe(s, c / 2 + diag[0]! * (t + 1), c / 2 + diag[1]! * (t + 1)));
          if (e >= 0) eSchaerfe[e] = schaerfe;
        }
      }
    }
  }
  for (const s of erg.spitzen) vSchaerfe[s === 'vorn' ? v.naht.spitzeVorn : v.naht.spitzeHinten] = schaerfe;
  return ecken;
}

export type LoeseEingabe = {
  k: Kaefig;
  u: Unterteilung;
  /** Ziele (Welt, 3 je Käfigpunkt) */
  ziele: Float64Array;
  /** 1 = hart (Schleifen- und Faltenpunkt), sonst weich auf der Vorlage */
  hart: Uint8Array;
  baender: readonly Band[];
  /** innere Kappenpunkte (Glättung × fairKappe): Index, ab dem alle Punkte Kappe sind, oder eine Maske je Punkt */
  kappe: number | Uint8Array;
  /** Punkte, an denen die Glättung absolut wirkt (Ziel 0 statt der Vorlage): die Naht zwischen Rumpf und Kind wird so zur Kehle statt zur Falte */
  glattAbsolut?: Uint8Array;
  opt: Required<KaefigOptionen>;
};

/** Ein Löser über 3n Koordinaten: harte Punkte auf ihren Grenzlagen, Silhouettenbedingungen, Inneres weich, Glättung der Abweichung. */
export function kaefigLoesen(e: LoeseEingabe): { xyz: Float64Array; fein: Float64Array; huelle: number; ms: number } {
  const t0 = jetzt();
  const { k, u, ziele, hart, opt } = e;
  const n = k.n;
  const nachK = kaefigNachbarlisten(k);
  const nach3: number[][] = Array.from({ length: 3 * n }, () => []);
  for (let i = 0; i < n; i++) {
    for (let a = 0; a < 3; a++) {
      const l = nach3[3 * i + a]!;
      for (let b = 0; b < 3; b++) if (b !== a) l.push(3 * i + b);
      for (const j of nachK[i] ?? []) for (let b = 0; b < 3; b++) l.push(3 * j + b);
    }
  }
  const zeilen: NormalZeile[] = [];
  const rhsZiel: number[] = [];
  const achsZeile = (index: ArrayLike<number>, wert: ArrayLike<number>, achse3: 0 | 1 | 2, gewicht: number, ziel: number) => {
    const idx = new Array<number>(index.length);
    for (let t = 0; t < index.length; t++) idx[t] = 3 * index[t]! + achse3;
    zeilen.push({ index: idx, wert, gewicht });
    rhsZiel.push(ziel);
  };
  const dotZeile = (index: ArrayLike<number>, wert: ArrayLike<number>, w: V3, gewicht: number, ziel: number) => {
    const idx: number[] = [];
    const wt: number[] = [];
    for (let t = 0; t < index.length; t++) {
      for (let a = 0; a < 3; a++) {
        if (Math.abs(w[a]!) < 1e-12) continue;
        idx.push(3 * index[t]! + a);
        wt.push(wert[t]! * w[a]!);
      }
    }
    zeilen.push({ index: idx, wert: wt, gewicht });
    rhsZiel.push(ziel);
  };
  for (let i = 0; i < n; i++) {
    const z = grenzZeile(u.grenze, i, n);
    const g = hart[i] ? opt.gewicht : opt.innen;
    for (let a = 0; a < 3; a++) achsZeile(z.index, z.wert, a as 0 | 1 | 2, g, ziele[3 * i + a]!);
  }
  for (const b of e.baender) {
    const d = grenzDifferenz(u.grenze, b.quer[1], b.quer[0], n);
    dotZeile(d.index, d.wert, b.w, opt.tangente, 0);
  }
  if (opt.fair > 0) {
    // wie `glaettemassFuer` (Stufe 2, Laplace), die Kappen-Maske je Zeile (eine Zeile mit Kappenpunkt wiegt × fairKappe)
    const s = Math.min(2, u.stufen.length);
    let M = u.stufen[0]!.matrix;
    for (let i = 1; i < s; i++) M = multiplizieren(u.stufen[i]!.matrix, M);
    const istKappe = typeof e.kappe === 'number' ? (j: number) => j >= (e.kappe as number) : (j: number) => (e.kappe as Uint8Array)[j] === 1;
    const absolut = e.glattAbsolut;
    for (const z of glaettungsZeilen(u.stufen[s - 1]!.kaefig, M, k.n, opt.fair)) {
      let kappeDrin = false;
      let absolutDrin = false;
      for (let q = 0; q < z.index.length; q++) {
        if (istKappe(z.index[q]!)) kappeDrin = true;
        if (absolut && absolut[z.index[q]!] === 1) absolutDrin = true;
      }
      const g = opt.fairKappe && opt.fairKappe !== 1 && kappeDrin ? z.gewicht * opt.fairKappe : z.gewicht;
      for (let a = 0; a < 3; a++) {
        let lt = 0;
        if (!absolutDrin) for (let q = 0; q < z.index.length; q++) lt += z.wert[q]! * ziele[3 * z.index[q]! + a]!;
        achsZeile(z.index, z.wert, a as 0 | 1 | 2, g, lt);
      }
    }
  }
  let sys;
  try {
    sys = normalSystem(3 * n, zeilen, nach3);
  } catch {
    let spur = 0;
    for (const z of zeilen) for (let t = 0; t < z.index.length; t++) spur += z.gewicht * z.wert[t]! * z.wert[t]!;
    sys = normalSystem(3 * n, zeilen, nach3, Math.max(1e-12, (1e-9 * spur) / Math.max(1, 3 * n)));
  }
  const rhs = new Float64Array(3 * n);
  zeilen.forEach((z, q) => {
    const g = z.gewicht * rhsZiel[q]!;
    if (!g) return;
    for (let t = 0; t < z.index.length; t++) rhs[z.index[t]!]! += z.wert[t]! * g;
  });
  const xyz = sys.loesenSpalte(rhs);
  const fein = anwenden3(u.grenze, xyz);
  return { xyz, fein, huelle: sys.huelle, ms: jetzt() - t0 };
}

/** Maße nach dem Lösen: Rest an harten Punkten, Abweichung im Innern, Silhouettenwinkel, Überstand, Kippung. */
export function kaefigMasse(k: Kaefig, fein: Float64Array, ziele: Float64Array, hart: Uint8Array, baender: readonly Band[], breiten: Ableitung['breiten'], ringe: { R: number; N: number; ringPunkt: (i: number, j: number) => number; K: (p: V3) => V3 } | null): Pick<KaefigBericht, 'rest' | 'innen' | 'silhouette' | 'ueberstand' | 'kippung'> {
  const n = k.n;
  let restMax = 0;
  let restSum = 0;
  let restZahl = 0;
  let innenMax = 0;
  let innenSum = 0;
  let innenZahl = 0;
  for (let i = 0; i < n; i++) {
    const d = Math.hypot(fein[3 * i]! - ziele[3 * i]!, fein[3 * i + 1]! - ziele[3 * i + 1]!, fein[3 * i + 2]! - ziele[3 * i + 2]!) * PX;
    if (hart[i]) {
      restMax = Math.max(restMax, d);
      restSum += d;
      restZahl++;
    } else {
      innenMax = Math.max(innenMax, d);
      innenSum += d;
      innenZahl++;
    }
  }
  let silhouette = 0;
  for (const b of baender) {
    const d: V3 = [fein[3 * b.quer[1]]! - fein[3 * b.quer[0]]!, fein[3 * b.quer[1] + 1]! - fein[3 * b.quer[0] + 1]!, fein[3 * b.quer[1] + 2]! - fein[3 * b.quer[0] + 2]!];
    const ld = Math.hypot(d[0], d[1], d[2]);
    if (!(ld > 1e-12)) continue;
    silhouette = Math.max(silhouette, (Math.asin(Math.min(1, Math.abs(d[0] * b.w[0] + d[1] * b.w[1] + d[2] * b.w[2]) / ld)) * 180) / Math.PI);
  }
  const nF = fein.length / 3;
  let xMin = Infinity;
  let xMax = -Infinity;
  let yMin = Infinity;
  let yMax = -Infinity;
  for (let p = 0; p < nF; p++) {
    xMin = Math.min(xMin, fein[3 * p]!);
    xMax = Math.max(xMax, fein[3 * p]!);
    yMin = Math.min(yMin, fein[3 * p + 1]!);
    yMax = Math.max(yMax, fein[3 * p + 1]!);
  }
  const rand = 3 / PX;
  let ueF = 0;
  let ueT = 0;
  for (let p = 0; p < nF; p++) {
    const x = fein[3 * p]!;
    const y = fein[3 * p + 1]!;
    const z = Math.abs(fein[3 * p + 2]!);
    if (y > yMin + rand && y < yMax - rand) {
      const f = breiten.front(y);
      if (f > 0 && z > f) ueF = Math.max(ueF, z - f);
    }
    if (x > xMin + rand && x < xMax - rand) {
      const t = breiten.top(x);
      if (t > 0 && z > t) ueT = Math.max(ueT, z - t);
    }
  }
  let kippung = 0;
  if (ringe) {
    for (let i = 0; i < ringe.R; i++) {
      let lo = Infinity;
      let hi = -Infinity;
      for (let j = 0; j < ringe.N; j++) {
        const q = ringe.K([ziele[3 * ringe.ringPunkt(i, j)]!, ziele[3 * ringe.ringPunkt(i, j) + 1]!, ziele[3 * ringe.ringPunkt(i, j) + 2]!]);
        lo = Math.min(lo, q[0]);
        hi = Math.max(hi, q[0]);
      }
      kippung = Math.max(kippung, hi - lo);
    }
  }
  return { rest: { max: restMax, mittel: restZahl ? restSum / restZahl : 0 }, innen: { max: innenMax, mittel: innenZahl ? innenSum / innenZahl : 0 }, silhouette, ueberstand: { front: ueF * PX, top: ueT * PX }, kippung: kippung * PX };
}

export function leer(abl: Ableitung, grund: string, t0: number, achse: KaefigAchse = 'x'): { abl: Ableitung; bericht: KaefigBericht } {
  return {
    abl,
    bericht: { ok: false, grund, achse, ringF: -1, schritte: { vorn: 0, hinten: 0 }, bogen: { vorn: [0, 0, 0], hinten: [0, 0, 0] }, kreuzungen: { vorn: [0, 0, 0], hinten: [0, 0, 0], oben: [0, 0, 0], unten: [0, 0, 0], rechts: [0, 0, 0] }, punkte: { naht: 0, reihe: 0, ring: 0 }, rest: { max: 0, mittel: 0 }, silhouette: 0, innen: { max: 0, mittel: 0 }, ueberstand: { front: 0, top: 0 }, kippung: 0, falten: { ringe: [], kappen: 0, reihen: [], spitzen: [] }, dichte: { vorn: [], hinten: [], oben: [], unten: [] }, unbekannte: 0, huelle: 0, ms: jetzt() - t0, msUnterteilung: 0, msLoeser: 0 },
  };
}
