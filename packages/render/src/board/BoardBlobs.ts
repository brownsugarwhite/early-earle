import { DynamicDrawUsage, Group, InstancedMesh, Matrix4, MeshBasicMaterial, Quaternion, SphereGeometry, Vector3 } from 'three/webgpu';
import type { Camera } from 'three/webgpu';
import type { Blob, Coord, LevelState } from '@ee/core';
import { NO_FLOOR, creatureGenome, genomeFor, mixHex, resolveCreature, scaleForTier, squashScales, type BlobParams, type CreatureSpec, type GenomeRules, type Vec3, type ZoneId } from '@ee/genome';
import { SpringJiggle } from '@ee/physics';
import { BLOB_QUALITY_HIGH, BLOB_QUALITY_MOBILE, BlobParamBlock, applyBlobQuality, createBlobQualityUniforms, createBlobShadingUniforms, createJiggleBlobMesh, type BlobDynamics, type BlobShadingUniforms } from '../blob/index';
import { CreaturePool, type CreatureRig, type ModuleLibrary } from '../creature/index';
import type { BoardLabels } from './BoardLabels';
import { labelIndexForTier } from './BoardLabels';
import { MOTIF, type BoardProps, type PropDesc } from './BoardProps';
import type { BoardLayout } from './boardElements';
import type { BoardPalette } from './boardPalette';

export type CreatureMode = 'all' | 'strays' | 'none';

export interface BlobVisual {
  id: number;
  slot: number;
  tier: number;
  kind: Blob['kind'];
  axis: 'h' | 'v' | undefined;
  frozen: boolean;
  sleeper: boolean;
  caged: boolean;
  /** Hidden under fog (not drawn until revealed). */
  fogged: boolean;
  /** Hidden by the scene (the hero stands in for it during hand-offs). */
  hidden: boolean;
  seed: number;
  spec: CreatureSpec | null;
  genome: BlobParams;
  x: number;
  z: number;
  /** Extra height (release lift, hops). */
  lift: number;
  /** Pop multiplier on the world scale. */
  pop: number;
  /** Squash override from a tween (slides, merges); null = spring driver. */
  squash: { axis: Vec3; amount: number } | null;
  jiggle: number;
  phase: number;
  rig: CreatureRig | null;
  rigKey: string;
  /** Attachment prop keys currently placed for this blob. */
  attached: Set<string>;
  /** Last written body centre/scale (for attachments and the scene). */
  centerY: number;
  scale: number;
  labelAlpha: number;
}

/** Another body that carries a board creature's parts (world transform of its ground-contact frame). */
export interface CarrierBody {
  matrixWorld: Matrix4;
  params: BlobParams;
  /** Body origin above the ground-contact point (world units). */
  standY: number;
  scale: number;
  jiggle: number;
  visible: boolean;
}

export interface BoardBlobsOptions {
  zone: ZoneId;
  layout: BoardLayout;
  palette: BoardPalette;
  octaves: number;
  shadowLayer: number;
  capacity?: number;
}

const _m = new Matrix4();
const _inv = new Matrix4();
const _parent = new Matrix4();
const _q = new Quaternion();
const _p = new Vector3();
const _s = new Vector3();
const _v = new Vector3();
const _z = new Vector3(0, 0, 1);
const LIGHT_CAMERA = new Vector3(-0.66, 0.6, 0.5).normalize();
/** Resting squash: bodies sit slightly heavy on their plate. */
const REST_SQUASH = -0.07;

/**
 * The creatures on the board: candidate-(b) jiggle bodies (one instanced draw), smooth sphere proxies on the
 * shadow layer so every blob throws a razor shadow, tier badges, optional modular parts from the
 * CreaturePool (real creatures via `resolveCreature`) and per-state attachments: ice shards for crusted
 * blobs, "zzz" dots and a closed lid for sleepers, orbiting dots for charged (line/burst) blobs, a shifting
 * violet core for amoebae; strays are rust-tinted. Blob ids are stable, so they key everything.
 */
export class BoardBlobs {
  readonly group = new Group();
  readonly mesh: InstancedMesh;
  readonly proxies: InstancedMesh;
  readonly visuals = new Map<number, BlobVisual>();
  readonly driver = new SpringJiggle();
  readonly uniforms: BlobShadingUniforms;
  private readonly block: BlobParamBlock;
  private readonly freeSlots: number[] = [];
  private readonly disposables: Array<{ dispose(): void }> = [];
  private readonly scaleCache = new Map<number, number>();
  private pool: CreaturePool | null = null;
  private library: ModuleLibrary | null = null;
  private rules: GenomeRules | null = null;
  private creatureMode: CreatureMode = 'none';
  /** A creature rig that left the board and now follows another body (the flow hero). */
  private carried: CreatureRig | null = null;
  private carrier: CarrierBody | null = null;
  /** Global pop multiplier (board appears/disappears). */
  globalPop = 1;
  /** Board-local xz direction away from the sun (contact shadows lean that way). */
  readonly awayDir = new Vector3(-0.7, 0, 0.4);
  showLabels = true;
  readonly capacity: number;

  constructor(readonly options: BoardBlobsOptions) {
    // 36 × BLOB_STRIDE vec4s = 16 128 B: the largest block that fits WebGL2's 16 KB uniform-block limit
    // (a 6×6 board full of blobs). Blobs beyond that stay slot-less (not drawn) instead of throwing.
    this.capacity = Math.min(options.capacity ?? 36, 36);
    this.group.name = 'board-blobs';
    this.block = new BlobParamBlock(this.capacity);
    this.uniforms = createBlobShadingUniforms();
    const quality = createBlobQualityUniforms();
    applyBlobQuality(quality, options.octaves >= 2 ? BLOB_QUALITY_HIGH : BLOB_QUALITY_MOBILE);
    const b = createJiggleBlobMesh(this.block, { uniforms: this.uniforms, quality });
    this.mesh = b.mesh;
    this.mesh.name = 'board-blob-bodies';
    this.mesh.count = 0;
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = false;
    this.disposables.push(b.material, b.glyph, b.mesh.geometry);
    for (let i = this.capacity - 1; i >= 0; i--) this.freeSlots.push(i);

    const proxyGeo = new SphereGeometry(1, 12, 8);
    const proxyMat = new MeshBasicMaterial({ color: '#000000' });
    this.proxies = new InstancedMesh(proxyGeo, proxyMat, this.capacity);
    this.proxies.name = 'board-blob-shadow-proxies';
    this.proxies.layers.set(options.shadowLayer);
    this.proxies.castShadow = true;
    this.proxies.receiveShadow = false;
    this.proxies.frustumCulled = false;
    this.proxies.instanceMatrix.setUsage(DynamicDrawUsage);
    this.proxies.count = 0;
    this.disposables.push(proxyGeo, proxyMat);
    this.group.add(this.mesh, this.proxies);
  }

  /** Enables modular creature parts (needs the loaded module library and the genome rules). */
  setCreatures(library: ModuleLibrary | null, rules: GenomeRules | null, mode: CreatureMode): void {
    this.creatureMode = library && rules ? mode : 'none';
    if (library && rules && !this.pool) {
      try {
        this.pool = new CreaturePool(library, this.uniforms, { capacity: 96 });
        this.pool.group.name = 'board-creature-parts';
        this.group.add(this.pool.group);
      } catch {
        this.pool = null;
        this.creatureMode = 'none';
      }
    }
    this.library = library;
    this.rules = rules;
    this.scaleCache.clear();
    for (const v of this.visuals.values()) this.refreshRig(v, true);
  }

  get partDrawCalls(): number {
    return this.pool?.drawCalls ?? 0;
  }

  /** World scale of a tier on this board (blob units → board units). */
  worldScale(tier: number): number {
    const cached = this.scaleCache.get(tier);
    if (cached !== undefined) return cached;
    let s = scaleForTier(tier);
    if (this.rules) {
      try {
        s = resolveCreature(creatureGenome(this.options.zone, tier, 1), this.rules).worldScale;
      } catch {
        s = scaleForTier(tier);
      }
    }
    const out = s * this.options.layout.cell;
    this.scaleCache.set(tier, out);
    return out;
  }

  // ---------- visuals ----------

  private baseParamsFallback(): BlobParams {
    return genomeFor(this.options.zone, 1, 1);
  }

  private baseParams(v: BlobVisual): BlobParams {
    if (v.spec) return v.spec.body;
    return genomeFor(this.options.zone, v.tier, v.seed);
  }

  /** Body parameters with the state overrides (stray tint, amoeba milk, ice, sleep). */
  private paramsFor(v: BlobVisual): BlobParams {
    const pal = this.options.palette;
    let p = this.baseParams(v);
    if (v.kind === 'stray') {
      p = { ...p, baseColor: mixHex(p.baseColor, pal.rust, 0.72), innerColor: mixHex(p.innerColor, pal.rustDeep, 0.6), rimColor: mixHex(p.rimColor, pal.rust, 0.5), breathHz: p.breathHz * 1.6 };
    }
    if (v.kind === 'amoeba') {
      p = { ...p, baseColor: pal.paper, innerColor: pal.violet, rimColor: mixHex(pal.paper, pal.violet, 0.35), highlightColor: '#ffffff', translucency: 1, gloss: 0.45, breathHz: 0.3, noiseAmp: p.noiseAmp * 1.5 };
    }
    if (v.frozen) {
      p = { ...p, baseColor: mixHex(p.baseColor, pal.ice, 0.68), innerColor: mixHex(p.innerColor, pal.iceDeep, 0.55), rimColor: mixHex(pal.ice, '#ffffff', 0.3), highlightColor: '#ffffff', gloss: 0.95, breathHz: 0.04 };
    }
    if (v.sleeper) {
      p = { ...p, baseColor: mixHex(p.baseColor, pal.ink, 0.2), innerColor: mixHex(p.innerColor, pal.ink, 0.3), breathHz: 0.16, eye: { ...p.eye, size: 0 } };
    }
    // Sleepers close their eyes: modular eyes are hidden too (the lid attachment covers the painted slit).
    if (v.rig) {
      if (v.sleeper) v.rig.hiddenSlots.add('eye');
      else v.rig.hiddenSlots.delete('eye');
    }
    const hasEyeParts = v.rig?.parts.some((part) => part.spec.slot === 'eye') ?? false;
    if (hasEyeParts && !v.sleeper) p = { ...p, eye: { ...p.eye, size: 0 } };
    return p;
  }

  /** Re-derives the body parameters after a state flag changed (thaw, wake, calm). */
  refreshParams(v: BlobVisual): void {
    v.genome = this.paramsFor(v);
    this.driver.configure(v.id, { viscosity: v.genome.viscosity });
  }

  private wantsRig(v: BlobVisual): boolean {
    if (!this.pool || !this.rules || !this.library) return false;
    if (this.creatureMode === 'none') return false;
    if (this.creatureMode === 'strays') return v.kind === 'stray';
    return true;
  }

  private refreshRig(v: BlobVisual, force = false): void {
    const key = `${v.tier}:${v.kind}`;
    if (!force && v.rigKey === key && (v.rig !== null) === this.wantsRig(v)) return;
    v.rig?.dispose();
    v.rig = null;
    v.spec = null;
    v.rigKey = key;
    if (!this.wantsRig(v) || !this.pool || !this.rules) {
      v.genome = this.paramsFor(v);
      return;
    }
    try {
      const spec = resolveCreature(creatureGenome(this.options.zone, v.tier, v.seed), this.rules);
      v.spec = spec;
      v.rig = this.pool.createRig(spec);
    } catch {
      v.rig = null;
      v.spec = null;
    }
    v.genome = this.paramsFor(v);
    this.driver.configure(v.id, { viscosity: v.genome.viscosity });
  }

  private applyFlags(v: BlobVisual, blob: Blob): boolean {
    const changed =
      v.tier !== blob.tier ||
      v.kind !== blob.kind ||
      v.axis !== blob.axis ||
      v.frozen !== (blob.frozen === true) ||
      v.sleeper !== (blob.sleeper === true) ||
      v.caged !== (blob.caged === true) ||
      v.fogged !== (blob.hidden === true);
    v.tier = blob.tier;
    v.kind = blob.kind;
    v.axis = blob.axis;
    v.frozen = blob.frozen === true;
    v.sleeper = blob.sleeper === true;
    v.caged = blob.caged === true;
    v.fogged = blob.hidden === true;
    return changed;
  }

  makeVisual(blob: Blob, at: Coord): BlobVisual {
    const slot = this.freeSlots.pop() ?? -1;
    const [x, z] = this.options.layout.cellToLocal(at[0], at[1]);
    const v: BlobVisual = {
      id: blob.id,
      slot,
      tier: blob.tier,
      kind: blob.kind,
      axis: blob.axis,
      frozen: blob.frozen === true,
      sleeper: blob.sleeper === true,
      caged: blob.caged === true,
      fogged: blob.hidden === true,
      hidden: false,
      seed: blob.id * 31 + 7,
      spec: null,
      genome: genomeFor(this.options.zone, blob.tier, blob.id * 31 + 7),
      x,
      z,
      lift: 0,
      pop: 1,
      squash: null,
      jiggle: 0,
      phase: (blob.id * 1.618) % (Math.PI * 2),
      rig: null,
      rigKey: '',
      attached: new Set(),
      centerY: 0,
      scale: 0,
      labelAlpha: 1,
    };
    this.visuals.set(blob.id, v);
    this.refreshRig(v, true);
    this.driver.configure(v.id, { viscosity: v.genome.viscosity });
    return v;
  }

  /** Applies a blob's current tier/kind/flags to its visual (palette + rig follow). */
  setBlob(v: BlobVisual, blob: Blob): void {
    const changed = this.applyFlags(v, blob);
    if (changed) this.refreshRig(v, true);
  }

  removeVisual(id: number, props: BoardProps): void {
    const v = this.visuals.get(id);
    if (!v) return;
    if (v.slot >= 0) {
      this.block.hide(v.slot);
      this.freeSlots.push(v.slot);
    }
    this.driver.remove(id);
    v.rig?.dispose();
    v.rig = null;
    for (const key of v.attached) props.remove(key);
    v.attached.clear();
    this.visuals.delete(id);
  }

  /** Re-keys a visual after a merge (the settled blob continues as the result id). */
  rekey(from: number, to: number): void {
    const v = this.visuals.get(from);
    if (!v || from === to) return;
    this.visuals.delete(from);
    this.driver.remove(from);
    v.id = to;
    this.visuals.set(to, v);
    this.driver.configure(to, { viscosity: v.genome.viscosity });
  }

  get(id: number): BlobVisual | undefined {
    return this.visuals.get(id);
  }

  setHidden(id: number, hidden: boolean): void {
    const v = this.visuals.get(id);
    if (v) v.hidden = hidden;
  }

  /** Blob with the highest tier (ties: first found), or null. */
  topBlob(): { id: number; tier: number; local: Vector3 } | null {
    let best: BlobVisual | null = null;
    for (const v of this.visuals.values()) if (!best || v.tier > best.tier) best = v;
    return best ? { id: best.id, tier: best.tier, local: new Vector3(best.x, this.options.layout.top, best.z) } : null;
  }

  /** Blob the hero becomes when entering: same tier if possible, else the lowest tier. */
  entryBlob(heroTier: number): { id: number; tier: number; local: Vector3 } | null {
    let best: BlobVisual | null = null;
    for (const v of this.visuals.values()) {
      if (v.fogged || v.caged) continue;
      if (v.tier === heroTier) return { id: v.id, tier: v.tier, local: new Vector3(v.x, this.options.layout.top, v.z) };
      if (!best || v.tier < best.tier) best = v;
    }
    return best ? { id: best.id, tier: best.tier, local: new Vector3(best.x, this.options.layout.top, best.z) } : null;
  }

  /**
   * Detaches a blob's creature parts so they can follow another body (see `setCarrier`); the board visual
   * keeps drawing its body without parts. Returns false when the blob has no parts.
   */
  carry(id: number): boolean {
    const v = this.visuals.get(id);
    if (!v?.rig) return false;
    this.dropCarried();
    this.carried = v.rig;
    v.rig = null;
    v.rigKey = '';
    return true;
  }

  /** The body the carried parts sit on this frame (null = hide them). */
  setCarrier(body: CarrierBody | null): void {
    this.carrier = body;
  }

  get carrying(): boolean {
    return this.carried !== null;
  }

  dropCarried(): void {
    this.carried?.dispose();
    this.carried = null;
    this.carrier = null;
  }

  /** Brings the visuals to the state without animation (load, rewind, after a timeline). */
  reconcile(state: LevelState, props: BoardProps): void {
    const seen = new Set<number>();
    const { w } = state.geo;
    state.cells.forEach((blob, i) => {
      if (!blob) return;
      seen.add(blob.id);
      const at: Coord = [i % w, Math.floor(i / w)];
      let v = this.visuals.get(blob.id);
      if (!v) v = this.makeVisual(blob, at);
      const [x, z] = this.options.layout.cellToLocal(at[0], at[1]);
      v.x = x;
      v.z = z;
      v.lift = 0;
      v.pop = 1;
      v.squash = null;
      this.setBlob(v, blob);
    });
    for (const id of [...this.visuals.keys()]) if (!seen.has(id)) this.removeVisual(id, props);
  }

  // ---------- frame ----------

  /**
   * Writes bodies, shadow proxies, badges, creature parts and attachments. `now` = board clock (s),
   * `gpuTime` = the value of three's `time` node this frame (the rigs sample the same breathing).
   */
  update(dt: number, camera: Camera, liftWorldQuat: Quaternion, props: BoardProps, labels: BoardLabels, now: number, gpuTime: number): void {
    this.driver.step(dt);
    const layout = this.options.layout;
    // Key light relative to the camera, in the board's local frame.
    camera.getWorldQuaternion(_q);
    _v.copy(LIGHT_CAMERA).applyQuaternion(_q);
    const inv = _q.copy(liftWorldQuat).invert();
    this.uniforms.lightDir.value.copy(_v.applyQuaternion(inv)).normalize();
    const camLocal = camera.getWorldQuaternion(new Quaternion()).premultiply(inv);

    let maxSlot = -1;
    let proxyCount = 0;
    for (const v of this.visuals.values()) {
      v.jiggle = Math.max(0, v.jiggle - dt * 1.4);
      const visible = v.slot >= 0 && !v.hidden && !v.fogged && v.pop > 0.001 && this.globalPop > 0.001;
      if (!visible) {
        if (v.slot >= 0) this.block.hide(v.slot);
        if (v.rig) {
          v.rig.setBody({ params: v.genome, center: [v.x, -50, v.z], scale: 0.0001, time: gpuTime, surface: 'mesh' });
          v.rig.update(dt);
        }
        this.syncAttachments(v, props, now, false);
        continue;
      }
      const st = this.driver.get(v.id);
      // Strays wander in place: a small hop every ~1.7 s (their own clock), a squash on landing.
      let hop = 0;
      if (v.kind === 'stray' && v.squash === null && v.lift === 0) {
        const ph = (now * 0.6 + v.phase * 0.37) % 1;
        if (ph < 0.22) {
          const t = ph / 0.22;
          hop = 0.1 * this.options.layout.cell * Math.sin(Math.PI * t);
          if (t > 0.9 && v.jiggle < 0.2) {
            this.driver.impulse(v.id, [0, 1, 0], 0.45);
            v.jiggle = 0.5;
          }
        }
      }
      // At rest the body settles a little onto its plate (resting squash); while the spring is active its own
      // axis takes over — blended by the spring's energy so there is no pop between the two.
      let squash = v.squash;
      if (!squash) {
        const w = 1 - Math.min(1, Math.abs(st.amount) / 0.08);
        const ax = st.axis[0] * (1 - w);
        const ayy = st.axis[1] * (1 - w) + w;
        const az = st.axis[2] * (1 - w);
        const al = Math.hypot(ax, ayy, az) || 1;
        squash = { axis: [ax / al, ayy / al, az / al], amount: st.amount * (1 - w) + REST_SQUASH * w };
      }
      const { along, across } = squashScales(squash.amount);
      const ay = squash.axis[1];
      const sy = along * ay * ay + across * (1 - ay * ay);
      const scale = this.worldScale(v.tier) * v.pop * this.globalPop;
      const floorY = v.genome.floorY ?? NO_FLOOR;
      const baseY = floorY > NO_FLOOR ? -floorY * sy * scale : scale * sy;
      const k = 0.22 * layout.cell;
      const y = layout.top + v.lift + hop + baseY + Math.max(0, st.offset[1]) * k;
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
      v.centerY = y;
      v.scale = scale;

      // Shadow proxy: an ellipsoid around the body, squashed like it.
      const ax = squash.axis[0];
      const az = squash.axis[2];
      const r = scale * 0.95;
      _p.set(center[0], center[1] - 0.05 * scale, center[2]);
      _s.set(r * (across + (along - across) * ax * ax), r * sy, r * (across + (along - across) * az * az));
      _m.compose(_p, _q.identity(), _s);
      this.proxies.setMatrixAt(proxyCount++, _m);

      if (this.showLabels && v.labelAlpha > 0.01) {
        labels.add(v.x, y + scale * 1.32, v.z, 0.36 * Math.min(1, v.pop * this.globalPop), labelIndexForTier(v.tier), v.labelAlpha, camLocal);
      }
      if (v.rig) {
        v.rig.setBody({
          params: v.genome,
          center,
          scale,
          squash: dyn.squash,
          jiggle: dyn.jiggle,
          phase: dyn.phase,
          time: gpuTime,
          surface: 'mesh',
        });
        v.rig.update(dt);
      }
      this.syncAttachments(v, props, now, true);
    }
    this.mesh.count = maxSlot + 1;
    this.proxies.count = proxyCount;
    this.proxies.instanceMatrix.needsUpdate = true;
    this.updateCarried(dt, gpuTime);
  }

  /** Only the carried creature's parts (the board itself is hidden). */
  updateCarried(dt: number, gpuTime: number): void {
    const rig = this.carried;
    if (rig && this.pool) {
      const c = this.carrier;
      if (c && c.visible) {
        // Carrier body frame → pool group space; the rig traces its sockets on the carrier's body.
        this.pool.group.updateWorldMatrix(true, false);
        _inv.copy(this.pool.group.matrixWorld).invert();
        _parent.multiplyMatrices(_inv, c.matrixWorld);
        rig.setBody({ params: c.params, center: [0, c.standY, 0], scale: c.scale, parent: _parent, time: gpuTime, surface: 'mesh', jiggle: c.jiggle, phase: 0 });
      } else {
        rig.setBody({ params: c?.params ?? this.baseParamsFallback(), center: [0, -1000, 0], scale: 0.0001, time: gpuTime, surface: 'mesh' });
      }
      rig.update(dt);
    }
    this.pool?.commit();
  }

  /** Places (or removes) the state attachments of one blob for this frame. */
  private syncAttachments(v: BlobVisual, props: BoardProps, now: number, visible: boolean): void {
    const wanted = new Map<string, PropDesc>();
    const pal = this.options.palette;
    if (visible) {
      const r = v.scale;
      const cy = v.centerY;
      // Contact shadow: a crisp ink ellipse under the body, stretched and nudged away from the sun, so the
      // blob sits *in* the meadow (the long razor shadow comes from the proxy in the shadow map).
      const ad = this.awayDir;
      wanted.set(`contact:${v.id}`, {
        family: 'disc',
        x: v.x + ad.x * r * 0.22,
        y: this.options.layout.top + 0.002,
        z: v.z + ad.z * r * 0.22,
        ry: -Math.atan2(ad.z, ad.x),
        sx: r * 2.35,
        sy: 0.006,
        sz: r * 1.85,
        color: pal.ink,
      });
      if (v.frozen) {
        // Ice crust: a pale disc frozen onto the plate and a ring of crystal shards leaning out of it,
        // rooted just outside the body (Earle's snow lace: white against deep blue).
        const ground = this.options.layout.top;
        wanted.set(`crust:${v.id}:disc`, {
          family: 'disc',
          x: v.x,
          y: ground,
          z: v.z,
          sx: r * 2.5,
          sy: 0.02,
          sz: r * 2.5,
          color: mixHex(pal.ice, pal.iceDeep, 0.25),
          motif: MOTIF.rimDots,
          hatch: 18,
          param: 1,
        });
        const n = 9;
        for (let k = 0; k < n; k++) {
          const a = (k / n) * Math.PI * 2 + v.id * 0.7;
          const c = Math.cos(a);
          const s = Math.sin(a);
          const lean = 0.5 + (k % 3) * 0.12;
          const half = -lean / 2;
          const tall = (0.62 + ((k * 7) % 5) * 0.1) * r;
          wanted.set(`crust:${v.id}:${k}`, {
            family: 'shard',
            x: v.x + c * r * 1.02,
            y: ground,
            z: v.z + s * r * 1.02,
            sx: 0.34 * r,
            sy: tall,
            sz: 0.34 * r,
            quat: [-s * Math.sin(half), 0, c * Math.sin(half), Math.cos(half)],
            color: k % 3 === 0 ? pal.iceDeep : pal.ice,
            motif: MOTIF.tipLight,
          });
        }
      }
      if (v.sleeper) {
        // "zzz": three dots of growing size drift up and to the side in a staggered loop.
        for (let k = 0; k < 3; k++) {
          const size = (0.055 + k * 0.022) * Math.max(0.8, r / 0.25);
          wanted.set(`zzz:${v.id}:${k}`, {
            family: 'sphere',
            x: v.x + r * (0.5 + k * 0.28),
            y: cy + r * (0.7 + k * 0.3),
            z: v.z + r * 0.25,
            sx: size,
            sy: size,
            sz: size,
            color: pal.paper,
            idle: { kind: 'rise', speed: 0.42, amp: 0.45 * r, phase: k / 3 },
          });
        }
        const e = v.genome.eye.dir;
        const el = Math.hypot(e[0], e[1], e[2]) || 1;
        _v.set(e[0] / el, e[1] / el, e[2] / el);
        _q.setFromUnitVectors(_z, _v);
        wanted.set(`lid:${v.id}`, {
          family: 'box',
          x: v.x + _v.x * r * 0.98,
          y: cy + _v.y * r * 0.98 - 0.02 * r,
          z: v.z + _v.z * r * 0.98,
          sx: 0.34 * r,
          sy: 0.05 * r,
          sz: 0.06 * r,
          quat: [_q.x, _q.y, _q.z, _q.w],
          color: pal.ink,
        });
      }
      if (v.kind === 'line' || v.kind === 'burst') {
        const n = v.kind === 'line' ? 4 : 6;
        const R = r * 1.28;
        for (let k = 0; k < n; k++) {
          const a = now * 3.2 + (k / n) * Math.PI * 2 + v.id;
          let ox = 0;
          let oy = 0;
          let oz = 0;
          if (v.kind === 'line') {
            const horizontal = v.axis !== 'v';
            ox = horizontal ? Math.cos(a) * R : 0;
            oz = horizontal ? 0 : Math.cos(a) * R;
            oy = Math.sin(a) * R * 0.55;
          } else {
            const tilt = k % 2 ? 0.55 : -0.55;
            const b = a + (k % 2 ? Math.PI / 2 : 0);
            ox = Math.cos(b) * R;
            oz = Math.sin(b) * R * Math.cos(tilt);
            oy = Math.sin(b) * R * Math.sin(tilt) * 0.8;
          }
          const size = 0.09 * (r / 0.32);
          wanted.set(`orbit:${v.id}:${k}`, {
            family: 'sphere',
            x: v.x + ox,
            y: cy + r * 0.1 + oy,
            z: v.z + oz,
            sx: size,
            sy: size,
            sz: size,
            color: v.kind === 'line' ? pal.paper : pal.neon,
            motif: MOTIF.glow,
            param: k,
          });
        }
      }
      if (v.kind === 'amoeba') {
        _v.set(0.22 * Math.sin(now * 0.7 + v.id), 0.12 + 0.12 * Math.cos(now * 0.5 + v.id * 0.3), 1).normalize();
        const size = 0.34 * r;
        wanted.set(`core:${v.id}`, {
          family: 'sphere',
          x: v.x + _v.x * r * 0.86,
          y: cy + _v.y * r * 0.86 - size / 2,
          z: v.z + _v.z * r * 0.86,
          sx: size,
          sy: size,
          sz: size,
          color: pal.violet,
        });
      }
    }
    for (const key of v.attached) {
      if (!wanted.has(key)) {
        props.remove(key);
        v.attached.delete(key);
      }
    }
    for (const [key, desc] of wanted) {
      const inst = props.place(key, desc, now);
      if (inst) v.attached.add(key);
    }
  }

  /** Stops placing an attachment family for a blob (the timeline animates the leftover instances away). */
  releaseAttachments(v: BlobVisual, prefix: string): string[] {
    const keys: string[] = [];
    for (const key of v.attached) {
      if (key.startsWith(prefix)) {
        keys.push(key);
        v.attached.delete(key);
      }
    }
    return keys;
  }

  dispose(): void {
    this.dropCarried();
    for (const v of this.visuals.values()) {
      v.rig?.dispose();
      this.driver.remove(v.id);
    }
    this.visuals.clear();
    this.pool?.dispose();
    for (const d of this.disposables) d.dispose();
    this.group.removeFromParent();
  }
}
