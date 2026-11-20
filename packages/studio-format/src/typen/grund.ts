// Grundtypen des Formats v1 (Bauplan 3.2): Kennungen, Punkte, Herkunft, Zeitsprache, Werte und Daten der Arten.
// Einheiten: Längen in Figur-Einheiten (y nach unten), Winkel in Grad, Zeiten in Sekunden, Anteile von 0 bis 1.

export type Vorsilbe =
  | 'prj' | 'vl' | 'kl' | 'sf'                   // Projekt, Vorlage, Klang, Schrift
  | 'fig' | 'teil' | 'an' | 'gr'                 // Figur, Teil, Anker, Gruppe
  | 'rg' | 'bd' | 'sl' | 'we'                    // Regler, Bindung, Schlüssel, Wechsel
  | 'kn' | 'af' | 'km'                           // Knochen, Aufhängung, Körpermodell
  | 'sch' | 'po' | 'ue' | 'zy'                   // Schicht, Pose, Übergang, Zyklus
  | 'ch' | 'vb' | 'ef' | 'kc'                    // Physik-Chip, Verbindung, Effekt, Klang-Chip
  | 'welt' | 'sz' | 'di'                         // Welt, Szene, Ding
  | 'bs' | 'dr' | 're' | 'au';                   // Baustein, Draht, Regel, Aufgabe
export type Id<V extends Vorsilbe> = `${V}_${string}`;
export type Punkt = [x: number, y: number];
/** jeder Datensatztyp trägt sie (3.6 Nr. 9); Autorig und Skripte schreiben 'gebaut'; „automatik“ ist eine Quelle (4.1), keine Herkunft */
export type Herkunft = 'vorlage' | 'dein' | 'gebaut' | 'aufnahme';
export type Kurve = 'weich' | 'fallen' | 'auf' | 'linear' | 'feder';
/** Zeitsprache: innen f = 1/dauer, ζ = 1 − federung (Konzept 6.4) */
export interface Feder { dauer: number; federung: number; vorgriff?: number }
/** fest oder von einem Regler getrieben */
export type Wert = number | Id<'rg'>;
/** Daten einer registrierten Art; das Schema der Art prüft sie (arten/register.ts) */
export type ArtWert = number | string | boolean | number[] | string[] | { [k: string]: ArtWert };
export type ArtDaten = { [k: string]: ArtWert };
