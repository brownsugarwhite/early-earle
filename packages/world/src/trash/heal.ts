import type { Vec3 } from '../capPatch';
import { HEAL_SPAN } from './types';

/** Pfadknoten, wie ihn die Heilung braucht (Teilmenge von `SpiralNode`). */
export interface HealNode {
  index: number;
  zone: number;
  position: Vec3;
}

/** Nächster Punkt auf dem Pfad: kontinuierlicher Knotenindex `s` (i + t zwischen Knoten i und i+1) und Abstand. */
export interface PathHit {
  s: number;
  dist: number;
}

/**
 * Levelpfad als Polylinie der Knoten (3D-Sehnen; zwischen zwei Knoten liegt die Spirale höchstens ≈ 0.06 daneben).
 * Liefert je Ort den nächsten Pfadpunkt: daraus entstehen Heilschwellen (Müll nahe Knoten i verschwindet, sobald
 * Knoten i geschafft ist; weiter weg später) und Freiräume um den Pfad.
 */
export class PathLocator {
  private readonly px: Float64Array;
  private readonly py: Float64Array;
  private readonly pz: Float64Array;
  private readonly idx: Int32Array;
  readonly count: number;

  constructor(nodes: ReadonlyArray<HealNode>) {
    const sorted = [...nodes].sort((a, b) => a.index - b.index);
    this.count = sorted.length;
    this.px = new Float64Array(sorted.length);
    this.py = new Float64Array(sorted.length);
    this.pz = new Float64Array(sorted.length);
    this.idx = new Int32Array(sorted.length);
    sorted.forEach((n, i) => {
      this.px[i] = n.position[0];
      this.py[i] = n.position[1];
      this.pz[i] = n.position[2];
      this.idx[i] = n.index;
    });
  }

  /** Nächster Pfadpunkt zu `p` (Planetenraum). Ohne Knoten: s = 0, Abstand ∞. */
  locate(p: Vec3, out: PathHit = { s: 0, dist: Infinity }): PathHit {
    const n = this.count;
    out.s = 0;
    out.dist = Infinity;
    if (n === 0) return out;
    if (n === 1) {
      out.s = this.idx[0]!;
      out.dist = Math.hypot(p[0] - this.px[0]!, p[1] - this.py[0]!, p[2] - this.pz[0]!);
      return out;
    }
    let best = Infinity;
    let bestS = 0;
    for (let i = 0; i < n - 1; i++) {
      const ax = this.px[i]!;
      const ay = this.py[i]!;
      const az = this.pz[i]!;
      const bx = this.px[i + 1]! - ax;
      const by = this.py[i + 1]! - ay;
      const bz = this.pz[i + 1]! - az;
      const len2 = bx * bx + by * by + bz * bz;
      // Schneller Ausschluss: Segment liegt weiter weg als der beste Treffer (Kugel um den Segmentmittelpunkt)
      const mx = ax + bx * 0.5 - p[0];
      const my = ay + by * 0.5 - p[1];
      const mz = az + bz * 0.5 - p[2];
      const half = Math.sqrt(len2) * 0.5;
      const dm = Math.sqrt(mx * mx + my * my + mz * mz) - half;
      if (dm > best) continue;
      let t = len2 > 1e-12 ? ((p[0] - ax) * bx + (p[1] - ay) * by + (p[2] - az) * bz) / len2 : 0;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const dx = ax + bx * t - p[0];
      const dy = ay + by * t - p[1];
      const dz = az + bz * t - p[2];
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d < best) {
        best = d;
        bestS = this.idx[i]! + t * (this.idx[i + 1]! - this.idx[i]!);
      }
    }
    out.s = bestS;
    out.dist = best;
    return out;
  }
}

export interface HealOptions {
  /** Zusatzverzögerung je Welteinheit Abstand zum Pfad (Knoten/Einheit). */
  perUnit: number;
  /** Feste Verzögerung der Art (große Elemente bleiben länger). */
  delay: number;
  /** Knoten je Zone (Heilung endet spätestens mit dem Zonenfinale). */
  nodesPerZone: number;
  /** Zone des Elements. */
  zone: number;
}

/**
 * Heilschwelle aus dem nächsten Pfadpunkt: Knoten i geschafft → Fortschritt i + 1 räumt den Weg bis zum nächsten
 * Knoten frei (Versatz 0.1: genau dort, wohin die Kamera nach dem Sieg dreht, läuft die Feier), weiter weg vom Pfad
 * heilt später (die Heilung läuft wie eine Welle vom Pfad nach außen), spätestens beim Zonenfinale (alle Knoten der
 * Zone). Fortschritt 0 lässt alles stehen (Mindestschwelle Zonenanfang + HEAL_SPAN).
 */
export function healThreshold(hit: PathHit, o: HealOptions): number {
  const zoneStart = o.zone * o.nodesPerZone;
  const zoneEnd = (o.zone + 1) * o.nodesPerZone;
  const raw = hit.s + 0.1 + o.perUnit * hit.dist + o.delay;
  return Math.min(zoneEnd, Math.max(zoneStart + HEAL_SPAN, raw));
}

/**
 * Heilzustand 0..1 eines Elements beim (animierten) Fortschritt `progress` (Shader-Parität: dieselbe Formel läuft
 * im Vertex-Shader): 0 = unberührt, 1 = verschwunden.
 */
export function healAmount(heal: number, progress: number): number {
  const t = (progress - (heal - HEAL_SPAN)) / HEAL_SPAN;
  return t <= 0 ? 0 : t >= 1 ? 1 : t;
}
