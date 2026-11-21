/**
 * Barcelonas raue Straßen (Runde 9; Florian: „Bitte auch noch so richtig roughe shader die die rauen straßen barcelonas
 * wiederspiegeln. lass dir hier etwas richtig cooles einfallen.“). Vorlagen `docs/look/ozzy/shader/vorlagen/2026-11-21-r9-panot-flor.webp`
 * und `…-r9-flor-popart.webp`, Recherche `docs/research/2026-11-21-runde-9-recherche.md`, Abschnitt 5.
 * - **Panot** nach dem Regen, nachts: die Gehwegplatte mit der Blume (flache Rillen, erhabene Scheiben), Zementgrau mit Zuschlag; echt
 *   durch Unordnung: jede Platte leicht gekippt, abgelaufene Lauflinien, gesprungene Platten mit abgesackter Seite, ausgebrochene
 *   Ecken, ersetzte hellere Platten, Asphaltflicken, Kaugummi in Gruppen, Flecken mit dunklem Rand. Wasser steht nur in Rillen und
 *   Fugen und spiegelt Natriumlampen, Neon und die Gasse; der Rest ist nur dunkler. Das Relief beschattet sich selbst. (Pfützen in
 *   „Senken“ aus Rauschen sahen auf der Form wie schwarze Löcher aus.)
 * - **Flor Pop:** die Blume als Pop-Art im Spider-Verse-Druck: Kacheln in den zwölf Farbpaaren der Vorlage mit weißen Lücken, die
 *   Farbplatte versetzt gegen die Schwarzplatte (Passerfehler), Schatten als Rasterpunkte und Schraffur, Glanz als weiße Form,
 *   Randlicht aus Punkten, Papierkorn, dicke Kontur.
 * - **Persiana:** ein Rollladen im Raval: waagerechte Lamellen, verzinkt mit Zinkblumen, darüber ein Graffiti aus dicken,
 *   kursiven Buchstaben (Verlauf, schwarze Kontur, Glanzstriche, 3D-Kante, weißer Schnitt, Wolke dahinter, Läufer), Tags, ein
 *   Aufkleber mit dem schwarzen Schnuller (Gruß an El Xupet Negre); in den Fugen der Lamellen keine Farbe, unten Rost mit Fahnen.
 * Gemeinsam: Kacheln aus dem Würfelraster im Raum (die Fuge, wo die Fläche eine Rasterebene kreuzt; je Kachel die Ebene nach der
 * Normale an ihrer Mitte, so bricht die Blume nicht), die Blume aus einer Geometrie (Mittelring außen 0,205, innen 0,125; vier
 * Blütenringe bei ±0,185, außen 0,185, innen 0,10; Lücke 0,02). Für Schrift die senkrechte Projektion auf eine von vier Ebenen um die
 * Hochachse (y bleibt senkrecht, Grenze verrauscht).
 */
import { bildVoreinstellung } from '../bildShader';
import type { ReglerZeile, Voreinstellung } from '../kern';
import { BUEHNEN } from './buehnen';
import { DRAUSSEN } from './fels';

/** gemeinsam: Kacheln, Blume, Ebenen für Schrift, Nachtlicht, Gasse */
export const BCN = /* glsl */ `
${DRAUSSEN}
/**
 * Kachel aus dem Würfelraster (k Kacheln je Radius): Abstand zur Fuge längs der Fläche (Kachelbreiten), die Zelle, der Ort in der
 * Kachel (−0,5 … 0,5) und die zwei Richtungen dieses Orts in der Welt (die Ebene nach der Normale an der Mitte der Kachel)
 */
float kachel(vec3 p, vec3 n, float k, out vec3 zelle, out vec2 t, out vec3 e1, out vec3 e2) {
  vec3 x = (p - uMitte) / uRadius * k + 0.5;
  zelle = floor(x);
  vec3 f = fract(x);
  vec3 sinW = sqrt(max(1.0 - n * n, 1e-3));
  vec3 dFl = min(f, 1.0 - f) / sinW;
  vec3 c = uMitte + (zelle / k) * uRadius;
  vec3 m = c - n * dot(c - p, n);
  vec4 nm = texture(tNormal, insBild(m));
  vec3 nk = nm.a > 0.5 && dot(normalize(nm.xyz + 1e-6), n) > 0.5 ? normalize(nm.xyz) : n;
  vec3 an = abs(nk);
  vec3 o = f - 0.5;
  if (an.x >= an.y && an.x >= an.z) { t = vec2(-o.z * sign(nk.x), o.y); e1 = vec3(0.0, 0.0, -sign(nk.x)); e2 = vec3(0.0, 1.0, 0.0); }
  else if (an.y >= an.z) { t = vec2(o.x, -o.z * sign(nk.y)); e1 = vec3(1.0, 0.0, 0.0); e2 = vec3(0.0, 0.0, -sign(nk.y)); }
  else { t = vec2(o.x * sign(nk.z), o.y); e1 = vec3(sign(nk.z), 0.0, 0.0); e2 = vec3(0.0, 1.0, 0.0); }
  return min(dFl.x, min(dFl.y, dFl.z));
}
/** die Ringe der Blume (Kachel −0,5 … 0,5): 1 auf einem Ring; dw verbreitert sie (Linien um die Ringe) */
float blumeRinge(vec2 t, float aa, float dw) {
  float lc = length(t);
  float rc = 1.0 - smoothstep(0.04 + dw - aa, 0.04 + dw + aa, abs(lc - 0.165));
  float lp = length(abs(t) - 0.185);
  float rp = 1.0 - smoothstep(0.0425 + dw - aa, 0.0425 + dw + aa, abs(lp - 0.1425));
  rp *= smoothstep(0.225 - dw - aa, 0.225 - dw + aa, lc);
  return max(rc, rp);
}
/** Relief des Panot: Rille (0 … 1, flach gerundet) und die Scheiben in den Ringen */
float blumeRille(vec2 t, out float scheibe) {
  float lc = length(t);
  float lp = length(abs(t) - 0.185);
  float aussen = smoothstep(0.222, 0.238, lc);
  float rc = 1.0 - smoothstep(0.018, 0.04, abs(lc - 0.165));
  float rp = (1.0 - smoothstep(0.02, 0.042, abs(lp - 0.1425))) * aussen;
  scheibe = max(1.0 - smoothstep(0.095, 0.125, lc), (1.0 - smoothstep(0.07, 0.1, lp)) * aussen);
  return max(rc, rp);
}
/** Schrift und Lamellen: senkrechte Projektion auf eine von vier Ebenen um die Hochachse (Grenze verrauscht); y bleibt senkrecht */
vec2 hochEbene(vec3 q, vec3 n, out float ebene) {
  float w = atan(n.z, n.x) / 0.7853982 + 0.22 * snoise(q * 2.2);
  ebene = mod(floor(w + 0.5), 8.0);
  float a = ebene * 0.7853982;
  return vec2(dot(q, vec3(sin(a), 0.0, -cos(a))), q.y);
}
/** Umgebung bei Nacht (für Spiegelungen): Lichter fest zum Betrachter, Natriumlampen, kühles Ladenlicht, Neon (linear) */
vec3 nachtUmgebung(vec3 R) {
  vec3 r = normalize((uView * vec4(R, 0.0)).xyz);
  vec3 c = mix(vec3(0.05, 0.04, 0.035), vec3(0.1, 0.1, 0.16), smoothstep(-0.2, 0.8, r.y));
  c += srgbZuLin(vec3(1.0, 0.68, 0.26)) * 7.0 * smoothstep(0.986, 0.995, dot(r, normalize(vec3(-0.35, 0.85, 0.4))));
  c += srgbZuLin(vec3(1.0, 0.68, 0.26)) * 4.0 * smoothstep(0.99, 0.996, dot(r, normalize(vec3(0.55, 0.7, -0.45))));
  c += srgbZuLin(vec3(0.55, 0.72, 1.0)) * 1.1 * smoothstep(0.7, 0.96, dot(r, normalize(vec3(0.9, 0.1, 0.3))));
  c += vec3(1.0, 0.04, 0.35) * 2.4 * smoothstep(0.955, 0.985, dot(r, normalize(vec3(-0.75, 0.2, 0.62))));
  c += vec3(0.0, 0.75, 1.0) * 2.0 * smoothstep(0.965, 0.99, dot(r, normalize(vec3(0.25, 0.25, 0.93))));
  return c;
}
/** Licht bei Nacht: Natriumlampe oben links (#ffae42), kühles Ladenlicht von rechts, wenig Himmel; schatten nur fürs Lampenlicht */
vec3 nachtLicht(vec3 alb, vec3 n, vec3 V, float ao, float rauh, float schatten) {
  vec3 Ls = ausSicht(normalize(vec3(-0.35, 0.85, 0.4)));
  vec3 Lb = ausSicht(normalize(vec3(0.9, 0.1, 0.3)));
  vec3 cs = mix(srgbZuLin(vec3(1.0, 0.68, 0.26)), vec3(1.0), 0.3);
  vec3 cb = srgbZuLin(vec3(0.55, 0.72, 1.0));
  float nls = max(dot(n, Ls), 0.0);
  float nlb = max(dot(n, Lb), 0.0);
  vec3 c = alb * (cs * 2.1 * nls * schatten + cb * 0.9 * nlb + vec3(0.07, 0.085, 0.12) * (0.6 + 0.4 * n.y));
  vec3 H = normalize(Ls + V);
  c += cs * ggx(max(dot(n, H), 0.0), rauh) * fresnelS(max(dot(H, V), 0.0), 0.04) * nls * 2.2 * schatten;
  H = normalize(Lb + V);
  c += cb * ggx(max(dot(n, H), 0.0), rauh) * fresnelS(max(dot(H, V), 0.0), 0.04) * nlb * 0.8;
  return c * ao;
}
/** Bühne: eine enge Gasse bei Nacht, unscharf: Hauswände, warme Fenster, Laternen, nasses Pflaster (linear) */
vec3 gasseGrund(vec2 qb) {
  float asp = uAufl.x / uAufl.y;
  float x = (qb.x - 0.5) * asp;
  vec3 c = mix(vec3(0.02, 0.024, 0.045), vec3(0.07, 0.08, 0.15), smoothstep(0.3, 1.0, qb.y));
  float flucht = 0.16 + 0.3 * qb.y;
  float wand = smoothstep(flucht - 0.025, flucht + 0.025, abs(x));
  vec3 stein = vec3(0.045, 0.032, 0.024) * (0.7 + 0.6 * smoothstep(0.2, 1.2, abs(x)));
  vec2 f = vec2((abs(x) - flucht) / (0.08 + 0.12 * qb.y), qb.y * 7.0);
  vec2 fi = floor(f), ff = fract(f);
  float fenster = smoothstep(0.18, 0.26, ff.x) * smoothstep(0.82, 0.74, ff.x) * smoothstep(0.14, 0.22, ff.y) * smoothstep(0.86, 0.78, ff.y);
  stein += fenster * mix(vec3(0.004), vec3(0.55, 0.28, 0.08), step(0.62, hash12(fi + sign(x) * 7.0)));
  c = mix(c, stein, wand);
  for (int i = 0; i < 5; i++) {
    float fi2 = float(i);
    float seite = mod(fi2, 2.0) * 2.0 - 1.0;
    float yy = 0.38 + 0.11 * fi2;
    vec2 m = vec2(seite * (0.19 + 0.3 * yy), yy);
    float d = length(vec2(x, qb.y) - m);
    float r = 0.016 + 0.012 * (1.0 - yy);
    c += vec3(1.0, 0.6, 0.2) * (smoothstep(r, r * 0.4, d) * 2.2 + exp(-d * d / (r * r * 36.0)) * 0.25);
  }
  float boden = smoothstep(0.24, 0.1, qb.y);
  float streif = smoothstep(0.55, 1.0, noise2(vec2(x * 26.0, qb.y * 2.5))) * smoothstep(0.5, 0.0, abs(abs(x) - 0.3));
  c = mix(c, vec3(0.015, 0.016, 0.024) + vec3(0.6, 0.3, 0.08) * 0.3 * streif, boden);
  return c;
}
`;

const PANOT_GLSL = /* glsl */ `
${BCN}
void main() {
  GPunkt g = gLesen(vUv);
  float maske = deckungBei(vUv);
  vec2 qb = gl_FragCoord.xy / uAufl;
  vec3 bild = uBuehne > 0.5 ? gasseGrund(qb) : vec3(0.0);
  float a = uBuehne > 0.5 ? 1.0 : 0.0;
  if (g.a > 0.5) {
    vec3 V = zumAuge(g.p);
    vec3 n0 = g.n;
    vec3 q = (g.p - uMitte) / uRadius;
    vec3 zelle, e1, e2;
    vec2 t;
    float k = 6.0 * uR_platten;
    float rand = kachel(g.p, n0, k, zelle, t, e1, e2);
    float px = fwidth(rand) + 1e-4;
    float pid = hash13(zelle + 0.31);
    bool asphalt = snoise(q * 1.7 + 5.0) > 0.74;
    float ersetzt = step(0.92, pid);
    // jede Platte leicht gekippt: Die Spiegelungen brechen an den Fugen
    vec3 nT = normalize(n0 + 0.05 * (hash33(zelle * 1.3) - 0.5));
    float scheibe;
    float rille = blumeRille(t, scheibe);
    // Lauflinien: abgelaufen, die Rillen flacher, der Zuschlag frei
    float lauf = smoothstep(-0.1, 0.5, snoise(q * 0.9 + 2.0)) * (1.0 - ersetzt);
    rille *= 1.0 - 0.35 * lauf;
    // Sprung durch die Platte, eine Seite abgesackt
    float sprung = 0.0;
    if (hash13(zelle + 7.7) < 0.2) {
      vec2 rn = normalize(hash32(zelle.xy + zelle.z * 3.1).xy - 0.5);
      float d = dot(t, rn) - (hash13(zelle + 2.2) - 0.5) * 0.5 + 0.03 * snoise(vec3(t * 9.0, pid * 7.0)) + 0.01 * snoise(vec3(t * 37.0, pid));
      sprung = 1.0 - smoothstep(0.004, 0.004 + px * 1.2, abs(d));
      nT = normalize(nT + step(0.0, d) * 0.07 * (e1 * rn.x + e2 * rn.y));
    }
    // Fuge, gefaste Kante, ausgebrochene Ecke
    float fuge = 1.0 - smoothstep(0.012, 0.012 + px * 1.5, rand);
    float fase = smoothstep(0.012, 0.05, rand);
    float ecke = 0.0;
    if (hash13(zelle + 4.4) < 0.18) {
      vec2 eckeR = (step(0.5, hash32(zelle.xy * 1.7 + zelle.z).xy) - 0.5);
      ecke = 1.0 - smoothstep(0.0, 0.01 + px, length(t - eckeR) - (0.07 + 0.08 * hash13(zelle + 5.5)) - 0.025 * snoise(q * 70.0));
    }
    float korn = snoise(q * 160.0) * 0.5 + snoise(q * 420.0) * 0.5;
    float h = fase * (1.0 - 0.9 * rille) + scheibe * 0.12 - ecke * 0.5 - sprung * 0.4 + korn * 0.05 * (1.0 + lauf);
    // Reliefschatten: vom Bildpunkt in der Ebene der Kachel zum Licht, die Höhe der Blume abfragen
    vec3 Ls = ausSicht(normalize(vec3(-0.35, 0.85, 0.4)));
    vec2 l2 = vec2(dot(Ls, e1), dot(Ls, e2));
    float steig = max(dot(Ls, nT), 0.02) / max(length(l2), 1e-3);
    float schatten = 1.0;
    if (!asphalt) {
      float tiefe = 0.035 * uR_relief;
      float h0 = 1.0 - 0.9 * rille + scheibe * 0.12;
      vec2 lr = normalize(l2 + 1e-5);
      for (int i = 1; i <= 8; i++) {
        float s = float(i) * 0.011;
        float sc;
        float ri = blumeRille(t + lr * s, sc) * (1.0 - 0.35 * lauf);
        float ueber = (1.0 - 0.9 * ri + sc * 0.12 - h0) * tiefe - s * steig;
        schatten = min(schatten, 1.0 - smoothstep(0.0, 0.004, ueber));
      }
      schatten = mix(1.0, schatten, fase);
    }
    // Farbe: Zementgrau mit Zuschlag, ersetzte Platten heller
    vec3 beton = vec3(0.557, 0.553, 0.537) * (0.9 + 0.2 * (pid - 0.5));
    beton = mix(beton, vec3(0.663, 0.659, 0.635), ersetzt);
    beton = mix(beton, vec3(0.72, 0.71, 0.68), smoothstep(0.5, 0.8, snoise(q * 300.0 + 4.0)) * (0.35 + 0.4 * lauf));
    beton = mix(beton, vec3(0.37, 0.365, 0.35), smoothstep(0.55, 0.85, snoise(q * 260.0 + 9.0)) * 0.6);
    beton *= 0.9 + 0.12 * snoise(q * 7.0);
    // Schmutz in Rillen und Fugen, Flecken mit dunklem Rand
    float dreck = clamp(max(rille * 0.8, max(fuge, sprung)) * uR_dreck, 0.0, 1.0);
    beton = mix(beton, vec3(0.172, 0.165, 0.153), dreck * 0.85);
    float fl = snoise(q * 2.6 + 11.0) + 0.3 * snoise(q * 9.0);
    float fleck = smoothstep(0.45, 0.6, fl);
    float fleckRand = smoothstep(0.42, 0.47, fl) * (1.0 - smoothstep(0.5, 0.6, fl));
    beton = mix(beton, beton * vec3(0.78, 0.74, 0.68), fleck * 0.5 * uR_dreck);
    beton = mix(beton, beton * 0.6, fleckRand * 0.5 * uR_dreck);
    // Kaugummi: flache Scheiben in Gruppen, verschieden groß, mit grauem Hof
    vec3 km;
    vec3 kz = felsZelle(q * 38.0, km);
    float gruppe = smoothstep(-0.2, 0.7, snoise(q * 2.2 + 3.0));
    float kr = 0.12 + 0.22 * hash11(kz.z * 7.0);
    float gum = step(1.0 - 0.22 * gruppe * uR_dreck, hash11(kz.z * 3.3));
    float kaugummi = gum * (1.0 - smoothstep(kr - 0.02, kr, kz.x));
    float hof = gum * (1.0 - smoothstep(kr, kr * 1.7, kz.x)) * (1.0 - kaugummi);
    beton = mix(beton, beton * 0.8, hof * 0.6);
    beton = mix(beton, mix(vec3(0.239, 0.231, 0.22), vec3(0.353, 0.337, 0.314), hash11(kz.z * 5.0)), kaugummi);
    if (asphalt) {
      beton = mix(vec3(0.2, 0.2, 0.21), vec3(0.36, 0.35, 0.34), smoothstep(0.3, 0.8, snoise(q * 300.0))) * (0.9 + 0.2 * snoise(q * 20.0));
      fuge = 0.0;
      rille = 0.0;
      h = 0.8 + 0.08 * snoise(q * 260.0);
    }
    // Nässe: Wasser steht nur in Rillen, Fugen und Senken (wo es nicht abläuft), der Rest ist dunkler und etwas glatter
    float oben = smoothstep(-0.25, 0.5, n0.y);
    float wasser = uR_nass * oben * smoothstep(0.45, 0.75, max(rille, max(fuge, sprung)));
    vec3 alb = srgbZuLin(beton) * mix(1.0, 0.58, clamp(uR_nass, 0.0, 1.0) * (1.0 - wasser));
    float rauh = mix(0.75, 0.45, lauf * 0.5 + clamp(uR_nass, 0.0, 1.0) * 0.4);
    float ao = mix(0.5, 1.0, fase) * (1.0 - 0.4 * rille) * (1.0 - 0.3 * hof);
    vec3 n = hoeheNormale(nT, g.p, (h + kaugummi * 0.05) * uRadius / k * 0.035 * uR_relief);
    vec3 c = nachtLicht(alb, n, V, ao, rauh, schatten);
    vec3 Rw = reflect(-V, nT);
    vec3 rv = (uView * vec4(Rw, 0.0)).xyz;
    vec3 gasseS = gasseGrund(clamp(vec2(qb.x + rv.x * 0.15, 1.0 - qb.y * 0.55 + rv.y * 0.1), 0.0, 1.0));
    vec3 spiegel = (nachtUmgebung(Rw) * 0.7 + gasseS * 1.2) * mix(0.25, 1.0, fresnelS(max(dot(nT, V), 0.0), 0.02) * 6.0);
    c = mix(c, c * 0.25 + spiegel, wasser);
    c += nachtUmgebung(reflect(-V, n)) * fresnelS(max(dot(n, V), 0.0), 0.02) * clamp(uR_nass, 0.0, 1.0) * 0.3 * (1.0 - wasser);
    bild = mix(bild, c, maske);
    a = max(a, maske);
  }
  farbe = vec4(linZuSrgb(aces(bild * 1.25)) * a, a);
}
`;

const FLOR_POP_GLSL = /* glsl */ `
${BCN}
const vec3 PAPIER = vec3(0.984, 0.969, 0.925);
/** die zwölf Paare der Vorlage (Grund, Blume) */
void popPaar(float h, out vec3 grund, out vec3 ring) {
  int i = int(h * 12.0);
  vec3 TEAL = vec3(0.0, 0.647, 0.659), NAVY = vec3(0.051, 0.271, 0.592), LAV = vec3(0.482, 0.475, 0.725), LIME = vec3(0.58, 0.773, 0.376);
  vec3 GELB = vec3(0.906, 0.898, 0.043), MAG = vec3(0.898, 0.0, 0.49), ORA = vec3(0.969, 0.58, 0.114), CYAN = vec3(0.0, 0.678, 0.933);
  vec3 SCHW = vec3(0.137, 0.122, 0.125), WEISS = vec3(1.0), GZ = vec3(0.847, 0.89, 0.039);
  if (i == 0) { grund = TEAL; ring = NAVY; }
  else if (i == 1) { grund = LAV; ring = LIME; }
  else if (i == 2) { grund = GELB; ring = MAG; }
  else if (i == 3) { grund = NAVY; ring = ORA; }
  else if (i == 4) { grund = LIME; ring = CYAN; }
  else if (i == 5) { grund = SCHW; ring = WEISS; }
  else if (i == 6) { grund = LIME; ring = MAG; }
  else if (i == 7) { grund = ORA; ring = WEISS; }
  else if (i == 8) { grund = CYAN; ring = GZ; }
  else if (i == 9) { grund = LAV; ring = NAVY; }
  else if (i == 10) { grund = MAG; ring = ORA; }
  else { grund = LIME; ring = LAV; }
}
vec3 popGrund(vec2 css, vec2 qb) {
  vec3 c = PAPIER;
  float d = punkt(css, smoothstep(0.35, 1.0, 1.0 - qb.y * 0.7 - qb.x * 0.3) * 0.38, 0.26, 16.0);
  c = mix(c, vec3(0.95, 0.45, 0.68), d * 0.8);
  return c * papier(css);
}
void main() {
  GPunkt g = gLesen(vUv);
  float maske = deckungBei(vUv);
  vec2 css = gl_FragCoord.xy / uDpr;
  vec2 qb = gl_FragCoord.xy / uAufl;
  vec3 bild = uBuehne > 0.5 ? popGrund(css, qb) : vec3(0.0);
  float a = uBuehne > 0.5 ? 1.0 : 0.0;
  if (g.a > 0.5) {
    vec3 V = zumAuge(g.p);
    vec3 n0 = g.n;
    float k = 4.4 * uR_platten;
    // Passerfehler: die Farbplatten lesen die Kachel ein Stück daneben, die Schwarzplatte sitzt
    vec2 vs = vec2(2.0, -1.5) * uR_versatz * uDpr / uAufl;
    GPunkt gv = gLesen(vUv + vs);
    if (gv.a < 0.5) gv = g;
    vec3 zelleV, zelleK, e1, e2;
    vec2 tV, tK;
    float randV = kachel(gv.p, gv.n, k, zelleV, tV, e1, e2);
    float randK = kachel(g.p, n0, k, zelleK, tK, e1, e2);
    float px = fwidth(randK) + 1e-4;
    float aa = px * 0.8;
    vec3 grund, ring;
    popPaar(hash13(zelleV + 0.7), grund, ring);
    vec3 c = mix(grund, ring, blumeRinge(tV, aa, 0.0));
    c = mix(c, PAPIER, 1.0 - smoothstep(0.03 - aa, 0.03 + aa, randV));
    // Licht als Druck: Halbschatten in Rasterpunkten (dunklerer Ton der Kachel), Kernschatten in Schraffur, Glanz als weiße Form
    vec3 L = ausSicht(normalize(vec3(-0.55, 0.7, 0.45)));
    float l = dot(n0, L);
    vec3 dunkel = c * vec3(0.42, 0.36, 0.55);
    c = mix(c, dunkel, punkt(css, clamp((0.22 - l) * 1.3, 0.0, 0.85) * uR_raster, 0.785, 5.5));
    float kern = clamp((-0.2 - l) * 1.5, 0.0, 0.65);
    c = mix(c, vec3(0.12, 0.07, 0.24), schraffur(css, kern, -0.52, 4.5) * step(0.02, kern) * 0.9);
    vec3 H = normalize(L + V);
    c = mix(c, vec3(1.0), smoothstep(0.955, 0.96, dot(n0, H)) * 0.95);
    // Randlicht aus Punkten in Cyan
    vec3 Lr = ausSicht(normalize(vec3(0.75, 0.25, -0.6)));
    float rim = smoothstep(0.45, 0.75, 1.0 - max(dot(n0, V), 0.0)) * smoothstep(-0.1, 0.3, dot(n0, Lr));
    c = mix(c, vec3(0.2, 0.92, 1.0), punkt(css + 2.0, rim * 0.85, 0.3, 4.0));
    // Schwarzplatte: Linien um die Ringe und die Platten (aus der wahren Lage), dicke Kontur der Form
    float lw = min(0.7 * uDpr * px, 0.02);
    float tinte = clamp(blumeRinge(tK, aa, lw) - blumeRinge(tK, aa, -lw), 0.0, 1.0);
    tinte = max(tinte, 1.0 - smoothstep(lw - aa, lw + aa, abs(randK - 0.03)));
    c = mix(c, vec3(0.05, 0.035, 0.08), tinte * 0.92);
    c = mix(c, vec3(0.04, 0.03, 0.06), kanteBei(vUv, 2.4 * uDpr));
    c *= papier(css);
    bild = mix(bild, c, maske);
    a = max(a, maske);
  }
  farbe = vec4(bild * a, a);
}
`;

/** Graffiti (Persiana, später Ghetto): dicke, kursive Buchstaben mit Läufern, Tags, Aufkleber */
export const GRAFFITI = /* glsl */ `
float strichAb(vec2 p, vec2 a, vec2 b, float r) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) - r;
}
float weichMin(float a, float b, float k) { float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }
/**
 * ein Wort (Buchstaben aus dicken, verschmolzenen Strichen, kursiv, mit Läufern): Abstand (negativ innen); p in Buchstabenhöhen, die
 * Reihe läuft längs x und hat n Buchstaben ab x = 0; saat wählt die Formen
 */
float graffitiWort(vec2 p, float saat, float n) {
  p.x += p.y * 0.28;
  float i = floor(p.x / 0.62);
  float d = 1e3;
  for (int kk = -1; kk <= 1; kk++) {
    float j = i + float(kk);
    if (j < 0.0 || j >= n) continue;
    vec3 h1 = hash31(j * 7.31 + saat), h2 = hash31(j * 3.77 + saat + 1.0), h3 = hash31(j * 5.13 + saat + 2.0);
    float s = 0.88 + 0.26 * h2.z;
    vec2 l = (p - vec2(j * 0.62 + 0.31, 0.07 * (h1.z - 0.5))) / s;
    float e = strichAb(l, vec2(-0.16 + 0.08 * h1.x, -0.36), vec2(-0.14 + 0.1 * h1.y, 0.36), 0.11);
    float art = h2.x;
    if (art < 0.25) {
      e = weichMin(e, strichAb(l, vec2(-0.14, 0.34), vec2(0.21, 0.12), 0.1), 0.06);
      e = weichMin(e, strichAb(l, vec2(0.21, 0.12), vec2(-0.12, -0.02), 0.1), 0.06);
      e = weichMin(e, strichAb(l, vec2(-0.05, -0.02), vec2(0.24, -0.36), 0.1), 0.06);
    } else if (art < 0.5) {
      e = weichMin(e, strichAb(l, vec2(-0.14, 0.02), vec2(0.22, 0.02 + 0.2 * (h2.y - 0.5)), 0.1), 0.06);
      e = weichMin(e, strichAb(l, vec2(0.22, -0.36), vec2(0.24, 0.36), 0.105), 0.06);
    } else if (art < 0.75) {
      e = weichMin(e, strichAb(l, vec2(-0.14, -0.33), vec2(0.25, -0.28), 0.1), 0.06);
      e = weichMin(e, strichAb(l, vec2(-0.14, 0.33), vec2(0.25, 0.3), 0.1), 0.06);
      if (h2.y < 0.5) e = weichMin(e, strichAb(l, vec2(-0.14, 0.0), vec2(0.16, 0.02), 0.09), 0.06);
    } else {
      e = weichMin(e, strichAb(l, vec2(-0.14, 0.34), vec2(0.25, -0.36), 0.11), 0.06);
      e = weichMin(e, strichAb(l, vec2(0.25, -0.36), vec2(0.27, 0.36), 0.1), 0.06);
    }
    // Läufer: eine dünne Spur nach unten aus dem Fuß, mit Tropfen
    if (h3.z < 0.65) {
      float lx = -0.15 + 0.42 * h3.x;
      float ll = 0.12 + 0.5 * h3.y;
      e = min(e, min(strichAb(l, vec2(lx, -0.3), vec2(lx, -0.36 - ll), 0.016 + 0.01 * h3.z), length(l - vec2(lx, -0.36 - ll)) - 0.032));
    }
    d = min(d, e * s);
  }
  return d;
}
/** Tags: dünne Kritzel (Nullstellen eines gestreckten Rauschens) in einem Kasten; Bildpunkte bis zur Linie */
float tagLinie(vec2 p, float saat) {
  float nz = snoise(vec3(p.x * 2.4, p.y * 5.0, saat)) + 0.45 * snoise(vec3(p.x * 7.0, p.y * 4.0, saat + 3.0));
  float kasten = (1.0 - smoothstep(0.75, 1.0, abs(p.x))) * (1.0 - smoothstep(0.22, 0.32, abs(p.y)));
  return kasten > 0.01 ? abs(nz) / max(fwidth(nz), 1e-4) / kasten : 1e3;
}
/** der schwarze Schnuller (Gruß an El Xupet Negre): 1 auf der Form; p im Aufkleber (−0,5 … 0,5) */
float schnuller(vec2 p) {
  float schild = length(p / vec2(0.34, 0.17)) - 1.0;
  float ringA = abs(length(p - vec2(0.0, 0.26)) - 0.12) - 0.035;
  float nuckel = length((p - vec2(0.0, -0.25)) / vec2(0.1, 0.15)) - 1.0;
  return step(min(min(schild, nuckel * 0.1), ringA), 0.0);
}
`;

const PERSIANA_GLSL = /* glsl */ `
${BUEHNEN}
${BCN}
${GRAFFITI}
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
    float ebene;
    vec2 uv = hochEbene(q, n0, ebene);
    // Lamellen: waagerecht, gerundet, in der Fuge eine dunkle Kerbe
    float F = 20.0;
    float s = fract(q.y * F);
    float fugeL = 1.0 - smoothstep(0.0, 0.07, s) * (1.0 - smoothstep(0.95, 1.0, s));
    float kamm = pow(max(sin(3.14159 * clamp((s - 0.05) / 0.9, 0.0, 1.0)), 0.0), 0.45);
    float h = kamm * (1.0 - fugeL) - 0.4 * fugeL;
    // Dellen
    vec3 dm;
    vec3 dz = felsZelle(q * 5.0 + 3.0, dm);
    h -= step(0.8, dz.z) * (1.0 - smoothstep(0.0, 0.35, dz.x)) * 0.5;
    vec3 n = hoeheNormale(n0, g.p, h * uRadius / F * 0.12);
    // verzinkt: Zinkblumen (große Kristallflecken), jede spiegelt anders
    vec3 zm;
    vec3 zz = felsZelle(q * 26.0, zm);
    vec3 alb = vec3(0.604, 0.627, 0.639) * (0.82 + 0.28 * zz.z);
    vec3 nZ = normalize(n + 0.16 * (hash33(zm) - 0.5));
    float metall = 1.0;
    float rauh = 0.5;
    // Rost unten und in Fahnen unter den Fugen
    float unten = smoothstep(-0.15, -0.55, q.y + 0.08 * snoise(q * 6.0));
    float fahne = smoothstep(0.35, 0.8, snoise(vec3(uv.x * 46.0, q.y * 2.2, ebene * 3.0))) * smoothstep(0.85, 0.2, s);
    float rost = clamp((unten + fahne * 0.55 + smoothstep(0.6, 0.9, snoise(q * 9.0)) * 0.3) * uR_rost, 0.0, 1.0);
    vec3 rostF = mix(vec3(0.545, 0.29, 0.122), vec3(0.36, 0.17, 0.07), smoothstep(-0.3, 0.6, snoise(q * 60.0)));
    alb = mix(alb, rostF, rost);
    metall *= 1.0 - rost;
    rauh = mix(rauh, 0.85, rost);
    // Graffiti: Reihen aus Wörtern, je Reihe ein Farbschema; in den Fugen keine Farbe
    vec2 gp = uv / 0.25;
    float reihe = floor(gp.y / 1.7 + 0.5);
    vec2 rp = vec2(gp.x, gp.y - reihe * 1.7);
    float hr = hash11(reihe * 13.7);
    float nb = 3.0 + floor(hash11(reihe * 3.1) * 4.0);
    float x0 = -nb * 0.31 + (hash11(reihe * 5.9) - 0.5) * 2.4;
    float da = uR_graffiti > 0.01 && hash11(reihe * 7.7) < 0.7 * uR_graffiti ? 1.0 : 0.0;
    vec2 wp = vec2(rp.x - x0, rp.y);
    float sd = da > 0.5 ? graffitiWort(wp, reihe * 3.3, nb) : 1e3;
    float sd3 = da > 0.5 ? graffitiWort(wp + vec2(-0.05, 0.065), reihe * 3.3, nb) : 1e3;
    vec3 fa, fb, wolke, kante3;
    int schema = int(hr * 5.0);
    if (schema == 0) { fa = vec3(1.0, 0.18, 0.55); fb = vec3(1.0, 0.6, 0.1); wolke = vec3(0.25, 0.75, 0.95); kante3 = vec3(0.32, 0.05, 0.3); }
    else if (schema == 1) { fa = vec3(0.1, 0.85, 0.85); fb = vec3(0.55, 0.95, 0.2); wolke = vec3(0.6, 0.25, 0.85); kante3 = vec3(0.04, 0.2, 0.35); }
    else if (schema == 2) { fa = vec3(1.0, 0.92, 0.15); fb = vec3(0.95, 0.2, 0.1); wolke = vec3(0.1, 0.3, 0.8); kante3 = vec3(0.35, 0.06, 0.04); }
    else if (schema == 3) { fa = vec3(0.86, 0.88, 0.9); fb = vec3(0.55, 0.58, 0.62); wolke = vec3(0.95, 0.3, 0.5); kante3 = vec3(0.08, 0.08, 0.1); }
    else { fa = vec3(0.6, 0.35, 1.0); fb = vec3(0.2, 0.4, 1.0); wolke = vec3(1.0, 0.75, 0.15); kante3 = vec3(0.12, 0.04, 0.3); }
    float aaG = fwidth(sd) + 1e-4;
    float innen = 1.0 - smoothstep(-aaG, aaG, sd);
    float kontur = 1.0 - smoothstep(0.035 - aaG, 0.035 + aaG, sd);
    float kante = (1.0 - smoothstep(-aaG, aaG, sd3)) * (1.0 - kontur);
    float kanteK = (1.0 - smoothstep(0.03 - aaG, 0.03 + aaG, sd3)) * (1.0 - kontur);
    float sdU = min(sd, sd3);
    float schnitt = (1.0 - smoothstep(0.065 - aaG, 0.065 + aaG, sdU)) * (1.0 - kontur) * (1.0 - kanteK);
    float wolkeM = (1.0 - smoothstep(0.04, 0.16, sdU - 0.1 * (snoise(vec3(wp * 3.0, reihe)) * 0.5 + 0.5))) * da;
    // ein Wandbild darunter (Ravaleart): große flache Farbflächen mit der Rolle gemalt, verblasst, mit Pinsellinien; nicht überall
    float wandM = smoothstep(-0.15, 0.0, snoise(vec3(uv * 0.5, 4.0))) * step(0.01, uR_graffiti);
    float fz = snoise(vec3(uv * 1.2, 7.0)) + 0.35 * snoise(vec3(uv * 3.2, 2.0));
    vec3 wandF = fz < -0.35 ? vec3(0.07, 0.55, 0.58) : (fz < 0.0 ? vec3(0.93, 0.72, 0.2) : (fz < 0.35 ? vec3(0.93, 0.42, 0.36) : vec3(0.95, 0.91, 0.8)));
    float fzW = fwidth(fz) * 2.5 + 0.012;
    float wandL = max(max(1.0 - smoothstep(0.0, fzW, abs(fz + 0.35)), 1.0 - smoothstep(0.0, fzW, abs(fz))), 1.0 - smoothstep(0.0, fzW, abs(fz - 0.35)));
    wandF = mix(wandF * (0.9 + 0.1 * snoise(q * 90.0)), vec3(0.12, 0.1, 0.12), wandL * 0.85);
    wandF = mix(wandF, wandF * 0.8 + 0.12, 0.25);
    vec3 farbeG = mix(alb, wandF, wandM);
    float lack = max(wandM, wolkeM * 0.85);
    farbeG = mix(farbeG, wolke * (0.85 + 0.15 * snoise(q * 30.0)), wolkeM * 0.85);
    farbeG = mix(farbeG, vec3(0.97, 0.97, 0.95), schnitt);
    farbeG = mix(farbeG, kante3, kante);
    farbeG = mix(farbeG, vec3(0.03, 0.03, 0.035), max(kanteK - kante, 0.0));
    farbeG = mix(farbeG, vec3(0.03, 0.03, 0.035), kontur * (1.0 - innen));
    vec3 fuell = mix(fb, fa, smoothstep(-0.38, 0.32, wp.y + 0.05 * snoise(vec3(wp * 4.0, 1.0))));
    // Glanzstriche an den Kanten oben links, ein paar weiße Blasen
    vec2 gs = vec2(dFdx(sd), dFdy(sd));
    float oL = dot(normalize(gs + 1e-6), normalize(vec2(-1.0, 1.0)));
    float glanzS = smoothstep(-0.055, -0.045, sd) * (1.0 - smoothstep(-0.03, -0.02, sd)) * smoothstep(0.55, 0.8, oL) * step(0.0, snoise(vec3(wp * 5.0, 2.0)));
    vec3 bm;
    vec3 bz = felsZelle(vec3(wp * 9.0, reihe), bm);
    float blase = step(0.82, bz.z) * (1.0 - smoothstep(0.12, 0.16, bz.x));
    fuell = mix(fuell, vec3(1.0), max(glanzS, blase * 0.9));
    farbeG = mix(farbeG, fuell, innen);
    lack = max(lack, max(innen, max(kontur, max(kante, schnitt))));
    // Tags in den Lücken (schwarz, silbern, rot), einige über den Stücken
    vec2 tz = floor(uv / vec2(0.62, 0.3));
    vec2 tl = (fract(uv / vec2(0.62, 0.3)) - 0.5) * vec2(2.2, 1.0);
    float th = hash12(tz + ebene * 11.0);
    float tl1 = tagLinie(tl, th * 40.0);
    if (th < 0.5 * uR_graffiti) {
      float tagM = 1.0 - smoothstep(0.9 * uDpr, 1.9 * uDpr, tl1);
      tagM *= th < 0.2 ? 1.0 : (1.0 - innen);
      vec3 tagF = th < 0.17 ? vec3(0.02) : (th < 0.34 ? vec3(0.82, 0.84, 0.86) : vec3(0.85, 0.06, 0.08));
      farbeG = mix(farbeG, tagF, tagM);
      lack = max(lack, tagM);
    }
    // Aufkleber: weiß, mit dem schwarzen Schnuller, Ecken abgelöst
    vec2 az = floor(uv / 0.16);
    vec2 al = (fract(uv / 0.16) - 0.5) / 0.6;
    float ah = hash12(az + ebene * 5.0);
    if (ah < 0.05 && max(abs(al.x), abs(al.y * 1.3)) < 0.5) {
      float los = step(0.38, al.x - al.y * 0.8) * step(0.5, hash11(ah * 91.0));
      vec3 af = mix(vec3(0.95, 0.94, 0.9), vec3(0.03), schnuller(al * 1.1));
      farbeG = los > 0.5 ? farbeG * 0.6 : af;
      lack = 1.0;
    }
    // Farbe hält nicht in den Kerben der Lamellen; Schmutz in den Fugen
    lack *= 1.0 - fugeL;
    vec3 albE = mix(alb, farbeG, lack);
    albE = mix(albE, albE * 0.35, fugeL * 0.8);
    albE *= 1.0 - 0.25 * smoothstep(-0.2, -0.7, q.y);
    metall *= 1.0 - lack;
    rauh = mix(rauh, 0.7, lack);
    // Licht: Tag, draußen; Metall spiegelt farbig, Lack weiß
    vec3 la = srgbZuLin(albE);
    float ao = mix(0.45, 1.0, 1.0 - fugeL) * (0.75 + 0.25 * kamm);
    vec3 nL = normalize(mix(n, nZ, metall));
    vec3 c = draussen(la * (1.0 - 0.6 * metall), nL, V, ao, rauh);
    vec3 R = reflect(-V, nL);
    float fr = fresnelS(max(dot(nL, V), 0.0), mix(0.04, 0.6, metall));
    c += studio(R) * fr * mix(vec3(0.18), la * 0.9 + 0.06, metall) * (1.0 - rauh * 0.8) * ao;
    bild = mix(bild, c, maske);
    a = max(a, maske);
  }
  farbe = vec4(linZuSrgb(aces(bild)) * a, a);
}
`;

function strasse(id: string, name: string, zeile: string, fragment: string, regler: ReglerZeile[]): Voreinstellung {
  return bildVoreinstellung({ id, name, gruppe: 'Barcelona', zeile, regler, fragment, unruhig: () => false });
}

export const PANOT = strasse(
  'panot',
  'Panot',
  'Barcelonas Gehwegplatte mit der Blume, nachts nach dem Regen: Zementgrau mit Zuschlag, gekippte, gesprungene und ersetzte Platten, Asphaltflicken, Kaugummi, Flecken; Wasser in Rillen und Fugen spiegelt Natriumlampen und Neon',
  PANOT_GLSL,
  [
    { k: 'platten', name: 'Platten', min: 0.4, max: 2.5, schritt: 0.05, grund: 1 },
    { k: 'nass', name: 'Nass', min: 0, max: 1, schritt: 0.05, grund: 0.8 },
    { k: 'dreck', name: 'Dreck', min: 0, max: 1.5, schritt: 0.05, grund: 1 },
    { k: 'relief', name: 'Relief', min: 0.2, max: 2.5, schritt: 0.05, grund: 1 },
  ],
);
export const FLOR_POP = strasse(
  'florPop',
  'Flor Pop',
  'Die Blume von Barcelona als Pop-Art im Spider-Verse-Druck: Kacheln in zwölf Farbpaaren, weiße Lücken, die Farbplatte versetzt, Rasterpunkte und Schraffur im Schatten, Randlicht aus Punkten, dicke Kontur',
  FLOR_POP_GLSL,
  [
    { k: 'platten', name: 'Platten', min: 0.4, max: 2.5, schritt: 0.05, grund: 1 },
    { k: 'versatz', name: 'Versatz', min: 0, max: 3, schritt: 0.05, grund: 1 },
    { k: 'raster', name: 'Raster', min: 0, max: 1.5, schritt: 0.05, grund: 1 },
  ],
);
export const PERSIANA = strasse(
  'persiana',
  'Persiana',
  'Ein Rollladen im Raval: verzinkte Lamellen mit Zinkblumen, darüber Graffiti aus dicken Buchstaben mit Kontur, 3D-Kante, Glanz und Läufern, Tags, ein Aufkleber mit dem schwarzen Schnuller; Rost unten und in Fahnen',
  PERSIANA_GLSL,
  [
    { k: 'graffiti', name: 'Graffiti', min: 0, max: 1.2, schritt: 0.05, grund: 1 },
    { k: 'rost', name: 'Rost', min: 0, max: 1.5, schritt: 0.05, grund: 1 },
  ],
);
