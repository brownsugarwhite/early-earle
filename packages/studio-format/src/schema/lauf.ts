// Schemas zu typen/lauf.ts: Lauf-Datei und Eingaben.
import { z } from 'zod';
import { kennungSchema, punktSchema } from './grund';

const taktSchema = z.int().min(0);
export const eingabeEintragSchema = z.strictObject({
  takt: taktSchema,
  finger: z.strictObject({ an: z.boolean(), x: z.number(), y: z.number() }).exactOptional(),
  tippen: punktSchema.exactOptional(),
  knopf: z.string().exactOptional(),
});
export const laufDateiSchema = z.strictObject({
  format: z.literal('studio-lauf'),
  version: z.literal(1),
  szene: kennungSchema('sz'),
  inhalt: z.string(),
  saat: z.number(),
  takte: taktSchema,
  eingaben: z.array(eingabeEintragSchema),
  pruefsummen: z.array(z.tuple([taktSchema, z.int()])),
  merker: z.array(z.strictObject({ takt: taktSchema, notiz: z.string() })),
});
