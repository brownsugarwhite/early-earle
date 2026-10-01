import { Matrix4, Quaternion, Vector3 } from 'three/webgpu';
import { atan, cos, float, length, max, min, modelWorldMatrix, modelWorldMatrixInverse, sin, uniform, vec2, vec3, vec4 } from 'three/tsl';
import type { FloatNode, Vec3Node } from './tsl';

/**
 * Anzeige-Abbildung der unendlichen Ebene auf die Kugel (ADR 0002) — eine Definition für GPU (TSL) und CPU.
 *
 * Räume:
 * - **Ebene**: Weltdaten (x seitlich, z längs des Pfads, vorwärts −z, h Höhe), doppelt genau auf der CPU.
 * - **Flacher Raum**: Szene-Raum der Ebeneninhalte, `F = (x − fx, R + h, z − fz)`; der Fokus f liegt am Scheitel.
 *   Objekte der Ebene stehen mit ihrer Modellmatrix im flachen Raum (Anker − Fokus: immer kleine Zahlen).
 * - **Anzeigeraum**: Kugel mit Mittelpunkt im Ursprung, Scheitel (0, R, 0). Rig, Kamera, Sonne, Himmel.
 *
 * Abbildung (azimutal, abstandstreu um den Fokus): `q = F.xz`, `α = |q| / R`, `n = (sin α · q̂.x, cos α, sin α · q̂.z)`,
 * Anzeigepunkt `(R + h − (1 − cos α) · c · R) · n` mit `h = F.y − R` und dem Krümmungs-Boost c (die alte
 * „übertriebene Perspektive": ferne Erde sinkt zusätzlich ab). Die Höhe geht entlang der Kugelnormale; Bogenlängen
 * vom Fokus bleiben erhalten. Umkehrung über `α = atan2(|P.xz|, P.y)` (auch am Scheitel gut konditioniert).
 *
 * Normalen werden nicht abgebildet: Licht und Schatten rechnen in der Ebene (jede Stelle sieht die Sonne gleich flach),
 * nur die finale Projektion ist gebogen (STYLE 5.7).
 *
 * Weiter als π·R vom Fokus (≈ 100 Einheiten) liefe die Abbildung einmal um die Kugel und käme am Scheitel wieder an:
 * α ist deshalb auf π begrenzt — so Fernes landet am Gegenpol unter dem Gelände statt neben der Kamera.
 */
export class DisplayMapping {
  /** Anzeigeradius R der Kugel. */
  readonly radius: { value: number } & FloatNode;
  /** Krümmungs-Boost c (0 = reine Kugel; Karte 0,14). */
  readonly curvature: { value: number } & FloatNode;

  constructor(radius = 32, curvature = 0) {
    this.radius = uniform(radius) as unknown as { value: number } & FloatNode;
    this.curvature = uniform(curvature) as unknown as { value: number } & FloatNode;
  }

  get R(): number {
    return this.radius.value;
  }

  // --- TSL -----------------------------------------------------------------------------------------------

  /** Flacher Raum → Anzeigeraum (TSL). */
  toDisplay(p: Vec3Node): Vec3Node {
    const R = this.radius;
    const q = vec2(p.x, p.z);
    const d = length(q);
    const alpha = min(d.div(R), float(Math.PI));
    const s = sin(alpha).div(max(d, float(1e-6)));
    const c = cos(alpha);
    const h = p.y.sub(R);
    const r = R.add(h).sub(float(1).sub(c).mul(this.curvature).mul(R));
    return vec3(q.x.mul(s), c, q.y.mul(s)).mul(r) as unknown as Vec3Node;
  }

  /** Anzeigeraum → flacher Raum (TSL). */
  toFlat(P: Vec3Node): Vec3Node {
    const R = this.radius;
    const rxz = length(vec2(P.x, P.z));
    const alpha = atan(rxz, P.y);
    const k = alpha.mul(R).div(max(rxz, float(1e-6)));
    const h = length(P).sub(R).add(float(1).sub(cos(alpha)).mul(this.curvature).mul(R));
    return vec3(P.x.mul(k), R.add(h), P.z.mul(k)) as unknown as Vec3Node;
  }

  /**
   * Objektraum-Verzug für Materialien, deren Modellmatrix `positionLocal` in den flachen Raum legt:
   * `M⁻¹ · display(M · p)` (three wendet M danach wieder an). Ersetzt den alten `bendNode`.
   */
  warp(p: Vec3Node): Vec3Node {
    const w = (modelWorldMatrix as unknown as { mul(v: unknown): { xyz: Vec3Node } }).mul(vec4(p, 1)).xyz;
    return (modelWorldMatrixInverse as unknown as { mul(v: unknown): { xyz: Vec3Node } }).mul(vec4(this.toDisplay(w), 1)).xyz;
  }

  // --- CPU -----------------------------------------------------------------------------------------------

  /** Flacher Raum → Anzeigeraum. */
  toDisplayCpu(p: Vector3, out = new Vector3()): Vector3 {
    const R = this.radius.value;
    const d = Math.hypot(p.x, p.z);
    const alpha = Math.min(d / R, Math.PI);
    const s = d > 1e-9 ? Math.sin(alpha) / d : 1 / R;
    const c = Math.cos(alpha);
    const r = p.y - (1 - c) * this.curvature.value * R;
    return out.set(p.x * s * r, c * r, p.z * s * r);
  }

  /** Anzeigeraum → flacher Raum. */
  toFlatCpu(P: Vector3, out = new Vector3()): Vector3 {
    const R = this.radius.value;
    const rxz = Math.hypot(P.x, P.z);
    const alpha = Math.atan2(rxz, P.y);
    const k = rxz > 1e-9 ? (alpha * R) / rxz : 1;
    const h = P.length() - R + (1 - Math.cos(alpha)) * this.curvature.value * R;
    return out.set(P.x * k, R + h, P.z * k);
  }

  /**
   * Starre Drehung des Anzeige-Rahmens an einem Punkt des flachen Raums: Drehung um die Tangentialachse um −α (flache
   * Richtungen → Anzeigerichtungen). Für Objekte, die als Ganzes stehen (Held, Brett, Kamera-Schienen).
   */
  rotationAt(p: Vector3, out = new Quaternion()): Quaternion {
    const R = this.radius.value;
    const d = Math.hypot(p.x, p.z);
    if (d < 1e-9) return out.identity();
    // Achse u_t = (−q̂z, 0, q̂x) · (−1): Drehung um (q̂z, 0, −q̂x) um +α
    _axis.set(p.z / d, 0, -p.x / d);
    return out.setFromAxisAngle(_axis, Math.min(d / R, Math.PI));
  }

  /** Matrix: flacher Rahmen am Punkt `p` (Ursprung dort, Achsen des flachen Raums) → Anzeigeraum (starr). */
  frameAt(p: Vector3, out = new Matrix4()): Matrix4 {
    this.rotationAt(p, _q);
    this.toDisplayCpu(p, _t);
    return out.compose(_t, _q, _one);
  }

  /**
   * Anzeigepose eines starren Objekts, dessen flache Pose (Position + Drehung im flachen Raum) gegeben ist: die Position
   * wird abgebildet, die Drehung mit dem Rahmen am Ort vorn multipliziert.
   */
  poseToDisplay(position: Vector3, quaternion: Quaternion, outPos: Vector3, outQuat: Quaternion): void {
    this.rotationAt(position, _q);
    this.toDisplayCpu(position, outPos);
    outQuat.copy(_q).multiply(quaternion);
  }

  /** Abstand (Bogen auf der Ebene) ab dem Fokus, ab dem ein Punkt hinter dem Horizont liegt (≈ 0,5 π R). */
  get horizonArc(): number {
    return 0.5 * Math.PI * this.radius.value;
  }
}

const _axis = new Vector3();
const _q = new Quaternion();
const _t = new Vector3();
const _one = new Vector3(1, 1, 1);
