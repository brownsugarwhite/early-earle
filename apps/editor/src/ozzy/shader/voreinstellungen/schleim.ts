/**
 * Schleim, Runde 9 (Florian: „Der slime gefällt mir leider noch garnicht“; Vorlagen `docs/look/ozzy/shader/vorlagen/2026-11-21-r9-
 * schleimgeist.webp` und `…-r9-tropfschleim.webp`). Zwei eigene Shader statt einem mit vielen Reglern:
 * - **Schleimgeist:** leuchtend grünes, durchscheinendes Gel. Ein Strahl läuft durch die Dicke der Form (Vorder- bis Rückseite) und
 *   tastet ein Skelett ab (Schädel mit Augenhöhlen und Nase, Wirbelsäule, Rippen; Abstandsfelder, mittig in der Form, zur Front der
 *   Form gedreht), dazu Blasen. Ein Kern in der Brust glüht (Licht im Volumen, die Augenhöhlen leuchten), Knochen und Blasen sind
 *   nach ihrer Tiefe gefärbt. Außen Dampf über dem Umriss und schwebende Funken; Bühne dunkel blaugrau.
 * - **Tropfschleim:** eine bucklige, sehr glänzende Schicht; Tropfspuren laufen senkrecht nach unten (Säulen im Raum, je Säule zwei
 *   Spuren, dünn oben, unten ein runder Tropfen), weich mit den Buckeln vereinigt. Neongrün, wo die Schicht dünn ist, gelblich und
 *   durchscheinend; scharfe nasse Lichter.
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
/** Höhe der Tropfspuren an q (Maß der Form): je Säule im Raster (x, z) zwei Spuren, oben dünn, unten ein Tropfen */
float tropfen(vec3 q) {
  vec2 h = q.xz * 12.0 * uR_tropfen;
  vec2 zc = floor(h);
  float best = 0.0;
  for (int j = -1; j <= 1; j++)
    for (int i = -1; i <= 1; i++) {
      vec2 c = zc + vec2(float(i), float(j));
      for (int k = 0; k < 4; k++) {
        vec3 hz = hash33(vec3(c, float(k) * 7.3));
        vec2 m = c + 0.2 + 0.6 * hz.xy;
        float breite = 0.24 + 0.2 * hz.z;
        float dx = length(h - m) / breite;
        float y0 = 0.55 - 1.3 * hash12(c + float(k) * 3.7);
        float lang = 0.25 + 0.6 * hash12(c * 1.3 + float(k));
        float yE = y0 - lang;
        float yy = q.y;
        float rohr = 0.0;
        if (yy < y0 && yy > yE) {
          float v = (y0 - yy) / lang;
          float w = mix(0.5, 0.85, v);
          rohr = sqrt(max(1.0 - pow(dx / w, 2.0), 0.0)) * w * mix(0.75, 1.0, v);
        }
        float kopf = sqrt(max(1.4 - dx * dx - pow((yy - yE) * 16.0, 2.0), 0.0)) * 1.15;
        best = max(best, max(rohr, kopf));
      }
    }
  return best;
}
void main() {
  GPunkt g = gLesen(vUv);
  float maske = deckungBei(vUv);
  vec2 qb = gl_FragCoord.xy / uAufl;
  vec3 bild = uBuehne > 0.5 ? srgbZuLin(mix(vec3(0.13), vec3(0.2), qb.y)) : vec3(0.0);
  float a = uBuehne > 0.5 ? 1.0 : 0.0;
  if (g.a > 0.5) {
    vec3 V = zumAuge(g.p);
    vec3 n0 = g.n;
    vec3 q = (g.p - uMitte) / uRadius;
    // Buckel der Schicht, dazu Wülste, wo Tropfen beginnen, und die Tropfspuren
    float buckel = 0.5 + 0.5 * (snoise(q * 5.5) * 0.6 + snoise(q * 12.0) * 0.3 + snoise(q * 26.0) * 0.1);
    float wulst = smoothstep(0.55, 0.9, snoise(vec3(q.x * 3.0, q.y * 9.0, q.z * 3.0)));
    float tr = tropfen(q);
    float hoehe = max(buckel * 0.32 + wulst * 0.25, tr * 1.0);
    // Normale aus der Höhe (Oberflächengradient im Bild)
    vec3 dpx = dFdx(g.p), dpy = dFdy(g.p);
    float hw = hoehe * uRadius * 0.05 * uR_relief;
    float dhx = dFdx(hw), dhy = dFdy(hw);
    vec3 r1 = cross(dpy, n0), r2 = cross(n0, dpx);
    float det = dot(dpx, r1);
    vec3 n = abs(det) > 1e-12 ? normalize(abs(det) * n0 - sign(det) * (r1 * dhx + r2 * dhy)) : n0;
    // Farbe: Neongrün, dünne Stellen gelblich und durchscheinend, dicke Tropfen tiefer
    vec3 neon = srgbZuLin(vec3(0.16, 0.95, 0.12));
    vec3 gelb = srgbZuLin(vec3(0.72, 0.98, 0.16));
    vec3 tief = srgbZuLin(vec3(0.02, 0.55, 0.06));
    vec3 alb = mix(gelb, neon, smoothstep(-0.05, 0.12, hoehe + 0.3 * buckel - 0.12));
    alb = mix(alb, tief, smoothstep(0.7, 1.0, hoehe) * 0.6);
    vec3 L = ausSicht(normalize(vec3(-0.45, 0.75, 0.5)));
    float nl = dot(n, L);
    vec3 c = alb * (0.45 + 0.9 * clamp((nl + 0.5) / 1.5, 0.0, 1.0));
    c += gelb * pow(1.0 - clamp(dot(n0, V), 0.0, 1.0), 2.0) * 0.35;
    c += alb * 0.25 * (1.0 - smoothstep(0.0, 0.5, hoehe));
    float nv = clamp(dot(n, V), 0.0, 1.0);
    float fr = fresnelS(nv, 0.04);
    c += studio(reflect(-V, n)) * (fr * 1.1 + 0.03);
    c += vec3(1.0) * pow(max(dot(n, normalize(L + V)), 0.0), 220.0) * 3.0;
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
  zeile: 'Eine bucklige, nasse Schleimschicht mit Tropfspuren, die nach unten laufen; neongrün, gelblich, wo sie dünn ist',
  regler: [
    { k: 'tropfen', name: 'Tropfen', min: 0.4, max: 2.5, schritt: 0.05, grund: 1 },
    { k: 'relief', name: 'Relief', min: 0, max: 2.5, schritt: 0.05, grund: 1 },
  ],
  fragment: TROPF,
  unruhig: () => false,
});
