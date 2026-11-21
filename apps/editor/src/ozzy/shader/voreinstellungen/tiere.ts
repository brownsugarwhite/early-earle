/**
 * Tiermuster (Florian: „mehr coole Tiermuster wie leopard, schlange, elefantenhaut usw.“; nach Runde 3: „leopard, giraffe und schuppen
 * von schlange und krokodil … 2-3 verschiedene schlangen und schuppenarten … ein richtiges salamandermuster … tiere auch in
 * verschiedenen stilen wie spider-verse und earle“; Recherche: `docs/research/2026-11-20-tiermuster-recherche.md`).
 *
 * Alle Muster liegen in der Welt an der Form (sie laufen beim Drehen mit) und werden im Bild über dem G-Puffer gerechnet. Jedes Tier
 * hat einen **Stil**: echt (Fell, Schuppen, Licht wie im Studio), **Spider-Verse** (Comicdruck: zwei flache Töne, Rasterpunkte im
 * Schatten, Schraffur, Tuschekontur, die Farbplatte leicht versetzt, Papier mit Raster) oder **Earle** (Siebdruck: vier harte Stufen
 * im Streiflicht, Schatten in Petrol, Lichtpunkte, Himmel in Bändern, Hügel und gotische Stämme).
 *
 * - **Leopard, Tiger, Giraffe** laufen seit Runde 6 auf dem Fell aus Schalen (`fell.ts`); ihre Muster stehen dort.
 * - **Python, Klapperschlange, Korallennatter:** Schuppen in schrägen Reihen, die sich zum Schwanz hin überlappen (die vordere deckt;
 *   unter ihrer freien Kante liegt ein Schatten), gewölbt, die Farbe Schuppe für Schuppe. Python glatt mit Sätteln und Schimmer;
 *   Klapperschlange gekielt (ein Grat je Schuppe, matt) mit Rauten auf dem Rücken und Ringen am Schwanz; Korallennatter glänzend in
 *   Ringen Rot, Gelb, Schwarz, die roten Schuppen mit schwarzer Spitze.
 * - **Krokodil:** oben Knochenplatten in Reihen mit Grat und Grübchen, an den Flanken runde Höcker, am Bauch glatte Schilde.
 * - **Feuersalamander:** glänzendes Schwarz mit gelben, teils zu Streifen verbundenen Flecken, nasse Haut mit Poren und Wärzchen.
 * - **Elefant:** Felder tiefer Furchen, Querfalten, matt, Staub.
 */
import { bildVoreinstellung } from '../bildShader';
import type { Voreinstellung } from '../kern';

export const TIER = /* glsl */ `
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
/** Voronoi mit drei Abständen (nächste, zweit-, drittnächste) und Kennung der nächsten Zelle */
vec4 voronoiF3(vec3 x) {
  vec3 p = floor(x), f = fract(x);
  float d1 = 9.0, d2 = 9.0, d3 = 9.0, id = 0.0;
  for (int k = -1; k <= 1; k++)
    for (int j = -1; j <= 1; j++)
      for (int i = -1; i <= 1; i++) {
        vec3 b = vec3(float(i), float(j), float(k));
        vec3 r = b + hash33(p + b) - f;
        float d = length(r);
        if (d < d1) { d3 = d2; d2 = d1; d1 = d; id = hash13(p + b + 0.37); } else if (d < d2) { d3 = d2; d2 = d; } else if (d < d3) d3 = d;
      }
  return vec4(d1, d2, d3, id);
}
/**
 * Voronoi im Raum mit dem genauen Abstand zum Rand der nächsten Zelle (zwei Durchgänge, wie bei den Kanten nach Quílez), dazu der
 * Vektor zu ihrer Mitte und ihre Kennung; die Mitten sind nur mäßig gestreut, so liegen die Zellen gleichmäßig wie Rosetten im Fell
 */
float zelleRand3(vec3 x, out vec3 mitte, out float id) {
  vec3 p = floor(x), f = fract(x);
  vec3 mb = vec3(0.0), mr = vec3(0.0);
  float md = 9.0;
  for (int k = -1; k <= 1; k++)
    for (int j = -1; j <= 1; j++)
      for (int i = -1; i <= 1; i++) {
        vec3 b = vec3(float(i), float(j), float(k));
        vec3 r = b + 0.15 + 0.7 * hash33(p + b) - f;
        float d = dot(r, r);
        if (d < md) { md = d; mr = r; mb = b; }
      }
  md = 9.0;
  for (int k = -1; k <= 1; k++)
    for (int j = -1; j <= 1; j++)
      for (int i = -1; i <= 1; i++) {
        vec3 b = mb + vec3(float(i), float(j), float(k));
        vec3 r = b + 0.15 + 0.7 * hash33(p + b) - f;
        vec3 dr = r - mr;
        if (dot(dr, dr) > 1e-5) md = min(md, dot(0.5 * (mr + r), normalize(dr)));
      }
  mitte = mr;
  id = hash13(p + mb + 0.37);
  return md;
}
/**
 * Platten mit runden Ecken in einer Ebene (Reihen, mit versetzt = 1 jede zweite um eine halbe Platte verschoben). Ergebnis: Abstand
 * zum Rand der Platte (innen positiv, in der Fuge negativ); d: Ort in der Platte, aussen: Richtung zum nächsten Rand
 */
float platteRund(vec2 p, float streck, float versetzt, float rund, float spalt, out vec2 d, out vec2 mitte, out float id, out vec2 aussen) {
  float zeile = floor(p.y);
  float vs = versetzt * 0.5 * mod(zeile, 2.0);
  vec2 pp = vec2(p.x / streck + vs, p.y);
  vec2 c = floor(pp);
  d = vec2((fract(pp.x) - 0.5) * streck, fract(pp.y) - 0.5);
  mitte = vec2((c.x + 0.5 - vs) * streck, c.y + 0.5);
  id = hash12(c + 0.7);
  vec2 hs = vec2(0.5 * streck, 0.5) - spalt * 0.5 - hash22(c + 3.1) * 0.05;
  vec2 w = abs(d) - hs + rund;
  float g = max(w.x, w.y);
  float sd = min(g, 0.0) + length(max(w, 0.0)) - rund;
  vec2 gr = g > 0.0 ? max(w, 0.0) / max(length(max(w, 0.0)), 1e-5) : (w.x > w.y ? vec2(1.0, 0.0) : vec2(0.0, 1.0));
  aussen = sign(d) * gr;
  return -sd;
}
/** Phasor-Rauschen (Tricard u. a. 2019): Summe von Gabor-Kernen; aus der Phase werden Streifen, die sich gabeln und enden */
vec2 phasor3(vec3 x, vec3 achse, float f, float streu) {
  vec3 p = floor(x), fr = fract(x);
  vec2 s = vec2(0.0);
  for (int k = -1; k <= 1; k++)
    for (int j = -1; j <= 1; j++)
      for (int i = -1; i <= 1; i++) {
        vec3 b = vec3(float(i), float(j), float(k));
        vec3 r = b + hash33(p + b) - fr;
        float g = exp(-2.4 * dot(r, r));
        vec3 d = normalize(achse + (hash33(p + b + 17.0) * 2.0 - 1.0) * streu);
        float w = 6.2831853 * (-f * dot(d, r) + hash13(p + b + 5.3));
        s += g * vec2(cos(w), sin(w));
      }
  return s;
}
/** die längste Achse der Form in der Seitenebene (x oder y; z ist die Spiegelachse) und zwei Richtungen quer dazu */
void achsen(out vec3 A, out vec3 B, out vec3 C) {
  vec3 ach = pow(uHalb / max(uHalb.x, uHalb.y), vec3(4.0));
  A = normalize(vec3(ach.x, ach.y, 0.0) + vec3(1e-3, 0.0, 0.0));
  B = normalize(cross(vec3(0.0, 0.0, 1.0), A));
  C = cross(A, B);
}
/** welche Ebene trägt die Schuppen hier (0 Seite, 1 oben/unten, 2 vorn/hinten); U längs der Körperachse, W quer */
int schuppenEbene(vec3 n, vec3 q, vec3 A, out vec3 U, out vec3 W) {
  vec3 an = abs(n) + 0.05 * vec3(snoise(q * 2.2), snoise(q * 2.2 + 5.0), snoise(q * 2.2 + 9.0));
  int e = (an.z >= an.x && an.z >= an.y) ? 0 : (an.y >= an.x ? 1 : 2);
  vec3 N = e == 0 ? vec3(0.0, 0.0, 1.0) : (e == 1 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0));
  vec3 a = A - N * dot(A, N);
  U = length(a) > 0.3 ? normalize(a) : (e == 1 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 0.0, 1.0));
  W = cross(N, U);
  return e;
}
/**
 * Schuppen in einer Ebene, die sich überlappen: Reihen längs x, jede zweite versetzt; jede Schuppe hinten länger, die vordere deckt.
 * Ergebnis: Abstand zum sichtbaren Rand (Zellen); schatten: Abstand zur freien Kante der nächsten vorderen Schuppe (klein: im Schatten).
 */
float schuppe2(vec2 p, float raute, out vec2 d, out vec2 mitte, out float id, out float schatten) {
  vec2 ip = floor(p);
  float best = -1e9, rand = 0.0;
  d = vec2(0.0); mitte = vec2(0.0); id = 0.0; schatten = 1.0;
  float R = mix(0.84, 1.06, raute);
  for (int j = -1; j <= 2; j++)
    for (int i = -1; i <= 1; i++) {
      vec2 c = ip + vec2(float(j), float(i));
      float versatz = 0.5 * mod(c.x, 2.0);
      vec2 m = c + vec2(0.5, 0.5 + versatz) + 0.05 * (hash22(c) - 0.5);
      vec2 dd = p - m;
      vec2 sc = vec2(dd.x * (dd.x < 0.0 ? 0.6 : 1.35), dd.y);
      float r = mix(length(sc), abs(sc.x) + abs(sc.y) * 1.05, raute);
      if (r < R && m.x > best) { best = m.x; rand = R - r; d = dd; mitte = m; id = hash12(c + 0.3); }
    }
  for (int j = -1; j <= 2; j++)
    for (int i = -1; i <= 1; i++) {
      vec2 c = ip + vec2(float(j), float(i));
      float versatz = 0.5 * mod(c.x, 2.0);
      vec2 m = c + vec2(0.5, 0.5 + versatz) + 0.05 * (hash22(c) - 0.5);
      if (m.x <= best + 0.01) continue;
      vec2 dd = p - m;
      vec2 sc = vec2(dd.x * (dd.x < 0.0 ? 0.6 : 1.35), dd.y);
      float r = mix(length(sc), abs(sc.x) + abs(sc.y) * 1.05, raute);
      schatten = min(schatten, max(r - R, 0.0));
    }
  return rand;
}
/** Platten ohne Überlappung (Panzer) in einer Ebene: Ziegelverband, längs gestreckt; Ergebnis: Abstand zur Fuge (Zellen) */
float platte2(vec2 p, float streck, float versetzt, out vec2 d, out vec2 mitte, out float id) {
  float zeile = floor(p.y);
  vec2 pp = vec2(p.x / streck + versetzt * 0.5 * mod(zeile, 2.0), p.y);
  vec2 c = floor(pp);
  vec2 f = fract(pp) - 0.5;
  d = vec2(f.x * streck, f.y);
  mitte = vec2((c.x + 0.5 - versetzt * 0.5 * mod(zeile, 2.0)) * streck, c.y + 0.5);
  id = hash12(c + 0.7);
  vec2 rand2 = (0.5 - abs(f)) * vec2(streck, 1.0);
  return min(rand2.x, rand2.y);
}
/** Höhe der Elefantenhaut (0 eben, negativ in Furchen): Felder großer Furchen, feinere darin, Querfalten */
float elefantRelief(vec3 q, vec3 A) {
  vec3 w = q + 0.12 * vec3(snoise(q * 3.0), snoise(q * 3.0 + 3.0), snoise(q * 3.0 + 7.0));
  vec3 v1 = voronoi3(w * 7.0);
  vec3 v2 = voronoi3(w * 19.0 + 2.0);
  float f1 = v1.y - v1.x, f2 = v2.y - v2.x;
  float gross = 1.0 - smoothstep(0.0, 0.16 + 0.08 * snoise(q * 5.0), f1);
  float fein = 1.0 - smoothstep(0.0, 0.12, f2);
  float fl = dot(q, A) * 26.0 + 2.5 * snoise(q * 2.0);
  float falte = pow(1.0 - abs(sin(fl)), 6.0) * smoothstep(-0.2, 0.4, snoise(q * 1.5 + 9.0));
  float kuppe = smoothstep(0.0, 0.35, f1) * 0.25 + 0.08 * snoise(q * 40.0);
  return kuppe - gross * 0.85 - fein * 0.35 - falte * 0.6;
}
/** Höhe der Salamanderhaut: Poren (Grübchen), Wärzchen, ein leichtes Wellen */
float salamanderHaut(vec3 q) {
  vec3 vo = voronoi3(q * 80.0);
  vec3 vk = voronoi3(q * 24.0 + 7.0);
  return -smoothstep(0.14, 0.0, vo.x) * 0.35 + smoothstep(0.5, 0.0, vk.x) * 0.6 * step(0.55, vk.z) + 0.1 * snoise(q * 40.0);
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
/** Licht für Fell und Haut: weiche Hülle, Gegenlicht, Glanzkeule, dazu die Spiegelung des Studios (für nasse und glatte Häute) */
vec3 tierLicht(vec3 n, vec3 V, vec3 albedo, float glanz, float rauh) {
  vec3 L = ausSicht(normalize(vec3(-0.5, 0.72, 0.5)));
  vec3 Lf = ausSicht(normalize(vec3(0.7, 0.0, 0.7)));
  float w = 0.25;
  float diff = clamp((dot(n, L) + w) / (1.0 + w), 0.0, 1.0);
  vec3 c = albedo * (diff * vec3(1.0, 0.96, 0.9) * 2.0 + clamp(dot(n, Lf), 0.0, 1.0) * vec3(0.6, 0.7, 0.9) * 0.3 + vec3(0.09, 0.1, 0.12));
  vec3 H = normalize(L + V);
  c += vec3(1.0) * ggx(max(dot(n, H), 0.0), rauh) * fresnelS(max(dot(H, V), 0.0), 0.04) * max(dot(n, L), 0.0) * glanz;
  float nv = clamp(dot(n, V), 0.0, 1.0);
  c += studio(reflect(-V, n)) * fresnelS(nv, 0.04) * glanz * 0.18 * (1.0 - rauh);
  return c;
}
/** Spider-Verse: zwei flache Töne mit harter Grenze, Rasterpunkte im Schatten, Schraffur im tiefen Schatten, Glanz als weiße Form */
vec3 comicTier(vec3 albLin, vec3 n, vec3 n0, vec3 V, vec2 css) {
  vec3 L = ausSicht(normalize(vec3(-0.5, 0.7, 0.5)));
  float v = dot(normalize(mix(n0, n, 0.35)), L);
  vec3 alb = clamp(linZuSrgb(albLin) * 1.08, 0.0, 1.0);
  float aa = fwidth(v) + 1e-3;
  float licht = smoothstep(0.08 - aa, 0.08 + aa, v);
  vec3 c = mix(alb * vec3(0.66, 0.62, 0.8), alb, licht);
  float tiefe = (1.0 - licht) * 0.55 + smoothstep(0.0, -0.7, v) * 0.45;
  c = mix(c, alb * vec3(0.32, 0.28, 0.46), punkt(css, tiefe * 0.6, radians(45.0), 5.5) * 0.9);
  c = mix(c, vec3(0.06, 0.04, 0.1), schraffur(css, smoothstep(-0.35, -0.85, v) * 0.55, radians(-35.0), 4.5) * 0.9);
  float sp = smoothstep(0.976, 0.984, dot(n0, normalize(L + V)));
  c = mix(c, vec3(1.0), sp * 0.95);
  // farbiges Randlicht von rechts unten, hart begrenzt, wie in den Filmen
  vec3 Lr = ausSicht(normalize(vec3(0.85, -0.35, 0.25)));
  float rim = smoothstep(0.6, 0.66, 1.0 - max(dot(n0, V), 0.0)) * smoothstep(0.1, 0.2, dot(n0, Lr));
  c = mix(c, vec3(0.22, 0.86, 0.96), rim * 0.9);
  return srgbZuLin(c);
}
vec3 comicGrund(vec2 css, vec2 qb) {
  vec3 p = vec3(0.98, 0.95, 0.86) * papier(css);
  float w = smoothstep(0.15, 0.85, length((qb - 0.5) * vec2(uAufl.x / uAufl.y, 1.0)) * 1.3);
  p = mix(p, vec3(0.96, 0.42, 0.36), punkt(css, 0.08 + 0.5 * w, radians(15.0), 8.0) * 0.65);
  return srgbZuLin(p);
}
/** Earle: Streiflicht in vier harten Stufen, Schatten in Petrol, tiefe Schatten fast schwarz, Lichtpunkte, gesättigte Juwelfarben */
vec3 earleTier(vec3 albLin, vec3 n, vec3 V, vec2 css) {
  vec3 L = ausSicht(normalize(vec3(-0.85, 0.32, 0.42)));
  float v = dot(n, L);
  vec3 alb = linZuSrgb(albLin);
  alb = clamp(mix(vec3(dot(alb, vec3(0.299, 0.587, 0.114))), alb, 1.35), 0.0, 1.0);
  vec3 c;
  if (v > 0.55) c = alb * vec3(1.08, 1.03, 0.9) + vec3(0.04, 0.03, 0.0);
  else if (v > 0.18) c = alb * 0.84;
  else if (v > -0.18) c = mix(alb, vec3(0.06, 0.24, 0.27), 0.62) * 0.62;
  else c = vec3(0.03, 0.07, 0.09);
  vec2 g = css / 7.0;
  vec2 zelle = floor(g);
  vec2 f = fract(g) - 0.5 - (hash22(zelle) - 0.5) * 0.4;
  float tupf = (1.0 - smoothstep(0.12, 0.17, length(f))) * step(0.55, hash12(zelle)) * smoothstep(0.45, 0.75, v);
  c = mix(c, min(alb * 1.3 + 0.12, vec3(1.0)), tupf * 0.85);
  return srgbZuLin(c);
}
vec3 earleGrund(vec2 qb, vec2 css) {
  float y = qb.y;
  vec3 c = y < 0.46 ? vec3(0.88, 0.7, 0.32) : (y < 0.56 ? vec3(0.84, 0.56, 0.46) : (y < 0.72 ? vec3(0.3, 0.5, 0.52) : vec3(0.09, 0.2, 0.31)));
  float h1 = 0.37 + 0.05 * sin(qb.x * 7.0 + 1.0) + 0.02 * sin(qb.x * 19.0);
  float h2 = 0.23 + 0.06 * sin(qb.x * 5.0 + 3.0);
  if (y < h1) c = vec3(0.1, 0.37, 0.3);
  // Stämme wie in Earles Wäldern: hoch und gerade, dunkles Petrol, helle Kante zum Licht, feine Längsstreifen
  float zx = floor(css.x / 170.0);
  bool himmel = y > 0.72;
  if (hash11(zx * 1.31 + 0.2) > 0.4) {
    float mx = (zx + 0.25 + 0.5 * hash11(zx * 7.7)) * 170.0;
    float br = 6.0 + 9.0 * hash11(zx * 3.3);
    float dx = css.x - mx;
    if (abs(dx) < br && y > h2 - 0.03) {
      vec3 st = dx < -br * 0.45 ? vec3(0.13, 0.32, 0.31) : vec3(0.025, 0.07, 0.08);
      st *= 0.88 + 0.12 * step(0.5, fract(dx / 2.6 + 0.3 * hash11(zx)));
      c = st;
      himmel = false;
    }
  }
  if (y < h2) c = vec3(0.04, 0.17, 0.16);
  vec2 zelle = floor(css / 9.0);
  float stern = step(0.985, hash12(zelle)) * (himmel ? 1.0 : 0.0) * (1.0 - smoothstep(0.1, 0.18, length(fract(css / 9.0) - 0.5)));
  c = mix(c, vec3(0.98, 0.9, 0.7), stern);
  return srgbZuLin(c);
}
`;

const STIL: Voreinstellung['regler'][number] = { k: 'stil', name: 'Stil', min: 0, max: 2, schritt: 1, grund: 0, stufen: ['echt', 'Spider-Verse', 'Earle'] };

/** ein Tier: die Farbe an einem Punkt der Haut (albedo, Normale gestört, Glanz), dazu ob es Fell hat; jedes Tier in drei Stilen */
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
  int stil = int(uR_stil + 0.5);
  // im Comic sitzt die Farbplatte ein wenig neben der Tusche
  vec2 versatz = stil == 1 ? vec2(1.5, -1.0) * uDpr / uAufl : vec2(0.0);
  GPunkt g = gLesen(vUv + versatz);
  float maske = deckungBei(vUv + versatz);
  vec2 qb = gl_FragCoord.xy / uAufl;
  ${grund}
  vec3 bild = stil == 0 ? srgbZuLin(grundFarbe) : (stil == 1 ? comicGrund(css, qb) : earleGrund(qb, css));
  float a = uBuehne > 0.5 ? 1.0 : 0.0;
  ${
    fell
      ? `// Haarsaum: außen am Umriss Haare, die die Farbe der Haut dahinter tragen (nur echt)
  if (stil == 0 && maske < 0.5) {
    float w0 = texture(tWeich, vUv).r;
    if (w0 > 0.01) {
      vec2 px = 1.0 / vec2(textureSize(tWeich, 0));
      vec2 gr = vec2(texture(tWeich, vUv + vec2(px.x, 0.0)).r - texture(tWeich, vUv - vec2(px.x, 0.0)).r, texture(tWeich, vUv + vec2(0.0, px.y)).r - texture(tWeich, vUv - vec2(0.0, px.y)).r);
      vec2 innen = length(gr) > 1e-5 ? normalize(gr) : vec2(0.0);
      float haar = haarStrich(css * 1.4, vec2(-innen.y, innen.x));
      float saum = smoothstep(1.0 - w0 * 2.4 - 0.06, 1.0 - w0 * 2.4 + 0.06, haar) * smoothstep(0.0, 0.2, w0) * 0.9;
      if (saum > 0.0) {
        GPunkt gi = gLesen(vUv + innen * 5.0 * uDpr / uAufl);
        if (gi.a > 0.5) {
          vec3 alb, nn; float gl, rh;
          muster(gi.p, gi.n, css, alb, nn, gl, rh);
          vec3 c = tierLicht(gi.n, zumAuge(gi.p), alb, 0.0, 0.8) * 0.7 + alb * 0.4;
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
    vec3 V = zumAuge(g.p);
    vec3 c;
    if (stil == 1) c = comicTier(alb, n, g.n, V, css);
    else if (stil == 2) c = earleTier(alb, n, V, css);
    else {
      ${fell ? `float strich = haarStrich(css, haarRichtung(g.n));
      alb *= 0.82 + 0.36 * strich;
      alb += pow(1.0 - max(dot(g.n, V), 0.0), 3.0) * 0.35 * alb;` : ''}
      c = tierLicht(n, V, alb, gl, rh);
    }
    bild = mix(bild, c, maske);
    a = max(a, maske);
  }
  if (stil >= 1) {
    float linie = kanteBei(vUv, (stil == 1 ? 1.7 : 1.0) * uDpr);
    bild = mix(bild, stil == 1 ? vec3(0.004, 0.004, 0.01) : vec3(0.004, 0.012, 0.016), linie);
    a = max(a, linie);
  }
  vec3 aus = stil == 0 ? linZuSrgb(aces(bild * 1.1)) : linZuSrgb(bild);
  farbe = vec4(aus * a, a);
}
`;
  return bildVoreinstellung({ id, name, gruppe: 'Tiermuster', zeile, regler: [STIL, ...regler], fragment, weich: { skala: 0.5, radius: 2.5 }, unruhig: () => false });
}

const GRUND_SAVANNE = `vec3 grundFarbe = mix(vec3(0.82, 0.66, 0.42), vec3(0.95, 0.88, 0.72), smoothstep(0.0, 0.9, qb.y)) * (0.97 + 0.04 * noise2(css * 0.6));`;
const GRUND_DSCHUNGEL = `vec3 grundFarbe = mix(vec3(0.08, 0.14, 0.09), vec3(0.22, 0.33, 0.2), smoothstep(0.0, 1.0, qb.y));
  grundFarbe += vec3(0.1, 0.16, 0.06) * smoothstep(0.55, 0.85, fbm2(css * 0.008)) * 0.6;`;
const GRUND_FLUSS = `vec3 grundFarbe = mix(vec3(0.16, 0.2, 0.17), vec3(0.42, 0.48, 0.4), smoothstep(0.0, 1.0, qb.y));
  grundFarbe += vec3(0.05) * sin(css.y * 0.08 + noise2(css * 0.01) * 6.0) * smoothstep(0.4, 0.0, qb.y);`;
const GRUND_WALD = `vec3 grundFarbe = mix(vec3(0.05, 0.06, 0.035), vec3(0.16, 0.2, 0.11), smoothstep(0.0, 1.0, qb.y));
  vec3 bl = voronoi2(css / 90.0);
  grundFarbe = mix(grundFarbe, mix(vec3(0.28, 0.2, 0.08), vec3(0.18, 0.26, 0.1), bl.z), smoothstep(0.42, 0.3, bl.x) * 0.35 * smoothstep(0.7, 0.2, qb.y));`;

/** gemeinsamer Anfang der Schuppentiere: Ebene, Schuppe, Schatten unter der vorderen Kante, Wölbung, Lage der Mitte in q */
const SCHUPPEN_KOPF = /* glsl */ `
  vec3 A, B, C;
  achsen(A, B, C);
  vec3 U, W;
  int eb = schuppenEbene(n0, q, A, U, W);
  vec2 p2 = vec2(dot(q, U), dot(q, W)) * k + float(eb) * 17.3;
  vec2 d, m2;
  float id, schatten;
  float rand = schuppe2(p2, raute, d, m2, id, schatten);
  float aaS = fwidth(rand) + 0.01;
  float fuge = 1.0 - smoothstep(0.02 - aaS, 0.06 + aaS, rand);
  float unter = 1.0 - smoothstep(0.0, 0.32, schatten);
  vec3 g = U * d.x * 0.75 + W * d.y;
  g -= n0 * dot(g, n0);
  n = normalize(n0 + g * 0.5 * (1.0 - fuge));
  vec3 qm = q - (U * (p2.x - m2.x) + W * (p2.y - m2.y)) / k;
  float laengs = dot(qm, A);
  float oben = smoothstep(-0.1, 0.5, n0.y);
  float bauch = smoothstep(-0.35, -0.75, n0.y);`;

/** Bauchschilde: breite Platten quer zur Achse (für Schlangen), mischt in c und n */
const BAUCHSCHILDE = /* glsl */ `
  float lp = dot(q, A) * k * 0.75;
  float bfuge = 1.0 - smoothstep(0.0, 0.08, min(fract(lp), 1.0 - fract(lp)));
  vec3 bc = bauchFarbe * (0.92 + 0.12 * hash11(floor(lp))) * (1.0 - 0.55 * bfuge);
  c = mix(c, bc, bauch);
  n = normalize(mix(n, normalize(n0 + A * (fract(lp) - 0.5) * 0.4), bauch));`;

export const SCHLANGE = tier(
  'schlange',
  'Python',
  'Python: glatte, rautenförmige Schuppen, die sich zum Schwanz hin überlappen, mit Schatten unter jeder Kante; Sättel mit schwarzem Rand Schuppe für Schuppe, Bauchschilde, Schimmer',
  /* glsl */ `
  float k = 24.0 * uR_groesse;
  float raute = 0.55;
  ${SCHUPPEN_KOPF}
  float m1 = snoise(vec3(dot(qm, A) * 1.9, dot(qm, B) * 2.5, dot(qm, C) * 2.5) + 3.0) + 0.15 * snoise(qm * 5.0);
  float mm = snoise(qm * 5.0 + 11.0);
  vec3 c = vec3(0.64, 0.5, 0.29);
  if (m1 > 0.2) c = vec3(0.3, 0.19, 0.085);
  if (abs(m1 - 0.2) < 0.1) c = vec3(0.055, 0.042, 0.03);
  if (m1 > 0.55 && mm > 0.5) c = vec3(0.9, 0.82, 0.56);
  c *= 0.88 + 0.24 * id;
  c *= 0.84 + 0.16 * smoothstep(-0.4, 0.3, d.x);
  c *= (1.0 - 0.7 * fuge) * (1.0 - 0.45 * unter);
  vec3 bauchFarbe = vec3(0.86, 0.8, 0.62);
  ${BAUCHSCHILDE}
  albedo = srgbZuLin(c);
  vec3 V = zumAuge(p);
  float nv = clamp(dot(n, V), 0.0, 1.0);
  albedo += max(spektral(420.0 + 280.0 * fract(nv * 1.6 + id * 0.15)), vec3(0.0)) * 0.015 * uR_schimmer * (1.0 - fuge) * pow(1.0 - nv, 1.5);
  glanz = 1.5;
  rauh = 0.26;`,
  false,
  GRUND_DSCHUNGEL,
  [
    { k: 'groesse', name: 'Schuppen', min: 0.4, max: 2.5, schritt: 0.05, grund: 1 },
    { k: 'schimmer', name: 'Schimmer', min: 0, max: 3, schritt: 0.05, grund: 1 },
  ],
);

export const KLAPPERSCHLANGE = tier(
  'klapperschlange',
  'Klapperschlange',
  'Gekielte Schuppen (ein Grat je Schuppe, matt), auf dem Rücken dunkle Rauten mit hellem Saum, am Schwanzende schwarze und weiße Ringe, Bauchschilde',
  /* glsl */ `
  float k = 30.0 * uR_groesse;
  float raute = 1.0;
  ${SCHUPPEN_KOPF}
  // Kiel: ein Grat längs der Mitte der Schuppe, am Rücken am stärksten
  float kiel = (1.0 - smoothstep(0.0, 0.11, abs(d.y))) * smoothstep(-0.7, 0.1, d.x) * (0.4 + 0.6 * oben) * (1.0 - fuge);
  vec3 quer = W - n0 * dot(W, n0);
  n = normalize(n - normalize(quer + 1e-5) * sign(d.y) * kiel * 0.5);
  // Rauten längs des Rückens (um die Spiegelebene), Spitze an Spitze: hellere Mitte, dunkle Raute, cremefarbener Saum
  float u = abs(fract(laengs / 0.5) - 0.5) * 2.0;
  float v = abs(qm.z) / 0.36;
  float rv = u + v + 0.05 * snoise(qm * 5.0);
  vec3 c = vec3(0.54, 0.47, 0.37) * (0.88 + 0.22 * hash12(m2 + 3.0));
  c = mix(c, vec3(0.45, 0.39, 0.3), step(0.75, hash12(m2 + 9.0)));
  // dunkle Flecken an den Flanken, zwischen den Rauten
  if (length(vec2(1.0 - u, (v - 1.65) * 0.8)) < 0.32) c = vec3(0.26, 0.2, 0.13);
  if (rv < 1.1) c = vec3(0.86, 0.8, 0.63);
  if (rv < 0.95) c = vec3(0.2, 0.14, 0.09);
  if (rv < 0.52) c = vec3(0.42, 0.32, 0.2);
  // Schwanzende: Ringe schwarz und weiß
  float schwanz = smoothstep(-0.55, -0.7, laengs);
  vec3 ringe = step(0.5, fract(laengs * 9.0)) > 0.5 ? vec3(0.9, 0.88, 0.82) : vec3(0.06, 0.05, 0.05);
  c = mix(c, ringe, schwanz);
  c *= (1.0 - 0.75 * fuge) * (1.0 - 0.4 * unter);
  vec3 bauchFarbe = vec3(0.82, 0.76, 0.6);
  ${BAUCHSCHILDE}
  albedo = srgbZuLin(c);
  glanz = 0.45;
  rauh = 0.55;`,
  false,
  GRUND_SAVANNE,
  [{ k: 'groesse', name: 'Schuppen', min: 0.4, max: 2.5, schritt: 0.05, grund: 1 }],
);

export const KORALLENNATTER = tier(
  'korallennatter',
  'Korallennatter',
  'Glatte, stark glänzende Schuppen in Ringen Rot, Gelb, Schwarz (Schuppe für Schuppe gezackt), die roten Schuppen mit schwarzer Spitze',
  /* glsl */ `
  float k = 26.0 * uR_groesse;
  float raute = 0.35;
  ${SCHUPPEN_KOPF}
  // Ringe längs der Achse: Rot breit, Gelb schmal, Schwarz breit, Gelb schmal; echt Schuppe für Schuppe, im Comic glatt
  vec3 qr = uR_stil > 0.5 ? q : qm;
  float rt = fract(dot(qr, A) * 1.9 * uR_ringe + 0.04 * snoise(qr * 3.0));
  vec3 rot = vec3(0.84, 0.1, 0.06), gelb = vec3(0.98, 0.84, 0.2), schwarz = vec3(0.025, 0.022, 0.028);
  vec3 c = rt < 0.38 ? rot : (rt < 0.5 ? gelb : (rt < 0.88 ? schwarz : gelb));
  // rote Schuppen mit schwarzer Spitze (am freien Rand)
  if (rt < 0.38 && uR_stil < 0.5) c = mix(c, schwarz, smoothstep(-0.2, -0.42, d.x) * step(0.45, hash12(m2 + 5.0)));
  c *= 0.92 + 0.16 * id;
  c *= (1.0 - (uR_stil > 0.5 ? 0.25 : 0.6) * fuge) * (1.0 - 0.4 * unter);
  vec3 bauchFarbe = rt < 0.4 ? vec3(0.9, 0.55, 0.45) : vec3(0.92, 0.88, 0.7);
  ${BAUCHSCHILDE}
  albedo = srgbZuLin(c);
  glanz = 1.9;
  rauh = 0.18;`,
  false,
  GRUND_WALD,
  [
    { k: 'groesse', name: 'Schuppen', min: 0.4, max: 2.5, schritt: 0.05, grund: 1 },
    { k: 'ringe', name: 'Ringe', min: 0.4, max: 2.5, schritt: 0.05, grund: 1 },
  ],
);

export const SALAMANDER = tier(
  'salamander',
  'Feuersalamander',
  'Glänzendes Schwarz mit gelben Flecken, die sich längs des Rückens zu Streifen verbinden, nasse Haut mit Poren, Wärzchen und Drüsenwülsten',
  /* glsl */ `
  vec3 A, B, C;
  achsen(A, B, C);
  float laengs = dot(q, A), quer = dot(q, B);
  // Flecken: längs gestreckt, teils zu Streifen verbunden, mit Löchern und Inseln
  float f1 = snoise(vec3(laengs * 1.9, quer * 4.2, q.z * 4.2) * uR_flecken + 3.0) + 0.45 * snoise(q * 6.0 * uR_flecken + 9.0) + 0.18 * snoise(q * 15.0);
  float aa = fwidth(f1) + 0.01;
  float gelb = smoothstep(0.3 - aa, 0.3 + aa, f1);
  // kleine runde Flecken an den Seiten
  vec3 tv = voronoi3(q * 9.0 * uR_flecken + 2.0);
  gelb = max(gelb, (1.0 - smoothstep(0.17 - aa, 0.21 + aa, tv.x + 0.04 * snoise(q * 25.0))) * step(0.72, tv.z) * (1.0 - smoothstep(0.4, 0.8, n0.y)));
  vec3 schwarz = vec3(0.016, 0.015, 0.018);
  vec3 gf = mix(vec3(1.0, 0.78, 0.05), vec3(0.98, 0.5, 0.03), smoothstep(-0.3, 0.7, snoise(q * 2.5 + 4.0)));
  albedo = srgbZuLin(mix(schwarz, gf, gelb));
  // nasse Haut: Poren (Grübchen) und Wärzchen als Höhe, die Normale aus Differenzen
  float hs = salamanderHaut(q);
  const float e = 0.004;
  vec3 grs = vec3(salamanderHaut(q + vec3(e, 0.0, 0.0)) - hs, salamanderHaut(q + vec3(0.0, e, 0.0)) - hs, salamanderHaut(q + vec3(0.0, 0.0, e)) - hs) / e;
  grs -= n0 * dot(grs, n0);
  n = normalize(n0 - grs * 0.006);
  glanz = 2.6;
  rauh = 0.1;`,
  false,
  GRUND_WALD,
  [{ k: 'flecken', name: 'Fleckengröße', min: 0.4, max: 2.5, schritt: 0.05, grund: 1 }],
);

export const ELEFANT = tier(
  'elefant',
  'Elefant',
  'Haut wie beim Elefanten: ein Netz tiefer Furchen in unregelmäßigen Feldern, feinere Furchen darin, Querfalten, Staub auf den Kuppen, stumpfes Grau mit rosa Flecken',
  /* glsl */ `
  vec3 A, B, C;
  achsen(A, B, C);
  float h0 = elefantRelief(q, A);
  const float e = 0.0025;
  vec3 gr = vec3(elefantRelief(q + vec3(e, 0.0, 0.0), A) - h0, elefantRelief(q + vec3(0.0, e, 0.0), A) - h0, elefantRelief(q + vec3(0.0, 0.0, e), A) - h0) / e;
  gr -= n0 * dot(gr, n0);
  vec3 korn = vec3(snoise(q * 150.0), snoise(q * 150.0 + 3.0), snoise(q * 150.0 + 6.0));
  n = normalize(n0 - gr * 0.0075 + (korn - n0 * dot(korn, n0)) * 0.08);
  float tief = smoothstep(-0.2, -0.75, h0);
  vec3 grau = vec3(0.47, 0.45, 0.43) * (0.9 + 0.16 * snoise(q * 2.5) + 0.06 * snoise(q * 60.0));
  grau = mix(grau, vec3(0.62, 0.5, 0.47), smoothstep(0.45, 0.7, fbm3n(q * 3.0 + 7.0, 3)) * 0.6);
  vec3 staub = vec3(0.66, 0.58, 0.46);
  vec3 c = mix(grau, staub, smoothstep(0.15, 0.6, h0) * smoothstep(0.1, 0.6, n0.y + 0.3) * 0.45);
  c *= 1.0 - 0.6 * tief;
  albedo = srgbZuLin(c);
  glanz = 0.04;
  rauh = 0.95;`,
  false,
  GRUND_SAVANNE,
);

export const KROKODIL = tier(
  'krokodil',
  'Krokodil',
  'Panzer: oben Knochenplatten in Längsreihen, jede mit Grat, Hang und Grübchen; an den Flanken runde Schuppen in versetzten Reihen mit dunklen Flecken; am Bauch glatte Schilde; tiefe Fugen, nass in Flecken',
  /* glsl */ `
  vec3 A, B, C;
  achsen(A, B, C);
  vec3 U, W;
  int eb = schuppenEbene(n0, q, A, U, W);
  bool oben = eb == 1 && n0.y > 0.0;
  bool unten = eb == 1 && n0.y <= 0.0;
  float k = (oben ? 8.5 : (unten ? 12.0 : 17.0)) * uR_groesse;
  vec2 p2 = vec2(dot(q, U), dot(q, W)) * k + float(eb) * 11.7;
  vec2 d, m2, aussen;
  float id;
  float f = platteRund(p2, oben ? 1.1 : (unten ? 1.35 : 1.0), oben ? 0.0 : 1.0, oben ? 0.12 : (unten ? 0.1 : 0.34), oben ? 0.1 : 0.08, d, m2, id, aussen);
  float aaK = fwidth(f) + 0.008;
  float fuge = 1.0 - smoothstep(-aaK, 0.01 + aaK, f);
  float hang = 1.0 - smoothstep(0.0, oben ? 0.2 : 0.14, f);
  // Höhe: Hang zum Rand, Wölbung, oben ein Grat längs der Mitte (zum Schwanz hin höher)
  vec2 gh = (-aussen * hang * (oben ? 1.3 : 1.6) - d * (oben ? 0.5 : 1.1)) * (1.0 - fuge);
  float kiel = 0.0;
  if (oben) {
    kiel = (1.0 - smoothstep(0.03, 0.11, abs(d.y))) * smoothstep(-0.5, 0.3, d.x) * (1.0 - fuge) * step(0.12, f);
    gh.y -= sign(d.y) * kiel * 1.6;
  }
  // Grübchen auf den Platten
  vec3 gv = voronoi3(q * 70.0);
  float gruebchen = smoothstep(0.18, 0.05, gv.x) * (oben ? 1.0 : 0.3) * (1.0 - fuge);
  vec3 gg = vec3(snoise(q * 70.0), snoise(q * 70.0 + 2.0), snoise(q * 70.0 + 4.0)) * gruebchen * 0.25;
  vec3 gw = U * gh.x + W * gh.y + gg;
  n = normalize(n0 - (gw - n0 * dot(gw, n0)) * 0.45);
  // Farbe je Platte: Querbänder, an den Flanken dunkle Flecken, der Grat abgerieben heller
  vec3 qm = q - (U * (p2.x - m2.x) + W * (p2.y - m2.y)) / k;
  float band = smoothstep(-0.05, 0.2, snoise(vec3(dot(qm, A) * 4.0, 0.0, 3.0) + 0.5 * snoise(qm * 2.0)));
  vec3 c;
  if (oben) c = mix(vec3(0.27, 0.27, 0.17), vec3(0.12, 0.125, 0.08), band) * (0.84 + 0.3 * id);
  else if (unten) c = vec3(0.8, 0.76, 0.58) * (0.92 + 0.12 * id);
  else c = mix(vec3(0.35, 0.34, 0.21), vec3(0.13, 0.13, 0.085), max(band * 0.7, step(0.35, snoise(qm * 6.0 + 2.0)))) * (0.86 + 0.26 * id);
  c = mix(c, c * 1.45 + 0.03, kiel * 0.6);
  // nass in Flecken: dunkler, glatter
  float nass = smoothstep(0.05, 0.4, snoise(q * 2.2 + 8.0));
  c *= mix(1.0, 0.8, nass);
  c *= (1.0 - 0.82 * fuge) * (1.0 - 0.3 * hang) * (1.0 - 0.3 * gruebchen);
  albedo = srgbZuLin(c);
  glanz = mix(0.5, 1.7, nass);
  rauh = mix(0.5, 0.17, nass);`,
  false,
  GRUND_FLUSS,
  [{ k: 'groesse', name: 'Plattengröße', min: 0.4, max: 2.5, schritt: 0.05, grund: 1 }],
);
