/**
 * Ukiyo-e (Anime & Manga, die Wurzel des Manga: japanischer Farbholzschnitt, Hokusai, Hiroshige). Jede Farbe ist ein eigener Stock:
 * flache Flächen in Preußischblau, Zinnober und Ocker auf Washi-Papier, mit der Maserung des Holzes darin; Bokashi, der weiche
 * Farbverlauf, den der Drucker mit dem Lappen auf den Stock wischte (hier am oberen Rand der Flächen); der schwarze Konturstock sitzt
 * ein wenig neben den Farben. Auf der Lichtseite ein Wellenschuppen-Muster (Seigaiha). Bühne: Himmel im Bokashi, rote Sonne, ein
 * Band aus Wellen, ein Titelfeld mit Schriftzeichen.
 */
import { bildVoreinstellung } from '../bildShader';

const FRAGMENT = /* glsl */ `
const vec3 WASHI = vec3(0.95, 0.91, 0.82);
const vec3 BLAU = vec3(0.12, 0.22, 0.42);
const vec3 ZINNOBER = vec3(0.86, 0.27, 0.15);
const vec3 OCKER = vec3(0.86, 0.68, 0.38);
float maserung(vec2 p) {
  float m = sin((p.y + 6.0 * fbm2(p * vec2(0.01, 0.002))) * 0.9);
  return smoothstep(0.85, 1.0, m) * 0.5 + 0.5 * smoothstep(0.6, 0.9, noise2(p * vec2(0.02, 0.4)));
}
float seigaiha(vec2 p, float s) {
  vec2 q = p / s;
  vec2 z = floor(q);
  float best = 0.0;
  for (int dy = 0; dy <= 1; dy++)
    for (int dx = -1; dx <= 1; dx++) {
      vec2 m = z + vec2(float(dx) + (mod(z.y + float(dy), 2.0)) * 0.5, float(dy));
      vec2 d = q - m;
      if (d.y < 0.0) continue;
      float r = length(d);
      float ring = 1.0 - smoothstep(0.05, 0.09, abs(fract(r * 3.0) - 0.5) * 2.0 - 0.6);
      best = r < 1.0 ? ring : best;
    }
  return best;
}
void main() {
  vec2 css = gl_FragCoord.xy / uDpr;
  GPunkt g = gLesen(vUv);
  float maske = deckungBei(vUv);
  vec2 qb = gl_FragCoord.xy / uAufl;
  float aspekt = uAufl.x / uAufl.y;
  vec3 washi = WASHI * papier(css * 0.8);
  // Himmel im Bokashi, rote Sonne, Wellenband, Titelfeld
  vec3 grund = mix(washi, mix(washi, BLAU, 0.85), smoothstep(0.55, 1.0, qb.y));
  vec2 sonne = vec2(0.78, 0.72);
  grund = mix(grund, ZINNOBER, 1.0 - smoothstep(0.075, 0.079, length((qb - sonne) * vec2(aspekt, 1.0))));
  float welle = step(qb.y, 0.2 + 0.03 * sin(qb.x * 30.0));
  grund = mix(grund, mix(BLAU, washi, seigaiha(css, 28.0) * 0.85), welle);
  vec2 kart = (qb - vec2(0.09, 0.62)) * vec2(aspekt, 1.0);
  float feld = step(abs(kart.x), 0.04) * step(abs(kart.y), 0.2);
  float zeichen = step(0.55, noise2(css * vec2(0.25, 0.12))) * step(abs(kart.x), 0.025) * step(abs(kart.y), 0.18);
  grund = mix(grund, mix(OCKER, washi, 0.2), feld);
  grund = mix(grund, vec3(0.1), zeichen * feld);
  grund *= 1.0 - 0.08 * maserung(css) * (1.0 - welle);
  vec3 bild = grund;
  float a = uBuehne > 0.5 ? 1.0 : 0.0;
  // Farbstöcke etwas versetzt gegen den Konturstock
  vec2 versatz = vec2(1.5, -1.0) * uDpr / uAufl;
  GPunkt gf = gLesen(vUv + versatz);
  float maskeF = deckungBei(vUv + versatz);
  if (gf.a > 0.5) {
    vec3 L = ausSicht(normalize(vec3(-0.5, 0.7, 0.5)));
    float v = dot(gf.n, L);
    vec3 basis = mix(ZINNOBER, BLAU, step(0.5, uR_farbe));
    vec3 c = v > 0.15 ? basis : mix(basis, BLAU, 0.55);
    // Bokashi: oben an der Fläche dunkler verlaufend (in der Welt nach oben)
    vec3 q = (gf.p - uMitte) / uRadius;
    c = mix(c, BLAU * 0.7, smoothstep(0.2, 0.95, q.y) * 0.65);
    // Seigaiha auf der Lichtseite
    float muster = seigaiha(css + gf.n.xy * 30.0, 18.0) * smoothstep(0.1, 0.4, v);
    c = mix(c, washi, muster * 0.6);
    c *= 1.0 - 0.1 * maserung(css + 50.0);
    bild = mix(bild, c, maskeF);
    a = max(a, maskeF);
  }
  float linie = kanteBei(vUv, (1.2 + 0.5 * noise2(css * 0.03)) * uDpr);
  bild = mix(bild, vec3(0.08, 0.07, 0.07), linie * 0.95);
  a = max(a, max(linie, maske));
  farbe = vec4(bild * a, a);
}
`;

export const UKIYOE = bildVoreinstellung({
  id: 'ukiyoe',
  name: 'Ukiyo-e',
  gruppe: 'Anime & Manga',
  zeile: 'Japanischer Farbholzschnitt: flache Stöcke auf Washi, Holzmaserung, Bokashi-Verlauf, versetzter Konturstock, Wellenschuppen',
  regler: [{ k: 'farbe', name: 'Blau / Zinnober', min: 0, max: 1, schritt: 1, grund: 0 }],
  fragment: FRAGMENT,
  unruhig: () => false,
});
