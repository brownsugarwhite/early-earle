// Grundschemas des Formats v1 (Bauplan 3.2, 3.3): Kennungen, Punkte, Herkunft, Zeitsprache, Werte, Daten der Arten, Bruchindizes und
// Dateinamen. Jedes Schema beschreibt genau seinen Typ aus typen/ (schema.test.ts prüft das in beide Richtungen auf Typebene); Objekte
// sind streng, ein unbekanntes Feld ist ein Fehler und wird nie still weggelassen (3.4).
import { generateKeyBetween } from 'fractional-indexing';
import { z } from 'zod';
import { KENNUNG_LAENGE, VORSILBEN } from '../kennung';
import type { ArtWert, Id, Vorsilbe } from '../typen/grund';

export const vorsilbeSchema = z.enum(VORSILBEN);

/** Kennung mit einer der genannten Vorsilben: `kennungSchema('fig', 'sz')` ist `Id<'fig'> | Id<'sz'>` */
export function kennungSchema<V extends Vorsilbe>(...vorsilben: [V, ...V[]]) {
  const muster = new RegExp(`^(?:${vorsilben.join('|')})_[0-9A-Za-z]{${KENNUNG_LAENGE}}$`);
  return z.custom<Id<V>>((x) => typeof x === 'string' && muster.test(x), `Kennung erwartet: ${vorsilben.map((v) => `${v}_…`).join(' oder ')}`);
}

export const punktSchema = z.tuple([z.number(), z.number()]);
export const herkunftSchema = z.enum(['vorlage', 'dein', 'gebaut', 'aufnahme']);
export const kurveSchema = z.enum(['weich', 'fallen', 'auf', 'linear', 'feder']);
export const federSchema = z.strictObject({ dauer: z.number(), federung: z.number(), vorgriff: z.number().exactOptional() });
export const wertSchema = z.union([z.number(), kennungSchema('rg')]);

/** rekursiv, darum mit ausgeschriebenem Typ (Eingang wie Ausgang) */
export const artWertSchema: z.ZodType<ArtWert, ArtWert> = z.lazy(() =>
  z.union([z.number(), z.string(), z.boolean(), z.array(z.number()), z.array(z.string()), z.record(z.string(), artWertSchema)]),
);
/** Daten einer registrierten Art; hier nur die Form, ihr eigenes Schema prüft sie (arten/register.ts) */
export const artDatenSchema = z.record(z.string(), artWertSchema);

const ORDNUNG_ZEICHEN = /^[A-Za-z][0-9A-Za-z]*$/;

/** gültiger Bruchindex von `fractional-indexing` (Standardalphabet: Kopf A–Z oder a–z, Ziffern 0–9, A–Z, a–z, keine Null am Ende) */
export function istOrdnung(s: string): boolean {
  if (!ORDNUNG_ZEICHEN.test(s)) return false;
  try {
    generateKeyBetween(s, null);
    return true;
  } catch {
    return false;
  }
}

/** Reihenfolgen (`ebene`, `ordnung`) sind Bruchindizes, nie Positionen in einem Feld (3.3); erzeugt in schema/reihenfolge.ts */
export const ordnungSchema = z.string().refine(istOrdnung, 'kein gültiger Bruchindex');

/** Name einer Datei unter figuren/ oder szenen/ ohne Endung: kein Pfad, kein Steuerzeichen, nicht versteckt */
export function istDateiName(s: string): boolean {
  if (s.length === 0 || s.length > 100 || s.startsWith('.')) return false;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 0x20 || c === 0x7f || '/\\:*?"<>|'.includes(s.charAt(i))) return false;
  }
  return true;
}
export const dateiNameSchema = z.string().refine(istDateiName, 'kein gültiger Dateiname (ohne Pfad und Endung)');

/** alle Einträge verschieden (Kennungen in einer Liste) */
export function alleVerschieden(liste: readonly string[]): boolean {
  return new Set(liste).size === liste.length;
}
