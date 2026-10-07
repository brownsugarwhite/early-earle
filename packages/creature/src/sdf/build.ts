import type { Bauplan } from '../bauplan/schema';
import { catmullRom, makePolyline, type Polyline } from '../math/curve';
import { QUAT_ID, add, clamp, cross, frameFromTangent, normalize, quatFromFrame, scale, sub, type Quat, type Vec3 } from '../math/vec';
import { buildMouth, surfacePoint, type MouthGeometry, type MouthHost } from '../mouth/mouth';
import { REGION, evalScene, sceneBounds, type CapsulePrim, type EllipsoidPrim, type Prim, type RevolvePrim, type SdfScene } from './scene';

/**
 * Bauplan → implizite Szene + prozedurales Skelett + Teilgruppen (Kurven für Wirbelsäulen-Koordinaten) + Maul + Augen.
 * Alles in Blob-Einheiten im Körperraum (+Z vorn, +Y oben, Boden y = 0).
 */

export type GroupKind = 'koerper' | 'hals' | 'kopf' | 'kiefer' | 'bein' | 'schwanz' | 'schlange';

export interface Bone {
  name: string;
  parent: number;
  pos: Vec3;
  quat: Quat;
  group: number;
}

export interface PartGroup {
  name: string;
  kind: GroupKind;
  polyline: Polyline;
  bones: number[];
  /** Richtung „Rücken“ für die Bauch/Rücken-Koordinate. */
  dorsal: Vec3;
}

export interface EyeSpec {
  pos: Vec3;
  normal: Vec3;
  radius: number;
  depth: number;
}

export interface Construction {
  bauplan: Bauplan;
  scene: SdfScene;
  bones: Bone[];
  groups: PartGroup[];
  mouth: MouthGeometry | null;
  eyes: EyeSpec[];
  /** Körperhöhe als Längenmaßstab. */
  bodyScale: number;
  bounds: { min: Vec3; max: Vec3 };
  /** Index des Trägerknochens (Körpermitte oder Kopf) und des Unterkieferknochens. */
  hostBone: number;
  jawBone: number;
}

const UP: Vec3 = [0, 1, 0];
const FWD: Vec3 = [0, 0, 1];
const RIGHT: Vec3 = [1, 0, 0];

function capsule(a: Vec3, b: Vec3, ra: number, rb: number, part: number, k: number, name: string, region = REGION.haut): CapsulePrim {
  return { kind: 'capsule', op: 'union', part, k, region, name, a, b, ra, rb };
}

/**
 * Radiustabelle des Grundblobs (0 … H, 96 Stützstellen) aus den fünf Querschnitten: flache Standfläche (`boden` =
 * Anteil des Basisradius, der flach aufliegt), weiche Kuppel, Scheitel bei r → 0. Catmull-Rom durch die Stützpunkte.
 */
export function bodyRadii(b: Bauplan, R0: number, H: number, samples = 96): Float64Array {
  const k = b.koerper;
  const q = k.querschnitte.slice() as [number, number, number, number, number];
  if (k.bauch < 0) q[1] *= 1 + 0.3 * k.bauch;
  if (k.buckel < 0) q[3] *= 1 + 0.3 * k.buckel;
  const r = q.map((x) => x * R0);
  const boden = clamp(k.boden, 0, 1);
  // Stützpunkte (y, r): Standkante, dann die Querschnitte, dann der Scheitel
  const ctrl: Array<[number, number]> = [
    [0, r[0]! * (0.55 + 0.42 * boden)],
    [H * 0.06 * (1.3 - boden), r[0]!],
    [H * 0.25, r[1]!],
    [H * 0.5, r[2]!],
    [H * 0.75, r[3]!],
    [H * 0.92, r[4]!],
    [H * 0.985, r[4]! * 0.45],
    [H, 0],
  ];
  const out = new Float64Array(samples);
  const n = ctrl.length;
  const P = (i: number): [number, number] => ctrl[Math.max(0, Math.min(n - 1, i))]!;
  // Abtastung über y: je Abschnitt Catmull-Rom in beiden Koordinaten, dann auf gleichmäßiges y umsortieren
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < n - 1; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const steps = 24;
    for (let s = 0; s < steps; s++) {
      const t = s / steps, t2 = t * t, t3 = t2 * t;
      const cy = 0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
      const cr = 0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
      pts.push([cy, Math.max(0, cr)]);
    }
  }
  pts.push([H, 0]);
  pts.sort((a, c) => a[0] - c[0]);
  let j = 0;
  for (let i = 0; i < samples; i++) {
    const y = (i / (samples - 1)) * H;
    while (j < pts.length - 2 && pts[j + 1]![0] < y) j++;
    const a = pts[j]!, c = pts[j + 1]!;
    const f = c[0] > a[0] ? clamp((y - a[0]) / (c[0] - a[0]), 0, 1) : 0;
    out[i] = a[1] + (c[1] - a[1]) * f;
  }
  out[samples - 1] = 0;
  return out;
}

export function construct(b: Bauplan): Construction {
  const H = b.koerper.hoehe;
  const R0 = 0.5 * H;
  const sx = b.koerper.breite;
  const sz = b.koerper.laenge;
  const sm = Math.sqrt(sx * sz);
  const shear = b.koerper.neigung * 0.35;
  const legs = b.unterkoerper.typ === 'beine' || b.unterkoerper.typ === 'vogel' || b.unterkoerper.typ === 'spinneDuenn' || b.unterkoerper.typ === 'spinneFlauschig';
  const legLen = legs ? b.unterkoerper.beine.laenge * 0.55 * H : 0;
  const yb = legLen;

  const bones: Bone[] = [];
  const groups: PartGroup[] = [];
  const prims: Prim[] = [];
  const bone = (name: string, parent: number, pos: Vec3, quat: Quat, group: number): number => {
    bones.push({ name, parent, pos, quat, group });
    return bones.length - 1;
  };

  // --- Körper: Rotationskörper aus dem Profil, drei Knochen entlang der Achse ----------------------------------
  const axisAt = (y: number): Vec3 => [0, y, shear * (y - yb)];
  const root = bone('root', -1, [0, 0, 0], QUAT_ID, 0);
  const radii = bodyRadii(b, R0, H);
  const bodyGroup = groups.length;
  const axisPts: Vec3[] = [];
  const axisR: number[] = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    axisPts.push(axisAt(yb + t * H));
    axisR.push(Math.max(radii[Math.min(radii.length - 1, Math.round(t * (radii.length - 1)))]!, R0 * 0.15) * sm);
  }
  groups.push({ name: 'koerper', kind: 'koerper', polyline: makePolyline(axisPts, axisR, FWD), bones: [], dorsal: normalize([0, 0.8, -0.6]) });
  const kUnten = bone('koerperUnten', root, axisAt(yb), QUAT_ID, bodyGroup);
  const kMitte = bone('koerperMitte', kUnten, axisAt(yb + 0.45 * H), QUAT_ID, bodyGroup);
  const kOben = bone('koerperOben', kMitte, axisAt(yb + 0.85 * H), QUAT_ID, bodyGroup);
  groups[bodyGroup]!.bones.push(kUnten, kMitte, kOben);
  const body: RevolvePrim = { kind: 'revolve', op: 'union', part: kMitte, k: 0.1 * H, region: REGION.haut, name: 'koerper', radii, height: H, c: [0, yb, 0], sx, sz, n: 2 + 6 * b.koerper.kubik, shear, round: 0.03 * H * (0.6 + 0.8 * (1 - b.koerper.boden)) };
  prims.push(body);
  if (b.koerper.bauch > 0) {
    const e: EllipsoidPrim = { kind: 'ellipsoid', op: 'union', part: kUnten, k: 0.25 * H, region: REGION.haut, name: 'bauch', c: add(axisAt(yb + 0.28 * H), [0, 0, R0 * sz * 0.42 * b.koerper.bauch]), r: [R0 * sx * 0.78, 0.3 * H, R0 * sz * 0.58] };
    prims.push(e);
  }
  if (b.koerper.buckel > 0) {
    const e: EllipsoidPrim = { kind: 'ellipsoid', op: 'union', part: kOben, k: 0.25 * H, region: REGION.haut, name: 'buckel', c: add(axisAt(yb + 0.7 * H), [0, 0.05 * H * b.koerper.buckel, -R0 * sz * 0.42 * b.koerper.buckel]), r: [R0 * sx * 0.72, 0.28 * H * (0.6 + 0.6 * b.koerper.buckel), R0 * sz * 0.52] };
    prims.push(e);
  }

  // --- Hals und Kopf ------------------------------------------------------------------------------------------------
  let hostBone = kMitte;
  let host: MouthHost | null = null;
  let headGroup = -1;
  const neckLen = b.hals.laenge * H;
  if (neckLen > 0.02 * H) {
    const ansatz = b.hals.ansatz;
    const hb = yb + H * (0.97 - 0.1 * Math.abs(ansatz - 0.5) * 2);
    const base: Vec3 = add(axisAt(hb), [0, 0, (ansatz - 0.5) * R0 * sz * 1.3]);
    const rN = b.hals.dicke * R0 * 0.62 * sm;
    const kr = b.hals.kruemmung;
    const ctrl: Vec3[] = [];
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      const f = neckLen * (0.18 * t * t - kr * 0.35 * Math.sin(Math.PI * t));
      ctrl.push([base[0], base[1] + neckLen * t, base[2] + f]);
    }
    const pts = catmullRom(ctrl, 3);
    const radii = pts.map((_p, i) => rN * (1 - 0.28 * (i / (pts.length - 1))));
    const pl = makePolyline(pts, radii, FWD);
    const neckGroup = groups.length;
    groups.push({ name: 'hals', kind: 'hals', polyline: pl, bones: [], dorsal: normalize([0, 0.3, -1]) });
    const nb = clamp(Math.round(neckLen / (0.22 * H)), 2, 6);
    let parent = kOben;
    const boneIdx: number[] = [];
    for (let i = 0; i < nb; i++) {
      const s = i / nb;
      const ip = Math.min(pts.length - 1, Math.round(s * (pts.length - 1)));
      const t = pl.tangents[ip]!;
      const fr = frameFromTangent(t, FWD);
      parent = bone(`hals${i}`, parent, pts[ip]!, quatFromFrame(fr.x, fr.y, fr.z), neckGroup);
      boneIdx.push(parent);
    }
    groups[neckGroup]!.bones.push(...boneIdx);
    for (let i = 0; i < nb; i++) {
      const i0 = Math.min(pts.length - 1, Math.round((i / nb) * (pts.length - 1)));
      const i1 = Math.min(pts.length - 1, Math.round(((i + 1) / nb) * (pts.length - 1)));
      prims.push(capsule(pts[i0]!, pts[i1]!, radii[i0]!, radii[i1]!, boneIdx[i]!, 0.45 * rN + 0.03 * H, `hals${i}`));
    }
    const neckEnd = pts[pts.length - 1]!;
    const neckTan = pl.tangents[pts.length - 1]!;
    // Kopfrahmen: vorn = Blickrichtung (Hals-Tangente nach vorn gekippt), Neigung hebt/senkt die Schnauze
    let forwardH = normalize(add(scale(FWD, 1), scale(neckTan, 0.35)));
    forwardH = normalize(add(forwardH, scale(UP, b.kopf.neigung * 0.7)));
    let upH = normalize(sub(UP, scale(forwardH, (UP[0] * forwardH[0] + UP[1] * forwardH[1] + UP[2] * forwardH[2]))));
    const rightH = normalize(cross(upH, forwardH));
    upH = normalize(cross(forwardH, rightH));
    const hr = b.kopf.groesse * 0.33 * H;
    const headCenter = add(add(neckEnd, scale(upH, hr * 0.55)), scale(forwardH, hr * 0.25));
    headGroup = groups.length;
    const headPl = makePolyline([sub(headCenter, scale(forwardH, hr)), add(headCenter, scale(forwardH, hr * b.kopf.laenge))], [hr, hr * 0.8], UP);
    groups.push({ name: 'kopf', kind: 'kopf', polyline: headPl, bones: [], dorsal: upH });
    const headBone = bone('kopf', parent, neckEnd, quatFromFrame(rightH, upH, forwardH), headGroup);
    groups[headGroup]!.bones.push(headBone);
    const headPrim: EllipsoidPrim = { kind: 'ellipsoid', op: 'union', part: headBone, k: 0.45 * hr, region: REGION.haut, name: 'kopf', c: headCenter, r: [hr * 0.92, hr * 0.88, hr * 0.95 * b.kopf.laenge], q: quatFromFrame(rightH, upH, forwardH), kubik: b.koerper.kubik * 0.5 };
    prims.push(headPrim);
    hostBone = headBone;
    host = { origin: sub(headCenter, scale(upH, hr * 0.9)), up: upH, forward: forwardH, right: rightH, height: hr * 1.8, halfWidth: hr * 0.92, bone: headBone, scene: { prims: [] } };
  } else {
    const up = normalize([0, 1, shear]);
    const fwd = normalize(sub(FWD, scale(up, FWD[0] * up[0] + FWD[1] * up[1] + FWD[2] * up[2])));
    host = { origin: [0, yb, 0], up, forward: fwd, right: RIGHT, height: H, halfWidth: R0 * sx, bone: kMitte, scene: { prims: [] } };
  }

  // --- Kiefermassen, Schnauze, Braue am Träger -------------------------------------------------------------------------
  const jawGroup = groups.length;
  groups.push({ name: 'kiefer', kind: 'kiefer', polyline: makePolyline([host.origin, add(host.origin, scale(host.forward, host.halfWidth))], [host.halfWidth * 0.5, host.halfWidth * 0.5], UP), bones: [], dorsal: scale(host.up, -1) });
  const jawBone = bone('unterkiefer', hostBone, host.origin, QUAT_ID, jawGroup);
  groups[jawGroup]!.bones.push(jawBone);

  host.scene = { prims: prims.slice() };
  const m = b.maul;
  const hLip0 = clamp(m.hoehe, 0.02, 0.98) * host.height;
  const prov = surfacePoint(host, hLip0, 0, host.halfWidth * 3 + H);
  const C0 = prov.p;
  const hw = host.halfWidth * 0.85;
  const hh = host.height * 0.5;
  const gap0 = m.oeffnung * 0.32 * host.height * 0.5;
  const fz = host.forward, fy = host.up;
  const jawForm = m.form;
  const maulAn = m.sichtbar;
  if (maulAn && m.oberkiefer > 0.05 && jawForm > 0.04) {
    const c = add(add(C0, scale(fz, hw * (-0.06 + 0.6 * b.kopf.schnauze) * jawForm)), scale(fy, gap0 + hh * 0.3 * m.oberkiefer));
    const e: EllipsoidPrim = { kind: 'ellipsoid', op: 'union', part: hostBone, k: 0.42 * hw, region: REGION.haut, name: 'oberkiefer', c, r: [hw * 0.95 * (0.65 + 0.35 * b.kopf.schnauzeDicke), hh * 0.3 * m.oberkiefer + 0.002, hw * (0.42 + 0.8 * b.kopf.schnauze) * (0.5 + 0.5 * m.oberkiefer) * jawForm], q: quatFromFrame(host.right, host.up, host.forward) };
    prims.push(e);
  }
  if (maulAn && m.unterkiefer > 0.05 && jawForm > 0.04) {
    const c = sub(add(C0, scale(fz, (hw * (0.0 + 0.55 * b.kopf.schnauze) + m.biss * hw * 0.25) * jawForm)), scale(fy, gap0 + hh * 0.18 * m.unterkiefer));
    const e: EllipsoidPrim = { kind: 'ellipsoid', op: 'union', part: jawBone, k: 0.3 * hw, region: REGION.haut, name: 'unterkiefer', c, r: [hw * 0.88 * (0.65 + 0.35 * b.kopf.schnauzeDicke), hh * 0.26 * m.unterkiefer + 0.002, hw * (0.4 + 0.7 * b.kopf.schnauze) * (0.5 + 0.5 * m.unterkiefer) * jawForm], q: quatFromFrame(host.right, host.up, host.forward), kubik: m.kante };
    prims.push(e);
  }
  if (maulAn && b.kopf.braue > 0.02) {
    const c = add(add(C0, scale(fy, hh * 0.6)), scale(fz, hw * 0.05));
    const e: EllipsoidPrim = { kind: 'ellipsoid', op: 'union', part: hostBone, k: 0.3 * hw, region: REGION.haut, name: 'braue', c, r: [hw * 1.05, hh * 0.14 * b.kopf.braue + 0.002, hw * 0.55], q: quatFromFrame(host.right, host.up, host.forward) };
    prims.push(e);
  }
  host.scene = { prims: prims.slice() };

  // --- Maul ----------------------------------------------------------------------------------------------------------
  const mouthBuild = buildMouth(b, host, jawBone, H);
  const mouth = mouthBuild.geometry;
  bones[jawBone]!.pos = mouth.jawHinge.point;
  {
    const x = mouth.jawHinge.axis;
    const z = normalize(sub(mouth.frame.z, scale(x, mouth.frame.z[0] * x[0] + mouth.frame.z[1] * x[1] + mouth.frame.z[2] * x[2])));
    const y = cross(z, x);
    bones[jawBone]!.quat = quatFromFrame(x, y, z);
  }
  if (maulAn) prims.push(...mouthBuild.prims);
  else mouth.teeth.length = 0;

  // --- Augen (Höhlen) ------------------------------------------------------------------------------------------------
  const eyes: EyeSpec[] = [];
  const a = b.augen;
  if (a.anzahl > 0) {
    const phiE = clamp(mouth.theta * (0.25 + 0.4 * a.abstand), 0.2, 1.4);
    const phis = a.anzahl === 1 ? [0] : a.anzahl === 2 ? [-phiE, phiE] : a.anzahl === 3 ? [-phiE * 1.15, 0, phiE * 1.15] : [-phiE * 1.35, -phiE * 0.55, phiE * 0.55, phiE * 1.35];
    const hostH = host.height;
    const hEye = clamp(mouth.hLip + mouth.gapFront * 1.3 + a.hoehe * (hostH - mouth.hLip - mouth.gapFront) * 0.85, 0.05 * hostH, 0.97 * hostH);
    const rE = (0.045 + 0.085 * a.groesse) * hostH;
    const hostScene: SdfScene = { prims: prims.filter((p) => p.op === 'union') };
    const eyeHost: MouthHost = { ...host, scene: hostScene };
    for (const phi of phis) {
      const sp = surfacePoint(eyeHost, hEye, phi, host.halfWidth * 3 + H);
      const e = 0.01 * H;
      const g: Vec3 = [
        evalScene(hostScene, [sp.p[0] + e, sp.p[1], sp.p[2]]) - evalScene(hostScene, [sp.p[0] - e, sp.p[1], sp.p[2]]),
        evalScene(hostScene, [sp.p[0], sp.p[1] + e, sp.p[2]]) - evalScene(hostScene, [sp.p[0], sp.p[1] - e, sp.p[2]]),
        evalScene(hostScene, [sp.p[0], sp.p[1], sp.p[2] + e]) - evalScene(hostScene, [sp.p[0], sp.p[1], sp.p[2] - e]),
      ];
      const nrm = normalize(g);
      eyes.push({ pos: sp.p, normal: nrm, radius: rE, depth: a.tiefe });
      if (a.tiefe > 0.02) {
        const socket: EllipsoidPrim = { kind: 'ellipsoid', op: 'subtract', part: hostBone, k: 0.35 * rE, region: REGION.hoehle, name: 'augenhoehle', c: add(sp.p, scale(nrm, rE * (1 - a.tiefe) * 0.95)), r: [rE * 1.04, rE * 1.04, rE * 1.04] };
        prims.push(socket);
      }
    }
  }

  // --- Beine ---------------------------------------------------------------------------------------------------------
  if (legs) {
    const L = b.unterkoerper.beine;
    const thin = b.unterkoerper.typ === 'vogel' || b.unterkoerper.typ === 'spinneDuenn' ? 0.35 : 1;
    const n = L.anzahl;
    const d2r = Math.PI / 180;
    const azis: number[] =
      n === 2
        ? [-(40 + 35 * L.spreiz) * d2r, (40 + 35 * L.spreiz) * d2r]
        : n === 4
          ? [-(45 + 20 * L.spreiz) * d2r, (45 + 20 * L.spreiz) * d2r, -(135 - 20 * L.spreiz) * d2r, (135 - 20 * L.spreiz) * d2r]
          : [-35, 35, -70, 70, -110, 110, -145, 145].map((x) => x * d2r);
    const rHip = H * (0.06 + 0.1 * L.dicke + 0.1 * L.schenkel) * thin;
    const rKnee = H * (0.05 + 0.08 * L.dicke) * thin;
    const rAnkle = H * (0.04 + 0.06 * L.dicke) * thin;
    const rFoot = H * (0.06 + 0.11 * L.fuss) * (0.6 + 0.4 * L.dicke);
    azis.forEach((phi, i) => {
      const hHip = yb + H * (0.1 + 0.08 * L.laenge);
      const hip: Vec3 = add(axisAt(hHip), [Math.sin(phi) * R0 * sx * 0.68, 0, Math.cos(phi) * R0 * sz * 0.68]);
      const foot: Vec3 = [Math.sin(phi) * R0 * sx * (0.72 + 0.35 * L.spreiz), 0, Math.cos(phi) * R0 * sz * (0.72 + 0.2 * L.spreiz) + 0.04 * H];
      const knee: Vec3 = add(scale(add(hip, foot), 0.5), [Math.sin(phi) * 0.04 * H, 0, 0.1 * legLen + 0.03 * H]);
      const ankle: Vec3 = [foot[0], rFoot * 0.55, foot[2] - 0.03 * H];
      const g = groups.length;
      const pl = makePolyline([hip, knee, ankle, foot], [rHip, rKnee, rAnkle, rFoot * 0.5], FWD);
      groups.push({ name: `bein${i}`, kind: 'bein', polyline: pl, bones: [], dorsal: [0, 1, 0] });
      const bHip = bone(`bein${i}Huefte`, kUnten, hip, QUAT_ID, g);
      const bKnee = bone(`bein${i}Knie`, bHip, knee, QUAT_ID, g);
      const bFoot = bone(`bein${i}Fuss`, bKnee, ankle, QUAT_ID, g);
      groups[g]!.bones.push(bHip, bKnee, bFoot);
      prims.push(capsule(hip, knee, rHip, rKnee, bHip, 0.2 * H * (0.5 + L.schenkel) * thin + 0.02 * H, `bein${i}a`));
      prims.push(capsule(knee, ankle, rKnee, rAnkle, bKnee, 0.1 * H * thin + 0.01 * H, `bein${i}b`));
      const footPrim: EllipsoidPrim = { kind: 'ellipsoid', op: 'union', part: bFoot, k: 0.08 * H, region: REGION.haut, name: `bein${i}fuss`, c: [foot[0], rFoot * 0.42, foot[2]], r: [rFoot * 1.2, rFoot * 0.48, rFoot * 1.4] };
      prims.push(footPrim);
    });
  }

  // --- Schwanz oder Schlange --------------------------------------------------------------------------------------------
  if (b.unterkoerper.typ === 'schlange') {
    const S = b.unterkoerper.schlange;
    const rS = S.dicke * R0 * sm * 0.7;
    const Ls = S.laenge * H * 1.4;
    const z0 = -R0 * sz * 0.55;
    const ctrl: Vec3[] = [];
    const nC = 10;
    for (let i = 0; i <= nC; i++) {
      const t = i / nC;
      const r = rS * (1 - 0.92 * t) + 0.03 * H;
      ctrl.push([S.einrollen * 0.5 * H * Math.sin(t * Math.PI * (1 + S.einrollen * 1.2)) * t, yb + r * 0.98 - yb * t, z0 - Ls * t]);
    }
    const pts = catmullRom(ctrl, 2);
    const radii = pts.map((_p, i) => rS * (1 - 0.92 * (i / (pts.length - 1))) + 0.03 * H);
    const pl = makePolyline(pts, radii, UP);
    const g = groups.length;
    groups.push({ name: 'schlange', kind: 'schlange', polyline: pl, bones: [], dorsal: UP });
    const nb = 8;
    let parent = kUnten;
    const idx: number[] = [];
    for (let i = 0; i < nb; i++) {
      const ip = Math.min(pts.length - 1, Math.round((i / nb) * (pts.length - 1)));
      const fr = frameFromTangent(pl.tangents[ip]!, UP);
      parent = bone(`schlange${i}`, parent, pts[ip]!, quatFromFrame(fr.x, fr.y, fr.z), g);
      idx.push(parent);
    }
    groups[g]!.bones.push(...idx);
    for (let i = 0; i < nb; i++) {
      const i0 = Math.min(pts.length - 1, Math.round((i / nb) * (pts.length - 1)));
      const i1 = Math.min(pts.length - 1, Math.round(((i + 1) / nb) * (pts.length - 1)));
      prims.push(capsule(pts[i0]!, pts[i1]!, radii[i0]!, radii[i1]!, idx[i]!, (i === 0 ? 0.28 : 0.12) * H, `schlange${i}`));
    }
  } else if (b.schwanz.typ !== 'keiner') {
    const T = b.schwanz;
    const hT = yb + H * (0.3 + 0.25 * T.hoch);
    const start: Vec3 = add(axisAt(hT), [0, 0, -R0 * sz * 0.72]);
    const Lt = T.laenge * H * 0.9;
    const r0 = T.typ === 'wirbelsaeule' ? R0 * sm * 0.5 * (0.5 + T.dicke) : H * (0.04 + 0.08 * T.dicke);
    const rTip = T.typ === 'wirbelsaeule' ? 0.03 * H : r0 * 0.55;
    const curl = T.typ === 'bogen' ? 0.8 + 0.4 * T.kruemmung : T.kruemmung;
    const ctrl: Vec3[] = [];
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      ctrl.push([0, start[1] + Lt * (T.hoch * 0.9 * t * t + curl * 0.5 * t * t * t) + (T.typ === 'wirbelsaeule' ? 0 : -Lt * 0.15 * t * (1 - Math.abs(T.hoch))), start[2] - Lt * t * (1 - 0.15 * Math.abs(T.hoch))]);
    }
    const pts = catmullRom(ctrl, 2);
    const radii = pts.map((_p, i) => r0 + (rTip - r0) * (i / (pts.length - 1)));
    const pl = makePolyline(pts, radii, UP);
    const g = groups.length;
    groups.push({ name: 'schwanz', kind: 'schwanz', polyline: pl, bones: [], dorsal: UP });
    const nb = 5;
    let parent = T.typ === 'wirbelsaeule' ? kMitte : kUnten;
    const idx: number[] = [];
    for (let i = 0; i < nb; i++) {
      const ip = Math.min(pts.length - 1, Math.round((i / nb) * (pts.length - 1)));
      const fr = frameFromTangent(pl.tangents[ip]!, UP);
      parent = bone(`schwanz${i}`, parent, pts[ip]!, quatFromFrame(fr.x, fr.y, fr.z), g);
      idx.push(parent);
    }
    groups[g]!.bones.push(...idx);
    for (let i = 0; i < nb; i++) {
      const i0 = Math.min(pts.length - 1, Math.round((i / nb) * (pts.length - 1)));
      const i1 = Math.min(pts.length - 1, Math.round(((i + 1) / nb) * (pts.length - 1)));
      prims.push(capsule(pts[i0]!, pts[i1]!, radii[i0]!, radii[i1]!, idx[i]!, (T.typ === 'wirbelsaeule' ? 0.3 : 0.12) * H, `schwanz${i}`));
    }
  }

  const scene: SdfScene = { prims };
  return { bauplan: b, scene, bones, groups, mouth, eyes, bodyScale: H, bounds: sceneBounds(scene), hostBone, jawBone };
}
