/**
 * Aquarell (Spider-Verse, Earth-65, Gwen). Aus der Recherche: lockere Pinselführung, nasse Lasuren („wet on wet“), Farbe, die in das
 * Papier läuft, senkrechte Streifen wie auf Robbi Rodriguez' Covern, und eine Welt, die ihre Farben „wie ein Stimmungsring“ wechselt.
 *
 * Hier: drei Lasuren (hell über allem, Mitte auf der Schattenseite, dunkel im Kern), jede mit welligem Rand (die Grenze ist
 * verschoben, wie Wasser sie schiebt) und dunklerem Pigmentrand. Granulation im Papierkorn, Blüten (Rückläufer) mit hellem Inneren und
 * dunklem Saum, über den Umriss ausgelaufene Farbe, Tropfen, die von der Unterkante nach unten laufen, eine Bleistift-Vorzeichnung.
 * Die Palette wandert langsam durch Rosa, Türkis, Violett und Gelb.
 */
import { bildVoreinstellung } from '../bildShader';

const FRAGMENT = /* glsl */ `
// Paletten: Licht, Mitte, Schatten, Bühne (sRGB). Durchlass der Pigmente, nicht Farbe des Lichts
vec3 palette(int i, int teil) {
  if (i == 0) { // Rosa (Gwens Anzug)
    if (teil == 0) return vec3(0.98, 0.78, 0.86); if (teil == 1) return vec3(0.86, 0.55, 0.85); if (teil == 2) return vec3(0.42, 0.33, 0.66); return vec3(0.99, 0.86, 0.9);
  }
  if (i == 1) { // Türkis
    if (teil == 0) return vec3(0.74, 0.95, 0.93); if (teil == 1) return vec3(0.42, 0.78, 0.86); if (teil == 2) return vec3(0.26, 0.36, 0.62); return vec3(0.84, 0.97, 0.95);
  }
  if (i == 2) { // Violett
    if (teil == 0) return vec3(0.86, 0.82, 0.99); if (teil == 1) return vec3(0.66, 0.55, 0.93); if (teil == 2) return vec3(0.33, 0.24, 0.55); return vec3(0.9, 0.87, 1.0);
  }
  // Gelb
  if (teil == 0) return vec3(1.0, 0.93, 0.7); if (teil == 1) return vec3(0.99, 0.7, 0.6); if (teil == 2) return vec3(0.6, 0.32, 0.5); return vec3(1.0, 0.95, 0.8);
}
vec3 stimmung(int teil, float t) {
  float s = fract(t) * 4.0;
  int a = int(floor(s));
  float f = smoothstep(0.55, 1.0, fract(s));
  return mix(palette(a, teil), palette((a + 1) % 4, teil), f);
}
/** eine Lasur: Pigment legen (subtraktiv); d = Dichte */
vec3 lasur(vec3 grund, vec3 pigment, float d) { return grund * mix(vec3(1.0), pigment, clamp(d, 0.0, 1.0)); }

void main() {
  vec2 cssPx = gl_FragCoord.xy / uDpr;
  float t = uZeit;
  float tS = t * 0.025 * uR_stimmung;
  float korn = papier(cssPx * 1.3);
  float tal = smoothstep(0.98, 0.9, korn);
  // Wasser schiebt die Grenzen: das Licht an einer verschobenen Stelle lesen
  vec2 fluss = vec2(fbm2(cssPx * 0.011 + vec2(t * 0.03, 0.0)), fbm2(cssPx * 0.011 + vec2(5.2, t * 0.025))) - 0.5;
  vec2 versatz = fluss * 22.0 * uDpr / uAufl;
  GPunkt g = gLesen(vUv + versatz);
  GPunkt g0 = gLesen(vUv);
  float maske = deckungBei(vUv);
  vec3 L = ausSicht(normalize(vec3(-0.6, 0.62, 0.45)));
  float v = dot(g.n, L);
  // nass: die weiche Maske mit Rauschen gibt den Rand der Lasur, über den Umriss hinaus
  float weich = texture(tWeich, vUv).r;
  float rand = fbm2(cssPx * 0.035 + 3.0) * 0.55 + fbm2(cssPx * 0.12) * 0.25;
  float nass = smoothstep(0.42, 0.5, weich + (rand - 0.42) * 0.55 * uR_nass + 0.08 * uR_nass);
  float innen = max(maske, nass);
  // Lasur 1: hell, über allem, was nass ist; dunkler Saum am Rand (Pigment wandert an die Kante)
  float saum1 = smoothstep(0.3, 0.0, abs(weich + (rand - 0.42) * 0.55 * uR_nass + 0.08 * uR_nass - 0.46) * 9.0) * nass;
  // Lasur 2 und 3: Schattenseite und Kern, Ränder mit Abstand in Bildpunkten
  float s2 = 0.18 + 0.08 * (fbm2(cssPx * 0.02 + 9.0) - 0.5);
  float s3 = -0.32 + 0.1 * (fbm2(cssPx * 0.025 + 2.0) - 0.5);
  float fw = max(fwidth(v), 1e-3);
  float d2 = (s2 - v) / fw;
  float d3 = (s3 - v) / fw;
  float c2 = smoothstep(-1.0, 1.0, d2) * step(0.5, g.a) * maske;
  float c3 = smoothstep(-1.0, 1.0, d3) * step(0.5, g.a) * maske;
  float rand2 = c2 * exp(-max(d2, 0.0) / (3.5 * uDpr));
  float rand3 = c3 * exp(-max(d3, 0.0) / (3.0 * uDpr));
  // Blüten: Rückläufer, wo Wasser in halb trockene Farbe lief (an der Form verankert)
  vec3 bv = voronoi3((g0.p - uMitte) / uRadius * 2.2 + vec3(0.0, 0.0, floor(tS * 2.0)));
  float bluete = step(0.72, bv.z) * smoothstep(0.42, 0.18, bv.x + 0.08 * fbm2(cssPx * 0.3)) * maske;
  float bluetenRand = step(0.72, bv.z) * smoothstep(0.06, 0.0, abs(bv.x + 0.08 * fbm2(cssPx * 0.3) - 0.36)) * maske;
  // Tropfen: unter der Form laufen Farbstreifen nach unten, wachsen und reißen ab
  float spalte = floor(cssPx.x / 9.0);
  float h = hash11(spalte * 1.37 + 0.5);
  float tropfen = 0.0;
  if (h > 0.55 && uR_tropfen > 0.0) {
    float mitteX = (spalte + 0.3 + 0.4 * hash11(spalte * 3.1)) * 9.0;
    float lang = (40.0 + 140.0 * hash11(spalte * 7.7)) * uR_tropfen * (0.35 + 0.65 * fract(t * (0.05 + 0.04 * h) + h));
    float breite = 1.1 + 1.6 * hash11(spalte * 2.3);
    // Quelle: wie weit oben die Lasur noch nass ist (in Schritten nach oben suchen)
    float oben = -1.0;
    for (int i = 1; i <= 14; i++) {
      float dy = float(i) / 14.0 * lang;
      vec2 q = (vec2(mitteX, cssPx.y + dy) * uDpr) / uAufl;
      if (texture(tWeich, q).r > 0.5) { oben = dy; break; }
    }
    if (oben > 0.0 && texture(tWeich, vUv).r < 0.5) {
      float rest = 1.0 - oben / max(lang, 1.0);
      float b = breite * (0.55 + 0.45 * rest) + 2.2 * smoothstep(0.12, 0.0, rest) * step(0.0, rest);
      tropfen = smoothstep(b + 0.8, b - 0.4, abs(cssPx.x - mitteX)) * smoothstep(0.0, 0.08, rest);
    }
  }
  // Palette dieses Moments
  vec3 p1 = stimmung(0, tS), p2 = stimmung(1, tS), p3 = stimmung(2, tS), pB = stimmung(3, tS);
  // Papier (kalt gepresst), auf der Bühne mit senkrechten Streifen in der Stimmung
  vec3 bild = vec3(0.995, 0.99, 0.975) * korn;
  if (uBuehne > 0.5) {
    float streifen = fbm2(vec2(cssPx.x * 0.011, cssPx.y * 0.0018 + t * 0.006));
    float wolke = fbm2(cssPx * 0.0032 + vec2(t * 0.006, 0.0));
    float bahn = smoothstep(0.5, 0.56, streifen);
    float bahnRand = smoothstep(0.5, 0.53, streifen) * (1.0 - smoothstep(0.53, 0.6, streifen));
    bild = lasur(bild, pB, 0.8 * smoothstep(0.2, 0.7, wolke) * (0.85 + 0.3 * tal));
    bild = lasur(bild, p2, (0.38 * bahn + 0.3 * bahnRand) * smoothstep(0.2, 0.6, wolke) * (0.85 + 0.3 * tal));
    bild = lasur(bild, p1, 0.4 * smoothstep(0.5, 0.75, fbm2(cssPx * 0.006 + 40.0)));
  }
  // Lasuren übereinander, mit Granulation in den Tälern des Papiers
  float gran = 1.0 + 0.9 * tal;
  bild = lasur(bild, p1, (0.95 + 0.3 * rand) * innen * gran + 0.6 * saum1);
  bild = lasur(bild, p1, 0.55 * innen * smoothstep(0.35, 0.75, fbm2(cssPx * 0.02 + t * 0.02)));
  bild = lasur(bild, pB * vec3(1.0, 0.85, 0.7), 0.5 * innen * smoothstep(0.45, 0.7, fbm2(cssPx * 0.008 + 17.0)) * smoothstep(0.0, 0.4, v));
  bild = lasur(bild, p2, (0.95 * c2 + 0.9 * rand2) * gran * (1.0 - 0.6 * bluete));
  bild = lasur(bild, p3, (0.95 * c3 + 0.8 * rand3) * gran * (1.0 - 0.5 * bluete));
  bild = lasur(bild, p2, 0.45 * bluetenRand);
  bild = lasur(bild, p2, 0.75 * tropfen);
  // Vorzeichnung: Bleistift, etwas daneben, auf Zweiern
  float t12 = schritt(12.0);
  vec2 zit = (vec2(noise2(cssPx * 0.04 + t12 * 2.0), noise2(cssPx * 0.04 + 7.0 + t12 * 2.0)) - 0.5) * 2.5 * uDpr;
  float linie = kanteBei(vUv + zit / uAufl, 0.55 * uDpr) * (0.55 + 0.45 * noise2(cssPx * 0.05));
  bild = mix(bild, bild * vec3(0.42, 0.42, 0.48), linie * 0.75);
  float a = uBuehne > 0.5 ? 1.0 : clamp(max(innen, max(tropfen, linie)), 0.0, 1.0);
  if (uBuehne < 0.5) bild = mix(vec3(1.0), bild, 1.0);
  farbe = vec4(bild * a, a);
}
`;

export const AQUARELL = bildVoreinstellung({
  id: 'aquarell',
  name: 'Aquarell',
  gruppe: 'Spider-Verse',
  zeile: 'Earth-65 (Gwen): nasse Lasuren mit Pigmenträndern, Blüten, ausgelaufene Farbe, Tropfen; Farben wie ein Stimmungsring',
  regler: [
    { k: 'stimmung', name: 'Stimmung', min: 0, max: 3, schritt: 0.05, grund: 1 },
    { k: 'nass', name: 'Nässe', min: 0, max: 2, schritt: 0.05, grund: 1 },
    { k: 'tropfen', name: 'Tropfen', min: 0, max: 2, schritt: 0.05, grund: 1 },
  ],
  fragment: FRAGMENT,
  weich: { skala: 0.25, radius: 9 },
});
