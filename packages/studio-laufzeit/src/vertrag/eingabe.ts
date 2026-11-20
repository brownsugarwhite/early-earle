// Vertrag: rohe Eingabe eines Takts (Plan 4.2). Das Gerät gibt sie dem Takt; Schritt 1 (`takt/eingabe.ts`) schreibt sie mit der
// Taktnummer ins Protokoll (`EingabeEintrag` im Format, nur Änderungen).
import type { Punkt } from '@ee/studio-format/typen/grund';

/**
 * Eingabe eines Takts, in Koordinaten der Bühne. `finger`: der eine Finger des Spiels (null: keiner auf dem Glas; `an: false` im Takt
 * des Loslassens). `tippen`: ein kurzes Antippen in diesem Takt (null: keins). `knoepfe`: Namen der gedrückten Knöpfe.
 */
export interface RohEingabe { finger: { an: boolean; x: number; y: number } | null; tippen: Punkt | null; knoepfe: string[] }
