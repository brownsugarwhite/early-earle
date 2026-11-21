/**
 * Nachtschatten (Runde 9; Florian: „SChau dir das material von drachenzähmen leicht gemacht des nachtschatten an und mache es noch
 * besser“). Recherche `docs/research/2026-11-21-runde-9-recherche.md`, Abschnitt 1. Was ihn schön macht: ein Schwarz, das die Form
 * trotzdem zeigt (große, weich verlaufende Spiegelungen, kühles Randlicht); zwei Maßstäbe und nichts dazwischen (eine sehr feine,
 * ruhige Perlhaut, die man nur im Glanz sieht, und wenige große glatte Platten); ein einziger Farbakzent. Keine Schlangenschuppen.
 * - Grund nie ganz schwarz: Rücken #1b1d23, Flanken #23262e, Bauch #272421; F0 0,035. Drei Glanzkeulen: Satin auf der Perlhaut
 *   (Rauheit 0,45), Platten (0,12), dazu Samtschimmer #3a4866 an den Rändern und Randlicht #8fb4ff.
 * - Besser als im Film: Geisterflecken (Rosetten eines schwarzen Panthers nur in Rauheit und Glanz, nie in der Farbe),
 *   Rabenschimmer (Dünnschicht nur im Streiflicht und nur auf den Platten), feine helle Kratzer auf den Platten, Staub in Mulden.
 * - **Nachtschatten:** Bühne Wolken im Abendlicht (Gegenlicht #ffb36b, Himmel #7fa6d9 nach #f2c79a); schwarz braucht große Lichtflächen.
 * - **Nachtschatten Alpha:** Mondnacht (#0b1630 nach #24406b, der Mond als kleine harte Lampe); die Rückenstacheln in zwei Reihen
 *   leuchten (Kern #eafcff, Glut #3fc8ff, Saum #1f5fff), das Licht dringt in die Haut daneben (#12305f), Ladewelle vom Schwanz zum
 *   Kopf, Blitz, Ausklingen, dazwischen ruhiges Atmen; Sternenhaut: einzelne Körnchen glitzern wie Sterne.
 */
import { bildVoreinstellung } from '../bildShader';
import { TIER_ZELLEN } from './tiere';

function nachtschatten(alpha: boolean): string {
  return /* glsl */ `
${TIER_ZELLEN}
const bool ALPHA = ${alpha ? 'true' : 'false'};
/** die Welt, die sich im Schwarz spiegelt (Richtung in der Welt; Lichter fest zum Betrachter) */
vec3 umgebung(vec3 R) {
  vec3 r = normalize((uView * vec4(R, 0.0)).xyz);
  if (ALPHA) {
    vec3 c = mix(srgbZuLin(vec3(0.043, 0.086, 0.188)), srgbZuLin(vec3(0.141, 0.251, 0.42)), smoothstep(-0.3, 0.9, r.y));
    c += vec3(0.9, 0.95, 1.0) * 14.0 * smoothstep(0.9985, 0.9993, dot(r, normalize(vec3(-0.45, 0.7, 0.45))));
    c += vec3(0.35, 0.45, 0.7) * 0.6 * smoothstep(0.9, 1.0, dot(r, normalize(vec3(-0.45, 0.7, 0.45))));
    return c;
  }
  vec3 c = mix(srgbZuLin(vec3(0.949, 0.78, 0.604)), srgbZuLin(vec3(0.498, 0.651, 0.851)), smoothstep(-0.05, 0.75, r.y));
  c *= smoothstep(-0.6, 0.0, r.y) * 0.85 + 0.15;
  // Wolkenbänder und die Sonne im Gegenlicht (hinten rechts), dazu ein großer heller Streifen (Softbox des Himmels)
  float wolke = smoothstep(0.1, 0.7, snoise(vec3(r.x * 2.5, r.y * 7.0, r.z * 2.5)) * 0.5 + 0.5);
  c = mix(c, c * 1.35 + srgbZuLin(vec3(1.0, 0.7, 0.42)) * 0.25, wolke * smoothstep(-0.1, 0.4, r.y) * 0.6);
  c += srgbZuLin(vec3(1.0, 0.702, 0.42)) * 5.0 * smoothstep(0.97, 0.995, dot(r, normalize(vec3(0.55, 0.25, -0.8))));
  c += srgbZuLin(vec3(1.0, 0.8, 0.6)) * 1.2 * smoothstep(0.75, 0.98, dot(r, normalize(vec3(0.55, 0.25, -0.8))));
  c += vec3(0.9, 0.92, 1.0) * 1.6 * smoothstep(0.55, 0.75, r.y) * smoothstep(0.5, 0.0, abs(r.x + 0.25));
  return c;
}
/** Bühne */
vec3 grund(vec2 qb) {
  float asp = uAufl.x / uAufl.y;
  if (ALPHA) {
    vec3 c = mix(srgbZuLin(vec3(0.043, 0.086, 0.188)), srgbZuLin(vec3(0.141, 0.251, 0.42)), smoothstep(0.0, 1.0, qb.y));
    vec2 m = vec2(0.2, 0.8);
    float d = length((qb - m) * vec2(asp, 1.0));
    c += vec3(0.95, 0.97, 1.0) * smoothstep(0.045, 0.04, d) * 1.2 + vec3(0.3, 0.4, 0.65) * exp(-d * d * 30.0) * 0.4;
    vec2 sp = qb * vec2(asp, 1.0) * 120.0;
    vec2 sz = floor(sp);
    float sd = length(fract(sp) - 0.5 - (hash22(sz) - 0.5) * 0.6);
    c += vec3(0.8, 0.85, 1.0) * step(0.993, hash12(sz)) * (1.0 - smoothstep(0.08, 0.16, sd)) * 0.9 * smoothstep(0.3, 0.9, qb.y);
    float wolke = smoothstep(0.2, 0.7, snoise(vec3(qb.x * asp * 2.0, qb.y * 6.0, 1.0)) * 0.5 + 0.5) * smoothstep(0.75, 0.3, qb.y);
    return mix(c, c * 0.5 + vec3(0.05, 0.07, 0.12), wolke * 0.6);
  }
  vec3 c = mix(srgbZuLin(vec3(0.949, 0.78, 0.604)), srgbZuLin(vec3(0.498, 0.651, 0.851)), smoothstep(0.15, 0.95, qb.y));
  vec2 s = vec2(0.82, 0.55);
  float d = length((qb - s) * vec2(asp, 1.0));
  c += srgbZuLin(vec3(1.0, 0.702, 0.42)) * (exp(-d * d * 14.0) * 0.9 + smoothstep(0.035, 0.03, d) * 2.0);
  float wolke = smoothstep(0.35, 0.75, snoise(vec3(qb.x * asp * 1.6, qb.y * 5.0, 2.0)) * 0.5 + 0.5 + 0.2 * snoise(vec3(qb * 9.0, 3.0)));
  vec3 wf = mix(srgbZuLin(vec3(0.55, 0.45, 0.5)), srgbZuLin(vec3(1.0, 0.75, 0.55)), smoothstep(0.3, 0.7, qb.y) * (1.0 - smoothstep(0.0, 0.6, d)));
  return mix(c, wf, wolke * 0.7);
}
void main() {
  GPunkt g = gLesen(vUv);
  float maske = deckungBei(vUv);
  vec2 qb = gl_FragCoord.xy / uAufl;
  vec3 bild = uBuehne > 0.5 ? grund(qb) : vec3(0.0);
  float a = uBuehne > 0.5 ? 1.0 : 0.0;
  if (g.a > 0.5) {
    vec3 V = zumAuge(g.p);
    vec3 n0 = g.n;
    vec3 q = (g.p - uMitte) / uRadius;
    vec3 A, B, C;
    achsen(A, B, C);
    float laengs = dot(q, A);
    float pix = max(length(dFdx(g.p)), length(dFdy(g.p))) / uRadius;
    // Perlhaut: winzige, flach gewölbte Körnchen (rund 1/150 der Form), sichtbar nur im Glanz; unter zwei Bildpunkten treten sie zurück
    float kG = 0.0075 * uR_koernung;
    vec3 km;
    float kid;
    float kr = zelleRand3(q / kG, km, kid);
    float lodK = smoothstep(2.0, 5.0, kG / max(pix, 1e-6));
    vec3 nK = normalize(n0 - km * 0.32 * lodK * smoothstep(0.0, 0.15, kr));
    // Platten beiderseits der Mittellinie (zum Schwanz hin kleiner), am Kopf größer
    float seiteZ = abs(q.z);
    float groesse = mix(0.05, 0.11, smoothstep(-0.8, 0.6, laengs));
    float platteBand = smoothstep(0.24, 0.18, seiteZ) * smoothstep(0.0, 0.35, n0.y);
    // eine Reihe runder Platten je Seite, wie Schilde, leicht versetzt
    vec2 pg = vec2(laengs / groesse, (seiteZ - 0.045) / (groesse * 0.8));
    vec2 pf = vec2(fract(pg.x) - 0.5, pg.y);
    float pr = length(pf * vec2(0.62, 1.2)) + 0.025 * snoise(q * 30.0);
    float aaP = fwidth(pr) + 1e-4;
    float platte = platteBand * (1.0 - smoothstep(0.4 - aaP, 0.4 + aaP, pr));
    float platteRand = platte * smoothstep(0.32, 0.4, pr);
    vec3 nP = normalize(n0 + (A * pf.x * 0.1 + vec3(0.0, 0.0, sign(q.z)) * pf.y * 0.08) * platte);
    vec3 n = normalize(mix(nK, nP, platte));
    // Kratzer auf den Platten (gleichgerichtet, wie von Ästen), Staub in Mulden
    float kratzer = platte * (1.0 - smoothstep(0.0, 0.012, abs(fract(dot(q, normalize(A + B * 0.35)) * 70.0 + snoise(q * 8.0) * 2.0) - 0.5))) * step(0.72, snoise(q * 6.0 + 3.0));
    float mulde = smoothstep(0.3, -0.4, n0.y) * smoothstep(0.2, 0.7, snoise(q * 4.0 + 7.0));
    // Grund: nie ganz schwarz, Rücken, Flanken, Bauch
    vec3 alb = mix(vec3(0.153, 0.141, 0.129), mix(vec3(0.137, 0.149, 0.18), vec3(0.106, 0.114, 0.137), smoothstep(-0.1, 0.6, n0.y)), smoothstep(-0.7, -0.2, n0.y));
    alb = mix(alb, vec3(0.341, 0.322, 0.294), mulde * 0.35 + kratzer * 0.4);
    vec3 la = srgbZuLin(alb);
    // Geisterflecken: Rosetten nur in der Rauheit
    vec3 rm;
    float rid;
    float rr = zelleRand3(q * 7.0 + 3.0, rm, rid);
    float rosette = smoothstep(0.05, 0.12, rr) * (1.0 - smoothstep(0.18, 0.26, rr)) * step(0.35, rid) * uR_geist;
    float rauhK = mix(0.45, 0.62, rosette);
    float rauhP = mix(0.12, 0.22, platteRand + kratzer);
    float rauh = mix(rauhK, rauhP, platte);
    // Licht: Hauptlicht, große verlaufende Spiegelungen, Samt, Randlicht
    vec3 L = ALPHA ? ausSicht(normalize(vec3(-0.45, 0.7, 0.45))) : ausSicht(normalize(vec3(-0.4, 0.65, 0.55)));
    vec3 Lr = ausSicht(normalize(vec3(0.55, 0.25, -0.8)));
    float nl = max(dot(n, L), 0.0);
    float nv = clamp(dot(n, V), 0.0, 1.0);
    vec3 lichtF = ALPHA ? vec3(0.55, 0.62, 0.85) : vec3(1.0, 0.9, 0.78);
    vec3 c = la * (lichtF * 1.6 * nl + umgebung(n) * 0.25);
    vec3 R = reflect(-V, n);
    float fr = fresnelS(nv, 0.035);
    vec3 spK = umgebung(normalize(mix(R, n, rauh * 0.6)));
    c += spK * fr * mix(0.55, 1.0, 1.0 - rauh) * 1.1;
    vec3 H = normalize(L + V);
    c += lichtF * 2.2 * ggx(max(dot(n, H), 0.0), rauh) * fresnelS(max(dot(H, V), 0.0), 0.035) * nl;
    // Rabenschimmer: nur auf den Platten und im Streiflicht
    vec3 rabe = 0.5 + 0.5 * cos(6.2831853 * (vec3(0.62, 0.72, 0.38) + (1.0 - nv) * 0.9));
    c += rabe * spK * fr * platte * smoothstep(0.35, 0.05, nv) * 0.35;
    // Samt an den Rändern, kühles Randlicht
    c += srgbZuLin(vec3(0.227, 0.282, 0.4)) * pow(1.0 - nv, 2.5) * 0.35;
    c += srgbZuLin(vec3(0.561, 0.706, 1.0)) * pow(1.0 - nv, 4.0) * smoothstep(-0.2, 0.5, dot(n0, Lr)) * (ALPHA ? 0.9 : 1.4);
    if (ALPHA) {
      // Sternenhaut: einzelne Körnchen glitzern (je Körnchen entschieden, ohne Flimmern)
      float stern = step(0.986, fract(kid * 91.7)) * (1.0 - smoothstep(0.0, 0.6, length(km)));
      c += vec3(0.85, 0.92, 1.0) * stern * 3.0 * lodK * pow(max(dot(reflect(-L, n0), V), 0.0), 2.0);
      // Rückenstacheln in zwei Reihen leuchten; das Licht dringt in die Haut daneben; Ladewelle vom Schwanz zum Kopf
      float oben = smoothstep(0.25, 0.6, n0.y);
      float reihe = abs(seiteZ - 0.035);
      float zacke = fract(laengs / 0.075);
      float breiteS = 0.022 * smoothstep(0.92, 0.2, zacke) * step(0.08, zacke);
      float stachel = oben * (1.0 - smoothstep(breiteS * 0.7, breiteS, reihe)) * step(0.001, breiteS);
      float zeit = mod(uZeit, 5.0);
      float front = mix(-1.1, 1.1, clamp(zeit / 1.2, 0.0, 1.0));
      float welle = smoothstep(front - 0.35, front, laengs) * (1.0 - smoothstep(front, front + 0.05, laengs));
      float geladen = step(laengs, front);
      float blitz = exp(-max(zeit - 1.2, 0.0) * 6.0) * step(1.2, zeit);
      float ausklingen = exp(-max(zeit - 1.3, 0.0) * 1.2) * step(1.3, zeit);
      float atmen = 0.35 + 0.12 * sin(uZeit * 1.7);
      float glut = max(atmen, max(welle * 1.4 + geladen * 0.7 * step(zeit, 1.2), max(blitz * 2.5, ausklingen))) * ${alpha ? 'uR_leuchten' : '1.0'};
      vec3 kern = srgbZuLin(vec3(0.918, 0.988, 1.0));
      vec3 blau = srgbZuLin(vec3(0.247, 0.784, 1.0));
      vec3 saum = srgbZuLin(vec3(0.122, 0.373, 1.0));
      float tief = 1.0 - smoothstep(0.0, 0.012, reihe);
      c = mix(c, mix(saum, mix(blau, kern, tief), stachel) * glut * 3.0, stachel);
      c += srgbZuLin(vec3(0.071, 0.188, 0.373)) * exp(-reihe / 0.03) * oben * glut * 1.6;
    }
    bild = mix(bild, c, maske);
    a = max(a, maske);
  }
  farbe = vec4(linZuSrgb(aces(bild * ${alpha ? '1.15' : '1.05'})) * a, a);
}
`;
}

const REGLER = [
  { k: 'koernung', name: 'Körnung', min: 0.4, max: 2.5, schritt: 0.05, grund: 1 },
  { k: 'geist', name: 'Geisterflecken', min: 0, max: 1, schritt: 0.05, grund: 1 },
];

export const NACHTSCHATTEN = bildVoreinstellung({
  id: 'nachtschatten',
  name: 'Nachtschatten',
  gruppe: 'Tiermuster',
  zeile: 'Ohnezahn, besser als im Film: ein Schwarz, das die Form zeigt, feine Perlhaut nur im Glanz, glatte Platten an der Mittellinie mit Rabenschimmer und Kratzern, Geisterflecken nur in der Rauheit, Samt und kühles Randlicht; Wolken im Abendlicht',
  regler: REGLER,
  fragment: nachtschatten(false),
  unruhig: () => false,
});
export const NACHTSCHATTEN_ALPHA = bildVoreinstellung({
  id: 'nachtschattenAlpha',
  name: 'Nachtschatten Alpha',
  gruppe: 'Tiermuster',
  zeile: 'Der Alpha in der Mondnacht: Rückenstacheln in zwei Reihen leuchten blau, das Licht dringt in die schwarze Haut, Ladewelle vom Schwanz zum Kopf mit Blitz, dazwischen ruhiges Atmen; einzelne Körnchen glitzern wie Sterne',
  regler: [...REGLER, { k: 'leuchten', name: 'Leuchten', min: 0, max: 2, schritt: 0.05, grund: 1 }],
  fragment: nachtschatten(true),
  unruhig: () => true,
});
