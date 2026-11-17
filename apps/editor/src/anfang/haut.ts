/**
 * Material der Haut (Probe „Anfang einer Form“, 15.11.2026): Seifenhaut aus der Physik der dünnen Schicht.
 *
 * Die Farbe einer Seifenhaut kommt aus ihrer Dicke: Licht wird an Vorder- und Rückseite gespiegelt, die beiden Wellen löschen sich
 * je nach Gangunterschied (2 · n · d · cos θ) für manche Wellenlängen aus. `duennschichtTafel` rechnet das einmal spektral (81
 * Wellenlängen, Normspektralwerte nach Wyman, Sloan und Shirley 2013) und legt die Farbe über dem Gangunterschied in eine Tafel,
 * wie die Interferenzfarben nach Michel-Lévy. Alle Fassungen lesen dieselbe Tafel; sie unterscheiden sich darin, wie viel man
 * davon sieht und wie abstrakt es ist:
 *
 *   0 Seifenhaut   durchsichtig, Farben in der Spiegelung eines Ateliers mit zwei Leuchtflächen
 *   1 Irisdruck    deckend wie Perlmutt, drei harte Lichtstufen mit Verlauf je Stufe, die Schichtfarben in Bändern darüber
 *   2 Horizont     gläsern, spiegelt einen abstrakten Horizont (harte Kante, Verlauf je Fläche); nur an der Kante spaltet sich das Licht
 *   3 Höhenlinien  weiß, feine farbige Linien gleicher Dicke: Sie folgen der Wölbung und drängen sich, wo die Haut gedehnt wird
 *
 * Gemischt wird in linearem Licht in einem eigenen Ziel (Halbfloat), erst am Ende nach sRGB. Durchsichtige Fassungen zeichnen je
 * Seite zwei Durchgänge: erst den Durchlass (multiplizieren), dann die Spiegelung (addieren); hinten vor vorn.
 */

import {
  AddEquation,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  type Camera,
  Color,
  CustomBlending,
  DataTexture,
  FloatType,
  FrontSide,
  HalfFloatType,
  LinearFilter,
  Mesh,
  NoBlending,
  OneFactor,
  OneMinusSrcAlphaFactor,
  OrthographicCamera,
  type PerspectiveCamera,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  SrcColorFactor,
  type Texture,
  Vector2,
  Vector3,
  Vector4,
  WebGLRenderTarget,
  type WebGLRenderer,
  ZeroFactor,
} from 'three';
import type { Koerper } from './form';
import { type WandStaerke, WandSchatten, type Wuerfel } from './schatten';

export const FASSUNGEN = ['Seifenhaut', 'Irisdruck', 'Horizont', 'Höhenlinien'] as const;
export type Fassung = 0 | 1 | 2 | 3;
const DURCHSICHTIG = [true, false, true, false];

// ---------- Farbtafel der dünnen Schicht ----------

const OPD_MAX = 2600;

function lappen(l: number, mu: number, t1: number, t2: number): number {
  const t = (l - mu) * (l < mu ? t1 : t2);
  return Math.exp(-0.5 * t * t);
}
function cieX(l: number): number {
  return 1.056 * lappen(l, 599.8, 0.0264, 0.0323) + 0.362 * lappen(l, 442.0, 0.0624, 0.0374) - 0.065 * lappen(l, 501.1, 0.049, 0.0382);
}
function cieY(l: number): number {
  return 0.821 * lappen(l, 568.8, 0.0213, 0.0247) + 0.286 * lappen(l, 530.9, 0.0613, 0.0322);
}
function cieZ(l: number): number {
  return 1.217 * lappen(l, 437.0, 0.0845, 0.0278) + 0.681 * lappen(l, 459.0, 0.0385, 0.0725);
}
function xyzZuRgb(X: number, Y: number, Z: number): [number, number, number] {
  return [3.2406 * X - 1.5372 * Y - 0.4986 * Z, -0.9689 * X + 1.8758 * Y + 0.0415 * Z, 0.0557 * X - 0.204 * Y + 1.057 * Z];
}

/**
 * Farbe der Spiegelung einer freien Seifenhaut (n = 1,33, beidseits Luft) über dem Gangunterschied 0 … 2600 nm, linear, so
 * geteilt, dass die stärkste Spiegelung (Phase π) 1 ist. Weiß ist neutral (geteilt durch die Farbe eines flachen Spektrums).
 */
export function duennschichtTafel(stufen = 1024): Float32Array {
  const r = (1.33 - 1) / (1.33 + 1);
  const r2 = r * r;
  const r4 = r2 * r2;
  const L: number[] = [];
  for (let l = 380; l <= 780; l += 5) L.push(l);
  const xb = L.map(cieX);
  const yb = L.map(cieY);
  const zb = L.map(cieZ);
  let Xw = 0;
  let Yw = 0;
  let Zw = 0;
  for (let i = 0; i < L.length; i++) {
    Xw += xb[i]!;
    Yw += yb[i]!;
    Zw += zb[i]!;
  }
  const w = xyzZuRgb(Xw, Yw, Zw);
  const rMax = (4 * r2) / ((1 + r2) * (1 + r2));
  const daten = new Float32Array(stufen * 4);
  for (let k = 0; k < stufen; k++) {
    const opd = (k / (stufen - 1)) * OPD_MAX;
    let X = 0;
    let Y = 0;
    let Z = 0;
    for (let i = 0; i < L.length; i++) {
      const c = Math.cos((2 * Math.PI * opd) / L[i]!);
      const R = (2 * r2 * (1 - c)) / (1 + r4 - 2 * r2 * c);
      X += R * xb[i]!;
      Y += R * yb[i]!;
      Z += R * zb[i]!;
    }
    const rgb = xyzZuRgb(X, Y, Z);
    for (let c = 0; c < 3; c++) daten[k * 4 + c] = Math.max(0, rgb[c]! / w[c]! / rMax);
    daten[k * 4 + 3] = 1;
  }
  return daten;
}

// ---------- Shader ----------

/**
 * Ozzy: die Rückseite als bis zu vier konvexe Flächen im Bild, je bis zu fünf Kanten (Gerätepunkte, y nach unten; Abstand
 * x · px + y · py + z, innen positiv, einen Gerätepunkt weich). Unbenutzte Kanten liegen weit draußen (0, 0, 1e6).
 */
export const HINTEN_KANTEN = 20;
const HINTEN_GLSL = /* glsl */ `
uniform vec3 uHinten[${HINTEN_KANTEN}];
uniform int uHintenZahl;
uniform float uKanteHoehe;
uniform float uKanteLinks;
// der Ort dieses Bildpunkts im ganzen Bild (Gerätepunkte, y nach unten), auch wenn nur ein Ausschnitt gezeichnet wird
vec2 bildOrt() {
  return vec2(gl_FragCoord.x + uKanteLinks, uKanteHoehe - gl_FragCoord.y);
}
float hintenBei(vec2 p) {
  float h = 0.0;
  for (int k = 0; k < 4; k++) {
    if (k >= uHintenZahl) break;
    float d = 1.0;
    for (int e = 0; e < 5; e++) {
      vec3 r = uHinten[k * 5 + e];
      d = min(d, clamp(0.5 + r.x * p.x + r.y * p.y + r.z, 0.0, 1.0));
    }
    h = max(h, d);
  }
  return h;
}
`;

/**
 * Das Rauschen des Flusses (Gradientenrauschen in drei Richtungen: Lage im Blatt und Zeit) und der Fluss selbst, wie ihn die Dicke
 * der Haut braucht. A3 (17.11.): Der Fluss hängt nur an der Lage im Blatt, der Zeit und dem Wind; er wird einmal je Bild in eine
 * kleine Textur gerechnet (`RAUSCH_FRAGMENT`) statt in jedem der vier Durchgänge für jeden Bildpunkt (gemessen: 5 bis 9 ms je Bild).
 */
const RAUSCH_GLSL = /* glsl */ `
vec3 hash3(vec3 p) {
  p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}
float rauschen(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(dot(hash3(i), f), dot(hash3(i + vec3(1.0, 0.0, 0.0)), f - vec3(1.0, 0.0, 0.0)), u.x),
                 mix(dot(hash3(i + vec3(0.0, 1.0, 0.0)), f - vec3(0.0, 1.0, 0.0)), dot(hash3(i + vec3(1.0, 1.0, 0.0)), f - vec3(1.0, 1.0, 0.0)), u.x), u.y),
             mix(mix(dot(hash3(i + vec3(0.0, 0.0, 1.0)), f - vec3(0.0, 0.0, 1.0)), dot(hash3(i + vec3(1.0, 0.0, 1.0)), f - vec3(1.0, 0.0, 1.0)), u.x),
                 mix(dot(hash3(i + vec3(0.0, 1.0, 1.0)), f - vec3(0.0, 1.0, 1.0)), dot(hash3(i + vec3(1.0, 1.0, 1.0)), f - vec3(1.0, 1.0, 1.0)), u.x), u.y), u.z);
}
// der Fluss an einer Lage im Blatt (−1 … 1 um die Form), mit Wind und Zeit
float flussBei(vec2 blatt, vec2 wind, float zeit) {
  vec2 p = blatt * 1.55 + wind;
  float t = zeit * 0.075;
  vec2 w = vec2(rauschen(vec3(p * 0.85, t)), rauschen(vec3(p * 0.85 + 4.7, t + 2.3)));
  return 0.62 * rauschen(vec3(p * 1.45 + w * 1.5, t * 1.4)) + 0.26 * rauschen(vec3(p * 3.3 + w * 0.9, t * 2.1));
}
`;
/** halbe Breite des Fensters der Fluss-Textur im Blatt (die Form liegt in −1 … 1) und ihre Kantenlänge in Bildpunkten */
const RAUSCH_HALB = 1.5;
const RAUSCH_PUNKTE = 384;
const RAUSCH_FRAGMENT = /* glsl */ `
precision highp float;
uniform float uZeit;
uniform vec2 uWind;
uniform float uRauschHalb;
varying vec2 vUv;
${RAUSCH_GLSL}
void main() {
  gl_FragColor = vec4(flussBei((vUv * 2.0 - 1.0) * uRauschHalb, uWind, uZeit), 0.0, 0.0, 1.0);
}
`;

const VERTEX = /* glsl */ `
attribute float aHoehe;
attribute float aSeite;
attribute vec2 aBlatt;
attribute float aDehnung;
attribute float aSicht;
varying float vSicht;
varying vec3 vPos;
varying vec3 vNormal;
varying float vHoehe;
varying float vSeite;
varying vec2 vBlatt;
varying float vDehnung;
// A3: nur ein Ausschnitt des Bilds wird gezeichnet (Maßstab und Versatz im Bildraum; das ganze Bild: 1, 1, 0, 0)
uniform vec4 uAusschnitt;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vPos = w.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vHoehe = aHoehe;
  vSeite = aSeite;
  vBlatt = aBlatt;
  vDehnung = aDehnung;
  vSicht = aSicht;
  gl_Position = projectionMatrix * viewMatrix * w;
  gl_Position.xy = gl_Position.xy * uAusschnitt.xy + uAusschnitt.zw * gl_Position.w;
}
`;

const FRAGMENT = /* glsl */ `
precision highp float;
uniform sampler2D uTafel;
uniform float uOpdMax;
uniform float uZeit;
uniform int uFassung;
uniform int uNacht;
uniform vec4 uSchnitt;
uniform int uPass;
uniform float uAnteil;
uniform float uDeckung;
uniform vec3 uHauch;
uniform float uHauchStaerke;
uniform float uHauchRadius;
uniform vec2 uWind;
uniform float uDicke;
uniform float uSpannung;
uniform float uSicht;
uniform int uRahmen;
uniform float uSchatten;
uniform vec3 uSchattenFarbe;
uniform sampler2D uRausch;
uniform float uRauschHalb;
uniform int uRauschAn;
varying float vSicht;
varying vec3 vPos;
varying vec3 vNormal;
varying float vHoehe;
varying float vSeite;
varying vec2 vBlatt;
varying float vDehnung;

${HINTEN_GLSL}
// Nacht hier: ganz (Nacht der Studie) oder auf einer Fläche der Rückseite (Ozzy: Wenden, Wände von hinten)
float nachtHier() {
  if (uNacht == 1) return 1.0;
  return hintenBei(bildOrt());
}

${RAUSCH_GLSL}
// Dicke der Haut hier (nm): Fluss (Marangoni), oben dünner, gedehnt dünner, der Zeiger haucht sie an
float dickeHier(out float hauch) {
  // der Fluss: im Fenster der Textur aus ihr (einmal je Bild gerechnet), außerhalb (weit gezogene Formen) wie in ihr gerechnet
  float n;
  vec2 q = vBlatt / uRauschHalb;
  if (uRauschAn == 1 && max(abs(q.x), abs(q.y)) < 0.97) n = texture2D(uRausch, q * 0.5 + 0.5).r;
  else n = flussBei(vBlatt, uWind, uZeit);
  float d = uDicke * (1.0 + 0.62 * n);
  d *= mix(1.22, 0.74, smoothstep(-1.0, 1.0, vBlatt.y));
  // gedehnt dünner, gestaucht dicker, beides begrenzt (sonst wird stark Gedehntes farblos weiß und stark Gestauchtes blass)
  d *= pow(clamp(vDehnung, 0.55, 6.0), -uSpannung);
  vec3 dp = vPos - uHauch;
  hauch = exp(-dot(dp, dp) / (uHauchRadius * uHauchRadius)) * uHauchStaerke;
  d *= 1.0 - 0.62 * hauch;
  // nie dünner als die erste Ordnung (gold, weiß): so bleibt der gedehnte Hals sichtbar, statt schwarz und unsichtbar zu werden
  return max(d, 165.0);
}

float gangunterschied(float d, float cosI) {
  float cosT = sqrt(max(0.0, 1.0 - (1.0 - cosI * cosI) / (1.33 * 1.33)));
  return 2.0 * 1.33 * d * cosT;
}
vec3 tafel(float opd) {
  return texture2D(uTafel, vec2(clamp(opd / uOpdMax, 0.0, 1.0), 0.5)).rgb;
}

// Leuchtfläche (abgerundetes Rechteck) in Richtung dir, Größe als Tangens
float kasten(vec3 r, vec3 dir, vec2 halb, float weich) {
  vec3 t = normalize(cross(dir, vec3(0.0, 1.0, 0.0)));
  vec3 b = cross(t, dir);
  float f = dot(r, dir);
  if (f <= 0.0) return 0.0;
  vec2 q = vec2(dot(r, t), dot(r, b)) / f;
  vec2 e = abs(q) - halb;
  float sd = length(max(e, 0.0)) + min(max(e.x, e.y), 0.0) - 0.05;
  return 1.0 - smoothstep(-weich, weich, sd);
}

// Nacht: ein tiefer Raum mit hellem Streifen am Horizont, damit der Rand leuchtet
vec3 atelierNacht(vec3 r) {
  vec3 c = mix(vec3(0.010, 0.016, 0.030), vec3(0.060, 0.085, 0.140), smoothstep(-0.7, 0.05, r.y));
  c = mix(c, vec3(0.030, 0.045, 0.085), smoothstep(0.05, 0.9, r.y));
  c += vec3(0.10, 0.12, 0.18) * exp(-abs(r.y - 0.04) * 9.0);
  c += vec3(2.4, 2.35, 2.25) * kasten(r, normalize(vec3(-0.52, 0.6, 0.6)), vec2(0.42, 0.24), 0.05);
  c += vec3(0.9, 0.95, 1.1) * kasten(r, normalize(vec3(0.78, 0.18, 0.32)), vec2(0.16, 0.5), 0.06);
  return c;
}
// Papier: ein heller Raum (das Blatt), unten etwas dunkler, zwei Leuchtflächen
vec3 atelierTag(vec3 r) {
  vec3 c = mix(vec3(0.42, 0.43, 0.47), vec3(0.80, 0.81, 0.84), smoothstep(-0.55, 0.3, r.y));
  c = mix(c, vec3(0.90, 0.905, 0.92), smoothstep(0.3, 1.0, r.y));
  c += vec3(2.2) * kasten(r, normalize(vec3(-0.52, 0.6, 0.6)), vec2(0.42, 0.24), 0.05);
  c += vec3(1.1) * kasten(r, normalize(vec3(0.78, 0.18, 0.32)), vec2(0.16, 0.5), 0.06);
  return c;
}
vec3 atelier(vec3 r) {
  float n = nachtHier();
  if (n >= 1.0) return atelierNacht(r);
  if (n <= 0.0) return atelierTag(r);
  return mix(atelierTag(r), atelierNacht(r), n);
}

// abstrakter Horizont (Earle): Himmel und Land, harte Kante, Verlauf in jeder Fläche; versatz hebt die Kante (für die Aufspaltung)
vec3 horizont(vec3 r, float versatz) {
  float phi = atan(r.z, r.x);
  float h = 0.12 + 0.05 * sin(phi * 3.0 + 0.6) + 0.022 * sin(phi * 7.0 + 2.0) + versatz;
  float y = r.y;
  float nh = nachtHier();
  vec3 himmelU = mix(vec3(1.0, 0.93, 0.84), vec3(0.10, 0.12, 0.22), nh);
  vec3 himmelO = mix(vec3(0.70, 0.80, 0.95), vec3(0.010, 0.016, 0.045), nh);
  vec3 landO = mix(vec3(0.09, 0.28, 0.31), vec3(0.020, 0.10, 0.11), nh);
  vec3 landU = mix(vec3(0.02, 0.07, 0.13), vec3(0.002, 0.010, 0.020), nh);
  vec3 himmel = mix(himmelU, himmelO, smoothstep(h, h + 0.95, y));
  vec3 land = mix(landO, landU, smoothstep(h, h - 0.85, y));
  // harte Kante, je Bildpunkt geglättet (auf der gekrümmten Haut ändert sich die Richtung schnell)
  float k = y - h;
  float b = max(fwidth(k) * 0.75, 0.004);
  vec3 c = mix(land, himmel, smoothstep(-b, b, k));
  // eine kleine Sonne, hart
  vec3 s = normalize(vec3(-0.55, 0.42, 0.72));
  float sonne = smoothstep(0.9992, 0.99945, dot(r, s));
  c = mix(c, mix(vec3(1.9, 1.75, 1.45), vec3(1.6, 1.5, 1.3), nh), sonne);
  return c;
}

void main() {
  // Ozzy: ein Blatt schiebt sich durch die Blase (Einrasten): was dahinter liegt, ist weg
  if (dot(uSchnitt.xyz, vPos) < uSchnitt.w) discard;
  vec3 N = normalize(vNormal);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(cameraPosition - vPos);
  float cosI = clamp(abs(dot(N, V)), 0.0, 1.0);
  float hauch;
  float d = dickeHier(hauch);
  float opd = gangunterschied(d, cosI);
  vec3 R = reflect(-V, N);
  float a = uAnteil * vSicht;
  // der Rest im Rahmen wird zum Schatten: die Haut verblasst, ein leichter grauer Schatten bleibt
  float schatten = uRahmen == 1 ? uSchatten : 0.0;
  if (uRahmen == 1 && uPass != 0) {
    if (uPass == 1) {
      float F0 = 0.02 + 0.98 * pow(1.0 - cosI, 5.0);
      vec3 Rs = min(tafel(opd) * (0.077 * uSicht) * (F0 / 0.02), vec3(1.0)) * a * (1.0 - schatten);
      gl_FragColor = vec4(mix(vec3(1.0) - Rs, uSchattenFarbe, schatten * a), 1.0);
    } else {
      float F0 = 0.02 + 0.98 * pow(1.0 - cosI, 5.0);
      vec3 Rs = min(tafel(opd) * (0.077 * uSicht) * (F0 / 0.02), vec3(1.0)) * a * (1.0 - schatten);
      gl_FragColor = vec4(Rs * atelier(R), 1.0);
    }
    return;
  }

  if (uFassung == 0) {
    // Seifenhaut: Spiegelung = Schichtfarbe · Fresnel; Durchlass = 1 − Spiegelung
    float F = 0.02 + 0.98 * pow(1.0 - cosI, 5.0);
    vec3 film = tafel(opd);
    vec3 Rf = film * (0.077 * uSicht) * (F / 0.02);
    Rf = mix(Rf, vec3(F), clamp(F * 1.4, 0.0, 1.0));
    Rf = min(Rf, vec3(1.0)) * a;
    if (uPass == 1) gl_FragColor = vec4(vec3(1.0) - Rf, 1.0);
    else gl_FragColor = vec4(Rf * atelier(R), 1.0);
    return;
  }
  if (uFassung == 2) {
    // Horizont: spiegelt fast ganz (wie Chrom, ein Hauch Durchsicht), die Kante spaltet das Licht (je Farbe etwas versetzt),
    // zum Rand hin stärker
    float F = 0.86 + 0.14 * pow(1.0 - cosI, 3.0);
    float spalt = 0.016 + 0.05 * pow(1.0 - cosI, 2.0);
    vec3 env = vec3(horizont(R, spalt).r, horizont(R, 0.0).g, horizont(R, -spalt).b);
    vec3 film = tafel(opd);
    vec3 tint = mix(vec3(1.0), film / max(0.35, dot(film, vec3(0.3333))), 0.08);
    vec3 Rf = vec3(F) * tint * a;
    if (uPass == 1) gl_FragColor = vec4(vec3(1.0) - Rf, 1.0);
    else gl_FragColor = vec4(Rf * env, 1.0);
    return;
  }
  vec3 L = normalize(vec3(-0.45, 0.68, 0.58));
  float lam = dot(N, L);
  if (uFassung == 1) {
    // Irisdruck: drei harte Stufen, Verlauf je Stufe (höchstens etwa 35 % zur Nachbarstufe)
    float nf = nachtHier();
    vec3 cL = mix(vec3(0.97, 0.955, 0.94), vec3(0.42, 0.43, 0.52), nf);
    vec3 cM = mix(vec3(0.74, 0.74, 0.86), vec3(0.16, 0.18, 0.30), nf);
    vec3 cS = mix(vec3(0.44, 0.50, 0.72), vec3(0.05, 0.07, 0.15), nf);
    vec3 grund;
    float stufe;
    if (lam > 0.36) { grund = mix(cL, cM, 0.32 * smoothstep(1.0, 0.36, lam)); stufe = 0.0; }
    else if (lam > -0.14) { grund = mix(cM, cS, 0.32 * smoothstep(0.36, -0.14, lam)); stufe = 1.0; }
    else { grund = mix(cS, cS * 0.82, smoothstep(-0.14, -1.0, lam)); stufe = 2.0; }
    // die Schichtfarbe in Bändern (Irisdruck): der Gangunterschied folgt vor allem dem Blickwinkel (Ringe zum Rand hin, wie
    // Perlmutt), wenig dem Fluss; in Stufen, in jeder ein kleiner Verlauf
    float opdI = 330.0 + 980.0 * pow(1.0 - cosI, 0.9) + 0.22 * (opd - 2.0 * 1.33 * uDicke);
    float B = 135.0;
    float k = opdI / B;
    float opdQ = (floor(k) + 0.5 + (fract(k) - 0.5) * 0.3) * B;
    vec3 iris = tafel(opdQ);
    iris = iris / max(0.25, dot(iris, vec3(0.3333)));
    iris = mix(vec3(1.0), iris, mix(0.62, 0.45, nf));
    float stark = stufe == 0.0 ? 0.42 : stufe == 1.0 ? 0.55 : 0.36;
    vec3 c = grund * mix(vec3(1.0), iris, stark);
    // Glanz: ein harter Fleck, im Licht
    float glanz = step(0.985, dot(R, normalize(vec3(-0.52, 0.6, 0.6))));
    c = mix(c, vec3(1.0), glanz * 0.85);
    gl_FragColor = vec4(c * uDeckung * a, uDeckung * a);
    return;
  }
  // Höhenlinien: weiße Haut, zwei leise Stufen; Linien gleicher Dicke, farbig nach der Tafel
  float nl = nachtHier();
  vec3 hell = mix(vec3(0.985, 0.98, 0.975), vec3(0.13, 0.15, 0.24), nl);
  vec3 dunkel = mix(vec3(0.90, 0.895, 0.93), vec3(0.05, 0.06, 0.12), nl);
  vec3 grund = lam > 0.05 ? mix(hell, dunkel, 0.3 * smoothstep(1.0, 0.05, lam)) : mix(dunkel, dunkel * 0.93, smoothstep(0.05, -1.0, lam));
  float dIso = (60.0 + 1650.0 * pow(vHoehe, 0.85)) * pow(max(vDehnung, 0.12), -uSpannung) * (1.0 - 0.45 * hauch) * (1.0 + 0.05 * rauschen(vec3(vBlatt * 2.0, uZeit * 0.05)));
  float v = dIso / 75.0;
  float fw = fwidth(v);
  float linie = 1.0 - smoothstep(0.0, 1.35 * fw, abs(fract(v + 0.5) - 0.5));
  linie *= 1.0 - smoothstep(0.22, 0.45, fw);
  vec3 farbe = tafel(floor(v + 0.5) * 75.0);
  farbe = farbe / max(0.2, max(farbe.r, max(farbe.g, farbe.b)));
  farbe = mix(farbe * 0.82, farbe, nl);
  vec3 c = mix(grund, farbe, linie * 0.92);
  gl_FragColor = vec4(c * uDeckung * a, uDeckung * a);
}
`;

const ENDE_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;
const ENDE_FRAGMENT = /* glsl */ `
precision highp float;
uniform sampler2D uBild;
uniform vec2 uGroesse;
varying vec2 vUv;
float ein(float c) {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * pow(c, 1.0 / 2.4) - 0.055;
}
void main() {
  vec3 c = texture2D(uBild, vUv).rgb;
  c = vec3(ein(clamp(c.r, 0.0, 1.0)), ein(clamp(c.g, 0.0, 1.0)), ein(clamp(c.b, 0.0, 1.0)));
  // leichtes Rauschen gegen Stufen in weichen Verläufen
  float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
  gl_FragColor = vec4(c + n / 255.0, 1.0);
}
`;

// der Grund der Rückseite (Ozzy): dieselben Flächen wie in `nachtHier`
const HINTEN_FRAGMENT = /* glsl */ `
precision highp float;
uniform vec3 uFarbe;
${HINTEN_GLSL}
void main() {
  float h = hintenBei(bildOrt());
  if (h <= 0.0) discard;
  gl_FragColor = vec4(uFarbe, h);
}
`;

// Der Grund allein, gleich fürs Bild kodiert (Papier und Rückseite gemischt wie im Ziel der Seifenhaut, dann wie `ENDE_FRAGMENT`):
// wo von der Haut nichts zu sehen ist (A3: um den Ausschnitt der Blase herum, oder das ganze Bild)
const GRUND_FRAGMENT = /* glsl */ `
precision highp float;
uniform vec3 uPapier;
uniform vec3 uFarbe;
${HINTEN_GLSL}
float ein(float c) {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * pow(c, 1.0 / 2.4) - 0.055;
}
void main() {
  vec3 c = mix(uPapier, uFarbe, hintenBei(bildOrt()));
  c = vec3(ein(clamp(c.r, 0.0, 1.0)), ein(clamp(c.g, 0.0, 1.0)), ein(clamp(c.b, 0.0, 1.0)));
  float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
  gl_FragColor = vec4(c + n / 255.0, 1.0);
}
`;

// ---------- Haut: Netze, Ziel, Bild ----------

export interface HautWerte {
  fassung: Fassung;
  nacht: boolean;
  /** Farbe des Papiers (Ozzy: in der Pose leicht getönt); fehlt: weiß */
  papier?: Color | null;
  zeit: number;
  /** 0..1: Anteil der Vorderseite (Einblenden) und der Rückseite (erst wenn sie sich löst); Rest im Rahmen (0 = weg) */
  vorn: number;
  hinten: number;
  rahmen: number;
  /** der Rest im Rahmen wird zum Schatten (0..1); der Schlauch ist zu sehen (vor dem Abriss und kurz danach) */
  schatten: number;
  schlauch: boolean;
  /** deckende Fassungen: 0 = noch Film, 1 = deckend */
  deckung: number;
  hauch: Vector3;
  hauchStaerke: number;
  hauchRadius: number;
  wind: Vector2;
  /** Grunddicke (nm), wie stark Dehnung sie ändert, wie stark die Seifenhaut spiegelt */
  dicke: number;
  spannung: number;
  sicht: number;
  /** Würfel und Stärke seiner sechs Wände (höchstens drei sichtbar), wie weich (Welt), Farbe des vollen Schattens (linear) */
  wuerfel: Wuerfel | null;
  waende: WandStaerke[];
  weich: number;
  schattenFarbe: Color;
  /**
   * Ozzy: die Rückseite als Flächen im Bild (`HINTEN_KANTEN` Kanten, je drei Werte, siehe `HINTEN_GLSL`; `zahl` Flächen). Dort ist
   * der Grund `kanteFarbe`, und die Haut spiegelt wie in der Nacht. Fehlt: überall vorn.
   */
  dunkel?: { kanten: number[]; zahl: number } | null;
  kanteFarbe?: Color;
  /** Ozzy: ein Blatt in der Blase (Einrasten): Die Haut bleibt nur, wo x · nx + y · ny + z · nz ≥ w (Welt); fehlt: ganz */
  schnitt?: [number, number, number, number] | null;
  /**
   * Ozzy (A3): Von der Haut ist in diesem Bild nichts zu sehen (das Blatt hat sie ganz weggeschnitten, der Rahmen ist weg). Dann
   * nur der Grund (Papier und Rückseite), direkt ins Bild, ohne das Ziel der Seifenhaut (gemessen: 6,5 ms je Bild für nichts).
   */
  leer?: boolean;
  /**
   * Ozzy (A3): Die Haut ist in diesem Bild nur in diesem Kasten zu sehen (Gerätepunkte, Ursprung oben links; der Kasten ihrer Punkte
   * mit etwas Rand). Dann wird das Ziel der Seifenhaut (vierfache Kantenglättung, 16 Bit je Kanal) nur so groß angelegt und darum
   * herum der Grund direkt gezeichnet: Das Bild ist dasselbe, das Löschen und Zusammenführen des Ziels kostet nur noch seinen Anteil
   * am Bild (gemessen im ganzen Bild: 3 bis 5 ms). Fehlt: das ganze Bild.
   */
  ausschnitt?: { x: number; y: number; b: number; h: number } | null;
}

export const PAPIER = new Color('#ffffff');
const KEIN_SCHNITT: [number, number, number, number] = [0, 0, 0, -1];
function keineKanten(): Vector3[] {
  return Array.from({ length: HINTEN_KANTEN }, () => new Vector3(0, 0, 1e6));
}
function hintenSetzen(u: Record<string, { value: unknown }>, h: HautWerte['dunkel'], hoehe: number, links = 0): void {
  const a = u.uHinten!.value as Vector3[];
  for (let i = 0; i < HINTEN_KANTEN; i++) {
    if (h && i * 3 + 2 < h.kanten.length) a[i]!.set(h.kanten[i * 3]!, h.kanten[i * 3 + 1]!, h.kanten[i * 3 + 2]!);
    else a[i]!.set(0, 0, 1e6);
  }
  u.uHintenZahl!.value = h ? Math.min(4, h.zahl) : 0;
  u.uKanteHoehe!.value = hoehe;
  u.uKanteLinks!.value = links;
}
/** Nacht: tiefes Blau */
export const NACHT = new Color('#121a28');

/**
 * Ein Netz, das statt der Blase des Körpers gezeigt wird (Ozzy: die Haut des Werks), mit den Werten der Seifenhaut je Punkt: Höhe
 * (0..1, für die Höhenlinien), Seite (+1 vorn, −1 hinten), Lage im Blatt (2 je Punkt, für die Muster), Dehnung, Sichtbarkeit.
 */
export interface HautNetz {
  pos: Float32Array;
  normal: Float32Array;
  index: Uint32Array;
  hoehe: Float32Array;
  seite: Float32Array;
  blatt: Float32Array;
  dehnung: Float32Array;
  sicht: Float32Array;
}

export class Haut {
  readonly szene = new Scene();
  private renderer: WebGLRenderer;
  private ziel: WebGLRenderTarget;
  private ende: { szene: Scene; kamera: OrthographicCamera; material: ShaderMaterial };
  /** der Grund hinter der harten Kante (Ozzy), nach dem Löschen vor der Haut gezeichnet */
  private hintenGrund: { szene: Scene; material: ShaderMaterial };
  private tafel: Texture;
  private geoBlase: BufferGeometry | null = null;
  private geoRahmen: BufferGeometry | null = null;
  private geoSchlauch: BufferGeometry | null = null;
  private netze: Mesh[] = [];
  /** Durchgänge: Blase (hinten ×, hinten +, vorn ×, vorn +, deckend), Rahmen (dieselben fünf), Wände (je eine) */
  private mats: ShaderMaterial[] = [];
  private matsRahmen: ShaderMaterial[] = [];
  private koerper: Koerper | null = null;
  /** ein fremdes Netz statt der Blase des Körpers (`blaseErsetzen`) und seine Puffer */
  private fremd: HautNetz | null = null;
  private geoFremd: BufferGeometry | null = null;
  /** weiche Schatten an den Wänden des Würfels */
  readonly schatten = new WandSchatten();
  /** A3: der Fluss der Dicke als Textur (einmal je Bild; neu nur, wenn sich Zeit oder Wind geändert haben) */
  private rausch: { ziel: WebGLRenderTarget; szene: Scene; material: ShaderMaterial; zeit: number; wx: number; wy: number };
  /** A3: der Grund allein, fürs Bild kodiert (um den Ausschnitt herum, oder wenn von der Haut nichts zu sehen ist) */
  private grundBild: { szene: Scene; material: ShaderMaterial };
  /**
   * A3: das Ziel für einen Ausschnitt (wie `ziel`, nur so groß wie die Blase im Bild). Seine Größe wächst sofort und schrumpft erst,
   * wenn es eine Weile deutlich kleiner reicht (`zuGross` zählt die Bilder), damit es nicht bei jeder Drehung neu angelegt wird.
   */
  private zielKlein: WebGLRenderTarget;
  private klein = { b: 0, h: 0, zuGross: 0 };

  constructor(renderer: WebGLRenderer) {
    this.renderer = renderer;
    const daten = duennschichtTafel(1024);
    const t = new DataTexture(daten, 1024, 1, RGBAFormat, FloatType);
    t.magFilter = LinearFilter;
    t.minFilter = LinearFilter;
    t.needsUpdate = true;
    this.tafel = t;
    this.ziel = new WebGLRenderTarget(4, 4, { type: HalfFloatType, samples: 4, depthBuffer: true });
    this.zielKlein = new WebGLRenderTarget(4, 4, { type: HalfFloatType, samples: 4, depthBuffer: true });
    const material = new ShaderMaterial({
      vertexShader: ENDE_VERTEX,
      fragmentShader: ENDE_FRAGMENT,
      uniforms: { uBild: { value: this.ziel.texture }, uGroesse: { value: new Vector2(1, 1) } },
      depthTest: false,
      depthWrite: false,
      blending: NoBlending,
    });
    const quad = new BufferGeometry();
    quad.setAttribute('position', new BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    quad.setAttribute('uv', new BufferAttribute(new Float32Array([0, 0, 2, 0, 0, 2]), 2));
    const s = new Scene();
    s.add(new Mesh(quad, material));
    this.ende = { szene: s, kamera: new OrthographicCamera(-1, 1, 1, -1, 0, 1), material };
    const grundMaterial = new ShaderMaterial({
      vertexShader: ENDE_VERTEX,
      fragmentShader: HINTEN_FRAGMENT,
      uniforms: { uHinten: { value: keineKanten() }, uHintenZahl: { value: 0 }, uKanteHoehe: { value: 1 }, uKanteLinks: { value: 0 }, uFarbe: { value: new Color(0, 0, 0) } },
      depthTest: false,
      depthWrite: false,
      transparent: true,
    });
    const sg = new Scene();
    sg.add(new Mesh(quad, grundMaterial));
    this.hintenGrund = { szene: sg, material: grundMaterial };
    const grundBildMaterial = new ShaderMaterial({
      vertexShader: ENDE_VERTEX,
      fragmentShader: GRUND_FRAGMENT,
      uniforms: {
        uHinten: { value: keineKanten() },
        uHintenZahl: { value: 0 },
        uKanteHoehe: { value: 1 },
        uKanteLinks: { value: 0 },
        uPapier: { value: new Color(1, 1, 1) },
        uFarbe: { value: new Color(0, 0, 0) },
      },
      depthTest: false,
      depthWrite: false,
      blending: NoBlending,
    });
    const sgb = new Scene();
    sgb.add(new Mesh(quad, grundBildMaterial));
    this.grundBild = { szene: sgb, material: grundBildMaterial };
    const rauschMaterial = new ShaderMaterial({
      vertexShader: ENDE_VERTEX,
      fragmentShader: RAUSCH_FRAGMENT,
      uniforms: { uZeit: { value: 0 }, uWind: { value: new Vector2() }, uRauschHalb: { value: RAUSCH_HALB } },
      depthTest: false,
      depthWrite: false,
      blending: NoBlending,
    });
    const sr = new Scene();
    sr.add(new Mesh(quad, rauschMaterial));
    this.rausch = {
      ziel: new WebGLRenderTarget(RAUSCH_PUNKTE, RAUSCH_PUNKTE, { type: HalfFloatType, depthBuffer: false, minFilter: LinearFilter, magFilter: LinearFilter }),
      szene: sr,
      material: rauschMaterial,
      zeit: NaN,
      wx: NaN,
      wy: NaN,
    };
    this.mats = this.durchgaenge(0);
    this.matsRahmen = this.durchgaenge(1);
    this.szene.add(this.schatten.gruppe);
  }

  /** vier Durchgänge für durchsichtige Fassungen (hinten ×, hinten +, vorn ×, vorn +) und einer für deckende */
  private durchgaenge(rahmen: 0 | 1): ShaderMaterial[] {
    const basis = (): ShaderMaterial =>
      new ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        uniforms: {
          uTafel: { value: this.tafel },
          uOpdMax: { value: OPD_MAX },
          uZeit: { value: 0 },
          uFassung: { value: 0 },
          uNacht: { value: 0 },
          uHinten: { value: keineKanten() },
          uHintenZahl: { value: 0 },
          uKanteHoehe: { value: 1 },
          uKanteLinks: { value: 0 },
          uAusschnitt: { value: new Vector4(1, 1, 0, 0) },
          uSchnitt: { value: new Vector4(0, 0, 0, -1) },
          uPass: { value: 0 },
          uAnteil: { value: 1 },
          uDeckung: { value: 1 },
          uHauch: { value: new Vector3(1e6, 1e6, 1e6) },
          uHauchStaerke: { value: 0 },
          uHauchRadius: { value: 60 },
          uWind: { value: new Vector2() },
          uDicke: { value: 520 },
          uSpannung: { value: 1 },
          uSicht: { value: 3 },
          uRahmen: { value: rahmen },
          uSchatten: { value: 0 },
          uSchattenFarbe: { value: new Color(0.9, 0.9, 0.9) },
          uRausch: { value: this.rausch.ziel.texture },
          uRauschHalb: { value: RAUSCH_HALB },
          uRauschAn: { value: 1 },
        },
        depthWrite: false,
        depthTest: true,
        transparent: true,
      });
    const mal = (side: typeof FrontSide | typeof BackSide, pass: 1 | 2): ShaderMaterial => {
      const m = basis();
      m.side = side;
      m.uniforms.uPass!.value = pass;
      m.blending = CustomBlending;
      m.blendEquation = AddEquation;
      if (pass === 1) {
        m.blendSrc = ZeroFactor;
        m.blendDst = SrcColorFactor;
      } else {
        m.blendSrc = OneFactor;
        m.blendDst = OneFactor;
      }
      m.blendSrcAlpha = ZeroFactor;
      m.blendDstAlpha = OneFactor;
      return m;
    };
    // deckend, vormultipliert: Quelle + Ziel · (1 − α) (so kann der Film beim Schließen noch durchscheinen)
    const deckend = basis();
    deckend.side = FrontSide;
    deckend.uniforms.uPass!.value = 0;
    deckend.blending = CustomBlending;
    deckend.blendEquation = AddEquation;
    deckend.blendSrc = OneFactor;
    deckend.blendDst = OneMinusSrcAlphaFactor;
    deckend.blendSrcAlpha = OneFactor;
    deckend.blendDstAlpha = OneMinusSrcAlphaFactor;
    return [mal(BackSide, 1), mal(BackSide, 2), mal(FrontSide, 1), mal(FrontSide, 2), deckend];
  }

  groesse(b: number, h: number, dpr: number): void {
    this.ziel.setSize(Math.max(1, Math.round(b * dpr)), Math.max(1, Math.round(h * dpr)));
    this.ende.material.uniforms.uGroesse!.value.set(b * dpr, h * dpr);
  }

  /** neuer Körper (neues Netz) */
  setzeKoerper(k: Koerper | null): void {
    for (const m of this.netze) this.szene.remove(m);
    this.netze = [];
    this.geoBlase?.dispose();
    this.geoRahmen?.dispose();
    this.geoSchlauch?.dispose();
    this.geoBlase = null;
    this.geoRahmen = null;
    this.geoSchlauch = null;
    this.koerper = k;
    this.schatten.setzeBlase(null);
    if (!k) return;
    const n = k.flach.n;
    const geo = (von: number, bis: number, index: Uint32Array): BufferGeometry => {
      const g = new BufferGeometry();
      g.setAttribute('position', new BufferAttribute(k.pos.subarray(von * 3, bis * 3), 3));
      g.setAttribute('normal', new BufferAttribute(k.normal.subarray(von * 3, bis * 3), 3));
      g.setAttribute('aHoehe', new BufferAttribute(k.hoehe.subarray(von, bis), 1));
      g.setAttribute('aSeite', new BufferAttribute(k.seite.subarray(von, bis), 1));
      g.setAttribute('aBlatt', new BufferAttribute(k.blatt.subarray(von * 2, bis * 2), 2));
      g.setAttribute('aDehnung', new BufferAttribute(k.dehnung.subarray(von, bis), 1));
      g.setAttribute('aSicht', new BufferAttribute(k.sicht.subarray(von, bis), 1));
      g.setIndex(new BufferAttribute(index, 1));
      return g;
    };
    this.geoBlase = geo(0, 2 * n, k.index);
    this.geoRahmen = geo(2 * n, 3 * n, k.indexRahmen);
    // Schlauch: eigene Puffer (Ring × Länge)
    const S = k.schlauch;
    const gs = new BufferGeometry();
    gs.setAttribute('position', new BufferAttribute(S.pos, 3));
    gs.setAttribute('normal', new BufferAttribute(S.normal, 3));
    gs.setAttribute('aHoehe', new BufferAttribute(S.hoehe, 1));
    gs.setAttribute('aSeite', new BufferAttribute(S.seite, 1));
    gs.setAttribute('aBlatt', new BufferAttribute(S.blatt, 2));
    gs.setAttribute('aDehnung', new BufferAttribute(S.dehnung, 1));
    gs.setAttribute('aSicht', new BufferAttribute(S.sicht, 1));
    gs.setIndex(new BufferAttribute(S.index, 1));
    this.geoSchlauch = gs;
    const dazu = (g: BufferGeometry, m: ShaderMaterial, ordnung: number): void => {
      const mesh = new Mesh(g, m);
      mesh.renderOrder = ordnung;
      mesh.frustumCulled = false;
      this.szene.add(mesh);
      this.netze.push(mesh);
    };
    this.matsRahmen.forEach((m, i) => dazu(this.geoRahmen!, m, -10 + i));
    // der Schlauch ist Seifenhaut wie der Rest im Rahmen (dieselben Durchgänge), gezeichnet zwischen Rahmen und Blase
    this.matsRahmen.forEach((m, i) => {
      if (i < 4) dazu(this.geoSchlauch!, m, -5 + i);
    });
    this.mats.forEach((m, i) => dazu(this.geoFremd ?? this.geoBlase!, m, i));
    this.schatten.setzeBlase(this.geoBlase);
    // alle Shader jetzt übersetzen, nicht erst, wenn sie mitten im Aufblasen sichtbar werden (sonst stockt ein Bild)
    for (const mesh of this.netze) mesh.visible = true;
    this.renderer.compile(this.szene, new OrthographicCamera(-1, 1, 1, -1, 0, 1));
  }

  /**
   * Einmal unsichtbar alles zeichnen, was das Aufblasen braucht (Blase, Rahmen, Schlauch, die Schatten auf allen sechs Wänden), ins
   * eigene Ziel, ohne es zu zeigen. Der Browser übersetzt Shader und Zustände der Grafik sonst erst, wenn sie mitten im ersten
   * Aufblasen sichtbar werden (dort fielen rund ein Dutzend Bilder aus). Braucht einen Körper (`setzeKoerper`).
   */
  aufwaermen(kamera: PerspectiveCamera): void {
    if (!this.koerper) return;
    const r = this.renderer;
    const sichtbar = this.netze.map((n) => n.visible);
    for (const n of this.netze) n.visible = true;
    const waende: WandStaerke[] = [];
    for (const achse of [0, 1, 2] as const) for (const seite of [-1, 1] as const) waende.push({ achse, seite, staerke: 0.01 });
    const halb = Math.max(1, this.koerper.flach.radius) * 2;
    this.schatten.aktualisieren(r, { mitte: new Vector3(), halb: new Vector3(halb, halb, halb) }, waende, halb * 0.1, new Color(0.9, 0.9, 0.9));
    this.schatten.gruppe.visible = true;
    r.setRenderTarget(this.ziel);
    r.setClearColor(PAPIER, 1);
    r.clear(true, true, false);
    r.render(this.szene, kamera);
    r.setRenderTarget(null);
    r.compile(this.ende.szene, this.ende.kamera);
    r.compile(this.rausch.szene, this.ende.kamera);
    r.compile(this.grundBild.szene, this.ende.kamera);
    this.netze.forEach((n, i) => (n.visible = sichtbar[i]!));
  }

  /**
   * Statt der Blase des Körpers ein anderes Netz zeigen (Ozzy: die Haut des Werks), mit denselben Durchgängen der Seifenhaut; Rahmen
   * und Schlauch bleiben die des Körpers. `null`: wieder die Blase des Körpers. Dasselbe Netz noch einmal: nur die Werte hochladen.
   */
  /** nur die Dehnung des fremden Netzes neu hochladen (Ozzy: die Lage der Haut ist dieselbe, die Farben der Dehnung klingen nach) */
  dehnungErneuern(): void {
    if (this.geoFremd) (this.geoFremd.getAttribute('aDehnung') as BufferAttribute).needsUpdate = true;
  }

  blaseErsetzen(netz: HautNetz | null): void {
    if (netz && netz === this.fremd && this.geoFremd) {
      for (const n of ['position', 'normal', 'aHoehe', 'aSeite', 'aBlatt', 'aDehnung', 'aSicht']) (this.geoFremd.getAttribute(n) as BufferAttribute).needsUpdate = true;
      return;
    }
    const alt = this.geoFremd;
    this.fremd = netz;
    this.geoFremd = null;
    if (netz) {
      const g = new BufferGeometry();
      g.setAttribute('position', new BufferAttribute(netz.pos, 3));
      g.setAttribute('normal', new BufferAttribute(netz.normal, 3));
      g.setAttribute('aHoehe', new BufferAttribute(netz.hoehe, 1));
      g.setAttribute('aSeite', new BufferAttribute(netz.seite, 1));
      g.setAttribute('aBlatt', new BufferAttribute(netz.blatt, 2));
      g.setAttribute('aDehnung', new BufferAttribute(netz.dehnung, 1));
      g.setAttribute('aSicht', new BufferAttribute(netz.sicht, 1));
      g.setIndex(new BufferAttribute(netz.index, 1));
      this.geoFremd = g;
    }
    for (const mesh of this.netze) if (this.mats.includes(mesh.material as ShaderMaterial)) mesh.geometry = this.geoFremd ?? this.geoBlase!;
    alt?.dispose();
  }

  /** nach `Koerper.setzen`: Lagen, Normalen, Dehnung, Sichtbarkeit hochladen */
  hochladen(): void {
    for (const g of [this.geoBlase, this.geoRahmen, this.geoSchlauch]) {
      if (!g) continue;
      for (const n of ['position', 'normal', 'aDehnung', 'aSicht']) (g.getAttribute(n) as BufferAttribute).needsUpdate = true;
    }
  }

  /**
   * Bild zeichnen: die Hauptansicht, dazu (Viereransicht) weitere Felder mit eigener Kamera, nur die Blase, ruhig.
   * Felder in Gerätepunkten, Ursprung oben links.
   */
  zeichnen(kamera: Camera, w: HautWerte, felder: { kamera: Camera; x: number; y: number; b: number; h: number }[] = []): void {
    const r = this.renderer;
    const durch = DURCHSICHTIG[w.fassung]!;
    // A3: nur der Ausschnitt mit der Blase geht durch das teure Ziel (nicht mit Feldern, nicht wenn er fast das ganze Bild deckt)
    const A = !w.leer && !felder.length && w.ausschnitt ? this.ausschnittFuer(w.ausschnitt) : null;
    const B = this.ziel.width;
    const H0 = this.ziel.height;
    const kanteHoehe = A ? A.y + A.h : H0;
    const kanteLinks = A ? A.x : 0;
    const setzen = (m: ShaderMaterial, anteil: number): void => {
      const u = m.uniforms;
      u.uZeit!.value = w.zeit;
      u.uFassung!.value = w.fassung;
      u.uNacht!.value = w.nacht ? 1 : 0;
      hintenSetzen(u, w.dunkel, kanteHoehe, kanteLinks);
      if (A) (u.uAusschnitt!.value as Vector4).set(B / A.b, H0 / A.h, (B - 2 * A.x) / A.b - 1, 1 - (H0 - 2 * A.y) / A.h);
      else (u.uAusschnitt!.value as Vector4).set(1, 1, 0, 0);
      const sn = w.schnitt ?? KEIN_SCHNITT;
      (u.uSchnitt!.value as Vector4).set(sn[0], sn[1], sn[2], sn[3]);
      u.uDeckung!.value = w.deckung;
      (u.uHauch!.value as Vector3).copy(w.hauch);
      u.uHauchStaerke!.value = w.hauchStaerke;
      u.uHauchRadius!.value = w.hauchRadius;
      (u.uWind!.value as Vector2).copy(w.wind);
      u.uDicke!.value = w.dicke;
      u.uSpannung!.value = w.spannung;
      u.uSicht!.value = w.nacht ? w.sicht * 0.8 : w.sicht;
      u.uSchatten!.value = w.schatten;
      (u.uSchattenFarbe!.value as Color).copy(w.schattenFarbe);
      u.uAnteil!.value = anteil;
    };
    // Blase: Rückseite (Durchgänge 0 und 1) erst, wenn sie sich vom Film gelöst hat
    this.mats.forEach((m, i) => setzen(m, i < 2 ? w.hinten : w.vorn));
    // Rahmen: immer als durchsichtige Seifenhaut (vier Durchgänge), bis er zum Schatten geworden ist
    this.matsRahmen.forEach((m) => setzen(m, w.rahmen));
    let k = 0;
    for (const mesh of this.netze) {
      const m = mesh.material as ShaderMaterial;
      const i = this.mats.indexOf(m);
      const j = this.matsRahmen.indexOf(m);
      if (i >= 0) mesh.visible = durch ? i < 4 : i === 4;
      else if (j >= 0) mesh.visible = j < 4 && w.rahmen > 1e-3 && (mesh.geometry !== this.geoSchlauch || w.schlauch);
      k++;
    }
    void k;
    // der Fluss der Dicke für dieses Bild (alle Durchgänge lesen ihn)
    const R = this.rausch;
    if (R.zeit !== w.zeit || R.wx !== w.wind.x || R.wy !== w.wind.y) {
      R.zeit = w.zeit;
      R.wx = w.wind.x;
      R.wy = w.wind.y;
      R.material.uniforms.uZeit!.value = w.zeit;
      (R.material.uniforms.uWind!.value as Vector2).copy(w.wind);
      r.setRenderTarget(R.ziel);
      r.render(R.szene, this.ende.kamera);
    }
    if (w.wuerfel) this.schatten.aktualisieren(r, w.wuerfel, w.waende, w.weich, w.schattenFarbe);
    else this.schatten.gruppe.visible = false;
    this.schatten.gruppe.visible = !!w.wuerfel;
    const grund = (w.nacht ? NACHT : (w.papier ?? PAPIER)).clone();
    const dunkelAn = !!w.dunkel && w.dunkel.zahl > 0 && !w.nacht;
    /** der Grund allein über das ganze Bild (Papier und Rückseite), fürs Bild kodiert wie im letzten Durchgang */
    const grundZeichnen = (): void => {
      const u = this.grundBild.material.uniforms;
      hintenSetzen(u, dunkelAn ? w.dunkel : null, H0, 0);
      (u.uPapier!.value as Color).copy(grund);
      (u.uFarbe!.value as Color).copy(w.kanteFarbe ?? NACHT);
      r.setRenderTarget(null);
      r.render(this.grundBild.szene, this.ende.kamera);
    };
    if (w.leer) {
      // von der Haut ist nichts zu sehen: nur der Grund
      grundZeichnen();
      return;
    }
    const ziel = A ? this.zielKlein : this.ziel;
    r.setRenderTarget(ziel);
    r.setClearColor(grund, 1);
    r.clear(true, true, false);
    const autoLoeschen = r.autoClear;
    if (dunkelAn) {
      // auf den Flächen der Rückseite der andere Grund (vor der Haut: Sie spiegelt und lässt durch wie überall); danach nicht mehr löschen
      const u = this.hintenGrund.material.uniforms;
      hintenSetzen(u, w.dunkel, kanteHoehe, kanteLinks);
      (u.uFarbe!.value as Color).copy(w.kanteFarbe ?? NACHT);
      r.autoClear = false;
      r.render(this.hintenGrund.szene, this.ende.kamera);
    }
    r.render(this.szene, kamera);
    r.autoClear = autoLoeschen;
    if (felder.length) {
      // Felder: nur die Blase (keine Wände, kein Rahmen, kein Schlauch), ruhig wie in der flachen Ansicht
      const sichtbar = this.netze.map((n) => n.visible);
      for (const n of this.netze) n.visible = n.visible && this.mats.includes(n.material as ShaderMaterial);
      const wandSichtbar = this.schatten.gruppe.visible;
      this.schatten.gruppe.visible = false;
      for (const m of this.mats) m.uniforms.uSicht!.value = (w.nacht ? 0.8 : 1) * w.sicht * 0.45;
      const H = this.ziel.height;
      for (const f of felder) {
        const y = H - f.y - f.h;
        this.ziel.viewport.set(f.x, y, f.b, f.h);
        this.ziel.scissor.set(f.x, y, f.b, f.h);
        this.ziel.scissorTest = true;
        r.setRenderTarget(this.ziel);
        r.clear(true, true, false);
        r.render(this.szene, f.kamera);
      }
      this.ziel.viewport.set(0, 0, this.ziel.width, this.ziel.height);
      this.ziel.scissor.set(0, 0, this.ziel.width, this.ziel.height);
      this.ziel.scissorTest = false;
      this.netze.forEach((n, i) => (n.visible = sichtbar[i]!));
      this.schatten.gruppe.visible = wandSichtbar;
    }
    this.ende.material.uniforms.uBild!.value = ziel.texture;
    if (!A) {
      r.setRenderTarget(null);
      r.render(this.ende.szene, this.ende.kamera);
      return;
    }
    // erst der Grund über das ganze Bild, dann der Ausschnitt mit der Haut an seinen Platz (Bildpunkt auf Bildpunkt)
    grundZeichnen();
    const pr = r.getPixelRatio();
    r.setViewport(A.x / pr, (H0 - A.y - A.h) / pr, A.b / pr, A.h / pr);
    r.autoClear = false;
    r.render(this.ende.szene, this.ende.kamera);
    r.autoClear = autoLoeschen;
    r.setViewport(0, 0, B / pr, H0 / pr);
  }

  /**
   * Der Ausschnitt, der durch das kleine Ziel geht: der Kasten der Haut, aufs Bild begrenzt und auf das Raster der Zielgröße gebracht
   * (Gerätepunkte, ganze Zahlen). null: lohnt nicht (er deckte mehr als sechs Zehntel des Bilds), dann das ganze Bild wie bisher.
   */
  private ausschnittFuer(a: { x: number; y: number; b: number; h: number }): { x: number; y: number; b: number; h: number } | null {
    const B = this.ziel.width;
    const H = this.ziel.height;
    const x0 = Math.max(0, Math.floor(a.x));
    const y0 = Math.max(0, Math.floor(a.y));
    const x1 = Math.min(B, Math.ceil(a.x + a.b));
    const y1 = Math.min(H, Math.ceil(a.y + a.h));
    const RASTER = 128;
    const b = Math.min(B, Math.max(RASTER, Math.ceil(Math.max(1, x1 - x0) / RASTER) * RASTER));
    const h = Math.min(H, Math.max(RASTER, Math.ceil(Math.max(1, y1 - y0) / RASTER) * RASTER));
    const K = this.klein;
    if (b > K.b || h > K.h) {
      K.b = Math.max(K.b, b);
      K.h = Math.max(K.h, h);
      K.zuGross = 0;
    } else if (b <= K.b - 2 * RASTER || h <= K.h - 2 * RASTER) {
      // deutlich zu groß: erst nach einer Weile kleiner anlegen (ein Schwenk hin und zurück soll nichts neu anlegen)
      if (++K.zuGross > 45) {
        K.b = b;
        K.h = h;
        K.zuGross = 0;
      }
    } else K.zuGross = 0;
    K.b = Math.min(K.b, B);
    K.h = Math.min(K.h, H);
    if (K.b * K.h > 0.6 * B * H) return null;
    if (this.zielKlein.width !== K.b || this.zielKlein.height !== K.h) this.zielKlein.setSize(K.b, K.h);
    // der Kasten der Haut in der Mitte des Ausschnitts, der Ausschnitt ganz im Bild
    const x = Math.max(0, Math.min(B - K.b, Math.round((x0 + x1) / 2 - K.b / 2)));
    const y = Math.max(0, Math.min(H - K.h, Math.round((y0 + y1) / 2 - K.h / 2)));
    return { x, y, b: K.b, h: K.h };
  }
}
