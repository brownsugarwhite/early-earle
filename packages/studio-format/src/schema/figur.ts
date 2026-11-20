// Schemas zu typen/figur.ts: Figur, Teil, Gruppe.
import { z } from 'zod';
import { formSchema } from './form';
import { alleVerschieden, dateiNameSchema, herkunftSchema, kennungSchema, ordnungSchema, wertSchema } from './grund';

export const figurSchema = z.strictObject({
  id: kennungSchema('fig'),
  name: z.string(),
  datei: dateiNameSchema,
  einheitL: z.number(),
  vorlage: z.enum(['vierbeiner', 'allgemein']).exactOptional(),
  wurzel: kennungSchema('kn').exactOptional(),
  lage: z.strictObject({ x: kennungSchema('rg'), y: kennungSchema('rg'), drehung: kennungSchema('rg') }),
  herkunft: herkunftSchema,
});

const HEX = /^#[0-9A-Fa-f]{6}$/;
/** 'schwarz', 'weiss' oder eine Farbe '#rrggbb' */
export const farbeSchema = z.union([
  z.enum(['schwarz', 'weiss']),
  z.custom<`#${string}`>((x) => typeof x === 'string' && HEX.test(x), "Farbe erwartet: 'schwarz', 'weiss' oder '#rrggbb'"),
]);

export const teilSchema = z.strictObject({
  id: kennungSchema('teil'),
  figur: kennungSchema('fig'),
  name: z.string(),
  art: z.enum(['flaeche', 'linie']),
  farbe: farbeSchema,
  ebene: ordnungSchema,
  gruppe: kennungSchema('gr').exactOptional(),
  anker: z.array(kennungSchema('an')).refine(alleVerschieden, 'Anker doppelt'),
  form: formSchema.exactOptional(),
  wieGezeichnet: z.literal(true).exactOptional(),
  linie: z.strictObject({ offen: z.boolean(), breite: z.array(z.tuple([z.number(), z.number()])) }).exactOptional(),
  klemme: z.strictObject({ traeger: kennungSchema('teil'), rand: wertSchema, weich: z.number() }).exactOptional(),
  hinter: z.strictObject({ teil: kennungSchema('teil'), tiefe: wertSchema }).exactOptional(),
  partner: kennungSchema('teil').exactOptional(),
  rolle: z.string().exactOptional(),
  seite: z.enum(['links', 'rechts', 'mitte']).exactOptional(),
  vorlageName: z.string().exactOptional(),
  herkunft: herkunftSchema,
});

export const gruppeSchema = z.strictObject({
  id: kennungSchema('gr'),
  figur: kennungSchema('fig'),
  name: z.string(),
  ordnung: ordnungSchema,
  herkunft: herkunftSchema,
});
