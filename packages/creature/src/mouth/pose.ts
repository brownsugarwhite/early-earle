import type { Bauplan } from '../bauplan/schema';
import { add, clamp, clamp01, length, normalize, quatFromAxisAngle, rotate, scale, sub, type Vec3 } from '../math/vec';
import type { CreatureBuild } from '../mesh/build';
import type { Tooth } from './mouth';

/**
 * Kieferpose aus der Öffnung — **eine** Formel für Verschluss-Morph (Bau), Laufzeit (Darstellung) und Tests:
 * Die Öffnung vorn verteilt sich auf Unterkiefer (dreht um das Scharnier) und Oberkiefer/Oberkopf (fährt entlang der
 * Hochachse und neigt sich etwas, Florian 07.10.). `share` = Anteil des Oberkiefers, `tilt` = sein Kipp-Anteil.
 */
export interface JawRig {
  closeAngle: number;
  maxOpenAngle: number;
  /** Öffnung des Bauzustands 0…1. */
  oeffnungBau: number;
  /** Scharnier → Maulzentrum (Hebel). */
  jawLength: number;
  /** Anteil des Oberkiefers beim Öffnen über den Bauzustand hinaus (klappt samt Augen nach hinten). */
  share: number;
  /** Anteil des Oberkiefers beim Schließen aus dem Bauzustand: klein, damit der gebaute Kopf seine Form behält. */
  shareClose: number;
  tilt: number;
  form: number;
  puckerClose: number;
}

/** Beim Schließen senkt sich der Oberkiefer nur ein wenig; die Unterlippe kommt zur Oberlippe. */
export const SHARE_CLOSE = 0.12;

/**
 * Wirksamer Oberkiefer-Anteil beim Öffnen: Liegt das Maul tief am Blob, ist „oben“ fast der ganze Körper — der kippt
 * nicht; liegt es hoch, ist oben ein Deckel, der klappt. Ohne Unterkiefer öffnet nur der Oberkiefer.
 */
export function upperShare(maul: Pick<Bauplan['maul'], 'oeffnungOben' | 'unterkiefer' | 'hoehe'>): number {
  if (maul.unterkiefer < 0.05) return 1;
  const t = clamp01((maul.hoehe - 0.1) / 0.35);
  return maul.oeffnungOben * t * t * (3 - 2 * t);
}

export interface JawPose {
  /** Drehung des Unterkiefers um die Scharnierachse (negativ = Front hebt sich = schließen). */
  lowerAngle: number;
  /** Drehung des Oberkiefers (negativ = Front hebt sich = öffnen). */
  upperAngle: number;
  /** Verschiebung des Oberkiefers entlang der Hochachse (positiv = hoch = öffnen). */
  upperLift: number;
  /** Gewicht des Verschluss-Morphs 0…1. */
  verschluss: number;
  /** Spitzmund-Morph: positiv weitet das Lochmaul, negativ schließt es. */
  spitzmund: number;
}

/** Der Oberkiefer dreht rein um die Mundwinkel-Sehne (Hub = 0): ein Hub-Anteil risse die Mundwinkel auf, weil dort beide Lippen aneinanderhängen. */
export const UPPER_TILT = 1;

export function jawRig(build: Pick<CreatureBuild, 'mouth' | 'closeAngle' | 'maxOpenAngle' | 'puckerClose'>, maul: Pick<Bauplan['maul'], 'form' | 'oeffnungOben' | 'unterkiefer' | 'hoehe'>): JawRig {
  const m = build.mouth;
  const jawLength = m ? Math.max(0.05, length(sub(m.center, m.hinge.point))) : 1;
  const hasJaw = maul.unterkiefer >= 0.05;
  return { closeAngle: build.closeAngle, maxOpenAngle: build.maxOpenAngle, oeffnungBau: m?.oeffnung ?? 0.3, jawLength, share: upperShare(maul), shareClose: hasJaw ? SHARE_CLOSE : 1, tilt: UPPER_TILT, form: maul.form, puckerClose: build.puckerClose };
}

export function jawPose(rig: JawRig, openness: number): JawPose {
  const o = clamp01(openness);
  const ob = Math.max(1e-3, rig.oeffnungBau);
  // Bauzustand = Öffnung o_b: darunter schließt um closeAngle, darüber öffnet bis maxOpenAngle; Lochmaul nur per Spitzmund
  const total = (o < ob ? -(1 - o / ob) * rig.closeAngle : ((o - ob) / Math.max(1e-3, 1 - ob)) * rig.maxOpenAngle) * rig.form;
  const s = clamp01(total < 0 ? rig.shareClose : rig.share);
  const tilt = clamp01(rig.tilt);
  const sinT = Math.sin(total);
  const lowerAngle = Math.asin(clamp(sinT * (1 - s), -0.95, 0.95));
  const upperAngle = -Math.asin(clamp(sinT * s * tilt, -0.95, 0.95));
  const upperLift = rig.jawLength * sinT * s * (1 - tilt);
  const t = 1 - Math.min(1, o / ob);
  const verschluss = t * t * (3 - 2 * t);
  const spitzmund = o >= ob ? (o - ob) / Math.max(1e-3, 1 - ob) : -t * rig.puckerClose * (1 - rig.form);
  return { lowerAngle, upperAngle, upperLift, verschluss, spitzmund };
}

/** Starre Transformationen beider Kiefer für eine Pose (Körperraum). */
export function jawTransforms(hinge: { point: Vec3; axis: Vec3 }, up: Vec3, pose: JawPose): { lower: (p: Readonly<Vec3>) => Vec3; upper: (p: Readonly<Vec3>) => Vec3 } {
  const axis = normalize(hinge.axis);
  const qLo = quatFromAxisAngle(axis, pose.lowerAngle);
  const qUp = quatFromAxisAngle(axis, pose.upperAngle);
  const lift = scale(up, pose.upperLift);
  return {
    lower: (p) => add(hinge.point, rotate(qLo, sub(p, hinge.point))),
    upper: (p) => add(add(hinge.point, rotate(qUp, sub(p, hinge.point))), lift),
  };
}

export interface PoseParams {
  /** Öffnung 0 (zu) … 1 (ganz auf). */
  openness: number;
  maul: Pick<Bauplan['maul'], 'form' | 'oeffnungOben' | 'unterkiefer' | 'hoehe'>;
}

/** Positionen aller Vertices in der Pose (Körperraum) — Skinning wie zur Laufzeit plus Morphs. */
export function posedPositions(build: CreatureBuild, params: PoseParams): Float32Array {
  const n = build.positions.length / 3;
  const out = new Float32Array(build.positions.length);
  const pose = jawPose(jawRig(build, params.maul), params.openness);
  const m = build.mouth;
  const tf = m ? jawTransforms(m.hinge, m.up, pose) : null;
  const { skinIndex, skinWeight } = build.descriptors;
  for (let v = 0; v < n; v++) {
    const p: Vec3 = [build.positions[v * 3]!, build.positions[v * 3 + 1]!, build.positions[v * 3 + 2]!];
    let x = p[0], y = p[1], z = p[2];
    if (tf) {
      let wJaw = 0, wUp = 0;
      for (let k = 0; k < 4; k++) {
        const bi = skinIndex[v * 4 + k];
        if (bi === build.jawBone) wJaw += skinWeight[v * 4 + k]!;
        else if (bi === build.upperJawBone) wUp += skinWeight[v * 4 + k]!;
      }
      if (wJaw > 0) {
        const r = tf.lower(p);
        x += (r[0] - p[0]) * wJaw;
        y += (r[1] - p[1]) * wJaw;
        z += (r[2] - p[2]) * wJaw;
      }
      if (wUp > 0) {
        const r = tf.upper(p);
        x += (r[0] - p[0]) * wUp;
        y += (r[1] - p[1]) * wUp;
        z += (r[2] - p[2]) * wUp;
      }
    }
    out[v * 3] = x + build.closed[v * 3]! * pose.verschluss + build.pucker[v * 3]! * pose.spitzmund;
    out[v * 3 + 1] = y + build.closed[v * 3 + 1]! * pose.verschluss + build.pucker[v * 3 + 1]! * pose.spitzmund;
    out[v * 3 + 2] = z + build.closed[v * 3 + 2]! * pose.verschluss + build.pucker[v * 3 + 2]! * pose.spitzmund;
  }
  return out;
}

/** Zähne in der Pose: untere folgen dem Unterkiefer, obere dem Oberkiefer (Position und Richtung). */
export function posedTeeth(build: CreatureBuild, params: PoseParams): Tooth[] {
  const m = build.mouth;
  if (!m) return [];
  const pose = jawPose(jawRig(build, params.maul), params.openness);
  const tf = jawTransforms(m.hinge, m.up, pose);
  const axis = normalize(m.hinge.axis);
  const qLo = quatFromAxisAngle(axis, pose.lowerAngle);
  const qUp = quatFromAxisAngle(axis, pose.upperAngle);
  return m.teeth.map((t) => (t.upper ? { ...t, pos: tf.upper(t.pos), dir: rotate(qUp, t.dir) } : { ...t, pos: tf.lower(t.pos), dir: rotate(qLo, t.dir) }));
}

/** Spitze eines Zahns. */
export function toothTip(t: Tooth): Vec3 {
  return add(t.pos, scale(t.dir, t.size));
}
