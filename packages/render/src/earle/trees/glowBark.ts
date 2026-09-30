import { abs, dot, float, fract, fwidth, mix, normalView, normalize, positionView, smoothstep, sqrt, step } from 'three/tsl';
import type { FloatNode, PaletteLookup, Vec3Node, Vec4Node } from '../tsl';

/**
 * Leuchtende Kathedralenstämme (Ebene 16, Rindenstil `glow`): Die dünnen Stämme leuchten blau bis cyan vor dem fast
 * schwarzen Wald, einzelne fast weiß; Äste und Zweige heller als der Schaft. Die Riesenstämme vorn sind dunkelblau mit
 * einer hellen Lichtkante auf der Lichtseite. Alles aus der Akzentzeile der Welt:
 * 0 Lichtkante (blasses Cyan-Weiß), 1 Mittelblau, 2 Tiefblau, 3 weiße Stämme, 6 helles Cyan, 7 Cyanblau.
 *
 * Harte Stufen wie überall: Licht/Schatten am Terminator (`lit`) und die Lichtkante sind scharfe Formen; nur innerhalb
 * der Flächen läuft ein Verlauf (Fuß dunkler, nach oben heller). Die Lichtkante ist keine Kontur: Sie liegt nur auf der
 * Lichtseite, auf den dünnen Stämmen als äußerer Teil ihrer Lichtseite (sie leuchten), auf den Riesenstämmen als
 * schmaler Saum fester Breite an der Silhouette.
 */
export interface GlowBarkOptions {
  lookup: PaletteLookup;
  /** Kronenzeile (Stufe 0 = Tinte) und Akzentzeile der Welt. */
  row: FloatNode;
  acc: FloatNode;
  /** Licht am Terminator (1 Licht, 0 Schatten; harte Stufe). */
  lit: FloatNode;
  /** Rinde (Fragmentstufe): u rundum, v längs (Welteinheiten), Ebene, Radius (Archetyp × Höhe, Welteinheiten). */
  bark: Vec4Node;
  /** Zufallswert je Baum 0..1. */
  variant: FloatNode;
  /** Riesenstamm (eigener Archetyp, Radius in Welteinheiten exakt): dunkler Schaft, Licht nur in der Kante. */
  giant: boolean;
}

export function glowBark(o: GlowBarkOptions): Vec3Node {
  const pal = (i: number): Vec3Node => o.lookup.pal(i, o.acc).rgb as unknown as Vec3Node;
  const ink = o.lookup.pal(0, o.row).rgb as unknown as Vec3Node;
  const R = o.bark.w.max(1e-4);
  // Verlauf längs: am Fuß dunkler, nach oben heller
  const up = smoothstep(0.15, 3.2, o.bark.y);
  // Lichtkante: Abstand zur Silhouette, R·(1 − sin φ) mit |N·V| = cos φ (Einheit wie R)
  const ndv = abs(dot(normalize(normalView), normalize(positionView.negate())));
  const sil = R.mul(float(1).sub(sqrt(float(1).sub(ndv.mul(ndv)).max(0))));
  const edgeOf = (width: FloatNode): FloatNode => {
    const fw = fwidth(sil).max(1e-5);
    return smoothstep(width.add(fw), width.sub(fw), sil).mul(o.lit);
  };
  if (o.giant) {
    // Dunkles Nachtblau, die Lichtseite kaum heller — das Licht sitzt in der blassen Kante (Ebene 16)
    const shade = mix(ink, pal(2), up.mul(0.25).add(0.35));
    const lit = mix(ink, pal(2), up.mul(0.2).add(0.7));
    return mix(mix(shade, lit, o.lit), pal(0), edgeOf(float(0.1))) as unknown as Vec3Node;
  }
  const level = o.bark.z;
  // Farbe je Baum: Tiefblau … Cyan, einzelne weiße Stämme; Äste und Zweige leuchten heller
  const tone = fract(o.variant.mul(5.31));
  const pale = step(fract(o.variant.mul(13.7)), float(0.16));
  const isBranch = step(0.5, level).mul(step(level, float(2.5)));
  const shade = mix(pal(2), pal(1), up.mul(0.55));
  let lit: Vec3Node = mix(mix(pal(1), pal(7), tone), pal(6), up.mul(tone).mul(0.6));
  lit = mix(lit, pal(3), pale);
  lit = mix(lit, mix(pal(6), pal(0), 0.5), isBranch.mul(0.7));
  // Kante als Anteil des Radius (der Radius der schlanken Schäfte ist hier nur bis auf ihre Dicke bekannt)
  return mix(mix(shade, lit, o.lit), mix(pal(6), pal(0), 0.25), edgeOf(R.mul(0.28))) as unknown as Vec3Node;
}
