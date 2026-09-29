import {
  DynamicDrawUsage,
  Float32BufferAttribute,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicNodeMaterial,
  Quaternion,
  SphereGeometry,
  Vector3,
} from 'three/webgpu';
import type { UniformNode } from 'three/webgpu';
import {
  abs,
  attribute,
  cameraPosition,
  cameraProjectionMatrix,
  cameraViewMatrix,
  clamp,
  float,
  max,
  mix,
  modelViewMatrix,
  modelWorldMatrix,
  normalize,
  positionGeometry,
  positionLocal,
  screenSize,
  select,
  smoothstep,
  step,
  uniform,
  varying,
  vec4,
} from 'three/tsl';
import { hash32, mulberry32 } from '@ee/world';
import { createHexagon } from '../vegetation';
import { steppedFog, type FloatNode, type FogSettings, type PaletteLookup, type TSLUniform, type Vec3Node } from '../tsl';
import { popScale, type BillboardUniforms } from './branches';
import { InkMaterial } from './inkMaterial';
import type { CanopyFamily, SolidFamily } from './palette';
import type { Dome } from './shape';

export type { Dome } from './shape';

export interface CanopyQuality {
  /**
   * Punkte je Kuppel über die ganze Oberkugel (kleinste, größte Kuppel). Sichtbar ist davon nur ein Band entlang
   * der Silhouette (Bogenränder) plus wenige blasse Punkte innen — die Dichte am Rand ist also ein Vielfaches.
   */
  dotsPerDome: [number, number];
  glyphsPerDome: [number, number];
}

/** Millefleurs-Motiv am Boden (Ebene 21/3): 0 Raute, 1 Kreuz, 2 Vierpunkt-Raute; Farbe 0..3 der Motivzeile. */
export interface MeadowMotif {
  pos: Vector3;
  size: number;
  kind: 0 | 1 | 2;
  colour: number;
}

export interface CanopyOptions {
  domes: Dome[];
  lookup: PaletteLookup;
  fog: FogSettings;
  /** Atlas der Nebelzeile (Standard: `lookup`). */
  fogLookup?: PaletteLookup;
  /**
   * Zentrum einer Hüllkugel der ganzen Krone: die Kuppelnormalen werden zu `crownBlend` Anteil mit ihr gemischt →
   * jede Kuppel behält ihre Lichtsichel, die Krone liest sich trotzdem als eine beleuchtete Masse (STYLE §5.5).
   */
  crownHull?: Vector3;
  crownBlend?: number;
  rows: { canopy: Record<SolidFamily, number>; motif: Record<SolidFamily, number> };
  bands: TSLUniform;
  family: CanopyFamily;
  quality: CanopyQuality;
  bb: BillboardUniforms;
  /** Bodenmotive im selben Draw Call wie die Kronenmotive. */
  meadow?: MeadowMotif[];
  /** Punktgröße relativ zum Standard (kleine Büsche brauchen größere Punkte, Standard 1). */
  dotScale?: number;
  seed: number;
}

export interface Canopy {
  domes: InstancedMesh;
  dots: Mesh;
  glyphs: Mesh;
  counts: { domes: number; dots: number; glyphs: number; meadow: number };
  setFamily(f: CanopyFamily): void;
  dispose(): void;
}

const _m = new Matrix4();
const _q = new Quaternion();
const _s = new Vector3();

/** Glyph: Raute (Teil 0), Kreuz (Teil 1), Vierpunkt-Blüte (Teil 2) im selben Vertexpuffer; Teil-Attribut wählt. */
export function createGlyphGeometry(): { position: Float32BufferAttribute; part: Float32BufferAttribute; index: number[] } {
  const pos: number[] = [];
  const part: number[] = [];
  const idx: number[] = [];
  const quad = (cx: number, cy: number, hx: number, hy: number, p: number, rot45: boolean) => {
    const b = pos.length / 3;
    // gegen den Uhrzeigersinn → Vorderseite zeigt zur Kamera (oben, links, unten, rechts)
    if (rot45) pos.push(cx, cy + hy, 0, cx - hx, cy, 0, cx, cy - hy, 0, cx + hx, cy, 0);
    else pos.push(cx - hx, cy - hy, 0, cx + hx, cy - hy, 0, cx + hx, cy + hy, 0, cx - hx, cy + hy, 0);
    part.push(p, p, p, p);
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  };
  quad(0, 0, 0.8, 1, 0, true); // Raute
  quad(0, 0, 1, 0.26, 1, false); // Kreuz waagrecht
  quad(0, 0, 0.26, 1, 1, false); // Kreuz senkrecht
  for (const [x, y] of [
    [0.62, 0],
    [-0.62, 0],
    [0, 0.62],
    [0, -0.62],
  ] as Array<[number, number]>)
    quad(x, y, 0.34, 0.34, 2, true); // Blüte aus vier Punkten
  return { position: new Float32BufferAttribute(pos, 3), part: new Float32BufferAttribute(part, 1), index: idx };
}

/**
 * Farbkoordinate eines Clusters: 0 = Rot, 1 = Violett, 2 = Blau. Die Farbe wandert über die Krone (Ebene 3/21:
 * Rot → Violett → Blau), am Rand stärker als in der Mitte; `jewel` spannt die ganze Skala auf.
 */
export function familyCoord(family: CanopyFamily, angle: number, rho: number, jitter: number): number {
  const sw = Math.sin(angle);
  const k = 0.35 + 0.65 * rho;
  const j = (jitter - 0.5) * 0.12;
  const c =
    family === 'jewel' ? 1 + 0.95 * sw : family === 'blue' ? 1.62 + 0.38 * sw * k : family === 'red' ? 0.38 + 0.38 * sw * k : 1 + 0.45 * sw * k;
  return Math.min(2, Math.max(0, c + j));
}

/**
 * Kuppelkrone (Ebene 33/21/3): Kuppeln als ein InstancedMesh (Tinte + Lichtbänder wie das EarleMaterial, Normalen
 * vom Kuppelzentrum mit etwas Kronen-Hülle gemischt). **Punkte** sitzen dicht auf der ganzen Oberkugel, sichtbar
 * aber nur entlang der jeweiligen Silhouette (1 − |N·V|), sonnenseitig und am oberen Umriss dichter — so zeichnen
 * sie in jeder Ansicht die Bogenränder der übereinanderliegenden Kuppeln nach; innen bleiben wenige blasse Punkte.
 * **Farbe** wandert je Cluster zwischen zwei Familienzeilen (Rot → Violett → Blau). **Motive** (Vierpunkt-Rauten,
 * Kreuze) klein und spärlich; optional Millefleurs am Boden im selben Draw Call.
 */
export function createCanopy(o: CanopyOptions): Canopy {
  const rand = mulberry32(hash32('hero-canopy', o.seed));
  const { lookup, fog, bb } = o;
  const domes = o.domes;
  const n = Math.max(1, domes.length);
  const fogLookup = o.fogLookup ?? lookup;

  // --- Kuppeln ---------------------------------------------------------------------------------------
  const sphere = new SphereGeometry(1, 20, 14);
  const hull = new Float32Array(n * 3);
  const rank = new Float32Array(n);
  const domeFam = new Float32Array(n * 3);
  sphere.setAttribute('hullCenter', new InstancedBufferAttribute(hull, 3));
  sphere.setAttribute('domeRank', new InstancedBufferAttribute(rank, 1));
  sphere.setAttribute('domeFam', new InstancedBufferAttribute(domeFam, 3).setUsage(DynamicDrawUsage));
  const hullAttr = attribute('hullCenter', 'vec3') as unknown as Vec3Node;
  const rankAttr = attribute('domeRank', 'float') as unknown as FloatNode;
  const famAttr = attribute('domeFam', 'vec3') as unknown as Vec3Node;
  const pop = popScale(rankAttr, bb.crown);
  const crownHull: UniformNode<'vec3', Vector3> = uniform(o.crownHull ? o.crownHull.clone() : new Vector3(0, 0, 0));
  const blend = o.crownHull ? (o.crownBlend ?? 0.3) : 0;
  const nDome = positionLocal.sub(hullAttr).normalize();
  const nCrown = positionLocal.sub(crownHull).normalize();
  const nMix = nDome.mul(1 - blend).add(nCrown.mul(blend));
  const TERMINATOR = 0.22;
  const domeMaterial = new InkMaterial({
    // wie EarleMaterial: Tinte + Lichtbänder ab dem Terminator; Farbe zwischen zwei Familienzeilen gemischt
    shade: (lit, ndl) => {
      const band = clamp(ndl.sub(TERMINATOR).mul(2.2), 0, 0.999).mul(o.bands.sub(1));
      const litColor = mix(lookup.bands(band, famAttr.x, 1).rgb, lookup.bands(band, famAttr.y, 1).rgb, famAttr.z);
      const ink = mix(lookup.pal(0, famAttr.x).rgb, lookup.pal(0, famAttr.y).rgb, famAttr.z);
      return mix(ink, litColor, lit);
    },
    terminator: TERMINATOR,
    fog,
    lookup: fogLookup,
    normalNode: modelViewMatrix.mul(vec4(nMix, 0)).xyz.normalize(),
    positionNode: hullAttr.add(positionLocal.sub(hullAttr).mul(pop)),
  });
  const domeMesh = new InstancedMesh(sphere, domeMaterial, n);
  domeMesh.name = 'hero-domes';
  domeMesh.castShadow = true;
  domeMesh.receiveShadow = false;
  domeMesh.frustumCulled = false;
  domes.forEach((d, i) => {
    _s.set(d.r, d.r * d.sy, d.r);
    _m.compose(d.center, _q.identity(), _s);
    domeMesh.setMatrixAt(i, _m);
    hull[i * 3] = d.center.x;
    hull[i * 3 + 1] = d.center.y;
    hull[i * 3 + 2] = d.center.z;
    rank[i] = d.rank;
  });
  domeMesh.instanceMatrix.needsUpdate = true;
  domeMesh.count = domes.length;

  // --- Punkte und Motive auf den Kuppeln ------------------------------------------------------------------
  const dotRel: number[] = [];
  const dotHull: number[] = [];
  const dotNormal: number[] = [];
  const dotData: number[] = [];
  const dotDome: number[] = [];
  const glyphRel: number[] = [];
  const glyphHull: number[] = [];
  const glyphNormal: number[] = [];
  const glyphData: number[] = [];
  const glyphDome: number[] = [];
  const rMin = Math.min(...domes.map((d) => d.r));
  const rMax = Math.max(...domes.map((d) => d.r));
  const golden = Math.PI * (3 - Math.sqrt(5));
  const Y_MIN = -0.25;
  const Y_MAX = 0.99;
  domes.forEach((d, di) => {
    const sizeT = rMax > rMin ? (d.r - rMin) / (rMax - rMin) : 1;
    const area = sizeT * sizeT;
    const dotCount = Math.round(o.quality.dotsPerDome[0] + (o.quality.dotsPerDome[1] - o.quality.dotsPerDome[0]) * area);
    const glyphCount = Math.round(o.quality.glyphsPerDome[0] + (o.quality.glyphsPerDome[1] - o.quality.glyphsPerDome[0]) * area);
    const dotR = Math.max(0.024, 0.0125 * d.r) * (o.dotScale ?? 1);
    // goldene Spirale über die Kugel, Band y ∈ [Y_MIN, Y_MAX]; Normale = echte Ellipsoidnormale (für die Silhouette)
    const m = Math.round(dotCount / ((Y_MAX - Y_MIN) / 2));
    const phase = rand() * Math.PI * 2;
    for (let i = 0; i < m; i++) {
      const y = 1 - (2 * (i + 0.5)) / m;
      if (y < Y_MIN || y > Y_MAX) continue;
      const rr = Math.sqrt(1 - y * y);
      const phi = i * golden + phase;
      const nx = rr * Math.cos(phi);
      const nz = rr * Math.sin(phi);
      let tx = nx;
      let ty = y / d.sy;
      let tz = nz;
      const tl = Math.hypot(tx, ty, tz) || 1;
      tx /= tl;
      ty /= tl;
      tz /= tl;
      const size = dotR * (0.75 + 0.5 * rand());
      dotRel.push(nx * d.r + tx * size * 0.6, y * d.r * d.sy + ty * size * 0.6, nz * d.r + tz * size * 0.6);
      dotHull.push(d.center.x, d.center.y, d.center.z);
      dotNormal.push(tx, ty, tz);
      dotData.push(size, d.rank, rand(), 0);
      dotDome.push(di);
    }
    // Motive: wenige, kleine Vierpunkt-Rauten (Ebene 3/21), seltener Kreuze und Rauten, auf der Kuppelfläche
    for (let g = 0; g < glyphCount; g++) {
      const y = -0.05 + rand() * 0.8;
      const rr = Math.sqrt(1 - y * y);
      const phi = rand() * Math.PI * 2;
      const nx = rr * Math.cos(phi);
      const nz = rr * Math.sin(phi);
      const size = Math.max(0.05, d.r * (0.016 + 0.012 * rand()));
      glyphRel.push(nx * d.r + nx * size, y * d.r * d.sy + y * size, nz * d.r + nz * size);
      glyphHull.push(d.center.x, d.center.y, d.center.z);
      glyphNormal.push(nx, y, nz);
      const k = rand();
      const kind = k < 0.65 ? 2 : k < 0.85 ? 1 : 0;
      glyphData.push(size, d.rank, kind, Math.floor(rand() * 3.999));
      glyphDome.push(di);
    }
  });
  const crownGlyphs = glyphDome.length;
  for (const mm of o.meadow ?? []) {
    glyphRel.push(0, 0, 0);
    glyphHull.push(mm.pos.x, mm.pos.y, mm.pos.z);
    glyphNormal.push(0, 1, 0);
    glyphData.push(mm.size, 0, mm.kind, mm.colour);
    glyphDome.push(-1);
  }

  const dotGeo = new InstancedBufferGeometry();
  const hex = createHexagon();
  dotGeo.setAttribute('position', hex.position);
  dotGeo.setIndex(hex.index);
  const nd = Math.max(1, dotRel.length / 3);
  const dotFam = new Float32Array(nd * 3);
  dotGeo.setAttribute('dotRel', new InstancedBufferAttribute(new Float32Array(dotRel.length ? dotRel : [0, 0, 0]), 3));
  dotGeo.setAttribute('dotHull', new InstancedBufferAttribute(new Float32Array(dotHull.length ? dotHull : [0, 0, 0]), 3));
  dotGeo.setAttribute('dotNormal', new InstancedBufferAttribute(new Float32Array(dotNormal.length ? dotNormal : [0, 1, 0]), 3));
  dotGeo.setAttribute('dotData', new InstancedBufferAttribute(new Float32Array(dotData.length ? dotData : [0, 0, 0, 0]), 4));
  dotGeo.setAttribute('dotFam', new InstancedBufferAttribute(dotFam, 3).setUsage(DynamicDrawUsage));
  dotGeo.instanceCount = dotRel.length / 3;
  dotGeo.boundingSphere = null;

  const billboard = (rel: Vec3Node, hullC: Vec3Node, nrm: Vec3Node, size: FloatNode, rk: FloatNode, minPx: number) => {
    const s = popScale(rk, bb.crown);
    const centre = hullC.add(rel.mul(s));
    const worldC = modelWorldMatrix.mul(vec4(centre, 1)).xyz;
    const nW = modelWorldMatrix.mul(vec4(nrm, 0)).xyz.normalize();
    const ndl = nW.dot(bb.sunDirWorld);
    const viewC = cameraViewMatrix.mul(vec4(worldC, 1));
    const depth = viewC.z.negate().max(0.05);
    const pxPerUnit = bb.projScaleY.mul(screenSize.y).mul(0.5).div(depth);
    const sizeW = size.mul(s);
    const px = sizeW.mul(pxPerUnit);
    const sizeEff = max(sizeW, float(minPx).div(pxPerUnit));
    return { ndl, nW, px, sizeEff, worldC };
  };

  let dotMesh: Mesh;
  let dotMaterial: MeshBasicNodeMaterial;
  {
    const rel = attribute('dotRel', 'vec3') as unknown as Vec3Node;
    const hullC = attribute('dotHull', 'vec3') as unknown as Vec3Node;
    const nrm = attribute('dotNormal', 'vec3') as unknown as Vec3Node;
    const dd = attribute('dotData', 'vec4');
    const fam = attribute('dotFam', 'vec3') as unknown as Vec3Node;
    const b = billboard(rel, hullC, nrm, dd.x, dd.y, 1.1);
    // Silhouettenband: 1 − |N·V| (Blick von der Kamera), sonnenseitig und am oberen Umriss dichter
    const rimness = float(1).sub(abs(b.nW.dot(normalize(cameraPosition.sub(b.worldC)))));
    const sunW = smoothstep(-0.3, 0.35, b.ndl);
    const upW = smoothstep(-0.45, 0.2, nrm.y);
    const density = smoothstep(0.28, 0.72, rimness).mul(mix(float(0.35), float(1), sunW)).mul(mix(float(0.3), float(1), upW));
    const onRim = step(dd.z, density);
    const faint = step(dd.z, float(0.035)).mul(float(1).sub(onRim));
    const visible = step(bb.collapsePx, b.px).mul(max(onRim, faint));
    const offset = bb.camRight.mul(positionGeometry.x).add(bb.camUp.mul(positionGeometry.y)).mul(b.sizeEff.mul(visible));
    const material = new MeshBasicNodeMaterial();
    material.vertexNode = cameraProjectionMatrix.mul(cameraViewMatrix.mul(vec4(b.worldC.add(offset), 1)));
    const ndl = varying(b.ndl, 'vHeroDotNdl');
    const rimV = varying(onRim, 'vHeroDotRim');
    // Randpunkte tragen die Clusterfarbe (mittlere Stufe, Ebene 3); nur die direkt angestrahlten werden fast weiß
    const idx = select(rimV.lessThan(0.5), float(3), select(ndl.greaterThan(0.7), float(5), select(ndl.greaterThan(0.0), float(4), float(3))));
    const colour = mix(lookup.pal(idx, fam.x).rgb, lookup.pal(idx, fam.y).rgb, fam.z).mul(mix(float(0.7), float(1), rimV));
    material.colorNode = steppedFog(colour, fog, fogLookup);
    dotMesh = new Mesh(dotGeo, material);
    dotMesh.name = 'hero-dots';
    dotMesh.castShadow = false;
    dotMesh.receiveShadow = false;
    dotMesh.frustumCulled = false;
    dotMaterial = material;
  }

  // --- Motive (Krone + Boden) -----------------------------------------------------------------------
  const glyphGeo = new InstancedBufferGeometry();
  const glyph = createGlyphGeometry();
  glyphGeo.setAttribute('position', glyph.position);
  glyphGeo.setAttribute('part', glyph.part);
  glyphGeo.setIndex(glyph.index);
  const ng = Math.max(1, glyphRel.length / 3);
  const glyphRowArr = new Float32Array(ng);
  glyphGeo.setAttribute('glyphRel', new InstancedBufferAttribute(new Float32Array(glyphRel.length ? glyphRel : [0, 0, 0]), 3));
  glyphGeo.setAttribute('glyphHull', new InstancedBufferAttribute(new Float32Array(glyphHull.length ? glyphHull : [0, 0, 0]), 3));
  glyphGeo.setAttribute('glyphNormal', new InstancedBufferAttribute(new Float32Array(glyphNormal.length ? glyphNormal : [0, 1, 0]), 3));
  glyphGeo.setAttribute('glyphData', new InstancedBufferAttribute(new Float32Array(glyphData.length ? glyphData : [0, 0, 0, 0]), 4));
  glyphGeo.setAttribute('glyphRow', new InstancedBufferAttribute(glyphRowArr, 1).setUsage(DynamicDrawUsage));
  glyphGeo.instanceCount = glyphRel.length / 3;
  glyphGeo.boundingSphere = null;
  let glyphMesh: Mesh;
  let glyphMaterial: MeshBasicNodeMaterial;
  {
    const rel = attribute('glyphRel', 'vec3') as unknown as Vec3Node;
    const hullC = attribute('glyphHull', 'vec3') as unknown as Vec3Node;
    const nrm = attribute('glyphNormal', 'vec3') as unknown as Vec3Node;
    const gd = attribute('glyphData', 'vec4');
    const row = attribute('glyphRow', 'float') as unknown as FloatNode;
    const part = attribute('part', 'float') as unknown as FloatNode;
    const b = billboard(rel, hullC, nrm, gd.x, gd.y, 1.4);
    const ndl = varying(b.ndl, 'vHeroGlyphNdl');
    const isPart = step(-0.5, part.sub(gd.z)).mul(step(-0.5, gd.z.sub(part))); // part == kind
    const visible = step(bb.collapsePx.mul(2.0), b.px).mul(isPart);
    const offset = bb.camRight.mul(positionGeometry.x).add(bb.camUp.mul(positionGeometry.y)).mul(b.sizeEff.mul(visible));
    const material = new MeshBasicNodeMaterial();
    material.vertexNode = cameraProjectionMatrix.mul(cameraViewMatrix.mul(vec4(b.worldC.add(offset), 1)));
    const shade = mix(float(0.42), float(1), smoothstep(-0.15, 0.35, ndl));
    const colourIdx = varying(gd.w, 'vHeroGlyphColor');
    material.colorNode = steppedFog(lookup.pal(colourIdx, row).rgb.mul(shade), fog, fogLookup);
    glyphMesh = new Mesh(glyphGeo, material);
    glyphMesh.name = 'hero-glyphs';
    glyphMesh.castShadow = false;
    glyphMesh.receiveShadow = false;
    glyphMesh.frustumCulled = false;
    glyphMaterial = material;
  }

  // --- Farbverlauf je Cluster --------------------------------------------------------------------------
  const centre = new Vector3();
  for (const d of domes) centre.add(d.center);
  centre.divideScalar(Math.max(1, domes.length));
  const clusterPos = new Map<number, { x: number; z: number; n: number }>();
  for (const d of domes) {
    const c = clusterPos.get(d.cluster) ?? { x: 0, z: 0, n: 0 };
    c.x += d.center.x;
    c.z += d.center.z;
    c.n++;
    clusterPos.set(d.cluster, c);
  }
  let maxRho = 1e-3;
  for (const c of clusterPos.values()) maxRho = Math.max(maxRho, Math.hypot(c.x / c.n - centre.x, c.z / c.n - centre.z));
  const phase0 = mulberry32(hash32('hero-canopy-phase', o.seed))() * Math.PI * 2;
  const coordOf = (d: Dome, f: CanopyFamily): number => {
    const c = clusterPos.get(d.cluster)!;
    const ang = Math.atan2(c.z / c.n - centre.z, c.x / c.n - centre.x) + phase0;
    const rho = Math.hypot(c.x / c.n - centre.x, c.z / c.n - centre.z) / maxRho;
    return familyCoord(f, ang, rho, d.hash);
  };
  const rowsFor = (c: number): [number, number, number] => (c <= 1 ? [o.rows.canopy.red, o.rows.canopy.purple, c] : [o.rows.canopy.purple, o.rows.canopy.blue, c - 1]);
  const motifFor = (c: number): number => (c < 0.55 ? o.rows.motif.red : c < 1.45 ? o.rows.motif.purple : o.rows.motif.blue);
  const setFamily = (f: CanopyFamily) => {
    const coords = domes.map((d) => coordOf(d, f));
    coords.forEach((c, i) => domeFam.set(rowsFor(c), i * 3));
    for (let i = 0; i < dotDome.length; i++) dotFam.set(rowsFor(coords[dotDome[i]!]!), i * 3);
    for (let i = 0; i < glyphDome.length; i++) {
      const di = glyphDome[i]!;
      glyphRowArr[i] = di < 0 ? o.rows.motif.purple : motifFor(coords[di]!);
    }
    (sphere.getAttribute('domeFam') as InstancedBufferAttribute).needsUpdate = true;
    (dotGeo.getAttribute('dotFam') as InstancedBufferAttribute).needsUpdate = true;
    (glyphGeo.getAttribute('glyphRow') as InstancedBufferAttribute).needsUpdate = true;
  };
  setFamily(o.family);

  return {
    domes: domeMesh,
    dots: dotMesh,
    glyphs: glyphMesh,
    counts: { domes: domes.length, dots: dotRel.length / 3, glyphs: crownGlyphs, meadow: glyphDome.length - crownGlyphs },
    setFamily,
    dispose: () => {
      sphere.dispose();
      dotGeo.dispose();
      glyphGeo.dispose();
      domeMaterial.dispose();
      dotMaterial.dispose();
      glyphMaterial.dispose();
    },
  };
}
