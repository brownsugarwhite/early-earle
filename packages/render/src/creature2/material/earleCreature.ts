import { Vector3, Vector4 } from 'three';
import { MeshBasicNodeMaterial, type UniformNode } from 'three/webgpu';
import { abs, attribute, clamp, cross, dFdx, dFdy, dot, float, floor, Fn, fract, hash, max, min, mix, normalize, normalView, positionGeometry, positionLocal, positionView, pow, sin, smoothstep, step, time, uniform, uniformArray, vec2, vec3, vec4 } from 'three/tsl';
import type { FloatNode, Vec3Node, Vec4Node } from '../../common/tsl';
import { STIL_STANDARD, farbRolle, type WesenStil } from './stil';
import { createMusterUniforms, musterMasks, type MusterUniforms } from './muster';

/**
 * Das Earle-Wesen-Material (erste Fassung, Look-Vertrag Regeln 1–5, 9, 10 teilweise, 12):
 * Figurenlicht im Blickraum (rechts oben), Wertstufen mit gefederten Kanten und Verlauf in der Stufe, farbige Schatten
 * (OKLab-Regel aus `stil.ts`), Rim zur Lichtseite, Bodenkontakt, Papierkorn im Körperraum, Rachen/Lippen/Höhlen aus den
 * Deskriptoren, Höhlung (AO) als Verdunklung in Falten, Glimmer für feste Blobs, Schlitzaugen mit Blinzeln.
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
  /** Bauch/Rücken-Grenze (−1…1 in der dorsalen Koordinate) und Weichheit. */
  bauchlinie: UniformNode<'float', number>;
  bauchStaerke: UniformNode<'float', number>;
  /** Schlitzaugen: Position (xyz) + Größe (w) im Körperraum; Rahmen: oben (xyz) + Blinzeln (w). */
  eyePos: ReturnType<typeof uniformArray>;
  eyeUp: ReturnType<typeof uniformArray>;
  eyeCount: UniformNode<'float', number>;
  blink: UniformNode<'float', number>;
  /** Gewicht des Verschluss-Morphs (1 = Maul zu). */
  verschluss: UniformNode<'float', number>;
  /** Breite des Lippenbands (Zahnfleisch) in Körpereinheiten, 0 = keins (Giraffe). */
  lippenBand: UniformNode<'float', number>;
  /** Gewicht des Spitzmund-Morphs (1 = Lochmaul ganz weit). */
  spitzmund: UniformNode<'float', number>;
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
}

export function createCreatureUniforms(colors: CreatureColors, stil: WesenStil = STIL_STANDARD, bodyScale = 1): CreatureMaterialUniforms {
  const eyePos = uniformArray(Array.from({ length: MAX_SLIT_EYES }, () => new Vector4(0, 0, 0, 0)), 'vec4');
  const eyeUp = uniformArray(Array.from({ length: MAX_SLIT_EYES }, () => new Vector4(0, 1, 0, 1)), 'vec4');
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
    bauchlinie: uniform(-0.2),
    bauchStaerke: uniform(0),
    eyePos,
    eyeUp,
    eyeCount: uniform(0),
    blink: uniform(0),
    verschluss: uniform(0),
    lippenBand: uniform(0),
    spitzmund: uniform(0),
  };
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
}

/** Wertrauschen im Körperraum (dreilinear interpoliert, 0…1). */
function valueNoise(p: Vec3Node): FloatNode {
  const i = floor(p);
  const f = fract(p);
  const u = f.mul(f).mul(float(3).sub(f.mul(2)));
  const h = (ox: number, oy: number, oz: number): FloatNode => hash(i.add(vec3(ox, oy, oz)).dot(vec3(1, 57, 113)));
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

export function createCreatureMaterial(u: CreatureMaterialUniforms): MeshBasicNodeMaterial {
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
    const extra = attribute('eeExtra', 'vec3') as Vec3Node;
    const ao = extra.x;
    const crease = extra.z;
    const rest = positionGeometry as unknown as Vec3Node;
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
    const bottom = float(1).sub(smoothstep(0, 0.22, rest.y.div(u.bodyScale)));
    wrap.assign(wrap.sub(bottom.mul(u.bodenlicht).mul(0.22)));
    // Höhlung: Falten liegen tiefer
    wrap.assign(clamp(wrap.sub(ao.mul(0.35)), 0, 1));
    const v = stepShade(wrap, u.stufen, u.federung, u.verlauf).toVar();
    // Kernschatten: ein etwas tieferes Band knapp hinter dem Terminator (gemalte Rundung), Reflexlicht darunter leicht heller
    const core = smoothstep(0.18, 0.3, wrap).mul(float(1).sub(smoothstep(0.3, 0.46, wrap))).mul(0.14);
    v.assign(clamp(v.sub(core), 0, 1));
    // Hell oben, dunkel unten (feste Blobs in den Bögen): Höhenverlauf unabhängig von der Normale
    const heightT = smoothstep(0, 1, rest.y.div(u.bodyScale));
    v.assign(clamp(v.add(heightT.sub(0.5).mul(0.22)), 0, 1));

    // Farbrolle Haut: Schatten → Grund → Licht; Bauchseite optional heller
    const shadeOf = (t: Vec3Triple): Vec3Node => mix(mix(t.schatten, t.base, smoothstep(0, 0.5, v)), t.licht, smoothstep(0.5, 1, v));
    const skin = shadeOf(u.grund).toVar();
    // Bauchlinie: weich-harte gemalte Grenze, leicht gewellt (kein Flecken-Jitter)
    const bellyWave = valueNoise(rest.div(u.bodyScale).mul(3.2)).sub(0.5).mul(0.12);
    const belly = smoothstep(u.bauchlinie.add(0.12), u.bauchlinie.sub(0.12), spine.w.add(bellyWave)).mul(u.bauchStaerke);
    skin.assign(mix(skin, shadeOf(u.bauch), belly));

    // Musterebene: Masken in Wirbelsäulen-Koordinaten, Gesicht/Lippen/Rachen frei; Relief dunkelt die Stufe je Schuppe ab
    // Lippenband: Abstand zur Maulkante (Körpereinheiten, region.y) gegen die Bandbreite, pixelscharf über die Ableitung
    const bandW = u.lippenBand;
    const distK = region.y.mul(u.bodyScale);
    const aa = abs(dFdx(distK)).add(abs(dFdy(distK))).add(0.0005);
    const band = float(1).sub(smoothstep(bandW.sub(aa), bandW.add(aa), distK)).mul(step(0.001, bandW));
    const innen = step(0.25, region.x);
    const frei = float(1).sub(region.z.mul(0.9)).mul(float(1).sub(band)).mul(float(1).sub(innen));
    const mu = musterMasks(u.musterU, spine, rest, u.bodyScale, frei);
    const vRelief = clamp(v.sub(mu.relief.mul(0.12)), 0, 1);
    const shadeOfV = (t: Vec3Triple, vv: FloatNode): Vec3Node => mix(mix(t.schatten, t.base, smoothstep(0, 0.5, vv)), t.licht, smoothstep(0.5, 1, vv));
    skin.assign(mix(skin, shadeOfV(u.grund, vRelief), abs(mu.relief).mul(0.9)));
    skin.assign(mix(skin, shadeOfV(u.muster, vRelief), mu.mask));
    skin.assign(mix(skin, shadeOfV(u.akzent, vRelief), mu.akzent));

    // Papierkorn im Körperraum (wandert nicht), nur in den Mitteltönen deutlich
    const grainP = rest.div(u.bodyScale).mul(38);
    const grain = valueNoise(grainP).sub(0.5).mul(0.7).add(valueNoise(grainP.mul(2.7)).sub(0.5).mul(0.3));
    const grainAmp = u.korn.mul(0.05).mul(float(1).sub(abs(v.sub(0.5)).mul(0.8)));
    skin.assign(skin.mul(float(1).add(grain.mul(grainAmp))));

    // Rim zur Lichtseite (kein Umriss: nur dort, wo die Fläche zum Licht kippt)
    const fres = pow(float(1).sub(clamp(dot(N, V), 0, 1)), 3);
    const rimMask = fres.mul(smoothstep(-0.1, 0.5, dot(N, L))).mul(u.rim);
    skin.assign(mix(skin, u.grund.licht.mul(1.08), rimMask));

    // Glimmer: spärliche Funken im Lichtband, langsam wandernd
    const sparkCell = floor(rest.div(u.bodyScale).mul(170).add(vec3(sin(time.mul(0.15)).mul(3), 0, 0)));
    const spark = smoothstep(0.992, 0.998, hash(sparkCell.dot(vec3(1, 57, 113)))).mul(smoothstep(0.6, 0.85, wrap)).mul(u.glimmer);
    skin.assign(skin.add(spark.mul(0.22)));

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
    skin.assign(mix(skin, u.auge, eyeMask));
    return vec4(skin, 1);
  })();
  material.transparent = false;
  material.depthWrite = true;
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
  material.colorNode = Fn(() => {
    const t = attribute('eeTooth', 'float') as FloatNode;
    const N = normalize(normalView as unknown as Vec3Node);
    const wrap = dot(N, u.lightDir).mul(0.5).add(0.5);
    const v = stepShade(wrap, u.stufen, u.federung, u.verlauf);
    const col = mix(dark, base, smoothstep(0.2, 0.8, v.mul(0.6).add(t.mul(0.5))));
    return vec4(col, 1);
  })();
  return material;
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
