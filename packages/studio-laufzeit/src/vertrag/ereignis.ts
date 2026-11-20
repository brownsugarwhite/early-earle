// Vertrag: Ereignisse im Postfach (Plan 4.2; Konzept 10.3, Schritt 2). Ein Ereignis aus Takt n wirkt in Takt n + 1; das Postfach
// ordnet fest (Physik, Übergänge, Zonen, Zähler, Uhr, Spieler; darin nach Kennung).
import type { Punkt } from '@ee/studio-format/typen/grund';

/** `quelle`: Kennung des Auslösers (Ding, Baustein, Übergang, Regel); `staerke`: etwa das Annäherungstempo eines Aufpralls (L/s) */
export interface Ereignis { takt: number; quelle: string; name: string; staerke: number; ort?: Punkt }
