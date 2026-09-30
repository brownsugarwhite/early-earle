import { Matrix4, Sphere, Vector3 } from 'three/webgpu';
import type { BufferGeometry, InstancedMesh, Mesh, Object3D } from 'three/webgpu';
import type { ReceiverVolume } from './fit';

/**
 * Schatten v3 — Empfänger-Volumen für die bodengefitteten Kaskaden.
 *
 * Die Kaskaden decken den Boden ± Toleranz ab; was darüber aufragt und Schatten empfängt (Riesenbaum-Holz und -Kuppeln,
 * eine Scheune), kommt als Kugeln dazu. Eine einzige Hüllkugel um den Riesenbaum (r ≈ 9) machte die Texel in seiner
 * Nähe 2–3× gröber. Darum: jedes Empfängerobjekt wird im Planetenraum in Zellen von `VOLUME_CELL_SIZE` zerlegt (Dreiecke
 * bzw. Instanzkugeln nach ihrem Mittelpunkt), und nur Zellen, deren Inhalt über das Bodenband ragt, werden Kugeln
 * (höchstens `MAX_VOLUME_CELLS` je Objekt, sonst gröber zusammengefasst). Flache Schichten (Pfadband, Steine am Pfad,
 * Wasser, Müllfelder) fallen so von selbst heraus, Stammfüße und Wurzeln ebenso; Instanzen, die erst der Shader platziert
 * (Instanzmatrizen ohne Versatz → Planetenmitte), liegen unter dem Boden. Große Instanz-Schichten (> 512, Wald, Streu)
 * werden gar nicht erst vermessen.
 *
 * `userData.shadowVolume = true` erzwingt (alle Zellen), `false` schließt aus; `userData.shadowGround = true` und
 * `chunk-*` sind Gelände. `userData.shadowHeight = h` (Welteinheiten über dem Boden) meldet eine verteilte Schicht hoher
 * Empfänger (Wald, dessen Kronen Schlagschatten tragen): die gröbste Kaskade deckt dann auch Boden + h ab
 * (`receiverHeight` → `coverAbove`), ohne dass die Schicht ein Volumen wird.
 */

/** Kugelhülle: je Kugel x, y, z, r (Vereinigung enthält jedes Primitiv). */
export interface SphereCover {
  readonly data: Float32Array;
  readonly count: number;
}

/**
 * Was der Sammler vom Planeten braucht: Kugel (alt, `surfaceRadius` je Richtung im Planetenraum) oder Ebene (ADR 0002:
 * `heightAt(x, z)` absolut und der Fokus — der Raum des Planetenobjekts ist Ebene − Fokus, Höhen absolut).
 */
export interface VolumePlanetLike {
  surfaceRadius?(dirLocal: Vector3): number;
  heightAt?(x: number, z: number): number;
  readonly focus?: { x: number; z: number };
}

/** Kantenlänge der Zellen im Planetenraum (Welteinheiten bei Planetenmaßstab 1). */
export const VOLUME_CELL_SIZE = 2;
/** Höchstens so viele Kugeln je Objekt. */
export const MAX_VOLUME_CELLS = 64;
/** Instanz-Schichten mit mehr Instanzen gelten als Streu am Boden (Wald, Steine) und werden nicht vermessen. */
export const MAX_VOLUME_INSTANCES = 512;
/** Große Geometrien (Dreiecke), die sich laufend ändern oder bewegen, höchstens alle 0,5 s neu vermessen. */
const BIG_GEOMETRY_TRIANGLES = 20000;
const BIG_RECLASSIFY_INTERVAL_MS = 500;
/** Alle anderen höchstens alle 0,1 s (bewegte Requisiten, animierte Instanzen): Volumen hinken kurz nach. */
const RECLASSIFY_INTERVAL_MS = 100;

const _min = new Vector3();
const _max = new Vector3();
const _m = new Matrix4();
const _p = new Vector3();
const _dir = new Vector3();
const _sph = new Sphere();
const now = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/**
 * Grobe Kugelhülle aus achsenparallelen Boxen: Gitter über der Gesamtbox mit höchstens `maxCells` Zellen (etwa würfelig,
 * bis 8 entlang der längsten Achse). Jede Box zählt zur Zelle ihres Mittelpunkts und erweitert deren Box ganz — die
 * Vereinigung der Zellkugeln (um die Zellboxen) enthält jede Box vollständig.
 */
export function coverFromBoxes(count: number, boxAt: (i: number, min: Vector3, max: Vector3) => boolean, maxCells = MAX_VOLUME_CELLS): SphereCover | null {
  let x0 = Infinity;
  let y0 = Infinity;
  let z0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  let z1 = -Infinity;
  for (let i = 0; i < count; i++) {
    if (!boxAt(i, _min, _max)) continue;
    x0 = Math.min(x0, _min.x);
    y0 = Math.min(y0, _min.y);
    z0 = Math.min(z0, _min.z);
    x1 = Math.max(x1, _max.x);
    y1 = Math.max(y1, _max.y);
    z1 = Math.max(z1, _max.z);
  }
  if (!(x1 >= x0 && y1 >= y0 && z1 >= z0) || !Number.isFinite(x0 + y0 + z0 + x1 + y1 + z1)) return null;
  const sx = x1 - x0;
  const sy = y1 - y0;
  const sz = z1 - z0;
  const longest = Math.max(sx, sy, sz);
  let nx = 1;
  let ny = 1;
  let nz = 1;
  if (longest > 0) {
    let s = longest / 8;
    for (let guard = 0; guard < 40; guard++) {
      nx = Math.max(1, Math.ceil(sx / s - 1e-9));
      ny = Math.max(1, Math.ceil(sy / s - 1e-9));
      nz = Math.max(1, Math.ceil(sz / s - 1e-9));
      if (nx * ny * nz <= maxCells) break;
      s *= 1.25;
    }
  }
  const cells = nx * ny * nz;
  const box = new Float64Array(cells * 6);
  for (let k = 0; k < cells; k++) {
    box[k * 6] = box[k * 6 + 1] = box[k * 6 + 2] = Infinity;
    box[k * 6 + 3] = box[k * 6 + 4] = box[k * 6 + 5] = -Infinity;
  }
  const cellOf = (v: number, lo: number, size: number, n: number): number => (n === 1 || size <= 0 ? 0 : Math.min(n - 1, Math.max(0, Math.floor(((v - lo) / size) * n))));
  for (let i = 0; i < count; i++) {
    if (!boxAt(i, _min, _max)) continue;
    const ix = cellOf((_min.x + _max.x) * 0.5, x0, sx, nx);
    const iy = cellOf((_min.y + _max.y) * 0.5, y0, sy, ny);
    const iz = cellOf((_min.z + _max.z) * 0.5, z0, sz, nz);
    const k = ((iz * ny + iy) * nx + ix) * 6;
    box[k] = Math.min(box[k]!, _min.x);
    box[k + 1] = Math.min(box[k + 1]!, _min.y);
    box[k + 2] = Math.min(box[k + 2]!, _min.z);
    box[k + 3] = Math.max(box[k + 3]!, _max.x);
    box[k + 4] = Math.max(box[k + 4]!, _max.y);
    box[k + 5] = Math.max(box[k + 5]!, _max.z);
  }
  const out: number[] = [];
  for (let k = 0; k < cells; k++) {
    const b = k * 6;
    if (!(box[b + 3]! >= box[b]!)) continue;
    const hx = (box[b + 3]! - box[b]!) * 0.5;
    const hy = (box[b + 4]! - box[b + 1]!) * 0.5;
    const hz = (box[b + 5]! - box[b + 2]!) * 0.5;
    out.push(box[b]! + hx, box[b + 1]! + hy, box[b + 2]! + hz, Math.hypot(hx, hy, hz));
  }
  return { data: new Float32Array(out), count: out.length / 4 };
}

/**
 * Zellraster im Planetenraum: sammelt Primitiv-Boxen nach ihrem Mittelpunkt und merkt je Zelle den größten Abstand zur
 * Planetenmitte (Oberkante des Inhalts).
 */
class CellGrid {
  private readonly index = new Map<number, number>();
  readonly box: number[] = [];
  readonly top: number[] = [];

  constructor(private readonly size: number) {}

  add(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, top: number): void {
    const s = this.size;
    const ix = Math.max(-1000, Math.min(1000, Math.floor((x0 + x1) * 0.5 / s)));
    const iy = Math.max(-1000, Math.min(1000, Math.floor((y0 + y1) * 0.5 / s)));
    const iz = Math.max(-1000, Math.min(1000, Math.floor((z0 + z1) * 0.5 / s)));
    const key = ((ix + 1024) * 2048 + (iy + 1024)) * 2048 + (iz + 1024);
    let k = this.index.get(key);
    if (k === undefined) {
      k = this.top.length;
      this.index.set(key, k);
      this.box.push(x0, y0, z0, x1, y1, z1);
      this.top.push(top);
      return;
    }
    const b = k * 6;
    const box = this.box;
    box[b] = Math.min(box[b]!, x0);
    box[b + 1] = Math.min(box[b + 1]!, y0);
    box[b + 2] = Math.min(box[b + 2]!, z0);
    box[b + 3] = Math.max(box[b + 3]!, x1);
    box[b + 4] = Math.max(box[b + 4]!, y1);
    box[b + 5] = Math.max(box[b + 5]!, z1);
    this.top[k] = Math.max(this.top[k]!, top);
  }

  get count(): number {
    return this.top.length;
  }
}

/**
 * Zellen behalten, deren Inhalt über das Bodenband ragt (Oberkante − Gelände unter der Zellmitte > `tolerance`), oder
 * alle (`force`); als Kugeln (mit Rand für Krümmungs-Warp und Kaskadenkante), bei zu vielen gröber zusammengefasst.
 */
function keptSpheres(grid: CellGrid, planet: VolumePlanetLike, tolerance: number, force: boolean): Float32Array {
  const keep: number[] = [];
  for (let k = 0; k < grid.count; k++) {
    const b = k * 6;
    if (!force) {
      _p.set((grid.box[b]! + grid.box[b + 3]!) * 0.5, (grid.box[b + 1]! + grid.box[b + 4]!) * 0.5, (grid.box[b + 2]! + grid.box[b + 5]!) * 0.5);
      let ground: number;
      if (planet.heightAt) {
        // Ebene: Zellen in absoluten Ebenenkoordinaten, Oberkante = höchstes y
        ground = planet.heightAt(_p.x, _p.z);
      } else {
        const len = _p.length();
        if (len <= 1e-9) continue;
        ground = planet.surfaceRadius!(_dir.copy(_p).divideScalar(len));
      }
      if (grid.top[k]! - ground <= tolerance) continue;
    }
    keep.push(k);
  }
  let cover: SphereCover | null;
  if (keep.length <= MAX_VOLUME_CELLS) {
    const data = new Float32Array(keep.length * 4);
    keep.forEach((k, i) => {
      const b = k * 6;
      const hx = (grid.box[b + 3]! - grid.box[b]!) * 0.5;
      const hy = (grid.box[b + 4]! - grid.box[b + 1]!) * 0.5;
      const hz = (grid.box[b + 5]! - grid.box[b + 2]!) * 0.5;
      data[i * 4] = grid.box[b]! + hx;
      data[i * 4 + 1] = grid.box[b + 1]! + hy;
      data[i * 4 + 2] = grid.box[b + 2]! + hz;
      data[i * 4 + 3] = Math.hypot(hx, hy, hz);
    });
    cover = { data, count: keep.length };
  } else {
    cover = coverFromBoxes(keep.length, (i, mn, mx) => {
      const b = keep[i]! * 6;
      mn.set(grid.box[b]!, grid.box[b + 1]!, grid.box[b + 2]!);
      mx.set(grid.box[b + 3]!, grid.box[b + 4]!, grid.box[b + 5]!);
      return true;
    });
  }
  if (!cover) return new Float32Array(0);
  for (let i = 0; i < cover.count; i++) cover.data[i * 4 + 3] = cover.data[i * 4 + 3]! * 1.05 + 0.2;
  return cover.data;
}

/** Dreiecke einer Geometrie (über `rel` im Planetenraum) ins Zellraster; `flat`: Oberkante = y (Ebene) statt Radius. */
function gridOfGeometry(geometry: BufferGeometry, rel: Matrix4, size: number, flat = false): CellGrid | null {
  const pos = geometry.getAttribute('position');
  if (!pos || pos.count === 0) return null;
  const index = geometry.getIndex();
  const vc = pos.count;
  const vx = new Float64Array(vc);
  const vy = new Float64Array(vc);
  const vz = new Float64Array(vc);
  const vr = new Float64Array(vc);
  for (let i = 0; i < vc; i++) {
    _p.set(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(rel);
    vx[i] = _p.x;
    vy[i] = _p.y;
    vz[i] = _p.z;
    vr[i] = flat ? _p.y : _p.length();
  }
  const grid = new CellGrid(size);
  const tris = Math.floor((index ? index.count : vc) / 3);
  if (tris === 0) {
    for (let i = 0; i < vc; i++) grid.add(vx[i]!, vy[i]!, vz[i]!, vx[i]!, vy[i]!, vz[i]!, vr[i]!);
    return grid;
  }
  for (let t = 0; t < tris; t++) {
    const a = index ? index.getX(t * 3) : t * 3;
    const b = index ? index.getX(t * 3 + 1) : t * 3 + 1;
    const c = index ? index.getX(t * 3 + 2) : t * 3 + 2;
    if (a >= vc || b >= vc || c >= vc) continue;
    const top = Math.max(vr[a]!, vr[b]!, vr[c]!);
    if (!Number.isFinite(top)) continue;
    grid.add(
      Math.min(vx[a]!, vx[b]!, vx[c]!),
      Math.min(vy[a]!, vy[b]!, vy[c]!),
      Math.min(vz[a]!, vz[b]!, vz[c]!),
      Math.max(vx[a]!, vx[b]!, vx[c]!),
      Math.max(vy[a]!, vy[b]!, vy[c]!),
      Math.max(vz[a]!, vz[b]!, vz[c]!),
      top,
    );
  }
  return grid;
}

/** Instanzen (Hüllkugel der Geometrie je Instanzmatrix, über `rel` im Planetenraum) ins Zellraster. */
function gridOfInstances(mesh: InstancedMesh, rel: Matrix4, size: number, flat = false): CellGrid | null {
  const geometry = mesh.geometry;
  if (!geometry.boundingSphere) geometry.computeBoundingSphere();
  const gs = geometry.boundingSphere;
  if (!gs || !(gs.radius >= 0) || mesh.count <= 0) return null;
  const grid = new CellGrid(size);
  for (let i = 0; i < mesh.count; i++) {
    mesh.getMatrixAt(i, _m);
    _sph.copy(gs).applyMatrix4(_m).applyMatrix4(rel);
    const c = _sph.center;
    const r = _sph.radius;
    if (!(r >= 0) || !Number.isFinite(c.x + c.y + c.z + r)) continue;
    grid.add(c.x - r, c.y - r, c.z - r, c.x + r, c.y + r, c.z + r, (flat ? c.y : c.length()) + r);
  }
  return grid;
}

function attributeVersion(a: unknown): number {
  const x = a as { version?: number; data?: { version?: number } } | null;
  return x?.version ?? x?.data?.version ?? 0;
}

/** Schlüssel des Inhalts: Geometrieversion, bei Instanzen dazu eine reihenfolgeunabhängige Prüfsumme der Matrizen. */
function contentKey(mesh: Mesh & { isInstancedMesh?: boolean }): string {
  const geometry = mesh.geometry;
  const pos = geometry.getAttribute('position');
  const index = geometry.getIndex();
  let key = `${geometry.id}:${pos ? `${pos.count}:${attributeVersion(pos)}` : '-'}:${index ? `${index.count}:${attributeVersion(index)}` : '-'}`;
  if (mesh.isInstancedMesh) {
    const inst = mesh as unknown as InstancedMesh;
    const arr = inst.instanceMatrix.array as ArrayLike<number>;
    // ganzzahlig gerundet: exakt und unabhängig von der Reihenfolge (Kuppeln werden je Kamerastellung umsortiert)
    let s1 = 0;
    let s2 = 0;
    const n = Math.min(arr.length, inst.count * 16);
    for (let i = 0; i < n; i++) {
      const v = Math.round(arr[i]! * 4096);
      s1 += v;
      s2 += v * v;
    }
    key += `:${inst.count}:${s1}:${s2}`;
  }
  return key;
}

function triangleCount(geometry: BufferGeometry): number {
  const index = geometry.getIndex();
  const pos = geometry.getAttribute('position');
  return Math.floor((index ? index.count : pos ? pos.count : 0) / 3);
}

interface VolumeEntry {
  key: string;
  planet: VolumePlanetLike;
  tolerance: number;
  force: boolean;
  rel: Float64Array;
  at: number;
  /** behaltene Kugeln im Planetenraum: x, y, z, r (mit Rand) */
  parts: Float32Array;
}

const _planetInv = new Matrix4();
const _rel = new Matrix4();

function sameMatrix(a: Float64Array, b: Matrix4): boolean {
  const e = b.elements;
  for (let i = 0; i < 16; i++) if (Math.abs(a[i]! - e[i]!) > 1e-5 * Math.max(1, Math.abs(e[i]!))) return false;
  return true;
}

/**
 * Sammelt die Empfänger-Volumen eines Planeten je Refit (`ViewReceivers.volumes`). Vermisst jedes Objekt einmal (neu,
 * wenn es sich relativ zum Planeten bewegt, seine Geometrie/Instanzen oder der Planet wechseln; große Geometrien
 * höchstens alle 0,5 s) und liefert danach nur die behaltenen Kugeln in Weltkoordinaten.
 */
export class PlanetVolumeCollector {
  private readonly pool: ReceiverVolume[] = [];
  private readonly entries = new WeakMap<Object3D, VolumeEntry>();
  /** Objekte mit Volumen im letzten Aufruf (Diagnose). */
  objects = 0;
  /**
   * Größter Höhen-Hinweis (`userData.shadowHeight`, Welteinheiten über dem Boden) der sichtbaren Empfänger im letzten
   * Aufruf — für verteilte Schichten, die kein Volumen werden (Wald mit Schlagschatten auf den Kronen).
   */
  receiverHeight = 0;
  /** Neuvermessungen seit Beginn (Diagnose, Tests). */
  classifications = 0;

  /**
   * @param cellSize Zellkante im Planetenraum
   * @param throttle Neuvermessung bewegter/geänderter Objekte drosseln (0,1 s, große Geometrien 0,5 s); Tests: `false`
   */
  constructor(
    private readonly cellSize = VOLUME_CELL_SIZE,
    private readonly throttle = true,
  ) {}

  collect(planetObject: Object3D, planet: VolumePlanetLike | null, tolerance: number): ReceiverVolume[] {
    let n = 0;
    let objects = 0;
    let height = 0;
    if (!planet) {
      this.pool.length = 0;
      this.objects = 0;
      this.receiverHeight = 0;
      return this.pool;
    }
    _planetInv.copy(planetObject.matrixWorld).invert();
    const planetScale = planetObject.matrixWorld.getMaxScaleOnAxis();
    const t = now();
    planetObject.traverseVisible((o) => {
      const mesh = o as Mesh & { isInstancedMesh?: boolean };
      if (!mesh.isMesh || mesh.receiveShadow !== true) return;
      const data = mesh.userData as { shadowGround?: boolean; shadowVolume?: boolean; shadowHeight?: unknown };
      const hint = data.shadowHeight;
      if (typeof hint === 'number' && Number.isFinite(hint) && hint > height) height = hint;
      if (data.shadowGround === true || data.shadowVolume === false || mesh.name.startsWith('chunk-')) return;
      const force = data.shadowVolume === true;
      if (mesh.isInstancedMesh && (mesh as unknown as InstancedMesh).count > MAX_VOLUME_INSTANCES && !force) return;
      _rel.multiplyMatrices(_planetInv, mesh.matrixWorld);
      // Ebene: absolute Ebenenkoordinaten (Fokus addiert) — beim Schwenken bleibt die Vermessung gültig
      const flat = !!planet.focus;
      if (planet.focus) {
        _rel.elements[12] += planet.focus.x;
        _rel.elements[14] += planet.focus.z;
      }
      let e = this.entries.get(mesh);
      const stale = !e || e.planet !== planet || e.tolerance !== tolerance || e.force !== force || !sameMatrix(e.rel, _rel) || e.key !== contentKey(mesh);
      const interval = !mesh.isInstancedMesh && triangleCount(mesh.geometry) > BIG_GEOMETRY_TRIANGLES ? BIG_RECLASSIFY_INTERVAL_MS : RECLASSIFY_INTERVAL_MS;
      const throttled = this.throttle && !!e && stale && t - e.at < interval;
      if (stale && !throttled) {
        const grid = mesh.isInstancedMesh ? gridOfInstances(mesh as unknown as InstancedMesh, _rel, this.cellSize, flat) : gridOfGeometry(mesh.geometry, _rel, this.cellSize, flat);
        e = {
          key: contentKey(mesh),
          planet,
          tolerance,
          force,
          rel: new Float64Array(_rel.elements),
          at: t,
          parts: grid ? keptSpheres(grid, planet, tolerance, force) : new Float32Array(0),
        };
        this.entries.set(mesh, e);
        this.classifications++;
      }
      if (!e || e.parts.length === 0) return;
      objects++;
      const parts = e.parts;
      const fx = planet.focus?.x ?? 0;
      const fz = planet.focus?.z ?? 0;
      for (let i = 0; i < parts.length; i += 4) {
        const v = this.pool[n] ?? (this.pool[n] = { center: new Vector3(), radius: 0 });
        v.center.set(parts[i]! - fx, parts[i + 1]!, parts[i + 2]! - fz).applyMatrix4(planetObject.matrixWorld);
        v.radius = parts[i + 3]! * planetScale;
        n++;
      }
    });
    this.pool.length = n;
    this.objects = objects;
    this.receiverHeight = height;
    return this.pool;
  }
}
