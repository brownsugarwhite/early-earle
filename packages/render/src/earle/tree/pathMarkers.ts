import { BufferGeometry, CylinderGeometry, Float32BufferAttribute, Group, InstancedBufferAttribute, InstancedMesh, Matrix4, MeshBasicNodeMaterial, Quaternion, Vector3 } from 'three/webgpu';
import type { Node } from 'three/webgpu';
import { attribute, color, float, fract, fwidth, max, mix, positionGeometry, positionLocal, smoothstep, step, uniform } from 'three/tsl';
import type { Vec3 } from '@ee/world';
import { steppedFog, type FogSettings, type PaletteLookup } from '../tsl';
import { heroNodeScale, type HeroPathDot, type HeroPathNode, type HeroTreePath } from './treePath';

type FloatNode = Node<'float'>;
type Vec3Node = Node<'vec3'>;

export interface HeroPathMarkerOptions {
  path: HeroTreePath;
  /** Direction to the sun in the markers' local (tree) space — contact shadows of the stones. */
  sunDirLocal?: Vector3;
  /** Marker size in tree units (Standard 1: shelf fungus ≈ 2.2 wide, stones ≈ 1.8). */
  scale?: number;
  /**
   * Relative sizes per marker kind on top of `scale` (Standard 1 each): the map makes the shelf fungi larger so the
   * hero can sit on them, the flower stones and dots stay the size of the ground path.
   */
  scales?: { fungus?: number; stone?: number; dot?: number };
  /** Position warp in tree space (planet curvature bend), like the tree's own `warp`. */
  warp?: (p: Vec3Node) => Vec3Node;
  /** Stepped distance fog of the world (the markers fade into the same value steps as the tree). Default: none. */
  fog?: { settings: FogSettings; lookup: PaletteLookup };
  /**
   * Also lay the exit (`path.exit.dots`: down the canopy and along the ground limb) as dots — the way back to the ground
   * lies on the tree too. Default false.
   */
  exitDots?: boolean;
}

export interface HeroPathMarkers {
  group: Group;
  /**
   * `current` gets the ring and breathes (−1 = none, e.g. the hero is on the ground path); nodes < `done` are completed;
   * newly reached nodes bloom (pulse). Without a current node, `done ≥ nodes` marks every dot as walked.
   */
  setProgress(current: number, done: number): void;
  /** Hide one node (its level plateau stands there) or none (`null`). The ring hides with it. */
  setHidden(index: number | null): void;
  /** Animations (seconds): bloom pulse, breathing, the light wave along the dots. */
  update(time: number): void;
  setSunDirection(dirLocal: Vector3): void;
  /**
   * Where a figure stands on node `index` (tree space): on top of the shelf fungus (far enough from the bark for a body
   * of `radius` tree units, up = the fungus seat) or on top of the flower stone (up = surface normal). False for an
   * unknown index.
   */
  seat(index: number, outPos: Vector3, outUp: Vector3, radius?: number): boolean;
  dispose(): void;
}

const PAPER = '#f7f6d8';
const OCHRE = '#d9b25e';
const PINK = '#e5aed4';
const ROSE = '#c9608f';
const INK = '#0b0f1a';
const RING_A = '#ff77ae';
const RING_B = '#b668d9';

const _m = new Matrix4();
const _q = new Quaternion();
const _p = new Vector3();
const _s = new Vector3();

/**
 * Shelf fungus (bracket fungus) in its local frame: +Y up (seat), +Z out of the bark, X along the bark. A half lens:
 * domed top, flatter underside, back face inside the bark. Attribute `ring` = radial parameter 0..1 (growth rings).
 */
function fungusGeometry(): BufferGeometry {
  const A = 36;
  const Rr = 9;
  const pos: number[] = [];
  const ring: number[] = [];
  const angle: number[] = [];
  const side: number[] = [];
  const idx: number[] = [];
  const top: number[] = [];
  const bot: number[] = [];
  const vert = (x: number, y: number, z: number, r: number, a: number, sd: number) => {
    pos.push(x, y, z);
    ring.push(r);
    angle.push(a);
    side.push(sd);
    return pos.length / 3 - 1;
  };
  // scalloped outline (image 04 ornaments: nothing is a plain circle), a domed top and a flatter underside
  const outline = (th: number): number => 1 + 0.07 * Math.cos(7 * th) + 0.04 * Math.cos(3 * th + 0.6);
  const shape = (rho: number, th: number): [number, number] => {
    const k = outline(th);
    return [1.15 * rho * k * Math.sin(th), 0.9 * rho * k * Math.cos(th) - 0.14];
  };
  for (let i = 0; i <= Rr; i++) {
    const rho = i / Rr;
    for (let j = 0; j <= A; j++) {
      const a = j / A;
      const th = -Math.PI / 2 + a * Math.PI;
      const [x, z] = shape(rho, th);
      top.push(vert(x, 0.5 * Math.pow(Math.max(0, 1 - rho * rho), 0.45) + 0.05, z, rho, a, 1));
    }
  }
  for (let i = 0; i <= Rr; i++) {
    const rho = i / Rr;
    for (let j = 0; j <= A; j++) {
      const a = j / A;
      const th = -Math.PI / 2 + a * Math.PI;
      const [x, z] = shape(rho, th);
      bot.push(vert(x, -0.24 * Math.pow(Math.max(0, 1 - rho * rho), 0.65) + 0.05, z, rho, a, -1));
    }
  }
  const W = A + 1;
  for (let i = 0; i < Rr; i++) {
    for (let j = 0; j < A; j++) {
      // top faces +Y, underside −Y (front faces towards the viewer from above / below)
      const a = top[i * W + j]!;
      const b = top[(i + 1) * W + j]!;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
      const c = bot[i * W + j]!;
      const d = bot[(i + 1) * W + j]!;
      idx.push(c, c + 1, d, d, c + 1, d + 1);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('ring', new Float32BufferAttribute(ring, 1));
  g.setAttribute('angle', new Float32BufferAttribute(angle, 1));
  g.setAttribute('side', new Float32BufferAttribute(side, 1));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/**
 * Flower stone lying on a dome, limb or root: a flat rosette (8 rounded petals) with a little thickness, +Y up.
 * Attribute `petal` = radial parameter (0 centre … 1 petal tip), `wall` = 1 on the side wall.
 */
function rosetteGeometry(petals = 8): BufferGeometry {
  const A = petals * 8;
  const T = 0.14;
  const pos: number[] = [0, T, 0];
  const pet: number[] = [0];
  const wall: number[] = [0];
  const idx: number[] = [];
  const rOf = (th: number) => 0.62 + 0.36 * Math.pow(0.5 + 0.5 * Math.cos(petals * th), 0.7);
  // two rings on the top (centre disc edge at 0.3, outline) so the centre colour has its own vertices
  for (let j = 0; j <= A; j++) {
    const th = (j / A) * Math.PI * 2;
    pos.push(0.3 * Math.cos(th), T, 0.3 * Math.sin(th));
    pet.push(0.32);
    wall.push(0);
  }
  for (let j = 0; j <= A; j++) {
    const th = (j / A) * Math.PI * 2;
    const r = rOf(th);
    pos.push(r * Math.cos(th), T * 0.7, r * Math.sin(th));
    pet.push(1);
    wall.push(0);
  }
  for (let j = 0; j <= A; j++) {
    const th = (j / A) * Math.PI * 2;
    const r = rOf(th);
    pos.push(r * Math.cos(th), T * 0.7, r * Math.sin(th), r * 0.96 * Math.cos(th), -0.04, r * 0.96 * Math.sin(th));
    pet.push(1, 1);
    wall.push(1, 1);
  }
  const ring1 = 1;
  const ring2 = ring1 + A + 1;
  const wallBase = ring2 + A + 1;
  for (let j = 0; j < A; j++) {
    idx.push(0, ring1 + j + 1, ring1 + j);
    idx.push(ring1 + j, ring1 + j + 1, ring2 + j, ring2 + j, ring1 + j + 1, ring2 + j + 1);
    const w = wallBase + j * 2;
    idx.push(w, w + 2, w + 1, w + 1, w + 2, w + 3);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('petal', new Float32BufferAttribute(pet, 1));
  g.setAttribute('wall', new Float32BufferAttribute(wall, 1));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/**
 * Flat half-annulus (current-node outline around a shelf fungus, same scalloped outline) or full annulus (flower
 * stone), in the XZ plane, facing +Y. The one fat two-colour outline of the hero element (≈ 12 % of its size).
 */
function ringGeometry(half: boolean, inner: number, outer: number): BufferGeometry {
  const A = half ? 36 : 48;
  const pos: number[] = [];
  const idx: number[] = [];
  const outline = (th: number): number => (half ? 1 + 0.07 * Math.cos(7 * th) + 0.04 * Math.cos(3 * th + 0.6) : 1);
  for (let j = 0; j <= A; j++) {
    const th = half ? -Math.PI / 2 + (j / A) * Math.PI : (j / A) * Math.PI * 2;
    const s = Math.sin(th);
    const c = Math.cos(th);
    const k = outline(th);
    const sx = half ? 1.15 : 1;
    const sz = half ? 0.9 : 1;
    const oz = half ? -0.14 : 0;
    pos.push(inner * k * sx * s, 0, inner * k * sz * c + oz, outer * k * sx * s, 0.04, outer * k * sz * c + oz);
  }
  for (let j = 0; j < A; j++) {
    const a = j * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Local frame of a node marker: Y = seat, Z = out of the bark (fungi) or along the path (stones), X completes it. */
function frameOf(node: HeroPathNode): Matrix4 {
  const seat = new Vector3(node.seat[0], node.seat[1], node.seat[2]).normalize();
  const z = node.surface === 'bark' ? new Vector3(node.normal[0], node.normal[1], node.normal[2]) : new Vector3(node.tangent[0], node.tangent[1], node.tangent[2]);
  z.addScaledVector(seat, -z.dot(seat));
  if (z.lengthSq() < 1e-6) z.set(1, 0, 0).addScaledVector(seat, -seat.x);
  z.normalize();
  const x = new Vector3().crossVectors(seat, z).normalize();
  return new Matrix4().makeBasis(x, seat, z);
}

/**
 * Renders the level path on the tree — everything touches the surface, nothing hovers:
 * - **bark**: shelf fungi grown out of the trunk (half lens, growth rings on top, ink underside) with a contact
 *   shadow crescent on the bark below;
 * - **root, limb, dome**: flat stones lying on the surface (sunk a little), contact shadow away from the sun;
 * - **dots**: flush discs on the surface, a light wave runs along them towards the current node;
 * - **current node**: the one fat pink → violet outline (hero element), breathing anchored at the surface;
 *   newly reached nodes bloom with a short pulse (all scaling anchored at the surface point).
 * 5 draw calls (fungi, stones, shadows, dots, ring).
 */
export function createHeroPathMarkers(o: HeroPathMarkerOptions): HeroPathMarkers {
  const path = o.path;
  const k = o.scale ?? 1;
  const kFungus = k * (o.scales?.fungus ?? 1);
  const kStone = k * (o.scales?.stone ?? 1);
  const kDot = k * (o.scales?.dot ?? 1);
  const warp = o.warp;
  const fog = o.fog ?? null;
  const warped = (m: MeshBasicNodeMaterial) => {
    if (warp) m.positionNode = warp(positionLocal as unknown as Vec3Node);
  };
  /** Colour with the world's stepped distance fog (like the tree around the markers). */
  const fogged = (c: Vec3Node): Vec3Node => (fog ? steppedFog(c, fog.settings, fog.lookup) : c);
  const group = new Group();
  group.name = 'HeroPathMarkers';
  const nodes = path.nodes;
  const frames = nodes.map(frameOf);
  const isBark = nodes.map((n) => n.surface === 'bark');
  const kOf = (i: number): number => (isBark[i] ? kFungus : kStone);
  const fungusIdx: number[] = [];
  const stoneIdx: number[] = [];
  nodes.forEach((n, i) => (isBark[i] ? fungusIdx : stoneIdx).push(i));

  // --- fungi -----------------------------------------------------------------------------------------------
  const fGeo = fungusGeometry();
  const fDone = new Float32Array(Math.max(1, fungusIdx.length));
  fGeo.setAttribute('nodeDone', new InstancedBufferAttribute(fDone, 1));
  const fMat = new MeshBasicNodeMaterial();
  {
    const r = attribute('ring', 'float') as unknown as FloatNode;
    const a = attribute('angle', 'float') as unknown as FloatNode;
    const sd = attribute('side', 'float') as unknown as FloatNode;
    const done = attribute('nodeDone', 'float') as unknown as FloatNode;
    // growth rings in hard serigraph steps (cream, ochre, cream), a darker lip; gill lines under the shelf
    const ringsX = r.mul(3.5).add(a.mul(Math.PI * 7).sin().mul(0.05));
    const fw = fwidth(ringsX).max(1e-4);
    const band = smoothstep(float(0.5).sub(fw), float(0.5).add(fw), fract(ringsX));
    const lip = smoothstep(float(0.86).sub(fwidth(r)), float(0.86).add(fwidth(r)), r);
    const cream = mix(color(PAPER), color(PINK), done);
    const ochre = mix(color(OCHRE), color(ROSE), done);
    const topCol = mix(mix(cream, ochre, band.mul(0.85)), mix(color(OCHRE), color('#a8426e'), done).mul(0.8), lip);
    const gx = a.mul(46);
    const gfw = fwidth(gx).max(1e-4);
    const gill = smoothstep(float(0.18).add(gfw), float(0.18).sub(gfw), fract(gx).sub(0.5).abs()).mul(smoothstep(0.15, 0.4, r));
    const under = mix(color(INK), color('#2c3550'), gill);
    fMat.colorNode = fogged(mix(under, topCol, step(0, sd)) as unknown as Vec3Node);
  }
  warped(fMat);
  const fungi = new InstancedMesh(fGeo, fMat, Math.max(1, fungusIdx.length));
  fungi.name = 'path-fungi';
  fungi.count = fungusIdx.length;
  fungi.frustumCulled = false;

  // --- flower stones (domes, limbs, roots) ----------------------------------------------------------------------
  const sGeo = rosetteGeometry(8);
  const sDone = new Float32Array(Math.max(1, stoneIdx.length));
  sGeo.setAttribute('nodeDone', new InstancedBufferAttribute(sDone, 1));
  const sMat = new MeshBasicNodeMaterial();
  {
    const done = attribute('nodeDone', 'float') as unknown as FloatNode;
    const petal = attribute('petal', 'float') as unknown as FloatNode;
    const wallA = attribute('wall', 'float') as unknown as FloatNode;
    const centre = smoothstep(0.36, 0.3, petal);
    const vein = smoothstep(0.75, 0.95, petal).mul(0.35);
    const petals = mix(mix(color(PAPER), color(OCHRE), vein), mix(color(PINK), color(ROSE), vein), done);
    const middle = mix(color(OCHRE), color(ROSE), done);
    const top = mix(petals, middle, centre);
    const side = mix(color('#6e6a4e'), color('#8a3a62'), done);
    sMat.colorNode = fogged(mix(top, side, wallA) as unknown as Vec3Node);
  }
  warped(sMat);
  const stones = new InstancedMesh(sGeo, sMat, Math.max(1, stoneIdx.length));
  stones.name = 'path-flowers';
  stones.count = stoneIdx.length;
  stones.frustumCulled = false;

  // --- contact shadows (ink discs flush with the surface) ---------------------------------------------------------
  const shGeo = new CylinderGeometry(1, 1, 0.02, 24, 1);
  const shMat = new MeshBasicNodeMaterial();
  shMat.colorNode = fogged(color(INK) as unknown as Vec3Node);
  warped(shMat);
  const shadows = new InstancedMesh(shGeo, shMat, Math.max(1, nodes.length));
  shadows.name = 'path-contact-shadows';
  shadows.frustumCulled = false;

  // --- dots ----------------------------------------------------------------------------------------------------
  const dots: HeroPathDot[] = o.exitDots && path.exit ? [...path.dots, ...path.exit.dots] : path.dots;
  const dGeo = new CylinderGeometry(0.15, 0.15, 0.05, 10, 1);
  dGeo.translate(0, 0.02, 0);
  const dS = new Float32Array(Math.max(1, dots.length));
  dots.forEach((d, i) => (dS[i] = d.s ?? i));
  dGeo.setAttribute('dotS', new InstancedBufferAttribute(dS, 1));
  const uTime = uniform(0);
  const uCurrentS = uniform(0);
  const dMat = new MeshBasicNodeMaterial();
  {
    const s = attribute('dotS', 'float') as unknown as FloatNode;
    const walked = smoothstep(uCurrentS.add(0.5), uCurrentS.sub(0.5), s);
    const phase = fract(s.sub(uTime.mul(path.motion.waveSpeed)).div(path.motion.waveLength));
    const pulse = smoothstep(0.78, 0.97, phase).mul(smoothstep(1.0, 0.97, phase));
    const base = mix(color(PAPER).mul(0.82), color(PINK), walked);
    dMat.colorNode = fogged(mix(base, color('#fff6fb'), pulse.mul(max(walked, float(0.35)))) as unknown as Vec3Node);
  }
  warped(dMat);
  const dotMesh = new InstancedMesh(dGeo, dMat, Math.max(1, dots.length));
  dotMesh.name = 'path-dots';
  dotMesh.count = dots.length;
  dotMesh.frustumCulled = false;
  const _n = new Vector3();
  dots.forEach((d, i) => {
    _n.set(d.normal[0], d.normal[1], d.normal[2]).normalize();
    _q.setFromUnitVectors(new Vector3(0, 1, 0), _n);
    _p.set(d.position[0], d.position[1], d.position[2]);
    _m.compose(_p, _q, _s.setScalar(kDot));
    dotMesh.setMatrixAt(i, _m);
  });
  dotMesh.instanceMatrix.needsUpdate = true;

  // --- ring (the one fat gradient outline) ------------------------------------------------------------------------
  const ringHalf = ringGeometry(true, 1.04, 1.3);
  const ringFull = ringGeometry(false, 1.02, 1.26);
  const rMat = new MeshBasicNodeMaterial();
  rMat.colorNode = fogged(mix(color(RING_A), color(RING_B), smoothstep(-1.2, 1.2, positionGeometry.x.add(positionGeometry.z.mul(0.4)))) as unknown as Vec3Node);
  warped(rMat);
  const ring = new InstancedMesh(ringFull, rMat, 1);
  ring.name = 'path-current-ring';
  ring.frustumCulled = false;

  group.add(shadows, dotMesh, stones, fungi, ring);

  const sun = (o.sunDirLocal ?? new Vector3(0.5, 0.2, 0.5)).clone().normalize();
  let current = -1;
  let done = 0;
  let hidden = -1;
  const unlockedAt = nodes.map(() => -Infinity);
  let now = 0;

  /** Origin of a node marker: shelves sit a little into the bark, stones a little into the surface (touching, never hovering). */
  const originOf = (i: number, out: Vector3): Vector3 => {
    const n = nodes[i]!;
    out.set(n.position[0], n.position[1], n.position[2]);
    return out.addScaledVector(_n.set(n.normal[0], n.normal[1], n.normal[2]), isBark[i] ? -0.05 * kFungus : -0.06 * kStone);
  };
  const place = (i: number, scale: number): Matrix4 => {
    originOf(i, _p);
    _q.setFromRotationMatrix(frames[i]!);
    return _m.compose(_p, _q, _s.setScalar(kOf(i) * Math.max(0.001, scale)));
  };
  const placeShadow = (i: number) => {
    const n = nodes[i]!;
    const kk = kOf(i);
    const nrm = new Vector3(n.normal[0], n.normal[1], n.normal[2]).normalize();
    _p.set(n.position[0], n.position[1], n.position[2]);
    const gone = i === hidden ? 0 : 1;
    if (isBark[i]) {
      // crescent on the bark just below the shelf
      const seat = new Vector3(n.seat[0], n.seat[1], n.seat[2]);
      const down = seat.clone().addScaledVector(nrm, -seat.dot(nrm)).normalize().negate();
      _p.addScaledVector(down, 0.28 * kk).addScaledVector(nrm, 0.01);
      _q.setFromUnitVectors(new Vector3(0, 1, 0), nrm);
      _m.compose(_p, _q, _s.set(1.0 * kk * gone, 1, 0.42 * kk * gone));
    } else {
      const away = sun.clone().addScaledVector(nrm, -sun.dot(nrm));
      if (away.lengthSq() > 1e-6) away.normalize().multiplyScalar(-0.24 * kk);
      _p.add(away).addScaledVector(nrm, 0.008);
      _q.setFromUnitVectors(new Vector3(0, 1, 0), nrm);
      _m.compose(_p, _q, _s.set(0.92 * kk * gone, 1, 0.92 * kk * gone));
    }
    shadows.setMatrixAt(i, _m);
  };
  nodes.forEach((_, i) => placeShadow(i));
  shadows.instanceMatrix.needsUpdate = true;

  const scaleOf = (ni: number): number => (ni === hidden ? 0 : heroNodeScale(path.motion, now, ni === current, unlockedAt[ni]!));
  const writeNodes = (progressChanged: boolean) => {
    fungusIdx.forEach((ni, j) => {
      fungi.setMatrixAt(j, place(ni, scaleOf(ni)));
      fDone[j] = ni < done || ni === current ? 1 : 0;
    });
    stoneIdx.forEach((ni, j) => {
      stones.setMatrixAt(j, place(ni, scaleOf(ni)));
      sDone[j] = ni < done || ni === current ? 1 : 0;
    });
    fungi.instanceMatrix.needsUpdate = true;
    stones.instanceMatrix.needsUpdate = true;
    if (progressChanged) {
      (fGeo.getAttribute('nodeDone') as InstancedBufferAttribute).needsUpdate = true;
      (sGeo.getAttribute('nodeDone') as InstancedBufferAttribute).needsUpdate = true;
    }
    if (current >= 0 && current < nodes.length && current !== hidden) {
      ring.visible = true;
      ring.geometry = isBark[current] ? ringHalf : ringFull;
      const breath = heroNodeScale(path.motion, now, true, unlockedAt[current]!);
      ring.setMatrixAt(0, place(current, breath * (isBark[current] ? 1 : 1.02)));
      ring.instanceMatrix.needsUpdate = true;
    } else ring.visible = false;
  };

  // Fungus top (local frame, unit scale) along its middle line: rho 0 at the bark … 1 at the rim
  const fungusTop = (rho: number): { y: number; z: number } => {
    const kz = 1 + 0.07 + 0.04 * Math.cos(0.6); // scalloped outline at θ = 0
    return { y: 0.5 * Math.pow(Math.max(0, 1 - rho * rho), 0.45) + 0.05, z: 0.9 * rho * kz - 0.14 };
  };
  const _x = new Vector3();
  const _y = new Vector3();
  const _z = new Vector3();

  return {
    group,
    setProgress(cur, d) {
      // newly reached nodes bloom: a short pulse anchored at the surface point
      if (current >= 0 && cur > current) for (let i = current + 1; i <= cur; i++) unlockedAt[i] = now;
      current = cur;
      done = d;
      const node = nodes[cur];
      // the light wave's walked side: up to the current node; without one all (path behind) or none (path ahead)
      uCurrentS.value = node ? node.t * path.length : d >= nodes.length ? 1e6 : -1e6;
      writeNodes(true);
    },
    setHidden(index) {
      const next = index ?? -1;
      if (next === hidden) return;
      const prev = hidden;
      hidden = next;
      if (prev >= 0) placeShadow(prev);
      if (hidden >= 0) placeShadow(hidden);
      shadows.instanceMatrix.needsUpdate = true;
      writeNodes(false);
    },
    update(time) {
      now = time;
      uTime.value = time;
      writeNodes(false);
    },
    setSunDirection(dir) {
      sun.copy(dir).normalize();
      nodes.forEach((_, i) => placeShadow(i));
      shadows.instanceMatrix.needsUpdate = true;
    },
    seat(index, outPos, outUp, radius = 0) {
      const n = nodes[index];
      if (!n) return false;
      frames[index]!.extractBasis(_x, _y, _z);
      originOf(index, outPos);
      outUp.copy(_y).normalize();
      if (isBark[index]) {
        // on top of the shelf, far enough out that a body of `radius` clears the bark (never past 90 % of the rim)
        const kk = kFungus;
        const rho = Math.min(0.9, Math.max(0.2, (radius / kk + 0.05 + 0.14) / 0.993));
        const top = fungusTop(rho);
        outPos.addScaledVector(_y, top.y * kk).addScaledVector(_z, top.z * kk);
      } else {
        // the flower stone's top (rosette thickness 0.14, sunk 0.06 into the surface)
        outPos.addScaledVector(_y, 0.14 * kStone);
      }
      return true;
    },
    dispose() {
      for (const g of [fGeo, sGeo, shGeo, dGeo, ringHalf, ringFull]) g.dispose();
      for (const m of [fMat, sMat, shMat, dMat, rMat]) m.dispose();
      group.removeFromParent();
    },
  };
}

/** Helper for consumers: a node's position as a Vector3. */
export function nodePosition(v: Vec3, out = new Vector3()): Vector3 {
  return out.set(v[0], v[1], v[2]);
}

