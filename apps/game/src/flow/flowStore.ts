import { create } from 'zustand';

/**
 * Phases of the one continuous take: splash → hop → map → flyIn → level → depart → travel → map …
 * First run (real mode): splash → intro → level (the blob jumps straight into level 1). `travel`: after a won level
 * the hero lands on the completed node and walks the dots to the next one.
 */
export type FlowPhase = 'splash' | 'hop' | 'intro' | 'map' | 'flyIn' | 'level' | 'depart' | 'travel';

/**
 * Commands from the UI to the scene (the scene owns the transitions and reports phases back). `intro` plays the first
 * run from the splash (dev/E2E), `story` turns REX's page (tap on his line) or starts a pending scene.
 */
export type FlowRequestKind = 'hop' | 'intro' | 'flyIn' | 'depart' | 'leave' | 'map' | 'splash' | 'story';

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
  /** REX scene running on the map (e.g. 'afterLevel1'): his line box turns the page on a tap. */
  story: string | null;
  /** Scene to tell once the map is up (Werkstatt/URL `?story=`), consumed by the scene. */
  pendingStory: string | null;
  splashDot: SplashDot | null;
  /** Pending command for the scene (consumed via `clearRequest`). */
  pending: FlowRequest | null;
  reset: (phase: FlowPhase, nodeCount: number) => void;
  setPhase: (phase: FlowPhase) => void;
  setCurrent: (node: number) => void;
  setPlaying: (node: number | null) => void;
  setRex: (line: string | null) => void;
  setStory: (id: string | null) => void;
  setPendingStory: (id: string | null) => void;
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
  story: null,
  pendingStory: null,
  splashDot: null,
  pending: null,
  reset: (phase, nodeCount) => set({ phase, nodeCount, playing: null, pending: null, story: null }),
  setPhase: (phase) => set({ phase }),
  setCurrent: (current) => set({ current }),
  setPlaying: (playing) => set({ playing }),
  setRex: (rex) => set({ rex }),
  setStory: (story) => set({ story }),
  setPendingStory: (pendingStory) => set({ pendingStory }),
  setSplashDot: (splashDot) => set({ splashDot }),
  request: (kind, node) => set({ pending: node === undefined ? { kind, seq: ++seq } : { kind, node, seq: ++seq } }),
  clearRequest: () => set({ pending: null }),
}));
