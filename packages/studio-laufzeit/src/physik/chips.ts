// Register der Chiparten der Figurphysik (Plan 4.5, 2.2). Eine neue Art ist eine eigene Datei unter `physik/`, ihr Schema in
// `studio-format/src/arten/chips.ts` und eine Zeile hier. Zusammenbau-Datei: Nur die Integration trägt Arten ein, nach der Welle, die
// eine Art baut (Schwingen und Kette in M2.2, die übrigen in M5).
//
// Stand M0: leer.
import type { Chipart } from '../vertrag/chip';

export const CHIPARTEN: readonly Chipart[] = [
  // eine Zeile je Art
];

/** Art nach ihrem Namen; undefined: nicht eingetragen */
export function chipart(art: string): Chipart | undefined {
  return CHIPARTEN.find((a) => a.art === art);
}
