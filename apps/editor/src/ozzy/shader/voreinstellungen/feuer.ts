/**
 * Feuer (frei; Florian: „brennend“, „rauch/feuersimulationen“). Die Form brennt wie Papier: Eine Glutfront frisst sich von unten nach
 * oben durch (Reihenfolge aus Höhe und Rauschen, an der Form verankert), davor bräunt die Fläche, dahinter bleibt ein verkohlter Saum
 * mit glühenden Rissen; wo die Hülle durch ist, sieht man ihre Innenseite, wo beide Seiten durch sind, ein Loch. Aus der Front steigen
 * Flammen einer echten Strömungssimulation (`stroemung.ts`: Auftrieb aus Temperatur, Wirbel, Rauch, der dunkel abzieht), gefärbt wie ein
 * schwarzer Körper (rund 900 bis 2 300 Kelvin), darüber Funken und Hitzeflimmern. Danach wächst die Form golden wieder nach (Phönix).
 */
import type { RawShaderMaterial, Texture } from 'three';
import { BILD_KOPF } from '../bildShader';
import { G_LESEN, G_UNIFORMS, GDaten } from '../daten';
import { RAUSCHEN } from '../glsl';
import type { ShaderKern, ShaderLauf, ShaderWerte, Voreinstellung } from '../kern';
import { Stroemung } from '../stroemung';

const BRAND = /* glsl */ `
uniform float uBrand;
/** > 0: steht noch, < 0: verbrannt (Abstand in der Reihenfolge des Brennens) */
float brandBei(vec3 p) {
  vec3 q = (p - uMitte) / uRadius;
  float hoehe = clamp(q.y * 0.55 + 0.5, 0.0, 1.0);
  float n = fbm3(q * 1.8 + vec3(0.0, 0.0, 3.0)) * 0.5 + 0.5;
  return 0.58 * hoehe + 0.42 * n - uBrand;
}
`;

const QUELLE_FARBE = /* glsl */ `
${G_UNIFORMS}
${RAUSCHEN}
${G_LESEN}
uniform sampler2D tAlt;
uniform sampler2D tHinten;
uniform float uZuendung;
uniform float uDt;
${BRAND}
out vec4 farbe;
/** wie stark es an uv brennt (Front, Glut dahinter, Innenseite) */
float quelleBei(vec2 uv) {
  vec4 n = texture(tNormal, uv);
  if (n.a < 0.5) return 0.0;
  vec3 p = texture(tLage, uv).xyz;
  float f = brandBei(p);
  float q = smoothstep(0.04, 0.0, abs(f));
  if (f < 0.0) {
    vec4 h = texture(tHinten, uv);
    if (h.w > 0.0) {
      float fb = brandBei(lageAusTiefe(uv, h.w));
      q = max(q, 0.8 * smoothstep(0.04, 0.0, abs(fb)));
    }
  }
  return q;
}
void main() {
  vec4 alt = texture(tAlt, vUv);
  float q = quelleBei(vUv) * uZuendung;
  float flackern = 0.4 + 1.2 * noise2(vUv * vec2(180.0, 40.0) + vec2(0.0, -uZeit * 6.0));
  float T = alt.r * exp(-0.85 * uDt) + q * uDt * 20.0 * flackern;
  float rauch = alt.g * exp(-0.6 * uDt) + q * uDt * 0.9 + alt.r * uDt * 0.12;
  farbe = vec4(min(T, 4.0), min(rauch, 3.0), 0.0, 1.0);
}
`;

const QUELLE_GESCHW = /* glsl */ `
${RAUSCHEN}
uniform sampler2D tAlt;
uniform sampler2D tFeuer;
uniform float uDt;
out vec4 farbe;
void main() {
  vec2 v = texture(tAlt, vUv).xy;
  float T = texture(tFeuer, vUv).r;
  // Unruhe im Feuer: seitliche Stöße aus Rauschen
  float n = noise2(vUv * vec2(60.0, 30.0) + vec2(uZeit * 2.0, -uZeit * 5.0)) - 0.5;
  v.x += n * T * uDt * 900.0;
  farbe = vec4(v, 0.0, 1.0);
}
`;

const ENDE = /* glsl */ `
${BILD_KOPF}
uniform sampler2D tFeuer;
uniform float uWaechst;
uniform float uFeuerStaerke;
uniform sampler2D tGeschw;
uniform float uPruef;
${BRAND}
vec3 feuerFarbe(float T) {
  // Temperatur des Felds (0 … 4) in Kelvin und Helligkeit
  float K = 950.0 + 650.0 * clamp(T, 0.0, 2.4);
  float hell = pow(clamp(T, 0.0, 4.0), 1.25) * 2.4;
  return schwarzkoerper(K) * hell;
}
/** die Fläche der Form an einer Stelle: Papier, gebräunt, verkohlt, Glut */
vec3 flaeche(vec3 p, vec3 n, float f, float innen, float glut) {
  vec3 L = ausSicht(normalize(vec3(-0.4, 0.75, 0.55)));
  float diff = max(dot(n, L), 0.0) * 0.75 + 0.25;
  vec3 V = zumAuge(p);
  float rand0 = pow(1.0 - abs(dot(n, V)), 2.0);
  vec3 papier = mix(vec3(0.94, 0.88, 0.76), vec3(0.78, 0.66, 0.5), rand0 * 0.6) * diff;
  vec3 q = (p - uMitte) / uRadius;
  papier *= 0.9 + 0.06 * snoise(q * 22.0) + 0.04 * snoise(vec3(q.x * 90.0, q.y * 6.0, q.z * 90.0));
  vec3 innenFarbe = vec3(0.32, 0.24, 0.18) * (0.5 + 0.5 * diff);
  vec3 c = mix(papier, innenFarbe, innen);
  // bräunen vor der Front, verkohlen dahinter
  float braun = smoothstep(0.16, 0.03, f);
  c = mix(c, vec3(0.42, 0.24, 0.1) * diff, braun * 0.8);
  float kohle = smoothstep(0.05, 0.012, f);
  c = mix(c, vec3(0.03, 0.025, 0.022), kohle);
  // glühende Risse im Saum
  vec3 vo = voronoi3((p - uMitte) / uRadius * 9.0);
  float riss = smoothstep(0.07, 0.0, vo.y - vo.x);
  float hitze = smoothstep(0.06, 0.0, f) * smoothstep(-0.01, 0.01, f);
  c += schwarzkoerper(1100.0 + 600.0 * hitze) * riss * hitze * 2.2 * (0.6 + 0.4 * noise2(p.xy * 0.1 + uZeit * 2.0));
  // der Rand selbst: eine glühende Linie
  float rand = smoothstep(0.014, 0.0, abs(f - 0.004));
  vec3 randFarbe = uWaechst > 0.5 ? vec3(2.6, 1.9, 0.8) : schwarzkoerper(1900.0) * 3.2;
  c += randFarbe * rand * glut;
  return c;
}
void main() {
  vec2 px = gl_FragCoord.xy;
  vec2 cssPx = px / uDpr;
  // Feuer, Rauch und das Flimmern
  vec4 feuer = texture(tFeuer, vUv);
  vec2 flimmern = (vec2(noise2(cssPx * 0.05 + vec2(0.0, -uZeit * 4.0)), noise2(cssPx * 0.05 + vec2(7.0, -uZeit * 4.0))) - 0.5) * 6.0 * clamp(feuer.r, 0.0, 1.0) * uDpr / uAufl;
  // Grund: dunkel, vom Feuer warm beleuchtet
  vec3 grund = mix(vec3(0.02, 0.017, 0.016), vec3(0.05, 0.035, 0.03), vUv.y);
  float schein = 0.0;
  for (int i = 0; i < 8; i++) {
    float w = float(i) * 0.785398;
    schein += texture(tFeuer, vUv + vec2(cos(w), sin(w)) * 0.06).r;
  }
  grund += vec3(0.55, 0.2, 0.05) * schein * 0.025;
  // die Fläche: vorn, sonst die Innenseite, sonst Loch
  GPunkt g = gLesen(vUv + flimmern);
  float maske = deckungBei(vUv + flimmern);
  vec3 bild = grund;
  float form = 0.0;
  if (g.a > 0.5) {
    float f = brandBei(g.p);
    float glut = uBrand > -0.04 ? 1.0 : 0.0;
    if (f >= 0.0) {
      bild = flaeche(g.p, g.n, f, 0.0, glut);
      form = maske;
    } else {
      vec4 h = texture(tHinten, vUv + flimmern);
      if (h.w > 0.0) {
        vec3 pb = lageAusTiefe(vUv, h.w);
        float fb = brandBei(pb);
        if (fb >= 0.0) {
          bild = flaeche(pb, -normalize(h.xyz), fb, 1.0, glut);
          form = maske;
        }
      }
      // der Rand des Lochs glüht
      float rand = smoothstep(0.02, 0.0, -f);
      bild += schwarzkoerper(1700.0) * rand * 2.5 * glut;
      form = max(form, rand * maske);
    }
    // Feuerlicht auf der Form
    bild += vec3(0.9, 0.38, 0.1) * schein * 0.045 * form;
  }
  // Rauch dunkelt ab, Flammen leuchten
  float rauch = clamp(feuer.g, 0.0, 3.0);
  bild *= exp(-rauch * 0.35);
  vec3 flamme = feuerFarbe(feuer.r) * uFeuerStaerke;
  // Funken: kurze helle Punkte, wo es heiß ist
  float funke = step(0.997, hash12(floor(cssPx / 2.0) + floor(uZeit * 30.0))) * smoothstep(0.3, 1.2, feuer.r);
  flamme += vec3(3.0, 1.6, 0.6) * funke;
  vec3 farbeLin = bild + flamme;
  if (uPruef > 0.5) {
    vec2 v = texture(tGeschw, vUv).xy;
    farbe = vec4(clamp(-v.y / 200.0, 0.0, 1.0), clamp(v.y / 200.0, 0.0, 1.0), clamp(feuer.r, 0.0, 1.0) * 0.5, 1.0);
    return;
  }
  vec3 aus = linZuSrgb(aces(farbeLin * 1.1));
  float a;
  if (uBuehne > 0.5) a = 1.0;
  else {
    a = clamp(max(form, max(luma(flamme) * 1.5, 1.0 - exp(-rauch * 0.55))), 0.0, 1.0);
    aus = a > 0.0 ? aus : vec3(0.0);
  }
  farbe = vec4(aus * a, a);
}
`;

class Feuer implements ShaderLauf {
  private readonly daten: GDaten;
  private readonly fluss: Stroemung;
  private readonly qFarbe: RawShaderMaterial;
  private readonly qGeschw: RawShaderMaterial;
  private readonly ende: RawShaderMaterial;
  private brand = -0.05;

  constructor(k: ShaderKern) {
    this.daten = new GDaten(k);
    this.fluss = new Stroemung(k, 'feuer:fluss', { skala: 0.25, farbSkala: 0.33 });
    const g = { tNormal: { value: null }, tLage: { value: null }, tHinten: { value: null }, uBrand: { value: 0 } };
    this.qFarbe = k.flaecheProgramm(QUELLE_FARBE, { ...g, tAlt: { value: null }, uZuendung: { value: 1 }, uDt: { value: 0 } });
    this.qGeschw = k.flaecheProgramm(QUELLE_GESCHW, { tAlt: { value: null }, tFeuer: { value: null }, uDt: { value: 0 } });
    this.ende = k.flaecheProgramm(ENDE, { ...g, tFeuer: { value: null }, tWeich: { value: null }, uWaechst: { value: 0 }, uFeuerStaerke: { value: 1 }, tGeschw: { value: null }, uPruef: { value: new URLSearchParams(location.search).get('feuerPruef') === '1' ? 1 : 0 } });
  }

  /** der Lauf des Brands: 10 s brennen, 1 s Asche, 3,5 s nachwachsen, 1,5 s Ruhe (mal Tempo) */
  private lauf(t: number): { brand: number; zuendung: number; waechst: number } {
    const T = t % 16;
    const ein = (x: number): number => x * x * (3 - 2 * x);
    if (T < 10) return { brand: -0.05 + 1.17 * ein(T / 10), zuendung: 1, waechst: 0 };
    if (T < 11) return { brand: 1.12, zuendung: 0.4, waechst: 0 };
    if (T < 14.5) return { brand: 1.12 - 1.17 * ein((T - 11) / 3.5), zuendung: 0, waechst: 1 };
    return { brand: -0.05, zuendung: 0, waechst: 0 };
  }

  bild(k: ShaderKern, w: ShaderWerte): Texture {
    const d = this.daten.zeichnen(k);
    const hinten = this.daten.rueckseite(k);
    const l = this.lauf(w.zeit * (w.regler.tempo ?? 1));
    this.brand = l.brand;
    for (const p of [this.qFarbe, this.ende]) {
      p.uniforms.tNormal!.value = d.normal;
      p.uniforms.tLage!.value = d.lage;
      p.uniforms.tHinten!.value = hinten;
      p.uniforms.uBrand!.value = this.brand;
    }
    const dt = Math.min(1 / 30, Math.max(1 / 240, w.dt));
    this.qFarbe.uniforms.uDt!.value = dt;
    this.qFarbe.uniforms.uZuendung!.value = l.zuendung;
    this.fluss.einbringen('farbe', this.qFarbe);
    this.qGeschw.uniforms.uDt!.value = dt;
    this.qGeschw.uniforms.tFeuer!.value = this.fluss.farbe().lesen.texture;
    this.fluss.einbringen('geschw', this.qGeschw);
    this.fluss.schritt({ dt, wirbel: 26 * (w.regler.wirbel ?? 1), druckSchritte: 18, geschwAbklingen: 0.25, farbeAbklingen: 0, auftrieb: [120, 5] });
    this.ende.uniforms.tFeuer!.value = this.fluss.farbe().lesen.texture;
    this.ende.uniforms.tGeschw!.value = this.fluss.geschw().lesen.texture;
    this.ende.uniforms.uWaechst!.value = l.waechst;
    this.ende.uniforms.uFeuerStaerke!.value = w.regler.flammen ?? 1;
    const z = k.ziel('feuer:ende', { art: 'byte' });
    k.flaeche(this.ende, z, [0, 0, 0, 0]);
    return z.texture;
  }

  unruhig(): boolean {
    return true;
  }

  info(): Record<string, number> {
    return { brand: Math.round(this.brand * 100) / 100 };
  }

  freigeben(): void {
    this.daten.freigeben();
    this.fluss.freigeben();
    this.qFarbe.dispose();
    this.qGeschw.dispose();
    this.ende.dispose();
  }
}

export const FEUER: Voreinstellung = {
  id: 'feuer',
  name: 'Feuer',
  gruppe: 'Frei',
  zeile: 'Die Form brennt wie Papier: Glutfront, verkohlter Saum, Flammen aus einer Strömungssimulation, Funken; danach wächst sie nach',
  regler: [
    { k: 'tempo', name: 'Tempo', min: 0.2, max: 3, schritt: 0.05, grund: 1 },
    { k: 'flammen', name: 'Flammen', min: 0, max: 2.5, schritt: 0.05, grund: 1 },
    { k: 'wirbel', name: 'Wirbel', min: 0, max: 3, schritt: 0.05, grund: 1 },
  ],
  bauen: (k) => new Feuer(k),
};
