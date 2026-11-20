// Register der Bausteinarten (Plan 4.5, 2.2). Eine neue Art ist eine eigene Datei unter `bausteine/`, ihr Schema in
// `studio-format/src/arten/bausteine.ts` und eine Zeile hier. Zusammenbau-Datei: Nur die Integration trägt Arten ein, nach der Welle,
// die eine Art baut. Bedienung, Regeln, Prüfer und Bauplan lesen die Anschlüsse jeder Art von hier.
//
// Stand M0: leer.
import type { Bausteinart } from '../vertrag/baustein';

export const BAUSTEINARTEN: readonly Bausteinart[] = [
  // eine Zeile je Art
];

/** Art nach ihrem Namen; undefined: nicht eingetragen (eine Datei mit unbekannter Art öffnet der Editor nur zum Lesen, 3.4) */
export function bausteinart(art: string): Bausteinart | undefined {
  return BAUSTEINARTEN.find((a) => a.art === art);
}
