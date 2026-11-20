// Vertrag: Daten eines Bilds für den Zeichner (Plan 4.6). Die Laufzeit füllt sie je Bild in vorab angelegte Felder; `studio-bild` liest
// sie nur. Teile zählen nach dem OrdnungPlan (vertrag/bauplan.ts), alles Übrige zählt in diesem Bild.
//
// Ein Bild wächst (Plan 4.2, 16 j): Wer zeichnet, leert die Daten zu Beginn jedes Bilds (`bildDatenLeeren`). Jeder Aufruf von
// `Laufzeit.bild` und `Laufzeit.auswerten` hängt eine Auswertung an: je Feldsatz des ZeichenModells eine Feldsatz-Instanz (laufende
// Nummer in diesem Bild) samt ihren Teilen und Strecken. So zeichnet der Zeichner Zwiebelhaut, Posenkarten und Geister wie die Figur
// selbst. Den Platz legt die App (Bühne, Spiel, Messseite) mit `bildDatenAnlegen` einmal je Bauplan an; im Bildtakt entsteht kein
// Speicher, zu wenig Platz ist ein RangeError.
//
// Wer füllt was (Ergänzung M0):
// - strecken, teile, rahmen: Schritt 16 (`form/abflachen.ts`, M1.3); ordnung und deckung: die Malreihenfolge (`form/wechsel.ts`, M1.3)
//   für die Teile, die Schritt 16 eben angehängt hat.
// - werte: die Fassade (Zusammenbau) je angehängter Feldsatz-Instanz aus ZeichenModell.uniforms und den gezeigten Reglerwerten.
// - lagen: die Fassade aus den Körperlagen der gebackenen Dinge (ab M6). kreise: die Laufzeit aus den Teilchen (ab M6); die Messseite
//   (M2.4) füllt sie für ihre Ersatzszenen selbst.
// - kamera: wer zeichnet (im Editor die Bühne aus Zoom und Verschiebung, im Spiel die App aus der Kamera der Szene).
// „Welt“ heißt hier: wie BildStand.anker, in L, y nach unten, die Lage jeder Figur eingerechnet (vertrag/bauplan.ts).
//
// Die Feldbreiten sind Werte mit Literaltyp; `studio-bild` nimmt die Laufzeit nur mit `import type` und führt sie als geprüfte Kopie
// (`const STRECKE: typeof STRECKE_FELDER = 6`, wie im Kopf von vertrag/welt.ts).
import type { Bauplan } from './bauplan';

/**
 * je Strecke in `strecken`: 0 ax, 1 ay, 2 bx, 3 by (Welt), 4 Eintrag in `teile` (laufende Nummer in diesem Bild), 5 Reichweite (Welt):
 * wie weit das Feld der Strecke mindestens reicht, je Teil gleich, das größte Maß unter den Verbindungen des Teils (Wert ihres Uniforms
 * durch die `einheit` seines Feldsatzes), ohne Verbindung 0. Den Rand für Kantenglättung und Effekte legt der Zeichner in Bildpunkten dazu.
 */
export const STRECKE_FELDER = 6;
/**
 * je gezeichnetem Teil in `teile`: 0 Teil (Index nach OrdnungPlan), 1 erste Strecke, 2 Zahl der Strecken, 3 Feldsatz-Instanz (laufende
 * Nummer in diesem Bild), 4 Kanal (0 bis KANAELE − 1, wie ZeichenModell.teile[].kanal). Die Einträge einer Feldsatz-Instanz stehen
 * beieinander; ein unsichtbares Teil (Wechsel) bekommt keinen Eintrag und keine Strecken.
 */
export const TEIL_FELDER = 5;
/**
 * je Feldsatz-Instanz in `rahmen`: 0 ihr Feldsatz im ZeichenModell (Index in ZeichenModell.feldsaetze), 1 x0, 2 y0, 3 x1, 4 y1 (Welt:
 * kleinstes und größtes x und y aller Strecken ihrer Teile, ohne Reichweite; ohne Strecken x0 = y0 = +∞, x1 = y1 = −∞)
 */
export const RAHMEN_FELDER = 5;
/**
 * je weichem Paar in `deckung`: 0 unteres, 1 oberes Teil (beide Einträge in `teile`, in derselben Feldsatz-Instanz), 2 Anteil, zu dem
 * das obere über dem unteren liegt. Nur Paare in einem Wechsel mit Breite, deren Anteil echt zwischen 0 und 1 liegt; jedes Paar höchstens
 * einmal. Alle übrigen Paare folgen hart aus `ordnung`.
 */
export const DECKUNG_FELDER = 3;
/** je gebackenem Ding in `lagen`, in der Folge von ZeichenModell.gebacken: 0 x, 1 y (Welt), 2 Drehung (Grad) */
export const GEBACKEN_FELDER = 3;
/**
 * je Kreis in `kreise`: 0 x, 1 y, 2 Radius, 3 Deckkraft (0 bis 1), 4 Raum (0: Welt; 1: Bild in Bildpunkten, für „Kamera nass“), 5 Effekt
 * (Index in ZeichenModell.effekte, dessen Art und Daten den Kreis zeichnen; −1: keiner)
 */
export const KREIS_FELDER = 6;
/** `kamera`: 0 Maßstab (Bildpunkte je L), 1 x, 2 y (Mitte des Bilds in der Welt), 3 Drehung (Grad), 4 Breite, 5 Höhe (Bildpunkte) */
export const KAMERA_FELDER = 6;

export interface BildDaten {
  strecken: Float32Array; streckenZahl: number;          // STRECKE_FELDER je Strecke
  teile: Uint32Array; teilZahl: number;                  // TEIL_FELDER je gezeichnetem Teil (Ergänzung M0: teilZahl)
  rahmen: Float32Array; feldsatzZahl: number;            // RAHMEN_FELDER je Feldsatz-Instanz (Ergänzung M0: feldsatzZahl)
  /** Malreihenfolge nach Wechseln, Einträge von `teile` von unten nach oben: Für eine Feldsatz-Instanz mit den Einträgen e0 bis
   *  e0 + n − 1 ist ordnung[e0 … e0 + n − 1] eine Umordnung genau dieser Einträge */
  ordnung: Uint16Array;
  deckung: Float32Array; deckungZahl: number;            // DECKUNG_FELDER je weichem Paar (Ergänzung M0: deckungZahl)
  werte: Float32Array;                                   // je Feldsatz-Instanz f und Uniform u: werte[f · U + u], U = Zahl der Uniforms
  lagen: Float32Array;                                   // GEBACKEN_FELDER je gebackenem Ding
  kreise: Float32Array; kreisZahl: number;               // KREIS_FELDER je Kreis (Spritzer, Staub, Kamera nass; Befund 29)
  kamera: Float32Array;                                  // KAMERA_FELDER
}

/**
 * Platz für die Bilder eines Bauplans: `auswertungen` Auswertungen je Bild (1 + Zwiebelhaut, Posenkarten oder Geister), `kreise`
 * Kreise. Neu anlegen, wenn sich die Struktur des Bauplans oder die Zoomstufe ändert (`abflach.streckenZahl`).
 */
export function bildDatenAnlegen(plan: Bauplan, o?: { auswertungen?: number; kreise?: number }): BildDaten {
  const m = o?.auswertungen ?? 1, z = plan.zeichen;
  if (!Number.isInteger(m) || m < 1) throw new RangeError(`bildDatenAnlegen: ${String(m)} Auswertungen`);
  const teile = z.teile.length, feldsaetze = z.feldsaetze.length;
  if (m * teile > 0xffff) throw new RangeError(`bildDatenAnlegen: ${m * teile} Teile passen nicht in die Malreihenfolge (Uint16)`);
  let paare = 0;
  for (const f of z.feldsaetze) paare += (f.teile.length * (f.teile.length - 1)) / 2;
  const kamera = new Float32Array(KAMERA_FELDER);
  kamera[0] = 1;
  return {
    strecken: new Float32Array(m * plan.abflach.streckenZahl * STRECKE_FELDER), streckenZahl: 0,
    teile: new Uint32Array(m * teile * TEIL_FELDER), teilZahl: 0,
    rahmen: new Float32Array(m * feldsaetze * RAHMEN_FELDER), feldsatzZahl: 0,
    ordnung: new Uint16Array(m * teile),
    deckung: new Float32Array(m * paare * DECKUNG_FELDER), deckungZahl: 0,
    werte: new Float32Array(m * feldsaetze * z.uniforms.length),
    lagen: new Float32Array(z.gebacken.length * GEBACKEN_FELDER),
    kreise: new Float32Array((o?.kreise ?? 0) * KREIS_FELDER), kreisZahl: 0,
    kamera,
  };
}

/** zu Beginn jedes Bilds: alle Zähler auf 0 (die Felder bleiben, wie sie sind; lagen und kamera gelten weiter) */
export function bildDatenLeeren(aus: BildDaten): void {
  aus.streckenZahl = 0;
  aus.teilZahl = 0;
  aus.feldsatzZahl = 0;
  aus.deckungZahl = 0;
  aus.kreisZahl = 0;
}
