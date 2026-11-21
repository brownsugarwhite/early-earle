/**
 * Flausch (Fell & Flausch; Florian, 21.11.: „Auch verschiedenen Zuckerwatte/wolke, flauchige shader. Alles absolute state of the art
 * und gerne auch experimentelles und extrem stilisiertes ausprobieren.“). Plan `docs/plans/2026-11-21-ozzy-shader-runde-6.md`,
 * Recherche `docs/research/2026-11-21-fell-flausch-recherche.md` (Abschnitt 6).
 *
 * Alle drei laufen auf den Schalen (`schalen.ts`):
 * - **Wolke** (durchscheinend): Die Wolke ist eine Höhe über der Haut aus Ballen (Kuppeln in Zellen im Raum, zwei Größen, dazu ein
 *   feines Quellen im Raum); innen dicht, am Rand weich. Licht nach Nubis: hell, wo die Ballen zur Sonne zeigen, dunkel in den
 *   Falten zwischen ihnen, Puder am Rand, Silberrand im Gegenlicht, kühles Himmelslicht. Stile Echt, Ghibli (drei gemalte Töne),
 *   Anime (zwei harte Töne, weißer Rand).
 * - **Zuckerwatte** (durchscheinend): feine wirre Fasern (wo zwei Rauschfelder zugleich null sind, entstehen Fäden im Raum), dazu ein
 *   zarter Dunst; rosa und hellblau ineinander, leuchtet im Gegenlicht, Zuckerkristalle funkeln.
 * - **Pusteblume** (deckend, experimentell): je Zelle ein Samen mit dünnem Stiel und einem Schirmchen aus Strahlen; weiß im
 *   Gegenlicht, die Samen braun.
 */
import type { ReglerZeile } from '../kern';
import { schalenVoreinstellung } from './schalen';

/** Ballen: Höhe der Wolkenoberfläche über der Haut (0 … 1) und ihr Gefälle in der Fläche (Maß der Form) */
const BALLEN = /* glsl */ `
float kuppel(vec3 x, float R, out vec3 grad) {
  float id;
  vec4 z = zelleAcht(x, id);
  float d = z.w;
  if (d >= R) { grad = vec3(0.0); return 0.0; }
  grad = 2.0 * z.xyz / (R * R);
  return 1.0 - d * d / (R * R);
}
float ballen(vec3 q, vec3 n, float bausch, out vec3 grad) {
  vec3 g1, g2;
  float b1 = kuppel(q * 2.2 / bausch, 0.62, g1);
  float b2 = kuppel(q * 5.4 / bausch + 3.1, 0.6, g2);
  float hs = 0.3 + 0.55 * b1 + 0.22 * b2;
  grad = (g1 * 2.2 * 0.55 + g2 * 5.4 * 0.22) / bausch;
  grad -= n * dot(grad, n);
  return hs;
}
`;

const WOLKE_FRAGMENT = /* glsl */ `
uniform float uBausch;
uniform float uDichte;
${BALLEN}
void main() {
  if (schalenGeschnitten()) discard;
  vec3 n0 = normalize(vNormal);
  float h = schalenHoehe();
  vec3 q = (vWurzel - uMitte) / uRadius;
  vec3 V = zumAuge(vWelt);
  int stil = int(uR_stil + 0.5);
  vec3 grad;
  float hs = ballen(q, n0, uBausch, grad);
  // feines Quellen im Raum (an der Schale), zum Rand hin stärker
  vec3 ps = (vWelt - uMitte) / uRadius;
  hs += (0.07 * snoise(ps * 9.0) + 0.035 * snoise(ps * 21.0)) * smoothstep(0.2, 0.8, h);
  float innen = smoothstep(hs + 0.03, hs - 0.09, h);
  if (h <= 0.0) innen = 1.0;
  float sigma = innen * uDichte;
  float a = h <= 0.0 ? 1.0 : 1.0 - exp(-sigma * 36.0 / max(uSchalen, 1.0));
  if (a < 0.003) { farbe = vec4(0.0); kennung = vec4(0.0); return; }
  // die Oberfläche der Ballen und das Licht
  vec3 nb = normalize(n0 - grad * uLaenge);
  vec3 L = ausSicht(normalize(vec3(-0.45, 0.68, 0.28)));
  float nl = dot(nb, L);
  float falte = smoothstep(0.25, 0.7, hs);
  float tief = clamp((hs - h) * 3.0, 0.0, 1.0);
  float nv = clamp(abs(dot(n0, V)), 0.0, 1.0);
  vec3 c;
  if (stil == 0) {
    float licht = clamp(nl * 0.55 + 0.5, 0.0, 1.0);
    float puder = 1.0 - exp(-(tief + 0.15) * 5.0);
    vec3 sonne = vec3(1.0, 0.97, 0.9) * 1.6 * licht * mix(0.75, 1.0, puder);
    vec3 himmel = vec3(0.36, 0.46, 0.66) * (0.6 + 0.4 * nb.y);
    vec3 boden = vec3(0.32, 0.3, 0.28) * max(-nb.y, 0.0) * 0.4;
    c = (sonne + himmel + boden) * mix(0.62, 1.0, falte);
    // Silberrand: Vorwärtsstreuung am dünnen Rand, wenn die Sonne dahinter steht
    float silber = pow(1.0 - nv, 3.0) * pow(max(dot(-V, L), 0.0), 2.0) * (1.0 - tief);
    c += vec3(1.0, 0.92, 0.75) * silber * 1.5;
    c = linZuSrgb(aces(c * 0.95));
  } else if (stil == 1) {
    float v = nl * 0.5 + 0.5;
    vec3 licht = vec3(1.0, 0.99, 0.95), mitte = vec3(0.84, 0.82, 0.93), schatten = vec3(0.6, 0.62, 0.82);
    c = mix(schatten, mitte, smoothstep(0.32, 0.42, v));
    c = mix(c, licht, smoothstep(0.55, 0.66, v));
    c *= mix(0.9, 1.0, falte);
    c *= 0.95 + 0.07 * noise2(gl_FragCoord.xy * vec2(0.03, 0.2) / uDpr + floor(q.x * 40.0) * 3.1);
  } else {
    float aa = fwidth(nl) + 1e-3;
    float licht = smoothstep(0.05 - aa, 0.05 + aa, nl) * step(0.35, falte);
    c = mix(vec3(0.72, 0.8, 0.98), vec3(1.0), licht);
    float rim = smoothstep(0.62, 0.68, 1.0 - nv);
    c = mix(c, vec3(1.0, 0.98, 0.9), rim * 0.8);
  }
  kennung = vec4(0.0);
  farbe = vec4(c * a, a);
}
`;

const WOLKE_ZUSAMMEN = /* glsl */ `
void main() {
  vec2 css = gl_FragCoord.xy / uDpr;
  vec2 qb = gl_FragCoord.xy / uAufl;
  int stil = int(uR_stil + 0.5);
  vec4 f = texture(tSchalen, vUv);
  float a = uBuehne > 0.5 ? 1.0 : 0.0;
  vec3 grund = vec3(0.0);
  if (a > 0.5 && f.a < 0.999) grund = linZuSrgb(stil == 0 ? himmelBlau(css, qb) : (stil == 1 ? ghibliHimmel(css, qb) : animeHimmel(css, qb)));
  vec3 aus = f.rgb + grund * (1.0 - f.a);
  if (stil == 1) aus *= mix(1.0, papier(css), 0.5);
  farbe = vec4(aus, max(a, f.a));
}
`;

/** Fäden der Zuckerwatte: wo zwei Rauschfelder zugleich null sind, laufen Fäden durch den Raum (zwei Größen) */
const FAEDEN = /* glsl */ `
float faeden(vec3 p) {
  float a = abs(snoise(p * 7.0)), b = abs(snoise(p * 7.0 + vec3(17.3, 5.1, 9.7)));
  float f = (1.0 - smoothstep(0.0, 0.1, a)) * (1.0 - smoothstep(0.0, 0.1, b));
  float c = abs(snoise(p * 16.0 + 4.0)), d = abs(snoise(p * 16.0 + vec3(3.3, 11.1, 7.7)));
  f = max(f, (1.0 - smoothstep(0.0, 0.08, c)) * (1.0 - smoothstep(0.0, 0.08, d)) * 0.8);
  return f;
}
`;

const WATTE_FRAGMENT = /* glsl */ `
uniform float uBausch;
uniform float uDichte;
${BALLEN}
${FAEDEN}
void main() {
  if (schalenGeschnitten()) discard;
  vec3 n0 = normalize(vNormal);
  float h = schalenHoehe();
  vec3 q = (vWurzel - uMitte) / uRadius;
  vec3 V = zumAuge(vWelt);
  vec3 grad;
  float hs = 0.55 + 0.45 * ballen(q, n0, uBausch * 1.3, grad);
  vec3 ps = (vWelt - uMitte) / uRadius;
  float innen = smoothstep(hs + 0.04, hs - 0.3, h);
  float fa = faeden(ps);
  float sigma = innen * (0.1 + 0.9 * fa) * uDichte;
  if (h <= 0.0) sigma = 1.0;
  float a = h <= 0.0 ? 1.0 : 1.0 - exp(-sigma * 30.0 / max(uSchalen, 1.0));
  if (a < 0.003) { farbe = vec4(0.0); kennung = vec4(0.0); return; }
  // Rosa und Himmelblau ineinander, weiß in den Fäden
  vec3 farbeW = vMuster.rgb;
  vec3 L = ausSicht(normalize(vec3(-0.45, 0.6, 0.45)));
  vec3 Lr = ausSicht(normalize(vec3(0.6, 0.3, -0.7)));
  float wrap = clamp(dot(n0, L) * 0.5 + 0.55, 0.0, 1.0);
  vec3 c = farbeW * (0.55 + 0.6 * wrap) + vec3(0.08, 0.06, 0.1);
  c = mix(c, vec3(1.0, 0.97, 0.98), fa * 0.35 * h);
  // leuchtet im Gegenlicht (viel Streuung, wenig Schlucken)
  float nv = clamp(abs(dot(n0, V)), 0.0, 1.0);
  c += farbeW * pow(1.0 - nv, 2.0) * (0.35 + 0.65 * max(dot(-V, Lr), 0.0)) * 0.7;
  // Zuckerkristalle: winzige Spiegel im Raum
  vec3 kz = floor(ps * 160.0);
  vec3 kn = normalize(hash33(kz) - 0.5 + n0 * 0.4);
  float funke = pow(max(dot(reflect(-V, kn), L), 0.0), 180.0) * step(0.88, hash13(kz + 3.0)) * fa;
  c += vec3(1.0) * funke * 4.0;
  c = linZuSrgb(aces(srgbZuLin(c) * 1.1));
  kennung = vec4(0.0);
  farbe = vec4(c * a, a);
}
`;

/** Farbe der Zuckerwatte je Ecke: Rosa und Himmelblau in großen Wolken ineinander gedreht */
const WATTE_MUSTER = /* glsl */ `
vec4 eckMuster(vec3 q, vec3 n) {
  float m = snoise(q * 1.4 + 0.4 * vec3(snoise(q * 2.5), snoise(q * 2.5 + 5.0), snoise(q * 2.5 + 9.0)));
  vec3 rosa = vec3(1.0, 0.56, 0.76), blau = vec3(0.56, 0.78, 1.0);
  return vec4(mix(rosa, blau, smoothstep(-0.15, 0.15, m + uR_mischung * 1.4 - 0.7)), 0.0);
}
`;

const WATTE_ZUSAMMEN = /* glsl */ `
void main() {
  vec2 css = gl_FragCoord.xy / uDpr;
  vec2 qb = gl_FragCoord.xy / uAufl;
  vec4 f = texture(tSchalen, vUv);
  float a = uBuehne > 0.5 ? 1.0 : 0.0;
  vec3 grund = a > 0.5 && f.a < 0.999 ? linZuSrgb(jahrmarktGrund(css, qb)) : vec3(0.0);
  farbe = vec4(f.rgb + grund * (1.0 - f.a), max(a, f.a));
}
`;

const PUSTE_FRAGMENT = /* glsl */ `
uniform float uDicht;
void main() {
  if (schalenGeschnitten()) discard;
  vec3 n0 = normalize(vNormal);
  float h = schalenHoehe();
  vec3 q = (vWurzel - uMitte) / uRadius;
  vec3 V = zumAuge(vWelt);
  float s = max(uDicht, 9.0 / max(uMass * uRadius, 1.0));
  vec3 hq = q / s;
  vec3 ci = floor(hq);
  vec3 seed = ci + 0.5 + 0.18 * (2.0 * hash33(ci) - 1.0);
  vec3 d = hq - seed;
  d -= n0 * dot(d, n0);
  float dist = length(d);
  float id = hash13(ci + 0.71);
  float lg = mix(0.82, 1.0, hash13(ci + 3.1));
  float hh = h / lg;
  float aa = min(fwidth(dist), 0.2) * 0.7 + 0.01;
  float a = 0.0;
  vec3 c = vec3(0.0);
  vec3 L = ausSicht(normalize(vec3(-0.5, 0.55, 0.5)));
  vec3 Lr = ausSicht(normalize(vec3(0.6, 0.35, -0.7)));
  float nv = clamp(abs(dot(n0, V)), 0.0, 1.0);
  float gegen = pow(1.0 - nv, 2.0) * (0.4 + 0.6 * max(dot(-V, Lr), 0.0));
  if (h <= 0.0) {
    a = 1.0;
    c = vec3(0.28, 0.26, 0.16) * (0.6 + 0.4 * clamp(dot(n0, L), 0.0, 1.0));
  } else if (hh < 0.12) {
    // der Samen: braun, spitz zum Stiel
    float r = 0.11 * (1.0 - hh / 0.12 * 0.6);
    a = 1.0 - smoothstep(r - aa, r + aa, dist);
    c = vec3(0.42, 0.3, 0.16) * (0.65 + 0.5 * clamp(dot(n0, L), 0.0, 1.0));
  } else if (hh < 0.84) {
    // der Stiel: dünn, hell
    a = 1.0 - smoothstep(0.03 - aa, 0.03 + aa, dist);
    c = vec3(0.88, 0.9, 0.84) * (0.75 + 0.3 * clamp(dot(n0, L), 0.0, 1.0)) + vec3(1.0, 0.92, 0.75) * gegen * 0.6;
  } else if (hh <= 1.0) {
    // das Schirmchen: Strahlen von der Mitte nach außen, oben weit offen
    float R = 0.46 * smoothstep(0.83, 0.93, hh);
    vec3 t1 = normalize(cross(n0, vec3(0.31, 0.93, 0.17)));
    vec3 t2 = cross(n0, t1);
    float w = atan(dot(d, t2), dot(d, t1));
    float strahl = abs(fract(w / 6.28318 * 16.0 + id * 7.0) - 0.5) * 2.0 * dist * 6.28318 / 16.0;
    float breite = 0.012 + 0.01 * (1.0 - dist / max(R, 1e-3));
    a = (1.0 - smoothstep(breite - aa, breite + aa, strahl)) * (1.0 - smoothstep(R - aa, R + aa, dist));
    a = max(a, 1.0 - smoothstep(0.035 - aa, 0.035 + aa, dist));
    c = vec3(0.97, 0.97, 0.94) * (0.8 + 0.25 * clamp(dot(n0, L), 0.0, 1.0)) + vec3(1.0, 0.9, 0.7) * gegen * 1.1;
  }
  if (a < 0.02) { farbe = vec4(0.0); kennung = vec4(0.0); return; }
  kennung = vec4(id, h, 0.0, 1.0);
  farbe = vec4(linZuSrgb(aces(srgbZuLin(clamp(c, 0.0, 2.0)) * 1.05)), a);
}
`;

const PUSTE_ZUSAMMEN = /* glsl */ `
void main() {
  vec2 css = gl_FragCoord.xy / uDpr;
  vec2 qb = gl_FragCoord.xy / uAufl;
  vec4 f = texture(tSchalen, vUv);
  float dk = sqrt(clamp(f.a, 0.0, 1.0));
  float a = uBuehne > 0.5 ? 1.0 : 0.0;
  vec3 grund = a > 0.5 && dk < 0.999 ? linZuSrgb(waldBokeh(css, qb)) : vec3(0.0);
  farbe = vec4(f.rgb + grund * (1.0 - dk), max(a, dk));
}
`;

const OHNE_MUSTER = /* glsl */ `
vec4 eckMuster(vec3 q, vec3 n) { return vec4(1.0); }
`;

const WOLKE_REGLER: ReglerZeile[] = [
  { k: 'stil', name: 'Stil', min: 0, max: 2, schritt: 1, grund: 0, stufen: ['Echt', 'Ghibli', 'Anime'] },
  { k: 'bausch', name: 'Bausch', min: 0.4, max: 2.5, schritt: 0.05, grund: 1 },
  { k: 'hoehe', name: 'Höhe', min: 0.3, max: 2.5, schritt: 0.05, grund: 1 },
  { k: 'dichte', name: 'Dichte', min: 0.2, max: 2, schritt: 0.05, grund: 1 },
];

export const WOLKE = schalenVoreinstellung(
  {
    id: 'wolke',
    name: 'Wolke',
    gruppe: 'Fell & Flausch',
    zeile: 'Die Form aus Wolke: Ballen über Ballen, hell zur Sonne, dunkel in den Falten, Silberrand im Gegenlicht; Stile Echt, Ghibli, Anime',
  },
  {
    name: 'wolke',
    regler: WOLKE_REGLER,
    uniforms: { uBausch: 1, uDichte: 1 },
    fragment: WOLKE_FRAGMENT,
    muster: OHNE_MUSTER,
    musterSchluessel: () => '',
    zusammen: WOLKE_ZUSAMMEN,
    durchsicht: true,
    werte: (w, k) => {
      const L = 0.3 * (w.regler.hoehe ?? 1);
      return {
        voll: Math.max(24, Math.min(40, Math.round((L * k.u.uMass.value * k.u.uRadius.value) / 2))),
        laenge: L,
        strich: 0,
        schwer: 0,
        werte: { uBausch: w.regler.bausch ?? 1, uDichte: w.regler.dichte ?? 1 },
      };
    },
  },
);

export const ZUCKERWATTE = schalenVoreinstellung(
  {
    id: 'zuckerwatte',
    name: 'Zuckerwatte',
    gruppe: 'Fell & Flausch',
    zeile: 'Zuckerwatte: feine wirre Fäden aus Zucker, durchscheinend, Rosa und Himmelblau ineinander, leuchtet im Gegenlicht, Kristalle funkeln',
  },
  {
    name: 'watte',
    regler: [
      { k: 'mischung', name: 'Rosa · Blau', min: 0, max: 1, schritt: 0.05, grund: 0.5 },
      { k: 'bausch', name: 'Bausch', min: 0.4, max: 2.5, schritt: 0.05, grund: 1 },
      { k: 'hoehe', name: 'Höhe', min: 0.3, max: 2.5, schritt: 0.05, grund: 1 },
      { k: 'dichte', name: 'Dichte', min: 0.2, max: 2, schritt: 0.05, grund: 1 },
    ],
    uniforms: { uBausch: 1, uDichte: 1 },
    fragment: WATTE_FRAGMENT,
    muster: WATTE_MUSTER,
    musterSchluessel: (w) => `${w.regler.mischung}`,
    zusammen: WATTE_ZUSAMMEN,
    durchsicht: true,
    werte: (w, k) => {
      const L = 0.28 * (w.regler.hoehe ?? 1);
      return {
        voll: Math.max(24, Math.min(40, Math.round((L * k.u.uMass.value * k.u.uRadius.value) / 2))),
        laenge: L,
        strich: 0.15,
        schwer: 0.05,
        werte: { uBausch: w.regler.bausch ?? 1, uDichte: w.regler.dichte ?? 1 },
      };
    },
  },
);

export const PUSTEBLUME = schalenVoreinstellung(
  {
    id: 'pusteblume',
    name: 'Pusteblume',
    gruppe: 'Fell & Flausch',
    zeile: 'Experimentell: die Form als Pusteblume, je Samen ein dünner Stiel mit einem Schirmchen aus Strahlen, weiß im Gegenlicht',
  },
  {
    name: 'puste',
    regler: [
      { k: 'hoehe', name: 'Länge', min: 0.4, max: 2.5, schritt: 0.05, grund: 1 },
      { k: 'abstand', name: 'Abstand', min: 0.5, max: 2.5, schritt: 0.05, grund: 1 },
    ],
    uniforms: { uDicht: 0.03 },
    fragment: PUSTE_FRAGMENT,
    muster: OHNE_MUSTER,
    musterSchluessel: () => '',
    zusammen: PUSTE_ZUSAMMEN,
    werte: (w, k) => {
      const L = 0.22 * (w.regler.hoehe ?? 1);
      return {
        voll: Math.max(28, Math.min(48, Math.round((L * k.u.uMass.value * k.u.uRadius.value) / 1.5))),
        laenge: L,
        strich: 0,
        schwer: 0,
        werte: { uDicht: 0.03 * (w.regler.abstand ?? 1) },
      };
    },
  },
);
