import type { WebGPURenderer } from 'three/webgpu';
import type { BootReport } from '../boot/bootProgress';

export interface SceneContext {
  renderer: WebGPURenderer;
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  dpr: number;
  backend: 'webgpu' | 'webgl2';
}

/** Jede Route liefert einen Controller; der CanvasHost besitzt den einen Renderer und ruft mount/update/dispose. */
export interface SceneController {
  mount(ctx: SceneContext): void | Promise<void>;
  resize?(ctx: SceneContext): void;
  update(dt: number, elapsed: number, ctx: SceneContext): void;
  dispose(): void;
  /**
   * Optional nach `mount`: Vorwärmen für den Loader (Kreaturen, Brett, Chunks, Shader) mit Fortschritt je Schritt.
   * Ohne `warm` gelten diese Schritte sofort als erledigt.
   */
  warm?(report: BootReport): Promise<void>;
}
