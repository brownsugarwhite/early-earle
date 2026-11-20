/**
 * Dampfwesen (Anime & Manga; Florian: „ein beständig … dampfendes wesen in einem anime vectorlook“). Ein Wesen, das ständig dampft,
 * gezeichnet wie im Anime: Der Körper ist warm (weicher Zweiton, unten heiß gerötet, ein Glanzfleck, farbige Kontur), aus ihm steigen
 * Dampfwolken. Jede Wolke ist ein Bündel Kreise, das aufsteigt, wächst und sich oben auflöst; sie sind flach weiß mit einem
 * bläulichen Schatten auf der lichtabgewandten Seite und einer feinen Kontur. Dazwischen die Kringel, die im Anime „heiß“ bedeuten.
 * Auf Zweiern. Bühne: Pastell mit Punkten.
 */
import { bildVoreinstellung } from '../bildShader';

const FRAGMENT = /* glsl */ `
/** Dampf an p (uv): Deckung und ob die Stelle im Schatten der Wolke liegt (y) */
vec2 dampf(vec2 p, vec2 c0, float rUv, float t, float aspekt) {
  float deck = 0.0, schatten = 0.0;
  vec2 licht = vec2(-0.6, 0.8) * rUv * 0.06;
  for (int i = 0; i < 18; i++) {
    float fi = float(i);
    float h = hash11(fi * 3.17 + 0.5);
    float alter = fract(t * (0.07 + 0.05 * h) * uR_tempo + h * 7.0);
    vec2 start = c0 + vec2((hash11(fi * 1.9) - 0.5) * 1.1 * rUv / aspekt, rUv * (0.35 + 0.35 * hash11(fi * 5.3)));
    vec2 m = start + vec2(sin(alter * 4.0 + fi) * 0.15 * rUv / aspekt, alter * rUv * 2.6 * uR_menge);
    float gr = rUv * (0.1 + 0.18 * alter + 0.06 * h) * (1.0 - smoothstep(0.7, 1.0, alter)) * smoothstep(0.0, 0.12, alter);
    for (int j = 0; j < 4; j++) {
      float fj = float(j);
      vec2 o = (hash21(fi * 11.0 + fj) - 0.5) * gr * vec2(1.4 / aspekt, 0.9);
      float rr = gr * (0.55 + 0.35 * hash11(fi * 13.0 + fj));
      vec2 d = (p - m - o) * vec2(aspekt, 1.0);
      float k = 1.0 - smoothstep(rr - 0.0015, rr + 0.0015, length(d));
      float ks = 1.0 - smoothstep(rr - 0.0015, rr + 0.0015, length(d - licht * vec2(aspekt, 1.0)));
      deck = max(deck, k);
      schatten = max(schatten, k * (1.0 - ks));
    }
  }
  return vec2(deck, schatten);
}
void main() {
  vec2 css = gl_FragCoord.xy / uDpr;
  float t = schritt(12.0);
  float aspekt = uAufl.x / uAufl.y;
  GPunkt g = gLesen(vUv);
  float maske = deckungBei(vUv);
  vec2 c0 = insBild(uMitte);
  vec3 randW = uMitte + (uViewInv * vec4(0.0, 1.0, 0.0, 0.0)).xyz * uRadius;
  float rUv = length(insBild(randW) - c0);
  vec2 qb = gl_FragCoord.xy / uAufl;
  vec3 grund = mix(vec3(1.0, 0.86, 0.82), vec3(0.86, 0.84, 1.0), qb.y);
  vec2 pz = fract(css / 26.0 + vec2(0.0, floor(css.x / 26.0) * 0.5)) - 0.5;
  grund = mix(grund, vec3(1.0), (1.0 - smoothstep(0.1, 0.13, length(pz))) * 0.6);
  vec3 bild = grund;
  float a = uBuehne > 0.5 ? 1.0 : 0.0;
  if (g.a > 0.5) {
    vec3 L = ausSicht(normalize(vec3(-0.5, 0.7, 0.5)));
    vec3 V = zumAuge(g.p);
    float v = dot(g.n, L);
    vec3 basis = hsv(vec3(fract(uR_farbton / 360.0), 0.42, 1.0));
    vec3 schattenF = hsv(vec3(fract(uR_farbton / 360.0 + 0.02), 0.55, 0.82));
    vec3 c = v > 0.05 ? basis : schattenF;
    // unten heiß gerötet (Bänder, flach)
    vec3 q = (g.p - uMitte) / uRadius;
    float heiss = smoothstep(0.0, -0.6, q.y);
    c = mix(c, vec3(1.0, 0.45, 0.45), floor(heiss * 2.0 + 0.5) / 2.0 * 0.45);
    // Glanzfleck
    vec3 nv = normalize((uView * vec4(g.n, 0.0)).xyz);
    float glanz = 1.0 - smoothstep(0.12, 0.14, length((nv.xy - vec2(-0.38, 0.5)) * vec2(1.0, 1.5)));
    c = mix(c, vec3(1.0), glanz * step(0.2, nv.z));
    // Wangenröte: zwei weiche Ovale in Farbe (flach)
    bild = mix(bild, c, maske);
    a = max(a, maske);
  }
  float linie = kanteBei(vUv, 1.3 * uDpr);
  vec3 konturF = hsv(vec3(fract(uR_farbton / 360.0), 0.7, 0.45));
  bild = mix(bild, konturF, linie);
  a = max(a, linie);
  // Dampf vor allem
  vec2 d = dampf(vUv, c0, rUv, t, aspekt);
  vec2 dRand = dampf(vUv + vec2(0.0012, 0.0), c0, rUv, t, aspekt);
  float kanteD = clamp(abs(d.x - dRand.x) * 2.0, 0.0, 1.0);
  vec3 dampfF = mix(vec3(1.0), vec3(0.78, 0.84, 0.98), d.y);
  bild = mix(bild, dampfF, d.x * 0.96);
  bild = mix(bild, vec3(0.55, 0.6, 0.8), kanteD * 0.7);
  a = max(a, d.x * 0.96);
  // Hitzekringel über dem Kopf
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    vec2 m = c0 + vec2((fi - 1.0) * 0.35 * rUv / aspekt, rUv * 1.15);
    vec2 dd = (vUv - m) * vec2(aspekt, 1.0) / rUv;
    float y = dd.y - 0.06 * sin(dd.x * 0.0 + dd.y * 18.0 + t * 6.0 + fi);
    float welle = abs(dd.x - 0.04 * sin(dd.y * 22.0 + t * 8.0 + fi * 2.0));
    float k = (1.0 - smoothstep(0.012, 0.022, welle)) * step(0.0, dd.y) * step(dd.y, 0.32) * step(0.5, fract(t * 0.7 + fi * 0.33));
    bild = mix(bild, konturF, k);
    a = max(a, k);
  }
  farbe = vec4(bild * a, a);
}
`;

export const DAMPFWESEN = bildVoreinstellung({
  id: 'dampfwesen',
  name: 'Dampfwesen',
  gruppe: 'Anime & Manga',
  zeile: 'Ein Wesen, das ständig dampft: warmer Zweiton, aufsteigende Dampfwolken aus Kreisen mit Schatten und Kontur, Hitzekringel',
  regler: [
    { k: 'farbton', name: 'Farbton', min: 0, max: 360, schritt: 1, grund: 12 },
    { k: 'menge', name: 'Dampf', min: 0.3, max: 2, schritt: 0.05, grund: 1 },
    { k: 'tempo', name: 'Tempo', min: 0.2, max: 3, schritt: 0.05, grund: 1 },
  ],
  fragment: FRAGMENT,
});
