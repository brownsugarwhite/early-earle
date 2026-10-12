// Dokumentformat des Wesen-Editors (Version 0). Ein Wesen = drei Profile + Größe + Posenliste.
// Die Posen tragen in Version 0 nur ihren Namen; das Bearbeiten der Posen folgt mit der Bauweise.
// Nachtrag 12.10. (Versuch, optional): Maul als 3D-Lippenlinien (zu und auf) und Zahnreihen. Jede Ansicht bearbeitet
// zwei Koordinaten eines Knotens (Seite x/y, Front z/y, Top x/z); Knoten 0 liegt auf der Mittelebene (z = 0).

import { z } from 'zod';
import { type Profil, START_RADIUS, startHalbkreis, startKreis } from './profil';

const V2 = z.object({ x: z.number(), y: z.number() });
const Knoten = z.object({ p: V2, ein: V2, aus: V2, art: z.enum(['glatt', 'ecke']) });

export const ProfilSchema = z.discriminatedUnion('art', [
  z.object({ art: z.literal('geschlossen'), knoten: z.array(Knoten).min(2) }),
  z.object({ art: z.literal('halb'), achse: z.enum(['senkrecht', 'waagerecht']), knoten: z.array(Knoten).min(2) }),
]);

const V3 = z.tuple([z.number(), z.number(), z.number()]);
const Knoten3Schema = z.object({ p: V3, ein: V3, aus: V3, art: z.enum(['glatt', 'ecke']) });
const Linie3Schema = z.object({ knoten: z.array(Knoten3Schema).min(2) });
const LippenSchema = z.object({ oben: Linie3Schema, unten: Linie3Schema.optional() });
const ZahnWerteSchema = z.object({
  laenge: z.number(),
  breite: z.number(),
  rundheit: z.number(),
  schaerfe: z.number(),
  neigung: z.number(),
  biegung: z.number(),
  spreizung: z.number(),
});
const ZahnSchema = ZahnWerteSchema.extend({ u: z.number(), aussen: z.boolean(), auf: ZahnWerteSchema.extend({ u: z.number() }).partial().optional() });
const ZahnreiheSchema = z.object({ anzahl: z.number().int().min(0).max(31), zaehne: z.array(ZahnSchema) });

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
  maul: z.object({ zu: LippenSchema, auf: LippenSchema.optional() }).optional(),
  zaehne: z.object({ oben: ZahnreiheSchema, unten: ZahnreiheSchema }).optional(),
});

export type V3T = [number, number, number];
export type Knoten3 = { p: V3T; ein: V3T; aus: V3T; art: 'glatt' | 'ecke' };
/** Offene 3D-Bézier-Linie (Griffe relativ zum Knoten), Knoten 0 auf der Mittelebene, letzter Knoten = Mundwinkel. */
export type Linie3 = { knoten: Knoten3[] };
/** Lippen der rechten Hälfte; `unten` fehlt = Kiefer gleich (Florians türkise Linie). */
export type Lippen = { oben: Linie3; unten?: Linie3 };
export type Maul = { zu: Lippen; auf?: Lippen };
export type ZahnWerte = { laenge: number; breite: number; rundheit: number; schaerfe: number; neigung: number; biegung: number; spreizung: number };
/** Ein Zahn der rechten Hälfte (u = 0 Mitte … 1 Mundwinkel); `auf` = Werte im offenen Zustand (z. B. größer). */
export type ZahnEintrag = ZahnWerte & { u: number; aussen: boolean; auf?: Partial<ZahnWerte & { u: number }> };
/** `anzahl` gilt für den ganzen Kiefer (beide Hälften); `zaehne` = rechte Hälfte, bei ungerader Zahl zuerst der Mittelzahn. */
export type Zahnreihe = { anzahl: number; zaehne: ZahnEintrag[] };
export type Zaehne = { oben: Zahnreihe; unten: Zahnreihe };

export type Dokument = {
  format: 'ee-wesen';
  version: 0;
  name: string;
  profile: { seite: Profil; front: Profil; top: Profil };
  skalierung: number;
  posen: PoseName[];
  maul?: Maul;
  zaehne?: Zaehne;
};

export type Ansicht = keyof Dokument['profile'];
export const ANSICHTEN: readonly Ansicht[] = ['seite', 'front', 'top'];

/** Jedes neue Wesen startet als Kugel aus drei Kreisen mit 4 Punkten (Seite) bzw. 3 (Front, Top), Größe 100 % (Florian, 11.10.2026). */
export function neuesDokument(name = 'Neues Wesen'): Dokument {
  const r = START_RADIUS;
  return {
    format: 'ee-wesen',
    version: 0,
    name,
    profile: {
      seite: startKreis({ x: 0, y: r }, r, 4),
      front: startHalbkreis({ x: 0, y: r }, r, 'senkrecht', 2),
      top: startHalbkreis({ x: 0, y: 0 }, r, 'waagerecht', 2),
    },
    skalierung: 1,
    posen: [],
  };
}

export function dokumentLesen(json: unknown): Dokument {
  return DokumentSchema.parse(json) as Dokument;
}
