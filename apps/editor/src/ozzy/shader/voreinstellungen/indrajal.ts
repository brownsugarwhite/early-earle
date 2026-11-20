/**
 * Indrajal (Spider-Verse, Mumbattan, Pavitr Prabhakar). Aus der Recherche: nach den Indrajal Comics der Siebziger, billig, eilig,
 * vereinfacht; pulpiges Papier, Druck außer Register, begrenzte Palette, die Linien tragen die Details, lockere Linien über die Kante
 * hinaus; warme Farbfamilie gegen kalte nach Entfernung; Figuren dunkel auf hell oder hell auf dunkel.
 *
 * Hier: drei flache Farben je Familie (vorn warm: Gold, Safran, Magenta; hinten kalt: Türkis, Blau, Indigo), um ein paar Bildpunkte
 * gegen die Tuscheplatte verschoben. Die Tusche trägt eine Gravur aus parallelen Schnitten durch die Form (sie biegen sich über die
 * Wölbung und werden im Schatten breiter), gekreuzt im tiefen Schatten, und einen doppelten, lockeren Umriss. Bühne: Strahlenkranz wie
 * auf einem Cover.
 */
import { bildVoreinstellung } from '../bildShader';

const FRAGMENT = /* glsl */ `
const vec3 GOLD = vec3(1.0, 0.82, 0.24);
const vec3 SAFRAN = vec3(0.97, 0.55, 0.13);
const vec3 MAGENTA = vec3(0.84, 0.12, 0.46);
const vec3 TUERKIS = vec3(0.16, 0.7, 0.68);
const vec3 BLAU = vec3(0.13, 0.43, 0.72);
const vec3 INDIGO = vec3(0.2, 0.15, 0.45);
const vec3 TUSCHE = vec3(0.13, 0.07, 0.12);
const vec3 PULP = vec3(0.95, 0.87, 0.7);

vec3 flachfarbe(GPunkt g, out float dunkel) {
  vec3 L = ausSicht(normalize(vec3(0.55, 0.7, 0.45)));
  float v = dot(g.n, L);
  float zFokus = length(uKamPos - uMitte);
  float fern = smoothstep(-0.25, 0.55, (g.z - zFokus) / uRadius);
  dunkel = clamp(0.5 - 0.62 * v, 0.0, 1.0);
  vec3 hell = mix(GOLD, TUERKIS, fern);
  vec3 mitte = mix(SAFRAN, BLAU, fern);
  vec3 tief = mix(MAGENTA, INDIGO, fern);
  return v > 0.42 ? hell : (v > -0.12 ? mitte : tief);
}

void main() {
  vec2 cssPx = gl_FragCoord.xy / uDpr;
  float t8 = schritt(8.0);
  GPunkt g = gLesen(vUv);
  float maske = deckungBei(vUv);
  // außer Register: die Farbplatte sitzt ein paar Bildpunkte neben der Tusche
  vec2 off = vec2(3.0, -2.2) * uR_register * uDpr / uAufl;
  GPunkt gf = gLesen(vUv + off);
  float maskeF = deckungBei(vUv + off);
  float dunkelF;
  vec3 flach = flachfarbe(gf, dunkelF);
  float dunkel;
  flachfarbe(g, dunkel);
  // Gravur: Schnitte durch die Form in zwei Richtungen, so breit wie es dunkel ist
  vec3 q = (g.p - uMitte) / uRadius;
  float dichte = 20.0 * uR_linien;
  float ph1 = dot(q, normalize(vec3(0.25, 1.0, 0.18))) * dichte + 0.35 * snoise(q * 2.0);
  float ph2 = dot(q, normalize(vec3(1.0, -0.25, -0.5))) * dichte * 1.1 + 0.35 * snoise(q * 2.3 + 4.0);
  float w1 = clamp(dunkel * 0.95 - 0.08, 0.0, 0.85);
  float w2 = clamp((dunkel - 0.55) * 1.6, 0.0, 0.7);
  float d1 = abs(fract(ph1) - 0.5) * 2.0;
  float d2 = abs(fract(ph2) - 0.5) * 2.0;
  float aa1 = fwidth(ph1) * 2.0 + 1e-4, aa2 = fwidth(ph2) * 2.0 + 1e-4;
  float gravur = max(1.0 - smoothstep(w1 - aa1, w1 + aa1, d1), 1.0 - smoothstep(w2 - aa2, w2 + aa2, d2)) * step(0.5, g.a);
  // Umriss doppelt und locker: zwei Striche mit eigenem Zittern, auf Dreiern
  vec2 z1 = (vec2(noise2(cssPx * 0.03 + t8 * 3.0), noise2(cssPx * 0.03 + 9.0 + t8 * 3.0)) - 0.5) * 3.0 * uDpr;
  vec2 z2 = (vec2(noise2(cssPx * 0.021 + 40.0 - t8 * 2.0), noise2(cssPx * 0.021 + 13.0 - t8 * 2.0)) - 0.5) * 4.0 * uDpr;
  float l1 = kanteBei(vUv + z1 / uAufl, (0.9 + 0.8 * noise2(cssPx * 0.02)) * uDpr);
  float l2 = kanteBei(vUv + z2 / uAufl, 0.6 * uDpr) * smoothstep(0.35, 0.7, noise2(cssPx * 0.012 + 3.0));
  float tusche = max(max(gravur, l1), l2 * 0.85);
  // pulpiges Papier: vergilbt, Fasern, Druckerschwärze-Flecken
  float korn = papier(cssPx * 1.1);
  float fleck = step(0.996, hash12(floor(cssPx / 1.5))) * 0.6;
  vec3 bild = PULP * korn * (1.0 - fleck * 0.5);
  if (uBuehne > 0.5) {
    vec2 c = insBild(uMitte) * uAufl / uDpr;
    vec2 d = cssPx - c;
    float w = atan(d.y, d.x) / 6.2831853;
    float strahl = step(0.5, fract(w * 22.0 + uZeit * 0.01));
    float nah = smoothstep(900.0, 100.0, length(d));
    vec3 kranz = mix(mix(SAFRAN, GOLD, strahl), mix(MAGENTA, SAFRAN, strahl), 1.0 - nah);
    bild *= mix(vec3(1.0), kranz, 0.82);
    // Raster im Kranz, zum Rand hin dichter
    bild *= mix(vec3(1.0), MAGENTA, punkt(cssPx, 0.35 * (1.0 - nah), radians(45.0), 7.0) * 0.6);
  }
  bild *= mix(vec3(1.0), flach, maskeF * 0.95);
  bild = mix(bild, TUSCHE, tusche * 0.92);
  float a = uBuehne > 0.5 ? 1.0 : clamp(max(max(maske, maskeF), tusche), 0.0, 1.0);
  farbe = vec4(bild * a, a);
}
`;

export const INDRAJAL = bildVoreinstellung({
  id: 'indrajal',
  name: 'Indrajal',
  gruppe: 'Spider-Verse',
  zeile: 'Mumbattan (Pavitr): Siebziger-Comicdruck auf pulpigem Papier, Gravur-Schraffur, warme und kalte Flachfarben außer Register',
  regler: [
    { k: 'register', name: 'Außer Register', min: 0, max: 3, schritt: 0.05, grund: 1 },
    { k: 'linien', name: 'Gravurdichte', min: 0.3, max: 2.5, schritt: 0.05, grund: 1 },
  ],
  fragment: FRAGMENT,
  unruhig: () => true,
});
