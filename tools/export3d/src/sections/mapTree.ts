import { Matrix4, type BufferAttribute, type BufferGeometry, type InstancedBufferAttribute, type InstancedMesh, type Mesh, type Object3D } from 'three';
import type { ExportContext } from '../context';
import { GlbWriter } from '../glb';
import { attrToFloat32, geometryArrays, primitiveOf } from '../geometry';
import { instancingNode } from '../instances';

/**
 * Der Riesenbaum (Wahrzeichen von Welt 01) aus der echten `createHeroTree`-Instanz der Map: jedes Teil-Mesh
 * generisch — normale Meshes (Stamm) mit ihren Attributen, InstancedMesh (Kuppeln) als Instanzen, instanzierte
 * Billboards (Punkte, Glyphen, Sternnadeln, Blüten) als Punktwolken mit Normale und allen Instanzdaten plus ihrer
 * Glyph-Vorlage. Die Äste (Instanzen aus Anfang/Ende/Radien) werden zu echten Röhren. Baumraum: Fuß im Ursprung,
 * +Y oben; `holder` = Lage auf dem Planeten.
 */

interface SiteLike {
  tree: { group: Object3D; parts: Record<string, Mesh>; rows?: unknown; stats?: unknown };
  holder: Object3D;
  height: number;
  first: number;
  last: number;
}

type Inst = InstancedBufferAttribute;

function instAttrs(g: BufferGeometry): Array<[string, Inst]> {
  return Object.entries(g.attributes).filter(([, a]) => (a as Inst).isInstancedBufferAttribute === true) as Array<[string, Inst]>;
}

/** Konische Röhre je Ast-Segment (Anfang A, Ende B, Radien r0 → r1), 8 Seiten. */
function branchTubes(g: BufferGeometry, count: number): { pos: Float32Array; nor: Float32Array; idx: Uint32Array; level: Float32Array } {
  const A = g.getAttribute('segA') as Inst;
  const B = g.getAttribute('segB') as Inst;
  const R = g.getAttribute('segR') as Inst;
  const D = g.getAttribute('segData') as Inst | undefined;
  const sides = 8;
  const pos: number[] = [];
  const nor: number[] = [];
  const lev: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i < count; i++) {
    const a = [A.getX(i), A.getY(i), A.getZ(i)];
    const b = [B.getX(i), B.getY(i), B.getZ(i)];
    const d = [b[0]! - a[0]!, b[1]! - a[1]!, b[2]! - a[2]!];
    const len = Math.hypot(d[0]!, d[1]!, d[2]!) || 1e-4;
    const dir = [d[0]! / len, d[1]! / len, d[2]! / len];
    const ref = Math.abs(dir[1]!) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    let rx = ref[1]! * dir[2]! - ref[2]! * dir[1]!;
    let ry = ref[2]! * dir[0]! - ref[0]! * dir[2]!;
    let rz = ref[0]! * dir[1]! - ref[1]! * dir[0]!;
    const rl = Math.hypot(rx, ry, rz) || 1;
    rx /= rl;
    ry /= rl;
    rz /= rl;
    const fx = dir[1]! * rz - dir[2]! * ry;
    const fy = dir[2]! * rx - dir[0]! * rz;
    const fz = dir[0]! * ry - dir[1]! * rx;
    const base = pos.length / 3;
    for (let end = 0; end < 2; end++) {
      const c = end === 0 ? a : b;
      const r = end === 0 ? R.getX(i) : R.getY(i);
      for (let k = 0; k < sides; k++) {
        const t = (k / sides) * Math.PI * 2;
        const nx = rx * Math.cos(t) + fx * Math.sin(t);
        const ny = ry * Math.cos(t) + fy * Math.sin(t);
        const nz = rz * Math.cos(t) + fz * Math.sin(t);
        pos.push(c[0]! + nx * r, c[1]! + ny * r, c[2]! + nz * r);
        nor.push(nx, ny, nz);
        lev.push(D ? D.getW(i) : 0);
      }
    }
    for (let k = 0; k < sides; k++) {
      const k2 = (k + 1) % sides;
      idx.push(base + k, base + k2, base + sides + k2, base + k, base + sides + k2, base + sides + k);
    }
  }
  return { pos: new Float32Array(pos), nor: new Float32Array(nor), idx: new Uint32Array(idx), level: new Float32Array(lev) };
}

export function exportHeroTree(ctx: ExportContext, site: SiteLike): Record<string, unknown> {
  const w = new GlbWriter();
  const tree = site.tree;
  const children: number[] = [];
  const parts: Record<string, unknown> = {};
  tree.group.updateMatrixWorld(true);
  for (const [key, obj] of Object.entries(tree.parts)) {
    const mesh = obj as Mesh;
    const g = mesh.geometry as BufferGeometry & { isInstancedBufferGeometry?: boolean; instanceCount?: number };
    const im = mesh as unknown as InstancedMesh & { isInstancedMesh?: boolean };
    const label = mesh.name || key;
    try {
      if (key === 'branches' && g.getAttribute('segA')) {
        const count = g.instanceCount ?? 0;
        const t = branchTubes(g, count);
        const mat = w.material('Riesenbaum · Äste', [0.02, 0.05, 0.1, 1], { part: key });
        const m = w.mesh('Äste', [{ attributes: { POSITION: w.accessor(t.pos, 'VEC3', { minmax: true }), NORMAL: w.accessor(t.nor, 'VEC3'), _LEVEL: w.accessor(t.level, 'SCALAR') }, indices: w.accessor(t.idx, 'SCALAR'), material: mat }]);
        children.push(w.node({ name: 'Riesenbaum · Äste', mesh: m, extras: { part: key, segments: count } }));
        parts[key] = { segments: count };
      } else if (im.isInstancedMesh) {
        const mat = w.material(`Riesenbaum · ${key}`, [0.2, 0.2, 0.5, 1], { part: key });
        const tmpl = w.mesh(`${key} Vorlage`, [primitiveOf(w, g, mat)]);
        const attrs = instAttrs(g);
        const items = [];
        for (let i = 0; i < im.count; i++) {
          const a: Record<string, number> = {};
          for (const [name, at] of attrs) {
            a[`${name}_x`] = at.getX(i);
            if (at.itemSize > 1) a[`${name}_y`] = at.getY(i);
            if (at.itemSize > 2) a[`${name}_z`] = at.getZ(i);
            if (at.itemSize > 3) a[`${name}_w`] = at.getW(i);
          }
          items.push({ m: Array.from(im.instanceMatrix.array.slice(i * 16, i * 16 + 16)), attrs: a });
        }
        const node = instancingNode(w, `Riesenbaum · ${key}`, tmpl, items, { part: key, name: label });
        if (node >= 0) children.push(node);
        parts[key] = { instances: items.length };
      } else if (g.isInstancedBufferGeometry) {
        const count = g.instanceCount ?? 0;
        if (count <= 0) continue;
        const attrs = instAttrs(g);
        const find = (suffix: string): Inst | undefined => attrs.find(([n]) => n.toLowerCase().endsWith(suffix))?.[1];
        const rel = find('rel');
        const hull = find('hull');
        const pos0 = find('pos') ?? find('base');
        const normal = find('normal');
        const P = new Float32Array(count * 3);
        const N = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
          const hx = hull ? hull.getX(i) : pos0 ? pos0.getX(i) : 0;
          const hy = hull ? hull.getY(i) : pos0 ? pos0.getY(i) : 0;
          const hz = hull ? hull.getZ(i) : pos0 ? pos0.getZ(i) : 0;
          P[i * 3] = hx + (rel ? rel.getX(i) : 0);
          P[i * 3 + 1] = hy + (rel ? rel.getY(i) : 0);
          P[i * 3 + 2] = hz + (rel ? rel.getZ(i) : 0);
          N[i * 3] = normal ? normal.getX(i) : 0;
          N[i * 3 + 1] = normal ? normal.getY(i) : 1;
          N[i * 3 + 2] = normal ? normal.getZ(i) : 0;
        }
        const attributes: Record<string, number> = { POSITION: w.accessor(P, 'VEC3', { minmax: true }), NORMAL: w.accessor(N, 'VEC3') };
        for (const [name, at] of attrs) {
          if (at === rel || at === hull || at === pos0 || at === normal) continue;
          const data = attrToFloat32(at, count);
          const type = at.itemSize === 1 ? 'SCALAR' : at.itemSize === 2 ? 'VEC2' : at.itemSize === 3 ? 'VEC3' : 'VEC4';
          attributes[`_${name.toUpperCase()}`] = w.accessor(data, type);
        }
        const pts = w.mesh(`${key} Punkte`, [{ mode: 0, attributes }]);
        // Glyph-Vorlage (Sechseck, Stern, Blüte, Motiv) in der XY-Ebene
        const tmplArrays = geometryArrays(g, ['part', 'petal']);
        const tmplMat = w.material(`Riesenbaum · ${key} Glyphe`, [0.9, 0.9, 0.8, 1], { part: key });
        const tmpl = w.mesh(`${key} Glyphe`, [primitiveOf(w, tmplArrays, tmplMat)]);
        const tmplNode = w.node({ name: `Riesenbaum · ${key} Glyphe`, mesh: tmpl, extras: { part: key, template: true } });
        children.push(w.node({ name: `Riesenbaum · ${key}`, mesh: pts, children: [tmplNode], extras: { part: key, points: count, name: label } }));
        parts[key] = { points: count };
      } else {
        const extra = Object.keys(g.attributes).filter((n) => !['position', 'normal', 'uv'].includes(n));
        const mat = w.material(`Riesenbaum · ${key}`, [0.05, 0.2, 0.5, 1], { part: key });
        const m = w.mesh(key, [primitiveOf(w, g, mat, extra)]);
        mesh.updateMatrix();
        children.push(w.node({ name: `Riesenbaum · ${key === 'trunk' ? 'Stamm' : key}`, mesh: m, matrix: mesh.matrix.elements, extras: { part: key, attributes: extra } }));
        parts[key] = { vertices: (g.getAttribute('position') as BufferAttribute).count };
      }
    } catch (e) {
      ctx.warn('map', `Riesenbaum-Teil ${key}: ${String(e)}`);
    }
  }
  site.holder.updateMatrix();
  const holder = new Matrix4().copy(site.holder.matrix).multiply(tree.group.matrix);
  const rows = (tree as { rows?: unknown }).rows ?? null;
  w.root(w.node({ name: 'Riesenbaum', children, matrix: holder.elements, extras: { ee: 'riesenbaum', height: site.height, levels: [site.first + 1, site.last + 1], rows, stats: (tree as { stats?: unknown }).stats ?? null, parts } }));
  const file = ctx.writeGlb('map/riesenbaum.glb', w);
  return { file, parts };
}
