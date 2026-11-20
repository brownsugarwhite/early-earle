/**
 * Flüssigglas (frei; hyperrealistisch; Apples „Liquid Glass“ von 2025 hat Glas zum Trend gemacht, und Ozzys Designsystem heißt
 * „liquid drop“). Die Form ist massives Glas: Ein Strahl bricht an der Vorderseite, läuft durch die Dicke der Form (Vorder- bis
 * Rückseite), bricht an der Rückseite wieder (oder wird dort ganz zurückgeworfen) und trifft eine Wand hinter der Form: ein Fotostudio
 * für Glas (helle Hohlkehle, schwarze Karten seitlich für die dunklen Kanten, farbige Folien). Das geschieht
 * für sechs Wellenlängen mit je eigenem Brechungsindex: Dispersion, Regenbogensäume an Kanten. Dicke färbt (Beer–Lambert), Fresnel
 * spiegelt ein Studio, ein heller Saum liegt innen am Umriss wie bei Liquid Glass. Die Wand (Bühne) ist ein farbiges Bild mit Kreisen
 * und feinen Linien, damit man sieht, wie das Glas sie verzerrt; ohne Bühne ein helles Raster.
 */
import { bildVoreinstellung } from '../bildShader';

const FRAGMENT = /* glsl */ `
/** die Umgebung in Richtung d (vom Glas aus gesehen): ein Fotostudio für Glas als Hohlkehle rundum. Hell, eine Softbox hinter der
 *  Form, zwei schwarze Karten seitlich (stark gebrochene Strahlen treffen sie: die dunklen Kanten im Glas), farbige Folien oben, feine
 *  Linien am Boden. Ohne Bühne ein helles Raster auf einer Wand hinter der Form. */
vec3 wand(vec3 p, vec3 d) {
  vec3 vorn = normalize((uViewInv * vec4(0.0, 0.0, -1.0, 0.0)).xyz);
  vec3 rechts = normalize((uViewInv * vec4(1.0, 0.0, 0.0, 0.0)).xyz);
  vec3 hoch = normalize((uViewInv * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
  if (uBuehne < 0.5) {
    vec3 ebene = uMitte + vorn * uRadius * 1.6;
    float dn = dot(d, vorn);
    if (dn <= 1e-3) return vec3(0.9);
    vec3 w = p + d * (dot(ebene - p, vorn) / dn);
    vec2 q = vec2(dot(w - uMitte, rechts), dot(w - uMitte, hoch)) / uRadius;
    vec2 r = abs(fract(q * 4.0) - 0.5);
    return vec3(0.97) - 0.25 * smoothstep(0.47, 0.5, max(r.x, r.y));
  }
  float phi = atan(dot(d, rechts), dot(d, vorn));
  float th = asin(clamp(dot(d, hoch), -1.0, 1.0));
  vec3 c = mix(vec3(0.5, 0.52, 0.56), vec3(0.92, 0.93, 0.95), smoothstep(-0.6, 0.35, th));
  c += vec3(0.34) * exp(-(phi * phi * 2.5 + (th - 0.12) * (th - 0.12) * 4.0));
  float ap = abs(phi);
  float karte = smoothstep(0.82, 0.9, ap) * (1.0 - smoothstep(1.28, 1.36, ap)) * (1.0 - smoothstep(0.6, 0.85, abs(th)));
  c = mix(c, vec3(0.015), karte * 0.95);
  c *= mix(vec3(1.0), vec3(0.62, 0.88, 1.25), smoothstep(0.12, 0.6, th - phi * 0.5) * uR_folie);
  c *= mix(vec3(1.0), vec3(1.25, 0.72, 0.88), smoothstep(0.12, 0.6, th + phi * 0.5) * uR_folie);
  float l = smoothstep(0.44, 0.5, abs(fract(phi * 9.0) - 0.5)) * smoothstep(-0.05, -0.35, th);
  c = mix(c, c * 0.55, l * 0.6);
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
  vec3 nh = normalize(n - 2.0 * dot(n, V) * V);
  // sechs Wellenlängen, je eigener Brechungsindex (Dispersion übertrieben für das Auge)
  vec3 summe = vec3(0.0), gewicht = vec3(0.0);
  for (int i = 0; i < 6; i++) {
    float lambda = 420.0 + float(i) * 52.0;
    float eta = mix(1.0, 1.5, uR_brechung) + 0.045 * uR_dispersion * (pow(550.0 / lambda, 2.0) - 1.0);
    vec3 r1 = refract(-V, n, 1.0 / eta);
    vec3 pe = g.p + r1 * dicke;
    vec3 r2 = refract(r1, -nh, eta);
    // Totalreflexion: das Licht bleibt im Glas und kommt gedämpft aus einer anderen Richtung (dunkler Saum)
    vec3 s = srgbZuLin(dot(r2, r2) < 1e-6 ? wand(pe, reflect(r1, -nh)) * 0.4 : wand(pe, r2));
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
  gruppe: 'Materialien',
  zeile: 'Massives Glas: Brechung durch die ganze Dicke in sechs Wellenlängen (Dispersion), Totalreflexion, Fresnel, Lichtsaum',
  regler: [
    { k: 'dispersion', name: 'Dispersion', min: 0, max: 4, schritt: 0.05, grund: 1.1 },
    { k: 'folie', name: 'Farbfolien', min: 0, max: 1.5, schritt: 0.05, grund: 0.8 },
    { k: 'brechung', name: 'Brechung', min: 0, max: 1.2, schritt: 0.01, grund: 0.62 },
    { k: 'toenung', name: 'Tönung', min: 0, max: 3, schritt: 0.05, grund: 0.6 },
    { k: 'farbton', name: 'Farbton', min: 0, max: 360, schritt: 1, grund: 190 },
  ],
  fragment: FRAGMENT,
  rueckseite: true,
  unruhig: () => false,
});
