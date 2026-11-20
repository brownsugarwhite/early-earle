// Vertrag: die Welt hinter `WeltAdapter` (Plan 4.5; Konzept 6). Erfüllt von `studio-welt` (Box2D 3.2) und von `vertrag/weltAttrappe.ts`
// (einfach, ohne Reibung, für Tests). Dieselbe Testreihe läuft gegen beide (M2.1). Die Festlegungen hier gelten für beide gleich.
//
// Einheiten: Die Welt rechnet in L (Körperlänge), wie Box2D in Metern; y zeigt nach unten wie überall in Studio. Winkel in Grad,
// Winkeltempo in Grad/s (3.2; der Adapter rechnet innen in Bogenmaß). Eine Lage dreht einen Punkt (lx, ly) des Körpers nach
// (x + cos w · lx − sin w · ly, y + sin w · lx + cos w · ly). Massen in Masseeinheiten, Kräfte in Masse · L/s², Momente in
// Masse · L²/s².
//
// Nummern: Körper, Hüllen, Gelenke und Zonen bekommen je ihre eigene Nummer 0, 1, 2 … in der Reihenfolge des Anlegens; sie werden in
// einer Welt nie wieder vergeben (erst `neu` fängt bei 0 an). Ein Aufruf mit einer ungültigen Nummer wirft einen RangeError.
//
// Was nur für den nächsten `schritt` gilt (danach gelöscht): `kraftpaar` und `federbein` (der Baustein gibt sie je Takt oder
// Teilschritt neu an), `fuehren` (setzt das Tempo; das Tempo bleibt danach wie in Box2D). Was bleibt: Körper, Hüllen, Gelenke, Zonen,
// Zielwerte aus `zielSetzen` und der Griff des Fingers bis zum Loslassen.
//
// Ketten sind einseitig wie in Box2D. Ein Kettenstück von a nach b hat seine Vorderseite dort, wo
// kreuz(p − a, b − a) = (p − a).x · (b − a).y − (p − a).y · (b − a).x > 0 ist; seine Normale ist ((b − a).y, −(b − a).x) / |b − a|.
// Auf dem Bildschirm (y nach unten) liegt sie links der Laufrichtung: Eine Kette von links nach rechts ist von oben fest, eine
// geschlossene Kette, die auf dem Bildschirm im Uhrzeigersinn läuft, von außen. So muss der Hügel laufen, damit Ozzy auf ihm steht.
// Ein Strahl (auch der eines Federbeins) trifft ein Kettenstück nur, wenn er nicht dahinter beginnt (kreuz(von − a, b − a) ≥ 0); eine
// Hülle stößt mit ihm nur, wenn ihr Mittelpunkt nicht dahinter liegt (Kreis: Mitte, Kapsel: Mitte der Strecke, Vieleck: Schwerpunkt),
// ebenso die kontinuierliche Kollision (`schnell`). Nahe einer Ecke der Kette nimmt Box2D die Nachbarstücke dazu; dort ist nicht
// festgelegt, welches Stück stößt, und die gemeinsame Testreihe prüft nur Fälle fern von Ecken. (Nachgeprüft am 20.11. mit
// box2d3-wasm 6.0.0: b2World_CastRayClosest trifft eine Kette von links nach rechts nur von oben; eine Kugel, die von unten kommt,
// geht durch sie hindurch, eine von oben bleibt liegen.)
//
// Ergänzungen M0 gegenüber Plan 4.5 (die Integration trägt sie dort und im Auftrag von M2.1 nach): `fuehren`; `zielSetzen` mit
// Höchstkraft und Feder; `federbein` mit `anteil`; `WeltPuffer.beine` und `beinZahl`; die Feldbreiten unten; `VIELECK_PUNKTE`; Ketten
// einseitig (oben); Schleifen mit mindestens drei Punkten.
//
// Feldbreiten in anderen Paketen: Die Konstanten unten sind Werte mit Literaltyp (nie `: number` davorschreiben). `studio-welt` darf die
// Laufzeit nur mit `import type` nehmen (Plan 2.1) und führt sie als Kopie, die tsc prüft:
//   import type { KONTAKT_FELDER } from '@ee/studio-laufzeit/vertrag/welt';
//   const KONTAKT: typeof KONTAKT_FELDER = 11;   // ein anderer Wert ist ein Typfehler
// `feldbreiten.test.ts` hält diese Form fest.
import type { Huelle } from '@ee/studio-format/typen/physik';
import type { Punkt } from '@ee/studio-format/typen/grund';

export type { Huelle } from '@ee/studio-format/typen/physik';   // liegt im Format (3.2), weil das Körpermodell sie nennt

/** fest: statisch; beweglich: dynamisch; gefuehrt: kinematisch, bewegt nur über `fuehren` (kein Schwerkraft-, Kraft- oder Stoßeinfluss) */
export type KoerperArt = 'fest' | 'beweglich' | 'gefuehrt';
/** Lage des Ursprungs eines Körpers; w in Grad */
export interface Lage { x: number; y: number; w: number }
/** Masse von Hand (statt aus den Hüllen): `traegheit` um den Schwerpunkt, `schwerpunkt` im Körper (lokal) */
export interface Masse { masse: number; traegheit: number; schwerpunkt: Punkt }
/** Stoff einer Hülle; `dichte` in Masse je L² (Hüllen ohne Fläche wie Ketten haben keine Masse) */
export interface StoffWerte { haftung: number; abprall: number; rollwiderstand: number; dichte: number }
/** Feder in der Zeitsprache der Welt: Frequenz f in Hz, Dämpfungsgrad ζ (1 = kritisch); aus `Feder` mit f = 1/dauer, ζ = 1 − federung */
export interface FederMass { f: number; zeta: number }

/** Felder je Körper in `WeltPuffer.lagen`: x, y des Ursprungs, w (Grad, in (−180, 180] wie bei Box2D; wer Umdrehungen zählt, summiert
 *  die Änderungen) */
export const LAGE_FELDER = 3;
/** Felder je Körper in `WeltPuffer.tempi`: vx, vy (Tempo des Ursprungs, nicht des Schwerpunkts), ω (Grad/s) */
export const TEMPO_FELDER = 3;
/**
 * Felder je Kontakt in `WeltPuffer.kontakte`, ein Eintrag je Paar sich berührender Hüllen (Hülle A < Hülle B), aufsteigend nach
 * (A, B): 0 Körper von A, 1 Körper von B, 2 Hülle A, 3 Hülle B, 4 x, 5 y (Mitte der Berührung), 6 nx, 7 ny (Normale von A nach B),
 * 8 Annäherungstempo längs der Normale beim Beginn (L/s, sonst 0), 9 Normalimpuls dieses Schritts (Summe der Teilschritte),
 * 10 Art: 1 begonnen, 0 dauert an, −1 beendet (dann sind 4 bis 9 null). Berührt heißt: Abstand der Hüllen unter 0,005 L.
 */
export const KONTAKT_FELDER = 11;
/** Felder je Eintrag in `WeltPuffer.zonen`, aufsteigend nach (Zone, Körper): 0 Zone, 1 Körper, 2 Art: 1 betreten, 0 drin, −1 verlassen */
export const ZONE_FELDER = 3;
/**
 * Felder je Federbein in `WeltPuffer.beine` (Nummer aus `federbein`, Stand am Ende des letzten Schritts): 0 getroffen (1 oder 0),
 * 1 Abstand von `von` bis zum Treffer längs der Richtung (ohne Treffer die Ruhelänge), 2 Normalkraft (≥ 0), 3 getroffener Körper
 * (−1: keiner), 4 x, 5 y (Treffer; ohne Treffer das Ende des Strahls)
 */
export const BEIN_FELDER = 6;
/** Felder, die `strahl` nach `aus` schreibt: 0 x, 1 y (Treffer), 2 nx, 3 ny (Normale zum Strahlanfang hin), 4 Anteil t in [0, 1] von
 *  `von` nach `nach`, 5 Körper, 6 Hülle */
export const STRAHL_FELDER = 7;
/** höchstens so viele Punkte je Vieleck (Box2D: B2_MAX_POLYGON_VERTICES; b2ComputeHull lehnt mehr ab, auch wenn die Hülle weniger
 *  Ecken hätte); mehr wirft in `huelle` und `zone` einen RangeError */
export const VIELECK_PUNKTE = 8;

/**
 * Puffer für `lesen`, vom Aufrufer einmal angelegt. `lagen` und `tempi` brauchen je Körper LAGE_FELDER und TEMPO_FELDER Zahlen
 * (sonst RangeError); entfernte Körper stehen dort als NaN. `kontakte`, `zonen` und `beine` bekommen höchstens so viele Einträge, wie
 * hineinpassen; `kontaktZahl`, `zonenZahl` und `beinZahl` sagen, wie viele geschrieben sind.
 */
export interface WeltPuffer {
  lagen: Float64Array; tempi: Float64Array; kontakte: Float64Array; kontaktZahl: number; zonen: Int32Array; zonenZahl: number;
  /** Ergänzung M0: Zustand der Federbeine des letzten Schritts (BEIN_FELDER je Bein); fehlt das Feld, schreibt `lesen` keine */
  beine?: Float64Array; beinZahl?: number;
}

export interface WeltAdapter {
  /** lädt den Rechner (Box2D als WebAssembly); die Attrappe ist sofort bereit */
  laden(): Promise<void>;
  /** leert die Welt und setzt die Schwerkraft (L/s², y nach unten); alle Nummern beginnen wieder bei 0 */
  neu(schwerkraft: Punkt): void;
  /** legt einen Körper an; ohne `masse` rechnet die Welt Masse, Schwerpunkt und Trägheit aus den Hüllen (`dichte`). Ein beweglicher
   *  Körper ohne Masse aus Hüllen hat die Masse 1 und dreht sich nicht. Ruhetempo 0. */
  koerper(art: KoerperArt, lage: Lage, masse?: Masse): number;
  /** schaltet einen Körper aus und an (Ragdoll); ausgeschaltet bewegt er sich nicht, stößt nicht, wird von keinem Strahl und keiner
   *  Zone gesehen, und seine Gelenke und Federbeine ruhen; sein Tempo bleibt erhalten */
  aktiv(k: number, an: boolean): void;
  /** entfernt einen Körper samt seinen Hüllen, Gelenken und Federbeinen; ein Finger an ihm lässt los */
  entfernen(k: number): void;
  /**
   * hängt eine Hülle an (Lage im Körper, lokal). Vielecke haben 3 bis VIELECK_PUNKTE Punkte, nicht alle auf einer Geraden (sonst
   * RangeError), und sind konvex (aus nicht konvexen Punkten wird die konvexe Hülle), mit `rundung` als Radius um die Kanten. Ketten
   * haben mindestens zwei Punkte, als Schleife mindestens drei, keine Masse und keine Dicke und sind einseitig (Kopf dieser Datei);
   * eine Kette stößt nicht mit einer Kette. `schnell`: kontinuierliche Kollision gegen feste und geführte Körper (Box2D: Bullet),
   * damit schnelle kleine Körper nicht durch dünne Wände fallen.
   */
  huelle(k: number, h: Huelle, s: StoffWerte, schnell?: boolean): number;
  /**
   * Scharnier an `punkt` (Welt, beim Anlegen; danach dreht der Ankerpunkt mit beiden Körpern). Gelenkwinkel = (w_b − w_a) minus
   * derselbe Unterschied beim Anlegen. `motor`: Zieltempo des Gelenkwinkels (Grad/s) mit Höchstmoment; Tempo 0 mit kleinem Moment ist
   * Lagerreibung. `grenzen`: [unten, oben] des Gelenkwinkels in Grad. Verbundene Körper stoßen nicht miteinander (für alle Gelenke).
   */
  scharnier(a: number, b: number, punkt: Punkt, motor?: { tempo: number; moment: number }, grenzen?: [number, number]): number;
  /**
   * Motor-Gelenk mit Ziel-Lage: Eine Feder `feder` zieht den Ursprung von b auf das Ziel im Rahmen von a und den Winkel w_b − w_a
   * auf den Zielwinkel (kürzester Weg). Die Federkraft ist auf `hoechstkraft` begrenzt, das Federmoment auf hoechstkraft · ρ mit
   * ρ = √(I_eff / m_eff) (Trägheitsradius der beiden Körper am Gelenk: 1/m_eff = 1/m_a + 1/m_b, 1/I_eff = 1/I_a + 1/I_b). Beim
   * Anlegen ist das Ziel die Lage, in der b gerade zu a steht. Höchstkraft 0: das Gelenk ruht (Loslassen, Spannung null).
   */
  ziel(a: number, b: number, feder: FederMass, hoechstkraft: number): number;   // Motor-Gelenk mit Ziel-Lage
  /** neues Ziel eines Motor-Gelenks: Ursprung von b im Rahmen von a (x, y) und Winkel w_b − w_a (Grad). Ergänzung M0: optional neue
   *  Höchstkraft und Feder (die Spannung ändert sich je Takt, 16 h). Ein Scharnier ist kein Motor-Gelenk (RangeError). */
  zielSetzen(gelenk: number, lage: Lage, hoechstkraft?: number, feder?: FederMass): void;
  /**
   * Der Finger des Spiels: Beim ersten Aufruf mit `an` greift er den beweglichen Körper, dessen Hülle `punkt` enthält (eine
   * geschlossene Kette enthält ihr Inneres; bei mehreren den mit der höchsten Nummer), an genau diesem Punkt. Solange `an` bleibt,
   * zieht eine Feder den gegriffenen Punkt zu `punkt`, mit höchstens `hoechstkraft`. Liegt beim Greifen kein Körper unter dem
   * Punkt, hält der Finger nichts, bis er neu ansetzt. `an: false` lässt los.
   */
  finger(an: boolean, punkt: Punkt, feder: FederMass, hoechstkraft: number): void;
  /**
   * Federbein für den nächsten Schritt (Pogo am Rad): Strahl je Teilschritt von `von` in `richtung` (beide in der Welt zum Zeitpunkt
   * des Aufrufs; danach drehen sie mit Körper k), so lang wie die Ruhelänge laenge + g/(2πf)² (g = Betrag der Schwerkraft). Der
   * Strahl sieht weder k noch Körper, die über ein Gelenk direkt mit k verbunden sind. Trifft er im Abstand d, drückt das Bein längs
   * der Normale am Treffer mit F = anteil · ((2πf)² · (Ruhelänge − d) − 2ζ · 2πf · u), nie negativ (u: Tempo, mit dem sich der
   * Beinpunkt vom Treffer entfernt), auf k am Beinpunkt und gegengleich auf den getroffenen Körper (Rückwirkung). So gilt beim
   * Gewichtsanteil genau `laenge` (Vorspannung, 4.5). Ergänzung M0: `anteil` (Masse, die das Bein trägt), ohne Angabe die Masse von
   * k geteilt durch die Zahl seiner Federbeine in diesem Schritt. Rückgabe: Nummer des Beins in diesem Schritt (0, 1, … in
   * Aufrufreihenfolge), unter der `lesen` seinen Zustand meldet.
   */
  federbein(k: number, von: Punkt, richtung: Punkt, laenge: number, feder: FederMass, anteil?: number): number;
  /** Kraft `kraft` auf a am Weltpunkt `punkt` und −kraft auf b am selben Punkt, im nächsten Schritt (alle Teilschritte); mehrere
   *  Aufrufe addieren sich */
  kraftpaar(a: number, b: number, punkt: Punkt, kraft: Punkt): void;   // Vortrieb mit Rückwirkung aufs Rad
  /** erster Treffer auf eine Hülle eines eingeschalteten Körpers zwischen `von` und `nach` (STRAHL_FELDER nach `aus`); eine Hülle, in
   *  der `von` liegt, zählt nicht; ein Kettenstück nur von vorn (Kopf dieser Datei); Zonen nie */
  strahl(von: Punkt, nach: Punkt, aus: Float64Array): boolean;
  /** feste Zone (Sensor) mit Hülle `h` an der Lage `lage` (Grenzen der Hüllen wie bei `huelle`); meldet bewegliche und geführte
   *  Körper, deren Hülle sie überlappt */
  zone(h: Huelle, lage: Lage): number;
  /** rechnet dt Sekunden in `teilschritte` gleichen Teilschritten; dt > 0, teilschritte ganz ≥ 1 */
  schritt(dt: number, teilschritte: number): void;
  /** Stand nach dem letzten Schritt, ein Aufruf je Takt (über die WebAssembly-Grenze) */
  lesen(aus: WeltPuffer): void;     // ein Aufruf über die WebAssembly-Grenze je Takt
  /** Prüfsumme des ganzen Zustands (Box2D: Zustands-Hash), ganz in [0, 2³²) */
  pruefsumme(): number;             // Zustands-Hash von Box2D, sonst über alle gelesenen Lagen und Tempi
  /** Schlüsselstand nur zwischen zwei Schritten; nach `zuruecksetzen` rechnet die Welt bitgleich weiter wie nach `merken`. Nummern,
   *  die nach dem Merken vergeben wurden, sind danach ungültig. Nie als Datei. */
  merken(): Uint8Array; zuruecksetzen(stand: Uint8Array): void;
  /** Ergänzung M0: führt einen Körper (vor allem `gefuehrt`) so, dass er am Ende des nächsten Schritts in `lage` steht (Box2D:
   *  b2Body_SetTargetTransform); dreht auf dem kürzeren Weg. Auf einen festen Körper wirkt es nicht. */
  fuehren(k: number, lage: Lage): void;
}
