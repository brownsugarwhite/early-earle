import { REX_BONES, REX_PALETTE, RexPart, createRexGeometry } from '@ee/render';
import type { BufferAttribute } from 'three';
import type { ExportContext } from '../context';
import { GlbWriter, hexToLinearRgba } from '../glb';
import { attrToFloat32 } from '../geometry';
import { pick, weld } from '../weld';

/**
 * REX, der Guide-Dino: das eine gehäutete Mesh des Spiels (`createRexGeometry`: Lofts, Kegel, Kuppeln,
 * Flossen, Augen, Maul, Zähne, Kamm, Sterne, Schweißtropfen — jeder Vertex auf ein oder zwei Knochen),
 * das 22-Knochen-Skelett (`REX_BONES`, Ruhe-Orientierungen = Identität), Teilcodes je Vertex (`rexPart`)
 * und die Logo-Palette. Die Dreiecksuppe wird verschweißt, wo Position, Normale und Skin gleich sind.
 */

/** Deutsche Knochennamen (Blender, .L/.R = REX' linke/rechte Seite, +x = links). */
export const REX_BONE_NAMES: Record<string, string> = {
  root: 'Wurzel',
  hips: 'Hüfte',
  chest: 'Brust',
  neck: 'Hals',
  head: 'Kopf',
  jaw: 'Unterkiefer',
  armL1: 'Oberarm.L',
  armL2: 'Unterarm.L',
  armR1: 'Oberarm.R',
  armR2: 'Unterarm.R',
  legL: 'Bein.L',
  footL: 'Fuß.L',
  legR: 'Bein.R',
  footR: 'Fuß.R',
  tail0: 'Schwanz.01',
  tail1: 'Schwanz.02',
  tail2: 'Schwanz.03',
  tail3: 'Schwanz.04',
  halo: 'Schwindelkranz',
  sweat: 'Schweißtropfen',
  crestHead: 'Kopfkamm',
  sparkle: 'Funkeln',
};

const PART_LABELS: Record<string, string> = { skin: 'Haut', mouth: 'Maul', throat: 'Rachen', tooth: 'Zähne', ink: 'Tinte', eyeL: 'Auge links', eyeR: 'Auge rechts', crest: 'Kamm', star: 'Sterne', gas: 'Gas', sweat: 'Schweiß' };

export function exportRex(ctx: ExportContext): { file: string; vertices: number; triangles: number; bones: number } {
  const { geometry, info } = createRexGeometry();
  const pos = attrToFloat32(geometry.getAttribute('position') as BufferAttribute);
  const nor = attrToFloat32(geometry.getAttribute('normal') as BufferAttribute);
  const si = attrToFloat32(geometry.getAttribute('skinIndex') as BufferAttribute);
  const sw = attrToFloat32(geometry.getAttribute('skinWeight') as BufferAttribute);
  const part = attrToFloat32(geometry.getAttribute('rexPart') as BufferAttribute);
  const uv = attrToFloat32(geometry.getAttribute('rexUv') as BufferAttribute);
  const welded = weld({ positions: pos, normals: nor, extra: [{ data: si, itemSize: 4 }, { data: sw, itemSize: 4 }, { data: part, itemSize: 1 }, { data: uv, itemSize: 2 }] });

  const w = new GlbWriter();
  // Joints: REX_BONES hierarchy, identity rest rotations (translation relative to the parent).
  const nodes: number[] = [];
  const kids = new Map<number, number[]>();
  REX_BONES.forEach((b, i) => {
    if (b.parent >= 0) kids.set(b.parent, [...(kids.get(b.parent) ?? []), i]);
  });
  const makeJoint = (i: number): number => {
    const b = REX_BONES[i]!;
    const p = b.parent >= 0 ? REX_BONES[b.parent]!.rest : [0, 0, 0];
    const children = (kids.get(i) ?? []).map(makeJoint);
    const n = w.node({ name: REX_BONE_NAMES[b.name] ?? b.name, children, matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, b.rest[0] - p[0]!, b.rest[1] - p[1]!, b.rest[2] - p[2]!, 1], extras: { bone: b.name } });
    nodes[i] = n;
    return n;
  };
  const skelRoot = makeJoint(0);
  const ibm = new Float32Array(REX_BONES.length * 16);
  REX_BONES.forEach((b, i) => ibm.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -b.rest[0], -b.rest[1], -b.rest[2], 1], i * 16));
  const skin = w.skin(nodes, ibm, skelRoot);

  const joints = pick(si, 4, welded.source, Uint16Array);
  const mat = w.material('REX · Haut', hexToLinearRgba(REX_PALETTE.skin[2]!));
  const mesh = w.mesh('REX', [
    {
      attributes: {
        POSITION: w.accessor(pick(pos, 3, welded.source, Float32Array), 'VEC3', { minmax: true }),
        NORMAL: w.accessor(pick(nor, 3, welded.source, Float32Array), 'VEC3'),
        TEXCOORD_0: w.accessor(pick(uv, 2, welded.source, Float32Array), 'VEC2'),
        JOINTS_0: w.accessor(joints, 'VEC4'),
        WEIGHTS_0: w.accessor(pick(sw, 4, welded.source, Float32Array), 'VEC4'),
        _PART: w.accessor(pick(part, 1, welded.source, Float32Array), 'SCALAR'),
      },
      indices: w.accessor(welded.index, 'SCALAR'),
      material: mat,
    },
  ]);
  const body = w.node({ name: 'REX · Körper', mesh, skin });
  const parts = Object.fromEntries(Object.entries(RexPart).map(([k, v]) => [String(v), { key: k, label: PART_LABELS[k] ?? k }]));
  const root = w.node({
    name: 'REX',
    children: [skelRoot, body],
    extras: {
      ee: 'rex',
      bones: REX_BONES.map((b) => ({ name: REX_BONE_NAMES[b.name] ?? b.name, id: b.name, parent: b.parent >= 0 ? REX_BONE_NAMES[REX_BONES[b.parent]!.name] ?? REX_BONES[b.parent]!.name : null, rest: b.rest })),
      palette: REX_PALETTE,
      parts,
      info,
      hidden: ['halo', 'sweat', 'sparkle'].map((b) => REX_BONE_NAMES[b]),
    },
  });
  w.root(root);
  const file = ctx.writeGlb('rex/rex.glb', w);
  ctx.log(`REX: ${welded.source.length} Vertices (aus ${pos.length / 3}), ${welded.index.length / 3} Dreiecke`);
  return { file, vertices: welded.source.length, triangles: welded.index.length / 3, bones: REX_BONES.length };
}
