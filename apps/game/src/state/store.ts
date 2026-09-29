import { create } from 'zustand';

export type Backend = 'webgpu' | 'webgl2' | 'unknown';
/** Nutzerwunsch: Auto (Governor entscheidet), Hoch oder Mobil. */
export type QualityPref = 'auto' | 'hoch' | 'mobil';
export type ResolvedQuality = 'hoch' | 'mobil';

export interface AppState {
  backend: Backend;
  fps: number;
  frameP99Ms: number;
  drawCalls: number;
  qualityPref: QualityPref;
  /** Vom Governor (oder der festen Vorgabe) bestimmte Stufe, die Szenen für 'auto' verwenden. */
  effectiveQuality: ResolvedQuality;
  setQualityPref: (q: QualityPref) => void;
  setEffectiveQuality: (q: ResolvedQuality) => void;
  setBackend: (b: Backend) => void;
  setPerf: (fps: number, p99: number, drawCalls: number) => void;
}

/** Lesbarer Zustand für HUD und Editoren. Der Render-Loop liest per getState(), React per Selector. */
export const useAppStore = create<AppState>((set) => ({
  backend: 'unknown',
  fps: 0,
  frameP99Ms: 0,
  drawCalls: 0,
  qualityPref: (typeof localStorage !== 'undefined' && (localStorage.getItem('ee.qualityPref') as QualityPref | null)) || 'auto',
  effectiveQuality: 'hoch',
  setQualityPref: (qualityPref) => {
    try { localStorage.setItem('ee.qualityPref', qualityPref); } catch { /* privat/blockiert */ }
    set({ qualityPref });
  },
  setEffectiveQuality: (effectiveQuality) => set({ effectiveQuality }),
  setBackend: (backend) => set({ backend }),
  setPerf: (fps, frameP99Ms, drawCalls) => set({ fps, frameP99Ms, drawCalls }),
}));
