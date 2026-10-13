// Dokumentformat des Wesen-Editors. Version 1 (Phase 1 / M1, 14.10.2026): drei Profile (Griffe), Größe, Posenliste und
// die **Ausstattung** (Absicht für den Bau: Maul, Beine, Stil, Kasten, Augen, Gesicht, Zonen; nur Daten, der Worker baut
// daraus deterministisch). Version 0 (ohne Ausstattung) wird beim Lesen migriert. Der Käfig selbst kommt ins Dokument,
// sobald Pinsel ihn verändern (M3). Ein Wesen = drei Profile + Größe + Posenliste.
// Die Posen tragen in Version 0 nur ihren Namen; das Bearbeiten der Posen folgt mit der Bauweise.
// Nachtrag 12.10. (Versuch, optional): Maul als 3D-Lippenlinien (zu und auf) und Zahnreihen. Jede Ansicht bearbeitet
// zwei Koordinaten eines Knotens (Seite x/y, Front z/y, Top x/z); Knoten 0 liegt auf der Mittelebene (z = 0).
// Nachtrag 12.10. mittags (Versuch, optional): Kantenlinien auf der Fläche mit Härte je Knoten (0 = mögliche Kante,
// ganz glatt; 1 = scharf) und Härte der Eckpunkte in den Profilen (Ecke einer Silhouette = Kante im 3D).

import { z } from 'zod';
import { type Profil, START_RADIUS, startHalbkreis, startKreis } from './profil';

const V2 = z.object({ x: z.number(), y: z.number() });
const Knoten = z.object({ p: V2, ein: V2, aus: V2, art: z.enum(['glatt', 'ecke']), haerte: z.number().min(0).max(1).optional() });

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
/** Ansicht, aus der eine Linie gezeichnet wurde (bestimmt, welche Fläche sie trifft, wenn sich die Form ändert). */
const BlickSchema = z.enum(['seite', 'front', 'hinten', 'top', 'unten']);
/** Spant: Querschnitt an der Stelle f (Anteil der Länge), halbes Profil normiert auf den Kasten aus Seite und Top. */
const SpantSchema = z.object({ f: z.number().min(0).max(1), profil: ProfilSchema });
const KanteSchema = z.object({ knoten: z.array(Knoten3Schema).min(2), haerte: z.array(z.number().min(0).max(1)), blick: BlickSchema, tiefe: z.number().optional() });
/** Spant der Bauweise „rund“ (Versuch 13.10. nachmittags): Strecke quer über ein Teil der Seite (Punkt und Richtung), Halbprofil. */
const RundSpantSchema = z.object({ p: V2, richtung: V2, profil: ProfilSchema, basis: ProfilSchema.optional(), kante: z.object({ index: z.number().int().min(0), knoten: z.number().int().min(0) }).optional() });

/** Maullinie in Wirbelsäulen-Koordinaten (Anteil f der Länge, Höhe v auf der Sprosse), Lippenanfang unter der Spitze. */
const MaulLinieSchema = z.object({ fv: z.array(z.object({ f: z.number(), v: z.number() })).min(2), unterSpitze: z.number().optional() });
const MaulOptionenSchema = z
  .object({
    reihen: z.number(),
    tiefe: z.number(),
    linse: z.number(),
    rachenTiefe: z.number(),
    rachenInnen: z.number(),
    schaedelHinter: z.number(),
    lippenSchaerfe: z.number(),
    band: z.number(),
    bandOben: z.number(),
    nackenGanz: z.boolean(),
    winkelUnten: z.number(),
    winkelOben: z.number(),
    oeffnungsart: z.enum(['kippen', 'ziehen']),
    zugWeite: z.number(),
    rille: z.number(),
    platte: z.number(),
    beutel: z.number(),
  })
  .partial();
/** Zone als Vektorform, relativ zu den Ruhe-Grenzen des Körpers (x, y 0 … 1), Weichheit je Punkt als Anteil der Höhe. */
const ZonenVorlageSchema = z.object({ ansicht: z.enum(['seite', 'top', 'front']), punkte: z.array(z.object({ x: z.number(), y: z.number(), weich: z.number().min(0) })).min(3) });
/**
 * Ausstattung (Version 1): die Absicht, aus der der Worker das Netz baut. Alles optional; was fehlt, gilt als „aus“ bzw. Standard.
 */
export const AusstattungSchema = z.object({
  maul: z.enum(['aus', 'vorn', 'unten', 'hals']).optional(),
  maulLinie: MaulLinieSchema.optional(),
  maulOptionen: MaulOptionenSchema.optional(),
  beine: z.enum(['aus', 'verschmolzen', 'angesteckt']).optional(),
  beinAnsaetze: z.array(z.object({ ring: z.number().int().min(0), j: z.number().int().min(0) })).optional(),
  stil: z.enum(['fest', 'feuer', 'gas', 'fell']).optional(),
  kasten: z.object({ fVorn: z.number(), fHinten: z.number(), fRund: z.number(), haerte: z.number() }).optional(),
  augen: z.object({ ring: z.number().int().min(0), j: z.number().int().min(0), groesse: z.number().min(0) }).optional(),
  gesicht: z.boolean().optional(),
  wangen: z.boolean().optional(),
  gesichtMaske: z.object({ voll: z.number(), aus: z.number(), oben: z.number() }).optional(),
  lippenBand: z.number().min(0).optional(),
  zonen: z.array(ZonenVorlageSchema).optional(),
});
/** Ausstattung als Typ mit exakten Optionalen (zod-Inferenz erlaubt `undefined`, das passt nicht zu `exactOptionalPropertyTypes`). */
export type ZonenVorlage = { ansicht: 'seite' | 'top' | 'front'; punkte: { x: number; y: number; weich: number }[] };
export type MaulOptionenWerte = {
  reihen: number;
  tiefe: number;
  linse: number;
  rachenTiefe: number;
  rachenInnen: number;
  schaedelHinter: number;
  lippenSchaerfe: number;
  band: number;
  bandOben: number;
  nackenGanz: boolean;
  winkelUnten: number;
  winkelOben: number;
  oeffnungsart: 'kippen' | 'ziehen';
  zugWeite: number;
  rille: number;
  platte: number;
  beutel: number;
};
export type Ausstattung = {
  maul?: 'aus' | 'vorn' | 'unten' | 'hals';
  maulLinie?: { fv: { f: number; v: number }[]; unterSpitze?: number };
  maulOptionen?: Partial<MaulOptionenWerte>;
  beine?: 'aus' | 'verschmolzen' | 'angesteckt';
  beinAnsaetze?: { ring: number; j: number }[];
  stil?: 'fest' | 'feuer' | 'gas' | 'fell';
  kasten?: { fVorn: number; fHinten: number; fRund: number; haerte: number };
  augen?: { ring: number; j: number; groesse: number };
  gesicht?: boolean;
  wangen?: boolean;
  gesichtMaske?: { voll: number; aus: number; oben: number };
  lippenBand?: number;
  zonen?: ZonenVorlage[];
};

/** Posen, die über „Neue Pose“ hinzukommen (Fressen ist immer da). */
export const POSEN = ['ruhen', 'laufen', 'inklusion'] as const;
export type PoseName = (typeof POSEN)[number];

export const SKALIERUNG_MIN = 0.25;
export const SKALIERUNG_MAX = 3;

const DokumentFelder = {
  format: z.literal('ee-wesen'),
  name: z.string().min(1),
  profile: z.object({ seite: ProfilSchema, front: ProfilSchema, top: ProfilSchema }),
  skalierung: z.number().min(SKALIERUNG_MIN).max(SKALIERUNG_MAX),
  posen: z.array(z.enum(POSEN)),
  maul: z.object({ zu: LippenSchema, auf: LippenSchema.optional() }).optional(),
  zaehne: z.object({ oben: ZahnreiheSchema, unten: ZahnreiheSchema }).optional(),
  kanten: z.array(KanteSchema).optional(),
  spanten: z.array(SpantSchema).optional(),
  hauptspant: z.number().min(0).max(1).optional(),
  wirbelsaeule: Linie3Schema.optional(),
  posenProfile: z.record(z.string(), z.object({ seite: ProfilSchema.optional() })).optional(),
  rundSpanten: z.array(RundSpantSchema).optional(),
};
/** Version 0 (bis 14.10.2026): ohne Ausstattung. */
export const DokumentSchemaV0 = z.object({ ...DokumentFelder, version: z.literal(0) });
/** Käfig-Delta (M3, Pinsel): Versatz eines Käfigpunkts der Vorlage (rechte Hälfte oder Naht), Profil-Einheiten. */
const KaefigDeltaSchema = z.object({ punkt: z.number().int().min(0), d: V3 });
/** Käfig-Deltas der Grundform und je Pose (M3: „fressen“ = offenes Maul, mit der Öffnung überblendet; Plan 5.2). */
const KaefigSchema = z.object({ deltas: z.array(KaefigDeltaSchema), posen: z.record(z.string(), z.array(KaefigDeltaSchema)).optional() });
/** Version 1: mit Ausstattung und (M3) Käfig-Deltas der Pinsel. */
export const DokumentSchema = z.object({ ...DokumentFelder, version: z.literal(1), ausstattung: AusstattungSchema.optional(), kaefig: KaefigSchema.optional() });

export type V3T = [number, number, number];
export type Knoten3 = { p: V3T; ein: V3T; aus: V3T; art: 'glatt' | 'ecke' };
/** Offene 3D-Bézier-Linie (Griffe relativ zum Knoten), Knoten 0 auf der Mittelebene, letzter Knoten = Mundwinkel. */
export type Linie3 = { knoten: Knoten3[] };
export type KaefigDelta = { punkt: number; d: [number, number, number] };
/** Lippen der rechten Hälfte; `unten` fehlt = Kiefer gleich (Florians türkise Linie). */
export type Lippen = { oben: Linie3; unten?: Linie3 };
export type Maul = { zu: Lippen; auf?: Lippen };
export type ZahnWerte = { laenge: number; breite: number; rundheit: number; schaerfe: number; neigung: number; biegung: number; spreizung: number };
/** Ein Zahn der rechten Hälfte (u = 0 Mitte … 1 Mundwinkel); `auf` = Werte im offenen Zustand (z. B. größer). */
export type ZahnEintrag = ZahnWerte & { u: number; aussen: boolean; auf?: Partial<ZahnWerte & { u: number }> };
/** `anzahl` gilt für den ganzen Kiefer (beide Hälften); `zaehne` = rechte Hälfte, bei ungerader Zahl zuerst der Mittelzahn. */
export type Zahnreihe = { anzahl: number; zaehne: ZahnEintrag[] };
export type Zaehne = { oben: Zahnreihe; unten: Zahnreihe };
/** Blickrichtung einer Ansicht: Front/Back und Top/Bottom zeigen dieselbe Silhouette, aber verschiedene Flächen. */
export type Blick = 'seite' | 'front' | 'hinten' | 'top' | 'unten';
/**
 * Kantenlinie auf der Fläche (gespiegelt an z = 0 wie die Maullinien): 3D-Bézier, Härte je Knoten, entlang der Linie
 * verlaufend (0 = mögliche Kante, Übergang ganz glatt, gestrichelt 1 px; 1 = scharf, schwarz 3 px).
 */
/**
 * Spant (Versuch 12.10. nachmittags): Querschnitt an der Stelle f (Anteil der Länge der Seite), halbes Profil mit der
 * Punktstruktur der Front, normiert auf den Kasten an dieser Stelle (Breite 0…1 ab der Achse, Höhe 0…1).
 */
export type Spant = { f: number; profil: Profil };
export type Kante = {
  knoten: Knoten3[];
  haerte: number[];
  blick: Blick;
  /**
   * Tiefe (Versuch, Recherche 12.10.): Versatz der Fläche an der Linie, + = Grat nach außen, − = Rinne nach innen
   * (Kachel). Mit Härte 0 eine weiche Mulde bzw. ein weicher Wulst, mit 100 % ein scharfer Grat bzw. eine scharfe Rinne.
   */
  tiefe?: number;
};

export type Dokument = {
  format: 'ee-wesen';
  version: 1;
  name: string;
  profile: { seite: Profil; front: Profil; top: Profil };
  skalierung: number;
  posen: PoseName[];
  /** Version 1: Absicht für den Bau (Maul, Beine, Stil, Kasten, Augen, Gesicht, Zonen); fehlt = Standardkörper */
  ausstattung?: Ausstattung;
  /**
   * M3 (Pinsel): Versätze von Käfigpunkten der Vorlage (Index < Punktzahl der Röhre; rechte Hälfte oder Naht, die linke
   * Hälfte spiegelt der Kern), Profil-Einheiten, auf den abgeleiteten Käfig addiert. Fehlt = unberührt.
   */
  kaefig?: { deltas: KaefigDelta[]; posen?: Record<string, KaefigDelta[]> };
  maul?: Maul;
  zaehne?: Zaehne;
  kanten?: Kante[];
  spanten?: Spant[];
  /** Stelle des Hauptspants (Front); fehlt = dickste Stelle */
  hauptspant?: number;
  /**
   * Versuch 12.10. nachts: selbst gezeichnete Wirbelsäule (Seite, z = 0) für die Bauweise „Wirbelsäule“; fehlt = aus dem
   * Umriss vorgeschlagen.
   */
  wirbelsaeule?: Linie3;
  /**
   * Versuch 12.10. nachts: Seitenform je Pose (Schlüssel „fressen“ bzw. Posenname), gleiche Punktstruktur wie
   * `profile.seite`. Fehlt sie, folgt die Pose dem Kiefer.
   */
  posenProfile?: Record<string, { seite?: Profil }>;
  /**
   * Versuch 13.10. nachmittags: Spanten der Bauweise „rund“, je eine Strecke quer über ein Teil der Seite (Punkt und
   * Richtung; die Enden liegen auf dem Umriss) mit Halbprofil (u = Breite, 1 = runder Körper; v = Lage auf der Strecke).
   */
  rundSpanten?: {
    p: { x: number; y: number };
    richtung: { x: number; y: number };
    profil: Profil;
    /** Profil beim Anlegen (gewirkt wird das Verhältnis Profil / Basis; fehlt sie, der runde Querschnitt) */
    basis?: Profil;
    /** Versuch 13.10. abends: Spant an einem Knoten einer Kantenlinie; Knoten 3 des Profils (Mitte von sieben) ist der Kantenpunkt */
    kante?: { index: number; knoten: number };
  }[];
};

export type Ansicht = keyof Dokument['profile'];
export const ANSICHTEN: readonly Ansicht[] = ['seite', 'front', 'top'];

/** Jedes neue Wesen startet als Kugel aus drei Kreisen mit 4 Punkten (Seite) bzw. 3 (Front, Top), Größe 100 % (Florian, 11.10.2026). */
export function neuesDokument(name = 'Neues Wesen'): Dokument {
  const r = START_RADIUS;
  return {
    format: 'ee-wesen',
    version: 1,
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

/** Lesen mit Migration: Version 0 wird zu Version 1 (ohne Ausstattung; die Prüfwesen-Anteile ergänzt der Editor über den Namen). */
export function dokumentLesen(json: unknown): Dokument {
  const v = (json as { version?: unknown } | null)?.version;
  if (v === 0) {
    const alt = DokumentSchemaV0.parse(json);
    return { ...alt, version: 1 } as Dokument;
  }
  return DokumentSchema.parse(json) as Dokument;
}
