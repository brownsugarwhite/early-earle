/**
 * Punk-Collage (Spider-Verse, Earth-138, Hobie Brown). Aus der Recherche: jeder Teil steppt in seinem eigenen Takt (Jacke auf Vierern,
 * Körper auf Dreiern, Gitarre noch langsamer, auch Sechser), Renderings mit den Spuren von Druck und Fotokopie alter Punk-Poster,
 * eine Collage aus Schichten.
 *
 * Hier: Die Form ist aus ausgerissenen Papierstücken geklebt (Zellen an der Form verankert, mit weißem, faserigem Rissrand und einem
 * Schatten auf dem Stück darunter). Jedes Stück ist ein anderes Papier: Fotokopie (hartes Schwarzweiß mit Toner), Rot mit grobem Raster,
 * Blau, Zeitung mit Text, Schwarz mit pinken Streifen. Jedes Stück zittert in seinem Takt (8, 6 oder 4 Bilder je Sekunde), der
 * Edding-Umriss auf Vierern. Bühne: Kopierer-Grau mit Streifen und Zeitungsfetzen.
 */
import { bildVoreinstellung } from '../bildShader';

const FRAGMENT = /* glsl */ `
const vec3 ROT = vec3(0.88, 0.09, 0.14);
const vec3 BLAU = vec3(0.1, 0.25, 0.75);
const vec3 SCHWARZ = vec3(0.06, 0.055, 0.06);
const vec3 PINK = vec3(1.0, 0.3, 0.62);
const vec3 ZEITUNG = vec3(0.91, 0.89, 0.83);
const vec3 WEISS = vec3(0.97, 0.96, 0.93);

/** Zeitungstext: Zeilen aus „Wörtern“ (Striche mit Lücken) */
float text(vec2 p, float seed) {
  vec2 q = drehung(seed * 6.28) * p;
  float zeile = floor(q.y / 6.0);
  float inZeile = fract(q.y / 6.0);
  float wort = step(0.38, noise2(vec2(q.x * 0.22 + seed * 50.0, zeile * 7.3)));
  float buchstabe = step(0.3, noise2(vec2(q.x * 1.3, zeile * 3.1 + seed)));
  return wort * buchstabe * step(0.2, inZeile) * step(inZeile, 0.62);
}

/** ein Stück Papier: Farbe nach seiner Art, mit dem Licht als Fotokopie oder Raster */
vec3 stueck(float art, float v, vec2 p, float seed) {
  float xerox = step(0.5 + 0.22 * (noise2(p * 0.7) - 0.5), v * 0.5 + 0.5);
  float toner = step(0.93, hash12(floor(p * 1.2) + seed));
  float schatten = smoothstep(0.15, -0.55, v);
  float raster = punkt(p, schatten * 0.75, radians(45.0), 6.5);
  if (art < 0.2) return mix(SCHWARZ, WEISS, xerox) * (1.0 - toner * 0.7);
  if (art < 0.42) return mix(ROT, SCHWARZ, raster);
  if (art < 0.6) return mix(BLAU, SCHWARZ, raster * 0.9);
  if (art < 0.8) return mix(ZEITUNG * (0.92 + 0.08 * noise2(p * 0.4)), vec3(0.18), max(text(p, seed) * 0.85, raster));
  float streifen = step(0.62, fract((p.x + p.y) * 0.06 + seed));
  return mix(mix(SCHWARZ, PINK, streifen), SCHWARZ, schatten * 0.5);
}

void main() {
  vec2 cssPx = gl_FragCoord.xy / uDpr;
  GPunkt g = gLesen(vUv);
  float maske = deckungBei(vUv);
  vec3 L = ausSicht(normalize(vec3(-0.5, 0.7, 0.5)));
  float v = dot(g.n, L);
  // Stücke, an der Form verankert
  vec3 q = (g.p - uMitte) / uRadius * 2.0 * uR_stuecke;
  vec3 vo = voronoi3(q);
  float id = vo.z;
  // jedes Stück in seinem Takt: Dreier, Vierer, Sechser
  float takt = id < 0.34 ? 8.0 : (id < 0.67 ? 6.0 : 4.0);
  float ts = floor(uZeit * takt * uR_takt) ;
  vec2 zittern = (hash22(vec2(id * 91.7, ts)) - 0.5) * 3.5;
  vec2 p = cssPx + zittern;
  float art = hash11(id * 17.3 + 0.1);
  vec3 farbeStueck = stueck(art, v, p, id);
  // Rissrand: weiß und faserig; darunter ein Schatten aufs nächste Stück
  float faser = fbm2(cssPx * 0.45 + id * 30.0) - 0.5;
  float kante = vo.y - vo.x + faser * 0.05;
  float weissRand = 1.0 - smoothstep(0.018, 0.045, kante);
  float schattenRand = (1.0 - smoothstep(0.045, 0.1, kante)) * (1.0 - weissRand);
  vec3 bild = farbeStueck * (1.0 - 0.45 * schattenRand);
  bild = mix(bild, WEISS * (0.93 + 0.07 * noise2(cssPx * 0.8)), weissRand);
  // Edding-Umriss auf Vierern, zwei Striche
  float t6 = floor(uZeit * 6.0 * uR_takt);
  vec2 z1 = (vec2(noise2(cssPx * 0.04 + t6 * 1.7), noise2(cssPx * 0.04 + 5.0 + t6 * 1.3)) - 0.5) * 4.0 * uDpr;
  float linie = max(kanteBei(vUv + z1 / uAufl, 1.6 * uDpr), kanteBei(vUv - z1 * 0.6 / uAufl, 0.8 * uDpr) * 0.9);
  // Bühne: Kopierer-Grau, senkrechte Streifen der Walze, Zeitungsfetzen in Bildkoordinaten
  vec3 grund = vec3(0.86, 0.85, 0.82);
  if (uBuehne > 0.5) {
    float tg = floor(uZeit * 4.0 * uR_takt);
    vec3 bv = vec3(voronoi2(cssPx / 210.0 + 0.3));
    float fetzenArt = hash11(bv.z * 31.0);
    vec2 bp = cssPx + (hash22(vec2(bv.z, tg)) - 0.5) * 2.0;
    float bKante = bv.y - bv.x + (fbm2(cssPx * 0.3) - 0.5) * 0.06;
    vec3 fetzen = fetzenArt < 0.45 ? mix(ZEITUNG, vec3(0.2), text(bp, bv.z)) : (fetzenArt < 0.6 ? mix(PINK, vec3(1.0), 0.55) : (fetzenArt < 0.72 ? mix(ROT, WEISS, 0.15) : grund));
    grund = mix(fetzen, WEISS, 1.0 - smoothstep(0.015, 0.04, bKante));
    float walze = smoothstep(0.65, 0.95, noise2(vec2(cssPx.x * 0.08, tg * 3.0))) * 0.25;
    grund *= 1.0 - walze;
    grund *= 1.0 - 0.6 * step(0.985, hash12(floor(cssPx / 1.3) + tg));
  }
  vec3 aus = uBuehne > 0.5 ? mix(grund, bild, maske) : bild;
  aus = mix(aus, SCHWARZ, linie);
  float a = uBuehne > 0.5 ? 1.0 : max(maske, linie);
  farbe = vec4(aus * a, a);
}
`;

export const PUNK = bildVoreinstellung({
  id: 'punk',
  name: 'Punk-Collage',
  gruppe: 'Spider-Verse',
  zeile: 'Earth-138 (Hobie): ausgerissene Papierstücke, Fotokopie, Zeitung, Raster; jedes Stück steppt in seinem eigenen Takt',
  regler: [
    { k: 'stuecke', name: 'Stückgröße', min: 0.4, max: 3, schritt: 0.05, grund: 1 },
    { k: 'takt', name: 'Takt', min: 0, max: 2, schritt: 0.05, grund: 1 },
  ],
  fragment: FRAGMENT,
});
