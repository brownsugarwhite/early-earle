// Plan „Liniennetz, Zielform, Käfig“ (16.10.), S5 „Mittelebenen-Baum“: Bau eines Körpers aus Streifen der Seitenfläche
// (`ebene.ts`) mit der Topologie aus `kaefig/baumKaefig.ts`.
//
// Zielform (Form zuerst): je Streifen Querschnitt und Maßstab wie in der Röhre (`querschnitteFuer`, Sichthülle von Top und
// Front, S3-Berühren über alle Ringe aller Streifen gemeinsam). Der erste Ring eines angesetzten Kinds ist ein runder Ring auf
// der Sehne (Breite aus Top und Front dort); er ist zugleich das Ende der Elternsprossen darunter, deren Querschnitt im
// oberen Teil weich auf diesen Punkt übergeht (Hohlkehle). Gelöst wird wie in S2: Grenzfläche nahe den Zielen, glatt
// relativ zur Zielform, die feine Naht auf der ganzen schwarzen Linie, Breitenpunkte je Ring. DOM-frei.

import type { V2 } from '../../bezier';
import type { Dokument } from '../../dokument';
import { type BaumKaefig, type StreifenTopo, baumKaefig, kragenOrt } from '../../kaefig/baumKaefig';
import { type Kaefig, kanteZwischen } from '../../kaefig/halbkanten';
import { type Bedingung, ausgleichsLoeser, kaefigAusgleich } from '../../loeser/grenzflaeche';
import { type Unterteilung, unterteilung } from '../../subdivision/catmullClark';
import { anwenden3 } from '../../subdivision/matrix';
import { ABLEIT_STANDARD, type AbleitOptionen, type Breite, GLATTE_HAUT, type Querschnitt, type Sprosse, ausgleichsZiele, breiteSoll, glaettemassFuer, kreisQuerschnitt, lappenAusZug, nahtAnteile, nahtPfad, quadratRing, querschnitteFuer, umparametrisieren, umrissDicht } from '../ableiten';
import { punktAuf } from '../../bezier';
import { segmente } from '../../profil';
import { type Breiten, breitenAusPolygonen, silhouettenBreite } from '../breite';
import { huellenBreite } from '../fuelle';
import type { Zone } from '../pruefen/zonen';
import { frontBeruehren } from '../rand';
import { feinKette } from '../reifen';
import { type Ebene, RING_STANDARD, type RingOptionen, type StreifenRinge, ebene, ringeAuslegen } from './ebene';
import { type FeldOptionen, type Hoehenfeld, hoehenfeld } from './hoehenfeld';
import type { Teilbaum } from './teilbaum';

/** Topologie der Streifen aus Auslegung und Ringen. */
export function streifenTopologie(e: Ebene, ringe: readonly StreifenRinge[]): StreifenTopo[] {
  return e.streifen.map((st, s) => {
    const R = ringe[s]!.sprossen.length;
    const ende: StreifenTopo['ende'] = st.uebergang !== null ? { art: 'uebergang' } : { art: 'kappe' };
    if (!st.ansatz) return { R, N: st.N, anfang: { art: 'kappe' }, ende };
    const an = st.ansatz;
    if (an.art === 'fortsetzung') return { R, N: st.N, anfang: { art: 'fortsetzung', eltern: an.eltern, ende: 'ende' }, ende };
    const k = ringe[an.eltern]!.kinder.find((x) => x.streifen === s);
    if (!k) throw new Error(`streifenTopologie: Kind ${s} ohne Ringe im Elternstreifen`);
    if (k.tiefe > 0) return { R, N: st.N, anfang: { art: 'kragen', eltern: an.eltern, seite: an.seite, ring: k.ring, tiefe: k.tiefe }, ende };
    return { R, N: st.N, anfang: { art: 'seitlich', eltern: an.eltern, seite: an.seite, ring: k.ring }, ende };
  });
}

export type BaumOptionen = AbleitOptionen & {
  /** Anteil der Elternsprosse unter einer Sehne, über den ihr Querschnitt auf den Kindring übergeht */
  ansatzUebergang: number;
  /**
   * Querschnitt der Streifen mit Kindern: `lappen` (Front-Lappen wie in der Röhre; die flache Deckkante unter einem Kind
   * ersetzt der Übergang auf den Kindring) oder `kreis` (rund, Breite aus Top/Front, Fülle über S3). Steckt eine Flosse ohne
   * eigenen Streifen im Rumpf (überlappende Sehnenblöcke), ist er immer rund: sonst trüge jeder Ring ihren Stachel aus der
   * Front (Fisch 60° statt 32°). Gemessen 16.10.: Lappen Giraffe-Front 1,9 px statt 8,8, S-Hals-Ansatz 23° statt 28°.
   */
  elternQuerschnitt: 'kreis' | 'lappen';
  /** Ansatz seitlicher Kinder: Sehne (Kindring 0 auf der Sehne) oder Kragen (U-Schleife auf der Elternhaut, S5-Reste R1) */
  ansatz: RingOptionen['ansatz'];
  /** Mindestlänge der Kappen in Kantenlängen (0 = aus) */
  kappeKante: number;
  /**
   * Hebung der Seitenfläche: `ringe` (Querschnitt und Maßstab je Ring, S5) oder `feld` (ein Höhenfeld über der Seitenfläche,
   * R5); Feld-Optionen in `feld`
   */
  hebung: 'ringe' | 'feld';
  feld?: Partial<FeldOptionen>;
  /** Gewicht der feinen Feldpunkte im Löser (Hebung `feld`) */
  feldGewicht: number;
};

export const BAUM_STANDARD: BaumOptionen = { ...ABLEIT_STANDARD, ...GLATTE_HAUT, fuelle: 'mittel', ansatzUebergang: 0.35, elternQuerschnitt: 'lappen', ansatz: 'kragen', kappeKante: 0.8, hebung: 'ringe', feldGewicht: 1 };

export type BaumAbleitung = {
  opt: BaumOptionen;
  ebene: Ebene;
  ringe: StreifenRinge[];
  bk: BaumKaefig;
  /** Käfig mit gelösten Lagen */
  kaefig: Kaefig;
  unterteilung: Unterteilung;
  fein: Float64Array;
  ziele: Float64Array;
  breiten: Breiten;
  /** Zone je Käfigfläche (Faltenmaß): Kappe, Ansatz, frei */
  zone: (f: number) => Zone | undefined;
  /** Querschnitte je Streifen und Ring (nach dem Berühren) */
  querschnitte: Querschnitt[][];
  zeiten: { ebene: number; ringe: number; ziele: number; matrix: number; loeser: number; gesamt: number };
};

const uhr = (globalThis as { performance?: { now(): number } }).performance;
const jetzt = () => (uhr ? uhr.now() : Date.now());

/** Halbe Silhouette als offener Zug: Front (|z|, y) von oben nach unten, Top (x, |z|) von vorn nach hinten. */
function halbZug(dok: Dokument, blatt: 'front' | 'top'): V2[] {
  const sk = dok.skalierung;
  const pts: V2[] = [];
  segmente(dok.profile[blatt]).forEach((seg, si) => {
    for (let k = si === 0 ? 0 : 1; k <= 48; k++) {
      const q = punktAuf(seg, k / 48);
      pts.push(blatt === 'front' ? { x: Math.abs(q.x) * sk, y: q.y * sk } : { x: q.x * sk, y: Math.abs(q.y) * sk });
    }
  });
  if (blatt === 'front' ? pts[0]!.y < pts[pts.length - 1]!.y : pts[0]!.x > pts[pts.length - 1]!.x) pts.reverse();
  return pts;
}

/** Nächste Stelle (Index des Segmentanfangs, Punkt) eines offenen Zugs zu q. */
function stelleAufZug(zug: readonly V2[], q: V2): { i: number; p: V2 } {
  let best = { i: 0, p: zug[0]!, d: Infinity };
  for (let i = 0; i + 1 < zug.length; i++) {
    const a = zug[i]!;
    const b = zug[i + 1]!;
    const ab = { x: b.x - a.x, y: b.y - a.y };
    const f = Math.max(0, Math.min(1, ((q.x - a.x) * ab.x + (q.y - a.y) * ab.y) / (ab.x * ab.x + ab.y * ab.y || 1)));
    const p = { x: a.x + ab.x * f, y: a.y + ab.y * f };
    const d = Math.hypot(p.x - q.x, p.y - q.y);
    if (d < best.d) best = { i, p, d };
  }
  return best;
}

/** Ausbuchtung zwischen den Stellen von A und B durch die Sehne ersetzen. */
function sehneSchneiden(zug: readonly V2[], A: V2, B: V2): V2[] {
  let sa = stelleAufZug(zug, A);
  let sb = stelleAufZug(zug, B);
  if (sa.i > sb.i) [sa, sb] = [sb, sa];
  return [...zug.slice(0, sa.i + 1), sa.p, sb.p, ...zug.slice(sb.i + 1)];
}

/**
 * Silhouetten des Rumpfstreifens: Front und Top ohne die seitlichen Paare (S4-Sehnen in diesen Ansichten; Flügel, Beine,
 * Brustflossen baut erst S6). Sonst bekäme der Rumpf ihre Breite und ihren Stachel im Front-Lappen (Fisch). null = keine Paare.
 */
export function rumpfSilhouetten(dok: Dokument, b: Teilbaum): { frontHalb: V2[]; breiten: Breiten } | null {
  let front = halbZug(dok, 'front');
  let top = halbZug(dok, 'top');
  let geschnitten = false;
  for (const t of b.teile) {
    // nur Paare, die Front und Top zeigen (Brustflossen): Zeigt nur eine Ansicht das Paar, steckt es in der anderen im
    // Körper, und die Sehne liegt oft innerhalb der Körperbreite (Ente: Flügel nur im Top, Sehne bei 68 px, Körper 100 px)
    if (t.art !== 'paar' || !t.erkannt.front || !t.erkannt.top) continue;
    const f = t.erkannt.front;
    if (f) {
      front = sehneSchneiden(front, { x: Math.abs(f.schnitt[0].x), y: f.schnitt[0].y }, { x: Math.abs(f.schnitt[1].x), y: f.schnitt[1].y });
      geschnitten = true;
    }
    const o = t.erkannt.top;
    if (o) {
      top = sehneSchneiden(top, { x: o.schnitt[0].x, y: Math.abs(o.schnitt[0].y) }, { x: o.schnitt[1].x, y: Math.abs(o.schnitt[1].y) });
      geschnitten = true;
    }
  }
  if (!geschnitten) return null;
  const voll = (halb: V2[], spiegel: (p: V2) => V2) => [...halb, ...halb.slice().reverse().map(spiegel)];
  return { frontHalb: front, breiten: breitenAusPolygonen(voll(top, (p) => ({ x: p.x, y: -p.y })), voll(front, (p) => ({ x: -p.x, y: p.y }))) };
}

/** Querschnitte wie `querschnitteFuer`, die liegenden aus einem Front-Zug (ohne Ecken). */
function querschnitteAusZug(sprossen: readonly Sprosse[], frontHalb: readonly V2[], N: number, opt: AbleitOptionen): Querschnitt[] {
  if (!opt.querschnitt) return sprossen.map(() => kreisQuerschnitt(N));
  const zug = frontHalb.map((p) => ({ p, ecke: -1 }));
  const liegend = sprossen.map((sp) => Math.abs(sp.o.y - sp.u.y) >= opt.liegendAb * Math.abs(sp.o.x - sp.u.x));
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
      const q = lappenAusZug(zug, () => undefined, yLo, yHi, N);
      for (let k = i; k <= j; k++) out[k] = q;
    } else {
      const q = kreisQuerschnitt(N);
      for (let k = i; k <= j; k++) out[k] = q;
    }
    i = j + 1;
  }
  return out;
}

/** Maßstab eines Rings wie in der Röhre (Sichthülle: Top bei x, Front an der breitesten Stelle; rund ohne Zeichnung). */
function masstab(sp: Sprosse, q: Querschnitt, breiten: Breiten, letzteW: number): number {
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
  if (fBest > 0) W = Math.min(W, fBest);
  else W = Math.min(W, rund);
  if (!(W > 1e-6)) W = letzteW || 0.01 * breiten.topMax;
  return W;
}

/** Punkt j eines Rings (x, y auf der Sprosse, z = w · W, nie breiter als die Front auf seiner Höhe) und seine Höhe v. */
function punkt(sp: Sprosse, q: Querschnitt, W: number, j: number, breiten: Breiten): [number, number, number, number] {
  const hv = q.v[j]!;
  const x = sp.u.x + (sp.o.x - sp.u.x) * hv;
  const y = sp.u.y + (sp.o.y - sp.u.y) * hv;
  let z = q.w[j]! * W;
  const fb = breiten.front(y);
  if (fb > 0 && z > fb) z = fb;
  return [x, y, z, hv];
}

/**
 * R5 Höhenfeld: Ziele aller Käfigpunkte aus einem Feld H über der Seitenfläche (Körper z = ±H). Ringe, Kappenstationen und
 * der Übergang 2:1 legen nur die Lage ihrer Punkte in der Seite fest — nach der Bogenlänge ihres Profils (Sprosse, H) —, die
 * Tiefe ist H an dieser Stelle (Spiegelpunkt −H, Naht 0). Kragen, Sehne und Übergang brauchen keine eigenen Regeln.
 */
function feldZiele(e: Ebene, ringe: readonly StreifenRinge[], topo: readonly StreifenTopo[], bk0: BaumKaefig, H: (x: number, y: number) => number, setze: (p: number, x: number, y: number, z: number) => void): void {
  const setzePaar = (p: number, x: number, y: number, z: number) => {
    if (bk0.naht[p]) {
      setze(p, x, y, 0);
      return;
    }
    setze(p, x, y, z);
    const q = bk0.spiegel[p]!;
    if (q !== p) setze(q, x, y, -z);
  };
  // n + 1 Punkte von a nach b, gleich lang auf dem Profil (Lage in der Seite, H)
  const profil = (a: V2, b: V2, n: number): [number, number, number][] => {
    const M = 96;
    const P: [number, number, number][] = [];
    for (let k = 0; k <= M; k++) {
      const t = k / M;
      const x = a.x + (b.x - a.x) * t;
      const y = a.y + (b.y - a.y) * t;
      P.push([x, y, Math.max(0, H(x, y))]);
    }
    const cum = [0];
    for (let k = 1; k <= M; k++) cum.push(cum[k - 1]! + Math.hypot(P[k]![0] - P[k - 1]![0], P[k]![1] - P[k - 1]![1], P[k]![2] - P[k - 1]![2]));
    const out: [number, number, number][] = [];
    for (let j = 0; j <= n; j++) {
      const ziel = (cum[M]! * j) / n;
      let k = 0;
      while (k < M - 1 && cum[k + 1]! < ziel) k++;
      const d = cum[k + 1]! - cum[k]!;
      const f = d > 0 ? (ziel - cum[k]!) / d : 0;
      const A = P[k]!;
      const B = P[k + 1]!;
      out.push([A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f, A[2] + (B[2] - A[2]) * f]);
    }
    return out;
  };
  e.streifen.forEach((st, s) => {
    const N = st.N;
    const c = N / 4;
    const R = ringe[s]!.sprossen.length;
    for (let i = 0; i < R; i++) {
      // Ring 0 eines Kinds gehört dem Elternstreifen (Sehne, Kragen) bzw. der Übergangskappe; der letzte Ring vor einem
      // Übergang ist das U (unten)
      if (i === 0 && st.ansatz) continue;
      if (i === R - 1 && ringe[s]!.uebergang) continue;
      const sp = ringe[s]!.sprossen[i]!;
      const pts = profil(sp.o, sp.u, N / 2);
      for (let j = 0; j <= N / 2; j++) {
        if (!bk0.existiert(s, i, j)) continue;
        const [x, y, z] = pts[j]!;
        setzePaar(bk0.ring(s, i, j), x, y, z);
      }
    }
    for (const wo of ['anfang', 'ende'] as const) {
      if ((wo === 'anfang' ? topo[s]!.anfang : topo[s]!.ende).art !== 'kappe') continue;
      const spitze = wo === 'anfang' ? ringe[s]!.spitzen.anfang! : ringe[s]!.spitzen.ende;
      setze(bk0.kappe(s, wo, c / 2, c / 2), spitze.x, spitze.y, 0);
      const stK = wo === 'anfang' ? ringe[s]!.kappen.anfang : ringe[s]!.kappen.ende;
      for (let r = 1; r < c / 2; r++) {
        const sp = stK[r - 1]!;
        const pts = profil(sp.o, sp.u, 4 * r);
        for (let m = 0; m <= 4 * r; m++) {
          const [a, b] = quadratRing(c, r, m);
          const [x, y, z] = pts[m]!;
          setzePaar(bk0.kappe(s, wo, a, b), x, y, z);
        }
      }
    }
    // Übergang 2:1: Kindring 0 auf der Sehne (A → B), das U um die Sehne und die inneren U der Kappe
    const ue = ringe[s]!.uebergang;
    if (!ue) return;
    const kind = ue.kind;
    const Nk = e.streifen[kind]!.N;
    const sp0 = ringe[kind]!.sprossen[0]!;
    const kindPts = profil(sp0.o, sp0.u, Nk / 2);
    for (let j = 0; j <= Nk / 2; j++) {
      const [x, y, z] = kindPts[j]!;
      setzePaar(bk0.ring(kind, 0, j), x, y, z);
    }
    const kindPunkt = (j: number): V2 => ({ x: kindPts[j]![0], y: kindPts[j]![1] });
    const M = { x: (ue.A.x + ue.B.x) / 2, y: (ue.A.y + ue.B.y) / 2 };
    const L2 = Math.hypot(ue.A.x - M.x, ue.A.y - M.y) || 1e-9;
    const e1 = { x: (ue.A.x - M.x) / L2, y: (ue.A.y - M.y) / L2 };
    const spR = ringe[s]!.sprossen[R - 2]!;
    const mR = { x: (spR.o.x + spR.u.x) / 2, y: (spR.o.y + spR.u.y) / 2 };
    let e2 = { x: -e1.y, y: e1.x };
    if ((mR.x - M.x) * e2.x + (mR.y - M.y) * e2.y < 0) e2 = { x: -e2.x, y: -e2.y };
    for (let j = 0; j <= N / 2; j++) {
      const th = (Math.PI * j) / (N / 2);
      const P = { x: M.x + e1.x * L2 * Math.cos(th) + e2.x * ue.tiefe * Math.sin(th), y: M.y + e1.y * L2 * Math.cos(th) + e2.y * ue.tiefe * Math.sin(th) };
      setzePaar(bk0.ring(s, R - 1, j), P.x, P.y, Math.max(0, H(P.x, P.y)));
    }
    for (let r = 1; r < c / 2; r++) {
      const P0 = kindPunkt(c / 2 - r);
      const P1 = kindPunkt(c / 2 + r);
      const Mr = { x: (P0.x + P1.x) / 2, y: (P0.y + P1.y) / 2 };
      const wr = Math.hypot(P0.x - Mr.x, P0.y - Mr.y);
      const tr = (ue.tiefe * r) / (c / 2);
      for (let m = 1; m < 4 * r; m++) {
        const th = (Math.PI * m) / (4 * r);
        const [a, b] = quadratRing(c, r, m);
        const P = { x: Mr.x + e1.x * wr * Math.cos(th) + e2.x * tr * Math.sin(th), y: Mr.y + e1.y * wr * Math.cos(th) + e2.y * tr * Math.sin(th) };
        setzePaar(bk0.kappe(s, 'ende', a, b), P.x, P.y, Math.max(0, H(P.x, P.y)));
      }
    }
  });
}

/** Körper aus dem Mittelebenen-Baum bauen. */
export function baumAbleiten(dok: Dokument, optionen: Partial<BaumOptionen> = {}, baum?: Teilbaum): BaumAbleitung {
  const opt: BaumOptionen = { ...BAUM_STANDARD, ...optionen };
  const t0 = jetzt();
  const breiten = silhouettenBreite(dok);
  const e = ebene(dok, baum, breiten, opt.ansatz);
  const t1 = jetzt();
  const ringe = ringeAuslegen(e, breiten, { ...RING_STANDARD, ansatz: opt.ansatz, kappeKante: opt.kappeKante });
  const topo = streifenTopologie(e, ringe);
  const t2 = jetzt();
  const bk0 = baumKaefig(topo);
  const n = bk0.kaefig.n;
  const ziele = new Float64Array(3 * n);
  const gesetzt = new Uint8Array(n);
  const setze = (p: number, x: number, y: number, z: number) => {
    ziele[3 * p] = x;
    ziele[3 * p + 1] = y;
    ziele[3 * p + 2] = z;
    gesetzt[p] = 1;
  };
  // Silhouetten ohne seitliche Paare (S6) für den ganzen Bau: Die Paare liegen neben dem Rumpf, kein Mittelteil braucht ihre
  // Breite; der Rumpf bekäme sonst ihre Ausdehnung und ihren Stachel im Front-Lappen (Fisch)
  const rumpf = rumpfSilhouetten(dok, e.baum);
  const bz = rumpf?.breiten ?? breiten;
  let qs: Querschnitt[][];
  const beruehrt = new Set<string>();
  let feld: Hoehenfeld | null = null;
  if (opt.hebung === 'feld') {
    // R5: ein Höhenfeld über der Seitenfläche gibt jedem Käfigpunkt seine Tiefe (keine Querschnitte je Ring)
    feld = hoehenfeld(e.seite, bz, opt.feld ?? {});
    feldZiele(e, ringe, topo, bk0, feld.H, setze);
    qs = e.streifen.map((st, s) => ringe[s]!.sprossen.map(() => kreisQuerschnitt(st.N)));
  } else {
    // Querschnitte je Streifen; der erste Ring eines Kinds ist rund (seine Punkte liegen genau auf den Sehnenpunkten)
    // Silhouetten ohne seitliche Paare (S6) für den ganzen Bau: Die Paare liegen neben dem Rumpf, kein Mittelteil braucht ihre
    // Breite; der Rumpf bekäme sonst ihre Ausdehnung und ihren Stachel im Front-Lappen (Fisch)
    const breitenVon = (_s: number) => bz;
    qs = e.streifen.map((st, s) => {
      const flosseDrin = s === 0 && e.ueberlappt.length > 0;
      const rund = st.kinder.length > 0 && (opt.elternQuerschnitt === 'kreis' || flosseDrin);
      const o = rund ? { ...opt, querschnitt: false } : opt;
      const q = s === 0 && rumpf ? querschnitteAusZug(ringe[s]!.sprossen, rumpf.frontHalb, st.N, o) : querschnitteFuer(ringe[s]!.sprossen, dok, breiten, st.N, o);
      if (st.ansatz) q[0] = kreisQuerschnitt(st.N);
      return q;
    });
    const Ws: number[][] = e.streifen.map((_, s) => {
      let letzte = 0;
      return ringe[s]!.sprossen.map((sp, i) => (letzte = masstab(sp, qs[s]![i]!, breitenVon(s), letzte)));
    });
    // S3 „Umrisse berühren“ über alle Ringe aller Streifen gemeinsam (je Höhe der Ring, der dort am weitesten reicht)
    if (opt.fuelle) {
      const alle: { s: number; i: number }[] = [];
      e.streifen.forEach((_, s) => ringe[s]!.sprossen.forEach((__, i) => alle.push({ s, i })));
      const rand = frontBeruehren(
        alle.map(({ s, i }) => ringe[s]!.sprossen[i]!),
        alle.map(({ s, i }) => qs[s]![i]!),
        alle.map(({ s, i }) => Ws[s]![i]!),
        bz,
        opt.fuelle,
        huellenBreite(dok, bz),
      );
      alle.forEach(({ s, i }, k) => {
        if (!(i === 0 && e.streifen[s]!.ansatz)) qs[s]![i] = rand.vorlagen[k] as Querschnitt;
      });
      for (const p of rand.punkte) beruehrt.add(`${alle[p.i]!.s}/${alle[p.i]!.i}/${p.j}`);
    }
    // 1. Ringe und Spitzenkappen je Streifen
    e.streifen.forEach((st, s) => {
      const N = st.N;
      const c = N / 4;
      const R = ringe[s]!.sprossen.length;
      for (let i = 0; i < R; i++) {
        if (i === 0 && st.ansatz) continue;
        if (i === R - 1 && ringe[s]!.uebergang) continue;
        const sp = ringe[s]!.sprossen[i]!;
        const q = qs[s]![i]!;
        const W = Ws[s]![i]!;
        for (let j = 0; j <= N / 2; j++) {
          if (!bk0.existiert(s, i, j)) continue;
          const [x, y, z] = punkt(sp, q, W, j, bz);
          const naht = j === 0 || j === N / 2;
          setze(bk0.ring(s, i, j), x, y, naht ? 0 : z);
          if (naht) {
            const l = bk0.links(bk0.ring(s, i, j));
            if (l !== bk0.ring(s, i, j)) setze(l, x, y, 0);
          } else setze(bk0.ring(s, i, N - j), x, y, -z);
        }
      }
      for (const wo of ['anfang', 'ende'] as const) {
        if ((wo === 'anfang' ? topo[s]!.anfang : topo[s]!.ende).art !== 'kappe') continue;
        const spitze = wo === 'anfang' ? ringe[s]!.spitzen.anfang! : ringe[s]!.spitzen.ende;
        const q0 = qs[s]![wo === 'anfang' ? 0 : R - 1]!;
        const stK = wo === 'anfang' ? ringe[s]!.kappen.anfang : ringe[s]!.kappen.ende;
        setze(bk0.kappe(s, wo, c / 2, c / 2), spitze.x, spitze.y, 0);
        for (let r = 1; r < c / 2; r++) {
          const q = umparametrisieren(q0, 4 * r);
          const sp = stK[r - 1]!;
          const W = masstab(sp, q, bz, Ws[s]![wo === 'anfang' ? 0 : R - 1]!);
          for (let m = 0; m <= 4 * r; m++) {
            const [a, b] = quadratRing(c, r, m);
            const naht = m === 0 || m === 4 * r;
            const [x, y, z] = punkt(sp, q, W, m, bz);
            setze(bk0.kappe(s, wo, a, b), x, y, naht ? 0 : z);
            if (!naht) setze(bk0.kappe(s, wo, c - a, b), x, y, -z);
          }
        }
      }
    });
    // 2. erster Ring der Kinder (runder Ring auf der Sehne) — überschreibt die Sprossenenden des Elternstreifens. Ein Kragen
    //    liegt auf der Elternhaut: Jeder Kragenpunkt rutscht entlang seines Elternrings (Form bleibt) zur Naht hin bis zur
    //    Breite des runden Kindrings 0 an seinem Winkel (Fußabdruck des Kinds), nie von ihr weg (ist das Kind breiter als der
    //    Elternring an dieser Zeile, bleibt der Punkt; weiter weg rutschend fiel er am Fisch-Schwanzstiel auf die nächste Zeile).
    //    Ohne das lag das Bein des U am S-Hals 25 px unter A, der erste Kindring 14 px darüber, und der Löser drückte die
    //    Käfigpunkte zusammen (Seitenverhältnis 86)
    //    Die zwei Elternringe vor und hinter einem Bein rutschen anteilig mit (½, ¼): Bei dünnen Kindern lagen sonst alle
    //    Beinpunkte dicht an der Naht und der Ring davor auf seinen alten Zeilen (Trapez 2,4 : 23,6 px, Fisch-Rückenflosse).
    const rutschen = (sp: Sprosse, q: Querschnitt, W: number, seite: 'a' | 'b', h: number, zeile: number, zSoll: number) => {
      const prof = Array.from({ length: Math.min(h, zeile + 1) + 1 }, (_, t) => punkt(sp, q, W, seite === 'a' ? t : h - t, bz));
      const zBei = (t: number) => {
        const t0 = Math.min(prof.length - 2, Math.floor(t));
        return prof[t0]![2] + (prof[t0 + 1]![2] - prof[t0]![2]) * (t - t0);
      };
      const tMax = Math.min(prof.length - 1, zeile);
      let t = Math.min(0.2, tMax);
      while (t < tMax && zBei(t) < zSoll) t = Math.min(tMax, t + 0.01);
      return { t, lage: (tt: number) => {
        const t0 = Math.min(prof.length - 2, Math.floor(tt));
        const f = tt - t0;
        const a0 = prof[t0]!;
        const a1 = prof[t0 + 1]!;
        return [a0[0] + (a1[0] - a0[0]) * f, a0[1] + (a1[1] - a0[1]) * f, a0[2] + (a1[2] - a0[2]) * f] as const;
      } };
    };
    e.streifen.forEach((st, s) => {
      const an = topo[s]!.anfang;
      if (an.art !== 'kragen') return;
      const p = an.eltern;
      const Np = e.streifen[p]!.N;
      const h = Np / 2;
      const H = st.N / 2;
      const W0 = Ws[s]![0]!;
      for (let k = 1; k < H; k++) {
        const o = kragenOrt(topo[p]!, an, st.N, k);
        const zeile = an.seite === 'a' ? o.j : h - o.j;
        const r = rutschen(ringe[p]!.sprossen[o.i]!, qs[p]![o.i]!, Ws[p]![o.i]!, an.seite, h, zeile, W0 * Math.sin((Math.PI * k) / H));
        const [x, y, z] = r.lage(r.t);
        setze(bk0.ring(s, 0, k), x, y, z);
        setze(bk0.ring(s, 0, st.N - k), x, y, -z);
      }
      // Nachbarringe der Beine anteilig mitnehmen (nur freie Ringe: keine Endringe, keine Ecken, keine Ringe eines Blocks auf
      // derselben Seite; ein Block der Gegenseite lässt diese Zeilen frei)
      const R = ringe[p]!.sprossen.length;
      const belegt = new Set<number>([0, R - 1]);
      for (const kd of ringe[p]!.kinder) if (kd.seite === an.seite) for (let j = 0; j < kd.t.length; j++) belegt.add(kd.ring + j);
      for (const ec of ringe[p]!.ecken) belegt.add(ec.ring);
      const w = H - 2 * an.tiefe;
      for (const [bein, richtung] of [
        [an.ring, -1],
        [an.ring + w, 1],
      ] as const) {
        for (const [g, alpha] of [
          [1, 0.5],
          [2, 0.25],
        ] as const) {
          const i = bein + richtung * g;
          if (belegt.has(i)) break;
          for (let zeile = 1; zeile <= an.tiefe; zeile++) {
            const r = rutschen(ringe[p]!.sprossen[i]!, qs[p]![i]!, Ws[p]![i]!, an.seite, h, zeile, W0 * Math.sin((Math.PI * zeile) / H));
            const tNeu = (1 - alpha) * zeile + alpha * r.t;
            const [x, y, z] = r.lage(tNeu);
            const j = an.seite === 'a' ? zeile : h - zeile;
            setze(bk0.ring(p, i, j), x, y, z);
            setze(bk0.ring(p, i, Np - j), x, y, -z);
          }
        }
      }
    });
    e.streifen.forEach((st, s) => {
      if (!st.ansatz) return;
      if (topo[s]!.anfang.art === 'kragen') return;
      const N = st.N;
      const sp = ringe[s]!.sprossen[0]!;
      const q = qs[s]![0]!;
      const W = Ws[s]![0]!;
      for (let j = 0; j <= N / 2; j++) {
        const [x, y, z] = punkt(sp, q, W, j, bz);
        const naht = j === 0 || j === N / 2;
        setze(bk0.ring(s, 0, j), x, y, naht ? 0 : z);
        if (!naht) setze(bk0.ring(s, 0, N - j), x, y, -z);
      }
    });
    // 2b. Übergang 2:1 am Ende eines Streifens: der letzte Ring ist ein U um die Sehne (Tiefe ein Viertel der Sehne), die
    //     Quadratringe der Kappe kleinere U zwischen den Sehnenpunkten, die Mitte ist die Sehnenmitte (Kindring 0). Breite
    //     je Winkel θ gemischt aus dem letzten gewöhnlichen Ring und dem Kindring 0 (außen ⅓ Kind, innen mehr).
    e.streifen.forEach((st, s) => {
      const ue = ringe[s]!.uebergang;
      if (!ue) return;
      const N = st.N;
      const c = N / 4;
      const R = ringe[s]!.sprossen.length;
      const kind = ue.kind;
      const Nk = e.streifen[kind]!.N;
      const M = { x: (ue.A.x + ue.B.x) / 2, y: (ue.A.y + ue.B.y) / 2 };
      const L2 = Math.hypot(ue.A.x - M.x, ue.A.y - M.y) || 1e-9;
      const e1 = { x: (ue.A.x - M.x) / L2, y: (ue.A.y - M.y) / L2 };
      // Normale in den Rumpf: zur Mitte des letzten gewöhnlichen Rings
      const sp = ringe[s]!.sprossen[R - 2]!;
      const mR = { x: (sp.o.x + sp.u.x) / 2, y: (sp.o.y + sp.u.y) / 2 };
      let e2 = { x: -e1.y, y: e1.x };
      if ((mR.x - M.x) * e2.x + (mR.y - M.y) * e2.y < 0) e2 = { x: -e2.x, y: -e2.y };
      // Profile über den Winkel θ ∈ [0, π]: letzter gewöhnlicher Ring (N/2 Intervalle) und Kindring 0 (Nk/2 Intervalle)
      const profil = (werte: number[]) => (th: number) => {
        const x = (th / Math.PI) * (werte.length - 1);
        const i0 = Math.min(werte.length - 2, Math.max(0, Math.floor(x)));
        return werte[i0]! + (werte[i0 + 1]! - werte[i0]!) * (x - i0);
      };
      const zRing = profil(Array.from({ length: N / 2 + 1 }, (_, j) => Math.abs(ziele[3 * bk0.ring(s, R - 2, j) + 2]!)));
      const zKind = profil(Array.from({ length: Nk / 2 + 1 }, (_, j) => Math.abs(ziele[3 * bk0.ring(kind, 0, j) + 2]!)));
      const kindPunkt = (j: number): V2 => ({ x: ziele[3 * bk0.ring(kind, 0, j)]!, y: ziele[3 * bk0.ring(kind, 0, j) + 1]! });
      const setzeU = (p: number, q: number, P: V2, z: number) => {
        setze(p, P.x, P.y, z);
        if (q !== p) setze(q, P.x, P.y, -z);
      };
      // äußeres U = Ring R − 1
      for (let j = 0; j <= N / 2; j++) {
        const th = (Math.PI * j) / (N / 2);
        const P = { x: M.x + e1.x * L2 * Math.cos(th) + e2.x * ue.tiefe * Math.sin(th), y: M.y + e1.y * L2 * Math.cos(th) + e2.y * ue.tiefe * Math.sin(th) };
        const z = j === 0 || j === N / 2 ? 0 : (2 / 3) * zRing(th) + (1 / 3) * zKind(th);
        setzeU(bk0.ring(s, R - 1, j), bk0.ring(s, R - 1, (N - j) % N), P, z);
      }
      // innere U (Quadratring r) zwischen den Sehnenpunkten b = c/2 ± r (Kindring 0: j = c/2 ∓ r)
      for (let r = 1; r < c / 2; r++) {
        const P0 = kindPunkt(c / 2 - r);
        const P1 = kindPunkt(c / 2 + r);
        const Mr = { x: (P0.x + P1.x) / 2, y: (P0.y + P1.y) / 2 };
        const wr = Math.hypot(P0.x - Mr.x, P0.y - Mr.y);
        const tr = (ue.tiefe * r) / (c / 2);
        const al = 1 - (2 / 3) * (r / (c / 2));
        for (let m = 1; m < 4 * r; m++) {
          const th = (Math.PI * m) / (4 * r);
          const [a, b] = quadratRing(c, r, m);
          const P = { x: Mr.x + e1.x * wr * Math.cos(th) + e2.x * tr * Math.sin(th), y: Mr.y + e1.y * wr * Math.cos(th) + e2.y * tr * Math.sin(th) };
          const z = (1 - al) * zRing(th) + al * zKind(th);
          setzeU(bk0.kappe(s, 'ende', a, b), bk0.kappe(s, 'ende', c - a, b), P, a === c / 2 ? 0 : z);
        }
      }
    });
    // 3. Elternsprossen unter einer Sehne: im oberen Teil (Abstand d < U vom Sehnenende, in Anteilen der Sprosse) geht der
    //    eigene Querschnitt weich in den Punkt des Kindrings über — Hermite von (Wert, Steigung) bei d = U zu (Kindbreite,
    //    Steigung 0: die Fläche läuft senkrecht ins Kind). Addiert statt übergeblendet gab das Schultern mit Flügeln (Vase).
    //    Danach die Punkte der Sprosse nach Bogenlänge neu verteilt: Der runde Querschnitt legt sie oben dicht (für eine
    //    geschlossene Kuppe); offen unter dem Kind lagen die ersten drei fast auf einem Punkt (Vierecke 9 × 78 px).
    const U = opt.ansatzUebergang;
    e.streifen.forEach((st, s) => {
      const h = st.N / 2;
      for (const k of ringe[s]!.kinder) {
        if (k.tiefe > 0) continue;
        const kind = e.streifen[k.streifen]!;
        const H = kind.N / 2;
        const jEnde = k.seite === 'a' ? 0 : h;
        // die Ringe durch die Sehnenenden (r = 0, H) schließen auf der Naht und bleiben, wie sie sind: auf Breite 0 mit
        // Steigung 0 übergeblendet, wurden sie oben spitz (Grat quer über die Naht, Giraffe 30°)
        for (let r = 1; r < H; r++) {
          const i = k.ring + r;
          const sp = ringe[s]!.sprossen[i]!;
          const pEnde = bk0.ring(s, i, jEnde);
          const zKind = Math.abs(ziele[3 * pEnde + 2]!);
          const q = qs[s]![i]!;
          // Profil (d, z) der rechten Hälfte nach Pass 1, d aufsteigend (d = 0 am Sehnenende, 1 an der Naht gegenüber)
          const prof: { d: number; z: number }[] = [];
          for (let j = 0; j <= h; j++) prof.push({ d: k.seite === 'a' ? 1 - q.v[j]! : q.v[j]!, z: j === jEnde ? zKind : j === 0 || j === h ? 0 : ziele[3 * bk0.ring(s, i, j) + 2]! });
          prof.sort((x, y) => x.d - y.d);
          const zBei = (d: number): number => {
            for (let t = 0; t + 1 < prof.length; t++) {
              const a0 = prof[t]!;
              const a1 = prof[t + 1]!;
              if (d >= a0.d && d <= a1.d) return a1.d > a0.d ? a0.z + ((a1.z - a0.z) * (d - a0.d)) / (a1.d - a0.d) : a0.z;
            }
            return d <= prof[0]!.d ? prof[0]!.z : prof[prof.length - 1]!.z;
          };
          const eps = 1e-3;
          const zU = zBei(U);
          const mU = (zBei(Math.min(1, U + eps)) - zBei(Math.max(0, U - eps))) / (Math.min(1, U + eps) - Math.max(0, U - eps));
          const zProfil = (d: number): number => {
            if (d >= U) return zBei(d);
            const t = 1 - d / U;
            const h00 = 2 * t * t * t - 3 * t * t + 1;
            const h10 = t * t * t - 2 * t * t + t;
            const h01 = -2 * t * t * t + 3 * t * t;
            return Math.max(0, h00 * zU + h10 * (-mU * U) + h01 * zKind);
          };
          // dicht abtasten, nach Bogenlänge (Sprossenlänge × d, z) neu verteilen
          const L = Math.hypot(sp.o.x - sp.u.x, sp.o.y - sp.u.y);
          const M = 96;
          const cum = [0];
          let zAlt = zProfil(0);
          for (let m = 1; m <= M; m++) {
            const zn = zProfil(m / M);
            cum.push(cum[m - 1]! + Math.hypot(L / M, zn - zAlt));
            zAlt = zn;
          }
          const vNeu: number[] = [];
          const wNeu: number[] = [];
          const W = Ws[s]![i]! || 1;
          for (let j = 0; j <= h; j++) {
            // Index ab dem Sehnenende
            const jj = k.seite === 'a' ? j : h - j;
            const ziel = (cum[M]! * jj) / h;
            let m = 0;
            while (m < M - 1 && cum[m + 1]! < ziel) m++;
            const dd = cum[m + 1]! - cum[m]!;
            const d = (m + (dd > 0 ? (ziel - cum[m]!) / dd : 0)) / M;
            const v = k.seite === 'a' ? 1 - d : d;
            const z = j === jEnde ? zKind : j === 0 || j === h ? 0 : zProfil(d);
            vNeu.push(v);
            wNeu.push(z / W);
            if (j === jEnde || j === 0 || j === h) continue;
            const x = sp.u.x + (sp.o.x - sp.u.x) * v;
            const y = sp.u.y + (sp.o.y - sp.u.y) * v;
            setze(bk0.ring(s, i, j), x, y, z);
            setze(bk0.ring(s, i, st.N - j), x, y, -z);
          }
          qs[s]![i] = { v: vNeu, w: wNeu, haerte: [], knoten: [] };
        }
      }
    });
  }
  for (let p = 0; p < n; p++) if (!gesetzt[p]) throw new Error(`baumAbleiten: Punkt ${p} ohne Ziel`);
  // Topologie mit Orientierung nach den Zielen
  const bk = baumKaefig(topo, (p) => [ziele[3 * p]!, ziele[3 * p + 1]!, ziele[3 * p + 2]!]);
  const k = bk.kaefig;
  // Falten aus gezeichneten Ecken: Ringfalte auf der Seite der Ecke (Gewicht cos² wie `faltenSetzen`), Spitzen scharf
  if (opt.eckenSchaerfe > 0) {
    e.streifen.forEach((st, s) => {
      const N = st.N;
      const c = N / 4;
      for (const ec of ringe[s]!.ecken) {
        for (let j = 0; j < N; j++) {
          const th = (2 * Math.PI * (j + 0.5)) / N;
          const w = ec.seite === 'beide' ? 1 : ec.seite === 'a' ? Math.max(0, Math.cos(th)) : Math.max(0, -Math.cos(th));
          if (!(w > 0) || !bk.existiert(s, ec.ring, j) || !bk.existiert(s, ec.ring, j + 1)) continue;
          const kante = kanteZwischen(k, bk.ring(s, ec.ring, j), bk.ring(s, ec.ring, j + 1));
          if (kante >= 0) k.eSchaerfe[kante] = opt.eckenSchaerfe * w * w;
        }
      }
      if (ringe[s]!.spitzenEcke.anfang && topo[s]!.anfang.art === 'kappe') k.vSchaerfe[bk.kappe(s, 'anfang', c / 2, c / 2)] = opt.eckenSchaerfe;
      if (ringe[s]!.spitzenEcke.ende && topo[s]!.ende.art === 'kappe') k.vSchaerfe[bk.kappe(s, 'ende', c / 2, c / 2)] = opt.eckenSchaerfe;
    });
  }
  const t3 = jetzt();

  // Lösen
  const u = unterteilung(k, opt.stufen);
  const t4 = jetzt();
  let fein = anwenden3(u.grenze, ziele);
  const nF = fein.length / 3;
  const feinIdx: number[] = [];
  for (let i = 0; i < nF; i++) if (Math.abs(fein[3 * i + 2]!) < 1e-7) feinIdx.push(i);
  const umriss = umrissDicht(dok);
  const letzte = u.stufen[u.stufen.length - 1]!.kaefig;
  const start = bk.kappe(0, 'anfang', 2, 2);
  const pfad = nahtPfad(letzte, feinIdx, start, k.n);
  const nahtFein = Uint32Array.from(pfad.geordnet);
  const anteil = nahtAnteile(pfad.geordnet, k.n, ziele, umriss);
  const breite = feld ? null : baumBreite(e, ringe, qs, bk, u, ziele, bz, beruehrt, opt);
  const bedingungen: Bedingung[] = [];
  for (let i = 0; i < k.n; i++) bedingungen.push({ zeile: i, gewicht: 1 });
  for (let q = 0; q < nahtFein.length; q++) bedingungen.push({ zeile: nahtFein[q]!, gewicht: opt.nahtGewicht });
  if (breite) for (let q = 0; q < breite.fein.length; q++) bedingungen.push({ zeile: breite.fein[q]!, gewicht: opt.breiteGewicht * (breite.gewicht?.[q] ?? 1) });
  // R5: feine Punkte bis Stufe 1 (Punktnummern bleiben über die Stufen) auf das Feld — Lage in der Seite wie die aktuelle
  // Grenzlage, z = ±H dort. Mit Zielen nur an den Käfigpunkten lag die Fläche dazwischen bis 5 px innen (Giraffe-Front 5,1)
  const feldFein: number[] = [];
  const feldVz: number[] = [];
  if (feld) {
    const n1 = u.stufen[0]!.kaefig.n;
    for (let i = 0; i < n1; i++) {
      const z = fein[3 * i + 2]!;
      if (Math.abs(z) < 1e-7) continue;
      feldFein.push(i);
      feldVz.push(z > 0 ? 1 : -1);
    }
    for (const i of feldFein) bedingungen.push({ zeile: i, gewicht: opt.feldGewicht });
  }
  const mitFeld = (basis: Float64Array, lagen: Float64Array): Float64Array => {
    if (!feld || !feldFein.length) return basis;
    const out = new Float64Array(basis.length + 3 * feldFein.length);
    out.set(basis);
    feldFein.forEach((p, q) => {
      const x = lagen[3 * p]!;
      const y = lagen[3 * p + 1]!;
      const o = basis.length + 3 * q;
      out[o] = x;
      out[o + 1] = y;
      out[o + 2] = feldVz[q]! * feld!.H(x, y);
    });
    return out;
  };
  const loeser = ausgleichsLoeser(u.grenze, k.n, bedingungen, undefined, glaettemassFuer(u, k, opt, bk.kappeAb));
  let xyz = kaefigAusgleich(loeser, mitFeld(ausgleichsZiele(k.n, ziele, umriss, nahtFein, anteil, breite, bz, fein), fein));
  fein = anwenden3(u.grenze, xyz);
  for (let d = 0; (breite || feldFein.length) && d < 2; d++) {
    xyz = kaefigAusgleich(loeser, mitFeld(ausgleichsZiele(k.n, ziele, umriss, nahtFein, anteil, breite, bz, fein), fein));
    fein = anwenden3(u.grenze, xyz);
  }
  const t5 = jetzt();
  const zone = baumZonen(e, ringe, bk);
  return { opt, ebene: e, ringe, bk, kaefig: { ...k, xyz }, unterteilung: u, fein, ziele, breiten: bz, zone, querschnitte: qs, zeiten: { ebene: t1 - t0, ringe: t2 - t1, ziele: t3 - t2, matrix: t4 - t3, loeser: t5 - t4, gesamt: t5 - t0 } };
}

/**
 * Breitenpunkte aller Streifen (wie `breitenSchleife`): je Ring die breitesten Punkte der Vorlage (und die Berührpunkte aus
 * S3), dazu die feinen Punkte längs der Kanten zwischen zwei Breitenpunkten derselben Schleife. Nicht im Übergang unter
 * einer Sehne (dort gibt der Kindring die Breite vor).
 */
function baumBreite(e: Ebene, ringe: readonly StreifenRinge[], qs: readonly Querschnitt[][], bk: BaumKaefig, u: Unterteilung, ziele: Float64Array, breiten: Breiten, beruehrt: ReadonlySet<string>, opt: BaumOptionen): Breite | null {
  if (!(opt.breiteGewicht > 0)) return null;
  const fein: number[] = [];
  const vorzeichen: number[] = [];
  const faktor: number[] = [];
  const gewicht: number[] = [];
  // Kragenpunkte (Kindring 0 auf der Elternhaut): ohne Breitenpunkt, sie gehören dem Übergang ins Kind
  const kragen = new Set<number>();
  bk.streifen.forEach((t, s) => {
    if (t.anfang.art === 'kragen') for (let j = 0; j < t.N; j++) kragen.add(bk.ring(s, 0, j));
  });
  e.streifen.forEach((st, s) => {
    const N = st.N;
    const R = ringe[s]!.sprossen.length;
    // Übergang unter Sehnen: Ringe und Seite
    const uebergang = new Map<number, 'a' | 'b'>();
    for (const k of ringe[s]!.kinder) if (k.tiefe === 0) for (let r = 0; r <= e.streifen[k.streifen]!.N / 2; r++) uebergang.set(k.ring + r, k.seite);
    const breit: Float64Array[] = [];
    for (let i = 0; i < R; i++) {
      const zeile = new Float64Array(N);
      breit.push(zeile);
      if (i === 0 && st.ansatz) continue;
      if (i === R - 1 && ringe[s]!.uebergang) continue;
      const q = qs[s]![i]!;
      let wBest = 0;
      for (let j = 1; j < N / 2; j++) wBest = Math.max(wBest, q.w[j] ?? 0);
      if (!(wBest > 0)) continue;
      const seite = uebergang.get(i);
      for (let j = 1; j < N / 2; j++) {
        if (seite) {
          const d = seite === 'a' ? 1 - q.v[j]! : q.v[j]!;
          if (d < opt.ansatzUebergang) continue;
        }
        if (!bk.existiert(s, i, j) || (i > 0 && kragen.has(bk.ring(s, i, j)))) continue;
        const p = bk.ring(s, i, j);
        const beruehrPunkt = beruehrt.has(`${s}/${i}/${j}`);
        let f = (q.w[j] ?? 0) / wBest;
        if (beruehrPunkt) {
          const B = breiteSoll(breiten, ziele[3 * p]!, ziele[3 * p + 1]!, ziele[3 * p + 2]!);
          f = B > 1e-9 ? Math.min(1, Math.abs(ziele[3 * p + 2]!) / B) : 0;
        }
        if (f < 0.95 && !(beruehrPunkt && f > 0)) continue;
        if (!(breiten.top(ziele[3 * p]!) > 0) || !(breiten.front(ziele[3 * p + 1]!) > 0)) continue;
        zeile[j] = beruehrPunkt ? 0 : f;
        fein.push(p, bk.ring(s, i, N - j));
        vorzeichen.push(1, -1);
        faktor.push(f, f);
        const g = beruehrPunkt ? (opt.randGewicht ?? 0.25) : 1;
        gewicht.push(g, g);
      }
    }
    for (let i = 0; i + 1 < R; i++) {
      for (let j = 1; j < N / 2; j++) {
        const f0 = breit[i]![j]!;
        const f1 = breit[i + 1]![j]!;
        if (!(f0 > 0) || !(f1 > 0)) continue;
        if (!bk.existiert(s, i, j) || !bk.existiert(s, i + 1, j)) continue;
        for (const [jj, sg] of [
          [j, 1],
          [N - j, -1],
        ] as const) {
          const kette = feinKette(u, bk.kaefig, bk.ring(s, i, jj), bk.ring(s, i + 1, jj));
          for (let t = 1; t + 1 < kette.length; t++) {
            fein.push(kette[t]!);
            vorzeichen.push(sg);
            faktor.push(f0 + ((f1 - f0) * t) / (kette.length - 1));
            gewicht.push(1);
          }
        }
      }
    }
  });
  return fein.length ? { fein: Uint32Array.from(fein), vorzeichen: Int8Array.from(vorzeichen), faktor: Float64Array.from(faktor), ...(gewicht.some((g) => g !== 1) ? { gewicht: Float64Array.from(gewicht) } : {}) } : null;
}

/** Zonen je Käfigfläche: Spitzenkappen, Ansatz (Elternringe um die Sehne auf ihrer Seite, die ersten zwei Kindringe), sonst frei. */
function baumZonen(e: Ebene, ringe: readonly StreifenRinge[], bk: BaumKaefig): (f: number) => Zone | undefined {
  const k = bk.kaefig;
  const ansatz = new Uint8Array(k.nF);
  for (let f = 0; f < k.nF; f++) {
    const i = bk.flaecheRing[f]!;
    if (i < 0) continue;
    const s = bk.flaecheStreifen[f]!;
    const j = bk.flaecheJ[f]!;
    const st = e.streifen[s]!;
    const N = st.N;
    const R = ringe[s]!.sprossen.length;
    if (st.ansatz && i < 2) ansatz[f] = 1;
    if (ringe[s]!.uebergang && i >= R - 2) ansatz[f] = 1;
    for (const kd of ringe[s]!.kinder) {
      if (i < kd.ring - 1 || i >= kd.ring + kd.t.length) continue;
      const oben = j < N / 4 || j >= (3 * N) / 4;
      if ((kd.seite === 'a') === oben) ansatz[f] = 1;
    }
  }
  return (fl: number) => (bk.flaecheArt[fl] === 'kappe' ? 'kappe' : bk.flaecheArt[fl] === 'uebergang' || ansatz[fl] ? 'ansatz' : 'frei');
}

/**
 * Ausnahme für das Δ-Maß in S5: Bereiche seitlicher Paare (S4) in Front und Top (beide Seiten, 3 px Rand) — Flügel, Beine,
 * Brustflossen baut erst S6.
 */
export function paarAusnahme(b: Teilbaum, rand = 3 / 461): (a: 'seite' | 'front' | 'top', p: V2) => boolean {
  const flaechen: { blatt: 'front' | 'top'; poly: V2[] }[] = [];
  for (const t of b.teile) {
    if (t.art !== 'paar') continue;
    for (const blatt of ['front', 'top'] as const) {
      const e = t.erkannt[blatt];
      if (!e) continue;
      flaechen.push({ blatt, poly: e.umriss });
      flaechen.push({ blatt, poly: e.umriss.map((q) => (blatt === 'front' ? { x: -q.x, y: q.y } : { x: q.x, y: -q.y })) });
    }
  }
  const nah = (poly: readonly V2[], q: V2) => {
    let drin = false;
    let d = Infinity;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i]!;
      const c = poly[j]!;
      if (a.y > q.y !== c.y > q.y && q.x < ((c.x - a.x) * (q.y - a.y)) / (c.y - a.y || 1e-12) + a.x) drin = !drin;
      const ab = { x: c.x - a.x, y: c.y - a.y };
      const f = Math.max(0, Math.min(1, ((q.x - a.x) * ab.x + (q.y - a.y) * ab.y) / (ab.x * ab.x + ab.y * ab.y || 1)));
      d = Math.min(d, Math.hypot(a.x + ab.x * f - q.x, a.y + ab.y * f - q.y));
    }
    return drin || d < rand;
  };
  return (a, p) => a !== 'seite' && flaechen.some((f) => f.blatt === a && nah(f.poly, p));
}

/** Dreiecke des feinen Netzes ohne Index mit gemittelten Eckennormalen (Anzeige als Geist im Editor). */
export function baumDreiecke(b: BaumAbleitung): { positionen: Float32Array; normalen: Float32Array } {
  const k = b.unterteilung.stufen[b.unterteilung.stufen.length - 1]!.kaefig;
  const P = b.fein;
  const nP = P.length / 3;
  const nrm = new Float64Array(3 * nP);
  const tri: number[] = [];
  for (let f = 0; f < k.nF; f++) {
    const a0 = k.fStart[f]!;
    const e = k.fStart[f + 1]!;
    for (let h = a0 + 1; h + 1 < e; h++) tri.push(k.fVerts[a0]!, k.fVerts[h]!, k.fVerts[h + 1]!);
  }
  for (let t = 0; t < tri.length; t += 3) {
    const a = tri[t]!;
    const c = tri[t + 1]!;
    const d = tri[t + 2]!;
    const ux = P[3 * c]! - P[3 * a]!;
    const uy = P[3 * c + 1]! - P[3 * a + 1]!;
    const uz = P[3 * c + 2]! - P[3 * a + 2]!;
    const vx = P[3 * d]! - P[3 * a]!;
    const vy = P[3 * d + 1]! - P[3 * a + 1]!;
    const vz = P[3 * d + 2]! - P[3 * a + 2]!;
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    for (const q of [a, c, d]) {
      nrm[3 * q] = nrm[3 * q]! + nx;
      nrm[3 * q + 1] = nrm[3 * q + 1]! + ny;
      nrm[3 * q + 2] = nrm[3 * q + 2]! + nz;
    }
  }
  const positionen = new Float32Array(tri.length * 3);
  const normalen = new Float32Array(tri.length * 3);
  tri.forEach((q, i) => {
    const l = Math.hypot(nrm[3 * q]!, nrm[3 * q + 1]!, nrm[3 * q + 2]!) || 1;
    for (let c = 0; c < 3; c++) {
      positionen[3 * i + c] = P[3 * q + c]!;
      normalen[3 * i + c] = nrm[3 * q + c]! / l;
    }
  });
  return { positionen, normalen };
}

/** Punkte und Vierecke des feinen Netzes (für Maße und Bilder). */
export function baumFeinesNetz(b: BaumAbleitung): { punkte: [number, number, number][]; flaechen: number[][] } {
  const k = b.unterteilung.stufen[b.unterteilung.stufen.length - 1]!.kaefig;
  const punkte: [number, number, number][] = [];
  for (let i = 0; i < b.fein.length / 3; i++) punkte.push([b.fein[3 * i]!, b.fein[3 * i + 1]!, b.fein[3 * i + 2]!]);
  const flaechen: number[][] = [];
  for (let f = 0; f < k.nF; f++) {
    const q: number[] = [];
    for (let h = k.fStart[f]!; h < k.fStart[f + 1]!; h++) q.push(k.fVerts[h]!);
    flaechen.push(q);
  }
  return { punkte, flaechen };
}

export type { V2 };
