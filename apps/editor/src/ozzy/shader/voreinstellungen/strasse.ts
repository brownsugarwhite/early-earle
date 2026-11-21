/**
 * Straße (Runde 9; Florian: „Bitte noch mehr gaudi ideen und "Ghetto" und "punk" und neon und natur. Ich will hier ganz tolle dinge
 * entwickeln.“). Recherche `docs/research/2026-11-21-runde-9-recherche.md`, Abschnitt 7.
 * - **Hall of Fame** (Ghetto): eine Ziegelwand in Lagen. Buff-Flächen in nicht ganz passendem Grau und Beige mit Rollenstreifen, unter
 *   denen alte Tags durchscheinen; darauf Throw-ups (Blasenbuchstaben aus verschmolzenen Kreisen, Chrom oder Weiß, schwarze Kontur,
 *   farbiger Schattenblock, weiße Glanzhäkchen, Overspray, Läufer), Tags in Schwarz und Silber. Farbe nur auf den hohen Stellen (Fugen
 *   und Poren bleiben frei), auf der Sonnenseite ausgeblichen.
 * - **Nietenleder** (Punk): schwarzes Rindleder mit Narbung und Knautschfalten, abgerieben auf Kanten und Höhen; Pyramidennieten aus
 *   Nickel in Gürteln und einem Feld auf dem Rücken (die Umgebung spiegelt sich in jeder Facette, dunkler Schmutzring am Fuß),
 *   Kegelnieten auf der Mittellinie, Ziernähte, ein mit weißer Farbe gemaltes Anarchie-A mit Krakelee. Bühne: dunkler Club.
 * - **Leuchtgas** (Neon): die Form ist ein Glasgefäß voll leuchtendem Gas; das Licht wächst mit der Dicke (Vorder- und Rückseite),
 *   der Kern wird weiß, der Rand bleibt satt; dünne scharfe Spiegelungen im Glas, großer weicher Schein, Spiegelbild auf nassem Asphalt,
 *   seltenes Flackern. Zwei eigene Fassungen: Neon Rot (#ff4a1c, Kern #ffd3b0) und Argon Blau (#3a6bff, Kern #dce6ff).
 */
import { bildVoreinstellung } from '../bildShader';
import { BUEHNEN } from './buehnen';
import { BCN, GRAFFITI } from './barcelona';

const HALL_GLSL = /* glsl */ `
${BUEHNEN}
${BCN}
${GRAFFITI}
/** Blasenbuchstaben (Throw-up): je Buchstabe vier Kreise, weich verschmolzen, manche mit Loch, mit Läufern; die Buchstaben drängen sich */
float throwUp(vec2 p, float saat, float n) {
  float i = floor(p.x / 0.62);
  float d = 1e3;
  for (int kk = -1; kk <= 1; kk++) {
    float j = i + float(kk);
    if (j < 0.0 || j >= n) continue;
    vec2 o = vec2(j * 0.62 + 0.31, 0.0);
    float e = 1e3;
    for (int b = 0; b < 4; b++) {
      vec3 h = hash31(j * 11.3 + float(b) * 3.7 + saat);
      vec2 c = o + vec2((h.x - 0.5) * 0.3, (h.y - 0.5) * 0.42);
      e = weichMin(e, length(p - c) - (0.17 + 0.09 * h.z), 0.1);
    }
    vec3 hl = hash31(j * 5.1 + saat + 9.0);
    if (hl.x < 0.5) e = max(e, -(length(p - o - vec2((hl.y - 0.5) * 0.1, 0.05)) - 0.055));
    if (hl.z < 0.6) {
      float lx = o.x + (hl.y - 0.5) * 0.35;
      float ll = 0.1 + 0.4 * fract(hl.z * 7.3);
      e = min(e, min(strichAb(p, vec2(lx, -0.25), vec2(lx, -0.3 - ll), 0.014), length(p - vec2(lx, -0.3 - ll)) - 0.028));
    }
    d = weichMin(d, e, 0.06);
  }
  return d;
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
    float ebene;
    vec2 uv = hochEbene(q, n0, ebene);
    // Ziegel im Läuferverband, Mörtel vertieft, Poren
    vec2 zs = vec2(0.13, 0.058);
    vec2 zg = uv / zs;
    zg.x += mod(floor(zg.y), 2.0) * 0.5;
    vec2 zi = floor(zg);
    vec2 zr = (0.5 - abs(fract(zg) - 0.5)) * zs;
    float zd = min(zr.x, zr.y);
    float aaZ = fwidth(zd) + 1e-5;
    float moertel = 1.0 - smoothstep(0.0045 - aaZ, 0.0045 + aaZ, zd);
    float zh = hash12(zi + ebene * 7.0);
    vec3 ziegel = zh < 0.33 ? vec3(0.604, 0.294, 0.2) : (zh < 0.66 ? vec3(0.69, 0.376, 0.247) : vec3(0.494, 0.243, 0.169));
    ziegel *= 0.88 + 0.12 * snoise(q * 60.0) + 0.08 * snoise(q * 220.0);
    float pore = smoothstep(0.55, 0.8, snoise(q * 300.0));
    ziegel = mix(ziegel, ziegel * 0.6, pore * 0.6);
    vec3 grund = mix(ziegel, vec3(0.725, 0.694, 0.639) * (0.9 + 0.1 * snoise(q * 120.0)), moertel);
    float h = (1.0 - moertel) * (0.75 + 0.25 * smoothstep(0.0045, 0.012, zd)) - pore * 0.12 + 0.05 * snoise(q * 150.0);
    // alte Tags auf dem Ziegel
    vec2 tz0 = floor(uv / vec2(0.5, 0.24) + 0.3);
    vec2 tl0 = (fract(uv / vec2(0.5, 0.24) + 0.3) - 0.5) * vec2(2.2, 1.0);
    float th0 = hash12(tz0 + ebene * 3.0 + 50.0);
    float alt0 = tagLinie(tl0, th0 * 30.0);
    float altTag = th0 < 0.55 ? 1.0 - smoothstep(0.8 * uDpr, 1.6 * uDpr, alt0) : 0.0;
    grund = mix(grund, th0 < 0.3 ? vec3(0.05) : vec3(0.2, 0.25, 0.6), altTag * 0.85);
    // Buff: Rechtecke in nicht ganz passendem Grau und Beige mit Rollenstreifen; die alten Tags scheinen schwach durch
    vec3 alb = grund;
    float buff = 0.0;
    for (int l = 0; l < 2; l++) {
      float fl = float(l);
      vec2 bg = uv / vec2(0.55, 0.38) + fl * 0.37;
      vec3 bh = hash32(floor(bg) + fl * 17.0 + ebene * 3.0);
      vec2 bl = fract(bg) - 0.5;
      vec2 halb = vec2(0.25 + 0.2 * bh.x, 0.2 + 0.25 * bh.y);
      float rect = step(max(abs(bl.x) - halb.x, abs(bl.y) - halb.y), 0.0) * step(0.62, bh.z) * step(0.01, uR_buff) * step(bh.z, 0.62 + 0.38 * uR_buff);
      vec3 bf = bh.z < 0.72 ? vec3(0.62, 0.6, 0.56) : (bh.z < 0.82 ? vec3(0.55, 0.53, 0.49) : (bh.z < 0.92 ? vec3(0.7, 0.68, 0.63) : vec3(0.47, 0.48, 0.46)));
      bf *= 0.94 + 0.06 * snoise(vec3(uv.x * 40.0, uv.y * 3.0, fl));
      bf = mix(bf, bf * 0.88, altTag * 0.35);
      alb = mix(alb, mix(bf, grund, moertel * 0.5), rect);
      buff = max(buff, rect);
    }
    // Throw-ups in Reihen
    vec2 gp = uv / 0.3;
    float reihe = floor(gp.y / 1.45 + 0.5);
    vec2 rp = vec2(gp.x, gp.y - reihe * 1.45);
    float nb = 3.0 + floor(hash11(reihe * 3.1) * 3.0);
    float x0 = -nb * 0.31 + (hash11(reihe * 5.9) - 0.5) * 2.0;
    float da = hash11(reihe * 7.7) < 0.8 * uR_graffiti ? 1.0 : 0.0;
    vec2 wp = rp - vec2(x0, 0.0);
    float sd = da > 0.5 ? throwUp(wp, reihe * 2.3, nb) : 1e3;
    float sd3 = da > 0.5 ? throwUp(wp + vec2(-0.06, 0.07), reihe * 2.3, nb) : 1e3;
    float hr = hash11(reihe * 13.7);
    bool chrom = hr < 0.6;
    vec3 block = hash11(reihe * 2.9) < 0.5 ? vec3(0.114, 0.31, 0.627) : vec3(0.816, 0.122, 0.184);
    float aaG = fwidth(sd) + 1e-4;
    float innen = 1.0 - smoothstep(-aaG, aaG, sd);
    float kontur = 1.0 - smoothstep(0.04 - aaG, 0.04 + aaG, sd);
    float blockM = (1.0 - smoothstep(-aaG, aaG, sd3)) * (1.0 - kontur);
    float blockK = (1.0 - smoothstep(0.03 - aaG, 0.03 + aaG, sd3)) * (1.0 - kontur);
    vec3 fuell = chrom
      ? (wp.y > 0.03 ? mix(vec3(0.62, 0.66, 0.72), vec3(0.98, 0.99, 1.0), smoothstep(0.03, 0.3, wp.y)) : mix(vec3(0.3, 0.33, 0.4), vec3(0.72, 0.76, 0.84), smoothstep(-0.02, -0.32, wp.y)))
      : vec3(0.95, 0.95, 0.93);
    vec2 gs = vec2(dFdx(sd), dFdy(sd));
    float oL = dot(normalize(gs + 1e-6), normalize(vec2(-1.0, 1.0)));
    float haekchen = smoothstep(-0.07, -0.06, sd) * (1.0 - smoothstep(-0.045, -0.035, sd)) * smoothstep(0.6, 0.85, oL) * step(0.1, snoise(vec3(wp * 6.0, 4.0)));
    fuell = mix(fuell, vec3(1.0), haekchen);
    // Overspray: feiner Punktnebel um die Kontur
    vec2 sp = floor(gl_FragCoord.xy / (1.3 * uDpr));
    float nebel = exp(-max(sd - 0.04, 0.0) * 28.0) * (1.0 - kontur) * step(1.0 - 0.55 * exp(-max(sd - 0.04, 0.0) * 18.0), hash12(sp)) * da;
    vec3 lackF = alb;
    float lack = 0.0;
    lackF = mix(lackF, vec3(0.04), nebel * 0.8);
    lack = max(lack, nebel * 0.8);
    lackF = mix(lackF, vec3(0.03), blockK);
    lackF = mix(lackF, block, blockM);
    lackF = mix(lackF, vec3(0.03), kontur * (1.0 - innen));
    lackF = mix(lackF, fuell, innen);
    lack = max(lack, max(innen, max(kontur, max(blockM, blockK))));
    // Tags oben drauf (schwarz, silbern)
    vec2 tz = floor(uv / vec2(0.62, 0.3));
    vec2 tl = (fract(uv / vec2(0.62, 0.3)) - 0.5) * vec2(2.2, 1.0);
    float th = hash12(tz + ebene * 11.0);
    float tl1 = tagLinie(tl, th * 40.0);
    if (th < 0.45 * uR_graffiti) {
      float tagM = (1.0 - smoothstep(0.9 * uDpr, 1.9 * uDpr, tl1)) * (th < 0.15 ? 1.0 : 1.0 - innen);
      lackF = mix(lackF, th < 0.3 ? vec3(0.067) : vec3(0.8, 0.82, 0.85), tagM);
      lack = max(lack, tagM);
    }
    // Farbe nur auf den hohen Stellen; auf der Sonnenseite ausgeblichen
    lack *= (1.0 - moertel * (1.0 - buff) * 0.85) * (1.0 - pore * (1.0 - buff) * 0.7);
    vec3 L = ausSicht(normalize(vec3(-0.5, 0.75, 0.42)));
    float sonne = smoothstep(0.2, 0.9, dot(n0, L));
    lackF = mix(lackF, lackF * 0.82 + 0.14, sonne * 0.3);
    alb = mix(alb, lackF, lack);
    vec3 n = hoeheNormale(n0, g.p, h * (1.0 - buff * 0.6) * uRadius * 0.005);
    float ao = mix(0.6, 1.0, 1.0 - moertel * (1.0 - buff));
    vec3 c = draussen(srgbZuLin(alb), n, V, ao, mix(0.85, 0.6, lack));
    bild = mix(bild, c, maske);
    a = max(a, maske);
  }
  farbe = vec4(linZuSrgb(aces(bild)) * a, a);
}
`;

const NIETEN_GLSL = /* glsl */ `
${BCN}
/** Bühne: dunkler Club, Betonwand, ein roter Spot und Dunst (linear) */
vec3 clubGrund(vec2 css, vec2 qb) {
  float asp = uAufl.x / uAufl.y;
  vec2 c = (qb - vec2(0.62, 0.62)) * vec2(asp, 1.0);
  vec3 w = vec3(0.012, 0.011, 0.012) * (0.8 + 0.4 * noise2(css * 0.02));
  w += vec3(0.5, 0.03, 0.05) * exp(-dot(c, c) * 3.2) * 0.35;
  w += vec3(0.05, 0.06, 0.12) * exp(-pow((qb.x - 0.15) * asp, 2.0) * 18.0) * smoothstep(0.0, 1.0, qb.y) * 0.4;
  return w;
}
void main() {
  GPunkt g = gLesen(vUv);
  float maske = deckungBei(vUv);
  vec2 css = gl_FragCoord.xy / uDpr;
  vec2 qb = gl_FragCoord.xy / uAufl;
  vec3 bild = uBuehne > 0.5 ? clubGrund(css, qb) : vec3(0.0);
  float a = uBuehne > 0.5 ? 1.0 : 0.0;
  if (g.a > 0.5) {
    vec3 V = zumAuge(g.p);
    vec3 n0 = g.n;
    vec3 q = (g.p - uMitte) / uRadius;
    // Leder: Narbung (feine Buckel), Knautschfalten quer zur Schwerkraft, in Mulden stärker
    vec3 nm;
    vec3 nz = felsZelle(q * 190.0, nm);
    float narbe = smoothstep(0.0, 0.45, nz.y - nz.x) * 0.5;
    float faltenFeld = smoothstep(-0.2, 0.6, snoise(q * 1.8 + 3.0));
    float falte = sin(q.y * 46.0 + 2.5 * snoise(q * vec3(4.0, 1.5, 4.0))) * faltenFeld;
    float hL = narbe * 0.22 + falte * 0.55;
    // abgerieben auf Kanten (Krümmung) und auf den Kämmen der Falten
    float kruemm = clamp(length(fwidth(n0)) / max(length(fwidth(g.p)) / uRadius, 1e-5) * 0.06, 0.0, 1.0);
    float abrieb = clamp(kruemm * 0.8 + smoothstep(0.55, 0.95, falte) * 0.5 + smoothstep(0.6, 0.9, snoise(q * 5.0)) * 0.3, 0.0, 1.0);
    vec3 leder = mix(vec3(0.082, 0.067, 0.059), vec3(0.29, 0.239, 0.208), abrieb * 0.75);
    float rauh = mix(0.42, 0.62, smoothstep(-0.4, 0.6, snoise(q * 6.0))) + abrieb * 0.08;
    vec3 nL = hoeheNormale(n0, g.p, hL * uRadius * 0.004);
    // Nieten: Pyramiden in Gürteln um den Körper und einem Feld auf dem Rücken
    vec3 zelle, e1, e2;
    vec2 t;
    float k = 10.0 * uR_nieten;
    kachel(g.p, n0, k, zelle, t, e1, e2);
    vec3 qc = zelle / k;
    float feld = max(step(fract(qc.x * 1.5 + 0.12), 0.3), step(0.22, qc.y) * step(abs(qc.z), 0.3));
    float mT = max(abs(t.x), abs(t.y));
    float aaT = fwidth(mT) + 1e-4;
    float niete = feld * (1.0 - smoothstep(0.3 - aaT, 0.3 + aaT, mT));
    vec3 fd = abs(t.x) > abs(t.y) ? e1 * sign(t.x) : e2 * sign(t.y);
    vec3 nN = mT < 0.035 ? n0 : normalize(n0 + fd * 0.95);
    float ring = feld * (1.0 - smoothstep(0.3, 0.42, mT)) * (1.0 - niete);
    // Kegelnieten auf der Mittellinie oben
    float mitte = step(0.35, n0.y) * (1.0 - smoothstep(0.05, 0.07, abs(q.z)));
    float sx = (fract(q.x / 0.12) - 0.5) * 0.12;
    vec2 kr = vec2(sx, q.z);
    float kegel = mitte * (1.0 - smoothstep(0.038, 0.042, length(kr)));
    if (kegel > 0.5) { niete = 1.0; nN = normalize(n0 + normalize(vec3(kr.x, 0.0, kr.y) + 1e-5) * 1.4); ring = 0.0; }
    // Ziernähte an den Rändern der Gürtel
    float rnd = abs(fract(q.x * 1.5 + 0.12) - 0.33);
    float naht = (1.0 - smoothstep(0.004, 0.008, abs(rnd - 0.025))) * step(fract((q.y + q.z) * 34.0), 0.6);
    // Anarchie-A in weißer Farbe mit Krakelee (seitlich, spiegelgleich)
    vec2 pa = vec2(q.x - 0.15, q.y - 0.02) / 0.3;
    float aRing = abs(length(pa) - 0.78) - 0.09;
    float aStrich = min(min(strichAbN(pa, vec2(-0.62, -0.98), vec2(0.0, 1.02), 0.11), strichAbN(pa, vec2(0.62, -0.98), vec2(0.0, 1.02), 0.11)), strichAbN(pa, vec2(-0.55, -0.12), vec2(0.55, -0.12), 0.09));
    float aSd = min(aRing, aStrich) + 0.04 * snoise(q * 40.0);
    vec3 cm;
    vec3 cz = felsZelle(q * 55.0, cm);
    float krakelee = 1.0 - smoothstep(0.02, 0.05, cz.y - cz.x);
    float weiss = step(0.3, abs(n0.z)) * (1.0 - smoothstep(-0.01, 0.01, aSd)) * (1.0 - krakelee * 0.9) * step(0.01, uR_farbe);
    // Licht: Spot von oben links, kühles Randlicht von hinten, wenig Raum
    vec3 L = ausSicht(normalize(vec3(-0.45, 0.75, 0.5)));
    vec3 Lr = ausSicht(normalize(vec3(0.7, 0.3, -0.65)));
    vec3 cL = srgbZuLin(leder) * (1.0 - ring * 0.5);
    cL = mix(cL, srgbZuLin(vec3(0.92, 0.9, 0.86)), weiss);
    cL = mix(cL, srgbZuLin(vec3(0.55, 0.52, 0.46)), naht * (1.0 - niete));
    float r2 = mix(rauh, 0.7, weiss);
    float nl = max(dot(nL, L), 0.0);
    vec3 c = cL * (vec3(1.0, 0.92, 0.86) * 2.2 * nl + vec3(0.04, 0.04, 0.05));
    vec3 H = normalize(L + V);
    c += vec3(1.0, 0.95, 0.9) * ggx(max(dot(nL, H), 0.0), r2) * fresnelS(max(dot(H, V), 0.0), 0.04) * nl * 2.0;
    c += vec3(0.5, 0.6, 1.0) * pow(1.0 - max(dot(nL, V), 0.0), 3.0) * smoothstep(-0.1, 0.4, dot(nL, Lr)) * 0.5;
    // Nickel: die Umgebung spiegelt sich, angelaufen zum Fuß hin
    if (niete > 0.01) {
      vec3 R = reflect(-V, nN);
      vec3 nickel = srgbZuLin(vec3(0.851, 0.859, 0.871)) * mix(0.55, 1.0, smoothstep(0.3, 0.18, mT));
      vec3 umg = studio(R) * 0.9 + vec3(0.9, 0.08, 0.1) * 1.5 * smoothstep(0.6, 0.95, dot(R, ausSicht(normalize(vec3(0.6, 0.5, 0.6))))) + vec3(0.02);
      vec3 cN = umg * nickel * fresnelS(max(dot(nN, V), 0.0), 0.6);
      vec3 Hn = normalize(L + V);
      cN += vec3(1.0, 0.97, 0.92) * ggx(max(dot(nN, Hn), 0.0), 0.15) * max(dot(nN, L), 0.0) * 1.5;
      c = mix(c, cN, niete);
    }
    bild = mix(bild, c, maske);
    a = max(a, maske);
  }
  farbe = vec4(linZuSrgb(aces(bild * 1.1)) * a, a);
}
`;

function leuchtgas(farbeG: string, kern: string): string {
  return /* glsl */ `
/** Bühne: nasse Straße nachts, Asphalt #0e0f12, ferne farbige Lichter, Pfützen (linear) */
vec3 nasseStrasse(vec2 css, vec2 qb) {
  float asp = uAufl.x / uAufl.y;
  vec3 c = mix(vec3(0.004, 0.005, 0.009), vec3(0.012, 0.014, 0.03), qb.y);
  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    vec2 m = vec2(hash11(fi * 3.1) , 0.5 + 0.45 * hash11(fi * 7.7));
    float d = length((qb - m) * vec2(asp, 1.0));
    vec3 f = hsv(vec3(hash11(fi * 5.3), 0.8, 1.0));
    c += srgbZuLin(f) * exp(-d * d / 0.0009) * 0.25;
  }
  float boden = smoothstep(0.36, 0.3, qb.y);
  vec3 asphalt = srgbZuLin(vec3(0.055, 0.059, 0.071)) * (0.7 + 0.5 * noise2(css * 0.9));
  float pfuetze = smoothstep(0.1, 0.4, noise2(vec2(css.x * 0.006, css.y * 0.03)));
  c = mix(c, asphalt * (1.0 - 0.6 * pfuetze), boden);
  return c;
}
void main() {
  GPunkt g = gLesen(vUv);
  float maske = deckungBei(vUv);
  vec2 css = gl_FragCoord.xy / uDpr;
  vec2 qb = gl_FragCoord.xy / uAufl;
  vec3 FARBE_G = srgbZuLin(${farbeG});
  vec3 KERN = srgbZuLin(${kern});
  // seltenes Flackern: alle paar Sekunden zwei, drei Bilder dunkel
  float takt = floor(uZeit * 12.0);
  float aus = max(step(0.994, hash11(takt)), step(0.994, hash11(takt - 1.0)));
  float an = 1.0 - 0.85 * aus;
  vec3 bild = vec3(0.0);
  float a = 0.0;
  if (uBuehne > 0.5) {
    bild = nasseStrasse(css, qb);
    float w = texture(tWeich, vUv).r;
    bild += FARBE_G * (w * 0.35 + w * w * 0.9) * an * uR_schein;
    // Spiegelbild auf dem nassen Asphalt: senkrecht gestreckt, leicht gewellt
    vec2 unten = insBild(uMitte - vec3(0.0, uRadius * 0.9, 0.0));
    if (vUv.y < unten.y) {
      float my = unten.y + (unten.y - vUv.y) * 0.5;
      float wr = texture(tWeich, vec2(vUv.x + 0.003 * sin(vUv.y * 420.0), my)).r;
      bild += FARBE_G * wr * 0.6 * an * smoothstep(0.0, 0.03, unten.y - vUv.y);
    }
    a = 1.0;
  }
  if (g.a > 0.5) {
    vec3 V = zumAuge(g.p);
    vec3 n = g.n;
    vec4 hk = texture(tHinten, vUv);
    float dicke = hk.w > g.z ? hk.w - g.z : uRadius * 0.2;
    float d = dicke / uRadius;
    float dichte = 1.0 - exp(-d * 2.4 * uR_gas);
    float schliere = 0.88 + 0.12 * snoise(vec3(css * 0.008, uZeit * 0.5));
    float e = dichte * schliere * an;
    vec3 c = FARBE_G * (e * 6.0 + e * e * 6.0);
    c = mix(c, KERN * 9.0 * an, smoothstep(0.4, 0.9, e));
    float nv = max(dot(n, V), 0.0);
    c += FARBE_G * pow(1.0 - nv, 2.0) * 1.5 * an;
    vec3 spieg = studio(reflect(-V, n));
    c += smoothstep(0.75, 1.2, spieg) * fresnelS(nv, 0.04) * 1.2;
    bild = mix(bild, c, maske);
    a = max(a, maske);
  }
  farbe = vec4(linZuSrgb(aces(bild)) * a, a);
}
`;
}

/** wie strichAb (Barcelona), hier für das Anarchie-A */
const STRICH = /* glsl */ `
float strichAbN(vec2 p, vec2 a, vec2 b, float r) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) - r;
}
`;

export const HALL_OF_FAME = bildVoreinstellung({
  id: 'hallOfFame',
  name: 'Hall of Fame',
  gruppe: 'Straße',
  zeile: 'Ghetto: Ziegelwand in Lagen, Buff-Flächen mit Rollenstreifen, Throw-ups in Chrom und Weiß mit Kontur, Schattenblock, Overspray und Läufern, Tags in Schwarz und Silber; Farbe nur auf den hohen Stellen',
  regler: [
    { k: 'graffiti', name: 'Graffiti', min: 0, max: 1.2, schritt: 0.05, grund: 1 },
    { k: 'buff', name: 'Buff', min: 0, max: 1, schritt: 0.05, grund: 0.7 },
  ],
  fragment: HALL_GLSL,
  unruhig: () => false,
});
export const NIETENLEDER = bildVoreinstellung({
  id: 'nietenleder',
  name: 'Nietenleder',
  gruppe: 'Straße',
  zeile: 'Punk: schwarzes Rindleder mit Narbung und Falten, abgerieben, Pyramidennieten aus Nickel in Gürteln und auf dem Rücken, Kegelnieten auf der Mittellinie, Ziernähte, ein weißes Anarchie-A mit Krakelee; dunkler Club',
  regler: [
    { k: 'nieten', name: 'Nieten', min: 0.5, max: 2, schritt: 0.05, grund: 1 },
    { k: 'farbe', name: 'Farbe', min: 0, max: 1, schritt: 1, grund: 1 },
  ],
  fragment: STRICH + NIETEN_GLSL,
  unruhig: () => false,
});
const GAS_REGLER = [
  { k: 'gas', name: 'Gas', min: 0.3, max: 3, schritt: 0.05, grund: 1 },
  { k: 'schein', name: 'Schein', min: 0, max: 2, schritt: 0.05, grund: 1 },
];
export const NEON_ROT = bildVoreinstellung({
  id: 'neonRot',
  name: 'Neon Rot',
  gruppe: 'Straße',
  zeile: 'Die Form als Glasgefäß voll Neon: das Licht wächst mit der Dicke, der Kern wird weiß, der Rand bleibt satt rotorange; großer Schein, Spiegelbild auf nassem Asphalt, seltenes Flackern',
  regler: GAS_REGLER,
  fragment: leuchtgas('vec3(1.0, 0.29, 0.11)', 'vec3(1.0, 0.827, 0.69)'),
  rueckseite: true,
  weich: { skala: 0.25, radius: 22 },
  unruhig: () => true,
});
export const ARGON_BLAU = bildVoreinstellung({
  id: 'argonBlau',
  name: 'Argon Blau',
  gruppe: 'Straße',
  zeile: 'Die Form als Glasgefäß voll Argon: das Licht wächst mit der Dicke, der Kern wird weiß, der Rand bleibt satt blau; großer Schein, Spiegelbild auf nassem Asphalt, seltenes Flackern',
  regler: GAS_REGLER,
  fragment: leuchtgas('vec3(0.227, 0.42, 1.0)', 'vec3(0.863, 0.902, 1.0)'),
  rueckseite: true,
  weich: { skala: 0.25, radius: 22 },
  unruhig: () => true,
});
