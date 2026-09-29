import {
  Scene,
  PerspectiveCamera,
  Mesh,
  Group,
  BoxGeometry,
  PlaneGeometry,
  CylinderGeometry,
  SphereGeometry,
  TorusGeometry,
  MeshBasicMaterial,
  Color,
  Sprite,
  SpriteMaterial,
  CanvasTexture,
  Vector3,
  type Object3D,
  type Material,
} from 'three';
import {
  CELL_PILLAR,
  CELL_VOID,
  FLOOR_CURRENT,
  FLOOR_DEEP_WITHERED,
  FLOOR_OIL,
  FLOOR_PORTAL,
  FLOOR_SPORE,
  FLOOR_WITHERED,
  type Blob,
  type Coord,
  type LevelState,
  type MoveResult,
} from '@ee/core';
import type { SceneController, SceneContext } from '../../canvas/SceneController';
import { usePreviewStore } from './previewStore';

/** Stufenfarben wie im Grid-Lab (Tier 1 = pezenpez-Türkis, dann Blob-Sheet). */
const TIER_COLORS = ['#7ce6d5', '#7ce6d5', '#22baa9', '#3fc96a', '#a8d84a', '#ddd042', '#f0a62a', '#f17023', '#db292f', '#e5aed4', '#937cc2', '#2de5f8', '#f7f6d8'];
const tierColor = (tier: number): string => TIER_COLORS[Math.min(tier, TIER_COLORS.length - 1)] ?? '#7ce6d5';
const INK = '#0f1c22';
const INK_SOFT = '#242c0b';
const PAPER = '#f7f6d8';
const PLATE = '#606e4f';
const CELL = '#b3bb6d';
const CELL_WITHERED = '#7a7f5a';
const CELL_DEEP = '#4f5340';
const OIL = '#1a131b';
const SPORE = '#b8ff2a';
const SCRAP = '#8d9a88';
const SCRAP_DARK = '#6f7c6a';
const PILLAR = '#3e645b';
const RUST = '#c8542a';
const VIOLET = '#937cc2';
const CYAN = '#2de5f8';
const NEON = '#b8ff2a';
const ICE = '#dbf8fa';

const SLIDE_MS = 140;
const MERGE_MS = 300;
const POP_MS = 150;
const CELL_SIZE = 1;
const GAP = 0.12;
const PITCH = CELL_SIZE + GAP;

type Ease = (t: number) => number;
const easeOut: Ease = (t) => 1 - (1 - t) * (1 - t);
const easeIn: Ease = (t) => t * t;
const easeInOut: Ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

interface Tween {
  start: number;
  duration: number;
  ease: Ease;
  apply: (t: number) => void;
  done?: () => void;
  finished?: boolean;
}

interface BlobVisual {
  group: Group;
  body: Mesh;
  label: Sprite;
  tier: number;
  labelText: string;
}

const textureCache = new Map<string, CanvasTexture>();
function labelTexture(text: string, color = INK): CanvasTexture {
  const key = color + '|' + text;
  let tex = textureCache.get(key);
  if (tex) return tex;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d')!;
  g.clearRect(0, 0, 128, 128);
  g.fillStyle = color;
  g.font = `900 ${text.length > 3 ? 44 : text.length > 2 ? 52 : 60}px "Helvetica Neue", Arial, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 64, 70);
  tex = new CanvasTexture(c);
  textureCache.set(key, tex);
  return tex;
}

let arrowTex: CanvasTexture | null = null;
function arrowTexture(): CanvasTexture {
  if (arrowTex) return arrowTex;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = INK;
  g.beginPath();
  g.moveTo(64, 14);
  g.lineTo(108, 70);
  g.lineTo(78, 70);
  g.lineTo(78, 114);
  g.lineTo(50, 114);
  g.lineTo(50, 70);
  g.lineTo(20, 70);
  g.closePath();
  g.fill();
  arrowTex = new CanvasTexture(c);
  return arrowTex;
}

function blobLabel(blob: Blob): string {
  if (blob.kind === 'amoeba') return 'A';
  if (blob.kind === 'stray') return `W${blob.tier}`;
  return String(2 ** blob.tier);
}

/**
 * Vorschau des Level-Editors: flache Klötze auf einer Platte (wie das P3-Grid-Lab), dazu Marker für alle
 * Elemente (Käfig, Nebel, Fäulnis, Giftwolke, Schrottberg, Rohr, Gasstrom, Gasquelle, Kruste, Schläfer,
 * Streuner). Spielt MoveEvents als Timeline. Kamera passt das Brett in den Vorschaubereich. Keine Konturen.
 */
export class EditorPreviewScene implements SceneController {
  private scene = new Scene();
  private camera = new PerspectiveCamera(36, 1, 0.1, 200);
  private boardGroup = new Group();
  private markerGroup = new Group();
  private blobGroup = new Group();
  private visuals = new Map<number, BlobVisual>();
  private tweens: Tween[] = [];
  private now = 0;
  private w = 4;
  private h = 4;
  private unsubscribe: (() => void) | null = null;
  private renderedSeq = -1;
  private renderedLevelSeq = -1;
  private showNumbers = true;
  private scrapMeshes = new Map<number, Mesh[]>();
  private floorMeshes = new Map<number, Mesh>();
  private bodyGeo = new BoxGeometry(0.78, 0.5, 0.78, 2, 2, 2);
  private aspect = 1;
  private viewportH = 1;
  /** Abstand, bei dem das Brett genau passt (vor Zoom). */
  private fitDist = 10;
  /** Bauen-Modus: nur neu zeichnen, wenn sich etwas geändert hat (Akku am Handy); Zähler für Folgebilder. */
  private dirtyFrames = 3;
  private frame = 0;

  mount(ctx: SceneContext) {
    // Etwas heller als die Bühne: das Vorschaufenster hebt sich ohne Kontur vom Hintergrund ab.
    this.scene.background = new Color('#1a2c33');
    this.scene.add(this.boardGroup, this.markerGroup, this.blobGroup);
    this.resize(ctx);
    this.syncFromStore(true);
    this.unsubscribe = usePreviewStore.subscribe((s, prev) => {
      if (s.mode !== prev.mode) this.invalidate();
      if (s.showNumbers !== prev.showNumbers) {
        this.invalidate();
        this.showNumbers = s.showNumbers;
        for (const v of this.visuals.values()) v.label.visible = this.showNumbers;
      }
      if (s.moveSeq !== prev.moveSeq || s.levelSeq !== prev.levelSeq || s.state !== prev.state) this.syncFromStore(false);
      if (s.view !== prev.view) this.applyView();
    });
  }

  /** Welt-Einheiten pro Bildschirmpixel in der Brettebene (für Zwei-Finger-Verschieben). */
  worldPerPixel(): number {
    const v = usePreviewStore.getState().view;
    const dist = this.fitDist / Math.max(0.01, v.zoom);
    const visible = 2 * dist * Math.tan((this.camera.fov * Math.PI) / 360);
    return visible / Math.max(1, this.viewportH);
  }

  resize(ctx: SceneContext) {
    this.invalidate();
    this.viewportH = ctx.height;
    this.aspect = ctx.width / Math.max(1, ctx.height);
    this.camera.aspect = this.aspect;
    this.camera.updateProjectionMatrix();
    this.fitCamera();
  }

  update(_dt: number, elapsed: number, ctx: SceneContext) {
    this.now = elapsed * 1000;
    this.frame++;
    const active = this.tweens.length > 0;
    this.runTweens();
    // Testen: jedes Bild. Bauen: nur nach Änderungen, sonst die atmenden Gasquellen mit ~15 Bildern/s.
    const play = usePreviewStore.getState().mode === 'play';
    const hasVents = (usePreviewStore.getState().level?.spawn.sources.length ?? 0) > 0;
    if (play || active || this.dirtyFrames > 0 || (hasVents && this.frame % 4 === 0)) {
      ctx.renderer.render(this.scene, this.camera);
      if (this.dirtyFrames > 0) this.dirtyFrames--;
    }
  }

  /** Nächste Bilder zeichnen (nach Store-Änderung, Größenwechsel, Kamerafahrt). */
  private invalidate() {
    this.dirtyFrames = 3;
  }

  dispose() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.clearBoard();
    this.clearMarkers();
    for (const id of [...this.visuals.keys()]) this.removeVisual(id);
    this.visuals.clear();
    this.scene.clear();
  }

  /** Gibt Geometrien und Materialien eines entfernten Teilbaums frei (Texturen sind gecacht und bleiben). */
  private release(obj: Object3D) {
    obj.traverse((o) => {
      const m = o as Mesh | Sprite;
      if ((m as Mesh).isMesh) {
        const mesh = m as Mesh;
        if (mesh.geometry !== this.bodyGeo) mesh.geometry.dispose();
        const mat = mesh.material as Material | Material[];
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat.dispose();
      } else if ((m as Sprite).isSprite) {
        (m as Sprite).material.dispose();
      }
    });
  }

  // ---------- Layout ----------

  private cellToWorld([x, y]: Coord): [number, number] {
    return [(x - (this.w - 1) / 2) * PITCH, (y - (this.h - 1) / 2) * PITCH];
  }

  /** Stellt die Kamera so, dass Platte und Aufbauten in den sichtbaren Bereich passen (jedes Seitenverhältnis). */
  private fitCamera() {
    const bw = this.w * PITCH + 0.9;
    const bh = this.h * PITCH + 0.9;
    const dir = new Vector3(0, 1.0, 0.62).normalize();
    const corners: Vector3[] = [];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (const y of [-0.45, 1.0]) corners.push(new Vector3((sx * bw) / 2, y, (sz * bh) / 2));
    const fits = (dist: number): boolean => {
      this.camera.position.copy(dir).multiplyScalar(dist);
      this.camera.lookAt(0, 0.1, 0);
      this.camera.updateMatrixWorld();
      const p = new Vector3();
      for (const c of corners) {
        p.copy(c).project(this.camera);
        if (Math.abs(p.x) > 0.92 || Math.abs(p.y) > 0.9) return false;
      }
      return true;
    };
    let lo = 2;
    let hi = 200;
    for (let i = 0; i < 28; i++) {
      const mid = (lo + hi) / 2;
      if (fits(mid)) hi = mid;
      else lo = mid;
    }
    this.fitDist = hi;
    this.applyView();
  }

  /** Zoom und Verschiebung aus dem Store (zwei Finger im Testmodus) auf die Kamera legen. */
  private applyView() {
    this.invalidate();
    const v = usePreviewStore.getState().view;
    const dir = new Vector3(0, 1.0, 0.62).normalize();
    const target = new Vector3(v.panX, 0.1, v.panZ);
    this.camera.position.copy(dir).multiplyScalar(this.fitDist / Math.max(0.01, v.zoom)).add(target);
    this.camera.lookAt(target);
    this.camera.updateMatrixWorld();
  }

  // ---------- Board ----------

  private clearBoard() {
    for (const child of [...this.boardGroup.children]) {
      this.boardGroup.remove(child);
      this.release(child);
    }
    this.scrapMeshes.clear();
    this.floorMeshes.clear();
  }

  private clearMarkers() {
    for (const child of [...this.markerGroup.children]) {
      this.markerGroup.remove(child);
      this.release(child);
    }
  }

  private floorColor(code: number): string {
    return code === FLOOR_WITHERED ? CELL_WITHERED : code === FLOOR_DEEP_WITHERED ? CELL_DEEP : code === FLOOR_OIL ? OIL : CELL;
  }

  private buildBoard(state: LevelState) {
    this.clearBoard();
    const { w, h } = state.geo;
    this.w = w;
    this.h = h;
    const plate = new Mesh(new BoxGeometry(w * PITCH + 0.6, 0.3, h * PITCH + 0.6), new MeshBasicMaterial({ color: PLATE }));
    plate.position.y = -0.3;
    this.boardGroup.add(plate);
    // Versatzschatten der Platte in Sonnenrichtung (Sonne rechts → Schatten links)
    const shadow = new Mesh(new PlaneGeometry(w * PITCH + 0.6, h * PITCH + 0.6), new MeshBasicMaterial({ color: INK_SOFT }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(-0.55, -0.46, 0.35);
    this.boardGroup.add(shadow);

    const cellGeo = new PlaneGeometry(CELL_SIZE, CELL_SIZE);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const type = state.geo.cellType[i];
        const [px, pz] = this.cellToWorld([x, y]);
        if (type === CELL_VOID) continue;
        if (type === CELL_PILLAR) {
          const pillar = new Mesh(new BoxGeometry(CELL_SIZE, 0.9, CELL_SIZE), new MeshBasicMaterial({ color: PILLAR }));
          pillar.position.set(px, 0.3, pz);
          this.boardGroup.add(pillar);
          continue;
        }
        const cell = new Mesh(cellGeo, new MeshBasicMaterial({ color: this.floorColor(state.floor[i] ?? 0) }));
        cell.rotation.x = -Math.PI / 2;
        cell.position.set(px, -0.14, pz);
        this.boardGroup.add(cell);
        this.floorMeshes.set(i, cell);
        const layers = state.scrap[i] ?? 0;
        if (layers > 0) this.buildScrap(i, px, pz, layers);
        // Zäune (Fossilwände): Bit d = Zaun in Richtung d (0 up, 1 down, 2 left, 3 right)
        const fence = state.geo.fence[i] ?? 0;
        for (let d = 0; d < 4; d++) {
          if (!(fence & (1 << d))) continue;
          const bar = new Mesh(d < 2 ? new BoxGeometry(PITCH, 0.5, 0.1) : new BoxGeometry(0.1, 0.5, PITCH), new MeshBasicMaterial({ color: INK }));
          const off = PITCH / 2;
          bar.position.set(px + (d === 2 ? -off : d === 3 ? off : 0), 0.1, pz + (d === 0 ? -off : d === 1 ? off : 0));
          this.boardGroup.add(bar);
        }
      }
    }
  }

  private buildScrap(i: number, px: number, pz: number, layers: number) {
    const old = this.scrapMeshes.get(i);
    if (old)
      for (const m of old) {
        this.boardGroup.remove(m);
        this.release(m);
      }
    const meshes: Mesh[] = [];
    for (let l = 0; l < layers; l++) {
      const s = 0.82 - l * 0.12;
      const box = new Mesh(new BoxGeometry(s, 0.22, s), new MeshBasicMaterial({ color: l % 2 ? SCRAP_DARK : SCRAP }));
      box.position.set(px, 0.11 + l * 0.24, pz);
      this.boardGroup.add(box);
      meshes.push(box);
    }
    this.scrapMeshes.set(i, meshes);
  }

  /** Marker für alles, was kein Blob und kein Schrott ist — wird nach jedem Zug neu aufgebaut (≤ 64 Zellen). */
  private buildMarkers(state: LevelState) {
    this.clearMarkers();
    const { w, n } = state.geo;
    const moundsDone = new Set<number>();
    for (let i = 0; i < n; i++) {
      const at: Coord = [i % w, Math.floor(i / w)];
      const [px, pz] = this.cellToWorld(at);
      if (state.geo.cellType[i] === CELL_VOID) continue;

      const moundIdx = state.mound[i] ?? -1;
      if (moundIdx >= 0 && !moundsDone.has(moundIdx)) {
        moundsDone.add(moundIdx);
        const layers = state.moundLayers[moundIdx] ?? 0;
        if (layers > 0) {
          const cx = px + PITCH / 2;
          const cz = pz + PITCH / 2;
          for (let l = 0; l < layers; l++) {
            const s = 1.9 - l * 0.14;
            const box = new Mesh(new BoxGeometry(s, 0.16, s), new MeshBasicMaterial({ color: l % 2 ? SCRAP_DARK : SCRAP }));
            box.position.set(cx, 0.08 + l * 0.17, cz);
            this.markerGroup.add(box);
          }
          const label = new Sprite(new SpriteMaterial({ map: labelTexture(`M${layers}`, PAPER), transparent: true, depthTest: false }));
          label.scale.set(0.6, 0.6, 1);
          label.position.set(cx, 0.2 + layers * 0.17, cz);
          this.markerGroup.add(label);
        }
      }

      const cage = state.cage[i] ?? 0;
      if (cage > 0) {
        for (let ring = 0; ring < cage; ring++) {
          const yy = 0.18 + ring * 0.28;
          for (const [dx, dz, horiz] of [
            [0, -0.44, true],
            [0, 0.44, true],
            [-0.44, 0, false],
            [0.44, 0, false],
          ] as const) {
            const bar = new Mesh(horiz ? new BoxGeometry(0.96, 0.1, 0.08) : new BoxGeometry(0.08, 0.1, 0.96), new MeshBasicMaterial({ color: INK }));
            bar.position.set(px + dx, yy, pz + dz);
            this.markerGroup.add(bar);
          }
        }
        for (const [dx, dz] of [
          [-0.44, -0.44],
          [0.44, -0.44],
          [-0.44, 0.44],
          [0.44, 0.44],
        ] as const) {
          const post = new Mesh(new BoxGeometry(0.09, 0.2 + cage * 0.28, 0.09), new MeshBasicMaterial({ color: INK }));
          post.position.set(px + dx, 0.1 + cage * 0.14, pz + dz);
          this.markerGroup.add(post);
        }
      }

      if ((state.fog[i] ?? 0) > 0) {
        const fog = new Mesh(new BoxGeometry(0.92, 0.62, 0.92), new MeshBasicMaterial({ color: PAPER, transparent: true, opacity: 0.55 }));
        fog.position.set(px, 0.31, pz);
        this.markerGroup.add(fog);
        const q = new Sprite(new SpriteMaterial({ map: labelTexture('?', INK), transparent: true, depthTest: false }));
        q.scale.set(0.5, 0.5, 1);
        q.position.set(px, 0.72, pz);
        this.markerGroup.add(q);
      }

      const rot = state.rot[i] ?? 0;
      if (rot > 0) {
        const dome = new Mesh(new SphereGeometry(0.42, 16, 10), new MeshBasicMaterial({ color: RUST }));
        dome.scale.set(1, 0.45, 1);
        dome.position.set(px, 0, pz);
        this.markerGroup.add(dome);
        const label = new Sprite(new SpriteMaterial({ map: labelTexture(`R${rot}`, PAPER), transparent: true, depthTest: false }));
        label.scale.set(0.5, 0.5, 1);
        label.position.set(px, 0.42, pz);
        this.markerGroup.add(label);
      }

      const toxic = state.toxic[i] ?? -1;
      if (toxic >= 0) {
        const cloud = new Mesh(new CylinderGeometry(0.36, 0.3, 0.1, 18), new MeshBasicMaterial({ color: VIOLET, transparent: true, opacity: 0.8 }));
        cloud.position.set(px, 0.88, pz);
        this.markerGroup.add(cloud);
        const label = new Sprite(new SpriteMaterial({ map: labelTexture(`T${toxic}`, INK), transparent: true, depthTest: false }));
        label.scale.set(0.5, 0.5, 1);
        label.position.set(px, 1.02, pz);
        this.markerGroup.add(label);
      }

      const floor = state.floor[i] ?? 0;
      if (floor === FLOOR_PORTAL) {
        const ring = new Mesh(new TorusGeometry(0.32, 0.07, 10, 28), new MeshBasicMaterial({ color: CYAN }));
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(px, -0.08, pz);
        this.markerGroup.add(ring);
      } else if (floor === FLOOR_CURRENT) {
        const d = state.floorArg[i] ?? 3;
        const arrow = new Mesh(new PlaneGeometry(0.6, 0.6), new MeshBasicMaterial({ map: arrowTexture(), transparent: true, depthWrite: false }));
        arrow.rotation.x = -Math.PI / 2;
        // Textur zeigt nach oben (−z): 0 up = 0, 1 down = π, 2 left = +π/2, 3 right = −π/2
        arrow.rotation.z = d === 1 ? Math.PI : d === 2 ? Math.PI / 2 : d === 3 ? -Math.PI / 2 : 0;
        arrow.position.set(px, -0.1, pz);
        this.markerGroup.add(arrow);
      } else if (floor === FLOOR_SPORE) {
        const spore = new Mesh(new CylinderGeometry(0.12, 0.12, 0.06, 12), new MeshBasicMaterial({ color: SPORE }));
        spore.position.set(px, -0.1, pz);
        this.markerGroup.add(spore);
      }
    }

    for (const s of state.level.spawn.sources) {
      const idx = s[1] * w + s[0];
      if (idx < 0 || idx >= n) continue;
      const [px, pz] = this.cellToWorld([s[0], s[1]]);
      const onPillar = state.geo.cellType[idx] === CELL_PILLAR;
      const vent = new Mesh(new CylinderGeometry(0.16, 0.24, 0.22, 6), new MeshBasicMaterial({ color: NEON }));
      vent.position.set(px, onPillar ? 0.86 : -0.03, pz);
      this.markerGroup.add(vent);
      const puff = new Mesh(new SphereGeometry(0.11, 10, 8), new MeshBasicMaterial({ color: PAPER, transparent: true, opacity: 0.7 }));
      puff.position.set(px, onPillar ? 1.1 : 0.22, pz);
      puff.name = 'vent-puff';
      this.markerGroup.add(puff);
    }
  }

  // ---------- Blobs ----------

  private makeVisual(blob: Blob, at: Coord): BlobVisual {
    const group = new Group();
    const body = new Mesh(this.bodyGeo, new MeshBasicMaterial({ color: tierColor(blob.tier) }));
    body.position.y = 0.25;
    const text = blobLabel(blob);
    const label = new Sprite(new SpriteMaterial({ map: labelTexture(text), transparent: true, depthTest: false }));
    label.scale.set(0.55, 0.55, 1);
    label.position.y = 0.62;
    label.visible = this.showNumbers;
    group.add(body, label);
    const [px, pz] = this.cellToWorld(at);
    group.position.set(px, 0, pz);
    this.blobGroup.add(group);
    const v: BlobVisual = { group, body, label, tier: blob.tier, labelText: text };
    this.applyKind(v, blob);
    this.visuals.set(blob.id, v);
    return v;
  }

  private applyKind(v: BlobVisual, blob: Blob) {
    const mat = v.body.material as MeshBasicMaterial;
    mat.color.set(tierColor(blob.tier));
    mat.transparent = false;
    mat.opacity = 1;
    if (blob.kind === 'amoeba') mat.color.set(PAPER);
    if (blob.kind === 'stray') mat.color.set(RUST);
    if (blob.material === 'liquid') mat.color.lerp(new Color('#2de5f8'), 0.25);
    if (blob.material === 'gas') {
      mat.transparent = true;
      mat.opacity = 0.7;
    }
    if (blob.material === 'fire') mat.color.lerp(new Color('#f17023'), 0.3);
    if (blob.frozen) mat.color.lerp(new Color(ICE), 0.65);
    if (blob.sleeper) mat.color.lerp(new Color(INK), 0.55);
    v.group.visible = !blob.hidden;
    const text = blobLabel(blob);
    if (text !== v.labelText) {
      v.labelText = text;
      (v.label.material as SpriteMaterial).map = labelTexture(text);
      (v.label.material as SpriteMaterial).needsUpdate = true;
    }
    const s = 0.9 + Math.min(blob.tier, 8) * 0.02;
    v.group.scale.set(s, blob.kind === 'burst' ? 1.35 : blob.kind === 'line' ? 1.15 : blob.sleeper ? 0.7 : 1, s);
  }

  private setTier(v: BlobVisual, blob: Blob) {
    v.tier = blob.tier;
    this.applyKind(v, blob);
  }

  private removeVisual(id: number) {
    const v = this.visuals.get(id);
    if (!v) return;
    this.blobGroup.remove(v.group);
    this.visuals.delete(id);
    // Nach einem Verschmelzen hängt dasselbe Visual kurz unter zwei IDs — erst freigeben, wenn es weg ist.
    if (![...this.visuals.values()].includes(v)) this.release(v.group);
  }

  /** Bringt Visuals, Schrott, Böden und Marker ohne Animation auf den Stand des States. */
  private reconcile(state: LevelState) {
    const seen = new Set<number>();
    const { w } = state.geo;
    state.cells.forEach((blob, i) => {
      if (!blob) return;
      seen.add(blob.id);
      const at: Coord = [i % w, Math.floor(i / w)];
      let v = this.visuals.get(blob.id);
      if (!v) v = this.makeVisual(blob, at);
      const [px, pz] = this.cellToWorld(at);
      v.group.position.set(px, 0, pz);
      v.body.scale.set(1, 1, 1);
      if (v.tier !== blob.tier) this.setTier(v, blob);
      else this.applyKind(v, blob);
    });
    for (const id of [...this.visuals.keys()]) if (!seen.has(id)) this.removeVisual(id);
    state.scrap.forEach((layers, i) => {
      const had = this.scrapMeshes.get(i);
      if ((had?.length ?? 0) !== layers) {
        const [px, pz] = this.cellToWorld([i % w, Math.floor(i / w)]);
        if (layers === 0 && had) {
          for (const m of had) {
            this.boardGroup.remove(m);
            this.release(m);
          }
          this.scrapMeshes.delete(i);
        } else if (layers > 0) this.buildScrap(i, px, pz, layers);
      }
    });
    state.floor.forEach((code, i) => {
      const m = this.floorMeshes.get(i);
      if (m) (m.material as MeshBasicMaterial).color.set(this.floorColor(code));
    });
    this.buildMarkers(state);
  }

  // ---------- Store sync ----------

  private syncFromStore(initial: boolean) {
    this.invalidate();
    const s = usePreviewStore.getState();
    if (!s.state || !s.level) return;
    const levelChanged = s.levelSeq !== this.renderedLevelSeq;
    if (levelChanged || initial || !s.lastMove) {
      this.tweens = [];
      this.buildBoard(s.state);
      this.renderedLevelSeq = s.levelSeq;
      this.fitCamera();
      for (const id of [...this.visuals.keys()]) this.removeVisual(id);
      this.reconcile(s.state);
      this.renderedSeq = s.moveSeq;
      if (s.animating) s.setAnimating(false);
      return;
    }
    if (s.moveSeq === this.renderedSeq) return;
    this.renderedSeq = s.moveSeq;
    this.playMove(s.lastMove, s.state);
  }

  // ---------- Timeline ----------

  private playMove(res: MoveResult<LevelState>, finalState: LevelState) {
    const t0 = this.now;
    let tEnd = t0;
    const slideEnd = t0 + SLIDE_MS;
    const blobAt = (state: LevelState, id: number): Blob | null => state.cells.find((b) => b?.id === id) ?? null;

    for (const e of res.events) {
      if (e.type === 'slide' || e.type === 'push' || e.type === 'strayMove') {
        const v = this.visuals.get(e.id);
        if (!v) continue;
        const from = this.cellToWorld(e.from);
        const to = this.cellToWorld(e.to);
        const start = e.type === 'slide' ? t0 : slideEnd + MERGE_MS;
        const duration = e.type === 'slide' ? SLIDE_MS : POP_MS;
        this.addTween(
          start,
          duration,
          easeOut,
          (t) => {
            v.group.position.x = from[0] + (to[0] - from[0]) * t;
            v.group.position.z = from[1] + (to[1] - from[1]) * t;
            const stretch = 1 + 0.25 * Math.sin(t * Math.PI);
            const dx = Math.abs(to[0] - from[0]) > Math.abs(to[1] - from[1]);
            v.body.scale.set(dx ? stretch : 1 / stretch, 1, dx ? 1 / stretch : stretch);
          },
          () => v.body.scale.set(1, 1, 1),
        );
        tEnd = Math.max(tEnd, start + duration);
      }
    }

    for (const e of res.events) {
      switch (e.type) {
        case 'merge': {
          const [settledId, movingId] = e.ids;
          const settled = this.visuals.get(settledId);
          const moving = this.visuals.get(movingId);
          const target = this.cellToWorld(e.at);
          if (moving) {
            this.addTween(
              slideEnd,
              MERGE_MS * 0.6,
              easeInOut,
              (t) => {
                moving.group.position.x += (target[0] - moving.group.position.x) * t;
                moving.group.position.z += (target[1] - moving.group.position.z) * t;
                moving.group.scale.setScalar(1 - 0.8 * t);
              },
              () => this.removeVisual(movingId),
            );
          }
          if (settled) {
            const resultBlob = blobAt(finalState, e.resultId) ?? { id: e.resultId, tier: e.tier, material: e.material, kind: 'normal' as const };
            this.addTween(
              slideEnd + MERGE_MS * 0.35,
              MERGE_MS * 0.65,
              easeOut,
              (t) => {
                const pop = 1 + 0.35 * Math.sin(t * Math.PI);
                settled.group.scale.set(pop, 1 + 0.5 * Math.sin(t * Math.PI), pop);
                if (t > 0.3 && settled.tier !== e.tier) this.setTier(settled, resultBlob);
              },
              () => {
                if (e.resultId !== settledId) {
                  this.visuals.delete(settledId);
                  this.visuals.set(e.resultId, settled);
                }
                this.applyKind(settled, resultBlob);
              },
            );
          }
          tEnd = Math.max(tEnd, slideEnd + MERGE_MS);
          break;
        }
        case 'promote': {
          const v = this.visuals.get(e.id);
          if (v)
            this.addTween(slideEnd + MERGE_MS, POP_MS * 2, easeOut, (t) => {
              (v.body.material as MeshBasicMaterial).color.lerp(new Color(PAPER), 0.15 * Math.sin(t * Math.PI));
            });
          break;
        }
        case 'blockerHit':
        case 'heal':
        case 'collect':
        case 'thaw':
        case 'wake':
        case 'cageOpen':
        case 'burn':
        case 'reveal':
        case 'rotGrow':
        case 'freeze':
        case 'strayCalm': {
          const cell = this.floorMeshes.get(e.at[1] * this.w + e.at[0]);
          if (cell)
            this.addTween(slideEnd + MERGE_MS * 0.4, POP_MS * 2, easeOut, (t) => {
              cell.position.y = -0.14 + 0.12 * Math.sin(t * Math.PI);
            });
          tEnd = Math.max(tEnd, slideEnd + MERGE_MS * 0.4 + POP_MS * 2);
          break;
        }
        case 'special':
        case 'tierBomb': {
          for (const r of e.removed) {
            const v = this.visuals.get(r.id);
            if (!v) continue;
            this.addTween(
              slideEnd + MERGE_MS,
              POP_MS * 2,
              easeIn,
              (t) => {
                v.group.scale.setScalar(1 - t);
                v.group.position.y = t * 0.6;
              },
              () => this.removeVisual(r.id),
            );
          }
          tEnd = Math.max(tEnd, slideEnd + MERGE_MS + POP_MS * 2);
          break;
        }
        case 'release':
        case 'deliver': {
          const v = this.visuals.get(e.id);
          if (v)
            this.addTween(
              slideEnd + MERGE_MS,
              420,
              easeIn,
              (t) => {
                v.group.position.y = t * t * 6;
                v.group.scale.setScalar(1 - 0.5 * t);
              },
              () => this.removeVisual(e.id),
            );
          tEnd = Math.max(tEnd, slideEnd + MERGE_MS + 420);
          break;
        }
        case 'spawn': {
          const start = tEnd;
          const blob = blobAt(finalState, e.id);
          if (!blob) break;
          const v = this.makeVisual(blob, e.at);
          v.group.scale.setScalar(0.001);
          this.addTween(start, POP_MS, easeOut, (t) => {
            const s = 0.9 + Math.min(blob.tier, 8) * 0.02;
            v.group.scale.setScalar(s * (t < 0.7 ? (t / 0.7) * 1.15 : 1.15 - 0.15 * ((t - 0.7) / 0.3)));
          });
          tEnd = Math.max(tEnd, start + POP_MS);
          break;
        }
        default:
          break;
      }
    }
    // Abschluss: Zustand abgleichen (auch Marker) und Eingabe freigeben
    this.addTween(tEnd + 10, 1, easeOut, () => undefined, () => {
      this.reconcile(finalState);
      usePreviewStore.getState().setAnimating(false);
    });
    this.addTween(slideEnd + MERGE_MS, 1, easeOut, () => undefined, () => {
      if (usePreviewStore.getState().animating) usePreviewStore.getState().setAnimating(false);
    });
  }

  private addTween(start: number, duration: number, ease: Ease, apply: (t: number) => void, done?: () => void) {
    const tw: Tween = { start, duration, ease, apply };
    if (done) tw.done = done;
    this.tweens.push(tw);
  }

  private runTweens() {
    // Gasquellen atmen (Zeit-Uniform statt statischer Marker)
    const puffScale = 1 + 0.25 * Math.sin(this.now / 420);
    for (const child of this.markerGroup.children) if (child.name === 'vent-puff') child.scale.setScalar(puffScale);
    if (this.tweens.length === 0) return;
    for (const tw of this.tweens) {
      if (tw.finished || this.now < tw.start) continue;
      const t = Math.min(1, (this.now - tw.start) / Math.max(1, tw.duration));
      tw.apply(tw.ease(t));
      if (t >= 1) {
        tw.finished = true;
        tw.done?.();
      }
    }
    this.tweens = this.tweens.filter((t) => !t.finished);
  }
}
