import {
  Scene,
  PerspectiveCamera,
  Mesh,
  Group,
  BoxGeometry,
  PlaneGeometry,
  CylinderGeometry,
  MeshBasicMaterial,
  Color,
  Sprite,
  SpriteMaterial,
  CanvasTexture,
  Object3D,
} from 'three';
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
  type MoveEvent,
  type MoveResult,
} from '@ee/core';
import type { SceneController, SceneContext } from '../../canvas/SceneController';
import { useGridStore } from './gridStore';

/** Stufenfarben (Tier 1 = pezenpez-Türkis, dann Blob-Sheet: grün → gelb → orange → pink → violett → cyan). */
const TIER_COLORS = ['#7ce6d5', '#7ce6d5', '#22baa9', '#3fc96a', '#a8d84a', '#ddd042', '#f0a62a', '#f17023', '#db292f', '#e5aed4', '#937cc2', '#2de5f8', '#f7f6d8'];
function tierColor(tier: number): string {
  return TIER_COLORS[Math.min(tier, TIER_COLORS.length - 1)] ?? '#7ce6d5';
}
const INK = '#0f1c22';
const INK_SOFT = '#242c0b';
const PLATE = '#606e4f';
const CELL = '#b3bb6d';
const CELL_WITHERED = '#7a7f5a';
const CELL_DEEP = '#4f5340';
const OIL = '#1a131b';
const SPORE = '#b8ff2a';
const SCRAP = '#8d9a88';
const PILLAR = '#3e645b';

const SLIDE_MS = 140;
const MERGE_MS = 300;
const POP_MS = 150;
const CELL_SIZE = 1;
const GAP = 0.12;

type Ease = (t: number) => number;
const easeOut: Ease = (t) => 1 - (1 - t) * (1 - t);
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
  g.fillStyle = INK;
  g.font = `900 ${text.length > 3 ? 44 : 60}px "Helvetica Neue", Arial, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 64, 70);
  tex = new CanvasTexture(c);
  digitCache.set(text, tex);
  return tex;
}

/**
 * P3 Grid-Lab: rendert einen LevelState als flache Klötze auf einer Platte und spielt die MoveEvents
 * als Timeline (Rutschen parallel, Verschmelzen am Ende, Nebenwirkungen, Spawn-Pop). Keine Konturen.
 */
export class GridLabScene implements SceneController {
  private scene = new Scene();
  private camera = new PerspectiveCamera(38, 1, 0.1, 200);
  private boardGroup = new Group();
  private blobGroup = new Group();
  private visuals = new Map<number, BlobVisual>();
  private tweens: Tween[] = [];
  private now = 0;
  private w = 4;
  private h = 4;
  private unsubscribe: (() => void) | null = null;
  private renderedSeq = -1;
  private renderedLevelId = '';
  private showNumbers = true;
  private scrapMeshes = new Map<number, Mesh[]>();
  private floorMeshes = new Map<number, Mesh>();
  private bodyGeo = new BoxGeometry(0.78, 0.5, 0.78, 2, 2, 2);

  mount(ctx: SceneContext) {
    this.scene.background = new Color(INK);
    this.scene.add(this.boardGroup, this.blobGroup);
    this.resize(ctx);
    const store = useGridStore;
    if (!store.getState().state) store.getState().loadLevel(0);
    this.syncFromStore(true);
    this.unsubscribe = store.subscribe((s, prev) => {
      if (s.showNumbers !== prev.showNumbers) {
        this.showNumbers = s.showNumbers;
        for (const v of this.visuals.values()) v.label.visible = this.showNumbers;
      }
      if (s.moveSeq !== prev.moveSeq || s.level !== prev.level || s.state !== prev.state) this.syncFromStore(false);
    });
  }

  resize(ctx: SceneContext) {
    this.camera.aspect = ctx.width / ctx.height;
    this.camera.updateProjectionMatrix();
    this.frameCamera();
  }

  update(dt: number, elapsed: number, ctx: SceneContext) {
    this.now = elapsed * 1000;
    this.runTweens();
    void dt;
    ctx.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.clearBoard();
    for (const v of this.visuals.values()) this.blobGroup.remove(v.group);
    this.visuals.clear();
    this.scene.clear();
  }

  // ---------- Layout ----------

  private cellToWorld([x, y]: Coord): [number, number] {
    const px = (x - (this.w - 1) / 2) * (CELL_SIZE + GAP);
    const pz = (y - (this.h - 1) / 2) * (CELL_SIZE + GAP);
    return [px, pz];
  }

  private frameCamera() {
    const span = Math.max(this.w, this.h * 0.9 + 1.2) * (CELL_SIZE + GAP);
    const aspect = this.camera.aspect;
    const fit = aspect < 1 ? span / aspect : span;
    const dist = fit * 1.05 + 2.5;
    this.camera.position.set(0, dist * 0.92, dist * 0.55);
    this.camera.lookAt(0, 0, 0.15);
  }

  // ---------- Board ----------

  private clearBoard() {
    for (const child of [...this.boardGroup.children]) this.boardGroup.remove(child);
    this.scrapMeshes.clear();
    this.floorMeshes.clear();
  }

  private buildBoard(state: LevelState) {
    this.clearBoard();
    const { w, h } = state.geo;
    this.w = w;
    this.h = h;
    const plate = new Mesh(
      new BoxGeometry(w * (CELL_SIZE + GAP) + 0.6, 0.3, h * (CELL_SIZE + GAP) + 0.6),
      new MeshBasicMaterial({ color: PLATE }),
    );
    plate.position.y = -0.3;
    this.boardGroup.add(plate);
    // Versatzschatten der Platte in Sonnenrichtung (Neo-Brutalismus, keine Kontur)
    const shadow = new Mesh(
      new PlaneGeometry(w * (CELL_SIZE + GAP) + 0.6, h * (CELL_SIZE + GAP) + 0.6),
      new MeshBasicMaterial({ color: INK_SOFT }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(0.55, -0.46, 0.35);
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
        const floorCode = state.floor[i] ?? 0;
        const color =
          floorCode === FLOOR_WITHERED ? CELL_WITHERED : floorCode === FLOOR_DEEP_WITHERED ? CELL_DEEP : floorCode === FLOOR_OIL ? OIL : CELL;
        const cell = new Mesh(cellGeo, new MeshBasicMaterial({ color }));
        cell.rotation.x = -Math.PI / 2;
        cell.position.set(px, -0.14, pz);
        this.boardGroup.add(cell);
        this.floorMeshes.set(i, cell);
        if (floorCode === FLOOR_SPORE) {
          const spore = new Mesh(new CylinderGeometry(0.12, 0.12, 0.06, 12), new MeshBasicMaterial({ color: SPORE }));
          spore.position.set(px, -0.1, pz);
          spore.name = `spore-${i}`;
          this.boardGroup.add(spore);
        }
        const layers = state.scrap[i] ?? 0;
        if (layers > 0) this.buildScrap(i, px, pz, layers);
        // Zäune: Bit d gesetzt = Zaun in Richtung d (0 up, 1 down, 2 left, 3 right)
        const fence = state.geo.fence[i] ?? 0;
        for (let d = 0; d < 4; d++) {
          if (!(fence & (1 << d))) continue;
          const bar = new Mesh(
            d < 2 ? new BoxGeometry(CELL_SIZE + GAP, 0.5, 0.1) : new BoxGeometry(0.1, 0.5, CELL_SIZE + GAP),
            new MeshBasicMaterial({ color: INK }),
          );
          const off = (CELL_SIZE + GAP) / 2;
          bar.position.set(px + (d === 2 ? -off : d === 3 ? off : 0), 0.1, pz + (d === 0 ? -off : d === 1 ? off : 0));
          this.boardGroup.add(bar);
        }
      }
    }
  }

  private buildScrap(i: number, px: number, pz: number, layers: number) {
    const old = this.scrapMeshes.get(i);
    if (old) for (const m of old) this.boardGroup.remove(m);
    const meshes: Mesh[] = [];
    for (let l = 0; l < layers; l++) {
      const s = 0.82 - l * 0.12;
      const box = new Mesh(new BoxGeometry(s, 0.22, s), new MeshBasicMaterial({ color: l % 2 ? '#6f7c6a' : SCRAP }));
      box.position.set(px, 0.11 + l * 0.24, pz);
      this.boardGroup.add(box);
      meshes.push(box);
    }
    this.scrapMeshes.set(i, meshes);
  }

  // ---------- Blobs ----------

  private makeVisual(blob: Blob, at: Coord): BlobVisual {
    const group = new Group();
    const body = new Mesh(this.bodyGeo, new MeshBasicMaterial({ color: tierColor(blob.tier) }));
    body.position.y = 0.25;
    const label = new Sprite(new SpriteMaterial({ map: digitTexture(String(2 ** blob.tier)), transparent: true, depthTest: false }));
    label.scale.set(0.55, 0.55, 1);
    label.position.y = 0.62;
    label.visible = this.showNumbers;
    group.add(body, label);
    const [px, pz] = this.cellToWorld(at);
    group.position.set(px, 0, pz);
    this.applyKind(group, body, blob);
    this.blobGroup.add(group);
    const v: BlobVisual = { group, body, label, tier: blob.tier };
    this.visuals.set(blob.id, v);
    return v;
  }

  private applyKind(group: Group, body: Mesh, blob: Blob) {
    const mat = body.material as MeshBasicMaterial;
    if (blob.kind === 'amoeba') mat.color.set('#f7f6d8');
    if (blob.frozen) mat.color.lerp(new Color('#dbf8fa'), 0.6);
    const s = 0.9 + Math.min(blob.tier, 8) * 0.02;
    group.scale.set(s, blob.kind === 'burst' ? 1.35 : blob.kind === 'line' ? 1.15 : 1, s);
  }

  private setTier(v: BlobVisual, blob: Blob) {
    v.tier = blob.tier;
    (v.body.material as MeshBasicMaterial).color.set(tierColor(blob.tier));
    (v.label.material as SpriteMaterial).map = digitTexture(String(2 ** blob.tier));
    (v.label.material as SpriteMaterial).needsUpdate = true;
    this.applyKind(v.group, v.body, blob);
  }

  private removeVisual(id: number) {
    const v = this.visuals.get(id);
    if (!v) return;
    this.blobGroup.remove(v.group);
    this.visuals.delete(id);
  }

  /** Bringt die Visuals ohne Animation auf den Stand des States (nach Laden, Rückspulen oder als Sicherheitsnetz). */
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
      if (v.tier !== blob.tier) this.setTier(v, blob);
      else this.applyKind(v.group, v.body, blob);
    });
    for (const id of [...this.visuals.keys()]) if (!seen.has(id)) this.removeVisual(id);
    // Schrott und Böden nachziehen
    state.scrap.forEach((layers, i) => {
      const had = this.scrapMeshes.get(i);
      if ((had?.length ?? 0) !== layers) {
        const [px, pz] = this.cellToWorld([i % w, Math.floor(i / w)]);
        if (layers === 0 && had) {
          for (const m of had) this.boardGroup.remove(m);
          this.scrapMeshes.delete(i);
        } else if (layers > 0) this.buildScrap(i, px, pz, layers);
      }
    });
    state.floor.forEach((code, i) => {
      const m = this.floorMeshes.get(i);
      if (!m) return;
      const color = code === FLOOR_WITHERED ? CELL_WITHERED : code === FLOOR_DEEP_WITHERED ? CELL_DEEP : code === FLOOR_OIL ? OIL : CELL;
      (m.material as MeshBasicMaterial).color.set(color);
      if (code !== FLOOR_SPORE) {
        const spore = this.boardGroup.getObjectByName(`spore-${i}`);
        if (spore) this.boardGroup.remove(spore);
      }
    });
  }

  // ---------- Store sync ----------

  private syncFromStore(initial: boolean) {
    const s = useGridStore.getState();
    if (!s.state || !s.level) return;
    const levelChanged = s.level.id !== this.renderedLevelId;
    if (levelChanged || initial || !s.lastMove) {
      this.tweens = [];
      this.buildBoard(s.state);
      this.renderedLevelId = s.level.id;
      this.frameCamera();
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

  // ---------- Timeline ----------

  private playMove(res: MoveResult<LevelState>, finalState: LevelState) {
    const t0 = this.now;
    let tEnd = t0;
    const slideEnd = t0 + SLIDE_MS;
    const blobAt = (state: LevelState, id: number): Blob | null => state.cells.find((b) => b?.id === id) ?? null;

    const moved = new Set<number>();
    for (const e of res.events) {
      if (e.type === 'slide' || e.type === 'push' || e.type === 'strayMove') {
        const v = this.visuals.get(e.id);
        if (!v) continue;
        moved.add(e.id);
        const from = this.cellToWorld(e.from);
        const to = this.cellToWorld(e.to);
        const start = e.type === 'slide' ? t0 : slideEnd + MERGE_MS;
        const duration = e.type === 'slide' ? SLIDE_MS : POP_MS;
        this.addTween(start, duration, easeOut, (t) => {
          v.group.position.x = from[0] + (to[0] - from[0]) * t;
          v.group.position.z = from[1] + (to[1] - from[1]) * t;
          // Richtungs-Squash beim Rutschen (Animations-Draft): Stretch in Bewegungsrichtung, dann zurück
          const stretch = 1 + 0.25 * Math.sin(t * Math.PI);
          const dx = Math.abs(to[0] - from[0]) > Math.abs(to[1] - from[1]);
          v.body.scale.set(dx ? stretch : 1 / stretch, 1, dx ? 1 / stretch : stretch);
        }, () => v.body.scale.set(1, 1, 1));
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
            this.addTween(slideEnd, MERGE_MS * 0.6, easeInOut, (t) => {
              moving.group.position.x += (target[0] - moving.group.position.x) * t;
              moving.group.position.z += (target[1] - moving.group.position.z) * t;
              moving.group.scale.setScalar(1 - 0.8 * t);
            }, () => this.removeVisual(movingId));
          }
          if (settled) {
            const resultBlob = blobAt(finalState, e.resultId) ?? { id: e.resultId, tier: e.tier, material: e.material, kind: 'normal' as const };
            this.addTween(slideEnd + MERGE_MS * 0.35, MERGE_MS * 0.65, easeOut, (t) => {
              const pop = 1 + 0.35 * Math.sin(t * Math.PI);
              settled.group.scale.set(pop, 1 + 0.5 * Math.sin(t * Math.PI), pop);
              if (t > 0.3 && settled.tier !== e.tier) this.setTier(settled, resultBlob);
            }, () => {
              // Ergebnis-ID kann von der ansässigen ID abweichen → Visual umhängen
              if (e.resultId !== settledId) {
                this.visuals.delete(settledId);
                this.visuals.set(e.resultId, settled);
              }
              this.applyKind(settled.group, settled.body, resultBlob);
            });
          }
          tEnd = Math.max(tEnd, slideEnd + MERGE_MS);
          break;
        }
        case 'promote': {
          const v = this.visuals.get(e.id);
          if (v) this.addTween(slideEnd + MERGE_MS, POP_MS * 2, easeOut, (t) => {
            (v.body.material as MeshBasicMaterial).color.lerp(new Color('#f7f6d8'), 0.15 * Math.sin(t * Math.PI));
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
        case 'reveal': {
          const cell = this.floorMeshes.get(e.at[1] * this.w + e.at[0]);
          if (cell) this.addTween(slideEnd + MERGE_MS * 0.4, POP_MS * 2, easeOut, (t) => {
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
            this.addTween(slideEnd + MERGE_MS, POP_MS * 2, easeIn, (t) => {
              v.group.scale.setScalar(1 - t);
              v.group.position.y = t * 0.6;
            }, () => this.removeVisual(r.id));
          }
          tEnd = Math.max(tEnd, slideEnd + MERGE_MS + POP_MS * 2);
          break;
        }
        case 'release':
        case 'deliver': {
          const v = this.visuals.get(e.id);
          if (v) this.addTween(slideEnd + MERGE_MS, 420, easeIn, (t) => {
            v.group.position.y = t * t * 6;
            v.group.scale.setScalar(1 - 0.5 * t);
          }, () => this.removeVisual(e.id));
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
    void moved;
    // Abschluss: Zustand abgleichen und Eingabe freigeben
    this.addTween(tEnd + 10, 1, easeOut, () => undefined, () => {
      this.reconcile(finalState);
      useGridStore.getState().setAnimating(false);
    });
    // Eingabe schon nach der Rutschphase erlauben (Plan: Warteschlange Tiefe 1) — hier: nach Rutschen + Verschmelzen
    this.addTween(slideEnd + MERGE_MS, 1, easeOut, () => undefined, () => {
      if (useGridStore.getState().animating) useGridStore.getState().setAnimating(false);
    });
  }

  private addTween(start: number, duration: number, ease: Ease, apply: (t: number) => void, done?: () => void) {
    const tw: Tween = { start, duration, ease, apply };
    if (done) tw.done = done;
    this.tweens.push(tw);
  }

  private runTweens() {
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

const easeIn: Ease = (t) => t * t;
