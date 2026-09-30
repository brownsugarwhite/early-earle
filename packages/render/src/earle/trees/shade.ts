import { clamp, float, floor, fract, fwidth, length, max, mix, select, smoothstep, vec3 } from 'three/tsl';
import type { FloatNode, PaletteLookup, Vec3Node } from '../tsl';
import { branchVeins, cellHash, flowers, rehash } from './patterns';

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
  /** Farbhauch aus der Ferne (Anteil der Punktfarbe, Standard 0.22 ≈ mittlere Deckung der Tüpfel aus der Nähe). */
  tint?: number;
  /**
   * Blütenmotive auch im Schatten (Ebene 16: blasse Vier-Punkt-Blüten auf den dunklen Säulen; Ebene 32: Blüten auf den
   * dunklen Büschen): dieselben Zellen wie die Lichtblüten des Kronenmaterials, gedämpft in den Motivfarben — über den
   * Terminator hinweg schrumpft eine Blüte auf 0 und wächst auf der anderen Seite in ihrer Schattenfarbe wieder.
   */
  flowers?: { normal: Vec3Node; cell: number; density: FloatNode } | null;
  /**
   * Glühen der Schattenseite 0..1 (z. B. je Welt): die Tinte nimmt so viel vom ersten Kronenton an — Earles dunkle
   * Kronen sind dunkles Türkis (Ebene 16) oder glühen rot/violett von innen (Ebene 32), nie Schwarz.
   */
  glow?: FloatNode | null;
  /**
   * Astnetz in Säulenkronen (Ebene 16): helle, sich gabelnde Linien in der Stammfarbe, die durch das Laub scheinen —
   * im Licht in voller Stammfarbe, im Schatten gedämpft. `amount` 0..1 (je Welt), Hüllradius und halbe Höhe in
   * Welteinheiten.
   */
  veins?: { amount: FloatNode; radius: FloatNode; half: FloatNode; color: Vec3Node } | null;
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
  const cellN = float(o.cell ?? 0.062);
  const size = o.size ?? 0.34;
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
    // Glühen: die Schattenseite nimmt einen Teil des ersten Kronentons an (auch im Schlagschatten)
    const glowing = o.glow ? mix(col, o.lookup.pal(1, s.row).rgb as unknown as Vec3Node, o.glow.mul(float(1).sub(s.lit))) : col;
    // aus der Ferne: ein Hauch der Punktfarbe (derselbe Mittelwert, kein Flimmern)
    const tinted = mix(glowing, o.lookup.pal(3, s.row).rgb as unknown as Vec3Node, float(o.tint ?? 0.22).mul(grow).mul(float(1).sub(visible)));
    let out = mix(tinted, dotCol, mask);
    if (o.flowers) {
      const fl = flowers(o.patternPos, o.flowers.normal, o.flowers.cell, grow.mul(0.9), o.flowers.density);
      const motif = mix(o.lookup.pal(6, s.row).rgb, o.lookup.pal(7, s.row).rgb, select(fl.key.lessThan(0.5), float(0), float(1))) as unknown as Vec3Node;
      out = mix(out, mix(motif, o.lookup.pal(0, s.row).rgb as unknown as Vec3Node, 0.38), fl.mask);
    }
    if (o.veins) {
      const vein = branchVeins(o.patternPos, o.veins.radius, o.veins.half, 0.017).mul(o.veins.amount);
      const veinCol = mix(mix(o.lookup.pal(0, s.row).rgb as unknown as Vec3Node, o.veins.color, 0.42), o.veins.color, s.lit);
      out = mix(out, veinCol, vein);
    }
    return out;
  };
}
