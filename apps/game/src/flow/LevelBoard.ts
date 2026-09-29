import { BoxGeometry, CanvasTexture, Color, Group, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, PlaneGeometry, Quaternion, Sprite, SpriteMaterial, Vector3 } from 'three/webgpu';
import type { BufferGeometry, Camera } from 'three/webgpu';
import {
  CELL_PILLAR,
  CELL_VOID,
  FLOOR_DEEP_WITHERED,
  FLOOR_OIL,
  FLOOR_SPORE,
  FLOOR_WITHERED,
  type Blob,
  type Coord,
  type LevelState,
  type MoveResult,
} from '@ee/core';
import { NO_FLOOR, genomeFor, scaleForTier, squashScales, type BlobParams, type Vec3, type ZoneId } from '@ee/genome';
import { SpringJiggle } from '@ee/physics';
import { BLOB_QUALITY_HIGH, BLOB_QUALITY_MOBILE, BlobParamBlock, applyBlobQuality, createBlobQualityUniforms, createBlobShadingUniforms, createJiggleBlobMesh, type BlobDynamics, type BlobShadingUniforms } from '@ee/render';
import { useGridStore } from '../lab/grid/gridStore';
import { Tweens, easeIn, easeInOut, easeOut, easeOutBack } from './tween';

/** Board metrics in world units (the plate sits on a planet with R = 40, hills ≈ 1.8 high). */
export const CELL = 0.72;
export const GAP = 0.09;
export const PITCH = CELL + GAP;
export const PLATE_THICKNESS = 0.42;
const PLATE_MARGIN = 0.5;
const CELL_TOP = 0.06;
const SLIDE_S = 0.14;
const MERGE_S = 0.3;
const POP_S = 0.15;
const CAPACITY = 36;

const PLATE = '#173238';
const PLATE_SHADOW = '#242c0b';
const CELL_COLOR = '#b3bb6d';
const CELL_WITHERED = '#7a7f5a';
const CELL_DEEP = '#4f5340';
const OIL = '#1a131b';
const SPORE = '#b8ff2a';
const SCRAP_A = '#8d9a88';
const SCRAP_B = '#6f7c6a';
const PILLAR = '#3e645b';
const FENCE = '#0f1c22';

const LIGHT_CAMERA = new Vector3(-0.66, 0.6, 0.5).normalize();
const _m = new Matrix4();
const _q = new Quaternion();
const _p = new Vector3();
const _s = new Vector3(1, 1, 1);
const _v = new Vector3();

interface Visual {
  id: number;
  slot: number;
  tier: number;
  kind: Blob['kind'];
  genome: BlobParams;
  /** Board-local ground position. */
  x: number;
  z: number;
  /** Extra height (release lift). */
  lift: number;
  /** Pop multiplier on the world scale. */
  pop: number;
  /** Squash override from a tween (slides, merges); null = spring driver. */
  squash: { axis: Vec3; amount: number } | null;
  jiggle: number;
  phase: number;
  hidden: boolean;
  label: Sprite;
}

const digitCache = new Map<string, CanvasTexture>();
function digitTexture(text: string): CanvasTexture {
  let tex = digitCache.get(text);
  if (tex) return tex;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d')!;
  g.clearRect(0, 0, 128, 128);
  g.fillStyle = '#f7f6d8';
  g.font = `900 ${text.length > 3 ? 44 : 60}px "Helvetica Neue", Arial, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 64, 70);
  tex = new CanvasTexture(c);
  digitCache.set(text, tex);
  return tex;
}

/** Instanced flat boxes with a colour per instance (cells, pillars, scrap layers, fences, spores). */
class InstancedBoxes {
  readonly mesh: InstancedMesh;
  private readonly color = new Color();
  private n = 0;
  constructor(geometry: BufferGeometry, capacity: number, name: string) {
    this.mesh = new InstancedMesh(geometry, new MeshBasicMaterial({ color: '#ffffff' }), Math.max(1, capacity));
    this.mesh.name = name;
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
  }
  begin(): void {
    this.n = 0;
  }
  add(x: number, y: number, z: number, sx: number, sy: number, sz: number, hex: string): void {
    if (this.n >= this.mesh.instanceMatrix.count) return;
    _m.compose(_p.set(x, y, z), _q.identity(), _s.set(sx, sy, sz));
    this.mesh.setMatrixAt(this.n, _m);
    this.mesh.setColorAt(this.n, this.color.set(hex));
    this.n++;
  }
  end(): void {
    this.mesh.count = this.n;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
  dispose(): void {
    (this.mesh.material as MeshBasicMaterial).dispose();
    this.mesh.removeFromParent();
  }
}

/**
 * The playable level on the map: a brutalist plate (no outline, ink offset shadow) that rises out of the
 * terrain, flat cells as value steps, and the blobs as candidate-(b) jiggle meshes coloured by tier.
 * Reads the P3 grid store and plays its `MoveEvent`s as a small timeline (slides → merges → side
 * effects → spawn pop); after every move the visuals are reconciled with the authoritative state.
 */
export class LevelBoard {
  /** Tangent frame at the node (child of the planet). */
  readonly root = new Group();
  /** Rises/sinks along the node normal; everything visible is inside. */
  readonly lift = new Group();
  private readonly plate: Mesh;
  private readonly plateShadow: Mesh;
  private readonly cells: InstancedBoxes;
  private readonly props: InstancedBoxes;
  private readonly blobMesh: InstancedMesh;
  private readonly block = new BlobParamBlock(CAPACITY);
  private readonly uniforms: BlobShadingUniforms;
  private readonly driver = new SpringJiggle();
  private readonly tweens = new Tweens();
  private readonly visuals = new Map<number, Visual>();
  private readonly freeSlots: number[] = [];
  private readonly disposables: Array<{ dispose(): void }> = [];
  private readonly unitBox = new BoxGeometry(1, 1, 1);
  private readonly labelGroup = new Group();
  private unsubscribe: (() => void) | null = null;
  private renderedSeq = -1;
  private renderedLevelId = '';
  private staticSignature = '';
  private showNumbers = true;
  /** Global pop multiplier for all blobs (board appears/disappears). */
  private blobPop = 1;
  w = 4;
  h = 4;
  topY = 0;
  sunkY = -1;
  /** Called after a move's timeline settled (also on load). */
  onSettled: ((state: LevelState) => void) | null = null;

  constructor(
    readonly zone: ZoneId,
    opts: { octaves?: number } = {},
  ) {
    this.root.name = 'level-board';
    this.lift.name = 'level-lift';
    this.root.add(this.lift);
    this.root.visible = false;

    const plateMat = new MeshBasicMaterial({ color: PLATE });
    this.plate = new Mesh(this.unitBox, plateMat);
    this.plate.name = 'plate';
    this.plate.castShadow = true;
    const shadowMat = new MeshBasicMaterial({ color: PLATE_SHADOW });
    this.plateShadow = new Mesh(new PlaneGeometry(1, 1), shadowMat);
    this.plateShadow.name = 'plate-shadow';
    this.plateShadow.rotation.x = -Math.PI / 2;
    this.disposables.push(plateMat, shadowMat, this.plateShadow.geometry, this.unitBox);

    this.cells = new InstancedBoxes(this.unitBox, 64, 'cells');
    this.props = new InstancedBoxes(this.unitBox, 256, 'props');

    this.uniforms = createBlobShadingUniforms();
    const quality = createBlobQualityUniforms();
    applyBlobQuality(quality, (opts.octaves ?? 2) >= 2 ? BLOB_QUALITY_HIGH : BLOB_QUALITY_MOBILE);
    const b = createJiggleBlobMesh(this.block, { uniforms: this.uniforms, quality });
    this.blobMesh = b.mesh;
    this.blobMesh.name = 'board-blobs';
    this.blobMesh.count = 0;
    this.disposables.push(b.material, b.glyph, b.mesh.geometry);
    for (let i = CAPACITY - 1; i >= 0; i--) this.freeSlots.push(i);

    this.lift.add(this.plateShadow, this.plate, this.cells.mesh, this.props.mesh, this.blobMesh, this.labelGroup);
  }

  // ---------- Store binding ----------

  /** Follows the grid store: level loads rebuild the board, moves play the timeline. */
  bind(): void {
    this.unbind();
    const store = useGridStore;
    this.showNumbers = store.getState().showNumbers;
    this.syncFromStore(true);
    this.unsubscribe = store.subscribe((s, prev) => {
      if (s.showNumbers !== prev.showNumbers) {
        this.showNumbers = s.showNumbers;
        for (const v of this.visuals.values()) v.label.visible = this.showNumbers && !v.hidden;
      }
      if (s.moveSeq !== prev.moveSeq || s.level !== prev.level || s.state !== prev.state) this.syncFromStore(false);
    });
  }

  unbind(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  private syncFromStore(initial: boolean): void {
    const s = useGridStore.getState();
    if (!s.state || !s.level) return;
    const levelChanged = s.level.id !== this.renderedLevelId;
    if (levelChanged || initial || !s.lastMove) {
      this.tweens.clear();
      this.buildBoard(s.state);
      this.renderedLevelId = s.level.id;
      for (const id of [...this.visuals.keys()]) this.removeVisual(id);
      this.reconcile(s.state);
      this.renderedSeq = s.moveSeq;
      s.setAnimating(false);
      return;
    }
    if (s.moveSeq === this.renderedSeq) return;
    this.renderedSeq = s.moveSeq;
    this.playMove(s.lastMove, s.state);
  }

  // ---------- Layout ----------

  cellToLocal([x, y]: Coord): [number, number] {
    return [(x - (this.w - 1) / 2) * PITCH, (y - (this.h - 1) / 2) * PITCH];
  }

  /** Plate footprint (x, z) in local units. */
  get plateSize(): [number, number] {
    return [this.w * PITCH + PLATE_MARGIN, this.h * PITCH + PLATE_MARGIN];
  }

  /** Board dimensions of the currently loaded level (before `bind`, from the store). */
  static dimensionsFromStore(): [number, number] {
    const st = useGridStore.getState().state;
    return st ? [st.geo.w, st.geo.h] : [4, 4];
  }

  /** Rise 0 (sunk under the terrain) … 1 (plate top at `topY`). */
  setRise(t: number): void {
    this.lift.position.y = this.sunkY + (this.topY - this.sunkY) * t;
  }

  /** Global scale multiplier for all blobs (pop in/out with the plate). */
  setBlobPop(p: number): void {
    this.blobPop = p;
  }

  private buildBoard(state: LevelState): void {
    const { w, h } = state.geo;
    this.w = w;
    this.h = h;
    const [pw, ph] = this.plateSize;
    this.plate.scale.set(pw, PLATE_THICKNESS, ph);
    this.plate.position.y = -PLATE_THICKNESS / 2;
    this.plateShadow.scale.set(pw * 1.02, ph * 1.02, 1);
    this.plateShadow.position.set(-0.32, -PLATE_THICKNESS - 0.02, 0.18);
    this.rebuildStatic(state);
  }

  /** Cells, pillars, scrap, fences and spores from the state (rebuilt when their signature changes). */
  private rebuildStatic(state: LevelState): void {
    const { w, h } = state.geo;
    const sig = `${state.level.id}|${Array.from(state.floor).join(',')}|${Array.from(state.scrap).join(',')}`;
    if (sig === this.staticSignature) return;
    this.staticSignature = sig;
    this.cells.begin();
    this.props.begin();
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const type = state.geo.cellType[i];
        if (type === CELL_VOID) continue;
        const [px, pz] = this.cellToLocal([x, y]);
        if (type === CELL_PILLAR) {
          this.props.add(px, 0.32, pz, CELL, 0.64, CELL, PILLAR);
          continue;
        }
        const floorCode = state.floor[i] ?? 0;
        const colorHex = floorCode === FLOOR_WITHERED ? CELL_WITHERED : floorCode === FLOOR_DEEP_WITHERED ? CELL_DEEP : floorCode === FLOOR_OIL ? OIL : CELL_COLOR;
        this.cells.add(px, CELL_TOP / 2, pz, CELL, CELL_TOP, CELL, colorHex);
        if (floorCode === FLOOR_SPORE) this.props.add(px, CELL_TOP + 0.02, pz, CELL * 0.28, 0.04, CELL * 0.28, SPORE);
        const layers = state.scrap[i] ?? 0;
        for (let l = 0; l < layers; l++) {
          const s = CELL * (0.82 - l * 0.12);
          this.props.add(px, CELL_TOP + 0.08 + l * 0.17, pz, s, 0.16, s, l % 2 ? SCRAP_B : SCRAP_A);
        }
        const fence = state.geo.fence[i] ?? 0;
        for (let d = 0; d < 4; d++) {
          if (!(fence & (1 << d))) continue;
          const off = PITCH / 2;
          const fx = px + (d === 2 ? -off : d === 3 ? off : 0);
          const fz = pz + (d === 0 ? -off : d === 1 ? off : 0);
          if (d < 2) this.props.add(fx, 0.2, fz, PITCH, 0.36, 0.07, FENCE);
          else this.props.add(fx, 0.2, fz, 0.07, 0.36, PITCH, FENCE);
        }
      }
    }
    this.cells.end();
    this.props.end();
  }

  // ---------- Blobs ----------

  /** World scale of a tier on this board (Blob-Lab tier scale × cell size). */
  worldScale(tier: number): number {
    return scaleForTier(tier) * CELL;
  }

  private makeVisual(blob: Blob, at: Coord): Visual {
    const slot = this.freeSlots.pop();
    if (slot === undefined) throw new Error('LevelBoard: no free blob slot');
    const [x, z] = this.cellToLocal(at);
    const label = new Sprite(new SpriteMaterial({ map: digitTexture(String(2 ** blob.tier)), transparent: true, depthTest: false }));
    label.scale.set(0.34, 0.34, 1);
    label.visible = this.showNumbers;
    this.labelGroup.add(label);
    const v: Visual = {
      id: blob.id,
      slot,
      tier: blob.tier,
      kind: blob.kind,
      genome: genomeFor(this.zone, blob.tier, blob.id * 31 + 7),
      x,
      z,
      lift: 0,
      pop: 1,
      squash: null,
      jiggle: 0,
      phase: (blob.id * 1.618) % (Math.PI * 2),
      hidden: false,
      label,
    };
    this.driver.configure(v.id, { viscosity: v.genome.viscosity });
    this.visuals.set(blob.id, v);
    return v;
  }

  private setTier(v: Visual, blob: Blob): void {
    v.tier = blob.tier;
    v.kind = blob.kind;
    v.genome = genomeFor(this.zone, blob.tier, v.id * 31 + 7);
    this.driver.configure(v.id, { viscosity: v.genome.viscosity });
    (v.label.material as SpriteMaterial).map = digitTexture(String(2 ** blob.tier));
    (v.label.material as SpriteMaterial).needsUpdate = true;
  }

  private removeVisual(id: number): void {
    const v = this.visuals.get(id);
    if (!v) return;
    this.block.hide(v.slot);
    this.freeSlots.push(v.slot);
    this.driver.remove(id);
    v.label.removeFromParent();
    (v.label.material as SpriteMaterial).dispose();
    this.visuals.delete(id);
  }

  /** Hide/show one blob (the hero stands in for it during hand-offs). */
  setBlobHidden(id: number, hidden: boolean): void {
    const v = this.visuals.get(id);
    if (!v) return;
    v.hidden = hidden;
    v.label.visible = this.showNumbers && !hidden;
  }

  /** Blob with the highest tier (ties: first found), or null. */
  topBlob(): { id: number; tier: number; local: Vector3 } | null {
    let best: Visual | null = null;
    for (const v of this.visuals.values()) if (!best || v.tier > best.tier) best = v;
    return best ? { id: best.id, tier: best.tier, local: new Vector3(best.x, CELL_TOP, best.z) } : null;
  }

  /** Blob the hero becomes when entering: same tier if possible, else the lowest tier. */
  entryBlob(heroTier: number): { id: number; tier: number; local: Vector3 } | null {
    let best: Visual | null = null;
    for (const v of this.visuals.values()) {
      if (v.tier === heroTier) return { id: v.id, tier: v.tier, local: new Vector3(v.x, CELL_TOP, v.z) };
      if (!best || v.tier < best.tier) best = v;
    }
    return best ? { id: best.id, tier: best.tier, local: new Vector3(best.x, CELL_TOP, best.z) } : null;
  }

  private reconcile(state: LevelState): void {
    const seen = new Set<number>();
    const { w } = state.geo;
    state.cells.forEach((blob, i) => {
      if (!blob) return;
      seen.add(blob.id);
      const at: Coord = [i % w, Math.floor(i / w)];
      let v = this.visuals.get(blob.id);
      if (!v) v = this.makeVisual(blob, at);
      const [x, z] = this.cellToLocal(at);
      v.x = x;
      v.z = z;
      v.lift = 0;
      v.pop = 1;
      v.squash = null;
      if (v.tier !== blob.tier || v.kind !== blob.kind) this.setTier(v, blob);
    });
    for (const id of [...this.visuals.keys()]) if (!seen.has(id)) this.removeVisual(id);
    this.rebuildStatic(state);
  }

  // ---------- Timeline ----------

  private playMove(res: MoveResult<LevelState>, finalState: LevelState): void {
    const tw = this.tweens;
    let tEnd = 0;
    const slideEnd = SLIDE_S;
    const blobAt = (state: LevelState, id: number): Blob | null => state.cells.find((b) => b?.id === id) ?? null;

    for (const e of res.events) {
      if (e.type === 'slide' || e.type === 'push' || e.type === 'strayMove') {
        const v = this.visuals.get(e.id);
        if (!v) continue;
        const from = this.cellToLocal(e.from);
        const to = this.cellToLocal(e.to);
        const delay = e.type === 'slide' ? 0 : slideEnd + MERGE_S;
        const duration = e.type === 'slide' ? SLIDE_S : POP_S;
        const dx = to[0] - from[0];
        const dz = to[1] - from[1];
        const len = Math.hypot(dx, dz) || 1;
        const axis: Vec3 = [dx / len, 0, dz / len];
        tw.add(
          duration,
          (t) => {
            v.x = from[0] + dx * t;
            v.z = from[1] + dz * t;
            v.squash = { axis, amount: 0.35 * Math.sin(t * Math.PI) };
          },
          {
            delay,
            ease: easeOut,
            done: () => {
              v.squash = null;
              // Stop impulse: the body lurches on and wobbles (plan: slide → impulse, stop → counter-impulse).
              this.driver.impulse(v.id, axis, 0.7);
              v.jiggle = 1;
            },
          },
        );
        tEnd = Math.max(tEnd, delay + duration);
      }
    }

    for (const e of res.events) {
      switch (e.type) {
        case 'merge': {
          const [settledId, movingId] = e.ids;
          const settled = this.visuals.get(settledId);
          const moving = this.visuals.get(movingId);
          const target = this.cellToLocal(e.at);
          if (moving) {
            tw.add(
              MERGE_S * 0.6,
              (t) => {
                moving.x += (target[0] - moving.x) * t;
                moving.z += (target[1] - moving.z) * t;
                moving.pop = 1 - 0.85 * t;
              },
              { delay: slideEnd, ease: easeInOut, done: () => this.removeVisual(movingId) },
            );
          }
          if (settled) {
            const resultBlob = blobAt(finalState, e.resultId) ?? { id: e.resultId, tier: e.tier, material: e.material, kind: 'normal' as const };
            tw.add(
              MERGE_S * 0.65,
              (t) => {
                settled.squash = { axis: [0, 1, 0], amount: 0.5 * Math.sin(t * Math.PI) };
                settled.pop = 1 + 0.15 * Math.sin(t * Math.PI);
                if (t > 0.3 && settled.tier !== e.tier) this.setTier(settled, resultBlob);
              },
              {
                delay: slideEnd + MERGE_S * 0.35,
                ease: easeOut,
                done: () => {
                  settled.squash = null;
                  settled.pop = 1;
                  this.driver.impulse(settled.id, [0, 1, 0], 0.8);
                  settled.jiggle = 1;
                  if (e.resultId !== settledId) {
                    this.visuals.delete(settledId);
                    settled.id = e.resultId;
                    this.visuals.set(e.resultId, settled);
                  }
                },
              },
            );
          }
          tEnd = Math.max(tEnd, slideEnd + MERGE_S);
          break;
        }
        case 'special':
        case 'tierBomb': {
          for (const r of e.removed) {
            const v = this.visuals.get(r.id);
            if (!v) continue;
            tw.add(
              POP_S * 2,
              (t) => {
                v.pop = 1 - t;
                v.lift = t * 0.5;
              },
              { delay: slideEnd + MERGE_S, ease: easeIn, done: () => this.removeVisual(r.id) },
            );
          }
          tEnd = Math.max(tEnd, slideEnd + MERGE_S + POP_S * 2);
          break;
        }
        case 'release':
        case 'deliver': {
          const v = this.visuals.get(e.id);
          if (v) {
            tw.add(
              0.42,
              (t) => {
                v.lift = t * t * 4;
                v.pop = 1 - 0.5 * t;
                v.squash = { axis: [0, 1, 0], amount: 0.4 * t };
              },
              { delay: slideEnd + MERGE_S, ease: easeIn, done: () => this.removeVisual(e.id) },
            );
          }
          tEnd = Math.max(tEnd, slideEnd + MERGE_S + 0.42);
          break;
        }
        case 'spawn': {
          const delay = tEnd;
          const blob = blobAt(finalState, e.id);
          if (!blob) break;
          const v = this.makeVisual(blob, e.at);
          v.pop = 0.001;
          tw.add(POP_S, (t) => (v.pop = Math.max(0.001, t)), { delay, ease: easeOutBack });
          tEnd = Math.max(tEnd, delay + POP_S);
          break;
        }
        case 'heal':
        case 'collect':
        case 'thaw':
        case 'wake':
        case 'cageOpen':
        case 'burn':
        case 'reveal':
        case 'blockerHit': {
          // Side effect on a cell: small bounce of the blob standing there (if any) after the merge phase.
          const idx = e.at[1] * this.w + e.at[0];
          const blob = finalState.cells[idx];
          const v = blob ? this.visuals.get(blob.id) : undefined;
          if (v) tw.add(POP_S * 2, (t) => (v.lift = 0.12 * Math.sin(t * Math.PI)), { delay: slideEnd + MERGE_S * 0.4, ease: easeOut });
          tEnd = Math.max(tEnd, slideEnd + MERGE_S * 0.4 + POP_S * 2);
          break;
        }
        default:
          break;
      }
    }

    // Input opens after slides + merges (queue depth 1); the state is reconciled once everything settled.
    tw.after(slideEnd + MERGE_S, () => {
      if (useGridStore.getState().animating) useGridStore.getState().setAnimating(false);
    });
    tw.after(tEnd + 0.01, () => {
      this.reconcile(finalState);
      useGridStore.getState().setAnimating(false);
      this.onSettled?.(finalState);
    });
  }

  // ---------- Frame ----------

  update(dt: number, camera: Camera): void {
    this.tweens.update(dt);
    this.driver.step(dt);

    // Key light relative to the camera, in the board's local frame.
    this.lift.updateWorldMatrix(true, false);
    camera.getWorldQuaternion(_q);
    _v.copy(LIGHT_CAMERA).applyQuaternion(_q);
    this.lift.getWorldQuaternion(_q).invert();
    this.uniforms.lightDir.value.copy(_v.applyQuaternion(_q)).normalize();

    let maxSlot = -1;
    for (const v of this.visuals.values()) {
      v.jiggle = Math.max(0, v.jiggle - dt * 1.4);
      if (v.hidden || v.pop <= 0.001 || this.blobPop <= 0.001) {
        this.block.hide(v.slot);
        v.label.visible = false;
        continue;
      }
      const st = this.driver.get(v.id);
      const squash = v.squash ?? { axis: st.axis, amount: st.amount };
      const { along, across } = squashScales(squash.amount);
      const ay = squash.axis[1];
      const sy = along * ay * ay + across * (1 - ay * ay);
      const scale = this.worldScale(v.tier) * v.pop * this.blobPop;
      const floorY = v.genome.floorY ?? NO_FLOOR;
      const baseY = floorY > NO_FLOOR ? -floorY * sy * scale : scale * sy;
      const k = 0.22 * CELL;
      const y = CELL_TOP + v.lift + baseY + Math.max(0, st.offset[1]) * k;
      const center: Vec3 = [v.x + st.offset[0] * k, y, v.z + st.offset[2] * k];
      const dyn: BlobDynamics = {
        squash: { axis: squash.axis, amount: squash.amount, taper: v.genome.squash.taper ?? 0.4 },
        jiggle: v.jiggle,
        phase: v.phase,
        seed: v.id * 17 + 3,
        detail: 1,
      };
      this.block.write(v.slot, v.genome, { center, scale }, dyn);
      maxSlot = Math.max(maxSlot, v.slot);
      v.label.visible = this.showNumbers;
      v.label.position.set(v.x, y + scale * 1.35, v.z);
      v.label.scale.setScalar(0.34 * Math.min(1, v.pop * this.blobPop));
    }
    this.blobMesh.count = maxSlot + 1;
  }

  dispose(): void {
    this.unbind();
    this.tweens.clear();
    for (const id of [...this.visuals.keys()]) this.removeVisual(id);
    this.cells.dispose();
    this.props.dispose();
    for (const d of this.disposables) d.dispose();
    this.root.removeFromParent();
  }
}
