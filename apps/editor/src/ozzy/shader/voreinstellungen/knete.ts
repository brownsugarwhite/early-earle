/**
 * Knete (Materialien; Florian: „realistischen ton/knet“). Plastilin wie im Stop-Motion-Film: satte Farbe, weich gestreut (das Licht greift
 * um die Schattengrenze), ein matter, breiter Glanz. Auf der Haut die Spuren der Hände: Fingerabdrücke (Schleifen und Wirbel aus feinen
 * Rillen, in Flecken verteilt, je Fleck auf die Fläche gelegt), lange Spuren eines Modellierholzes, leichte Dellen, ein paar Fusseln.
 * Auf Wunsch lebt sie wie im Stop-Motion: Die Abdrücke zittern zwölfmal je Sekunde ein wenig. Bühne: Tisch und Hohlkehle aus Karton,
 * warmes Licht, weicher Schatten.
 */
import { bildVoreinstellung } from '../bildShader';

const FRAGMENT = /* glsl */ `
/** Höhe der Spuren an q (Form-Maß), in der Fläche mit Normale n */
float spuren(vec3 q, vec3 n, float zittern) {
  float h = 0.0;
  // Fingerabdrücke
  vec3 vo = voronoi3(q * 3.2 + zittern);
  vec3 zell = floor(q * 3.2 + zittern);
  if (vo.z > 0.45) {
    vec3 mitte = (zell + hash33(zell)) / 3.2;
    vec3 d = q - mitte;
    d -= n * dot(d, n);
    vec3 t1 = normalize(cross(n, vec3(0.3, 1.0, 0.1)));
    vec3 t2 = cross(n, t1);
    vec2 p = vec2(dot(d, t1), dot(d, t2)) * 3.2;
    float w = hash13(zell) * 6.28;
    p = mat2(cos(w), sin(w), -sin(w), cos(w)) * p;
    float r = length(p * vec2(1.0, 1.35));
    float rillen = sin(r * 95.0 + 2.5 * noise2(p * 9.0 + vo.z * 10.0) + atan(p.y, p.x) * 0.5);
    float flaeche = smoothstep(0.32, 0.18, r);
    h += rillen * flaeche * 0.5;
  }
  // Modellierholz: lange, flache Rinnen
  float holz = 1.0 - smoothstep(0.0, 0.03, abs(snoise(vec3(q.x * 1.6, q.y * 9.0, q.z * 1.6) + 2.0)));
  h -= holz * 1.2;
  // Dellen
  h += snoise(q * 6.0) * 0.6;
  return h;
}
void main() {
  vec2 css = gl_FragCoord.xy / uDpr;
  GPunkt g = gLesen(vUv);
  float maske = deckungBei(vUv);
  vec2 qb = gl_FragCoord.xy / uAufl;
  // Bühne: Karton, Hohlkehle, warmer Schatten
  vec3 grund = mix(vec3(0.55, 0.5, 0.45), vec3(0.83, 0.79, 0.72), smoothstep(0.0, 0.7, qb.y));
  grund *= 0.96 + 0.06 * noise2(css * 0.9);
  float sch = texture(tWeich, vUv + vec2(0.035, 0.035)).r;
  grund *= 1.0 - 0.45 * sch;
  vec3 bild = srgbZuLin(grund);
  float a = uBuehne > 0.5 ? 1.0 : 0.0;
  if (g.a > 0.5) {
    vec3 V = zumAuge(g.p);
    vec3 q = (g.p - uMitte) / uRadius;
    float zittern = floor(uZeit * 12.0) * 0.013 * uR_stopmotion;
    float e = 0.002;
    float h0 = spuren(q, g.n, zittern);
    vec3 gr = vec3(spuren(q + vec3(e, 0.0, 0.0), g.n, zittern) - h0, spuren(q + vec3(0.0, e, 0.0), g.n, zittern) - h0, spuren(q + vec3(0.0, 0.0, e), g.n, zittern) - h0) / e;
    gr -= g.n * dot(gr, g.n);
    vec3 n = normalize(g.n - gr * 0.004 * uR_abdruecke);
    vec3 albedo = srgbZuLin(hsv(vec3(fract(uR_farbton / 360.0), 0.68, 0.82)));
    vec3 L = ausSicht(normalize(vec3(-0.5, 0.7, 0.55)));
    vec3 Lf = ausSicht(normalize(vec3(0.6, 0.1, 0.8)));
    float w = 0.35;
    float diff = clamp((dot(n, L) + w) / (1.0 + w), 0.0, 1.0);
    vec3 c = albedo * (diff * vec3(1.0, 0.95, 0.88) * 2.1 + clamp(dot(n, Lf), 0.0, 1.0) * vec3(0.7, 0.8, 1.0) * 0.35 + 0.1);
    // matter, breiter Glanz
    vec3 H = normalize(L + V);
    c += vec3(1.0) * ggx(max(dot(n, H), 0.0), 0.5) * fresnelS(max(dot(H, V), 0.0), 0.035) * max(dot(n, L), 0.0) * 1.2;
    // Fusseln
    float fussel = step(0.9985, hash12(floor(css / 1.5))) * 0.6;
    c = mix(c, vec3(0.02), fussel);
    bild = mix(bild, c, maske);
    a = max(a, maske);
  }
  vec3 aus = linZuSrgb(aces(bild * 1.05));
  farbe = vec4(aus * a, a);
}
`;

export const KNETE = bildVoreinstellung({
  id: 'knete',
  name: 'Knete',
  gruppe: 'Materialien',
  zeile: 'Plastilin wie im Stop-Motion: weiche Streuung, matter Glanz, Fingerabdrücke, Spuren des Modellierholzes, Dellen, Fusseln',
  regler: [
    { k: 'farbton', name: 'Farbton', min: 0, max: 360, schritt: 1, grund: 18 },
    { k: 'abdruecke', name: 'Abdrücke', min: 0, max: 3, schritt: 0.05, grund: 1 },
    { k: 'stopmotion', name: 'Stop-Motion', min: 0, max: 1, schritt: 1, grund: 0 },
  ],
  fragment: FRAGMENT,
  weich: { skala: 0.25, radius: 12 },
  unruhig: (w) => (w.regler.stopmotion ?? 0) > 0,
});
