/**
 * Staub (frei; animierte Simulation). Die Form ist eine Statue aus poliertem Gold. Von einer Seite her zerfällt sie zu Goldstaub:
 * 65 536 Teilchen, auf der Haut verteilt (nach Fläche), lösen sich an der Zerfallsfront, werden vom Wind eines Curl-Rauschens
 * davongetragen, glühen auf und kühlen zu Asche ab; dann kehren sie zurück und setzen die Form wieder zusammen. Die Teilchen rechnet
 * die Grafikkarte (Lage und Geschwindigkeit in zwei Gleitkomma-Bildern, ein Schritt je Bild); die Front an der Statue glüht.
 */
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  DataTexture,
  FloatType,
  GLSL3,
  NearestFilter,
  Points,
  RawShaderMaterial,
  RGBAFormat,
  Scene,
  type Texture,
} from 'three';
import { NETZ_FRAGMENT_KOPF, FARBE, LICHT, RAUSCHEN, FLAECHE_VERTEX } from '../glsl';
import { DoubleSide, type ShaderKern, type ShaderLauf, type ShaderWerte, type Voreinstellung } from '../kern';

const S = 256;

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
  float f = frontBei(H.xyz);
  if (f > uFort) { oPos = vec4(H.xyz, 0.0); oVel = vec4(0.0); return; }
  vec3 p = P.w <= 0.0 ? H.xyz : P.xyz;
  vec3 v = P.w <= 0.0 ? N.xyz * uRadius * (0.2 + 0.5 * N.w) : V.xyz;
  if (uZurueck > 0.5) {
    v += (H.xyz - p) * 7.0 * uDt;
    v *= exp(-3.2 * uDt);
  } else {
    vec3 q = p / uRadius * 1.1 + vec3(0.0, -uZeit * 0.12, uZeit * 0.05);
    v += (curl3(q) * 0.8 + vec3(0.55, 0.35, 0.0) + N.w * 0.2) * uRadius * uWind * uDt;
    v *= exp(-0.7 * uDt);
  }
  p += v * uDt;
  oPos = vec4(p, max(P.w, 0.0) + uDt);
  oVel = vec4(v, 0.0);
}
`;

const PUNKT_VERTEX = /* glsl */ `
precision highp float;
precision highp sampler2D;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform sampler2D tPos;
uniform float uGroesse;
uniform float uDpr;
in vec3 position;
out float vAlter;
void main() {
  vec4 P = texture(tPos, position.xy);
  vAlter = P.w;
  vec4 c = projectionMatrix * viewMatrix * vec4(P.xyz, 1.0);
  gl_Position = P.w > 0.0 ? c : vec4(2.0, 2.0, 2.0, 1.0);
  gl_PointSize = uGroesse * uDpr;
}
`;

const PUNKT_FRAGMENT = /* glsl */ `
precision highp float;
${FARBE}
in float vAlter;
out vec4 farbe;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r = length(d);
  if (r > 0.5) discard;
  float a = smoothstep(0.5, 0.05, r);
  float t = vAlter;
  vec3 c = mix(vec3(3.2, 2.2, 0.9), vec3(1.6, 0.6, 0.15), smoothstep(0.0, 0.8, t));
  c = mix(c, vec3(0.22, 0.17, 0.14), smoothstep(1.2, 4.0, t));
  farbe = vec4(c * a * 0.55, 1.0);
}
`;

const FLAECHE = /* glsl */ `
${NETZ_FRAGMENT_KOPF}
uniform vec3 uMitte;
uniform float uRadius;
uniform vec3 uLichtWelt;
${RAUSCHEN}
${FARBE}
${LICHT}
${FRONT}
out vec4 farbe;
void main() {
  if (geschnitten()) discard;
  float f = frontBei(vWelt);
  if (f <= uFort) discard;
  vec3 n = normaleJetzt();
  vec3 V = normalize(cameraPosition - vWelt);
  vec3 F0 = vec3(1.0, 0.77, 0.36);
  float nv = clamp(dot(n, V), 0.0, 1.0);
  vec3 F = F0 + (1.0 - F0) * pow(1.0 - nv, 5.0);
  vec3 c = studio(reflect(-V, n)) * F * 0.9 + F0 * 0.04;
  float glut = smoothstep(0.035, 0.0, f - uFort);
  c += vec3(4.0, 2.4, 0.9) * glut;
  farbe = vec4(c, 1.0);
}
`;

const ENDE = /* glsl */ `
${RAUSCHEN}
${FARBE}
uniform sampler2D tFlaeche;
uniform sampler2D tPunkte;
uniform float uBuehne;
out vec4 farbe;
void main() {
  vec2 q = vUv;
  vec4 f = texture(tFlaeche, q);
  vec3 p = texture(tPunkte, q).rgb;
  vec3 grund = mix(vec3(0.01, 0.012, 0.02), vec3(0.035, 0.03, 0.05), q.y) * (0.95 + 0.05 * noise2(gl_FragCoord.xy * 0.5));
  vec3 c = (uBuehne > 0.5 ? grund : vec3(0.0)) * (1.0 - f.a) + f.rgb + p;
  float a = uBuehne > 0.5 ? 1.0 : clamp(max(f.a, luma(p) * 2.0), 0.0, 1.0);
  vec3 aus = linZuSrgb(aces(c));
  farbe = vec4(aus * a, a);
}
`;

class Staub implements ShaderLauf {
  private readonly schritt: RawShaderMaterial;
  private readonly flaeche: RawShaderMaterial;
  private readonly punkte: RawShaderMaterial;
  private readonly ende: RawShaderMaterial;
  private readonly szene = new Scene();
  private heim: DataTexture | null = null;
  private norm: DataTexture | null = null;
  private stand = -1;
  private fort = -0.1;

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
    this.punkte = new RawShaderMaterial({
      glslVersion: GLSL3,
      uniforms: { tPos: { value: null }, uGroesse: { value: 2.2 }, uDpr: k.u.uDpr },
      vertexShader: PUNKT_VERTEX,
      fragmentShader: PUNKT_FRAGMENT,
      depthTest: false,
      depthWrite: false,
      transparent: true,
      blending: AdditiveBlending,
    });
    const geo = new BufferGeometry();
    const uv = new Float32Array(S * S * 3);
    for (let j = 0; j < S; j++)
      for (let i = 0; i < S; i++) {
        const o = 3 * (j * S + i);
        uv[o] = (i + 0.5) / S;
        uv[o + 1] = (j + 0.5) / S;
      }
    geo.setAttribute('position', new BufferAttribute(uv, 3));
    const punkte = new Points(geo, this.punkte);
    punkte.frustumCulled = false;
    this.szene.add(punkte);
    this.ende = k.flaecheProgramm(ENDE, { tFlaeche: { value: null }, tPunkte: { value: null } });
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
    this.flaeche.uniforms.uFort!.value = l.fort;
    const fl = k.ziel('staub:flaeche', { tiefe: true, art: 'half', proben: 4 });
    k.netz(this.flaeche, fl, [0, 0, 0, 0]);
    this.punkte.uniforms.tPos!.value = z.lesen.textures[0];
    this.punkte.uniforms.uGroesse!.value = 2.0 * (w.regler.korn ?? 1);
    const pz = k.ziel('staub:punkte', { art: 'half' });
    k.szene(this.szene, k.kamera, pz, [0, 0, 0, 0]);
    this.ende.uniforms.tFlaeche!.value = fl.texture;
    this.ende.uniforms.tPunkte!.value = pz.texture;
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
    this.schritt.dispose();
    this.flaeche.dispose();
    this.punkte.dispose();
    this.ende.dispose();
    this.heim?.dispose();
    this.norm?.dispose();
  }
}

export const STAUB: Voreinstellung = {
  id: 'staub',
  name: 'Staub',
  gruppe: 'Effekte',
  zeile: 'Eine Goldstatue zerfällt zu 65 536 glühenden Teilchen, die im Wind treiben, und setzt sich wieder zusammen',
  regler: [
    { k: 'tempo', name: 'Tempo', min: 0.2, max: 3, schritt: 0.05, grund: 1 },
    { k: 'wind', name: 'Wind', min: 0, max: 3, schritt: 0.05, grund: 1 },
    { k: 'korn', name: 'Korngröße', min: 0.5, max: 3, schritt: 0.05, grund: 1 },
  ],
  bauen: (k) => new Staub(k),
};
