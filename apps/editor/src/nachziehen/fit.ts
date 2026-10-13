// Nachzeichnen (M4.1b): Ecken erkennen und Bézier-Kurven anpassen (Schneider-Verfahren) — Port von
// `apps/editor/scripts/nachziehen/fit.py`. Gerechnet wird in Pixeln mit y nach oben; Knoten wie in `packages/shape`
// (Griffe relativ zum Punkt).

import type { Knoten, V2 } from '@ee/shape';

type P = [number, number];
type Kubik = [P, P, P, P];

const sub = (a: P, b: P): P => [a[0] - b[0], a[1] - b[1]];
const add = (a: P, b: P): P => [a[0] + b[0], a[1] + b[1]];
const mul = (a: P, s: number): P => [a[0] * s, a[1] * s];
const dot = (a: P, b: P): number => a[0] * b[0] + a[1] * b[1];
const dist = (a: P, b: P): number => Math.hypot(a[0] - b[0], a[1] - b[1]);
function norm(a: P): P {
  const l = Math.hypot(a[0], a[1]);
  return l > 1e-12 ? [a[0] / l, a[1] / l] : [0, 0];
}
const winkelGrad = (u: P, v: P): number => (Math.acos(Math.max(-1, Math.min(1, dot(norm(u), norm(v))))) * 180) / Math.PI;

/** Indizes der Ecken: Richtungsänderung über ±m Proben ≥ grad, lokales Maximum über ±8 Proben. */
export function ecken(pts: readonly P[], geschlossen: boolean, m = 5, grad = 42): number[] {
  const n = pts.length;
  const wink = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    if (!geschlossen && (i < m || i >= n - m)) continue;
    const a = pts[(((i - m) % n) + n) % n]!;
    const p = pts[i]!;
    const b = pts[(i + m) % n]!;
    wink[i] = winkelGrad(sub(p, a), sub(b, p));
  }
  const idx: number[] = [];
  for (let i = 0; i < n; i++) {
    if (wink[i]! < grad) continue;
    let max = true;
    for (let k = -8; k <= 8; k++) {
      if (!k) continue;
      if (!geschlossen && (i + k < 0 || i + k >= n)) continue;
      if (wink[i]! < wink[(((i + k) % n) + n) % n]!) {
        max = false;
        break;
      }
    }
    if (!max) continue;
    if (idx.length && i - idx[idx.length - 1]! < 3) continue;
    idx.push(i);
  }
  return idx;
}

function bez(b: Kubik, t: number): P {
  const s = 1 - t;
  return [s * s * s * b[0][0] + 3 * s * s * t * b[1][0] + 3 * s * t * t * b[2][0] + t * t * t * b[3][0], s * s * s * b[0][1] + 3 * s * s * t * b[1][1] + 3 * s * t * t * b[2][1] + t * t * t * b[3][1]];
}
function bezd(b: Kubik, t: number): P {
  const s = 1 - t;
  return [3 * s * s * (b[1][0] - b[0][0]) + 6 * s * t * (b[2][0] - b[1][0]) + 3 * t * t * (b[3][0] - b[2][0]), 3 * s * s * (b[1][1] - b[0][1]) + 6 * s * t * (b[2][1] - b[1][1]) + 3 * t * t * (b[3][1] - b[2][1])];
}
function bezdd(b: Kubik, t: number): P {
  return [6 * (1 - t) * (b[2][0] - 2 * b[1][0] + b[0][0]) + 6 * t * (b[3][0] - 2 * b[2][0] + b[1][0]), 6 * (1 - t) * (b[2][1] - 2 * b[1][1] + b[0][1]) + 6 * t * (b[3][1] - 2 * b[2][1] + b[1][1])];
}

function chord(pts: readonly P[]): number[] {
  const u = [0];
  for (let i = 1; i < pts.length; i++) u.push(u[i - 1]! + dist(pts[i]!, pts[i - 1]!));
  const L = u[u.length - 1]! || 1;
  return u.map((x) => x / L);
}

function generate(pts: readonly P[], u: readonly number[], t1: P, t2: P): Kubik {
  const p0 = pts[0]!;
  const p3 = pts[pts.length - 1]!;
  let c00 = 0;
  let c01 = 0;
  let c11 = 0;
  let x0 = 0;
  let x1 = 0;
  u.forEach((t, i) => {
    const s = 1 - t;
    const b1 = 3 * s * s * t;
    const b2 = 3 * s * t * t;
    const A1 = mul(t1, b1);
    const A2 = mul(t2, b2);
    c00 += dot(A1, A1);
    c01 += dot(A1, A2);
    c11 += dot(A2, A2);
    const tmp = sub(pts[i]!, add(mul(p0, s * s * s + b1), mul(p3, b2 + t * t * t)));
    x0 += dot(A1, tmp);
    x1 += dot(A2, tmp);
  });
  const det = c00 * c11 - c01 * c01;
  const seg = dist(p0, p3);
  let al: number;
  let be: number;
  if (Math.abs(det) < 1e-12) al = be = seg / 3;
  else {
    al = (x0 * c11 - x1 * c01) / det;
    be = (c00 * x1 - c01 * x0) / det;
  }
  if (al < 1e-6 * seg || be < 1e-6 * seg) al = be = seg / 3;
  return [p0, add(p0, mul(t1, al)), add(p3, mul(t2, be)), p3];
}

function maxerr(pts: readonly P[], b: Kubik, u: readonly number[]): [number, number] {
  let m = 0;
  let sp = Math.floor(pts.length / 2);
  for (let i = 1; i < pts.length - 1; i++) {
    const d = dist(bez(b, u[i]!), pts[i]!) ** 2;
    if (d >= m) {
      m = d;
      sp = i;
    }
  }
  return [m, sp];
}

function reparam(pts: readonly P[], b: Kubik, u: readonly number[]): number[] {
  return pts.map((p, i) => {
    const t = u[i]!;
    const q = sub(bez(b, t), p);
    const d1 = bezd(b, t);
    const d2 = bezdd(b, t);
    const num = dot(q, d1);
    const den = dot(d1, d1) + dot(q, d2);
    return Math.abs(den) < 1e-12 ? t : Math.min(1, Math.max(0, t - num / den));
  });
}

/** Kubische Stücke durch pts mit Starttangente t1 (Laufrichtung) und Endtangente t2 (vom Ende zurück); err = Fehler² in px². */
export function fitkubik(pts: readonly P[], t1: P, t2: P, err: number): Kubik[] {
  if (pts.length === 2) {
    const dd = dist(pts[0]!, pts[1]!) / 3;
    return [[pts[0]!, add(pts[0]!, mul(t1, dd)), add(pts[1]!, mul(t2, dd)), pts[1]!]];
  }
  let u = chord(pts);
  let b = generate(pts, u, t1, t2);
  let [m, sp] = maxerr(pts, b, u);
  if (m < err) return [b];
  if (m < err * 4) {
    for (let k = 0; k < 8; k++) {
      u = reparam(pts, b, u);
      b = generate(pts, u, t1, t2);
      [m, sp] = maxerr(pts, b, u);
      if (m < err) return [b];
    }
  }
  sp = Math.max(1, Math.min(pts.length - 2, sp));
  const tc = norm(sub(pts[sp - 1]!, pts[sp + 1]!));
  return [...fitkubik(pts.slice(0, sp + 1), t1, tc, err), ...fitkubik(pts.slice(sp), mul(tc, -1), t2, err)];
}

const tangenteStart = (pts: readonly P[], k = 3): P => norm(sub(pts[Math.min(k, pts.length - 1)]!, pts[0]!));
const tangenteEnde = (pts: readonly P[], k = 3): P => norm(sub(pts[Math.max(0, pts.length - 1 - k)]!, pts[pts.length - 1]!));

type Kn = { p: P; ein: P; aus: P; art: 'glatt' | 'ecke' };

function zuKnoten(kurven: Kubik[], eckeStart: boolean, eckeEnde: boolean): Kn[] {
  const kn: Kn[] = [];
  kurven.forEach((b, i) => {
    if (i === 0) kn.push({ p: b[0], ein: [0, 0], aus: sub(b[1], b[0]), art: eckeStart ? 'ecke' : 'glatt' });
    else kn[kn.length - 1]!.aus = sub(b[1], b[0]);
    kn.push({ p: b[3], ein: sub(b[2], b[3]), aus: [0, 0], art: 'glatt' });
  });
  kn[kn.length - 1]!.art = eckeEnde ? 'ecke' : 'glatt';
  return kn;
}

/**
 * Geschlossenes Profil aus einer geschlossenen Probe (Abstand ≈ 2 px, im Uhrzeigersinn bei y nach oben), Fehler ≤ errPx.
 * Ohne Ecken beginnt die Kurve an der höchsten Stelle. Liefert Knoten in Pixeln.
 */
export function profilGeschlossen(pts: readonly P[], errPx: number): Kn[] {
  const err = errPx * errPx;
  let ek = ecken(pts, true);
  const n = pts.length;
  const glattStart = ek.length === 0;
  if (glattStart) {
    let best = 0;
    for (let i = 1; i < n; i++) if (pts[i]![1] > pts[best]![1]) best = i;
    ek = [best];
  }
  const alle: Kn[] = [];
  ek.forEach((a, j) => {
    const b = ek[(j + 1) % ek.length]!;
    const laenge = (((b - a) % n) + n) % n || n;
    const seg: P[] = [];
    for (let k = 0; k <= laenge; k++) seg.push(pts[(a + k) % n]!);
    let t1: P;
    let t2: P;
    if (glattStart) {
      t1 = norm(sub(pts[(a + 2) % n]!, pts[(((a - 2) % n) + n) % n]!));
      t2 = mul(t1, -1);
    } else {
      t1 = tangenteStart(seg);
      t2 = tangenteEnde(seg);
    }
    const kurven = fitkubik(seg, t1, t2, err);
    const kn = zuKnoten(kurven, !glattStart, !glattStart);
    if (alle.length) {
      alle[alle.length - 1]!.aus = kn[0]!.aus;
      alle.push(...kn.slice(1));
    } else alle.push(...kn);
  });
  const last = alle.pop()!;
  alle[0]!.ein = last.ein;
  return alle;
}

/**
 * Halbprofil aus einer offenen Probe von Achse zu Achse (Pixel, editierbare Hälfte ≥ 0 auf der Achsnormalen; senkrecht →
 * Achse x = 0 (Front), sonst y = 0 (Top)). Glatte Achsknoten bekommen den Griff quer zur Achse; weicht die Kurve dort um
 * mehr als `grenzGrad` ab, wird der Achsknoten eine Ecke. Die Achsregeln selbst (`achsenRegeln`) wendet der Aufrufer an.
 */
export function profilHalb(pts: readonly P[], errPx: number, senkrecht: boolean, grenzGrad = 30): Kn[] {
  const err = errPx * errPx;
  const quer: P = senkrecht ? [1, 0] : [0, 1];
  const ek = ecken(pts, false).filter((i) => i > 4 && i < pts.length - 5);
  const grenzen = [0, ...ek, pts.length - 1];
  const tStart = tangenteStart(pts, 4);
  const tEnde = tangenteEnde(pts, 4);
  const startEcke = winkelGrad(tStart, quer) > grenzGrad;
  const endeEcke = winkelGrad(tEnde, quer) > grenzGrad;
  const alle: Kn[] = [];
  for (let j = 0; j + 1 < grenzen.length; j++) {
    const seg = pts.slice(grenzen[j]!, grenzen[j + 1]! + 1);
    const t1 = j === 0 ? (startEcke ? tStart : quer) : tangenteStart(seg);
    const t2 = j === grenzen.length - 2 ? (endeEcke ? tEnde : quer) : tangenteEnde(seg);
    const kurven = fitkubik(seg, t1, t2, err);
    const kn = zuKnoten(kurven, j > 0, j < grenzen.length - 2);
    if (alle.length) {
      alle[alle.length - 1]!.aus = kn[0]!.aus;
      alle[alle.length - 1]!.art = 'ecke';
      alle.push(...kn.slice(1));
    } else alle.push(...kn);
  }
  alle[0]!.art = startEcke ? 'ecke' : 'glatt';
  alle[alle.length - 1]!.art = endeEcke ? 'ecke' : 'glatt';
  return alle;
}

/** Knoten (Pixel, y nach oben) → Editor-Knoten in Welt über eine lineare Abbildung. */
export function knotenNachWelt(kn: readonly Kn[], abb: (p: P) => V2, massstab: number): Knoten[] {
  return kn.map((k) => ({ p: abb(k.p), ein: { x: k.ein[0] * massstab, y: k.ein[1] * massstab }, aus: { x: k.aus[0] * massstab, y: k.aus[1] * massstab }, art: k.art }));
}
