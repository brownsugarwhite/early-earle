/**
 * Venom-Blitz (Spider-Verse, Miles' Venom Strike, gezeichnet mit „Kirby Krackle“, den schwarzen Energieblasen von Jack Kirby). Die
 * Form ist dunkel, mit blauem Randlicht; über ihre Haut kriechen Blitze (Grate eines Rauschens, das in Schritten springt), um sie herum
 * steht ein Energiefeld aus Rasterpunkten, darin Trauben schwarzer Kreise mit weißem Saum (die Krackle). Einzelne Bögen springen von
 * der Form ins Leere. Alles auf Zwölfteln, wie gezeichnet. Bühne: Nachtblau mit Strahlen.
 */
import { bildVoreinstellung } from '../bildShader';

const FRAGMENT = /* glsl */ `
/** ein Blitzgrat: hell, wo das Rauschen die Null kreuzt */
float grat(vec3 q, float t) {
  float n = snoise(q + vec3(0.0, 0.0, t));
  float n2 = snoise(q * 2.3 + vec3(t * 1.7, 0.0, 0.0));
  float g = 1.0 - smoothstep(0.0, 0.045, abs(n + 0.35 * n2));
  return g;
}
void main() {
  vec2 css = gl_FragCoord.xy / uDpr;
  float t24 = schritt(12.0);
  GPunkt g = gLesen(vUv);
  float maske = deckungBei(vUv);
  float weich = texture(tWeich, vUv).r;
  vec2 qb = gl_FragCoord.xy / uAufl;
  vec2 c0 = insBild(uMitte);
  vec2 d = (qb - c0) * vec2(uAufl.x / uAufl.y, 1.0);
  float w = atan(d.y, d.x);
  vec3 grund = mix(vec3(0.02, 0.03, 0.09), vec3(0.06, 0.1, 0.26), exp(-dot(d, d) * 3.0));
  grund += vec3(0.1, 0.3, 0.7) * 0.25 * smoothstep(0.6, 0.95, noise2(vec2(w * 30.0, t24 * 2.0)));
  // Energiefeld um die Form: Rasterpunkte in Cyan, außen dünner
  float feld = smoothstep(0.02, 0.45, weich) * (1.0 - maske) * uR_energie;
  float rp = punkt(css, feld * 0.85, radians(30.0), 6.0);
  vec3 bild = mix(grund, vec3(0.45, 0.9, 1.0), rp * 0.9);
  // Kirby Krackle: Trauben schwarzer Kreise mit weißem Saum im Feld
  vec3 vo = voronoi2(css / 26.0 + floor(t24 * 2.0) * 0.37);
  float traube = step(0.55, noise2(css * 0.012 + floor(t24 * 2.0) * 3.1));
  float r = 0.18 + 0.22 * hash11(vo.z * 9.0);
  float kreis = 1.0 - smoothstep(r - 0.03, r, vo.x);
  float saum = (1.0 - smoothstep(r, r + 0.05, vo.x)) - kreis;
  float krackle = traube * step(0.15, feld);
  bild = mix(bild, vec3(1.0), saum * krackle);
  bild = mix(bild, vec3(0.0), kreis * krackle);
  float a = uBuehne > 0.5 ? 1.0 : clamp(max(rp, (kreis + saum) * krackle), 0.0, 1.0);
  // Bögen ins Leere: Grate im Bild nahe der Form
  float bogen = (1.0 - smoothstep(0.0, 0.05, abs(snoise(vec3(css * 0.012, t24 * 1.3)) + 0.4 * snoise(vec3(css * 0.04, t24)))));
  bogen *= smoothstep(0.08, 0.4, weich) * (1.0 - maske) * step(0.6, noise2(css * 0.004 + t24));
  bild = mix(bild, vec3(0.85, 0.97, 1.0), bogen * uR_energie);
  a = max(a, bogen * uR_energie);
  if (g.a > 0.5) {
    vec3 L = ausSicht(normalize(vec3(-0.4, 0.7, 0.55)));
    vec3 V = zumAuge(g.p);
    float v = dot(g.n, L);
    vec3 c = v > 0.15 ? vec3(0.12, 0.13, 0.2) : vec3(0.03, 0.03, 0.06);
    float rand = smoothstep(0.6, 0.85, 1.0 - max(dot(g.n, V), 0.0));
    c = mix(c, vec3(0.35, 0.85, 1.0), rand);
    vec3 q = (g.p - uMitte) / uRadius * 3.0;
    float blitz = grat(q, t24 * 3.0) * uR_energie;
    float glut = grat(q * 0.7 + 5.0, t24 * 3.0) * 0.5;
    c = mix(c, vec3(0.3, 0.75, 1.0), smoothstep(0.0, 1.0, glut) * 0.6 * uR_energie);
    c = mix(c, vec3(0.95, 1.0, 1.0), blitz);
    bild = mix(bild, c, maske);
    a = max(a, maske);
  }
  float linie = kanteBei(vUv, 1.4 * uDpr);
  bild = mix(bild, vec3(0.0), linie);
  a = max(a, linie);
  farbe = vec4(bild * a, a);
}
`;

export const VENOM = bildVoreinstellung({
  id: 'venom',
  name: 'Venom-Blitz',
  gruppe: 'Spider-Verse',
  zeile: 'Miles’ Venom Strike: Blitze kriechen über die Form, Energiefeld aus Rasterpunkten, Kirby Krackle, Bögen ins Leere',
  regler: [{ k: 'energie', name: 'Energie', min: 0, max: 2, schritt: 0.05, grund: 1 }],
  fragment: FRAGMENT,
  weich: { skala: 0.25, radius: 22 },
});
