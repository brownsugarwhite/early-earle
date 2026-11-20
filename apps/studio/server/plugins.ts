// Server-Erweiterungen beider Apps, zusammengesetzt (Plan 2.4, 4.9). Zusammenbau-Datei: Nur die Integration ändert sie.
// `apps/studio/vite.config.ts` nimmt studioPlugins(), `apps/ozzy-spiel/vite.config.ts` nur spielPlugins(); das ist die einzige
// erlaubte Verbindung zwischen den beiden Apps und läuft nur im Server, nie im Code des Spiels (2.3 Nr. 4).
// Jedes Plugin hängt sich mit configureServer und configurePreviewServer ein, damit es im festen Stand (5217, 5261) genauso läuft.
//
// M0 setzt beide leer zusammen. Eingehängt werden:
// - nach M1 Welle A (Ablage aus M1.6): in studioPlugins die Ablage aus @ee/studio-ablage/plugin mit Revision und If-Match,
//   Sicherungsring, Ereignissen (Server-Sent Events), Sitzungsschlüssel (nur mit STUDIO_FLORIAN=1), Live-Weitergabe an SPIEL_PORT
//   und Merkern; dazu die Haken des Zusammenbaus: fremde Quellen einsetzen (quellenEinsetzen, Format M1.2) und Schutzprüfung
//   (schutzVerletzt, Store M1.5).
// - M2.4: der Weg der Messseite aus ./messung (die Signatur steht schon, eingehängt ist er seit M0).
// - M3.Z, nach Server und Speichern (M3.2): Neustart der Übernahme des Kopfs als Kindprozess mit Schreibhaken, wenn Florian seine
//   schluessel.json im Prototyp speichert (2 s nach dem letzten Speichern, höchstens ein Lauf zugleich, ein neuer Stand bricht den
//   laufenden ab; nach dem Umzug nie).
// - M6.0 und M6.2: in spielPlugins dieselbe Ablage nur zum Lesen samt quellenEinsetzen, Live (nimmt nur von localhost an) und
//   Merker als neue Dateien nach laeufe/ (5261, 5265, 5292).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';
import { messungWeg } from './messung.js';

/** Wurzelordner des Arbeitsbaums (der Ordner mit pnpm-workspace.yaml); relative Pfade gelten von hier (2.4). */
const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

/** Server-Erweiterungen von Studio (5217, 5263, 5291 und die Probe-Ports STUDIO_PORT). */
export function studioPlugins(): Plugin[] {
  return [messungWeg({ wurzel: WURZEL })];
}

/** Server-Erweiterungen des Spiels (5261, 5265, 5292 und die Probe-Ports SPIEL_PORT). */
export function spielPlugins(): Plugin[] {
  return [];
}
