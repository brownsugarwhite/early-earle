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
vec3 lichtRichtung(int i) {
  if (i == 0) return normalize(vec3(-0.6, 0.55, 0.6));
  if (i == 1) return normalize(vec3(0.75, 0.3, 0.35));
  if (i == 2) return normalize(vec3(0.15, 0.85, -0.55));
  return normalize(vec3(-0.8, 0.05, -0.4));
}
vec3 lichtFarbe(int i) {
  if (i == 0) return vec3(1.0, 0.97, 0.92);
  if (i == 1) return mix(vec3(1.0), vec3(1.0, 0.22, 0.75), uFarbig);
  if (i == 2) return mix(vec3(1.0), vec3(0.15, 0.8, 1.0), uFarbig);
  return mix(vec3(1.0), vec3(1.0, 0.62, 0.15), uFarbig);
}
float drehWinkel() { return uZeit * 0.3 * uTempo; }
/** Kachel zur Richtung n (vom Mittelpunkt): Kennung (Kachel, Reihe), Lage in der Kachel, Mitte als Richtung, stetige Lage (uu, rv) */
void kachel(vec3 n, out vec2 zell, out vec2 f, out vec3 mitte, out vec2 stetig) {
  float rows = floor(22.0 * uKacheln);
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
/** was eine Kachel spiegelt: dunkler Club, Strahler als helle Scheiben mit Hof, ein Hauch Raum */
vec3 club(vec3 R) {
  vec3 c = mix(vec3(0.03, 0.026, 0.036), vec3(0.11, 0.1, 0.13), smoothstep(-0.4, 0.6, R.y));
  c += vec3(0.07, 0.06, 0.09) * (0.5 + 0.5 * snoise(R * 3.0));
  for (int i = 0; i < 4; i++) {
    float w = dot(R, lichtRichtung(i));
    c += lichtFarbe(i) * (smoothstep(0.9975, 0.9988, w) * 30.0 + exp(-(1.0 - w) * 60.0) * 0.6) * (i == 0 ? 1.3 : 0.9);
  }
  return c;
}
/** Lichtflecken an einem Punkt von Wand oder Boden (dWand: Richtung von der Kugel zum Punkt) */
vec3 flecken(vec3 dWand) {
  vec3 summe = vec3(0.0);
  for (int i = 0; i < 4; i++) {
    vec3 s = lichtRichtung(i);
    vec3 n = normalize(dWand + s);
    vec2 zell, f, st;
    vec3 mitte;
    kachel(n, zell, f, mitte, st);
    if (abs(mitte.y) > 0.96) continue;
    vec3 nt = normalize(mitte + 0.022 * (hash33(vec3(zell, 5.0)) - 0.5));
    vec3 r = reflect(-s, nt);
    float w = dot(r, dWand);
    float fleck = smoothstep(0.99986, 0.99994, w);
    summe += lichtFarbe(i) * fleck * (0.5 + 0.5 * hash12(zell + float(i) * 7.0)) * (i == 0 ? 1.5 : 0.6) * step(0.35, hash12(zell + float(i) * 3.0 + 1.0));
  }
  return summe;
}
out vec4 hdr;
void main() {
  GPunkt g = gLesen(vUv);
  float maske = deckungBei(vUv);
  vec3 blick = blickDurch(vUv);
  // Kachellage an der Form (für alle Bildpunkte, damit die Ableitungen gelten)
  vec3 qn = normalize(g.p - uMitte + 1e-4);
  vec2 zell, f, st;
  vec3 mitte;
  kachel(qn, zell, f, mitte, st);
  vec2 gx = vec2(dFdx(st.x), dFdx(st.y)), gy = vec2(dFdy(st.x), dFdy(st.y));
  // Raum: Wand hinter der Kugel und Boden darunter
  vec3 vorn = normalize((uViewInv * vec4(0.0, 0.0, -1.0, 0.0)).xyz);
  vec3 o = uOrtho > 0.5 ? lageAusTiefe(vUv, 1.0) : uKamPos;
  vec3 wandP = uMitte + vorn * uRadius * 4.5;
  float tw = dot(wandP - o, vorn) / max(dot(blick, vorn), 1e-4);
  float bodenY = uMitte.y - uRadius * 1.6;
  float tb = blick.y < -1e-4 ? (bodenY - o.y) / blick.y : 1e9;
  bool boden = tb > 0.0 && tb < tw;
  vec3 P = o + blick * (boden ? tb : tw);
  vec3 dW = P - uMitte;
  float abst = length(dW) / uRadius;
  vec3 nFlaeche = boden ? vec3(0.0, 1.0, 0.0) : -vorn;
  vec3 c = vec3(0.0);
  if (uBuehne > 0.5) {
    vec3 raum = boden ? vec3(0.02, 0.018, 0.024) : vec3(0.014, 0.013, 0.02);
    float cosW = max(dot(nFlaeche, -normalize(dW)), 0.0);
    vec3 fl = flecken(normalize(dW)) * cosW * 9.0 / (abst * abst) * uFlecken;
    c = raum + fl;
    // Dunst um die Kugel
    vec2 c0 = insBild(uMitte);
    float rr = length((vUv - c0) * vec2(uAufl.x / uAufl.y, 1.0));
    c += vec3(0.07, 0.06, 0.08) * exp(-rr * rr / 0.05);
  }
  float a = uBuehne > 0.5 ? 1.0 : 0.0;
  if (g.a > 0.5) {
    // Normale an der Mitte der Kachel (über die Ableitungen zurückgerechnet), dazu eine kleine Verkippung je Kachel
    mat2 J = mat2(gx, gy);
    vec2 dpix = abs(determinant(J)) > 1e-10 ? inverse(J) * (vec2(0.5) - f) : vec2(0.0);
    if (length(dpix) > 60.0) dpix = vec2(0.0);
    vec4 nM = texture(tNormal, (gl_FragCoord.xy + dpix) / uAufl);
    vec3 nT = nM.a > 0.5 ? normalize(nM.xyz) : g.n;
    vec3 nK = normalize(nT + 0.035 * (hash33(vec3(zell, 2.0)) - 0.5));
    vec3 V = -blick;
    vec3 sp = club(reflect(-V, nK));
    float rand = min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y));
    float fuge = 1.0 - smoothstep(0.035, 0.075, rand);
    vec3 kc = sp * vec3(0.82, 0.84, 0.88) * (0.82 + 0.3 * hash12(zell + 9.0));
    // feine Patina: am Rand der Kachel etwas matter
    kc *= 1.0 - 0.25 * smoothstep(0.15, 0.06, rand);
    kc = mix(kc, vec3(0.012), fuge);
    c = mix(c, kc, maske);
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
  farbe = vec4(c * smoothstep(1.2, 5.0, l), 1.0);
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
    this.haupt = k.flaecheProgramm(HAUPT.replace('out vec4 farbe;', ''), { tNormal: { value: null }, tLage: { value: null }, tWeich: { value: null }, tHinten: { value: null }, uKacheln: { value: 1 }, uTempo: { value: 1 }, uFarbig: { value: 1 }, uFlecken: { value: 1 } });
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
    { k: 'funkeln', name: 'Funkeln', min: 0, max: 3, schritt: 0.05, grund: 1 },
  ],
  bauen: (k) => new Diskokugel(k),
};
