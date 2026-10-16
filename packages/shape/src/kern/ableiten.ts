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
import { kanteAbtasten, kantenFalten } from './kanten';
import { feinKette } from './reifen';
import { type Unterteilung, unterteilung } from '../subdivision/catmullClark';
import { anwenden3, multiplizieren } from '../subdivision/matrix';
import { type Leiter, WIRBEL_STANDARD, leiter } from '../versuch/wirbelsaeule';
import { type Breiten, silhouettenBreite } from './breite';
import { type FuelleArt, huellenBreite } from './fuelle';
import { frontBeruehren } from './rand';
import { type Schlitz, schlitzIm, seiteFuerLeiter } from './schlitz';
import { endenFuer, profilAnker } from './grundkoerper/enden';

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

/** Station einer Sprosse: Anteile a (Rücken) und b (Bauch) entlang der Linien. */
export type Station = { a: number; b: number };

export type Ecke = { ring: number; seite: 'oben' | 'unten' | 'beide' };

/** Reifen (M3): Käfigring, der auf die Station eines gezeichneten Spants gerastet ist (Index in `dok.spanten`). */
export type Reifen = { spant: number; ring: number };

export type Stationen = { ringe: Station[]; kappen: { vorn: Station[]; hinten: Station[] }; ecken: Ecke[]; reifen: Reifen[]; spitzen: { vorn: boolean; hinten: boolean }; gefroren: GefroreneStationen };

export type Ableitung = {
  /** S3 „Umrisse berühren“: größtes Wachstum je Ring und Zahl der Wünsche (nur mit `opt.fuelle`) */
  rand?: { wachstum: number[]; nachfrage: number };
  opt: AbleitOptionen;
  vorlage: Roehre;
  unterteilung: Unterteilung;
  loeser: GrenzLoeser;
  stationen: Station[];
  kappenStationen: { vorn: Station[]; hinten: Station[] };
  ecken: Ecke[];
  /** Reifen (M3): Ringe auf den Stationen der gezeichneten Spanten */
  reifen: Reifen[];
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
  const l = mitMaul ? roh : leiterInnenEntfaechern(roh);
  const seite = dok.profile.seite;
  return { ...l, enden: { vorn: profilAnker(seite, l.ruecken[0]!), hinten: profilAnker(seite, l.ruecken[l.ruecken.length - 1]!), knoten: seite.knoten.length } };
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

function ringAnteile(l: Leiter, R: number, f0: number, f1: number, lambda: number, maul?: MaulBereich, ruhig: readonly V2[] = []): number[] {
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
  const anteile = ringAnteile(l, R, kappeVorn, 1 - kappeHinten, opt.kruemmung, maul, ruhig);
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
  const vorn: number[] = [];
  const hinten: number[] = [];
  for (let r = 1; r < c / 2; r++) {
    vorn.push((kappeVorn * r) / (c / 2));
    hinten.push(1 - (kappeHinten * r) / (c / 2));
  }
  return stationenZusammensetzen(l, R, anteile, vorn, hinten, ecken, reifen, spitzen);
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
function stationenZusammensetzen(l: Leiter, R: number, anteile: number[], vorn: readonly number[], hinten: readonly number[], ecken: Ecke[], reifen: Reifen[], spitzen: { vorn: boolean; hinten: boolean }): Stationen {
  const werte = ecken.map((e) => anteile[e.ring]!);
  const reifenWerte = reifen.map((r) => anteile[r.ring]!);
  anteile.sort((a, b) => a - b);
  ecken.forEach((e, k) => {
    e.ring = anteile.indexOf(werte[k]!);
  });
  reifen.forEach((r, k) => {
    r.ring = anteile.indexOf(reifenWerte[k]!);
  });
  const alle = stationenAusLeiter(l, [...anteile, ...vorn, ...hinten]);
  const gefroren: GefroreneStationen = { ringe: [...anteile], vorn: [...vorn], hinten: [...hinten], ecken: ecken.map((e) => ({ ...e })), reifen: reifen.map((r) => ({ ...r })), spitzen: { ...spitzen }, ...(l.enden ? { enden: l.enden } : {}) };
  return { ringe: alle.slice(0, R), kappen: { vorn: alle.slice(R, R + vorn.length), hinten: alle.slice(R + vorn.length) }, ecken, reifen, spitzen, gefroren };
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
    const alt = g.ecken.find((x) => x.ring > 0 && x.ring < R && Math.abs(anteile[x.ring]! - e.f) < 0.5 / R);
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
      const alt = g.reifen.find((r) => r.spant === index && r.ring > 0 && r.ring < R - 1);
      if (alt && !ecken.some((e) => e.ring === alt.ring) && !reifen.some((r) => r.ring === alt.ring)) {
        anteile[alt.ring] = f;
        reifen.push({ spant: index, ring: alt.ring });
        return;
      }
      reifenZuweisen(anteile, ecken, reifen, index, f, R);
    });
  }
  return stationenZusammensetzen(l, R, anteile, vorn, hinten, ecken, reifen, spitzen);
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
function kreisQuerschnitt(N: number): Querschnitt {
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
  const h = N / 2;
  const sk = dok.skalierung;
  const front = dok.profile.front;
  let yLo = yLoRoh;
  let yHi = yHiRoh;
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
      const kn = front.knoten[e.ecke];
      knoten.push(v.length - 1);
      haerte.push(Math.min(1, Math.max(0, kn?.haerte ?? 1)));
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

export function zieleBerechnen(v: Roehre, l: Leiter, st: Stationen, breiten: Breiten, dok: Dokument | null, opt: AbleitOptionen, schlitz?: SchlitzLage): { ziele: Float64Array; hoehe: Float64Array; rand?: { wachstum: number[]; nachfrage: number; vorlagen: Querschnitt[]; punkte: { i: number; j: number }[] } } {
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
  const ringQ = querschnitteFuer(ringSprossen, dok, breiten, N, opt);
  let letzteW = 0;
  // Sichthülle der Zeichnungen (Plan „Zeichnung ist Form“, Schritt 1): Maßstab = Top bei x, begrenzt durch die Front auf
  // der Höhe der breitesten Stützstelle(n) (die am wenigsten einengende, bei flachen Seiten). Die übrigen Stützstellen
  // werden einzeln auf die Front ihrer Höhe beschnitten (`punkt`). Vorher engte die Front an jeder Höhe den ganzen Ring
  // ein: ein Kasten unter einer runden Front oder ein Brustring unter dem Hals schrumpfte als Ganzes (Tiger 21 px).
  const fuehrend = opt.fuehrend;
  const masstab = (sp: Sprosse, q: Querschnitt) => {
    // Rund, wo eine Zeichnung nichts sagt (14.10.): Liegt der Ring außerhalb des Tops (Seite länger als das Top) oder sein
    // breitester Punkt außerhalb der Front, wird er höchstens so breit wie seine halbe Sprosse (runder Querschnitt). Vorher
    // bekam er die größte Top-Breite — ein über Top oder Front hinausgezogener Schwanz wurde ein Kasten (Δ bis 135 px).
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
    // führendes Top: die Front engt nicht ein; sonst Sichthülle (führende Front wirkt danach örtlich, siehe unten —
    // als alleinige Breite bekäme jeder Ring die Frontbreite seiner Höhe, Kugel-Ringe vorn 0,15 → 0,33)
    if (fuehrend !== 'top' && fBest > 0) W = Math.min(W, fBest);
    else if (fuehrend !== 'top' && !(fBest > 0)) W = Math.min(W, rund);
    if (!(W > 1e-6)) W = letzteW || 0.01 * breiten.topMax;
    letzteW = W;
    return W;
  };
  const punkt = (sp: Sprosse, q: Querschnitt, W: number, j: number): [number, number, number, number] => {
    const hv = q.v[j]!;
    const x = sp.u.x + (sp.o.x - sp.u.x) * hv;
    const y = sp.u.y + (sp.o.y - sp.u.y) * hv;
    let z = q.w[j]! * W;
    if (fuehrend !== 'top') {
      const fb = breiten.front(y);
      if (fb > 0 && z > fb) z = fb; // Hülle: nie breiter als die Front auf dieser Höhe
    }
    return [x, y, z, hv];
  };
  // Kiefer-Spanten (14.10.): in Maulringen unter der Lippe der Querschnitt des Unterkiefers
  const kiefer = !!(schlitz && dok && opt.querschnitt && dok.spanten?.length && hatKieferSpanten(dok));
  const ringQNeu = ringQ.map((q, i) => {
    if (!(schlitz && i <= schlitz.k && Number.isFinite(schlitz.vRing[i]!))) return q;
    const vL = schlitz.vRing[i]!;
    const sp = ringSprossen[i]!;
    const basis = kiefer ? kieferQuerschnitt(q, spantQuerschnitt(dok!, (sp.o.x + sp.u.x) / 2, N, 'unten'), vL) : q;
    return umparametrisieren(basis, N / 2, { index: schlitz.jL, v: vL });
  });
  const Wr = ringQNeu.map((q, i) => masstab(ringSprossen[i]!, q));
  if (fuehrend === 'front') {
    // Führende Front wirkt örtlich (Plan „Zeichnung ist Form“ 4.1): Ein Ring, der an einer Höhe die Silhouette stellt
    // (der breiteste aller Ringe dort), wächst auf die Front dieser Höhe; die anderen Ringe bleiben bei der Sichthülle.
    // Vorher galt die Front nur als Hülle (nie breiter), ein Zug nach außen lief ins Leere, und mit der Front als
    // alleiniger Breite bekäme der Schwanz die Kopfbreite seiner Höhe.
    const breiteBei = (i: number, y: number): number => {
      const sp = ringSprossen[i]!;
      const q = ringQNeu[i]!;
      let w = 0;
      for (let j = 0; j + 1 < q.v.length; j++) {
        const y0 = sp.u.y + (sp.o.y - sp.u.y) * q.v[j]!;
        const y1 = sp.u.y + (sp.o.y - sp.u.y) * q.v[j + 1]!;
        if ((y0 - y) * (y1 - y) > 0) continue;
        const f = Math.abs(y1 - y0) > 1e-12 ? (y - y0) / (y1 - y0) : 0;
        let z = Wr[i]! * (q.w[j]! + (q.w[j + 1]! - q.w[j]!) * f);
        const fb = breiten.front(y);
        if (fb > 0 && z > fb) z = fb;
        w = Math.max(w, z);
      }
      return w;
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
  const rand = opt.fuelle && !schlitz ? frontBeruehren(ringSprossen, ringQNeu, Wr, breiten, opt.fuelle, dok ? huellenBreite(dok, breiten) : undefined) : null;
  if (rand) for (let i = 0; i < R; i++) ringQNeu[i] = rand.vorlagen[i] as Querschnitt;
  for (let i = 0; i < R; i++) {
    const sp = ringSprossen[i]!;
    const q = ringQNeu[i]!;
    const W = Wr[i]!;
    for (let j = 0; j <= N / 2; j++) {
      const [x, y, z, hv] = punkt(sp, q, W, j);
      setze(v.ringPunkt(i, j), x, y, j === 0 || j === N / 2 ? 0 : z, hv);
      if (j > 0 && j < N / 2) setze(v.ringPunkt(i, N - j), x, y, -z, hv);
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
      const q = umparametrisieren(q0Teil, 4 * r, lippe);
      const sp = sprossen[r - 1]!;
      const W = masstab(sp, q);
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
      }
    }
    if (seite === 'vorn') kastenKappe(v, ziele, hoehe, spitze, schlitz, setze);
  }
  return rand ? { ziele, hoehe, rand: { wachstum: rand.wachstum, nachfrage: rand.nachfrage.length, vorlagen: ringQNeu.slice(), punkte: rand.punkte } } : { ziele, hoehe };
}

/**
 * Kastenfront (Tiger, Bild 9): Liegt Ring 0 praktisch in der Frontebene (Vorschub gegenüber der Spitze < 6 % seiner Höhe),
 * fächern die Sprossen dort und die Kappe wäre ein winziges Feld an der Spitze; Lippe, Nase und Tasche hätten keinen Platz.
 * Dann wird die Kappe ein ebenes Gitter in Ring 0: Quadratring r ist Ring 0, um r/(c/2) zum Frontpunkt C hin verkleinert.
 * C liegt auf der Frontlinie in der Höhe der Lippe von Ring 0 (mit Schlitz; die Lippe geht dann als Mittelzeile durch die
 * Spitze, `unterSpitze` 0) oder in der Ringmitte. Spitzige Schnauzen (Rex, Kugel) bleiben unberührt.
 */
function kastenKappe(v: Roehre, ziele: Float64Array, hoehe: Float64Array, spitze: V2, schlitz: SchlitzLage | undefined, setze: (p: number, x: number, y: number, z: number, hv: number) => void): void {
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
  if (!(Math.abs(cx - spitze.x) < 0.06 * H0)) return;
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
      const beruehrPunkt = !maulRing && beruehrt.has(i * N + j);
      if (beruehrPunkt) {
        const pz = v.ringPunkt(i, j);
        const B = breiteSoll(breiten, ziele[3 * pz]!, ziele[3 * pz + 1]!, ziele[3 * pz + 2]!);
        f = B > 1e-9 ? Math.min(1, Math.abs(ziele[3 * pz + 2]!) / B) : 0;
      }
      if (f < 1 - BREITE_SCHWELLE && !(beruehrPunkt && f > 0)) continue;
      const p = v.ringPunkt(i, j);
      if (!(breiten.top(ziele[3 * p]!) > 0) || !(breiten.front(ziele[3 * p + 1]!) > 0)) continue;
      zeile[j] = beruehrPunkt ? 0 : f;
      fein.push(p, v.ringPunkt(i, N - j));
      vorzeichen.push(1, -1);
      faktor.push(f, f);
      const g = beruehrPunkt ? (opt.randGewicht ?? RAND_GEWICHT) : 1;
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
      const rechts = feinKette(u, k, v.ringPunkt(i, j), v.ringPunkt(i + 1, j));
      const links = feinKette(u, k, v.ringPunkt(i, N - j), v.ringPunkt(i + 1, N - j));
      for (let q = 1; q + 1 < rechts.length; q++) {
        fein.push(rechts[q]!);
        vorzeichen.push(1);
        faktor.push(f0 + ((f1 - f0) * q) / (rechts.length - 1));
        gewicht.push(1);
      }
      for (let q = 1; q + 1 < links.length; q++) {
        fein.push(links[q]!);
        vorzeichen.push(-1);
        faktor.push(f0 + ((f1 - f0) * q) / (links.length - 1));
        gewicht.push(1);
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
  const qs = querschnitteFuer(sprossen, dok, breiten, N, opt);
  // Freie Kantenlinien (M3 Punkt 2): gezeichnete Linie mit Härte je Knoten → Falte auf der nächsten Kantenschleife
  if (dok.kanten?.length && opt.eckenSchaerfe > 0) {
    kantenFalten(
      v,
      sprossen,
      qs,
      breiten,
      dok.kanten.map((ka) => kanteAbtasten(ka, dok.skalierung)),
      opt.eckenSchaerfe,
    );
  }
  // Längsfalten: Ecke im Querschnitt (Front-Lappen oder Spant, Härte je Knoten) → Kante Ring i → i+1 am Ringpunkt der Ecke
  if (!opt.querschnitt) return;
  for (let i = 0; i + 1 < R; i++) {
    const q = qs[i]!;
    q.haerte.forEach((h, kn) => {
      if (h <= 0) return;
      const j = q.knoten[kn];
      if (j === undefined || j <= 0 || j >= N / 2) return;
      const schaerfe = h >= 1 ? opt.eckenSchaerfe : 3 * h;
      for (const jj of [j, N - j]) {
        const e = kanteZwischen(k, v.ringPunkt(i, jj), v.ringPunkt(i + 1, jj));
        if (e >= 0) k.eSchaerfe[e] = Math.max(k.eSchaerfe[e]!, schaerfe);
      }
    });
  }
}

export function ableiten(dok: Dokument, optionen: Partial<AbleitOptionen> = {}): Ableitung {
  const opt = { ...ABLEIT_STANDARD, ...optionen };
  const t0 = jetzt();
  const l = kernLeiter(dok);
  const t1 = jetzt();
  const breiten = silhouettenBreite(dok);
  const t2 = jetzt();
  const vorlage = roehre(opt.ringe, opt.ring);
  const st = stationenWaehlen(l, opt, dok);
  faltenSetzen(vorlage, st, l, dok, breiten, opt);
  const { ziele, hoehe, rand } = zieleBerechnen(vorlage, l, st, breiten, dok, opt);
  const abl = fertigstellen({ opt, vorlage, kaefig: vorlage.kaefig, ziele, hoehe, l, st, breiten, dok, zeiten: { t0, t1, t2 }, ...(rand ? { randVorlagen: rand.vorlagen, randPunkte: rand.punkte } : {}) });
  return rand ? { ...abl, rand: { wachstum: rand.wachstum, nachfrage: rand.nachfrage } } : abl;
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
  zeiten: { t0: number; t1: number; t2: number };
};

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
  const breite = breitenSchleife(vorlage, l, st, breiten, dok, opt, ziele, u, k, e.haut, e.maulBau, e.randVorlagen, e.randPunkte);
  if (opt.nahtGewicht > 0) {
    const bedingungen: Bedingung[] = [];
    for (let i = 0; i < k.n; i++) bedingungen.push({ zeile: i, gewicht: e.zielGewicht ? e.zielGewicht[i]! : 1 });
    for (let q = 0; q < nahtFein.length; q++) bedingungen.push({ zeile: nahtFein[q]!, gewicht: opt.nahtGewicht });
    if (breite) for (let q = 0; q < breite.fein.length; q++) bedingungen.push({ zeile: breite.fein[q]!, gewicht: opt.breiteGewicht * (breite.gewicht?.[q] ?? 1) });
    nahtLoeser = ausgleichsLoeser(u.grenze, k.n, bedingungen, opt.glaettung > 0 ? { kaefig: k, gewicht: opt.glaettung } : undefined, glaettemassFuer(u, k, opt, vorlage.R * vorlage.N));
    xyz = kaefigAusgleich(nahtLoeser, ausgleichsZiele(k.n, ziele, umriss, nahtFein, anteil, breite, breiten, fein, opt.fuehrend));
    fein = anwenden3(u.grenze, xyz);
    // Breitenziele an den tatsächlichen Grenzlagen nachrechnen (geneigte Ringe), zwei Durchgänge
    for (let durchgang = 0; breite && durchgang < BREITE_DURCHGAENGE; durchgang++) {
      xyz = kaefigAusgleich(nahtLoeser, ausgleichsZiele(k.n, ziele, umriss, nahtFein, anteil, breite, breiten, fein, opt.fuehrend));
      fein = anwenden3(u.grenze, xyz);
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
    zeiten: { leiter: t1 - t0, breiten: t2 - t1, matrix: t3 - t2, loeser: t4 - t3, ziele: t5 - t4, gesamt: t5 - t0 },
  };
}

/**
 * Glättungsmaß der Ableitung (S2): Laplace-Zeilen der Stufe 2 in Käfigpunkten, Gewicht `fair`, an den Kappen (Käfigpunkte
 * ab `kappeAb`) × `fairKappe`; `fair < 0` = dünner Löser ohne Glättung; ohne `fair` undefined (dichter Weg).
 */
export function glaettemassFuer(u: Unterteilung, k: Kaefig, opt: Pick<AbleitOptionen, 'fair' | 'fairBezug' | 'fairKappe'>, kappeAb = k.n): Glaettemass | undefined {
  const g = opt.fair ?? 0;
  if (g === 0) return undefined;
  const s = Math.min(2, u.stufen.length);
  let M = u.stufen[0]!.matrix;
  for (let i = 1; i < s; i++) M = multiplizieren(u.stufen[i]!.matrix, M);
  const zeilen = g > 0 ? glaettungsZeilen(u.stufen[s - 1]!.kaefig, M, k.n, g, opt.fairKappe && opt.fairKappe !== 1 ? { ab: kappeAb, faktor: opt.fairKappe } : undefined) : [];
  return { zeilen, nachbarn: kaefigNachbarlisten(k), bezug: opt.fairBezug ?? 0 };
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
  const st: Stationen = { ringe: abl.stationen, kappen: abl.kappenStationen, ecken: abl.ecken, reifen: abl.reifen, spitzen: abl.spitzen, gefroren: abl.gefroren };
  const breiten = silhouettenBreite(dokNeu);
  const { ziele, hoehe } = zieleBerechnen(v, l, st, breiten, dokNeu, abl.opt);
  const t2 = jetzt();
  const umrissNeu = umrissDicht(dokNeu);
  const anteilNeu = abl.naht.loeser ? nahtAnteile(Array.from(abl.naht.fein), v.kaefig.n, ziele, umrissNeu) : abl.naht.anteil;
  let xyz = abl.naht.loeser ? kaefigAusgleich(abl.naht.loeser, ausgleichsZiele(v.kaefig.n, ziele, umrissNeu, abl.naht.fein, anteilNeu, abl.breite, breiten, abl.fein, abl.opt.fuehrend)) : kaefigDurchZiele(abl.loeser, ziele);
  let fein = anwenden3(abl.unterteilung.grenze, xyz);
  if (abl.naht.loeser && abl.breite) {
    xyz = kaefigAusgleich(abl.naht.loeser, ausgleichsZiele(v.kaefig.n, ziele, umrissNeu, abl.naht.fein, anteilNeu, abl.breite, breiten, fein, abl.opt.fuehrend));
    fein = anwenden3(abl.unterteilung.grenze, xyz);
  }
  const t3 = jetzt();
  const t4 = jetzt();
  return { ...abl, ziele, hoehe, kaefig: { ...abl.kaefig, xyz }, fein, breiten, altLeiter: l, dokAlt: dokNeu, naht: { ...abl.naht, anteil: anteilNeu }, zugZeit: { leiter: t1 - t0, ziele: t2 - t1, loeser: t3 - t2, matrix: t4 - t3 } };
}

/** Alter Name des Zugs am Seitenumriss. */
export const seiteZiehen = ziehen;
