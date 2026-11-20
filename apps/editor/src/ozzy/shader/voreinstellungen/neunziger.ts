/**
 * Neunziger (Spider-Verse, Scarlet Spider / Ben Reilly, in „Across“ im Stil der Image-Comics der Neunziger). Aus der Recherche: Die
 * Schraffur folgt der Wölbung der Muskeln und reagiert auf Licht und Verformung. Hier: Airbrush-Verlauf der frühen Computerkolorierung
 * (Purpur in Rot in Glutorange), tiefschwarze Schattenmassen mit gefiederten Rändern, Schraffur in Bündeln, die sich mit der Form biegen
 * und im Schatten dichter werden, ein Glanz mit Sternfunkeln, eine Kontur mit Federstrichen. Bühne: ein Splash-Page-Hintergrund aus
 * Aktionslinien im Verlauf.
 */
import { bildVoreinstellung } from '../bildShader';

const FRAGMENT = /* glsl */ `
void main() {
  vec2 css = gl_FragCoord.xy / uDpr;
  float t8 = schritt(8.0);
  GPunkt g = gLesen(vUv);
  float maske = deckungBei(vUv);
  vec3 L = ausSicht(normalize(vec3(-0.35, 0.75, 0.55)));
  // Grund: Aktionslinien aus der Mitte, Verlauf in Orange und Purpur
  vec2 qb = gl_FragCoord.xy / uAufl;
  vec2 c0 = insBild(uMitte);
  vec2 d = (qb - c0) * vec2(uAufl.x / uAufl.y, 1.0);
  float w = atan(d.y, d.x);
  float strahl = smoothstep(0.55, 0.9, noise2(vec2(w * 40.0, 0.0) + t8 * 0.0));
  vec3 grund = mix(vec3(1.0, 0.72, 0.18), vec3(0.45, 0.06, 0.38), smoothstep(0.0, 0.9, length(d)));
  grund = mix(grund, vec3(1.0, 0.95, 0.75), strahl * 0.5 * smoothstep(0.1, 0.5, length(d)));
  vec3 bild = grund;
  float a = uBuehne > 0.5 ? 1.0 : 0.0;
  if (g.a > 0.5) {
    float v = dot(g.n, L);
    vec3 V = zumAuge(g.p);
    // Airbrush: weicher Verlauf über drei Farben
    float s = clamp(v * 0.5 + 0.5, 0.0, 1.0);
    vec3 c = mix(vec3(0.32, 0.03, 0.2), vec3(0.85, 0.08, 0.16), smoothstep(0.15, 0.55, s));
    c = mix(c, vec3(1.0, 0.55, 0.25), smoothstep(0.6, 0.95, s));
    // Glanz mit Sternfunkeln
    float spec = pow(max(dot(g.n, normalize(L + V)), 0.0), 60.0);
    c = mix(c, vec3(1.0), smoothstep(0.35, 0.8, spec));
    // Schraffur in Bündeln, mit der Form gebogen; im Schatten dichter
    vec2 nb = (uView * vec4(g.n, 0.0)).xy;
    float winkel = 0.9 + 1.4 * noise2(css * 0.006 + 3.0) + nb.x * 0.8;
    vec2 biege = nb * 14.0;
    float dunkel = smoothstep(0.7, -0.1, v);
    float bund = smoothstep(0.3, 0.6, noise2(css * 0.02 + 9.0));
    float h1 = schraffur(css + biege, dunkel * 0.85 * (0.55 + 0.45 * bund), winkel, 2.6);
    float h2 = schraffur(css - biege, smoothstep(0.3, 0.85, dunkel) * 0.7, winkel + 1.2, 3.0);
    float h3 = schraffur(css + biege * 0.5, smoothstep(0.55, 1.0, dunkel) * 0.6, winkel - 0.7, 2.4);
    // tiefe Schwarzmassen mit gefiedertem Rand
    float masse = smoothstep(0.02, -0.12, v + 0.12 * (noise2(css * 0.15) - 0.5));
    float tusche = max(max(max(h1, h2), h3), masse);
    c = mix(c, vec3(0.02, 0.0, 0.03), tusche);
    // Sternfunkeln auf dem Glanz
    vec2 sf = (fract(css / 90.0) - 0.5) * 90.0;
    float stern = smoothstep(0.85, 1.0, spec) * (exp(-abs(sf.x) * 0.9) * exp(-abs(sf.y) * 0.08) + exp(-abs(sf.y) * 0.9) * exp(-abs(sf.x) * 0.08));
    c += vec3(1.0, 0.95, 0.8) * stern * 0.0;
    bild = mix(bild, c, maske);
    a = max(a, maske);
  }
  // Kontur: kräftig, mit Federstrichen nach innen
  float linie = kanteBei(vUv, 1.6 * uDpr);
  float feder = kanteBei(vUv, 5.0 * uDpr) * schraffur(css, 0.35, radians(60.0), 3.0) * maske;
  bild = mix(bild, vec3(0.02, 0.0, 0.03), max(linie, feder * 0.8));
  a = max(a, linie);
  farbe = vec4(clamp(bild, 0.0, 1.0) * a, a);
}
`;

export const NEUNZIGER = bildVoreinstellung({
  id: 'neunziger',
  name: 'Neunziger',
  gruppe: 'Spider-Verse',
  zeile: 'Scarlet Spider: Image-Comics der Neunziger, Airbrush-Verlauf, Schraffur entlang der Wölbung, Schwarzmassen, Aktionslinien',
  regler: [],
  fragment: FRAGMENT,
  unruhig: () => false,
});
