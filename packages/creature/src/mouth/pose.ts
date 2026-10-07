import type { Bauplan } from '../bauplan/schema';
import { add, clamp, clamp01, length, normalize, quatFromAxisAngle, rotate, scale, sub, type Vec3 } from '../math/vec';
import type { CreatureBuild } from '../mesh/build';
import type { Tooth } from './mouth';

/**
 * Kieferpose aus der Öffnung — **eine** Formel für Bau, Darstellung und Tests. Das Mesh ist **geschlossen** gebaut;
 * Öffnen verteilt sich auf Unterkiefer (dreht um das Gelenk am Hinterkopf) und Oberkiefer/Oberkopf (klappt zurück,
 * Anteil `oeffnungOben`, bei tiefem Maul 0). Lochmaul (`form` → 0): statt Drehung weitet sich die Maulkante radial
 * (Spitzmund-Feld `eePucker`, Uniform `spitzmund`).
 */
export interface JawRig {
  /** Maximaler Öffnungswinkel (rad) der Gesamtbewegung. */
  maxOpenAngle: number;
  /** Anteil des Oberkiefers beim Öffnen. */
  share: number;
  form: number;
  /** Maximale Öffnungshöhe vorn (Körpereinheiten) — Skala des Spitzmund-Felds. */
  gapeMax: number;
}

export interface JawPose {
  /** Drehung des Unterkiefers um die Scharnierachse (positiv = Front senkt sich = öffnen). */
  lowerAngle: number;
  /** Drehung des Oberkiefers (negativ = Front hebt sich = öffnen). */
  upperAngle: number;
  /** Radiale Weitung des Lochmauls (Körpereinheiten). */
  spitzmund: number;
}

/** Wirksamer Oberkiefer-Anteil: tief sitzendes Maul → 0 (oben ist der ganze Körper), hohes Maul → Deckel klappt. */
export function upperShare(maul: Pick<Bauplan['maul'], 'oeffnungOben' | 'unterkiefer' | 'hoehe'>): number {
  if (maul.unterkiefer < 0.05) return 1;
  const t = clamp01((maul.hoehe - 0.1) / 0.35);
  return maul.oeffnungOben * t * t * (3 - 2 * t);
}

export function jawRig(build: Pick<CreatureBuild, 'mouth' | 'maxOpenAngle'>, maul: Pick<Bauplan['maul'], 'form' | 'oeffnungOben' | 'unterkiefer' | 'hoehe'>): JawRig {
  return { maxOpenAngle: build.maxOpenAngle, share: upperShare(maul), form: maul.form, gapeMax: build.mouth?.gapeMax ?? 0 };
}

export function jawPose(rig: JawRig, openness: number): JawPose {
  const o = clamp01(openness);
  const total = o * rig.maxOpenAngle * rig.form;
  const s = clamp01(rig.share);
  const sinT = Math.sin(total);
  const lowerAngle = Math.asin(clamp(sinT * (1 - s), -0.95, 0.95));
  const upperAngle = -Math.asin(clamp(sinT * s, -0.95, 0.95));
  const spitzmund = o * (1 - rig.form) * rig.gapeMax * 0.5;
  return { lowerAngle, upperAngle, spitzmund };
}

/** Starre Transformationen beider Kiefer für eine Pose (Körperraum). */
export function jawTransforms(hinge: { point: Vec3; axis: Vec3 }, pose: JawPose): { lower: (p: Readonly<Vec3>) => Vec3; upper: (p: Readonly<Vec3>) => Vec3 } {
  const axis = normalize(hinge.axis);
  const qLo = quatFromAxisAngle(axis, pose.lowerAngle);
  const qUp = quatFromAxisAngle(axis, pose.upperAngle);
  return {
    lower: (p) => add(hinge.point, rotate(qLo, sub(p, hinge.point))),
    upper: (p) => add(hinge.point, rotate(qUp, sub(p, hinge.point))),
  };
}

export interface PoseParams {
  /** Öffnung 0 (zu) … 1 (ganz auf). */
  openness: number;
  maul: Pick<Bauplan['maul'], 'form' | 'oeffnungOben' | 'unterkiefer' | 'hoehe'>;
}

/** Positionen aller Vertices in der Pose (Körperraum) — Skinning wie zur Laufzeit plus Spitzmund. */
export function posedPositions(build: CreatureBuild, params: PoseParams): Float32Array {
  const n = build.positions.length / 3;
  const out = new Float32Array(build.positions.length);
  const pose = jawPose(jawRig(build, params.maul), params.openness);
  const m = build.mouth;
  const tf = m ? jawTransforms(m.hinge, pose) : null;
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
    out[v * 3] = x + build.pucker[v * 3]! * pose.spitzmund;
    out[v * 3 + 1] = y + build.pucker[v * 3 + 1]! * pose.spitzmund;
    out[v * 3 + 2] = z + build.pucker[v * 3 + 2]! * pose.spitzmund;
  }
  return out;
}

/** Zähne in der Pose: untere folgen dem Unterkiefer, obere dem Oberkiefer (Position und Richtung). */
export function posedTeeth(build: CreatureBuild, params: PoseParams): Tooth[] {
  const m = build.mouth;
  if (!m) return [];
  const pose = jawPose(jawRig(build, params.maul), params.openness);
  const tf = jawTransforms(m.hinge, pose);
  const axis = normalize(m.hinge.axis);
  const qLo = quatFromAxisAngle(axis, pose.lowerAngle);
  const qUp = quatFromAxisAngle(axis, pose.upperAngle);
  return m.teeth.map((t) => (t.upper ? { ...t, pos: tf.upper(t.pos), dir: rotate(qUp, t.dir) } : { ...t, pos: tf.lower(t.pos), dir: rotate(qLo, t.dir) }));
}

/** Spitze eines Zahns. */
export function toothTip(t: Tooth): Vec3 {
  return add(t.pos, scale(t.dir, t.size));
}

export { length };
