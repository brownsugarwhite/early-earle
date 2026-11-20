// Vertrag: der Editor in der Laufzeit (Plan 4.7). Die Stelle sagt, woran Florian gerade arbeitet; die Geltung, wohin ein Zug wirkt;
// das Ziel nennt den Datensatz, den die Rückrechnung schreibt (Zielregel); der Zug ist die Geste auf der Bühne. Die Funktionen dazu
// (`zielBestimmen`, `vorschau`, `rueckrechnen`, `fangen`, …) liegen unter `editor/`.
import type { Id, Punkt } from '@ee/studio-format/typen/grund';
import type { Uebergang } from '@ee/studio-format/typen/posen';

export type Stelle =
  | { art: 'grundform'; figur: Id<'fig'> }
  | { art: 'pose'; pose: Id<'po'> }
  | { art: 'achse'; regler: Id<'rg'>; wert: number }
  | { art: 'uebergang'; uebergang: Id<'ue'>; zeit: number }
  | { art: 'zelle'; schicht: Id<'sch'>; von: Id<'po'>; nach: Id<'po'>; anteil: number }    // Standardübergang vor dem ersten Zug
  | { art: 'ausprobieren'; schicht: Id<'sch'> };   // 16 g: nur Anfasser stellen Regler; A, V, P gesperrt (Statuszeile sagt warum);
                                                   // Halten → „als Pose behalten“ ruft poseAnlegen; sonst wird nichts gespeichert
export type Geltung =
  | { art: 'hier' } | { art: 'allePosen' } | { art: 'grundform'; posenGehenMit: boolean }
  | { art: 'nurPose'; pose: Id<'po'> } | { art: 'gelenkUeberall'; regler: Id<'rg'>; wert: number };
export type Ziel =
  | { art: 'ansichtsschluessel'; bindung: Id<'bd'>; an: number; vorhanden: Id<'sl'> | null; gespiegelt: boolean }
  | { art: 'grundform'; teil: Id<'teil'> }
  | { art: 'posenkorrektur'; pose: Id<'po'>; teil: Id<'teil'> }
  | { art: 'zwischenpose'; uebergang: Id<'ue'>; zeit: number; vorhanden: Id<'po'> | null }
  | { art: 'korrekturform'; regler: Id<'rg'>; an: number; teil: Id<'teil'> }
  | { art: 'kreuzschluessel'; achsen: [Id<'rg'>, Id<'rg'>]; an: [number, number]; teil: Id<'teil'> }
  | { art: 'formziel'; regler: Id<'rg'>; an: number; teil: Id<'teil'> };
export type Zug =
  | { art: 'anker'; teil: Id<'teil'>; anker: number; was: 'anker' | 'ein' | 'aus'; nach: Punkt; ecke: boolean }
  | { art: 'teil'; teil: Id<'teil'>; verschiebung: Punkt; drehung: number }
  | { art: 'stueck'; teil: Id<'teil'>; stueck: number; t: number; nach: Punkt }   // A biegt ein Kurvenstück (Befund 14)
  | { art: 'anfasser'; rolle: string; nach: Punkt };      // posiert: stellt Regler, legt keinen Schlüssel an

/**
 * eine Zelle der Tafel „von × nach“ einer Schicht (4.4, `posen/tafel.ts`); von und nach sind Posen-Indizes nach dem OrdnungPlan. Der Typ
 * liegt hier im Vertrag (Plan 4.4 zeigt ihn im Block `posen/`): `posen/tafel.ts` (M4) nimmt ihn von hier und legt ihn nicht neu an.
 */
export interface TafelZelle { von: number; nach: number; art: Uebergang['art'] | 'standard'; varianten: number; gesehen: boolean }
