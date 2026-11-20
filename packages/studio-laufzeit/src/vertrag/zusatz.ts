// Vertrag: Arten der Zusatzbewegungen gestalteter Übergänge (Plan 4.4). Eine Art ist eine eigene Datei unter `posen/zusatz/`, ihr
// Schema in `studio-format/src/arten/zusatz.ts` und eine Zeile in `posen/zusatzarten.ts`: 'huepfer' (Bogen 4u(1−u) um die Rolle aus
// daten.um), 'plumps' (aufprall aus ablauf.ts), 'seufzer' (seufzer aus ablauf.ts), 'wedeln' (Frequenz daten.hz, Hülle sin(πu)).
import type { Zusatzbewegung } from '@ee/studio-format/typen/posen';
import type { Lauf } from './lauf';

/** `u`: Anteil in der Zusatzbewegung (0 bis 1), `t`: Zeit im Übergang (s), `r`: Reglerwerte, in die sie addiert */
export interface Zusatzart { art: string; anwenden(z: Zusatzbewegung, u: number, t: number, lauf: Lauf, r: Float64Array): void }
