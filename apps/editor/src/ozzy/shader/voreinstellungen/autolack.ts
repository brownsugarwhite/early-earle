/**
 * Autolack (Materialien; Florian: „eine extrem aufwändige autolakierung“). Gebaut wie echter Lack, Schicht für Schicht:
 * - **Grundlack** mit Perl-Farbwechsel: die Farbe kippt mit dem Blickwinkel (Flip-Flop), gespiegelt wird das Studio weich (fünf
 *   Abtastungen um die Spiegelrichtung, ein Metallic-Grundlack ist matt-glänzend).
 * - **Metallflitter:** winzige Plättchen, je Zelle eines feinen Rasters an der Form mit eigener Neigung; jedes spiegelt das Studio für
 *   sich, nur die, die gerade eine Softbox treffen, funkeln. Die Rastergröße folgt dem Bildpunkt (in Zweierpotenzen), damit die Flitter
 *   ein bis zwei Bildpunkte groß sind und nicht flimmern.
 * - **Klarlack** obenauf: scharfe Spiegelung mit Fresnel (F0 0,04), auf einer leicht welligen Normalen (Orangenhaut).
 * - **Autostudio:** lange Lichtbänder an der Decke, seitliche Softboxen, eine leuchtende Hohlkehle, dunkler Boden: Das sind die
 *   Streifen, die über einen Lack laufen.
 */
import { bildVoreinstellung } from '../bildShader';

const FRAGMENT = /* glsl */ `
vec3 autostudio(vec3 d) {
  float y = d.y;
  vec3 c = mix(vec3(0.012, 0.012, 0.014), vec3(0.05, 0.052, 0.058), smoothstep(-0.25, 0.35, y));
  // Deckenbänder: Ebene y = 1, drei lange Streifen
  if (y > 0.05) {
    vec2 p = d.xz / y;
    for (int i = 0; i < 3; i++) {
      float z = -0.55 + 0.55 * float(i);
      float band = (1.0 - smoothstep(0.07, 0.085, abs(p.y - z))) * (1.0 - smoothstep(1.6, 1.8, abs(p.x)));
      c += vec3(5.5, 5.4, 5.2) * band;
    }
  }
  // Softboxen seitlich
  c += vec3(3.0, 3.1, 3.3) * softbox(d, normalize(vec3(-1.0, 0.25, 0.3)), vec3(0.0, 1.0, 0.0), vec2(0.14, 0.5), 0.03);
  c += vec3(2.4, 2.3, 2.2) * softbox(d, normalize(vec3(1.0, 0.18, -0.4)), vec3(0.0, 1.0, 0.0), vec2(0.1, 0.42), 0.03);
  // Hohlkehle: heller Horizont
  c += vec3(0.7, 0.72, 0.78) * exp(-pow((y + 0.02) * 22.0, 2.0)) * 0.8;
  return c;
}
void main() {
  vec2 css = gl_FragCoord.xy / uDpr;
  GPunkt g = gLesen(vUv);
  float maske = deckungBei(vUv);
  vec3 blick = blickDurch(vUv);
  vec2 qb = gl_FragCoord.xy / uAufl;
  // Bühne: dunkles Studio, Boden mit weichem Schatten
  vec3 grund = mix(vec3(0.03, 0.031, 0.034), vec3(0.11, 0.115, 0.125), smoothstep(0.05, 0.75, qb.y));
  grund += vec3(0.07) * exp(-pow((qb.y - 0.33) * 9.0, 2.0));
  float sch = texture(tWeich, vUv + vec2(0.0, 0.05)).r;
  grund *= 1.0 - 0.7 * sch * smoothstep(0.45, 0.2, qb.y);
  vec3 bild = srgbZuLin(grund);
  float a = uBuehne > 0.5 ? 1.0 : 0.0;
  if (g.a > 0.5) {
    vec3 V = -blick;
    vec3 n = g.n;
    vec3 q = (g.p - uMitte) / uRadius;
    float nv = clamp(dot(n, V), 0.0, 1.0);
    // Grundlack mit Farbwechsel
    float hue = uR_farbton / 360.0;
    vec3 vorn = hsv(vec3(fract(hue), 0.92, 0.75));
    vec3 kipp = hsv(vec3(fract(hue + uR_flip * 0.12), 0.95, 0.35));
    vec3 lack = srgbZuLin(mix(vorn, kipp, pow(1.0 - nv, 1.4)));
    vec3 R = reflect(-V, n);
    vec3 t1 = normalize(cross(n, vec3(0.0, 1.0, 0.0001)));
    vec3 t2 = cross(n, t1);
    vec3 weich = autostudio(R) * 0.4;
    weich += autostudio(normalize(R + t1 * 0.25)) * 0.15 + autostudio(normalize(R - t1 * 0.25)) * 0.15;
    weich += autostudio(normalize(R + t2 * 0.25)) * 0.15 + autostudio(normalize(R - t2 * 0.25)) * 0.15;
    vec3 grundlack = lack * (0.08 + weich * 0.55);
    // Metallflitter: Rastergröße so, dass eine Zelle 1 bis 2 Bildpunkte deckt
    float fw = max(length(fwidth(g.p)) / uRadius, 1e-5);
    float k = exp2(floor(log2(clamp(0.6 / fw, 64.0, 4096.0))));
    vec3 zelle = floor(q * k);
    vec3 zufall = hash33(zelle);
    vec3 nf = normalize(n + (zufall * 2.0 - 1.0) * 0.4);
    vec3 Rf = reflect(-V, nf);
    float funkeln = smoothstep(1.2, 3.5, luma(autostudio(Rf))) * step(0.35, hash13(zelle + 7.0));
    vec3 flitter = mix(vec3(1.0), lack * 2.0, 0.35) * funkeln * uR_flitter * 1.8;
    // Klarlack auf welliger Normale (Orangenhaut)
    float e = 0.004;
    vec3 oq = q * 70.0;
    float o0 = snoise(oq);
    vec3 orange = vec3(snoise(oq + vec3(e * 70.0, 0.0, 0.0)) - o0, snoise(oq + vec3(0.0, e * 70.0, 0.0)) - o0, snoise(oq + vec3(0.0, 0.0, e * 70.0)) - o0);
    vec3 nc = normalize(n + orange * 0.035 * uR_orangenhaut);
    vec3 Rc = reflect(-V, nc);
    float F = fresnelS(max(dot(nc, V), 0.0), 0.04);
    vec3 klar = autostudio(Rc);
    vec3 c = (grundlack + flitter) * (1.0 - F) + klar * F;
    bild = mix(bild, c, maske);
    a = max(a, maske);
  }
  vec3 aus = linZuSrgb(aces(bild * 1.15));
  farbe = vec4(aus * a, a);
}
`;

export const AUTOLACK = bildVoreinstellung({
  id: 'autolack',
  name: 'Autolack',
  gruppe: 'Materialien',
  zeile: 'Lack in Schichten: Grundlack mit Perl-Farbwechsel, funkelnde Metallflitter, Klarlack mit Orangenhaut, Lichtbänder im Autostudio',
  regler: [
    { k: 'farbton', name: 'Farbton', min: 0, max: 360, schritt: 1, grund: 352 },
    { k: 'flip', name: 'Farbwechsel', min: -2, max: 2, schritt: 0.05, grund: -0.6 },
    { k: 'flitter', name: 'Flitter', min: 0, max: 2, schritt: 0.05, grund: 1 },
    { k: 'orangenhaut', name: 'Orangenhaut', min: 0, max: 3, schritt: 0.05, grund: 1 },
  ],
  fragment: FRAGMENT,
  weich: { skala: 0.25, radius: 14 },
  unruhig: () => false,
});
