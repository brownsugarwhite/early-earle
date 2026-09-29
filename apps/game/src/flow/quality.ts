/**
 * Flow-Lab quality presets (a trimmed copy of the Earle-Lab presets so the flow does not depend on lab
 * files that other agents are editing). The look stays identical, only the costs change.
 */
export interface FlowQuality {
  name: 'hoch' | 'mobil';
  shadowMapSize: number;
  dotsPerTree: [number, number];
  collapsePx: number;
  /** Target tree count before the path corridor is cleared. */
  treeCount: number;
  fogStripes: number;
  terrainRes: number;
  fillerSegments: [number, number];
  blobOctaves: number;
}

export const FLOW_QUALITY: Record<'hoch' | 'mobil', FlowQuality> = {
  hoch: {
    name: 'hoch',
    shadowMapSize: 2048,
    dotsPerTree: [60, 160],
    collapsePx: 0.75,
    treeCount: 200,
    fogStripes: 3,
    terrainRes: 96,
    fillerSegments: [160, 80],
    blobOctaves: 2,
  },
  mobil: {
    name: 'mobil',
    shadowMapSize: 1024,
    dotsPerTree: [28, 52],
    collapsePx: 1.2,
    treeCount: 110,
    fogStripes: 2,
    terrainRes: 64,
    fillerSegments: [96, 48],
    blobOctaves: 1,
  },
};

/** Touch device or DPR ≥ 2.5 → Mobil, otherwise Hoch. `?quality=mobil|hoch` overrides. */
export function resolveFlowQuality(): FlowQuality {
  if (typeof window === 'undefined') return FLOW_QUALITY.hoch;
  const forced = new URLSearchParams(location.search).get('quality');
  if (forced === 'mobil' || forced === 'hoch') return FLOW_QUALITY[forced];
  const touch = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
  const dpr = window.devicePixelRatio || 1;
  return touch || dpr >= 2.5 ? FLOW_QUALITY.mobil : FLOW_QUALITY.hoch;
}
