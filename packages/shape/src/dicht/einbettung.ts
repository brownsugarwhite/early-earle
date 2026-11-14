// Form zuerst (08.11.2026), Verfeinern im Zug (Florian: „Netz und Linien schon während des Zugs verfeinern, Zerlegung im
// Hintergrund“): Das feinere Netz entsteht aus dem Stand beim Auslösen; bis seine Zerlegung fertig ist, wird auf dem alten
// weitergezogen. Jeder Punkt des neuen Netzes merkt sich deshalb seine Stelle auf der alten Haut (nächstes Dreieck, baryzentrisch, dazu
// der Versatz im Rahmen des Dreiecks; die neuen Punkte liegen rund, nicht in den flachen Dreiecken). Beim Einwechseln wird diese Stelle
// auf der alten Haut ausgewertet, wie sie dann ist. Gemessen und verworfen: der Versatz längs der gemittelten Normale (der Rückweg traf
// nur auf 0,009, weil der nächste Punkt senkrecht auf dem flachen Dreieck liegt).

import type { Haut } from './kurven';

/** je Punkt: Dreieck, baryzentrisch (3), Versatz im Rahmen des Dreiecks (3: längs der ersten Kante, quer in der Ebene, Normale) */
export type Einbettung = { tri: Int32Array; b: Float64Array; o: Float64Array };

/** nächster Punkt des Dreiecks (a, b, c) zu p: baryzentrische Koordinaten (Ericson, Real-Time Collision Detection 5.1.5) */
function naechsterPunkt(
  px: number,
  py: number,
  pz: number,
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
  cx: number,
  cy: number,
  cz: number,
  aus: Float64Array,
): void {
  const abx = bx - ax;
  const aby = by - ay;
  const abz = bz - az;
  const acx = cx - ax;
  const acy = cy - ay;
  const acz = cz - az;
  const apx = px - ax;
  const apy = py - ay;
  const apz = pz - az;
  const d1 = abx * apx + aby * apy + abz * apz;
  const d2 = acx * apx + acy * apy + acz * apz;
  const setze = (u: number, v: number, w: number) => {
    aus[0] = u;
    aus[1] = v;
    aus[2] = w;
  };
  if (d1 <= 0 && d2 <= 0) return setze(1, 0, 0);
  const bpx = px - bx;
  const bpy = py - by;
  const bpz = pz - bz;
  const d3 = abx * bpx + aby * bpy + abz * bpz;
  const d4 = acx * bpx + acy * bpy + acz * bpz;
  if (d3 >= 0 && d4 <= d3) return setze(0, 1, 0);
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) {
    const v = d1 / (d1 - d3);
    return setze(1 - v, v, 0);
  }
  const cpx = px - cx;
  const cpy = py - cy;
  const cpz = pz - cz;
  const d5 = abx * cpx + aby * cpy + abz * cpz;
  const d6 = acx * cpx + acy * cpy + acz * cpz;
  if (d6 >= 0 && d5 <= d6) return setze(0, 0, 1);
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) {
    const w = d2 / (d2 - d6);
    return setze(1 - w, 0, w);
  }
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
    const w = (d4 - d3) / (d4 - d3 + (d5 - d6));
    return setze(0, 1 - w, w);
  }
  const den = 1 / (va + vb + vc);
  const v = vb * den;
  const w = vc * den;
  setze(1 - v - w, v, w);
}

/** Rahmen des Dreiecks t: erste Kante, quer in der Ebene, Normale (je 3, normiert) */
function rahmen(h: Haut, t: number, r: Float64Array): void {
  const P = h.pos;
  const a = h.tri[3 * t]!;
  const b = h.tri[3 * t + 1]!;
  const c = h.tri[3 * t + 2]!;
  let ux = P[3 * b]! - P[3 * a]!;
  let uy = P[3 * b + 1]! - P[3 * a + 1]!;
  let uz = P[3 * b + 2]! - P[3 * a + 2]!;
  const vx = P[3 * c]! - P[3 * a]!;
  const vy = P[3 * c + 1]! - P[3 * a + 1]!;
  const vz = P[3 * c + 2]! - P[3 * a + 2]!;
  let nx = uy * vz - uz * vy;
  let ny = uz * vx - ux * vz;
  let nz = ux * vy - uy * vx;
  const lu = Math.hypot(ux, uy, uz) || 1;
  const ln = Math.hypot(nx, ny, nz) || 1;
  ux /= lu;
  uy /= lu;
  uz /= lu;
  nx /= ln;
  ny /= ln;
  nz /= ln;
  r[0] = ux;
  r[1] = uy;
  r[2] = uz;
  r[3] = ny * uz - nz * uy;
  r[4] = nz * ux - nx * uz;
  r[5] = nx * uy - ny * ux;
  r[6] = nx;
  r[7] = ny;
  r[8] = nz;
}

/** Lage auf der Haut: Dreieck t mit baryzentrischen b, dazu der Versatz o im Rahmen des Dreiecks */
function auswerten(h: Haut, t: number, b0: number, b1: number, b2: number, o: ArrayLike<number>, oi: number, r: Float64Array, aus: Float64Array): void {
  const P = h.pos;
  const a = h.tri[3 * t]!;
  const b = h.tri[3 * t + 1]!;
  const c = h.tri[3 * t + 2]!;
  rahmen(h, t, r);
  const o1 = o[oi]!;
  const o2 = o[oi + 1]!;
  const o3 = o[oi + 2]!;
  for (let k = 0; k < 3; k++) aus[k] = b0 * P[3 * a + k]! + b1 * P[3 * b + k]! + b2 * P[3 * c + k]! + o1 * r[k]! + o2 * r[3 + k]! + o3 * r[6 + k]!;
}

/**
 * Jeden Punkt `pos` (3 je Punkt) auf die Haut `alt` legen: nächstes Dreieck, baryzentrisch, Abstand. Mit `hinweis` (das neue Netz ist
 * aus dem alten verfeinert: je neuem Punkt seine Nachbarn, je neuem Punkt der alte, aus dem er stammt, oder −1) wird zuerst unter den
 * Dreiecken um die alten Punkte in seiner Nähe gesucht (sonst über ein Raster aller Dreiecke: 31 ms statt wenigen).
 */
export function einbetten(alt: Haut, pos: ArrayLike<number>, hinweis?: { nachbarn: readonly (readonly number[])[]; alt: Int32Array }): Einbettung {
  const P = alt.pos;
  const T = alt.tri;
  const nT = T.length / 3;
  // Dreiecke je alter Punkt
  let dreieckeVon: number[][] | null = null;
  if (hinweis) {
    dreieckeVon = Array.from({ length: alt.n }, () => []);
    for (let t = 0; t < nT; t++) for (let e = 0; e < 3; e++) dreieckeVon[T[3 * t + e]!]!.push(t);
  }
  let kante = 0;
  for (let t = 0; t < T.length; t += 3)
    kante += Math.hypot(P[3 * T[t]!]! - P[3 * T[t + 1]!]!, P[3 * T[t]! + 1]! - P[3 * T[t + 1]! + 1]!, P[3 * T[t]! + 2]! - P[3 * T[t + 1]! + 2]!);
  const zelle = Math.max(1e-6, (2 * kante) / Math.max(1, nT));
  let raster: Map<string, number[]> | null = null;
  const rasterBauen = (): Map<string, number[]> => {
    const raster = new Map<string, number[]>();
    for (let t = 0; t < nT; t++) {
      let lo = [Infinity, Infinity, Infinity];
      let hi = [-Infinity, -Infinity, -Infinity];
      for (let e = 0; e < 3; e++) {
        const v = T[3 * t + e]!;
        lo = lo.map((x, k) => Math.min(x, P[3 * v + k]!));
        hi = hi.map((x, k) => Math.max(x, P[3 * v + k]!));
      }
      for (let i = Math.floor(lo[0]! / zelle); i <= Math.floor(hi[0]! / zelle); i++)
        for (let j = Math.floor(lo[1]! / zelle); j <= Math.floor(hi[1]! / zelle); j++)
          for (let k = Math.floor(lo[2]! / zelle); k <= Math.floor(hi[2]! / zelle); k++) {
            const s = `${i},${j},${k}`;
            const l = raster.get(s);
            if (l) l.push(t);
            else raster.set(s, [t]);
          }
    }
    return raster;
  };
  const n = pos.length / 3;
  const e: Einbettung = { tri: new Int32Array(n), b: new Float64Array(3 * n), o: new Float64Array(3 * n) };
  const bc = new Float64Array(3);
  const q = new Float64Array(3);
  const r = new Float64Array(9);
  const null3 = [0, 0, 0];
  for (let v = 0; v < n; v++) {
    const px = pos[3 * v]!;
    const py = pos[3 * v + 1]!;
    const pz = pos[3 * v + 2]!;
    let best = Infinity;
    let bt = 0;
    const bb = [1, 0, 0];
    const pruefe = (t: number) => {
      const a = T[3 * t]!;
      const b = T[3 * t + 1]!;
      const cc = T[3 * t + 2]!;
      naechsterPunkt(px, py, pz, P[3 * a]!, P[3 * a + 1]!, P[3 * a + 2]!, P[3 * b]!, P[3 * b + 1]!, P[3 * b + 2]!, P[3 * cc]!, P[3 * cc + 1]!, P[3 * cc + 2]!, bc);
      const x = bc[0]! * P[3 * a]! + bc[1]! * P[3 * b]! + bc[2]! * P[3 * cc]! - px;
      const y = bc[0]! * P[3 * a + 1]! + bc[1]! * P[3 * b + 1]! + bc[2]! * P[3 * cc + 1]! - py;
      const z = bc[0]! * P[3 * a + 2]! + bc[1]! * P[3 * b + 2]! + bc[2]! * P[3 * cc + 2]! - pz;
      const dd = Math.hypot(x, y, z);
      if (dd < best) {
        best = dd;
        bt = t;
        bb[0] = bc[0]!;
        bb[1] = bc[1]!;
        bb[2] = bc[2]!;
      }
    };
    // ein alter Punkt, der geblieben ist, liegt genau auf sich selbst; sonst zuerst die Dreiecke um die alten Punkte daneben
    if (hinweis && dreieckeVon) {
      const o = hinweis.alt[v]!;
      if (o >= 0 && Math.hypot(P[3 * o]! - px, P[3 * o + 1]! - py, P[3 * o + 2]! - pz) < 1e-9 && dreieckeVon[o]!.length) {
        const t = dreieckeVon[o]![0]!;
        bt = t;
        best = 0;
        for (let k = 0; k < 3; k++) bb[k] = T[3 * t + k] === o ? 1 : 0;
      } else {
        if (o >= 0) for (const t of dreieckeVon[o]!) pruefe(t);
        for (const w of hinweis.nachbarn[v]!) {
          const ow = hinweis.alt[w]!;
          if (ow >= 0) for (const t of dreieckeVon[ow]!) pruefe(t);
        }
      }
    }
    const c = [Math.floor(px / zelle), Math.floor(py / zelle), Math.floor(pz / zelle)];
    if (!(best < 0.5 * zelle)) raster ??= rasterBauen();
    for (let r = 0; raster && r <= 8 && best > Math.max(0, r - 1) * zelle; r++)
      for (let i = c[0]! - r; i <= c[0]! + r; i++)
        for (let j = c[1]! - r; j <= c[1]! + r; j++)
          for (let k = c[2]! - r; k <= c[2]! + r; k++) {
            if (Math.max(Math.abs(i - c[0]!), Math.abs(j - c[1]!), Math.abs(k - c[2]!)) !== r) continue;
            for (const t of raster.get(`${i},${j},${k}`) ?? []) pruefe(t);
          }
    e.tri[v] = bt;
    e.b[3 * v] = bb[0]!;
    e.b[3 * v + 1] = bb[1]!;
    e.b[3 * v + 2] = bb[2]!;
    // Versatz zum nächsten Punkt im Rahmen des Dreiecks
    auswerten(alt, bt, bb[0]!, bb[1]!, bb[2]!, null3, 0, r, q);
    const dx = px - q[0]!;
    const dy = py - q[1]!;
    const dz = pz - q[2]!;
    e.o[3 * v] = dx * r[0]! + dy * r[1]! + dz * r[2]!;
    e.o[3 * v + 1] = dx * r[3]! + dy * r[4]! + dz * r[5]!;
    e.o[3 * v + 2] = dx * r[6]! + dy * r[7]! + dz * r[8]!;
  }
  return e;
}

/** Die Lagen der eingebetteten Punkte auf der Haut `alt`, wie sie jetzt ist (dieselben Dreiecke wie beim Einbetten) */
export function einbettungAuswerten(e: Einbettung, alt: Haut): Float64Array {
  const n = e.tri.length;
  const out = new Float64Array(3 * n);
  const q = new Float64Array(3);
  const r = new Float64Array(9);
  for (let v = 0; v < n; v++) {
    auswerten(alt, e.tri[v]!, e.b[3 * v]!, e.b[3 * v + 1]!, e.b[3 * v + 2]!, e.o, 3 * v, r, q);
    out[3 * v] = q[0]!;
    out[3 * v + 1] = q[1]!;
    out[3 * v + 2] = q[2]!;
  }
  return out;
}
