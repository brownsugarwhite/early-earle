import { clamp, float, floor, fract, fwidth, length, max, mix, select, smoothstep, vec3 } from 'three/tsl';
import type { FloatNode, PaletteLookup, Vec3Node } from '../tsl';
import { cellHash, rehash } from './patterns';

/**
 * Textur der Schattenseite der Kronen (Earle: dunkel auf dunkel, nie eine schwarze Fläche — Ebene 1/19/32, Bild 03):
 * feine Tüpfel in der Schattenseiten-Punktfarbe der Kronenzeile (Stufe 3, einige eine Stufe dunkler), dicht, kleiner als
 * die Lichtpunkte. Sie wachsen mit der Tiefe des Schattens aus 0 (am Terminator verschwunden, nichts ploppt) und liegen
 * auch im Schlagschatten. Aus der Ferne, wenn die Tüpfel unter ≈ 3 px fallen, bleibt ein leichter Farbhauch derselben
 * Punktfarbe statt reiner Tinte.
 *
 * Getrennter Haken fürs Kronenmaterial (`CrownMaterialOptions.shadeTexture`): die Verläufe in den dunklen Flächen
 * (Farbarbeit) bleiben davon unberührt, die Tüpfel liegen obendrauf.
 */
export interface ShadeTextureOptions {
  lookup: PaletteLookup;
  /** Musterkoordinate in Welteinheiten, fest an der Krone (Fragmentstufe). */
  patternPos: Vec3Node;
  /** Anteil besetzter Zellen 0..1 (z. B. je Welt). */
  density: FloatNode;
  /** Zellgröße (Welteinheiten) und Punktradius relativ zur Zelle. */
  cell?: number;
  size?: number;
  /** Farbhauch aus der Ferne (Anteil der Punktfarbe, Standard 0.16). */
  tint?: number;
}

export interface ShadeInputs {
  /** Licht der Krone (1 Licht, 0 Tinte), inkl. Schlagschatten. */
  lit: FloatNode;
  /** N·L der Schattierungsnormale und Terminator der Instanz. */
  ndl: FloatNode;
  term: FloatNode;
  /** Schlagschatten (1 frei, 0 im Schatten). */
  cast: FloatNode;
  row: FloatNode;
}

export type ShadeTexture = (col: Vec3Node, s: ShadeInputs) => Vec3Node;

export function crownShadeTexture(o: ShadeTextureOptions): ShadeTexture {
  const cellN = float(o.cell ?? 0.075);
  const size = o.size ?? 0.26;
  return (col, s) => {
    // Tiefe des Schattens: 0 am Terminator, 1 tief auf der Schattenseite; im Schlagschatten voll
    const depth = smoothstep(0.0, 0.3, s.term.sub(s.ndl));
    const grow = float(1).sub(s.lit).mul(max(depth, float(1).sub(s.cast)));
    const q = o.patternPos.div(cellN);
    const c = floor(q);
    const h1 = cellHash(c, 19);
    const h2 = rehash(h1, 7);
    const h3 = rehash(h2, 29);
    const h4 = rehash(h3, 43);
    const jit = vec3(h1, h2, h3).sub(0.5).mul(float(1 - size * 2).max(0).mul(0.9));
    const d = length(fract(q).sub(0.5).sub(jit)).mul(cellN);
    const present = select(h4.lessThan(o.density), float(1), float(0));
    const rad = cellN.mul(size).mul(float(0.55).add(h2.mul(0.45))).mul(grow).mul(present);
    const cellsPerPx = fwidth(q.x).add(fwidth(q.y)).add(fwidth(q.z)).mul(0.5);
    const fw = cellsPerPx.mul(cellN).max(1e-5);
    const visible = smoothstep(0.42, 0.24, cellsPerPx);
    const mask = smoothstep(rad.add(fw), rad.sub(fw), d).mul(clamp(rad.div(fw), 0, 1)).mul(visible);
    const idx = select(rehash(h4, 3).lessThan(0.72), float(3), float(2));
    const dotCol = o.lookup.pal(idx, s.row).rgb as unknown as Vec3Node;
    // aus der Ferne: ein Hauch der Punktfarbe (derselbe Mittelwert, kein Flimmern)
    const tinted = mix(col, o.lookup.pal(3, s.row).rgb as unknown as Vec3Node, float(o.tint ?? 0.16).mul(grow).mul(float(1).sub(visible)));
    return mix(tinted, dotCol, mask);
  };
}
