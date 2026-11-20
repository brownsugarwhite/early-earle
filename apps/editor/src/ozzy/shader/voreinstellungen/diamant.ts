/**
 * Diamant (Materialien; Florian: „einen diamant … in höchster qualität“). Die Form wird zum geschliffenen Diamanten:
 * - **Schliff:** Die Normale rastet auf einen Satz Facettenrichtungen ein (gestörte Fibonacci-Kugel, an der Form fest): Jede Form
 *   bekommt so ebene Facetten mit scharfen Kanten, gleich wie rund sie ist. Die Facetten der Rückseite haben einen eigenen, gedrehten
 *   Satz.
 * - **Licht im Stein:** außen spiegelt die Facette das Licht (Fresnel, F0 0,17 bei n = 2,42). Innen wird das Licht gebrochen, an zwei
 *   Facetten der Unterseite total reflektiert und tritt durch eine Facette wieder aus; beim Austritt bricht jede Farbe anders
 *   (Dispersion, Rot 2,407 bis Blau 2,451, verstärkbar): das „Feuer“. Was nicht austreten kann, bleibt gedämpft im Stein.
 * - **Juwelierlicht:** dunkler Raum, eine große Softbox oben, eine weiße Karte links, vierzehn kleine Lampen, ein warmes und ein kühles
 *   Licht; die Lichter drehen sich langsam, darum funkeln die Facetten.
 * - **Sternfilter** wie in der Schmuckfotografie: das Hellste strahlt in vier Richtungen aus, dazu ein weiches Glühen.
 * Bühne: dunkler Samt mit einem Lichtkegel.
 */
import { type RawShaderMaterial, type Texture, Vector2 } from 'three';
import { BILD_KOPF } from '../bildShader';
import { GDaten } from '../daten';
import type { ShaderKern, ShaderLauf, ShaderWerte, Voreinstellung } from '../kern';

const HAUPT = /* glsl */ `
${BILD_KOPF}
uniform float uFacetten;
uniform float uFeuer;
uniform float uDrehung;
vec3 fibo(float i, float n) {
  float phi = acos(1.0 - 2.0 * (i + 0.5) / n);
  float th = 2.39996323 * i;
  return vec3(cos(th) * sin(phi), cos(phi), sin(th) * sin(phi));
}
mat3 drehSatz(float s) {
  float a = s * 1.7, b = s * 2.3;
  mat3 rx = mat3(1.0, 0.0, 0.0, 0.0, cos(a), sin(a), 0.0, -sin(a), cos(a));
  mat3 ry = mat3(cos(b), 0.0, -sin(b), 0.0, 1.0, 0.0, sin(b), 0.0, cos(b));
  return ry * rx;
}
/** nächste Facette zur Richtung d im Satz s; kante: Abstand (Kosinus) zur zweitnächsten, klein an Kanten */
vec3 facette(vec3 d, float s, out float kante) {
  float best = -2.0, zweit = -2.0;
  vec3 bn = d;
  mat3 R = drehSatz(s);
  float N = floor(uFacetten);
  for (int i = 0; i < 200; i++) {
    float fi = float(i);
    if (fi >= N) break;
    vec3 f = R * normalize(fibo(fi, N) + 0.16 * (hash33(vec3(fi, s, 1.0)) - 0.5));
    float c = dot(d, f);
    if (c > best) { zweit = best; best = c; bn = f; } else if (c > zweit) zweit = c;
  }
  kante = best - zweit;
  return bn;
}
/** Juwelierlicht: dunkler Raum, Softbox oben, Karte links, kleine Lampen (drehen sich langsam), ein warmes und ein kühles Licht */
vec3 umgebung(vec3 d) {
  float t = uZeit * 0.07 * uDrehung;
  float cs = cos(t), sn = sin(t);
  d = vec3(cs * d.x - sn * d.z, d.y, sn * d.x + cs * d.z);
  vec3 c = mix(vec3(0.02, 0.02, 0.025), vec3(0.16, 0.165, 0.18), smoothstep(-0.4, 0.5, d.y));
  c += vec3(3.2, 3.15, 3.1) * smoothstep(0.62, 0.72, d.y);
  c += vec3(1.4) * softbox(d, normalize(vec3(-1.0, 0.15, 0.25)), vec3(0.0, 1.0, 0.0), vec2(0.4, 0.55), 0.06);
  c += vec3(1.2) * softbox(d, normalize(vec3(1.0, 0.1, -0.3)), vec3(0.0, 1.0, 0.0), vec2(0.35, 0.5), 0.06);
  c += vec3(0.9) * softbox(d, normalize(vec3(0.0, 0.2, -1.0)), vec3(0.0, 1.0, 0.0), vec2(0.5, 0.3), 0.08);
  for (int i = 0; i < 14; i++) {
    vec3 ld = normalize(hash33(vec3(float(i), 7.0, 3.0)) * 2.0 - 1.0 + vec3(0.0, 0.4, 0.0));
    c += vec3(1.0, 0.97, 0.92) * 45.0 * smoothstep(0.9993, 0.9998, dot(d, ld));
  }
  c += vec3(2.4, 1.6, 0.9) * softbox(d, normalize(vec3(0.8, 0.3, -0.5)), vec3(0.0, 1.0, 0.0), vec2(0.07, 0.07), 0.02);
  c += vec3(0.9, 1.3, 2.4) * softbox(d, normalize(vec3(-0.5, 0.55, -0.7)), vec3(0.0, 1.0, 0.0), vec2(0.06, 0.06), 0.02);
  return c;
}
out vec4 hdr;
void main() {
  GPunkt g = gLesen(vUv);
  float maske = deckungBei(vUv);
  vec3 blick = blickDurch(vUv);
  vec2 qb = gl_FragCoord.xy / uAufl;
  vec2 c0 = insBild(uMitte);
  float rr = length((qb - c0) * vec2(uAufl.x / uAufl.y, 1.0));
  vec3 grund = mix(vec3(0.004, 0.005, 0.012), vec3(0.02, 0.022, 0.04), qb.y) + vec3(0.06, 0.065, 0.09) * exp(-rr * rr / 0.06);
  grund *= 0.94 + 0.08 * noise2(gl_FragCoord.xy / uDpr * vec2(0.9, 0.06));
  vec3 c = uBuehne > 0.5 ? grund : vec3(0.0);
  float a = uBuehne > 0.5 ? 1.0 : 0.0;
  if (g.a > 0.5) {
    vec3 V = -blick;
    float kante;
    vec3 nf = facette(g.n, 0.0, kante);
    if (dot(nf, V) < 0.02) nf = normalize(nf + V * (0.02 - dot(nf, V)));
    float nv = clamp(dot(nf, V), 0.0, 1.0);
    float F = 0.172 + 0.828 * pow(1.0 - nv, 5.0);
    vec3 aussen = umgebung(reflect(-V, nf)) * F;
    // innen: hinein, zweimal an der Unterseite gespiegelt, hinaus; beim Austritt je Farbe eigene Brechung
    vec3 r1 = refract(-V, nf, 1.0 / 2.42);
    float k1, k2, k3;
    vec3 nb = facette(-r1, 1.0, k1);
    vec3 r2 = reflect(r1, nb);
    vec3 nb2 = facette(-r2, 2.0, k2);
    vec3 r3 = reflect(r2, nb2);
    vec3 ne = facette(r3, 3.0, k3);
    vec3 innen = vec3(0.0);
    for (int i = 0; i < 3; i++) {
      float eta = 2.42 + (i == 0 ? -0.013 : (i == 1 ? 0.004 : 0.031)) * (1.0 + 3.0 * uFeuer);
      vec3 r4 = refract(r3, -ne, eta);
      vec3 L = dot(r4, r4) < 1e-6 ? umgebung(reflect(r3, -ne)) * 0.3 : umgebung(r4);
      innen[i] = L[i];
    }
    // ein Hauch Absorption, an den Kanten der Facetten Licht
    c = aussen + innen * (1.0 - F) * vec3(0.97, 0.98, 1.0);
    c += vec3(0.5) * (1.0 - smoothstep(0.0, 0.0035, kante)) * 0.25;
    // weicher Rand der Form
    vec3 hinter = uBuehne > 0.5 ? grund : vec3(0.0);
    c = mix(hinter, c, maske);
    a = max(a, maske);
  }
  hdr = vec4(c, a);
}
`;

const HELL = /* glsl */ `
uniform sampler2D tBild;
out vec4 farbe;
void main() {
  vec3 c = texture(tBild, vUv).rgb;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  farbe = vec4(c * smoothstep(3.0, 9.0, l), 1.0);
}`;

const STERN = /* glsl */ `
uniform sampler2D tHell;
uniform float uStern;
out vec4 farbe;
void main() {
  vec2 px = 1.0 / vec2(textureSize(tHell, 0));
  vec3 s = vec3(0.0);
  for (int r = 0; r < 4; r++) {
    float w = 0.785398 * float(r) + 0.3;
    vec2 dir = vec2(cos(w), sin(w));
    for (int i = 1; i <= 22; i++) {
      float fi = float(i);
      float g = exp(-fi * 0.16);
      s += (texture(tHell, vUv + dir * px * fi * 2.0).rgb + texture(tHell, vUv - dir * px * fi * 2.0).rgb) * g;
    }
  }
  // weiches Glühen dazu
  vec3 gl = vec3(0.0);
  for (int i = 0; i < 12; i++) {
    float w = float(i) * 0.5236;
    gl += texture(tHell, vUv + vec2(cos(w), sin(w)) * px * 6.0).rgb;
  }
  farbe = vec4(s * 0.035 * uStern + gl / 12.0 * 0.45, 1.0);
}`;

const ENDE = /* glsl */ `
uniform sampler2D tBild;
uniform sampler2D tStern;
vec3 linZuSrgbE(vec3 c) { c = max(c, vec3(0.0)); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c)); }
vec3 acesE(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
out vec4 farbe;
void main() {
  vec4 b = texture(tBild, vUv);
  vec3 st = texture(tStern, vUv).rgb;
  vec3 c = b.rgb + st;
  float a = clamp(max(b.a, dot(st, vec3(0.33)) * 1.5), 0.0, 1.0);
  vec3 aus = linZuSrgbE(acesE(c * 0.9));
  farbe = vec4(aus * a, a);
}`;

class Diamant implements ShaderLauf {
  private readonly daten: GDaten;
  private readonly haupt: RawShaderMaterial;
  private readonly hell: RawShaderMaterial;
  private readonly stern: RawShaderMaterial;
  private readonly ende: RawShaderMaterial;
  constructor(k: ShaderKern) {
    this.daten = new GDaten(k);
    this.haupt = k.flaecheProgramm(HAUPT.replace('out vec4 farbe;', ''), { tNormal: { value: null }, tLage: { value: null }, tWeich: { value: null }, tHinten: { value: null }, uFacetten: { value: 72 }, uFeuer: { value: 1.6 }, uDrehung: { value: 1 } });
    this.hell = k.flaecheProgramm(HELL, { tBild: { value: null } });
    this.stern = k.flaecheProgramm(STERN, { tHell: { value: null }, uStern: { value: 1 } });
    this.ende = k.flaecheProgramm(ENDE, { tBild: { value: null }, tStern: { value: null } });
  }
  bild(k: ShaderKern, w: ShaderWerte): Texture {
    const d = this.daten.zeichnen(k);
    const u = this.haupt.uniforms;
    u.tNormal!.value = d.normal;
    u.tLage!.value = d.lage;
    u.uFacetten!.value = w.regler.facetten ?? 72;
    u.uFeuer!.value = w.regler.feuer ?? 1.6;
    u.uDrehung!.value = w.regler.drehung ?? 1;
    const hdr = k.ziel('diamant:hdr', { art: 'half' });
    k.flaeche(this.haupt, hdr, [0, 0, 0, 0]);
    const hell = k.ziel('diamant:hell', { skala: 0.5, art: 'half' });
    this.hell.uniforms.tBild!.value = hdr.texture;
    k.flaeche(this.hell, hell);
    const stern = k.ziel('diamant:stern', { skala: 0.5, art: 'half' });
    this.stern.uniforms.tHell!.value = hell.texture;
    this.stern.uniforms.uStern!.value = w.regler.funkeln ?? 1;
    k.flaeche(this.stern, stern);
    this.ende.uniforms.tBild!.value = hdr.texture;
    this.ende.uniforms.tStern!.value = stern.texture;
    const z = k.ziel('diamant:ende', { art: 'byte' });
    k.flaeche(this.ende, z, [0, 0, 0, 0]);
    return z.texture;
  }
  unruhig(): boolean {
    return true;
  }
  freigeben(): void {
    this.daten.freigeben();
    for (const m of [this.haupt, this.hell, this.stern, this.ende]) m.dispose();
  }
}

export const DIAMANT: Voreinstellung = {
  id: 'diamant',
  name: 'Diamant',
  gruppe: 'Materialien',
  zeile: 'Geschliffener Diamant: Facetten an der Form, Licht zweimal im Stein gespiegelt, Feuer aus der Dispersion, Juwelierlicht, Sternfilter',
  regler: [
    { k: 'facetten', name: 'Facetten', min: 16, max: 200, schritt: 1, grund: 72 },
    { k: 'feuer', name: 'Feuer', min: 0, max: 3, schritt: 0.05, grund: 1.6 },
    { k: 'funkeln', name: 'Funkeln', min: 0, max: 3, schritt: 0.05, grund: 1 },
    { k: 'drehung', name: 'Lichter drehen', min: 0, max: 3, schritt: 0.05, grund: 1 },
  ],
  bauen: (k) => new Diamant(k),
};
