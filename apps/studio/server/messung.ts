// Weg der Messseite (Plan 4.9, 8.2): Die Seite schickt ihr Ergebnis an ihren Server, der es als Datei ins Repo legt.
//
//   PUT /__studio/messung/<datei>   Körper: das Ergebnis als JSON-Text
//   → 204                           geschrieben nach docs/progress/studio/tempo/<datei>.json (vom Wurzelordner des Arbeitsbaums)
//   → 400                           Name nicht nach MESSUNG_DATEI oder kein JSON
//   → 403                           nicht von der eigenen Seite (Origin)
//   → 405                           andere Methode
//
// Die Signatur steht seit M0; den Weg baut M2.4 (dort auch der Rückfall „Kopieren“ der Seite). Der Weg läuft im
// Entwicklungsserver und im festen Stand (configureServer und configurePreviewServer), weil Florian auf 5217 misst.
import type { Plugin } from 'vite';

/** Anfang des Wegs */
export const MESSUNG_WEG = '/__studio/messung/';
/** Zielordner, relativ zum Wurzelordner des Arbeitsbaums */
export const MESSUNG_ORDNER = 'docs/progress/studio/tempo';
/** Erlaubte Dateinamen ohne Endung, etwa `2026-11-24-iphone16-safari` (8.2: `<datum>-<gerät>-<safari|app>`) */
export const MESSUNG_DATEI = /^[a-z0-9][a-z0-9-]{0,79}$/;

export interface MessungOptionen {
  /** Wurzelordner des Arbeitsbaums, absolut */
  wurzel: string;
}

/** Vite-Plugin des Wegs `PUT /__studio/messung/<datei>`. M0: noch ohne Weg (das Plugin tut nichts). */
export function messungWeg(_o: MessungOptionen): Plugin {
  return { name: 'studio-messung' };
}
