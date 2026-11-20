/**
 * Diamant und Diamantbesatz (Materialien; Florian: „einen diamant … in höchster qualität“, nach Runde 3: „Diskokugel und diamant
 * gefallen mir noch nicht so gut“). Zwei Fassungen mit demselben Licht und derselben Nachbearbeitung:
 *
 * **Diamant (ein Stein):** Die Normale rastet auf einen Satz Facetten ein (gestörte Fibonacci-Kugel, fest an der Form), außen
 * spiegelt die Facette (F0 0,17 bei n = 2,42). Innen läuft das Licht durch die echte Form: gebrochen hinein, an der Rückseite (aus
 * dem Puffer der Rückseite, dort wo der gebrochene Strahl ankommt, ebenfalls facettiert) total reflektiert oder zum Teil hinaus (dort
 * sieht man den dunklen Grund), zurück zur Vorderseite und dort hinaus, in sechs Wellenlängen je mit eigener Brechzahl (Cauchy für
 * Diamant, verstärkbar): das Feuer. Was dort nicht hinaus kann, wird noch einmal gespiegelt.
 *
 * **Diamantbesatz (Pavé, wie ein mit Diamanten besetzter Schädel):** Die Haut ist dicht an dicht mit kleinen Brillanten besetzt, in
 * Zellen im Raum (ohne Naht), jeder füllt seine Zelle (Kissenform) in einer schmalen Fassung aus Metall. Ein Brillant von oben: Tafel (Achteck), Sternfacetten,
 * Kite-Facetten, obere Rundistfacetten, jede mit ihrem Kronenwinkel. Das Licht im Stein folgt dem Weg im Brillanten: hinein, an zwei
 * gegenüberliegenden Pavillonfacetten (40,75°) gespiegelt, oben hinaus (je Farbe gebrochen); daraus entsteht das Muster aus hellen
 * Flächen und dunklen Pfeilen (wo man sich selbst sieht). Jeder Stein sitzt ein wenig anders (Drehung, Neigung): Er funkelt zu
 * seiner Zeit. Kleine Steine im Bild werden ruhig zusammengefasst (kein Flimmern).
 *
 * **Licht wie im Schmuckstudio, an der Sicht:** oben ein Lichtzelt, darin schwarze Karten (die Kontraste), um die Blickachse dunkel
 * (der Betrachter), zwei Softboxen, viele kleine Lampen, die sich langsam drehen. **Nachbearbeitung:** Sternfilter wie in der
 * Schmuckfotografie und ein weiches Glühen. Bühne: dunkler Samt mit einem Lichtkegel.
 */
import { type RawShaderMaterial, type Texture } from 'three';
import { BILD_KOPF } from '../bildShader';
import { GDaten } from '../daten';
import type { ReglerZeile, ShaderKern, ShaderLauf, ShaderWerte, Voreinstellung } from '../kern';

const GEMEINSAM = /* glsl */ `
${BILD_KOPF}
uniform float uFacetten;
uniform float uFeuer;
uniform float uDrehung;
uniform float uGroesse;
uniform float uFassung;
vec3 fibo(float i, float n) {
  float phi = acos(1.0 - 2.0 * (i + 0.5) / n);
  float th = 2.39996323 * i;
  return vec3(cos(th) * sin(phi), cos(phi), sin(th) * sin(phi));
}
/** nächste Facette zur Richtung d; kante: Abstand (Kosinus) zur zweitnächsten, klein an Kanten */
vec3 facette(vec3 d, out float kante) {
  float best = -2.0, zweit = -2.0;
  vec3 bn = d;
  float N = floor(uFacetten);
  for (int i = 0; i < 200; i++) {
    float fi = float(i);
    if (fi >= N) break;
    vec3 f = normalize(fibo(fi, N) + 0.16 * (hash33(vec3(fi, 0.0, 1.0)) - 0.5));
    float c = dot(d, f);
    if (c > best) { zweit = best; best = c; bn = f; } else if (c > zweit) zweit = c;
  }
  kante = best - zweit;
  return bn;
}
/**
 * Licht wie im Schmuckstudio, an der Sicht (x rechts, y oben, z zum Betrachter): oben ein Lichtzelt mit schwarzen Karten, um die
 * Blickachse dunkel (der Betrachter selbst), zwei Softboxen knapp über dem Horizont, viele kleine Lampen; dreht sich langsam um oben
 */
vec3 juwelLicht(vec3 dw) {
  vec3 d = normalize((uView * vec4(dw, 0.0)).xyz);
  float t = uZeit * 0.09 * uDrehung;
  float cs = cos(t), sn = sin(t);
  vec3 dr = vec3(cs * d.x - sn * d.z, d.y, sn * d.x + cs * d.z);
  vec3 c = vec3(0.006, 0.006, 0.008);
  c += vec3(1.8, 1.82, 1.9) * smoothstep(0.02, 0.6, dr.y);
  float az = atan(dr.x, -dr.z);
  float fa = fract(az / 6.2831853 * 7.0 + 0.07);
  float karte = smoothstep(0.56, 0.58, fa) * smoothstep(0.97, 0.95, fa);
  c *= 1.0 - 0.97 * karte * (1.0 - smoothstep(0.55, 0.85, dr.y));
  // Streifen im Zelt (Nähte, Stangen): weitere harte Grenzen für Feuer und Funkeln
  c *= 1.0 - 0.9 * smoothstep(0.035, 0.02, abs(fract(dr.y * 4.0 + 0.3) - 0.5)) * step(0.1, dr.y);
  c += vec3(2.8, 2.78, 2.7) * softbox(dr, normalize(vec3(-1.0, 0.22, 0.15)), vec3(0.0, 1.0, 0.0), vec2(0.28, 0.42), 0.05);
  c += vec3(2.3, 2.35, 2.5) * softbox(dr, normalize(vec3(1.0, 0.18, -0.25)), vec3(0.0, 1.0, 0.0), vec2(0.22, 0.38), 0.05);
  for (int i = 0; i < 24; i++) {
    vec3 ld = normalize(hash33(vec3(float(i), 7.0, 3.0)) * 2.0 - 1.0 + vec3(0.0, 0.45, 0.0));
    c += vec3(1.0, 0.97, 0.93) * 90.0 * smoothstep(0.9993, 0.9999, dot(dr, ld));
  }
  // der Betrachter: um die Blickachse dunkel (ungedreht)
  c *= smoothstep(0.96, 0.86, d.z);
  return c;
}
/** dunkler Samt mit einem Lichtkegel um die Form */
vec3 samt(vec2 qb) {
  vec2 c0 = insBild(uMitte);
  float rr = length((qb - c0) * vec2(uAufl.x / uAufl.y, 1.0));
  vec3 g = mix(vec3(0.004, 0.004, 0.009), vec3(0.018, 0.018, 0.032), qb.y) + vec3(0.07, 0.068, 0.085) * exp(-rr * rr / 0.07);
  return g * (0.94 + 0.08 * noise2(gl_FragCoord.xy / uDpr * vec2(0.9, 0.06)));
}
/** Brechzahl von Diamant je Wellenlänge (Cauchy), um 2,42 verstärkt nach dem Regler Feuer */
float etaBei(float lam) {
  float e = 2.3791 + 13298.0 / (lam * lam);
  return 2.42 + (e - 2.42) * (1.0 + 5.0 * uFeuer);
}
float fresnelD(float c) { return 0.172 + 0.828 * pow(1.0 - clamp(c, 0.0, 1.0), 5.0); }
out vec4 hdr;
`;

const STEIN_GLSL = /* glsl */ `
${GEMEINSAM}
void main() {
  GPunkt g = gLesen(vUv);
  float maske = deckungBei(vUv);
  vec3 blick = blickDurch(vUv);
  vec2 qb = gl_FragCoord.xy / uAufl;
  vec3 grund = uBuehne > 0.5 ? samt(qb) : vec3(0.0);
  vec3 c = grund;
  float a = uBuehne > 0.5 ? 1.0 : 0.0;
  if (g.a > 0.5) {
    vec3 V = -blick;
    float kante;
    vec3 nf = facette(g.n, kante);
    if (dot(nf, V) < 0.02) nf = normalize(nf + V * (0.02 - dot(nf, V)));
    float F = fresnelD(dot(nf, V));
    vec3 aussen = juwelLicht(reflect(-V, nf)) * F;
    // hinein und bis zur Rückseite, dort wo der gebrochene Strahl ankommt
    vec3 r1 = refract(-V, nf, 1.0 / 2.42);
    vec4 hb = texture(tHinten, vUv);
    float T = max(hb.w - g.z, uRadius * 0.04);
    vec3 pb = g.p + r1 * T / max(dot(r1, blick), 0.35);
    vec2 uvb = clamp(insBild(pb), vec2(0.0), vec2(1.0));
    vec4 hb2 = texture(tHinten, uvb);
    vec3 nbRoh = hb2.w > 0.0 && dot(hb2.xyz, hb2.xyz) > 0.1 ? normalize(hb2.xyz) : (dot(hb.xyz, hb.xyz) > 0.1 ? normalize(hb.xyz) : -g.n);
    float kb;
    vec3 nb = facette(nbRoh, kb);
    if (dot(nb, r1) < 0.05) nb = normalize(nb + r1 * (0.05 - dot(nb, r1)));
    // an der Rückseite: total reflektiert oder zum Teil hinaus (dort zeigt sich der Grund)
    float bleibt = 1.0;
    vec3 raus = refract(r1, -nb, 2.42);
    if (dot(raus, raus) > 1e-6) bleibt = fresnelD(abs(dot(raus, nb)));
    vec3 r2 = reflect(r1, nb);
    // zurück zur Vorderseite und hinaus, je Wellenlänge gebrochen
    vec2 uv2 = clamp(insBild(pb + r2 * T * 0.6), vec2(0.0), vec2(1.0));
    vec4 n2r = texture(tNormal, uv2);
    float k2;
    vec3 ne = facette(n2r.a > 0.5 ? normalize(n2r.xyz) : g.n, k2);
    if (dot(ne, r2) < 0.05) ne = normalize(ne + r2 * (0.05 - dot(ne, r2)));
    // wer vorn nicht hinaus kann, läuft noch einmal zur Rückseite und tritt dort aus (auch dort je Farbe gebrochen)
    vec3 r3 = reflect(r2, ne);
    vec2 uv3 = clamp(insBild(pb + r2 * T * 0.6 + r3 * T * 0.6), vec2(0.0), vec2(1.0));
    vec4 hb3 = texture(tHinten, uv3);
    float k3;
    vec3 nb3 = facette(dot(hb3.xyz, hb3.xyz) > 0.1 ? normalize(hb3.xyz) : nbRoh, k3);
    if (dot(nb3, r3) < 0.05) nb3 = normalize(nb3 + r3 * (0.05 - dot(nb3, r3)));
    vec3 innen = vec3(0.0), wsum = vec3(0.0);
    for (int i = 0; i < 6; i++) {
      float lam = 410.0 + float(i) * 54.0;
      float eta = etaBei(lam);
      vec3 w = max(spektral(lam), vec3(0.0));
      vec3 e2 = refract(r2, -ne, eta);
      vec3 L;
      if (dot(e2, e2) > 1e-6) L = juwelLicht(e2) * (1.0 - fresnelD(abs(dot(e2, ne))));
      else {
        vec3 e3 = refract(r3, -nb3, eta);
        L = dot(e3, e3) > 1e-6 ? juwelLicht(e3) * (1.0 - fresnelD(abs(dot(e3, nb3)))) : juwelLicht(reflect(r3, nb3)) * 0.3;
      }
      innen += L * w;
      wsum += w;
    }
    innen /= max(wsum, vec3(1e-4));
    vec3 durch = (uBuehne > 0.5 ? samt(uvb) * 3.0 : vec3(0.0)) * (1.0 - bleibt);
    c = aussen + (innen * bleibt + durch) * (1.0 - F) * vec3(0.98, 0.99, 1.0);
    // Kanten der Facetten: eine feine helle Linie
    c += vec3(0.8) * (1.0 - smoothstep(0.0, 0.0035, kante)) * 0.3;
    c = mix(grund, c, maske);
    a = max(a, maske);
  }
  hdr = vec4(c, a);
}
`;

const PAVE_GLSL = /* glsl */ `
${GEMEINSAM}
/** Zellen für die Steine: Abstand zum Rand, Vektor zur Mitte, Kennung, halber Abstand zur nächsten Mitte (Platz für den Stein) */
float paveZelle(vec3 x, out vec3 mitte, out float id, out float platz) {
  vec3 p = floor(x), f = fract(x);
  vec3 mb = vec3(0.0), mr = vec3(0.0);
  float md = 9.0;
  for (int k = -1; k <= 1; k++)
    for (int j = -1; j <= 1; j++)
      for (int i = -1; i <= 1; i++) {
        vec3 b = vec3(float(i), float(j), float(k));
        vec3 r = b + 0.2 + 0.6 * hash33(p + b) - f;
        float d = dot(r, r);
        if (d < md) { md = d; mr = r; mb = b; }
      }
  md = 9.0;
  platz = 9.0;
  for (int k = -1; k <= 1; k++)
    for (int j = -1; j <= 1; j++)
      for (int i = -1; i <= 1; i++) {
        vec3 b = mb + vec3(float(i), float(j), float(k));
        vec3 r = b + 0.2 + 0.6 * hash33(p + b) - f;
        vec3 dr = r - mr;
        float l = length(dr);
        if (l > 1e-4) { md = min(md, dot(0.5 * (mr + r), dr / l)); platz = min(platz, 0.5 * l); }
      }
  mitte = mr;
  id = hash13(p + mb + 0.37);
  return md;
}
/** Richtung mit Neigung al (von oben) in Richtung az, im Rahmen (T1, T2, N) */
vec3 geneigt(float az, float al, vec3 T1, vec3 T2, vec3 N) {
  return normalize(N * cos(al) + (T1 * cos(az) + T2 * sin(az)) * sin(al));
}
void main() {
  GPunkt g = gLesen(vUv);
  float maske = deckungBei(vUv);
  vec3 blick = blickDurch(vUv);
  vec2 qb = gl_FragCoord.xy / uAufl;
  vec3 grund = uBuehne > 0.5 ? samt(qb) : vec3(0.0);
  vec3 c = grund;
  float a = uBuehne > 0.5 ? 1.0 : 0.0;
  // Zellen im Raum (an der Form fest); die Größe im Bild entscheidet, wie viel Schliff zu sehen ist
  vec3 q = (g.p - uMitte) / uRadius;
  float fq = 14.0 / uGroesse;
  vec3 xq = q * fq;
  float pix = length(fwidth(xq)) + 1e-5;
  vec3 mz;
  float id, platz;
  float rand = paveZelle(xq, mz, id, platz);
  if (g.a > 0.5) {
    vec3 V = -blick;
    vec3 n0 = g.n;
    // Rahmen des Steins: leicht geneigt und gedreht, je Stein anders
    vec3 tilt = (hash33(vec3(id * 91.0, 3.0, 7.0)) - 0.5) * 0.12;
    vec3 N = normalize(n0 + tilt - n0 * dot(tilt, n0));
    vec3 T1 = normalize(cross(N, abs(N.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
    vec3 T2 = cross(N, T1);
    float dreh = id * 6.2831853;
    vec3 off = -(mz - n0 * dot(mz, n0));
    vec2 lp = vec2(dot(off, T1), dot(off, T2));
    // Kissen: Abstand zum Rand der Zelle gerundet (mit dem Abstand zur Mitte gemischt); rho ist 0 in der Mitte, 1 am Rand des Steins
    float spalt = 0.035;
    float r0 = length(lp);
    float eR = mix(rand, 0.42 - r0, 0.35) - spalt;
    float rho = r0 / max(r0 + max(eR, 0.0), 1e-4);
    float R = max(r0 + eR, 0.05);
    float th = atan(lp.y, lp.x) - dreh;
    float stein = smoothstep(-pix, pix, eR);
    float detail = smoothstep(0.08, 0.16, pix);
    // Metall der Fassung: Grund mit Kügelchen
    vec3 metall = uFassung < 0.5 ? vec3(0.86, 0.86, 0.88) : (uFassung < 1.5 ? vec3(1.0, 0.77, 0.36) : (uFassung < 2.5 ? vec3(0.96, 0.63, 0.53) : vec3(0.13, 0.13, 0.14)));
    // die Fassung ist eine schmale Wulst zwischen den Steinen
    vec3 nm = normalize(n0 + (normalize(off + 1e-5) - n0 * dot(normalize(off + 1e-5), n0)) * clamp(-eR / spalt, -1.0, 1.0) * 0.8);
    float occ = mix(0.5, 1.0, smoothstep(0.0, spalt, -eR));
    vec3 mc = metall * juwelLicht(reflect(-V, nm)) * (0.35 + 0.65 * fresnelS(max(dot(nm, V), 0.0), 0.6)) * occ;
    mc += metall * 0.06;
    // der Brillant von oben: Tafel, Stern, Kite, obere Rundistfacetten, je mit ihrem Kronenwinkel
    float s8 = 6.2831853 / 8.0;
    float sek = floor(th / s8 + 0.5);
    float w8 = th - sek * s8;
    float wn = abs(w8) / (s8 * 0.5);
    float facId;
    vec3 nk;
    if (rho * cos(w8) < 0.53) { nk = N; facId = 0.0; }
    else if (rho < 0.78 - 0.25 * wn) { nk = geneigt(sek * s8 + dreh, radians(15.0), T1, T2, N); facId = 1.0 + sek; }
    else if (rho > 0.9 - 0.14 * (1.0 - wn)) { nk = geneigt(sek * s8 + sign(w8) * s8 * 0.25 + dreh, radians(42.0), T1, T2, N); facId = 20.0 + sek * 2.0 + step(0.0, w8); }
    else { float kite = floor(th / s8) + 0.5; nk = geneigt(kite * s8 + dreh, radians(34.5), T1, T2, N); facId = 10.0 + kite; }
    float F = fresnelD(dot(nk, V));
    vec3 aussen = juwelLicht(reflect(-V, nk)) * F;
    // innen: hinein, an zwei gegenüberliegenden Pavillonfacetten gespiegelt, oben hinaus (je Farbe gebrochen)
    vec3 i0 = refract(-V, nk, 1.0 / 2.42);
    float pav = floor(th / s8 + 0.5) * s8 + (rho > 0.62 ? sign(w8) * s8 * 0.25 : 0.0) + dreh;
    vec3 np1 = geneigt(pav, radians(180.0 - 40.75), T1, T2, N);
    vec3 np2 = geneigt(pav + 3.14159265, radians(180.0 - 40.75), T1, T2, N);
    vec3 i2 = reflect(reflect(i0, np1), np2);
    vec3 innen = vec3(0.0);
    for (int k = 0; k < 3; k++) {
      float lam = k == 0 ? 640.0 : (k == 1 ? 550.0 : 450.0);
      vec3 e = refract(i2, -N, etaBei(lam));
      float L = dot(e, e) < 1e-6 ? juwelLicht(reflect(i2, N))[k] * 0.35 : juwelLicht(e)[k];
      innen[k] = L;
    }
    vec3 sc = aussen + innen * (1.0 - F);
    // Rundist: eine feine dunkle Kante; Kanten der Facetten fein hell
    sc *= mix(1.0, 0.25, smoothstep(0.93, 0.985, rho));
    // klein im Bild: ruhig zusammengefasst (heller Grund, je Stein ein Funkeln, das mit der Zeit wandert)
    float funk = pow(hash11(id * 17.0 + floor(uZeit * 2.0 * uDrehung + id * 9.0)), 12.0);
    vec3 klein = juwelLicht(reflect(-V, N)) * 0.25 + vec3(0.9, 0.92, 1.0) * (0.55 + 6.0 * funk);
    sc = mix(sc, klein, detail);
    c = mix(mc, sc, stein);
    c = mix(grund, c, maske);
    a = max(a, maske);
  }
  hdr = vec4(c, a);
}
`;

const HELL = /* glsl */ `
uniform sampler2D tBild;
out vec4 farbe;
void main() {
  vec3 c = texture(tBild, vUv).rgb;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  farbe = vec4(c * smoothstep(4.0, 12.0, l), 1.0);
}`;

const STERN = /* glsl */ `
uniform sampler2D tHell;
uniform float uStern;
out vec4 farbe;
void main() {
  vec2 px = 1.0 / vec2(textureSize(tHell, 0));
  vec3 s = vec3(0.0);
  for (int r = 0; r < 4; r++) {
    float w = 0.785398 * float(r) + 0.3;
    vec2 dir = vec2(cos(w), sin(w));
    for (int i = 1; i <= 22; i++) {
      float fi = float(i);
      float g = exp(-fi * 0.16);
      s += (texture(tHell, vUv + dir * px * fi * 2.0).rgb + texture(tHell, vUv - dir * px * fi * 2.0).rgb) * g;
    }
  }
  vec3 gl = vec3(0.0);
  for (int i = 0; i < 12; i++) {
    float w = float(i) * 0.5236;
    gl += texture(tHell, vUv + vec2(cos(w), sin(w)) * px * 6.0).rgb;
  }
  farbe = vec4(s * 0.035 * uStern + gl / 12.0 * 0.45, 1.0);
}`;

const ENDE = /* glsl */ `
uniform sampler2D tBild;
uniform sampler2D tStern;
vec3 linZuSrgbE(vec3 c) { c = max(c, vec3(0.0)); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c)); }
vec3 acesE(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
out vec4 farbe;
void main() {
  vec4 b = texture(tBild, vUv);
  vec3 st = texture(tStern, vUv).rgb;
  vec3 c = b.rgb + st;
  float a = clamp(max(b.a, dot(st, vec3(0.33)) * 1.5), 0.0, 1.0);
  vec3 aus = linZuSrgbE(acesE(c * 0.9));
  farbe = vec4(aus * a, a);
}`;

class Diamant implements ShaderLauf {
  private readonly daten: GDaten;
  private readonly haupt: RawShaderMaterial;
  private readonly hell: RawShaderMaterial;
  private readonly stern: RawShaderMaterial;
  private readonly ende: RawShaderMaterial;
  private readonly pave: boolean;
  private readonly id: string;
  constructor(k: ShaderKern, pave: boolean) {
    this.pave = pave;
    this.id = pave ? 'pave' : 'diamant';
    this.daten = new GDaten(k);
    this.haupt = k.flaecheProgramm((pave ? PAVE_GLSL : STEIN_GLSL).replace('out vec4 farbe;', ''), {
      tNormal: { value: null },
      tLage: { value: null },
      tWeich: { value: null },
      tHinten: { value: null },
      uFacetten: { value: 72 },
      uFeuer: { value: 1.6 },
      uDrehung: { value: 1 },
      uGroesse: { value: 1 },
      uFassung: { value: 0 },
    });
    this.hell = k.flaecheProgramm(HELL, { tBild: { value: null } });
    this.stern = k.flaecheProgramm(STERN, { tHell: { value: null }, uStern: { value: 1 } });
    this.ende = k.flaecheProgramm(ENDE, { tBild: { value: null }, tStern: { value: null } });
  }
  bild(k: ShaderKern, w: ShaderWerte): Texture {
    const d = this.daten.zeichnen(k);
    const u = this.haupt.uniforms;
    u.tNormal!.value = d.normal;
    u.tLage!.value = d.lage;
    if (!this.pave) u.tHinten!.value = this.daten.rueckseite(k);
    u.uFacetten!.value = w.regler.facetten ?? 72;
    u.uFeuer!.value = w.regler.feuer ?? (this.pave ? 1.2 : 1.6);
    u.uDrehung!.value = w.regler.drehung ?? 1;
    u.uGroesse!.value = w.regler.groesse ?? 1;
    u.uFassung!.value = w.regler.fassung ?? 0;
    const hdr = k.ziel(`${this.id}:hdr`, { art: 'half' });
    k.flaeche(this.haupt, hdr, [0, 0, 0, 0]);
    const hell = k.ziel(`${this.id}:hell`, { skala: 0.5, art: 'half' });
    this.hell.uniforms.tBild!.value = hdr.texture;
    k.flaeche(this.hell, hell);
    const stern = k.ziel(`${this.id}:stern`, { skala: 0.5, art: 'half' });
    this.stern.uniforms.tHell!.value = hell.texture;
    this.stern.uniforms.uStern!.value = w.regler.funkeln ?? 1;
    k.flaeche(this.stern, stern);
    this.ende.uniforms.tBild!.value = hdr.texture;
    this.ende.uniforms.tStern!.value = stern.texture;
    const z = k.ziel(`${this.id}:ende`, { art: 'byte' });
    k.flaeche(this.ende, z, [0, 0, 0, 0]);
    return z.texture;
  }
  unruhig(): boolean {
    return true;
  }
  freigeben(): void {
    this.daten.freigeben();
    for (const m of [this.haupt, this.hell, this.stern, this.ende]) m.dispose();
  }
}

const FEUER_STERN: ReglerZeile[] = [
  { k: 'funkeln', name: 'Funkeln', min: 0, max: 3, schritt: 0.05, grund: 1 },
  { k: 'drehung', name: 'Lichter drehen', min: 0, max: 3, schritt: 0.05, grund: 1 },
];

export const DIAMANT: Voreinstellung = {
  id: 'diamant',
  name: 'Diamant',
  gruppe: 'Materialien',
  zeile: 'Die Form als ein geschliffener Stein: Licht läuft durch die echte Form (Rückseite, Vorderseite), Feuer in sechs Wellenlängen, Lichtzelt mit schwarzen Karten, Sternfilter',
  regler: [
    { k: 'facetten', name: 'Facetten', min: 16, max: 200, schritt: 1, grund: 72 },
    { k: 'feuer', name: 'Feuer', min: 0, max: 3, schritt: 0.05, grund: 1.6 },
    ...FEUER_STERN,
  ],
  bauen: (k) => new Diamant(k, false),
};

export const PAVE: Voreinstellung = {
  id: 'pave',
  name: 'Diamantbesatz',
  gruppe: 'Materialien',
  zeile: 'Pavé: die Form dicht an dicht mit kleinen Brillanten besetzt (Tafel, Stern, Kite, Rundist; Licht über zwei Pavillonfacetten), schmale Fassung, jeder Stein funkelt für sich',
  regler: [
    { k: 'groesse', name: 'Steingröße', min: 0.4, max: 3, schritt: 0.05, grund: 1 },
    { k: 'feuer', name: 'Feuer', min: 0, max: 3, schritt: 0.05, grund: 1.2 },
    { k: 'fassung', name: 'Fassung: Platin · Gold · Rosé · Schwarz', min: 0, max: 3, schritt: 1, grund: 0 },
    ...FEUER_STERN,
  ],
  bauen: (k) => new Diamant(k, true),
};
