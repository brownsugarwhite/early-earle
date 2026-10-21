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
//
// Gitter „Kernring“ (Plan 21.10., E1; Option `gitter: 'kernring'`): Im Schleifengitter oben liegen am Mundwinkel nur zwei
// Hautflächen, die zusammen 360° überdecken müssen — Catmull–Clark gibt zwei Flächen 180°, die Fläche faltet dort (131–179°).
// Im Kernring ist der Mundwinkel ein regulärer Gitterpunkt am Ende des Schnitts: Reihe 0 ist die Lippe mit m = M − 2
// (M = Lippenauflösung des Felds), Reihe 1 ein Ring um den Schlitz mit 2M + 1 Punkten — über jedem Lippenpunkt einer, dazu um
// den Mundwinkel U'_{m+1}, E (auf der Verlängerung der Linie) und D'_{m+1}. c hat vier Hautflächen (natürlich 360°) und ist ein
// Faltenpunkt ohne Punktschärfe; U'_{m+1} und D'_{m+1} sind Dreierpole. Ab Reihe 1 laufen alle Reihen mit 2M + 1 Speichen
// bis zum Feldrand. Vorversuch (Kissen mit Schlitz): größter Knick am Schlitzende 7,8° statt 176°.
import { type Kaefig, kaefigAusFlaechen, kanteZwischen } from '../../kaefig/halbkanten';
import { type NormalZeile, normalSystem } from '../../loeser/normalSystem';
import { spiegelIndex } from '../pinsel';
import type { FeldSpec } from './feld';
import { ankerVon, type FeinNetz, feinNetz, punktNormalen } from './flaeche';
import type { Karte } from './karte';
import { bandLage, hautPunkt, zellenUmgeklappt } from './band';
import { kruemmungsParameter, type LippenAnfang, lippeAnpassen } from './lippe';
import { leiterFalten, leiterKeile, ringKarte } from './leiter';
import { type LeiterGitter, leiterGitterBauen } from './leiterGitter';

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
  /** Gitterart; Lippenauflösung m (Lippenspannen je Seite) und Speichen je Seite ab Reihe 1 (M; Schleifen: M = m) */
  gitter: 'schleifen' | 'kernring';
  m: number;
  M: number;
  J: number;
  K: number;
  /**
   * rechte Hälfte: Haut[r][k] (r = 0 Lippe mit 2m + 1 Punkten … J Rand, ab r = 1 mit 2M + 1 Punkten), Tasche[p][k] (p = 0
   * Lippe … K); Rachen[a][b] ganz (beide Hälften)
   */
  haut: number[][];
  tasche: number[][];
  rachen: number[][];
  /** Lippenschleife ganz (4m Punkte im Umlauf: rechte Hälfte U₀ … c … D₀, dann links zurück) */
  lippe: number[];
  /** Spiegelpartner je Punkt (−1 für Punkte ohne Partner) */
  spiegel: Int32Array;
  rolle: Uint8Array;
  seite: Uint8Array;
  /** Bereich je Käfigfläche: 0 außen, 1 Kragen, 2 Haut rechts, 3 Haut links, 4 Tasche/Rachen */
  bereich: Uint8Array;
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
  /** Kernring: Hautzellen mit falschem Umlauf in der Ebene der Lage (0 = faltenfrei) */
  umgeklappt: number;
  /** Anfang der Lippe auf der Naht: glatt oder Ecke (A0 hat am Linienanfang eine Spitze; U₀ und D₀ mit ihrer Punktschärfe) */
  lippenAnfang: LippenAnfang;
  /** Stufe des Feldkäfigs über A0 (K1 = 1, K2 = 2): Lösen auf Stufe 3 − stufe, Messen auf 4 − stufe (gleiche Grenzfläche) */
  stufe: 1 | 2;
  /**
   * E2.6 Leiter (sonst null): Seite (nach dem Umdrehen), Lippenstellen q bis zum Hals, Holme t, Halsspeiche, Sprossenenden
   * X_2 … X_q auf der Naht (X_q = Q). In `haut` fehlen die Punkte hinter den Sprossen (−1).
   */
  leiter: { seite: 0 | 1; q: number; t: number; kHals: number; X: number[] } | null;
};

const smooth = (u: number) => u * u * (3 - 2 * u);

export { punktNormalen };

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
export function strahlTreffer(netz: FeinNetz, o: V3, r: V3, tMin: number): number {
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
export function reihenZahl(umkehr: (u: number, v: number) => { p: V3; n: V3 }, thetaOut: Float64Array, lippe: V3[], rand: V3[]): number {
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
export function hautGitter(umkehr: (u: number, v: number) => { p: V3; n: V3 }, uR: number[], thetaIn: Float64Array, thetaOut: Float64Array, lippe: V3[], rand: V3[], glaettung: 'konform' | 'laenge' | 'keine', winkelReihen: number, winkelFaktor = 1, runden = 24, sweeps = 40): { u: number[][]; v: number[][]; lagen: V3[][] } {
  const J = uR.length - 1;
  const S = thetaIn.length - 1;
  const mw = S / 2;
  // Nahtspeichen: U nach Bogenlänge auf der Naht, mit denselben Anteilen wie die Reihenhöhen
  const uOben = nahtHoehen(umkehr, uR, 0);
  const uUnten = nahtHoehen(umkehr, uR, 1);
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

/** U der Nahtspeichen nach Bogenlänge auf der Naht (V = 0 oben, 1 unten), mit denselben Anteilen wie die Reihenhöhen. */
function nahtHoehen(umkehr: (u: number, v: number) => { p: V3; n: V3 }, uR: number[], v: number): number[] {
  const J = uR.length - 1;
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
}

/** Kernring: Speiche der Reihe 1 über dem Lippenpunkt k (k = m, der Mundwinkel, hat drei: m, M und M + 2; hier M). */
export function kernUeber(k: number, m: number): number {
  return k < m ? k : k === m ? m + 2 : k + 4;
}

/**
 * Seitenverhältnis der Karte: Sie ist konform bis auf den Maßstab je Achse (U harmonisch mit U = 0 am Schlitz und 1 am Rand, V
 * sein Gegenstück), also |∂p/∂U| = a·|∂p/∂V| mit einem festen a. Geschätzt als flächengewichteter Median über die Dreiecke.
 */
export function kartenSeitenverhaeltnis(karte: Karte, netz: FeinNetz, doppel: Map<number, number>): number {
  const idx = new Map<number, number>();
  karte.punkte.forEach((g, i) => idx.set(g, i));
  const lage = (g: number): V3 => {
    const o = doppel.get(g) ?? g;
    return [netz.punkte[3 * o]!, netz.punkte[3 * o + 1]!, netz.punkte[3 * o + 2]!];
  };
  const werte: [number, number][] = [];
  const T = karte.dreiecke;
  for (let t = 0; t < T.length; t += 3) {
    const i0 = idx.get(T[t]!)!;
    const i1 = idx.get(T[t + 1]!)!;
    const i2 = idx.get(T[t + 2]!)!;
    const du1 = karte.u[i1]! - karte.u[i0]!;
    const dv1 = karte.v[i1]! - karte.v[i0]!;
    const du2 = karte.u[i2]! - karte.u[i0]!;
    const dv2 = karte.v[i2]! - karte.v[i0]!;
    const det = du1 * dv2 - du2 * dv1;
    if (Math.abs(det) < 1e-14) continue;
    const p0 = lage(T[t]!);
    const p1 = lage(T[t + 1]!);
    const p2 = lage(T[t + 2]!);
    let lu = 0;
    let lv = 0;
    for (let d = 0; d < 3; d++) {
      const e1 = p1[d]! - p0[d]!;
      const e2 = p2[d]! - p0[d]!;
      lu += ((e1 * dv2 - e2 * dv1) / det) ** 2;
      lv += ((-e1 * du2 + e2 * du1) / det) ** 2;
    }
    if (lv > 0) werte.push([Math.sqrt(lu / lv), Math.abs(det)]);
  }
  werte.sort((x, y) => x[0] - y[0]);
  const summe = werte.reduce((a, w) => a + w[1], 0);
  let acc = 0;
  for (const w of werte) {
    acc += w[1];
    if (acc >= 0.5 * summe) return w[0];
  }
  return 1;
}

/**
 * Karte längs der Naht nach Bogenlänge umparametrisiert (E2): U' = Bogenlängenanteil auf der Naht (V = 0 bzw. 1), zum
 * Mundwinkel hin quadratisch in U' = U übergehend (an V_c unverändert). U' ist für jedes V in U monoton, das Rechteck bleibt
 * ein Rechteck. Die konforme Karte staucht die Naht an einem spitzen Schlitzanfang (Linie trifft die Naht schräg: V ∝ r³);
 * Reihen auf ihren Kartenlinien lagen dort weit auseinander (Robbe hoch: erste Reihe 42 px vom Anfang, die übrigen 4–9 px).
 */
export function nahtBogen(umkehr: (u: number, v: number) => { p: V3; n: V3 }, vc: number, N = 256): { hin: (u: number, v: number) => number; zurueck: (u2: number, v: number) => number } {
  const tabelle = (v: number) => {
    const s = [0];
    let vor = umkehr(0, v).p;
    for (let i = 1; i <= N; i++) {
      const q = umkehr(i / N, v).p;
      s.push(s[i - 1]! + Math.hypot(q[0] - vor[0], q[1] - vor[1], q[2] - vor[2]));
      vor = q;
    }
    const L = s[N]! || 1;
    return s.map((x) => x / L);
  };
  const s0 = tabelle(0);
  const s1 = tabelle(1);
  const phi = (t: number[], u: number) => {
    const x = Math.min(1, Math.max(0, u)) * N;
    const i = Math.min(N - 1, Math.floor(x));
    return t[i]! + (x - i) * (t[i + 1]! - t[i]!);
  };
  const hin = (u: number, v: number) => {
    const w0 = v < vc ? (1 - v / vc) ** 2 : 0;
    const w1 = v > vc ? ((v - vc) / (1 - vc)) ** 2 : 0;
    return u + w0 * (phi(s0, u) - u) + w1 * (phi(s1, u) - u);
  };
  const zurueck = (u2: number, v: number) => {
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 48; i++) {
      const mid = 0.5 * (lo + hi);
      if (hin(mid, v) < u2) lo = mid;
      else hi = mid;
    }
    return 0.5 * (lo + hi);
  };
  return { hin, zurueck };
}

/** Einstellungen des Kernring-Gitters (`kernGitter`) */
export type KernGitterOptionen = {
  /** Reihen der inneren Stufe (Standard J/2, mindestens 2) */
  jInnen?: number;
  /** Runden des Ausgleichs nach Hautlängen in der äußeren Stufe (Standard 0 = gleiche Gewichte) */
  aussenRunden?: number;
  /**
   * Fächer um c: Kartenlagen der fünf Punkte U'_m, U'_{m+1}, E, D'_{m+1}, D'_m der Reihe 1 aus ihren Lagen nach der inneren
   * Stufe (`faecherKreis`); sie bleiben fest, die innere Stufe wird danach neu gerechnet
   */
  faecher?: (lagen: V3[]) => { u: number; v: number }[];
  /**
   * Nahtspeichen: nach Bogenlänge auf der Naht ('bogen', Standard) oder auf der Kartenlinie ihrer Reihe ('karte', U = u_r).
   * Nach Bogenlänge passen sie nicht zu Reihe J_i, die ganz auf ihrer Kartenlinie liegt: Wo die Karte längs der Naht ungleich
   * dehnt (Robbe hoch: Reihe J_i an der Naht bei einem Fünftel ihres U), läuft der Rand der äußeren Stufe zurück, sie ist nicht
   * mehr konvex und Zellen klappen um. Auf den Kartenlinien bleiben beide Stufen Rechtecke (Tutte faltenfrei), und die Zellen
   * an der Naht sind konform wie überall. 'bogenKarte' (E2): Kartenlinien auf einer längs der Naht nach Bogenlänge
   * umparametrisierten Karte (`nahtBogen`) — gleichmäßig auf der Naht und doch jede Stufe ein Rechteck.
   */
  naht?: 'bogen' | 'karte' | 'bogenKarte';
  /**
   * Runden des Ausgleichs der Stufennaht (E2, Standard 0): Reihe J_i gleitet auf ihrer Kartenlinie zum Mittel ihrer
   * Speichennachbarn, danach beide Stufen neu. Die Verdrehung, die der Feldrand an J-Linien verlangt, nimmt die äußere Stufe
   * harmonisch auf — gleich hinter J_i am stärksten (Rex tief J: E-Speiche dreht dort um 58°, Knick am Mundwinkel 6,6°). Ein
   * Schritt halbiert den Knick der Speichen an der Naht (4,2°); mehr Schritte lassen die Verdrehung bis an c durch (Ei tief J
   * klappt nach drei Schritten um), die Stufe bleibt aber ein Rechteck auf ihrer Kartenlinie.
   */
  nahtAusgleich?: number;
  /** Nahtpunkte auf festen Kartenlagen U (Seite 0: V = 0, Seite 1: V = 1; je die nächste Reihe außer J_i) — scharfe Punkte von A0 */
  nahtLagen?: { seite: 0 | 1; u: number }[];
};

/**
 * Fächer um den Mundwinkel als Halbkreis (E1, „Quadratgitter um c“): Die fünf Punkte der Reihe 1 um c liegen in der
 * Tangentialebene bei 90°, 45°, 0°, −45°, −90° gegen die Verlängerung des Schlitzes (`vorC` → `c`; +90° zur Oberseite, Richtung
 * `oben` − `unten`), im mittleren Abstand ihrer Lagen nach der inneren Stufe, auf die Haut gelegt; die Kartenlage kommt über
 * die Dreiecke der Karte. Die Lippe kommt von hinten (180°), die Reihen laufen symmetrisch um sie herum: c wird ein
 * regelmäßiger Gitterpunkt. Allein aus der Karte liegt der Fächer gekippt, sobald Linie oder Feldrand um c nicht symmetrisch
 * liegen: An J-Linien gibt die Karte den beiden Schlitzufern an der Spitze verschiedene V-Abstände (oben bis 2-mal so weit wie
 * unten), Knick am Mundwinkel bis 2,5° über A0 (mit dem Halbkreis höchstens 0,9°). Alles auf der Haut: `c` ist die Lage von c
 * in der Karte (U_c, V_c), nicht der Kontrollpunkt der Lippe — der liegt neben der Haut, wenn die Linie es tut (Langhals mittel
 * bis 63 px: Der Kreis um ihn faltete 19–32 Zellen). Ein Quadrat statt des Kreises (Diagonalen × √2) faltete an einer J-Linie.
 */
export function faecherKreis(netz: FeinNetz, karte: Karte, doppel: Map<number, number>, c: V3, vorC: V3, oben: V3, unten: V3): (lagen: V3[]) => { u: number; v: number }[] {
  const nrm = punktNormalen(netz);
  const nc = hautPunkt(netz, nrm, c).n;
  // x längs der Verlängerung des Schlitzes, y zur Oberseite (beide in der Tangentialebene an c)
  let tx: V3 = [c[0] - vorC[0], c[1] - vorC[1], c[2] - vorC[2]];
  const dn = tx[0] * nc[0] + tx[1] * nc[1] + tx[2] * nc[2];
  tx = [tx[0] - dn * nc[0], tx[1] - dn * nc[1], tx[2] - dn * nc[2]];
  const lx = Math.hypot(...tx);
  tx = [tx[0] / lx, tx[1] / lx, tx[2] / lx];
  let ty: V3 = [nc[1] * tx[2] - nc[2] * tx[1], nc[2] * tx[0] - nc[0] * tx[2], nc[0] * tx[1] - nc[1] * tx[0]];
  if ((oben[0] - unten[0]) * ty[0] + (oben[1] - unten[1]) * ty[1] + (oben[2] - unten[2]) * ty[2] < 0) ty = [-ty[0], -ty[1], -ty[2]];
  // Kartenlage eines Hautpunkts: Dreieck der Karte mit den Ursprungslagen seiner Punkte
  const kIdx = new Map<number, number>();
  karte.punkte.forEach((g, i) => kIdx.set(g, i));
  const kp = new Float64Array(3 * karte.punkte.length);
  karte.punkte.forEach((g, i) => {
    const o = doppel.get(g) ?? g;
    for (let d = 0; d < 3; d++) kp[3 * i + d] = netz.punkte[3 * o + d]!;
  });
  const kTri: number[][] = [];
  for (let t = 0; t < karte.dreiecke.length; t += 3) kTri.push([kIdx.get(karte.dreiecke[t]!)!, kIdx.get(karte.dreiecke[t + 1]!)!, kIdx.get(karte.dreiecke[t + 2]!)!]);
  const kNetz = feinNetz(kp, kTri);
  const winkel = [Math.PI / 2, Math.PI / 4, 0, -Math.PI / 4, -Math.PI / 2];
  return (lagen) => {
    const rho = lagen.reduce((s, p) => s + Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]), 0) / lagen.length;
    return winkel.map((w) => {
      const p = hautPunkt(netz, nrm, [c[0] + rho * (Math.cos(w) * tx[0] + Math.sin(w) * ty[0]), c[1] + rho * (Math.cos(w) * tx[1] + Math.sin(w) * ty[1]), c[2] + rho * (Math.cos(w) * tx[2] + Math.sin(w) * ty[2])]).p;
      const an = ankerVon(kNetz, p);
      const T = kNetz.dreiecke;
      const i0 = T[3 * an.dreieck]!;
      const i1 = T[3 * an.dreieck + 1]!;
      const i2 = T[3 * an.dreieck + 2]!;
      const w0 = 1 - an.b1 - an.b2;
      return { u: w0 * karte.u[i0]! + an.b1 * karte.u[i1]! + an.b2 * karte.u[i2]!, v: w0 * karte.v[i0]! + an.b1 * karte.v[i1]! + an.b2 * karte.v[i2]! };
    });
  };
}

/**
 * Hautgitter des Kernrings, in zwei Stufen, jede für sich faltenfrei (Tutte: konvexer Rand, positive Gewichte).
 * Die Karte ist konform bis auf das Seitenverhältnis a: In ζ = a·U + i·(V_c − V) liegt die Lippe auf der imaginären Achse, nahe
 * dem Schlitzende ist die Haut ∝ ζ² (ein in der Karte regelmäßiges Gitter hätte an c zwei Zellen mit 180°).
 * 1. Innen (Reihen 0 … J_i) in der um c zentrierten Auffaltung ζ' = √(ζ² − x_c), x_c = (a·U_c)² (c liegt als Faltenpunkt eine
 *    halbe Spanne hinter dem gezeichneten Mundwinkel): c ist dort der Wurzelpunkt, die Lippe samt dem Stück bis c liegt auf der
 *    imaginären Achse, seine drei Nachbarn U'_m, E, D'_m verteilen sich über 180° in ζ', auf der Haut über 360°, und die Zellen
 *    am Mundwinkel werden so groß wie die letzte Lippenspanne (beides quadriert die Haut gleich). Reihe J_i liegt fest auf der
 *    Kartenlinie U = u_{J_i}, über jeder Lippenstelle gerade (V = θ_k), der Fächer um c dazwischen mit E auf V = V_c — so ist der
 *    Rand um c symmetrisch, und ein schiefer Feldrand dreht den Fächer nicht mehr.
 * 2. Außen (Reihen J_i … J) in der Karte selbst (Koordinaten a·U, V; das Rechteck U ≥ u_{J_i} ist konvex und dort regulär): Die
 *    Speichen laufen von ihrer Lage in Reihe J_i zu ihren Randpunkten — hier nimmt das Gitter den Versatz des Feldrands auf.
 * Gleiche Gewichte in beiden Stufen (je Runde exakt, dünn besetzt: Cholesky in der Hülle); fest sind außerdem die
 * Nahtspeichen (`naht`) und auf Wunsch der Fächer um c (`faecher`).
 */
export function kernGitter(umkehrKarte: (u: number, v: number) => { p: V3; n: V3 }, uR: number[], thetaIn: Float64Array, thetaOut: Float64Array, lippe: V3[], rand: V3[], vc: number, uc: number, a: number, opt: KernGitterOptionen = {}): { u: number[][]; v: number[][]; lagen: V3[][]; umgeklappt: number } {
  // 'bogenKarte': das ganze Gitter rechnet in U' (Naht nach Bogenlänge), die Lagen kommen über U' → U aus der Karte
  const nb = opt.naht === 'bogenKarte' ? nahtBogen(umkehrKarte, vc) : null;
  const umkehr = nb ? (u: number, v: number) => umkehrKarte(nb.zurueck(u, v), v) : umkehrKarte;
  const J = uR.length - 1;
  const m = (thetaIn.length - 1) / 2;
  const S = thetaOut.length - 1;
  const M = S / 2;
  if (M !== m + 2) throw new Error(`Kernring: M = ${M}, m = ${m} (erwartet M = m + 2)`);
  if (J < 3) throw new Error(`Kernring: J = ${J} zu klein (mindestens 3: eine freie Reihe innen, eine außen)`);
  const Ji = Math.min(J - 1, Math.max(2, opt.jInnen ?? Math.round(J / 2)));
  const aussenRunden = opt.aussenRunden ?? 0;
  const xc = (a * uc) ** 2;
  // Hauptwurzel; auf der negativen reellen Achse entscheidet `seite` (Oberseite > 0)
  const wurzel = (x: number, y: number, seite: number): [number, number] => {
    const r = Math.hypot(x, y);
    const re = Math.sqrt(Math.max(0, 0.5 * (r + x)));
    const im = Math.sqrt(Math.max(0, 0.5 * (r - x)));
    return [re, y < 0 || (y === 0 && seite < 0) ? -im : im];
  };
  const nachZ = (u: number, v: number): [number, number] => {
    const zr = a * u;
    const zi = vc - v;
    return wurzel(zr * zr - zi * zi - xc, 2 * zr * zi, zi);
  };
  const ausZ = (x: number, y: number): [number, number] => {
    const z = wurzel(x * x - y * y + xc, 2 * x * y, y);
    return [z[0] / a, vc - z[1]];
  };
  const nachKarte = uR.map((u, r) => (r === 0 ? 0 : r === J ? 1 : u));
  const aufKarte = opt.naht === 'karte' || opt.naht === 'bogenKarte';
  const uOben = aufKarte ? nachKarte.slice() : nahtHoehen(umkehr, uR, 0);
  const uUnten = aufKarte ? nachKarte.slice() : nahtHoehen(umkehr, uR, 1);
  // scharfe Punkte von A0 auf der Naht: der Nahtpunkt der nächsten Reihe (nicht J_i; Abstand in U') genau auf sie
  for (const q of opt.nahtLagen ?? []) {
    const u2 = nb ? nb.hin(q.u, q.seite) : q.u;
    let r = -1;
    for (let w = 1; w < J; w++) if (w !== Ji && (r < 0 || Math.abs(uR[w]! - u2) < Math.abs(uR[r]! - u2))) r = w;
    (q.seite === 0 ? uOben : uUnten)[r] = u2;
  }
  // Knoten: Reihe 0 (Lippe) k; Reihe r ≥ 1: 2m + 1 + (r − 1)(S + 1) + k. Lage in der Karte (U, V) je Knoten.
  const n0 = 2 * m + 1;
  const id = (r: number, k: number) => (r === 0 ? k : n0 + (r - 1) * (S + 1) + k);
  const nK = n0 + J * (S + 1);
  const U = new Float64Array(nK);
  const V = new Float64Array(nK);
  const L3 = new Array<V3 | null>(nK).fill(null);
  const setze = (i: number, u: number, v: number, p?: V3) => {
    U[i] = u;
    V[i] = v;
    if (p) L3[i] = p;
  };
  for (let k = 0; k <= 2 * m; k++) setze(id(0, k), k === m ? uc : 0, k === m ? vc : thetaIn[k]!, lippe[k]!);
  for (let k = 0; k <= S; k++) setze(id(J, k), 1, thetaOut[k]!, rand[k]!);
  for (let r = 1; r < J; r++) {
    setze(id(r, 0), uOben[r]!, 0);
    setze(id(r, S), uUnten[r]!, 1);
  }
  // Reihe J_i: über den Lippenstellen gerade, der Fächer (m … M + 2) gleichmäßig zwischen der letzten Lippenstelle und V_c
  {
    const ui = uR[Ji]!;
    for (let k = 0; k <= S; k++) {
      let v: number;
      if (k < m) v = thetaIn[k]!;
      else if (k > M + 2) v = thetaIn[k - 4]!;
      else if (k <= M) v = thetaIn[m - 1]! + ((k - m + 1) / 3) * (vc - thetaIn[m - 1]!);
      else v = vc + ((k - M) / 3) * (thetaIn[m + 1]! - vc);
      if (k === 0 || k === S) continue;
      setze(id(Ji, k), ui, v);
    }
  }
  // Kanten (Lippe → Reihe 1, Reihen, Speichen) mit den Reihen ihrer Enden
  const kanten: [number, number][] = [];
  for (let k = 0; k <= m; k++) kanten.push([id(0, k), id(1, k)]);
  for (let k = m; k <= 2 * m; k++) kanten.push([id(0, k), id(1, k + 4)]);
  kanten.push([id(0, m), id(1, M)]);
  for (let r = 1; r <= J; r++) for (let k = 0; k < S; k++) kanten.push([id(r, k), id(r, k + 1)]);
  for (let r = 1; r < J; r++) for (let k = 0; k <= S; k++) kanten.push([id(r, k), id(r + 1, k)]);
  const reihe = (i: number) => (i < n0 ? 0 : Math.floor((i - n0) / (S + 1)) + 1);
  const spalte = (i: number) => (i < n0 ? -1 : (i - n0) % (S + 1));
  const gepinnt = new Set<number>();
  const frei = (i: number) => {
    const r = reihe(i);
    const k = spalte(i);
    return r > 0 && r < J && r !== Ji && k > 0 && k < S && !gepinnt.has(i);
  };
  // Tutte je Stufe in ihren Koordinaten (innen ζ', außen a·U, V), Gewicht je Kante (Index in `kanten`)
  const gewicht = new Float64Array(kanten.length).fill(1);
  const stufe = (innen: boolean) => {
    const imBereich = (i: number) => (innen ? reihe(i) <= Ji : reihe(i) >= Ji);
    const koord = (i: number): [number, number] => (innen ? nachZ(U[i]!, V[i]!) : [a * U[i]!, V[i]!]);
    const unb = new Int32Array(nK).fill(-1);
    const liste: number[] = [];
    for (let i = 0; i < nK; i++)
      if (imBereich(i) && frei(i)) {
        unb[i] = liste.length;
        liste.push(i);
      }
    const n = liste.length;
    if (!n) return;
    // Energie Σ w·|x_p − x_q|² über die Kanten der Stufe: je Kante eine Zeile (freie Enden), feste Enden in die rechte Seite
    const zeilen: NormalZeile[] = [];
    const nachbarn: number[][] = Array.from({ length: n }, () => []);
    const b0 = new Float64Array(n);
    const b1 = new Float64Array(n);
    kanten.forEach(([p, q], e) => {
      if (!imBereich(p) || !imBereich(q)) return;
      const w = gewicht[e]!;
      const i = unb[p]!;
      const j = unb[q]!;
      if (i >= 0 && j >= 0) {
        zeilen.push({ index: [i, j], wert: [1, -1], gewicht: w });
        nachbarn[i]!.push(j);
        nachbarn[j]!.push(i);
      } else if (i >= 0 || j >= 0) {
        const f = i >= 0 ? i : j;
        const z = koord(i >= 0 ? q : p);
        zeilen.push({ index: [f], wert: [1], gewicht: w });
        b0[f] = b0[f]! + w * z[0];
        b1[f] = b1[f]! + w * z[1];
      }
    });
    const sys = normalSystem(n, zeilen, nachbarn);
    const x0 = sys.loesenSpalte(b0);
    const x1 = sys.loesenSpalte(b1);
    liste.forEach((p, i) => {
      const [u, v] = innen ? ausZ(x0[i]!, x1[i]!) : [x0[i]! / a, x1[i]!];
      U[p] = u;
      V[p] = v;
    });
  };
  stufe(true);
  // Fächer um c (Reihe 1, U'_m … D'_m) fest auf seine Ziellage, die innere Stufe danach neu
  if (opt.faecher) {
    const ids = [m, m + 1, M, M + 1, M + 2].map((k) => id(1, k));
    const ziel = opt.faecher(ids.map((i) => umkehr(U[i]!, V[i]!).p));
    ids.forEach((i, q) => {
      U[i] = nb ? nb.hin(ziel[q]!.u, ziel[q]!.v) : ziel[q]!.u;
      V[i] = ziel[q]!.v;
      gepinnt.add(i);
    });
    stufe(true);
  }
  stufe(false);
  const lage3 = (i: number): V3 => L3[i] ?? umkehr(U[i]!, V[i]!).p;
  // Äußere Stufe nach Hautlängen: Die Karte staucht den Feldrand weit hinter dem Mundwinkel konform (viele Randpunkte in einem
  // schmalen V-Band); gleiche Gewichte in der Karte geben dort auf der Haut Zellen bis 50 : 1. Je Runde Gewicht ← √(alt · neu)
  // mit neu = Hautlänge / Kartenlänge (auf den Median normiert): zu lange Kanten werden schwerer und ziehen sich zusammen.
  // Positive Gewichte im konvexen Kartenrechteck — jede Runde bleibt faltenfrei (Tutte).
  for (let runde = 0; runde < aussenRunden; runde++) {
    const L = new Map<number, V3>();
    const lage = (i: number) => {
      let p = L.get(i);
      if (!p) {
        p = lage3(i);
        L.set(i, p);
      }
      return p;
    };
    const neu = new Float64Array(kanten.length).fill(Number.NaN);
    const werte: number[] = [];
    kanten.forEach(([p0, q0], e) => {
      if (reihe(p0) < Ji || reihe(q0) < Ji) return;
      const p = lage(p0);
      const q = lage(q0);
      const l3 = Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
      const l2 = Math.hypot(a * (U[p0]! - U[q0]!), V[p0]! - V[q0]!);
      if (!(l2 > 0)) return;
      neu[e] = l3 / l2;
      werte.push(l3 / l2);
    });
    werte.sort((x, y) => x - y);
    const med = werte[werte.length >> 1] || 1;
    for (let e = 0; e < kanten.length; e++) if (!Number.isNaN(neu[e]!)) gewicht[e] = Math.sqrt(gewicht[e]! * Math.min(50, Math.max(0.02, neu[e]! / med)));
    stufe(false);
  }
  // Naht der Stufen ausgleichen: Reihe J_i gleitet auf ihrer Kartenlinie zum Mittel ihrer Speichennachbarn
  for (let runde = 0; runde < (opt.nahtAusgleich ?? 0); runde++) {
    const neuV: number[] = [];
    for (let k = 1; k < S; k++) neuV.push(0.5 * (V[id(Ji - 1, k)]! + V[id(Ji + 1, k)]!));
    // monoton halten (Ordnung der Speichen) und innerhalb (0, 1)
    let vor = V[id(Ji, 0)]!;
    for (let k = 1; k < S; k++) {
      const nach = k + 1 < S ? neuV[k]! : V[id(Ji, S)]!;
      const v = Math.min(Math.max(neuV[k - 1]!, vor + 1e-6), nach - 1e-6);
      V[id(Ji, k)] = v;
      vor = v;
    }
    stufe(true);
    stufe(false);
  }
  // Prüfung: Umlaufsinn aller Hautzellen (innen in ζ', außen in der Karte)
  const zellen: number[][] = [];
  for (let k = 0; k < m; k++) zellen.push([id(0, k), id(0, k + 1), id(1, k + 1), id(1, k)]);
  zellen.push([id(0, m), id(1, M), id(1, M - 1), id(1, M - 2)]);
  zellen.push([id(0, m), id(1, M + 2), id(1, M + 1), id(1, M)]);
  for (let k = m; k < 2 * m; k++) zellen.push([id(0, k), id(0, k + 1), id(1, k + 5), id(1, k + 4)]);
  for (let r = 1; r < J; r++) for (let k = 0; k < S; k++) zellen.push([id(r, k), id(r, k + 1), id(r + 1, k + 1), id(r + 1, k)]);
  const flaeche = (z: number[]) => {
    const innen = z.every((i) => reihe(i) <= Ji);
    const P = z.map((i) => (innen ? nachZ(U[i]!, V[i]!) : ([a * U[i]!, V[i]!] as [number, number])));
    let f = 0;
    for (let i = 0; i < P.length; i++) {
      const p = P[i]!;
      const q = P[(i + 1) % P.length]!;
      f += p[0] * q[1] - q[0] * p[1];
    }
    // ζ' ist gegen (a·U, V) gespiegelt (Im ζ' ∝ V_c − V): Vorzeichen angleichen
    return innen ? f : -f;
  };
  const vorz = zellen.map(flaeche);
  const pos = vorz.filter((f) => f > 0).length;
  const umgeklappt = Math.min(pos, vorz.length - pos);
  const u: number[][] = [];
  const v: number[][] = [];
  const lagen: V3[][] = [];
  for (let r = 0; r <= J; r++) {
    const breite = r === 0 ? 2 * m : S;
    u.push(Array.from({ length: breite + 1 }, (_, k) => (nb ? nb.zurueck(U[id(r, k)]!, V[id(r, k)]!) : U[id(r, k)]!)));
    v.push(Array.from({ length: breite + 1 }, (_, k) => V[id(r, k)]!));
    lagen.push(Array.from({ length: breite + 1 }, (_, k) => lage3(id(r, k))));
  }
  return { u, v, lagen, umgeklappt };
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
  /** Gitterart: Schleifen um den Mund (A5) oder Kernring (E1, Mundwinkel als regulärer Gitterpunkt) */
  gitter?: 'schleifen' | 'kernring';
  /** Kernring: kleinste Lippenspanne am Mundwinkel in Kanten des Feldkäfigs (Standard 1 auf K1, 0,25 auf K2 — die Reihen
   * liegen am Mundwinkel so dicht, die vier Zellen um c sollen etwa gleich groß sein) */
  eckeMin?: number;
  /** Kernring: Reihen der inneren Stufe (Standard J/2, mindestens 2) */
  jInnen?: number;
  /**
   * Kernring: Fächer um c (Reihe 1, U'_m … D'_m) wie ihn die innere Stufe legt ('tutte') oder fest als Halbkreis in der
   * Tangentialebene ('kreis', `faecherKreis`). Standard auf K2: 'kreis'.
   */
  faecher?: 'tutte' | 'kreis';
  /**
   * Kernring: Nahtspeichen nach Bogenlänge auf der Naht ('bogen') oder auf der Kartenlinie ihrer Reihe ('karte', U = u_r).
   * 'bogenKarte': Kartenlinien einer längs der Naht nach Bogenlänge umparametrisierten Karte (`nahtBogen`; Standard auf K2 seit
   * E2 — an einem spitzen Schlitzanfang lagen die Reihen auf der Naht sonst weit auseinander: Robbe hoch 1,36 → 0,37 px, Rex
   * mittel 0,51 → 0,18 px).
   */
  naht?: 'bogen' | 'karte' | 'bogenKarte';
  /** Kernring: Runden des Ausgleichs der Stufennaht (`kernGitter`, Standard auf K2: 1) */
  nahtAusgleich?: number;
  /**
   * Kernring: Spitzen von A0 im Feld übernehmen (Standard auf K2: an) — auf der Naht wird der Nahtpunkt der nächsten Reihe
   * ein Punkt mit ihrer Schärfe (Robbe mittel: Haut 0,58 → 0,14 px), am Linienanfang bekommt die Lippe eine Ecke (Rex mittel:
   * die Linie beginnt an der Schnauzenspitze; Lippe 1,5 → 0,7 px).
   */
  spitzen?: boolean;
  /** Kernring: Runden des Ausgleichs nach Hautlängen in der äußeren Stufe (0 = gleiche Gewichte; Standard auf K2: 6) */
  aussenRunden?: number;
  /**
   * Kernring (E2.6, Versuch): Leiter — kreuzt eine Falte von A0 den Schlitz und läuft bis zur Naht (Rex mittel), enden die
   * Speichen der Lippenstellen zwischen Anfang und Falte auf der Naht, die Falte ist die Halssprosse (`einsatz/leiter.ts`,
   * `einsatz/leiterGitter.ts`). Ohne Fund bitgleich.
   */
  leiter?: boolean;
  /** Leiter: das Stück der Falte auf der Gegenseite auf die Speiche über P legen (Standard an; aus nur für Vergleiche) */
  leiterStueck?: boolean;
  /**
   * Stufe des Feldkäfigs über A0 (K1 = 1, K2 = 2; Standard 1). Kernring auf K2 (Standard der genauen Haut, Plan 21.10.):
   * Reihenzahl konform passend auf 10 … 16 begrenzt, Ausgleich außen 6 Runden; auf K1 wie bisher (3 … 8, ohne Ausgleich).
   */
  stufe?: 1 | 2;
  /**
   * Kernring, Lage: 'karte' (Reihen gleichmäßig in U der Karte des ganzen Halbfelds, Lippenstellen konform mit Mindestzelle
   * am Mundwinkel) oder 'band' (`einsatz/band.ts`: Lippenstellen in gleichen Abständen Δ, Innenband als Quadratgitter auf der
   * Haut, Restfeld in seiner eigenen konformen Karte ohne Spitze)
   */
  lage?: 'karte' | 'band';
  /** Lage 'band' (`einsatz/band.ts`): Ringe des Innenbands (Standard 2) und die feinen Dreiecke der rechten Hälfte von M;
   * Restfeld als dichtes Tutte-Gitter oder nach Tiefe mit der Verdrehung nach außen (Exponent p) */
  bandRinge?: number;
  bandRest?: { art: 'tutte' } | { art: 'tiefe'; p: number };
  feldDreiecke?: readonly number[];
};

/**
 * Einsatz bauen (Topologie und Startlagen). `karte` stammt aus A4 auf dem feinen Netz `netz` (Stufe L von A0 = Stufe L−1
 * von K1, gleiche Nummern), `doppel` aus dem Schnitt (A1).
 */
export function einsatzTopologie(k1: Kaefig, feld: FeldSpec, karte: Karte, netz: FeinNetz, doppel: Map<number, number>, opt: EinsatzOptionen = {}): EinsatzTopologie {
  let J = opt.J ?? 0;
  const K = opt.K ?? 5;
  const kern = opt.gitter === 'kernring';
  const M = feld.m;
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
  if (bogen.length !== 2 * M + 1) throw new Error(`Einsatz: halber Rand hat ${bogen.length - 1} Kanten, erwartet 2M = ${2 * M}`);
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
  // E2.6 Leiter: eine Falte von A0 kreuzt den Schlitz und läuft bis zur Naht — dort enden die Speichen der ersten q Lippenstellen
  // auf der Naht. Jede Sprosse spart dem Feldrand eine Speiche; damit die Speichen den Feldrand (2M + 1 Punkte) genau treffen,
  // wächst die Lippe: m = M − 2 + (q − 1)/2, q ungerade, so gewählt, dass Leiter- und Ringteil der Lippe gleich dicht sind
  const leiterFunde = (() => {
    if (!kern || opt.lage === 'band' || !opt.leiter) return [];
    const falten = leiterFalten(k1, feld, netz, karte, doppel);
    if (falten.length) return falten.slice(0, 1);
    // Keil: Feldkante wie unten (Median der Kanten des Felds)
    const kk: number[] = [];
    for (const f of feld.feld)
      for (let h = k1.fStart[f]!; h < k1.fStart[f + 1]!; h++) {
        const a = k1.fVerts[h]!;
        const b = k1.fVerts[h + 1 < k1.fStart[f + 1]! ? h + 1 : k1.fStart[f]!]!;
        kk.push(Math.hypot(k1.xyz[3 * a]! - k1.xyz[3 * b]!, k1.xyz[3 * a + 1]! - k1.xyz[3 * b + 1]!, k1.xyz[3 * a + 2]! - k1.xyz[3 * b + 2]!));
      }
    kk.sort((x, y) => x - y);
    return leiterKeile(netz, karte, doppel, kk[kk.length >> 1]!).slice(0, 1);
  })();
  const leiterQ = leiterFunde.map((f) => {
    const s = f.sHals / lippenLaenge;
    const q = Math.round((s * (M - 2.5)) / (1 - s / 2));
    return Math.max(3, q % 2 ? q : q + 1);
  });
  const m = kern ? M - 2 + leiterQ.reduce((x, q) => x + (q - 1) / 2, 0) : M;
  if (!Number.isInteger(m) || m < 2) throw new Error(`Einsatz: Lippenauflösung m = ${m} ungültig`);
  // Speichen je Seite ab Reihe 1 (ohne Leiter = M)
  const Ms = kern ? m + 2 : M;
  // Ringkarte (Halbfeld ohne Leiterfeld) und ihr Schlitzparameter τ (beide Ufer, ab P): σ ↔ τ für den Ringteil der Lippe
  const ring = leiterFunde.length
    ? (() => {
        const fund = leiterFunde[0]!;
        const rk = ringKarte(karte, netz, doppel, leiterFunde);
        const rIdx = new Map<number, number>();
        rk.punkte.forEach((g, i) => rIdx.set(g, i));
        const ufer = fund.seite === 0 ? seiteA : seiteB;
        const iP = ufer.findIndex((l) => karte.punkte[l] === fund.hals[0]);
        if (iP < 0) throw new Error('Leiter: P nicht auf dem Ufer');
        const vR = (l: number) => {
          const i = rIdx.get(karte.punkte[l]!);
          if (i === undefined) throw new Error('Leiter: Schlitzpunkt nicht in der Ringkarte');
          return rk.v[i]!;
        };
        const vcR = rk.vWinkel;
        const vA0 = vR(seiteA[iP]!);
        const vB0 = vR(seiteB[iP]!);
        const tau = sA.map((_, i) => (i < iP ? 0 : 0.5 * ((vR(seiteA[i]!) - vA0) / (vcR - vA0) + (vR(seiteB[i]!) - vB0) / (vcR - vB0))));
        tau[iP] = 0;
        tau[tau.length - 1] = 1;
        for (let i = iP + 1; i < tau.length; i++) tau[i] = Math.min(1, Math.max(tau[i]!, tau[i - 1]!));
        const bogenBeiR = (x: number) => {
          let i = iP;
          while (i + 2 < tau.length && tau[i + 1]! < x) i++;
          const dd = tau[i + 1]! - tau[i]!;
          const f = dd > 1e-15 ? Math.min(1, Math.max(0, (x - tau[i]!) / dd)) : 0;
          return sA[i]! + f * (sA[i + 1]! - sA[i]!);
        };
        return { fund, karte: rk, rIdx, sHals: sA[iP]!, iP, bogenBei: bogenBeiR, vR };
      })()
    : null;
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
  const betaK = opt.linie ? (opt.lippeKruemmung ?? (kern ? 0 : 0.5)) : 0;
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
  // Lippenstellen aus Parameterwerten τ_k (k = 0 … m)
  const stellenSetzen = (tauVon: (k: number) => number) => {
    lippeLage.length = 0;
    for (let k = 0; k <= m; k++) lippenAnteile[k] = k === m ? 1 : bogenBei(tauVon(k)) / lippenLaenge;
    for (let k = 0; k <= 2 * m; k++) {
      const kk = k <= m ? k : 2 * m - k;
      const sigma = kk === m ? lippenLaenge : lippenAnteile[kk]! * lippenLaenge;
      const st = k <= m ? stelle(seiteA, sigma) : stelle(seiteB, sigma);
      thetaIn[k] = k === 0 ? 0 : k === 2 * m ? 1 : k === m ? vc : st.v;
      lippeLage.push(st.p);
    }
    lippeLage[0]![2] = 0;
    lippeLage[2 * m]![2] = 0;
  };
  stellenSetzen((k) => k / m);
  // Haut: Gitter in der Karte (Startlage: Speichen als Mischung von θ_in und θ_out), Nahtspeichen nach Bogenlänge, dann
  // geglättet (Tutte mit Dehnungsgewichten, Rand fest → faltenfrei), Lagen über die Umkehrung der Karte
  const umkehr = kartenUmkehr(karte, netz, doppel);
  const randLagen = Array.from(bogen, (b): V3 => [netz.punkte[3 * b]!, netz.punkte[3 * b + 1]!, netz.punkte[3 * b + 2]!]);
  // Kernring: Reihenzahl konform passend (J ≈ a·m/V_c: Reihenabstand in ζ = Lippenabstand in ζ, Zellen überall Quadrate —
  // auch am Mundwinkel, wo die Haut ∝ ζ² beide Abstände quadriert)
  const aspekt = kern ? kartenSeitenverhaeltnis(karte, netz, doppel) : 1;
  // Kernring: Reihenzahl konform passend (J ≈ a·m/(2V_c(1 − V_c)): Reihenabstand in ζ = Lippenabstand in ζ). Auf K2 mindestens
  // 10 und höchstens 16 Reihen — gemessen an der ganzen Reihe: so liegt die Haut überall ≤ 0,25 px (mit 6–8 Reihen
  // drängten sich die Reihen am Schlitz, außen blieb das Gitter zu grob)
  const stufe = opt.stufe ?? 1;
  const [jMin, jMax] = stufe === 2 ? [10, 16] : [3, 8];
  if (!J) J = kern ? Math.min(jMax, Math.max(jMin, Math.round((aspekt * m) / (2 * vc * (1 - vc))))) : reihenZahl(umkehr, thetaOut, lippeLage, randLagen);
  const aussenRunden = opt.aussenRunden ?? (stufe === 2 ? 6 : 0);
  const uR = reihenHoehen(J);
  let uc = 0;
  // Kernring: Kantenlänge des Felds (Median) — Maß für die kleinste Zelle am Mundwinkel und die Zellen am Feldrand
  let kante = 0;
  let lippenAnfang: LippenAnfang = 'naht';
  let anfangSchaerfe = 0;
  // Lage nach Hautmaß: Spanne Δ der Lippe (Abstand der Kontrollpunkte, auch der ersten Reihe)
  let delta = 0;
  // E2.6: Bogenlängen der Lippenstellen (Fußpunkte) und c in der Ringkarte
  const fussSigma = new Float64Array(m + 1);
  let ringC: { umkehr: (u: number, v: number) => { p: V3; n: V3 }; vc: number; uc: number } | null = null;
  const nachBand = kern && opt.lage === 'band';
  if (kern) {
    const kanten: number[] = [];
    for (const f of feld.feld)
      for (let h = k1.fStart[f]!; h < k1.fStart[f + 1]!; h++) {
        const a = k1.fVerts[h]!;
        const b = k1.fVerts[h + 1 < k1.fStart[f + 1]! ? h + 1 : k1.fStart[f]!]!;
        kanten.push(Math.hypot(k1.xyz[3 * a]! - k1.xyz[3 * b]!, k1.xyz[3 * a + 1]! - k1.xyz[3 * b + 1]!, k1.xyz[3 * a + 2]! - k1.xyz[3 * b + 2]!));
      }
    kanten.sort((x, y) => x - y);
    kante = kanten[kanten.length >> 1]!;
    // Bogenlänge → τ (Umkehrung von bogenBei, stückweise linear)
    const tauVon = (sg: number) => {
      let i = 0;
      while (i + 2 < sA.length && sA[i + 1]! < sg) i++;
      const t = sA[i + 1]! > sA[i]! ? Math.min(1, Math.max(0, (sg - sA[i]!) / (sA[i + 1]! - sA[i]!))) : 0;
      return tauPunkte[i]! + t * (tauPunkte[i + 1]! - tauPunkte[i]!);
    };
    if (nachBand) {
      // Kontrollpunkte U₀ … U_{m−1}, c in gleichen Abständen Δ: Stellen nach Bogenlänge bei k·Δ mit Δ = L/(m − ⅓) — c liegt
      // als Faltenpunkt eine Drittelspanne hinter dem Linienende ((2U_{m−1} + 4c)/6 = Ende), |c − U_{m−1}| = Δ
      delta = lippenLaenge / (m - 1 / 3);
      stellenSetzen((k) => (k === 0 ? 0 : tauVon(k * delta)));
    } else {
      // Lippenstellen konform (gleichmäßig in τ) passen sie zu den Reihen — nahe c ist die Haut ∝ ζ², beide Abstände werden
      // quadriert. Bei großem m würden die Zellen am Mundwinkel so aber winzig (≈ 1 px), kleiner als die Dreiecke, auf denen
      // die Karte steht; dort stimmt die Abbildung nicht mehr. Deshalb wachsen die Abstände vom Linienende aus mindestens
      // geometrisch von h (`eckeMin` mal eine Kante des Feldkäfigs) mit dem Faktor 1,3 bis höchstens 0,8 der mittleren Spanne.
      // Auf K2 (Plan 21.10., E1) ist h eine Viertelkante: Die Reihen liegen am Mundwinkel dicht (konform), und die vier Zellen um
      // c müssen etwa gleich groß sein — mit einer ganzen Kante war die letzte Spanne 3- bis 20-mal so lang wie Ring 1
      // (Knick an c Ei tief J 9,4°, Langhals hoch J 14,2°; mit ¼: 4,8° und 8,0°; ganze Reihe 25 → 26 von 30 im Mundwinkel-Tor).
      // Seit E2 (Fächer als Halbkreis, A0 wie im Editor) 0,15: Die letzte Spanne war noch doppelt so lang wie der Fächerradius
      // (ρ/h 0,47 → 0,66; darunter bestimmt die konforme Lage die Spanne selbst, 0,1 ändert nichts mehr); ganze Reihe 42 → 43
      // von 43 im Mundwinkel-Tor (Birne mittel S 3,5 → 2,8° bei A0 1,3°)
      if (ring) {
        // E2.6: Leiterteil (O … P) mit q gleichen Spannen, Ringteil (P … Mundwinkel) konform in der Ringkarte mit derselben
        // Mindestzelle am Mundwinkel
        const q = leiterQ[0]!;
        const sH = ring.sHals;
        const mR = m - q;
        const LR = lippenLaenge - sH;
        const konform = Array.from({ length: mR + 1 }, (_, j) => (j === mR ? lippenLaenge : ring.bogenBei(j / mR)));
        const abstand = (h: number) => {
          const d = new Float64Array(mR + 1);
          for (let j = 1; j <= mR; j++) d[j] = Math.max(lippenLaenge - konform[mR - j]!, d[j - 1]! + Math.min(h * 1.3 ** (j - 1), (0.8 * LR) / mR));
          return d;
        };
        let h = (opt.eckeMin ?? (stufe === 2 ? 0.15 : 1)) * kante;
        for (let i = 0; i < 60 && abstand(h)[mR - 1]! >= LR * (1 - 0.5 / mR); i++) h *= 0.8;
        const d = abstand(h);
        const sigma = Array.from({ length: m + 1 }, (_, k) => (k <= q ? (k * sH) / q : k === m ? lippenLaenge : lippenLaenge - d[m - k]!));
        stellenSetzen((k) => (k === 0 ? 0 : tauVon(sigma[k]!)));
      } else {
        const konform = Array.from({ length: m + 1 }, (_, k) => (k === m ? lippenLaenge : bogenBei(k / m)));
        const abstand = (h: number) => {
          const d = new Float64Array(m + 1);
          for (let j = 1; j <= m; j++) d[j] = Math.max(lippenLaenge - konform[m - j]!, d[j - 1]! + Math.min(h * 1.3 ** (j - 1), (0.8 * lippenLaenge) / m));
          return d;
        };
        let h = (opt.eckeMin ?? (stufe === 2 ? 0.15 : 1)) * kante;
        for (let i = 0; i < 60 && abstand(h)[m - 1]! >= lippenLaenge * (1 - 0.5 / m); i++) h *= 0.8;
        const d = abstand(h);
        const sigma = Array.from({ length: m + 1 }, (_, k) => (k === 0 ? 0 : k === m ? lippenLaenge : lippenLaenge - d[m - k]!));
        stellenSetzen((k) => (k === 0 ? 0 : tauVon(sigma[k]!)));
      }
    }
  }
  if (kern) {
    // Reihe 0 ist gleich die angepasste Lippe (A6, Ende „Falte“): Kontrollpunkte P_k, V an ihrem Fußpunkt auf dem Schlitz; c
    // liegt auf der Verlängerung (V = V_c) im Hautabstand |c − Linienende| hinter dem Schlitzende (ohne Linie: eine halbe
    // letzte Spanne). Sonst legte die Lippenanpassung c erst danach um eine halbe Spanne vor, und das Gitter am Mundwinkel
    // passte nicht mehr (E lag hinter c)
    // E2.3: Spitze von A0 am Linienanfang (Rex mittel: die Linie beginnt an der Schnauzenspitze) → die Lippe hat dort eine Ecke
    if ((opt.spitzen ?? stufe === 2) && opt.linie && opt.linie.length > 1) {
      const a0 = opt.linie[0]!;
      for (let v = 0; v < k1.n; v++) {
        const sv = k1.vSchaerfe[v]!;
        if (sv > 0 && Math.hypot(k1.xyz[3 * v]! - a0[0], k1.xyz[3 * v + 1]! - a0[1], k1.xyz[3 * v + 2]! - a0[2]) < 0.5 * kante) {
          lippenAnfang = 'ecke';
          anfangSchaerfe = Math.max(anfangSchaerfe, sv);
        }
      }
    }
    const pk = opt.linie && opt.linie.length > 1 ? lippeAnpassen(opt.linie, m, lippenAnteile, { ende: 'falte', anfang: lippenAnfang }).punkte : null;
    const cSchlitz = stelle(seiteA, lippenLaenge).p;
    let cAbstand: number;
    if (pk) {
      const e = opt.linie![opt.linie!.length - 1]!;
      cAbstand = Math.hypot(pk[m]![0] - e[0], pk[m]![1] - e[1], pk[m]![2] - e[2]);
    } else {
      const a = lippeLage[m - 1]!;
      cAbstand = 0.5 * Math.hypot(cSchlitz[0] - a[0], cSchlitz[1] - a[1], cSchlitz[2] - a[2]);
    }
    const abstand = (u: number) => {
      const q2 = umkehr(u, vc).p;
      return Math.hypot(q2[0] - cSchlitz[0], q2[1] - cSchlitz[1], q2[2] - cSchlitz[2]);
    };
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 50 && cAbstand > 0; i++) {
      const mid = 0.5 * (lo + hi);
      if (abstand(mid) < cAbstand) lo = mid;
      else hi = mid;
    }
    uc = cAbstand > 0 ? 0.5 * (lo + hi) : 0;
    if (ring) {
      // c in der Ringkarte: gleicher Hautabstand hinter dem Schlitzende auf V = V_c der Ringkarte
      const umR = kartenUmkehr(ring.karte, netz, doppel);
      const vcR = ring.karte.vWinkel;
      let lo2 = 0;
      let hi2 = 1;
      for (let i = 0; i < 50 && cAbstand > 0; i++) {
        const mid = 0.5 * (lo2 + hi2);
        const q2 = umR(mid, vcR).p;
        if (Math.hypot(q2[0] - cSchlitz[0], q2[1] - cSchlitz[1], q2[2] - cSchlitz[2]) < cAbstand) lo2 = mid;
        else hi2 = mid;
      }
      ringC = { umkehr: umR, vc: vcR, uc: cAbstand > 0 ? 0.5 * (lo2 + hi2) : 0 };
    }
    if (pk) {
      // Fußpunkt auf dem Schlitz (Bogenlänge), monoton und vor dem Schlitzende
      const fuss = (p: V3) => {
        let best = 0;
        let bestD = Infinity;
        for (let i = 0; i + 1 < seiteA.length; i++) {
          const a = lage(seiteA[i]!);
          const b = lage(seiteA[i + 1]!);
          const e: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
          const l2 = e[0] * e[0] + e[1] * e[1] + e[2] * e[2];
          const t = l2 > 0 ? Math.min(1, Math.max(0, ((p[0] - a[0]) * e[0] + (p[1] - a[1]) * e[1] + (p[2] - a[2]) * e[2]) / l2)) : 0;
          const d = Math.hypot(a[0] + t * e[0] - p[0], a[1] + t * e[1] - p[1], a[2] + t * e[2] - p[2]);
          if (d < bestD) {
            bestD = d;
            best = sA[i]! + t * (sA[i + 1]! - sA[i]!);
          }
        }
        return best;
      };
      let vor = 0;
      for (let k = 1; k < m; k++) {
        const sigma = Math.min((1 - 1e-6) * lippenLaenge, Math.max(vor, fuss(pk[k]!)));
        vor = sigma;
        fussSigma[k] = sigma;
        thetaIn[k] = stelle(seiteA, sigma).v;
        thetaIn[2 * m - k] = stelle(seiteB, sigma).v;
      }
      for (let k = 0; k < m; k++) {
        lippeLage[k] = [...pk[k]!];
        lippeLage[2 * m - k] = [...pk[k]!];
      }
      lippeLage[m] = [...pk[m]!];
    } else lippeLage[m] = umkehr(uc, vc).p;
  }
  lippeLage[0]![2] = 0;
  lippeLage[2 * m]![2] = 0;
  let gitter: { u: number[][]; v: number[][]; lagen: (V3 | null)[][]; umgeklappt?: number };
  let leiterGitter: LeiterGitter | null = null;
  let stummelInfo: { kS: number; lipS: number; n: number; schaerfe: number } | null = null;
  const nahtLagen: { seite: 0 | 1; u: number }[] = [];
  const nahtSpitzen: { p: V3; s: number }[] = [];
  const nahtSpitzenIds: number[] = [];
  if (nachBand) {
    if (!opt.feldDreiecke) throw new Error('Lage „Band“: feine Dreiecke des Felds fehlen (feldDreiecke)');
    const b = bandLage(lippeLage, m, J, opt.bandRinge ?? 2, delta, netz, opt.feldDreiecke, bogen, aussenRunden, (kk, nn) => kartenSeitenverhaeltnis(kk, nn, new Map()), (kk, nn) => kartenUmkehr(kk, nn, new Map()), opt.bandRest);
    bogen = b.rand;
    gitter = { u: b.u, v: b.v, lagen: b.lagen, umgeklappt: zellenUmgeklappt(b.lagen, m, netz) };
  } else {
    // Kernring auf K2: Fächer um c als Halbkreis (E1), Nahtspeichen auf einer längs der Naht nach Bogenlänge umparametrisierten
    // Karte und ein Ausgleich der Stufennaht (E2)
    // E2.3: scharfe Punkte von A0 im Feld (alle Flächen am Punkt in M, auf der Naht): am Linienanfang U₀/D₀, sonst der
    // Nahtpunkt der nächsten Reihe (nicht J_i) genau auf ihnen
    if (kern && (opt.spitzen ?? stufe === 2)) {
      const inM = new Uint8Array(k1.nF);
      for (const f of feld.feld) inM[f] = 1;
      for (let v = 0; v < k1.n; v++) {
        const sv = k1.vSchaerfe[v]!;
        if (!(sv > 0) || Math.abs(k1.xyz[3 * v + 2]!) > 1e-9) continue;
        const fs = k1.vFlaechen.subarray(k1.vFStart[v]!, k1.vFStart[v + 1]!);
        if (!fs.length || !Array.from(fs).every((f) => inM[f])) continue;
        const ki = kIdx.get(v);
        if (ki === undefined) continue;
        const u = karte.u[ki]!;
        const vv = karte.v[ki]!;
        // am Linienanfang (U = 0): bleibt aus — die Lippe (A6) kennt dort keine Ecke (Rex mittel: Haut 0,5 → 3,8 px)
        if (u < 1e-6) continue;
        nahtLagen.push({ seite: vv < 0.5 ? 0 : 1, u });
        nahtSpitzen.push({ p: [k1.xyz[3 * v]!, k1.xyz[3 * v + 1]!, 0], s: sv });
        nahtSpitzenIds.push(v);
      }
    }
    const faecher = kern && (opt.faecher ?? (stufe === 2 ? 'kreis' : 'tutte')) === 'kreis' ? faecherKreis(netz, karte, doppel, umkehr(uc, vc).p, umkehr(0, thetaIn[m - 1]!).p, umkehr(0.5 * uc, thetaIn[m - 1]!).p, umkehr(0.5 * uc, thetaIn[m + 1]!).p) : undefined;
    const naht = opt.naht ?? (stufe === 2 ? 'bogenKarte' : 'bogen');
    const nahtAusgleich = opt.nahtAusgleich ?? (stufe === 2 ? 1 : 0);
    if (ring && ringC) {
      // E2.6: Ringfeld in der Ringkarte (L-Gitter), Leiterfeld als Coons-Fläche (`leiterGitterBauen`)
      const rk = ring.karte;
      const vRG = (g: number) => rk.v[ring.rIdx.get(g)!]!;
      // V der Lippenstellen im Ring: auf dem eigenen Ufer zwischen zwei Schlitzpunkten der Ringkarte (am Hals ab P)
      const stelleR = (seite: number[], sigma: number) => {
        let i = 0;
        while (i + 2 < sA.length && sA[i + 1]! < sigma) i++;
        const tt = sA[i + 1]! > sA[i]! ? Math.min(1, Math.max(0, (sigma - sA[i]!) / (sA[i + 1]! - sA[i]!))) : 0;
        const ga = karte.punkte[seite[i]!]!;
        const gb = karte.punkte[seite[i + 1]!]!;
        if (!ring.rIdx.has(ga)) return vRG(gb);
        return vRG(ga) + tt * (vRG(gb) - vRG(ga));
      };
      const fund = ring.fund;
      const q = leiterQ[0]!;
      const thetaInR = new Float64Array(2 * m + 1).fill(Number.NaN);
      for (let k = 0; k <= 2 * m; k++) {
        const kk = k <= m ? k : 2 * m - k;
        const inLeiter = fund.seite === 0 ? k < q : k > 2 * m - q;
        if (inLeiter) continue;
        if (k === m) thetaInR[k] = ringC.vc;
        else if (kk === 0) thetaInR[k] = k === 0 ? 0 : 1;
        else if (kk === q && (fund.seite === 0 ? k === q : k === 2 * m - q)) thetaInR[k] = fund.seite === 0 ? 0 : 1;
        else thetaInR[k] = stelleR(k < m ? seiteA : seiteB, fussSigma[kk]!);
      }
      const thetaOutR = Float64Array.from(bogen, vRG);
      const qG = fund.hals[fund.hals.length - 1]!;
      const uQ = rk.u[ring.rIdx.get(qG)!]!;
      // Naht vom Anfang O bis Q (Halbfeldkarte: obere Naht läuft vom Feldrand zu O, untere von O zum Feldrand)
      const stueck = (fund.seite === 0 ? [...karte.rand.mitteOben].reverse() : karte.rand.mitteUnten).map((l) => karte.punkte[l]!);
      const iQ = stueck.indexOf(qG);
      if (iQ < 0) throw new Error('Leiter: Q nicht auf der Naht');
      const nahtWeg = stueck.slice(0, iQ + 1).map((g): V3 => {
        const o = doppel.get(g) ?? g;
        return [netz.punkte[3 * o]!, netz.punkte[3 * o + 1]!, 0];
      });
      const rechts = (tr: number) => {
        for (let j = 0; j < 3; j++) if (netz.punkte[3 * netz.dreiecke[3 * tr + j]! + 2]! < -1e-9) return false;
        return true;
      };
      // scharfe Nahtpunkte im Ringfeld in der Ringkarte (im Leiterfeld: bleiben vorerst aus)
      const nahtLagenR: { seite: 0 | 1; u: number }[] = [];
      for (const q of nahtSpitzenIds) {
        const ri = ring.rIdx.get(q);
        if (ri !== undefined) nahtLagenR.push({ seite: rk.v[ri]! < 0.5 ? 0 : 1, u: rk.u[ri]! });
      }
      const faecherR = (opt.faecher ?? (stufe === 2 ? 'kreis' : 'tutte')) === 'kreis' ? faecherKreis(netz, rk, doppel, ringC.umkehr(ringC.uc, ringC.vc).p, ringC.umkehr(0, thetaInR[m - 1]!).p, ringC.umkehr(0.5 * ringC.uc, thetaInR[m - 1]!).p, ringC.umkehr(0.5 * ringC.uc, thetaInR[m + 1]!).p) : undefined;
      const eingabe = {
        umkehr: ringC.umkehr,
        auf: (pp: V3) => ankerVon(netz, [pp[0], pp[1], Math.max(0, pp[2])], rechts).lage,
        seite: fund.seite,
        q,
        uQ,
        naht: nahtWeg,
        uR,
        thetaIn: thetaInR,
        thetaOut: thetaOutR,
        lippe: lippeLage,
        rand: randLagen,
        vc: ringC.vc,
        uc: ringC.uc,
        aspekt: kartenSeitenverhaeltnis(rk, netz, doppel),
        opt: { aussenRunden, naht, ...(opt.jInnen ? { jInnen: opt.jInnen } : {}), ...(faecherR ? { faecher: faecherR } : {}), ...(nahtAusgleich ? { nahtAusgleich } : {}), ...(nahtLagenR.length ? { nahtLagen: nahtLagenR } : {}) },
      };
      leiterGitter = leiterGitterBauen(eingabe);
      // E2.3 a: das Stück der Falte auf der Gegenseite läuft auf der Speiche über P — ihre Punkte der Reihen 1 … n fest auf ihm
      // (gleiche Abstände wie ohne, gestreckt auf seine Länge), Punkt n an seinem Ende
      const st = opt.leiterStueck === false ? null : fund.stummel;
      if (st) {
        // Lippenstelle am Anfang des Stücks (Bogenlänge auf dem Schlitz)
        const SS = 2 * Ms;
        let kL = 0;
        for (let k = 0; k <= m; k++) if (Math.abs(lippenAnteile[k]! * lippenLaenge - st.sAnfang) < Math.abs(lippenAnteile[kL]! * lippenLaenge - st.sAnfang)) kL = k;
        const kS = fund.seite === 1 ? kL : SS - kL;
        const lipS = fund.seite === 1 ? kL : 2 * m - kL;
        const pts = st.pfad.map((g): V3 => {
          const o = doppel.get(g) ?? g;
          return [netz.punkte[3 * o]!, netz.punkte[3 * o + 1]!, netz.punkte[3 * o + 2]!];
        });
        const sSt = [0];
        for (let i = 1; i < pts.length; i++) sSt.push(sSt[i - 1]! + Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1], pts[i]![2] - pts[i - 1]![2]));
        const LSt = sSt[sSt.length - 1]!;
        const d = [0];
        let vor = lippeLage[lipS]!;
        for (let r = 1; r < J; r++) {
          const pp = leiterGitter.lagen[r]![kS]!;
          d.push(d[r - 1]! + Math.hypot(pp[0] - vor[0], pp[1] - vor[1], pp[2] - vor[2]));
          vor = pp;
        }
        let n = 1;
        for (let r = 1; r < J - 1; r++) if (Math.abs(d[r]! - LSt) < Math.abs(d[n]! - LSt)) n = r;
        const uvBei = (aa: number): [number, number] => {
          let i = 0;
          while (i + 2 < sSt.length && sSt[i + 1]! < aa) i++;
          const f = sSt[i + 1]! > sSt[i]! ? Math.min(1, Math.max(0, (aa - sSt[i]!) / (sSt[i + 1]! - sSt[i]!))) : 0;
          const ia = ring.rIdx.get(st.pfad[i]!)!;
          const ib = ring.rIdx.get(st.pfad[i + 1]!)!;
          return [rk.u[ia]! + f * (rk.u[ib]! - rk.u[ia]!), rk.v[ia]! + f * (rk.v[ib]! - rk.v[ia]!)];
        };
        const pins = [];
        for (let r = 1; r <= n; r++) {
          const [pu, pv] = uvBei((d[r]! * LSt) / d[n]!);
          pins.push({ r, k: kS, u: pu, v: pv });
        }
        leiterGitter = leiterGitterBauen({ ...eingabe, pins });
        stummelInfo = { kS, lipS, n, schaerfe: st.schaerfe };
      }
      gitter = leiterGitter;
    } else
      gitter = kern ? kernGitter(umkehr, uR, thetaIn, thetaOut, lippeLage, randLagen, vc, uc, aspekt, { aussenRunden, naht, ...(opt.jInnen ? { jInnen: opt.jInnen } : {}), ...(faecher ? { faecher } : {}), ...(nahtAusgleich ? { nahtAusgleich } : {}), ...(nahtLagen.length ? { nahtLagen } : {}) }) : hautGitter(umkehr, uR, thetaIn, thetaOut, lippeLage, randLagen, opt.glaettung ?? 'laenge', opt.winkelReihen ?? 1, opt.winkelFaktor ?? 1);
  }
  const hautLage: (V3 | null)[][] = [lippeLage];
  // Nahtpunkte je Reihe (Reihen ≥ 1): ohne Leiter k = 0 und S; mit Leiter auf der Leiterseite hinter dem Hals k = kHals ∓ 1
  const S = 2 * Ms;
  const nahtExtra = (r: number) => (leiterGitter && r > leiterGitter.t ? (leiterGitter.seite === 0 ? leiterGitter.kHals - 1 : leiterGitter.kHals + 1) : -1);
  for (let r = 1; r < J; r++) hautLage.push(gitter.lagen[r]!.map((p, k, z) => (!p ? null : k === 0 || k === z.length - 1 || k === nahtExtra(r) ? [p[0], p[1], 0] : p)));
  // Oberseite = die Seite, deren Randpunkte im Mittel höher liegen; liegt sie bei V > V_c, werden die Speichen umgedreht
  let yA = 0;
  let yB = 0;
  for (let k = 1; k < M; k++) {
    yA += k1.xyz[3 * bogen[k]! + 1]!;
    yB += k1.xyz[3 * bogen[2 * M - k]! + 1]!;
  }
  // (Lage „Band“ legt die Oberseite selbst fest: Speichen k < m auf der Seite, zu der die Lippensenkrechten nach oben zeigen)
  const umgedreht = !nachBand && yB > yA;
  const hautKarte = { u: gitter.u.map((z) => [...z]), v: gitter.v.map((z) => [...z]) };
  // Leiter nach dem Umdrehen: Seite und Halsspeiche gespiegelt (k → S − k), Lippenindex des Halses
  const leiterL = leiterGitter
    ? (() => {
        const lg = leiterGitter;
        const seite: 0 | 1 = umgedreht ? ((1 - lg.seite) as 0 | 1) : lg.seite;
        const kHals = umgedreht ? S - lg.kHals : lg.kHals;
        return { seite, kHals, q: lg.q, t: lg.t, X: lg.X, kNaht: seite === 0 ? kHals - 1 : kHals + 1 };
      })()
    : null;
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
    // mit Leiter ohne Holme (t = 0): zum Sprossenende auf der Naht
    const b = hautLage[1]![kern ? kernUeber(k, m) : k] ?? leiterL!.X[Math.max(0, Math.min(leiterL!.X.length - 1, (k <= m ? k : 2 * m - k) - 2))]!;
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
  const taschenLage: V3[][] = [hautLage[0] as V3[]];
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
  const seiteVon = (k: number, mitte = m) => (k < mitte ? SEITE_OBEN : k > mitte ? SEITE_UNTEN : SEITE_BEIDE);
  const amRand = (k: number, mitte = m) => k === 0 || k === 2 * mitte;
  const haut: number[][] = [];
  for (let r = 0; r < J; r++) {
    const mitte = r === 0 ? m : Ms;
    haut.push(hautLage[r]!.map((p, k) => (!p ? -1 : neu(p, r === 0 ? (k === m ? ROLLE_WINKEL : ROLLE_LIPPE) : ROLLE_HAUT, seiteVon(k, mitte), k, r, amRand(k, mitte) || (r > 0 && leiterL !== null && r > leiterL.t && k === leiterL.kNaht)))));
  }
  // Leiter: Sprossenenden X_2 … X_q (X_q = Q) auf der Naht
  const leiterX = leiterL ? leiterL.X.map((p, j) => neu(p, ROLLE_HAUT, leiterL.seite === 0 ? SEITE_OBEN : SEITE_UNTEN, leiterL.seite === 0 ? j + 2 : S - j - 2, leiterL.t + 1, true)) : [];
  if (leiterL) {
    // Feldrand: Reihe J beginnt auf der Leiterseite eine Speiche vor dem Hals
    const zeile = new Array<number>(S + 1).fill(-1);
    const k0 = leiterL.seite === 0 ? leiterL.kNaht : 0;
    bogen.forEach((b, j) => {
      zeile[k0 + j] = b;
    });
    haut.push(zeile);
  } else haut.push([...bogen]);
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
  const hautFlaechen: number[][] = [];
  if (kern) {
    // Kern: oben [U_k, U_{k+1}, U'_{k+1}, U'_k] (U_m = c), um den Mundwinkel [c, E, U'_{m+1}, U'_m] und [c, D'_m, D'_{m+1}, E],
    // unten [L_k, L_{k+1}, H₁,ₖ₊₅, H₁,ₖ₊₄]; dann die Ringe ab Reihe 1 (gleicher Umlauf wie die Ringzellen)
    const L0 = haut[0]!;
    const H1 = haut[1]!;
    // E2.6 Leiter: fehlende Punkte (−1) bilden keine Zelle; die Zelle an der Ecke des L ersetzt die Halszelle
    const ersetzt = (r: number, k: number) => leiterL !== null && r === leiterL.t && k === (leiterL.seite === 0 ? leiterL.kHals - 1 : leiterL.kHals);
    const voll = (f: number[]) => f.every((i) => i >= 0);
    for (let k = 0; k < m; k++) {
      const f = [L0[k]!, L0[k + 1]!, H1[k + 1]!, H1[k]!];
      if (voll(f) && !ersetzt(0, k)) hautFlaechen.push(f);
    }
    hautFlaechen.push([L0[m]!, H1[Ms]!, H1[Ms - 1]!, H1[Ms - 2]!]);
    hautFlaechen.push([L0[m]!, H1[Ms + 2]!, H1[Ms + 1]!, H1[Ms]!]);
    for (let k = m; k < 2 * m; k++) {
      const f = [L0[k]!, L0[k + 1]!, H1[k + 5]!, H1[k + 4]!];
      if (voll(f) && !ersetzt(0, k + 4)) hautFlaechen.push(f);
    }
    for (let r = 1; r < J; r++)
      for (let k = 0; k < S; k++) {
        const f = [haut[r]![k]!, haut[r]![k + 1]!, haut[r + 1]![k + 1]!, haut[r + 1]![k]!];
        if (voll(f) && !ersetzt(r, k)) hautFlaechen.push(f);
      }
    if (leiterL) {
      // Kernzellen der Leiter (Holm t → Sprossenenden) und die Halszelle; Holm 0 ist die Lippe (Lippenindex: oben k, unten k − 4)
      const { t, q, kHals, seite } = leiterL;
      const punkt = (k: number) => (t === 0 ? L0[seite === 0 ? k : k - 4]! : haut[t]![k]!);
      const X = (j: number) => (j <= 1 ? punkt(seite === 0 ? 0 : S) : leiterX[j - 2]!);
      for (let j = 1; j < q; j++) {
        if (seite === 0) hautFlaechen.push([punkt(j), punkt(j + 1), X(j + 1), X(j)]);
        else hautFlaechen.push([punkt(S - j - 1), punkt(S - j), X(j), X(j + 1)]);
      }
      const Q = leiterX[leiterX.length - 1]!;
      if (seite === 0) hautFlaechen.push([Q, punkt(kHals), haut[t + 1]![kHals]!, haut[t + 1]![kHals - 1]!]);
      else hautFlaechen.push([punkt(kHals), Q, haut[t + 1]![kHals + 1]!, haut[t + 1]![kHals]!]);
    }
  } else for (let r = 0; r < J; r++) for (let k = 0; k < 2 * m; k++) hautFlaechen.push([haut[r]![k]!, haut[r]![k + 1]!, haut[r + 1]![k + 1]!, haut[r + 1]![k]!]);
  const rechteFlaechen: number[][] = hautFlaechen.map((f) => richte(f, hautDreh));
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
  // E2.3: scharfe Punkte von A0 im Feld — der neue Nahtpunkt an ihrer Stelle, am Linienanfang U₀ und D₀
  for (const q of nahtSpitzen) {
    let best = -1;
    let bestD = Infinity;
    for (let v = nAlt; v < kaefig.n; v++) {
      if (Math.abs(xyz[3 * v + 2]!) > 1e-12) continue;
      const d = Math.hypot(xyz[3 * v]! - q.p[0], xyz[3 * v + 1]! - q.p[1]);
      if (d < bestD) {
        bestD = d;
        best = v;
      }
    }
    if (best >= 0) kaefig.vSchaerfe[best] = q.s;
  }
  if (lippenAnfang === 'ecke') {
    kaefig.vSchaerfe[haut[0]![0]!] = anfangSchaerfe;
    kaefig.vSchaerfe[haut[0]![2 * m]!] = anfangSchaerfe;
  }
  // E2.6: Falte von A0 auf dem Hals (P … Q) mit ihrer Schärfe, rechts und gespiegelt
  if (leiterL && ring && ring.fund.art === 'falte') {
    const { t, kHals, seite } = leiterL;
    const weg = [haut[0]![seite === 0 ? kHals : kHals - 4]!];
    for (let r = 1; r <= t; r++) weg.push(haut[r]![kHals]!);
    weg.push(leiterX[leiterX.length - 1]!);
    for (let i = 0; i + 1 < weg.length; i++)
      for (const [a, b] of [
        [weg[i]!, weg[i + 1]!],
        [sp(weg[i]!), sp(weg[i + 1]!)],
      ] as [number, number][]) {
        const e = kanteZwischen(kaefig, a, b);
        if (e < 0) throw new Error('Leiter: Halskante fehlt');
        kaefig.eSchaerfe[e] = ring.fund.schaerfe;
      }
  }
  if (stummelInfo) {
    // Stück der Falte auf der Speiche über P (nach dem Umdrehen gespiegelt: k → S − k, Lippenindex → 2m − Index)
    const kS = umgedreht ? S - stummelInfo.kS : stummelInfo.kS;
    const lipS = umgedreht ? 2 * m - stummelInfo.lipS : stummelInfo.lipS;
    const weg = [haut[0]![lipS]!];
    for (let r = 1; r <= stummelInfo.n; r++) weg.push(haut[r]![kS]!);
    for (let i = 0; i + 1 < weg.length; i++)
      for (const [a, b] of [
        [weg[i]!, weg[i + 1]!],
        [sp(weg[i]!), sp(weg[i + 1]!)],
      ] as [number, number][]) {
        const e = kanteZwischen(kaefig, a, b);
        if (e < 0) throw new Error('Leiter: Kante des Faltenstücks fehlt');
        kaefig.eSchaerfe[e] = stummelInfo.schaerfe;
      }
  }
  const lippe = [...haut[0]!, ...haut[0]!.slice(1, -1).map(sp).reverse()];
  for (let i = 0; i < lippe.length; i++) {
    const e = kanteZwischen(kaefig, lippe[i]!, lippe[(i + 1) % lippe.length]!);
    if (e < 0) throw new Error('Einsatz: Lippenkante fehlt');
    kaefig.eSchaerfe[e] = UNENDLICH;
  }
  // Schleifen: Mundwinkel als Ecke; Kernring: Faltenpunkt (vier Hautflächen, die Falte läuft durch c zurück)
  if (!kern) {
    kaefig.vSchaerfe[haut[0]![m]!] = UNENDLICH;
    kaefig.vSchaerfe[sp(haut[0]![m]!)] = UNENDLICH;
  }
  // Bereich je Fläche: alte Flächen (Kragen oder außen), Haut rechts/links, Tasche und Rachen
  const kragenSet = new Set(feld.kragen);
  const bereich = new Uint8Array(kaefig.nF);
  const nHautR = hautFlaechen.length;
  const nFlR = rechteFlaechen.length;
  for (let f = 0; f < kaefig.nF; f++) {
    if (f < alt.length) bereich[f] = kragenSet.has(alteFlaeche[f]!) ? 1 : 0;
    else {
      const e = f - alt.length;
      bereich[f] = e < nHautR ? 2 : e >= nFlR && e < nFlR + nHautR ? 3 : 4;
    }
  }
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
    gitter: kern ? 'kernring' : 'schleifen',
    m,
    M: Ms,
    J,
    K,
    haut,
    tasche,
    rachen,
    lippe,
    spiegel,
    rolle,
    seite,
    bereich,
    speiche,
    reihe,
    lippenAnteile,
    hautKarte,
    thetaIn,
    thetaOut,
    reihenHoehen: uR,
    taschenTiefe: tiefe,
    winkelVersatz: Math.abs(thetaOut[M]! - thetaIn[m]!),
    verloreneFalten,
    umgedreht,
    umgeklappt: gitter.umgeklappt ?? 0,
    lippenAnfang,
    stufe,
    leiter: leiterL ? { seite: leiterL.seite, q: leiterL.q, t: leiterL.t, kHals: leiterL.kHals, X: leiterX } : null,
  };
}

/** Güte der Hautvierecke der rechten Hälfte (Startlagen): kleinster Winkel (im Schleifengitter ohne den Winkel am Mundwinkel,
 * der bei einem Schlitz der Breite null 180° beträgt), größte Streckung (Mittel der gegenüberliegenden Seiten), Anzahl unter
 * 20° bzw. über 4:1. */
export function hautGuete(t: EinsatzTopologie): { winkelMin: number; seitenMax: number; unter20: number; ueber4: number } {
  const k = t.kaefig;
  const xyz = k.xyz;
  const P = (i: number): V3 => [xyz[3 * i]!, xyz[3 * i + 1]!, xyz[3 * i + 2]!];
  const c = t.gitter === 'schleifen' ? t.haut[0]![t.m]! : -1;
  let winkelMin = 180;
  let seitenMax = 0;
  let unter20 = 0;
  let ueber4 = 0;
  for (let f = 0; f < k.nF; f++) {
    if (t.bereich[f] !== 2) continue;
    const ecken = Array.from(k.fVerts.subarray(k.fStart[f]!, k.fStart[f + 1]!));
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
