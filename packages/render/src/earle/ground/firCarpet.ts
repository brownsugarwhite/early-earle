import { Vector3 } from 'three/webgpu';
import { abs, clamp, dot, float, floor, fract, log2, max, min, mix, normalize, round, select, sin, smoothstep, step, uniform, vec2 } from 'three/tsl';
import type { FloatNode, PaletteLookup, TSLUniform, Vec3Node } from '../tsl';

/**
 * Tannenwald aus weißen Punkten als Bodenornament (Welt 06, Bild 06 = Ebene 10, Florians „Screenshot 5“): der dunkle
 * Waldboden ist dicht an dicht mit kleinen Tannen bedeckt, jede nur aus Punkten gezeichnet — ein schmales Dreieck aus
 * Punktreihen (Schnee auf den Zweigspitzen), die Spitze ein einzelner Punkt. Zur Sonne hin sind die Punkte weiß und
 * vollzählig, auf der abgewandten Seite blassblau und lückenhaft; auf sonnenabgewandten Hängen werden sie weniger und
 * matter, im Schlagschatten blassblau. Nach hinten bleiben die Tannen als Zeichen sichtbar (Earle malt die fernen Hügel
 * mit kleinen „^“-Marken in Reihen): die Zeichen wachsen in Oktaven mit dem Abstand, sodass sie auf dem Bildschirm
 * ähnlich groß bleiben, zwei Oktaven werden weich überblendet (kein Ploppen beim Schwenken).
 *
 * Gitter in Ebenenkoordinaten (vorwärts = −z = „oben im Bild“), periodisch in 700 (die Musterkoordinaten der Karte laufen
 * modulo 700): Zellbreite 700/2200, Reihenabstand 700/2600, jede zweite Reihe um eine halbe Zelle versetzt, jede Tanne
 * verschoben und in der Größe gestreut, einzelne Zellen leer. Die nähere Reihe liegt vorn (ihre Spitzen reichen in die
 * Reihe dahinter). Alles ALU; Ableitungen (`fw`) kommen von außen, damit die Funktion auch in einem Zweig läuft.
 */

/** Zellbreite und Reihenabstand der feinsten Oktave (Teiler von 700). */
export const FIR_CELL = 700 / 2200;
export const FIR_ROW = 700 / 2600;
/** Bildschirmgröße einer Zelle als Anteil der Bildhöhe, ab der die nächste Oktave übernimmt. */
const TARGET_FRACTION = 0.021;
/** Gröbste Oktave (2^3 = achtfach). */
const MAX_LEVEL = 3;

export interface FirCarpetOptions {
  /** Ebenenposition (x, z modulo 700). */
  po: Vec3Node;
  /** Geländenormale (Ebene). */
  normal: Vec3Node;
  /** Sonnenrichtung in der Ebene (vom Besitzer je Frame nachgeführt; geteilt mit dem Buschteppich). */
  sunDir: { value: Vector3 } & Vec3Node;
  /** Welteinheiten je Bildpunkt an der Stelle (aus `fwidth` der Ebenenposition, außerhalb eines Zweigs berechnet). */
  fw: FloatNode;
  /** Tiefe des Fragments vor der Kamera (Welteinheiten, > 0). */
  depth: FloatNode;
  /** Projektionsmaßstab der Kamera (`projectionMatrix.elements[5]`, je Frame nachgeführt). */
  projScale: TSLUniform;
  /**
   * Blickrichtung der Kamera in Vierteln (0 = längs −z, 1 = −x, 2 = +z, 3 = +x; je Frame nachgeführt): die Tannen stehen
   * im Bild aufrecht, auch im gedrehten Weltblick (Welt 06 blickt seitlich auf den Steilhang). Vierteldrehungen lassen
   * das Gitter periodisch in 700 — die Zeichen springen nur, wenn die Blickrichtung über 45° kippt.
   */
  quarter: FloatNode;
}

/** Maske der Punkte (0..1) und ihre Helligkeit (0 blass … 1 weiß). */
export interface FirCarpetMask {
  mask: FloatNode;
  light: FloatNode;
}

/** Hash einer Zelle (Indizes modulo kleiner Primzahlen: genau in f32). */
export function cellHash(i: FloatNode, j: FloatNode, salt: number): FloatNode {
  return fract(sin(i.mod(97).mul(12.9898).add(j.mod(89).mul(78.233)).add(salt)).mul(43758.5453));
}

interface Glyph {
  /** Maske 0..1 des nächsten Punkts. */
  dot: FloatNode;
  /** Helligkeit 0..1 des Punkts (0 blass, 1 weiß). */
  light: FloatNode;
  /** Liegt im Dreieck einer Tanne (deckt die Tanne dahinter ab). */
  inside: FloatNode;
}

/**
 * Tanne der Reihe `j` an der Stelle (px, pz) in der Oktave mit Zellbreite `cw` und Reihenabstand `rh`. `sunX` = Seite der
 * Sonne (+1 rechts, −1 links), `slopeLit` 0..1 = Licht des Hangs.
 */
function firGlyph(px: FloatNode, pz: FloatNode, j: FloatNode, cw: number, rh: number, fw: FloatNode, sunX: FloatNode, slopeLit: FloatNode, salt: number): Glyph {
  const off = fract(j.mul(0.5)).mul(cw);
  const i = floor(px.sub(off).div(cw));
  const h = cellHash(i, j, salt);
  const h2 = fract(h.mul(31.7).add(0.37));
  const h3 = fract(h.mul(17.3).add(0.71));
  const h4 = fract(h.mul(23.9).add(0.13));
  const size = float(0.66).add(h2.mul(0.5));
  const cx = i.add(0.5).add(h4.sub(0.5).mul(0.5)).mul(cw).add(off);
  // Fuß nahe der Unterkante der Zelle, Spitze nach vorn (−z) über die Reihe dahinter
  const zb = j.add(0.84).add(h3.sub(0.5).mul(0.3)).mul(rh);
  const H = float(rh * 1.18).mul(size);
  const W = float(cw * 0.46).mul(size);
  const halfW = W.mul(0.5);
  const u = px.sub(cx).div(halfW);
  const v = zb.sub(pz).div(H);
  // einzelne Zellen leer (Lichtungen), sonst stünde ein Raster
  const present = step(0.13, fract(h.mul(7.13).add(0.21)));
  const inside = step(0, v).mul(step(v, 1.04)).mul(step(abs(u), float(1).sub(v).add(0.1))).mul(present);
  // Rand: fünf Punkte je Seite längs der Kante, in Etagen leicht nach außen gesetzt (Zweigspitzen mit Schnee)
  const M = 5;
  const m = clamp(floor(v.mul(M)), 0, M - 1);
  const vm = m.add(0.38).div(M);
  const sideU = select(u.greaterThanEqual(0), float(1), float(-1));
  const um = float(1).sub(vm).mul(0.98).mul(sideU);
  const dEdge = vec2(u.sub(um).mul(halfW), v.sub(vm).mul(H)).length();
  // Etagenreihen innen: kurze Punktreihen in drei Höhen (eins bis drei Punkte), dazu die Spitze
  const T = 3;
  const tIdx = clamp(round(v.mul(T + 1).sub(0.6)), 0, T - 1);
  const vt = tIdx.add(0.6).div(T + 1);
  const hwT = float(1).sub(vt).mul(0.5);
  const nT = select(tIdx.lessThan(0.5), float(1), float(0));
  const kT = clamp(round(u.div(hwT.max(0.05))), nT.negate(), nT);
  const dTier = vec2(u.sub(kT.mul(hwT)).mul(halfW), v.sub(vt).mul(H)).length();
  const dApex = vec2(u.mul(halfW), v.sub(1.0).mul(H)).length();
  // nächster Punkt und seine Seite (+1 Sonnenseite, −1 Schattenseite, 0 Mitte)
  const edgeWins = dEdge.lessThan(dTier).and(dEdge.lessThan(dApex));
  const tierWins = dTier.lessThan(dApex).and(edgeWins.not());
  const d = min(dEdge, min(dTier, dApex));
  const side = select(edgeWins, sideU.mul(sunX), select(tierWins, kT.sign().mul(sunX).mul(0.6), float(0.4)));
  const idx = select(edgeWins, m.mul(2).add(sideU), select(tierWins, kT.add(tIdx.mul(3)).add(20), float(30)));
  // Sonnenseite vollzählig, Mitte meist, Schattenseite lückenhaft (je Punkt gehasht)
  const ph = fract(sin(idx.mul(13.1).add(h.mul(91.0)).add(salt)).mul(4375.5));
  const keepP = mix(float(0.35).add(slopeLit.mul(0.3)), float(1), smoothstep(-0.6, 0.6, side));
  const keep = step(ph, keepP);
  const rho = float(Math.min(cw, rh) * 0.062).mul(size).mul(float(0.85).add(slopeLit.mul(0.2)));
  const dot = smoothstep(rho.add(fw), rho.sub(fw), d).mul(clamp(rho.div(fw), 0, 1)).mul(keep).mul(inside);
  const light = clamp(side.mul(0.42).add(0.42).add(slopeLit.mul(0.3)).sub(0.08), 0, 1);
  return { dot, light, inside };
}

/** Eine Oktave: die Tanne der eigenen Reihe und die der näheren Reihe davor (deren Spitze hereinragt). */
function firOctave(px: FloatNode, pz: FloatNode, scale: FloatNode, fw: FloatNode, sunX: FloatNode, slopeLit: FloatNode): { dot: FloatNode; light: FloatNode } {
  // Oktave als Maßstab: Koordinaten verkleinern statt Zellen vergrößern (ganzzahlige Faktoren, periodisch in 700)
  const qx = px.div(scale);
  const qz = pz.div(scale);
  const fwq = fw.div(scale);
  const j0 = floor(qz.div(FIR_ROW));
  const back = firGlyph(qx, qz, j0, FIR_CELL, FIR_ROW, fwq, sunX, slopeLit, 0);
  const front = firGlyph(qx, qz, j0.add(1), FIR_CELL, FIR_ROW, fwq, sunX, slopeLit, 0);
  const useFront = front.inside.greaterThan(0.5);
  return { dot: select(useFront, front.dot, back.dot), light: select(useFront, front.light, back.light) };
}

/** Uniform für den Projektionsmaßstab (der Besitzer setzt `camera.projectionMatrix.elements[5]` je Frame). */
export function firProjScale(): TSLUniform {
  return uniform(2) as unknown as TSLUniform;
}

/** Viertel der Blickrichtung (siehe `FirCarpetOptions.quarter`) aus der Blickrichtung der Kamera in der Ebene. */
export function viewQuarter(forwardX: number, forwardZ: number): number {
  const yaw = Math.atan2(-forwardX, -forwardZ);
  return (((Math.round(yaw / (Math.PI / 2)) % 4) + 4) % 4);
}

/**
 * Punkte des Tannenteppichs: Maske und Helligkeit. Reines ALU ohne Ableitungen und Texturzugriffe — darf in einem
 * `If`-Zweig laufen (nur die Welt mit Tannenteppich bezahlt dafür).
 */
/** Ebenenkoordinaten (x, z) in Zeichenkoordinaten: x im Bild nach rechts, z zur Kamera (oben im Bild = −z), um Viertel `q` gedreht. */
export function quarterRotate(q: FloatNode, x: FloatNode, z: FloatNode): [FloatNode, FloatNode] {
  return [
    select(q.lessThan(0.5), x, select(q.lessThan(1.5), z.negate(), select(q.lessThan(2.5), x.negate(), z))),
    select(q.lessThan(0.5), z, select(q.lessThan(1.5), x, select(q.lessThan(2.5), z.negate(), x.negate()))),
  ];
}

/** Bezugstiefe (Welteinheiten), in der die Zelle eines Zeichenteppichs genau `target` der Bildhöhe groß ist. */
const OCTAVE_REFERENCE_DEPTH = 14;
/**
 * Perspektive der Zeichen: 0 = gleich groß im Bild in jeder Tiefe, 1 = gleich groß in der Welt (flimmert in der Ferne).
 * 0,5: die Bildgröße fällt mit 1/√Tiefe — vorn große Kronen und Tannen, hinten feine Marken (Bild 02, Bild 06).
 */
const OCTAVE_PERSPECTIVE = 0.5;

/**
 * Oktaven eines Zeichenteppichs aus dem Abstand: die Zelle (`cell` Welteinheiten in der feinsten Oktave) ist in der
 * Bezugstiefe etwa `target` der Bildhöhe groß, davor größer, dahinter kleiner (`OCTAVE_PERSPECTIVE`). Liefert die
 * Maßstäbe zweier Nachbaroktaven und ihre Überblendung (0 → s0, 1 → s1).
 */
export function octaves(depth: FloatNode, projScale: TSLUniform, cell: number, target: number, maxLevel: number): { s0: FloatNode; s1: FloatNode; t: FloatNode } {
  const k = 1 - OCTAVE_PERSPECTIVE;
  // Weltgröße der Zelle ∝ Tiefe^k, in der Bezugstiefe wie bei gleicher Bildgröße
  const ref = Math.log2(OCTAVE_REFERENCE_DEPTH);
  const atRef = log2(projScale.mul(cell).div(2 * target).max(1e-4).reciprocal()).add(ref);
  const level = clamp(log2(depth).sub(ref).mul(k).add(atRef), 0, maxLevel);
  const l0 = floor(level).min(maxLevel - 1);
  const t = smoothstep(0.55, 0.95, level.sub(l0));
  const s0 = float(2).pow(l0);
  return { s0, s1: s0.mul(2), t };
}

export function firCarpetMask(o: FirCarpetOptions): FirCarpetMask {
  // Zeichenkoordinaten: x im Bild nach rechts, z zur Kamera (oben im Bild = −z), um Viertel gedreht
  const [gx, gz] = quarterRotate(o.quarter, o.po.x, o.po.z);
  const [sx] = quarterRotate(o.quarter, o.sunDir.x as unknown as FloatNode, o.sunDir.z as unknown as FloatNode);
  const sunX = select(sx.greaterThanEqual(0), float(1), float(-1));
  const ndl = dot(normalize(o.normal), normalize(o.sunDir as unknown as Vec3Node)) as unknown as FloatNode;
  const slopeLit = smoothstep(-0.05, 0.4, ndl);
  // Oktave aus dem Abstand: eine Zelle soll etwa TARGET_FRACTION der Bildhöhe groß sein (unabhängig von DPR)
  const { s0, s1, t } = octaves(o.depth, o.projScale, FIR_CELL, TARGET_FRACTION, MAX_LEVEL);
  const a = firOctave(gx, gz, s0, o.fw, sunX, slopeLit);
  const b = firOctave(gx, gz, s1, o.fw, sunX, slopeLit);
  const mask = clamp(mix(a.dot, b.dot, t), 0, 1);
  const light = select(a.dot.mul(float(1).sub(t)).greaterThan(b.dot.mul(t)), a.light, b.light);
  return { mask, light };
}

/** Farben der Punkte aus der Kronenzeile der Welt (Stufe 4 blass, 6 hell, 7 weiß) nach ihrer Helligkeit. */
export function firCarpetColors(lookup: PaletteLookup, dotRow: FloatNode, light: FloatNode): { color: Vec3Node; shadowColor: Vec3Node } {
  const pale = lookup.pal(4, dotRow).rgb as unknown as Vec3Node;
  const bright = lookup.pal(6, dotRow).rgb as unknown as Vec3Node;
  const white = lookup.pal(7, dotRow).rgb as unknown as Vec3Node;
  const color = mix(mix(pale, bright, smoothstep(0.15, 0.55, light)), white, smoothstep(0.55, 0.9, light)) as unknown as Vec3Node;
  // im Schlagschatten blassblau und etwas zurückgenommen (die Tannen bleiben lesbar, Bild 06)
  const shadowColor = mix(pale, bright, min(light, float(0.35))) as unknown as Vec3Node;
  return { color, shadowColor };
}
