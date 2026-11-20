/**
 * Ukiyo-e (Anime & Manga, die Wurzel des Manga: japanischer Farbholzschnitt, Hokusai, Hiroshige; neu umgesetzt nach Florians Urteil
 * „von der idee her sehr schön, aber noch nicht gut umgesetzt“). Jede Farbe ist ein eigener Stock, gedruckt auf Washi:
 * - **Die Form** wie ein Gewand: eine flache Farbe (Zinnober oder Preußischblau) mit einem Muster wie auf Kimono-Stoff (Seigaiha,
 *   Wellenschuppen), das fest auf der Form sitzt (eben je Hauptrichtung, nicht im Bild schwimmend); der Schatten ist derselbe Ton,
 *   dunkler, mit harter Grenze; Bokashi (der mit dem Lappen gewischte Verlauf) dunkelt zum Umriss hin. Der schwarze Konturstock hat
 *   Pinselstärke und sitzt ein wenig neben den Farben.
 * - **Die Bühne** als Bild: Himmel im Bokashi (oben Preußischblau), die rote Sonne, Nebelbänder (Kasumi) in Rosa und Ocker, ein Berg
 *   mit gezackter Schneekappe, Wellen in zwei Lagen mit Linien im Wasser und Gischt mit Krallen am Kamm, ein Titelfeld mit
 *   Pinselzeichen und ein rotes Siegel. Überall Holzmaserung und Papierkorn.
 */
import { bildVoreinstellung } from '../bildShader';

const FRAGMENT = /* glsl */ `
const vec3 WASHI = vec3(0.94, 0.9, 0.8);
const vec3 BLAU = vec3(0.11, 0.21, 0.42);
const vec3 INDIGO = vec3(0.07, 0.11, 0.23);
const vec3 ZINNOBER = vec3(0.85, 0.27, 0.14);
const vec3 OCKER = vec3(0.84, 0.66, 0.38);
const vec3 ROSA = vec3(0.9, 0.68, 0.64);
const vec3 SUMI = vec3(0.07, 0.065, 0.065);
float maserung(vec2 p) {
  float m = sin((p.y + 6.0 * fbm2(p * vec2(0.01, 0.002))) * 0.9);
  return smoothstep(0.85, 1.0, m) * 0.5 + 0.5 * smoothstep(0.6, 0.9, noise2(p * vec2(0.02, 0.4)));
}
/** Farbe eines Stocks auf das Papier: deckend, aber das Korn scheint durch */
vec3 druck(vec3 unten, vec3 f, float d) { return mix(unten, f * (0.9 + 0.1 * unten / WASHI), clamp(d, 0.0, 1.0)); }
/** Seigaiha: Reihen sich überdeckender Halbkreise mit vier Ringen; p in Halbmessern; Ergebnis: Linie (0 … 1) */
float seigaiha(vec2 p) {
  float best = 1e9, r = 2.0;
  float row0 = floor(p.y * 2.0);
  for (int j = 0; j <= 2; j++) {
    float row = row0 - float(j);
    float cy = row * 0.5;
    float off = mod(row, 2.0);
    for (int i = -1; i <= 1; i++) {
      float cx = (floor((p.x - off) / 2.0) + float(i)) * 2.0 + off + 1.0;
      vec2 d = p - vec2(cx, cy);
      float dl = length(d);
      if (d.y >= 0.0 && dl < 1.0 && cy < best) { best = cy; r = dl; }
    }
  }
  if (r > 1.5) return 0.0;
  float t = r * 4.0;
  float dd = min(fract(t), 1.0 - fract(t));
  float aa = fwidth(t) * 0.8 + 0.01;
  return 1.0 - smoothstep(0.1 - aa, 0.1 + aa, dd);
}
float strich(vec2 p, vec2 a, vec2 b, float w) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-4), 0.0, 1.0);
  return 1.0 - smoothstep(w - 0.6, w + 0.6, length(pa - ba * h));
}
/** ein Pinselzeichen (wie Schrift, ohne Bedeutung), p relativ zur Mitte in Bildpunkten, Größe rund 24 */
float zeichen(vec2 p, float id) {
  float m = 0.0;
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    vec2 h = hash22(vec2(id, fi + 1.0));
    vec2 h2 = hash22(vec2(id + 7.0, fi * 3.0 + 2.0));
    float art = floor(hash11(id * 3.1 + fi) * 3.0);
    vec2 dir = art < 0.5 ? vec2(1.0, 0.0) : (art < 1.5 ? vec2(0.0, 1.0) : normalize(vec2(1.0, -0.9)));
    vec2 a = (h - 0.5) * vec2(16.0, 18.0);
    float len = 7.0 + 11.0 * h2.x;
    m = max(m, strich(p, a - dir * len * 0.5, a + dir * len * 0.5, 1.3 + 0.9 * h2.y));
  }
  return m;
}
/** eine Welle (Bildpunkte): x drin (unter dem Kamm), y Linien im Wasser, z Gischt */
vec3 welle(vec2 p, float basis, float hoehe, float laenge, float phase) {
  float u = p.x / laenge + phase;
  float s = fract(u);
  float prof = s < 0.72 ? smoothstep(0.0, 0.72, s) : 1.0 - smoothstep(0.72, 1.0, s);
  prof = pow(prof, 1.6);
  float kamm = basis + hoehe * prof;
  float dy = kamm - p.y;
  float drin = smoothstep(-0.8, 0.8, dy);
  float l = abs(fract(dy / 8.5) - 0.5);
  float linien = (1.0 - smoothstep(0.07, 0.14, l)) * smoothstep(12.0, 18.0, dy) * smoothstep(0.1, 0.5, prof + 0.3);
  // Gischt: ein heller Saum unter dem Kamm, am Gipfel mit Krallen nach vorn
  float krallen = 7.0 * (1.0 - abs(fract(p.x / 10.0) - 0.5) * 2.0) * smoothstep(0.55, 0.95, prof);
  float gischt = smoothstep(-0.8, 0.8, dy + krallen) * (1.0 - smoothstep(9.0, 11.0, dy)) * smoothstep(0.35, 0.7, prof);
  return vec3(max(drin, smoothstep(-0.8, 0.8, dy + krallen) * smoothstep(0.55, 0.95, prof)), linien, gischt);
}
void main() {
  vec2 css = gl_FragCoord.xy / uDpr;
  vec2 bildGr = uAufl / uDpr;
  GPunkt g = gLesen(vUv);
  float maske = deckungBei(vUv);
  vec2 qb = gl_FragCoord.xy / uAufl;
  float aspekt = uAufl.x / uAufl.y;
  vec3 washi = WASHI * papier(css * 0.8) * (0.97 + 0.04 * fbm2(css * 0.004));
  vec3 bild = washi;
  if (uBuehne > 0.5) {
    // Himmel im Bokashi
    bild = druck(bild, BLAU, smoothstep(0.62, 1.0, qb.y) * 0.95);
    // Sonne
    float sonne = 1.0 - smoothstep(0.068, 0.072, length((qb - vec2(0.6, 0.8)) * vec2(aspekt, 1.0)));
    bild = druck(bild, ZINNOBER, sonne);
    // Berg mit Schneekappe (in der Ferne, rechts)
    float bx = (qb.x - 0.77) * aspekt;
    // sanfte, leicht nach innen gewölbte Hänge, oben flach (Krater); die Schneekappe nur oben, unten gezackt
    float hang = max(abs(bx) - 0.03, 0.0);
    float gipfel = 0.58 - hang * 0.62 - hang * hang * 0.9;
    float berg = 1.0 - smoothstep(-0.0015, 0.0015, qb.y - gipfel);
    float zacken = 0.018 * abs(sin(bx * 70.0)) + 0.012 * fbm2(vec2(bx * 40.0, 1.0));
    float schnee = smoothstep(0.515 - zacken, 0.518 - zacken, qb.y);
    vec3 bergF = mix(mix(INDIGO, washi, 0.35), washi, smoothstep(0.42, 0.2, qb.y));
    bild = druck(bild, mix(bergF, washi * 1.02, schnee), berg);
    // Nebelbänder (Kasumi): Bänder mit runden Enden, Rosa und Ocker, mit Bokashi
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      vec2 m = vec2(i == 0 ? 0.3 : (i == 1 ? 0.78 : 0.15), i == 0 ? 0.68 : (i == 1 ? 0.45 : 0.4));
      vec2 halb = vec2(i == 1 ? 0.22 : 0.2, 0.022);
      vec2 d = (qb - m) * vec2(aspekt, 1.0);
      vec2 k = abs(d) - vec2(halb.x - halb.y, 0.0);
      float band = 1.0 - smoothstep(halb.y - 0.002, halb.y + 0.002, length(max(k, 0.0)) + min(max(k.x, k.y), 0.0));
      vec3 bf = i == 2 ? OCKER : ROSA;
      bild = druck(bild, mix(bf, washi, smoothstep(-0.2, 0.25, d.x / halb.x) * 0.55), band * 0.92);
    }
    // Wellen: hinten heller, vorn Preußischblau, mit Linien und Gischt
    vec3 w1 = welle(css, bildGr.y * 0.24, bildGr.y * 0.08, bildGr.x * 0.21, 0.3);
    bild = druck(bild, mix(BLAU, washi, 0.45), w1.x);
    bild = druck(bild, washi, w1.y * w1.x * 0.7);
    bild = druck(bild, washi, w1.z);
    vec3 w2 = welle(css, bildGr.y * 0.1, bildGr.y * 0.12, bildGr.x * 0.29, 0.62);
    bild = druck(bild, BLAU, w2.x);
    bild = druck(bild, mix(BLAU, washi, 0.6), w2.y * w2.x);
    bild = druck(bild, washi, w2.z);
    // Titelfeld mit Pinselzeichen und Siegel (links oben)
    vec2 tf = css - vec2(bildGr.x * 0.075, bildGr.y * 0.6);
    float feld = step(abs(tf.x), 22.0) * step(abs(tf.y), 78.0);
    float feldRand = feld * (1.0 - step(abs(tf.x), 19.5) * step(abs(tf.y), 75.5));
    bild = druck(bild, mix(OCKER, washi, 0.35), feld);
    float schrift = 0.0;
    for (int i = 0; i < 5; i++) schrift = max(schrift, zeichen(tf - vec2(0.0, 56.0 - float(i) * 28.0), float(i) + 3.0));
    bild = druck(bild, SUMI, max(schrift * step(abs(tf.y), 74.0), feldRand));
    vec2 sf = css - vec2(bildGr.x * 0.075, bildGr.y * 0.6 - 100.0);
    float siegel = step(abs(sf.x), 11.0) * step(abs(sf.y), 11.0);
    float siegelZ = zeichen(sf * 1.9, 41.0);
    bild = druck(bild, ZINNOBER, siegel * (1.0 - 0.85 * siegelZ));
    // Maserung des Holzes in den Flächen
    bild *= 1.0 - 0.07 * maserung(css);
  }
  float a = uBuehne > 0.5 ? 1.0 : 0.0;
  // die Form: Farbstöcke etwas versetzt gegen den Konturstock
  vec2 versatz = vec2(1.5, -1.0) * uDpr / uAufl;
  GPunkt gf = gLesen(vUv + versatz);
  float maskeF = deckungBei(vUv + versatz);
  if (gf.a > 0.5) {
    vec3 L = ausSicht(normalize(vec3(-0.5, 0.7, 0.5)));
    float v = dot(gf.n, L);
    bool blau = uR_farbe > 0.5;
    vec3 basis = blau ? BLAU : ZINNOBER;
    vec3 schatten = blau ? INDIGO : vec3(0.62, 0.17, 0.1);
    vec3 c = v > 0.12 ? basis : schatten;
    // Muster wie auf Kimono-Stoff: fest an der Form, eben je Hauptrichtung
    vec3 q = (gf.p - uMitte) / uRadius;
    vec3 an = abs(gf.n);
    vec2 pq = an.z >= max(an.x, an.y) ? q.xy : (an.y >= an.x ? q.xz : q.zy);
    float muster = seigaiha(pq * 8.0 * uR_muster + 3.0);
    vec3 musterF = blau ? mix(BLAU, WASHI, 0.7) : mix(ZINNOBER, WASHI, 0.62);
    c = mix(c, v > 0.12 ? musterF : mix(musterF, schatten, 0.45), muster * 0.9);
    // Bokashi: zum Umriss hin dunkler
    float innen = texture(tWeich, vUv).r;
    c = mix(c, c * 0.6, smoothstep(0.75, 0.42, innen));
    c *= 1.0 - 0.07 * maserung(css + 50.0);
    bild = druck(bild, c, maskeF);
    a = max(a, maskeF);
  }
  // Konturstock: Pinselstärke, an- und abschwellend
  float st = (1.1 + 0.9 * smoothstep(0.3, 0.8, noise2(css * 0.02))) * uDpr;
  float linie = kanteBei(vUv, st);
  bild = druck(bild, SUMI, linie * 0.96);
  a = max(a, max(linie, maske));
  farbe = vec4(bild * a, a);
}
`;

export const UKIYOE = bildVoreinstellung({
  id: 'ukiyoe',
  name: 'Ukiyo-e',
  gruppe: 'Anime & Manga',
  zeile: 'Japanischer Farbholzschnitt: Kimono-Muster fest auf der Form, Bokashi, Konturstock mit Pinselstärke; Berg, Nebelbänder, Wellen mit Gischtkrallen, Titelfeld und Siegel',
  regler: [
    { k: 'farbe', name: 'Zinnober / Blau', min: 0, max: 1, schritt: 1, grund: 0 },
    { k: 'muster', name: 'Muster', min: 0.4, max: 2.5, schritt: 0.05, grund: 1 },
  ],
  fragment: FRAGMENT,
  weich: { skala: 0.25, radius: 6 },
  unruhig: () => false,
});
