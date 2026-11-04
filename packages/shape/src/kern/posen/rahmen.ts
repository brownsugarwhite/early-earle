// Posen (Plan Teil B, B2) und Werkzeug-Harmonie (Teil H): Zellbasis je Käfigpunkt — Tangente zum ersten Nachbarn,
// Binormale, Normale, skaliert mit der mittleren Kantenlänge. Pose-Deltas (und später das Pinsel-Relief) stehen in dieser
// Basis: Ändert sich die Grundform, strecken und drehen sie mit der Fläche, statt als feste Weltversätze stehen zu bleiben.
// Bei gleicher Topologie ist der erste Nachbar stets derselbe (Reihenfolge der Flächen), die Basis also stetig.
import { kaefigNachbarn, kaefigNormalen } from '../pinsel';

/** 9 Werte je Punkt: u (3), b (3), n (3), jeweils mit der mittleren Kantenlänge L skaliert. */
export type Zellbasis = { n: number; f: Float64Array };

export function zellbasis(xyz: ArrayLike<number>, fStart: ArrayLike<number>, fVerts: ArrayLike<number>, n: number): Zellbasis {
  const normalen = kaefigNormalen(xyz, fStart, fVerts, n);
  const nb = kaefigNachbarn(fStart, fVerts, n);
  const f = new Float64Array(9 * n);
  for (let i = 0; i < n; i++) {
    const px = xyz[3 * i]!;
    const py = xyz[3 * i + 1]!;
    const pz = xyz[3 * i + 2]!;
    const nx = normalen[3 * i]!;
    const ny = normalen[3 * i + 1]!;
    const nz = normalen[3 * i + 2]!;
    let L = 0;
    for (const j of nb[i]!) L += Math.hypot(xyz[3 * j]! - px, xyz[3 * j + 1]! - py, xyz[3 * j + 2]! - pz);
    L = nb[i]!.length ? L / nb[i]!.length : 1;
    // Tangente: Richtung zum ersten Nachbarn, der nicht fast parallel zur Normalen liegt, in die Tangentialebene gelegt
    let ux = 1;
    let uy = 0;
    let uz = 0;
    for (const j of nb[i]!) {
      let dx = xyz[3 * j]! - px;
      let dy = xyz[3 * j + 1]! - py;
      let dz = xyz[3 * j + 2]! - pz;
      const dn = dx * nx + dy * ny + dz * nz;
      dx -= dn * nx;
      dy -= dn * ny;
      dz -= dn * nz;
      const l = Math.hypot(dx, dy, dz);
      if (l > 1e-9 * (L || 1)) {
        ux = dx / l;
        uy = dy / l;
        uz = dz / l;
        break;
      }
    }
    const bx = ny * uz - nz * uy;
    const by = nz * ux - nx * uz;
    const bz = nx * uy - ny * ux;
    f.set([ux * L, uy * L, uz * L, bx * L, by * L, bz * L, nx * L, ny * L, nz * L], 9 * i);
  }
  return { n, f };
}

/** Weltversatz → Koordinaten in der Zellbasis von Punkt i (Basis orthogonal, jede Achse mit L skaliert). */
export function inBasis(z: Zellbasis, i: number, d: readonly [number, number, number]): [number, number, number] {
  const f = z.f;
  const o = 9 * i;
  const L2 = f[o]! * f[o]! + f[o + 1]! * f[o + 1]! + f[o + 2]! * f[o + 2]! || 1;
  return [
    (f[o]! * d[0] + f[o + 1]! * d[1] + f[o + 2]! * d[2]) / L2,
    (f[o + 3]! * d[0] + f[o + 4]! * d[1] + f[o + 5]! * d[2]) / L2,
    (f[o + 6]! * d[0] + f[o + 7]! * d[1] + f[o + 8]! * d[2]) / L2,
  ];
}

/** Koordinaten in der Zellbasis von Punkt i → Weltversatz. */
export function ausBasis(z: Zellbasis, i: number, k: readonly [number, number, number]): [number, number, number] {
  const f = z.f;
  const o = 9 * i;
  return [f[o]! * k[0] + f[o + 3]! * k[1] + f[o + 6]! * k[2], f[o + 1]! * k[0] + f[o + 4]! * k[1] + f[o + 7]! * k[2], f[o + 2]! * k[0] + f[o + 5]! * k[1] + f[o + 8]! * k[2]];
}
