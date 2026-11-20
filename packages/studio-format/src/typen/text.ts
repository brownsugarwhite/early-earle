// Glyphentabelle einer Schrift (Bauplan 3.2, Befund 7; gebraucht ab M7.6).
import type { Form } from './form';
import type { Herkunft, Id } from './grund';

/** Glyphentabelle einer Schrift, liegt in projekt.json (Block 'kern'). Quadratische Stücke exakt kubisch: c1 = p0 + ⅔·(q − p0), c2 = p2 + ⅔·(q − p2);
 *  Anker nach der Glätte-Regel (3.4); `innen`: Kontur eines Innenraums (o, e, a), erkannt an der Umlaufrichtung */
export interface Schrift {
  id: Id<'sf'>; name: string; quelle: string;           // 'assets/fonts/lobster/Lobster-Regular.ttf'
  geviert: number;                                       // Einheiten je Geviert
  glyphen: { zeichen: string; vorschub: number; konturen: { form: Form; innen: boolean }[] }[];   // nach zeichen sortiert
  unterschneidung: [links: string, rechts: string, wert: number][];
  herkunft: Herkunft;
}
