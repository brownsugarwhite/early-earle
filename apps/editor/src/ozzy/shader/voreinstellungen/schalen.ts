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
  BufferGeometry,
  CustomBlending,
  FrontSide,
  GLSL3,
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

  constructor(k: ShaderKern, art: SchalenArt) {
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
    const mz = k.ziel(`${this.art.name}:muster:${hoehe}`, { breite: MUSTER_BREITE, hoehe, art: 'half', filter: 'nearest' });
    if (schluessel !== this.musterSchluessel || this.mu.tMuster!.value !== mz.texture) {
      this.mu.uMusterHoehe!.value = hoehe;
      this.punkte.setDrawRange(0, anzahl);
      k.szene(this.punkteSzene, k.kamera, mz, [0, 0, 0, 0]);
      this.mu.tMuster!.value = mz.texture;
      this.musterSchluessel = schluessel;
    }
    // in Bewegung in kleinerer Auflösung (die Kosten wachsen mit der Fläche), steht das Bild, voll
    const name = `${this.art.name}:schalen`;
    const ziel = bewegt && !this.lebend
      ? k.ziel(`${name}:bewegt`, { proben: 4, tiefe: true, art: 'byte', anzahl: 2, skala: 0.7 })
      : k.ziel(name, { proben: 4, tiefe: true, art: 'byte', anzahl: 2 });
    k.szene(this.szene, k.kamera, ziel, [0, 0, 0, 0]);
    const zu = this.zusammen.uniforms;
    zu.tSchalen!.value = ziel.textures[0];
    zu.tKennung!.value = ziel.textures[1];
    zu.tWeich!.value = sw.weich ? this.weich.rechnen(k, ziel.textures[0]!, this.art.name, 0.25, 10) : ziel.textures[0];
    const ende = k.ziel(`${this.art.name}:ende`, { art: 'byte' });
    k.flaeche(this.zusammen, ende, [0, 0, 0, 0]);
    return ende.texture;
  }

  unruhig(): boolean {
    return this.nachziehen || this.lebend;
  }

  info(): Record<string, number> {
    return { schalen: this.n, ecken: this.punkte.getAttribute('position')?.count ?? 0, dreiecke: (this.geo.index?.count ?? 0) / 3 };
  }

  freigeben(): void {
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
  return { ...v, regler: art.regler, bauen: (k) => new SchalenLauf(k, art) };
}
