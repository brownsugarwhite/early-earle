import { CanvasTexture, Group, LinearFilter, Mesh, MeshBasicNodeMaterial, PlaneGeometry, Quaternion, SRGBColorSpace, Vector3 } from 'three/webgpu';

/** What a stamp sticks to: a creature on the board (board-local, read every frame while the stamp shows). */
export interface StampTarget {
  x: number;
  z: number;
  /** Body centre height and radius (board units). */
  centerY: number;
  radius: number;
}

export interface StampColors {
  /** Type and the hard offset shadow. */
  ink: string;
  /** The tag the type sits on (neon or paper). */
  tag: string;
}

/** Slam-in (1.8 → 1 with overshoot), hold, pop-out (seconds). */
export const STAMP_SLAM_S = 0.17;
export const STAMP_HOLD_S = 0.9;
export const STAMP_OUT_S = 0.17;
export const STAMP_TOTAL_S = STAMP_SLAM_S + STAMP_HOLD_S + STAMP_OUT_S;
/** Stamp size on the board (board units; a cell is 0.72). */
const STAMP_W = 0.98;
const STAMP_H = 0.49;
const CANVAS_W = 512;
const CANVAS_H = 256;
/** Rotation of the tag (−6°, counter-clockwise) and the ink offset shadow in the sun direction (left, down). */
const TILT = (-6 * Math.PI) / 180;
const SHADOW_X = -26;
const SHADOW_Y = 10;
const FONT = '"EE Heavy", Georgia, serif';

const easeOutBack = (t: number): number => {
  const c1 = 1.9;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

interface Slot {
  mesh: Mesh;
  material: MeshBasicNodeMaterial;
  target: StampTarget | null;
  /** Last known anchor (the target may leave the board while the stamp still shows). */
  anchor: Vector3;
  t0: number;
  active: boolean;
}

/**
 * The "NEU!" stamp over a creature that was made for the first time (Sammlung, Iteration 4): a camera-facing quad with
 * a canvas texture — "NEU!" in the fat display face ('EE Heavy', Caprasimo) in ink on a neon/paper tag with a hard ink
 * offset shadow in the sun direction, no outline, tilted −6°. It slams in (1.8 → 1 with overshoot), holds 0.9 s and
 * pops out; drawn on top of the board (no depth test). At most `capacity` at once (the board allows 2 per move).
 */
export class BoardStamp {
  readonly group = new Group();
  private readonly slots: Slot[] = [];
  private readonly geometry = new PlaneGeometry(STAMP_W, STAMP_H);
  private texture: CanvasTexture | null = null;
  private fontReady = false;

  constructor(
    private readonly colors: StampColors,
    readonly capacity = 2,
  ) {
    this.group.name = 'board-stamps';
  }

  /** Stamps currently showing. */
  get active(): number {
    let n = 0;
    for (const s of this.slots) if (s.active) n++;
    return n;
  }

  /** Shows a stamp over `target` from board time `now`; false when every slot is busy (or there is no DOM). */
  show(target: StampTarget, now: number): boolean {
    const tex = this.ensureTexture();
    if (!tex) return false;
    let slot = this.slots.find((s) => !s.active) ?? null;
    if (!slot && this.slots.length < this.capacity) {
      const material = new MeshBasicNodeMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false });
      material.name = 'ee-board-stamp';
      const mesh = new Mesh(this.geometry, material);
      mesh.name = 'board-stamp';
      mesh.frustumCulled = false;
      mesh.renderOrder = 40;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.visible = false;
      this.group.add(mesh);
      slot = { mesh, material, target: null, anchor: new Vector3(), t0: 0, active: false };
      this.slots.push(slot);
    }
    if (!slot) return false;
    slot.target = target;
    slot.t0 = now;
    slot.active = true;
    this.anchorOf(slot);
    return true;
  }

  /** Per frame: follow the targets, animate, face the camera (`cameraQuat` in the board's local frame). */
  update(now: number, cameraQuat: Quaternion): void {
    for (const s of this.slots) {
      if (!s.active) continue;
      const t = now - s.t0;
      if (t >= STAMP_TOTAL_S || t < 0) {
        s.active = false;
        s.target = null;
        s.mesh.visible = false;
        continue;
      }
      let scale = 1;
      let opacity = 1;
      if (t < STAMP_SLAM_S) {
        const u = t / STAMP_SLAM_S;
        // 1.8 → 1 with an overshoot below 1 (the tag is pressed flat), then settles.
        scale = 1.8 - 0.8 * easeOutBack(u);
        opacity = Math.min(1, u * 4);
      } else if (t > STAMP_SLAM_S + STAMP_HOLD_S) {
        const u = (t - STAMP_SLAM_S - STAMP_HOLD_S) / STAMP_OUT_S;
        scale = Math.max(0.001, (1 - u) * (1 + 0.35 * Math.sin(u * Math.PI)));
        opacity = u < 0.5 ? 1 : 1 - (u - 0.5) * 2;
      }
      this.anchorOf(s);
      s.mesh.position.copy(s.anchor);
      // Facing the camera; the −6° tilt and the sun-side shadow are baked into the texture (screen-aligned).
      s.mesh.quaternion.copy(cameraQuat);
      s.mesh.scale.set(scale, scale, 1);
      s.material.opacity = opacity;
      s.mesh.visible = true;
    }
  }

  /** Hides every stamp (level load, depart). */
  clear(): void {
    for (const s of this.slots) {
      s.active = false;
      s.target = null;
      s.mesh.visible = false;
    }
  }

  dispose(): void {
    for (const s of this.slots) s.material.dispose();
    this.slots.length = 0;
    this.geometry.dispose();
    this.texture?.dispose();
    this.texture = null;
    this.group.removeFromParent();
  }

  private anchorOf(s: Slot): void {
    const t = s.target;
    if (!t) return;
    s.anchor.set(t.x, t.centerY + t.radius * 1.15 + STAMP_H * 0.55, t.z);
  }

  /** The tag texture, drawn once (again when the display face has loaded). */
  private ensureTexture(): CanvasTexture | null {
    if (this.texture) return this.texture;
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    const tex = new CanvasTexture(canvas);
    tex.colorSpace = SRGBColorSpace;
    tex.minFilter = LinearFilter;
    tex.magFilter = LinearFilter;
    tex.generateMipmaps = false;
    this.texture = tex;
    this.draw(canvas);
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    if (fonts && !this.fontReady) {
      void fonts
        .load(`900 150px ${FONT}`)
        .then(() => {
          this.fontReady = true;
          if (this.texture === tex) {
            this.draw(canvas);
            tex.needsUpdate = true;
          }
        })
        .catch(() => undefined);
    }
    tex.needsUpdate = true;
    return tex;
  }

  private draw(canvas: HTMLCanvasElement): void {
    const g = canvas.getContext('2d');
    if (!g) return;
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.save();
    g.translate(canvas.width / 2, canvas.height / 2);
    g.rotate(TILT);
    const w = canvas.width * 0.8;
    const h = canvas.height * 0.62;
    // Hard ink offset shadow (a flat plate, no blur), then the tag, then the type: no outline anywhere.
    g.fillStyle = this.colors.ink;
    g.fillRect(-w / 2 + SHADOW_X, -h / 2 + SHADOW_Y, w, h);
    g.fillStyle = this.colors.tag;
    g.fillRect(-w / 2, -h / 2, w, h);
    g.fillStyle = this.colors.ink;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `900 ${Math.round(h * 0.78)}px ${FONT}`;
    g.fillText('NEU!', 0, h * 0.05);
    g.restore();
  }
}
