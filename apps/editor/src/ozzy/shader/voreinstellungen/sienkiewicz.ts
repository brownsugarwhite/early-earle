/**
 * Sienkiewicz (Spider-Verse, Kingpin in „Into the Spider-Verse“, nach Bill Sienkiewicz' Kingpin: eine riesige schwarze Masse, wild
 * gemalt). Die Form ist fast ganz Tusche: trockener Pinsel mit Streifen, weiße Kratzer wie auf Schabkarton, die nur auf der
 * Lichtseite die Form verraten, eine weiße Kante, wo das Licht sie streift. Um die Form und auf ihr Spritzer und Kleckse, dazu ein paar
 * Tupfer reiner Farbe (Cyan, Rot, Gelb). Bühne: Papier mit grauer Lasur und großen Klecksen.
 */
import { bildVoreinstellung } from '../bildShader';

const FRAGMENT = /* glsl */ `
/** ein Klecks mit Zacken (Tinte, die aufschlägt) und Tropfen auf seinen Strahlen; in Bildpunkten */
float spritzer(vec2 p, float seed) {
  float zell = 170.0;
  vec2 i = floor(p / zell);
  float best = 0.0;
  for (int y = -1; y <= 1; y++)
    for (int x = -1; x <= 1; x++) {
      vec2 z = i + vec2(float(x), float(y));
      float h = hash12(z + seed);
      if (h > 0.42) continue;
      vec2 c = (z + 0.2 + 0.6 * hash22(z + seed * 3.1)) * zell;
      vec2 d = p - c;
      float r = zell * (0.07 + 0.16 * hash12(z + 7.0 + seed));
      float w = atan(d.y, d.x);
      float zacken = pow(noise2(vec2(w * 4.0 + h * 20.0, h * 9.0)), 4.0) * 2.2;
      float rand = r * (0.78 + 0.3 * noise2(vec2(w * 2.0 + h * 40.0, 3.0)) + zacken);
      float klecks = 1.0 - smoothstep(rand - 1.2, rand + 1.2, length(d));
      // Tropfen auf den Strahlen hinaus
      float strahl = noise2(vec2(w * 7.0 + h * 13.0, 1.0));
      float ring = fract(length(d) / (r * 0.55) + h * 5.0);
      float tropfen = step(0.72, strahl) * (1.0 - smoothstep(0.08, 0.16, abs(ring - 0.5))) * smoothstep(r * 3.6, r * 1.1, length(d)) * step(r * 1.2, length(d));
      best = max(best, max(klecks, tropfen * step(0.5, hash12(floor(vec2(w * 7.0, length(d) / (r * 0.55))) + h))));
    }
  return best;
}
void main() {
  vec2 css = gl_FragCoord.xy / uDpr;
  vec2 anker = insBild(uMitte) * uAufl / uDpr;
  vec2 p = css - anker;
  GPunkt g = gLesen(vUv);
  float maske = deckungBei(vUv);
  vec3 L = ausSicht(normalize(vec3(-0.6, 0.6, 0.5)));
  // Grund: Papier mit grauer Lasur und Klecksen
  vec3 grund = vec3(0.95, 0.94, 0.9) * papier(css);
  grund *= 1.0 - 0.18 * smoothstep(0.4, 0.8, fbm2(css * 0.004));
  float k = spritzer(p, 1.0);
  grund = mix(grund, vec3(0.02), k);
  // Farbtupfer
  vec3 tv = voronoi2(p / 260.0 + 7.0);
  float tupf = step(0.88, tv.z) * smoothstep(0.2, 0.16, tv.x + 0.05 * fbm2(p * 0.05));
  vec3 tupfFarbe = hash11(tv.z * 11.0) < 0.33 ? vec3(0.0, 0.75, 0.95) : (hash11(tv.z * 11.0) < 0.66 ? vec3(0.95, 0.12, 0.15) : vec3(1.0, 0.85, 0.1));
  grund = mix(grund, tupfFarbe, tupf * 0.9);
  vec3 bild = grund;
  float a = uBuehne > 0.5 ? 1.0 : 0.0;
  if (g.a > 0.5) {
    float v = dot(g.n, L);
    vec3 q = (g.p - uMitte) / uRadius;
    // trockener Pinsel: Streifen in der Tusche
    float strich = fbm2(vec2(dot(css, vec2(0.7, 0.7)) * 0.02, dot(css, vec2(-0.7, 0.7)) * 0.4));
    vec3 c = vec3(0.015, 0.016, 0.022) + vec3(0.05, 0.06, 0.08) * smoothstep(0.55, 0.8, strich);
    // Schabkarton: weiße Kratzer, nur wo Licht hinfällt
    float kr1 = 1.0 - smoothstep(0.0, 0.035, abs(snoise(vec3(q.x * 9.0, q.y * 2.0, q.z * 9.0))));
    float kr2 = 1.0 - smoothstep(0.0, 0.03, abs(snoise(vec3(q.x * 3.0 + 4.0, q.y * 11.0, q.z * 3.0))));
    float licht = smoothstep(0.15, 0.7, v);
    c = mix(c, vec3(0.92), max(kr1, kr2 * 0.8) * licht * 0.9);
    // weiße Kante, wo das Licht streift
    vec3 V = zumAuge(g.p);
    float kante = smoothstep(0.7, 0.86, 1.0 - max(dot(g.n, V), 0.0)) * smoothstep(0.0, 0.5, v);
    c = mix(c, vec3(1.0), kante);
    // Farbtupfer und weiße Spritzer auf der Form
    float ws = spritzer(p + 57.0, 4.0) * 0.8;
    c = mix(c, vec3(0.96), ws * smoothstep(-0.3, 0.3, v));
    c = mix(c, tupfFarbe, tupf * 0.85);
    bild = mix(bild, c, maske);
    a = max(a, maske);
  }
  if (uBuehne < 0.5) a = max(a, k);
  farbe = vec4(bild * a, a);
}
`;

export const SIENKIEWICZ = bildVoreinstellung({
  id: 'sienkiewicz',
  name: 'Sienkiewicz',
  gruppe: 'Spider-Verse',
  zeile: 'Kingpin: eine schwarze Masse aus Tusche, weiße Kratzer wie auf Schabkarton, Spritzer, Kleckse und Tupfer reiner Farbe',
  regler: [],
  fragment: FRAGMENT,
  unruhig: () => false,
});
