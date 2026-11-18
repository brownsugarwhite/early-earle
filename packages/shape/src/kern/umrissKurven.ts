// Plan „Vektorillustration aus einem Liniennetz“ (20.10.), V2 „Saubere Linien“: die Umrisslinie einer Ansicht auf dem
// Körper, wie die anderen Blätter sie zeigen (die lila Front-Linie in Seite und Top, die blaue Seiten-Linie in der Front).
// Bisher waren es die Nullstellen von n·d auf dem feinen Netz: Ihre Lage in der eigenen Ansicht stimmte, ihre Tiefe sprang
// aber überall, wo die Haut über ein Band fast parallel zum Blick läuft (flache Flanken, Kastenseiten) — Zickzack,
// Schleifen, viele Stücke. Jetzt:
// 1. Proben entlang der gezeichneten Kurve (≈ 2 px), jede entlang der Normalen der Zeichnung auf die Silhouette des Körpers
//    geschoben (Halbierung gegen seine Projektion; ohne Körper in ± 40 px eine Lücke). So ist die Linie geordnet und nach
//    Florians Knoten gegliedert. Wo die Silhouette scharf dreht (Ecken, Kehlen, kleine Spitzen), wird feiner abgetastet,
//    an einem gezeichneten Knoten mit einem Fächer der Normalen; wo die Zeichnung über eine runde Stelle eine Ecke macht,
//    treffen beide Seiten dieselbe Rundung — Proben hinter der letzten oder ohne Fortschritt werden übersprungen, und eine
//    Zwischenprobe, die ein ganz anderes Stück der Silhouette trifft, gibt eine Lücke statt einer Sehne.
// 2. Die Tiefe aus den Ein-/Austrittspaaren des Strahls knapp innerhalb der Silhouette: die Mitte eines Paars (an einem
//    runden Teil schließt es sich um die Linie, in einem flachen Band ist es dessen Mitte); je Probe das Paar mit dem
//    kleinsten Gesamtsprung (Viterbi), danach im Paar geglättet. Die Seite nimmt die sichtbare Hälfte (z ≥ 0); ein Paar über
//    die Mittelebene ist die Naht (z = 0, aus der Spiegelsymmetrie).
// 3. Je gezeichnetem Segment kubische Bézier-Kurven in 3D (Ausgleich mit festen Enden an den Knoten, geteilt, wo sie mehr
//    als 0,3 px abweichen; an Ecken der Zeichnung einseitige Tangenten; Griffe höchstens so lang wie die Sehne, sonst
//    schlagen sie Schleifen); die Proben der Anzeige liegen auf diesen Kurven.
// Die gespiegelte Hälfte (Front, Top) und Teile neben der Mittelebene (Seite: Beine, Flügel) bekommen ihr Spiegelbild
// (z negiert) als eigene Linie; an Körpern, die nicht genau spiegelgleich sind (Teile mit seitlichen Paaren), wird die
// zweite Hälfte eigens auf ihrer Seite gesucht. Profil-Einheiten wie das feine Netz. DOM-frei.
import type { Kubik, V2 } from '../bezier';
import { ableitung, punktAuf } from '../bezier';
import type { Dokument } from '../dokument';
import { type Profil, gespiegelteSegmente, segmente, vollerPfad } from '../profil';
import type { Strahlraster } from '../versuch/flaechenlinie';

type V3 = [number, number, number];
type Blatt = 'seite' | 'front' | 'top';

const PX = 461;
/** Suchweite von der Zeichnung zur Silhouette des Körpers */
const SUCHE = 40 / PX;
/** Schrittweite der Suche (danach Halbierung) */
const SCHRITT = 1 / PX;
/** Halbierungen nach der Suche (1 px / 2⁶) */
const HALBIEREN = 6;
/** Probe knapp innerhalb der Silhouette für die Ein-/Austrittspaare */
const INNEN = 0.3 / PX;
/** Abstand der Proben entlang der Zeichnung */
const ABSTAND = 2 / PX;
/** Höchstens 2⁴ Zwischenproben, wo zwei Nachbarn auf der Silhouette mehr als 2 · ABSTAND auseinander liegen */
const DICHTER = 4;
/** Scharfe Stelle der Silhouette (Drehung der Probenfolge), dort wird feiner abgetastet: bis die Sehne höchstens `SEHNE`
 * abweicht, höchstens 2^`FEIN` Teile je Abstand */
const SCHARF = (20 * Math.PI) / 180;
const SEHNE = 0.15 / PX;
const FEIN = 4;
/** Rücklauf der Silhouette gegen die Zeichnung, ab dem eine Probe als „hinter der letzten“ gilt (die Silhouettenpunkte
 * sind auf 1/64 px genau; ein Rücklauf darüber ist eine Überdeckung, kein Rauschen) */
const RUECK = 0.25 / PX;
/** Eine Probe näher als dies an der letzten bringt nichts Neues (nur einen Tiefenruck) und wird übersprungen */
const STILL = 0.5 / PX;
/** So viele Proben (≈ 2 px je Probe) dürfen hinter der letzten liegen, bevor eine Lücke entsteht */
const UEBERSPRINGEN = 16;
/** Toleranz der Kurven (3D) */
const FIT = 0.3 / PX;
/** Tiefensprung, an dem die Linie in Stücke zerfällt (ab dort stellt ein anderes Teil die Silhouette) */
const SPRUNG = 6 / PX;
/** Durchgänge der Tiefenglättung (1-2-1, im Paar gehalten): an der breitesten Stelle wackelt die Mitte sonst um ±1 px */
const GLAETTEN = 8;
/** Seite: Strafe für Paare auf der abgewandten Hälfte (z < −1 px) im Viterbi */
const FERN = 4 / PX;
/** Proben auf den Kurven: etwa alle 2 px (auch lange Kurvensegmente, die Sichtbarkeit wechselt an einer Probe) */
const PROBE_ABSTAND = 2 / PX;
const PROBEN_MAX = 256;

/** Achsen je Ansicht (wie das Strahlraster): Blattkoordinaten u, v, Tiefenachse t, Rastertiefe = vz · Koordinate. */
const ACHSEN: Record<Blatt, { u: 0 | 1 | 2; v: 0 | 1 | 2; t: 0 | 1 | 2; vz: 1 | -1 }> = {
  seite: { u: 0, v: 1, t: 2, vz: -1 },
  front: { u: 2, v: 1, t: 0, vz: 1 },
  top: { u: 0, v: 2, t: 1, vz: -1 },
};

export type UmrissKurve = {
  ansicht: Blatt;
  /** Proben (x, y, z) auf den Kurven (etwa alle 2 px, Enden der Kurvensegmente geteilt) */
  punkte: V3[];
  /** Kurvenparameter je Probe: Kurve s + Anteil t */
  parameter: number[];
  /** nach außen in der eigenen Ansicht (3D, Länge 1) je Probe */
  aussen: V3[];
  /** Kontrollpunkte der kubischen Kurven: P0, C1, C2, P1, C1, C2, P2, … */
  kurve: V3[];
  /** gezeichnete Knoten auf dieser Linie: Knotennummer der Zeichnung und Probe */
  knoten: { index: number; probe: number }[];
  /** geschlossene Linie (Seite ohne Lücke): letzte Probe = erste */
  zu: boolean;
  /** Spiegelbild (z negiert) */
  spiegel: boolean;
};

/** Index der Rasterzelle von (qx, qy), −1 außerhalb. */
function zelleVon(r: Strahlraster, qx: number, qy: number): number {
  const c = Math.floor((qx - r.x0) / r.zb);
  const z = Math.floor((qy - r.y0) / r.zh);
  return c >= 0 && z >= 0 && c < r.n && z < r.n ? z * r.n + c : -1;
}

/** Tiefen aller Treffer des Strahls durch (qx, qy), sortiert, nahe gleiche zusammengefasst (gemeinsame Kanten). */
function trefferTiefen(r: Strahlraster, qx: number, qy: number): number[] {
  const zelle = zelleVon(r, qx, qy);
  if (zelle < 0) return [];
  const D = r.flaeche.dreiecke;
  const out: number[] = [];
  for (let k = r.start[zelle]!; k < r.start[zelle + 1]!; k++) {
    const d = r.liste[k]!;
    const i0 = D[3 * d]!;
    const i1 = D[3 * d + 1]!;
    const i2 = D[3 * d + 2]!;
    const ax = r.u[i0]!;
    const ay = r.v[i0]!;
    const bx = r.u[i1]! - ax;
    const by = r.v[i1]! - ay;
    const cx = r.u[i2]! - ax;
    const cy = r.v[i2]! - ay;
    const det = bx * cy - cx * by;
    if (Math.abs(det) < 1e-24) continue;
    const px = qx - ax;
    const py = qy - ay;
    const w1 = (px * cy - cx * py) / det;
    const w2 = (bx * py - px * by) / det;
    const w0 = 1 - w1 - w2;
    if (w0 < -1e-12 || w1 < -1e-12 || w2 < -1e-12) continue;
    out.push(w0 * r.t[i0]! + w1 * r.t[i1]! + w2 * r.t[i2]!);
  }
  out.sort((a, b) => a - b);
  const zusammen: number[] = [];
  for (const t of out) if (!zusammen.length || t - zusammen[zusammen.length - 1]! > 1e-9) zusammen.push(t);
  return zusammen;
}

/** Trifft der Strahl durch (qx, qy) den Körper? */
function trifft(r: Strahlraster, qx: number, qy: number): boolean {
  const zelle = zelleVon(r, qx, qy);
  if (zelle < 0) return false;
  const D = r.flaeche.dreiecke;
  for (let k = r.start[zelle]!; k < r.start[zelle + 1]!; k++) {
    const d = r.liste[k]!;
    const i0 = D[3 * d]!;
    const i1 = D[3 * d + 1]!;
    const i2 = D[3 * d + 2]!;
    const ax = r.u[i0]!;
    const ay = r.v[i0]!;
    const bx = r.u[i1]! - ax;
    const by = r.v[i1]! - ay;
    const cx = r.u[i2]! - ax;
    const cy = r.v[i2]! - ay;
    const det = bx * cy - cx * by;
    if (Math.abs(det) < 1e-24) continue;
    const px = qx - ax;
    const py = qy - ay;
    const w1 = (px * cy - cx * py) / det;
    const w2 = (bx * py - px * by) / det;
    if (w1 >= -1e-12 && w2 >= -1e-12 && 1 - w1 - w2 >= -1e-12) return true;
  }
  return false;
}

/**
 * Silhouette des Körpers auf der Geraden q + s·m (m = Normale der Zeichnung nach außen), gesucht ab s0 (Versatz der
 * vorigen Probe): liefert den Versatz s; null ohne Körper in der Suchweite.
 */
function aufSilhouette(r: Strahlraster, q: V2, m: V2, s0: number): number | null {
  const innen = (s: number) => trifft(r, q.x + m.x * s, q.y + m.y * s);
  let a: number;
  let b: number;
  let s = Math.max(-SUCHE, Math.min(SUCHE, s0));
  if (innen(s)) {
    while (s < SUCHE && innen(s + SCHRITT)) s += SCHRITT;
    if (s >= SUCHE) return null;
    a = s;
    b = s + SCHRITT;
  } else {
    while (s > -SUCHE && !innen(s - SCHRITT)) s -= SCHRITT;
    if (s <= -SUCHE) return null;
    a = s - SCHRITT;
    b = s;
  }
  for (let k = 0; k < HALBIEREN; k++) {
    const c = (a + b) / 2;
    if (innen(c)) a = c;
    else b = c;
  }
  return a;
}

/** Kandidaten der Tiefe: Ein-/Austrittspaare knapp innerhalb der Silhouette (Koordinate der Tiefenachse, unten < oben). */
function paareBei(r: Strahlraster, vz: 1 | -1, s: V2, m: V2): [number, number][] {
  let rest: number[] = [];
  for (const tief of [INNEN, 3 * INNEN, 10 * INNEN]) {
    const ts = trefferTiefen(r, s.x - m.x * tief, s.y - m.y * tief);
    if (ts.length >= 2 && ts.length % 2 === 0) {
      const out: [number, number][] = [];
      for (let i = 0; i < ts.length; i += 2) {
        const a = vz * ts[i]!;
        const b = vz * ts[i + 1]!;
        out.push(a < b ? [a, b] : [b, a]);
      }
      return out;
    }
    if (ts.length >= 2 && !rest.length) rest = ts;
  }
  // ungerade Trefferzahl (Strahl streift eine Kante): nur die äußere Spanne
  if (rest.length >= 2) {
    const a = vz * rest[0]!;
    const b = vz * rest[rest.length - 1]!;
    return [a < b ? [a, b] : [b, a]];
  }
  return [];
}

// ---------- Kurven in 3D (Schneider: feste Enden und Tangenten, Längen der Griffe im Ausgleich) ----------

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
const norm = (a: V3): V3 => {
  const l = len(a);
  return l > 1e-15 ? mul(a, 1 / l) : [0, 0, 0];
};
type Kubik3 = [V3, V3, V3, V3];
const bez = (b: Kubik3, t: number): V3 => {
  const u = 1 - t;
  return add(add(mul(b[0], u * u * u), mul(b[1], 3 * u * u * t)), add(mul(b[2], 3 * u * t * t), mul(b[3], t * t * t)));
};

function sehnenParameter(pts: readonly V3[]): number[] {
  const u = [0];
  for (let i = 1; i < pts.length; i++) u.push(u[i - 1]! + len(sub(pts[i]!, pts[i - 1]!)));
  const L = u[u.length - 1]! || 1;
  return u.map((x) => x / L);
}

function erzeugen(pts: readonly V3[], u: readonly number[], t1: V3, t2: V3): Kubik3 {
  const p0 = pts[0]!;
  const p3 = pts[pts.length - 1]!;
  let c00 = 0;
  let c01 = 0;
  let c11 = 0;
  let x0 = 0;
  let x1 = 0;
  for (let i = 0; i < pts.length; i++) {
    const t = u[i]!;
    const s = 1 - t;
    const a1 = mul(t1, 3 * s * s * t);
    const a2 = mul(t2, 3 * s * t * t);
    c00 += dot(a1, a1);
    c01 += dot(a1, a2);
    c11 += dot(a2, a2);
    const rest = sub(pts[i]!, add(mul(p0, s * s * s + 3 * s * s * t), mul(p3, 3 * s * t * t + t * t * t)));
    x0 += dot(a1, rest);
    x1 += dot(a2, rest);
  }
  const det = c00 * c11 - c01 * c01;
  const d = len(sub(p3, p0));
  let al = det > 1e-24 ? (x0 * c11 - x1 * c01) / det : 0;
  let ar = det > 1e-24 ? (c00 * x1 - c01 * x0) / det : 0;
  // Griffe nur zwischen 0 und der Sehnenlänge: längere (bei wenigen Proben schlecht bestimmt) schlagen Schleifen
  if (pts.length < 4 || !(al > 1e-6 * d) || !(ar > 1e-6 * d) || al > d || ar > d) al = ar = d / 3;
  return [p0, add(p0, mul(t1, al)), add(p3, mul(t2, ar)), p3];
}

function fehler(pts: readonly V3[], b: Kubik3, u: readonly number[]): [number, number] {
  let max = 0;
  let wo = Math.floor(pts.length / 2);
  for (let i = 1; i < pts.length - 1; i++) {
    const d = len(sub(bez(b, u[i]!), pts[i]!));
    if (d > max) {
      max = d;
      wo = i;
    }
  }
  return [max, wo];
}

/** Newton-Schritt der Parameter (nächster Kurvenpunkt je Probe). */
function nachParametrisieren(pts: readonly V3[], b: Kubik3, u: readonly number[]): number[] {
  const d0 = mul(sub(b[1], b[0]), 3);
  const d1 = mul(sub(b[2], b[1]), 3);
  const d2 = mul(sub(b[3], b[2]), 3);
  return u.map((t, i) => {
    if (i === 0 || i === u.length - 1) return t;
    const s = 1 - t;
    const q1 = add(add(mul(d0, s * s), mul(d1, 2 * s * t)), mul(d2, t * t));
    const q2 = add(mul(sub(d1, d0), 2 * s), mul(sub(d2, d1), 2 * t));
    const diff = sub(bez(b, t), pts[i]!);
    const nenner = dot(q1, q1) + dot(diff, q2);
    const neu = Math.abs(nenner) > 1e-24 ? t - dot(diff, q1) / nenner : t;
    return Math.min(1, Math.max(0, neu));
  });
}

/** Kubische Kurven durch Proben mit festen Enden und Tangenten; geteilt, wo sie mehr als `tol` abweichen. */
function anpassen(pts: readonly V3[], t1: V3, t2: V3, tol: number, tiefe = 0): Kubik3[] {
  const p0 = pts[0]!;
  const p3 = pts[pts.length - 1]!;
  if (pts.length < 3) {
    const d = len(sub(p3, p0)) / 3;
    return [[p0, add(p0, mul(t1, d)), add(p3, mul(t2, d)), p3]];
  }
  let u = sehnenParameter(pts);
  let b = erzeugen(pts, u, t1, t2);
  let [e, wo] = fehler(pts, b, u);
  for (let k = 0; k < 4 && e > tol; k++) {
    u = nachParametrisieren(pts, b, u);
    b = erzeugen(pts, u, t1, t2);
    [e, wo] = fehler(pts, b, u);
  }
  if (e <= tol || tiefe > 10 || pts.length < 4) return [b];
  wo = Math.max(1, Math.min(pts.length - 2, wo));
  const mitte = norm(sub(pts[wo + 1]!, pts[wo - 1]!));
  return [...anpassen(pts.slice(0, wo + 1), t1, mul(mitte, -1), tol, tiefe + 1), ...anpassen(pts.slice(wo), mitte, t2, tol, tiefe + 1)];
}

/** Richtung von Probe i zu Probe j (Länge 1); liegt j zu nah, die nächste weiter weg. */
function richtung(pts: readonly V3[], i: number, j: number): V3 {
  const n = pts.length;
  const schritt = j > i ? 1 : -1;
  let k = Math.max(0, Math.min(n - 1, j));
  while (k + schritt >= 0 && k + schritt < n && len(sub(pts[k]!, pts[i]!)) < 0.5 / PX) k += schritt;
  return norm(sub(pts[k]!, pts[i]!));
}

// ---------- Umrisslinien ----------

/** Probe der Zeichnung auf der Silhouette: Silhouettenpunkt, Normale, Tiefen-Kandidaten, gezeichneter Knoten (−1 = keiner). */
type Probe = { s: V2; m: V2; d: V2; paare: [number, number][]; knoten: number; ecke: boolean; ort?: { si: number; t: number } };

/** Länge eines Bézier-Segments (Sehnen über 16 Teilstücke). */
function segmentLaenge(sg: Kubik): number {
  let L = 0;
  let p = punktAuf(sg, 0);
  for (let k = 1; k <= 16; k++) {
    const q = punktAuf(sg, k / 16);
    L += Math.hypot(q.x - p.x, q.y - p.y);
    p = q;
  }
  return L;
}

type Tiefe = { mitte: number; lo: number; hi: number };

/**
 * Je Probe das Paar mit dem kleinsten Gesamtsprung. Seite: Paare über z = 0 sind die Naht; Strafe für die Hälfte gegen
 * `hälfte` (+1: die sichtbare z ≥ 0, −1: die abgewandte, für unsymmetrische Körper).
 */
function viterbi(st: readonly Probe[], a: Blatt, haelfte: 1 | -1): Tiefe[] {
  const n = st.length;
  const kandidaten = st.map((p) =>
    p.paare.map(([lo, hi]) => {
      const naht = a === 'seite' && lo <= 0 && hi >= 0;
      const mitte = naht ? 0 : (lo + hi) / 2;
      return { mitte, lo, hi, strafe: a === 'seite' && haelfte * mitte < -1 / PX ? FERN : 0 };
    }),
  );
  const kosten: number[][] = [kandidaten[0]!.map((c) => c.strafe)];
  const zurueck: number[][] = [kandidaten[0]!.map(() => -1)];
  for (let i = 1; i < n; i++) {
    const k: number[] = [];
    const z: number[] = [];
    for (const c of kandidaten[i]!) {
      let best = Infinity;
      let bi = 0;
      kandidaten[i - 1]!.forEach((c0, j) => {
        const w = kosten[i - 1]![j]! + Math.abs(c.mitte - c0.mitte);
        if (w < best) {
          best = w;
          bi = j;
        }
      });
      k.push(best + c.strafe);
      z.push(bi);
    }
    kosten.push(k);
    zurueck.push(z);
  }
  let j = 0;
  kosten[n - 1]!.forEach((c, i) => {
    if (c < kosten[n - 1]![j]!) j = i;
  });
  const out = new Array<Tiefe>(n);
  for (let i = n - 1; i >= 0; i--) {
    const c = kandidaten[i]![j]!;
    out[i] = { mitte: c.mitte, lo: c.lo, hi: c.hi };
    j = zurueck[i]![j]!;
  }
  return out;
}

/** Tiefe entlang eines Stücks glätten (`GLAETTEN` Durchgänge 1-2-1), im Paar der Probe gehalten (die Linie bleibt auf der Haut). */
function glaetten(t: readonly Tiefe[]): number[] {
  let d = t.map((x) => x.mitte);
  for (let durch = 0; durch < GLAETTEN; durch++) {
    d = d.map((x, i) => (i === 0 || i === d.length - 1 ? x : (d[i - 1]! + 2 * x + d[i + 1]!) / 4));
    d = d.map((x, i) => Math.min(t[i]!.hi, Math.max(t[i]!.lo, x)));
  }
  return d;
}

/** Linie eines Stücks: Kurven je gezeichnetem Segment, Proben der Anzeige auf den Kurven. */
function linieBauen(st: readonly Probe[], tiefe: readonly number[], a: Blatt, zu: boolean): Omit<UmrissKurve, 'ansicht' | 'spiegel'> | null {
  if (st.length < 2) return null;
  const ax = ACHSEN[a];
  const in3 = (u: number, v: number, t: number): V3 => {
    const q: V3 = [0, 0, 0];
    q[ax.u] = u;
    q[ax.v] = v;
    q[ax.t] = t;
    return q;
  };
  const pts = st.map((p, i) => in3(p.s.x, p.s.y, tiefe[i]!));
  const ms = st.map((p) => p.m);
  const knotenAuf = st.map((p) => p.knoten);
  const ecke = st.map((p) => p.ecke);
  if (zu) {
    pts.push(pts[0]!);
    ms.push(ms[0]!);
    knotenAuf.push(knotenAuf[0]!);
    ecke.push(ecke[0]!);
  }
  const L = pts.length;
  // Abschnitte zwischen den gezeichneten Knoten (Stützstellen)
  const grenzen = [0];
  for (let i = 1; i < L - 1; i++) if (knotenAuf[i]! >= 0) grenzen.push(i);
  grenzen.push(L - 1);
  // Tangente an einer Stützstelle: an Ecken der Zeichnung einseitig, sonst aus beiden Seiten (glatte Knoten bleiben glatt)
  const beidseitig = (i: number): V3 => {
    if (zu && (i === 0 || i === L - 1)) return norm(sub(pts[2]!, pts[L - 3]!));
    return norm(sub(pts[Math.min(L - 1, i + 2)]!, pts[Math.max(0, i - 2)]!));
  };
  const vorwaerts = (i: number): V3 => (ecke[i] || (!zu && i === 0) ? richtung(pts, i, i + 2) : beidseitig(i));
  const rueckwaerts = (i: number): V3 => (ecke[i] || (!zu && i === L - 1) ? richtung(pts, i, i - 2) : mul(beidseitig(i), -1));
  const kurven: Kubik3[] = [];
  const knoten: { index: number; probe: number }[] = [];
  for (let g = 0; g + 1 < grenzen.length; g++) {
    const i0 = grenzen[g]!;
    const i1 = grenzen[g + 1]!;
    if (i1 <= i0) continue;
    // Knoten zunächst mit der Nummer seiner Kurve, unten auf die Probe umgerechnet
    if (knotenAuf[i0]! >= 0) knoten.push({ index: knotenAuf[i0]!, probe: kurven.length });
    kurven.push(...anpassen(pts.slice(i0, i1 + 1), vorwaerts(i0), rueckwaerts(i1), FIT));
  }
  if (!kurven.length) return null;
  if (!zu && knotenAuf[L - 1]! >= 0) knoten.push({ index: knotenAuf[L - 1]!, probe: kurven.length });
  // Proben auf den Kurven; die Normale nach außen von der nächsten Silhouettenprobe (Fortschritt monoton)
  const punkte: V3[] = [];
  const parameter: number[] = [];
  const aussen: V3[] = [];
  const kurve: V3[] = [kurven[0]![0]];
  const anfang: number[] = [];
  let j = 0;
  kurven.forEach((b, s) => {
    kurve.push(b[1], b[2], b[3]);
    anfang.push(Math.max(0, punkte.length - (s === 0 ? 0 : 1)));
    const lang = len(sub(b[1], b[0])) + len(sub(b[2], b[1])) + len(sub(b[3], b[2]));
    const n = Math.max(1, Math.min(PROBEN_MAX, Math.ceil(lang / PROBE_ABSTAND)));
    for (let k = s === 0 ? 0 : 1; k <= n; k++) {
      const q = bez(b, k / n);
      punkte.push(q);
      parameter.push(s + k / n);
      while (j + 1 < L && len(sub(pts[j + 1]!, q)) <= len(sub(pts[j]!, q))) j++;
      const m = ms[j]!;
      aussen.push(in3(m.x, m.y, 0));
    }
  });
  anfang.push(punkte.length - 1);
  for (const k of knoten) k.probe = anfang[k.probe]!;
  return { punkte, parameter, aussen, kurve, knoten, zu };
}

const spiegelZ = (q: V3): V3 => [q[0], q[1], -q[2]];

/**
 * Proben einer gezeichneten Kurve (Segmente in Laufrichtung) auf der Silhouette; `knotenNr(si, ende)` = Nummer des
 * gezeichneten Knotens am Anfang (bzw. mit `ende` am Ende) von Segment si; `bisEnde` = auch das Ende des letzten Segments.
 * - Wo zwei Nachbarn auf der Silhouette weit auseinander landen (Ecken und Kehlen des Körpers), wird dazwischen dichter
 *   abgetastet, an einem gezeichneten Knoten mit einem Fächer der Normalen (eine gezeichnete Ecke über einer runden Kehle).
 * - Landet eine Probe hinter der letzten (eine gezeichnete Ecke über einer runden Stelle: beide Seiten treffen dieselbe
 *   Rundung), wird sie übersprungen, bis die Linie wieder vorn liegt.
 * - Findet eine Zwischenprobe keinen Körper oder hält der Rücklauf an (dort zeigt die Zeichnung etwas anderes als der
 *   Körper), bleibt eine Lücke statt einer Sehne.
 */
function probenAuf(r: Strahlraster, a: Blatt, segs: readonly Kubik[], pr: Profil, sk: number, rechts: boolean, knotenNr: (si: number, ende: boolean) => number, bisEnde: boolean): (Probe | null)[] {
  const ax = ACHSEN[a];
  const proben: (Probe | null)[] = [];
  let s0 = 0;
  const normaleZu = (dir: V2): V2 => (rechts ? { x: dir.y, y: -dir.x } : { x: -dir.y, y: dir.x });
  const richtungZu = (m: V2): V2 => (rechts ? { x: -m.y, y: m.x } : { x: m.y, y: -m.x });
  /** Probe vom Zeichnungspunkt q entlang der Normalen m */
  const probeAus = (q: V2, m: V2, knoten: number): Probe | null => {
    const kn = knoten >= 0 ? pr.knoten[knoten % pr.knoten.length] : undefined;
    const s = aufSilhouette(r, q, m, s0);
    if (s === null) {
      s0 = 0;
      return null;
    }
    s0 = s;
    const sp = { x: q.x + m.x * s, y: q.y + m.y * s };
    const paare = paareBei(r, ax.vz, sp, m);
    return paare.length ? { s: sp, m, d: richtungZu(m), paare, knoten, ecke: kn?.art === 'ecke' } : null;
  };
  const tangente = (sg: Kubik, t: number): V2 => {
    let d = ableitung(sg, t);
    if (Math.hypot(d.x, d.y) < 1e-12) d = ableitung(sg, t < 0.5 ? Math.min(1, t + 1e-3) : Math.max(0, t - 1e-3));
    const l = Math.hypot(d.x, d.y) || 1;
    return { x: d.x / l, y: d.y / l };
  };
  const punkt = (sg: Kubik, t: number): V2 => {
    const p = punktAuf(sg, t);
    return { x: p.x * sk, y: p.y * sk };
  };
  const probe = (sg: Kubik, t: number, knoten: number, si = -1): Probe | null => {
    const p = probeAus(punkt(sg, t), normaleZu(tangente(sg, t)), knoten);
    if (p && si >= 0) p.ort = { si, t };
    return p;
  };
  // liegt pb (in Laufrichtung der Zeichnung, gemittelt aus beiden Proben) hinter pa?
  const zurueck = (pa: Probe, pb: Probe) => {
    const dx = pa.d.x + pb.d.x;
    const dy = pa.d.y + pb.d.y;
    const l = Math.hypot(dx, dy);
    return l > 1e-9 && ((pb.s.x - pa.s.x) * dx + (pb.s.y - pa.s.y) * dy) / l < -RUECK;
  };
  const nah = (pa: Probe, pb: Probe) => Math.hypot(pb.s.x - pa.s.x, pb.s.y - pa.s.y) <= 2 * ABSTAND;
  // liegt die Zwischenprobe pm zwischen pa und pb (nicht weiter von beiden als sie voneinander, 1 px Spiel)? Sonst traf sie
  // ein anderes Stück der Silhouette (dort zeigt die Zeichnung etwas, das der Körper nicht hat)
  const dazwischen = (pa: Probe, pm: Probe, pb: Probe) => {
    const d = Math.hypot(pb.s.x - pa.s.x, pb.s.y - pa.s.y) + 1 / PX;
    return Math.hypot(pm.s.x - pa.s.x, pm.s.y - pa.s.y) <= d && Math.hypot(pm.s.x - pb.s.x, pm.s.y - pb.s.y) <= d;
  };
  /** Zwischenproben auf der Zeichnung zwischen den Parametern ta und tb desselben Segments */
  const dichter = (sg: Kubik, ta: number, pa: Probe, tb: number, pb: Probe, tiefe: number): boolean => {
    if (nah(pa, pb)) return true;
    if (tiefe >= DICHTER) return false;
    const tm = (ta + tb) / 2;
    const pm = probe(sg, tm, -1, pa.ort?.si ?? -1);
    if (!pm || zurueck(pa, pm) || zurueck(pm, pb) || !dazwischen(pa, pm, pb)) return false;
    if (!dichter(sg, ta, pa, tm, pm, tiefe + 1)) return false;
    proben.push(pm);
    return dichter(sg, tm, pm, tb, pb, tiefe + 1);
  };
  /**
   * Zwischenproben an einem Knoten q mit Normalen zwischen ma und mb (Fächer), abgelegt in `ziel`; `genug(pa, pb)` beendet
   * die Teilung (beim Verdichten: nah genug; beim Verfeinern: die Sehne trifft die Silhouette)
   */
  const faecher = (q: V2, ma: V2, pa: Probe, mb: V2, pb: Probe, tiefe: number, ziel = proben, genug: (pa: Probe, pb: Probe, pm: Probe | null) => boolean = nah): boolean => {
    if (genug(pa, pb, null)) return true;
    if (tiefe >= DICHTER) return false;
    const mx = ma.x + mb.x;
    const my = ma.y + mb.y;
    const l = Math.hypot(mx, my);
    if (l < 1e-9) return false;
    const mm = { x: mx / l, y: my / l };
    const pm = probeAus(q, mm, -1);
    if (!pm || zurueck(pa, pm) || zurueck(pm, pb) || !dazwischen(pa, pm, pb)) return false;
    if (genug(pa, pb, pm)) return true;
    if (!faecher(q, ma, pa, mm, pm, tiefe + 1, ziel, genug)) return false;
    ziel.push(pm);
    return faecher(q, mm, pm, mb, pb, tiefe + 1, ziel, genug);
  };
  let letzte: { p: Probe; t: number; si: number } | null = null;
  let uebersprungen = 0;
  segs.forEach((sg, si) => {
    const n = Math.max(2, Math.ceil((segmentLaenge(sg) * sk) / ABSTAND));
    const bis = bisEnde && si === segs.length - 1 ? n : n - 1;
    for (let k = 0; k <= bis; k++) {
      const t = k / n;
      const p = probe(sg, t, k === 0 ? knotenNr(si, false) : k === n ? knotenNr(si, true) : -1, si);
      if (!p) {
        if (proben.length && proben[proben.length - 1] !== null) proben.push(null);
        letzte = null;
        uebersprungen = 0;
        continue;
      }
      if (letzte) {
        // hinter der letzten oder ohne Fortschritt (dieselbe Stelle der Silhouette, ihre Tiefe brächte nur einen Ruck)
        const still = Math.hypot(p.s.x - letzte.p.s.x, p.s.y - letzte.p.s.y) < STILL;
        if ((still || zurueck(letzte.p, p)) && uebersprungen < UEBERSPRINGEN) {
          uebersprungen++;
          continue;
        }
        const merke = proben.length;
        const ok =
          uebersprungen < UEBERSPRINGEN &&
          (letzte.si === si
            ? dichter(sg, letzte.t, letzte.p, t, p, 0)
            : nah(letzte.p, p) || faecher(punkt(sg, 0), normaleZu(tangente(segs[letzte.si]!, 1)), letzte.p, normaleZu(tangente(sg, 0)), p, 0));
        if (!ok) {
          proben.length = merke;
          proben.push(null);
        }
      }
      uebersprungen = 0;
      proben.push(p);
      letzte = { p, t, si };
    }
  });
  // geschlossene Zeichnung: der Anfang schließt an das Ende an — dort ebenso überspringen, verdichten oder trennen
  // (Hinweis: `faecher` legt seine Proben am Ende ab, genau zwischen das letzte und das erste Stück)
  const erste = proben[0];
  if (!bisEnde && letzte && erste) {
    const ende: { p: Probe; si: number } = letzte;
    let i = 0;
    while (i < UEBERSPRINGEN && i < proben.length && proben[i] && zurueck(ende.p, proben[i]!)) i++;
    if (i >= UEBERSPRINGEN) proben.push(null);
    else {
      if (i > 0) proben.splice(0, i);
      const anfang = proben[0];
      if (!anfang) proben.push(null);
      else if (!nah(ende.p, anfang)) {
        const merke = proben.length;
        const sg = segs[0]!;
        if (!faecher(punkt(sg, 0), normaleZu(tangente(segs[ende.si]!, 1)), ende.p, normaleZu(tangente(sg, 0)), anfang, 0)) {
          proben.length = merke;
          proben.push(null);
        }
      }
    }
  }
  // an scharfen Stellen der Silhouette (die Folge der Proben dreht um mehr als 20°: Ecken, Kerben, kleine Spitzen) feiner,
  // bis die Sehne höchstens 0,15 px von der Silhouette abweicht — sonst schneidet die Kurve sie ab
  const winkel = (a: Probe, b: Probe, c: Probe) => {
    const ux = b.s.x - a.s.x;
    const uy = b.s.y - a.s.y;
    const vx = c.s.x - b.s.x;
    const vy = c.s.y - b.s.y;
    const l = Math.hypot(ux, uy) * Math.hypot(vx, vy);
    return l > 1e-24 ? Math.acos(Math.max(-1, Math.min(1, (ux * vx + uy * vy) / l))) : 0;
  };
  const fein: (Probe | null)[] = [];
  const zwischen = (sg: Kubik, si: number, ta: number, pa: Probe, tb: number, pb: Probe, tiefe: number) => {
    if (tiefe >= FEIN || Math.hypot(pb.s.x - pa.s.x, pb.s.y - pa.s.y) < 0.25 / PX) return;
    const tm = (ta + tb) / 2;
    const pm = probe(sg, tm, -1, si);
    if (!pm || zurueck(pa, pm) || zurueck(pm, pb) || !dazwischen(pa, pm, pb)) return;
    // Abstand der Zwischenprobe von der Sehne
    const ux = pb.s.x - pa.s.x;
    const uy = pb.s.y - pa.s.y;
    const l = Math.hypot(ux, uy) || 1e-12;
    const sehne = Math.abs(ux * (pm.s.y - pa.s.y) - uy * (pm.s.x - pa.s.x)) / l;
    if (sehne <= SEHNE && l <= 2 * ABSTAND) return;
    zwischen(sg, si, ta, pa, tm, pm, tiefe + 1);
    fein.push(pm);
    zwischen(sg, si, tm, pm, tb, pb, tiefe + 1);
  };
  // Sehne pa–pb trifft die Silhouette (die Zwischenprobe pm liegt höchstens `SEHNE` daneben)?
  const sehneTrifft = (pa: Probe, pb: Probe, pm: Probe | null) => {
    if (Math.hypot(pb.s.x - pa.s.x, pb.s.y - pa.s.y) < 0.25 / PX) return true;
    if (!pm) return false;
    const ux = pb.s.x - pa.s.x;
    const uy = pb.s.y - pa.s.y;
    const l = Math.hypot(ux, uy) || 1e-12;
    return Math.abs(ux * (pm.s.y - pa.s.y) - uy * (pm.s.x - pa.s.x)) / l <= SEHNE && l <= 2 * ABSTAND;
  };
  for (let i = 0; i < proben.length; i++) {
    const p = proben[i]!;
    fein.push(p);
    const q = proben[i + 1];
    if (!p || !q || !p.ort || !q.ort) continue;
    const vor = proben[i - 1];
    const nach = proben[i + 2];
    if (!((vor && winkel(vor, p, q) > SCHARF) || (nach && winkel(p, q, nach) > SCHARF))) continue;
    if (p.ort.si === q.ort.si) zwischen(segs[p.ort.si]!, p.ort.si, p.ort.t, p, q.ort.t, q, 0);
    else if (q.ort.t === 0) {
      // über einen gezeichneten Knoten (eine Ecke der Zeichnung über einer runden Stelle): bis zum Ende des Segments, dann
      // der Fächer der Normalen am Knoten bis zur ersten Probe des nächsten
      const merke = fein.length;
      const sa = segs[p.ort.si]!;
      const ende = probe(sa, 1, -1, p.ort.si);
      const ma = normaleZu(tangente(sa, 1));
      const mb = normaleZu(tangente(segs[q.ort.si]!, 0));
      if (ende && !zurueck(p, ende) && !zurueck(ende, q) && dazwischen(p, ende, q) && Math.hypot(ende.s.x - p.s.x, ende.s.y - p.s.y) >= STILL) {
        zwischen(sa, p.ort.si, p.ort.t, p, 1, ende, 0);
        fein.push(ende);
        if (!faecher(punkt(segs[q.ort.si]!, 0), ma, ende, mb, q, 0, fein, sehneTrifft)) fein.length = merke;
      } else if (!faecher(punkt(segs[q.ort.si]!, 0), ma, p, mb, q, 0, fein, sehneTrifft)) fein.length = merke;
    }
  }
  return fein;
}

/**
 * Linien aus den Proben einer Ansicht: Stücke an Lücken (geschlossene Seite: erstes und letztes Stück hängen am Anfang
 * zusammen), Tiefe je Stück (Viterbi, `haelfte` wie dort), an Sprüngen geteilt, geglättet, als Kurven.
 */
function linienAus(proben: readonly (Probe | null)[], a: Blatt, zuMoeglich: boolean, haelfte: 1 | -1): Omit<UmrissKurve, 'ansicht' | 'spiegel'>[] {
  const stuecke: Probe[][] = [];
  let akt: Probe[] = [];
  for (const p of proben) {
    if (p) akt.push(p);
    else if (akt.length) {
      stuecke.push(akt);
      akt = [];
    }
  }
  if (akt.length) stuecke.push(akt);
  const ganz = zuMoeglich && proben.every((p) => p !== null);
  if (zuMoeglich && !ganz && stuecke.length > 1 && proben[0] && proben[proben.length - 1]) {
    const letztes = stuecke.pop()!;
    stuecke[0] = [...letztes, ...stuecke[0]!];
  }
  const out: Omit<UmrissKurve, 'ansicht' | 'spiegel'>[] = [];
  for (const st of stuecke) {
    const tiefen = viterbi(st, a, haelfte);
    // an Sprüngen (ein anderes Teil stellt die Silhouette) teilen
    const teile: [number, number][] = [];
    let anfang = 0;
    for (let i = 1; i <= st.length; i++) {
      if (i < st.length && Math.abs(tiefen[i]!.mitte - tiefen[i - 1]!.mitte) <= SPRUNG) continue;
      teile.push([anfang, i]);
      anfang = i;
    }
    const geschlossen = ganz && teile.length === 1 && Math.abs(tiefen[0]!.mitte - tiefen[st.length - 1]!.mitte) <= SPRUNG;
    for (const [i0, i1] of teile) {
      const linie = linieBauen(st.slice(i0, i1), glaetten(tiefen.slice(i0, i1)), a, geschlossen);
      if (linie) out.push(linie);
    }
  }
  return out;
}

/**
 * Umrisslinien aller drei Ansichten auf dem Körper (Profil-Einheiten wie das feine Netz). `raster` = Strahlraster der drei
 * Achsen des feinen Netzes (dasselbe wie für den Sichttest). `spiegelgleich`: Der Körper ist an z = 0 gespiegelt (Röhre:
 * rechte Hälfte gerechnet, linke gespiegelt) — dann ist die zweite Hälfte jeder Linie ihr Spiegelbild; sonst (Teile: die
 * seitlichen Paare sind nicht genau gleich) wird sie eigens auf ihrer Seite gesucht.
 */
export function umrissKurven(dok: Dokument, raster: Record<Blatt, Strahlraster>, spiegelgleich = true): UmrissKurve[] {
  const out: UmrissKurve[] = [];
  const sk = dok.skalierung;
  for (const a of ['seite', 'front', 'top'] as const) {
    const r = raster[a];
    const pr = dok.profile[a];
    const segs = segmente(pr);
    if (!segs.length) continue;
    // Umlaufsinn des ganzen Umrisses (Halbprofile samt Spiegelbild in Laufrichtung): bei positivem Umlauf liegt außen rechts
    let flaeche = 0;
    for (const sg of vollerPfad(pr)) {
      for (let k = 0; k < 8; k++) {
        const p = punktAuf(sg, k / 8);
        const q = punktAuf(sg, (k + 1) / 8);
        flaeche += p.x * q.y - q.x * p.y;
      }
    }
    const rechts = flaeche > 0;
    const halb = pr.art === 'halb';
    const m = segs.length;
    const proben = probenAuf(r, a, segs, pr, sk, rechts, (si, ende) => (ende ? si + 1 : si), halb);
    const linien = linienAus(proben, a, !halb, 1);
    for (const linie of linien) out.push({ ansicht: a, ...linie, spiegel: false });
    if (spiegelgleich) {
      // Spiegelbild: die andere Hälfte von Front und Top; in der Seite nur Stücke neben der Mittelebene (Beine, Flügel)
      for (const linie of linien) {
        if (halb || linie.punkte.some((q) => Math.abs(q[2]) > 2 / PX)) {
          out.push({ ...linie, ansicht: a, punkte: linie.punkte.map(spiegelZ), aussen: linie.aussen.map(spiegelZ), kurve: linie.kurve.map(spiegelZ), spiegel: true });
        }
      }
    } else if (halb) {
      // die gespiegelte Hälfte der Zeichnung in Laufrichtung (vom letzten Achsknoten zurück): Segment j ist Segment m − 1 − j
      const zweite = probenAuf(r, a, gespiegelteSegmente(pr), pr, sk, rechts, (j, ende) => (ende ? m - 1 - j : m - j), true);
      for (const linie of linienAus(zweite, a, false, 1)) out.push({ ansicht: a, ...linie, spiegel: true });
    } else {
      // Seite: dieselben Proben, die abgewandte Hälfte bevorzugt; nur Stücke neben der Mittelebene
      for (const linie of linienAus(proben, a, true, -1)) if (linie.punkte.some((q) => q[2] < -2 / PX)) out.push({ ansicht: a, ...linie, spiegel: true });
    }
  }
  return out;
}
