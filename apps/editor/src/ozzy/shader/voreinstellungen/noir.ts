/**
 * Noir (Spider-Verse, Earth-90214, Spider-Man Noir): Schwarz und Weiß wie ein Film der Vierziger, nur Tinte und Licht. Ein hartes
 * Führungslicht von rechts oben schneidet die Form in Weiß und tiefes Schwarz; dazwischen ein schmaler Streifen Kreuzschraffur. Das
 * Licht fällt durch eine Jalousie (Streifen auf Form und Wand, in der Welt verankert, damit sie über die Wölbung laufen), ein kaltes
 * Randlicht trennt die Schattenseite vom Grund. Regen fällt schräg, Filmkorn flackert, Rauch zieht durch das Licht, ab und zu ein Blitz.
 */
import { bildVoreinstellung } from '../bildShader';

const FRAGMENT = /* glsl */ `
float jalousie(vec3 p, vec3 L) {
  // die Streifen liegen in der Welt: Ebenen quer zum Licht
  vec3 q = (p - uMitte) / uRadius;
  vec3 achse = normalize(vec3(0.0, 1.0, 0.0) - L * dot(vec3(0.0, 1.0, 0.0), L));
  float s = dot(q, achse) * 5.5 * uR_jalousie + 0.15 * dot(q, L);
  float f = fract(s);
  return smoothstep(0.0, 0.03, f - 0.36) * (1.0 - smoothstep(0.0, 0.03, f - 0.97));
}
float regen(vec2 css, float t) {
  vec2 q = drehung(radians(-14.0)) * css;
  float spalte = floor(q.x / 7.0);
  float h = hash11(spalte * 3.7);
  float y = q.y / 70.0 + t * (8.0 + 6.0 * h) + h * 50.0;
  float tropf = smoothstep(0.92, 0.985, fract(y)) * step(0.55, h);
  float breite = 1.0 - smoothstep(0.0, 0.6, abs(fract(q.x / 7.0) - 0.5) * 7.0 - 0.2);
  return tropf * breite;
}
void main() {
  vec2 css = gl_FragCoord.xy / uDpr;
  float t = uZeit;
  float t12 = schritt(12.0);
  GPunkt g = gLesen(vUv);
  float maske = deckungBei(vUv);
  vec3 L = ausSicht(normalize(vec3(0.72, 0.55, 0.42)));
  float blitz = step(0.985, hash11(floor(t * 6.0))) * (0.6 + 0.4 * hash11(floor(t * 24.0)));
  // Grund: Wand im Dunkel, Jalousie-Licht, Rauch
  vec2 qb = gl_FragCoord.xy / uAufl;
  vec2 sp = drehung(radians(18.0)) * (css * vec2(1.0, 1.0)) / (uAufl.y / uDpr);
  float wandStreifen = smoothstep(0.0, 0.004, fract(sp.y * 7.0) - 0.4) * (1.0 - smoothstep(0.0, 0.004, fract(sp.y * 7.0) - 0.96));
  float lichtkegel = smoothstep(0.85, 0.1, length((qb - vec2(0.62, 0.62)) * vec2(1.4, 1.0)));
  float rauch = fbm2(css * 0.004 + vec2(t * 0.03, t * 0.01));
  vec3 grund = vec3(0.03) + vec3(0.62) * wandStreifen * lichtkegel * (0.6 + 0.5 * rauch);
  grund += vec3(0.08) * smoothstep(0.45, 0.85, rauch) * lichtkegel;
  // Schatten der Form auf der Wand (versetzt, weich)
  float schatten = texture(tWeich, vUv + vec2(-0.05, -0.02)).r;
  grund *= 1.0 - 0.85 * schatten;
  vec3 bild = grund;
  float a = uBuehne > 0.5 ? 1.0 : 0.0;
  if (g.a > 0.5) {
    float v = dot(g.n, L);
    float hell = smoothstep(-0.015, 0.015, v - 0.1) * jalousie(g.p, L);
    // Kreuzschraffur am Übergang
    float uebergang = smoothstep(0.32, 0.08, abs(v - 0.06)) * (1.0 - hell);
    vec2 j = (hash22(vec2(t12, 3.0)) - 0.5) * 1.5;
    float h1 = schraffur(css + j, uebergang * 0.5, radians(45.0), 3.6);
    float h2 = schraffur(css - j, uebergang * 0.42, radians(-45.0), 4.0);
    float grau = max(h1, h2);
    // kaltes Randlicht von hinten links
    vec3 V = zumAuge(g.p);
    float rand = smoothstep(0.62, 0.8, 1.0 - max(dot(g.n, V), 0.0)) * smoothstep(-0.1, 0.4, dot(g.n, ausSicht(normalize(vec3(-0.9, 0.2, -0.4)))));
    float wert = max(hell, max(grau * 0.9, rand * 0.95));
    vec3 form = vec3(wert) * vec3(1.0, 0.98, 0.94);
    bild = mix(bild, form, maske);
    a = max(a, maske);
  }
  // Tusche: kräftige Kontur, auf Zweiern
  vec2 z = (vec2(noise2(css * 0.03 + t12 * 2.0), noise2(css * 0.03 + 7.0 + t12 * 2.0)) - 0.5) * 1.5 * uDpr;
  float linie = kanteBei(vUv + z / uAufl, (1.1 + 0.6 * noise2(css * 0.02)) * uDpr);
  bild = mix(bild, vec3(0.0), linie);
  a = max(a, linie);
  // Regen, Korn, Blitz, Vignette
  float r = regen(css, t) * uR_regen;
  bild = mix(bild, vec3(0.85), r * 0.5 * (0.4 + 0.6 * lichtkegel));
  bild += (hash12(css + floor(t * 24.0) * 17.0) - 0.5) * 0.09;
  bild += vec3(blitz * 0.35) * (1.0 - maske * 0.5);
  if (uBuehne > 0.5) bild *= 1.0 - 0.55 * dot(qb - 0.5, qb - 0.5) * 2.5;
  float aus = clamp(luma(bild), 0.0, 1.0);
  vec3 c = vec3(aus) * vec3(1.0, 0.99, 0.97);
  if (uBuehne < 0.5) a = max(a, r * 0.6);
  farbe = vec4(c * a, a);
}
`;

export const NOIR = bildVoreinstellung({
  id: 'noir',
  name: 'Noir',
  gruppe: 'Spider-Verse',
  zeile: 'Earth-90214 (Spider-Man Noir): Schwarz und Weiß, Jalousie-Licht über der Form, Kreuzschraffur, Randlicht, Regen, Korn, Blitze',
  regler: [
    { k: 'jalousie', name: 'Jalousie', min: 0.3, max: 3, schritt: 0.05, grund: 1 },
    { k: 'regen', name: 'Regen', min: 0, max: 2, schritt: 0.05, grund: 1 },
  ],
  fragment: FRAGMENT,
  weich: { skala: 0.25, radius: 10 },
});
