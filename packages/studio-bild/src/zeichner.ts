// Vertrag des Zeichners (Bauplan 4.6): WebGL2-Renderer mit Abstandsfeldern, gefüttert mit dem Zeichenmodell (Struktur) und den Daten
// eines Bilds. M0 legt die Signaturen als Typen an; M1.4 baut danach `zeichnerAnlegen` hier und `shaderUebersetzen` (uebersetzen.ts).
// Halbe Feldauflösung (`halbeFelder`) bleibt aus: Sie verändert seinen Look und kommt nur mit seinem Wort (8.3).
import type { BildDaten } from '@ee/studio-laufzeit/vertrag/bilddaten';
import type { ZeichenModell } from '@ee/studio-laufzeit/vertrag/zeichenmodell';

/** Kosten des letzten Bilds (Messseite, Kostenampel) */
export interface ZeichenZeiten { aufrufe: number; feldBildpunkte: number; ms: number }

export interface Zeichner {
  modell(m: ZeichenModell): void;                        // übersetzt Shader neu, nur bei Strukturänderung
  groesse(breite: number, hoehe: number, dichte: number): void;
  zeichne(d: BildDaten): void;                           // unter 100 WebGL-Aufrufe
  verloren(): boolean; wiederherstellen(): void;         // Kontextverlust: alles neu aus Modell und Daten
  zeiten(): ZeichenZeiten; freigeben(): void;
}

/** Quellen der drei Shader: Strecken (Abstandsfelder je Teil), Felder (Vereinigungen, Fugen), Bild (Farbe in Malreihenfolge) */
export interface ShaderQuellen { strecken: string; felder: string; bild: string }

/** `zeichnerAnlegen(canvas, o)`, gebaut in M1.4 */
export type ZeichnerAnlegen = (canvas: HTMLCanvasElement, o: { halbeFelder: boolean; rahmen: boolean }) => Zeichner;
/** `shaderUebersetzen(m)`, gebaut in M1.4: gleiches Modell, gleiche Quellen (deterministisch), alle Shader beim Laden */
export type ShaderUebersetzen = (m: ZeichenModell) => ShaderQuellen;
