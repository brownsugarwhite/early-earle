/**
 * Opal (Materialien; Florian: „Opal geht in eine gute richtung. Mach das noch fertig“). Ein schwarzer Opal:
 * - **Körper:** fast schwarz mit einem Hauch Blaugrau, darin eine milchige Wolke (Potch), am Rand heller, wie Licht im Stein.
 * - **Farbenspiel:** Körner aus geordneten Kieselkugeln. Jedes Korn ist ein Gitter mit eigenem Kugelabstand und eigener Ausrichtung
 *   und wirkt wie ein schmalbandiger Spiegel: Es zeigt genau eine Spektralfarbe (Bragg, λ = 2 · n · d · cos θ, θ zwischen Gitter und
 *   gebrochenem Blick) und so hell, wie das Studio aus seiner Spiegelrichtung leuchtet. Darum blitzen Körner auf, wenn ihre
 *   Spiegelrichtung eine Softbox trifft, und die Farbe rollt beim Drehen über das Korn (das Gitter ist im Korn verbogen).
 *   Kleine Kugeln (Blau, Grün) sind häufiger als große (Rot), wie in der Natur. Manche Körner tragen feine Streifen.
 * - **Tiefe:** drei Lagen Körner in verschiedener Tiefe, mit dem gebrochenen Blick gegeneinander verschoben (Parallaxe); dazwischen
 *   Gegenden ohne Farbe.
 * - **Politur:** eine glatte Kuppel, die das Studio scharf spiegelt (Fresnel), mit Spitzlichtern.
 * Die Gitter atmen sehr langsam, damit der Stein auch still lebt. Bühne: dunkler Samt mit einem Lichtkegel.
 */
import { bildVoreinstellung } from '../bildShader';

const FRAGMENT = /* glsl */ `
vec3 farbspiel(vec3 q, vec3 n, vec3 Vi, float zeit) {
  vec3 c = vec3(0.0);
  for (int s = 0; s < 3; s++) {
    float fs = float(s);
    // tiefere Lagen: mit dem gebrochenen Blick verschoben
    vec3 qs = q - Vi * (0.03 + 0.06 * fs);
    vec3 w = qs + 0.09 * vec3(snoise(qs * 2.4 + fs * 7.0), snoise(qs * 2.4 + 5.0 + fs * 7.0), snoise(qs * 2.4 + 9.0 + fs * 7.0));
    float massstab = (s == 0 ? 5.0 : (s == 1 ? 9.0 : 16.0)) * uR_korn;
    vec3 vo = voronoi3(w * massstab + fs * 13.0);
    float id = vo.z;
    vec3 zufall = hash33(vec3(id * 91.0, fs * 3.7, 3.0)) * 2.0 - 1.0;
    // das Gitter: bevorzugt mit der Oberfläche (die Farbschicht liegt im Stein), im Korn sanft verbogen, atmet langsam
    vec3 wb = w * 7.0 + id * 20.0;
    vec3 biegung = 0.26 * vec3(snoise(wb), snoise(wb + 3.0), snoise(wb + 6.0));
    vec3 atmen = 0.07 * vec3(sin(zeit * 0.21 + id * 9.0), cos(zeit * 0.17 + id * 7.0), sin(zeit * 0.13 + id * 5.0));
    vec3 gitter = normalize(n * 0.9 + zufall * 0.8 + biegung + atmen);
    // Kugelabstand (nm): kleine Kugeln sind häufiger
    float d = 166.0 + 96.0 * pow(hash11(id * 37.0 + fs), 1.4);
    float cosT = abs(dot(gitter, Vi));
    float lambda = 2.0 * 1.37 * d * cosT;
    float sichtbar = smoothstep(418.0, 452.0, lambda) * (1.0 - smoothstep(665.0, 715.0, lambda));
    // ein schmalbandiger Spiegel: so hell wie das Licht aus seiner Spiegelrichtung (gesättigt, damit Softboxen nicht ausbrennen)
    vec3 Lg = reflect(-Vi, gitter);
    float licht = 0.1 + 1.7 * (1.0 - exp(-luma(studio(Lg)) * 0.9));
    // Nähte zwischen den Körnern, feine Streifen in manchen
    float naht = smoothstep(0.0, 0.08, vo.y - vo.x);
    float streifen = mix(1.0, 0.45 + 0.55 * pow(0.5 + 0.5 * sin(dot(w, normalize(zufall.yzx + 0.01)) * massstab * 10.0), 2.0), step(0.62, hash11(id * 13.0)));
    float lage = s == 0 ? 1.0 : (s == 1 ? 0.72 : 0.5);
    c += max(spektral(lambda), vec3(0.0)) * sichtbar * licht * naht * streifen * lage;
  }
  return c;
}
void main() {
  vec2 css = gl_FragCoord.xy / uDpr;
  GPunkt g = gLesen(vUv);
  float maske = deckungBei(vUv);
  vec2 qb = gl_FragCoord.xy / uAufl;
  vec2 c0 = insBild(uMitte);
  float r = length((qb - c0) * vec2(uAufl.x / uAufl.y, 1.0));
  vec3 grund = mix(vec3(0.006, 0.006, 0.01), vec3(0.04, 0.035, 0.06), exp(-r * r / 0.1));
  grund *= 0.92 + 0.12 * noise2(css * vec2(0.8, 0.05));
  vec3 bild = grund;
  float a = uBuehne > 0.5 ? 1.0 : 0.0;
  if (g.a > 0.5) {
    vec3 V = zumAuge(g.p);
    vec3 n = g.n;
    vec3 q = (g.p - uMitte) / uRadius;
    float nv = clamp(dot(n, V), 0.0, 1.0);
    // Körper und Potch
    float wolke = smoothstep(0.1, 0.8, fbm3(q * 2.2 - V * 0.2));
    vec3 koerper = vec3(0.008, 0.011, 0.02) + vec3(0.018, 0.03, 0.05) * wolke + vec3(0.04, 0.07, 0.11) * pow(1.0 - nv, 2.4);
    // die Brechung an der Oberfläche lenkt den Blick in den Stein
    vec3 Vi = -refract(-V, n, 1.0 / 1.45);
    vec3 spiel = farbspiel(q, n, Vi, uZeit);
    // Gegenden ohne Farbe (Potch zwischen den Farbadern)
    float fuelle = smoothstep(-0.38, 0.22, fbm3n(q * 1.4 + 4.0, 3));
    vec3 c = koerper + spiel * (0.15 + 0.85 * fuelle) * (0.55 + 0.45 * nv) * uR_feuer;
    // Politur
    vec3 R = reflect(-V, n);
    float fr = fresnelS(nv, 0.05);
    c = c * (1.0 - fr) + studio(R) * fr * 0.9;
    vec3 L0 = ausSicht(normalize(vec3(-0.45, 0.7, 0.55)));
    c += vec3(1.0) * pow(max(dot(n, normalize(L0 + V)), 0.0), 400.0) * 5.0;
    bild = mix(bild, c, maske);
    a = max(a, maske);
  }
  vec3 aus = linZuSrgb(aces(bild * 1.25));
  farbe = vec4(aus * a, a);
}
`;

export const OPAL = bildVoreinstellung({
  id: 'opal',
  name: 'Opal',
  gruppe: 'Materialien',
  zeile: 'Schwarzer Opal: Körner als schmalbandige Spiegel nach Bragg, Farbe rollt über verbogene Gitter, drei Lagen Tiefe, Politur',
  regler: [
    { k: 'korn', name: 'Körnung', min: 0.3, max: 3, schritt: 0.05, grund: 1 },
    { k: 'feuer', name: 'Feuer', min: 0, max: 3, schritt: 0.05, grund: 1 },
  ],
  fragment: FRAGMENT,
});
