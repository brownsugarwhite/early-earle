import { Box3, DirectionalLight, LinearFilter, Matrix4, Object3D, Vector3 } from 'three/webgpu';
import type { DepthTexture, LightShadow, NodeBuilder, UniformNode } from 'three/webgpu';
import { Fn, floor, fract, fwidth, lightTargetDirection, mix, normalView, reference, smoothstep, texture, uniform, vec2 } from 'three/tsl';
import type { FloatNode, Vec2Node, Vec3Node } from './tsl';

/**
 * Nachschärfender Schattenfilter (Hook: `light.shadow.filterNode`, r186 `ShadowNode.setupShadow`).
 * Empfängerseitiger, steigungsabhängiger Bias (`depthPerTexel · tan θ`): bei 10° Sonne streift das Licht den Boden,
 * ein konstanter Bias würde entweder Acne oder weit versetzte Schatten erzeugen.
 * Ein Vergleichs-Tap über den Hardware-Compare-Sampler (LINEAR → 2×2-PCF-Rampe über genau ein Texel),
 * danach `smoothstep(0.5 ± w)` mit `w = ½·fwidth(r)`: die Rampe wird auf exakt einen Bildschirmpixel
 * zusammengezogen → gerade, anti-aliasierte, harte Kanten ohne Treppen und ohne Weichzeichnung.
 * Fällt die Plattform auf Nearest-Compare zurück (three: kein TEXTURE_COMPARE, z. B. Android-WebGPU), wird die
 * 2×2-Rampe manuell aus vier Taps gebaut.
 */
export function createHardShadowFilter(light: DirectionalLight, depthPerTexel: UniformNode<'float', number>) {
  return Fn((inputs: { depthTexture: DepthTexture; shadowCoord: Vec3Node; shadow: LightShadow }, builder: NodeBuilder) => {
  const { depthTexture, shadowCoord, shadow } = inputs;
  // Steigung des Empfängers zum Licht: tan θ = sqrt(1 − (N·L)²) / (N·L), begrenzt
  const ndl = normalView.dot(lightTargetDirection(light)).clamp(0.04, 1);
  const tanTheta = ndl.mul(ndl).oneMinus().max(0).sqrt().div(ndl).clamp(1, 12);
  const slopeBias = depthPerTexel.mul(tanTheta).mul(2.0);
  const reversed = (builder.renderer as { reversedDepthBuffer?: boolean }).reversedDepthBuffer === true;
  const z = reversed ? shadowCoord.z.add(slopeBias) : shadowCoord.z.sub(slopeBias);
  let r: FloatNode;
  if (depthTexture.minFilter === LinearFilter) {
    r = texture(depthTexture, shadowCoord.xy).compare(z) as unknown as FloatNode;
  } else {
    const mapSize = reference('mapSize', 'vec2', shadow) as unknown as Vec2Node;
    const texel = vec2(1).div(mapSize);
    const st = shadowCoord.xy.mul(mapSize).sub(0.5);
    const f = fract(st) as unknown as Vec2Node;
    const base = floor(st).add(0.5).mul(texel);
    const tap = (ox: number, oy: number) =>
      texture(depthTexture, base.add(vec2(ox, oy).mul(texel))).compare(z) as unknown as FloatNode;
    r = mix(mix(tap(0, 0), tap(1, 0), f.x), mix(tap(0, 1), tap(1, 1), f.x), f.y);
  }
  const w = fwidth(r).mul(0.5).clamp(1 / 256, 0.5);
  return smoothstep(w.oneMinus().sub(0.5), w.add(0.5), r);
  });
}

export interface SunOptions {
  mapSize?: number;
  /** Nachschärfender Filter an (true) oder three-Standard-PCF (false, Vergleich). */
  sharpen?: boolean;
  elevationDeg?: number;
  /** Azimut relativ zur Blickachse (0 = hinter der Kamera Richtung -Z, 90 = rechts). */
  azimuthDeg?: number;
  bias?: number;
  normalBias?: number;
  /** Abstand Licht ↔ Ziel (nur für die Schattenkamera relevant). */
  distance?: number;
}

const _corner = new Vector3();
const _min = new Vector3();
const _max = new Vector3();
const _m = new Matrix4();

/**
 * Sonne als Kind des Kamera-Rigs: flache Höhe (≈10°), 60–80° seitlich, damit Schatten als lange Bänder über den
 * Bildschirm laufen. `shadow.autoUpdate = false` — der Schattenpass läuft nur nach `requestUpdate()`.
 */
export class SunRig {
  readonly root = new Object3D();
  readonly target = new Object3D();
  light!: DirectionalLight;
  elevationDeg: number;
  azimuthDeg: number;
  sharpen: boolean;
  readonly mapSize: number;
  private readonly bias: number;
  private readonly normalBias: number;
  private readonly distance: number;
  /** Tiefe je Schattentexel (normalisiert), aus fitShadow; Basis des steigungsabhängigen Bias. */
  readonly depthPerTexel = uniform(0.0005);
  /** Zähler der gerenderten Schattenpässe (zur Kontrolle "nicht im Leerlauf"). */
  updatesRequested = 0;

  constructor(options: SunOptions = {}) {
    this.root.name = 'SunRig';
    this.target.name = 'SunTarget';
    this.root.add(this.target);
    this.mapSize = options.mapSize ?? 2048;
    this.sharpen = options.sharpen ?? true;
    this.elevationDeg = options.elevationDeg ?? 10;
    this.azimuthDeg = options.azimuthDeg ?? 70;
    this.bias = options.bias ?? -0.0006;
    this.normalBias = options.normalBias ?? 0.04;
    this.distance = options.distance ?? 80;
    this.rebuild();
  }

  /** Erzeugt das Licht neu (neue UUID → Materialien kompilieren mit dem anderen Filter neu). */
  private rebuild(): void {
    if (this.light) {
      this.root.remove(this.light);
      this.light.dispose();
    }
    const light = new DirectionalLight(0xffffff, 1);
    light.name = 'EarleSun';
    light.castShadow = true;
    light.shadow.mapSize.set(this.mapSize, this.mapSize);
    light.shadow.autoUpdate = false;
    light.shadow.needsUpdate = true;
    light.shadow.bias = this.bias;
    light.shadow.normalBias = this.normalBias;
    light.shadow.radius = 1;
    (light.shadow as unknown as { filterNode: unknown }).filterNode = this.sharpen ? createHardShadowFilter(light, this.depthPerTexel) : null;
    light.target = this.target;
    this.root.add(light);
    this.light = light;
    this.applyAngles();
  }

  setSharpen(sharpen: boolean): void {
    if (sharpen === this.sharpen) return;
    this.sharpen = sharpen;
    this.rebuild();
  }

  setAngles(elevationDeg: number, azimuthDeg: number): void {
    this.elevationDeg = elevationDeg;
    this.azimuthDeg = azimuthDeg;
    this.applyAngles();
    this.requestUpdate();
  }

  /** Richtung zur Sonne im Raum von `root` (Rig blickt nach -Z). */
  directionLocal(out: Vector3): Vector3 {
    const el = (this.elevationDeg * Math.PI) / 180;
    const az = (this.azimuthDeg * Math.PI) / 180;
    return out.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
  }

  /** Richtung zur Sonne im Weltraum. */
  directionWorld(out: Vector3): Vector3 {
    this.directionLocal(out);
    return out.transformDirection(this.root.matrixWorld);
  }

  private applyAngles(): void {
    this.directionLocal(_corner);
    this.light.position.copy(_corner).multiplyScalar(this.distance).add(this.target.position);
  }

  requestUpdate(): void {
    this.light.shadow.needsUpdate = true;
    this.updatesRequested++;
  }

  /**
   * Passt die orthografische Schattenkamera eng an die Grenzen des Patches (Objektraum-AABB inkl.
   * Vegetationshöhe, transformiert mit `objectMatrixWorld`) an. Rand Richtung Sonne: `hTotal / tan(θ)`.
   * Größe auf 4-Einheiten-Quanten gerundet, Mitte auf Texel gesnappt → kein Flimmern beim Rollen.
   */
  fitShadow(localBounds: Box3, objectMatrixWorld: Matrix4, hTotal: number): void {
    this.root.updateWorldMatrix(true, true);
    const shadow = this.light.shadow;
    shadow.updateMatrices(this.light);
    const cam = shadow.camera;
    _m.multiplyMatrices(cam.matrixWorldInverse, objectMatrixWorld);
    _min.set(Infinity, Infinity, Infinity);
    _max.set(-Infinity, -Infinity, -Infinity);
    for (let i = 0; i < 8; i++) {
      _corner.set(i & 1 ? localBounds.max.x : localBounds.min.x, i & 2 ? localBounds.max.y : localBounds.min.y, i & 4 ? localBounds.max.z : localBounds.min.z);
      _corner.applyMatrix4(_m);
      _min.min(_corner);
      _max.max(_corner);
    }
    const el = Math.max(0.02, (this.elevationDeg * Math.PI) / 180);
    const sunMargin = hTotal / Math.tan(el);
    const quantum = 4;
    const sizeX = Math.ceil((_max.x - _min.x + 1) / quantum) * quantum;
    const sizeY = Math.ceil((_max.y - _min.y + 1) / quantum) * quantum;
    const texelX = sizeX / this.mapSize;
    const texelY = sizeY / this.mapSize;
    const cx = Math.round((_min.x + _max.x) * 0.5 / texelX) * texelX;
    const cy = Math.round((_min.y + _max.y) * 0.5 / texelY) * texelY;
    cam.left = cx - sizeX * 0.5;
    cam.right = cx + sizeX * 0.5;
    cam.bottom = cy - sizeY * 0.5;
    cam.top = cy + sizeY * 0.5;
    // View-Raum: sichtbare Tiefe ist -z. Nächste Ecke = _max.z, fernste = _min.z.
    cam.near = Math.max(0.1, -_max.z - sunMargin);
    cam.far = -_min.z + sunMargin;
    cam.updateProjectionMatrix();
    // Boden liegt fast parallel zum Licht: die Tiefe ändert sich pro Texel entlang der Licht-Y-Achse am stärksten
    this.depthPerTexel.value = texelY / Math.max(1e-3, cam.far - cam.near);
  }

  dispose(): void {
    this.light.dispose();
  }
}
