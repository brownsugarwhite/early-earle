 
// Gegenprüfung „Netz und Verdichten“: gemeinsame Maße (Wertigkeit, Winkel, Kantenverhältnis, Abstand Fläche–Fläche).
import type { Haut } from '../../../../../../packages/shape/src/dicht/kurven';

export const quantil = (w: number[], q: number): number => {
  if (w.length === 0) return NaN;
  const s = [...w].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.floor(q * (s.length - 1))))]!;
};

export type Guete = {
  n: number;
  t: number;
  kanteMittel: number;
  kanteMin: number;
  kanteMax: number;
  kanteCV: number;
  valenz: Record<string, number>;
  valenz6: number;
  valenzAbw: number;
  winkelMin: number;
  winkelP01: number;
  winkelP05: number;
  winkelMedian: number;
  unter20: number;
  unter10: number;
  stumpf: number;
  verhMedian: number;
  verhP95: number;
  verhMax: number;
  ueber2: number;
  ueber4: number;
  /** je Punkt: längste / kürzeste Kante am Punkt (Median, 95 %, größte) */
  ringMedian: number;
  ringP95: number;
  ringMax: number;
  /** |Tangentialanteil des gleich gewichteten Laplace| / mittlere Kante am Punkt (Median, 95 %) */
  tangMedian: number;
  tangP95: number;
  /** Anteil Kanten mit negativem Kotangens-Gewicht */
  cotNeg: number;
};

export function guete(h: Haut, nur?: (v: number) => boolean): Guete {
  const P = h.pos;
  const T = h.tri;
  const L = (a: number, b: number) => Math.hypot(P[3 * a]! - P[3 * b]!, P[3 * a + 1]! - P[3 * b + 1]!, P[3 * a + 2]! - P[3 * b + 2]!);
  const kanten: number[] = [];
  const valenz: Record<string, number> = {};
  let v6 = 0;
  let abw = 0;
  let nP = 0;
  const ring: number[] = [];
  const tang: number[] = [];
  // Normalen nach Fläche
  const nor = new Float64Array(3 * h.n);
  for (let t = 0; t < T.length; t += 3) {
    const a = T[t]!;
    const b = T[t + 1]!;
    const c = T[t + 2]!;
    const ab = [P[3 * b]! - P[3 * a]!, P[3 * b + 1]! - P[3 * a + 1]!, P[3 * b + 2]! - P[3 * a + 2]!];
    const ac = [P[3 * c]! - P[3 * a]!, P[3 * c + 1]! - P[3 * a + 1]!, P[3 * c + 2]! - P[3 * a + 2]!];
    const f = [ab[1]! * ac[2]! - ab[2]! * ac[1]!, ab[2]! * ac[0]! - ab[0]! * ac[2]!, ab[0]! * ac[1]! - ab[1]! * ac[0]!];
    for (const v of [a, b, c]) for (let k = 0; k < 3; k++) nor[3 * v + k] = nor[3 * v + k]! + f[k]!;
  }
  for (let v = 0; v < h.n; v++) {
    const l = Math.hypot(nor[3 * v]!, nor[3 * v + 1]!, nor[3 * v + 2]!) || 1;
    for (let k = 0; k < 3; k++) nor[3 * v + k] = nor[3 * v + k]! / l;
  }
  for (let v = 0; v < h.n; v++) {
    if (nur && !nur(v)) continue;
    const nb = h.nachbarn[v]!;
    if (nb.length === 0) continue;
    nP++;
    const key = nb.length <= 3 ? '≤3' : nb.length >= 9 ? '≥9' : String(nb.length);
    valenz[key] = (valenz[key] ?? 0) + 1;
    if (nb.length === 6) v6++;
    abw += Math.abs(nb.length - 6);
    let mn = Infinity;
    let mx = 0;
    let s = [0, 0, 0];
    let sl = 0;
    for (const w of nb) {
      const l = L(v, w);
      mn = Math.min(mn, l);
      mx = Math.max(mx, l);
      sl += l;
      s = [s[0]! + P[3 * w]!, s[1]! + P[3 * w + 1]!, s[2]! + P[3 * w + 2]!];
      if (w > v) kanten.push(l);
    }
    ring.push(mx / Math.max(mn, 1e-12));
    const lap = [P[3 * v]! - s[0]! / nb.length, P[3 * v + 1]! - s[1]! / nb.length, P[3 * v + 2]! - s[2]! / nb.length];
    const k = lap[0]! * nor[3 * v]! + lap[1]! * nor[3 * v + 1]! + lap[2]! * nor[3 * v + 2]!;
    const tg = Math.hypot(lap[0]! - k * nor[3 * v]!, lap[1]! - k * nor[3 * v + 1]!, lap[2]! - k * nor[3 * v + 2]!);
    tang.push(tg / (sl / nb.length));
  }
  const winkel: number[] = [];
  const verh: number[] = [];
  let stumpf = 0;
  let nT = 0;
  const cot = new Map<number, number>();
  for (let t = 0; t < T.length; t += 3) {
    const e = [T[t]!, T[t + 1]!, T[t + 2]!];
    if (nur && !e.some((v) => nur(v))) continue;
    nT++;
    const l = [L(e[1]!, e[2]!), L(e[2]!, e[0]!), L(e[0]!, e[1]!)];
    verh.push(Math.max(...l) / Math.max(1e-12, Math.min(...l)));
    let wmin = 180;
    let wmax = 0;
    for (let k = 0; k < 3; k++) {
      const a = l[k]!;
      const b = l[(k + 1) % 3]!;
      const c = l[(k + 2) % 3]!;
      const cs = Math.max(-1, Math.min(1, (b * b + c * c - a * a) / Math.max(1e-30, 2 * b * c)));
      const w = (Math.acos(cs) * 180) / Math.PI;
      wmin = Math.min(wmin, w);
      wmax = Math.max(wmax, w);
      // Kotangens des Winkels an Ecke k gegenüber der Kante (k+1, k+2)
      const sn = Math.sqrt(Math.max(1e-30, 1 - cs * cs));
      const key = Math.min(e[(k + 1) % 3]!, e[(k + 2) % 3]!) * 4194304 + Math.max(e[(k + 1) % 3]!, e[(k + 2) % 3]!);
      cot.set(key, (cot.get(key) ?? 0) + (0.5 * cs) / sn);
    }
    winkel.push(wmin);
    if (wmax > 90) stumpf++;
  }
  let neg = 0;
  for (const x of cot.values()) if (x < 0) neg++;
  const km = kanten.reduce((s, x) => s + x, 0) / Math.max(1, kanten.length);
  const kv = Math.sqrt(kanten.reduce((s, x) => s + (x - km) ** 2, 0) / Math.max(1, kanten.length));
  return {
    n: nP,
    t: nT,
    kanteMittel: km,
    kanteMin: Math.min(...kanten),
    kanteMax: Math.max(...kanten),
    kanteCV: kv / km,
    valenz,
    valenz6: v6 / Math.max(1, nP),
    valenzAbw: abw / Math.max(1, nP),
    winkelMin: Math.min(...winkel),
    winkelP01: quantil(winkel, 0.01),
    winkelP05: quantil(winkel, 0.05),
    winkelMedian: quantil(winkel, 0.5),
    unter20: winkel.filter((w) => w < 20).length / Math.max(1, nT),
    unter10: winkel.filter((w) => w < 10).length / Math.max(1, nT),
    stumpf: stumpf / Math.max(1, nT),
    verhMedian: quantil(verh, 0.5),
    verhP95: quantil(verh, 0.95),
    verhMax: Math.max(...verh),
    ueber2: verh.filter((x) => x > 2).length / Math.max(1, nT),
    ueber4: verh.filter((x) => x > 4).length / Math.max(1, nT),
    ringMedian: quantil(ring, 0.5),
    ringP95: quantil(ring, 0.95),
    ringMax: Math.max(...ring),
    tangMedian: quantil(tang, 0.5),
    tangP95: quantil(tang, 0.95),
    cotNeg: neg / Math.max(1, cot.size),
  };
}

const f = (x: number, d = 2) => x.toFixed(d);
const pz = (x: number) => `${(100 * x).toFixed(1)} %`;
export function gueteZeile(name: string, g: Guete): string {
  const val = ['≤3', '4', '5', '6', '7', '8', '≥9'].map((k) => `${k}:${pz((g.valenz[k] ?? 0) / g.n)}`).join(' ');
  return (
    `${name}: ${g.n} Punkte, ${g.t} Dreiecke\n` +
    `    Kanten: Mittel ${f(g.kanteMittel)}, kürzeste ${f(g.kanteMin)}, längste ${f(g.kanteMax)}, Streuung (σ/Mittel) ${f(g.kanteCV)}\n` +
    `    Wertigkeit: ${val}; mittlere Abweichung von 6: ${f(g.valenzAbw)}\n` +
    `    kleinster Winkel je Dreieck: kleinster ${f(g.winkelMin, 1)}°, 1 % ${f(g.winkelP01, 1)}°, 5 % ${f(g.winkelP05, 1)}°, Median ${f(g.winkelMedian, 1)}°; ` +
    `unter 20°: ${pz(g.unter20)}, unter 10°: ${pz(g.unter10)}; stumpf (> 90°): ${pz(g.stumpf)}\n` +
    `    längste/kürzeste Kante je Dreieck: Median ${f(g.verhMedian)}, 95 % ${f(g.verhP95)}, größte ${f(g.verhMax)}; über 2: ${pz(g.ueber2)}, über 4: ${pz(g.ueber4)}\n` +
    `    längste/kürzeste Kante je Punkt: Median ${f(g.ringMedian)}, 95 % ${f(g.ringP95)}, größte ${f(g.ringMax)}\n` +
    `    Tangentialanteil des gleichen Laplace / mittlere Kante: Median ${f(g.tangMedian, 3)}, 95 % ${f(g.tangP95, 3)}; Kotangens-Gewicht negativ: ${pz(g.cotNeg)}`
  );
}

// ---------- Abstand Punkt → Fläche (wie form-netzunabhaengig.ts) ----------
function punktDreieckQ(p: number[], a: number[], b: number[], c: number[]): number[] {
  const sub = (u: number[], v: number[]) => [u[0]! - v[0]!, u[1]! - v[1]!, u[2]! - v[2]!];
  const dot = (u: number[], v: number[]) => u[0]! * v[0]! + u[1]! * v[1]! + u[2]! * v[2]!;
  const ab = sub(b, a);
  const ac = sub(c, a);
  const ap = sub(p, a);
  const d1 = dot(ab, ap);
  const d2 = dot(ac, ap);
  let q: number[];
  if (d1 <= 0 && d2 <= 0) q = a;
  else {
    const bp = sub(p, b);
    const d3 = dot(ab, bp);
    const d4 = dot(ac, bp);
    if (d3 >= 0 && d4 <= d3) q = b;
    else {
      const vc = d1 * d4 - d3 * d2;
      if (vc <= 0 && d1 >= 0 && d3 <= 0) {
        const v = d1 / (d1 - d3);
        q = [a[0]! + v * ab[0]!, a[1]! + v * ab[1]!, a[2]! + v * ab[2]!];
      } else {
        const cp = sub(p, c);
        const d5 = dot(ab, cp);
        const d6 = dot(ac, cp);
        if (d6 >= 0 && d5 <= d6) q = c;
        else {
          const vb = d5 * d2 - d1 * d6;
          if (vb <= 0 && d2 >= 0 && d6 <= 0) {
            const w = d2 / (d2 - d6);
            q = [a[0]! + w * ac[0]!, a[1]! + w * ac[1]!, a[2]! + w * ac[2]!];
          } else {
            const va = d3 * d6 - d5 * d4;
            if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
              const w = (d4 - d3) / (d4 - d3 + (d5 - d6));
              q = [b[0]! + w * (c[0]! - b[0]!), b[1]! + w * (c[1]! - b[1]!), b[2]! + w * (c[2]! - b[2]!)];
            } else {
              const den = 1 / (va + vb + vc);
              const v = vb * den;
              const w = vc * den;
              q = [a[0]! + ab[0]! * v + ac[0]! * w, a[1]! + ab[1]! * v + ac[1]! * w, a[2]! + ab[2]! * v + ac[2]! * w];
            }
          }
        }
      }
    }
  }
  return q;
}
function punktDreieck(p: number[], a: number[], b: number[], c: number[]): number {
  const q = punktDreieckQ(p, a, b, c);
  return Math.hypot(p[0]! - q[0]!, p[1]! - q[1]!, p[2]! - q[2]!);
}
export type Schnapp = { P: Float64Array; T: Uint32Array };
export const schnapp = (h: Haut): Schnapp => ({ P: Float64Array.from(h.pos), T: Uint32Array.from(h.tri) });
export function flaeche(S: Schnapp): (p: number[]) => number {
  const { P, T } = S;
  let kante = 0;
  for (let i = 0; i < T.length; i += 3) kante += Math.hypot(P[3 * T[i]!]! - P[3 * T[i + 1]!]!, P[3 * T[i]! + 1]! - P[3 * T[i + 1]! + 1]!, P[3 * T[i]! + 2]! - P[3 * T[i + 1]! + 2]!);
  const h = (2 * kante) / (T.length / 3);
  const zellen = new Map<string, number[]>();
  const key = (i: number, j: number, k: number) => `${i},${j},${k}`;
  for (let t = 0; t < T.length / 3; t++) {
    const v = [T[3 * t]!, T[3 * t + 1]!, T[3 * t + 2]!];
    const lo = [0, 1, 2].map((c) => Math.floor(Math.min(...v.map((w) => P[3 * w + c]!)) / h));
    const hi = [0, 1, 2].map((c) => Math.floor(Math.max(...v.map((w) => P[3 * w + c]!)) / h));
    for (let i = lo[0]!; i <= hi[0]!; i++)
      for (let j = lo[1]!; j <= hi[1]!; j++)
        for (let k = lo[2]!; k <= hi[2]!; k++) {
          const s = key(i, j, k);
          const l = zellen.get(s);
          if (l) l.push(t);
          else zellen.set(s, [t]);
        }
  }
  const ecke = (w: number) => [P[3 * w]!, P[3 * w + 1]!, P[3 * w + 2]!];
  return (p) => {
    const c = [0, 1, 2].map((k) => Math.floor(p[k]! / h));
    let best = Infinity;
    for (let r = 1; r <= 12; r++) {
      const gesehen = new Set<number>();
      for (let i = c[0]! - r; i <= c[0]! + r; i++)
        for (let j = c[1]! - r; j <= c[1]! + r; j++)
          for (let k = c[2]! - r; k <= c[2]! + r; k++) {
            const l = zellen.get(key(i, j, k));
            if (!l) continue;
            for (const t of l) {
              if (gesehen.has(t)) continue;
              gesehen.add(t);
              best = Math.min(best, punktDreieck(p, ecke(T[3 * t]!), ecke(T[3 * t + 1]!), ecke(T[3 * t + 2]!)));
            }
          }
      if (best <= (r - 0.5) * h) return best;
    }
    return best;
  };
}
/** wie weit sich die Fläche von A nach B bewegt hat (in beide Richtungen, das Größere) */
export function bewegung(A: Schnapp, B: Schnapp): { max: number; p99: number; mittel: number; wo: number[]; ueber1: number } {
  const w: number[] = [];
  let max = 0;
  let wo: number[] = [];
  for (const [X, Y] of [
    [A, B],
    [B, A],
  ] as const) {
    const d = flaeche(X);
    for (let v = 0; v < Y.P.length / 3; v++) {
      const p = [Y.P[3 * v]!, Y.P[3 * v + 1]!, Y.P[3 * v + 2]!];
      const x = d(p);
      w.push(x);
      if (x > max) {
        max = x;
        wo = p;
      }
    }
  }
  w.sort((a, b) => a - b);
  return { max, p99: w[Math.floor(0.99 * (w.length - 1))]!, mittel: w.reduce((s, x) => s + x, 0) / w.length, wo, ueber1: w.filter((x) => x > 1).length };
}
export const bewZeile = (name: string, X: Schnapp, Y: Schnapp): string => {
  const m = bewegung(X, Y);
  return `  ${name}: bis ${f(m.max)} (99 % ${f(m.p99)}, Mittel ${f(m.mittel, 3)}; ${m.ueber1} Punkte über 1) bei (${m.wo.map((v) => v.toFixed(0)).join(', ')})`;
};

/** Spiegelzuordnung prüfen: ohne Partner, nicht umkehrbar, Partner nicht spiegelgleich gelegen, Dreiecke ohne Spiegeldreieck */
export function spiegelCheck(h: Haut): { ohne: number; nichtUmkehrbar: number; schief: number; ohneSpiegelDreieck: number; selbstNichtMitte: number } {
  let ohne = 0;
  let nu = 0;
  let schief = 0;
  let selbst = 0;
  for (let v = 0; v < h.n; v++) {
    const w = h.spiegel[v]!;
    if (w < 0) {
      ohne++;
      continue;
    }
    if (h.spiegel[w] !== v) nu++;
    if (w === v && Math.abs(h.pos[3 * v + 2]!) > 1e-12) selbst++;
    schief = Math.max(schief, Math.hypot(h.pos[3 * v]! - h.pos[3 * w]!, h.pos[3 * v + 1]! - h.pos[3 * w + 1]!, h.pos[3 * v + 2]! + h.pos[3 * w + 2]!));
  }
  const satz = new Set<string>();
  const k = (a: number, b: number, c: number) => [a, b, c].sort((x, y) => x - y).join(',');
  for (let t = 0; t < h.tri.length; t += 3) satz.add(k(h.tri[t]!, h.tri[t + 1]!, h.tri[t + 2]!));
  let z = 0;
  for (let t = 0; t < h.tri.length; t += 3) if (!satz.has(k(h.spiegel[h.tri[t]!]!, h.spiegel[h.tri[t + 1]!]!, h.spiegel[h.tri[t + 2]!]!))) z++;
  return { ohne, nichtUmkehrbar: nu, schief, ohneSpiegelDreieck: z, selbstNichtMitte: selbst };
}

/** geschlossen (jede Kante zwei Dreiecke), entartete Dreiecke (Fläche < eps · Kante²), doppelte Punkte (Abstand < tol) */
export function topoCheck(h: Haut): { offen: number; mehr: number; entartet: number; doppelt: number; umgeklappt: number } {
  const P = h.pos;
  const T = h.tri;
  const z = new Map<number, number>();
  let entartet = 0;
  const vn = new Float64Array(P.length);
  const fn: number[][] = [];
  for (let t = 0; t < T.length; t += 3) {
    const a = T[t]!;
    const b = T[t + 1]!;
    const c = T[t + 2]!;
    for (const [u, v] of [
      [a, b],
      [b, c],
      [c, a],
    ] as const) {
      const key = Math.min(u, v) * 4194304 + Math.max(u, v);
      z.set(key, (z.get(key) ?? 0) + 1);
    }
    const ab = [P[3 * b]! - P[3 * a]!, P[3 * b + 1]! - P[3 * a + 1]!, P[3 * b + 2]! - P[3 * a + 2]!];
    const ac = [P[3 * c]! - P[3 * a]!, P[3 * c + 1]! - P[3 * a + 1]!, P[3 * c + 2]! - P[3 * a + 2]!];
    const fl = [ab[1]! * ac[2]! - ab[2]! * ac[1]!, ab[2]! * ac[0]! - ab[0]! * ac[2]!, ab[0]! * ac[1]! - ab[1]! * ac[0]!];
    fn.push(fl);
    for (const v of [a, b, c]) for (let k = 0; k < 3; k++) vn[3 * v + k] = vn[3 * v + k]! + fl[k]!;
    const A2 = Math.hypot(fl[0]!, fl[1]!, fl[2]!);
    const l2 = Math.max(ab[0]! ** 2 + ab[1]! ** 2 + ab[2]! ** 2, ac[0]! ** 2 + ac[1]! ** 2 + ac[2]! ** 2);
    if (A2 < 1e-3 * l2) entartet++;
  }
  let umgeklappt = 0;
  for (let t = 0; t < T.length; t += 3) {
    const fl = fn[t / 3]!;
    const m = [0, 1, 2].map((k) => vn[3 * T[t]! + k]! + vn[3 * T[t + 1]! + k]! + vn[3 * T[t + 2]! + k]!);
    if (fl[0]! * m[0]! + fl[1]! * m[1]! + fl[2]! * m[2]! < 0) umgeklappt++;
  }
  let offen = 0;
  let mehr = 0;
  for (const c of z.values()) {
    if (c < 2) offen++;
    if (c > 2) mehr++;
  }
  // doppelte Punkte: Raster 0,01
  const g = new Map<string, number>();
  let doppelt = 0;
  for (let v = 0; v < h.n; v++) {
    const key = `${Math.round(P[3 * v]! * 100)},${Math.round(P[3 * v + 1]! * 100)},${Math.round(P[3 * v + 2]! * 100)}`;
    if (g.has(key)) doppelt++;
    else g.set(key, v);
  }
  return { offen, mehr, entartet, doppelt, umgeklappt };
}

/** nächster Punkt auf der Fläche S (Raster wie `flaeche`) */
export function naechsterPunkt(S: Schnapp): (p: number[]) => number[] {
  const { P, T } = S;
  let kante = 0;
  for (let i = 0; i < T.length; i += 3) kante += Math.hypot(P[3 * T[i]!]! - P[3 * T[i + 1]!]!, P[3 * T[i]! + 1]! - P[3 * T[i + 1]! + 1]!, P[3 * T[i]! + 2]! - P[3 * T[i + 1]! + 2]!);
  const h = (2 * kante) / (T.length / 3);
  const zellen = new Map<string, number[]>();
  const key = (i: number, j: number, k: number) => `${i},${j},${k}`;
  for (let t = 0; t < T.length / 3; t++) {
    const v = [T[3 * t]!, T[3 * t + 1]!, T[3 * t + 2]!];
    const lo = [0, 1, 2].map((c) => Math.floor(Math.min(...v.map((w) => P[3 * w + c]!)) / h));
    const hi = [0, 1, 2].map((c) => Math.floor(Math.max(...v.map((w) => P[3 * w + c]!)) / h));
    for (let i = lo[0]!; i <= hi[0]!; i++)
      for (let j = lo[1]!; j <= hi[1]!; j++)
        for (let k = lo[2]!; k <= hi[2]!; k++) {
          const s = key(i, j, k);
          const l = zellen.get(s);
          if (l) l.push(t);
          else zellen.set(s, [t]);
        }
  }
  const ecke = (w: number) => [P[3 * w]!, P[3 * w + 1]!, P[3 * w + 2]!];
  return (p) => {
    const c = [0, 1, 2].map((k) => Math.floor(p[k]! / h));
    let best = Infinity;
    let bq = p;
    for (let r = 1; r <= 12; r++) {
      const gesehen = new Set<number>();
      for (let i = c[0]! - r; i <= c[0]! + r; i++)
        for (let j = c[1]! - r; j <= c[1]! + r; j++)
          for (let k = c[2]! - r; k <= c[2]! + r; k++) {
            const l = zellen.get(key(i, j, k));
            if (!l) continue;
            for (const t of l) {
              if (gesehen.has(t)) continue;
              gesehen.add(t);
              const q = punktDreieckQ(p, ecke(T[3 * t]!), ecke(T[3 * t + 1]!), ecke(T[3 * t + 2]!));
              const d = Math.hypot(p[0]! - q[0]!, p[1]! - q[1]!, p[2]! - q[2]!);
              if (d < best) {
                best = d;
                bq = q;
              }
            }
          }
      if (best <= (r - 0.5) * h) return bq;
    }
    return bq;
  };
}
