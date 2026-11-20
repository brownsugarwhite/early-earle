/**
 * Opal (frei; hyperrealistisch). Ein schwarzer Opal: dunkler, milchig durchscheinender Körper, darin Körner aus geordneten
 * Kieselkugeln. Jedes Korn ist ein Gitter mit eigener Ausrichtung und eigenem Abstand und wirft nach Bragg (λ = 2 · n · d · cos θ)
 * genau eine Spektralfarbe zurück, und nur, wenn Licht und Blick zu seinem Gitter passen: Darum blitzen die Flecken beim Drehen auf
 * und wechseln die Farbe (Farbenspiel, „Harlekin“). Die Gitter atmen ganz langsam, damit der Stein auch still lebt. Darüber eine
 * polierte Kuppel (Fresnel, Studio). Bühne: dunkler Samt mit einem Lichtkegel.
 */
import { bildVoreinstellung } from '../bildShader';

const FRAGMENT = /* glsl */ `
/** Farbenspiel an einer Lage für eine Halbvektor-Richtung */
vec3 farbspiel(vec3 q, vec3 H, float zeit) {
  vec3 c = vec3(0.0);
  // zwei Ebenen von Körnern: grob und fein
  for (int s = 0; s < 3; s++) {
    float massstab = s == 0 ? 3.2 : (s == 1 ? 6.5 : 13.0);
    vec3 vo = voronoi3(q * massstab * uR_korn + float(s) * 17.0);
    vec3 zufall = hash33(vec3(vo.z * 91.0, float(s), 3.0));
    vec3 gitter = normalize(zufall * 2.0 - 1.0 + vec3(0.2 * sin(zeit * 0.3 + vo.z * 20.0), 0.2 * cos(zeit * 0.27 + vo.z * 13.0), 0.0));
    float d = 205.0 + 105.0 * hash11(vo.z * 37.0 + float(s));
    float cosT = abs(dot(H, gitter));
    float lambda = 2.0 * 1.37 * d * cosT;
    float passt = exp(-(1.0 - cosT) * 16.0);
    float sichtbar = smoothstep(390.0, 430.0, lambda) * (1.0 - smoothstep(660.0, 720.0, lambda));
    // innerhalb eines Korns flimmert es fein (Nadelfeuer)
    float nadel = 0.6 + 0.4 * noise2(q.xy * 140.0 + vo.z * 30.0);
    // weicher Übergang zum Nachbarkorn (Körner verlaufen ineinander)
    float rand = smoothstep(0.0, 0.12, vo.y - vo.x);
    c += max(spektral(lambda), vec3(0.0)) * passt * sichtbar * nadel * (s == 0 ? 1.0 : (s == 1 ? 0.75 : 0.5)) * (0.55 + 0.45 * rand);
  }
  return c;
}
void main() {
  vec2 css = gl_FragCoord.xy / uDpr;
  GPunkt g = gLesen(vUv);
  float maske = deckungBei(vUv);
  vec2 q2 = gl_FragCoord.xy / uAufl;
  vec2 c0 = insBild(uMitte);
  float r = length((q2 - c0) * vec2(uAufl.x / uAufl.y, 1.0));
  vec3 grund = mix(vec3(0.008, 0.008, 0.014), vec3(0.03, 0.028, 0.045), exp(-r * r / 0.12));
  grund *= 0.9 + 0.1 * noise2(css * 0.8);
  if (g.a < 0.5) {
    float a0 = uBuehne > 0.5 ? 1.0 : 0.0;
    farbe = vec4(linZuSrgb(grund) * a0, a0);
    return;
  }
  vec3 V = zumAuge(g.p);
  vec3 n = g.n;
  vec3 q = (g.p - uMitte) / uRadius;
  float nv = clamp(dot(n, V), 0.0, 1.0);
  // Körper: tief, milchig am Rand
  vec3 koerper = vec3(0.014, 0.02, 0.04) + vec3(0.05, 0.11, 0.2) * pow(1.0 - nv, 2.0);
  // milchiger Schimmer im Körper (Potch)
  koerper += vec3(0.02, 0.06, 0.08) * smoothstep(0.2, 0.8, fbm3(q * 3.0));
  // Licht aus mehreren Richtungen: Schlüssel, Softboxen, oben
  vec3 spiel = vec3(0.0);
  vec3 lichter[4];
  lichter[0] = ausSicht(normalize(vec3(-0.5, 0.7, 0.6)));
  lichter[1] = normalize(vec3(-0.62, 0.55, 0.56));
  lichter[2] = normalize(vec3(0.85, 0.28, -0.25));
  lichter[3] = vec3(0.0, 1.0, 0.0);
  for (int i = 0; i < 4; i++) {
    vec3 H = normalize(lichter[i] + V);
    spiel += farbspiel(q + n * 0.02, H, uZeit) * (i == 0 ? 1.4 : 0.7);
  }
  vec3 c = koerper + spiel * 1.3 * uR_feuer;
  // polierte Kuppel
  vec3 R = reflect(-V, n);
  float fr = fresnelS(nv, 0.05);
  c = c * (1.0 - fr) + studio(R) * fr * 0.8;
  vec3 aus = linZuSrgb(aces(c * 1.2));
  float a = uBuehne > 0.5 ? 1.0 : maske;
  aus = uBuehne > 0.5 ? mix(linZuSrgb(grund), aus, maske) : aus;
  farbe = vec4(aus * a, a);
}
`;

export const OPAL = bildVoreinstellung({
  id: 'opal',
  name: 'Opal',
  gruppe: 'Materialien',
  zeile: 'Schwarzer Opal: Körner beugen nach Bragg je eine Spektralfarbe, die nur aufblitzt, wenn Licht und Blick passen',
  regler: [
    { k: 'korn', name: 'Körnung', min: 0.3, max: 3, schritt: 0.05, grund: 1 },
    { k: 'feuer', name: 'Feuer', min: 0, max: 3, schritt: 0.05, grund: 1 },
  ],
  fragment: FRAGMENT,
});
