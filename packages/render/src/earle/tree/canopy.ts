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
  attribute,
  cameraProjectionMatrix,
  cameraViewMatrix,
  clamp,
  float,
  max,
  mix,
  modelViewMatrix,
  modelWorldMatrix,
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
import { SOLID_FAMILIES, type CanopyFamily, type SolidFamily } from './palette';
import type { Dome } from './shape';

export type { Dome } from './shape';

export interface CanopyQuality {
  /** Punkte je Kuppel (kleinste, größte Kuppel). */
  dotsPerDome: [number, number];
  glyphsPerDome: [number, number];
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
  seed: number;
}

export interface Canopy {
  domes: InstancedMesh;
  dots: Mesh;
  glyphs: Mesh;
  counts: { domes: number; dots: number; glyphs: number };
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
 * Kuppeln als ein InstancedMesh (Tinte + Lichtbänder wie das EarleMaterial, Normalen vom Kuppelzentrum mit etwas
 * Kronen-Hülle gemischt → jede Kuppel leuchtet als Masse mit
 * Lichtsichel), Punktrand als Sechseck-Billboards auf dem oberen Schulterring (Ebene 33: rundum, sonnenseitig hell),
 * Innenmotive als Glyph-Billboards auf den Flächen (Ebene 3/10). Familie je Kuppel als Attribut → Juwelenmodus.
 */
export function createCanopy(o: CanopyOptions): Canopy {
  const rand = mulberry32(hash32('hero-canopy', o.seed));
  const { lookup, fog, bb } = o;
  const domes = o.domes;
  const n = Math.max(1, domes.length);

  // --- Kuppeln ---------------------------------------------------------------------------------------
  const sphere = new SphereGeometry(1, 20, 14);
  const hull = new Float32Array(n * 3);
  const rank = new Float32Array(n);
  const domeRow = new Float32Array(n);
  sphere.setAttribute('hullCenter', new InstancedBufferAttribute(hull, 3));
  sphere.setAttribute('domeRank', new InstancedBufferAttribute(rank, 1));
  sphere.setAttribute('domeRow', new InstancedBufferAttribute(domeRow, 1).setUsage(DynamicDrawUsage));
  const hullAttr = attribute('hullCenter', 'vec3') as unknown as Vec3Node;
  const rankAttr = attribute('domeRank', 'float') as unknown as FloatNode;
  const rowAttr = attribute('domeRow', 'float') as unknown as FloatNode;
  const pop = popScale(rankAttr, bb.crown);
  const crownHull: UniformNode<'vec3', Vector3> = uniform(o.crownHull ? o.crownHull.clone() : new Vector3(0, 0, 0));
  const blend = o.crownHull ? (o.crownBlend ?? 0.3) : 0;
  const nDome = positionLocal.sub(hullAttr).normalize();
  const nCrown = positionLocal.sub(crownHull).normalize();
  const nMix = nDome.mul(1 - blend).add(nCrown.mul(blend));
  const fogLookup = o.fogLookup ?? lookup;
  const TERMINATOR = 0.3;
  const domeMaterial = new InkMaterial({
    // wie EarleMaterial: Tinte + Lichtbänder ab dem Terminator, Palettenzeile je Kuppel (Familie)
    shade: (lit, ndl) => {
      const band = clamp(ndl.sub(TERMINATOR).mul(2.2), 0, 0.999).mul(o.bands.sub(1));
      const litColor = lookup.bands(band, rowAttr, 1).rgb;
      return mix(lookup.pal(0, rowAttr).rgb, litColor, lit);
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

  // --- Punktrand ------------------------------------------------------------------------------------
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
  domes.forEach((d, di) => {
    const sizeT = rMax > rMin ? (d.r - rMin) / (rMax - rMin) : 1;
    const area = sizeT * sizeT;
    const dotCount = Math.round(o.quality.dotsPerDome[0] + (o.quality.dotsPerDome[1] - o.quality.dotsPerDome[0]) * area);
    const glyphCount = Math.round(o.quality.glyphsPerDome[0] + (o.quality.glyphsPerDome[1] - o.quality.glyphsPerDome[0]) * area);
    const dotR = Math.max(0.045, 0.022 * d.r);
    // Punkte: goldene Spirale über die Kugel, nur der obere Schulterring (y 0.25..0.97), dichter um 0.7
    const m = dotCount * 2.6;
    const phase = rand() * Math.PI * 2;
    for (let i = 0; i < m; i++) {
      const y = 1 - (2 * (i + 0.5)) / m;
      if (y < 0.22 || y > 0.97) continue;
      const band = Math.exp(-((y - 0.68) * (y - 0.68)) / 0.08);
      if (rand() > 0.35 + 0.65 * band) continue;
      const rr = Math.sqrt(1 - y * y);
      const phi = i * golden + phase;
      const nx = rr * Math.cos(phi);
      const nz = rr * Math.sin(phi);
      const size = dotR * (0.75 + 0.5 * rand());
      const ox = nx * d.r + nx * size * 0.9;
      const oy = y * d.r * d.sy + y * size * 0.9;
      const oz = nz * d.r + nz * size * 0.9;
      dotRel.push(ox, oy, oz);
      dotHull.push(d.center.x, d.center.y, d.center.z);
      dotNormal.push(nx, y, nz);
      dotData.push(size, d.rank, rand(), 0);
      dotDome.push(di);
    }
    // Glyphen: auf den Flächen (y -0.05..0.85)
    const mg = glyphCount * 1.4;
    const phaseG = rand() * Math.PI * 2;
    for (let i = 0; i < mg; i++) {
      const y = 1 - (2 * (i + 0.5)) / mg;
      if (y < -0.05 || y > 0.85) continue;
      if (rand() > 0.72) continue;
      const rr = Math.sqrt(1 - y * y);
      const phi = i * golden + phaseG;
      const nx = rr * Math.cos(phi);
      const nz = rr * Math.sin(phi);
      const size = Math.max(0.09, d.r * (0.03 + 0.024 * rand()));
      glyphRel.push(nx * d.r + nx * size, y * d.r * d.sy + y * size, nz * d.r + nz * size);
      glyphHull.push(d.center.x, d.center.y, d.center.z);
      glyphNormal.push(nx, y, nz);
      const k = rand();
      const kind = k < 0.38 ? 0 : k < 0.6 ? 1 : 2;
      glyphData.push(size, d.rank, kind, Math.floor(rand() * 3.999));
      glyphDome.push(di);
    }
  });

  const dotGeo = new InstancedBufferGeometry();
  const hex = createHexagon();
  dotGeo.setAttribute('position', hex.position);
  dotGeo.setIndex(hex.index);
  const nd = Math.max(1, dotRel.length / 3);
  const dotRowArr = new Float32Array(nd);
  dotGeo.setAttribute('dotRel', new InstancedBufferAttribute(new Float32Array(dotRel.length ? dotRel : [0, 0, 0]), 3));
  dotGeo.setAttribute('dotHull', new InstancedBufferAttribute(new Float32Array(dotHull.length ? dotHull : [0, 0, 0]), 3));
  dotGeo.setAttribute('dotNormal', new InstancedBufferAttribute(new Float32Array(dotNormal.length ? dotNormal : [0, 1, 0]), 3));
  dotGeo.setAttribute('dotData', new InstancedBufferAttribute(new Float32Array(dotData.length ? dotData : [0, 0, 0, 0]), 4));
  dotGeo.setAttribute('dotRow', new InstancedBufferAttribute(dotRowArr, 1).setUsage(DynamicDrawUsage));
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
    return { ndl, px, sizeEff, worldC };
  };

  let dotMesh: Mesh;
  let dotMaterial: MeshBasicNodeMaterial;
  {
    const rel = attribute('dotRel', 'vec3') as unknown as Vec3Node;
    const hullC = attribute('dotHull', 'vec3') as unknown as Vec3Node;
    const nrm = attribute('dotNormal', 'vec3') as unknown as Vec3Node;
    const dd = attribute('dotData', 'vec4');
    const row = attribute('dotRow', 'float') as unknown as FloatNode;
    const b = billboard(rel, hullC, nrm, dd.x, dd.y, 1.2);
    const ndl = varying(b.ndl, 'vHeroDotNdl');
    // Schattenseite: nur ~55 % der Punkte, dunkler Ton (Ebene 33: Punkte rundum, sonnenseitig hell)
    const sparse = select(ndl.lessThan(-0.05).and(dd.z.greaterThan(0.55)), float(0), float(1));
    const visible = step(bb.collapsePx, b.px).mul(sparse);
    const offset = bb.camRight.mul(positionGeometry.x).add(bb.camUp.mul(positionGeometry.y)).mul(b.sizeEff.mul(visible));
    const material = new MeshBasicNodeMaterial();
    material.vertexNode = cameraProjectionMatrix.mul(cameraViewMatrix.mul(vec4(b.worldC.add(offset), 1)));
    const idx = select(ndl.greaterThan(0.45), float(5), select(ndl.greaterThan(0.08), float(4), float(3)));
    material.colorNode = steppedFog(lookup.pal(idx, row).rgb, fog, fogLookup);
    dotMesh = new Mesh(dotGeo, material);
    dotMesh.name = 'hero-dots';
    dotMesh.castShadow = false;
    dotMesh.receiveShadow = false;
    dotMesh.frustumCulled = false;
    dotMaterial = material;
  }

  // --- Glyphen --------------------------------------------------------------------------------------
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
    const b = billboard(rel, hullC, nrm, gd.x, gd.y, 1.6);
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

  const familyOf = (d: Dome, f: CanopyFamily): SolidFamily => (f === 'jewel' ? SOLID_FAMILIES[Math.floor(d.hash * 2.999)]! : f);
  const setFamily = (f: CanopyFamily) => {
    domes.forEach((d, i) => {
      domeRow[i] = o.rows.canopy[familyOf(d, f)];
    });
    for (let i = 0; i < dotDome.length; i++) dotRowArr[i] = o.rows.canopy[familyOf(domes[dotDome[i]!]!, f)];
    for (let i = 0; i < glyphDome.length; i++) glyphRowArr[i] = o.rows.motif[familyOf(domes[glyphDome[i]!]!, f)];
    (sphere.getAttribute('domeRow') as InstancedBufferAttribute).needsUpdate = true;
    (dotGeo.getAttribute('dotRow') as InstancedBufferAttribute).needsUpdate = true;
    (glyphGeo.getAttribute('glyphRow') as InstancedBufferAttribute).needsUpdate = true;
  };
  setFamily(o.family);

  return {
    domes: domeMesh,
    dots: dotMesh,
    glyphs: glyphMesh,
    counts: { domes: domes.length, dots: dotRel.length / 3, glyphs: glyphRel.length / 3 },
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
