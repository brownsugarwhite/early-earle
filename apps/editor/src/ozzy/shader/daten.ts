/**
 * Die Daten der Haut im Bild (G-Puffer), geteilt von allen Shadern, die im Bild weiterrechnen: je Gerätepunkt die Normale (Welt) mit
 * der Deckung und die Lage (Welt) mit der Tiefe (Abstand vor der Kamera). Dazu die Rückseite (Lage und Tiefe der nächsten
 * Rückseite: Dicke, Volumen) und die Bewegung im Bild (wohin ein Punkt der Haut seit dem letzten Bild gewandert ist).
 */
import { BackSide, DoubleSide, type RawShaderMaterial, type Texture } from 'three';
import { NETZ_FRAGMENT_KOPF } from './glsl';
import type { ShaderKern } from './kern';

/** GLSL: die Daten lesen (`tNormal`, `tLage`), mit weicher Deckung am Umriss */
export const G_LESEN = /* glsl */ `
uniform sampler2D tNormal;
uniform sampler2D tLage;
struct GPunkt { vec3 n; vec3 p; float z; float a; };
/** die Daten am Bildpunkt; am Rand (halb gedeckt) die des gedeckten Nachbarn, damit dort richtig schattiert wird */
GPunkt gLesen(vec2 uv) {
  ivec2 q = ivec2(uv * vec2(textureSize(tNormal, 0)));
  vec4 n = texelFetch(tNormal, q, 0);
  vec4 l = texelFetch(tLage, q, 0);
  if (n.a < 0.5) {
    for (int i = 0; i < 8; i++) {
      ivec2 o = ivec2(i == 0 ? 1 : i == 1 ? -1 : i >= 4 ? (i % 2 == 0 ? 1 : -1) : 0, i == 2 ? 1 : i == 3 ? -1 : i >= 4 ? (i < 6 ? 1 : -1) : 0);
      vec4 n2 = texelFetch(tNormal, q + o, 0);
      if (n2.a > 0.5) { n = n2; l = texelFetch(tLage, q + o, 0); break; }
    }
  }
  GPunkt g;
  g.n = n.a > 0.5 ? normalize(n.xyz) : vec3(0.0, 0.0, 1.0);
  g.p = l.xyz;
  g.z = l.a;
  g.a = n.a;
  return g;
}
/** weiche Deckung (ein Bildpunkt breit), aus vier Abtastungen zwischen den Punkten */
float deckungBei(vec2 uv) {
  vec2 h = 0.5 / vec2(textureSize(tNormal, 0));
  return 0.25 * (texture(tNormal, uv + vec2(h.x, h.y)).a + texture(tNormal, uv + vec2(-h.x, h.y)).a + texture(tNormal, uv + vec2(h.x, -h.y)).a + texture(tNormal, uv + vec2(-h.x, -h.y)).a);
}
/** Kante der Haut (0 … 1) im Abstand r (Gerätepunkte): Umriss, Sprung in der Tiefe, Knick der Normale */
float kanteBei(vec2 uv, float r) {
  vec2 px = 1.0 / vec2(textureSize(tNormal, 0));
  vec4 n0 = texture(tNormal, uv);
  vec4 l0 = texture(tLage, uv);
  float e = 0.0;
  for (int i = 0; i < 8; i++) {
    float w = float(i) * 0.7853982;
    vec2 o = vec2(cos(w), sin(w)) * r * px;
    vec4 n1 = texture(tNormal, uv + o);
    vec4 l1 = texture(tLage, uv + o);
    float beide = step(0.5, n0.a) * step(0.5, n1.a);
    float sil = abs(n1.a - n0.a);
    float dz = abs(l1.a - l0.a) / max(min(l0.a, l1.a), 1e-3);
    float dn = 1.0 - dot(normalize(n1.xyz + 1e-6), normalize(n0.xyz + 1e-6));
    e = max(e, max(sil, beide * max(smoothstep(0.012, 0.04, dz), smoothstep(0.35, 0.75, dn))));
  }
  return e;
}
/** Bildpunkt (uv) einer Lage in der Welt */
vec2 insBild(vec3 p) {
  vec4 c = uProj * uView * vec4(p, 1.0);
  return c.xy / c.w * 0.5 + 0.5;
}
/** Lage in der Welt aus uv und Tiefe (Abstand vor der Kamera), für beide Kameras */
vec3 lageAusTiefe(vec2 uv, float z) {
  vec2 ndc = uv * 2.0 - 1.0;
  vec4 a = uProjInv * vec4(ndc, -1.0, 1.0);
  vec4 b = uProjInv * vec4(ndc, 1.0, 1.0);
  a /= a.w;
  b /= b.w;
  float t = (-z - a.z) / (b.z - a.z);
  return (uViewInv * vec4(mix(a.xyz, b.xyz, t), 1.0)).xyz;
}
/** Richtung des Blicks (Welt) durch uv */
vec3 blickDurch(vec2 uv) {
  vec4 a = uProjInv * vec4(uv * 2.0 - 1.0, -1.0, 1.0);
  vec4 b = uProjInv * vec4(uv * 2.0 - 1.0, 1.0, 1.0);
  vec3 d = (b.xyz / b.w) - (a.xyz / a.w);
  return normalize((uViewInv * vec4(d, 0.0)).xyz);
}
`;

/** die gemeinsamen Uniform-Namen, die `G_LESEN` erwartet (zusätzlich zu `FLAECHE_KOPF`) */
export const G_UNIFORMS = /* glsl */ `
uniform mat4 uProj;
uniform mat4 uProjInv;
uniform mat4 uView;
uniform mat4 uViewInv;
uniform vec3 uKamPos;
uniform vec3 uLichtWelt;
uniform vec3 uLichtSicht;
uniform vec3 uMitte;
uniform float uRadius;
uniform vec3 uHalb;
uniform float uBuehne;
uniform float uOrtho;
uniform float uMass;
`;

export class GDaten {
  private readonly vorn: RawShaderMaterial;
  private readonly hinten: RawShaderMaterial;
  private stand = -1;
  private hintenStand = -1;

  constructor(k: ShaderKern) {
    this.vorn = k.netzProgramm(
      `${NETZ_FRAGMENT_KOPF}
      layout(location = 0) out vec4 oNormal;
      layout(location = 1) out vec4 oLage;
      void main() {
        if (geschnitten()) discard;
        oNormal = vec4(normaleJetzt(), 1.0);
        oLage = vec4(vWelt, -vSicht.z);
      }`,
      { seite: DoubleSide },
    );
    this.hinten = k.netzProgramm(
      `${NETZ_FRAGMENT_KOPF}
      layout(location = 0) out vec4 oHinten;
      void main() {
        if (geschnitten()) discard;
        oHinten = vec4(normalize(vNormal), -vSicht.z);
      }`,
      { seite: BackSide },
    );
  }

  /** die Vorderseite in die Daten (einmal je Bild, auch wenn mehrere fragen) */
  zeichnen(k: ShaderKern): { normal: Texture; lage: Texture } {
    const z = k.ziel('gemein:daten', { anzahl: 2, tiefe: true, art: 'half' });
    if (this.stand !== k.bildNr) {
      k.netz(this.vorn, z, [0, 0, 0, 0]);
      this.stand = k.bildNr;
    }
    return { normal: z.textures[0]!, lage: z.textures[1]! };
  }

  /** die nächste Rückseite: Normale (Welt) und Tiefe; mit der Tiefe der Vorderseite gibt das die Dicke */
  rueckseite(k: ShaderKern, skala = 1): Texture {
    const z = k.ziel(`gemein:hinten:${skala}`, { tiefe: true, art: 'half', skala });
    if (this.hintenStand !== k.bildNr) {
      k.netz(this.hinten, z, [0, 0, 0, 0]);
      this.hintenStand = k.bildNr;
    }
    return z.texture;
  }

  freigeben(): void {
    this.vorn.dispose();
    this.hinten.dispose();
  }
}
