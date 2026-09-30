import { abs, attribute, clamp, exp, float, floor, fract, hash, max, mix, normalGeometry, positionGeometry, select, smoothstep, sqrt, step, vec2 } from 'three/tsl';
import { aaStep, stripeMask, type FloatNode, type PaletteLookup, type Vec3Node } from '../tsl';

/**
 * Roter Monolith (Ebene 45, Welt 13) im Fels-Material: Farbe der Lichtseite (die Tinte der Schattenseite bleibt beim
 * Earle-Material). Harte Siebdruckstufen aus der Felszeile der Welt (1 Tiefrot … 4 Glutrot, 7 Rosa), in jeder Stufe ein
 * eigener Verlauf nach innen (Irisdruck, nie über die Stufenkante):
 * - Schaft: unten heiß (Glutrot, rosa Glut auf der Schauseite), nach oben tiefes Rot bis Kastanie; zwei feine helle
 *   Risse; die abgewandten Rücksprünge sind Tinte (schwarze Streifen);
 * - Stufenwände und Gesims: Zahnfries — schwarze Keile hängen von der Oberkante, unterschiedlich lang und breit;
 * - Stufenbänke: Rosa bis Rot mit feinen Schichtlinien, darüber die langen schwarzen Tintenkeile, die vom Turmfuß
 *   nach vorn links über das Plateau laufen (die Flanke links liegt ganz in ihnen).
 *
 * Vertexdaten (siehe `buildRockGeometry`): Wände `rk = (Umfang, Höhenanteil, Code, Tiefe unter der Oberkante)`,
 * Deckflächen `rk = (a, b) / Fußabdruck, Code, Höhenanteil`.
 */
export interface MonolithShadingOptions {
  lookup: PaletteLookup;
  /** Felszeile der Welt. */
  row: FloatNode;
  /** Richtung zur Sonne (Ebene = flacher Raum). */
  sunDir: Vec3Node;
  /** 1 auf Stufenwänden und Gesims (Zahnfries), 0 auf dem Schaft. */
  isTier: FloatNode;
}

/** Mischung wie Druckfarbe (√-Raum): Verläufe von Tinte zu Hell ohne grellen Linear-Licht-Sprung. */
function mixInk(a: Vec3Node, b: Vec3Node, t: FloatNode): Vec3Node {
  const s = mix(sqrt(a.max(0)), sqrt(b.max(0)), t);
  return s.mul(s) as unknown as Vec3Node;
}

/** Tintenkeil von p0 in Richtung (dx, dz), Länge len, halbe Breite w0 → w1 (in Fußabdruck-Anteilen, (a, b)). */
function wedge(a: FloatNode, b: FloatNode, p0: [number, number], dir: [number, number], len: number, w0: number, w1: number): FloatNode {
  const l = Math.hypot(dir[0], dir[1]);
  const dx = dir[0] / l;
  const dz = dir[1] / l;
  const px = a.sub(p0[0]);
  const pz = b.sub(p0[1]);
  const t = px.mul(dx).add(pz.mul(dz));
  const e = abs(px.mul(dz).sub(pz.mul(dx)));
  const w = float(w0).add(clamp(t.div(len), 0, 1).mul(w1 - w0));
  // spitz auslaufendes Ende und abgerundeter Beginn am Turmfuß
  return aaStep(e, w).mul(aaStep(float(0), t)).mul(aaStep(t, float(len)));
}

export function monolithShading(o: MonolithShadingOptions): { wall: Vec3Node; cap: Vec3Node } {
  const rk = attribute('rk', 'vec4');
  const u = rk.x;
  const pal = (i: FloatNode | number): Vec3Node => o.lookup.pal(i, o.row).rgb as unknown as Vec3Node;
  const n = normalGeometry;
  const ndl = n.dot(o.sunDir);

  // --- Wände: Schaft, Gesims, Stufen ------------------------------------------------------------------------------
  const hRel = rk.y;
  const depth = rk.w;
  // Glut: rosa, im unteren Drittel der Schauseite (zur Kamera, +z), in senkrechten Pinselbahnen
  const lane = hash(floor(u.mul(2.3)).add(7.0));
  const glowH = exp(hRel.sub(0.3).div(0.19).mul(hRel.sub(0.3).div(0.19)).negate());
  const glow = glowH.mul(smoothstep(0.05, 0.75, n.z)).mul(float(0.55).add(lane.mul(0.45)));
  // Bandwert: Licht der Fläche + Höhenverlauf (unten heiß, oben tief) + Glut
  const v = ndl.mul(0.42).add(0.5).sub(hRel.mul(0.7)).add(glow.mul(0.34));
  const vb = clamp(v, 0, 0.999).mul(4);
  const i = floor(vb);
  const t = fract(vb);
  // Stufen 1–4 der Felszeile; über der obersten Stufe verläuft sie ins Rosa (7)
  const lo = pal(i.add(1));
  const hi = pal(select(i.lessThan(2.5), i.add(2), float(7)));
  let wall: Vec3Node = mixInk(lo, hi, t.mul(0.6));
  // zwei feine helle Risse auf der Schauseite
  const crackC = u.mul(0.42).add(0.23);
  const crack = stripeMask(crackC, 0.022).mul(step(hash(floor(crackC).add(3.0)), float(0.55))).mul(step(0.3, n.z)).mul(smoothstep(0.05, 0.2, hRel));
  wall = mix(wall, pal(7), crack.mul(0.8)) as unknown as Vec3Node;
  // Zahnfries an Stufen und Gesims (Tiefe > 0 nur dort sinnvoll: der Schaft hat Tiefe bis zur Krone, kaum Zähne)
  const rc = attribute('rc', 'vec4');
  const full = positionGeometry.y.add(depth).sub(rc.y).max(0.05);
  const tw = 0.58;
  const tc = u.div(tw);
  const cell = floor(tc);
  const fx = fract(tc);
  const h1 = hash(cell.mul(3.17).add(1.0));
  const h2 = hash(cell.mul(7.31).add(2.0));
  const has = step(h1, float(0.82));
  const len = full.mul(float(0.3).add(h2.mul(0.72))).min(1.35);
  const half = float(0.035).add(h1.mul(0.11)).mul(float(1).sub(depth.div(len)).max(0).pow(0.8));
  const tooth = aaStep(abs(fx.sub(0.5)), half).mul(step(depth, len)).mul(has).mul(o.isTier);
  wall = mix(wall, pal(0), tooth) as unknown as Vec3Node;

  // --- Stufenbänke: Rosa bis Rot, Schichtlinien, Tintenkeile ---------------------------------------------------------
  const a = rk.x;
  const b = rk.y;
  const capV = clamp(ndl.mul(0.9).sub(0.02).add(smoothstep(0.6, 0.08, vec2(a, b.mul(1.2)).length()).mul(0.34)), 0, 0.999).mul(3);
  const ci = floor(capV);
  const ct = fract(capV);
  // Stufen: Tiefrot (2) → Rot (3) → Bankrosa (5) → Glutrot (4); Zeilenindex rechnerisch (kein `select`)
  const loIdx = float(2).add(ci).add(step(1.5, ci).mul(1));
  const hiIdx = float(3).add(ci.mul(2)).sub(step(1.5, ci).mul(1));
  const capLo = pal(loIdx);
  const capHi = pal(hiIdx);
  let cap: Vec3Node = mixInk(capLo, capHi, ct.mul(0.55));
  // feine Schichtlinien quer zum Blick (Linien gleicher b), dunkler
  const strata = stripeMask(b.mul(38.0).add(abs(a).mul(1.3)), 0.07).mul(0.55);
  cap = mix(cap, pal(2), strata) as unknown as Vec3Node;
  // Tintenkeile vom Turmfuß nach vorn links (Maß: Anteile des Fußabdrucks ≈ 16·s)
  const k = 1 / 15.9;
  // Keile laufen fächerförmig vom Turmfuß (b ≈ 2,5) zur Plateaukante vorn links, ungleich breit und lang (Ebene 45:
  // lange Streifen, kurze Zacken dazwischen); der linke ist die Flanke im Schatten
  const flank = wedge(a, b, [-3.6 * k, 0.2 * k], [-0.72, 0.69], 15 * k, 0.9 * k, 2.6 * k);
  const w0 = wedge(a, b, [-2.5 * k, 1.8 * k], [-0.74, 0.67], 13.5 * k, 0.5 * k, 0.08 * k);
  const w1 = wedge(a, b, [-1.4 * k, 2.7 * k], [-0.6, 0.8], 12 * k, 0.62 * k, 0.12 * k);
  const w2 = wedge(a, b, [-0.2 * k, 3.1 * k], [-0.5, 0.87], 6.5 * k, 0.28 * k, 0.05 * k);
  const w3 = wedge(a, b, [0.9 * k, 3.3 * k], [-0.56, 0.83], 11 * k, 0.46 * k, 0.1 * k);
  const w4 = wedge(a, b, [2.2 * k, 3.4 * k], [-0.38, 0.93], 8.5 * k, 0.34 * k, 0.07 * k);
  const w5 = wedge(a, b, [3.4 * k, 3.1 * k], [-0.3, 0.95], 10 * k, 0.4 * k, 0.09 * k);
  const w6 = wedge(a, b, [4.3 * k, 2.4 * k], [-0.12, 0.99], 5.5 * k, 0.22 * k, 0.05 * k);
  const inkMask = max(max(max(flank, w0), max(w1, w2)), max(max(w3, w4), max(w5, w6)));
  cap = mix(cap, pal(0), inkMask) as unknown as Vec3Node;
  return { wall, cap };
}
