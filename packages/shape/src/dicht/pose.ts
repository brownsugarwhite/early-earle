// Form zuerst (04.11.2026): Posen auf der dichten Form — Knochen und Blendshape.
//
// Florians Grundidee: Knochen und Blendshapes kombinieren, um extreme Posen zu schaffen. Eine Pose ist hier unabhängig vom
// Netz gespeichert:
// – zwei Knochen um den Mundwinkel: der Unterkiefer (öffnet nach unten) und der Schädel mit dem Oberkiefer (kippt nach oben);
//   wie weit ein Punkt mitdreht, sagt der Maulschnitt (Winkel um den Mundwinkel, Abstand von der Lippe längs der Form);
// – ein Blendshape als Folge von Zügen: Jeder Zug verschiebt die Form um einen Punkt herum weich (Radius, Verschiebung),
//   spiegelgleich (gerechnet auf der Seite z ≥ 0, an der Mittelebene weich gefaltet).
// Je Punkt gilt erst der Blendshape (in Ruhe), dann die Knochen. Weil die Pose am Raum hängt und nicht an Punktnummern, gilt sie
// für jedes Netz derselben Form: für die dichte Form, für das gebackene Spielnetz (dieselben Punkte, nur weniger Dreiecke) und
// nach einer kleinen Änderung der Grundform.
// Die Knochen drehen um die Gelenkachse (senkrecht zur Seite durch den Mundwinkel), so wie der Blendshape sie verschoben hat:
// je Punkt um den Achspunkt auf seiner Tiefe. Hinter dem Mundwinkel liegen Gaumen und Boden auf der Achse aufeinander; drehten
// beide um die alte Achse, risse die Naht dort auf, sobald ein Zug die Achse verschiebt.

import type { MaulSchnitt } from './maul';

/** Ein Zug des Blendshapes: Mitte (Seite z ≥ 0, vor den Knochen), Verschiebung, Radius */
export type PoseZug = { c: [number, number, number]; d: [number, number, number]; r: number };
/** Knochen in Grad (Unterkiefer öffnet nach unten, Schädel kippt nach oben) und die Züge des Blendshapes */
export type Pose = { kiefer: number; schaedel: number; zuege: PoseZug[] };

export const RUHE: Pose = { kiefer: 0, schaedel: 0, zuege: [] };
/** Größte Verschiebung eines Zugs, als Anteil seines Radius: so klappt ein einzelner Zug nichts um */
export const ZUG_MAX = 0.5;

export type PoseZiel = {
  positionen: Float32Array;
  normalen: Float32Array;
  /** Lagen nach dem Blendshape, vor den Knochen (für den nächsten Zug) */
  vorKnochen?: Float32Array;
  innenPositionen?: Float32Array;
  innenNormalen?: Float32Array;
  /** Lagen des Maulinneren nach dem Blendshape, vor den Knochen (für einen Zug, der im Maul beginnt) */
  innenVorKnochen?: Float32Array;
};

/**
 * Verschiebung eines Zugs am Punkt (x, y, z), spiegelgleich: gerechnet mit |z| (an der Mittelebene weich gefaltet, Band = Radius),
 * die Verschiebung in z mit der Ableitung der Faltung (an der Mittelebene null, links gespiegelt). Gibt false, wenn der Punkt
 * außerhalb liegt.
 */
function zugBei(zg: PoseZug, x: number, y: number, z: number, aus: [number, number, number]): boolean {
  const band = zg.r;
  const az = Math.abs(z);
  const zf = az < band ? (z * z + band * band) / (2 * band) : az;
  const s = az < band ? z / band : Math.sign(z);
  const qx = x - zg.c[0];
  const qy = y - zg.c[1];
  const qz = zf - zg.c[2];
  const t2 = (qx * qx + qy * qy + qz * qz) / (zg.r * zg.r);
  if (t2 >= 1) return false;
  const f = (1 - t2) * (1 - t2);
  aus[0] = zg.d[0] * f;
  aus[1] = zg.d[1] * f;
  aus[2] = zg.d[2] * f * s;
  return true;
}

/** Alle Züge nacheinander auf einen Punkt (jeder Zug wirkt auf das Ergebnis der vorigen). */
function zuegeAnwenden(zuege: readonly PoseZug[], p: [number, number, number], tmp: [number, number, number]): boolean {
  let bewegt = false;
  for (const zg of zuege) {
    if (zugBei(zg, p[0], p[1], p[2], tmp)) {
      p[0] += tmp[0];
      p[1] += tmp[1];
      p[2] += tmp[2];
      bewegt = true;
    }
  }
  return bewegt;
}

/**
 * Blendshape auf Lagen und Normalen: Lagen direkt, Normalen mit der Ableitung der ganzen Zugfolge (zentrale Differenzen,
 * inverse Transponierte über die Kofaktoren). `h` ist die Schrittweite der Differenzen.
 */
function blendshape(
  zuege: readonly PoseZug[],
  pos: Float32Array,
  nor: Float32Array,
  ausPos: Float32Array,
  ausNor: Float32Array,
  h: number,
): void {
  const p: [number, number, number] = [0, 0, 0];
  const q: [number, number, number] = [0, 0, 0];
  const tmp: [number, number, number] = [0, 0, 0];
  const J = new Float64Array(9);
  for (let v = 0; v < pos.length / 3; v++) {
    p[0] = pos[3 * v]!;
    p[1] = pos[3 * v + 1]!;
    p[2] = pos[3 * v + 2]!;
    const bewegt = zuegeAnwenden(zuege, p, tmp);
    ausPos[3 * v] = p[0];
    ausPos[3 * v + 1] = p[1];
    ausPos[3 * v + 2] = p[2];
    if (!bewegt) {
      ausNor[3 * v] = nor[3 * v]!;
      ausNor[3 * v + 1] = nor[3 * v + 1]!;
      ausNor[3 * v + 2] = nor[3 * v + 2]!;
      continue;
    }
    // Spalte j der Ableitung: (Φ(p + h eⱼ) − Φ(p − h eⱼ)) / 2h
    for (let j = 0; j < 3; j++) {
      for (const vz of [1, -1]) {
        q[0] = pos[3 * v]!;
        q[1] = pos[3 * v + 1]!;
        q[2] = pos[3 * v + 2]!;
        q[j] = q[j]! + vz * h;
        zuegeAnwenden(zuege, q, tmp);
        for (let i = 0; i < 3; i++) J[3 * i + j] = (vz > 0 ? 0 : J[3 * i + j]!) + (vz * q[i]!) / (2 * h);
      }
    }
    // inverse Transponierte ∝ Kofaktoren: Spalten (j2 × j3, j3 × j1, j1 × j2)
    const a = [J[0]!, J[3]!, J[6]!];
    const b = [J[1]!, J[4]!, J[7]!];
    const c = [J[2]!, J[5]!, J[8]!];
    const kreuz = (u: number[], w: number[]) => [u[1]! * w[2]! - u[2]! * w[1]!, u[2]! * w[0]! - u[0]! * w[2]!, u[0]! * w[1]! - u[1]! * w[0]!];
    const bc = kreuz(b, c);
    const ca = kreuz(c, a);
    const ab = kreuz(a, b);
    const n0 = nor[3 * v]!;
    const n1 = nor[3 * v + 1]!;
    const n2 = nor[3 * v + 2]!;
    let nx = bc[0]! * n0 + ca[0]! * n1 + ab[0]! * n2;
    let ny = bc[1]! * n0 + ca[1]! * n1 + ab[1]! * n2;
    let nz = bc[2]! * n0 + ca[2]! * n1 + ab[2]! * n2;
    const det = a[0]! * bc[0]! + a[1]! * bc[1]! + a[2]! * bc[2]!;
    if (det < 0) {
      nx = -nx;
      ny = -ny;
      nz = -nz;
    }
    const l = Math.hypot(nx, ny, nz) || 1;
    ausNor[3 * v] = nx / l;
    ausNor[3 * v + 1] = ny / l;
    ausNor[3 * v + 2] = nz / l;
  }
}

/**
 * Die Gelenkachse unter dem Blendshape: der Achspunkt (Mundwinkel in der Seite) auf der Tiefe z (Ruhe), mit allen Zügen
 * verschoben → aus[0..1]; seine Ableitung nach z → aus[2..3] (zentrale Differenzen mit Schrittweite h).
 */
function gelenkBei(zuege: readonly PoseZug[], mx: number, my: number, z: number, h: number, aus: Float64Array): void {
  if (zuege.length === 0) {
    aus[0] = mx;
    aus[1] = my;
    aus[2] = 0;
    aus[3] = 0;
    return;
  }
  const q: [number, number, number] = [mx, my, z];
  const tmp: [number, number, number] = [0, 0, 0];
  zuegeAnwenden(zuege, q, tmp);
  aus[0] = q[0];
  aus[1] = q[1];
  q[0] = mx;
  q[1] = my;
  q[2] = z + h;
  zuegeAnwenden(zuege, q, tmp);
  const xp = q[0];
  const yp = q[1];
  q[0] = mx;
  q[1] = my;
  q[2] = z - h;
  zuegeAnwenden(zuege, q, tmp);
  aus[2] = (xp - q[0]) / (2 * h);
  aus[3] = (yp - q[1]) / (2 * h);
}

/**
 * Drehwinkel eines Punkts (Bogenmaß) in der Pose: Unterkiefer öffnet, Schädel kippt entgegen. `innen`: ein Punkt des
 * Maulinneren (starr: der Boden mit dem Unterkiefer, der Gaumen mit dem Schädel).
 */
export function poseWinkel(m: MaulSchnitt, pose: Pose, v: number, innen = false): number {
  const k = (Math.max(0, pose.kiefer) * Math.PI) / 180;
  const s = (Math.max(0, pose.schaedel) * Math.PI) / 180;
  if (innen) return m.innenUnten[v] === 1 ? m.drehsinn * k : -m.drehsinn * s;
  return m.drehsinn * (k * m.gewicht[v]! - s * m.gewichtOben[v]!);
}

/**
 * Die Pose auf ein Netz: erst der Blendshape (Züge), dann die Knochen (nur mit Maul). `rest` sind die Lagen und Normalen in
 * Ruhe — mit Maul die des Schnitts (`m.positionen`), sonst die des Körpers. Das Maulinnere wird mit gerechnet, wenn Ziele dafür
 * da sind.
 */
export function posieren(rest: { positionen: Float32Array; normalen: Float32Array }, m: MaulSchnitt | null, pose: Pose, ziel: PoseZiel): void {
  // Schrittweite der Differenzen: ein Hundertstel des kleinsten Radius
  let rMin = Infinity;
  for (const zg of pose.zuege) rMin = Math.min(rMin, zg.r);
  const h = Number.isFinite(rMin) ? 0.01 * rMin : 1;
  const vor = ziel.vorKnochen ?? new Float32Array(rest.positionen.length);
  const vorN = new Float32Array(rest.normalen.length);
  blendshape(pose.zuege, rest.positionen, rest.normalen, vor, vorN, h);
  const P = ziel.positionen;
  const N = ziel.normalen;
  if (!m) {
    P.set(vor);
    N.set(vorN);
    return;
  }
  const k = (Math.max(0, pose.kiefer) * Math.PI) / 180;
  const sch = (Math.max(0, pose.schaedel) * Math.PI) / 180;
  const sg = m.drehsinn;
  const mx = m.gelenk.x;
  const my = m.gelenk.y;
  const gl = new Float64Array(4);
  for (let v = 0; v < vor.length / 3; v++) {
    const a = sg * (k * m.gewicht[v]! - sch * m.gewichtOben[v]!);
    const gx = sg * (k * m.gradient[2 * v]! - sch * m.gradientOben[2 * v]!);
    const gy = sg * (k * m.gradient[2 * v + 1]! - sch * m.gradientOben[2 * v + 1]!);
    const x = vor[3 * v]!;
    const y = vor[3 * v + 1]!;
    if (a === 0 && gx === 0 && gy === 0) {
      P[3 * v] = x;
      P[3 * v + 1] = y;
      P[3 * v + 2] = vor[3 * v + 2]!;
      N[3 * v] = vorN[3 * v]!;
      N[3 * v + 1] = vorN[3 * v + 1]!;
      N[3 * v + 2] = vorN[3 * v + 2]!;
      continue;
    }
    // Drehpunkt: die Gelenkachse auf der Tiefe des Punkts (Ruhe), wie der Blendshape sie verschoben hat
    gelenkBei(pose.zuege, mx, my, rest.positionen[3 * v + 2]!, h, gl);
    const c = Math.cos(a);
    const s = Math.sin(a);
    const dx = x - gl[0]!;
    const dy = y - gl[1]!;
    P[3 * v] = gl[0]! + c * dx - s * dy;
    P[3 * v + 1] = gl[1]! + s * dx + c * dy;
    P[3 * v + 2] = vor[3 * v + 2]!;
    // J = [[A, b], [0, 1]]: A = R + (R' (p − G)) (∇α)ᵀ, b = (I − R) ∂G/∂z (der Drehpunkt hängt an der Tiefe)
    const rx = -s * dx - c * dy;
    const ry = c * dx - s * dy;
    const j11 = c + rx * gx;
    const j12 = -s + rx * gy;
    const j21 = s + ry * gx;
    const j22 = c + ry * gy;
    const b0 = (1 - c) * gl[2]! + s * gl[3]!;
    const b1 = (1 - c) * gl[3]! - s * gl[2]!;
    const det = j11 * j22 - j12 * j21 || 1e-12;
    const nx = vorN[3 * v]!;
    const ny = vorN[3 * v + 1]!;
    // N = J⁻ᵀ n: oben A⁻ᵀ n, in z dazu −b · (A⁻ᵀ n)
    const qx = (j22 * nx - j21 * ny) / det;
    const qy = (-j12 * nx + j11 * ny) / det;
    const qz = vorN[3 * v + 2]! - b0 * qx - b1 * qy;
    const l = Math.hypot(qx, qy, qz) || 1;
    N[3 * v] = qx / l;
    N[3 * v + 1] = qy / l;
    N[3 * v + 2] = qz / l;
  }
  // Maulinneres: Blendshape wie der Körper, dann starr um dieselbe Achse — der Boden mit dem Unterkiefer, der Gaumen mit dem
  // Schädel
  if (ziel.innenPositionen && ziel.innenNormalen) {
    const ip = ziel.innenVorKnochen ?? new Float32Array(m.innen.positionen.length);
    const inn = new Float32Array(m.innen.normalen.length);
    blendshape(pose.zuege, m.innen.positionen, m.innen.normalen, ip, inn, h);
    const ck = Math.cos(sg * k);
    const sk = Math.sin(sg * k);
    const cs = Math.cos(-sg * sch);
    const ss = Math.sin(-sg * sch);
    for (let v = 0; v < ip.length / 3; v++) {
      const unten = m.innenUnten[v] === 1;
      const c = unten ? ck : cs;
      const s = unten ? sk : ss;
      gelenkBei(pose.zuege, mx, my, m.innen.positionen[3 * v + 2]!, h, gl);
      const dx = ip[3 * v]! - gl[0]!;
      const dy = ip[3 * v + 1]! - gl[1]!;
      ziel.innenPositionen[3 * v] = gl[0]! + c * dx - s * dy;
      ziel.innenPositionen[3 * v + 1] = gl[1]! + s * dx + c * dy;
      ziel.innenPositionen[3 * v + 2] = ip[3 * v + 2]!;
      const qx = c * inn[3 * v]! - s * inn[3 * v + 1]!;
      const qy = s * inn[3 * v]! + c * inn[3 * v + 1]!;
      const qz = inn[3 * v + 2]! - ((1 - c) * gl[2]! + s * gl[3]!) * qx - ((1 - c) * gl[3]! - s * gl[2]!) * qy;
      const l = Math.hypot(qx, qy, qz) || 1;
      ziel.innenNormalen[3 * v] = qx / l;
      ziel.innenNormalen[3 * v + 1] = qy / l;
      ziel.innenNormalen[3 * v + 2] = qz / l;
    }
  }
}

/** Ein Punkt der Form in der Pose (für Linien auf der Form): Blendshape, dann die Knochen nach seinen Gewichten an der Stelle. */
export function posePunkt(m: MaulSchnitt | null, pose: Pose, x: number, y: number, z: number): [number, number, number] {
  const p: [number, number, number] = [x, y, z];
  zuegeAnwenden(pose.zuege, p, [0, 0, 0]);
  if (!m) return p;
  const a =
    m.drehsinn *
    (((Math.max(0, pose.kiefer) * Math.PI) / 180) * m.gewichtBei(x, y) - ((Math.max(0, pose.schaedel) * Math.PI) / 180) * m.schaedelBei(x, y));
  if (a === 0) return p;
  const gl = new Float64Array(4);
  let rMin = Infinity;
  for (const zg of pose.zuege) rMin = Math.min(rMin, zg.r);
  gelenkBei(pose.zuege, m.gelenk.x, m.gelenk.y, z, Number.isFinite(rMin) ? 0.01 * rMin : 1, gl);
  const c = Math.cos(a);
  const s = Math.sin(a);
  const dx = p[0] - gl[0]!;
  const dy = p[1] - gl[1]!;
  return [gl[0]! + c * dx - s * dy, gl[1]! + s * dx + c * dy, p[2]];
}
