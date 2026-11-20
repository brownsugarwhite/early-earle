/**
 * Ereignishorizont (Effekte; dritte Fassung nach Florians Urteil „gefällt mir nicht so gut“). Die Form wird zum schwarzen Loch, und
 * jeder Bildpunkt verfolgt seinen Lichtstrahl durch den gekrümmten Raum:
 * - **Strahlengang:** Um die Mitte der Form sitzt eine Masse. Der Strahl läuft in Schritten (innen kleiner) und wird so abgelenkt,
 *   wie Licht um ein schwarzes Loch läuft (Binet-Gleichung der Schwarzschild-Lösung als Zentralkraft −1,5 · rₛ · h² · x / r⁵, h der
 *   Drehimpuls des Strahls). Daraus entsteht von selbst, was man aus „Interstellar“ kennt: Die Rückseite der Scheibe erscheint als
 *   Bogen über der Form, ihre Unterseite als schmaler Bogen darunter, Sterne ziehen sich am Rand zu Bögen.
 * - **Die Form ist der Horizont:** Ein Strahl, der die Form trifft, endet dort (schwarz). Die Masse ist so klein gewählt, dass ihr
 *   runder Schatten immer hinter der Form liegt; man sieht den Umriss der Form, nicht einen Kreis.
 * - **Die Scheibe** liegt fast waagerecht durch die Mitte, knapp außerhalb der Form: dünn, mit Filamenten, die nach Kepler kreisen
 *   (innen schneller; zwei Phasen überblendet, damit die Scherung das Muster nicht zerreibt). Temperatur nach außen fallend
 *   (rund 7 000 bis 2 800 Kelvin), die herankommende Seite heller und bläulicher (Doppler, D⁴), die abgewandte dunkler und röter,
 *   dazu die Rotverschiebung nah am Loch.
 * - **Photonenring** knapp außerhalb des Umrisses, **Glühen** (heller Anteil, weichgezeichnet und dazugelegt), Himmel in der Welt.
 */
import { type RawShaderMaterial, type Texture, Vector2 } from 'three';
import { BILD_KOPF, WeicheMaske } from '../bildShader';
import { GDaten } from '../daten';
import type { ShaderKern, ShaderLauf, ShaderWerte, Voreinstellung } from '../kern';

const HAUPT = /* glsl */ `
${BILD_KOPF}
uniform sampler2D tW1;
uniform float uStaerke;
uniform float uScheibe;
uniform float uDoppler;
// Normale der Scheibe (fast senkrecht nach oben)
const vec3 SN = vec3(0.0, 0.99875, -0.04994);
/** Himmel in der Welt: Sterne auf der Kugel, ein schwaches Band und Nebel */
vec3 himmel(vec3 d) {
  vec3 c = vec3(0.0015, 0.002, 0.005);
  vec3 dn = normalize(d);
  float band = exp(-pow(dot(dn, normalize(vec3(0.3, 0.85, -0.42))) * 3.2, 2.0));
  c += vec3(0.05, 0.045, 0.06) * band * (0.6 + 0.8 * fbm3(dn * 5.0 + 2.0));
  c += vec3(0.22, 0.07, 0.28) * pow(max(fbm3(dn * 2.2 + 3.0) * 0.5 + 0.5, 0.0), 5.0) * 0.6;
  c += vec3(0.04, 0.13, 0.26) * pow(max(fbm3(dn * 3.0 + 11.0) * 0.5 + 0.5, 0.0), 5.0) * 0.5;
  for (int s = 0; s < 2; s++) {
    float k = s == 0 ? 160.0 : 400.0;
    vec3 p = dn * k;
    vec3 z = floor(p);
    float h = hash13(z + float(s) * 7.0);
    if (h > (s == 0 ? 0.982 : 0.993 - 0.01 * band)) {
      vec3 o = hash33(z) - 0.5;
      float dd = length(fract(p) - 0.5 - o * 0.5);
      vec3 sf = mix(vec3(0.7, 0.8, 1.0), vec3(1.0, 0.82, 0.6), hash11(h * 91.0));
      c += sf * smoothstep(0.16, 0.0, dd) * (s == 0 ? 3.5 : 1.2) * (0.4 + hash11(h * 13.0));
    }
  }
  return c;
}
/** Filamente der Scheibe am Radius r und Winkel ph (nahtlos im Winkel) */
float filamente(float r, float ph) {
  vec2 cs = vec2(cos(ph), sin(ph));
  // große Klumpen und Bögen, mittlere Stränge (gratig: dünne helle Fäden), feine Streifen
  float gross = fbm3n(vec3(r * 2.6, cs * 0.9), 3);
  float strang = 1.0 - abs(fbm3n(vec3(r * 11.0, cs * 2.2) + 7.0, 3) * 1.6);
  float fein = snoise(vec3(r * 42.0, cs * 5.5) + 3.0);
  return gross * 0.75 + (strang * strang - 0.45) * 0.55 + fein * 0.1;
}
/** die Scheibe am Ort x (Maß der Form, Mitte 0), Strahl in Richtung v: Licht (vormultipliziert) und Deckung */
vec4 scheibe(vec3 x, vec3 v, float rs, float rin) {
  float r = length(x);
  float raus = rin * 2.1;
  if (r < rin * 0.96 || r > raus) return vec4(0.0);
  vec3 a1 = normalize(cross(SN, vec3(0.0, 0.0, 1.0)));
  vec3 a2 = cross(SN, a1);
  float phi = atan(dot(x, a2), dot(x, a1));
  float omega = 0.6 * pow(rin / r, 1.5);
  const float P = 26.0;
  float t1 = mod(uZeit, P), t2 = mod(uZeit + P * 0.5, P);
  float wA = 1.0 - abs(2.0 * t1 / P - 1.0);
  float dichte = mix(filamente(r, phi + omega * t2 + 2.1), filamente(r, phi + omega * t1), wA);
  float xr = r / rin;
  float form = smoothstep(0.96, 1.03, xr) * (1.0 - smoothstep(1.15, 2.1, xr));
  // Geschwindigkeit des Gases (Kepler) und Doppler-Faktor zum Betrachter, Rotverschiebung nah am Loch
  vec3 u = normalize(cross(SN, x));
  float beta = min(sqrt(rs / (2.0 * max(r - rs, 0.05))), 0.62);
  float gamma = inversesqrt(1.0 - beta * beta);
  float D = 1.0 / (gamma * (1.0 - beta * dot(u, -v)));
  float g = D * sqrt(max(1.0 - rs / r, 0.05));
  g = mix(1.0, g, uDoppler);
  float T = 4700.0 * pow(xr, -0.8) * g;
  float hell = pow(xr, -3.0) * smoothstep(0.98, 1.12, xr);
  float f = clamp(0.58 + 0.42 * dichte, 0.0, 1.4);
  vec3 c = schwarzkoerper(T) * hell * g * g * g * g * (0.3 + 1.2 * f * f) * uScheibe * 0.55;
  float deck = form * (0.5 + 0.45 * smoothstep(-0.45, 0.4, dichte)) * mix(0.65, 1.0, 1.0 - smoothstep(1.0, 2.0, xr));
  return vec4(c * form, deck);
}
out vec4 hdr;
void main() {
  GPunkt g = gLesen(vUv);
  float maske = deckungBei(vUv);
  vec3 d = blickDurch(vUv);
  float RF = max(uHalb.x, max(uHalb.y, uHalb.z));
  float klein = min(uHalb.x, min(uHalb.y, uHalb.z * 1.4));
  float rin = 1.02 * max(uHalb.x, uHalb.z) / RF;
  // die Masse: ihr runder Schatten (2,6 rₛ) bleibt hinter der Form
  float rs = min(0.2 * uStaerke, 0.18 * klein / RF);
  float abst = length(uKamPos - uMitte);
  vec3 o = lageAusTiefe(vUv, max(1.0, abst - RF * 12.0));
  vec3 x = (o - uMitte) / RF;
  vec3 v = d;
  float bisForm = g.a > 0.5 ? dot(g.p - o, d) / RF : 1e9;
  vec3 hv = cross(x, v);
  float h2 = dot(hv, hv);
  vec3 C = vec3(0.0);
  float Tr = 1.0;
  float weg = 0.0;
  bool gefangen = false;
  for (int i = 0; i < 260; i++) {
    float r = length(x);
    if (r > 14.0 && dot(x, v) > 0.0) break;
    float dt = clamp(0.055 * r, 0.012, 0.9);
    if (weg + dt > bisForm) dt = max(bisForm - weg, 0.0) + 1e-4;
    vec3 x0 = x;
    v += -1.5 * rs * h2 * x / (r * r * r * r * r) * (dt * 0.5);
    x += v * dt;
    float r1 = length(x);
    v += -1.5 * rs * h2 * x / (r1 * r1 * r1 * r1 * r1) * (dt * 0.5);
    weg += dt * length(v);
    float s0 = dot(x0, SN), s1 = dot(x, SN);
    if (s0 * s1 < 0.0) {
      vec3 xh = mix(x0, x, s0 / (s0 - s1));
      vec4 sc = scheibe(xh, normalize(v), rs, rin);
      C += Tr * sc.rgb;
      Tr *= 1.0 - sc.a;
    }
    if (weg >= bisForm || r1 < rs * 1.05) { gefangen = true; break; }
    if (Tr < 0.01) break;
  }
  if (!gefangen && uBuehne > 0.5) C += Tr * himmel(normalize(v));
  float a = uBuehne > 0.5 ? 1.0 : clamp(1.0 - Tr, 0.0, 1.0);
  if (gefangen) a = 1.0;
  // weicher Rand der Form: dort liegt das Loch über dem Hintergrund
  if (g.a <= 0.5) C *= 1.0 - maske;
  a = max(a, maske);
  // Photonenring knapp außerhalb des Umrisses, auf der herankommenden Seite heller
  float w1 = texture(tW1, vUv).r;
  float ring = smoothstep(0.04, 0.22, w1) * (1.0 - smoothstep(0.22, 0.42, w1)) * (1.0 - maske);
  vec3 pm = lageAusTiefe(vUv, dot(uMitte - uKamPos, (uViewInv * vec4(0.0, 0.0, -1.0, 0.0)).xyz));
  float seite = dot(normalize(cross(SN, pm - uMitte + 1e-4)), -d);
  C += vec3(1.0, 0.74, 0.45) * ring * (1.1 + 0.9 * seite * uDoppler) * (0.75 + 0.5 * noise2(gl_FragCoord.xy * 0.02 + uZeit * 0.3)) * uScheibe;
  a = max(a, ring);
  hdr = vec4(C, a);
}
`;

const HELL = /* glsl */ `
uniform sampler2D tBild;
out vec4 farbe;
void main() {
  vec3 c = texture(tBild, vUv).rgb;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  farbe = vec4(c * smoothstep(0.9, 3.5, l), 1.0);
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
    s += texture(tQuelle, vUv + px * float(i) * 1.6).rgb * g;
    w += g;
  }
  farbe = vec4(s / w, 1.0);
}`;

const ENDE = /* glsl */ `
uniform sampler2D tBild;
uniform sampler2D tGlueh;
vec3 linZuSrgbE(vec3 c) { c = max(c, vec3(0.0)); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c)); }
vec3 acesE(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
out vec4 farbe;
void main() {
  vec4 b = texture(tBild, vUv);
  vec3 gl = texture(tGlueh, vUv).rgb;
  vec3 c = b.rgb + gl * 0.55;
  float a = max(b.a, clamp(dot(gl, vec3(0.33)) * 1.5, 0.0, 1.0));
  vec3 aus = linZuSrgbE(acesE(c * 1.05));
  farbe = vec4(aus * a, a);
}`;

class Horizont implements ShaderLauf {
  private readonly daten: GDaten;
  private readonly w1: WeicheMaske;
  private readonly haupt: RawShaderMaterial;
  private readonly hell: RawShaderMaterial;
  private readonly blur: RawShaderMaterial;
  private readonly ende: RawShaderMaterial;
  constructor(k: ShaderKern) {
    this.daten = new GDaten(k);
    this.w1 = new WeicheMaske(k);
    this.haupt = k.flaecheProgramm(HAUPT.replace('out vec4 farbe;', ''), { tNormal: { value: null }, tLage: { value: null }, tWeich: { value: null }, tHinten: { value: null }, tW1: { value: null }, uStaerke: { value: 1 }, uScheibe: { value: 1 }, uDoppler: { value: 0.7 } });
    this.hell = k.flaecheProgramm(HELL, { tBild: { value: null } });
    this.blur = k.flaecheProgramm(BLUR, { tQuelle: { value: null }, uRichtung: { value: new Vector2(1, 0) } });
    this.ende = k.flaecheProgramm(ENDE, { tBild: { value: null }, tGlueh: { value: null } });
  }
  bild(k: ShaderKern, w: ShaderWerte): Texture {
    const d = this.daten.zeichnen(k);
    const u = this.haupt.uniforms;
    u.tNormal!.value = d.normal;
    u.tLage!.value = d.lage;
    u.tW1!.value = this.w1.rechnen(k, d.normal, 'horizont:w1', 0.25, 3);
    u.uStaerke!.value = w.regler.staerke ?? 1;
    u.uScheibe!.value = w.regler.scheibe ?? 1;
    u.uDoppler!.value = w.regler.doppler ?? 0.7;
    const hdr = k.ziel('horizont:hdr', { art: 'half' });
    k.flaeche(this.haupt, hdr, [0, 0, 0, 0]);
    const a = k.ziel('horizont:gluehA', { skala: 0.25, art: 'half' });
    const b = k.ziel('horizont:gluehB', { skala: 0.25, art: 'half' });
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
    const z = k.ziel('horizont:ende', { art: 'byte' });
    k.flaeche(this.ende, z, [0, 0, 0, 0]);
    return z.texture;
  }
  unruhig(): boolean {
    return true;
  }
  freigeben(): void {
    this.daten.freigeben();
    this.w1.freigeben();
    for (const m of [this.haupt, this.hell, this.blur, this.ende]) m.dispose();
  }
}

export const HORIZONT: Voreinstellung = {
  id: 'horizont',
  name: 'Ereignishorizont',
  gruppe: 'Effekte',
  zeile: 'Schwarzes Loch in der Form: Lichtstrahlen laufen durch den gekrümmten Raum, die Scheibe biegt sich über und unter die Form, Doppler, Photonenring',
  regler: [
    { k: 'staerke', name: 'Masse', min: 0, max: 2, schritt: 0.05, grund: 1 },
    { k: 'scheibe', name: 'Scheibe', min: 0, max: 2, schritt: 0.05, grund: 1 },
    { k: 'doppler', name: 'Doppler', min: 0, max: 1.5, schritt: 0.05, grund: 0.7 },
  ],
  bauen: (k) => new Horizont(k),
};
