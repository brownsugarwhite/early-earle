// Effektarten (Bauplan 4.1, 4.6): je Art Schema, Version, Migrationen und `aufGezeichnet`. M0 legt die fünf Effekte von M1 an, weil
// die Übernahme Effekte schreibt und `laden` unbekannte Arten nur zum Lesen öffnet. In M0 tragen sie keine Daten (`daten: {}`); ein
// Feld darin ist ein Fehler. An Teilen mit `wieGezeichnet` wirken alle fünf immer mit ihrer Stärke (Art 'zeichnung', 30 d).
// M6.0 und M10.0 hängen weitere Arten an (je eine Zeile in EFFEKTE).
import { z } from 'zod';
import type { ArtSchema } from './register';

/** Daten eines Effekts in M0: keine */
const OHNE_DATEN = z.strictObject({});

function effekt(art: string): ArtSchema {
  return { art, familie: 'effekt', version: 1, schema: OHNE_DATEN, migrationen: [], aufGezeichnet: 'zeichnung' };
}

/** weiche Vereinigung über den Abstand zur Kante (Verbindungen 'verschmelzen', auch nach Kantenrichtung) */
export const VERSCHMELZEN = effekt('verschmelzen');
/** Dickenregel: Weiß läuft über die Outline (im Prototyp „Durchbruch“) */
export const DICKE = effekt('dicke');
/** Kantenglättung mit Spitzenregel */
export const KANTEN = effekt('kanten');
/** Verdecker des Prototyps; bei Ozzy mit Stärke 0 (Durchbruch statt Verdecken) */
export const VERDECKEN = effekt('verdecken');
/** ein weißes Teil gibt dem Schwarz darüber in der Malreihenfolge weich nach, statt hart abzuschneiden */
export const WEISS_NACHGEBEN = effekt('weissNachgeben');

export const EFFEKTE: readonly ArtSchema[] = [VERSCHMELZEN, DICKE, KANTEN, VERDECKEN, WEISS_NACHGEBEN];
