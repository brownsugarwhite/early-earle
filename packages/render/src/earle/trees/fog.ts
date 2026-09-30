import { clamp, floor, fract, mix, smoothstep } from 'three/tsl';
import type { FloatNode, FogSettings, PaletteLookup, Vec3Node } from '../tsl';

/**
 * Gestufter Nebel je Baum statt je Fragment. Der Nebel der Welten ist kurz (Juwelenwald: alle 3 Einheiten eine Stufe),
 * eine große Krone lag deshalb oft über einer Stufengrenze: die nahen Teilkuppeln satt, die fernen blass — das las sich
 * wie übereinanderliegende, halbdurchsichtige Kuppeln (Florians Screenshot 15.06.32). Earle legt jeden Baum in genau
 * eine Tiefenebene (Kulissen, STYLE §2.9): hier nimmt jeder Baum die Stufe seines Fußpunkts (`dist` ist je Instanz
 * konstant) und wechselt beim Wandern der Kamera über das letzte Drittel einer Stufe weich in die nächste — kein Split,
 * kein Springen.
 */
export function instanceFog(color: Vec3Node, fog: FogSettings, lookup: PaletteLookup, dist: FloatNode): Vec3Node {
  const x = clamp(dist.sub(fog.start).mul(fog.invRange), 0, 0.999).mul(fog.steps.sub(1));
  const i = floor(x);
  const t = smoothstep(0.62, 1.0, fract(x));
  const a = mix(lookup.pal(i, fog.row), lookup.pal(i.add(1), fog.row), t);
  const b = mix(lookup.pal(i, fog.rowB), lookup.pal(i.add(1), fog.rowB), t);
  const f = mix(a, b, fog.mix);
  return mix(color, f.rgb, f.a);
}
