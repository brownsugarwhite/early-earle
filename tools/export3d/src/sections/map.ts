import { CHUNK_SIZE, type PlaneChunkMesh, type PlaneProp, type PlaneTree } from '@ee/world';
import { SLOT_COUNT, slotOfRow, type EarlePlanet } from '@ee/render';
import type { BufferGeometry, InstancedBufferAttribute, InstancedMesh, Mesh } from 'three';
import type { ExportContext } from '../context';
import { GlbWriter, hexToLinearRgba } from '../glb';
import { geometryArrays, primitiveOf, type GeometryArrays } from '../geometry';
import { frameMatrix, instancingNode, type InstanceItem } from '../instances';
import { exportHeroTree } from './mapTree';

/**
 * Map: ein endliches Fenster der unendlichen Ebene (ADR 0002), genau so, wie das Spiel es baut (`MapWorld` aus
 * apps/game/src/flow): die zehn Autorenwelten entlang des Levelpfads (Level 1–100, Band ± Pfadbreite), Streuung
 * mit Pfadkorridor, Wahrzeichen, Riesenbaum samt Geschwistern. Exportiert wird die Ebene selbst (x seitlich, h Höhe,
 * z längs des Pfads, vorwärts −z) — die Kugel ist im Spiel nur die Anzeige-Abbildung um den Fokus (Radius und
 * Krümmung stehen in `welten.json`). Je Chunk werden Terrain und Streuung mit den Funktionen des Spiels erzeugt; die
 * Vegetation schreibt ihre Instanzpuffer mit `setContent` (Ursprung 0 → absolute Ebenenkoordinaten) — exportiert
 * werden genau diese Puffer (Instanzmatrizen + Palettenzeilen), je Welt und Art getrennt.
 *
 * Unbekannte neue Vegetations-/Requisiten-Meshes (Änderungen anderer Agenten) landen generisch unter
 * „weitere“ (Grundgeometrie + Instanzmatrizen) und werden als Hinweis gemeldet.
 */

type PlanetInternals = {
  buildChunk(cx: number, cz: number, res: number): { mesh: PlaneChunkMesh; trees: PlaneTree[]; props: PlaneProp[] };
};

interface WorldInfo {
  index: number;
  id: string;
  name: string;
  /** Pfadabschnitt der Welt (Autorenroute), −1 = nur seitlich im Fenster. */
  zone: number;
  rows: Record<string, number | number[]>;
}

/** Prop type (propC.w) → template part of the shared prop geometry (see planetVegetation.ts `propGrown`). */
const PROP_KINDS: Array<{ type: number; key: string; label: string; part: number }> = [
  { type: 0, key: 'schrott', label: 'Schrotthügel', part: 0 },
  { type: 1, key: 'fels', label: 'Fels', part: 0 },
  { type: 2, key: 'monolith', label: 'Monolith', part: 1 },
  { type: 3, key: 'gasquelle', label: 'Gasquelle', part: 1 },
  { type: 4, key: 'reifen', label: 'Reifen', part: 2 },
  { type: 5, key: 'rohr', label: 'Rohr', part: 3 },
  { type: 6, key: 'scheune', label: 'Scheune', part: 4 },
];
const PROP_PART_LABELS = ['Klumpen', 'Turm', 'Reifen', 'Rohr', 'Scheune'];
/** Bäume v4: Kronen- und Stamm-Meshes der Baumschicht (`trees/treeLayer.ts`). */
const CROWN_LABELS: Record<string, string> = {
  dome: 'Kuppel',
  domeHi: 'Kuppel (fein)',
  column: 'Säule',
  pine: 'Stufenkiefer',
  parasol: 'Pilzhut',
  shrub: 'Buschröschen',
  fir: 'Earle-Tanne',
  kuppel: 'Kissenkrone (Kuppelbaum)',
};
const TRUNK_LABELS: Record<string, string> = {
  fork: 'Gabel',
  fan: 'Spitzen-Skelett',
  oak: 'Eiche',
  pillar: 'Riesenstamm',
  parasol: 'Schirmbaum',
  sprawl: 'Ausleger (Kuppelbaum)',
  domeOak: 'Kuppeleiche (mit Tüpfelrock)',
  winterOak: 'Wintereiche',
};

interface Collected {
  /** kind → world → items */
  sets: Map<string, Map<number, InstanceItem[]>>;
  /** Templates by kind (geometry arrays in template space). */
  templates: Map<string, { arrays: GeometryArrays; label: string; group: string }>;
  kindInfo: Map<string, { label: string; group: string; template: string }>;
  dots: Map<number, { pos: number[]; nor: number[]; size: number[]; row: number[]; kind: number[] }>;
}

function add(c: Collected, kind: string, world: number, item: InstanceItem): void {
  let byWorld = c.sets.get(kind);
  if (!byWorld) c.sets.set(kind, (byWorld = new Map()));
  let list = byWorld.get(world);
  if (!list) byWorld.set(world, (list = []));
  list.push(item);
}

function inst(g: BufferGeometry, name: string): InstancedBufferAttribute | null {
  return (g.getAttribute(name) as InstancedBufferAttribute | undefined) ?? null;
}

/** Splits the shared prop geometry by its `part` attribute into template geometries. */
function splitParts(g: BufferGeometry): GeometryArrays[] {
  const all = geometryArrays(g, ['part']);
  const part = all.extra.get('part')!.data;
  const out: GeometryArrays[] = [];
  for (let k = 0; k < PROP_PART_LABELS.length; k++) {
    const map = new Map<number, number>();
    const pos: number[] = [];
    const nor: number[] = [];
    const idx: number[] = [];
    for (let t = 0; t < all.index.length; t += 3) {
      const tri = [all.index[t]!, all.index[t + 1]!, all.index[t + 2]!];
      if (!tri.every((v) => Math.round(part[v]!) === k)) continue;
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
    out.push({ position: new Float32Array(pos), normal: new Float32Array(nor), uv: null, index: new Uint32Array(idx), extra: new Map() });
  }
  return out;
}

function hash01(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Reads the vegetation instance buffers after `setContent` (one chunk, origin 0) into the collection. */
function readVegetation(ctx: ExportContext, planet: EarlePlanet, rowWorld: (row: number) => number, c: Collected, first: boolean, seq: { n: number }): void {
  for (const mesh of planet.vegetation.meshes as Array<InstancedMesh | Mesh>) {
    const name = mesh.name;
    const g = mesh.geometry as BufferGeometry & { instanceCount?: number };
    const im = mesh as InstancedMesh;
    const count = (im as { isInstancedMesh?: boolean }).isInstancedMesh ? im.count : g.instanceCount ?? 0;
    if (name.startsWith('planet-crown-') || name.startsWith('planet-trunk-')) {
      // Bäume v4: Kronen (Kuppel, feine Kuppel, Säule, Stufenkiefer) und Stämme (Gabel, Spitzen-Skelett, Eiche). Die
      // Instanzmatrix trägt Lage, Drehung und Maßstab; das Strecken der Gabel-Schäfte (`forkAt`) und das Stauchen
      // des Astnetzes macht der Vertex-Shader — in der Vorlage steht der Archetyp.
      const crown = name.startsWith('planet-crown-');
      const shape = name.slice(crown ? 'planet-crown-'.length : 'planet-trunk-'.length);
      const kind = crown ? `krone-${shape}` : `stamm-${shape}`;
      if (first && !c.templates.has(kind)) {
        const label = crown ? `Krone ${CROWN_LABELS[shape] ?? shape}` : `Stamm ${TRUNK_LABELS[shape] ?? shape}`;
        c.templates.set(kind, { arrays: geometryArrays(g), label, group: 'Vegetation' });
        c.kindInfo.set(kind, { label, group: 'Vegetation', template: kind });
      }
      const A = inst(g, 'treeA');
      const Cc = inst(g, 'treeC');
      const D = inst(g, 'treeD');
      for (let i = 0; i < count; i++) {
        const m = Array.from(im.instanceMatrix.array.slice(i * 16, i * 16 + 16));
        const row = Cc ? Cc.getX(i) : 0;
        add(c, kind, rowWorld(row), {
          m,
          attrs: { row, accent: Cc ? Cc.getY(i) : 0, style: Cc ? Cc.getZ(i) : 0, variant: Cc ? Cc.getW(i) : 0, rank: A ? A.getW(i) : 0, jewel: crown && D ? D.getW(i) : 0 },
        });
      }
    } else if (name === 'planet-bare') {
      const kind = 'kahl';
      if (first && !c.templates.has(kind)) {
        c.templates.set(kind, { arrays: geometryArrays(g), label: 'Kahler Fraktalbaum', group: 'Vegetation' });
        c.kindInfo.set(kind, { label: 'Kahler Fraktalbaum', group: 'Vegetation', template: kind });
      }
      const base = inst(g, 'bareBase')!;
      const up = inst(g, 'bareUp')!;
      const data = inst(g, 'bareData')!;
      const va = inst(g, 'bareVariant')!;
      for (let i = 0; i < count; i++) {
        const size = data.getX(i);
        const v = va.getX(i);
        const flip = v > 0.5 ? -1 : 1;
        const m = frameMatrix([base.getX(i), base.getY(i), base.getZ(i)], [up.getX(i), up.getY(i), up.getZ(i)], v * Math.PI * 2, [size * flip, size, size]);
        const row = data.getW(i);
        add(c, kind, rowWorld(row), { m, attrs: { row, rank: data.getY(i), variant: v } });
      }
    } else if (name === 'planet-props') {
      if (first && !c.templates.has('requisit-0')) {
        splitParts(g).forEach((arrays, k) => c.templates.set(`requisit-${k}`, { arrays, label: PROP_PART_LABELS[k]!, group: 'Requisiten' }));
        for (const pk of PROP_KINDS) c.kindInfo.set(pk.key, { label: pk.label, group: pk.type <= 5 && pk.type !== 1 ? 'Müll' : 'Requisiten', template: `requisit-${pk.part}` });
      }
      const A = inst(g, 'propA')!;
      const Cc = inst(g, 'propC')!;
      for (let i = 0; i < count; i++) {
        const m = Array.from(im.instanceMatrix.array.slice(i * 16, i * 16 + 16));
        const tv = Cc.getW(i);
        const type = Math.floor(tv);
        const pk = PROP_KINDS.find((k) => k.type === type);
        const row = Cc.getY(i);
        add(c, pk ? pk.key : `requisit-typ-${type}`, rowWorld(row), { m, attrs: { row, row2: Cc.getZ(i), variant: tv - type, rank: A.getW(i), type } });
      }
    } else if (name === 'planet-pools') {
      const kind = 'becken';
      if (first && !c.templates.has(kind)) {
        c.templates.set(kind, { arrays: geometryArrays(g), label: 'Öl-/Sirupbecken', group: 'Müll' });
        c.kindInfo.set(kind, { label: 'Öl-/Sirupbecken', group: 'Müll', template: kind });
      }
      const A = inst(g, 'propA')!;
      const Cc = inst(g, 'propC')!;
      for (let i = 0; i < count; i++) {
        const m = Array.from(im.instanceMatrix.array.slice(i * 16, i * 16 + 16));
        const row = Cc.getY(i);
        add(c, kind, rowWorld(row), { m, attrs: { row, row2: Cc.getZ(i), variant: Cc.getW(i) % 1, rank: A.getW(i) } });
      }
    } else if (name === 'planet-animals') {
      const kind = 'tier';
      if (first && !c.templates.has(kind)) {
        c.templates.set(kind, { arrays: geometryArrays(g), label: 'Kuh (Silhouette)', group: 'Requisiten' });
        c.kindInfo.set(kind, { label: 'Kuh (Silhouette)', group: 'Requisiten', template: kind });
      }
      const base = inst(g, 'animBase')!;
      const up = inst(g, 'animUp')!;
      const data = inst(g, 'animData')!;
      for (let i = 0; i < count; i++) {
        const size = data.getX(i);
        const m = frameMatrix([base.getX(i), base.getY(i), base.getZ(i)], [up.getX(i), up.getY(i), up.getZ(i)], hash01(seq.n++) * Math.PI * 2, [size, size, size]);
        const row = data.getW(i);
        add(c, kind, rowWorld(row), { m, attrs: { row, rank: data.getY(i) } });
      }
    } else if (name === 'planet-dots') {
      const rel = inst(g, 'dotRel')!;
      const base = inst(g, 'dotBase')!;
      const nrm = inst(g, 'dotNormal')!;
      const data = inst(g, 'dotData')!;
      const rk = inst(g, 'dotRow')!;
      for (let i = 0; i < count; i++) {
        const v = rk.getX(i);
        const row = Math.floor(v + 0.01);
        // Art im Achtel (gerundet; ein Viertel-Achtel darüber = nimmt Schlagschatten an)
        const kind = Math.round((v - row) * 8);
        const w = rowWorld(row);
        let d = c.dots.get(w);
        if (!d) c.dots.set(w, (d = { pos: [], nor: [], size: [], row: [], kind: [] }));
        d.pos.push(base.getX(i) + rel.getX(i), base.getY(i) + rel.getY(i), base.getZ(i) + rel.getZ(i));
        d.nor.push(nrm.getX(i), nrm.getY(i), nrm.getZ(i));
        d.size.push(data.getX(i));
        d.row.push(row);
        d.kind.push(kind);
      }
    } else if (name === 'planet-spores') {
      // Aufsteigende Sporen der Gasquellen: reine Animation, kein Modell.
    } else if (count > 0) {
      // Generisch: unbekanntes neues Mesh (Grundgeometrie + Instanzmatrizen).
      const kind = `weitere-${name}`;
      if (!c.templates.has(kind)) {
        c.templates.set(kind, { arrays: geometryArrays(g), label: name, group: 'Weitere' });
        c.kindInfo.set(kind, { label: name, group: 'Weitere', template: kind });
        ctx.warn('map', `unbekanntes Vegetations-Mesh "${name}" generisch exportiert (Instanzmatrizen, ohne Shader-Platzierung)`);
      }
      if ((im as { isInstancedMesh?: boolean }).isInstancedMesh) {
        for (let i = 0; i < count; i++) add(c, kind, -1, { m: Array.from(im.instanceMatrix.array.slice(i * 16, i * 16 + 16)), attrs: {} });
      }
    }
  }
}

/** Palette atlas rows (name, colours as hex, alphas) — the colours every Earle material looks up. */
function readAtlas(planet: EarlePlanet): Array<{ index: number; name: string; colors: string[]; alphas: number[] }> {
  const atlas = planet.atlas as unknown as { rows?: Map<string, { index: number; steps: number }>; data?: Uint8Array; texture: { image: { data: Uint8Array } }; rowCount: number; width: number };
  const data = atlas.data ?? atlas.texture.image.data;
  const names = new Map<number, string>();
  for (const [name, r] of atlas.rows ?? []) names.set(r.index, name);
  const out = [];
  for (let row = 0; row < atlas.rowCount; row++) {
    const colors: string[] = [];
    const alphas: number[] = [];
    for (let x = 0; x < atlas.width; x++) {
      const o = (row * atlas.width + x) * 4;
      colors.push('#' + [data[o]!, data[o + 1]!, data[o + 2]!].map((v) => v.toString(16).padStart(2, '0')).join(''));
      alphas.push(Math.round((data[o + 3]! / 255) * 1000) / 1000);
    }
    out.push({ index: row, name: names.get(row) ?? `Zeile ${row}`, colors, alphas });
  }
  return out;
}

export async function exportMap(ctx: ExportContext): Promise<Record<string, unknown>> {
  const { MapWorld } = await import('@/flow/MapWorld');
  const { FLOW_QUALITY } = await import('@/flow/quality');
  const quality = { ...FLOW_QUALITY.hoch, terrainRes: ctx.quick ? 48 : 120 };
  const mw = new MapWorld({ quality, seed: 7 });
  const planet = mw.world;
  const layout = planet.layout;
  const internals = planet as unknown as PlanetInternals;
  // Netzauflösung je Chunk (Gitterpunkte je Seite; Spiel nah 33 → 0,5 Einheiten)
  const res = ctx.quick ? 17 : 33;

  // --- Fenster: die Autorenroute (Level 1–100) samt Vorland und Seitenband ----------------------------------------
  const segments = Array.from({ length: layout.authored }, (_, k) => layout.segment(k)).filter((s) => s.levels > 0);
  const zTop = (segments[0]?.zStart ?? 0) + 24;
  const zBottom = (segments[segments.length - 1]?.zEnd ?? -400) - 24;
  const across = layout.bandHalfWidth + CHUNK_SIZE;
  const chunkIds: Array<[number, number]> = [];
  let x0 = Infinity;
  let x1 = -Infinity;
  for (let cz = Math.floor(zBottom / CHUNK_SIZE); cz <= Math.floor(zTop / CHUNK_SIZE); cz++) {
    const zm = (cz + 0.5) * CHUNK_SIZE;
    const xb = layout.backbone(zm);
    const c0 = Math.floor((xb - across) / CHUNK_SIZE);
    const c1 = Math.floor((xb + across) / CHUNK_SIZE);
    for (let cx = c0; cx <= c1; cx++) chunkIds.push([cx, cz]);
    x0 = Math.min(x0, c0 * CHUNK_SIZE);
    x1 = Math.max(x1, (c1 + 1) * CHUNK_SIZE);
  }
  const window = { x0, x1, z0: Math.floor(zBottom / CHUNK_SIZE) * CHUNK_SIZE, z1: (Math.floor(zTop / CHUNK_SIZE) + 1) * CHUNK_SIZE };

  // --- Chunks: Terrain + Streuung (Instanzpuffer der Vegetation je Chunk) ---------------------------------------
  const cpus = chunkIds.map(([cx, cz]) => internals.buildChunk.call(planet, cx, cz, res));
  // Alle Welten des Fensters bekommen ihren Slot für den ganzen Export (die Palettenzeilen der Instanzen bleiben gültig)
  const windowWorlds = [...new Set(cpus.flatMap((c) => c.mesh.worlds))].sort((a, b) => a - b);
  if (windowWorlds.length > SLOT_COUNT) ctx.warn('map', `${windowWorlds.length} Welten im Fenster, nur ${SLOT_COUNT} Slots — Palettenzeilen später Chunks können wechseln`);
  planet.pinWorlds('export', windowWorlds.slice(0, SLOT_COUNT));
  for (const w of windowWorlds.slice(0, SLOT_COUNT)) planet.rowsOfWorld(w);
  const rowWorld = (row: number): number => {
    const slot = slotOfRow(Math.round(row));
    return slot >= 0 ? planet.slots.worldOf(slot) : -1;
  };
  const collected: Collected = { sets: new Map(), templates: new Map(), kindInfo: new Map(), dots: new Map() };
  let first = true;
  const seq = { n: 0 };
  // Sonne senkrecht über der Ebene: die Kronenpunkte liegen auf der Oberseite (wie beim Blick von oben)
  const up = { x: 0, y: 1, z: 0 };
  planet.vegetation.setSunDirection(up as never, up as never);
  for (const cpu of cpus) {
    planet.vegetation.setContent(
      cpu.trees.map((tree) => ({ tree, slot: 0, withDots: true })),
      cpu.props.map((prop) => ({ prop, slot: 0 })),
      { x: 0, z: 0 },
    );
    readVegetation(ctx, planet, rowWorld, collected, first, seq);
    first = false;
  }

  // --- Terrain je Welt (Dreiecke nach Welt des Schwerpunkts, ohne Schürzen, Nähte zwischen Chunks verschweißt) ------
  const terrainW = new GlbWriter();
  const terrainNodes: number[] = [];
  const perWorld = new Map<number, { pos: number[]; nor: number[]; height: number[]; border: number[]; zone: number[]; idx: number[]; map: Map<string, number>; sum: [number, number, number, number] }>();
  for (const { mesh: ch } of cpus) {
    const idx = ch.indices;
    const grid = ch.n * ch.n;
    for (let t = 0; t < idx.length; t += 3) {
      const a = idx[t]!;
      const b = idx[t + 1]!;
      const cc = idx[t + 2]!;
      if (a >= grid || b >= grid || cc >= grid) continue; // Schürze (nur gegen Risse zwischen Detailstufen)
      const cx = (ch.positions[a * 3]! + ch.positions[b * 3]! + ch.positions[cc * 3]!) / 3 + ch.ox;
      const cz = (ch.positions[a * 3 + 2]! + ch.positions[b * 3 + 2]! + ch.positions[cc * 3 + 2]!) / 3 + ch.oz;
      const w = planet.worldAt(cx, cz);
      let pw = perWorld.get(w);
      if (!pw) perWorld.set(w, (pw = { pos: [], nor: [], height: [], border: [], zone: [], idx: [], map: new Map(), sum: [0, 0, 0, 0] }));
      for (const v of [a, b, cc]) {
        const x = ch.positions[v * 3]! + ch.ox;
        const y = ch.positions[v * 3 + 1]!;
        const z = ch.positions[v * 3 + 2]! + ch.oz;
        const key = `${Math.round(x * 1e4)},${Math.round(y * 1e4)},${Math.round(z * 1e4)}`;
        let nv = pw.map.get(key);
        if (nv === undefined) {
          nv = pw.pos.length / 3;
          pw.map.set(key, nv);
          pw.pos.push(x, y, z);
          pw.nor.push(ch.normals[v * 3]!, ch.normals[v * 3 + 1]!, ch.normals[v * 3 + 2]!);
          pw.height.push(ch.heightNorm[v]!);
          // Abstand zur nächsten Weltgrenze (Risse im Material) und Welt des Vertex (Ebene: keine Zonenbänder)
          pw.border.push(Math.abs(ch.sd[v]!));
          pw.zone.push(ch.own[v]!);
          pw.sum[0] += x;
          pw.sum[1] += y;
          pw.sum[2] += z;
          pw.sum[3] += 1;
        }
        pw.idx.push(nv);
      }
    }
  }
  // Welten im Fenster: Abschnitt der Autorenroute (−1 = nur seitlich) und Palettenzeilen ihres Slots
  const segmentOf = new Map<number, number>();
  for (const s of segments) if (!segmentOf.has(s.world)) segmentOf.set(s.world, s.k);
  const worldIds = [...new Set([...perWorld.keys(), ...windowWorlds])].sort((a, b) => a - b);
  const worlds: WorldInfo[] = worldIds.map((i) => {
    const w = planet.worldData(i);
    const r = planet.rowsOfWorld(i);
    return {
      index: i,
      id: w.id,
      name: w.name,
      zone: segmentOf.get(i) ?? -1,
      rows: { terrain: r.terrain, canopy: r.canopy, canopyRows: r.canopyRows, sky: r.sky, fog: r.fog, accent: r.accent, monolith: r.monolith, barn: r.barn, water: r.water, rock: r.rock, snow: r.snow },
    };
  });
  const worldById = new Map(worlds.map((w) => [w.index, w]));
  const atlas = readAtlas(planet);
  let terrainVerts = 0;
  for (const [w, pw] of [...perWorld.entries()].sort((x, y) => x[0] - y[0])) {
    const info = worldById.get(w);
    const palette = planet.worldData(w).palette;
    const mat = terrainW.material(`Terrain · ${info?.name ?? w}`, hexToLinearRgba(palette?.terrain[2] ?? '#808080'), { world: w, row: info?.rows.terrain ?? 0 });
    const mesh = terrainW.mesh(`Terrain ${info?.id ?? w}`, [
      {
        attributes: {
          POSITION: terrainW.accessor(new Float32Array(pw.pos), 'VEC3', { minmax: true }),
          NORMAL: terrainW.accessor(new Float32Array(pw.nor), 'VEC3'),
          _HEIGHT: terrainW.accessor(new Float32Array(pw.height), 'SCALAR'),
          _BORDER: terrainW.accessor(new Float32Array(pw.border), 'SCALAR'),
          _ZONE: terrainW.accessor(new Float32Array(pw.zone), 'SCALAR'),
        },
        indices: terrainW.accessor(new Uint32Array(pw.idx), 'SCALAR'),
        material: mat,
      },
    ]);
    terrainVerts += pw.pos.length / 3;
    terrainNodes.push(terrainW.node({ name: `Terrain · ${info ? `${info.id} ${info.name}` : w}`, mesh, extras: { world: w, worldId: info?.id, worldName: info?.name, zone: info?.zone, row: info?.rows.terrain, ground: planet.worldData(w).ground } }));
  }
  terrainW.root(terrainW.node({ name: 'Ebene', children: terrainNodes, extras: { ee: 'terrain', plane: true, radius: planet.mapping.R, chunkSize: CHUNK_SIZE, window, vertices: terrainVerts } }));
  const terrainFile = ctx.writeGlb('map/terrain.glb', terrainW);

  // --- Vegetation, Requisiten, Müll: Vorlagen + Instanzen je Welt ----------------------------------------
  const vegW = new GlbWriter();
  const templateMesh = new Map<string, number>();
  const templateNodes: number[] = [];
  for (const [kind, t] of collected.templates) {
    const mat = vegW.material(`Vorlage · ${t.label}`, [0.5, 0.5, 0.5, 1], { kind });
    const mesh = vegW.mesh(t.label, [primitiveOf(vegW, t.arrays, mat)]);
    templateMesh.set(kind, mesh);
    templateNodes.push(vegW.node({ name: `Vorlage · ${t.label}`, mesh, extras: { template: kind, label: t.label, group: t.group } }));
  }
  const setNodes: number[] = [];
  const counts: Record<string, number> = {};
  for (const [kind, byWorld] of collected.sets) {
    const info = collected.kindInfo.get(kind) ?? { label: kind, group: 'Weitere', template: kind };
    const mesh = templateMesh.get(info.template);
    if (mesh === undefined) continue;
    for (const [w, items] of byWorld) {
      const node = instancingNode(vegW, `${info.label} · ${worldById.get(w)?.name ?? 'Welt ?'}`, mesh, items, { kind, label: info.label, group: info.group, template: info.template, world: w });
      if (node >= 0) setNodes.push(node);
      counts[kind] = (counts[kind] ?? 0) + items.length;
    }
  }
  // Kronenpunkte als Punktwolken je Welt
  let dotCount = 0;
  for (const [w, d] of collected.dots) {
    const n = d.size.length;
    dotCount += n;
    const mesh = vegW.mesh(`Punkte ${worldById.get(w)?.id ?? w}`, [
      {
        mode: 0,
        attributes: {
          POSITION: vegW.accessor(new Float32Array(d.pos), 'VEC3', { minmax: true }),
          NORMAL: vegW.accessor(new Float32Array(d.nor), 'VEC3'),
          _SIZE: vegW.accessor(new Float32Array(d.size), 'SCALAR'),
          _ROW: vegW.accessor(new Float32Array(d.row), 'SCALAR'),
          _KIND: vegW.accessor(new Float32Array(d.kind), 'SCALAR'),
        },
      },
    ]);
    setNodes.push(vegW.node({ name: `Kronenpunkte · ${worldById.get(w)?.name ?? w}`, mesh, extras: { kind: 'punkte', label: 'Kronenpunkte', group: 'Vegetation', world: w, count: n } }));
  }
  vegW.root(vegW.node({ name: 'Vorlagen', children: templateNodes, extras: { ee: 'vorlagen' } }));
  vegW.root(vegW.node({ name: 'Streuung', children: setNodes, extras: { ee: 'streuung', kinds: Object.fromEntries(collected.kindInfo) } }));
  const vegFile = ctx.writeGlb('map/vegetation.glb', vegW);

  // --- Riesenbaum samt Geschwistern -------------------------------------------------------------------------------
  let tree: Record<string, unknown> | null = null;
  if (mw.treeSite) {
    try {
      tree = exportHeroTree(ctx, mw.treeSite);
    } catch (e) {
      ctx.warn('map', `Riesenbaum: ${String(e)}`);
    }
  }

  // --- Levelpfad, Wahrzeichen ----------------------------------------------------------------------------
  const pathW = new GlbWriter();
  const lastNode = mw.layout.lastPlayable + 5;
  const win = mw.layout.window(0, lastNode);
  const pathNodes = win.nodes;
  const nodePos = new Float32Array(pathNodes.length * 3);
  const nodeNor = new Float32Array(pathNodes.length * 3);
  const nodeLevel = new Float32Array(pathNodes.length);
  const nodeZone = new Float32Array(pathNodes.length);
  const nodeWorld = new Float32Array(pathNodes.length);
  pathNodes.forEach((n, i) => {
    nodePos.set(n.position, i * 3);
    nodeNor.set(n.normal, i * 3);
    nodeLevel[i] = n.index + 1;
    nodeZone[i] = layout.segmentOfLevel(n.index + 1);
    nodeWorld[i] = n.world ?? planet.worldAt(n.position[0], n.position[2]);
  });
  const nodesMesh = pathW.mesh('Levelknoten', [
    { mode: 0, attributes: { POSITION: pathW.accessor(nodePos, 'VEC3', { minmax: true }), NORMAL: pathW.accessor(nodeNor, 'VEC3'), _LEVEL: pathW.accessor(nodeLevel, 'SCALAR'), _ZONE: pathW.accessor(nodeZone, 'SCALAR'), _WORLD: pathW.accessor(nodeWorld, 'SCALAR') } },
  ]);
  const dotPos = new Float32Array(win.dots.length * 3);
  const dotNor = new Float32Array(win.dots.length * 3);
  win.dots.forEach((d, i) => {
    dotPos.set(d.position, i * 3);
    dotNor.set(d.normal, i * 3);
  });
  const dotsMesh = pathW.mesh('Pfadpunkte', [{ mode: 0, attributes: { POSITION: pathW.accessor(dotPos, 'VEC3', { minmax: true }), NORMAL: pathW.accessor(dotNor, 'VEC3') } }]);
  // Wahrzeichen: externe Slots (Riesenbaum, Geschwister) und die geplanten Felsen, Ruinen und Sümpfe im Fenster
  const landmarks: Array<Record<string, unknown>> = planet.field.externalLandmarks.map((s) => ({
    id: s.id,
    world: s.world,
    zone: segmentOf.get(s.world) ?? -1,
    position: s.position,
    normal: s.normal,
    yawDeg: s.yawDeg,
    scale: s.scale,
    clearRadius: s.clearRadius,
    instance: s.instance ?? null,
  }));
  for (const lm of planet.field.landmarks?.inRect(window.x0, window.z0, window.x1, window.z1) ?? []) {
    const p = lm.placement;
    landmarks.push({
      id: p.id,
      world: p.world,
      zone: segmentOf.get(p.world) ?? -1,
      position: [p.x, p.y, p.z],
      normal: [0, 1, 0],
      yawDeg: (p.yaw * 180) / Math.PI,
      scale: 1,
      clearRadius: p.radius,
      instance: { kind: p.kind, seed: p.seed, anchors: lm.anchors.map((a) => ({ site: a.site, position: a.position, radius: a.radius })) },
    });
  }
  const tl = mw.treeSite ? [mw.treeSite.first + 1, mw.treeSite.last + 1] : [0, 0];
  pathW.root(
    pathW.node({
      name: 'Levelpfad',
      children: [pathW.node({ name: 'Levelknoten', mesh: nodesMesh, extras: { count: pathNodes.length } }), pathW.node({ name: 'Pfadpunkte', mesh: dotsMesh, extras: { count: win.dots.length } })],
      extras: { ee: 'pfad', treeLevels: tl, length: mw.layout.lastPlayable + 1, locked: pathNodes.filter((n) => n.locked).length, landmarks },
    }),
  );
  const pathFile = ctx.writeGlb('map/pfad.glb', pathW);

  // --- Weltinfos für Materialien und Szene --------------------------------------------------------------
  const worldInfo = worlds.map((wi) => {
    const w = planet.worldData(wi.index);
    const t = perWorld.get(wi.index);
    // Welten der Route: der Bodenknoten nächst der Mitte ihres Abschnitts (der Riesenbaum-Abschnitt: der Knoten davor,
    // Blick auf den Baum); seitliche Welten: Mitte ihres Stücks im Fenster
    const seg = segments.find((s) => s.world === wi.index);
    const onTree = (i: number): boolean => mw.treeSite !== null && i >= mw.treeSite.first && i <= mw.treeSite.last;
    let pick = -1;
    if (seg) {
      const a = seg.firstLevel - 1;
      const b = a + seg.levels - 1;
      const m = a + Math.floor(seg.levels / 2);
      for (let d = 0; d <= seg.levels && pick < 0; d++) for (const i of [m - d, m + d]) if (pick < 0 && i >= a && i <= b && !onTree(i)) pick = i;
      if (pick < 0) pick = Math.max(0, a - 1);
    }
    const mid = pick >= 0 ? mw.layout.node(pick).position : null;
    return {
      ...wi,
      palette: w.palette,
      ground: w.ground,
      fogStripes: w.fogStripes,
      fog: w.fog,
      view: w.view,
      terrain: w.params.terrain,
      vegetation: w.params.vegetation,
      props: w.params.props ?? {},
      procedural: w.procedural ?? false,
      // Blickpunkt der Welt (Ebene) — die Kameras der Szenen blicken dorthin
      center: mid ? [mid[0], mid[1], mid[2]] : t && t.sum[3] > 0 ? [t.sum[0] / t.sum[3], t.sum[1] / t.sum[3], t.sum[2] / t.sum[3]] : null,
    };
  });
  const info = {
    plane: true,
    radius: planet.mapping.R,
    curvature: planet.curvature.value,
    chunkSize: CHUNK_SIZE,
    window,
    forward: [0, 0, -1],
    worlds: worldInfo,
    atlas,
    sun: { elevationDeg: 10, azimuthDeg: 70 },
    heroTreeWorld: landmarks.find((l) => l.id === 'hero-tree')?.world ?? -1,
  };
  ctx.writeJson('map/welten.json', info);
  planet.pinWorlds('export', null);
  const result = { terrain: terrainFile, vegetation: vegFile, path: pathFile, tree, worlds: worlds.length, chunks: cpus.length, terrainVertices: terrainVerts, instances: counts, dots: dotCount, atlasRows: atlas.length };
  ctx.log(`Map (Ebene, Fenster ${Math.round(window.x1 - window.x0)} × ${Math.round(window.z1 - window.z0)}): ${worlds.length} Welten, ${cpus.length} Chunks, ${terrainVerts} Terrain-Vertices, ${Object.values(counts).reduce((a, b) => a + b, 0)} Instanzen, ${dotCount} Kronenpunkte`);
  return result;
}
