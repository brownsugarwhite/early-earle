// Teststand „Blaupause“ (11.11.2026): die Darstellung des Prototyps `../blaupause.html` (Blatt 3, „Vorschlag“) für das echte Netz und
// die echten Linien des Fensters `kurven.ts`. Je Fenster: Grund (vorn hell, hinten dunkel, harte Kante beim Drehen), doppelte Outline
// um die Silhouette (innen 10, außen 15 Bildpunkte bei 100 %, aus einem Abstandsfeld je Fenster), der Körper in drei Stufen, die Linien
// (Kante 4 px durchgezogen, sonst 0,5 px gestrichelt, dazwischen verjüngt), die Punkte klein wie ihre Linie und die Griffe.
// Passer (Versatz zweier Farbplatten) nur an der äußeren Outline: Blick, Wandel (Platte 1 Grundform, Platte 2 Pose), Tiefe.
// Die Shader stammen aus dem Prototyp; geändert sind nur die Maßstäbe (Welteinheiten des Editors statt Einheitskugel).

import {
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  GreaterDepth,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  LessEqualDepth,
  Mesh,
  NearestFilter,
  NoBlending,
  OrthographicCamera,
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

export type P3 = [number, number, number];
/** Strecke einer Linie: Enden, Härte an den Enden (1 = Kante), Weg längs der Linie (Welteinheiten, für die Strichelung), Linie */
export type Strecke = { a: P3; b: P3; h: [number, number]; d: [number, number]; l: number };
/** Punkt: Ort, Zustand (0 ruhig, 1 schwebt, 2 gewählt), Breite seiner Linie bei 100 % (4 = Kante, 0,5 = keine) */
export type PunktBild = { p: P3; zustand: number; breite: number };

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
  /** Griffe dieses Fensters: Stäbe und Bögen */
  griffStaebe: Strecke[];
  griffBoegen: Strecke[];
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
};

const SCHEMA = [
  'uniform float uA, uBeta, uW, uFdot; uniform vec2 uFs, uMitte; uniform float uDpr; uniform vec4 uVp;',
  'uniform vec3 uTinte, uPlA, uPlB; const vec3 WEISS = vec3(1.0);',
  '#define BLAU uTinte',
  '#define HELL mix(WEISS, uTinte, 0.22)',
  '#define DIMM mix(WEISS, uTinte, 0.63)',
  '#define CY uPlA',
  '#define RT uPlB',
  // 0 = von vorn (helles Blatt), 1 = von hinten (dunkles Blatt)
  'float sigma(vec2 fc) { float s = uA * uFdot + uBeta * dot(fc - uMitte, uFs); return 1.0 - smoothstep(-uW, uW, s); }',
  'float kipp(float sg) { return smoothstep(0.52, 0.58, sg); }',
  'vec3 strich(float sg) { return mix(BLAU, WEISS, kipp(sg)); }',
  'vec3 gegen(float sg) { return mix(WEISS, BLAU, kipp(sg)); }',
  'uniform float uSS, uInnen, uAussen, uMass, uPasser; uniform sampler2D tFeld; uniform vec2 uFeldGr;',
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
  // Auswahl: auf den Linien durch den gewählten Punkt ein Verlauf, am Punkt am stärksten; feine Linien werden dort etwas breiter.
  // Ein ganz gewählter Loop trägt die Farbe auf seiner ganzen Länge.
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
  'varying vec2 vL; varying float vLen; varying vec2 vHw; varying vec2 vHh; varying vec2 vDd; varying vec2 vWahl;',
  'void main() {',
  '  float u = clamp(vL.x / max(vLen, 1e-4), 0.0, 1.0); float hw = mix(vHw.x, vHw.y, u);',
  '  float dist = length(vL - vec2(u * vLen, 0.0)); float h = mix(vHh.x, vHh.y, u);',
  '  float sg = sigma(gl_FragCoord.xy);',
  '  if (uHalo > 0.0) {',
  // nur die Hülle: ein Saum in der Gegenfarbe unter den harten Strecken (eigener Durchgang vor den Linien)
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
  '  vec3 weich = mix(mix(HELL, DIMM, sg), mix(mix(WEISS, uTinte, 0.6), mix(WEISS, uTinte, 0.38), kk), uWeichStark);',
  '  vec3 col = uFest > 0.5 ? hart : mix(weich, hart, smoothstep(0.05, 0.6, h));',
  // Verlauf der Auswahl: in der Farbe von Platte 2, vom gewählten Punkt aus auslaufend
  '  col = mix(col, RT, mix(vWahl.x, vWahl.y, u));',
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
  // Punkt des Netzes, klein wie in Blender: so dick wie seine Linie. Auf einer Kante ein heller Punkt in der dunklen Linie, auf einer
  // gestrichelten Linie ein kleiner dunkler mit hellem Saum. Schwebend etwas größer mit Rand, gewählt dunkel im Verlauf seiner Linien.
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

/** Outlines bei 100 % (Florian, 10.11.): innen 10, außen 15 Bildpunkte */
export const OUTLINE_INNEN = 10;
export const OUTLINE_AUSSEN = 15;
/** Passer „Blick“: Versatz der Platten in Bildpunkten bei 100 % */
const PASSER_BLICK = 6;

export class BlaupauseBild {
  private readonly r: WebGLRenderer;
  private readonly U = {
    uSS: { value: 1 },
    uInnen: { value: OUTLINE_INNEN },
    uAussen: { value: OUTLINE_AUSSEN },
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
    uPasser: { value: 0 },
    tFeldC: { value: null as Texture | null },
    tFeldR: { value: null as Texture | null },
    uSchub: { value: new Vector2() },
    uTinte: { value: new Vector3() },
    uPlA: { value: new Vector3() },
    uPlB: { value: new Vector3() },
    uParR: { value: new Vector2(1, 0) },
    uKamAbstand: { value: 3000 },
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
  private readonly SS: number;
  private readonly DPR: number;
  /** Papierkörper: drei Stufen auf hellem und auf dunklem Grund */
  private pal = { L: [new Vector3(), new Vector3(), new Vector3()], D: [new Vector3(), new Vector3(), new Vector3()] };
  private readonly koerperMat: ShaderMaterial;
  private readonly innenMat: ShaderMaterial;
  private readonly maskeMat: ShaderMaterial;
  private readonly flutMat: ShaderMaterial;
  private readonly hgMat: ShaderMaterial;
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
  einstellung: Einstellung = { durchsicht: false, linienMass: true, pBlick: true, pWandel: true, pTiefe: false, tiefe: 0.14, tiefeSchraeg: true, grundDa: false };
  farbe = { tinte: '#1c1c1f', a: '#1c43ff', b: '#ff6b1f' };

  constructor(renderer: WebGLRenderer, dpr: number) {
    this.r = renderer;
    this.DPR = dpr;
    this.SS = dpr >= 2 ? 1 : 2;
    const U = this.U;
    this.koerperMat = new ShaderMaterial({
      side: DoubleSide,
      uniforms: this.mitU({ uPalL: { value: this.pal.L }, uPalD: { value: this.pal.D }, uPar: { value: 0 }, uGrund: { value: 0 } }),
      vertexShader:
        SICHT_VS +
        'uniform float uGrund; attribute vec3 aGrund; varying vec3 vN; void main() { vN = normalMatrix * normal; gl_Position = sicht(mix(position, aGrund, uGrund)); }',
      fragmentShader: [
        SCHEMA,
        'uniform vec3 uPalL[3]; uniform vec3 uPalD[3]; varying vec3 vN;',
        'void main() {',
        '  vec2 fc = gl_FragCoord.xy; float sg = sigma(fc);',
        '  float l = dot(normalize(vN), normalize(vec3(-0.45, 0.62, 0.64)));',
        '  vec3 hell = l > 0.56 ? uPalL[2] : (l > 0.12 ? uPalL[1] : uPalL[0]);',
        '  vec3 dunkel = l > 0.56 ? uPalD[2] : (l > 0.12 ? uPalD[1] : uPalD[0]);',
        '  gl_FragColor = vec4(mix(hell, dunkel, sg), 1.0);',
        '}',
      ].join('\n'),
    });
    // das Innere des Mauls (in der Pose): dunkel wie ein Schatten, ohne Stufen
    this.innenMat = new ShaderMaterial({
      side: DoubleSide,
      uniforms: this.mitU({ uPar: { value: 0 } }),
      vertexShader: SICHT_VS + 'void main() { gl_Position = sicht(position); }',
      fragmentShader: [SCHEMA, 'void main() { float sg = sigma(gl_FragCoord.xy); gl_FragColor = vec4(mix(mix(WEISS, uTinte, 0.55), mix(uTinte, WEISS, 0.18), kipp(sg)), 1.0); }'].join('\n'),
    });
    // Saat des Abstandsfelds: jeder Bildpunkt des Körpers trägt den Versatz null
    this.maskeMat = new ShaderMaterial({
      side: DoubleSide,
      depthTest: false,
      depthWrite: false,
      blending: NoBlending,
      uniforms: { uPar: { value: 0 }, uParR: U.uParR, uKamAbstand: U.uKamAbstand, uGrund: { value: 0 } },
      vertexShader: SICHT_VS + 'uniform float uGrund; attribute vec3 aGrund; void main() { gl_Position = sicht(mix(position, aGrund, uGrund)); }',
      fragmentShader: 'void main() { gl_FragColor = vec4(8.0 / 255.0, 0.0, 8.0 / 255.0, 0.0); }',
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
    this.hgMat = new ShaderMaterial({
      depthTest: false,
      depthWrite: false,
      uniforms: this.mitU({}),
      vertexShader: 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: [
        SCHEMA,
        'uniform sampler2D tFeldC, tFeldR; uniform vec2 uSchub;',
        'void main() {',
        '  vec2 fc = gl_FragCoord.xy; float sg = sigma(fc); vec3 col = mix(WEISS, BLAU, sg);',
        '  float dK = abstand(fc), dC = dK, dR = dK;',
        '  if (uPasser > 0.5) { dC = abstandV(tFeldC, fc - uSchub); dR = abstandV(tFeldR, fc + uSchub); }',
        '  float ri = uInnen * uDpr * uMass, ra = (uInnen + uAussen) * uDpr * uMass;',
        '  float ci = 1.0 - smoothstep(ri - 0.7, ri + 0.7, dK);',
        '  float pC = (1.0 - smoothstep(ra - 0.7, ra + 0.7, dC)) * smoothstep(ri - 0.7, ri + 0.7, dC);',
        '  float pR = (1.0 - smoothstep(ra - 0.7, ra + 0.7, dR)) * smoothstep(ri - 0.7, ri + 0.7, dR);',
        '  col = mix(col, gegen(sg), ci);',
        '  col = mix(col, CY, pC * (1.0 - pR)); col = mix(col, RT, pR * (1.0 - pC)); col = mix(col, strich(sg), pC * pR);',
        '  gl_FragColor = vec4(col, 1.0);',
        '}',
      ].join('\n'),
    });
    const hgNetz = new Mesh(new PlaneGeometry(2, 2), this.hgMat);
    hgNetz.frustumCulled = false;
    this.szHg.add(hgNetz);

    const linienMat = (o: { hart: number; weich: number; strichel?: number; verdeckt?: boolean; alpha?: number; halo?: number; fest?: boolean; tiefe?: boolean }): ShaderMaterial =>
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
        }),
        vertexShader: LINIE_VS,
        fragmentShader: LINIE_FS,
      });
    this.matSicht = linienMat({ hart: 4, weich: 0.5, strichel: 7 });
    this.matVerdeckt = linienMat({ hart: 4, weich: 0.5, strichel: 7, verdeckt: true, alpha: 0.3 });
    this.matHalo = linienMat({ hart: 4, weich: 0.5, halo: 1.75 });
    // Griffe: der Stab gleichmäßig fein, die Bögen an den Enden etwas kräftiger (dort greift man); über allem, ohne Tiefe
    this.stabMat = linienMat({ hart: 1.1, weich: 1.1, fest: true, tiefe: false });
    this.bogenMat = linienMat({ hart: 2.2, weich: 2.2, fest: true, tiefe: false });
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

    this.koerper = new Mesh(new BufferGeometry(), this.koerperMat);
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
    const t = new Color(this.farbe.tinte);
    const a = new Color(this.farbe.a);
    const b = new Color(this.farbe.b);
    const w = new Color('#ffffff');
    const ton = (k: number): Color => w.clone().lerp(t, k);
    this.U.uTinte.value.set(t.r, t.g, t.b);
    this.U.uPlA.value.set(a.r, a.g, a.b);
    this.U.uPlB.value.set(b.r, b.g, b.b);
    const alsV = (c: Color) => new Vector3(c.r, c.g, c.b);
    // Papier: hell = Aufhellungen der Tinte; dunkel = Tinte abgedunkelt, Tinte, sehr hell
    this.pal.L.splice(0, 3, alsV(ton(0.19)), alsV(ton(0.09)), alsV(w));
    this.pal.D.splice(0, 3, alsV(t.clone().multiplyScalar(0.62)), alsV(t), alsV(ton(0.86)));
    (this.koerperMat.uniforms.uPalL as { value: Vector3[] }).value = this.pal.L;
    (this.koerperMat.uniforms.uPalD as { value: Vector3[] }).value = this.pal.D;
  }

  /** Abstandsfeld einer Silhouette: Maske zeichnen, dann fluten; gibt die Textur mit dem Ergebnis */
  private feldRechnen(kam: OrthographicCamera, paar: [WebGLRenderTarget, WebGLRenderTarget], grund: number, par: number, mw: number, mh: number, weit: number): Texture {
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
    r.render(this.szMaske, kam);
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

  /** ein Fenster zeichnen (der Aufrufer hat die Leinwand vorher gelöscht) */
  zeichne(f: FensterBild): void {
    const U = this.U;
    const E = this.einstellung;
    const r = this.r;
    const { rect, kam } = f;
    if (rect.w < 4 || rect.h < 4) return;
    const mass = f.mass;
    U.uMass.value = mass;
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
    // Linien und Punkte rücken um `versatzWelt` zur Kamera (in Clip-Koordinaten der orthografischen Kamera)
    const tiefeNdc = (2 * this.versatzWelt) / Math.max(1e-6, kam.far - kam.near);
    for (const m of [this.matSicht, this.matHalo]) m.uniforms.uVersatz!.value = tiefeNdc;
    this.pMatSicht.uniforms.uVersatz!.value = 2 * tiefeNdc;
    // Felder: der Körper und, je nach Passer, die zwei Farbplatten
    const SS = this.SS;
    const mw = Math.round(rect.w * SS);
    const mh = Math.round(rect.h * SS);
    const weit = (OUTLINE_INNEN + OUTLINE_AUSSEN + 2 * PASSER_BLICK) * mass * this.DPR * SS + 3;
    const passerAn = E.pBlick || E.pWandel || E.pTiefe;
    const haupt = this.feldRechnen(kam, this.FELDER[0]!, 0, 0, mw, mh, weit);
    let texC = haupt;
    let texR = haupt;
    // Platte 1: im Wandel die Grundform, bei Tiefe nach der einen Seite geschert; Platte 2: die Form, bei Tiefe nach der anderen
    const grundC = E.pWandel && E.grundDa ? 1 : 0;
    if (E.pTiefe || grundC) texC = this.feldRechnen(kam, this.FELDER[1]!, grundC, E.pTiefe ? E.tiefe : 0, mw, mh, weit);
    if (E.pTiefe) texR = this.feldRechnen(kam, this.FELDER[2]!, 0, -E.tiefe, mw, mh, weit);
    U.tFeld.value = haupt;
    U.tFeldC.value = texC;
    U.tFeldR.value = texR;
    U.uFeldGr.value.set(mw, mh);
    U.uSS.value = SS;
    U.uPasser.value = passerAn ? 1 : 0;
    // Blick: die Platten stehen schräg gegeneinander, Platte 1 nach links oben; von der Seite deckungsgleich, von hinten vertauscht
    const schub = E.pBlick ? PASSER_BLICK * this.DPR * mass * s.fdot : 0;
    U.uSchub.value.set(-0.7071 * schub, 0.7071 * schub);
    r.setRenderTarget(null);
    r.setViewport(f.css.x, f.css.y, f.css.w, f.css.h);
    r.setScissor(f.css.x, f.css.y, f.css.w, f.css.h);
    r.setScissorTest(true);
    r.render(this.szHg, kam);
    r.clearDepth();
    r.render(this.szKoerper, kam);
    r.render(this.szLinien, kam);
    // Griffe: je Fenster gebaut (ihre Bögen haben eine feste Größe im Bild)
    const gs = streckenGeo(f.griffStaebe);
    const gb = streckenGeo(f.griffBoegen);
    this.staebe.geometry.dispose();
    this.boegen.geometry.dispose();
    this.staebe.geometry = gs;
    this.boegen.geometry = gb;
    r.render(this.szGriffe, kam);
  }
}
