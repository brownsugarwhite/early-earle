// Ordnung des Bauplans (Plan 4.3): feste Nummern aller Datensätze eines Dokuments, auf die sich jeder Index eines Teilplans bezieht.
// Gemeinsame Datei, in M0 fertig.
//
// Regel je Datensatztyp: Datensätze stehen nach ihrem Besitzer gruppiert, die Gruppen in der Folge ihrer Besitzer, darin nach den
// Sortierschlüsseln des Typs und zuletzt nach Kennung (Codepunkte). So liegen die Teile einer Figur und damit ihre Anker im Puffer
// beieinander, Regler stehen nach ihrem Besitzer (Figuren vor Szenen), Schichten in ihrer Rechenfolge (`ordnung`), Regeln nach Szene,
// Band und `ordnung` (wie LogikPlan.regeln). Datensätze, deren Besitzer fehlt, stehen hinter allen anderen ihres Typs, nach der
// Kennung des fehlenden Besitzers. Die Nummern hängen nur an Kennungen, Besitzern und diesen Schlüsseln: Ein Diff, der nichts davon
// ändert und nichts anlegt oder löscht, lässt die Ordnung, wie sie ist (dasselbe Objekt).
//
// Dazu `ankerBereiche`: wo die Anker und Kurvenstücke jedes Teils im Puffer liegen (Regel im Kopf von vertrag/bauplan.ts). Jeder
// Teilplan, der Anker anfasst (Form, Knochen, Abflachung, Wächter), nimmt sie von hier.
import type { Datensatz, DatensatzTabelle, DatensatzTyp, Diff, Dokument } from '@ee/studio-format/typen/dokument';
import type { Teil } from '@ee/studio-format/typen/figur';
import type { Id } from '@ee/studio-format/typen/grund';
import type { Band } from '@ee/studio-format/typen/logik';
import { leererOrdnungPlan, type OrdnungPlan } from '../vertrag/bauplan';

/** Besitzer und weitere Sortierschlüssel eines Datensatzes */
interface Sortierung { besitzer: string | null; schluessel: readonly (string | number)[] }

/** Rang der Bänder: Körper vor Regie vor Spieler vor Laune vor Grund (Konzept 8) */
export const BAND_RANG: { readonly [B in Band]: number } = { koerper: 0, regie: 1, spieler: 2, laune: 3, grund: 4 };

const OHNE: Sortierung = { besitzer: null, schluessel: [] };
const nach = (besitzer: string, ...schluessel: (string | number)[]): Sortierung => ({ besitzer, schluessel });

/** Sortierung je Datensatztyp; der Typ verlangt jeden Datensatztyp genau einmal */
const SORTIERUNG: { readonly [T in DatensatzTyp]: (d: DatensatzTabelle[T]) => Sortierung } = {
  prj: () => OHNE, vl: () => OHNE, kl: () => OHNE, sf: () => OHNE,
  fig: () => OHNE, teil: (d) => nach(d.figur), gr: (d) => nach(d.figur),
  rg: (d) => nach(d.besitzer), bd: (d) => nach(d.teil), sl: (d) => nach(d.bindung), we: (d) => nach(d.figur),
  kn: (d) => nach(d.figur), af: (d) => nach(d.teil), km: (d) => nach(d.figur),
  sch: (d) => nach(d.figur, d.ordnung), po: (d) => nach(d.schicht), ue: (d) => nach(d.schicht), zy: (d) => nach(d.figur),
  ch: (d) => nach(d.an), vb: (d) => nach(d.figur), ef: (d) => nach(d.besitzer), kc: (d) => nach(d.an),
  welt: () => OHNE, sz: () => OHNE, di: (d) => nach(d.szene),
  bs: (d) => nach(d.an), dr: (d) => nach(d.besitzer), re: (d) => nach(d.szene, BAND_RANG[d.band], d.ordnung),
  au: (d) => nach(d.szene, d.ordnung),
};

/** Rechenfolge der Typen: jeder Besitzer vor seinen Datensätzen (Szenen vor Dingen, Dinge vor Chips und Bausteinen) */
export const ORDNUNG_FOLGE: readonly DatensatzTyp[] = [
  'prj', 'vl', 'kl', 'sf', 'fig', 'welt', 'sz', 'di', 'teil', 'gr', 'rg', 'bd', 'sl', 'we', 'kn', 'af', 'km', 'sch', 'po', 'ue', 'zy',
  'ch', 'vb', 'ef', 'kc', 'bs', 'dr', 're', 'au',
];

function sortierungVon(typ: DatensatzTyp, d: Datensatz): Sortierung {
  return (SORTIERUNG[typ] as (d: Datensatz) => Sortierung)(d);
}

/** Datensatztyp nach der Vorsilbe der Kennung; null für alles andere */
export function typVon(id: string): DatensatzTyp | null {
  const i = id.indexOf('_');
  const v = i > 0 ? id.slice(0, i) : '';
  return Object.hasOwn(SORTIERUNG, v) ? (v as DatensatzTyp) : null;
}

/** Vergleich nach Codepunkten; Kennungen und Bruchindizes sind ASCII, dort ist es dasselbe wie `<` */
function vergleich(a: string | number, b: string | number): number {
  if (typeof a === 'number' && typeof b === 'number') return a < b ? -1 : a > b ? 1 : 0;
  const x = String(a), y = String(b);
  return x < y ? -1 : x > y ? 1 : 0;
}

/** Nummer eines Datensatzes in seinem Typ, −1: keiner */
export function indexVon(o: OrdnungPlan, id: string): number {
  return o.index.get(id) ?? -1;
}

/** ändert der Diff die Ordnung? (anlegen, löschen, Besitzer oder Sortierschlüssel) */
export function ordnungGeaendert(diff: Diff): boolean {
  if (diff.neu.length > 0 || diff.weg.length > 0) return true;
  for (const [vorher, nachher] of diff.geaendert) {
    const typ = typVon(nachher.id);
    if (vorher.id !== nachher.id || typ === null) return true;
    const a = sortierungVon(typ, vorher), b = sortierungVon(typ, nachher);
    if (a.besitzer !== b.besitzer || a.schluessel.length !== b.schluessel.length) return true;
    for (let i = 0; i < a.schluessel.length; i++) if (a.schluessel[i] !== b.schluessel[i]) return true;
  }
  return false;
}

/**
 * OrdnungPlan eines Dokuments. Mit `alt` und `diff` (dem Diff vom Dokument von `alt` zu `dok`) gibt es `alt` zurück, wenn der Diff die
 * Ordnung nicht ändert; sonst rechnet es neu (das kostet nur Sortieren).
 */
export function ordnungPlanBauen(dok: Dokument, alt?: OrdnungPlan, diff?: Diff): OrdnungPlan {
  if (alt !== undefined && diff !== undefined && !ordnungGeaendert(diff)) return alt;
  const jeTyp = new Map<DatensatzTyp, Datensatz[]>();
  for (const d of dok.datensaetze.values()) {
    const typ = typVon(d.id);
    if (typ === null) continue;
    let liste = jeTyp.get(typ);
    if (liste === undefined) jeTyp.set(typ, (liste = []));
    liste.push(d);
  }
  const plan = leererOrdnungPlan();
  const index = new Map<string, number>();
  const rang = new Map<string, number>();   // laufende Nummer über alle Typen: Besitzer stehen davor
  for (const typ of ORDNUNG_FOLGE) {
    const liste = jeTyp.get(typ);
    if (liste === undefined) continue;
    const schluessel = new Map<string, { rang: number; besitzer: string; sortierung: Sortierung }>();
    for (const d of liste) {
      const s = sortierungVon(typ, d);
      schluessel.set(d.id, { rang: s.besitzer === null ? -1 : rang.get(s.besitzer) ?? Infinity, besitzer: s.besitzer ?? '', sortierung: s });
    }
    liste.sort((a, b) => {
      const x = schluessel.get(a.id)!, y = schluessel.get(b.id)!;
      if (x.rang !== y.rang) return x.rang < y.rang ? -1 : 1;
      if (x.rang === Infinity && x.besitzer !== y.besitzer) return vergleich(x.besitzer, y.besitzer);
      const sx = x.sortierung.schluessel, sy = y.sortierung.schluessel;
      for (let i = 0; i < sx.length && i < sy.length; i++) {
        const v = vergleich(sx[i]!, sy[i]!);
        if (v !== 0) return v;
      }
      return vergleich(a.id, b.id);
    });
    const ids = plan.listen[typ] as string[];
    for (const d of liste) {
      index.set(d.id, ids.length);
      rang.set(d.id, rang.size);
      ids.push(d.id);
    }
  }
  return { ...plan, index };
}

/** Kennungen eines Typs in Nummernfolge (dieselbe Liste wie im Plan) */
export function kennungen<T extends DatensatzTyp>(o: OrdnungPlan, typ: T): readonly Id<T>[] {
  return o.listen[typ];
}

/** Anker und Kurvenstücke der Teile im Puffer, je Teil nach OrdnungPlan */
export interface AnkerBereiche {
  erster: Int32Array;         // erster Anker des Teils (je Anker 6 Zahlen im Puffer)
  anzahl: Int32Array;         // Teil.anker.length
  geschlossen: Uint8Array;    // 1: Fläche, oder Linie mit `linie.offen === false`
  erstesStueck: Int32Array;   // erstes Kurvenstück des Teils
  stuecke: Int32Array;        // geschlossen so viele wie Anker, offen eines weniger (nie unter 0)
  ankerZahl: number;          // alle Anker
  stueckZahl: number;         // alle Kurvenstücke
}

/** ist die Kurve eines Teils geschlossen? Eine Fläche immer, eine Linie nur mit `linie.offen === false` (ohne `linie`: offen) */
export function istGeschlossen(t: Pick<Teil, 'art' | 'linie'>): boolean {
  return t.art === 'flaeche' || t.linie?.offen === false;
}

/**
 * Wo die Anker und Kurvenstücke jedes Teils im Puffer liegen: Teil für Teil in der Folge von OrdnungPlan.teile, je Teil in der Folge von
 * Teil.anker (Regel im Kopf von vertrag/bauplan.ts). Hängt am Dokument, nicht nur an der Ordnung: Ein Anker mehr ändert die Ordnung
 * nicht, verschiebt aber alle Teile dahinter. Darum je Neubau aus dem Dokument; ein Durchgang über die Teile. Ein Teil, das im Dokument
 * fehlt, hat keine Anker.
 */
export function ankerBereiche(dok: Dokument, o: OrdnungPlan): AnkerBereiche {
  const n = o.teile.length;
  const erster = new Int32Array(n), anzahl = new Int32Array(n), geschlossen = new Uint8Array(n);
  const erstesStueck = new Int32Array(n), stuecke = new Int32Array(n);
  let ankerZahl = 0, stueckZahl = 0;
  for (let i = 0; i < n; i++) {
    const t = dok.datensaetze.get(o.teile[i]!) as Teil | undefined;
    const zahl = t?.anker.length ?? 0, zu = t !== undefined && istGeschlossen(t);
    erster[i] = ankerZahl;
    anzahl[i] = zahl;
    geschlossen[i] = zu ? 1 : 0;
    erstesStueck[i] = stueckZahl;
    stuecke[i] = zu ? zahl : Math.max(0, zahl - 1);
    ankerZahl += zahl;
    stueckZahl += stuecke[i]!;
  }
  return { erster, anzahl, geschlossen, erstesStueck, stuecke, ankerZahl, stueckZahl };
}
