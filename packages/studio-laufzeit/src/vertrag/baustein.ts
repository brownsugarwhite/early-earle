// Vertrag: Bausteinarten (Plan 4.5; Konzept 8). Eine Art ist eine eigene Datei unter `bausteine/`, ihr Schema in
// `studio-format/src/arten/bausteine.ts` und eine Zeile in `bausteine/register.ts`. Bedienung, Regeln und Prüfer lesen ihre Anschlüsse
// (Messwerte, Zustände, Ereignisse, Befehle, Kanäle) aus der Art, ohne weiteren Code.
//
// Stand im Lauf (Ergänzung M0, wie bei den Chips in vertrag/chip.ts): Der ganze veränderliche Stand eines Bausteins (Zustand, Messwerte,
// Uhren, geplante Schritte) liegt in `Lauf.bausteine`, für Baustein i (Nummer nach OrdnungPlan) von `plan.logik.bausteinStand[i]` bis
// `bausteinStand[i + 1]`; die Länge sagt seine Art (`standLaenge`). Ein frischer Lauf hat dort lauter Nullen: der Anfangszustand. Ein
// BausteinLauf hält nur, was beim Anlegen entsteht und sich im Lauf nicht ändert (etwa die Nummern seiner Körper in der Welt), keinen
// eigenen Stand. Kanalwerte gehören nicht zum Stand: Die Regeln setzen sie in jedem Takt neu (Schritt 3), bevor die Teilschritte laufen.
import type { Baustein } from '@ee/studio-format/typen/logik';
import type { Bauplan } from './bauplan';
import type { Lauf } from './lauf';
import type { WeltAdapter } from './welt';

export interface Bausteinart {
  art: string;
  messwerte: readonly string[]; zustaende: readonly string[]; ereignisse: readonly string[];
  befehle: readonly string[];
  kanaele: readonly string[];        // nur Reglernamen (16 e); Posen-Kanäle 'pose.<Schicht>' hat jedes Ding mit Figur von selbst
  /** wie viele Zahlen ein Baustein dieser Art in `Lauf.bausteine` braucht; fest je Datensatz und Bauplan */
  standLaenge(b: Baustein, plan: Bauplan): number;
  anlegen(b: Baustein, plan: Bauplan, welt: WeltAdapter, lauf: Lauf): BausteinLauf;
}
export interface BausteinLauf {
  teilschritt(dt: number, welt: WeltAdapter, lauf: Lauf): void;   // Schritt 7, viermal je Takt
  nachTakt(lauf: Lauf): void;                                      // Messwerte setzen, Ereignisse ins Postfach
  messwert(name: string, lauf: Lauf): number; zustand(lauf: Lauf): string;   // aus seinem Bereich von lauf.bausteine
  befehl(name: string, wert: number | undefined, lauf: Lauf): void;
  kanal(name: string, wert: number | string | null): void;         // null: Kanal frei, Grundwert gilt
}
