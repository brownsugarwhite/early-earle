import { create } from 'zustand';

export type Backend = 'webgpu' | 'webgl2' | 'unknown';

export interface AppState {
  backend: Backend;
  fps: number;
  frameP99Ms: number;
  drawCalls: number;
  setBackend: (b: Backend) => void;
  setPerf: (fps: number, p99: number, drawCalls: number) => void;
}

/** Lesbarer Zustand für HUD und Editoren. Der Render-Loop liest per getState(), React per Selector. */
export const useAppStore = create<AppState>((set) => ({
  backend: 'unknown',
  fps: 0,
  frameP99Ms: 0,
  drawCalls: 0,
  setBackend: (backend) => set({ backend }),
  setPerf: (fps, frameP99Ms, drawCalls) => set({ fps, frameP99Ms, drawCalls }),
}));
