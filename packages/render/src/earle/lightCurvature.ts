import { Vector3 } from 'three/webgpu';
import { acos, cameraViewMatrix, clamp, cos, cross, dot, float, length, max, normalize, positionView, sin, uniform, vec3, vec4 } from 'three/tsl';
import { asFloat, type FloatNode, type TSLUniform, type Vec3Node } from './tsl';

/**
 * Lichtkrümmung (Karte v5, R0): zwei regelbare Krümmungen des Lichts auf der angezeigten Kugel.
 *
 * Seit ADR 0002 rechnen alle Materialien N·L mit den flachen Normalen der Ebene, und die Sonne hängt am Rig: Schwenken
 * ist eine reine Verschiebung, N·L bleibt je Punkt gleich — die Lichtbänder kleben am Relief. Auf der alten Kugel rollte
 * der Planet unter fester Sonne, Terminator und Lichtstufen wanderten „wie Flüssigkeiten“ (Florian, Punkt 8). Hier wird
 * die Lichtrichtung je Fragment mit dem Anzeige-Rahmen am Ort gedreht (`DisplayMapping.rotationAt`, bisher nur CPU):
 * Rodrigues-Drehung von L um die Achse `n̂ × up` mit dem Winkel `k · acos(n̂ · up)` — n̂ ist die Kugelnormale am Fragment
 * (`globeUp`), `up` die Hochachse der Ebene (`planeUp`). Bei k = 1 gilt `up · L' = n̂ · L` (volle Kugel, Terminator schon
 * ≈ 5,6 Einheiten neben dem Fokus = alte Nachtseite), bei k = 0 bleibt L (flach, translationsinvariant).
 *
 * Zwei Krümmungen als geteilte Uniforms (ändern ohne Neukompilieren; Earle-Lab-Regler, `?lichtkugel=`, `?tintenkugel=`):
 * - `bands` **Lichtkugel** k_b (Standard 0,4): Lichtbänder und Verlauf innerhalb der Stufen — die Bänder wandern beim
 *   Schwenken, nach unten auf Stufe 0 geklemmt (keine Nachtseite).
 * - `ink` **Tintenkugel** k_t (Standard 0): Terminator (Eigenschatten), Schattenraum (`displayShadowWarp`) und der
 *   Werfer-Discard im Schattenpass. Alle drei Stellen lesen denselben Wert → Licht und Schatten rechnen in derselben
 *   Krümmung. Jedes k_t > 0 bringt Nachtseite und das „Atmen“ der Schatten beim Schwenken anteilig zurück.
 *
 * Kosten ≈ 30–50 ALU je Fragment, keine `Fn().setLayout` (TSL-Cache-Falle, `common/tslFunctionCache.ts`).
 */
export const earleLight = {
  /** Lichtkugel k_b: Krümmung der Lichtbänder (0 flach … 1 volle Kugel). */
  bands: uniform(0.4) as TSLUniform,
  /** Tintenkugel k_t: Krümmung von Terminator, Schattenraum und Werfer-Discard (0 flach … 1 volle Kugel). */
  ink: uniform(0) as TSLUniform,
};

/** Krümmungen stellen (Lab-Regler, URL); fehlende Werte bleiben. Beide auf 0 … 1 begrenzt. */
export function setLightCurvature(values: { bands?: number; ink?: number }): void {
  if (values.bands !== undefined && Number.isFinite(values.bands)) earleLight.bands.value = Math.min(1, Math.max(0, values.bands));
  if (values.ink !== undefined && Number.isFinite(values.ink)) earleLight.ink.value = Math.min(1, Math.max(0, values.ink));
}

/**
 * Rodrigues: L um die Achse `n̂ × up` drehen, Winkel `k · acos(n̂ · up)` — dieselbe Drehung, die n̂ auf `up` legt (bei
 * k = 1). Am Scheitel (n̂ = up) ist die Achse 0 und der Winkel 0: ohne NaN, L bleibt. `n̂` und `up` sind Einheitsvektoren
 * im selben Raum wie L.
 */
function rotateLight(L: Vec3Node, n: Vec3Node, up: Vec3Node, k: FloatNode): Vec3Node {
  const c = cross(n, up);
  const axis = c.div(max(length(c), 1e-6));
  const angle = acos(clamp(dot(n, up), -1, 1)).mul(k);
  const s = sin(angle);
  const cs = cos(angle);
  // L' = L·cos + (a × L)·sin + a·(a · L)·(1 − cos)
  return L.mul(cs)
    .add(cross(axis, L).mul(s))
    .add(axis.mul(dot(axis, L).mul(float(1).sub(cs)))) as unknown as Vec3Node;
}

/**
 * Gekrümmte Lichtrichtung im **View-Raum** (Lichtmodelle: `input.lightDirection`): n̂ = Richtung vom Kugelmittelpunkt
 * (Weltursprung) zur Fragmentposition, `up` = Hochachse der Welt (= Ebene; die Ebene dreht sich nicht) — wie `globeUp`
 * und `planeUp` im Terrain-Material (`planet.ts`).
 */
export function curvedLightView(L: Vec3Node, k: FloatNode | number): Vec3Node {
  const view = cameraViewMatrix as unknown as { mul(v: unknown): { xyz: Vec3Node } };
  const center = view.mul(vec4(0, 0, 0, 1)).xyz;
  const n = normalize((positionView as unknown as Vec3Node).sub(center));
  const up = normalize(view.mul(vec4(0, 1, 0, 0)).xyz);
  return rotateLight(L, n, up, asFloat(k));
}

/**
 * Gekrümmte Lichtrichtung im **Weltraum** (Schattenpass-Discard, Vertex-Shader der Punkte): n̂ = normalize(posWorld)
 * (Anzeigekugel um den Ursprung), `up` = (0, 1, 0).
 */
export function curvedLightWorld(L: Vec3Node, posWorld: Vec3Node, k: FloatNode | number): Vec3Node {
  return rotateLight(L, normalize(posWorld), vec3(0, 1, 0) as unknown as Vec3Node, asFloat(k));
}

const _axis = new Vector3();
const _n = new Vector3();
const _u = new Vector3();
const _aL = new Vector3();

/**
 * CPU-Gegenstück (dieselbe Formel, allgemeiner Rahmen): L um `n̂ × up` mit `k · acos(n̂ · up)` drehen. `n`, `up` werden
 * normalisiert; `out` darf `L` sein.
 */
export function rotateLightCpu(L: Vector3, n: Vector3, up: Vector3, k: number, out = new Vector3()): Vector3 {
  _n.copy(n).normalize();
  const u = _u.copy(up).normalize();
  const d = Math.min(1, Math.max(-1, _n.dot(u)));
  _axis.crossVectors(_n, u);
  const len = _axis.length();
  if (len > 1e-6) _axis.divideScalar(len);
  else _axis.set(0, 0, 0);
  const angle = Math.acos(d) * k;
  const s = Math.sin(angle);
  const cs = Math.cos(angle);
  const aL = _axis.dot(L);
  _aL.crossVectors(_axis, L);
  const lx = L.x;
  const ly = L.y;
  const lz = L.z;
  return out.set(lx * cs + _aL.x * s + _axis.x * aL * (1 - cs), ly * cs + _aL.y * s + _axis.y * aL * (1 - cs), lz * cs + _aL.z * s + _axis.z * aL * (1 - cs));
}

const _up = new Vector3(0, 1, 0);

/** CPU: gekrümmte Lichtrichtung an einer Weltposition (Anzeigekugel um den Ursprung, `up` = (0, 1, 0)). */
export function curvedLightCpu(L: Vector3, posWorld: Vector3, k: number, out = new Vector3()): Vector3 {
  return rotateLightCpu(L, posWorld, _up, k, out);
}
