import { Euler, Matrix4, PerspectiveCamera, Quaternion, Vector3, type BufferGeometry, type InstancedBufferAttribute, type InstancedMesh } from 'three';
import type { ExportContext } from '../context';
import { GlbWriter, hexToLinearRgba } from '../glb';
import { geometryArrays, primitiveOf, type GeometryArrays } from '../geometry';
import { instancingNode, type InstanceItem } from '../instances';

/**
 * Spielfeld: das Brett des Spiels mit der „Elemente-Schau“ des Grid-Labs (jedes Element auf einem Brett) — das
 * Plateau (flacher Hügel mit gestuftem Rand und Tintenschatten), die Steinplatten (Stein, verdorrt, tief
 * verdorrt, Öl) und alle Element-Requisiten (Schrott, Schrotthügel, Kruste, Schläfer, Käfig, Nebel, Fäule,
 * Giftfass, Streuner, Sporen, Portale, Strömung, Zäune, Pfeiler, Büsche …) als Instanzen der Grundformen
 * (Quader, Sechskant, Spitze, Splitter, Scheibe, Ring, Kugel, Kuppel, Reif) mit ihrer Farbe aus dem Spiel.
 * Wesen stehen nicht auf dem Brett (die liegen im Abschnitt Wesen).
 */

/** Minimal-Canvas für die Ziffern-Textur der Stufen-Plaketten (in Node gibt es kein DOM). */
function installCanvasShim(): void {
  const g = globalThis as unknown as { document?: unknown };
  if (g.document) return;
  const ctx2d = new Proxy({}, { get: (_t, p) => (p === 'measureText' ? () => ({ width: 0 }) : () => undefined), set: () => true });
  const canvas = { width: 0, height: 0, getContext: () => ctx2d, style: {}, addEventListener: () => undefined };
  g.document = { createElement: () => canvas, createElementNS: () => canvas };
}

/** Schlüssel-Präfix einer Requisite → (Element, deutsche Bezeichnung). Unbekannte Präfixe behalten ihren Namen. */
const ELEMENT_GROUPS: Record<string, [string, string]> = {
  scrap: ['schrott', 'Schrott'],
  scrapJunk: ['schrott', 'Schrott'],
  mound: ['schrotthuegel', 'Schrotthügel'],
  moundBase: ['schrotthuegel', 'Schrotthügel'],
  moundStep: ['schrotthuegel', 'Schrotthügel'],
  portalRing: ['portal', 'Portal'],
  portalDisc: ['portal', 'Portal'],
  cage: ['kaefig', 'Käfig'],
  thorn: ['kaefig', 'Käfig'],
  pillar: ['pfeiler', 'Pfeiler'],
  pillarB: ['pfeiler', 'Pfeiler'],
  pillarC: ['pfeiler', 'Pfeiler'],
  toxic: ['giftfass', 'Giftfass'],
  toxicRing: ['giftfass', 'Giftfass'],
  rot: ['faeule', 'Fäule'],
  rotCore: ['faeule', 'Fäule'],
  rotNode: ['faeule', 'Fäule'],
  fence: ['zaun', 'Zaun'],
  fog: ['nebel', 'Nebel'],
  vent: ['stroemung', 'Strömung'],
  stream: ['stroemung', 'Strömung'],
  spore: ['spore', 'Spore'],
  sporeHalo: ['spore', 'Spore'],
  sporeStem: ['spore', 'Spore'],
  source: ['quelle', 'Quelle (Nachschub)'],
  sourceRim: ['quelle', 'Quelle (Nachschub)'],
  sourceMouth: ['quelle', 'Quelle (Nachschub)'],
  sourceVent: ['quelle', 'Quelle (Nachschub)'],
  goal: ['ziel', 'Ziel-Totem'],
  bush: ['busch', 'Busch'],
  crust: ['kruste', 'Kruste'],
  zzz: ['schlaefer', 'Schläfer'],
  lid: ['schlaefer', 'Schläfer'],
  orbit: ['spezialblob', 'Spezial-Blob (Strahl/Knall)'],
  core: ['amoebe', 'Amöben-Kern'],
  contact: ['kontaktschatten', 'Kontaktschatten'],
};

function labelOf(key: string): { id: string; label: string } {
  const prefix = key.split(':')[0] ?? key;
  const g = ELEMENT_GROUPS[prefix];
  return g ? { id: g[0], label: g[1] } : { id: prefix, label: prefix.charAt(0).toUpperCase() + prefix.slice(1) };
}

interface PropInstanceLike {
  key: string;
  family: string;
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
  sx: number;
  sy: number;
  sz: number;
  quat: Quaternion | null;
  color: string;
  motif: number;
  hatch: number;
  param: number;
  glow: number;
}

export async function exportBoard(ctx: ExportContext): Promise<Record<string, unknown>> {
  installCanvasShim();
  const { BoardRenderer } = await import('@ee/render');
  const { demoState, DEMO_LEVEL } = await import('@/lab/grid/demoLevel');
  const { ZONE_CONTENTS } = await import('@/lab/earle/zones');
  const zone = (ZONE_CONTENTS.find((z) => z.id === DEMO_LEVEL.zone) ?? ZONE_CONTENTS[0])!;
  const board = new BoardRenderer({ zone: 'tjorizo', palette: zone.palette, creatures: 'none', raymarch: false });
  const state = demoState();
  board.load(state);
  const cam = new PerspectiveCamera(50, 1, 0.1, 100);
  cam.position.set(0, 8, 6);
  cam.lookAt(0, 0, 0);
  board.update(0.016, cam);
  board.root.updateMatrixWorld(true);
  const w = new GlbWriter();
  const children: number[] = [];

  // --- Plateau ----------------------------------------------------------------------------------------
  const pg = board.plateau.mesh.geometry as BufferGeometry;
  const pa = geometryArrays(pg, ['band', 'slab', 'striate', 'along']);
  const slab = pa.extra.get('slab')?.data;
  if (slab) {
    // Tintenschatten (slab = 1) liegt im Spiel um den Sonnenversatz verschoben (−0.25, 0, 0.14).
    for (let i = 0; i < slab.length; i++) {
      if (slab[i]! < 0.5) continue;
      pa.position[i * 3] = pa.position[i * 3]! - 0.25;
      pa.position[i * 3 + 2] = pa.position[i * 3 + 2]! + 0.14;
    }
  }
  const pmat = w.material('Plateau', hexToLinearRgba(board.palette.top), { role: 'plateau' });
  const pmesh = w.mesh('Plateau', [primitiveOf(w, pa, pmat)]);
  children.push(w.node({ name: 'Plateau', mesh: pmesh, matrix: board.plateau.mesh.matrixWorld.elements, extras: { part: 'plateau', shape: board.plateau.shape } }));

  // --- Platten ------------------------------------------------------------------------------------------
  const cells = board.cells.mesh as InstancedMesh;
  const cg = cells.geometry;
  const cdata = cg.getAttribute('cellData') as InstancedBufferAttribute;
  const cellItems: InstanceItem[] = [];
  const cellsParent = new Matrix4().copy(cells.matrixWorld);
  for (let i = 0; i < cells.count; i++) {
    const m = new Matrix4().fromArray(Array.from(cells.instanceMatrix.array.slice(i * 16, i * 16 + 16)));
    if (Math.abs(m.determinant()) < 1e-9) continue;
    cellItems.push({ m: cellsParent.clone().multiply(m).toArray(), attrs: { kind: cdata.getX(i), heal: cdata.getY(i), seed: cdata.getW(i) } });
  }
  const cmat = w.material('Platte', hexToLinearRgba(board.palette.plate), { role: 'plate' });
  const cmesh = w.mesh('Platte', [primitiveOf(w, cg, cmat)]);
  const cellNode = instancingNode(w, 'Platten', cmesh, cellItems, { part: 'platten', kinds: { 0: 'Stein', 1: 'verdorrt', 2: 'tief verdorrt', 3: 'Öl' } });
  if (cellNode >= 0) children.push(cellNode);

  // --- Grundformen + Element-Requisiten ---------------------------------------------------------------
  const familyMesh = new Map<string, number>();
  const famNodes: number[] = [];
  for (const mesh of board.props.group.children as InstancedMesh[]) {
    const fams = mesh.name.replace('board-props-', '').split('+');
    const all = geometryArrays(mesh.geometry, ['propFamV']);
    const famAttr = all.extra.get('propFamV')?.data;
    fams.forEach((family, fi) => {
      const map = new Map<number, number>();
      const pos: number[] = [];
      const nor: number[] = [];
      const idx: number[] = [];
      for (let t = 0; t < all.index.length; t += 3) {
        const tri = [all.index[t]!, all.index[t + 1]!, all.index[t + 2]!];
        if (famAttr && !tri.every((v) => Math.round(famAttr[v]!) === fi)) continue;
        for (const v of tri) {
          let nv = map.get(v);
          if (nv === undefined) {
            nv = pos.length / 3;
            map.set(v, nv);
            pos.push(all.position[v * 3]!, all.position[v * 3 + 1]!, all.position[v * 3 + 2]!);
            nor.push(all.normal ? all.normal[v * 3]! : 0, all.normal ? all.normal[v * 3 + 1]! : 1, all.normal ? all.normal[v * 3 + 2]! : 0);
          }
          idx.push(nv);
        }
      }
      const arrays: GeometryArrays = { position: new Float32Array(pos), normal: new Float32Array(nor), uv: null, index: new Uint32Array(idx), extra: new Map() };
      const mat = w.material(`Grundform ${family}`, [0.6, 0.6, 0.6, 1], { family });
      const m = w.mesh(`Grundform ${family}`, [primitiveOf(w, arrays, mat)]);
      familyMesh.set(family, m);
      famNodes.push(w.node({ name: `Grundform · ${family}`, mesh: m, extras: { family } }));
    });
  }
  const instances = (board.props as unknown as { instances: Map<string, PropInstanceLike> }).instances;
  const propsParent = new Matrix4().copy(board.props.group.matrixWorld);
  const byElement = new Map<string, Map<string, InstanceItem[]>>();
  const colors = new Map<string, string>();
  const labels = new Map<string, string>();
  for (const inst of instances.values()) {
    const { id, label } = labelOf(inst.key);
    labels.set(id, label);
    const q = inst.quat ? inst.quat.clone() : new Quaternion().setFromEuler(new Euler(inst.rx, inst.ry, inst.rz));
    const m = propsParent.clone().multiply(new Matrix4().compose(new Vector3(inst.x, inst.y, inst.z), q, new Vector3(inst.sx, inst.sy, inst.sz)));
    const c = hexToLinearRgba(inst.color);
    const item: InstanceItem = { m: m.toArray(), attrs: { r: c[0], g: c[1], b: c[2], motif: inst.motif, hatch: inst.hatch, param: inst.param, glow: inst.glow } };
    let fam = byElement.get(id);
    if (!fam) byElement.set(id, (fam = new Map()));
    const list = fam.get(inst.family) ?? [];
    list.push(item);
    fam.set(inst.family, list);
    colors.set(id, inst.color);
  }
  const elementNodes: number[] = [];
  for (const [id, fams] of byElement) {
    const kids: number[] = [];
    for (const [family, items] of fams) {
      const mesh = familyMesh.get(family);
      if (mesh === undefined) continue;
      const n = instancingNode(w, `${labels.get(id) ?? id} · ${family}`, mesh, items, { element: id, family });
      if (n >= 0) kids.push(n);
    }
    elementNodes.push(w.node({ name: `Element · ${labels.get(id) ?? id}`, children: kids, extras: { element: id, label: labels.get(id) ?? id, color: colors.get(id) } }));
  }
  const root = w.node({
    name: 'Spielfeld',
    children: [...children, w.node({ name: 'Grundformen', children: famNodes, extras: { part: 'grundformen' } }), w.node({ name: 'Elemente', children: elementNodes, extras: { part: 'elemente' } })],
    extras: { ee: 'spielfeld', level: DEMO_LEVEL.id, levelName: DEMO_LEVEL.name, grid: DEMO_LEVEL.grid, palette: board.palette, zone: 'tjorizo', cell: { size: board.layout.cell, pitch: board.layout.pitch, top: board.layout.top } },
  });
  w.root(root);
  const file = ctx.writeGlb('spielfeld/elemente-schau.glb', w);
  ctx.log(`Spielfeld: ${cellItems.length} Platten, ${instances.size} Requisiten in ${byElement.size} Elementarten`);
  const result = { file, plates: cellItems.length, props: instances.size, elements: [...byElement.keys()] };
  board.dispose();
  return result;
}
