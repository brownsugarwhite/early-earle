// Wesen-Editor „/editor“ (11.11.2026): die Darstellung der Fenster. Hervorgegangen aus dem Prototyp „Blaupause“
// (`docs/look/editor/blaupause/` auf `claude/editor-grundlayout`) und seinem Teststand. Drei Looks je Fenster:
//
// - `logo` (Seite, Front, Top; Florians Vorlage „illudiy“): dunkler Grund, Körper weiß mit lavendel Schattenseite (rosa Extrusion schaltbar),
//   eine dicke Kontur in Petrol um die Silhouette, darum ein Rand im Verlauf Rosa → Lila. Die Kontur entsteht wie beim Passer der
//   Blaupause („TikTok“, 11.11. abends) aus zwei versetzten Platten in Rosa und Lila: Petrol, wo sie sich überdecken (umschaltbar auf die
//   Kontur, die ihren Schatten auf den Rand wirft). Von hinten (Seitenwechsel) tauschen Körper und Kontur die Farben, der Grund wird hellblau.
// - `jelly` (3D; Florians Vorlage, das Jelly-Material des Spiels): kräftiges Türkis, Licht oben links, dunkle Lava (runde Bohnen in den
//   dicken Teilen des Körpers, `lava.ts`), Glanzlicht, Bläschen, keine Outlines.
// - `papier` (3D, umschaltbar): der Papierkörper der Blaupause, ohne Outlines.
//
// Alle Grenzen der Schattierung sind scharf und geglättet wie Vektorkurven (fwidth), die Normalen kommen geglättet aus dem Fenster.
// Linien, Punkte und Griffe wie in der Blaupause; ihre Tinte richtet sich nach dem Look. Griffe haben immer Kontrast: über Dunklem
// werden sie weiß (über sehr Hellem dunkel), je Bildpunkt nach dem Bild des Fensters ohne Griffe.

import {
  BackSide,
  BufferGeometry,
  Color,
  DepthTexture,
  DoubleSide,
  Float32BufferAttribute,
  FramebufferTexture,
  FrontSide,
  GreaterDepth,
  HalfFloatType,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  LessEqualDepth,
  LinearFilter,
  LinearSRGBColorSpace,
  type Material,
  Mesh,
  NearestFilter,
  NoBlending,
  type OrthographicCamera,
  PlaneGeometry,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  type Texture,
  UnsignedByteType,
  Vector2,
  Vector3,
  Vector4,
  WebGLRenderTarget,
  type WebGLRenderer,
} from 'three';
import { type LavaForm, MAX_LAVA } from './lava';

export type P3 = [number, number, number];
/** Strecke einer Linie: Enden, Härte an den Enden (1 = Kante), Weg längs der Linie (Welteinheiten, für die Strichelung), Linie */
export type Strecke = { a: P3; b: P3; h: [number, number]; d: [number, number]; l: number };
/** Punkt: Ort, Zustand (0 ruhig, 1 schwebt, 2 gewählt), Breite seiner Linie bei 100 % (4 = Kante, 0,5 = keine) */
export type PunktBild = { p: P3; zustand: number; breite: number };
export type Art = 'logo' | 'papier' | 'jelly';

export type Sigma = { A: number; beta: number; w: number; fdot: number; fs: [number, number]; cx: number; cy: number };
export type FensterBild = {
  /** Gerätepixel, Ursprung unten links (wie gl_FragCoord) */
  rect: { x: number; y: number; w: number; h: number };
  /** CSS-Pixel für den Viewport des Renderers (Ursprung unten links) */
  css: { x: number; y: number; w: number; h: number };
  kam: OrthographicCamera;
  sigma: Sigma;
  /** Gerätepixel je Welteinheit */
  ppu: number;
  /** Maßstab gegen 100 % */
  mass: number;
  /** Abstand der Kamera zum Ursprung längs der Blickrichtung (für den Passer „Tiefe“) */
  kamAbstand: number;
  /** Blickrichtung der Kamera in der Welt (zur Kamera hin) */
  blick: P3;
  /** Griffe dieses Fensters: Stäbe und Bögen */
  griffStaebe: Strecke[];
  griffBoegen: Strecke[];
  art: Art;
};

export type Einstellung = {
  durchsicht: boolean;
  linienMass: boolean;
  pBlick: boolean;
  pWandel: boolean;
  pTiefe: boolean;
  tiefe: number;
  tiefeSchraeg: boolean;
  /** gibt es eine Grundform neben der gezeigten Form (in der Pose)? */
  grundDa: boolean;
  /** dicke Kontur und Rand bei 100 % in Bildpunkten */
  kontur: number;
  rand: number;
  /**
   * Logo: die dicke Kontur aus zwei versetzten Platten (Rosa, Lila), Petrol nur, wo sie sich überdecken (wie der Passer der Blaupause,
   * „TikTok“); aus: die Kontur in Petrol, die ihren Schatten auf den Rand wirft
   */
  tiktok: boolean;
  /**
   * Logo: die Extrusion in Rosa (die Silhouette nach links unten gezogen, wie die Seitenflächen der Buchstaben). Aus, wenn die Kontur
   * TikTok ist: Sie legt sich innen zum rosa Streifen und macht Rosa breiter als Lila (11.11. spätabends, Florian)
   */
  extrusion: boolean;
  /**
   * Logo: der lange flache Schatten des ganzen Abzeichens (Körper samt Kontur und Rand) auf dem Grund, immer schräg nach links unten,
   * mit harter Kante, nach hinten leicht auslaufend (Florians Vorlage vom 11.11. spätabends, dort nach rechts unten). Stärke 0…1
   * (0 = aus): so viel dunkler als der Grund ist er am Abzeichen
   */
  schatten: number;
};

/** Farben: Logo (Florians Vorlage), Papier (Blaupause), Auswahl */
export const FARBEN_START = {
  grund: '#17131b',
  // von hinten (Seitenwechsel): Lavendelblau (Florian 11.11. spätabends: „statt des weißen Backgrounds ein schönes Hellblau“, dann
  // „lieber Lavendel“)
  grundHinten: '#b3d4ff',
  kontur: '#003f4e',
  verlaufA: '#ff72a9',
  verlaufB: '#936ffb',
  koerperSchatten: '#ff72a9',
  auswahl: '#936ffb',
  tinte: '#1c1c1f',
};
export type Farben = typeof FARBEN_START;

const SCHEMA = [
  'uniform float uA, uBeta, uW, uFdot; uniform vec2 uFs, uMitte; uniform float uDpr; uniform vec4 uVp;',
  'uniform vec3 uTinte, uTinteLogo, uPapierLogo, uAuswahl; uniform float uTintenArt; const vec3 WEISS = vec3(1.0);',
  '#define BLAU uTinte',
  '#define HELL mix(WEISS, uTinte, 0.22)',
  '#define DIMM mix(WEISS, uTinte, 0.63)',
  '#define RT uAuswahl',
  // 0 = von vorn, 1 = von hinten (harte Kante beim Drehen)
  'float sigma(vec2 fc) { float s = uA * uFdot + uBeta * dot(fc - uMitte, uFs); return 1.0 - smoothstep(-uW, uW, s); }',
  'float kipp(float sg) { return smoothstep(0.52, 0.58, sg); }',
  // Tinte nach dem Look: Papier und Logo tauschen beim Wenden Tinte und Papier (Logo: Petrol auf Weiß, von hinten Weiß auf Petrol),
  // Jelly ist weiß auf Türkis
  'vec3 strich(float sg) { return uTintenArt > 1.5 ? WEISS : (uTintenArt > 0.5 ? mix(uTinteLogo, uPapierLogo, kipp(sg)) : mix(BLAU, WEISS, kipp(sg))); }',
  'vec3 gegen(float sg) { return uTintenArt > 1.5 ? vec3(0.0, 0.33, 0.33) : (uTintenArt > 0.5 ? mix(uPapierLogo, uTinteLogo, kipp(sg)) : mix(WEISS, BLAU, kipp(sg))); }',
  'uniform float uSS, uInnen, uAussen, uMass; uniform sampler2D tFeld; uniform vec2 uFeldGr;',
  // je Bildpunkt der Versatz zum nächsten Körperpunkt, je Achse in zwei Bytes; alles null = kein Wert
  'float feldDv(sampler2D t, vec2 tc) { vec4 b = floor(texture2D(t, tc / uFeldGr) * 255.0 + 0.5); if (b.r + b.g < 0.5) return 1e4;',
  '  return length(vec2(b.r * 256.0 + b.g, b.b * 256.0 + b.a) - 2048.0); }',
  'float abstandV(sampler2D t, vec2 fc) { vec2 p = (fc - uVp.xy) * uSS - 0.5; vec2 b = floor(p); vec2 f = p - b;',
  '  float d = mix(mix(feldDv(t, b + vec2(0.5, 0.5)), feldDv(t, b + vec2(1.5, 0.5)), f.x), mix(feldDv(t, b + vec2(0.5, 1.5)), feldDv(t, b + vec2(1.5, 1.5)), f.x), f.y);',
  '  return max(0.0, d - 0.5) / uSS; }',
  'float abstand(vec2 fc) { return abstandV(tFeld, fc); }',
].join('\n');

// Lage im Bild mit dem Passer „Tiefe“: was näher liegt als die Mitte, rückt nach der einen Seite, was ferner liegt, nach der anderen
const SICHT_VS =
  'uniform float uPar, uKamAbstand; uniform vec2 uParR;\n' +
  'vec4 sicht(vec3 p) { vec4 m = modelViewMatrix * vec4(p, 1.0); m.xy += uPar * (m.z + uKamAbstand) * uParR; return projectionMatrix * m; }\n';

const LINIE_VS = [
  'attribute vec3 aA; attribute vec3 aB; attribute vec2 aH; attribute vec2 aD; attribute float aLoop;',
  'uniform vec4 uVp; uniform float uDpr, uBreitHart, uBreitWeich, uVersatz, uHalo, uSkal;',
  'uniform float uWahlAn, uWahlR; uniform vec3 uWahlOrt; uniform vec4 uWahlLoops; uniform vec4 uLinieWahl;',
  SICHT_VS,
  'varying vec2 vL; varying float vLen; varying vec2 vHw; varying vec2 vHh; varying vec2 vDd; varying vec2 vWahl;',
  'float istIn(float l, vec4 m) { return 1.0 - step(0.5, min(min(abs(l - m.x), abs(l - m.y)), min(abs(l - m.z), abs(l - m.w)))); }',
  'void main() {',
  '  vec4 ca = sicht(aA); vec4 cb = sicht(aB);',
  '  vec2 hr = 0.5 * uVp.zw; vec2 sa = ca.xy / ca.w * hr; vec2 sb = cb.xy / cb.w * hr;',
  '  vec2 d = sb - sa; float len = length(d); vec2 dir = len > 1e-4 ? d / len : vec2(1.0, 0.0); vec2 nrm = vec2(-dir.y, dir.x);',
  '  float ha = 0.5 * mix(uBreitWeich, uBreitHart, aH.x) * uDpr * uSkal, hb = 0.5 * mix(uBreitWeich, uBreitHart, aH.y) * uDpr * uSkal;',
  '  float gehoert = uWahlAn * istIn(aLoop, uWahlLoops); float ganz = istIn(aLoop, uLinieWahl);',
  '  vWahl = max(vec2(ganz), gehoert * vec2(1.0 - smoothstep(0.0, uWahlR, distance(aA, uWahlOrt)), 1.0 - smoothstep(0.0, uWahlR, distance(aB, uWahlOrt))));',
  '  ha = max(ha, vWahl.x * 1.1 * uDpr); hb = max(hb, vWahl.y * 1.1 * uDpr);',
  '  float hm = max(ha, hb) + uHalo * uDpr * uSkal + 1.5;',
  '  float e = position.x;',
  '  vec2 p = mix(sa, sb, e) + dir * (e * 2.0 - 1.0) * hm + nrm * position.y * hm;',
  '  vL = vec2(e < 0.5 ? -hm : len + hm, position.y * hm); vLen = len; vHw = vec2(ha, hb); vHh = aH; vDd = aD;',
  '  vec4 c = mix(ca, cb, e);',
  '  gl_Position = vec4(p / hr * c.w, c.z - uVersatz * c.w, c.w);',
  '}',
].join('\n');

const LINIE_FS = [
  SCHEMA,
  'uniform float uPpu, uStrichel, uAlpha, uHalo, uFest, uWeichStark, uSkal;',
  // Griffe mit Kontrast: das Bild des Fensters ohne Griffe (`tUnter`) entscheidet je Bildpunkt — eine dunkle Tinte wird über Dunklem
  // weiß, eine helle über sehr Hellem dunkel
  'uniform sampler2D tUnter; uniform float uKontrast;',
  'vec3 kontrast(vec3 col) {',
  '  vec3 u = texture2D(tUnter, (gl_FragCoord.xy - uVp.xy) / uVp.zw).rgb;',
  '  float L = dot(u, vec3(0.2126, 0.7152, 0.0722)), Lc = dot(col, vec3(0.2126, 0.7152, 0.0722));',
  '  vec3 dunkel = uTintenArt > 1.5 ? vec3(0.0, 0.3, 0.3) : (uTintenArt > 0.5 ? uTinteLogo : BLAU);',
  '  return Lc < 0.5 ? mix(col, WEISS, 1.0 - smoothstep(0.36, 0.48, L)) : mix(col, dunkel, smoothstep(0.84, 0.92, L));',
  '}',
  'varying vec2 vL; varying float vLen; varying vec2 vHw; varying vec2 vHh; varying vec2 vDd; varying vec2 vWahl;',
  'void main() {',
  '  float u = clamp(vL.x / max(vLen, 1e-4), 0.0, 1.0); float hw = mix(vHw.x, vHw.y, u);',
  '  float dist = length(vL - vec2(u * vLen, 0.0)); float h = mix(vHh.x, vHh.y, u);',
  '  float sg = sigma(gl_FragCoord.xy);',
  '  if (uHalo > 0.0) {',
  '    float ha = uHalo * uDpr * uSkal; float hue = (1.0 - smoothstep(hw + ha - 0.6, hw + ha + 0.6, dist)) * smoothstep(0.45, 0.9, h) * uAlpha;',
  '    if (hue < 0.004) discard;',
  '    gl_FragColor = vec4(gegen(sg), hue); return;',
  '  }',
  '  float kern = 1.0 - smoothstep(hw - 0.6, hw + 0.6, dist);',
  '  float an = 1.0;',
  '  if (uStrichel > 0.0) {',
  '    float anteil = mix(0.5, 1.02, smoothstep(0.2, 0.7, h));',
  '    float ph = fract(mix(vDd.x, vDd.y, u) * uPpu / (uStrichel * uDpr * uSkal));',
  '    an = anteil >= 1.0 ? 1.0 : smoothstep(0.0, 0.06, ph) * (1.0 - smoothstep(anteil - 0.06, anteil, ph));',
  '  }',
  '  float kk = kipp(sg); vec3 hart = strich(sg);',
  '  vec3 weich = uTintenArt > 1.5 ? vec3(0.78, 1.0, 0.97) : (uTintenArt > 0.5 ? mix(gegen(sg), hart, 0.42)',
  '    : mix(mix(HELL, DIMM, sg), mix(mix(WEISS, uTinte, 0.6), mix(WEISS, uTinte, 0.38), kk), uWeichStark));',
  '  vec3 col = uFest > 0.5 ? hart : mix(weich, hart, smoothstep(0.05, 0.6, h));',
  '  col = mix(col, RT, mix(vWahl.x, vWahl.y, u));',
  '  if (uKontrast > 0.5) col = kontrast(col);',
  '  float a = kern * an * uAlpha;',
  '  if (a < 0.004) discard;',
  '  gl_FragColor = vec4(col, a);',
  '}',
].join('\n');

const PUNKT_VS = [
  'attribute vec3 aP; attribute vec3 aK; uniform vec4 uVp; uniform float uDpr, uVersatz, uSkalP; varying vec2 vQ; varying vec3 vK;',
  'void main() { vec4 c = projectionMatrix * modelViewMatrix * vec4(aP, 1.0);',
  '  float R = (1.45 * aK.z + 3.0) * uDpr * max(1.0, uSkalP) + 3.0 * uDpr; vQ = position.xy * R; vK = aK;',
  '  gl_Position = vec4(c.xy + position.xy * R / (0.5 * uVp.zw) * c.w, c.z - uVersatz * c.w, c.w); }',
].join('\n');

const PUNKT_FS = [
  SCHEMA,
  'uniform float uAlpha, uSkalP; varying vec2 vQ; varying vec3 vK;',
  'void main() {',
  '  float weichP = 1.0 - step(2.0, vK.z);',
  '  float rr = (weichP > 0.5 ? max(2.3, 1.2 * uSkalP) : max(1.4, 0.5 * vK.z * uSkalP)) * uDpr, sgp = sigma(gl_FragCoord.xy);',
  '  if (vK.y > 1.5) rr = max(rr * 1.25, 2.6 * uDpr); else if (vK.y > 0.5) rr += 2.0 * uDpr;',
  '  float dd = length(vQ) - rr, saum = weichP * 1.3 * uDpr; vec3 tinte = strich(sgp), papier = gegen(sgp);',
  '  vec3 fp = vK.y > 1.5 ? tinte : (vK.z > 2.0 ? papier : tinte);',
  '  float ap = (1.0 - smoothstep(-0.6, 0.6, dd - saum)) * uAlpha; if (ap < 0.01) discard;',
  '  float randp = vK.y > 0.5 && vK.y < 1.5 ? smoothstep(-1.7 * uDpr, -0.7 * uDpr, dd) : 0.0;',
  '  gl_FragColor = vec4(mix(mix(fp, tinte, randp), papier, weichP * smoothstep(-0.6, 0.6, dd)), ap);',
  '}',
].join('\n');

// gemeinsamer Eckpunkt-Shader der Körper: Lage (mit „Tiefe“), Normale im Blickraum, Lage in der Welt
const KOERPER_VS =
  SICHT_VS +
  'uniform float uGrund; attribute vec3 aGrund; varying vec3 vN; varying vec3 vW;\n' +
  'void main() { vN = normalMatrix * normal; vec3 p = mix(position, aGrund, uGrund); vW = p; gl_Position = sicht(p); }';

/**
 * Normale aus dem im Bild geglätteten Feld (`tGlatt`: Blicknormale xy, Tiefe, Dicke): Die Grenzen der Schattierung laufen dann als
 * ruhige Kurven statt als Treppe über die Dreiecke. Fehlt das Feld (Rand), gilt die Normale der Fläche.
 */
const GLATT = [
  'uniform sampler2D tGlatt; uniform float uGlattAn;',
  'vec4 glattFeld() { return texture2D(tGlatt, (gl_FragCoord.xy - uVp.xy) / uVp.zw); }',
  'vec3 glatteNormale(vec3 n0, vec4 g) { if (uGlattAn < 0.5 || g.z <= 0.0) return n0;',
  '  vec2 xy = g.xy; float l2 = dot(xy, xy); if (l2 > 1.0) xy /= sqrt(l2); return normalize(vec3(xy, sqrt(max(0.0, 1.0 - dot(xy, xy))))); }',
].join('\n');

/** Grenze einer Stufe, scharf und um einen Bildpunkt geglättet (wie eine Vektorkante) */
const STUFE = 'float stufe(float x, float t) { float w = max(fwidth(x), 1e-5) * 0.85; return smoothstep(t - w, t + w, x); }';

const RECHTECK = (): Float32BufferAttribute => new Float32BufferAttribute([0, -1, 0, 1, -1, 0, 1, 1, 0, 0, 1, 0], 3);

function streckenGeo(seg: readonly Strecke[]): InstancedBufferGeometry {
  const g = new InstancedBufferGeometry();
  g.setAttribute('position', RECHTECK());
  g.setIndex([0, 1, 2, 0, 2, 3]);
  const n = seg.length;
  const A = new Float32Array(3 * n);
  const B = new Float32Array(3 * n);
  const H = new Float32Array(2 * n);
  const D = new Float32Array(2 * n);
  const L = new Float32Array(n);
  seg.forEach((s, i) => {
    A.set(s.a, 3 * i);
    B.set(s.b, 3 * i);
    H.set(s.h, 2 * i);
    D.set(s.d, 2 * i);
    L[i] = s.l;
  });
  g.setAttribute('aA', new InstancedBufferAttribute(A, 3));
  g.setAttribute('aB', new InstancedBufferAttribute(B, 3));
  g.setAttribute('aH', new InstancedBufferAttribute(H, 2));
  g.setAttribute('aD', new InstancedBufferAttribute(D, 2));
  g.setAttribute('aLoop', new InstancedBufferAttribute(L, 1));
  g.instanceCount = n;
  return g;
}

function punktGeo(p: readonly PunktBild[]): InstancedBufferGeometry {
  const g = new InstancedBufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  const P = new Float32Array(3 * p.length);
  const K = new Float32Array(3 * p.length);
  p.forEach((q, i) => {
    P.set(q.p, 3 * i);
    K.set([3, q.zustand, q.breite], 3 * i);
  });
  g.setAttribute('aP', new InstancedBufferAttribute(P, 3));
  g.setAttribute('aK', new InstancedBufferAttribute(K, 3));
  g.instanceCount = p.length;
  return g;
}

const feldZiel = (): WebGLRenderTarget =>
  new WebGLRenderTarget(4, 4, {
    format: RGBAFormat,
    type: UnsignedByteType,
    minFilter: NearestFilter,
    magFilter: NearestFilter,
    generateMipmaps: false,
    depthBuffer: false,
    stencilBuffer: false,
  });

/** langer Schatten: Deckung und Weg je Bildpunkt (halbe Gleitkommazahlen: der Weg reicht über das ganze Fenster) */
const schattenZiel = (): WebGLRenderTarget =>
  new WebGLRenderTarget(4, 4, { type: HalfFloatType, format: RGBAFormat, minFilter: NearestFilter, magFilter: NearestFilter, generateMipmaps: false, depthBuffer: false, stencilBuffer: false });

/** Logo: Tiefe der Extrusion in Bildpunkten bei 100 % (Florians Vorlage: gut ein Sechstel der Buchstabenhöhe) */
const EXTRUSION = 18;
/** Bläschen im Jelly (Mitte xyz, Halbmesser w; Welt) */
export const MAX_BLASEN = 6;

/**
 * Farben bleiben in sRGB, wie sie im Farbfeld stehen: Die Shader schreiben ohne Umwandlung in die Leinwand. (`new Color(hex)` rechnet
 * in three seit r152 in den linearen Raum um — dann wird alles dunkler und satter, das Petrol fast schwarz.)
 */
const roh = (hex: string): Color => {
  const n = parseInt(hex.replace('#', ''), 16);
  return new Color().setRGB(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, LinearSRGBColorSpace);
};
const farbe3 = (hex: string): Vector3 => {
  const c = roh(hex);
  return new Vector3(c.r, c.g, c.b);
};

export class BlaupauseBild {
  private readonly r: WebGLRenderer;
  private readonly U = {
    uSS: { value: 1 },
    uInnen: { value: 28 },
    uAussen: { value: 12 },
    uMass: { value: 1 },
    tFeld: { value: null as Texture | null },
    uFeldGr: { value: new Vector2(4, 4) },
    uA: { value: 1 },
    uBeta: { value: 0 },
    uW: { value: 0.3 },
    uFdot: { value: 1 },
    uFs: { value: new Vector2() },
    uMitte: { value: new Vector2() },
    uDpr: { value: 1 },
    uVp: { value: new Vector4(0, 0, 1, 1) },
    uPpu: { value: 1 },
    uParR: { value: new Vector2(1, 0) },
    uKamAbstand: { value: 3000 },
    uTinte: { value: new Vector3() },
    uTinteLogo: { value: new Vector3() },
    uPapierLogo: { value: new Vector3(1, 1, 1) },
    uAuswahl: { value: new Vector3() },
    uTintenArt: { value: 1 },
    uWahlAn: { value: 0 },
    uWahlOrt: { value: new Vector3() },
    uWahlLoops: { value: new Vector4(-9, -9, -9, -9) },
    uWahlR: { value: 75 },
    uLinieWahl: { value: new Vector4(-9, -9, -9, -9) },
  };
  private readonly mitU = (extra: Record<string, { value: unknown }>): Record<string, { value: unknown }> => ({ ...this.U, ...extra });
  private readonly FELDER: [WebGLRenderTarget, WebGLRenderTarget][] = [
    [feldZiel(), feldZiel()],
    [feldZiel(), feldZiel()],
    [feldZiel(), feldZiel()],
  ];
  /** Tiefe der Rückseiten (Jelly: Dicke des Körpers je Bildpunkt) */
  private readonly rueckZiel: WebGLRenderTarget;
  private readonly SS: number;
  private readonly DPR: number;
  private readonly pal = { L: [new Vector3(), new Vector3(), new Vector3()], D: [new Vector3(), new Vector3(), new Vector3()] };
  private readonly logoMat: ShaderMaterial;
  private readonly papierMat: ShaderMaterial;
  private readonly jellyMat: ShaderMaterial;
  private readonly rueckMat: ShaderMaterial;
  private readonly datenMat: ShaderMaterial;
  private readonly weichMat: ShaderMaterial;
  private readonly szWeich = new Scene();
  /** Feld für die Glättung im Bild (zwei Ziele zum Hin- und Herzeichnen) */
  private readonly glattA: WebGLRenderTarget;
  private readonly glattB: WebGLRenderTarget;
  /** Halbmesser des größten Teils (Welt): Maß für den Glanz am Umriss im Jelly */
  grossHalbmesser = 100;
  /** mittlere Kantenlänge des Netzes (Welteinheiten): so weit wird im Bild geglättet */
  kantenLaenge = 8;
  private readonly innenMat: ShaderMaterial;
  private readonly maskeMat: ShaderMaterial;
  private readonly maskeInnenMat: ShaderMaterial;
  private readonly flutMat: ShaderMaterial;
  private readonly hgLogoMat: ShaderMaterial;
  private readonly hgPapierMat: ShaderMaterial;
  private readonly hgJellyMat: ShaderMaterial;
  private readonly hgNetz: Mesh;
  private readonly matSicht: ShaderMaterial;
  private readonly matVerdeckt: ShaderMaterial;
  private readonly matHalo: ShaderMaterial;
  private readonly pMatSicht: ShaderMaterial;
  private readonly pMatVerdeckt: ShaderMaterial;
  private readonly stabMat: ShaderMaterial;
  private readonly bogenMat: ShaderMaterial;
  private readonly koerper: Mesh;
  private readonly innen: Mesh;
  private readonly maske: Mesh;
  private readonly szKoerper = new Scene();
  /**
   * Kontur der Ursprungsform (`kurven.ts`, Florian 11.11. spätabends: „echte Kanten sollen in den 3 Ansichten wieder die gleiche
   * verjüngende Outline bekommen … in gleicher Dicke und Farbe wie meine Kanten“): der Körper umgestülpt (Rückseiten), im Bild längs
   * der Normale nach außen geschoben, umso weiter, je mehr die Fläche zur Seite zeigt — an Umrissen und echten Kanten eine Linie, die
   * sich verjüngt, wo die Fläche zum Betrachter dreht
   */
  private readonly szUmriss = new Scene();
  private readonly umrissMat: ShaderMaterial;
  private readonly umriss: Mesh;
  private readonly szMaske = new Scene();
  private readonly szFlut = new Scene();
  private readonly szHg = new Scene();
  private readonly szLinien = new Scene();
  private readonly szGriffe = new Scene();
  private readonly linienSicht: Mesh;
  private readonly linienVerdeckt: Mesh;
  private readonly linienHalo: Mesh;
  private readonly punkteSicht: Mesh;
  private readonly punkteVerdeckt: Mesh;
  private readonly staebe: Mesh;
  private readonly boegen: Mesh;
  /** Abstand der Linien und Punkte zur Kamera hin (Welteinheiten), damit sie nicht in die Haut tauchen */
  versatzWelt = 1.2;
  einstellung: Einstellung = {
    durchsicht: false,
    linienMass: true,
    pBlick: true,
    pWandel: true,
    pTiefe: false,
    tiefe: 0.14,
    tiefeSchraeg: true,
    grundDa: false,
    kontur: 28,
    rand: 12,
    tiktok: true,
    extrusion: false,
    schatten: 0.36,
  };
  farbe: Farben = { ...FARBEN_START };
  /** Halbmesser, Mitte, typische Dicke und halbe Höhe des Körpers (für Jelly) */
  koerperRadius = 150;
  koerperMitte: P3 = [0, 0, 0];
  dickeBezug = 180;
  halbeHoehe = 150;

  constructor(renderer: WebGLRenderer, dpr: number) {
    this.r = renderer;
    this.DPR = dpr;
    this.SS = dpr >= 2 ? 1 : 2;
    const U = this.U;
    this.rueckZiel = new WebGLRenderTarget(4, 4, { depthBuffer: true, stencilBuffer: false, depthTexture: new DepthTexture(4, 4) });
    const glattZiel = (tiefe: boolean): WebGLRenderTarget =>
      // linear gefiltert: die Abtastpunkte der Glättung liegen zwischen den Bildpunkten (an der Mitte eines Bildpunkts gilt sein Wert)
      new WebGLRenderTarget(4, 4, { type: HalfFloatType, format: RGBAFormat, minFilter: LinearFilter, magFilter: LinearFilter, generateMipmaps: false, depthBuffer: tiefe, stencilBuffer: false });
    this.glattA = glattZiel(true);
    this.glattB = glattZiel(false);


    // Logo: weiß mit leichtem Verlauf nach unten, die Schattenseite rosa wie die Seitenflächen der Buchstaben (Licht von rechts oben)
    this.logoMat = new ShaderMaterial({
      side: DoubleSide,
      uniforms: this.mitU({
        uPar: { value: 0 },
        uGrund: { value: 0 },
        uWeissO: { value: farbe3('#ffffff') },
        uWeissU: { value: farbe3('#f0e8f1') },
        uLavendel: { value: farbe3('#e7deef') },
        uSchwelle: { value: 0.02 },
        tGlatt: { value: null },
        uGlattAn: { value: 0 },
      }),
      vertexShader: KOERPER_VS,
      fragmentShader: [
        SCHEMA,
        STUFE,
        GLATT,
        'uniform vec3 uWeissO, uWeissU, uLavendel; uniform float uSchwelle; varying vec3 vN; varying vec3 vW;',
        'void main() {',
        '  vec3 n0 = normalize(vN); if (!gl_FrontFacing) n0 = -n0; vec3 n = glatteNormale(n0, glattFeld());',
        '  float l = dot(n, normalize(vec3(0.55, 0.62, 0.56)));',
        '  float a = stufe(l, uSchwelle);',
        '  vec3 weiss = mix(uWeissO, uWeissU, smoothstep(0.35, -0.6, n.y));',
        // von hinten (Seitenwechsel) tauschen Körper und Kontur die Farben: der Körper in Petrol, die Schattenseite dunkler
        '  vec3 vorn = mix(uLavendel, weiss, a), hinten = mix(uTinteLogo * 0.66, uTinteLogo, a);',
        '  gl_FragColor = vec4(mix(vorn, hinten, kipp(sigma(gl_FragCoord.xy))), 1.0);',
        '}',
      ].join('\n'),
    });
    // Papier (Blaupause): drei Stufen, auf hellem und dunklem Grund; die Grenzen scharf und glatt
    this.papierMat = new ShaderMaterial({
      side: DoubleSide,
      uniforms: this.mitU({ uPalL: { value: this.pal.L }, uPalD: { value: this.pal.D }, uPar: { value: 0 }, uGrund: { value: 0 }, tGlatt: { value: null }, uGlattAn: { value: 0 } }),
      vertexShader: KOERPER_VS,
      fragmentShader: [
        SCHEMA,
        STUFE,
        GLATT,
        'uniform vec3 uPalL[3]; uniform vec3 uPalD[3]; varying vec3 vN; varying vec3 vW;',
        'void main() {',
        '  vec3 n0 = normalize(vN); if (!gl_FrontFacing) n0 = -n0; vec3 n = glatteNormale(n0, glattFeld());',
        '  float sg = sigma(gl_FragCoord.xy);',
        '  float l = dot(n, normalize(vec3(-0.45, 0.62, 0.64)));',
        '  float a1 = stufe(l, 0.12), a2 = stufe(l, 0.56);',
        '  vec3 hell = mix(mix(uPalL[0], uPalL[1], a1), uPalL[2], a2);',
        '  vec3 dunkel = mix(mix(uPalD[0], uPalD[1], a1), uPalD[2], a2);',
        '  gl_FragColor = vec4(mix(hell, dunkel, sg), 1.0);',
        '}',
      ].join('\n'),
    });
    // Rückseiten: nur Tiefe (für die Dicke im Jelly)
    this.rueckMat = new ShaderMaterial({
      side: BackSide,
      uniforms: { uPar: { value: 0 }, uParR: U.uParR, uKamAbstand: U.uKamAbstand, uGrund: { value: 0 } },
      vertexShader: KOERPER_VS,
      fragmentShader: 'void main() { gl_FragColor = vec4(0.0); }',
    });
    // Feld für die Glättung im Bild: Blicknormale xy, Tiefe (linear), Dicke (nur Jelly)
    this.datenMat = new ShaderMaterial({
      side: DoubleSide,
      uniforms: { uPar: { value: 0 }, uParR: U.uParR, uKamAbstand: U.uKamAbstand, uGrund: { value: 0 }, tRueck: { value: null }, uNah: { value: 100 }, uFern: { value: 6000 }, uMitDicke: { value: 0 }, uGroesseD: { value: new Vector2(4, 4) } },
      vertexShader: KOERPER_VS,
      fragmentShader: [
        'uniform sampler2D tRueck; uniform float uNah, uFern, uMitDicke; uniform vec2 uGroesseD; varying vec3 vN; varying vec3 vW;',
        'void main() {',
        '  vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;',
        '  float z = uNah + gl_FragCoord.z * (uFern - uNah);',
        '  float t = 0.0;',
        '  if (uMitDicke > 0.5) t = clamp(texture2D(tRueck, gl_FragCoord.xy / uGroesseD).x - gl_FragCoord.z, 0.0, 1.0) * (uFern - uNah);',
        '  gl_FragColor = vec4(n.xy, z, t);',
        '}',
      ].join('\n'),
    });
    // weichzeichnen, getrennt nach Richtung; Nachbarn auf anderer Tiefe (ein Flügel vor dem Rumpf) zählen nicht
    this.weichMat = new ShaderMaterial({
      depthTest: false,
      depthWrite: false,
      blending: NoBlending,
      uniforms: { tQuelle: { value: null }, uGroesse: { value: new Vector2(4, 4) }, uRichtung: { value: new Vector2(1, 0) }, uRadius: { value: 6 }, uSigmaZ: { value: 6 } },
      vertexShader: 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: [
        'uniform sampler2D tQuelle; uniform vec2 uGroesse, uRichtung; uniform float uRadius, uSigmaZ;',
        'void main() {',
        '  vec2 fc = gl_FragCoord.xy; vec4 c = texture2D(tQuelle, fc / uGroesse);',
        '  if (c.z <= 0.0) { gl_FragColor = c; return; }',
        '  vec4 summe = vec4(0.0); float gw = 0.0;',
        '  for (int i = -12; i <= 12; i++) {',
        '    float u = float(i) / 12.0; vec4 s = texture2D(tQuelle, (fc + uRichtung * u * uRadius) / uGroesse);',
        '    if (s.z <= 0.0) continue;',
        '    float dz = (s.z - c.z) / uSigmaZ; float w = exp(-4.0 * u * u - dz * dz);',
        '    summe += s * w; gw += w;',
        '  }',
        '  gl_FragColor = summe / max(gw, 1e-5);',
        '}',
      ].join('\n'),
    });
    const weichNetz = new Mesh(new PlaneGeometry(2, 2), this.weichMat);
    weichNetz.frustumCulled = false;
    this.szWeich.add(weichNetz);
    // Jelly (Vorlage: das Jelly des Spiels): kräftiges Türkis, Licht oben links, Innenlappen aus der Dicke, Glanz, Bläschen
    this.jellyMat = new ShaderMaterial({
      side: FrontSide,
      uniforms: this.mitU({
        uPar: { value: 0 },
        uGrund: { value: 0 },
        tRueck: { value: null },
        uNah: { value: 100 },
        uFern: { value: 6000 },
        uRadius: { value: 150 },
        uDickeBezug: { value: 180 },
        uHoehe: { value: 150 },
        uMitteK: { value: new Vector3() },
        uVorn: { value: new Vector3(0, 0, -1) },
        uBlasen: { value: Array.from({ length: MAX_BLASEN }, () => new Vector4()) },
        uBlasenZahl: { value: 0 },
        uLava: { value: Array.from({ length: 2 * MAX_LAVA }, () => new Vector4()) },
        uLavaE: { value: Array.from({ length: 2 * MAX_LAVA }, () => new Vector4()) },
        uLavaZahl: { value: 0 },
        uKontakt: { value: new Vector4() },
        uKontaktE: { value: new Vector4() },
        uKontaktAn: { value: 0 },
        uGlanzP: { value: Array.from({ length: MAX_LAVA }, () => new Vector4()) },
        uGlanzZahl: { value: 0 },
        tRand: { value: null },
        uJLichtO: { value: farbe3('#3bfcf2') },
        uJLicht: { value: farbe3('#1ee9df') },
        uJMitte: { value: farbe3('#00c4ba') },
        uJMitteU: { value: farbe3('#00b4ab') },
        uJSchatten: { value: farbe3('#00a39b') },
        uJRand: { value: farbe3('#008e89') },
        tGlatt: { value: null },
        uGlattAn: { value: 0 },
      }),
      vertexShader: KOERPER_VS,
      fragmentShader: [
        SCHEMA,
        STUFE,
        'uniform sampler2D tRueck; uniform float uNah, uFern, uRadius, uDickeBezug, uHoehe; uniform vec3 uMitteK, uVorn;',
        `uniform vec4 uBlasen[${MAX_BLASEN}]; uniform float uBlasenZahl;`,
        // Lava: je Blase zwei Ellipsoide, im Bild als Ellipse: Mitte und kleine Halbachse (Bildpunkte), Ton; dazu die inverse Form (2×2)
        `uniform vec4 uLava[${2 * MAX_LAVA}]; uniform vec4 uLavaE[${2 * MAX_LAVA}]; uniform float uLavaZahl;`,
        // Abstand zum Rand einer Ellipse in Bildpunkten (genähert: gemessen an der kleinen Halbachse)
        'float ellipse(vec2 fc, vec4 s, vec4 e) { vec2 q = fc - s.xy; float m = e.x * q.x * q.x + 2.0 * e.y * q.x * q.y + e.z * q.y * q.y; return (sqrt(max(m, 0.0)) - 1.0) * s.z; }',
        'float smin(float a, float b, float k) { float h = max(k - abs(a - b), 0.0) / max(k, 1e-5); return min(a, b) - h * h * k * 0.25; }',
        // Kontaktbohne (unten, dunkel): eine Ellipse für sich, unter der Lava
        'uniform vec4 uKontakt, uKontaktE; uniform float uKontaktAn;',
        // Glanz auf den großen Teilen (Rumpf, großer Kopf): je Teil Mitte im Bild (Gerätepixel) und Halbmesser seiner größten Kugel im
        // Bild; dazu der Abstand zum Umriss innen (`tRand`)
        `uniform vec4 uGlanzP[${MAX_LAVA}]; uniform float uGlanzZahl; uniform sampler2D tRand;`,
        // Winkel zwischen der Richtung d (Einheit) und der Richtung phi0 (vorzeichenbehaftet)
        'float winkel(vec2 d, float phi0) { float c = cos(phi0), s = sin(phi0); return atan(d.y * c - d.x * s, d.x * c + d.y * s); }',
        GLATT,
        'uniform vec3 uJLichtO, uJLicht, uJMitte, uJMitteU, uJSchatten, uJRand; varying vec3 vN; varying vec3 vW;',
        'void main() {',
        '  vec4 g = glattFeld(); vec3 n = glatteNormale(normalize(vN), g);',
        '  vec2 tc = (gl_FragCoord.xy - uVp.xy) / uVp.zw;',
        '  float dB = texture2D(tRueck, tc).x;',
        '  float dicke = (uGlattAn > 0.5 && g.z > 0.0) ? g.w : clamp(dB - gl_FragCoord.z, 0.0, 1.0) * (uFern - uNah);',
        '  float t = dicke / uDickeBezug;',
        // drei Töne mit scharfen Grenzen: Licht oben links, Mitte, Schattenseite
        '  float l = dot(n, normalize(vec3(-0.55, 0.65, 0.52)));',
        '  float aL = stufe(l, 0.52), aM = stufe(l, -0.08);',
        '  vec3 licht = mix(uJLicht, uJLichtO, smoothstep(0.55, 0.98, l));',
        '  vec3 mitte = mix(uJMitteU, uJMitte, smoothstep(-0.08, 0.52, l));',
        '  vec3 schatten = mix(uJRand, uJSchatten, smoothstep(-0.85, -0.08, l));',
        '  vec3 col = mix(schatten, mix(mitte, licht, aL), aM);',
        '  float h = clamp((vW.y - uMitteK.y) / uHoehe, -1.0, 1.0);',
        // Lava (die dunklen Lappen der Vorlage): runde Bohnen aus je zwei Kreisen, weich verschmolzen, auch mit den Nachbarn (wie in einer
        // Lavalampe); scharfer, geglätteter Rand. Der Ton (halbtransparent dunkler) kommt von der nächsten Blase.
        '  vec2 fc = gl_FragCoord.xy; float lavaD = 1e5, tonS = 0.0, tonW = 0.0;',
        `  for (int b = 0; b < ${MAX_LAVA}; b++) {`,
        '    if (float(b) >= uLavaZahl) break;',
        '    vec4 s0 = uLava[2 * b], s1 = uLava[2 * b + 1];',
        '    float db = smin(ellipse(fc, s0, uLavaE[2 * b]), ellipse(fc, s1, uLavaE[2 * b + 1]), 0.6 * s0.z);',
        '    lavaD = smin(lavaD, db, 0.35 * s0.z);',
        '    float w = exp(-max(db, 0.0) / max(0.25 * s0.z, 1.0)); tonS += w * s0.w; tonW += w;',
        '  }',
        '  float aaL = max(fwidth(lavaD) * 0.85, 0.5);',
        '  float lava = 1.0 - smoothstep(-aaL, aaL, lavaD);',
        '  col *= mix(1.0, tonS / max(tonW, 1e-5), lava);',
        // die Kontaktbohne liegt als eigene, dunklere Schicht darunter (wo sich beide decken, dunkler: halbtransparent)
        '  if (uKontaktAn > 0.5) { float dk = ellipse(fc, uKontakt, uKontaktE); float aaK = max(fwidth(dk) * 0.85, 0.5); col *= mix(1.0, uKontakt.w, 1.0 - smoothstep(-aaK, aaK, dk)); }',
        // Bläschen: Strahlnähe zu kleinen Kugeln im Körper, helle Scheiben mit scharfem Rand
        '  float bub = 0.0;',
        `  for (int i = 0; i < ${MAX_BLASEN}; i++) {`,
        '    if (float(i) >= uBlasenZahl) break;',
        '    vec4 b = uBlasen[i]; vec3 q = b.xyz - vW; float laengs = dot(q, uVorn);',
        '    float quer = length(q - uVorn * laengs);',
        '    float drin = step(0.0, laengs) * step(laengs, dicke);',
        '    float aa = max(fwidth(quer), 1e-4);',
        '    bub = max(bub, (1.0 - smoothstep(b.w - aa, b.w + aa, quer)) * drin);',
        '  }',
        '  col = mix(col, min(col * 1.26 + vec3(0.0, 0.02, 0.02), vec3(1.0)), bub * 0.9);',
        // Glanz wie in der Vorlage (gemessen): ein weißer, leicht gebogener Strich am Rand oben links (Richtung 112°–140°, bei 0,9 des
        // Halbmessers) und ein länglicher Punkt darunter (151°), reines Weiß ohne Saum. Wie gemalt am Umriss: aus dem Abstand zum Umriss im
        // Bild (`tRand`) und der Richtung nach außen wird eine Kugel-Normale gedacht (Neigung asin(1 − Abstand / Halbmesser)) — so liegt
        // der Strich innen am Rand der Masse; nur auf den großen Teilen (Rumpf, großer Kopf), nicht auf Hörnern und Beinen
        // je großem Teil: der Bogen liegt in dem Winkelbereich, der von seiner Mitte aus oben links liegt (wie auf einer Kugel: Strich
        // 112°–140°, Punkt um 151°), und dort innen am echten Umriss (Abstand zum Umriss 0,07–0,14 seines Halbmessers) — so bleibt er
        // ein kurzer, glatter Bogen, der dem Umriss folgt; der Umriss muss dort von der Mitte weg zeigen
        '  float dR = abstandV(tRand, fc);',
        '  vec2 gR = vec2(abstandV(tRand, fc + vec2(3.0, 0.0)) - abstandV(tRand, fc - vec2(3.0, 0.0)), abstandV(tRand, fc + vec2(0.0, 3.0)) - abstandV(tRand, fc - vec2(0.0, 3.0)));',
        '  float lg = length(gR); vec2 aussen = lg > 1e-3 ? -gR / lg : vec2(0.0, 1.0);',
        '  float glanz = 0.0;',
        `  for (int i = 0; i < ${MAX_LAVA}; i++) {`,
        '    if (float(i) >= uGlanzZahl) break;',
        '    vec4 P = uGlanzP[i]; vec2 v = fc - P.xy; float lv = length(v); vec2 dir = lv > 1e-3 ? v / lv : vec2(0.0, 1.0);',
        // (begrenzt: hinter der Reichweite des Felds springt der Abstand, ungebremst zeichnete die Kantenglättung dort feine Linien)
        '    float u = min(dR / max(P.z, 1.0), 0.45);',
        '    float a1 = winkel(dir, radians(126.0)) / radians(14.0), b1 = (u - 0.103) / 0.034;',
        '    float a2 = winkel(dir, radians(151.0)) / radians(4.5), b2 = (u - 0.125) / 0.026;',
        '    float c = max(1.0 - stufe(sqrt(a1 * a1 + b1 * b1), 1.0), 1.0 - stufe(sqrt(a2 * a2 + b2 * b2), 1.0));',
        // nur am Umriss der Masse um das Teil (bis 3 Halbmesser von der Mitte) und wo der Körper nach innen breit ist (kein dünner Arm)
        '    float breit = step(0.26 * P.z, abstandV(tRand, fc - aussen * 0.32 * P.z));',
        '    c *= smoothstep(0.2, 0.45, dot(aussen, dir)) * step(1e-3, lg) * step(lv, 3.0 * P.z) * breit;',
        '    glanz = max(glanz, c);',
        '  }',
        '  col = mix(col, vec3(1.0), glanz);',
        // Saum: zum Rand der Schattenseite etwas satter
        '  float saum = (1.0 - smoothstep(0.05, 0.38, n.z)) * (1.0 - aM);',
        '  col = mix(col, col * 0.9, saum);',
        '  gl_FragColor = vec4(col, 1.0);',
        '}',
      ].join('\n'),
    });
    // das Innere des Mauls (in der Pose): dunkel, ohne Stufen
    this.innenMat = new ShaderMaterial({
      side: DoubleSide,
      uniforms: this.mitU({ uPar: { value: 0 } }),
      vertexShader: SICHT_VS + 'void main() { gl_Position = sicht(position); }',
      fragmentShader: [SCHEMA, 'void main() { gl_FragColor = vec4(uTintenArt > 1.5 ? vec3(0.0, 0.3, 0.3) : (uTintenArt > 0.5 ? strich(sigma(gl_FragCoord.xy)) : mix(mix(WEISS, uTinte, 0.55), mix(uTinte, WEISS, 0.18), kipp(sigma(gl_FragCoord.xy)))), 1.0); }'].join('\n'),
    });
    // Saat des Abstandsfelds: jeder Bildpunkt des Körpers trägt den Versatz null
    this.maskeMat = new ShaderMaterial({
      side: DoubleSide,
      depthTest: false,
      depthWrite: false,
      blending: NoBlending,
      uniforms: { uPar: { value: 0 }, uParR: U.uParR, uKamAbstand: U.uKamAbstand, uGrund: { value: 0 }, uZug: { value: new Vector2() } },
      // `uZug`: Versatz im Bild (NDC) — die Maske wird längs der Extrusion mehrfach versetzt gezeichnet, das Feld misst dann den Abstand
      // zur gezogenen Silhouette selbst (ohne Treppen, auch stark vergrößert)
      vertexShader: SICHT_VS + 'uniform float uGrund; uniform vec2 uZug; attribute vec3 aGrund; void main() { gl_Position = sicht(mix(position, aGrund, uGrund)); gl_Position.xy += uZug * gl_Position.w; }',
      fragmentShader: 'void main() { gl_FragColor = vec4(8.0 / 255.0, 0.0, 8.0 / 255.0, 0.0); }',
    });
    // umgekehrte Saat (Jelly-Glanz): der Grund trägt den Versatz null, der Körper keinen — das Feld misst innen den Abstand zum Umriss
    this.maskeInnenMat = new ShaderMaterial({
      side: DoubleSide,
      depthTest: false,
      depthWrite: false,
      blending: NoBlending,
      uniforms: { uPar: { value: 0 }, uParR: U.uParR, uKamAbstand: U.uKamAbstand, uGrund: { value: 0 } },
      vertexShader: SICHT_VS + 'uniform float uGrund; attribute vec3 aGrund; void main() { gl_Position = sicht(mix(position, aGrund, uGrund)); }',
      fragmentShader: 'void main() { gl_FragColor = vec4(0.0); }',
    });
    this.flutMat = new ShaderMaterial({
      depthTest: false,
      depthWrite: false,
      blending: NoBlending,
      uniforms: { tQuelle: { value: null }, uGroesse: { value: new Vector2(4, 4) }, uSchritt: { value: 1 } },
      vertexShader: 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: [
        'uniform sampler2D tQuelle; uniform vec2 uGroesse; uniform float uSchritt;',
        'void main() {',
        '  vec2 fc = floor(gl_FragCoord.xy) + 0.5; vec2 best = vec2(0.0); float bd = 1e12; float ok = 0.0;',
        '  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {',
        '    vec2 dl = uSchritt * vec2(float(i), float(j)); vec2 q = fc + dl;',
        '    if (q.x < 0.0 || q.y < 0.0 || q.x > uGroesse.x || q.y > uGroesse.y) continue;',
        '    vec4 b = floor(texture2D(tQuelle, q / uGroesse) * 255.0 + 0.5); if (b.r + b.g < 0.5) continue;',
        '    vec2 off = vec2(b.r * 256.0 + b.g, b.b * 256.0 + b.a) - 2048.0 + dl; float d = dot(off, off);',
        '    if (d < bd && max(abs(off.x), abs(off.y)) <= 2000.0) { bd = d; best = off; ok = 1.0; }',
        '  }',
        '  if (ok > 0.5) { vec2 v = best + 2048.0; vec2 hi = floor(v / 256.0); vec2 lo = v - hi * 256.0; gl_FragColor = vec4(hi.x, lo.x, hi.y, lo.y) / 255.0; }',
        '  else gl_FragColor = vec4(0.0);',
        '}',
      ].join('\n'),
    });
    const flutNetz = new Mesh(new PlaneGeometry(2, 2), this.flutMat);
    flutNetz.frustumCulled = false;
    this.szFlut.add(flutNetz);
    // Logo (Florians Vorlage „illudiy“): Grund (von vorn dunkel, von hinten hell). Wie die Buchstaben: die Körperfläche weiß, dahinter die
    // Extrusion in Rosa (die Silhouette, längs des Versatzes gezogen), um beides die dicke Kontur in Petrol, darum der Rand im Verlauf
    // Rosa → Lila, auf dem die Kontur ihren Schatten nach unten wirft. Extrusion und Schatten versetzen sich wie der Passer „Blick“.
    this.hgLogoMat = new ShaderMaterial({
      depthTest: false,
      depthWrite: false,
      uniforms: this.mitU({
        tFeldC: { value: null },
        tFeldR: { value: null },
        uSchub: { value: new Vector2() },
        uExtr: { value: new Vector2() },
        uPlatte: { value: new Vector2() },
        uTiktok: { value: 1 },
        tSchatten: { value: null },
        uSchatten: { value: 0 },
        uSchattenLang: { value: 1000 },
        uPlatteA: { value: farbe3(FARBEN_START.verlaufA) },
        uPlatteB: { value: farbe3(FARBEN_START.verlaufB) },
        uGrundV: { value: farbe3(FARBEN_START.grund) },
        uGrundH: { value: farbe3(FARBEN_START.grundHinten) },
        uKontur: { value: farbe3(FARBEN_START.kontur) },
        uRosa: { value: farbe3(FARBEN_START.koerperSchatten) },
        uVA: { value: farbe3(FARBEN_START.verlaufA) },
        uVM1: { value: farbe3('#fca4de') },
        uVM2: { value: farbe3('#d4b3f5') },
        uVB: { value: farbe3(FARBEN_START.verlaufB) },
        uSchattenA: { value: farbe3('#de4b86') },
        uSchattenB: { value: farbe3('#6f48d8') },
      }),
      vertexShader: 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: [
        SCHEMA,
        'uniform sampler2D tFeldC, tFeldR, tSchatten; uniform vec2 uSchub, uExtr, uPlatte; uniform float uTiktok, uSchatten, uSchattenLang;',
        'uniform vec3 uGrundV, uGrundH, uKontur, uRosa, uVA, uVM1, uVM2, uVB, uSchattenA, uSchattenB, uPlatteA, uPlatteB;',
        'vec3 verlauf(float x) { return x < 0.45 ? mix(uVA, uVM1, x / 0.45) : (x < 0.7 ? mix(uVM1, uVM2, (x - 0.45) / 0.25) : mix(uVM2, uVB, (x - 0.7) / 0.3)); }',
        'void main() {',
        '  vec2 fc = gl_FragCoord.xy; float sg = sigma(fc), kk = kipp(sg); vec3 col = mix(uGrundV, uGrundH, kk);',
        // der lange Schatten liegt auf dem Grund: am Abzeichen am dunkelsten, nach hinten etwas heller (wie in der Vorlage); auf dem hellen
        // Grund von hinten schwächer
        '  if (uSchatten > 0.0) {',
        '    vec4 sv = texture2D(tSchatten, (fc - uVp.xy) / uVp.zw);',
        '    float st = uSchatten * mix(1.0, 0.45, kk) * (1.0 - 0.45 * smoothstep(0.0, 1.0, sv.g * 1.4142 / uSchattenLang));',
        '    col *= 1.0 - st * sv.r;',
        '  }',
        // die dicke Kontur tauscht beim Wenden die Farbe mit dem Körper
        '  vec3 kontur = mix(uKontur, uPapierLogo, kk);',
        '  float ri = uInnen * uDpr * uMass, ra = (uInnen + uAussen) * uDpr * uMass;',
        // alle Felder messen den Abstand zur gezogenen Silhouette (Körper samt Extrusion, `feldRechnen`)
        '  float dE = abstandV(tFeld, fc);',
        '  float x = clamp((fc.x - uVp.x) / uVp.z, 0.0, 1.0);',
        '  vec3 rand = verlauf(x);',
        '  if (uTiktok > 0.5) {',
        // TikTok (Passer der Blaupause): zwei Platten, jede ein Band von ihrem Körper bis zur Kontur, Rosa nach der einen Seite versetzt,
        // Lila nach der anderen; wo sie sich überdecken, entsteht die Kontur in Petrol. Der Rand liegt um beide.
        '    float dA = abstandV(tFeldC, fc - uPlatte), dB = abstandV(tFeldR, fc + uPlatte);',
        '    float aussen = 1.0 - smoothstep(ra - 0.7, ra + 0.7, min(dA, dB));',
        '    float pA = (1.0 - smoothstep(ri - 0.7, ri + 0.7, dA)) * smoothstep(-0.2, 0.8, dA);',
        '    float pB = (1.0 - smoothstep(ri - 0.7, ri + 0.7, dB)) * smoothstep(-0.2, 0.8, dB);',
        '    col = mix(col, rand, aussen);',
        '    col = mix(col, uPlatteA, pA * (1.0 - pB));',
        '    col = mix(col, uPlatteB, pB * (1.0 - pA));',
        '    col = mix(col, kontur, pA * pB);',
        '  } else {',
        '    float dC = abstandV(tFeldC, fc), dS = abstandV(tFeldR, fc - uSchub);',
        '    vec3 schatten = mix(uSchattenA, uSchattenB, smoothstep(0.0, 1.0, x));',
        '    float aussen = 1.0 - smoothstep(ra - 0.7, ra + 0.7, dC);',
        '    float sch = 1.0 - smoothstep(ri - 0.7, ri + 0.7, dS);',
        '    col = mix(col, mix(rand, schatten, sch), aussen);',
        '    col = mix(col, kontur, 1.0 - smoothstep(ri - 0.7, ri + 0.7, dE));',
        '  }',
        '  col = mix(col, uRosa, 1.0 - smoothstep(-0.2, 0.8, dE));',
        '  gl_FragColor = vec4(col, 1.0);',
        '}',
      ].join('\n'),
    });
    // Papier im 3D: vorn weiß, hinten dunkel, keine Outlines
    this.hgPapierMat = new ShaderMaterial({
      depthTest: false,
      depthWrite: false,
      uniforms: this.mitU({}),
      vertexShader: 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: [SCHEMA, 'void main() { gl_FragColor = vec4(mix(WEISS, BLAU, sigma(gl_FragCoord.xy)), 1.0); }'].join('\n'),
    });
    // Jelly: der dunkle Grund des Spiels
    this.hgJellyMat = new ShaderMaterial({
      depthTest: false,
      depthWrite: false,
      uniforms: { uFarbe: { value: farbe3('#081b25') } },
      vertexShader: 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: 'uniform vec3 uFarbe; void main() { gl_FragColor = vec4(uFarbe, 1.0); }',
    });
    this.hgNetz = new Mesh(new PlaneGeometry(2, 2), this.hgLogoMat);
    this.hgNetz.frustumCulled = false;
    this.szHg.add(this.hgNetz);

    const linienMat = (o: { hart: number; weich: number; strichel?: number; verdeckt?: boolean; alpha?: number; halo?: number; fest?: boolean; tiefe?: boolean; kontrast?: boolean }): ShaderMaterial =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        depthTest: o.tiefe !== false,
        depthFunc: o.verdeckt ? GreaterDepth : LessEqualDepth,
        side: DoubleSide,
        uniforms: this.mitU({
          uBreitHart: { value: o.hart },
          uBreitWeich: { value: o.weich },
          uVersatz: { value: 0 },
          uHalo: { value: o.halo ?? 0 },
          uStrichel: { value: o.strichel ?? 0 },
          uAlpha: { value: o.alpha ?? 1 },
          uFest: { value: o.fest ? 1 : 0 },
          uWeichStark: { value: 1 },
          uSkal: { value: 1 },
          uPar: { value: 0 },
          tUnter: { value: null },
          uKontrast: { value: o.kontrast ? 1 : 0 },
        }),
        vertexShader: LINIE_VS,
        fragmentShader: LINIE_FS,
      });
    this.matSicht = linienMat({ hart: 4, weich: 0.5, strichel: 7 });
    this.matVerdeckt = linienMat({ hart: 4, weich: 0.5, strichel: 7, verdeckt: true, alpha: 0.3 });
    this.matHalo = linienMat({ hart: 4, weich: 0.5, halo: 1.75 });
    this.stabMat = linienMat({ hart: 1.1, weich: 1.1, fest: true, tiefe: false, kontrast: true });
    this.bogenMat = linienMat({ hart: 2.2, weich: 2.2, fest: true, tiefe: false, kontrast: true });
    const punktMat = (o: { verdeckt?: boolean; alpha?: number }): ShaderMaterial =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        depthTest: true,
        depthFunc: o.verdeckt ? GreaterDepth : LessEqualDepth,
        side: DoubleSide,
        uniforms: this.mitU({ uVersatz: { value: 0 }, uAlpha: { value: o.alpha ?? 1 }, uSkalP: { value: 1 } }),
        vertexShader: PUNKT_VS,
        fragmentShader: PUNKT_FS,
      });
    this.pMatSicht = punktMat({});
    this.pMatVerdeckt = punktMat({ verdeckt: true, alpha: 0.35 });

    this.umrissMat = new ShaderMaterial({
      side: BackSide,
      polygonOffset: true,
      polygonOffsetFactor: 2,
      polygonOffsetUnits: 2,
      uniforms: this.mitU({ uPar: { value: 0 }, uGrund: { value: 0 }, uBreite: { value: 4 } }),
      vertexShader:
        SICHT_VS +
        'uniform float uGrund, uBreite; uniform vec4 uVp; attribute vec3 aGrund;\n' +
        'void main() { vec4 clip = sicht(mix(position, aGrund, uGrund)); vec3 n = normalize(normalMatrix * normal);\n' +
        // Richtung der Normale im Bild (in Bildpunkten, auch in nicht quadratischen Fenstern gleich lang)
        '  vec2 r = (projectionMatrix * vec4(n, 0.0)).xy * uVp.zw; float l = length(r); r = l > 1e-9 ? r / l : vec2(0.0);\n' +
        '  float kipp = clamp(length(n.xy) / 0.35, 0.0, 1.0);\n' +
        '  clip.xy += r * kipp * uBreite * 2.0 / uVp.zw * clip.w; gl_Position = clip; }',
      fragmentShader: [SCHEMA, 'void main() { gl_FragColor = vec4(strich(sigma(gl_FragCoord.xy)), 1.0); }'].join('\n'),
    });
    this.umriss = new Mesh(new BufferGeometry(), this.umrissMat);
    this.umriss.frustumCulled = false;
    this.szUmriss.add(this.umriss);
    this.koerper = new Mesh(new BufferGeometry(), this.logoMat);
    this.koerper.frustumCulled = false;
    this.innen = new Mesh(new BufferGeometry(), this.innenMat);
    this.innen.frustumCulled = false;
    this.innen.visible = false;
    this.szKoerper.add(this.koerper, this.innen);
    this.maske = new Mesh(new BufferGeometry(), this.maskeMat);
    this.maske.frustumCulled = false;
    this.szMaske.add(this.maske);
    const lGeo = streckenGeo([]);
    this.linienSicht = new Mesh(lGeo, this.matSicht);
    this.linienVerdeckt = new Mesh(lGeo, this.matVerdeckt);
    this.linienHalo = new Mesh(lGeo, this.matHalo);
    const pGeo = punktGeo([]);
    this.punkteSicht = new Mesh(pGeo, this.pMatSicht);
    this.punkteVerdeckt = new Mesh(pGeo, this.pMatVerdeckt);
    this.staebe = new Mesh(streckenGeo([]), this.stabMat);
    this.boegen = new Mesh(streckenGeo([]), this.bogenMat);
    for (const m of [this.linienVerdeckt, this.linienHalo, this.linienSicht, this.punkteVerdeckt, this.punkteSicht, this.staebe, this.boegen]) m.frustumCulled = false;
    this.linienVerdeckt.renderOrder = 1;
    this.linienHalo.renderOrder = 1.5;
    this.linienSicht.renderOrder = 2;
    this.punkteVerdeckt.renderOrder = 3;
    this.punkteSicht.renderOrder = 4;
    this.staebe.renderOrder = 5;
    this.boegen.renderOrder = 6;
    this.szLinien.add(this.linienVerdeckt, this.linienHalo, this.linienSicht, this.punkteVerdeckt, this.punkteSicht);
    this.szGriffe.add(this.staebe, this.boegen);
    this.farbenSetzen();
  }

  /** Das Netz des Körpers (Lage, Normale; `aGrund` = Lage in der Grundform, wenn eine Pose gezeigt wird) */
  hautGeometrie(g: BufferGeometry): void {
    this.koerper.geometry = g;
    this.maske.geometry = g;
    this.umriss.geometry = g;
  }
  /** Das Innere des Mauls (null: keins) */
  innenGeometrie(g: BufferGeometry | null): void {
    if (g) {
      this.innen.geometry.dispose();
      this.innen.geometry = g;
    }
    this.innen.visible = g !== null;
  }
  linien(seg: readonly Strecke[]): void {
    const g = streckenGeo(seg);
    this.linienSicht.geometry.dispose();
    this.linienSicht.geometry = g;
    this.linienVerdeckt.geometry = g;
    this.linienHalo.geometry = g;
  }
  punkte(p: readonly PunktBild[]): void {
    const g = punktGeo(p);
    this.punkteSicht.geometry.dispose();
    this.punkteSicht.geometry = g;
    this.punkteVerdeckt.geometry = g;
  }
  /** Lava im Jelly (je Blase zwei Ellipsoide in der Welt; im Fenster aufs Bild gerechnet), Kontaktbohne, Teile mit Glanz */
  private lavaFormen: readonly LavaForm[] = [];
  private kontaktForm: LavaForm | null = null;
  private glanzTeile: readonly { c: P3; r: number }[] = [];
  lava(k: readonly LavaForm[], kontakt: LavaForm | null = null, glanz: readonly { c: P3; r: number }[] = []): void {
    this.lavaFormen = k.slice(0, 2 * MAX_LAVA);
    this.kontaktForm = kontakt;
    this.glanzTeile = glanz.slice(0, MAX_LAVA);
  }
  /** Bläschen im Jelly (Mitte und Halbmesser in der Welt) */
  blasen(b: readonly { p: P3; r: number }[]): void {
    const arr = this.jellyMat.uniforms.uBlasen!.value as Vector4[];
    b.slice(0, MAX_BLASEN).forEach((x, i) => arr[i]!.set(x.p[0], x.p[1], x.p[2], x.r));
    this.jellyMat.uniforms.uBlasenZahl!.value = Math.min(MAX_BLASEN, b.length);
  }
  /** der gewählte Punkt wirft einen Verlauf auf seine Linien; ganz gewählte Loops tragen die Farbe auf ganzer Länge */
  wahl(o: { ort: P3 | null; loops: readonly number[]; ganz: readonly number[]; r: number }): void {
    const U = this.U;
    U.uWahlAn.value = o.ort ? 1 : 0;
    if (o.ort) U.uWahlOrt.value.set(o.ort[0], o.ort[1], o.ort[2]);
    const v = (l: readonly number[]) => [l[0] ?? -9, l[1] ?? -9, l[2] ?? -9, l[3] ?? -9] as const;
    U.uWahlLoops.value.set(...v(o.loops));
    U.uLinieWahl.value.set(...v(o.ganz));
    U.uWahlR.value = o.r;
  }

  farbenSetzen(): void {
    const F = this.farbe;
    const t = roh(F.tinte);
    const w = roh('#ffffff');
    const ton = (k: number): Color => w.clone().lerp(t, k);
    const alsV = (c: Color) => new Vector3(c.r, c.g, c.b);
    this.U.uTinte.value.set(t.r, t.g, t.b);
    this.U.uTinteLogo.value.copy(farbe3(F.kontur));
    this.U.uAuswahl.value.copy(farbe3(F.auswahl));
    this.pal.L.splice(0, 3, alsV(ton(0.19)), alsV(ton(0.09)), alsV(w));
    this.pal.D.splice(0, 3, alsV(t.clone().multiplyScalar(0.62)), alsV(t), alsV(ton(0.86)));
    (this.papierMat.uniforms.uPalL as { value: Vector3[] }).value = this.pal.L;
    (this.papierMat.uniforms.uPalD as { value: Vector3[] }).value = this.pal.D;
    const u = this.hgLogoMat.uniforms;
    (u.uGrundV!.value as Vector3).copy(farbe3(F.grund));
    (u.uGrundH!.value as Vector3).copy(farbe3(F.grundHinten));
    (u.uKontur!.value as Vector3).copy(farbe3(F.kontur));
    // Verlauf: die zwei Enden aus den Farbfeldern, die Mitte aufgehellt wie in der Vorlage, der Schatten satter und dunkler
    const A = roh(F.verlaufA);
    const B = roh(F.verlaufB);
    (u.uVA!.value as Vector3).copy(alsV(A));
    (u.uVB!.value as Vector3).copy(alsV(B));
    (u.uVM1!.value as Vector3).copy(alsV(A.clone().lerp(w, 0.32).lerp(B, 0.12)));
    (u.uVM2!.value as Vector3).copy(alsV(B.clone().lerp(w, 0.42).lerp(A, 0.12)));
    const satt = (c: Color, k: number): Color => {
      const h = { h: 0, s: 0, l: 0 };
      c.getHSL(h, LinearSRGBColorSpace);
      return new Color().setHSL(h.h, h.s * 0.72, h.l * k, LinearSRGBColorSpace);
    };
    (u.uSchattenA!.value as Vector3).copy(alsV(satt(A, 0.8)));
    (u.uSchattenB!.value as Vector3).copy(alsV(satt(B, 0.78)));
    // TikTok: die Platten in den zwei Farben des Verlaufs
    (u.uPlatteA!.value as Vector3).copy(alsV(A));
    (u.uPlatteB!.value as Vector3).copy(alsV(B));
    (this.hgLogoMat.uniforms.uRosa!.value as Vector3).copy(farbe3(F.koerperSchatten));
  }

  /**
   * Abstandsfeld einer Silhouette: Maske zeichnen (längs `zug` gezogen, Bildpunkte des Felds: die Extrusion), dann fluten; gibt die
   * Textur mit dem Ergebnis
   */
  private feldRechnen(kam: OrthographicCamera, paar: [WebGLRenderTarget, WebGLRenderTarget], grund: number, par: number, mw: number, mh: number, weit: number, zug: Vector2): Texture {
    if (paar[0].width !== mw || paar[0].height !== mh) {
      paar[0].setSize(mw, mh);
      paar[1].setSize(mw, mh);
    }
    this.maskeMat.uniforms.uGrund!.value = grund;
    this.maskeMat.uniforms.uPar!.value = par;
    const r = this.r;
    r.setRenderTarget(paar[0]);
    r.setClearColor(0x000000, 0);
    r.clear();
    // je höchstens 1,5 Bildpunkte eine Kopie (höchstens 64)
    const n = Math.min(64, Math.ceil(zug.length() / 1.5));
    const uz = this.maskeMat.uniforms.uZug!.value as Vector2;
    for (let k = 0; k <= n; k++) {
      const a = n === 0 ? 0 : k / n;
      uz.set((2 * a * zug.x) / mw, (2 * a * zug.y) / mh);
      r.render(this.szMaske, kam);
    }
    uz.set(0, 0);
    let quelle = paar[0];
    let ziel = paar[1];
    const schritte: number[] = [];
    for (let k = 2 ** (Math.ceil(Math.log2(weit + 1)) - 1); k >= 1; k /= 2) schritte.push(k);
    schritte.push(1);
    (this.flutMat.uniforms.uGroesse!.value as Vector2).set(mw, mh);
    for (const st of schritte) {
      this.flutMat.uniforms.tQuelle!.value = quelle.texture;
      this.flutMat.uniforms.uSchritt!.value = st;
      r.setRenderTarget(ziel);
      r.render(this.szFlut, kam);
      const t = quelle;
      quelle = ziel;
      ziel = t;
    }
    return quelle.texture;
  }

  /** Jelly: Abstand jedes Bildpunkts des Körpers zum Umriss (für den Glanz am Rand), Reichweite in Bildpunkten des Felds */
  private randFeld(kam: OrthographicCamera, mw: number, mh: number, weit: number): Texture {
    const paar = this.FELDER[0]!;
    if (paar[0].width !== mw || paar[0].height !== mh) {
      paar[0].setSize(mw, mh);
      paar[1].setSize(mw, mh);
    }
    const r = this.r;
    r.setRenderTarget(paar[0]);
    // die Saat als Fläche zeichnen (Löschen mit Deckkraft 0 setzt in three.js alle Kanäle auf 0: vormultiplizierte Deckkraft)
    r.render(this.szSaat, kam);
    this.maske.material = this.maskeInnenMat;
    r.render(this.szMaske, kam);
    this.maske.material = this.maskeMat;
    let quelle = paar[0];
    let ziel = paar[1];
    const schritte: number[] = [];
    for (let k = 2 ** (Math.ceil(Math.log2(weit + 1)) - 1); k >= 1; k /= 2) schritte.push(k);
    schritte.push(1);
    (this.flutMat.uniforms.uGroesse!.value as Vector2).set(mw, mh);
    for (const st of schritte) {
      this.flutMat.uniforms.tQuelle!.value = quelle.texture;
      this.flutMat.uniforms.uSchritt!.value = st;
      r.setRenderTarget(ziel);
      r.render(this.szFlut, kam);
      const t = quelle;
      quelle = ziel;
      ziel = t;
    }
    return quelle.texture;
  }
  /** Saat des Abstandsfelds (Versatz null) über das ganze Ziel */
  private readonly szSaat = (() => {
    const sz = new Scene();
    const m = new Mesh(
      new PlaneGeometry(2, 2),
      new ShaderMaterial({
        depthTest: false,
        depthWrite: false,
        blending: NoBlending,
        vertexShader: 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
        fragmentShader: 'void main() { gl_FragColor = vec4(8.0 / 255.0, 0.0, 8.0 / 255.0, 0.0); }',
      }),
    );
    m.frustumCulled = false;
    sz.add(m);
    return sz;
  })();

  /**
   * Feld für die Glättung im Bild: Blicknormale, Tiefe, Dicke des Körpers, weichgezeichnet. Halbmesser ≈ 4,5 Kanten des Netzes (ohne
   * feste Obergrenze, sonst bleiben beim Zoomen die Kanten des Netzes als runde Stufen sichtbar), zweimal waagerecht und senkrecht.
   */
  private glattFeld(f: FensterBild, kam: OrthographicCamera): Texture | null {
    const r = this.r;
    const { rect } = f;
    if (this.glattA.width !== rect.w || this.glattA.height !== rect.h) {
      this.glattA.setSize(rect.w, rect.h);
      this.glattB.setSize(rect.w, rect.h);
    }
    const koerperMat = this.koerper.material;
    const innenAn = this.innen.visible;
    this.innen.visible = false;
    const d = this.datenMat.uniforms;
    d.uNah!.value = kam.near;
    d.uFern!.value = kam.far;
    d.uMitDicke!.value = f.art === 'jelly' ? 1 : 0;
    d.tRueck!.value = this.rueckZiel.depthTexture;
    (d.uGroesseD!.value as Vector2).set(rect.w, rect.h);
    this.koerper.material = this.datenMat;
    r.setScissorTest(false);
    r.setRenderTarget(this.glattA);
    r.setClearColor(0x000000, 0);
    r.clear();
    r.render(this.szKoerper, kam);
    this.koerper.material = koerperMat;
    this.innen.visible = innenAn;
    const w = this.weichMat.uniforms;
    (w.uGroesse!.value as Vector2).set(rect.w, rect.h);
    w.uRadius!.value = Math.min(0.35 * Math.min(rect.w, rect.h), Math.max(3 * this.DPR, 4.5 * this.kantenLaenge * f.ppu * 0.75));
    // Tiefensprünge (ein Teil vor dem anderen) sind viel größer als die Neigung einer Fläche über den Halbmesser der Glättung
    w.uSigmaZ!.value = Math.max(1, 0.18 * this.koerperRadius);
    for (let runde = 0; runde < 2; runde++) {
      w.tQuelle!.value = this.glattA.texture;
      (w.uRichtung!.value as Vector2).set(1, 0);
      r.setRenderTarget(this.glattB);
      r.render(this.szWeich, kam);
      w.tQuelle!.value = this.glattB.texture;
      (w.uRichtung!.value as Vector2).set(0, 1);
      r.setRenderTarget(this.glattA);
      r.render(this.szWeich, kam);
    }
    return this.glattA.texture;
  }

  /** ein Fenster zeichnen (der Aufrufer hat die Leinwand vorher gelöscht) */
  zeichne(f: FensterBild): void {
    const U = this.U;
    const E = this.einstellung;
    const r = this.r;
    const { rect, kam } = f;
    if (rect.w < 4 || rect.h < 4) return;
    const mass = f.mass;
    U.uMass.value = mass;
    U.uInnen.value = E.kontur;
    U.uAussen.value = E.rand;
    const skal = E.linienMass ? mass : 1;
    for (const m of [this.matSicht, this.matVerdeckt, this.matHalo]) m.uniforms.uSkal!.value = skal;
    this.pMatSicht.uniforms.uSkalP!.value = skal;
    this.pMatVerdeckt.uniforms.uSkalP!.value = skal;
    this.linienVerdeckt.visible = E.durchsicht;
    this.punkteVerdeckt.visible = E.durchsicht;
    const s = f.sigma;
    U.uA.value = s.A;
    U.uBeta.value = s.beta;
    U.uW.value = s.w;
    U.uFdot.value = s.fdot;
    U.uFs.value.set(s.fs[0], s.fs[1]);
    U.uMitte.value.set(s.cx, s.cy);
    U.uDpr.value = this.DPR;
    U.uVp.value.set(rect.x, rect.y, rect.w, rect.h);
    U.uPpu.value = f.ppu;
    U.uKamAbstand.value = f.kamAbstand;
    U.uParR.value.set(...((E.tiefeSchraeg ? [-0.7071, 0.7071] : [1, 0]) as [number, number]));
    U.uTintenArt.value = f.art === 'jelly' ? 2 : f.art === 'logo' ? 1 : 0;
    const tiefeNdc = (2 * this.versatzWelt) / Math.max(1e-6, kam.far - kam.near);
    for (const m of [this.matSicht, this.matHalo]) m.uniforms.uVersatz!.value = tiefeNdc;
    this.pMatSicht.uniforms.uVersatz!.value = 2 * tiefeNdc;
    // Outlines nur im Logo-Look: Felder der Silhouette (Körper, Rand, Schatten)
    if (f.art === 'logo') {
      const SS = this.SS;
      const mw = Math.round(rect.w * SS);
      const mh = Math.round(rect.h * SS);
      const weit = (E.kontur + 1.72 * E.rand + EXTRUSION + 4) * mass * this.DPR * SS + 3;
      // Blick: die Extrusion fällt von vorn nach links unten, von der Seite keine, von hinten nach oben
      const k = E.pBlick ? this.DPR * mass * s.fdot : 0;
      const ke = E.extrusion ? k : 0;
      const extr = this.extrHilf.set(-0.55 * EXTRUSION * ke, -0.835 * EXTRUSION * ke);
      const zug = this.zugHilf.copy(extr).multiplyScalar(SS);
      const haupt = this.feldRechnen(kam, this.FELDER[0]!, 0, 0, mw, mh, weit, zug);
      let texC = haupt;
      let texR = haupt;
      // Rand: im Wandel die Grundform, bei Tiefe nach der einen Seite geschert; Schatten: die Form, bei Tiefe nach der anderen
      const grundC = E.pWandel && E.grundDa ? 1 : 0;
      if (E.pTiefe || grundC) texC = this.feldRechnen(kam, this.FELDER[1]!, grundC, E.pTiefe ? E.tiefe : 0, mw, mh, weit, zug);
      if (E.pTiefe) texR = this.feldRechnen(kam, this.FELDER[2]!, 0, -E.tiefe, mw, mh, weit, zug);
      U.tFeld.value = haupt;
      U.uFeldGr.value.set(mw, mh);
      U.uSS.value = SS;
      const hu = this.hgLogoMat.uniforms;
      hu.tFeldC!.value = texC;
      hu.tFeldR!.value = texR;
      (hu.uExtr!.value as Vector2).copy(extr);
      // der Schatten deckt wie in der Vorlage gut zwei Drittel des Rands, außen bleibt ein heller Streifen
      const sch = 0.72 * E.rand;
      (hu.uSchub!.value as Vector2).set(-0.26 * sch * k, -0.966 * sch * k);
      // TikTok: Rosa nach rechts oben, Lila nach links unten (je ein Fünftel der Kontur); von der Seite fallen sie zusammen, von hinten
      // tauschen sie die Seiten (wie der Passer „Blick“ der Blaupause)
      hu.uTiktok!.value = E.tiktok ? 1 : 0;
      const pl = 0.2 * E.kontur * k;
      (hu.uPlatte!.value as Vector2).set(0.7071 * pl, 0.7071 * pl);
      // der lange Schatten (immer nach links unten)
      hu.uSchatten!.value = E.schatten;
      hu.uSchattenLang!.value = Math.max(rect.w, rect.h);
      if (E.schatten > 0) hu.tSchatten!.value = this.langerSchatten(rect, kam);
    }
    r.setRenderTarget(null);
    r.setViewport(f.css.x, f.css.y, f.css.w, f.css.h);
    r.setScissor(f.css.x, f.css.y, f.css.w, f.css.h);
    r.setScissorTest(true);
    this.hgNetz.material = f.art === 'logo' ? this.hgLogoMat : f.art === 'jelly' ? this.hgJellyMat : this.hgPapierMat;
    r.render(this.szHg, kam);
    r.clearDepth();
    if (f.art === 'jelly') {
      // Rückseiten: Tiefe je Bildpunkt (die Dicke des Körpers längs des Blicks)
      if (this.rueckZiel.width !== rect.w || this.rueckZiel.height !== rect.h) this.rueckZiel.setSize(rect.w, rect.h);
      const innenAn = this.innen.visible;
      this.innen.visible = false;
      this.koerper.material = this.rueckMat;
      r.setRenderTarget(this.rueckZiel);
      r.setClearColor(0x000000, 0);
      r.clear();
      r.render(this.szKoerper, kam);
      this.innen.visible = innenAn;
      r.setRenderTarget(null);
      r.setViewport(f.css.x, f.css.y, f.css.w, f.css.h);
      r.setScissor(f.css.x, f.css.y, f.css.w, f.css.h);
      r.setScissorTest(true);
      const j = this.jellyMat.uniforms;
      j.tRueck!.value = this.rueckZiel.depthTexture;
      j.uNah!.value = kam.near;
      j.uFern!.value = kam.far;
      j.uRadius!.value = this.koerperRadius;
      j.uDickeBezug!.value = this.dickeBezug;
      j.uHoehe!.value = this.halbeHoehe;
      (j.uMitteK!.value as Vector3).set(...this.koerperMitte);
      (j.uVorn!.value as Vector3).set(-f.blick[0], -f.blick[1], -f.blick[2]);
      // Lava: die Ellipsoide aufs Bild dieses Fensters. Die Mitte projiziert, die Form E = P·M·Pᵀ mit P = Bildpunkte je Welteinheit ×
      // (rechts, oben) der Kamera; der Shader bekommt E⁻¹ und die kleine Halbachse
      kam.updateMatrixWorld();
      kam.matrixWorld.extractBasis(this.lavaRe, this.lavaOb, this.lavaHilf);
      const lv = j.uLava!.value as Vector4[];
      const le = j.uLavaE!.value as Vector4[];
      const q = this.lavaHilf;
      const R = this.lavaRe;
      const O = this.lavaOb;
      const insBild = (s: LavaForm, aus: Vector4, ausE: Vector4): void => {
        q.set(s.c[0], s.c[1], s.c[2]).project(kam);
        const [xx, xy, xz, yy, yz, zz] = s.m;
        const mal = (a: Vector3, b: Vector3): number =>
          a.x * (xx * b.x + xy * b.y + xz * b.z) + a.y * (xy * b.x + yy * b.y + yz * b.z) + a.z * (xz * b.x + yz * b.y + zz * b.z);
        const pp = f.ppu * f.ppu;
        const e00 = pp * mal(R, R);
        const e01 = pp * mal(R, O);
        const e11 = pp * mal(O, O);
        const det = Math.max(1e-9, e00 * e11 - e01 * e01);
        const spur = 0.5 * (e00 + e11);
        const klein = Math.sqrt(Math.max(1e-6, spur - Math.sqrt(Math.max(0, spur * spur - det))));
        aus.set(rect.x + (q.x * 0.5 + 0.5) * rect.w, rect.y + (q.y * 0.5 + 0.5) * rect.h, klein, s.ton);
        ausE.set(e11 / det, -e01 / det, e00 / det, 0);
      };
      this.lavaFormen.forEach((s, i) => insBild(s, lv[i]!, le[i]!));
      j.uLavaZahl!.value = Math.floor(this.lavaFormen.length / 2);
      if (this.kontaktForm) insBild(this.kontaktForm, j.uKontakt!.value as Vector4, j.uKontaktE!.value as Vector4);
      j.uKontaktAn!.value = this.kontaktForm ? 1 : 0;
      // Teile mit Glanz: Mitte im Bild und Halbmesser ihrer größten Kugel im Bild
      const gp = j.uGlanzP!.value as Vector4[];
      this.glanzTeile.forEach((g, i) => {
        q.set(g.c[0], g.c[1], g.c[2]).project(kam);
        gp[i]!.set(rect.x + (q.x * 0.5 + 0.5) * rect.w, rect.y + (q.y * 0.5 + 0.5) * rect.h, g.r * f.ppu, 1);
      });
      j.uGlanzZahl!.value = this.glanzTeile.length;
      // Glanz am Umriss: Abstand zum Umriss innen (bis ⅓ des größten Teils), Halbmesser in Bildpunkten
      const Rm = Math.max(4, this.grossHalbmesser * f.ppu);
      const SSj = this.SS;
      const mwj = Math.round(rect.w * SSj);
      const mhj = Math.round(rect.h * SSj);
      if (this.glanzTeile.length) j.tRand!.value = this.randFeld(kam, mwj, mhj, 0.35 * Rm * SSj + 3);
      U.uFeldGr.value.set(mwj, mhj);
      U.uSS.value = SSj;
      this.koerper.material = this.jellyMat;
    } else this.koerper.material = (f.art === 'logo' ? this.logoMat : this.papierMat) as Material;
    // Glättung im Bild: Feld des Körpers zeichnen, dann waagerecht und senkrecht weichzeichnen
    const kMat = this.koerper.material as ShaderMaterial;
    const feld = this.glattFeld(f, kam);
    kMat.uniforms.tGlatt!.value = feld;
    kMat.uniforms.uGlattAn!.value = feld ? 1 : 0;
    r.setRenderTarget(null);
    r.setViewport(f.css.x, f.css.y, f.css.w, f.css.h);
    r.setScissor(f.css.x, f.css.y, f.css.w, f.css.h);
    r.setScissorTest(true);
    // Logo: die verjüngende Kontur der Ursprungsform in Breite und Farbe der Kanten (4 Bildpunkte bei 100 %, wachsen mit wie die Linien)
    if (f.art === 'logo') {
      this.umrissMat.uniforms.uBreite!.value = 4 * this.DPR * skal;
      r.render(this.szUmriss, kam);
    }
    r.render(this.szKoerper, kam);
    r.render(this.szLinien, kam);
    const gs = streckenGeo(f.griffStaebe);
    const gb = streckenGeo(f.griffBoegen);
    this.staebe.geometry.dispose();
    this.boegen.geometry.dispose();
    this.staebe.geometry = gs;
    this.boegen.geometry = gb;
    if (f.griffStaebe.length + f.griffBoegen.length === 0) return;
    // Griffe mit Kontrast: das Fenster, wie es ohne Griffe aussieht, als Bild; die Griffe richten ihre Farbe je Bildpunkt danach
    const unter = this.unterBild(rect.w, rect.h);
    this.posHilf.set(rect.x, rect.y);
    r.copyFramebufferToTexture(unter, this.posHilf);
    for (const m of [this.stabMat, this.bogenMat]) m.uniforms.tUnter!.value = unter;
    r.render(this.szGriffe, kam);
  }

  /** langer Schatten: zwei Ziele zum Hin- und Herzeichnen (R = Deckung, G = Weg zum Abzeichen in Schritten), Maske und Zug */
  private readonly schattenZiele: [WebGLRenderTarget, WebGLRenderTarget] = [schattenZiel(), schattenZiel()];
  private schattenMaskeMat: ShaderMaterial | null = null;
  private readonly schattenZugMat = new ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    blending: NoBlending,
    uniforms: { tQuelle: { value: null }, uGroesse: { value: new Vector2(4, 4) }, uSchritt: { value: 1 } },
    vertexShader: 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
    // je Schritt: der Punkt selbst und der um `uSchritt` Bildpunkte rechts oben (dort liegt, was den Schatten nach links unten wirft);
    // Deckung = Höchstwert, Weg = kürzester bis zum Abzeichen. Nach k Schritten (1, 2, 4, …) ist jeder Weg bis 2^k abgedeckt
    fragmentShader: [
      'uniform sampler2D tQuelle; uniform vec2 uGroesse; uniform float uSchritt;',
      'void main() {',
      '  vec2 fc = gl_FragCoord.xy; vec4 a = texture2D(tQuelle, fc / uGroesse);',
      '  vec2 q = fc + vec2(uSchritt);',
      '  if (q.x < uGroesse.x && q.y < uGroesse.y) {',
      '    vec4 b = texture2D(tQuelle, q / uGroesse);',
      '    float da = a.r > 0.004 ? a.g : 60000.0, db = b.r > 0.004 ? b.g + uSchritt : 60000.0;',
      '    a = vec4(max(a.r, b.r), min(da, db), 0.0, 1.0);',
      '  }',
      '  gl_FragColor = a;',
      '}',
    ].join('\n'),
  });
  private readonly szSchattenMaske = new Scene();
  private readonly szSchattenZug = new Scene();

  /** Der lange Schatten dieses Fensters (Gerätepixel, Größe des Fensters): Maske des Abzeichens, dann nach links unten gezogen */
  private langerSchatten(rect: { w: number; h: number }, kam: OrthographicCamera): Texture {
    const r = this.r;
    const [A, B] = this.schattenZiele;
    if (A.width !== rect.w || A.height !== rect.h) {
      A.setSize(rect.w, rect.h);
      B.setSize(rect.w, rect.h);
    }
    if (!this.schattenMaskeMat) {
      const hu = this.hgLogoMat.uniforms;
      this.schattenMaskeMat = new ShaderMaterial({
        depthTest: false,
        depthWrite: false,
        blending: NoBlending,
        uniforms: this.mitU({ tFeldC: hu.tFeldC!, tFeldR: hu.tFeldR!, uPlatte: hu.uPlatte!, uTiktok: hu.uTiktok! }),
        vertexShader: 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
        // was den Schatten wirft: alles bis zum äußeren Rand des Rands (beide Platten bzw. die Kontur samt Rand), geglättet
        fragmentShader: [
          SCHEMA,
          'uniform sampler2D tFeldC, tFeldR; uniform vec2 uPlatte; uniform float uTiktok;',
          'void main() {',
          '  vec2 fc = gl_FragCoord.xy + uVp.xy; float ra = (uInnen + uAussen) * uDpr * uMass;',
          '  float d = uTiktok > 0.5 ? min(abstandV(tFeldC, fc - uPlatte), abstandV(tFeldR, fc + uPlatte)) : abstandV(tFeldC, fc);',
          '  float c = 1.0 - smoothstep(ra - 0.7, ra + 0.7, d);',
          '  gl_FragColor = vec4(c, c > 0.004 ? 0.0 : 60000.0, 0.0, 1.0);',
          '}',
        ].join('\n'),
      });
      const m1 = new Mesh(new PlaneGeometry(2, 2), this.schattenMaskeMat);
      m1.frustumCulled = false;
      this.szSchattenMaske.add(m1);
      const m2 = new Mesh(new PlaneGeometry(2, 2), this.schattenZugMat);
      m2.frustumCulled = false;
      this.szSchattenZug.add(m2);
    }
    r.setRenderTarget(A);
    r.render(this.szSchattenMaske, kam);
    const z = this.schattenZugMat.uniforms;
    (z.uGroesse!.value as Vector2).set(rect.w, rect.h);
    let quelle = A;
    let ziel = B;
    for (let s = 1; s < Math.max(rect.w, rect.h); s *= 2) {
      z.tQuelle!.value = quelle.texture;
      z.uSchritt!.value = s;
      r.setRenderTarget(ziel);
      r.render(this.szSchattenZug, kam);
      const t = quelle;
      quelle = ziel;
      ziel = t;
    }
    return quelle.texture;
  }

  private readonly lavaHilf = new Vector3();
  private readonly extrHilf = new Vector2();
  private readonly zugHilf = new Vector2();
  private readonly lavaRe = new Vector3();
  private readonly lavaOb = new Vector3();
  private readonly posHilf = new Vector2();
  /** Bilder der Fenster ohne Griffe, je Größe (die Fenster sind meist gleich groß) */
  private readonly unterBilder = new Map<string, FramebufferTexture>();
  private unterBild(w: number, h: number): FramebufferTexture {
    const key = `${w}x${h}`;
    let t = this.unterBilder.get(key);
    if (!t) {
      if (this.unterBilder.size >= 6) {
        for (const alt of this.unterBilder.values()) alt.dispose();
        this.unterBilder.clear();
      }
      t = new FramebufferTexture(w, h);
      this.unterBilder.set(key, t);
    }
    return t;
  }
}
