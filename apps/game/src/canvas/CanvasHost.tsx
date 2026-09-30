import { useEffect, useRef } from 'react';
import type { SceneController, SceneContext } from './SceneController';
import { getRenderer, detectBackend } from './rendererSingleton';
import { useAppStore } from '../state/store';
import { bus } from '../state/bus';
import { governQuality, resetQualityGovernor } from './qualityGovernor';
import { attachSceneOverlay, type OverlayHost } from './sceneOverlay';

const MAX_DPR = 2;

/**
 * Hängt den Canvas des (einen) Renderers ein, misst FPS und Frametime-p99 und fährt den SceneController.
 * Bei Routenwechsel wird nur der Controller getauscht; der Renderer lebt weiter.
 */
export function CanvasHost({ controller }: { controller: SceneController }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current!;
    let disposed = false;
    let ctx: SceneContext | null = null;
    const times: number[] = [];
    let last = performance.now();
    let acc = 0;
    let frames = 0;
    let start = performance.now();
    let ro: ResizeObserver | null = null;
    // Szenen-Overlay (Setzkasten): übernimmt Update und Zeichnen, die Basis bleibt montiert (sceneOverlay.ts).
    let overlay: OverlayHost | null = null;

    function applySize(c: SceneContext) {
      const rect = host.getBoundingClientRect();
      c.width = Math.max(1, Math.floor(rect.width));
      c.height = Math.max(1, Math.floor(rect.height));
      c.dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      c.renderer.setPixelRatio(c.dpr);
      c.renderer.setSize(c.width, c.height, false);
    }

    getRenderer().then(async (renderer) => {
      if (disposed) return;
      const canvas = renderer.domElement;
      host.appendChild(canvas);
      const backend = detectBackend(renderer);
      useAppStore.getState().setBackend(backend);
      bus.emit('renderer/ready', { backend });
      ctx = { renderer, canvas, width: 1, height: 1, dpr: 1, backend };
      resetQualityGovernor();
      if (import.meta.env.DEV) (window as unknown as { __ee?: unknown }).__ee = { renderer, ctx, controller };
      applySize(ctx);
      ro = new ResizeObserver(() => {
        if (!ctx) return;
        applySize(ctx);
        controller.resize?.(ctx);
        overlay?.resize(ctx);
      });
      ro.observe(host);
      await controller.mount(ctx);
      if (disposed) return;
      overlay = attachSceneOverlay(ctx);
      start = performance.now();
      last = start;
      renderer.setAnimationLoop(() => {
        if (!ctx) return;
        const now = performance.now();
        const dt = Math.min(0.1, (now - last) / 1000);
        last = now;
        (overlay?.current(controller) ?? controller).update(dt, (now - start) / 1000, ctx);
        // Perf-Statistik: FPS und p99 der Frametime über ein 1-s-Fenster
        times.push(dt * 1000);
        frames++;
        acc += dt;
        if (acc >= 1) {
          const sorted = [...times].sort((a, b) => a - b);
          const p99 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.99))] ?? 0;
          const info = renderer.info as { render?: { drawCalls?: number } };
          const fpsNow = Math.round(frames / acc);
          const p99Now = Math.round(p99 * 10) / 10;
          useAppStore.getState().setPerf(fpsNow, p99Now, info.render?.drawCalls ?? 0);
          if (!overlay?.busy) governQuality(fpsNow, p99Now);
          times.length = 0;
          frames = 0;
          acc = 0;
        }
      });
    });

    return () => {
      disposed = true;
      ro?.disconnect();
      if (ctx) {
        ctx.renderer.setAnimationLoop(null);
        overlay?.dispose();
        controller.dispose();
        ctx.canvas.remove();
      }
    };
  }, [controller]);

  return <div ref={hostRef} className="canvas-host" />;
}
