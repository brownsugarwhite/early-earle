// Schemas zu typen/ton.ts: Klang-Chip.
import { z } from 'zod';
import { herkunftSchema, kennungSchema, wertSchema } from './grund';

export const klangChipSchema = z.strictObject({
  id: kennungSchema('kc'),
  an: kennungSchema('teil', 'fig', 'di', 'ue'),
  klang: kennungSchema('kl'),
  ausloeser: z.union([
    z.strictObject({ marke: z.string() }),
    z.strictObject({ kontakt: z.strictObject({ mindest: z.number() }) }),
    z.strictObject({ zustand: z.string() }),
    z.strictObject({ draht: kennungSchema('dr') }),
  ]),
  lautstaerke: z.union([wertSchema, z.strictObject({ aus: z.string() })]),
  aktiv: z.boolean(),
  herkunft: herkunftSchema,
});
