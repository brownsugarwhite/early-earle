// Schemas zu typen/projekt.ts: Projekt, Vorlage, Klang. Felder in der Reihenfolge des Typs (sie ist die Reihenfolge in der Datei, 3.5).
import { z } from 'zod';
import { dateiNameSchema, herkunftSchema, kennungSchema } from './grund';

export const projektQuelleSchema = z.strictObject({
  art: z.literal('prototyp-schluessel'),
  datei: z.string().min(1),
  figur: kennungSchema('fig'),
  zuordnung: z.array(z.tuple([z.string(), kennungSchema('bd')])),
});
export const projektFassungSchema = z.strictObject({
  id: z.string(),
  geraet: z.string(),
  zeit: z.iso.datetime({ offset: true }),
  sicherung: z.string(),
});
export const projektSchema = z.strictObject({
  id: kennungSchema('prj'),
  name: z.string(),
  figuren: z.array(dateiNameSchema),
  szenen: z.array(dateiNameSchema),
  start: kennungSchema('sz').exactOptional(),
  quellen: z.array(projektQuelleSchema).exactOptional(),
  umgezogen: z.array(z.string()).exactOptional(),
  fassungen: z.array(projektFassungSchema).exactOptional(),
  uebergangen: z.array(z.string()).exactOptional(),
  herkunft: herkunftSchema,
});

export const vorlageSchema = z.strictObject({
  id: kennungSchema('vl'),
  name: z.string(),
  datei: z.string().min(1),
  hash: z.string().min(1),
  quelle: z.string().exactOptional(),
  herkunft: herkunftSchema,
});

export const klangSchema = z.strictObject({
  id: kennungSchema('kl'),
  name: z.string(),
  dateien: z.array(z.string().min(1)),
  lautstaerke: z.number(),
  streuung: z.strictObject({ ton: z.number(), laut: z.number() }),
  mindestabstand: z.number(),
  stimmen: z.int().min(1),
  herkunft: herkunftSchema,
});
