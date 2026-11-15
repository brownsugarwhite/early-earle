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
  CanvasTexture,
  Color,
  CustomBlending,
  DataTexture,
  DoubleSide,
  FloatType,
  FrontSide,
  HalfFloatType,
  LinearFilter,
  LinearMipmapLinearFilter,
  Mesh,
  MinEquation,
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
  WebGLRenderTarget,
  type WebGLRenderer,
  ZeroFactor,
} from 'three';
import type { Koerper } from './form';

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
}
`;

const FRAGMENT = /* glsl */ `
precision highp float;
uniform sampler2D uTafel;
uniform float uOpdMax;
uniform float uZeit;
uniform int uFassung;
uniform int uNacht;
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
varying float vSicht;
varying vec3 vPos;
varying vec3 vNormal;
varying float vHoehe;
varying float vSeite;
varying vec2 vBlatt;
varying float vDehnung;

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

// Dicke der Haut hier (nm): Fluss (Marangoni), oben dünner, gedehnt dünner, der Zeiger haucht sie an
float dickeHier(out float hauch) {
  vec2 p = vBlatt * 1.55 + uWind;
  float t = uZeit * 0.075;
  vec2 w = vec2(rauschen(vec3(p * 0.85, t)), rauschen(vec3(p * 0.85 + 4.7, t + 2.3)));
  float n = 0.62 * rauschen(vec3(p * 1.45 + w * 1.5, t * 1.4)) + 0.26 * rauschen(vec3(p * 3.3 + w * 0.9, t * 2.1));
  float d = uDicke * (1.0 + 0.62 * n);
  d *= mix(1.22, 0.74, smoothstep(-1.0, 1.0, vBlatt.y));
  d *= pow(max(vDehnung, 0.12), -uSpannung);
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

vec3 atelier(vec3 r) {
  if (uNacht == 1) {
    // Nacht: ein tiefer Raum mit hellem Streifen am Horizont, damit der Rand leuchtet
    vec3 c = mix(vec3(0.010, 0.016, 0.030), vec3(0.060, 0.085, 0.140), smoothstep(-0.7, 0.05, r.y));
    c = mix(c, vec3(0.030, 0.045, 0.085), smoothstep(0.05, 0.9, r.y));
    c += vec3(0.10, 0.12, 0.18) * exp(-abs(r.y - 0.04) * 9.0);
    c += vec3(2.4, 2.35, 2.25) * kasten(r, normalize(vec3(-0.52, 0.6, 0.6)), vec2(0.42, 0.24), 0.05);
    c += vec3(0.9, 0.95, 1.1) * kasten(r, normalize(vec3(0.78, 0.18, 0.32)), vec2(0.16, 0.5), 0.06);
    return c;
  }
  // Papier: ein heller Raum (das Blatt), unten etwas dunkler, zwei Leuchtflächen
  vec3 c = mix(vec3(0.42, 0.43, 0.47), vec3(0.80, 0.81, 0.84), smoothstep(-0.55, 0.3, r.y));
  c = mix(c, vec3(0.90, 0.905, 0.92), smoothstep(0.3, 1.0, r.y));
  c += vec3(2.2) * kasten(r, normalize(vec3(-0.52, 0.6, 0.6)), vec2(0.42, 0.24), 0.05);
  c += vec3(1.1) * kasten(r, normalize(vec3(0.78, 0.18, 0.32)), vec2(0.16, 0.5), 0.06);
  return c;
}

// abstrakter Horizont (Earle): Himmel und Land, harte Kante, Verlauf in jeder Fläche; versatz hebt die Kante (für die Aufspaltung)
vec3 horizont(vec3 r, float versatz) {
  float phi = atan(r.z, r.x);
  float h = 0.12 + 0.05 * sin(phi * 3.0 + 0.6) + 0.022 * sin(phi * 7.0 + 2.0) + versatz;
  float y = r.y;
  vec3 himmelU = uNacht == 1 ? vec3(0.10, 0.12, 0.22) : vec3(1.0, 0.93, 0.84);
  vec3 himmelO = uNacht == 1 ? vec3(0.010, 0.016, 0.045) : vec3(0.70, 0.80, 0.95);
  vec3 landO = uNacht == 1 ? vec3(0.020, 0.10, 0.11) : vec3(0.09, 0.28, 0.31);
  vec3 landU = uNacht == 1 ? vec3(0.002, 0.010, 0.020) : vec3(0.02, 0.07, 0.13);
  vec3 himmel = mix(himmelU, himmelO, smoothstep(h, h + 0.95, y));
  vec3 land = mix(landO, landU, smoothstep(h, h - 0.85, y));
  // harte Kante, je Bildpunkt geglättet (auf der gekrümmten Haut ändert sich die Richtung schnell)
  float k = y - h;
  float b = max(fwidth(k) * 0.75, 0.004);
  vec3 c = mix(land, himmel, smoothstep(-b, b, k));
  // eine kleine Sonne, hart
  vec3 s = normalize(vec3(-0.55, 0.42, 0.72));
  float sonne = smoothstep(0.9992, 0.99945, dot(r, s));
  c = mix(c, uNacht == 1 ? vec3(1.6, 1.5, 1.3) : vec3(1.9, 1.75, 1.45), sonne);
  return c;
}

void main() {
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
    if (uPass == 1) gl_FragColor = vec4(vec3(1.0) - Rf * (uNacht == 1 ? 1.0 : 1.0), 1.0);
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
    vec3 cL = uNacht == 1 ? vec3(0.42, 0.43, 0.52) : vec3(0.97, 0.955, 0.94);
    vec3 cM = uNacht == 1 ? vec3(0.16, 0.18, 0.30) : vec3(0.74, 0.74, 0.86);
    vec3 cS = uNacht == 1 ? vec3(0.05, 0.07, 0.15) : vec3(0.44, 0.50, 0.72);
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
    iris = mix(vec3(1.0), iris, uNacht == 1 ? 0.45 : 0.62);
    float stark = stufe == 0.0 ? 0.42 : stufe == 1.0 ? 0.55 : 0.36;
    vec3 c = grund * mix(vec3(1.0), iris, stark);
    // Glanz: ein harter Fleck, im Licht
    float glanz = step(0.985, dot(R, normalize(vec3(-0.52, 0.6, 0.6))));
    c = mix(c, vec3(1.0), glanz * 0.85);
    gl_FragColor = vec4(c * uDeckung * a, uDeckung * a);
    return;
  }
  // Höhenlinien: weiße Haut, zwei leise Stufen; Linien gleicher Dicke, farbig nach der Tafel
  vec3 hell = uNacht == 1 ? vec3(0.13, 0.15, 0.24) : vec3(0.985, 0.98, 0.975);
  vec3 dunkel = uNacht == 1 ? vec3(0.05, 0.06, 0.12) : vec3(0.90, 0.895, 0.93);
  vec3 grund = lam > 0.05 ? mix(hell, dunkel, 0.3 * smoothstep(1.0, 0.05, lam)) : mix(dunkel, dunkel * 0.93, smoothstep(0.05, -1.0, lam));
  float dIso = (60.0 + 1650.0 * pow(vHoehe, 0.85)) * pow(max(vDehnung, 0.12), -uSpannung) * (1.0 - 0.45 * hauch) * (1.0 + 0.05 * rauschen(vec3(vBlatt * 2.0, uZeit * 0.05)));
  float v = dIso / 75.0;
  float fw = fwidth(v);
  float linie = 1.0 - smoothstep(0.0, 1.35 * fw, abs(fract(v + 0.5) - 0.5));
  linie *= 1.0 - smoothstep(0.22, 0.45, fw);
  vec3 farbe = tafel(floor(v + 0.5) * 75.0);
  farbe = farbe / max(0.2, max(farbe.r, max(farbe.g, farbe.b)));
  farbe = uNacht == 1 ? farbe : farbe * 0.82;
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

// ---------- Schatten an den Wänden ----------

/** Die Blase, auf eine Wand gelegt (Achse 0 x, 1 y, 2 z, Wand bei `uWand`): ein leichter Schatten, Überdeckungen nicht doppelt (MIN) */
const WAND_VERTEX = /* glsl */ `
uniform int uAchse;
uniform float uWand;
uniform float uZ;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  if (uAchse == 0) w.x = uWand;
  else if (uAchse == 1) w.y = uWand;
  else w.z = uWand;
  if (uAchse != 2) w.z += uZ;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;
const WAND_FRAGMENT = /* glsl */ `
precision highp float;
uniform vec3 uFarbe;
uniform float uStaerke;
void main() {
  gl_FragColor = vec4(mix(vec3(1.0), uFarbe, uStaerke), 1.0);
}
`;

/** eine Wand des Kastens: Achse, Lage, Stärke des Schattens (0..1) */
export interface Wand {
  achse: 0 | 1 | 2;
  lage: number;
  staerke: number;
  /** Versatz des Schattens in der Tiefe (Wände ringsum: weiter hinten als die Blase) */
  z?: number;
}

// ---------- Namen auf dem Boden ----------

/** Namen der Wände in Lobster, flach auf dem Boden (Florian, 15.11.: „die Beschriftung soll auch auf den Boden projiziert sein“) */
const NAME_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
}
`;
const NAME_FRAGMENT = /* glsl */ `
precision highp float;
uniform sampler2D uTex;
uniform vec3 uFarbe;
uniform float uStaerke;
varying vec2 vUv;
void main() {
  float a = texture2D(uTex, vUv).a * uStaerke;
  gl_FragColor = vec4(uFarbe * a, a);
}
`;

/** ein Name auf dem Boden: Mitte, Leserichtung (Länge = Breite), Richtung der Oberkante der Buchstaben (Länge = Höhe) */
export interface NameAmBoden {
  text: string;
  mitte: Vector3;
  u: Vector3;
  v: Vector3;
}

/** je Bild: wie stark der Name zu sehen ist (mit den Schatten) und wie weit er hervortritt (beim Darüberfahren dunkel) */
export interface NameZustand {
  staerke: number;
  hervor: number;
}

const NAME_GRAU = new Color().setScalar(0.42);
const NAME_TINTE = new Color('#1f1a17');
const NAME_NACHT = new Color().setScalar(0.08);
const NAME_NACHT_HELL = new Color('#f1ece3');

// ---------- Haut: Netze, Ziel, Bild ----------

export interface HautWerte {
  fassung: Fassung;
  nacht: boolean;
  zeit: number;
  /** 0..1: Anteil der Vorderseite (Einblenden) und der Rückseite (erst wenn sie sich löst); Rest im Rahmen (0 = weg) */
  vorn: number;
  hinten: number;
  rahmen: number;
  /** der Rest im Rahmen wird zum Schatten (0..1) */
  schatten: number;
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
  /** Wände des Kastens mit ihren Schatten, Farbe der Schatten (linear) */
  waende: Wand[];
  schattenFarbe: Color;
  /** Namen auf dem Boden (in der Reihenfolge von `setzeNamen`) */
  namen: NameZustand[];
}

export const PAPIER = new Color('#ffffff');
/** Nacht: tiefes Blau */
export const NACHT = new Color('#121a28');

export class Haut {
  readonly szene = new Scene();
  private renderer: WebGLRenderer;
  private ziel: WebGLRenderTarget;
  private ende: { szene: Scene; kamera: OrthographicCamera; material: ShaderMaterial };
  private tafel: Texture;
  private geoBlase: BufferGeometry | null = null;
  private geoRahmen: BufferGeometry | null = null;
  private netze: Mesh[] = [];
  /** Durchgänge: Blase (hinten ×, hinten +, vorn ×, vorn +, deckend), Rahmen (dieselben fünf), Wände (je eine) */
  private mats: ShaderMaterial[] = [];
  private matsRahmen: ShaderMaterial[] = [];
  private matsWand: ShaderMaterial[] = [];
  private koerper: Koerper | null = null;
  private namen: { mesh: Mesh; mat: ShaderMaterial; text: string; tex: CanvasTexture | null }[] = [];

  constructor(renderer: WebGLRenderer) {
    this.renderer = renderer;
    const daten = duennschichtTafel(1024);
    const t = new DataTexture(daten, 1024, 1, RGBAFormat, FloatType);
    t.magFilter = LinearFilter;
    t.minFilter = LinearFilter;
    t.needsUpdate = true;
    this.tafel = t;
    this.ziel = new WebGLRenderTarget(4, 4, { type: HalfFloatType, samples: 4, depthBuffer: true });
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
    this.mats = this.durchgaenge(0);
    this.matsRahmen = this.durchgaenge(1);
    for (let i = 0; i < 5; i++)
      this.matsWand.push(
        new ShaderMaterial({
          vertexShader: WAND_VERTEX,
          fragmentShader: WAND_FRAGMENT,
          uniforms: { uAchse: { value: 0 }, uWand: { value: 0 }, uZ: { value: 0 }, uFarbe: { value: new Color(0.9, 0.9, 0.9) }, uStaerke: { value: 0 } },
          depthTest: false,
          depthWrite: false,
          side: DoubleSide,
          blending: CustomBlending,
          blendEquation: MinEquation,
          blendSrc: OneFactor,
          blendDst: OneFactor,
        }),
      );
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

  /**
   * Namen auf dem Boden setzen (Lage und Größe); die Schrift wird einmal in ein Bild gezeichnet, sobald Lobster geladen ist.
   * `format` meldet das Seitenverhältnis des Bilds (Breite : Höhe), damit die Fläche dazu passt.
   */
  setzeNamen(liste: NameAmBoden[], format: (i: number, verhaeltnis: number) => void): void {
    liste.forEach((n, i) => {
      let e = this.namen[i];
      if (!e) {
        const g = new BufferGeometry();
        g.setAttribute('position', new BufferAttribute(new Float32Array(12), 3));
        g.setAttribute('uv', new BufferAttribute(new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), 2));
        g.setIndex([0, 1, 2, 2, 1, 3]);
        const mat = new ShaderMaterial({
          vertexShader: NAME_VERTEX,
          fragmentShader: NAME_FRAGMENT,
          uniforms: { uTex: { value: null }, uFarbe: { value: new Color() }, uStaerke: { value: 0 } },
          depthTest: false,
          depthWrite: false,
          transparent: true,
          side: DoubleSide,
          blending: CustomBlending,
          blendEquation: AddEquation,
          blendSrc: OneFactor,
          blendDst: OneMinusSrcAlphaFactor,
        });
        const mesh = new Mesh(g, mat);
        mesh.renderOrder = -15;
        mesh.frustumCulled = false;
        mesh.visible = false;
        this.szene.add(mesh);
        e = { mesh, mat, text: '', tex: null };
        this.namen[i] = e;
      }
      const P = (e.mesh.geometry.getAttribute('position') as BufferAttribute).array as Float32Array;
      const ecke = (a: number, b: number, k: number): void => {
        P[k * 3] = n.mitte.x + n.u.x * a + n.v.x * b;
        P[k * 3 + 1] = n.mitte.y + n.u.y * a + n.v.y * b;
        P[k * 3 + 2] = n.mitte.z + n.u.z * a + n.v.z * b;
      };
      ecke(-0.5, -0.5, 0);
      ecke(0.5, -0.5, 1);
      ecke(-0.5, 0.5, 2);
      ecke(0.5, 0.5, 3);
      (e.mesh.geometry.getAttribute('position') as BufferAttribute).needsUpdate = true;
      if (e.text !== n.text) {
        e.text = n.text;
        const eintrag = e;
        const zeichnen = (): void => {
          const c = document.createElement('canvas');
          const ctx = c.getContext('2d')!;
          const gr = 200;
          ctx.font = `${gr}px Lobster`;
          const b = Math.ceil(ctx.measureText(n.text).width + gr * 0.3);
          c.width = b;
          c.height = Math.round(gr * 1.3);
          ctx.font = `${gr}px Lobster`;
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'alphabetic';
          ctx.fillText(n.text, b / 2, gr * 1.02);
          eintrag.tex?.dispose();
          const t = new CanvasTexture(c);
          t.minFilter = LinearMipmapLinearFilter;
          t.magFilter = LinearFilter;
          t.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
          t.needsUpdate = true;
          eintrag.tex = t;
          eintrag.mat.uniforms.uTex!.value = t;
          format(i, c.width / c.height);
        };
        const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
        if (fonts) void fonts.load('200px Lobster').then(zeichnen, zeichnen);
        else zeichnen();
      }
    });
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
    this.geoBlase = null;
    this.geoRahmen = null;
    this.koerper = k;
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
    const dazu = (g: BufferGeometry, m: ShaderMaterial, ordnung: number): void => {
      const mesh = new Mesh(g, m);
      mesh.renderOrder = ordnung;
      mesh.frustumCulled = false;
      this.szene.add(mesh);
      this.netze.push(mesh);
    };
    this.matsWand.forEach((m, i) => dazu(this.geoBlase!, m, -20 + i));
    this.matsRahmen.forEach((m, i) => dazu(this.geoRahmen!, m, -10 + i));
    this.mats.forEach((m, i) => dazu(this.geoBlase!, m, i));
    // alle Shader jetzt übersetzen, nicht erst, wenn sie mitten im Aufblasen sichtbar werden (sonst stockt ein Bild)
    for (const mesh of this.netze) mesh.visible = true;
    this.renderer.compile(this.szene, new OrthographicCamera(-1, 1, 1, -1, 0, 1));
  }

  /** nach `Koerper.setzen`: Lagen, Normalen, Dehnung, Sichtbarkeit hochladen */
  hochladen(): void {
    for (const g of [this.geoBlase, this.geoRahmen]) {
      if (!g) continue;
      for (const n of ['position', 'normal', 'aDehnung', 'aSicht']) (g.getAttribute(n) as BufferAttribute).needsUpdate = true;
    }
  }

  zeichnen(kamera: PerspectiveCamera, w: HautWerte): void {
    const r = this.renderer;
    const durch = DURCHSICHTIG[w.fassung]!;
    const setzen = (m: ShaderMaterial, anteil: number): void => {
      const u = m.uniforms;
      u.uZeit!.value = w.zeit;
      u.uFassung!.value = w.fassung;
      u.uNacht!.value = w.nacht ? 1 : 0;
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
    this.matsWand.forEach((m, i) => {
      const wand = w.waende[i];
      m.uniforms.uAchse!.value = wand?.achse ?? 0;
      m.uniforms.uWand!.value = wand?.lage ?? 0;
      m.uniforms.uZ!.value = wand?.z ?? 0;
      m.uniforms.uStaerke!.value = wand?.staerke ?? 0;
      (m.uniforms.uFarbe!.value as Color).copy(w.schattenFarbe);
    });
    let k = 0;
    for (const mesh of this.netze) {
      const m = mesh.material as ShaderMaterial;
      const i = this.mats.indexOf(m);
      const j = this.matsRahmen.indexOf(m);
      const v = this.matsWand.indexOf(m);
      if (i >= 0) mesh.visible = durch ? i < 4 : i === 4;
      else if (j >= 0) mesh.visible = j < 4 && w.rahmen > 1e-3;
      else if (v >= 0) mesh.visible = (w.waende[v]?.staerke ?? 0) > 1e-3;
      k++;
    }
    void k;
    this.namen.forEach((e, i) => {
      const z = w.namen[i];
      const s = z && e.tex ? z.staerke : 0;
      e.mesh.visible = s > 1e-3;
      e.mat.uniforms.uStaerke!.value = s;
      const grau = w.nacht ? NAME_NACHT : NAME_GRAU;
      const tinte = w.nacht ? NAME_NACHT_HELL : NAME_TINTE;
      (e.mat.uniforms.uFarbe!.value as Color).copy(grau).lerp(tinte, z?.hervor ?? 0);
    });
    const grund = (w.nacht ? NACHT : PAPIER).clone();
    r.setRenderTarget(this.ziel);
    r.setClearColor(grund, 1);
    r.clear(true, true, false);
    r.render(this.szene, kamera);
    r.setRenderTarget(null);
    r.render(this.ende.szene, this.ende.kamera);
  }
}
