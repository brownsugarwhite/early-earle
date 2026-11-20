// Schema zu typen/text.ts: Glyphentabelle einer Schrift (gebraucht ab M7.6).
import { z } from 'zod';
import { formSchema } from './form';
import { herkunftSchema, kennungSchema } from './grund';

export const schriftSchema = z.strictObject({
  id: kennungSchema('sf'),
  name: z.string(),
  quelle: z.string(),
  geviert: z.number(),
  glyphen: z.array(
    z.strictObject({
      zeichen: z.string(),
      vorschub: z.number(),
      konturen: z.array(z.strictObject({ form: formSchema, innen: z.boolean() })),
    }),
  ),
  unterschneidung: z.array(z.tuple([z.string(), z.string(), z.number()])),
  herkunft: herkunftSchema,
});
