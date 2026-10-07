import { clamp01, length, normalize, scale, sub, type Vec3 } from '../math/vec';
import type { Construction } from '../sdf/build';
import { evalScene, tetraGradient, type SdfScene } from '../sdf/scene';
import type { Descriptors } from '../mesh/descriptors';

/**
 * Verschluss-Morph: Das Mesh entsteht leicht geöffnet (sonst gäbe es keine Höhle). Für das **perfekt geschlossene** Maul
 * wird je Vertex der Lippenzone berechnet, wo er nach der Kieferdrehung in den geschlossenen Zustand liegt, und dann auf
 * die glatte Trägerfläche (Vereinigung ohne Höhle) projiziert. Die Differenz (Körperraum, geschlossene Pose) wird im
 * Shader nach dem Skinning mit dem Gewicht „zu“ addiert — die Naht wird nur Wertkontrast, nichts klafft, nichts ragt.
 * Rachenvertices wandern beim Schließen zusätzlich nach innen (hinter die Lippen).
 */
export interface ClosingResult {
  /** Verschiebung je Vertex (xyz) im geschlossenen Zustand. */
  closed: Float32Array;
  /** Spitzmund: radiale Weitung des Lochmauls bei voller Öffnung (xyz je Vertex). */
  pucker: Float32Array;
  /** Faktor, mit dem der Spitzmund-Morph negativ das Loch schließt (Bauradius → Minimalradius). */
  puckerClose: number;
  /** Drehwinkel des Unterkiefers vom Bauzustand zur Schließung (rad, positiv = zu). */
  closeAngle: number;
  /** Maximaler Öffnungswinkel (rad) ab Bauzustand. */
  maxOpenAngle: number;
}

export function computeClosing(c: Construction, positions: Float32Array, desc: Descriptors): ClosingResult {
  const n = positions.length / 3;
  const closed = new Float32Array(n * 3);
  const pucker = new Float32Array(n * 3);
  const mouth = c.mouth;
  if (!mouth) return { closed, pucker, puckerClose: 0, closeAngle: 0, maxOpenAngle: 0.6 };
  const H = c.bodyScale;
  const hinge = mouth.jawHinge.point;
  const axis = normalize(mouth.jawHinge.axis);
  // Kieferlänge: Scharnier → Maulzentrum; Winkel aus der Öffnungshöhe
  const Ljaw = Math.max(0.05, length(sub(mouth.center, hinge)));
  const gapTotal = 2 * mouth.gapFront;
  const closeAngle = Math.asin(Math.min(0.95, gapTotal / Ljaw)) * (mouth.host.bone === c.hostBone ? 1 : 1);
  const openTarget = 0.62 * mouth.host.height; // volle Öffnung vorn
  const maxOpenAngle = Math.max(closeAngle, Math.asin(Math.min(0.95, openTarget / Ljaw)) - closeAngle);
  const hasJaw = c.bauplan.maul.unterkiefer >= 0.05;
  const form = c.bauplan.maul.form;
  // Lochmaul: Radius im Bauzustand und bei voller Öffnung (wie in mouth.ts)
  const hw = mouth.host.halfWidth;
  const rhoBuild = Math.max(0.004, hw * c.bauplan.maul.breite * (0.18 + 0.5 * c.bauplan.maul.oeffnung));
  const rhoFull = Math.max(0.004, hw * c.bauplan.maul.breite * (0.18 + 0.5));
  // Träger ohne Höhle (nur Vereinigungen, ohne Lippen der Unterseite würde die Projektion springen → alle Vereinigungen)
  const hostScene: SdfScene = { prims: c.scene.prims.filter((p) => p.op === 'union') };
  const sdf = (p: Readonly<Vec3>): number => evalScene(hostScene, p);
  const jawBone = c.jawBone;
  const p: Vec3 = [0, 0, 0];
  const q: Vec3 = [0, 0, 0];
  const g: Vec3 = [0, 0, 0];
  const eps = 0.004 * H;
  const cosA = Math.cos(closeAngle), sinA = Math.sin(closeAngle);
  const rotateAboutHinge = (v: Vec3, out: Vec3): void => {
    // Rodrigues um `axis` durch `hinge` mit −closeAngle (Schließen hebt die Front an)
    const rx = v[0] - hinge[0], ry = v[1] - hinge[1], rz = v[2] - hinge[2];
    const kx = axis[0], ky = axis[1], kz = axis[2];
    const dotk = kx * rx + ky * ry + kz * rz;
    const cx = ky * rz - kz * ry, cy = kz * rx - kx * rz, cz = kx * ry - ky * rx;
    const ca = cosA, sa = -sinA;
    out[0] = hinge[0] + rx * ca + cx * sa + kx * dotk * (1 - ca);
    out[1] = hinge[1] + ry * ca + cy * sa + ky * dotk * (1 - ca);
    out[2] = hinge[2] + rz * ca + cz * sa + kz * dotk * (1 - ca);
  };
  for (let v = 0; v < n; v++) {
    p[0] = positions[v * 3]!;
    p[1] = positions[v * 3 + 1]!;
    p[2] = positions[v * 3 + 2]!;
    const { h, phi, r } = mouth.local(p);
    const phiC = Math.max(-mouth.theta, Math.min(mouth.theta, phi));
    const hl = mouth.lipHAt(phiC);
    const gap = mouth.gapAt(phiC);
    const rIn = mouth.lipRAt(phiC) * (1 - mouth.tiefe);
    const inner = desc.region[v * 4]!;
    const nearLip = Math.abs(h - hl) < gap * 1.8 + 0.08 * H && Math.abs(phi) < mouth.theta + 0.25 && r > rIn - 0.05 * H;
    if (!nearLip && inner < 0.2) continue;
    // Pose nach Kieferdrehung (linear nach Kiefergewicht)
    let wJaw = 0;
    for (let k = 0; k < 4; k++) if (desc.skinIndex[v * 4 + k] === jawBone) wJaw += desc.skinWeight[v * 4 + k]!;
    if (!hasJaw) wJaw = 0;
    wJaw *= form; // Lochmaul schließt radial, nicht per Kieferdrehung
    rotateAboutHinge(p, q);
    q[0] = p[0] + (q[0] - p[0]) * wJaw;
    q[1] = p[1] + (q[1] - p[1]) * wJaw;
    q[2] = p[2] + (q[2] - p[2]) * wJaw;
    const target: Vec3 = [q[0], q[1], q[2]];
    if (inner > 0.2) {
      // Rachen: nach innen zur Trägerachse, umso weiter, je tiefer im Rachen
      const axisPt = [mouth.host.origin[0] + mouth.host.up[0] * h, mouth.host.origin[1] + mouth.host.up[1] * h, mouth.host.origin[2] + mouth.host.up[2] * h] as Vec3;
      const toAxis = sub(axisPt, target);
      const d = length(toAxis) || 1;
      const pull = Math.min(d * 0.5, (0.06 + 0.1 * inner) * H);
      const dir = scale(toAxis, 1 / d);
      target[0] += dir[0] * pull;
      target[1] += dir[1] * pull;
      target[2] += dir[2] * pull;
    } else {
      // Lippenzone: auf die glatte Trägerfläche projizieren (drei Newton-Schritte), nur nach außen begrenzt
      for (let it = 0; it < 3; it++) {
        const d = sdf(target);
        tetraGradient(sdf, target, eps, g);
        const gg = g[0] * g[0] + g[1] * g[1] + g[2] * g[2] || 1;
        const f = Math.max(-0.5, Math.min(0.5, d / gg));
        target[0] -= f * g[0];
        target[1] -= f * g[1];
        target[2] -= f * g[2];
      }
      // Gewichtung: voll an der Lippenkante, auslaufend nach außen
      const w = clamp01(1 - Math.max(0, Math.abs(h - hl) - gap) / (0.08 * H));
      target[0] = q[0] + (target[0] - q[0]) * w;
      target[1] = q[1] + (target[1] - q[1]) * w;
      target[2] = q[2] + (target[2] - q[2]) * w;
    }
    closed[v * 3] = target[0] - q[0];
    closed[v * 3 + 1] = target[1] - q[1];
    closed[v * 3 + 2] = target[2] - q[2];
  }
  // Spitzmund: Vertices rund um das Loch wandern bei voller Öffnung radial nach außen (im Maulrahmen)
  if (form < 0.98) {
    const fx = mouth.frame.x, fy = mouth.frame.y, fz = mouth.frame.z;
    const C = mouth.center;
    for (let v = 0; v < n; v++) {
      const px = positions[v * 3]! - C[0], py = positions[v * 3 + 1]! - C[1], pz = positions[v * 3 + 2]! - C[2];
      const xm = px * fx[0] + py * fx[1] + pz * fx[2];
      const ym = px * fy[0] + py * fy[1] + pz * fy[2];
      const zm = px * fz[0] + py * fz[1] + pz * fz[2];
      const rho = Math.hypot(xm, ym);
      if (zm < -hw * 0.8 || rho > rhoBuild * 2.6 || rho < 1e-4) continue;
      // nahe am Lochrand voll, nach außen auslaufend
      const w = (1 - clamp01((rho - rhoBuild) / (rhoBuild * 1.6))) * (1 - form) * clamp01(1 + zm / (hw * 0.8));
      const grow = (rhoFull - rhoBuild) * w;
      const dx = (xm / rho) * grow, dy = (ym / rho) * grow;
      pucker[v * 3] = fx[0] * dx + fy[0] * dy;
      pucker[v * 3 + 1] = fx[1] * dx + fy[1] * dy;
      pucker[v * 3 + 2] = fx[2] * dx + fy[2] * dy;
    }
  }
  const puckerClose = rhoFull - rhoBuild > 1e-4 ? (rhoBuild - rhoBuild * 0.12) / (rhoFull - rhoBuild) : 0;
  return { closed, pucker, puckerClose, closeAngle, maxOpenAngle };
}
