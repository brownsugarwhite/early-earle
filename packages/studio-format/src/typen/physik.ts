// Physik-Chips, Hüllen und das Körpermodell einer Figur (Bauplan 3.2, Befund 6).
import type { ArtDaten, Feder, Herkunft, Id, Punkt } from './grund';

export interface PhysikChip {
  id: Id<'ch'>;
  an: Id<'teil'> | Id<'kn'> | Id<'rg'> | Id<'fig'> | Id<'di'>;
  art: string;     // 'schwingen' | 'kette' | 'stauchen' | 'ruhigHalten' | 'fest' | 'lose' | 'gelenk' | 'wasser' | 'teilchen' | 'gelee'
  aktiv: boolean;
  feder: Feder;
  ausgang?: Id<'rg'>;                    // Regler, in den die Feder schreibt
  mehr: { schwerkraft?: number; wind?: number; grenzen?: [number, number]; spitze?: number };
  daten: ArtDaten;
  herkunft: Herkunft;
}
/** Hülle für die Welt; liegt hier, weil das Körpermodell sie nennt; vertrag/welt.ts nimmt sie von hier */
export type Huelle =
  | { kreis: { mitte: Punkt; r: number } } | { kapsel: { a: Punkt; b: Punkt; r: number } }
  | { vieleck: { punkte: Punkt[]; rundung: number } } | { kette: { punkte: Punkt[]; schleife: boolean } };
/** Körpermodell einer Figur (Befund 6): ein Datensatz je Figur, nicht in den Daten eines Bausteins, weil eine Figur in vielen Szenen und
 *  Probe-Projekten steht. Bausteine (vierbeiner, schlaefer) nehmen es von der Figur ihres Dings; PhysikPlan.huellen je Figur daraus.
 *  Hüllen in Figur-Einheiten der Grundform; die Höchstkraft jedes Motor-Gelenks ist der Wert der Spannung (16 h). */
export interface Koerpermodell {
  id: Id<'km'>; figur: Id<'fig'>;
  koerper: { rolle: string;                              // 'rumpf.vorn', 'rumpf.hinten', 'kopf'
             knochen: Id<'kn'>; huelle: Huelle; masseAnteil: number;
             gelenk?: { an: string; punkt: Punkt; grenzen?: [number, number] };   // Motor-Gelenk zum Körper der Rolle `an`
             abweichung?: { regler: Id<'rg'>; groesse: 'winkel' | 'laengs' | 'quer' }[] }[];
  /** laenge: gezeichnete Länge; Vorspannung: beim Gewichtsanteil des Beins gilt genau sie (4.5) */
  federbeine: { rolle: string; koerper: string; achse: Id<'kn'>; von: Punkt; laenge: number; feder: Feder }[];
  glieder: { rolle: string; knochen: Id<'kn'>; huelle: Huelle; an: string; punkt: Punkt; grenzen?: [number, number] }[];   // nur im Sturz
  herkunft: Herkunft;
}
