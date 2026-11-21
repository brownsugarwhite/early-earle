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

/** Zellen, Phasor-Rauschen und Achsen (ohne Ableitungen: auch im Vertex-Shader nutzbar) */
export const TIER_ZELLEN = /* glsl */ `
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
`;

export const TIER = /* glsl */ `
${TIER_ZELLEN}
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
