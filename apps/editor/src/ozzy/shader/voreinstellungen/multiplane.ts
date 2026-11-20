/**
 * Multiplane (nach „Beyond the Spider-Verse“, Juni 2027). Lord und Miller (Herbst 2026): Die Looks folgen nicht den Regeln der
 * 3D-Animation, „viel mehr im Stil eines 2D-Multiplane“; die Kamera läuft wie beim Realfilm, aus der Hand.
 *
 * Hier wird die Form zu flachen, gemalten Ebenen hintereinander, wie Cels auf den Glasplatten einer Multiplane-Kamera: Jede Ebene ist
 * eine Scheibe der Form in der Tiefe, zweitönig gemalt (Licht und Schatten mit harter Grenze), mit eigenem Umriss und einem Schatten
 * auf die Ebenen dahinter; nach hinten wird sie kühler und heller (Luft). Die Handkamera wackelt, und weil jede Ebene ihren eigenen
 * Abstand zur Kamera hat, gleiten die Ebenen dabei gegeneinander. Staub und Kratzer liegen auf dem Glas, Filmkorn darüber.
 */
import { bildVoreinstellung } from '../bildShader';

const FRAGMENT = /* glsl */ `
const int N_MAX = 7;

int ebeneVon(float z, float n) {
  float zc = length(uKamPos - uMitte);
  float f = (z - (zc - uRadius * 0.85)) / (uRadius * 1.7);
  return int(clamp(floor(f * n), 0.0, n - 1.0));
}
vec3 ebenenFarbe(int i, float n, float hell) {
  float f = float(i) / max(n - 1.0, 1.0);
  vec3 vornLicht = vec3(1.0, 0.6, 0.42), vornSchatten = vec3(0.62, 0.22, 0.32);
  vec3 hintenLicht = vec3(0.72, 0.86, 0.95), hintenSchatten = vec3(0.36, 0.48, 0.7);
  vec3 lichtF = mix(vornLicht, hintenLicht, f), schattenF = mix(vornSchatten, hintenSchatten, f);
  return mix(schattenF, lichtF, hell);
}
vec2 handkamera(float t) {
  return vec2(fbm2(vec2(t * 0.9, 1.0)) - 0.5, fbm2(vec2(3.0, t * 0.8)) - 0.5) * 2.0;
}

void main() {
  vec2 cssPx = gl_FragCoord.xy / uDpr;
  float t = uZeit;
  float n = floor(clamp(uR_ebenen, 2.0, float(N_MAX)));
  vec2 wackel = handkamera(t * 0.8) * 7.0 * uR_hand;
  vec2 wackel2 = handkamera(t * 0.8 + 17.0) * 4.0 * uR_hand;
  vec3 L = ausSicht(normalize(vec3(-0.55, 0.7, 0.45)));
  vec2 lichtImBild = normalize(vec2(-0.55, 0.7));
  int treffer = -1;
  vec2 uvT = vUv;
  GPunkt gT;
  // von vorn nach hinten: die erste Ebene, die an ihrer verschobenen Stelle liegt
  for (int i = 0; i < N_MAX; i++) {
    if (float(i) >= n) break;
    float tiefe = (float(i) - (n - 1.0) * 0.4);
    vec2 off = (wackel + wackel2 * tiefe * 0.6) * uDpr / uAufl;
    vec2 uv = vUv + off;
    GPunkt g = gLesen(uv);
    if (g.a > 0.5 && ebeneVon(g.z, n) == i) { treffer = i; uvT = uv; gT = g; break; }
  }
  vec3 bild;
  float form = 0.0;
  float umriss = 0.0;
  if (treffer >= 0) {
    float v = dot(gT.n, L);
    float hell = smoothstep(-0.02, 0.04, v + 0.08 * (noise2(cssPx * 0.05) - 0.5));
    bild = ebenenFarbe(treffer, n, hell);
    // Schatten der Ebenen davor (zum Licht hin nachsehen)
    float abstandGlas = (8.0 + 6.0 * float(treffer)) * uDpr;
    GPunkt gs = gLesen(uvT + lichtImBild * abstandGlas / uAufl);
    if (gs.a > 0.5 && ebeneVon(gs.z, n) < treffer) bild *= vec3(0.7, 0.68, 0.82);
    // Umriss der Ebene: Nachbarn, die nicht zu ihr gehören
    float w = 1.4 * uDpr;
    for (int k = 0; k < 6; k++) {
      float a = float(k) * 1.0472;
      vec2 o = vec2(cos(a), sin(a)) * w / uAufl;
      GPunkt gn = gLesen(uvT + o);
      if (gn.a < 0.5 || ebeneVon(gn.z, n) != treffer) umriss = 1.0;
    }
    // Gouache auf dem Cel
    bild *= 0.95 + 0.08 * fbm2(cssPx * 0.12 + float(treffer) * 10.0);
    form = 1.0;
  } else {
    vec2 q = gl_FragCoord.xy / uAufl;
    bild = mix(vec3(0.98, 0.9, 0.78), vec3(0.62, 0.78, 0.92), smoothstep(0.1, 0.95, q.y));
    // gemalte Hügel in der Ferne (gleiten mit der Hand am wenigsten)
    vec2 hp = cssPx + handkamera(t * 0.8) * 2.0;
    float huegel = smoothstep(0.0, 2.0, (fbm2(vec2(hp.x * 0.004, 1.0)) * 0.35 + 0.18) * uAufl.y / uDpr - hp.y);
    bild = mix(bild, vec3(0.55, 0.66, 0.82), huegel * 0.6);
  }
  bild = mix(bild, vec3(0.16, 0.1, 0.16), umriss * 0.9);
  // Glas: Staub und Kratzer, Filmkorn, Vignette
  float staub = step(0.9975, hash12(floor(cssPx / 2.0) + 0.5)) * 0.5;
  float kratzer = smoothstep(0.996, 1.0, noise2(vec2(cssPx.x * 0.8, cssPx.y * 0.004) + 7.0)) * 0.25;
  float korn = (hash12(cssPx + floor(t * 24.0)) - 0.5) * 0.06;
  vec2 qv = gl_FragCoord.xy / uAufl - 0.5;
  float vignette = 1.0 - 0.35 * dot(qv, qv) * 2.0;
  float a;
  if (uBuehne > 0.5) {
    bild = bild * vignette + korn;
    bild = mix(bild, vec3(1.0), staub);
    bild = mix(bild, vec3(0.2), kratzer);
    a = 1.0;
  } else {
    a = max(form, umriss);
    bild += korn * form;
  }
  farbe = vec4(clamp(bild, 0.0, 1.0) * a, a);
}
`;

export const MULTIPLANE = bildVoreinstellung({
  id: 'multiplane',
  name: 'Multiplane',
  gruppe: 'Spider-Verse',
  zeile: 'Beyond the Spider-Verse: die Form als gemalte Ebenen auf Glas, Schatten von Ebene zu Ebene, Handkamera mit Parallaxe',
  regler: [
    { k: 'ebenen', name: 'Ebenen', min: 2, max: 7, schritt: 1, grund: 5 },
    { k: 'hand', name: 'Handkamera', min: 0, max: 2.5, schritt: 0.05, grund: 1 },
  ],
  fragment: FRAGMENT,
});
