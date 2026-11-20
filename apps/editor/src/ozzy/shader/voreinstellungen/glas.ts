/**
 * Flüssigglas (frei; hyperrealistisch; Apples „Liquid Glass“ von 2025 hat Glas zum Trend gemacht, und Ozzys Designsystem heißt
 * „liquid drop“). Die Form ist massives Glas: Ein Strahl bricht an der Vorderseite, läuft durch die Dicke der Form (Vorder- bis
 * Rückseite), bricht an der Rückseite wieder (oder wird dort ganz zurückgeworfen) und trifft eine Wand hinter der Form. Das geschieht
 * für sechs Wellenlängen mit je eigenem Brechungsindex: Dispersion, Regenbogensäume an Kanten. Dicke färbt (Beer–Lambert), Fresnel
 * spiegelt ein Studio, ein heller Saum liegt innen am Umriss wie bei Liquid Glass. Die Wand (Bühne) ist ein farbiges Bild mit Kreisen
 * und feinen Linien, damit man sieht, wie das Glas sie verzerrt; ohne Bühne ein helles Raster.
 */
import { bildVoreinstellung } from '../bildShader';

const FRAGMENT = /* glsl */ `
/** die Wand hinter der Form: Ebene quer zum Blick, etwas hinter der Form */
vec3 wand(vec3 p, vec3 d) {
  vec3 vorn = normalize((uViewInv * vec4(0.0, 0.0, -1.0, 0.0)).xyz);
  vec3 rechts = normalize((uViewInv * vec4(1.0, 0.0, 0.0, 0.0)).xyz);
  vec3 hoch = normalize((uViewInv * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
  vec3 ebene = uMitte + vorn * uRadius * 1.6;
  float dn = dot(d, vorn);
  float t = dn > 1e-4 ? dot(ebene - p, vorn) / dn : 1e4;
  vec3 w = p + d * t;
  vec2 q = vec2(dot(w - uMitte, rechts), dot(w - uMitte, hoch)) / uRadius;
  if (uBuehne < 0.5) {
    // helles Raster
    vec2 r = abs(fract(q * 4.0) - 0.5);
    float linie = smoothstep(0.47, 0.5, max(r.x, r.y));
    return vec3(0.97) - 0.25 * linie;
  }
  vec3 c = mix(vec3(0.08, 0.12, 0.45), vec3(0.55, 0.18, 0.62), smoothstep(-1.2, 1.4, q.x + 0.4 * q.y));
  c = mix(c, vec3(1.0, 0.55, 0.25), smoothstep(0.4, 2.2, q.y - 0.3 * q.x) * 0.8);
  // große Kreise
  for (int i = 0; i < 4; i++) {
    vec2 m = vec2(-1.1 + 0.8 * float(i), 0.6 * sin(float(i) * 2.3)) + vec2(0.0, -0.2);
    float r = 0.35 + 0.15 * float(i % 2);
    float k = 1.0 - smoothstep(r - 0.01, r + 0.01, length(q - m));
    vec3 kf = i == 0 ? vec3(1.0, 0.82, 0.2) : (i == 1 ? vec3(0.2, 0.9, 0.85) : (i == 2 ? vec3(1.0, 0.3, 0.45) : vec3(0.95)));
    c = mix(c, kf, k * 0.92);
  }
  // feine Linien schräg
  float l = smoothstep(0.42, 0.5, abs(fract((q.x - q.y) * 6.0) - 0.5));
  c = mix(c, vec3(1.0), l * 0.35);
  return c;
}
void main() {
  GPunkt g = gLesen(vUv);
  float maske = deckungBei(vUv);
  vec3 blick = blickDurch(vUv);
  vec3 kamera = uOrtho > 0.5 ? g.p - blick * uRadius * 4.0 : uKamPos;
  vec3 grund = srgbZuLin(wand(kamera, blick));
  if (g.a < 0.5) {
    vec3 aus = linZuSrgb(grund);
    float a0 = uBuehne > 0.5 ? 1.0 : 0.0;
    farbe = vec4(aus * a0, a0);
    return;
  }
  vec3 V = -blick;
  vec3 n = g.n;
  vec4 h = texture(tHinten, vUv);
  float dicke = h.w > g.z ? h.w - g.z : uRadius * 0.2;
  vec3 nh = h.w > g.z ? normalize(h.xyz) : n;
  // sechs Wellenlängen, je eigener Brechungsindex (Dispersion übertrieben für das Auge)
  vec3 summe = vec3(0.0), gewicht = vec3(0.0);
  for (int i = 0; i < 6; i++) {
    float lambda = 420.0 + float(i) * 52.0;
    float eta = 1.46 + 0.045 * uR_dispersion * (pow(550.0 / lambda, 2.0) - 1.0) + 0.06;
    vec3 r1 = refract(-V, n, 1.0 / eta);
    vec3 pe = g.p + r1 * dicke;
    vec3 r2 = refract(r1, -nh, eta);
    if (dot(r2, r2) < 1e-6) r2 = reflect(r1, -nh);
    vec3 s = srgbZuLin(wand(pe, r2));
    vec3 w = max(spektral(lambda), vec3(0.0));
    summe += s * w;
    gewicht += w;
  }
  vec3 durch = summe / max(gewicht, vec3(1e-4));
  // Dicke färbt (ein Hauch Türkis)
  vec3 tint = hsv(vec3(fract(uR_farbton / 360.0), 0.5, 1.0));
  durch *= exp(-dicke / uRadius * (1.0 - tint) * 0.9 * uR_toenung);
  // Spiegelung und Glanz
  float nv = clamp(dot(n, V), 0.0, 1.0);
  float fr = fresnelS(nv, 0.045);
  vec3 c = durch * (1.0 - fr) + studio(reflect(-V, n)) * fr;
  vec3 L = ausSicht(normalize(vec3(-0.5, 0.7, 0.5)));
  c += vec3(1.0) * pow(max(dot(n, normalize(L + V)), 0.0), 300.0) * 6.0;
  // heller Saum innen am Umriss, oben links stärker (Liquid Glass)
  float saum = smoothstep(0.82, 0.97, 1.0 - nv) * (1.0 - smoothstep(0.97, 1.0, 1.0 - nv));
  float seite = 0.5 + 0.5 * dot(normalize((uView * vec4(n, 0.0)).xy + 1e-5), normalize(vec2(-0.6, 0.8)));
  c += vec3(1.0) * saum * (0.25 + 0.9 * seite);
  vec3 aus = linZuSrgb(aces(c));
  vec3 g2 = linZuSrgb(grund);
  float a = uBuehne > 0.5 ? 1.0 : maske;
  aus = uBuehne > 0.5 ? mix(g2, aus, maske) : aus;
  farbe = vec4(aus * a, a);
}
`;

export const GLAS = bildVoreinstellung({
  id: 'glas',
  name: 'Flüssigglas',
  gruppe: 'Frei',
  zeile: 'Massives Glas: Brechung durch die ganze Dicke in sechs Wellenlängen (Dispersion), Totalreflexion, Fresnel, Lichtsaum',
  regler: [
    { k: 'dispersion', name: 'Dispersion', min: 0, max: 4, schritt: 0.05, grund: 1.6 },
    { k: 'toenung', name: 'Tönung', min: 0, max: 3, schritt: 0.05, grund: 0.6 },
    { k: 'farbton', name: 'Farbton', min: 0, max: 360, schritt: 1, grund: 190 },
  ],
  fragment: FRAGMENT,
  rueckseite: true,
  unruhig: () => false,
});
