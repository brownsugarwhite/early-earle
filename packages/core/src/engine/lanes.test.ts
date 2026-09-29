import { describe, expect, it } from 'vitest';
import { buildGeometry } from './lanes';
import { levelFromAscii } from '../testing/ascii';
import { CELL_OPEN, CELL_PILLAR, CELL_VOID, DIR_INDEX } from '../model';

describe('lanes / geometry', () => {
  const level = levelFromAscii(
    `. . . .
     . P . .
     # . . .
     . . . .`,
    { fences: [{ a: [2, 0], b: [3, 0] }], spawn: { sources: [[1, 1]], fallback: 'none' } },
  );
  const geo = buildGeometry(level);

  it('classifies cells and neighbours', () => {
    expect(geo.cellType[0]).toBe(CELL_OPEN);
    expect(geo.cellType[5]).toBe(CELL_PILLAR);
    expect(geo.cellType[8]).toBe(CELL_VOID);
    expect(geo.nb[DIR_INDEX.up]![0]).toBe(-1);
    expect(geo.nb[DIR_INDEX.down]![0]).toBe(4);
    expect(geo.nb[DIR_INDEX.right]![3]).toBe(-1);
    expect(geo.playable.length).toBe(14);
  });

  it('stores fences on both cells', () => {
    expect(geo.fence[2]! & (1 << DIR_INDEX.right)).toBeTruthy();
    expect(geo.fence[3]! & (1 << DIR_INDEX.left)).toBeTruthy();
    expect(geo.fence[2]! & (1 << DIR_INDEX.left)).toBeFalsy();
  });

  it('orders lines from the wall side', () => {
    expect(geo.lines[DIR_INDEX.left]![0]).toEqual([0, 1, 2, 3]);
    expect(geo.lines[DIR_INDEX.right]![0]).toEqual([3, 2, 1, 0]);
    expect(geo.lines[DIR_INDEX.up]![0]).toEqual([0, 4, 8, 12]);
    expect(geo.lines[DIR_INDEX.down]![0]).toEqual([12, 8, 4, 0]);
  });

  it('splits segments at void, pillar and fence', () => {
    // row 0 moving left: fence between x=2 and x=3 → [0,1,2] and [3]
    const left = geo.segments[DIR_INDEX.left]!;
    expect(left).toContainEqual([0, 1, 2]);
    expect(left).toContainEqual([3]);
    // row 1 has a pillar at x=1 → [4] and [6,7]
    expect(left).toContainEqual([4]);
    expect(left).toContainEqual([6, 7]);
    // row 2 starts with void → [9,10,11]
    expect(left).toContainEqual([9, 10, 11]);
    // column 0 moving up: void at y=2 → [0,4] and [12]
    const up = geo.segments[DIR_INDEX.up]!;
    expect(up).toContainEqual([0, 4]);
    expect(up).toContainEqual([12]);
    // every segment is a run of open cells
    for (const segs of geo.segments)
      for (const s of segs) for (const c of s) expect(geo.cellType[c]).toBe(CELL_OPEN);
  });

  it('collects the open cells next to spawn sources', () => {
    // source on the pillar (1,1): neighbours (1,0)=1, (1,2)=9, (0,1)=4, (2,1)=6
    expect(geo.sourceAdjacent).toEqual([1, 4, 6, 9]);
  });

  it('orders current cells downstream-first', () => {
    const lvl = levelFromAscii(
      `> > > .
       . . . .
       . . . .`,
    );
    const g = buildGeometry(lvl);
    expect(g.currentOrder).toEqual([2, 1, 0]);
  });
});
