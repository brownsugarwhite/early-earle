// Schemas zu typen/bild.ts: Verbindung, Effekt. Die Daten eines Effekts prüft das Schema seiner Art (arten/effekte.ts).
import { z } from 'zod';
import { artDatenSchema, herkunftSchema, kennungSchema, wertSchema } from './grund';

export const verbindungSchema = z.strictObject({
  id: kennungSchema('vb'),
  figur: kennungSchema('fig'),
  a: kennungSchema('teil', 'gr'),
  b: kennungSchema('teil', 'gr'),
  art: z.enum(['verschmelzen', 'fuge']),
  mass: wertSchema,
  nachKante: z.boolean(),
  herkunft: herkunftSchema,
});

export const effektSchema = z.strictObject({
  id: kennungSchema('ef'),
  besitzer: kennungSchema('fig', 'sz'),
  art: z.string().min(1),
  aktiv: z.boolean(),
  wo: z.array(z.union([kennungSchema('teil', 'gr', 'fig'), z.enum(['welt', 'kamera'])])),
  staerke: wertSchema,
  weichheit: wertSchema,
  profil: z.array(z.tuple([z.number(), z.number()])).exactOptional(),
  rauschen: z.strictObject({ koernung: z.number(), tempo: z.number() }).exactOptional(),
  zeit: z.enum(['fliessend', 'gestuft']).exactOptional(),
  daten: artDatenSchema,
  herkunft: herkunftSchema,
});
