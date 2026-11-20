// Register der Arten von Zusatzbewegungen gestalteter Übergänge (Plan 4.4, 2.2): 'huepfer', 'plumps', 'seufzer', 'wedeln' unter
// `posen/zusatz/`. Eine neue Art ist eine eigene Datei dort, ihr Schema in `studio-format/src/arten/zusatz.ts` und eine Zeile hier.
// Zusammenbau-Datei: Nur die Integration trägt Arten ein, nach der Welle, die eine Art baut (M4).
//
// Stand M0: leer.
import type { Zusatzart } from '../vertrag/zusatz';

export const ZUSATZARTEN: readonly Zusatzart[] = [
  // eine Zeile je Art
];

/** Art nach ihrem Namen; undefined: nicht eingetragen */
export function zusatzart(art: string): Zusatzart | undefined {
  return ZUSATZARTEN.find((a) => a.art === art);
}
