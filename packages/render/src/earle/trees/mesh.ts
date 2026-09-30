import { BufferGeometry, Float32BufferAttribute, Uint16BufferAttribute, Uint32BufferAttribute } from 'three/webgpu';

/** Kleiner Vektor-Typ für die CPU-Generatoren (keine three-Objekte in den Schleifen). */
export type V3 = [number, number, number];

export interface TubePoint {
  p: V3;
  /** Radius an diesem Punkt (Einheiten der Geometrie). */
  r: number;
}

/**
 * Baut organische Röhren (Stamm, Äste, Wurzeln) als ein indiziertes Mesh: Ringe entlang eines Pfads mit
 * Parallel-Transport-Rahmen (kein Verdrillen), Normalen mit Verjüngung (n = d − r'·T), Rindenkoordinaten je Vertex
 * im Attribut `bark` = (u rundum 0..1, v Bogenlänge ab Stammfuß, Ebene 0 Stamm / 1 Ast / 2 Zweig / 3 Wurzel, Radius).
 * Die Naht rundum ist dupliziert (u = 0 und 1), damit Rindenmuster ohne Sprung umlaufen.
 */
export class TreeMeshBuilder {
  readonly pos: number[] = [];
  readonly nor: number[] = [];
  readonly bark: number[] = [];
  readonly idx: number[] = [];

  get vertexCount(): number {
    return this.pos.length / 3;
  }

  /**
   * Röhre entlang `points` (≥ 2) mit `radial` Segmenten. `vStart` = Bogenlänge am ersten Punkt (Äste setzen die
   * Rindenkoordinate des Elternteils fort). `lobe(winkel, i)` formt den Querschnitt (Faktor auf den Radius, z. B.
   * Wurzelanläufe, gedrehte Wülste). Liefert die Bogenlänge am Ende.
   */
  tube(points: TubePoint[], radial: number, level: number, vStart = 0, lobe?: (angle: number, ring: number) => number): number {
    const n = points.length;
    if (n < 2) return vStart;
    const base = this.vertexCount;
    const T: V3[] = [];
    for (let i = 0; i < n; i++) {
      const a = points[Math.max(0, i - 1)]!.p;
      const b = points[Math.min(n - 1, i + 1)]!.p;
      T.push(norm(sub(b, a)));
    }
    // Startrahmen: Achse, die am wenigsten mit T0 übereinstimmt
    const t0 = T[0]!;
    const ax: V3 = Math.abs(t0[0]) < 0.6 ? [1, 0, 0] : Math.abs(t0[2]) < 0.6 ? [0, 0, 1] : [0, 1, 0];
    let N = norm(cross(t0, ax));
    const s: number[] = [vStart];
    for (let i = 1; i < n; i++) s.push(s[i - 1]! + len(sub(points[i]!.p, points[i - 1]!.p)));
    for (let i = 0; i < n; i++) {
      const t = T[i]!;
      // Parallel-Transport: vorherige Normale auf die Ebene ⟂ T projizieren
      N = norm(sub(N, scale(t, dot(N, t))));
      const B = cross(t, N);
      const p = points[i]!.p;
      const r = points[i]!.r;
      const i0 = Math.max(0, i - 1);
      const i1 = Math.min(n - 1, i + 1);
      const ds = s[i1]! - s[i0]!;
      const drds = ds > 1e-9 ? (points[i1]!.r - points[i0]!.r) / ds : 0;
      for (let j = 0; j <= radial; j++) {
        const a = (j / radial) * Math.PI * 2;
        const c = Math.cos(a);
        const sn = Math.sin(a);
        const d: V3 = [N[0] * c + B[0] * sn, N[1] * c + B[1] * sn, N[2] * c + B[2] * sn];
        const k = lobe ? lobe(a, i) : 1;
        const rr = r * k;
        this.pos.push(p[0] + d[0] * rr, p[1] + d[1] * rr, p[2] + d[2] * rr);
        let nn = norm([d[0] - t[0] * drds * k, d[1] - t[1] * drds * k, d[2] - t[2] * drds * k]);
        if (lobe) {
          // Querschnitts-Neigung: Ableitung des Wulstfaktors rundum kippt die Normale seitlich
          const e = 0.02;
          const dk = (lobe(a + e, i) - lobe(a - e, i)) / (2 * e);
          const tang: V3 = [-N[0] * sn + B[0] * c, -N[1] * sn + B[1] * c, -N[2] * sn + B[2] * c];
          nn = norm([nn[0] - tang[0] * (dk / Math.max(0.2, k)), nn[1] - tang[1] * (dk / Math.max(0.2, k)), nn[2] - tang[2] * (dk / Math.max(0.2, k))]);
        }
        this.nor.push(nn[0], nn[1], nn[2]);
        this.bark.push(j / radial, s[i]!, level, rr);
      }
    }
    const ring = radial + 1;
    for (let i = 0; i < n - 1; i++) {
      for (let j = 0; j < radial; j++) {
        const a = base + i * ring + j;
        const b = a + ring;
        this.idx.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
    return s[n - 1]!;
  }

  /** Fügt ein fertiges Stück hinzu (Positionen, Normalen, Rinde, Indizes relativ zum Stück). */
  append(pos: ArrayLike<number>, nor: ArrayLike<number>, bark: ArrayLike<number>, idx: ArrayLike<number>): void {
    const base = this.vertexCount;
    for (let i = 0; i < pos.length; i++) this.pos.push(pos[i]!);
    for (let i = 0; i < nor.length; i++) this.nor.push(nor[i]!);
    for (let i = 0; i < bark.length; i++) this.bark.push(bark[i]!);
    for (let i = 0; i < idx.length; i++) this.idx.push(idx[i]! + base);
  }

  toGeometry(): BufferGeometry {
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new Float32BufferAttribute(this.nor, 3));
    g.setAttribute('bark', new Float32BufferAttribute(this.bark, 4));
    g.setIndex(this.vertexCount < 65535 ? new Uint16BufferAttribute(this.idx, 1) : new Uint32BufferAttribute(this.idx, 1));
    g.computeBoundingSphere();
    return g;
  }
}

// --- Vektorhelfer ------------------------------------------------------------------------------------

export function add(a: V3, b: V3): V3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}
export function sub(a: V3, b: V3): V3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
export function scale(a: V3, s: number): V3 {
  return [a[0] * s, a[1] * s, a[2] * s];
}
export function dot(a: V3, b: V3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
export function cross(a: V3, b: V3): V3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
export function len(a: V3): number {
  return Math.hypot(a[0], a[1], a[2]);
}
export function norm(a: V3): V3 {
  const l = len(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
}
export function lerp3(a: V3, b: V3, t: number): V3 {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
/** Richtung aus Azimut (um +Y) und Elevation über der Horizontalen (rad). */
export function dirFrom(az: number, el: number): V3 {
  return [Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el)];
}
/** Quadratische Bézierkurve p0 → p2 mit Kontrollpunkt p1, `n` Punkte inkl. Enden. */
export function bezier(p0: V3, p1: V3, p2: V3, n: number): V3[] {
  const out: V3[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const a = (1 - t) * (1 - t);
    const b = 2 * (1 - t) * t;
    const c = t * t;
    out.push([a * p0[0] + b * p1[0] + c * p2[0], a * p0[1] + b * p1[1] + c * p2[1], a * p0[2] + b * p1[2] + c * p2[2]]);
  }
  return out;
}
/** Kubische Bézierkurve, `n` Punkte inkl. Enden. */
export function bezier3(p0: V3, p1: V3, p2: V3, p3: V3, n: number): V3[] {
  const out: V3[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const u = 1 - t;
    const a = u * u * u;
    const b = 3 * u * u * t;
    const c = 3 * u * t * t;
    const d = t * t * t;
    out.push([a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1], a * p0[2] + b * p1[2] + c * p2[2] + d * p3[2]]);
  }
  return out;
}
