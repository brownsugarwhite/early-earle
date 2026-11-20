/**
 * Tiermuster (Florian: „mehr coole Tiermuster wie leopard, schlange, elefantenhaut usw.“). Alle Muster liegen in der Welt an der Form
 * (sie laufen beim Drehen mit) und werden im Bild über dem G-Puffer gerechnet:
 * - **Leopard:** Rosetten (Ringe aus Bruchstücken um eine dunklere Mitte) und kleine Vollflecken, goldgelbes Fell, heller Bauch.
 * - **Tiger:** schmale schwarze Streifen, die sich gabeln und spitz enden (Höhenlinien eines gestreckten, verwirbelten Rauschens),
 *   Orange, weißer Bauch.
 * - **Schlange:** Schuppen in versetzten Reihen (jede gewölbt, mit dunkler Fuge und Glanz), Sattelflecken wie beim Python, auf den
 *   Schuppen ein Regenbogenschimmer (dünne Schicht, wie bei der Regenbogenboa).
 * - **Elefant:** Risse in drei Maßstäben (das Netz der Haut), Falten quer, Staub in den Rillen, stumpfer Glanz.
 * - **Giraffe:** braune Flecken mit gezackten Rändern, getrennt von hellen Adern, jeder Fleck in eigenem Ton.
 * - **Krokodil:** Panzerplatten in Reihen mit Kiel, oben dunkel olivgrün, unten helle Bauchschilde, nass glänzend.
 * Fell (Leopard, Tiger, Giraffe): feine Haarstriche nach unten, Schimmer, und am Umriss ein Haarsaum über die Kante hinaus.
 */
import { bildVoreinstellung } from '../bildShader';
import type { Voreinstellung } from '../kern';

const TIER = /* glsl */ `
/** nächste Zelle: Vektor zu ihrer Mitte (xyz) und Abstand (w); id: ihre Kennung */
vec4 zelle3(vec3 x, out float id) {
  vec3 p = floor(x), f = fract(x);
  vec4 best = vec4(0.0, 0.0, 0.0, 9.0);
  id = 0.0;
  for (int k = -1; k <= 1; k++)
    for (int j = -1; j <= 1; j++)
      for (int i = -1; i <= 1; i++) {
        vec3 b = vec3(float(i), float(j), float(k));
        vec3 r = b + hash33(p + b) - f;
        float d = length(r);
        if (d < best.w) { best = vec4(r, d); id = hash13(p + b + 0.37); }
      }
  return best;
}
/** Richtung der Haare im Bild: die Weltrichtung nach unten, auf die Fläche gelegt */
vec2 haarRichtung(vec3 n) {
  vec3 t = vec3(0.0, -1.0, 0.0) - n * dot(vec3(0.0, -1.0, 0.0), n);
  vec2 r = (uView * vec4(t, 0.0)).xy;
  return length(r) > 1e-3 ? normalize(r) : vec2(0.0, -1.0);
}
float haarStrich(vec2 css, vec2 r) {
  vec2 q = vec2(dot(css, r), dot(css, vec2(-r.y, r.x)));
  return noise2(vec2(q.x * 0.09, q.y * 1.3)) * 0.6 + noise2(vec2(q.x * 0.2, q.y * 2.6) + 7.0) * 0.4;
}
/** Licht für Fell und Haut: weiche Hülle, Schimmer am Rand */
vec3 tierLicht(vec3 n, vec3 V, vec3 albedo, float glanz, float rauh) {
  vec3 L = ausSicht(normalize(vec3(-0.5, 0.72, 0.5)));
  vec3 Lf = ausSicht(normalize(vec3(0.7, 0.0, 0.7)));
  float w = 0.25;
  float diff = clamp((dot(n, L) + w) / (1.0 + w), 0.0, 1.0);
  vec3 c = albedo * (diff * vec3(1.0, 0.96, 0.9) * 2.0 + clamp(dot(n, Lf), 0.0, 1.0) * vec3(0.6, 0.7, 0.9) * 0.3 + vec3(0.09, 0.1, 0.12));
  vec3 H = normalize(L + V);
  c += vec3(1.0) * ggx(max(dot(n, H), 0.0), rauh) * fresnelS(max(dot(H, V), 0.0), 0.04) * max(dot(n, L), 0.0) * glanz;
  return c;
}
`;

/** ein Tier: die Farbe an einem Punkt der Haut (albedo, Normale gestört, Glanz), dazu ob es Fell hat */
function tier(id: string, name: string, zeile: string, farbe: string, fell: boolean, grund: string, regler: Voreinstellung['regler'] = []): Voreinstellung {
  const fragment = /* glsl */ `
${TIER}
void muster(vec3 p, vec3 n0, vec2 css, out vec3 albedo, out vec3 n, out float glanz, out float rauh) {
  vec3 q = (p - uMitte) / uRadius;
  n = n0;
  glanz = 0.3;
  rauh = 0.6;
  ${farbe}
}
void main() {
  vec2 css = gl_FragCoord.xy / uDpr;
  GPunkt g = gLesen(vUv);
  float maske = deckungBei(vUv);
  vec2 qb = gl_FragCoord.xy / uAufl;
  ${grund}
  vec3 bild = srgbZuLin(grundFarbe);
  float a = uBuehne > 0.5 ? 1.0 : 0.0;
  ${
    fell
      ? `// Haarsaum: außen am Umriss Haare, die die Farbe der Haut dahinter tragen
  if (maske < 0.5) {
    float w0 = texture(tWeich, vUv).r;
    if (w0 > 0.01) {
      vec2 px = 1.0 / vec2(textureSize(tWeich, 0));
      vec2 gr = vec2(texture(tWeich, vUv + vec2(px.x, 0.0)).r - texture(tWeich, vUv - vec2(px.x, 0.0)).r, texture(tWeich, vUv + vec2(0.0, px.y)).r - texture(tWeich, vUv - vec2(0.0, px.y)).r);
      vec2 innen = length(gr) > 1e-5 ? normalize(gr) : vec2(0.0);
      float haar = haarStrich(css * 1.4, vec2(-innen.y, innen.x));
      float saum = step(1.0 - w0 * 2.4, haar) * smoothstep(0.0, 0.2, w0);
      if (saum > 0.0) {
        GPunkt gi = gLesen(vUv + innen * 5.0 * uDpr / uAufl);
        if (gi.a > 0.5) {
          vec3 alb, nn; float gl, rh;
          muster(gi.p, gi.n, css, alb, nn, gl, rh);
          vec3 c = tierLicht(gi.n, zumAuge(gi.p), alb, 0.0, 0.8) * 0.85;
          bild = mix(bild, c, saum);
          a = max(a, saum);
        }
      }
    }
  }`
      : ''
  }
  if (g.a > 0.5) {
    vec3 alb, n;
    float gl, rh;
    muster(g.p, g.n, css, alb, n, gl, rh);
    ${fell ? `float strich = haarStrich(css, haarRichtung(g.n));
    alb *= 0.82 + 0.36 * strich;
    vec3 V0 = zumAuge(g.p);
    float schimmer = pow(1.0 - max(dot(g.n, V0), 0.0), 3.0) * 0.35;
    alb += schimmer * alb;` : ''}
    vec3 c = tierLicht(n, zumAuge(g.p), alb, gl, rh);
    bild = mix(bild, c, maske);
    a = max(a, maske);
  }
  vec3 aus = linZuSrgb(aces(bild * 1.1));
  farbe = vec4(aus * a, a);
}
`;
  return bildVoreinstellung({ id, name, gruppe: 'Tiermuster', zeile, regler, fragment, weich: { skala: 0.5, radius: 2.5 }, unruhig: () => false });
}

const GRUND_SAVANNE = `vec3 grundFarbe = mix(vec3(0.82, 0.66, 0.42), vec3(0.95, 0.88, 0.72), smoothstep(0.0, 0.9, qb.y)) * (0.97 + 0.04 * noise2(css * 0.6));`;
const GRUND_DSCHUNGEL = `vec3 grundFarbe = mix(vec3(0.08, 0.14, 0.09), vec3(0.22, 0.33, 0.2), smoothstep(0.0, 1.0, qb.y));
  grundFarbe += vec3(0.1, 0.16, 0.06) * smoothstep(0.55, 0.85, fbm2(css * 0.008)) * 0.6;`;
const GRUND_FLUSS = `vec3 grundFarbe = mix(vec3(0.16, 0.2, 0.17), vec3(0.42, 0.48, 0.4), smoothstep(0.0, 1.0, qb.y));
  grundFarbe += vec3(0.05) * sin(css.y * 0.08 + noise2(css * 0.01) * 6.0) * smoothstep(0.4, 0.0, qb.y);`;

export const LEOPARD = tier(
  'leopard',
  'Leopard',
  'Rosetten aus Bruchstücken um dunkle Mitten, kleine Vollflecken, goldenes Fell mit Haarsaum, heller Bauch',
  /* glsl */ `
  float id;
  vec4 z = zelle3(q * 8.5 * uR_groesse, id);
  vec3 richtung = normalize(z.xyz + 1e-4);
  float bruch = snoise(richtung * 2.2 + id * 30.0);
  float wellig = 0.07 * snoise(q * 24.0);
  float ring = smoothstep(0.14, 0.06, abs(z.w - 0.36 - wellig)) * step(-0.45, bruch);
  float mitte = smoothstep(0.36, 0.26, z.w + wellig);
  float id2;
  vec4 z2 = zelle3(q * 19.0 * uR_groesse + 4.0, id2);
  float klein = smoothstep(0.3, 0.2, z2.w + 0.06 * snoise(q * 30.0)) * step(0.4, id2) * step(0.5, z.w);
  float bauch = smoothstep(-0.1, -0.55, n0.y);
  vec3 gold = mix(vec3(0.74, 0.52, 0.26), vec3(0.92, 0.86, 0.7), bauch);
  albedo = srgbZuLin(gold);
  albedo = mix(albedo, srgbZuLin(vec3(0.55, 0.32, 0.12)), mitte * (1.0 - bauch));
  albedo = mix(albedo, srgbZuLin(vec3(0.05, 0.04, 0.03)), max(ring, klein) * (1.0 - bauch * 0.5));
  glanz = 0.2;
  rauh = 0.7;`,
  true,
  GRUND_SAVANNE,
  [{ k: 'groesse', name: 'Fleckengröße', min: 0.4, max: 2.5, schritt: 0.05, grund: 1 }],
);

export const TIGER = tier(
  'tiger',
  'Tiger',
  'Schmale schwarze Streifen, die sich gabeln und spitz enden, kräftiges Orange, weißer Bauch, Fell mit Haarsaum',
  /* glsl */ `
  vec3 w = q * vec3(0.9, 3.2, 0.9) * uR_groesse;
  w += 0.35 * vec3(snoise(q * 2.0), snoise(q * 2.0 + 5.0), snoise(q * 2.0 + 9.0));
  float feld = fbm3n(w * 1.2, 3);
  float band = abs(fract(feld * 7.0) - 0.5);
  float breite = 0.21 * smoothstep(-0.45, 0.5, snoise(q * 3.0 + 2.0));
  float streifen = 1.0 - smoothstep(breite - 0.02, breite + 0.02, band);
  float bauch = smoothstep(-0.05, -0.5, n0.y);
  vec3 orange = mix(vec3(0.85, 0.42, 0.08), vec3(0.96, 0.72, 0.42), smoothstep(0.2, -0.3, n0.y));
  albedo = srgbZuLin(mix(orange, vec3(0.95, 0.93, 0.88), bauch));
  albedo = mix(albedo, srgbZuLin(vec3(0.05, 0.035, 0.03)), streifen * (1.0 - bauch * 0.7));
  glanz = 0.2;
  rauh = 0.7;`,
  true,
  GRUND_DSCHUNGEL,
  [{ k: 'groesse', name: 'Streifen', min: 0.4, max: 2.5, schritt: 0.05, grund: 1 }],
);

export const SCHLANGE = tier(
  'schlange',
  'Schlange',
  'Schuppen in versetzten Reihen mit Fuge und Glanz, Sattelflecken wie beim Python, Regenbogenschimmer der Regenbogenboa',
  /* glsl */ `
  float u = atan(q.z, q.x) / 6.2831853 * 70.0 * uR_groesse;
  float v = q.y * 22.0 * uR_groesse;
  float reihe = floor(v);
  float uu = u + 0.5 * mod(reihe, 2.0);
  vec2 f = vec2(fract(uu) - 0.5, fract(v) - 0.5);
  vec2 zell = vec2(floor(uu), reihe);
  // gewölbte Schuppe: Höhe und Neigung
  float h = 1.0 - dot(f * vec2(1.6, 1.25), f * vec2(1.6, 1.25)) * 2.2;
  float fuge = smoothstep(0.1, -0.15, h);
  vec3 tu = normalize(vec3(-q.z, 0.0, q.x) + 1e-4);
  vec3 tv = vec3(0.0, 1.0, 0.0);
  n = normalize(n0 + (tu * f.x * 1.2 + tv * f.y * 0.9) * 0.55 * (1.0 - fuge));
  // Sattelflecken
  float sattel = smoothstep(0.05, 0.25, snoise(vec3(q.x * 2.0, q.y * 4.0, q.z * 2.0)));
  float sattelRand = smoothstep(0.0, 0.08, abs(snoise(vec3(q.x * 2.0, q.y * 4.0, q.z * 2.0)) - 0.15));
  vec3 grundS = mix(vec3(0.45, 0.33, 0.16), vec3(0.62, 0.52, 0.3), hash12(zell) * 0.4);
  vec3 c = mix(grundS, vec3(0.22, 0.14, 0.07), sattel);
  c = mix(vec3(0.05, 0.035, 0.02), c, sattelRand);
  c *= 1.0 - 0.75 * fuge;
  albedo = srgbZuLin(c);
  // Regenbogenschimmer (dünne Schicht): Farbe nach Blickwinkel
  vec3 V = zumAuge(p);
  float nv = clamp(dot(n, V), 0.0, 1.0);
  albedo += max(spektral(420.0 + 280.0 * fract(nv * 1.6 + hash12(zell) * 0.15)), vec3(0.0)) * 0.035 * uR_schimmer * (1.0 - fuge) * pow(1.0 - nv, 1.5);
  glanz = 1.4;
  rauh = 0.28;`,
  false,
  GRUND_DSCHUNGEL,
  [
    { k: 'groesse', name: 'Schuppen', min: 0.4, max: 2.5, schritt: 0.05, grund: 1 },
    { k: 'schimmer', name: 'Schimmer', min: 0, max: 3, schritt: 0.05, grund: 1 },
  ],
);

export const ELEFANT = tier(
  'elefant',
  'Elefant',
  'Risse in drei Maßstäben, Querfalten, Staub in den Rillen, stumpfes Grau',
  /* glsl */ `
  vec3 w = q + 0.08 * vec3(snoise(q * 4.0), snoise(q * 4.0 + 3.0), snoise(q * 4.0 + 7.0));
  vec3 v1 = voronoi3(w * 5.0);
  vec3 v2 = voronoi3(w * 16.0 + 2.0);
  vec3 v3 = voronoi3(w * 45.0 + 5.0);
  float r1 = 1.0 - smoothstep(0.0, 0.07, v1.y - v1.x);
  float r2 = 1.0 - smoothstep(0.0, 0.08, v2.y - v2.x);
  float r3 = 1.0 - smoothstep(0.0, 0.1, v3.y - v3.x);
  float falten = smoothstep(0.75, 1.0, sin(q.y * 140.0 + 4.0 * snoise(q * 6.0))) * 0.6;
  float rille = max(max(r1, r2 * 0.8), max(r3 * 0.5, falten));
  // Rillen als Normale (Gradient der Rillenhöhe genähert über die Abstände)
  float e = 0.004;
  vec3 v1x = voronoi3((w + vec3(e, 0.0, 0.0)) * 16.0 + 2.0), v1y = voronoi3((w + vec3(0.0, e, 0.0)) * 16.0 + 2.0), v1z = voronoi3((w + vec3(0.0, 0.0, e)) * 16.0 + 2.0);
  vec3 gr = vec3(v1x.y - v1x.x, v1y.y - v1y.x, v1z.y - v1z.x) - (v2.y - v2.x);
  n = normalize(n0 + gr / e * 0.004);
  vec3 grau = vec3(0.42, 0.4, 0.39) * (0.9 + 0.2 * snoise(q * 3.0));
  vec3 staub = vec3(0.6, 0.52, 0.42);
  vec3 c = mix(grau, staub, smoothstep(0.2, 0.7, fbm3(q * 4.0)) * 0.35);
  c *= 1.0 - 0.55 * rille;
  c = mix(c, staub * 0.8, r2 * 0.25);
  albedo = srgbZuLin(c);
  glanz = 0.15;
  rauh = 0.8;`,
  false,
  GRUND_SAVANNE,
);

export const GIRAFFE = tier(
  'giraffe',
  'Giraffe',
  'Braune Flecken mit gezackten Rändern, getrennt von hellen Adern, jeder Fleck in eigenem Ton, Fell mit Haarsaum',
  /* glsl */ `
  vec3 w = q * 4.2 * uR_groesse;
  w += 0.18 * vec3(snoise(q * 6.0), snoise(q * 6.0 + 3.0), snoise(q * 6.0 + 6.0));
  vec3 vo = voronoi3(w);
  float ader = 1.0 - smoothstep(0.08, 0.13, vo.y - vo.x + 0.03 * snoise(q * 40.0));
  vec3 fleck = mix(vec3(0.55, 0.28, 0.1), vec3(0.42, 0.2, 0.08), hash11(vo.z * 13.0));
  fleck = mix(fleck, vec3(0.68, 0.42, 0.16), smoothstep(0.1, 0.3, vo.x) * 0.0 + 0.25 * smoothstep(0.25, 0.0, vo.x));
  vec3 creme = vec3(0.93, 0.85, 0.66);
  float bauch = smoothstep(-0.2, -0.6, n0.y);
  albedo = srgbZuLin(mix(mix(fleck, creme, ader), creme, bauch));
  glanz = 0.15;
  rauh = 0.75;`,
  true,
  GRUND_SAVANNE,
  [{ k: 'groesse', name: 'Fleckengröße', min: 0.4, max: 2.5, schritt: 0.05, grund: 1 }],
);

export const KROKODIL = tier(
  'krokodil',
  'Krokodil',
  'Panzerplatten in Reihen mit Kiel, dunkles Oliv mit hellen Tupfen, helle Bauchschilde, nass glänzend',
  /* glsl */ `
  float bauch = smoothstep(-0.1, -0.5, n0.y);
  float u = atan(q.z, q.x) / 6.2831853 * mix(34.0, 60.0, bauch) * uR_groesse;
  float v = q.y * mix(11.0, 16.0, bauch) * uR_groesse;
  float reihe = floor(v);
  float uu = u + 0.35 * mod(reihe, 2.0) * (1.0 - bauch);
  vec2 f = vec2(fract(uu) - 0.5, fract(v) - 0.5);
  vec2 zell = vec2(floor(uu), reihe);
  float rechteck = max(abs(f.x) * 1.15, abs(f.y) * 1.25);
  float fuge = smoothstep(0.4, 0.48, rechteck);
  float kiel = (1.0 - smoothstep(0.0, 0.08, abs(f.x))) * (1.0 - bauch) * step(0.5, hash12(zell + 3.0));
  vec3 tu = normalize(vec3(-q.z, 0.0, q.x) + 1e-4);
  vec3 tv = vec3(0.0, 1.0, 0.0);
  n = normalize(n0 + (tu * f.x + tv * f.y) * 0.6 * (1.0 - fuge) + n0 * kiel * 0.2 - tu * sign(f.x) * kiel * 0.4);
  vec3 oben = mix(vec3(0.16, 0.2, 0.1), vec3(0.24, 0.27, 0.13), hash12(zell));
  oben = mix(oben, vec3(0.42, 0.4, 0.2), step(0.85, hash12(zell + 9.0)) * 0.7);
  vec3 unten = vec3(0.78, 0.74, 0.55) * (0.92 + 0.08 * hash12(zell));
  vec3 c = mix(oben, unten, bauch);
  c *= 1.0 - 0.7 * fuge;
  c = mix(c, c * 1.3, kiel * 0.6);
  albedo = srgbZuLin(c);
  glanz = 1.8;
  rauh = 0.22;`,
  false,
  GRUND_FLUSS,
  [{ k: 'groesse', name: 'Plattengröße', min: 0.4, max: 2.5, schritt: 0.05, grund: 1 }],
);
