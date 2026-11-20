// Formen, Versätze, Regler, Bindungen, Schlüssel und Wechsel (Bauplan 3.2). Anker sind keine Datensätze: Ihre Kennungen stehen in
// Teil.anker, und jede Form und jede VersatzZeile[] hat genau so viele Zeilen in derselben Reihenfolge.
import type { Feder, Herkunft, Id } from './grund';

/** glatt: Aus-Griff in Richtung w, Ein-Griff in Richtung w + 180° (Grad, absolut); Längen ≥ 0 */
export type AnkerGlatt = [x: number, y: number, w: number, lEin: number, lAus: number];
/** Ecke: jeder Griff mit eigener Richtung vom Anker aus (Grad, absolut) */
export type AnkerEcke = [x: number, y: number, wEin: number, lEin: number, wAus: number, lAus: number];
export type AnkerZeile = AnkerGlatt | AnkerEcke;
export type Form = AnkerZeile[];
/* Glatt im Bauplan (TeilPlan.glatt): ein Anker, der in allen Schlüsseln aller Bindungen seines Teils und in Teil.form glatt ist; sonst
 * wird jede glatte Zeile als Ecke mit wEin = w + 180° gemischt. „je Koordinate“ mischt immer je Griff wie formAusSchluesseln. Wird ein
 * Anker glatt gemacht (Glätte-Regel beim Einlesen, ⇧C), ist w die Richtung vom Ein-Griff zum Aus-Griff (längengewichtetes Mittel
 * beider Richtungen; ist ein Griff 0, die Richtung des anderen). Übernahme und Migrationen glätten nicht (3.4). */
/** Versatz im mitlaufenden Rahmen der gezeigten Form (ein Bezugsrahmen für alle Zusatzformen, vor den Knochen; Befund 12, 16 a).
 *  Für Anker i der gezeigten Form (nach Ansicht und Anheftung, vor Zusätzen): d = p(i+1) − p(i−1), zyklisch; an den Enden einer
 *  offenen Linie p1 − p0 bzw. pn − pn−1. τ = d/|d|, ν = (−τy, τx), L = |d|/2 (an Enden |d|); |d| < 1e-9 → L = 0. Ecken und glatte
 *  Anker gleich. Anwenden: p' = p + L·(laengs·τ + quer·ν); Griffwinkel w' = w + dw (Ecken je Griff); Grifflängen l' = max(0, l + dl·L).
 *  Alle Längenversätze (laengs, quer, dl) sind durch L geteilt gespeichert, Winkelversätze in Grad. */
export type VersatzGlatt = [laengs: number, quer: number, dw: number, dlEin: number, dlAus: number];
export type VersatzEcke = [laengs: number, quer: number, dwEin: number, dlEin: number, dwAus: number, dlAus: number];
export type VersatzZeile = VersatzGlatt | VersatzEcke;
export type Mischart = 'rahmenRest' | 'koordinaten' | 'linear';
export interface Regler {
  id: Id<'rg'>; besitzer: Id<'fig'> | Id<'sz'>; name: string;
  art: 'linie' | 'kreis';
  bereich: [number, number];             // Kreis: [0, 360]
  standard: number;                      // Ruhestelle
  einheit: 'grad' | 'anteil' | 'L' | 'L/s' | 's' | 'figur' | 'eins';   // 'figur': Länge in Figur-Einheiten wie in seinem SVG
                                         // (Knochen.verschiebung, Biegeachse.abstand); 'eins': Zahl ohne Einheit
  raster: number;                        // Fangraster der Leiste (Kopf 0,5; sonst Bereich/200)
  ausgleich: Feder;                      // Ausgleich bei Sprüngen des Solls
  hoechsttempo?: number;                 // Einheiten je Sekunde (Kopf 160)
  nachlauf?: number;                     // s, 0 bis 0,5, Standard 0: der Ausgleich nach einem Posenwechsel beginnt so viel später (16 b)
  spiegel?: Spiegelregel;
  rolle?: string;                        // 'kopf.theta', 'koerper.psi', 'knochen.winkel', 'pose.gewicht', 'zyklus.phase',
                                         // 'feder.ausgang', 'stauchung', 'spiel';
                                         // 'spannung' (0 bis 1, Standard 1), 'spannung.<rolle>' (multipliziert, für Knochen dieser
                                         // Rolle; 16 h); 'charakter.schwer', 'charakter.wabbelig', 'charakter.tollpatschig'
                                         // (−1 bis 1, Standard 0; 16 i)
  herkunft: Herkunft;
}
/** gespiegelte Hälfte: Kreisregler rechnen w mit ab < w < um, Linienregler w mit ab ≤ w < um als um − w gespiegelt */
export interface Spiegelregel {
  ab: number; um: number;                // Ozzy: θ 180, 360; ψ −90, 0
  achseX: number;                        // Spiegelachse in Figur-Einheiten
  paare: [Id<'teil'>, Id<'teil'>][];     // A ↔ B
  umnummern: { teil: Id<'teil'>; folge: number[] }[];   // Anker eines Teils, das sich selbst spiegelt (Nase)
  reihenfolgeTauschen: boolean;          // in der zweiten Hälfte tauschen Paare ihren Platz in der Malreihenfolge
  regler?: { regler: Id<'rg'>; um: number }[];   // in der gespiegelten Hälfte mitgespiegelt (Wert um − w); Ozzys ψ: θ um 360,
                                                 // Nicken und Kopf schief um 0 (Befund 8)
}
export interface Bindung {
  id: Id<'bd'>; teil: Id<'teil'>;
  achsen: [Id<'rg'>] | [Id<'rg'>, Id<'rg'>];   // zwei Achsen: Kreuzschlüssel oder Feld
  wirkung: 'ansicht' | 'zusatz';         // Gestalt ersetzen oder Versatz addieren
  mischart: Mischart;
  periodisch: boolean;                   // nur Kreisregler
  /** Listen je Bereich (Übernahme, 6.2 Nr. 5; Datei auf der gespiegelten Hälfte, 4.7). Wo Abschnitte liegen, wirkt die Spiegelregel nur
   *  auf Malreihenfolge, Wechsel und mitgespiegelte Regler, nie auf die Gestalt; ohne Abschnitte gilt sie als Ganzes */
  abschnitte?: BindungsAbschnitt[];
  spitzen?: Spitzenfuehrung[];
  herkunft: Herkunft;
}
export type BindungsAbschnitt =
  | { von: number; bis: number; art: 'liste'; liste: ListenEintrag[] }   // Einträge dürfen außerhalb [von, bis] liegen (Steigungen)
  | { von: number; bis: number; art: 'gespiegelt'; bindung: Id<'bd'>; um: number };   // Spiegel der Bindung bei um − w
/** Verweis statt Kopie: einen gespiegelten Eintrag rechnet der Bauplan aus dem genannten Schlüssel des Partners (gespiegelt und
 *  umnummeriert) */
export interface ListenEintrag { schluessel: Id<'sl'>; an: number; gespiegelt?: true }
/** ruht nach der Spitzenregel (4.4), gerechnet in form/spitzen.ts, nie gespeichert (Befund 13). gespiegelt: Spitzen und Regel der
 *  Partnerbindung im gespiegelten Bereich, Rahmen aus den gespiegelten Einträgen bei von und bis (Ozzy: 270° bis 315°,
 *  raster.ts:912–920) */
export interface Spitzenfuehrung { von: number; bis: number; anker: Id<'an'>[]; rahmenVon: Id<'sl'>; rahmenBis: Id<'sl'>; gespiegelt?: true }
export interface Schluessel {
  id: Id<'sl'>; bindung: Id<'bd'>;
  an: [number] | [number, number];       // Stelle auf den Achsen der Bindung
  art: 'form' | 'falte';
  gestalt?: Form;                        // Bindung mit Wirkung 'ansicht'
  versatz?: VersatzZeile[];              // Bindung mit Wirkung 'zusatz'
  herkunft: Herkunft;
  grund?: string;                        // wozu der Schlüssel da ist (Statuszeile, Leiste)
  vorlage?: Id<'vl'>;                    // Herkunft 'vorlage'
  stuetze?: true;                        // formt nur die Steigung (Anschluss aus der Übernahme), steht nicht auf der Leiste
}
export interface Wechsel {
  id: Id<'we'>; figur: Id<'fig'>;
  regler: Id<'rg'>; an: number; richtung: 'ab' | 'bis';   // gilt für Werte ≥ an ('ab') oder ≤ an ('bis')
  breite: number;                        // 0 = hart; sonst weiche Deckung über so viele Einheiten des Reglers
  art: 'ueber' | 'unter' | 'sichtbar' | 'unsichtbar';
  teil: Id<'teil'>;
  bezug?: Id<'teil'>;                    // 'ueber', 'unter': direkt über oder unter diesem Teil
  herkunft: Herkunft;
}
// Teile tauschen sind zwei Wechsel an derselben Stelle mit derselben Breite, einer 'unsichtbar', einer 'sichtbar' (16 l)
