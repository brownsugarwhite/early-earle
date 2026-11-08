// Zeichnen (08.11.2026): aus dem geglätteten Strich eine Bézier-Form mit den wenigsten Ankern (Florian: „nur die allernötigsten
// Handlepunkte setzen“).
//
// Recherche Teil B: Alle offenen Schneider-Umsetzungen (auch `fit.ts`) teilen gierig am Punkt größter Abweichung und setzen so zu
// viele Anker; Potrace und kurbo suchen erst die wenigsten Stücke, dann den kleinsten Fehler, und begrenzen die Grifflänge (lange
// Griffe machen Beulen trotz kleiner Abweichung). So hier:
// 1. Gleichabständig abtasten (Abstand `schritt`, ≈ 2 Bildschirm-Pixel).
// 2. Ecken nur, wo die Richtung auf kurzem Weg stark dreht und die Drehung dort gebündelt ist (eine enge Rundung dreht über das
//    doppelte Fenster doppelt so viel, eine Ecke kaum mehr). Ecken teilen die Spur in Läufe.
// 3. Je Lauf dynamische Programmierung über Kandidaten im Abstand weniger Proben: Ein Stück zwischen zwei Kandidaten ist erlaubt, wenn
//    es mit festen Tangenten (an glatten Kandidaten die örtliche Richtung, so stoßen die Stücke glatt aneinander) höchstens `treue`
//    von der Spur abweicht, seine Griffe höchstens `armMax` der Sehne lang sind und die Richtung darin höchstens `drehungMax` streut.
//    Gewählt wird die Folge mit den wenigsten Stücken, bei Gleichstand der kleinste Fehler (und Anker an waagerechten oder
//    senkrechten Tangenten, wie Illustrators Ellipse).
// 4. Danach glatte Anker probeweise entfernen, solange die Schranken halten.
// Geschlossene Spuren ohne Ecke beginnen an einem Extrempunkt (bester von vier). Gerade Läufe zwischen Ecken werden genau gerade.

import type { V2 } from '../bezier';
import type { Anker, Pfad, Stueck } from './bezierPfad';

export type AnpassOptionen = {
  /** größte Abweichung von der Spur (Einheiten des Aufrufers) */
  treue: number;
  /** Abtastweite längs der Spur (≈ 2 Bildschirm-Pixel); die Fenster unten zählen in diesen Proben */
  schritt: number;
  geschlossen: boolean;
  /** Ecke: Drehung über ± so viele Proben (Standard 4 ≈ 8 px) … */
  eckFenster?: number;
  /** … mindestens so viel Grad (Standard 40) */
  eckWinkel?: number;
  /** Ecken mindestens so viele Proben auseinander und von offenen Enden entfernt (Standard 12 ≈ 24 px) */
  eckAbstand?: number;
  /** Griff höchstens dieser Anteil der Sehne (Standard 0,65) */
  armMax?: number;
  /** Richtung streut in einem Stück höchstens so viele Grad (Standard 100: ein Kreis bekommt vier Anker) */
  drehungMax?: number;
  /** höchstens so viele Kandidaten je Lauf (Standard 120; lange Striche bekommen weitere Abstände) */
  kandidatenMax?: number;
};

export type Anpassung = {
  pfad: Pfad;
  /** größte Abweichung der Form von der abgetasteten Spur */
  fehler: number;
  /** Zahl der Proben und der Ecken (zum Messen) */
  proben: number;
  ecken: number;
  ms: number;
};

const GRAD = Math.PI / 180;
/** Uhr ohne DOM-Typen (wie `dicht/ausKurven.ts`) */
const jetzt = (): number => (globalThis as { performance?: { now(): number } }).performance?.now() ?? 0;
const dist = (a: V2, b: V2): number => Math.hypot(a.x - b.x, a.y - b.y);

/** Gleichabständig abtasten (genau gleiche Abstände über die ganze Länge); geschlossen ohne doppelten Schlusspunkt */
export function gleichabstaendig(spur: readonly V2[], h: number, geschlossen: boolean): V2[] {
  const P: V2[] = [];
  for (const p of spur) if (P.length === 0 || dist(p, P[P.length - 1]!) > 1e-9) P.push({ x: p.x, y: p.y });
  if (geschlossen && P.length > 2 && dist(P[0]!, P[P.length - 1]!) < 1e-9) P.pop();
  if (P.length < 2) return P;
  const pts = geschlossen ? [...P, P[0]!] : P;
  const L = [0];
  for (let i = 1; i < pts.length; i++) L.push(L[i - 1]! + dist(pts[i - 1]!, pts[i]!));
  const T = L[L.length - 1]!;
  if (T < 1e-9) return [P[0]!];
  const n = Math.max(geschlossen ? 3 : 1, Math.round(T / Math.max(h, 1e-9)));
  const aus: V2[] = [];
  let j = 0;
  const bis = geschlossen ? n - 1 : n;
  for (let k = 0; k <= bis; k++) {
    const s = (k * T) / n;
    while (j < L.length - 2 && L[j + 1]! < s) j++;
    const seg = L[j + 1]! - L[j]!;
    const t = seg > 1e-12 ? (s - L[j]!) / seg : 0;
    const a = pts[j]!;
    const b = pts[j + 1]!;
    aus.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }
  return aus;
}

/** Richtung (Einheitsvektor) der Ausgleichsgeraden durch Q[von..bis], ausgerichtet von Q[von] nach Q[bis] */
function richtungAus(Q: readonly V2[], von: number, bis: number): V2 {
  const a = Math.max(0, Math.min(von, bis));
  const b = Math.min(Q.length - 1, Math.max(von, bis));
  let mx = 0;
  let my = 0;
  for (let i = a; i <= b; i++) {
    mx += Q[i]!.x;
    my += Q[i]!.y;
  }
  const n = b - a + 1;
  mx /= n;
  my /= n;
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (let i = a; i <= b; i++) {
    const dx = Q[i]!.x - mx;
    const dy = Q[i]!.y - my;
    sxx += dx * dx;
    sxy += dx * dy;
    syy += dy * dy;
  }
  const w = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  let d = { x: Math.cos(w), y: Math.sin(w) };
  const r = { x: Q[bis]!.x - Q[von]!.x, y: Q[bis]!.y - Q[von]!.y };
  if (d.x * r.x + d.y * r.y < 0) d = { x: -d.x, y: -d.y };
  if (Math.hypot(r.x, r.y) < 1e-12) {
    const l = Math.hypot(Q[b]!.x - Q[a]!.x, Q[b]!.y - Q[a]!.y);
    return l > 1e-12 ? { x: (Q[b]!.x - Q[a]!.x) / l, y: (Q[b]!.y - Q[a]!.y) / l } : { x: 1, y: 0 };
  }
  return d;
}

/** Winkel zwischen u und v in Grad (0–180) */
function winkel(u: V2, v: V2): number {
  const lu = Math.hypot(u.x, u.y);
  const lv = Math.hypot(v.x, v.y);
  if (lu < 1e-12 || lv < 1e-12) return 0;
  return Math.acos(Math.max(-1, Math.min(1, (u.x * v.x + u.y * v.y) / (lu * lv)))) / GRAD;
}

/** Ecken der Spur (Nummern der Proben) */
function eckenFinden(Q: readonly V2[], geschlossen: boolean, k: number, minGrad: number, abstand: number): number[] {
  const n = Q.length;
  if (n < 2 * k + 3) return [];
  const at = (i: number): V2 => Q[((i % n) + n) % n]!;
  const drehung = (i: number, m: number): number => {
    const a = at(i - m);
    const p = at(i);
    const b = at(i + m);
    return winkel({ x: p.x - a.x, y: p.y - a.y }, { x: b.x - p.x, y: b.y - p.y });
  };
  const w = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    if (!geschlossen && (i < 2 * k || i > n - 1 - 2 * k)) continue;
    const w1 = drehung(i, k);
    if (w1 < minGrad) continue;
    // gebündelt: über das doppelte Fenster kaum mehr Drehung (eine enge Rundung dreht dort doppelt so viel)
    const w2 = drehung(i, 2 * k);
    if (w1 < 0.75 * w2) continue;
    w[i] = w1;
  }
  const kandidaten: number[] = [];
  for (let i = 0; i < n; i++) {
    if (w[i]! <= 0) continue;
    let max = true;
    for (let d = -2 * k; d <= 2 * k && max; d++) {
      if (d === 0) continue;
      const j = i + d;
      if (!geschlossen && (j < 0 || j >= n)) continue;
      const v = w[((j % n) + n) % n]!;
      if (v > w[i]! || (v === w[i]! && d < 0)) max = false;
    }
    if (max) kandidaten.push(i);
  }
  // Abstand: die stärkeren zuerst
  kandidaten.sort((a, b) => w[b]! - w[a]!);
  const gewaehlt: number[] = [];
  const naeher = (a: number, b: number): number => {
    const d = Math.abs(a - b);
    return geschlossen ? Math.min(d, n - d) : d;
  };
  for (const i of kandidaten) {
    if (!geschlossen && (i < abstand || i > n - 1 - abstand)) continue;
    if (gewaehlt.every((j) => naeher(i, j) >= abstand)) gewaehlt.push(i);
  }
  return gewaehlt.sort((a, b) => a - b);
}

/** Ergebnis einer Anpassung eines Stücks */
type StueckFit = { s: Stueck; fehler: number; ok: boolean };

/**
 * Ein kubisches Stück durch Q[i..j] mit festen Richtungen t1 (am Anfang, in Laufrichtung) und t2 (am Ende, vom Ende zurück in die
 * Kurve): Grifflängen nach kleinsten Quadraten, Parameter nach Newton nachgeführt (Schneider). `abbruch`: über diesem Fehler wird
 * nicht weiter gerechnet.
 */
function stueckAnpassen(Q: readonly V2[], i: number, j: number, t1: V2, t2: V2, armMax: number, abbruch: number): StueckFit {
  const P0 = Q[i]!;
  const P3 = Q[j]!;
  const m = j - i;
  const sehne = dist(P0, P3);
  const u = new Float64Array(m + 1);
  for (let k = 1; k <= m; k++) u[k] = u[k - 1]! + dist(Q[i + k - 1]!, Q[i + k]!);
  const ges = u[m]!;
  if (ges < 1e-12) return { s: [P0, P0, P3, P3], fehler: 0, ok: false };
  for (let k = 0; k <= m; k++) u[k] = u[k]! / ges;
  let a1 = sehne / 3;
  let a2 = sehne / 3;
  let s: Stueck = [P0, P0, P3, P3];
  let fehler = Infinity;
  for (let runde = 0; runde < 3; runde++) {
    // kleinste Quadrate für a1, a2
    let c00 = 0;
    let c01 = 0;
    let c11 = 0;
    let x0 = 0;
    let x1 = 0;
    for (let k = 0; k <= m; k++) {
      const t = u[k]!;
      const v = 1 - t;
      const b0 = v * v * v;
      const b1 = 3 * v * v * t;
      const b2 = 3 * v * t * t;
      const b3 = t * t * t;
      const A1 = { x: t1.x * b1, y: t1.y * b1 };
      const A2 = { x: t2.x * b2, y: t2.y * b2 };
      c00 += A1.x * A1.x + A1.y * A1.y;
      c01 += A1.x * A2.x + A1.y * A2.y;
      c11 += A2.x * A2.x + A2.y * A2.y;
      const q = Q[i + k]!;
      const rx = q.x - (P0.x * (b0 + b1) + P3.x * (b2 + b3));
      const ry = q.y - (P0.y * (b0 + b1) + P3.y * (b2 + b3));
      x0 += A1.x * rx + A1.y * ry;
      x1 += A2.x * rx + A2.y * ry;
    }
    const det = c00 * c11 - c01 * c01;
    if (Math.abs(det) > 1e-12) {
      a1 = (x0 * c11 - x1 * c01) / det;
      a2 = (c00 * x1 - c01 * x0) / det;
    }
    if (!(a1 > 1e-6 * sehne) || !(a2 > 1e-6 * sehne)) {
      a1 = sehne / 3;
      a2 = sehne / 3;
    }
    s = [P0, { x: P0.x + t1.x * a1, y: P0.y + t1.y * a1 }, { x: P3.x + t2.x * a2, y: P3.y + t2.y * a2 }, P3];
    // Fehler und Newton für die Parameter
    fehler = 0;
    for (let k = 1; k < m; k++) {
      const q = Q[i + k]!;
      let t = u[k]!;
      const b = bez(s, t);
      const d1 = bez1(s, t);
      const d2 = bez2(s, t);
      const rx = b.x - q.x;
      const ry = b.y - q.y;
      const f = rx * d1.x + ry * d1.y;
      const df = d1.x * d1.x + d1.y * d1.y + rx * d2.x + ry * d2.y;
      if (Math.abs(df) > 1e-12) t = Math.min(1, Math.max(0, t - f / df));
      u[k] = t;
      const b2 = bez(s, t);
      const e = Math.hypot(b2.x - q.x, b2.y - q.y);
      if (e > fehler) fehler = e;
    }
    if (fehler > abbruch * 4) break;
  }
  // Parameter müssen der Reihe nach laufen (sonst schlägt das Stück eine Schleife)
  let geordnet = true;
  for (let k = 1; k <= m && geordnet; k++) if (u[k]! < u[k - 1]! - 1e-9) geordnet = false;
  const ok = geordnet && a1 <= armMax * sehne + 1e-9 && a2 <= armMax * sehne + 1e-9;
  return { s, fehler, ok };
}

function bez(s: Stueck, t: number): V2 {
  const v = 1 - t;
  const a = v * v * v;
  const b = 3 * v * v * t;
  const c = 3 * v * t * t;
  const d = t * t * t;
  return { x: a * s[0].x + b * s[1].x + c * s[2].x + d * s[3].x, y: a * s[0].y + b * s[1].y + c * s[2].y + d * s[3].y };
}
function bez1(s: Stueck, t: number): V2 {
  const v = 1 - t;
  return {
    x: 3 * v * v * (s[1].x - s[0].x) + 6 * v * t * (s[2].x - s[1].x) + 3 * t * t * (s[3].x - s[2].x),
    y: 3 * v * v * (s[1].y - s[0].y) + 6 * v * t * (s[2].y - s[1].y) + 3 * t * t * (s[3].y - s[2].y),
  };
}
function bez2(s: Stueck, t: number): V2 {
  const v = 1 - t;
  return {
    x: 6 * v * (s[2].x - 2 * s[1].x + s[0].x) + 6 * t * (s[3].x - 2 * s[2].x + s[1].x),
    y: 6 * v * (s[2].y - 2 * s[1].y + s[0].y) + 6 * t * (s[3].y - 2 * s[2].y + s[1].y),
  };
}

/** Liegen alle Proben Q[i..j] höchstens tol neben ihrer Sehne? */
function gerade(Q: readonly V2[], i: number, j: number, tol: number): boolean {
  const a = Q[i]!;
  const b = Q[j]!;
  const l = dist(a, b);
  if (l < 1e-12) return false;
  const nx = -(b.y - a.y) / l;
  const ny = (b.x - a.x) / l;
  for (let k = i + 1; k < j; k++) if (Math.abs((Q[k]!.x - a.x) * nx + (Q[k]!.y - a.y) * ny) > tol) return false;
  return true;
}

type Lauf = {
  /** Proben des Laufs (geschlossener Lauf: erster = letzter Punkt) */
  Q: V2[];
  /** Richtung am Anfang (in Laufrichtung) und am Ende (vom Ende zurück); fehlt: aus der Spur geschätzt */
  t0?: V2;
  t1?: V2;
};

type LaufErgebnis = { stuecke: Stueck[]; anzahl: number; kosten: number };

/** Dynamische Programmierung über die Kandidaten eines Laufs */
function laufAnpassen(lauf: Lauf, o: Required<Omit<AnpassOptionen, 'geschlossen' | 'schritt'>>, schritt: number): LaufErgebnis {
  const Q = lauf.Q;
  const n = Q.length;
  if (n < 2) return { stuecke: [], anzahl: 0, kosten: 0 };
  const endFenster = 5;
  const glattFenster = 3;
  const t0 = lauf.t0 ?? richtungAus(Q, 0, Math.min(n - 1, endFenster));
  const tE = lauf.t1 ?? richtungAus(Q, n - 1, Math.max(0, n - 1 - endFenster));
  // ganz gerade? (Seite eines Rechtecks aus der Hand)
  if (n <= 3 || gerade(Q, 0, n - 1, Math.max(0.25 * o.treue, 0.5 * schritt))) {
    const a = Q[0]!;
    const b = Q[n - 1]!;
    const s: Stueck = [a, { x: a.x + (b.x - a.x) / 3, y: a.y + (b.y - a.y) / 3 }, { x: b.x - (b.x - a.x) / 3, y: b.y - (b.y - a.y) / 3 }, b];
    return { stuecke: [s], anzahl: 1, kosten: 0 };
  }
  // Kandidaten
  const abstand = Math.max(4, Math.ceil((n - 1) / o.kandidatenMax));
  const C: number[] = [];
  for (let i = 0; i < n - 1; i += abstand) C.push(i);
  if (n - 1 - C[C.length - 1]! < abstand / 2 && C.length > 1) C.pop();
  C.push(n - 1);
  const K = C.length;
  // Richtung je Kandidat (glatt: zentral), Winkel längs der Spur (für die Streuung, über ±2 Proben)
  const tang: V2[] = C.map((c, k) => (k === 0 ? t0 : k === K - 1 ? { x: -tE.x, y: -tE.y } : richtungAus(Q, Math.max(0, c - glattFenster), Math.min(n - 1, c + glattFenster))));
  const ang = new Float64Array(n);
  {
    let vor = 0;
    for (let i = 0; i < n; i++) {
      const a = Q[Math.max(0, i - 2)]!;
      const b = Q[Math.min(n - 1, i + 2)]!;
      let w = Math.atan2(b.y - a.y, b.x - a.x);
      if (i > 0) {
        while (w - vor > Math.PI) w -= 2 * Math.PI;
        while (w - vor < -Math.PI) w += 2 * Math.PI;
      }
      ang[i] = w;
      vor = w;
    }
  }
  const achsStrafe = (t: V2): number => 0.3 * o.treue * o.treue * (1 - Math.abs(Math.cos(2 * Math.atan2(t.y, t.x))));
  const anzahl = new Float64Array(K).fill(Infinity);
  const kosten = new Float64Array(K).fill(Infinity);
  const vor = new Int32Array(K).fill(-1);
  const stueck: (Stueck | null)[] = new Array(K).fill(null);
  anzahl[0] = 0;
  kosten[0] = 0;
  const drehMax = o.drehungMax * GRAD;
  for (let k = 1; k < K; k++) {
    let wMin = Infinity;
    let wMax = -Infinity;
    let fehlschlag = 0;
    for (let i = k - 1; i >= 0; i--) {
      for (let q = C[i]!; q < C[i + 1]!; q++) {
        wMin = Math.min(wMin, ang[q]!);
        wMax = Math.max(wMax, ang[q]!);
      }
      wMin = Math.min(wMin, ang[C[k]!]!);
      wMax = Math.max(wMax, ang[C[k]!]!);
      if (wMax - wMin > drehMax && i < k - 1) break;
      if (!Number.isFinite(anzahl[i]!)) continue;
      const t1 = tang[i]!;
      const t2 = k === K - 1 ? tE : { x: -tang[k]!.x, y: -tang[k]!.y };
      const f = stueckAnpassen(Q, C[i]!, C[k]!, t1, t2, o.armMax, o.treue);
      if (!f.ok || f.fehler > o.treue) {
        if (f.fehler > 3 * o.treue && ++fehlschlag >= 2) break;
        continue;
      }
      fehlschlag = 0;
      const nz = anzahl[i]! + 1;
      const kz = kosten[i]! + f.fehler * f.fehler + (k < K - 1 ? achsStrafe(tang[k]!) : 0);
      if (nz < anzahl[k]! || (nz === anzahl[k]! && kz < kosten[k]!)) {
        anzahl[k] = nz;
        kosten[k] = kz;
        vor[k] = i;
        stueck[k] = f.s;
      }
    }
    if (!Number.isFinite(anzahl[k]!)) {
      // nichts hielt die Schranken: das kurze Stück zum Vorgänger nehmen (Strafe), damit der Lauf zusammenhängt
      const i = k - 1;
      const t2 = k === K - 1 ? tE : { x: -tang[k]!.x, y: -tang[k]!.y };
      const f = stueckAnpassen(Q, C[i]!, C[k]!, tang[i]!, t2, Infinity, Infinity);
      anzahl[k] = anzahl[i]! + 1;
      kosten[k] = kosten[i]! + f.fehler * f.fehler + 1e9;
      vor[k] = i;
      stueck[k] = f.s;
    }
  }
  const S: Stueck[] = [];
  for (let k = K - 1; k > 0; k = vor[k]!) S.push(stueck[k]!);
  S.reverse();
  return { stuecke: S, anzahl: anzahl[K - 1]!, kosten: kosten[K - 1]! };
}

/** Größte Abweichung der Proben von der Stückfolge (je Probe die nächste Stelle, grob über alle Stücke) */
function abweichung(Q: readonly V2[], S: readonly Stueck[]): number {
  const dicht: V2[] = [];
  for (const s of S) for (let k = 0; k < 24; k++) dicht.push(bez(s, k / 24));
  if (S.length) dicht.push(S[S.length - 1]![3]);
  let max = 0;
  for (const q of Q) {
    let best = Infinity;
    for (let i = 0; i + 1 < dicht.length; i++) {
      const a = dicht[i]!;
      const b = dicht[i + 1]!;
      const abx = b.x - a.x;
      const aby = b.y - a.y;
      const l2 = abx * abx + aby * aby;
      const t = l2 > 0 ? Math.max(0, Math.min(1, ((q.x - a.x) * abx + (q.y - a.y) * aby) / l2)) : 0;
      const d = Math.hypot(a.x + abx * t - q.x, a.y + aby * t - q.y);
      if (d < best) best = d;
    }
    if (best > max) max = best;
  }
  return max;
}

/** Stücke zu Ankern: glatte Stöße glatt, Ecken als Ecken */
function zuAnkern(S: readonly Stueck[], geschlossen: boolean, eckeAm: (i: number) => boolean): Anker[] {
  const A: Anker[] = [];
  S.forEach((s, i) => {
    const vorher = A[A.length - 1];
    if (i === 0 || !vorher) {
      A.push({ x: s[0].x, y: s[0].y, ein: null, aus: { x: s[1].x - s[0].x, y: s[1].y - s[0].y }, ecke: eckeAm(0) });
    } else {
      vorher.aus = { x: s[1].x - s[0].x, y: s[1].y - s[0].y };
    }
    const ende: Anker = { x: s[3].x, y: s[3].y, ein: { x: s[2].x - s[3].x, y: s[2].y - s[3].y }, aus: null, ecke: eckeAm(i + 1) };
    A.push(ende);
  });
  if (geschlossen && A.length > 1) {
    // der letzte Anker ist der erste
    const l = A.pop()!;
    A[0]!.ein = l.ein;
  }
  return A;
}

/** Glatte Anker probeweise entfernen, solange das zusammengelegte Stück die Schranken hält */
function ausduennen(Q: readonly V2[], idx: number[], S: Stueck[], ecke: boolean[], o: Required<Omit<AnpassOptionen, 'geschlossen' | 'schritt'>>): void {
  let weiter = true;
  while (weiter && S.length > 1) {
    weiter = false;
    for (let a = 1; a < S.length; a++) {
      if (ecke[a]) continue;
      const i = idx[a - 1]!;
      const j = idx[a + 1]!;
      const s1 = S[a - 1]!;
      const s2 = S[a]!;
      const l1 = Math.hypot(s1[1].x - s1[0].x, s1[1].y - s1[0].y);
      const l2 = Math.hypot(s2[2].x - s2[3].x, s2[2].y - s2[3].y);
      if (l1 < 1e-12 || l2 < 1e-12) continue;
      const t1 = { x: (s1[1].x - s1[0].x) / l1, y: (s1[1].y - s1[0].y) / l1 };
      const t2 = { x: (s2[2].x - s2[3].x) / l2, y: (s2[2].y - s2[3].y) / l2 };
      let wMin = Infinity;
      let wMax = -Infinity;
      let vorW = 0;
      for (let q = i; q < j; q++) {
        let w = Math.atan2(Q[q + 1]!.y - Q[q]!.y, Q[q + 1]!.x - Q[q]!.x);
        if (q > i) {
          while (w - vorW > Math.PI) w -= 2 * Math.PI;
          while (w - vorW < -Math.PI) w += 2 * Math.PI;
        }
        vorW = w;
        wMin = Math.min(wMin, w);
        wMax = Math.max(wMax, w);
      }
      if (wMax - wMin > o.drehungMax * GRAD * 1.15) continue;
      const f = stueckAnpassen(Q, i, j, t1, t2, o.armMax, o.treue);
      if (!f.ok || f.fehler > o.treue) continue;
      S.splice(a - 1, 2, f.s);
      idx.splice(a, 1);
      ecke.splice(a, 1);
      weiter = true;
      break;
    }
  }
}

/**
 * Eine Spur (Punkte des Pinsels) als Bézier-Pfad mit möglichst wenigen Ankern. Geschlossen: Die Spur endet nahe ihrem Anfang (das
 * entscheidet der Aufrufer); das Schlussstück gehört dann zur Form.
 */
export function anpassen(spur: readonly V2[], opt: AnpassOptionen): Anpassung {
  const t0 = jetzt();
  const o = {
    treue: opt.treue,
    eckFenster: opt.eckFenster ?? 4,
    eckWinkel: opt.eckWinkel ?? 40,
    eckAbstand: opt.eckAbstand ?? 12,
    armMax: opt.armMax ?? 0.65,
    drehungMax: opt.drehungMax ?? 100,
    kandidatenMax: opt.kandidatenMax ?? 120,
  };
  const Q = gleichabstaendig(spur, opt.schritt, opt.geschlossen);
  const n = Q.length;
  const leer = (pfad: Pfad): Anpassung => ({ pfad, fehler: 0, proben: n, ecken: 0, ms: jetzt() - t0 });
  if (n < 2) return leer({ anker: Q.map((q) => ({ x: q.x, y: q.y, ein: null, aus: null, ecke: true })), geschlossen: false });
  if (n < 4) {
    const a = Q[0]!;
    const b = Q[n - 1]!;
    return leer({
      anker: [
        { x: a.x, y: a.y, ein: null, aus: null, ecke: true },
        { x: b.x, y: b.y, ein: null, aus: null, ecke: true },
      ],
      geschlossen: false,
    });
  }
  const ecken = eckenFinden(Q, opt.geschlossen, o.eckFenster, o.eckWinkel, o.eckAbstand);

  let S: Stueck[] = [];
  let idx: number[] = [];
  let eck: boolean[] = [];
  let Qlauf: V2[] = Q;

  if (opt.geschlossen && ecken.length === 0) {
    // ohne Ecke: Naht an einem der vier Extrempunkte (waagerechte bzw. senkrechte Tangente), die beste Lösung gilt
    const extreme = new Set<number>();
    let ix0 = 0;
    let ix1 = 0;
    let iy0 = 0;
    let iy1 = 0;
    Q.forEach((q, i) => {
      if (q.x < Q[ix0]!.x) ix0 = i;
      if (q.x > Q[ix1]!.x) ix1 = i;
      if (q.y < Q[iy0]!.y) iy0 = i;
      if (q.y > Q[iy1]!.y) iy1 = i;
    });
    for (const i of [ix0, ix1, iy0, iy1]) extreme.add(i);
    let best: { e: LaufErgebnis; Ql: V2[]; s: number } | null = null;
    for (const s of extreme) {
      const Ql = [...Q.slice(s), ...Q.slice(0, s), Q[s]!];
      // Richtung an der Naht: zentral über die Naht hinweg
      const vor = Ql[Ql.length - 1 - 3]!;
      const nach = Ql[3]!;
      let tn = { x: nach.x - vor.x, y: nach.y - vor.y };
      const l = Math.hypot(tn.x, tn.y);
      tn = l > 1e-12 ? { x: tn.x / l, y: tn.y / l } : { x: 1, y: 0 };
      const e = laufAnpassen({ Q: Ql, t0: tn, t1: { x: -tn.x, y: -tn.y } }, o, opt.schritt);
      if (!best || e.anzahl < best.e.anzahl || (e.anzahl === best.e.anzahl && e.kosten < best.e.kosten)) best = { e, Ql, s };
    }
    S = best!.e.stuecke;
    Qlauf = best!.Ql;
    eck = new Array(S.length + 1).fill(false);
  } else {
    // Läufe zwischen Ecken (geschlossen: ab der ersten Ecke rundum)
    let Qr: V2[];
    let schnitte: number[];
    if (opt.geschlossen) {
      const s = ecken[0]!;
      Qr = [...Q.slice(s), ...Q.slice(0, s), Q[s]!];
      schnitte = [...ecken.map((e) => (e - s + n) % n), n];
    } else {
      Qr = Q;
      schnitte = [0, ...ecken, n - 1];
    }
    Qlauf = Qr;
    eck = [];
    for (let r = 0; r + 1 < schnitte.length; r++) {
      const a = schnitte[r]!;
      const b = schnitte[r + 1]!;
      const e = laufAnpassen({ Q: Qr.slice(a, b + 1) }, o, opt.schritt);
      e.stuecke.forEach((st, k) => {
        S.push(st);
        eck.push(k === 0 && (opt.geschlossen || r > 0));
      });
    }
    eck.push(opt.geschlossen);
  }

  // Probennummern der Anker in Qlauf (für das Ausdünnen)
  idx = [0];
  {
    let q = 0;
    for (const st of S) {
      while (q < Qlauf.length - 1 && dist(Qlauf[q]!, st[3]) > 1e-9) q++;
      idx.push(q);
    }
  }
  ausduennen(Qlauf, idx, S, eck, o);

  const anker = zuAnkern(S, opt.geschlossen, (i) => eck[i] ?? false);
  const fehler = abweichung(Q, S);
  return { pfad: { anker, geschlossen: opt.geschlossen }, fehler, proben: n, ecken: ecken.length, ms: jetzt() - t0 };
}
