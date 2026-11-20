/**
 * Tintenfleck (Spider-Verse, The Spot). Aus der Recherche: skizzenhafte Bleistiftlinien, weiße Acrylfarbe, Massen von Tintenflecken;
 * fließendes Aquarell, tropfende Farbe, blutende Tinte; „MaskToInk“ macht aus einer Maske nasse Tinte, die je nach Nässe der Fläche
 * ausläuft; er hinterlässt Tropfen, wenn er sich bewegt.
 *
 * Hier: eine weiße Form mit Bleistiftlinien, die auf Zweiern neu gezogen werden, und grauer Schraffur im Schatten. Darauf schwarze
 * Flecken (an der Form verankert), deren Rand wie nasse Tinte in Fasern ausläuft; unten laufen sie als Tropfen herab. Jeder Fleck ist
 * ein Loch: tief darin dreht sich eine andere Welt (Farbschleier und Sterne, mit Parallaxe). Die Flecken atmen langsam; auf der Bühne
 * liegen Spritzer und schwebende Portale.
 */
import { bildVoreinstellung } from '../bildShader';

const FRAGMENT = /* glsl */ `
const vec3 TINTE = vec3(0.025, 0.025, 0.035);
const vec3 PAPIER = vec3(0.975, 0.97, 0.955);

/** Fleck an einer Lage der Form: Abstand zum Rand (< 0 innen), Kennung */
vec2 fleck(vec3 p, float t) {
  vec3 q = (p - uMitte) / uRadius * 2.3 * uR_dichte;
  vec3 vo = voronoi3(q);
  float r = 0.22 + 0.24 * hash11(vo.z * 13.0) + 0.07 * sin(t * (0.4 + vo.z) + vo.z * 30.0) * uR_atmen;
  r *= step(0.22, hash11(vo.z * 7.0 + 1.0));
  float rand = vo.x + 0.07 * snoise(q * 3.5 + 2.0) + 0.03 * snoise(q * 9.0);
  return vec2(rand - r, vo.z);
}

/** die Welt hinter dem Loch: Schleier und Sterne, mit Tiefe */
vec3 jenseits(vec2 p, float id, float t) {
  vec3 c = vec3(0.0);
  for (int i = 0; i < 3; i++) {
    float tiefe = 1.0 + float(i) * 0.8;
    vec2 q = p / tiefe + vec2(id * 40.0, float(i) * 7.0);
    float w = fbm2(q * 0.012 + t * 0.03);
    vec3 farbeI = i == 0 ? vec3(0.15, 0.25, 0.9) : (i == 1 ? vec3(0.8, 0.15, 0.7) : vec3(0.1, 0.8, 0.75));
    c += farbeI * pow(w, 3.0) * 0.55 / tiefe;
    float stern = step(0.993, hash12(floor(q * 0.6)));
    c += vec3(0.9) * stern * (0.5 + 0.5 * sin(t * 3.0 + hash12(floor(q * 0.6)) * 20.0)) / tiefe;
  }
  return c;
}

void main() {
  vec2 cssPx = gl_FragCoord.xy / uDpr;
  float t = uZeit;
  float t12 = schritt(12.0);
  GPunkt g = gLesen(vUv);
  float maske = deckungBei(vUv);
  vec3 L = ausSicht(normalize(vec3(-0.5, 0.65, 0.55)));
  float v = dot(g.n, L);
  vec3 bild = PAPIER * papier(cssPx * 1.2);
  // graue Bleistiftschraffur im Schatten (links geführt, auf Zweiern neu)
  vec2 j = (hash22(vec2(t12, 3.0)) - 0.5) * 2.0;
  float schatten = smoothstep(0.2, -0.45, v) * maske;
  float sch = schraffur(cssPx + j, schatten * 0.55, radians(-50.0), 4.0) * (0.6 + 0.4 * noise2(cssPx * 0.1 + t12));
  bild = mix(bild, vec3(0.5, 0.5, 0.53), sch * 0.55);
  // Flecken: nasse Tinte mit Fasern am Rand
  vec2 f = fleck(g.p, t);
  float faser = (fbm2(cssPx * 0.6 + f.y * 20.0) - 0.5) * 0.05 + (noise2(vec2(cssPx.x * 0.9, cssPx.y * 0.15) + f.y) - 0.5) * 0.03;
  float innen = smoothstep(0.012, -0.006, f.x + faser) * maske;
  float ausgelaufen = smoothstep(0.05, 0.0, f.x + faser * 2.2) * (1.0 - innen) * maske * 0.55;
  // Tropfen: unter einem Fleck nach unten (oberhalb in der Welt suchen)
  float tropfen = 0.0;
  vec3 unten = ausSicht(vec3(0.0, -1.0, 0.0));
  for (int i = 1; i <= 5; i++) {
    float d = float(i) / 5.0;
    vec2 ff = fleck(g.p - unten * d * 0.22 * uRadius * uR_tropfen, t);
    float spur = smoothstep(0.02, -0.01, ff.x + abs(fract(dot(g.p, vec3(0.37, 0.0, 0.53)) / uRadius * 18.0 + ff.y * 9.0) - 0.5) * 0.25 * d);
    tropfen = max(tropfen, spur * (1.0 - d * 0.6) * step(0.55, hash11(ff.y * 5.0)));
  }
  tropfen *= maske;
  float schwarz = max(innen, tropfen);
  // im Loch die andere Welt, verschoben mit der Blickrichtung (Tiefe)
  vec3 V = zumAuge(g.p);
  vec2 tiefe = (uView * vec4(V, 0.0)).xy * 60.0;
  vec3 welt = jenseits(cssPx + tiefe * (1.0 - innen * 0.5), f.y, t) * smoothstep(0.0, -0.06, f.x) * uR_portal;
  bild = mix(bild, TINTE, ausgelaufen);
  bild = mix(bild, TINTE + welt, schwarz);
  // Bleistift: mehrere Striche, die über die Kante schießen, auf Zweiern neu gezogen
  float linie = 0.0;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    vec2 z = (vec2(noise2(cssPx * 0.025 + t12 * 4.0 + fi * 11.0), noise2(cssPx * 0.025 + 33.0 + t12 * 4.0 + fi * 7.0)) - 0.5) * (3.0 + fi * 2.0) * uDpr;
    linie = max(linie, kanteBei(vUv + z / uAufl, (0.45 + 0.25 * fi) * uDpr) * (0.75 - 0.2 * fi));
  }
  bild = mix(bild, vec3(0.16, 0.16, 0.18), linie);
  // Bühne: Spritzer und schwebende Portale
  float a = 1.0;
  if (uBuehne > 0.5) {
    vec3 bv = voronoi2(cssPx / 140.0);
    float portal = step(0.86, bv.z) * smoothstep(0.24, 0.18, bv.x + 0.05 * fbm2(cssPx * 0.08));
    // Spritzer in Gruppen um wenige Mitten, groß und klein
    vec3 sv = voronoi2(cssPx / 260.0 + 11.0);
    float gruppe = step(0.62, sv.z) * smoothstep(0.55, 0.1, sv.x);
    vec2 zelle = floor(cssPx / 7.0);
    float punktR = 0.6 + 2.6 * pow(hash12(zelle + 3.0), 3.0);
    float spritzer = gruppe * step(0.9, hash12(zelle)) * step(length(fract(cssPx / 7.0) * 7.0 - 3.5 - (hash22(zelle) - 0.5) * 3.0), punktR);
    vec3 grund = PAPIER * papier(cssPx * 1.2);
    grund = mix(grund, TINTE + jenseits(cssPx * 0.7, bv.z, t) * 0.8, portal);
    grund = mix(grund, TINTE, spritzer * 0.85);
    bild = mix(grund, bild, max(maske, linie));
  } else {
    a = max(maske, linie);
  }
  farbe = vec4(bild * a, a);
}
`;

export const TINTENFLECK = bildVoreinstellung({
  id: 'tintenfleck',
  name: 'Tintenfleck',
  gruppe: 'Spider-Verse',
  zeile: 'The Spot: weiße Form mit Bleistift, nasse Tintenflecken als Portale in eine andere Welt, Tropfen, Spritzer',
  regler: [
    { k: 'dichte', name: 'Flecken', min: 0.4, max: 3, schritt: 0.05, grund: 1 },
    { k: 'atmen', name: 'Atmen', min: 0, max: 2, schritt: 0.05, grund: 1 },
    { k: 'tropfen', name: 'Tropfen', min: 0, max: 2, schritt: 0.05, grund: 1 },
    { k: 'portal', name: 'Portal', min: 0, max: 2, schritt: 0.05, grund: 1 },
  ],
  fragment: FRAGMENT,
});
