// Form zuerst (04.11.2026): gezeichnete Linien werden Kanten.
//
// Florian zeichnet eine Linie auf die Form; ihre Strichbreite (0–3 px) ist die Härte. Die Linie bleibt, wo sie gezeichnet
// ist, und links und rechts von ihr wird die runde Form flacher, bis beide Seiten an der Linie in einem Grat zusammenstoßen.
// Den Winkel gibt die Form: Die flache Zone ist so breit wie ein Teil der Kugel unter der Linie (am dicken Bauch breit, am
// dünnen Hals schmal), und ein Kreisbogen, der über diese Zone flach gezogen wird, knickt an der Linie. Die Härte macht den
// Knick scharf (3 px) bis rund (1 px); 0 px ist eine weiche Linie ohne Kante. An den Enden läuft die Kante aus.

import type { V2 } from '../bezier';
import type { Kugeln } from './kugeln';
import { type UmrissPunkt, linienStuecke, punktAufStueck } from './umriss';

export type KantenPunkt = UmrissPunkt & { breite: number };
export type KantenLinie = { punkte: KantenPunkt[] };
/** Eine Linie auf dem Körper (eine Seite), zum Zeichnen: Lagen (x, y, z) und Strichbreite je Probe. */
export type Kante3D = { lagen: Float32Array; breite: Float32Array };

/** Strichbreite einer ganz scharfen Kante (px) */
export const BREITE_MAX = 3;
/** Breite der flachen Zone je Seite, als Anteil des Kugelradius unter der Linie */
const ZONE = 1.2;
/**
 * Neigung des Knicks an der Linie bei voller Härte. Das Profil t (1 − t)² bleibt nur konvex (keine Rinne neben dem Grat),
 * solange die Neigung höchstens Zone / (4 R) ist; eine Rinne dreht die Fläche am Rand kurz von der Kamera weg (dunkle
 * Kratzer im Umriss-Shader).
 */
const NEIGUNG = (0.95 * ZONE) / 4;

/** Die Linie als Polylinie mit Abstand ≈ s und der Strichbreite je Probe; an den Enden läuft sie aus. */
export function linieAbtasten(l: KantenLinie, s: number): { p: V2[]; breite: number[] } {
  const pk = l.punkte;
  if (pk.length < 2) return { p: [], breite: [] };
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
  const ende = Math.min(0.2 * summe, 30);
  for (let i = 0; i < p.length; i++) {
    const t = Math.min(1, lauf[i]! / ende, (summe - lauf[i]!) / ende);
    breite[i] = breite[i]! * t * (2 - t);
  }
  return { p, breite };
}

/**
 * Macht aus den Linien Kanten: Punkte in der Zone um jede Linie rücken längs der Normalen nach innen, an der Linie selbst
 * nicht, und ihre Normalen kippen mit dem Profil. Gibt die Linien auf dem Körper zum Zeichnen zurück (beide Seiten).
 */
export function kantenAnwenden(pos: Float32Array, nor: Float32Array, linien: readonly KantenLinie[], kugeln: Kugeln, zelle: number): Kante3D[] {
  const kanten: Kante3D[] = [];
  // Proben der Kanten auf dem Körper: Lage, Zonenbreite w, Tiefe a, Härte h
  const pr: number[] = [];
  for (const l of linien) {
    const { p, breite } = linieAbtasten(l, zelle / 2);
    for (const seite of [1, -1]) {
      let lagen: number[] = [];
      let br: number[] = [];
      const schliessen = () => {
        if (lagen.length >= 6) kanten.push({ lagen: new Float32Array(lagen), breite: new Float32Array(br) });
        lagen = [];
        br = [];
      };
      p.forEach((q, i) => {
        const g = kugeln.g(q.x, q.y);
        if (!(g > 0)) {
          schliessen();
          return;
        }
        const z = seite * Math.sqrt(g);
        lagen.push(q.x, q.y, z);
        br.push(breite[i]!);
        const h = Math.min(1, breite[i]! / BREITE_MAX);
        if (h < 0.02) return;
        const w = ZONE * kugeln.mr;
        pr.push(q.x, q.y, z, w, NEIGUNG * w, h);
      });
      schliessen();
    }
  }
  const np = pr.length / 6;
  if (np === 0) return kanten;

  // Raster über die Proben (Zelle = größte Zone)
  let wMax = 0;
  let bx0 = Infinity;
  let by0 = Infinity;
  let bz0 = Infinity;
  for (let k = 0; k < np; k++) {
    wMax = Math.max(wMax, pr[6 * k + 3]!);
    bx0 = Math.min(bx0, pr[6 * k]!);
    by0 = Math.min(by0, pr[6 * k + 1]!);
    bz0 = Math.min(bz0, pr[6 * k + 2]!);
  }
  bx0 -= wMax;
  by0 -= wMax;
  bz0 -= wMax;
  const zk = (x: number, y: number, z: number) => {
    const i = Math.floor((x - bx0) / wMax);
    const j = Math.floor((y - by0) / wMax);
    const k = Math.floor((z - bz0) / wMax);
    return i < 0 || j < 0 || k < 0 || i > 1000 || j > 1000 || k > 1000 ? -1 : i + 1001 * (j + 1001 * k);
  };
  const raster = new Map<number, number[]>();
  for (let k = 0; k < np; k++) {
    const key = zk(pr[6 * k]!, pr[6 * k + 1]!, pr[6 * k + 2]!);
    let liste = raster.get(key);
    if (!liste) raster.set(key, (liste = []));
    liste.push(k);
  }

  // Punkte in der Zone nach innen rücken; die Normale kippt um die Steigung des Profils von der Linie weg (genau statt aus
  // dem Netz: Netznormalen rauschen auf Rastergröße und zacken die Farbstufen)
  const n = pos.length / 3;
  for (let v = 0; v < n; v++) {
    const x = pos[3 * v]!;
    const y = pos[3 * v + 1]!;
    const z = pos[3 * v + 2]!;
    const i0 = Math.floor((x - bx0) / wMax);
    const j0 = Math.floor((y - by0) / wMax);
    const k0 = Math.floor((z - bz0) / wMax);
    let best = Infinity;
    let bk = -1;
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
            const dx = x - pr[6 * q]!;
            const dy = y - pr[6 * q + 1]!;
            const dz = z - pr[6 * q + 2]!;
            const d2 = dx * dx + dy * dy + dz * dz;
            if (d2 < best) {
              best = d2;
              bk = q;
            }
          }
        }
      }
    }
    if (bk < 0) continue;
    const s = Math.sqrt(best);
    const w = pr[6 * bk + 3]!;
    if (s >= w) continue;
    const a = pr[6 * bk + 4]!;
    const h = pr[6 * bk + 5]!;
    // runder Knick bei weicher Kante, scharfer bei voller Härte
    const eps = (1 - h) * 0.35 * w;
    const wurzel = Math.sqrt(s * s + eps * eps);
    const sigma = wurzel - eps;
    const t = Math.min(1, sigma / w);
    const tiefe = a * h * t * (1 - t) * (1 - t);
    // Steigung des Profils längs s: d tiefe / ds = a h (1 − t)(1 − 3t) / w · dσ/ds
    const steigung = t >= 1 ? 0 : ((a * h * (1 - t) * (1 - 3 * t)) / w) * (wurzel > 1e-12 ? s / wurzel : 1);
    const nx = nor[3 * v]!;
    const ny = nor[3 * v + 1]!;
    const nz = nor[3 * v + 2]!;
    pos[3 * v] = x - tiefe * nx;
    pos[3 * v + 1] = y - tiefe * ny;
    pos[3 * v + 2] = z - tiefe * nz;
    // Richtung von der Linie weg, in der Tangentialebene
    let ux = x - pr[6 * bk]!;
    let uy = y - pr[6 * bk + 1]!;
    let uz = z - pr[6 * bk + 2]!;
    const un = ux * nx + uy * ny + uz * nz;
    ux -= un * nx;
    uy -= un * ny;
    uz -= un * nz;
    const ul = Math.hypot(ux, uy, uz);
    if (ul < 1e-9) continue;
    const mx = nx + (steigung * ux) / ul;
    const my = ny + (steigung * uy) / ul;
    const mz = nz + (steigung * uz) / ul;
    const ml = Math.hypot(mx, my, mz) || 1;
    nor[3 * v] = mx / ml;
    nor[3 * v + 1] = my / ml;
    nor[3 * v + 2] = mz / ml;
  }
  return kanten;
}
