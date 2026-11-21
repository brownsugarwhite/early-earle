/**
 * Barcelona (Florian, 21.11.: „3 schader neu entwickeln die von antoni gaudi und barcelona inspiriert sind“):
 * - **Trencadís** (Park Güell, der Salamander „El Drac“, die Schlangenbank): Scherben glasierter Fliesen, gebrochen, mit weißem
 *   Mörtel in den Fugen. Scherben sind Zellen im Raum (hier gewollt unregelmäßig), jede leicht verkippt (die Glasur spiegelt je Scherbe
 *   anders: das Funkeln des Mosaiks), mit gerundeter Kante; Farben in Zonen (Kobalt und Türkis, Gelb und Orange, Grün), einige
 *   Scherben aus bemalten Fliesen (Blüten, Ringe, Streifen). Bühne: Himmel über Barcelona.
 * Runde 9 (Florian: „Der erste gaudi shader sieht gut aus. Die beiden anderen gefallen nicht“): Casa Batlló und Sagrada Família sind
 * heraus (im Verlauf bis 2f7c61a9). Neu:
 * - **La Pedrera** (die Kamine auf dem Dach der Casa Milà): Scherben aus weißem Marmor mit grauen Adern, dazwischen grünes Glas von
 *   Cava-Flaschen (Böden mit Ringen), grob in grauweißen Mörtel gesetzt; Mittelmeersonne.
 * - **Trencadís Verse:** das Mosaik im Spider-Verse-Druck: Farbflächen, Fugen als Tuschelinien, Licht aus Rasterpunkten und
 *   Schraffur, die Farbplatten versetzt, Funkeln als weiße Sterne.
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

/** die Glasuren des Trencadís nach Zonen */
const GLASUR = /* glsl */ `
vec3 glasur(float zone, float h) {
  // Zonen: 0 Kobalt und Türkis, 1 Gelb und Orange, 2 Grün; je Zone vier Glasuren und Weiß
  if (h > 0.86) return vec3(0.93, 0.92, 0.88);
  int k = int(h * 4.0 / 0.86);
  if (zone < 0.33) return k == 0 ? vec3(0.04, 0.16, 0.6) : (k == 1 ? vec3(0.05, 0.52, 0.66) : (k == 2 ? vec3(0.42, 0.7, 0.88) : vec3(0.1, 0.3, 0.75)));
  if (zone < 0.66) return k == 0 ? vec3(0.95, 0.76, 0.08) : (k == 1 ? vec3(0.93, 0.45, 0.06) : (k == 2 ? vec3(0.78, 0.16, 0.08) : vec3(0.98, 0.88, 0.35)));
  return k == 0 ? vec3(0.12, 0.5, 0.22) : (k == 1 ? vec3(0.48, 0.72, 0.18) : (k == 2 ? vec3(0.05, 0.5, 0.48) : vec3(0.72, 0.82, 0.3)));
}
`;

const TRENCADIS_GLSL = /* glsl */ `
${BUEHNEN}
${ZELLE_MIT_MITTE}
${GLASUR}
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

/** Achsen der Form (wie achsen in tiere.ts): A längs, B oben, C quer */
const ACHSEN = /* glsl */ `
void formAchsen(out vec3 A, out vec3 B, out vec3 C) {
  vec3 ach = pow(uHalb / max(max(uHalb.x, uHalb.y), 1e-6), vec3(4.0));
  A = normalize(vec3(ach.x, ach.y, 0.0) + vec3(1e-3, 0.0, 0.0));
  B = normalize(cross(vec3(0.0, 0.0, 1.0), A));
  C = cross(A, B);
}
`;

/**
 * La Pedrera (Runde 9, nach den Kaminen auf dem Dach der Casa Milà, „Garten der Krieger“): Bänder, die sich um die lange Achse
 * winden; im Wechsel weißer Kalkputz (#ece5d6, Schatten #cfc6b4) mit Kellenwellen, Sandkorn und Spiralrillen, und Trencadís aus
 * weißem Marmor (#f2efe8, Adern #9c9a95) mit grünem Flaschenglas (#2f5e2b bis #6c9a3b, an den Kanten heller #9fd16a), dazwischen
 * runde Flaschenböden mit Ringen. Harte Mittelmeersonne, blauer Himmel. Weiße Masse, grünes Funkeln.
 */
const PEDRERA_GLSL = /* glsl */ `
${BUEHNEN}
${ZELLE_MIT_MITTE}
${ACHSEN}
float ader(vec3 p) {
  float a = abs(snoise(p * vec3(1.0, 2.4, 1.0)) + 0.5 * snoise(p * 2.3 + 4.0));
  return 1.0 - smoothstep(0.0, 0.05, a);
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
    vec3 A, B, C;
    formAchsen(A, B, C);
    // Spirale um die lange Achse: drei Gänge
    float w = atan(dot(q, C), dot(q, B)) / 6.2831853;
    float phase = dot(q, A) * 1.6 * uR_baender + w * 3.0 + 0.06 * snoise(q * 2.0);
    float band = fract(phase);
    float aaB = fwidth(phase) + 1e-4;
    float trenc = smoothstep(0.5 - aaB, 0.5 + aaB, band) * (1.0 - smoothstep(0.97 - aaB, 0.97 + aaB, band));
    vec3 L = ausSicht(normalize(vec3(-0.45, 0.78, 0.45)));
    vec3 H = normalize(L + V);
    vec3 himmelF = mix(srgbZuLin(vec3(0.239, 0.498, 0.816)), srgbZuLin(vec3(0.663, 0.804, 0.941)), 0.4);
    // Kalkputz: Kellenwellen, Sandkorn, Rillen längs der Spirale, an den Rändern der Bänder eine Wulst
    float rille = 0.5 + 0.5 * cos(6.2831853 * band * 5.0 / 0.5);
    float welle = snoise(q * vec3(3.0, 7.0, 3.0) + 2.0) * 0.5 + snoise(q * 11.0) * 0.25;
    float sand = snoise(q * 140.0) * 0.6 + snoise(q * 60.0) * 0.4;
    float wulst = smoothstep(0.0, 0.06, band) * smoothstep(0.5, 0.44, band);
    float hP = rille * 0.35 * wulst + welle * 0.4 + sand * 0.035 + wulst * 0.6;
    vec3 nP = n0;
    {
      vec3 dpx = dFdx(g.p), dpy = dFdy(g.p);
      float dhx = dFdx(hP), dhy = dFdy(hP);
      vec3 r1 = cross(dpy, n0), r2 = cross(n0, dpx);
      float det = dot(dpx, r1);
      float amp = uRadius * 0.012;
      if (abs(det) > 1e-12) nP = normalize(abs(det) * n0 - sign(det) * (r1 * dhx + r2 * dhy) * amp);
    }
    vec3 putz = mix(vec3(0.812, 0.776, 0.706), vec3(0.925, 0.898, 0.839), smoothstep(-0.3, 0.6, hP));
    putz *= 0.96 + 0.06 * snoise(q * 40.0);
    vec3 lp = srgbZuLin(putz);
    float nlP = max(dot(nP, L), 0.0);
    vec3 cP = lp * (vec3(1.0, 0.95, 0.86) * 2.3 * nlP + himmelF * 0.7 * (nP.y * 0.4 + 0.6));
    cP += lp * vec3(1.0, 0.92, 0.8) * 0.18 * smoothstep(-0.35, 0.15, dot(nP, L));
    // Trencadís: Marmor und Flaschenglas
    float S = 9.0 * uR_scherben;
    vec3 m;
    vec3 z = zelleMitte(q * S + 0.16 * vec3(snoise(q * 2.5), snoise(q * 2.5 + 4.0), snoise(q * 2.5 + 8.0)), m);
    float rand = z.y - z.x;
    float aa = fwidth(rand) + 1e-3;
    float fuge = 1.0 - smoothstep(0.085, 0.085 + aa * 1.5, rand);
    bool glas = hash11(z.z * 53.0) < 0.2 * uR_glas;
    bool boden = glas && hash11(z.z * 17.0) < 0.45;
    vec3 d = (q - m / S) * S;
    vec3 dT = d - n0 * dot(d, n0);
    float r = length(dT);
    if (boden) fuge = max(fuge, smoothstep(0.3, 0.32 + aa, r));
    vec3 zuMitte = -dT;
    float kante = 1.0 - smoothstep(0.085, 0.23, rand);
    vec3 nS = normalize(n0 + 0.22 * (hash33(m * 1.7) - 0.5) - normalize(zuMitte + 1e-5) * kante * 0.45);
    if (boden) nS = normalize(n0 + normalize(dT + 1e-5) * smoothstep(0.05, 0.3, r) * 0.6 + 0.1 * (hash33(m) - 0.5));
    float nl = max(dot(nS, L), 0.0);
    float nv = clamp(dot(nS, V), 0.0, 1.0);
    vec3 cT;
    if (glas) {
      vec3 tief = srgbZuLin(vec3(0.184, 0.369, 0.169));
      vec3 hell = srgbZuLin(vec3(0.424, 0.604, 0.231));
      vec3 rand3 = srgbZuLin(vec3(0.624, 0.82, 0.416));
      float durch = clamp(pow(1.0 - nv, 1.4) * 0.7 + kante * 0.6 + max(dot(-nS, L), 0.0) * 0.3, 0.0, 1.0);
      if (boden) durch = max(durch, 1.0 - smoothstep(0.02, 0.06, abs(r - 0.2)));
      cT = mix(tief, hell, durch) * 0.9 + rand3 * kante * 0.25;
      cT += studio(reflect(-V, nS)) * fresnelS(nv, 0.04) * 1.6;
      cT += vec3(1.0, 0.98, 0.9) * ggx(max(dot(nS, H), 0.0), 0.04) * nl * fresnelS(dot(H, V), 0.04) * 3.0;
    } else {
      vec3 mp = q * 5.0 + hash33(m) * 20.0;
      float ad = ader(mp) * 0.7 + ader(mp * 2.6 + 3.0) * 0.35;
      vec3 alb = mix(vec3(0.949, 0.937, 0.91), vec3(0.9, 0.91, 0.93), hash11(z.z * 7.0));
      alb = mix(alb, vec3(0.612, 0.604, 0.584), clamp(ad, 0.0, 1.0));
      vec3 la = srgbZuLin(alb);
      cT = la * (vec3(1.0, 0.95, 0.86) * 2.3 * nl + himmelF * 0.8 * (nS.y * 0.4 + 0.6));
      cT += la * vec3(1.0, 0.95, 0.88) * 0.22 * smoothstep(-0.3, 0.2, dot(nS, L));
      cT += studio(reflect(-V, nS)) * fresnelS(nv, 0.04) * 0.6;
      cT += vec3(1.0, 0.97, 0.9) * ggx(max(dot(nS, H), 0.0), 0.22) * fresnelS(dot(H, V), 0.04) * nl * 1.8;
    }
    vec3 moertel = srgbZuLin(vec3(0.84, 0.82, 0.78) * (0.88 + 0.12 * snoise(q * 60.0)) * (0.95 + 0.05 * snoise(q * 160.0)));
    vec3 cm = moertel * (vec3(1.0, 0.95, 0.86) * 2.0 * max(dot(n0, L), 0.0) * 0.7 + himmelF * 0.6) * 0.8;
    cT = mix(cT, cm, fuge);
    // die Bänder aus Putz liegen höher: an ihrem Rand ein Schatten auf dem Mosaik
    cT *= mix(0.55, 1.0, smoothstep(0.5, 0.56, band) * smoothstep(0.97, 0.92, band));
    vec3 c = mix(cP, cT, trenc);
    bild = mix(bild, c, maske);
    a = max(a, maske);
  }
  farbe = vec4(linZuSrgb(aces(bild)) * a, a);
}
`;

/**
 * Trencadís Verse (Runde 9; Florian: „Gerne auch die spider verse shader wieder mehr miteinbeziehen“): das Mosaik im Spider-Verse-Druck.
 * Scherben als Farbflächen (die Zonen des Trencadís), die Farbplatte ein Stück versetzt (Passerfehler), Fugen papierweiß mit einer
 * Tuschelinie wechselnder Breite an jeder Scherbe; Licht aus Rasterpunkten (je Scherbe nach ihrer Neigung) und Schraffur im
 * Kernschatten; Scherben, die die Sonne spiegeln, werden hell und bekommen einen weißen Vierstrahl-Stern; dicke Kontur, Papierkorn.
 */
const TRENCADIS_VERSE_GLSL = /* glsl */ `
${BUEHNEN}
${ZELLE_MIT_MITTE}
${GLASUR}
const vec3 PAPIER = vec3(0.984, 0.969, 0.925);
float stern(vec2 d, float r) {
  vec2 a = abs(d) / r;
  return 1.0 - smoothstep(0.9, 1.0, sqrt(a.x) + sqrt(a.y));
}
void main() {
  GPunkt g = gLesen(vUv);
  float maske = deckungBei(vUv);
  vec2 css = gl_FragCoord.xy / uDpr;
  vec2 qb = gl_FragCoord.xy / uAufl;
  vec3 bild = uBuehne > 0.5 ? linZuSrgb(comicKnall(css, qb)) : vec3(0.0);
  float a = uBuehne > 0.5 ? 1.0 : 0.0;
  if (g.a > 0.5) {
    vec3 V = zumAuge(g.p);
    vec3 n0 = g.n;
    vec3 q = (g.p - uMitte) / uRadius;
    float S = 11.0 * uR_scherben;
    // die Farbplatte liest die Scherbe ein Stück daneben
    vec2 vs = vec2(2.2, -1.6) * uR_versatz * uDpr / uAufl;
    GPunkt gv = gLesen(vUv + vs);
    if (gv.a < 0.5) gv = g;
    vec3 qv = (gv.p - uMitte) / uRadius;
    vec3 mv, m;
    vec3 zv = zelleMitte(qv * S + 0.1 * vec3(snoise(qv * 3.0), snoise(qv * 3.0 + 4.0), snoise(qv * 3.0 + 8.0)), mv);
    vec3 z = zelleMitte(q * S + 0.1 * vec3(snoise(q * 3.0), snoise(q * 3.0 + 4.0), snoise(q * 3.0 + 8.0)), m);
    float zone = clamp(0.5 + 0.6 * (snoise(qv * 0.6 + 2.0) * 0.85 + snoise(qv * 1.7) * 0.15), 0.0, 0.999);
    vec3 c = glasur(zone, zv.z);
    float randV = zv.y - zv.x;
    float aaV = fwidth(randV) + 1e-4;
    c = mix(c, PAPIER, 1.0 - smoothstep(0.07 - aaV, 0.07 + aaV, randV));
    // Licht je Scherbe (nach ihrer Neigung) und je Form; Punkte in einem dunklen Ton, Schraffur im Kernschatten
    vec3 dT = (q - m / S);
    dT -= n0 * dot(dT, n0);
    float rand = z.y - z.x;
    float kante = 1.0 - smoothstep(0.07, 0.2, rand);
    vec3 nS = normalize(n0 + 0.26 * (hash33(m * 1.7) - 0.5) + normalize(dT + 1e-5) * kante * 0.4);
    vec3 L = ausSicht(normalize(vec3(-0.5, 0.72, 0.5)));
    float lS = dot(nS, L);
    float lF = dot(n0, L);
    float wert = clamp((0.32 - mix(lF, lS, 0.55)) * 1.5, 0.0, 0.85) * uR_raster;
    vec3 dunkel = c * vec3(0.38, 0.33, 0.5);
    c = mix(c, dunkel, punkt(css, wert, 0.785, 5.0));
    float kern = clamp((-0.15 - lF) * 1.6, 0.0, 0.65);
    c = mix(c, vec3(0.1, 0.06, 0.22), schraffur(css, kern, -0.5, 4.5) * step(0.02, kern) * 0.9);
    // Funkeln: Scherben, die die Sonne spiegeln, hell, mit Stern an ihrer Mitte
    float spieg = pow(max(dot(reflect(-L, nS), V), 0.0), 24.0);
    float hellS = step(0.55, spieg) * step(0.18, fract(z.z * 37.0));
    c = mix(c, mix(c, vec3(1.0), 0.65), hellS);
    vec2 sc = insBild(uMitte + m / S * uRadius);
    vec2 dpx = (vUv - sc) * uAufl / uDpr;
    float st = stern(dpx, 9.0 + 6.0 * fract(z.z * 13.0)) * hellS;
    // Tusche: eine Linie wechselnder Breite an jeder Scherbe (aus der wahren Lage), dicke Kontur der Form
    float pxR = rand / (fwidth(rand) + 1e-4);
    float lw = (1.3 + 1.1 * (snoise(q * 25.0) * 0.5 + 0.5)) * uDpr * (0.7 + 0.5 * clamp(-lF + 0.5, 0.0, 1.0));
    float fugeW = 0.07 / (fwidth(rand) + 1e-4);
    float tinte = (1.0 - smoothstep(lw - 0.8, lw + 0.8, abs(pxR - fugeW)));
    c = mix(c, vec3(0.05, 0.035, 0.09), tinte);
    c = mix(c, vec3(1.0), st);
    c = mix(c, vec3(0.04, 0.03, 0.06), kanteBei(vUv, 2.4 * uDpr));
    c *= papier(css);
    bild = mix(bild, c, maske);
    a = max(a, maske);
  }
  farbe = vec4(bild * a, a);
}
`;

function barcelona(id: string, name: string, zeile: string, fragment: string, regler: ReglerZeile[]): Voreinstellung {
  return bildVoreinstellung({ id, name, gruppe: 'Barcelona', zeile, regler, fragment, unruhig: () => false });
}

export const TRENCADIS = barcelona('trencadis', 'Trencadís', 'Mosaik aus Scherben glasierter Fliesen wie im Park Güell: Farbzonen, bemalte Scherben, weißer Mörtel, jede Scherbe spiegelt anders', TRENCADIS_GLSL, [
  { k: 'scherben', name: 'Scherben', min: 0.4, max: 2.5, schritt: 0.05, grund: 1 },
  { k: 'fuge', name: 'Fuge', min: 0.3, max: 2.5, schritt: 0.05, grund: 1 },
]);
export const PEDRERA = barcelona('pedrera', 'La Pedrera', 'Die Kamine auf dem Dach der Casa Milà: Bänder, die sich um die Form winden, weißer Kalkputz mit Kellenwellen und Rillen im Wechsel mit Trencadís aus weißem Marmor und grünem Flaschenglas (Flaschenböden mit Ringen), harte Mittelmeersonne', PEDRERA_GLSL, [
  { k: 'baender', name: 'Bänder', min: 0.3, max: 2.5, schritt: 0.05, grund: 1 },
  { k: 'scherben', name: 'Scherben', min: 0.4, max: 2.5, schritt: 0.05, grund: 1 },
  { k: 'glas', name: 'Glas', min: 0, max: 2.5, schritt: 0.05, grund: 1 },
]);
export const TRENCADIS_VERSE = barcelona('trencadisVerse', 'Trencadís Verse', 'Das Mosaik im Spider-Verse-Druck: Scherben als Farbflächen, die Farbplatte versetzt, Fugen papierweiß mit Tuschelinien, Licht aus Rasterpunkten je Scherbe und Schraffur, funkelnde Scherben mit weißen Sternen', TRENCADIS_VERSE_GLSL, [
  { k: 'scherben', name: 'Scherben', min: 0.4, max: 2.5, schritt: 0.05, grund: 1 },
  { k: 'versatz', name: 'Versatz', min: 0, max: 3, schritt: 0.05, grund: 1 },
  { k: 'raster', name: 'Raster', min: 0, max: 1.5, schritt: 0.05, grund: 1 },
]);
