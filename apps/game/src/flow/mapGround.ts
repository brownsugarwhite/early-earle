import { Vector3, type Mesh } from 'three/webgpu';
import { chunkKey, chunkMeshRadiusAt, hash32, type ChunkMeshData } from '@ee/world';
import { CHUNKS_PER_FACE, type MapWorld } from './MapWorld';
import type { GroundFrame, MapGround } from './MapCreatures';
import type { PathLayout } from './path';

/**
 * MapGround über der heutigen Kugel (dünner Adapter, ADR 0002: wird durch `MapWorld.mapGround()` der unendlichen Ebene
 * ersetzt). Liest nur MapWorld/Pfad: Gelände (das gezeichnete Chunk-Netz, sonst die glatte Oberfläche), Wasser und
 * Felsen der Merkmale, die Krümmungs-Anzeige (`bend`), den Blickpunkt (Krümmungszentrum) und die Knoten/Punkte des
 * Levelpfads. Alles im Raum des Planeten.
 */
export interface MapGroundOptions {
  /** Blickpunkt der Karte (Planetenraum); Standard: das Krümmungszentrum unter dem Blick der Kamera. */
  focus?: (out: Vector3) => Vector3;
}

/** Füße sinken so weit unter das gezeichnete Netz (nichts schwebt). */
export const GROUND_SINK = 0.02;
/** Wohnorte: Abstand zum Knoten, Mindestabstand zu Pfadpunkten, Lichtung um den Knoten. */
const HOME_MIN = 1.1;
const HOME_MAX = 1.5;
const DOT_CLEAR = 0.45;
const CLEARING = 1.95;

export interface MapGroundAdapter extends MapGround {
  /** Trocken, kein Fels (Wanderziele). */
  walkable(p: Vector3): boolean;
}

export function createMapGround(world: MapWorld, layout: PathLayout, opts: MapGroundOptions = {}): MapGroundAdapter {
  const planet = world.world;
  const field = planet.field;
  const radius = planet.options.radius;
  const dots = layout.dots.map((d) => new Vector3(d.position[0], d.position[1], d.position[2]));
  const chunkMeshes = new Map<string, { mesh: Mesh; data: ChunkMeshData }>();
  const nearDots = new Map<number, Vector3[]>();
  const _d = new Vector3();
  const _a = new Vector3();
  const _b = new Vector3();
  const _t = new Vector3();
  const _n = new Vector3();

  /** Radius des gezeichneten Terrain-Netzes in Richtung `dir` (null: Chunk nicht geladen). */
  function meshRadius(dir: Vector3): number | null {
    const id = field.chunkOf(dir.x, dir.y, dir.z);
    const key = chunkKey(id);
    let hit = chunkMeshes.get(key);
    if (!hit || hit.mesh.parent !== planet.group) {
      const mesh = planet.group.getObjectByName(`chunk-${key}`) as Mesh | undefined;
      if (!mesh) return null;
      const pos = mesh.geometry.getAttribute('position');
      hit = { mesh, data: { id, key, vertexCount: pos.count, positions: pos.array as Float32Array } as ChunkMeshData };
      chunkMeshes.set(key, hit);
    }
    return chunkMeshRadiusAt(hit.data, CHUNKS_PER_FACE, [dir.x, dir.y, dir.z]);
  }

  /** Begehbare Oberfläche (Felsdeckel zählen mit), auf dem Netz wo es geladen ist. */
  function surface(dir: Vector3): number {
    const rock = field.features.rockAt(dir.x, dir.y, dir.z, 0) !== null;
    if (rock) return planet.walkableRadius(dir);
    return meshRadius(dir) ?? planet.surfaceRadius(dir);
  }

  function walkable(p: Vector3): boolean {
    _d.copy(p).normalize();
    if (planet.isWater(_d, 0.25)) return false;
    return field.features.rockAt(_d.x, _d.y, _d.z, 0.25) === null;
  }

  const groundPoint = (p: Vector3, out: Vector3): Vector3 => {
    const dir = _d.copy(p).normalize();
    const r = surface(dir);
    return out.copy(dir).multiplyScalar(r - GROUND_SINK);
  };

  const ground = (p: Vector3, out: GroundFrame): void => {
    const dir = _d.copy(p).normalize();
    const r = surface(dir);
    out.position.copy(dir).multiplyScalar(r - GROUND_SINK);
    // Geländenormale aus der glatten Oberfläche (halb zur Radialen: Wesen stehen nicht schief am Hang).
    tangents(dir, _a, _b);
    const e = 0.25 / radius;
    const h = (u: number, v: number): number => planet.surfaceRadius(_t.copy(dir).addScaledVector(_a, u * e).addScaledVector(_b, v * e).normalize());
    const dx = (h(1, 0) - h(-1, 0)) / (2 * 0.25);
    const dz = (h(0, 1) - h(0, -1)) / (2 * 0.25);
    _n.copy(dir).addScaledVector(_a, -dx).addScaledVector(_b, -dz).normalize();
    out.normal.copy(dir).add(_n).normalize();
  };

  function dotsNear(node: number): Vector3[] {
    let list = nearDots.get(node);
    if (list) return list;
    const n = layout.nodes[node];
    list = [];
    if (n) {
      const c = new Vector3(n.position[0], n.position[1], n.position[2]);
      for (const d of dots) if (d.distanceToSquared(c) < 16) list.push(d);
    }
    nearDots.set(node, list);
    return list;
  }

  /** Pfadrichtung am Knoten (zum nächsten minus zum vorigen), in der Tangentialebene. */
  function pathTangent(node: number, up: Vector3, out: Vector3): Vector3 {
    const nodes = layout.nodes;
    const prev = nodes[Math.max(0, node - 1)]!;
    const next = nodes[Math.min(nodes.length - 1, node + 1)]!;
    out.set(next.position[0] - prev.position[0], next.position[1] - prev.position[1], next.position[2] - prev.position[2]);
    out.addScaledVector(up, -out.dot(up));
    if (out.lengthSq() < 1e-8) tangents(up, out, _b);
    return out.normalize();
  }

  /** Die Wurzelterrasse des Riesenbaums (Knoten 80–95 wohnen dort). */
  const terrace = layout.nodes.find((n) => n.stage?.orbit)?.stage?.orbit ?? null;

  const homeSpot = (node: number, slot: number, out: GroundFrame): boolean => {
    const n = layout.nodes[node];
    if (!n) return false;
    const onTree = world.isTreeNode(node);
    for (let attempt = 0; attempt < 14; attempt++) {
      const h = hash32('map-home', node, slot, attempt);
      const u1 = (h & 0xffff) / 0xffff;
      const u2 = ((h >>> 16) & 0xffff) / 0xffff;
      let p: Vector3;
      if (onTree && terrace) {
        // Rund um den Stamm auf der Wurzelterrasse, jeder Knoten in seinem Winkel, die Wesen nebeneinander.
        const foot = _a.set(terrace.foot[0], terrace.foot[1], terrace.foot[2]);
        const up = _b.set(terrace.up[0], terrace.up[1], terrace.up[2]).normalize();
        const base = hash32('map-terrace', node) / 0xffffffff;
        const ang = (base + slot * 0.021 + (u1 - 0.5) * 0.03) * Math.PI * 2;
        const side = tangents(up, _t, _n);
        const dir = side.multiplyScalar(Math.cos(ang)).addScaledVector(_n, Math.sin(ang)).normalize();
        p = foot.clone().addScaledVector(dir, terrace.radius + 0.6 + u2 * 1.4 + attempt * 0.15);
      } else {
        // Seitlich des Pfads (Seite je Knoten und Platz gehasht), 1,1–1,5 vom Knoten.
        const c = new Vector3(n.position[0], n.position[1], n.position[2]);
        const up = c.clone().normalize();
        const along = pathTangent(node, up, _a);
        const perp = _b.crossVectors(up, along).normalize();
        const side = (hash32('map-side', node, slot) & 1) === 0 ? 1 : -1;
        const ang = (u1 - 0.5) * 1.6 + (attempt > 6 ? Math.PI : 0);
        const d = HOME_MIN + (HOME_MAX - HOME_MIN) * u2;
        p = c.addScaledVector(perp, Math.cos(ang) * d * side).addScaledVector(along, Math.sin(ang) * d);
      }
      p.normalize().multiplyScalar(planet.surfaceRadius(p));
      if (!walkable(p)) continue;
      if (onTree) {
        if (world.treeClearance(p) < 1.2) continue;
      } else {
        const c = _t.set(n.position[0], n.position[1], n.position[2]);
        if (p.distanceTo(c) > CLEARING) continue;
        if (dotsNear(node).some((d) => d.distanceTo(p) < DOT_CLEAR)) continue;
      }
      ground(p, out);
      return true;
    }
    return false;
  };

  const display = (p: Vector3, out: Vector3): Vector3 => world.bend(p, out);

  const focus =
    opts.focus ??
    ((out: Vector3): Vector3 => {
      const d = out.copy(planet.lookDirLocal.value).normalize();
      return d.multiplyScalar(planet.surfaceRadius(d));
    });

  return { homeSpot, ground, groundPoint, display, focus, walkable };
}

/** Zwei Tangenten an einer Einheitsnormale (stabil). */
function tangents(n: Vector3, a: Vector3, b: Vector3): Vector3 {
  if (Math.abs(n.y) < 0.9) a.set(0, 1, 0);
  else a.set(1, 0, 0);
  a.addScaledVector(n, -a.dot(n)).normalize();
  b.crossVectors(n, a).normalize();
  return a;
}
