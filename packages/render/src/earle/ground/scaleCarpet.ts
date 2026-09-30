import { Vector3 } from 'three/webgpu';
import { abs, atan, clamp, cos, dot, float, floor, fract, fwidth, length, max, mix, normalize, select, sin, smoothstep, uniform, vec2 } from 'three/tsl';
import type { FloatNode, PaletteLookup, Vec3Node } from '../tsl';

/**
 * Buschteppich als Bodenornament (Welten 11/12, Ebene 20 und Ebene 7): die Hänge sind mit dicht an dicht stehenden,
 * runden Büschen bedeckt, die sich wie Fischschuppen überlappen. Jede Reihe liegt vor der nächsten (die nähere Reihe
 * verdeckt den unteren Teil der ferneren); von jedem Busch sieht man einen dunklen Körper und zur Sonne einen kurzen,
 * feinen Punktbogen (Ebene 20: gelbgrün). Die Punkte wachsen mit dem Licht des Hangs: auf sonnigen Hängen dicht und hell
 * (die Kämme leuchten gepunktet), im Schatten nur vereinzelt und gedämpft, auf der abgewandten Seite gar nicht.
 *
 * Gitter in Ebenenkoordinaten (vorwärts = −z = „oben im Bild“), periodisch in 700 Einheiten (die Musterkoordinaten der
 * Karte laufen modulo 700): Zellbreite 700/2400, Reihenabstand 700/4200, jede zweite Reihe um eine halbe Zelle versetzt,
 * jeder Busch verschoben und in der Größe gestreut. Alles mit `fwidth` auf eine Pixelkante geglättet und ausgeblendet,
 * bevor es flimmert (nie Screen-Space): aus der Ferne bleiben die Hänge dunkle Masse.
 */

/** Zellbreite (Busch-Durchmesser ≈ 1.2 × Zellbreite) und Reihenabstand, beide Teiler von 700. */
export const CARPET_CELL = 700 / 2400;
export const CARPET_ROW = 700 / 4200;
/** Buschradius (Mittel) in Welteinheiten. */
const R = 0.6 * CARPET_CELL;

export interface ScaleCarpet {
  /** Maske 0..1 (Punkte). */
  mask: FloatNode;
  /** Farbe im Licht (hell zur Sonne, sonst gedämpft). */
  color: Vec3Node;
  /** Farbe auf der Schattenseite des Geländes (gedämpft). */
  shadowColor: Vec3Node;
  /** Sonnenrichtung in der Ebene (vom Besitzer je Frame nachgeführt). */
  sunDir: { value: Vector3 };
}

interface Candidate {
  cx: FloatNode;
  cz: FloatNode;
  r: FloatNode;
  d: FloatNode;
  h: FloatNode;
}

/** Hash einer Zelle (Indizes modulo kleiner Primzahlen: genau in f32, keine Streifen). */
function cellHash(i: FloatNode, j: FloatNode, salt: number): FloatNode {
  return fract(sin(i.mod(97).mul(12.9898).add(j.mod(89).mul(78.233)).add(salt)).mul(43758.5453));
}

/**
 * Buschteppich an der Ebenenposition `po` (x, z modulo 700) mit der Geländenormale `normal` (Ebene). Farben aus der
 * Terrainzeile `row`: helle Punkte Stufe 5, gedämpfte Punkte zwischen Stufe 2 und 3.
 */
export function createScaleCarpet(lookup: PaletteLookup, row: FloatNode, po: Vec3Node, normal: Vec3Node): ScaleCarpet {
  const sunDir = uniform(new Vector3(0.6, 0.2, -0.3));
  const px = po.x;
  const pz = po.z;
  // Reihen schwingen leicht (keine schnurgeraden Zeilen): Versatz längs z mit x
  const pzw = pz.add(sin(px.mul(0.9)).mul(0.05)).add(sin(px.mul(2.3).add(1.7)).mul(0.025));
  const j0 = floor(pzw.div(CARPET_ROW));
  /** Nächster Busch in Reihe j (x-Versatz jede zweite Reihe, Mitte und Größe je Busch gestreut). */
  const candidate = (dj: number): Candidate => {
    const j = j0.add(dj);
    const off = fract(j.mul(0.5)).mul(CARPET_CELL);
    const i = floor(px.sub(off).div(CARPET_CELL));
    const h = cellHash(i, j, 0);
    const h2 = fract(h.mul(31.7).add(0.37));
    const cx = i.add(0.5).add(h.sub(0.5).mul(0.3)).mul(CARPET_CELL).add(off);
    const cz = j.add(0.5).add(h2.sub(0.5).mul(0.34)).mul(CARPET_ROW);
    const r = float(R).mul(float(0.78).add(h2.mul(0.44)));
    const d = length(vec2(px.sub(cx), pzw.sub(cz)));
    return { cx, cz, r, d, h };
  };
  // Die nähere Reihe (größeres z) liegt vorn: erste Reihe, die den Punkt enthält, von vorn nach hinten
  const cands = [candidate(2), candidate(1), candidate(0), candidate(-1)];
  let c: Candidate = cands[3]!;
  for (let k = 2; k >= 0; k--) {
    const n = cands[k]!;
    const inside = n.d.lessThan(n.r);
    c = { cx: select(inside, n.cx, c.cx), cz: select(inside, n.cz, c.cz), r: select(inside, n.r, c.r), d: select(inside, n.d, c.d), h: select(inside, n.h, c.h) };
  }
  const dx = px.sub(c.cx);
  const dz = pzw.sub(c.cz);
  const a = atan(dx, dz.negate());
  const fw = max(fwidth(px), fwidth(pz)).max(1e-5);
  const sun2 = vec2(sunDir.x, sunDir.z);
  const sunN = sun2.div(length(sun2).max(1e-3));
  // Licht des Hangs (flache Sonne): 0 auf der abgewandten Seite, 1 auf sonnigen Hängen
  const ndl = dot(normalize(normal), normalize(sunDir as unknown as Vec3Node)) as unknown as FloatNode;
  const slopeLit = smoothstep(0.05, 0.45, ndl);
  // Punktbogen: 13 Punkte auf dem oberen Halbkreis knapp innerhalb der Kante; sichtbar nur zur Sonne hin
  const step = Math.PI / 13;
  const ak = floor(a.add(c.h.mul(step)).div(step)).add(0.5).mul(step).sub(c.h.mul(step));
  const onArc = abs(ak).lessThan(Math.PI * 0.62);
  const qx = sin(ak).mul(c.r.mul(0.84));
  const qz = cos(ak).mul(c.r.mul(0.84)).negate();
  const dRim = length(vec2(dx.sub(qx), dz.sub(qz)));
  const toward = dot(vec2(sin(ak), cos(ak).negate()), sunN) as unknown as FloatNode;
  // Bogenstück zur Sonne (Busch für Busch etwas anders lang), im Hanglicht wachsend
  const arcLit = smoothstep(float(0.05).add(c.h.mul(0.35)), float(0.55).add(c.h.mul(0.3)), toward);
  const grow = arcLit.mul(float(0.45).add(slopeLit.mul(0.55)));
  // einzelne Punkte fehlen (gebrochene Bögen wie gemalt)
  const keep = fract(sin(ak.mul(17.3).add(c.h.mul(113.0))).mul(4375.5)).lessThan(0.82);
  const rimRad = float(0.055 * CARPET_CELL).mul(grow);
  const rim = smoothstep(rimRad.add(fw), rimRad.sub(fw), dRim)
    .mul(clamp(rimRad.div(fw), 0, 1))
    .mul(select(onArc.and(keep), float(1), float(0)));
  // Innere Punkte: einzelne Tüpfel im oberen Busch (Blumenkohlröschen), nur im Hanglicht
  const step2 = Math.PI / 6;
  const ak2 = floor(a.add(c.h.mul(1.7)).div(step2)).add(0.5).mul(step2).sub(c.h.mul(1.7));
  const keep2 = fract(sin(ak2.mul(13.1).add(c.h.mul(91.0))).mul(4375.5)).lessThan(0.45);
  const q2x = sin(ak2).mul(c.r.mul(0.5));
  const q2z = cos(ak2).mul(c.r.mul(0.5)).negate();
  const d2 = length(vec2(dx.sub(q2x), dz.sub(q2z)));
  const rad2 = float(0.04 * CARPET_CELL).mul(float(0.45).add(slopeLit.mul(0.55)));
  const inner = smoothstep(rad2.add(fw), rad2.sub(fw), d2)
    .mul(clamp(rad2.div(fw), 0, 1))
    .mul(select(keep2.and(abs(ak2).lessThan(Math.PI * 0.5)), float(1), float(0)));
  // aus der Ferne (Zellen unter ≈ 5 px) ausblenden: kein Flimmern, die Hänge bleiben dunkle Masse
  const visible = smoothstep(5.0, 10.0, float(CARPET_CELL).div(fw));
  const lit = lookup.pal(5, row).rgb as unknown as Vec3Node;
  const mid = lookup.pal(4, row).rgb as unknown as Vec3Node;
  const dim = mix(lookup.pal(2, row).rgb, lookup.pal(3, row).rgb, 0.5) as unknown as Vec3Node;
  // Bogenpunkte: im vollen Licht die hellste Stufe, sonst eine darunter; innere Punkte gedämpft
  const rimCol = mix(mid, lit, smoothstep(0.3, 0.8, slopeLit.mul(arcLit)));
  const isRim = rim.greaterThan(inner);
  const mask = max(rim, inner.mul(0.8)).mul(visible);
  const color = select(isRim, rimCol, dim) as unknown as Vec3Node;
  const shadowColor = dim;
  return { mask, color, shadowColor, sunDir: sunDir as unknown as { value: Vector3 } };
}
