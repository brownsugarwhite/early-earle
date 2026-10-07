import { Vector2, Vector3 } from 'three';
import { MeshBasicNodeMaterial, type UniformNode } from 'three/webgpu';
import { Fn, abs, acos, clamp, dot, float, length, max, mix, normalGeometry, normalView, normalize, positionView, pow, reflect, smoothstep, uniform, vec2, vec3, vec4 } from 'three/tsl';
import type { Vec3Node } from '../../common/tsl';
import type { CreatureMaterialUniforms } from './earleCreature';
import { farbRolle, STIL_STANDARD } from './stil';

/**
 * Augapfel (Augen-Typen groß, Schlange, Drache, schwarz-weiß): Kugel mit Iris und Pupille um die lokale Blickachse (+z der
 * Kugel), Pupille rund oder als senkrechter Schlitz, dunkler Irisrand, ein Glanzpunkt zur Lichtseite. Unbeleuchtet wie
 * der Körper (Figurenlicht), Schattierung in Wertstufen.
 */
export interface EyeUniforms {
  sclera: UniformNode<'vec3', Vector3>;
  iris: UniformNode<'vec3', Vector3>;
  irisDark: UniformNode<'vec3', Vector3>;
  pupil: UniformNode<'vec3', Vector3>;
  /** Irisradius als Winkel (rad) um die Blickachse. */
  irisAngle: UniformNode<'float', number>;
  /** Pupillenradius (rad). */
  pupilAngle: UniformNode<'float', number>;
  /** 0 rund … 1 senkrechter Schlitz. */
  slit: UniformNode<'float', number>;
  /** Blick: Verschiebung der Iris (rad) seitlich/hoch. */
  look: UniformNode<'vec2', Vector2>;
}

export function createEyeUniforms(): EyeUniforms {
  return {
    sclera: uniform(new Vector3(0.95, 0.94, 0.9)),
    iris: uniform(new Vector3(0.05, 0.06, 0.08)),
    irisDark: uniform(new Vector3(0.02, 0.02, 0.03)),
    pupil: uniform(new Vector3(0.01, 0.01, 0.015)),
    irisAngle: uniform(0.55),
    pupilAngle: uniform(0.28),
    slit: uniform(0),
    look: uniform(new Vector2(0, 0)),
  };
}

/** Farben und Pupillenform je Augentyp aus den Bauplan-Farben (auge = Iris, pupille = Pupille/Sklera je nach Typ). */
export function applyEyeType(u: EyeUniforms, typ: 'schlitz' | 'gross' | 'schlange' | 'drache' | 'schwarzweiss', augeHex: string, pupilleHex: string): void {
  const stil = STIL_STANDARD;
  const auge = farbRolle(augeHex, stil).base;
  const pup = farbRolle(pupilleHex, stil).base;
  switch (typ) {
    case 'gross':
      // weiße Sklera, dunkle Iris (Bild 10)
      u.sclera.value.set(0.96, 0.95, 0.9);
      u.iris.value.set(auge[0], auge[1], auge[2]);
      u.irisDark.value.set(auge[0] * 0.5, auge[1] * 0.5, auge[2] * 0.5);
      u.pupil.value.set(0.01, 0.01, 0.015);
      u.irisAngle.value = 0.62;
      u.pupilAngle.value = 0.3;
      u.slit.value = 0;
      break;
    case 'schlange':
      // gelbe Iris, senkrechter Schlitz, dunkler Rand
      u.sclera.value.set(0.9, 0.78, 0.2);
      u.iris.value.set(0.92, 0.72, 0.12);
      u.irisDark.value.set(0.35, 0.22, 0.03);
      u.pupil.value.set(0.01, 0.01, 0.012);
      u.irisAngle.value = 1.2;
      u.pupilAngle.value = 0.45;
      u.slit.value = 1;
      break;
    case 'drache':
      // Bild 11: orange-rote Sklera, gelbe Iris, runde schwarze Pupille
      u.sclera.value.set(0.8, 0.2, 0.08);
      u.iris.value.set(0.95, 0.75, 0.12);
      u.irisDark.value.set(0.55, 0.3, 0.04);
      u.pupil.value.set(0.01, 0.01, 0.012);
      u.irisAngle.value = 0.7;
      u.pupilAngle.value = 0.3;
      u.slit.value = 0.3;
      break;
    case 'schwarzweiss':
    default:
      // schwarzes Auge mit weißer Pupille (Vögel, Spinnen, Fellwesen)
      u.sclera.value.set(auge[0], auge[1], auge[2]);
      u.iris.value.set(auge[0], auge[1], auge[2]);
      u.irisDark.value.set(auge[0], auge[1], auge[2]);
      u.pupil.value.set(pup[0], pup[1], pup[2]);
      u.irisAngle.value = 1.4;
      u.pupilAngle.value = 0.22;
      u.slit.value = 0;
      break;
  }
}

export function createEyeMaterial(u: CreatureMaterialUniforms, e: EyeUniforms): MeshBasicNodeMaterial {
  const material = new MeshBasicNodeMaterial();
  material.name = 'ee-auge';
  material.fog = false;
  material.colorNode = Fn(() => {
    // Lokale Kugelnormale = Richtung vom Augenzentrum; Blickachse +z der Kugel (die Kugel wird zur Flächennormale gedreht)
    const nl = normalize(normalGeometry as unknown as Vec3Node);
    const lookDir = normalize(vec3(e.look.x, e.look.y, 1));
    const ang = acos(clamp(dot(nl, lookDir), -1, 1));
    // Schlitzpupille: Winkel seitlich stärker gewichten
    const side = abs(nl.x);
    const up = abs(nl.y);
    const pupilMetric = mix(ang, length(vec2(side.mul(float(1).add(e.slit.mul(2.2))), up.mul(float(1).sub(e.slit.mul(0.35))))), e.slit);
    const pupilMask = float(1).sub(smoothstep(e.pupilAngle.sub(0.03), e.pupilAngle.add(0.03), pupilMetric));
    const irisMask = float(1).sub(smoothstep(e.irisAngle.sub(0.03), e.irisAngle.add(0.03), ang));
    const irisEdge = smoothstep(e.irisAngle.mul(0.72), e.irisAngle, ang);
    const N = normalize(normalView as unknown as Vec3Node);
    const V = normalize(positionView.negate() as unknown as Vec3Node);
    const wrap = clamp(dot(N, u.lightDir).mul(0.5).add(0.5), 0, 1);
    const shade = mix(float(0.72), float(1.05), smoothstep(0.25, 0.8, wrap));
    const irisCol = mix(e.iris, e.irisDark, irisEdge);
    const col = mix(mix(e.sclera, irisCol, irisMask), e.pupil, pupilMask).mul(shade).toVar();
    // Glanzpunkt zur Lichtseite (kleine Scheibe), nie auf der Schattenseite
    const R = reflect(V.negate(), N);
    const hl = pow(max(dot(R, u.lightDir), 0), 48).mul(0.9);
    col.assign(mix(col, vec3(1, 0.99, 0.96), hl));
    return vec4(col, 1);
  })();
  return material;
}

