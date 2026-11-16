/**
 * Weiche Schatten an den Wänden des Würfels (Probe „Anfang einer Form“, Runde 5): Florian: „an allen Seiten … immer max 3 gleichzeitig
 * sichtbar“ und „kann der Schatten an den Wänden realistischer aussehen mit realistischem Weichzeichner“.
 *
 * Je Achse ein Bild des Umrisses der Blase (von der Achse aus, wie ein Licht von gegenüber), zweimal weichgezeichnet: ein enger Kern
 * und ein weiter Halbschatten, gemischt wie ein echter weicher Schatten. Jede der sechs Wände legt das Bild ihrer Achse auf sich
 * (multipliziert, wie Schatten auf Papier); wie stark, sagt der Aufrufer (die Wand gegenüber der Kamera, also höchstens drei).
 */

import {
  BufferAttribute,
  BufferGeometry,
  Color,
  CustomBlending,
  AddEquation,
  DoubleSide,
  FloatType,
  Group,
  HalfFloatType,
  LinearFilter,
  Mesh,
  NoBlending,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  SrcColorFactor,
  Vector2,
  Vector3,
  WebGLRenderTarget,
  type WebGLRenderer,
  ZeroFactor,
} from 'three';

/** Lage einer Ansicht: (u, v) in Weltkoordinaten je Achse, wie Bild und Wand sie lesen */
const ACHSE_GLSL = /* glsl */ `
vec2 ebene(vec3 p, int achse) {
  if (achse == 0) return vec2(p.z, p.y);
  if (achse == 1) return vec2(p.x, p.z);
  return vec2(p.x, p.y);
}
`;

const MASKE_VERTEX = /* glsl */ `
attribute float aSicht;
uniform int uAchse;
uniform vec3 uMitte;
uniform float uHalb;
varying float vS;
${ACHSE_GLSL}
void main() {
  vS = aSicht;
  vec3 p = (modelMatrix * vec4(position, 1.0)).xyz - uMitte;
  gl_Position = vec4(ebene(p, uAchse) / uHalb, 0.0, 1.0);
}
`;
const MASKE_FRAGMENT = /* glsl */ `
precision highp float;
varying float vS;
void main() {
  if (vS < 0.5) discard;
  gl_FragColor = vec4(1.0);
}
`;

const QUAD_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;
/** Gauß, getrennt nach Richtung, 31 Abgriffe */
const WEICH_FRAGMENT = /* glsl */ `
precision highp float;
uniform sampler2D uBild;
uniform vec2 uSchritt;
uniform float uSigma;
varying vec2 vUv;
void main() {
  float s = 0.0;
  float g = 0.0;
  for (int k = -15; k <= 15; k++) {
    float x = float(k) * max(uSigma, 0.5) / 5.0;
    float w = exp(-0.5 * (x * x) / (max(uSigma, 0.5) * max(uSigma, 0.5)));
    s += texture2D(uBild, vUv + uSchritt * x).r * w;
    g += w;
  }
  gl_FragColor = vec4(vec3(s / g), 1.0);
}
`;

const WAND_VERTEX = /* glsl */ `
varying vec3 vW;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;
const WAND_FRAGMENT = /* glsl */ `
precision highp float;
uniform sampler2D uKern;
uniform sampler2D uHalbschatten;
uniform int uAchse;
uniform vec3 uMitte;
uniform float uHalb;
uniform vec3 uFarbe;
uniform float uStaerke;
varying vec3 vW;
${ACHSE_GLSL}
void main() {
  vec2 q = ebene(vW - uMitte, uAchse) / uHalb * 0.5 + 0.5;
  float drin = step(0.0, q.x) * step(q.x, 1.0) * step(0.0, q.y) * step(q.y, 1.0);
  float s = (0.55 * texture2D(uKern, q).r + 0.45 * texture2D(uHalbschatten, q).r) * drin;
  gl_FragColor = vec4(mix(vec3(1.0), uFarbe, s * uStaerke), 1.0);
}
`;

/** eine der sechs Wände: Achse, Seite (−1, +1), Stärke (0..1) */
export interface WandStaerke {
  achse: 0 | 1 | 2;
  seite: -1 | 1;
  staerke: number;
}

/** Würfel: Mitte, halbe Kantenlänge je Achse */
export interface Wuerfel {
  mitte: Vector3;
  halb: Vector3;
}

const AUFLOESUNG = 384;

export class WandSchatten {
  /** die sechs Wände (in die Szene der Haut hängen) */
  readonly gruppe = new Group();
  private wand: { mesh: Mesh; mat: ShaderMaterial; achse: 0 | 1 | 2; seite: -1 | 1 }[] = [];
  private masken: { roh: WebGLRenderTarget; tmp: WebGLRenderTarget; kern: WebGLRenderTarget; halb: WebGLRenderTarget }[] = [];
  private maskeSzene = new Scene();
  private maskeMat: ShaderMaterial;
  private maskeNetz: Mesh | null = null;
  private quadSzene = new Scene();
  private quadMat: ShaderMaterial;
  private kamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

  constructor() {
    const ziel = (): WebGLRenderTarget =>
      new WebGLRenderTarget(AUFLOESUNG, AUFLOESUNG, { type: HalfFloatType, depthBuffer: false, magFilter: LinearFilter, minFilter: LinearFilter });
    for (let a = 0; a < 3; a++) this.masken.push({ roh: ziel(), tmp: ziel(), kern: ziel(), halb: ziel() });
    this.maskeMat = new ShaderMaterial({
      vertexShader: MASKE_VERTEX,
      fragmentShader: MASKE_FRAGMENT,
      uniforms: { uAchse: { value: 0 }, uMitte: { value: new Vector3() }, uHalb: { value: 1 } },
      side: DoubleSide,
      depthTest: false,
      depthWrite: false,
      blending: NoBlending,
    });
    this.quadMat = new ShaderMaterial({
      vertexShader: QUAD_VERTEX,
      fragmentShader: WEICH_FRAGMENT,
      uniforms: { uBild: { value: null }, uSchritt: { value: new Vector2() }, uSigma: { value: 1 } },
      depthTest: false,
      depthWrite: false,
      blending: NoBlending,
    });
    const quad = new BufferGeometry();
    quad.setAttribute('position', new BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    quad.setAttribute('uv', new BufferAttribute(new Float32Array([0, 0, 2, 0, 0, 2]), 2));
    this.quadSzene.add(new Mesh(quad, this.quadMat));
    for (const achse of [0, 1, 2] as const)
      for (const seite of [-1, 1] as const) {
        const mat = new ShaderMaterial({
          vertexShader: WAND_VERTEX,
          fragmentShader: WAND_FRAGMENT,
          uniforms: {
            uKern: { value: this.masken[achse]!.kern.texture },
            uHalbschatten: { value: this.masken[achse]!.halb.texture },
            uAchse: { value: achse },
            uMitte: { value: new Vector3() },
            uHalb: { value: 1 },
            uFarbe: { value: new Color(0.85, 0.85, 0.85) },
            uStaerke: { value: 0 },
          },
          side: DoubleSide,
          depthTest: false,
          depthWrite: false,
          transparent: true,
          blending: CustomBlending,
          blendEquation: AddEquation,
          blendSrc: ZeroFactor,
          blendDst: SrcColorFactor,
        });
        const mesh = new Mesh(new PlaneGeometry(2, 2), mat);
        mesh.renderOrder = -20;
        mesh.frustumCulled = false;
        mesh.visible = false;
        this.gruppe.add(mesh);
        this.wand.push({ mesh, mat, achse, seite });
      }
    void FloatType;
  }

  /** die Blase, deren Umriss die Schatten wirft (sichtbare Teile, `aSicht` ≥ 0,5) */
  setzeBlase(geo: BufferGeometry | null): void {
    if (this.maskeNetz) this.maskeSzene.remove(this.maskeNetz);
    this.maskeNetz = null;
    if (!geo) return;
    this.maskeNetz = new Mesh(geo, this.maskeMat);
    this.maskeNetz.frustumCulled = false;
    this.maskeSzene.add(this.maskeNetz);
  }

  /**
   * Masken der Achsen rechnen (nur, wo eine Wand zu sehen ist) und die Wände setzen. `weich`: Halbschatten (Welt), der Kern ist ein
   * Viertel davon. `farbe`: Farbe des vollen Schattens (linear).
   */
  aktualisieren(r: WebGLRenderer, w: Wuerfel, waende: WandStaerke[], weich: number, farbe: Color): void {
    const halbMaske = Math.max(w.halb.x, w.halb.y, w.halb.z);
    const vorher = r.getRenderTarget();
    const texel = (2 * halbMaske) / AUFLOESUNG;
    for (const achse of [0, 1, 2] as const) {
      const sichtbar = waende.some((x) => x.achse === achse && x.staerke > 1e-3);
      if (!sichtbar || !this.maskeNetz) continue;
      const M = this.masken[achse]!;
      this.maskeMat.uniforms.uAchse!.value = achse;
      (this.maskeMat.uniforms.uMitte!.value as Vector3).copy(w.mitte);
      this.maskeMat.uniforms.uHalb!.value = halbMaske;
      r.setRenderTarget(M.roh);
      r.setClearColor(0x000000, 1);
      r.clear(true, false, false);
      r.render(this.maskeSzene, this.kamera);
      const weichzeichnen = (von: WebGLRenderTarget, nach: WebGLRenderTarget, sigma: number): void => {
        this.quadMat.uniforms.uSigma!.value = sigma;
        this.quadMat.uniforms.uBild!.value = von.texture;
        (this.quadMat.uniforms.uSchritt!.value as Vector2).set(1 / AUFLOESUNG, 0);
        r.setRenderTarget(M.tmp);
        r.render(this.quadSzene, this.kamera);
        this.quadMat.uniforms.uBild!.value = M.tmp.texture;
        (this.quadMat.uniforms.uSchritt!.value as Vector2).set(0, 1 / AUFLOESUNG);
        r.setRenderTarget(nach);
        r.render(this.quadSzene, this.kamera);
      };
      weichzeichnen(M.roh, M.kern, Math.max(0.6, (weich * 0.25) / texel));
      weichzeichnen(M.roh, M.halb, Math.max(0.6, weich / texel));
    }
    r.setRenderTarget(vorher);
    for (const e of this.wand) {
      const z = waende.find((x) => x.achse === e.achse && x.seite === e.seite);
      const s = z?.staerke ?? 0;
      e.mesh.visible = s > 1e-3;
      e.mat.uniforms.uStaerke!.value = s;
      (e.mat.uniforms.uMitte!.value as Vector3).copy(w.mitte);
      e.mat.uniforms.uHalb!.value = halbMaske;
      (e.mat.uniforms.uFarbe!.value as Color).copy(farbe);
      // Wand an ihren Ort: Ebene senkrecht zur Achse, so groß wie die Seite des Würfels
      const m = e.mesh;
      m.position.copy(w.mitte);
      m.rotation.set(0, 0, 0);
      if (e.achse === 0) {
        m.position.x += e.seite * w.halb.x;
        m.rotation.y = Math.PI / 2;
        m.scale.set(w.halb.z, w.halb.y, 1);
      } else if (e.achse === 1) {
        m.position.y += e.seite * w.halb.y;
        m.rotation.x = -Math.PI / 2;
        m.scale.set(w.halb.x, w.halb.z, 1);
      } else {
        m.position.z += e.seite * w.halb.z;
        m.scale.set(w.halb.x, w.halb.y, 1);
      }
      m.updateMatrixWorld();
    }
  }
}
