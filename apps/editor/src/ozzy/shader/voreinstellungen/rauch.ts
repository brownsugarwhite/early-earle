/**
 * Rauch (frei; Florian: „rauch/feuersimulationen“). Die Form ist ein Körper aus Rauch: Durch jeden Bildpunkt wird von der Vorder- zur
 * Rückseite der Form gerechnet (Volumen in 28 Schritten, halbe Auflösung), die Dichte ist aufsteigendes, sich windendes Rauschen, das
 * am Rand der Form ausdünnt; Licht streut darin (Henyey–Greenstein, nach vorn), mit Selbstschatten in Richtung der Lampe. Vom Rand und
 * von oben lösen sich Fahnen und steigen in einer Strömungssimulation auf (Auftrieb, Wirbel). Bühne: Nacht, ein Gegenlicht hinter der
 * Form (der Rauch leuchtet an den Rändern), dazu ein kühles Licht von vorn.
 */
import type { RawShaderMaterial, Texture } from 'three';
import { BILD_KOPF } from '../bildShader';
import { G_LESEN, G_UNIFORMS, GDaten } from '../daten';
import { RAUSCHEN } from '../glsl';
import type { ShaderKern, ShaderLauf, ShaderWerte, Voreinstellung } from '../kern';
import { Stroemung } from '../stroemung';

const DICHTE = /* glsl */ `
uniform float uSteigen;
float rauchDichte(vec3 p) {
  vec3 q = (p - uMitte) / uRadius;
  float t = uZeit * uSteigen;
  vec3 w = q * 1.6 + vec3(0.0, -t * 0.45, t * 0.08);
  w += 0.35 * vec3(snoise(w * 0.9 + 7.0), snoise(w * 0.9 + 13.0), snoise(w * 0.9 + 21.0));
  float n = fbm3n(w * 1.5, 5);
  float ballen = smoothstep(-0.12, 0.42, n);
  return ballen * ballen * 1.6;
}
`;

/** das Volumen in halber Auflösung: rgb Licht (vormultipliziert), a Deckung */
const VOLUMEN = /* glsl */ `
${G_UNIFORMS}
${RAUSCHEN}
${G_LESEN}
uniform sampler2D tHinten;
uniform float uDichteMal;
${DICHTE}
out vec4 farbe;
float hg(float c, float g) { float g2 = g * g; return (1.0 - g2) / (12.566 * pow(1.0 + g2 - 2.0 * g * c, 1.5)); }
void main() {
  GPunkt g = gLesen(vUv);
  if (g.a < 0.5) { farbe = vec4(0.0); return; }
  vec4 h = texture(tHinten, vUv);
  vec3 a = g.p;
  vec3 b = h.w > g.z ? lageAusTiefe(vUv, h.w) : a + blickDurch(vUv) * uRadius * 0.015;
  float lang = length(b - a);
  vec3 dir = (b - a) / max(lang, 1e-4);
  const int N = 28;
  float schritt = lang / float(N);
  vec3 Lg = normalize((uViewInv * vec4(0.15, 0.35, -1.0, 0.0)).xyz);
  vec3 Lv = normalize((uViewInv * vec4(-0.6, 0.5, 0.6, 0.0)).xyz);
  float c1 = dot(dir, Lg), c2 = dot(dir, Lv);
  vec3 licht = vec3(0.0);
  float durch = 1.0;
  float zufall = hash12(gl_FragCoord.xy + fract(uZeit) * 61.0);
  for (int i = 0; i < N; i++) {
    float s = (float(i) + zufall) * schritt;
    vec3 p = a + dir * s;
    // am Rand ausdünnen (nahe Vorder- und Rückseite)
    float rand = smoothstep(0.0, 0.12 * uRadius, s) * smoothstep(0.0, 0.12 * uRadius, lang - s);
    float d = rauchDichte(p) * rand * uDichteMal;
    if (d < 0.01) continue;
    float sigma = d * 3.2 / uRadius;
    // Selbstschatten zum Gegenlicht
    float zumLicht = 0.0;
    for (int j = 1; j <= 3; j++) zumLicht += rauchDichte(p + Lg * uRadius * 0.12 * float(j));
    float tl = exp(-zumLicht * 0.9 * uDichteMal);
    float zumVorn = 0.0;
    for (int j = 1; j <= 3; j++) zumVorn += rauchDichte(p + Lv * uRadius * 0.1 * float(j));
    float tv = exp(-zumVorn * 0.8 * uDichteMal);
    vec3 gegen = vec3(1.0, 0.72, 0.42) * 10.0 * hg(c1, 0.6) * tl;
    vec3 vorn = vec3(0.55, 0.62, 0.8) * 2.2 * hg(c2, 0.25) * tv;
    vec3 umgebung = vec3(0.025, 0.03, 0.05);
    float aufnahme = 1.0 - exp(-sigma * schritt);
    licht += durch * aufnahme * (gegen + vorn + umgebung);
    durch *= 1.0 - aufnahme;
    if (durch < 0.02) break;
  }
  farbe = vec4(licht, 1.0 - durch);
}
`;

const QUELLE_FARBE = /* glsl */ `
${G_UNIFORMS}
${RAUSCHEN}
${G_LESEN}
uniform sampler2D tAlt;
uniform float uDt;
uniform float uFahnen;
out vec4 farbe;
void main() {
  vec4 alt = texture(tAlt, vUv);
  // am Umriss und oben auf der Form lösen sich Fahnen
  float innen = deckungBei(vUv);
  vec2 px = 1.5 / vec2(textureSize(tNormal, 0));
  float rand = 0.0;
  for (int i = 0; i < 4; i++) {
    float w = float(i) * 1.5708;
    rand += abs(texture(tNormal, vUv + vec2(cos(w), sin(w)) * px * 6.0).a - innen);
  }
  GPunkt g = gLesen(vUv);
  float oben = g.a > 0.5 ? smoothstep(0.3, 0.9, g.n.y) : 0.0;
  float puls = noise2(vUv * vec2(40.0, 25.0) + vec2(uZeit * 0.7, -uZeit * 1.3));
  float q = (min(rand, 1.0) * 0.8 + oben * 0.35) * smoothstep(0.35, 0.75, puls);
  float d = alt.g * exp(-0.3 * uDt) + q * uDt * 1.0 * uFahnen;
  farbe = vec4(0.0, min(d, 2.0), 0.0, 1.0);
}
`;

const QUELLE_GESCHW = /* glsl */ `
${RAUSCHEN}
uniform sampler2D tAlt;
uniform sampler2D tRauch;
uniform float uDt;
out vec4 farbe;
void main() {
  vec2 v = texture(tAlt, vUv).xy;
  float d = texture(tRauch, vUv).g;
  // Rauch steigt (warm), seitlich etwas Unruhe
  v.y += d * uDt * 160.0;
  v.x += (noise2(vUv * vec2(30.0, 18.0) + vec2(uZeit * 0.5, -uZeit)) - 0.5) * d * uDt * 500.0;
  farbe = vec4(v, 0.0, 1.0);
}
`;

const ENDE = /* glsl */ `
${BILD_KOPF}
uniform sampler2D tVolumen;
uniform sampler2D tFahnen;
void main() {
  vec2 q = vUv;
  vec2 cssPx = gl_FragCoord.xy / uDpr;
  // Bühne: Nacht, ein warmes Gegenlicht hinter der Form
  vec2 c = insBild(uMitte);
  float r = length((q - c) * vec2(uAufl.x / uAufl.y, 1.0));
  vec3 grund = mix(vec3(0.012, 0.014, 0.022), vec3(0.03, 0.035, 0.05), q.y);
  grund += vec3(1.0, 0.62, 0.32) * 0.28 * exp(-r * r / 0.05);
  grund += vec3(0.25, 0.3, 0.45) * 0.05 * exp(-r * r / 0.4);
  vec3 bild = uBuehne > 0.5 ? grund : vec3(0.0);
  float a = uBuehne > 0.5 ? 1.0 : 0.0;
  // Fahnen: vom Gegenlicht durchleuchtet
  float f = texture(tFahnen, q).g;
  float fd = 1.0 - exp(-f * 1.1);
  float dicht = smoothstep(0.2, 1.4, f);
  vec3 fahne = mix(vec3(0.36, 0.39, 0.47), vec3(1.0, 0.74, 0.48), exp(-r * r / 0.07) * (1.0 - 0.6 * dicht)) * (0.95 - 0.35 * dicht);
  bild = bild * (1.0 - fd) + fahne * fd;
  a = max(a, fd);
  // der Körper
  vec4 vol = texture(tVolumen, q);
  bild = bild * (1.0 - vol.a) + vol.rgb;
  a = max(a, vol.a);
  vec3 aus = linZuSrgb(aces(bild * 1.25));
  farbe = vec4(aus * a, a);
}
`;

class Rauch implements ShaderLauf {
  private readonly daten: GDaten;
  private readonly fluss: Stroemung;
  private readonly volumen: RawShaderMaterial;
  private readonly qFarbe: RawShaderMaterial;
  private readonly qGeschw: RawShaderMaterial;
  private readonly ende: RawShaderMaterial;

  constructor(k: ShaderKern) {
    this.daten = new GDaten(k);
    this.fluss = new Stroemung(k, 'rauch:fluss', { skala: 0.33, farbSkala: 0.5 });
    const g = { tNormal: { value: null }, tLage: { value: null } };
    this.volumen = k.flaecheProgramm(VOLUMEN, { ...g, tHinten: { value: null }, uDichteMal: { value: 1 }, uSteigen: { value: 1 } });
    this.qFarbe = k.flaecheProgramm(QUELLE_FARBE, { ...g, tAlt: { value: null }, uDt: { value: 0 }, uFahnen: { value: 1 } });
    this.qGeschw = k.flaecheProgramm(QUELLE_GESCHW, { tAlt: { value: null }, tRauch: { value: null }, uDt: { value: 0 } });
    this.ende = k.flaecheProgramm(ENDE, { ...g, tHinten: { value: null }, tWeich: { value: null }, tVolumen: { value: null }, tFahnen: { value: null } });
  }

  bild(k: ShaderKern, w: ShaderWerte): Texture {
    const d = this.daten.zeichnen(k);
    const hinten = this.daten.rueckseite(k);
    const dt = Math.min(1 / 30, Math.max(1 / 240, w.dt));
    const v = this.volumen.uniforms;
    v.tNormal!.value = d.normal;
    v.tLage!.value = d.lage;
    v.tHinten!.value = hinten;
    v.uDichteMal!.value = w.regler.dichte ?? 1;
    v.uSteigen!.value = w.regler.steigen ?? 1;
    const vol = k.ziel('rauch:volumen', { skala: 0.5, art: 'half' });
    k.flaeche(this.volumen, vol, [0, 0, 0, 0]);
    this.qFarbe.uniforms.tNormal!.value = d.normal;
    this.qFarbe.uniforms.tLage!.value = d.lage;
    this.qFarbe.uniforms.uDt!.value = dt;
    this.qFarbe.uniforms.uFahnen!.value = w.regler.fahnen ?? 1;
    this.fluss.einbringen('farbe', this.qFarbe);
    this.qGeschw.uniforms.uDt!.value = dt;
    this.qGeschw.uniforms.tRauch!.value = this.fluss.farbe().lesen.texture;
    this.fluss.einbringen('geschw', this.qGeschw);
    this.fluss.schritt({ dt, wirbel: 22, druckSchritte: 16, geschwAbklingen: 0.3, farbeAbklingen: 0 });
    const u = this.ende.uniforms;
    u.tVolumen!.value = vol.texture;
    u.tFahnen!.value = this.fluss.farbe().lesen.texture;
    const z = k.ziel('rauch:ende', { art: 'byte' });
    k.flaeche(this.ende, z, [0, 0, 0, 0]);
    return z.texture;
  }

  unruhig(): boolean {
    return true;
  }

  freigeben(): void {
    this.daten.freigeben();
    this.fluss.freigeben();
    this.volumen.dispose();
    this.qFarbe.dispose();
    this.qGeschw.dispose();
    this.ende.dispose();
  }
}

export const RAUCH: Voreinstellung = {
  id: 'rauch',
  name: 'Rauch',
  gruppe: 'Effekte',
  zeile: 'Die Form ist ein Körper aus Rauch: Volumen mit Gegenlicht und Selbstschatten, Fahnen steigen in einer Strömungssimulation auf',
  regler: [
    { k: 'dichte', name: 'Dichte', min: 0.2, max: 3, schritt: 0.05, grund: 1 },
    { k: 'steigen', name: 'Steigen', min: 0, max: 3, schritt: 0.05, grund: 1 },
    { k: 'fahnen', name: 'Fahnen', min: 0, max: 3, schritt: 0.05, grund: 1 },
  ],
  bauen: (k) => new Rauch(k),
};
