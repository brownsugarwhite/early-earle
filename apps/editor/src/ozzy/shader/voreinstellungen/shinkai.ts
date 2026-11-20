/**
 * Shinkai (Anime & Manga; nach den Filmen von Makoto Shinkai: Gegenlicht, Glühen, Himmel). Die Sonne steht tief hinter der Form: Der
 * Himmel läuft von Tiefblau über Violett in glühendes Orange, Wolken haben goldene Ränder. Die Form ist weich im Cel-Look (kühler,
 * violetter Schatten, warmes Licht), ein breites Randlicht frisst sich um ihren Umriss und glüht über ihn hinaus. Linsenreflexe auf der
 * Linie Sonne–Mitte, schwebende Lichtfunken, Strahlen durch die Luft.
 */
import { bildVoreinstellung } from '../bildShader';

const FRAGMENT = /* glsl */ `
void main() {
  vec2 css = gl_FragCoord.xy / uDpr;
  float t = uZeit;
  vec2 qb = gl_FragCoord.xy / uAufl;
  float aspekt = uAufl.x / uAufl.y;
  vec2 c0 = insBild(uMitte);
  vec2 sonne = c0 + vec2(0.06, 0.14);
  GPunkt g = gLesen(vUv);
  float maske = deckungBei(vUv);
  // Himmel
  vec3 c = mix(vec3(1.0, 0.62, 0.32), vec3(0.62, 0.36, 0.62), smoothstep(0.25, 0.6, qb.y));
  c = mix(c, vec3(0.12, 0.18, 0.45), smoothstep(0.55, 1.0, qb.y));
  vec2 ds = (qb - sonne) * vec2(aspekt, 1.0);
  float rs = length(ds);
  c += vec3(1.0, 0.85, 0.6) * exp(-rs * 7.0) * 0.9 + vec3(1.0, 0.95, 0.85) * smoothstep(0.035, 0.03, rs);
  // Wolken mit goldenen Rändern
  float wolke = smoothstep(0.52, 0.62, fbm2(css * vec2(0.0035, 0.009) + vec2(t * 0.01, 0.0)));
  float wolkeRand = smoothstep(0.5, 0.56, fbm2(css * vec2(0.0035, 0.009) + vec2(t * 0.01, 0.0) - ds * 0.4)) - wolke;
  c = mix(c, vec3(0.42, 0.28, 0.5), wolke * 0.8 * smoothstep(0.35, 0.6, qb.y));
  c += vec3(1.0, 0.75, 0.4) * max(wolkeRand, 0.0) * 1.2 * smoothstep(0.35, 0.6, qb.y);
  // Strahlen
  float w = atan(ds.y, ds.x);
  c += vec3(1.0, 0.8, 0.55) * 0.12 * smoothstep(0.55, 0.9, noise2(vec2(w * 18.0, t * 0.05))) * exp(-rs * 1.5);
  vec3 bild = c;
  float a = uBuehne > 0.5 ? 1.0 : 0.0;
  // Glühen um die Form (Gegenlicht)
  float halo = texture(tWeich, vUv).r;
  bild += vec3(1.0, 0.78, 0.5) * smoothstep(0.02, 0.5, halo) * (1.0 - maske) * 0.55 * uR_gluehen;
  if (g.a > 0.5) {
    vec3 L = ausSicht(normalize(vec3(0.2, 0.35, -0.9)));
    vec3 Lf = ausSicht(normalize(vec3(-0.4, 0.5, 0.75)));
    vec3 V = zumAuge(g.p);
    float v = dot(g.n, Lf);
    vec3 basis = vec3(0.98, 0.86, 0.8);
    vec3 schatten = vec3(0.45, 0.42, 0.72);
    vec3 fc = mix(schatten, basis, smoothstep(0.05, 0.12, v) * 0.55);
    float rand = pow(1.0 - max(dot(g.n, V), 0.0), 2.2) * smoothstep(-0.4, 0.5, dot(g.n, L) + 0.3);
    fc = mix(fc, vec3(1.0, 0.82, 0.55), smoothstep(0.15, 0.45, rand) * 0.9);
    fc += vec3(1.0, 0.7, 0.4) * smoothstep(0.4, 0.8, rand) * 0.6 * uR_gluehen;
    bild = mix(bild, fc, maske);
    a = max(a, maske);
  }
  // Linsenreflexe: Sechsecke auf der Linie Sonne → Mitte
  for (int i = 1; i <= 4; i++) {
    float fi = float(i);
    vec2 m = sonne + (vec2(0.5) - sonne) * (fi * 0.45);
    vec2 d = (qb - m) * vec2(aspekt, 1.0);
    float r = 0.02 + 0.015 * fi;
    vec2 hd = abs(d);
    float hex = max(hd.x * 0.866 + hd.y * 0.5, hd.y);
    bild += vec3(0.6, 0.8, 1.0) * (1.0 - smoothstep(r * 0.9, r, hex)) * 0.06;
  }
  // Lichtfunken
  vec2 z = floor(css / 40.0);
  vec2 f = fract(css / 40.0) - 0.5 - (hash22(z) - 0.5) * 0.6;
  float funke = step(0.93, hash12(z)) * smoothstep(0.08, 0.0, length(f)) * (0.5 + 0.5 * sin(t * 2.0 + hash12(z) * 30.0));
  bild += vec3(1.0, 0.9, 0.7) * funke * 0.8;
  float linie = kanteBei(vUv, 0.8 * uDpr) * maske;
  bild = mix(bild, vec3(0.3, 0.2, 0.35), linie * 0.6);
  vec3 aus = clamp(bild, 0.0, 1.0);
  if (uBuehne < 0.5) a = max(a, clamp(smoothstep(0.02, 0.5, halo) * 0.55 * uR_gluehen, 0.0, 1.0));
  farbe = vec4(aus * a, a);
}
`;

export const SHINKAI = bildVoreinstellung({
  id: 'shinkai',
  name: 'Shinkai',
  gruppe: 'Anime & Manga',
  zeile: 'Gegenlicht wie bei Makoto Shinkai: glühender Abendhimmel, goldene Wolkenränder, Randlicht, Glühen, Linsenreflexe, Lichtfunken',
  regler: [{ k: 'gluehen', name: 'Glühen', min: 0, max: 2, schritt: 0.05, grund: 1 }],
  fragment: FRAGMENT,
  weich: { skala: 0.25, radius: 16 },
});
