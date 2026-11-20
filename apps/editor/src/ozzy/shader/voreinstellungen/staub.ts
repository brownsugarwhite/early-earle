/**
 * Staub (Effekte; neu gedacht nach Florians Urteil „gefällt mir nicht so gut“). Die Form ist eine Statue aus gehämmertem Gold. Von
 * einer Seite her verbrennt sie: Vor der Front reißt die Oberfläche in glühende Risse, verkohlt und zerfällt in 65 536 Teilchen:
 * - **Blattgold:** sieben von zehn Teilchen sind Blättchen, die sich im Wind drehen und flattern. Jedes hat eine eigene Drehachse;
 *   wenn seine Fläche das Licht zum Auge spiegelt, blitzt es auf (der Glanz wandert so über die Wolke).
 * - **Glut:** drei von zehn sind Funken; sie steigen auf (Auftrieb), kühlen nach Planck von Weißgelb über Orange zu Dunkelrot ab und
 *   flackern.
 * - **Bild wie mit einer Kamera:** Jedes Teilchen ist ein Streifen in Richtung seiner Bewegung (Bewegungsunschärfe); vor und hinter
 *   der Schärfeebene (Mitte der Form) wird es zum weichen Scheibchen (Tiefenschärfe), mit gleicher Lichtmenge. Helles glüht nach
 *   (Glühen über dem Bild). Die Statue verdeckt, was hinter ihr fliegt.
 * Danach kehren alle Teilchen zurück und setzen die Statue wieder zusammen. Die Teilchen rechnet die Grafikkarte (Lage und
 * Geschwindigkeit in zwei Gleitkomma-Bildern, ein Schritt je Bild).
 */
import {
  AddEquation,
  BufferAttribute,
  CustomBlending,
  DataTexture,
  FloatType,
  GLSL3,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  NearestFilter,
  OneFactor,
  OneMinusSrcAlphaFactor,
  RawShaderMaterial,
  RGBAFormat,
  Scene,
  type Texture,
  Vector2,
  Vector3,
  ZeroFactor,
} from 'three';
import { NETZ_FRAGMENT_KOPF, FARBE, LICHT, RAUSCHEN, FLAECHE_VERTEX } from '../glsl';
import { DoubleSide, type ShaderKern, type ShaderLauf, type ShaderWerte, type Voreinstellung } from '../kern';

const S = 256;
/** Anteil der Funken (Zufallswert des Teilchens darunter) */
const GLUT = 0.3;

const FRONT = /* glsl */ `
uniform float uFort;
/** Reihenfolge des Zerfalls (0 … 1): von oben links nach unten rechts, mit Rauschen */
float frontBei(vec3 p) {
  vec3 q = (p - uMitte) / uRadius;
  return dot(q, normalize(vec3(-0.8, 0.55, 0.25))) * -0.42 + 0.5 + 0.12 * snoise(q * 2.4);
}
`;

const SCHRITT = /* glsl */ `
precision highp float;
precision highp sampler2D;
uniform sampler2D tPos;
uniform sampler2D tVel;
uniform sampler2D tHeim;
uniform sampler2D tNorm;
uniform float uDt;
uniform float uZurueck;
uniform float uZeit;
uniform float uWind;
uniform vec3 uMitte;
uniform float uRadius;
${RAUSCHEN}
${FRONT}
layout(location = 0) out vec4 oPos;
layout(location = 1) out vec4 oVel;
void main() {
  ivec2 ij = ivec2(gl_FragCoord.xy);
  vec4 H = texelFetch(tHeim, ij, 0);
  vec4 N = texelFetch(tNorm, ij, 0);
  vec4 P = texelFetch(tPos, ij, 0);
  vec4 V = texelFetch(tVel, ij, 0);
  bool glut = H.w < ${GLUT};
  float f = frontBei(H.xyz);
  if (f > uFort) { oPos = vec4(H.xyz, 0.0); oVel = vec4(0.0); return; }
  vec3 p = P.w <= 0.0 ? H.xyz : P.xyz;
  vec3 v = P.w <= 0.0 ? (N.xyz * (0.05 + 0.2 * N.w) + vec3(0.0, glut ? 0.35 : 0.04, 0.0)) * uRadius : V.xyz;
  if (uZurueck > 0.5) {
    v += (H.xyz - p) * 7.0 * uDt;
    v *= exp(-3.2 * uDt);
  } else {
    vec3 q = p / uRadius * 1.1 + vec3(0.0, -uZeit * 0.12, uZeit * 0.05);
    vec3 wind = curl3(q) * 0.9 + vec3(0.85, 0.32, 0.0);
    vec3 auftrieb = glut ? vec3(0.0, 0.95, 0.0) : vec3(0.0, -0.06, 0.0);
    // Blättchen flattern quer zum Wind
    vec3 flattern = glut ? vec3(0.0) : vec3(sin(uZeit * 6.0 + H.w * 50.0), 0.3 * sin(uZeit * 4.3 + H.w * 17.0), cos(uZeit * 5.0 + H.w * 31.0)) * 0.4;
    v += (wind * uWind + auftrieb + flattern) * uRadius * uDt;
    v *= exp(-(glut ? 0.8 : 1.4) * uDt);
  }
  p += v * uDt;
  oPos = vec4(p, max(P.w, 0.0) + uDt);
  oVel = vec4(v, 0.0);
}
`;

const TEILCHEN_VERTEX = /* glsl */ `
precision highp float;
precision highp sampler2D;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform vec3 cameraPosition;
uniform sampler2D tPos;
uniform sampler2D tVel;
uniform sampler2D tHeim;
uniform vec2 uAufl;
uniform float uDpr;
uniform float uGroesse;
uniform float uArt;
uniform float uFokus;
uniform float uBlende;
uniform vec3 uLichtWelt;
in vec3 position;
in vec2 aUv;
out vec2 vQ;
out float vStreck;
out float vWeich;
out float vAlter;
out float vZufall;
out float vGlanz;
out float vHell;
void main() {
  vec4 P = texture(tPos, aUv);
  vec4 Vv = texture(tVel, aUv);
  float z = texture(tHeim, aUv).w;
  bool glut = z < ${GLUT};
  vQ = vec2(0.0); vStreck = 0.0; vWeich = 0.0; vAlter = 0.0; vZufall = 0.0; vGlanz = 0.0; vHell = 0.0;
  if (P.w <= 0.0 || (uArt > 0.5) != glut) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  vec4 c = projectionMatrix * viewMatrix * vec4(P.xyz, 1.0);
  vec4 c2 = projectionMatrix * viewMatrix * vec4(P.xyz + Vv.xyz * 0.04, 1.0);
  vec2 s = c.xy / c.w * 0.5 * uAufl;
  vec2 s2 = c2.xy / c2.w * 0.5 * uAufl;
  vec2 bew = s2 - s;
  float len = min(length(bew), 60.0 * uDpr);
  vec2 dir = length(bew) > 1e-3 ? normalize(bew) : vec2(1.0, 0.0);
  float zz = fract(z * 7.31);
  float gr = (glut ? mix(0.9, 2.6, zz * zz) : mix(1.2, 4.2, pow(zz, 2.2))) * uGroesse * uDpr;
  // Tiefenschärfe: Zerstreuungskreis nach dem Abstand zur Schärfeebene
  float tiefe = -(viewMatrix * vec4(P.xyz, 1.0)).z;
  float coc = abs(tiefe - uFokus) / max(uFokus, 1e-3) * uBlende * 22.0 * uDpr;
  float r = gr * 0.5 + coc;
  vWeich = clamp(coc / max(r, 1e-3), 0.0, 0.95);
  float halb = len * 0.5;
  vec2 ecke = position.xy;
  vec2 off = dir * ecke.x * (r + halb) + vec2(-dir.y, dir.x) * ecke.y * r;
  vQ = vec2(ecke.x * (r + halb) / r, ecke.y);
  vStreck = halb / r;
  // dieselbe Lichtmenge auf die größere Fläche verteilt
  vHell = (gr * gr * 0.25) / (r * r * (1.0 + vStreck));
  vAlter = P.w;
  vZufall = z;
  // ein Blättchen dreht sich um seine Achse: Glanz, wenn es das Licht zum Auge spiegelt
  vec3 achse = normalize(vec3(fract(z * 13.7) - 0.5, fract(z * 29.3) - 0.5, fract(z * 47.1) - 0.5) + 1e-3);
  float w = P.w * (2.0 + 6.0 * fract(z * 5.3));
  vec3 n0 = normalize(cross(achse, vec3(0.3, 0.7, 0.2)) + 1e-3);
  vec3 nb = n0 * cos(w) + cross(achse, n0) * sin(w);
  vec3 V = normalize(cameraPosition - P.xyz);
  vGlanz = pow(abs(dot(nb, normalize(uLichtWelt + V))), 60.0);
  gl_Position = vec4((s + off) / (0.5 * uAufl) * c.w, c.z, c.w);
}
`;

const TEILCHEN_FRAGMENT = /* glsl */ `
precision highp float;
${FARBE}
uniform float uArt;
in vec2 vQ;
in float vStreck;
in float vWeich;
in float vAlter;
in float vZufall;
in float vGlanz;
in float vHell;
out vec4 farbe;
void main() {
  float d = length(vec2(max(abs(vQ.x) - vStreck, 0.0), vQ.y));
  if (d > 1.0) discard;
  float a = 1.0 - smoothstep(1.0 - max(vWeich, 0.3), 1.0, d);
  if (uArt > 0.5) {
    // Funke: kühlt nach Planck ab und flackert
    float T = mix(2600.0, 850.0, smoothstep(0.0, 3.0, vAlter + vZufall * 3.0));
    float hell = 7.0 * exp(-vAlter * 0.45) * (0.65 + 0.35 * sin(vAlter * 31.0 + vZufall * 100.0));
    farbe = vec4(schwarzkoerper(T) * hell * vHell * a, 0.0);
  } else {
    // Blattgold: matt golden, blitzt auf, wenn es sich zum Licht dreht
    vec3 c = vec3(0.9, 0.62, 0.25) * (0.12 + 0.25 * fract(vZufall * 3.1)) + vec3(1.0, 0.84, 0.52) * vGlanz * 6.0;
    float deck = a * min(vHell * 1.4, 1.0) * (1.0 - smoothstep(6.0, 8.0, vAlter));
    farbe = vec4(c * deck, deck);
  }
}
`;

const FLAECHE = /* glsl */ `
${NETZ_FRAGMENT_KOPF}
uniform vec3 uMitte;
uniform float uRadius;
${RAUSCHEN}
${FARBE}
${LICHT}
${FRONT}
out vec4 farbe;
void main() {
  if (geschnitten()) discard;
  float ab = frontBei(vWelt) - uFort;
  if (ab <= 0.0) discard;
  vec3 n = normaleJetzt();
  vec3 q = (vWelt - uMitte) / uRadius;
  // gehämmertes Gold: feine Mulden
  vec3 hq = q * 55.0;
  const float e = 0.02;
  vec3 hv = voronoi3(hq);
  float h0 = hv.x * hv.x;
  vec3 hg = vec3(voronoi3(hq + vec3(e, 0.0, 0.0)).x, voronoi3(hq + vec3(0.0, e, 0.0)).x, voronoi3(hq + vec3(0.0, 0.0, e)).x);
  hg = (hg * hg - h0) / e;
  n = normalize(n + 0.01 * hg);
  vec3 V = normalize(cameraPosition - vWelt);
  vec3 F0 = vec3(1.0, 0.71, 0.29);
  float nv = clamp(dot(n, V), 0.0, 1.0);
  vec3 F = F0 + (1.0 - F0) * pow(1.0 - nv, 5.0);
  vec3 c = studio(reflect(-V, n)) * F * 0.9 + F0 * 0.03;
  // vor der Front: glühende Risse, die Oberfläche verkohlt
  vec3 vo = voronoi3(q * 13.0);
  float riss = (1.0 - smoothstep(0.0, 0.045, vo.y - vo.x)) * smoothstep(0.16, 0.03, ab);
  float kohle = smoothstep(0.07, 0.0, ab);
  c = mix(c, vec3(0.018, 0.012, 0.009) * (0.6 + 0.8 * fract(vo.z * 7.0)), kohle * 0.92);
  float glut = smoothstep(0.03, 0.0, ab) + riss * (0.5 + 0.5 * smoothstep(0.1, 0.0, ab));
  c += schwarzkoerper(mix(1100.0, 2300.0, smoothstep(0.035, 0.0, ab))) * glut * 4.5;
  farbe = vec4(c, 1.0);
}
`;

const ZUSAMMEN = /* glsl */ `
${RAUSCHEN}
uniform sampler2D tFlaeche;
uniform float uBuehne;
out vec4 farbe;
void main() {
  vec4 f = texture(tFlaeche, vUv);
  vec2 q = vUv - vec2(0.5, 0.55);
  vec3 grund = mix(vec3(0.006, 0.006, 0.01), vec3(0.03, 0.026, 0.04), vUv.y) + vec3(0.05, 0.03, 0.015) * exp(-dot(q, q) * 6.0);
  grund *= 0.95 + 0.05 * noise2(gl_FragCoord.xy * 0.5);
  vec3 c = (uBuehne > 0.5 ? grund : vec3(0.0)) * (1.0 - f.a) + f.rgb;
  farbe = vec4(c, uBuehne > 0.5 ? 1.0 : f.a);
}
`;

const HELL = /* glsl */ `
uniform sampler2D tBild;
out vec4 farbe;
void main() {
  vec3 c = texture(tBild, vUv).rgb;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  farbe = vec4(c * smoothstep(1.6, 4.5, l), 1.0);
}`;

const BLUR = /* glsl */ `
uniform sampler2D tQuelle;
uniform vec2 uRichtung;
out vec4 farbe;
void main() {
  vec2 px = uRichtung / vec2(textureSize(tQuelle, 0));
  vec3 s = vec3(0.0);
  float w = 0.0;
  for (int i = -10; i <= 10; i++) {
    float x = float(i) / 10.0;
    float g = exp(-3.0 * x * x);
    s += texture(tQuelle, vUv + px * float(i) * 1.5).rgb * g;
    w += g;
  }
  farbe = vec4(s / w, 1.0);
}`;

const ENDE = /* glsl */ `
${FARBE}
uniform sampler2D tBild;
uniform sampler2D tGlueh;
out vec4 farbe;
void main() {
  vec4 b = texture(tBild, vUv);
  vec3 gl = texture(tGlueh, vUv).rgb;
  vec3 c = b.rgb + gl * 0.7;
  float a = clamp(max(b.a, luma(gl) * 1.5), 0.0, 1.0);
  vec3 aus = linZuSrgb(aces(c));
  farbe = vec4(aus * a, a);
}
`;

class Staub implements ShaderLauf {
  private readonly schritt: RawShaderMaterial;
  private readonly flaeche: RawShaderMaterial;
  private readonly blaettchen: RawShaderMaterial;
  private readonly glut: RawShaderMaterial;
  private readonly zusammen: RawShaderMaterial;
  private readonly hell: RawShaderMaterial;
  private readonly blur: RawShaderMaterial;
  private readonly ende: RawShaderMaterial;
  private readonly szene = new Scene();
  private readonly geo = new InstancedBufferGeometry();
  private heim: DataTexture | null = null;
  private norm: DataTexture | null = null;
  private stand = -1;
  private fort = -0.1;
  private readonly mitte = new Vector3();

  constructor(k: ShaderKern) {
    this.schritt = new RawShaderMaterial({
      glslVersion: GLSL3,
      uniforms: { tPos: { value: null }, tVel: { value: null }, tHeim: { value: null }, tNorm: { value: null }, uDt: { value: 0 }, uZurueck: { value: 0 }, uZeit: k.u.uZeit, uWind: { value: 1 }, uMitte: k.u.uMitte, uRadius: k.u.uRadius, uFort: { value: 0 } },
      vertexShader: FLAECHE_VERTEX,
      fragmentShader: SCHRITT,
      depthTest: false,
      depthWrite: false,
    });
    this.flaeche = k.netzProgramm(FLAECHE, { seite: DoubleSide, uniforms: { uFort: { value: 0 } } });
    const teilchen = (art: number): RawShaderMaterial =>
      new RawShaderMaterial({
        glslVersion: GLSL3,
        uniforms: {
          tPos: { value: null },
          tVel: { value: null },
          tHeim: { value: null },
          uAufl: k.u.uAufl,
          uDpr: k.u.uDpr,
          uGroesse: { value: 1 },
          uArt: { value: art },
          uFokus: { value: 1 },
          uBlende: { value: 1 },
          uLichtWelt: k.u.uLichtWelt,
        },
        vertexShader: TEILCHEN_VERTEX,
        fragmentShader: TEILCHEN_FRAGMENT,
        depthTest: true,
        depthWrite: false,
        transparent: true,
        blending: CustomBlending,
        blendEquation: AddEquation,
        blendSrc: OneFactor,
        blendDst: art > 0.5 ? OneFactor : OneMinusSrcAlphaFactor,
        blendSrcAlpha: art > 0.5 ? ZeroFactor : OneFactor,
        blendDstAlpha: art > 0.5 ? OneFactor : OneMinusSrcAlphaFactor,
      });
    this.blaettchen = teilchen(0);
    this.glut = teilchen(1);
    this.geo.setAttribute('position', new BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3));
    this.geo.setIndex([0, 1, 2, 0, 2, 3]);
    const uv = new Float32Array(S * S * 2);
    for (let j = 0; j < S; j++)
      for (let i = 0; i < S; i++) {
        uv[2 * (j * S + i)] = (i + 0.5) / S;
        uv[2 * (j * S + i) + 1] = (j + 0.5) / S;
      }
    this.geo.setAttribute('aUv', new InstancedBufferAttribute(uv, 2));
    this.geo.instanceCount = S * S;
    const b = new Mesh(this.geo, this.blaettchen);
    b.frustumCulled = false;
    b.renderOrder = 0;
    const g = new Mesh(this.geo, this.glut);
    g.frustumCulled = false;
    g.renderOrder = 1;
    this.szene.add(b, g);
    this.zusammen = k.flaecheProgramm(ZUSAMMEN, { tFlaeche: { value: null } });
    this.hell = k.flaecheProgramm(HELL, { tBild: { value: null } });
    this.blur = k.flaecheProgramm(BLUR, { tQuelle: { value: null }, uRichtung: { value: new Vector2(1, 0) } });
    this.ende = k.flaecheProgramm(ENDE, { tBild: { value: null }, tGlueh: { value: null } });
  }

  /** Punkte auf der Haut verteilen (nach Fläche), wenn sich das Netz geändert hat */
  private verteilen(k: ShaderKern): void {
    const n = k.netzDaten;
    if (!n) return;
    const P = n.pos, I = n.index, NN = n.normal;
    const T = I.length / 3;
    const kum = new Float64Array(T);
    let summe = 0;
    for (let t = 0; t < T; t++) {
      const a = I[3 * t]!, b = I[3 * t + 1]!, c = I[3 * t + 2]!;
      const ux = P[3 * b]! - P[3 * a]!, uy = P[3 * b + 1]! - P[3 * a + 1]!, uz = P[3 * b + 2]! - P[3 * a + 2]!;
      const vx = P[3 * c]! - P[3 * a]!, vy = P[3 * c + 1]! - P[3 * a + 1]!, vz = P[3 * c + 2]! - P[3 * a + 2]!;
      summe += 0.5 * Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx);
      kum[t] = summe;
    }
    const heim = new Float32Array(S * S * 4);
    const norm = new Float32Array(S * S * 4);
    let z = 987654321;
    const rnd = (): number => {
      z = (Math.imul(z, 1664525) + 1013904223) | 0;
      return (z >>> 0) / 4294967296;
    };
    for (let i = 0; i < S * S; i++) {
      const r = rnd() * summe;
      let lo = 0, hi = T - 1;
      while (lo < hi) {
        const m = (lo + hi) >> 1;
        if (kum[m]! < r) lo = m + 1;
        else hi = m;
      }
      const a = I[3 * lo]!, b = I[3 * lo + 1]!, c = I[3 * lo + 2]!;
      let u = rnd(), v = rnd();
      if (u + v > 1) {
        u = 1 - u;
        v = 1 - v;
      }
      const w = 1 - u - v;
      for (let d = 0; d < 3; d++) {
        heim[4 * i + d] = P[3 * a + d]! * w + P[3 * b + d]! * u + P[3 * c + d]! * v;
        norm[4 * i + d] = NN[3 * a + d]! * w + NN[3 * b + d]! * u + NN[3 * c + d]! * v;
      }
      heim[4 * i + 3] = rnd();
      norm[4 * i + 3] = rnd();
    }
    const tex = (d: Float32Array): DataTexture => {
      const t = new DataTexture(d, S, S, RGBAFormat, FloatType);
      t.minFilter = t.magFilter = NearestFilter;
      t.needsUpdate = true;
      return t;
    };
    this.heim?.dispose();
    this.norm?.dispose();
    this.heim = tex(heim);
    this.norm = tex(norm);
    this.stand = k.netzStand;
  }

  /** 12 Sekunden: Ruhe, Zerfall, Schweben, Zusammensetzen */
  private lauf(t: number): { fort: number; zurueck: number } {
    const T = t % 12;
    const ein = (x: number): number => x * x * (3 - 2 * x);
    if (T < 0.8) return { fort: -0.1, zurueck: 0 };
    if (T < 5) return { fort: -0.1 + 1.25 * ein((T - 0.8) / 4.2), zurueck: 0 };
    if (T < 7.4) return { fort: 1.15, zurueck: 0 };
    if (T < 11) return { fort: 1.15 - 1.25 * ein((T - 7.4) / 3.6), zurueck: 1 };
    return { fort: -0.1, zurueck: 0 };
  }

  bild(k: ShaderKern, w: ShaderWerte): Texture {
    if (this.stand !== k.netzStand || !this.heim) this.verteilen(k);
    const l = this.lauf(w.zeit * (w.regler.tempo ?? 1));
    this.fort = l.fort;
    const z = k.paar('staub:zustand', { breite: S, hoehe: S, art: 'float', anzahl: 2, filter: 'nearest' });
    const u = this.schritt.uniforms;
    u.tPos!.value = z.lesen.textures[0];
    u.tVel!.value = z.lesen.textures[1];
    u.tHeim!.value = this.heim;
    u.tNorm!.value = this.norm;
    u.uDt!.value = Math.min(1 / 30, Math.max(1 / 240, w.dt));
    u.uZurueck!.value = l.zurueck;
    u.uWind!.value = w.regler.wind ?? 1;
    u.uFort!.value = l.fort;
    k.flaeche(this.schritt, z.schreiben);
    z.tauschen();
    // die Statue, dann die Teilchen in dasselbe Ziel (sie werden von ihr verdeckt)
    this.flaeche.uniforms.uFort!.value = l.fort;
    const fl = k.ziel('staub:flaeche', { tiefe: true, art: 'half', proben: 4 });
    k.netz(this.flaeche, fl, [0, 0, 0, 0]);
    this.mitte.copy(k.u.uMitte.value).applyMatrix4(k.kamera.matrixWorldInverse);
    for (const m of [this.blaettchen, this.glut]) {
      m.uniforms.tPos!.value = z.lesen.textures[0];
      m.uniforms.tVel!.value = z.lesen.textures[1];
      m.uniforms.tHeim!.value = this.heim;
      m.uniforms.uGroesse!.value = w.regler.korn ?? 1;
      m.uniforms.uFokus!.value = Math.max(1, -this.mitte.z);
      m.uniforms.uBlende!.value = w.regler.unschaerfe ?? 1;
    }
    k.szene(this.szene, k.kamera, fl);
    // Grund, Glühen, Tonwerte
    this.zusammen.uniforms.tFlaeche!.value = fl.texture;
    const hdr = k.ziel('staub:hdr', { art: 'half' });
    k.flaeche(this.zusammen, hdr, [0, 0, 0, 0]);
    const a = k.ziel('staub:gluehA', { skala: 0.25, art: 'half' });
    const b = k.ziel('staub:gluehB', { skala: 0.25, art: 'half' });
    this.hell.uniforms.tBild!.value = hdr.texture;
    k.flaeche(this.hell, a);
    this.blur.uniforms.tQuelle!.value = a.texture;
    (this.blur.uniforms.uRichtung!.value as Vector2).set(1, 0);
    k.flaeche(this.blur, b);
    this.blur.uniforms.tQuelle!.value = b.texture;
    (this.blur.uniforms.uRichtung!.value as Vector2).set(0, 1);
    k.flaeche(this.blur, a);
    this.ende.uniforms.tBild!.value = hdr.texture;
    this.ende.uniforms.tGlueh!.value = a.texture;
    const e = k.ziel('staub:ende', { art: 'byte' });
    k.flaeche(this.ende, e, [0, 0, 0, 0]);
    return e.texture;
  }

  unruhig(): boolean {
    return true;
  }

  info(): Record<string, number> {
    return { fort: Math.round(this.fort * 100) / 100 };
  }

  freigeben(): void {
    for (const m of [this.schritt, this.flaeche, this.blaettchen, this.glut, this.zusammen, this.hell, this.blur, this.ende]) m.dispose();
    this.geo.dispose();
    this.heim?.dispose();
    this.norm?.dispose();
  }
}

export const STAUB: Voreinstellung = {
  id: 'staub',
  name: 'Staub',
  gruppe: 'Effekte',
  zeile: 'Eine Goldstatue verbrennt: glühende Risse, 65 536 Teilchen Blattgold und Funken mit Bewegungs- und Tiefenunschärfe, dann setzt sie sich wieder zusammen',
  regler: [
    { k: 'tempo', name: 'Tempo', min: 0.2, max: 3, schritt: 0.05, grund: 1 },
    { k: 'wind', name: 'Wind', min: 0, max: 3, schritt: 0.05, grund: 1 },
    { k: 'korn', name: 'Korngröße', min: 0.5, max: 3, schritt: 0.05, grund: 1 },
    { k: 'unschaerfe', name: 'Tiefenschärfe', min: 0, max: 3, schritt: 0.05, grund: 1 },
  ],
  bauen: (k) => new Staub(k),
};
