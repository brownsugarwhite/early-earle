// Wesen-Editor 2, Kern (13.10.2026): Einstieg „Umriss zeichnen → Körper steht“ (Plan 4.1), einmalige Ableitung.
//
// 1. Seitenumriss → Rücken- und Bauchlinie und die kürzeste Leiter (Sprossen) aus dem Wirbelsäulen-Versuch.
// 2. Breite aus den Silhouetten (Projektionsregel): Ein Ring bekommt den größten Maßstab seiner Querschnittsvorlage,
//    der ins Top (bei seinem x) und in die Front (bei jeder Höhe seiner Punkte) passt. Liegende Teile holen die Breite
//    so aus dem Top, stehende (Hals) aus der Front; die Kugel aus drei Kreisen wird exakt eine Kugel.
// 3. Querschnitt-Form aus Front und Spanten (`vorlageBei`: normiertes Halbprofil, Punktstruktur der Front): ein
//    Ringpunkt liegt bei der Höhe q.y auf seiner Sprosse und seitlich bei q.x · Maßstab.
//    Ecken im Querschnitt werden Längsfalten („eine Kante ist eine Ecke in einem Shape“), Ecken im Seitenumriss
//    Querfalten (Ring auf die Ecke), Ecken an den Spitzen Eckpunkte der Kappe.
// 4. Vorlage „Röhre“: R Ringe auf Sprossen (nach Krümmung verdichtet), vorn und hinten eine Kappe.
// 5. Käfig so lösen, dass die Grenzfläche durch alle Ziele und die feine Naht durch die Kurve geht (Löser, einmal
//    zerlegt je Topologie).
// Danach wird nur noch bearbeitet: Ein Zug (Seite, Front, Spant) ändert Ziele bei festen Stationen, der Löser den
// Käfig, die Matrix das feine Netz.

import type { V2 } from '../bezier';
import type { Dokument, GefroreneStationen } from '../dokument';
import { type Kaefig, kanteZwischen } from '../kaefig/halbkanten';
import { type Roehre, roehre } from '../kaefig/roehre';
import { type AusgleichsLoeser, type Bedingung, type Glaettemass, type GrenzLoeser, ausgleichsLoeser, grenzLoeser, kaefigAusgleich, kaefigDurchZiele } from '../loeser/grenzflaeche';
import { glaettungsZeilen, kaefigNachbarlisten } from '../loeser/normalSystem';
import { punktAuf } from '../bezier';
import { pfadAbtasten, segmente, vollerPfad } from '../profil';
import { type SpantTeil, hatKieferSpanten, spantKasten, stelleVon, vorlageBei } from '../spanten';
import { type KantenLinie, kanteAbtasten, kantenFalten } from './kanten';
import { feinKette } from './reifen';
import { type Unterteilung, unterteilung } from '../subdivision/catmullClark';
import { anwenden3, multiplizieren } from '../subdivision/matrix';
import { type Leiter, WIRBEL_STANDARD, leiter } from '../versuch/wirbelsaeule';
import { type Breiten, silhouettenBreite } from './breite';
import { FUELLE_EXPONENT, type FuelleArt, huellenBreite, reichweite } from './fuelle';
import { type Anker, type FrontEcke, type HuellenSchnitt, LINIE_ID, type ZeichnungsFuelle, breitenlinieWaehlen, exponentenFuer, frontEcken, fuelleWoNoetig, huelleEntlang, huellenFeld, huelleRunden, linienMerkmale, profilAbtasten, profilAbtastenAnker, profilAusFeld, querLinienEnden, reihenAbstand, reihenAuslaufen, reihenplan, tabellierteBreiten, zeichnungsFuelle } from './huellenSchnitt';
import { type LinienEinordnung, type LinienRing, type LinienRolle, type LinienWunsch, linieAufSprosse, linienEinordnen, linienRingeDrehen, linienWuensche, ringKanten } from './linienSchleifen';
import { type RandMarke, frontBeruehren } from './rand';
import { type Schlitz, schlitzIm, seiteFuerLeiter } from './schlitz';
import { endenFuer, profilAnker } from './grundkoerper/enden';
import { type UmrissBericht, type UmrissOptionen, umrisseLoesen } from './umrisse';
import { grenzZeile } from '../loeser/achsen';
import { faltenNachZonenRoehre } from './pruefen/zonen';

export type AbleitOptionen = {
  ringe: number;
  ring: number;
  stufen: number;
  /** Anteil der Wirbelsäulenlänge je Kappe (vor dem ersten bzw. hinter dem letzten Ring) */
  kappe: number;
  /** Gewicht der feinen Nahtpunkte im Ausgleich (0 = nur Käfigziele, keine Kurvenanpassung) */
  nahtGewicht: number;
  /**
   * Führende Kurve („Formen folgen“, Florian 15.10.): die zuletzt bearbeitete Kurve bestimmt die Breite allein (Front:
   * front(y), Top: top(x)); ohne Angabe oder bei der Seite gilt die Sichthülle min(top, front). Die anderen Kurven zieht
   * der Editor danach auf die Silhouette des Körpers nach.
   */
  fuehrend?: 'seite' | 'front' | 'top';
  /** Eingefrorene Stationen (Schritt 3): Ringverteilung aus dem Dokument statt Neuwahl nach Krümmung; Ecken und Reifen werden nachgeführt */
  stationen?: GefroreneStationen;
  /**
   * Ab diesem Verhältnis |dy| / |dx| einer Sprosse gilt der Ring als liegend (Vorlage aus dem Front-Lappen statt Kreis).
   * 0,5 (15.10.): Die schrägen Sprossen am Hals-Rumpf-Übergang des Langhalses bekamen bei 1 (45°) den Kreis, dessen
   * breitester Punkt auf halber Höhe liegt, wo die Front schon schmal ist → Top 14 px; mit 0,5 4 px, andere Wesen gleich.
   */
  liegendAb: number;
  /** Gewicht der Breitenschleife im Ausgleich (je Ring der breiteste Punkt, Grenzlage z = Top-Breite bei x; 0 = aus). Plan „Zeichnung ist Form“ Schritt 1: Top bestimmt die Breite. */
  breiteGewicht: number;
  /** Kantenschärfe an Ecken („eine Kante ist eine Ecke in einem Shape“); 0 = keine Falten */
  eckenSchaerfe: number;
  /** Kappenanteil, wenn die Spitze selbst eine Ecke ist (kleine Kappe, Ringe tragen die Krümmung) */
  kappeSpitze: number;
  /** Naht in der Kappe zur Spitze hin falten (Kiel), wenn die Spitze eine Ecke ist */
  spitzenFalte: boolean;
  /** Ringe nach Krümmung verdichten: Dichte 1 + kruemmung · κ · L (0 = gleichmäßig) */
  kruemmung: number;
  /**
   * Stufung der Ringabstände (Plan 20.10., V0): Der Abstand darf längs der Wirbelsäule höchstens um `ringStufung` × Weg
   * wachsen (1 = von Ring zu Ring höchstens etwa doppelt so weit). Catmull–Clark ist gleichförmig: Neben dicht stehenden
   * Ringen an einer Rundung zieht eine große Lücke die Grenzfläche weg, und der Löser schiebt die Ringe übereinander — die
   * Stadionform (gerader Rücken und Bauch, Halbkreis-Enden) klappte so um (138–180°). 0 = aus (bisherige Verteilung).
   */
  ringStufung?: number;
  /** Querschnitt-Form aus Front und Spanten (sonst die runde Form des Poisson-Körpers) */
  querschnitt: boolean;
  /** Laplace-Glattheit der Käfiglagen im Ausgleich (0 = aus); dämpft Wellen neben scharfen Falten */
  glaettung: number;
  /**
   * Teil G, G3 (16.10.): Querschnitt liegender Ringe je Ring aus dem eigenen Höhenbereich (über die Nachbarringe geglättet)
   * statt einem gemeinsamen für den ganzen Abschnitt — sonst trägt bei der Ente jeder Körperring oben die Halsspitze.
   */
  querschnittJeRing?: boolean;
  /**
   * Plan „Liniennetz, Zielform, Käfig“, S2 „Glatte Haut“: Gewicht des Glättungsmaßes (Laplace der Fläche auf Stufe 2, an
   * Falten nur längs, an Ecken keins) im dünn besetzten Ausgleich. 0 oder fehlend = heutiger dichter Weg (bitgleich);
   * > 0 = dünner Löser mit Glättung; `fair: -1` = dünner Löser ohne Glättung (Vergleich mit LU). Voreinstellung
   * `GLATTE_HAUT`.
   */
  fair?: number;
  /**
   * Anteil der Glättung relativ zur Zielform (0…1, Standard 0 = Laplace gegen 0): 1 glättet nur die Abweichung vom Käfig
   * der Ziele — die gezeichnete Fülle bleibt, der Wellenschlag der Interpolation verschwindet (gegen 0 geglättet wurden
   * Querschnitte runder und Flossen dicker: Giraffe-Front +4 px, Fisch +5 % Volumen)
   */
  fairBezug?: number;
  /** Faktor des Glättungsgewichts an den Kappen (Zeilen, die innere Kappenpunkte berühren), Standard 1 */
  fairKappe?: number;
  /**
   * S3 „Umrisse berühren“: Wo der Körper hinter der Front zurückbleibt, wird der Ring dort örtlich hinausgeschoben, bis zur
   * Sichthülle an seinem Punkt; die Form höchstens bis zur Superellipse der Stufe (rund 2, mittel 4, genau 24). Fehlt =
   * kein Berühren (bitgleich). Nur ohne Maulschlitz.
   */
  fuelle?: FuelleArt;
  /** S3: Anteil des Breitengewichts für Berührpunkte (Standard 0,25) */
  randGewicht?: number;
  /**
   * Plan 20.10., V4 „Exakte Umrisse“ (Beweis): Front und Top binden wie die Seite — Breitenlinie (Reihe N/4 durch die
   * Kappen), Frontlinie aus Ringstücken, Ungleichung in allen Blättern, Löser je Achse (`kern/umrisse.ts`). Fehlt = heutiger
   * Bau (bitgleich). Nur ohne Maul und Beine.
   */
  umrisse?: 'exakt';
  /** V4: Gewichte und Schalter des Beweises (Messreihen) */
  umrisseOpt?: UmrissOptionen;
  /**
   * V6 (Plan 20.10.): je Loop des Dokuments (`dok.schleifen`, Knoten mit `schleife`) ein eigener Ring durch seinen Rücken-
   * und Bauchknoten — auf der Röhre ohne Maul und Beine, in beiden Querschnitten (ohne Loops bitgleich)
   */
  schleifen?: boolean;
};

/**
 * S2 „Glatte Haut“ (16.10.): gemessene Voreinstellung — Glättung relativ zur Zielform mit Gewicht 30, an den Kappen das
 * Zehnfache (größte Faltenquelle), Naht 64 statt 16 (hält die schwarze Linie gegen die Glättung). Messreihe
 * `apps/editor/scripts/pruefen/s2-glatt.ts`, Planseite „Liniennetz, Zielform, Käfig“, S2.
 */
export const GLATTE_HAUT: Readonly<Pick<AbleitOptionen, 'fair' | 'fairBezug' | 'fairKappe' | 'nahtGewicht'>> = { fair: 30, fairBezug: 1, fairKappe: 10, nahtGewicht: 64 };

/** Durchgänge, in denen die Breitenziele an den Grenzlagen des letzten Durchgangs nachgerechnet werden (Ableitung) */
const BREITE_DURCHGAENGE = 2;

export const ABLEIT_STANDARD: AbleitOptionen = { ringe: 24, ring: 16, stufen: 3, kappe: 0.05, nahtGewicht: 16, liegendAb: 0.5, breiteGewicht: 16, eckenSchaerfe: 1e6, kappeSpitze: 0.025, spitzenFalte: false, kruemmung: 2, querschnitt: true, glaettung: 0 };

/**
 * V4: Höhe v der breitesten Stelle einer Querschnittsvorlage (Mitte des Bereichs, der bis 0,1 % an die größte Breite
 * reicht — bei flachen Wänden die Mitte der Wand); null ohne Breite.
 */
export function breitesteHoehe(q: Querschnitt): number | null {
  let wMax = 0;
  for (let j = 1; j + 1 < q.w.length; j++) wMax = Math.max(wMax, q.w[j]!);
  if (!(wMax > 0)) return null;
  let vHi = -Infinity;
  let vLo = Infinity;
  for (let j = 1; j + 1 < q.w.length; j++) {
    if (q.w[j]! < wMax * (1 - 1e-3)) continue;
    vHi = Math.max(vHi, q.v[j]!);
    vLo = Math.min(vLo, q.v[j]!);
  }
  return (vHi + vLo) / 2;
}

/** Station einer Sprosse: Anteile a (Rücken) und b (Bauch) entlang der Linien. */
export type Station = { a: number; b: number };

export type Ecke = { ring: number; seite: 'oben' | 'unten' | 'beide' };

/** Reifen (M3): Käfigring, der auf die Station eines gezeichneten Spants gerastet ist (Index in `dok.spanten`). */
export type Reifen = { spant: number; ring: number };

/**
 * V5 (`umrisse: 'exakt'`): `linien` = Ringe der Querlinien, `einordnung` = Art je P-Linie (Index in `dok.kanten`),
 * `linienBau` = je P-Linie, ob sie als Käfigschleife gebaut ist (von `faltenSetzen` gesetzt)
 */
export type Stationen = { ringe: Station[]; kappen: { vorn: Station[]; hinten: Station[] }; ecken: Ecke[]; reifen: Reifen[]; spitzen: { vorn: boolean; hinten: boolean }; gefroren: GefroreneStationen; linien?: LinienRing[]; einordnung?: LinienEinordnung[]; linienBau?: LinienBau[]; linienKanten?: LinienKante[]; /** V5: Stationen der Ringe vor dem Drehen in die Linien (Höhenfeld der Form) */ ringeNatuerlich?: Station[]; /** V5: Käfigpunkte an Treppenfalten (an die Form gebunden) */ treppenPunkte?: number[]; /** V6: Ringe der Loops */ schleifen?: SchleifenRing[] };

/** V6: Ring eines Loops (Kennung in `dok.schleifen`). */
export type SchleifenRing = { id: string; ring: number };

/** V6: Station eines Loops aus seinen Knoten: Anteile a (Rücken), b (Bauch) der Leiter und Anteil f der Wirbelsäule. */
export type SchleifenStation = { id: string; a: number; b: number; f: number };

/**
 * V6: Loops des Dokuments mit ihren Stationen (nach f geordnet): Rücken- und Bauchknoten der Seite tragen die Kennung; die
 * Sprosse des Loop-Rings läuft genau durch beide. Nur mit dem Querschnitt aus der Hülle; Loops ohne zwei Seitenknoten zählen nicht.
 */
export function schleifenStationen(dok: Dokument, l: Leiter): SchleifenStation[] {
  const out: SchleifenStation[] = [];
  // die Leiter rechnet in Profil-Einheiten wie die Knoten
  for (const sch of dok.schleifen ?? []) {
    const kn = dok.profile.seite.knoten.filter((k) => k.schleife === sch.id);
    if (kn.length !== 2) continue;
    const pa = { x: kn[0]!.p.x, y: kn[0]!.p.y };
    const pb = { x: kn[1]!.p.x, y: kn[1]!.p.y };
    // welcher Knoten auf dem Rücken liegt: der näher an der Rückenlinie
    const ra = zugAnteil(l.ruecken, pa);
    const rb = zugAnteil(l.ruecken, pb);
    const [o, u] = ra.d <= rb.d ? [pa, pb] : [pb, pa];
    const a = zugAnteil(l.ruecken, o).t;
    const b = zugAnteil(l.bauch, u).t;
    out.push({ id: sch.id, a, b, f: spineAnteile(l, [{ a, b }])[0]! });
  }
  return out.sort((x, y) => x.f - y.f);
}

/**
 * V6: Loop-Ringe in die Stationen einsetzen (nach den 24 Ringen der Ringwahl, je Loop einer dazu): an der Stelle ihres
 * Anteils f, Sprosse genau durch die Knoten; Ecken, Reifen und Linienringe rücken mit. Die eingefrorenen Anteile bleiben die
 * der Ringwahl (ein Loop kommt und geht, ohne sie zu ändern).
 */
function mitSchleifen(st: Stationen, l: Leiter, schl: readonly SchleifenStation[]): Stationen {
  if (!schl.length) return st;
  const f = spineAnteile(l, st.ringe);
  const ringe = st.ringe.slice();
  const fs = f.slice();
  const ringeNeu: number[] = [];
  const nat = st.ringeNatuerlich?.slice();
  for (const sc of schl) {
    // nur zwischen dem ersten und dem letzten Ring (davor und dahinter liegen die Kappen)
    if (!(sc.f > fs[0]! && sc.f < fs[fs.length - 1]!)) continue;
    let k = 0;
    while (k < fs.length && fs[k]! < sc.f) k++;
    ringe.splice(k, 0, { a: sc.a, b: sc.b });
    nat?.splice(k, 0, { a: sc.a, b: sc.b });
    fs.splice(k, 0, sc.f);
    for (let q = 0; q < ringeNeu.length; q++) if (ringeNeu[q]! >= k) ringeNeu[q] = ringeNeu[q]! + 1;
    ringeNeu.push(k);
  }
  // alte Ringnummer → neue
  const neu = (r: number): number => {
    let n = r;
    const eingefuegt = ringeNeu.slice().sort((x, y) => x - y);
    for (const k of eingefuegt) if (k <= n) n++;
    return n;
  };
  return {
    ...st,
    ringe,
    ecken: st.ecken.map((e) => ({ ...e, ring: neu(e.ring) })),
    reifen: st.reifen.map((r) => ({ ...r, ring: neu(r.ring) })),
    ...(st.linien ? { linien: st.linien.map((r) => ({ ...r, ring: neu(r.ring) })) } : {}),
    ...(nat ? { ringeNatuerlich: nat } : {}),
    schleifen: schl.filter((sc) => sc.f > f[0]! && sc.f < f[f.length - 1]!).map((sc, q) => ({ id: sc.id, ring: ringeNeu[q]! })),
  };
}

/**
 * V6: Lage je Ring in der Kette ohne Loop-Ringe — ganzzahlig für die übrigen Ringe, für Loop-Ringe gebrochen zwischen ihren
 * Nachbarn (nach dem Anteil der Wirbelsäule). Kettenweite Entscheidungen (Berühren, Fülle, Breitenlinie) treffen die übrigen
 * Ringe, die Loop-Ringe tasten sie an ihrer Lage ab.
 */
export function schleifenLage(l: Leiter, st: Stationen): number[] {
  const loops = new Set((st.schleifen ?? []).map((s) => s.ring));
  const R = st.ringe.length;
  const lage = new Array<number>(R);
  let k = -1;
  for (let i = 0; i < R; i++) if (!loops.has(i)) lage[i] = ++k;
  if (!loops.size) return lage;
  const f = spineAnteile(l, st.ringeNatuerlich ?? st.ringe);
  for (let i = 0; i < R; i++) {
    if (!loops.has(i)) continue;
    let a = i - 1;
    while (a >= 0 && loops.has(a)) a--;
    let b = i + 1;
    while (b < R && loops.has(b)) b++;
    // Loops liegen zwischen dem ersten und dem letzten Ring; gebrochen, damit sie nie ganzzahlig sind
    const t = f[b]! > f[a]! ? (f[i]! - f[a]!) / (f[b]! - f[a]!) : 0.5;
    lage[i] = lage[a]! + Math.min(0.999, Math.max(0.001, t));
  }
  return lage;
}

/** V5: Käfigkante (rechte Hälfte) einer Linienschleife — Reihe zwischen zwei Ringen bzw. Stück eines Querlinien-Rings. */
export type LinienKante = { linie: number; a: number; b: number };

/** V5: Wie eine P-Linie im Käfig liegt — als Reihe oder Ring genau auf ihr (`schleife`), sonst als Treppe bzw. gar nicht. */
export type LinienBau = { art: LinienEinordnung['art']; schleife: boolean };

export type Ableitung = {
  /**
   * S3 „Umrisse berühren“ (nur mit `opt.fuelle`): größtes Wachstum je Ring, Zahl der Wünsche, Höhen „nur als Kante
   * erreichbar“ (die Fülle der Stufe deckelt) und Höhen eines anderen Teils (mehr als eine Berührung)
   */
  rand?: { wachstum: number[]; nachfrage: number; kante: RandMarke[]; teil: RandMarke[] };
  opt: AbleitOptionen;
  vorlage: Roehre;
  unterteilung: Unterteilung;
  loeser: GrenzLoeser;
  stationen: Station[];
  kappenStationen: { vorn: Station[]; hinten: Station[] };
  ecken: Ecke[];
  /** Reifen (M3): Ringe auf den Stationen der gezeichneten Spanten */
  reifen: Reifen[];
  /** V5: Ringe der Querlinien, Einordnung und Bau je P-Linie (nur mit `umrisse: 'exakt'`) */
  linienRinge?: LinienRing[];
  linienEinordnung?: LinienEinordnung[];
  linienBau?: LinienBau[];
  /** V5: feine Punkte längs der Linienschleifen (Zeilen nach der dichten Anpassung im Ausgleich) */
  linienFein?: LinienFein;
  /** V5: Stationen der Ringe vor dem Drehen in die Linien (die Form kommt aus ihnen, `HuellenFeld`) */
  stationenNatuerlich?: Station[];
  /** V6: Ringe der Loops */
  schleifenRinge?: SchleifenRing[];
  /** V5 „Form zuerst“: Körper ohne Linien und die an seine Form gebundenen feinen Punkte (Zeilen nach den Linienpunkten) */
  form?: Ableitung;
  formFein?: FormFein;
  spitzen: { vorn: boolean; hinten: boolean };
  /** wirksame Stationen als Wirbelsäulen-Anteile (zum Einfrieren im Dokument, Schritt 3) */
  gefroren: GefroreneStationen;
  /** Zielpunkte (3 je Käfigpunkt), Höhe je Käfigpunkt auf seiner Sprosse (1 oben … 0 unten), Käfig, feines Netz */
  ziele: Float64Array;
  hoehe: Float64Array;
  kaefig: Kaefig;
  fein: Float64Array;
  breiten: Breiten;
  /** Leiter und Dokument, aus denen die aktuellen Ziele stammen (für Züge) */
  altLeiter: Leiter;
  dokAlt: Dokument;
  /** feine Nahtpunkte (Stufe L, Schleifenreihenfolge), ihr Anteil der Bogenlänge auf dem Seitenumriss, Ausgleichslöser */
  naht: { fein: Uint32Array; anteil: Float64Array; loeser: AusgleichsLoeser | null };
  /** Breitenschleife im Ausgleich: je Zeile der feine Punkt (= Käfigpunkt) und das Vorzeichen seiner z-Seite; null = aus */
  breite: Breite | null;
  /** V4: Bericht der exakten Umrisse (nur mit `umrisse: 'exakt'`) */
  umrisse?: UmrissBericht;
  /** V4: feine Punkte der dichten Anpassung (Zeilen nach den Breitenpunkten im Ausgleich) */
  dicht?: DichtFein;
  zeiten: { leiter: number; breiten: number; matrix: number; loeser: number; ziele: number; gesamt: number };
};

const uhr = (globalThis as { performance?: { now(): number } }).performance;
const jetzt = () => (uhr ? uhr.now() : Date.now());

/** Punkt bei Anteil t ∈ [0, 1] der Bogenlänge eines Zugs (die Züge der Leiter sind gleichmäßig abgetastet). */
export function zugBei(zug: readonly V2[], t: number): V2 {
  const n = zug.length - 1;
  const x = Math.min(n, Math.max(0, t * n));
  const i = Math.min(n - 1, Math.floor(x));
  const f = x - i;
  const a = zug[i]!;
  const b = zug[i + 1]!;
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
}

/**
 * Leiter des Kerns: die kürzeste Leiter (`versuch/wirbelsaeule`), an den Enden entfächert. Ist eine Linie am Ende
 * aufgebraucht, während die andere noch läuft (Langhals: die Rückenlinie endet an der tief liegenden Schwanzspitze, die
 * Bauchlinie rundet darunter noch 5 % weiter), teilen sich alle Sprossen dort einen Endpunkt; Ringe und Kappe fielen auf
 * die Spitze zusammen (94 Durchdringungen). Solche Läufe gleicher Anteile am Anfang und Ende werden linear verteilt,
 * monoton bleibt die Leiter; Treppen in der Mitte hat die Leiter schon geglättet.
 */
export function kernLeiter(dok: Dokument): Leiter {
  // mit getrennten Kiefern: Schlitz als Sehne und ohne Rückknick (seiteFuerLeiter), gleich für alle Aufrufer
  const s = schlitzIm(dok.profile.seite);
  const d = s ? { ...dok, profile: { ...dok.profile, seite: seiteFuerLeiter(dok.profile.seite, s) } } : dok;
  // Teil G, G2: Enden eingefroren (gleiche Knotenzahl) oder über die Mittelachse; ohne Seitenast wie bisher der vorderste
  // und der hinterste Punkt (bitgleich). Die tatsächlich benutzten Enden gehen als Anker in die eingefrorenen Stationen.
  const e = endenFuer(dok);
  const roh = leiterEntfaechern(e.quelle === 'spitzen' ? leiter(d, WIRBEL_STANDARD) : leiter(d, WIRBEL_STANDARD, { vorn: e.vorn, hinten: e.hinten }, ENDEN_FANG));
  // G2b (Fächer an inneren Ecken) nicht mit Maul: Der Maulbau ist mit der Leiter von vor G2 geprüft (16.10.)
  const mitMaul = dok.profile.seite.knoten.some((k) => k.marke) || !!dok.maul || (!!dok.ausstattung?.maul && dok.ausstattung.maul !== 'aus');
  const l = leiterAnLoops(mitMaul ? roh : leiterInnenEntfaechern(roh), dok);
  const seite = dok.profile.seite;
  return { ...l, enden: { vorn: profilAnker(seite, l.ruecken[0]!), hinten: profilAnker(seite, l.ruecken[l.ruecken.length - 1]!), knoten: seite.knoten.length } };
}

/**
 * V6: Die Leiter an den Sprossen der Loops festheften (Rücken- und Bauchknoten) und dazwischen glatt verziehen: je Paar der
 * Bauchanteil um die Abweichung, die zwischen den beiden benachbarten Loops (bzw. den Enden, dort 0) linear verläuft, danach
 * monoton. Liegt ein Loop auf der Leiter (gleich nach dem Einfügen), ändert sich nichts; ist er geformt, läuft die Leiter
 * durch ihn, und kein Ring aus der Leiter kreuzt ihn (vorher: Langhals verjüngt, Ringe gekreuzt, Fläche umgeklappt 179°).
 */
function leiterAnLoops(l: Leiter, dok: Dokument): Leiter {
  const fest: { a: number; d: number }[] = [];
  const bAn = (a: number): number => {
    const p = l.paare;
    let k = 0;
    while (k + 2 < p.length && p[k + 1]!.a < a) k++;
    const a0 = p[k]!.a;
    const a1 = p[k + 1]!.a;
    const t = a1 > a0 ? Math.min(1, Math.max(0, (a - a0) / (a1 - a0))) : 0;
    return p[k]!.b + (p[k + 1]!.b - p[k]!.b) * t;
  };
  for (const sc of dok.schleifen ?? []) {
    const kn = dok.profile.seite.knoten.filter((k) => k.schleife === sc.id);
    if (kn.length !== 2) continue;
    const p0 = { x: kn[0]!.p.x, y: kn[0]!.p.y };
    const p1 = { x: kn[1]!.p.x, y: kn[1]!.p.y };
    const r0 = zugAnteil(l.ruecken, p0);
    const r1 = zugAnteil(l.ruecken, p1);
    const [o, u] = r0.d <= r1.d ? [p0, p1] : [p1, p0];
    const a = zugAnteil(l.ruecken, o).t;
    const b = zugAnteil(l.bauch, u).t;
    if (a > 0 && a < 1) fest.push({ a, d: b - bAn(a) });
  }
  if (!fest.length || fest.every((f) => Math.abs(f.d) < 1e-9)) return l;
  fest.sort((x, y) => x.a - y.a);
  const stuetzen = [{ a: 0, d: 0 }, ...fest, { a: 1, d: 0 }];
  const versatz = (a: number): number => {
    let k = 0;
    while (k + 2 < stuetzen.length && stuetzen[k + 1]!.a < a) k++;
    const s0 = stuetzen[k]!;
    const s1 = stuetzen[k + 1]!;
    const t = s1.a > s0.a ? Math.min(1, Math.max(0, (a - s0.a) / (s1.a - s0.a))) : 0;
    return s0.d + (s1.d - s0.d) * t;
  };
  const paare = l.paare.map((p) => ({ a: p.a, b: Math.min(1, Math.max(0, p.b + versatz(p.a))) }));
  for (let k = 1; k < paare.length; k++) paare[k]!.b = Math.max(paare[k]!.b, paare[k - 1]!.b);
  return { ...l, paare };
}

/** Teil G: Eingefrorene Enden, die höchstens so weit (Anteil der Umriss-Abtastung) neben der Spitze liegen, rasten auf sie. */
const ENDEN_FANG = 0.004;

/** Teil G, G2b: Ein Stocken einer Kette gilt als Fächer, wenn die andere dabei weiter vorrückt als die Sprosse lang ist. */
const FAECHER_ANTEIL = 0.2;
const FAECHER_LAENGE = 1;

/**
 * Teil G, G2b: Fächer an inneren Ecken auflösen. Die kürzeste Leiter bleibt an einer Kehle (Ente: Kinn → Hals) mit vielen
 * Sprossen an einem Punkt der einen Kette hängen, während die andere um die Ecke läuft; die Ringe laufen dort zusammen, die
 * Fläche faltet. Läuft eine Kette über ein Stück weniger als 20 % der anderen und rückt die andere dabei weiter vor, als
 * die Sprosse lang ist, wird die stockende Kette über das doppelt so breite Stück gleichmäßig nach dem Fortschritt der
 * anderen verteilt (beide Anteile bleiben monoton). Kleinere Stockungen (Langhals am Kinn: 15–21 px bei einer Halsdicke
 * von 28 px) bleiben; alle bisherigen Prüfkörper bauen bitgleich.
 */
export function leiterInnenEntfaechern(l: Leiter): Leiter {
  const p = l.paare.map((x) => ({ a: x.a, b: x.b }));
  const n = p.length;
  if (n < 12) return l;
  const lang = (z: readonly V2[]) => {
    let s2 = 0;
    for (let i = 1; i < z.length; i++) s2 += Math.hypot(z[i]!.x - z[i - 1]!.x, z[i]!.y - z[i - 1]!.y);
    return s2;
  };
  const L = { a: lang(l.ruecken), b: lang(l.bauch) };
  const sprosse = (k: number) => {
    const o = zugBei(l.ruecken, p[k]!.a);
    const u = zugBei(l.bauch, p[k]!.b);
    return Math.hypot(o.x - u.x, o.y - u.y);
  };
  const rand = Math.max(2, Math.round(0.03 * n));
  let geaendert = false;
  for (const [st, an] of [
    ['b', 'a'],
    ['a', 'b'],
  ] as const) {
    let k = rand;
    while (k < n - rand - 1) {
      const schritt = (j: number) => ({ s: (p[j + 1]![st] - p[j]![st]) * L[st], o: (p[j + 1]![an] - p[j]![an]) * L[an] });
      const q = schritt(k);
      if (!(q.o > 0 && q.s < FAECHER_ANTEIL * q.o)) {
        k++;
        continue;
      }
      let e = k;
      while (e + 1 < n - rand - 1) {
        const r = schritt(e + 1);
        if (!(r.s < FAECHER_ANTEIL * Math.max(r.o, 1e-12))) break;
        e++;
      }
      const vor = (p[e + 1]![an] - p[k]![an]) * L[an];
      let sp = 0;
      for (let j = k; j <= e + 1; j++) sp = Math.max(sp, sprosse(j));
      if (vor > FAECHER_LAENGE * sp) {
        const m = e + 1 - k;
        const w0 = Math.max(rand, k - m);
        const w1 = Math.min(n - rand - 1, e + 1 + m);
        const s0 = p[w0]![st];
        const s1 = p[w1]![st];
        const o0 = p[w0]![an];
        const o1 = p[w1]![an];
        if (o1 > o0) for (let j = w0 + 1; j < w1; j++) p[j]![st] = s0 + ((s1 - s0) * (p[j]![an] - o0)) / (o1 - o0);
        geaendert = true;
        k = w1;
      } else k = e + 1;
    }
  }
  return geaendert ? { ...l, paare: p } : l;
}

export function leiterEntfaechern(l: Leiter): Leiter {
  const p = l.paare.map((x) => ({ a: x.a, b: x.b }));
  const n = p.length;
  if (n < 3) return l;
  const SCHWELLE = 0.5;
  for (const [stockt, andere] of [
    ['a', 'b'],
    ['b', 'a'],
  ] as const) {
    // Ende: solange die stockende Linie weniger als 30 % des Rests der anderen vor sich hat (ab dort bis zum Schluss)
    let i0 = n - 1;
    while (i0 - 1 > 0 && 1 - p[i0 - 1]![stockt] < SCHWELLE * (1 - p[i0 - 1]![andere])) i0--;
    if (i0 < n - 1) {
      const s0 = p[i0 - 1]![stockt];
      const o0 = p[i0 - 1]![andere];
      for (let k = i0; k < n; k++) p[k]![stockt] = o0 < 1 ? s0 + ((1 - s0) * (p[k]![andere] - o0)) / (1 - o0) : 1;
    }
    // Anfang: spiegelbildlich (die stockende Linie hat weniger als 30 % des Wegs der anderen hinter sich)
    let j0 = 0;
    while (j0 + 1 < n - 1 && p[j0 + 1]![stockt] < SCHWELLE * p[j0 + 1]![andere]) j0++;
    if (j0 > 0) {
      const s1 = p[j0 + 1]![stockt];
      const o1 = p[j0 + 1]![andere];
      for (let k = 0; k <= j0; k++) p[k]![stockt] = o1 > 0 ? (s1 * p[k]![andere]) / o1 : 0;
    }
  }
  return { ...l, paare: p };
}

/** Sprossen der Leiter nach Bogenlänge der Wirbelsäule (Mitten) → Stationen bei Anteil f. */
export function stationenAusLeiter(l: Leiter, anteile: readonly number[]): Station[] {
  const mitten = l.paare.map((p) => {
    const o = zugBei(l.ruecken, p.a);
    const u = zugBei(l.bauch, p.b);
    return { x: (o.x + u.x) / 2, y: (o.y + u.y) / 2 };
  });
  const cum = [0];
  for (let k = 1; k < mitten.length; k++) cum.push(cum[k - 1]! + Math.hypot(mitten[k]!.x - mitten[k - 1]!.x, mitten[k]!.y - mitten[k - 1]!.y));
  const L = cum[cum.length - 1]!;
  return anteile.map((f) => {
    const z = Math.min(L, Math.max(0, f * L));
    let k = 0;
    while (k < cum.length - 2 && cum[k + 1]! < z) k++;
    const d = cum[k + 1]! - cum[k]!;
    const t = d > 1e-12 ? (z - cum[k]!) / d : 0;
    const p = l.paare[k]!;
    const q = l.paare[k + 1]!;
    return { a: p.a + (q.a - p.a) * t, b: p.b + (q.b - p.b) * t };
  });
}

// ---------- Seitenumriss (dicht) ----------

/** Seitenumriss dicht abgetastet (Welt, geschlossen) mit Bogenlängen-Anteilen. */
/** Dichter Seitenumriss mit Bogenlängen-Anteilen; `offen` = Zug ohne Rückweg (Umriss ohne Maulschlitz, Block 2). */
export type UmrissDicht = { pts: V2[]; anteil: Float64Array; offen?: boolean };

/**
 * Seitenumriss ohne den Maulschlitz (Block 2): offener Zug vom Knoten hinter dem Schlitz einmal herum bis zum Knoten
 * davor — die Naht hängt an der schwarzen Linie und endet an den beiden Lippenknoten (Anteil 0 und 1).
 */
export function umrissDichtOffen(dok: Dokument, schlitz: Schlitz): UmrissDicht {
  const s = dok.skalierung;
  const pr = dok.profile.seite;
  const segs = segmente(pr);
  const n = segs.length;
  const pts: V2[] = [];
  for (let q = 1; q < n; q++) {
    const seg = segs[(schlitz.segment + q) % n]!;
    const abt = pfadAbtasten([seg], 96);
    for (let k = q === 1 ? 0 : 1; k < abt.length; k++) pts.push({ x: abt[k]!.x * s, y: abt[k]!.y * s });
  }
  const anteil = new Float64Array(pts.length);
  for (let i = 1; i < pts.length; i++) anteil[i] = anteil[i - 1]! + Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.y - pts[i - 1]!.y);
  const L = anteil[pts.length - 1]! || 1;
  for (let i = 0; i < pts.length; i++) anteil[i]! /= L;
  return { pts, anteil, offen: true };
}

export function umrissDicht(dok: Dokument): UmrissDicht {
  const s = dok.skalierung;
  let pts = pfadAbtasten(vollerPfad(dok.profile.seite), 96).map((p) => ({ x: p.x * s, y: p.y * s }));
  if (pts.length > 1 && Math.hypot(pts[0]!.x - pts[pts.length - 1]!.x, pts[0]!.y - pts[pts.length - 1]!.y) < 1e-9) pts = pts.slice(0, -1);
  const anteil = new Float64Array(pts.length + 1);
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]!;
    const b = pts[(i + 1) % pts.length]!;
    anteil[i + 1] = anteil[i]! + Math.hypot(b.x - a.x, b.y - a.y);
  }
  const L = anteil[pts.length]! || 1;
  for (let i = 0; i <= pts.length; i++) anteil[i]! /= L;
  return { pts, anteil };
}

/** Punkt bei Bogenlängen-Anteil t auf dem geschlossenen (bzw. offenen) Umriss. */
export function umrissBei(u: UmrissDicht, t: number): V2 {
  const n = u.pts.length;
  if (u.offen) {
    const x = Math.min(1, Math.max(0, t));
    let lo = 0;
    let hi = n - 1;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (u.anteil[m]! <= x) lo = m;
      else hi = m;
    }
    const a = u.pts[lo]!;
    const b = u.pts[Math.min(n - 1, lo + 1)]!;
    const d = u.anteil[Math.min(n - 1, lo + 1)]! - u.anteil[lo]!;
    const f = d > 1e-15 ? (x - u.anteil[lo]!) / d : 0;
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
  }
  const x = t - Math.floor(t);
  let lo = 0;
  let hi = n;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (u.anteil[m]! <= x) lo = m;
    else hi = m;
  }
  const a = u.pts[lo]!;
  const b = u.pts[(lo + 1) % n]!;
  const d = u.anteil[lo + 1]! - u.anteil[lo]!;
  const f = d > 1e-15 ? (x - u.anteil[lo]!) / d : 0;
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
}

/** Nächster Anteil auf dem Umriss zu einem Punkt. */
export function umrissAnteil(u: UmrissDicht, p: V2): number {
  const n = u.pts.length;
  let best = Infinity;
  let bestT = 0;
  for (let i = 0; i < (u.offen ? n - 1 : n); i++) {
    const a = u.pts[i]!;
    const b = u.pts[(i + 1) % n]!;
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const l2 = abx * abx + aby * aby;
    const f = l2 > 1e-18 ? Math.min(1, Math.max(0, ((p.x - a.x) * abx + (p.y - a.y) * aby) / l2)) : 0;
    const d = Math.hypot(a.x + abx * f - p.x, a.y + aby * f - p.y);
    if (d < best) {
      best = d;
      bestT = u.anteil[i]! + (u.anteil[i + 1]! - u.anteil[i]!) * f;
    }
  }
  return bestT;
}

// ---------- Naht ----------

/**
 * Feine Nahtpunkte (z = 0) als geschlossene Schleife ordnen: Nachbarn sind über Kanten der feinen Stufe verbunden, Start
 * ist die Spitze vorn (gleicher Index wie im Käfig), Laufrichtung über den Rücken (zuerst der Nachbar mit dem höheren y).
 */
export function nahtOrdnen(fein: Kaefig, nahtIdx: readonly number[], start: number, n = Infinity): number[] {
  return nahtPfad(fein, nahtIdx, start, n).geordnet;
}

/**
 * Nahtpunkte als Pfad (15.10.): wie `nahtOrdnen`, aber ein unterbrochener Rundgang (mit Maul: die Lippenpunkte gehören
 * nicht zur Naht) wird auch rückwärts vom Start gelaufen, wenn dort ein ganzes Stück Naht mit Käfigpunkten (Index < n)
 * fehlt — beim Ringanfang die Nasenunterseite. Vorher blieb es ohne Naht, und die letzten Nahtpunkte bekamen ihre Ziele
 * über den Rückweg zum Start, die ganze Nase entlang (Langhals: die Mittelnaht des Unterkiefers lag über dem
 * Lippenanfang, 92 Durchdringungen). `offen` = der Rückweg wurde angehängt; dann gilt die Naht nur zwischen den äußeren
 * Käfigpunkten (siehe `fertigstellen`).
 */
export function nahtPfad(fein: Kaefig, nahtIdx: readonly number[], start: number, n = Infinity): { geordnet: number[]; offen: boolean } {
  const drin = new Set(nahtIdx);
  const nachbarn = new Map<number, number[]>();
  for (let e = 0; e < fein.nE; e++) {
    const a = fein.eA[e]!;
    const b = fein.eB[e]!;
    if (drin.has(a) && drin.has(b)) {
      (nachbarn.get(a) ?? nachbarn.set(a, []).get(a)!).push(b);
      (nachbarn.get(b) ?? nachbarn.set(b, []).get(b)!).push(a);
    }
  }
  const out: number[] = [start];
  const gesehen = new Set<number>([start]);
  let vorher = -1;
  let hier = start;
  const kand = nachbarn.get(start) ?? [];
  let naechster = kand[0] ?? -1;
  for (const c of kand) if (fein.xyz[3 * c + 1]! > fein.xyz[3 * naechster + 1]!) naechster = c;
  while (naechster >= 0 && !gesehen.has(naechster)) {
    out.push(naechster);
    gesehen.add(naechster);
    vorher = hier;
    hier = naechster;
    naechster = -1;
    for (const c of nachbarn.get(hier) ?? []) if (c !== vorher && !gesehen.has(c)) naechster = c;
  }
  // geschlossen, wenn der letzte Punkt wieder am Start liegt
  const letzter = out[out.length - 1]!;
  if (out.length < 3 || (nachbarn.get(letzter) ?? []).includes(start)) return { geordnet: out, offen: false };
  // unterbrochen: vom Start rückwärts weiterlaufen und vorne anhängen
  const rueck: number[] = [];
  vorher = out.length > 1 ? out[1]! : -1;
  hier = start;
  naechster = -1;
  for (const c of nachbarn.get(start) ?? []) if (c !== vorher && !gesehen.has(c)) naechster = c;
  while (naechster >= 0 && !gesehen.has(naechster)) {
    rueck.push(naechster);
    gesehen.add(naechster);
    vorher = hier;
    hier = naechster;
    naechster = -1;
    for (const c of nachbarn.get(hier) ?? []) if (c !== vorher && !gesehen.has(c)) naechster = c;
  }
  // nur ein echtes fehlendes Nahtstück (mindestens zwei Käfigpunkte, beim Ringanfang 5–7) wird angehängt; die Spitze von
  // Kugel, Rex oder Platte (0–1 Käfigpunkte zwischen Start und Lücke) bleibt wie bisher
  if (rueck.filter((i) => i < n).length < 2) return { geordnet: out, offen: false };
  return { geordnet: [...rueck.reverse(), ...out], offen: true };
}

/**
 * Bogenlängen-Anteile der geordneten Nahtpunkte: Käfigpunkte (Index < n) über ihr Ziel auf dem Umriss, feine Punkte
 * dazwischen gleichmäßig (monoton, ohne Bündelung).
 */
export function nahtAnteile(geordnet: readonly number[], n: number, ziele: Float64Array, umriss: UmrissDicht, offenerPfad = false): Float64Array {
  const m = geordnet.length;
  const anteil = new Float64Array(m);
  const fest: number[] = [];
  geordnet.forEach((idx, k) => {
    if (idx < n) {
      anteil[k] = umrissAnteil(umriss, { x: ziele[3 * idx]!, y: ziele[3 * idx + 1]! });
      fest.push(k);
    }
  });
  if (fest.length === 0) return anteil;
  if (umriss.offen) {
    // offene Naht (Maulschlitz): zwischen den Ankern gleichmäßig nach Index, die Enden laufen auf die Lippenknoten zu
    // (Anteil 0 bzw. 1 des Umrisses ohne Schlitz); kein Rückweg über den Schlitz
    const k0 = fest[0]!;
    const k1 = fest[fest.length - 1]!;
    const kopfEnde = anteil[k0]! > anteil[k1]! ? 1 : 0;
    for (let k = 0; k < k0; k++) anteil[k] = kopfEnde + ((anteil[k0]! - kopfEnde) * (k + 1)) / (k0 + 1);
    for (let k = k1 + 1; k < m; k++) anteil[k] = anteil[k1]! + ((1 - kopfEnde - anteil[k1]!) * (k - k1)) / (m - k1);
    for (let f = 0; f + 1 < fest.length; f++) {
      const a = fest[f]!;
      const b = fest[f + 1]!;
      for (let q = 1; q < b - a; q++) anteil[a + q] = anteil[a]! + ((anteil[b]! - anteil[a]!) * q) / (b - a);
    }
    return anteil;
  }
  for (let f = 0; f < fest.length; f++) {
    // offener Pfad auf geschlossenem Umriss (Naht mit Lücke am Lippenanfang): kein Weg vom letzten Anker über die Lücke
    if (offenerPfad && f === fest.length - 1) break;
    const k0 = fest[f]!;
    const k1 = fest[(f + 1) % fest.length]!;
    const p0 = anteil[k0]!;
    let d = anteil[k1]! - p0;
    d -= Math.round(d);
    const schritte = ((k1 - k0 + m) % m) || m;
    // gleichmäßig nach Index zwischen den Ankern (eine Verteilung nach der Sehnenlänge der feinen Lagen, 15.10.
    // probiert, kostete Naht-Treue: Rex 0,34 → 0,54 px, Langhals 1,36 → 1,66 px)
    for (let q = 1; q < schritte; q++) {
      const k = (k0 + q) % m;
      let t = p0 + (d * q) / schritte;
      t -= Math.floor(t);
      anteil[k] = t;
    }
  }
  return anteil;
}

// ---------- Stationen ----------

/** Krümmung (1/Länge) eines gleichmäßig abgetasteten Zugs an Anteil t (zweite Differenz). */
function zugKruemmung(zug: readonly V2[], t: number): number {
  const n = zug.length - 1;
  const i = Math.min(n - 1, Math.max(1, Math.round(t * n)));
  const a = zug[i - 1]!;
  const b = zug[i]!;
  const c = zug[i + 1]!;
  const h = (Math.hypot(b.x - a.x, b.y - a.y) + Math.hypot(c.x - b.x, c.y - b.y)) / 2 || 1e-9;
  return Math.hypot(a.x - 2 * b.x + c.x, a.y - 2 * b.y + c.y) / (h * h);
}

/**
 * R Ringanteile zwischen f0 und f1: gleichmäßig nach Wirbelsäulenlänge, verdichtet dort, wo Rücken oder Bauch stark
 * gekrümmt sind (Dichte 1 + λ·κ·L, geglättet). Erster und letzter Ring liegen genau bei f0 und f1.
 */
/** Maulbereich für die Ringverteilung: zwischen `von` und `bis` (Wirbelsäulen-Anteile) mindestens `ringe` Ringe. */
export type MaulBereich = { von: number; bis: number; ringe: number };

function ringAnteile(l: Leiter, R: number, f0: number, f1: number, lambda: number, maul?: MaulBereich, ruhig: readonly V2[] = [], stufung = 0): number[] {
  if ((lambda <= 0 && !maul) || R < 3) {
    const out: number[] = [];
    for (let i = 0; i < R; i++) out.push(f0 + ((f1 - f0) * i) / (R - 1));
    return out;
  }
  const M = 400;
  const st = stationenAusLeiter(l, Array.from({ length: M + 1 }, (_, k) => f0 + ((f1 - f0) * k) / M));
  let L = 0;
  for (let k = 1; k <= M; k++) {
    const o0 = zugBei(l.ruecken, st[k - 1]!.a);
    const u0 = zugBei(l.bauch, st[k - 1]!.b);
    const o1 = zugBei(l.ruecken, st[k]!.a);
    const u1 = zugBei(l.bauch, st[k]!.b);
    L += Math.hypot((o1.x + u1.x - o0.x - u0.x) / 2, (o1.y + u1.y - o0.y - u0.y) / 2);
  }
  // Ruhige Punkte (14.10. spätnachts): Die Lippenanfänge eines getrennten Mauls sind Ecken der Schlitzsehne, keine Form
  // des Körpers. Zählte ihre Krümmung, drängten sich dort drei Ringe auf 0,015 (Kugel: Lippenspalten 0,0095 statt
  // 0,03–0,06 auseinander, Lippe als Klinge mit 147–172°); im Umkreis von 3 % der Wirbelsäule zählen sie nicht.
  const rho = 0.03 * L;
  const nahRuhig = (p: V2) => ruhig.some((r) => Math.hypot(p.x - r.x, p.y - r.y) < rho);
  const kr = (zug: readonly V2[], t: number) => (ruhig.length && nahRuhig(zugBei(zug, t)) ? 0 : zugKruemmung(zug, t));
  const roh = st.map((q) => 1 + lambda * L * Math.min(40 / L, kr(l.ruecken, q.a) + kr(l.bauch, q.b)));
  const dichte = roh.map((_, k) => {
    let su = 0;
    let nn = 0;
    for (let j = Math.max(0, k - 8); j <= Math.min(M, k + 8); j++) {
      su += roh[j]!;
      nn++;
    }
    return su / nn;
  });
  // Maulbereich (14.10. spätnachts): Ein kurzes Maul (Langhals: 0,036 der Wirbelsäule zwischen Kopfringen im Abstand 0,05)
  // bekäme keinen einzigen Ring — Zusatzdichte im Bereich, so dass er mindestens `ringe` der R − 1 Abstände erhält;
  // die übrigen Ringe verteilen sich weich um (Rand ±15 % des Bereichs)
  if (maul && maul.bis > maul.von) {
    const kVon = ((maul.von - f0) / (f1 - f0)) * M;
    const kBis = ((maul.bis - f0) / (f1 - f0)) * M;
    const rand = Math.max(1, 0.15 * (kBis - kVon));
    const form = (k: number) => {
      const a = Math.min(1, Math.max(0, (k - (kVon - rand)) / rand));
      const b = Math.min(1, Math.max(0, (kBis + rand - k) / rand));
      return Math.min(a, b);
    };
    let cM = 0;
    let cT = 0;
    let kM = 0;
    for (let k = 0; k <= M; k++) {
      cT += dichte[k]!;
      if (k >= kVon && k <= kBis) cM += dichte[k]!;
      kM += form(k);
    }
    const q = Math.min(0.6, maul.ringe / (R - 1));
    if (kM > 0 && cM < q * cT) {
      const w = (q * cT - cM) / (kM * (1 - q));
      for (let k = 0; k <= M; k++) dichte[k] = dichte[k]! + w * form(k);
    }
  }
  if (stufung > 0) ringeStufen(l, st, dichte, R, stufung);
  const cum = [0];
  for (let k = 1; k <= M; k++) cum.push(cum[k - 1]! + (dichte[k - 1]! + dichte[k]!) / 2);
  const gesamt = cum[M]!;
  const out: number[] = [];
  for (let i = 0; i < R; i++) {
    const ziel = (gesamt * i) / (R - 1);
    let k = 0;
    while (k < M - 1 && cum[k + 1]! < ziel) k++;
    const d = cum[k + 1]! - cum[k]!;
    const t = d > 1e-15 ? (ziel - cum[k]!) / d : 0;
    out.push(f0 + ((f1 - f0) * (k + t)) / M);
  }
  out[0] = f0;
  out[R - 1] = f1;
  return out;
}

/**
 * Stufung der Ringabstände (Größenfeld mit beschränktem Gefälle, wie bei der Netzerzeugung): Abstand der Ringe an Probe k
 * h_k = G · ds_k / dichte_k (G = Dichte je Ringabstand, ds_k = Bogenlänge der Sprossenmitten je Probe); verlangt wird
 * h_k ≤ h_j + g · |s_k − s_j| für alle j (zwei Durchläufe, exakt für Abstände auf einer Linie). Wo das verletzt ist, steigt
 * die Dichte; dadurch wächst G, deshalb wenige Runden. Proben ohne Verletzung behalten ihre Dichte bitgenau.
 */
function ringeStufen(l: Leiter, st: readonly Station[], dichte: number[], R: number, g: number): void {
  const M = st.length - 1;
  const s = new Float64Array(M + 1);
  const mitte = st.map((q) => {
    const o = zugBei(l.ruecken, q.a);
    const u = zugBei(l.bauch, q.b);
    return { x: (o.x + u.x) / 2, y: (o.y + u.y) / 2 };
  });
  for (let k = 1; k <= M; k++) s[k] = s[k - 1]! + Math.hypot(mitte[k]!.x - mitte[k - 1]!.x, mitte[k]!.y - mitte[k - 1]!.y);
  // Bogenlänge je Probe (Mittel der Nachbarstrecken), nie 0
  const ds = Array.from({ length: M + 1 }, (_, k) => Math.max(1e-9, (s[Math.min(M, k + 1)]! - s[Math.max(0, k - 1)]!) / (k === 0 || k === M ? 1 : 2)));
  for (let runde = 0; runde < 6; runde++) {
    let gesamt = 0;
    for (let k = 1; k <= M; k++) gesamt += (dichte[k - 1]! + dichte[k]!) / 2;
    const G = gesamt / (R - 1);
    const h = dichte.map((d, k) => (G * ds[k]!) / d);
    const roh = h.slice();
    for (let k = 1; k <= M; k++) h[k] = Math.min(h[k]!, h[k - 1]! + g * (s[k]! - s[k - 1]!));
    for (let k = M - 1; k >= 0; k--) h[k] = Math.min(h[k]!, h[k + 1]! + g * (s[k + 1]! - s[k]!));
    let geaendert = false;
    for (let k = 0; k <= M; k++) {
      if (h[k]! < roh[k]! * (1 - 1e-9)) {
        dichte[k] = (G * ds[k]!) / h[k]!;
        geaendert = true;
      }
    }
    if (!geaendert) break;
  }
}

/** Nächster Anteil eines Punkts auf einem offenen Zug (gleichmäßig abgetastet). */
export function zugAnteil(zug: readonly V2[], p: V2): { t: number; d: number } {
  let best = Infinity;
  let bestT = 0;
  const n = zug.length - 1;
  for (let i = 0; i < n; i++) {
    const a = zug[i]!;
    const b = zug[i + 1]!;
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const l2 = abx * abx + aby * aby;
    const f = l2 > 1e-18 ? Math.min(1, Math.max(0, ((p.x - a.x) * abx + (p.y - a.y) * aby) / l2)) : 0;
    const d = Math.hypot(a.x + abx * f - p.x, a.y + aby * f - p.y);
    if (d < best) {
      best = d;
      bestT = (i + f) / n;
    }
  }
  return { t: bestT, d: best };
}

/** Anteil f der Wirbelsäule, an dem die Leiter den Anteil `t` auf Rücken (oben) bzw. Bauch erreicht. */
export function spineAnteilFuer(l: Leiter, t: number, oben: boolean): number {
  const mitten = l.paare.map((p) => {
    const o = zugBei(l.ruecken, p.a);
    const u = zugBei(l.bauch, p.b);
    return { x: (o.x + u.x) / 2, y: (o.y + u.y) / 2 };
  });
  const cum = [0];
  for (let k = 1; k < mitten.length; k++) cum.push(cum[k - 1]! + Math.hypot(mitten[k]!.x - mitten[k - 1]!.x, mitten[k]!.y - mitten[k - 1]!.y));
  const L = cum[cum.length - 1]! || 1;
  for (let k = 0; k + 1 < l.paare.length; k++) {
    const a0 = oben ? l.paare[k]!.a : l.paare[k]!.b;
    const a1 = oben ? l.paare[k + 1]!.a : l.paare[k + 1]!.b;
    if (t >= a0 && t <= a1) {
      const f = a1 > a0 ? (t - a0) / (a1 - a0) : 0;
      return (cum[k]! + (cum[k + 1]! - cum[k]!) * f) / L;
    }
  }
  return t;
}

/**
 * `kappeMin`: Mindestanteil der vorderen Kappe (Maul, das auf der Kontur hinter der Spitze beginnt: die Kappenzeile der
 * Lippe muss vor Ring 0 liegen).
 */
export function stationenWaehlen(l: Leiter, opt: AbleitOptionen, dok?: Dokument, kappeMin?: number, maul?: MaulBereich): Stationen {
  const { ringe: R, ring: N, kappe } = opt;
  const c = N / 4;
  let kappeVorn = kappe;
  let kappeHinten = kappe;
  const eckenRoh: { f: number; oben: boolean }[] = [];
  const spitzen = { vorn: false, hinten: false };
  if (dok && opt.eckenSchaerfe > 0) {
    const sk = dok.skalierung;
    for (const kn of dok.profile.seite.knoten) {
      // Lippenanfänge (markierte Knoten, Block 2) sind keine Ringfalte und nehmen keine Station
      if (kn.art !== 'ecke' || kn.marke) continue;
      const p = { x: kn.p.x * sk, y: kn.p.y * sk };
      const o = zugAnteil(l.ruecken, p);
      const u = zugAnteil(l.bauch, p);
      const oben = o.d <= u.d;
      const t = oben ? o.t : u.t;
      const f = spineAnteilFuer(l, t, oben);
      if (f < 0.4 * kappe) spitzen.vorn = true;
      else if (f > 1 - 0.4 * kappe) spitzen.hinten = true;
      else {
        eckenRoh.push({ f, oben });
        if (f < kappeVorn) kappeVorn = f;
        if (1 - f < kappeHinten) kappeHinten = 1 - f;
      }
    }
  }
  if (spitzen.vorn) kappeVorn = Math.min(kappeVorn, opt.kappeSpitze);
  if (spitzen.hinten) kappeHinten = Math.min(kappeHinten, opt.kappeSpitze);
  if (kappeMin !== undefined && kappeMin > kappeVorn) kappeVorn = Math.min(0.3, kappeMin);
  // Schritt 3 („Käfig als Wahrheit“): eingefrorene Stationen aus dem Dokument werden nur nachgeführt
  const g = opt.stationen;
  // eingefrorene Stationen gelten nur, wenn das Maul genug Ringe hat (ein neues Maul plant die Verteilung einmal neu)
  const maulOk = !maul || (g ? g.ringe.filter((f) => f >= maul.von && f <= maul.bis).length >= maul.ringe - 1 : true);
  if (g && maulOk && g.ringe.length === R && g.vorn.length === c / 2 - 1 && g.hinten.length === c / 2 - 1) return stationenNachfuehren(l, opt, dok, g, eckenRoh, spitzen, kappeMin);
  const ruhig = dok ? dok.profile.seite.knoten.filter((kn) => kn.marke === 'maulOben' || kn.marke === 'maulUnten').map((kn) => ({ x: kn.p.x * dok.skalierung, y: kn.p.y * dok.skalierung })) : [];
  const anteile = ringAnteile(l, R, kappeVorn, 1 - kappeHinten, opt.kruemmung, maul, ruhig, opt.ringStufung ?? 0);
  const ecken: Ecke[] = [];
  for (const e of eckenRoh) {
    if (kappeMin !== undefined && e.f < kappeVorn) continue;
    let best = 0;
    for (let i = 1; i < R; i++) if (Math.abs(anteile[i]! - e.f) < Math.abs(anteile[best]! - e.f)) best = i;
    const schonDa = ecken.find((x) => x.ring === best);
    if (schonDa) {
      if (schonDa.seite !== (e.oben ? 'oben' : 'unten')) schonDa.seite = 'beide';
      continue;
    }
    anteile[best] = e.f;
    ecken.push({ ring: best, seite: e.oben ? 'oben' : 'unten' });
  }
  // Reifen (M3): je gezeichnetem Spant rastet der nächste freie Ring auf seine Station (Sprosse, deren Mitte auf dem x
  // des Spants liegt; Ecken haben Vorrang, Ring 0 und R−1 bleiben); so ist ein Spant genau ein Ring mit Perlen.
  const reifen: Reifen[] = [];
  if (dok?.spanten?.length) dok.spanten.forEach((sp, index) => reifenZuweisen(anteile, ecken, reifen, index, spantAnteil(l, dok, sp), R));
  // V5: je Querlinie und je Ende einer Längslinie rastet der nächste freie Ring auf ihre Stelle (nach Ecken und Reifen)
  const lq = querLinien(l, opt, dok);
  const linien: LinienRing[] = [];
  if (lq) for (const x of lq.wuensche) linienRingZuweisen(anteile, ecken, reifen, linien, x.linie, x.rolle, x.f, R);
  const vorn: number[] = [];
  const hinten: number[] = [];
  for (let r = 1; r < c / 2; r++) {
    vorn.push((kappeVorn * r) / (c / 2));
    hinten.push(1 - (kappeHinten * r) / (c / 2));
  }
  return mitSchleifen(linienAusrichten(stationenZusammensetzen(l, R, anteile, vorn, hinten, ecken, reifen, spitzen, linien), lq), l, opt.schleifen && dok ? schleifenStationen(dok, l) : []);
}

/** V5: P-Linien einordnen (nur mit dem Querschnitt aus der Sichthülle) und ihre Ringwünsche (Querlinien, Enden). */
function querLinien(l: Leiter, opt: AbleitOptionen, dok: Dokument | undefined): { einordnung: LinienEinordnung[]; wuensche: LinienWunsch[] } | null {
  if (opt.umrisse !== 'exakt' || !dok?.kanten?.length || !(opt.eckenSchaerfe > 0)) return null;
  const einordnung = linienEinordnen(
    dok.kanten.map((ka) => kanteAbtasten(ka, dok.skalierung)),
    l,
  );
  return { einordnung, wuensche: linienWuensche(einordnung) };
}

/**
 * V5: Ring einer Linie wie ein Reifen — der nächste freie Ring (nicht Ecke, Reifen, andere Linie; Ring 0/R−1 bleiben). Liegt
 * schon ein belegter Ring näher als ein halber mittlerer Ringabstand, rückt kein zweiter dazu (zwei Ringe fast an derselben
 * Stelle falten die Haut: Ei mit zwei parallelen Linien, 179°): Ein Linienende nimmt dann diesen Ring mit, eine Querlinie
 * bleibt ohne eigenen Ring (Treppe).
 */
function linienRingZuweisen(anteile: number[], ecken: readonly Ecke[], reifen: readonly Reifen[], linien: LinienRing[], linie: number, rolle: LinienRolle, f: number, R: number, bevorzugt?: number): void {
  const belegt = [...ecken.map((e) => e.ring), ...reifen.map((r) => r.ring), ...linien.map((r) => r.ring)];
  const nah = belegt.find((i) => Math.abs(anteile[i]! - f) < 0.5 / (R - 1));
  if (nah !== undefined) {
    if (rolle !== 'quer' && linien.some((r) => r.ring === nah)) linien.push({ linie, ring: nah, rolle, geteilt: true });
    return;
  }
  const frei = (i: number) => i > 0 && i < R - 1 && !ecken.some((e) => e.ring === i) && !reifen.some((r) => r.ring === i) && !linien.some((r) => r.ring === i);
  let best = bevorzugt !== undefined && frei(bevorzugt) ? bevorzugt : -1;
  if (best < 0) {
    for (let i = 1; i < R - 1; i++) {
      if (!frei(i)) continue;
      if (best < 0 || Math.abs(anteile[i]! - f) < Math.abs(anteile[best]! - f)) best = i;
    }
  }
  if (best < 0) return;
  anteile[best] = f;
  linien.push({ linie, ring: best, rolle });
}

/**
 * V5: Ringe der Querlinien in die Sehnen ihrer Linien drehen (Nachbarn anteilig, `linienRingeDrehen`); Linien, deren Drehung
 * die Reihenfolge der Ringe bräche, bleiben schräg (Treppe).
 */
function linienAusrichten(st: Stationen, lq: ReturnType<typeof querLinien>): Stationen {
  if (!lq) return st;
  const einordnung = lq.einordnung.map((e) => ({ ...e }));
  const liste = (st.linien ?? []).flatMap((r) => {
    if (r.geteilt) return [];
    const w = lq.wuensche.find((x) => x.linie === r.linie && x.rolle === (r.rolle ?? 'quer'));
    return w ? [{ ring: r.ring, a: w.a, b: w.b, linie: r.linie }] : [];
  });
  const fest = new Set<number>([...st.ecken.map((e) => e.ring), ...st.reifen.map((r) => r.ring)]);
  const natuerlich = st.ringe.map((x) => ({ ...x }));
  const verworfen = linienRingeDrehen(st.ringe, liste, fest);
  const gedreht = st.ringe.some((x, i) => x.a !== natuerlich[i]!.a || x.b !== natuerlich[i]!.b);
  // eine Querlinie, deren Ring nicht passt, wird schräg (Treppe); eine Längslinie bleibt Reihe, nur ohne genaue Enden
  for (const li of verworfen) {
    const e = einordnung[li]!;
    einordnung[li] = e.art === 'reihe' ? { art: 'reihe' } : { art: 'schraeg' };
  }
  const linien = (st.linien ?? []).filter((r) => !verworfen.includes(r.linie));
  return { ...st, linien, einordnung, ...(gedreht ? { ringeNatuerlich: natuerlich } : {}) };
}

/** Wirbelsäulen-Anteil der Station eines gezeichneten Spants (Sprosse, deren Mitte auf dem x des Spants liegt). */
function spantAnteil(l: Leiter, dok: Dokument, sp: NonNullable<Dokument['spanten']>[number]): number {
  const xs = spantKasten(dok, sp.f).x * dok.skalierung;
  let k = 0;
  let dBest = Infinity;
  l.paare.forEach((pr, i) => {
    const o = zugBei(l.ruecken, pr.a);
    const u = zugBei(l.bauch, pr.b);
    const d = Math.abs((o.x + u.x) / 2 - xs);
    if (d < dBest) {
      dBest = d;
      k = i;
    }
  });
  return spineAnteile(l, [l.paare[k]!])[0]!;
}

/**
 * Reifen für Spant `index` bei Anteil f: Liegt der Spant praktisch auf einer Ecke (näher als ein halber mittlerer
 * Ringabstand), teilen sich beide den Ring (Ring 0/R−1 ausgenommen: Spant 0 auf Ring 0 ließ Lippe und Tasche des
 * Tigers kreuzen); sonst rückt der nächste freie Ring auf f.
 */
function reifenZuweisen(anteile: number[], ecken: readonly Ecke[], reifen: Reifen[], index: number, f: number, R: number): void {
  const ecke = ecken.find((e) => e.ring > 0 && e.ring < R - 1 && Math.abs(anteile[e.ring]! - f) < 0.5 / R);
  if (ecke) {
    reifen.push({ spant: index, ring: ecke.ring });
    return;
  }
  let best = -1;
  for (let i = 1; i < R - 1; i++) {
    if (ecken.some((e) => e.ring === i) || reifen.some((r) => r.ring === i)) continue;
    if (best < 0 || Math.abs(anteile[i]! - f) < Math.abs(anteile[best]! - f)) best = i;
  }
  if (best < 0) return;
  anteile[best] = f;
  reifen.push({ spant: index, ring: best });
}

/** Stationen sortieren (Ecken und Reifen folgen ihrem Wert), Kappenzeilen anhängen, Stationen aus der Leiter bauen. */
function stationenZusammensetzen(l: Leiter, R: number, anteile: number[], vorn: readonly number[], hinten: readonly number[], ecken: Ecke[], reifen: Reifen[], spitzen: { vorn: boolean; hinten: boolean }, linien: LinienRing[] = []): Stationen {
  const werte = ecken.map((e) => anteile[e.ring]!);
  const reifenWerte = reifen.map((r) => anteile[r.ring]!);
  const linienWerte = linien.map((r) => anteile[r.ring]!);
  anteile.sort((a, b) => a - b);
  ecken.forEach((e, k) => {
    e.ring = anteile.indexOf(werte[k]!);
  });
  reifen.forEach((r, k) => {
    r.ring = anteile.indexOf(reifenWerte[k]!);
  });
  linien.forEach((r, k) => {
    r.ring = anteile.indexOf(linienWerte[k]!);
  });
  const alle = stationenAusLeiter(l, [...anteile, ...vorn, ...hinten]);
  const gefroren: GefroreneStationen = { ringe: [...anteile], vorn: [...vorn], hinten: [...hinten], ecken: ecken.map((e) => ({ ...e })), reifen: reifen.map((r) => ({ ...r })), ...(linien.some((r) => !r.geteilt) ? { linien: linien.filter((r) => !r.geteilt).map(({ linie, ring, rolle }) => ({ linie, ring, ...(rolle ? { rolle } : {}) })) } : {}), spitzen: { ...spitzen }, ...(l.enden ? { enden: l.enden } : {}) };
  return { ringe: alle.slice(0, R), kappen: { vorn: alle.slice(R, R + vorn.length), hinten: alle.slice(R + vorn.length) }, ecken, reifen, spitzen, gefroren, ...(linien.length ? { linien } : {}) };
}

/**
 * Eingefrorene Stationen nachführen (Schritt 3): Ringanteile bleiben, Ecken behalten ihren Ring, solange die Seite dort
 * noch eine Ecke hat (neue Ecken bekommen den nächsten freien Ring, der auf sie rückt), Reifen folgen ihrem Spant
 * (neue Spanten bekommen den nächsten freien Ring). Ein Maul, das hinter Ring 0 beginnt (`kappeMin`), schiebt die
 * vorderen Ringe nach hinten und skaliert die Kappenzeilen.
 */
function stationenNachfuehren(l: Leiter, opt: AbleitOptionen, dok: Dokument | undefined, g: GefroreneStationen, eckenRoh: readonly { f: number; oben: boolean }[], spitzen: { vorn: boolean; hinten: boolean }, kappeMin?: number): Stationen {
  const { ringe: R, ring: N } = opt;
  const c = N / 4;
  const anteile = [...g.ringe];
  let vorn = [...g.vorn];
  const hinten = [...g.hinten];
  if (kappeMin !== undefined && kappeMin > anteile[0]!) {
    const kappeVorn = Math.min(0.3, kappeMin);
    anteile[0] = kappeVorn;
    for (let i = 1; i < R; i++) if (anteile[i]! < anteile[i - 1]! + 0.004) anteile[i] = anteile[i - 1]! + 0.004;
    vorn = vorn.map((_, r) => (kappeVorn * (r + 1)) / (c / 2));
  }
  const ecken: Ecke[] = [];
  for (const e of eckenRoh) {
    if (kappeMin !== undefined && e.f < anteile[0]!) continue;
    // auch Ring 0: Beim ersten Bau landet eine Ecke vor allen Ringen nach dem Sortieren dort (Tigerschnauze); sie dort nicht zu
    // suchen, setzte sie bei jeder neuen Knotenzahl auf Ring 1 um (ein eingefügter Punkt verschob den Körper um 1,2 px)
    const alt = g.ecken.find((x) => x.ring >= 0 && x.ring < R && Math.abs(anteile[x.ring]! - e.f) < 0.5 / R);
    let ring = alt ? alt.ring : -1;
    if (ring < 0) {
      for (let i = 1; i < R; i++) {
        if (ecken.some((x) => x.ring === i)) continue;
        if (ring < 0 || Math.abs(anteile[i]! - e.f) < Math.abs(anteile[ring]! - e.f)) ring = i;
      }
      if (ring < 0) continue;
      anteile[ring] = e.f;
    }
    const schonDa = ecken.find((x) => x.ring === ring);
    if (schonDa) {
      if (schonDa.seite !== (e.oben ? 'oben' : 'unten')) schonDa.seite = 'beide';
      continue;
    }
    ecken.push({ ring, seite: e.oben ? 'oben' : 'unten' });
  }
  const reifen: Reifen[] = [];
  if (dok?.spanten?.length) {
    dok.spanten.forEach((sp, index) => {
      const f = spantAnteil(l, dok, sp);
      const alt = g.reifen.find((r) => r.spant === index && r.ring >= 0 && r.ring < R);
      if (alt && !reifen.some((r) => r.ring === alt.ring)) {
        const aufEcke = ecken.some((e) => e.ring === alt.ring);
        if (!aufEcke && alt.ring > 0 && alt.ring < R - 1) {
          anteile[alt.ring] = f;
          reifen.push({ spant: index, ring: alt.ring });
          return;
        }
        // auf dem Ring einer Ecke (wie `reifenZuweisen` ihn beim ersten Bau teilt, auch an Ring 0): bleibt dort
        if (aufEcke && Math.abs(anteile[alt.ring]! - f) < 0.5 / R) {
          reifen.push({ spant: index, ring: alt.ring });
          return;
        }
      }
      reifenZuweisen(anteile, ecken, reifen, index, f, R);
    });
  }
  // V5: Querlinien behalten ihren Ring, solange er frei ist
  const lq = querLinien(l, opt, dok);
  const linien: LinienRing[] = [];
  if (lq) for (const x of lq.wuensche) linienRingZuweisen(anteile, ecken, reifen, linien, x.linie, x.rolle, x.f, R, g.linien?.find((r) => r.linie === x.linie && (r.rolle ?? 'quer') === x.rolle)?.ring);
  return mitSchleifen(linienAusrichten(stationenZusammensetzen(l, R, anteile, vorn, hinten, ecken, reifen, spitzen, linien), lq), l, opt.schleifen && dok ? schleifenStationen(dok, l) : []);
}

/** Wirbelsäulen-Anteil f (0 … 1) je Station: Umkehrung von `stationenAusLeiter` über die Rückenanteile der Leiter. */
export function spineAnteile(l: Leiter, st: readonly { a: number; b: number }[]): number[] {
  const mitten = l.paare.map((pr) => {
    const o = zugBei(l.ruecken, pr.a);
    const u = zugBei(l.bauch, pr.b);
    return { x: (o.x + u.x) / 2, y: (o.y + u.y) / 2 };
  });
  const cum = [0];
  for (let k = 1; k < mitten.length; k++) cum.push(cum[k - 1]! + Math.hypot(mitten[k]!.x - mitten[k - 1]!.x, mitten[k]!.y - mitten[k - 1]!.y));
  const L = cum[cum.length - 1]! || 1;
  return st.map((s) => {
    const a = s.a;
    let k = 0;
    while (k + 2 < l.paare.length && l.paare[k + 1]!.a < a) k++;
    const a0 = l.paare[k]!.a;
    const a1 = l.paare[k + 1]!.a;
    const t = a1 > a0 ? Math.min(1, Math.max(0, (a - a0) / (a1 - a0))) : 0;
    return (cum[k]! + (cum[k + 1]! - cum[k]!) * t) / L;
  });
}

// ---------- Ziele ----------

/** Winkel θ eines Ringpunkts (0 = oben, π/2 = rechts, π = unten). */
const theta = (j: number, N: number) => (2 * Math.PI * j) / N;

/** Schnittgrenzen eines liegenden Abschnitts rasten auf die Enden der Front ein, wenn sie näher als dieser Anteil der Abschnittshöhe liegen. */
const LAPPEN_RASTEN = 0.03;

/** Querschnitt-Form: Höhe v (1 oben … 0 unten) und Breite w (0 … 1) je Ringpunkt j = 0 … N/2 (rechte Hälfte). */
export type Querschnitt = { v: number[]; w: number[]; haerte: number[]; knoten: number[] };

/** Runder Querschnitt (Kreis). */
export function kreisQuerschnitt(N: number): Querschnitt {
  const h = N / 2;
  const v: number[] = [];
  const w: number[] = [];
  for (let j = 0; j <= h; j++) {
    const th = theta(j, N);
    v.push((1 + Math.cos(th)) / 2);
    w.push(Math.abs(Math.sin(th)) < 1e-9 ? 0 : Math.abs(Math.sin(th)));
  }
  return { v, w, haerte: [], knoten: [] };
}

/** Querschnitt aus Front und Spanten (`vorlageBei`) an der Stelle x; nur mit gezeichneten Spanten sinnvoll. */
function spantQuerschnitt(dok: Dokument, x: number, N: number, teil: SpantTeil = 'oben'): Querschnitt {
  const h = N / 2;
  const q = vorlageBei(dok, stelleVon(dok, x / dok.skalierung), h, teil);
  const v = q.q.map((p) => Math.min(1, Math.max(0, p.y)));
  const w = q.q.map((p) => Math.max(0, p.x));
  v[0] = 1;
  v[h] = 0;
  w[0] = 0;
  w[h] = 0;
  return { v, w, haerte: q.haerte, knoten: q.knoten };
}

/**
 * Querschnitt eines liegenden Abschnitts aus seinem Lappen der Front-Silhouette (Höhen yLo … yHi): die rechte Hälfte
 * der Front-Kurve, auf den Höhenbereich beschnitten, nach Bogenlänge abgetastet (Ecken genau auf Stützstellen), Breite
 * normiert auf die größte Breite des Lappens. Ecken der Front im Bereich werden Längsfalten.
 */
function lappenQuerschnitt(dok: Dokument, yLoRoh: number, yHiRoh: number, N: number): Querschnitt {
  const sk = dok.skalierung;
  const front = dok.profile.front;
  // rechte Hälfte der Front als Zug von oben nach unten, mit Markierung der Ecken (Knotenindex)
  const segs = segmente(front);
  const zug: { p: V2; ecke: number }[] = [];
  segs.forEach((seg, si) => {
    const m = 48;
    for (let k = si === 0 ? 0 : 1; k <= m; k++) {
      const q = punktAuf(seg, k / m);
      const knotenIdx = k === 0 ? si : k === m ? si + 1 : -1;
      const kn = knotenIdx >= 0 ? front.knoten[knotenIdx] : undefined;
      zug.push({ p: { x: Math.abs(q.x) * sk, y: q.y * sk }, ecke: kn && kn.art === 'ecke' && Math.abs(kn.p.x) > 1e-9 ? knotenIdx : -1 });
    }
  });
  if (zug.length > 1 && zug[0]!.p.y < zug[zug.length - 1]!.p.y) zug.reverse();
  return lappenAusZug(zug, (i) => front.knoten[i]?.haerte, yLoRoh, yHiRoh, N);
}

/**
 * Lappen-Querschnitt aus einem Zug der rechten Front-Hälfte (oben → unten; `ecke` = Knotenindex einer Ecke oder −1, Härte
 * über `haerteVon`). S5: auch für den Rumpf eines Baums aus einer Front ohne seitliche Teile.
 */
export function lappenAusZug(zug: readonly { p: V2; ecke: number }[], haerteVon: (knoten: number) => number | undefined, yLoRoh: number, yHiRoh: number, N: number): Querschnitt {
  const h = N / 2;
  let yLo = yLoRoh;
  let yHi = yHiRoh;
  // Grenzen auf die Enden der Front einrasten, wenn sie fast zusammenfallen: Front und Seite sind getrennt gezeichnet,
  // die Sprosse endet z. B. bei 0,5297 und die Deckkante liegt bei 0,53. Ohne Einrasten fiele eine flache Deckkante
  // samt ihren Ecken dem Zuschneiden zum Opfer (Kasten → Schräge, keine Falten).
  let fMin = Infinity;
  let fMax = -Infinity;
  for (const q of zug) {
    fMin = Math.min(fMin, q.p.y);
    fMax = Math.max(fMax, q.p.y);
  }
  const rasten = LAPPEN_RASTEN * Math.max(1e-9, yHi - yLo);
  if (fMax > yHi && fMax - yHi <= rasten) yHi = fMax;
  if (fMin < yLo && yLo - fMin <= rasten) yLo = fMin;
  // Reicht der Abschnitt über die Front hinaus (Seite höher oder tiefer als die Front gezeichnet), gilt die Vorlage nur
  // über den Teil, den die Front zeigt, normiert auf 0 … 1. Vorher blieb oben eine Lücke in v, und `v[0] = 1` zog die
  // erste Stützstelle als Spitze zur Naht — bei jedem Ring der Gruppe ein Grat auf dem Rücken (14.10., Komma)
  // Nur bei deutlichem Überstand (> 15 % des Abschnitts): kleine Überstände (Langhals-Kopf, 5 %) behalten ihre bisherige
  // Vorlage, dort machte die genauere Kappe einen Grat an der Naht (149°)
  if (fMax - fMin > 1e-6) {
    const hi = Math.min(yHi, fMax);
    const lo = Math.max(yLo, fMin);
    const ueber = yHi - yLo - (hi - lo);
    if (hi - lo > 0.05 * (fMax - fMin) && ueber > 0.15 * (yHi - yLo)) {
      yHi = hi;
      yLo = lo;
    }
  }
  // auf den Höhenbereich beschneiden (Zwischenpunkte an den Grenzen)
  const drin: { p: V2; ecke: number }[] = [];
  for (let i = 0; i < zug.length; i++) {
    const a = zug[i]!;
    const innen = a.p.y <= yHi + 1e-9 && a.p.y >= yLo - 1e-9;
    if (i > 0) {
      const b = zug[i - 1]!;
      for (const grenze of [yHi, yLo]) {
        if ((b.p.y > grenze) !== (a.p.y > grenze) && Math.abs(a.p.y - b.p.y) > 1e-12) {
          const t = (grenze - b.p.y) / (a.p.y - b.p.y);
          drin.push({ p: { x: b.p.x + (a.p.x - b.p.x) * t, y: grenze }, ecke: -1 });
        }
      }
    }
    if (innen) drin.push(a);
  }
  if (drin.length < 2) return kreisQuerschnitt(N);
  // Beginnt oder endet der Lappen abseits der Achse (abgeschnitten, z. B. Rumpf unter dem Hals), führt eine flache
  // Kante zur Naht; sonst würde der Nahtpunkt eine Schräge zur ersten Stützstelle ziehen.
  let xMax = 0;
  for (const q of drin) xMax = Math.max(xMax, q.p.x);
  if (drin[0]!.p.x > 1e-3 * xMax) drin.unshift({ p: { x: 0, y: drin[0]!.p.y }, ecke: -1 });
  if (drin[drin.length - 1]!.p.x > 1e-3 * xMax) drin.push({ p: { x: 0, y: drin[drin.length - 1]!.p.y }, ecke: -1 });
  // Teilstücke zwischen Ecken, Stützstellen je Teilstück nach Bogenlänge (mindestens eine)
  const grenzen = [0];
  drin.forEach((q, i) => {
    if (q.ecke >= 0 && i > 0 && i < drin.length - 1) grenzen.push(i);
  });
  grenzen.push(drin.length - 1);
  const laengen: number[] = [];
  for (let g = 0; g + 1 < grenzen.length; g++) {
    let L = 0;
    for (let i = grenzen[g]!; i < grenzen[g + 1]!; i++) L += Math.hypot(drin[i + 1]!.p.x - drin[i]!.p.x, drin[i + 1]!.p.y - drin[i]!.p.y);
    laengen.push(L);
  }
  const anteile = anteileVerteilen(laengen, h);
  const v: number[] = [];
  const w: number[] = [];
  const haerte: number[] = [];
  const knoten: number[] = [];
  const H = Math.max(1e-9, yHi - yLo);
  const push = (p: V2) => {
    v.push(Math.min(1, Math.max(0, (p.y - yLo) / H)));
    w.push(p.x);
  };
  push(drin[0]!.p);
  for (let g = 0; g + 1 < grenzen.length; g++) {
    const i0 = grenzen[g]!;
    const i1 = grenzen[g + 1]!;
    const m = anteile[g]!;
    // Bogenlänge im Teilstück
    const cum = [0];
    for (let i = i0; i < i1; i++) cum.push(cum[cum.length - 1]! + Math.hypot(drin[i + 1]!.p.x - drin[i]!.p.x, drin[i + 1]!.p.y - drin[i]!.p.y));
    const L = cum[cum.length - 1]! || 1;
    for (let k = 1; k <= m; k++) {
      const ziel = (L * k) / m;
      let i = 0;
      while (i < cum.length - 2 && cum[i + 1]! < ziel) i++;
      const d = cum[i + 1]! - cum[i]!;
      const t = d > 1e-15 ? (ziel - cum[i]!) / d : 0;
      const a = drin[i0 + i]!.p;
      const b = drin[i0 + i + 1]!.p;
      push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
    if (g + 1 < grenzen.length - 1) {
      const e = drin[i1]!;
      knoten.push(v.length - 1);
      haerte.push(Math.min(1, Math.max(0, haerteVon(e.ecke) ?? 1)));
    }
  }
  let wMax = 0;
  for (const x of w) wMax = Math.max(wMax, x);
  for (let j = 0; j < w.length; j++) w[j] = wMax > 1e-9 ? w[j]! / wMax : 0;
  v[0] = 1;
  v[v.length - 1] = 0;
  w[0] = 0;
  w[w.length - 1] = 0;
  return { v, w, haerte, knoten };
}


/** Verteilt h Intervalle auf Teilstücke nach Länge, mindestens eines je Teilstück (solange h reicht). */
export function anteileVerteilen(laengen: readonly number[], h: number): number[] {
  const summe = laengen.reduce((a, b) => a + b, 0) || 1;
  const anteile = laengen.map((L) => Math.max(1, Math.round((h * L) / summe)));
  let diff = anteile.reduce((a, b) => a + b, 0) - h;
  while (diff !== 0) {
    let wahl = 0;
    for (let g = 1; g < anteile.length; g++) if (diff > 0 ? anteile[g]! > anteile[wahl]! : anteile[g]! < anteile[wahl]!) wahl = g;
    if (diff > 0 && anteile[wahl]! <= 1) break;
    anteile[wahl]! += diff > 0 ? -1 : 1;
    diff += diff > 0 ? -1 : 1;
  }
  return anteile;
}

type Stuetze = { v: number; w: number; haerte: number; lippe: boolean };

/**
 * Querschnitt eines Maulrings mit Kiefer-Spanten (14.10.): über der Lippenhöhe vL der Oberkiefer (`oben`, bis zu seinem
 * ersten Schnitt mit vL), darunter der Unterkiefer (`unten`, ab seinem ersten Schnitt). Der Unterschied der Breiten an
 * der Lippe läuft zur unteren Naht linear aus — so bleibt die Fläche an der Lippe stetig, und weiter unten gilt die
 * gezeichnete Form des Unterkiefers. Ecken beider Teile bleiben Ecken.
 */
export function kieferQuerschnitt(oben: Querschnitt, unten: Querschnitt, vL: number): Querschnitt {
  const schnitt = (q: Querschnitt): { i: number; w: number } | null => {
    for (let i = 0; i + 1 < q.v.length; i++) {
      const a = q.v[i]!;
      const b = q.v[i + 1]!;
      if (a >= vL && vL >= b && a > b) return { i, w: q.w[i]! + ((q.w[i + 1]! - q.w[i]!) * (a - vL)) / (a - b) };
    }
    return null;
  };
  const so = schnitt(oben);
  const su = schnitt(unten);
  if (!so || !su) return oben;
  const v: number[] = [];
  const w: number[] = [];
  const knoten: number[] = [];
  const haerte: number[] = [];
  const knotenVon = (q: Querschnitt) => new Map(q.knoten.map((j, kn) => [j, q.haerte[kn] ?? 0]));
  const ko = knotenVon(oben);
  const ku = knotenVon(unten);
  for (let i = 0; i <= so.i; i++) {
    if (oben.v[i]! <= vL) break;
    if (ko.has(i)) {
      knoten.push(v.length);
      haerte.push(ko.get(i)!);
    }
    v.push(oben.v[i]!);
    w.push(oben.w[i]!);
  }
  v.push(vL);
  w.push(so.w);
  const vUnten = unten.v[unten.v.length - 1]!;
  const versatz = so.w - su.w;
  for (let i = su.i + 1; i < unten.v.length; i++) {
    const vi = unten.v[i]!;
    if (vi >= vL) continue;
    const s = vL - vUnten > 1e-12 ? Math.min(1, Math.max(0, (vi - vUnten) / (vL - vUnten))) : 0;
    if (ku.has(i)) {
      knoten.push(v.length);
      haerte.push(ku.get(i)!);
    }
    v.push(vi);
    w.push(Math.max(0, unten.w[i]! + versatz * s));
  }
  return { v, w, knoten, haerte };
}

/**
 * Querschnitt-Vorlage neu abtasten mit hOut Intervallen; Ecken bleiben auf Stützstellen. Mit `lippe` liegt die
 * Stützstelle `lippe.index` genau auf der Höhe `lippe.v` (erster Schnitt der Vorlage von oben), die übrigen verteilen
 * sich nach Bogenlänge ober- und unterhalb („Schleife einrasten“, Plan 4.2).
 */
export function umparametrisieren(q: Querschnitt, hOut: number, lippe?: { index: number; v: number }): Querschnitt {
  const haerteVon = new Map<number, number>();
  q.knoten.forEach((j, kn) => haerteVon.set(j, q.haerte[kn] ?? 1));
  const pts: Stuetze[] = q.v.map((v, i) => ({ v, w: q.w[i]!, haerte: haerteVon.get(i) ?? 0, lippe: false }));
  let pivot = -1;
  if (lippe) {
    const vMax = pts[0]!.v;
    const vMin = pts[pts.length - 1]!.v;
    const vL = Math.min(vMax - 0.02 * (vMax - vMin), Math.max(vMin + 0.02 * (vMax - vMin), lippe.v));
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i]!;
      const b = pts[i + 1]!;
      if (a.v >= vL && vL >= b.v && a.v > b.v) {
        const t = (a.v - vL) / (a.v - b.v);
        if (t < 1e-6) {
          a.lippe = true;
          pivot = i;
        } else if (t > 1 - 1e-6) {
          b.lippe = true;
          pivot = i + 1;
        } else {
          pts.splice(i + 1, 0, { v: vL, w: a.w + (b.w - a.w) * t, haerte: 0, lippe: true });
          pivot = i + 1;
        }
        break;
      }
    }
    if (pivot < 0) {
      pivot = Math.round(pts.length / 2);
      pts[pivot]!.lippe = true;
    }
  }
  const laengeBis = (i0: number, i1: number) => {
    let L = 0;
    for (let i = i0; i < i1; i++) L += Math.hypot(pts[i + 1]!.w - pts[i]!.w, pts[i + 1]!.v - pts[i]!.v);
    return L;
  };
  // Teilstücke zwischen Ecken (und der Lippe); je Gruppe (über/unter der Lippe) feste Intervallzahl
  const gruppen: { start: number; ende: number; h: number }[] = pivot >= 0 ? [{ start: 0, ende: pivot, h: lippe!.index }, { start: pivot, ende: pts.length - 1, h: hOut - lippe!.index }] : [{ start: 0, ende: pts.length - 1, h: hOut }];
  const v: number[] = [];
  const w: number[] = [];
  const haerte: number[] = [];
  const knoten: number[] = [];
  const push = (p: { v: number; w: number }) => {
    v.push(p.v);
    w.push(p.w);
  };
  push(pts[0]!);
  for (const g of gruppen) {
    if (g.ende <= g.start) continue;
    let grenzen = [g.start];
    for (let i = g.start + 1; i < g.ende; i++) if (pts[i]!.haerte > 0) grenzen.push(i);
    grenzen.push(g.ende);
    // zu viele Ecken für die Intervalle: die kürzesten Teilstücke verschmelzen (Ecke fällt weg)
    while (grenzen.length - 1 > Math.max(1, g.h)) {
      let kurz = 1;
      let kurzL = Infinity;
      for (let t = 1; t + 1 < grenzen.length; t++) {
        const L = laengeBis(grenzen[t - 1]!, grenzen[t]!) + laengeBis(grenzen[t]!, grenzen[t + 1]!);
        if (L < kurzL) {
          kurzL = L;
          kurz = t;
        }
      }
      grenzen = grenzen.filter((_, t) => t !== kurz);
    }
    const laengen: number[] = [];
    for (let t = 0; t + 1 < grenzen.length; t++) laengen.push(laengeBis(grenzen[t]!, grenzen[t + 1]!));
    const anteile = anteileVerteilen(laengen, Math.max(1, g.h));
    for (let t = 0; t + 1 < grenzen.length; t++) {
      const i0 = grenzen[t]!;
      const i1 = grenzen[t + 1]!;
      const m = anteile[t]!;
      const cum = [0];
      for (let i = i0; i < i1; i++) cum.push(cum[cum.length - 1]! + Math.hypot(pts[i + 1]!.w - pts[i]!.w, pts[i + 1]!.v - pts[i]!.v));
      const L = cum[cum.length - 1]! || 1;
      for (let s = 1; s <= m; s++) {
        const ziel = (L * s) / m;
        let i = 0;
        while (i < cum.length - 2 && cum[i + 1]! < ziel) i++;
        const d = cum[i + 1]! - cum[i]!;
        const f = d > 1e-15 ? (ziel - cum[i]!) / d : 0;
        const a = pts[i0 + i]!;
        const b = pts[i0 + i + 1]!;
        push({ v: a.v + (b.v - a.v) * f, w: a.w + (b.w - a.w) * f });
      }
      if (t + 1 < grenzen.length - 1 && pts[i1]!.haerte > 0) {
        knoten.push(v.length - 1);
        haerte.push(pts[i1]!.haerte);
      }
    }
    // Gruppengrenze = Lippe: keine Ecke
  }
  // Sicherung der Länge (Rundung): auf hOut + 1 Stützstellen bringen
  while (v.length > hOut + 1) {
    v.splice(v.length - 2, 1);
    w.splice(w.length - 2, 1);
  }
  while (v.length < hOut + 1) {
    v.splice(v.length - 1, 0, v[v.length - 2]!);
    w.splice(w.length - 1, 0, w[w.length - 2]!);
  }
  return { v, w, haerte, knoten };
}

/**
 * Quadratring r der Kappe (1 … c/2 − 1): Umlauf der rechten Hälfte von oben (Naht) über die Ecke rechts zur Naht unten,
 * Index m = 0 … 4r → Gitterstelle (a, b). Für r = c/2 entspricht m dem Ringindex j von Ring 0.
 */
export function quadratRing(c: number, r: number, m: number): [number, number] {
  if (m <= r) return [c / 2 + m, c / 2 + r];
  if (m <= 3 * r) return [c / 2 + r, c / 2 + 2 * r - m];
  return [c / 2 + 4 * r - m, c / 2 - r];
}

/** Sprosse (Rückenpunkt o, Bauchpunkt u) einer Station. */
export type Sprosse = { o: V2; u: V2 };

/**
 * Querschnitte je Ring und Kappenpunkt-Stufe aus den Sprossen: Ringe werden in Abschnitte gruppiert, liegend (Sprosse
 * eher senkrecht) oder stehend (Sprosse eher waagerecht, z. B. Hals). Liegende Abschnitte bekommen als Vorlage ihren
 * Lappen der Front-Silhouette (Körper, Kopf), stehende einen Kreis. Mit gezeichneten Spanten gilt `vorlageBei`.
 */
export function querschnitteFuer(sprossen: readonly Sprosse[], dok: Dokument | null, breiten: Breiten, N: number, opt: AbleitOptionen): Querschnitt[] {
  if (!opt.querschnitt || !dok) return sprossen.map(() => kreisQuerschnitt(N));
  if (dok.spanten?.length) return sprossen.map((s) => spantQuerschnitt(dok, (s.o.x + s.u.x) / 2, N));
  const liegend = sprossen.map((s) => Math.abs(s.o.y - s.u.y) >= opt.liegendAb * Math.abs(s.o.x - s.u.x));
  const out: Querschnitt[] = new Array(sprossen.length);
  let i = 0;
  while (i < sprossen.length) {
    let j = i;
    while (j + 1 < sprossen.length && liegend[j + 1] === liegend[i]) j++;
    if (liegend[i]) {
      let yLo = Infinity;
      let yHi = -Infinity;
      for (let k = i; k <= j; k++) {
        yLo = Math.min(yLo, sprossen[k]!.u.y, sprossen[k]!.o.y);
        yHi = Math.max(yHi, sprossen[k]!.u.y, sprossen[k]!.o.y);
      }
      const q = lappenQuerschnitt(dok, yLo, yHi, N);
      for (let k = i; k <= j; k++) out[k] = q;
      // G3: je Ring der eigene Höhenbereich (Fenster ±1 Ring); nur, wenn die Ecken (Längsfalten) dieselben bleiben
      if (opt.querschnittJeRing) {
        const jeRing: Querschnitt[] = [];
        let passt = true;
        for (let k = i; k <= j && passt; k++) {
          let lo = Infinity;
          let hi = -Infinity;
          for (let m = Math.max(i, k - 1); m <= Math.min(j, k + 1); m++) {
            lo = Math.min(lo, sprossen[m]!.u.y, sprossen[m]!.o.y);
            hi = Math.max(hi, sprossen[m]!.u.y, sprossen[m]!.o.y);
          }
          const qk = lappenQuerschnitt(dok, lo, hi, N);
          if (qk.v.length !== q.v.length || qk.knoten.length !== q.knoten.length || qk.knoten.some((x, t) => x !== q.knoten[t])) passt = false;
          jeRing.push(qk);
        }
        if (passt) for (let k = i; k <= j; k++) out[k] = jeRing[k - i]!;
      }
    } else {
      const q = kreisQuerschnitt(N);
      for (let k = i; k <= j; k++) out[k] = q;
    }
    i = j + 1;
  }
  return out;
}

export function sprossenVon(l: Leiter, st: readonly Station[]): Sprosse[] {
  return st.map((s) => ({ o: zugBei(l.ruecken, s.a), u: zugBei(l.bauch, s.b) }));
}

/** V4 „Querschnitt aus der Sichthülle“ (`umrisse: 'exakt'`): Fülle der Zeichnung und Ecken der Front, einmal je Bau. */
type HuellenKontext = { dok: Dokument; breiten: Breiten; zf: ZeichnungsFuelle; ecken: FrontEcke[]; N: number; hoechstens: number; linien: KantenLinie[] };

function huellenKontext(dok: Dokument | null, breiten: Breiten, opt: AbleitOptionen): HuellenKontext | null {
  if (opt.umrisse !== 'exakt' || !dok || !opt.querschnitt) return null;
  // Die eigene Fülle der Zeichnung gilt bis „genau“ (eine kastige Front gibt kastige Ringe); die Look-Wahl „Fülle“ begrenzt
  // nur das zusätzliche Auffüllen, wo sonst kein Ring die Front erreicht (`fuelleWoNoetig`)
  const hoechstens = FUELLE_EXPONENT[opt.fuelle ?? 'mittel'];
  const tb = tabellierteBreiten(dok, breiten);
  // V5: P-Linien (alle Kanten des Dokuments, Index = Kennung − LINIE_ID; ohne Härte ohne Wirkung)
  const linien = (dok.kanten ?? []).map((ka) => kanteAbtasten(ka, dok.skalierung));
  return { dok, breiten: tb, zf: zeichnungsFuelle(dok, tb, FUELLE_EXPONENT.genau), ecken: frontEcken(dok), N: opt.ring, hoechstens, linien };
}

/** Gezeichnete Form an einer Sprosse (Spant, normiert auf größte Breite 1) über v; ohne Spanten keine. */
function huellenForm(hk: HuellenKontext, sp: Sprosse): ((v: number) => number) | undefined {
  if (!hk.dok.spanten?.length) return undefined;
  const q = spantQuerschnitt(hk.dok, (sp.o.x + sp.u.x) / 2, hk.N);
  let m = 0;
  for (const w of q.w) m = Math.max(m, w);
  return (v: number) => {
    // q.v fällt von 1 auf 0
    for (let j = 0; j + 1 < q.v.length; j++) {
      const a = q.v[j]!;
      const b = q.v[j + 1]!;
      if (v <= a + 1e-12 && v >= b - 1e-12) {
        const f = a - b > 1e-12 ? (a - v) / (a - b) : 0;
        return m > 0 ? (q.w[j]! + (q.w[j + 1]! - q.w[j]!) * f) / m : 0;
      }
    }
    return 0;
  };
}

/**
 * Schnitte der Hülle für die ganze Kette (Kappenringe vorn von der Spitze aus, Ringe, Kappenringe hinten), die Breitenlinie
 * (Reihe N/4, in den Kappen die Mittelreihe 2r) glatt über die Kette gewählt (`breitenlinieWaehlen`).
 */
function huellenVorlagen(hk: HuellenKontext, l: Leiter, st: Stationen, v: { N: number; c: number }): { ringe: HuellenSchnitt[]; vorn: HuellenSchnitt[]; hinten: HuellenSchnitt[]; linienReihen: Set<number>; reihenKanten: { ring: number; j: number; linie: number }[]; ringKanten: { ring: number; j: number; haerte: number; linie: number }[]; einordnung: LinienEinordnung[] } {
  const { N, c } = v;
  // Kette von der vorderen Spitze zur hinteren: Kappenringe vorn (r = 1 …), Ringe, Kappenringe hinten (… r = 1)
  const vornSp = sprossenVon(l, st.kappen.vorn).slice(0, c / 2 - 1);
  const ringSp = sprossenVon(l, st.ringe);
  const hintenSp = sprossenVon(l, st.kappen.hinten).slice(0, c / 2 - 1);
  const kette = [...vornSp, ...ringSp, ...hintenSp.slice().reverse()];
  // V5: Längslinien kreuzen die Sprossen der Ringe (nicht der Kappen) und werden Merkmale des Reihenplans; Querlinien haben
  // ihren eigenen Ring (Stationen), schräge behalten die Treppe
  const einordnung = st.einordnung ?? (hk.linien.length ? linienEinordnen(hk.linien, l) : []);
  const laengs = hk.linien.map((ln, i) => (einordnung[i]?.art === 'reihe' ? ln : { ...ln, haerte: ln.haerte.map(() => 0) }));
  const lm = laengs.some((ln) => ln.haerte.some((h) => h > 0)) ? linienMerkmale(laengs, ringSp) : null;
  const huellen = kette.map((sp, i) => huelleEntlang(sp, hk.breiten, hk.ecken, lm && i >= vornSp.length && i < vornSp.length + ringSp.length ? lm[i - vornSp.length]! : []));
  // V5: Sind Ringe in Linien gedreht, bestimmt die natürliche Kette die Form (Höhenfeld); die gedrehten Ringe tasten sie ab
  const natRing = st.ringeNatuerlich ? sprossenVon(l, st.ringeNatuerlich) : null;
  const natKette = natRing ? [...vornSp, ...natRing, ...hintenSp.slice().reverse()] : kette;
  const natHuellen = natRing ? natKette.map((sp) => huelleEntlang(sp, hk.breiten, hk.ecken)) : huellen;
  const formen = natKette.map((sp) => huellenForm(hk, sp));
  const nV = vornSp.length;
  const nR = ringSp.length;
  // V6: Loop-Ringe entscheiden nichts um — Fülle, Breitenlinie und Reihenplan kommen aus der Kette ohne sie, die Loop-Ringe
  // tasten sie ab (Fülle linear nach dem Anteil der Wirbelsäule, Breitenlinie als Wahl zwischen den festen Nachbarn, Anker
  // nach dem Plan der Kette). So ändert ein eingefügter Loop die Vorlagen der übrigen Ringe nicht (vorher bis 6 px: die
  // Fülle sprang auf den neuen Ring und lief nach Ringnummern zu den Nachbarn aus).
  const schleifenNr = new Set((st.schleifen ?? []).map((s) => s.ring));
  const imLoop = (i: number) => i >= nV && i < nV + nR && schleifenNr.has(i - nV);
  const basis = natKette.map((_, i) => i).filter((i) => !imLoop(i));
  const expo = natKette.map((sp) => exponentenFuer(sp, hk.zf));
  let ps: { oben: number; unten: number }[];
  if (!schleifenNr.size) ps = fuelleWoNoetig(natHuellen, expo, hk.breiten, hk.hoechstens, formen.map((f) => !!f));
  else {
    const pb = fuelleWoNoetig(basis.map((i) => natHuellen[i]!), basis.map((i) => expo[i]!), hk.breiten, hk.hoechstens, basis.map((i) => !!formen[i]));
    ps = expo.map((e) => ({ ...e }));
    basis.forEach((i, q) => (ps[i] = pb[q]!));
    const fR = spineAnteile(l, st.ringeNatuerlich ?? st.ringe);
    for (let i = 0; i < natKette.length; i++) {
      if (!imLoop(i) || formen[i]) continue;
      // Loops liegen zwischen dem ersten und dem letzten Ring: die Nachbarn der Kette sind Ringe
      let a = i - 1;
      while (imLoop(a)) a--;
      let b = i + 1;
      while (imLoop(b)) b++;
      const fa = fR[a - nV]!;
      const fb = fR[b - nV]!;
      const t = fb > fa ? Math.min(1, Math.max(0, (fR[i - nV]! - fa) / (fb - fa))) : 0.5;
      ps[i] = { oben: ps[a]!.oben + (ps[b]!.oben - ps[a]!.oben) * t, unten: ps[a]!.unten + (ps[b]!.unten - ps[a]!.unten) * t };
    }
  }
  const feld = natRing ? huellenFeld(basis.map((i) => natKette[i]!), basis.map((i) => huelleRunden(natHuellen[i]!, ps[i]!, formen[i]))) : null;
  const gleich = (a: Sprosse, b: Sprosse) => a.o.x === b.o.x && a.o.y === b.o.y && a.u.x === b.u.x && a.u.y === b.u.y;
  const profile = huellen.map((h, i) => (feld && !gleich(kette[i]!, natKette[i]!) ? profilAusFeld(h, feld) : huelleRunden(h, ps[i]!, formen[i])));
  let vr: number[];
  if (!schleifenNr.size) vr = breitenlinieWaehlen(profile);
  else {
    const vb = breitenlinieWaehlen(basis.map((i) => profile[i]!));
    const fest: (number | undefined)[] = profile.map(() => undefined);
    basis.forEach((i, q) => (fest[i] = vb[q]));
    vr = breitenlinieWaehlen(profile, undefined, fest);
  }
  const ringe = profile.slice(nV, nV + nR);
  const vorn = profile.slice(0, nV);
  const hinten = profile.slice(nV + nR).reverse();
  // Reihenplan der Ringe: Breitenlinie, gezeichnete Ecken und Kanten flacher Enden auf Reihen, die für alle Ringe gleich sind
  const frei = new Set(einordnung.flatMap((e, i) => (e.art === 'reihe' && e.schraeg ? [LINIE_ID + i] : [])));
  const plan = reihenplan(ringe, vr.slice(nV, nV + nR), N / 2, N / 4, frei, schleifenNr);
  // V5: Linien, die in zwei benachbarten Ringen auf derselben Reihe liegen, sind als Reihe gebaut (sonst Treppe)
  const linienReihen = new Set<number>();
  const reihenKanten: { ring: number; j: number; linie: number }[] = [];
  for (let i = 0; i + 1 < plan.length; i++) {
    for (const a of plan[i]!) {
      if (a.id === undefined || a.id < LINIE_ID || !(a.haerte > 0)) continue;
      if (!plan[i + 1]!.some((b) => b.id === a.id && b.reihe === a.reihe)) continue;
      linienReihen.add(a.id - LINIE_ID);
      reihenKanten.push({ ring: i, j: a.reihe, linie: a.id - LINIE_ID });
    }
  }
  // V5: Reihen an Linien verziehen (natürlich = Abtastung ohne Linienanker): Enden der Querlinien auf Reihen, Reihen der
  // Längslinien laufen über drei Ringe zur natürlichen Lage aus, weiche Anker halten Abstand zu den Linien
  const querRinge = (st.linien ?? []).filter((r) => (r.rolle ?? 'quer') === 'quer');
  if (linienReihen.size || querRinge.length) {
    // ohne Linien: eine auf eine Linie eingerastete Breitenlinie liegt dort an ihrer natürlichen Stelle
    const vrRinge = vr.slice(nV, nV + nR);
    const ohneLinien = plan.map((a, i) => a.flatMap((x): Anker[] => (x.id === undefined || x.id < LINIE_ID ? [x] : x.reihe === N / 4 ? [{ v: vrRinge[i]!, reihe: N / 4, haerte: 0 }] : [])));
    const nat = new Map<number, number[]>();
    const natuerlich = (i: number, reihe: number): number => {
      let q = nat.get(i);
      if (!q) {
        q = profilAbtastenAnker(ringe[i]!, N / 2, ohneLinien[i]!, N / 4).q.v;
        nat.set(i, q);
      }
      return q[reihe]!;
    };
    const quer = querRinge.flatMap((r) => {
      const sp = ringSp[r.ring];
      const ln = hk.linien[r.linie];
      const lage = sp && ln ? linieAufSprosse(ln, sp.o, sp.u) : null;
      return lage ? [{ ring: r.ring, id: LINIE_ID + r.linie, ...lage }] : [];
    });
    querLinienEnden(plan, natuerlich, quer, N / 2, N / 4);
    reihenAuslaufen(plan, natuerlich, new Set([...linienReihen].map((li) => LINIE_ID + li)));
    reihenAbstand(plan, N / 2);
  }
  const ringVorlagen = ringe.map((pr, i) => profilAbtastenAnker(pr, N / 2, plan[i]!, N / 4));
  // V5: Querlinien — Kanten längs ihres (gedrehten) Rings, soweit die Linie die Reihen deckt
  const ringKantenListe: { ring: number; j: number; haerte: number; linie: number }[] = [];
  for (const r of st.linien ?? []) {
    if ((r.rolle ?? 'quer') !== 'quer') continue;
    const sp = ringSp[r.ring];
    const ln = hk.linien[r.linie];
    const q = ringVorlagen[r.ring]?.q;
    if (!sp || !ln || !q) continue;
    for (const x of ringKanten(ln, sp.o, sp.u, q.v)) ringKantenListe.push({ ring: r.ring, j: x.j, haerte: x.haerte, linie: r.linie });
  }
  return {
    vorn: vorn.map((pr, i) => profilAbtasten(pr, 4 * (i + 1), 2 * (i + 1), vr[i]!)),
    ringe: ringVorlagen,
    hinten: hinten.map((pr, i) => profilAbtasten(pr, 4 * (i + 1), 2 * (i + 1), vr[nV + nR + hinten.length - 1 - i]!)),
    linienReihen,
    reihenKanten,
    ringKanten: ringKantenListe,
    einordnung,
  };
}

/**
 * Zielpunkte aller Käfigpunkte aus Leiter, Stationen, Silhouettenbreiten und Querschnitt-Form. Ein Ringpunkt liegt bei
 * der Höhe v auf seiner Sprosse und seitlich bei w · Maßstab; Maßstab = größter, der ins Top (bei x) und in die Front
 * (bei jeder Höhe) passt. Liefert auch die Höhe je Käfigpunkt (für Züge).
 */
/** Lage eines Maulschlitzes für die Umparametrisierung: Kappenzeile bL, Längsschleife jL, Winkelring k, Lippenhöhe je Ring und je Quadratring der vorderen Kappe (NaN = ohne). */
export type SchlitzLage = {
  bL: number;
  jL: number;
  k: number;
  vRing: Float64Array;
  vKappe: Float64Array;
  /** Anfang auf der Kontur (Welt, Seitenansicht): Ziel der Bauchnaht der Lippen-Kappenzeile (Plan „Zeichnung ist Form“, Schritt 2) */
  anfang?: V2;
  /**
   * Plattenmaul (Phase 2, M1): Verlauf der Lippe in der Front (Welt-|z| → y, rechte Hälfte, von der Mitte nach außen).
   * Die Lippenzeile der ebenen Kappe bekommt je Spalte diese Höhe, die Zeilen darüber und darunter laufen zum Rand aus;
   * so wird aus der waagerechten Zeile Florians nach außen fallender Maularm (Mercedesstern), topologisch bleibt sie eine Zeile.
   */
  front?: { z: number; y: number }[];
};

export function zieleBerechnen(v: Roehre, l: Leiter, st: Stationen, breiten: Breiten, dok: Dokument | null, opt: AbleitOptionen, schlitz?: SchlitzLage): { ziele: Float64Array; hoehe: Float64Array; rand?: { wachstum: number[]; nachfrage: number; vorlagen: Querschnitt[]; punkte: { i: number; j: number }[]; kante: RandMarke[]; teil: RandMarke[] }; huelle?: Uint8Array; vorlagen?: Querschnitt[]; dichte?: DichteVorlagen } {
  const { R, N, c } = v;
  const ziele = new Float64Array(3 * v.kaefig.n);
  const hoehe = new Float64Array(v.kaefig.n);
  const setze = (p: number, x: number, y: number, z: number, hv: number) => {
    ziele[3 * p] = x;
    ziele[3 * p + 1] = y;
    ziele[3 * p + 2] = z;
    hoehe[p] = hv;
  };
  const ringSprossen = sprossenVon(l, st.ringe);
  // V4 „Querschnitt aus der Sichthülle“ (ohne Maul): Vorlage und Maßstab je Ring aus dem Schnitt der Hülle
  const hk = schlitz ? null : huellenKontext(dok, breiten, opt);
  const hv = hk ? huellenVorlagen(hk, l, st, v) : null;
  const ringSchnitte = hv ? hv.ringe : null;
  const ringQ = ringSchnitte ? ringSchnitte.map((s) => s.q) : querschnitteFuer(ringSprossen, dok, breiten, N, opt);
  let letzteW = 0;
  // Sichthülle der Zeichnungen (Plan „Zeichnung ist Form“, Schritt 1): Maßstab = Top bei x, begrenzt durch die Front auf
  // der Höhe der breitesten Stützstelle(n) (die am wenigsten einengende, bei flachen Seiten). Die übrigen Stützstellen
  // werden einzeln auf die Front ihrer Höhe beschnitten (`punkt`). Vorher engte die Front an jeder Höhe den ganzen Ring
  // ein: ein Kasten unter einer runden Front oder ein Brustring unter dem Hals schrumpfte als Ganzes (Tiger 21 px).
  const fuehrend = opt.fuehrend;
  const masstab = (sp: Sprosse, q: Querschnitt) => (letzteW = ringMasstab(sp, q, breiten, letzteW, fuehrend));
  const punkt = (sp: Sprosse, q: Querschnitt, W: number, j: number): [number, number, number, number] => querschnittPunkt(sp, q, W, j, breiten, fuehrend);
  // Kiefer-Spanten (14.10.): in Maulringen unter der Lippe der Querschnitt des Unterkiefers
  const kiefer = !!(schlitz && dok && opt.querschnitt && dok.spanten?.length && hatKieferSpanten(dok));
  const ringQNeu = ringQ.map((q, i) => {
    if (!(schlitz && i <= schlitz.k && Number.isFinite(schlitz.vRing[i]!))) return q;
    const vL = schlitz.vRing[i]!;
    const sp = ringSprossen[i]!;
    const basis = kiefer ? kieferQuerschnitt(q, spantQuerschnitt(dok!, (sp.o.x + sp.u.x) / 2, N, 'unten'), vL) : q;
    return umparametrisieren(basis, N / 2, { index: schlitz.jL, v: vL });
  });
  const Wr = ringSchnitte ? ringSchnitte.map((s) => s.W) : ringQNeu.map((q, i) => masstab(ringSprossen[i]!, q));
  if (fuehrend === 'front' && !ringSchnitte) {
    // Führende Front wirkt örtlich (Plan „Zeichnung ist Form“ 4.1): Ein Ring, der an einer Höhe die Silhouette stellt
    // (der breiteste aller Ringe dort), wächst auf die Front dieser Höhe; die anderen Ringe bleiben bei der Sichthülle.
    // Vorher galt die Front nur als Hülle (nie breiter), ein Zug nach außen lief ins Leere, und mit der Front als
    // alleiniger Breite bekäme der Schwanz die Kopfbreite seiner Höhe.
    // halbe Breite des Rings i auf der Höhe y, an der Front beschnitten (wie `reichweite` in fuelle.ts, ohne Top)
    const breiteBei = (i: number, y: number): number => {
      const fb = breiten.front(y);
      return reichweite(ringQNeu[i]!, ringSprossen[i]!, Wr[i]!, y, fb > 0 ? fb : Infinity, () => 0);
    };
    const W0 = Wr.slice();
    for (let i = 0; i < R; i++) {
      const sp = ringSprossen[i]!;
      const q = ringQNeu[i]!;
      let wMax = 0;
      for (let j = 1; j + 1 < q.v.length; j++) wMax = Math.max(wMax, q.w[j]!);
      let W = W0[i]!;
      for (let j = 1; j + 1 < q.v.length; j++) {
        const wj = q.w[j]!;
        if (wj < 0.5 * wMax) continue;
        const y = sp.u.y + (sp.o.y - sp.u.y) * q.v[j]!;
        const fb = breiten.front(y);
        if (!(fb > 0)) continue;
        const eigene = Math.min(W0[i]! * wj, fb);
        let sil = 0;
        for (let i2 = 0; i2 < R; i2++) if (i2 !== i) sil = Math.max(sil, breiteBei(i2, y));
        if (eigene >= sil - 1e-6) W = Math.max(W, fb / wj);
      }
      Wr[i] = W;
    }
  }
  // S3 „Umrisse berühren“ (Florian 16.10.: Fülle mittel): Wo der Körper hinter der Front zurückbleibt, schiebt sich der
  // Ring mit der größten Hülle an seinem Punkt örtlich hinaus; Form höchstens die Superellipse der Stufe. Nicht mit
  // Maulschlitz; ohne Option bitgleich.
  const rand = opt.fuelle && !schlitz && !ringSchnitte ? frontBeruehren(ringSprossen, ringQNeu, Wr, breiten, opt.fuelle, dok ? huellenBreite(dok, breiten) : undefined, st.schleifen?.length ? { lage: schleifenLage(l, st) } : {}) : null;
  if (rand) for (let i = 0; i < R; i++) ringQNeu[i] = rand.vorlagen[i] as Querschnitt;
  // V4: je Käfigpunkt, ob seine Vorlage dort die Front (1) bzw. das Top (2) trifft (Bindung im Löser)
  const huelle = hv ? new Uint8Array(v.kaefig.n) : null;
  for (let i = 0; i < R; i++) {
    const sp = ringSprossen[i]!;
    const q = ringQNeu[i]!;
    const W = Wr[i]!;
    for (let j = 0; j <= N / 2; j++) {
      const [x, y, z, hv] = punkt(sp, q, W, j);
      setze(v.ringPunkt(i, j), x, y, j === 0 || j === N / 2 ? 0 : z, hv);
      if (j > 0 && j < N / 2) setze(v.ringPunkt(i, N - j), x, y, -z, hv);
      const s = ringSchnitte?.[i];
      if (huelle && s && j > 0 && j < N / 2) huelle[v.ringPunkt(i, j)] = huelle[v.ringPunkt(i, N - j)] = s.front[j] ? 1 : s.top[j] ? 2 : 0;
    }
  }
  for (const seite of ['vorn', 'hinten'] as const) {
    const stK = st.kappen[seite];
    const spitze = seite === 'vorn' ? l.ruecken[0]! : l.ruecken[l.ruecken.length - 1]!;
    const sprossen = sprossenVon(l, stK);
    // Kappenpunkte: je Quadratring r (um die Spitze) der Querschnitt des angrenzenden Rings, auf 4r Intervalle
    // abgetastet; mit Schlitz liegt der Lippenpunkt der Kappenzeile bL auf seiner Höhe
    const iEnde = seite === 'vorn' ? 0 : R - 1;
    const q0 = rand ? (rand.vorlagen[iEnde] as Querschnitt) : ringQ[iEnde]!;
    setze(v.kappe(seite, c / 2, c / 2), spitze.x, spitze.y, 0, 0.5);
    for (let r = 1; r < c / 2; r++) {
      let lippe: { index: number; v: number } | undefined;
      if (seite === 'vorn' && schlitz && Number.isFinite(schlitz.vKappe[r]!)) {
        let mL = -1;
        for (let m = 0; m <= 4 * r; m++) {
          const [, b] = quadratRing(c, r, m);
          if (b === schlitz.bL) {
            mL = mL < 0 ? m : mL;
            if (mL === 0) mL = m; // Lippe läuft von der Naht oben weg: letzter Lippenpunkt ist der Drehpunkt
          }
        }
        if (mL > 0 && mL < 4 * r) lippe = { index: mL, v: schlitz.vKappe[r]! };
      }
      // Kiefer-Spanten: auch in der Kappe unter der Lippe der Unterkiefer (Querschnitt von Ring 0)
      const q0Teil = kiefer && lippe && seite === 'vorn' ? kieferQuerschnitt(q0, spantQuerschnitt(dok!, (ringSprossen[0]!.o.x + ringSprossen[0]!.u.x) / 2, N, 'unten'), lippe.v) : q0;
      const sp = sprossen[r - 1]!;
      // V4: jeder Kappenring bekommt den Schnitt der Hülle an seiner eigenen Stelle (Kasten flach, rundes Ende rund)
      const hs = hv ? (seite === 'vorn' ? hv.vorn : hv.hinten)[r - 1]! : null;
      const q = hs ? hs.q : umparametrisieren(q0Teil, 4 * r, lippe);
      const W = hs ? hs.W : masstab(sp, q);
      // Konturanfang: Die Bauchnaht der Lippenzeile liegt auf dem gezeichneten Anfang (statt am Fuß der Kappen-Sprosse):
      // so beginnt die Lippe an der Naht genau dort, wo die Linie die Kontur trifft (keine Kerbe)
      const anfang = seite === 'vorn' && schlitz?.anfang && r === c / 2 - schlitz.bL ? schlitz.anfang : undefined;
      for (let m = 0; m <= 4 * r; m++) {
        const [a, b] = quadratRing(c, r, m);
        const naht = m === 0 || m === 4 * r;
        if (anfang && m === 4 * r) {
          const hv = Math.min(1, Math.max(0, (anfang.y - sp.u.y) / (sp.o.y - sp.u.y || 1)));
          setze(v.kappe(seite, a, b), anfang.x, anfang.y, 0, hv);
          continue;
        }
        const [x, y, z, hv] = punkt(sp, q, W, m);
        setze(v.kappe(seite, a, b), x, y, naht ? 0 : z, hv);
        if (!naht) setze(v.kappe(seite, c - a, b), x, y, -z, hv);
        if (huelle && hs && !naht) huelle[v.kappe(seite, a, b)] = huelle[v.kappe(seite, c - a, b)] = hs.front[m] ? 1 : hs.top[m] ? 2 : 0;
      }
    }
    if (seite === 'vorn' && kastenKappe(v, ziele, hoehe, spitze, schlitz, setze) && huelle) {
      for (let a = 0; a <= c; a++) for (let b = 0; b <= c; b++) if (a > 0 && a < c && b > 0 && b < c) huelle[v.kappe('vorn', a, b)] = 0;
    }
  }
  // V4: dichte Kurven der Ringschnitte (rechte Hälfte, Welt) für die dichte Anpassung
  let dichte: DichteVorlagen | undefined;
  if (ringSchnitte) {
    const kurven: Float64Array[] = [];
    const zeilen: Int32Array[] = [];
    ringSchnitte.forEach((sch, i) => {
      const sp = ringSprossen[i]!;
      const d = sch.dicht!;
      const k = new Float64Array(3 * d.v.length);
      for (let m = 0; m < d.v.length; m++) {
        const y = sp.u.y + (sp.o.y - sp.u.y) * d.v[m]!;
        const fb = hk!.breiten.front(y);
        k[3 * m] = sp.u.x + (sp.o.x - sp.u.x) * d.v[m]!;
        k[3 * m + 1] = y;
        // wie `querschnittPunkt`: nie breiter als die Front auf dieser Höhe
        k[3 * m + 2] = fb > 0 ? Math.min(d.z[m]!, fb) : d.z[m]!;
      }
      kurven.push(k);
      zeilen.push(d.zeile);
    });
    dichte = { kurven, zeilen };
  }
  return rand ? { ziele, hoehe, rand: { wachstum: rand.wachstum, nachfrage: rand.nachfrage.length, vorlagen: ringQNeu.slice(), punkte: rand.punkte, kante: rand.kante, teil: rand.teil } } : { ziele, hoehe, ...(huelle ? { huelle, vorlagen: ringQNeu.slice() } : {}), ...(dichte ? { dichte } : {}) };
}

/**
 * Kastenfront (Tiger, Bild 9): Liegt Ring 0 praktisch in der Frontebene (Vorschub gegenüber der Spitze < 6 % seiner Höhe),
 * fächern die Sprossen dort und die Kappe wäre ein winziges Feld an der Spitze; Lippe, Nase und Tasche hätten keinen Platz.
 * Dann wird die Kappe ein ebenes Gitter in Ring 0: Quadratring r ist Ring 0, um r/(c/2) zum Frontpunkt C hin verkleinert.
 * C liegt auf der Frontlinie in der Höhe der Lippe von Ring 0 (mit Schlitz; die Lippe geht dann als Mittelzeile durch die
 * Spitze, `unterSpitze` 0) oder in der Ringmitte. Spitzige Schnauzen (Rex, Kugel) bleiben unberührt.
 */
function kastenKappe(v: Roehre, ziele: Float64Array, hoehe: Float64Array, spitze: V2, schlitz: SchlitzLage | undefined, setze: (p: number, x: number, y: number, z: number, hv: number) => void): boolean {
  const { N, c } = v;
  let cx = 0;
  let yMin = Infinity;
  let yMax = -Infinity;
  for (let j = 0; j < N; j++) {
    const q = v.ringPunkt(0, j);
    cx += ziele[3 * q]! / N;
    yMin = Math.min(yMin, ziele[3 * q + 1]!);
    yMax = Math.max(yMax, ziele[3 * q + 1]!);
  }
  const H0 = yMax - yMin;
  if (!(Math.abs(cx - spitze.x) < 0.06 * H0)) return false;
  const jLippe = schlitz && Number.isFinite(schlitz.vRing[0]!) ? schlitz.jL : -1;
  const cPunkt = jLippe >= 0 ? v.ringPunkt(0, jLippe) : -1;
  const Cy = cPunkt >= 0 ? ziele[3 * cPunkt + 1]! : (yMin + yMax) / 2;
  const Chv = cPunkt >= 0 ? hoehe[cPunkt]! : 0.5;
  // Ring 0 an gebrochener Stelle jf (rechte Hälfte 0 … N/2), linear zwischen den Ringpunkten
  const rand = (jf: number): [number, number, number, number] => {
    const j0 = Math.min(N / 2 - 1, Math.floor(jf));
    const f = jf - j0;
    const p0 = v.ringPunkt(0, j0);
    const p1 = v.ringPunkt(0, j0 + 1);
    const mixv = (a: number, b: number) => a + (b - a) * f;
    return [mixv(ziele[3 * p0]!, ziele[3 * p1]!), mixv(ziele[3 * p0 + 1]!, ziele[3 * p1 + 1]!), mixv(ziele[3 * p0 + 2]!, ziele[3 * p1 + 2]!), mixv(hoehe[p0]!, hoehe[p1]!)];
  };
  setze(v.kappe('vorn', c / 2, c / 2), spitze.x, Cy, 0, Chv);
  for (let r = 1; r < c / 2; r++) {
    const s = r / (c / 2);
    for (let m = 0; m <= 4 * r; m++) {
      const [a, b] = quadratRing(c, r, m);
      const [x, y, z, hv] = rand((m * c) / (2 * r));
      const px = spitze.x + s * (x - spitze.x);
      const py = Cy + s * (y - Cy);
      const pz = s * z;
      const phv = Chv + s * (hv - Chv);
      const naht = m === 0 || m === 4 * r;
      setze(v.kappe('vorn', a, b), px, py, naht ? 0 : pz, phv);
      if (!naht) setze(v.kappe('vorn', c - a, b), px, py, -pz, phv);
    }
  }
  // Plattenmaul: Lippenzeile (b = c/2) auf den gezeichneten Front-Verlauf heben/senken, Zeilen darüber und darunter
  // laufen linear zum Plattenrand aus (Rand bleibt Ring 0)
  const front = schlitz?.front;
  if (front && front.length >= 2) {
    const yBei = (z: number): number => {
      if (z <= front[0]!.z) return front[0]!.y;
      for (let i = 0; i + 1 < front.length; i++) {
        const a = front[i]!;
        const b = front[i + 1]!;
        if (z >= a.z && z <= b.z) return b.z > a.z ? a.y + ((b.y - a.y) * (z - a.z)) / (b.z - a.z) : b.y;
      }
      return front[front.length - 1]!.y;
    };
    const y0 = yBei(0);
    for (let a = 1; a < c; a++) {
      for (let b = 1; b < c; b++) {
        const w = 1 - Math.abs(b - c / 2) / (c / 2);
        if (w <= 0) continue;
        const q = v.kappe('vorn', a, b);
        const dy = (yBei(Math.abs(ziele[3 * q + 2]!)) - y0) * w;
        ziele[3 * q + 1] = ziele[3 * q + 1]! + dy;
      }
    }
  }
  return true;
}

/** V4: Gewicht der Käfigziele, deren Vorlage Front oder Top trifft (wie die Breitenpunkte heute) */
const HUELLE_GEWICHT = 16;

/**
 * V4 „Vorlage dicht anpassen“: je Ring die Kurve seines Schnitts (rechte Hälfte, 3D: x, y, z ≥ 0; dichte Proben von oben nach
 * unten) und je Käfigreihe ihr Index darin. Die feinen Punkte längs eines Rings werden auf diese Kurve projiziert (Punkt zu
 * Kurve, längs frei) — die Fläche folgt dem Schnitt zwischen den Käfigpunkten, statt sich dort hinauszuwölben.
 */
export type DichteVorlagen = { kurven: Float64Array[]; zeilen: Int32Array[] };
/** feine Punkte längs der Ringe: Index, Ring, Seite (1 rechts, −1 links), Suchfenster in der Kurve (Probe von … bis) */
export type DichtFein = { fein: Uint32Array; ring: Uint16Array; seite: Int8Array; von: Int32Array; bis: Int32Array };
/** V4: Gewicht je feinem Punkt der dichten Anpassung (sieben je Käfigkante; zusammen etwa so stark wie die Käfigziele) */
const DICHT_GEWICHT = 1 / 7;
/** V4 (Versuch): weiche Grenze erst ab so viel über Front oder Top (0,25 px) */
const GRENZE_UEBER = 0.25 / 461;

/** Ziele der dichten Anpassung: je Zeile der Fußpunkt der aktuellen Lage auf der Kurve ihres Rings (Spiegel links). */
export function dichtZiele(df: DichtFein, dv: DichteVorlagen, lagen: Float64Array): Float64Array {
  const out = new Float64Array(3 * df.fein.length);
  for (let q = 0; q < df.fein.length; q++) {
    const p = df.fein[q]!;
    const s = df.seite[q]!;
    const px = lagen[3 * p]!;
    const py = lagen[3 * p + 1]!;
    const pz = s * lagen[3 * p + 2]!;
    const k = dv.kurven[df.ring[q]!]!;
    let best = Infinity;
    let bx = px;
    let by = py;
    let bz = pz;
    for (let i = df.von[q]!; i < df.bis[q]!; i++) {
      const ax = k[3 * i]!;
      const ay = k[3 * i + 1]!;
      const az = k[3 * i + 2]!;
      const dx = k[3 * i + 3]! - ax;
      const dy = k[3 * i + 4]! - ay;
      const dz = k[3 * i + 5]! - az;
      const l2 = dx * dx + dy * dy + dz * dz;
      const t = l2 > 0 ? Math.min(1, Math.max(0, ((px - ax) * dx + (py - ay) * dy + (pz - az) * dz) / l2)) : 0;
      const qx = ax + t * dx;
      const qy = ay + t * dy;
      const qz = az + t * dz;
      const d = (px - qx) ** 2 + (py - qy) ** 2 + (pz - qz) ** 2;
      if (d < best) {
        best = d;
        bx = qx;
        by = qy;
        bz = qz;
      }
    }
    out[3 * q] = bx;
    out[3 * q + 1] = by;
    out[3 * q + 2] = s * bz;
  }
  return out;
}

/** Ziele je Bedingung: erst alle Käfigziele, dann die Nahtpunkte auf dem Umriss (z = 0). */
/**
 * Breitenpunkte im Ausgleich: je Zeile der feine Punkt (Käfigpunkt = gleicher Index, oder feiner Kettenpunkt), das
 * Vorzeichen seiner z-Seite und sein Anteil an der Soll-Halbbreite (w / wMax der Vorlage; 1 = breitester Punkt).
 */
export type Breite = {
  fein: Uint32Array;
  vorzeichen: Int8Array;
  faktor: Float64Array;
  /** je Breitenpunkt: sein Ring stellt an seiner Höhe die Silhouette (führende Front darf ihn bis zur Front wachsen lassen) */
  fuehrt?: Uint8Array;
  /** S3: Anteil am Breitengewicht je Punkt (Berührpunkte schwächer, sonst 1) */
  gewicht?: Float64Array;
};

/** Stützstellen bis so weit unter der größten Breite der Vorlage zählen als Breitenpunkte (geneigte Ringe: Kastenwand) */
const BREITE_SCHWELLE = 0.05;

/** Über der Schwelle läuft das Gewicht eines Breitenpunkts über so viel (Anteil der größten Breite) glatt von 0 auf 1 an. */
const BREITE_ANLAUF = 0.01;

/**
 * Gewicht eines Breitenpunkts nach seinem Anteil f an der größten Breite: 0 bis 1 − Schwelle, darüber über `BREITE_ANLAUF`
 * glatt auf 1 (Smoothstep). Vorher sprang es an der Schwelle von 0 auf 1: Ein Punkt, der durch einen formneutral
 * eingefügten Knoten von 0,9499 auf 0,9503 rückte, wurde voller Breitenpunkt und verschob die Vase um 3,4 px (Plan 20.10.,
 * V6). Unter der Schwelle darf es nicht anlaufen: Das Soll (f mal Hülle auf der eigenen Höhe) zählt dort die Höhe doppelt
 * (mit einem Auslauf von 0,94 bis 0,95 wurde das Ei vorn 4,9 statt 0,4 px).
 */
function breitenRampe(f: number): number {
  const r = Math.min(1, Math.max(0, (f - (1 - BREITE_SCHWELLE)) / BREITE_ANLAUF));
  return r * r * (3 - 2 * r);
}
/** S3: Anteil des Breitengewichts für Berührpunkte (voll gab Falten, wo die Haut zwischen Berührpunkten umbiegen muss) */
const RAND_GEWICHT = 0.25;

/**
 * Soll-Halbbreite eines Breitenpunkts bei (x, y): die größte, die ins Top (bei x) und in die Front (bei y) passt
 * (Sichthülle der Zeichnungen). Außerhalb beider Silhouetten gilt der Rückfall (Käfigziel).
 */
export function breiteSoll(breiten: Breiten, x: number, y: number, rueckfall: number, fuehrend?: 'seite' | 'front' | 'top', fuehrt = false): number {
  const t = breiten.top(x);
  const f = breiten.front(y);
  if (fuehrend === 'top') return t > 0 ? t : Math.abs(rueckfall);
  // führende Front: nur Ringe, die an ihrer Höhe die Silhouette stellen, dürfen bis zur Front (`fuehrt`, Flag je
  // Breitenpunkt); alle anderen bleiben in der Sichthülle — die Front als Soll für jeden Ring machte den Körper zum
  // Kasten (Kugel-Ringe vorn 0,13 → 0,52)
  if (fuehrend === 'front' && fuehrt) return f > 0 ? f : Math.abs(rueckfall);
  // außerhalb einer der beiden Silhouetten (Spitzen, 1 px vor dem Top) bleibt die aktuelle Lage: dort sagt die Zeichnung nichts
  return t > 0 && f > 0 ? Math.min(t, f) : Math.abs(rueckfall);
}

export function ausgleichsZiele(n: number, ziele: Float64Array, umriss: { pts: V2[]; anteil: Float64Array }, nahtFein: Uint32Array, anteil: Float64Array, breite?: Breite | null, breiten?: Breiten, lagen?: Float64Array, fuehrend?: 'seite' | 'front' | 'top'): Float64Array {
  const nB = breite && breiten && lagen ? breite.fein.length : 0;
  const out = new Float64Array(3 * (n + nahtFein.length + nB));
  out.set(ziele.subarray(0, 3 * n));
  for (let k = 0; k < nahtFein.length; k++) {
    const p = umrissBei(umriss, anteil[k]!);
    out[3 * (n + k)] = p.x;
    out[3 * (n + k) + 1] = p.y;
    out[3 * (n + k) + 2] = 0;
  }
  // Breitenpunkte: x und y wie die aktuelle Grenzlage (`lagen`, sonst das Käfigziel), z = Soll-Halbbreite dort (rechts +,
  // links −). Mit den Grenzlagen gerechnet, trifft die Silhouette auch bei geneigten Ringen (Kastenwand des Tigers).
  if (breite && breiten && lagen) {
    for (let k = 0; k < nB; k++) {
      const p = breite.fein[k]!;
      const x = lagen[3 * p]!;
      const y = lagen[3 * p + 1]!;
      const o = 3 * (n + nahtFein.length + k);
      out[o] = x;
      out[o + 1] = y;
      const f = breite.faktor[k]!;
      out[o + 2] = breite.vorzeichen[k]! * f * breiteSoll(breiten, x, y, lagen[3 * p + 2]! / (f || 1), fuehrend, !!breite.fuehrt?.[k]);
    }
  }
  return out;
}

/**
 * Breitenpunkte (Plan „Zeichnung ist Form“, Schritt 1): je Ring alle breitesten Punkte der Querschnittsvorlage (bei
 * Kästen die ganze flache Seite), rechts und gespiegelt; ihre Grenzlage soll die Soll-Halbbreite bei ihrem (x, y)
 * treffen (`breiteSoll`). Punkte außerhalb von Top und Front fallen weg.
 */
export function breitenSchleife(v: Roehre, l: Leiter, st: Stationen, breiten: Breiten, dok: Dokument, opt: AbleitOptionen, ziele: Float64Array, u: Unterteilung, k: Kaefig, haut?: Uint8Array, maulBau = false, randVorlagen?: readonly Querschnitt[], randPunkte?: readonly { i: number; j: number }[]): Breite | null {
  if (!(opt.breiteGewicht > 0)) return null;
  const { R, N } = v;
  const roh = querschnitteFuer(sprossenVon(l, st.ringe), dok, breiten, N, opt);
  // S3: mit „Umrisse berühren“ die gewachsenen Querschnitte; die Berührpunkte (je Wunsch einer) werden Breitenpunkte mit dem
  // eigenen Ziel als Anteil der Sichthülle (die glatte Haut traf die erhöhten Ziele allein nur zu etwa zwei Dritteln)
  const qs = randVorlagen ?? roh;
  const beruehrt = new Set((randPunkte ?? []).map((p) => p.i * N + p.j));
  const linienPunkte = new Set((st.linienKanten ?? []).flatMap((lk) => [lk.a, lk.b]));
  const fein: number[] = [];
  const vorzeichen: number[] = [];
  const faktor: number[] = [];
  const gewicht: number[] = [];
  // Anteil je Ring und Schleife (0 = kein Breitenpunkt)
  const breit: Float64Array[] = [];
  for (let i = 0; i < R; i++) {
    const q = qs[i]!;
    let wBest = 0;
    for (let j = 1; j < N / 2; j++) wBest = Math.max(wBest, q.w[j] ?? 0);
    const zeile = new Float64Array(N);
    breit.push(zeile);
    if (!(wBest > 0)) continue;
    // Ringe mit Punkten, die keine Haut sind (Lippe, Tasche, Rachen; Beinfelder): ohne Maul folgen sie ganz ihrem Teil.
    // Im Maulbau (Phase 2 M3, 15.10. nachts) bekommen Maulringe Breitenpunkte auf ihren Hautzeilen, Breite aus den
    // Zielen — die Lippe verschiebt die Zeilen gegen `q` (Schleife eingerastet); ohne sie war der Körper im Top am Maul
    // bis 6 px schmaler. Kastenringe (Ecken im Querschnitt) bleiben im Maulbau ohne Breitenpunkte: die Kante gibt die
    // Breite hart vor, und in der Kieferpose liefen Kastenwand und Tasche gegeneinander (Tiger-Stern 12 Paare bei 75 %).
    let maulRing = false;
    if (haut) for (let j = 0; j < N && !maulRing; j++) if (!haut[v.ringPunkt(i, j)]) maulRing = true;
    if (maulRing && !maulBau) continue;
    if (maulBau && q.haerte.some((h) => h > 0)) continue;
    let zBest = 0;
    if (maulRing) for (let j = 1; j < N / 2; j++) if (haut![v.ringPunkt(i, j)]) zBest = Math.max(zBest, Math.abs(ziele[3 * v.ringPunkt(i, j) + 2]!));
    for (let j = 1; j < N / 2; j++) {
      if (maulRing && !haut![v.ringPunkt(i, j)]) continue;
      // ein Kiefer, der über die Top-Linie hinausragt, folgt seiner Linie (die schwarze Linie macht dort den Umweg):
      // kein Breitenpunkt (Kugel mit vorgezogenem Unterkiefer: Knick 20° → 56°)
      if (maulRing) {
        const pz = v.ringPunkt(i, j);
        const wTop = breiten.top(ziele[3 * pz]!);
        if (wTop > 0 && Math.abs(ziele[3 * pz + 2]!) > 1.02 * wTop) continue;
      }
      let f = maulRing ? (zBest > 0 ? Math.abs(ziele[3 * v.ringPunkt(i, j) + 2]!) / zBest : 0) : (q.w[j] ?? 0) / wBest;
      // V5: Punkte einer Linienfalte sind keine Breitenpunkte — ihr Soll (Anteil der größten Breite mal Hülle auf ihrer Höhe)
      // zählte die Höhe doppelt und zog die Falte, die eine Linie nahe an die breiteste Stelle rückt, 2 px nach innen (Kugel);
      // die Falte liegt auf ihrer Vorlage und hängt an der Linie
      if (linienPunkte.has(v.ringPunkt(i, j))) continue;
      const beruehrPunkt = !maulRing && beruehrt.has(i * N + j);
      if (beruehrPunkt) {
        const pz = v.ringPunkt(i, j);
        const B = breiteSoll(breiten, ziele[3 * pz]!, ziele[3 * pz + 1]!, ziele[3 * pz + 2]!);
        f = B > 1e-9 ? Math.min(1, Math.abs(ziele[3 * pz + 2]!) / B) : 0;
      }
      // Gewicht stetig über die Schwelle (vorher hart bei 95 %: ein Punkt, der durch einen formneutral eingefügten Knoten von
      // 0,9499 auf 0,9503 rückte, wurde Breitenpunkt und verschob die Vase um 3,4 px; Plan 20.10., V6)
      const rampe = breitenRampe(f);
      if (!(rampe > 0) && !(beruehrPunkt && f > 0)) continue;
      const p = v.ringPunkt(i, j);
      if (!(breiten.top(ziele[3 * p]!) > 0) || !(breiten.front(ziele[3 * p + 1]!) > 0)) continue;
      zeile[j] = beruehrPunkt ? 0 : f;
      fein.push(p, v.ringPunkt(i, N - j));
      vorzeichen.push(1, -1);
      faktor.push(f, f);
      const g = beruehrPunkt ? (opt.randGewicht ?? RAND_GEWICHT) : rampe;
      gewicht.push(g, g);
    }
  }
  // feine Punkte entlang der Längskanten zwischen zwei Breitenpunkten gleicher Schleife (wie die feinen Nahtpunkte):
  // halten die Fläche zwischen den Ringen auf der Silhouette (Tiger-Kasten wölbte sich zwischen Ring 7 und 8 um 24 px)
  for (let i = 0; i + 1 < R; i++) {
    for (let j = 1; j < N / 2; j++) {
      const f0 = breit[i]![j]!;
      const f1 = breit[i + 1]![j]!;
      if (!(f0 > 0) || !(f1 > 0)) continue;
      const g = Math.min(breitenRampe(f0), breitenRampe(f1));
      if (!(g > 0)) continue;
      const rechts = feinKette(u, k, v.ringPunkt(i, j), v.ringPunkt(i + 1, j));
      const links = feinKette(u, k, v.ringPunkt(i, N - j), v.ringPunkt(i + 1, N - j));
      for (let q = 1; q + 1 < rechts.length; q++) {
        fein.push(rechts[q]!);
        vorzeichen.push(1);
        faktor.push(f0 + ((f1 - f0) * q) / (rechts.length - 1));
        gewicht.push(g);
      }
      for (let q = 1; q + 1 < links.length; q++) {
        fein.push(links[q]!);
        vorzeichen.push(-1);
        faktor.push(f0 + ((f1 - f0) * q) / (links.length - 1));
        gewicht.push(g);
      }
    }
  }
  return fein.length ? { fein: Uint32Array.from(fein), vorzeichen: Int8Array.from(vorzeichen), faktor: Float64Array.from(faktor), ...(gewicht.some((g) => g !== 1) ? { gewicht: Float64Array.from(gewicht) } : {}) } : null;
}

/** Falten des Käfigs aus Ecken: Ringfalten (Seitenumriss), Spitzen, Längsfalten (Ecken im Querschnitt). */
export function faltenSetzen(v: Roehre, st: Stationen, l: Leiter, dok: Dokument, breiten: Breiten, opt: AbleitOptionen): void {
  const { R, N, c } = v;
  const k = v.kaefig;
  for (const e of st.ecken) {
    for (let j = 0; j < N; j++) {
      const th = theta(j + 0.5, N);
      const w = e.seite === 'beide' ? 1 : e.seite === 'oben' ? Math.max(0, Math.cos(th)) : Math.max(0, -Math.cos(th));
      const kante = kanteZwischen(k, v.ringPunkt(e.ring, j), v.ringPunkt(e.ring, j + 1));
      if (kante >= 0 && w > 0) k.eSchaerfe[kante] = opt.eckenSchaerfe * w * w;
    }
  }
  if (st.spitzen.vorn) k.vSchaerfe[v.naht.spitzeVorn] = opt.eckenSchaerfe;
  if (st.spitzen.hinten) k.vSchaerfe[v.naht.spitzeHinten] = opt.eckenSchaerfe;
  if (opt.spitzenFalte) {
    for (const [seite, an] of [['vorn', st.spitzen.vorn], ['hinten', st.spitzen.hinten]] as const) {
      if (!an) continue;
      const zug = seite === 'vorn' ? v.naht.ruecken.slice(0, c / 2 + 1) : v.naht.ruecken.slice(-(c / 2 + 1));
      const zugB = seite === 'vorn' ? v.naht.bauch.slice(0, c / 2 + 1) : v.naht.bauch.slice(-(c / 2 + 1));
      for (const z of [zug, zugB]) for (let i = 0; i + 1 < z.length; i++) {
        const e = kanteZwischen(k, z[i]!, z[i + 1]!);
        if (e >= 0) k.eSchaerfe[e] = opt.eckenSchaerfe;
      }
    }
  }
  const sprossen = sprossenVon(l, st.ringe);
  // V4: mit „Querschnitt aus der Sichthülle“ dieselben Vorlagen wie die Ziele (Ecken auf denselben Reihen)
  const hk = huellenKontext(dok, breiten, opt);
  const hv = hk ? huellenVorlagen(hk, l, st, v) : null;
  const qs = hv ? hv.ringe.map((s) => s.q) : querschnitteFuer(sprossen, dok, breiten, N, opt);
  // Freie Kantenlinien (M3 Punkt 2): gezeichnete Linie mit Härte je Knoten → Falte auf der nächsten Kantenschleife. V5: Linien,
  // die der Reihenplan als Käfigreihe führt, bekommen ihre Falte dort (Längsfalten unten), die übrigen die Treppe.
  const schleife = new Set<number>([...(hv?.linienReihen ?? []), ...(hv?.ringKanten ?? []).map((x) => x.linie)]);
  if (hv) {
    st.linienBau = (dok.kanten ?? []).map((_, i) => ({ art: hv.einordnung[i]?.art ?? 'schraeg', schleife: schleife.has(i) }));
    st.linienKanten = [...hv.reihenKanten.map((x) => ({ linie: x.linie, a: v.ringPunkt(x.ring, x.j), b: v.ringPunkt(x.ring + 1, x.j) })), ...hv.ringKanten.map((x) => ({ linie: x.linie, a: v.ringPunkt(x.ring, x.j), b: v.ringPunkt(x.ring, x.j + 1) }))];
    // V5 (Versuch `linieEndSchaerfe`): Endpunkte jeder Linienfalte (nur einer Kante der Linie) mit Punktschärfe
    const es = opt.umrisseOpt?.linieEndSchaerfe ?? 0;
    if (es > 0) {
      const grad = new Map<string, number>();
      for (const lk of st.linienKanten) for (const p of [lk.a, lk.b]) grad.set(`${lk.linie}:${p}`, (grad.get(`${lk.linie}:${p}`) ?? 0) + 1);
      for (const [sch, g] of grad) {
        if (g !== 1) continue;
        const p = Number(sch.split(':')[1]);
        for (const q of [p, spiegelRingPunkt(v, p)]) k.vSchaerfe[q] = Math.max(k.vSchaerfe[q]!, es);
      }
    }
  }
  const treppe = (dok.kanten ?? []).filter((_, i) => !schleife.has(i));
  // V5: Querlinien als Falte längs ihres Rings (rechts und gespiegelt); eine Kreuzung mit einer Längslinie ist eine Ecke
  // (vier scharfe Kanten) — gemessen gleich gut wie eine Linie, die dort aussetzt oder halbscharf ist (Kugel 2,0–2,2 px)
  for (const x of hv?.ringKanten ?? []) {
    const schaerfe = x.haerte >= 1 ? opt.eckenSchaerfe : 3 * x.haerte;
    for (const [ja, jb] of [
      [x.j, x.j + 1],
      [(N - x.j) % N, N - x.j - 1],
    ] as const) {
      const e = kanteZwischen(k, v.ringPunkt(x.ring, ja), v.ringPunkt(x.ring, jb));
      if (e >= 0) k.eSchaerfe[e] = Math.max(k.eSchaerfe[e]!, schaerfe);
    }
  }
  if (treppe.length && opt.eckenSchaerfe > 0) {
    const vorher = hv ? Float64Array.from(k.eSchaerfe) : null;
    kantenFalten(
      v,
      sprossen,
      qs,
      breiten,
      treppe.map((ka) => kanteAbtasten(ka, dok.skalierung)),
      opt.eckenSchaerfe,
    );
    // V5: Käfigpunkte der Treppe — auch sie binden sich an die Form ohne Linien („Form zuerst“)
    if (vorher) {
      const punkte = new Set<number>();
      for (let e = 0; e < k.nE; e++) if (k.eSchaerfe[e]! > vorher[e]!) punkte.add(k.eA[e]!).add(k.eB[e]!);
      st.treppenPunkte = [...punkte];
    }
  }
  // Längsfalten: Ecke im Querschnitt (Front-Lappen oder Spant, Härte je Knoten) → Kante Ring i → i+1 am Ringpunkt der Ecke.
  // Mit dem Querschnitt aus der Sichthülle hat jeder Ring seine eigene Vorlage: die Falte nur, wo beide Ringe die Ecke auf
  // derselben Reihe tragen (eine Ecke in einem einzelnen Ring gab ein loses Kantenstück, Keil 31°)
  if (!opt.querschnitt) return;
  for (let i = 0; i + 1 < R; i++) {
    const q = qs[i]!;
    const naechste = hk ? qs[i + 1]! : null;
    q.haerte.forEach((h, kn) => {
      if (h <= 0) return;
      const j = q.knoten[kn];
      if (j === undefined || j <= 0 || j >= N / 2) return;
      if (naechste) {
        const kn2 = naechste.knoten.indexOf(j);
        if (kn2 < 0 || !((naechste.haerte[kn2] ?? 0) > 0)) return;
        h = Math.min(h, naechste.haerte[kn2]!);
      }
      const schaerfe = h >= 1 ? opt.eckenSchaerfe : 3 * h;
      for (const jj of [j, N - j]) {
        const e = kanteZwischen(k, v.ringPunkt(i, jj), v.ringPunkt(i + 1, jj));
        if (e >= 0) k.eSchaerfe[e] = Math.max(k.eSchaerfe[e]!, schaerfe);
      }
    });
  }
}

/** Frische Ringwahl mit Rückfall (Plan 20.10., V0): ab dieser Falte der freien Haut (°) wird gestuft neu gewählt. */
const RUECKFALL_FALTE = 60;
/**
 * Maßstab eines Rings (Sichthülle: Top bei x, begrenzt durch die Front an der breitesten Stelle des Querschnitts; rund, wo
 * keine Zeichnung etwas sagt). Rund (14.10.): Liegt der Ring außerhalb des Tops (Seite länger als das Top) oder sein
 * breitester Punkt außerhalb der Front, wird er höchstens so breit wie seine halbe Sprosse — vorher bekam er die größte
 * Top-Breite, ein über Top oder Front hinausgezogener Schwanz wurde ein Kasten (Δ bis 135 px). Führendes Top: die Front
 * engt nicht ein (als alleinige Breite bekäme jeder Ring die Frontbreite seiner Höhe, Kugel-Ringe vorn 0,15 → 0,33). Röhre
 * und Baum (`baumBau.ts`) teilen sie seit Plan 20.10., V1 (vorher eine wörtliche Kopie).
 */
export function ringMasstab(sp: Sprosse, q: Querschnitt, breiten: Breiten, letzteW: number, fuehrend?: 'seite' | 'front' | 'top'): number {
  const rund = 0.5 * Math.hypot(sp.o.x - sp.u.x, sp.o.y - sp.u.y);
  let W = breiten.top((sp.o.x + sp.u.x) / 2);
  if (!(W > 0)) W = Math.min(rund, breiten.topMax);
  let wMax = 0;
  for (let j = 1; j + 1 < q.v.length; j++) wMax = Math.max(wMax, q.w[j]!);
  let fBest = 0;
  for (let j = 1; j + 1 < q.v.length; j++) {
    const wj = q.w[j]!;
    if (wj < wMax - 1e-6) continue;
    const y = sp.u.y + (sp.o.y - sp.u.y) * q.v[j]!;
    const fb = breiten.front(y);
    if (fb > 0) fBest = Math.max(fBest, fb / wj);
  }
  if (fuehrend !== 'top' && fBest > 0) W = Math.min(W, fBest);
  else if (fuehrend !== 'top' && !(fBest > 0)) W = Math.min(W, rund);
  if (!(W > 1e-6)) W = letzteW || 0.01 * breiten.topMax;
  return W;
}

/** Punkt j eines Rings (x, y auf der Sprosse, z = w · W, nie breiter als die Front auf seiner Höhe — außer bei führendem Top) und seine Höhe v. */
export function querschnittPunkt(sp: Sprosse, q: Querschnitt, W: number, j: number, breiten: Breiten, fuehrend?: 'seite' | 'front' | 'top'): [number, number, number, number] {
  const hv = q.v[j]!;
  const x = sp.u.x + (sp.o.x - sp.u.x) * hv;
  const y = sp.u.y + (sp.o.y - sp.u.y) * hv;
  let z = q.w[j]! * W;
  if (fuehrend !== 'top') {
    const fb = breiten.front(y);
    if (fb > 0 && z > fb) z = fb; // Hülle: nie breiter als die Front auf dieser Höhe
  }
  return [x, y, z, hv];
}

/** Stufung des Rückfalls (`ringStufung`): von Ring zu Ring höchstens etwa dreimal so weit. */
const RUECKFALL_STUFUNG = 2;

export function ableiten(dok: Dokument, optionen: Partial<AbleitOptionen> = {}): Ableitung {
  const a = ableitenEinmal(dok, optionen);
  // Rückfall nur bei frischer Ringwahl (eingefrorene Stationen werden nachgeführt, die Verteilung steht) und nur, wenn die
  // freie Haut umklappt: Die Ringe verdichten sich nach der Krümmung der Seite (an Halbkreis-Enden 41-mal so dicht wie im
  // geraden Teil), Catmull–Clark ist gleichförmig, und der Löser schob am Übergang Ringe übereinander (Stadionform 138–180°).
  // Gestuft gewählt (Abstand wächst höchstens um das Doppelte des Wegs) und nur genommen, wenn das die Haut wirklich
  // repariert (unter die Schwelle); alle übrigen Körper bauen bitgleich (auch die, die der Rückfall nicht rettet).
  if (optionen.stationen || optionen.ringStufung !== undefined) return a;
  if (faltenNachZonenRoehre(a).zonen.frei.max <= RUECKFALL_FALTE) return a;
  const b = ableitenEinmal(dok, { ...optionen, ringStufung: RUECKFALL_STUFUNG });
  return faltenNachZonenRoehre(b).zonen.frei.max <= RUECKFALL_FALTE ? b : a;
}

function ableitenEinmal(dok: Dokument, optionen: Partial<AbleitOptionen>): Ableitung {
  const opt = { ...ABLEIT_STANDARD, ...optionen };
  const t0 = jetzt();
  const l = kernLeiter(dok);
  const t1 = jetzt();
  const breiten = silhouettenBreite(dok);
  const t2 = jetzt();
  // V6: je Loop ein Ring mehr (nur mit dem Querschnitt aus der Hülle) — die Stationen zählen sie
  const st = stationenWaehlen(l, opt, dok);
  const vorlage = roehre(st.ringe.length, opt.ring);
  faltenSetzen(vorlage, st, l, dok, breiten, opt);
  const { ziele, hoehe, rand, huelle, vorlagen, dichte } = zieleBerechnen(vorlage, l, st, breiten, dok, opt);
  // V5 „Form zuerst“: Mit Linien bindet sich der Körper an die Form des Körpers ohne Linien — die Linie legt fest, wo die
  // Käfigschleife liegt, nicht die Form (ein Winkel nur, wo die Form ihn verlangt)
  const formGewicht = opt.umrisse === 'exakt' ? (opt.umrisseOpt?.form ?? FORM_GEWICHT) : 0;
  const form = formGewicht > 0 && (dok.kanten ?? []).some((ka) => ka.haerte.some((h) => h > 0)) ? ableitenEinmal({ ...dok, kanten: [] }, optionen) : null;
  // V4: Breitenpunkte aus den Querschnitten der Hülle (ihre breitesten Stellen)
  const randV = rand ? { randVorlagen: rand.vorlagen, randPunkte: rand.punkte } : vorlagen ? { randVorlagen: vorlagen } : {};
  const abl = fertigstellen({ opt, vorlage, kaefig: vorlage.kaefig, ziele, hoehe, l, st, breiten, dok, zeiten: { t0, t1, t2 }, ...randV, ...(huelle ? { huelle } : {}), ...(dichte ? { dichte } : {}), ...(form ? { form } : {}) });
  return rand ? { ...abl, rand: { wachstum: rand.wachstum, nachfrage: rand.nachfrage, kante: rand.kante, teil: rand.teil } } : abl;
}

export type Rohbau = {
  opt: AbleitOptionen;
  vorlage: Roehre;
  /** Käfig (Topologie mit Falten); bei einem Maul größer als die Vorlage */
  kaefig: Kaefig;
  ziele: Float64Array;
  hoehe: Float64Array;
  l: Leiter;
  st: Stationen;
  breiten: Breiten;
  dok: Dokument;
  /** 1 = Hautpunkt des Käfigs (Naht-Ausgleich); ohne Angabe alle */
  haut?: Uint8Array;
  /** Gewicht je Käfigziel im Ausgleich (Standard 1; z. B. Lippen so stark wie die Naht) */
  zielGewicht?: Float64Array;
  /** Startpunkt des Nahtrundgangs (Standard: Spitze vorn); mit Maul ein Hautpunkt neben der Lippe */
  nahtStart?: number;
  /** Maulschlitz im Seitenumriss (Block 2): die Naht hängt am Umriss ohne Schlitz */
  schlitz?: Schlitz | null;
  /** Maulbau: Breitenpunkte auch auf Hautzeilen der Maulringe, keine an Kastenringen (Phase 2 M3) */
  maulBau?: boolean;
  /** S3 „Umrisse berühren“: gewachsene Querschnitte je Ring und die Berührpunkte (Ring, Vorlagenpunkt) — Breitenpunkte im Ausgleich */
  randVorlagen?: readonly Querschnitt[];
  randPunkte?: readonly { i: number; j: number }[];
  /** V4 „Querschnitt aus der Sichthülle“: je Käfigpunkt 1 = Vorlage trifft dort die Front, 2 = das Top (Bindung im Löser) */
  huelle?: Uint8Array;
  /** V4: dichte Kurven der Ringschnitte (feine Punkte längs der Ringe werden auf sie projiziert) */
  dichte?: DichteVorlagen;
  /** V5 „Form zuerst“: der Körper ohne Linien, an dessen Form sich der Körper mit Linien bindet */
  form?: Ableitung;
  zeiten: { t0: number; t1: number; t2: number };
};

/**
 * V5 „Punkt zu Linie“: feine Punkte längs jeder Linienschleife (Käfigpunkte und innere Punkte ihrer Käfigkanten, rechts und
 * gespiegelt). Ziel je Punkt: in der Zeichenansicht der Linie der nächste Punkt der Linie, die dritte Koordinate bleibt die
 * aktuelle (frei) — so liegt die Falte zwischen den Ringen und an den Enden genau auf der gezeichneten Linie.
 */
export type LinienFein = { fein: Uint32Array; linie: Uint16Array; seite: Int8Array };
/** V5: Gewicht je feinem Punkt einer Linienschleife (wie die Breitenpunkte) */
const LINIE_GEWICHT = 16;

/** Spiegelpunkt eines Ringpunkts (i, j) ist (i, N − j). */
function spiegelRingPunkt(v: Roehre, p: number): number {
  const i = Math.floor(p / v.N);
  return v.ringPunkt(i, (v.N - (p % v.N)) % v.N);
}

function linienFeinFuer(v: Roehre, k: Kaefig, u: Unterteilung, kanten: readonly LinienKante[]): LinienFein {
  const fein: number[] = [];
  const linie: number[] = [];
  const seite: number[] = [];
  const gesehen = new Set<number>();
  for (const ka of kanten) {
    for (const [s, a, b] of [
      [1, ka.a, ka.b],
      [-1, spiegelRingPunkt(v, ka.a), spiegelRingPunkt(v, ka.b)],
    ] as const) {
      const kette = feinKette(u, k, a, b);
      for (const q of kette) {
        if (gesehen.has(q)) continue;
        gesehen.add(q);
        fein.push(q);
        linie.push(ka.linie);
        seite.push(s);
      }
    }
  }
  return { fein: Uint32Array.from(fein), linie: Uint16Array.from(linie), seite: Int8Array.from(seite) };
}

/** Linien in ihrer Zeichenansicht (zwei Achsen) für die Ziele der Linienschleifen. */
type LinienZug = { achsen: readonly [number, number]; punkte: Float64Array };
function linienZuege(dok: Dokument): LinienZug[] {
  return (dok.kanten ?? []).map((ka) => {
    const ln = kanteAbtasten(ka, dok.skalierung, 24);
    const achsen: readonly [number, number] = ka.blick === 'front' || ka.blick === 'hinten' ? [2, 1] : ka.blick === 'top' || ka.blick === 'unten' ? [0, 2] : [0, 1];
    const punkte = new Float64Array(2 * ln.punkte.length);
    ln.punkte.forEach((p, i) => {
      punkte[2 * i] = achsen[0] === 2 ? Math.abs(p[2]!) : p[achsen[0]]!;
      punkte[2 * i + 1] = achsen[1] === 2 ? Math.abs(p[2]!) : p[achsen[1]]!;
    });
    return { achsen, punkte };
  });
}

/** Ziele der Linienschleifen: je Zeile der nächste Punkt der Linie in ihrer Zeichenansicht, die dritte Achse bleibt. */
function linienZiele(lf: LinienFein, zuege: readonly LinienZug[], lagen: Float64Array): Float64Array {
  const out = new Float64Array(3 * lf.fein.length);
  for (let q = 0; q < lf.fein.length; q++) {
    const p = lf.fein[q]!;
    const s = lf.seite[q]!;
    const ziel = [lagen[3 * p]!, lagen[3 * p + 1]!, lagen[3 * p + 2]!];
    const z = zuege[lf.linie[q]!];
    if (z) {
      const [ax, ay] = z.achsen;
      // links gespiegelt: z der rechten Seite
      const wert = (d: number) => (d === 2 ? s * ziel[2]! : ziel[d]!);
      const px = wert(ax);
      const py = wert(ay);
      let best = Infinity;
      let bx = px;
      let by = py;
      const m = z.punkte.length / 2;
      for (let i = 0; i + 1 < m; i++) {
        const x0 = z.punkte[2 * i]!;
        const y0 = z.punkte[2 * i + 1]!;
        const dx = z.punkte[2 * i + 2]! - x0;
        const dy = z.punkte[2 * i + 3]! - y0;
        const l2 = dx * dx + dy * dy;
        const t = l2 > 0 ? Math.min(1, Math.max(0, ((px - x0) * dx + (py - y0) * dy) / l2)) : 0;
        const qx = x0 + t * dx;
        const qy = y0 + t * dy;
        const d = (px - qx) ** 2 + (py - qy) ** 2;
        if (d < best) {
          best = d;
          bx = qx;
          by = qy;
        }
      }
      const setze = (d: number, w: number) => {
        ziel[d] = d === 2 ? s * w : w;
      };
      setze(ax, bx);
      setze(ay, by);
    }
    out[3 * q] = ziel[0]!;
    out[3 * q + 1] = ziel[1]!;
    out[3 * q + 2] = ziel[2]!;
  }
  return out;
}

/**
 * V5 „Form zuerst“: feine Punkte der Stufe 2 (ohne Nahtpunkte); Ziel je Punkt ist seine Lage auf der Tangentialebene des
 * nächsten Punkts der Form ohne Linien (Punkt zu Ebene, längs der Fläche frei). Erst nur die Tiefe in der Seite: dort, wo die
 * Haut steil zur Seite steht (an den Polen der Front), band das nichts, und die Endreihen der Querlinien verzogen die Kugel 2 px.
 */
export type FormFein = { fein: Uint32Array };

/**
 * Form ohne Linien auf ihrer feinsten Stufe: Lagen und die Topologie (Nachbarn, Flächen je Punkt). Der Körper mit Linien hat
 * dieselbe Topologie (Röhre), nur andere Lagen: Sein Punkt q sucht den nächsten Formpunkt mit einem Gang über die Fläche, der beim
 * Formpunkt q beginnt — eine Suche im Raum sprang an dünnen Stellen auf die Gegenseite. Normalen nur an den gefundenen Punkten
 * (im Zug zählt jede Millisekunde).
 */
type FormFlaeche = { punkte: ArrayLike<number>; kf: Kaefig };

function formFlaeche(a: Ableitung, fein: ArrayLike<number> = a.fein): FormFlaeche {
  return { punkte: fein, kf: a.unterteilung.stufen[a.unterteilung.stufen.length - 1]!.kaefig };
}

/** Normale der Form an Punkt p (Summe der Flächennormalen um ihn, normiert). */
function formNormale(ff: FormFlaeche, p: number): [number, number, number] {
  const { kf, punkte } = ff;
  let nx = 0;
  let ny = 0;
  let nz = 0;
  for (let i = kf.vFStart[p]!; i < kf.vFStart[p + 1]!; i++) {
    const f = kf.vFlaechen[i]!;
    const h0 = kf.fStart[f]!;
    const m = kf.fStart[f + 1]! - h0;
    // Ecke p in der Fläche: Kreuzprodukt der beiden Kanten an ihr
    let k = 0;
    while (k < m && kf.fVerts[h0 + k] !== p) k++;
    if (k === m) continue;
    const b = kf.fVerts[h0 + ((k + 1) % m)]!;
    const c = kf.fVerts[h0 + ((k + m - 1) % m)]!;
    const ux = punkte[3 * b]! - punkte[3 * p]!;
    const uy = punkte[3 * b + 1]! - punkte[3 * p + 1]!;
    const uz = punkte[3 * b + 2]! - punkte[3 * p + 2]!;
    const vx = punkte[3 * c]! - punkte[3 * p]!;
    const vy = punkte[3 * c + 1]! - punkte[3 * p + 1]!;
    const vz = punkte[3 * c + 2]! - punkte[3 * p + 2]!;
    nx += uy * vz - uz * vy;
    ny += uz * vx - ux * vz;
    nz += ux * vy - uy * vx;
  }
  const l = Math.hypot(nx, ny, nz) || 1;
  return [nx / l, ny / l, nz / l];
}

/**
 * Nächster Formpunkt zu (x, y, z): Gang über die Nachbarn ab dem Formpunkt `p`, solange einer näher liegt — nie über die Naht
 * auf die gespiegelte Seite (an der Schnauzenspitze zog das die Haut quer, Rex 35°).
 */
function formNaechster(ff: FormFlaeche, x: number, y: number, z: number, p: number): number {
  const P = ff.punkte;
  const kf = ff.kf;
  const d2 = (q: number) => (P[3 * q]! - x) ** 2 + (P[3 * q + 1]! - y) ** 2 + (P[3 * q + 2]! - z) ** 2;
  let aktuell = p;
  let bd = d2(p);
  for (let schritt = 0; schritt < 256; schritt++) {
    let besser = -1;
    for (let i = kf.vKStart[aktuell]!; i < kf.vKStart[aktuell + 1]!; i++) {
      const e = kf.vKanten[i]!;
      const q = kf.eA[e] === aktuell ? kf.eB[e]! : kf.eA[e]!;
      if (P[3 * q + 2]! * z < 0) continue;
      const d = d2(q);
      if (d < bd) {
        bd = d;
        besser = q;
      }
    }
    if (besser < 0) return aktuell;
    aktuell = besser;
  }
  return aktuell;
}

/**
 * Feine Punkte der Stufe `stufe` (ohne Naht), die an die Form gebunden werden: nur, wo die Linien den Käfig verschoben haben —
 * Käfigpunkte mit anderem Ziel als in der Form (gedrehte Ringe, verzogene Reihen) und Punkte an Linienfalten; überall sonst ist
 * der Körper derselbe wie die Form. Eine Bindung über den ganzen Körper faltete das dünne Ringband an der Rex-Schnauze (35–115°).
 */
function formFeinFuer(u: Unterteilung, fein: Float64Array, geaendert: Uint8Array, stufe = 2): FormFein {
  const n = u.stufen[Math.min(stufe - 1, u.stufen.length - 1)]!.kaefig.n;
  const M = u.grenze;
  const idx: number[] = [];
  for (let q = 0; q < n; q++) {
    if (Math.abs(fein[3 * q + 2]!) < 1e-5) continue;
    let an = false;
    for (let i = M.start[q]!; i < M.start[q + 1]! && !an; i++) if (geaendert[M.index[i]!]) an = true;
    if (an) idx.push(q);
  }
  return { fein: Uint32Array.from(idx) };
}

/** Käfigpunkte, die die Linien verschoben haben: anderes Ziel als die Form (über `GEAENDERT`), an einer Linienfalte oder Treppe. */
function formGeaendert(k: Kaefig, ziele: Float64Array, form: Ableitung, kanten: readonly LinienKante[], v: Roehre, treppe: readonly number[] = []): Uint8Array {
  const g = new Uint8Array(k.n);
  const n = Math.min(k.n, form.kaefig.n);
  for (let p = 0; p < n; p++) {
    const d = Math.hypot(ziele[3 * p]! - form.ziele[3 * p]!, ziele[3 * p + 1]! - form.ziele[3 * p + 1]!, ziele[3 * p + 2]! - form.ziele[3 * p + 2]!);
    if (d > GEAENDERT) g[p] = 1;
  }
  for (const lk of kanten) for (const p of [lk.a, lk.b, spiegelRingPunkt(v, lk.a), spiegelRingPunkt(v, lk.b)]) g[p] = 1;
  for (const p of treppe) g[p] = 1;
  return g;
}
/** Käfigziele, die sich um mehr als das unterscheiden, gelten als verschoben (0,1 px) */
const GEAENDERT = 0.1 / 461;
/** V5: Gewicht je Formpunkt (gemessen 21.10.: 4 → 16 besser überall, Rex 0,7 → 0,3 px; ohne Falten, weil nur örtlich) */
const FORM_GEWICHT = 16;

/** Ziele der Formpunkte: Lot auf die Tangentialebene des nächsten Formpunkts (längs der Fläche bleibt der Punkt, wo er ist). */
function formZiele(ff: FormFein, form: FormFlaeche, lagen: Float64Array): Float64Array {
  const out = new Float64Array(3 * ff.fein.length);
  for (let q = 0; q < ff.fein.length; q++) {
    const p = ff.fein[q]!;
    const x = lagen[3 * p]!;
    const y = lagen[3 * p + 1]!;
    const z = lagen[3 * p + 2]!;
    const f = formNaechster(form, x, y, z, p);
    const [nx, ny, nz] = formNormale(form, f);
    const d = (x - form.punkte[3 * f]!) * nx + (y - form.punkte[3 * f + 1]!) * ny + (z - form.punkte[3 * f + 2]!) * nz;
    out[3 * q] = x - d * nx;
    out[3 * q + 1] = y - d * ny;
    out[3 * q + 2] = z - d * nz;
  }
  return out;
}

/** V4: feine Punkte längs der Ringe (innere Punkte jeder Käfigkante der Ringe, rechts und gespiegelt) mit Suchfenster. */
function dichtFeinFuer(v: Roehre, k: Kaefig, u: Unterteilung, dv: DichteVorlagen): DichtFein {
  const { R, N } = v;
  const fein: number[] = [];
  const ring: number[] = [];
  const seite: number[] = [];
  const von: number[] = [];
  const bis: number[] = [];
  for (let i = 0; i < R; i++) {
    const z = dv.zeilen[i]!;
    const m = dv.kurven[i]!.length / 3;
    for (let j = 0; j < N / 2; j++) {
      const a = Math.max(0, Math.min(z[j]!, z[j + 1]!) - 2);
      const b = Math.min(m - 1, Math.max(z[j]!, z[j + 1]!) + 2);
      for (const [s, p0, p1] of [
        [1, v.ringPunkt(i, j), v.ringPunkt(i, j + 1)],
        [-1, v.ringPunkt(i, N - j), v.ringPunkt(i, N - j - 1)],
      ] as const) {
        const kette = feinKette(u, k, p0, p1);
        for (let q = 1; q + 1 < kette.length; q++) {
          fein.push(kette[q]!);
          ring.push(i);
          seite.push(s);
          von.push(a);
          bis.push(b);
        }
      }
    }
  }
  return { fein: Uint32Array.from(fein), ring: Uint16Array.from(ring), seite: Int8Array.from(seite), von: Int32Array.from(von), bis: Int32Array.from(bis) };
}

/**
 * Rohbau fertigstellen: Unterteilung (Matrix), Löser je Topologie, Käfig durch die Ziele, dann der Ausgleich der feinen
 * Nahtpunkte (z = 0, aus Hautpunkten) auf den gezeichneten Seitenumriss.
 */
export function fertigstellen(e: Rohbau): Ableitung {
  const { opt, vorlage, kaefig: k, ziele, hoehe, l, st, breiten, dok } = e;
  const u = unterteilung(k, opt.stufen);
  const t3 = jetzt();
  const loeser = grenzLoeser(u.grenze, k.n);
  const t4 = jetzt();
  let xyz = kaefigDurchZiele(loeser, ziele);
  let fein = anwenden3(u.grenze, xyz);
  const nF = fein.length / 3;
  // Hautanteil je feinem Punkt aus der Matrix (fein ← Käfig)
  const feinIdx: number[] = [];
  const M = u.matrix;
  for (let i = 0; i < nF; i++) {
    if (Math.abs(fein[3 * i + 2]!) >= 1e-7) continue;
    if (e.haut) {
      let hautGewicht = 0;
      let gesamt = 0;
      for (let p = M.start[i]!; p < M.start[i + 1]!; p++) {
        gesamt += M.wert[p]!;
        if (e.haut[M.index[p]!]) hautGewicht += M.wert[p]!;
      }
      if (hautGewicht < 0.5 * gesamt) continue;
    }
    feinIdx.push(i);
  }
  const umriss = e.schlitz ? umrissDichtOffen(dok, e.schlitz) : umrissDicht(dok);
  const letzte = u.stufen[u.stufen.length - 1]!.kaefig;
  // unterbrochener Rundgang mit Maul: fehlt ein Stück Naht hinter dem Start, läuft er auch rückwärts (`nahtPfad`); dann
  // Ziele nur zwischen dem ersten und dem letzten Käfigpunkt, die Enden an der Lücke folgen dem Käfig („Enden zur Lücke“
  // verschob den Lippenanfang um 1–2 px, die Verteilung quer über die Lücke ließ ihn bei der Nase 1,9 px wandern)
  const pfad = nahtPfad(letzte, feinIdx, e.nahtStart ?? vorlage.naht.spitzeVorn, k.n);
  const offenerPfad = pfad.offen && !umriss.offen;
  let geordnet = pfad.geordnet;
  let anteil = nahtAnteile(geordnet, k.n, ziele, umriss, offenerPfad);
  if (offenerPfad) {
    const fest = geordnet.map((i, q) => (i < k.n ? q : -1)).filter((q) => q >= 0);
    geordnet = geordnet.slice(fest[0]!, fest[fest.length - 1]! + 1);
    anteil = anteil.slice(fest[0]!, fest[fest.length - 1]! + 1);
  }
  const nahtFein = Uint32Array.from(geordnet);
  let nahtLoeser: AusgleichsLoeser | null = null;
  const exakt = opt.umrisse === 'exakt' && opt.nahtGewicht > 0 && !e.haut && !e.schlitz && !e.maulBau;
  // V4: Mit dem Querschnitt aus der Sichthülle bleiben die Breitenpunkte (weich, nur quer; aus den Vorlagen der Hülle) — ohne
  // sie schrumpfte die Kante flacher Körper ungleich (Rochen: Falte 6 → 51°). Der alte Beweis (Breitenlinie) kam ohne sie aus.
  const breite = exakt && (!e.huelle || opt.umrisseOpt?.breite === false) ? null : breitenSchleife(vorlage, l, st, breiten, dok, opt, ziele, u, k, e.haut, e.maulBau, e.randVorlagen, e.randPunkte);
  let umrisseBericht: UmrissBericht | undefined;
  // V4: feine Punkte längs der Ringe auf die dichten Kurven ihrer Schnitte (Zeilen nach den Breitenpunkten)
  // (Standard mit dem Querschnitt aus der Hülle; gemessen 21.10.: Robbe Front 4,4 → 3,7 px, Kegel 3,0 → 2,5, Falten +1°)
  const dicht = exakt && e.dichte && (opt.umrisseOpt?.dicht ?? true) ? dichtFeinFuer(vorlage, k, u, e.dichte) : null;
  // V5: Linienschleifen — feine Punkte auf die gezeichneten Linien (Zeilen nach der dichten Anpassung)
  const linienFein = exakt && st.linienKanten?.length ? linienFeinFuer(vorlage, k, u, st.linienKanten) : null;
  const zuege = linienFein ? linienZuege(dok) : [];
  // V5 „Form zuerst“: feine Punkte der Stufe 2 auf die Form des Körpers ohne Linien (Zeilen nach den Linienpunkten)
  const formFein = exakt && e.form ? formFeinFuer(u, fein, formGeaendert(k, ziele, e.form, st.linienKanten ?? [], vorlage, st.treppenPunkte)) : null;
  const formRaster = formFein ? formFlaeche(e.form!) : null;
  const fg = opt.umrisseOpt?.form ?? FORM_GEWICHT;
  let zieleWirk = ziele;
  let korrektur: Float64Array | null = null;
  const zieleAlle = (lagen: Float64Array): Float64Array => {
    const a = ausgleichsZiele(k.n, zieleWirk, umriss, nahtFein, anteil, breite, breiten, lagen, opt.fuehrend);
    if (!dicht && !linienFein && !formFein) return a;
    const nD = dicht ? 3 * dicht.fein.length : 0;
    const nL = linienFein ? 3 * linienFein.fein.length : 0;
    const out = new Float64Array(a.length + nD + nL + (formFein ? 3 * formFein.fein.length : 0));
    out.set(a);
    if (dicht) out.set(dichtZiele(dicht, e.dichte!, lagen), a.length);
    if (linienFein) out.set(linienZiele(linienFein, zuege, lagen), a.length + nD);
    if (formFein) out.set(formZiele(formFein, formRaster!, lagen), a.length + nD + nL);
    return out;
  };
  if (opt.nahtGewicht > 0) {
    const bedingungen: Bedingung[] = [];
    for (let i = 0; i < k.n; i++) bedingungen.push({ zeile: i, gewicht: e.zielGewicht ? e.zielGewicht[i]! : 1 });
    for (let q = 0; q < nahtFein.length; q++) bedingungen.push({ zeile: nahtFein[q]!, gewicht: opt.nahtGewicht });
    if (breite) for (let q = 0; q < breite.fein.length; q++) bedingungen.push({ zeile: breite.fein[q]!, gewicht: opt.breiteGewicht * (breite.gewicht?.[q] ?? 1) });
    const dg = opt.umrisseOpt?.dichtGewicht ?? DICHT_GEWICHT;
    if (dicht) for (let q = 0; q < dicht.fein.length; q++) bedingungen.push({ zeile: dicht.fein[q]!, gewicht: dg });
    const lg = opt.umrisseOpt?.linieGewicht ?? LINIE_GEWICHT;
    if (linienFein) for (let q = 0; q < linienFein.fein.length; q++) bedingungen.push({ zeile: linienFein.fein[q]!, gewicht: lg });
    if (formFein) for (let q = 0; q < formFein.fein.length; q++) bedingungen.push({ zeile: formFein.fein[q]!, gewicht: fg });
    nahtLoeser = ausgleichsLoeser(u.grenze, k.n, bedingungen, opt.glaettung > 0 ? { kaefig: k, gewicht: opt.glaettung } : undefined, glaettemassFuer(u, k, opt, vorlage.R * vorlage.N));
    xyz = kaefigAusgleich(nahtLoeser, zieleAlle(fein));
    fein = anwenden3(u.grenze, xyz);
    // Breitenziele (und die Fußpunkte der dichten Anpassung) an den tatsächlichen Grenzlagen nachrechnen, zwei Durchgänge
    for (let durchgang = 0; (breite || dicht || linienFein || formFein) && durchgang < BREITE_DURCHGAENGE; durchgang++) {
      xyz = kaefigAusgleich(nahtLoeser, zieleAlle(fein));
      fein = anwenden3(u.grenze, xyz);
    }
    // V4 (Versuch `umrisseOpt.korrektur`): glatte Korrektur — wo die Fläche über Front oder Top hinaussteht, das Überstehen
    // je Käfigpunkt sammeln, über den Käfig glätten und die Ziele um dieses glatte Feld nach innen schieben (gleicher Löser,
    // neue Ziele; ein glattes Feld kann keine Dellen machen — punktweise Grenzen machten Flächen fleckig)
    const kr = exakt ? (opt.umrisseOpt?.korrektur ?? 0) : 0;
    if (kr > 0) {
      const M = u.grenze;
      const nach = kaefigNachbarlisten(k);
      korrektur = new Float64Array(k.n);
      for (let runde = 0; runde < kr; runde++) {
        const ue = new Float64Array(k.n);
        const nF = fein.length / 3;
        for (let p = 0; p < nF; p++) {
          const x = fein[3 * p]!;
          const y = fein[3 * p + 1]!;
          const z = Math.abs(fein[3 * p + 2]!);
          const f = breiten.front(y);
          const t = breiten.top(x);
          const g = Math.min(f > 0 ? f : Infinity, t > 0 ? t : Infinity);
          if (!Number.isFinite(g) || !(z > g)) continue;
          const ex = z - g;
          let wMax = 0;
          for (let q = M.start[p]!; q < M.start[p + 1]!; q++) wMax = Math.max(wMax, M.wert[q]!);
          for (let q = M.start[p]!; q < M.start[p + 1]!; q++) {
            const i = M.index[q]!;
            if (i < k.n && M.wert[q]! >= 0.25 * wMax) ue[i] = Math.max(ue[i]!, ex);
          }
        }
        // glätten: zwei Durchgänge Mittel mit den Nachbarn
        let feld = ue;
        for (let d = 0; d < 2; d++) {
          const neu = new Float64Array(k.n);
          for (let i = 0; i < k.n; i++) {
            const nb = nach[i] ?? [];
            let sm = 0;
            for (const j of nb) sm += feld[j]!;
            neu[i] = nb.length ? 0.5 * feld[i]! + (0.5 * sm) / nb.length : feld[i]!;
          }
          feld = neu;
        }
        let max = 0;
        for (const x of feld) max = Math.max(max, x);
        if (!(max > GRENZE_UEBER)) break;
        for (let i = 0; i < k.n; i++) korrektur[i] = korrektur[i]! + 1.5 * feld[i]!;
        const zk = Float64Array.from(ziele);
        for (let i = 0; i < k.n; i++) {
          const z = zk[3 * i + 2]!;
          if (Math.abs(z) > 1e-12) zk[3 * i + 2] = z - Math.sign(z) * Math.min(korrektur[i]!, 0.5 * Math.abs(z));
        }
        zieleWirk = zk;
        xyz = kaefigAusgleich(nahtLoeser, zieleAlle(fein));
        fein = anwenden3(u.grenze, xyz);
      }
    }
    // V4 (Versuch `umrisseOpt.grenze`): weiche einseitige Grenze — feine Punkte, die über Front oder Top hinausstehen, quer
    // auf die Linie (nur die wenigen, die es tun; Gewicht mäßig, keine harte Bindung)
    const gw = exakt ? (opt.umrisseOpt?.grenze ?? 0) : 0;
    if (gw > 0) {
      const aktiv = new Map<number, number>();
      for (let runde = 0; runde < 3; runde++) {
        const nF = fein.length / 3;
        let neu = 0;
        for (let p = 0; p < nF; p++) {
          if (aktiv.has(p)) continue;
          const x = fein[3 * p]!;
          const y = fein[3 * p + 1]!;
          const z = Math.abs(fein[3 * p + 2]!);
          const f = breiten.front(y);
          const t = breiten.top(x);
          const g = Math.min(f > 0 ? f : Infinity, t > 0 ? t : Infinity);
          if (Number.isFinite(g) && z > g + GRENZE_UEBER) {
            aktiv.set(p, g);
            neu++;
          }
        }
        if (!neu) break;
        const zeilen = [...aktiv.keys()];
        const bed2 = [...nahtLoeser.bedingungen, ...zeilen.map((zeile) => ({ zeile, gewicht: gw }))];
        const l2 = ausgleichsLoeser(u.grenze, k.n, bed2, opt.glaettung > 0 ? { kaefig: k, gewicht: opt.glaettung } : undefined, glaettemassFuer(u, k, opt, vorlage.R * vorlage.N));
        const basis = zieleAlle(fein);
        const zz = new Float64Array(basis.length + 3 * zeilen.length);
        zz.set(basis);
        zeilen.forEach((p, q) => {
          const o = basis.length + 3 * q;
          zz[o] = fein[3 * p]!;
          zz[o + 1] = fein[3 * p + 1]!;
          zz[o + 2] = Math.sign(fein[3 * p + 2]!) * aktiv.get(p)!;
        });
        xyz = kaefigAusgleich(l2, zz);
        fein = anwenden3(u.grenze, xyz);
      }
    }
    // V4: exakte Umrisse — dieselben Käfigziele und Naht, dazu Breitenlinie, Frontlinie und Ungleichung (Löser je Achse).
    // Mit dem Querschnitt aus der Sichthülle trägt die Vorlage die Umrisse selbst; der Löser je Achse läuft nur, wenn ein
    // Versuch etwas hinzufügt (Breitenlinie, Gewicht oder Bindung der Hüllpunkte, Frontlinie, Ungleichung) — sonst wäre er
    // derselbe Ausgleich noch einmal (und der Zug ohne ihn bliebe gleich)
    const uo = opt.umrisseOpt ?? {};
    const zusatz = !e.huelle || uo.top === true || (uo.huelle ?? 'aus') !== 'aus' || uo.front === true || (uo.ungleich ?? 0) > 0;
    if (exakt && zusatz) {
      const zeilen = [];
      // Querschnitt aus der Sichthülle: Ziele, die laut Vorlage auf Front oder Top liegen, zählen mehr (gleiche Ziele, kein
      // Widerspruch — sie verlieren sonst gegen die Glättung, was die Grenzfläche zwischen den Stützstellen nachgibt)
      const hz = e.huelle && (opt.umrisseOpt?.huelle ?? 'aus') !== 'aus' ? (opt.umrisseOpt?.huelleGewicht ?? HUELLE_GEWICHT) : 1;
      const blatt = opt.umrisseOpt?.huelleAchsen === 'blatt';
      for (let i = 0; i < k.n; i++) {
        const w0 = e.zielGewicht ? e.zielGewicht[i]! : 1;
        const art = e.huelle?.[i] ?? 0;
        const w = w0 * (art ? hz : 1);
        const gewicht: [number, number, number] = !art || !blatt ? [w, w, w] : art === 1 ? [w0, w, w] : [w, w0, w];
        zeilen.push({ ...grenzZeile(u.grenze, i, k.n), gewicht });
      }
      for (let q = 0; q < nahtFein.length; q++) zeilen.push({ ...grenzZeile(u.grenze, nahtFein[q]!, k.n), gewicht: [opt.nahtGewicht, opt.nahtGewicht, opt.nahtGewicht] as const });
      const r = umrisseLoesen({ v: vorlage, k, u, dok, breiten, basis: { zeilen, ziele: ausgleichsZiele(k.n, ziele, umriss, nahtFein, anteil) }, gm: glaettemassFuer(u, k, opt, vorlage.R * vorlage.N), ...(opt.umrisseOpt ? { opt: opt.umrisseOpt } : {}), ...(e.huelle ? { huelle: e.huelle } : {}) });
      xyz = r.xyz;
      fein = r.fein;
      umrisseBericht = r.bericht;
    }
  }
  const kaefig = { ...k, xyz };
  const t5 = jetzt();
  const { t0, t1, t2 } = e.zeiten;
  return {
    opt,
    vorlage,
    unterteilung: u,
    loeser,
    stationen: st.ringe,
    kappenStationen: st.kappen,
    ecken: st.ecken,
    reifen: st.reifen,
    ...(st.ringeNatuerlich ? { stationenNatuerlich: st.ringeNatuerlich } : {}),
    ...(st.linien ? { linienRinge: st.linien } : {}),
    ...(st.schleifen ? { schleifenRinge: st.schleifen } : {}),
    ...(st.einordnung ? { linienEinordnung: st.einordnung } : {}),
    ...(st.linienBau ? { linienBau: st.linienBau } : {}),
    gefroren: st.gefroren,
    spitzen: st.spitzen,
    ziele,
    hoehe,
    kaefig,
    fein,
    breiten,
    altLeiter: l,
    dokAlt: dok,
    naht: { fein: nahtFein, anteil, loeser: nahtLoeser },
    breite,
    ...(umrisseBericht ? { umrisse: umrisseBericht } : {}),
    ...(dicht ? { dicht } : {}),
    ...(linienFein ? { linienFein } : {}),
    ...(formFein ? { form: e.form!, formFein } : {}),
    zeiten: { leiter: t1 - t0, breiten: t2 - t1, matrix: t3 - t2, loeser: t4 - t3, ziele: t5 - t4, gesamt: t5 - t0 },
  };
}

/**
 * Glättungsmaß der Ableitung (S2): Laplace-Zeilen der Stufe 2 in Käfigpunkten, Gewicht `fair`, an den Kappen (Käfigpunkte
 * ab `kappeAb`) × `fairKappe`; `fair < 0` = dünner Löser ohne Glättung; ohne `fair` undefined (dichter Weg).
 */
export function glaettemassFuer(u: Unterteilung, k: Kaefig, opt: Pick<AbleitOptionen, 'fair' | 'fairBezug' | 'fairKappe'> & Partial<Pick<AbleitOptionen, 'umrisse' | 'umrisseOpt'>>, kappeAb = k.n): Glaettemass | undefined {
  const g = opt.fair ?? 0;
  if (g === 0) return undefined;
  const s = Math.min(2, u.stufen.length);
  let M = u.stufen[0]!.matrix;
  for (let i = 1; i < s; i++) M = multiplizieren(u.stufen[i]!.matrix, M);
  const zeilen = g > 0 ? glaettungsZeilen(u.stufen[s - 1]!.kaefig, M, k.n, g, opt.fairKappe && opt.fairKappe !== 1 ? { ab: kappeAb, faktor: opt.fairKappe } : undefined) : [];
  const hub = opt.umrisse === 'exakt' ? (opt.umrisseOpt?.hub ?? 0) : 0;
  return { zeilen, nachbarn: kaefigNachbarlisten(k), bezug: opt.fairBezug ?? 0, ...(hub ? { hub } : {}) };
}

export type Zug = Ableitung & { zugZeit: { leiter: number; ziele: number; loeser: number; matrix: number } };

/**
 * Zug (Seitenumriss, Front oder Spant geändert): Topologie, Matrix, Löser und Stationen bleiben. Die Ziele werden bei
 * den festen Stationen aus der neuen Leiter, den neuen Silhouettenbreiten und dem neuen Querschnitt gerechnet, dann
 * Löser und Matrix.
 */
export function ziehen(abl: Ableitung, dokNeu: Dokument): Zug {
  if (abl.kaefig.n !== abl.vorlage.kaefig.n) throw new Error('ziehen: Käfig mit Maul – bitte neu ableiten');
  const t0 = jetzt();
  const l = kernLeiter(dokNeu);
  const t1 = jetzt();
  const v = abl.vorlage;
  const st: Stationen = { ringe: abl.stationen, kappen: abl.kappenStationen, ecken: abl.ecken, reifen: abl.reifen, spitzen: abl.spitzen, gefroren: abl.gefroren, ...(abl.linienRinge ? { linien: abl.linienRinge } : {}), ...(abl.linienEinordnung ? { einordnung: abl.linienEinordnung } : {}), ...(abl.stationenNatuerlich ? { ringeNatuerlich: abl.stationenNatuerlich } : {}), ...(abl.schleifenRinge ? { schleifen: abl.schleifenRinge } : {}) };
  // V6: Loop-Ringe folgen im Zug ihren Knoten (dieselbe Nummer; die Reihenfolge ordnet erst der genaue Bau neu)
  if (abl.schleifenRinge?.length) {
    const neu = new Map(schleifenStationen(dokNeu, l).map((s) => [s.id, s] as const));
    const ringe = st.ringe.slice();
    const nat = st.ringeNatuerlich?.slice();
    for (const sr of abl.schleifenRinge) {
      const s = neu.get(sr.id);
      if (!s) continue;
      ringe[sr.ring] = { a: s.a, b: s.b };
      if (nat) nat[sr.ring] = { a: s.a, b: s.b };
    }
    st.ringe = ringe;
    if (nat) st.ringeNatuerlich = nat;
  }
  const breiten = silhouettenBreite(dokNeu);
  const { ziele, hoehe, dichte } = zieleBerechnen(v, l, st, breiten, dokNeu, abl.opt);
  const t2 = jetzt();
  const umrissNeu = umrissDicht(dokNeu);
  const anteilNeu = abl.naht.loeser ? nahtAnteile(Array.from(abl.naht.fein), v.kaefig.n, ziele, umrissNeu) : abl.naht.anteil;
  // dieselben Zeilen wie beim Bau (V4: mit den Fußpunkten der dichten Anpassung auf den neuen Kurven)
  const lf = abl.linienFein;
  const zuege = lf ? linienZuege(dokNeu) : [];
  // V5 „Form zuerst“: die Form ohne Linien zieht mit (eigener Zug), der Körper mit Linien bindet sich an sie
  const ff = abl.formFein && abl.form ? abl.formFein : null;
  const formNeu = ff ? ziehen(abl.form!, { ...dokNeu, kanten: [] }) : null;
  const formRaster = formNeu ? formFlaeche(formNeu) : null;
  const zieleAlle = (lagen: Float64Array): Float64Array => {
    const a = ausgleichsZiele(v.kaefig.n, ziele, umrissNeu, abl.naht.fein, anteilNeu, abl.breite, breiten, lagen, abl.opt.fuehrend);
    const mitDicht = !!(abl.dicht && dichte);
    if (!mitDicht && !lf && !ff) return a;
    const nD = mitDicht ? 3 * abl.dicht!.fein.length : 0;
    const nL = lf ? 3 * lf.fein.length : 0;
    const out = new Float64Array(a.length + nD + nL + (ff ? 3 * ff.fein.length : 0));
    out.set(a);
    if (mitDicht) out.set(dichtZiele(abl.dicht!, dichte!, lagen), a.length);
    if (lf) out.set(linienZiele(lf, zuege, lagen), a.length + nD);
    if (ff) out.set(formZiele(ff, formRaster!, lagen), a.length + nD + nL);
    return out;
  };
  let xyz = abl.naht.loeser ? kaefigAusgleich(abl.naht.loeser, zieleAlle(abl.fein)) : kaefigDurchZiele(abl.loeser, ziele);
  let fein = anwenden3(abl.unterteilung.grenze, xyz);
  if (abl.naht.loeser && (abl.breite || abl.dicht || abl.linienFein || abl.formFein)) {
    xyz = kaefigAusgleich(abl.naht.loeser, zieleAlle(fein));
    fein = anwenden3(abl.unterteilung.grenze, xyz);
  }
  const t3 = jetzt();
  const t4 = jetzt();
  return { ...abl, ziele, hoehe, kaefig: { ...abl.kaefig, xyz }, fein, breiten, altLeiter: l, dokAlt: dokNeu, naht: { ...abl.naht, anteil: anteilNeu }, ...(abl.schleifenRinge?.length ? { stationen: st.ringe, ...(st.ringeNatuerlich ? { stationenNatuerlich: st.ringeNatuerlich } : {}) } : {}), zugZeit: { leiter: t1 - t0, ziele: t2 - t1, loeser: t3 - t2, matrix: t4 - t3 } };
}

/** Alter Name des Zugs am Seitenumriss. */
export const seiteZiehen = ziehen;
