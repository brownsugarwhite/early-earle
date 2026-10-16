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
import { type Knoten as ProfilKnoten, type Profil, START_RADIUS, startHalbkreis, startKreis } from './profil';

const V2 = z.object({ x: z.number(), y: z.number() });
const Knoten = z.object({ p: V2, ein: V2, aus: V2, art: z.enum(['glatt', 'ecke']), haerte: z.number().min(0).max(1).optional(), marke: z.enum(['maul', 'maulOben', 'maulUnten']).optional() });

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
  // Phase 2 M4 (Plan 5.3 „Rotation“, „Größe“): Drehung um die eigene Achse (Grad), Faktor auf Länge, Breite, Tiefe
  drehung: z.number().optional(),
  groesse: z.number().optional(),
  // Florian 15.10.: vor/zurück quer zum Zahnfleisch (Kachel, + zur Lippe); Schärfe unter 0 = Blob ohne Spitze
  vor: z.number().optional(),
});
const ZahnSchema = ZahnWerteSchema.extend({ u: z.number(), aussen: z.boolean(), auf: ZahnWerteSchema.extend({ u: z.number() }).partial().optional() });
const ZahnreiheSchema = z.object({ anzahl: z.number().int().min(0).max(31), zaehne: z.array(ZahnSchema) });
/** Ansicht, aus der eine Linie gezeichnet wurde (bestimmt, welche Fläche sie trifft, wenn sich die Form ändert). */
const BlickSchema = z.enum(['seite', 'front', 'hinten', 'top', 'unten']);
/**
 * Spant: Querschnitt an der Stelle f (Anteil der Länge), halbes Profil normiert auf den Kasten aus Seite und Top.
 * `unten` (Kiefer-Spant, 14.10.): Querschnitt des Unterkiefers, wenn der Spant in der Seite über beiden Kiefern liegt.
 */
const SpantSchema = z.object({ f: z.number().min(0).max(1), profil: ProfilSchema, unten: ProfilSchema.optional() });
const KanteSchema = z.object({ knoten: z.array(Knoten3Schema).min(2), haerte: z.array(z.number().min(0).max(1)), blick: BlickSchema, tiefe: z.number().optional() });
/** Spant der Bauweise „rund“ (Versuch 13.10. nachmittags): Strecke quer über ein Teil der Seite (Punkt und Richtung), Halbprofil. */
const RundSpantSchema = z.object({ p: V2, richtung: V2, profil: ProfilSchema, basis: ProfilSchema.optional(), kante: z.object({ index: z.number().int().min(0), knoten: z.number().int().min(0) }).optional() });

/** Maullinie in Wirbelsäulen-Koordinaten (Anteil f der Länge, Höhe v auf der Sprosse), Lippenanfang unter der Spitze. */
const MaulLinieSchema = z.object({ fv: z.array(z.object({ f: z.number(), v: z.number() })).min(2), unterSpitze: z.number().optional(), anfang: z.object({ x: z.number(), y: z.number() }).optional(), winkel: z.object({ x: z.number(), y: z.number() }).optional(), winkelZ: z.number().optional(), front: z.array(z.object({ z: z.number(), y: z.number() })).optional(), unten: z.array(z.object({ f: z.number(), v: z.number(), z: z.number().optional(), innen: z.number().optional() })).optional(), oben: z.array(z.object({ f: z.number(), v: z.number(), z: z.number().optional(), innen: z.number().optional() })).optional() });
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
    haps: z.number(),
    hapsTiefe: z.number(),
    hapsHoehe: z.number(),
    hapsWeite: z.number(),
    hapsRadius: z.number(),
    gewichte: z.enum(['winkel', 'ringe']),
    gelenk: z.tuple([z.number(), z.number()]),
    kieferWinkel: z.tuple([z.number(), z.number()]),
    kieferReichweite: z.tuple([z.number(), z.number()]),
    kieferZug: z.tuple([z.number(), z.number()]),
    schaedelGelenk: z.tuple([z.number(), z.number()]),
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
  ring: z.number().int().min(8).max(64).optional(),
  maulOptionen: MaulOptionenSchema.optional(),
  beine: z.enum(['aus', 'verschmolzen', 'angesteckt']).optional(),
  beinAnsaetze: z.array(z.object({ ring: z.number().int().min(0), j: z.number().int().min(0) })).optional(),
  stil: z.enum(['fest', 'feuer', 'gas', 'fell']).optional(),
  kasten: z.object({ fVorn: z.number(), fHinten: z.number(), fRund: z.number(), haerte: z.number() }).optional(),
  // Phase 2 M5 (Plan 5.4): Art, Grundform, Seitenverhältnis, Drehung, Farbe; Lage als Punkt der Ruhelage (gleitet auf die
  // Haut) oder Ring/Winkel; `mitte` = ein Auge auf der Mittelnaht statt eines Paars
  augen: z
    .object({
      ring: z.number().int().min(0),
      j: z.number().int().min(0),
      groesse: z.number().min(0),
      art: z.enum(['gemalt', 'glubsch', 'augapfel']).optional(),
      form: z.enum(['schlitz', 'knopf', 'mandel']).optional(),
      breite: z.number().min(0.1).max(4).optional(),
      drehung: z.number().optional(),
      punkt: z.tuple([z.number(), z.number(), z.number()]).optional(),
      mitte: z.boolean().optional(),
      farbe: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
      tiefe: z.number().min(0).max(1).optional(),
    })
    .optional(),
  gesicht: z.boolean().optional(),
  wangen: z.boolean().optional(),
  gesichtMaske: z.object({ voll: z.number(), aus: z.number(), oben: z.number() }).optional(),
  lippenBand: z.number().min(0).optional(),
  zonen: z.array(ZonenVorlageSchema).optional(),
  // Phase 2 M4 (Plan 5.3): eine Farbe für alle Zähne (Hex), Verlauf Wurzel → Spitze im Material
  zahnFarbe: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  // Phase 2 M6: Rundmaul (O-Maul an der Körperspitze statt Schlitz); Lippenradius zu/offen als Anteil der Höhe
  // Florian 15.10.: O zu = 0 = geschlossen unsichtbar; `punkt` = Lage der Mitte (Profileinheiten in Ruhe, rastet auf einen
  // Käfigpunkt der Spiegelebene vorn)
  rundmaul: z.object({ zu: z.number().min(0).max(0.5).optional(), auf: z.number().min(0).max(0.5).optional(), zaehne: z.number().int().min(0).max(40).optional(), punkt: V3.optional() }).optional(),
  // Plan „Liniennetz, Zielform, Käfig“, S2: glatte Haut (Ausgleich mit Glättungsmaß, `GLATTE_HAUT`); fehlt = heutiger Bau
  glatt: z.boolean().optional(),
  // S3 „Umrisse berühren“ mit der Fülle der Stufe (rund, mittel, genau); fehlt = kein Berühren (heutiger Bau)
  fuelle: z.enum(['rund', 'mittel', 'genau']).optional(),
  // S5 „Mittelebenen-Baum“: Körper aus Streifen der Seitenfläche (`teile`; bis S7 als Geist neben dem heutigen Körper)
  koerper: z.enum(['roehre', 'teile']).optional(),
});
/** Ausstattung als Typ mit exakten Optionalen (zod-Inferenz erlaubt `undefined`, das passt nicht zu `exactOptionalPropertyTypes`). */
export type ZonenVorlage = { ansicht: 'seite' | 'top' | 'front'; punkte: { x: number; y: number; weich: number }[] };
/**
 * Augen (Phase 2 M5, Plan 5.4): `art` gemalt (Abstandsform im Körpermaterial), glubsch (Kugel angedockt), augapfel (im
 * Netz); `form` die Grundform offen (schlitz, knopf, mandel); `breite` Seitenverhältnis (1 = Grundform), `drehung` in Grad;
 * Lage über `punkt` (Ruhelage, gleitet auf die nächste Stelle der Haut) oder Ring `ring`/Winkel `j` des Käfigs; `mitte` =
 * ein Auge auf der Mittelnaht (Zyklop wie PezenPez) statt eines gespiegelten Paars; `farbe` überschreibt die Palette;
 * `tiefe` (Glubschauge, Augapfel) = Anteil des Durchmessers, der in der Haut steckt (0 aufgesetzt … 0,5 halb … 1 ganz).
 */
export type AugenWerte = {
  ring: number;
  j: number;
  groesse: number;
  art?: 'gemalt' | 'glubsch' | 'augapfel';
  form?: 'schlitz' | 'knopf' | 'mandel';
  breite?: number;
  drehung?: number;
  punkt?: [number, number, number];
  mitte?: boolean;
  farbe?: string;
  tiefe?: number;
};
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
  haps: number;
  hapsTiefe: number;
  hapsHoehe: number;
  hapsWeite: number;
  hapsRadius: number;
  gewichte: 'winkel' | 'ringe';
  gelenk: [number, number];
  kieferWinkel: [number, number];
  kieferReichweite: [number, number];
  kieferZug: [number, number];
  /** Schädelgelenk (Plan 5.2, Griff im Rig): Versatz gegen das automatische Gelenk in Maullängen (x nach hinten, y nach oben) */
  schaedelGelenk: [number, number];
};
export type Ausstattung = {
  maul?: 'aus' | 'vorn' | 'unten' | 'hals';
  maulLinie?: { fv: { f: number; v: number }[]; unterSpitze?: number; anfang?: { x: number; y: number }; winkel?: { x: number; y: number }; winkelZ?: number; front?: { z: number; y: number }[]; unten?: { f: number; v: number; z?: number; innen?: number }[]; oben?: { f: number; v: number; z?: number; innen?: number }[] };
  /** Punkte je Ring des Käfigs (Standard 16; 24 für Kastenfronten mit Plattenmaul: 6×6-Plattengitter). Fest ab dem Anlegen (Deltas und Stationen hängen daran). */
  ring?: number;
  maulOptionen?: Partial<MaulOptionenWerte>;
  beine?: 'aus' | 'verschmolzen' | 'angesteckt';
  beinAnsaetze?: { ring: number; j: number }[];
  stil?: 'fest' | 'feuer' | 'gas' | 'fell';
  kasten?: { fVorn: number; fHinten: number; fRund: number; haerte: number };
  augen?: AugenWerte;
  gesicht?: boolean;
  wangen?: boolean;
  gesichtMaske?: { voll: number; aus: number; oben: number };
  lippenBand?: number;
  zonen?: ZonenVorlage[];
  /** Phase 2 M4: eine Farbe für alle Zähne (Hex), Verlauf Wurzel → Spitze im Material */
  zahnFarbe?: string;
  /**
   * Rundmaul (Phase 2 M6): O-Maul vorn auf der Spiegelebene; Lippenradius zu/offen als Anteil der Höhe (zu = 0: geschlossen
   * unsichtbar), Zähne rundum (Anzahl), Lage der Mitte (Profileinheiten in Ruhe; fehlt: Kappenmitte)
   */
  rundmaul?: { zu?: number; auf?: number; zaehne?: number; punkt?: [number, number, number] };
  /**
   * Plan „Liniennetz, Zielform, Käfig“, S2 (16.10.): glatte Haut — der Käfig-Ausgleich mit Glättungsmaß (`GLATTE_HAUT`)
   * statt der Interpolation der Ziele; fehlt = heutiger Bau (bitgleich). Mit Maul oder Beinen noch ohne Wirkung.
   */
  glatt?: boolean;
  /**
   * S3 „Umrisse berühren“ (16.10.; Florian: Fülle mittel): Wo der Körper hinter der Front zurückbleibt, schiebt sich der
   * Ring dort örtlich hinaus; die Form höchstens rund (Ellipse), mittel (weicher Kasten) oder genau (bis zur Kante).
   * Fehlt = kein Berühren (heutiger Bau, bitgleich). Mit Maul oder Beinen noch ohne Wirkung.
   */
  fuelle?: 'rund' | 'mittel' | 'genau';
  /**
   * Plan „Liniennetz, Zielform, Käfig“, S5 (16.10.): Körper aus dem Mittelebenen-Baum (Streifen der Seitenfläche,
   * `kern/grundkoerper/baumBau.ts`); bis zum Einbau (S7) zeigt der Editor ihn als Geist neben dem heutigen Körper. Fehlt
   * oder `roehre` = heutiger Bau.
   */
  koerper?: 'roehre' | 'teile';
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
  teile: z
    .array(
      z.object({
        teil: z.string(),
        ansicht: z.enum(['seite', 'front', 'top']),
        a: z.object({ k: z.number(), t: z.number(), p: V2 }).optional(),
        b: z.object({ k: z.number(), t: z.number(), p: V2 }).optional(),
        knotenzahl: z.number(),
        knoten: z.array(Knoten).min(2),
        zu: z.boolean().optional(),
      }),
    )
    .optional(),
};
/** Version 0 (bis 14.10.2026): ohne Ausstattung. */
export const DokumentSchemaV0 = z.object({ ...DokumentFelder, version: z.literal(0) });
/** Käfig-Delta (M3, Pinsel): Versatz eines Käfigpunkts der Vorlage (rechte Hälfte oder Naht), Profil-Einheiten. */
/** `anker` (Pose-Deltas auf Maulpunkten, 15.10.): Rolle, Reihe und Anteil entlang der Lippe — die Pose überlebt eine neue Maultopologie */
const KaefigDeltaSchema = z.object({ punkt: z.number().int().min(0), d: V3, anker: z.object({ rolle: z.number().int().min(0), reihe: z.number().int().min(0), u: z.number() }).optional() });
/**
 * Posen (Dokument v2, Plan „Maul als Einsatz, Werkzeug-Harmonie und Posen“, Teil B): Der Editor-Tab ist die Grundpose;
 * jede Pose = Knochenstellung + Florians Form als Ruhe-Deltas (vor den Knochen) + Saat. Idle (Normalzustand, im Spiel der
 * Ruhezustand) und Fressen sind immer da; weitere kommen über „Neue Pose“ hinzu.
 */
const KnochenWertSchema = z.object({ winkel: z.number().optional(), zug: z.tuple([z.number(), z.number()]).optional(), ziehen: z.number().optional(), gieren: z.number().optional(), rollen: z.number().optional(), seit: z.number().optional() });
/**
 * Knoten einer Pose-Linie (B5): Lippenanteil s (0 = Anfang auf der Naht, 1 = Mundwinkel), Versatz d der Linie gegen die
 * natürliche Lippe der Pose und Griffversätze ein/aus (relativ zum Knoten), alles im Ruheraum (Weltachsen, Kern-Einheiten wie
 * die Form); die Pose dreht sie mit dem Lippenpunkt.
 */
const LinienKnotenSchema = z.object({ s: z.number(), d: V3, ein: V3, aus: V3, art: z.enum(['glatt', 'ecke']).optional() });
const PoseSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  art: z.enum(['idle', 'fressen', 'frei']),
  stellung: z.object({ kiefer: KnochenWertSchema.optional(), schaedel: KnochenWertSchema.optional() }).optional(),
  form: z.array(KaefigDeltaSchema),
  bezug: z.array(z.number()).optional(),
  formAlt: z.literal('nachKnochen').optional(),
  saat: z.object({ haps: z.number().optional() }).optional(),
  linien: z.object({ oben: z.array(LinienKnotenSchema).min(2), unten: z.array(LinienKnotenSchema).min(2) }).optional(),
  spiel: z.boolean().optional(),
});
/** Käfig-Deltas der Grundform und je Pose (M3: „fressen“ = offenes Maul, mit der Öffnung überblendet; Plan 5.2). */
/**
 * Eingefrorene Stationen (Plan „Zeichnung ist Form“, Schritt 3, „Käfig als Wahrheit“): Ringverteilung, Kappenzeilen,
 * Ecken, Reifen und Spitzen als Wirbelsäulen-Anteile. Einmal beim ersten Ableiten gewählt, danach nur noch nachgeführt
 * (neue Ecken und Reifen bekommen einen Ring); jede Kurvenänderung ist ein Nachziehen auf demselben Käfig.
 */
const GefroreneStationenSchema = z.object({
  ringe: z.array(z.number()),
  vorn: z.array(z.number()),
  hinten: z.array(z.number()),
  ecken: z.array(z.object({ ring: z.number(), seite: z.enum(['oben', 'unten', 'beide']) })),
  reifen: z.array(z.object({ spant: z.number(), ring: z.number() })),
  spitzen: z.object({ vorn: z.boolean(), hinten: z.boolean() }),
  maul: z.object({ winkel: z.number(), ringA: z.number().optional(), kontur: z.boolean().optional() }).optional(),
  enden: z
    .object({
      vorn: z.object({ k: z.number(), t: z.number(), p: z.object({ x: z.number(), y: z.number() }) }),
      hinten: z.object({ k: z.number(), t: z.number(), p: z.object({ x: z.number(), y: z.number() }) }),
      knoten: z.number(),
    })
    .optional(),
  teile: z
    .object({
      knoten: z.tuple([z.number(), z.number(), z.number()]),
      teile: z.array(
        z.object({
          id: z.string(),
          art: z.enum(['mitte', 'paar']),
          blatt: z.enum(['seite', 'front', 'top']),
          a: z.object({ k: z.number(), t: z.number(), p: z.object({ x: z.number(), y: z.number() }) }),
          b: z.object({ k: z.number(), t: z.number(), p: z.object({ x: z.number(), y: z.number() }) }),
          spitze: z.object({ x: z.number(), y: z.number() }),
          richtung: z.enum(['oben', 'unten', 'vorn', 'hinten', 'seitlich']).optional(),
          hoehe: z.number().optional(),
        }),
      ),
    })
    .optional(),
});
/**
 * `maul` (14.10.): die Entscheidungen der Maullage aus dem letzten Bau mit Maul — Ring des Mundwinkels, erster Lippenring
 * (Ringanfang) und ob die Lippe auf der Kontur beginnt (sonst in der Spitze). Sie bleiben, solange sie gültig sind (Winkel
 * zwischen den Nachbarringen, letzter Nasenring vor den Anfängen) bzw. innerhalb eines Bands um die Schwelle; sonst wählte
 * jeder Zug am Anfang neu, und das Netz sprang (Langhals: Käfig 499 ↔ 513 Punkte; Kugel: Lippe 18 px in eine andere Kappenzeile).
 */
/**
 * `enden` (Teil G, G2): die Enden der Wirbelsäule als Kurvenparameter des Seitenumrisses (Segment k, Parameter t, Lage p
 * in Profil-Einheiten), gültig für `knoten` Knoten. Ein Zug am Bauch wirft sie nicht mehr um (Giraffe mit Bauch vor der Nase).
 */
export type EndenAnker = { k: number; t: number; p: { x: number; y: number } };
/**
 * `teile` (Plan „Liniennetz, Zielform, Käfig“, S4): die erkannten Teile mit ihrer Sehne als Kurvenparametern der Zeichnung,
 * in der sie erkannt wurden, der Spitze und der Richtung — gültig für die Knotenzahlen von Seite, Front und Top. Der
 * nächste Bau liest mit Hysterese gegen sie (ein Teil bleibt bis 0,85 seiner Schwellen) und nimmt dieselbe Sehne; `hoehe`
 * = wie weit das Teil über seine Sehne ragt (Profil-Einheiten) — findet das Skelett ein Teil nicht, bleibt es, solange es
 * an seiner Sehne noch 0,85 davon herausragt.
 */
export type GefrorenesTeil = { id: string; art: 'mitte' | 'paar'; blatt: 'seite' | 'front' | 'top'; a: EndenAnker; b: EndenAnker; spitze: { x: number; y: number }; richtung?: 'oben' | 'unten' | 'vorn' | 'hinten' | 'seitlich'; hoehe?: number };
export type GefrorenerTeilbaum = { knoten: [number, number, number]; teile: GefrorenesTeil[] };
export type GefroreneStationen = { ringe: number[]; vorn: number[]; hinten: number[]; ecken: { ring: number; seite: 'oben' | 'unten' | 'beide' }[]; reifen: { spant: number; ring: number }[]; spitzen: { vorn: boolean; hinten: boolean }; maul?: MaulStationen; enden?: { vorn: EndenAnker; hinten: EndenAnker; knoten: number }; teile?: GefrorenerTeilbaum };
export type MaulStationen = { winkel: number; ringA?: number; kontur?: boolean };
const KaefigSchemaV1 = z.object({ deltas: z.array(KaefigDeltaSchema), posen: z.record(z.string(), z.array(KaefigDeltaSchema)).optional(), stationen: GefroreneStationenSchema.optional() });
/** Version 1 (bis 15.10.2026 abends): mit Ausstattung und (M3) Käfig-Deltas der Pinsel; Pose-Deltas in `kaefig.posen`. */
export const DokumentSchemaV1 = z.object({ ...DokumentFelder, version: z.literal(1), ausstattung: AusstattungSchema.optional(), kaefig: KaefigSchemaV1.optional() });
const KaefigSchema = z.object({ deltas: z.array(KaefigDeltaSchema), stationen: GefroreneStationenSchema.optional() });
/** Version 2 (B3): Posenliste mit Knochenstellung, Ruhe-Deltas und Bezugs-Käfig je Pose. */
export const DokumentSchema = z.object({ ...DokumentFelder, posen: z.array(PoseSchema), version: z.literal(2), ausstattung: AusstattungSchema.optional(), kaefig: KaefigSchema.optional() });

export type V3T = [number, number, number];
export type Knoten3 = { p: V3T; ein: V3T; aus: V3T; art: 'glatt' | 'ecke' };
/** Offene 3D-Bézier-Linie (Griffe relativ zum Knoten), Knoten 0 auf der Mittelebene, letzter Knoten = Mundwinkel. */
export type Linie3 = { knoten: Knoten3[] };
export type MaulAnker = { rolle: number; reihe: number; u: number };
export type KaefigDelta = { punkt: number; d: [number, number, number]; anker?: MaulAnker };
/** Lippen der rechten Hälfte; `unten` fehlt = Kiefer gleich (Florians türkise Linie). */
export type Lippen = { oben: Linie3; unten?: Linie3 };
export type Maul = { zu: Lippen; auf?: Lippen };
export type ZahnWerte = { laenge: number; breite: number; rundheit: number; schaerfe: number; neigung: number; biegung: number; spreizung: number; drehung?: number; groesse?: number; vor?: number };
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
export type Spant = {
  f: number;
  profil: Profil;
  /**
   * Kiefer-Spant (14.10., Florian: „von vorne einen Spant für Ober- und einen für Unterkiefer, wenn der Spant von der
   * Seite über beide liegt“): Querschnitt des Unterkiefers mit der Punktstruktur von `profil`. In Maulringen gilt unter
   * der Lippe `unten`, darüber `profil`; fehlt er, gilt `profil` für beide Kiefer.
   */
  unten?: Profil;
};
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

/**
 * Knochenwert einer Pose: Winkel (Grad, Öffnen um die Querachse), Zug des Unterkiefers (Maullängen), Weite beim „Ziehen“
 * (Maullängen); 3D (B3b, Florians Entscheidung 10): Gieren (Grad, um die Senkrechte), Rollen (Grad, um die eigene
 * Knochenachse), seitlicher Versatz (Maullängen, +z). Mit Gieren, Rollen oder Seite wird die Pose asymmetrisch.
 */
export type KnochenWert = { winkel?: number; zug?: [number, number]; ziehen?: number; gieren?: number; rollen?: number; seit?: number };
/** Stellung der Knochen einer Pose (Kiefer, Schädel; später Hals, Beine). Fehlt sie bei Fressen, gelten die Maul-Optionen. */
export type PoseStellung = { kiefer?: KnochenWert; schaedel?: KnochenWert };
export type PoseArt = 'idle' | 'fressen' | 'frei';
/** Knoten einer Pose-Linie (B5): Lippenanteil s, Versatz d und Griffversätze ein/aus gegen die natürliche Lippe (Ruheraum, Kern-Einheiten). */
export type LinienKnoten = { s: number; d: V3T; ein: V3T; aus: V3T; art?: 'glatt' | 'ecke' };
/** Rot (Oberkette) und Blau (Unterkette) einer Pose. */
export type PoseLinien = { oben: LinienKnoten[]; unten: LinienKnoten[] };
export type Pose = {
  id: string;
  name: string;
  art: PoseArt;
  stellung?: PoseStellung;
  /** Florians Form: Ruhe-Deltas (vor den Knochen), rechte Hälfte und Naht, Profil-Einheiten */
  form: KaefigDelta[];
  /** Ruhe-Käfig, auf dem `form` zuletzt geformt wurde (alle Punkte, 3 je Punkt): Die Form folgt Änderungen der Grundform (K6) */
  bezug?: number[];
  /** Migration aus v1: `form` liegt nach den Knochen (alte Fressen-Deltas) und wird bei der Auswertung in die Ruhe gedreht */
  formAlt?: 'nachKnochen';
  /** Saat (Fressen): Haps-Stärke; fehlt = aus den Maul-Optionen */
  saat?: { haps?: number };
  /**
   * Rot und Blau der Pose (B5): Versatzfelder längs der Oberkette (`oben`) und der Unterkette (`unten`) gegen die natürliche
   * Lippe der Pose; der Mundwinkel (letzter Knoten) gilt für beide aus `oben`. Fehlt = die Linien liegen auf der natürlichen Lippe.
   */
  linien?: PoseLinien;
  /** im Spiel benutzt (Export) */
  spiel?: boolean;
};
export const POSE_TITEL: Record<string, string> = { idle: 'Idle', fressen: 'Fressen', ruhen: 'Ruhen', laufen: 'Laufen', inklusion: 'Inklusion' };
/** Idle und Fressen sind immer da (Florian 15.10. abends: „Es wird dann noch eine Pose Idle geben, die den Normalzustand beschreibt“). */
export function standardPosen(): Pose[] {
  return [
    { id: 'idle', name: 'Idle', art: 'idle', form: [] },
    { id: 'fressen', name: 'Fressen', art: 'fressen', form: [] },
  ];
}

/**
 * Eigene Kurve für ein verdecktes Stück eines Teils (Plan „Liniennetz, Zielform, Käfig“, S4; `kern/grundkoerper/teilKurven.ts`):
 * Teil (Kennung aus `kaefig.stationen.teile`), Ansicht, Stoßstellen mit der schwarzen Linie als Kurvenparameter des Profils
 * der Ansicht (gültig für `knotenzahl` Knoten; sonst über ihre Lage `p` neu gefunden), Knoten im Rahmen der Stoßstellen:
 * mit `b` über die Strecke a → b (x längs, y links davon, beide durch |ab|), nur mit `a` (zweites Ende auf der Spiegelachse
 * oder frei) als Versatz zu a, ohne Stoßstelle (ganz verdeckt, `zu` = geschlossen) an ihrer Stelle. Profil-Einheiten.
 */
export type TeilKurve = { teil: string; ansicht: 'seite' | 'front' | 'top'; a?: EndenAnker; b?: EndenAnker; knotenzahl: number; knoten: ProfilKnoten[]; zu?: boolean };

export type Dokument = {
  format: 'ee-wesen';
  version: 2;
  name: string;
  profile: { seite: Profil; front: Profil; top: Profil };
  skalierung: number;
  /** Posen (v2): Idle, Fressen, weitere; Reihenfolge = Reihenfolge der Tabs */
  posen: Pose[];
  /** Version 1: Absicht für den Bau (Maul, Beine, Stil, Kasten, Augen, Gesicht, Zonen); fehlt = Standardkörper */
  ausstattung?: Ausstattung;
  /**
   * M3 (Pinsel): Versätze von Käfigpunkten der Vorlage (Index < Punktzahl der Röhre; rechte Hälfte oder Naht, die linke
   * Hälfte spiegelt der Kern), Profil-Einheiten, auf den abgeleiteten Käfig addiert. Fehlt = unberührt.
   */
  kaefig?: { deltas: KaefigDelta[]; stationen?: GefroreneStationen };
  maul?: Maul;
  zaehne?: Zaehne;
  kanten?: Kante[];
  spanten?: Spant[];
  /** Stelle des Hauptspants (Front); fehlt = dickste Stelle */
  hauptspant?: number;
  /** S4: eigene Kurven für verdeckte Stücke von Teilen (fehlt = die Hülle rät sie) */
  teile?: TeilKurve[];
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
    version: 2,
    name,
    profile: {
      seite: startKreis({ x: 0, y: r }, r, 4),
      front: startHalbkreis({ x: 0, y: r }, r, 'senkrecht', 2),
      top: startHalbkreis({ x: 0, y: 0 }, r, 'waagerecht', 2),
    },
    skalierung: 1,
    posen: standardPosen(),
  };
}

/**
 * Posen aus Version 1: Idle kommt hinzu, Fressen bekommt die alten Fressen-Deltas (nach den Knochen gespeichert →
 * `formAlt`, exakt umgerechnet bei der Auswertung), jede weitere Pose ihre Deltas (ohne Knochen, also schon Ruhe-Deltas).
 */
export function posenAusV1(namen: readonly string[], kaefigPosen: Readonly<Record<string, KaefigDelta[]>> | undefined): Pose[] {
  const posen = standardPosen();
  const fressen = kaefigPosen?.fressen ?? [];
  if (fressen.length) posen[1] = { ...posen[1]!, form: fressen, formAlt: 'nachKnochen' };
  for (const n of namen) if (n !== 'idle' && n !== 'fressen') posen.push({ id: n, name: POSE_TITEL[n] ?? n, art: 'frei', form: kaefigPosen?.[n] ?? [] });
  return posen;
}

/** Version 1 → 2: Posenliste statt Namen und `kaefig.posen`. */
function v1NachV2(alt: z.infer<typeof DokumentSchemaV1> | (z.infer<typeof DokumentSchemaV0> & { version: 1 })): Dokument {
  const { kaefig, posen, ...rest } = alt as z.infer<typeof DokumentSchemaV1>;
  const k = kaefig ? { deltas: kaefig.deltas, ...(kaefig.stationen ? { stationen: kaefig.stationen } : {}) } : undefined;
  return { ...rest, version: 2, posen: posenAusV1(posen, kaefig?.posen as Record<string, KaefigDelta[]> | undefined), ...(k ? { kaefig: k } : {}) } as Dokument;
}

/** Lesen mit Migration: Version 0 → 1 (ohne Ausstattung; die Prüfwesen-Anteile ergänzt der Editor über den Namen) → 2 (Posenliste). */
export function dokumentLesen(json: unknown): Dokument {
  const v = (json as { version?: unknown } | null)?.version;
  if (v === 0) return v1NachV2({ ...DokumentSchemaV0.parse(json), version: 1 });
  if (v === 1) return v1NachV2(DokumentSchemaV1.parse(json));
  return DokumentSchema.parse(json) as Dokument;
}
