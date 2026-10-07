import { Color, PerspectiveCamera, Scene } from 'three/webgpu';
import type { Bauplan, CreatureBuild } from '@ee/creature';
import { BuildClient } from './buildClient';
import { CreatureMesh, STIL_STANDARD, type WesenStil } from '@ee/render';
import type { SceneController, SceneContext } from '../../canvas/SceneController';
import { useAppStore } from '../../state/store';
import { createMeadow, type Meadow } from '../rex/meadow';
import { Turntable } from './turntable';

export type WesenBoden = 'wiese' | 'weiss';

export interface WesenLabStats {
  vertices: number;
  triangles: number;
  bones: number;
  teeth: number;
  buildMs: number;
  resolution: number;
  pending: boolean;
}

/**
 * Grundformen-Lab: ein Wesen auf dem Drehteller (Earle-Wiese oder weißer Referenzgrund), live aus dem Bauplan
 * vermascht — grob beim Ziehen, fein nach kurzer Ruhe. Verben: Maul auf/zu, Blinzeln.
 */
export class WesenLabScene implements SceneController {
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(32, 1, 0.05, 400);
  private readonly turntable = new Turntable();
  private meadow: Meadow | null = null;
  private creature: CreatureMesh | null = null;
  private ctx: SceneContext | null = null;
  private bauplan: Bauplan | null = null;
  private stil: WesenStil = { ...STIL_STANDARD };
  private boden: WesenBoden = 'wiese';
  private lowTimer: ReturnType<typeof setTimeout> | null = null;
  private highTimer: ReturnType<typeof setTimeout> | null = null;
  private lastBuild: CreatureBuild | null = null;
  private readonly builder = new BuildClient();
  private buildStart = 0;
  private stats: WesenLabStats = { vertices: 0, triangles: 0, bones: 0, teeth: 0, buildMs: 0, resolution: 0, pending: false };
  /** Auflösungen: grob beim Ziehen, fein in Ruhe. */
  lowRes = 36;
  highRes = 80;
  private fitExtent = 0;

  mount(ctx: SceneContext): void {
    this.ctx = ctx;
    ctx.renderer.shadowMap.enabled = true;
    this.scene.name = 'WesenLab';
    this.scene.add(this.camera);
    const quality = useAppStore.getState().effectiveQuality;
    this.meadow = createMeadow(this.scene, quality);
    this.meadow.target.visible = false;
    this.creature = new CreatureMesh({ stil: this.stil });
    this.scene.add(this.creature.root);
    this.turntable.attach(ctx.canvas);
    this.turntable.setView({ yaw: 0.55, pitch: 0.2, distance: 3.4, target: [0, 0.55, 0] });
    this.applyBoden();
    if (this.bauplan) this.rebuild(this.highRes);
  }

  resize(ctx: SceneContext): void {
    this.ctx = ctx;
  }

  setBauplan(b: Bauplan, immediate = false): void {
    this.bauplan = b;
    if (!this.creature) return;
    this.creature.setStyle(b, this.stil);
    if (this.lowTimer) clearTimeout(this.lowTimer);
    if (this.highTimer) clearTimeout(this.highTimer);
    this.stats.pending = true;
    if (immediate) {
      this.rebuild(this.highRes);
      return;
    }
    this.lowTimer = setTimeout(() => this.rebuild(this.lowRes), 40);
    this.highTimer = setTimeout(() => this.rebuild(this.highRes), 520);
  }

  /** Nur Stil/Farben (kein neues Mesh). */
  setStil(stil: WesenStil): void {
    this.stil = stil;
    if (this.creature && this.bauplan) this.creature.setStyle(this.bauplan, stil);
  }

  setBoden(boden: WesenBoden): void {
    this.boden = boden;
    this.applyBoden();
  }

  setSpin(on: boolean): void {
    this.turntable.spin = on;
  }

  setOpenness(o: number): void {
    if (this.creature) this.creature.openness = o;
  }

  play(action: 'maulAuf' | 'maulZu' | 'blinzeln'): void {
    this.creature?.play(action);
  }

  getStats(): WesenLabStats {
    return { ...this.stats };
  }

  getBuild(): CreatureBuild | null {
    return this.lastBuild;
  }

  private applyBoden(): void {
    if (!this.meadow) return;
    const white = this.boden === 'weiss';
    this.meadow.group.visible = !white;
    this.scene.background = new Color(white ? '#ffffff' : '#7ce6d5');
  }

  private rebuild(resolution: number): void {
    if (!this.bauplan || !this.creature) return;
    const bauplan = this.bauplan;
    this.buildStart = performance.now();
    this.builder.request(bauplan, { resolution, smoothIterations: resolution >= 48 ? 6 : 3, weightSmoothing: resolution >= 48 ? 2 : 1 }, (build) => this.applyBuild(build, bauplan, resolution));
  }

  private applyBuild(build: CreatureBuild, bauplan: Bauplan, resolution: number): void {
    if (!this.creature) return;
    this.lastBuild = build;
    // Stil des aktuellen Bauplans gilt (Farben können sich seit dem Auftrag geändert haben)
    this.creature.setBuild(build, this.bauplan ?? bauplan);
    this.stats = {
      vertices: build.stats.vertexCount,
      triangles: build.stats.triangleCount,
      bones: build.bones.length,
      teeth: build.mouth?.teeth.length ?? 0,
      buildMs: Math.round(build.stats.ms),
      resolution,
      pending: resolution < this.highRes || this.builder.pending,
    };
    // Kamera auf das Wesen einpassen, wenn sich seine Größe deutlich geändert hat
    const b = build.bounds;
    const ext = Math.max(b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2]);
    if (Math.abs(ext - this.fitExtent) > this.fitExtent * 0.15) {
      this.fitExtent = ext;
      this.turntable.target.set(0, (b.min[1] + b.max[1]) * 0.5, (b.min[2] + b.max[2]) * 0.5);
      this.turntable.distance = ext * 2.1 + 0.6;
    }
  }

  update(dt: number, _elapsed: number, ctx: SceneContext): void {
    this.ctx = ctx;
    this.camera.aspect = ctx.width / Math.max(1, ctx.height);
    this.camera.updateProjectionMatrix();
    this.turntable.step(dt);
    this.turntable.apply(this.camera);
    this.creature?.update(Math.min(dt, 0.1));
    this.meadow?.sun.requestUpdate();
    ctx.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    if (this.lowTimer) clearTimeout(this.lowTimer);
    if (this.highTimer) clearTimeout(this.highTimer);
    this.turntable.detach();
    this.builder.dispose();
    this.creature?.dispose();
    this.creature = null;
    this.meadow?.dispose();
    this.meadow = null;
    this.scene.clear();
  }
}
