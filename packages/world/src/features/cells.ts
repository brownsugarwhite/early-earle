import type { Vec3 } from '../capPatch';

/**
 * Räumlicher Index auf der Kugel: Würfelseiten mit `g × g` Zellen (gnomonisch wie die Chunks). Einträge sind
 * Kugelkappen (Mittelrichtung + Winkelradius); die Kandidatenliste einer Zelle wird beim ersten Zugriff berechnet.
 */
export class CapIndex {
  private readonly items: Array<{ dir: Vec3; cos: number; angle: number }> = [];
  private readonly cells: Array<Int32Array | null>;
  private readonly cellDir: Float64Array;
  private readonly cellAngle: number;
  private static readonly EMPTY = new Int32Array(0);

  constructor(readonly g = 10) {
    this.cells = new Array<Int32Array | null>(6 * g * g).fill(null);
    this.cellDir = new Float64Array(6 * g * g * 3);
    let worst = 0;
    const tmp: Vec3 = [0, 0, 0];
    const corner: Vec3 = [0, 0, 0];
    for (let face = 0; face < 6; face++) {
      for (let j = 0; j < g; j++) {
        for (let i = 0; i < g; i++) {
          const k = (face * g + j) * g + i;
          cubeDir(face, -1 + ((i + 0.5) * 2) / g, -1 + ((j + 0.5) * 2) / g, tmp);
          this.cellDir[k * 3] = tmp[0];
          this.cellDir[k * 3 + 1] = tmp[1];
          this.cellDir[k * 3 + 2] = tmp[2];
          for (const [du, dv] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) {
            cubeDir(face, -1 + ((i + du) * 2) / g, -1 + ((j + dv) * 2) / g, corner);
            const d = tmp[0] * corner[0] + tmp[1] * corner[1] + tmp[2] * corner[2];
            worst = Math.max(worst, Math.acos(Math.min(1, d)));
          }
        }
      }
    }
    this.cellAngle = worst + 1e-3;
  }

  /** Eintrag hinzufügen (vor der ersten Abfrage); liefert den Index. */
  add(dir: Vec3, angle: number): number {
    this.items.push({ dir: [dir[0], dir[1], dir[2]], cos: Math.cos(angle), angle });
    return this.items.length - 1;
  }

  get size(): number {
    return this.items.length;
  }

  /** Kandidaten (Eintrags-Indizes), deren Kappe die Zelle der Richtung berühren kann. */
  query(dx: number, dy: number, dz: number): Int32Array {
    if (this.items.length === 0) return CapIndex.EMPTY;
    const k = this.cellIndex(dx, dy, dz);
    let list = this.cells[k];
    if (!list) {
      const cx = this.cellDir[k * 3]!;
      const cy = this.cellDir[k * 3 + 1]!;
      const cz = this.cellDir[k * 3 + 2]!;
      const hits: number[] = [];
      for (let n = 0; n < this.items.length; n++) {
        const it = this.items[n]!;
        const d = cx * it.dir[0] + cy * it.dir[1] + cz * it.dir[2];
        const ang = Math.acos(Math.min(1, Math.max(-1, d)));
        if (ang <= it.angle + this.cellAngle) hits.push(n);
      }
      list = hits.length > 0 ? Int32Array.from(hits) : CapIndex.EMPTY;
      this.cells[k] = list;
    }
    return list;
  }

  private cellIndex(dx: number, dy: number, dz: number): number {
    const ax = Math.abs(dx);
    const ay = Math.abs(dy);
    const az = Math.abs(dz);
    let face: number;
    let u: number;
    let v: number;
    // Gleiche Seitenbasis wie `FACES` in planet.ts (origin, right, up)
    if (ax >= ay && ax >= az) {
      if (dx > 0) {
        face = 0;
        u = -dz / ax;
        v = dy / ax;
      } else {
        face = 1;
        u = dz / ax;
        v = dy / ax;
      }
    } else if (ay >= az) {
      if (dy > 0) {
        face = 2;
        u = dx / ay;
        v = -dz / ay;
      } else {
        face = 3;
        u = dx / ay;
        v = dz / ay;
      }
    } else if (dz > 0) {
      face = 4;
      u = dx / az;
      v = dy / az;
    } else {
      face = 5;
      u = -dx / az;
      v = dy / az;
    }
    const g = this.g;
    const i = Math.min(g - 1, Math.max(0, Math.floor(((u + 1) / 2) * g)));
    const j = Math.min(g - 1, Math.max(0, Math.floor(((v + 1) / 2) * g)));
    return (face * g + j) * g + i;
  }
}

const FACE_BASIS: Array<[Vec3, Vec3, Vec3]> = [
  [[1, 0, 0], [0, 0, -1], [0, 1, 0]],
  [[-1, 0, 0], [0, 0, 1], [0, 1, 0]],
  [[0, 1, 0], [1, 0, 0], [0, 0, -1]],
  [[0, -1, 0], [1, 0, 0], [0, 0, 1]],
  [[0, 0, 1], [1, 0, 0], [0, 1, 0]],
  [[0, 0, -1], [-1, 0, 0], [0, 1, 0]],
];

function cubeDir(face: number, fu: number, fv: number, out: Vec3): Vec3 {
  const [o, r, u] = FACE_BASIS[face]!;
  const x = o[0] + fu * r[0] + fv * u[0];
  const y = o[1] + fu * r[1] + fv * u[1];
  const z = o[2] + fu * r[2] + fv * u[2];
  const l = Math.hypot(x, y, z) || 1;
  out[0] = x / l;
  out[1] = y / l;
  out[2] = z / l;
  return out;
}
