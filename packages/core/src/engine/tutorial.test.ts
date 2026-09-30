/**
 * Level 1 "Zwei werden eins" (1×3, one scripted 1) cannot be lost: an exhaustive search over
 * every swipe, every spawn cell and every next preview finds only wins, after two swipes.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  applyMove,
  createState,
  finalizeMove,
  forcedSpawnCell,
  peekScript,
  placeSpawn,
  runPreSpawn,
  spawnCandidates,
  spawnDistribution,
} from './applyMove';
import { asciiTiers } from '../testing/ascii';
import { cloneBoard, type Board, type SpawnEntry } from '../model';
import { LevelSchema } from '../schema/level';
import { hashBoard } from '../solver/board';

const levelsDir = fileURLToPath(new URL('../../../../content/levels/', import.meta.url));

/** Every next preview the engine could draw after a spawn (script entry, else each table row). */
function previews(b: Board): SpawnEntry[] {
  const s = peekScript(b);
  return s ? [s] : spawnDistribution(b.level).map((o) => o.entry);
}

/**
 * Walks the whole game tree (4 swipes × spawn cells × next previews) with the engine's own
 * mutable steps. Returns the number of distinct states, lost/won leaves and the longest game.
 */
function explore(root: Board): { states: number; lost: number; won: number; maxDepth: number } {
  const seen = new Set<string>();
  const out = { states: 0, lost: 0, won: 0, maxDepth: 0 };
  const key = (b: Board) =>
    `${hashBoard(b)}|${b.movesLeft}|${b.status}|${Array.from(b.tiers).join(',')}|${b.spawnQueue[0]?.tier}${b.spawnQueue[0]?.kind}${b.spawnQueue[0]?.at}|${b.scriptPos}`;
  const cands = new Int16Array(64);
  const visit = (b: Board, depth: number) => {
    const k = key(b);
    if (seen.has(k)) return;
    seen.add(k);
    out.states++;
    out.maxDepth = Math.max(out.maxDepth, depth);
    if (b.status === 'lost') {
      out.lost++;
      return;
    }
    if (b.status === 'won') {
      out.won++;
      return;
    }
    for (let d = 0; d < 4; d++) {
      const pre = cloneBoard(b);
      if (runPreSpawn(pre, d, null) === false) continue;
      const entry = pre.spawnQueue[0]!;
      const count = spawnCandidates(pre, cands);
      if (count === 0) {
        const next = cloneBoard(pre);
        finalizeMove(next, null);
        visit(next, depth + 1);
        continue;
      }
      const forced = forcedSpawnCell(entry, cands, count);
      const cells = forced >= 0 ? [forced] : Array.from(cands.slice(0, count));
      for (const cell of cells) {
        for (const p of previews(pre)) {
          const next = cloneBoard(pre);
          placeSpawn(next, cell, entry, null);
          next.spawnQueue.shift();
          next.spawnQueue.push(p);
          if (p === peekScript(pre)) next.scriptPos++;
          finalizeMove(next, null);
          visit(next, depth + 1);
        }
      }
    }
  };
  visit(root, 0);
  return out;
}

describe('level 1 "Zwei werden eins"', () => {
  const level = LevelSchema.parse(JSON.parse(readFileSync(`${levelsDir}001.json`, 'utf8')));

  it('is a 1×3 strip 1 1 2 with one scripted 1', () => {
    expect(level.grid).toEqual({ w: 3, h: 1, mask: ['...'] });
    expect(asciiTiers(createState(level, 1))).toBe('1 1 2');
    expect(level.spawn.script).toEqual([{ tier: 1 }]);
    expect(level.goals).toEqual([{ type: 'reachTier', tier: 3 }]);
  });

  it('cannot be lost: every reachable end state is a win, after exactly two swipes', () => {
    const r = explore(createState(level, 1));
    expect(r.lost).toBe(0);
    expect(r.won).toBeGreaterThan(0);
    expect(r.maxDepth).toBe(2);
    // and the real engine agrees for any seed and any first direction
    for (let seed = 1; seed <= 20; seed++) {
      for (const first of ['left', 'right'] as const) {
        const a = applyMove(createState(level, seed), first)!;
        expect(a.state.status).toBe('playing');
        expect(a.state.spawnQueue.length).toBe(1);
        for (const second of ['left', 'right'] as const) {
          expect(applyMove(a.state, second)!.state.status).toBe('won');
        }
        expect(applyMove(a.state, 'up')).toBeNull();
      }
    }
  });

  it('the preview shows the scripted 1 from the start', () => {
    const s0 = createState(level, 42);
    expect(s0.spawnQueue).toEqual([{ tier: 1, kind: 'normal' }]);
    const a = applyMove(s0, 'left')!;
    expect(asciiTiers(a.state)).toBe('2 2 1');
    const b = applyMove(s0, 'right')!;
    expect(asciiTiers(b.state)).toBe('1 2 2');
  });
});
