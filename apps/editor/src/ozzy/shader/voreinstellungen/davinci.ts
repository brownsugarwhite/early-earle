/**
 * Da Vinci (Spider-Verse, Vulture aus der Renaissance-Welt). Aus der Recherche: Skizze auf Pergament über einem 3D-Modell, rund vier
 * Schichten Linien, auch außerhalb des Körpers; das Papier aus überblendeten Projektionen, damit es nicht aufgeklebt wirkt; Flügel
 * flackern wie ein Daumenkino, leicht von hinten durchleuchtet.
 *
 * Hier: Sepia auf gealtertem Pergament (Flecken, Stockflecken, verbrannte Ränder). Schraffur linkshändig wie Leonardo (von links oben
 * nach rechts unten), dicht nach dem Schatten, gebogen mit der Form; im tiefsten Schatten gekreuzt. Weißhöhungen im Licht. Um die
 * Form Konstruktion: Kreis und Quadrat wie beim vitruvianischen Menschen, Achsen, Maßstriche, Zeilen in Spiegelschrift. Die Linien
 * flackern auf Dreiern, das Papier leuchtet hinter der Form warm durch.
 */
import { bildVoreinstellung } from '../bildShader';

const FRAGMENT = /* glsl */ `
const vec3 PERGAMENT = vec3(0.89, 0.8, 0.62);
const vec3 SEPIA = vec3(0.32, 0.19, 0.1);
const vec3 KREIDE = vec3(0.99, 0.96, 0.88);

float strichAbstand(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

/** Spiegelschrift: Zeilen aus kleinen Schleifen und Haken, von rechts nach links */
float schrift(vec2 p, float seed) {
  float zeile = floor(p.y / 11.0);
  vec2 q = vec2(-p.x, fract(p.y / 11.0) * 11.0 - 5.5);
  float zeichen = floor(q.x / 6.0);
  vec2 f = vec2(fract(q.x / 6.0) * 6.0 - 3.0, q.y);
  float h = hash12(vec2(zeichen, zeile + seed));
  float bogen = abs(length(f * vec2(1.0, 0.8 + h)) - 2.2 - h) - 0.35;
  float stab = abs(f.x - (h - 0.5) * 2.0) - 0.3;
  float d = h < 0.5 ? bogen : max(stab, abs(f.y) - 3.5 * h - 1.0);
  float wort = step(0.25, noise2(vec2(zeichen * 0.35, zeile * 3.0 + seed)));
  return (1.0 - smoothstep(0.0, 0.9, d)) * wort;
}

void main() {
  vec2 cssPx = gl_FragCoord.xy / uDpr;
  float t8 = schritt(8.0);
  GPunkt g = gLesen(vUv);
  float maske = deckungBei(vUv);
  vec3 L = ausSicht(normalize(vec3(-0.55, 0.7, 0.45)));
  float v = dot(g.n, L);
  // Pergament: zwei überblendete Lagen (nicht aufgeklebt), Flecken, Stockflecken, Rand
  vec2 q = gl_FragCoord.xy / uAufl;
  vec2 drift = vec2(sin(uZeit * 0.13), cos(uZeit * 0.11)) * 6.0;
  float p1 = papier(cssPx * 0.9 + drift), p2 = papier(cssPx * 0.9 - drift + 40.0);
  vec3 bild = PERGAMENT * mix(p1, p2, 0.5 + 0.5 * sin(uZeit * 0.4));
  float wolke = fbm2(cssPx * 0.004 + 3.0);
  bild *= 1.0 - 0.16 * smoothstep(0.45, 0.8, wolke);
  float stock = smoothstep(0.82, 0.86, fbm2(cssPx * 0.03 + 9.0));
  bild *= 1.0 - 0.22 * stock;
  float r = length((q - 0.5) * vec2(1.0, uAufl.y / uAufl.x)) * 1.6;
  bild *= mix(1.0, 0.55, smoothstep(0.55, 1.05, r + 0.08 * fbm2(cssPx * 0.01)));
  // durchleuchtet: hinter der Form wird das Papier warm heller
  float weich = texture(tWeich, vUv).r;
  bild *= 1.0 + 0.12 * weich * uBuehne;
  // Schraffur: linkshändig, mit der Form gebogen, gekreuzt im tiefen Schatten
  vec2 j = (hash22(vec2(t8, 1.0)) - 0.5) * 1.6;
  vec2 biege = (uView * vec4(g.n, 0.0)).xy * 9.0;
  float dunkel = clamp(0.58 - 0.85 * v, 0.0, 1.0) * maske;
  float s1 = schraffur(cssPx + biege + j, dunkel * 0.85, radians(-45.0), 3.4);
  float s2 = schraffur(cssPx - biege * 0.6 + j, smoothstep(0.45, 0.9, dunkel) * 0.65, radians(30.0), 4.0);
  float strichNoise = 0.7 + 0.3 * noise2(cssPx * vec2(0.6, 0.05) + t8);
  float tinte = max(s1, s2) * strichNoise;
  // Weißhöhung im Licht
  vec3 V = zumAuge(g.p);
  float hoch = smoothstep(0.55, 0.85, dot(g.n, normalize(L + V))) * maske;
  float kreide = schraffur(cssPx + j * 2.0, hoch * 0.6, radians(-45.0), 3.0);
  // Kontur: vier Lagen, auf Dreiern neu gezogen
  float linie = 0.0;
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    vec2 z = (vec2(noise2(cssPx * 0.02 + t8 * 2.0 + fi * 13.0), noise2(cssPx * 0.02 + 21.0 + t8 * 2.0 - fi * 5.0)) - 0.5) * (2.0 + fi * 2.5) * uDpr;
    linie = max(linie, kanteBei(vUv + z / uAufl, (0.55 + 0.22 * fi) * uDpr) * (1.0 - 0.17 * fi));
  }
  // Konstruktion um die Form: Kreis, Quadrat, Achsen, Maßstriche, Schrift
  float bau = 0.0;
  if (uBuehne > 0.5) {
    vec2 c = insBild(uMitte) * uAufl / uDpr;
    vec3 rand3 = uMitte + ausSicht(vec3(1.0, 0.0, 0.0)) * uRadius;
    float rad = length(insBild(rand3) * uAufl / uDpr - c) * 1.12;
    vec2 d = cssPx - c;
    float kreis = abs(length(d) - rad);
    float quadrat = abs(max(abs(d.x), abs(d.y)) - rad * 0.86);
    float achse = min(abs(d.x), abs(d.y)) + step(rad * 1.25, max(abs(d.x), abs(d.y))) * 99.0;
    float mass = step(abs(d.y), 4.0) * step(fract(d.x / 18.0), 0.06) * step(abs(d.x), rad * 1.2);
    bau = max(max(1.0 - smoothstep(0.3, 1.0, kreis), 1.0 - smoothstep(0.3, 1.0, quadrat)) * 0.7, (1.0 - smoothstep(0.2, 0.7, achse)) * 0.35 * step(0.5, fract(length(d) / 9.0)));
    bau = max(bau, mass * 0.6);
    // Spiegelschrift rechts oben und links unten
    vec2 s1p = d - vec2(rad * 1.15, rad * 0.55);
    vec2 s2p = d + vec2(rad * 1.6, rad * 0.45);
    float sch = schrift(s1p, 1.0) * step(0.0, s1p.x) * step(s1p.x, 170.0) * step(-50.0, s1p.y) * step(s1p.y, 10.0);
    sch = max(sch, schrift(s2p, 2.0) * step(0.0, s2p.x) * step(s2p.x, 150.0) * step(-40.0, s2p.y) * step(s2p.y, 10.0));
    bau = max(bau, sch * 0.8);
    bau *= 1.0 - maske;
  }
  bild = mix(bild, SEPIA, clamp(tinte * 0.95 + linie + bau * 0.75, 0.0, 1.0));
  bild = mix(bild, KREIDE, kreide * 0.75);
  float a = uBuehne > 0.5 ? 1.0 : clamp(max(maske, max(linie, bau)), 0.0, 1.0);
  farbe = vec4(bild * a, a);
}
`;

export const DAVINCI = bildVoreinstellung({
  id: 'davinci',
  name: 'Da Vinci',
  gruppe: 'Spider-Verse',
  zeile: 'Vulture (Renaissance): Sepia auf Pergament, linkshändige Schraffur, Weißhöhung, Konstruktion und Spiegelschrift, Daumenkino',
  regler: [],
  fragment: FRAGMENT,
  weich: { skala: 0.25, radius: 16 },
});
