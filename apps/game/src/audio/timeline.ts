import { GULL_SETTLE_S, gullDropFor, gullTimes, type Blob, type Coord, type GullDrop, type GullTimes, type LevelState, type MergeEvent, type MoveResult } from '@ee/core';
import type { CreatureGuess } from './bodies';
import type { BodyKind, Material, SfxId, SfxParams, SwipeDir } from './sfx';
import type { ZoneKey } from './scales';

/**
 * A move's events → a list of timed sounds that land on the board's visual beats. The timing model mirrors
 * the board timeline (packages/render/src/board/BoardTimeline.ts + boardMoves.ts): every creature travels
 * at its own pace (base + per cell by body type, slower from tier 8), merging movers stop short and then
 * play their body's merge move (splash / leap to the camera / coil / stomp) whose contact is the impact;
 * side effects follow the landing, dynamics start after the impacts, graduation after the merges, spawns
 * near the end. Simultaneous merges are staggered into a rising arpeggio and capped, so a big combo sounds
 * like music rather than a pile-up.
 */

export interface PlannedSound {
  /** Seconds after the move started. */
  t: number;
  id: SfxId;
  p: SfxParams;
  prio: number;
}

export interface MovePlan {
  sounds: PlannedSound[];
  won: boolean;
  lost: boolean;
  /** When the win/lose stinger plays (s after the move started). */
  endAt: number;
  maxTier: number;
  merges: number;
  /** Highest merge impact time (s), for chirps after big merges. */
  bigMergeAt: number | null;
  /** The gull's drop lands ("Flatsch", s after the move started): the haptics tap here. Null without a gull. */
  gullAt: number | null;
}

export interface PlanContext {
  zone: ZoneKey;
  /** The state before the move (tiers, materials and kinds of the moving blobs). */
  prev: LevelState | null;
  /** Creature archetype of a blob (timing and footsteps). */
  guess: (tier: number, id: number, kind: string, material: Material) => CreatureGuess;
}

/** [base s, s per cell] by body type — BoardTimeline `TRAVEL`. */
const TRAVEL: Readonly<Record<BodyKind, readonly [number, number]>> = {
  blob: [0.15, 0.09],
  quadruped: [0.15, 0.085],
  biped: [0.17, 0.09],
  snake: [0.17, 0.095],
  heavy: [0.22, 0.12],
};

/** BoardTimeline `STOP_SHORT`: fraction of a cell a merging mover stops before its partner. */
const STOP_SHORT: Readonly<Record<BodyKind, number>> = { blob: 0.45, quadruped: 0.62, biped: 0.62, snake: 0.7, heavy: 0.55 };

export type MergeStyle = 'splash' | 'leap' | 'coil' | 'stomp';

/** boardMoves `SEGMENTS`: anticipation → launch, launch → contact, contact → swallow (s). */
const SEGMENTS: Readonly<Record<MergeStyle, readonly [number, number, number]>> = {
  splash: [0.07, 0.13, 0.22],
  leap: [0.11, 0.42, 0.22],
  coil: [0.14, 0.3, 0.34],
  stomp: [0.17, 0.09, 0.18],
};

export function mergeStyleOf(body: BodyKind): MergeStyle {
  switch (body) {
    case 'snake':
      return 'coil';
    case 'heavy':
      return 'stomp';
    case 'quadruped':
    case 'biped':
      return 'leap';
    default:
      return 'splash';
  }
}

export function travelTime(body: BodyKind, cells: number, tier: number): number {
  const [base, per] = TRAVEL[body];
  return (base + per * Math.max(0, cells)) * (tier >= 8 ? 1.1 : 1);
}

/** Caps per sound in one move; beyond the cap sounds fold into the last one (count++, a little louder). */
const CAP: Partial<Record<SfxId, number>> = {
  stop: 3,
  merge: 4,
  splash: 3,
  childPop: 3,
  popOut: 4,
  heal: 3,
  healStep: 2,
  collect: 3,
  scrap: 3,
  mound: 2,
  crustCrack: 2,
  cage: 3,
  fogLift: 2,
  rotSquelch: 2,
  rotGrow: 2,
  oilGlug: 2,
  toxicTick: 2,
  freeze: 2,
  push: 2,
  strayMove: 2,
  strayCalm: 2,
  spawn: 2,
  goalDone: 1,
  release: 2,
  deliver: 2,
  wake: 2,
  leapUp: 2,
  creatureVoice: 2,
  diveWhoosh: 2,
  bite: 2,
  chew: 2,
  coil: 2,
  gulp: 2,
  stompRear: 2,
  stomp: 2,
};

const adjacent = (a: Coord, b: Coord): boolean => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1;

interface MoveInfo {
  arrive: number;
  body: BodyKind;
  tier: number;
  material: Material;
  cells: number;
}

/** Plans the sounds of one move. Pure: no audio, no DOM (unit-tested). */
export function planMove(res: MoveResult<LevelState>, ctx: PlanContext): MovePlan {
  const sounds: PlannedSound[] = [];
  const w = res.state.geo.w;
  const pan = (c: Coord): number => Math.max(-0.6, Math.min(0.6, ((c[0] + 0.5) / Math.max(1, w) - 0.5) * 1.2));
  const cellKey = (c: Coord): number => c[1] * w + c[0];
  const zone = ctx.zone;
  const prevBlobs = new Map<number, Blob>();
  for (const b of ctx.prev?.cells ?? []) if (b) prevBlobs.set(b.id, b);
  const add = (t: number, id: SfxId, p: SfxParams, prio = 1): void => {
    sounds.push({ t: Math.max(0, t), id, p: { zone, ...p }, prio });
  };

  let tEnd = 0;
  const mark = (t: number): void => {
    tEnd = Math.max(tEnd, t);
  };

  const mergeOf = new Map<number, MergeEvent>();
  for (const e of res.events) if (e.type === 'merge') mergeOf.set(e.ids[1], e);

  // ------------------------------------------------------------ slides
  const moves = new Map<number, MoveInfo>();
  const landAt = new Map<number, number>();
  let slideEnd = 0;
  let maxCells = 0;
  let sliders = 0;
  const dir: SwipeDir = res.dir;
  const stops: Array<{ t: number; p: SfxParams }> = [];
  for (const e of res.events) {
    if (e.type !== 'slide') continue;
    const b = prevBlobs.get(e.id);
    const tier = b?.tier ?? 1;
    const material = (b?.material ?? 'jelly') as Material;
    const guess = ctx.guess(tier, e.id, b?.kind ?? 'normal', material);
    const body = guess.body;
    const merging = mergeOf.has(e.id);
    // Runs split at teleports (portals add 0.2 s each).
    const runs: number[] = [];
    let n = 0;
    let prev = e.from;
    for (const c of e.path) {
      if (!adjacent(prev, c)) {
        runs.push(n);
        n = 0;
      } else n++;
      prev = c;
    }
    runs.push(n);
    let t = body === 'blob' ? 0.055 : 0.05;
    let total = 0;
    runs.forEach((cellsInRun, ri) => {
      let cells = cellsInRun;
      total += cellsInRun;
      if (ri === runs.length - 1 && merging) cells -= Math.min(STOP_SHORT[body], cells - 0.05);
      t += travelTime(body, cells, tier);
      if (ri < runs.length - 1) t += 0.2;
    });
    moves.set(e.id, { arrive: t, body, tier, material, cells: total });
    if (!merging) {
      landAt.set(cellKey(e.to), t);
      stops.push({ t, p: { tier, material, body, coat: guess.coat, pan: pan(e.to) } });
    }
    slideEnd = Math.max(slideEnd, t);
    maxCells = Math.max(maxCells, total);
    sliders++;
    mark(t + 0.2);
  }
  if (slideEnd === 0) slideEnd = 0.05;
  if (sliders > 0) add(0, 'slide', { cells: maxCells, count: sliders, dir, dur: Math.max(0.2, slideEnd * 0.9) }, 1);
  // Stops: group landings of the same kind at (nearly) the same time.
  stops.sort((a, b) => a.t - b.t);
  const groups: Array<{ t: number; p: SfxParams; n: number }> = [];
  for (const s of stops) {
    const key = `${s.p.material}|${s.p.body}|${s.p.coat}`;
    const g = groups.find((x) => Math.abs(x.t - s.t) < 0.05 && `${x.p.material}|${x.p.body}|${x.p.coat}` === key);
    if (g) {
      g.n++;
      g.p.tier = Math.max(g.p.tier ?? 1, s.p.tier ?? 1);
    } else groups.push({ t: s.t, p: { ...s.p }, n: 1 });
  }
  for (const g of groups) add(g.t, 'stop', { ...g.p, count: g.n }, 1);

  // ------------------------------------------------------------ merges
  let maxImpact = 0;
  let maxSwap = 0;
  let maxTier = 0;
  let bigMergeAt: number | null = null;
  const merges: Array<{ e: MergeEvent; style: MergeStyle; tA: number; contact: number; swap: number; material: Material; pan: number }> = [];
  for (const e of res.events) {
    if (e.type !== 'merge') continue;
    const info = moves.get(e.ids[1]);
    const tA = info?.arrive ?? 0.15;
    const style = mergeStyleOf(info?.body ?? 'blob');
    const seg = SEGMENTS[style];
    const contact = tA + seg[0] + seg[1];
    const swap = contact + seg[2];
    landAt.set(cellKey(e.at), contact);
    maxImpact = Math.max(maxImpact, contact);
    maxSwap = Math.max(maxSwap, swap);
    maxTier = Math.max(maxTier, e.tier);
    merges.push({ e, style, tA, contact, swap, material: e.material as Material, pan: pan(e.at) });
    mark(swap + 0.45);
  }
  // Stagger: merges landing within 60 ms of each other become a rising arpeggio (70 ms steps, low → high).
  merges.sort((a, b) => a.contact - b.contact || a.e.tier - b.e.tier);
  let clusterStart = -1;
  let k = 0;
  const tiersInCluster = new Map<number, number>();
  for (const m of merges) {
    if (clusterStart < 0 || m.contact - clusterStart > 0.06) {
      clusterStart = m.contact;
      k = 0;
      tiersInCluster.clear();
    } else k++;
    const sameTierBefore = tiersInCluster.get(m.e.tier) ?? 0;
    tiersInCluster.set(m.e.tier, sameTierBefore + 1);
    const at = m.contact + k * 0.07;
    const tier = m.e.tier;
    const base: SfxParams = { tier, material: m.material, pan: m.pan };
    switch (m.style) {
      case 'leap':
        add(m.tA + 0.11, 'leapUp', { ...base }, 2);
        add(m.tA + 0.25, 'creatureVoice', { ...base }, tier >= 7 ? 3 : 2);
        add(m.tA + 0.4, 'diveWhoosh', { ...base }, 1);
        add(m.contact, 'bite', { ...base }, 2);
        add(m.contact + 0.1, 'chew', { ...base }, 1);
        add(m.contact, 'splash', { ...base, kind: tier >= 7 ? 'big' : 'normal' }, 2);
        break;
      case 'coil':
        add(m.tA + 0.14, 'coil', { ...base, dur: 0.3 }, 1);
        add(m.swap, 'gulp', { ...base }, 1);
        break;
      case 'stomp':
        add(m.tA, 'stompRear', { ...base }, 1);
        add(m.contact, 'stomp', { ...base }, 2);
        break;
      default:
        add(m.contact, 'splash', { ...base }, 1);
        break;
    }
    // Same-tier merges in one cluster climb the chord (+2, +4 steps) instead of repeating one note.
    add(at, 'merge', sameTierBefore > 0 ? { ...base, step: Math.min(4, sameTierBefore * 2) } : { ...base }, tier >= 7 ? 3 : 2);
    if (tier >= 4 || m.style !== 'splash') add(m.swap, 'childPop', { ...base }, 1);
    if (tier >= 9) bigMergeAt = Math.max(bigMergeAt ?? 0, at);
  }

  const sideAt = (c: Coord): number => (landAt.get(cellKey(c)) ?? slideEnd) + 0.05;
  const settleAt = Math.max(slideEnd, maxSwap);
  const dynStart = Math.max(slideEnd, maxImpact) + 0.12;
  const afterMerges = settleAt + 0.08;

  // ------------------------------------------------------------ everything else, in event order
  let won = false;
  let lost = false;
  let endAt = afterMerges;
  const gull = gullDropFor(res);
  let gullAt: number | null = null;
  for (const e of res.events) {
    switch (e.type) {
      case 'push':
        add(dynStart, 'push', { pan: pan(e.from) }, 1);
        mark(dynStart + 0.4);
        break;
      case 'strayMove':
        add(dynStart, 'strayMove', { pan: pan(e.from) }, 0);
        mark(dynStart + 0.4);
        break;
      case 'promote':
        add(afterMerges, 'promote', { pan: pan(e.at) }, 2);
        mark(afterMerges + 0.2);
        break;
      case 'special': {
        add(afterMerges, 'special', { kind: e.kind, pan: pan(e.at), count: e.removed.length }, 3);
        e.removed.slice(0, 4).forEach((rm) => {
          const dist = Math.abs(rm.at[0] - e.at[0]) + Math.abs(rm.at[1] - e.at[1]);
          add(afterMerges + 0.05 + dist * 0.03, 'popOut', { pan: pan(rm.at) }, 1);
        });
        mark(afterMerges + 0.5);
        break;
      }
      case 'tierBomb':
        add(afterMerges, 'tierBomb', { count: e.removed.length }, 3);
        mark(afterMerges + 0.5 + e.removed.length * 0.04);
        break;
      case 'release':
      case 'deliver':
        add(afterMerges + 0.02, e.type, { tier: e.tier, pan: pan(e.at) }, 2);
        mark(afterMerges + 0.52);
        break;
      case 'spawn': {
        const at = Math.max(tEnd - 0.2, afterMerges);
        if (gull && gull.spawnId === e.id) {
          // The board's shadow and drop run on the same times (`gullTimes`), so does the end mark.
          const g = gullTimes(at);
          gullSounds(add, gull, g, pan(e.at), e.tier, e.material as Material);
          gullAt = g.impactAt;
          mark(g.impactAt + GULL_SETTLE_S);
          break;
        }
        add(at, 'spawn', { tier: e.tier, material: e.material as Material, kind: e.kind, pan: pan(e.at) }, 0);
        mark(at + 0.26);
        break;
      }
      case 'heal': {
        const at = sideAt(e.at);
        if (e.to === 'healed') {
          add(at + 0.1, 'heal', { pan: pan(e.at) }, 1);
          mark(at + 0.9);
        } else {
          add(at, 'healStep', { pan: pan(e.at) }, 1);
          mark(at + 0.35);
        }
        break;
      }
      case 'collect': {
        const at = sideAt(e.at);
        add(at + 0.1, 'collect', { total: e.total, pan: pan(e.at) }, 1);
        mark(at + 0.45);
        break;
      }
      case 'blockerHit': {
        const at = sideAt(e.at);
        add(at, e.kind === 'scrap' ? 'scrap' : 'mound', { layers: e.layersLeft, pan: pan(e.at) }, 2);
        mark(at + 0.6);
        break;
      }
      case 'thaw': {
        const at = sideAt(e.at);
        add(at, 'crustCrack', { pan: pan(e.at) }, 2);
        mark(at + 0.5);
        break;
      }
      case 'wake': {
        const at = sideAt(e.at);
        add(at, 'wake', { pan: pan(e.at) }, 1);
        mark(at + 0.4);
        break;
      }
      case 'cageOpen': {
        const at = sideAt(e.at);
        add(at, 'cage', { layers: e.layersLeft, pan: pan(e.at) }, 2);
        mark(at + 0.65);
        break;
      }
      case 'reveal': {
        const at = sideAt(e.at);
        add(at, 'fogLift', { pan: pan(e.at) }, 1);
        mark(at + 0.6);
        break;
      }
      case 'burn': {
        const at = sideAt(e.at);
        add(at, e.what === 'crust' ? 'crustCrack' : e.what === 'rot' ? 'rotSquelch' : 'oilGlug', { pan: pan(e.at) }, 2);
        mark(at + 0.55);
        break;
      }
      case 'rotGrow':
        add(dynStart, 'rotGrow', { pan: pan(e.at) }, 1);
        mark(dynStart + 0.5);
        break;
      case 'toxicTick':
        add(dynStart, 'toxicTick', { pan: pan(e.at) }, 1);
        mark(dynStart + 0.4);
        break;
      case 'freeze':
        add(dynStart + 0.35, 'freeze', { pan: pan(e.at) }, 2);
        mark(dynStart + 0.5);
        break;
      case 'strayCalm':
        add(dynStart + 0.2, 'strayCalm', { pan: pan(e.at) }, 1);
        mark(dynStart + 0.45);
        break;
      case 'goalProgress':
        if (e.done) add(Math.max(tEnd - 0.2, afterMerges), 'goalDone', {}, 2);
        break;
      case 'won': {
        won = true;
        endAt = Math.max(tEnd - 0.2, afterMerges) + 0.1;
        add(endAt, 'won', {}, 3);
        mark(endAt + 0.5);
        break;
      }
      case 'lost': {
        lost = true;
        endAt = Math.max(tEnd - 0.2, afterMerges) + 0.25;
        add(endAt, 'lost', {}, 3);
        break;
      }
      default:
        break;
    }
  }

  return { sounds: capAndStagger(sounds), won, lost, endAt, maxTier, merges: merges.length, bigMergeAt, gullAt };
}

/**
 * The gull's pass: its cries sweep across the stereo field in the direction it flies (−0.7·side → +0.7·side; one to
 * three cries by variant, the last one a laugh when it laughs), the wing whoosh just before the release, the whistle of
 * the falling blob from the release, the wet splat on the impact. Parameters for the recipes (sfxExtra): `gullCall`
 * reads `p.step` (call variant 0..2), `p.kind` ('laugh' for the laughing cry) and may let its pan drift toward `p.dir`
 * by 1.4 per `p.dur` seconds (the whole crossing); `dropFall` falls for `p.dur` s; `splat` sizes by `p.tier`.
 */
function gullSounds(add: (t: number, id: SfxId, p: SfxParams, prio?: number) => void, drop: GullDrop, g: GullTimes, cellPan: number, tier: number, material: Material): void {
  const from = -0.7 * drop.side;
  const to = 0.7 * drop.side;
  const cries = 1 + drop.call;
  const span = Math.max(0.2, g.exitAt - 0.25 - g.callAt);
  for (let k = 0; k < cries; k++) {
    const f = cries === 1 ? 0 : k / (cries - 1);
    const t = g.callAt + f * span * 0.72;
    const laugh = drop.laugh && k === cries - 1;
    add(t, 'gullCall', { pan: from + (to - from) * (cries === 1 ? 0 : f), step: drop.call, dur: span, dir: drop.side > 0 ? 'right' : 'left', ...(laugh ? { kind: 'laugh' } : {}) }, k === 0 ? 2 : 1);
  }
  add(g.releaseAt - 0.12, 'gullWings', { pan: cellPan * 0.5, dur: 0.5 }, 1);
  add(g.releaseAt, 'dropFall', { tier, pan: cellPan, dur: g.impactAt - g.releaseAt }, 1);
  add(g.impactAt, 'splat', { tier, material, pan: cellPan }, 2);
}

/** Applies the per-sound caps and flams identical sounds that would start within 25 ms of each other. */
function capAndStagger(list: PlannedSound[]): PlannedSound[] {
  list.sort((a, b) => a.t - b.t);
  const out: PlannedSound[] = [];
  const count = new Map<SfxId, number>();
  const last = new Map<SfxId, PlannedSound>();
  for (const s of list) {
    const n = count.get(s.id) ?? 0;
    const cap = CAP[s.id] ?? 6;
    if (n >= cap) {
      const l = last.get(s.id);
      if (l) {
        l.p = { ...l.p, count: (l.p.count ?? 1) + 1, vel: Math.min(1.3, (l.p.vel ?? 1) + 0.08) };
        if (s.prio > l.prio) l.prio = s.prio;
      }
      continue;
    }
    const l = last.get(s.id);
    if (l && s.id !== 'merge' && s.t - l.t < 0.025) s.t = l.t + 0.045;
    count.set(s.id, n + 1);
    last.set(s.id, s);
    out.push(s);
  }
  return out.sort((a, b) => a.t - b.t);
}
