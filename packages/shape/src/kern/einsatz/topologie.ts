// Teil A (Plan „Maul als Einsatz“, Entwurf 2.5–2.9), Schritt A5: Topologie des Einsatzes. Das Feld M (A3) des verfeinerten
// Käfigs K1 wird durch ein geordnetes Gitter ersetzt, nur Vierecke:
// - Haut: Reihen r = 0 (Lippe) … J (Rand von M, die alten Randpunkte bleiben) × Speichen k = 0 … 2m je Hälfte; k < m ist die
//   Oberseite, k = m der Mundwinkel, k > m die Unterseite. Gitterpunkt (r, k) = Karte⁻¹(u_r, θ_k(u_r)) auf A0 mit
//   θ_k(u) = (1 − s)·θ_in(k) + s·θ_out(k), s = smoothstep(u): θ_out = V des Randpunkts, θ_in = V der Lippenstelle.
// - Lippenschleife (Reihe 0): 4m Punkte, U₀ … U_{m−1}, c, D_{m−1} … D₀ und das Spiegelbild; unendlich scharf, c mit
//   unendlicher Punktschärfe. Die Lippenstellen liegen nach Bogenlänge auf dem Schlitz (zum Mundwinkel hin dichter: etwa drei
//   Speichen in den letzten 12 % der Lippe); U_k und D_k sind getrennte Punkte auf bitgleicher Lage (Kiefer gleich).
// - Tasche: K Schleifen auf denselben Speichen nach innen (Startlagen; das Lösen der Tasche ist A8).
// - Rachen: m × m-Gitter auf der letzten Taschenschleife, Spiegelebene = Diagonale U₀–D₀, oben/unten = Gegendiagonale; seine
//   vier Ecken haben Valenz 3 (verdeckt).
// Indexregel (Entwurf 2.1): Punkte von K1 behalten ihre Nummern, die im Inneren von M werden tot (nicht referenziert), neue
// Punkte hängen an; die Flächen außerhalb von M behalten ihre Reihenfolge (`alteFlaeche`), damit die feinen Blöcke außerhalb
// von M ∪ C mit A0 vergleichbar sind (Kragen-Lemma). Spiegel und Naht sind topologisch festgelegt (nicht über z). DOM-frei.
import { type Kaefig, kaefigAusFlaechen, kanteZwischen } from '../../kaefig/halbkanten';
import { spiegelIndex } from '../pinsel';
import type { FeldSpec } from './feld';
import type { FeinNetz } from './flaeche';
import type { Karte } from './karte';
import { kruemmungsParameter } from './lippe';

type V3 = [number, number, number];

/** Unendliche Schärfe (größer als jede Stufenzahl) */
export const UNENDLICH = 1e6;

/** Rolle je Punkt des Einsatz-Käfigs */
export const ROLLE_AUSSEN = 0;
export const ROLLE_RAND = 1;
export const ROLLE_TOT = 2;
export const ROLLE_HAUT = 3;
export const ROLLE_LIPPE = 4;
export const ROLLE_WINKEL = 5;
export const ROLLE_TASCHE = 6;
export const ROLLE_RACHEN = 7;

/** Kieferseite je Punkt: keine (außen, Rand), oben, unten, beide (Mundwinkelspeiche, Gegendiagonale des Rachens) */
export const SEITE_KEINE = 0;
export const SEITE_OBEN = 1;
export const SEITE_UNTEN = 2;
export const SEITE_BEIDE = 3;

export type EinsatzTopologie = {
  kaefig: Kaefig;
  /** Punkte von K1 (gleiche Nummern; die im Inneren von M sind tot) */
  nAlt: number;
  tot: Int32Array;
  /** Flächen von K1 außerhalb von M (die ersten `alteFlaeche.length` Flächen des neuen Käfigs, in alter Reihenfolge) */
  alteFlaeche: Int32Array;
  m: number;
  J: number;
  K: number;
  /** rechte Hälfte: Haut[r][k] (r = 0 Lippe … J Rand), Tasche[p][k] (p = 0 Lippe … K); Rachen[a][b] ganz (beide Hälften) */
  haut: number[][];
  tasche: number[][];
  rachen: number[][];
  /** Lippenschleife ganz (4m Punkte im Umlauf: rechte Hälfte U₀ … c … D₀, dann links zurück) */
  lippe: number[];
  /** Spiegelpartner je Punkt (−1 für Punkte ohne Partner) */
  spiegel: Int32Array;
  rolle: Uint8Array;
  seite: Uint8Array;
  /** Speiche und Reihe je neuem Punkt (Haut: Reihe r ≥ 0, Tasche: −p; −1 sonst) */
  speiche: Int32Array;
  reihe: Int32Array;
  /** Bogenlängenanteile der Lippenstellen auf dem Schlitz, Naht (0) → Mundwinkel (1), k = 0 … m (beide Lippen gleich) */
  lippenAnteile: Float64Array;
  /** Kartenlage je Hautgitterpunkt (r, k) der rechten Hälfte (r = 0 … J), Speichen wie `haut` */
  hautKarte: { u: number[][]; v: number[][] };
  /** V der Lippenstellen und der Randpunkte je Speiche (in der Karte), Reihenhöhen u_r */
  thetaIn: Float64Array;
  thetaOut: Float64Array;
  reihenHoehen: number[];
  /** Taschentiefe der Startlagen, Abstand Randpunkt m ↔ Mundwinkel in V, Falten von K1 im Inneren von M */
  taschenTiefe: number;
  winkelVersatz: number;
  verloreneFalten: number;
  /** die Oberseite lag in der Karte bei V > V_c (Speichen umgedreht) */
  umgedreht: boolean;
};

const smooth = (u: number) => u * u * (3 - 2 * u);

/** Normalen je Punkt des feinen Netzes (flächengewichtet, nach außen). */
export function punktNormalen(netz: FeinNetz): Float64Array {
  const P = netz.punkte;
  const N = new Float64Array(P.length);
  const T = netz.dreiecke;
  for (let t = 0; t < T.length; t += 3) {
    const a = T[t]!;
    const b = T[t + 1]!;
    const c = T[t + 2]!;
    const u: V3 = [P[3 * b]! - P[3 * a]!, P[3 * b + 1]! - P[3 * a + 1]!, P[3 * b + 2]! - P[3 * a + 2]!];
    const v: V3 = [P[3 * c]! - P[3 * a]!, P[3 * c + 1]! - P[3 * a + 1]!, P[3 * c + 2]! - P[3 * a + 2]!];
    const n: V3 = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    for (const i of [a, b, c]) for (let d = 0; d < 3; d++) N[3 * i + d] = N[3 * i + d]! + n[d]!;
  }
  for (let i = 0; i < N.length; i += 3) {
    const l = Math.hypot(N[i]!, N[i + 1]!, N[i + 2]!) || 1;
    N[i] = N[i]! / l;
    N[i + 1] = N[i + 1]! / l;
    N[i + 2] = N[i + 2]! / l;
  }
  return N;
}

/** Umkehrung der Karte: (u, v) → Dreieck mit baryzentrischer Lage → Lage und Normale auf A0 (Zellraster 64 × 64). */
export function kartenUmkehr(karte: Karte, netz: FeinNetz, doppel: Map<number, number>, normalen = punktNormalen(netz)) {
  const idx = new Map<number, number>();
  karte.punkte.forEach((g, i) => idx.set(g, i));
  const dreiecke = karte.dreiecke;
  const Z = 64;
  const zellen: number[][] = Array.from({ length: Z * Z }, () => []);
  const T = dreiecke.length / 3;
  const uv = (g: number): [number, number] => {
    const i = idx.get(g)!;
    return [karte.u[i]!, karte.v[i]!];
  };
  for (let t = 0; t < T; t++) {
    const p = [uv(dreiecke[3 * t]!), uv(dreiecke[3 * t + 1]!), uv(dreiecke[3 * t + 2]!)];
    const u0 = Math.max(0, Math.floor(Math.min(p[0]![0], p[1]![0], p[2]![0]) * Z));
    const u1 = Math.min(Z - 1, Math.floor(Math.max(p[0]![0], p[1]![0], p[2]![0]) * Z));
    const v0 = Math.max(0, Math.floor(Math.min(p[0]![1], p[1]![1], p[2]![1]) * Z));
    const v1 = Math.min(Z - 1, Math.floor(Math.max(p[0]![1], p[1]![1], p[2]![1]) * Z));
    for (let a = u0; a <= u1; a++) for (let b = v0; b <= v1; b++) zellen[a * Z + b]!.push(t);
  }
  const orig = (g: number) => doppel.get(g) ?? g;
  return (u: number, v: number): { p: V3; n: V3 } => {
    const a = Math.min(Z - 1, Math.max(0, Math.floor(u * Z)));
    const b = Math.min(Z - 1, Math.max(0, Math.floor(v * Z)));
    let best: { t: number; l: [number, number, number]; fehl: number } | null = null;
    for (let r = 0; r <= 3 && !(best && best.fehl <= 1e-12); r++)
      for (let da = -r; da <= r; da++)
        for (let db = -r; db <= r; db++) {
          if (Math.max(Math.abs(da), Math.abs(db)) !== r) continue;
          const za = a + da;
          const zb = b + db;
          if (za < 0 || zb < 0 || za >= Z || zb >= Z) continue;
          for (const t of zellen[za * Z + zb]!) {
            const p0 = uv(dreiecke[3 * t]!);
            const p1 = uv(dreiecke[3 * t + 1]!);
            const p2 = uv(dreiecke[3 * t + 2]!);
            const d = (p1[1] - p2[1]) * (p0[0] - p2[0]) + (p2[0] - p1[0]) * (p0[1] - p2[1]);
            if (Math.abs(d) < 1e-18) continue;
            const l0 = ((p1[1] - p2[1]) * (u - p2[0]) + (p2[0] - p1[0]) * (v - p2[1])) / d;
            const l1 = ((p2[1] - p0[1]) * (u - p2[0]) + (p0[0] - p2[0]) * (v - p2[1])) / d;
            const l2 = 1 - l0 - l1;
            const fehl = Math.max(0, -l0, -l1, -l2);
            if (!best || fehl < best.fehl) best = { t, l: [l0, l1, l2], fehl };
          }
        }
    if (!best) throw new Error(`Einsatz: Kartenpunkt (${u}, ${v}) in keinem Dreieck`);
    const l = best.l.map((x) => Math.max(0, x));
    const s = l[0]! + l[1]! + l[2]! || 1;
    const ecken = [orig(dreiecke[3 * best.t]!), orig(dreiecke[3 * best.t + 1]!), orig(dreiecke[3 * best.t + 2]!)];
    const p: V3 = [0, 0, 0];
    const n: V3 = [0, 0, 0];
    for (let e = 0; e < 3; e++)
      for (let d = 0; d < 3; d++) {
        p[d] = p[d]! + (l[e]! / s) * netz.punkte[3 * ecken[e]! + d]!;
        n[d] = n[d]! + (l[e]! / s) * normalen[3 * ecken[e]! + d]!;
      }
    const ln = Math.hypot(...n) || 1;
    return { p, n: [n[0] / ln, n[1] / ln, n[2] / ln] };
  };
}

/** Erster Treffer eines Strahls mit dem feinen Netz (Möller–Trumbore), ab Abstand `tMin`. */
function strahlTreffer(netz: FeinNetz, o: V3, r: V3, tMin: number): number {
  const P = netz.punkte;
  const T = netz.dreiecke;
  let best = Infinity;
  for (let t = 0; t < T.length; t += 3) {
    const a = 3 * T[t]!;
    const b = 3 * T[t + 1]!;
    const c = 3 * T[t + 2]!;
    const e1: V3 = [P[b]! - P[a]!, P[b + 1]! - P[a + 1]!, P[b + 2]! - P[a + 2]!];
    const e2: V3 = [P[c]! - P[a]!, P[c + 1]! - P[a + 1]!, P[c + 2]! - P[a + 2]!];
    const q: V3 = [r[1] * e2[2] - r[2] * e2[1], r[2] * e2[0] - r[0] * e2[2], r[0] * e2[1] - r[1] * e2[0]];
    const det = e1[0] * q[0] + e1[1] * q[1] + e1[2] * q[2];
    if (Math.abs(det) < 1e-20) continue;
    const s: V3 = [o[0] - P[a]!, o[1] - P[a + 1]!, o[2] - P[a + 2]!];
    const u = (s[0] * q[0] + s[1] * q[1] + s[2] * q[2]) / det;
    if (u < 0 || u > 1) continue;
    const w: V3 = [s[1] * e1[2] - s[2] * e1[1], s[2] * e1[0] - s[0] * e1[2], s[0] * e1[1] - s[1] * e1[0]];
    const v = (r[0] * w[0] + r[1] * w[1] + r[2] * w[2]) / det;
    if (v < 0 || u + v > 1) continue;
    const tt = (e2[0] * w[0] + e2[1] * w[1] + e2[2] * w[2]) / det;
    if (tt > tMin && tt < best) best = tt;
  }
  return best;
}

/**
 * Hautreihen nach der Feldtiefe (Entwurf 2.5: Reihenabstand wächst bis etwa zur Kantenlänge am Rand): Tiefe = Median der
 * Wege auf der Haut von der Lippe zum Randpunkt je Speiche (in der Karte längs U abgetastet), Kante = Median der Randkanten;
 * J = Tiefe / (0,85 · Kante), auf 4 … 8 begrenzt. Rand von M und Kragen bleiben fest (Kragen-Lemma), nur die äußeren Reihen
 * gleichen die neue Verbindung an den Randpunkten aus — zu wenige, zu weite Reihen kosteten die Kugel 0,75 statt 0,26 px.
 */
function reihenZahl(umkehr: (u: number, v: number) => { p: V3; n: V3 }, thetaOut: Float64Array, lippe: V3[], rand: V3[]): number {
  const tiefen: number[] = [];
  for (let k = 0; k < rand.length; k++) {
    let vor = lippe[k]!;
    let weg = 0;
    for (let i = 1; i <= 8; i++) {
      const q = i === 8 ? rand[k]! : umkehr(i / 8, thetaOut[k]!).p;
      weg += Math.hypot(q[0] - vor[0], q[1] - vor[1], q[2] - vor[2]);
      vor = q;
    }
    tiefen.push(weg);
  }
  const kanten: number[] = [];
  for (let k = 0; k + 1 < rand.length; k++) kanten.push(Math.hypot(rand[k + 1]![0] - rand[k]![0], rand[k + 1]![1] - rand[k]![1], rand[k + 1]![2] - rand[k]![2]));
  const median = (a: number[]) => [...a].sort((x, y) => x - y)[a.length >> 1]!;
  return Math.min(8, Math.max(4, Math.round(median(tiefen) / (0.85 * median(kanten)))));
}

/** Reihenhöhen u_r (r = 0 … J): Abstände wachsen von 0,6 auf 1 (Entwurf 2.5). */
export function reihenHoehen(J: number): number[] {
  const w = Array.from({ length: J }, (_, i) => 0.6 + (0.4 * i) / Math.max(1, J - 1));
  const summe = w.reduce((a, b) => a + b, 0);
  const out = [0];
  for (const x of w) out.push(out[out.length - 1]! + x / summe);
  out[J] = 1;
  return out;
}

/**
 * Hautgitter in der Karte: Reihen r = 0 (Lippe, fest bei (0, θ_in)) … J (Rand von M, fest bei (1, θ_out)), Speichen k = 0 … 2m
 * (k = 0 und 2m auf der Naht: V = 0 bzw. 1, U nach Bogenlänge auf der Naht mit den Reihenabständen). Innen erst die Mischung
 * θ_k(u) = (1 − s)·θ_in + s·θ_out, dann geglättet: jeder innere Punkt ist das gewichtete Mittel seiner vier Nachbarn mit dem
 * Gewicht 3D-Länge / (Kartenlänge · Ziellänge) der Kante (Ziellänge längs der Speichen wie die Reihenabstände, quer 1). Der
 * Rand liegt auf dem konvexen Einheitsquadrat und alle Gewichte sind positiv → nach Tutte/Floater ist jedes Zwischen- und
 * Endgitter in der Karte faltenfrei, also auch auf der Haut; die Gewichte gleichen die 3D-Abstände längs der Gitterlinien aus.
 */
function hautGitter(umkehr: (u: number, v: number) => { p: V3; n: V3 }, uR: number[], thetaIn: Float64Array, thetaOut: Float64Array, lippe: V3[], rand: V3[], glaettung: 'konform' | 'laenge' | 'keine', winkelReihen: number, winkelFaktor = 1, runden = 24, sweeps = 40): { u: number[][]; v: number[][]; lagen: V3[][] } {
  const J = uR.length - 1;
  const S = thetaIn.length - 1;
  const mw = S / 2;
  // Nahtspeichen: U nach Bogenlänge auf der Naht (fein abgetastet), mit denselben Anteilen wie die Reihenhöhen
  const naht = (v: number): number[] => {
    const N = 256;
    const s = [0];
    let vor = umkehr(0, v).p;
    for (let i = 1; i <= N; i++) {
      const q = umkehr(i / N, v).p;
      s.push(s[i - 1]! + Math.hypot(q[0] - vor[0], q[1] - vor[1], q[2] - vor[2]));
      vor = q;
    }
    const gesamt = s[N]!;
    return uR.map((a, r) => {
      if (r === 0) return 0;
      if (r === J) return 1;
      const ziel = a * gesamt;
      let i = 0;
      while (i + 1 < N && s[i + 1]! < ziel) i++;
      const t = s[i + 1]! > s[i]! ? (ziel - s[i]!) / (s[i + 1]! - s[i]!) : 0;
      return (i + t) / N;
    });
  };
  const uOben = naht(0);
  const uUnten = naht(1);
  // Mundwinkelspeiche: ihr Punkt in Reihe r ≤ winkelReihen liegt auf der Verlängerung des Schlitzes (V = V_c) im 3D-Abstand
  // r·winkelFaktor·s vor dem Mundwinkel (s = letzter Lippenabstand). Liegt er näher (die Karte drängt die Reihen an der
  // Spitze zusammen, Abstand ∝ U²), fällt der Kantenpunkt (c + H + F_A + F_B)/4 der Speiche hinter c und die feinen Flächen
  // am Mundwinkel klappen um (in allen Fällen der Reihe gemessen)
  const c0 = lippe[mw]!;
  const sLetzt = Math.hypot(lippe[mw - 1]![0] - c0[0], lippe[mw - 1]![1] - c0[1], lippe[mw - 1]![2] - c0[2]);
  const winkelU = (abstand: number, uMax: number) => {
    let lo = 0;
    let hi = uMax;
    const d = (uu: number) => {
      const q = umkehr(uu, thetaIn[mw]!).p;
      return Math.hypot(q[0] - c0[0], q[1] - c0[1], q[2] - c0[2]);
    };
    if (d(hi) < abstand) return hi;
    for (let i = 0; i < 40; i++) {
      const mid = 0.5 * (lo + hi);
      if (d(mid) < abstand) lo = mid;
      else hi = mid;
    }
    return 0.5 * (lo + hi);
  };
  const u: number[][] = [];
  const v: number[][] = [];
  for (let r = 0; r <= J; r++) {
    const ur: number[] = [];
    const vr: number[] = [];
    const sm = smooth(uR[r]!);
    for (let k = 0; k <= S; k++) {
      if (r === 0) {
        ur.push(0);
        vr.push(thetaIn[k]!);
      } else if (r === J) {
        ur.push(1);
        vr.push(thetaOut[k]!);
      } else if (k === 0) {
        ur.push(uOben[r]!);
        vr.push(0);
      } else if (k === S) {
        ur.push(uUnten[r]!);
        vr.push(1);
      } else if (k === mw && r <= winkelReihen) {
        ur.push(Math.max(uR[r]!, winkelU(r * winkelFaktor * sLetzt, 0.5 * (uR[r]! + uR[r + 1]!))));
        vr.push(thetaIn[k]!);
      } else {
        ur.push(uR[r]!);
        vr.push((1 - sm) * thetaIn[k]! + sm * thetaOut[k]!);
      }
    }
    u.push(ur);
    v.push(vr);
  }
  // Ziellängen: längs der Speichen die Reihenabstände (relativ), quer 1
  const zielSpeiche = Array.from({ length: J }, (_, r) => uR[r + 1]! - uR[r]!);
  const mittelSpeiche = zielSpeiche.reduce((a, b) => a + b, 0) / J;
  const lage3 = (r: number, k: number): V3 => (r === 0 ? lippe[k]! : r === J ? rand[k]! : umkehr(u[r]![k]!, v[r]![k]!).p);
  const nRunden = glaettung === 'keine' ? 0 : glaettung === 'konform' ? 1 : runden;
  for (let runde = 0; runde < nRunden; runde++) {
    const L: V3[][] = [];
    for (let r = 0; r <= J; r++) L.push(Array.from({ length: S + 1 }, (_, k) => lage3(r, k)));
    const gewicht = (r0: number, k0: number, r1: number, k1: number, ziel: number) => {
      const a = L[r0]![k0]!;
      const b = L[r1]![k1]!;
      const l3 = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
      const l2 = Math.hypot(u[r0]![k0]! - u[r1]![k1]!, v[r0]![k0]! - v[r1]![k1]!);
      return glaettung === 'konform' ? 1 / ziel : l3 / (Math.max(1e-12, l2) * ziel);
    };
    // Gewichte je Kante (fest in dieser Runde): wq[r][k] zwischen (r, k)–(r, k+1), ws[r][k] zwischen (r, k)–(r+1, k)
    const wq: number[][] = [];
    const ws: number[][] = [];
    for (let r = 0; r <= J; r++) {
      wq.push(Array.from({ length: S }, (_, k) => gewicht(r, k, r, k + 1, 1)));
      if (r < J) ws.push(Array.from({ length: S + 1 }, (_, k) => gewicht(r, k, r + 1, k, zielSpeiche[r]! / mittelSpeiche)));
    }
    for (let sw = 0; sw < (glaettung === 'konform' ? 20 * sweeps : sweeps); sw++)
      for (let r = 1; r < J; r++)
        for (let k = 1; k < S; k++) {
          // die Mundwinkelspeiche bleibt in den ersten Reihen auf der Verlängerung des Schlitzes (V = V_c): sonst wird eins
          // der beiden Mundwinkel-Vierecke an c überstumpf (beide überdecken je 180°, der Schlitz hat die Breite null)
          if (k === mw && r <= winkelReihen) continue;
          const w1 = wq[r]![k - 1]!;
          const w2 = wq[r]![k]!;
          const w3 = ws[r - 1]![k]!;
          const w4 = ws[r]![k]!;
          const summe = w1 + w2 + w3 + w4;
          u[r]![k] = (w1 * u[r]![k - 1]! + w2 * u[r]![k + 1]! + w3 * u[r - 1]![k]! + w4 * u[r + 1]![k]!) / summe;
          v[r]![k] = (w1 * v[r]![k - 1]! + w2 * v[r]![k + 1]! + w3 * v[r - 1]![k]! + w4 * v[r + 1]![k]!) / summe;
        }
  }
  const lagen: V3[][] = [];
  for (let r = 0; r <= J; r++) lagen.push(Array.from({ length: S + 1 }, (_, k) => lage3(r, k)));
  return { u, v, lagen };
}

/** Einstellungen des Einsatzes (Standard nach dem Vergleich in A5: β = 0, Dehnungsgewichte, eine feste Reihe am Mundwinkel) */
export type EinsatzOptionen = {
  /** Hautreihen J (fehlt: nach der Feldtiefe, 4 … 8) und Taschenreihen K */
  J?: number;
  K?: number;
  /**
   * Lippenstellen: Anteil Bogenlänge β in der Mischung τ_β(s) = (1 − β)·τ(s) + β·s/L mit dem konformen Schlitzparameter
   * τ(s) = ½·(V_A(s)/V_c + (1 − V_B(s))/(1 − V_c)) (gemittelt über beide Schlitzseiten, damit U_k und D_k auf derselben Stelle
   * liegen); Lippenstelle k bei τ_β = k/m
   */
  lippeBogen?: number;
  /** Glättung des Hautgitters in der Karte: gleiche Gewichte (konform), Dehnungsgewichte (Länge) oder keine */
  glaettung?: 'konform' | 'laenge' | 'keine';
  /** Reihen der Mundwinkelspeiche, die auf der Verlängerung des Schlitzes bleiben (V = V_c), und ihr Abstand vor dem
   * Mundwinkel in letzten Lippenabständen je Reihe */
  winkelReihen?: number;
  winkelFaktor?: number;
  /** gezeichnete Linie dicht abgetastet (Welt): ihre Krümmung verdichtet die Lippenstellen (Anteil `lippeKruemmung`) */
  linie?: readonly V3[];
  lippeKruemmung?: number;
};

/**
 * Einsatz bauen (Topologie und Startlagen). `karte` stammt aus A4 auf dem feinen Netz `netz` (Stufe L von A0 = Stufe L−1
 * von K1, gleiche Nummern), `doppel` aus dem Schnitt (A1).
 */
export function einsatzTopologie(k1: Kaefig, feld: FeldSpec, karte: Karte, netz: FeinNetz, doppel: Map<number, number>, opt: EinsatzOptionen = {}): EinsatzTopologie {
  let J = opt.J ?? 0;
  const K = opt.K ?? 5;
  const m = feld.m;
  if (!Number.isInteger(m) || m < 2) throw new Error(`Einsatz: Lippenauflösung m = ${m} ungültig`);
  if ((J !== 0 && J < 2) || K < 1) throw new Error(`Einsatz: J = ${J}, K = ${K} ungültig`);
  const spK1 = spiegelIndex(k1.xyz, k1.n);
  const kIdx = new Map<number, number>();
  karte.punkte.forEach((g, i) => kIdx.set(g, i));
  const vVon = (p: number) => {
    const i = kIdx.get(p);
    if (i === undefined) throw new Error(`Einsatz: Randpunkt ${p} fehlt in der Karte`);
    return karte.v[i]!;
  };
  // halber Rand von M (rechte Hälfte, z > 0) von Naht zu Naht, nach V aufsteigend
  const rand = Array.from(feld.rand);
  const nahtStellen = rand.map((p, i) => (spK1[p] === p ? i : -1)).filter((i) => i >= 0);
  if (nahtStellen.length !== 2) throw new Error(`Einsatz: Rand von M trifft die Naht ${nahtStellen.length}-mal (erwartet 2)`);
  const [i0, i1] = nahtStellen as [number, number];
  const bogenA = rand.slice(i0, i1 + 1);
  const bogenB = [...rand.slice(i1), ...rand.slice(0, i0 + 1)];
  const rechts = (b: number[]) => b.length > 2 && b.slice(1, -1).every((p) => k1.xyz[3 * p + 2]! > 0);
  let bogen = rechts(bogenA) ? bogenA : bogenB;
  if (!rechts(bogen)) throw new Error('Einsatz: kein halber Rand auf der rechten Seite');
  if (vVon(bogen[0]!) > vVon(bogen[bogen.length - 1]!)) bogen = [...bogen].reverse();
  if (bogen.length !== 2 * m + 1) throw new Error(`Einsatz: halber Rand hat ${bogen.length - 1} Kanten, erwartet 2m = ${2 * m}`);
  // Lippe: Schlitz der Karte (lokale Nummern), Seite A von V = 0 zum Mundwinkel, Seite B von V = 1 zum Mundwinkel
  const schlitz = karte.rand.schlitz;
  const iW = (schlitz.length - 1) / 2;
  if (!Number.isInteger(iW) || karte.v[schlitz[iW]!] !== karte.vWinkel) throw new Error('Einsatz: Mundwinkel nicht in der Mitte des Schlitzes');
  const seiteA = schlitz.slice(0, iW + 1);
  const seiteB = schlitz.slice(iW).reverse();
  const lage = (lokal: number): V3 => {
    const g = doppel.get(karte.punkte[lokal]!) ?? karte.punkte[lokal]!;
    return [netz.punkte[3 * g]!, netz.punkte[3 * g + 1]!, netz.punkte[3 * g + 2]!];
  };
  for (let i = 0; i <= iW; i++) {
    const a = lage(seiteA[i]!);
    const b = lage(seiteB[i]!);
    if (a[0] !== b[0] || a[1] !== b[1] || a[2] !== b[2]) throw new Error('Einsatz: Schlitzseiten liegen nicht aufeinander');
  }
  const sA = [0];
  for (let i = 1; i < seiteA.length; i++) {
    const a = lage(seiteA[i - 1]!);
    const b = lage(seiteA[i]!);
    sA.push(sA[i - 1]! + Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]));
  }
  const lippenLaenge = sA[sA.length - 1]!;
  // Stelle bei Bogenlänge σ auf einer Seite: Lage (auf beiden Seiten mit denselben Rechenschritten → bitgleich) und V
  const stelle = (seite: number[], sigma: number): { p: V3; v: number } => {
    let i = 0;
    while (i + 2 < sA.length && sA[i + 1]! < sigma) i++;
    const t = sA[i + 1]! > sA[i]! ? Math.min(1, Math.max(0, (sigma - sA[i]!) / (sA[i + 1]! - sA[i]!))) : 0;
    const a = lage(seite[i]!);
    const b = lage(seite[i + 1]!);
    return { p: [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]), a[2] + t * (b[2] - a[2])], v: karte.v[seite[i]!]! + t * (karte.v[seite[i + 1]!]! - karte.v[seite[i]!]!) };
  };
  // Lippenstellen: konformer Schlitzparameter τ (gemittelt über beide Seiten), gemischt mit der Bogenlänge und dem
  // krümmungsgewichteten Parameter der gezeichneten Linie (Anteile der Bogenlänge übertragen), je Schlitzpunkt ausgewertet
  // (stückweise linear) und umgekehrt; U_k und D_k teilen die Bogenlänge s_k (bitgleiche Lage)
  const beta = opt.lippeBogen ?? 0;
  const betaK = opt.linie ? (opt.lippeKruemmung ?? 0.5) : 0;
  const kr = opt.linie ? kruemmungsParameter(opt.linie) : (f: number) => f;
  const vc = karte.vWinkel;
  const tauPunkte = sA.map((s, i) => (1 - betaK) * ((1 - beta) * 0.5 * (karte.v[seiteA[i]!]! / vc + (1 - karte.v[seiteB[i]!]!) / (1 - vc)) + (beta * s) / lippenLaenge) + betaK * kr(s / lippenLaenge));
  tauPunkte[0] = 0;
  tauPunkte[tauPunkte.length - 1] = 1;
  for (let i = 1; i < tauPunkte.length; i++) tauPunkte[i] = Math.max(tauPunkte[i]!, tauPunkte[i - 1]!);
  const bogenBei = (tau: number) => {
    let i = 0;
    while (i + 2 < tauPunkte.length && tauPunkte[i + 1]! < tau) i++;
    const d = tauPunkte[i + 1]! - tauPunkte[i]!;
    const t = d > 1e-15 ? Math.min(1, Math.max(0, (tau - tauPunkte[i]!) / d)) : 0;
    return sA[i]! + t * (sA[i + 1]! - sA[i]!);
  };
  const thetaIn = new Float64Array(2 * m + 1);
  const thetaOut = Float64Array.from(bogen, vVon);
  const lippeLage: V3[] = [];
  const lippenAnteile = new Float64Array(m + 1);
  for (let k = 0; k <= m; k++) lippenAnteile[k] = k === m ? 1 : bogenBei(k / m) / lippenLaenge;
  for (let k = 0; k <= 2 * m; k++) {
    const kk = k <= m ? k : 2 * m - k;
    const sigma = kk === m ? lippenLaenge : lippenAnteile[kk]! * lippenLaenge;
    const st = k <= m ? stelle(seiteA, sigma) : stelle(seiteB, sigma);
    thetaIn[k] = k === 0 ? 0 : k === 2 * m ? 1 : k === m ? vc : st.v;
    lippeLage.push(st.p);
  }
  lippeLage[0]![2] = 0;
  lippeLage[2 * m]![2] = 0;
  // Haut: Gitter in der Karte (Startlage: Speichen als Mischung von θ_in und θ_out), Nahtspeichen nach Bogenlänge, dann
  // geglättet (Tutte mit Dehnungsgewichten, Rand fest → faltenfrei), Lagen über die Umkehrung der Karte
  const umkehr = kartenUmkehr(karte, netz, doppel);
  if (!J) J = reihenZahl(umkehr, thetaOut, lippeLage, Array.from(bogen, (b): V3 => [netz.punkte[3 * b]!, netz.punkte[3 * b + 1]!, netz.punkte[3 * b + 2]!]));
  const uR = reihenHoehen(J);
  const gitter = hautGitter(umkehr, uR, thetaIn, thetaOut, lippeLage, Array.from(bogen, (b): V3 => [netz.punkte[3 * b]!, netz.punkte[3 * b + 1]!, netz.punkte[3 * b + 2]!]), opt.glaettung ?? 'laenge', opt.winkelReihen ?? 1, opt.winkelFaktor ?? 1);
  const hautLage: V3[][] = [lippeLage];
  for (let r = 1; r < J; r++) hautLage.push(gitter.lagen[r]!.map((p, k) => (k === 0 || k === 2 * m ? [p[0], p[1], 0] : p)));
  // Oberseite = die Seite, deren Randpunkte im Mittel höher liegen; liegt sie bei V > V_c, werden die Speichen umgedreht
  let yA = 0;
  let yB = 0;
  for (let k = 1; k < m; k++) {
    yA += k1.xyz[3 * bogen[k]! + 1]!;
    yB += k1.xyz[3 * bogen[2 * m - k]! + 1]!;
  }
  const umgedreht = yB > yA;
  const hautKarte = { u: gitter.u.map((z) => [...z]), v: gitter.v.map((z) => [...z]) };
  if (umgedreht) {
    bogen = [...bogen].reverse();
    for (let r = 0; r < hautLage.length; r++) hautLage[r] = [...hautLage[r]!].reverse();
    for (let r = 0; r <= J; r++) {
      hautKarte.u[r]!.reverse();
      hautKarte.v[r]!.reverse();
    }
    thetaIn.reverse();
    thetaOut.reverse();
  }
  // je Speiche: Normale an der Lippenstelle nach innen, Richtung zur eigenen Seite (Tangente zur Reihe 1)
  const innen: V3[] = [];
  const zurSeite: V3[] = [];
  for (let k = 0; k <= 2 * m; k++) {
    const n = umkehr(1e-6, thetaIn[k]!).n;
    const N: V3 = [-n[0], -n[1], k === 0 || k === 2 * m ? 0 : -n[2]];
    const lN = Math.hypot(...N) || 1;
    innen.push([N[0] / lN, N[1] / lN, N[2] / lN]);
    const a = hautLage[0]![k]!;
    const b = hautLage[1]![k]!;
    const d: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const dn = d[0] * n[0] + d[1] * n[1] + d[2] * n[2];
    const t: V3 = [d[0] - dn * n[0], d[1] - dn * n[1], k === 0 || k === 2 * m ? 0 : d[2] - dn * n[2]];
    const lt = Math.hypot(...t) || 1;
    zurSeite.push([t[0] / lt, t[1] / lt, t[2] / lt]);
  }
  // Taschentiefe: 0,4 der dünnsten Stelle (Strahl nach innen), höchstens 0,6 der Lippenlänge
  let duennste = Infinity;
  for (let k = 0; k <= 2 * m; k++) duennste = Math.min(duennste, strahlTreffer(netz, hautLage[0]![k]!, innen[k]!, 1e-6 * lippenLaenge));
  const tiefe = Math.min(0.4 * (Number.isFinite(duennste) ? duennste : lippenLaenge), 0.6 * lippenLaenge);
  const breite = 0.25 * tiefe;
  const taschenLage: V3[][] = [hautLage[0]!];
  for (let p = 1; p <= K; p++) {
    const reihe: V3[] = [];
    for (let k = 0; k <= 2 * m; k++) {
      const l = hautLage[0]![k]!;
      const f = p / K;
      const q: V3 = [0, 0, 0];
      for (let d = 0; d < 3; d++) q[d] = l[d]! + innen[k]![d]! * tiefe * f + zurSeite[k]![d]! * breite * f;
      reihe.push(q);
    }
    taschenLage.push(reihe);
  }
  // Punkte anlegen: rechte Hälfte in fester Reihenfolge (Haut, Tasche, Rachen), dann die Spiegelbilder in derselben Reihenfolge
  const nAlt = k1.n;
  const lagen: number[] = Array.from(k1.xyz);
  const info: { rolle: number; seite: number; speiche: number; reihe: number }[] = [];
  const naht = new Set<number>();
  const neu = (p: V3, rolle: number, seite: number, speiche: number, reihe: number, aufNaht: boolean) => {
    lagen.push(p[0], p[1], aufNaht ? 0 : p[2]);
    info.push({ rolle, seite, speiche, reihe });
    const i = lagen.length / 3 - 1;
    if (aufNaht) naht.add(i);
    return i;
  };
  const seiteVon = (k: number) => (k < m ? SEITE_OBEN : k > m ? SEITE_UNTEN : SEITE_BEIDE);
  const amRand = (k: number) => k === 0 || k === 2 * m;
  const haut: number[][] = [];
  for (let r = 0; r < J; r++) haut.push(hautLage[r]!.map((p, k) => neu(p, r === 0 ? (k === m ? ROLLE_WINKEL : ROLLE_LIPPE) : ROLLE_HAUT, seiteVon(k), k, r, amRand(k))));
  haut.push([...bogen]);
  const tasche: number[][] = [haut[0]!];
  for (let p = 1; p <= K; p++) tasche.push(taschenLage[p]!.map((q, k) => neu(q, ROLLE_TASCHE, seiteVon(k), k, -p, amRand(k))));
  // Rachen (a, b), a, b = 0 … m: Seite b = 0 ist die letzte Taschenreihe der Oberseite (Speichen 0 … m), Seite a = m die der
  // Unterseite (Speichen m … 2m); die linke Hälfte (a < b) ist das Spiegelbild von (b, a), die Diagonale liegt auf der Naht
  const letzte = tasche[K]!;
  const rachen: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(m + 1).fill(-1));
  for (let a = 0; a <= m; a++) rachen[a]![0] = letzte[a]!;
  for (let b = 0; b <= m; b++) rachen[m]![b] = letzte[m + b]!;
  const P = (i: number): V3 => [lagen[3 * i]!, lagen[3 * i + 1]!, lagen[3 * i + 2]!];
  const gz = (q: V3): V3 => [q[0], q[1], -q[2]];
  // Tiefenrichtung des Rachens: mittlere Innennormale, in die Mittelebene gelegt
  const mitte: V3 = [0, 0, 0];
  for (const n of innen) for (let d = 0; d < 2; d++) mitte[d] = mitte[d]! + n[d]!;
  const lm = Math.hypot(...mitte) || 1;
  const tiefRichtung: V3 = [mitte[0] / lm, mitte[1] / lm, 0];
  const coons = (a: number, b: number): V3 => {
    const s = a / m;
    const t = b / m;
    const unten = P(rachen[a]![0]!);
    const rechtsS = P(rachen[m]![b]!);
    const linksS = gz(P(rachen[b]![0]!));
    const oben = gz(P(rachen[m]![a]!));
    const c00 = P(rachen[0]![0]!);
    const c10 = P(rachen[m]![0]!);
    const c11 = P(rachen[m]![m]!);
    const c01 = gz(c10);
    const beule = 0.15 * tiefe * Math.sin(Math.PI * s) * Math.sin(Math.PI * t);
    const o: V3 = [0, 0, 0];
    for (let i = 0; i < 3; i++)
      o[i] = (1 - t) * unten[i]! + t * oben[i]! + (1 - s) * linksS[i]! + s * rechtsS[i]! - ((1 - s) * (1 - t) * c00[i]! + s * (1 - t) * c10[i]! + s * t * c11[i]! + (1 - s) * t * c01[i]!) + tiefRichtung[i]! * beule;
    return o;
  };
  for (let a = 1; a < m; a++) for (let b = 1; b <= a; b++) rachen[a]![b] = neu(coons(a, b), ROLLE_RACHEN, a + b < m ? SEITE_OBEN : a + b > m ? SEITE_UNTEN : SEITE_BEIDE, -1, -1, a === b);
  // Spiegelbilder aller neuen Punkte außerhalb der Naht, in Indexreihenfolge
  const nRechts = lagen.length / 3;
  const spiegelNeu = new Map<number, number>();
  for (let i = nAlt; i < nRechts; i++) {
    if (naht.has(i)) continue;
    const q = info[i - nAlt]!;
    spiegelNeu.set(i, neu(gz(P(i)), q.rolle, q.seite, q.speiche, q.reihe, false));
  }
  for (const [r, l] of [...spiegelNeu]) spiegelNeu.set(l, r);
  const sp = (p: number): number => {
    if (p < nAlt) {
      const q = spK1[p]!;
      if (q < 0) throw new Error(`Einsatz: Randpunkt ${p} ohne Spiegelpartner`);
      return q;
    }
    return naht.has(p) ? p : spiegelNeu.get(p)!;
  };
  for (let a = 0; a <= m; a++) for (let b = a + 1; b <= m; b++) rachen[a]![b] = sp(rachen[b]![a]!);
  // Flächen in Indexform; Umlauf: Hautflächen enthalten jede Randkante so wie die entfernte Fläche von M (der Rand läuft in
  // Umlaufrichtung der Flächen von M); die Tasche klappt an der Lippe um (gegenläufig zur Haut), der Rachen folgt der Tasche
  const randNach = new Map<number, number>();
  for (let i = 0; i < rand.length; i++) randNach.set(rand[i]!, rand[(i + 1) % rand.length]!);
  const hautDreh = randNach.get(bogen[0]!) === bogen[1]!;
  if (!hautDreh && randNach.get(bogen[1]!) !== bogen[0]!) throw new Error('Einsatz: Randkante b₀–b₁ nicht im Rand von M');
  const richte = (f: number[], drehen: boolean) => (drehen ? f.reverse() : f);
  const rechteFlaechen: number[][] = [];
  for (let r = 0; r < J; r++) for (let k = 0; k < 2 * m; k++) rechteFlaechen.push(richte([haut[r]![k]!, haut[r]![k + 1]!, haut[r + 1]![k + 1]!, haut[r + 1]![k]!], hautDreh));
  for (let p = 0; p < K; p++) for (let k = 0; k < 2 * m; k++) rechteFlaechen.push(richte([tasche[p]![k]!, tasche[p]![k + 1]!, tasche[p + 1]![k + 1]!, tasche[p + 1]![k]!], !hautDreh));
  const einsatzFlaechen = [...rechteFlaechen, ...rechteFlaechen.map((f) => f.map(sp).reverse())];
  for (let a = 0; a < m; a++) for (let b = 0; b < m; b++) einsatzFlaechen.push(richte([rachen[a]![b]!, rachen[a + 1]![b]!, rachen[a + 1]![b + 1]!, rachen[a]![b + 1]!], !hautDreh));
  // alte Flächen außerhalb von M in alter Reihenfolge
  const inM = new Uint8Array(k1.nF);
  for (const f of feld.feld) inM[f] = 1;
  const alt: number[][] = [];
  const alteFlaeche: number[] = [];
  for (let f = 0; f < k1.nF; f++) {
    if (inM[f]) continue;
    alt.push(Array.from(k1.fVerts.subarray(k1.fStart[f]!, k1.fStart[f + 1]!)));
    alteFlaeche.push(f);
  }
  const xyz = Float64Array.from(lagen);
  const kaefig = kaefigAusFlaechen(xyz, [...alt, ...einsatzFlaechen]);
  // Schärfen von K1 übernehmen (Kanten über ihre Punkte, Punktschärfen), Lippenschleife unendlich scharf, Mundwinkel Ecken
  let verloreneFalten = 0;
  for (let e = 0; e < k1.nE; e++) {
    const s = k1.eSchaerfe[e]!;
    if (!(s > 0)) continue;
    const ne = kanteZwischen(kaefig, k1.eA[e]!, k1.eB[e]!);
    if (ne >= 0) kaefig.eSchaerfe[ne] = s;
    else verloreneFalten++;
  }
  for (let v = 0; v < nAlt; v++) kaefig.vSchaerfe[v] = k1.vSchaerfe[v]!;
  const lippe = [...haut[0]!, ...haut[0]!.slice(1, -1).map(sp).reverse()];
  for (let i = 0; i < lippe.length; i++) {
    const e = kanteZwischen(kaefig, lippe[i]!, lippe[(i + 1) % lippe.length]!);
    if (e < 0) throw new Error('Einsatz: Lippenkante fehlt');
    kaefig.eSchaerfe[e] = UNENDLICH;
  }
  kaefig.vSchaerfe[haut[0]![m]!] = UNENDLICH;
  kaefig.vSchaerfe[sp(haut[0]![m]!)] = UNENDLICH;
  // Rollen, Seiten, Spiegel je Punkt
  const n = xyz.length / 3;
  const rolle = new Uint8Array(n);
  const seite = new Uint8Array(n);
  const speiche = new Int32Array(n).fill(-1);
  const reihe = new Int32Array(n).fill(-1);
  const benutzt = new Uint8Array(n);
  for (let h = 0; h < kaefig.fVerts.length; h++) benutzt[kaefig.fVerts[h]!] = 1;
  const randSet = new Set(rand);
  const tot: number[] = [];
  for (let v = 0; v < nAlt; v++) {
    if (!benutzt[v]) {
      rolle[v] = ROLLE_TOT;
      tot.push(v);
    } else rolle[v] = randSet.has(v) ? ROLLE_RAND : ROLLE_AUSSEN;
  }
  for (let i = nAlt; i < n; i++) {
    const q = info[i - nAlt]!;
    rolle[i] = q.rolle;
    seite[i] = q.seite;
    speiche[i] = q.speiche;
    reihe[i] = q.reihe;
  }
  const spiegel = new Int32Array(n);
  for (let v = 0; v < n; v++) spiegel[v] = v < nAlt ? spK1[v]! : sp(v);
  return {
    kaefig,
    nAlt,
    tot: Int32Array.from(tot),
    alteFlaeche: Int32Array.from(alteFlaeche),
    m,
    J,
    K,
    haut,
    tasche,
    rachen,
    lippe,
    spiegel,
    rolle,
    seite,
    speiche,
    reihe,
    lippenAnteile,
    hautKarte,
    thetaIn,
    thetaOut,
    reihenHoehen: uR,
    taschenTiefe: tiefe,
    winkelVersatz: Math.abs(thetaOut[m]! - thetaIn[m]!),
    verloreneFalten,
    umgedreht,
  };
}

/** Güte der Hautvierecke der rechten Hälfte (Startlagen): kleinster Winkel (ohne den Winkel am Mundwinkel, der bei einem
 * Schlitz der Breite null 180° beträgt), größte Streckung (Mittel der gegenüberliegenden Seiten), Anzahl unter 20° bzw. über
 * 4:1. */
export function hautGuete(t: EinsatzTopologie): { winkelMin: number; seitenMax: number; unter20: number; ueber4: number } {
  const xyz = t.kaefig.xyz;
  const P = (i: number): V3 => [xyz[3 * i]!, xyz[3 * i + 1]!, xyz[3 * i + 2]!];
  const c = t.haut[0]![t.m]!;
  let winkelMin = 180;
  let seitenMax = 0;
  let unter20 = 0;
  let ueber4 = 0;
  for (let r = 0; r < t.J; r++)
    for (let k = 0; k < 2 * t.m; k++) {
      const ecken = [t.haut[r]![k]!, t.haut[r]![k + 1]!, t.haut[r + 1]![k + 1]!, t.haut[r + 1]![k]!];
      const q = ecken.map(P);
      const seiten = q.map((u, i) => Math.hypot(u[0] - q[(i + 1) % 4]![0], u[1] - q[(i + 1) % 4]![1], u[2] - q[(i + 1) % 4]![2]));
      const quer = (seiten[0]! + seiten[2]!) / 2;
      const laengs = (seiten[1]! + seiten[3]!) / 2;
      const sv = Math.max(quer, laengs) / Math.max(1e-15, Math.min(quer, laengs));
      let w = 180;
      for (let i = 0; i < 4; i++) {
        if (ecken[i] === c) continue;
        const o = q[i]!;
        const a = q[(i + 1) % 4]!;
        const b = q[(i + 3) % 4]!;
        const d1: V3 = [a[0] - o[0], a[1] - o[1], a[2] - o[2]];
        const d2: V3 = [b[0] - o[0], b[1] - o[1], b[2] - o[2]];
        const cs = (d1[0] * d2[0] + d1[1] * d2[1] + d1[2] * d2[2]) / Math.max(1e-30, Math.hypot(...d1) * Math.hypot(...d2));
        w = Math.min(w, (Math.acos(Math.max(-1, Math.min(1, cs))) * 180) / Math.PI);
      }
      winkelMin = Math.min(winkelMin, w);
      seitenMax = Math.max(seitenMax, sv);
      if (w < 20) unter20++;
      if (sv > 4) ueber4++;
    }
  return { winkelMin, seitenMax, unter20, ueber4 };
}
