// Schemas zu typen/physik.ts: Physik-Chip, Hülle, Körpermodell.
import { z } from 'zod';
import { artDatenSchema, federSchema, herkunftSchema, kennungSchema, punktSchema } from './grund';

export const physikChipSchema = z.strictObject({
  id: kennungSchema('ch'),
  an: kennungSchema('teil', 'kn', 'rg', 'fig', 'di'),
  art: z.string().min(1),
  aktiv: z.boolean(),
  feder: federSchema,
  ausgang: kennungSchema('rg').exactOptional(),
  mehr: z.strictObject({
    schwerkraft: z.number().exactOptional(),
    wind: z.number().exactOptional(),
    grenzen: z.tuple([z.number(), z.number()]).exactOptional(),
    spitze: z.number().exactOptional(),
  }),
  daten: artDatenSchema,
  herkunft: herkunftSchema,
});

/**
 * Höchstzahl der Punkte eines Vielecks, gezählt vor der Hülle: Box2D rechnet die Hülle nur bis zu 8 Punkten, auch wenn sie weniger Ecken
 * hätte. Gleich `VIELECK_PUNKTE` im Vertrag der Welt (studio-laufzeit/src/vertrag/welt.ts); ein Test der Laufzeit hält beide gleich.
 */
export const VIELECK_HOECHSTENS = 8;

/** Hüllen, wie die Welt sie annimmt: Vielecke mit 3 bis 8 Punkten, Ketten mit mindestens 2 Punkten, Schleifen mit mindestens 3. */
export const huelleSchema = z.union([
  z.strictObject({ kreis: z.strictObject({ mitte: punktSchema, r: z.number() }) }),
  z.strictObject({ kapsel: z.strictObject({ a: punktSchema, b: punktSchema, r: z.number() }) }),
  z.strictObject({ vieleck: z.strictObject({ punkte: z.array(punktSchema).min(3).max(VIELECK_HOECHSTENS), rundung: z.number() }) }),
  z.strictObject({
    kette: z
      .strictObject({ punkte: z.array(punktSchema).min(2), schleife: z.boolean() })
      .refine((k) => !k.schleife || k.punkte.length >= 3, { message: 'Eine Schleife braucht mindestens 3 Punkte.' }),
  }),
]);

const grenzenSchema = z.tuple([z.number(), z.number()]);
export const koerpermodellSchema = z.strictObject({
  id: kennungSchema('km'),
  figur: kennungSchema('fig'),
  koerper: z.array(
    z.strictObject({
      rolle: z.string(),
      knochen: kennungSchema('kn'),
      huelle: huelleSchema,
      masseAnteil: z.number(),
      gelenk: z.strictObject({ an: z.string(), punkt: punktSchema, grenzen: grenzenSchema.exactOptional() }).exactOptional(),
      abweichung: z.array(z.strictObject({ regler: kennungSchema('rg'), groesse: z.enum(['winkel', 'laengs', 'quer']) })).exactOptional(),
    }),
  ),
  federbeine: z.array(
    z.strictObject({
      rolle: z.string(),
      koerper: z.string(),
      achse: kennungSchema('kn'),
      von: punktSchema,
      laenge: z.number(),
      feder: federSchema,
    }),
  ),
  glieder: z.array(
    z.strictObject({
      rolle: z.string(),
      knochen: kennungSchema('kn'),
      huelle: huelleSchema,
      an: z.string(),
      punkt: punktSchema,
      grenzen: grenzenSchema.exactOptional(),
    }),
  ),
  herkunft: herkunftSchema,
});
