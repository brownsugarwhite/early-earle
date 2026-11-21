/**
 * Fell (Fell & Flausch; Florian, 21.11.: „wir brauchen eine richtig gute art fell mit verschiedensten mustern als shader
 * darzustellen. Ich fand Ghibli shader schon sehr cool. Gerne mehr davon mit mustern und andere stile.“). Plan
 * `docs/plans/2026-11-21-ozzy-shader-runde-6.md`, Recherche `docs/research/2026-11-21-fell-flausch-recherche.md`.
 *
 * **Fell aus Schalen** (Lengyel u. a. 2001): Das Netz des Kerns wird instanziert gezeichnet, die Haut und N Schalen in einem
 * Durchgang, jede Schale ein Stück weiter außen längs der Normale und in Strichrichtung geneigt (längs der Körperachse, mit der
 * Schwerkraft nach unten). Jede Schale zeigt die Querschnitte der Haare in ihrer Höhe; so hat das Fell eine echte Silhouette und
 * hängt fest an der Form. Kantenglättung über Deckung zu Abtastungen (MSAA, alpha to coverage): beim Drehen ruhig.
 *
 * - **Haare** (Echt, Plüsch): eine Zelle im Raum je Haar, Länge je Haar verschieden, zur Spitze dünner; **Büschel**: die Spitzen
 *   laufen zur Mitte ihres Büschels (Silva u. a. 2010); **Locken**: der Ort der Wurzel wandert mit der Höhe auf einem Kreis.
 *   Werden die Haare im Bild zu fein, rücken sie auseinander und werden dicker (kein Flimmern).
 * - **Büschel als Kegel** (Ghibli, Anime, Spider-Verse, Manga): Zellen im Raum, je Zelle ein Kegel, der nächste nach Abstand durch
 *   Radius gewinnt; an der Wurzel decken sie sich, zur Spitze trennen sie sich. Die Normale des Kegels gibt jedem Büschel Licht und
 *   Schatten (gemalt, nicht gefiltert: so bleibt das Bild bei Bewegung an der Form).
 * - **Muster** an der Wurzel jedes Haars (Haar für Haar), Agouti-Bänder längs des Haars, Scheckung (weiß von unten und an den Enden),
 *   Farbton drehbar.
 * - **Licht** Echt: Kajiya-Kay mit zwei verschobenen Glanzlinien (Scheuermann 2004), Wurzeln dunkler, Gegenlicht am Rand.
 */
import { BufferGeometry, FrontSide, GLSL3, InstancedBufferGeometry, type IUniform, Matrix4, Mesh, Points, RawShaderMaterial, Scene, type Texture } from 'three';
import { WeicheMaske } from '../bildShader';
import { G_UNIFORMS } from '../daten';
import { DRUCK, FARBE, LICHT, RAUSCHEN } from '../glsl';
import type { ReglerZeile, ShaderGruppe, ShaderKern, ShaderLauf, ShaderWerte, Voreinstellung } from '../kern';
import { BUEHNEN } from './buehnen';
import { TIER_ZELLEN } from './tiere';

export const FELL_STILE = ['Echt', 'Ghibli', 'Anime', 'Spider-Verse', 'Manga', 'Plüsch'];
export const FELL_MUSTER = [
  'Uni',
  'Tiger',
  'Leopard',
  'Gepard',
  'Jaguar',
  'Schneeleopard',
  'Zebra',
  'Giraffe',
  'Katze getigert',
  'Katze marmoriert',
  'Kaliko',
  'Schildpatt',
  'Siam',
  'Dalmatiner',
  'Kuh',
  'Fuchs',
  'Waschbär',
  'Wildhund',
  'Merle',
];
/** Felltypen: Länge (Anteil vom Radius der Form), Abstand der Haare, Büschel, Strich, Schwerkraft, Locken, Schalen */
const TYPEN = [
  { name: 'kurz', L: 0.035, s: 0.0045, busch: 0.25, strich: 0.7, schwer: 0.2, locke: 0, n: 18 },
  { name: 'Doppelfell', L: 0.07, s: 0.0055, busch: 0.5, strich: 0.55, schwer: 0.3, locke: 0, n: 26 },
  { name: 'Plüsch', L: 0.028, s: 0.0035, busch: 0, strich: 0.1, schwer: 0, locke: 0, n: 14 },
  { name: 'lang', L: 0.12, s: 0.0065, busch: 0.7, strich: 0.9, schwer: 0.8, locke: 0, n: 34 },
  { name: 'Zotteln', L: 0.17, s: 0.011, busch: 0.85, strich: 0.7, schwer: 1, locke: 0.25, n: 38 },
  { name: 'Locken', L: 0.075, s: 0.006, busch: 0.6, strich: 0.2, schwer: 0.1, locke: 1, n: 30 },
];
/** gezeichnete Stile (Ghibli, Anime, Spider-Verse, Manga): wenige dicke Haare in großen Büscheln, die spitz zusammenlaufen */
const ZEICHNUNG = [
  { s: 0, busch: 0, gross: 7 },
  { s: 0.015, busch: 0.9, gross: 7 },
  { s: 0.062, busch: 0, gross: 7 },
  { s: 0.056, busch: 0, gross: 7 },
  { s: 0.056, busch: 0, gross: 7 },
  { s: 0, busch: 0, gross: 7 },
];

const SCHALEN_VERTEX_KOPF = /* glsl */ `
precision highp float;
uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform vec3 uHalb;
uniform float uRadius;
uniform float uSchalen;
uniform float uLaenge;
uniform float uStrich;
uniform float uSchwer;
uniform sampler2D tMuster;
uniform float uMusterBreite;
in vec3 position;
in vec3 normal;
in float aSeite;
out vec3 vMuster;
out float vAgouti;
out vec3 vWelt;
out vec3 vWurzel;
out vec3 vNormal;
out vec2 vSpiegel;
out float vH;
out vec3 vStrich;
void main() {
  float h = float(gl_InstanceID) / max(uSchalen, 1.0);
  vec4 w0 = modelMatrix * vec4(position, 1.0);
  vec3 n = normalize(mat3(modelMatrix) * normal);
  // Strich: längs der längsten Achse der Seitenebene und mit der Schwerkraft nach unten, in die Fläche gelegt
  vec3 ach = pow(uHalb / max(uHalb.x, uHalb.y), vec3(4.0));
  vec3 A = normalize(vec3(ach.x, ach.y, 0.0) + vec3(1e-3, 0.0, 0.0));
  vec3 s = -A * uStrich + vec3(0.0, -1.0, 0.0) * uSchwer;
  s -= n * dot(s, n);
  float L = uLaenge * uRadius;
  vec3 w = w0.xyz + (n * h + s * h * h) * L;
  vWelt = w;
  vWurzel = w0.xyz;
  vNormal = n;
  vSpiegel = vec2(aSeite, position.z);
  vH = h;
  vStrich = s;
  // das Muster je Ecke an der Wurzel, einmal gerechnet (MUSTER_PUNKTE); ein Fellmuster ist weicher als ein Dreieck
  int W = int(uMusterBreite);
  vec4 m = texelFetch(tMuster, ivec2(gl_VertexID % W, gl_VertexID / W), 0);
  vMuster = m.rgb;
  vAgouti = m.a;
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
}
`;

/** das Muster einmal je Ecke: jede Ecke ein Punkt in einer Textur (Zeile für Zeile, uMusterBreite je Zeile) */
const MUSTER_PUNKTE_VERTEX = /* glsl */ `
precision highp float;
uniform mat4 modelMatrix;
uniform vec3 uHalb;
uniform float uRadius;
uniform vec3 uMitte;
uniform float uScheckung;
uniform float uMusterBreite;
uniform float uMusterHoehe;
in vec3 position;
in vec3 normal;
out vec4 vMuster;
void main() {
  vec4 w0 = modelMatrix * vec4(position, 1.0);
  vec3 n = normalize(mat3(modelMatrix) * normal);
  vec3 q = (w0.xyz - uMitte) / uRadius;
  float ag;
  vec3 c = tonDrehen(fellMuster(int(uR_muster + 0.5), q, n, ag), uR_farbton);
  vMuster = vec4(scheckung(c, q, n, uScheckung), ag);
  float i = float(gl_VertexID);
  vec2 xy = vec2(mod(i, uMusterBreite), floor(i / uMusterBreite));
  gl_Position = vec4((xy + 0.5) / vec2(uMusterBreite, uMusterHoehe) * 2.0 - 1.0, 0.0, 1.0);
  gl_PointSize = 1.0;
}
`;
const MUSTER_PUNKTE_FRAGMENT = /* glsl */ `
precision highp float;
in vec4 vMuster;
out vec4 farbe;
void main() { farbe = vMuster; }
`;
const MUSTER_BREITE = 1024;

/** Muster: Haarfarbe (sRGB) an der Wurzel q (Maß der Form); agouti 0 … 1 (Bänder im Haar) */
const MUSTER = /* glsl */ `
vec3 tonDrehen(vec3 c, float grad) {
  if (abs(grad) < 0.5) return c;
  const mat3 zuYIQ = mat3(0.299, 0.596, 0.211, 0.587, -0.274, -0.523, 0.114, -0.322, 0.312);
  const mat3 ausYIQ = mat3(1.0, 1.0, 1.0, 0.956, -0.272, -1.106, 0.621, -0.647, 1.703);
  vec3 y = zuYIQ * c;
  float w = radians(grad), cs = cos(w), sn = sin(w);
  y = vec3(y.x, y.y * cs - y.z * sn, y.y * sn + y.z * cs);
  return clamp(ausYIQ * y, 0.0, 1.0);
}
/** wie weit außen ein Ort liegt: 0 in der Mitte der Form, 1 am Rand ihres Kastens (Enden: Ohren, Pfoten, Schwanz) */
float aussen(vec3 q) { return length(q / max(uHalb / uRadius, vec3(0.05))); }
vec3 fellMuster(int m, vec3 q, vec3 n0, out float agouti) {
  vec3 A, B, C;
  achsen(A, B, C);
  float t = acos(clamp(n0.y, -1.0, 1.0)) / 3.14159;
  float bauch = smoothstep(0.62, 0.8, t + 0.05 * snoise(q * 4.0));
  float ende = smoothstep(0.72, 1.0, aussen(q) + 0.08 * snoise(q * 3.0));
  vec3 weiss = vec3(0.96, 0.95, 0.91);
  vec3 c;
  agouti = 0.0;
  if (m == 0) {
    c = mix(vec3(0.34, 0.23, 0.14), vec3(0.6, 0.46, 0.31), smoothstep(0.2, 0.6, t));
    c = mix(c, vec3(0.86, 0.8, 0.7), bauch);
    c *= 0.9 + 0.2 * snoise(q * 3.0);
    agouti = 0.7;
  } else if (m == 1) {
    vec2 ph = phasor3(q * 3.7, A, 1.75, 0.4);
    float amp = length(ph);
    float welle = ph.y / max(amp, 1e-4);
    float schwelle = 0.25 + 0.45 * smoothstep(-0.3, 0.6, snoise(q * 1.7 + 3.0)) - 0.2 * smoothstep(0.2, 0.8, n0.y);
    schwelle = mix(schwelle, 1.1, smoothstep(0.55, 0.8, t));
    schwelle = mix(1.1, schwelle, smoothstep(0.08, 0.3, amp));
    float streifen = smoothstep(schwelle - 0.04, schwelle + 0.04, welle);
    c = mix(vec3(0.86, 0.42, 0.1), vec3(0.95, 0.66, 0.36), smoothstep(0.35, 0.65, t));
    c = mix(c, weiss, bauch);
    c = mix(c, vec3(0.05, 0.035, 0.03), streifen);
  } else if (m == 2 || m == 4 || m == 5) {
    // Rosetten: Leopard, Jaguar (größer, mit Punkt), Schneeleopard (grau, groß und offen)
    float gr = m == 4 ? 5.2 : (m == 5 ? 4.6 : 6.4);
    vec3 mz;
    float id;
    float e = zelleRand3(q * gr, mz, id);
    e = mix(e, 0.42 - length(mz), 0.45) + 0.02 * snoise(q * 50.0);
    vec3 ri = normalize(mz + 1e-4);
    float bruch = snoise(ri * 0.7 + id * 37.0) + 0.3 * snoise(ri * 1.6 + id * 11.0);
    float luecke = 0.035 + 0.035 * hash11(id * 5.1);
    float dicke = (0.09 + 0.07 * hash11(id * 8.3)) * smoothstep(-0.3, 0.2, bruch) * (m == 5 ? 1.3 : 1.0);
    float ring = smoothstep(luecke - 0.01, luecke + 0.01, e) * (1.0 - smoothstep(luecke + dicke - 0.01, luecke + dicke + 0.01, e)) * step(0.005, dicke);
    float innen = smoothstep(luecke + 0.1, luecke + 0.13, e);
    float punktIn = m == 4 ? (1.0 - smoothstep(0.05, 0.09, length(mz) + 0.02 * snoise(q * 30.0))) * step(0.35, hash11(id * 3.3)) : 0.0;
    vec3 grund = m == 5 ? vec3(0.8, 0.79, 0.76) : (m == 4 ? vec3(0.78, 0.5, 0.2) : vec3(0.8, 0.56, 0.25));
    vec3 hof = m == 5 ? vec3(0.7, 0.69, 0.66) : grund * vec3(0.85, 0.74, 0.6);
    vec3 tinte = m == 5 ? vec3(0.2, 0.2, 0.21) : vec3(0.05, 0.035, 0.025);
    float ros = 1.0 - smoothstep(0.5, 0.72, t);
    c = mix(grund, weiss, bauch);
    c = mix(c, hof, innen * ros * 0.7);
    float voll = smoothstep(0.15, 0.19, e) * smoothstep(0.45, 0.7, t) * (1.0 - bauch * 0.6);
    c = mix(c, tinte, max(max(ring, punktIn) * ros, voll));
    agouti = m == 5 ? 0.3 : 0.0;
  } else if (m == 3) {
    float id;
    vec4 z = zelle3(q * 10.0, id);
    float fleck = 1.0 - smoothstep(0.24, 0.3, z.w + 0.05 * snoise(q * 25.0));
    c = mix(vec3(0.84, 0.62, 0.3), weiss * vec3(1.0, 0.97, 0.9), bauch);
    c = mix(c, vec3(0.05, 0.04, 0.03), fleck * (1.0 - bauch * 0.7));
  } else if (m == 6) {
    vec2 ph = phasor3(q * 2.6, A, 2.0, 0.25);
    float welle = ph.y / max(length(ph), 1e-4);
    float rest = sin(dot(q, A) * 26.0 + 2.0 * snoise(q * 2.0));
    welle = mix(rest, welle, smoothstep(0.05, 0.25, length(ph)));
    float streifen = smoothstep(-0.06, 0.06, welle);
    c = mix(weiss, vec3(0.03, 0.03, 0.035), streifen * (1.0 - bauch * 0.85));
  } else if (m == 7) {
    vec3 w = q * 4.4 + 0.13 * vec3(snoise(q * 5.0), snoise(q * 5.0 + 3.0), snoise(q * 5.0 + 6.0));
    vec4 vo = voronoiF3(w);
    float abst = min(vo.y - vo.x, (vo.z - vo.x) * 0.55 + 0.02) + 0.018 * snoise(q * 45.0);
    float ader = 1.0 - smoothstep(0.055, 0.075, abst);
    vec3 fleck = mix(vec3(0.6, 0.31, 0.12), vec3(0.42, 0.19, 0.075), hash11(vo.w * 13.0)) * (0.78 + 0.28 * smoothstep(0.0, 0.32, abst));
    vec3 creme = vec3(0.94, 0.88, 0.72);
    c = mix(mix(fleck, creme, ader), creme, bauch);
  } else if (m == 8) {
    // getigert (Makrele): schmale Querstreifen vom Rücken nach unten, drei Linien längs des Rückens
    float bb = dot(q, A) * 9.0 + 0.6 * snoise(q * 2.0) + 0.2 * snoise(q * 6.0);
    float breite = 0.2 * (1.0 - smoothstep(0.42, 0.72, t)) * mix(1.0, smoothstep(-0.2, 0.4, snoise(q * 8.0)), smoothstep(0.3, 0.6, t));
    float streifen = 1.0 - smoothstep(breite - 0.03, breite + 0.03, abs(fract(bb) - 0.5));
    float ruecken = max(1.0 - smoothstep(0.01, 0.02, abs(abs(q.z) - 0.05)), 1.0 - smoothstep(0.008, 0.016, abs(q.z))) * smoothstep(0.32, 0.12, t);
    c = mix(vec3(0.5, 0.42, 0.33), vec3(0.72, 0.64, 0.52), smoothstep(0.3, 0.7, t));
    c = mix(c, vec3(0.9, 0.86, 0.78), bauch);
    c = mix(c, vec3(0.1, 0.08, 0.06), max(streifen * step(0.01, breite), ruecken));
    agouti = 1.0;
  } else if (m == 9) {
    // marmoriert (Classic): Ringe um einen Punkt der Flanke, drei Linien längs des Rückens
    vec2 sp = vec2(dot(q, A) - 0.12, q.y + 0.02);
    float r = length(sp * vec2(1.0, 1.25)) + 0.06 * snoise(q * 3.0);
    float wirbel = (1.0 - smoothstep(0.14, 0.2, abs(fract(r * 5.5) - 0.5))) * (1.0 - smoothstep(0.55, 0.75, t));
    float ruecken = max(1.0 - smoothstep(0.012, 0.024, abs(abs(q.z) - 0.05)), 1.0 - smoothstep(0.01, 0.02, abs(q.z))) * smoothstep(0.35, 0.15, t);
    c = mix(vec3(0.6, 0.44, 0.28), vec3(0.74, 0.6, 0.44), smoothstep(0.3, 0.7, t));
    c = mix(c, vec3(0.9, 0.85, 0.76), bauch);
    c = mix(c, vec3(0.11, 0.07, 0.045), max(wirbel, ruecken));
    agouti = 0.8;
  } else if (m == 10 || m == 11) {
    // Kaliko (große Flecken Rot und Schwarz, dazu viel Weiß), Schildpatt (fein gemischt, kein Weiß)
    float gr = m == 10 ? 2.6 : 6.5;
    vec3 w = q * gr + 0.35 * vec3(snoise(q * 3.0), snoise(q * 3.0 + 4.0), snoise(q * 3.0 + 8.0));
    vec3 vo = voronoi3(w);
    vec3 rot = vec3(0.88, 0.48, 0.17), schwarz = vec3(0.07, 0.06, 0.06);
    c = vo.z < 0.5 ? rot : schwarz;
    if (m == 11) c = mix(c, vo.z < 0.5 ? schwarz : rot, smoothstep(0.25, 0.45, snoise(q * 22.0)));
    // Kaliko: dazu viel Weiß von unten und an den Enden
    if (m == 10) {
      float wf = (t - 0.5) * 1.6 + aussen(q) * 0.9 + 0.35 * snoise(q * 2.2 + 17.0) + 0.15 * snoise(q * 6.0);
      c = mix(c, weiss, smoothstep(0.75, 0.81, wf));
    }
  } else if (m == 12) {
    c = mix(vec3(0.93, 0.87, 0.75), vec3(0.98, 0.95, 0.9), bauch);
    c = mix(c, vec3(0.2, 0.13, 0.09), smoothstep(0.7, 0.98, aussen(q) + 0.08 * snoise(q * 3.0)));
  } else if (m == 13) {
    float id;
    vec4 z = zelle3(q * 7.5, id);
    float r = 0.17 + 0.13 * hash11(id * 3.1);
    float fleck = (1.0 - smoothstep(r - 0.03, r + 0.03, z.w + 0.03 * snoise(q * 20.0))) * step(0.25, id);
    c = mix(vec3(0.97, 0.97, 0.95), vec3(0.04, 0.04, 0.045), fleck);
  } else if (m == 14) {
    vec3 w = q * 1.6 + 0.5 * vec3(snoise(q * 1.5), snoise(q * 1.5 + 3.0), snoise(q * 1.5 + 6.0));
    float f = snoise(w) + 0.35 * snoise(w * 2.7) + 0.12 * snoise(w * 7.0);
    c = mix(vec3(0.96, 0.95, 0.92), vec3(0.05, 0.05, 0.055), smoothstep(0.05, 0.12, f) * (1.0 - bauch * 0.5));
  } else if (m == 15) {
    // Fuchs: Rot, weiße Brust und Bauch, dunkle Pfoten (unten an den Enden), weiße Spitze am äußersten Ende
    c = mix(vec3(0.82, 0.38, 0.1), vec3(0.9, 0.56, 0.22), smoothstep(0.3, 0.6, t));
    c = mix(c, weiss, smoothstep(0.56, 0.7, t + 0.05 * snoise(q * 4.0)));
    float unten = smoothstep(-0.15, -0.55, q.y / max(uHalb.y / uRadius, 0.05)) * ende;
    c = mix(c, vec3(0.08, 0.05, 0.04), smoothstep(0.3, 0.6, unten));
    c = mix(c, weiss, smoothstep(0.9, 1.0, aussen(q)) * (1.0 - smoothstep(0.3, 0.6, unten)));
    agouti = 0.35;
  } else if (m == 16) {
    // Waschbär: graues Wildfell, schwarze Ringe an den Enden
    c = mix(vec3(0.42, 0.4, 0.37), vec3(0.62, 0.6, 0.56), smoothstep(0.3, 0.7, t));
    c = mix(c, vec3(0.85, 0.83, 0.78), bauch);
    float ring = step(0.5, fract(dot(q, A) * 7.0 + 0.1 * snoise(q * 3.0)));
    c = mix(c, vec3(0.08, 0.07, 0.07), ring * ende);
    agouti = 1.0;
  } else if (m == 17) {
    // Wildhund: Flicken in Schwarz, Gelb und Weiß, dunkle Grenzen
    vec3 w = q * 3.4 + 0.45 * vec3(snoise(q * 2.4), snoise(q * 2.4 + 3.0), snoise(q * 2.4 + 6.0));
    vec3 vo = voronoi3(w);
    c = vo.z < 0.4 ? vec3(0.06, 0.05, 0.04) : (vo.z < 0.75 ? vec3(0.78, 0.6, 0.3) : vec3(0.93, 0.9, 0.82));
    c *= 1.0 - 0.35 * (1.0 - smoothstep(0.0, 0.06, vo.y - vo.x));
  } else {
    // Merle: blaugrau verdünnt, schwarze Flicken, weißer Bauch, lohfarbene Abzeichen
    c = mix(vec3(0.6, 0.62, 0.66), vec3(0.75, 0.76, 0.78), smoothstep(0.3, 0.7, t));
    float f = snoise(q * 4.0) + 0.5 * snoise(q * 9.0) + 0.25 * snoise(q * 20.0);
    c = mix(c, vec3(0.06, 0.06, 0.07), smoothstep(0.35, 0.42, f));
    c = mix(c, vec3(0.7, 0.42, 0.2), smoothstep(0.6, 0.66, t) * (1.0 - bauch) * 0.8);
    c = mix(c, weiss, bauch * 0.9);
  }
  return c;
}
/** Scheckung: weiß von unten und an den Enden her, mit unregelmäßiger Grenze (wie die Pigmentzellen nicht hinkommen) */
vec3 scheckung(vec3 c, vec3 q, vec3 n0, float staerke) {
  if (staerke < 0.01) return c;
  float t = acos(clamp(n0.y, -1.0, 1.0)) / 3.14159;
  float wf = (t - 0.5) * 1.6 + aussen(q) * 0.9 + 0.35 * snoise(q * 2.2 + 17.0) + 0.15 * snoise(q * 6.0);
  float schwelle = 1.6 - staerke * 1.5;
  return mix(c, vec3(0.97, 0.96, 0.93), smoothstep(schwelle - 0.03, schwelle + 0.03, wf));
}
`;

/** Haare in Büscheln finden */
const HAARE = /* glsl */ `
struct Haar { float a; float id; float bid; vec3 wurzel; float rand; vec3 quer; float hoehe; };
/** nächste Zelle unter den acht nächsten (Mitten in 0,15 … 0,85 gestreut): Vektor zur Mitte (xyz), Abstand (w), Kennung */
vec4 zelleAcht(vec3 x, out float id) {
  vec3 p = floor(x), f = fract(x);
  vec3 o = step(0.5, f) - 1.0;
  vec4 best = vec4(0.0, 0.0, 0.0, 9.0);
  id = 0.0;
  for (int k = 0; k <= 1; k++)
    for (int j = 0; j <= 1; j++)
      for (int i = 0; i <= 1; i++) {
        vec3 b = o + vec3(float(i), float(j), float(k));
        vec3 r = b + 0.15 + 0.7 * hash33(p + b) - f;
        float d = dot(r, r);
        if (d < best.w) { best = vec4(r, d); id = hash13(p + b + 0.37); }
      }
  best.w = sqrt(best.w);
  return best;
}
/**
 * Haare: eine Zelle je Haar (s: Abstand im Maß der Form, dicke: Radius in Zellen; die Wurzel bleibt so in ihrer Zelle, kein
 * Nachbar nötig), in Büscheln (Zellen der Größe s * gross; die Spitzen laufen zur Mitte, busch 0 … 1), Locken verschieben den Ort
 * der Wurzel auf einem Kreis. bid, rand, quer: das Büschel (Kennung, Lage darin 0 Mitte … 1 Rand, Richtung von seiner Mitte).
 */
Haar haarDuenn(vec3 q, vec3 n, float h, float s, float busch, float locke, float dicke, float gross) {
  Haar r;
  vec3 qr = q;
  r.bid = 0.0;
  r.rand = 0.5;
  r.quer = vec3(0.0);
  if (busch > 0.001) {
    float C = s * gross;
    float cid;
    vec4 z = zelleAcht(q / C, cid);
    vec3 c = q + z.xyz * C;
    c -= n * dot(c - q, n);
    float k = busch * smoothstep(0.0, 1.0, h);
    qr = c + (q - c) / max(1.0 - k, 0.08);
    r.bid = cid;
    r.quer = (qr - c) / C;
    r.rand = clamp(length(r.quer) * 1.6, 0.0, 1.0);
  }
  if (locke > 0.001) {
    vec3 t1 = normalize(cross(n, vec3(0.31, 0.93, 0.17)));
    vec3 t2 = cross(n, t1);
    float w = h * locke * 10.0 + 6.28318 * snoise(q * 3.0);
    qr -= (t1 * cos(w) + t2 * sin(w)) * s * 1.1 * min(h * 3.0, 1.0);
  }
  vec3 hq = qr / s;
  vec3 ci = floor(hq);
  vec3 seed = ci + 0.5 + (0.5 - dicke) * (2.0 * hash33(ci) - 1.0);
  vec3 d = hq - seed;
  d -= n * dot(d, n);
  float dist = length(d);
  float laenge = mix(0.5, 1.0, hash13(ci + 3.1));
  float rr = dicke * pow(max(1.0 - h / laenge, 0.0), 0.6);
  float aa = min(fwidth(dist), 0.2) * 0.7 + 0.02;
  r.a = (1.0 - smoothstep(rr - aa, rr + aa, dist)) * step(h, laenge);
  r.id = hash13(ci + 0.71);
  r.wurzel = seed * s;
  r.hoehe = clamp(h / laenge, 0.0, 1.0);
  if (busch <= 0.001) {
    r.rand = dist / max(rr, 1e-4);
    r.quer = d;
  }
  return r;
}
/**
 * Büschel als Flammen (Anime, Spider-Verse, Manga): Zellen im Raum, je Zelle ein Büschel, im Querschnitt längs des Strichs gestreckt
 * (S: Strichrichtung in der Fläche), zur Spitze spitz; der nächste nach Abstand durch Radius gewinnt (an der Wurzel decken sie sich,
 * zur Spitze trennen sie sich). Klare Formen, wie gezeichnet.
 */
Haar bueschel(vec3 q, vec3 n, float h, float s, float spitz, vec3 S) {
  Haar r;
  vec3 hq = q / s;
  vec3 p = floor(hq);
  vec3 o = step(0.5, fract(hq)) - 1.0;
  vec3 Sa = length(S) > 1e-3 ? normalize(S) : normalize(cross(n, vec3(0.31, 0.93, 0.17)));
  vec3 Sq = cross(n, Sa);
  float best = 9.0;
  vec3 bestSeed = vec3(0.0), bestD = vec3(0.0);
  float bestId = 0.0, bestL = 1.0;
  for (int k = 0; k <= 1; k++)
    for (int j = 0; j <= 1; j++)
      for (int i = 0; i <= 1; i++) {
        vec3 b = p + o + vec3(float(i), float(j), float(k));
        vec3 seed = b + 0.15 + 0.7 * hash33(b);
        vec3 d = hq - seed;
        d -= n * dot(d, n);
        vec2 dl = vec2(dot(d, Sa) / 1.45, dot(d, Sq));
        float lg = mix(0.62, 1.0, hash13(b + 3.1));
        float rr = (0.58 + 0.24 * hash13(b + 7.7)) * pow(max(1.0 - h / lg, 0.0), spitz);
        float e = length(dl) / max(rr, 1e-4);
        if (e < best) { best = e; bestSeed = seed; bestD = d; bestId = hash13(b + 0.71); bestL = lg; }
      }
  float aa = min(fwidth(best), 0.3) * 0.7 + 0.02;
  r.a = 1.0 - smoothstep(1.0 - aa, 1.0 + aa, best);
  r.id = bestId;
  r.bid = bestId;
  r.wurzel = bestSeed * s;
  r.rand = best;
  r.quer = bestD;
  r.hoehe = clamp(h / bestL, 0.0, 1.0);
  return r;
}
/** Normale eines Büschels (eine runde Strähne um seine Mitte): aus der Fläche und der Richtung von der Mitte weg */
vec3 bueschelNormale(vec3 n0, Haar f) {
  vec3 nq = normalize(f.quer + n0 * 1e-4 + 1e-6);
  return normalize(n0 * (1.15 - 0.55 * f.rand) + nq * f.rand * 0.85);
}
`;

/** die Stile: Farbe eines Haars oder Büschels (sRGB) */
const STILE = /* glsl */ `
vec3 lichtSicht() { return ausSicht(normalize(vec3(-0.55, 0.62, 0.55))); }
vec3 randSicht() { return ausSicht(normalize(vec3(0.75, 0.25, -0.6))); }
/** Echt: Kajiya-Kay mit zwei verschobenen Glanzlinien, Wurzeln dunkler, Gegenlicht am Rand */
vec3 fellEcht(vec3 alb, vec3 n0, vec3 T, vec3 V, float h, float samt) {
  vec3 L = lichtSicht(), Lr = randSicht();
  vec3 a = srgbZuLin(alb);
  float ao = mix(0.2, 1.0, pow(clamp(h, 0.0, 1.0), 0.75));
  float wrap = clamp((dot(n0, L) + 0.35) / 1.35, 0.0, 1.0);
  float tl = dot(T, L);
  float kd = sqrt(max(1.0 - tl * tl, 0.0));
  vec3 c = a * (vec3(1.0, 0.95, 0.88) * 2.3 * wrap * mix(0.65, 1.0, kd) + vec3(0.2, 0.24, 0.3) * (0.6 + 0.4 * n0.y)) * ao;
  vec3 H = normalize(L + V);
  vec3 T1 = normalize(T + n0 * 0.25), T2 = normalize(T - n0 * 0.2);
  float th1 = dot(T1, H), th2 = dot(T2, H);
  float s1 = pow(sqrt(max(1.0 - th1 * th1, 0.0)), 90.0);
  float s2 = pow(sqrt(max(1.0 - th2 * th2, 0.0)), 22.0);
  c += (vec3(1.0) * s1 * 0.22 + a * s2 * 0.55) * wrap * ao * (1.0 - samt * 0.7);
  float nv = clamp(abs(dot(n0, V)), 0.0, 1.0);
  float rim = pow(1.0 - nv, 2.5) * clamp(dot(n0, Lr) + 0.3, 0.0, 1.0);
  c += vec3(1.0, 0.84, 0.62) * rim * (0.35 + a * 1.5) * clamp(h, 0.0, 1.0) * 1.2;
  // Samt (Plüsch): am Rand heller, die Haare stehen dort quer zum Blick
  c += a * pow(1.0 - nv, 2.0) * samt * 1.4 * wrap;
  return linZuSrgb(aces(c * 1.02));
}
/** Ghibli: gemalte Büschel in drei Tönen (Licht warm, Mitte, Schatten kühl), sanft nach der Form, jedes Büschel etwas anders
 * gemischt, Pinselspur längs des Haars, helle Spitzen im Licht (die Striche zwischen den Büscheln setzt das Bild) */
vec3 fellGhibli(vec3 alb, vec3 n0, Haar f, float h) {
  vec3 nb = bueschelNormale(n0, f);
  float v = dot(normalize(mix(n0, nb, 0.35)), lichtSicht());
  vec3 licht = alb * vec3(1.1, 0.98, 0.84) + vec3(0.04, 0.03, 0.0);
  vec3 mitte = alb * 0.86;
  vec3 schatten = alb * vec3(0.48, 0.52, 0.76) + vec3(0.0, 0.01, 0.04);
  float s1 = smoothstep(-0.08, 0.08, v), s2 = smoothstep(0.4, 0.54, v);
  vec3 c = mix(schatten, mitte, s1);
  c = mix(c, licht, s2);
  c *= 0.95 + 0.1 * f.id;
  c *= mix(0.8, 1.0, smoothstep(0.0, 0.5, f.hoehe));
  float spur = noise2(vec2(f.rand * 9.0 + f.id * 31.0, f.hoehe * 3.0)) * 0.6 + noise2(vec2(f.rand * 23.0 + f.id * 7.0, f.hoehe * 7.0)) * 0.4;
  c *= 0.93 + 0.1 * spur;
  c = mix(c, min(licht * 1.2 + 0.05, vec3(1.0)), smoothstep(0.6, 0.9, f.hoehe) * s2 * (1.0 - smoothstep(0.2, 0.7, f.rand)) * 0.5);
  return clamp(c, 0.0, 1.0);
}
/** Anime: zwei Töne mit harter Grenze nach Form und Büschel, heller Glanz auf den Spitzen im Licht, Randlicht */
vec3 fellAnime(vec3 alb, vec3 n0, Haar f, float h, vec3 V) {
  vec3 nb = bueschelNormale(n0, f);
  float v = dot(normalize(mix(n0, nb, 0.5)), lichtSicht());
  float aa = fwidth(v) + 1e-3;
  float licht = smoothstep(0.08 - aa, 0.08 + aa, v);
  vec3 sat = clamp(mix(vec3(dot(alb, vec3(0.299, 0.587, 0.114))), alb, 1.25) * 1.08, 0.0, 1.0);
  vec3 c = mix(sat * vec3(0.6, 0.58, 0.82), sat, licht);
  float glanz = smoothstep(0.62, 0.66, f.hoehe) * step(0.45, v) * (1.0 - smoothstep(0.35, 0.45, f.rand)) * step(0.4, f.id);
  c = mix(c, min(sat * 1.3 + 0.16, vec3(1.0)), glanz * 0.9);
  float rim = smoothstep(0.6, 0.66, 1.0 - abs(dot(n0, V))) * step(0.12, dot(n0, randSicht()));
  return mix(c, vec3(1.0, 0.96, 0.88), rim * 0.85);
}
/** Spider-Verse: zwei kräftige Töne, Raster im Halbschatten, Schraffur im Kernschatten, weiße Glanzspitzen, farbiges Randlicht */
vec3 fellSpider(vec3 alb, vec3 n0, Haar f, float h, vec3 V, vec2 css) {
  vec3 nb = bueschelNormale(n0, f);
  float v = dot(normalize(mix(n0, nb, 0.45)), lichtSicht());
  float aa = fwidth(v) + 1e-3;
  float licht = smoothstep(0.1 - aa, 0.1 + aa, v);
  vec3 sat = clamp(mix(vec3(dot(alb, vec3(0.299, 0.587, 0.114))), alb, 1.45) * 1.15 + 0.02, 0.0, 1.0);
  vec3 c = mix(sat * vec3(0.56, 0.5, 0.8), sat, licht);
  float tiefe = (1.0 - licht) * 0.55 + smoothstep(0.0, -0.7, v) * 0.45;
  c = mix(c, sat * vec3(0.28, 0.22, 0.45), punkt(css, tiefe * 0.55, radians(45.0), 5.5) * 0.9);
  c = mix(c, vec3(0.05, 0.03, 0.09), schraffur(css, smoothstep(-0.25, -0.8, v) * 0.55, radians(-35.0), 4.5) * 0.9);
  float sp = smoothstep(0.7, 0.74, f.hoehe) * step(0.55, v) * (1.0 - smoothstep(0.3, 0.38, f.rand)) * step(0.5, f.id);
  c = mix(c, vec3(1.0), sp * 0.9);
  float rim = smoothstep(0.6, 0.66, 1.0 - abs(dot(n0, V))) * step(0.1, dot(n0, ausSicht(normalize(vec3(0.85, -0.35, 0.25)))));
  return mix(c, vec3(0.22, 0.86, 0.96), rim * 0.9);
}
/** Manga: Schwarz und Weiß; dunkles Fell schwarz, mittleres als Rasterfolie, Schatten als Federstriche, weiße Lichtkanten auf
 * schwarzen Büscheln (die Federlinien an den Spitzen setzt das Bild) */
vec3 fellManga(vec3 alb, vec3 n0, Haar f, float h, vec2 css) {
  vec3 nb = bueschelNormale(n0, f);
  float v = dot(normalize(mix(n0, nb, 0.4)), lichtSicht());
  float wert = dot(alb, vec3(0.299, 0.587, 0.114));
  float g = 0.97;
  if (wert < 0.2) g = 0.05;
  else g = mix(g, 0.05, punkt(css, clamp((0.8 - wert) * 0.7, 0.0, 0.6), radians(45.0), 4.2));
  float schatt = 1.0 - smoothstep(-0.15, 0.3, v);
  g = mix(g, 0.05, schraffur(css, schatt * 0.45, radians(62.0), 3.8) * step(0.2, wert));
  g = mix(g, 0.97, smoothstep(0.65, 0.7, f.hoehe) * step(0.5, v) * (1.0 - smoothstep(0.25, 0.35, f.rand)) * step(wert, 0.2) * 0.9);
  return vec3(g);
}
`;

const SCHALEN_FRAGMENT_KOPF = /* glsl */ `
precision highp float;
precision highp sampler2D;
uniform float uSpiegel;
uniform vec4 uSchnitt;
uniform vec3 uMitte;
uniform float uRadius;
uniform vec3 uHalb;
uniform mat4 uView;
uniform mat4 uViewInv;
uniform vec3 uKamPos;
uniform float uOrtho;
uniform vec2 uAufl;
uniform float uDpr;
uniform float uZeit;
uniform float uMass;
uniform float uSchalen;
uniform float uDicht;
uniform float uBusch;
uniform float uLocke;
uniform float uDicke;
uniform float uSpitz;
uniform float uGross;
uniform float uMinPx;
uniform float uScheckung;
in vec3 vWelt;
in vec3 vWurzel;
in vec3 vNormal;
in vec2 vSpiegel;
in float vH;
in vec3 vStrich;
in vec3 vMuster;
in float vAgouti;
layout(location = 0) out vec4 farbe;
layout(location = 1) out vec4 kennung;
${RAUSCHEN}${FARBE}${LICHT}${DRUCK}
vec3 zumAuge(vec3 p) { return uOrtho > 0.5 ? -normalize((uViewInv * vec4(0.0, 0.0, -1.0, 0.0)).xyz) : normalize(uKamPos - p); }
vec3 ausSicht(vec3 d) { return normalize((uViewInv * vec4(d, 0.0)).xyz); }
`;

const SCHALEN_MAIN = /* glsl */ `
void main() {
  if (uSpiegel >= 0.0 && vSpiegel.x * vSpiegel.y < -uSpiegel * abs(vSpiegel.x)) discard;
  if (dot(uSchnitt.xyz, vWurzel) < uSchnitt.w) discard;
  vec3 n0 = normalize(vNormal);
  float h = vH;
  vec3 q = (vWurzel - uMitte) / uRadius;
  int stil = int(uR_stil + 0.5);
  vec2 css = gl_FragCoord.xy / uDpr;
  vec3 V = zumAuge(vWelt);
  float pxq = max(uMass * uRadius, 1.0);
  bool duenn = stil == 0 || stil == 5;
  // die Höhe innerhalb der Schicht gestreut (verwischt die Stufen zwischen den Schalen)
  float ign = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  if (h > 0.0) h = clamp(h + (ign - 0.5) / max(uSchalen, 1.0), 0.002, 1.0);
  Haar f;
  if (h <= 0.0) {
    f.a = 1.0; f.id = 0.0; f.bid = 0.0; f.wurzel = q; f.rand = 1.0; f.quer = vec3(0.0); f.hoehe = 0.0;
  } else if (stil >= 2 && stil <= 4) {
    f = bueschel(q, n0, h, max(uDicht, 7.0 / pxq), uSpitz, vStrich);
  } else {
    f = haarDuenn(q, n0, h, max(uDicht, uMinPx / pxq), uBusch, uLocke, uDicke, uGross);
  }
  if (f.a < 0.02) {
    // Deckung null statt verwerfen: so darf die Grafikkarte Verdecktes vorher aussortieren
    farbe = vec4(0.0);
    kennung = vec4(0.0);
    return;
  }
  kennung = vec4(duenn ? f.id : f.bid, h, 0.0, 1.0);
  float agouti = vAgouti;
  vec3 alb = vMuster;
  // Agouti: Wurzel dunkel, ein helles Band, dunkle Spitze
  if (agouti > 0.0 && h > 0.0 && duenn) {
    float band = smoothstep(0.45, 0.6, f.hoehe) * (1.0 - smoothstep(0.78, 0.9, f.hoehe));
    vec3 ag = alb * mix(0.55, 1.0, smoothstep(0.0, 0.45, f.hoehe));
    ag = mix(ag, min(alb * 1.35 + vec3(0.08, 0.06, 0.02), vec3(1.0)), band);
    ag = mix(ag, alb * 0.45, smoothstep(0.88, 1.0, f.hoehe));
    alb = mix(alb, ag, agouti);
  }
  vec3 T = normalize(n0 + vStrich * 2.0 * h);
  vec3 col;
  if (h <= 0.0) {
    // die Haut unter dem Fell: der tiefe Ton des Stils
    if (duenn) col = fellEcht(alb * 0.5, n0, T, V, 0.0, 0.0);
    else if (stil == 4) col = vec3(0.04);
    else col = alb * vec3(0.55, 0.56, 0.74);
  } else if (stil == 0) col = fellEcht(alb, n0, T, V, h, 0.0);
  else if (stil == 1) col = fellGhibli(alb, n0, f, h);
  else if (stil == 2) col = fellAnime(alb, n0, f, h, V);
  else if (stil == 3) col = fellSpider(alb, n0, f, h, V, css);
  else if (stil == 4) col = fellManga(alb, n0, f, h, css);
  else col = fellEcht(alb, n0, normalize(n0 + vStrich * 0.5 * h), V, mix(0.5, 1.0, f.hoehe), 1.0);
  // jedes Haar ein wenig anders (gezeichnete Stile: nur ein Hauch, die Büschel tragen das Bild)
  if (!duenn && h > 0.0 && stil != 4) col *= 0.96 + 0.08 * f.id;
  farbe = vec4(col, h <= 0.0 ? 1.0 : f.a);
}
`;

/** Zusammensetzen: Bühne, Fell (vormultipliziert; Alpha ist Deckung mal Alpha), Kontur, Papier */
const ZUSAMMEN = /* glsl */ `
${G_UNIFORMS}
uniform sampler2D tFell;
uniform sampler2D tKennung;
uniform sampler2D tWeich;
out vec4 farbe;
${RAUSCHEN}${FARBE}${DRUCK}${LICHT}${BUEHNEN}
float deckungFell(vec2 uv) { return sqrt(clamp(texture(tFell, uv).a, 0.0, 1.0)); }
void main() {
  vec2 css = gl_FragCoord.xy / uDpr;
  vec2 qb = gl_FragCoord.xy / uAufl;
  int stil = int(uR_stil + 0.5);
  vec4 f = texture(tFell, vUv);
  float dk = sqrt(clamp(f.a, 0.0, 1.0));
  float a = uBuehne > 0.5 ? 1.0 : 0.0;
  vec3 grund = vec3(0.0);
  if (a > 0.5 && dk < 0.999) {
    vec3 g;
    if (stil == 0) g = waldBokeh(css, qb);
    else if (stil == 1) g = ghibliHimmel(css, qb);
    else if (stil == 2) g = animeHimmel(css, qb);
    else if (stil == 3) g = comicKnall(css, qb);
    else if (stil == 4) g = mangaGrund(css, qb);
    else g = kinderzimmerGrund(css, qb);
    if (stil == 5) g *= 1.0 - 0.4 * texture(tWeich, vUv + vec2(0.025, 0.04)).r;
    grund = linZuSrgb(g);
  }
  vec3 aus = f.rgb;
  // Striche an den Spitzen der Büschel: wo ein Büschel über einem anderen endet (Kennung wechselt, wir sind höher)
  if (stil >= 1 && stil <= 4 && dk > 0.5) {
    vec4 k0 = texture(tKennung, vUv);
    vec2 px = 1.15 * uDpr / uAufl;
    float tinte = 0.0;
    for (int i = 0; i < 8; i++) {
      float w = float(i) * 0.7853982;
      vec4 k1 = texture(tKennung, vUv + vec2(cos(w), sin(w)) * px);
      tinte = max(tinte, step(0.012, abs(k1.x - k0.x)) * smoothstep(0.03, 0.12, k0.y - k1.y));
    }
    vec3 strich = stil == 1 ? aus * vec3(0.5, 0.45, 0.48) : (stil == 2 ? aus * 0.32 : vec3(0.03, 0.02, 0.05) * dk);
    aus = mix(aus, strich, tinte * (stil == 1 ? 0.55 : 0.95));
  }
  aus += grund * (1.0 - dk);
  float al = max(a, dk);
  // Kontur am Rand des Fells (Anime, Spider-Verse, Manga)
  if (stil >= 2 && stil <= 4) {
    vec2 px = (stil == 3 ? 2.0 : 1.5) * uDpr / uAufl;
    float e = 0.0;
    for (int i = 0; i < 8; i++) {
      float w = float(i) * 0.7853982;
      e = max(e, abs(deckungFell(vUv + vec2(cos(w), sin(w)) * px) - dk));
    }
    float linie = smoothstep(0.3, 0.65, e);
    aus = mix(aus, vec3(0.03, 0.02, 0.05), linie);
    al = max(al, linie);
  }
  if (stil == 1 || stil == 4) aus *= mix(1.0, papier(css), 0.55);
  farbe = vec4(aus, al);
}
`;

type FellArt = { id: string; name: string; gruppe: ShaderGruppe; zeile: string; stil: number; muster: number; typ: number; scheckung?: number };

class FellLauf implements ShaderLauf {
  private readonly geo = new InstancedBufferGeometry();
  private readonly punkte = new BufferGeometry();
  private readonly punkteSzene = new Scene();
  private readonly muster: RawShaderMaterial;
  private musterSchluessel = '';
  private readonly mu: Record<string, IUniform> = { tMuster: { value: null }, uMusterBreite: { value: MUSTER_BREITE }, uMusterHoehe: { value: 1 } };
  private readonly szene = new Scene();
  private readonly schalen: RawShaderMaterial;
  private readonly zusammen: RawShaderMaterial;
  private readonly weich: WeicheMaske;
  private readonly regler: ReglerZeile[];
  private readonly ru: Record<string, IUniform> = {};
  private readonly fu: Record<string, IUniform> = {
    uSchalen: { value: 16 },
    uLaenge: { value: 0.05 },
    uStrich: { value: 0.5 },
    uSchwer: { value: 0.2 },
    uDicht: { value: 0.005 },
    uBusch: { value: 0.3 },
    uLocke: { value: 0 },
    uDicke: { value: 0.24 },
    uSpitz: { value: 0.85 },
    uGross: { value: 7 },
    uMinPx: { value: 2.2 },
    uScheckung: { value: 0 },
  };
  private n = 0;
  private readonly sicht = new Matrix4();
  private stand = -1;
  private nachziehen = false;

  constructor(k: ShaderKern, regler: ReglerZeile[]) {
    this.regler = regler;
    for (const r of regler) this.ru[`uR_${r.k}`] = { value: r.grund };
    const kopf = regler.map((r) => `uniform float uR_${r.k};`).join('\n');
    this.schalen = k.netzProgramm(`${SCHALEN_FRAGMENT_KOPF}\n${kopf}\n${HAARE}\n${STILE}\n${SCHALEN_MAIN}`, {
      vertex: SCHALEN_VERTEX_KOPF,
      uniforms: { ...this.ru, ...this.fu, ...this.mu },
      seite: FrontSide,
    });
    this.muster = new RawShaderMaterial({
      glslVersion: GLSL3,
      uniforms: { ...k.u, ...this.ru, ...this.fu, ...this.mu },
      vertexShader: MUSTER_PUNKTE_VERTEX.replace('void main() {', `${kopf}\n${RAUSCHEN}\n${TIER_ZELLEN}\n${MUSTER}\nvoid main() {`),
      fragmentShader: MUSTER_PUNKTE_FRAGMENT,
      depthTest: false,
      depthWrite: false,
    });
    const punkte = new Points(this.punkte, this.muster);
    punkte.frustumCulled = false;
    this.punkteSzene.add(punkte);
    this.schalen.alphaToCoverage = true;
    const mesh = new Mesh(this.geo, this.schalen);
    mesh.frustumCulled = false;
    this.szene.add(mesh);
    this.zusammen = k.flaecheProgramm(`${kopf}\n${ZUSAMMEN}`, { ...this.ru, tFell: { value: null }, tKennung: { value: null }, tWeich: { value: null } });
    this.weich = new WeicheMaske(k);
  }

  /** das Netz des Kerns teilen (dieselben Puffer), sobald es sich ändert */
  private verbinden(k: ShaderKern): boolean {
    const g = k.geo;
    const pos = g.getAttribute('position');
    const nor = g.getAttribute('normal');
    const seite = g.getAttribute('aSeite');
    if (!pos || !nor || !seite || !g.index) return false;
    if (this.geo.getAttribute('position') !== pos) this.geo.setAttribute('position', pos);
    if (this.geo.getAttribute('normal') !== nor) this.geo.setAttribute('normal', nor);
    if (this.geo.getAttribute('aSeite') !== seite) this.geo.setAttribute('aSeite', seite);
    if (this.geo.index !== g.index) this.geo.setIndex(g.index);
    if (this.punkte.getAttribute('position') !== pos) this.punkte.setAttribute('position', pos);
    if (this.punkte.getAttribute('normal') !== nor) this.punkte.setAttribute('normal', nor);
    return true;
  }

  bild(k: ShaderKern, w: ShaderWerte): Texture | null {
    if (!this.verbinden(k)) return null;
    for (const r of this.regler) this.ru[`uR_${r.k}`]!.value = w.regler[r.k] ?? r.grund;
    const stil = Math.round(w.regler.stil ?? 0);
    const typ = TYPEN[Math.max(0, Math.min(TYPEN.length - 1, Math.round(w.regler.typ ?? 0)))]!;
    const laenge = w.regler.laenge ?? 1;
    const duenn = stil === 0 || stil === 5;
    const pluesch = stil === 5 ? TYPEN[2]! : typ;
    const L = (duenn ? pluesch.L : Math.max(0.09, typ.L * 2.2)) * laenge;
    // so viele Schalen, dass eine Schicht im Bild höchstens rund anderthalb Bildpunkte dick ist
    const lPx = L * k.u.uMass.value * k.u.uRadius.value;
    const basis = duenn ? Math.round(pluesch.n * (0.7 + 0.3 * Math.min(laenge, 2))) : 24;
    const voll = Math.max(basis, Math.min(40, Math.round(lPx / 1.8)));
    // in Bewegung (Blick oder Form) weniger als die Hälfte der Schalen; steht das Bild, folgt eins in voller Güte
    const bewegt = !this.sicht.equals(k.u.uView.value) || k.netzStand !== this.stand;
    this.sicht.copy(k.u.uView.value);
    this.stand = k.netzStand;
    this.n = bewegt ? Math.max(10, Math.round(voll * 0.45)) : voll;
    this.nachziehen = bewegt;
    const u = this.fu;
    u.uSchalen!.value = this.n;
    u.uLaenge!.value = L;
    u.uStrich!.value = (duenn ? pluesch.strich : Math.max(0.5, typ.strich)) * (w.regler.strich ?? 1);
    u.uSchwer!.value = (duenn ? pluesch.schwer : Math.max(0.25, typ.schwer * 0.8)) * (w.regler.strich ?? 1);
    const z = ZEICHNUNG[stil]!;
    u.uDicht!.value = duenn ? pluesch.s : z.s;
    u.uBusch!.value = duenn ? pluesch.busch : z.busch;
    u.uLocke!.value = duenn ? pluesch.locke : typ.locke * 0.6;
    u.uDicke!.value = duenn ? 0.24 : 0.33;
    u.uGross!.value = duenn ? 7 : z.gross;
    u.uMinPx!.value = duenn ? 2.2 : 3.4;
    u.uSpitz!.value = stil === 2 ? 1.0 : 0.85;
    u.uScheckung!.value = w.regler.scheckung ?? 0;
    this.geo.instanceCount = this.n + 1;
    const anzahl = k.geo.getAttribute('position')!.count;
    const hoehe = Math.max(1, Math.ceil(anzahl / MUSTER_BREITE));
    const schluessel = `${k.netzStand}|${anzahl}|${w.regler.muster}|${w.regler.farbton}|${w.regler.scheckung}`;
    const mz = k.ziel(`fell:muster:${hoehe}`, { breite: MUSTER_BREITE, hoehe, art: 'half', filter: 'nearest' });
    if (schluessel !== this.musterSchluessel || this.mu.tMuster!.value !== mz.texture) {
      this.mu.uMusterHoehe!.value = hoehe;
      this.punkte.setDrawRange(0, anzahl);
      k.szene(this.punkteSzene, k.kamera, mz, [0, 0, 0, 0]);
      this.mu.tMuster!.value = mz.texture;
      this.musterSchluessel = schluessel;
    }
    // in Bewegung in kleinerer Auflösung (die Kosten wachsen mit der Fläche), steht das Bild, voll
    const ziel = bewegt ? k.ziel('fell:schalen:bewegt', { proben: 4, tiefe: true, art: 'byte', anzahl: 2, skala: 0.7 }) : k.ziel('fell:schalen', { proben: 4, tiefe: true, art: 'byte', anzahl: 2 });
    k.szene(this.szene, k.kamera, ziel, [0, 0, 0, 0]);
    const zu = this.zusammen.uniforms;
    zu.tFell!.value = ziel.textures[0];
    zu.tKennung!.value = ziel.textures[1];
    zu.tWeich!.value = stil === 5 ? this.weich.rechnen(k, ziel.texture, 'fell', 0.25, 10) : ziel.texture;
    const ende = k.ziel('fell:ende', { art: 'byte' });
    k.flaeche(this.zusammen, ende, [0, 0, 0, 0]);
    return ende.texture;
  }

  unruhig(): boolean {
    return this.nachziehen;
  }

  info(): Record<string, number> {
    return { schalen: this.n, ecken: this.punkte.getAttribute("position")?.count ?? 0, dreiecke: (this.geo.index?.count ?? 0) / 3 };
  }

  freigeben(): void {
    this.muster.dispose();
    this.punkte.dispose();
    this.schalen.dispose();
    this.zusammen.dispose();
    this.weich.freigeben();
    this.geo.dispose();
  }
}

/** eine Voreinstellung auf dem Fell (alle mit denselben Reglern; Stil, Muster und Typ als Grundwerte) */
export function fellVoreinstellung(a: FellArt): Voreinstellung {
  const regler: ReglerZeile[] = [
    { k: 'stil', name: 'Stil', min: 0, max: FELL_STILE.length - 1, schritt: 1, grund: a.stil, stufen: FELL_STILE },
    { k: 'muster', name: 'Muster', min: 0, max: FELL_MUSTER.length - 1, schritt: 1, grund: a.muster, stufen: FELL_MUSTER },
    { k: 'typ', name: 'Fell', min: 0, max: TYPEN.length - 1, schritt: 1, grund: a.typ, stufen: TYPEN.map((t) => t.name) },
    { k: 'laenge', name: 'Länge', min: 0.3, max: 2.5, schritt: 0.05, grund: 1 },
    { k: 'strich', name: 'Strich', min: 0, max: 2, schritt: 0.05, grund: 1 },
    { k: 'scheckung', name: 'Scheckung', min: 0, max: 1, schritt: 0.05, grund: a.scheckung ?? 0 },
    { k: 'farbton', name: 'Farbton', min: -180, max: 180, schritt: 1, grund: 0 },
  ];
  return { id: a.id, name: a.name, gruppe: a.gruppe, zeile: a.zeile, regler, bauen: (k) => new FellLauf(k, regler) };
}

export const FELL = fellVoreinstellung({
  id: 'fell',
  name: 'Fell',
  gruppe: 'Fell & Flausch',
  zeile:
    'Echtes Fell aus Schalen: Haare mit Büscheln, Strich und Locken, 19 Muster (Tiger bis Merle), sechs Felltypen, Stile Echt, Ghibli, Anime, Spider-Verse, Manga, Plüsch',
  stil: 1,
  muster: 9,
  typ: 1,
});
export const LEOPARD = fellVoreinstellung({
  id: 'leopard',
  name: 'Leopard',
  gruppe: 'Tiermuster',
  zeile: 'Leopard auf echtem Fell: Rosetten Haar für Haar, goldenes Doppelfell mit Glanz längs der Haare; Stile von Echt bis Manga',
  stil: 0,
  muster: 2,
  typ: 0,
});
export const TIGER = fellVoreinstellung({
  id: 'tiger',
  name: 'Tiger',
  gruppe: 'Tiermuster',
  zeile: 'Tiger auf echtem Fell: Streifen, die sich gabeln und spitz enden, weißer Bauch; Stile von Echt bis Manga',
  stil: 0,
  muster: 1,
  typ: 1,
});
export const GIRAFFE = fellVoreinstellung({
  id: 'giraffe',
  name: 'Giraffe',
  gruppe: 'Tiermuster',
  zeile: 'Netzgiraffe auf kurzem Fell: Flecken mit runden Ecken und hellen Adern; Stile von Echt bis Manga',
  stil: 0,
  muster: 7,
  typ: 0,
});
