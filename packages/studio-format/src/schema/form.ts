// Schemas zu typen/form.ts: Ankerzeilen, Formen, Versätze, Regler, Spiegelregel, Bindungen, Schlüssel, Wechsel.
// Eine Ankerzeile hat 5 Zahlen (glatt) oder 6 (Ecke); Winkel liegen in (−180°, 180°], Grifflängen sind ≥ 0 (3.6 Nr. 1).
import { z } from 'zod';
import { federSchema, herkunftSchema, kennungSchema } from './grund';

/** Richtung eines Griffs in Grad, im Bereich (−180, 180] */
export const winkelSchema = z.number().gt(-180).lte(180);
/** Grifflänge in Figur-Einheiten */
export const laengeSchema = z.number().min(0);

export const ankerGlattSchema = z.tuple([z.number(), z.number(), winkelSchema, laengeSchema, laengeSchema]);
export const ankerEckeSchema = z.tuple([z.number(), z.number(), winkelSchema, laengeSchema, winkelSchema, laengeSchema]);
export const ankerZeileSchema = z.union([ankerGlattSchema, ankerEckeSchema]);
export const formSchema = z.array(ankerZeileSchema);

export const versatzGlattSchema = z.tuple([z.number(), z.number(), z.number(), z.number(), z.number()]);
export const versatzEckeSchema = z.tuple([z.number(), z.number(), z.number(), z.number(), z.number(), z.number()]);
export const versatzZeileSchema = z.union([versatzGlattSchema, versatzEckeSchema]);

export const mischartSchema = z.enum(['rahmenRest', 'koordinaten', 'linear']);

export const spiegelregelSchema = z.strictObject({
  ab: z.number(),
  um: z.number(),
  achseX: z.number(),
  paare: z.array(z.tuple([kennungSchema('teil'), kennungSchema('teil')])),
  umnummern: z.array(z.strictObject({ teil: kennungSchema('teil'), folge: z.array(z.int().min(0)) })),
  reihenfolgeTauschen: z.boolean(),
  regler: z.array(z.strictObject({ regler: kennungSchema('rg'), um: z.number() })).exactOptional(),
});

export const reglerSchema = z.strictObject({
  id: kennungSchema('rg'),
  besitzer: kennungSchema('fig', 'sz'),
  name: z.string(),
  art: z.enum(['linie', 'kreis']),
  bereich: z.tuple([z.number(), z.number()]),
  standard: z.number(),
  einheit: z.enum(['grad', 'anteil', 'L', 'L/s', 's', 'figur', 'eins']),
  raster: z.number(),
  ausgleich: federSchema,
  hoechsttempo: z.number().exactOptional(),
  nachlauf: z.number().min(0).max(0.5).exactOptional(),
  spiegel: spiegelregelSchema.exactOptional(),
  rolle: z.string().exactOptional(),
  herkunft: herkunftSchema,
});

export const listenEintragSchema = z.strictObject({
  schluessel: kennungSchema('sl'),
  an: z.number(),
  gespiegelt: z.literal(true).exactOptional(),
});
export const bindungsAbschnittSchema = z.discriminatedUnion('art', [
  z.strictObject({ von: z.number(), bis: z.number(), art: z.literal('liste'), liste: z.array(listenEintragSchema) }),
  z.strictObject({ von: z.number(), bis: z.number(), art: z.literal('gespiegelt'), bindung: kennungSchema('bd'), um: z.number() }),
]);
export const spitzenfuehrungSchema = z.strictObject({
  von: z.number(),
  bis: z.number(),
  anker: z.array(kennungSchema('an')),
  rahmenVon: kennungSchema('sl'),
  rahmenBis: kennungSchema('sl'),
  gespiegelt: z.literal(true).exactOptional(),
});
export const bindungSchema = z.strictObject({
  id: kennungSchema('bd'),
  teil: kennungSchema('teil'),
  achsen: z.union([z.tuple([kennungSchema('rg')]), z.tuple([kennungSchema('rg'), kennungSchema('rg')])]),
  wirkung: z.enum(['ansicht', 'zusatz']),
  mischart: mischartSchema,
  periodisch: z.boolean(),
  abschnitte: z.array(bindungsAbschnittSchema).exactOptional(),
  spitzen: z.array(spitzenfuehrungSchema).exactOptional(),
  herkunft: herkunftSchema,
});

export const schluesselSchema = z.strictObject({
  id: kennungSchema('sl'),
  bindung: kennungSchema('bd'),
  an: z.union([z.tuple([z.number()]), z.tuple([z.number(), z.number()])]),
  art: z.enum(['form', 'falte']),
  gestalt: formSchema.exactOptional(),
  versatz: z.array(versatzZeileSchema).exactOptional(),
  herkunft: herkunftSchema,
  grund: z.string().exactOptional(),
  vorlage: kennungSchema('vl').exactOptional(),
  stuetze: z.literal(true).exactOptional(),
});

export const wechselSchema = z.strictObject({
  id: kennungSchema('we'),
  figur: kennungSchema('fig'),
  regler: kennungSchema('rg'),
  an: z.number(),
  richtung: z.enum(['ab', 'bis']),
  breite: z.number().min(0),
  art: z.enum(['ueber', 'unter', 'sichtbar', 'unsichtbar']),
  teil: kennungSchema('teil'),
  bezug: kennungSchema('teil').exactOptional(),
  herkunft: herkunftSchema,
});
