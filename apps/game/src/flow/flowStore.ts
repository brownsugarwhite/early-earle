import { create } from 'zustand';

/** Phases of the one continuous take: splash → hop → map → flyIn → level → depart → map … */
export type FlowPhase = 'splash' | 'hop' | 'map' | 'flyIn' | 'level' | 'depart';

/** Commands from the UI to the scene (the scene owns the transitions and reports phases back). */
export type FlowRequestKind = 'hop' | 'flyIn' | 'depart' | 'leave' | 'map' | 'splash';

export interface FlowRequest {
  kind: FlowRequestKind;
  /** Node index for `flyIn` (defaults to the current node). */
  node?: number;
  seq: number;
}

export interface SplashDot {
  /** Centre of the i-dot in CSS pixels of the viewport. */
  x: number;
  y: number;
  /** Radius of the baked dot in CSS pixels. */
  r: number;
}

export interface FlowState {
  phase: FlowPhase;
  /** Current node on the map (= level index the hero stands on). */
  current: number;
  /** Node whose level is being played (flyIn/level/depart). */
  playing: number | null;
  nodeCount: number;
  /** REX line for map moments (the level's own line lives in the grid store). */
  rex: string | null;
  splashDot: SplashDot | null;
  request: FlowRequest | null;
  reset: (phase: FlowPhase, nodeCount: number) => void;
  setPhase: (phase: FlowPhase) => void;
  setCurrent: (node: number) => void;
  setPlaying: (node: number | null) => void;
  setRex: (line: string | null) => void;
  setSplashDot: (dot: SplashDot | null) => void;
  request: (kind: FlowRequestKind, node?: number) => void;
  clearRequest: () => void;
}

let seq = 0;

/** Readable flow state for the HUD and the splash; the scene drives it and reacts to `request`. */
export const useFlowStore = create<FlowState>((set) => ({
  phase: 'splash',
  current: 0,
  playing: null,
  nodeCount: 0,
  rex: null,
  splashDot: null,
  request: null,
  reset: (phase, nodeCount) => set({ phase, nodeCount, playing: null, request: null }),
  setPhase: (phase) => set({ phase }),
  setCurrent: (current) => set({ current }),
  setPlaying: (playing) => set({ playing }),
  setRex: (rex) => set({ rex }),
  setSplashDot: (splashDot) => set({ splashDot }),
  request: (kind, node) => set({ request: node === undefined ? { kind, seq: ++seq } : { kind, node, seq: ++seq } }),
  clearRequest: () => set({ request: null }),
}));
