/**
 * Zone 1 "Tjorizo", levels 1–25 (plan §7):
 *   swipe/merge/preview (1), move limit (2), pillar (6), rewind booster (8, UI only),
 *   scrap (11), spores (14), amoeba (16), pluck booster (17, UI), cap/graduation (18),
 *   withered (21), line blob (24); celebrations at 10 and 20; hard at 19 and 25.
 *
 * Tutorial boards are only as big as their mechanic needs (Florian, iteration 4): level 1
 * is a 1×3 strip with a scripted spawn, 2–4 and 6 are 3×2 / 3×3, and the first level of
 * every later mechanic (11, 14, 16, 18, 21) is a fixed 3×3 board; 24 is a fixed 4×4.
 * Follow-up levels keep their size. Numbers (moves, start tiers, goal sizes) are tuned
 * with tools/levels/calibrate.ts (novice ≥ 90 %, strong always solves).
 */

import type { LevelSpec } from './generateLevel';

const Z = 'tjorizo' as const;

export const TJORIZO_SPECS: readonly LevelSpec[] = [
  {
    // 1×3 strip straight from the splash: one swipe either way merges the 1s, the scripted 1
    // fills the gap, the second swipe makes the 8. Up/down change nothing, so it cannot be lost.
    zone: Z,
    index: 1,
    name: 'Zwei werden eins',
    type: 'tutorial',
    grid: { w: 3, h: 1 },
    elements: [],
    goals: [{ type: 'reachTier', tier: 3 }],
    moves: 99,
    seed: 1,
    board: `1 1 2`,
    spawn: { script: [{ tier: 1 }] },
    style: 'journey',
  },
  {
    zone: Z,
    index: 2,
    name: 'Züge zählen',
    type: 'tutorial',
    grid: { w: 3, h: 2 },
    elements: [],
    goals: [{ type: 'reachTier', tier: 4 }],
    moves: 10,
    seed: 1,
    board: `
      1 1 .
      2 . .`,
    style: 'journey',
  },
  {
    zone: Z,
    index: 3,
    name: 'Weiter so',
    type: 'comfort',
    grid: { w: 3, h: 3 },
    elements: [],
    goals: [{ type: 'reachTier', tier: 4 }],
    moves: 16,
    startTiers: [2, 1, 1],
    seed: 1,
    style: 'journey',
  },
  {
    zone: Z,
    index: 4,
    name: 'Punkte sammeln',
    type: 'comfort',
    grid: { w: 3, h: 3 },
    elements: [],
    goals: [{ type: 'score', points: 60 }],
    moves: 20,
    startTiers: [2, 2, 1, 1],
    seed: 1,
    style: 'diligent',
  },
  {
    // 4×4 needs 35 moves for the novice to stay at ≥ 90 % (30 → 82–90 %, 34 → 91–94 %).
    zone: Z,
    index: 5,
    name: 'Der Vierundsechziger',
    type: 'skill',
    grid: { w: 4, h: 4 },
    elements: [],
    goals: [{ type: 'reachTier', tier: 6 }],
    moves: 35,
    startTiers: [4, 3, 3, 2, 2, 1, 1],
    seed: 3,
    style: 'precise',
  },
  {
    zone: Z,
    index: 6,
    name: 'Der Pfeiler',
    type: 'tutorial',
    grid: { w: 3, h: 3 },
    elements: ['pillar'],
    goals: [{ type: 'reachTier', tier: 4 }],
    moves: 18,
    seed: 1,
    board: `
      1 . 1
      . P .
      . 2 .`,
    style: 'journey',
  },
  {
    zone: Z,
    index: 7,
    name: 'Um die Ecke',
    type: 'comfort',
    grid: { w: 5, h: 5 },
    elements: ['pillar'],
    goals: [{ type: 'reachTier', tier: 5 }],
    moves: 34,
    startTiers: [3, 2, 2, 1, 1],
    seed: 2,
    style: 'journey',
  },
  {
    zone: Z,
    index: 8,
    name: 'Zurückspulen',
    type: 'comfort',
    grid: { w: 5, h: 5 },
    elements: ['pillar'],
    counts: { pillars: 2 },
    goals: [{ type: 'reachTier', tier: 6 }],
    moves: 38,
    startTiers: [4, 3, 3, 2, 2, 1, 1],
    seed: 3,
    style: 'journey',
  },
  {
    zone: Z,
    index: 9,
    name: 'Punkte am Pfeiler',
    type: 'skill',
    grid: { w: 5, h: 5 },
    elements: ['pillar'],
    goals: [{ type: 'score', points: 260 }],
    moves: 36,
    startTiers: [3, 3, 2, 2, 1, 1],
    seed: 4,
    style: 'diligent',
  },
  {
    zone: Z,
    index: 10,
    name: 'Ehrenrunde',
    type: 'celebration',
    grid: { w: 5, h: 5 },
    elements: [],
    goals: [{ type: 'reachTier', tier: 7 }],
    moves: 30,
    seed: 1,
    board: `
      . . . . .
      6 5 4 3 .
      6 5 4 3 .
      . . . . .
      . . . . .`,
    style: 'explosive',
  },
  // ---- 11–25 -------------------------------------------------------------------------
  {
    // One scrap per side: a merge landing next to it cracks it (right for the top, left for the bottom).
    zone: Z,
    index: 11,
    name: 'Schrott',
    type: 'tutorial',
    grid: { w: 3, h: 3 },
    elements: ['scrap'],
    goals: [{ type: 'clearScrap' }],
    moves: 12,
    seed: 1,
    board: `
      1  1 X1
      .  . .
      X1 2 2`,
    style: 'precise',
  },
  {
    zone: Z,
    index: 12,
    name: 'Mehr Schrott',
    type: 'comfort',
    grid: { w: 5, h: 5 },
    elements: ['scrap'],
    counts: { scrap: 3 },
    scrapLayers: 2,
    goals: [{ type: 'clearScrap' }],
    moves: 34,
    startTiers: [3, 2, 2, 1, 1],
    seed: 1,
    style: 'precise',
  },
  {
    zone: Z,
    index: 13,
    name: 'Schrotthügel',
    type: 'hard',
    grid: { w: 5, h: 5 },
    elements: ['pillar', 'scrap'],
    counts: { scrap: 3 },
    scrapLayers: 2,
    goals: [{ type: 'clearScrap' }],
    moves: 31,
    startTiers: [3, 3, 2, 2, 1, 1],
    seed: 1,
    style: 'precise',
  },
  {
    // Spores at the ends of the two rows: the merge lands on them (right for the top, left for the bottom).
    zone: Z,
    index: 14,
    name: 'Sporen',
    type: 'tutorial',
    grid: { w: 3, h: 3 },
    elements: ['spore'],
    goals: [{ type: 'collectSpores', count: 2 }],
    moves: 12,
    seed: 1,
    board: `
      1 1 s
      . . .
      s 2 2`,
    style: 'journey',
  },
  {
    zone: Z,
    index: 15,
    name: 'Sporenfeld',
    type: 'comfort',
    grid: { w: 5, h: 5 },
    elements: ['spore'],
    counts: { spores: 5 },
    goals: [{ type: 'collectSpores', count: 5 }],
    moves: 34,
    startTiers: [3, 2, 2, 1, 1],
    seed: 1,
    style: 'journey',
  },
  {
    // Every first swipe leaves the centre free; the scripted amoeba lands there and lifts the 16 to 32.
    zone: Z,
    index: 16,
    name: 'Die Amöbe',
    type: 'tutorial',
    grid: { w: 3, h: 3 },
    elements: ['amoeba'],
    spawn: { amoeba: 1, script: [{ tier: 1, kind: 'amoeba', at: [1, 1] }] },
    goals: [{ type: 'reachTier', tier: 5 }],
    moves: 16,
    seed: 1,
    board: `
      . 3 .
      . . .
      2 . 2`,
    style: 'journey',
  },
  {
    zone: Z,
    index: 17,
    name: 'Pflücken',
    type: 'comfort',
    grid: { w: 5, h: 5 },
    elements: ['amoeba', 'spore'],
    counts: { spores: 4 },
    spawn: { amoeba: 1 },
    goals: [{ type: 'collectSpores', count: 4 }],
    moves: 34,
    startTiers: [3, 2, 2, 1, 1],
    seed: 1,
    style: 'journey',
  },
  {
    // Cap 4: the first sideways swipe releases the top pair; the second 16 is built from the bottom pair.
    zone: Z,
    index: 18,
    name: 'Aufbruch',
    type: 'tutorial',
    grid: { w: 3, h: 3 },
    elements: ['cap'],
    cap: 4,
    goals: [{ type: 'release', count: 2 }],
    moves: 16,
    seed: 1,
    board: `
      3 3 .
      . . .
      . 2 2`,
    style: 'journey',
  },
  {
    zone: Z,
    index: 19,
    name: 'Zwei Aufbrüche',
    type: 'hard',
    grid: { w: 5, h: 5 },
    elements: ['pillar', 'cap'],
    cap: 5,
    goals: [{ type: 'release', count: 2 }],
    moves: 18,
    startTiers: [4, 3, 3, 2, 2, 1, 1],
    seed: 1,
    style: 'precise',
  },
  {
    zone: Z,
    index: 20,
    name: 'Ehrenrunde II',
    type: 'celebration',
    grid: { w: 5, h: 5 },
    elements: ['cap'],
    cap: 7,
    goals: [{ type: 'release', count: 1 }],
    moves: 30,
    seed: 1,
    board: `
      . . . . .
      . 6 6 . .
      . 5 5 . .
      . 4 4 . .
      . . . . .`,
    style: 'explosive',
  },
  {
    // Withered cells at the far ends of the two columns: swipe up heals the left, down the right.
    zone: Z,
    index: 21,
    name: 'Verdorrt',
    type: 'tutorial',
    grid: { w: 3, h: 3 },
    elements: ['withered'],
    goals: [{ type: 'heal' }],
    moves: 12,
    seed: 1,
    board: `
      w . 2
      1 . 2
      1 . w`,
    style: 'journey',
  },
  {
    zone: Z,
    index: 22,
    name: 'Tief verdorrt',
    type: 'comfort',
    grid: { w: 5, h: 5 },
    elements: ['withered', 'deepWithered'],
    counts: { withered: 3, deepWithered: 2 },
    goals: [{ type: 'heal' }],
    moves: 34,
    startTiers: [3, 2, 2, 1, 1],
    seed: 1,
    style: 'journey',
  },
  {
    zone: Z,
    index: 23,
    name: 'Heilen am Pfeiler',
    type: 'skill',
    grid: { w: 5, h: 5 },
    elements: ['pillar', 'withered'],
    counts: { withered: 5 },
    placement: 'any',
    goals: [{ type: 'heal' }],
    moves: 28,
    startTiers: [3, 3, 2, 2, 1, 1],
    seed: 1,
    style: 'precise',
  },
  {
    // Two pairs in a row: the first sideways swipe makes two merges and a beam blob; the scrap pair
    // under it (two layers each) wants the beam fired along its row (fires in ~9 of 10 novice games).
    zone: Z,
    index: 24,
    name: 'Der Strahl',
    type: 'tutorial',
    grid: { w: 4, h: 4 },
    elements: ['line', 'scrap'],
    specials: { lineAt: 2 },
    goals: [{ type: 'clearScrap' }],
    moves: 24,
    seed: 1,
    board: `
      . .  .  .
      1 1  2  2
      . X2 X2 .
      . .  .  .`,
    style: 'explosive',
  },
  {
    zone: Z,
    index: 25,
    name: 'Der erste Riss',
    type: 'hard',
    grid: { w: 5, h: 5 },
    elements: ['pillar', 'scrap', 'line'],
    counts: { scrap: 3 },
    scrapLayers: 2,
    specials: { lineAt: 3 },
    goals: [{ type: 'clearScrap' }, { type: 'reachTier', tier: 6 }],
    moves: 29,
    startTiers: [4, 4, 3, 3, 2, 2, 1, 1],
    seed: 1,
    style: 'explosive',
  },
];

/** Spec of a Tjorizo level (1–25). */
export function tjorizoSpec(index: number): LevelSpec {
  const spec = TJORIZO_SPECS.find((s) => s.index === index);
  if (!spec) throw new Error(`no Tjorizo spec for level ${index}`);
  return spec;
}

/** Levels that ship in P3. */
export const P3_LEVEL_INDICES: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
