import type { Bauplan } from '../bauplan/schema';
import { catmullRom, makePolyline, type Polyline } from '../math/curve';
import { QUAT_ID, add, clamp, cross, dot, frameFromTangent, lerp, normalize, quatFromFrame, scale, smoothstep, sub, type Quat, type Vec3 } from '../math/vec';
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
  /** Kehlkette unter dem Unterkiefer: zwei Knochen am Gelenk mit ⅔ und ⅓ des Kieferwinkels (weiche Biegung). */
  throatBones: [number, number];
  /** Nackenkette hinter dem Oberkiefer: zwei Knochen am Gelenk mit ⅔ und ⅓ des Oberkieferwinkels. */
  napeBones: [number, number];
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

/**
 * Kopf im Rumpf (Bild 2, 5, 9, 12: Rex, Katze, Fisch): ohne Hals ist der Kopf das obere Vorderteil des Grundblobs — eine
 * Masse, keine aufgesetzte Kugel (Grundblob mit Maullinie). Landmarken um die Maullinie formen das Dome-Profil:
 * Schnauze (Oberkiefer) und Kinn (Unterkiefer) als Vorsprünge nach vorn, Kehle als Mulde unter dem Kinn (nur bei großem
 * Kopf), Kopfband breiter/tiefer nach Kopfgröße, Ei-Querschnitte machen das Gesicht schmaler als die Schultern (dünne
 * Schnauze), kantige Kiefer über den Exponenten. Mit Standardwerten bleibt der Dome unverändert. Alles stetig in der
 * Höhe — die Maullinie wird später als Schnitt in diese Fläche gelegt. Liefert Kinn- und Lippenhöhe (Anteil von H) für
 * Kiefertiefe und Kopfhöhe des Rigs. Katzen, Hunde, Rex mit eigenem Kopfvolumen: kurzer Hals (`hals.laenge` > 0).
 */
export function kopfImRumpf(b: Bauplan, R0: number, sz: number, shear: number, wx: number[], wyT: number[], wyB: number[], nn: number[], taper: number[]): { hLo: number; tL: number } {
  const m = b.maul;
  const k = b.kopf;
  const n = wx.length;
  const tL = clamp(m.hoehe, 0.02, 0.98) / Math.sqrt(1 + shear * shear);
  const ok = clamp(m.oberkiefer, 0, 1.5);
  const uk = clamp(m.unterkiefer, 0, 1.5);
  const hUp = 0.12 + 0.2 * ok;
  const hLo = uk < 0.05 ? 0 : 0.08 + 0.16 * uk;
  if (!m.sichtbar) return { hLo, tL };
  // Schnauzenvorsprung in Blob-Einheiten: Kopflänge streckt den ganzen Kopf, Schnauze nur den Vorsprung
  const S = R0 * sz * (0.3 * (k.laenge - 1) + 0.5 * clamp(k.schnauze, 0, 1));
  const biss = clamp(m.biss, -1, 1);
  // Kinn: Überbiss setzt den Unterkiefer zurück (W-Lippe der Katze), Unterbiss schiebt ihn vor (Hauer)
  const C = uk < 0.05 ? 0 : S * (1 - 0.35 * biss) - 0.08 * R0 * sz * biss;
  const mass = clamp((k.groesse - 0.7) * 0.3, -0.15, 0.45);
  const kante = clamp(m.kante, 0, 1);
  // Kehle: je größer der Kopf, desto weiter hängt das Kinn über der Brust; ohne Unterkiefer liegt die Öffnung am Hals
  const kehle = (uk < 0.05 ? 0.22 : 0.25 * Math.max(0, k.groesse - 0.7)) * R0 * sz;
  // Gesicht schmaler als die Schultern: Ei-Querschnitte im Kopfband, Verjüngung aus einer dünnen Schnauze (< 0,7)
  const verj = clamp((0.7 - clamp(k.schnauzeDicke, 0.3, 1.2)) * 1.2, 0, 0.5);
  const rampLo = 0.1 * (1 - 0.6 * kante);
  const tChin = tL - hLo;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const band = smoothstep(tChin - 0.1, tChin + 0.02, t);
    // Oberkiefer/Schnauze: voll an der Lippe, Plateau, dann zur Stirn auslaufend
    const up = smoothstep(tL - 0.02, tL + 0.02, t) * (1 - smoothstep(tL + hUp * 0.75, tL + hUp * 1.25, t));
    // Unterkiefer/Kinn: voll an der Lippe, Plateau, rundes (Rex) oder kantiges (Katze) Kinn
    const lo = (1 - smoothstep(tL - 0.02, tL + 0.02, t)) * smoothstep(tChin - 0.5 * rampLo, tChin + 0.5 * rampLo, t);
    const tKehle = tChin - 0.5 * rampLo - 0.07;
    const dip = Math.exp(-Math.pow((t - tKehle) / 0.08, 2));
    // an Standfläche und Scheitel läuft jeder Vorsprung aus (die Enden bleiben rund)
    const ends = smoothstep(0, 0.1, t) * (1 - smoothstep(0.88, 1, t));
    const front = (S * up + C * lo - kehle * dip) * ends;
    wx[i] = wx[i]! * (1 + mass * band);
    wyT[i] = Math.max(0.3 * wx[i]!, wyT[i]! * (1 + mass * band) + front);
    wyB[i] = wyB[i]! * (1 + 0.4 * mass * band);
    nn[i] = nn[i]! + 1.5 * kante * Math.min(1, up + lo);
    taper[i] = verj * band;
  }
  return { hLo, tL };
}

export function construct(b: Bauplan, resolution = 56): Construction {
  const H = b.koerper.hoehe;
  // grobe Zellgröße der späteren Vermaschung (Hülle ≈ 2,6 · H), für Mindestspalt und Schnittrundung
  void resolution;
  const R0 = 0.5 * H;
  const sx = b.koerper.breite;
  const sz = b.koerper.laenge;
  const sm = Math.sqrt(sx * sz);
  // Neigung: die waagerechten Scheiben wandern mit der Höhe nach vorn (Standfläche bleibt flach, Rücken wird zur
  // geraden Schräge — Bild 2: der Rex ist ein vornüber geneigter Grundblob)
  const shear = b.koerper.neigung * 0.5;
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
  // Bogen: S-Schwung der Mittellinie (Mitte nach hinten/vorn), dazu die lineare Neigung
  const bogen = clamp(b.koerper.bogen, -1, 1);
  const axisAt = (y: number): Vec3 => {
    const t = clamp((y - yb) / H, 0, 1);
    return [0, y, shear * (y - yb) + bogen * 0.3 * H * Math.sin(Math.PI * t)];
  };
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
  const bodyWx: number[] = [], bodyWyT: number[] = [], bodyWyB: number[] = [], bodyN: number[] = [], bodyParts: number[] = [], bodyTaper: number[] = [];
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
      bodyTaper.push(0);
    }
  }
  const bodyCapStart = 0.03 * H * (0.6 + 0.8 * (1 - b.koerper.boden));
  let kinnHoehe = 0;
  let kopfHoehe = H;
  if (!hasNeck) {
    // Kopf im Rumpf: Landmarken um die Maullinie formen das Profil (Schnauze, Kinn, Kehle, Kopfband) — ein Loft
    const kr = kopfImRumpf(b, R0, sz, shear, bodyWx, bodyWyT, bodyWyB, bodyN, bodyTaper);
    kinnHoehe = kr.hLo;
    // Kopfhöhe Kinn … Scheitel (Maße für Öffnung, Linienschwung, Augen)
    kopfHoehe = b.maul.sichtbar ? H * (1 - clamp(kr.tL - kr.hLo, 0, 0.9)) : H;
    prims.push(makeLoft({ points: bodyPts, upRef: FWD, wx: bodyWx, wyT: bodyWyT, wyB: bodyWyB, n: bodyN, parts: bodyParts, taper: bodyTaper, capStart: bodyCapStart, capEnd: kub > 0.02 ? 0.12 * H * kub : 0, axis: UP }, { op: 'union', part: kMitte, k: 0.1 * H, region: REGION.haut, name: 'koerper' }));
  }

  // --- Hals und Kopf ------------------------------------------------------------------------------------------------
  const m0 = b.maul;
  let hostBone = kMitte;
  let host: MouthHost | null = null;
  let headGroup = -1;
  if (hasNeck) {
    const ansatz = b.hals.ansatz;
    // Halsgewicht: kurze Hälse (Rex) sitzen mittig auf dem Rumpf und übernehmen dessen Radius, lange (Giraffe) folgen
    // Ansatz und Halsdicke — stetig geblendet, damit Mittellinie und Profil keinen Absatz bekommen
    const tN = (() => { const u = clamp((b.hals.laenge - 0.08) / 0.5, 0, 1); return u * u * (3 - 2 * u); })();
    const hb = yb + H * (0.97 - 0.1 * Math.abs(ansatz - 0.5) * 2 * tN);
    // Halsansatz vorn/hinten gilt auch für kurze Hälse: Katze und Rex tragen den Kopf vorn über der Brust (Bild 5/9)
    const base: Vec3 = add(axisAt(hb), [0, 0, (ansatz - 0.5) * R0 * sz * 1.3]);
    const rN = b.hals.dicke * R0 * 0.62 * sm;
    const kr = b.hals.kruemmung;
    const ctrl: Vec3[] = [];
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      // S-Bogen mit waagerechter Tangente am Ansatz (sin², kein Knick zur senkrechten Rumpfachse) und leichter Neigung nach vorn
      const f = neckLen * (0.18 * t * t - kr * 0.35 * Math.pow(Math.sin(Math.PI * t), 2));
      ctrl.push([base[0], base[1] + neckLen * t, base[2] + f]);
    }
    const pts = catmullRom(ctrl, 3);
    // Körperradius am Halsansatz (Mittel der Halbachsen der obersten Rumpfstation unter hb)
    let rTop = rN * 1.15;
    for (let i = bodyPts.length - 1; i >= 0; i--) {
      if (bodyPts[i]![1] <= hb - 1e-6) {
        rTop = (bodyWx[i]! + bodyWyT[i]! + bodyWyB[i]!) / 3;
        break;
      }
    }
    const rBaseEff = rTop + (rN * 1.15 - rTop) * tN;
    // Hals verjüngt sich nach oben und weitet sich im letzten Drittel wieder in den Hinterkopf (Tropfen Hals → Kopf,
    // Bild 6): der Kopf sitzt nicht auf einem Stiel, die Rückenlinie des Halses läuft in den Schädel
    const hrNeck = b.kopf.groesse * 0.33 * H;
    const rNeckTop = rN * 0.58;
    const flare = Math.max(0, (hrNeck * 0.62) / Math.max(1e-6, rNeckTop) - 1);
    const radii = pts.map((_p, i) => {
      const t = i / (pts.length - 1);
      const sw = Math.pow(clamp((t - 0.55) / 0.45, 0, 1), 1.6);
      return (rBaseEff + (rNeckTop - rBaseEff) * t) * (1 + flare * sw);
    });
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
      const rBase = radii[0]!;
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
        const r = radii[i]!;
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
    // Blickrichtung: vorn, nur leicht der Halstangente folgend; `neigung` hebt oder senkt die Schnauze (Giraffe waagerecht)
    let forwardH = normalize(add(scale(FWD, 1), scale(neckTan, 0.12)));
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
    // Hals trifft den Kopf im hinteren Drittel: Kopfbasis etwas nach vorn, damit der Hinterkopf den Hals fortsetzt
    // Kurzer Hals (Rex, Katze): der Kopf sitzt mit der Mitte knapp über den Schultern und ragt vorn über die Brust —
    // die Rückenlinie läuft über die Schulter in den Hinterkopf (Bild 5/9), das Kinn hängt frei
    const headBase = add(add(neckEnd, scale(upH, hr * (0.4 - 0.1 * (1 - tN)))), scale(forwardH, hr * (0.3 + 0.1 * (1 - tN))));
    const Lback = hr * 0.85;
    const Lfront = hr * (1.05 + 0.9 * (b.kopf.laenge - 1) + 0.8 * schn);
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
      const wx: number[] = [], wyT: number[] = [], wyB: number[] = [], nn: number[] = [], nB: number[] = [];
      const braue = clamp(b.kopf.braue, 0, 1);
      for (let i = 0; i < nS; i++) {
        const u = i / (nS - 1); // 0 Hinterkopf … 1 Schnauzenspitze
        pts.push(add(headBase, scale(forwardH, -Lback + (Lback + Lfront) * u)));
        // runde Enden; kantige Kiefer (Raubkatze) haben eine flachere Schnauzenfront
        const kanteK = clamp(m0.kante, 0, 1);
        const endRound = Math.sqrt(Math.max(0, 1 - Math.pow(Math.abs(u - 0.5) / 0.5, u > 0.5 ? 6 + 8 * kanteK : 6)));
        // Bild 5/11: Schädel hinten hoch mit flachem Scheitel, Braue als breiter Wulst über den Augen, Schnauze fällt nach
        // vorn ab und bleibt breit (Haube); Unterkiefer als Löffel, zur Kinnspitze flacher
        // Wangen: breite Backen unter den Augen (Katze, Bild 9) — die Breite wächst im hinteren Kopfdrittel bis zur Schnauzenwurzel
        const wangen = clamp(b.kopf.wangen, 0, 1);
        const width = hr * (0.74 + 0.3 * Math.exp(-Math.pow((u - 0.4) / 0.32, 2))) * (1 - (1 - dick) * Math.max(0, u - 0.55) * 1.6) * (1 + 0.35 * wangen * Math.exp(-Math.pow((u - 0.38) / 0.26, 2)));
        // Stirn flach bis zur Braue, dann Abfall zur Schnauzenspitze: lange Schnauze fällt ab u ≈ 0,5 gerade ab (Rex,
        // Giraffe), ohne Schnauze bleibt der Schädel bis u ≈ 0,8 hoch und rundet kugelig ab (Katze, Bild 9)
        const u0 = 0.5 + 0.3 * (1 - schn);
        const slope = Math.pow(Math.max(0, (u - u0) / (1 - u0)), 1.3);
        // Nase: runde Wölbung vorn oben auf der Schnauze (Giraffe, Bild 6), wächst mit der Schnauzenlänge
        const nase = 0.5 * schn * Math.exp(-Math.pow((u - 0.84) / 0.14, 2));
        // Stirn: hohe runde Stirn hinten (Hund) oder flacher Schädel (Rex)
        const stirn = clamp(b.kopf.stirn, -1, 1);
        const skull = hr * (0.55 + 0.5 * ok) * (1 - 0.62 * slope + nase) * (1 + 0.3 * braue * Math.exp(-Math.pow((u - 0.5) / 0.16, 2))) * (1 + 0.28 * stirn * (1 - u) * (1 - u));
        // Unterkiefer als Löffel; kantig: flaches Kinn, das bis zur Schnauzenfront durchläuft (Bild 9: eckiges Kinn)
        const jaw = hr * (0.42 + 0.42 * uk) * (1 - 0.3 * (1 - 0.85 * kanteK) * Math.max(0, (u - 0.5) / 0.5) ** 1.6);
        wx.push(width * endRound);
        wyT.push(skull * endRound);
        wyB.push(jaw * endRound);
        // Kieferkante: Schnauze und Kinn kantig (Raubkatze, Bild 9), der Schädel hinten bleibt rund
        // Schädel (obere Hälfte) bleibt rund; Kiefer und Schnauze (untere Hälfte) werden zur Front hin kantig
        nn.push(2.1 + 0.6 * kanteK * smoothstep(0.6, 0.95, u));
        nB.push(2.1 + 3.4 * kanteK * smoothstep(0.35, 0.7, u));
      }
      // Verschmelzung klein genug, dass Kanten und Schnauze des Kopfs stehen bleiben (kantige Raubkatze); der Übergang
      // zur Schulter kommt aus der Überlappung von Kopf und Rumpf, nicht aus einem großen Rundungsradius
      const head = makeLoft({ points: pts, upRef: upH, wx, wyT, wyB, n: nn, nB, parts: headBone, axis: forwardH }, { op: 'union', part: headBone, k: hr * (0.22 + 0.18 * (1 - tN)), region: REGION.haut, name: 'kopf' });
      prims.push(head);
      // Ohren: flache Lappen seitlich hinten oben, nach außen-hinten geneigt (Giraffe, Dackel); Hörnchen: zwei kurze
      // Stiele mit Knopf oben hinten (Giraffe) — einfache Anbauten direkt am Kopf
      const ohren = clamp(b.kopf.ohren, 0, 1);
      if (ohren > 0.02) {
        for (const side of [-1, 1] as const) {
          const u0 = 0.3;
          const basis = add(add(headBase, scale(forwardH, -Lback + (Lback + Lfront) * u0)), scale(rightH, side * hr * 0.75));
          const c = add(add(basis, scale(rightH, side * hr * 0.45 * ohren)), scale(upH, hr * 0.25));
          const dir = normalize(add(add(scale(rightH, side * 0.8), scale(upH, 0.35)), scale(forwardH, -0.45)));
          const ear: EllipsoidPrim = { kind: 'ellipsoid', op: 'union', part: headBone, k: 0.2 * hr, region: REGION.haut, name: `ohr${side}`, c, r: [hr * 0.22 * ohren, hr * (0.2 + 0.5 * ohren), hr * 0.12], q: quatFromFrame(normalize(cross(dir, forwardH)), dir, normalize(cross(normalize(cross(dir, forwardH)), dir))) };
          prims.push(ear);
        }
      }
      const hoerner = clamp(b.kopf.hoerner, 0, 1);
      if (hoerner > 0.02) {
        for (const side of [-1, 1] as const) {
          const u0 = 0.32;
          const top = add(add(headBase, scale(forwardH, -Lback + (Lback + Lfront) * u0)), scale(rightH, side * hr * 0.3));
          const a = add(top, scale(upH, hr * (0.55 + 0.5 * ok) * 0.8));
          const bTip = add(a, scale(normalize(add(upH, scale(rightH, side * 0.15))), hr * (0.25 + 0.45 * hoerner)));
          prims.push({ kind: 'capsule', op: 'union', part: headBone, k: 0.12 * hr, region: REGION.haut, name: `horn${side}`, a, b: bTip, ra: hr * 0.07, rb: hr * 0.11 });
        }
      }
    }
    hostBone = headBone;
    // Gelenk am Hinterkopf (70 % des hinteren Kopfteils hinter der Kopfbasis), bezogen auf den Ursprung (= Kopfmitte vorn/hinten)
    host = { origin: sub(headCenter, scale(upH, hr * (0.42 + 0.42 * uk))), up: upH, forward: forwardH, right: rightH, height: hr * (0.42 + 0.42 * uk + 0.55 + 0.5 * ok), halfWidth: hr * 0.95, bone: headBone, jointBack: Lback * 0.7 + (Lfront - Lback) * 0.5, scene: { prims: [] } };
  } else {
    // Körperträger: waagerechte Scheiben, Mittellinie folgt der Neigung; Kiefertiefe = Kinnband des Grundblobs (plus
    // Kehlrand), damit Brust und Bauch nicht mitschwingen
    host = { origin: [0, yb, 0], up: UP, forward: FWD, right: RIGHT, height: H, halfWidth: R0 * sx, bone: kMitte, jointBack: R0 * sz * 0.55, jawDepth: Math.max(0.06 * H, (kinnHoehe + 0.03) * H), headHeight: kopfHoehe, center: (h: number): Vec3 => axisAt(yb + h), scene: { prims: [] } };
  }

  // --- Kiefermassen, Schnauze, Braue am Träger -------------------------------------------------------------------------
  const jawGroup = groups.length;
  groups.push({ name: 'kiefer', kind: 'kiefer', polyline: makePolyline([host.origin, add(host.origin, scale(host.forward, host.halfWidth))], [host.halfWidth * 0.5, host.halfWidth * 0.5], UP), bones: [], dorsal: scale(host.up, -1) });
  const jawBone = bone('unterkiefer', hostBone, host.origin, QUAT_ID, jawGroup);
  const upperJawBone = bone('oberkiefer', hostBone, host.origin, QUAT_ID, jawGroup);
  const kehle0 = bone('kehle0', hostBone, host.origin, QUAT_ID, jawGroup);
  const kehle1 = bone('kehle1', hostBone, host.origin, QUAT_ID, jawGroup);
  const nacken0 = bone('nacken0', hostBone, host.origin, QUAT_ID, jawGroup);
  const nacken1 = bone('nacken1', hostBone, host.origin, QUAT_ID, jawGroup);
  groups[jawGroup]!.bones.push(jawBone, upperJawBone, kehle0, kehle1, nacken0, nacken1);

  host.scene = { prims: prims.slice() };
  host.scene = { prims: prims.slice() };
  const maulAn = m0.sichtbar;

  // --- Maul ----------------------------------------------------------------------------------------------------------
  const mouth = buildMouth(b, host, H);
  // Nasenspiegel (Katze, Hund — Bild 8/9): flacher Knubbel vorn oben auf der Schnauze über der Mitte der W-Lippe
  if (maulAn && b.maul.wForm > 0.02) {
    const wF = clamp(b.maul.wForm, 0, 1);
    const Hk = host.headHeight ?? host.height;
    // über der Mitte der W-Lippe (dort ist die Linie um bis zu 0,16 Kopfhöhen angehoben)
    const hN = clamp(mouth.hLip + (0.16 * wF + 0.08 + 0.04 * wF) * Hk, 0.02 * host.height, 0.98 * host.height);
    const nasenScene: SdfScene = { prims: prims.filter((p) => p.op === 'union') };
    const sp = surfacePoint({ ...host, scene: nasenScene }, hN, 0, host.halfWidth * 3 + H);
    const e = 0.01 * H;
    const nrm = normalize([
      evalScene(nasenScene, [sp.p[0] + e, sp.p[1], sp.p[2]]) - evalScene(nasenScene, [sp.p[0] - e, sp.p[1], sp.p[2]]),
      evalScene(nasenScene, [sp.p[0], sp.p[1] + e, sp.p[2]]) - evalScene(nasenScene, [sp.p[0], sp.p[1] - e, sp.p[2]]),
      evalScene(nasenScene, [sp.p[0], sp.p[1], sp.p[2] + e]) - evalScene(nasenScene, [sp.p[0], sp.p[1], sp.p[2] - e]),
    ]);
    const upN = normalize(sub(host.up, scale(nrm, dot(host.up, nrm))));
    const rightN = normalize(cross(upN, nrm));
    const rN = (0.035 + 0.06 * wF) * Hk;
    const nase: EllipsoidPrim = { kind: 'ellipsoid', op: 'union', part: hostBone, k: 0.5 * rN, region: REGION.haut, name: 'nase', c: add(sp.p, scale(nrm, -rN * 0.3)), r: [rN * 1.35, rN * 0.8, rN], q: quatFromFrame(rightN, upN, nrm) };
    prims.push(nase);
  }
  {
    const x = mouth.jawHinge.axis;
    const z = normalize(sub(mouth.frame.z, scale(x, mouth.frame.z[0] * x[0] + mouth.frame.z[1] * x[1] + mouth.frame.z[2] * x[2])));
    const y = cross(z, x);
    for (const bi of [jawBone, upperJawBone, kehle0, kehle1, nacken0, nacken1]) {
      bones[bi]!.pos = mouth.jawHinge.point;
      bones[bi]!.quat = quatFromFrame(x, y, z);
    }
  }

  // --- Augen (Höhlen) ------------------------------------------------------------------------------------------------
  const eyes: EyeSpec[] = [];
  const a = b.augen;
  if (a.anzahl > 0) {
    // Lage längs des Kopfs: 0 vorn an der Schnauze … 1 hinten am Schädel (Azimut um die Hochachse des Trägers);
    // `abstand` spreizt die Augen um diese Lage, `hoehe` setzt sie über der Maullinie
    const phiLage = lerp(0.15 * mouth.theta, Math.PI - 0.5, clamp(a.lage, 0, 1));
    const spread = 0.12 + 0.35 * a.abstand;
    const phis = a.anzahl === 1 ? [0] : a.anzahl === 2 ? [-phiLage, phiLage] : a.anzahl === 3 ? [-phiLage * (1 + spread), 0, phiLage * (1 + spread)] : [-phiLage * (1 + spread), -phiLage * (1 - spread), phiLage * (1 - spread), phiLage * (1 + spread)];
    const hostH = host.height;
    const hLipAtEye = mouth.lipHAt(clamp(phiLage, -mouth.theta, mouth.theta));
    const hEye = clamp(hLipAtEye + 0.08 * hostH + a.hoehe * (hostH - hLipAtEye) * 0.8, 0.05 * hostH, 0.97 * hostH);
    const rE = (0.045 + 0.085 * a.groesse) * (host.headHeight ?? hostH);
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
    // Beinlage: vorn unter der Brust (sitzende Katze, Bild 9) … hinten unter dem Rumpf (Rex, Bild 12); Spreizung seitlich
    const lage = clamp(L.lage, 0, 1);
    const azis: number[] =
      n === 2
        ? [-(30 + 120 * lage + 20 * L.spreiz) * d2r, (30 + 120 * lage + 20 * L.spreiz) * d2r]
        : n === 4
          ? [-(45 + 20 * L.spreiz + 40 * (lage - 0.2)) * d2r, (45 + 20 * L.spreiz + 40 * (lage - 0.2)) * d2r, -Math.min(165, 135 - 20 * L.spreiz + 40 * (lage - 0.2)) * d2r, Math.min(165, 135 - 20 * L.spreiz + 40 * (lage - 0.2)) * d2r]
          : [-35, 35, -70, 70, -110, 110, -145, 145].map((x) => x * d2r);
    // Bild 8/9/12 (Florian): Beine organisch, dicke Schenkel kommen seitlich hoch am Rumpf heraus — fast aus Kopf/Hals —
    // mit sauberem Übergang; Unterschenkel kurz, Fuß als flaches Polster (Tatzen/Zehen später als eigene Elemente)
    const rThigh = H * (0.06 + 0.14 * L.dicke + 0.14 * L.schenkel) * thin;
    const rKnee = H * (0.05 + 0.09 * L.dicke) * thin;
    const rAnkle = H * (0.04 + 0.07 * L.dicke) * thin;
    const rFoot = H * (0.06 + 0.12 * L.fuss) * (0.6 + 0.4 * L.dicke);
    const hoeheB = clamp(L.hoehe, 0, 1);
    // Halbmaß des Rumpfs auf Höhe y in Richtung φ (Ei-Querschnitt der Loft-Station)
    const rumpfRadiusBei = (y: number, phi: number): number => {
      const i = Math.min(bodyWx.length - 1, Math.max(0, Math.round(clamp((y - yb) / H, 0, 1) * (bodyWx.length - 1))));
      const wx = Math.max(1e-4, bodyWx[i]!), wy = Math.max(1e-4, Math.cos(phi) >= 0 ? bodyWyT[i]! : bodyWyB[i]!);
      const sx_ = Math.sin(phi) / wx, cy_ = Math.cos(phi) / wy;
      return 1 / Math.max(1e-6, Math.sqrt(sx_ * sx_ + cy_ * cy_));
    };
    azis.forEach((phi, i) => {
      // Hüfte: tief am Bauch … hoch an der Schulter; Mitte so weit innen, dass die Keule um die Hälfte ihres Radius vorsteht
      const hHip = yb + H * (0.04 + 0.06 * L.laenge + 0.72 * hoeheB);
      const rB = rumpfRadiusBei(hHip, phi);
      const hipDist = Math.max(0.2 * rB, rB - 0.25 * rThigh);
      const hip: Vec3 = add(axisAt(hHip), [Math.sin(phi) * hipDist, 0, Math.cos(phi) * hipDist]);
      const foot: Vec3 = [Math.sin(phi) * R0 * sx * (0.72 + 0.35 * L.spreiz), 0, Math.cos(phi) * R0 * sz * (0.72 + 0.2 * L.spreiz) + 0.04 * H];
      // Knie: unter dem Rumpf, nach vorn gebeugt (Dino/Hund) — die Keule läuft schräg von der Schulter zum Knie
      const knee: Vec3 = [foot[0] + Math.sin(phi) * 0.03 * H, rKnee + rFoot * 0.4 + 0.3 * (hHip - yb) + 0.2 * legLen, foot[2] + 0.12 * legLen + 0.05 * H];
      const ankle: Vec3 = [foot[0], rFoot * 0.6, foot[2] - 0.03 * H];
      const g = groups.length;
      const pl = makePolyline([hip, knee, ankle, foot], [rThigh, rKnee, rAnkle, rFoot * 0.5], FWD);
      groups.push({ name: `bein${i}`, kind: 'bein', polyline: pl, bones: [], dorsal: [0, 1, 0] });
      const bHip = bone(`bein${i}Huefte`, kUnten, hip, QUAT_ID, g);
      const bKnee = bone(`bein${i}Knie`, bHip, knee, QUAT_ID, g);
      const bFoot = bone(`bein${i}Fuss`, bKnee, ankle, QUAT_ID, g);
      groups[g]!.bones.push(bHip, bKnee, bFoot);
      // Bein als ein Loft: Keule beginnt im Rumpf (verschmolzen), ist an der Hüfte am dicksten, Knie, Knöchel, Fußpolster
      const hipTop: Vec3 = add(hip, [Math.sin(phi) * -0.25 * rThigh, rThigh * 1.1, Math.cos(phi) * -0.25 * rThigh]);
      const ctrl: Vec3[] = [hipTop, hip, knee, ankle, [foot[0], rFoot * 0.35, foot[2]], [foot[0], 0, foot[2]]];
      const rr = [rThigh * 0.85, rThigh, rKnee, rAnkle, rFoot * 1.1, rFoot * 1.2];
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
        wx.push(r * (1 + 0.2 * footness));
        wyT.push(r * (1 + (0.5 + 0.4 * L.fuss) * footness));
        wyB.push(r * (1 + 0.1 * footness));
        parts.push(j < idxOf(2) ? bHip : j < idxOf(3) ? bKnee : bFoot);
      }
      // Übergang: weich genug für „aus dem Rumpf geknetet“, klein genug, dass die Keule eine Keule bleibt
      prims.push(makeLoft({ points: pts, upRef: FWD, wx, wyT, wyB, n: 2, parts, capEnd: rFoot * 0.35, axis: [0, -1, 0] }, { op: 'union', part: bHip, k: (0.08 + 0.05 * Math.min(1, L.schenkel)) * H * thin + 0.01 * H, region: REGION.haut, name: `bein${i}` }));
    });
  }

  // --- Schwanz oder Schlange --------------------------------------------------------------------------------------------
  // Schwanz und Schlange setzen **im Kern des Rumpfs** an, mit dessen Halbtiefe als erstem Querschnitt, und verjüngen sich
  // erst außerhalb (Ansatztrichter): die Fläche verlässt den Rumpf tangential, kein Rohr aus einer Wand (Florian:
  // „das Mesh geht nicht glatt in Hals und Schwanz über“).
  const rumpfTiefeBei = (y: number): number => {
    const i = Math.min(bodyWyB.length - 1, Math.max(0, Math.round(clamp((y - yb) / H, 0, 1) * (bodyWyB.length - 1))));
    return bodyWyB[i]!;
  };
  if (b.unterkoerper.typ === 'schlange') {
    const S = b.unterkoerper.schlange;
    const rS = S.dicke * R0 * sm * 0.8;
    const Ls = S.laenge * H * 1.4;
    // Ansatz: Mittelpunkt der Rumpfscheibe auf Schlangenhöhe, Radius wie der Rumpf dort (nach unten durch den Boden begrenzt)
    const yS = yb + rS * 0.98;
    const rRoot = Math.min(rumpfTiefeBei(yS) * 0.85, Math.max(rS, yS - yb));
    const zBack = axisAt(yS)[2] - rumpfTiefeBei(yS);
    const ctrl: Vec3[] = [axisAt(yS), [0, yS, zBack + 0.35 * rRoot], [0, yS, zBack]];
    // Einrollen (Bild 13): der Körper steigt hinter dem Kopf auf, wölbt sich nach hinten über und kommt dahinter wieder
    // herunter — ein Bogen mit gleichmäßiger Krümmung (Gesamtdrehung bis ≈ 300°), seitlich ausgebaucht (räumlich, kein
    // Selbstschnitt), nie unter den Boden
    // Richtung α: 0 = nach hinten, +90° = nach oben; der Körper startet steil nach oben-hinten und dreht nach hinten
    // und unten (Uhrzeigersinn von der Seite mit Kopf rechts): die Schwanzspitze kommt hinter dem Bogen herunter
    const nC = 16;
    const roll = clamp(S.einrollen, 0, 1);
    const turn = roll * 3.6;
    let x = 0, y = yS, z = zBack;
    for (let i = 1; i <= nC; i++) {
      const t = i / nC;
      const alpha = 0.4 * roll + 1.0 * roll - turn * (t - 0.5 / nC);
      const step = Ls / nC;
      z -= Math.cos(alpha) * step;
      y += Math.sin(alpha) * step;
      x = roll * 0.3 * H * Math.sin(Math.PI * t);
      const r = rS * (1 - 0.92 * t) + 0.03 * H;
      y = Math.max(y, yb + r * 0.98);
      ctrl.push([x, y, z]);
    }
    const pts = catmullRom(ctrl, 2);
    // Radius über die Bogenlänge ab dem Austritt: innen Rumpfradius, dann Trichter auf die Schlangendicke, dann Verjüngung
    const arcs: number[] = [0];
    for (let i = 1; i < pts.length; i++) arcs.push(arcs[i - 1]! + Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1], pts[i]![2] - pts[i - 1]![2]));
    let sExit = 0;
    for (let i = 0; i < pts.length; i++) if (pts[i]![2] <= zBack + 1e-6) { sExit = arcs[i]!; break; }
    const Lans = Math.max(0.1 * H, 0.2 * Ls);
    const radii = pts.map((_p, i) => {
      const sA = arcs[i]! - sExit;
      if (sA <= 0) return rRoot;
      const f = smoothstep(0, Lans, sA);
      const rA = rRoot * (1 - f) + rS * f;
      const g = clamp((sA - Lans) / Math.max(1e-6, Ls - Lans), 0, 1);
      return Math.max(0.03 * H, rA * (1 - 0.92 * g) + 0.03 * H * g);
    });
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
      // Stationen im Rumpf (vor dem Austritt) gehören dem Rumpf: Gewichte und Musterkoordinaten springen nicht auf der Flanke
      const parts = pts.map((_p, i) => (arcs[i]! < sExit - 1e-6 ? kUnten : idx[Math.min(nb - 1, Math.floor(((arcs[i]! - sExit) / Math.max(1e-6, arcs[arcs.length - 1]! - sExit)) * nb))]!));
      // Bauchseite flach (Schlange liegt auf), Rücken rund; Mittelpunkte sinken mit dem Radius, damit sie aufliegt
      prims.push(makeLoft({ points: pts, upRef: UP, wx: radii, wyT: radii, wyB: radii.map((r) => r * 0.85), n: 2.3, parts }, { op: 'union', part: idx[0]!, k: 0.25 * H, region: REGION.haut, name: 'schlange' }));
    }
  } else if (b.schwanz.typ !== 'keiner') {
    const T = b.schwanz;
    const hT = yb + H * (0.3 + 0.25 * T.hoch);
    const Lt = T.laenge * H * 0.9;
    const rBody = rumpfTiefeBei(hT);
    // Wirbelsäule: so dick wie der Rumpf dort (Dicke 1) … halb so dick; Anhang: dünn mit Ansatztrichter
    const r0 = T.typ === 'wirbelsaeule' ? rBody * (0.5 + 0.5 * T.dicke) : H * (0.04 + 0.08 * T.dicke);
    const rTip = T.typ === 'wirbelsaeule' ? 0.03 * H : r0 * 0.55;
    const curl = T.typ === 'bogen' ? 0.8 + 0.4 * T.kruemmung : T.kruemmung;
    const zBack = axisAt(hT)[2] - rBody;
    // Wurzel: Wirbelsäule beginnt im Kern (0,8 · Rumpfradius, deutlich unter der Haut — fast deckungsgleiche Flächen
    // würden das Feld verrauschen); dünner Anhang nur mit kleinem Trichter knapp innerhalb der Rückenfläche
    const rRoot = T.typ === 'wirbelsaeule' ? rBody * 0.8 : Math.min(rBody * 0.8, r0 * 2.5);
    const ctrl: Vec3[] = T.typ === 'wirbelsaeule' ? [axisAt(hT), [0, hT, zBack + 0.35 * rBody], [0, hT, zBack]] : [[0, hT, zBack + rRoot * 1.2], [0, hT, zBack + rRoot * 0.5], [0, hT, zBack]];
    for (let i = 1; i <= 6; i++) {
      const t = i / 6;
      ctrl.push([0, hT + Lt * (T.hoch * 0.9 * t * t + curl * 0.5 * t * t * t) + (T.typ === 'wirbelsaeule' ? 0 : -Lt * 0.15 * t * (1 - Math.abs(T.hoch))), zBack - Lt * t * (1 - 0.15 * Math.abs(T.hoch))]);
    }
    const pts = catmullRom(ctrl, 2);
    const arcs: number[] = [0];
    for (let i = 1; i < pts.length; i++) arcs.push(arcs[i - 1]! + Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1], pts[i]![2] - pts[i - 1]![2]));
    let sExit = 0;
    for (let i = 0; i < pts.length; i++) if (pts[i]![2] <= zBack + 1e-6) { sExit = arcs[i]!; break; }
    const Lans = T.typ === 'wirbelsaeule' ? 0.15 * Lt : Math.max(0.08 * H, 0.25 * Lt);
    const radii = pts.map((_p, i) => {
      const sA = arcs[i]! - sExit;
      if (sA <= 0) return rRoot;
      const f = smoothstep(0, Lans, sA);
      const rA = rRoot * (1 - f) + r0 * f;
      const g = clamp((sA - Lans) / Math.max(1e-6, Lt - Lans), 0, 1);
      return Math.max(0.01 * H, rA + (rTip - rA) * g);
    });
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
      // Stationen im Rumpf (vor dem Austritt) gehören dem Rumpf: Gewichte und Musterkoordinaten springen nicht auf der Flanke
      const rumpfBone = T.typ === 'wirbelsaeule' ? kMitte : kUnten;
      const parts = pts.map((_p, i) => (arcs[i]! < sExit - 1e-6 ? rumpfBone : idx[Math.min(nb - 1, Math.floor(((arcs[i]! - sExit) / Math.max(1e-6, arcs[arcs.length - 1]! - sExit)) * nb))]!));
      prims.push(makeLoft({ points: pts, upRef: UP, wx: radii, wyT: radii.map((r) => r * 1.05), wyB: radii, n: 2, parts }, { op: 'union', part: idx[0]!, k: (T.typ === 'wirbelsaeule' ? 0.3 : 0.18) * H, region: REGION.haut, name: 'schwanz' }));
    }
  }

  const scene: SdfScene = { prims };
  return { bauplan: b, scene, bones, groups, mouth, eyes, bodyScale: H, bounds: sceneBounds(scene), hostBone, jawBone, upperJawBone, throatBones: [kehle0, kehle1], napeBones: [nacken0, nacken1] };
}
