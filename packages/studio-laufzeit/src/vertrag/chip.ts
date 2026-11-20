// Vertrag: Chiparten der Figurphysik (Plan 4.5; Konzept 6.4). Eine Art ist eine eigene Datei unter `physik/`, ihr Schema in
// `studio-format/src/arten/chips.ts` und eine Zeile in `physik/chips.ts`. In Ruhe ist jeder Chip null (Ruhe = Zeichnung).
//
// Stand im Lauf (Ergänzung M0): Der ganze veränderliche Stand eines Chips (Lagen und Tempi seiner Federn und Kettenglieder) liegt in
// `Lauf.figur`, für Chip i (Nummer nach OrdnungPlan, `indexVon(plan.ordnung, c.id)`) von `plan.physik.chipStand[i]` bis
// `chipStand[i + 1]`; die Länge sagt seine Art (`standLaenge`), der Bauplan legt die Versätze an. Ein frischer Lauf hat dort lauter
// Nullen: das ist die Ruhe. So sichert ein Schlüsselstand den Chip mit dem Lauf, und die Prüfsumme des Takts zählt ihn. Ein ChipLauf
// hält nur, was er aus dem Bauplan vorausrechnet, keinen eigenen Stand.
//
// Wer die ChipLauf hält: Die Fassade legt sie nach jedem Bauen an (`chipart(c.art).anlegen(c, plan)` je Chip, in der Folge von
// PhysikPlan.chips) und gibt sie Schritt 8 (`physik/xpbd.ts`):
//   figurSchritt(p: PhysikPlan, lauf: Lauf, chips: readonly ChipLauf[], dt: number, teilschritte: number): void
// (statt `figurSchritt(plan.physik, lauf, dt, 4)` in Plan 4.2; die Integration trägt es dort und im Auftrag von M2.2 nach).
import type { PhysikChip } from '@ee/studio-format/typen/physik';
import type { Bauplan } from './bauplan';
import type { Lauf } from './lauf';

export interface Chipart {
  art: string; ausgang: 'regler' | 'knochen' | 'anker' | 'welt';
  /** wie viele Zahlen ein Chip dieser Art in `Lauf.figur` braucht; fest je Datensatz und Bauplan (0: ohne Stand) */
  standLaenge(c: PhysikChip, plan: Bauplan): number;
  anlegen(c: PhysikChip, plan: Bauplan): ChipLauf;
}
/** `schritt` liest und schreibt nur seinen Bereich von `lauf.figur` und seinen Ausgang; `ruht` liest nur seinen Bereich */
export interface ChipLauf { schritt(dt: number, lauf: Lauf): void; ruht(lauf: Lauf): boolean }
