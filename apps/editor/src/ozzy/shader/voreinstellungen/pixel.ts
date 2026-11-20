/**
 * Pixel (Spider-Verse, Spider-Byte / Margo Kess, die digitale Spinne der Spider-Society). Die Form als Pixelgrafik: grobe Pixel
 * (einstellbar), je Pixel das Licht in der Mitte, in eine Palette von acht Farben gestuft, zwischen zwei Stufen mit geordnetem
 * Dithering (Bayer 4 × 4); ein Pixel breite Kontur, ein heller Pixelsaum oben links. Ab und zu verrutscht eine Pixelzeile (Datenfehler).
 * Bühne: Nachthimmel in Pixeln mit Sternen und einem Raster aus Zeilen.
 */
import { bildVoreinstellung } from '../bildShader';

const FRAGMENT = /* glsl */ `
float bayer4(vec2 p) {
  ivec2 q = ivec2(mod(p, 4.0));
  int i = q.x + q.y * 4;
  int b[16] = int[16](0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5);
  return (float(b[i]) + 0.5) / 16.0;
}
vec3 palette(int i) {
  // Nachtviolett bis Cyan-Weiß (eigene Palette, nach Spider-Byte)
  vec3 p[8] = vec3[8](vec3(0.05, 0.03, 0.12), vec3(0.17, 0.07, 0.32), vec3(0.4, 0.09, 0.5), vec3(0.85, 0.15, 0.55), vec3(1.0, 0.45, 0.45), vec3(1.0, 0.78, 0.4), vec3(0.45, 0.95, 0.95), vec3(0.95, 1.0, 1.0));
  return p[clamp(i, 0, 7)];
}
void main() {
  float P = max(2.0, uR_pixel) * uDpr;
  float t = uZeit;
  vec2 px = gl_FragCoord.xy;
  // Datenfehler: eine Zeile verrutscht kurz
  float zeile = floor(px.y / P);
  float fehler = step(0.985, hash12(vec2(zeile, floor(t * 8.0)))) * (hash11(zeile + floor(t * 8.0)) - 0.5) * 12.0;
  vec2 zelle = floor(px / P + vec2(fehler, 0.0));
  vec2 mitte = (zelle + 0.5) * P / uAufl;
  GPunkt g = gLesen(mitte);
  float an = step(0.5, texture(tNormal, mitte).a);
  vec2 qb = mitte;
  // Bühne: Pixelhimmel
  vec3 grund = mix(vec3(0.04, 0.02, 0.1), vec3(0.16, 0.05, 0.28), floor(qb.y * 10.0) / 10.0);
  float stern = step(0.996, hash12(zelle)) * (0.5 + 0.5 * step(0.5, fract(t * 1.5 + hash12(zelle + 2.0))));
  grund = mix(grund, vec3(0.9, 0.95, 1.0), stern);
  grund *= 0.9 + 0.1 * step(0.5, fract(zelle.y * 0.5));
  vec3 bild = grund;
  float a = uBuehne > 0.5 ? 1.0 : 0.0;
  if (an > 0.5) {
    vec3 L = ausSicht(normalize(vec3(-0.5, 0.65, 0.55)));
    vec3 V = zumAuge(g.p);
    float v = dot(g.n, L) * 0.5 + 0.5;
    float rand = pow(1.0 - max(dot(g.n, V), 0.0), 3.0);
    float wert = clamp(v * 0.85 + rand * 0.35, 0.0, 1.0) * 6.99;
    float stufe = floor(wert);
    float rest = fract(wert);
    int i = int(stufe) + (rest > bayer4(zelle) ? 1 : 0);
    bild = palette(i);
    a = 1.0;
  }
  // Kontur: ein Pixel, wo der Nachbar leer ist
  float leer = 0.0;
  for (int k = 0; k < 4; k++) {
    vec2 o = k == 0 ? vec2(1.0, 0.0) : (k == 1 ? vec2(-1.0, 0.0) : (k == 2 ? vec2(0.0, 1.0) : vec2(0.0, -1.0)));
    leer = max(leer, 1.0 - step(0.5, texture(tNormal, (zelle + o + 0.5) * P / uAufl).a));
  }
  if (an > 0.5 && leer > 0.5) bild = palette(0);
  farbe = vec4(bild * a, a);
}
`;

export const PIXEL = bildVoreinstellung({
  id: 'pixel',
  name: 'Pixel',
  gruppe: 'Spider-Verse',
  zeile: 'Spider-Byte: Pixelgrafik mit acht Farben, Bayer-Dithering, ein Pixel Kontur, Datenfehler, Pixelhimmel',
  regler: [{ k: 'pixel', name: 'Pixelgröße', min: 2, max: 16, schritt: 1, grund: 5 }],
  fragment: FRAGMENT,
});
