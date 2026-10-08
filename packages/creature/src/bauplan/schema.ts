import { z } from 'zod';

/**
 * Der Bauplan eines Wesens (JSON, `schemaVersion` 1). Alle Regler sind stufenlos; Bereiche und deutsche Beschriftungen
 * stehen in einem Katalog (`BAUPLAN_REGLER`), aus dem Schema **und** Editor-Panel entstehen — eine Quelle für beides.
 *
 * Koordinaten des Körperraums: +Z vorn (Maulseite), +Y oben, +X rechts (vom Wesen aus gesehen links), Boden bei y = 0.
 * Längen in Blob-Einheiten: `koerper.hoehe` 1 ≙ ein Standard-Grundblob.
 */

export interface ReglerSpec {
  /** Pfad im Bauplan, z. B. `maul.hoehe`. */
  pfad: string;
  gruppe: string;
  label: string;
  min: number;
  max: number;
  step: number;
  standard: number;
  /** Kurzer Hinweis für den Editor. */
  hinweis?: string;
}

/** Katalog aller numerischen Regler (wird beim Aufbau des Schemas gefüllt). */
export const BAUPLAN_REGLER: ReglerSpec[] = [];

function regler(gruppe: string, pfad: string, label: string, min: number, max: number, standard: number, hinweis?: string, step?: number): z.ZodDefault<z.ZodNumber> {
  const spec: ReglerSpec = { pfad, gruppe, label, min, max, step: step ?? (max - min <= 2 ? 0.01 : 0.05), standard };
  if (hinweis) spec.hinweis = hinweis;
  BAUPLAN_REGLER.push(spec);
  return z.number().min(min).max(max).default(standard);
}

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Farbe als #rrggbb');

export const MATERIALIEN = ['fest', 'jelly', 'fell', 'schuppe', 'feuer', 'nebel'] as const;
export const ZAHN_STILE = ['keine', 'rund', 'spitz'] as const;
export const AUGEN_TYPEN = ['schlitz', 'gross', 'schlange', 'drache', 'schwarzweiss'] as const;
export const UNTERKOERPER_TYPEN = ['keiner', 'beine', 'vogel', 'spinneDuenn', 'spinneFlauschig', 'schlange'] as const;
export const SCHWANZ_TYPEN = ['keiner', 'wirbelsaeule', 'anhang', 'quaste', 'bogen'] as const;
export const MUSTER_TYPEN = ['uni', 'streifen', 'rosetten', 'platten', 'schuppen', 'punkte', 'bauchRuecken', 'flecken', 'ringel', 'salamander', 'koi'] as const;
export const ANBAU_ARTEN = ['ohr', 'fluegel', 'rueckenkamm', 'maehne', 'frisur', 'ruessel', 'horn', 'flosse', 'kamm', 'schleppe', 'fuehler'] as const;
export const FORTBEWEGUNGEN = ['laufen', 'schlaengeln', 'schwimmen', 'fliegen'] as const;

const K = 'Körper';
const koerper = z
  .object({
    hoehe: regler(K, 'koerper.hoehe', 'Höhe', 0.3, 2.5, 1, 'Rumpf ohne Kopf und Beine (Rex, Katze: klein unter dem großen Kopf)'),
    breite: regler(K, 'koerper.breite', 'Breite', 0.4, 2, 1),
    laenge: regler(K, 'koerper.laenge', 'Länge', 0.4, 2.5, 1, 'vorn–hinten'),
    kubik: regler(K, 'koerper.kubik', 'Würfelig', 0, 1, 0, '0 rund … 1 kantig'),
    bauch: regler(K, 'koerper.bauch', 'Bauch', -1, 1, 0, 'Wölbung vorn unten'),
    buckel: regler(K, 'koerper.buckel', 'Buckel', -1, 1, 0, 'Wölbung hinten oben'),
    neigung: regler(K, 'koerper.neigung', 'Neigung', -1, 1, 0, 'vornüber / zurück'),
    boden: regler(K, 'koerper.boden', 'Standfläche', 0, 1, 0.5, '0 spitz unten … 1 breit flach'),
    /** Optional: dichtes Breitenprofil (≥ 8 Werte 0…1, unten → oben) statt der fünf Querschnitte, z. B. aus den Grundformen. */
    profil: z.array(z.number().min(0).max(1.2)).min(8).max(96).optional(),
    querschnitte: z
      .tuple([z.number().min(0.05).max(1.6), z.number().min(0.05).max(1.6), z.number().min(0.05).max(1.6), z.number().min(0.05).max(1.6), z.number().min(0.05).max(1.6)])
      .default([0.72, 0.95, 1, 0.9, 0.62]),
  })
  .prefault({});

const H = 'Hals & Kopf';
const hals = z
  .object({
    laenge: regler(H, 'hals.laenge', 'Halslänge', 0, 2, 0, '0 = Maul direkt am Körper'),
    dicke: regler(H, 'hals.dicke', 'Halsdicke', 0.15, 1.8, 0.55, 'Rex/Katze: breiter Hals trägt den großen Kopf'),
    kruemmung: regler(H, 'hals.kruemmung', 'Halsbogen', -1, 1, 0, 'S-Form vor / zurück'),
    ansatz: regler(H, 'hals.ansatz', 'Halsansatz', 0, 1, 0.7, '0 hinten … 1 vorn auf dem Körper'),
  })
  .prefault({});

const kopf = z
  .object({
    groesse: regler(H, 'kopf.groesse', 'Kopfgröße', 0.2, 3, 0.7, 'relativ zur Körperhöhe (Rex, Katze: Kopf größer als der Rumpf)'),
    laenge: regler(H, 'kopf.laenge', 'Kopflänge', 0.5, 2, 1, 'Streckung nach vorn'),
    neigung: regler(H, 'kopf.neigung', 'Kopfneigung', -1, 1, 0),
    schnauze: regler(H, 'kopf.schnauze', 'Schnauze', 0, 1, 0, 'Länge der Schnauze'),
    schnauzeDicke: regler(H, 'kopf.schnauzeDicke', 'Schnauzendicke', 0.3, 1.2, 0.7),
    braue: regler(H, 'kopf.braue', 'Brauenwulst', 0, 1, 0),
    ohren: regler(H, 'kopf.ohren', 'Ohren', 0, 1, 0, 'flache Lappen seitlich hinten'),
    hoerner: regler(H, 'kopf.hoerner', 'Hörnchen', 0, 1, 0, 'zwei Stiele mit Knopf'),
  })
  .prefault({});

const M = 'Maul';
const maul = z
  .object({
    /** Ohne Maul: Jelly- und feste Grundblobs der ersten Stufen (Augen bleiben). */
    sichtbar: z.boolean().default(true),
    hoehe: regler(M, 'maul.hoehe', 'Maulhöhe', 0, 1, 0.45, 'stufenlos von unten nach oben'),
    neigung: regler(M, 'maul.neigung', 'Maulneigung', -1, 1, 0, 'Maullinie steigt zu den Winkeln an (Rex) oder fällt ab'),
    schwung: regler(M, 'maul.schwung', 'Maulschwung', 0, 1, 0.12, 'Linie senkt sich hinter der Schnauze und schwingt zum Winkel hoch (Dino, Schlange)'),
    form: regler(M, 'maul.form', 'Maulform', 0, 1, 1, '0 rundes Loch … 1 Keil'),
    winkel: regler(M, 'maul.winkel', 'Mundwinkel nach hinten', 0, 1, 0.5),
    rundung: regler(M, 'maul.rundung', 'Mundwinkel-Rundung', 0, 1, 0.35, '0 spitz zulaufend (Rex) … 1 rund wie beim Aal; Lochmaul ist immer rund'),
    breite: regler(M, 'maul.breite', 'Maulbreite', 0.2, 1, 0.8),
    oberkiefer: regler(M, 'maul.oberkiefer', 'Oberkiefer', 0, 1.5, 1),
    unterkiefer: regler(M, 'maul.unterkiefer', 'Unterkiefer', 0, 1.5, 0.8, '0 = kein Unterkiefer'),
    biss: regler(M, 'maul.biss', 'Biss', -1, 1, 0, '−1 Unterbiss … +1 Überbiss'),
    lippe: regler(M, 'maul.lippe', 'Lippenwulst', 0, 1, 0.15, 'Breite des Lippenbands: 0 unsichtbar (Giraffe), 0,15 schmaler Saum (Aal), 0,6 breites helles Band (Rex, Bild 11)'),
    kante: regler(M, 'maul.kante', 'Kieferkante', 0, 1, 0, 'weich … kantig (Raubkatze)'),
    wForm: regler(M, 'maul.wForm', 'W-Form', 0, 1, 0, 'Oberlippe Hund/Katze'),
    tiefe: regler(M, 'maul.tiefe', 'Rachentiefe', 0.2, 1, 0.5),
    oeffnung: regler(M, 'maul.oeffnung', 'Öffnungsweite', 0, 1, 0.6, 'größte Öffnung vorn (Anteil der Kopfhöhe); das Mesh ist geschlossen gebaut'),
    oeffnungOben: regler(M, 'maul.oeffnungOben', 'Öffnung über Oberkiefer', 0, 1, 0.6, 'Anteil der Öffnung, den der Oberkiefer übernimmt (klappt samt Augen nach hinten)'),
  })
  .prefault({});

const zaehne = z
  .object({
    stil: z.enum(ZAHN_STILE).default('spitz'),
    groesse: regler(M, 'zaehne.groesse', 'Zahngröße', 0, 1, 0.6),
    streuung: regler(M, 'zaehne.streuung', 'Zahnstreuung', 0, 1, 0.4, 'mal groß, mal klein'),
    dichte: regler(M, 'zaehne.dichte', 'Zahndichte', 0, 1, 0.4),
    eckzaehne: regler(M, 'zaehne.eckzaehne', 'Eckzähne', 0, 1, 0.5),
    hauer: regler(M, 'zaehne.hauer', 'Hauer', 0, 1, 0, 'ragen über die Oberlippe'),
    aussen: regler(M, 'zaehne.aussen', 'Zähne außen', 0, 1, 0, '0 verschwinden geschlossen im Gegenkiefer (Aal) … 1 Fangzähne liegen außen über der Gegenlippe'),
  })
  .prefault({});

const zunge = z.object({ groesse: regler(M, 'zunge.groesse', 'Zunge', 0, 1, 0.6) }).prefault({});

const A = 'Augen';
const augen = z
  .object({
    anzahl: z.number().int().min(0).max(4).default(2),
    typ: z.enum(AUGEN_TYPEN).default('schlitz'),
    groesse: regler(A, 'augen.groesse', 'Augengröße', 0, 1, 0.5),
    hoehe: regler(A, 'augen.hoehe', 'Augenhöhe', 0, 1, 0.3, 'über der Maullinie'),
    abstand: regler(A, 'augen.abstand', 'Augenabstand', 0, 1, 0.5),
    lage: regler(A, 'augen.lage', 'Augenlage', 0, 1, 0.55, '0 vorn an der Schnauze … 1 hinten am Schädel'),
    tiefe: regler(A, 'augen.tiefe', 'Augentiefe', 0, 1, 0, '0 aufgesetzt … 1 eingesunken'),
    ring: regler(A, 'augen.ring', 'Augenring', 0, 1, 0.5),
  })
  .prefault({});

const B = 'Beine';
const beine = z
  .object({
    anzahl: z.union([z.literal(2), z.literal(4), z.literal(8)]).default(2),
    dicke: regler(B, 'unterkoerper.beine.dicke', 'Beindicke', 0.1, 1, 0.5),
    schenkel: regler(B, 'unterkoerper.beine.schenkel', 'Schenkel', 0, 1, 0.5, 'dick und stämmig'),
    laenge: regler(B, 'unterkoerper.beine.laenge', 'Beinlänge', 0, 1.5, 0.4),
    fuss: regler(B, 'unterkoerper.beine.fuss', 'Fußgröße', 0, 1, 0.5, 'Saugnapf am Boden'),
    spreiz: regler(B, 'unterkoerper.beine.spreiz', 'Spreizung', 0, 1, 0.5),
    lage: regler(B, 'unterkoerper.beine.lage', 'Beinlage', 0, 1, 0.2, '0 vorn unter der Brust (sitzende Katze) … 1 hinten unter dem Rumpf (Rex)'),
  })
  .prefault({});

const schlange = z
  .object({
    laenge: regler(B, 'unterkoerper.schlange.laenge', 'Schlangenlänge', 0.5, 3, 1.5),
    dicke: regler(B, 'unterkoerper.schlange.dicke', 'Schlangendicke', 0.2, 1, 0.6),
    einrollen: regler(B, 'unterkoerper.schlange.einrollen', 'Einrollen', 0, 1, 0.3),
  })
  .prefault({});

const unterkoerper = z.object({ typ: z.enum(UNTERKOERPER_TYPEN).default('keiner'), beine, schlange }).prefault({});

const S = 'Schwanz';
const schwanz = z
  .object({
    typ: z.enum(SCHWANZ_TYPEN).default('keiner'),
    laenge: regler(S, 'schwanz.laenge', 'Schwanzlänge', 0.2, 2, 0.8),
    dicke: regler(S, 'schwanz.dicke', 'Schwanzdicke', 0.1, 1, 0.5),
    hoch: regler(S, 'schwanz.hoch', 'Schwanz hoch', -1, 1, 0.3),
    kruemmung: regler(S, 'schwanz.kruemmung', 'Schwanzbogen', -1, 1, 0.3),
  })
  .prefault({});

const anbau = z.object({
  art: z.enum(ANBAU_ARTEN),
  form: z.string().default('standard'),
  groesse: z.number().min(0).max(2).default(0.5),
  /** Position auf dem Träger (Kopf-/Körper-Kugelkoordinaten in Grad; Platzierung je Art). */
  position: z.tuple([z.number(), z.number()]).default([0, 0]),
  farbe: hex.optional(),
});

const F = 'Muster & Farben';
const farben = z
  .object({
    grund: hex.default('#9c6cc7'),
    bauch: hex.default('#d9c7ec'),
    muster: hex.default('#3d2457'),
    akzent: hex.default('#f08a4b'),
    lippe: hex.default('#c9a6d6'),
    rachen: hex.default('#6e2334'),
    zunge: hex.default('#e07c92'),
    zahn: hex.default('#f1e6c9'),
    auge: hex.default('#101418'),
    pupille: hex.default('#f7f2e8'),
  })
  .prefault({});

const muster = z
  .object({
    typ: z.enum(MUSTER_TYPEN).default('uni'),
    farben,
    dichte: regler(F, 'muster.dichte', 'Musterdichte', 0, 1, 0.5),
    groesse: regler(F, 'muster.groesse', 'Mustergröße', 0, 1, 0.5),
    drehung: regler(F, 'muster.drehung', 'Musterdrehung', -1, 1, 0),
    spitze: regler(F, 'muster.spitze', 'Pinselspitze', 0, 1, 0.6, 'Striche laufen in Spitzen aus'),
    zittern: regler(F, 'muster.zittern', 'Zittern', 0, 1, 0.3, 'gemalte Unruhe'),
    bauchlinie: regler(F, 'muster.bauchlinie', 'Bauchlinie', 0, 1, 0.5, 'Höhe der Bauch/Rücken-Grenze'),
    seed: z.number().int().default(1),
  })
  .prefault({});

const V = 'Verhalten';
const verhalten = z
  .object({
    tempo: regler(V, 'verhalten.tempo', 'Tempo', 0.2, 2, 1),
    schwere: regler(V, 'verhalten.schwere', 'Schwere', 0, 1, 0.5, 'dick = behäbig'),
    fortbewegung: z.enum(FORTBEWEGUNGEN).default('laufen'),
    hoehe: regler(V, 'verhalten.hoehe', 'Schwebehöhe', 0, 1, 0, 'Schwimmen/Fliegen über dem Feld'),
  })
  .prefault({});

export const BauplanSchema = z.object({
  schemaVersion: z.literal(1).default(1),
  name: z.string().default('Wesen'),
  seed: z.number().int().default(1),
  material: z.enum(MATERIALIEN).default('fest'),
  koerper,
  hals,
  kopf,
  maul,
  zaehne,
  zunge,
  augen,
  unterkoerper,
  schwanz,
  anbauten: z.array(anbau).default([]),
  muster,
  verhalten,
});

export type Bauplan = z.output<typeof BauplanSchema>;
export type BauplanInput = z.input<typeof BauplanSchema>;
export type Anbau = z.output<typeof anbau>;

/** Parst und füllt alle Vorgaben. Wirft bei ungültigen Werten. */
export function parseBauplan(input: unknown): Bauplan {
  return BauplanSchema.parse(input);
}

/** Vollständiger Standard-Bauplan: der stehende Grundblob ohne Maul-Extras. */
export function defaultBauplan(): Bauplan {
  return BauplanSchema.parse({});
}

/** Liest einen Wert über einen Punktpfad (für das schema-getriebene Panel). */
export function getAt(obj: unknown, pfad: string): unknown {
  return pfad.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), obj);
}

/** Setzt einen Wert über einen Punktpfad (unveränderlich: gibt eine Kopie zurück). */
export function setAt<T>(obj: T, pfad: string, value: unknown): T {
  const keys = pfad.split('.');
  const rec = (o: unknown, i: number): unknown => {
    const k = keys[i]!;
    const base = (o && typeof o === 'object' ? o : {}) as Record<string, unknown>;
    return { ...base, [k]: i === keys.length - 1 ? value : rec(base[k], i + 1) };
  };
  return rec(obj, 0) as T;
}
