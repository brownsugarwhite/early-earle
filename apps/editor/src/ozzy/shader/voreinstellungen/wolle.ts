/**
 * Schafwolle (24.11.2026; Florian: „Vor allem die weiße schafswolle finde ich interessant“, dann „Schafwolle bauen“). Plan
 * `docs/plans/2026-11-24-ozzy-fell-nach-vorlagen.md` (Etappe Schafwolle), Vorlage
 * `docs/look/ozzy/shader/vorlagen/2026-11-24-fell-08-weiss-locken.png` (offline gerechnet, 3ds Max). In Echtzeit aus zwei Teilen:
 * - **Locken aus Schalen** (gemischt wie das Samtfell): Locken als Zellen im Raum, jede eine Kuppel (Haare in der Mitte lang, am Rand
 *   kurz: dunkle Lücken dazwischen); die Haare drehen sich mit der Höhe um die Achse ihrer Locke, laufen zur Spitze zusammen und
 *   wellen sich; die Locken neigen sich in einem glatten Feld (je Ecke gerechnet).
 * - **Flusen:** echte Haare als dünne Bänder über den Schalen (`flusen` in `schalen.ts`), länger als die Locken, gewellt, in der Wolle
 *   ausgeblendet. Sie machen den fransigen Umriss.
 * Licht wie die Vorlage: weich von oben links, Spitzen durchscheinend, kühle Aufhellung von rechts.
 */
import type { ReglerZeile } from '../kern';
import { type SchalenArt, schalenVoreinstellung } from './schalen';

const K = /* glsl */ `
const float LOCKE = 0.075;
const float KURZ = 0.22;
const float NEIGUNG = 0.8;
const float DREH = 0.5;
const float KLUMP = 0.75;
const float KRAUS = 0.12;
const float WELLE = 0.22;
const float KRAUS_F = 2.0;
const float DICHT = 0.004;
const float DICKE = 0.75;
const float STREU = 0.65;
const float DECKUNG = 0.7;
const vec3 WURZEL = vec3(0.36, 0.3, 0.22);
const vec3 HELL_WOLLE = vec3(0.96, 0.92, 0.82);
const vec3 DUNKEL_WOLLE = vec3(0.84, 0.77, 0.64);
const vec3 SPITZE = vec3(0.99, 0.95, 0.86);
const float STREU_HELL = 0.25;
const float HELL = 1.7;
const float FORM = 0.55;
const float GLANZ = 0.55;
const float DURCH = 0.35;
const float AO_TIEF = 0.3;
const float BAUSCH = 1.2;
const vec3 LICHT = vec3(-0.5, 0.62, 0.6);
const vec3 FUELL = vec3(0.9, -0.25, 0.35);
const float FUELL_STAERKE = 0.35;
const vec3 GRUND = vec3(0.012, 0.012, 0.014);
const float FL_LAENGE = 0.16;
const float FL_KURVEN = 1.2;
const float FL_KREIS = 0.05;
const float FL_BIEG = 0.35;
const float FL_DICKE = 0.55;
const float FL_DECKUNG = 0.9;
const float FL_VORN = 0.55;
const vec3 FL_FARBE = vec3(0.93, 0.9, 0.82);
`;

/** je Ecke: die Neigung der Locken (glattes Feld, xyz) und die Helligkeit der Wolle (a) */
const MUSTER = /* glsl */ `
vec4 eckMuster(vec3 q, vec3 n) {
  vec3 neig = vec3(snoise(q * 2.6), snoise(q * 2.6 + 5.2), snoise(q * 2.6 + 9.7));
  float z = snoise(q * 2.2 + 1.0) * 0.6 + snoise(q * 5.5) * 0.4;
  return vec4(neig, smoothstep(-0.6, 0.7, z));
}
`;

const FRAGMENT = /* glsl */ `
/** nächste Locke (2 × 2 × 2 Zellen, Mitten in 0,15 … 0,85): Vektor zur Mitte (xyz), Abstand (w); f2: Abstand zur zweitnächsten */
vec4 locke(vec3 x, out float id, out float f2) {
  vec3 p = floor(x), f = fract(x);
  vec3 o = step(0.5, f) - 1.0;
  vec4 best = vec4(0.0, 0.0, 0.0, 9.0);
  float zweit = 9.0;
  id = 0.0;
  for (int k = 0; k <= 1; k++)
    for (int j = 0; j <= 1; j++)
      for (int i = 0; i <= 1; i++) {
        vec3 b = o + vec3(float(i), float(j), float(k));
        vec3 r = b + 0.15 + 0.7 * hash33(p + b) - f;
        float d = dot(r, r);
        if (d < best.w) { zweit = best.w; best = vec4(r, d); id = hash13(p + b + 0.37); }
        else if (d < zweit) zweit = d;
      }
  best.w = sqrt(best.w);
  f2 = sqrt(zweit);
  return best;
}
void main() {
  if (schalenGeschnitten()) discard;
  vec3 n0 = normalize(vNormal);
  vec3 L = ausSicht(normalize(LICHT));
  float wrap = clamp((dot(n0, L) + 0.6) / 1.6, 0.0, 1.0);
  float h = vH;
  if (h <= 0.0) {
    kennung = vec4(0.0, 0.0, 0.0, 1.0);
    farbe = vec4(linZuSrgb(aces(srgbZuLin(WURZEL) * (0.22 + 0.35 * wrap))), 1.0);
    return;
  }
  vec3 q = (vWurzel - uMitte) / uRadius;
  vec3 V = zumAuge(vWelt);
  float pxq = max(uMass * uRadius, 1.0);
  // die Locke kippt mit der Höhe (glattes Feld je Ecke)
  vec3 neig = vMuster.xyz;
  neig -= n0 * dot(neig, n0);
  vec3 ql = q - neig * NEIGUNG * uLaenge * h * h;
  // die Grenzen der Locken gewellt (sonst gerade Furchen): gesucht wird in einem leicht verbogenen Raum
  vec3 qw = ql / LOCKE;
  qw += WELLE * vec3(sin(qw.y * 2.3 + qw.z * 1.1), sin(qw.z * 2.1 + qw.x * 1.3), sin(qw.x * 2.5 + qw.y * 0.9));
  float lid, f2;
  vec4 lz = locke(qw, lid, f2);
  // Kuppel: das Verhältnis der Abstände zur nächsten und zur zweitnächsten Mitte (0 in der Mitte, 1 an der Grenze); seine
  // Höhenlinien sind rund (Apollonios-Kreise), nur ganz unten folgen sie der Grenze. Am Rand kurz (dunkle Furchen), in der Mitte lang
  float u = clamp(lz.w / max(f2, 1e-4), 0.0, 1.0);
  float kuppel = sqrt(1.0 - u * u);
  float lockLang = mix(0.72, 1.0, hash11(lid * 17.0)) * mix(KURZ, 1.0, kuppel);
  if (h > lockLang) discard;
  float hn = h / lockLang;
  // die Wurzel des Haars, das hier durchgeht: zur Achse der Locke zusammengezogen und um sie gedreht (mit Wellen)
  vec3 rz = lz.xyz - n0 * dot(lz.xyz, n0);
  vec3 d = -rz;
  float zus = max(1.0 - KLUMP * hn * hn, 0.25);
  float sgn = hash11(lid * 31.0) > 0.5 ? 1.0 : -1.0;
  float dreh = -sgn * (DREH * hn + KRAUS * sin(hn * KRAUS_F * 6.2832 + lid * 6.2832));
  vec3 dr = d / zus;
  dr = dr * cos(dreh) + cross(n0, dr) * sin(dreh);
  vec3 qr = ql + (dr - d) * LOCKE;
  // je Haar eine Zelle an der Wurzel (wie das Samtfell), nicht feiner als 1,6 Bildpunkte
  float s = max(DICHT, 1.6 / pxq);
  vec3 hq = qr / s;
  vec3 ci = floor(hq);
  vec3 seed = ci + 0.5 + 0.3 * (2.0 * hash33(ci) - 1.0);
  vec3 dh = hq - seed;
  dh -= n0 * dot(dh, n0);
  float dist = length(dh);
  float lang = lockLang * mix(1.0 - STREU, 1.0, hash13(ci + 3.1));
  float t = clamp(h / lang, 0.0, 1.0);
  float rr = DICKE * pow(max(1.0 - h / lang, 0.0), 0.3);
  float aa = min(fwidth(dist), 0.25) + 0.08;
  float a = (1.0 - smoothstep(rr * 0.45 - aa, rr + aa, dist)) * (1.0 - smoothstep(lang * 0.75, lang, h)) * DECKUNG;
  if (a < 0.004) discard;
  float id = hash13(ci + 0.71);
  // Farbe: cremig, je Haar etwas anders hell; tief in der Wolle dunkel, Spitzen hell
  vec3 alb = mix(DUNKEL_WOLLE, HELL_WOLLE, vMuster.a) * (1.0 - STREU_HELL * 0.5 + STREU_HELL * fract(id * 7.31));
  alb = mix(WURZEL, alb, smoothstep(0.0, 0.45, h));
  alb = mix(alb, SPITZE, smoothstep(0.6, 1.0, t) * 0.5);
  // Richtung des Haars: nach außen, dazu Drehung, Zusammenlaufen und Neigung der Locke
  float rho = length(d) * LOCKE;
  float Hl = max(lockLang * uLaenge, 1e-4);
  vec3 tang = rho > 1e-5 ? normalize(cross(n0, d)) : vec3(0.0);
  vec3 radial = rho > 1e-5 ? normalize(d) : vec3(0.0);
  vec3 T = normalize(n0 + tang * sgn * (rho * DREH / Hl) - radial * (rho * KLUMP * 2.0 * hn / Hl) + neig * NEIGUNG * 2.0 * h);
  vec3 la = srgbZuLin(alb);
  float ao = mix(AO_TIEF, 1.0, pow(h, 1.1));
  float tl = dot(T, L);
  float kd = sqrt(max(1.0 - tl * tl, 0.0));
  // jede Locke ein Bausch: zu ihrem Rand neigt sich ihre Oberfläche nach außen (Licht auf der einen, Schatten auf der anderen Seite)
  vec3 nb = normalize(n0 + radial * BAUSCH * u * u);
  float wrapB = clamp((dot(nb, L) + 0.5) / 1.5, 0.0, 1.0);
  vec3 c = la * vec3(1.0, 0.97, 0.92) * HELL * wrapB * mix(0.55, 1.0, kd) * ao;
  // kühle Aufhellung von rechts (in der Vorlage bläulich im Schatten unten rechts)
  vec3 F = ausSicht(normalize(FUELL));
  c += la * vec3(0.45, 0.6, 0.85) * FUELL_STAERKE * clamp(dot(n0, F) * 0.6 + 0.4, 0.0, 1.0) * ao;
  c *= mix(1.0 - FORM, 1.0, smoothstep(-0.5, 0.6, dot(n0, L)));
  vec3 H = normalize(L + V);
  vec3 T1 = normalize(T + n0 * 0.15), T2 = normalize(T - n0 * 0.1);
  float th1 = dot(T1, H), th2 = dot(T2, H);
  c += (vec3(1.0) * pow(sqrt(max(1.0 - th1 * th1, 0.0)), 60.0) * 0.18 + la * pow(sqrt(max(1.0 - th2 * th2, 0.0)), 14.0) * 0.5) * wrap * ao * GLANZ;
  // Wolle streut: von hinten leuchten die Spitzen
  c += la * DURCH * pow(clamp(dot(-L, V) * 0.5 + 0.5, 0.0, 1.0), 3.0) * smoothstep(0.4, 1.0, t) * wrap;
  kennung = vec4(id, h, 0.0, 1.0);
  farbe = vec4(linZuSrgb(aces(c * 1.05)) * a, a);
}
`;

const ZUSAMMEN = /* glsl */ `
void main() {
  vec4 f = texture(tSchalen, vUv);
  float dk = clamp(f.a, 0.0, 1.0);
  float a = uBuehne > 0.5 ? 1.0 : 0.0;
  farbe = vec4(f.rgb + GRUND * (1.0 - dk) * a, max(a, dk));
}
`;

/** Weg eines Flusenhaars: nach außen, zur Seite gebogen, gewellt (eine Schraube, die an der Wurzel beginnt) */
const FLUSEN_VERTEX = /* glsl */ `
vec3 flusenPunkt(float t, vec3 n, vec3 b, vec3 c, float L, float phase, float kreis, float bieg) {
  float phi = phase + t * FL_KURVEN * 6.2832;
  vec3 kr = (b * (cos(phi) - cos(phase)) + c * (sin(phi) - sin(phase))) * kreis;
  return aWurzel + L * (n * t * (1.0 - 0.15 * t) + b * (bieg * t * t) + kr);
}
void main() {
  vec3 n = normalize(aNormal);
  vec3 b = cross(n, aZufall.xyz - 0.5);
  b = dot(b, b) > 1e-8 ? normalize(b) : normalize(cross(n, vec3(0.31, 0.93, 0.17)));
  vec3 c = cross(n, b);
  float L = FL_LAENGE * uR_laenge * uRadius * mix(0.45, 1.2, aZufall.y);
  float phase = aZufall.w * 6.2832;
  float kreis = FL_KREIS * mix(0.4, 1.6, aZufall.x);
  float bieg = FL_BIEG * (aZufall.z * 2.0 - 1.0);
  float t = position.x;
  vec3 p = flusenPunkt(t, n, b, c, L, phase, kreis, bieg);
  vec3 p2 = flusenPunkt(t + 0.02, n, b, c, L, phase, kreis, bieg);
  vT = normalize(p2 - p);
  vWelt = p;
  vN = n;
  vt = t;
  vQuer = position.y;
  vZufall = aZufall;
  flusenBand(p, p2, FL_DICKE * uDpr * (1.0 - 0.55 * t));
  // in der Wolle unsichtbar (der Teil, der in den Locken steckt), zur Spitze ausgeblendet
  float innen = clamp(uLaenge * 0.75 / max(L / uRadius, 1e-4), 0.0, 0.85);
  vDeck *= smoothstep(innen * 0.8, innen * 1.15 + 0.02, t) * (1.0 - smoothstep(0.7, 1.0, t));
  // vorn auf der Wolle blass, am Umriss voll (dort stehen die Flusen quer zum Blick)
  vec4 pv = viewMatrix * vec4(aWurzel, 1.0);
  vec3 zv = uOrtho > 0.5 ? vec3(0.0, 0.0, 1.0) : normalize(-pv.xyz);
  float zug = abs(dot(normalize(mat3(viewMatrix) * n), zv));
  vDeck *= mix(FL_VORN, 1.0, smoothstep(0.25, 0.8, 1.0 - zug));
  if (flusenGeschnitten()) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
}
`;

const FLUSEN_FRAGMENT = /* glsl */ `
void main() {
  float a = vDeck * (1.0 - smoothstep(0.3, 1.0, abs(vQuer))) * FL_DECKUNG;
  if (a < 0.003) discard;
  vec3 T = normalize(vT);
  vec3 n = normalize(vN);
  vec3 V = zumAuge(vWelt);
  vec3 L = ausSicht(normalize(LICHT));
  vec3 la = srgbZuLin(FL_FARBE * (0.88 + 0.2 * vZufall.w));
  float wrap = clamp((dot(n, L) + 0.6) / 1.6, 0.0, 1.0);
  float tl = dot(T, L);
  float kd = sqrt(max(1.0 - tl * tl, 0.0));
  vec3 c = la * vec3(1.0, 0.97, 0.92) * HELL * mix(0.45, 1.0, wrap) * mix(0.5, 1.0, kd);
  vec3 F = ausSicht(normalize(FUELL));
  c += la * vec3(0.45, 0.6, 0.85) * FUELL_STAERKE * clamp(dot(n, F) * 0.6 + 0.4, 0.0, 1.0);
  // am Umriss fangen die Flusen Licht (wie in der Vorlage: ein heller Kranz)
  c += la * 0.5 * pow(1.0 - abs(dot(n, V)), 2.0);
  vec3 H = normalize(L + V);
  float th = dot(T, H);
  c += la * pow(sqrt(max(1.0 - th * th, 0.0)), 14.0) * 0.45 * wrap * GLANZ;
  c += la * DURCH * 1.6 * pow(clamp(dot(-L, V) * 0.5 + 0.5, 0.0, 1.0), 3.0);
  c *= mix(1.0 - FORM, 1.0, smoothstep(-0.5, 0.6, dot(n, L)));
  kennung = vec4(0.0, 1.0, 0.0, a);
  farbe = vec4(linZuSrgb(aces(c * 1.05)) * a, a);
}
`;

const regler: ReglerZeile[] = [
  { k: 'laenge', name: 'Länge', min: 0.4, max: 2, schritt: 0.05, grund: 1 },
  { k: 'flusen', name: 'Flusen', min: 0, max: 2, schritt: 0.05, grund: 1 },
];

const art: SchalenArt = {
  name: 'schafwolle',
  regler,
  uniforms: {},
  fragment: `${K}\n${FRAGMENT}`,
  muster: `${K}\n${MUSTER}`,
  musterSchluessel: () => '',
  zusammen: `${K}\n${ZUSAMMEN}`,
  durchsicht: true,
  flusen: { hoechstens: 20000, stuecke: 12, vertex: `${K}\n${FLUSEN_VERTEX}`, fragment: `${K}\n${FLUSEN_FRAGMENT}` },
  werte: (w, k) => {
    const L = 0.11 * (w.regler.laenge ?? 1);
    const lPx = L * k.u.uMass.value * k.u.uRadius.value;
    return {
      // eine Schicht im Bild höchstens rund 1,2 Bildpunkte dick, 32 bis 56 Schalen
      voll: Math.max(32, Math.min(56, Math.round(lPx / 1.2))),
      laenge: L,
      strich: 0,
      schwer: 0.1,
      flusen: 10000 * (w.regler.flusen ?? 1),
    };
  },
};

/** Schafwolle nach Vorlage 08: cremige Locken mit dunklen Lücken, weiche Flusen am Umriss */
export const SCHAFWOLLE = schalenVoreinstellung(
  {
    id: 'schafwolle',
    name: 'Schafwolle',
    gruppe: 'Fell & Flausch',
    zeile: 'Nach Florians Vorlage: cremige Locken aus Schalen (Kuppeln mit dunklen Lücken, die Haare drehen sich um die Locke und laufen zur Spitze zusammen), dazu echte Flusen als dünne Haare am Umriss, Licht weich von oben links, kühl von rechts',
  },
  art,
);
