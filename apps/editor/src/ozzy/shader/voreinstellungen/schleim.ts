/**
 * Schleim, Runde 9 (Florian: „Der slime gefällt mir leider noch garnicht“; Vorlagen `docs/look/ozzy/shader/vorlagen/2026-11-21-r9-
 * schleimgeist.webp` und `…-r9-tropfschleim.webp`). Zwei eigene Shader statt einem mit vielen Reglern:
 * - **Schleimgeist:** leuchtend grünes, durchscheinendes Gel. Ein Strahl läuft durch die Dicke der Form (Vorder- bis Rückseite) und
 *   tastet ein Skelett ab (Schädel mit Augenhöhlen und Nase, Wirbelsäule, Rippen; Abstandsfelder, mittig in der Form, zur Front der
 *   Form gedreht), dazu Blasen. Ein Kern in der Brust glüht (Licht im Volumen, die Augenhöhlen leuchten), Knochen und Blasen sind
 *   nach ihrer Tiefe gefärbt. Außen Dampf über dem Umriss und schwebende Funken; Bühne dunkel blaugrau.
 * - **Tropfschleim** (seit dem 21.11. nachmittags genau nach der Vorlage): in vielen Lagen heruntergelaufen, Lippen mit Schatten,
 *   dicht gedrängte Tropfspuren an den Lippen, Wachswellen; Farbe aus der Dicke (Kopf von TROPF).
 */
import { bildVoreinstellung } from '../bildShader';

const GEIST = /* glsl */ `
float sdKapsel(vec3 p, vec3 a, vec3 b, float r) { vec3 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h) - r; }
float sdKiste(vec3 p, vec3 b) { vec3 q = abs(p) - b; return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0); }
float sminK(float a, float b, float k) { float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }
/** das Skelett (x quer, y oben, z vorn; Schädel um den Ursprung, Radius 1); kennung: 0 Knochen, 1 Augenhöhle */
float skelett(vec3 p, out float auge) {
  // Schädel: Kalotte, Wangen und Kiefer, Augenhöhlen und Nase ausgespart
  float kalotte = length(p * vec3(1.0, 0.92, 1.0) - vec3(0.0, 0.1, -0.05)) - 1.0;
  float kiefer = sdKiste(p - vec3(0.0, -0.72, 0.32), vec3(0.5, 0.3, 0.42)) - 0.16;
  float d = sminK(kalotte, kiefer, 0.35);
  float ax = abs(p.x);
  float hoehle = length(vec3(ax - 0.4, p.y + 0.12, p.z - 0.86)) - 0.31;
  float nase = length(vec2(ax * 1.3 + (p.y + 0.5) * 0.55, p.z - 0.98)) - 0.1;
  auge = smoothstep(0.08, -0.1, hoehle);
  d = max(d, -min(hoehle, nase));
  d = max(d, -(length(p - vec3(0.0, 0.1, -0.05)) - 0.86));
  // Wirbelsäule und Rippen (unter dem Schädel)
  float wirbel = sdKapsel(p, vec3(0.0, -1.05, -0.25), vec3(0.0, -3.6, -0.35), 0.13);
  float rippen = 1e3;
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    vec3 r = p - vec3(0.0, -1.75 - fi * 0.36, 0.25 - fi * 0.04);
    float R = 1.05 - fi * 0.08;
    vec2 t = vec2(length(r.xz * vec2(0.85, 1.25)) - R, r.y + 0.12 * r.z);
    rippen = min(rippen, length(t) - 0.075);
  }
  rippen = max(rippen, -(p.z - 0.55 + 0.2 * p.y * 0.0));
  float brustbein = sdKapsel(p, vec3(0.0, -1.75, 0.95), vec3(0.0, -3.0, 0.85), 0.08);
  return min(d, min(wirbel, min(rippen, brustbein)));
}
vec3 skelettNormale(vec3 p) {
  float a;
  vec2 e = vec2(0.015, 0.0);
  return normalize(vec3(skelett(p + e.xyy, a) - skelett(p - e.xyy, a), skelett(p + e.yxy, a) - skelett(p - e.yxy, a), skelett(p + e.yyx, a) - skelett(p - e.yyx, a)));
}
vec3 geistGrund(vec2 qb) {
  float asp = uAufl.x / uAufl.y;
  vec3 c = mix(vec3(0.13, 0.14, 0.18), vec3(0.24, 0.26, 0.32), smoothstep(0.0, 1.0, qb.y));
  float r = length((qb - vec2(0.5, 0.55)) * vec2(asp, 1.0));
  c *= 1.0 - 0.45 * smoothstep(0.35, 1.0, r);
  return srgbZuLin(c);
}
void main() {
  GPunkt g = gLesen(vUv);
  float maske = deckungBei(vUv);
  vec2 qb = gl_FragCoord.xy / uAufl;
  vec2 css = gl_FragCoord.xy / uDpr;
  vec3 bild = uBuehne > 0.5 ? geistGrund(qb) : vec3(0.0);
  float a = uBuehne > 0.5 ? 1.0 : 0.0;
  vec3 gruen = srgbZuLin(vec3(0.42, 0.78, 0.06));
  vec3 glut = srgbZuLin(vec3(0.84, 1.0, 0.4));
  vec3 tiefGruen = srgbZuLin(vec3(0.12, 0.42, 0.02));
  // Dampf über dem Umriss und schwebende Funken
  if (uBuehne > 0.5 && maske < 0.99) {
    float w = texture(tWeich, vUv - vec2(0.0, 0.03)).r;
    float dampf = smoothstep(0.02, 0.5, w) * (0.5 + 0.5 * snoise(vec3(css * 0.006, uZeit * 0.12) + vec3(0.0, -uZeit * 0.05, 0.0)));
    bild += srgbZuLin(vec3(0.5, 0.62, 0.48)) * dampf * 0.09 * uR_dampf;
    vec2 zf = css / 38.0 + vec2(0.0, -uZeit * 0.25);
    vec2 zc = floor(zf);
    vec2 h2 = hash22(zc);
    float nah = smoothstep(0.0, 0.25, texture(tWeich, vUv).r);
    float funke = (1.0 - smoothstep(0.05, 0.11, length(fract(zf) - h2))) * step(0.82, hash12(zc + 3.1)) * nah;
    bild += srgbZuLin(glut) * funke * 0.9 * uR_dampf;
  }
  if (g.a > 0.5) {
    vec3 V = zumAuge(g.p);
    vec3 n = g.n;
    vec4 hk = texture(tHinten, vUv);
    float dicke = hk.w > g.z ? hk.w - g.z : uRadius * 0.2;
    // Rahmen des Skeletts: in der Mitte der Form, zur Front gedreht (Achse A), aufrecht
    vec3 ach = pow(uHalb / max(uHalb.x, uHalb.y), vec3(4.0));
    vec3 A = normalize(vec3(ach.x, ach.y, 0.0) + vec3(1e-3, 0.0, 0.0));
    vec3 zumBlick = uKamPos - uMitte;
    vec3 vorn = normalize(mix(normalize(vec3(A.x, 0.0, A.z) + vec3(1e-4)), normalize(vec3(zumBlick.x, 0.0, zumBlick.z) + vec3(1e-4)), 0.8));
    vec3 oben = vec3(0.0, 1.0, 0.0);
    vec3 quer = cross(oben, vorn);
    float sk = uRadius * 0.135 * uR_skelett;
    vec3 o = uMitte + oben * uRadius * 0.05;
    vec3 r1 = refract(-V, n, 1.0 / 1.3);
    float schritt = dicke / 44.0;
    vec3 innen = vec3(0.0);
    float durch = 1.0;
    float leuchten = 0.0;
    vec3 kern = o - oben * sk * 2.2;
    for (int i = 0; i < 44; i++) {
      float t = (float(i) + 0.5) * schritt;
      vec3 x = g.p + r1 * t;
      // Licht im Volumen: der Kern in der Brust
      float dk = length(x - kern) / (uRadius * 0.55);
      leuchten += exp(-dk * dk * 3.0) * schritt / uRadius * 1.6;
      vec3 l = (x - o) / sk;
      vec3 pl = vec3(dot(l, quer), dot(l, oben), dot(l, vorn));
      float auge;
      float d = skelett(pl, auge);
      if (d < 0.02) {
        vec3 nl = skelettNormale(pl);
        vec3 nw = normalize(quer * nl.x + oben * nl.y + vorn * nl.z);
        vec3 Lk = ausSicht(normalize(vec3(-0.4, 0.8, 0.45)));
        float licht = 0.25 + 0.75 * max(dot(nw, Lk), 0.0) + 0.35 * max(dot(nw, normalize(kern - x)), 0.0);
        vec3 knochen = srgbZuLin(vec3(0.66, 0.7, 0.2)) * licht;
        knochen += glut * auge * 1.2;
        float tief = exp(-t / uRadius * 0.9);
        innen += durch * mix(tiefGruen * 0.5, knochen, tief);
        durch = 0.0;
        break;
      }
      // Blasen
      vec3 bq = (x - uMitte) / uRadius * 7.0;
      vec3 bc = floor(bq);
      vec3 hb = hash33(bc + 5.0);
      if (hb.x < 0.22 * uR_blasen) {
        vec3 m = bc + 0.5 + (hb - 0.5) * 0.4;
        float rb = 0.1 + 0.12 * hb.y;
        float s = length(bq - m) / rb;
        if (s < 1.0) {
          innen += durch * (gruen * 1.3 + glut * 0.4 * smoothstep(0.6, 1.0, s)) * 0.6;
          durch *= 0.35;
        }
      }
    }
    // das Gel: viel Licht von innen, an dünnen Stellen heller und gelblicher, dazu der Grund durch die Form
    float weg = dicke / uRadius;
    vec3 trans = mix(gruen, tiefGruen, smoothstep(0.2, 1.1, weg));
    vec3 c = trans * 0.55 * durch + glut * leuchten * 0.9 * durch + innen;
    // nasse Oberfläche: weicher großer Glanz oben, scharfe Lichter, Rand
    vec3 L = ausSicht(normalize(vec3(-0.3, 0.85, 0.4)));
    float nv = clamp(dot(n, V), 0.0, 1.0);
    float fr = fresnelS(nv, 0.03);
    c = c * (1.0 - fr * 0.6) + studio(reflect(-V, n)) * fr * 0.8;
    c += vec3(1.0) * pow(max(dot(n, normalize(L + V)), 0.0), 60.0) * 0.6;
    c += vec3(0.9, 1.0, 0.85) * pow(max(dot(n, normalize(L + V)), 0.0), 900.0) * 2.5;
    c += gruen * pow(1.0 - nv, 3.0) * 0.6;
    bild = mix(bild, srgbZuLin(vec3(0.0)) + c, maske);
    a = max(a, maske);
  }
  farbe = vec4(linZuSrgb(aces(bild * 1.05)) * a, a);
}
`;

const TROPF = /* glsl */ `
/**
 * Tropfschleim nach Florians Vorlage (21.11., „kannst du versuchen dieses material wirklich genauso hinzubekommen?“): Der Schleim ist
 * in vielen dicht gestaffelten Lagen heruntergelaufen. Jede Lage endet unten in einer gerundeten Lippe (darunter Schatten); die Lippen
 * mäandern, reißen ab und setzen woanders wieder an. An ihnen hängen kurze Nasen und lange Tropfspuren (dünner Schwanz, dicker runder
 * Kopf). Lage um die Hochachse (Winkel und Höhe, ohne Naht); oben und unten, wo die Fläche flach liegt, nur Buckel. Darunter Buckel,
 * Mulden und Wachswellen. Farbe aus der Dicke: dünn gelbgrün und durchscheinend, dick sattgrün, an steilen Kanten und in Mulden dunkel;
 * viele kleine scharfe Lichter.
 */
const float LAGE = 0.11;
/** Versatz der Lippen (nahtlos um die Achse, in drei Maßstäben) */
float lippenVersatz(float w, float y) {
  return 0.55 * snoise(vec3(cos(w) * 1.6, sin(w) * 1.6, y * 1.8)) + 0.6 * snoise(vec3(cos(w) * 4.5, sin(w) * 4.5, y * 3.5 + 3.0)) + 0.22 * snoise(vec3(cos(w) * 11.0, sin(w) * 11.0, y * 6.0 + 9.0));
}
/**
 * wie kräftig die Lippe km am Winkel w ist (0: abgerissen): smoothstep(-0.35, 0.55, lippeHoch + lippeTief). Der tiefe Anteil ändert
 * sich langsam und wird je Bildpunkt einmal gerechnet, der hohe je Tropfen an seiner Mitte (sonst wären Tropfen halb da).
 */
float lippeHoch(float w, float km) { return snoise(vec3(cos(w) * 6.0, sin(w) * 6.0, km * 1.31 + 5.0)); }
float lippeTief(float w, float km) { return 0.35 * snoise(vec3(cos(w) * 1.5, sin(w) * 1.5, km * 0.7)); }
/** ein Strom: Höhe (Maß der Form) an (du, dy), dy über der Unterkante des Kopfs; rh Kopf, rt Schwanz, L Länge, platt: weicher Deckel */
float strom(float du, float dy, float rh, float rt, float L, float platt) {
  if (dy < -0.001 || dy > L || abs(du) > rh * 1.05) return 0.0;
  float kopf = 0.0;
  if (dy < rh * 2.0) {
    float dk = length(vec2(du, dy - rh)) / rh;
    kopf = rh * max(1.0 - dk * dk, 0.0);
  }
  float r = mix(rh * 0.82, rt, smoothstep(rh, rh + 6.0 * rt + 0.02, dy));
  float xr = du / r;
  // oben läuft die Spur weich in die Fläche aus
  float schwanz = dy > rh ? r * max(1.0 - xr * xr, 0.0) * smoothstep(L, L - max(0.35 * L, 0.04), dy) : 0.0;
  float hs = max(kopf, schwanz);
  return hs * platt / (hs + platt);
}
void main() {
  GPunkt g = gLesen(vUv);
  float maske = deckungBei(vUv);
  vec2 qb = gl_FragCoord.xy / uAufl;
  vec3 bild = uBuehne > 0.5 ? srgbZuLin(vec3(0.165 + 0.02 * qb.y)) : vec3(0.0);
  float a = uBuehne > 0.5 ? 1.0 : 0.0;
  if (g.a > 0.5) {
    vec3 V = zumAuge(g.p);
    vec3 n0 = g.n;
    vec3 q = (g.p - uMitte) / uRadius;
    float w = atan(q.z, q.x + (abs(q.x) + abs(q.z) < 1e-5 ? 1e-5 : 0.0));
    float y = q.y;
    float seite = smoothstep(0.86, 0.62, abs(n0.y));
    float sk = 1.0 / uR_tropfen;
    // Lagen: Lippe unten (t = 0), darüber dünner werdend; unter der nächsten Lippe Schatten
    float S = LAGE * sk;
    // der Versatz der Lippen ändert sich über die Breite eines Tropfens kaum: je Bildpunkt einmal (spart je Tropfen drei Rauschen)
    float vers = lippenVersatz(w, y);
    float yy = y / S + vers;
    float k = floor(yy);
    float t = fract(yy);
    float lt0 = lippeTief(w, k), lt1 = lippeTief(w, k + 1.0), lt2 = lippeTief(w, k + 2.0), lt3 = lippeTief(w, k + 3.0);
    float st0 = smoothstep(-0.35, 0.55, lippeHoch(w, k) + lt0);
    float st1 = smoothstep(-0.35, 0.55, lippeHoch(w, k + 1.0) + lt1);
    float klumpen = 0.65 + 0.7 * (snoise(q * 7.0 + 2.0) * 0.5 + 0.5);
    // die Lage: Wulst über der Lippe, nach oben dünner und unter der nächsten Lippe auf null (stetig, sonst springt die Höhe)
    float lage = (smoothstep(0.0, 0.26, t) * (0.3 + 0.45 * (1.0 - t)) * smoothstep(1.0, 0.78, t) + 0.55 * exp(-pow((t - 0.17) / 0.14, 2.0)) * smoothstep(0.0, 0.09, t)) * (0.15 + 0.85 * st0) * klumpen;
    // Schatten unter der Lippe, stetig über ihre Unterkante (dort beginnt die Lage darüber im selben Schatten)
    float unterLippe = max(smoothstep(0.66, 1.0, t) * st1, (1.0 - smoothstep(0.0, 0.08, t)) * st0);
    // an den Lippen darüber: kurze Nasen (dicht) und lange Tropfspuren mit Kopf
    float spurH = 0.0;
    for (int f = 0; f < 2; f++) {
      float N = floor((f == 0 ? 140.0 : 110.0) / sk);
      float zi = floor(w / 6.2831853 * N);
      for (int m = 1; m <= 3; m++) {
        if (f == 0 && m >= 2) continue;
        float km = k + float(m);
        for (int j = -1; j <= 1; j++) {
          float ci = mod(zi + float(j), N);
          vec3 h = hash33(vec3(ci, km, 3.7 + float(f) * 11.0));
          float wc = (ci + 0.2 + 0.6 * h.y) / N * 6.2831853;
          float lp = smoothstep(-0.35, 0.55, lippeHoch(wc, km) + (m == 1 ? lt1 : (m == 2 ? lt2 : lt3)));
          if (h.x > (f == 0 ? 0.8 * smoothstep(0.35, 0.8, lp) : 0.6 * (0.45 + 0.55 * lp))) continue;
          float du = mod(w - wc + 3.14159265, 6.2831853) - 3.14159265;
          float yTop = (km - vers) * S;
          float rt = (f == 0 ? 0.013 + 0.009 * fract(h.y * 7.1) : 0.011 + 0.008 * fract(h.y * 7.1)) * sk;
          float rh = rt * (f == 0 ? 1.15 : 1.5);
          float L = S * (f == 0 ? 0.25 + 0.5 * h.z : 0.5 + 1.5 * h.z * h.z);
          spurH = max(spurH, strom(du, y - (yTop - L), rh, rt, L, 0.03 * sk));
        }
      }
    }
    spurH = spurH / (0.02 * sk) * seite;
    // Buckel, Mulden und Wachswellen darunter
    float b1 = snoise(q * 3.2);
    float buckel = b1 * 0.7 + snoise(q * 7.0) * 0.38 + snoise(q * 15.0) * 0.16;
    // Wellen um die Achse nur an den Seiten (am Pol ändert sich der Winkel zu schnell), dazu Wellen im Raum
    float welle = snoise(vec3(cos(w) * 7.0, sin(w) * 7.0, y * 20.0)) * 0.5 * seite + snoise(q * 16.0) * 0.3;
    float H = lage * seite + spurH * 0.75;
    float hoehe = H + buckel * mix(1.1, 0.85, seite) + welle * 0.12;
    float dicke = clamp(0.42 + 0.55 * H + 0.22 * buckel + (1.0 - seite) * 0.15, 0.0, 1.3);
    // Normale aus der Höhe (Oberflächengradient im Bild)
    vec3 dpx = dFdx(g.p), dpy = dFdy(g.p);
    float hw = hoehe * uRadius * 0.026 * uR_relief;
    float dhx = dFdx(hw), dhy = dFdy(hw);
    vec3 r1 = cross(dpy, n0), r2 = cross(n0, dpx);
    float det = dot(dpx, r1);
    vec3 n = abs(det) > 1e-12 ? normalize(abs(det) * n0 - sign(det) * (r1 * dhx + r2 * dhy)) : n0;
    float steil = 1.0 - max(dot(n, n0), 0.0);
    // Farbe aus der Dicke: dünn gelbgrün und durchscheinend, dick sattgrün, an steilen Kanten, in Mulden und unter Lippen dunkel
    vec3 limette = srgbZuLin(vec3(0.76, 0.94, 0.2));
    vec3 neon = srgbZuLin(vec3(0.2, 0.9, 0.1));
    vec3 tief = srgbZuLin(vec3(0.02, 0.48, 0.04));
    vec3 kante = srgbZuLin(vec3(0.0, 0.34, 0.02));
    vec3 alb = mix(mix(neon, limette, 0.6), neon, smoothstep(0.12, 0.5, dicke));
    // große Zonen, in denen der Schleim gelbgrün durchscheint
    alb = mix(alb, limette, smoothstep(0.0, 0.7, snoise(q * 1.3 + 4.0)) * 0.5 * (1.0 - smoothstep(0.3, 0.9, H)));
    alb = mix(alb, tief, smoothstep(0.9, 1.3, dicke) * 0.4);
    alb = mix(alb, kante, smoothstep(0.1, 0.7, steil) * 0.35);
    float schatten = unterLippe * seite * (1.0 - 0.7 * smoothstep(0.2, 0.7, spurH));
    float mulde = smoothstep(0.1, -0.5, buckel) * (1.0 - smoothstep(0.1, 0.5, H));
    float ao = (1.0 - 0.6 * schatten) * (1.0 - 0.4 * mulde);
    alb = mix(alb, tief, max(schatten * 0.5, mulde * 0.3));
    // Licht: von oben links, Glut von innen, heller Saum am Umriss
    vec3 L = ausSicht(normalize(vec3(-0.45, 0.75, 0.5)));
    float nl = dot(n, L);
    vec3 c = alb * (0.18 + 1.35 * clamp((nl + 0.3) / 1.3, 0.0, 1.0)) * ao;
    // die Kugel als Ganzes: nach unten rechts dunkler (Volumen)
    c *= mix(0.3, 1.15, smoothstep(-0.5, 0.85, dot(n0, L)));
    c += limette * 0.32 * (1.0 - smoothstep(0.25, 0.75, dicke)) * clamp(nl + 0.4, 0.0, 1.0) * ao;
    c += neon * pow(1.0 - clamp(dot(n0, V), 0.0, 1.0), 2.5) * 0.55;
    // nass: viele kleine scharfe Lichter (Fenster der Umgebung), leicht kühl
    float nv = clamp(dot(n, V), 0.0, 1.0);
    float fr = fresnelS(nv, 0.04);
    vec3 umg = studio(reflect(-V, n)) * vec3(0.85, 1.0, 1.08);
    float spiegelt = ao * (1.0 - smoothstep(0.15, 0.5, steil));
    c += umg * (fr * 0.35 + 0.006) * spiegelt + smoothstep(0.7, 1.5, umg) * (fr + 0.04) * 1.8 * spiegelt;
    vec3 Hh = normalize(L + V);
    c += vec3(0.9, 1.0, 1.0) * pow(max(dot(n, Hh), 0.0), 520.0) * 6.0 * ao;
    c += vec3(0.85, 1.0, 1.0) * pow(max(dot(n, normalize(ausSicht(normalize(vec3(0.5, 0.35, 0.8))) + V)), 0.0), 600.0) * 2.2 * ao;
    // buckliger Umriss wie in der Vorlage: Das Relief hebt die Haut bis D über die Form, am Umriss sieht man darum nur, was hoch genug
    // liegt (sichtbar, wo die Höhe größer ist als 1 minus Abstand zum Umriss durch D). Der Abstand im Bild kommt aus der Deckung
    // ringsum: je Ring, wie viele der acht Richtungen draußen liegen (bei geradem Umriss im Abstand d: r · cos(π n / 8)).
    // (gesucht wird nur, wo die Haut sich vom Blick abwendet: Weiter innen ist der Umriss sicher weiter weg als die Suche reicht)
    float dRand = 1e3;
    if (dot(n0, V) < 0.55) {
      for (int r = 0; r < 6; r++) {
        float rr = 3.0 * pow(1.6, float(r)) * uDpr;
        float aus = 0.0;
        for (int i = 0; i < 8; i++) {
          vec2 o = vec2(cos(float(i) * 0.7853982), sin(float(i) * 0.7853982)) * rr / uAufl;
          aus += 1.0 - step(0.5, textureLod(tNormal, vUv + o, 0.0).a);
        }
        if (aus > 0.5) dRand = min(dRand, rr * cos(3.14159265 * (aus - 0.5) / 8.0));
      }
    }
    vec4 pv = uView * vec4(g.p, 1.0);
    float wpp = (uOrtho > 0.5 ? 1.0 : -pv.z) * 2.0 / (uProj[1][1] * uAufl.y);
    float Dpx = min(uRadius * 0.06 * uR_relief / max(wpp, 1e-9), 30.0 * uDpr);
    // nur die runden Formen zählen (Buckel und die dicken Lippen), nicht die schmalen Tropfen: am Umriss stehen Wülste, keine Spitzen
    float hGrob = b1 * 0.4 + snoise(q * 12.0) * 0.6 + lage * seite * 0.5 + spurH * 0.25;
    float hn = clamp((hGrob + 1.0) / 2.4, 0.0, 1.0);
    maske *= smoothstep(-0.05, 0.05, hn - (1.0 - dRand / max(Dpx, 1e-3)));
    bild = mix(bild, c, maske);
    a = max(a, maske);
  }
  farbe = vec4(linZuSrgb(aces(bild)) * a, a);
}
`;

export const SCHLEIMGEIST = bildVoreinstellung({
  id: 'schleimgeist',
  name: 'Schleimgeist',
  gruppe: 'Materialien',
  zeile: 'Leuchtend grünes Gel mit einem Skelett im Inneren (Schädel, Rippen, Wirbelsäule), glühender Kern, Blasen, Dampf und Funken',
  regler: [
    { k: 'skelett', name: 'Skelett', min: 0, max: 1.8, schritt: 0.05, grund: 1 },
    { k: 'blasen', name: 'Blasen', min: 0, max: 2, schritt: 0.05, grund: 1 },
    { k: 'dampf', name: 'Dampf', min: 0, max: 2, schritt: 0.05, grund: 1 },
  ],
  fragment: GEIST,
  rueckseite: true,
  weich: { skala: 0.25, radius: 14 },
  unruhig: () => true,
});

export const TROPFSCHLEIM = bildVoreinstellung({
  id: 'tropfschleim',
  name: 'Tropfschleim',
  gruppe: 'Materialien',
  zeile: 'Schleim, in vielen Lagen heruntergelaufen: dicke Lippen mit Schatten darunter, dicht gedrängte Tropfspuren mit runden Köpfen, Wachswellen; durchscheinend gelbgrün bis sattgrün, viele kleine nasse Lichter',
  regler: [
    { k: 'tropfen', name: 'Tropfen', min: 0.4, max: 2.5, schritt: 0.05, grund: 1 },
    { k: 'relief', name: 'Relief', min: 0, max: 2.5, schritt: 0.05, grund: 1 },
  ],
  fragment: TROPF,
  unruhig: () => false,
});
