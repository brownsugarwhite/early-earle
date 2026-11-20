/**
 * Cartoon (Spider-Verse, Spider-Ham aus „Into the Spider-Verse“: Zeichentrick der Dreißiger und Vierziger, Gummischlauch-Stil). Flache,
 * satte Farbe, ein harter Schatten in einem Ton, der berühmte Glanzfleck (zwei weiße Ovale oben am Körper, wo das Licht direkt
 * zurückkommt), eine dicke schwarze Kontur, die sich auf Zweiern bewegt. Darüber alter Film: Bildstand wackelt, Helligkeit flackert,
 * Staub und Kratzer. Bühne: gemalter Hintergrund mit Horizont und die Irisblende am Rand („That's all, folks“).
 */
import { bildVoreinstellung } from '../bildShader';

const FRAGMENT = /* glsl */ `
void main() {
  float t = uZeit;
  float t12 = schritt(12.0);
  // Bildstand wackelt (auf Zweiern), Helligkeit flackert
  vec2 wackel = (hash22(vec2(t12, 1.0)) - 0.5) * 1.6 * uR_film;
  vec2 css = gl_FragCoord.xy / uDpr + wackel;
  vec2 uv = vUv + wackel * uDpr / uAufl;
  GPunkt g = gLesen(uv);
  float maske = deckungBei(uv);
  vec3 L = ausSicht(normalize(vec3(-0.5, 0.65, 0.55)));
  vec3 farbeK = hsv(vec3(fract(uR_farbton / 360.0), 0.62, 0.98));
  vec3 schattenK = hsv(vec3(fract(uR_farbton / 360.0 - 0.03), 0.75, 0.68));
  // Grund: gemalter Himmel, Hügel, Irisblende
  vec2 qb = gl_FragCoord.xy / uAufl;
  vec3 grund = mix(vec3(0.99, 0.93, 0.78), vec3(0.62, 0.84, 0.95), smoothstep(0.35, 0.9, qb.y));
  float huegel = smoothstep(0.0, 0.004, (0.3 + 0.05 * sin(qb.x * 9.0) + 0.03 * sin(qb.x * 23.0 + 1.0)) - qb.y);
  grund = mix(grund, vec3(0.45, 0.72, 0.38), huegel);
  vec2 c0 = insBild(uMitte);
  float iris = length((qb - c0) * vec2(uAufl.x / uAufl.y, 1.0));
  grund = mix(grund, vec3(0.02), smoothstep(0.62, 0.625, iris));
  vec3 bild = grund;
  float a = uBuehne > 0.5 ? 1.0 : 0.0;
  if (g.a > 0.5) {
    float v = dot(g.n, L);
    vec3 c = v > 0.0 ? farbeK : schattenK;
    // Glanzfleck: zwei weiße Ovale, wo die Fläche zum Licht schaut
    vec3 nv = normalize((uView * vec4(g.n, 0.0)).xyz);
    vec2 h = nv.xy - vec2(-0.42, 0.48);
    float oval = length(h * vec2(1.0, 1.6));
    float glanz = 1.0 - smoothstep(0.17, 0.19, oval);
    float klein = 1.0 - smoothstep(0.055, 0.07, length((nv.xy - vec2(-0.2, 0.28)) * vec2(1.0, 1.4)));
    c = mix(c, vec3(1.0), max(glanz, klein) * step(0.2, nv.z));
    bild = mix(bild, c, maske);
    a = max(a, maske);
  }
  // dicke Kontur, die atmet
  float dicke = (2.2 + 0.9 * noise2(css * 0.012 + t12 * 1.7)) * uDpr;
  float linie = kanteBei(uv, dicke);
  bild = mix(bild, vec3(0.04, 0.03, 0.03), linie);
  a = max(a, linie);
  // alter Film: Flackern, Staub, Kratzer
  float flackern = 1.0 + (hash11(t12 * 13.0) - 0.5) * 0.06 * uR_film;
  bild *= flackern;
  float staub = step(0.9993, hash12(floor(css / 3.0) + t12 * 31.0)) * uR_film;
  float kratzer = smoothstep(0.997, 1.0, noise2(vec2(css.x * 0.9 + floor(t12 * 3.0) * 40.0, 0.5))) * step(0.6, hash11(floor(t * 4.0))) * uR_film;
  bild = mix(bild, vec3(0.1), staub * 0.8);
  bild = mix(bild, vec3(1.0), kratzer * 0.5);
  farbe = vec4(clamp(bild, 0.0, 1.0) * a, a);
}
`;

export const CARTOON = bildVoreinstellung({
  id: 'cartoon',
  name: 'Cartoon',
  gruppe: 'Spider-Verse',
  zeile: 'Spider-Ham: Zeichentrick der Dreißiger, flache Farbe, Glanzfleck, dicke Kontur auf Zweiern, alter Film mit Irisblende',
  regler: [
    { k: 'farbton', name: 'Farbton', min: 0, max: 360, schritt: 1, grund: 345 },
    { k: 'film', name: 'Alter Film', min: 0, max: 2, schritt: 0.05, grund: 1 },
  ],
  fragment: FRAGMENT,
});
