/**
 * Bühnen für die Shader mit eigenem Grund (GLSL, Bildschirm: css in Bildpunkten, qb 0 … 1): Urzeit am Abend, Comic-Knall, dunkler
 * Saal, Kinderzimmer (aus dem T-Rex, Runde 5), dazu für Fell und Flausch (Runde 6) ein Wald im Gegenlicht, ein gemalter Himmel
 * (Ghibli), ein Anime-Himmel und ein Manga-Grund mit Konzentrationslinien. Alle geben lineare Farbe; sie brauchen RAUSCHEN, FARBE,
 * DRUCK und uAufl, uDpr.
 */

export const BUEHNEN = /* glsl */ `
/** ein Wedel (Palme, Farn) vom Ansatz aus, in Bildpunkten: Deckung 0 … 1; haengen biegt ihn nach unten */
float wedel(vec2 d, float laenge, float winkel, float haengen, float breite) {
  float r = length(d);
  if (r > laenge || r < 0.5) return 0.0;
  float s = r / laenge;
  float w = winkel - haengen * s * s * sign(cos(winkel));
  float a = atan(d.y, d.x);
  float da = abs(mod(a - w + 3.14159, 6.28318) - 3.14159) * r;
  float halb = breite * sin(3.14159 * min(s * 1.1, 1.0)) * (0.5 + 0.5 * abs(fract(r / 6.0) - 0.5) * 2.0);
  return 1.0 - smoothstep(halb - 0.7, halb + 0.7, da);
}

/** Palmfarn: gebogener Stamm, Krone aus Wedeln; fuss und hoehe in Bildpunkten */
float palme(vec2 css, vec2 fuss, float hoehe, float saat) {
  vec2 d = css - fuss;
  if (abs(d.x) > hoehe * 0.85 || d.y < -2.0 || d.y > hoehe * 1.5) return 0.0;
  float t = clamp(d.y / hoehe, 0.0, 1.0);
  float neig = (hash11(saat) - 0.5) * 0.3 * hoehe;
  float dick = 1.6 + 2.2 * (1.0 - t) + hoehe * 0.012;
  float stamm = (1.0 - smoothstep(dick - 0.7, dick + 0.7, abs(d.x - neig * t * t))) * step(0.0, d.y) * step(d.y, hoehe);
  vec2 krone = fuss + vec2(neig, hoehe);
  float k = 0.0;
  for (int i = 0; i < 9; i++) {
    float fi = float(i);
    float w = mix(-0.35, 3.49, fi / 8.0) + (hash11(saat * 1.7 + fi) - 0.5) * 0.35;
    k = max(k, wedel(css - krone, hoehe * (0.38 + 0.16 * hash11(saat * 3.1 + fi)), w, 1.0, 3.5 + hoehe * 0.025));
  }
  return max(stamm, k);
}

/** Flugsaurier im Flug (m Mitte, g halbe Spannweite, beides in Bildpunkten; schlag: Flügel oben 1, unten -1) */
float flugsaurier(vec2 css, vec2 m, float g, float schlag) {
  vec2 d = (css - m) / g;
  if (abs(d.x) > 1.05 || abs(d.y) > 0.6) return 0.0;
  float y = schlag * (0.6 * abs(d.x) - 0.75 * d.x * d.x);
  float dick = 0.11 * (1.0 - abs(d.x)) + 0.02;
  float aa = 1.2 / g;
  float fl = (1.0 - smoothstep(dick - aa, dick + aa, abs(d.y - y))) * step(abs(d.x), 1.0);
  float koerper = 1.0 - smoothstep(0.05, 0.05 + aa, length(d * vec2(1.0, 1.4)));
  float kopf = 1.0 - smoothstep(0.035, 0.035 + aa, length((d - vec2(0.13, 0.03)) * vec2(0.45, 1.8)));
  return max(fl, max(koerper, kopf));
}

/** Urzeit am Abend: Glut am Horizont, Wolkenbänder, tiefe Sonne, Vulkan mit Lava und Rauchsäule, Bergketten, Palmfarne, Farne */
vec3 urzeitGrund(vec2 css, vec2 qb) {
  float asp = uAufl.x / uAufl.y;
  float H = uAufl.y / uDpr;
  vec2 u = vec2(qb.x * asp, qb.y);
  float hor = 0.36;
  vec2 sonne = vec2(0.74 * asp, 0.45);
  float ds = length(u - sonne);
  float hy = clamp((qb.y - hor) / (1.0 - hor), 0.0, 1.0);
  vec3 c = mix(vec3(1.0, 0.58, 0.26), vec3(0.66, 0.32, 0.38), smoothstep(0.0, 0.42, hy));
  c = mix(c, vec3(0.13, 0.13, 0.27), smoothstep(0.3, 1.0, hy));
  c += vec3(1.0, 0.55, 0.25) * exp(-ds * 4.0) * 0.85;
  // Wolkenbänder, von unten angeleuchtet
  vec2 wu = vec2(u.x * 1.5, u.y * 7.5);
  float w0 = fbm2(wu + 3.0);
  float w1 = fbm2(wu + vec2(0.0, -0.22) + 3.0);
  float wolke = smoothstep(0.5, 0.66, w0) * smoothstep(0.47, 0.57, qb.y) * (1.0 - smoothstep(0.82, 0.98, qb.y));
  vec3 wf = mix(vec3(0.32, 0.17, 0.24), vec3(1.0, 0.62, 0.34), clamp((w0 - w1) * 5.0 + 0.25, 0.0, 1.0) * (0.35 + 0.65 * exp(-ds * 1.8)));
  c = mix(c, wf, wolke * 0.92);
  // die Sonne und ihre Strahlen im Dunst
  c = mix(c, vec3(1.9, 1.5, 1.0), 1.0 - smoothstep(0.042, 0.05, ds));
  float aw = atan(u.y - sonne.y, u.x - sonne.x);
  c += vec3(1.0, 0.62, 0.32) * smoothstep(0.5, 0.9, noise2(vec2(aw * 8.0, 0.5))) * exp(-ds * 2.4) * 0.3;
  // ferne Bergkette im Dunst
  float k1 = hor + 0.07 + 0.09 * (fbm2(vec2(u.x * 2.6, 1.0)) - 0.45);
  if (qb.y < k1) c = mix(c, vec3(0.86, 0.47, 0.36) * 0.82, 0.88);
  // der Vulkan: Glut im Krater, Lava in Bächen, Rauchsäule
  float xv = 0.2 * asp;
  float dx = abs(u.x - xv);
  float spitze = hor + 0.24;
  float hv = spitze - 1.1 * max(dx - 0.028, 0.0) + 0.55 * max(dx - 0.16, 0.0) + 0.01 * (noise2(vec2(u.x * 60.0, 2.0)) - 0.5);
  if (qb.y < hv) {
    vec3 berg = mix(vec3(0.3, 0.16, 0.19), vec3(0.42, 0.22, 0.22), smoothstep(-0.1, 0.1, u.x - xv));
    c = berg * (0.85 + 0.2 * noise2(vec2(u.x * 30.0, u.y * 12.0)));
    float lauf = spitze - u.y;
    for (int i = 0; i < 4; i++) {
      float fi = float(i);
      float xi = xv + (fi - 1.5) * 0.012 + lauf * (fi - 1.5) * 0.42 + 0.005 * sin(u.y * 90.0 + fi * 2.3);
      float lang = 0.05 + 0.08 * hash11(fi * 3.3 + 0.4);
      float d = abs(u.x - xi);
      float da = step(0.004, lauf);
      c += vec3(1.5, 0.42, 0.08) * (1.0 - smoothstep(0.0009, 0.0026, d)) * da * (1.0 - smoothstep(lang * 0.7, lang, lauf));
      c += vec3(0.8, 0.2, 0.05) * exp(-d * 260.0) * 0.25 * da * (1.0 - smoothstep(lang * 0.6, lang * 1.2, lauf));
    }
  }
  c += vec3(1.6, 0.5, 0.12) * exp(-length((u - vec2(xv, spitze)) * vec2(1.0, 2.2)) * 26.0) * 1.1;
  float yy = u.y - spitze;
  if (yy > -0.01) {
    float xp = xv + 0.55 * yy * yy + 0.04 * yy;
    float wp = 0.02 + 0.28 * max(yy, 0.0);
    float tur = fbm2(vec2(u.x * 7.0, u.y * 5.0 - 1.3) + 9.0);
    float rauch = (1.0 - smoothstep(0.45, 1.0, abs(u.x - xp) / wp + 0.45 * (tur - 0.5))) * (1.0 - smoothstep(0.42, 0.62, yy)) * smoothstep(-0.01, 0.01, yy);
    vec3 rf = mix(vec3(0.14, 0.09, 0.11), vec3(0.3, 0.18, 0.18), tur);
    rf += vec3(1.2, 0.35, 0.08) * exp(-max(yy, 0.0) * 14.0) * 0.6;
    c = mix(c, rf, rauch * 0.93);
  }
  // Flugsaurier
  c = mix(c, vec3(0.1, 0.06, 0.09), flugsaurier(css, vec2(0.58 * asp, 0.7) * H, 22.0, 1.0) * 0.95);
  c = mix(c, vec3(0.1, 0.06, 0.09), flugsaurier(css, vec2(0.66 * asp, 0.77) * H, 14.0, -0.6) * 0.9);
  c = mix(c, vec3(0.12, 0.07, 0.1), flugsaurier(css, vec2(0.33 * asp, 0.83) * H, 10.0, 0.8) * 0.85);
  // mittlere Kette mit Palmfarnen
  vec3 mitte = vec3(0.24, 0.12, 0.14);
  float k2 = hor - 0.015 + 0.05 * (fbm2(vec2(u.x * 4.0, 7.0)) - 0.45);
  if (qb.y < k2) c = mix(c, mitte, 0.92);
  float zx = floor(css.x / 120.0);
  for (int i = -1; i <= 1; i++) {
    float z = zx + float(i);
    if (hash11(z * 1.91 + 0.3) < 0.4) continue;
    float fx = (z + 0.5 + 0.6 * (hash11(z * 4.7) - 0.5)) * 120.0;
    float fy = (hor - 0.015 + 0.05 * (fbm2(vec2(fx / H * 4.0, 7.0)) - 0.45)) * H - 2.0;
    c = mix(c, mitte * 0.8, palme(css, vec2(fx, fy), (0.07 + 0.07 * hash11(z * 9.1)) * H, z) * 0.92);
  }
  // naher Boden mit großen Palmfarnen
  vec3 nah = vec3(0.12, 0.07, 0.058);
  float k3 = 0.2 + 0.035 * (fbm2(vec2(u.x * 5.0, 3.0)) - 0.45);
  if (qb.y < k3) c = nah * (0.8 + 0.4 * noise2(css * 0.05)) + vec3(0.5, 0.2, 0.08) * smoothstep(k3 - 0.025, k3, qb.y) * 0.25;
  float zn = floor(css.x / 300.0);
  for (int i = -1; i <= 1; i++) {
    float z = zn + float(i);
    if (hash11(z * 3.17 + 0.9) < 0.5) continue;
    float fx = (z + 0.5 + 0.5 * (hash11(z * 5.9) - 0.5)) * 300.0;
    float fy = (0.2 + 0.035 * (fbm2(vec2(fx / H * 5.0, 3.0)) - 0.45)) * H - 4.0;
    c = mix(c, nah * 0.6, palme(css, vec2(fx, fy), (0.22 + 0.14 * hash11(z * 7.3)) * H, z + 50.0));
  }
  // Farne im Vordergrund, aus den unteren Ecken
  float farn = 0.0;
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    vec2 fuss = vec2(fi < 3.0 ? -0.02 : 1.02, -0.05) * vec2(asp * H, H);
    float w = fi < 3.0 ? mix(0.55, 1.35, mod(fi, 3.0) / 2.0) : mix(1.8, 2.6, mod(fi, 3.0) / 2.0);
    farn = max(farn, wedel(css - fuss, (0.34 + 0.08 * hash11(fi * 2.1)) * H, w, 0.75, 9.0 + 0.012 * H));
  }
  c = mix(c, vec3(0.025, 0.02, 0.018), farn);
  // Glut und Asche in der Luft, dichter beim Vulkan
  vec2 gz = floor(css / 19.0);
  vec2 gf = fract(css / 19.0) - 0.5 - (hash22(gz) - 0.5) * 0.6;
  float glut = step(0.985 - 0.02 * exp(-abs(u.x - xv) * 4.0), hash12(gz + 5.0)) * (1.0 - smoothstep(0.03, 0.07, length(gf)));
  c += vec3(1.4, 0.45, 0.1) * glut * 0.8;
  c += vec3(1.0, 0.55, 0.3) * exp(-ds * 3.0) * 0.1;
  return srgbZuLin(c);
}

/** Comic-Knall: Strahlen in Gelb und Orange, Raster zum Rand, schwarze Speedlines von außen */
vec3 comicKnall(vec2 css, vec2 qb) {
  vec2 c = (qb - vec2(0.5, 0.5)) * vec2(uAufl.x / uAufl.y, 1.0);
  float r = length(c);
  float w = atan(c.y, c.x) / 6.28318 + 0.5;
  float strahl = step(0.5, fract(w * 16.0 + 0.04 * sin(r * 9.0)));
  vec3 col = mix(vec3(1.0, 0.86, 0.2), vec3(1.0, 0.6, 0.14), strahl);
  col = mix(col, vec3(0.92, 0.16, 0.2), punkt(css, smoothstep(0.2, 0.95, r) * 0.65, radians(15.0), 8.0) * 0.9);
  float n = 110.0;
  float idx = floor(w * n);
  float innen = 0.3 + 0.32 * hash11(idx * 1.7);
  float lw = abs(fract(w * n) - 0.5);
  float hw = 0.24 * smoothstep(innen, innen + 0.5, r);
  float aa = min(fwidth(w * n), 0.2) + 0.01;
  float keil = (1.0 - smoothstep(hw - aa, hw + aa, lw)) * step(0.4, hash11(idx * 3.1 + 0.7)) * step(0.001, hw);
  col = mix(col, vec3(0.06, 0.03, 0.1), keil);
  return srgbZuLin(col * papier(css));
}

/** dunkler Saal: Lichtkreis des Spots an der Wand, polierter Boden, ein Strahl von oben mit Staub */
vec3 museumGrund(vec2 css, vec2 qb) {
  float asp = uAufl.x / uAufl.y;
  vec2 u = vec2((qb.x - 0.5) * asp, qb.y);
  float boden = 0.2;
  vec3 c = mix(vec3(0.018, 0.017, 0.016), vec3(0.045, 0.04, 0.036), qb.y);
  c *= 0.9 + 0.15 * fbm2(css * 0.03);
  c += vec3(0.3, 0.24, 0.17) * exp(-pow(u.x / 0.42, 2.0) - pow((qb.y - 0.6) / 0.42, 2.0)) * 0.55;
  if (qb.y < boden) {
    float yb = 2.0 * boden - qb.y;
    c = vec3(0.016, 0.015, 0.014) + vec3(0.3, 0.24, 0.17) * exp(-pow(u.x / 0.42, 2.0) - pow((yb - 0.6) / 0.42, 2.0)) * 0.12;
    c += vec3(0.42, 0.34, 0.24) * exp(-pow(u.x / 0.36, 2.0) - pow((qb.y - 0.11) / 0.055, 2.0)) * 0.45;
    c *= 0.92 + 0.12 * noise2(css * vec2(0.01, 0.2));
  }
  c *= 1.0 - 0.6 * (1.0 - smoothstep(0.0, 0.006, abs(qb.y - boden)));
  float breite = 0.07 + (1.08 - qb.y) * 0.3;
  float strahl = (1.0 - smoothstep(breite * 0.55, breite, abs(u.x))) * smoothstep(boden - 0.05, 0.6, qb.y);
  c += vec3(0.2, 0.17, 0.12) * strahl * 0.22 * (0.8 + 0.4 * fbm2(vec2(u.x * 6.0, qb.y * 2.0) + 4.0));
  vec2 gz = floor(css / 11.0);
  vec2 gf = fract(css / 11.0) - 0.5 - (hash22(gz) - 0.5) * 0.7;
  c += vec3(0.9, 0.8, 0.6) * step(0.965, hash12(gz + 2.0)) * (1.0 - smoothstep(0.02, 0.07, length(gf))) * strahl * 0.6;
  return c;
}

/** Stern mit fünf Zacken (Abstand, Bildpunkte) */
float sternSdf(vec2 p, float r, float rf) {
  const vec2 k1 = vec2(0.809016994375, -0.587785252292);
  const vec2 k2 = vec2(-0.809016994375, -0.587785252292);
  p.x = abs(p.x);
  p -= 2.0 * max(dot(k1, p), 0.0) * k1;
  p -= 2.0 * max(dot(k2, p), 0.0) * k2;
  p.x = abs(p.x);
  p.y -= r;
  vec2 ba = rf * vec2(-k1.y, k1.x) - vec2(0.0, 1.0);
  float h = clamp(dot(p, ba) / dot(ba, ba), 0.0, r);
  return length(p - ba * h) * sign(p.y * ba.x - p.x * ba.y);
}

/** Bauklotz, unscharf (u: Bild in Höhen, m Mitte, g halbe Größe) */
float klotz(vec2 u, vec2 m, float g) {
  vec2 d = abs(u - m) - vec2(g * 0.75);
  float sd = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - g * 0.25;
  return 1.0 - smoothstep(-0.012, 0.012, sd);
}

/** Kinderzimmer: Tapete mit Streifen und Sternen, Licht vom Fenster, Fußleiste, Dielen, Bauklötze unscharf */
vec3 kinderzimmerGrund(vec2 css, vec2 qb) {
  float asp = uAufl.x / uAufl.y;
  vec2 u = vec2((qb.x - 0.5) * asp, qb.y);
  float leiste = 0.26;
  vec3 c;
  if (qb.y > leiste + 0.035) {
    c = mix(vec3(0.75, 0.86, 0.94), vec3(0.7, 0.82, 0.91), step(0.5, fract(css.x / 44.0)));
    vec2 g = css / 66.0;
    vec2 zi = floor(g);
    vec2 f = drehung(hash12(zi + 7.0) * 1.2) * ((fract(g) - 0.5 + (hash22(zi) - 0.5) * 0.4) * 66.0);
    float stern = sternSdf(f, 6.0 + 3.0 * hash12(zi + 1.0), 0.45);
    c = mix(c, vec3(1.0, 0.92, 0.6), (1.0 - smoothstep(-0.8, 0.8, stern)) * step(0.4, hash12(zi + 3.0)));
    vec2 fw = vec2(u.x + 0.42 + (qb.y - 0.6) * 0.45, qb.y - 0.64);
    float fenster = (1.0 - smoothstep(0.15, 0.19, abs(fw.x))) * (1.0 - smoothstep(0.17, 0.21, abs(fw.y)));
    float kreuz = max(1.0 - smoothstep(0.006, 0.012, abs(fw.x)), 1.0 - smoothstep(0.006, 0.012, abs(fw.y)));
    c *= 1.0 + 0.32 * fenster * (1.0 - kreuz);
  } else if (qb.y > leiste) {
    c = vec3(0.96, 0.95, 0.91) * mix(0.82, 1.0, smoothstep(leiste, leiste + 0.035, qb.y));
  } else {
    float dy = (leiste - qb.y) * uAufl.y / uDpr;
    float diele = floor(dy / 34.0);
    float x = css.x + hash11(diele * 3.1) * 400.0;
    vec3 holz = mix(vec3(0.6, 0.4, 0.23), vec3(0.74, 0.53, 0.32), hash11(diele * 1.3 + floor(x / 380.0) * 7.0));
    holz *= 0.84 + 0.26 * fbm2(vec2(x * 0.011, dy * 0.28 + diele * 13.0));
    float fd = 1.0 - smoothstep(0.5, 1.5, min(mod(dy, 34.0), 34.0 - mod(dy, 34.0)));
    float fs = 1.0 - smoothstep(0.5, 1.5, min(mod(x, 380.0), 380.0 - mod(x, 380.0)));
    holz *= 1.0 - 0.55 * max(fd, fs);
    holz *= 1.0 + 0.4 * exp(-pow((u.x + 0.25) / 0.3, 2.0) - pow((qb.y - 0.12) / 0.07, 2.0));
    c = holz;
  }
  c = mix(c, vec3(0.9, 0.22, 0.2), klotz(u, vec2(-0.62 * asp / 1.5, 0.15), 0.055) * 0.9);
  c = mix(c, vec3(0.22, 0.45, 0.9), klotz(u, vec2(0.6 * asp / 1.5, 0.13), 0.045) * 0.9);
  c = mix(c, vec3(1.0, 0.8, 0.2), klotz(u, vec2(0.6 * asp / 1.5, 0.215), 0.035) * 0.9);
  return srgbZuLin(c);
}
/** Wald im Gegenlicht: grün-goldener Verlauf, Sonne hinten, unscharfe Lichtkreise mit hellem Rand, Vignette */
vec3 waldBokeh(vec2 css, vec2 qb) {
  float asp = uAufl.x / uAufl.y;
  vec2 u = vec2((qb.x - 0.5) * asp, qb.y);
  vec3 c = mix(vec3(0.1, 0.13, 0.07), vec3(0.5, 0.56, 0.3), smoothstep(0.0, 1.0, qb.y));
  c = mix(c, vec3(0.98, 0.8, 0.48), exp(-length(u - vec2(0.42, 0.8)) * 2.0) * 0.65);
  for (int i = 0; i < 2; i++) {
    float g = i == 0 ? 130.0 : 64.0;
    vec2 z = floor(css / g);
    for (int j = -1; j <= 1; j++)
      for (int k = -1; k <= 1; k++) {
        vec2 zz = z + vec2(float(j), float(k));
        if (hash12(zz + float(i) * 7.0) < 0.55) continue;
        vec2 m = (zz + 0.2 + 0.6 * hash22(zz + 3.0)) * g;
        float r = g * (0.18 + 0.25 * hash12(zz + 9.0));
        float d = length(css - m);
        float kreis = (1.0 - smoothstep(r - 1.5, r + 1.5, d)) * (0.55 + 0.45 * smoothstep(r * 0.4, r, d));
        vec3 kf = mix(vec3(1.0, 0.86, 0.5), vec3(0.62, 0.88, 0.42), hash12(zz + 5.0));
        c += kf * kreis * (0.07 + 0.09 * float(i)) * smoothstep(0.15, 0.85, qb.y);
      }
  }
  c *= 1.0 - 0.35 * pow(length((qb - 0.5) * vec2(asp, 1.0)) * 0.9, 2.0);
  return srgbZuLin(c);
}
/** gemalter Himmel wie in den Ghibli-Hintergründen: Haufenwolken mit grauvioletten Bäuchen, zwei Hügelreihen, Pinselspur, Papier */
vec3 ghibliHimmel(vec2 css, vec2 qb) {
  vec3 c = mix(vec3(0.63, 0.81, 0.95), vec3(0.18, 0.43, 0.8), smoothstep(0.35, 1.0, qb.y));
  vec2 wu = css * vec2(0.003, 0.0055);
  float wf = fbm2(wu + 3.0) + 0.3 * (qb.y - 0.6);
  float wolke = smoothstep(0.52, 0.56, wf) * smoothstep(0.42, 0.52, qb.y);
  float bauch = smoothstep(0.5, 0.7, fbm2(wu + vec2(3.0, 3.08)));
  c = mix(c, mix(vec3(0.66, 0.65, 0.82), vec3(1.0, 0.99, 0.95), bauch), wolke);
  float h1 = 0.36 + 0.05 * sin(qb.x * 3.0 + 2.0) + 0.03 * fbm2(css * 0.006);
  float h2 = 0.22 + 0.05 * sin(qb.x * 4.5 + 1.0) + 0.02 * fbm2(css * 0.01 + 5.0);
  c = mix(c, mix(vec3(0.33, 0.5, 0.48), vec3(0.42, 0.6, 0.52), smoothstep(h1 - 0.1, h1, qb.y)), step(qb.y, h1));
  c = mix(c, mix(vec3(0.22, 0.42, 0.14), vec3(0.5, 0.7, 0.25), smoothstep(h2 - 0.2, h2, qb.y)), step(qb.y, h2));
  c *= 0.95 + 0.08 * noise2(vec2(css.x * 0.05, css.y * 0.5) + floor(css.y / 9.0) * 3.1);
  return srgbZuLin(c * papier(css));
}
/** Anime-Himmel: kräftiges Blau, Haufenwolken in zwei Tönen mit harten Kanten (Licht von oben links), heller Dunst am Horizont */
vec3 animeHimmel(vec2 css, vec2 qb) {
  vec3 c = mix(vec3(0.62, 0.86, 1.0), vec3(0.09, 0.4, 0.92), smoothstep(0.15, 1.0, qb.y));
  vec2 wu = css * vec2(0.0026, 0.0042);
  float form = fbm2(wu + vec2(1.3, 0.0)) + 0.3 * (0.3 - abs(qb.y - 0.46));
  float licht = fbm2(wu + vec2(1.3, 0.0) + vec2(-0.03, 0.05)) + 0.3 * (0.3 - abs(qb.y - 0.46 - 0.012));
  float aa = fwidth(form) + 1e-3;
  float wolke = smoothstep(0.62 - aa, 0.62 + aa, form);
  float hell = smoothstep(0.64 - aa, 0.64 + aa, licht);
  vec3 w = mix(vec3(0.76, 0.82, 0.98), vec3(1.0), hell);
  c = mix(c, w, wolke);
  c = mix(c, vec3(0.86, 0.95, 1.0), smoothstep(0.32, 0.05, qb.y) * 0.6);
  return srgbZuLin(c);
}
/** Manga-Grund: weißes Papier, Konzentrationslinien von außen zur Mitte, unten Rasterfolie */
vec3 mangaGrund(vec2 css, vec2 qb) {
  vec2 c = (qb - 0.5) * vec2(uAufl.x / uAufl.y, 1.0);
  float r = length(c);
  float w = atan(c.y, c.x) / 6.28318 + 0.5;
  float n = 240.0;
  float idx = floor(w * n);
  float innen = 0.34 + 0.32 * hash11(idx * 1.3);
  float lw = abs(fract(w * n) - 0.5);
  float hw = 0.2 * smoothstep(innen, innen + 0.45, r) * step(0.35, hash11(idx * 7.7));
  float aa = min(fwidth(w * n), 0.2) + 0.02;
  float linie = (1.0 - smoothstep(hw - aa, hw + aa, lw)) * step(0.001, hw);
  float g = 0.97 * papier(css);
  g = mix(g, 0.04, linie);
  g = mix(g, 0.04, punkt(css, smoothstep(0.3, 0.0, qb.y) * 0.35, radians(45.0), 5.0));
  return srgbZuLin(vec3(g));
}
/** blauer Himmel am Tag: tiefes Blau oben, hell am Horizont, Sonne oben links mit Hof, ein Hauch Dunst unten */
vec3 himmelBlau(vec2 css, vec2 qb) {
  float asp = uAufl.x / uAufl.y;
  vec2 u = vec2(qb.x * asp, qb.y);
  vec3 c = mix(vec3(0.62, 0.78, 0.92), vec3(0.13, 0.36, 0.72), smoothstep(0.1, 1.0, qb.y));
  float ds = length(u - vec2(0.18 * asp, 0.86));
  c += vec3(1.0, 0.94, 0.8) * (exp(-ds * 7.0) * 0.6 + exp(-ds * 40.0) * 1.2);
  c = mix(c, vec3(0.86, 0.9, 0.94), smoothstep(0.25, 0.0, qb.y) * 0.7);
  return srgbZuLin(c);
}
/** Jahrmarkt am Abend: Dämmerblau, unscharfe bunte Lichterketten, warmer Schein unten */
vec3 jahrmarktGrund(vec2 css, vec2 qb) {
  vec3 c = mix(vec3(0.32, 0.14, 0.3), vec3(0.05, 0.06, 0.18), smoothstep(0.0, 0.9, qb.y));
  c += vec3(0.9, 0.45, 0.2) * smoothstep(0.45, 0.0, qb.y) * 0.25;
  for (int i = 0; i < 2; i++) {
    float g = i == 0 ? 90.0 : 46.0;
    vec2 z = floor(css / g);
    for (int j = -1; j <= 1; j++)
      for (int k = -1; k <= 1; k++) {
        vec2 zz = z + vec2(float(j), float(k));
        if (hash12(zz + float(i) * 5.0) < 0.5) continue;
        vec2 m = (zz + 0.2 + 0.6 * hash22(zz + 1.0)) * g;
        float r = g * (0.16 + 0.22 * hash12(zz + 2.0));
        float d = length(css - m);
        float kreis = (1.0 - smoothstep(r - 1.5, r + 1.5, d)) * (0.6 + 0.4 * smoothstep(r * 0.3, r, d));
        vec3 kf = hsv(vec3(hash12(zz + 4.0), 0.55, 1.0));
        c += kf * kreis * (0.12 + 0.12 * float(i)) * smoothstep(0.05, 0.6, qb.y);
      }
  }
  return srgbZuLin(c);
}
/** unter Wasser: Blau nach unten tiefer, Lichtfinger von oben, Lichtnetz (Kaustik) oben, Schwebteilchen und Bläschen */
vec3 unterWasser(vec2 css, vec2 qb) {
  float asp = uAufl.x / uAufl.y;
  vec2 u = vec2((qb.x - 0.5) * asp, qb.y);
  vec3 c = mix(vec3(0.01, 0.07, 0.16), vec3(0.08, 0.42, 0.6), smoothstep(0.0, 1.0, qb.y));
  float strahl = 0.0;
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    float x0 = (hash11(fi * 3.7) - 0.5) * asp * 1.2;
    float neig = (hash11(fi * 1.3) - 0.5) * 0.5;
    float d = abs(u.x - (x0 + neig * (1.0 - qb.y)));
    strahl += (1.0 - smoothstep(0.0, 0.05 + 0.06 * hash11(fi * 7.1), d)) * smoothstep(0.1, 1.0, qb.y) * (0.5 + 0.5 * hash11(fi * 9.3));
  }
  c += vec3(0.35, 0.7, 0.75) * strahl * 0.25;
  vec3 vo = voronoi2(css * vec2(0.012, 0.03));
  c += vec3(0.4, 0.8, 0.85) * (1.0 - smoothstep(0.0, 0.05, vo.y - vo.x)) * smoothstep(0.75, 1.0, qb.y) * 0.12 * (0.5 + noise2(css * 0.01));
  vec2 gz = floor(css / 15.0);
  vec2 gf = fract(css / 15.0) - 0.5 - (hash22(gz) - 0.5) * 0.6;
  c += vec3(0.6, 0.85, 0.9) * step(0.975, hash12(gz + 6.0)) * (1.0 - smoothstep(0.03, 0.08, length(gf))) * 0.5;
  vec2 bz = floor(css / 70.0);
  vec2 bf = fract(css / 70.0) - 0.5 - (hash22(bz + 2.0) - 0.5) * 0.5;
  float br = 0.06 + 0.1 * hash12(bz + 8.0);
  float blase = (1.0 - smoothstep(br - 0.01, br, length(bf))) * smoothstep(br - 0.04, br - 0.005, length(bf)) * step(0.82, hash12(bz + 4.0));
  c += vec3(0.7, 0.9, 1.0) * blase * 0.5;
  return srgbZuLin(c);
}
/** Wüste am Abend: Glut am Horizont, Dünen in drei Reihen mit Licht und Schatten, Kakteen als Schatten, Hitzeflimmern */
vec3 wuesteGrund(vec2 css, vec2 qb) {
  float asp = uAufl.x / uAufl.y;
  vec2 u = vec2(qb.x * asp, qb.y);
  vec3 c = mix(vec3(1.0, 0.7, 0.4), vec3(0.35, 0.42, 0.7), smoothstep(0.3, 1.0, qb.y));
  c += vec3(1.0, 0.6, 0.3) * exp(-length(u - vec2(0.8 * asp, 0.36)) * 5.0) * 0.6;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float hoehe = 0.34 - fi * 0.08 + 0.05 * sin(u.x * (3.0 + fi * 1.7) + fi * 2.0) + 0.02 * sin(u.x * 11.0 + fi);
    if (qb.y < hoehe) {
      float hang = cos(u.x * (3.0 + fi * 1.7) + fi * 2.0);
      vec3 sand = mix(vec3(0.85, 0.55, 0.3), vec3(0.98, 0.72, 0.42), smoothstep(-0.2, 0.6, hang));
      c = mix(sand, vec3(0.9, 0.6, 0.45), 0.35 * (1.0 - fi / 3.0)) * (0.75 + 0.1 * fi);
    }
  }
  // Kakteen
  float zx = floor(css.x / 260.0);
  float kx = (zx + 0.3 + 0.4 * hash11(zx * 3.1)) * 260.0;
  if (hash11(zx * 7.7) > 0.45) {
    float H = uAufl.y / uDpr;
    float fuss = (0.18 + 0.03 * hash11(zx)) * H;
    float hk = (0.12 + 0.08 * hash11(zx * 5.3)) * H;
    vec2 d = css - vec2(kx, fuss);
    float stamm = step(abs(d.x), 7.0) * step(0.0, d.y) * step(d.y, hk);
    float arm = step(abs(d.y - hk * 0.55), 5.0) * step(0.0, d.x) * step(d.x, 22.0) + step(abs(d.x - 20.0), 5.0) * step(hk * 0.55, d.y) * step(d.y, hk * 0.8);
    c = mix(c, vec3(0.25, 0.15, 0.12), clamp(stamm + arm, 0.0, 1.0) * 0.85);
  }
  return srgbZuLin(c);
}
/** Savanne am Abend: Goldhimmel, Schirmakazien als Schatten, hohes Gras */
vec3 savanneGrund(vec2 css, vec2 qb) {
  float asp = uAufl.x / uAufl.y;
  vec2 u = vec2(qb.x * asp, qb.y);
  vec3 c = mix(vec3(1.0, 0.78, 0.45), vec3(0.62, 0.5, 0.6), smoothstep(0.3, 1.0, qb.y));
  c += vec3(1.0, 0.7, 0.35) * exp(-length(u - vec2(0.3 * asp, 0.32)) * 4.0) * 0.7;
  float H = uAufl.y / uDpr;
  float boden = 0.24 + 0.015 * sin(u.x * 5.0);
  float zx = floor(css.x / 330.0);
  for (int i = -1; i <= 1; i++) {
    float z = zx + float(i);
    if (hash11(z * 2.3) < 0.4) continue;
    float mx = (z + 0.5 + 0.4 * (hash11(z * 9.1) - 0.5)) * 330.0;
    float kh = (0.16 + 0.06 * hash11(z * 4.4)) * H;
    vec2 d = css - vec2(mx, boden * H);
    float stamm = step(abs(d.x - d.y * 0.15), 3.5) * step(0.0, d.y) * step(d.y, kh);
    vec2 k = (d - vec2(kh * 0.15, kh)) / vec2(kh * 1.1, kh * 0.18);
    float krone = 1.0 - smoothstep(0.9, 1.0, length(k) + 0.15 * noise2(css * 0.05));
    c = mix(c, vec3(0.16, 0.1, 0.08), clamp(stamm + krone * step(-0.2, k.y), 0.0, 1.0) * 0.9);
  }
  if (qb.y < boden) c = mix(vec3(0.55, 0.38, 0.2), vec3(0.8, 0.6, 0.32), smoothstep(0.0, boden, qb.y)) * (0.85 + 0.2 * noise2(vec2(css.x * 0.4, css.y * 0.05)));
  float gras = step(fract(css.x / 4.0 + noise2(css * 0.03) * 3.0), 0.35) * step(qb.y, boden + 0.02 * noise2(css * 0.08)) * step(boden - 0.05, qb.y);
  c = mix(c, vec3(0.5, 0.34, 0.16), gras * 0.6);
  return srgbZuLin(c);
}
`;
