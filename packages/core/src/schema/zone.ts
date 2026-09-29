/**
 * ZoneSchema — minimal zone description for `content/zones/*.json`
 * (palette + level range). Vegetation and set-piece rules come with P2.
 */

import { z } from 'zod';
import { ZONE_IDS } from './level';

const Hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const ZoneSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.enum(ZONE_IDS),
  name: z.string().min(1),
  palette: z.object({
    sky: z.tuple([Hex, Hex]),
    terrainLight: Hex,
    terrainDark: Hex,
    ink: Hex,
    accents: z.array(Hex).min(1).max(4),
  }),
  levelRange: z.tuple([z.number().int().min(1), z.number().int().min(1)]),
  /** Material unlocked in this zone. */
  material: z.enum(['jelly', 'liquid', 'gas', 'fire']),
});

export type ZoneDef = z.infer<typeof ZoneSchema>;

export function parseZone(input: unknown): ZoneDef {
  return ZoneSchema.parse(input);
}
