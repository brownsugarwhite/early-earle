/**
 * Glitch (Spider-Verse, die Anomalie): Wer in der falschen Welt ist, flackert zwischen den Looks (schon im ersten Film beim Collider;
 * eine Technik nennen die Quellen nicht).
 *
 * Hier: Die Form steht in einem klaren Toon-Look (Magenta, Violett, Nachtblau, Randlicht in Cyan). In Schüben reißt sie auf:
 * Streifen verrutschen waagerecht, die Farbkanäle trennen sich, Blöcke zerfallen zu groben Pixeln oder kehren sich um, und in einzelnen
 * Streifen blitzt die Form kurz in einer anderen Welt auf (Raster wie Miles, Fotokopie wie Hobie, Tinte wie Spot, Aquarell wie Gwen).
 * Dazwischen zittert sie nur leicht. Bühne: Nachtblau mit Zeilen und Datenrauschen.
 */
import { bildVoreinstellung } from '../bildShader';

const FRAGMENT = /* glsl */ `
vec3 toon(vec2 uv, out float m) {
  GPunkt g = gLesen(uv);
  m = deckungBei(uv);
  vec3 L = ausSicht(normalize(vec3(-0.5, 0.7, 0.5)));
  float v = dot(g.n, L);
  vec3 V = zumAuge(g.p);
  float fres = pow(1.0 - max(dot(g.n, V), 0.0), 3.0);
  vec3 c = v > 0.3 ? vec3(0.98, 0.26, 0.55) : (v > -0.2 ? vec3(0.5, 0.2, 0.78) : vec3(0.08, 0.06, 0.2));
  c = mix(c, vec3(0.2, 0.95, 1.0), smoothstep(0.35, 0.6, fres) * 0.9);
  return c;
}
/** eine andere Welt für einen Streifen */
vec3 andereWelt(int art, vec2 uv, vec2 px) {
  GPunkt g = gLesen(uv);
  float v = dot(g.n, ausSicht(normalize(vec3(-0.5, 0.7, 0.5))));
  if (art == 0) { // Miles: Rot mit Raster
    return mix(vec3(0.95, 0.15, 0.2), vec3(0.05), punkt(px, smoothstep(0.3, -0.5, v), radians(45.0), 6.0));
  }
  if (art == 1) { // Hobie: Fotokopie
    return vec3(step(0.5 + 0.2 * (noise2(px * 0.8) - 0.5), v * 0.5 + 0.5)) * 0.92;
  }
  if (art == 2) { // Spot: weiß mit Tinte
    vec3 vo = voronoi3((g.p - uMitte) / uRadius * 2.0);
    return mix(vec3(0.96), vec3(0.02), step(vo.x, 0.25));
  }
  // Gwen: Pastell
  return mix(vec3(0.98, 0.8, 0.88), vec3(0.45, 0.8, 0.88), smoothstep(-0.3, 0.6, v + 0.3 * fbm2(px * 0.02)));
}

void main() {
  vec2 px = gl_FragCoord.xy;
  vec2 cssPx = px / uDpr;
  float t = uZeit;
  float bild24 = floor(t * 24.0);
  // Schübe: einige Zehntelsekunden stark, dazwischen leicht
  float slot = floor(t * 2.6);
  float schub = step(0.55, hash11(slot * 1.31)) * smoothstep(0.0, 0.05, fract(t * 2.6)) * (1.0 - smoothstep(0.35 + 0.4 * hash11(slot), 1.0, fract(t * 2.6)));
  float k = (0.12 + 0.88 * schub) * uR_staerke;
  // Streifen verrutschen
  float hoehe = mix(3.0, 46.0, hash11(bild24 * 0.7 + 3.0));
  float streifen = floor(cssPx.y / hoehe + hash11(bild24));
  float r1 = hash12(vec2(streifen, bild24));
  float rutsch = (hash12(vec2(streifen * 3.1, bild24 + 9.0)) - 0.5) * 90.0 * k * step(0.68, r1);
  vec2 uv = vUv + vec2(rutsch * uDpr / uAufl.x, 0.0);
  // Blöcke: grobe Pixel
  vec2 blockGr = vec2(48.0, 24.0) * uDpr;
  vec2 block = floor(px / blockGr);
  float rb = hash12(block + bild24 * 0.37);
  bool grob = rb > 1.0 - 0.18 * k;
  if (grob) uv = (floor(uv * uAufl / (7.0 * uDpr)) + 0.5) * 7.0 * uDpr / uAufl;
  // Kanäle getrennt
  vec2 kanal = vec2(5.0 + 22.0 * k * hash11(streifen + bild24), 1.5 * (hash11(bild24) - 0.5)) * uDpr / uAufl;
  float mR, mG, mB;
  vec3 cR = toon(uv + kanal, mR), cG = toon(uv, mG), cB = toon(uv - kanal, mB);
  vec3 c = vec3(cR.r * mR, cG.g * mG, cB.b * mB);
  float m = max(mR, max(mG, mB));
  // eine andere Welt blitzt in einem Streifen auf
  if (r1 > 1.0 - 0.22 * k * k) {
    int art = int(floor(hash11(streifen * 7.0 + bild24) * 4.0));
    c = andereWelt(art, uv, cssPx) * mG;
  }
  if (grob && rb > 1.0 - 0.06 * k) c = (1.0 - c) * m;
  // Zeilen
  c *= 0.9 + 0.1 * step(0.5, fract(cssPx.y / 3.0));
  // Datenrauschen neben der Form
  float weich = texture(tWeich, vUv).r;
  float daten = step(0.985 - 0.04 * k, hash12(floor(cssPx / vec2(9.0, 3.0)) + bild24)) * smoothstep(0.05, 0.4, weich) * (1.0 - m);
  vec3 datenFarbe = hash11(floor(cssPx.x / 9.0) + bild24) > 0.5 ? vec3(0.2, 0.95, 1.0) : vec3(1.0, 0.25, 0.6);
  float a;
  vec3 aus;
  if (uBuehne > 0.5) {
    vec3 grund = mix(vec3(0.03, 0.04, 0.1), vec3(0.08, 0.06, 0.2), gl_FragCoord.y / uAufl.y);
    float raster = max(step(0.97, fract(cssPx.x / 40.0)), step(0.97, fract(cssPx.y / 40.0))) * 0.05;
    grund += vec3(0.2, 0.5, 1.0) * raster;
    grund *= 0.85 + 0.15 * step(0.5, fract(cssPx.y / 3.0));
    aus = mix(grund, c, m);
    aus = mix(aus, datenFarbe, daten);
    a = 1.0;
  } else {
    aus = c;
    a = max(m, daten);
    aus = mix(aus, datenFarbe, daten);
  }
  farbe = vec4(aus * a, a);
}
`;

export const GLITCH = bildVoreinstellung({
  id: 'glitch',
  name: 'Glitch',
  gruppe: 'Spider-Verse',
  zeile: 'Die Anomalie: Streifen verrutschen, Farbkanäle reißen, Blöcke zerfallen, kurz blitzen andere Welten auf',
  regler: [{ k: 'staerke', name: 'Stärke', min: 0, max: 2, schritt: 0.05, grund: 1 }],
  fragment: FRAGMENT,
  weich: { skala: 0.25, radius: 10 },
});
