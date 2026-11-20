// Schemas zu typen/welt.ts: Welt, Stoff, Szene, Ding.
import { z } from 'zod';
import { dateiNameSchema, federSchema, herkunftSchema, kennungSchema, ordnungSchema, wertSchema } from './grund';

export const stoffSchema = z.strictObject({
  name: z.string().min(1),
  haftung: wertSchema,
  rollwiderstand: z.number(),
  abprall: z.number(),
});
export const weltSchema = z.strictObject({
  id: kennungSchema('welt'),
  name: z.string(),
  schwerkraft: z.number(),
  huegel: kennungSchema('fig'),
  rad: z.strictObject({
    radius: z.number(),
    gewicht: z.union([z.number(), z.literal('boden')]),
    lagerreibung: z.number(),
    griff: z.strictObject({ feder: federSchema, hoechstkraft: z.number() }),
  }),
  stoffe: z.array(stoffSchema),
  standardStoff: z.string(),
  herkunft: herkunftSchema,
});
export const szeneSchema = z.strictObject({
  id: kennungSchema('sz'),
  name: z.string(),
  datei: dateiNameSchema,
  welt: kennungSchema('welt'),
  saat: z.number(),
  rahmen: kennungSchema('di').exactOptional(),
  kamera: kennungSchema('di').exactOptional(),
  musik: kennungSchema('di').exactOptional(),
  herkunft: herkunftSchema,
});
export const dingSchema = z.strictObject({
  id: kennungSchema('di'),
  szene: kennungSchema('sz'),
  name: z.string(),
  figur: kennungSchema('fig'),
  art: z.string().exactOptional(),
  rolle: z.enum(['figur', 'fest', 'lose', 'zone', 'bild', 'rahmen']),
  lage: z.strictObject({ winkel: z.number(), hoehe: z.number(), drehung: z.number() }),
  breite: z.number().exactOptional(),
  stoff: z.string().exactOptional(),
  ebene: ordnungSchema,
  herkunft: herkunftSchema,
});
