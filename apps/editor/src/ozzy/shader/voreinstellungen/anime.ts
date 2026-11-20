/**
 * Anime (Anime & Manga): der Look einer heutigen Anime-Serie. Eine Grundfarbe, ein Schattenton mit harter Kante (kühl getönt, nicht
 * grau), ein zweiter, tieferer Ton in Mulden; ein schmales Randlicht von hinten, eine Glanzform mit klarem Umriss, wo das Licht direkt
 * zurückkommt; die Kontur in einer dunkleren Farbe der Fläche, auf der Lichtseite dünner. Bühne: blauer Himmel mit gemalten
 * Haufenwolken (oben scharf, unten weich).
 */
import { bildVoreinstellung } from '../bildShader';

const FRAGMENT = /* glsl */ `
vec3 himmelAnime(vec2 qb, vec2 css) {
  vec3 c = mix(vec3(0.62, 0.82, 0.98), vec3(0.18, 0.45, 0.9), smoothstep(0.1, 1.0, qb.y));
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    vec2 m = vec2(0.15 + 0.38 * fi, 0.3 + 0.12 * sin(fi * 2.3));
    vec2 d = (qb - m) * vec2(uAufl.x / uAufl.y, 1.0);
    float form = fbm2(css * 0.006 + fi * 9.0) * 0.12;
    float wolke = smoothstep(0.0, 0.01, 0.16 + form - length(d * vec2(0.7, 1.5)));
    float boden = smoothstep(-0.06, 0.04, d.y);
    vec3 wf = mix(vec3(0.82, 0.86, 0.95), vec3(1.0), smoothstep(-0.02, 0.06, d.y + form * 0.5));
    c = mix(c, wf, wolke * mix(0.6, 1.0, boden));
  }
  return c;
}
void main() {
  vec2 css = gl_FragCoord.xy / uDpr;
  GPunkt g = gLesen(vUv);
  float maske = deckungBei(vUv);
  vec2 qb = gl_FragCoord.xy / uAufl;
  vec3 bild = himmelAnime(qb, css);
  float a = uBuehne > 0.5 ? 1.0 : 0.0;
  vec3 basis = hsv(vec3(fract(uR_farbton / 360.0), 0.38, 1.0));
  vec3 schattenF = basis * mix(vec3(1.0), vec3(0.55, 0.5, 0.8), 0.75);
  vec3 tiefF = basis * vec3(0.38, 0.33, 0.62);
  if (g.a > 0.5) {
    vec3 L = ausSicht(normalize(vec3(-0.45, 0.7, 0.55)));
    vec3 V = zumAuge(g.p);
    float v = dot(g.n, L);
    float aa = max(fwidth(v), 1e-3);
    float hell = smoothstep(0.08 - aa, 0.08 + aa, v);
    vec3 c = mix(schattenF, basis, hell);
    // tiefer Ton in Mulden: wo Nachbarn näher an der Kamera sind (Verdeckung im Bild)
    float mulde = 0.0;
    for (int k = 0; k < 6; k++) {
      float w = float(k) * 1.047;
      vec2 o = vec2(cos(w), sin(w)) * 10.0 * uDpr / uAufl;
      float z2 = texture(tLage, vUv + o).a;
      float a2 = texture(tNormal, vUv + o).a;
      mulde += step(0.5, a2) * smoothstep(0.004, 0.02, (g.z - z2) / g.z);
    }
    c = mix(c, tiefF, step(2.5, mulde) * (1.0 - hell * 0.6));
    // Randlicht von hinten rechts, schmal und scharf
    vec3 R = ausSicht(normalize(vec3(0.85, 0.3, -0.45)));
    float rand = step(0.72, 1.0 - max(dot(g.n, V), 0.0)) * step(0.15, dot(g.n, R));
    c = mix(c, vec3(1.0, 0.98, 0.94), rand * 0.9);
    // Glanzform mit klarem Umriss
    float spec = pow(max(dot(g.n, normalize(L + V)), 0.0), 40.0);
    c = mix(c, vec3(1.0), smoothstep(0.55, 0.58, spec));
    bild = mix(bild, c, maske);
    a = max(a, maske);
  }
  // Kontur in der dunklen Farbe der Fläche, auf der Lichtseite dünner
  float breite = (1.0 + 0.8 * smoothstep(0.3, -0.2, dot(g.n, ausSicht(normalize(vec3(-0.45, 0.7, 0.55)))))) * uDpr;
  float linie = kanteBei(vUv, breite);
  bild = mix(bild, tiefF * 0.6, linie);
  a = max(a, linie);
  farbe = vec4(bild * a, a);
}
`;

export const ANIME = bildVoreinstellung({
  id: 'anime',
  name: 'Anime',
  gruppe: 'Anime & Manga',
  zeile: 'Heutige Anime-Serie: harter, kühl getönter Schatten, Mulden, scharfes Randlicht, Glanzform, farbige Kontur, Wolkenhimmel',
  regler: [{ k: 'farbton', name: 'Farbton', min: 0, max: 360, schritt: 1, grund: 28 }],
  fragment: FRAGMENT,
  unruhig: () => false,
});
