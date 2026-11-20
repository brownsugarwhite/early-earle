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
/**
 * Phasor-Rauschen (Tricard u. a. 2019): eine Summe von Gabor-Kernen auf einem Raster; aus der Phase der Summe werden Streifen, die
 * gleich breit bleiben, sich gabeln und enden (dort, wo der Betrag klein ist). x in Rasterzellen, f Wellen je Zelle, streu: wie weit
 * die Richtung der Kerne um die Achse streut. Ergebnis: Summe als komplexe Zahl.
 */
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
/**
 * Welche Ebene trägt die Schuppen an dieser Stelle (0: Seite, 1: oben/unten, 2: vorn/hinten), nach der Normale, die Grenzen verrauscht
 * (wie echte Wechsel der Schuppenrichtung); U läuft längs der Körperachse, wo sie in der Ebene liegt, W quer.
 */
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
 * Schuppen in einer Ebene, die sich überlappen: Reihen längs x, jede zweite um eine halbe Zelle versetzt (schräge Reihen); jede
 * Schuppe hinten (gegen x) länger, die vordere deckt. raute: 0 rund, 1 Raute. Ergebnis: Abstand zum sichtbaren Rand (Zellen).
 */
float schuppe2(vec2 p, float raute, out vec2 d, out vec2 mitte, out float id) {
  vec2 ip = floor(p);
  float best = -1e9, rand = 0.0;
  d = vec2(0.0); mitte = vec2(0.0); id = 0.0;
  for (int j = -1; j <= 2; j++)
    for (int i = -1; i <= 1; i++) {
      vec2 c = ip + vec2(float(j), float(i));
      float versatz = 0.5 * mod(c.x, 2.0);
      vec2 m = c + vec2(0.5, 0.5 + versatz) + 0.05 * (hash22(c) - 0.5);
      vec2 dd = p - m;
      vec2 sc = vec2(dd.x * (dd.x < 0.0 ? 0.6 : 1.35), dd.y);
      float r = mix(length(sc), abs(sc.x) + abs(sc.y) * 1.05, raute);
      float R = mix(0.84, 1.06, raute);
      if (r < R && m.x > best) { best = m.x; rand = R - r; d = dd; mitte = m; id = hash12(c + 0.3); }
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
  // quer zur Körperachse: tiefe Falten, die auslaufen
  float fl = dot(q, A) * 26.0 + 2.5 * snoise(q * 2.0);
  float falte = pow(1.0 - abs(sin(fl)), 6.0) * smoothstep(-0.2, 0.4, snoise(q * 1.5 + 9.0));
  // Kuppen zwischen den Furchen
  float kuppe = smoothstep(0.0, 0.35, f1) * 0.25 + 0.08 * snoise(q * 40.0);
  return kuppe - gross * 0.85 - fein * 0.35 - falte * 0.6;
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
  vec4 z = zelle3(q * 9.5 * uR_groesse, id);
  vec3 richtung = normalize(z.xyz + 1e-4);
  // der Ring zerfällt in drei bis fünf Bruchstücke (Lücken nach dem Winkel um die Mitte)
  float bruch = sin(atan(dot(richtung, vec3(0.6, 0.8, 0.0)), dot(richtung, vec3(0.0, 0.0, 1.0)) + id * 3.0) * (3.0 + floor(id * 2.99)) + id * 20.0) + 0.6 * snoise(richtung * 3.0 + id * 30.0);
  float wellig = 0.07 * snoise(q * 24.0);
  float aaL = fwidth(z.w) * 0.8 + 0.01;
  float ring = smoothstep(0.1 + aaL, 0.1 - aaL, abs(z.w - 0.37 - wellig)) * step(-0.35, bruch);
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
  // Die Wellen laufen längs der längsten Achse der Form, die Streifen stehen quer dazu (liegt sie, senkrecht; steht sie, rundherum)
  vec3 ach = pow(uHalb / max(uHalb.x, uHalb.y), vec3(4.0));
  vec3 achse = normalize(vec3(ach.x, ach.y, 0.0) + vec3(1e-3, 0.0, 0.0));
  vec2 ph = phasor3(q * 3.7 * uR_groesse, achse, 1.75, 0.4);
  float amp = length(ph);
  float welle = ph.y / max(amp, 1e-4);
  // Schwelle: wo sie steigt, werden die Streifen schmal und enden spitz; oben breiter, zum Bauch und an den Enden der Achse dünn
  float schwelle = 0.25 + 0.45 * smoothstep(-0.3, 0.6, snoise(q * 1.7 + 3.0)) - 0.2 * smoothstep(0.2, 0.8, n0.y);
  schwelle = mix(schwelle, 1.1, smoothstep(-0.2, -0.75, n0.y));
  schwelle = mix(schwelle, 1.1, smoothstep(0.65, 0.92, abs(dot(n0, achse))));
  // an den Gabelungen (kleiner Betrag) brechen die Streifen ab
  schwelle = mix(1.1, schwelle, smoothstep(0.08, 0.3, amp));
  float aa = fwidth(welle) * 0.9 + 0.01;
  float streifen = smoothstep(schwelle - aa, schwelle + aa, welle);
  float bauch = smoothstep(-0.05, -0.55, n0.y);
  vec3 orange = mix(vec3(0.8, 0.38, 0.09), vec3(0.93, 0.63, 0.32), smoothstep(0.3, -0.3, n0.y));
  orange *= 0.92 + 0.16 * snoise(q * 3.0 + 1.0);
  albedo = srgbZuLin(mix(orange, vec3(0.95, 0.92, 0.86), bauch));
  albedo = mix(albedo, srgbZuLin(vec3(0.05, 0.034, 0.028)), streifen);
  glanz = 0.2;
  rauh = 0.7;`,
  true,
  GRUND_DSCHUNGEL,
  [{ k: 'groesse', name: 'Streifen', min: 0.4, max: 2.5, schritt: 0.05, grund: 1 }],
);

export const SCHLANGE = tier(
  'schlange',
  'Schlange',
  'Python: rautenförmige Schuppen in schrägen Reihen, die sich zum Schwanz hin überlappen; das Muster sitzt Schuppe für Schuppe, breite Bauchschilde, Glanz und ein Hauch Regenbogen',
  /* glsl */ `
  vec3 A, B, C;
  achsen(A, B, C);
  vec3 U, W;
  int eb = schuppenEbene(n0, q, A, U, W);
  float k = 17.0 * uR_groesse;
  vec2 p2 = vec2(dot(q, U), dot(q, W)) * k + float(eb) * 17.3;
  vec2 d, m2;
  float id;
  float rand = schuppe2(p2, 0.55, d, m2, id);
  float fuge = 1.0 - smoothstep(0.0, 0.08, rand);
  // gewölbt: die Normale kippt mit der Lage in der Schuppe, hinten (frei) stärker
  vec3 g = U * d.x * 0.75 + W * d.y;
  g -= n0 * dot(g, n0);
  n = normalize(n0 + g * 0.5 * (1.0 - fuge));
  // das Muster an der Mitte der Schuppe: jede Schuppe hat genau eine Farbe
  vec3 qm = q - (U * (p2.x - m2.x) + W * (p2.y - m2.y)) / k;
  float m1 = snoise(vec3(dot(qm, A) * 1.9, dot(qm, B) * 2.5, dot(qm, C) * 2.5) + 3.0) + 0.15 * snoise(qm * 5.0);
  float mm = snoise(qm * 5.0 + 11.0);
  vec3 gold = vec3(0.7, 0.53, 0.24), braun = vec3(0.3, 0.19, 0.085), schwarz = vec3(0.055, 0.042, 0.03), hell = vec3(0.9, 0.82, 0.56);
  vec3 c = gold;
  if (m1 > 0.2) c = braun;
  if (abs(m1 - 0.2) < 0.1) c = schwarz;
  if (m1 > 0.55 && mm > 0.5) c = hell;
  c *= 0.88 + 0.24 * id;
  c *= 0.84 + 0.16 * smoothstep(-0.4, 0.3, d.x);
  c *= 1.0 - 0.7 * fuge;
  // Bauchschilde: breite Platten quer zur Achse
  float bauch = smoothstep(-0.35, -0.75, n0.y);
  float lp = dot(q, A) * k * 0.75;
  float bfuge = 1.0 - smoothstep(0.0, 0.08, min(fract(lp), 1.0 - fract(lp)));
  vec3 bc = vec3(0.86, 0.8, 0.62) * (0.92 + 0.12 * hash11(floor(lp))) * (1.0 - 0.55 * bfuge);
  c = mix(c, bc, bauch);
  n = normalize(mix(n, normalize(n0 + A * (fract(lp) - 0.5) * 0.4), bauch));
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

export const ELEFANT = tier(
  'elefant',
  'Elefant',
  'Haut wie beim Elefanten: ein Netz tiefer Furchen in unregelmäßigen Feldern, feinere Furchen darin, quer laufende Falten, Staub auf den Kuppen, stumpfes Grau mit rosa Flecken',
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
  // rosa Flecken (Pigmentverlust) an manchen Stellen
  grau = mix(grau, vec3(0.62, 0.5, 0.47), smoothstep(0.45, 0.7, fbm3n(q * 3.0 + 7.0, 3)) * 0.6);
  vec3 staub = vec3(0.66, 0.58, 0.46);
  vec3 c = mix(grau, staub, smoothstep(0.15, 0.6, h0) * smoothstep(0.1, 0.6, n0.y + 0.3) * 0.45);
  c *= 1.0 - 0.6 * tief;
  albedo = srgbZuLin(c);
  glanz = 0.04;
  rauh = 0.95;`,
  false,
  GRUND_SAVANNE,
  [],
);

export const GIRAFFE = tier(
  'giraffe',
  'Giraffe',
  'Braune Flecken mit gezackten Rändern, getrennt von hellen Adern, jeder Fleck in eigenem Ton, Fell mit Haarsaum',
  /* glsl */ `
  vec3 w = q * 4.6 * uR_groesse;
  w += 0.14 * vec3(snoise(q * 5.0), snoise(q * 5.0 + 3.0), snoise(q * 5.0 + 6.0));
  vec3 vo = voronoi3(w);
  // gezackter Rand (fein verrauscht), Adern gleich breit und scharf
  float zack = 0.025 * snoise(q * 45.0) + 0.012 * snoise(q * 110.0);
  float aa = fwidth(vo.y - vo.x) * 0.8 + 0.004;
  float ader = 1.0 - smoothstep(0.075 - aa, 0.075 + aa, vo.y - vo.x + zack);
  vec3 fleck = mix(vec3(0.6, 0.31, 0.12), vec3(0.44, 0.2, 0.08), hash11(vo.z * 13.0));
  // zur Mitte hin dunkler, am Rand etwas heller (wie beim Netzgiraffen-Fell)
  fleck *= 0.8 + 0.25 * smoothstep(0.0, 0.3, vo.y - vo.x);
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
  'Panzer: oben große Schilde in Reihen mit Kiel, an den Flanken kleinere, am Bauch ein feines Gitter heller Platten; tiefe Fugen, Bänder Schild für Schild, nass glänzend',
  /* glsl */ `
  vec3 A, B, C;
  achsen(A, B, C);
  vec3 U, W;
  int eb = schuppenEbene(n0, q, A, U, W);
  bool oben = eb == 1 && n0.y > 0.0;
  bool unten = eb == 1 && n0.y <= 0.0;
  float k = (oben ? 6.5 : (unten ? 13.0 : 10.0)) * uR_groesse;
  vec2 p2 = vec2(dot(q, U), dot(q, W)) * k + float(eb) * 11.7;
  vec2 d, m2;
  float id;
  float f = platte2(p2, oben ? 1.25 : (unten ? 1.6 : 1.0), oben ? 0.0 : 1.0, d, m2, id);
  float fuge = 1.0 - smoothstep(0.02, 0.1, f);
  // gewölbte Schilde; oben ein Kiel längs der Mitte
  vec3 g = U * d.x + W * d.y;
  g -= n0 * dot(g, n0);
  float kiel = (oben ? 1.0 : 0.0) * (1.0 - smoothstep(0.0, 0.12, abs(d.y))) * step(0.3, id);
  vec3 quer = W - n0 * dot(W, n0);
  n = normalize(n0 + g * 0.6 * (1.0 - fuge) - normalize(quer + 1e-5) * sign(d.y) * kiel * 0.45 - g * fuge * 1.1);
  // Farbe Schild für Schild
  vec3 qm = q - (U * (p2.x - m2.x) + W * (p2.y - m2.y)) / k;
  float band = step(0.1, snoise(vec3(dot(qm, A) * 4.5, 0.0, 3.0) + 0.6 * snoise(qm * 2.0)));
  vec3 c;
  if (oben) c = mix(vec3(0.2, 0.22, 0.12), vec3(0.085, 0.095, 0.055), band) * (0.86 + 0.28 * id);
  else if (unten) c = vec3(0.82, 0.78, 0.6) * (0.93 + 0.1 * id);
  else c = mix(vec3(0.36, 0.35, 0.19), vec3(0.11, 0.11, 0.065), step(0.55, snoise(qm * 5.0 + 2.0))) * (0.88 + 0.24 * id);
  c = mix(c, c * 1.35, kiel * 0.5);
  c *= 1.0 - 0.75 * fuge;
  albedo = srgbZuLin(c);
  glanz = 1.8;
  rauh = 0.22;`,
  false,
  GRUND_FLUSS,
  [{ k: 'groesse', name: 'Plattengröße', min: 0.4, max: 2.5, schritt: 0.05, grund: 1 }],
);
