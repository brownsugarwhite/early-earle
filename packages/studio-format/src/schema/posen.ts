// Schemas zu typen/posen.ts: Schicht, Pose, Übergang mit Taktleiste, Zyklus.
import { z } from 'zod';
import { artDatenSchema, federSchema, herkunftSchema, kennungSchema, kurveSchema, ordnungSchema } from './grund';

export const schichtSchema = z.strictObject({
  id: kennungSchema('sch'),
  figur: kennungSchema('fig'),
  name: z.string(),
  ordnung: ordnungSchema,
  art: z.enum(['ersetzen', 'addieren']),
  regler: z.array(kennungSchema('rg')),
  physik: z.boolean(),
  herkunft: herkunftSchema,
});

const reglerWertSchema = z.tuple([kennungSchema('rg'), z.number()]);
export const poseSchema = z.strictObject({
  id: kennungSchema('po'),
  schicht: kennungSchema('sch'),
  name: z.string(),
  ordnung: ordnungSchema,
  gruppe: z.string().exactOptional(),
  grundform: z.literal(true).exactOptional(),
  in: kennungSchema('ue').exactOptional(),
  werte: z.array(reglerWertSchema),
  kreuz: z.array(z.strictObject({ achse: kennungSchema('rg'), an: z.number(), werte: z.array(reglerWertSchema) })).exactOptional(),
  gewicht: kennungSchema('rg'),
  verweilen: kennungSchema('zy').exactOptional(),
  herkunft: herkunftSchema,
});

export const taktAbschnittSchema = z.strictObject({
  nach: kennungSchema('po'),
  dauer: z.union([z.number(), z.strictObject({ bis: z.string(), hoechstens: z.number() })]),
  kurve: kurveSchema,
});
export const zusatzbewegungSchema = z.strictObject({
  art: z.string().min(1),
  von: z.number(),
  bis: z.number(),
  staerke: z.union([z.number(), z.strictObject({ aus: z.string() })]),
  daten: artDatenSchema,
});
export const stehBalkenSchema = z.strictObject({ rolle: z.string(), von: z.number(), bis: z.number() });
export const markeSchema = z.strictObject({
  bei: z.number(),
  ereignis: z.string(),
  klang: kennungSchema('kl').exactOptional(),
  chance: z.number().exactOptional(),
});
export const spurSchema = z.strictObject({
  regler: kennungSchema('rg'),
  punkte: z.array(z.tuple([z.number(), z.number(), kurveSchema])),
});
export const taktleisteSchema = z.strictObject({
  abschnitte: z.array(taktAbschnittSchema),
  zusatz: z.array(zusatzbewegungSchema),
  steht: z.array(stehBalkenSchema),
  marken: z.array(markeSchema),
  spuren: z.array(spurSchema),
});

const poseOderJede = z.union([kennungSchema('po'), z.literal('jede')]);
export const uebergangSchema = z.strictObject({
  id: kennungSchema('ue'),
  schicht: kennungSchema('sch'),
  von: poseOderJede,
  nach: poseOderJede,
  art: z.enum(['standard', 'ueber', 'gestaltet', 'gesperrt', 'regie']),
  feder: federSchema.exactOptional(),
  ueber: z.array(kennungSchema('po')).exactOptional(),
  variante: z.strictObject({ name: z.string(), gewicht: z.number() }).exactOptional(),
  unterbrechen: z.enum(['sofort', 'halt', 'nie']),
  umkehrbar: z.boolean(),
  nachklang: z.number(),
  takt: taktleisteSchema.exactOptional(),
  herkunft: herkunftSchema,
});

export const zyklusZeileSchema = z.strictObject({
  an: z.number(),
  posen: z.array(z.strictObject({ bei: z.number(), pose: kennungSchema('po') })),
  kontakte: z.array(z.strictObject({ rolle: z.string(), von: z.number(), bis: z.number() })),
});
export const zyklusSchema = z.strictObject({
  id: kennungSchema('zy'),
  figur: kennungSchema('fig'),
  name: z.string(),
  phase: kennungSchema('rg'),
  antrieb: z.enum(['zeit', 'weg']),
  frequenz: z.number().exactOptional(),
  schritt: z.number().exactOptional(),
  zweite: kennungSchema('rg').exactOptional(),
  zeilen: z.array(zyklusZeileSchema),
  herkunft: herkunftSchema,
});
