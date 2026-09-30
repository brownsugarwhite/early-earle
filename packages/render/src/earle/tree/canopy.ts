import { DynamicDrawUsage, InstancedBufferAttribute, InstancedBufferGeometry, InstancedMesh, Matrix4, Mesh, MeshBasicNodeMaterial, Quaternion, SphereGeometry, Vector3 } from 'three/webgpu';
import type { UniformNode } from 'three/webgpu';
import {
  abs,
  attribute,
  cameraPosition,
  cameraProjectionMatrix,
  cameraViewMatrix,
  clamp,
  cross,
  float,
  floor,
  fract,
  fwidth,
  hash,
  length,
  max,
  min,
  mix,
  modelViewMatrix,
  modelWorldMatrix,
  normalize,
  normalView,
  positionGeometry,
  positionLocal,
  screenSize,
  select,
  smoothstep,
  sqrt,
  step,
  uniform,
  varying,
  vec2,
  vec3,
  vec4,
} from 'three/tsl';
import { hash32, mulberry32 } from '@ee/world';
import { createHexagon } from '../vegetation';
import { aaStep, steppedFog, type FloatNode, type FogSettings, type PaletteLookup, type TSLUniform, type Vec3Node } from '../tsl';
import { popScale, type BillboardUniforms } from './branches';
import { InkMaterial } from './inkMaterial';
import { familyTone, type CanopyFamily } from './palette';
import type { Dome } from './shape';

export type { Dome } from './shape';

export interface CanopyQuality {
  /** Rim fringe dots per dome over the upper sphere (smallest, largest dome); only the silhouette band shows. */
  dotsPerDome: [number, number];
  /** Sphere segments (width, height). */
  sphere: [number, number];
  /** Procedural four-dot flowers on the domes. */
  flowers: boolean;
}

export interface CanopyOptions {
  domes: Dome[];
  lookup: PaletteLookup;
  fog: FogSettings;
  /** Atlas holding the fog row (default `lookup`). */
  fogLookup?: PaletteLookup;
  /**
   * Centre of a hull sphere of the whole crown: dome normals are blended with it by `crownBlend` → every dome keeps
   * its light crescent, yet the canopy reads as one lit mass (STYLE §5.5).
   */
  crownHull?: Vector3;
  crownBlend?: number;
  rows: { domes: number; motif: number };
  bands: TSLUniform;
  family: CanopyFamily;
  quality: CanopyQuality;
  bb: BillboardUniforms;
  /** Size of the micro-dot cells in tree units (Standard 0.2). */
  dotCell?: number;
  /** Lift of the light used for the dome banding towards the tree's up axis (Standard 0.9; 0 = the real sun). */
  lightLift?: number;
  /** Position warp in tree space (e.g. the planet's curvature bend); patterns stay on unwarped coordinates. */
  warp?: (p: Vec3Node) => Vec3Node;
  /** Rim dot size relative to the default (small bushes need bigger dots). */
  dotScale?: number;
  seed: number;
}

export interface Canopy {
  domes: InstancedMesh;
  dots: Mesh;
  counts: { domes: number; dots: number };
  setFamily(f: CanopyFamily): void;
  /** Share of rim dots drawn (LOD 0..1). */
  setDotShare(share: number): void;
  dispose(): void;
}

const _m = new Matrix4();
const _q = new Quaternion();
const _s = new Vector3();

/**
 * Jewel canopy (image 02, Ebene 33): all domes in one InstancedMesh with the ink material —
 * - **tone gradient**: each dome runs through two neighbouring families (teal → blue → violet → magenta → red) in
 *   three hard serigraph steps along its own direction (warmer on top), banded by the light;
 * - **micro-dot stipple**: object-space 3D cells, one dot per cell measured in the tangent plane (every dot shows
 *   whole, none swims), several tints plus a rare complementary accent; the dot radius scales with the light —
 *   in the shade the dots shrink smoothly to zero instead of popping;
 * - **four-dot flowers**: coarser cells, four dots in a diamond in the tangent plane, from the motif row;
 * - **rim fringe** (instanced hexagons): dots over the upper sphere that grow in only along the lit silhouette,
 *   all factors continuous (rimness, sun, growth) → they glide along the rim as the view turns, never pop.
 */
export function createCanopy(o: CanopyOptions): Canopy {
  const rand = mulberry32(hash32('hero-canopy-v3', o.seed));
  const { lookup, fog, bb } = o;
  const domes = o.domes;
  const n = Math.max(1, domes.length);
  const fogLookup = o.fogLookup ?? lookup;
  const DOT = o.dotCell ?? 0.2;

  // --- Domes ----------------------------------------------------------------------------------------------------
  const sphere = new SphereGeometry(1, o.quality.sphere[0], o.quality.sphere[1]);
  const hull = new Float32Array(n * 3);
  const info = new Float32Array(n * 4);
  const toneArr = new Float32Array(n * 4);
  sphere.setAttribute('hullCenter', new InstancedBufferAttribute(hull, 3));
  sphere.setAttribute('domeInfo', new InstancedBufferAttribute(info, 4));
  sphere.setAttribute('domeTone', new InstancedBufferAttribute(toneArr, 4).setUsage(DynamicDrawUsage));
  const hullAttr = attribute('hullCenter', 'vec3') as unknown as Vec3Node;
  const infoAttr = attribute('domeInfo', 'vec4');
  const toneAttr = attribute('domeTone', 'vec4');
  const pop = popScale(infoAttr.z as unknown as FloatNode, bb.crown);
  const crownHull: UniformNode<'vec3', Vector3> = uniform(o.crownHull ? o.crownHull.clone() : new Vector3(0, 0, 0));
  const blend = o.crownHull ? (o.crownBlend ?? 0.28) : 0;
  // everything the shading needs comes from attributes (unit sphere point, hull, radii) — never from the warped
  // position, so patterns stay glued to the dome while the planet's curvature bend moves the vertices
  const unit = positionGeometry as unknown as Vec3Node;
  const scaleU = vec3(infoAttr.x, infoAttr.x.mul(infoAttr.y), infoAttr.x);
  const pTree = hullAttr.add(unit.mul(scaleU));
  const nDome = normalize(unit.mul(vec3(1, infoAttr.y, 1)));
  const nCrown = pTree.sub(crownHull).normalize();
  const nMix = nDome.mul(1 - blend).add(nCrown.mul(blend));
  const warp = o.warp ?? ((p: Vec3Node) => p);
  const TERMINATOR = 0.16;
  const vInfo = varying(infoAttr, 'vDomeInfo');
  const vTone = varying(toneAttr, 'vDomeTone');
  const domeRow0 = o.rows.domes;
  const motifRow = o.rows.motif;
  const flowers = o.quality.flowers;

  // Earle lights his domes from above (image 02, Ebene 16): the banding uses the sun lifted towards the tree's up
  // axis — lit crowns, dark undersides — while cast shadows stay those of the real low sun (long ink shapes)
  const lift = o.lightLift ?? 0.9;
  const upView = modelViewMatrix.mul(vec4(0, 1, 0, 0)).xyz.normalize();
  const domeMaterial = new InkMaterial({
    shade: (_litSun, _ndlSun, shadow, L) => {
      const Ld = normalize(L.add(upView.mul(lift)));
      const ndl = normalView.dot(Ld);
      const lit = min(aaStep(TERMINATOR, ndl), shadow);
      const P = varying(pTree, 'vDomePos') as unknown as Vec3Node;
      const dh = vInfo.w;
      const qn = normalize(varying(unit, 'vDomeUnit'));
      // tone: two neighbouring families along the dome's own direction, three hard steps
      const g = qn.y.mul(0.85).add(qn.x.mul(vTone.y)).add(qn.z.mul(vTone.z));
      const tone = clamp(vTone.x.add(g.mul(0.42)), 0, 3.999);
      const ts = tone.mul(3);
      const fts = fract(ts);
      const wts = fwidth(ts).max(1e-4);
      const stepped = floor(ts).add(smoothstep(float(1).sub(wts), float(1), fts)).div(3);
      const fam = floor(stepped);
      const fr = stepped.sub(fam);
      const rowA = fam.add(domeRow0);
      const rowB = min(fam.add(1), float(4)).add(domeRow0);
      const band = clamp(ndl.sub(TERMINATOR).mul(2.3), 0, 0.999).mul(o.bands.sub(1));
      const litCol = mix(lookup.bands(band, rowA, 1).rgb, lookup.bands(band, rowB, 1).rgb, fr);
      const inkCol = mix(lookup.pal(0, rowA).rgb, lookup.pal(0, rowB).rgb, fr);
      let col: Vec3Node = mix(inkCol, litCol, lit);

      // tangent frame of the surface (object space) for the stipple
      const nObj = nDome as unknown as Vec3Node;
      const nrm = normalize(varying(nObj, 'vDomeNormalObj'));
      const light = smoothstep(-0.04, 0.42, ndl).mul(shadow);

      // micro-dots: one per 3D cell, distance measured in the tangent plane → whole dots, no swimming
      const C = P.div(DOT);
      const cell = floor(C);
      const cid = fract(cell.x.div(256)).mul(256).add(fract(cell.y.div(256)).mul(256).mul(256)).add(fract(cell.z.div(256)).mul(256).mul(65536)).floor();
      const h1 = hash(cid);
      const h2 = hash(cid.add(7));
      const h3 = hash(cid.add(13));
      const h4 = hash(cid.add(29));
      const cc = cell.add(0.5).add(vec3(h1, h2, h3).sub(0.5).mul(0.38));
      const dv = C.sub(cc);
      const dn = dv.dot(nrm);
      const d = sqrt(max(dv.dot(dv).sub(dn.mul(dn)), float(0)));
      const fw = fwidth(C.x).add(fwidth(C.y)).mul(0.5).max(1e-4);
      const far = smoothstep(float(0.42), float(0.2), fw); // cells under ~2.5 px: the stipple melts into the tint
      const dotR = float(0.17).add(h4.mul(0.12)).mul(light);
      const dotMask = smoothstep(dotR.add(fw), dotR.sub(fw).max(0), d).mul(step(0.12, h2)).mul(far);
      // mostly one band lighter (a woven texture), some light tints, rare sparkles and complementary accents
      const pick = hash(cid.add(41));
      const lighter = min(floor(band).add(2), float(3));
      const dotIdx = select(pick.lessThan(0.62), lighter, select(pick.lessThan(0.88), float(5), select(pick.lessThan(0.96), float(6), float(7))));
      const dotCol = mix(lookup.pal(dotIdx, rowA).rgb, lookup.pal(dotIdx, rowB).rgb, fr);
      col = mix(col, dotCol, dotMask);
      // at distance the stipple becomes a lighter tint of the lit side (same average, no shimmer)
      col = mix(col, mix(col, dotCol, 0.22), float(1).sub(far).mul(light).mul(0.8));

      if (flowers) {
        const FC = 0.95;
        const F = P.div(FC);
        const fcell = floor(F);
        const fid = fract(fcell.x.div(256)).mul(256).add(fract(fcell.y.div(256)).mul(256).mul(256)).add(fract(fcell.z.div(256)).mul(256).mul(65536)).floor().add(dh.mul(97).floor());
        const on = step(hash(fid.add(3)), float(0.34));
        const fc = fcell.add(0.5).add(vec3(hash(fid.add(5)), hash(fid.add(9)), hash(fid.add(17))).sub(0.5).mul(0.4));
        const fv = F.sub(fc);
        const t1 = normalize(cross(nrm, select(abs(nrm.y).lessThan(0.9), vec3(0, 1, 0), vec3(1, 0, 0))));
        const t2 = cross(nrm, t1);
        const lx = fv.dot(t1);
        const ly = fv.dot(t2);
        const s = float(0.13);
        const dd = min(min(length(vec2(lx.sub(s), ly)), length(vec2(lx.add(s), ly))), min(length(vec2(lx, ly.sub(s))), length(vec2(lx, ly.add(s)))));
        const ffw = fwidth(F.x).max(1e-4);
        const fr0 = float(0.062).mul(light);
        const petal = smoothstep(fr0.add(ffw), fr0.sub(ffw).max(0), dd).mul(on).mul(smoothstep(float(0.2), float(0.08), ffw));
        const mcol = lookup.pal(floor(hash(fid.add(23)).mul(7.99)), motifRow).rgb;
        col = mix(col, mcol, petal);
      }
      return col;
    },
    terminator: TERMINATOR,
    fog,
    lookup: fogLookup,
    normalNode: modelViewMatrix.mul(vec4(nMix, 0)).xyz.normalize(),
    positionNode: warp(hullAttr.add(positionLocal.sub(hullAttr).mul(pop))),
  });
  const domeMesh = new InstancedMesh(sphere, domeMaterial, n);
  domeMesh.name = 'hero-domes';
  domeMesh.castShadow = true;
  domeMesh.receiveShadow = true;
  domeMesh.frustumCulled = false;
  domes.forEach((d, i) => {
    _s.set(d.r, d.r * d.sy, d.r);
    _m.compose(d.center, _q.identity(), _s);
    domeMesh.setMatrixAt(i, _m);
    hull[i * 3] = d.center.x;
    hull[i * 3 + 1] = d.center.y;
    hull[i * 3 + 2] = d.center.z;
    info[i * 4] = d.r;
    info[i * 4 + 1] = d.sy;
    info[i * 4 + 2] = d.rank;
    info[i * 4 + 3] = d.hash;
  });
  domeMesh.instanceMatrix.needsUpdate = true;
  domeMesh.count = domes.length;

  // --- Rim fringe dots ------------------------------------------------------------------------------------------
  const dotRel: number[] = [];
  const dotHull: number[] = [];
  const dotNormal: number[] = [];
  const dotData: number[] = [];
  const dotDome: number[] = [];
  const rMin = Math.min(...domes.map((d) => d.r));
  const rMax = Math.max(...domes.map((d) => d.r));
  const golden = Math.PI * (3 - Math.sqrt(5));
  const Y_MIN = -0.2;
  domes.forEach((d, di) => {
    const sizeT = rMax > rMin ? (d.r - rMin) / (rMax - rMin) : 1;
    const count = Math.round(o.quality.dotsPerDome[0] + (o.quality.dotsPerDome[1] - o.quality.dotsPerDome[0]) * sizeT * sizeT);
    const dotR = Math.max(0.03, 0.0135 * d.r) * (o.dotScale ?? 1);
    const m = Math.round(count / ((1 - Y_MIN) / 2));
    const phase = rand() * Math.PI * 2;
    for (let i = 0; i < m; i++) {
      const y = 1 - (2 * (i + 0.5)) / m;
      if (y < Y_MIN) continue;
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
      const size = dotR * (0.7 + 0.6 * rand());
      dotRel.push(nx * d.r + tx * size * 0.55, y * d.r * d.sy + ty * size * 0.55, nz * d.r + tz * size * 0.55);
      dotHull.push(d.center.x, d.center.y, d.center.z);
      dotNormal.push(tx, ty, tz);
      dotData.push(size, d.rank, rand(), rand());
      dotDome.push(di);
    }
  });
  // shuffle-free LOD: interleave so any prefix covers all domes evenly
  const order = dotDome.map((_, i) => i).sort((a, b) => dotData[a * 4 + 3]! - dotData[b * 4 + 3]!);
  const reorder = (src: number[], k: number): Float32Array => {
    const out = new Float32Array(Math.max(1, order.length) * k);
    order.forEach((from, to) => {
      for (let c = 0; c < k; c++) out[to * k + c] = src[from * k + c]!;
    });
    return out;
  };
  const dotDomeSorted = order.map((i) => dotDome[i]!);
  const dotGeo = new InstancedBufferGeometry();
  const hex = createHexagon();
  dotGeo.setAttribute('position', hex.position);
  dotGeo.setIndex(hex.index);
  const nd = Math.max(1, order.length);
  const dotTone = new Float32Array(nd);
  dotGeo.setAttribute('dotRel', new InstancedBufferAttribute(reorder(dotRel, 3), 3));
  dotGeo.setAttribute('dotHull', new InstancedBufferAttribute(reorder(dotHull, 3), 3));
  dotGeo.setAttribute('dotNormal', new InstancedBufferAttribute(order.length ? reorder(dotNormal, 3) : new Float32Array([0, 1, 0]), 3));
  dotGeo.setAttribute('dotData', new InstancedBufferAttribute(reorder(dotData, 4), 4));
  dotGeo.setAttribute('dotTone', new InstancedBufferAttribute(dotTone, 1).setUsage(DynamicDrawUsage));
  const dotTotal = order.length;
  dotGeo.instanceCount = dotTotal;
  dotGeo.boundingSphere = null;

  let dotMaterial: MeshBasicNodeMaterial;
  let dotMesh: Mesh;
  {
    const rel = attribute('dotRel', 'vec3') as unknown as Vec3Node;
    const hullC = attribute('dotHull', 'vec3') as unknown as Vec3Node;
    const nrm = attribute('dotNormal', 'vec3') as unknown as Vec3Node;
    const dd = attribute('dotData', 'vec4');
    const dtone = attribute('dotTone', 'float') as unknown as FloatNode;
    const s = popScale(dd.y as unknown as FloatNode, bb.crown);
    const centre = hullC.add(rel.mul(s));
    const worldC = modelWorldMatrix.mul(vec4(warp(centre), 1)).xyz;
    const nW = modelWorldMatrix.mul(vec4(nrm, 0)).xyz.normalize();
    const upW = modelWorldMatrix.mul(vec4(0, 1, 0, 0)).xyz.normalize();
    const ndl = nW.dot(normalize(bb.sunDirWorld.add(upW.mul(lift))));
    const viewC = cameraViewMatrix.mul(vec4(worldC, 1));
    const depth = viewC.z.negate().max(0.05);
    const pxPerUnit = bb.projScaleY.mul(screenSize.y).mul(0.5).div(depth);
    // continuous visibility: silhouette band × sun × upper side × growth — dots grow and shrink, never pop
    const rimness = float(1).sub(abs(nW.dot(normalize(cameraPosition.sub(worldC)))));
    const rimW = smoothstep(dd.z.mul(0.3).add(0.42), dd.z.mul(0.3).add(0.62), rimness);
    const sunW = smoothstep(-0.02, 0.4, ndl);
    const upSide = smoothstep(-0.3, 0.25, nrm.y);
    const grow = rimW.mul(sunW).mul(upSide);
    // never larger than ~1.2 % of the screen height (close to the lens the fringe stays fine)
    const sizeW = dd.x.mul(s).mul(grow).min(screenSize.y.mul(0.012).div(pxPerUnit));
    const px = sizeW.mul(pxPerUnit);
    // under the pixel threshold the dot shrinks smoothly to nothing (no hard collapse)
    const collapse = smoothstep(bb.collapsePx.mul(0.6), bb.collapsePx.mul(1.4), px);
    const offset = bb.camRight.mul(positionGeometry.x).add(bb.camUp.mul(positionGeometry.y)).mul(sizeW.mul(collapse));
    const material = new MeshBasicNodeMaterial();
    material.vertexNode = cameraProjectionMatrix.mul(cameraViewMatrix.mul(vec4(worldC.add(offset), 1)));
    const vNdl = varying(ndl, 'vHeroDotNdl');
    const vTone = varying(dtone, 'vHeroDotTone');
    const fam = floor(vTone);
    const frr = fract(vTone);
    const rowA = fam.add(domeRow0);
    const rowB = min(fam.add(1), float(4)).add(domeRow0);
    const idx = select(vNdl.greaterThan(0.55), float(6), float(5));
    const colour = mix(lookup.pal(idx, rowA).rgb, lookup.pal(idx, rowB).rgb, step(0.5, frr));
    material.colorNode = steppedFog(colour, fog, fogLookup);
    dotMesh = new Mesh(dotGeo, material);
    dotMesh.name = 'hero-dots';
    dotMesh.castShadow = false;
    dotMesh.receiveShadow = false;
    dotMesh.frustumCulled = false;
    dotMaterial = material;
  }

  // --- Colour mode ------------------------------------------------------------------------------------------------
  const phase = rand() * Math.PI * 2;
  const setFamily = (f: CanopyFamily) => {
    domes.forEach((d, i) => {
      const a = phase + d.hash * Math.PI * 2;
      toneArr[i * 4] = Math.min(3.999, familyTone(f, d.tone));
      toneArr[i * 4 + 1] = Math.cos(a) * 0.35;
      toneArr[i * 4 + 2] = Math.sin(a) * 0.35;
      toneArr[i * 4 + 3] = 0;
    });
    for (let i = 0; i < dotDomeSorted.length; i++) dotTone[i] = Math.min(3.999, familyTone(f, domes[dotDomeSorted[i]!]!.tone) + 0.3);
    (sphere.getAttribute('domeTone') as InstancedBufferAttribute).needsUpdate = true;
    (dotGeo.getAttribute('dotTone') as InstancedBufferAttribute).needsUpdate = true;
  };
  setFamily(o.family);

  return {
    domes: domeMesh,
    dots: dotMesh,
    counts: { domes: domes.length, dots: dotTotal },
    setFamily,
    setDotShare: (share) => {
      dotGeo.instanceCount = Math.max(0, Math.min(dotTotal, Math.round(dotTotal * share)));
    },
    dispose: () => {
      sphere.dispose();
      dotGeo.dispose();
      domeMaterial.dispose();
      dotMaterial.dispose();
    },
  };
}
