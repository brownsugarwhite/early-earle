/**
 * Marker 2099 (Spider-Verse, Nueva York, Earth-928, Miguel O'Hara). Aus der Recherche: nach Syd Mead, „weniger Pinselstrich, mehr
 * Marker“: Markertinte ist durchsichtig, Überlagerungen werden dunkler, nur wenige Schichten, kontrollierte Strichlage; weiße
 * Glanzlichter gemalt; oben die helle, saubere Stadt, unten die dunkle Neon-Unterwelt; aus der Nähe mesoamerikanische Muster.
 *
 * Hier: Die Form spiegelt einen Syd-Mead-Himmel (Indigo, Magenta, glühender Horizont, dunkler Boden: der „Chrom-Horizont“ der
 * Autozeichnungen). Darüber liegen drei Lagen Marker in schrägen Strichen, jede nur dort, wo es dunkler sein muss, durchsichtig
 * übereinander; an den Enden der Striche sammelt sich Tinte. Weiße Gouache-Lichter, eine feine Fineliner-Kontur, im Schatten glimmt
 * ein rotes Stufenmuster (der Anzug von Miguel). Bühne: Sonnenuntergang über 2099, in Markerstrichen.
 */
import { bildVoreinstellung } from '../bildShader';

const FRAGMENT = /* glsl */ `
const vec3 INDIGO = vec3(0.13, 0.14, 0.36);
const vec3 MAGENTA = vec3(0.7, 0.3, 0.56);
const vec3 HORIZONT = vec3(1.0, 0.64, 0.33);
const vec3 BODEN = vec3(0.08, 0.075, 0.1);
const vec3 NEON = vec3(1.0, 0.12, 0.2);

vec3 himmel(vec3 r) {
  float y = r.y;
  vec3 oben = mix(HORIZONT, MAGENTA, smoothstep(0.0, 0.22, y));
  oben = mix(oben, INDIGO, smoothstep(0.18, 0.75, y));
  vec3 unten = mix(vec3(0.35, 0.22, 0.25), BODEN, smoothstep(-0.02, -0.35, y));
  vec3 c = y > 0.0 ? oben : unten;
  c += vec3(1.0, 0.85, 0.65) * exp(-pow(y * 34.0, 2.0)) * 0.9;
  return c;
}

/** eine Lage Marker: schräge Striche mit Lücken, an den Enden mehr Tinte; Rückgabe: (Deckung, Tintensee) */
vec2 markerLage(vec2 p, float winkel, float breite, float seed) {
  vec2 q = drehung(winkel) * p;
  float reihe = floor(q.y / breite);
  float inReihe = fract(q.y / breite);
  float laenge = 380.0 + 420.0 * hash11(reihe * 1.7 + seed);
  float s = (q.x + hash11(reihe * 3.3 + seed) * 900.0) / laenge;
  float f = fract(s);
  // lange Striche, die Reihen überlappen leicht (dort wird es dunkler, wie Marker auf Marker)
  float an = smoothstep(0.02, 0.05, f) * (1.0 - smoothstep(0.95, 0.985, f));
  float kante = smoothstep(-0.08, 0.02, inReihe - 0.03 * noise2(q * 0.25)) * (1.0 - smoothstep(0.98, 1.08, inReihe + 0.03 * noise2(q * 0.25 + 9.0)));
  an *= max(kante, 0.0);
  float see = an * (smoothstep(0.09, 0.05, f) + smoothstep(0.93, 0.97, f));
  return vec2(an, see);
}

/** Stufen- und Leiterbahnmuster (dreiseitig auf die Form gelegt) */
float muster(vec3 q, vec3 n) {
  vec3 a = abs(n);
  vec2 uv = a.x > a.y && a.x > a.z ? q.yz : (a.y > a.z ? q.xz : q.xy);
  vec2 z = uv * 4.5;
  vec2 c = floor(z), f = fract(z);
  float r = hash12(c);
  float w = 0.07;
  float linie = r < 0.5 ? step(abs(f.x - 0.5), w) : step(abs(f.y - 0.5), w);
  float stufe = step(0.8, r) * step(abs(max(abs(f.x - 0.5), abs(f.y - 0.5)) - 0.28), w);
  return max(linie, stufe);
}

void main() {
  vec2 cssPx = gl_FragCoord.xy / uDpr;
  GPunkt g = gLesen(vUv);
  float maske = deckungBei(vUv);
  vec3 V = zumAuge(g.p);
  vec3 R = reflect(-V, g.n);
  vec3 env = himmel(R);
  vec3 L = ausSicht(normalize(vec3(-0.35, 0.8, 0.5)));
  float diff = dot(g.n, L) * 0.5 + 0.5;
  // Grundton der Form: Spiegelung, kühl gebrochen
  vec3 grundton = mix(env, vec3(0.62, 0.66, 0.78) * diff, 0.42);
  float wert = luma(grundton);
  // drei Lagen Marker auf weißem Markerpapier
  vec3 bild = vec3(0.985, 0.982, 0.975);
  vec3 tinte1 = mix(vec3(0.78, 0.82, 0.92), grundton * 1.15, 0.5);
  vec3 tinte2 = vec3(0.58, 0.6, 0.74);
  vec3 tinte3 = vec3(0.3, 0.3, 0.42);
  vec2 m1 = markerLage(cssPx, radians(-22.0), 22.0, 1.0);
  vec2 m2 = markerLage(cssPx + 37.0, radians(-21.0), 30.0, 2.0);
  vec2 m3 = markerLage(cssPx + 71.0, radians(-23.0), 24.0, 3.0);
  float n1 = smoothstep(0.95, 0.8, wert), n2 = smoothstep(0.6, 0.48, wert), n3 = smoothstep(0.33, 0.24, wert);
  bild *= mix(vec3(1.0), tinte1, 0.85 * n1 * maske);
  bild *= mix(vec3(1.0), tinte2, (m2.x * n2 + 0.25 * m2.y * n2) * maske);
  bild *= mix(vec3(1.0), tinte3, (m3.x * n3 + 0.3 * m3.y * n3) * maske);
  // der Horizont in der Spiegelung: ein warmer Markerstrich
  float horizont = exp(-pow(R.y * 9.0, 2.0)) * maske;
  bild = mix(bild, bild * HORIZONT * 1.2, horizont * 0.7);
  // Gouache: weiße, deckende Lichter, kurz gestrichen
  vec3 H = normalize(L + V);
  float glanz = pow(max(dot(g.n, H), 0.0), 70.0);
  vec2 gq = drehung(radians(-22.0)) * cssPx;
  float strich = step(0.35, noise2(vec2(gq.x * 0.08, floor(gq.y / 3.0))));
  bild = mix(bild, vec3(1.0), smoothstep(0.25, 0.6, glanz) * mix(1.0, strich, 0.6) * maske);
  // Neon im Schatten: das Stufenmuster glimmt rot
  float neon = muster((g.p - uMitte) / uRadius, g.n) * smoothstep(0.3, 0.12, wert) * maske * uR_neon * 0.8;
  bild = mix(bild, NEON, neon * 0.85);
  // Fineliner
  float linie = kanteBei(vUv, 0.75 * uDpr);
  vec3 aus;
  float a;
  if (uBuehne > 0.5) {
    vec2 q = gl_FragCoord.xy / uAufl;
    vec3 sicht = normalize(vec3((q.x - 0.5) * 0.6, (q.y - 0.42) * 0.9, 1.0));
    vec3 hg = himmel(sicht);
    // Markerstreifen im Himmel
    vec2 hm = markerLage(cssPx * vec2(1.0, 1.0), radians(-4.0), 14.0, 7.0);
    hg *= mix(vec3(1.0), vec3(0.9, 0.86, 0.95), hm.x * 0.35);
    // Neon der Unterwelt, unten am Rand
    hg += NEON * exp(-q.y * 9.0) * 0.18 * (0.6 + 0.4 * noise2(vec2(cssPx.x * 0.02, 0.0)));
    // Schatten der Form auf dem Grund (weich)
    float sch = texture(tWeich, vUv + vec2(0.012, 0.02)).r;
    hg *= 1.0 - 0.18 * sch;
    aus = mix(hg, bild, maske);
    a = 1.0;
  } else {
    aus = bild;
    a = max(maske, linie);
  }
  aus = mix(aus, vec3(0.08, 0.08, 0.12), linie);
  farbe = vec4(aus * a, a);
}
`;

export const MARKER = bildVoreinstellung({
  id: 'marker',
  name: 'Marker 2099',
  gruppe: 'Spider-Verse',
  zeile: 'Nueva York 2099 (Miguel): Syd-Mead-Marker in durchsichtigen Lagen, Chrom-Horizont, Gouache-Lichter, rotes Neon im Schatten',
  regler: [{ k: 'neon', name: 'Neon', min: 0, max: 1.5, schritt: 0.05, grund: 1 }],
  fragment: FRAGMENT,
  weich: { skala: 0.25, radius: 14 },
  unruhig: () => false,
});
