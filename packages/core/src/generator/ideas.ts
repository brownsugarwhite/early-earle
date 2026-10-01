/**
 * Level-Ideen 51–184, je Kartenzone eine Zeile pro Schablonenposition (Typ, Band und Zugfaktor
 * kommen aus `curve.ts`, die kalibrierten Züge aus `tuning.ts`).
 *
 * Bausteine aus den vier Tabellen (Tjorizo, Syrup, Luzz, Wooding), neu kombiniert nach der
 * Zonenschablone: Position 1 führt ein (Zone 5–8) oder feiert, Position 2 übt, die Kombi-Level
 * mischen höchstens zwei Arten, der Boss trägt alle Arten seines Zonen-Sets auf einem festen
 * Brett. Raster 4×4–5×5 (kleines Brett = kürzer und härter), Masken als Layout-Hebel.
 *
 * Materialien (Story-Zone): Luzz = Gas (schwebt über Risse und Wände, deshalb Jelly-Startblobs
 * als Kontrast; Fäulnis nur per Sprengung), Wooding = Feuer (verbrennt Kruste und Fäulnis, Öl
 * wird zur Bombe), Syrup = Flüssig (gleitet durch Öl, Jelly bleibt hängen).
 */

import type { ElementId, GoalSpec, LevelSpec, StartBlobSpec } from './generateLevel';
import type { ZoneId } from '../schema/level';

/** Eine Level-Idee: alles außer Zone, Nummer, Typ und Seed (die setzt `extended.ts`). */
export type Idea = Omit<LevelSpec, 'zone' | 'index' | 'type' | 'seed' | 'grid'> & {
  name: string;
  grid?: { w: number; h: number };
};

export interface ZoneKit {
  /** 1-basierte Kartenzone. */
  zone: number;
  /** Arten des Zonen-Sets (der Boss trägt alle). */
  set: ElementId[];
  ideas: Idea[];
}

// ---- Bausteine ---------------------------------------------------------------------------

const J = (tier: number): StartBlobSpec => ({ tier, material: 'jelly' });
const G = (w: number, h: number) => ({ w, h });

const tier = (t: number): GoalSpec => ({ type: 'reachTier', tier: t });
const release = (count: number): GoalSpec => ({ type: 'release', count });
const deliver = (t: number, count: number): GoalSpec => ({ type: 'deliver', tier: t, count });
const heal: GoalSpec = { type: 'heal' };
const clearScrap: GoalSpec = { type: 'clearScrap' };
const clearRot: GoalSpec = { type: 'clearRot' };
const rescue = (count: number): GoalSpec => ({ type: 'rescue', count });
const spores = (count: number): GoalSpec => ({ type: 'collectSpores', count });
const calm = (count: number): GoalSpec => ({ type: 'calmStrays', count });
const score = (points: number): GoalSpec => ({ type: 'score', points });

const RIFT_COL = ['..#..', '..#..', '.....', '..#..', '..#..'];
const RIFT_ROW = ['.....', '.....', '##.##', '.....', '.....'];
const VENT_C = ['.....', '.....', '..P..', '.....', '.....'];
const VENT_S = ['.....', '.....', 'P...P', '.....', '.....'];
const HOLE_C = ['.....', '.....', '..#..', '.....', '.....'];
const CORNERS = ['#...#', '.....', '.....', '.....', '#...#'];
const DIAG = ['.....', '.....', '..#..', '.#...', '#....'];
const MONO = ['.....', '..P..', '..P..', '.....', '.....'];
const BAY = ['.....', '.....', '.....', '#...#', '##.##'];
const TERRACE = ['.....', '.....', '#....', '##...', '###..'];
const C44 = ['#...', '....', '....', '...#'];

type C = [number, number];
const row = (y: number, x0: number, x1: number, dir: 'right' | 'left' | 'up' | 'down') =>
  Array.from({ length: x1 - x0 + 1 }, (_, i) => ({ at: [x0 + i, y] as C, dir }));
const col = (x: number, y0: number, y1: number, dir: 'right' | 'left' | 'up' | 'down') =>
  Array.from({ length: y1 - y0 + 1 }, (_, i) => ({ at: [x, y0 + i] as C, dir }));

// ---- Zone 5 · w05 Wurzelwelt · Luzz · Schläfer (51), Fäulnis (56) ---------------------------

const Z5: ZoneKit = {
  zone: 5,
  set: ['sleeper', 'rot', 'burst', 'pillar'],
  ideas: [
    {
      name: 'Schläfer',
      grid: G(4, 4),
      elements: ['sleeper'],
      counts: { sleepers: 1 },
      sleeperTier: 2,
      placement: 'edge',
      goals: [tier(5)],
      startTiers: [3, 2, 1, 1],
      style: 'precise',
    },
    {
      name: 'Weckruf',
      grid: G(5, 4),
      elements: ['sleeper'],
      counts: { sleepers: 2 },
      sleeperTier: 3,
      placement: 'any',
      goals: [tier(6)],
      startTiers: [4, 3, 2, 1, 1],
      style: 'precise',
    },
    {
      name: 'Gas',
      mask: RIFT_COL,
      elements: ['sleeper'],
      counts: { sleepers: 1 },
      sleeperTier: 2,
      placement: 'any',
      goals: [tier(6)],
      startTiers: [4, J(3), 3, 2, 1, 1],
      style: 'journey',
    },
    {
      name: 'Funkenregen',
      grid: G(5, 5),
      elements: ['burst'],
      specials: { burstAt: 2 },
      goals: [score(300)],
      startTiers: [3, 3, 2, 2, 2, 1, 1],
      style: 'explosive',
    },
    {
      name: 'Tiefschlaf',
      grid: G(4, 4),
      elements: ['sleeper', 'pillar'],
      counts: { sleepers: 2, pillars: 1 },
      sleeperTier: 2,
      cap: 5,
      goals: [release(2)],
      startTiers: [4, 3, 2, 2, 1],
      style: 'precise',
    },
    {
      name: 'Fäulnis',
      grid: G(5, 4),
      elements: ['rot', 'burst'],
      counts: { rot: 1 },
      rotPeriod: 8,
      specials: { burstAt: 2 },
      placement: 'edge',
      goals: [tier(5)],
      startTiers: [3, 3, 2, 2, 1],
      style: 'explosive',
    },
    {
      name: 'Fauler Schlaf',
      grid: G(5, 5),
      elements: ['sleeper', 'rot'],
      counts: { sleepers: 2, rot: 1 },
      sleeperTier: 2,
      rotPeriod: 7,
      placement: 'any',
      goals: [tier(6)],
      startTiers: [4, 3, 2, 2, 1, 1],
      style: 'precise',
    },
    {
      name: 'Fäulnis eindämmen',
      grid: G(4, 5),
      elements: ['rot', 'burst', 'pillar'],
      counts: { rot: 1, pillars: 1 },
      rotPeriod: 8,
      specials: { burstAt: 2 },
      placement: 'edge',
      goals: [clearRot],
      startTiers: [3, 3, 2, 2, 1],
      style: 'explosive',
    },
    {
      name: 'Weckknall',
      grid: G(4, 4),
      elements: ['sleeper', 'rot', 'burst'],
      counts: { sleepers: 1, rot: 2 },
      sleeperTier: 2,
      rotPeriod: 5,
      specials: { burstAt: 2 },
      placement: 'any',
      goals: [clearRot],
      startTiers: [3, 3, 2, 1],
      style: 'explosive',
    },
    {
      name: 'Ehrenrunde V',
      elements: ['pillar'],
      goals: [tier(7)],
      board: `
        4 . 3 . 4
        . 4 . 4 .
        3 . P . 3
        . 4 . 4 .
        4 . 3 . 4`,
      style: 'explosive',
    },
    {
      name: 'Bettruhe',
      mask: VENT_S,
      elements: ['sleeper', 'pillar'],
      counts: { sleepers: 3 },
      sleeperTier: 2,
      placement: 'interior',
      spawn: {
        sources: [
          [0, 2],
          [4, 2],
        ],
      },
      goals: [tier(6)],
      startTiers: [4, 3, 2, 2, 1],
      style: 'diligent',
    },
    {
      name: 'Die Wurzelkammer',
      elements: ['sleeper', 'rot', 'burst', 'pillar'],
      specials: { burstAt: 3 },
      goals: [tier(6)],
      board: `
        3S  .  3  .  R9
        .   P  .  4  .
        3   .  4  .  3
        .   4  .  P  .
        R9  .  3  .  3S`,
      style: 'explosive',
    },
  ],
};

// ---- Zone 6 · w02 Nebelhügel · Luzz · Giftwolke (63), Schrottberg (68) -----------------------

const Z6: ZoneKit = {
  zone: 6,
  set: ['toxic', 'scrapMound', 'line', 'oil'],
  ideas: [
    {
      name: 'Giftwolke',
      grid: G(4, 4),
      elements: ['toxic'],
      counts: { toxic: 1 },
      toxicCountdown: 8,
      placement: 'edge',
      goals: [tier(5)],
      startTiers: [3, 2, 2, 1, 1],
      style: 'precise',
    },
    {
      name: 'Giftwolken',
      grid: G(5, 4),
      elements: ['toxic'],
      counts: { toxic: 2 },
      toxicCountdown: 7,
      placement: 'any',
      goals: [tier(6)],
      startTiers: [4, 3, 2, 2, 1, 1],
      style: 'precise',
    },
    {
      name: 'Öl und Gift',
      grid: G(4, 4),
      elements: ['oil', 'toxic'],
      counts: { oil: 2, toxic: 1 },
      toxicCountdown: 7,
      placement: 'any',
      goals: [tier(5)],
      startTiers: [3, 3, 2, 1, 1],
      style: 'puzzle',
    },
    {
      name: 'Strahlenfest',
      grid: G(5, 5),
      elements: ['line', 'scrap'],
      counts: { scrap: 5 },
      specials: { lineAt: 2 },
      placement: 'any',
      goals: [clearScrap],
      startTiers: [3, 3, 2, 2, 1, 1],
      style: 'explosive',
    },
    {
      name: 'Giftfalle',
      grid: G(4, 4),
      elements: ['toxic', 'oil'],
      counts: { toxic: 2, oil: 2 },
      toxicCountdown: 5,
      cap: 5,
      placement: 'any',
      goals: [release(2)],
      startTiers: [4, 3, 2, 2, 1],
      style: 'precise',
    },
    {
      name: 'Schrottberg',
      grid: G(5, 5),
      elements: ['scrapMound'],
      counts: { mounds: 1 },
      moundLayers: 4,
      placement: 'any',
      goals: [clearScrap],
      startTiers: [3, 3, 2, 2, 1, 1],
      style: 'diligent',
    },
    {
      name: 'Bergstrahl',
      grid: G(5, 5),
      elements: ['scrapMound', 'line'],
      counts: { mounds: 1 },
      moundLayers: 6,
      specials: { lineAt: 3 },
      placement: 'any',
      goals: [clearScrap],
      startTiers: [3, 3, 2, 2, 1, 1],
      style: 'explosive',
    },
    {
      name: 'Lieferung',
      grid: G(4, 5),
      elements: ['oil'],
      counts: { oil: 2 },
      placement: 'any',
      goals: [deliver(5, 2)],
      startTiers: [3, 3, 2, 2, 1, 1],
      style: 'diligent',
    },
    {
      name: 'Giftberg',
      grid: G(5, 5),
      elements: ['scrapMound', 'toxic'],
      counts: { mounds: 1, toxic: 1 },
      moundLayers: 6,
      toxicCountdown: 6,
      placement: 'interior',
      goals: [clearScrap],
      startTiers: [3, 3, 2, 2, 1],
      style: 'diligent',
    },
    {
      name: 'Ehrenrunde VI',
      elements: ['oil'],
      goals: [tier(7)],
      board: `
        .   4 . 4 .
        4/o . . . 4/o
        .   3 . 3 .
        4   . . . 4
        .   4 . 4 .`,
      style: 'explosive',
    },
    {
      name: 'Bestellung im Riss',
      mask: RIFT_ROW,
      elements: ['toxic', 'fence'],
      counts: { toxic: 1, fences: 2 },
      toxicCountdown: 6,
      placement: 'any',
      goals: [deliver(5, 2)],
      startTiers: [J(4), J(3), 3, 2, 2, 1],
      style: 'diligent',
    },
    {
      name: 'Der Nebelberg',
      elements: ['toxic', 'scrapMound', 'line', 'oil'],
      specials: { lineAt: 3 },
      goals: [clearScrap, tier(6)],
      board: `
        .   .  . T7  .
        3   M6 m .   .
        2/o m  m .   .
        .   .  . 4   2/o
        T7  .  . .   3`,
      style: 'explosive',
    },
  ],
};

// ---- Zone 7 · w07 Kathedralenwald · 75 Luzz, dann Wooding · Rohrpaar (75), Nebel (80) ---------

const Z7: ZoneKit = {
  zone: 7,
  set: ['portal', 'fog', 'oil', 'rot'],
  ideas: [
    {
      name: 'Rohrpaar',
      grid: G(4, 4),
      elements: ['portal'],
      counts: { portals: 1 },
      placement: 'any',
      goals: [tier(5)],
      startTiers: [3, 2, 2, 1, 1],
      style: 'puzzle',
    },
    {
      name: 'Feuerrohr',
      grid: G(5, 4),
      elements: ['portal'],
      counts: { portals: 1 },
      placement: 'any',
      goals: [tier(6)],
      startTiers: [4, 3, 2, 2, 1, 1],
      style: 'puzzle',
    },
    {
      name: 'Feuer und Öl',
      grid: G(4, 4),
      elements: ['oil', 'rot'],
      counts: { oil: 2, rot: 1 },
      rotPeriod: 3,
      placement: 'any',
      goals: [clearRot],
      startTiers: [3, 2, 2, 1, 1],
      style: 'explosive',
    },
    {
      name: 'Funkenflug',
      grid: G(5, 5),
      elements: ['oil', 'scrap'],
      counts: { oil: 3, scrap: 4 },
      placement: 'any',
      goals: [clearScrap],
      startTiers: [3, 3, 2, 2, 1, 1],
      style: 'explosive',
    },
    {
      name: 'Brennende Rohre',
      grid: G(4, 4),
      elements: ['portal', 'rot', 'oil'],
      counts: { portals: 1, rot: 2, oil: 1 },
      rotPeriod: 2,
      placement: 'any',
      goals: [clearRot, tier(5)],
      startTiers: [3, 3, 2, 1],
      style: 'explosive',
    },
    {
      name: 'Nebel',
      grid: G(4, 4),
      elements: ['fog'],
      counts: { fog: 3 },
      fogTier: 2,
      placement: 'any',
      goals: [tier(5)],
      startTiers: [3, 2, 1, 1],
      style: 'journey',
    },
    {
      name: 'Nebelrohr',
      grid: G(5, 5),
      elements: ['fog', 'portal'],
      counts: { fog: 4, portals: 1 },
      fogTier: 2,
      placement: 'any',
      goals: [tier(6)],
      startTiers: [4, 3, 3, 2, 1, 1],
      style: 'puzzle',
    },
    {
      name: 'Nebelbrand',
      grid: G(4, 5),
      elements: ['fog', 'rot'],
      counts: { fog: 3, rot: 2 },
      fogTier: 2,
      rotPeriod: 4,
      placement: 'any',
      goals: [clearRot],
      startTiers: [3, 2, 2, 1],
      style: 'explosive',
    },
    {
      name: 'Nebeltor',
      grid: G(4, 5),
      elements: ['fog', 'portal'],
      counts: { fog: 3, portals: 1 },
      fogTier: 2,
      cap: 5,
      placement: 'any',
      goals: [release(2)],
      startTiers: [4, 3, 3, 2, 1],
      style: 'precise',
    },
    {
      name: 'Ehrenrunde VII',
      elements: ['portal'],
      goals: [tier(7)],
      board: `
        4  . @a . 4
        .  4 .  4 .
        3  . .  . 3
        .  4 .  4 .
        @a . 4  . .`,
      style: 'explosive',
    },
    {
      name: 'Rohrbrand',
      mask: CORNERS,
      elements: ['portal', 'rot'],
      counts: { portals: 1, rot: 1 },
      rotPeriod: 3,
      placement: 'any',
      goals: [clearRot, deliver(5, 1)],
      startTiers: [4, 3, 2, 2, 1],
      style: 'puzzle',
    },
    {
      name: 'Das Kirchenschiff',
      elements: ['portal', 'fog', 'oil', 'rot'],
      goals: [clearRot, tier(6)],
      board: `
        @a  .  2H . R4
        .   3  .  4 .
        o   .  4  . o
        .   4  .  3 .
        R4  .  2H . @a`,
      style: 'explosive',
    },
  ],
};

// ---- Zone 8 · w08 Rote Scheune · Wooding · Gasstrom (87), Streuner (92) ---------------------

const Z8: ZoneKit = {
  zone: 8,
  set: ['current', 'stray', 'crust', 'withered'],
  ideas: [
    {
      name: 'Gasstrom',
      grid: G(4, 4),
      elements: ['current'],
      currents: row(1, 0, 2, 'right'),
      goals: [tier(5)],
      startTiers: [3, 2, 2, 1, 1],
      style: 'journey',
    },
    {
      name: 'Strömung',
      grid: G(5, 4),
      elements: ['current'],
      counts: { currents: 3 },
      currentDir: 'down',
      placement: 'any',
      goals: [tier(6)],
      startTiers: [4, 3, 2, 2, 1, 1],
      style: 'journey',
    },
    {
      name: 'Krustenstrom',
      grid: G(4, 4),
      elements: ['current', 'crust'],
      currents: col(0, 0, 2, 'down'),
      counts: { crust: 2 },
      crustTier: 3,
      placement: 'any',
      goals: [tier(6)],
      startTiers: [3, 3, 2, 1],
      style: 'precise',
    },
    {
      name: 'Heilfeuer',
      grid: G(5, 5),
      elements: ['withered', 'burst'],
      counts: { withered: 6 },
      specials: { burstAt: 2 },
      placement: 'edge',
      goals: [heal],
      startTiers: [3, 3, 2, 2, 1, 1],
      style: 'explosive',
    },
    {
      name: 'Stromschnelle',
      grid: G(4, 4),
      elements: ['current', 'crust'],
      currents: row(1, 0, 2, 'right'),
      counts: { crust: 2 },
      crustTier: 3,
      cap: 5,
      placement: 'any',
      goals: [release(2)],
      startTiers: [4, 3, 2, 1],
      style: 'precise',
    },
    {
      name: 'Streuner',
      grid: G(4, 4),
      elements: ['stray'],
      counts: { strays: 1 },
      strayTier: 1,
      placement: 'any',
      goals: [calm(1), tier(5)],
      startTiers: [3, 2, 1, 1],
      style: 'puzzle',
    },
    {
      name: 'Streuner im Strom',
      grid: G(5, 5),
      elements: ['stray', 'current'],
      counts: { strays: 1, currents: 3 },
      currentDir: 'left',
      placement: 'any',
      goals: [calm(1), tier(6)],
      startTiers: [4, 3, 2, 2, 1, 1],
      style: 'puzzle',
    },
    {
      name: 'Dürrestrom',
      grid: G(4, 5),
      elements: ['withered', 'current'],
      counts: { withered: 4, currents: 2 },
      currentDir: 'up',
      placement: 'edge',
      goals: [heal],
      startTiers: [3, 2, 2, 1],
      style: 'diligent',
    },
    {
      name: 'Krustenstreuner',
      grid: G(5, 4),
      elements: ['stray', 'crust'],
      counts: { strays: 1, crust: 2 },
      crustTier: 3,
      placement: 'any',
      goals: [tier(6), calm(1)],
      startTiers: [4, 3, 3, 2, 1],
      style: 'puzzle',
    },
    {
      name: 'Ehrenrunde VIII',
      elements: ['withered'],
      goals: [heal, tier(7)],
      board: `
        w 3 . 3 w
        . . 5 . .
        . 4 . 4 .
        . . 5 . .
        w 3 . 3 w`,
      style: 'explosive',
    },
    {
      name: 'Verdorrte Kruste',
      mask: DIAG,
      elements: ['withered', 'crust'],
      counts: { withered: 4, crust: 2 },
      crustTier: 2,
      placement: 'edge',
      goals: [heal],
      startTiers: [3, 3, 2, 1],
      style: 'diligent',
    },
    {
      name: 'Die Scheune brennt',
      elements: ['current', 'stray', 'crust', 'withered'],
      goals: [heal, calm(1)],
      board: `
        w   .  . .  w
        >   >  > >  .
        .   3F . 1W .
        .   .  4 .  .
        w   .  . 3F w`,
      style: 'puzzle',
    },
  ],
};

// ---- Zone 9 · w01 Flechtenbaum (Riesenbaum, 16) · Wooding · keine neuen Arten -----------------

const Z9: ZoneKit = {
  zone: 9,
  set: ['withered', 'deepWithered', 'pillar', 'oil'],
  ideas: [
    {
      name: 'Lichtung',
      grid: G(5, 5),
      elements: ['withered', 'pillar'],
      counts: { withered: 5, pillars: 1 },
      placement: 'edge',
      goals: [heal],
      startTiers: [4, 3, 3, 2, 2, 1, 1],
      style: 'journey',
    },
    {
      name: 'Tiefe Wurzeln',
      grid: G(4, 4),
      elements: ['withered', 'deepWithered'],
      counts: { withered: 3, deepWithered: 1 },
      placement: 'edge',
      goals: [heal],
      startTiers: [3, 2, 2, 1],
      style: 'diligent',
    },
    {
      name: 'Ölwurzeln',
      grid: G(4, 5),
      elements: ['oil', 'withered'],
      counts: { oil: 2, withered: 3 },
      placement: 'any',
      goals: [heal],
      startTiers: [3, 2, 2, 1, 1],
      style: 'puzzle',
    },
    {
      name: 'Ehrenrunde IX',
      elements: ['oil'],
      goals: [score(400)],
      board: `
        4 . o . 4
        . 3 . 3 .
        o . 5 . o
        . 3 . 3 .
        4 . o . 4`,
      style: 'explosive',
    },
    {
      name: 'Dornen',
      grid: G(4, 4),
      elements: ['deepWithered', 'pillar'],
      counts: { deepWithered: 2, pillars: 1 },
      placement: 'interior',
      goals: [heal],
      startTiers: [3, 2, 2, 1],
      style: 'precise',
    },
    {
      name: 'Atempause',
      grid: G(4, 4),
      elements: [],
      goals: [tier(5)],
      startTiers: [3, 3, 2, 1, 1],
      style: 'journey',
    },
    {
      name: 'Brennholz',
      grid: G(5, 5),
      elements: ['oil', 'deepWithered'],
      counts: { oil: 3, deepWithered: 2 },
      placement: 'any',
      goals: [heal],
      startTiers: [3, 3, 2, 2, 1],
      style: 'explosive',
    },
    {
      name: 'Pfeilerhain',
      mask: MONO,
      elements: ['pillar', 'withered'],
      counts: { withered: 4 },
      placement: 'edge',
      goals: [heal, tier(5)],
      startTiers: [3, 3, 2, 2, 1],
      style: 'diligent',
    },
    {
      name: 'Ölwald',
      grid: G(4, 4),
      elements: ['oil', 'pillar'],
      counts: { oil: 2, pillars: 1 },
      cap: 5,
      placement: 'any',
      goals: [release(2)],
      startTiers: [4, 3, 2, 2, 1],
      style: 'precise',
    },
    {
      name: 'Sporenregen',
      grid: G(5, 5),
      elements: ['spore', 'burst'],
      counts: { spores: 5 },
      specials: { burstAt: 2 },
      placement: 'any',
      goals: [spores(4)],
      startTiers: [3, 3, 2, 2, 1, 1],
      style: 'explosive',
    },
    {
      name: 'Dickicht',
      grid: G(4, 5),
      elements: ['withered', 'deepWithered', 'pillar'],
      counts: { withered: 3, deepWithered: 1, pillars: 1 },
      placement: 'edge',
      goals: [heal],
      startTiers: [3, 3, 2, 1],
      style: 'diligent',
    },
    {
      name: 'Wurzelbrand',
      grid: G(5, 4),
      elements: ['oil', 'pillar'],
      counts: { oil: 3, pillars: 1 },
      placement: 'any',
      goals: [deliver(5, 2)],
      startTiers: [3, 3, 2, 2, 1],
      style: 'diligent',
    },
    {
      name: 'Der Riesenbaum',
      elements: ['pillar'],
      goals: [tier(7)],
      board: `
        3 . 3 . 3
        . 4 . 4 .
        3 . P . 3
        . 4 . 4 .
        3 . 3 . 3`,
      style: 'precise',
    },
    {
      name: 'Kronendach',
      elements: ['withered', 'pillar'],
      goals: [heal, tier(7)],
      board: `
        .   w . w   .
        5   . . .   5
        .   . P .   .
        4   . . .   4
        .   w . w   .`,
      style: 'journey',
    },
    {
      name: 'Wurzelquelle',
      mask: VENT_C,
      elements: ['pillar', 'deepWithered'],
      counts: { deepWithered: 3 },
      placement: 'edge',
      spawn: { sources: [[2, 2]] },
      goals: [heal],
      startTiers: [3, 3, 2, 1],
      style: 'diligent',
    },
    {
      name: 'Der Aufzug hinab',
      elements: ['withered', 'deepWithered', 'pillar', 'oil'],
      goals: [heal, tier(6)],
      board: `
        w  .  3  .  w
        .  4  .  3  .
        d  .  P  .  o
        .  3  .  4  .
        w  .  3  .  w`,
      style: 'explosive',
    },
  ],
};

// ---- Zone 10 · w03 Kuppelbaum (10) · Wooding -------------------------------------------------

const Z10: ZoneKit = {
  zone: 10,
  set: ['cage', 'rot', 'fence', 'scrap'],
  ideas: [
    {
      name: 'Funkenkuppel',
      grid: G(5, 5),
      elements: ['scrap', 'burst'],
      counts: { scrap: 5 },
      specials: { burstAt: 2 },
      placement: 'any',
      goals: [clearScrap],
      startTiers: [3, 3, 2, 2, 1, 1],
      style: 'explosive',
    },
    {
      name: 'Kuppelkäfig',
      grid: G(4, 4),
      elements: ['cage'],
      counts: { cages: 1 },
      cageLayers: 2,
      placement: 'interior',
      goals: [rescue(1)],
      startTiers: [3, 2, 2, 1],
      style: 'precise',
    },
    {
      name: 'Zaungast',
      grid: G(5, 4),
      elements: ['cage', 'fence'],
      counts: { cages: 1, fences: 2 },
      placement: 'any',
      goals: [rescue(1), tier(5)],
      startTiers: [3, 2, 2, 1, 1],
      style: 'puzzle',
    },
    {
      name: 'Brennender Käfig',
      grid: G(4, 4),
      elements: ['cage', 'rot'],
      counts: { cages: 2, rot: 1 },
      rotPeriod: 3,
      placement: 'any',
      goals: [rescue(2)],
      startTiers: [3, 3, 2, 1],
      style: 'precise',
    },
    {
      name: 'Unter der Kuppel',
      grid: G(4, 5),
      elements: ['fence'],
      counts: { fences: 2 },
      goals: [tier(6)],
      startTiers: [4, 3, 2, 2, 1],
      style: 'journey',
    },
    {
      name: 'Schrottzaun',
      grid: G(5, 5),
      elements: ['scrap', 'fence'],
      counts: { scrap: 3, fences: 2 },
      scrapLayers: 2,
      placement: 'any',
      goals: [clearScrap],
      startTiers: [3, 3, 2, 2, 1],
      style: 'diligent',
    },
    {
      name: 'Faule Käfige',
      mask: CORNERS,
      elements: ['cage', 'rot'],
      counts: { cages: 1, rot: 2 },
      rotPeriod: 4,
      placement: 'any',
      goals: [clearRot, rescue(1)],
      startTiers: [3, 3, 2, 1],
      style: 'explosive',
    },
    {
      name: 'Ehrenrunde X',
      elements: ['scrap'],
      goals: [clearScrap, tier(7)],
      board: `
        X1 . . . X1
        .  5 . 5 .
        .  . . . .
        .  4 . 4 .
        X1 . . . X1`,
      style: 'explosive',
    },
    {
      name: 'Gitterwerk',
      grid: G(4, 4),
      elements: ['fence', 'scrap', 'rot'],
      counts: { fences: 2, scrap: 2, rot: 1 },
      rotPeriod: 4,
      placement: 'any',
      goals: [clearScrap],
      startTiers: [3, 2, 2, 1],
      style: 'diligent',
    },
    {
      name: 'Die Kuppel',
      elements: ['cage', 'rot', 'fence', 'scrap'],
      fences: [
        { a: [1, 2], b: [2, 2] },
        { a: [2, 2], b: [3, 2] },
      ],
      goals: [rescue(2), clearScrap],
      board: `
        X2 . .  . X2
        .  . 2C . .
        .  4 .  4 .
        .  . 2C . .
        R3 . .  . R3`,
      style: 'precise',
    },
  ],
};

// ---- Zone 11 · w11 Nebelweide · Luzz ---------------------------------------------------------

const Z11: ZoneKit = {
  zone: 11,
  set: ['fog', 'sleeper', 'spore', 'toxic'],
  ideas: [
    {
      name: 'Nebelweide',
      grid: G(5, 5),
      elements: ['spore', 'fog'],
      counts: { spores: 5, fog: 3 },
      fogTier: 2,
      placement: 'any',
      goals: [spores(4)],
      startTiers: [3, 3, 2, 2, 1, 1],
      style: 'journey',
    },
    {
      name: 'Sporen im Gras',
      grid: G(4, 4),
      elements: ['spore'],
      counts: { spores: 3 },
      placement: 'edge',
      goals: [spores(3)],
      startTiers: [3, 2, 2, 1],
      style: 'journey',
    },
    {
      name: 'Schlafende Sporen',
      grid: G(4, 5),
      elements: ['sleeper', 'spore'],
      counts: { sleepers: 2, spores: 3 },
      sleeperTier: 2,
      placement: 'any',
      goals: [spores(3)],
      startTiers: [3, 2, 2, 1],
      style: 'precise',
    },
    {
      name: 'Ehrenrunde XI',
      elements: ['fog'],
      goals: [tier(7)],
      board: `
        4H . 3 . 3
        .  . . . .
        3  . 4 . 3
        .  . . . .
        3  . 3 . 4H`,
      style: 'journey',
    },
    {
      name: 'Giftnebel',
      grid: G(4, 4),
      elements: ['fog', 'toxic'],
      counts: { fog: 3, toxic: 1 },
      fogTier: 2,
      toxicCountdown: 5,
      cap: 5,
      placement: 'any',
      goals: [release(2)],
      startTiers: [4, 3, 2, 1],
      style: 'precise',
    },
    {
      name: 'Weidegang',
      mask: RIFT_COL,
      elements: [],
      goals: [tier(6)],
      startTiers: [4, J(3), 3, 2, 1, 1],
      style: 'journey',
    },
    {
      name: 'Schlafgift',
      grid: G(5, 5),
      elements: ['sleeper', 'toxic'],
      counts: { sleepers: 2, toxic: 1 },
      sleeperTier: 2,
      toxicCountdown: 6,
      placement: 'any',
      goals: [tier(6)],
      startTiers: [4, 3, 2, 2, 1],
      style: 'precise',
    },
    {
      name: 'Nebelsporen',
      grid: G(4, 5),
      elements: ['fog', 'spore', 'pillar'],
      counts: { fog: 3, spores: 3, pillars: 1 },
      fogTier: 2,
      placement: 'any',
      goals: [spores(3)],
      startTiers: [3, 2, 2, 1],
      style: 'puzzle',
    },
    {
      name: 'Tiefer Schlaf',
      grid: G(4, 4),
      elements: ['sleeper', 'fog'],
      counts: { sleepers: 2, fog: 2 },
      sleeperTier: 3,
      fogTier: 2,
      cap: 5,
      placement: 'any',
      goals: [release(2)],
      startTiers: [4, 3, 2, 1],
      style: 'precise',
    },
    {
      name: 'Sporenfest',
      grid: G(5, 5),
      elements: ['spore', 'line'],
      counts: { spores: 6 },
      specials: { lineAt: 2 },
      placement: 'any',
      goals: [spores(5)],
      startTiers: [3, 3, 2, 2, 1, 1],
      style: 'explosive',
    },
    {
      name: 'Giftsporen',
      mask: HOLE_C,
      elements: ['spore', 'toxic', 'sleeper'],
      counts: { spores: 4, toxic: 1, sleepers: 1 },
      toxicCountdown: 6,
      sleeperTier: 2,
      placement: 'any',
      goals: [spores(4)],
      startTiers: [3, 3, 2, 1],
      style: 'diligent',
    },
    {
      name: 'Der Nebelhirte',
      elements: ['fog', 'sleeper', 'spore', 'toxic'],
      goals: [spores(3), tier(6)],
      board: `
        .   s  .  2H .
        2S  .  .  .  T7
        s   .  4  .  s
        T7  .  .  .  2S
        .   3H .  .  .`,
      style: 'precise',
    },
  ],
};

// ---- Zone 12 · w12 Goldnebelhang · Wooding --------------------------------------------------

const Z12: ZoneKit = {
  zone: 12,
  set: ['crust', 'oil', 'stray', 'line'],
  ideas: [
    {
      name: 'Goldfeuer',
      grid: G(5, 5),
      elements: ['oil', 'crust'],
      counts: { oil: 3, crust: 2 },
      crustTier: 3,
      placement: 'any',
      goals: [tier(6)],
      startTiers: [4, 3, 3, 2, 2, 1, 1],
      style: 'explosive',
    },
    {
      name: 'Krustenhang',
      grid: G(4, 4),
      elements: ['crust'],
      counts: { crust: 2 },
      crustTier: 3,
      placement: 'any',
      goals: [tier(5)],
      startTiers: [3, 2, 1, 1],
      style: 'precise',
    },
    {
      name: 'Streuner am Hang',
      grid: G(4, 5),
      elements: ['stray', 'oil'],
      counts: { strays: 1, oil: 2 },
      placement: 'any',
      goals: [calm(1), tier(5)],
      startTiers: [3, 2, 2, 1],
      style: 'puzzle',
    },
    {
      name: 'Ehrenrunde XII',
      elements: ['scrap', 'line'],
      specials: { lineAt: 2 },
      goals: [clearScrap],
      board: `
        X2 .  . . X2
        .  3  . 3 .
        .  .  . . .
        .  2  . 2 .
        X2 .  . . X2`,
      style: 'explosive',
    },
    {
      name: 'Krustenstrahl',
      grid: G(5, 5),
      elements: ['crust', 'line'],
      counts: { crust: 3 },
      crustTier: 3,
      specials: { lineAt: 3 },
      placement: 'interior',
      goals: [deliver(5, 2)],
      startTiers: [4, 3, 3, 2, 1],
      style: 'precise',
    },
    {
      name: 'Hangpause',
      grid: G(4, 4),
      mask: C44,
      elements: [],
      goals: [tier(5)],
      startTiers: [3, 2, 2, 1],
      style: 'journey',
    },
    {
      name: 'Goldstreuner',
      grid: G(5, 5),
      elements: ['stray', 'crust'],
      counts: { strays: 1, crust: 2 },
      crustTier: 2,
      placement: 'any',
      goals: [calm(1), tier(5)],
      startTiers: [3, 3, 2, 2, 1],
      style: 'puzzle',
    },
    {
      name: 'Goldkruste',
      grid: G(5, 4),
      elements: ['crust', 'oil'],
      counts: { crust: 2, oil: 2 },
      crustTier: 3,
      placement: 'any',
      goals: [deliver(5, 2)],
      startTiers: [3, 3, 2, 1],
      style: 'diligent',
    },
    {
      name: 'Wilder Hang',
      grid: G(4, 4),
      elements: ['stray', 'crust'],
      counts: { strays: 1, crust: 1 },
      crustTier: 3,
      cap: 5,
      placement: 'any',
      goals: [release(1), calm(1)],
      startTiers: [4, 3, 2, 1],
      style: 'puzzle',
    },
    {
      name: 'Strahlenhang',
      grid: G(5, 5),
      elements: ['line', 'scrap'],
      counts: { scrap: 5 },
      scrapLayers: 1,
      specials: { lineAt: 2 },
      placement: 'interior',
      goals: [clearScrap],
      startTiers: [3, 3, 2, 2, 1, 1],
      style: 'explosive',
    },
    {
      name: 'Brandkruste',
      mask: DIAG,
      elements: ['crust', 'oil', 'stray'],
      counts: { crust: 2, oil: 1, strays: 1 },
      crustTier: 3,
      placement: 'any',
      goals: [calm(1), tier(5)],
      startTiers: [4, 3, 2, 1],
      style: 'puzzle',
    },
    {
      name: 'Der goldene Grat',
      elements: ['crust', 'oil', 'stray', 'line'],
      specials: { lineAt: 3 },
      goals: [calm(1), tier(7)],
      board: `
        3F  .  .  .  o
        .   5  .  .  .
        .   .  1W .  .
        .   .  .  5  .
        o   .  .  .  3F`,
      style: 'puzzle',
    },
  ],
};

// ---- Zone 13 · w13 Roter Monolith · Syrup ----------------------------------------------------

const Z13: ZoneKit = {
  zone: 13,
  set: ['cage', 'scrap', 'burst', 'pillar'],
  ideas: [
    {
      name: 'Monolithfest',
      mask: VENT_C,
      elements: ['pillar', 'burst', 'scrap'],
      counts: { scrap: 4 },
      specials: { burstAt: 2 },
      placement: 'interior',
      spawn: { sources: [[2, 2]] },
      goals: [clearScrap],
      startTiers: [3, 3, 2, 2, 1, 1],
      style: 'explosive',
    },
    {
      name: 'Rotes Gitter',
      grid: G(4, 5),
      elements: ['cage'],
      counts: { cages: 2 },
      cageLayers: 1,
      placement: 'edge',
      goals: [rescue(2)],
      startTiers: [3, 2, 2, 1],
      style: 'precise',
    },
    {
      name: 'Schrott am Fels',
      grid: G(4, 5),
      elements: ['scrap', 'pillar'],
      counts: { scrap: 3, pillars: 1 },
      scrapLayers: 2,
      placement: 'any',
      goals: [clearScrap],
      startTiers: [3, 3, 2, 1],
      style: 'diligent',
    },
    {
      name: 'Ehrenrunde XIII',
      elements: ['cage'],
      goals: [rescue(2), tier(7)],
      board: `
        .  5  . 5  .
        .  .  . .  .
        2C .  . .  2C
        .  .  . .  .
        .  4  . 4  .`,
      style: 'explosive',
    },
    {
      name: 'Felsenkäfig',
      grid: G(4, 4),
      elements: ['cage', 'pillar'],
      counts: { cages: 2, pillars: 1 },
      cageLayers: 2,
      placement: 'any',
      goals: [rescue(2)],
      startTiers: [3, 3, 2, 1],
      style: 'precise',
    },
    {
      name: 'Rast am Fels',
      mask: VENT_S,
      elements: ['pillar'],
      spawn: {
        sources: [
          [0, 2],
          [4, 2],
        ],
      },
      goals: [tier(6)],
      startTiers: [4, 3, 3, 2, 1, 1],
      style: 'journey',
    },
    {
      name: 'Knallkäfig',
      grid: G(5, 5),
      elements: ['cage', 'burst'],
      counts: { cages: 2 },
      cageLayers: 1,
      specials: { burstAt: 2 },
      placement: 'interior',
      goals: [rescue(2)],
      startTiers: [3, 3, 2, 2, 1],
      style: 'explosive',
    },
    {
      name: 'Sirupschrott',
      grid: G(5, 4),
      elements: ['scrap', 'oil'],
      counts: { scrap: 3, oil: 2 },
      scrapLayers: 1,
      placement: 'any',
      goals: [clearScrap],
      startTiers: [J(3), J(2), 3, 2, 1],
      style: 'diligent',
    },
    {
      name: 'Steilwand',
      grid: G(4, 4),
      elements: ['scrap', 'burst', 'pillar'],
      counts: { scrap: 2, pillars: 1 },
      scrapLayers: 2,
      specials: { burstAt: 3 },
      placement: 'interior',
      goals: [clearScrap],
      startTiers: [3, 3, 2, 1],
      style: 'explosive',
    },
    {
      name: 'Sirupblüte',
      grid: G(5, 5),
      elements: ['withered', 'burst'],
      counts: { withered: 6 },
      specials: { burstAt: 2 },
      placement: 'edge',
      goals: [heal],
      startTiers: [3, 3, 3, 2, 2, 1],
      style: 'explosive',
    },
    {
      name: 'Der Aufzug',
      mask: MONO,
      elements: ['pillar', 'cage', 'scrap'],
      counts: { cages: 1, scrap: 2 },
      scrapLayers: 2,
      cageLayers: 1,
      placement: 'any',
      goals: [rescue(1), clearScrap],
      startTiers: [3, 3, 2, 1],
      style: 'diligent',
    },
    {
      name: 'Monolith-Gipfel',
      elements: ['cage', 'scrap', 'burst', 'pillar'],
      specials: { burstAt: 3 },
      goals: [rescue(2), clearScrap],
      board: `
        X2  .  .  .  X2
        .   3  P  3  .
        2C  .  P  .  2C
        .   4  .  .  .
        X2  .  .  .  X2`,
      style: 'explosive',
    },
  ],
};

// ---- Zone 14 · w14 Stille Bucht · Luzz -------------------------------------------------------

const Z14: ZoneKit = {
  zone: 14,
  set: ['current', 'portal', 'sleeper', 'amoeba'],
  ideas: [
    {
      name: 'Stille Bucht',
      mask: BAY,
      elements: ['current'],
      currents: row(2, 0, 3, 'right'),
      goals: [tier(7)],
      startTiers: [5, 4, 3, 3, 2, 2, 1],
      style: 'journey',
    },
    {
      name: 'Buchtamöbe',
      grid: G(4, 4),
      elements: ['amoeba'],
      spawn: { amoeba: 1 },
      goals: [tier(6)],
      startTiers: [3, 3, 2, 1],
      style: 'journey',
    },
    {
      name: 'Rohrbucht',
      grid: G(4, 5),
      elements: ['portal', 'amoeba'],
      counts: { portals: 1 },
      spawn: { amoeba: 1 },
      placement: 'any',
      goals: [tier(6)],
      startTiers: [3, 3, 2, 1],
      style: 'puzzle',
    },
    {
      name: 'Ehrenrunde XIV',
      elements: ['amoeba'],
      spawn: { amoeba: 1 },
      goals: [tier(8)],
      board: `
        6 . . . 5
        . . . . .
        . . A . .
        . . . . .
        5 . . . 6`,
      style: 'explosive',
    },
    {
      name: 'Schlafströmung',
      grid: G(4, 4),
      elements: ['current', 'sleeper'],
      currents: col(3, 0, 2, 'down'),
      counts: { sleepers: 2 },
      sleeperTier: 3,
      cap: 5,
      placement: 'any',
      goals: [release(2)],
      startTiers: [4, 3, 2, 1],
      style: 'precise',
    },
    {
      name: 'Ebbe',
      grid: G(5, 4),
      elements: [],
      goals: [tier(6)],
      startTiers: [4, 3, 2, 2, 1],
      style: 'journey',
    },
    {
      name: 'Strom und Rohr',
      grid: G(5, 5),
      elements: ['current', 'portal'],
      counts: { currents: 3, portals: 1 },
      currentDir: 'right',
      placement: 'any',
      goals: [deliver(5, 2)],
      startTiers: [3, 3, 2, 2, 1],
      style: 'diligent',
    },
    {
      name: 'Schlafende Bucht',
      grid: G(4, 5),
      elements: ['sleeper', 'amoeba'],
      counts: { sleepers: 2 },
      sleeperTier: 3,
      spawn: { amoeba: 1 },
      placement: 'any',
      goals: [tier(6)],
      startTiers: [3, 3, 2, 1],
      style: 'precise',
    },
    {
      name: 'Gezeiten',
      grid: G(5, 5),
      elements: ['portal', 'current'],
      counts: { portals: 1, currents: 2 },
      currentDir: 'up',
      placement: 'any',
      goals: [tier(7)],
      startTiers: [4, 4, 3, 3, 3, 2, 2],
      style: 'puzzle',
    },
    {
      name: 'Bootsfest',
      grid: G(5, 5),
      elements: ['amoeba', 'burst'],
      spawn: { amoeba: 1 },
      specials: { burstAt: 2 },
      goals: [score(400)],
      startTiers: [3, 3, 2, 2, 1, 1],
      style: 'explosive',
    },
    {
      name: 'Rohre im Schlaf',
      mask: CORNERS,
      elements: ['portal', 'sleeper'],
      counts: { portals: 1, sleepers: 2 },
      sleeperTier: 2,
      placement: 'any',
      goals: [deliver(5, 2)],
      startTiers: [3, 3, 2, 1],
      style: 'puzzle',
    },
    {
      name: 'Die Bucht',
      elements: ['current', 'portal', 'sleeper', 'amoeba'],
      spawn: { amoeba: 1 },
      goals: [tier(7)],
      board: `
        @a  .  .  .  2S
        .   4  .  .  .
        >   >  >  >  .
        .   .  .  4  .
        2S  .  A  .  @a`,
      style: 'puzzle',
    },
  ],
};

// ---- Zone 15 · w15 Blaue Terrassen · Luzz ----------------------------------------------------

const Z15: ZoneKit = {
  zone: 15,
  set: ['scrapMound', 'toxic', 'cage', 'line'],
  ideas: [
    {
      name: 'Blaue Terrassen',
      mask: TERRACE,
      elements: ['cage', 'line'],
      counts: { cages: 2 },
      cageLayers: 1,
      specials: { lineAt: 2 },
      placement: 'any',
      goals: [rescue(2)],
      startTiers: [3, 3, 2, 2, 1],
      style: 'explosive',
    },
    {
      name: 'Terrassenkäfig',
      grid: G(5, 4),
      elements: ['cage'],
      counts: { cages: 2 },
      cageLayers: 1,
      placement: 'any',
      goals: [rescue(2)],
      startTiers: [3, 2, 2, 1],
      style: 'precise',
    },
    {
      name: 'Giftterrasse',
      grid: G(4, 5),
      elements: ['toxic', 'cage'],
      counts: { toxic: 1, cages: 1 },
      toxicCountdown: 6,
      placement: 'any',
      goals: [rescue(1), tier(5)],
      startTiers: [3, 2, 2, 1],
      style: 'precise',
    },
    {
      name: 'Ehrenrunde XV',
      elements: ['scrapMound'],
      goals: [clearScrap, tier(7)],
      board: `
        5  .  .  .  5
        .  M4 m  .  .
        .  m  m  .  .
        .  .  .  4  .
        4  .  .  .  .`,
      style: 'explosive',
    },
    {
      name: 'Steile Stufen',
      grid: G(4, 4),
      elements: ['toxic', 'line', 'scrap'],
      counts: { toxic: 1, scrap: 2 },
      scrapLayers: 2,
      toxicCountdown: 5,
      specials: { lineAt: 3 },
      placement: 'interior',
      goals: [clearScrap],
      startTiers: [3, 3, 2, 1],
      style: 'explosive',
    },
    {
      name: 'Nebelband',
      mask: RIFT_ROW,
      elements: [],
      goals: [tier(6)],
      startTiers: [4, J(3), 3, 2, 1],
      style: 'journey',
    },
    {
      name: 'Bergschrott',
      grid: G(5, 5),
      elements: ['scrapMound', 'toxic'],
      counts: { mounds: 1, toxic: 2 },
      moundLayers: 6,
      toxicCountdown: 7,
      placement: 'any',
      goals: [clearScrap, tier(6)],
      startTiers: [3, 3, 2, 2, 1],
      style: 'diligent',
    },
    {
      name: 'Käfigstufen',
      mask: TERRACE,
      elements: ['cage', 'toxic'],
      counts: { cages: 2, toxic: 1 },
      cageLayers: 1,
      toxicCountdown: 6,
      placement: 'any',
      goals: [rescue(2)],
      startTiers: [3, 3, 2, 1],
      style: 'precise',
    },
    {
      name: 'Kletterpartie',
      grid: G(4, 4),
      elements: ['cage', 'line'],
      counts: { cages: 2 },
      cageLayers: 2,
      specials: { lineAt: 3 },
      placement: 'any',
      goals: [rescue(2)],
      startTiers: [3, 3, 2, 1],
      style: 'precise',
    },
    {
      name: 'Gipfelfest',
      grid: G(5, 5),
      elements: ['scrapMound', 'line'],
      counts: { mounds: 1 },
      moundLayers: 4,
      specials: { lineAt: 2 },
      placement: 'any',
      goals: [clearScrap],
      startTiers: [3, 3, 2, 2, 1, 1],
      style: 'explosive',
    },
    {
      name: 'Letzte Terrasse',
      mask: CORNERS,
      elements: ['toxic', 'scrapMound', 'cage'],
      counts: { toxic: 1, mounds: 1, cages: 1 },
      moundLayers: 4,
      toxicCountdown: 6,
      placement: 'any',
      goals: [clearScrap, rescue(1)],
      startTiers: [3, 3, 2, 1],
      style: 'diligent',
    },
    {
      name: 'Die Klippe',
      elements: ['scrapMound', 'toxic', 'cage', 'line'],
      specials: { lineAt: 3 },
      goals: [clearScrap, rescue(1), tier(6)],
      board: `
        T6  .  .  .  .
        .   M6 m  .  3
        .   m  m  .  .
        2C  .  .  4  .
        .   3  .  .  T6`,
      style: 'precise',
    },
  ],
};

export const ZONE_KITS: readonly ZoneKit[] = [Z5, Z6, Z7, Z8, Z9, Z10, Z11, Z12, Z13, Z14, Z15];

/** Story-Zone (Dateizone, Material) je Levelnummer 51–184. */
export function storyZone(index: number): ZoneId {
  if (index <= 75) return 'luzz';
  if (index <= 124) return 'wooding';
  if (index <= 136) return 'luzz';
  if (index <= 148) return 'wooding';
  if (index <= 160) return 'syrup';
  return 'luzz';
}
