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

/** Fleck an einer Lage der Form: Abstand zum Rand (< 0 innen), Kennung; zwei Lagen, große und kleine */
vec2 fleck(vec3 p, float t) {
  vec3 q = (p - uMitte) / uRadius * 3.4 * uR_dichte;
  vec3 vo = voronoi3(q);
  float r = 0.16 + 0.26 * hash11(vo.z * 13.0) + 0.06 * sin(t * (0.4 + vo.z) + vo.z * 30.0) * uR_atmen;
  r *= step(0.18, hash11(vo.z * 7.0 + 1.0));
  float rand = vo.x + 0.07 * snoise(q * 3.5 + 2.0) + 0.03 * snoise(q * 9.0);
  vec2 a = vec2(rand - r, vo.z);
  vec3 q2 = q * 2.6 + 19.0;
  vec3 vo2 = voronoi3(q2);
  float r2 = (0.12 + 0.18 * hash11(vo2.z * 17.0)) * step(0.45, hash11(vo2.z * 5.0 + 2.0));
  vec2 b = vec2((vo2.x + 0.05 * snoise(q2 * 2.0) - r2) / 2.6, vo2.z + 0.5);
  return a.x < b.x ? a : b;
}
/** Tusche, die aufschlägt: Klecks mit weichen Beulen, Satellitentropfen, Sprühnebel (in Bildpunkten) */
float spritzer(vec2 p, float seed, float dichte) {
  const float zell = 240.0;
  vec2 i = floor(p / zell);
  float best = 0.0;
  for (int y = -1; y <= 1; y++)
    for (int x = -1; x <= 1; x++) {
      vec2 z = i + vec2(float(x), float(y));
      float h = hash12(z + seed);
      if (h > dichte) continue;
      vec2 c = (z + 0.25 + 0.5 * hash22(z + seed * 3.1)) * zell;
      vec2 d = p - c;
      float dl = length(d);
      float r = zell * (0.025 + 0.13 * pow(hash12(z + 7.0 + seed), 2.0));
      if (dl > r * 5.0) continue;
      float w = atan(d.y, d.x);
      vec2 ws = vec2(cos(w), sin(w));
      float beule = 0.16 * snoise(vec3(ws * 1.3, h * 17.0)) + 0.07 * snoise(vec3(ws * 3.5, h * 5.0));
      float rr = r * (1.0 + beule);
      float klecks = 1.0 - smoothstep(rr - 0.9, rr + 0.9, dl);
      float sat = 0.0;
      for (int k = 0; k < 14; k++) {
        float fk = float(k);
        float hk = hash11(h * 91.0 + fk * 7.13);
        float wk = hash11(h * 37.0 + fk * 3.7) * 6.2832;
        float ak = r * (1.15 + 2.8 * hk * hk);
        float sk = r * (0.17 - 0.038 * (ak / r)) * (0.6 + 0.6 * hash11(fk + h * 13.0));
        vec2 rk = vec2(cos(wk), sin(wk));
        vec2 dk = d - rk * ak;
        vec2 lok = vec2(dot(dk, rk) / (1.0 + 1.6 * hk), dot(dk, vec2(-rk.y, rk.x)));
        sat = max(sat, (1.0 - smoothstep(sk - 0.7, sk + 0.7, length(lok))) * step(0.35, sk));
      }
      float nebel = step(1.0 - smoothstep(r * 4.5, r * 1.0, dl) * 0.1, hash12(floor(p / 1.6) + seed * 17.0 + h * 3.0));
      best = max(best, max(max(klecks, sat), nebel));
    }
  return best;
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
    vec3 bv = voronoi2(cssPx / 170.0);
    float pr = bv.x + 0.05 * fbm2(cssPx * 0.08);
    float portal = step(0.88, bv.z) * smoothstep(0.26, 0.2, pr);
    float portalRand = step(0.88, bv.z) * smoothstep(0.24, 0.215, pr) * (1.0 - smoothstep(0.215, 0.19, pr));
    float spr = spritzer(cssPx, 2.0, 0.16);
    // Bleistift: ein paar lange Konstruktionsstriche
    float striche = 0.0;
    for (int i = 0; i < 5; i++) {
      float fi = float(i);
      vec2 rr = vec2(cos(fi * 1.9 + 0.4), sin(fi * 1.9 + 0.4));
      float abst = abs(dot(cssPx - uAufl / uDpr * 0.5, vec2(-rr.y, rr.x)) - (hash11(fi * 3.3) - 0.5) * 700.0);
      striche = max(striche, (1.0 - smoothstep(0.3, 0.9, abst)) * (0.25 + 0.35 * noise2(cssPx * 0.05 + fi)));
    }
    vec3 grund = PAPIER * papier(cssPx * 1.2);
    grund = mix(grund, vec3(0.35, 0.35, 0.38), striche * 0.5);
    grund = mix(grund, TINTE + jenseits(cssPx * 0.7, bv.z, t) * 0.9, portal);
    grund += vec3(0.55, 0.85, 1.0) * portalRand * 0.45;
    grund = mix(grund, TINTE, spr * 0.9);
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
