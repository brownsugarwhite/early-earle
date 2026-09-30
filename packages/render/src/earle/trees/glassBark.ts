import { abs, clamp, float, floor, fract, fwidth, hash, mix, smoothstep, step } from 'three/tsl';
import type { FloatNode, PaletteLookup, Vec3Node, Vec4Node } from '../tsl';

/**
 * Glasfenster-Rinde der Riesenstämme im Juwelenwald (Ebene 3, Ebene 32; Vorbild: Juwelenrinde des Riesenbaums,
 * `tree/bark.ts`): schmale, lange Streifen in Blau, Violett, Hellblau, Grün, Rot, Gelb und Cyan auf fast schwarzem
 * Grund, auf der Lichtseite dicht und satt, auf der Schattenseite spärlich und gedämpft, gekreuzt von breiten, dunklen
 * Diagonalbändern (die gemalten Schatten der Äste). Farben aus der Akzentzeile (Stufen 1–7), Grund aus der Tinte.
 *
 * Alles in Welteinheiten auf dem Stamm (u rundum × Umfang, v längs): gleich fein auf jedem Riesenstamm, mit `fwidth`
 * geglättet; zu feine Streifen blenden in einen ruhigen Mittelton aus (kein Flimmern aus der Ferne).
 */
export interface GlassBarkOptions {
  lookup: PaletteLookup;
  /** Kronenzeile (Stufe 0 = Tinte) und Akzentzeile der Welt. */
  row: FloatNode;
  acc: FloatNode;
  /** Licht am Terminator (1 Licht, 0 Schatten; harte Stufe) und N·L (weicher Anteil für die Dichte). */
  lit: FloatNode;
  ndl: FloatNode;
  /** Rinde (Fragmentstufe): u rundum 0..1, v längs (Welteinheiten), Ebene, Radius (Welteinheiten). */
  bark: Vec4Node;
  /** Zufallswert je Baum 0..1. */
  variant: FloatNode;
}

export function glassBark(o: GlassBarkOptions): Vec3Node {
  const ink = o.lookup.pal(0, o.row).rgb as unknown as Vec3Node;
  const seed = floor(o.variant.mul(977));
  const litSoft = o.lit.mul(smoothstep(-0.05, 0.4, o.ndl));
  // Umfang in Welteinheiten → gleich breite Streifen auf dickem Schaft und dünnen Ästen
  const x = o.bark.x.mul(o.bark.w.mul(Math.PI * 2));
  const y = o.bark.y;
  const SX = 0.075;
  const col = floor(x.div(SX));
  const colH = hash(col.add(911).add(seed));
  // Zellen längs: 0.5–2.3 Einheiten, je Spalte versetzt
  const sy = y.add(colH.mul(7)).div(float(0.5).add(colH.mul(1.8)));
  const cell = floor(sy);
  const cid = col.add(4096).add(cell.add(4096).mul(1013)).add(seed.mul(7));
  const hc = hash(cid);
  const present = step(hc, mix(float(0.34), float(0.9), litSoft));
  const fx = fract(x.div(SX));
  const fy = fract(sy);
  const halfX = float(0.22).add(hash(cid.add(3)).mul(0.24));
  const fwx = fwidth(x.div(SX)).max(1e-4);
  const fwy = fwidth(sy).max(1e-4);
  const inX = smoothstep(halfX.add(fwx), halfX.sub(fwx), abs(fx.sub(0.5)));
  const inY = smoothstep(float(0.06).sub(fwy), float(0.06).add(fwy), fy).mul(smoothstep(float(0.94).add(fwy), float(0.94).sub(fwy), fy));
  // Überwiegend Blau, Violett, Hellblau und Grün, seltener Rot, Gelb und Cyan (Ebene 3)
  const idx = floor(hash(cid.add(11)).pow(1.5).mul(6.99)).add(1);
  const streak = o.lookup.pal(idx, o.acc).rgb.mul(mix(float(0.38), float(1), litSoft)) as unknown as Vec3Node;
  // Aus der Ferne (Streifen unter ≈ 2 px): ruhiger Mittelton statt Flimmern
  const fine = smoothstep(float(0.5), float(0.25), fwx);
  const ground = mix(ink, o.lookup.pal(1, o.acc).rgb as unknown as Vec3Node, litSoft.mul(0.12));
  const far = mix(ground, o.lookup.pal(2, o.acc).rgb as unknown as Vec3Node, clamp(litSoft.mul(0.35), 0, 1));
  let c: Vec3Node = mix(ground, streak, inX.mul(inY).mul(present).mul(fine));
  c = mix(far, c, fine);
  // Breite dunkle Diagonalbänder (Ebene 3: die Äste werfen gemalte Schatten über das Glas)
  const bars = x.mul(0.7).add(y).div(1.9);
  const fb = fwidth(bars).max(1e-4);
  const bar = smoothstep(float(0.13).add(fb), float(0.13).sub(fb), abs(fract(bars).sub(0.5))).mul(step(0.35, hash(floor(bars).add(333).add(seed))));
  return mix(c, ink, bar.mul(0.94)) as unknown as Vec3Node;
}
