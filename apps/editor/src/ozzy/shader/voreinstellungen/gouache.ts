/**
 * Gouache (Anime & Manga, nach den gemalten Hintergründen der Ghibli-Filme). Die Form ist mit dem Pinsel gemalt: Striche folgen ihrer
 * Wölbung (Richtung quer zum Licht, gebogen mit der Normalen), deckende Farbe mit leicht unruhigem Rand; warmes Nachmittagslicht,
 * blauvioletter Schatten, ein kühles Himmelslicht von oben, das Licht der Wiese von unten. Bühne: tiefblauer Himmel mit großen
 * Haufenwolken (gemalt: weiß mit grauvioletten Schatten), grüne Hügel mit Grasstrichen.
 */
import { bildVoreinstellung } from '../bildShader';

const FRAGMENT = /* glsl */ `
/** ein Pinselstrich-Feld: Streifen längs einer Richtung, mit unruhigen Enden */
float pinsel(vec2 p, vec2 richtung, float breite, float seed) {
  vec2 r = normalize(richtung + 1e-5);
  vec2 q = vec2(dot(p, r), dot(p, vec2(-r.y, r.x)));
  float reihe = floor(q.y / breite);
  float lang = 30.0 + 50.0 * hash11(reihe + seed);
  float f = fract((q.x + hash11(reihe * 1.7 + seed) * 300.0) / lang);
  float borste = noise2(vec2(q.x * 0.05, q.y * 1.2));
  return smoothstep(0.0, 0.15, f) * (1.0 - smoothstep(0.8, 1.0, f)) * (0.7 + 0.3 * borste);
}
void main() {
  vec2 css = gl_FragCoord.xy / uDpr;
  GPunkt g = gLesen(vUv);
  float maske = deckungBei(vUv);
  vec2 qb = gl_FragCoord.xy / uAufl;
  float aspekt = uAufl.x / uAufl.y;
  // Himmel, Wolken, Hügel, gemalt
  vec3 himmel = mix(vec3(0.56, 0.75, 0.93), vec3(0.16, 0.36, 0.72), smoothstep(0.3, 1.0, qb.y));
  float wf = fbm2(css * vec2(0.004, 0.007) + 3.0);
  float wolke = smoothstep(0.5, 0.54, wf + 0.25 * (qb.y - 0.6));
  float wolkeSch = smoothstep(0.5, 0.6, fbm2(css * vec2(0.004, 0.007) + 3.0 + vec2(0.0, 0.05)));
  vec3 wolkeF = mix(vec3(0.68, 0.66, 0.8), vec3(1.0, 0.99, 0.96), wolkeSch);
  himmel = mix(himmel, wolkeF, wolke * step(0.45, qb.y));
  float huegel = smoothstep(0.0, 0.006, 0.28 + 0.06 * sin(qb.x * 4.0 + 1.0) + 0.02 * fbm2(css * 0.01) - qb.y);
  vec3 gras = mix(vec3(0.24, 0.48, 0.18), vec3(0.45, 0.68, 0.24), pinsel(css, vec2(0.2, 1.0), 3.0, 4.0));
  vec3 grund = mix(himmel, gras, huegel);
  grund *= 0.96 + 0.06 * pinsel(css, vec2(1.0, 0.25), 6.0, 9.0);
  vec3 bild = grund;
  float a = uBuehne > 0.5 ? 1.0 : 0.0;
  if (g.a > 0.5) {
    vec3 L = ausSicht(normalize(vec3(-0.55, 0.6, 0.55)));
    vec3 V = zumAuge(g.p);
    float v = dot(g.n, L);
    vec3 licht = vec3(1.0, 0.86, 0.66);
    vec3 schatten = vec3(0.42, 0.42, 0.66);
    vec3 basis = hsv(vec3(fract(uR_farbton / 360.0), 0.35, 0.95));
    float hell = smoothstep(-0.05, 0.25, v);
    vec3 c = basis * mix(schatten, licht, hell);
    c += vec3(0.25, 0.35, 0.45) * max(g.n.y, 0.0) * 0.25;
    c += vec3(0.25, 0.4, 0.15) * max(-g.n.y, 0.0) * 0.2;
    // Pinselstriche quer zum Licht, mit der Form gebogen
    vec2 nb = (uView * vec4(g.n, 0.0)).xy;
    vec2 richtung = vec2(-nb.y, nb.x) + vec2(0.3, 0.1);
    float p1 = pinsel(css, richtung, 5.0, 1.0);
    float p2 = pinsel(css + 2.5, richtung + vec2(0.3, -0.2), 4.0, 2.0);
    c *= 0.9 + 0.12 * p1 - 0.05 * p2;
    // Randlicht des Himmels
    c = mix(c, vec3(0.85, 0.92, 1.0), smoothstep(0.65, 0.9, 1.0 - max(dot(g.n, V), 0.0)) * 0.35);
    // unruhiger, deckender Rand
    float randStrich = smoothstep(0.35, 0.6, noise2(css * 0.3));
    bild = mix(bild, c, clamp(maske * (0.85 + 0.15 * randStrich) + maske * 0.15, 0.0, 1.0));
    a = max(a, maske);
  }
  float linie = kanteBei(vUv, 0.7 * uDpr) * maske;
  bild = mix(bild, bild * 0.6, linie * 0.5);
  farbe = vec4(bild * a, a);
}
`;

export const GOUACHE = bildVoreinstellung({
  id: 'gouache',
  name: 'Gouache',
  gruppe: 'Anime & Manga',
  zeile: 'Gemalt wie Ghibli-Hintergründe: Pinselstriche entlang der Form, warmes Licht, violette Schatten, Wolkenhimmel, Hügel',
  regler: [{ k: 'farbton', name: 'Farbton', min: 0, max: 360, schritt: 1, grund: 30 }],
  fragment: FRAGMENT,
  unruhig: () => false,
});
