import type { Vector3 } from 'three/webgpu';
import { clamp, float, floor, fract, max, mix, select, sin, smoothstep, sqrt, step, vec2 } from 'three/tsl';
import type { FloatNode, PaletteLookup, TSLUniform, Vec3Node } from '../tsl';
import { cellHash, octaves, quarterRotate } from './firCarpet';

/**
 * Kronendach als Bodenornament (Welt 02, Bild 02 = Ebene 49): von oben gesehen ist der Wald ein Teppich runder Kronen,
 * dicht an dicht wie Blumenkohl — jede Krone eine kleine Kuppel, zur Sonne mit einer hellen, fein getüpfelten Kappe,
 * auf der abgewandten Seite und in den Lücken fast schwarzgrün (der dunkle Waldboden). Die nähere Reihe liegt vorn. Nach
 * hinten bleiben die Kronen als Buckel lesbar (Earle zeichnet die fernen Hügel in Blau mit denselben Kronen): die
 * Kronen wachsen in Oktaven mit dem Abstand, zwei Oktaven werden weich überblendet.
 *
 * Gitter in Ebenenkoordinaten (Zeichenkoordinaten wie der Tannenteppich, nach der Blickrichtung um Viertel gedreht),
 * periodisch in 700. Reines ALU ohne Ableitungen: läuft im Zweig der Welt mit Kronendach.
 */

/** Zellbreite und Reihenabstand der feinsten Oktave (Teiler von 700). */
export const CROWN_CELL = 700 / 2000;
export const CROWN_ROW = 700 / 2800;
/** Bildschirmgröße einer Zelle als Anteil der Bildhöhe, ab der die nächste Oktave übernimmt. */
const TARGET_FRACTION = 0.018;
const MAX_LEVEL = 3;

export interface CanopyCarpetOptions {
  /** Ebenenposition (x, z modulo 700). */
  po: Vec3Node;
  /** Sonnenrichtung in der Ebene (geteilt mit dem Buschteppich, je Frame nachgeführt). */
  sunDir: { value: Vector3 } & Vec3Node;
  /** Welteinheiten je Bildpunkt (außerhalb des Zweigs aus `fwidth`). */
  fw: FloatNode;
  /** Tiefe des Fragments vor der Kamera. */
  depth: FloatNode;
  /** Projektionsmaßstab der Kamera (je Frame). */
  projScale: TSLUniform;
  /** Viertel der Blickrichtung (je Frame). */
  quarter: FloatNode;
}

/** Deckung der Kronenkappe 0..1 und ihr Ton (0 = Mittelgrün, 1 = Licht, 2 = Tüpfel). */
export interface CanopyCarpetMask {
  mask: FloatNode;
  tone: FloatNode;
}

interface Crown {
  inside: FloatNode;
  cover: FloatNode;
  tone: FloatNode;
  /** Mitte längs z (die nähere Krone liegt vorn). */
  cz: FloatNode;
}

function crownGlyph(px: FloatNode, pz: FloatNode, j: FloatNode, neighbour: boolean, fw: FloatNode, sx: FloatNode, sy: FloatNode, sz: FloatNode, salt: number): Crown {
  const cw = CROWN_CELL;
  const rh = CROWN_ROW;
  // Reihen gegeneinander zufällig verschoben (kein Wabenraster)
  const off = cellHash(j, float(7), salt + 3).mul(cw);
  const u = px.sub(off).div(cw);
  // eigene Zelle oder die nähere Nachbarzelle der Reihe (die Kronen überlappen seitlich)
  const i = neighbour ? floor(u).add(select(fract(u).lessThan(0.5), float(-1), float(1))) : floor(u);
  const h = cellHash(i, j, salt);
  const h2 = fract(h.mul(31.7).add(0.37));
  const h3 = fract(h.mul(17.3).add(0.71));
  const h4 = fract(h.mul(11.9).add(0.53));
  // Größe: großräumig gestreut (Gruppen großer und kleiner Kronen) und je Krone
  const field = sin(i.mul(0.37).add(j.mul(0.21)).add(salt)).mul(0.5).add(sin(i.mul(0.11).sub(j.mul(0.29)).add(1.7)).mul(0.5));
  const size = clamp(float(0.84).add(h2.mul(0.28)).add(field.mul(0.14)), 0.62, 1.16);
  const r = float(cw * 0.6).mul(size);
  const cx = i.add(0.5).add(h.sub(0.5).mul(0.2)).mul(cw).add(off);
  const cz = j.add(0.5).add(h3.sub(0.5).mul(0.3)).mul(rh);
  const dx = px.sub(cx).div(r);
  const dz = pz.sub(cz).div(r.mul(0.9));
  const d2 = dx.mul(dx).add(dz.mul(dz));
  const aa = fw.div(r).mul(1.5);
  // einzelne Lücken im Dach (der dunkle Waldboden scheint durch)
  const present = step(0.08, h4);
  const inside = step(d2, 1).mul(present);
  const edge = smoothstep(float(1).add(aa), float(1).sub(aa), sqrt(d2)).mul(present);
  // Kuppelnormale (Zeichenraum: x rechts, y oben, z zur Kamera) gegen die Sonne
  const up = sqrt(max(float(0), float(1).sub(d2)));
  const ndl = dx.mul(sx).add(up.mul(sy).mul(1.6)).add(dz.mul(sz));
  // Kappe: zwei harte Stufen (Mittelgrün, Licht) mit 1-px-Kante; Gruppen heller und dunkler
  const bias = field.mul(0.12).add(h2.sub(0.5).mul(0.1));
  const midT = float(0.16).sub(bias);
  const litT = float(0.46).sub(bias);
  const mid = smoothstep(midT.sub(aa), midT.add(aa), ndl);
  const lit = smoothstep(litT.sub(aa), litT.add(aa), ndl);
  // Tüpfel in der Kappe: Unterraster der Krone, je Zelle ein Punkt mit Zufallslage
  const gx = floor(dx.mul(2.2));
  const gz = floor(dz.mul(2.2));
  const gh = fract(h.mul(53.1).add(gx.mul(0.173)).add(gz.mul(0.311)));
  const gh2 = fract(gh.mul(41.3).add(0.5));
  const ox = gx.add(0.25).add(gh.mul(0.5)).div(2.2);
  const oz = gz.add(0.25).add(gh2.mul(0.5)).div(2.2);
  const dd = vec2(dx.sub(ox), dz.sub(oz)).length();
  const rd = float(0.11);
  const dot = smoothstep(rd.add(aa), rd.sub(aa), dd).mul(step(gh2, 0.7)).mul(mid);
  const cover = max(mid, dot).mul(edge);
  const tone = select(dot.greaterThan(0.5), float(2), lit);
  return { inside, cover, tone, cz };
}

/** Eine Oktave: von vorn nach hinten die erste Krone, die den Punkt enthält (drei Reihen, je zwei Spalten). */
function crownOctave(px: FloatNode, pz: FloatNode, scale: FloatNode, fw: FloatNode, sx: FloatNode, sy: FloatNode, sz: FloatNode): { cover: FloatNode; tone: FloatNode } {
  const qx = px.div(scale);
  const qz = pz.div(scale);
  const fwq = fw.div(scale);
  const j0 = floor(qz.div(CROWN_ROW));
  let cz: FloatNode = float(-1e9);
  let cover: FloatNode = float(0);
  let tone: FloatNode = float(0);
  for (const dj of [-1, 0, 1]) {
    for (const neighbour of [true, false]) {
      const c = crownGlyph(qx, qz, j0.add(dj), neighbour, fwq, sx, sy, sz, 0);
      const take = c.inside.greaterThan(0.5).and(c.cz.greaterThan(cz));
      cz = select(take, c.cz, cz);
      cover = select(take, c.cover, cover);
      tone = select(take, c.tone, tone);
    }
  }
  return { cover, tone };
}

export function canopyCarpetMask(o: CanopyCarpetOptions): CanopyCarpetMask {
  const [gx, gz] = quarterRotate(o.quarter, o.po.x, o.po.z);
  const [sgx, sgz] = quarterRotate(o.quarter, o.sunDir.x as unknown as FloatNode, o.sunDir.z as unknown as FloatNode);
  const sy = o.sunDir.y as unknown as FloatNode;
  const { s0, s1, t } = octaves(o.depth, o.projScale, CROWN_CELL, TARGET_FRACTION, MAX_LEVEL);
  const a = crownOctave(gx, gz, s0, o.fw, sgx, sy, sgz);
  const b = crownOctave(gx, gz, s1, o.fw, sgx, sy, sgz);
  const mask = clamp(mix(a.cover, b.cover, t), 0, 1);
  const tone = select(a.cover.mul(float(1).sub(t)).greaterThan(b.cover.mul(t)), a.tone, b.tone);
  return { mask, tone };
}

/** Farben aus der Kronenzeile der Welt: Stufe 3 Mittelgrün, 4 Licht, 5 Tüpfel; im Schatten eine Stufe tiefer. */
export function canopyCarpetColors(lookup: PaletteLookup, row: FloatNode, tone: FloatNode): { color: Vec3Node; shadowColor: Vec3Node } {
  const mid = lookup.pal(3, row).rgb as unknown as Vec3Node;
  const lit = lookup.pal(4, row).rgb as unknown as Vec3Node;
  const dot = lookup.pal(5, row).rgb as unknown as Vec3Node;
  const color = mix(mix(mid, lit, clamp(tone, 0, 1)), dot, clamp(tone.sub(1), 0, 1)) as unknown as Vec3Node;
  const deep = lookup.pal(2, row).rgb as unknown as Vec3Node;
  const shadowColor = mix(deep, mid, clamp(tone.sub(1), 0, 1).mul(0.6)) as unknown as Vec3Node;
  return { color, shadowColor };
}
