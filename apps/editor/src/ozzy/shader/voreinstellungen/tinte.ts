/**
 * Tinte (frei; Florian: „flüssigkeitssimulationen“). Die Form ist ein Gefäß aus Glas voll Wasser; darin wirbeln drei Tinten (Cyan,
 * Magenta, Gelb), eingespritzt von wandernden Düsen, in einer Strömungssimulation (`stroemung.ts`), deren Wand der Umriss der Form
 * ist. Die Tinten mischen sich wie Pigment: Licht, das durch das Wasser geht, verliert je Farbstoff, was er schluckt (Beer–Lambert),
 * dichter wird es dunkel. Dreht man die Form, bleibt das Wasser zurück und schwappt (die Bewegung der Wand im Bild treibt die
 * Strömung). Darüber das Glas: Brechung am Rand, Fresnel-Spiegelung eines Studios, Glanzlichter, dunklere Kanten, wo das Glas dick ist.
 */
import { type RawShaderMaterial, type Texture, Matrix4 } from 'three';
import { BILD_KOPF, WeicheMaske } from '../bildShader';
import { G_LESEN, G_UNIFORMS, GDaten } from '../daten';
import { RAUSCHEN } from '../glsl';
import type { ShaderKern, ShaderLauf, ShaderWerte, Voreinstellung } from '../kern';
import { Stroemung } from '../stroemung';

const DUESEN = /* glsl */ `
/** Lage der Düse i im Bild (uv), Richtung und ob sie gerade spritzt */
vec2 duese(int i, float t, out vec2 richtung, out float an) {
  float fi = float(i);
  // die Düsen kreisen im Inneren der Form (im Raum um ihre Mitte): ihr Bild liegt im Umriss
  float a = t * (0.23 + 0.07 * fi) + fi * 2.1;
  vec3 im = uMitte + uRadius * 0.22 * vec3(cos(a), sin(a * 1.3 + fi) * 1.4, sin(a * 0.7 + fi * 2.0));
  vec2 o = insBild(im) - insBild(uMitte);
  vec2 c = insBild(uMitte);
  float w = t * (0.9 + 0.3 * fi) + fi * 1.7;
  richtung = vec2(cos(w), sin(w));
  an = smoothstep(0.35, 0.5, fract(t * 0.11 + fi * 0.33)) * (1.0 - smoothstep(0.8, 0.95, fract(t * 0.11 + fi * 0.33)));
  return c + o;
}
`;

const QUELLE_FARBE = /* glsl */ `
${G_UNIFORMS}
${RAUSCHEN}
${G_LESEN}
uniform sampler2D tAlt;
uniform float uDt;
uniform float uMenge;
${DUESEN}
out vec4 farbe;
void main() {
  vec4 alt = texture(tAlt, vUv);
  vec3 add = vec3(0.0);
  for (int i = 0; i < 3; i++) {
    vec2 r; float an;
    vec2 p = duese(i, uZeit, r, an);
    vec2 d = (vUv - p) * vec2(uAufl.x / uAufl.y, 1.0);
    float g = exp(-dot(d, d) / 0.00018);
    vec3 farbstoff = i == 0 ? vec3(1.0, 0.0, 0.0) : (i == 1 ? vec3(0.0, 1.0, 0.0) : vec3(0.0, 0.0, 1.0));
    add += farbstoff * g * an;
  }
  farbe = vec4(min(alt.rgb + add * uDt * 6.0 * uMenge, vec3(2.5)), 1.0);
}
`;

const QUELLE_GESCHW = /* glsl */ `
${G_UNIFORMS}
${RAUSCHEN}
${G_LESEN}
uniform sampler2D tAlt;
uniform float uDt;
uniform mat4 uVorherVP;
uniform float uSchwappen;
${DUESEN}
out vec4 farbe;
void main() {
  vec2 v = texture(tAlt, vUv).xy;
  vec2 zellen = vec2(textureSize(tAlt, 0));
  for (int i = 0; i < 3; i++) {
    vec2 r; float an;
    vec2 p = duese(i, uZeit, r, an);
    vec2 d = (vUv - p) * vec2(uAufl.x / uAufl.y, 1.0);
    float g = exp(-dot(d, d) / 0.00035);
    v += r * g * an * uDt * 2600.0;
  }
  // die Wand bewegt sich: das Wasser bleibt zurück
  vec4 n = texture(tNormal, vUv);
  if (n.a > 0.5 && uDt > 0.0) {
    vec3 p = texture(tLage, vUv).xyz;
    vec4 a = uVorherVP * vec4(p, 1.0);
    vec4 b = uProj * uView * vec4(p, 1.0);
    vec2 weg = (b.xy / b.w - a.xy / a.w) * 0.5 * zellen;
    v -= weg / uDt * 0.55 * uSchwappen;
  }
  farbe = vec4(v, 0.0, 1.0);
}
`;

const ENDE = /* glsl */ `
${BILD_KOPF}
uniform sampler2D tTinte;
uniform float uDichte;
/** Grund: helles Studio mit weichem Schatten unter der Form */
vec3 grundBei(vec2 uv) {
  vec3 c = mix(vec3(0.86, 0.87, 0.89), vec3(0.98, 0.98, 0.985), smoothstep(0.0, 0.8, uv.y));
  float schatten = texture(tWeich, uv + vec2(-0.01, 0.045)).r;
  return c * (1.0 - 0.22 * schatten * uBuehne);
}
void main() {
  vec2 cssPx = gl_FragCoord.xy / uDpr;
  GPunkt g = gLesen(vUv);
  float maske = deckungBei(vUv);
  vec3 grund = uBuehne > 0.5 ? grundBei(vUv) : vec3(1.0);
  if (g.a < 0.5 && maske <= 0.0) {
    farbe = uBuehne > 0.5 ? vec4(grund, 1.0) : vec4(0.0);
    return;
  }
  vec3 V = zumAuge(g.p);
  vec3 n = g.n;
  float nv = clamp(dot(n, V), 0.0, 1.0);
  // Dicke des Glases (Vorder- zu Rückseite) und Brechung am Rand
  vec4 h = texture(tHinten, vUv);
  float dicke = h.w > 0.0 ? clamp((h.w - g.z) / (uRadius * 1.6), 0.0, 1.0) : 0.3;
  vec2 nb = (uView * vec4(n, 0.0)).xy;
  vec2 brechung = -nb * (1.0 - nv) * 0.035;
  vec3 tinte = texture(tTinte, vUv + brechung).rgb;
  // Beer–Lambert: was jeder Farbstoff schluckt (Cyan schluckt Rot, Magenta Grün, Gelb Blau)
  mat3 schluckt = mat3(2.4, 0.35, 0.1, 0.25, 2.2, 0.35, 0.06, 0.28, 2.3);
  vec3 durch = exp(-(schluckt * tinte) * uDichte * (0.6 + 0.8 * dicke));
  vec3 wasser = vec3(0.96, 0.985, 0.99);
  vec3 hinter = (uBuehne > 0.5 ? grundBei(vUv + brechung * 2.0) : vec3(1.0)) * wasser;
  vec3 c = hinter * durch;
  // Glas: Kanten dunkler (dickes Glas), Fresnel-Spiegelung, Glanz
  float kante = pow(1.0 - nv, 3.0);
  c *= 1.0 - 0.18 * kante;
  vec3 R = reflect(-V, n);
  float fr = fresnelS(nv, 0.04);
  vec3 spiegel = studio(R);
  c = c * (1.0 - fr) + aces(spiegel * 0.7) * fr;
  vec3 L = ausSicht(normalize(vec3(-0.5, 0.7, 0.5)));
  float glanz = pow(max(dot(n, normalize(L + V)), 0.0), 220.0);
  c += vec3(1.0) * glanz * 1.2;
  // innerer Lichtsaum (Liquid Glass): eine helle Linie knapp innerhalb des Umrisses
  c += vec3(0.9, 0.95, 1.0) * smoothstep(0.75, 0.95, 1.0 - nv) * (1.0 - smoothstep(0.95, 1.0, 1.0 - nv)) * 0.35;
  c = clamp(c, 0.0, 1.0);
  vec3 aus = uBuehne > 0.5 ? mix(grund, c, maske) : c;
  float a = uBuehne > 0.5 ? 1.0 : maske;
  farbe = vec4(aus * a, a);
}
`;

class Tinte implements ShaderLauf {
  private readonly daten: GDaten;
  private readonly fluss: Stroemung;
  private readonly maske: WeicheMaske;
  private readonly weich: WeicheMaske;
  private readonly qFarbe: RawShaderMaterial;
  private readonly qGeschw: RawShaderMaterial;
  private readonly ende: RawShaderMaterial;

  constructor(k: ShaderKern) {
    this.daten = new GDaten(k);
    this.fluss = new Stroemung(k, 'tinte:fluss', { skala: 0.25, farbSkala: 0.5 });
    this.maske = new WeicheMaske(k);
    this.weich = new WeicheMaske(k);
    const g = { tNormal: { value: null }, tLage: { value: null } };
    this.qFarbe = k.flaecheProgramm(QUELLE_FARBE, { ...g, tAlt: { value: null }, uDt: { value: 0 }, uMenge: { value: 1 } });
    this.qGeschw = k.flaecheProgramm(QUELLE_GESCHW, { ...g, tAlt: { value: null }, uDt: { value: 0 }, uVorherVP: { value: new Matrix4() }, uSchwappen: { value: 1 } });
    this.ende = k.flaecheProgramm(ENDE, { ...g, tHinten: { value: null }, tWeich: { value: null }, tTinte: { value: null }, uDichte: { value: 1 } });
  }

  bild(k: ShaderKern, w: ShaderWerte): Texture {
    const d = this.daten.zeichnen(k);
    const hinten = this.daten.rueckseite(k);
    const frei = this.maske.rechnen(k, d.normal, 'tinte:frei', 0.25, 0.6);
    const dt = Math.min(1 / 30, Math.max(1 / 240, w.dt));
    for (const p of [this.qFarbe, this.qGeschw, this.ende]) {
      p.uniforms.tNormal!.value = d.normal;
      p.uniforms.tLage!.value = d.lage;
    }
    this.qFarbe.uniforms.uDt!.value = dt;
    this.qFarbe.uniforms.uMenge!.value = w.regler.menge ?? 1;
    this.fluss.einbringen('farbe', this.qFarbe);
    this.qGeschw.uniforms.uDt!.value = dt;
    (this.qGeschw.uniforms.uVorherVP!.value as Matrix4).copy(k.vorherViewProj);
    this.qGeschw.uniforms.uSchwappen!.value = w.regler.schwappen ?? 1;
    this.fluss.einbringen('geschw', this.qGeschw);
    this.fluss.schritt({ dt, wirbel: 14 * (w.regler.wirbel ?? 1), druckSchritte: 20, geschwAbklingen: 0.12, farbeAbklingen: 0.035, frei });
    const u = this.ende.uniforms;
    u.tHinten!.value = hinten;
    u.tWeich!.value = this.weich.rechnen(k, d.normal, 'tinte:schatten', 0.25, 14);
    u.tTinte!.value = this.fluss.farbe().lesen.texture;
    u.uDichte!.value = w.regler.dichte ?? 1;
    const z = k.ziel('tinte:ende', { art: 'byte' });
    k.flaeche(this.ende, z, [0, 0, 0, 0]);
    return z.texture;
  }

  unruhig(): boolean {
    return true;
  }

  freigeben(): void {
    this.daten.freigeben();
    this.fluss.freigeben();
    this.maske.freigeben();
    this.weich.freigeben();
    this.qFarbe.dispose();
    this.qGeschw.dispose();
    this.ende.dispose();
  }
}

export const TINTE: Voreinstellung = {
  id: 'tinte',
  name: 'Tinte',
  gruppe: 'Frei',
  zeile: 'Ein Glas voll Wasser: drei Tinten wirbeln (Navier–Stokes), mischen sich wie Pigment und schwappen, wenn die Form sich dreht',
  regler: [
    { k: 'menge', name: 'Tinte', min: 0, max: 3, schritt: 0.05, grund: 1.4 },
    { k: 'dichte', name: 'Dichte', min: 0.2, max: 4, schritt: 0.05, grund: 2 },
    { k: 'wirbel', name: 'Wirbel', min: 0, max: 3, schritt: 0.05, grund: 1 },
    { k: 'schwappen', name: 'Schwappen', min: 0, max: 3, schritt: 0.05, grund: 1 },
  ],
  bauen: (k) => new Tinte(k),
};
