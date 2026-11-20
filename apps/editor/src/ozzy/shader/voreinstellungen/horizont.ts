/**
 * Ereignishorizont (frei; experimentelle Visualisierung). Die Form wird zum schwarzen Loch: vollkommen schwarz, und sie krümmt das
 * Licht hinter sich, nicht wie eine Kugel, sondern nach ihrem eigenen Umriss. Die Ablenkung ist der Gradient der weichgezeichneten
 * Form in drei Maßstäben (eine Näherung an das Potential einer flächigen Masse): Nahe am Rand wird das Bild hinter ihr zu einem Ring
 * gezogen (Einsteinring), weiter weg nur leicht verbogen. Am Umriss liegt ein heller Photonenring. Um die Form kreist eine
 * Akkretionsscheibe (Schwarzkörperfarben, innen heißer und schneller, die herankommende Seite heller durch Doppler); ihre hintere
 * Hälfte liegt hinter der Form und wird über sie gebogen, die vordere liegt davor. Dahinter Sterne und Nebel.
 */
import type { RawShaderMaterial, Texture } from 'three';
import { BILD_KOPF, WeicheMaske } from '../bildShader';
import { GDaten } from '../daten';
import type { ShaderKern, ShaderLauf, ShaderWerte, Voreinstellung } from '../kern';

const ENDE = /* glsl */ `
${BILD_KOPF}
uniform sampler2D tW1;
uniform sampler2D tW2;
uniform sampler2D tW3;
uniform float uStaerke;
uniform float uScheibe;
/** Gradient der weichen Form je uv */
vec2 grad(sampler2D t, vec2 uv, float k) {
  vec2 px = k / vec2(textureSize(t, 0));
  return vec2(texture(t, uv + vec2(px.x, 0.0)).r - texture(t, uv - vec2(px.x, 0.0)).r, texture(t, uv + vec2(0.0, px.y)).r - texture(t, uv - vec2(0.0, px.y)).r) / (2.0 * px);
}
/** Ablenkung in uv (zeigt zur Masse): nah stark und eng, fern schwach und weit */
vec2 ablenkung(vec2 uv) {
  return (grad(tW1, uv, 1.0) * 0.0003 + grad(tW2, uv, 1.5) * 0.0025 + grad(tW3, uv, 2.0) * 0.016) * uStaerke;
}
/** die Scheibe an einem Bildpunkt (uv): Farbe und Deckung; hinten: nur die hintere Hälfte */
vec4 scheibe(vec2 uv, bool hinten) {
  vec2 c = insBild(uMitte);
  vec3 randW = uMitte + (uViewInv * vec4(1.0, 0.0, 0.0, 0.0)).xyz * uRadius;
  float R = length((insBild(randW) - c) * vec2(uAufl.x / uAufl.y, 1.0));
  vec2 d = (uv - c) * vec2(uAufl.x / uAufl.y, 1.0);
  if (hinten != (d.y > 0.0)) return vec4(0.0);
  vec2 e = d / vec2(1.0, 0.16);
  float rho = length(e) / max(R, 1e-4);
  float innen = 1.08, aussen = 2.1;
  if (rho < innen * 0.9 || rho > aussen * 1.1) return vec4(0.0);
  float phi = atan(e.y, e.x);
  float omega = 1.6 * pow(innen / rho, 1.5);
  float t = uZeit;
  float wirbel = fbm2(vec2(rho * 5.0, (phi - t * omega) * 2.2)) * 0.7 + fbm2(vec2(rho * 14.0, (phi - t * omega * 1.1) * 6.0)) * 0.5;
  float form = smoothstep(innen * 0.9, innen * 1.15, rho) * (1.0 - smoothstep(aussen * 0.6, aussen * 1.1, rho));
  float T = 4600.0 * pow(innen / rho, 0.9);
  float doppler = 1.0 + 0.75 * cos(phi + 0.3);
  vec3 farbeS = schwarzkoerper(T) * (0.3 + 1.4 * wirbel) * doppler * form * 0.9 * uScheibe;
  return vec4(farbeS, form * smoothstep(0.15, 0.6, wirbel));
}
vec3 himmel(vec2 uv) {
  vec2 p = uv * uAufl / uDpr;
  vec3 c = vec3(0.004, 0.005, 0.012);
  c += vec3(0.25, 0.08, 0.35) * pow(fbm2(p * 0.0035 + 3.0), 3.0) * 0.6;
  c += vec3(0.05, 0.18, 0.3) * pow(fbm2(p * 0.005 + 11.0), 3.0) * 0.5;
  for (int s = 0; s < 2; s++) {
    float z = s == 0 ? 2.5 : 1.3;
    vec2 q = p / z;
    vec2 zelle = floor(q);
    float h = hash12(zelle + float(s) * 31.0);
    if (h > 0.985) {
      vec2 o = hash22(zelle) - 0.5;
      float d = length(fract(q) - 0.5 - o * 0.6);
      float hell = (h - 0.985) / 0.015;
      vec3 sf = mix(vec3(0.7, 0.8, 1.0), vec3(1.0, 0.85, 0.6), hash11(h * 91.0));
      c += sf * smoothstep(0.14, 0.0, d) * (0.4 + 2.5 * hell * hell);
    }
  }
  return c;
}
void main() {
  GPunkt g = gLesen(vUv);
  float maske = deckungBei(vUv);
  vec2 ab = ablenkung(vUv);
  vec2 quelle = vUv + ab;
  vec3 c = uBuehne > 0.5 ? himmel(quelle) : vec3(0.0);
  float a = uBuehne > 0.5 ? 1.0 : 0.0;
  // hintere Scheibe, gebogen
  vec4 sh = scheibe(quelle, true);
  c = c * (1.0 - sh.a) + sh.rgb;
  a = max(a, sh.a);
  // der Horizont: schwarz; der Photonenring knapp außerhalb
  float w1 = texture(tW1, vUv).r;
  float ring = smoothstep(0.1, 0.32, w1) * (1.0 - smoothstep(0.32, 0.5, w1));
  c = c * (1.0 - maske);
  c += vec3(1.0, 0.86, 0.66) * ring * 1.6 * (1.0 - maske);
  a = max(a, max(maske, ring));
  // vordere Scheibe, ungebogen, vor allem
  vec4 sv = scheibe(vUv, false);
  c = c * (1.0 - sv.a) + sv.rgb;
  a = max(a, sv.a);
  vec3 aus = linZuSrgb(aces(c * 1.2));
  farbe = vec4(aus * a, a);
}
`;

class Horizont implements ShaderLauf {
  private readonly daten: GDaten;
  private readonly w: WeicheMaske[];
  private readonly ende: RawShaderMaterial;
  constructor(k: ShaderKern) {
    this.daten = new GDaten(k);
    this.w = [new WeicheMaske(k), new WeicheMaske(k), new WeicheMaske(k)];
    this.ende = k.flaecheProgramm(ENDE, { tNormal: { value: null }, tLage: { value: null }, tWeich: { value: null }, tHinten: { value: null }, tW1: { value: null }, tW2: { value: null }, tW3: { value: null }, uStaerke: { value: 1 }, uScheibe: { value: 1 } });
  }
  bild(k: ShaderKern, w: ShaderWerte): Texture {
    const d = this.daten.zeichnen(k);
    const u = this.ende.uniforms;
    u.tNormal!.value = d.normal;
    u.tLage!.value = d.lage;
    u.tW1!.value = this.w[0]!.rechnen(k, d.normal, 'horizont:w1', 0.25, 3);
    u.tW2!.value = this.w[1]!.rechnen(k, d.normal, 'horizont:w2', 0.125, 8);
    u.tW3!.value = this.w[2]!.rechnen(k, d.normal, 'horizont:w3', 0.0625, 12);
    u.uStaerke!.value = w.regler.staerke ?? 1;
    u.uScheibe!.value = w.regler.scheibe ?? 1;
    const z = k.ziel('horizont:ende', { art: 'byte' });
    k.flaeche(this.ende, z, [0, 0, 0, 0]);
    return z.texture;
  }
  unruhig(): boolean {
    return true;
  }
  freigeben(): void {
    this.daten.freigeben();
    for (const m of this.w) m.freigeben();
    this.ende.dispose();
  }
}

export const HORIZONT: Voreinstellung = {
  id: 'horizont',
  name: 'Ereignishorizont',
  gruppe: 'Frei',
  zeile: 'Die Form als schwarzes Loch: Sie biegt das Licht um ihren eigenen Umriss, Photonenring, glühende Scheibe, die sich über sie biegt',
  regler: [
    { k: 'staerke', name: 'Masse', min: 0, max: 3, schritt: 0.05, grund: 1 },
    { k: 'scheibe', name: 'Scheibe', min: 0, max: 2, schritt: 0.05, grund: 1 },
  ],
  bauen: (k) => new Horizont(k),
};
