/**
 * Schalen (Runde 6; Plan `docs/plans/2026-11-21-ozzy-shader-runde-6.md`): der gemeinsame Lauf für alles, was über der Haut wächst
 * (Fell, Wolke, Zuckerwatte, Pusteblume). Das Netz des Kerns wird instanziert gezeichnet, die Haut und N Schalen in einem Durchgang,
 * jede Schale ein Stück weiter außen längs der Normale und in Strichrichtung geneigt (Lengyel u. a. 2001). Eine Art liefert nur ihr
 * Fragment, ihr Muster je Ecke und ihr Zusammensetzen.
 *
 * - **Deckung** (Fell): ein Netz, Kantenglättung über Deckung zu Abtastungen (alpha to coverage); Alpha im Ziel ist Deckung mal
 *   Alpha (siehe `deckungSchalen` im Zusammensetzen).
 * - **Durchsicht** (Wolke, Zuckerwatte): erst die Haut deckend, dann die Schalen durchscheinend gemischt (vormultipliziert), innen
 *   nach außen; jede Art rechnet ihre Deckung je Schale aus der Dicke einer Schicht (1 / uSchalen), so bleibt das Bild bei weniger
 *   Schalen gleich dicht.
 * - **Muster je Ecke:** einmal je Ecke in eine Textur gerechnet (nur wenn sich Netz oder Regler ändern; `eckMuster`), die Schalen
 *   lesen es über `gl_VertexID`.
 * - **In Bewegung** (Blick oder Form) weniger als die Hälfte der Schalen in 70 % der Auflösung; steht das Bild, folgt eins in voller
 *   Güte.
 */
import {
  BufferAttribute,
  BufferGeometry,
  CustomBlending,
  DoubleSide,
  FrontSide,
  GLSL3,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  type IUniform,
  Matrix4,
  Mesh,
  OneFactor,
  OneMinusSrcAlphaFactor,
  Points,
  RawShaderMaterial,
  Scene,
  type Texture,
} from 'three';
import { WeicheMaske } from '../bildShader';
import { G_UNIFORMS } from '../daten';
import { DRUCK, FARBE, LICHT, RAUSCHEN } from '../glsl';
import type { ReglerZeile, ShaderGruppe, ShaderKern, ShaderLauf, ShaderWerte, Voreinstellung } from '../kern';
import { BUEHNEN } from './buehnen';
import { TIER_ZELLEN } from './tiere';

const SCHALEN_VERTEX = /* glsl */ `
precision highp float;
uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform vec3 uHalb;
uniform float uRadius;
uniform float uSchalen;
uniform float uErste;
uniform float uLaenge;
uniform float uStrich;
uniform float uSchwer;
uniform sampler2D tMuster;
uniform float uMusterBreite;
in vec3 position;
in vec3 normal;
in float aSeite;
out vec4 vMuster;
out vec3 vWelt;
out vec3 vWurzel;
out vec3 vNormal;
out vec2 vSpiegel;
out float vH;
out vec3 vStrich;
void main() {
  float h = (float(gl_InstanceID) + uErste) / max(uSchalen, 1.0);
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
  int W = int(uMusterBreite);
  vMuster = texelFetch(tMuster, ivec2(gl_VertexID % W, gl_VertexID / W), 0);
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
uniform float uMusterBreite;
uniform float uMusterHoehe;
in vec3 position;
in vec3 normal;
out vec4 vMuster;
void main() {
  vec4 w0 = modelMatrix * vec4(position, 1.0);
  vec3 n = normalize(mat3(modelMatrix) * normal);
  vMuster = eckMuster((w0.xyz - uMitte) / uRadius, n);
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

/** Kopf jedes Schalen-Fragments: die gemeinsamen Werte, Ein- und Ausgänge, Rauschen, Farbe, Licht, Druck, Blick */
const SCHALEN_KOPF = /* glsl */ `
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
uniform float uLaenge;
in vec3 vWelt;
in vec3 vWurzel;
in vec3 vNormal;
in vec2 vSpiegel;
in float vH;
in vec3 vStrich;
in vec4 vMuster;
layout(location = 0) out vec4 farbe;
layout(location = 1) out vec4 kennung;
${RAUSCHEN}${FARBE}${LICHT}${DRUCK}
vec3 zumAuge(vec3 p) { return uOrtho > 0.5 ? -normalize((uViewInv * vec4(0.0, 0.0, -1.0, 0.0)).xyz) : normalize(uKamPos - p); }
vec3 ausSicht(vec3 d) { return normalize((uViewInv * vec4(d, 0.0)).xyz); }
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
 * nächste Mitte in einem raumzentrierten Raster (Mitten und Ecken der Würfel, je um bis zu 0,15 gestreut): zwei Kandidaten statt
 * acht Zellen (Runde 7: die Suche nach dem Büschel war der größte Posten des Fells). Dichte: zwei Mitten je Würfel. Vektor zur
 * Mitte (xyz), Abstand (w), Kennung. Nahe einer Grenze kann ein gestreuter Nachbar näher sein; das verschiebt die Grenze nur wenig.
 */
vec4 zelleBcc(vec3 x, out float id) {
  vec3 a = floor(x) + 0.5;
  vec3 b = floor(x + 0.5);
  vec3 ra = a + 0.3 * (hash33(a) - 0.5) - x;
  vec3 rb = b + 0.3 * (hash33(b + 0.37) - 0.5) - x;
  float da = dot(ra, ra), db = dot(rb, rb);
  bool istA = da < db;
  id = hash13(istA ? a + 0.37 : b + 0.71);
  return vec4(istA ? ra : rb, sqrt(min(da, db)));
}
/** Spiegelschnitt und Einrasten wie die Haut (an der Wurzel) */
bool schalenGeschnitten() {
  if (uSpiegel >= 0.0 && vSpiegel.x * vSpiegel.y < -uSpiegel * abs(vSpiegel.x)) return true;
  return dot(uSchnitt.xyz, vWurzel) < uSchnitt.w;
}
/** die Höhe innerhalb der Schicht gestreut (verwischt die Stufen zwischen den Schalen) */
float schalenHoehe() {
  float h = vH;
  if (h <= 0.0) return 0.0;
  float ign = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  return clamp(h + (ign - 0.5) / max(uSchalen, 1.0), 0.002, 1.0);
}
`;

/** Kopf des Zusammensetzens: gemeinsame Werte, die Schalen (tSchalen, tKennung), weiche Maske, Bühnen */
const ZUSAMMEN_KOPF = /* glsl */ `
${G_UNIFORMS}
uniform sampler2D tSchalen;
uniform sampler2D tKennung;
uniform sampler2D tWeich;
out vec4 farbe;
${RAUSCHEN}${FARBE}${DRUCK}${LICHT}${BUEHNEN}
/** Deckung der Schalen im Modus Deckung (Alpha im Ziel ist Deckung mal Alpha) */
float deckungSchalen(vec2 uv) { return sqrt(clamp(texture(tSchalen, uv).a, 0.0, 1.0)); }
`;

/**
 * Kopf der Flusen (Vertex, 24.11.): echte Haare über den Schalen, je Haar ein Band aus Stücken (position.x: 0 an der Wurzel … 1 an
 * der Spitze, position.y: Seite −1 oder 1), je Haar Wurzel, Normale, Seite und vier Zufallszahlen (instanziert). Die Art setzt den
 * Weg des Haars und ruft `flusenBand`.
 */
const FLUSEN_VERTEX_KOPF = /* glsl */ `
precision highp float;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform vec3 uMitte;
uniform float uRadius;
uniform vec2 uAufl;
uniform float uDpr;
uniform float uSpiegel;
uniform vec4 uSchnitt;
uniform float uLaenge;
uniform float uZeit;
uniform float uOrtho;
in vec3 position;
in vec3 aWurzel;
in vec3 aNormal;
in vec4 aZufall;
in float aSeite;
out vec3 vWelt;
out vec3 vT;
out vec3 vN;
out float vt;
out float vQuer;
out float vDeck;
out vec4 vZufall;
/** abgeschnitten wie die Haut (Spiegel, Einrasten), an der Wurzel */
bool flusenGeschnitten() {
  if (uSpiegel >= 0.0 && aSeite * aWurzel.z < -uSpiegel * abs(aSeite)) return true;
  return dot(uSchnitt.xyz, aWurzel) < uSchnitt.w;
}
/**
 * das Band um p, quer zum Weg im Bild (p2: der nächste Punkt), breite in Bildpunkten. Schmaler als 1,5 Bildpunkte wird es nicht
 * gezeichnet, sondern blasser (vDeck): so flimmern dünne Haare nicht.
 */
void flusenBand(vec3 p, vec3 p2, float breite) {
  vec4 c1 = projectionMatrix * viewMatrix * vec4(p, 1.0);
  vec4 c2 = projectionMatrix * viewMatrix * vec4(p2, 1.0);
  vec2 d = (c2.xy / c2.w - c1.xy / c1.w) * uAufl;
  d = dot(d, d) > 1e-10 ? normalize(d) : vec2(1.0, 0.0);
  float zeichnen = max(breite, 1.5);
  vDeck = breite / zeichnen;
  c1.xy += vec2(-d.y, d.x) * position.y * zeichnen / uAufl * c1.w;
  gl_Position = c1;
}
`;

/** Kopf der Flusen (Fragment) */
const FLUSEN_FRAGMENT_KOPF = /* glsl */ `
precision highp float;
uniform vec3 uKamPos;
uniform float uOrtho;
uniform mat4 uViewInv;
uniform float uZeit;
in vec3 vWelt;
in vec3 vT;
in vec3 vN;
in float vt;
in float vQuer;
in float vDeck;
in vec4 vZufall;
layout(location = 0) out vec4 farbe;
layout(location = 1) out vec4 kennung;
${RAUSCHEN}${FARBE}${LICHT}
vec3 zumAuge(vec3 p) { return uOrtho > 0.5 ? -normalize((uViewInv * vec4(0.0, 0.0, -1.0, 0.0)).xyz) : normalize(uKamPos - p); }
vec3 ausSicht(vec3 d) { return normalize((uViewInv * vec4(d, 0.0)).xyz); }
`;

export type SchalenWerte = {
  /** Schalen bei voller Güte (in Bewegung weniger) */
  voll: number;
  /** Länge (Anteil vom Radius der Form), Strich und Schwerkraft */
  laenge: number;
  strich: number;
  schwer: number;
  /** eigene Werte der Art (ihre Uniforms) */
  werte?: Record<string, number>;
  /** die weiche Maske für Schatten auf der Bühne */
  weich?: boolean;
  /** Zahl der Flusen bei voller Güte (in Bewegung die Hälfte); ohne Angabe alle Plätze */
  flusen?: number;
};

/** echte Haare über den Schalen (Flusen; nur mit `durchsicht`): je Haar ein Band aus `stuecke` Stücken, instanziert */
export type FlusenArt = {
  /** so viele Plätze werden angelegt (höchste Zahl der Haare) */
  hoechstens: number;
  /** Stücke je Haar */
  stuecke: number;
  /** GLSL nach dem Kopf der Flusen (Vertex): eigene Konstanten und Funktionen, void main() (setzt den Weg, ruft flusenBand) */
  vertex: string;
  /** GLSL nach dem Kopf der Flusen (Fragment): void main() */
  fragment: string;
};

export type SchalenArt = {
  /** Vorsilbe der Ziele */
  name: string;
  regler: ReglerZeile[];
  /** eigene Uniforms mit Startwerten (im GLSL selbst deklariert) */
  uniforms: Record<string, number>;
  /** GLSL des Schalen-Fragments nach dem Kopf: eigene Uniforms, Funktionen, void main() */
  fragment: string;
  /** GLSL mit vec4 eckMuster(vec3 q, vec3 n) für die Textur je Ecke (ohne Ableitungen; darf uR_* und eigene Uniforms nutzen) */
  muster: string;
  /** was außer dem Netz das Muster je Ecke ändert */
  musterSchluessel: (w: ShaderWerte) => string;
  /** GLSL des Zusammensetzens nach seinem Kopf: void main() */
  zusammen: string;
  /** durchscheinend gemischt statt deckend */
  durchsicht?: boolean;
  /** echte Haare über den Schalen (nur mit `durchsicht`) */
  flusen?: FlusenArt;
  werte: (w: ShaderWerte, k: ShaderKern) => SchalenWerte;
  /** bewegt sich die Art von selbst (Zeit)? */
  lebt?: (w: ShaderWerte) => boolean;
};

export class SchalenLauf implements ShaderLauf {
  private readonly geo = new InstancedBufferGeometry();
  private readonly hautGeo = new InstancedBufferGeometry();
  private readonly punkte = new BufferGeometry();
  private readonly punkteSzene = new Scene();
  private readonly szene = new Scene();
  private readonly muster: RawShaderMaterial;
  private readonly schalen: RawShaderMaterial;
  private readonly haut: RawShaderMaterial | null;
  private readonly zusammen: RawShaderMaterial;
  private readonly weich: WeicheMaske;
  private readonly art: SchalenArt;
  private readonly ru: Record<string, IUniform> = {};
  private readonly au: Record<string, IUniform> = {};
  private readonly fu: Record<string, IUniform> = {
    uSchalen: { value: 16 },
    uLaenge: { value: 0.05 },
    uStrich: { value: 0.5 },
    uSchwer: { value: 0.2 },
  };
  private readonly mu: Record<string, IUniform> = { tMuster: { value: null }, uMusterBreite: { value: MUSTER_BREITE }, uMusterHoehe: { value: 1 } };
  private musterSchluessel = '';
  private n = 0;
  private readonly sicht = new Matrix4();
  private stand = -1;
  private nachziehen = false;
  private lebend = false;
  private skala = 1;
  /** Flusen: Bänder, Programm, Stand des Netzes ihrer Wurzeln, feste Wahl je Haar (Dreieck, zwei Gewichte), Flächen der Dreiecke */
  private readonly flusenGeo = new InstancedBufferGeometry();
  private readonly flusenMat: RawShaderMaterial | null;
  private flusenStand = -1;
  private flusenWahl: Float32Array | null = null;
  private flaechen: Float64Array | null = null;
  private flusenZahl = 0;

  /**
   * Vorsilbe der Ziele: die Kennung des Shaders, nicht der Name der Art (22.11.). Fell, Schaf, Plüschtier, Leopard, Tiger und Giraffe
   * teilen die Art „fell“; mit geteilten Zielen las in den Streifen das Schaf das Muster je Ecke des Leoparden (es wird nur bei
   * Änderungen neu gerechnet).
   */
  private readonly ziel: string;
  constructor(k: ShaderKern, art: SchalenArt, id = art.name) {
    this.ziel = id;
    this.art = art;
    for (const r of art.regler) this.ru[`uR_${r.k}`] = { value: r.grund };
    for (const [n, v] of Object.entries(art.uniforms)) this.au[n] = { value: v };
    const kopf = art.regler.map((r) => `uniform float uR_${r.k};`).join('\n');
    const alle = { ...this.ru, ...this.au, ...this.fu, ...this.mu };
    const fragment = `${SCHALEN_KOPF}\n${kopf}\n${art.fragment}`;
    if (art.durchsicht) {
      // erst die Haut deckend, dann die Schalen durchscheinend (vormultipliziert), innen nach außen
      this.haut = k.netzProgramm(fragment, { vertex: SCHALEN_VERTEX, uniforms: { ...alle, uErste: { value: 0 } }, seite: FrontSide });
      this.schalen = k.netzProgramm(fragment, {
        vertex: SCHALEN_VERTEX,
        uniforms: { ...alle, uErste: { value: 1 } },
        seite: FrontSide,
        transparent: true,
        tiefeSchreiben: false,
      });
      this.schalen.blending = CustomBlending;
      this.schalen.blendSrc = OneFactor;
      this.schalen.blendDst = OneMinusSrcAlphaFactor;
      this.schalen.blendSrcAlpha = OneFactor;
      this.schalen.blendDstAlpha = OneMinusSrcAlphaFactor;
      const h = new Mesh(this.hautGeo, this.haut);
      h.frustumCulled = false;
      h.renderOrder = 0;
      this.szene.add(h);
    } else {
      this.haut = null;
      this.schalen = k.netzProgramm(fragment, { vertex: SCHALEN_VERTEX, uniforms: { ...alle, uErste: { value: 0 } }, seite: FrontSide });
      this.schalen.alphaToCoverage = true;
    }
    const mesh = new Mesh(this.geo, this.schalen);
    mesh.frustumCulled = false;
    mesh.renderOrder = 1;
    this.szene.add(mesh);
    this.flusenMat = art.flusen && art.durchsicht ? this.flusenBauen(k, art.flusen, kopf, alle) : null;
    this.muster = new RawShaderMaterial({
      glslVersion: GLSL3,
      uniforms: { ...k.u, ...alle },
      vertexShader: MUSTER_PUNKTE_VERTEX.replace('out vec4 vMuster;', `out vec4 vMuster;\n${kopf}\n${RAUSCHEN}\n${TIER_ZELLEN}\n${art.muster}`),
      fragmentShader: MUSTER_PUNKTE_FRAGMENT,
      depthTest: false,
      depthWrite: false,
    });
    const punkte = new Points(this.punkte, this.muster);
    punkte.frustumCulled = false;
    this.punkteSzene.add(punkte);
    this.zusammen = k.flaecheProgramm(`${kopf}\n${ZUSAMMEN_KOPF}\n${art.zusammen}`, {
      ...this.ru,
      ...this.au,
      tSchalen: { value: null },
      tKennung: { value: null },
      tWeich: { value: null },
    });
    this.weich = new WeicheMaske(k);
  }

  /** die Bänder der Flusen: ein Haar als Streifen aus Stücken (je Stück zwei Dreiecke), dazu je Haar feste Zufallszahlen */
  private flusenBauen(k: ShaderKern, f: FlusenArt, kopf: string, alle: Record<string, IUniform>): RawShaderMaterial {
    const S = f.stuecke;
    const basis = new Float32Array((S + 1) * 6);
    const index: number[] = [];
    for (let i = 0; i <= S; i++) {
      basis.set([i / S, -1, 0, i / S, 1, 0], i * 6);
      if (i < S) index.push(2 * i, 2 * i + 1, 2 * i + 2, 2 * i + 1, 2 * i + 3, 2 * i + 2);
    }
    const g = this.flusenGeo;
    g.setAttribute('position', new BufferAttribute(basis, 3));
    g.setIndex(index);
    const N = f.hoechstens;
    g.setAttribute('aWurzel', new InstancedBufferAttribute(new Float32Array(N * 3), 3));
    g.setAttribute('aNormal', new InstancedBufferAttribute(new Float32Array(N * 3), 3));
    g.setAttribute('aSeite', new InstancedBufferAttribute(new Float32Array(N), 1));
    // feste Zufallszahlen (bei jedem Start gleich): drei für den Platz auf der Haut, vier für das Haar
    const wahl = new Float32Array(N * 3);
    const zufall = new Float32Array(N * 4);
    let s = 0x2f6b9a1d;
    const z = (): number => {
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    for (let i = 0; i < wahl.length; i++) wahl[i] = z();
    for (let i = 0; i < zufall.length; i++) zufall[i] = z();
    g.setAttribute('aZufall', new InstancedBufferAttribute(zufall, 4));
    g.instanceCount = 0;
    this.flusenWahl = wahl;
    const m = k.netzProgramm(`${FLUSEN_FRAGMENT_KOPF}\n${kopf}\n${f.fragment}`, {
      vertex: `${FLUSEN_VERTEX_KOPF}\n${kopf}\n${f.vertex}`,
      uniforms: alle,
      seite: DoubleSide,
      transparent: true,
      tiefeSchreiben: false,
    });
    m.blending = CustomBlending;
    m.blendSrc = OneFactor;
    m.blendDst = OneMinusSrcAlphaFactor;
    m.blendSrcAlpha = OneFactor;
    m.blendDstAlpha = OneMinusSrcAlphaFactor;
    const mesh = new Mesh(g, m);
    mesh.frustumCulled = false;
    mesh.renderOrder = 2;
    this.szene.add(mesh);
    return m;
  }

  /** die Wurzeln der Flusen auf die Haut: Dreiecke nach ihrer Fläche gewählt, im Dreieck gleichmäßig (bei jeder Änderung des Netzes) */
  private flusenSetzen(k: ShaderKern): void {
    const g = k.geo;
    const idx = g.index?.array;
    const wahl = this.flusenWahl;
    if (!idx || !wahl) return;
    const P = (g.getAttribute('position') as BufferAttribute).array as Float32Array;
    const Nn = (g.getAttribute('normal') as BufferAttribute).array as Float32Array;
    const Se = (g.getAttribute('aSeite') as BufferAttribute).array as Float32Array;
    const T = Math.floor(idx.length / 3);
    if (T === 0) return;
    if (!this.flaechen || this.flaechen.length < T) this.flaechen = new Float64Array(T);
    const F = this.flaechen;
    let summe = 0;
    for (let i = 0; i < T; i++) {
      const a = idx[3 * i]! * 3, b = idx[3 * i + 1]! * 3, c = idx[3 * i + 2]! * 3;
      const ux = P[b]! - P[a]!, uy = P[b + 1]! - P[a + 1]!, uz = P[b + 2]! - P[a + 2]!;
      const vx = P[c]! - P[a]!, vy = P[c + 1]! - P[a + 1]!, vz = P[c + 2]! - P[a + 2]!;
      const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
      summe += Math.sqrt(cx * cx + cy * cy + cz * cz);
      F[i] = summe;
    }
    const wu = this.flusenGeo.getAttribute('aWurzel') as InstancedBufferAttribute;
    const no = this.flusenGeo.getAttribute('aNormal') as InstancedBufferAttribute;
    const se = this.flusenGeo.getAttribute('aSeite') as InstancedBufferAttribute;
    const W = wu.array as Float32Array, N = no.array as Float32Array, S = se.array as Float32Array;
    for (let j = 0; j < S.length; j++) {
      const r = wahl[3 * j]! * summe;
      let lo = 0, hi = T - 1;
      while (lo < hi) {
        const m = (lo + hi) >> 1;
        if (F[m]! < r) lo = m + 1;
        else hi = m;
      }
      const ia = idx[3 * lo]!, ib = idx[3 * lo + 1]!, ic = idx[3 * lo + 2]!;
      const w = Math.sqrt(wahl[3 * j + 1]!);
      const u = 1 - w, v = w * (1 - wahl[3 * j + 2]!), x = w * wahl[3 * j + 2]!;
      for (let e = 0; e < 3; e++) {
        W[3 * j + e] = u * P[3 * ia + e]! + v * P[3 * ib + e]! + x * P[3 * ic + e]!;
        N[3 * j + e] = u * Nn[3 * ia + e]! + v * Nn[3 * ib + e]! + x * Nn[3 * ic + e]!;
      }
      S[j] = Se[ia]!;
    }
    wu.needsUpdate = true;
    no.needsUpdate = true;
    se.needsUpdate = true;
  }

  /** das Netz des Kerns teilen (dieselben Puffer), sobald es sich ändert */
  private verbinden(k: ShaderKern): boolean {
    const g = k.geo;
    const pos = g.getAttribute('position');
    const nor = g.getAttribute('normal');
    const seite = g.getAttribute('aSeite');
    if (!pos || !nor || !seite || !g.index) return false;
    for (const ziel of [this.geo, this.hautGeo]) {
      if (ziel.getAttribute('position') !== pos) ziel.setAttribute('position', pos);
      if (ziel.getAttribute('normal') !== nor) ziel.setAttribute('normal', nor);
      if (ziel.getAttribute('aSeite') !== seite) ziel.setAttribute('aSeite', seite);
      if (ziel.index !== g.index) ziel.setIndex(g.index);
    }
    if (this.punkte.getAttribute('position') !== pos) this.punkte.setAttribute('position', pos);
    if (this.punkte.getAttribute('normal') !== nor) this.punkte.setAttribute('normal', nor);
    return true;
  }

  bild(k: ShaderKern, w: ShaderWerte): Texture | null {
    if (!this.verbinden(k)) return null;
    for (const r of this.art.regler) this.ru[`uR_${r.k}`]!.value = w.regler[r.k] ?? r.grund;
    const sw = this.art.werte(w, k);
    for (const [n, v] of Object.entries(sw.werte ?? {})) if (this.au[n]) this.au[n].value = v;
    this.lebend = this.art.lebt?.(w) ?? false;
    const bewegt = !this.sicht.equals(k.u.uView.value) || k.netzStand !== this.stand || this.lebend;
    this.sicht.copy(k.u.uView.value);
    this.stand = k.netzStand;
    this.n = bewegt ? Math.max(8, Math.round(sw.voll * 0.45)) : sw.voll;
    this.nachziehen = bewegt;
    if (this.flusenMat && this.art.flusen) {
      if (k.netzStand !== this.flusenStand) {
        this.flusenSetzen(k);
        this.flusenStand = k.netzStand;
      }
      const hoechstens = this.art.flusen.hoechstens;
      const voll = Math.max(0, Math.min(hoechstens, Math.round(sw.flusen ?? hoechstens)));
      this.flusenZahl = bewegt && !this.lebend ? Math.round(voll * 0.5) : voll;
      this.flusenGeo.instanceCount = this.flusenZahl;
    }
    const u = this.fu;
    u.uSchalen!.value = this.n;
    u.uLaenge!.value = sw.laenge;
    u.uStrich!.value = sw.strich;
    u.uSchwer!.value = sw.schwer;
    // Haut und Schalen: im Modus Durchsicht eine Haut und N Schalen darüber, sonst alles in einem
    this.hautGeo.instanceCount = 1;
    this.geo.instanceCount = this.art.durchsicht ? this.n : this.n + 1;
    // das Muster je Ecke, nur wenn nötig
    const anzahl = k.geo.getAttribute('position')!.count;
    const hoehe = Math.max(1, Math.ceil(anzahl / MUSTER_BREITE));
    const schluessel = `${k.netzStand}|${anzahl}|${this.art.musterSchluessel(w)}`;
    const mz = k.ziel(`${this.ziel}:muster:${hoehe}`, { breite: MUSTER_BREITE, hoehe, art: 'half', filter: 'nearest' });
    if (schluessel !== this.musterSchluessel || this.mu.tMuster!.value !== mz.texture) {
      this.mu.uMusterHoehe!.value = hoehe;
      this.punkte.setDrawRange(0, anzahl);
      k.szene(this.punkteSzene, k.kamera, mz, [0, 0, 0, 0]);
      this.mu.tMuster!.value = mz.texture;
      this.musterSchluessel = schluessel;
    }
    // in Bewegung in kleinerer Auflösung (die Kosten wachsen mit der Fläche), steht das Bild, voll. Deckt die Form mehr als ein
    // Drittel des Bilds (nah), sinkt die Auflösung in Stufen bis 50 % (Runde 7)
    const name = `${this.ziel}:schalen`;
    const rPx = k.u.uMass.value * k.u.uRadius.value;
    const bildCss = (k.u.uAufl.value.x / k.u.uDpr.value) * (k.u.uAufl.value.y / k.u.uDpr.value);
    const flaeche = Math.min(1, (Math.PI * rPx * rPx) / Math.max(1, bildCss));
    const skala = flaeche > 0.6 ? 0.5 : flaeche > 0.35 ? 0.6 : 0.7;
    this.skala = bewegt && !this.lebend ? skala : 1;
    const ziel = bewegt && !this.lebend
      ? k.ziel(`${name}:bewegt${Math.round(skala * 100)}`, { proben: 4, tiefe: true, art: 'byte', anzahl: 2, skala })
      : k.ziel(name, { proben: 4, tiefe: true, art: 'byte', anzahl: 2 });
    k.szene(this.szene, k.kamera, ziel, [0, 0, 0, 0]);
    const zu = this.zusammen.uniforms;
    zu.tSchalen!.value = ziel.textures[0];
    zu.tKennung!.value = ziel.textures[1];
    zu.tWeich!.value = sw.weich ? this.weich.rechnen(k, ziel.textures[0]!, this.ziel, 0.25, 10) : ziel.textures[0];
    const ende = k.ziel(`${this.ziel}:ende`, { art: 'byte' });
    k.flaeche(this.zusammen, ende, [0, 0, 0, 0]);
    return ende.texture;
  }

  unruhig(): boolean {
    return this.nachziehen || this.lebend;
  }

  info(): Record<string, number> {
    return { schalen: this.n, skala: this.skala, ecken: this.punkte.getAttribute('position')?.count ?? 0, dreiecke: (this.geo.index?.count ?? 0) / 3, flusen: this.flusenZahl };
  }

  freigeben(): void {
    this.flusenMat?.dispose();
    this.flusenGeo.dispose();
    this.muster.dispose();
    this.punkte.dispose();
    this.schalen.dispose();
    this.haut?.dispose();
    this.zusammen.dispose();
    this.weich.freigeben();
    this.geo.dispose();
    this.hautGeo.dispose();
  }
}

/** eine Voreinstellung auf den Schalen */
export function schalenVoreinstellung(v: { id: string; name: string; gruppe: ShaderGruppe; zeile: string }, art: SchalenArt): Voreinstellung {
  return { ...v, regler: art.regler, bauen: (k) => new SchalenLauf(k, art, v.id) };
}
