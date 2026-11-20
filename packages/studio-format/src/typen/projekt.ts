// Projekt, Vorlagen und Klänge (Bauplan 3.2); sie liegen in projekt.json (3.1).
import type { Herkunft, Id } from './grund';

/** feldweise zusammengeführt, die einzige Ausnahme von „je Datensatz“ (3.6 Nr. 9): quellen und umgezogen schreibt nur die Übernahme
 *  (der Umzug, Quelle florian, nimmt die Quelle heraus und setzt umgezogen); figuren, szenen und uebergangen sind Mengen (jede Seite fügt
 *  hinzu, entfernt wird nur mit dem Löschen); fassungen schreibt nur der Editor; name und start nur Florian */
export interface Projekt {
  id: Id<'prj'>; name: string;
  figuren: string[];                     // Dateinamen unter figuren/ ohne Endung, sortiert
  szenen: string[];
  start?: Id<'sz'>;                      // Szene, die das Spiel zuerst lädt
  /** fremde Quellen bis zum Umzug (Befund 5): Datei relativ zum Arbeitsbaum, nur gelesen; ihre Schlüssel setzt der Server bei
   *  jedem Laden mit Herkunft 'dein' ein; die genannten Bindungen sind bis zum Umzug nur zum Ansehen */
  quellen?: { art: 'prototyp-schluessel'; datei: string; figur: Id<'fig'>; zuordnung: [teilName: string, bindung: Id<'bd'>][] }[];
  /** nach dem Umzug: diese Dateien sind umgezogen; jede spätere Übernahme lässt Quelle und Kopf aus (3.4, 6.2 Schritt 1) */
  umgezogen?: string[];
  /** verdrängte Fassungen bei zwei Geräten (F5): Kennung des Datensatzes, Gerät, Zeit (ISO), eigene Datei unter
   *  .sicherung/<projekt>/fassungen/ (nicht im Ring, 3.1); höchstens 50 */
  fassungen?: { id: string; geraet: string; zeit: string; sicherung: string }[];
  uebergangen?: string[];                // Prüfer-Hinweise, die Florian übergangen hat
  herkunft: Herkunft;
}
export interface Vorlage { id: Id<'vl'>; name: string; datei: string; hash: string; quelle?: string; herkunft: Herkunft }
export interface Klang {
  id: Id<'kl'>; name: string; dateien: string[];          // 'klaenge/<hash>.m4a', mehrere = Abwechslung
  lautstaerke: number; streuung: { ton: number; laut: number };   // Halbtöne, dB
  mindestabstand: number; stimmen: number;
  herkunft: Herkunft;
}
