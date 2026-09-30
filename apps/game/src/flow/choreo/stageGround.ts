import { Vector3 } from 'three/webgpu';
import type { GroundFrame, MapGround } from '../MapCreatures';
import type { PathLayout } from '../path';

/**
 * Übergangs-MapGround aus den Nahtstellen der Bühne, bis die Sammlungs-Baustelle (B5) `flow/mapGround.ts` über
 * MapWorld liefert: Wohnorte seitlich neben dem Knoten (abwechselnd links/rechts, nach außen gestaffelt, mit Abstand zu
 * Pfadpunkten und Knoten), Füße auf dem Boden, Anzeige-Abbildung und Blickpunkt aus der Bühne. Ob ein Platz trocken
 * ist, weiß erst die echte Variante (Seen, Flüsse).
 */
export interface StageGroundDeps {
  layout: PathLayout;
  groundAt(p: Vector3, out: GroundFrame): GroundFrame;
  display(p: Vector3, out: Vector3): Vector3;
  focus(out: Vector3): Vector3;
}

/** So weit müssen Wohnorte von Pfadpunkten und Knoten weg sein (Welteinheiten). */
const CLEAR = 0.95;

export function createStageGround(deps: StageGroundDeps): MapGround {
  const { layout } = deps;
  const p = new Vector3();
  const n = new Vector3();
  const t = new Vector3();
  const side = new Vector3();
  const q = new Vector3();
  const tmp = new Vector3();

  const tooClose = (spot: Vector3, node: number): boolean => {
    for (const d of layout.dots) {
      const seg = d.seg ?? -9;
      if (seg < node - 1 || seg > node) continue;
      if (tmp.set(d.position[0], d.position[1], d.position[2]).distanceTo(spot) < CLEAR) return true;
    }
    for (let i = Math.max(0, node - 1); i <= Math.min(layout.nodes.length - 1, node + 1); i++) {
      const nd = layout.nodes[i]!;
      if (tmp.set(nd.position[0], nd.position[1], nd.position[2]).distanceTo(spot) < CLEAR * 1.3) return true;
    }
    return false;
  };

  return {
    homeSpot(node, slot, out) {
      const nd = layout.nodes[node];
      if (!nd) return false;
      p.set(nd.position[0], nd.position[1], nd.position[2]);
      n.copy(p).normalize();
      // Path direction at the node (toward the next one, at the end from the previous one), in the tangent plane.
      const other = layout.nodes[node + 1] ?? layout.nodes[node - 1];
      if (other) t.set(other.position[0], other.position[1], other.position[2]).sub(p);
      else t.set(1, 0, 0);
      if (!layout.nodes[node + 1]) t.negate();
      t.addScaledVector(n, -t.dot(n));
      if (t.lengthSq() < 1e-8) t.set(1, 0, 0).addScaledVector(n, -n.x);
      t.normalize();
      side.crossVectors(n, t).normalize();
      const ring = Math.floor(Math.max(0, slot) / 2);
      const sign = slot % 2 === 0 ? 1 : -1;
      const along = ((ring % 3) - 1) * 0.55;
      for (let k = 0; k < 4; k++) {
        const dist = 1.35 + 0.45 * ring + 0.4 * k;
        q.copy(p).addScaledVector(side, sign * dist).addScaledVector(t, along);
        if (!tooClose(q, node) || k === 3) break;
      }
      deps.groundAt(q, out);
      return true;
    },
    ground(point, out) {
      deps.groundAt(point, out);
    },
    display(point, out) {
      return deps.display(point, out);
    },
    focus(out) {
      return deps.focus(out);
    },
  };
}
