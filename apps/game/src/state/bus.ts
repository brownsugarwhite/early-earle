import mitt from 'mitt';

/** Einmal-Ereignisse zwischen Spielkern, Renderer und UI. Zustand, der gelesen wird, gehört in den Store. */
export type BusEvents = {
  'move': { direction: 'up' | 'down' | 'left' | 'right' };
  'animationDone': { moveId: number };
  'ui/toast': { text: string };
  'renderer/ready': { backend: 'webgpu' | 'webgl2' };
};

export const bus = mitt<BusEvents>();
