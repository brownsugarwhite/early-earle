/**
 * Flammenwesen (Anime & Manga; Florian: „ein beständig brennendes … wesen in einem anime vectorlook“). Ein Wesen, das ständig brennt,
 * gezeichnet wie Feuer im Anime: flache Farbschichten mit scharfen Kanten (außen Rot, dann Orange, Gelb, ein heller Kern), Zungen mit
 * spitzen Enden, eine dunkle Kontur um die äußere Flamme, alles auf Zweiern (zwölf Bilder je Sekunde). Die Flammen wachsen aus der
 * Form: Ein Wärmefeld sammelt, wie viel Körper unter einem Punkt liegt, nimmt nach oben ab und wird von aufsteigendem, verwirbeltem
 * Rauschen in Zungen zerrissen. Der Körper selbst ist dunkel, im Cel-Schatten, mit glühendem Rand; Funken steigen als Rauten auf.
 * Farbe: klassisch (Orange), Neon (Pink und Cyan, nach den Flammen von „Promare“), Geisterfeuer (Blau).
 */
import { bildVoreinstellung } from '../bildShader';

const FRAGMENT = /* glsl */ `
vec3 flammenPalette(int i, float stil) {
  // i: 0 Kontur, 1 außen, 2 Mitte, 3 innen, 4 Kern
  vec3 k[5] = vec3[5](vec3(0.38, 0.03, 0.04), vec3(0.93, 0.22, 0.07), vec3(1.0, 0.52, 0.08), vec3(1.0, 0.84, 0.25), vec3(1.0, 0.98, 0.84));
  vec3 n[5] = vec3[5](vec3(0.3, 0.02, 0.3), vec3(0.98, 0.15, 0.55), vec3(1.0, 0.45, 0.7), vec3(0.3, 0.95, 0.95), vec3(0.92, 1.0, 1.0));
  vec3 b[5] = vec3[5](vec3(0.02, 0.06, 0.28), vec3(0.1, 0.3, 0.95), vec3(0.2, 0.6, 1.0), vec3(0.55, 0.88, 1.0), vec3(0.94, 0.98, 1.0));
  vec3 a = stil < 1.0 ? mix(k[i], n[i], stil) : mix(n[i], b[i], stil - 1.0);
  return a;
}
/** Wärme: wie viel Form liegt unter diesem Punkt (nach unten abnehmend gewichtet) */
float waerme(vec2 uv, float hoehe) {
  float s = 0.0, w = 0.0;
  for (int k = 0; k < 14; k++) {
    float f = float(k) / 13.0;
    float g = exp(-f * 2.6);
    s += texture(tWeich, uv - vec2(0.0, f * hoehe)).r * g;
    w += g;
  }
  return s / w;
}
float raute(vec2 d, vec2 r) { return 1.0 - smoothstep(0.85, 1.0, abs(d.x) / r.x + abs(d.y) / r.y); }
void main() {
  vec2 css = gl_FragCoord.xy / uDpr;
  float t = schritt(12.0) * uR_tempo;
  float stil = uR_stil;
  GPunkt g = gLesen(vUv);
  float maske = deckungBei(vUv);
  // Maße der Form im Bild
  vec2 c0 = insBild(uMitte);
  vec3 randW = uMitte + (uViewInv * vec4(1.0, 0.0, 0.0, 0.0)).xyz * uRadius;
  float rUv = length(insBild(randW) - c0);
  float rPx = rUv * uAufl.y / uDpr;
  // Flammenfeld: Wärme, aufsteigend zerrissen
  vec2 q = css / max(rPx, 40.0);
  vec2 warp = vec2(fbm2(q * 2.2 + vec2(0.0, -t * 1.1)), fbm2(q * 2.2 + vec2(5.2, -t * 1.3))) - 0.5;
  vec2 uvW = vUv + vec2(warp.x * 0.35, warp.y * 0.15) * rUv;
  float H = waerme(uvW, rUv * 1.35 * uR_hoehe);
  float zungen = fbm2(vec2(q.x * 3.2, q.y * 1.4 - t * 2.4)) - 0.5;
  float f = H * 1.25 + zungen * 0.55 * smoothstep(0.0, 0.5, H) - 0.05;
  float aa = max(fwidth(f), 1e-3);
  float s1 = smoothstep(0.26 - aa, 0.26 + aa, f);
  float s2 = smoothstep(0.42 - aa, 0.42 + aa, f);
  float s3 = smoothstep(0.58 - aa, 0.58 + aa, f);
  float s4 = smoothstep(0.74 - aa, 0.74 + aa, f);
  float kontur = smoothstep(0.215 - aa, 0.215 + aa, f) - s1;
  // Bühne: Nacht mit warmen Ringen (flach gestuft)
  vec2 qb = gl_FragCoord.xy / uAufl;
  float r = length((qb - c0 - vec2(0.0, rUv * 0.4)) * vec2(uAufl.x / uAufl.y, 1.0)) / max(rUv, 1e-3);
  vec3 nacht = mix(vec3(0.05, 0.04, 0.12), vec3(0.11, 0.07, 0.2), qb.y);
  float ring = floor(clamp(3.0 - r * 0.9, 0.0, 3.0)) / 3.0;
  vec3 grund = mix(nacht, flammenPalette(1, stil) * 0.35, ring * 0.45);
  vec3 bild = grund;
  float a = uBuehne > 0.5 ? 1.0 : 0.0;
  // hinter dem Körper: die Flammen
  vec3 flamme = flammenPalette(1, stil);
  flamme = mix(flamme, flammenPalette(2, stil), s2);
  flamme = mix(flamme, flammenPalette(3, stil), s3);
  flamme = mix(flamme, flammenPalette(4, stil), s4);
  bild = mix(bild, flammenPalette(0, stil), kontur);
  bild = mix(bild, flamme, s1);
  a = max(a, max(s1, kontur));
  // der Körper: dunkel im Cel-Schatten, mit glühendem Rand; die Flammen züngeln vorn über ihn
  if (g.a > 0.5) {
    vec3 L = ausSicht(normalize(vec3(0.0, 1.0, 0.25)));
    vec3 V = zumAuge(g.p);
    float v = dot(g.n, L);
    vec3 koerper = v > 0.2 ? vec3(0.28, 0.07, 0.08) : vec3(0.12, 0.03, 0.06);
    koerper = mix(koerper, flammenPalette(0, stil) * 0.8, 0.25);
    float rand = smoothstep(0.55, 0.62, 1.0 - max(dot(g.n, V), 0.0));
    float randOben = rand * smoothstep(-0.2, 0.3, v);
    koerper = mix(koerper, flammenPalette(2, stil), rand * 0.8);
    koerper = mix(koerper, flammenPalette(4, stil), randOben * smoothstep(0.66, 0.7, 1.0 - max(dot(g.n, V), 0.0)));
    // vorn über dem Körper nur die heißesten Zungen
    float vorn = s3 * smoothstep(0.3, 0.6, zungen + 0.5) * 0.85;
    koerper = mix(koerper, mix(flammenPalette(3, stil), flammenPalette(4, stil), s4), vorn);
    bild = mix(bild, koerper, maske);
    a = max(a, maske);
  }
  // Funken: Rauten steigen auf
  for (int i = 0; i < 36; i++) {
    float fi = float(i);
    float h = hash11(fi * 7.31);
    float alter = fract(t * (0.18 + 0.2 * h) + h * 13.0);
    vec2 p0 = c0 + vec2((hash11(fi * 3.7) - 0.5) * 1.6 * rUv * uAufl.y / uAufl.x, -0.2 * rUv);
    vec2 p = p0 + vec2(sin(alter * 6.0 + fi) * 0.12 * rUv * uAufl.y / uAufl.x, alter * rUv * 3.2);
    vec2 d = (vUv - p) * uAufl / uDpr;
    float gr = (3.0 + 4.0 * hash11(fi)) * (1.0 - alter);
    float rt = raute(d, vec2(gr * 0.6, gr * 1.4));
    bild = mix(bild, flammenPalette(4, stil), rt);
    a = max(a, rt);
  }
  float linie = kanteBei(vUv, 1.1 * uDpr) * maske;
  bild = mix(bild, flammenPalette(0, stil) * 0.5, linie);
  farbe = vec4(bild * a, a);
}
`;

export const FLAMMENWESEN = bildVoreinstellung({
  id: 'flammenwesen',
  name: 'Flammenwesen',
  gruppe: 'Anime & Manga',
  zeile: 'Ein Wesen, das ständig brennt: Flammen als flache Vektorschichten mit Kontur, auf Zweiern, glühender Rand, Funken als Rauten',
  regler: [
    { k: 'stil', name: 'Feuer', min: 0, max: 2, schritt: 0.01, grund: 0 },
    { k: 'hoehe', name: 'Flammenhöhe', min: 0.3, max: 2.5, schritt: 0.05, grund: 1 },
    { k: 'tempo', name: 'Tempo', min: 0.2, max: 3, schritt: 0.05, grund: 1 },
  ],
  fragment: FRAGMENT,
  weich: { skala: 0.25, radius: 7 },
});
