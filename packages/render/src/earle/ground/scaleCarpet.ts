import { Vector3 } from 'three/webgpu';
import { abs, atan, clamp, cos, dot, float, floor, fract, fwidth, length, max, mix, normalize, positionWorld, select, sin, smoothstep, step, uniform, vec2 } from 'three/tsl';
import type { FloatNode, PaletteLookup, Vec3Node } from '../tsl';
import { curvedLightWorld, earleLight } from '../lightCurvature';

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

/** Frequenz f auf die nächste in 700 periodische runden (die Musterkoordinaten laufen modulo 700). */
function k700(f: number): number {
  return (Math.round((f * 700) / (Math.PI * 2)) * Math.PI * 2) / 700;
}
/** Kantenlänge der Farbflecken (Ebene 7: rote und hellgrüne Büsche), Teiler von 700. */
const PATCH = 700 / 200;

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
 *
 * `decor` 0..1 (je Fragment, z. B. aus der Bodenbehandlung): 0 = Ebene 20 (Punkte nur zur Sonne, im Hanglicht), 1 =
 * Schuppenbüsche aus Ebene 7 — ganze Punktbögen und ein innerer Bogen wie Fischschuppen, leuchtend unabhängig vom Licht
 * (Zierrat auf der fast schwarzen Wand), dazu feine helle Linien, die in Bündeln den Steilhang hinablaufen.
 */
export function createScaleCarpet(lookup: PaletteLookup, row: FloatNode, po: Vec3Node, normal: Vec3Node, decor: FloatNode = float(0), accentRow: FloatNode | null = null): ScaleCarpet {
  const sunDir = uniform(new Vector3(0.6, 0.2, -0.3));
  // Ebene 7: anderthalbmal so große Schuppen (die Büsche sind im Bild größer); 2400/1.5 und 4200/1.5 bleiben ganzzahlig
  const zoom = mix(float(1), float(1.5), decor);
  // Reihen schwingen leicht (keine schnurgeraden Zeilen): Versatz längs z mit x (in der 700er-Koordinate, dann skaliert)
  const px = po.x.div(zoom);
  const pz = po.z.div(zoom);
  const pzw = po.z.add(sin(po.x.mul(k700(0.6))).mul(0.075)).add(sin(po.x.mul(k700(1.5)).add(1.7)).mul(0.035)).div(zoom);
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
  // Licht des Hangs (flache Sonne, mit der Lichtkugel gekrümmt wie die Bänder des Geländes): 0 auf der abgewandten
  // Seite, 1 auf sonnigen Hängen
  const ndl = dot(normalize(normal), curvedLightWorld(normalize(sunDir as unknown as Vec3Node), positionWorld as unknown as Vec3Node, earleLight.bands)) as unknown as FloatNode;
  const slopeLit = smoothstep(0.05, 0.45, ndl);
  // Punktbogen: 13 Punkte auf dem oberen Halbkreis knapp innerhalb der Kante; sichtbar nur zur Sonne hin
  const arcStep = Math.PI / 13;
  const ak = floor(a.add(c.h.mul(arcStep)).div(arcStep)).add(0.5).mul(arcStep).sub(c.h.mul(arcStep));
  const onArc = abs(ak).lessThan(Math.PI * 0.62);
  const qx = sin(ak).mul(c.r.mul(0.84));
  const qz = cos(ak).mul(c.r.mul(0.84)).negate();
  const dRim = length(vec2(dx.sub(qx), dz.sub(qz)));
  const toward = dot(vec2(sin(ak), cos(ak).negate()), sunN) as unknown as FloatNode;
  // Bogenstück zur Sonne (Busch für Busch etwas anders lang), im Hanglicht wachsend
  const arcLit = mix(smoothstep(float(0.05).add(c.h.mul(0.35)), float(0.55).add(c.h.mul(0.3)), toward), float(1), decor);
  // Ebene 20: auch im Schatten des Hangs tragen die Büsche zur Sonne einen Punktrand (kleiner, gedämpft)
  const grow = mix(arcLit.mul(float(0.62).add(slopeLit.mul(0.38))), float(0.85), decor);
  // einzelne Punkte fehlen (gebrochene Bögen wie gemalt)
  const keep = fract(sin(ak.mul(17.3).add(c.h.mul(113.0))).mul(4375.5)).lessThan(0.82);
  const rimRad = float(0.068 * CARPET_CELL).mul(grow);
  const rim = smoothstep(rimRad.add(fw), rimRad.sub(fw), dRim)
    .mul(clamp(rimRad.div(fw), 0, 1))
    .mul(select(onArc.and(keep), float(1), float(0)));
  // Innere Punkte: einzelne Tüpfel im oberen Busch (Blumenkohlröschen), nur im Hanglicht
  const step2 = Math.PI / 6;
  const ak2 = floor(a.add(c.h.mul(1.7)).div(step2)).add(0.5).mul(step2).sub(c.h.mul(1.7));
  const keep2 = fract(sin(ak2.mul(13.1).add(c.h.mul(91.0))).mul(4375.5)).lessThan(mix(float(0.45), float(0.95), decor));
  const q2x = sin(ak2).mul(c.r.mul(0.5));
  const q2z = cos(ak2).mul(c.r.mul(0.5)).negate();
  const d2 = length(vec2(dx.sub(q2x), dz.sub(q2z)));
  const rad2 = float(0.04 * CARPET_CELL).mul(mix(float(0.45).add(slopeLit.mul(0.55)), float(0.8), decor));
  const inner = smoothstep(rad2.add(fw), rad2.sub(fw), d2)
    .mul(clamp(rad2.div(fw), 0, 1))
    .mul(select(keep2.and(abs(ak2).lessThan(Math.PI * 0.5)), float(1), float(0)));
  // Lichtlinien (Ebene 7): Bündel feiner Linien längs x (auf dem Hang neben dem Pfad die Falllinie), gestrichelt, nur an
  // steilen Stellen. Linienabstand 700/1600, Bündel aus drei bis fünf Linien (periodisch in 700)
  const period = 700 / 1600;
  const sc = po.z.div(period);
  const si = floor(sc);
  const bundle = floor(si.div(9));
  const bh = fract(sin(bundle.mod(97).mul(12.9898).add(7.1)).mul(43758.5453));
  const sh = fract(sin(si.mod(89).mul(78.233).add(1.3)).mul(43758.5453));
  const inBundle = select(bh.lessThan(0.4).and(si.sub(bundle.mul(9)).lessThan(float(3).add(floor(bh.mul(5.0))))), float(1), float(0));
  const dash = smoothstep(0.0, 0.06, fract(po.x.mul(0.11).add(sh))).mul(smoothstep(0.9, 0.82, fract(po.x.mul(0.11).add(sh))));
  const toLine = abs(fract(sc).sub(0.5)).mul(period);
  const fwl = max(fwidth(po.x), fwidth(po.z)).max(1e-5);
  const lw = float(0.01).add(fwl.mul(0.4));
  const steep = smoothstep(0.86, 0.62, normalize(normal).y);
  const streak = smoothstep(lw.add(fwl), lw.sub(fwl), toLine).mul(inBundle).mul(dash).mul(steep).mul(decor);
  // aus der Ferne (Zellen unter ≈ 5 px) ausblenden: kein Flimmern, die Hänge bleiben dunkle Masse
  const visible = smoothstep(5.0, 10.0, float(CARPET_CELL).div(fw));
  const lit = lookup.pal(5, row).rgb as unknown as Vec3Node;
  const mid = lookup.pal(4, row).rgb as unknown as Vec3Node;
  const dim = mix(lookup.pal(2, row).rgb, lookup.pal(3, row).rgb, 0.5) as unknown as Vec3Node;
  // Bogenpunkte: im vollen Licht die hellste Stufe, sonst eine darunter; innere Punkte gedämpft
  let rimCol = mix(mix(dim, mid, arcLit), lit, smoothstep(0.3, 0.8, slopeLit.mul(arcLit))) as unknown as Vec3Node;
  let innerCol = dim;
  let streakCol = mid;
  if (accentRow) {
    // Ebene 7: der Zierrat hat eigene Farben (Akzent 0 helles Cyan, 2 Türkis) — die Terrainzeile bleibt frei für das
    // Gelände (ihr heller Ton ist der Nebelpfad)
    rimCol = mix(rimCol, lookup.pal(0, accentRow).rgb as unknown as Vec3Node, decor) as unknown as Vec3Node;
    innerCol = mix(innerCol, lookup.pal(2, accentRow).rgb as unknown as Vec3Node, decor) as unknown as Vec3Node;
    streakCol = mix(streakCol, lookup.pal(2, accentRow).rgb as unknown as Vec3Node, decor) as unknown as Vec3Node;
    // Farbflecken (Ebene 7): in einzelnen Feldern tragen die Büsche rote bzw. hellgrüne Bögen (Akzent 6/7 bzw. 4/5);
    // Feldgrenzen gewellt, Feld für Feld gezogen
    const qx = po.x.add(sin(po.z.mul(k700(0.8))).mul(0.9));
    const qz = po.z.add(sin(po.x.mul(k700(0.7)).add(1.3)).mul(0.9));
    const fx = floor(qx.div(PATCH));
    const fz = floor(qz.div(PATCH));
    const ph = fract(sin(fx.mod(97).mul(12.9898).add(fz.mod(89).mul(78.233)).add(3.1)).mul(43758.5453));
    const red = step(ph, 0.1).mul(decor);
    const lime = step(0.1, ph).mul(step(ph, 0.17)).mul(decor);
    const redLit = mix(lookup.pal(6, accentRow).rgb, lookup.pal(7, accentRow).rgb, c.h.mul(0.6)) as unknown as Vec3Node;
    const limeLit = mix(lookup.pal(4, accentRow).rgb, lookup.pal(5, accentRow).rgb, c.h.mul(0.6)) as unknown as Vec3Node;
    rimCol = mix(mix(rimCol, redLit, red), limeLit, lime) as unknown as Vec3Node;
    innerCol = mix(mix(innerCol, lookup.pal(6, accentRow).rgb as unknown as Vec3Node, red), lookup.pal(4, accentRow).rgb as unknown as Vec3Node, lime) as unknown as Vec3Node;
  }
  const isRim = rim.greaterThan(inner);
  // Ebene 7: nicht jeder Busch trägt Bögen (dunkle Lücken zwischen den Schuppenbüschen); Ebene 20: Buschfelder und
  // glatte dunkle Hangflächen im Wechsel (großräumige Maske, periodisch in 700)
  const field = float(0.5)
    .add(sin(po.x.mul(k700(0.21)).add(po.z.mul(k700(0.13))).add(1.3)).mul(0.28))
    .add(sin(po.z.mul(k700(0.37)).sub(po.x.mul(k700(0.09))).add(4.1)).mul(0.22))
    .add(sin(po.x.mul(k700(0.61)).add(2.7)).mul(0.12));
  const fieldOn = mix(smoothstep(0.34, 0.42, field), float(1), decor);
  const bushOn = mix(float(1), step(0.28, fract(c.h.mul(7.13))), decor).mul(fieldOn);
  const dots = max(rim, inner.mul(0.8)).mul(bushOn);
  const mask = max(dots.mul(visible), streak.mul(smoothstep(2.0, 5.0, float(period).div(fw))));
  const color = select(streak.greaterThan(dots), streakCol, select(isRim, rimCol, innerCol)) as unknown as Vec3Node;
  // Schattenseite: Ebene 20 gedämpft; Ebene 7 leuchtet der Zierrat auch auf der abgewandten Wand
  const shadowColor = mix(dim, color, decor.mul(0.85)) as unknown as Vec3Node;
  return { mask, color, shadowColor, sunDir: sunDir as unknown as { value: Vector3 } };
}
