/**
 * Gouache (Anime & Manga; Florian nach Runde 3: „Gouche verstehe ich ehrlich gesagt nich so richtig“). Gouache ist deckende
 * Wasserfarbe, die Farbe der gemalten Hintergründe in den Ghibli-Filmen. Jetzt ist das ganze Bild aus Pinselstrichen gemalt:
 *
 * - **Vorlage:** die Form im Ghibli-Licht (warmes Licht, Halbton, blauvioletter Schatten, tieferer Kernschatten, Himmelslicht in den
 *   Schatten, Gras von unten, ein heller Tupfer als Glanz), dahinter Himmel mit Haufenwolken (weiß mit grauvioletten Bäuchen) und zwei
 *   Hügelreihen.
 * - **Striche in drei Lagen:** grob über alles (Himmel, Wolken, Hügel), mittel auf der Form, fein nur dort, wo es darauf ankommt (am
 *   Umriss, an der Grenze von Licht und Schatten, am Glanz). Jeder Strich hat **eine** Farbe, die der Vorlage an seiner Mitte, leicht
 *   verschoben in Ton und Helligkeit (wie von Hand gemischt), folgt der Wölbung der Form (quer zur Normale im Bild; im Himmel fast
 *   waagerecht), läuft an den Enden spitz aus und franst am Rand aus wie ein trockener Pinsel; darin Borstenspuren. Von den Strichen
 *   einer Lage liegt einer oben, durch seine Lücken sieht man die Lage darunter.
 * - **Papier:** feines Korn. Striche der Form reichen ein wenig über den Umriss (gemalte, nicht geschnittene Kanten).
 */
import { bildVoreinstellung } from '../bildShader';

const FRAGMENT = /* glsl */ `
vec2 quer(vec2 v) { return vec2(-v.y, v.x); }
/** die Bühne als Vorlage: Himmel mit Haufenwolken, zwei Hügelreihen */
vec3 grundVorlage(vec2 css, vec2 qb) {
  vec3 himmel = mix(vec3(0.64, 0.82, 0.96), vec3(0.17, 0.42, 0.8), smoothstep(0.35, 1.0, qb.y));
  float wf = fbm2(css * vec2(0.0032, 0.0058) + 3.0) + 0.32 * (qb.y - 0.62);
  float wolke = smoothstep(0.53, 0.56, wf) * smoothstep(0.42, 0.5, qb.y);
  float bauch = smoothstep(0.5, 0.68, fbm2(css * vec2(0.0032, 0.0058) + 3.0 + vec2(0.0, 0.07)));
  vec3 c = mix(himmel, mix(vec3(0.64, 0.64, 0.8), vec3(1.0, 0.99, 0.95), bauch), wolke);
  float h1 = 0.37 + 0.05 * sin(qb.x * 3.0 + 2.0) + 0.03 * fbm2(css * 0.006);
  float h2 = 0.25 + 0.06 * sin(qb.x * 4.5 + 1.0) + 0.02 * fbm2(css * 0.01 + 5.0);
  c = mix(c, mix(vec3(0.34, 0.52, 0.5), vec3(0.42, 0.6, 0.52), smoothstep(h1 - 0.1, h1, qb.y)), step(qb.y, h1));
  c = mix(c, mix(vec3(0.24, 0.45, 0.15), vec3(0.52, 0.72, 0.26), smoothstep(h2 - 0.2, h2, qb.y)), step(qb.y, h2));
  return c;
}
/** die Form als Vorlage, im Licht eines Nachmittags: Licht, Halbton, Schatten, Kernschatten, Himmel und Gras, Glanz, Randlicht */
vec3 formVorlage(vec3 n, vec3 p) {
  vec3 L = ausSicht(normalize(vec3(-0.55, 0.62, 0.55)));
  vec3 V = zumAuge(p);
  float v = dot(n, L);
  vec3 basis = hsv(vec3(fract(uR_farbton / 360.0), 0.45, 0.92));
  float stufe = smoothstep(-0.08, 0.06, v) * 0.55 + smoothstep(0.38, 0.52, v) * 0.45;
  vec3 c = mix(basis * vec3(0.46, 0.5, 0.74), basis * vec3(1.1, 0.97, 0.8), stufe);
  c = mix(c, basis * vec3(0.3, 0.33, 0.55), smoothstep(-0.3, -0.62, v) * 0.6);
  c += vec3(0.18, 0.28, 0.42) * max(n.y, 0.0) * 0.2 * (1.0 - stufe);
  c += vec3(0.22, 0.34, 0.1) * max(-n.y, 0.0) * 0.25;
  c = mix(c, vec3(1.0, 0.98, 0.9), smoothstep(0.92, 0.955, dot(n, normalize(L + V))) * 0.85);
  c = mix(c, vec3(0.82, 0.91, 1.0), smoothstep(0.72, 0.92, 1.0 - max(dot(n, V), 0.0)) * 0.3);
  return c;
}
/** Deckung eines Strichs am Punkt p (Bildpunkte): spitz auslaufend, am Rand ausgefranst (trockener Pinsel); u: Lage längs */
float strich(vec2 p, vec2 c, vec2 d, float hl, float hw, float saat, out float u, out float v) {
  vec2 o = p - c;
  u = dot(o, d);
  v = dot(o, quer(d));
  float t = clamp(u / hl, -1.0, 1.0);
  float breite = hw * sqrt(max(1.0 - pow(abs(t), 3.0), 0.0)) * (0.85 + 0.3 * noise2(vec2(u * 0.06, saat * 7.0)));
  float rand = min(breite - abs(v), (hl - abs(u)) * 0.6);
  float borste = noise2(vec2(u * 0.07, v * 0.85) + saat * 13.0);
  return smoothstep(-0.7, 0.7, rand + (borste - 0.55) * hw * 0.7);
}
/**
 * eine Lage Striche (Zellen im Bild, je Zelle ein Strich): art 0 überall, 1 nur mit Mitte auf der Form, 2 nur feine Stellen der Form.
 * Von den Strichen, die p decken, liegt der mit der höchsten Rangzahl oben. Ergebnis: Farbe und Deckung.
 */
vec4 lage(vec2 p, float zelle, float laenge, float breite, int art) {
  vec2 ip = floor(p / zelle);
  float bestRang = -1.0, bestA = 0.0, bestU = 0.0, bestV = 0.0;
  vec2 bestZ = vec2(0.0), bestC = vec2(0.0);
  for (int j = -2; j <= 2; j++)
    for (int i = -2; i <= 2; i++) {
      vec2 z = ip + vec2(float(i), float(j));
      vec2 c = (z + hash22(z + float(art) * 17.0)) * zelle;
      vec2 uvc = c * uDpr / uAufl;
      vec4 nc = texelFetch(tNormal, ivec2(uvc * vec2(textureSize(tNormal, 0))), 0);
      bool auf = nc.a > 0.5 && uvc.x >= 0.0 && uvc.y >= 0.0 && uvc.x <= 1.0 && uvc.y <= 1.0;
      if (art >= 1 && !auf) continue;
      vec2 d;
      if (auf) {
        vec3 nn = normalize(nc.xyz);
        vec2 nb = (uView * vec4(nn, 0.0)).xy;
        d = length(nb) > 0.08 ? normalize(quer(nb)) : vec2(1.0, 0.0);
        if (art == 2) {
          vec3 L = ausSicht(normalize(vec3(-0.55, 0.62, 0.55)));
          float vl = dot(nn, L);
          float w = texture(tWeich, uvc).r;
          bool fein = (w > 0.2 && w < 0.93) || abs(vl - 0.0) < 0.12 || abs(vl - 0.45) < 0.08 || dot(nn, normalize(L + vec3(0.0, 0.0, 1.0))) > 0.9;
          if (!fein) continue;
        }
      } else {
        float w = (hash12(z + 2.3) - 0.5) * 0.7;
        d = vec2(cos(w), sin(w));
      }
      d = normalize(d + (hash22(z + 4.4) - 0.5) * 0.35);
      float hl = laenge * (0.7 + 0.6 * hash12(z + 3.1)) * 0.5;
      float hw = breite * (0.75 + 0.5 * hash12(z + 5.7)) * 0.5;
      float u, v;
      float a = strich(p, c, d, hl, hw, hash12(z), u, v);
      float rang = hash12(z + 9.9 + float(art));
      if (a > 0.02 && rang > bestRang) { bestRang = rang; bestA = a; bestZ = z; bestC = c; bestU = u; bestV = v; }
    }
  if (bestRang < 0.0) return vec4(0.0);
  // die Farbe des Strichs: die Vorlage an seiner Mitte, leicht verschoben in Ton und Helligkeit
  vec2 uvc = bestC * uDpr / uAufl;
  GPunkt g = gLesen(uvc);
  vec3 col = g.a > 0.5 ? formVorlage(g.n, g.p) : grundVorlage(bestC, uvc);
  float h1 = hash12(bestZ + 21.0), h2 = hash12(bestZ + 33.0);
  col *= 0.94 + 0.12 * h1;
  col = mix(col, col * vec3(1.06, 1.0, 0.9), (h2 - 0.5) * 0.8);
  // Borstenspuren längs des Strichs
  col *= 0.93 + 0.11 * noise2(vec2(bestU * 0.05, bestV * 1.3) + h1 * 31.0);
  return vec4(col, bestA);
}
void main() {
  vec2 css = gl_FragCoord.xy / uDpr;
  vec2 qb = gl_FragCoord.xy / uAufl;
  GPunkt g = gLesen(vUv);
  float maske = deckungBei(vUv);
  float s = uR_pinsel;
  // Untermalung: die Vorlage selbst
  vec3 bild = maske > 0.5 ? formVorlage(g.n, g.p) : grundVorlage(css, qb);
  float a = uBuehne > 0.5 ? 1.0 : maske;
  if (uBuehne > 0.5) {
    vec4 l0 = lage(css, 18.0 * s, 58.0 * s, 20.0 * s, 0);
    bild = mix(bild, l0.rgb, l0.a);
  }
  // die Form: Striche reichen ein wenig über den Umriss
  float hof = smoothstep(0.03, 0.25, texture(tWeich, vUv).r);
  vec4 l1 = lage(css, 9.0 * s, 28.0 * s, 10.0 * s, 1);
  l1.a *= hof;
  bild = mix(bild, l1.rgb, l1.a);
  vec4 l2 = lage(css, 5.0 * s, 14.0 * s, 5.0 * s, 2);
  l2.a *= hof;
  bild = mix(bild, l2.rgb, l2.a);
  a = max(a, max(maske, max(l1.a, l2.a)));
  // Papier
  bild *= 0.95 + 0.06 * papier(css);
  farbe = vec4(bild * a, a);
}
`;

export const GOUACHE = bildVoreinstellung({
  id: 'gouache',
  name: 'Gouache (Ghibli)',
  gruppe: 'Anime & Manga',
  zeile: 'Wie mit dem Pinsel gemalt, Deckfarbe wie in den Ghibli-Hintergründen: jedes Stück ein Pinselstrich mit einer Farbe, der Wölbung nach, in drei Lagen; Wolkenhimmel, Hügel',
  regler: [
    { k: 'farbton', name: 'Farbton', min: 0, max: 360, schritt: 1, grund: 30 },
    { k: 'pinsel', name: 'Pinselgröße', min: 0.5, max: 2.5, schritt: 0.05, grund: 1 },
  ],
  fragment: FRAGMENT,
  weich: { skala: 0.25, radius: 4 },
  unruhig: () => false,
});
