import type { Bauplan } from '../bauplan/schema';
import { add, clamp, clamp01, cross, length, normalize, quatFromAxisAngle, quatMul, rotate, scale, sub, type Vec3 } from '../math/vec';
import type { CreatureBuild } from '../mesh/build';
import type { Tooth } from './mouth';

/**
 * Kieferpose aus der Öffnung — **eine** Formel für Bau, Darstellung und Tests. Das Mesh ist **geschlossen** gebaut;
 * Öffnen ist der gewünschte Abstand der Ränder vorn (`gapeMax` · Öffnung) und verteilt sich auf Unterkiefer (dreht um das
 * Gelenk am Hinterkopf, höchstens bis der Rand den Boden erreicht) und Oberkiefer/Oberkopf (klappt zurück, Anteil
 * `oeffnungOben`, übernimmt alles, was der Unterkiefer nicht schafft); jeder Kiefer dreht bis ≈ 72° — zusammen reicht
 * das für ein Maul von 1,6 Kopfhöhen (Florian: „ein anderes Tier mit einem Haps verschlingen“). Lochmaul (`form` → 0): statt Drehung weitet sich die Maulkante radial
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
  /** Hebel Gelenk → Maulzentrum und größter Unterkieferwinkel über dem Boden. */
  lever: number;
  lowerAngleMax: number;
  /** Hebel Schädelgelenk → Maulzentrum (Oberkiefer kippt um das Gelenk hinter dem Kopf). */
  upperLever: number;
  /** Anheben des Kopfs bei voller Öffnung (Körpereinheiten). */
  lift: number;
  /** Anteil der Schädelkippung am Kopfknochen selbst (freier Kopf 1, versunkener Kopf 0). */
  kopfFrei: number;
  /** Seitliches Kippen des Oberkiefers beim Öffnen (−1 … 1, Bohne). */
  bohne: number;
  /** Rahmen des Trägers: oben und vorn (Körperraum). */
  up: Vec3;
  forward: Vec3;
}

export interface JawPose {
  /** Drehung des Unterkiefers um die Scharnierachse (positiv = Front senkt sich = öffnen). */
  lowerAngle: number;
  /** Drehung des Oberkiefers (negativ = Front hebt sich = öffnen). */
  upperAngle: number;
  /** Radiale Weitung des Lochmauls (Körpereinheiten). */
  spitzmund: number;
  /** Rollen des Oberkiefers um die Vorn-Achse (rad): Bohnenform. */
  upperRoll: number;
  /** Anheben des Kopfs (Körpereinheiten, entlang `up`): der Kopf hebt sich beim Aufreißen aus dem Rumpf. */
  lift: number;
}

/** Wirksamer Oberkiefer-Anteil: tief sitzendes Maul → 0 (oben ist der ganze Körper), hohes Maul → Deckel klappt. */
export function upperShare(maul: Pick<Bauplan['maul'], 'oeffnungOben' | 'unterkiefer' | 'hoehe'>): number {
  if (maul.unterkiefer < 0.05) return 1;
  const t = clamp01((maul.hoehe - 0.1) / 0.35);
  return maul.oeffnungOben * t * t * (3 - 2 * t);
}

export function jawRig(build: Pick<CreatureBuild, 'mouth' | 'maxOpenAngle'> & Partial<Pick<CreatureBuild, 'jawLever' | 'lowerAngleMax' | 'upperLever' | 'lift' | 'kopfFrei'>>, maul: Pick<Bauplan['maul'], 'form' | 'oeffnungOben' | 'unterkiefer' | 'hoehe' | 'bohne'>): JawRig {
  const up: Vec3 = build.mouth ? normalize(build.mouth.up) : [0, 1, 0];
  const axis: Vec3 = build.mouth ? normalize(build.mouth.hinge.axis) : [1, 0, 0];
  const forward = normalize(cross(axis, up));
  const lever = build.jawLever ?? 1;
  return { maxOpenAngle: build.maxOpenAngle, share: upperShare(maul), form: maul.form, gapeMax: build.mouth?.gapeMax ?? 0, lever, lowerAngleMax: build.lowerAngleMax ?? Math.PI / 2, upperLever: build.upperLever ?? lever, lift: build.lift ?? 0, kopfFrei: build.kopfFrei ?? 0, bohne: clamp(maul.bohne ?? 0, -1, 1), up, forward };
}

export function jawPose(rig: JawRig, openness: number): JawPose {
  const o = clamp01(openness);
  // gewünschter Abstand der Ränder vorn (Keil-Anteil), aufgeteilt nach `share`; der Unterkiefer dreht bis zur
  // Bodenschranke bzw. 72°, den Rest übernimmt der Oberkiefer
  const sep = o * rig.gapeMax * rig.form;
  const s = clamp01(rig.share);
  const L = Math.max(1e-4, rig.lever);
  const lowerSep = sep * (1 - s);
  const lowerAngle = Math.min(rig.lowerAngleMax, Math.asin(clamp(lowerSep / L, 0, 0.95)));
  const upperSep = sep * s + Math.max(0, lowerSep - L * Math.sin(lowerAngle));
  // Der Schädel kippt um das Schädelgelenk hinten, der Unterkiefer hängt an ihm: die Öffnung vorn hängt nur von beiden
  // Winkeln und dem Kieferhebel ab (sep = 2 L sin((|θo| + θu)/2)), nicht vom Ort des Schädelgelenks
  const upperAngle = -Math.asin(clamp(upperSep / L, 0, 0.95));
  const spitzmund = o * (1 - rig.form) * rig.gapeMax * 0.5;
  // Bohne: der Oberkiefer rollt beim Öffnen seitlich (bis ≈ 50°)
  const upperRoll = rig.bohne * 0.88 * o * rig.form;
  // Anheben mit der Öffnung (weich einsetzend), damit Kinn und Hinterkopf nicht in den Rumpf fahren
  const lift = rig.lift * o * o * (3 - 2 * o);
  return { lowerAngle, upperAngle, spitzmund, upperRoll, lift };
}

/**
 * Starre Transformationen beider Kiefer für eine Pose (Körperraum). Der Schädel (Oberkiefer, Augen, Stirn) kippt um das
 * Schädelgelenk hinten; der Unterkiefer hängt am Schädel: er kippt mit und dreht dann um sein (mitbewegtes) Kiefergelenk.
 * Die Ketten tragen ⅔ und ⅓ beider Drehungen — Kehle und Nacken laufen so gemeinsam in Hals und Rumpf aus.
 */
export function jawTransforms(hinge: { point: Vec3; axis: Vec3 }, pose: JawPose, frame?: { up: Vec3; forward: Vec3 }, skull?: { point: Vec3; axis: Vec3 }, kopfFrei = 0): { lower: (p: Readonly<Vec3>) => Vec3; upper: (p: Readonly<Vec3>) => Vec3; throat: [(p: Readonly<Vec3>) => Vec3, (p: Readonly<Vec3>) => Vec3]; nape: [(p: Readonly<Vec3>) => Vec3, (p: Readonly<Vec3>) => Vec3]; kopf: (p: Readonly<Vec3>) => Vec3 } {
  const axis = normalize(hinge.axis);
  const up: Vec3 = frame ? normalize(frame.up) : [0, 1, 0];
  const forward: Vec3 = frame ? normalize(frame.forward) : normalize(cross(axis, up));
  const A = skull?.point ?? hinge.point;
  const J = hinge.point;
  const hebung = (c: number): Vec3 => scale(up, pose.lift * c);
  const about = (q: ReturnType<typeof quatFromAxisAngle>, c: Readonly<Vec3>, versatz: Readonly<Vec3>) => (p: Readonly<Vec3>): Vec3 => add(add(c, rotate(q, sub(p, c))), versatz);
  // Schädelkippung (mit Bohnen-Rollen) um das Schädelgelenk plus Anheben, Anteil c
  const tilt = (c: number) => about(quatMul(quatFromAxisAngle(axis, pose.upperAngle * c), quatFromAxisAngle(forward, pose.upperRoll * c)), A, hebung(c));
  // Unterkiefer: hängt am Schädel (sein Gelenk wandert mit der Kippung von J nach J'), behält aber seine **absolute**
  // Drehung θu um die Kieferachse — die Öffnung vorn bleibt die der beiden Winkel, der Hinterkopf steht still. Die
  // Kehlkette trägt ⅔ bzw. ⅓ von Gelenkversatz und Kieferdrehung (ihr übriger Kippanteil kommt über die Nackenkette)
  const JA = sub(J, A);
  const lower = (c: number) => {
    const delta = sub(rotate(quatFromAxisAngle(axis, pose.upperAngle * c), JA), JA);
    const qL = quatFromAxisAngle(axis, pose.lowerAngle * c);
    const hb = hebung(c);
    return (p: Readonly<Vec3>): Vec3 => add(add(add(J, delta), rotate(qL, sub(p, J))), hb);
  };
  // Der Kopfknochen selbst (Hinterkopf, Augen, alles mit Restgewicht auf ihm) kippt beim freien Kopf mit — sonst stünde
  // er still, während der Oberkiefer kippt, und die Haut risse an den Mundwinkeln
  return { lower: lower(1), upper: tilt(1), throat: [lower(2 / 3), lower(1 / 3)], nape: [tilt(2 / 3), tilt(1 / 3)], kopf: tilt(clamp01(kopfFrei)) };
}

export interface PoseParams {
  /** Öffnung 0 (zu) … 1 (ganz auf). */
  openness: number;
  maul: Pick<Bauplan['maul'], 'form' | 'oeffnungOben' | 'unterkiefer' | 'hoehe' | 'bohne'>;
}

/** Positionen aller Vertices in der Pose (Körperraum) — Skinning wie zur Laufzeit plus Spitzmund. */
export function posedPositions(build: CreatureBuild, params: PoseParams): Float32Array {
  const n = build.positions.length / 3;
  const out = new Float32Array(build.positions.length);
  const rig = jawRig(build, params.maul);
  const pose = jawPose(rig, params.openness);
  const m = build.mouth;
  const tf = m ? jawTransforms(m.hinge, pose, rig, m.skullHinge, rig.kopfFrei) : null;
  const { skinIndex, skinWeight } = build.descriptors;
  const fns = tf ? [tf.lower, tf.upper, tf.throat[0], tf.throat[1], tf.nape[0], tf.nape[1], tf.kopf] : [];
  const ids = tf ? [build.jawBone, build.upperJawBone, build.throatBones[0], build.throatBones[1], build.napeBones[0], build.napeBones[1], build.hostIstKopf ? build.hostBone : -1] : [];
  for (let v = 0; v < n; v++) {
    const p: Vec3 = [build.positions[v * 3]!, build.positions[v * 3 + 1]!, build.positions[v * 3 + 2]!];
    let x = p[0], y = p[1], z = p[2];
    if (tf) {
      const ws = [0, 0, 0, 0, 0, 0, 0];
      for (let k = 0; k < 4; k++) {
        const j = ids.indexOf(skinIndex[v * 4 + k]!);
        if (j >= 0) ws[j]! += skinWeight[v * 4 + k]!;
      }
      for (let j = 0; j < 7; j++) {
        const w = ws[j]!;
        if (w <= 0) continue;
        const r = fns[j]!(p);
        x += (r[0] - p[0]) * w;
        y += (r[1] - p[1]) * w;
        z += (r[2] - p[2]) * w;
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
  const rig = jawRig(build, params.maul);
  const pose = jawPose(rig, params.openness);
  const tf = jawTransforms(m.hinge, pose, rig, m.skullHinge, rig.kopfFrei);
  const axis = normalize(m.hinge.axis);
  const qUp = quatMul(quatFromAxisAngle(axis, pose.upperAngle), quatFromAxisAngle(rig.forward, pose.upperRoll));
  const qLo = quatFromAxisAngle(axis, pose.lowerAngle);
  // Spitzmund: der Zahn rückt mit seinem Randpunkt (Lochmaul), vor der Kieferdrehung
  const base = (t: Tooth): Vec3 => (t.pucker ? add(t.pos, scale(t.pucker, pose.spitzmund)) : t.pos);
  return m.teeth.map((t) => (t.upper ? { ...t, pos: tf.upper(base(t)), dir: rotate(qUp, t.dir), ...(t.inward ? { inward: rotate(qUp, t.inward) } : {}) } : { ...t, pos: tf.lower(base(t)), dir: rotate(qLo, t.dir), ...(t.inward ? { inward: rotate(qLo, t.inward) } : {}) }));
}

/** Spitze eines Zahns. */
export function toothTip(t: Tooth): Vec3 {
  return add(t.pos, scale(t.dir, t.size));
}

export { length };
