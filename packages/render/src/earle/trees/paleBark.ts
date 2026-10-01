import { float, mix, smoothstep, step } from 'three/tsl';
import { aaStep, type FloatNode, type PaletteLookup, type Vec3Node, type Vec4Node } from '../tsl';

/**
 * Lavendelstämme (Welt 01, Ebene 21, Rindenstil `pale`): Die Begleitbäume des Riesenbaums stehen mit blass lavendel-
 * blauen, gegabelten Stämmen vor den schwarzen, getüpfelten Hängen — auf der Lichtseite ein fast weißer Streifen, in
 * der Mitte Lavendel, auf der Schattenseite ein tiefes Blauviolett. Alles aus der Akzentzeile der Welt:
 * 0 Lichtstreifen (fast weiß), 1 Lavendel, 2 Blauviolett (Schattenseite).
 *
 * Harte Stufen wie überall: Schatten/Licht am Terminator (`lit`) und der Lichtstreifen (hohes N·L) sind scharfe Formen,
 * innerhalb der Flächen läuft nur ein Verlauf (Fuß dunkler, nach oben heller). Der Lichtstreifen ist keine Kontur: er
 * liegt innen auf der Lichtseite, wo die Rinde der Sonne am meisten zugewandt ist.
 */
export interface PaleBarkOptions {
  lookup: PaletteLookup;
  /** Kronenzeile (Stufe 0 = Tinte) und Akzentzeile der Welt. */
  row: FloatNode;
  acc: FloatNode;
  /** Licht am Terminator (1 Licht, 0 Schatten; harte Stufe) und N·L der Rinde. */
  lit: FloatNode;
  ndl: FloatNode;
  /** Rinde (Fragmentstufe): u rundum, v längs (Welteinheiten), Ebene, Radius. */
  bark: Vec4Node;
}

export function paleBark(o: PaleBarkOptions): Vec3Node {
  const pal = (i: number): Vec3Node => o.lookup.pal(i, o.acc).rgb as unknown as Vec3Node;
  const ink = o.lookup.pal(0, o.row).rgb as unknown as Vec3Node;
  // Verlauf längs: am Fuß dunkler, nach oben heller (innerhalb der Stufen)
  const up = smoothstep(0.05, 1.6, o.bark.y);
  // Äste und Zweige etwas heller als der Schaft (sie stehen im Licht über dem dunklen Hang)
  const level = o.bark.z;
  const isBranch = step(0.5, level).mul(step(level, float(2.5)));
  const shade = mix(mix(ink, pal(2), 0.78), pal(2), up.mul(0.6));
  const lav = mix(mix(pal(1), pal(2), 0.22), pal(1), up.mul(0.7).add(isBranch.mul(0.3)).min(1));
  // Lichtstreifen: der sonnenzugewandte Teil der Lichtseite (harte Stufe mit 1-px-Kante wie der Terminator)
  const streak = aaStep(0.6, o.ndl).mul(o.lit);
  const lit = mix(lav, pal(0), streak);
  return mix(shade, lit, o.lit) as unknown as Vec3Node;
}
