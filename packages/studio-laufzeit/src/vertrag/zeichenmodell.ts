// Vertrag: Zeichenmodell als Daten (Plan 4.6). `bauplan/zeichen.ts` legt es an; der Zeichner übersetzt daraus seine Shader neu, nur
// wenn sich die Struktur ändert. Zahlen, die sich je Bild ändern, kommen als Uniforms aus Reglern (`BildDaten.werte`). An Teilen mit
// `wieGezeichnet` stehen in `effekte[].wo` nur Arten, die `aufGezeichnet` dort erlaubt (30 d). Indizes beziehen sich auf den
// OrdnungPlan (vertrag/bauplan.ts).
//
// Feldsätze, eine Regel an einer Stelle (Ergänzung M0): `bauplan/zeichen.ts` (M1.3) teilt auf und prüft es dort (auch „30 Flächen
// ergeben zwei Feldsätze“). Jede Figur, deren Form sich bewegt, bekommt einen Feldsatz; hat sie mehr als KANAELE gezeichnete Teile
// (Flächen und Linien), je angefangene KANAELE einen weiteren. Ihre Teile kommen in der Folge von OrdnungPlan.teile auf die Plätze
// 0, 1, … ihres Feldsatzes; der Kanal ist dieser Platz (Textur kanal >> 2, Farbkanal kanal & 3). Figuren ohne Formänderung werden
// gebacken (`gebacken`) und haben keinen Feldsatz. `studio-bild` (`feldsaetze.ts`, M1.4) nimmt die Aufteilung, wie sie hier steht, teilt
// nie selbst auf und legt je Feldsatz-Instanz eines Bilds (vertrag/bilddaten.ts) die Texturen an.
import type { ArtDaten } from '@ee/studio-format/typen/grund';

/** Flächen je Feldsatz: sechs Texturen mit je vier Kanälen; `kanal` liegt in 0 bis KANAELE − 1 */
export const KANAELE = 24;

export interface ZeichenModell {
  /** je Teil, das als Feld gezeichnet wird, in der Folge von OrdnungPlan.teile; farbe 0 bis 1; feldsatz: Index in `feldsaetze` */
  teile: { teil: number; figur: number; farbe: [number, number, number]; weiss: boolean; linie: boolean; feldsatz: number; kanal: number }[];
  /** je bewegter Figur einer, je KANAELE Teile ein weiterer (Regel im Kopf). teile[k]: das Teil in Kanal k. einheit: `einheitL` der
   *  Figur (Figur-Einheiten je L), damit der Zeichner Maße aus Figur-Einheiten (Uniforms von Verbindungen, Klemmen, Effekten) in die
   *  Welt der Strecken umrechnet (Ergänzung M0) */
  feldsaetze: { figur: number; einheit: number; teile: number[] }[];
  verbindungen: { a: number[]; b: number[]; art: 'verschmelzen' | 'fuge'; nachKante: boolean; uniform: number }[];
  effekte: { art: string; wo: number[]; uniformStaerke: number; uniformWeichheit: number; profil: Float32Array | null; daten: ArtDaten }[];
  klemmen: { weiss: number; traeger: number; uniformRand: number; weich: number }[];
  hinter: { weiss: number; schwarz: number; uniformTiefe: number }[];
  uniforms: { name: string; quelle: number | null; fest: number }[];   // quelle: Reglerindex
  /** je gebackenem Ding einer (Ergänzung M0: `ding`, Index nach OrdnungPlan): sein Feld wird einmal gebacken, je Figur nur einmal */
  gebacken: { ding: number; figur: number; groesse: number }[];
}
