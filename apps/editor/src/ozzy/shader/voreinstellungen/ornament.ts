/**
 * Ornament in Tusche (Anime & Manga; Florian, 21.11.: „Ich finde den zeichenstil in dem screenshot wunderschön. Bekommst du das
 * genauso als shader hin.“; Vorlage `docs/look/ozzy/shader/vorlagen/2026-11-21-zeichenstil-oni.webp`: eine geschnitzte
 * Oni-Maske, kolorierte Tuschezeichnung). Die Vorlage lebt von geschnitztem Ornament; die Form ist glatt, darum schnitzt der Shader:
 * - **Relief:** Wolkenspiralen (je Zelle im Raum eine Spirale, Drehsinn und Lage zufällig), dazwischen erhabene Ränder; daraus die
 *   Normale (Oberflächengradient der Höhe im Bild).
 * - **Linien wie mit der Feder:** außen eine kräftige Kontur, innen feine Linien an den Rändern der Schnitzerei (Höhenlinien des
 *   Reliefs) und an Kanten der Tiefe; Schraffur im Schatten (eine Lage, im tiefen Schatten gekreuzt), leicht zittrig.
 * - **Farbe:** gedeckt in weichen Stufen; erhabenes Ornament knochenweiß, die Vertiefungen in der Farbe der Palette (Oni: Ziegelrot,
 *   Jade: Salbei, Knochen: warmes Grau, Sepia: einfarbig), einzelne Zellen in einer Nebenfarbe.
 * - **Papier:** grünlich graues Papier mit Korn, im Grund ein Ring aus grauen Flecken wie in der Vorlage.
 */
import { bildVoreinstellung } from '../bildShader';

const FRAGMENT = /* glsl */ `
/** nächste Zelle im Raum mit Mitte: (F1, F2, Kennung) */
vec3 ornZelle(vec3 x, out vec3 mitte) {
  vec3 p = floor(x), f = fract(x);
  float d1 = 8.0, d2 = 8.0, id = 0.0;
  mitte = p;
  for (int k = -1; k <= 1; k++)
    for (int j = -1; j <= 1; j++)
      for (int i = -1; i <= 1; i++) {
        vec3 b = vec3(float(i), float(j), float(k));
        vec3 o = 0.2 + 0.6 * hash33(p + b);
        vec3 r = b + o - f;
        float d = dot(r, r);
        if (d < d1) { d2 = d1; d1 = d; id = hash13(p + b + 0.37); mitte = p + b + o; } else if (d < d2) d2 = d;
      }
  return vec3(sqrt(d1), sqrt(d2), id);
}
/** Höhe des geschnitzten Reliefs (0 Grund … 1 erhaben) an q (Maß der Form), Normale n; kennung: Zelle */
float reliefLage(vec3 q, vec3 n, float S, out float kennung);
float relief(vec3 q, vec3 n, out float kennung) {
  float k2;
  float gross = reliefLage(q, n, 3.6 * uR_ornament, kennung);
  float klein = reliefLage(q + 7.3, n, 8.5 * uR_ornament, k2);
  // die kleinen Spiralen füllen den Grund zwischen den großen
  return max(gross, klein * 0.8 * (1.0 - smoothstep(0.05, 0.4, gross)));
}
float reliefLage(vec3 q, vec3 n, float S, out float kennung) {
  vec3 m;
  vec3 z = ornZelle(q * S, m);
  kennung = z.z;
  vec3 t1 = normalize(cross(n, vec3(0.31, 0.93, 0.17)));
  vec3 t2 = cross(n, t1);
  vec3 d = q * S - m;
  vec2 uv = vec2(dot(d, t1), dot(d, t2));
  float r = length(uv);
  float dreh = hash11(z.z * 17.0) < 0.5 ? 1.0 : -1.0;
  float a = atan(uv.y, uv.x) * dreh + 6.2831853 * hash11(z.z * 5.0);
  // archimedische Spirale: Abstand zum nächsten Arm (Windungsabstand b)
  // logarithmische Spirale (zur Mitte enger), Arm mit rundem Profil, nach außen auslaufend
  float t = log(max(r, 1e-3) / 0.035) / 0.42 - a / 6.2831853;
  float arm = abs(fract(t) - 0.5) * 2.0;
  float spirale = pow(clamp(1.0 - arm / 0.62, 0.0, 1.0), 0.55) * (1.0 - smoothstep(0.3, 0.5, r)) * smoothstep(0.015, 0.05, r);
  float knopf = pow(clamp(1.0 - r / 0.07, 0.0, 1.0), 0.5);
  float leiste = (1.0 - smoothstep(0.015, 0.05, z.y - z.x + 0.02 * snoise(q * 22.0))) * smoothstep(-0.2, 0.3, snoise(q * 5.0 + 3.0));
  return clamp(max(max(spirale, knopf), leiste * 0.6), 0.0, 1.0);
}
vec3 ornNormale(vec3 n, vec3 p, float h) {
  vec3 dpx = dFdx(p), dpy = dFdy(p);
  float dhx = dFdx(h), dhy = dFdy(h);
  vec3 r1 = cross(dpy, n), r2 = cross(n, dpx);
  float det = dot(dpx, r1);
  if (abs(det) < 1e-12) return n;
  vec3 gr = sign(det) * (r1 * dhx + r2 * dhy);
  return normalize(abs(det) * n - gr);
}
/** Palette: Vertiefung, Ornament, Nebenfarbe (sRGB) */
void palette(out vec3 tief, out vec3 hoch, out vec3 neben) {
  int p = int(uR_palette + 0.5);
  if (p == 0) { tief = vec3(0.66, 0.34, 0.29); hoch = vec3(0.92, 0.89, 0.82); neben = vec3(0.53, 0.72, 0.65); }
  else if (p == 1) { tief = vec3(0.47, 0.62, 0.56); hoch = vec3(0.92, 0.9, 0.84); neben = vec3(0.68, 0.37, 0.31); }
  else if (p == 2) { tief = vec3(0.6, 0.57, 0.53); hoch = vec3(0.93, 0.9, 0.84); neben = vec3(0.66, 0.36, 0.31); }
  else { tief = vec3(0.62, 0.5, 0.38); hoch = vec3(0.9, 0.85, 0.75); neben = vec3(0.5, 0.4, 0.3); }
}
/** Papier mit dem Ring aus grauen Flecken (wie in der Vorlage) */
vec3 papierGrund(vec2 css, vec2 qb) {
  vec3 c = vec3(0.757, 0.784, 0.792);
  float asp = uAufl.x / uAufl.y;
  vec2 u = vec2(qb.x * asp, qb.y);
  vec2 m = vec2(0.78 * asp, 0.62);
  float r = length(u - m);
  float w = atan(u.y - m.y, u.x - m.x);
  float ring = fract(r * 5.2);
  float ringNr = floor(r * 5.2);
  float bogen = w * (1.0 + ringNr) * 1.3;
  float flecken = smoothstep(0.1, 0.3, snoise(vec3(bogen, ring * 1.6, ringNr * 3.1)) + 0.2 * snoise(vec3(css * 0.025, 1.0)));
  float band = smoothstep(0.1, 0.28, ring) * smoothstep(0.9, 0.7, ring);
  c = mix(c, vec3(0.675, 0.686, 0.671), flecken * band * smoothstep(1.7, 0.5, r) * smoothstep(0.12, 0.3, r) * 0.95);
  c *= 0.97 + 0.03 * snoise(vec3(css * 0.35, 3.0)) + 0.02 * snoise(vec3(css * 1.7, 7.0));
  return c;
}
void main() {
  GPunkt g = gLesen(vUv);
  float maske = deckungBei(vUv);
  vec2 css = gl_FragCoord.xy / uDpr;
  vec2 qb = gl_FragCoord.xy / uAufl;
  vec3 bild = uBuehne > 0.5 ? papierGrund(css, qb) : vec3(0.0);
  float a = uBuehne > 0.5 ? 1.0 : 0.0;
  vec3 tinte = vec3(0.14, 0.09, 0.05);
  if (g.a > 0.5) {
    vec3 V = zumAuge(g.p);
    vec3 n0 = g.n;
    vec3 q = (g.p - uMitte) / uRadius;
    float kennung;
    float h = relief(q, n0, kennung);
    vec3 n = ornNormale(n0, g.p, h * uRadius * 0.012 * uR_tiefe);
    vec3 tief, hoch, neben;
    palette(tief, hoch, neben);
    vec3 grundF = hash11(kennung * 23.0) < 0.12 ? neben : tief;
    vec3 alb = mix(grundF, hoch, smoothstep(0.25, 0.55, h));
    // Licht in weichen Stufen (hell, mittel, Schatten), die Vertiefungen etwas dunkler
    vec3 L = ausSicht(normalize(vec3(-0.55, 0.62, 0.55)));
    float v = dot(n, L);
    // vier Tonstufen; an jeder Grenze ein schmaler, etwas dunklerer Rand wie bei einer Lasur
    float aaV = fwidth(v) + 1e-3;
    float st1 = smoothstep(-0.25 - aaV, -0.25 + aaV, v), st2 = smoothstep(0.1 - aaV, 0.1 + aaV, v), st3 = smoothstep(0.55 - aaV, 0.55 + aaV, v);
    float stufe = 0.42 + 0.2 * st1 + 0.22 * st2 + 0.16 * st3;
    float lasur = (1.0 - smoothstep(0.0, 0.05, abs(v + 0.25))) + (1.0 - smoothstep(0.0, 0.05, abs(v - 0.1))) + (1.0 - smoothstep(0.0, 0.05, abs(v - 0.55)));
    stufe *= 1.0 - 0.08 * clamp(lasur, 0.0, 1.0);
    stufe *= mix(0.72, 1.0, smoothstep(0.0, 0.45, h));
    vec3 c = alb * stufe;
    c = mix(c, c * vec3(0.78, 0.8, 0.9), smoothstep(0.15, -0.35, v) * 0.7);
    // Schraffur im Schatten: eine Lage, im tiefen Schatten gekreuzt; leicht zittrig
    float schatten = smoothstep(0.3, -0.25, v) + (1.0 - smoothstep(0.0, 0.35, h)) * 0.35;
    float zitter = 0.6 * snoise(vec3(css * 0.08, 2.0));
    float s1 = abs(fract((css.x + css.y + zitter * 4.0) / 3.5) - 0.5) * 3.5;
    float s2 = abs(fract((css.x - css.y + zitter * 4.0) / 3.8) - 0.5) * 3.8;
    float hatch = (1.0 - smoothstep(0.25, 0.75, s1)) * smoothstep(0.25, 0.55, schatten);
    hatch = max(hatch, (1.0 - smoothstep(0.25, 0.75, s2)) * smoothstep(0.6, 0.9, schatten));
    c = mix(c, tinte, hatch * 0.55 * uR_schraffur);
    // feine Linien: Ränder der Schnitzerei (Höhenlinie) und Kanten der Tiefe
    float fw = fwidth(h) + 1e-3;
    // die Linie ist auf der Schattenseite breiter (Druck der Feder)
    float breit = mix(1.4, 2.6, smoothstep(0.4, -0.2, v));
    float rand = 1.0 - smoothstep(0.0, breit, abs(h - 0.32) / fw);
    float z0 = g.z;
    float dz = 0.0;
    for (int i = 0; i < 4; i++) {
      vec2 o = vec2(float(i == 0) - float(i == 1), float(i == 2) - float(i == 3)) * 1.5 * uDpr / uAufl;
      GPunkt gn = gLesen(vUv + o);
      if (gn.a > 0.5) dz = max(dz, abs(gn.z - z0));
    }
    float kante = smoothstep(0.015, 0.04, dz / uRadius);
    c = mix(c, tinte, max(rand * 0.92, kante));
    bild = mix(bild, c, maske);
    a = max(a, maske);
  }
  // Kontur außen: kräftig, dunkelbraun
  float e = 0.0;
  for (int i = 0; i < 8; i++) {
    float w = float(i) * 0.7853982;
    e = max(e, abs(deckungBei(vUv + vec2(cos(w), sin(w)) * 1.9 * uDpr / uAufl) - maske));
  }
  float kontur = smoothstep(0.25, 0.6, e);
  bild = mix(bild, tinte, kontur);
  a = max(a, kontur);
  // Papierkorn über allem
  bild *= 0.98 + 0.03 * snoise(vec3(css * 0.9, 5.0));
  farbe = vec4(bild * a, a);
}
`;

export const ORNAMENT = bildVoreinstellung({
  id: 'ornament',
  name: 'Ornament in Tusche',
  gruppe: 'Anime & Manga',
  zeile: 'Kolorierte Tuschezeichnung wie die Oni-Vorlage: geschnitzte Wolkenspiralen, Feder-Linien an den Rändern, Schraffur im Schatten, gedeckte Palette, Papier mit Fleckenring',
  regler: [
    { k: 'palette', name: 'Palette', min: 0, max: 3, schritt: 1, grund: 0, stufen: ['Oni', 'Jade', 'Knochen', 'Sepia'] },
    { k: 'ornament', name: 'Ornament', min: 0.4, max: 2.5, schritt: 0.05, grund: 1 },
    { k: 'tiefe', name: 'Schnitztiefe', min: 0, max: 3, schritt: 0.05, grund: 1 },
    { k: 'schraffur', name: 'Schraffur', min: 0, max: 1.5, schritt: 0.05, grund: 1 },
  ],
  fragment: FRAGMENT,
  unruhig: () => false,
});
