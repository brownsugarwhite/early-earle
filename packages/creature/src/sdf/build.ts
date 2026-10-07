import type { Bauplan } from '../bauplan/schema';
import { catmullRom, makePolyline, type Polyline } from '../math/curve';
import { QUAT_ID, add, clamp, cross, dot, frameFromTangent, normalize, quatFromFrame, scale, sub, type Quat, type Vec3 } from '../math/vec';
import { buildMouth, surfacePoint, type MouthGeometry, type MouthHost } from '../mouth/mouth';
import { REGION, evalScene, makeLoft, sceneBounds, type EllipsoidPrim, type Prim, type SdfScene } from './scene';

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
  /** Knochen, dem das Auge folgt (Oberkiefer, wenn es auf dem Oberkopf sitzt, sonst Träger). */
  bone: number;
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
  /** Index des Trägerknochens (Körpermitte oder Kopf), des Unterkiefer- und des Oberkieferknochens. */
  hostBone: number;
  jawBone: number;
  upperJawBone: number;
}

const UP: Vec3 = [0, 1, 0];
const FWD: Vec3 = [0, 0, 1];
const RIGHT: Vec3 = [1, 0, 0];

/**
 * Radiustabelle des Grundblobs (0 … H, 96 Stützstellen) aus den fünf Querschnitten: flache Standfläche (`boden` =
 * Anteil des Basisradius, der flach aufliegt), weiche Kuppel, Scheitel bei r → 0. Catmull-Rom durch die Stützpunkte.
 */
export function bodyRadii(b: Bauplan, R0: number, H: number, samples = 96): Float64Array {
  const k = b.koerper;
  if (k.profil && k.profil.length >= 8) {
    // Dichtes Breitenprofil (Grundformen der Vorlage): Catmull-Rom über die Stützstellen, unten flach, oben ausgerundet
    const pr = k.profil;
    const n = pr.length;
    const out = new Float64Array(samples);
    for (let i = 0; i < samples; i++) {
      const t = (i / (samples - 1)) * (n - 1);
      const j = Math.min(n - 2, Math.max(0, Math.floor(t)));
      const f = t - j;
      const p0 = pr[Math.max(0, j - 1)]!, p1 = pr[j]!, p2 = pr[j + 1]!, p3 = pr[Math.min(n - 1, j + 2)]!;
      const f2 = f * f, f3 = f2 * f;
      const w = 0.5 * (2 * p1 + (-p0 + p2) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f2 + (-p0 + 3 * p1 - 3 * p2 + p3) * f3);
      out[i] = Math.max(0, w) * R0 * (1 + 0.25 * (k.bauch > 0 ? 0 : k.bauch) * Math.exp(-Math.pow((i / samples - 0.25) / 0.2, 2)));
    }
    // Würfeligkeit hebt den obersten Wert, sonst Scheitel → 0
    out[samples - 1] = Math.max(out[samples - 1]!, out[samples - 2]! * 0.95 * k.kubik);
    if (k.kubik < 0.02) out[samples - 1] = 0;
    return out;
  }
  const q = k.querschnitte.slice() as [number, number, number, number, number];
  if (k.bauch < 0) q[1] *= 1 + 0.3 * k.bauch;
  if (k.buckel < 0) q[3] *= 1 + 0.3 * k.buckel;
  const r = q.map((x) => x * R0);
  // würfelig: der oberste Querschnitt wächst zum darunterliegenden (flacher, breiter Deckel)
  r[4] = r[4]! + (r[3]! * 0.97 - r[4]!) * clamp(k.kubik, 0, 1);
  const boden = clamp(k.boden, 0, 1);
  // Stützpunkte (y, r): Standkante, dann die Querschnitte, dann der Scheitel
  const ctrl: Array<[number, number]> = [
    [0, r[0]! * (0.55 + 0.42 * boden)],
    [H * 0.06 * (1.3 - boden), r[0]!],
    [H * 0.25, r[1]!],
    [H * 0.5, r[2]!],
    [H * 0.75, r[3]!],
    [H * 0.9, r[4]!],
    // Scheitel: rund → elliptische Kappe (Steigung → ∞), würfelig → Radius bleibt bis oben (flacher Deckel)
    [H * 0.95, r[4]! * (0.86 + 0.12 * k.kubik)],
    [H * 0.98, r[4]! * (0.6 + 0.37 * k.kubik)],
    [H * 0.995, r[4]! * (0.3 + 0.66 * k.kubik)],
    [H, r[4]! * 0.95 * k.kubik],
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
  out[samples - 1] = r[4]! * 0.95 * k.kubik;
  return out;
}

export function construct(b: Bauplan, resolution = 56): Construction {
  const H = b.koerper.hoehe;
  // grobe Zellgröße der späteren Vermaschung (Hülle ≈ 2,6 · H), für Mindestspalt und Schnittrundung
  const cellSize = (H * 2.6) / resolution;
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
  // Körper als **Profil-Loft**: Breite aus dem Breitenprofil (Grundformen), Tiefe vorn (Bauchlinie) und hinten
  // (Rückenlinie) getrennt — Bauch und Buckel verformen die Kurven statt Kugeln anzukleben (Bild 2/3: gezeichnete Silhouette).
  // Mit Hals wird der Körper oben in den Hals geführt (ein Loft, Tropfenkörper ohne Schulterstufe wie bei der Giraffe).
  const neckLen = b.hals.laenge * H;
  const hasNeck = neckLen > 0.02 * H;
  const bodyPts: Vec3[] = [];
  const bodyWx: number[] = [], bodyWyT: number[] = [], bodyWyB: number[] = [], bodyN: number[] = [], bodyParts: number[] = [];
  const kub = clamp(b.koerper.kubik, 0, 1);
  {
    const nS = radii.length;
    for (let i = 0; i < nS; i++) {
      const t = i / (nS - 1);
      bodyPts.push(axisAt(yb + t * H));
      const r = radii[i]!;
      // Bauch: Wölbung vorn unten; Buckel: Wölbung hinten oben (negativ = abgeflacht)
      const belly = b.koerper.bauch * 0.5 * Math.exp(-Math.pow((t - 0.3) / 0.24, 2));
      const hump = b.koerper.buckel * 0.45 * Math.exp(-Math.pow((t - 0.66) / 0.24, 2));
      bodyWx.push(r * sx);
      bodyWyT.push(r * sz * Math.max(0.35, 1 + belly));
      bodyWyB.push(r * sz * Math.max(0.35, 1 + hump));
      bodyN.push(2 + 6 * kub);
      bodyParts.push(t < 0.3 ? kUnten : t < 0.68 ? kMitte : kOben);
    }
  }
  const bodyCapStart = 0.03 * H * (0.6 + 0.8 * (1 - b.koerper.boden));
  if (!hasNeck) {
    prims.push(makeLoft({ points: bodyPts, upRef: FWD, wx: bodyWx, wyT: bodyWyT, wyB: bodyWyB, n: bodyN, parts: bodyParts, capStart: bodyCapStart, capEnd: kub > 0.02 ? 0.12 * H * kub : 0, axis: normalize([0, 1, shear]) }, { op: 'union', part: kMitte, k: 0.1 * H, region: REGION.haut, name: 'koerper' }));
  }

  // --- Hals und Kopf ------------------------------------------------------------------------------------------------
  const m0 = b.maul;
  let hostBone = kMitte;
  let host: MouthHost | null = null;
  let headGroup = -1;
  if (hasNeck) {
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
    const radii = pts.map((_p, i) => rN * (1 - 0.42 * (i / (pts.length - 1))));
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
    // Körper + Hals als **ein** Loft: die obersten Körperstationen führen Mitte und Radius zur Halsbasis (Tropfen ohne
    // Schulterstufe, Bild 6), dann folgen die Halsstationen mit ihren Knochen; der Kopf schließt oben an
    {
      const rBase = radii[0]! * 1.15;
      const pts2: Vec3[] = [], wx2: number[] = [], wyT2: number[] = [], wyB2: number[] = [], n2: number[] = [], parts2: number[] = [];
      const nB = bodyPts.length;
      for (let i = 0; i < nB; i++) {
        const t = i / (nB - 1);
        const y = bodyPts[i]![1];
        if (y > hb - 1e-6) break;
        // Tropfen: ab 35 % Höhe stetig in den Hals verjüngen (Bild 6: keine Schulterstufe)
        const w = t <= 0.35 ? 0 : (() => { const u = (t - 0.35) / Math.max(1e-6, (hb - yb) / H - 0.35); const c = clamp(u, 0, 1); return c * c * (3 - 2 * c); })();
        const c: Vec3 = [bodyPts[i]![0] + (base[0] - bodyPts[i]![0]) * w, y, bodyPts[i]![2] + (base[2] - bodyPts[i]![2]) * w];
        pts2.push(c);
        wx2.push(bodyWx[i]! + (rBase - bodyWx[i]!) * w);
        wyT2.push(bodyWyT[i]! + (rBase - bodyWyT[i]!) * w);
        wyB2.push(bodyWyB[i]! + (rBase - bodyWyB[i]!) * w);
        n2.push(bodyN[i]! + (2 - bodyN[i]!) * w);
        parts2.push(bodyParts[i]!);
      }
      for (let i = 0; i < pts.length; i++) {
        const u = i / (pts.length - 1);
        const r = i === 0 ? rBase : radii[i]!;
        pts2.push(pts[i]!);
        wx2.push(r);
        wyT2.push(r);
        wyB2.push(r);
        n2.push(2);
        parts2.push(boneIdx[Math.min(nb - 1, Math.floor(u * nb))]!);
      }
      prims.push(makeLoft({ points: pts2, upRef: FWD, wx: wx2, wyT: wyT2, wyB: wyB2, n: n2, parts: parts2, capStart: bodyCapStart, axis: UP }, { op: 'union', part: kMitte, k: 0.1 * H, region: REGION.haut, name: 'koerper' }));
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
    const ok = clamp(m0.oberkiefer, 0.05, 1.5);
    const uk = clamp(m0.unterkiefer, 0, 1.5);
    const schn = clamp(b.kopf.schnauze, 0, 1);
    const dick = clamp(b.kopf.schnauzeDicke, 0.3, 1.2);
    // Mittellinie des Kopfs: vom Hinterkopf nach vorn bis zur Schnauzenspitze, auf Höhe der Maullinie
    const headBase = add(neckEnd, scale(upH, hr * 0.45));
    const Lback = hr * 0.85;
    const Lfront = hr * (0.95 + 0.9 * (b.kopf.laenge - 1) + 0.7 * schn);
    const headCenter = add(headBase, scale(forwardH, (Lfront - Lback) * 0.5));
    headGroup = groups.length;
    const headPl = makePolyline([sub(headBase, scale(forwardH, Lback)), add(headBase, scale(forwardH, Lfront))], [hr, hr * 0.8], UP);
    groups.push({ name: 'kopf', kind: 'kopf', polyline: headPl, bones: [], dorsal: upH });
    const headBone = bone('kopf', parent, neckEnd, quatFromFrame(rightH, upH, forwardH), headGroup);
    groups[headGroup]!.bones.push(headBone);
    {
      // Profile (Bild 5/11): Schädel hinten hoch, Brauenwulst, Schnauze läuft nach vorn aus; Kiefer unten als Löffel
      const nS = 40;
      const pts: Vec3[] = [];
      const wx: number[] = [], wyT: number[] = [], wyB: number[] = [], nn: number[] = [];
      const braue = clamp(b.kopf.braue, 0, 1);
      for (let i = 0; i < nS; i++) {
        const u = i / (nS - 1); // 0 Hinterkopf … 1 Schnauzenspitze
        pts.push(add(headBase, scale(forwardH, -Lback + (Lback + Lfront) * u)));
        const endRound = Math.sqrt(Math.max(0, 1 - Math.pow((u - 0.5) / 0.5, 6))); // runde Enden
        // Bild 5/11: Schädel hinten hoch mit flachem Scheitel, Braue als breiter Wulst über den Augen, Schnauze fällt nach
        // vorn ab und bleibt breit (Haube); Unterkiefer als Löffel, zur Kinnspitze flacher
        const width = hr * (0.74 + 0.3 * Math.exp(-Math.pow((u - 0.4) / 0.32, 2))) * (1 - (1 - dick) * Math.max(0, u - 0.55) * 1.6);
        const skull = hr * (0.55 + 0.5 * ok) * (1 - 0.5 * Math.max(0, (u - 0.4) / 0.6) ** 1.4) * (1 + 0.28 * braue * Math.exp(-Math.pow((u - 0.4) / 0.18, 2)));
        const jaw = hr * (0.42 + 0.42 * uk) * (1 - 0.4 * Math.max(0, (u - 0.45) / 0.55) ** 1.4);
        wx.push(width * endRound);
        wyT.push(skull * endRound);
        wyB.push(jaw * endRound);
        // flacherer Scheitel und Wangen über die Kieferkante (Raubkatze kantig), Rex leicht
        nn.push(2.2 + 1.6 * clamp(m0.kante, 0, 1));
      }
      const head = makeLoft({ points: pts, upRef: upH, wx, wyT, wyB, n: nn, parts: headBone, axis: forwardH }, { op: 'union', part: headBone, k: 0.35 * hr, region: REGION.haut, name: 'kopf' });
      prims.push(head);
    }
    hostBone = headBone;
    host = { origin: sub(headCenter, scale(upH, hr * (0.42 + 0.42 * uk))), up: upH, forward: forwardH, right: rightH, height: hr * (0.42 + 0.42 * uk + 0.55 + 0.5 * ok), halfWidth: hr * 0.95, bone: headBone, scene: { prims: [] } };
  } else {
    const up = normalize([0, 1, shear]);
    const fwd = normalize(sub(FWD, scale(up, FWD[0] * up[0] + FWD[1] * up[1] + FWD[2] * up[2])));
    host = { origin: [0, yb, 0], up, forward: fwd, right: RIGHT, height: H, halfWidth: R0 * sx, bone: kMitte, scene: { prims: [] } };
  }

  // --- Kiefermassen, Schnauze, Braue am Träger -------------------------------------------------------------------------
  const jawGroup = groups.length;
  groups.push({ name: 'kiefer', kind: 'kiefer', polyline: makePolyline([host.origin, add(host.origin, scale(host.forward, host.halfWidth))], [host.halfWidth * 0.5, host.halfWidth * 0.5], UP), bones: [], dorsal: scale(host.up, -1) });
  const jawBone = bone('unterkiefer', hostBone, host.origin, QUAT_ID, jawGroup);
  const upperJawBone = bone('oberkiefer', hostBone, host.origin, QUAT_ID, jawGroup);
  groups[jawGroup]!.bones.push(jawBone, upperJawBone);

  host.scene = { prims: prims.slice() };
  host.scene = { prims: prims.slice() };
  const maulAn = m0.sichtbar;

  // --- Maul ----------------------------------------------------------------------------------------------------------
  const mouthBuild = buildMouth(b, host, jawBone, H, cellSize);
  const mouth = mouthBuild.geometry;
  {
    const x = mouth.jawHinge.axis;
    const z = normalize(sub(mouth.frame.z, scale(x, mouth.frame.z[0] * x[0] + mouth.frame.z[1] * x[1] + mouth.frame.z[2] * x[2])));
    const y = cross(z, x);
    for (const bi of [jawBone, upperJawBone]) {
      bones[bi]!.pos = mouth.jawHinge.point;
      bones[bi]!.quat = quatFromFrame(x, y, z);
    }
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
      eyes.push({ pos: sp.p, normal: nrm, radius: rE, depth: a.tiefe, bone: maulAn && mouth.upperWeight(sp.p, H) > 0.5 ? upperJawBone : hostBone });
      // Augenwulst (Braue): weiche Masse über dem Auge, die Höhle schneidet darunter hart → scharfe Überhangkante (Bild 11)
      if (b.kopf.braue > 0.02) {
        const upE = normalize(sub(host.up, scale(nrm, dot(host.up, nrm))));
        const rightE = normalize(cross(upE, nrm));
        const c = add(add(sp.p, scale(nrm, rE * 0.1)), scale(upE, rE * (0.85 + 0.3 * b.kopf.braue)));
        const ridge: EllipsoidPrim = { kind: 'ellipsoid', op: 'union', part: hostBone, k: 0.55 * rE, region: REGION.haut, name: 'augenwulst', c, r: [rE * (1.3 + 0.6 * b.kopf.braue), rE * (0.25 + 0.4 * b.kopf.braue), rE * 1.0], q: quatFromFrame(rightE, upE, nrm) };
        prims.push(ridge);
      }
      if (a.tiefe > 0.02 || b.kopf.braue > 0.02 || a.typ !== 'schlitz') {
        // ohne Augapfel (K3) nur flach einsenken: der Wulst macht die Kante, die Höhle bleibt lesbar
        const typDepth = a.typ === 'drache' || a.typ === 'schlange' ? 0.62 : a.typ === 'schwarzweiss' ? 0.45 : a.typ === 'gross' ? 0.3 : 0;
        const depth = Math.max(a.tiefe, b.kopf.braue * 0.22, typDepth);
        const socket: EllipsoidPrim = { kind: 'ellipsoid', op: 'subtract', part: hostBone, k: 0.08 * rE, region: REGION.hoehle, name: 'augenhoehle', c: add(sp.p, scale(nrm, rE * (1 - depth) * 0.95)), r: [rE * 1.04, rE * 1.04, rE * 1.04] };
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
      // Bein als ein Loft: Ansatz tief im Körper (breit, „geknetet“), Schenkel, Knie, Knöchel, Fußpolster als Saugnapf
      // mit flacher Standfläche; Zehen nach vorn (Querschnitt vorn länger)
      const hipTop: Vec3 = add(hip, [0, rHip * 0.9, 0]);
      const ctrl: Vec3[] = [hipTop, hip, knee, ankle, [foot[0], rFoot * 0.35, foot[2]], [foot[0], 0, foot[2]]];
      const rr = [rHip * (1.25 + 0.4 * L.schenkel), rHip * (1 + 0.3 * L.schenkel), rKnee, rAnkle, rFoot * 1.1, rFoot * 1.25];
      const pts = catmullRom(ctrl, 4);
      const nP = pts.length;
      const idxOf = (k: number): number => Math.min(nP - 1, Math.round((k / (ctrl.length - 1)) * (nP - 1)));
      const radAt = (j: number): number => {
        // Catmull-Rom über die Kontrollradien, gleiche Parametrisierung wie die Punkte
        const t = (j / (nP - 1)) * (ctrl.length - 1);
        const k = Math.min(ctrl.length - 2, Math.floor(t));
        const f = t - k;
        const r0 = rr[Math.max(0, k - 1)]!, r1 = rr[k]!, r2 = rr[k + 1]!, r3 = rr[Math.min(ctrl.length - 1, k + 2)]!;
        const f2 = f * f, f3 = f2 * f;
        return Math.max(0.004, 0.5 * (2 * r1 + (-r0 + r2) * f + (2 * r0 - 5 * r1 + 4 * r2 - r3) * f2 + (-r0 + 3 * r1 - 3 * r2 + r3) * f3));
      };
      const wx: number[] = [], wyT: number[] = [], wyB: number[] = [], parts: number[] = [];
      for (let j = 0; j < nP; j++) {
        const r = radAt(j);
        const footness = clamp((j - idxOf(3)) / Math.max(1, idxOf(5) - idxOf(3)), 0, 1);
        wx.push(r * (1 + 0.15 * footness));
        wyT.push(r * (1 + 0.5 * footness));
        wyB.push(r);
        parts.push(j < idxOf(2) ? bHip : j < idxOf(3) ? bKnee : bFoot);
      }
      prims.push(makeLoft({ points: pts, upRef: FWD, wx, wyT, wyB, n: 2, parts, capEnd: rFoot * 0.35, axis: [0, -1, 0] }, { op: 'union', part: bHip, k: 0.16 * H * (0.5 + L.schenkel) * thin + 0.02 * H, region: REGION.haut, name: `bein${i}` }));
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
    {
      const parts = pts.map((_p, i) => idx[Math.min(nb - 1, Math.floor((i / pts.length) * nb))]!);
      // Bauchseite flach (Schlange liegt auf), Rücken rund
      prims.push(makeLoft({ points: pts, upRef: UP, wx: radii, wyT: radii, wyB: radii.map((r) => r * 0.85), n: 2.3, parts }, { op: 'union', part: idx[0]!, k: 0.22 * H, region: REGION.haut, name: 'schlange' }));
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
    {
      const parts = pts.map((_p, i) => idx[Math.min(nb - 1, Math.floor((i / pts.length) * nb))]!);
      // Rex-Schwanz: Wirbelsäule läuft breit aus dem Körper (Bild 5/12), Anhang: dünn mit Quaste
      const flare = pts.map((_p, i) => (T.typ === 'wirbelsaeule' ? 1 + 0.5 * Math.exp(-Math.pow((i / (pts.length - 1)) / 0.2, 2)) : 1));
      const w = radii.map((r, i) => r * flare[i]!);
      prims.push(makeLoft({ points: pts, upRef: UP, wx: w, wyT: w.map((r) => r * 1.05), wyB: w, n: 2, parts }, { op: 'union', part: idx[0]!, k: (T.typ === 'wirbelsaeule' ? 0.22 : 0.1) * H, region: REGION.haut, name: 'schwanz' }));
    }
  }

  const scene: SdfScene = { prims };
  return { bauplan: b, scene, bones, groups, mouth, eyes, bodyScale: H, bounds: sceneBounds(scene), hostBone, jawBone, upperJawBone };
}
