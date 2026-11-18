// Plan „Liniennetz, Zielform, Käfig“ (16.10.), S4 „Teile erkennen“ (nur Anzeige). Florian (16.10.): „Man erkennt an den 3
// Shapes genau, welche Wirbelsäulen gebraucht werden. Sobald ein Vektorshape aus einer Ansicht einen Bauch bekommt, muss
// die Wirbelsäule in diese Richtung automatisch entstehen!“ Gelesen wird aus den Mittelachsen aller drei Ansichten
// (`skelett.ts`) und der Sichthülle (`huelle.ts`, S0):
// - Rumpf = die dickste Stelle der Seite. Äste der Seite sind Gabeln des Skeletts (Flossen; endet der Rumpf in einer
//   Gabel wie beim Fischschwanz, sind beide Lappen Äste), Knicke der Rumpfachse (ein Hals auf dem Körper) und gerade dünne
//   Stiele, die beidseitig aus einer Kehle wachsen (Vase, Augenstiele, Schwanz mit Taille).
// - Ob ein Ast der Seite auf der Mittelebene liegt oder ein seitliches Paar ist, sagt die Hülle: Säulen durch z = 0 →
//   Mitte, nur daneben → Paar (Beine, zwei Hälse, Augenstiele, Flügel über dem Rücken).
// - Seitliche Paare, die die Seite nicht zeigt (Flügel, Brustflossen, Spitzen hinten), kommen aus den Ästen von Front und
//   Top; was in mehreren Ansichten auftaucht, ist dasselbe Teil.
// - Ein Ast zählt nur als Teil, wenn er eine echte Ausbuchtung ist (Teilgrenzen liegen in Kehlen): deutlich dünner als der
//   Rumpf, mindestens so weit herausragend wie dick und mit einer Kehle (Mulde unter der konvexen Hülle) am Ansatz — eine
//   Ecke eines runden oder kantigen Körpers ist keiner.
// - Hysterese 15 %: Ein Teil, das es vorher gab, bleibt bis 0,85 seiner Schwellen, ein neues braucht 1,15. Die Sehnen sind
//   als Kurvenparameter eingefroren (wie die Enden der Wirbelsäule, `enden.ts`), solange die Knotenzahl der Zeichnung gleich
//   bleibt — sie wandern mit der Kurve, statt mit dem Raster zu springen.
// DOM-frei.
import type { V2 } from '../../bezier';
import type { Dokument, EndenAnker, GefrorenerTeilbaum, GefrorenesTeil } from '../../dokument';
import type { Profil } from '../../profil';
import { profilAnker, profilPunkt } from './enden';
import { type Huelle, type Intervalle, huelle, saeulenArt } from './huelle';
import { type SkelettWeg, seitlicheAeste, skelett } from './skelett';
import { beruehrpunkte, richtung, winkelZwischen } from './zerlegung';

/** Rasterzellen je Ansicht über die größere Ausdehnung */
export const TEIL_ZELLEN = 200;
/**
 * Kandidaten: Äste ab diesem Anteil des Abzweig-Radius. Niedrig, damit allein das Maß mit seiner Hysterese entscheidet —
 * bei 0,25 pendelten kleine Wülste (Rex-Front) um die Schwelle des Skeletts und waren jeden zweiten Zugschritt weg.
 */
const KANDIDAT_ANTEIL = 0.1;
/** Gabeln am Ende (Fischschwanz) zählen nur mit deutlichem Überstand (wie früher im Skelett), nicht jede kleine Nebenspur */
const GABEL_ANTEIL = 0.45;
/** Hysterese: ein vorhandenes Teil bleibt bis 1 − HYSTERESE seiner Schwellen, ein neues braucht 1 + HYSTERESE */
export const HYSTERESE = 0.15;

export type BlattName = 'seite' | 'front' | 'top';
export type TeilArt = 'rumpf' | 'mitte' | 'paar';
export type Richtung = 'oben' | 'unten' | 'vorn' | 'hinten' | 'seitlich';
export type V3 = [number, number, number];

/** Woher ein Ast der Ansicht kommt */
export type AstQuelle = 'gabel' | 'knick' | 'stiel' | 'seitlich';

/** Eine Ausbuchtung einer Ansicht (Blattkoordinaten): Achse ab der Sehne bis zur Spitze, Sehne, Umriss und Maße. */
export type Kandidat = {
  blatt: BlattName;
  quelle: AstQuelle;
  /** Achse ab der Sehne bis zur Spitze */
  achse: SkelettWeg;
  /** Abzweig auf der Rumpfachse (Anfang der Wirbelsäule des Teils) */
  abzweig: V2;
  schnitt: [V2, V2];
  /** geschlossener Umriss des Asts: Randstück + Sehne */
  umriss: V2[];
  /** Erfüllung der Schwellen (≥ 1 = Teil): das kleinste Verhältnis aller Bedingungen */
  mass: number;
  /** angenommen (mit der Schwelle seiner Hysterese) */
  teil: boolean;
  /** eingefrorenes Teil, das er fortsetzt */
  vorher?: GefrorenesTeil;
  /** eingefrorene Sehne als Kurvenparameter (wird unverändert weitergegeben, keine Drift durch neues Projizieren) */
  anker?: [EndenAnker, EndenAnker];
  /** wie gut er das eingefrorene Teil trifft (< 1, kleiner = näher) — für die Vergabe der Kennungen */
  vorherAbstand?: number;
  /** Messwerte für Bericht und Abstimmung */
  werte: Record<string, number>;
};

export type Teil = {
  id: string;
  art: TeilArt;
  /** Elternteil (Index in `teile`), −1 beim Rumpf */
  eltern: number;
  richtung: Richtung;
  /** Wirbelsäule (Kern-Einheiten); bei Paaren die rechte Seite (z ≥ 0), die linke ist ihr Spiegelbild */
  achse: V3[];
  /** Knoten der Wirbelsäule für die Anzeige */
  knoten: V3[];
  /** Ansichten, in denen das Teil als eigene Ausbuchtung erkannt wurde */
  erkannt: Partial<Record<BlattName, { schnitt: [V2, V2]; umriss: V2[]; quelle: AstQuelle; mass: number }>>;
  /** Erfüllung der Schwellen (bestes Maß der Ansichten) */
  mass: number;
  /** Anteil seitlicher Hüllensäulen längs der Seitenachse (Äste der Seite) */
  seitlich?: number;
};

/** Eingefrorenes Teil und eingefrorener Teilbaum: im Dokument (`GefroreneStationen.teile`). */
export type { GefrorenerTeilbaum, GefrorenesTeil };

export type Teilbaum = {
  /** Teil 0 = Rumpf */
  teile: Teil[];
  /** alle Kandidaten der drei Ansichten (auch verworfene, mit Maß) */
  kandidaten: Kandidat[];
  /** Rumpfachse der Seite und Umriss des Rumpfs nach den Schnitten (Blattkoordinaten) */
  rumpf: { achse: SkelettWeg; umriss: V2[] };
  gefroren: GefrorenerTeilbaum;
  zeit: number;
};

const sub = (a: V2, b: V2): V2 => ({ x: a.x - b.x, y: a.y - b.y });
const laenge = (a: V2) => Math.hypot(a.x, a.y);
const abstand = (a: V2, b: V2) => Math.hypot(a.x - b.x, a.y - b.y);

function wegLaenge(w: SkelettWeg, i0 = 0, i1 = w.punkte.length - 1): number {
  let l = 0;
  for (let i = i0; i < i1; i++) l += abstand(w.punkte[i]!, w.punkte[i + 1]!);
  return l;
}

function median(xs: readonly number[]): number {
  if (!xs.length) return 0;
  const s = xs.slice().sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)]!;
}

/** Verhältnis „größer ist besser“ (wert / schwelle) bzw. „kleiner ist besser“ (schwelle / wert), begrenzt. */
const groesser = (wert: number, schwelle: number) => Math.min(9, Math.max(0, wert) / schwelle);
const kleiner = (wert: number, schwelle: number) => Math.min(9, schwelle / Math.max(wert, 1e-9));

function innen(poly: readonly V2[], q: V2): boolean {
  let drin = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!;
    const b = poly[j]!;
    if (a.y > q.y !== b.y > q.y && q.x < ((b.x - a.x) * (q.y - a.y)) / (b.y - a.y || 1e-12) + a.x) drin = !drin;
  }
  return drin;
}

// ---------- Mulden unter der konvexen Hülle ----------

/**
 * Tiefe jedes Umrisspunkts unter der konvexen Hülle (0 = auf der Hülle): Kehlen, Kerben, Mulden. Eine Ecke eines
 * konvexen Körpers hat überall 0 — sie ist keine Ausbuchtung.
 */
export function muldenTiefe(poly: readonly V2[]): Float64Array {
  const n = poly.length;
  const tiefe = new Float64Array(n);
  if (n < 4) return tiefe;
  const idx = Array.from({ length: n }, (_, i) => i).sort((a, b) => poly[a]!.x - poly[b]!.x || poly[a]!.y - poly[b]!.y);
  const kreuz = (o: number, a: number, b: number) => (poly[a]!.x - poly[o]!.x) * (poly[b]!.y - poly[o]!.y) - (poly[a]!.y - poly[o]!.y) * (poly[b]!.x - poly[o]!.x);
  const unten: number[] = [];
  for (const i of idx) {
    while (unten.length >= 2 && kreuz(unten[unten.length - 2]!, unten[unten.length - 1]!, i) <= 0) unten.pop();
    unten.push(i);
  }
  const oben: number[] = [];
  for (let k = idx.length - 1; k >= 0; k--) {
    const i = idx[k]!;
    while (oben.length >= 2 && kreuz(oben[oben.length - 2]!, oben[oben.length - 1]!, i) <= 0) oben.pop();
    oben.push(i);
  }
  const huelleIdx = new Set([...unten.slice(0, -1), ...oben.slice(0, -1)]);
  // Umlauf: zwischen zwei aufeinanderfolgenden Hüllenpunkten liegt eine Mulde; Tiefe = Abstand zur Hüllenkante
  const start = [...huelleIdx][0]!;
  let a = start;
  for (let s = 1; s <= n; s++) {
    const i = (start + s) % n;
    if (!huelleIdx.has(i)) continue;
    const pa = poly[a]!;
    const d = sub(poly[i]!, pa);
    const l = laenge(d) || 1;
    for (let k = (a + 1) % n; k !== i; k = (k + 1) % n) {
      const q = sub(poly[k]!, pa);
      tiefe[k] = Math.abs(q.x * d.y - q.y * d.x) / l;
    }
    a = i;
  }
  return tiefe;
}

/** Größte Muldentiefe im Umkreis (Bogenlänge ±w) des Umrisspunkts, der q am nächsten liegt. */
function kehleBei(poly: readonly V2[], tiefe: Float64Array, q: V2, w: number): number {
  const n = poly.length;
  let best = 0;
  for (let i = 1; i < n; i++) if (abstand(poly[i]!, q) < abstand(poly[best]!, q)) best = i;
  let m = tiefe[best]!;
  for (const s of [1, -1]) {
    let l = 0;
    for (let k = 1; k < n && l < w; k++) {
      const i = (best + s * k + n) % n;
      const j = (best + s * (k - 1) + n) % n;
      l += abstand(poly[i]!, poly[j]!);
      m = Math.max(m, tiefe[i]!);
    }
  }
  return m;
}

// ---------- Schnitt eines Asts ----------

/** Nächste Stelle des Umrisses zu q: Kante i → i+1 und Parameter f. */
function naechsteStelle(poly: readonly V2[], q: V2): { i: number; f: number; p: V2 } {
  let best = { i: 0, f: 0, p: poly[0]!, d: Infinity };
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % n]!;
    const ab = sub(b, a);
    const f = Math.max(0, Math.min(1, ((q.x - a.x) * ab.x + (q.y - a.y) * ab.y) / (ab.x * ab.x + ab.y * ab.y || 1)));
    const p = { x: a.x + ab.x * f, y: a.y + ab.y * f };
    const d = abstand(p, q);
    if (d < best.d) best = { i, f, p, d };
  }
  return best;
}

/**
 * Umriss an zwei Stellen teilen (genau an den Punkten, nicht am nächsten Rasterpunkt): das Stück mit der Spitze ist der
 * Ast (plus Sehne), der Rest bleibt beim Rumpf.
 */
export function teilenBei(poly: readonly V2[], A: V2, B: V2, spitze: V2): { schnitt: [V2, V2]; ast: V2[]; rest: V2[] } | null {
  const sa = naechsteStelle(poly, A);
  const sb = naechsteStelle(poly, B);
  if (sa.i === sb.i && Math.abs(sa.f - sb.f) < 1e-9) return null;
  const n = poly.length;
  // Stück von sa vorwärts bis sb (zyklisch) und umgekehrt, je mit den genauen Endpunkten
  const stueck = (von: typeof sa, bis: typeof sb): V2[] => {
    const out: V2[] = [von.p];
    if (von.i === bis.i && bis.f >= von.f) {
      out.push(bis.p);
      return out;
    }
    for (let k = (von.i + 1) % n; ; k = (k + 1) % n) {
      out.push(poly[k]!);
      if (k === bis.i) break;
    }
    out.push(bis.p);
    return out;
  };
  const a = stueck(sa, sb);
  const b = stueck(sb, sa);
  const naheA = Math.min(...a.map((q) => abstand(q, spitze)));
  const naheB = Math.min(...b.map((q) => abstand(q, spitze)));
  return naheA <= naheB ? { schnitt: [sa.p, sb.p], ast: a, rest: b } : { schnitt: [sb.p, sa.p], ast: b, rest: a };
}

/** Sehne an der Stelle k der Achse (Berührpunkte des Mittelachsen-Kreises); mit `fest` gilt die eingefrorene. */
function teilen(poly: readonly V2[], achse: SkelettWeg, k: number, fest?: [V2, V2]): { schnitt: [V2, V2]; ast: V2[]; rest: V2[] } | null {
  let bp: [V2, V2] | null = fest ?? null;
  if (!bp) {
    const p0 = achse.punkte[0]!;
    const d = richtung(achse, k, 2 * achse.radius[k]!, 1);
    bp = beruehrpunkte(poly, achse.punkte[k]!, achse.radius[k]!, d.x || d.y ? d : sub(achse.punkte[k]!, p0));
  }
  if (!bp) return null;
  return teilenBei(poly, bp[0], bp[1], achse.punkte[achse.punkte.length - 1]!);
}

/** Wie weit ein Umrissstück über die Sehne A–B hinausragt (größter Abstand zur Geraden) und der Punkt, der das tut. */
function ueberSehne(stueck: readonly V2[], A: V2, B: V2): { hoehe: number; fern: V2 } {
  const d = sub(B, A);
  const l = laenge(d) || 1;
  let hoehe = 0;
  let fern = A;
  for (const p of stueck) {
    const q = sub(p, A);
    const h = Math.abs(q.x * d.y - q.y * d.x) / l;
    if (h > hoehe) {
      hoehe = h;
      fern = p;
    }
  }
  return { hoehe, fern };
}

/** Index der ersten Achsstelle außerhalb des Kreises (Mitte m, Radius r). */
function ausDemKreis(achse: SkelettWeg, m: V2, r: number): number {
  let k = 1;
  while (k < achse.punkte.length - 1 && abstand(achse.punkte[k]!, m) < r) k++;
  return k;
}

/**
 * Stabile Spitze: Ein flaches oder eckiges Ende gabelt die Mittelachse in seine Ecken, und welche Ecke der Weg nimmt,
 * entscheidet das Raster (der Vasenhals sprang beim Ziehen zwischen beiden Randecken). An der Gabel ist der Kreis so groß
 * wie im Teil davor, in den Ecken schrumpft er. Deshalb das letzte Stück mit weniger als 0,9 des mittleren Radius (höchstens
 * 1,5 Radien lang) abschneiden und die Achse in der Richtung der zwei Radien davor gerade bis zum Umriss verlängern. Spitze
 * Enden verlieren dabei nur ihr letztes Stück und enden wieder an der Spitze.
 */
function spitzeStabil(w: SkelettWeg, poly: readonly V2[]): SkelettWeg {
  const n = w.punkte.length;
  if (n < 3) return w;
  const rRef = median(w.radius);
  let j = n - 1;
  let bogen = 0;
  while (j > 1 && w.radius[j]! < 0.9 * rRef && bogen + abstand(w.punkte[j]!, w.punkte[j - 1]!) < 1.5 * rRef) {
    bogen += abstand(w.punkte[j]!, w.punkte[j - 1]!);
    j--;
  }
  const p = w.punkte[j]!;
  let i = j;
  while (i > 0 && abstand(w.punkte[i]!, p) < 2 * rRef) i--;
  const d = sub(p, w.punkte[i]!);
  const l = laenge(d);
  if (l < 1e-9) return w;
  const u = { x: d.x / l, y: d.y / l };
  // Strahl p + t·u gegen den Umriss: kleinstes t > 0
  let tMin = Infinity;
  for (let k = 0; k < poly.length; k++) {
    const a = poly[k]!;
    const b = poly[(k + 1) % poly.length]!;
    const e = sub(b, a);
    const nenner = u.x * e.y - u.y * e.x;
    if (Math.abs(nenner) < 1e-15) continue;
    const ap = sub(a, p);
    const t = (ap.x * e.y - ap.y * e.x) / nenner;
    const f = (ap.x * u.y - ap.y * u.x) / nenner;
    if (t > 1e-9 && f >= 0 && f <= 1) tMin = Math.min(tMin, t);
  }
  if (!Number.isFinite(tMin)) return w;
  return { punkte: [...w.punkte.slice(0, j + 1), { x: p.x + u.x * tMin, y: p.y + u.y * tMin }], radius: [...w.radius.slice(0, j + 1), 0] };
}

function teilWeg(w: SkelettWeg, idx: readonly number[]): SkelettWeg {
  return { punkte: idx.map((t) => w.punkte[t]!), radius: idx.map((t) => w.radius[t]!) };
}

// ---------- Schwellen und Hysterese ----------

/** Schwellen (Faktor 1; die Hysterese multipliziert) */
const S = {
  /** Ast dünner als dieser Anteil des Rumpfradius (größter Radius der Rumpfachse der Ansicht) */
  duenn: 0.6,
  /** Ast ragt mindestens so weit (in eigenen Radien) aus dem Kreis am Abzweig heraus */
  ueber: 1,
  /** Knick und Stiel: dünner Teil mindestens so lang (in eigenen Radien) … */
  lang: 2.5,
  /** … und um so viel Grad abgeknickt (sonst: beidseitige Kehle = Stiel) */
  knick: 50,
  /** Kehle am Ansatz: Muldentiefe / Astradius (mindestens eine Seite; Stiel: beide) */
  kehle: 0.35,
};

/** Was ein Kandidat aus dem eingefrorenen Baum mitbringt: Faktor seiner Schwelle und die eingefrorene Sehne. */
type Vorgabe = { faktor: number; fest?: [V2, V2]; anker?: [EndenAnker, EndenAnker]; vorher?: GefrorenesTeil; abstand?: number };
/** Vorgabe je Kandidat aus dem eingefrorenen Baum: über die Sehnenmitte (stabil) oder die Spitze (kann springen) gefunden */
type VorgabeFn = (blatt: BlattName, spitze: V2, laenge: number, schnitt?: [V2, V2]) => Vorgabe;

// ---------- Seite: Rumpf, Gabeln, Knicke, Stiele ----------

type SeiteGelesen = { rumpf: SkelettWeg; rumpfUmriss: V2[]; kandidaten: Kandidat[] };

function seiteLesen(poly: readonly V2[], zellen: number, vorgabe: VorgabeFn): SeiteGelesen {
  const sk = skelett(poly, zellen, undefined, KANDIDAT_ANTEIL, 'lue-wang');
  const haupt = sk.aeste[0];
  if (!haupt || haupt.punkte.length < 3) return { rumpf: haupt ?? { punkte: [], radius: [] }, rumpfUmriss: poly.slice(), kandidaten: [] };
  const h = sk.raster.h;
  const tiefe = muldenTiefe(poly);
  const rMax = Math.max(...haupt.radius);
  const iMax = haupt.radius.indexOf(rMax);
  const N = haupt.punkte.length;
  const kandidaten: Kandidat[] = [];
  let von = 0;
  let bis = N - 1;
  let rest = poly.slice();
  const gabeln = sk.aeste.slice(1).filter((a) => a.eltern === 0);
  const deutlich = gabeln.filter((a) => a.ueberstand >= GABEL_ANTEIL * haupt.radius[a.abzweig]!);
  const kehlen = (t: { schnitt: [V2, V2] }, rAst: number) => [kehleBei(poly, tiefe, t.schnitt[0], Math.max(rAst, 2 * h)) / rAst, kehleBei(poly, tiefe, t.schnitt[1], Math.max(rAst, 2 * h)) / rAst] as const;
  const annehmen = (k: Omit<Kandidat, 'teil'>, v: Vorgabe): Kandidat => {
    const c: Kandidat = { ...k, teil: k.mass >= v.faktor, ...(v.vorher ? { vorher: v.vorher, vorherAbstand: v.abstand ?? 1 } : {}), ...(v.anker ? { anker: v.anker } : {}) };
    kandidaten.push(c);
    return c;
  };

  // 1. Gabel am Ende (Fischschwanz): die äußerste Gabel zu einem Ende, deren Fortsetzung bis zum Ende ebenso dünn und
  //    lang ist wie der Ast — dann endet der Rumpf an der Gabel, beide Lappen sind Äste.
  const gabelEnde = new Map<1 | -1, { j: number; rest: SkelettWeg; ast: (typeof gabeln)[number] }>();
  for (const s of [1, -1] as const) {
    const aussen = deutlich.filter((a) => (s > 0 ? a.abzweig > iMax : a.abzweig < iMax)).sort((a, b) => s * (b.abzweig - a.abzweig))[0];
    if (!aussen) continue;
    const j = aussen.abzweig;
    const w = teilWeg(haupt, s > 0 ? Array.from({ length: N - j }, (_, t) => j + t) : Array.from({ length: j + 1 }, (_, t) => j - t));
    const rR = median(w.radius.slice(1));
    const rA = median(aussen.radius.slice(1));
    const lR = wegLaenge(w);
    const lA = wegLaenge(aussen);
    const winkel = winkelZwischen(richtung(w, 0, 3 * rR, 1), richtung(aussen, 0, 3 * rA, 1));
    if (rR < S.duenn * rMax && rA < S.duenn * rMax && lR > S.lang * rR && lA > S.lang * rA && rR / rA < 2.5 && rA / rR < 2.5 && lR / lA < 3 && lA / lR < 3 && winkel > 30) {
      gabelEnde.set(s, { j, rest: w, ast: aussen });
      if (s > 0) bis = j;
      else von = j;
    }
  }

  // 2. Knick oder Stiel je Ende (ohne Gabel am Ende): der dünne Teil hinter dem halben Dickensprung
  for (const s of [1, -1] as const) {
    if (gabelEnde.has(s)) continue;
    const ende = s > 0 ? N - 1 : 0;
    if (ende === iMax) continue;
    const idx = s > 0 ? Array.from({ length: N - iMax }, (_, t) => iMax + t) : Array.from({ length: iMax + 1 }, (_, t) => iMax - t);
    const w = teilWeg(haupt, idx);
    // Dicke des dünnen Teils: Median der äußeren Hälfte der Achse (nach Länge)
    const L = wegLaenge(w);
    let l = 0;
    let halb = w.punkte.length - 1;
    for (let t = 0; t + 1 < w.punkte.length; t++) {
      l += abstand(w.punkte[t]!, w.punkte[t + 1]!);
      if (l >= L / 2) {
        halb = t + 1;
        break;
      }
    }
    const rAst = median(w.radius.slice(halb));
    if (!(rAst > 0)) continue;
    // Schnitt beim halben Dickensprung
    let ab = 0;
    while (ab < w.punkte.length - 1 && w.radius[ab]! >= 0.5 * (rMax + rAst)) ab++;
    if (w.punkte.length - ab < 3) continue;
    const achse = spitzeStabil({ punkte: w.punkte.slice(ab), radius: w.radius.slice(ab) }, poly);
    const spitze = achse.punkte[achse.punkte.length - 1]!;
    const t0 = teilen(rest, achse, 0);
    const v = vorgabe('seite', spitze, wegLaenge(achse), t0?.schnitt);
    const t = v.fest ? teilen(rest, achse, 0, v.fest) : t0;
    if (!t) continue;
    const lAst = wegLaenge(achse);
    const inRumpf = sub(haupt.punkte[s > 0 ? 0 : N - 1]!, achse.punkte[0]!);
    const inAst = richtung(achse, 0, 3 * rAst, 1);
    const abweichung = laenge(inRumpf) > 1e-9 && laenge(inAst) > 1e-9 ? 180 - winkelZwischen(inRumpf, inAst) : 0;
    const [kA, kB] = kehlen(t, rAst);
    const duenn = kleiner(rAst / rMax, S.duenn);
    const lang = groesser(lAst / rAst, S.lang);
    // Knick (abgewinkelt, eine Kehle genügt) oder Stiel (gerade, beidseitig eine Kehle)
    const alsKnick = Math.min(duenn, lang, groesser(abweichung, S.knick), groesser(Math.max(kA, kB), S.kehle));
    const alsStiel = Math.min(duenn, lang, groesser(Math.min(kA, kB), S.kehle));
    const c = annehmen(
      { blatt: 'seite', quelle: alsKnick >= alsStiel ? 'knick' : 'stiel', achse, abzweig: haupt.punkte[idx[ab]!]!, schnitt: t.schnitt, umriss: t.ast, mass: Math.max(alsKnick, alsStiel), werte: { rAst, rMax, duenn: rAst / rMax, lang: lAst / rAst, abweichung, kehleA: kA, kehleB: kB } },
      v,
    );
    if (c.teil) {
      rest = t.rest;
      if (s > 0) bis = Math.min(bis, idx[ab]!);
      else von = Math.max(von, idx[ab]!);
    }
  }

  // 3. Gabeln am Rumpf (mit den Lappen einer Gabel am Ende)
  const gabelKandidat = (a: SkelettWeg & { ueberstand: number }, j: number) => {
    const rJ = haupt.radius[j]!;
    const k = ausDemKreis(a, a.punkte[0]!, rJ);
    if (a.punkte.length - k < 2) return;
    const achse = spitzeStabil({ punkte: a.punkte.slice(k), radius: a.radius.slice(k) }, poly);
    const spitze = achse.punkte[achse.punkte.length - 1]!;
    const t0 = teilen(rest, a, k);
    const v = vorgabe('seite', spitze, wegLaenge(a), t0?.schnitt);
    const t = v.fest ? teilen(rest, a, k, v.fest) : t0;
    if (!t) return;
    const rAst = Math.max(median(achse.radius), h);
    const [kA, kB] = kehlen(t, rAst);
    const heraus = wegLaenge(achse) / Math.max(a.radius[k]!, h);
    // Seitenast der Seite: Kehlen auf beiden Seiten des Ansatzes (Flossen, Beine, Hälse); eine Ecke an einer Stufe hat nur
    // eine (Kinnecke der Tiger-Kastenschnauze 2,7 / 0,24, Rückenflosse des Fischs 0,76 / 1,34)
    const mass = Math.min(kleiner(rAst / rMax, S.duenn), groesser(a.ueberstand / rAst, S.ueber), groesser(Math.min(kA, kB), S.kehle), groesser(a.ueberstand / (4 * h), 1));
    const c = annehmen({ blatt: 'seite', quelle: 'gabel', achse, abzweig: a.punkte[0]!, schnitt: t.schnitt, umriss: t.ast, mass, werte: { rAst, rJ, rMax, duenn: rAst / rMax, ueber: a.ueberstand / rAst, kehleA: kA, kehleB: kB, heraus } }, v);
    if (c.teil) rest = t.rest;
  };
  for (const [, g] of gabelEnde) {
    gabelKandidat({ ...g.rest, ueberstand: wegLaenge(g.rest) + g.rest.radius[g.rest.radius.length - 1]! - g.rest.radius[0]! }, g.j);
    gabelKandidat(g.ast, g.j);
  }
  for (const a of gabeln) {
    if ([...gabelEnde.values()].some((g) => g.ast === a)) continue;
    if (a.abzweig < von || a.abzweig > bis) continue;
    gabelKandidat(a, a.abzweig);
  }
  const rumpf = teilWeg(haupt, Array.from({ length: bis - von + 1 }, (_, t) => von + t));
  return { rumpf, rumpfUmriss: rest, kandidaten };
}

// ---------- Front und Top: seitliche Äste ----------

/**
 * Seitliche Äste einer gespiegelten Ansicht (Front: Achse x = 0, Top: Achse y = 0). Je Ast: Sehne, wo er den Kreis am
 * Abzweig verlässt, Dicke gegen den Rumpf der Ansicht (größter Radius auf der Achse), Überstand, Kehle am Ansatz.
 */
function seitlicheLesen(poly: readonly V2[], blatt: 'front' | 'top', zellen: number, vorgabe: VorgabeFn): { achse: SkelettWeg | null; kandidaten: Kandidat[] } {
  // Kandidaten ab 2 Zellen Überstand: Die Mindestgröße prüft das Maß (Überstand ≥ 4 Zellen) mit Hysterese — mit der festen
  // Grenze im Skelett war ein Wulst von gut 4 Zellen bei jedem dritten Zugschritt gar kein Kandidat
  const sk = seitlicheAeste(poly, zellen, blatt === 'front' ? 'x' : 'y', KANDIDAT_ANTEIL, 2);
  const achse = sk.aeste[0];
  if (!achse) return { achse: null, kandidaten: [] };
  const h = sk.raster.h;
  const tiefe = muldenTiefe(poly);
  const rMax = Math.max(...achse.radius);
  const kandidaten: Kandidat[] = [];
  for (const a of sk.aeste.slice(1)) {
    const rJ = a.radius[0]!;
    const k = ausDemKreis(a, a.punkte[0]!, rJ);
    if (a.punkte.length - k < 2) continue;
    const ast = spitzeStabil({ punkte: a.punkte.slice(k), radius: a.radius.slice(k) }, poly);
    const spitze = ast.punkte[ast.punkte.length - 1]!;
    const t0 = teilen(poly, a, k);
    const v = vorgabe(blatt, spitze, wegLaenge(a), t0?.schnitt);
    const t = v.fest ? teilen(poly, a, k, v.fest) : t0;
    if (!t) continue;
    const rAst = Math.max(median(ast.radius), h);
    const kA = kehleBei(poly, tiefe, t.schnitt[0], Math.max(rAst, 2 * h)) / rAst;
    const kB = kehleBei(poly, tiefe, t.schnitt[1], Math.max(rAst, 2 * h)) / rAst;
    const heraus = wegLaenge(ast) / Math.max(a.radius[k]!, h);
    const mass = Math.min(kleiner(rAst / rMax, S.duenn), groesser(a.ueberstand / rAst, S.ueber), groesser(Math.max(kA, kB), S.kehle), groesser(a.ueberstand / (4 * h), 1));
    kandidaten.push({ blatt, quelle: 'seitlich', achse: ast, abzweig: a.punkte[0]!, schnitt: t.schnitt, umriss: t.ast, mass, teil: mass >= v.faktor, ...(v.vorher ? { vorher: v.vorher, vorherAbstand: v.abstand ?? 1 } : {}), ...(v.anker ? { anker: v.anker } : {}), werte: { rAst, rJ, rMax, duenn: rAst / rMax, ueber: a.ueberstand / rAst, kehleA: kA, kehleB: kB, heraus } });
  }
  return { achse, kandidaten };
}

// ---------- Hülle: Mitte oder Paar, dritte Koordinate ----------

/** Anteil seitlicher Säulen längs der Achse eines Seitenasts (beides zählt halb). */
function seitlichAnteil(h: Huelle, achse: SkelettWeg): number {
  let n = 0;
  let s = 0;
  for (const p of achse.punkte) {
    const art = saeulenArt(h, p.x, p.y);
    if (art === 'leer') continue;
    n++;
    if (art === 'seitlich') s += 1;
    else if (art === 'beides') s += 0.5;
  }
  return n ? s / n : 0;
}

/** Mitte des seitlichen Stücks (z > 0) einer Intervallmenge; ohne seitliches Stück die Mitte der positiven Hälfte. */
function seitlicheMitte(iv: Intervalle, eps: number): number | null {
  const pos = iv.filter(([, hi]) => hi > eps);
  if (!pos.length) return null;
  const seitl = pos.filter(([lo]) => lo > eps);
  const [lo, hi] = (seitl.length ? seitl : pos)[0]!;
  return (Math.max(lo, 0) + hi) / 2;
}

/** Mitte einer Intervallmenge (vom kleinsten bis zum größten Wert). */
function mitteVon(iv: Intervalle): number | null {
  return iv.length ? (iv[0]![0] + iv[iv.length - 1]![1]) / 2 : null;
}

// ---------- Teilbaum ----------

/** Wirbelsäule in Knoten zerlegen: gleichmäßig nach Bogenlänge, etwa alle `schritt`, mindestens zwei Strecken. */
function knotenVon(achse: readonly V3[], schritt: number): V3[] {
  if (achse.length < 2) return achse.slice();
  const L: number[] = [0];
  for (let i = 1; i < achse.length; i++) L.push(L[i - 1]! + Math.hypot(achse[i]![0] - achse[i - 1]![0], achse[i]![1] - achse[i - 1]![1], achse[i]![2] - achse[i - 1]![2]));
  const gesamt = L[L.length - 1]!;
  const m = Math.max(2, Math.min(8, Math.round(gesamt / schritt)));
  const out: V3[] = [];
  let k = 0;
  for (let s = 0; s <= m; s++) {
    const t = (gesamt * s) / m;
    while (k + 1 < achse.length - 1 && L[k + 1]! < t) k++;
    const f = (t - L[k]!) / (L[k + 1]! - L[k]! || 1);
    const a = achse[k]!;
    const b = achse[k + 1]!;
    out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]);
  }
  return out;
}

/** Achse glätten (gleitendes Mittel über ±w Punkte, Enden fest): Rasterstufen weg. */
function glaetten(ps: readonly V2[], w = 3): V2[] {
  if (ps.length < 3) return ps.slice();
  return ps.map((p, i) => {
    if (i === 0 || i === ps.length - 1) return p;
    let sx = 0;
    let sy = 0;
    let n = 0;
    for (let k = Math.max(0, i - w); k <= Math.min(ps.length - 1, i + w); k++) {
      sx += ps[k]!.x;
      sy += ps[k]!.y;
      n++;
    }
    return { x: sx / n, y: sy / n };
  });
}

/**
 * Richtung eines Vektors (Anfang → Ende; Schnauze bei −x = vorn). Mit `alt` (eingefroren) bleibt sie, solange ihr Anteil
 * mindestens 1 − HYSTERESE des größten ist — bei 45° kippte die Bezeichnung sonst mit jedem Zug. Nur Koordinaten, die eine
 * erkennende Ansicht zeigt, gehen ein (`richtungAusUmriss`); die übrigen kämen aus der Mitte der Hülle.
 */
function richtungVon(achse: readonly V3[], alt?: Richtung): Richtung {
  const a = achse[0]!;
  const b = achse[achse.length - 1]!;
  const d: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const anteil: Record<Richtung, number> = { oben: Math.max(d[1], 0), unten: Math.max(-d[1], 0), vorn: Math.max(-d[0], 0), hinten: Math.max(d[0], 0), seitlich: Math.abs(d[2]) };
  let best: Richtung = 'seitlich';
  for (const r of ['oben', 'unten', 'vorn', 'hinten'] as const) if (anteil[r] > anteil[best]) best = r;
  return alt && anteil[alt] >= (1 - HYSTERESE) * anteil[best] ? alt : best;
}

/**
 * Richtung aus dem Umriss der Ansicht, die das Teil trägt (Seite, sonst Top, sonst Front — dieselbe, deren Sehne eingefroren
 * wird): von der Sehnenmitte zum Punkt, der am weitesten über die Sehne ragt (Seite: x, y; Front: z, y; Top: x, z).
 * Skelett-Ast und an der Sehne mitgenommenes Teil haben so dieselbe Richtung (über die Wirbelsäule kippte ein schräger
 * Wulst „oben“ ↔ „zur Seite“); gemittelt über mehrere Ansichten kippte sie, wenn ein Kandidat kam und ging (Ente-Flügel).
 */
function richtungAusUmriss(erkannt: Teil['erkannt'], alt?: Richtung): Richtung {
  const d: V3 = [0, 0, 0];
  const traeger = erkannt.seite ? 'seite' : erkannt.top ? 'top' : 'front';
  for (const blatt of [traeger] as const) {
    const e = erkannt[blatt];
    if (!e) continue;
    const [A, B] = e.schnitt;
    const { fern } = ueberSehne(e.umriss, A, B);
    const v = { x: fern.x - (A.x + B.x) / 2, y: fern.y - (A.y + B.y) / 2 };
    const l = Math.hypot(v.x, v.y) || 1;
    if (blatt === 'seite') {
      d[0] += v.x / l;
      d[1] += v.y / l;
    } else if (blatt === 'front') {
      d[2] += Math.abs(v.x) / l;
      d[1] += v.y / l;
    } else {
      d[0] += v.x / l;
      d[2] += Math.abs(v.y) / l;
    }
  }
  return richtungVon([[0, 0, 0], d], alt);
}

/** Ausdehnung eines Umrisses in einer Koordinate. */
function spanne(poly: readonly V2[], k: 'x' | 'y'): [number, number] {
  let lo = Infinity;
  let hi = -Infinity;
  for (const p of poly) {
    lo = Math.min(lo, p[k]);
    hi = Math.max(hi, p[k]);
  }
  return [lo, hi];
}

/** Überlappung zweier Spannen, bezogen auf die kürzere (0 … 1). */
function ueberlappung(a: [number, number], b: [number, number]): number {
  const l = Math.min(a[1], b[1]) - Math.max(a[0], b[0]);
  const m = Math.min(a[1] - a[0], b[1] - b[0]);
  return l > 0 && m > 0 ? l / m : l >= 0 && m <= 0 ? 1 : 0;
}

/** Ein seitliches Paar im Entstehen: Kandidaten je Ansicht und ihre Spannen in 3D (x, y, z). */
type Paar = { s?: Kandidat; front: Kandidat[]; top: Kandidat[]; x: [number, number]; y: [number, number]; z: [number, number] };

/**
 * Teile eines Dokuments (Profile × Maßstab, Kern-Einheiten). `vorher`: der eingefrorene Baum (Hysterese, Sehnen als
 * Kurvenparameter). `zellen`: Rasterauflösung der Skelette.
 */
export function teilbaum(dok: Dokument, vorher?: GefrorenerTeilbaum | null, zellen = TEIL_ZELLEN): Teilbaum {
  const uhr = (globalThis as { performance?: { now(): number } }).performance;
  const t0 = uhr ? uhr.now() : Date.now();
  const sk = dok.skalierung;
  const h = huelle(dok);
  const pr: Record<BlattName, Profil> = dok.profile;
  const knoten: [number, number, number] = [pr.seite.knoten.length, pr.front.knoten.length, pr.top.knoten.length];
  const gleicheKnoten = !!vorher && vorher.knoten.every((k, i) => k === knoten[i]);
  // Vorgabe je Kandidat: das eingefrorene Teil derselben Ansicht, dessen Sehnenmitte (innerhalb ¾ der Sehnenlänge, mindestens
  // 0,03) oder Spitze (innerhalb eines Drittels der Astlänge, mindestens 0,04) am nächsten liegt — dann gilt die Schwelle
  // 1 − HYSTERESE und (bei gleicher Knotenzahl) seine Sehne. Nichts wird dabei „verbraucht“: Ein verworfener Nachbar soll
  // das Teil nicht wegnehmen; die Kennungen vergibt am Ende die Nähe.
  const ankerPunkt = (blatt: BlattName, a: EndenAnker): V2 => {
    const q = gleicheKnoten ? profilPunkt(pr[blatt], a.k, a.t) : a.p;
    return { x: q.x * sk, y: q.y * sk };
  };
  const gesehen = new Set<GefrorenesTeil>();
  const vorgabe: VorgabeFn = (blatt, spitze, l, schnitt) => {
    let best: GefrorenesTeil | undefined;
    let bq = 1;
    for (const g of vorher?.teile ?? []) {
      if (g.blatt !== blatt) continue;
      const ga = ankerPunkt(blatt, g.a);
      const gb = ankerPunkt(blatt, g.b);
      const qSpitze = Math.hypot(g.spitze.x * sk - spitze.x, g.spitze.y * sk - spitze.y) / Math.max(0.04, l / 3);
      const qMitte = schnitt ? Math.hypot((schnitt[0].x + schnitt[1].x - ga.x - gb.x) / 2, (schnitt[0].y + schnitt[1].y - ga.y - gb.y) / 2) / Math.max(0.03, 0.75 * abstand(ga, gb)) : Infinity;
      const q = Math.min(qSpitze, qMitte);
      if (q < bq) {
        bq = q;
        best = g;
      }
    }
    if (!best) return { faktor: 1 + HYSTERESE };
    gesehen.add(best);
    return { faktor: 1 - HYSTERESE, vorher: best, abstand: bq, ...(gleicheKnoten ? { fest: [ankerPunkt(best.blatt, best.a), ankerPunkt(best.blatt, best.b)] as [V2, V2], anker: [best.a, best.b] as [EndenAnker, EndenAnker] } : {}) };
  };
  const seite = seiteLesen(h.seite, zellen, vorgabe);
  const front = seitlicheLesen(h.front, 'front', zellen, vorgabe);
  const top = seitlicheLesen(h.top, 'top', zellen, vorgabe);
  const eps = 0.5 / 461;
  // Mitnehmen: eingefrorene Teile von Front und Top, die das Skelett diesmal gar nicht vorschlägt (ein flacher Wulst bildet
  // beim Ausdünnen je nach Rasterlage keinen Ast — die Rex-Front verlor ihn jeden dritten Zugschritt), bleiben an ihrer
  // eingefrorenen Sehne, solange sie dort noch mindestens 1 − HYSTERESE ihrer eingefrorenen Höhe herausragen
  if (gleicheKnoten)
    for (const g of vorher?.teile ?? []) {
      if (gesehen.has(g) || g.blatt === 'seite' || !g.hoehe) continue;
      const A = ankerPunkt(g.blatt, g.a);
      const B = ankerPunkt(g.blatt, g.b);
      const t = teilenBei(h[g.blatt], A, B, { x: g.spitze.x * sk, y: g.spitze.y * sk });
      if (!t) continue;
      const { hoehe, fern } = ueberSehne(t.ast, A, B);
      if (hoehe < (1 - HYSTERESE) * g.hoehe * sk) continue;
      const mitte = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
      // Wirbelsäule wie die Skelett-Äste: von der Achse (z = 0) über die Sehnenmitte zur Spitze
      const amAst = g.blatt === 'front' ? { x: 0, y: mitte.y } : { x: mitte.x, y: 0 };
      (g.blatt === 'front' ? front : top).kandidaten.push({
        blatt: g.blatt,
        quelle: 'seitlich',
        achse: { punkte: [mitte, fern], radius: [abstand(A, B) / 2, 0] },
        abzweig: amAst,
        schnitt: t.schnitt,
        umriss: t.ast,
        mass: 1,
        teil: true,
        vorher: g,
        vorherAbstand: 0,
        anker: [g.a, g.b],
        werte: { hoehe, mitgenommen: 1 },
      });
    }

  // Rumpf
  const rumpfAchse = glaetten(seite.rumpf.punkte).map((p): V3 => [p.x, p.y, 0]);
  const teile: Teil[] = [{ id: 'rumpf', art: 'rumpf', eltern: -1, richtung: 'hinten', achse: rumpfAchse, knoten: knotenVon(rumpfAchse, 0.06), erkannt: {}, mass: 9 }];

  // Äste der Seite: Mitte oder Paar (Hysterese auf den Anteil seitlicher Säulen)
  const paare: Paar[] = [];
  const mitten: Kandidat[] = [];
  for (const c of seite.kandidaten) {
    if (!c.teil) continue;
    const s = seitlichAnteil(h, c.achse);
    c.werte.seitlich = s;
    const schwelle = c.vorher ? (c.vorher.art === 'paar' ? 0.5 * (1 - HYSTERESE) : 0.5 * (1 + HYSTERESE)) : 0.5;
    if (s >= schwelle) {
      // dritte Koordinate aus der Hülle: seitliche Stücke längs der Achse
      let z0 = Infinity;
      let z1 = -Infinity;
      for (const p of c.achse.punkte)
        for (const [lo, hi] of h.zBei(p.x, p.y))
          if (hi > eps) {
            z0 = Math.min(z0, Math.max(lo, 0));
            z1 = Math.max(z1, hi);
          }
      paare.push({ s: c, front: [], top: [], x: spanne(c.umriss, 'x'), y: spanne(c.umriss, 'y'), z: z0 <= z1 ? [z0, z1] : [0, 0] });
    } else mitten.push(c);
  }
  // Seitliche Äste aus Front (Blatt: z, y) und Top (Blatt: x, z): an ein Paar der Seite hängen oder ein neues Paar
  const angenommen = (cs: Kandidat[]) => cs.filter((c) => c.teil);
  const spannenFront = (c: Kandidat) => {
    let x0 = Infinity;
    let x1 = -Infinity;
    for (const p of c.achse.punkte)
      for (const [lo, hi] of h.xBei(p.x, p.y)) {
        x0 = Math.min(x0, lo);
        x1 = Math.max(x1, hi);
      }
    return { x: (x0 <= x1 ? [x0, x1] : [0, 0]) as [number, number], y: spanne(c.umriss, 'y'), z: spanne(c.umriss, 'x') };
  };
  const spannenTop = (c: Kandidat) => {
    let y0 = Infinity;
    let y1 = -Infinity;
    for (const p of c.achse.punkte)
      for (const [lo, hi] of h.yBei(p.x, p.y)) {
        y0 = Math.min(y0, lo);
        y1 = Math.max(y1, hi);
      }
    return { x: spanne(c.umriss, 'x'), y: (y0 <= y1 ? [y0, y1] : [0, 0]) as [number, number], z: spanne(c.umriss, 'y') };
  };
  const passt = (p: { x: [number, number]; y: [number, number]; z: [number, number] }, q: { x: [number, number]; y: [number, number]; z: [number, number] }) => ueberlappung(p.x, q.x) > 0.3 && ueberlappung(p.y, q.y) > 0.3 && ueberlappung(p.z, q.z) > 0.3;
  for (const c of angenommen(top.kandidaten)) {
    const sp = spannenTop(c);
    const zu = paare.filter((p) => passt(p, sp));
    if (zu.length) for (const p of zu) p.top.push(c);
    else paare.push({ front: [], top: [c], ...sp });
  }
  for (const c of angenommen(front.kandidaten)) {
    const sp = spannenFront(c);
    const zu = paare.filter((p) => passt(p, sp));
    if (zu.length) for (const p of zu) p.front.push(c);
    else paare.push({ front: [c], top: [], ...sp });
  }

  // Elternteil: das Mittelteil der Seite, dessen Umriss den Abzweig enthält (sonst der Rumpf)
  const elternVon = (x: number, y: number): number => {
    for (let i = 1; i < teile.length; i++) {
      const t = teile[i]!;
      const u = t.erkannt.seite?.umriss;
      if (t.art === 'mitte' && u && innen(u, { x, y })) return i;
    }
    return 0;
  };
  // Kennungen am Ende: je eingefrorenes Teil das nächste neue Teil derselben Art (nach `vorherAbstand`), die übrigen die
  // kleinste freie Kennung, die auch kein eingefrorenes Teil trägt
  const vergabe: { teil: Teil; alt?: GefrorenesTeil; abstand: number }[] = [];

  // Mittelteile (z = 0): Wirbelsäule vom Abzweig auf der Rumpfachse bis zur Spitze
  for (const c of mitten) {
    const achse = glaetten([c.abzweig, ...c.achse.punkte]).map((p): V3 => [p.x, p.y, 0]);
    vergabe.push({ teil: { id: '', art: 'mitte', eltern: 0, richtung: richtungAusUmriss({ seite: { schnitt: c.schnitt, umriss: c.umriss, quelle: c.quelle, mass: c.mass } }, c.vorher?.richtung), achse, knoten: knotenVon(achse, 0.05), erkannt: { seite: { schnitt: c.schnitt, umriss: c.umriss, quelle: c.quelle, mass: c.mass } }, mass: c.mass, ...(c.werte.seitlich !== undefined ? { seitlich: c.werte.seitlich } : {}) }, ...(c.vorher ? { alt: c.vorher } : {}), abstand: c.vorherAbstand ?? 9 });
    teile.push(vergabe[vergabe.length - 1]!.teil);
  }
  // Paare: Wirbelsäule aus der Ansicht, die sie am besten zeigt (Seite, sonst Top, sonst Front), dritte Koordinate aus
  // der anderen erkannten Ansicht oder der Hülle
  for (const p of paare) {
    let achse: V3[] = [];
    const f0 = p.front[0];
    const t0 = p.top[0];
    if (p.s) {
      const pts = glaetten([p.s.abzweig, ...p.s.achse.punkte]);
      let zLetzt = (p.z[0] + p.z[1]) / 2;
      achse = pts.map((q, i) => {
        const z = i === 0 ? null : seitlicheMitte(h.zBei(q.x, q.y), eps);
        if (z !== null) zLetzt = z;
        return [q.x, q.y, z ?? zLetzt] as V3;
      });
      // Anfang auf der Höhe der ersten Probe (der Ansatz liegt am Rumpf, nicht in der Mittelebene)
      if (achse.length > 1) achse[0] = [achse[0]![0], achse[0]![1], achse[1]![2]];
    } else if (t0) {
      const pts = glaetten([t0.abzweig, ...t0.achse.punkte]);
      achse = pts.map((q) => {
        // Top-Blatt: x = x, y = z; die Höhe aus der Front (nächster Achspunkt nach z) oder der Hülle
        let y: number | null = null;
        if (f0) {
          let best = f0.achse.punkte[0]!;
          for (const r of f0.achse.punkte) if (Math.abs(r.x - q.y) < Math.abs(best.x - q.y)) best = r;
          y = best.y;
        } else y = mitteVon(h.yBei(q.x, Math.max(q.y, eps)));
        return [q.x, y ?? 0, q.y] as V3;
      });
    } else if (f0) {
      const pts = glaetten([f0.abzweig, ...f0.achse.punkte]);
      achse = pts.map((q) => [mitteVon(h.xBei(Math.max(q.x, eps), q.y)) ?? 0, q.y, q.x] as V3);
    }
    if (achse.length < 2) continue;
    const quelle = p.s ?? t0 ?? f0!;
    const erkannt: Teil['erkannt'] = {};
    if (p.s) erkannt.seite = { schnitt: p.s.schnitt, umriss: p.s.umriss, quelle: p.s.quelle, mass: p.s.mass };
    if (t0) erkannt.top = { schnitt: t0.schnitt, umriss: t0.umriss, quelle: t0.quelle, mass: t0.mass };
    if (f0) erkannt.front = { schnitt: f0.schnitt, umriss: f0.umriss, quelle: f0.quelle, mass: f0.mass };
    const a0 = achse[0]!;
    const neu: Teil = {
      id: '',
      art: 'paar',
      eltern: elternVon(a0[0], a0[1]),
      richtung: richtungAusUmriss(erkannt, quelle.vorher?.richtung),
      achse,
      knoten: knotenVon(achse, 0.05),
      erkannt,
      mass: Math.max(p.s?.mass ?? 0, t0?.mass ?? 0, f0?.mass ?? 0),
      ...(p.s?.werte.seitlich !== undefined ? { seitlich: p.s.werte.seitlich } : {}),
    };
    teile.push(neu);
    vergabe.push({ teil: neu, ...(quelle.vorher ? { alt: quelle.vorher } : {}), abstand: quelle.vorherAbstand ?? 9 });
  }
  const vergeben = new Set<string>();
  for (const v of vergabe.slice().sort((a, b) => a.abstand - b.abstand))
    if (v.alt && v.alt.art === v.teil.art && !vergeben.has(v.alt.id)) {
      v.teil.id = v.alt.id;
      vergeben.add(v.alt.id);
    }
  for (const v of vergabe) {
    if (v.teil.id) continue;
    for (let n = 1; ; n++) {
      const id = `${v.teil.art === 'mitte' ? 'm' : 'p'}${n}`;
      if (!vergeben.has(id) && !(vorher?.teile ?? []).some((g) => g.id === id)) {
        v.teil.id = id;
        vergeben.add(id);
        break;
      }
    }
  }

  // Eingefroren: je Teil die Sehne der Ansicht, die es trägt, als Kurvenparameter, und die Spitze
  const gefroren: GefrorenerTeilbaum = { knoten, teile: [] };
  for (const t of teile.slice(1)) {
    const blatt: BlattName | undefined = t.erkannt.seite ? 'seite' : t.erkannt.top ? 'top' : t.erkannt.front ? 'front' : undefined;
    if (!blatt) continue;
    const e = t.erkannt[blatt]!;
    const anker = (q: V2): EndenAnker => {
      const a = profilAnker(pr[blatt], { x: q.x / sk, y: q.y / sk });
      return { k: a.k, t: a.t, p: { x: a.p.x, y: a.p.y } };
    };
    const kand = [...seite.kandidaten, ...front.kandidaten, ...top.kandidaten].find((c) => c.blatt === blatt && c.schnitt === e.schnitt)!;
    const sp = kand.achse.punkte[kand.achse.punkte.length - 1]!;
    // eingefrorene Sehne: dieselben Kurvenparameter (Lage neu ausgewertet); sonst die neue Sehne auf die Kurve gelegt
    const fest = (a: EndenAnker): EndenAnker => {
      const q = profilPunkt(pr[blatt], a.k, a.t);
      return { k: a.k, t: a.t, p: { x: q.x, y: q.y } };
    };
    const [a, b] = kand.anker ? [fest(kand.anker[0]), fest(kand.anker[1])] : [anker(e.schnitt[0]), anker(e.schnitt[1])];
    const hoehe = ueberSehne(e.umriss, e.schnitt[0], e.schnitt[1]).hoehe / sk;
    gefroren.teile.push({ id: t.id, art: t.art as 'mitte' | 'paar', blatt, a, b, spitze: { x: sp.x / sk, y: sp.y / sk }, richtung: t.richtung, hoehe });
  }
  const t1 = uhr ? uhr.now() : Date.now();
  return { teile, kandidaten: [...seite.kandidaten, ...front.kandidaten, ...top.kandidaten], rumpf: { achse: seite.rumpf, umriss: seite.rumpfUmriss }, gefroren, zeit: t1 - t0 };
}

/** Kurzer Text der Einordnung (Prüfungen, Bericht): Art und Richtung je Teil, sortiert. */
export function teilSignatur(b: Teilbaum): string {
  return b.teile
    .slice(1)
    .map((t) => `${t.art}:${t.richtung}`)
    .sort()
    .join(',');
}
