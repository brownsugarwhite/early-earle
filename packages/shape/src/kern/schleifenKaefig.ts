// Prüfplan P1 „Ansichten als Illustration“, Tag 2–3, zweiter Anlauf (03.11.2026): der Käfig aus den Schleifen.
//
// Florian (03.11.): „Die Linie und das Modell sind doch exakt das selbe … die gelbe Linie sollte eigentlich die schwarze Linie
// sein.“ Der erste Anlauf (`schleifenKoerper`) zog den heutigen Schlauch an die Schleifen und faltete dort, wo der Schlauch
// die Schleife nicht hat. Hier sind die drei Umrissschleifen **Punktreihen des Käfigs**: Die Seite ist die Naht (z = 0), die
// Schleife der Ansicht längs der Achse die Reihe N/4 samt Kappenmitte, die Schleife der Ansicht quer zur Achse ein Ring.
// Die drei Schleifen kreuzen sich in sechs Punkten (vorn, hinten, oben, unten, rechts, links) — das sind die gekoppelten
// Extrempunkte der Zeichnungen. Dazwischen liegen acht Felder; jeder Ring bekommt seine drei Ankerpunkte beim gleichen
// Bogenanteil der drei Bögen (Würfel-Kugel-Topologie der Röhre), die Form zwischen den Ankern ist die Ringschleife
// (gezeichneter Querschnitt), auf die Anker gestreckt — „so rund wie möglich“ heißt: wie der gezeichnete Querschnitt.
// Die Achse (Ringe quer zu x oder zu y) folgt der längeren Ausdehnung der Seite; Ecken-Knoten werden Falten auf Ringen
// (Ecke der Seite oder der Reihenschleife) bzw. Reihen (Ecke der Ringschleife), Ecken an einer Spitze eine Punktfalte.
// Danach ein Löser: Schleifenpunkte hart auf ihren Grenzlagen, Silhouettenbedingung (quer zur Schleife ist die Fläche
// parallel zum Blick), das Innere weich auf der Vorlage, Glättung der Abweichung von der Vorlage. Ohne die Option bitgleich.
// DOM-frei.
import type { V2 } from '../bezier';
import type { Dokument } from '../dokument';
import { type Kaefig, type V3, kanteZwischen } from '../kaefig/halbkanten';
import { grenzDifferenz, grenzZeile } from '../loeser/achsen';
import { grenzLoeser } from '../loeser/grenzflaeche';
import { type NormalZeile, kaefigNachbarlisten, normalSystem } from '../loeser/normalSystem';
import { unterteilung } from '../subdivision/catmullClark';
import { anwenden3 } from '../subdivision/matrix';
import { type Ableitung, type Ecke, glaettemassFuer } from './ableiten';
import { type PlanSchleife, type UmrissPlan, punkt3, tiefeGlaetten } from './umrissPlan';

const PX = 461;
type Blatt = 'seite' | 'front' | 'top';
export type KaefigAchse = 'x' | 'y';

export type KaefigOptionen = {
  /** Ringe quer zur x-Achse (vorn/hinten = Kappen) oder zur y-Achse (unten/oben = Kappen); `auto` nach der längeren Ausdehnung */
  achse?: KaefigAchse | 'auto';
  /** Gewicht der Schleifenpunkte (Grenzlage = Schleife) */
  gewicht?: number;
  /** Gewicht der Silhouettenbedingung (quer zur Schleife: Fläche parallel zum Blick) */
  tangente?: number;
  /** Gewicht der Füllung (Grenzlage der übrigen Punkte ≈ Vorlage aus den Schleifen) */
  innen?: number;
  /** Glättung der Stufe 2, nur der Abweichung von der Vorlage; an den Kappen das `fairKappe`-fache */
  fair?: number;
  fairKappe?: number;
  /** Kantenschärfe an Ecken-Knoten (Falten) */
  schaerfe?: number;
  /** Anteil, mit dem die Ringe der Verdrehung der Ringschleife längs der Achse folgen (0 = eben, 1 = wie die Schleife, nach Ringbreite skaliert) */
  kippen?: number;
  /** Verhältnis Höhe : Länge der Seite, ab dem die Achse y ist (`achse: 'auto'`) */
  achseAb?: number;
  /**
   * Punkte dort verdichten, wo die Linie sich dreht: je Bogenmaß Drehung zählt die Linie um so viele Schritte länger (0 = rein
   * nach Bogenlänge, Standard; 0,5 = eine Vierteldrehung bringt knapp einen Schritt). Gemessen (03.11.): 0,5 verschlechtert Ei
   * (Front 0,4 → 0,8 px), scharfen Würfel, Zylinder, runde Vase und die Kegel-Front (2,0 → 6,5 px); mehr drängte drei Ringe in
   * eine 14-px-Rundung (Würfel 14 px Δ). Bleibt als Versuch
   */
  kruemmung?: number;
  /**
   * Tiefe der Reihen- und Ringschleife: `glatt` = neu mit kleinster Biegung in den erlaubten Intervallen (ohne den Zug des Planers
   * zur berührenden Station — der ließ die Front-Tiefe von Vase und Würfel um 80–100 px wandern), `plan` = wie geplant
   */
  tiefe?: 'glatt' | 'plan';
};

export type KaefigBericht = {
  ok: boolean;
  /** Grund, wenn nicht gebaut (mehrteilig, Schleife fehlt) */
  grund?: string;
  achse: KaefigAchse;
  /** Ring der Ringschleife, Kanten je Bogen vorn/hinten */
  ringF: number;
  schritte: { vorn: number; hinten: number };
  /** Bogenlängen (px) der drei Bögen ab vorn und ab hinten */
  bogen: { vorn: [number, number, number]; hinten: [number, number, number] };
  /** Kreuzungen (Welt) */
  kreuzungen: { vorn: V3; hinten: V3; oben: V3; unten: V3; rechts: V3 };
  /** Schleifenpunkte des Käfigs: Naht, Reihenschleife, Ringschleife (Zahl) */
  punkte: { naht: number; reihe: number; ring: number };
  /** Abstand Grenzlage → Schleife an den Schleifenpunkten (px), größter und mittlerer */
  rest: { max: number; mittel: number };
  /** größter Winkel (Grad) der Fläche gegen den Blick an den Schleifenpunkten (0 = Silhouette genau dort) */
  silhouette: number;
  /** Abstand Grenzlage → Vorlage im Innern (px), größter und mittlerer */
  innen: { max: number; mittel: number };
  /** Überstand feiner Punkte über die Silhouetten der Zeichnung (px) */
  ueberstand: { front: number; top: number };
  /** größte Ausdehnung eines Rings längs der Achse (px, Kippen) */
  kippung: number;
  /** Falten: Ringe (Ecken der Seite/Reihenschleife), Reihen (Ecken der Ringschleife), Spitzen */
  falten: { ringe: number[]; kappen: number; reihen: number[]; spitzen: ('vorn' | 'hinten')[] };
  /** Bogenanteile der Schritte (gemeinsame Dichte) ab vorn und ab hinten, Vorlage oben und unten */
  dichte: { vorn: number[]; hinten: number[]; oben: number[]; unten: number[] };
  unbekannte: number;
  huelle: number;
  ms: number;
  msUnterteilung: number;
  msLoeser: number;
};

const STANDARD: Required<KaefigOptionen> = { achse: 'auto', gewicht: 1e3, tangente: 1e3, innen: 1, fair: 30, fairKappe: 10, schaerfe: 1e6, kippen: 1, achseAb: 1.25, kruemmung: 0, tiefe: 'glatt' };
/** Ecken verschiedener Bögen einer Seite, die näher als dieser Anteil beieinander liegen, rasten auf denselben Schritt (ein Ring) */
const ECKEN_BUENDEL = 0.08;

/** Flache Läufe an Extremen gelten als gleich weit (Welt): eine gezeichnete Gerade wackelt um 1–2 px, die Mitte des Laufs ist die Kreuzung */
const EPS_EXTREM = 3 / PX;
/** Ecken-Knoten dürfen so weit (px) neben der nächsten Probe liegen */
const ECKE_FANG = 3;

const uhr = (globalThis as { performance?: { now(): number } }).performance;
const jetzt = () => (uhr ? uhr.now() : Date.now());

const dist = (a: V3, b: V3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** Index des Extremums (max oder min) von `werte`; bei einem flachen Lauf (Werte innerhalb `eps`) der mittlere Index des Laufs (zyklisch). */
function extremIndex(werte: readonly number[], max: boolean, eps: number): number {
  const n = werte.length;
  let best = 0;
  for (let i = 1; i < n; i++) if (max ? werte[i]! > werte[best]! : werte[i]! < werte[best]!) best = i;
  const ok = (i: number) => {
    const w = werte[((i % n) + n) % n]!;
    return max ? w >= werte[best]! - eps : w <= werte[best]! + eps;
  };
  let lo = best;
  let hi = best;
  while (hi - lo < n - 1 && ok(lo - 1)) lo--;
  while (hi - lo < n - 1 && ok(hi + 1)) hi++;
  return (((Math.round((lo + hi) / 2) % n) + n) % n);
}

/** Bogen einer geschlossenen Folge von Index a vorwärts bis b (beide einschließlich). */
function bogen<T>(folge: readonly T[], a: number, b: number): T[] {
  const n = folge.length;
  const out: T[] = [];
  for (let i = a; ; i = (i + 1) % n) {
    out.push(folge[i]!);
    if (i === b) break;
    if (out.length > n) break;
  }
  return out;
}

/** kumulierte Bogenlängen eines Zugs */
function laengen(zug: readonly V3[]): Float64Array {
  const L = new Float64Array(zug.length);
  for (let i = 1; i < zug.length; i++) L[i] = L[i - 1]! + dist(zug[i]!, zug[i - 1]!);
  return L;
}

/** Punkt bei Bogenlänge s auf dem Zug. */
function punktBei(zug: readonly V3[], L: Float64Array, s: number): V3 {
  const n = zug.length;
  if (n === 1) return zug[0]!;
  const total = L[n - 1]!;
  const x = Math.min(total, Math.max(0, s));
  let i = 0;
  while (i + 2 < n && L[i + 1]! < x) i++;
  const d = L[i + 1]! - L[i]!;
  const f = d > 1e-15 ? (x - L[i]!) / d : 0;
  const a = zug[i]!;
  const b = zug[i + 1]!;
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}

/** Zug mit Bogenlängen und gewichteten Längen (Bogenlänge + Krümmung · Drehung): Schritte verteilen sich nach der gewichteten Länge. */
type Gewichtet = { zug: readonly V3[]; L: Float64Array; Lw: Float64Array; total: number; totalW: number };

function gewichtet(zug: readonly V3[], kruemmung: number): Gewichtet {
  const L = laengen(zug);
  const n = zug.length;
  const Lw = new Float64Array(n);
  for (let i = 1; i < n; i++) {
    let dreh = 0;
    if (i + 1 < n) {
      const a = zug[i - 1]!;
      const b = zug[i]!;
      const c2 = zug[i + 1]!;
      const u: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const w: V3 = [c2[0] - b[0], c2[1] - b[1], c2[2] - b[2]];
      const lu = Math.hypot(u[0], u[1], u[2]);
      const lw = Math.hypot(w[0], w[1], w[2]);
      if (lu > 1e-15 && lw > 1e-15) dreh = Math.acos(Math.max(-1, Math.min(1, (u[0] * w[0] + u[1] * w[1] + u[2] * w[2]) / (lu * lw))));
    }
    Lw[i] = Lw[i - 1]! + (L[i]! - L[i - 1]!) + kruemmung * dreh;
  }
  return { zug, L, Lw, total: L[n - 1]!, totalW: Lw[n - 1]! };
}

/** gewichtete Lage einer Bogenlänge */
function gewichtetBei(g: Gewichtet, s: number): number {
  const n = g.zug.length;
  const x = Math.min(g.total, Math.max(0, s));
  let i = 0;
  while (i + 2 < n && g.L[i + 1]! < x) i++;
  const d = g.L[i + 1]! - g.L[i]!;
  const f = d > 1e-15 ? (x - g.L[i]!) / d : 0;
  return g.Lw[i]! + f * (g.Lw[i + 1]! - g.Lw[i]!);
}

/** Anteil (0 … 1) einer Bogenlänge an der gewichteten Länge */
const anteilVon = (g: Gewichtet, s: number): number => (g.totalW > 1e-15 ? gewichtetBei(g, s) / g.totalW : 0);

/**
 * Gemeinsame Dichte mehrerer Bögen: Bogenanteil φ_k (0 … 1) je Schritt k = 0 … E, gleichmäßig in der mittleren gewichteten
 * Länge der Bögen. Alle Bögen einer Seite nehmen dieselben Anteile — je Bogen eigene Krümmungsgewichte verschöben die Anker
 * gegeneinander, und die Ringe kreuzten sich (Ei: 160 umgeklappte Flächen).
 */
function gemeinsameDichte(gs: readonly Gewichtet[], E: number): number[] {
  const M = 512;
  const W = new Float64Array(M + 1);
  for (let t = 0; t <= M; t++) {
    const phi = t / M;
    let w = 0;
    for (const g of gs) w += anteilVon(g, phi * g.total) / gs.length;
    W[t] = w;
  }
  const out: number[] = [];
  for (let k = 0; k <= E; k++) {
    const ziel = k / E;
    let t = 0;
    while (t + 1 < M && W[t + 1]! < ziel) t++;
    const d = W[t + 1]! - W[t]!;
    const f = d > 1e-15 ? (ziel - W[t]!) / d : 0;
    out.push(Math.min(1, Math.max(0, (t + f) / M)));
  }
  out[0] = 0;
  out[E] = 1;
  return out;
}

/**
 * Zug in E Kanten abtasten: Schritte nach der gemeinsamen Dichte `phi` (Bogenanteile), Ecken (Bogenlängen, Schritt vorgegeben
 * oder nach der Dichte gerundet) rasten auf Gitterschritte (ab 1, aufsteigend, nie am Ende); zwischen zwei Stützstellen wird die
 * Dichte auf das Stück gestreckt. Liefert E + 1 Punkte und je Ecke ihren Schritt.
 */
function abtasten(g: Gewichtet, E: number, ecken: readonly { s: number; k?: number }[], phi: readonly number[]): { punkte: V3[]; schritte: number[] } {
  const stuetz: { f: number; k: number }[] = [{ f: 0, k: 0 }];
  const sortiert = [...ecken].filter((e) => e.s > 1e-12 && e.s < g.total - 1e-12).sort((a, b) => a.s - b.s);
  const schritte: number[] = [];
  let kMin = 1;
  const schrittVon = (f: number) => {
    let k = 0;
    while (k + 1 < E && phi[k + 1]! <= f) k++;
    const d = phi[k + 1]! - phi[k]!;
    return k + (d > 1e-15 ? (f - phi[k]!) / d : 0);
  };
  sortiert.forEach((e, q) => {
    const rest = sortiert.length - 1 - q;
    const f = e.s / g.total;
    let k = e.k ?? Math.round(schrittVon(f));
    k = Math.max(kMin, Math.min(E - 1 - rest, k));
    if (k < kMin || k > E - 1) return;
    stuetz.push({ f, k });
    schritte.push(k);
    kMin = k + 1;
  });
  stuetz.push({ f: 1, k: E });
  const punkte: V3[] = [];
  for (let k = 0; k <= E; k++) {
    let q = 0;
    while (q + 2 < stuetz.length && stuetz[q + 1]!.k <= k) q++;
    const a = stuetz[q]!;
    const b = stuetz[q + 1]!;
    const dw = phi[b.k]! - phi[a.k]!;
    const lam = dw > 1e-15 ? (phi[k]! - phi[a.k]!) / dw : 0;
    punkte.push(punktBei(g.zug, g.L, (a.f + lam * (b.f - a.f)) * g.total));
  }
  return { punkte, schritte };
}

/** Bogenlänge eines Index auf einem Zug */
const bogenLaengeBis = (zug: readonly V3[], i: number): number => laengen(zug)[Math.max(0, Math.min(zug.length - 1, i))]!;

/** Probenfolge einer Schleife mit Blattkoordinaten (für Ecken-Knoten) */
type Folge = { p: V3[]; q: V2[] };

function folge(s: PlanSchleife, K: (p: V3) => V3): Folge {
  return { p: s.proben.map((pr) => K(pr.p)), q: s.proben.map((pr) => pr.q) };
}

/** Schleife mit neu geglätteter Tiefe (kleinste Biegung in den Intervallen, geschlossen). */
function tiefeNeu(s: PlanSchleife): PlanSchleife {
  const m = s.proben.length;
  const lo = new Float64Array(m);
  const hi = new Float64Array(m);
  const fest = new Uint8Array(m);
  s.proben.forEach((p, i) => {
    lo[i] = p.lo;
    hi[i] = p.hi;
    fest[i] = Number.isFinite(p.lo) && Number.isFinite(p.hi) ? 1 : 0;
  });
  if (!fest.some((f) => f)) return s;
  const d = tiefeGlaetten(lo, hi, fest, true);
  return { ...s, proben: s.proben.map((p, i) => ({ ...p, p: punkt3(s.ansicht, p.q, d[i]!) })) };
}

/** Index der Probe, die einem Knoten (Blattkoordinaten) am nächsten liegt, wenn näher als `ECKE_FANG` px; sonst −1. */
function knotenIndex(q: readonly V2[], kn: V2): number {
  let best = -1;
  let bd = (ECKE_FANG / PX) ** 2;
  q.forEach((p, i) => {
    const d = (p.x - kn.x) ** 2 + (p.y - kn.y) ** 2;
    if (d < bd) {
      bd = d;
      best = i;
    }
  });
  return best;
}

/** Hälfte einer geschlossenen Schleife zwischen zwei Indizes mit z ≥ 0 (mittleres z der beiden Wege). */
function halbZ(f: Folge, a: number, b: number): { p: V3[]; idx: number[] } {
  const n = f.p.length;
  const vor: number[] = [];
  for (let i = a; ; i = (i + 1) % n) {
    vor.push(i);
    if (i === b || vor.length > n) break;
  }
  const rueck: number[] = [];
  for (let i = a; ; i = (i - 1 + n) % n) {
    rueck.push(i);
    if (i === b || rueck.length > n) break;
  }
  const mz = (l: number[]) => l.reduce((s, i) => s + f.p[i]![2], 0) / l.length;
  const idx = mz(vor) >= mz(rueck) ? vor : rueck;
  return { p: idx.map((i) => f.p[i]!), idx };
}

function ecken(dok: Dokument, a: Blatt): V2[] {
  const sk = dok.skalierung;
  return dok.profile[a].knoten.filter((k) => k.art === 'ecke' && !k.marke).map((k) => ({ x: k.p.x * sk, y: k.p.y * sk }));
}

/** Winkelgewicht einer Ringkante bei θ (0 = oben, π/2 = rechts) für eine Falte von der Seite `seite` (wie `faltenSetzen`). */
function faltenGewicht(theta: number, seite: 'oben' | 'unten' | 'seite' | 'beide'): number {
  if (seite === 'beide') return 1;
  if (seite === 'seite') return Math.sin(theta) ** 2;
  const c = Math.cos(theta);
  return seite === 'oben' ? Math.max(0, c) ** 2 : Math.max(0, -c) ** 2;
}

/**
 * Käfig aus den drei Umrissschleifen eines einteiligen Körpers (eine Schleife je Ansicht). Gibt die Ableitung mit neuem
 * Käfig (Lagen, Falten, Unterteilung, Grenzlöser) zurück; bei mehrteiligen Zeichnungen die Eingabe unverändert.
 */
export function schleifenKaefig(abl: Ableitung, plan: UmrissPlan, dok: Dokument, optionen: KaefigOptionen = {}): { abl: Ableitung; bericht: KaefigBericht } {
  const t0 = jetzt();
  const opt = { ...STANDARD, ...optionen };
  const je = (a: Blatt) => plan.schleifen.filter((s) => s.ansicht === a);
  const seite = je('seite');
  const front = je('front');
  const top = je('top');
  const { R, N, c } = abl.vorlage;
  const k = abl.kaefig;
  const n = k.n;
  const leer = (grund: string, achse: KaefigAchse = 'x'): { abl: Ableitung; bericht: KaefigBericht } => ({
    abl,
    bericht: { ok: false, grund, achse, ringF: -1, schritte: { vorn: 0, hinten: 0 }, bogen: { vorn: [0, 0, 0], hinten: [0, 0, 0] }, kreuzungen: { vorn: [0, 0, 0], hinten: [0, 0, 0], oben: [0, 0, 0], unten: [0, 0, 0], rechts: [0, 0, 0] }, punkte: { naht: 0, reihe: 0, ring: 0 }, rest: { max: 0, mittel: 0 }, silhouette: 0, innen: { max: 0, mittel: 0 }, ueberstand: { front: 0, top: 0 }, kippung: 0, falten: { ringe: [], kappen: 0, reihen: [], spitzen: [] }, dichte: { vorn: [], hinten: [], oben: [], unten: [] }, unbekannte: 0, huelle: 0, ms: jetzt() - t0, msUnterteilung: 0, msLoeser: 0 },
  });
  if (seite.length !== 1 || front.length !== 1 || top.length !== 1) return leer(`mehrteilig: Seite ${seite.length}, Front ${front.length}, Top ${top.length} Schleifen`);
  if (n !== abl.vorlage.kaefig.n) return leer('Käfig mit Maul oder Beinen');
  // Achse: Ringe quer zur längeren Ausdehnung der Seite
  const sp = seite[0]!.proben;
  let xLo = Infinity;
  let xHi = -Infinity;
  let yLo = Infinity;
  let yHi = -Infinity;
  for (const p of sp) {
    xLo = Math.min(xLo, p.p[0]);
    xHi = Math.max(xHi, p.p[0]);
    yLo = Math.min(yLo, p.p[1]);
    yHi = Math.max(yHi, p.p[1]);
  }
  const achse: KaefigAchse = opt.achse === 'auto' ? (yHi - yLo > opt.achseAb * (xHi - xLo) ? 'y' : 'x') : opt.achse;
  // Kanon (a, h, z): a längs der Achse (vorn → hinten), h quer in der Seite (unten → oben), z nach rechts; eine Drehung um z
  const K = (p: V3): V3 => (achse === 'x' ? [p[0], p[1], p[2]] : [p[1], -p[0], p[2]]);
  const W = (p: V3): V3 => (achse === 'x' ? [p[0], p[1], p[2]] : [-p[1], p[0], p[2]]);
  const reihenAnsicht: Blatt = achse === 'x' ? 'top' : 'front';
  const ringAnsicht: Blatt = achse === 'x' ? 'front' : 'top';
  // ---- Seite: Naht ----
  let S = folge(seite[0]!, K);
  let nS = S.p.length;
  const seitenEcken = ecken(dok, 'seite').map((kn) => knotenIndex(S.q, kn)).filter((i) => i >= 0);
  const kreuz = () => ({ vorn: extremIndex(S.p.map((p) => p[0]), false, EPS_EXTREM), hinten: extremIndex(S.p.map((p) => p[0]), true, EPS_EXTREM), oben: extremIndex(S.p.map((p) => p[1]), true, EPS_EXTREM), unten: extremIndex(S.p.map((p) => p[1]), false, EPS_EXTREM) });
  let kr0 = kreuz();
  const vorwaerts = (i: number, j: number) => (j - i + nS) % nS;
  let eckenIdx = seitenEcken;
  if (vorwaerts(kr0.vorn, kr0.oben) > vorwaerts(kr0.vorn, kr0.unten)) {
    S = { p: [...S.p].reverse(), q: [...S.q].reverse() };
    eckenIdx = eckenIdx.map((i) => nS - 1 - i);
    kr0 = kreuz();
  }
  nS = S.p.length;
  const vorn = S.p[kr0.vorn]!;
  const hinten = S.p[kr0.hinten]!;
  const oben = S.p[kr0.oben]!;
  const unten = S.p[kr0.unten]!;
  if (kr0.vorn === kr0.oben || kr0.oben === kr0.hinten || kr0.hinten === kr0.unten || kr0.unten === kr0.vorn) return leer('Seite: Kreuzungen fallen zusammen', achse);
  const S_vo = bogen(S.p, kr0.vorn, kr0.oben);
  const S_oh = bogen(S.p, kr0.oben, kr0.hinten);
  const S_hu = bogen(S.p, kr0.hinten, kr0.unten);
  const S_uv = bogen(S.p, kr0.unten, kr0.vorn);
  // Ecken der Seite je Bogen als Bogenlänge ab dem Bogenanfang (Bogen in Laufrichtung des Käfigs: ab vorn bzw. ab hinten)
  const eckenAuf = (von: number, bis: number, zug: readonly V3[], umkehren: boolean): number[] => {
    const out: number[] = [];
    const len = vorwaerts(von, bis);
    for (const i of eckenIdx) {
      const d = vorwaerts(von, i);
      if (d <= 0 || d >= len) continue;
      const s = bogenLaengeBis(zug, d);
      out.push(umkehren ? laengen(zug)[zug.length - 1]! - s : s);
    }
    return out;
  };
  const spitzen: ('vorn' | 'hinten')[] = [];
  for (const i of eckenIdx) {
    if (i === kr0.vorn) spitzen.push('vorn');
    if (i === kr0.hinten) spitzen.push('hinten');
  }
  // ---- Reihenschleife (durch vorn, rechts, hinten): rechte Hälfte vorn → hinten ----
  const schleifeVon = (a: Blatt) => {
    const s0 = plan.schleifen.find((x) => x.ansicht === a)!;
    return opt.tiefe === 'glatt' ? tiefeNeu(s0) : s0;
  };
  const Rw = folge(schleifeVon(reihenAnsicht), K);
  const rwVorn = extremIndex(Rw.p.map((p) => p[0]), false, EPS_EXTREM);
  const rwHinten = extremIndex(Rw.p.map((p) => p[0]), true, EPS_EXTREM);
  const rwHalb = halbZ(Rw, rwVorn, rwHinten);
  const rwRechts = extremIndex(rwHalb.p.map((p) => p[2]), true, EPS_EXTREM);
  if (rwRechts <= 0 || rwRechts >= rwHalb.p.length - 1) return leer('Reihenschleife: rechts fällt mit vorn oder hinten zusammen', achse);
  // ---- Ringschleife (durch oben, rechts, unten): rechte Hälfte oben → unten ----
  const Rg = folge(schleifeVon(ringAnsicht), K);
  const rgOben = extremIndex(Rg.p.map((p) => p[1]), true, EPS_EXTREM);
  const rgUnten = extremIndex(Rg.p.map((p) => p[1]), false, EPS_EXTREM);
  const rgHalb = halbZ(Rg, rgOben, rgUnten);
  const rgRechts = extremIndex(rgHalb.p.map((p) => p[2]), true, EPS_EXTREM);
  if (rgRechts <= 0 || rgRechts >= rgHalb.p.length - 1) return leer('Ringschleife: rechts fällt mit oben oder unten zusammen', achse);
  // gemeinsame Kreuzung rechts: a aus der Reihenschleife, h aus der Ringschleife, z gemittelt
  const rechts: V3 = [rwHalb.p[rwRechts]![0], rgHalb.p[rgRechts]![1], (rwHalb.p[rwRechts]![2] + rgHalb.p[rgRechts]![2]) / 2];
  const mitEnden = (zug: V3[], anfang: V3, ende: V3): V3[] => {
    const out = zug.slice();
    out[0] = anfang;
    out[out.length - 1] = ende;
    return out;
  };
  const Rw_vr = mitEnden(rwHalb.p.slice(0, rwRechts + 1), vorn, rechts);
  const Rw_rh = mitEnden(rwHalb.p.slice(rwRechts), rechts, hinten);
  const Rg_or = mitEnden(rgHalb.p.slice(0, rgRechts + 1), oben, rechts);
  const Rg_ru = mitEnden(rgHalb.p.slice(rgRechts), rechts, unten);
  // Ecken der Reihen- und Ringschleife (Knoten des jeweiligen Profils) als Bogenlängen auf ihren Bögen
  const eckenHalb = (f: Folge, halb: { idx: number[] }, blatt: Blatt, teil: number, bis: number, zug: readonly V3[], umkehren: boolean): number[] => {
    const out: number[] = [];
    for (const kn of ecken(dok, blatt)) {
      const i = knotenIndex(f.q, kn);
      if (i < 0) continue;
      const pos = halb.idx.indexOf(i);
      if (pos <= teil || pos >= bis) continue;
      const s = bogenLaengeBis(zug, pos - teil);
      out.push(umkehren ? laengen(zug)[zug.length - 1]! - s : s);
    }
    return out;
  };
  // ---- Schritte: Ringschleife = Ring ringF, Kanten je Bogen so, dass die Schritte beiderseits gleich lang sind ----
  const laenge = (zug: readonly V3[]) => laengen(zug)[zug.length - 1]!;
  const Lv = [laenge(S_vo), laenge(Rw_vr), laenge(S_uv)] as [number, number, number];
  const Lh = [laenge(S_oh), laenge(Rw_rh), laenge(S_hu)] as [number, number, number];
  const lv = (Lv[0] + Lv[1] + Lv[2]) / 3;
  const lh = (Lh[0] + Lh[1] + Lh[2]) / 3;
  const ringF = Math.max(1, Math.min(R - 2, Math.round((lv * (c / 2 + R - 1) - lh * (c / 2)) / (lv + lh))));
  const Ev = c / 2 + ringF;
  const Eh = c / 2 + (R - 1 - ringF);
  // Anker ab vorn (Schritt 0 = Spitze, c/2 = Ring 0, c/2 + i = Ring i) und ab hinten (c/2 + s = Ring R − 1 − s); Ecken verschiedener
  // Bögen einer Seite beim gleichen Anteil rasten gebündelt auf einen Schritt (ein Ring für die Ecke der Seite oben, unten und der
  // Reihenschleife — sonst zerfällt die Kante eines Kastens in zwei Ringe)
  // Krümmungsgewicht je Bogen: Schritte je Bogenmaß × Schrittlänge des Bogens
  const krFuer = (zug: readonly V3[], E: number) => (opt.kruemmung * laenge(zug)) / E;
  const gS_vo = gewichtet(S_vo, krFuer(S_vo, Ev));
  const gS_uv = gewichtet([...S_uv].reverse(), krFuer(S_uv, Ev));
  const gRw_vr = gewichtet(Rw_vr, krFuer(Rw_vr, Ev));
  const gS_oh = gewichtet([...S_oh].reverse(), krFuer(S_oh, Eh));
  const gS_hu = gewichtet(S_hu, krFuer(S_hu, Eh));
  const gRw_rh = gewichtet([...Rw_rh].reverse(), krFuer(Rw_rh, Eh));
  const buendeln = (E: number, listen: { g: Gewichtet; ecken: number[] }[], phi: readonly number[]): { s: number; k: number }[][] => {
    // Anteil einer Ecke in Schritten der gemeinsamen Dichte
    const schrittVon = (f: number) => {
      let k = 0;
      while (k + 1 < E && phi[k + 1]! <= f) k++;
      const d = phi[k + 1]! - phi[k]!;
      return (k + (d > 1e-15 ? (f - phi[k]!) / d : 0)) / E;
    };
    const alle: { l: number; s: number; f: number }[] = [];
    listen.forEach((x, l) => x.ecken.forEach((s2) => alle.push({ l, s: s2, f: schrittVon(s2 / x.g.total) })));
    alle.sort((a, b) => a.f - b.f);
    const out: { s: number; k: number }[][] = listen.map(() => []);
    let i = 0;
    while (i < alle.length) {
      let j = i;
      while (j + 1 < alle.length && alle[j + 1]!.f - alle[i]!.f <= ECKEN_BUENDEL && alle[j + 1]!.l !== alle[i]!.l) j++;
      let f = 0;
      for (let q = i; q <= j; q++) f += alle[q]!.f / (j - i + 1);
      const k = Math.max(1, Math.min(E - 1, Math.round(f * E)));
      for (let q = i; q <= j; q++) out[alle[q]!.l]!.push({ s: alle[q]!.s, k });
      i = j + 1;
    }
    return out;
  };
  const phiV = gemeinsameDichte([gS_vo, gRw_vr, gS_uv], Ev);
  const phiH = gemeinsameDichte([gS_oh, gRw_rh, gS_hu], Eh);
  const eV = buendeln(Ev, [
    { g: gS_vo, ecken: eckenAuf(kr0.vorn, kr0.oben, S_vo, false) },
    { g: gRw_vr, ecken: eckenHalb(Rw, rwHalb, reihenAnsicht, 0, rwRechts, Rw_vr, false) },
    { g: gS_uv, ecken: eckenAuf(kr0.unten, kr0.vorn, S_uv, true) },
  ], phiV);
  const eH = buendeln(Eh, [
    { g: gS_oh, ecken: eckenAuf(kr0.oben, kr0.hinten, S_oh, true) },
    { g: gRw_rh, ecken: eckenHalb(Rw, rwHalb, reihenAnsicht, rwRechts, rwHalb.p.length - 1, Rw_rh, true) },
    { g: gS_hu, ecken: eckenAuf(kr0.hinten, kr0.unten, S_hu, false) },
  ], phiH);
  const Ov = abtasten(gS_vo, Ev, eV[0]!, phiV);
  const Sv = abtasten(gRw_vr, Ev, eV[1]!, phiV);
  const Uv = abtasten(gS_uv, Ev, eV[2]!, phiV);
  const Oh = abtasten(gS_oh, Eh, eH[0]!, phiH);
  const Sh = abtasten(gRw_rh, Eh, eH[1]!, phiH);
  const Uh = abtasten(gS_hu, Eh, eH[2]!, phiH);
  // Vorlage: die Ringschleife, je Viertel c Kanten, Ecken auf Gitterpunkten; normiert auf die Anker oben/rechts/unten
  const gRg_or = gewichtet(Rg_or, krFuer(Rg_or, c));
  const gRg_ru = gewichtet(Rg_ru, krFuer(Rg_ru, c));
  const phiO = gemeinsameDichte([gRg_or], c);
  const phiU = gemeinsameDichte([gRg_ru], c);
  const To = abtasten(gRg_or, c, eckenHalb(Rg, rgHalb, ringAnsicht, 0, rgRechts, Rg_or, false).map((s2) => ({ s: s2 })), phiO);
  const Tu = abtasten(gRg_ru, c, eckenHalb(Rg, rgHalb, ringAnsicht, rgRechts, rgHalb.p.length - 1, Rg_ru, false).map((s2) => ({ s: s2 })), phiU);
  const zR = rechts[2] || 1e-9;
  const norm = (T: V3[], ende: V3) => T.map((p) => {
    const dh = ende[1] - rechts[1];
    const u = Math.abs(dh) > 1e-12 ? (p[1] - rechts[1]) / dh : 0;
    const v = p[2] / zR;
    return { u, v, da: p[0] - (rechts[0] + u * (ende[0] - rechts[0])) };
  });
  const vo = norm(To.punkte, oben);
  const vu = norm(Tu.punkte, unten);
  /** Vorlagenwerte bei Viertelanteil f (0 = oben/rechts … 1 = rechts/unten), linear zwischen den Gitterpunkten */
  const vorlage = (t: { u: number; v: number; da: number }[], f: number) => {
    const x = Math.min(c, Math.max(0, f * c));
    const i = Math.min(c - 1, Math.floor(x));
    const g = x - i;
    const a = t[i]!;
    const b = t[i + 1]!;
    return { u: a.u + (b.u - a.u) * g, v: a.v + (b.v - a.v) * g, da: a.da + (b.da - a.da) * g };
  };
  /** Lage eines Ringpunkts aus Ankern (O oben, Sd Seite, U unten) bei Anteil f des oberen (quer: false) bzw. unteren Viertels */
  const lage = (O: V3, Sd: V3, U: V3, untenHalb: boolean, f: number, rechtsSeite: boolean): V3 => {
    const t = untenHalb ? vorlage(vu, f) : vorlage(vo, f);
    const B = untenHalb ? U : O;
    const kipp = opt.kippen * (Sd[2] / zR);
    const a = Sd[0] + t.u * (B[0] - Sd[0]) + t.da * kipp;
    const h = Sd[1] + t.u * (B[1] - Sd[1]);
    const z = t.v * Sd[2] * (rechtsSeite ? 1 : -1);
    return [a, h, z];
  };
  // ---- Ziele aller Käfigpunkte (Kanon → Welt) ----
  const ziele = new Float64Array(3 * n);
  const setze = (p: number, q: V3) => {
    const w = W(q);
    ziele[3 * p] = w[0];
    ziele[3 * p + 1] = w[1];
    ziele[3 * p + 2] = w[2];
  };
  const v = abl.vorlage;
  const anker = (i: number): { O: V3; Sd: V3; U: V3 } => (i <= ringF ? { O: Ov.punkte[c / 2 + i]!, Sd: Sv.punkte[c / 2 + i]!, U: Uv.punkte[c / 2 + i]! } : { O: Oh.punkte[c / 2 + (R - 1 - i)]!, Sd: Sh.punkte[c / 2 + (R - 1 - i)]!, U: Uh.punkte[c / 2 + (R - 1 - i)]! });
  for (let i = 0; i < R; i++) {
    const { O, Sd, U } = anker(i);
    for (let j = 0; j < N; j++) {
      const rechtsSeite = j <= N / 2;
      const jj = rechtsSeite ? j : N - j;
      let q: V3;
      if (i === ringF) {
        // die Ringschleife selbst, genau
        const t = jj <= c ? To.punkte[jj]! : Tu.punkte[jj - c]!;
        q = [t[0], t[1], rechtsSeite ? t[2] : -t[2]];
      } else q = jj <= c ? lage(O, Sd, U, false, jj / c, rechtsSeite) : lage(O, Sd, U, true, (jj - c) / c, rechtsSeite);
      setze(v.ringPunkt(i, j), q);
    }
  }
  // Kappen: Quadratringe m = 1 … c/2 − 1 um die Spitze; Pfad je Viertel von der Mitte-Spalte über die Ecke zur Mitte-Zeile
  type Kappe = 'vorn' | 'hinten';
  const kappenAnker = (s: Kappe, m: number) => (s === 'vorn' ? { O: Ov.punkte[m]!, Sd: Sv.punkte[m]!, U: Uv.punkte[m]! } : { O: Oh.punkte[m]!, Sd: Sh.punkte[m]!, U: Uh.punkte[m]! });
  /** Punkt (p, q) auf dem Quadratring m: p längs z (rechts), q längs h (oben) */
  const kappenLage = (s: Kappe, m: number, p: number, q: number): V3 => {
    const { O, Sd, U } = kappenAnker(s, m);
    const untenHalb = q < 0;
    const ap = Math.abs(p);
    const aq = Math.abs(q);
    // Anteil des Viertelpfads: oben: (0, m) → (m, m) → (m, 0); unten: (m, 0) → (m, −m) → (0, −m)
    let e: number;
    if (!untenHalb) e = aq === m ? ap : m + (m - aq);
    else e = ap === m ? aq : m + (m - ap);
    return lage(O, Sd, U, untenHalb, e / (2 * m), p >= 0);
  };
  for (const s of ['vorn', 'hinten'] as const) {
    setze(s === 'vorn' ? v.naht.spitzeVorn : v.naht.spitzeHinten, s === 'vorn' ? vorn : hinten);
    for (let a = 1; a < c; a++) {
      for (let b = 1; b < c; b++) {
        const p = a - c / 2;
        const q = b - c / 2;
        const m = Math.max(Math.abs(p), Math.abs(q));
        if (m === 0) continue;
        setze(v.kappe(s, a, b), kappenLage(s, m, p, q));
      }
    }
  }
  // ---- Schleifenpunkte, Silhouettenbedingungen ----
  const naht = new Set<number>();
  const reihe: { p: number; quer: [number, number]; t: V3 }[] = [];
  const ringB: { p: number; quer: [number, number]; t: V3 }[] = [];
  for (let i = 0; i < R; i++) {
    naht.add(v.ringPunkt(i, 0));
    naht.add(v.ringPunkt(i, N / 2));
    for (const j of [c, 3 * c]) {
      const p = v.ringPunkt(i, j);
      const vorher = v.ringPunkt(i, j - 1);
      const nachher = v.ringPunkt(i, j + 1);
      // Tangente der Reihenschleife längs der Achse (Nachbarringe bzw. Kappe)
      const ta = i > 0 ? v.ringPunkt(i - 1, j) : v.kappe('vorn', j === c ? c - 1 : 1, c / 2);
      const tb = i < R - 1 ? v.ringPunkt(i + 1, j) : v.kappe('hinten', j === c ? c - 1 : 1, c / 2);
      reihe.push({ p, quer: [vorher, nachher], t: [ziele[3 * tb]! - ziele[3 * ta]!, ziele[3 * tb + 1]! - ziele[3 * ta + 1]!, ziele[3 * tb + 2]! - ziele[3 * ta + 2]!] });
    }
  }
  for (let j = 0; j < N; j++) {
    const p = v.ringPunkt(ringF, j);
    if (j === 0 || j === N / 2) continue;
    const a = v.ringPunkt(ringF, j - 1);
    const b = v.ringPunkt(ringF, j + 1);
    ringB.push({ p, quer: [v.ringPunkt(ringF - 1, j), v.ringPunkt(ringF + 1, j)], t: [ziele[3 * b]! - ziele[3 * a]!, ziele[3 * b + 1]! - ziele[3 * a + 1]!, ziele[3 * b + 2]! - ziele[3 * a + 2]!] });
  }
  for (const s of ['vorn', 'hinten'] as const) {
    naht.add(s === 'vorn' ? v.naht.spitzeVorn : v.naht.spitzeHinten);
    for (let m = 1; m < c / 2; m++) {
      naht.add(v.kappe(s, c / 2, c / 2 + m));
      naht.add(v.kappe(s, c / 2, c / 2 - m));
      for (const vz of [1, -1]) {
        const p = v.kappe(s, c / 2 + vz * m, c / 2);
        const quer: [number, number] = [v.kappe(s, c / 2 + vz * m, c / 2 - 1), v.kappe(s, c / 2 + vz * m, c / 2 + 1)];
        const ta = v.kappe(s, c / 2 + vz * (m - 1), c / 2);
        const tb = v.kappe(s, c / 2 + vz * (m + 1), c / 2);
        reihe.push({ p, quer, t: [ziele[3 * tb]! - ziele[3 * ta]!, ziele[3 * tb + 1]! - ziele[3 * ta + 1]!, ziele[3 * tb + 2]! - ziele[3 * ta + 2]!] });
      }
    }
  }
  // ---- Falten: Ringe (Ecken der Seite und der Reihenschleife), Reihen (Ecken der Ringschleife), Spitzen ----
  const eSchaerfe = new Float64Array(k.nE);
  const vSchaerfe = new Float64Array(k.n);
  const faltenRinge = new Map<number, Set<'oben' | 'unten' | 'seite'>>();
  const faltenKappen = new Map<string, Set<'oben' | 'unten' | 'seite'>>();
  const merke = (schritt: number, s: Kappe, seite: 'oben' | 'unten' | 'seite') => {
    if (schritt >= c / 2) {
      const i = s === 'vorn' ? schritt - c / 2 : R - 1 - (schritt - c / 2);
      if (!faltenRinge.has(i)) faltenRinge.set(i, new Set());
      faltenRinge.get(i)!.add(seite);
    } else if (schritt > 0) {
      const key = `${s}:${schritt}`;
      if (!faltenKappen.has(key)) faltenKappen.set(key, new Set());
      faltenKappen.get(key)!.add(seite);
    }
  };
  for (const s of Ov.schritte) merke(s, 'vorn', 'oben');
  for (const s of Uv.schritte) merke(s, 'vorn', 'unten');
  for (const s of Sv.schritte) merke(s, 'vorn', 'seite');
  for (const s of Oh.schritte) merke(s, 'hinten', 'oben');
  for (const s of Uh.schritte) merke(s, 'hinten', 'unten');
  for (const s of Sh.schritte) merke(s, 'hinten', 'seite');
  const seiteVon = (set: Set<'oben' | 'unten' | 'seite'>): 'oben' | 'unten' | 'seite' | 'beide' => (set.has('oben') && set.has('unten') ? 'beide' : set.has('oben') ? 'oben' : set.has('unten') ? 'unten' : 'seite');
  const gewichtBei = (set: Set<'oben' | 'unten' | 'seite'>, theta: number) => {
    let g = 0;
    for (const s of set) g = Math.max(g, faltenGewicht(theta, s));
    if (set.has('oben') && set.has('unten')) g = 1;
    return g;
  };
  const eckenNeu: Ecke[] = [];
  for (const [i, set] of faltenRinge) {
    const seiteE = seiteVon(set);
    eckenNeu.push({ ring: i, seite: seiteE === 'seite' ? 'beide' : seiteE });
    for (let j = 0; j < N; j++) {
      const e = kanteZwischen(k, v.ringPunkt(i, j), v.ringPunkt(i, j + 1));
      const g = gewichtBei(set, (2 * Math.PI * (j + 0.5)) / N);
      if (e >= 0 && g > 0) eSchaerfe[e] = Math.max(eSchaerfe[e]!, opt.schaerfe * g * g);
    }
  }
  for (const [key, set] of faltenKappen) {
    const [s, ms] = key.split(':') as [Kappe, string];
    const m = Number(ms);
    // Punkte des Quadratrings m der Reihe nach (gegen den Uhrzeigersinn ab oben)
    const pts: { a: number; b: number }[] = [];
    for (let e = 0; e < 8 * m; e++) {
      const t = e % (2 * m);
      const q4 = Math.floor(e / (2 * m));
      let p: number;
      let q: number;
      if (q4 === 0) [p, q] = t <= m ? [t, m] : [m, 2 * m - t];
      else if (q4 === 1) [p, q] = t <= m ? [m, -t] : [2 * m - t, -m];
      else if (q4 === 2) [p, q] = t <= m ? [-t, -m] : [-m, -(2 * m - t)];
      else [p, q] = t <= m ? [-m, t] : [-(2 * m - t), m];
      pts.push({ a: c / 2 + p, b: c / 2 + q });
    }
    for (let e = 0; e < pts.length; e++) {
      const p0 = pts[e]!;
      const p1 = pts[(e + 1) % pts.length]!;
      const ka = kanteZwischen(k, v.kappe(s, p0.a, p0.b), v.kappe(s, p1.a, p1.b));
      const theta = Math.atan2((p0.a + p1.a) / 2 - c / 2, (p0.b + p1.b) / 2 - c / 2);
      const g = gewichtBei(set, theta);
      if (ka >= 0 && g > 0) eSchaerfe[ka] = Math.max(eSchaerfe[ka]!, opt.schaerfe * g * g);
    }
  }
  const reihenFalten: number[] = [];
  const reiheScharf = (j: number) => {
    reihenFalten.push(j);
    for (const jj of [j, N - j]) {
      for (let i = 0; i + 1 < R; i++) {
        const e = kanteZwischen(k, v.ringPunkt(i, jj), v.ringPunkt(i + 1, jj));
        if (e >= 0) eSchaerfe[e] = opt.schaerfe;
      }
      // Kappendiagonale, wenn die Reihe am Kappeneck endet
      const diag = jj === c / 2 ? [1, 1] : jj === 3 * (c / 2) ? [1, -1] : jj === N - c / 2 ? [-1, 1] : jj === N - 3 * (c / 2) ? [-1, -1] : null;
      if (!diag) continue;
      for (const s of ['vorn', 'hinten'] as const) {
        for (let t = 0; t < c / 2; t++) {
          const e = kanteZwischen(k, v.kappe(s, c / 2 + diag[0]! * t, c / 2 + diag[1]! * t), v.kappe(s, c / 2 + diag[0]! * (t + 1), c / 2 + diag[1]! * (t + 1)));
          if (e >= 0) eSchaerfe[e] = opt.schaerfe;
        }
      }
    }
  };
  for (const s of To.schritte) reiheScharf(s);
  for (const s of Tu.schritte) reiheScharf(c + s);
  for (const s of spitzen) vSchaerfe[s === 'vorn' ? v.naht.spitzeVorn : v.naht.spitzeHinten] = opt.schaerfe;
  // ---- Unterteilung mit den neuen Falten, Grenzlöser ----
  const tU = jetzt();
  const k2: Kaefig = { ...k, xyz: Float64Array.from(k.xyz), eSchaerfe, vSchaerfe };
  const L = abl.unterteilung.stufen.length;
  const u2 = unterteilung(k2, L);
  const loeser2 = grenzLoeser(u2.grenze, n);
  const msUnterteilung = jetzt() - tU;
  // ---- Löser: Schleifen hart, Silhouette, Inneres weich, Glättung der Abweichung ----
  const nachK = kaefigNachbarlisten(k2);
  const nach3: number[][] = Array.from({ length: 3 * n }, () => []);
  for (let i = 0; i < n; i++) {
    for (let a = 0; a < 3; a++) {
      const l = nach3[3 * i + a]!;
      for (let b = 0; b < 3; b++) if (b !== a) l.push(3 * i + b);
      for (const j of nachK[i] ?? []) for (let b = 0; b < 3; b++) l.push(3 * j + b);
    }
  }
  const zeilen: NormalZeile[] = [];
  const rhsZiel: number[] = [];
  const achsZeile = (index: ArrayLike<number>, wert: ArrayLike<number>, achse3: 0 | 1 | 2, gewicht: number, ziel: number) => {
    const idx = new Array<number>(index.length);
    for (let t = 0; t < index.length; t++) idx[t] = 3 * index[t]! + achse3;
    zeilen.push({ index: idx, wert, gewicht });
    rhsZiel.push(ziel);
  };
  const dotZeile = (index: ArrayLike<number>, wert: ArrayLike<number>, w: V3, gewicht: number, ziel: number) => {
    const idx: number[] = [];
    const wt: number[] = [];
    for (let t = 0; t < index.length; t++) {
      for (let a = 0; a < 3; a++) {
        if (Math.abs(w[a]!) < 1e-12) continue;
        idx.push(3 * index[t]! + a);
        wt.push(wert[t]! * w[a]!);
      }
    }
    zeilen.push({ index: idx, wert: wt, gewicht });
    rhsZiel.push(ziel);
  };
  const istSchleife = new Uint8Array(n);
  for (const p of naht) istSchleife[p] = 1;
  for (const r of reihe) istSchleife[r.p] = 1;
  for (const r of ringB) istSchleife[r.p] = 1;
  // Faltenpunkte (Ecken-Knoten → scharfe Ringe und Reihen) sind gezeichnete Kanten: ebenfalls hart auf der Vorlage
  for (let e = 0; e < k2.nE; e++) {
    if (!(eSchaerfe[e]! > 0)) continue;
    istSchleife[k2.eA[e]!] = 1;
    istSchleife[k2.eB[e]!] = 1;
  }
  for (let i = 0; i < n; i++) {
    const z = grenzZeile(u2.grenze, i, n);
    const g = istSchleife[i] ? opt.gewicht : opt.innen;
    for (let a = 0; a < 3; a++) achsZeile(z.index, z.wert, a as 0 | 1 | 2, g, ziele[3 * i + a]!);
  }
  // Silhouette: quer zur Schleife ist die Differenz der Grenzlagen der Nachbarn senkrecht zur Umrissnormale w (in der Blattebene, ⊥ Tangente)
  const bedingung = (b: { p: number; quer: [number, number]; t: V3 }, ebene: 'reihe' | 'ring') => {
    // Reihenschleife: Blattebene (a, z) [Blick längs h]; Ringschleife: (h, z) [Blick längs a] — in Weltkoordinaten über W
    const tk = K(b.t);
    const wk: V3 = ebene === 'reihe' ? [tk[2], 0, -tk[0]] : [0, tk[2], -tk[1]];
    const l = Math.hypot(wk[0], wk[1], wk[2]);
    if (!(l > 1e-12)) return;
    const w = W([wk[0] / l, wk[1] / l, wk[2] / l]);
    const d = grenzDifferenz(u2.grenze, b.quer[1], b.quer[0], n);
    dotZeile(d.index, d.wert, w, opt.tangente, 0);
  };
  for (const b of reihe) bedingung(b, 'reihe');
  for (const b of ringB) bedingung(b, 'ring');
  // Glättung der Stufe 2 relativ zur Vorlage (Ziel der Zeile = Laplace der Vorlage)
  const gm = glaettemassFuer(u2, k2, { fair: opt.fair, fairBezug: 0, fairKappe: opt.fairKappe }, R * N);
  if (gm) {
    for (const z of gm.zeilen) {
      for (let a = 0; a < 3; a++) {
        let lt = 0;
        for (let q = 0; q < z.index.length; q++) lt += z.wert[q]! * ziele[3 * z.index[q]! + a]!;
        achsZeile(z.index, z.wert, a as 0 | 1 | 2, z.gewicht, lt);
      }
    }
  }
  const tl = jetzt();
  let sys;
  try {
    sys = normalSystem(3 * n, zeilen, nach3);
  } catch {
    let spur = 0;
    for (const z of zeilen) for (let t = 0; t < z.index.length; t++) spur += z.gewicht * z.wert[t]! * z.wert[t]!;
    sys = normalSystem(3 * n, zeilen, nach3, Math.max(1e-12, (1e-9 * spur) / Math.max(1, 3 * n)));
  }
  const rhs = new Float64Array(3 * n);
  zeilen.forEach((z, q) => {
    const g = z.gewicht * rhsZiel[q]!;
    if (!g) return;
    for (let t = 0; t < z.index.length; t++) rhs[z.index[t]!]! += z.wert[t]! * g;
  });
  const xyz = sys.loesenSpalte(rhs);
  const msLoeser = jetzt() - tl;
  const fein = anwenden3(u2.grenze, xyz);
  // ---- Bericht ----
  let restMax = 0;
  let restSum = 0;
  let restZahl = 0;
  let innenMax = 0;
  let innenSum = 0;
  let innenZahl = 0;
  for (let i = 0; i < n; i++) {
    const d = Math.hypot(fein[3 * i]! - ziele[3 * i]!, fein[3 * i + 1]! - ziele[3 * i + 1]!, fein[3 * i + 2]! - ziele[3 * i + 2]!) * PX;
    if (istSchleife[i]) {
      restMax = Math.max(restMax, d);
      restSum += d;
      restZahl++;
    } else {
      innenMax = Math.max(innenMax, d);
      innenSum += d;
      innenZahl++;
    }
  }
  let silhouette = 0;
  const winkel = (b: { p: number; quer: [number, number]; t: V3 }, ebene: 'reihe' | 'ring') => {
    const tk = K(b.t);
    const wk: V3 = ebene === 'reihe' ? [tk[2], 0, -tk[0]] : [0, tk[2], -tk[1]];
    const l = Math.hypot(wk[0], wk[1], wk[2]);
    if (!(l > 1e-12)) return;
    const w = W([wk[0] / l, wk[1] / l, wk[2] / l]);
    const d: V3 = [fein[3 * b.quer[1]]! - fein[3 * b.quer[0]]!, fein[3 * b.quer[1] + 1]! - fein[3 * b.quer[0] + 1]!, fein[3 * b.quer[1] + 2]! - fein[3 * b.quer[0] + 2]!];
    const ld = Math.hypot(d[0], d[1], d[2]);
    if (!(ld > 1e-12)) return;
    silhouette = Math.max(silhouette, (Math.asin(Math.min(1, Math.abs(d[0] * w[0] + d[1] * w[1] + d[2] * w[2]) / ld)) * 180) / Math.PI);
  };
  for (const b of reihe) winkel(b, 'reihe');
  for (const b of ringB) winkel(b, 'ring');
  // Überstand über die Silhouetten der Zeichnung (ohne 3 px an den Enden, wie `schleifenKoerper`)
  const breiten = abl.breiten;
  const nF = fein.length / 3;
  let xMin = Infinity;
  let xMax = -Infinity;
  let yMin = Infinity;
  let yMax = -Infinity;
  for (let p = 0; p < nF; p++) {
    xMin = Math.min(xMin, fein[3 * p]!);
    xMax = Math.max(xMax, fein[3 * p]!);
    yMin = Math.min(yMin, fein[3 * p + 1]!);
    yMax = Math.max(yMax, fein[3 * p + 1]!);
  }
  const rand = 3 / PX;
  let ueF = 0;
  let ueT = 0;
  for (let p = 0; p < nF; p++) {
    const x = fein[3 * p]!;
    const y = fein[3 * p + 1]!;
    const z = Math.abs(fein[3 * p + 2]!);
    if (y > yMin + rand && y < yMax - rand) {
      const f = breiten.front(y);
      if (f > 0 && z > f) ueF = Math.max(ueF, z - f);
    }
    if (x > xMin + rand && x < xMax - rand) {
      const t = breiten.top(x);
      if (t > 0 && z > t) ueT = Math.max(ueT, z - t);
    }
  }
  let kippung = 0;
  for (let i = 0; i < R; i++) {
    let lo = Infinity;
    let hi = -Infinity;
    for (let j = 0; j < N; j++) {
      const q = K([ziele[3 * v.ringPunkt(i, j)]!, ziele[3 * v.ringPunkt(i, j) + 1]!, ziele[3 * v.ringPunkt(i, j) + 2]!]);
      lo = Math.min(lo, q[0]);
      hi = Math.max(hi, q[0]);
    }
    kippung = Math.max(kippung, hi - lo);
  }
  const bericht: KaefigBericht = {
    ok: true,
    achse,
    ringF,
    schritte: { vorn: Ev, hinten: Eh },
    bogen: { vorn: Lv.map((x) => x * PX) as [number, number, number], hinten: Lh.map((x) => x * PX) as [number, number, number] },
    kreuzungen: { vorn: W(vorn), hinten: W(hinten), oben: W(oben), unten: W(unten), rechts: W(rechts) },
    punkte: { naht: naht.size, reihe: reihe.length, ring: ringB.length },
    rest: { max: restMax, mittel: restZahl ? restSum / restZahl : 0 },
    silhouette,
    innen: { max: innenMax, mittel: innenZahl ? innenSum / innenZahl : 0 },
    ueberstand: { front: ueF * PX, top: ueT * PX },
    kippung: kippung * PX,
    falten: { ringe: [...faltenRinge.keys()].sort((a, b) => a - b), kappen: faltenKappen.size, reihen: reihenFalten, spitzen },
    dichte: { vorn: phiV, hinten: phiH, oben: phiO, unten: phiU },
    unbekannte: 3 * n,
    huelle: sys.huelle,
    ms: jetzt() - t0,
    msUnterteilung,
    msLoeser,
  };
  const kaefig: Kaefig = { ...k2, xyz };
  return { abl: { ...abl, kaefig, unterteilung: u2, loeser: loeser2, fein, ziele, ecken: eckenNeu, spitzen: { vorn: spitzen.includes('vorn'), hinten: spitzen.includes('hinten') } }, bericht };
}
