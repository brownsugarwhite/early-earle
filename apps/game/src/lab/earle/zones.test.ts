import { describe, expect, it } from 'vitest';
import { LEVELS } from '../../content/levels';
import { AUTHORED_ROUTE, GATE_LEVEL, LAST_NODE, LEVEL_COUNT, PLAYABLE_COUNT, ROUTE, TREE_RANGE, WORLD_CONTENTS, ZONE_CONTENTS, routeOptions, zoneOfLevel } from './zones';

/** Route 15 + 1 in der App: dieselbe Datei wie in den Tests der Ebene (`content/zones/route.json`). */
describe('zones.ts: Route aus content/zones/route.json', () => {
  it('leitet Levelzahl, Riesenbaum, Torknoten und spielbare Level aus der Route ab', () => {
    expect(LEVEL_COUNT).toBe(184);
    expect(TREE_RANGE).toEqual([99, 114]);
    expect(GATE_LEVEL).toBe(185);
    expect(LAST_NODE).toBe(184);
    // spielbar sind nur Level mit Datei (101–184 entstehen parallel)
    expect(PLAYABLE_COUNT).toBe(Math.min(184, LEVELS.length));
    expect(AUTHORED_ROUTE).toHaveLength(16);
    expect(WORLD_CONTENTS[ROUTE.beyondWorld]!.id).toBe('w16');
    expect(WORLD_CONTENTS[ROUTE.beyondWorld]!.hinted).toBe(true);
    // die Route ist keine Zonendatei
    expect(ZONE_CONTENTS.map((z) => z.id).sort()).toEqual(['luzz', 'syrup', 'tjorizo', 'wooding']);
  });

  it('gibt der Karte die angedeutete Zone als Welt jenseits der Route; prozedural nur mit Flag', () => {
    const o = routeOptions();
    expect(o.beyondWorld).toBe(ROUTE.beyondWorld);
    expect(o.noLateral).toContain(ROUTE.beyondWorld);
    expect(o.procedural).toBeUndefined();
    expect(routeOptions(true).procedural).toBe(true);
  });

  it('Story-Zone eines Levels: aus der Leveldatei, ohne Datei aus der Welt des Routenabschnitts', () => {
    expect(zoneOfLevel(1)?.id).toBe('tjorizo');
    expect(zoneOfLevel(26)?.id).toBe(LEVELS[25]?.zone);
    expect(zoneOfLevel(100)?.id).toBe(LEVELS[99]?.zone);
    // Level 130 liegt in w11 (Nebelweide, luzz)
    const w11 = WORLD_CONTENTS.find((w) => w.id === 'w11')!;
    expect(zoneOfLevel(130)?.id).toBe(LEVELS[129]?.zone ?? w11.zone);
  });
});
