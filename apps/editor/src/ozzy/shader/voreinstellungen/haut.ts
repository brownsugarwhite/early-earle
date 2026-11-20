/**
 * Haut (Materialien; Florian: „menschliche hyperrealistische haut“). Wie Haut im Film gerechnet wird, in Echtzeit genähert:
 * - **Streuung unter der Haut:** Licht dringt ein und kommt rot wieder heraus. Vorintegriert genähert: Jeder Farbkanal hat eine eigene
 *   Weite, um die das Licht um die Schattengrenze herumgreift (Rot weit, Blau kaum), und stärker, wo die Haut stark gewölbt ist
 *   (Krümmung aus den Nachbarn im Bild). Die Streuung nimmt die glatte Normale, die Spiegelung die feine.
 * - **Durchlicht:** Wo die Form dünn ist (Dicke von Vorder- zu Rückseite) und von hinten beleuchtet, leuchtet sie warm rot durch.
 * - **Poren und Feinfalten:** zellige Vertiefungen und zwei Scharen feiner Linien, die sich kreuzen (die Hautfelderung), als Relief.
 * - **Zwei Glanzkeulen** (scharf und breit, GGX, F0 0,028), in den Poren schwächer; ein feiner Flaum am Rand.
 * - Farbe: Hautton einstellbar, leichte Rötung und Flecken, ein Hauch Adern. Licht: Porträtstudio (Softbox, Randlicht, Aufheller).
 */
import { bildVoreinstellung } from '../bildShader';

const FRAGMENT = /* glsl */ `
float relief(vec3 q) {
  vec3 vo = voronoi3(q * 260.0);
  float pore = smoothstep(0.32, 0.0, vo.x) * step(0.35, vo.z);
  vec3 a = normalize(vec3(1.0, 0.6, 0.2)), b = normalize(vec3(-0.5, 1.0, 0.4));
  float l1 = abs(fract(dot(q, a) * 70.0 + 0.4 * snoise(q * 20.0)) - 0.5);
  float l2 = abs(fract(dot(q, b) * 70.0 + 0.4 * snoise(q * 20.0 + 3.0)) - 0.5);
  float felder = smoothstep(0.06, 0.0, min(l1, l2));
  return -pore * 0.7 - felder * 0.25 + 0.15 * snoise(q * 40.0);
}
float ggxD(vec3 n, vec3 h, float r) { return ggx(max(dot(n, h), 0.0), r); }
vec3 kanalHuelle(float ndl, vec3 weite) { return clamp((vec3(ndl) + weite) / (1.0 + weite), 0.0, 1.0) * clamp((vec3(ndl) + weite) / (1.0 + weite), 0.0, 1.0); }
void main() {
  GPunkt g = gLesen(vUv);
  float maske = deckungBei(vUv);
  vec2 qb = gl_FragCoord.xy / uAufl;
  vec3 grund = mix(vec3(0.16, 0.16, 0.17), vec3(0.42, 0.42, 0.44), smoothstep(0.0, 1.0, qb.y));
  grund *= 1.0 - 0.45 * dot(qb - 0.5, qb - 0.5) * 2.0;
  vec3 bild = srgbZuLin(grund);
  float a = uBuehne > 0.5 ? 1.0 : 0.0;
  if (g.a > 0.5) {
    vec3 V = zumAuge(g.p);
    vec3 q = (g.p - uMitte) / uRadius;
    // Krümmung aus den Nachbarn im Bild
    vec2 px = 2.0 / uAufl;
    vec3 nx = texture(tNormal, vUv + vec2(px.x, 0.0)).xyz, ny = texture(tNormal, vUv + vec2(0.0, px.y)).xyz;
    vec3 lx = texture(tLage, vUv + vec2(px.x, 0.0)).xyz, ly = texture(tLage, vUv + vec2(0.0, px.y)).xyz;
    float kr = clamp((length(nx - g.n) / max(length(lx - g.p), 1e-4) + length(ny - g.n) / max(length(ly - g.p), 1e-4)) * 0.5 * uRadius * 0.15, 0.0, 1.0);
    // feines Relief als Normale
    float e = 0.0015;
    float h0 = relief(q);
    vec3 gr = vec3(relief(q + vec3(e, 0.0, 0.0)) - h0, relief(q + vec3(0.0, e, 0.0)) - h0, relief(q + vec3(0.0, 0.0, e)) - h0) / e;
    gr -= g.n * dot(gr, g.n);
    vec3 nf = normalize(g.n - gr * 0.0009 * uR_poren);
    // Farbe
    vec3 hell = vec3(0.92, 0.66, 0.54), dunkel = vec3(0.34, 0.19, 0.12);
    vec3 albedo = srgbZuLin(mix(hell, dunkel, uR_ton));
    float rot = smoothstep(0.35, 0.75, fbm3(q * 2.5)) * uR_roete;
    albedo *= mix(vec3(1.0), vec3(1.12, 0.84, 0.82), rot);
    albedo *= 1.0 - 0.12 * smoothstep(0.55, 0.8, fbm3(q * 9.0 + 4.0));
    // Lichter
    vec3 L1 = ausSicht(normalize(vec3(-0.55, 0.55, 0.62)));
    vec3 L2 = ausSicht(normalize(vec3(0.75, 0.25, -0.62)));
    vec3 L3 = ausSicht(normalize(vec3(0.3, -0.2, 0.93)));
    vec3 weite = vec3(0.55, 0.22, 0.12) * (0.5 + kr);
    vec3 diff = kanalHuelle(dot(g.n, L1), weite) * vec3(1.0, 0.97, 0.93) * 2.4;
    diff += kanalHuelle(dot(g.n, L3), weite) * vec3(0.75, 0.82, 1.0) * 0.35;
    diff += vec3(0.08, 0.075, 0.08);
    // Durchlicht aus der Dicke
    vec4 hh = texture(tHinten, vUv);
    float dicke = hh.w > g.z ? (hh.w - g.z) / uRadius : 1.0;
    float durch = exp(-dicke * 5.5) * (0.25 + max(dot(-g.n, L2), 0.0)) * uR_durchlicht;
    vec3 c = albedo * diff + vec3(0.95, 0.22, 0.08) * durch * 1.4;
    // Glanz: zwei Keulen, in Poren schwächer
    float porenGlanz = clamp(1.0 + h0 * 0.6, 0.3, 1.0);
    for (int i = 0; i < 2; i++) {
      vec3 L = i == 0 ? L1 : L2;
      float st = i == 0 ? 2.4 : 2.0;
      vec3 H = normalize(L + V);
      float ndl = max(dot(nf, L), 0.0);
      float F = fresnelS(max(dot(H, V), 0.0), 0.028);
      float spec = (0.85 * ggxD(nf, H, 0.32) + 0.15 * ggxD(nf, H, 0.62)) * F * ndl;
      c += vec3(1.0) * spec * st * 0.25 * porenGlanz;
    }
    // Flaum am Rand
    c += vec3(0.85, 0.8, 0.78) * pow(1.0 - max(dot(g.n, V), 0.0), 4.0) * 0.12;
    bild = mix(bild, c, maske);
    a = max(a, maske);
  }
  vec3 aus = linZuSrgb(aces(bild * 1.05));
  farbe = vec4(aus * a, a);
}
`;

export const HAUT = bildVoreinstellung({
  id: 'haut',
  name: 'Haut',
  gruppe: 'Materialien',
  zeile: 'Menschliche Haut: Streuung je Farbkanal, Durchlicht in dünnen Teilen, Poren und Hautfelderung, zwei Glanzkeulen, Porträtlicht',
  regler: [
    { k: 'ton', name: 'Hautton', min: 0, max: 1, schritt: 0.01, grund: 0.12 },
    { k: 'roete', name: 'Rötung', min: 0, max: 1.5, schritt: 0.05, grund: 0.6 },
    { k: 'poren', name: 'Poren', min: 0, max: 3, schritt: 0.05, grund: 1 },
    { k: 'durchlicht', name: 'Durchlicht', min: 0, max: 2, schritt: 0.05, grund: 1 },
  ],
  fragment: FRAGMENT,
  rueckseite: true,
  unruhig: () => false,
});
