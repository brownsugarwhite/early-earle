// Prüfplan P1 „Ansichten als Illustration“, Tag 4–5 „Teile an der Naht“ (03.11.2026): Kinder über Fenster am Eltern-Käfig.
//
// Der Rumpf ist ein Einteiler aus seinen Schleifen (`schleifenKern.ts`): die Seite mit geraden Sehnen statt der Kinder-Bögen,
// Front und Top aus der Zeichnung auf die Ausdehnung des Rumpfs beschnitten (seitliche Paare als Sehne), Tiefe aus der
// Sichthülle. Ein Kind ist eine eigene Röhre in einem **Fenster** des Eltern-Gitters: Ring 0 des Kindes ist der Fensterrand
// (Punkte des Rumpfs), die Fensterflächen wandern als Kappe an die Spitze des Kindes — kein Punkt entfernt, wie die
// Ausstülpung der Beine (Beweis 3). Zwei Fenster: ein **Rechteck** auf dem Rücken oder Bauch (Ringe iA … iB, Spalten ± Cw/2
// um die Naht; die Sehnenenden sind Stützstellen, die Ringe iA und iB laufen genau durch sie) und die **Fortsetzung** über
// eine Kappe (Sehne über der Spitze: Kappe und Ringe 0 … k werden das Kind, Ring k läuft durch die Sehnenenden). Die Ringe
// des Kindes liegen mit ihren Nahtpunkten auf dem gezeichneten Bogen (Schleifenpunkte), seitlich auf der Sichthülle (Breite
// am Ringmittelpunkt, Silhouettenbedingung), dazwischen Ellipsen nach dem Bogenanteil des Fensterrands; die Kappe des Kindes
// sind die Stufen des Fensters (Rechteckringe bzw. Eltern-Ringe und Quadratringe), zuletzt ein Grat oder eine Spitze auf dem
// Bogen. Ein Löser über alle Teile. Kinder kommen aus dem S4-Teilbaum (Mitte-Teile der Seite) und aus den Seitenflächen des
// Planers, die kein Baum-Teil deckt (Pilz-Stiel); seitliche Paare (Flügel) bleiben im zweiten Schritt. DOM-frei.
import type { V2 } from '../bezier';
import type { Dokument } from '../dokument';
import { orientieren } from '../kaefig/baumKaefig';
import { type Kaefig, type V3, alleFlaechen, kaefigAusFlaechen, kanteZwischen, pruefeKaefig, volumen } from '../kaefig/halbkanten';
import type { Roehre } from '../kaefig/roehre';
import { grenzLoeser } from '../loeser/grenzflaeche';
import { unterteilung } from '../subdivision/catmullClark';
import type { Ableitung } from './ableiten';
import { type Huelle, huelle, schnittIntervalle } from './grundkoerper/huelle';
import { teilbaum } from './grundkoerper/teilbaum';
import { type Band, type Blatt, type BogenName, type KaefigAchse, type KaefigBericht, type KaefigOptionen, type SeitenLage, type TeileBericht, PX, achseWaehlen, dist, eckenKnoten, einteilZiele, faltenAnwenden, jetzt, kaefigLoesen, kaefigMasse, laengen, leer, punktBei, rahmenFuer } from './schleifenKern';
import { type UmrissPlan, tiefeGlaetten } from './umrissPlan';

type Probe = { q: V2; s: number; ecke: boolean };
/** Ein Kind an der Naht: Sehne a → b auf der Seite und der gezeichnete Bogen von a über die Spitze nach b. */
export type Kind = {
  name: string;
  quelle: 'planer' | 'baum';
  a: V2;
  b: V2;
  bogen: Probe[];
  spitze: number;
  /** Knick des Rumpf-Umrisses an a und b (Grad) */
  winkel: [number, number];
  /** Rumpf ohne den Bogen: Ausdehnung längs : quer (achsenparallel) und Winkel der Sehne zur langen Achse (0 … 90°) */
  laenglich: number;
  sehneWinkel: number;
};
export type TeileFund = { kinder: Kind[]; /** seitliche Paare: Sehne im Top (rechte Seite), aus dem Rumpf-Umriss geschnitten */ paareTop: [V2, V2][]; ausgelassen: { name: string; grund: string }[]; ms: number };

/** flache Läufe an der Spitze (Welt) */
const EPS_FLACH = 3 / PX;
/** Sehnenenden, die näher als dieses Maß an einem Baum-Schnitt liegen, gehören zu ihm */
const FANG = 12 / PX;
/** Spalten des Fensters höchstens (N = 16: Spalten ± 3 um die Naht, die Reihenschleife bei N/4 bleibt frei) */
const SPALTEN_MAX = 6;
/**
 * Ein Teil des Teilbaums ist nur dann ein Kind über ein Fenster, wenn der Rumpf länglich ist (Ausdehnung längs : quer ≥ 1,15)
 * und die Sehne längs seiner langen Achse liegt (± 45°): ein Hals auf dem Rücken eines liegenden Rumpfs (Langhals, Robbe,
 * Ente). Ein Hals auf einem runden oder stehenden Rumpf (Vase: Sehne quer zur Achse) bleibt im Einteiler — dort setzt der
 * Käfig die Ringe von selbst durch den Hals fort. Planer-Kinder (konkave Ecken) gelten immer.
 */
const LAENGLICH = 1.15;
/** Kindringe 1 … SCHULTER blenden vom verschobenen Fensterrand zur Ellipse über (Rand und Ellipse sind nie gleich geformt) */
const SCHULTER = 2;

const d2 = (p: V2, q: V2) => Math.hypot(p.x - q.x, p.y - q.y);

function naechster(z: readonly V2[], p: V2): number {
  let best = 0;
  let bd = Infinity;
  z.forEach((x, i) => {
    const d = d2(x, p);
    if (d < bd) {
      bd = d;
      best = i;
    }
  });
  return best;
}

/** Abstand eines Punkts von der Geraden a–b */
function abstandLinie(p: V2, a: V2, b: V2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l = Math.hypot(dx, dy) || 1;
  return Math.abs(dx * (p.y - a.y) - dy * (p.x - a.x)) / l;
}

/** Indizes von ia bis ib (einschließlich), zyklisch vorwärts (+1) oder rückwärts (−1) */
function lauf(n: number, ia: number, ib: number, richtung: 1 | -1): number[] {
  const out = [ia];
  let i = ia;
  while (i !== ib && out.length <= n) {
    i = (i + richtung + n) % n;
    out.push(i);
  }
  return out;
}

/** Der Bogen eines Kindes auf der Zeichnung: von a nach b über die Spitze (`ref` = ein Punkt des Kindes, der den Bogen wählt). */
function kindAus(z: readonly Probe[], name: string, quelle: Kind['quelle'], a: V2, b: V2, ref: V2 | null): Kind | null {
  const n = z.length;
  const qs = z.map((p) => p.q);
  const ia = naechster(qs, a);
  const ib = naechster(qs, b);
  if (ia === ib) return null;
  const vor = lauf(n, ia, ib, 1);
  const rueck = lauf(n, ia, ib, -1);
  let idx: number[];
  if (ref) {
    const ir = naechster(qs, ref);
    idx = vor.includes(ir) ? vor : rueck;
  } else idx = vor.length <= rueck.length ? vor : rueck;
  if (idx.length < 4) return null;
  const bogen = idx.map((i) => ({ ...z[i]! }));
  bogen[0] = { ...bogen[0]!, q: a, ecke: false };
  bogen[bogen.length - 1] = { ...bogen[bogen.length - 1]!, q: b, ecke: false };
  // Spitze: größter Abstand von der Sehne; ein flacher Lauf (Stielboden) nimmt seine Mitte
  const d = bogen.map((p) => abstandLinie(p.q, a, b));
  let best = 1;
  for (let i = 2; i < bogen.length - 1; i++) if (d[i]! > d[best]!) best = i;
  let lo = best;
  let hi = best;
  while (lo > 1 && d[lo - 1]! >= d[best]! - EPS_FLACH) lo--;
  while (hi < bogen.length - 2 && d[hi + 1]! >= d[best]! - EPS_FLACH) hi++;
  // Knick des Rumpfs an den Sehnenenden: Richtung des Rumpf-Umrisses vor a bzw. nach b gegen die Sehne
  const r = idx === vor ? -1 : 1;
  const vorA = qs[(ia + r + n) % n]!;
  const nachB = qs[(ib - r + n) % n]!;
  const wink = (u: V2, w: V2) => {
    const lu = Math.hypot(u.x, u.y) || 1;
    const lw = Math.hypot(w.x, w.y) || 1;
    return (Math.acos(Math.max(-1, Math.min(1, (u.x * w.x + u.y * w.y) / (lu * lw)))) * 180) / Math.PI;
  };
  const sehne = { x: b.x - a.x, y: b.y - a.y };
  // Rumpf ohne den Bogen: Ausdehnung längs : quer und die Lage der Sehne zur langen Achse
  const drin = new Set(idx);
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  qs.forEach((q, i) => {
    if (drin.has(i)) return;
    x0 = Math.min(x0, q.x);
    x1 = Math.max(x1, q.x);
    y0 = Math.min(y0, q.y);
    y1 = Math.max(y1, q.y);
  });
  const w = x1 - x0;
  const hh = y1 - y0;
  const laenglich = Math.max(w, hh) / Math.max(1e-9, Math.min(w, hh));
  const sehneWinkel = wink(sehne, w >= hh ? { x: 1, y: 0 } : { x: 0, y: 1 });
  return { name, quelle, a, b, bogen, spitze: Math.round((lo + hi) / 2), winkel: [wink({ x: a.x - vorA.x, y: a.y - vorA.y }, sehne), wink(sehne, { x: nachB.x - b.x, y: nachB.y - b.y })], laenglich, sehneWinkel: Math.min(sehneWinkel, 180 - sehneWinkel) };
}

/** Kinder an der Naht: Mitte-Teile des Teilbaums (Seite) und Seitenflächen des Planers, die kein Baum-Teil deckt. */
export function teileFinden(dok: Dokument, plan: UmrissPlan, gefroren: Ableitung['gefroren'] | null | undefined): TeileFund {
  const t0 = jetzt();
  const z = plan.zeichnung.seite;
  const kinder: Kind[] = [];
  const paareTop: [V2, V2][] = [];
  const ausgelassen: TeileFund['ausgelassen'] = [];
  const schnitte: [V2, V2][] = [];
  const tb = teilbaum(dok, gefroren?.teile ?? null);
  for (const t of tb.teile) {
    if (t.art === 'rumpf') continue;
    if (t.art === 'paar') {
      if (t.erkannt.top) paareTop.push(t.erkannt.top.schnitt);
      ausgelassen.push({ name: t.id, grund: 'seitliches Paar (zweiter Schritt)' });
      continue;
    }
    const e = t.erkannt.seite;
    if (!e) {
      ausgelassen.push({ name: t.id, grund: 'nur in Front oder Top erkannt' });
      continue;
    }
    schnitte.push(e.schnitt);
    let ref: V2 | null = null;
    let bd = -1;
    for (const p of e.umriss) {
      const d = abstandLinie(p, e.schnitt[0], e.schnitt[1]);
      if (d > bd) {
        bd = d;
        ref = p;
      }
    }
    const k = kindAus(z, t.id, 'baum', e.schnitt[0], e.schnitt[1], ref);
    if (!k) ausgelassen.push({ name: t.id, grund: 'Bogen auf der Zeichnung nicht gefunden' });
    else if (k.laenglich < LAENGLICH || k.sehneWinkel > 45) ausgelassen.push({ name: t.id, grund: `kein Abzweig längs eines liegenden Rumpfs (Rumpf ${k.laenglich.toFixed(2)} : 1, Sehne ${k.sehneWinkel.toFixed(0)}° zur Achse) — bleibt im Einteiler` });
    else kinder.push(k);
  }
  for (const f of plan.flaechen) {
    if (f.ansicht !== 'seite' || !f.sehne) continue;
    const name = `Fläche ${f.nr}`;
    if (f.eltern !== 0) {
      ausgelassen.push({ name, grund: 'verschachtelt (Teil eines Teils)' });
      continue;
    }
    const nah = (p: V2) => schnitte.some(([u, w]) => d2(p, u) < FANG || d2(p, w) < FANG);
    if (nah(f.sehne.a) || nah(f.sehne.b)) continue;
    const s = plan.schleifen.find((x) => x.ansicht === 'seite' && x.teil === f.nr);
    let ref: V2 | null = null;
    let bd = -1;
    for (const p of s?.proben ?? []) {
      if (p.art !== 0) continue;
      const d = abstandLinie(p.q, f.sehne.a, f.sehne.b);
      if (d > bd) {
        bd = d;
        ref = p.q;
      }
    }
    const k = kindAus(z, name, 'planer', f.sehne.a, f.sehne.b, ref);
    if (!k) ausgelassen.push({ name, grund: 'Bogen auf der Zeichnung nicht gefunden' });
    else kinder.push(k);
  }
  return { kinder, paareTop, ausgelassen, ms: jetzt() - t0 };
}

/** Seite des Rumpfs: die Zeichnung ohne die Bögen der Kinder, je Kind die gerade Sehne. */
function wurzelSeite(z: readonly Probe[], kinder: readonly Kind[]): V2[] {
  const n = z.length;
  const qs = z.map((p) => p.q);
  const weg = new Uint8Array(n);
  const ersatz = new Map<number, V2>();
  for (const k of kinder) {
    const ia = naechster(qs, k.a);
    const ib = naechster(qs, k.b);
    const is = naechster(qs, k.bogen[k.spitze]!.q);
    const vor = lauf(n, ia, ib, 1);
    const idx = vor.includes(is) ? vor : lauf(n, ia, ib, -1);
    for (let t = 1; t + 1 < idx.length; t++) weg[idx[t]!] = 1;
    ersatz.set(ia, k.a);
    ersatz.set(ib, k.b);
  }
  // die gerade Sehne mit Zwischenpunkten im Abstand der Zeichnung (sonst sähe ein flacher Lauf an der Spitze nur zwei Punkte)
  const schritt = (() => {
    let L = 0;
    for (let i = 0; i < n; i++) L += d2(qs[i]!, qs[(i + 1) % n]!);
    return L / n;
  })();
  const poly: V2[] = [];
  z.forEach((p, i) => {
    if (weg[i]) return;
    const q = ersatz.get(i) ?? p.q;
    if (poly.length) {
      const vor = poly[poly.length - 1]!;
      const d = d2(vor, q);
      const m = Math.floor(d / Math.max(1e-9, schritt));
      for (let t = 1; t < m; t++) poly.push({ x: vor.x + ((q.x - vor.x) * t) / m, y: vor.y + ((q.y - vor.y) * t) / m });
    }
    poly.push(q);
  });
  // auch der Schluss der Schleife (letzter → erster Punkt)
  const vor = poly[poly.length - 1]!;
  const q0 = poly[0]!;
  const m0 = Math.floor(d2(vor, q0) / Math.max(1e-9, schritt));
  for (let t = 1; t < m0; t++) poly.push({ x: vor.x + ((q0.x - vor.x) * t) / m0, y: vor.y + ((q0.y - vor.y) * t) / m0 });
  return poly;
}

/**
 * Front- und Top-Schleife des Rumpfs aus der Sichthülle über dem Rumpfpolygon der Seite: je Höhe y (Front) bzw. je x (Top) die
 * größte seitliche Breite der Hülle an Stellen, die im Rumpfpolygon liegen (die Kinder liegen außerhalb), die Tiefe dort, wo sie
 * erreicht wird; seitliche Paare über das lobbenfreie Top-Polygon abgeschnitten. Beschnittene Zeichnungen taugen nicht: wo ein
 * Kind den Rumpf in der Höhe überdeckt (Robben-Kopf), gehört die Silhouette dem Kind, und ihre Tiefe springt (Ringe 178 px gekippt).
 */
function rumpfSchleifen(h: Huelle, wurzel: readonly V2[], topOhneLobben: readonly V2[], proben = 72): { front: V3[]; top: V3[] } {
  let xLo = Infinity;
  let xHi = -Infinity;
  let yLo = Infinity;
  let yHi = -Infinity;
  for (const q of wurzel) {
    xLo = Math.min(xLo, q.x);
    xHi = Math.max(xHi, q.x);
    yLo = Math.min(yLo, q.y);
    yHi = Math.max(yHi, q.y);
  }
  const zCut = (x: number): number => {
    let m = 0;
    for (const [lo, hi] of schnittIntervalle(topOhneLobben, 'x', x)) m = Math.max(m, hi, -lo);
    return m;
  };
  const zBei = (x: number, y: number): number => {
    let m = 0;
    const cut = zCut(x);
    for (const [lo, hi] of h.zBei(x, y)) m = Math.max(m, Math.min(cut, hi), Math.min(cut, -lo));
    return m;
  };
  const innenProben = 32;
  const EPS = 1 / PX;
  /**
   * Je Probe die größte Breite und das Intervall der Tiefe, in dem sie (bis auf 1 px) erreicht wird — ein Rotationskörper hat
   * sie auf einem ganzen Plateau; die Tiefe wird dann mit kleinster Biegung durch die Intervalle gelegt (sonst springt sie
   * zwischen den Plateau-Enden, Hut: 76 px)
   */
  const spalte = (quer: 'x' | 'y', wert: number, lo0: number, hi0: number): { z: number; lo: number; hi: number } => {
    const proben2: { t: number; z: number }[] = [];
    for (const [a, b] of schnittIntervalle(wurzel, quer, wert)) {
      for (let t = 0; t <= innenProben; t++) {
        const u = a + ((b - a) * t) / innenProben;
        proben2.push({ t: u, z: quer === 'y' ? zBei(u, wert) : zBei(wert, u) });
      }
    }
    if (!proben2.length) return { z: 0, lo: (lo0 + hi0) / 2, hi: (lo0 + hi0) / 2 };
    let best = 0;
    for (const q of proben2) best = Math.max(best, q.z);
    let lo = Infinity;
    let hi = -Infinity;
    for (const q of proben2) {
      if (q.z < best - EPS) continue;
      lo = Math.min(lo, q.t);
      hi = Math.max(hi, q.t);
    }
    return { z: best, lo, hi };
  };
  const glatt = (werte: { z: number; lo: number; hi: number }[]): number[] => {
    const n = werte.length;
    const lo = new Float64Array(n);
    const hi = new Float64Array(n);
    const fest = new Uint8Array(n).fill(1);
    werte.forEach((w, i) => {
      lo[i] = w.lo;
      hi[i] = w.hi;
    });
    return Array.from(tiefeGlaetten(lo, hi, fest, false));
  };
  const frontW: { z: number; lo: number; hi: number }[] = [];
  const ys: number[] = [];
  for (let i = 0; i <= proben; i++) {
    const y = yLo + ((yHi - yLo) * i) / proben;
    ys.push(y);
    frontW.push(spalte('y', Math.min(yHi - 1e-6, Math.max(yLo + 1e-6, y)), xLo, xHi));
  }
  const xF = glatt(frontW);
  const front = frontW.map((w, i) => ({ z: w.z, y: ys[i]!, x: xF[i]! }));
  const topW: { z: number; lo: number; hi: number }[] = [];
  const xs: number[] = [];
  for (let i = 0; i <= proben; i++) {
    const x = xLo + ((xHi - xLo) * i) / proben;
    xs.push(x);
    topW.push(spalte('x', Math.min(xHi - 1e-6, Math.max(xLo + 1e-6, x)), yLo, yHi));
  }
  const yT = glatt(topW);
  const top = topW.map((w, i) => ({ x: xs[i]!, z: w.z, y: yT[i]! }));
  // geschlossene Schleifen: rechte Hälfte aufwärts, linke abwärts (Enden mit z = 0 nicht doppelt)
  const frontLoop: V3[] = [];
  for (const p of front) frontLoop.push([p.x, p.y, p.z]);
  for (let i = front.length - 2; i > 0; i--) frontLoop.push([front[i]!.x, front[i]!.y, -front[i]!.z]);
  const topLoop: V3[] = [];
  for (const p of top) topLoop.push([p.x, p.y, p.z]);
  for (let i = top.length - 2; i > 0; i--) topLoop.push([top[i]!.x, top[i]!.y, -top[i]!.z]);
  return { front: frontLoop, top: topLoop };
}

/** Seitliche Paare (Top: rechte Seite und Spiegelbild) aus dem Umriss schneiden: der kürzere Bogen wird zur Sehne. */
function lobbenSchneiden(poly: readonly V2[], paare: readonly [V2, V2][]): V2[] {
  let out = [...poly];
  for (const [p, q] of paare) {
    for (const sp of [1, -1]) {
      const P = { x: p.x, y: sp * p.y };
      const Q = { x: q.x, y: sp * q.y };
      const n = out.length;
      const ip = naechster(out, P);
      const iq = naechster(out, Q);
      if (ip === iq) continue;
      const vor = lauf(n, ip, iq, 1);
      const rueck = lauf(n, ip, iq, -1);
      const weg = new Set((vor.length <= rueck.length ? vor : rueck).slice(1, -1));
      out = out.filter((_, i) => !weg.has(i));
    }
  }
  return out;
}

/** Halbe seitliche Breite der Sichthülle bei (x, y): das Intervall um z = 0, sonst das nächste; ohne Intervall `sonst`. */
function huellenBreite(h: Huelle, x: number, y: number, sonst: number): number {
  const iv = h.zBei(x, y);
  let best = -1;
  for (const [lo, hi] of iv) {
    if (lo <= 0 && hi >= 0) return Math.max(hi, -lo);
    best = Math.max(best, hi, -lo);
  }
  return best > 0 ? best : sonst;
}

/** Eine geschlossene Punktreihe (Fensterrand, Stufe, Kindring): Punkte im Umlauf ab dem A-Punkt Richtung +z, Viertelbruch 0 … 4 je Punkt. */
type Reihe = { punkte: number[]; t: number[] };

/** Viertelbrüche einer Reihe aus Längen je Kante: die Viertelpunkte (Indizes) teilen den Umlauf in vier Bögen. */
function viertelBrueche(laengenKanten: readonly number[], viertel: readonly [number, number, number]): number[] {
  const n = laengenKanten.length;
  const grenzen = [0, viertel[0], viertel[1], viertel[2], n];
  const t = new Array<number>(n).fill(0);
  for (let Q = 0; Q < 4; Q++) {
    const a = grenzen[Q]!;
    const b = grenzen[Q + 1]!;
    let L = 0;
    for (let i = a; i < b; i++) L += laengenKanten[i]!;
    let s = 0;
    for (let i = a; i < b; i++) {
      t[i] = Q + (L > 1e-15 ? s / L : (i - a) / (b - a));
      s += laengenKanten[i]!;
    }
  }
  return t;
}

/** Fensterrand und Stufen eines Fensters (Eltern-Indizes): Rand, innere Stufen 1 … M−1 als Reihen, der Grat (Stufe M) und die Fensterflächen. */
type Fenster = {
  rand: Reihe;
  stufen: Reihe[];
  /** Stufe M: eine Linie von der A-Seite zur B-Seite (`laengs`), quer von −z nach +z (`quer`) oder ein Punkt */
  grat: { punkte: number[]; richtung: 'laengs' | 'quer' | 'punkt' };
  /** Indizes der Fensterflächen in der Flächenliste der Röhre */
  flaechen: number[];
  /** alle inneren Punkte (Stufen und Grat) */
  innen: number[];
  /** Herkunft neuer Punkte (Fenstermitte) */
  mitte: number;
  M: number;
};

/**
 * Reihen längs der Naht einer Seite (oben = Rücken j = 0, unten = Bauch j = N/2) von der vorderen Spitze (λ = 0) über die
 * vordere Kappe (λ = 1 … c/2 − 1), die Ringe (λ = c/2 + i) und die hintere Kappe bis zur hinteren Spitze (λ = R + c − 1):
 * der Punkt in Reihe λ bei Spalte u (u > 0 = +z). Ein Streifen-Fenster ist ein Rechteck in diesen Koordinaten und darf
 * über die Kappe reichen (Hals am Ende des Rückens).
 */
function reihenPunkt(v: Roehre, seite: 'oben' | 'unten', lam: number, u: number): number {
  const { R, N, c } = v;
  const a = c / 2 + u;
  if (lam <= 0) return v.kappe('vorn', a, c / 2);
  if (lam < c / 2) return v.kappe('vorn', a, seite === 'oben' ? c / 2 + lam : c / 2 - lam);
  if (lam <= c / 2 + R - 1) return v.ringPunkt(lam - c / 2, (seite === 'oben' ? 0 : N / 2) + (seite === 'oben' ? u : -u));
  const m = lam - (c / 2 + R - 1);
  if (m < c / 2) return v.kappe('hinten', a, seite === 'oben' ? c - m : m);
  return v.kappe('hinten', a, c / 2);
}

/** Reihe λ eines Lage-Schritts: vordere Bögen zählen ab der vorderen Spitze, hintere ab der hinteren. */
const lambdaVon = (v: Roehre, l: SeitenLage): number => (l.ende === 'vorn' ? l.schritt : v.R + v.c - 1 - l.schritt);

/**
 * Streifen-Fenster: Reihen λA (Sehnenende a) … λB (Ende b), Spalten ± Cw/2 um die Naht. Rand ab dem A-Punkt Richtung +z, innere
 * Stufen als Rechteckringe, Grat; die Fensterflächen über ihre vier Ecken in der Flächenliste gefunden (null, wenn eine fehlt).
 */
function fensterStreifen(v: Roehre, ziele: Float64Array, seite: 'oben' | 'unten', lamA: number, lamB: number, Cw: number, flaechenIndex: Map<string, number>): Fenster | null {
  const sB = lamB > lamA ? 1 : -1;
  const Rw = Math.abs(lamB - lamA);
  const P = (a: number, b: number) => reihenPunkt(v, seite, lamA + sB * b, a - Cw / 2);
  const W = (p: number): V3 => [ziele[3 * p]!, ziele[3 * p + 1]!, ziele[3 * p + 2]!];
  const M = Math.min(Cw, Rw) / 2;
  const rechteck = (m: number): { a: number; b: number }[] => {
    const out: { a: number; b: number }[] = [];
    for (let a = Cw / 2; a <= Cw - m; a++) out.push({ a, b: m });
    for (let b = m + 1; b <= Rw - m; b++) out.push({ a: Cw - m, b });
    for (let a = Cw - m - 1; a >= m; a--) out.push({ a, b: Rw - m });
    for (let b = Rw - m - 1; b >= m; b--) out.push({ a: m, b });
    for (let a = m + 1; a < Cw / 2; a++) out.push({ a, b: m });
    return out;
  };
  const randGrid = rechteck(0);
  const randPunkte = randGrid.map((g) => P(g.a, g.b));
  if (new Set(randPunkte).size !== randPunkte.length) return null;
  const kantenRand = randPunkte.map((p, i) => dist(W(p), W(randPunkte[(i + 1) % randPunkte.length]!)));
  const viertelVon = (grid: { a: number; b: number }[], m: number): [number, number, number] => {
    const finde = (a: number, b: number) => grid.findIndex((g) => g.a === a && g.b === b);
    return [finde(Cw - m, Rw / 2), finde(Cw / 2, Rw - m), finde(m, Rw / 2)];
  };
  const rand: Reihe = { punkte: randPunkte, t: viertelBrueche(kantenRand, viertelVon(randGrid, 0)) };
  let lenA = 0;
  let lenB = 0;
  randGrid.forEach((g, i) => {
    const h = randGrid[(i + 1) % randGrid.length]!;
    if (h.b === g.b) lenA += kantenRand[i]!;
    else lenB += kantenRand[i]!;
  });
  const schrittA = lenA / (2 * Cw);
  const schrittB = lenB / (2 * Rw);
  const stufen: Reihe[] = [];
  for (let m = 1; m < M; m++) {
    const grid = rechteck(m);
    const kanten = grid.map((g, i) => {
      const h = grid[(i + 1) % grid.length]!;
      return h.b === g.b ? schrittA : schrittB;
    });
    stufen.push({ punkte: grid.map((g) => P(g.a, g.b)), t: viertelBrueche(kanten, viertelVon(grid, m)) });
  }
  const grat: Fenster['grat'] = Cw < Rw ? { punkte: Array.from({ length: Rw - 2 * M + 1 }, (_, i) => P(M, M + i)), richtung: 'laengs' } : Cw > Rw ? { punkte: Array.from({ length: Cw - 2 * M + 1 }, (_, i) => P(M + i, M)), richtung: 'quer' } : { punkte: [P(M, M)], richtung: 'punkt' };
  const flaechen: number[] = [];
  for (let b = 0; b < Rw; b++) {
    for (let a = 0; a < Cw; a++) {
      const key = [P(a, b), P(a + 1, b), P(a + 1, b + 1), P(a, b + 1)].sort((x, y) => x - y).join(',');
      const fi = flaechenIndex.get(key);
      if (fi === undefined) return null;
      flaechen.push(fi);
    }
  }
  const innen: number[] = [];
  for (let a = 1; a < Cw; a++) for (let b = 1; b < Rw; b++) innen.push(P(a, b));
  return { rand, stufen, grat, flaechen, innen, mitte: P(Cw / 2, Rw / 2), M };
}

/** Quadratring m der Kappe (8m Gitterpunkte (p, q), |·| ≤ m, Rand) ab dem Mittelpunkt der Seite `start` Richtung +p (= +z). */
function quadrat(m: number, start: 'oben' | 'unten'): [number, number][] {
  const out: [number, number][] = [];
  for (let p = 0; p <= m; p++) out.push([p, m]);
  for (let q = m - 1; q >= -m; q--) out.push([m, q]);
  for (let p = m - 1; p >= -m; p--) out.push([p, -m]);
  for (let q = -m + 1; q <= m; q++) out.push([-m, q]);
  for (let p = -m + 1; p < 0; p++) out.push([p, m]);
  return start === 'oben' ? out : out.map(([p, q]) => [p, -q]);
}

/** Fortsetzung über die Kappe `ende`: Rand = Ring k, Stufen = Ringe k−1 … 0 und die Quadratringe der Kappe, Grat = die Spitze. */
function fensterKappe(v: Roehre, ziele: Float64Array, ende: 'vorn' | 'hinten', k: number, aSeite: 'oben' | 'unten'): Fenster {
  const { R, N, c } = v;
  const jA = aSeite === 'oben' ? 0 : N / 2;
  const dir = jA === 0 ? 1 : -1;
  const W = (p: number): V3 => [ziele[3 * p]!, ziele[3 * p + 1]!, ziele[3 * p + 2]!];
  const ringIndex = (l: number) => (ende === 'vorn' ? k - l : R - 1 - k + l);
  const ringReihe = (i: number): Reihe => {
    const punkte = Array.from({ length: N }, (_, t) => v.ringPunkt(i, jA + dir * t));
    const kanten = punkte.map((p, t) => dist(W(p), W(punkte[(t + 1) % N]!)));
    return { punkte, t: viertelBrueche(kanten, [N / 4, N / 2, (3 * N) / 4]) };
  };
  const rand = ringReihe(ringIndex(0));
  const stufen: Reihe[] = [];
  for (let l = 1; l <= k; l++) stufen.push(ringReihe(ringIndex(l)));
  for (let m = c / 2 - 1; m >= 1; m--) {
    const g = quadrat(m, aSeite);
    const punkte = g.map(([p, q]) => v.kappe(ende, c / 2 + p, c / 2 + q));
    stufen.push({ punkte, t: viertelBrueche(punkte.map(() => 1), [2 * m, 4 * m, 6 * m]) });
  }
  const spitze = ende === 'vorn' ? v.naht.spitzeVorn : v.naht.spitzeHinten;
  const flaechen: number[] = [];
  const iLo = ende === 'vorn' ? 0 : R - 1 - k;
  for (let i = iLo; i < iLo + k; i++) for (let j = 0; j < N; j++) flaechen.push(i * N + j);
  const kappeStart = (R - 1) * N + (ende === 'vorn' ? 0 : c * c);
  for (let f = 0; f < c * c; f++) flaechen.push(kappeStart + f);
  const innen = [...stufen.flatMap((s) => s.punkte), spitze];
  return { rand, stufen, grat: { punkte: [spitze], richtung: 'punkt' }, flaechen, innen, mitte: spitze, M: k + c / 2 };
}

/** Ellipse durch die Anker A (Bruch 0), +z (1), B (2), −z (3): Punkt beim Viertelbruch t, nach Bogenlänge gleichmäßig; dazu der Winkel. */
function ellipse(A: V3, B: V3, w: number): { bei: (t: number) => V3; winkel: (t: number) => number } {
  const C: V3 = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2, (A[2] + B[2]) / 2];
  const u: V3 = [A[0] - C[0], A[1] - C[1], A[2] - C[2]];
  const P = (th: number): V3 => [C[0] + Math.cos(th) * u[0], C[1] + Math.cos(th) * u[1], C[2] + Math.cos(th) * u[2] + Math.sin(th) * w];
  const M = 48;
  const S = new Float64Array(M + 1);
  for (let i = 1; i <= M; i++) S[i] = S[i - 1]! + dist(P(((i - 1) / M) * (Math.PI / 2)), P((i / M) * (Math.PI / 2)));
  const Lq = S[M]!;
  const theta = (f: number): number => {
    const ziel = Math.min(1, Math.max(0, f)) * Lq;
    if (!(Lq > 1e-15)) return f * (Math.PI / 2);
    let i = 0;
    while (i + 1 < M && S[i + 1]! < ziel) i++;
    const d = S[i + 1]! - S[i]!;
    return ((i + (d > 1e-15 ? (ziel - S[i]!) / d : 0)) / M) * (Math.PI / 2);
  };
  const winkel = (t: number): number => {
    const Q = Math.min(3, Math.max(0, Math.floor(t)));
    const f = t - Q;
    return Q === 0 ? theta(f) : Q === 1 ? Math.PI - theta(1 - f) : Q === 2 ? Math.PI + theta(f) : 2 * Math.PI - theta(1 - f);
  };
  return { bei: (t) => P(winkel(t)), winkel };
}

type FensterPlan = { kind: Kind; art: 'streifen' | 'fortsetzung'; seite: 'oben' | 'unten'; ende: 'vorn' | 'hinten'; /** Reihen λ der Sehnenenden (Streifen) bzw. Ring k (Fortsetzung) */ lamA: number; lamB: number; Cw: number; k: number; lageA: SeitenLage; lageB: SeitenLage; fenster: Fenster };

/** Rumpf mit Kindern über Fenster; `fund` von `teileFinden`. */
export function schleifenTeile(abl: Ableitung, plan: UmrissPlan, dok: Dokument, opt: Required<KaefigOptionen>, fund: TeileFund): { abl: Ableitung; bericht: KaefigBericht } {
  const t0 = jetzt();
  const v = abl.vorlage;
  const k = abl.kaefig;
  const nP = k.n;
  const { R, N, c } = v;
  if (nP !== v.kaefig.n) return leer(abl, 'Käfig mit Maul oder Beinen', t0);
  const ausgelassen = [...fund.ausgelassen];
  const z = plan.zeichnung.seite;
  const h = huelle(dok);
  // ---- Rumpf: Seite mit Sehnen, Front und Top auf den Rumpf beschnitten ----
  const wurzel = wurzelSeite(z, fund.kinder);
  const seite3: V3[] = wurzel.map((q) => [q.x, q.y, 0]);
  let xLo = Infinity;
  let xHi = -Infinity;
  let yLo = Infinity;
  let yHi = -Infinity;
  for (const q of wurzel) {
    xLo = Math.min(xLo, q.x);
    xHi = Math.max(xHi, q.x);
    yLo = Math.min(yLo, q.y);
    yHi = Math.max(yHi, q.y);
  }
  const { front: front3, top: top3 } = rumpfSchleifen(h, wurzel, lobbenSchneiden(plan.zeichnung.top.map((p) => p.q), fund.paareTop));
  void xLo;
  void xHi;
  void yLo;
  void yHi;
  const sehnenEnden = fund.kinder.flatMap((kd) => [kd.a, kd.b]);
  const eckenSeite = eckenKnoten(dok, 'seite').filter((q) => !sehnenEnden.some((e) => d2(e, q) < FANG));
  const flaechenAlle = alleFlaechen(k);
  const flaechenIndex = new Map<string, number>();
  flaechenAlle.forEach((f, i) => flaechenIndex.set([...f].sort((x, y) => x - y).join(','), i));
  const lamMax = R + c - 1;
  // Der Rumpf baut mit ebenen Ringen (Kreuzungen oben/rechts/unten liegen bei Rümpfen mit Kindern selten auf einer Achskoordinate)
  const optRumpf: Required<KaefigOptionen> = { ...opt, eben: true };
  // ---- Achse und Fenster: beide Achsen planen; es gewinnt die Achse mit mehr gebauten Kindern, bei Gleichstand die Fortsetzung
  // über die Kappe mit passendem Ring (Pilz), sonst die natürliche Achse ----
  const natuerlich: KaefigAchse = opt.achse === 'auto' ? achseWaehlen(seite3, opt.achseAb) : opt.achse;
  type Planung = { achse: KaefigAchse; eingabe: Parameters<typeof einteilZiele>[0]; erg1: ReturnType<typeof einteilZiele>; plaene: FensterPlan[]; stuetzen: { bogen: BogenName; s: number; k: number }[]; ausgelassen: TeileFund['ausgelassen']; wert: number };
  const planen = (achse: KaefigAchse): Planung => {
    const rahmen = rahmenFuer(achse);
    const reihenAnsicht: Blatt = achse === 'x' ? 'top' : 'front';
    const ringAnsicht: Blatt = achse === 'x' ? 'front' : 'top';
    const eingabe = { seite: seite3, reihe: achse === 'x' ? top3 : front3, ring: achse === 'x' ? front3 : top3, rahmen, R, N, ecken: { seite: eckenSeite, reihe: eckenKnoten(dok, reihenAnsicht), ring: eckenKnoten(dok, ringAnsicht) }, opt: optRumpf };
    const erg1 = einteilZiele({ ...eingabe, fragen: sehnenEnden.map((q): V3 => [q.x, q.y, 0]) }, v);
    const plaene: FensterPlan[] = [];
    const stuetzen: { bogen: BogenName; s: number; k: number }[] = [];
    const weg: TeileFund['ausgelassen'] = [];
    if ('grund' in erg1) return { achse, eingabe, erg1, plaene, stuetzen, ausgelassen: [{ name: 'Rumpf', grund: erg1.grund }], wert: -1 };
    const belegt = new Set<number>();
    const EVon = (l: SeitenLage) => (l.ende === 'vorn' ? erg1.schritte.vorn : erg1.schritte.hinten);
  const anKreuzung = (l: SeitenLage) => l.s >= l.total - 1e-9;
  const anSpitze = (l: SeitenLage) => l.s <= 1e-9;
  /** mittlere Spaltenbreite der Reihen λ0 … λ1 (Punkt zu Nachbar ± 1) */
  const spaltenBreite = (seite: 'oben' | 'unten', lam0: number, lam1: number): number => {
    let sum = 0;
    let z2 = 0;
    for (let lam = Math.min(lam0, lam1); lam <= Math.max(lam0, lam1); lam++) {
      for (const du of [-1, 1]) {
        const p = reihenPunkt(v, seite, lam, 0);
        const q = reihenPunkt(v, seite, lam, du);
        sum += Math.hypot(erg1.ziele[3 * p]! - erg1.ziele[3 * q]!, erg1.ziele[3 * p + 1]! - erg1.ziele[3 * q + 1]!, erg1.ziele[3 * p + 2]! - erg1.ziele[3 * q + 2]!);
        z2++;
      }
    }
    return z2 ? sum / z2 : 1;
  };
  const stuetze = (l: SeitenLage, lam: number) => {
    const kk = l.ende === 'vorn' ? lam : lamMax - lam;
    if (!anSpitze(l) && !anKreuzung(l) && kk >= 1 && kk <= EVon(l) - 1) stuetzen.push({ bogen: l.bogen, s: l.s, k: kk });
  };
    fund.kinder.forEach((kd, q) => {
    const la = erg1.lagen[2 * q]!;
    const lb = erg1.lagen[2 * q + 1]!;
    const mitte = { x: (kd.a.x + kd.b.x) / 2, y: (kd.a.y + kd.b.y) / 2 };
    const sp = kd.bogen[kd.spitze]!.q;
    // Breite des Kindes: die Hülle ein Viertel des Wegs zur Spitze (an der Sehne selbst misst die Hülle noch den Rumpf)
    const breiteVoll = 2 * huellenBreite(h, mitte.x + 0.25 * (sp.x - mitte.x), mitte.y + 0.25 * (sp.y - mitte.y), d2(kd.a, kd.b) / 2);
    const ausgelassen = weg;
    if (la.seite === lb.seite) {
      // Streifen auf Rücken oder Bauch, auch über die Kappe; Enden an der Spitze oder der Kreuzung oben/unten liegen fest
      const festA = anSpitze(la) || anKreuzung(la);
      const festB = anSpitze(lb) || anKreuzung(lb);
      let lamA = Math.round(lambdaVon(v, la));
      let lamB = Math.round(lambdaVon(v, lb));
      let Rw = Math.abs(lamB - lamA);
      const sg = lamB >= lamA ? 1 : -1;
      if (Rw < 2) Rw = 2;
      if (Rw % 2) Rw++;
      if (festA || !festB) lamB = lamA + sg * Rw;
      else lamA = lamB - sg * Rw;
      if (Math.min(lamA, lamB) < 0 || Math.max(lamA, lamB) > lamMax) {
        ausgelassen.push({ name: kd.name, grund: 'Fenster reicht über die Spitze hinaus' });
        return;
      }
      const ueberKappe = Math.min(lamA, lamB) < c / 2 || Math.max(lamA, lamB) > c / 2 + R - 1;
      let Cw = 2 * Math.max(1, Math.round(breiteVoll / (2 * spaltenBreite(la.seite, lamA, lamB))));
      Cw = Math.min(Cw, SPALTEN_MAX, N / 2 - 2, ueberKappe ? c : N);
      const f = fensterStreifen(v, erg1.ziele, la.seite, lamA, lamB, Cw, flaechenIndex);
      if (!f) {
        ausgelassen.push({ name: kd.name, grund: 'Streifen nicht im Gitter' });
        return;
      }
      if (f.flaechen.some((x) => belegt.has(x))) {
        ausgelassen.push({ name: kd.name, grund: 'Fenster überlappt ein anderes' });
        return;
      }
      for (const x of f.flaechen) belegt.add(x);
      stuetze(la, lamA);
      stuetze(lb, lamB);
      plaene.push({ kind: kd, art: 'streifen', seite: la.seite, ende: la.ende, lamA, lamB, Cw, k: 0, lageA: la, lageB: lb, fenster: f });
    } else if (la.ende === lb.ende && (la.ende === 'vorn' ? Math.max(la.ring, lb.ring) : R - 1 - Math.min(la.ring, lb.ring)) < R / 2) {
      // Fortsetzung über die Kappe: beide Enden gegenüber, am selben Ende
      const abstand = (l: SeitenLage) => (l.ende === 'vorn' ? l.ring : R - 1 - l.ring);
      if (abstand(la) < 0 || abstand(lb) < 0 || Math.abs(abstand(la) - abstand(lb)) > 1.5) {
        ausgelassen.push({ name: kd.name, grund: `Fortsetzung: Sehnenenden ${abstand(la).toFixed(1)} und ${abstand(lb).toFixed(1)} Ringe von der Spitze (ungleich oder in der Kappe)` });
        return;
      }
      const kk = Math.max(0, Math.min(R - 3, Math.round((abstand(la) + abstand(lb)) / 2)));
      const f = fensterKappe(v, erg1.ziele, la.ende, kk, la.seite);
      if (f.flaechen.some((x) => belegt.has(x))) {
        ausgelassen.push({ name: kd.name, grund: 'Fenster überlappt ein anderes' });
        return;
      }
      // der Ring passt zur Sehne? (sonst beginnt das Kind so breit wie der Rumpf: Langhals)
      const ringPkt = (j: number): V3 => {
        const p = v.ringPunkt(la.ende === 'vorn' ? kk : R - 1 - kk, j);
        return [erg1.ziele[3 * p]!, erg1.ziele[3 * p + 1]!, erg1.ziele[3 * p + 2]!];
      };
      const ringBreite = dist(ringPkt(0), ringPkt(N / 2));
      if (ringBreite > 1.15 * d2(kd.a, kd.b)) {
        ausgelassen.push({ name: kd.name, grund: `Fortsetzung: Ring ${kk} ${(ringBreite * PX).toFixed(0)} px breit gegen die Sehne ${(d2(kd.a, kd.b) * PX).toFixed(0)} px` });
        return;
      }
      for (const x of f.flaechen) belegt.add(x);
      const lam = la.ende === 'vorn' ? c / 2 + kk : c / 2 + R - 1 - kk;
      stuetze(la, lam);
      stuetze(lb, lam);
      plaene.push({ kind: kd, art: 'fortsetzung', seite: la.seite, ende: la.ende, lamA: lam, lamB: lam, Cw: N, k: kk, lageA: la, lageB: lb, fenster: f });
    } else ausgelassen.push({ name: kd.name, grund: 'Sehne quer durch den Körper' });
    });
    const wert = plaene.length * 10 + plaene.filter((pl) => pl.art === 'fortsetzung').length * 2 + (achse === natuerlich ? 1 : 0);
    return { achse, eingabe, erg1, plaene, stuetzen, ausgelassen: weg, wert };
  };
  const wahl = [planen(natuerlich), planen(natuerlich === 'x' ? 'y' : 'x')].sort((p, q) => q.wert - p.wert)[0]!;
  const { achse, eingabe, erg1, plaene, stuetzen } = wahl;
  const rahmen = rahmenFuer(achse);
  ausgelassen.push(...wahl.ausgelassen);
  if ('grund' in erg1) return leer(abl, `Rumpf: ${erg1.grund}`, t0, achse);
  if (!plaene.length) return leer(abl, `kein Fenster möglich (${ausgelassen.map((a) => `${a.name}: ${a.grund}`).join('; ')})`, t0, achse);
  // ---- zweiter Durchgang: Rumpf mit Stützstellen ----
  const erg = einteilZiele({ ...eingabe, stuetzen }, v);
  if ('grund' in erg) return leer(abl, `Rumpf: ${erg.grund}`, t0, achse);
  // ---- Kinder bauen ----
  const flaechen = alleFlaechen(k).map((f) => [...f]);
  let nGes = nP;
  const zieleNeu: V3[] = [];
  const quelleNeu: number[] = [];
  const neu = (q: V3, quelle: number): number => {
    zieleNeu.push(q);
    quelleNeu.push(quelle);
    return nGes++;
  };
  const zielSetz = new Map<number, V3>();
  const hartKind = new Set<number>();
  const baenderKind: Band[] = [];
  const innenAlle = new Set<number>();
  const faltenKind: { reihe: number[]; winkel: number[]; seite: 'A' | 'B' }[] = [];
  const gratScharf: number[][] = [];
  const spitzenScharf: number[] = [];
  const spitzenWeg: ('vorn' | 'hinten')[] = [];
  const randKanten: [number, number][] = [];
  const kinderBericht: TeileBericht['kinder'] = [];
  const teilVonFlaeche: number[] = Array.from({ length: flaechen.length }, () => -1);
  const W = (p: number): V3 => (p < nP ? [erg.ziele[3 * p]!, erg.ziele[3 * p + 1]!, erg.ziele[3 * p + 2]!] : zieleNeu[p - nP]!);
  const lage = (p: number): V3 => zielSetz.get(p) ?? W(p);
  for (const pl of plaene) {
    const kd = pl.kind;
    const f = (pl.art === 'streifen' ? fensterStreifen(v, erg.ziele, pl.seite, pl.lamA, pl.lamB, pl.Cw, flaechenIndex) : fensterKappe(v, erg.ziele, pl.ende, pl.k, pl.seite)) ?? pl.fenster;
    for (const p of f.innen) innenAlle.add(p);
    // Seiten des Kindes: A von a zur Spitze, B von b zur Spitze (Welt, z = 0); ein Ende auf der Spitze des Rumpfs nimmt deren Lage
    const zA = kd.bogen.slice(0, kd.spitze + 1).map((p): V3 => [p.q.x, p.q.y, 0]);
    const zB = kd.bogen
      .slice(kd.spitze)
      .reverse()
      .map((p): V3 => [p.q.x, p.q.y, 0]);
    zA[0] = W(f.rand.punkte[0]!);
    zB[0] = W(f.rand.punkte[f.rand.punkte.findIndex((_, i) => Math.abs(f.rand.t[i]! - 2) < 1e-9)] ?? f.rand.punkte[0]!);
    const spitzeEcke = kd.bogen[kd.spitze]!.ecke;
    const M = f.M;
    // Ringe quer zum Kind: kürzeste monotone Zuordnung der beiden Seiten (dynamische Programmierung über die Summe der
    // Sehnenlängen) — bei parallelen Seiten senkrechte Sehnen, am S-Hals Sehnen quer zur örtlichen Richtung; die Ringe folgen
    // dem mittleren Bogenanteil des Zuordnungspfads (Paarung nach gleichem Bogenanteil kippte die Ringe der Ente um 35 px)
    const sehneMitte: V3 = [(zA[0]![0] + zB[0]![0]) / 2, (zA[0]![1] + zB[0]![1]) / 2, 0];
    const tippRoh: V3 = zA[zA.length - 1]!;
    void tippRoh;
    const LA = laengen(zA);
    const LB = laengen(zB);
    const LAt = LA[zA.length - 1]! || 1e-9;
    const LBt = LB[zB.length - 1]! || 1e-9;
    const abstandRinge = (erg.bogen.vorn[0] + erg.bogen.hinten[0]) / PX / (R + c) || d2(kd.a, kd.b) / 4;
    const E = Math.max(M + 1, Math.min(R, Math.round((LAt + LBt) / 2 / abstandRinge)));
    const nA = zA.length;
    const nB = zB.length;
    const D = new Float64Array(nA * nB);
    const her = new Int8Array(nA * nB);
    for (let i = 0; i < nA; i++) {
      for (let j = 0; j < nB; j++) {
        const c0 = dist(zA[i]!, zB[j]!);
        if (i === 0 && j === 0) {
          D[0] = c0;
          continue;
        }
        let best = Infinity;
        let w = 0;
        if (i > 0 && j > 0 && D[(i - 1) * nB + j - 1]! < best) {
          best = D[(i - 1) * nB + j - 1]!;
          w = 3;
        }
        if (i > 0 && D[(i - 1) * nB + j]! < best) {
          best = D[(i - 1) * nB + j]!;
          w = 1;
        }
        if (j > 0 && D[i * nB + j - 1]! < best) {
          best = D[i * nB + j - 1]!;
          w = 2;
        }
        D[i * nB + j] = best + c0;
        her[i * nB + j] = w;
      }
    }
    const pfad: { i: number; j: number; f: number }[] = [];
    {
      let i = nA - 1;
      let j = nB - 1;
      for (;;) {
        pfad.push({ i, j, f: (LA[i]! / LAt + LB[j]! / LBt) / 2 });
        if (i === 0 && j === 0) break;
        const w = her[i * nB + j]!;
        if (w === 3) {
          i--;
          j--;
        } else if (w === 1) i--;
        else j--;
      }
      pfad.reverse();
    }
    /** Punkte beider Seiten beim mittleren Bogenanteil f des Pfads (zwischen zwei Pfadpaaren linear) */
    const paarBei = (f: number): { A: V3; B: V3; sA: number; sB: number } => {
      let q = 0;
      while (q + 1 < pfad.length - 1 && pfad[q + 1]!.f <= f) q++;
      const p0 = pfad[q]!;
      const p1 = pfad[Math.min(pfad.length - 1, q + 1)]!;
      const df = p1.f - p0.f;
      const lam = df > 1e-12 ? Math.min(1, Math.max(0, (f - p0.f) / df)) : 0;
      const sA0 = LA[p0.i]! + (LA[p1.i]! - LA[p0.i]!) * lam;
      const sB0 = LB[p0.j]! + (LB[p1.j]! - LB[p0.j]!) * lam;
      return { A: punktBei(zA, LA, sA0), B: punktBei(zB, LB, sB0), sA: sA0, sB: sB0 };
    };
    // Schritte gleichmäßig im mittleren Bogenanteil; Ecken beider Seiten rasten auf den nächsten Schritt
    const fk = Array.from({ length: E + 1 }, (_, k) => k / E);
    const schritteA: number[] = [];
    const schritteB: number[] = [];
    const rasten = (fE: number, liste: number[]) => {
      let k = Math.round(fE * E);
      k = Math.max(1, Math.min(E - 1, k));
      if (liste.includes(k)) return;
      fk[k] = fE;
      liste.push(k);
    };
    kd.bogen.slice(0, kd.spitze + 1).forEach((pr, i) => {
      if (!pr.ecke || i === 0 || i >= kd.spitze) return;
      const pp = pfad.find((x) => x.i >= i);
      if (pp) rasten(pp.f, schritteA);
    });
    kd.bogen
      .slice(kd.spitze)
      .reverse()
      .forEach((pr, j) => {
        if (!pr.ecke || j === 0 || j >= nB - 1) return;
        const pp = pfad.find((x) => x.j >= j);
        if (pp) rasten(pp.f, schritteB);
      });
    for (let k2 = 1; k2 < E; k2++) fk[k2] = Math.max(fk[k2 - 1]!, Math.min(fk[k2]!, fk[k2 + 1]!));
    const paare = fk.map((f) => paarBei(f));
    const Aab = { punkte: paare.map((x) => x.A), schritte: schritteA, s: paare.map((x) => x.sA) };
    const Bab = { punkte: paare.map((x) => x.B), schritte: schritteB, s: paare.map((x) => x.sB) };
    Aab.punkte[0] = zA[0]!;
    Bab.punkte[0] = zB[0]!;
    Aab.punkte[E] = zA[nA - 1]!;
    Bab.punkte[E] = zB[nB - 1]!;
    const Rc = E - M + 1;
    const tipp: V3 = Aab.punkte[E]!;
    const senkrecht = Math.abs(tipp[1] - sehneMitte[1]) >= Math.abs(tipp[0] - sehneMitte[0]);
    // Reihen: 0 = Rand (Eltern), 1 … Rc−1 neue Ringe, dann Stufen 1 … M−1 (Eltern), zuletzt der Grat
    const Nc = f.rand.punkte.length;
    const reihen: { punkte: number[]; t: number[]; schritt: number; eltern: boolean }[] = [{ ...f.rand, schritt: 0, eltern: true }];
    for (let i = 1; i < Rc; i++) reihen.push({ punkte: Array.from({ length: Nc }, () => neu([0, 0, 0], f.mitte)), t: f.rand.t, schritt: i, eltern: false });
    f.stufen.forEach((s, m) => reihen.push({ ...s, schritt: E - M + m + 1, eltern: true }));
    const viertelIndex = (r: Reihe, Q: number) => {
      let best = 0;
      let bd = Infinity;
      r.t.forEach((t, i) => {
        const d = Math.abs(t - Q);
        if (d < bd) {
          bd = d;
          best = i;
        }
      });
      return best;
    };
    const winkelJe: number[][] = [];
    const seitlich: { reihe: number; plus: number; minus: number }[] = [];
    const mitten: V3[] = [];
    // Rand um seine Mitte (für die Schulter) und seine halbe seitliche Breite
    const randLagen = f.rand.punkte.map((p) => W(p));
    const randMitte: V3 = [0, 0, 0];
    for (const q of randLagen) for (let d = 0; d < 3; d++) randMitte[d] = randMitte[d]! + q[d]! / randLagen.length;
    let randBreite = 0;
    for (const q of randLagen) randBreite = Math.max(randBreite, Math.abs(q[2]));
    let wVorher = randBreite;
    // Ringmitte noch im Rumpfpolygon? Dort misst die Hülle den Rumpf: die Breite bleibt die des Rands
    const imRumpf = (x: number, y: number): boolean => schnittIntervalle(wurzel, 'y', y).some(([a, b]) => x >= a && x <= b);
    reihen.forEach((r, ri) => {
      if (ri === 0) {
        winkelJe.push([]);
        return;
      }
      const A = Aab.punkte[r.schritt]!;
      const B = Bab.punkte[r.schritt]!;
      const C: V3 = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2, 0];
      const w = imRumpf(C[0], C[1]) ? randBreite : huellenBreite(h, C[0], C[1], wVorher);
      wVorher = w;
      mitten.push(C);
      const el = ellipse(A, B, w);
      const winkel: number[] = [];
      const schulter = !r.eltern && r.schritt <= SCHULTER ? r.schritt / (SCHULTER + 1) : 1;
      r.punkte.forEach((p, i) => {
        let q = el.bei(r.t[i]!);
        if (schulter < 1) {
          const rl = randLagen[i]!;
          q = [C[0] + (rl[0] - randMitte[0]) + schulter * (q[0] - C[0] - (rl[0] - randMitte[0])), C[1] + (rl[1] - randMitte[1]) + schulter * (q[1] - C[1] - (rl[1] - randMitte[1])), C[2] + (rl[2] - randMitte[2]) + schulter * (q[2] - C[2] - (rl[2] - randMitte[2]))];
        }
        winkel.push(el.winkel(r.t[i]!));
        if (r.eltern) zielSetz.set(p, q);
        else zieleNeu[p - nP] = q;
      });
      winkelJe.push(winkel);
      const iA = viertelIndex(r, 0);
      const iB = viertelIndex(r, 2);
      const iPlus = viertelIndex(r, 1);
      const iMinus = viertelIndex(r, 3);
      zielSetz.set(r.punkte[iA]!, A);
      zielSetz.set(r.punkte[iB]!, B);
      if (!r.eltern) {
        zieleNeu[r.punkte[iA]! - nP] = A;
        zieleNeu[r.punkte[iB]! - nP] = B;
      }
      hartKind.add(r.punkte[iA]!);
      hartKind.add(r.punkte[iB]!);
      hartKind.add(r.punkte[iPlus]!);
      hartKind.add(r.punkte[iMinus]!);
      seitlich.push({ reihe: ri, plus: iPlus, minus: iMinus });
    });
    // Grat: längs auf dem Bogen von A(E−1) über die Spitze nach B(E−1); quer von −z nach +z an der Spitze; Punkt = Spitze
    const teilZug = (zug: readonly V3[], L: Float64Array, ab: number): V3[] => {
      const out: V3[] = [punktBei(zug, L, ab)];
      for (let i = 0; i < zug.length; i++) if (L[i]! > ab + 1e-12) out.push(zug[i]!);
      return out;
    };
    const gratZug: V3[] = [...teilZug(zA, LA, Aab.s[E - 1]!), ...teilZug(zB, LB, Bab.s[E - 1]!).reverse().slice(1)];
    const gratL = laengen(gratZug);
    const gratPunkte = f.grat.punkte;
    const nG = gratPunkte.length;
    const wTipp = wVorher;
    gratPunkte.forEach((p, i) => {
      let q: V3;
      if (f.grat.richtung === 'laengs') q = punktBei(gratZug, gratL, ((i + 1) / (nG + 1)) * gratL[gratZug.length - 1]!);
      else if (f.grat.richtung === 'quer') q = [tipp[0], tipp[1], ((i - (nG - 1) / 2) / ((nG + 1) / 2)) * wTipp];
      else q = tipp;
      zielSetz.set(p, q);
      hartKind.add(p);
    });
    if (spitzeEcke) {
      if (f.grat.richtung === 'punkt') spitzenScharf.push(gratPunkte[0]!);
      else gratScharf.push(gratPunkte);
    }
    if (pl.art === 'fortsetzung') spitzenWeg.push(pl.ende);
    // Silhouettenbedingung der seitlichen Punkte (Front bei stehendem, Top bei liegendem Kind)
    const normale = (t: V3): V3 | null => {
      const wk: V3 = senkrecht ? [0, t[2], -t[1]] : [t[2], 0, -t[0]];
      const l = Math.hypot(wk[0], wk[1], wk[2]);
      return l > 1e-12 ? [wk[0] / l, wk[1] / l, wk[2] / l] : null;
    };
    seitlich.forEach(({ reihe: ri, plus, minus }) => {
      const r = reihen[ri]!;
      for (const [idx, nachbar] of [
        [plus, reihen[ri - 1] ? reihen[ri - 1]!.punkte[plus]! : -1],
        [minus, reihen[ri - 1] ? reihen[ri - 1]!.punkte[minus]! : -1],
      ] as const) {
        const p = r.punkte[idx]!;
        const vorher = nachbar >= 0 ? lage(nachbar) : null;
        const nach = reihen[ri + 1] && reihen[ri + 1]!.punkte.length === r.punkte.length ? lage(reihen[ri + 1]!.punkte[idx]!) : null;
        const a = vorher ?? lage(p);
        const b = nach ?? lage(p);
        if (!vorher && !nach) continue;
        const t: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
        const w = normale(t);
        if (!w) continue;
        baenderKind.push({ p, quer: [r.punkte[(idx - 1 + r.punkte.length) % r.punkte.length]!, r.punkte[(idx + 1) % r.punkte.length]!], w });
      }
    });
    // Falten: Ecken der Seiten → Reihe beim Schritt, auf der A- bzw. B-Hälfte
    const reiheBei = (schritt: number) => reihen.find((r) => r.schritt === schritt);
    for (const s of Aab.schritte) {
      const r = reiheBei(s);
      if (r) faltenKind.push({ reihe: r.punkte, winkel: winkelJe[reihen.indexOf(r)]!, seite: 'A' });
    }
    for (const s of Bab.schritte) {
      const r = reiheBei(s);
      if (r) faltenKind.push({ reihe: r.punkte, winkel: winkelJe[reihen.indexOf(r)]!, seite: 'B' });
    }
    // Flächen: Röhre Ring → Ring, Fensterflächen mit dem letzten Ring statt des Rands
    for (let i = 0; i + 1 < Rc; i++) {
      const a = reihen[i]!.punkte;
      const b = reihen[i + 1]!.punkte;
      for (let q = 0; q < Nc; q++) flaechen.push([a[q]!, a[(q + 1) % Nc]!, b[(q + 1) % Nc]!, b[q]!]);
    }
    const nrKind = kinderBericht.length;
    const ersatz = new Map<number, number>();
    f.rand.punkte.forEach((p, q) => ersatz.set(p, reihen[Rc - 1]!.punkte[q]!));
    for (const fi of f.flaechen) {
      flaechen[fi] = flaechen[fi]!.map((p) => ersatz.get(p) ?? p);
      teilVonFlaeche[fi] = nrKind;
    }
    while (teilVonFlaeche.length < flaechen.length) teilVonFlaeche.push(nrKind);
    f.rand.punkte.forEach((p, q) => randKanten.push([p, f.rand.punkte[(q + 1) % Nc]!]));
    kinderBericht.push({ name: kd.name, quelle: kd.quelle, art: pl.art, fenster: { lamA: pl.lamA, lamB: pl.lamB, seite: pl.seite, c: pl.art === 'streifen' ? pl.Cw : pl.k }, ringe: Rc, punkte: Nc, spitze: tipp, fuss: sehneMitte, achse: [sehneMitte, ...mitten, tipp], laenge: ((LA[zA.length - 1]! + LB[zB.length - 1]!) / 2) * PX, winkel: kd.winkel, rand: f.rand.punkte, erster: reihen[1]?.punkte[0] ?? -1 });
  }
  // ---- Käfig zusammensetzen ----
  const n = nGes;
  const ziele = new Float64Array(3 * n);
  ziele.set(erg.ziele);
  zieleNeu.forEach((q, i) => ziele.set(q, 3 * (nP + i)));
  for (const [p, q] of zielSetz) ziele.set(q, 3 * p);
  try {
    orientieren(flaechen);
  } catch (err) {
    return leer(abl, `Teile: ${err instanceof Error ? err.message : String(err)}`, t0, achse);
  }
  let kNeu = kaefigAusFlaechen(ziele, flaechen);
  if (volumen(kNeu) < 0) {
    for (const f of flaechen) f.reverse();
    kNeu = kaefigAusFlaechen(ziele, flaechen);
  }
  const pr = pruefeKaefig(kNeu);
  if (!pr.ok) return leer(abl, `Teile: Käfig nicht konsistent (${pr.fehler.slice(0, 2).join('; ')})`, t0, achse);
  // Falten des Rumpfs (ohne Kanten in ein Fenster hinein), Spitzen, Kinderfalten
  const tU = jetzt();
  const eSchaerfeP = new Float64Array(k.nE);
  const vSchaerfeP = new Float64Array(k.n);
  const eckenNeu = faltenAnwenden(k, v, erg, opt.schaerfe, eSchaerfeP, vSchaerfeP);
  for (let e = 0; e < k.nE; e++) {
    const s = eSchaerfeP[e]!;
    if (!(s > 0)) continue;
    const a = k.eA[e]!;
    const b = k.eB[e]!;
    if (innenAlle.has(a) || innenAlle.has(b)) continue;
    const ke = kanteZwischen(kNeu, a, b);
    if (ke >= 0) kNeu.eSchaerfe[ke] = s;
  }
  for (let p = 0; p < nP; p++) if (vSchaerfeP[p]! > 0 && !innenAlle.has(p)) kNeu.vSchaerfe[p] = vSchaerfeP[p]!;
  for (const p of spitzenScharf) kNeu.vSchaerfe[p] = opt.schaerfe;
  for (const g of gratScharf) for (let i = 0; i + 1 < g.length; i++) {
    const ke = kanteZwischen(kNeu, g[i]!, g[i + 1]!);
    if (ke >= 0) kNeu.eSchaerfe[ke] = opt.schaerfe;
  }
  for (const fk of faltenKind) {
    const m = fk.reihe.length;
    for (let i = 0; i < m; i++) {
      const th = (fk.winkel[i]! + fk.winkel[(i + 1) % m]!) / 2;
      const cs = Math.cos(th);
      const g = fk.seite === 'A' ? Math.max(0, cs) ** 2 : Math.max(0, -cs) ** 2;
      if (!(g > 0)) continue;
      const ke = kanteZwischen(kNeu, fk.reihe[i]!, fk.reihe[(i + 1) % m]!);
      if (ke >= 0) kNeu.eSchaerfe[ke] = Math.max(kNeu.eSchaerfe[ke]!, opt.schaerfe * g * g);
    }
  }
  const L = abl.unterteilung.stufen.length;
  const u2 = unterteilung(kNeu, L);
  const loeser2 = grenzLoeser(u2.grenze, n);
  const msUnterteilung = jetzt() - tU;
  // ---- harte Punkte, Bänder, Kappenmaske; ein Löser ----
  const hart = new Uint8Array(n);
  for (const p of erg.naht) if (!innenAlle.has(p)) hart[p] = 1;
  const baender: Band[] = [];
  for (const b of [...erg.reihe, ...erg.ringB]) {
    if (innenAlle.has(b.p) || innenAlle.has(b.quer[0]) || innenAlle.has(b.quer[1])) continue;
    hart[b.p] = 1;
    baender.push(b);
  }
  for (const p of hartKind) hart[p] = 1;
  baender.push(...baenderKind);
  for (let e = 0; e < kNeu.nE; e++) {
    if (!(kNeu.eSchaerfe[e]! > 0)) continue;
    hart[kNeu.eA[e]!] = 1;
    hart[kNeu.eB[e]!] = 1;
  }
  const kappe = new Uint8Array(n);
  for (let p = R * N; p < nP; p++) kappe[p] = 1;
  for (const p of innenAlle) kappe[p] = 1;
  const l = kaefigLoesen({ k: kNeu, u: u2, ziele, hart, baender, kappe, opt });
  const masse = kaefigMasse(kNeu, l.fein, ziele, hart, baender, abl.breiten, { R, N, ringPunkt: v.ringPunkt, K: rahmen.K });
  // Knick an der Naht (Fensterränder) auf Stufe 1
  const nahtKnick = knickAnKanten(u2.stufen[0]!.kaefig, l.fein, kNeu, randKanten);
  const bericht: KaefigBericht = {
    ok: true,
    achse,
    ringF: erg.ringF,
    schritte: erg.schritte,
    bogen: erg.bogen,
    kreuzungen: erg.kreuzungen,
    punkte: { naht: erg.naht.length, reihe: erg.reihe.length, ring: erg.ringB.length },
    ...masse,
    falten: { ringe: [...erg.faltenRinge.keys()].sort((a, b) => a - b), kappen: erg.faltenKappen.size, reihen: erg.reihenFalten, spitzen: erg.spitzen.filter((s) => !spitzenWeg.includes(s)) },
    dichte: erg.dichte,
    teile: { kinder: kinderBericht, nahtKnick, ausgelassen, teilVonFlaeche: Int16Array.from(teilVonFlaeche), rumpf: { seite: wurzel.map((q): V3 => [q.x, q.y, 0]), front: front3, top: top3, anker: erg.anker }, lagen: plaene.map((pl) => ({ name: pl.kind.name, a: { bogen: pl.lageA.bogen, s: +pl.lageA.s.toFixed(3), schritt: +pl.lageA.schritt.toFixed(2), ring: +pl.lageA.ring.toFixed(2) }, b: { bogen: pl.lageB.bogen, s: +pl.lageB.s.toFixed(3), schritt: +pl.lageB.schritt.toFixed(2), ring: +pl.lageB.ring.toFixed(2) }, stuetzen: stuetzen.length })) },
    unbekannte: 3 * n,
    huelle: l.huelle,
    ms: jetzt() - t0,
    msUnterteilung,
    msLoeser: l.ms,
  };
  // Herkunft und Höhe neuer Punkte (Deskriptoren des Earle-Looks)
  const teilQuelle = new Int32Array(n);
  const teilWert = new Float32Array(n);
  const hoehe = new Float64Array(n);
  hoehe.set(abl.hoehe.subarray(0, Math.min(nP, abl.hoehe.length)));
  for (let p = 0; p < n; p++) {
    teilQuelle[p] = p < nP ? p : quelleNeu[p - nP]!;
    if (p >= nP) hoehe[p] = hoehe[quelleNeu[p - nP]!]!;
  }
  const kaefig: Kaefig = { ...kNeu, xyz: l.xyz };
  const ablNeu = { ...abl, kaefig, unterteilung: u2, loeser: loeser2, fein: l.fein, ziele, hoehe, ecken: eckenNeu, spitzen: { vorn: erg.spitzen.includes('vorn') && !spitzenWeg.includes('vorn'), hinten: erg.spitzen.includes('hinten') && !spitzenWeg.includes('hinten') }, teilQuelle, teilWert };
  return { abl: ablNeu, bericht };
}

/** Größter Knick (Grad) zwischen den Stufe-1-Flächen an den Stufe-1-Kanten, die aus den gegebenen Käfigkanten hervorgehen. */
export function knickAnKanten(k1: Kaefig, fein: ArrayLike<number>, k0: Kaefig, kanten: readonly [number, number][]): number {
  const fl = alleFlaechen(k1);
  const fn = new Float64Array(3 * fl.length);
  fl.forEach((f, fi) => {
    let n0 = 0;
    let n1 = 0;
    let n2 = 0;
    for (let i = 0; i < f.length; i++) {
      const a = f[i]!;
      const b = f[(i + 1) % f.length]!;
      n0 += (fein[3 * a + 1]! - fein[3 * b + 1]!) * (fein[3 * a + 2]! + fein[3 * b + 2]!);
      n1 += (fein[3 * a + 2]! - fein[3 * b + 2]!) * (fein[3 * a]! + fein[3 * b]!);
      n2 += (fein[3 * a]! - fein[3 * b]!) * (fein[3 * a + 1]! + fein[3 * b + 1]!);
    }
    const s = 1 / (Math.hypot(n0, n1, n2) || 1);
    fn[3 * fi] = n0 * s;
    fn[3 * fi + 1] = n1 * s;
    fn[3 * fi + 2] = n2 * s;
  });
  let max = 0;
  const winkel = (e: number) => {
    if (e < 0 || k1.eFlaechen[e] !== 2) return;
    const hh = k1.eHalb[e]!;
    const t = k1.hTwin[hh]!;
    if (t < 0) return;
    const a = k1.hFace[hh]!;
    const b = k1.hFace[t]!;
    const d = Math.max(-1, Math.min(1, fn[3 * a]! * fn[3 * b]! + fn[3 * a + 1]! * fn[3 * b + 1]! + fn[3 * a + 2]! * fn[3 * b + 2]!));
    max = Math.max(max, (Math.acos(d) * 180) / Math.PI);
  };
  for (const [a, b] of kanten) {
    const e = kanteZwischen(k0, a, b);
    if (e < 0) continue;
    const m = k0.n + e;
    winkel(kanteZwischen(k1, a, m));
    winkel(kanteZwischen(k1, m, b));
  }
  return max;
}
