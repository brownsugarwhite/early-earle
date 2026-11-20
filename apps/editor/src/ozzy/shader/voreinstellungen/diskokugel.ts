/**
 * Diskokugel (Materialien; Florian: „einen realistischen diskokugelshader … in höchster qualität“). Die Form ist mit Spiegelkacheln
 * besetzt und dreht sich langsam:
 * - **Kacheln** in Breitenreihen um die Hochachse durch die Mitte der Form (wie bei einer echten Kugel: je Reihe so viele, dass sie
 *   quadratisch bleiben, Reihen gegeneinander versetzt), dunkle Fugen dazwischen. Jede Kachel ist ein ebener Spiegel: Ihre Normale wird
 *   an der Mitte der Kachel gelesen (über die Ableitungen der Kachellage im Bild zurückgerechnet), dazu eine kleine Verkippung je
 *   Kachel. So spiegelt jede Kachel einen einzigen Fleck des Raums und blitzt auf, wenn sie einen Strahler trifft.
 * - **Club:** dunkler Raum mit vier Strahlern (weiß, dazu Magenta, Cyan, Bernstein; „Farbig“ mischt sie zu Weiß).
 * - **Lichtflecken an Wand und Boden**, physikalisch: Für einen Punkt der Wand wird die Kachel gesucht, deren Normale das Licht eines
 *   Strahlers dorthin spiegeln könnte (Halbvektor), und deren tatsächliche Spiegelrichtung geprüft. So wirft jede Kachel genau einen
 *   Fleck, die Flecken laufen in Reihen über Wand und Boden, wenn sich die Kugel dreht, und werden auf dem Boden schräg gestreckt.
 * - **Sternfilter** auf den hellsten Kacheln, ein Hauch Dunst um die Kugel.
 */
import { type RawShaderMaterial, type Texture } from 'three';
import { BILD_KOPF } from '../bildShader';
import { GDaten } from '../daten';
import type { ShaderKern, ShaderLauf, ShaderWerte, Voreinstellung } from '../kern';

const HAUPT = /* glsl */ `
${BILD_KOPF}
uniform float uKacheln;
uniform float uTempo;
uniform float uFarbig;
uniform float uFlecken;
uniform float uDunst;
/** die Lichter, an der Sicht (x rechts, y oben, z zum Betrachter): 0 Punktstrahler auf die Kugel (weiß), 1 Magenta, 2 Cyan */
vec3 lichtSicht(int i) {
  if (i == 0) return normalize(vec3(-0.42, 0.62, 0.66));
  if (i == 1) return normalize(vec3(0.95, 0.12, 0.1));
  return normalize(vec3(-0.85, 0.25, -0.45));
}
vec3 lichtRichtung(int i) { return ausSicht(lichtSicht(i)); }
vec3 lichtFarbe(int i) {
  if (i == 0) return vec3(1.0, 0.97, 0.92);
  if (i == 1) return vec3(1.0, 0.2, 0.7);
  return vec3(0.15, 0.75, 1.0);
}
float lichtStaerke(int i) { return i == 0 ? 1.0 : 0.55 * uFarbig; }
float drehWinkel() { return uZeit * 0.3 * uTempo; }
/** Kachel zur Richtung n (vom Mittelpunkt): Kennung (Kachel, Reihe), Lage in der Kachel, Mitte als Richtung, stetige Lage (uu, rv) */
void kachel(vec3 n, out vec2 zell, out vec2 f, out vec3 mitte, out vec2 stetig) {
  float rows = floor(30.0 * uKacheln);
  float dth = 3.14159265 / rows;
  float th = asin(clamp(n.y, -1.0, 1.0));
  float phi = atan(n.z, n.x) + drehWinkel();
  float rv = (th + 1.5707963) / dth;
  float row = floor(rv);
  float thc = (row + 0.5) * dth - 1.5707963;
  float nRow = max(1.0, floor(6.2831853 * cos(thc) / dth + 0.5));
  float dph = 6.2831853 / nRow;
  float off = hash11(row * 3.7 + 1.0);
  float uu = phi / dph + off;
  float col = floor(uu);
  f = vec2(fract(uu), fract(rv));
  zell = vec2(mod(col, nRow), row);
  float phc = (col + 0.5 - off) * dph - drehWinkel();
  mitte = vec3(cos(thc) * cos(phc), sin(thc), cos(thc) * sin(phc));
  stetig = vec2(uu, rv);
}
/** der Spiegel einer Kachel: ihre Mitte, ein wenig verkippt (je Kachel) */
vec3 kachelNormale(vec2 zell, vec3 mitte) { return normalize(mitte + 0.028 * (hash33(vec3(zell, 5.0)) - 0.5)); }
/** was eine Kachel spiegelt: dunkler Club, die Wände im Licht der farbigen Strahler, die Strahler selbst, Lichtleisten */
vec3 club(vec3 Rw) {
  // die Kugel dreht sich vor festen Lichtern: gleichwertig dreht sich hier der Raum um die Hochachse
  float wd = -drehWinkel();
  vec3 R = vec3(cos(wd) * Rw.x - sin(wd) * Rw.z, Rw.y, sin(wd) * Rw.x + cos(wd) * Rw.z);
  vec3 d = normalize((uView * vec4(R, 0.0)).xyz);
  vec3 c = vec3(0.012, 0.011, 0.016) + vec3(0.035, 0.034, 0.042) * smoothstep(-0.3, 0.6, d.y);
  c += uFarbig * (vec3(0.12, 0.015, 0.08) * smoothstep(0.3, 0.95, d.x) + vec3(0.015, 0.05, 0.13) * smoothstep(0.3, 0.95, -d.x)) * (0.5 + 0.5 * smoothstep(-0.6, 0.3, d.y));
  // viele kleine Lichter im Raum (Lampen, Anzeigen, Gläser an der Bar)
  for (int i = 0; i < 28; i++) {
    vec3 ld = normalize(hash33(vec3(float(i), 4.0, 9.0)) * 2.0 - 1.0);
    vec3 lc = mix(vec3(1.0, 0.85, 0.6), mix(vec3(1.0, 0.3, 0.75), vec3(0.3, 0.8, 1.0), hash11(float(i) * 3.3)), uFarbig * step(0.4, hash11(float(i) * 7.1)));
    c += lc * 9.0 * smoothstep(0.996, 0.9978, dot(d, ld));
  }
  // Lichtleisten an der Bar (warm), auf Augenhöhe hinter dem Betrachter
  c += vec3(1.4, 0.75, 0.3) * smoothstep(0.02, 0.0, abs(d.y + 0.08)) * smoothstep(0.1, 0.4, d.z) * (0.6 + 0.4 * step(0.5, fract(d.x * 6.0)));
  for (int i = 0; i < 3; i++) {
    float w = dot(d, lichtSicht(i));
    c += lichtFarbe(i) * lichtStaerke(i) * (smoothstep(0.9982, 0.9992, w) * 70.0 + exp(-(1.0 - w) * 45.0) * 0.8);
  }
  return c;
}
/** ein Lichtfleck an der Richtung dW (von der Kugel aus) vom Licht i: die Kachel, die dorthin spiegeln kann (Halbvektor), als
 * kleines helles Quadrat; zurück: Stärke */
float fleck(vec3 dW, int i, float breite) {
  vec3 s = lichtRichtung(i);
  vec3 n = normalize(dW + s);
  vec2 zell, f, st;
  vec3 mitte;
  kachel(n, zell, f, mitte, st);
  if (abs(mitte.y) > 0.97 || dot(mitte, s) < 0.05) return 0.0;
  vec3 r = reflect(-s, kachelNormale(zell, mitte));
  if (dot(r, dW) < 0.99) return 0.0;
  vec3 e1 = normalize(cross(r, vec3(0.0, 1.0, 0.0)));
  vec3 e2 = cross(e1, r);
  vec3 o = dW - r * dot(dW, r);
  vec2 q = abs(vec2(dot(o, e1), dot(o, e2))) - breite;
  float dq = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - breite * 0.25;
  return (1.0 - smoothstep(-breite * 0.15, breite * 0.15, dq)) * (0.55 + 0.45 * hash12(zell + float(i) * 7.0)) * step(0.25, hash12(zell + float(i) * 3.0 + 1.0));
}
out vec4 hdr;
void main() {
  GPunkt g = gLesen(vUv);
  float maske = deckungBei(vUv);
  vec3 blick = blickDurch(vUv);
  // Kachellage an der Form (für alle Bildpunkte, damit die Ableitungen gelten): in der Ebene, die der Fläche am nächsten liegt,
  // Reihen je um einen eigenen Versatz verschoben; gleich groß überall
  vec3 qk = (g.p - uMitte) / (uRadius * 0.06 / uKacheln);
  vec3 an = abs(g.n);
  float eb = an.y >= an.x && an.y >= an.z ? 1.0 : (an.x >= an.z ? 0.0 : 2.0);
  vec2 st = eb > 0.5 && eb < 1.5 ? qk.xz : (eb < 0.5 ? qk.zy : qk.xy);
  st.x += hash11(floor(st.y) * 1.37 + eb * 9.0);
  vec2 f = fract(st);
  vec2 zell = floor(st) + vec2(eb * 1013.0, eb * 331.0);
  vec2 gx = vec2(dFdx(st.x), dFdx(st.y)), gy = vec2(dFdy(st.x), dFdy(st.y));
  // Raum: Wand hinter der Kugel und Boden darunter
  vec3 vorn = normalize((uViewInv * vec4(0.0, 0.0, -1.0, 0.0)).xyz);
  vec3 o = uOrtho > 0.5 ? lageAusTiefe(vUv, 1.0) : uKamPos;
  vec3 wandP = uMitte + vorn * uRadius * 4.5;
  float tw = dot(wandP - o, vorn) / max(dot(blick, vorn), 1e-4);
  float bodenY = uMitte.y - uRadius * 1.6;
  float tb = blick.y < -1e-4 ? (bodenY - o.y) / blick.y : 1e9;
  bool boden = tb > 0.0 && tb < tw;
  float tEnde = boden ? tb : tw;
  vec3 P = o + blick * tEnde;
  vec3 dW = P - uMitte;
  float abst = length(dW) / uRadius;
  vec3 nFlaeche = boden ? vec3(0.0, 1.0, 0.0) : -vorn;
  vec3 c = vec3(0.0);
  if (uBuehne > 0.5) {
    vec3 raum = boden ? vec3(0.016, 0.014, 0.02) : vec3(0.012, 0.011, 0.018);
    // die farbigen Strahler tauchen Wand und Boden in ihr Licht
    raum += uFarbig * (vec3(0.05, 0.004, 0.03) * smoothstep(-0.2, 0.8, dot(normalize(dW), lichtRichtung(1))) + vec3(0.004, 0.02, 0.05) * smoothstep(-0.2, 0.8, dot(normalize(dW), lichtRichtung(2))));
    float cosW = max(dot(nFlaeche, -normalize(dW)), 0.0);
    vec3 fl = vec3(0.0);
    for (int i = 0; i < 3; i++) fl += lichtFarbe(i) * lichtStaerke(i) * fleck(normalize(dW), i, 0.0075);
    c = raum + fl * cosW * 6.0 / (abst * abst) * uFlecken;
  }
  // Strahlen im Dunst: längs des Blicks, wo der Strahl einer Kachel (vom Punktstrahler) durch den Raum läuft
  float tForm = g.a > 0.5 ? g.z / max(dot(blick, vorn), 1e-3) : tEnde;
  vec3 oc = o - uMitte;
  float bq = dot(oc, blick);
  float cq = dot(oc, oc) - pow(uRadius * 5.0, 2.0);
  float dq = bq * bq - cq;
  vec3 dunst = vec3(0.0);
  if (uBuehne > 0.5 && uDunst > 0.0 && dq > 0.0) {
    float t0 = max(-bq - sqrt(dq), 0.0), t1 = min(-bq + sqrt(dq), min(tForm, tEnde));
    float schritte = 56.0;
    float dt = (t1 - t0) / schritte;
    float j = hash12(gl_FragCoord.xy + fract(uZeit) * 17.0);
    for (int k = 0; k < 56; k++) {
      float t = t0 + (float(k) + j) * dt;
      if (t > t1) break;
      vec3 pp = o + blick * t - uMitte;
      float l = length(pp) / uRadius;
      if (l < 1.05) continue;
      float st0 = fleck(pp / (l * uRadius), 0, 0.006);
      dunst += vec3(1.0, 0.97, 0.92) * st0 / (0.6 + l * l);
    }
    dunst *= dt / uRadius * 0.55 * uDunst;
    // ein Hauch Dunst überall um die Kugel
    vec2 c0 = insBild(uMitte);
    float rr = length((vUv - c0) * vec2(uAufl.x / uAufl.y, 1.0));
    dunst += vec3(0.06, 0.05, 0.075) * exp(-rr * rr / 0.06) * uDunst;
  }
  c += dunst;
  float a = uBuehne > 0.5 ? 1.0 : 0.0;
  if (g.a > 0.5) {
    // Normale an der Mitte der Kachel (über die Ableitungen zurückgerechnet), dazu eine kleine Verkippung je Kachel
    mat2 J = mat2(gx, gy);
    vec2 dpix = abs(determinant(J)) > 1e-10 ? inverse(J) * (vec2(0.5) - f) : vec2(0.0);
    if (length(dpix) > 60.0) dpix = vec2(0.0);
    vec4 nM = texture(tNormal, (gl_FragCoord.xy + dpix) / uAufl);
    vec3 nT = nM.a > 0.5 ? normalize(nM.xyz) : g.n;
    vec3 nK = normalize(nT + 0.075 * (hash33(vec3(zell, 2.0)) - 0.5));
    vec3 V = -blick;
    vec3 sp = club(reflect(-V, nK));
    float rand = min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y));
    float aaF = (length(gx) + length(gy)) * 0.7 + 1e-4;
    float fuge = 1.0 - smoothstep(0.022 - aaF, 0.04 + aaF, rand);
    // Spiegelglas: leicht getönt, je Kachel ein wenig anders hell, am Rand eine feine Kante aus Glas
    vec3 kc = sp * vec3(0.84, 0.86, 0.9) * (0.8 + 0.35 * hash12(zell + 9.0));
    kc += vec3(0.03, 0.03, 0.035);
    float glasKante = smoothstep(0.1, 0.05, rand) * (1.0 - fuge);
    kc += glasKante * 0.12 * max(dot(nK, lichtRichtung(0)), 0.0);
    kc = mix(kc, vec3(0.05, 0.05, 0.055), fuge);
    // Dunst vor der Kugel
    c = mix(c, kc + dunst * 0.5, maske);
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
  farbe = vec4(c * smoothstep(2.5, 8.0, l), 1.0);
}`;

const STERN = /* glsl */ `
uniform sampler2D tHell;
uniform float uStern;
out vec4 farbe;
void main() {
  vec2 px = 1.0 / vec2(textureSize(tHell, 0));
  vec3 s = vec3(0.0);
  for (int r = 0; r < 4; r++) {
    float w = 0.785398 * float(r);
    vec2 dir = vec2(cos(w), sin(w));
    for (int i = 1; i <= 18; i++) {
      float fi = float(i);
      float g = exp(-fi * 0.2);
      s += (texture(tHell, vUv + dir * px * fi * 2.0).rgb + texture(tHell, vUv - dir * px * fi * 2.0).rgb) * g;
    }
  }
  vec3 gl = vec3(0.0);
  for (int i = 0; i < 12; i++) {
    float w = float(i) * 0.5236;
    gl += texture(tHell, vUv + vec2(cos(w), sin(w)) * px * 5.0).rgb;
  }
  farbe = vec4(s * 0.045 * uStern + gl / 12.0 * 0.5, 1.0);
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
  vec3 aus = linZuSrgbE(acesE(c * 1.1));
  farbe = vec4(aus * a, a);
}`;

class Diskokugel implements ShaderLauf {
  private readonly daten: GDaten;
  private readonly haupt: RawShaderMaterial;
  private readonly hell: RawShaderMaterial;
  private readonly stern: RawShaderMaterial;
  private readonly ende: RawShaderMaterial;
  constructor(k: ShaderKern) {
    this.daten = new GDaten(k);
    this.haupt = k.flaecheProgramm(HAUPT.replace('out vec4 farbe;', ''), { tNormal: { value: null }, tLage: { value: null }, tWeich: { value: null }, tHinten: { value: null }, uKacheln: { value: 1 }, uTempo: { value: 1 }, uFarbig: { value: 1 }, uFlecken: { value: 1 }, uDunst: { value: 1 } });
    this.hell = k.flaecheProgramm(HELL, { tBild: { value: null } });
    this.stern = k.flaecheProgramm(STERN, { tHell: { value: null }, uStern: { value: 1 } });
    this.ende = k.flaecheProgramm(ENDE, { tBild: { value: null }, tStern: { value: null } });
  }
  bild(k: ShaderKern, w: ShaderWerte): Texture {
    const d = this.daten.zeichnen(k);
    const u = this.haupt.uniforms;
    u.tNormal!.value = d.normal;
    u.tLage!.value = d.lage;
    u.uKacheln!.value = w.regler.kacheln ?? 1;
    u.uTempo!.value = w.regler.tempo ?? 1;
    u.uFarbig!.value = w.regler.farbig ?? 1;
    u.uFlecken!.value = w.regler.flecken ?? 1;
    u.uDunst!.value = w.regler.dunst ?? 1;
    const hdr = k.ziel('disko:hdr', { art: 'half' });
    k.flaeche(this.haupt, hdr, [0, 0, 0, 0]);
    const hell = k.ziel('disko:hell', { skala: 0.5, art: 'half' });
    this.hell.uniforms.tBild!.value = hdr.texture;
    k.flaeche(this.hell, hell);
    const stern = k.ziel('disko:stern', { skala: 0.5, art: 'half' });
    this.stern.uniforms.tHell!.value = hell.texture;
    this.stern.uniforms.uStern!.value = w.regler.funkeln ?? 1;
    k.flaeche(this.stern, stern);
    this.ende.uniforms.tBild!.value = hdr.texture;
    this.ende.uniforms.tStern!.value = stern.texture;
    const z = k.ziel('disko:ende', { art: 'byte' });
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

export const DISKOKUGEL: Voreinstellung = {
  id: 'diskokugel',
  name: 'Diskokugel',
  gruppe: 'Materialien',
  zeile: 'Spiegelkacheln in Breitenreihen, jede ein ebener Spiegel; die Kugel dreht sich, jede Kachel wirft ihren Lichtfleck an Wand und Boden',
  regler: [
    { k: 'kacheln', name: 'Kacheln', min: 0.4, max: 2.5, schritt: 0.05, grund: 1 },
    { k: 'tempo', name: 'Drehen', min: 0, max: 3, schritt: 0.05, grund: 1 },
    { k: 'farbig', name: 'Farbig', min: 0, max: 1, schritt: 0.05, grund: 1 },
    { k: 'flecken', name: 'Lichtflecken', min: 0, max: 3, schritt: 0.05, grund: 1 },
    { k: 'dunst', name: 'Dunst (Strahlen)', min: 0, max: 3, schritt: 0.05, grund: 1 },
    { k: 'funkeln', name: 'Funkeln', min: 0, max: 3, schritt: 0.05, grund: 1 },
  ],
  bauen: (k) => new Diskokugel(k),
};
