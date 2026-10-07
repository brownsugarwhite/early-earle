import { add, clamp, clamp01, length, scale, smoothstep, sub, type Vec3 } from '../math/vec';
import type { Construction } from '../sdf/build';
import { evalScene, type SdfScene } from '../sdf/scene';
import type { Descriptors } from '../mesh/descriptors';
import { computeSeal } from './seal';
import { SHARE_CLOSE, UPPER_TILT, jawPose, jawTransforms, upperShare, type JawRig } from './pose';

/**
 * Verschluss-Morph: Das Mesh entsteht leicht geöffnet (sonst gäbe es keine Höhle). Für das **perfekt geschlossene** Maul
 * wird je Vertex der Maulzone berechnet, wo er im geschlossenen Zustand liegt; die Differenz zur Laufzeitpose
 * (Skinning mit geschlossenen Kiefern) wird im Shader mit dem Gewicht „zu“ addiert.
 *
 * Regeln des geschlossenen Zustands:
 * 1. Unterkieferzone (Unterlippe, Kinn, Höhlenboden) und Oberkieferzone (Oberlippe, Oberkopf, Höhlendach) bewegen sich
 *    **starr** mit ihrem Kiefer — unabhängig von den geglätteten Skin-Gewichten, die das Schließen sonst nur teilweise
 *    mitmachen (die Lücke blieb halb offen).
 * 2. Die Lippenkanten treffen sich je Azimut exakt an der Naht (Ausgleich `seal`), die Unterlippenkante schiebt sich eine
 *    Fase weit hinter die Oberlippe (Überlappung): keine dunkle Spur, nur die Naht als Wertkontrast.
 * 3. Die Höhle klappt zu: der Boden bleibt unter dem Dach, tiefe Rachenflächen ziehen leicht zur Achse — stetig gewichtet,
 *    damit am Lippenrand nichts ausfranst.
 * Das Lochmaul schließt radial (Spitzmund-Morph negativ), nicht per Kieferdrehung.
 */
export interface ClosingResult {
  /** Verschiebung je Vertex (xyz) im geschlossenen Zustand. */
  closed: Float32Array;
  /** Spitzmund: radiale Weitung des Lochmauls bei voller Öffnung (xyz je Vertex). */
  pucker: Float32Array;
  /** Faktor, mit dem der Spitzmund-Morph negativ das Loch schließt (Bauradius → Minimalradius). */
  puckerClose: number;
  /** Drehwinkel-Äquivalent vom Bauzustand zur Schließung (rad, positiv = zu; gesamte Öffnung vorn). */
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
  const host = mouth.host;
  const up = host.up;
  const hinge = mouth.jawHinge;
  // Hebel Scharnier → Maulzentrum; Winkel aus der Öffnungshöhe vorn
  const Ljaw = Math.max(0.05, length(sub(mouth.center, hinge.point)));
  const gapTotal = 2 * mouth.gapFront;
  const closeAngle = Math.asin(Math.min(0.95, gapTotal / Ljaw));
  const openTarget = 0.72 * host.height; // volle Öffnung vorn (Bild 6: Gähnen ≈ 60–70 % der Kopfhöhe)
  const maxOpenAngle = Math.max(closeAngle, Math.asin(Math.min(0.95, openTarget / Ljaw)) - closeAngle);
  const m = c.bauplan.maul;
  const hasJaw = m.unterkiefer >= 0.05;
  const form = m.form;
  // Lochmaul: Radius im Bauzustand und bei voller Öffnung (wie in mouth.ts)
  const hw = host.halfWidth;
  const rhoBuild = mouth.gapFront * 1.05;
  const rhoFull = rhoBuild / Math.max(0.2, m.oeffnung);
  const puckerClose = rhoFull - rhoBuild > 1e-4 ? (rhoBuild - rhoBuild * 0.12) / (rhoFull - rhoBuild) : 0;
  const rig: JawRig = { closeAngle, maxOpenAngle, oeffnungBau: m.oeffnung, jawLength: Ljaw, share: upperShare(m), shareClose: hasJaw ? SHARE_CLOSE : 1, tilt: UPPER_TILT, form, puckerClose };
  const pose = jawPose(rig, 0);
  const tf = jawTransforms(hinge, up, pose);
  // Keil-Anteil des Schließens: ab form ≈ 0,6 schließen die Kiefer die Öffnung vollständig, darunter übernimmt der Spitzmund
  const wForm = smoothstep(0.15, 0.6, form);
  const theta = mouth.theta;
  const tiefe = mouth.tiefe;
  const jawBone = c.jawBone;
  const upperBone = c.upperJawBone;
  const cavityK = c.scene.prims.find((pr) => pr.name === 'maulhoehle')?.k ?? 0.03 * H;
  // Innen-Gewicht aus der Geometrie (Tiefe in der Vereinigung), breit auslaufend — der Deskriptor „Rachen“ ist für die
  // Farbe absichtlich schmal und taugt nicht als Verformungsgewicht (zu abrupt → Ausfransen)
  const hostScene: SdfScene = { prims: c.scene.prims.filter((pr) => pr.op === 'union') };
  // Überlappung der Lippenkanten an der Naht: etwa eine Fase der weichen Schnittkante
  const overlap = 0.5 * cavityK + 0.008 * H;
  // Ausdehnung der starren Unterkieferzone unter der Maullinie (etwa die Unterkiefermasse), darunter auslaufend
  const hh = host.height * 0.5;
  const jawDepth = Math.max(2.2 * mouth.gapFront, (0.25 + 0.4 * m.unterkiefer) * hh);
  const shareUp = rig.shareClose;

  const seal = computeSeal({ host, theta, lipHAt: (phi) => mouth.lipHAt(phi), gapAt: (phi) => mouth.gapAt(phi), lower: tf.lower, upper: tf.upper, hasJaw, share: shareUp, overlap, bodyScale: H });
  const seamAt = (phi: number): number => seal.seamAt(phi);

  // Azimutale Auslaufzonen wie bei den Gewichten (Unterkiefer eng, Oberkopf weit, Rücken bleibt)
  // seitlicher Auslauf: vor den Mundwinkeln voll, zwischen Winkel und Gelenk auslaufend (wie die Gewichte)
  const wSide = (aphi: number, phi: number, r: number): number => (aphi <= theta ? 1 : mouth.wToJoint(r * Math.cos(phi)));

  const p: Vec3 = [0, 0, 0];
  const q: Vec3 = [0, 0, 0];
  const target: Vec3 = [0, 0, 0];
  for (let v = 0; v < n; v++) {
    p[0] = positions[v * 3]!;
    p[1] = positions[v * 3 + 1]!;
    p[2] = positions[v * 3 + 2]!;
    const { h, phi, r } = mouth.local(p);
    const aphi = Math.abs(phi);
    if (r * Math.cos(phi) < -host.jointBack - 0.05 * H) continue;
    const phiC = clamp(phi, -theta, theta);
    const hl = mouth.lipHAt(phiC);
    const g = mouth.gapAt(phiC);
    const rLip = mouth.lipRAt(phiC);
    const rIn = rLip * (1 - tiefe * 0.9);
    const below = hl - h;
    if (below > jawDepth * 1.6 + 0.05 * H) continue;
    if (r < rIn - 0.1 * H) continue;
    const inner = desc.region[v * 4]! > 0.005 || r < rLip * 0.97 ? smoothstep(0, 0.7 * cavityK, -evalScene(hostScene, p)) : 0;
    // Laufzeitpose aus dem Skinning (beide Kiefer geschlossen)
    let wJaw = 0, wUp = 0;
    for (let k = 0; k < 4; k++) {
      const bi = desc.skinIndex[v * 4 + k];
      if (bi === jawBone) wJaw += desc.skinWeight[v * 4 + k]!;
      else if (bi === upperBone) wUp += desc.skinWeight[v * 4 + k]!;
    }
    if (!hasJaw) wJaw = 0;
    const lo = tf.lower(p);
    const upP = tf.upper(p);
    q[0] = p[0] + (lo[0] - p[0]) * wJaw + (upP[0] - p[0]) * wUp;
    q[1] = p[1] + (lo[1] - p[1]) * wJaw + (upP[1] - p[1]) * wUp;
    q[2] = p[2] + (lo[2] - p[2]) * wJaw + (upP[2] - p[2]) * wUp;
    target[0] = q[0];
    target[1] = q[1];
    target[2] = q[2];
    const lowerSide = h < hl;
    if (wForm > 0) {
      if (lowerSide && hasJaw) {
        // 1. starre Drehung der Unterkieferzone, nach unten und zu den Seiten auslaufend
        const wLow = (1 - smoothstep(jawDepth * 0.8, jawDepth * 1.5, below)) * wSide(aphi, phi, r) * wForm;
        target[0] = q[0] + (lo[0] - q[0]) * wLow;
        target[1] = q[1] + (lo[1] - q[1]) * wLow;
        target[2] = q[2] + (lo[2] - q[2]) * wLow;
        // 2. Kante an die Naht: voll an der Unterlippenkante, über etwa eine Spalthöhe nach unten auslaufend
        const dRim = hl - g - h;
        const wSeal = (1 - smoothstep(0, Math.max(g, 0.04 * H) * 1.5, dRim)) * wSide(aphi, phi, r) * wForm;
        const d = seal.lowerAt(phiC) * wSeal;
        target[0] += up[0] * d;
        target[1] += up[1] * d;
        target[2] += up[2] * d;
      } else if (!lowerSide) {
        // 1. starre Bewegung des Oberkopfs (Heben + Neigen), zu den Seiten auslaufend, am Lippenband einsetzend
        const above = h - hl;
        const band = 0.09 * H;
        const wHigh = smoothstep(-0.2 * band, band, above) * wSide(aphi, phi, r) * wForm;
        target[0] = q[0] + (upP[0] - q[0]) * wHigh;
        target[1] = q[1] + (upP[1] - q[1]) * wHigh;
        target[2] = q[2] + (upP[2] - q[2]) * wHigh;
        // 2. Kante an die Naht
        const dRim = h - (hl + g);
        const wSeal = (1 - smoothstep(0, Math.max(g, 0.04 * H) * 1.5, dRim)) * wSide(aphi, phi, r) * wForm;
        const d = seal.upperAt(phiC) * wSeal;
        target[0] += up[0] * d;
        target[1] += up[1] * d;
        target[2] += up[2] * d;
      }
    }
    // 3. Höhle klappt zu: Dach und Boden legen sich auf die Naht (am Rand mit der Überlappung der Kanten, innen als
    //    dünne Tasche) — so stößt nichts aus dünnen Kiefern heraus, egal wie die Bewegung verteilt ist
    if (inner > 0.02 && wForm > 0) {
      const l2 = mouth.local(target);
      const phi2 = clamp(l2.phi, -theta, theta);
      const rLip2 = mouth.lipRAt(phi2);
      const rIn2 = rLip2 * (1 - tiefe * 0.9);
      const T2 = clamp01((l2.r - rIn2) / Math.max(1e-4, rLip2 - rIn2));
      const wIn = smoothstep(0.02, 0.6, inner) * wForm;
      // nur Flächen hinter dem Lippenradius klappen; die Lippenfläche selbst (und ihre Fase) setzt die Naht (Regel 2)
      const deep = clamp01((rLip2 * 0.97 - l2.r) / (0.08 * H));
      const sideSign = lowerSide && hasJaw ? 1 : -1;
      const hSeam = seamAt(phi2) + sideSign * (overlap * 0.5 * T2 - 0.25 * cavityK * (1 - T2));
      const dh = (hSeam - l2.h) * wIn * deep;
      target[0] += up[0] * dh;
      target[1] += up[1] * dh;
      target[2] += up[2] * dh;
      // tiefe Rachenflächen leicht zur Achse
      const axisPt = add(host.origin, scale(up, l2.h));
      const toAxis = sub(axisPt, target);
      const dist = length(toAxis) || 1;
      const pull = Math.min(dist * 0.5, 0.035 * H) * wIn * deep;
      target[0] += (toAxis[0] / dist) * pull;
      target[1] += (toAxis[1] / dist) * pull;
      target[2] += (toAxis[2] / dist) * pull;
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
  return { closed, pucker, puckerClose, closeAngle, maxOpenAngle };
}
