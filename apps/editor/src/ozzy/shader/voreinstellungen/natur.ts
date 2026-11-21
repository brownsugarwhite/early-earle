/**
 * Natur (Runde 9; Florian: „… und neon und natur“). Recherche `docs/research/2026-11-21-runde-9-recherche.md`, Abschnitt 7.4.
 * - **Platane** (Barcelonas häufigster Straßenbaum): die Rinde als Flickenteppich aus abblätternden Platten, jede mit eigenem Alter:
 *   frisch hell (#d9d6a6, #e8dfc6), mittel (#9a9566, #8b8463), alt (#6f6a5c, #7a7f68). Die älteren liegen oben, ihre Ränder heben
 *   sich (Schattenlinie auf der Lage darunter, heller Bruchrand). Grünlicher Algenschimmer auf der Schattenseite, unten rissige dunkle
 *   Borke (#5a5145). Die Platten sind verzerrte Zellen im Raum, senkrecht gestreckt, und Inseln (nicht jede Zelle): sonst Giraffe.
 */
import { bildVoreinstellung } from '../bildShader';
import { BUEHNEN } from './buehnen';
import { DRAUSSEN } from './fels';

const PLATANE_GLSL = /* glsl */ `
${BUEHNEN}
${DRAUSSEN}
/** eine Lage Rindenplatten: Abstand zum Rand der Platte (positiv innen, sonst negativ), Kennung der Platte */
float rindenLage(vec3 q, float s, float saat, float anteil, out float id) {
  vec3 x = q * s * vec3(1.0, 0.62, 1.0) + 0.4 * vec3(snoise(q * 2.6 + saat), snoise(q * 2.6 + saat + 4.0), snoise(q * 2.6 + saat + 8.0));
  vec3 m;
  vec3 z = felsZelle(x + saat * 7.0, m);
  id = z.z;
  float ins = (z.y - z.x) * 0.5 - 0.05 - 0.05 * (snoise(q * 22.0 + saat) * 0.5 + 0.5);
  return hash11(z.z * 13.0 + saat) < anteil ? ins / s : -1.0;
}
void main() {
  GPunkt g = gLesen(vUv);
  float maske = deckungBei(vUv);
  vec2 css = gl_FragCoord.xy / uDpr;
  vec2 qb = gl_FragCoord.xy / uAufl;
  vec3 bild = uBuehne > 0.5 ? waldBokeh(css, qb) : vec3(0.0);
  float a = uBuehne > 0.5 ? 1.0 : 0.0;
  if (g.a > 0.5) {
    vec3 V = zumAuge(g.p);
    vec3 n0 = g.n;
    vec3 q = (g.p - uMitte) / uRadius;
    float sk = uR_platten;
    vec3 L = ausSicht(normalize(vec3(-0.5, 0.75, 0.42)));
    // Schatten der Platten auf der Lage darunter: dieselbe Lage ein Stück zum Licht hin
    vec3 zumLicht = (L - n0 * dot(L, n0)) * 0.012;
    float id1, id2, idS1, idS2;
    float alt = rindenLage(q, 3.6 * sk, 1.0, 0.5, id1);
    float mit = rindenLage(q, 5.2 * sk, 2.0, 0.62, id2);
    float altS = rindenLage(q + zumLicht, 3.6 * sk, 1.0, 0.5, idS1);
    float mitS = rindenLage(q + zumLicht, 5.2 * sk, 2.0, 0.62, idS2);
    // die jüngste Lage: glatt und hell, cremig bis gelbgrün
    vec3 alb = mix(vec3(0.8, 0.8, 0.56), vec3(0.88, 0.85, 0.7), smoothstep(-0.5, 0.5, snoise(q * 5.0)));
    alb *= 0.95 + 0.05 * snoise(q * 90.0);
    float h = 0.0;
    float ao = 1.0;
    // mittlere Lage
    float aaM = fwidth(mit) + 1e-5;
    float mM = smoothstep(-aaM, aaM, mit);
    vec3 mitF = mix(vec3(0.604, 0.584, 0.4), vec3(0.545, 0.518, 0.388), hash11(id2 * 3.0)) * (0.9 + 0.12 * snoise(q * 40.0));
    ao *= 1.0 - 0.45 * smoothstep(-0.002, 0.004, mitS) * (1.0 - mM);
    alb = mix(alb, mitF, mM);
    alb = mix(alb, alb * 1.25 + 0.06, mM * (1.0 - smoothstep(0.0, 0.004, mit)));
    h += mM * (0.6 + 0.4 * smoothstep(0.0, 0.01, mit));
    // alte Lage oben
    float aaA = fwidth(alt) + 1e-5;
    float aM = smoothstep(-aaA, aaA, alt);
    vec3 altF = mix(vec3(0.435, 0.416, 0.361), vec3(0.478, 0.498, 0.408), hash11(id1 * 5.0)) * (0.88 + 0.16 * snoise(q * 30.0));
    altF = mix(altF, altF * 0.7, smoothstep(0.4, 0.8, snoise(q * 70.0)) * 0.5);
    ao *= 1.0 - 0.5 * smoothstep(-0.002, 0.005, altS) * (1.0 - aM);
    alb = mix(alb, altF, aM);
    alb = mix(alb, vec3(0.86, 0.82, 0.68), aM * (1.0 - smoothstep(0.0, 0.005, alt)) * 0.6);
    h += aM * (1.4 + 0.5 * smoothstep(0.0, 0.015, alt));
    // Algen auf der Schattenseite
    float schatten = smoothstep(0.2, -0.4, dot(n0, L));
    alb = mix(alb, vec3(0.42, 0.5, 0.3), schatten * 0.35 * smoothstep(-0.3, 0.5, snoise(q * 6.0 + 5.0)));
    // unten rissige Borke
    float borke = smoothstep(-0.45, -0.75, q.y + 0.1 * snoise(q * 4.0));
    float riss = 1.0 - abs(snoise(vec3(q.x * 9.0, q.y * 2.0, q.z * 9.0)));
    alb = mix(alb, mix(vec3(0.353, 0.318, 0.271), vec3(0.18, 0.16, 0.14), smoothstep(0.75, 0.95, riss)), borke);
    h = mix(h, 1.2 - smoothstep(0.75, 0.95, riss) * 1.5, borke);
    h += 0.08 * snoise(q * 160.0);
    vec3 n = hoeheNormale(n0, g.p, h * uRadius * 0.004);
    vec3 c = draussen(srgbZuLin(alb), n, V, ao, 0.85);
    bild = mix(bild, c, maske);
    a = max(a, maske);
  }
  farbe = vec4(linZuSrgb(aces(bild)) * a, a);
}
`;

export const PLATANE = bildVoreinstellung({
  id: 'platane',
  name: 'Platane',
  gruppe: 'Natur',
  zeile: 'Rinde der Platane, Barcelonas Straßenbaum: ein Flickenteppich aus abblätternden Platten (frisch hell, mittel olivgelb, alt graugrün), die älteren liegen oben mit gehobenem Rand und Schatten, Algen auf der Schattenseite, unten rissige Borke',
  regler: [{ k: 'platten', name: 'Platten', min: 0.4, max: 2.5, schritt: 0.05, grund: 1 }],
  fragment: PLATANE_GLSL,
  unruhig: () => false,
});
