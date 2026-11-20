// Reihenfolgen des Formats: Bruchindizes für `ebene` und `ordnung` (3.3) und der Aufbau einer Datei mit ihrer festen Reihenfolge
// (3.5 Nr. 1): Kopf `format`, `art`, `versionen`, dann `datensaetze`; die Typen in der Reihenfolge von DatensatzTabelle, darin nach
// Kennung (Codepunkte); Felder in der Reihenfolge ihres Schemas (sie folgt dem Typ); Daten der Arten und andere freie Tabellen nach
// Feldnamen sortiert. `ordnen` stellt jeden Wert so um; der Schreiber setzt nur noch Einzug und Zahlen.
// Hier liegen auch die Schemas der Dokument-Ebene (Datensatz, Datei, Diff), weil sie die Tabelle aller Typen brauchen.
import { generateKeyBetween, generateNKeysBetween } from 'fractional-indexing';
import { z } from 'zod';
import type { Datei, Datensatz, DatensatzTabelle, DatensatzTyp } from '../typen/dokument';
import { versionenSchema } from '../versionen';
import { effektSchema, verbindungSchema } from './bild';
import { figurSchema, gruppeSchema, teilSchema } from './figur';
import { bindungSchema, reglerSchema, schluesselSchema, wechselSchema } from './form';
import { aufhaengungSchema, knochenSchema } from './knochen';
import { aufgabeSchema, bausteinSchema, drahtSchema, regelSchema } from './logik';
import { koerpermodellSchema, physikChipSchema } from './physik';
import { poseSchema, schichtSchema, uebergangSchema, zyklusSchema } from './posen';
import { klangSchema, projektSchema, vorlageSchema } from './projekt';
import { schriftSchema } from './text';
import { klangChipSchema } from './ton';
import { dingSchema, szeneSchema, weltSchema } from './welt';

// ---------- Bruchindizes ----------

/** Bruchindex zwischen zwei Nachbarn (null: Anfang oder Ende der Liste), Standardalphabet von `fractional-indexing` */
export function ordnungZwischen(vor: string | null, nach: string | null): string {
  return generateKeyBetween(vor, nach);
}

/** `anzahl` aufsteigende Bruchindizes zwischen zwei Nachbarn */
export function ordnungenZwischen(vor: string | null, nach: string | null, anzahl: number): string[] {
  return generateNKeysBetween(vor, nach, anzahl);
}

/** Vergleich nach Codepunkten (3.5 Nr. 1); für Kennungen und Bruchindizes (nur ASCII) dasselbe wie `<` */
export function nachCodepunkten(a: string, b: string): number {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const ca = a.codePointAt(i)!;
    const cb = b.codePointAt(i)!;
    if (ca !== cb) return ca < cb ? -1 : 1;
    if (ca > 0xffff) i++;
  }
  return a.length === b.length ? 0 : a.length < b.length ? -1 : 1;
}

// ---------- Tabelle der Datensatztypen ----------

/** Schema je Datensatztyp, in der Reihenfolge von DatensatzTabelle (zugleich die Reihenfolge in der Datei) */
export const DATENSATZ_SCHEMAS = {
  prj: projektSchema, vl: vorlageSchema, kl: klangSchema, sf: schriftSchema,
  fig: figurSchema, teil: teilSchema, gr: gruppeSchema,
  rg: reglerSchema, bd: bindungSchema, sl: schluesselSchema, we: wechselSchema,
  kn: knochenSchema, af: aufhaengungSchema, km: koerpermodellSchema,
  sch: schichtSchema, po: poseSchema, ue: uebergangSchema, zy: zyklusSchema,
  ch: physikChipSchema, vb: verbindungSchema, ef: effektSchema, kc: klangChipSchema,
  welt: weltSchema, sz: szeneSchema, di: dingSchema,
  bs: bausteinSchema, dr: drahtSchema, re: regelSchema, au: aufgabeSchema,
} as const satisfies { readonly [T in DatensatzTyp]: z.ZodType<DatensatzTabelle[T], DatensatzTabelle[T]> };

/** Datensatztypen in der Reihenfolge von DatensatzTabelle */
export const DATENSATZ_TYPEN: readonly DatensatzTyp[] = Object.keys(DATENSATZ_SCHEMAS) as DatensatzTyp[];

export function istDatensatzTyp(v: string): v is DatensatzTyp {
  return Object.hasOwn(DATENSATZ_SCHEMAS, v);
}

/** Datensatztyp nach der Vorsilbe einer Kennung; null bei Ankern ('an') und allem anderen */
export function datensatzTypVon(id: string): DatensatzTyp | null {
  const i = id.indexOf('_');
  const v = i > 0 ? id.slice(0, i) : '';
  return istDatensatzTyp(v) ? v : null;
}

/** Schema eines Datensatztyps, ohne die Vereinigung aller 29 Schematypen */
export function schemaVon(typ: DatensatzTyp): z.ZodType<Datensatz, Datensatz> {
  return DATENSATZ_SCHEMAS[typ];
}

// ---------- Schemas der Dokument-Ebene ----------

/** irgendein Datensatz: das Schema seines Typs nach der Vorsilbe seiner Kennung */
export const datensatzSchema = z.custom<Datensatz>().superRefine((wert, ctx) => {
  const id: unknown = istObjekt(wert) ? wert['id'] : undefined;
  const typ = typeof id === 'string' ? datensatzTypVon(id) : null;
  if (typ === null) {
    ctx.addIssue({ code: 'custom', message: 'Datensatz ohne gültige Kennung', path: ['id'] });
    return;
  }
  const r = z.safeParse(schemaVon(typ), wert);
  if (!r.success) for (const f of r.error.issues) ctx.addIssue({ code: 'custom', message: f.message, path: f.path });
});

/** Datensätze eines Typs nach Kennung; der Schlüssel ist die Kennung des Datensatzes */
function tabelle<T extends { id: string }>(schema: z.ZodType<T, T>) {
  return z.record(z.string(), schema).superRefine((m, ctx) => {
    for (const [k, d] of Object.entries(m))
      if (d.id !== k) ctx.addIssue({ code: 'custom', message: `Schlüssel ${k} ist nicht die Kennung ${d.id}`, path: [k, 'id'] });
  });
}

export const dateiArtSchema = z.enum(['projekt', 'figur', 'szene']);
export const dateiSchema = z.strictObject({
  format: z.literal('studio'),
  art: dateiArtSchema,
  versionen: versionenSchema,
  datensaetze: z.strictObject({
    prj: tabelle(projektSchema).exactOptional(),
    vl: tabelle(vorlageSchema).exactOptional(),
    kl: tabelle(klangSchema).exactOptional(),
    sf: tabelle(schriftSchema).exactOptional(),
    fig: tabelle(figurSchema).exactOptional(),
    teil: tabelle(teilSchema).exactOptional(),
    gr: tabelle(gruppeSchema).exactOptional(),
    rg: tabelle(reglerSchema).exactOptional(),
    bd: tabelle(bindungSchema).exactOptional(),
    sl: tabelle(schluesselSchema).exactOptional(),
    we: tabelle(wechselSchema).exactOptional(),
    kn: tabelle(knochenSchema).exactOptional(),
    af: tabelle(aufhaengungSchema).exactOptional(),
    km: tabelle(koerpermodellSchema).exactOptional(),
    sch: tabelle(schichtSchema).exactOptional(),
    po: tabelle(poseSchema).exactOptional(),
    ue: tabelle(uebergangSchema).exactOptional(),
    zy: tabelle(zyklusSchema).exactOptional(),
    ch: tabelle(physikChipSchema).exactOptional(),
    vb: tabelle(verbindungSchema).exactOptional(),
    ef: tabelle(effektSchema).exactOptional(),
    kc: tabelle(klangChipSchema).exactOptional(),
    welt: tabelle(weltSchema).exactOptional(),
    sz: tabelle(szeneSchema).exactOptional(),
    di: tabelle(dingSchema).exactOptional(),
    bs: tabelle(bausteinSchema).exactOptional(),
    dr: tabelle(drahtSchema).exactOptional(),
    re: tabelle(regelSchema).exactOptional(),
    au: tabelle(aufgabeSchema).exactOptional(),
  }),
});

/** Live-Diffs zwischen Editor und Spiel (Befund 27): ein geändertes Paar trägt dieselbe Kennung */
export const diffSchema = z.strictObject({
  neu: z.array(datensatzSchema),
  weg: z.array(datensatzSchema),
  geaendert: z.array(
    z.tuple([datensatzSchema, datensatzSchema]).refine(([vorher, nachher]) => vorher.id === nachher.id, 'vorher und nachher mit verschiedener Kennung'),
  ),
});

// ---------- feste Reihenfolge ----------

/**
 * stellt einen Wert in die feste Reihenfolge seines Schemas (3.5 Nr. 1): Objekte in der Reihenfolge der Felder ihres Schemas, freie
 * Tabellen (Datensätze nach Kennung, Daten der Arten, Kanäle) nach Codepunkten; Listen und Zeilen behalten ihre Reihenfolge. Bei einer
 * Vereinigung gilt die erste Möglichkeit, die passt. Felder ohne Wert fallen weg; ein Feld, das das Schema nicht kennt (nach der
 * Prüfung gibt es keins), steht hinten. Gibt neue Objekte zurück und ändert nichts am Wert.
 */
export function ordnen(schema: z.core.$ZodType, wert: unknown): unknown {
  if (schema === datensatzSchema) return datensatzOrdnenRoh(wert);
  const def = schema._zod.def;
  switch (def.type) {
    case 'object': {
      if (!istObjekt(wert)) return wert;
      const felder = (def as z.core.$ZodObjectDef).shape;
      const aus: Record<string, unknown> = {};
      for (const k of Object.keys(felder)) if (Object.hasOwn(wert, k) && wert[k] !== undefined) aus[k] = ordnen(felder[k]!, wert[k]);
      for (const k of Object.keys(wert).sort(nachCodepunkten)) if (!Object.hasOwn(felder, k) && wert[k] !== undefined) aus[k] = wert[k];
      return aus;
    }
    case 'record': {
      if (!istObjekt(wert)) return wert;
      const werte = (def as z.core.$ZodRecordDef).valueType;
      const aus: Record<string, unknown> = {};
      for (const k of Object.keys(wert).sort(nachCodepunkten)) if (wert[k] !== undefined) aus[k] = ordnen(werte, wert[k]);
      return aus;
    }
    case 'array': {
      const element = (def as z.core.$ZodArrayDef).element;
      return Array.isArray(wert) ? wert.map((x: unknown) => ordnen(element, x)) : wert;
    }
    case 'tuple': {
      const t = def as z.core.$ZodTupleDef;
      if (!Array.isArray(wert)) return wert;
      return wert.map((x: unknown, i) => {
        const s = t.items[i] ?? t.rest;
        return s ? ordnen(s, x) : x;
      });
    }
    case 'union': {
      for (const o of (def as z.core.$ZodUnionDef).options) if (z.safeParse(o, wert).success) return ordnen(o, wert);
      return wert;
    }
    case 'optional':
    case 'nullable':
    case 'readonly':
    case 'nonoptional':
      return ordnen((def as z.core.$ZodOptionalDef).innerType, wert);
    case 'lazy':
      return ordnen((def as z.core.$ZodLazyDef).getter(), wert);
    case 'pipe':
      return ordnen((def as z.core.$ZodPipeDef).in, wert);
    default:
      return wert;
  }
}

/** ein Datensatz in fester Reihenfolge (Schema nach der Vorsilbe seiner Kennung) */
export function datensatzOrdnen<T extends Datensatz>(d: T): T {
  return datensatzOrdnenRoh(d) as T;
}

/** eine ganze Datei in fester Reihenfolge (3.5 Nr. 1) */
export function dateiOrdnen(d: Datei): Datei {
  return ordnen(dateiSchema, d) as Datei;
}

function datensatzOrdnenRoh(wert: unknown): unknown {
  const id: unknown = istObjekt(wert) ? wert['id'] : undefined;
  const typ = typeof id === 'string' ? datensatzTypVon(id) : null;
  return typ === null ? wert : ordnen(schemaVon(typ), wert);
}

function istObjekt(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}
