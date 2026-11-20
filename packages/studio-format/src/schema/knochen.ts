// Schemas zu typen/knochen.ts: Knochen, Anheftung, Biegeachse, Aufhängung, Griffsatz.
import { z } from 'zod';
import { herkunftSchema, kennungSchema, punktSchema } from './grund';

export const anheftungSchema = z.strictObject({
  teil: kennungSchema('teil'),
  anker: z.array(kennungSchema('an')),
  gewichte: z.array(z.number()),
});
export const biegeachseSchema = z.strictObject({
  laenge: z.number(),
  abstand: kennungSchema('rg'),
  biegungWurzel: kennungSchema('rg'),
  biegungEnde: kennungSchema('rg'),
  beugung: z.union([z.literal(1), z.literal(-1)]),
  boden: z.boolean(),
  rMin: z.number(),
});
export const knochenSchema = z.strictObject({
  id: kennungSchema('kn'),
  figur: kennungSchema('fig'),
  name: z.string(),
  eltern: kennungSchema('kn').exactOptional(),
  gelenk: punktSchema,
  winkel: kennungSchema('rg'),
  verschiebung: z.tuple([kennungSchema('rg'), kennungSchema('rg')]).exactOptional(),
  anheftung: anheftungSchema.exactOptional(),
  achse: biegeachseSchema.exactOptional(),
  rolle: z.string().exactOptional(),
  gepinnt: z.literal(true).exactOptional(),
  herkunft: herkunftSchema,
});

/** [Index in Aufhaengung.knochen, Gewicht] */
const gewichtPaarSchema = z.tuple([z.int().min(0), z.number()]);
export const griffSatzSchema = z.union([
  z.strictObject({ paar: z.array(gewichtPaarSchema) }),
  z.strictObject({ ein: z.array(gewichtPaarSchema), aus: z.array(gewichtPaarSchema) }),
]);
export const aufhaengungSchema = z.strictObject({
  id: kennungSchema('af'),
  teil: kennungSchema('teil'),
  art: z.enum(['starr', 'achse', 'gewichte']),
  knochen: z.array(kennungSchema('kn')),
  gewichte: z.array(z.array(gewichtPaarSchema)).exactOptional(),
  griffe: z.array(z.union([griffSatzSchema, z.literal('erben')])).exactOptional(),
  mischung: z.enum(['drehzentren', 'linear']),
  gepinnt: z.array(kennungSchema('an')),
  herkunft: herkunftSchema,
});
