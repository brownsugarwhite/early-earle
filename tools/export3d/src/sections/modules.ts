import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Matrix4 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { moduleFromScene, proceduralModules, type ModuleDef } from '@ee/render';
import type { ExportContext } from '../context';
import { GlbWriter, linearToHex } from '../glb';
import { primitiveOf } from '../geometry';

/**
 * Module: every part the creatures wear — the Blender modules of `content/genome/assets/*.glb` (parsed
 * exactly like the game: GLTFLoader + `moduleFromScene`) and the procedural modules built in code
 * (`proceduralModules()`: ear flaps, bills, frills, rope/plume tails …). One GLB per module in the
 * authoring conventions of tools/blender/README.md: root mesh = root segment, child segments with their
 * rest transforms, `SOCKET_<name>` empties (root, tip, knee, foot, lid …), material names Tint/Ink/Bone/
 * Accent/Iris, extras (slot, family, chain …) — so a library module can be re-exported with
 * `export_assets.py`.
 */

export interface ModuleEntry {
  id: string;
  slot: string;
  procedural: boolean;
  segments: number;
  faces: number;
  sockets: string[];
  file: string;
}

async function loadGlbModules(ctx: ExportContext): Promise<ModuleDef[]> {
  const dir = join(ctx.root, 'content/genome/assets');
  const out: ModuleDef[] = [];
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.glb')).sort()) {
    const id = f.replace(/\.glb$/, '');
    try {
      const buf = readFileSync(join(dir, f));
      const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
      const gltf = await new GLTFLoader().parseAsync(ab as ArrayBuffer, '');
      out.push(moduleFromScene(id, gltf.scene));
    } catch (e) {
      ctx.warn('module', `${f}: ${String(e)}`);
    }
  }
  return out;
}

function writeModule(ctx: ExportContext, def: ModuleDef, procedural: boolean): ModuleEntry {
  const w = new GlbWriter();
  const rule = ctx.rules.assets[def.id];
  // Segments (root first), each a mesh with one primitive per material.
  const segNodes: number[] = [];
  const children = new Map<number, number[]>();
  const materials = new Set<string>();
  def.segments.forEach((seg) => {
    const prims = seg.prims.map((p) => {
      materials.add(p.materialName);
      const mat = w.material(p.materialName || 'Tint', [p.color[0], p.color[1], p.color[2], 1], { hex: linearToHex(p.color[0], p.color[1], p.color[2]) });
      return primitiveOf(w, p.geometry, mat);
    });
    const mesh = w.mesh(seg.name, prims);
    const flags = { pupil: seg.pupil, lid: seg.lid, jaw: seg.jaw };
    // Root segment at the module origin (the game places it through rootSocketInverse only).
    const node = w.node({ name: seg.name, mesh, matrix: seg.parent < 0 ? undefined : seg.local.elements, extras: { segment: seg.index, ...flags } });
    segNodes.push(node);
    if (seg.parent >= 0) children.set(seg.parent, [...(children.get(seg.parent) ?? []), node]);
  });
  // Sockets under their segments; SOCKET_root = inverse(rootSocketInverse) in the root segment's frame.
  const sockets: string[] = ['root'];
  const rootSocket = w.node({ name: 'SOCKET_root', matrix: new Matrix4().copy(def.rootSocketInverse).invert().elements, extras: { socket: 'root' } });
  children.set(0, [...(children.get(0) ?? []), rootSocket]);
  for (const [name, s] of Object.entries(def.sockets)) {
    sockets.push(name);
    const node = w.node({ name: `SOCKET_${name}`, matrix: s.local.elements, extras: { socket: name } });
    children.set(s.segment, [...(children.get(s.segment) ?? []), node]);
  }
  for (const [seg, kids] of children) w.adopt(segNodes[seg]!, kids);
  const extras = {
    ee: 'modul',
    id: def.id,
    slot: def.slot,
    procedural,
    faces: def.faces,
    segments: def.segments.map((s) => ({ name: s.name, parent: s.parent, pupil: s.pupil, lid: s.lid, jaw: s.jaw })),
    materials: [...materials],
    moduleExtras: def.extras,
    rule: rule ?? null,
    slotLabel: ctx.rules.slots[def.slot as keyof typeof ctx.rules.slots]?.label ?? def.slot,
  };
  const wrapper = w.node({ name: def.id, children: [segNodes[0]!], extras });
  w.root(wrapper);
  const file = ctx.writeGlb(`module/${def.id}.glb`, w);
  return { id: def.id, slot: def.slot, procedural, segments: def.segments.length, faces: def.faces, sockets, file };
}

export async function exportModules(ctx: ExportContext): Promise<ModuleEntry[]> {
  const out: ModuleEntry[] = [];
  for (const def of await loadGlbModules(ctx)) out.push(writeModule(ctx, def, false));
  for (const def of proceduralModules()) {
    if (def.segments.length === 0) continue; // leg_sdf: the kneaded leg is the body itself
    if (out.some((e) => e.id === def.id)) continue;
    try {
      out.push(writeModule(ctx, def, true));
    } catch (e) {
      ctx.warn('module', `${def.id}: ${String(e)}`);
    }
  }
  const known = new Set(out.map((e) => e.id));
  for (const id of Object.keys(ctx.rules.assets)) if (!known.has(id)) ctx.warn('module', `rules.json nennt "${id}", aber es gibt weder GLB noch prozedurales Modul`);
  ctx.log(`Module: ${out.length} (${out.filter((e) => e.procedural).length} prozedural)`);
  return out;
}
