/**
 * Sienkiewicz (Spider-Verse, Kingpin in „Into the Spider-Verse“, nach Bill Sienkiewicz' Kingpin: eine riesige schwarze Masse, wild
 * gemalt). Die Form ist fast ganz Tusche: trockener Pinsel mit Streifen, weiße Kratzer wie auf Schabkarton, die nur auf der
 * Lichtseite die Form verraten, eine weiße Kante, wo das Licht sie streift. Die Spritzer sind wie echte Tusche, die aufschlägt: ein
 * Klecks mit weichen Beulen, Satellitentropfen auf Strahlen (nach außen gestreckt, kleiner mit dem Abstand) und ein feiner Sprühnebel.
 * Bühne: Papier mit Lasuren in gedeckten Farben (am Rand dunkler, wo sich das Pigment sammelt), ein roter Fleck, breite trockene
 * Pinselstriche; wenige Tupfer reiner Farbe.
 */
import { bildVoreinstellung } from '../bildShader';

const FRAGMENT = /* glsl */ `
/** Tusche, die aufschlägt: Klecks mit weichen Beulen, Satellitentropfen, Sprühnebel (in Bildpunkten) */
float spritzer(vec2 p, float seed, float dichte) {
  const float zell = 240.0;
  vec2 i = floor(p / zell);
  float best = 0.0;
  for (int y = -1; y <= 1; y++)
    for (int x = -1; x <= 1; x++) {
      vec2 z = i + vec2(float(x), float(y));
      float h = hash12(z + seed);
      if (h > dichte) continue;
      vec2 c = (z + 0.25 + 0.5 * hash22(z + seed * 3.1)) * zell;
      vec2 d = p - c;
      float dl = length(d);
      float r = zell * (0.025 + 0.13 * pow(hash12(z + 7.0 + seed), 2.0));
      if (dl > r * 5.0) continue;
      float w = atan(d.y, d.x);
      vec2 ws = vec2(cos(w), sin(w));
      float beule = 0.16 * snoise(vec3(ws * 1.3, h * 17.0)) + 0.07 * snoise(vec3(ws * 3.5, h * 5.0));
      float rr = r * (1.0 + beule);
      float klecks = 1.0 - smoothstep(rr - 0.9, rr + 0.9, dl);
      // Satelliten: Tropfen auf Strahlen, nach außen gestreckt, kleiner mit dem Abstand
      float sat = 0.0;
      for (int k = 0; k < 14; k++) {
        float fk = float(k);
        float hk = hash11(h * 91.0 + fk * 7.13);
        float wk = hash11(h * 37.0 + fk * 3.7) * 6.2832;
        float ak = r * (1.15 + 2.8 * hk * hk);
        float sk = r * (0.17 - 0.038 * (ak / r)) * (0.6 + 0.6 * hash11(fk + h * 13.0));
        vec2 rk = vec2(cos(wk), sin(wk));
        vec2 dk = d - rk * ak;
        vec2 lok = vec2(dot(dk, rk) / (1.0 + 1.6 * hk), dot(dk, vec2(-rk.y, rk.x)));
        sat = max(sat, (1.0 - smoothstep(sk - 0.7, sk + 0.7, length(lok))) * step(0.35, sk));
      }
      // feiner Sprühnebel: Pünktchen, dichter nah am Klecks
      float nebel = step(1.0 - smoothstep(r * 4.5, r * 1.0, dl) * 0.1, hash12(floor(p / 1.6) + seed * 17.0 + h * 3.0));
      best = max(best, max(max(klecks, sat), nebel));
    }
  return best;
}
/** ein breiter trockener Pinselstrich (Bildpunkte): Deckung */
float pinsel(vec2 p, vec2 a, vec2 b, float breite, float seed) {
  vec2 ab = b - a;
  float t = clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0);
  vec2 q = p - a - ab * t;
  float quer = dot(q, normalize(vec2(-ab.y, ab.x)));
  float b0 = breite * (0.75 + 0.25 * sin(t * 3.14159)) * (1.0 + 0.15 * noise2(vec2(t * 9.0, seed)));
  float koerper = 1.0 - smoothstep(b0 * 0.85, b0, abs(quer));
  // Borsten: Streifen längs, zum Ende hin trockener
  float borste = noise2(vec2(quer * 0.35 + seed, t * 2.0)) * 0.7 + noise2(vec2(quer * 1.1 + seed * 2.0, t * 6.0)) * 0.3;
  float trocken = mix(0.25, 0.75, smoothstep(0.3, 1.0, t));
  return koerper * smoothstep(trocken - 0.08, trocken + 0.08, borste) * step(0.0, dot(p - a, ab)) * step(dot(p - a, ab), dot(ab, ab));
}
void main() {
  vec2 css = gl_FragCoord.xy / uDpr;
  vec2 anker = insBild(uMitte) * uAufl / uDpr;
  vec2 p = css - anker;
  GPunkt g = gLesen(vUv);
  float maske = deckungBei(vUv);
  vec3 L = ausSicht(normalize(vec3(-0.6, 0.6, 0.5)));
  // Grund: Papier, Lasuren in gedeckten Farben mit dunklerem Rand, ein roter Fleck, trockene Pinselstriche
  vec3 grund = vec3(0.95, 0.93, 0.88) * papier(css);
  float wl = fbm2(css * 0.0024 + 3.0);
  float lasur = smoothstep(0.02, 0.1, wl);
  float randL = smoothstep(0.02, 0.06, wl) * (1.0 - smoothstep(0.06, 0.16, wl));
  vec3 lasurF = mix(vec3(0.8, 0.66, 0.46), vec3(0.5, 0.64, 0.66), smoothstep(-0.25, 0.25, fbm2(css * 0.0013 + 9.0)));
  grund = pigment(grund, lasurF, lasur * 0.5 + randL * 0.35);
  // ein roter Fleck hinter der Form, rechts oben, am Rand dunkler
  vec2 pr = p - vec2(150.0, 110.0);
  vec2 pr2 = p - vec2(330.0, -40.0);
  float rf = exp(-dot(pr, pr) / 40000.0) + 0.7 * exp(-dot(pr2, pr2) / 15000.0) + 0.45 * fbm2(p * 0.0045 + 2.0) + 0.12 * fbm2(p * 0.02);
  float rot = smoothstep(0.5, 0.52, rf);
  float rotRand = smoothstep(0.5, 0.515, rf) * (1.0 - smoothstep(0.515, 0.6, rf));
  grund = pigment(grund, vec3(0.86, 0.22, 0.16), rot * 0.62 + rotRand * 0.38);
  float striche = max(pinsel(p, vec2(-560.0, -300.0), vec2(300.0, 40.0), 44.0, 1.0), pinsel(p, vec2(140.0, -330.0), vec2(520.0, -140.0), 26.0, 4.0) * 0.8);
  grund = pigment(grund, vec3(0.2, 0.2, 0.22), striche * 0.8);
  float k = spritzer(p, 1.0, 0.18);
  grund = mix(grund, vec3(0.03, 0.025, 0.03), k);
  // wenige Tupfer reiner Farbe
  vec3 tv = voronoi2(p / 300.0 + 7.0);
  float tupf = step(0.93, tv.z) * smoothstep(0.17, 0.13, tv.x + 0.05 * fbm2(p * 0.05));
  vec3 tupfFarbe = hash11(tv.z * 11.0) < 0.5 ? vec3(0.0, 0.72, 0.92) : vec3(1.0, 0.82, 0.1);
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
    // der rote Fleck läuft über die Form, dazu weiße Spritzer
    c = mix(c, vec3(0.7, 0.1, 0.08), rot * 0.35 * (1.0 - licht * 0.5));
    float ws = spritzer(p + 57.0, 4.0, 0.12);
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
  zeile: 'Kingpin: eine schwarze Masse aus Tusche, Schabkarton-Kratzer, Spritzer wie echte Tusche, Lasuren, ein roter Fleck, trockene Pinselstriche',
  regler: [],
  fragment: FRAGMENT,
  unruhig: () => false,
});
