// Dateien, Dokument und Diff (Bauplan 3.2, 3.5), dazu die Ergebnisse von Prüfen, Laden und SVG-Import (4.1). Die Reihenfolge der
// Datensatztypen in DatensatzTabelle ist zugleich ihre Reihenfolge in jeder Datei (3.5 Nr. 1).
import type { Effekt, Verbindung } from './bild';
import type { Figur, Gruppe, Teil } from './figur';
import type { Bindung, Regler, Schluessel, Wechsel } from './form';
import type { Id } from './grund';
import type { Aufhaengung, Knochen } from './knochen';
import type { Aufgabe, Baustein, Draht, Regel } from './logik';
import type { Koerpermodell, PhysikChip } from './physik';
import type { Pose, Schicht, Uebergang, Zyklus } from './posen';
import type { Klang, Projekt, Vorlage } from './projekt';
import type { Schrift } from './text';
import type { KlangChip } from './ton';
import type { Ding, Szene, Welt } from './welt';

export type Block = 'kern' | 'knochen' | 'posen' | 'physik' | 'bild' | 'logik' | 'welt' | 'ton';
/** Familien registrierter Arten (arten/register.ts) */
export type ArtFamilie = 'baustein' | 'chip' | 'effekt' | 'zusatz';
/**
 * Schlüssel einer Art im Register, in `Versionen.arten` und im Block ihrer Migrationen ('art:<familie>:<art>', versionen.ts):
 * '<familie>:<art>', etwa 'effekt:dicke' oder 'baustein:vierbeiner'. Die Familie gehört dazu, weil derselbe Name in zwei Familien
 * vorkommt (Chip und Effekt 'wasser', M10); ein Schlüssel nur mit dem Namen ist ein Typfehler und fällt durch das Schema.
 */
export type ArtSchluessel = `${ArtFamilie}:${string}`;
export interface Versionen { bloecke: Record<Block, number>; arten: Record<ArtSchluessel, number> }
export interface DatensatzTabelle {
  prj: Projekt; vl: Vorlage; kl: Klang; sf: Schrift;
  fig: Figur; teil: Teil; gr: Gruppe;
  rg: Regler; bd: Bindung; sl: Schluessel; we: Wechsel;
  kn: Knochen; af: Aufhaengung; km: Koerpermodell;
  sch: Schicht; po: Pose; ue: Uebergang; zy: Zyklus;
  ch: PhysikChip; vb: Verbindung; ef: Effekt; kc: KlangChip;
  welt: Welt; sz: Szene; di: Ding;
  bs: Baustein; dr: Draht; re: Regel; au: Aufgabe;
}
export type DatensatzTyp = keyof DatensatzTabelle;
export type Datensatz = DatensatzTabelle[DatensatzTyp];
export type DateiArt = 'projekt' | 'figur' | 'szene';
export interface Datei {
  format: 'studio'; art: DateiArt; versionen: Versionen;
  datensaetze: { [T in DatensatzTyp]?: Record<string, DatensatzTabelle[T]> };
}
/** im Speicher: alle Datensätze aller Dateien flach nach Kennung; Datensätze sind unveränderlich */
export interface Dokument { versionen: Versionen; datensaetze: ReadonlyMap<string, Datensatz> }
/** liegt im Format, nicht im Store: Die Laufzeit (`bauen`) und das Spiel (Live-Diffs) nehmen ihn und dürfen den Store nicht importieren */
export interface Diff { neu: Datensatz[]; weg: Datensatz[]; geaendert: [vorher: Datensatz, nachher: Datensatz][] }

// ---------- Ergebnisse (4.1): Typen hier, die Funktionen in pruefen.ts, laden.ts und svg/importieren.ts (M1.2) ----------

/** eine Meldung von `pruefen` (zod und Querregeln, 3.6): betroffener Datensatz und Feld, wo es sie gibt. Der Store bekommt die Prüfung
 *  übergeben und nimmt diesen Typ von hier (Befund 15) */
export interface Fehler { id?: string; feld?: string; text: string }
/** Ergebnis von `laden`: eine neuere Datei oder eine unbekannte Art öffnet nur zum Lesen, mit Meldung; `migriert` nennt die
 *  Migrationen, die gelaufen sind (3.4) */
export interface LadeErgebnis { dokument: Dokument; nurLesen: boolean; meldungen: string[]; migriert: string[] }
/** Ergebnis von `svgImportieren`: Importbericht und fast glatte Anker, die ⇧C glatt machen kann (Glätte-Regel, 3.4) */
export interface ImportErgebnis { dokument: Dokument; bericht: string[]; fastGlatt: { teil: Id<'teil'>; anker: number }[] }
