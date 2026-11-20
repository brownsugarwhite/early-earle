/**
 * Manga (Anime & Manga): Schwarz und Weiß wie gedruckter Manga. Rasterfolie (Screentone) im Halbschatten, eine Verlaufsfolie am
 * Übergang (die Punkte werden zum Licht hin kleiner), tiefe Schatten als Schwarzfläche („Beta“), weiße Lichter mit kleinen Glanzstrichen,
 * eine Pinselkontur, die an- und abschwillt. Bühne: Konzentrationslinien, die zur Form zeigen (集中線), und ein Verlauf aus Rasterpunkten.
 */
import { bildVoreinstellung } from '../bildShader';

const FRAGMENT = /* glsl */ `
void main() {
  vec2 css = gl_FragCoord.xy / uDpr;
  GPunkt g = gLesen(vUv);
  float maske = deckungBei(vUv);
  vec2 qb = gl_FragCoord.xy / uAufl;
  vec2 c0 = insBild(uMitte);
  vec2 d = (qb - c0) * vec2(uAufl.x / uAufl.y, 1.0);
  float w = atan(d.y, d.x);
  // Konzentrationslinien: dünne Keile, innen frei
  float strahl = smoothstep(0.62, 0.7, noise2(vec2(w * 70.0, 0.5))) * smoothstep(0.22, 0.5, length(d));
  float strahl2 = smoothstep(0.75, 0.8, noise2(vec2(w * 140.0, 3.5))) * smoothstep(0.3, 0.6, length(d));
  float verlauf = punkt(css, smoothstep(0.35, 1.1, length(d)) * 0.35, radians(45.0), 4.5);
  vec3 bild = vec3(0.985);
  bild = mix(bild, vec3(0.05), max(max(strahl, strahl2) * 0.9, verlauf));
  float a = uBuehne > 0.5 ? 1.0 : 0.0;
  if (g.a > 0.5) {
    vec3 L = ausSicht(normalize(vec3(-0.5, 0.7, 0.5)));
    vec3 V = zumAuge(g.p);
    float v = dot(g.n, L);
    // Raster im Halbschatten, Verlaufsraster am Übergang, Schwarz im Kern
    float halb = smoothstep(0.3, 0.12, v);
    float uebergang = smoothstep(0.55, 0.3, v) * (1.0 - halb);
    float ton = punkt(css, 0.32 * halb, radians(45.0), 4.0);
    float verlaufTon = punkt(css, 0.28 * uebergang, radians(45.0), 4.0);
    float beta = smoothstep(-0.28, -0.32, v + 0.05 * (noise2(css * 0.08) - 0.5));
    float tinte = max(max(ton, verlaufTon), beta);
    vec3 c = vec3(0.985 - 0.95 * tinte);
    // weiße Glanzstriche im Licht
    float spec = pow(max(dot(g.n, normalize(L + V)), 0.0), 50.0);
    vec2 sq = drehung(radians(-35.0)) * css;
    float striche = step(0.7, spec) * step(0.5, fract(sq.y / 4.0));
    c = mix(c, vec3(1.0), striche);
    bild = mix(bild, c, maske);
    a = max(a, maske);
  }
  // Pinselkontur: schwillt an und ab
  float breite = (0.7 + 1.3 * noise2(css * 0.015)) * 1.3 * uDpr;
  float linie = kanteBei(vUv, breite);
  bild = mix(bild, vec3(0.03), linie);
  a = max(a, linie);
  farbe = vec4(bild * a, a);
}
`;

export const MANGA = bildVoreinstellung({
  id: 'manga',
  name: 'Manga',
  gruppe: 'Anime & Manga',
  zeile: 'Gedruckter Manga: Rasterfolie, Verlaufsraster, Schwarzflächen, weiße Glanzstriche, Pinselkontur, Konzentrationslinien',
  regler: [],
  fragment: FRAGMENT,
  unruhig: () => false,
});
