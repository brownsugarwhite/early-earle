import { InstancedBufferAttribute, InstancedBufferGeometry, InstancedMesh, Matrix4, Mesh, MeshBasicNodeMaterial, Quaternion, SphereGeometry, Vector3 } from 'three/webgpu';
import type { UniformNode } from 'three/webgpu';
import {
  abs,
  asin,
  atan,
  attribute,
  cameraPosition,
  cameraProjectionMatrix,
  cameraViewMatrix,
  clamp,
  cos,
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
  sin,
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
import { STEP_GRADIENT, earleGradients, shiftTone } from '../gradients';
import { LOD_FADE, applyLod, lodScale, popScale, type BillboardUniforms } from './branches';
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
  /** Kept for compatibility: v4 domes have fixed steps (three colour bands, one highlight, ink). */
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
  /** How far each dome's own tone leads its three colour bands (0 = Earle's red → violet → blue for all, Standard). */
  bandDrift?: number;
  seed: number;
}

export interface Canopy {
  domes: InstancedMesh;
  dots: Mesh;
  counts: { domes: number; dots: number };
  setFamily(f: CanopyFamily): void;
  /** Share of rim dots drawn (LOD 0..1). */
  setDotShare(share: number): void;
  /** Re-sorts the dome instances front to back for a camera position in canopy space; true if the order changed. */
  sortForCamera(camera: Vector3): boolean;
  dispose(): void;
}

const _m = new Matrix4();
const _q = new Quaternion();
const _s = new Vector3();

/**
 * Crown v4 colour bands (image 02 / Ebene 3): band coordinate = height on the dome (unit-sphere y), tilted by this
 * share towards the lifted light (warm light, cool shade).
 */
const BAND_TILT = 0.45;
/** Above: the warm cap (red); below `BAND_COOL`: the cool underside (blue); between: violet. */
const BAND_WARM = 0.55;
const BAND_COOL = 0.0;
/** Lifted N·L above which the hard highlight crescent (palette step 3) lies. */
const DOME_HIGHLIGHT = 0.62;
/** Diamond-flower lattice cell on the dome (tree units). */
const FLOWER_CELL = 0.7;
/** Micro-dot cell (tree units, Standard of `CanopyOptions.dotCell`). */
const DOT_CELL = 0.32;
/** Rim fringe dots per dome relative to `CanopyQuality.dotsPerDome` (v4: a denser beaded edge). */
const RIM_DOTS = 1.5;

/**
 * Families (continuous 0..4: teal, blue, violet, magenta, red) of a dome's three bands — cool underside, middle, warm
 * cap — from its tone (0 rim … 1 top) in a colour mode: every dome runs red → violet → blue (image 02), the tone only
 * drifts the bands (low rim domes cooler: teal → blue → magenta; the top: blue → violet → red). `drift` 0..1 lets
 * the tone lead instead (bands around the dome's own tone): siblings keep their own colour (a teal tree, a red tree).
 */
export function domeBandFamilies(mode: CanopyFamily, tone: number, drift = 0): [number, number, number] {
  const t = Math.min(1, Math.max(0, tone));
  const dt = t - 0.6;
  const cap = (a: number, b: number): number => Math.min(3.999, familyTone(mode, a + (b - a) * drift));
  return [cap(0.22 + 0.5 * dt, t - 0.3), cap(0.5 + 0.45 * dt, t), cap(0.95 + 0.35 * dt, t + 0.3)];
}

/**
 * Jewel canopy v4 (image 02, Ebene 3/32): all domes in one InstancedMesh with the ink material —
 * - **three hard colour bands** per dome by its height (tilted a little towards the light, hand-cut wavy edge): warm
 *   cap (red), violet middle, cool underside (blue); the families per dome come from `domeBandFamilies`. Each band
 *   carries its own inner gradient (Earle's split fountain per screen, lighter towards its upper edge); one hard
 *   highlight crescent towards the sun; below the terminator the ink — the dark core between overlapping domes;
 * - **micro-dot stipple**: object-space 3D cells, one dot per cell measured in the tangent plane (every dot shows
 *   whole, none swims), two tones (one light step lighter, rarely near-white); the dot radius scales with the
 *   light — in the shade the dots shrink smoothly to zero instead of popping;
 * - **diamond flowers as a tapestry**: a latitude/longitude lattice on each dome, every second cell four dots in a
 *   diamond, motif colours by band;
 * - **rim fringe** (instanced hexagons): white beads over the upper sphere that grow in only along the lit
 *   silhouette, all factors continuous (rimness, sun, growth) → they glide along the rim as the view turns, never pop.
 */
export function createCanopy(o: CanopyOptions): Canopy {
  const rand = mulberry32(hash32('hero-canopy-v3', o.seed));
  const { lookup, fog, bb } = o;
  const domes = o.domes;
  const n = Math.max(1, domes.length);
  const fogLookup = o.fogLookup ?? lookup;
  const DOT = o.dotCell ?? DOT_CELL;
  const bandDrift = Math.min(1, Math.max(0, o.bandDrift ?? 0));

  // --- Domes ----------------------------------------------------------------------------------------------------
  const sphere = new SphereGeometry(1, o.quality.sphere[0], o.quality.sphere[1]);
  const hull = new Float32Array(n * 3);
  const info = new Float32Array(n * 4);
  const toneArr = new Float32Array(n * 4);
  sphere.setAttribute('hullCenter', new InstancedBufferAttribute(hull, 3));
  sphere.setAttribute('domeInfo', new InstancedBufferAttribute(info, 4));
  sphere.setAttribute('domeTone', new InstancedBufferAttribute(toneArr, 4));
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
  const TERMINATOR = -0.12;
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
    shade: (_litSun, _ndlSun, shadow, L, Lt) => {
      // bands with the light globe (L_b), the dome terminator with the ink globe (L_t) — both lifted towards the tree's up
      const Ld = normalize(L.add(upView.mul(lift)));
      const LdInk = normalize(Lt.add(upView.mul(lift)));
      const ndl = normalView.dot(Ld);
      const lit = min(aaStep(TERMINATOR, normalView.dot(LdInk)), shadow);
      const P = varying(pTree, 'vDomePos') as unknown as Vec3Node;
      const dh = vInfo.w;
      const qn = normalize(varying(unit, 'vDomeUnit'));
      const soft = earleGradients.surface;
      // three hard colour bands by height on the dome (image 02 / Ebene 3: red cap → violet → blue underside), tilted
      // a little towards the light (warm light, cool shade) and cut with a gentle hand-made wave; the band families
      // come per dome from `setFamily` (vTone: cool, middle, warm, edge shift)
      const nView = normalize(varying(modelViewMatrix.mul(vec4(nDome, 0)).xyz, 'vDomeNormalView'));
      const lon = atan(qn.z, qn.x);
      const wave = sin(lon.mul(3).add(dh.mul(6.2832)))
        .mul(0.06)
        .add(sin(lon.mul(7).add(dh.mul(17.3))).mul(0.03))
        .add(sin(lon.mul(13).add(dh.mul(41.1))).mul(0.015));
      const hb = qn.y.mul(1 - BAND_TILT).add(nView.dot(Ld).mul(BAND_TILT)).add(wave).sub(vTone.w);
      const sCool = aaStep(BAND_COOL, hb);
      const sWarm = aaStep(BAND_WARM, hb);
      const famT = clamp(mix(mix(vTone.x, vTone.y, sCool), vTone.z, sWarm), 0, 3.999);
      const fam = floor(famT);
      const fr = famT.sub(fam);
      const rowA = fam.add(domeRow0);
      const rowB = min(fam.add(1), float(4)).add(domeRow0);
      // each band carries its own gradient (Earle's split fountain per screen): lighter towards its upper edge; it
      // restarts at every band edge, so the edge stays a hard jump (`?verlauf=0` shows the pure steps)
      const gWarm = hb.sub(BAND_WARM).div(1 - BAND_WARM);
      const gMid = hb.sub(BAND_COOL).div(BAND_WARM - BAND_COOL);
      const gCool = hb.add(1).div(BAND_COOL + 1);
      const gBand = clamp(select(sWarm.greaterThan(0.5), gWarm, select(sCool.greaterThan(0.5), gMid, gCool)).mul(2).sub(1), -1, 1);
      // light: the colour bands already carry it (warm light, cool shade); on top one hard highlight crescent towards
      // the sun (palette step 3, image 02: the orange-red flank of the red cap) and the ink below the terminator — the
      // dark core between overlapping domes. Three bands + highlight + ink, no further stripes.
      const famCol = (i: number): Vec3Node => mix(lookup.pal(i, rowA).rgb, lookup.pal(i, rowB).rgb, fr) as unknown as Vec3Node;
      const hi = aaStep(DOME_HIGHLIGHT, ndl);
      const c2 = famCol(2);
      const c3 = famCol(3);
      const base = mix(c2, c3, hi) as unknown as Vec3Node;
      const lighter = mix(c3, famCol(5), hi) as unknown as Vec3Node;
      const darker = mix(famCol(1), c2, hi) as unknown as Vec3Node;
      const litCol = shiftTone(base, lighter, darker, gBand, soft.mul(STEP_GRADIENT));
      let col: Vec3Node = mix(famCol(0), litCol, lit);

      // tangent frame of the surface (object space) for the stipple
      const nObj = nDome as unknown as Vec3Node;
      const nrm = normalize(varying(nObj, 'vDomeNormalObj'));
      const light = smoothstep(-0.04, 0.42, ndl).mul(shadow);

      // micro-dots: one per 3D cell, distance measured in the tangent plane → whole dots, no swimming
      const C = P.div(DOT);
      const cell = floor(C);
      const cid = fract(cell.x.div(256)).mul(256).add(fract(cell.y.div(256)).mul(256).mul(256)).add(fract(cell.z.div(256)).mul(256).mul(65536)).floor();
      // two hashes per cell; the other random values are derived from them (cheap on phones)
      const h1 = hash(cid);
      const h2 = hash(cid.add(7));
      const h3 = fract(h1.mul(17.31).add(h2.mul(3.7)));
      const h4 = fract(h2.mul(23.17).add(h1.mul(5.3)));
      const cc = cell.add(0.5).add(vec3(h1, h2, h3).sub(0.5).mul(0.38));
      const dv = C.sub(cc);
      const dn = dv.dot(nrm);
      const d = sqrt(max(dv.dot(dv).sub(dn.mul(dn)), float(0)));
      const fw = fwidth(C.x).add(fwidth(C.y)).mul(0.5).max(1e-4);
      const far = smoothstep(float(0.42), float(0.2), fw); // cells under ~2.5 px: the stipple melts into the tint
      const dotR = float(0.12).add(h4.mul(0.1)).mul(light);
      const dotMask = smoothstep(dotR.add(fw), dotR.sub(fw).max(0), d).mul(step(0.12, h2)).mul(far);
      // two tones: mostly one light step lighter in the dome's own family (a woven texture), rarely white
      const pick = fract(h1.mul(41.9).add(h2.mul(11.3)));
      const dotCol = select(pick.lessThan(0.9), lighter, lookup.pal(6, motifRow).rgb);
      col = mix(col, dotCol, dotMask);
      // at distance the stipple becomes a lighter tint of the lit side (same average, no shimmer)
      col = mix(col, mix(col, dotCol, 0.22), float(1).sub(far).mul(light).mul(0.8));

      if (flowers) {
        // diamond flowers as a tapestry (image 02): a latitude/longitude lattice on the dome (rows of cells ≈ FLOWER_CELL
        // wide, every other row shifted half a cell), every second cell carries four dots in a diamond. The lattice
        // follows the dome, not space — the rows curve with the cap like Earle's woven motifs.
        const rr = vInfo.x;
        const lat = asin(clamp(qn.y, -1, 1));
        const latScale = rr.mul(vInfo.y.add(1).mul(0.5));
        const rowF = lat.mul(latScale).div(FLOWER_CELL);
        const row = floor(rowF);
        const latC = row.add(0.5).mul(FLOWER_CELL).div(latScale);
        const ring = rr.mul(Math.PI * 2);
        const nLon = floor(cos(latC).max(0).mul(ring).div(FLOWER_CELL)).max(1);
        const lonF = lon.div(Math.PI * 2).add(0.5).mul(nLon).add(fract(row.mul(0.5)));
        const colF = floor(lonF);
        const colW = colF.sub(nLon.mul(floor(colF.div(nLon))));
        const fh = hash(row.add(64).mul(271).add(colW).add(dh.mul(9973).floor()));
        const on = step(fh, float(0.5)).mul(step(3.5, nLon));
        const lx = fract(lonF).sub(0.5).add(fract(fh.mul(13.1)).sub(0.5).mul(0.14)).mul(cos(lat).max(0).mul(ring).div(nLon));
        const ly = fract(rowF).sub(0.5).add(fract(fh.mul(27.7)).sub(0.5).mul(0.14)).mul(FLOWER_CELL);
        const s = float(FLOWER_CELL * 0.21);
        const dd = min(min(length(vec2(lx.sub(s), ly)), length(vec2(lx.add(s), ly))), min(length(vec2(lx, ly.sub(s))), length(vec2(lx, ly.add(s)))));
        const pw = length(fwidth(P)).mul(0.6).max(1e-4);
        const fr0 = float(FLOWER_CELL * 0.1).mul(light);
        const petal = smoothstep(fr0.add(pw), fr0.sub(pw).max(0), dd).mul(on).mul(smoothstep(float(0.2), float(0.08), pw.div(FLOWER_CELL)));
        // motif colours by band: pink/cream on the warm cap, cyan/lilac on violet, cyan/mint/white on the blue
        const k = fract(fh.mul(91.7));
        const warmIdx = select(k.lessThan(0.5), float(1), select(k.lessThan(0.82), float(0), float(3)));
        const midIdx = select(k.lessThan(0.5), float(2), select(k.lessThan(0.82), float(7), float(1)));
        const coolIdx = select(k.lessThan(0.5), float(2), select(k.lessThan(0.82), float(5), float(6)));
        const mIdx = select(sWarm.greaterThan(0.5), warmIdx, select(sCool.greaterThan(0.5), midIdx, coolIdx));
        col = mix(col, lookup.pal(mIdx, motifRow).rgb, petal);
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
  // STYLE §5.5: crowns do not read the shadow map — each dome is its own light/ink shape (lifted light), the long
  // shadows fall onto the ground and the wood. Saves the cascade sampling on the most expensive surface, and the
  // stipple dots are never cut by a cast-shadow edge (they only scale with the light)
  domeMesh.receiveShadow = false;
  domeMesh.frustumCulled = false;
  // Instance slot → dome index. The slots are re-sorted front to back when the camera moves (see sortForCamera):
  // the stippled dome shader is the most expensive one of the tree, early-z then shades each pixel about once.
  // Note: no DynamicDrawUsage anywhere — three r186 re-uploads such attributes on every frame; updates go through
  // needsUpdate (version bump) only when something changed.
  let order = domes.map((_, i) => i);
  const domeTone = new Float32Array(n * 4);
  const writeInstances = () => {
    order.forEach((di, slot) => {
      const d = domes[di]!;
      _s.set(d.r, d.r * d.sy, d.r);
      _m.compose(d.center, _q.identity(), _s);
      domeMesh.setMatrixAt(slot, _m);
      hull[slot * 3] = d.center.x;
      hull[slot * 3 + 1] = d.center.y;
      hull[slot * 3 + 2] = d.center.z;
      info[slot * 4] = d.r;
      info[slot * 4 + 1] = d.sy;
      info[slot * 4 + 2] = d.rank;
      info[slot * 4 + 3] = d.hash;
      toneArr.set(domeTone.subarray(di * 4, di * 4 + 4), slot * 4);
    });
    domeMesh.instanceMatrix.needsUpdate = true;
    (sphere.getAttribute('hullCenter') as InstancedBufferAttribute).needsUpdate = true;
    (sphere.getAttribute('domeInfo') as InstancedBufferAttribute).needsUpdate = true;
    (sphere.getAttribute('domeTone') as InstancedBufferAttribute).needsUpdate = true;
  };
  writeInstances();
  domeMesh.count = domes.length;
  const sortKey = new Float32Array(n);
  const sortForCamera = (camTree: Vector3): boolean => {
    for (let i = 0; i < domes.length; i++) {
      const d = domes[i]!;
      // distance to the nearest point of the dome's bounding sphere (front surface first)
      sortKey[i] = d.center.distanceTo(camTree) - d.r;
    }
    const next = domes.map((_, i) => i).sort((a, b) => sortKey[a]! - sortKey[b]!);
    let same = true;
    for (let i = 0; i < next.length; i++) {
      if (next[i] !== order[i]) {
        same = false;
        break;
      }
    }
    if (same) return false;
    order = next;
    writeInstances();
    return true;
  };

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
    const count = Math.round(RIM_DOTS * (o.quality.dotsPerDome[0] + (o.quality.dotsPerDome[1] - o.quality.dotsPerDome[0]) * sizeT * sizeT));
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
  const dotOrder = dotDome.map((_, i) => i).sort((a, b) => dotData[a * 4 + 3]! - dotData[b * 4 + 3]!);
  const reorder = (src: number[], k: number): Float32Array => {
    const out = new Float32Array(Math.max(1, dotOrder.length) * k);
    dotOrder.forEach((from, to) => {
      for (let c = 0; c < k; c++) out[to * k + c] = src[from * k + c]!;
    });
    return out;
  };
  const dotDomeSorted = dotOrder.map((i) => dotDome[i]!);
  const dotGeo = new InstancedBufferGeometry();
  const hex = createHexagon();
  dotGeo.setAttribute('position', hex.position);
  dotGeo.setIndex(hex.index);
  const nd = Math.max(1, dotOrder.length);
  const dotTone = new Float32Array(nd);
  dotGeo.setAttribute('dotRel', new InstancedBufferAttribute(reorder(dotRel, 3), 3));
  dotGeo.setAttribute('dotHull', new InstancedBufferAttribute(reorder(dotHull, 3), 3));
  dotGeo.setAttribute('dotNormal', new InstancedBufferAttribute(dotOrder.length ? reorder(dotNormal, 3) : new Float32Array([0, 1, 0]), 3));
  dotGeo.setAttribute('dotData', new InstancedBufferAttribute(reorder(dotData, 4), 4));
  dotGeo.setAttribute('dotTone', new InstancedBufferAttribute(dotTone, 1));
  const dotTotal = dotOrder.length;
  const dotLod: TSLUniform = uniform(dotTotal + LOD_FADE);
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
    const s = popScale(dd.y as unknown as FloatNode, bb.crown).mul(lodScale(dotLod));
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
    // white beads on the lit silhouette (Ebene 32), the family's near-white where the light turns away
    const pale = mix(lookup.pal(6, rowA).rgb, lookup.pal(6, rowB).rgb, step(0.5, frr));
    const colour = mix(pale, lookup.pal(6, motifRow).rgb, step(0.45, vNdl));
    material.colorNode = steppedFog(colour, fog, fogLookup);
    dotMesh = new Mesh(dotGeo, material);
    dotMesh.name = 'hero-dots';
    dotMesh.castShadow = false;
    dotMesh.receiveShadow = false;
    dotMesh.frustumCulled = false;
    dotMaterial = material;
  }

  // --- Colour mode ------------------------------------------------------------------------------------------------
  const setFamily = (f: CanopyFamily) => {
    domes.forEach((d, i) => {
      const [cool, mid, warm] = domeBandFamilies(f, d.tone, bandDrift);
      domeTone[i * 4] = cool;
      domeTone[i * 4 + 1] = mid;
      domeTone[i * 4 + 2] = warm;
      // each dome cuts its bands a little higher or lower (hand-made, never one ruler for all)
      domeTone[i * 4 + 3] = (d.hash - 0.5) * 0.2;
    });
    order.forEach((di, slot) => toneArr.set(domeTone.subarray(di * 4, di * 4 + 4), slot * 4));
    for (let i = 0; i < dotDomeSorted.length; i++) dotTone[i] = domeBandFamilies(f, domes[dotDomeSorted[i]!]!.tone, bandDrift)[2];
    (sphere.getAttribute('domeTone') as InstancedBufferAttribute).needsUpdate = true;
    (dotGeo.getAttribute('dotTone') as InstancedBufferAttribute).needsUpdate = true;
  };
  setFamily(o.family);

  return {
    domes: domeMesh,
    dots: dotMesh,
    counts: { domes: domes.length, dots: dotTotal },
    setFamily,
    sortForCamera,
    setDotShare: (share) => applyLod(dotLod, dotGeo, dotTotal, share),
    dispose: () => {
      sphere.dispose();
      dotGeo.dispose();
      domeMaterial.dispose();
      dotMaterial.dispose();
    },
  };
}
