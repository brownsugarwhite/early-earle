import {
  AUGEN_TYPEN,
  BAUPLAN_REGLER,
  MATERIALIEN,
  MUSTER_TYPEN,
  SCHWANZ_TYPEN,
  UNTERKOERPER_TYPEN,
  ZAHN_STILE,
  defaultBauplan,
  parseBauplan,
  type Bauplan,
  type ReglerSpec,
} from '@ee/creature';
import { STIL_STANDARD, type WesenStil } from '@ee/render';

/**
 * Das Reglerpanel des Grundformen-Labs als Daten: Tabs, Gruppen, Regler (Zahl, Auswahl, Farbe, Zufallszahl) mit
 * Würfel- und Zurücksetz-Logik. Die Zahlregler des Bauplans kommen aus dem Katalog `BAUPLAN_REGLER` (@ee/creature):
 * Neue Katalogeinträge erscheinen von selbst (Gruppe „Weitere“ im Tab ihrer Katalog-Gruppe), entfernte verschwinden.
 * Hier steht nur, wie sie gruppiert werden, plus die Felder, die der Katalog nicht kennt (Auswahl, Farben, Profil, Stil).
 */

export type ReglerZiel = 'bauplan' | 'stil';

interface ReglerBasis {
  /** Eindeutig über beide Ziele (Schlösser, Testkennungen): Bauplan-Pfad bzw. `stil.<pfad>`. */
  id: string;
  /** Pfad im Zielobjekt (Bauplan bzw. Stil), Zahlsegmente greifen in Arrays (`koerper.querschnitte.2`). */
  key: string;
  ziel: ReglerZiel;
  label: string;
  hinweis?: string;
  /**
   * Nur zeigen (und würfeln), wenn das Feld im aktuellen Schema existiert — für Felder, die die Pakete gerade erst
   * bekommen (z. B. `maul.sichtbar`, Stil `kanten`): fehlt der Wert, bleibt der Regler unsichtbar.
   */
  bedingt?: boolean;
}

export interface ZahlRegler extends ReglerBasis {
  art: 'zahl';
  min: number;
  max: number;
  step: number;
  einheit?: string;
  /** Engerer Würfelbereich (Stil: im Look-Vertrag bleiben); sonst der ganze erlaubte Bereich. */
  wuerfel?: readonly [number, number];
}

export interface WahlRegler extends ReglerBasis {
  art: 'wahl';
  optionen: readonly (string | number)[];
}

export interface FarbRegler extends ReglerBasis {
  art: 'farbe';
  /** Rolle `farben.<rolle>`; Maulfarben (Rachen, Zunge, Zahn) und Augen würfelt der Würfel nicht (Look-Vertrag 9/10). */
  rolle: string;
  wuerfeln: boolean;
}

export interface ZufallRegler extends ReglerBasis {
  art: 'zufall';
}

export interface SchalterRegler extends ReglerBasis {
  art: 'schalter';
  /** Darf der Würfel ihn umlegen? (Maul sichtbar: nein — das wäre eine andere Stufe, kein Würfelwurf.) */
  wuerfeln: boolean;
}

export type Regler = ZahlRegler | WahlRegler | FarbRegler | ZufallRegler | SchalterRegler;

export const TABS = [
  { id: 'koerper', label: 'Körper', katalog: 'Körper' },
  { id: 'halsKopf', label: 'Hals & Kopf', katalog: 'Hals & Kopf' },
  { id: 'maul', label: 'Maul', katalog: 'Maul' },
  { id: 'augen', label: 'Augen', katalog: 'Augen' },
  { id: 'beine', label: 'Beine', katalog: 'Beine' },
  { id: 'schwanz', label: 'Schwanz', katalog: 'Schwanz' },
  { id: 'muster', label: 'Muster & Farben', katalog: 'Muster & Farben' },
  { id: 'licht', label: 'Licht & Stil', katalog: '' },
] as const;

export type TabId = (typeof TABS)[number]['id'];
export const TAB_IDS: readonly TabId[] = TABS.map((t) => t.id);

export function isTabId(v: unknown): v is TabId {
  return typeof v === 'string' && (TAB_IDS as readonly string[]).includes(v);
}

// --- Pfade ------------------------------------------------------------------------------------------------------

/** Liest einen Wert über einen Punktpfad; Zahlsegmente greifen in Arrays. */
export function leseWert(obj: unknown, pfad: string): unknown {
  let o: unknown = obj;
  for (const k of pfad.split('.')) {
    if (o === null || typeof o !== 'object') return undefined;
    o = Array.isArray(o) ? o[Number(k)] : (o as Record<string, unknown>)[k];
  }
  return o;
}

/** Setzt einen Wert über einen Punktpfad und gibt eine Kopie zurück (Arrays bleiben Arrays). */
export function setzeWert<T>(obj: T, pfad: string, value: unknown): T {
  const keys = pfad.split('.');
  const rec = (o: unknown, i: number): unknown => {
    const k = keys[i]!;
    const last = i === keys.length - 1;
    if (Array.isArray(o)) {
      const copy = o.slice();
      const idx = Number(k);
      copy[idx] = last ? value : rec(copy[idx], i + 1);
      return copy;
    }
    const base = (o && typeof o === 'object' ? o : {}) as Record<string, unknown>;
    const next = { ...base };
    if (last && value === undefined) delete next[k];
    else next[k] = last ? value : rec(base[k], i + 1);
    return next;
  };
  return rec(obj, 0) as T;
}

// --- Namen der Auswahlwerte ---------------------------------------------------------------------------------------

const NAMEN: Record<string, string> = {
  // Material
  fest: 'fest',
  jelly: 'Jelly',
  fell: 'Fell',
  schuppe: 'Schuppe',
  feuer: 'Feuer',
  nebel: 'Nebel',
  // Zähne
  keine: 'keine',
  rund: 'rund',
  spitz: 'spitz',
  // Augen
  schlitz: 'Schlitz',
  gross: 'groß',
  drache: 'Drache',
  schwarzweiss: 'schwarz-weiß',
  // Unterkörper
  keiner: 'keiner',
  beine: 'Beine',
  vogel: 'Vogel',
  spinneDuenn: 'Spinne dünn',
  spinneFlauschig: 'Spinne flauschig',
  schlange: 'Schlange',
  // Schwanz
  wirbelsaeule: 'Wirbelsäule',
  anhang: 'Anhang',
  quaste: 'Quaste',
  bogen: 'Bogen',
  // Muster
  uni: 'uni',
  streifen: 'Streifen',
  rosetten: 'Rosetten',
  platten: 'Platten',
  schuppen: 'Schuppen',
  punkte: 'Punkte',
  bauchRuecken: 'Bauch/Rücken',
  flecken: 'Flecken',
  ringel: 'Ringel',
  salamander: 'Salamander',
  koi: 'Koi',
};

/** Anzeigename eines Auswahlwerts (unbekannte Werte aus einem neueren Schema erscheinen roh). */
export function wahlName(v: string | number): string {
  return typeof v === 'number' ? String(v) : (NAMEN[v] ?? v);
}

// --- Regler außerhalb des Katalogs ------------------------------------------------------------------------------

function wahl(key: string, label: string, optionen: readonly (string | number)[], hinweis?: string): WahlRegler {
  return { id: key, key, ziel: 'bauplan', art: 'wahl', label, optionen, ...(hinweis ? { hinweis } : {}) };
}

function farbe(rolle: string, label: string, wuerfeln: boolean): FarbRegler {
  const key = `muster.farben.${rolle}`;
  return { id: key, key, ziel: 'bauplan', art: 'farbe', label, rolle, wuerfeln };
}

function profil(i: number, label: string): ZahlRegler {
  const key = `koerper.querschnitte.${i}`;
  return { id: key, key, ziel: 'bauplan', art: 'zahl', label, min: 0.05, max: 1.6, step: 0.01 };
}

function stil(key: string, label: string, min: number, max: number, step: number, opts: { hinweis?: string; einheit?: string; wuerfel?: readonly [number, number]; bedingt?: boolean } = {}): ZahlRegler {
  return { id: `stil.${key}`, key, ziel: 'stil', art: 'zahl', label, min, max, step, ...opts };
}

const EXTRA: Regler[] = [
  { id: 'maul.sichtbar', key: 'maul.sichtbar', ziel: 'bauplan', art: 'schalter', label: 'Maul sichtbar', hinweis: 'aus: Jelly und feste Grundblobs ohne Maul (Augen bleiben)', wuerfeln: false, bedingt: true },
  wahl('material', 'Material', MATERIALIEN),
  wahl('muster.typ', 'Muster', MUSTER_TYPEN),
  wahl('zaehne.stil', 'Zahnform', ZAHN_STILE),
  wahl('augen.anzahl', 'Anzahl', [0, 1, 2, 3, 4]),
  wahl('augen.typ', 'Augentyp', AUGEN_TYPEN),
  wahl('unterkoerper.typ', 'Unterkörper', UNTERKOERPER_TYPEN),
  wahl('unterkoerper.beine.anzahl', 'Beinzahl', [2, 4, 8]),
  wahl('schwanz.typ', 'Schwanztyp', SCHWANZ_TYPEN),
  profil(0, 'Profil Boden'),
  profil(1, 'Profil unten'),
  profil(2, 'Profil Mitte'),
  profil(3, 'Profil oben'),
  profil(4, 'Profil Scheitel'),
  { id: 'seed', key: 'seed', ziel: 'bauplan', art: 'zufall', label: 'Zahn-Zufall', hinweis: 'neue Größenfolge der Zähne' },
  { id: 'muster.seed', key: 'muster.seed', ziel: 'bauplan', art: 'zufall', label: 'Muster-Zufall', hinweis: 'neue Lage der Flecken und Striche' },
  farbe('grund', 'Grund', true),
  farbe('bauch', 'Bauch', true),
  farbe('muster', 'Muster', true),
  farbe('akzent', 'Akzent', true),
  farbe('lippe', 'Lippe', true),
  farbe('rachen', 'Rachen', false),
  farbe('zunge', 'Zunge', false),
  farbe('zahn', 'Zahn', false),
  farbe('auge', 'Auge', false),
  farbe('pupille', 'Pupille', false),
  stil('lichtAzimut', 'Licht seitlich', -90, 90, 1, { einheit: '°', hinweis: '+ rechts vom Betrachter (Bögen: rechts oben)', wuerfel: [20, 60] }),
  stil('lichtHoehe', 'Licht Höhe', -10, 80, 1, { einheit: '°', wuerfel: [22, 58] }),
  stil('stufen', 'Wertstufen', 2, 4, 1, { hinweis: 'Licht, Grund, Schatten = 3' }),
  stil('federung', 'Kantenfederung', 0, 1, 0.01, { hinweis: '0 hart (Cel) … 1 gemalt weich', wuerfel: [0.2, 0.8] }),
  stil('verlauf', 'Verlauf in der Stufe', 0, 1, 0.01, { wuerfel: [0.3, 1] }),
  stil('rim', 'Rim', 0, 1, 0.01, { hinweis: 'Lichtkante zur Lichtseite', wuerfel: [0.1, 0.6] }),
  stil('korn', 'Papierkorn', 0, 1, 0.01, { wuerfel: [0.2, 0.75] }),
  stil('glimmer', 'Glimmer', 0, 1, 0.01, { hinweis: 'Funken im Licht (feste Blobs)' }),
  stil('bodenlicht', 'Bodenkontakt', 0, 1, 0.01, { wuerfel: [0.2, 0.8] }),
  stil('kanten', 'Kanten', 0, 1, 0.01, { hinweis: 'Facetten an scharfen Kanten (0 weich … 1 scharf)', bedingt: true }),
  stil('schatten.l', 'Schatten dunkler', -0.35, 0, 0.01, { hinweis: 'OKLab-Helligkeit (Look-Vertrag: −0,12 … −0,18)', wuerfel: [-0.2, -0.1] }),
  stil('schatten.c', 'Schatten satter', -0.05, 0.1, 0.005, { hinweis: 'Chroma-Zugabe, nie grau', wuerfel: [0, 0.04] }),
  stil('schatten.h', 'Schatten kühler', 0, 40, 1, { einheit: '°', hinweis: 'Farbtondrehung zum Kühlen (8–15°)', wuerfel: [6, 18] }),
  stil('licht.l', 'Licht heller', 0, 0.3, 0.01, { wuerfel: [0.05, 0.16] }),
  stil('licht.c', 'Licht Sättigung', -0.06, 0.06, 0.005, { wuerfel: [-0.03, 0.01] }),
];

const EXTRA_BY_ID = new Map(EXTRA.map((r) => [r.id, r]));

function katalogRegler(spec: ReglerSpec): ZahlRegler {
  return { id: spec.pfad, key: spec.pfad, ziel: 'bauplan', art: 'zahl', label: spec.label, min: spec.min, max: spec.max, step: spec.step, ...(spec.hinweis ? { hinweis: spec.hinweis } : {}) };
}

/** Regler zu einer Kennung: erst Katalog (aktuell), dann die Zusatzregler des Labs. */
export function reglerZu(id: string): Regler | null {
  const spec = BAUPLAN_REGLER.find((r) => r.pfad === id);
  if (spec) return katalogRegler(spec);
  return EXTRA_BY_ID.get(id) ?? null;
}

// --- Aufteilung in Tabs und Gruppen -------------------------------------------------------------------------------

interface GruppenPlan {
  titel: string;
  ids: string[];
  /** Gruppe wirkt nur unter einer Bedingung (sonst eingeklappt mit Hinweis). */
  aktiv?: (b: Bauplan) => boolean;
  inaktiv?: string;
  /** Knopf in der eingeklappten Gruppe, der die Bedingung herstellt (z. B. Profil in Querschnitte übernehmen). */
  aktion?: GruppenAktion;
}

export interface GruppenAktion {
  label: string;
  wende: (b: Bauplan) => Bauplan;
}

const mitMaul = (b: Bauplan) => leseWert(b, 'maul.sichtbar') !== false;
const OHNE_MAUL = 'wirkt mit sichtbarem Maul (Schalter oben)';

/**
 * Dichtes Breitenprofil (Grundformen) → die fünf Querschnitte (gleiche Einheit: Anteil von R0), an denselben Höhen
 * abgetastet wie die Querschnitt-Stützpunkte; danach gilt das Profil nicht mehr. Ohne Profil unverändert.
 */
export function profilZuQuerschnitten(b: Bauplan): Bauplan {
  const pr = leseWert(b, 'koerper.profil');
  if (!Array.isArray(pr) || pr.length < 2 || !pr.every((x) => typeof x === 'number')) return b;
  const n = pr.length;
  const bei = (h: number) => {
    const t = h * (n - 1);
    const j = Math.min(n - 2, Math.max(0, Math.floor(t)));
    const f = t - j;
    return (pr[j] as number) * (1 - f) + (pr[j + 1] as number) * f;
  };
  const q = [0.06, 0.25, 0.5, 0.75, 0.9].map((h) => Math.round(clamp(bei(h), 0.05, 1.6) * 100) / 100);
  try {
    return parseBauplan(setzeWert(setzeWert(b, 'koerper.querschnitte', q), 'koerper.profil', undefined));
  } catch {
    return b;
  }
}

const hatBeine = (b: Bauplan) => b.unterkoerper.typ !== 'keiner' && b.unterkoerper.typ !== 'schlange';

const PLAN: Record<TabId, GruppenPlan[]> = {
  koerper: [
    { titel: 'Maße', ids: ['koerper.hoehe', 'koerper.breite', 'koerper.laenge'] },
    { titel: 'Form', ids: ['koerper.kubik', 'koerper.boden', 'koerper.bauch', 'koerper.buckel'] },
    { titel: 'Haltung', ids: ['koerper.neigung', 'koerper.bogen'] },
    {
      titel: 'Profil (unten → oben)',
      ids: ['koerper.querschnitte.0', 'koerper.querschnitte.1', 'koerper.querschnitte.2', 'koerper.querschnitte.3', 'koerper.querschnitte.4'],
      aktiv: (b) => leseWert(b, 'koerper.profil') === undefined && leseWert(b, 'koerper.seitenprofil') === undefined,
      inaktiv: 'Diese Form nutzt ein Profil (Grundform oder gezeichnete Silhouette); die fünf Querschnitte wirken erst ohne Profil.',
      aktion: { label: 'Profil in Querschnitte übernehmen', wende: profilZuQuerschnitten },
    },
  ],
  halsKopf: [
    { titel: 'Hals', ids: ['hals.laenge', 'hals.dicke', 'hals.kruemmung', 'hals.ansatz'] },
    { titel: 'Kopf', ids: ['kopf.groesse', 'kopf.laenge', 'kopf.neigung', 'kopf.ohren', 'kopf.hoerner'] },
    { titel: 'Gesicht', ids: ['kopf.schnauze', 'kopf.schnauzeDicke', 'kopf.braue', 'kopf.wangen', 'kopf.stirn'] },
  ],
  maul: [
    { titel: 'Maul', ids: ['maul.sichtbar'] },
    { titel: 'Lage', ids: ['maul.hoehe', 'maul.neigung', 'maul.schwung'], aktiv: mitMaul, inaktiv: OHNE_MAUL },
    { titel: 'Form', ids: ['maul.form', 'maul.rundung', 'maul.winkel', 'maul.breite', 'maul.lippe', 'maul.wForm', 'maul.nase', 'maul.kante'], aktiv: mitMaul, inaktiv: OHNE_MAUL },
    { titel: 'Kiefer', ids: ['maul.oberkiefer', 'maul.unterkiefer', 'maul.biss', 'maul.tiefe', 'maul.oeffnung', 'maul.oeffnungOben', 'maul.kehle', 'maul.bohne', 'maul.kieferbreite'], aktiv: mitMaul, inaktiv: OHNE_MAUL },
    { titel: 'Zähne', ids: ['zaehne.stil', 'zaehne.groesse', 'zaehne.streuung', 'zaehne.dichte', 'zaehne.eckzaehne', 'zaehne.biegung', 'zaehne.hauer', 'zaehne.aussen', 'seed'], aktiv: mitMaul, inaktiv: OHNE_MAUL },
    { titel: 'Zunge', ids: ['zunge.groesse'], aktiv: mitMaul, inaktiv: OHNE_MAUL },
  ],
  augen: [
    { titel: 'Augen', ids: ['augen.anzahl', 'augen.typ'] },
    { titel: 'Lage und Form', ids: ['augen.groesse', 'augen.hoehe', 'augen.lage', 'augen.abstand', 'augen.tiefe', 'augen.ring'], aktiv: (b) => b.augen.anzahl > 0, inaktiv: 'wirkt mit mindestens einem Auge' },
  ],
  beine: [
    { titel: 'Unterkörper', ids: ['unterkoerper.typ'] },
    {
      titel: 'Beine',
      ids: ['unterkoerper.beine.anzahl', 'unterkoerper.beine.lage', 'unterkoerper.beine.hoehe', 'unterkoerper.beine.dicke', 'unterkoerper.beine.schenkel', 'unterkoerper.beine.laenge', 'unterkoerper.beine.fuss', 'unterkoerper.beine.spreiz'],
      aktiv: hatBeine,
      inaktiv: 'wirkt mit Beinen (Unterkörper Beine, Vogel, Spinne)',
    },
    {
      titel: 'Schlange',
      ids: ['unterkoerper.schlange.laenge', 'unterkoerper.schlange.dicke', 'unterkoerper.schlange.einrollen'],
      aktiv: (b) => b.unterkoerper.typ === 'schlange',
      inaktiv: 'wirkt mit Unterkörper „Schlange“',
    },
  ],
  schwanz: [
    { titel: 'Schwanz', ids: ['schwanz.typ'] },
    { titel: 'Form', ids: ['schwanz.laenge', 'schwanz.dicke', 'schwanz.hoch', 'schwanz.kruemmung'], aktiv: (b) => b.schwanz.typ !== 'keiner', inaktiv: 'wirkt mit einem Schwanz' },
  ],
  muster: [
    { titel: 'Material', ids: ['material'] },
    { titel: 'Muster', ids: ['muster.typ', 'muster.dichte', 'muster.groesse', 'muster.drehung', 'muster.spitze', 'muster.zittern', 'muster.bauchlinie', 'muster.seed'] },
    { titel: 'Farben Körper', ids: ['muster.farben.grund', 'muster.farben.bauch', 'muster.farben.muster', 'muster.farben.akzent', 'muster.farben.lippe'] },
    { titel: 'Farben Maul und Augen', ids: ['muster.farben.rachen', 'muster.farben.zunge', 'muster.farben.zahn', 'muster.farben.auge', 'muster.farben.pupille'] },
  ],
  licht: [
    { titel: 'Figurenlicht', ids: ['stil.lichtAzimut', 'stil.lichtHoehe'] },
    { titel: 'Wertstufen', ids: ['stil.stufen', 'stil.federung', 'stil.verlauf'] },
    { titel: 'Oberfläche', ids: ['stil.rim', 'stil.korn', 'stil.glimmer', 'stil.bodenlicht', 'stil.kanten'] },
    { titel: 'Schattenregel', ids: ['stil.schatten.l', 'stil.schatten.c', 'stil.schatten.h', 'stil.licht.l', 'stil.licht.c'] },
  ],
};

export interface ReglerGruppe {
  titel: string;
  regler: Regler[];
  /** Gruppe wirkt nur unter einer Bedingung; sonst zeigt das Panel sie eingeklappt mit `inaktiv`. */
  aktiv?: (b: Bauplan) => boolean;
  inaktiv?: string;
  aktion?: GruppenAktion;
}

const gruppenCache = new Map<TabId, ReglerGruppe[]>();

/** Gruppen eines Tabs mit aufgelösten Reglern; Katalogeinträge ohne Platz im Plan landen in „Weitere“. */
export function gruppenDesTabs(tab: TabId): ReglerGruppe[] {
  const cached = gruppenCache.get(tab);
  if (cached) return cached;
  const out: ReglerGruppe[] = [];
  const genutzt = new Set<string>();
  for (const g of PLAN[tab]) {
    const regler = g.ids.map((id) => reglerZu(id)).filter((r): r is Regler => r !== null);
    regler.forEach((r) => genutzt.add(r.id));
    if (regler.length === 0) continue;
    out.push({ titel: g.titel, regler, ...(g.aktiv ? { aktiv: g.aktiv } : {}), ...(g.inaktiv ? { inaktiv: g.inaktiv } : {}), ...(g.aktion ? { aktion: g.aktion } : {}) });
  }
  const katalog = TABS.find((t) => t.id === tab)!.katalog;
  if (katalog) {
    const weitere = BAUPLAN_REGLER.filter((r) => r.gruppe === katalog && !genutzt.has(r.pfad)).map(katalogRegler);
    if (weitere.length > 0) out.push({ titel: 'Weitere', regler: weitere });
  }
  gruppenCache.set(tab, out);
  return out;
}

/** Alle Regler eines Tabs (auch eingeklappter Gruppen) — Würfel und Zurücksetzen wirken auf alle. */
export function reglerDesTabs(tab: TabId): Regler[] {
  return gruppenDesTabs(tab).flatMap((g) => g.regler);
}

/** Katalog-Gruppen, die keinem Tab zugeordnet sind (z. B. „Verhalten“: im statischen Lab ohne Wirkung). */
export function ungenutzteKataloggruppen(): string[] {
  const tabs = new Set<string>(TABS.map((t) => t.katalog));
  return [...new Set(BAUPLAN_REGLER.map((r) => r.gruppe))].filter((g) => !tabs.has(g));
}

// --- Werte --------------------------------------------------------------------------------------------------------

export function zielObjekt(r: Regler, b: Bauplan, s: WesenStil): unknown {
  return r.ziel === 'stil' ? s : b;
}

export function wertVon(r: Regler, b: Bauplan, s: WesenStil): unknown {
  return leseWert(zielObjekt(r, b, s), r.key);
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Auf das Raster des Reglers runden (ohne Gleitkomma-Schwanz). */
export function rasten(v: number, r: ZahlRegler): number {
  const n = Math.round((clamp(v, r.min, r.max) - r.min) / r.step);
  const decimals = Math.max(0, Math.ceil(-Math.log10(r.step) - 1e-9));
  return Number((r.min + n * r.step).toFixed(decimals));
}

/** Anzeige des Live-Werts: Schrittweite bestimmt die Nachkommastellen, Minus als echtes Minuszeichen. */
export function formatWert(r: Regler, v: unknown): string {
  if (r.art === 'wahl') return wahlName(v as string | number);
  if (r.art === 'farbe') return String(v);
  if (r.art === 'zufall') return String(v);
  if (r.art === 'schalter') return v ? 'an' : 'aus';
  const n = Number(v);
  if (!Number.isFinite(n)) return '–';
  const decimals = r.step >= 1 ? 0 : r.step >= 0.1 ? 1 : r.step >= 0.01 ? 2 : 3;
  return `${n.toFixed(decimals).replace('-', '−')}${r.einheit ?? ''}`;
}

// --- Würfel und Zurücksetzen --------------------------------------------------------------------------------------

export type Zufall = () => number;

function setzeIn(r: Regler, b: Bauplan, s: WesenStil, v: unknown): { b: Bauplan; s: WesenStil } {
  return r.ziel === 'stil' ? { b, s: setzeWert(s, r.key, v) } : { b: setzeWert(b, r.key, v), s };
}

/**
 * Würfelt alle offenen Regler eines Tabs im erlaubten Bereich (Stil: im engeren Look-Vertrag-Bereich). Farben kommen
 * als stimmige Palette (eine Grundfarbe, Bauch heller, Lippe dunkler, Muster und Akzent dazu); Maulfarben bleiben.
 */
export function wuerfleTab(tab: TabId, b: Bauplan, s: WesenStil, schloss: Readonly<Record<string, boolean>>, rnd: Zufall = Math.random): { bauplan: Bauplan; stil: WesenStil } {
  let nb = b;
  let ns = s;
  const palette = zufallsPalette(rnd);
  for (const r of reglerDesTabs(tab)) {
    if (schloss[r.id]) continue;
    if (wertVon(r, nb, ns) === undefined) continue; // Feld gibt es (noch) nicht
    let v: unknown;
    if (r.art === 'zahl') {
      const [lo, hi] = r.wuerfel ?? [r.min, r.max];
      v = rasten(lo + (hi - lo) * rnd(), r);
    } else if (r.art === 'wahl') v = r.optionen[Math.floor(rnd() * r.optionen.length) % r.optionen.length];
    else if (r.art === 'zufall') v = 1 + Math.floor(rnd() * 9999);
    else if (r.art === 'schalter') {
      if (!r.wuerfeln) continue;
      v = rnd() < 0.5;
    }
    else if (r.wuerfeln && palette[r.rolle]) v = palette[r.rolle];
    else continue;
    ({ b: nb, s: ns } = setzeIn(r, nb, ns, v));
  }
  return { bauplan: nb === b ? b : sicher(nb, b), stil: ns };
}

/** Setzt alle Regler eines Tabs auf den Ausgangsstand (Vorlage bzw. Stil-Vorgabe) zurück, Schlösser gelten nicht. */
export function setzeTabZurueck(tab: TabId, b: Bauplan, s: WesenStil, basis: Bauplan, stilBasis: WesenStil): { bauplan: Bauplan; stil: WesenStil } {
  let nb = b;
  let ns = s;
  for (const r of reglerDesTabs(tab)) {
    const v = leseWert(r.ziel === 'stil' ? stilBasis : basis, r.key);
    if (v === undefined) continue;
    ({ b: nb, s: ns } = setzeIn(r, nb, ns, v));
  }
  return { bauplan: nb === b ? b : sicher(nb, b), stil: ns };
}

/** Parst den Bauplan; scheitert das (Werte außerhalb des Schemas), bleibt der alte Stand. */
function sicher(next: Bauplan, prev: Bauplan): Bauplan {
  try {
    return parseBauplan(next);
  } catch {
    return prev;
  }
}

/** Unterscheidet sich der Tab vom Ausgangsstand? (Zurücksetzen-Knopf aktiv) */
export function tabGeaendert(tab: TabId, b: Bauplan, s: WesenStil, basis: Bauplan, stilBasis: WesenStil): boolean {
  return reglerDesTabs(tab).some((r) => {
    const a = wertVon(r, b, s);
    const z = leseWert(r.ziel === 'stil' ? stilBasis : basis, r.key);
    return z !== undefined && a !== z;
  });
}

// --- Farben -------------------------------------------------------------------------------------------------------

function enc(c: number): string {
  const x = clamp(c, 0, 1);
  const v = x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
  return Math.round(clamp(v, 0, 1) * 255)
    .toString(16)
    .padStart(2, '0');
}

function oklchZuLinear(L: number, C: number, hDeg: number): [number, number, number] {
  const h = (hDeg * Math.PI) / 180;
  const a = Math.cos(h) * C;
  const bb = Math.sin(h) * C;
  const l_ = L + 0.3963377774 * a + 0.2158037573 * bb;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * bb;
  const s_ = L - 0.0894841775 * a - 1.291485548 * bb;
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
}

/** OKLCh → #rrggbb; außerhalb des sRGB-Raums sinkt das Chroma, bis die Farbe passt (Farbton bleibt). */
export function oklchZuHex(L: number, C: number, hDeg: number): string {
  let c = Math.max(0, C);
  let rgb = oklchZuLinear(L, c, hDeg);
  for (let i = 0; i < 24 && rgb.some((x) => x < -1e-4 || x > 1 + 1e-4); i++) {
    c *= 0.88;
    rgb = oklchZuLinear(L, c, hDeg);
  }
  return `#${enc(rgb[0])}${enc(rgb[1])}${enc(rgb[2])}`;
}

/** Stimmige Juwelenton-Palette für die Körperrollen (Schatten macht das Material selbst, Regel 3). */
export function zufallsPalette(rnd: Zufall = Math.random): Record<string, string> {
  const h = rnd() * 360;
  const L = 0.56 + rnd() * 0.16;
  const C = 0.08 + rnd() * 0.08;
  const komplementaer = rnd() < 0.4;
  return {
    grund: oklchZuHex(L, C, h),
    bauch: oklchZuHex(Math.min(0.92, L + 0.12 + rnd() * 0.08), C * 0.55, h + (rnd() - 0.5) * 40),
    muster: oklchZuHex(0.3 + rnd() * 0.1, 0.06 + rnd() * 0.05, komplementaer ? h + 180 : h + (rnd() - 0.5) * 50),
    akzent: oklchZuHex(0.66 + rnd() * 0.12, 0.13 + rnd() * 0.04, h + 120 + rnd() * 120),
    lippe: oklchZuHex(Math.max(0.2, L - 0.16 - rnd() * 0.06), C * 0.9, h + (rnd() - 0.5) * 16),
  };
}

// --- Bereinigen (Entwürfe, Dateien aus älteren Schemas) ---------------------------------------------------------------

const HEX = /^#[0-9a-fA-F]{6}$/;

/**
 * Macht aus beliebigem JSON einen gültigen Bauplan: erst normal parsen; scheitert das, Zahlen des Katalogs in ihren
 * Bereich klemmen und ungültige Auswahlwerte/Farben/Profile durch die Vorgabe ersetzen. Notfalls der Grundblob.
 */
export function bereinigeBauplan(raw: unknown): Bauplan {
  try {
    return parseBauplan(raw);
  } catch {
    /* reparieren */
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return defaultBauplan();
  let obj: unknown = structuredClone(raw);
  for (const r of BAUPLAN_REGLER) {
    const v = leseWert(obj, r.pfad);
    if (v === undefined) continue;
    const n = typeof v === 'number' ? v : Number(v);
    obj = setzeWert(obj, r.pfad, Number.isFinite(n) ? clamp(n, r.min, r.max) : undefined);
  }
  for (const r of EXTRA) {
    if (r.ziel !== 'bauplan' || r.art === 'zahl') continue;
    const v = leseWert(obj, r.key);
    if (v === undefined) continue;
    const ok = r.art === 'wahl' ? r.optionen.includes(v as string | number) : r.art === 'farbe' ? typeof v === 'string' && HEX.test(v) : r.art === 'schalter' ? typeof v === 'boolean' : Number.isInteger(v);
    if (!ok) obj = setzeWert(obj, r.key, undefined);
  }
  const q = leseWert(obj, 'koerper.querschnitte');
  if (q !== undefined && !(Array.isArray(q) && q.length === 5 && q.every((x) => typeof x === 'number' && Number.isFinite(x)))) obj = setzeWert(obj, 'koerper.querschnitte', undefined);
  else if (Array.isArray(q)) obj = setzeWert(obj, 'koerper.querschnitte', q.map((x: number) => clamp(x, 0.05, 1.6)));
  if (leseWert(obj, 'schemaVersion') !== 1) obj = setzeWert(obj, 'schemaVersion', 1);
  try {
    return parseBauplan(obj);
  } catch {
    return defaultBauplan();
  }
}

/** Stil aus JSON: nur bekannte Felder mit passendem Typ, Zahlen der Stilregler in ihrem Bereich, Rest aus dem Standard. */
export function bereinigeStil(raw: unknown, basis: WesenStil = STIL_STANDARD): WesenStil {
  const merge = (base: unknown, src: unknown): unknown => {
    if (base && typeof base === 'object' && !Array.isArray(base)) {
      const out: Record<string, unknown> = {};
      const s = src && typeof src === 'object' && !Array.isArray(src) ? (src as Record<string, unknown>) : {};
      for (const [k, v] of Object.entries(base as Record<string, unknown>)) out[k] = merge(v, s[k]);
      return out;
    }
    if (typeof base === 'number') return typeof src === 'number' && Number.isFinite(src) ? src : base;
    return typeof src === typeof base ? src : base;
  };
  let s = merge(basis, raw) as WesenStil;
  for (const r of EXTRA) {
    if (r.ziel !== 'stil' || r.art !== 'zahl') continue;
    const v = leseWert(s, r.key);
    if (typeof v === 'number') s = setzeWert(s, r.key, clamp(v, r.min, r.max));
  }
  return s;
}

/** Vergleich zweier Stile (gleiche Werte ⇒ gleich). */
export function stilGleich(a: WesenStil, b: WesenStil): boolean {
  return JSON.stringify(bereinigeStil(a)) === JSON.stringify(bereinigeStil(b));
}
