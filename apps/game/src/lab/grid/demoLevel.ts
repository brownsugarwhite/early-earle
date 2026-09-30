import { F_AXIS_V, KIND_BURST, KIND_LINE, cloneBoard, createState, materializeCells, withKind, type LevelDef, type LevelState } from '@ee/core';

/**
 * "Elemente-Schau": one demo board with every element type (the level schema caps real levels at four
 * kinds, so this one is built directly, not parsed). Fully playable — the rules engine handles all of it.
 */
export const DEMO_LEVEL: LevelDef = {
  schemaVersion: 1,
  id: 'demo-elemente',
  zone: 'tjorizo',
  name: 'Elemente-Schau',
  grid: {
    w: 7,
    h: 6,
    mask: ['.......', '.......', '..P....', '.......', '.#.....', '.......'],
  },
  fences: [
    { a: [2, 3], b: [3, 3] },
    { a: [2, 4], b: [3, 4] },
  ],
  floors: [
    { kind: 'withered', at: [0, 5] },
    { kind: 'deepWithered', at: [1, 5] },
    { kind: 'spore', at: [2, 5] },
    { kind: 'oil', at: [3, 5] },
    { kind: 'current', at: [4, 4], dir: 'right' },
    { kind: 'current', at: [5, 4], dir: 'right' },
    { kind: 'portal', at: [6, 5], portalId: 'a' },
    { kind: 'portal', at: [3, 0], portalId: 'a' },
  ],
  blockers: [
    { kind: 'scrap', at: [0, 0], layers: 1 },
    { kind: 'scrap', at: [0, 1], layers: 2 },
    { kind: 'scrap', at: [0, 2], layers: 3 },
    { kind: 'scrapMound', at: [5, 0], size: [2, 2], layers: 6 },
    { kind: 'crust', at: [4, 2], content: { tier: 3 } },
    { kind: 'sleeper', at: [4, 3], content: { tier: 2 } },
    { kind: 'cage', at: [3, 1], content: { tier: 2 }, layers: 2 },
    { kind: 'fog', at: [6, 3], content: { tier: 2 } },
  ],
  threats: [
    { kind: 'rot', at: [0, 3], period: 6 },
    { kind: 'toxic', at: [6, 2], countdown: 6 },
    { kind: 'stray', at: [5, 5], tier: 1 },
  ],
  start: [
    { at: [1, 1], blob: { tier: 1 } },
    { at: [2, 1], blob: { tier: 2, kind: 'amoeba' } },
    { at: [4, 1], blob: { tier: 4 } },
    { at: [1, 2], blob: { tier: 3 } },
    // Same tier as the Knall blob above it: one swipe up fires the 3×3 blast (juice demo).
    { at: [1, 3], blob: { tier: 3 } },
    { at: [5, 2], blob: { tier: 1 } },
    { at: [5, 3], blob: { tier: 5 } },
    { at: [3, 2], blob: { tier: 3 } },
    { at: [2, 3], blob: { tier: 2 } },
    { at: [3, 3], blob: { tier: 2 } },
  ],
  spawn: {
    sources: [[4, 0]],
    table: [
      { tier: 1, weight: 8 },
      { tier: 2, weight: 2 },
    ],
    preview: true,
    fallback: 'anyEmpty',
  },
  goals: [
    { type: 'reachTier', tier: 6 },
    { type: 'clearScrap' },
    { type: 'heal' },
    { type: 'collectSpores', count: 1 },
    { type: 'rescue', count: 1 },
  ],
  moves: 40,
  cap: 8,
  specials: { lineAt: 2, burstAt: 3 },
  difficulty: { targetAttempts: [1, 1.2], style: 'journey' },
};

/** Demo state with a charged line blob (Strahl, row) and a burst blob (Knall) placed by hand. */
export function demoState(seed = 1234): LevelState {
  const base = createState(DEMO_LEVEL, seed);
  const b = cloneBoard(base);
  const w = DEMO_LEVEL.grid.w;
  const line = 3 * w + 5; // (5,3) tier 5 → Strahl, horizontal
  const burst = 2 * w + 1; // (1,2) tier 3 → Knall
  b.flags[line] = withKind(b.flags[line]!, KIND_LINE) & ~F_AXIS_V;
  b.flags[burst] = withKind(b.flags[burst]!, KIND_BURST);
  return { ...b, cells: materializeCells(b) };
}

/**
 * "Wesen-Schau": the body archetypes on one board (blob ids pick the species: snakes, mouse, retriever,
 * elephants, duck, REX, blobs and a 2048 retriever that overflows its cell). One swipe left plays every
 * merge style at once: the snake coils and swallows (row 1), the retriever leaps toward the camera and
 * devours (row 2), the elephant stomps (row 3), the blobs splash (row 4), the REX leaps onto the duck
 * (row 5).
 */
export const CREATURE_DEMO_LEVEL: LevelDef = {
  schemaVersion: 1,
  id: 'demo-wesen',
  zone: 'tjorizo',
  name: 'Wesen-Schau',
  grid: { w: 6, h: 6, mask: ['......', '......', '......', '......', '......', '......'] },
  fences: [],
  floors: [],
  blockers: [],
  threats: [],
  start: [
    { at: [0, 0], blob: { tier: 6 } }, // 1 snake
    { at: [5, 0], blob: { tier: 1 } }, // 2 blob
    { at: [3, 0], blob: { tier: 6 } }, // 3 snake → coils around 1 and swallows it
    { at: [5, 3], blob: { tier: 2 } }, // 4 blob
    { at: [0, 1], blob: { tier: 5 } }, // 5 mouse
    { at: [5, 1], blob: { tier: 1 } }, // 6 blob
    { at: [0, 2], blob: { tier: 8 } }, // 7 elephant
    { at: [3, 1], blob: { tier: 5 } }, // 8 retriever → leaps toward the camera, devours 5
    { at: [0, 3], blob: { tier: 3 } }, // 9 blob
    { at: [3, 3], blob: { tier: 3 } }, // 10 blob → splashes into 9
    { at: [3, 4], blob: { tier: 7 } }, // 11 REX → leaps onto 12
    { at: [0, 4], blob: { tier: 7 } }, // 12 duck
    { at: [5, 4], blob: { tier: 2 } }, // 13 blob
    { at: [5, 2], blob: { tier: 1 } }, // 14 blob
    { at: [3, 2], blob: { tier: 8 } }, // 15 elephant → rears up and stomps 7
    { at: [0, 5], blob: { tier: 11 } }, // 16 a 2048 retriever (overflows its cell; tier 12 graduates at the cap)
  ],
  spawn: {
    sources: [[5, 0]],
    table: [
      { tier: 1, weight: 6 },
      { tier: 2, weight: 3 },
    ],
    preview: true,
    fallback: 'anyEmpty',
  },
  goals: [{ type: 'reachTier', tier: 12 }],
  moves: 99,
  cap: 12,
  specials: { lineAt: 13, burstAt: 13 },
  difficulty: { targetAttempts: [1, 1.2], style: 'journey' },
};

export function creatureDemoState(seed = 1234): LevelState {
  return createState(CREATURE_DEMO_LEVEL, seed);
}

/**
 * "Herde": 21 species animals of mixed tiers (5–8) and 7 blobs on one board of the Wooding zone — the mesh-path
 * stress board (one shared mesh per species, fur fins/shells and feather cards on the mesh block). One swipe
 * up merges the REX with a mouse, a giraffe with a mouse and an elephant with a duck.
 */
export const HERD_DEMO_LEVEL: LevelDef = {
  schemaVersion: 1,
  id: 'demo-herde',
  zone: 'wooding',
  name: 'Herde',
  grid: { w: 6, h: 6, mask: ['......', '......', '......', '......', '......', '......'] },
  fences: [],
  floors: [],
  blockers: [],
  threats: [],
  start: [
    { at: [0, 0], blob: { tier: 2 } }, // 1 blob
    { at: [1, 0], blob: { tier: 6 } }, // 2 REX
    { at: [2, 0], blob: { tier: 7 } }, // 3 duck (feathers)
    { at: [3, 0], blob: { tier: 7 } }, // 4 snake
    { at: [4, 0], blob: { tier: 6 } }, // 5 retriever (fur)
    { at: [5, 0], blob: { tier: 8 } }, // 6 elephant
    { at: [0, 1], blob: { tier: 1 } }, // 7 blob
    { at: [0, 5], blob: { tier: 2 } }, // 8 blob
    { at: [2, 1], blob: { tier: 8 } }, // 9 snake
    { at: [3, 1], blob: { tier: 3 } }, // 10 blob
    { at: [1, 5], blob: { tier: 1 } }, // 11 blob
    { at: [5, 1], blob: { tier: 5 } }, // 12 giraffe
    { at: [0, 2], blob: { tier: 5 } }, // 13 mouse (fur)
    { at: [1, 2], blob: { tier: 6 } }, // 14 mouse (fur) → merges up into the REX
    { at: [3, 5], blob: { tier: 3 } }, // 15 blob
    { at: [3, 2], blob: { tier: 5 } }, // 16 retriever (fur)
    { at: [4, 2], blob: { tier: 7 } }, // 17 elephant
    { at: [5, 2], blob: { tier: 5 } }, // 18 mouse (fur) → merges up into the giraffe
    { at: [0, 3], blob: { tier: 7 } }, // 19 retriever (fur)
    { at: [1, 3], blob: { tier: 5 } }, // 20 retriever (fur)
    { at: [2, 3], blob: { tier: 6 } }, // 21 elephant
    { at: [4, 3], blob: { tier: 7 } }, // 22 snake
    { at: [5, 3], blob: { tier: 6 } }, // 23 elephant
    { at: [0, 4], blob: { tier: 7 } }, // 24 REX
    { at: [2, 4], blob: { tier: 6 } }, // 25 duck → merges up into the elephant
    { at: [3, 4], blob: { tier: 2 } }, // 26 blob
    { at: [4, 4], blob: { tier: 6 } }, // 27 retriever
    { at: [5, 4], blob: { tier: 6 } }, // 28 giraffe
  ],
  spawn: {
    sources: [[5, 5]],
    table: [
      { tier: 1, weight: 6 },
      { tier: 2, weight: 3 },
    ],
    preview: true,
    fallback: 'anyEmpty',
  },
  goals: [{ type: 'reachTier', tier: 12 }],
  moves: 99,
  cap: 12,
  specials: { lineAt: 13, burstAt: 13 },
  difficulty: { targetAttempts: [1, 1.2], style: 'journey' },
};

export function herdDemoState(seed = 1234): LevelState {
  return createState(HERD_DEMO_LEVEL, seed);
}
