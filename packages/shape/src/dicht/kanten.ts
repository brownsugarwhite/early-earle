// Form zuerst (04.11.2026): gezeichnete Linien werden Kanten.
//
// Florian zeichnet eine Linie auf die Form; ihre Strichbreite (0–3 px) ist die Härte. Die Linie bleibt, wo sie gezeichnet ist:
// Sie liegt fest auf dem Körper, auf dem sie gezeichnet wurde, auch wenn der Umriss danach wandert (Florian: „… dass diese
// immer genau an Ort und Stelle bleiben, so wie es die Seitenform korrekt andeutet … oben bildet sich dann ein Kranz oder eine
// Wulst, z. B. für Augenbrauen“). Die Form wächst deshalb zur Linie: Liegt sie außerhalb des Körpers, spannt sich die Haut
// von der Linie zum Körper wie über einen Draht (die konvexe Hülle von Linie und Körper; sie reicht nie über die Linie oder
// den Umriss hinaus), liegt sie innen, senkt sich die Haut ebenso zu einer Rinne. Die Härte wirkt wie Blenders Kantenschärfe
// (Edge Crease): 3 px macht an der Linie einen richtigen Knick, 0 px eine runde Wulst (die Kuppe ist eine Kugel). Liegt die
// Linie genau auf dem Körper, wird die Form links und rechts von ihr flacher, bis beide Seiten an der Linie in einem Grat
// zusammenstoßen (den Winkel gibt die Form, die Härte macht ihn scharf bis rund). An den Enden läuft die Härte aus.

import type { V2 } from '../bezier';
import type { Kugeln } from './kugeln';
import { type UmrissPunkt, linienStuecke, punktAufStueck } from './umriss';

export type KantenPunkt = UmrissPunkt & { breite: number };
export type KantenLinie = {
  punkte: KantenPunkt[];
  /**
   * Seitenumriss beim Zeichnen: Die Linie liegt fest auf dem Körper dieses Umrisses, auch wenn der Umriss danach wandert.
   * Ohne Bezug liegt sie auf dem heutigen Körper.
   */
  bezug?: readonly UmrissPunkt[];
};
/** Eine Linie im Raum (eine Seite), zum Zeichnen: Lagen (x, y, z) und Strichbreite je Probe. */
export type Kante3D = { lagen: Float32Array; breite: Float32Array };

/** Strichbreite einer ganz scharfen Kante (px) */
export const BREITE_MAX = 3;
/** Breite der flachen Zone je Seite des Grats, als Anteil des Kugelradius unter der Linie */
const ZONE = 1.2;
/**
 * Neigung des Knicks an der Linie bei voller Härte. Das Profil t (1 − t)² bleibt nur konvex (keine Rinne neben dem Grat),
 * solange die Neigung höchstens Zone / (4 R) ist; eine Rinne dreht die Fläche am Rand kurz von der Kamera weg (dunkle
 * Kratzer im Umriss-Shader).
 */
const NEIGUNG = (0.95 * ZONE) / 4;
/** Rundung des Knicks ohne Härte, als Anteil der Zone */
const RUND = 0.35;
/** Radius der runden Kuppe einer Wulst ohne Härte, als Anteil ihrer Höhe (1: wie ein Seil, das auf dem Körper liegt) */
const KUPPE = 1;
/** Faltband an der Mittelebene, als Anteil des Abstands der Linie von ihr (s. `falten`) */
const FALTBAND = 0.3;
/**
 * Werte je Probe: Linie (x, y, z ≥ 0), Fußpunkt (x, y, z), Abstand d, Zone des Grats, Härte (an den Enden auslaufend),
 * Reichweite, Faltband, Reichweite des Grats, Härte der Kuppe (wie gesetzt)
 */
const S = 13;

// Die Linien liegen spiegelgleich auf beiden Seiten. Gerechnet wird nur mit der Seite z ≥ 0; ein Punkt wird dafür auf sie
// gefaltet, nahe der Mittelebene weich (|z| → (z² + c²) / 2c im Band |z| < c): So treffen sich die Wulst einer Linie und die
// ihres Spiegelbilds an der Mittelebene ohne Kehle.

// Ergebnis von `huelle`: Höhe über der Kugel und ihre Ableitung nach θ
let hHoehe = 0;
let hSteig = 0;

/**
 * Haut über einer Kugel (Radius R), gespannt zu einem Punkt im Abstand δ über ihr: die konvexe Hülle von Kugel und Punkt,
 * mit runder Kuppe vom Radius ρ (Hülle von Kugel und einer Kugel ρ, die den Punkt von innen berührt). Höhe über der Kugel im
 * Winkel θ (von ihrer Mitte aus, gegeben als cos θ und sin θ) neben der Richtung zum Punkt, und ihre Ableitung nach θ.
 */
function huelle(R: number, delta: number, rho: number, cosT: number, sinT: number): void {
  hHoehe = 0;
  hSteig = 0;
  const D = R + delta;
  // cos φ: Rand des Kegels, in dem die Haut die Kugel verlässt
  const Dp = D - rho;
  const cp = (R - rho) / Dp;
  if (cosT <= cp) return;
  const sp = Math.sqrt(Math.max(0, 1 - cp * cp));
  if (rho > 1e-9) {
    // Berührpunkt der Tangente an der Kuppe (Winkel θ₂); davor liegt der Punkt auf der Kuppe
    const qx = Dp + rho * cp;
    const qy = rho * sp;
    if (cosT > qx / Math.hypot(qx, qy)) {
      const w = Math.sqrt(Math.max(0, rho * rho - Dp * Dp * sinT * sinT));
      hHoehe = Dp * cosT + w - R;
      hSteig = -Dp * sinT - (w > 1e-12 ? (Dp * Dp * sinT * cosT) / w : 0);
      return;
    }
  }
  // auf der Tangente: r = R / cos(φ − θ)
  const c = cp * cosT + sp * sinT;
  const s = sp * cosT - cp * sinT;
  hHoehe = R / c - R;
  hSteig = (-R * s) / (c * c);
}

/**
 * Die Linie als Polylinie mit Abstand ≈ s und der Strichbreite je Probe; an den Enden läuft sie aus (`roh`: wie gesetzt, ohne
 * Auslaufen).
 */
export function linieAbtasten(l: KantenLinie, s: number): { p: V2[]; breite: number[]; roh: number[] } {
  const pk = l.punkte;
  if (pk.length < 2) return { p: [], breite: [], roh: [] };
  const p: V2[] = [];
  const breite: number[] = [];
  const lauf: number[] = [];
  let summe = 0;
  const st = linienStuecke(pk);
  st.forEach((k, i) => {
    const grob = Math.hypot(k[1].x - k[0].x, k[1].y - k[0].y) + Math.hypot(k[2].x - k[1].x, k[2].y - k[1].y) + Math.hypot(k[3].x - k[2].x, k[3].y - k[2].y);
    const n = Math.max(2, Math.ceil(grob / s));
    const letztes = i === st.length - 1;
    for (let j = 0; j <= (letztes ? n : n - 1); j++) {
      const q = punktAufStueck(k, j / n);
      const v = p[p.length - 1];
      if (v) summe += Math.hypot(q.x - v.x, q.y - v.y);
      p.push(q);
      lauf.push(summe);
      breite.push(pk[i]!.breite + ((pk[i + 1]!.breite - pk[i]!.breite) * j) / n);
    }
  });
  const roh = breite.slice();
  const ende = Math.min(0.2 * summe, 30);
  for (let i = 0; i < p.length; i++) {
    const t = Math.min(1, lauf[i]! / ende, (summe - lauf[i]!) / ende);
    breite[i] = breite[i]! * t * (2 - t);
  }
  return { p, breite, roh };
}

/** Reichweite einer Zone w mit Rundung: σ = √(s² + ε²) − ε erreicht w erst bei s = √((w + ε)² − ε²). */
const reichweite = (w: number, h: number): number => {
  const e = (1 - h) * RUND * w;
  return Math.sqrt((w + e) * (w + e) - e * e);
};


/**
 * Die Kugel unter jedem Punkt (Mitte x, y und Radius), über die Netznachbarn geglättet. Die Haut über einem Punkt hängt an der
 * Krümmung dort; wo der Körper von einer Kugel zur nächsten wechselt, spränge sie sonst.
 */
function kugelnJePunkt(pos: Float32Array, ind: Uint32Array, kugeln: Kugeln, durchgaenge: number): Float64Array {
  const n = pos.length / 3;
  const k = new Float64Array(3 * n);
  for (let v = 0; v < n; v++) {
    kugeln.g(pos[3 * v]!, pos[3 * v + 1]!);
    k[3 * v] = kugeln.mx;
    k[3 * v + 1] = kugeln.my;
    k[3 * v + 2] = kugeln.mr;
  }
  const summe = new Float64Array(3 * n);
  const zahl = new Float64Array(n);
  for (let d = 0; d < durchgaenge; d++) {
    summe.set(k);
    zahl.fill(1);
    for (let t = 0; t < ind.length; t += 3) {
      for (let e = 0; e < 3; e++) {
        const p = ind[t + e]!;
        const q = ind[t + ((e + 1) % 3)]!;
        for (let i = 0; i < 3; i++) {
          summe[3 * p + i] = summe[3 * p + i]! + k[3 * q + i]!;
          summe[3 * q + i] = summe[3 * q + i]! + k[3 * p + i]!;
        }
        zahl[p] = zahl[p]! + 1;
        zahl[q] = zahl[q]! + 1;
      }
    }
    for (let v = 0; v < n; v++) {
      for (let i = 0; i < 3; i++) k[3 * v + i] = summe[3 * v + i]! / zahl[v]!;
    }
  }
  return k;
}

/**
 * Macht aus den Linien Kanten. `bezug` je Linie: der Körper, auf dem sie liegt (der des Umrisses beim Zeichnen). Jeder Punkt
 * nahe der Linie rückt längs seiner Normalen auf die Haut, die sich von der Linie zum Körper spannt (Wulst oder Rinne), und
 * mit Härte an den Seiten flacher (Grat); seine Normale kippt mit der Steigung. Gibt die Linien an Ort und Stelle zum
 * Zeichnen zurück (beide Seiten).
 */
export function kantenAnwenden(
  pos: Float32Array,
  nor: Float32Array,
  ind: Uint32Array,
  linien: readonly KantenLinie[],
  kugeln: Kugeln,
  zelle: number,
  bezug: readonly Kugeln[] = [],
  /** je Punkt: wie weit die Haut ihn von der Form abgehoben hat (Wulst oder Rinne), wird hier gefüllt */
  hub?: Float32Array,
): Kante3D[] {
  const kanten: Kante3D[] = [];
  const pr: number[] = [];
  // die Probe ist mit der nächsten verbunden (Strecke der Linie)
  const weiter: boolean[] = [];
  let abseits = false;
  linien.forEach((l, li) => {
    const ref = bezug[li] ?? kugeln;
    const { p, breite, roh } = linieAbtasten(l, zelle / 2);
    if (p.length < 2) return;
    const lagen = new Float32Array(3 * p.length);
    p.forEach((q, i) => {
      // die Linie an Ort und Stelle: auf dem Körper beim Zeichnen, außerhalb von ihm auf der Mittelebene
      const g = ref.g(q.x, q.y);
      lagen[3 * i] = q.x;
      lagen[3 * i + 1] = q.y;
      lagen[3 * i + 2] = g > 0 ? Math.sqrt(g) : 0;
    });
    // für die Form reicht jede zweite Probe (die Strecken dazwischen werden genau gerechnet)
    const auswahl: number[] = [];
    for (let i = 0; i < p.length; i += 2) auswahl.push(i);
    if (auswahl[auswahl.length - 1] !== p.length - 1) auswahl.push(p.length - 1);
    auswahl.forEach((i, k) => {
      const lx = lagen[3 * i]!;
      const ly = lagen[3 * i + 1]!;
      const z = lagen[3 * i + 2]!;
      // Fußpunkt: der nächste Punkt des heutigen Körpers, d = Abstand der Linie zu ihm
      const d = kugeln.abstand(lx, ly, z);
      const R = kugeln.mr;
      const ax = lx - kugeln.mx;
      const ay = ly - kugeln.my;
      const r = Math.hypot(ax, ay, z);
      const f = r > 1e-9 ? R / r : 0;
      const wr = ZONE * R;
      const h = Math.min(1, breite[i]! / BREITE_MAX);
      const ad = Math.abs(d);
      if (ad > 1e-6) abseits = true;
      // so weit reicht die Haut von der Linie (bis zu den Tangentenpunkten, mit Spielraum für andere Kugeln daneben)
      const haut = ad > 1e-6 ? 1.5 * Math.sqrt((R + ad) ** 2 - R * R) + ad + 2 * zelle : 0;
      const grat = reichweite(wr, h);
      // die Kuppe der Wulst folgt der gesetzten Strichdicke (das Auslaufen an den Enden gilt nur dem Grat)
      const hKuppe = Math.min(1, roh[i]! / BREITE_MAX);
      pr.push(lx, ly, z, kugeln.mx + ax * f, kugeln.my + ay * f, z * f, d, wr, h, Math.max(grat, haut), FALTBAND * z, grat, hKuppe);
      weiter.push(k + 1 < auswahl.length);
    });
    const spiegel = lagen.slice();
    for (let i = 2; i < spiegel.length; i += 3) spiegel[i] = -spiegel[i]!;
    const br = new Float32Array(breite);
    kanten.push({ lagen, breite: br }, { lagen: spiegel, breite: br });
  });
  const np = pr.length / S;
  if (np === 0) return kanten;
  // die Kugel unter jedem Punkt (nur nötig, wenn eine Linie neben dem Körper liegt)
  const kp = abseits ? kugelnJePunkt(pos, ind, kugeln, 4) : null;
  // auch eine harte Kuppe ist über etwa eine Rasterzelle gerundet: Ein schärferer Grat liefe im Zickzack über das Netz
  const rhoMin = 1.5 * zelle;

  // Raster über die Fußpunkte (Zelle = größte Reichweite samt längster Strecke)
  let rMax = 0;
  let sMax = 0;
  let bx0 = Infinity;
  let by0 = Infinity;
  let bz0 = Infinity;
  for (let k = 0; k < np; k++) {
    rMax = Math.max(rMax, pr[S * k + 9]!);
    if (weiter[k]) {
      sMax = Math.max(sMax, Math.hypot(pr[S * k + S]! - pr[S * k]!, pr[S * k + S + 1]! - pr[S * k + 1]!, pr[S * k + S + 2]! - pr[S * k + 2]!));
      sMax = Math.max(sMax, Math.hypot(pr[S * k + S + 3]! - pr[S * k + 3]!, pr[S * k + S + 4]! - pr[S * k + 4]!, pr[S * k + S + 5]! - pr[S * k + 5]!));
    }
    bx0 = Math.min(bx0, pr[S * k + 3]!);
    by0 = Math.min(by0, pr[S * k + 4]!);
    bz0 = Math.min(bz0, pr[S * k + 5]!);
  }
  const e = rMax + sMax + 1e-6;
  bx0 -= e;
  by0 -= e;
  bz0 -= e;
  const raster = new Map<number, number[]>();
  for (let k = 0; k < np; k++) {
    const i = Math.floor((pr[S * k + 3]! - bx0) / e);
    const j = Math.floor((pr[S * k + 4]! - by0) / e);
    const kk = Math.floor((pr[S * k + 5]! - bz0) / e);
    const key = i + 1001 * (j + 1001 * kk);
    let liste = raster.get(key);
    if (!liste) raster.set(key, (liste = []));
    liste.push(k);
  }

  const n = pos.length / 3;
  for (let v = 0; v < n; v++) {
    const x = pos[3 * v]!;
    const y = pos[3 * v + 1]!;
    const z = pos[3 * v + 2]!;
    const za = Math.abs(z);
    const vz = z < 0 ? -1 : 1;
    const i0 = Math.floor((x - bx0) / e);
    const j0 = Math.floor((y - by0) / e);
    const k0 = Math.floor((za - bz0) / e);
    // die Kugel unter dem Punkt: Mitte geglättet, Radius so, dass sie genau durch den Punkt geht (sonst höbe die Haut ihn um
    // seinen Abstand zur Kugel zu weit)
    let cx = 0;
    let cy = 0;
    let R: number;
    if (kp) {
      cx = kp[3 * v]!;
      cy = kp[3 * v + 1]!;
      R = Math.hypot(x - cx, y - cy, z);
    } else {
      kugeln.g(x, y);
      R = kugeln.mr;
    }
    // Grat: der nächste Punkt auf den Fußlinien; Ableitung des Abstands nach dem Punkt
    let best = Infinity;
    let bk = -1;
    let bt = 0;
    let nsx = 0;
    let nsy = 0;
    let nsz = 0;
    // Haut zur Linie: höchste Wulst und tiefste Rinne über alle Strecken (die Hülle der ganzen Linie), samt Steigung
    let auf = 0;
    let ax2 = 0;
    let ay2 = 0;
    let az2 = 0;
    let ab = 0;
    let bx2 = 0;
    let by2 = 0;
    let bz2 = 0;
    for (let dk = -1; dk <= 1; dk++) {
      for (let dj = -1; dj <= 1; dj++) {
        for (let di = -1; di <= 1; di++) {
          const i = i0 + di;
          const j = j0 + dj;
          const k = k0 + dk;
          if (i < 0 || j < 0 || k < 0 || i > 1000 || j > 1000 || k > 1000) continue;
          const liste = raster.get(i + 1001 * (j + 1001 * k));
          if (!liste) continue;
          for (const q of liste) {
            const o = S * q;
            // auf die Seite z ≥ 0 gefaltet
            const c = pr[o + 10]!;
            const zf = za < c ? (za * za + c * c) / (2 * c) : za;
            const dzf = za < c ? za / c : 1;
            const grenze = pr[o + 9]! + sMax;
            const ex = x - pr[o + 3]!;
            const ey = y - pr[o + 4]!;
            const ez = zf - pr[o + 5]!;
            const e2 = ex * ex + ey * ey + ez * ez;
            if (e2 > grenze * grenze) continue;
            const o1 = weiter[q] ? o + S : o;

            // nächster Punkt der Fußstrecke (für den Grat, nur in seiner Reichweite)
            const gr = pr[o + 11]! + sMax;
            if (e2 < gr * gr) {
              const fux = pr[o1 + 3]! - pr[o + 3]!;
              const fuy = pr[o1 + 4]! - pr[o + 4]!;
              const fuz = pr[o1 + 5]! - pr[o + 5]!;
              const fuu = fux * fux + fuy * fuy + fuz * fuz;
              const t = fuu > 1e-12 ? Math.max(0, Math.min(1, (ex * fux + ey * fuy + ez * fuz) / fuu)) : 0;
              const dx = ex - t * fux;
              const dy = ey - t * fuy;
              const dz = ez - t * fuz;
              const d2 = dx * dx + dy * dy + dz * dz;
              if (d2 < best) {
                best = d2;
                bk = q;
                bt = t;
                const s = Math.sqrt(d2);
                nsx = s > 1e-9 ? dx / s : 0;
                nsy = s > 1e-9 ? dy / s : 0;
                nsz = s > 1e-9 ? (dz / s) * dzf * vz : 0;
              }
            }

            // Haut zur Linienstrecke über der Kugel unter dem Punkt: Der Punkt der Strecke, der dem Strahl aus der
            // Kugelmitte durch den Punkt am nächsten liegt, ist die Spitze; Höhe und Steigung aus der Hülle von Kugel und
            // Spitze (mit runder Kuppe)
            const dU = pr[o + 6]!;
            const dV = pr[o1 + 6]!;
            if ((dU === 0 && dV === 0) || !kp) continue;
            const pax = x - cx;
            const pay = y - cy;
            const pl = Math.hypot(pax, pay, zf);
            if (pl < 1e-9) continue;
            const uax = pax / pl;
            const uay = pay / pl;
            const uaz = zf / pl;
            // die Kugel durch den (gefalteten) Punkt
            const rk = pl;
            const Ex = pr[o]! - cx;
            const Ey = pr[o + 1]! - cy;
            const Ez = pr[o + 2]!;
            // schnell: weit außerhalb des Kegels, in dem die Haut zur Probe die Kugel verlässt?
            const D0 = Math.hypot(Ex, Ey, Ez);
            const g0 = Math.abs(D0 - rk);
            if (g0 < 1e-9) continue;
            const kegel = (rk - Math.min(0.9 * rk, g0)) / (rk + g0 - Math.min(0.9 * rk, g0));
            if (Ex * uax + Ey * uay + Ez * uaz < (kegel - (sMax + rhoMin) / D0 - 0.05) * D0) continue;
            const Wx = pr[o1]! - pr[o]!;
            const Wy = pr[o1 + 1]! - pr[o + 1]!;
            const Wz = pr[o1 + 2]! - pr[o + 2]!;
            const ea = Ex * uax + Ey * uay + Ez * uaz;
            const wa = Wx * uax + Wy * uay + Wz * uaz;
            const nenner = Wx * Wx + Wy * Wy + Wz * Wz - wa * wa;
            const tl = nenner > 1e-12 ? Math.max(0, Math.min(1, (ea * wa - (Ex * Wx + Ey * Wy + Ez * Wz)) / nenner)) : 0;
            const bxx = Ex + tl * Wx;
            const byy = Ey + tl * Wy;
            const bzz = Ez + tl * Wz;
            const D = Math.hypot(bxx, byy, bzz);
            const dL = dU + tl * (dV - dU);
            const hL = pr[o + 12]! + tl * (pr[o1 + 12]! - pr[o + 12]!);
            // Achse der Hülle (aus der Kugelmitte zur Spitze bzw. zur Mitte der Kuppe), Höhe ihres äußersten Punkts über der
            // Kugel, Radius der Kuppe. Außen eine Wulst; innen eine Rinne, so tief, wie die Linie unter der Haut liegt.
            let axx = bxx;
            let axy = byy;
            let axz = bzz;
            let aD = D;
            let delta: number;
            if (dL > 0) {
              delta = D - rk;
              if (!(delta > 0)) continue;
            } else {
              delta = Math.min(rk - D, -dL);
              if (!(delta > 0)) continue;
            }
            // Kuppe höchstens halb so dick wie der Körper darunter: Eine hohe weiche Wulst wird ein Kamm mit runder Kuppe,
            // kein Ball, so groß wie der Kopf
            const rho = Math.min(0.5 * rk, Math.max(rhoMin, (1 - hL) * KUPPE * delta));
            if (dL > 0) {
              // Mitte der runden Kuppe: von der Linie aus nach innen, in der Seite quer zur Linie und fast in der Seitenebene —
              // so ragt die Kuppe in der Seite nicht über die gezeichnete Linie hinaus, und die Haut geht weiter genau durch die
              // Linie. Läuft die Linie in der Seite auf den Körper zu statt an ihm entlang, nach innen zur Kugelmitte.
              const bxy = Math.hypot(bxx, byy);
              let qx = bxy > 1e-9 ? bxx / bxy : 0;
              let qy = bxy > 1e-9 ? byy / bxy : 0;
              const wl = Math.hypot(Wx, Wy);
              if (wl > 1e-9) {
                let nx2 = -Wy / wl;
                let ny2 = Wx / wl;
                const s = nx2 * qx + ny2 * qy;
                if (s < 0) {
                  nx2 = -nx2;
                  ny2 = -ny2;
                }
                const a = Math.abs(s);
                qx = a * nx2 + (1 - a) * qx;
                qy = a * ny2 + (1 - a) * qy;
                const ql = Math.hypot(qx, qy) || 1;
                qx /= ql;
                qy /= ql;
              }
              const mx = (qx * bxy) / D;
              const my = (qy * bxy) / D;
              const mz = (bzz / D) ** 3;
              const ml = Math.hypot(mx, my, mz) || 1;
              axx = bxx - (rho * mx) / ml;
              axy = byy - (rho * my) / ml;
              axz = bzz - (rho * mz) / ml;
              aD = Math.hypot(axx, axy, axz);
              delta = aD + rho - rk;
              if (!(delta > 0)) continue;
            }
            const cosT = Math.max(-1, Math.min(1, (axx * uax + axy * uay + axz * uaz) / aD));
            const sinT = Math.sqrt(Math.max(0, 1 - cosT * cosT));
            huelle(rk, delta, rho, cosT, sinT);
            const hoehe = hHoehe;
            if (hoehe <= 0) continue;
            // Ableitung von θ nach dem (gefalteten) Punkt: −(b̂ − cos θ â) / (|a| sin θ); die Höhe wächst zur Linie hin
            let gx = 0;
            let gy = 0;
            let gz = 0;
            if (sinT > 1e-9) {
              const fak = -hSteig / (pl * sinT);
              gx = fak * (axx / aD - cosT * uax);
              gy = fak * (axy / aD - cosT * uay);
              gz = fak * (axz / aD - cosT * uaz) * dzf * vz;
            }
            if (dL > 0) {
              if (hoehe > auf) {
                auf = hoehe;
                ax2 = gx;
                ay2 = gy;
                az2 = gz;
              }
            } else if (hoehe > ab) {
              ab = hoehe;
              bx2 = gx;
              by2 = gy;
              bz2 = gz;
            }
          }
        }
      }
    }
    if (bk < 0 && auf === 0 && ab === 0) continue;
    let gx = ax2 - bx2;
    let gy = ay2 - by2;
    let gz = az2 - bz2;

    // Grat (nur mit Härte) an der nächsten Linie: an den Seiten flacher, an der Linie ein Knick; ohne Härte rund
    let tiefe = 0;
    if (bk >= 0) {
      const s = Math.sqrt(best);
      const o = S * bk;
      const o1 = weiter[bk] ? o + S : o;
      const wr = pr[o + 7]! + bt * (pr[o1 + 7]! - pr[o + 7]!);
      const h = pr[o + 8]! + bt * (pr[o1 + 8]! - pr[o + 8]!);
      const er = (1 - h) * RUND * wr;
      const qr = Math.hypot(s, er);
      const tr = (qr - er) / wr;
      if (tr < 1 && h > 0 && qr > 1e-12) {
        const ar = NEIGUNG * wr;
        tiefe = ar * h * tr * (1 - tr) * (1 - tr);
        // Steigung längs s: a h (1 − t)(1 − 3t) / w · dσ/ds
        const steig = ((ar * h * (1 - tr) * (1 - 3 * tr)) / wr) * (s / qr);
        gx -= steig * nsx;
        gy -= steig * nsy;
        gz -= steig * nsz;
      }
    }

    const delta = auf - ab - tiefe;
    if (hub) hub[v] = auf + ab;
    if (delta === 0 && gx === 0 && gy === 0 && gz === 0) continue;
    const nx = nor[3 * v]!;
    const ny = nor[3 * v + 1]!;
    const nz = nor[3 * v + 2]!;
    pos[3 * v] = x + delta * nx;
    pos[3 * v + 1] = y + delta * ny;
    pos[3 * v + 2] = z + delta * nz;
    // die Normale kippt gegen die Steigung (in der Tangentialebene); die versetzte Fläche ist um (R + Δ) / R gedehnt
    const gn = gx * nx + gy * ny + gz * nz;
    const dehnung = Math.max(0.2, 1 + delta / Math.max(R, 1e-6));
    const mx = nx - (gx - gn * nx) / dehnung;
    const my = ny - (gy - gn * ny) / dehnung;
    const mz = nz - (gz - gn * nz) / dehnung;
    const ml = Math.hypot(mx, my, mz) || 1;
    nor[3 * v] = mx / ml;
    nor[3 * v + 1] = my / ml;
    nor[3 * v + 2] = mz / ml;
  }
  return kanten;
}
