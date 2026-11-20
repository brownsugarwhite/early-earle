// Knochen, Anheftung, Biegeachse und Aufhängung (Bauplan 3.2, Befund 17).
import type { Herkunft, Id, Punkt } from './grund';

export interface Knochen {
  id: Id<'kn'>; figur: Id<'fig'>; name: string;
  eltern?: Id<'kn'>;
  gelenk: Punkt;                         // Ruhelage in der Grundform
  winkel: Id<'rg'>;                      // Knochenwinkel gegen die Ruhe (Grad); bei Biegeachsen die Richtung der Sehne
  verschiebung?: [Id<'rg'>, Id<'rg'>];   // x, y im Eltern-Rahmen (Kopf am Hals)
  anheftung?: Anheftung;
  achse?: Biegeachse;
  rolle?: string;                        // 'ruecken', 'hals', 'kopf', 'bein.vorn.rechts', 'schwanz', 'ohr.a'
  gepinnt?: true;
  herkunft: Herkunft;
}
/** das Gelenk reitet auf der gemorphten Elternform: gewichtetes Mittel dieser Anker, starre MLS */
export interface Anheftung { teil: Id<'teil'>; anker: Id<'an'>[]; gewichte: number[] }
/** Bézier-Achse von der Wurzel zum Ende mit fester Länge (Port von rueckgratBauen); zugleich die IK */
export interface Biegeachse {
  laenge: number;
  abstand: Id<'rg'>;                     // Abstand Wurzel–Ende, höchstens laenge
  biegungWurzel: Id<'rg'>;               // Grad gegen die Sehne
  biegungEnde: Id<'rg'>;                 // Grad gegen die Sehne (Sohle)
  beugung: 1 | -1;
  boden: boolean;                        // das Ende geht nie unter den Boden
  rMin: number;                          // kleinster Krümmungsradius (Prototyp: halbe Beinbreite × FALTEN, haltung.ts:779)
}
/** Biegeachsen nehmen Gewichte in derselben Struktur wie gewichtete Teile (Befund 17): Die Achse wirkt am Anker als örtlicher
 *  Rahmen bei u (Lage auf der Achse plus Versatz quer, gedreht mit der Tangente; u ist abgeleitet: Projektion auf die Ruheachse,
 *  nie gespeichert), der Elternknochen starr. */
export interface Aufhaengung {
  id: Id<'af'>; teil: Id<'teil'>;
  art: 'starr' | 'achse' | 'gewichte';
  knochen: Id<'kn'>[];                   // starr: genau einer; achse: [Achse, Eltern]; gewichte: bis vier je Anker
  gewichte?: [knochen: number, gewicht: number][][];   // je Anker bis vier Paare (Index in knochen), Summe 1; bei 'achse'
                                                       // [[0, w], [1, 1 − w]] (w Anteil der Achse); fehlt: alle w = 1
  griffe?: (GriffSatz | 'erben')[];      // je Anker; 'erben': die Griffe folgen der Abbildung ihres Ankers (auch bei 'achse').
                                         // Im Bauplan 3.2 steht dafür null; die Marke hält 3.5 Nr. 4 („kein null“) ohne Ausnahme
  mischung: 'drehzentren' | 'linear';    // bei 'achse' wie bei Gewichten
  gepinnt: Id<'an'>[];
  herkunft: Herkunft;
}
/** glatter Anker: ein Satz für das Griffpaar; Ecke: je Griff einer */
export type GriffSatz =
  | { paar: [knochen: number, gewicht: number][] }
  | { ein: [knochen: number, gewicht: number][]; aus: [knochen: number, gewicht: number][] };
