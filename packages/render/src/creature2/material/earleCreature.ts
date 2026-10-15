import { DataTexture, HalfFloatType, LinearFilter, RGBAFormat, Vector3, Vector4 } from 'three';
import { MeshBasicNodeMaterial, type TextureNode, type UniformNode } from 'three/webgpu';
import { abs, attribute, clamp, cross, dFdx, dFdy, dot, exp2, float, floor, Fn, fract, fwidth, length, log2, max, min, mix, normalGeometry, normalize, normalView, positionGeometry, positionLocal, positionView, pow, select, sin, smoothstep, sqrt, step, texture, uniform, uniformArray, vec2, vec3, vec4 } from 'three/tsl';
import type { FloatNode, Vec3Node, Vec4Node } from '../../common/tsl';
import { STIL_STANDARD, farbRolle, type WesenStil } from './stil';
import { createMusterUniforms, createZonenUniforms, hash3, musterMasks, ZONEN_ANZAHL, zonenMaske, type MusterUniforms, type ZonenUniforms } from './muster';
import { augenFormAbstand } from './augenFormen';

/**
 * Das Earle-Wesen-Material (erste Fassung, Look-Vertrag Regeln 1–5, 9, 10 teilweise, 12):
 * Figurenlicht im Blickraum (rechts oben), Wertstufen mit gefederten Kanten und Verlauf in der Stufe, farbige Schatten
 * (OKLab-Regel aus `stil.ts`), Rim zur Lichtseite, Bodenkontakt, getupftes Korn im Körperraum, Rachen/Lippen/Höhlen aus den
 * Deskriptoren, Höhlung (AO) als Verdunklung in Falten, Glimmer (gemalte Funken und warmes Licht, Bild 18), Zonen
 * (Farbflächen mit gemalter Grenze, Bild 17) unter dem Muster, Schlitzaugen mit Blinzeln.
 * Unbeleuchtetes Node-Material (keine Szenenlichter), Skinning übernimmt three für SkinnedMesh automatisch.
 */

export const MAX_SLIT_EYES = 4;

export interface CreatureMaterialUniforms {
  /** Figurenlicht im Blickraum (Einheit). */
  lightDir: UniformNode<'vec3', Vector3>;
  stufen: UniformNode<'float', number>;
  federung: UniformNode<'float', number>;
  verlauf: UniformNode<'float', number>;
  rim: UniformNode<'float', number>;
  korn: UniformNode<'float', number>;
  glimmer: UniformNode<'float', number>;
  bodenlicht: UniformNode<'float', number>;
  /** Kanten: Anteil Facettennormale an scharfen Kanten (0 weich … 1 scharf). */
  kanten: UniformNode<'float', number>;
  /** Körperhöhe (Korn- und Augenmaße). */
  bodyScale: UniformNode<'float', number>;
  /** Farbrollen als base/schatten/licht. */
  grund: Vec3Triple;
  bauch: Vec3Triple;
  muster: Vec3Triple;
  akzent: Vec3Triple;
  lippe: Vec3Triple;
  rachen: Vec3Triple;
  musterU: MusterUniforms;
  auge: UniformNode<'vec3', Vector3>;
  nase: UniformNode<'vec3', Vector3>;
  /** Gesicht: Nase (xyz Mitte, w Radius), Scharte als Strecke A → B (w: Linienbreite), `gesichtAn` 0/1. */
  naseMitte: UniformNode<'vec4', Vector4>;
  /** Dreiecksnase: Oben-Richtung (xyz) und Höhe (w), Rechts-Richtung (xyz); Höhe 0 = runde Nase. */
  naseOben: UniformNode<'vec4', Vector4>;
  naseRechts: UniformNode<'vec4', Vector4>;
  philtrumA: UniformNode<'vec4', Vector4>;
  philtrumB: UniformNode<'vec3', Vector3>;
  gesichtAn: UniformNode<'float', number>;
  /** Band der Unterlippe relativ zur Oberlippe (1 gleich, 0 keine Unterlippe sichtbar — ω nur oben). */
  lippenBandUnten: UniformNode<'float', number>;
  /** Bauch/Rücken-Grenze (−1…1 in der dorsalen Koordinate) und Weichheit. */
  bauchlinie: UniformNode<'float', number>;
  /** Bauchfarbe um Maul und Augen (helle Schnauze der Raubkatzen). */
  gesichtHell: UniformNode<'float', number>;
  bauchStaerke: UniformNode<'float', number>;
  /** Schlitzaugen: Position (xyz) + Größe (w) im Körperraum; Rahmen: oben (xyz) + Blinzeln (w). */
  eyePos: ReturnType<typeof uniformArray>;
  eyeUp: ReturnType<typeof uniformArray>;
  /** Augenformen (Phase 2 M5, nur mit `augenFormen`): Rechts-Achse (xyz) je Auge; Form, Zustand, Breite (xyz) je Auge; Zeit (Spirale) */
  eyeRechts: ReturnType<typeof uniformArray>;
  eyeForm: ReturnType<typeof uniformArray>;
  augenZeit: UniformNode<'float', number>;
  eyeCount: UniformNode<'float', number>;
  /** Augenringe (dunkler Höhlenring auf der Haut um Augäpfel, Bild 10/11): Anzahl und Stärke. */
  ringCount: UniformNode<'float', number>;
  ringStaerke: UniformNode<'float', number>;
  blink: UniformNode<'float', number>;
  /** Gewicht des Verschluss-Morphs (1 = Maul zu). */
  verschluss: UniformNode<'float', number>;
  /** Breite des Lippenbands (Zahnfleisch) in Körpereinheiten, 0 = keins (Giraffe). */
  lippenBand: UniformNode<'float', number>;
  /** Gewicht des Spitzmund-Morphs (1 = Lochmaul ganz weit). */
  spitzmund: UniformNode<'float', number>;
  /** Zonen (Bild 17): Form je Zone und ihre Farbrollen. */
  zonen: ZonenUniforms;
  zonenFarbe: Vec3Triple[];
  /** Zonen-Atlas (Plan 8.2): signierter Abstand je Zone (RGB, Welt, + innen) und Weichheit je Zone (RGB, Welt) je Texel,
   * gelesen über das Attribut `eeAtlas` (Kachelkoordinaten je Ecke); `atlasAn` 0/1 schaltet die prozeduralen Zonen ab. */
  atlasAn: UniformNode<'float', number>;
  atlasAbstand: TextureNode;
  atlasWeich: TextureNode;
  /** Gemaltes Fell (Plan 8.4): Büschelfeld in Wirbelsäulen-Koordinaten, dunkler Ansatz → helle Spitze je Büschel; Stärke 0 = aus, Büschelgröße als Anteil der Höhe */
  fellStaerke: UniformNode<'float', number>;
  fellGroesse: UniformNode<'float', number>;
  /** Glimmer des Wesens (Bauplan, 0…1) — wirkt mal dem Stil-Glimmer. */
  glimmerWesen: UniformNode<'float', number>;
  /** Farbe des Glimmerlichts (linear). */
  glimmerFarbe: UniformNode<'vec3', Vector3>;
  /** Uhr des Wesens (s) für Funkeln und Lavalampe; steht im Standbild. */
  zeit: UniformNode<'float', number>;
  /** Anteil der Teil-Koordinate (Beine/Schwanz) — 1, wenn das Mesh `eeTeil` trägt. */
  teilAn: UniformNode<'float', number>;
}

export interface Vec3Triple {
  base: UniformNode<'vec3', Vector3>;
  schatten: UniformNode<'vec3', Vector3>;
  licht: UniformNode<'vec3', Vector3>;
}

function triple(hex: string, stil: WesenStil): Vec3Triple {
  const f = farbRolle(hex, stil);
  return { base: uniform(new Vector3(...f.base)), schatten: uniform(new Vector3(...f.schatten)), licht: uniform(new Vector3(...f.licht)) };
}

export function setTriple(t: Vec3Triple, hex: string, stil: WesenStil): void {
  const f = farbRolle(hex, stil);
  t.base.value.set(...f.base);
  t.schatten.value.set(...f.schatten);
  t.licht.value.set(...f.licht);
}

export function lightDirFromStil(stil: WesenStil, out = new Vector3()): Vector3 {
  const az = (stil.lichtAzimut * Math.PI) / 180;
  const el = (stil.lichtHoehe * Math.PI) / 180;
  // Blickraum: +x rechts, +y oben, +z zum Betrachter
  return out.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).normalize();
}

export interface CreatureColors {
  grund: string;
  bauch: string;
  muster: string;
  akzent: string;
  lippe: string;
  rachen: string;
  auge: string;
  nase?: string;
  /** Zonenfarben (bis zu drei). */
  zonen?: string[];
  /** Glimmerlicht. */
  glimmer?: string;
}

const ZONE_STANDARD = '#f3e6c8';
const GLIMMER_STANDARD = '#f7d6a0';

export function createCreatureUniforms(colors: CreatureColors, stil: WesenStil = STIL_STANDARD, bodyScale = 1): CreatureMaterialUniforms {
  const eyePos = uniformArray(Array.from({ length: MAX_SLIT_EYES }, () => new Vector4(0, 0, 0, 0)), 'vec4');
  const eyeUp = uniformArray(Array.from({ length: MAX_SLIT_EYES }, () => new Vector4(0, 1, 0, 1)), 'vec4');
  const eyeRechts = uniformArray(Array.from({ length: MAX_SLIT_EYES }, () => new Vector4(1, 0, 0, 0)), 'vec4');
  const eyeForm = uniformArray(Array.from({ length: MAX_SLIT_EYES }, () => new Vector4(0, 0, 1, 0)), 'vec4');
  return {
    lightDir: uniform(lightDirFromStil(stil)),
    stufen: uniform(stil.stufen),
    federung: uniform(stil.federung),
    verlauf: uniform(stil.verlauf),
    rim: uniform(stil.rim),
    korn: uniform(stil.korn),
    glimmer: uniform(stil.glimmer),
    bodenlicht: uniform(stil.bodenlicht),
    kanten: uniform(stil.kanten),
    bodyScale: uniform(bodyScale),
    grund: triple(colors.grund, stil),
    bauch: triple(colors.bauch, stil),
    muster: triple(colors.muster, stil),
    akzent: triple(colors.akzent, stil),
    musterU: createMusterUniforms(),
    lippe: triple(colors.lippe, stil),
    rachen: triple(colors.rachen, stil),
    auge: uniform(new Vector3(...farbRolle(colors.auge, stil).base)),
    nase: uniform(new Vector3(...farbRolle(colors.nase ?? '#2a2226', stil).base)),
    naseMitte: uniform(new Vector4(0, 0, 0, 0)),
    naseOben: uniform(new Vector4(0, 1, 0, 0)),
    naseRechts: uniform(new Vector4(1, 0, 0, 0)),
    philtrumA: uniform(new Vector4(0, 0, 0, 0.01)),
    philtrumB: uniform(new Vector3(0, 0, 0)),
    gesichtAn: uniform(0),
    lippenBandUnten: uniform(1),
    bauchlinie: uniform(-0.2),
    gesichtHell: uniform(0),
    bauchStaerke: uniform(0),
    eyePos,
    eyeUp,
    eyeRechts,
    eyeForm,
    augenZeit: uniform(0),
    eyeCount: uniform(0),
    ringCount: uniform(0),
    ringStaerke: uniform(0.5),
    blink: uniform(0),
    verschluss: uniform(0),
    lippenBand: uniform(0),
    spitzmund: uniform(0),
    zonen: createZonenUniforms(),
    zonenFarbe: Array.from({ length: ZONEN_ANZAHL }, (_, i) => triple(colors.zonen?.[i] ?? ZONE_STANDARD, stil)),
    atlasAn: uniform(0),
    atlasAbstand: texture(leereAtlasTextur()),
    atlasWeich: texture(leereAtlasTextur()),
    fellStaerke: uniform(0),
    fellGroesse: uniform(0.06),
    glimmerWesen: uniform(0.6),
    glimmerFarbe: uniform(new Vector3(...farbRolle(colors.glimmer ?? GLIMMER_STANDARD, stil).base)),
    zeit: uniform(0),
    teilAn: uniform(0),
  };
}

/** 1 × 1-Platzhalter für den Zonen-Atlas (außerhalb aller Zonen). */
function leereAtlasTextur(): DataTexture {
  return atlasTextur(new Float32Array([-1, -1, -1, 1]), 1, 1);
}

/** Atlas-Textur aus Float-Daten (RGBA je Texel): Half-Float (in WebGPU filterbar), linear zwischen den Texelmitten, keine Mipmaps. */
export function atlasTextur(daten: Float32Array, breite: number, hoehe: number): DataTexture {
  const halb = new Uint16Array(daten.length);
  for (let i = 0; i < daten.length; i++) halb[i] = halbFloat(daten[i]!);
  const t = new DataTexture(halb, breite, hoehe, RGBAFormat, HalfFloatType);
  t.magFilter = LinearFilter;
  t.minFilter = LinearFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
}

const halbPuffer = new ArrayBuffer(4);
const halbFloat32 = new Float32Array(halbPuffer);
const halbUint32 = new Uint32Array(halbPuffer);
/** IEEE-754 Half-Float (wie three `DataUtils.toHalfFloat`, ohne Abhängigkeit). */
function halbFloat(x: number): number {
  halbFloat32[0] = Math.min(65504, Math.max(-65504, x));
  const f = halbUint32[0]!;
  const vorzeichen = (f >> 16) & 0x8000;
  let exp = ((f >> 23) & 0xff) - 127 + 15;
  let mant = f & 0x7fffff;
  if (exp <= 0) {
    if (exp < -10) return vorzeichen;
    mant = (mant | 0x800000) >> (1 - exp);
    return vorzeichen | ((mant + 0x1000) >> 13);
  }
  if (exp >= 31) return vorzeichen | 0x7c00;
  mant = mant + 0x1000;
  if (mant & 0x800000) {
    mant = 0;
    exp++;
    if (exp >= 31) return vorzeichen | 0x7c00;
  }
  return vorzeichen | (exp << 10) | (mant >> 13);
}

export function applyStil(u: CreatureMaterialUniforms, stil: WesenStil, colors: CreatureColors): void {
  lightDirFromStil(stil, u.lightDir.value);
  u.stufen.value = stil.stufen;
  u.federung.value = stil.federung;
  u.verlauf.value = stil.verlauf;
  u.rim.value = stil.rim;
  u.korn.value = stil.korn;
  u.glimmer.value = stil.glimmer;
  u.bodenlicht.value = stil.bodenlicht;
  u.kanten.value = stil.kanten;
  setTriple(u.grund, colors.grund, stil);
  setTriple(u.bauch, colors.bauch, stil);
  setTriple(u.muster, colors.muster, stil);
  setTriple(u.akzent, colors.akzent, stil);
  setTriple(u.lippe, colors.lippe, stil);
  setTriple(u.rachen, colors.rachen, stil);
  u.auge.value.set(...farbRolle(colors.auge, stil).base);
  u.nase.value.set(...farbRolle(colors.nase ?? '#2a2226', stil).base);
  u.zonenFarbe.forEach((t, i) => setTriple(t, colors.zonen?.[i] ?? ZONE_STANDARD, stil));
  u.glimmerFarbe.value.set(...farbRolle(colors.glimmer ?? GLIMMER_STANDARD, stil).base);
}

/** Wertrauschen im Körperraum (dreilinear interpoliert, 0…1). */
function valueNoise(p: Vec3Node): FloatNode {
  const i = floor(p);
  const f = fract(p);
  const u = f.mul(f).mul(float(3).sub(f.mul(2)));
  const h = (ox: number, oy: number, oz: number): FloatNode => hash3(i.add(vec3(ox, oy, oz)));
  const x00 = mix(h(0, 0, 0), h(1, 0, 0), u.x);
  const x10 = mix(h(0, 1, 0), h(1, 1, 0), u.x);
  const x01 = mix(h(0, 0, 1), h(1, 0, 1), u.x);
  const x11 = mix(h(0, 1, 1), h(1, 1, 1), u.x);
  const y0 = mix(x00, x10, u.y);
  const y1 = mix(x01, x11, u.y);
  return mix(y0, y1, u.z);
}

/**
 * Wertstufen mit Verlauf innen: x (0…1) → Stufenwert (0…1). `stufen` Stufen, Kanten um `federung` weich,
 * innerhalb jeder Stufe ein Verlauf mit Anteil `verlauf` (Florians Regel: Verlauf nur in der Stufe, nie über die Kante
 * hinweg — hier ist die Kante selbst weich, wie in den gemalten Bögen).
 */
function stepShade(x: FloatNode, stufen: FloatNode, federung: FloatNode, verlauf: FloatNode): FloatNode {
  const S1 = max(stufen.sub(1), 1);
  const g = clamp(x, 0, 0.9999).mul(S1);
  const i = floor(g);
  const t = g.sub(i);
  const inner = t.sub(0.5).mul(verlauf).div(S1);
  const level = i.div(S1).add(inner);
  // weiche Kante zur nächsten Stufe
  const f = federung.mul(0.5).add(0.01);
  const wUp = smoothstep(float(1).sub(f), float(1), t);
  const nextLevel = i.add(1).div(S1).add(float(-0.5).mul(verlauf).div(S1));
  const wDown = float(1).sub(smoothstep(float(0), f, t));
  const prevLevel = i.sub(1).div(S1).add(float(0.5).mul(verlauf).div(S1));
  const up = mix(level, nextLevel, wUp.mul(0.5));
  const down = mix(level, prevLevel, wDown.mul(0.5));
  return clamp(mix(up, down, wDown), 0, 1);
}

/**
 * Ein Tupfer je Zelle (Körperraum): Mitte gestreut in der inneren Hälfte der Zelle, Radius ≤ ¼ Zelle — der Tupfer bleibt
 * in seiner Zelle, eine Zelle reicht. Die Kante glättet über die Bildschirmgröße der Zelle (stetig, kein Sprung an der
 * Zellgrenze) und um `weich` des Radius (gemalt statt gestanzt); Zellen kleiner als ≈ 3 Pixel blenden aus (Mittelwert
 * statt Flimmern auf dem Brett). Liefert Maske und einen Zufallswert der Zelle.
 */
function tupfer(p: Vec3Node, seed: number, rMin: number, rMax: number, weich: number): { m: FloatNode; h: FloatNode } {
  const cell = floor(p);
  const f = fract(p);
  const h = hash3(cell.add(vec3(seed * 17, seed * 31, seed * 7)));
  const c = vec3(fract(h.mul(17.13)), fract(h.mul(97.71)), fract(h.mul(311.7))).mul(0.5).add(0.25);
  const rad = mix(float(rMin), float(rMax), fract(h.mul(53.9)));
  const dist = length(f.sub(c));
  const px = abs(fwidth(p.x)).add(abs(fwidth(p.y))).add(abs(fwidth(p.z))).mul(0.6);
  const kante = max(px, rad.mul(weich));
  const m = float(1).sub(smoothstep(rad.sub(kante), rad.add(kante), dist));
  const lod = float(1).sub(smoothstep(0.22, 0.45, px));
  return { m: m.mul(lod), h };
}

export interface CreatureMaterialOptionen {
  /** Ruhelage aus dem Attribut `eeRest` statt `positionGeometry` (CPU-posierte Netze im Editor: Muster, Zonen, Augen und Korn bleiben bei Posen stehen). */
  ruheAttribut?: boolean;
  /**
   * Gemalte Augen mit Formen und Zuständen (Phase 2 M5, `augenFormen.ts`): Augenrahmen mit Rechts-Achse, Schlitz/Knopf/
   * Mandel offen, zu, Sichel, X, Spirale, Schlitz; Kanten über `fwidth`. Ohne die Option das bisherige Schlitzauge (Spiel).
   */
  augenFormen?: boolean;
}

export function createCreatureMaterial(u: CreatureMaterialUniforms, optionen: CreatureMaterialOptionen = {}): MeshBasicNodeMaterial {
  const material = new MeshBasicNodeMaterial();
  material.name = 'ee-wesen';
  material.fog = false;
  // Verschluss-Morph: nach dem Skinning (positionLocal ist dann die gehäutete Position) die geschlossene Lage addieren
  material.positionNode = Fn(() => {
    const pucker = attribute('eePucker', 'vec3') as Vec3Node;
    return (positionLocal as unknown as Vec3Node).add(pucker.mul(u.spitzmund));
  })();
  material.colorNode = Fn(() => {
    const spine = attribute('eeSpine', 'vec4') as Vec4Node;
    const region = attribute('eeRegion', 'vec4') as Vec4Node;
    const extra = attribute('eeExtra', 'vec4') as Vec4Node;
    // Teil-Koordinate (Beine −t, Schwanz +t) für Socken und Schwanzspitze; ohne Attribut 0
    const teil = (attribute('eeTeil', 'float') as FloatNode).mul(u.teilAn).toVar();
    const ao = extra.x;
    const crease = extra.z;
    // Unterlippenseite (1 unten) als eigener Kanal — blendet an den Mundwinkeln weich, zeichnet nirgends eine Linie
    const unten = clamp(extra.w, 0, 1);
    const rest = (optionen.ruheAttribut ? (attribute('eeRest', 'vec3') as Vec3Node) : (positionGeometry as unknown as Vec3Node)).toVar();
    const H = u.bodyScale;
    // An scharfen Kanten (Maullinie, Augenwulst, Standkante) die Facettennormale nehmen: die Kante bleibt im Licht sichtbar
    const flatN = normalize(cross(dFdx(positionView as unknown as Vec3Node), dFdy(positionView as unknown as Vec3Node)));
    // nur dort, wo Schärfe gewollt ist (Maul, Lippen, Augenhöhlen) — Teilübergänge am Körper bleiben weich (Florian: „Linien
    // müssen ganz weich ineinander übergehen“)
    // Maulkante und Tasche haben eigene Vertices (Lippenschnitt) — Facettennormalen nur noch an echten Feldkanten (Braue)
    const kantenZone = clamp(region.w.mul(1.5), 0, 1);
    const N = normalize(mix(normalize(normalView as unknown as Vec3Node), flatN, smoothstep(0.55, 0.9, crease).mul(u.kanten).mul(kantenZone))).toVar();
    const V = normalize(positionView.negate() as unknown as Vec3Node).toVar();
    const L = u.lightDir;
    const ndl = dot(N, L);
    // Wrap-Diffuse: weicher Terminator wie gemalt; Bodenkontakt dunkelt die Unterseite
    const wrap = clamp(ndl.mul(0.5).add(0.5).sub(0.12).div(0.76), 0, 1).toVar();
    const bottom = float(1).sub(smoothstep(0, 0.22, rest.y.div(H)));
    wrap.assign(wrap.sub(bottom.mul(u.bodenlicht).mul(0.22)));
    // Höhlung: Falten liegen tiefer
    wrap.assign(clamp(wrap.sub(ao.mul(0.35)), 0, 1));
    const v = stepShade(wrap, u.stufen, u.federung, u.verlauf).toVar();
    // Kernschatten: ein etwas tieferes Band knapp hinter dem Terminator (gemalte Rundung), Reflexlicht darunter leicht heller
    const core = smoothstep(0.18, 0.3, wrap).mul(float(1).sub(smoothstep(0.3, 0.46, wrap))).mul(0.14);
    v.assign(clamp(v.sub(core), 0, 1));
    // Hell oben, dunkel unten (feste Blobs in den Bögen): Höhenverlauf unabhängig von der Normale
    const heightT = smoothstep(0, 1, rest.y.div(H));
    v.assign(clamp(v.add(heightT.sub(0.5).mul(0.22)), 0, 1));
    // Gemaltes Fell (Bogen Fell-Reihe, Plan 8.4): versetzte Reihen flammenförmiger Büschel in Wirbelsäulen-Koordinaten
    // (s längs, θ·Umfang quer), je Büschel dunkler Ansatz und helle Spitze, Rand weich; wirkt auf den Schattenwert, nicht
    // auf die Farbe, bleibt in Ruhelage stehen und kostet keine Geometrie (Spiel-Budget).
    const fellZelle = max(u.fellGroesse.mul(H), 0.001);
    const fs = spine.x.div(fellZelle);
    const fq = spine.y.mul(spine.z).div(fellZelle).div(6.2832);
    const reihe = floor(fs);
    const versetzt = fq.add(fract(reihe.mul(0.5)));
    const zelleX = floor(versetzt);
    const lx = fract(versetzt).sub(0.5);
    const ly = fract(fs);
    const jitA = hash3(vec3(zelleX, reihe, 7)).toVar();
    const jitB = hash3(vec3(zelleX, reihe, 13)).toVar();
    const lxj = lx.add(jitA.sub(0.5).mul(0.3));
    // Büschelform: unten breit, oben spitz (Flamme), Spitze bei ly ≈ 1
    const breite = float(0.5).mul(float(1).sub(smoothstep(0.55, 1.05, ly))).add(0.08);
    const fellInnen = float(1).sub(smoothstep(breite.mul(0.6), breite, abs(lxj)));
    const fellWert = fellInnen.mul(ly.sub(0.35)).mul(1.1).add(jitB.sub(0.5).mul(0.18));
    v.assign(clamp(v.add(fellWert.mul(u.fellStaerke)), 0, 1));

    // --- Grundfläche als Farbrolle (Schatten, Grund, Licht): Grund → Bauch → helle Schnauze → Zonen -----------------
    // Alle Flächen werden erst gemischt und dann einmal schattiert: Schuppenrelief und Rim nehmen so die Farbe der Fläche,
    // auf der sie liegen (heller Bauch bleibt hell, Zonenfarbe bleibt Zonenfarbe)
    const tS = vec3(u.grund.schatten).toVar();
    const tB = vec3(u.grund.base).toVar();
    const tL = vec3(u.grund.licht).toVar();
    const mischen = (t: Vec3Triple, w: FloatNode): void => {
      tS.assign(mix(tS, t.schatten, w));
      tB.assign(mix(tB, t.base, w));
      tL.assign(mix(tL, t.licht, w));
    };
    // Bauchlinie: weich-harte gemalte Grenze, leicht gewellt (kein Flecken-Jitter)
    const bellyWave = valueNoise(rest.div(H).mul(3.2)).sub(0.5).mul(0.12);
    const belly = smoothstep(u.bauchlinie.add(0.12), u.bauchlinie.sub(0.12), spine.w.add(bellyWave)).mul(u.bauchStaerke);
    mischen(u.bauch, belly);
    // Helle Schnauze (Bild 9): Bauchfarbe um Maul und Augen über die Gesichtsmaske, weich auslaufend
    mischen(u.bauch, smoothstep(0.15, 0.75, region.z).mul(u.gesichtHell));
    // Zonen (Bild 17): Farbflächen mit gemalter Grenze; jede Zone sagt, ob das Muster sie meidet, überläuft, in ihrem Ton
    // weiterläuft oder nur in ihr liegt
    // als Variable vor den Zonen: Werte, die mehrere `If`-Zweige nutzen, sonst nur im ersten berechnet (Falle in muster.ts)
    const nRuhe = normalize(normalGeometry as unknown as Vec3Node).toVar();
    const kontext = {
      rest,
      normal: nRuhe,
      spine,
      bodyScale: H,
      teil,
      eyePos: u.eyePos as unknown as { element(i: number): Vec4Node },
      eyeUp: u.eyeUp as unknown as { element(i: number): Vec4Node },
      eyeCount: max(u.eyeCount, u.ringCount).toVar(),
      zittern: u.musterU.zittern,
      seed: u.musterU.seed,
    };
    const erlaubt = float(1).toVar();
    const nurAn = float(0).toVar();
    const nurMaske = float(0).toVar();
    const pS = vec3(u.muster.schatten).toVar();
    const pB = vec3(u.muster.base).toVar();
    const pL = vec3(u.muster.licht).toVar();
    // Zonen-Atlas (Plan 8.2): signierter Abstand und Weichheit je Zone aus den Kacheln; harte Kanten pixelscharf über
    // die Ableitung, weiche über die gerasterte Weichheit (hart → weich entlang einer Form)
    const atlasUV = attribute('eeAtlas', 'vec2');
    const aAbstand = (u.atlasAbstand.sample(atlasUV) as unknown as Vec4Node).toVar();
    const aWeich = (u.atlasWeich.sample(atlasUV) as unknown as Vec4Node).toVar();
    const atlasAn = u.atlasAn.greaterThan(0.5);
    for (let i = 0; i < ZONEN_ANZAHL; i++) {
      const sdf = (i === 0 ? aAbstand.x : i === 1 ? aAbstand.y : aAbstand.z) as FloatNode;
      const wZ = (i === 0 ? aWeich.x : i === 1 ? aWeich.y : aWeich.z) as FloatNode;
      const w = max(wZ, fwidth(sdf));
      const mAtlas = smoothstep(w.negate(), w, sdf);
      const m = select(atlasAn, mAtlas, zonenMaske(u.zonen, i, kontext)).toVar();
      const zt = u.zonenFarbe[i]!;
      mischen(zt, m);
      const modus = u.zonen.modus[i]!;
      const da = select(u.zonen.form[i]!.x.greaterThan(0.5), float(1), float(0));
      // frei: die Zone bleibt reine Farbe
      erlaubt.assign(erlaubt.mul(float(1).sub(m.mul(select(modus.lessThan(0.5), float(1), float(0))))));
      // nur / nurTon: Muster nur in dieser Zone (mehrere solche Zonen zählen zusammen)
      const istNur = select(modus.greaterThan(2.5), float(1), float(0)).mul(da);
      nurAn.assign(max(nurAn, istNur));
      nurMaske.assign(max(nurMaske, m.mul(istNur)));
      // ton / nurTon: das Muster liegt in der Zone eine Stufe dunkler als die Zonenfarbe (Bauchplatten, Schuppen im Band)
      const istTon = select(abs(modus.sub(2)).lessThan(0.5).or(abs(modus.sub(4)).lessThan(0.5)), float(1), float(0)).mul(m);
      pS.assign(mix(pS, zt.schatten.mul(0.72), istTon));
      pB.assign(mix(pB, zt.schatten, istTon));
      pL.assign(mix(pL, zt.base, istTon));
    }
    erlaubt.assign(erlaubt.mul(mix(float(1), nurMaske, nurAn)));
    const shadeT = (s3: Vec3Node, b3: Vec3Node, l3: Vec3Node, vv: FloatNode): Vec3Node => mix(mix(s3, b3, smoothstep(0, 0.5, vv)), l3, smoothstep(0.5, 1, vv));
    const shadeOf = (t: Vec3Triple): Vec3Node => shadeT(t.schatten, t.base, t.licht, v);
    const skin = shadeT(tS, tB, tL, v).toVar();

    // Musterebene: Masken in Wirbelsäulen-Koordinaten, Gesicht/Lippen/Rachen frei; Relief dunkelt die Stufe je Schuppe ab
    // Lippenband: Abstand zur Maulkante (Körpereinheiten, region.y) gegen die Bandbreite, pixelscharf über die Ableitung
    const bandW = u.lippenBand;
    const distK = region.y.mul(H);
    // Glättungsbreite aus der Ableitung, aber höchstens eine halbe Bandbreite: ein Sprung im Abstand darf nie als Linie leuchten
    const aa = min(abs(dFdx(distK)).add(abs(dFdy(distK))), bandW.mul(0.5)).add(0.0005);
    const band = float(1).sub(smoothstep(bandW.sub(aa), bandW.add(aa), distK)).mul(step(0.001, bandW)).mul(mix(float(1), u.lippenBandUnten, unten));
    const innen = step(0.25, region.x);
    const frei = float(1).sub(region.z.mul(0.9)).mul(float(1).sub(band)).mul(float(1).sub(innen));
    const mu = musterMasks(u.musterU, spine, rest, H, frei.mul(erlaubt));
    const vRelief = clamp(v.sub(mu.relief.mul(0.12)), 0, 1);
    skin.assign(mix(skin, shadeT(tS, tB, tL, vRelief), abs(mu.relief).mul(0.9)));
    skin.assign(mix(skin, shadeT(pS, pB, pL, vRelief), mu.mask));
    skin.assign(mix(skin, shadeT(u.akzent.schatten, u.akzent.base, u.akzent.licht, vRelief), mu.akzent));

    // Rim zur Lichtseite (kein Umriss: nur dort, wo die Fläche zum Licht kippt), in der Lichtfarbe der Fläche darunter
    const fres = pow(float(1).sub(clamp(dot(N, V), 0, 1)), 3);
    const rimMask = fres.mul(smoothstep(-0.1, 0.5, dot(N, L))).mul(u.rim);
    skin.assign(mix(skin, tL.mul(1.08), rimMask));

    // --- Korn und Glimmer (Bild 18 oben; Look-Vertrag 5 und 12) -----------------------------------------------------
    // Feste Grundblobs wirken wie mit Glimmer bestäubt: dichtes feines Korn im Körperraum (wandert nicht), das mit der
    // Bildschirmgröße skaliert — zwei benachbarte Oktaven Wertrauschen, gemischt wie Mipmaps, sodass ein Korn nah wie fern
    // ≈ 3 Pixel groß ist. In den Lichtern mehr helle, im Schatten mehr dunkle Körner (getupfter Verlauf). Mit Glimmer wird
    // die Lichtseite warm bei fast gleicher Helligkeit (Lila → Rosa, Türkis → Gelbgrün), helle Körner warm, dunkle kühl,
    // und wenige hellere Funken funkeln langsam (eigene Phase, 9–25 s) mit eigener kleiner Neigung: dreht sich das Wesen,
    // wandern sie durchs Lichtband. Ohne Glimmer bleibt das neutrale Papierkorn (Stil „Korn“).
    const gS = clamp(u.glimmer.mul(u.glimmerWesen).mul(2), 0, 1.5);
    const lichtBand = smoothstep(0.55, 0.98, wrap);
    const lumW = vec3(0.2126, 0.7152, 0.0722);
    const lumHaut = dot(skin, lumW);
    const warmCol = u.glimmerFarbe.mul(lumHaut.div(max(dot(u.glimmerFarbe, lumW), 1e-3))).mul(1.06);
    skin.assign(mix(skin, warmCol, lichtBand.mul(gS).mul(0.38)));
    // Gegenstück zum warmen Licht: die Schattenseite kühlt ins Blaue (Bild 18: Lila → Blauviolett, Türkis → Blautürkis)
    const kuehl = vec3(0.32, 0.42, 0.9);
    const kuehlCol = kuehl.mul(lumHaut.div(dot(kuehl, lumW)));
    skin.assign(mix(skin, kuehlCol, float(1).sub(smoothstep(0.15, 0.6, wrap)).mul(gS).mul(0.22)));
    const kP = rest.div(H);
    const proPixel = max(length(fwidth(kP)).mul(0.7), 1e-5);
    const stufeK = log2(max(float(1).div(proPixel.mul(3 * 60)), 1));
    const s0 = floor(stufeK);
    const sf = stufeK.sub(s0);
    const f0 = exp2(s0).mul(60);
    const n0 = valueNoise(kP.mul(f0).add(vec3(1.7, 9.2, 4.4))).sub(0.5);
    const n1 = valueNoise(kP.mul(f0.mul(2)).add(vec3(5.3, 2.1, 8.8))).sub(0.5);
    const kornLod = smoothstep(1.1, 1.9, float(1).div(proPixel.mul(f0)));
    const kn = mix(n0, n1, sf).div(sqrt(sf.mul(sf).add(float(1).sub(sf).mul(float(1).sub(sf)))));
    // Ton verschiebt das Gleichgewicht: im Licht mehr helle Körner, im Schatten mehr dunkle
    const kornWert = clamp(kn.mul(3.2).add(v.sub(0.5).mul(0.9)), -1, 1).mul(kornLod);
    const wolke = valueNoise(kP.mul(7)).sub(0.5);
    skin.assign(skin.mul(float(1).add(kornWert.mul(u.korn.mul(0.16).add(gS.mul(0.085)))).add(wolke.mul(u.korn.mul(0.07)))));
    skin.assign(mix(skin, warmCol.mul(1.12), max(kornWert, 0).mul(gS).mul(0.3).mul(lichtBand.mul(0.6).add(0.4))));
    skin.assign(mix(skin, tS.mul(0.92), max(kornWert.negate(), 0).mul(gS).mul(0.2)));
    const fl = tupfer(kP.mul(38), 7.1, 0.05, 0.11, 0.55);
    const schwelle = float(0.55).add(fract(fl.h.mul(71.3)).mul(0.45));
    const funkeln = sin(u.zeit.mul(mix(float(0.25), float(0.7), fract(fl.h.mul(13.7)))).add(fl.h.mul(40))).mul(0.5).add(0.5);
    const kipp = vec3(fract(fl.h.mul(3.7)), fract(fl.h.mul(5.3)), fract(fl.h.mul(7.9))).sub(0.5).mul(0.9);
    const glanz = pow(clamp(dot(normalize(N.add(kipp)), normalize(L.add(V))), 0, 1), 6);
    const funke = smoothstep(schwelle, schwelle.add(0.08), lichtBand.mul(mix(float(0.6), float(1), funkeln)).add(glanz.mul(0.3).mul(lichtBand)));
    skin.assign(mix(skin, mix(u.glimmerFarbe, vec3(1), 0.35).mul(1.08), fl.m.mul(funke).mul(clamp(gS, 0, 1)).mul(0.9)));

    // Regionen: Lippe (Wulst), Rachen (dunkel nach innen), Augenhöhle (etwas tiefer)
    const lip = shadeOf(u.lippe);
    skin.assign(mix(skin, lip, band.mul(float(1).sub(innen))));
    // Tasche: flache, satte Rachenfarbe, nach hinten (Tiefe = region.x 0,5…1) dunkler — nie schwarz (Bild 5/11/14)
    const tiefeT = clamp(region.x.sub(0.5).mul(2), 0, 1);
    const throatCol = mix(shadeOf(u.rachen), u.rachen.schatten.mul(0.6), tiefeT.mul(0.7));
    // Zahnfleisch (Bild 11): heller, rosiger Saum innen am Rand, aus dem die Zähne wachsen; weich in den Rachen
    const gumCol = mix(shadeOf(u.lippe), shadeOf(u.rachen), 0.35);
    const gum = float(1).sub(smoothstep(0.08, 0.2, tiefeT));
    skin.assign(mix(skin, mix(throatCol, gumCol, gum), innen));
    skin.assign(skin.mul(float(1).sub(region.w.mul(0.12))));

    // Schlitzaugen: Pille auf der Fläche (Körperraum), Blinzeln staucht senkrecht
    const eyeMask = float(0).toVar();
    for (let i = 0; i < MAX_SLIT_EYES; i++) {
      const ep = (u.eyePos as unknown as { element(i: number): Vec4Node }).element(i);
      const eu = (u.eyeUp as unknown as { element(i: number): Vec4Node }).element(i);
      const active = smoothstep(float(i).sub(0.5), float(i).add(0.5), u.eyeCount.sub(0.5)).mul(min(ep.w.mul(1000), 1));
      if (optionen.augenFormen) {
        // Augenrahmen: x längs der Rechts-Achse, y längs der Oben-Achse (Einheit halbe Größe); Tiefe längs der Normalen
        // begrenzt, damit die Form bei dünnen Körpern nicht auf die Rückseite durchschlägt
        const er = (u.eyeRechts as unknown as { element(i: number): Vec4Node }).element(i);
        const ef = (u.eyeForm as unknown as { element(i: number): Vec4Node }).element(i);
        const dA = rest.sub(ep.xyz);
        const hsA = max(ep.w.mul(0.5), 1e-6);
        const xv = dot(dA, er.xyz).div(hsA);
        const yv = dot(dA, eu.xyz).div(hsA);
        const tiefe = abs(dot(dA, cross(er.xyz, eu.xyz))).div(hsA);
        const offen = max(float(1).sub(u.blink).mul(eu.w), 0.08);
        const distA = augenFormAbstand(xv, yv, ef.x, ef.y, ef.z, offen, u.augenZeit.mul(2.4));
        const aaA = fwidth(distA).mul(0.8).add(1e-4);
        const vorn = float(1).sub(smoothstep(0.5, 0.75, tiefe));
        eyeMask.assign(max(eyeMask, float(1).sub(smoothstep(aaA.negate(), aaA, distA)).mul(vorn).mul(active)));
        continue;
      }
      const d = rest.sub(ep.xyz);
      const up = eu.xyz;
      const dy = dot(d, up);
      const dxz = d.sub(up.mul(dy));
      const dx = dxz.length();
      const hs = ep.w.mul(0.5);
      const open = max(float(1).sub(u.blink).mul(eu.w), 0.08);
      const rr = vec2(dx.div(hs.mul(0.42)), dy.div(hs.mul(open)));
      const dist = pow(pow(abs(rr.x), 2.6).add(pow(abs(rr.y), 2.6)), float(1).div(2.6)).sub(1);
      const px = float(0.08);
      eyeMask.assign(max(eyeMask, float(1).sub(smoothstep(px.negate(), px, dist)).mul(active)));
    }
    // Nasenspiegel und Scharte aus Abständen im Ruheraum (pixelscharf wie die Schlitzaugen): Nase als Scheibe in Nasenfarbe,
    // die Scharte als Strich von der Lippenspitze zur Nase (Bild 8/9: W mit Verbindung zur Nase)
    const nDist = rest.sub(u.naseMitte.xyz).length();
    const nR = u.naseMitte.w;
    const naseRund = float(1).sub(smoothstep(nR.mul(0.94), nR.mul(1.06), nDist));
    // Dreiecksnase (Kastenmaul): Oberkante an der Mitte, Spitze nach unten; Kanten pixelscharf über eine feste Federung
    const dN = rest.sub(u.naseMitte.xyz);
    const yv = dot(dN, u.naseOben.xyz);
    const xv = dot(dN, u.naseRechts.xyz);
    const hN = max(u.naseOben.w, 0.0001);
    const eOben = yv.sub(u.bodyScale.mul(0.01));
    const eUnten = yv.negate().sub(hN);
    const eSeite = abs(xv).sub(nR.mul(clamp(float(1).add(yv.div(hN)), 0, 1)));
    const aaN = u.bodyScale.mul(0.006);
    const nah = step(nDist, nR.mul(2.2));
    const naseDreieck = float(1).sub(smoothstep(aaN.negate(), aaN, max(eOben, max(eUnten, eSeite)))).mul(nah);
    const naseMask = mix(naseRund, naseDreieck, step(0.0001, u.naseOben.w)).mul(u.gesichtAn);
    const pa = u.philtrumA.xyz, pb = u.philtrumB;
    const abv = pb.sub(pa);
    const tt = clamp(dot(rest.sub(pa), abv).div(max(dot(abv, abv), 1e-6)), 0, 1);
    const lDist = rest.sub(pa.add(abv.mul(tt))).length();
    const lw = u.philtrumA.w;
    const linie = float(1).sub(smoothstep(lw, lw.mul(1.6), lDist)).mul(u.gesichtAn);
    skin.assign(mix(skin, mix(skin, u.nase, 0.8), linie));
    skin.assign(mix(skin, u.nase, naseMask));
    skin.assign(mix(skin, u.auge, eyeMask));
    // Höhlenring (Bild 10/11): dunkler, kühler Ring auf der Haut rund um den Augapfel, aus dem Abstand zum Augenzentrum
    // im Ruheraum — unabhängig von der Netzdichte, Kanten per Abstand weich
    const ringMask = float(0).toVar();
    for (let i = 0; i < MAX_SLIT_EYES; i++) {
      const ep = (u.eyePos as unknown as { element(i: number): Vec4Node }).element(i);
      const active = smoothstep(float(i).sub(0.5), float(i).add(0.5), u.ringCount.sub(0.5)).mul(min(ep.w.mul(1000), 1));
      const r = ep.w.div(2.2);
      const dist = rest.sub(ep.xyz).length();
      const innen2 = smoothstep(r.mul(0.9), r.mul(1.02), dist);
      const aussen2 = float(1).sub(smoothstep(r.mul(1.25).add(r.mul(0.25).mul(u.ringStaerke)), r.mul(1.4).add(r.mul(0.3).mul(u.ringStaerke)), dist));
      ringMask.assign(max(ringMask, innen2.mul(aussen2).mul(active)));
    }
    const ringCol = skin.mul(0.32).add(vec3(0.03, 0.02, 0.05));
    skin.assign(mix(skin, ringCol, ringMask.mul(clamp(u.ringStaerke.mul(1.6), 0, 1))));
    return vec4(skin, 1);
  })();
  material.transparent = false;
  material.depthWrite = true;
  return material;
}

/** Lider: Hautfarbe mit den Stufen des Körpers (Kappen aus Körpermaterial über dem Augapfel, Blinzeln in jeder Tiefe). */
export function createLidMaterial(u: CreatureMaterialUniforms): MeshBasicNodeMaterial {
  const material = new MeshBasicNodeMaterial();
  material.name = 'ee-lid';
  material.fog = false;
  material.colorNode = Fn(() => {
    const N = normalize(normalView as unknown as Vec3Node);
    const wrap = dot(N, u.lightDir).mul(0.5).add(0.5);
    const v = stepShade(wrap, u.stufen, u.federung, u.verlauf);
    const col = mix(mix(u.grund.schatten, u.grund.base, smoothstep(0, 0.5, v)), u.grund.licht, smoothstep(0.5, 1, v));
    return vec4(col.mul(0.97), 1);
  })();
  return material;
}

/** Flaches Material für Zähne (hell an der Spitze, warmer Schatten am Ansatz) — nutzt `eeTooth` (0 Ansatz … 1 Spitze). */
export function createToothMaterial(u: CreatureMaterialUniforms, zahnHex: string): MeshBasicNodeMaterial {
  const f = farbRolle(zahnHex, STIL_STANDARD);
  const material = new MeshBasicNodeMaterial();
  material.name = 'ee-zahn';
  material.fog = false;
  const base = uniform(new Vector3(...f.base));
  const dark = uniform(new Vector3(...f.schatten));
  const light = uniform(new Vector3(...f.licht));
  // Farbe zur Laufzeit setzbar (`setzeZahnFarbe`), ohne das Material neu zu erzeugen
  material.userData.zahnFarbe = { base, dark, light };
  material.colorNode = Fn(() => {
    const t = attribute('eeTooth', 'float') as FloatNode;
    const N = normalize(normalView as unknown as Vec3Node);
    const wrap = dot(N, u.lightDir).mul(0.5).add(0.5);
    const v = stepShade(wrap, u.stufen, u.federung, u.verlauf);
    // Bild 5/11: Beige am Ansatz, zur Spitze hin heller (fast weiß); Schattenseite warm-dunkel
    const grad = mix(base, light, smoothstep(0.15, 0.95, t));
    const col = mix(mix(dark, grad, 0.55), grad, smoothstep(0.1, 0.7, v));
    return vec4(col, 1);
  })();
  return material;
}

/**
 * Zahnfarbe zur Laufzeit (Phase 2 M4, Plan 5.3): eine Farbe für alle Zähne, Wurzel = Farbe, Spitze heller, Schattenseite
 * dunkler und kühler (Farbrollen in OKLab wie beim Körper). Setzt nur die Uniforms von `createToothMaterial`.
 */
export function setzeZahnFarbe(material: MeshBasicNodeMaterial, zahnHex: string): void {
  const u = material.userData.zahnFarbe as { base: { value: Vector3 }; dark: { value: Vector3 }; light: { value: Vector3 } } | undefined;
  if (!u) return;
  const f = farbRolle(zahnHex, STIL_STANDARD);
  u.base.value.set(...f.base);
  u.dark.value.set(...f.schatten);
  u.light.value.set(...f.licht);
}

/** Zunge: rosa mit hellem Mittelband. */
export function createTongueMaterial(u: CreatureMaterialUniforms, zungeHex: string): MeshBasicNodeMaterial {
  const f = farbRolle(zungeHex, STIL_STANDARD);
  const material = new MeshBasicNodeMaterial();
  material.name = 'ee-zunge';
  material.fog = false;
  const base = uniform(new Vector3(...f.base));
  const dark = uniform(new Vector3(...f.schatten));
  const light = uniform(new Vector3(...f.licht));
  material.colorNode = Fn(() => {
    const N = normalize(normalView as unknown as Vec3Node);
    const wrap = dot(N, u.lightDir).mul(0.5).add(0.5);
    const v = stepShade(wrap, u.stufen, u.federung, u.verlauf);
    const rest = positionGeometry as unknown as Vec3Node;
    const band = float(1).sub(smoothstep(0.05, 0.2, abs(rest.x)));
    const col = mix(mix(dark, base, smoothstep(0, 0.5, v)), light, smoothstep(0.5, 1, v).mul(0.6).add(band.mul(0.3)));
    return vec4(col, 1);
  })();
  return material;
}
