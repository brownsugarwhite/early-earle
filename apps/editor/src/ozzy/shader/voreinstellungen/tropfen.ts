/**
 * Tropfen (frei; Florian: „tropfend“). Flüssiges Metall (Chrom, mit dem Farbton auch Gold, Kupfer, Bonbonfarben): Die Haut der Form
 * fließt, Wellen und Rinnsale laufen in der Welt nach unten (die Normale wird mit wanderndem Rauschen gewellt), und von der Unterkante
 * hängen Tropfen: Jeder wächst, wird schwer, bekommt einen Kopf, reißt ab und fällt, der Rest zieht sich zurück. Die Tropfen sind im
 * Bild gerechnet (je Spalte ein Tropfen, er hängt an der Unterkante der Form über ihm) und als Zylinder und Kugeln beleuchtet, damit
 * sie wie das Metall der Form spiegeln. Bühne: ein dunkles Fotostudio mit Softboxen (das Metall braucht etwas zum Spiegeln).
 */
import { bildVoreinstellung } from '../bildShader';

const FRAGMENT = /* glsl */ `
vec3 metallFarbe() {
  // Farbton 0: Chrom; sonst eine Metallfarbe aus dem Farbkreis (Gold bei rund 40°)
  if (abs(uR_farbton) < 1.0) return vec3(0.92, 0.93, 0.95);
  return mix(vec3(0.95), hsv(vec3(fract(uR_farbton / 360.0), 0.62, 1.0)), 0.9);
}
vec3 metall(vec3 n, vec3 V) {
  vec3 R = reflect(-V, n);
  vec3 F0 = metallFarbe();
  float nv = clamp(dot(n, V), 0.0, 1.0);
  vec3 F = F0 + (1.0 - F0) * pow(1.0 - nv, 5.0);
  return studio(R) * F;
}
/** Abdeckung und Normale (Sicht) eines hängenden Tropfens an dieser Spalte, falls einer hier ist */
float tropfenHier(vec2 css, out vec3 nSicht) {
  nSicht = vec3(0.0, 0.0, 1.0);
  float breite = 12.0;
  float spalte = floor(css.x / breite);
  float h = hash11(spalte * 1.71 + 0.3);
  if (h < 0.45) return 0.0;
  float mitteX = (spalte + 0.25 + 0.5 * hash11(spalte * 4.3)) * breite;
  float takt = 0.11 + 0.08 * hash11(spalte * 9.1);
  float ph = fract(uZeit * takt * uR_zaeh + h * 7.0);
  float lang = (45.0 + 160.0 * hash11(spalte * 2.9)) * uR_tropfen;
  float jetzt = lang * smoothstep(0.0, 0.72, ph);
  float w0 = 2.4 + 2.2 * hash11(spalte * 5.7);
  // nach oben die Unterkante der Form suchen
  float oben = -1.0;
  for (int i = 0; i <= 18; i++) {
    float dy = float(i) / 18.0 * (lang + 30.0);
    vec2 q = vec2(mitteX, css.y + dy) * uDpr / uAufl;
    if (texture(tNormal, q).a > 0.5) { oben = dy; break; }
  }
  if (oben < 0.0) return 0.0;
  float dx = css.x - mitteX;
  float deckung = 0.0;
  // hängender Faden mit Kopf
  if (ph < 0.78) {
    float rest = oben / max(jetzt, 1e-3);
    if (rest <= 1.0) {
      float kopf = (1.5 + 3.5 * smoothstep(0.3, 0.72, ph)) * w0 * 0.55;
      float w = mix(w0 * 1.6, w0 * 0.6, smoothstep(0.0, 0.6, rest));
      float u = dx / w;
      if (abs(u) < 1.0) { deckung = 1.0; nSicht = vec3(u, 0.15, sqrt(1.0 - u * u)); }
      // der Kopf am Ende (eine Kugel)
      vec2 k = vec2(dx, oben - jetzt + kopf * 0.6);
      float kr = length(k) / kopf;
      if (kr < 1.0) { deckung = 1.0; nSicht = vec3(k.x / kopf, -k.y / kopf, sqrt(1.0 - kr * kr)); }
    }
  } else {
    // abgerissen: der Kopf fällt, der Faden zieht sich zurück
    float tau = (ph - 0.78) / (1.0 - 0.78);
    float rueck = lang * (1.0 - tau) * 0.35;
    float rest = oben / max(rueck, 1e-3);
    if (rest <= 1.0) {
      float w = mix(w0 * 1.4, w0 * 0.5, rest);
      float u = dx / w;
      if (abs(u) < 1.0) { deckung = 1.0; nSicht = vec3(u, 0.15, sqrt(1.0 - u * u)); }
    }
    float kopf = 5.0 * w0 * 0.55;
    float fall = lang + 900.0 * tau * tau;
    vec2 k = vec2(dx, oben - fall);
    float kr = length(k * vec2(1.0, 0.85 + 0.15 * tau)) / kopf;
    if (kr < 1.0) { deckung = 1.0; nSicht = vec3(k.x / kopf, -k.y / kopf, sqrt(max(0.0, 1.0 - kr * kr))); }
  }
  return deckung;
}
void main() {
  vec2 css = gl_FragCoord.xy / uDpr;
  float t = uZeit;
  GPunkt g = gLesen(vUv);
  float maske = deckungBei(vUv);
  // Bühne: dunkles Studio, der Blick fällt auf eine Wand mit weichem Licht
  vec3 sicht = blickDurch(vUv);
  vec2 qb = gl_FragCoord.xy / uAufl;
  vec3 grund = uBuehne > 0.5 ? mix(vec3(0.012, 0.012, 0.014), vec3(0.11, 0.115, 0.125), smoothstep(0.0, 1.0, qb.y)) + vec3(0.1) * exp(-pow((qb.y - 0.62) * 5.0, 2.0)) * 0.3 : vec3(0.0);
  vec3 bild = grund;
  float a = uBuehne > 0.5 ? 1.0 : 0.0;
  if (g.a > 0.5) {
    vec3 V = zumAuge(g.p);
    vec3 q = (g.p - uMitte) / uRadius;
    // Fließen: Wellen laufen nach unten, Rinnsale als senkrechte Wülste
    float zt = t * 0.55 * uR_zaeh;
    vec3 fq = vec3(q.x * 5.0, q.y * 3.0 + zt * 2.2, q.z * 5.0);
    float e = 0.03;
    float n0 = snoise(fq);
    vec3 bump = vec3(snoise(fq + vec3(e, 0.0, 0.0)) - n0, snoise(fq + vec3(0.0, e, 0.0)) - n0, snoise(fq + vec3(0.0, 0.0, e)) - n0) / e;
    vec3 rq = vec3(q.x * 13.0, q.y * 1.6 + zt * 1.4, q.z * 13.0);
    float r0 = snoise(rq);
    vec3 rinne = vec3(snoise(rq + vec3(e, 0.0, 0.0)) - r0, 0.0, snoise(rq + vec3(0.0, 0.0, e)) - r0) / e;
    vec3 n = normalize(g.n + 0.05 * bump + 0.06 * rinne * smoothstep(0.1, 0.6, r0));
    bild = mix(bild, metall(n, V), maske);
    a = max(a, maske);
  }
  // Tropfen unter der Form
  vec3 nS;
  float tr = maske < 0.5 ? tropfenHier(css, nS) : 0.0;
  if (tr > 0.0) {
    vec3 n = normalize((uViewInv * vec4(nS, 0.0)).xyz);
    vec3 V = -blickDurch(vUv);
    bild = metall(n, V);
    a = 1.0;
  }
  vec3 aus = linZuSrgb(aces(bild * 1.05));
  farbe = vec4(aus * a, a);
}
`;

export const TROPFEN = bildVoreinstellung({
  id: 'tropfen',
  name: 'Tropfen',
  gruppe: 'Frei',
  zeile: 'Flüssiges Metall: die Haut fließt nach unten, Tropfen wachsen, reißen ab und fallen (Farbton 0 ist Chrom)',
  regler: [
    { k: 'farbton', name: 'Farbton', min: 0, max: 360, schritt: 1, grund: 0 },
    { k: 'tropfen', name: 'Tropfen', min: 0, max: 2, schritt: 0.05, grund: 1 },
    { k: 'zaeh', name: 'Fließen', min: 0, max: 3, schritt: 0.05, grund: 1 },
  ],
  fragment: FRAGMENT,
});
