import { useAppStore } from '../state/store';

/** Zeigt Backend (WebGPU/WebGL2), FPS, Frametime-p99 und Draw Calls. Pflicht in jedem Lab. */
export function PerfBadge() {
  const backend = useAppStore((s) => s.backend);
  const fps = useAppStore((s) => s.fps);
  const p99 = useAppStore((s) => s.frameP99Ms);
  const dc = useAppStore((s) => s.drawCalls);
  const label = backend === 'webgpu' ? 'WebGPU' : backend === 'webgl2' ? 'WebGL2' : '…';
  return (
    <div className="perf-badge" data-backend={backend} data-testid="perf-badge">
      <span className="perf-backend">{label}</span>
      <span>{fps} fps</span>
      <span>p99 {p99} ms</span>
      <span>{dc} dc</span>
    </div>
  );
}
