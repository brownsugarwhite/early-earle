/**
 * Samtfell (24.11.2026; Florian: „schau mal, ich habe so schöne haare gefunden … Bekommst du das mit shadern exakt so hin?“, dann
 * „die giraffe könnte ein shader sein“). Plan `docs/plans/2026-11-24-ozzy-fell-nach-vorlagen.md`, Vorlagen
 * `docs/look/ozzy/shader/vorlagen/2026-11-24-fell-02-giraffe.png` und `…-06-braun.png`.
 *
 * Beide Vorlagen sind Echtzeit-Fell aus Schalen wie unseres (am Umriss der Giraffe sieht man die geraden Kanten des Kugelnetzes),
 * nur anders gemacht als unser Fell:
 * - **keine Büschel:** Unsere Büschel im Raster lesen sich als Nadelkissen. Hier ist jedes Haar für sich, dicht und fein.
 * - **flach im Strich:** Die Haare liegen fast an (Neigung längs des Strichs größer als die Höhe); jedes Haar ist im Bild ein
 *   langer, weicher Streifen. Daher das Gekämmte der Vorlagen.
 * - **viele Schalen**, Wurzeln dunkel, Spitzen hell, Licht längs der Haare (Kajiya-Kay mit zwei Glanzlinien), Saum am Umriss.
 * - **Muster** je Ecke (Flecken der Giraffe mit breiten hellen Adern); am Rand eines Flecks entscheidet jedes Haar für sich (so wird
 *   die Grenze fransig wie in der Vorlage, nicht scharf).
 * Je Vorlage eine eigene, feste Fassung (Florians Regel: eigene ausgefeilte Versionen pro Stil), nur Länge und Strich als Regler.
 */
import type { ReglerZeile, Voreinstellung } from '../kern';
import { type SchalenArt, schalenVoreinstellung } from './schalen';

type Samt = {
  id: string;
  name: string;
  zeile: string;
  /** Länge der Haare (Anteil vom Radius), Neigung längs der Körperachse und nach unten, Schalen bei voller Güte */
  laenge: number;
  strich: number;
  schwer: number;
  schalen: number;
  /** Abstand der Haare (Anteil vom Radius), Radius eines Haars in Zellen, wie sehr die Längen streuen */
  dicht: number;
  dicke: number;
  streu: number;
  /** GLSL-Konstanten (sRGB): Wurzel, Spitze, Ader; wie viel der Länge die Spitze hell ist; Glanz */
  wurzel: string;
  spitze: string;
  ader: string;
  spitzeAnteil: number;
  glanz: number;
  /** wie verschieden hell die Haare sind (0 … 1), Stärke des Lichts, wie dunkel die Seite fern vom Licht wird (0 … 1) */
  streuHell: number;
  hell: number;
  form: number;
  /** wie deckend ein Haar in einer Schale ist (gemischt, innen nach außen) */
  deckung?: number;
  /** wie hell der Saum am Umriss wird (die Haare stehen dort quer zum Blick) */
  saum?: number;
  /** Strähnen: Gruppen von Haaren gleicher Helligkeit, längs des Strichs gestreckt (Frequenz längs und quer, Stärke) */
  straehneLaengs: number;
  straehneQuer: number;
  straehne: number;
  /** Licht (Sicht: x rechts, y oben, z zum Betrachter) */
  licht: string;
  /** Grund der Bühne oben und unten (sRGB) */
  grundOben: string;
  grundUnten: string;
  /** GLSL: vec4 eckMuster(vec3 q, vec3 n): rgb Farbe des Haars, a Ader 0 … 1 */
  muster: string;
};

const FRAGMENT = /* glsl */ `
void main() {
  if (schalenGeschnitten()) discard;
  vec3 n0 = normalize(vNormal);
  // (gemischt, nicht gezittert: das Zittern der Höhe gäbe hier Körner)
  float h = vH;
  vec3 q = (vWurzel - uMitte) / uRadius;
  vec3 V = zumAuge(vWelt);
  float pxq = max(uMass * uRadius, 1.0);
  // je Haar eine Zelle an der Wurzel (vWurzel ist in jeder Schale die Wurzel des Haars, das hier durchgeht: so bleibt ein Haar über
  // alle Schalen dasselbe und liegt im Bild als schräger Streifen); nicht feiner als 1,6 Bildpunkte
  float s = max(DICHT, 1.6 / pxq);
  vec3 hq = q / s;
  vec3 ci = floor(hq);
  vec3 hv = hash33(ci);
  vec3 seed = ci + 0.5 + 0.3 * (2.0 * hv - 1.0);
  vec3 d = hq - seed;
  d -= n0 * dot(d, n0);
  float dist = length(d);
  float lang = mix(1.0 - STREU, 1.0, hash13(ci + 3.1));
  float t = clamp(h / lang, 0.0, 1.0);
  float rr = DICKE * pow(max(1.0 - h / lang, 0.0), 0.25);
  // weich: der Querschnitt eines Haars fällt nach außen sanft ab, die Spitze blendet aus (so fließen die Haare ineinander wie in
  // den Vorlagen, statt als scharfe Striche mit Lücken dazwischen zu stehen)
  float aa = min(fwidth(dist), 0.25) + 0.08;
  float a = h <= 0.0 ? 1.0 : (1.0 - smoothstep(rr * 0.45 - aa, rr + aa, dist)) * (1.0 - smoothstep(lang * 0.7, lang, h)) * DECKUNG;
  if (a < 0.004) discard;
  float id = hash13(ci + 0.71);
  // Farbe: Muster je Ecke; am Rand eines Flecks entscheidet jedes Haar für sich (fransige Grenze)
  vec3 alb = vMuster.rgb;
  float ader = smoothstep(id * 0.7 + 0.15 - 0.08, id * 0.7 + 0.15 + 0.08, vMuster.a);
  alb = mix(alb, ADER, ader);
  alb *= 1.0 - STREU_HELL * 0.5 + STREU_HELL * fract(id * 7.31);
  // Strähnen: Gruppen von Wurzeln gleicher Helligkeit, längs des Strichs gestreckt (so liegen helle und dunkle Strähnen nebeneinander)
  vec3 Sd = length(vStrich) > 1e-4 ? normalize(vStrich) : normalize(cross(n0, vec3(0.31, 0.93, 0.17)));
  vec3 Sq = normalize(cross(n0, Sd));
  vec3 qs = vec3(dot(q, Sd) * STR_L, dot(q, Sq) * STR_Q, dot(q, n0) * 2.0);
  float straehne = snoise(qs) * 0.65 + snoise(qs * vec3(2.1, 2.3, 1.0) + 5.0) * 0.35;
  float hellStr = smoothstep(-0.35, 0.55, straehne);
  // Wurzel dunkel, Spitze hell (in hellen Strähnen mehr)
  alb = mix(WURZEL, alb, smoothstep(0.0, 0.35, t));
  float spitzeHier = smoothstep(1.0 - SPITZE_ANTEIL * mix(1.0 - STRAEHNE * 0.8, 1.0 + STRAEHNE * 0.4, hellStr), 1.0, t);
  alb = mix(alb, mix(SPITZE, ADER, ader * 0.6) * (0.9 + 0.2 * id), spitzeHier * mix(0.8 - STRAEHNE * 0.5, 0.95, hellStr));
  // die Strähne zuletzt auf die ganze Farbe (sonst decken die hellen Spitzen sie zu)
  alb *= mix(1.0 - STRAEHNE * 0.7, 1.0 + STRAEHNE * 0.35, hellStr);
  // Licht längs des Haars (Kajiya-Kay, zwei Glanzlinien), Wurzeln im Schatten, Saum am Umriss
  vec3 T = normalize(n0 + vStrich * 2.0 * h);
  vec3 L = ausSicht(normalize(LICHT));
  vec3 la = srgbZuLin(alb);
  float ao = mix(0.42, 1.0, pow(t, 0.6));
  float wrap = clamp((dot(n0, L) + 0.5) / 1.5, 0.0, 1.0);
  float tl = dot(T, L);
  float kd = sqrt(max(1.0 - tl * tl, 0.0));
  vec3 c = la * (vec3(1.0, 0.96, 0.9) * HELL * wrap * mix(0.6, 1.0, kd) + vec3(0.24, 0.27, 0.32) * (0.65 + 0.35 * n0.y)) * ao;
  c *= mix(1.0 - FORM, 1.0, smoothstep(-0.4, 0.7, dot(n0, L)));
  vec3 H = normalize(L + V);
  vec3 T1 = normalize(T + n0 * 0.2), T2 = normalize(T - n0 * 0.15);
  float th1 = dot(T1, H), th2 = dot(T2, H);
  c += (vec3(1.0) * pow(sqrt(max(1.0 - th1 * th1, 0.0)), 80.0) * 0.2 + la * pow(sqrt(max(1.0 - th2 * th2, 0.0)), 18.0) * 0.6) * wrap * ao * GLANZ;
  float nv = clamp(abs(dot(n0, V)), 0.0, 1.0);
  c += la * pow(1.0 - nv, 2.0) * SAUM * wrap * t;
  if (h <= 0.0) c = srgbZuLin(WURZEL) * (0.35 + 0.5 * wrap);
  kennung = vec4(id, h, 0.0, 1.0);
  farbe = vec4(linZuSrgb(aces(c * 1.05)) * a, a);
}
`;

const ZUSAMMEN = /* glsl */ `
void main() {
  vec2 qb = gl_FragCoord.xy / uAufl;
  vec4 f = texture(tSchalen, vUv);
  float dk = clamp(f.a, 0.0, 1.0);
  float a = uBuehne > 0.5 ? 1.0 : 0.0;
  vec3 grund = mix(GRUND_UNTEN, GRUND_OBEN, smoothstep(0.0, 1.0, qb.y));
  vec3 aus = f.rgb + grund * (1.0 - dk) * a;
  farbe = vec4(aus, max(a, dk));
}
`;

function samtfell(o: Samt): Voreinstellung {
  const konstanten = `
const float DICHT = ${o.dicht.toFixed(5)};
const float DICKE = ${o.dicke.toFixed(3)};
const float STREU = ${o.streu.toFixed(3)};
const vec3 WURZEL = ${o.wurzel};
const vec3 SPITZE = ${o.spitze};
const vec3 ADER = ${o.ader};
const float SPITZE_ANTEIL = ${o.spitzeAnteil.toFixed(3)};
const float GLANZ = ${o.glanz.toFixed(3)};
const float STREU_HELL = ${o.streuHell.toFixed(3)};
const float HELL = ${o.hell.toFixed(3)};
const float FORM = ${o.form.toFixed(3)};
const float DECKUNG = ${(o.deckung ?? 0.9).toFixed(3)};
const float SAUM = ${(o.saum ?? 0.6).toFixed(3)};
const float STR_L = ${o.straehneLaengs.toFixed(3)};
const float STR_Q = ${o.straehneQuer.toFixed(3)};
const float STRAEHNE = ${o.straehne.toFixed(3)};
const vec3 LICHT = ${o.licht};
const vec3 GRUND_OBEN = ${o.grundOben};
const vec3 GRUND_UNTEN = ${o.grundUnten};
`;
  const regler: ReglerZeile[] = [
    { k: 'laenge', name: 'Länge', min: 0.3, max: 2.5, schritt: 0.05, grund: 1 },
    { k: 'strich', name: 'Strich', min: 0, max: 2, schritt: 0.05, grund: 1 },
  ];
  const art: SchalenArt = {
    name: o.id,
    regler,
    uniforms: {},
    fragment: `${konstanten}\n${FRAGMENT}`,
    muster: `${konstanten}\n${o.muster}`,
    musterSchluessel: () => '',
    zusammen: `${konstanten}\n${ZUSAMMEN}`,
    // die Schalen durchscheinend gemischt, von innen nach außen (wie die Vorlagen: weich, ohne Körner); die Haut zuerst deckend
    durchsicht: true,
    werte: (w, k) => {
      const L = o.laenge * (w.regler.laenge ?? 1);
      const lPx = L * k.u.uMass.value * k.u.uRadius.value;
      return {
        // so viele Schalen, dass eine Schicht im Bild höchstens rund 1,5 Bildpunkte dick ist, mindestens die der Fassung
        voll: Math.max(o.schalen, Math.min(48, Math.round(lPx / 1.5))),
        laenge: L,
        strich: o.strich * (w.regler.strich ?? 1),
        schwer: o.schwer * (w.regler.strich ?? 1),
      };
    },
  };
  return schalenVoreinstellung({ id: o.id, name: o.name, gruppe: 'Fell & Flausch', zeile: o.zeile }, art);
}

/** Giraffe nach Vorlage 02: kurzer, dichter Samt, flach gekämmt, große runde Flecken mit breiten cremefarbenen Adern */
export const GIRAFFENFELL = samtfell({
  id: 'giraffenfell',
  name: 'Giraffenfell',
  zeile: 'Nach Florians Vorlage: kurzer, dichter Samt aus Schalen, flach gekämmt (die Haare liegen als weiche Streifen), große runde Flecken in Orange und Braun mit breiten cremefarbenen Adern, fransige Ränder Haar für Haar, helle Spitzen',
  laenge: 0.05,
  strich: 1.3,
  schwer: 0.0,
  schalen: 32,
  dicht: 0.0045,
  dicke: 0.62,
  streu: 0.35,
  wurzel: 'vec3(0.36, 0.16, 0.05)',
  spitze: 'vec3(0.98, 0.7, 0.36)',
  ader: 'vec3(0.98, 0.83, 0.56)',
  spitzeAnteil: 0.35,
  glanz: 0.3,
  streuHell: 0.3,
  hell: 1.45,
  form: 0.4,
  straehneLaengs: 2.0,
  straehneQuer: 14.0,
  straehne: 0.18,
  licht: 'vec3(0.5, 0.65, 0.58)',
  grundOben: 'vec3(0.6, 0.73, 0.83)',
  grundUnten: 'vec3(0.62, 0.74, 0.84)',
  muster: /* glsl */ `
vec4 eckMuster(vec3 q, vec3 n) {
  // große runde Flecken (Zellen im Raum, verwirbelt), breite helle Adern dazwischen
  vec3 w = q * 2.6 + 0.25 * vec3(snoise(q * 1.4), snoise(q * 1.4 + 4.0), snoise(q * 1.4 + 8.0));
  vec3 vo = voronoi3(w);
  // runde Flecken: der Abstand zur Mitte der Zelle gegen den zum Rand gewogen (Ecken abgerundet), breite weiche Adern
  float rand = vo.y - vo.x + 0.06 * snoise(q * 5.0);
  float rund = smoothstep(0.82, 0.58, vo.x);
  float ader = 1.0 - smoothstep(0.07, 0.2, rand) * rund;
  vec3 fleck = mix(vec3(0.62, 0.27, 0.06), vec3(0.74, 0.36, 0.09), hash11(vo.z * 13.0)) * (0.9 + 0.16 * snoise(q * 3.5 + 2.0));
  return vec4(fleck, ader);
}
`,
});

/** Braun nach Vorlage 06: längeres Fell, mit der Schwerkraft gekämmt (Wirbel oben), dunkle Wurzeln, helle blonde Spitzen */
export const BRAUNFELL = samtfell({
  id: 'braunfell',
  name: 'Braunes Fell',
  zeile: 'Nach Florians Vorlage: längeres Fell aus Schalen, mit der Schwerkraft gekämmt (Wirbel oben), dunkelbraune Wurzeln, helle Spitzen, Strähnen hell und dunkel gemischt, weiche Streifen',
  laenge: 0.17,
  strich: 0.15,
  schwer: 0.9,
  schalen: 40,
  dicht: 0.005,
  dicke: 0.6,
  streu: 0.45,
  wurzel: 'vec3(0.08, 0.06, 0.04)',
  spitze: 'vec3(0.8, 0.72, 0.57)',
  ader: 'vec3(0.66, 0.58, 0.45)',
  spitzeAnteil: 0.6,
  glanz: 0.6,
  streuHell: 0.5,
  hell: 1.8,
  form: 0.65,
  straehneLaengs: 1.2,
  straehneQuer: 5.0,
  straehne: 0.7,
  saum: 0.15,
  licht: 'vec3(0.45, 0.7, 0.55)',
  grundOben: 'vec3(0.66, 0.66, 0.66)',
  grundUnten: 'vec3(0.6, 0.6, 0.6)',
  muster: /* glsl */ `
vec4 eckMuster(vec3 q, vec3 n) {
  // Braun mit großen hellen und dunklen Zonen; a: wo helle Strähnen gehäuft sind
  float z = snoise(q * 2.4 + 3.0) * 0.6 + snoise(q * 6.0) * 0.4;
  vec3 c = mix(vec3(0.2, 0.15, 0.1), vec3(0.38, 0.3, 0.2), smoothstep(-0.5, 0.6, z));
  return vec4(c, smoothstep(0.2, 0.9, snoise(q * 4.0 + 7.0)) * 0.5);
}
`,
});
