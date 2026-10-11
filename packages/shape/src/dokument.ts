// Dokumentformat des Wesen-Editors (Version 0). Ein Wesen = drei Profile + Größe + Posenliste.
// Die Posen tragen in Version 0 nur ihren Namen; das Bearbeiten der Posen folgt mit der Bauweise.

import { z } from 'zod';
import { type Profil, START_RADIUS, startHalbkreis, startKreis } from './profil';

const V2 = z.object({ x: z.number(), y: z.number() });
const Knoten = z.object({ p: V2, ein: V2, aus: V2, art: z.enum(['glatt', 'ecke']) });

export const ProfilSchema = z.discriminatedUnion('art', [
  z.object({ art: z.literal('geschlossen'), knoten: z.array(Knoten).min(3) }),
  z.object({ art: z.literal('halb'), achse: z.enum(['senkrecht', 'waagerecht']), knoten: z.array(Knoten).min(2) }),
]);

/** Posen, die über „Neue Pose“ hinzukommen (Fressen ist immer da). */
export const POSEN = ['ruhen', 'laufen', 'inklusion'] as const;
export type PoseName = (typeof POSEN)[number];

export const SKALIERUNG_MIN = 0.25;
export const SKALIERUNG_MAX = 3;

export const DokumentSchema = z.object({
  format: z.literal('ee-wesen'),
  version: z.literal(0),
  name: z.string().min(1),
  profile: z.object({ seite: ProfilSchema, front: ProfilSchema, top: ProfilSchema }),
  skalierung: z.number().min(SKALIERUNG_MIN).max(SKALIERUNG_MAX),
  posen: z.array(z.enum(POSEN)),
});

export type Dokument = {
  format: 'ee-wesen';
  version: 0;
  name: string;
  profile: { seite: Profil; front: Profil; top: Profil };
  skalierung: number;
  posen: PoseName[];
};

export type Ansicht = keyof Dokument['profile'];
export const ANSICHTEN: readonly Ansicht[] = ['seite', 'front', 'top'];

/** Jedes neue Wesen startet als Kugel aus drei Kreisen, Größe 100 % (Florian, 11.10.2026). */
export function neuesDokument(name = 'Neues Wesen'): Dokument {
  const r = START_RADIUS;
  return {
    format: 'ee-wesen',
    version: 0,
    name,
    profile: {
      seite: startKreis({ x: 0, y: r }, r, 12),
      front: startHalbkreis({ x: 0, y: r }, r, 'senkrecht', 6),
      top: startHalbkreis({ x: 0, y: 0 }, r, 'waagerecht', 6),
    },
    skalierung: 1,
    posen: [],
  };
}

export function dokumentLesen(json: unknown): Dokument {
  return DokumentSchema.parse(json) as Dokument;
}
