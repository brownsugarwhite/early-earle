/**
 * Barcelona (Florian, 21.11.: „3 schader neu entwickeln die von antoni gaudi und barcelona inspiriert sind“):
 * - **Trencadís** (Park Güell, der Salamander „El Drac“, die Schlangenbank): Scherben glasierter Fliesen, gebrochen, mit weißem
 *   Mörtel in den Fugen. Scherben sind Zellen im Raum (hier gewollt unregelmäßig), jede leicht verkippt (die Glasur spiegelt je Scherbe
 *   anders: das Funkeln des Mosaiks), mit gerundeter Kante; Farben in Zonen (Kobalt und Türkis, Gelb und Orange, Grün), einige
 *   Scherben aus bemalten Fliesen (Blüten, Ringe, Streifen). Bühne: Himmel über Barcelona.
 * - **Casa Batlló** (das Dach als Drachenrücken): runde Keramikschuppen, die sich wie Dachziegel decken (die obere liegt auf der
 *   unteren, Schatten unter ihrer Kante), mit Lüsterglasur: die Farbe schillert mit dem Blick (dünne Schicht), über den Körper von
 *   Tiefblau über Grün und Gold zu Rosa. Bühne: Abendhimmel.
 * - **Sagrada Família** (das Licht im Inneren): heller Stein vom Montjuïc, beleuchtet durch Fenster aus farbigem Glas: kühl (Blau,
 *   Grün) von links, warm (Rot, Orange, Gold) von rechts; jedes Fenster ein Mosaik aus Scheiben mit Bleistegen, das als farbiges
 *   Licht auf der Form liegt. Bühne: das Innere mit Säulen, die sich wie Bäume verzweigen, und farbigen Lichtbahnen.
 */
import type { ReglerZeile, Voreinstellung } from '../kern';
import { bildVoreinstellung } from '../bildShader';
import { BUEHNEN } from './buehnen';

/** Zellen im Raum mit Mitte: F1, F2, Kennung, Mitte der nächsten */
const ZELLE_MIT_MITTE = /* glsl */ `
vec3 zelleMitte(vec3 x, out vec3 mitte) {
  vec3 p = floor(x), f = fract(x);
  float d1 = 8.0, d2 = 8.0, id = 0.0;
  mitte = p;
  for (int k = -1; k <= 1; k++)
    for (int j = -1; j <= 1; j++)
      for (int i = -1; i <= 1; i++) {
        vec3 b = vec3(float(i), float(j), float(k));
        vec3 o = hash33(p + b);
        vec3 r = b + o - f;
        float d = dot(r, r);
        if (d < d1) { d2 = d1; d1 = d; id = hash13(p + b + 0.37); mitte = p + b + o; } else if (d < d2) d2 = d;
      }
  return vec3(sqrt(d1), sqrt(d2), id);
}
`;

const TRENCADIS_GLSL = /* glsl */ `
${BUEHNEN}
${ZELLE_MIT_MITTE}
vec3 glasur(float zone, float h) {
  // Zonen: 0 Kobalt und Türkis, 1 Gelb und Orange, 2 Grün; je Zone vier Glasuren und Weiß
  if (h > 0.86) return vec3(0.93, 0.92, 0.88);
  int k = int(h * 4.0 / 0.86);
  if (zone < 0.33) return k == 0 ? vec3(0.04, 0.16, 0.6) : (k == 1 ? vec3(0.05, 0.52, 0.66) : (k == 2 ? vec3(0.42, 0.7, 0.88) : vec3(0.1, 0.3, 0.75)));
  if (zone < 0.66) return k == 0 ? vec3(0.95, 0.76, 0.08) : (k == 1 ? vec3(0.93, 0.45, 0.06) : (k == 2 ? vec3(0.78, 0.16, 0.08) : vec3(0.98, 0.88, 0.35)));
  return k == 0 ? vec3(0.12, 0.5, 0.22) : (k == 1 ? vec3(0.48, 0.72, 0.18) : (k == 2 ? vec3(0.05, 0.5, 0.48) : vec3(0.72, 0.82, 0.3)));
}
void main() {
  GPunkt g = gLesen(vUv);
  float maske = deckungBei(vUv);
  vec2 css = gl_FragCoord.xy / uDpr;
  vec2 qb = gl_FragCoord.xy / uAufl;
  vec3 bild = uBuehne > 0.5 ? himmelBlau(css, qb) : vec3(0.0);
  float a = uBuehne > 0.5 ? 1.0 : 0.0;
  if (g.a > 0.5) {
    vec3 V = zumAuge(g.p);
    vec3 n0 = g.n;
    vec3 q = (g.p - uMitte) / uRadius;
    float S = 13.0 * uR_scherben;
    vec3 m;
    vec3 z = zelleMitte(q * S + 0.1 * vec3(snoise(q * 3.0), snoise(q * 3.0 + 4.0), snoise(q * 3.0 + 8.0)), m);
    float rand = z.y - z.x;
    float aa = fwidth(rand) + 1e-3;
    float fuge = 1.0 - smoothstep(0.05 * uR_fuge, 0.05 * uR_fuge + aa * 1.5, rand);
    // Kante der Scherbe gerundet: zur Fuge hin kippt die Glasur nach außen
    vec3 zuMitte = m / S - q;
    zuMitte -= n0 * dot(zuMitte, n0);
    float kante = 1.0 - smoothstep(0.05 * uR_fuge, 0.05 * uR_fuge + 0.14, rand);
    vec3 nS = normalize(n0 + 0.16 * (hash33(m * 1.7) - 0.5) - normalize(zuMitte + 1e-5) * kante * 0.55);
    float zone = clamp(0.5 + 0.6 * (snoise(q * 0.6 + 2.0) * 0.85 + snoise(q * 1.7) * 0.15), 0.0, 0.999);
    vec3 alb = glasur(zone, z.z);
    // bemalte Scherben (Reste alter Fliesen): Blüte, Ringe oder Streifen in Weiß und Blau
    if (hash11(z.z * 91.0) < 0.1) {
      vec3 t1 = normalize(cross(n0, vec3(0.31, 0.93, 0.17)));
      vec3 t2 = cross(n0, t1);
      vec3 d = (q - m / S) * S;
      vec2 uv = vec2(dot(d, t1), dot(d, t2)) * 3.0 + hash33(m).xy * 2.0;
      float art = hash11(z.z * 13.0);
      float motiv;
      float w = atan(uv.y, uv.x);
      float r = length(uv);
      if (art < 0.6) motiv = smoothstep(0.05, 0.0, abs(r - 0.55 - 0.22 * cos(w * 6.0)) - 0.05) + smoothstep(0.2, 0.12, r);
      else motiv = smoothstep(0.06, 0.0, abs(fract(uv.x * 1.3 + 0.2 * sin(uv.y * 3.0)) - 0.5) - 0.1);
      alb = mix(vec3(0.94, 0.93, 0.88), vec3(0.06, 0.2, 0.62), clamp(motiv, 0.0, 1.0) * 0.9);
    }
    vec3 L = ausSicht(normalize(vec3(-0.5, 0.72, 0.5)));
    vec3 la = srgbZuLin(alb);
    float nl = max(dot(nS, L), 0.0);
    vec3 c = la * (vec3(1.0, 0.95, 0.86) * 2.2 * nl + mix(vec3(0.16, 0.15, 0.14), vec3(0.3, 0.38, 0.55), nS.y * 0.5 + 0.5) * 0.8);
    float nv = clamp(dot(nS, V), 0.0, 1.0);
    float fr = fresnelS(nv, 0.05);
    c += studio(reflect(-V, nS)) * fr * 0.9;
    vec3 H = normalize(L + V);
    c += vec3(1.0, 0.97, 0.9) * ggx(max(dot(nS, H), 0.0), 0.12) * fr * nl * 1.6;
    // Mörtel: matt, weiß, in der Fuge vertieft (dunkler)
    vec3 moertel = srgbZuLin(vec3(0.86, 0.84, 0.78) * (0.92 + 0.08 * snoise(q * 40.0)));
    vec3 cm = moertel * (vec3(1.0, 0.95, 0.86) * 2.0 * max(dot(n0, L), 0.0) * 0.8 + vec3(0.25, 0.28, 0.34) * 0.6) * 0.8;
    c = mix(c, cm, fuge);
    bild = mix(bild, c, maske);
    a = max(a, maske);
  }
  farbe = vec4(linZuSrgb(aces(bild)) * a, a);
}
`;

const BATLLO_GLSL = /* glsl */ `
${BUEHNEN}
/** Kandidaten im raumzentrierten Raster: je Teilraster die zwei nächsten Mitten */
void kandidaten(vec3 x, out vec3 k[4]) {
  vec3 a = floor(x) + 0.5;
  vec3 fa = x - a;
  vec3 ga = abs(fa);
  vec3 ea = ga.x > ga.y ? (ga.x > ga.z ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 0.0, 1.0)) : (ga.y > ga.z ? vec3(0.0, 1.0, 0.0) : vec3(0.0, 0.0, 1.0));
  vec3 b = floor(x + 0.5);
  vec3 fb = x - b;
  vec3 gb = abs(fb);
  vec3 eb = gb.x > gb.y ? (gb.x > gb.z ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 0.0, 1.0)) : (gb.y > gb.z ? vec3(0.0, 1.0, 0.0) : vec3(0.0, 0.0, 1.0));
  k[0] = a; k[1] = a + ea * sign(fa); k[2] = b; k[3] = b + eb * sign(fb);
}
vec3 abendHimmel(vec2 qb) {
  vec3 c = mix(vec3(0.98, 0.62, 0.42), vec3(0.32, 0.22, 0.52), smoothstep(0.05, 0.95, qb.y));
  c = mix(c, vec3(0.99, 0.82, 0.55), exp(-pow((qb.y - 0.12) * 5.0, 2.0)) * 0.6);
  return srgbZuLin(c);
}
void main() {
  GPunkt g = gLesen(vUv);
  float maske = deckungBei(vUv);
  vec2 qb = gl_FragCoord.xy / uAufl;
  vec3 bild = uBuehne > 0.5 ? abendHimmel(qb) : vec3(0.0);
  float a = uBuehne > 0.5 ? 1.0 : 0.0;
  if (g.a > 0.5) {
    vec3 V = zumAuge(g.p);
    vec3 n0 = g.n;
    vec3 q = (g.p - uMitte) / uRadius;
    float S = 7.0 * uR_ziegel;
    vec3 x = q * S;
    vec3 k[4];
    kandidaten(x, k);
    // die oberste Schuppe, die den Punkt deckt (die höhere deckt die tiefere wie Dachziegel)
    float bestR = -1e9;
    vec3 bestM = vec3(0.0);
    float bestD = 1.0;
    float schatten = 0.0;
    for (int i = 0; i < 4; i++) {
      vec3 m = k[i] + 0.12 * (hash33(k[i]) - 0.5);
      vec3 d = x - m;
      d -= n0 * dot(d, n0);
      // die Schuppe: ein Kreis, der nach unten etwas länger ist (freie Kante unten)
      float auf = dot(d, normalize(vec3(0.0, 1.0, 0.0) - n0 * n0.y + vec3(1e-4)));
      vec2 e = vec2(length(d - auf * normalize(vec3(0.0, 1.0, 0.0) - n0 * n0.y + vec3(1e-4))), auf);
      float r = length(e / vec2(0.62, auf < 0.0 ? 0.72 : 0.56));
      float rang = m.y + hash13(k[i]) * 0.05;
      if (r < 1.0 && rang > bestR) { bestR = rang; bestM = m; bestD = r; }
    }
    // Schatten unter der Kante der nächsthöheren Schuppe
    for (int i = 0; i < 4; i++) {
      vec3 m = k[i] + 0.12 * (hash33(k[i]) - 0.5);
      if (m.y <= bestR + 1e-4) continue;
      vec3 d = x - m;
      d -= n0 * dot(d, n0);
      float r = length(d / vec3(0.62, 0.78, 0.62));
      schatten = max(schatten, (1.0 - smoothstep(1.0, 1.22, r)) * step(1.0, r));
    }
    // Wölbung der Schuppe
    vec3 dm = x - bestM;
    dm -= n0 * dot(dm, n0);
    vec3 nS = normalize(n0 + dm * 0.55 * smoothstep(0.2, 1.0, bestD));
    // Grundfarbe über den Körper: unten Tiefblau, dann Grün, Gold, oben Rosa
    float hy = clamp(q.y / max(uHalb.y / uRadius, 0.2) * 0.5 + 0.5 + 0.12 * snoise(q * 1.5), 0.0, 1.0);
    vec3 grund = hy < 0.33 ? mix(vec3(0.03, 0.12, 0.38), vec3(0.03, 0.36, 0.34), hy / 0.33) : (hy < 0.66 ? mix(vec3(0.03, 0.36, 0.34), vec3(0.62, 0.48, 0.12), (hy - 0.33) / 0.33) : mix(vec3(0.62, 0.48, 0.12), vec3(0.66, 0.24, 0.42), (hy - 0.66) / 0.34));
    grund *= 0.88 + 0.24 * hash13(bestM);
    // Lüster: dünne Schicht, die Farbe dreht mit dem Blick
    float nv = clamp(dot(nS, V), 0.0, 1.0);
    vec3 luester = hsv(vec3(fract(0.55 + 0.9 * (1.0 - nv) + 0.25 * hash13(bestM * 2.1) + 0.15 * snoise(q * 4.0)), 0.75, 1.0));
    vec3 L = ausSicht(normalize(vec3(-0.45, 0.75, 0.5)));
    float nl = max(dot(nS, L), 0.0);
    vec3 la = srgbZuLin(grund);
    vec3 c = la * (vec3(1.0, 0.9, 0.78) * 1.9 * nl + vec3(0.35, 0.28, 0.42) * 0.5);
    float fr = fresnelS(nv, 0.08);
    c += studio(reflect(-V, nS)) * mix(vec3(1.0), srgbZuLin(luester), 0.85 * uR_luester) * (fr * 0.9 + 0.3 * uR_luester);
    vec3 H = normalize(L + V);
    c += mix(vec3(1.0), srgbZuLin(luester), 0.6) * ggx(max(dot(nS, H), 0.0), 0.1) * 0.05 * nl;
    // Fugen zwischen den Schuppen und der Schatten der oberen
    c *= 1.0 - 0.55 * schatten;
    c *= mix(0.25, 1.0, smoothstep(1.0, 0.93, bestD));
    bild = mix(bild, c, maske);
    a = max(a, maske);
  }
  farbe = vec4(linZuSrgb(aces(bild)) * a, a);
}
`;

const SAGRADA_GLSL = /* glsl */ `
${ZELLE_MIT_MITTE}
/** Farbe einer Glasscheibe (kühl: Blau, Türkis, Grün, Violett; warm: Rot, Orange, Gold, Karmin), dazu wenige klare */
vec3 scheibe(float h, bool warm) {
  if (warm) return h < 0.3 ? vec3(1.0, 0.25, 0.08) : (h < 0.55 ? vec3(1.0, 0.55, 0.06) : (h < 0.75 ? vec3(1.0, 0.82, 0.25) : (h < 0.9 ? vec3(0.85, 0.1, 0.18) : vec3(1.0, 0.95, 0.8))));
  return h < 0.3 ? vec3(0.1, 0.35, 1.0) : (h < 0.55 ? vec3(0.08, 0.75, 0.62) : (h < 0.75 ? vec3(0.3, 0.85, 0.25) : (h < 0.9 ? vec3(0.45, 0.2, 0.95) : vec3(0.85, 0.95, 1.0))));
}
/** das Licht eines Fensters auf dem Stein (uv quer zum Licht): hohe Fensterbahnen, darin weiche Flecken in den Farben der
 *  Scheiben (das Glas ist weit weg, die Ränder verschwimmen: die zwei nächsten Scheiben werden gemischt) */
vec3 fenster(vec2 uv, bool warm) {
  vec2 x = uv * 6.0 + (warm ? vec2(17.0, 3.0) : vec2(0.0));
  vec2 p = floor(x), f = fract(x);
  float d1 = 8.0, d2 = 8.0, h1 = 0.0, h2 = 0.0;
  for (int j = -1; j <= 1; j++)
    for (int i = -1; i <= 1; i++) {
      vec2 b = vec2(float(i), float(j));
      vec2 r = b + hash22(p + b) - f;
      float d = dot(r, r);
      float h = hash12(p + b + 0.37);
      if (d < d1) { d2 = d1; h2 = h1; d1 = d; h1 = h; } else if (d < d2) { d2 = d; h2 = h; }
    }
  float w = smoothstep(0.0, 0.35, sqrt(d2) - sqrt(d1));
  vec3 c = mix(mix(scheibe(h1, warm), scheibe(h2, warm), 0.5), scheibe(h1, warm), w);
  float hell = mix(0.5 * (hash11(h1 * 31.0) + hash11(h2 * 31.0)), hash11(h1 * 31.0), w);
  float bahn = smoothstep(0.42, 0.22, abs(fract(uv.x * 1.15 + 0.5) - 0.5));
  return c * (0.45 + 0.8 * hell) * mix(0.18, 1.0, bahn);
}
/** das Innere: warmes Licht von oben im Dunst, schräge farbige Lichtbahnen (kühl links, warm rechts), helle Säulen, die sich
 *  oben wie Bäume verzweigen, ferne blasser */
vec3 innenraum(vec2 qb) {
  float asp = uAufl.x / uAufl.y;
  vec2 u = vec2(qb.x * asp, qb.y);
  vec3 c = mix(vec3(0.15, 0.14, 0.14), vec3(0.44, 0.42, 0.4), smoothstep(0.0, 1.0, qb.y));
  float b1 = exp(-pow((u.x - (0.1 * asp + (1.0 - qb.y) * 0.35)) * 3.0, 2.0));
  float b2 = exp(-pow((u.x - (0.9 * asp - (1.0 - qb.y) * 0.35)) * 3.0, 2.0));
  c += vec3(0.06, 0.26, 0.5) * b1 * (0.3 + 0.7 * qb.y) + vec3(0.58, 0.24, 0.05) * b2 * (0.3 + 0.7 * qb.y);
  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    float tiefe = hash11(fi * 3.7);
    float x = (fi + 0.5) / 7.0 * asp + (hash11(fi * 1.3) - 0.5) * 0.12;
    float br = mix(0.024, 0.009, tiefe);
    float v1 = mix(0.5, 0.68, hash11(fi * 5.1));
    float d = abs(u.x - x) - br;
    if (u.y > v1) {
      float t = u.y - v1;
      d = min(min(abs(u.x - x - t * 0.38) - br * 0.6, abs(u.x - x + t * 0.38) - br * 0.6), abs(u.x - x - t * 0.05) - br * 0.5);
      if (t > 0.16) {
        float t2 = t - 0.16;
        float x1 = x + 0.16 * 0.38;
        float x2 = x - 0.16 * 0.38;
        d = min(d, min(abs(u.x - x1 - t2 * 0.55) - br * 0.35, abs(u.x - x1 + t2 * 0.2) - br * 0.35));
        d = min(d, min(abs(u.x - x2 + t2 * 0.55) - br * 0.35, abs(u.x - x2 - t2 * 0.2) - br * 0.35));
      }
    }
    float sk = 1.0 - smoothstep(-0.002, 0.003, d);
    vec3 farbeS = mix(vec3(0.52, 0.49, 0.45), c * 1.12, tiefe * 0.7);
    c = mix(c, farbeS * (0.8 + 0.2 * qb.y), sk * mix(0.9, 0.45, tiefe));
  }
  return srgbZuLin(c);
}
void main() {
  GPunkt g = gLesen(vUv);
  float maske = deckungBei(vUv);
  vec2 qb = gl_FragCoord.xy / uAufl;
  vec3 bild = uBuehne > 0.5 ? innenraum(qb) : vec3(0.0);
  float a = uBuehne > 0.5 ? 1.0 : 0.0;
  if (g.a > 0.5) {
    vec3 V = zumAuge(g.p);
    vec3 n = g.n;
    vec3 q = (g.p - uMitte) / uRadius;
    // heller Stein vom Montjuïc: warmes Beige, feines Korn, leichte Wolken
    vec3 alb = vec3(0.82, 0.76, 0.66) * (0.9 + 0.1 * snoise(q * 3.0) + 0.05 * snoise(q * 40.0));
    vec3 la = srgbZuLin(alb);
    // zwei Fenster: kühl von links oben, warm von rechts oben (am Blick ausgerichtet)
    vec3 L1 = ausSicht(normalize(vec3(-0.75, 0.45, 0.35)));
    vec3 L2 = ausSicht(normalize(vec3(0.8, 0.4, 0.3)));
    vec3 t1 = normalize(cross(L1, vec3(0.0, 1.0, 0.0)));
    vec3 b1 = cross(t1, L1);
    vec3 t2 = normalize(cross(L2, vec3(0.0, 1.0, 0.0)));
    vec3 b2 = cross(t2, L2);
    vec3 k1 = fenster(vec2(dot(q, t1), dot(q, b1)) * uR_fenster, false);
    vec3 k2 = fenster(vec2(dot(q, t2), dot(q, b2)) * uR_fenster, true);
    float n1 = max(dot(n, L1), 0.0);
    float n2 = max(dot(n, L2), 0.0);
    vec3 c = la * (srgbZuLin(k1) * n1 * 2.4 + srgbZuLin(k2) * n2 * 2.4) * uR_licht;
    c += la * vec3(0.16, 0.15, 0.15) * (0.6 + 0.4 * n.y);
    // Stein ist matt, ein Hauch Glanz
    float nv = clamp(dot(n, V), 0.0, 1.0);
    c += (srgbZuLin(k1) * pow(max(dot(n, normalize(L1 + V)), 0.0), 30.0) + srgbZuLin(k2) * pow(max(dot(n, normalize(L2 + V)), 0.0), 30.0)) * 0.08;
    c += la * pow(1.0 - nv, 3.0) * 0.08;
    bild = mix(bild, c, maske);
    a = max(a, maske);
  }
  farbe = vec4(linZuSrgb(aces(bild * 1.2)) * a, a);
}
`;

function barcelona(id: string, name: string, zeile: string, fragment: string, regler: ReglerZeile[]): Voreinstellung {
  return bildVoreinstellung({ id, name, gruppe: 'Barcelona', zeile, regler, fragment, unruhig: () => false });
}

export const TRENCADIS = barcelona('trencadis', 'Trencadís', 'Mosaik aus Scherben glasierter Fliesen wie im Park Güell: Farbzonen, bemalte Scherben, weißer Mörtel, jede Scherbe spiegelt anders', TRENCADIS_GLSL, [
  { k: 'scherben', name: 'Scherben', min: 0.4, max: 2.5, schritt: 0.05, grund: 1 },
  { k: 'fuge', name: 'Fuge', min: 0.3, max: 2.5, schritt: 0.05, grund: 1 },
]);
export const BATLLO_DACH = barcelona('batllo', 'Casa Batlló', 'Das Dach der Casa Batlló als Drachenrücken: runde Keramikschuppen wie Dachziegel, Lüsterglasur, die mit dem Blick schillert, von Tiefblau bis Rosa', BATLLO_GLSL, [
  { k: 'ziegel', name: 'Schuppen', min: 0.4, max: 2.5, schritt: 0.05, grund: 1 },
  { k: 'luester', name: 'Lüster', min: 0, max: 1.5, schritt: 0.05, grund: 1 },
]);
export const SAGRADA = barcelona('sagrada', 'Sagrada Família', 'Heller Stein im Licht der Fenster aus farbigem Glas: kühl von links, warm von rechts; dahinter Säulen, die sich wie Bäume verzweigen', SAGRADA_GLSL, [
  { k: 'fenster', name: 'Fenster', min: 0.3, max: 3, schritt: 0.05, grund: 1 },
  { k: 'licht', name: 'Licht', min: 0.2, max: 2.5, schritt: 0.05, grund: 1 },
]);
