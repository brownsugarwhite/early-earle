import { Vector3 } from 'three/webgpu';
import { GULL_SETTLE_S, gullDropFor, gullTimes, type Blob, type Coord, type GullDrop, type GullTimes, type LevelState, type MergeEvent, type MoveResult, type SpawnEvent } from '@ee/core';
import type { BodyType, Vec3 } from '@ee/genome';
import type { BoardRenderer } from './BoardRenderer';
import type { BlobVisual } from './BoardBlobs';
import type { PropInstance } from './BoardProps';
import type { FxScope } from './boardFx';
import { genomeMergeMove, mergeMoveKind, mergeWarp, turnCurve, type MoveEventLike, type MoveSampleLike } from './boardMoves';
import { easeIn, easeInOut, easeOut, easeOutBack, easeOutCubic, easeSpring, easeSpringSoft, easeWalk, smoothstep, type TweenOptions } from './boardTween';
import { blossomDescs, jitter } from './boardElements';
import { gullCenter, type GullFlight } from './gullPath';

/** Base timings (seconds). Travel time grows with the distance (see `travelTime`); merges run ≈ 0.5–0.7 s. */
export const SLIDE_S = 0.15;
export const MERGE_S = 0.3;
export const POP_S = 0.16;

export type JuiceKind = 'merge' | 'burst' | 'hit' | 'collect' | 'heal' | 'rescue' | 'release' | 'won' | 'calm' | 'spawn';

export interface TimelineHooks {
  /** Input may be accepted again (after slides + merges). */
  onInputOpen: () => void;
  /** Everything settled and the visuals match the final state. */
  onSettled: () => void;
}

/** Travel per body type: [base s, s per cell]. Blobs bounce, walkers scurry, heavies plod. */
const TRAVEL: Record<BodyType, readonly [number, number]> = {
  blob: [0.15, 0.09],
  quadruped: [0.15, 0.085],
  biped: [0.17, 0.09],
  snake: [0.17, 0.095],
  heavy: [0.22, 0.12],
};

/** Travel time (s) of a creature over `cells` cells: base + per cell by body type; tier ≥ 8 is slower. */
export function travelTime(body: BodyType, cells: number, tier: number): number {
  const [base, per] = TRAVEL[body];
  return (base + per * Math.max(0, cells)) * (tier >= 8 ? 1.1 : 1);
}

/** Where a merging mover stops before its final leap into the partner (fraction of a cell before the target). */
const STOP_SHORT: Record<BodyType, number> = { blob: 0.45, quadruped: 0.62, biped: 0.62, snake: 0.7, heavy: 0.55 };

const adjacent = (a: Coord, b: Coord): boolean => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1;
const wrap = (a: number): number => {
  let v = a;
  while (v > Math.PI) v -= Math.PI * 2;
  while (v < -Math.PI) v += Math.PI * 2;
  return v;
};
const linear = (t: number): number => t;

interface MoveInfo {
  /** Time the mover reaches its end point (the pre-target point for merges). */
  arrive: number;
  /** End point and direction of the last run. */
  end: [number, number];
  dir: [number, number];
}

interface MergeTimes {
  impact: number;
  swap: number;
}

/**
 * Turns a move's events into wall-clock tweens on the board: every creature travels in its own style and at
 * its own distance-dependent pace (blobs bounce with a leading mouth and a droplet trail, walkers turn and
 * scurry, heavies overshoot and stumble, snakes slither and coil), merges play a choreography by the mover's
 * body type (splash, leap to the camera and devour, coil and swallow, stomp) with crowns, ripples, ink
 * splats and dust, then the element side effects, specials, dynamics, graduation and spawns follow. Input
 * opens after slides + merges; the state is reconciled once the last tween ends.
 */
export class BoardTimeline {
  private tw: FxScope;

  constructor(private readonly r: BoardRenderer) {
    this.tw = { add: (d, a, o) => r.tweens.add(d, a, o), after: (sec, fn) => r.tweens.after(sec, fn) };
  }

  play(res: MoveResult<LevelState>, finalState: LevelState, hooks: TimelineHooks, tag: string): void {
    const r = this.r;
    const base = r.tweens;
    this.tw = {
      add: (d, a, o: TweenOptions = {}) => base.add(d, a, { ...o, tag }),
      after: (sec, fn) => base.after(sec, fn, tag),
    };
    const tw = this.tw;
    // Heal memory first: the desired element set of the final state must already contain the blossoms.
    for (const e of res.events) if (e.type === 'heal' && e.to === 'healed') r.healed.add(e.at[1] * r.layout.w + e.at[0]);
    const { blobs, props, cells, layout } = r;
    const pal = r.palette;
    const now = () => r.now;
    let tEnd = 0;
    const blobAt = (id: number): Blob | null => finalState.cells.find((b) => b?.id === id) ?? null;
    const cellIndex = (c: Coord) => c[1] * layout.w + c[0];
    const local = (c: Coord) => layout.cellToLocal(c[0], c[1]);
    const desired = r.desiredFor(finalState);
    const away = r.awayDir;
    const mark = (t: number) => (tEnd = Math.max(tEnd, t));
    // A merge result gets a new id; the settled visual is re-keyed only when its merge tween ends. Events that
    // name the result (promote, release, blasts) resolve it through this alias at build time.
    const alias = new Map<number, BlobVisual>();
    const mergeOf = new Map<number, MergeEvent>();
    for (const e of res.events) {
      if (e.type !== 'merge') continue;
      const settled = blobs.get(e.ids[0]) ?? alias.get(e.ids[0]);
      if (settled) alias.set(e.resultId, settled);
      mergeOf.set(e.ids[1], e);
    }
    const vis = (id: number): BlobVisual | undefined => blobs.get(id) ?? alias.get(id);
    // Presentation only: does a gull bring this move's spawn (shared rule with audio and haptics)?
    const gull = gullDropFor(res);
    let gullImpact = -1;

    // ---------------------------------------------------------------- phase 1: slides (each at its own pace)
    const moves = new Map<number, MoveInfo>();
    const landAt = new Map<number, number>();
    let slideEnd = 0;
    for (const e of res.events) {
      if (e.type !== 'slide') continue;
      const v = vis(e.id);
      if (!v) continue;
      const merging = mergeOf.has(e.id);
      const info = this.move(v, e.from, e.path, 0, merging ? { stopShort: STOP_SHORT[v.body] } : {});
      moves.set(e.id, info);
      if (!merging) landAt.set(cellIndex(e.to), info.arrive);
      slideEnd = Math.max(slideEnd, info.arrive);
      mark(info.arrive + 0.2);
    }
    if (slideEnd === 0) slideEnd = 0.05;

    // ---------------------------------------------------------------- phase 1b: merges (by the mover's body)
    let maxImpact = 0;
    let maxSwap = 0;
    for (const e of res.events) {
      if (e.type !== 'merge') continue;
      const [settledId, movingId] = e.ids;
      const settled = vis(settledId);
      const moving = vis(movingId);
      const target = local(e.at);
      const info = moves.get(movingId);
      const tA = info?.arrive ?? SLIDE_S;
      const from: [number, number] = info?.end ?? (moving ? [moving.x, moving.z] : target);
      const dir: [number, number] = info?.dir ?? [0, 1];
      const resultBlob = blobAt(e.resultId) ?? { id: e.resultId, tier: e.tier, material: e.material, kind: 'normal' as const };
      const big = e.tier >= 7;
      let times: MergeTimes;
      const style = moving?.body ?? 'blob';
      const played = moving ? this.playGenomeMove(moving, settled, from, target, dir, tA, e.tier) : null;
      if (played) times = played;
      else if (!moving) times = { impact: tA, swap: tA + 0.12 };
      else if (style === 'blob') times = this.mergeSplash(moving, settled, from, target, dir, tA, e.tier);
      else if (style === 'snake') times = this.mergeCoil(moving, settled, from, target, tA, e.tier);
      else if (style === 'heavy') times = this.mergeStomp(moving, settled, from, target, dir, tA, e.tier);
      else times = this.mergeLeap(moving, settled, from, target, tA, e.tier);
      landAt.set(cellIndex(e.at), times.impact);
      maxImpact = Math.max(maxImpact, times.impact);
      maxSwap = Math.max(maxSwap, times.swap);
      if (big) tw.after(times.impact, () => r.punch(0.5 + 0.1 * Math.min(4, e.tier - 7)));
      // Parts: the parents' accessories detach and fly off around the impact, the child's pop on the swap.
      if (settled) {
        const t0 = times.swap - 0.3;
        tw.after(Math.max(0, t0), () => blobs.beginMerge(settled, moving, resultBlob));
        tw.add(0.63, (t) => blobs.sampleMerge(settled, t * 630), { delay: Math.max(0, t0) + 0.0002, ease: linear, done: () => blobs.endMerge(settled) });
      }
      // Swap: the mover is gone, the settled creature continues as the child (new body type) with a pop.
      tw.after(times.swap, () => {
        if (moving && moving !== settled) blobs.removeVisual(moving.id, props);
        if (!settled) return;
        settled.hidden = false;
        settled.x = target[0];
        settled.z = target[1];
        blobs.swapMerge(settled, resultBlob);
        settled.pop = 0.55;
        settled.labelAlpha = 1;
        settled.lift = 0;
        settled.mouth = 0;
        settled.pitchBlend = 0;
        settled.coil = null;
        settled.coilRadius = null;
        settled.yawDirect = false;
        settled.bulge = -1;
        settled.trumpet = 0;
        settled.crouch = 0;
        settled.squash = null;
        if (settled.drive && moving) settled.yawTarget = Math.atan2(dir[0], dir[1]);
        this.mergeBurst(target, settled, e.tier);
        // Sammlung: das Ergebnis ist erschaffen (erstes seiner Art → "NEU!").
        r.reportCreature(settled, 'merge', e.resultId);
      });
      if (settled) {
        tw.add(
          0.38,
          (t) => {
            settled.pop = 0.55 + 0.45 * t;
            settled.squash = settled.drive ? null : { axis: [0, 1, 0], amount: 0.3 * Math.sin(t * Math.PI) };
          },
          {
            delay: times.swap + 0.0002,
            ease: easeSpring,
            done: () => {
              settled.pop = 1;
              settled.squash = null;
              // Re-key first: the wobble belongs to the result's spring, which the visual reads from now on.
              if (e.resultId !== settled.id) blobs.rekey(settled.id, e.resultId);
              blobs.driver.impulse(settled.id, [0, 1, 0], 0.8);
              settled.jiggle = 1;
            },
          },
        );
      }
      mark(times.swap + 0.45);
    }

    const sideAt = (c: Coord) => (landAt.get(cellIndex(c)) ?? slideEnd) + 0.05;
    const settleAt = Math.max(slideEnd, maxSwap);
    const dynStart = Math.max(slideEnd, maxImpact) + 0.12;
    const afterMerges = settleAt + 0.08;

    // ---------------------------------------------------------------- pushes and stray moves (dynamics)
    for (const e of res.events) {
      if (e.type !== 'push' && e.type !== 'strayMove') continue;
      const v = vis(e.id);
      if (!v) continue;
      const delay = dynStart;
      const info = this.move(v, e.from, [e.to], delay, { pushed: e.type === 'push' });
      mark(info.arrive + 0.2);
      if (e.type === 'push') {
        // The vent under the pushed blob puffs.
        const [fx, fz] = local(e.from);
        tw.after(delay, () => r.particles.burst('spore', now(), fx, layout.top + 0.06, fz, 5, { up: 0.5, spread: 0.35, life: 0.6, size: 0.053, colors: [pal.paper, pal.sky], seed: e.id }));
      }
    }

    // ---------------------------------------------------------------- everything else, in event order
    for (const e of res.events) {
      switch (e.type) {
        case 'promote': {
          const v = vis(e.id);
          if (!v) break;
          const delay = afterMerges;
          tw.after(delay, () => {
            const b = blobAt(e.id);
            if (b) blobs.setBlob(v, b);
            blobs.driver.impulse(v.id, [0, 1, 0], 1.1);
            v.jiggle = 1;
            r.particles.burst('droplet', now(), v.x, v.centerY + v.radius * 0.6, v.z, 10, { up: 1.6, spread: 1.2, life: 0.65, size: 0.06, colors: [pal.paper, pal.neon], seed: e.id, ring: v.radius * 0.9 });
          });
          mark(delay + 0.2);
          break;
        }
        case 'special': {
          const delay = afterMerges;
          const origin = e.at;
          for (const c of e.cells) {
            const dist = Math.abs(c[0] - origin[0]) + Math.abs(c[1] - origin[1]);
            const i = cellIndex(c);
            tw.add(0.42, (t) => cells.setFlash(i, Math.sin(t * Math.PI) * 0.9), { delay: delay + dist * 0.025, ease: easeOut, done: () => cells.setFlash(i, 0) });
          }
          for (const rm of e.removed) {
            const v = vis(rm.id);
            if (!v) continue;
            const dist = Math.abs(rm.at[0] - origin[0]) + Math.abs(rm.at[1] - origin[1]);
            this.popOut(v, delay + dist * 0.03, rm.id);
          }
          const strength = e.kind === 'line' ? 0.35 : e.kind === 'burst' ? 0.6 : 1.0;
          tw.after(delay, () => {
            r.kick(strength);
            r.punch(strength * 0.6);
            r.emitJuice('burst');
          });
          mark(delay + 0.5);
          break;
        }
        case 'tierBomb': {
          const delay = afterMerges;
          e.removed.forEach((rm, k) => {
            const v = vis(rm.id);
            if (v) this.popOut(v, delay + k * 0.04, rm.id);
          });
          tw.after(delay, () => {
            r.kick(0.9);
            r.punch(0.7);
            r.emitJuice('burst');
          });
          mark(delay + 0.5 + e.removed.length * 0.04);
          break;
        }
        case 'release':
        case 'deliver': {
          const v = vis(e.id);
          const delay = afterMerges + 0.02;
          if (v) {
            const dir: Vec3 = [away.x * 0.6, 1, away.z * 0.6];
            let trail = 0;
            tw.add(
              0.5,
              (t) => {
                v.lift = t * t * 4.5;
                v.pop = 1 - 0.45 * t;
                v.squash = v.drive ? null : { axis: dir, amount: 0.5 * t };
                v.labelAlpha = 1 - t;
                if (t > trail) {
                  trail += 0.12;
                  r.particles.emit('droplet', now(), v.x, v.centerY, v.z, (jitter(v.id, trail * 100) - 0.5) * 0.8, 0.3, (jitter(v.id, trail * 77) - 0.5) * 0.8, 0.5, 0.035, e.type === 'deliver' ? pal.neon : pal.paper);
                }
              },
              { delay, ease: easeIn, done: () => blobs.removeVisual(v.id, props) },
            );
            tw.after(delay, () => r.emitJuice('release'));
          }
          mark(delay + 0.5);
          break;
        }
        case 'spawn': {
          const delay = Math.max(tEnd - 0.2, afterMerges);
          const blob = blobAt(e.id);
          if (!blob) break;
          if (gull && gull.spawnId === e.id) {
            // Flatsch: the gull's shadow crosses the board and drops the blob from above (no vent puff).
            const g = this.dropIn(e, blob, gull, delay, finalState, vis);
            gullImpact = g.impactAt;
            mark(g.impactAt + GULL_SETTLE_S);
            break;
          }
          const v = blobs.makeVisual(blob, e.at);
          v.pop = 0.001;
          v.labelAlpha = 0;
          tw.add(
            POP_S * 1.6,
            (t) => {
              v.pop = Math.max(0.001, t);
              v.labelAlpha = t;
              v.squash = v.drive ? null : { axis: [0, 1, 0], amount: 0.35 * Math.sin(t * Math.PI) };
            },
            { delay, ease: easeSpring, done: () => (v.squash = null) },
          );
          // Sammlung: der Spawn ist erschaffen, sobald er aufploppt.
          tw.after(delay, () => r.reportCreature(v, 'spawn'));
          // The nearest gas source puffs.
          const src = this.nearestSource(finalState, e.at);
          if (src !== null) {
            const [sx, sz] = layout.cellToLocal(src % layout.w, Math.floor(src / layout.w));
            const vent = props.get(`sourceVent:${src}`);
            tw.add(0.35, (t) => {
              if (vent) vent.scale = 1 + 0.6 * Math.sin(t * Math.PI);
            }, { delay: Math.max(0, delay - 0.05), ease: easeOut, done: () => { if (vent) vent.scale = 1; } });
            tw.after(Math.max(0, delay - 0.05), () => r.particles.burst('spore', now(), sx, layout.top + 0.25, sz, 8, { up: 0.9, spread: 0.3, life: 0.8, size: 0.06, colors: [pal.paper, pal.teal, pal.sky], seed: e.id }));
          }
          mark(delay + POP_S * 1.6);
          break;
        }
        case 'heal': {
          const i = cellIndex(e.at);
          const [px, pz] = local(e.at);
          const delay = sideAt(e.at);
          if (e.to === 'healed') {
            tw.add(0.6, (t) => cells.setHeal(i, t), { delay, ease: easeOut });
            for (const [key, desc] of blossomDescs(i, px, pz, layout, pal)) {
              tw.after(delay + 0.12 + (desc.delay ?? 0), () => {
                const p = props.add(key, desc, now());
                if (p) this.popIn(p, 0.35);
              });
            }
            tw.after(delay + 0.1, () => {
              r.particles.burst('spore', now(), px, layout.top + 0.08, pz, 11, { up: 1.2, spread: 0.6, life: 1.0, size: 0.06, colors: [pal.pink, pal.neon, pal.paper], seed: i, ring: layout.cell * 0.42 });
              r.emitJuice('heal');
            });
            mark(delay + 0.9);
          } else {
            // deep → withered: cracks close one step, dust puffs.
            tw.add(0.3, (t) => cells.setHeal(i, 0.6 * Math.sin(t * Math.PI)), { delay, ease: easeOut, done: () => cells.setKind(i, 1, 0) });
            tw.after(delay, () => r.particles.burst('droplet', now(), px, layout.top + 0.05, pz, 6, { up: 0.7, spread: 0.6, life: 0.5, size: 0.045, colors: [pal.soil, pal.crack], seed: i }));
            mark(delay + 0.35);
          }
          this.bounceBlobAt(finalState, e.at, delay);
          break;
        }
        case 'collect': {
          const i = cellIndex(e.at);
          const [px, pz] = local(e.at);
          const delay = sideAt(e.at);
          const pod = props.get(`spore:${i}`);
          const stem = props.get(`sporeStem:${i}`);
          const halo = props.get(`sporeHalo:${i}`);
          tw.add(
            0.38,
            (t) => {
              if (pod) {
                pod.oy = 0.55 * t;
                pod.ory = t * 7;
                pod.scale = 1 + 0.5 * Math.sin(t * Math.PI) - t;
              }
              if (stem) stem.scale = 1 - t;
              if (halo) halo.scale = 1 + 0.6 * t - 1.6 * t * t;
            },
            {
              delay,
              ease: easeOutCubic,
              done: () => {
                props.remove(`spore:${i}`);
                props.remove(`sporeStem:${i}`);
                props.remove(`sporeHalo:${i}`);
              },
            },
          );
          tw.after(delay + 0.1, () => {
            r.particles.burst('spore', now(), px, layout.top + 0.62, pz, 14, { up: 1.4, spread: 0.7, life: 1.0, size: 0.068, colors: [pal.neon, pal.paper], seed: i, ring: layout.cell * 0.2 });
            r.emitJuice('collect');
          });
          this.bounceBlobAt(finalState, e.at, delay);
          mark(delay + 0.45);
          break;
        }
        case 'blockerHit': {
          const i = cellIndex(e.at);
          const [px, pz] = local(e.at);
          const delay = sideAt(e.at);
          if (e.kind === 'scrap') {
            const peel = props.get(`scrap:${i}:${e.layersLeft}`);
            const junk = props.get(`scrapJunk:${i}`);
            const junkY = layout.top + e.layersLeft * 0.15;
            if (peel) this.peel(peel, delay, `scrap:${i}:${e.layersLeft}`);
            if (junk) {
              const y0 = junk.y;
              if (e.layersLeft === 0) tw.add(0.3, (t) => (junk.scale = 1 - t), { delay: delay + 0.1, ease: easeIn, done: () => props.remove(`scrapJunk:${i}`) });
              else tw.add(0.35, (t) => (junk.y = y0 + (junkY - y0) * t), { delay: delay + 0.15, ease: easeSpringSoft });
            }
            for (let l = 0; l < e.layersLeft; l++) {
              const p = props.get(`scrap:${i}:${l}`);
              if (p) tw.add(0.3, (t) => (p.squash = -0.25 * Math.sin(t * Math.PI)), { delay: delay + 0.05 + l * 0.03, ease: easeOut, done: () => (p.squash = 0) });
            }
            tw.after(delay, () => {
              r.particles.burst('droplet', now(), px, layout.top + 0.2 + e.layersLeft * 0.15, pz, 7, { up: 1.1, spread: 0.8, life: 0.55, size: 0.053, colors: [pal.scrap, pal.rust, pal.scrapLine], seed: i });
              r.emitJuice('hit');
              r.kick(0.15);
            });
          } else {
            const m = res.state.mound[i] ?? -1;
            const tower = m >= 0 ? props.get(`mound:${m}`) : undefined;
            if (tower) {
              const from = tower.sy;
              const target = e.layersLeft > 0 ? 0.34 + 0.13 * e.layersLeft : 0.02;
              tw.add(0.4, (t) => (tower.sy = from + (target - from) * t), { delay, ease: easeSpringSoft });
              tw.after(delay, () => props.setParam(`mound:${m}`, Math.max(1, e.layersLeft)));
              const [tx, tz] = [tower.x, tower.z];
              tw.after(delay, () => {
                r.particles.burst('droplet', now(), tx, layout.top + from, tz, 10, { up: 1.3, spread: 1.0, life: 0.6, size: 0.068, colors: [pal.rust, pal.rustDeep, pal.ink], seed: i });
                r.kick(0.3);
                r.emitJuice('hit');
              });
              if (e.layersLeft === 0) {
                for (const key of [`mound:${m}`, `moundStep:${m}`, `moundBase:${m}`]) {
                  const p = props.get(key);
                  if (!p) continue;
                  tw.add(0.45, (t) => {
                    p.scale = 1 - t;
                    p.oy = -0.3 * t;
                  }, { delay: delay + 0.25, ease: easeIn, done: () => props.remove(key) });
                }
              }
            }
          }
          this.bounceBlobAt(finalState, e.at, delay);
          mark(delay + 0.6);
          break;
        }
        case 'thaw': {
          const v = vis(e.id);
          const delay = sideAt(e.at);
          if (v) {
            tw.after(delay, () => {
              v.frozen = false;
              blobs.refreshParams(v);
              for (const key of blobs.releaseAttachments(v, 'crust:')) {
                const p = props.get(key);
                if (p) this.flyAway(p, key, 0.42, (p.x - v.x) * 2.2, 0.5, (p.z - v.z) * 2.2);
              }
              blobs.driver.impulse(v.id, [0, 1, 0], 1.0);
              v.jiggle = 1;
              r.particles.burst('droplet', now(), v.x, v.centerY, v.z, 12, { up: 1.5, spread: 1.2, life: 0.65, size: 0.06, colors: [pal.ice, pal.iceDeep, '#ffffff'], seed: e.id, ring: v.radius * 1.1 });
            });
            mark(delay + 0.5);
          }
          break;
        }
        case 'wake': {
          const v = vis(e.id);
          const delay = sideAt(e.at);
          if (v) {
            tw.after(delay, () => {
              v.sleeper = false;
              blobs.refreshParams(v);
              for (const key of blobs.releaseAttachments(v, 'zzz:')) {
                const p = props.get(key);
                if (p) this.flyAway(p, key, 0.35, 0.2, 0.6, 0);
              }
              for (const key of blobs.releaseAttachments(v, 'lid:')) {
                const p = props.get(key);
                if (p) tw.add(0.2, (t) => (p.scale = 1 - t), { ease: easeOut, done: () => props.remove(key) });
              }
            });
            tw.add(0.3, (t) => (v.lift = 0.22 * Math.sin(t * Math.PI)), { delay: delay + 0.05, ease: easeOut, done: () => { v.lift = 0; blobs.driver.impulse(v.id, [0, 1, 0], 1.1); v.jiggle = 1; } });
            mark(delay + 0.4);
          }
          break;
        }
        case 'cageOpen': {
          const i = cellIndex(e.at);
          const [px, pz] = local(e.at);
          const delay = sideAt(e.at);
          const layerKeys = [...props.keys()].filter((key) => key.startsWith(`cage:${i}:${e.layersLeft}:`) || key.startsWith(`thorn:${i}:${e.layersLeft}:`));
          layerKeys.forEach((key, k) => {
            const p = props.get(key);
            if (!p) return;
            const dx = p.x - px;
            const dz = p.z - pz;
            const l = Math.hypot(dx, dz) || 1;
            tw.add(
              0.45,
              (t) => {
                p.ox = (dx / l) * 0.55 * t;
                p.oz = (dz / l) * 0.55 * t;
                p.oy = 0.25 * Math.sin(t * Math.PI) - 0.2 * t * t;
                p.orx = 1.4 * t;
                p.scale = 1 - t * t;
              },
              { delay: delay + (k % 8) * 0.03, ease: easeOut, done: () => props.remove(key) },
            );
          });
          if (e.layersLeft === 0) {
            const v = vis(e.id);
            tw.after(delay + 0.2, () => {
              if (v) {
                v.caged = false;
                blobs.driver.impulse(v.id, [0, 1, 0], 1.3);
                v.jiggle = 1;
              }
              r.particles.burst('spore', now(), px, layout.top + 0.3, pz, 16, { up: 1.3, spread: 0.8, life: 1.0, size: 0.068, colors: [pal.pink, pal.paper, pal.neon], seed: i, ring: layout.cell * 0.45 });
              r.emitJuice('rescue');
            });
          } else {
            tw.after(delay, () => r.particles.burst('droplet', now(), px, layout.top + 0.3, pz, 6, { up: 0.9, spread: 0.7, life: 0.5, size: 0.045, colors: [pal.vine, pal.ink], seed: i }));
          }
          mark(delay + 0.65);
          break;
        }
        case 'reveal': {
          const i = cellIndex(e.at);
          const delay = sideAt(e.at);
          for (let k = 0; k < 3; k++) {
            const key = `fog:${i}:${k}`;
            const p = props.get(key);
            if (!p) continue;
            tw.add(
              0.45,
              (t) => {
                p.oy = 0.7 * t;
                p.ox = (k - 1) * 0.25 * t;
                p.scale = 1 - t * t;
              },
              { delay: delay + k * 0.05, ease: easeOut, done: () => props.remove(key) },
            );
          }
          if (e.id !== undefined) {
            const v = vis(e.id);
            if (v) {
              tw.after(delay + 0.12, () => {
                v.fogged = false;
                v.pop = 0.001;
              });
              tw.add(0.3, (t) => (v.pop = Math.max(0.001, t)), { delay: delay + 0.12, ease: easeSpring });
            }
          }
          mark(delay + 0.6);
          break;
        }
        case 'burn': {
          const i = cellIndex(e.at);
          const [px, pz] = local(e.at);
          const delay = sideAt(e.at);
          const fire = ['#e8552a', '#ffcf4a', '#ff8a3c'];
          if (e.what === 'rot') {
            for (const key of [`rot:${i}`, `rotCore:${i}`, ...[0, 1, 2, 3, 4].map((k) => `rotNode:${i}:${k}`)]) {
              const p = props.get(key);
              if (p) tw.add(0.4, (t) => { p.scale = 1 - t; p.oy = -0.03 * t; }, { delay, ease: easeIn, done: () => props.remove(key) });
            }
          } else if (e.what === 'crust') {
            const v = this.blobAtCell(finalState, e.at);
            if (v) {
              tw.after(delay, () => {
                v.frozen = false;
                blobs.refreshParams(v);
                for (const key of blobs.releaseAttachments(v, 'crust:')) {
                  const p = props.get(key);
                  if (p) tw.add(0.35, (t) => { p.scale = 1 - t; p.oy = -0.1 * t; }, { ease: easeIn, done: () => props.remove(key) });
                }
              });
            }
          } else {
            tw.add(0.5, (t) => cells.setFlash(i, Math.sin(t * Math.PI)), { delay, ease: easeOut, done: () => cells.setFlash(i, 0) });
            tw.after(delay, () => r.kick(0.35));
          }
          tw.after(delay, () => r.particles.burst('droplet', now(), px, layout.top + 0.1, pz, 12, { up: 1.5, spread: 0.8, life: 0.55, size: 0.06, colors: fire, seed: i }));
          mark(delay + 0.55);
          break;
        }
        case 'rotGrow': {
          const i = cellIndex(e.at);
          const [fx, fz] = local(e.from);
          const delay = dynStart;
          for (const key of [`rot:${i}`, `rotCore:${i}`, ...[0, 1, 2, 3, 4].map((k) => `rotNode:${i}:${k}`)]) {
            const desc = desired.props.get(key);
            if (!desc) continue;
            tw.after(delay, () => {
              const p = props.add(key, desc, now());
              if (!p) return;
              p.scale = 0.001;
              p.ox = (fx - desc.x) * 0.6;
              p.oz = (fz - desc.z) * 0.6;
              tw.add(0.45, (t) => {
                p.scale = Math.max(0.001, t);
                p.ox = (fx - desc.x) * 0.6 * (1 - t);
                p.oz = (fz - desc.z) * 0.6 * (1 - t);
              }, { ease: easeSpringSoft });
            });
          }
          mark(delay + 0.5);
          break;
        }
        case 'toxicTick': {
          const i = cellIndex(e.at);
          const delay = dynStart;
          const threat = finalState.level.threats.find((t) => t.kind === 'toxic' && t.at[0] === e.at[0] && t.at[1] === e.at[1]);
          const total = threat && threat.kind === 'toxic' ? threat.countdown : Math.max(1, e.countdown);
          const ring = props.get(`toxicRing:${i}`);
          tw.add(0.3, (t) => { if (ring) ring.scale = 1 + 0.18 * Math.sin(t * Math.PI); }, { delay, ease: easeOut, done: () => { if (ring) ring.scale = 1; } });
          tw.after(delay + 0.08, () => props.setParam(`toxicRing:${i}`, Math.min(1, e.countdown / Math.max(1, total))));
          for (let k = 0; k < 3; k++) {
            const p = props.get(`toxic:${i}:${k}`);
            if (p) tw.add(0.35, (t) => (p.squash = 0.35 * Math.sin(t * Math.PI)), { delay: delay + k * 0.04, ease: easeOut, done: () => (p.squash = 0) });
          }
          mark(delay + 0.4);
          break;
        }
        case 'freeze': {
          const v = vis(e.id);
          const delay = dynStart;
          const [vx, vz] = local(e.at);
          for (const key of [...props.keys()]) {
            if (!key.startsWith('toxic:') && !key.startsWith('toxicRing:')) continue;
            const p = props.get(key);
            if (!p) continue;
            tw.add(0.4, (t) => {
              p.ox = (vx - p.x) * t;
              p.oz = (vz - p.z) * t;
              p.scale = 1 - t * t;
            }, { delay, ease: easeInOut, done: () => props.remove(key) });
          }
          if (v) {
            tw.after(delay + 0.35, () => {
              v.frozen = true;
              blobs.refreshParams(v);
              blobs.driver.impulse(v.id, [0, 1, 0], 0.6);
              r.particles.burst('droplet', now(), v.x, v.centerY, v.z, 10, { up: 1.0, spread: 0.8, life: 0.55, size: 0.05, colors: [pal.ice, pal.toxic], seed: e.id, ring: v.radius * 1.1 });
            });
          }
          mark(delay + 0.5);
          break;
        }
        case 'strayCalm': {
          const v = vis(e.id);
          const delay = dynStart;
          if (v) {
            tw.add(0.35, (t) => {
              v.lift = 0.28 * Math.sin(t * Math.PI);
              v.squash = v.drive ? null : { axis: [0, 1, 0], amount: 0.4 * Math.sin(t * Math.PI) };
            }, { delay, ease: easeOut, done: () => { v.lift = 0; v.squash = null; blobs.driver.impulse(v.id, [0, 1, 0], 1.0); v.jiggle = 1; } });
            tw.after(delay + 0.2, () => {
              const b = blobAt(e.id);
              if (b) blobs.setBlob(v, b);
              r.particles.burst('spore', now(), v.x, v.centerY + v.radius, v.z, 10, { up: 1.0, spread: 0.6, life: 0.8, size: 0.06, colors: [pal.paper, pal.rust, pal.pink], seed: e.id });
              r.emitJuice('calm');
            });
            mark(delay + 0.45);
          }
          break;
        }
        case 'goalProgress': {
          if (!e.done) break;
          const key = `goal:${e.index}:plinth`;
          const delay = Math.max(tEnd - 0.2, afterMerges);
          tw.after(delay, () => {
            props.setColor(key, pal.neon);
            const p = props.get(key);
            if (p) tw.add(0.4, (t) => (p.squash = 0.5 * Math.sin(t * Math.PI)), { ease: easeOut, done: () => (p.squash = 0) });
          });
          break;
        }
        case 'won': {
          const delay = Math.max(tEnd - 0.2, afterMerges) + 0.1;
          let k = 0;
          for (const v of blobs.visuals.values()) {
            const d = delay + k * 0.05;
            tw.add(0.35, (t) => (v.lift = 0.35 * Math.sin(t * Math.PI)), { delay: d, ease: easeOut, done: () => { v.lift = 0; blobs.driver.impulse(v.id, [0, 1, 0], 1.0); v.jiggle = 1; } });
            k++;
          }
          for (let wave = 0; wave < 3; wave++) {
            tw.after(delay + wave * 0.18, () => {
              const x = (jitter(wave, 1) - 0.5) * layout.w * layout.pitch * 0.8;
              const z = (jitter(wave, 2) - 0.5) * layout.h * layout.pitch * 0.8;
              r.particles.burst('spore', now(), x, layout.top + 0.4, z, 16, { up: 1.6, spread: 1.2, life: 1.1, size: 0.075, colors: [pal.neon, pal.pink, pal.paper, pal.teal], seed: wave + 9 });
              r.particles.burst('droplet', now(), x, layout.top + 0.3, z, 10, { up: 2.0, spread: 1.4, life: 0.8, size: 0.06, colors: [pal.paper, pal.neon], seed: wave + 19 });
            });
          }
          tw.after(delay, () => r.emitJuice('won'));
          mark(delay + 0.5 + k * 0.05);
          break;
        }
        default:
          break;
      }
    }

    // A gull move keeps the input closed until the blob has landed (a queued swipe hurries both, see `hurry`).
    tw.after(Math.max(slideEnd + 0.05, maxSwap + 0.22, gullImpact + 0.02), hooks.onInputOpen);
    tw.after(tEnd + 0.02, () => {
      r.reconcile(finalState);
      hooks.onSettled();
    });
  }

  // ---------------------------------------------------------------------------------------- travel

  /**
   * Moves a creature along `path` in its body type's style, starting `delay` s from now; teleports dip through
   * the portal rings. `stopShort` ends the last run that fraction of a cell early (merging movers leap the
   * rest); `pushed` = moved by a vent (no turn, no anticipation). Returns the arrival time and end point.
   */
  move(v: BlobVisual, from: Coord, path: Coord[], delay: number, opts: { stopShort?: number; pushed?: boolean } = {}): MoveInfo {
    const r = this.r;
    const tw = this.tw;
    const { layout, props } = r;
    const pitch = layout.pitch;
    // Split the path into contiguous runs at teleports.
    const runs: Coord[][] = [];
    let current: Coord[] = [from];
    let prev = from;
    for (const c of path) {
      if (!adjacent(prev, c)) {
        runs.push(current);
        current = [c];
      } else current.push(c);
      prev = c;
    }
    runs.push(current);
    let t0 = delay;
    const walker = v.drive !== null;
    const dir: [number, number] = [v.moveDir[0], v.moveDir[1]];
    let end: [number, number] = [v.x, v.z];
    runs.forEach((run, ri) => {
      const a = run[0]!;
      const b = run[run.length - 1]!;
      const [x0, z0] = layout.cellToLocal(a[0], a[1]);
      let [x1, z1] = layout.cellToLocal(b[0], b[1]);
      const last = ri === runs.length - 1;
      let cells = run.length - 1;
      const len0 = Math.hypot(x1 - x0, z1 - z0);
      if (len0 > 1e-6) {
        const ux = (x1 - x0) / len0;
        const uz = (z1 - z0) / len0;
        dir[0] = ux;
        dir[1] = uz;
        if (last && opts.stopShort) {
          const cut = Math.min(opts.stopShort, cells - 0.05) * pitch;
          x1 -= ux * cut;
          z1 -= uz * cut;
          cells -= cut / pitch;
        }
        const travel = travelTime(v.body, cells, v.tier) * (opts.pushed ? 0.8 : 1);
        // Anticipation (first run only): walkers turn toward the swipe first (their heading spring overshoots
        // and settles while they go), blobs crouch against the motion.
        let lead = 0;
        if (ri === 0 && !opts.pushed) {
          const yaw = Math.atan2(ux, uz);
          if (walker) {
            // Anticipating turn (a small counter-turn, overshoot, settle); the walk starts while it turns.
            const from0 = v.drive?.yaw ?? yaw;
            const delta = wrap(yaw - from0);
            const turn = Math.abs(delta);
            if (turn > 0.08) {
              const dur = 0.16 + 0.12 * (turn / Math.PI);
              tw.add(
                dur,
                (u) => {
                  v.yawTarget = from0 + delta * turnCurve(u, delta);
                  v.yawDirect = true;
                },
                { delay: t0, ease: linear, done: () => { v.yawTarget = yaw; v.yawDirect = false; } },
              );
              lead = turn > 0.35 ? dur * 0.4 : 0.02;
            } else tw.after(t0, () => (v.yawTarget = yaw));
          } else {
            lead = 0.055;
            tw.add(
              lead,
              (t) => {
                v.moveDir = [ux, uz];
                v.squash = { axis: [ux, 0, uz], amount: -0.24 * easeOut(t) };
                v.mouth = 0;
              },
              { delay: t0, ease: linear },
            );
          }
        }
        t0 += lead;
        if (walker) this.walkRun(v, x0, z0, x1, z1, ux, uz, cells, travel, t0);
        else this.hopRun(v, x0, z0, x1, z1, ux, uz, cells, travel, t0, last && !opts.stopShort);
        t0 += travel;
        end = [x1, z1];
      } else {
        tw.after(t0, () => {
          v.x = x1;
          v.z = z1;
        });
        end = [x1, z1];
      }
      if (ri < runs.length - 1) {
        // Portal: sink into the ring, reappear at the exit.
        const exit = runs[ri + 1]![0]!;
        const [ex, ez] = layout.cellToLocal(exit[0], exit[1]);
        const ringIn = props.get(`portalRing:${b[1] * layout.w + b[0]}`);
        const ringOut = props.get(`portalRing:${exit[1] * layout.w + exit[0]}`);
        tw.add(0.09, (t) => { v.pop = Math.max(0.001, 1 - t); v.lift = -0.15 * t; }, { delay: t0, ease: easeIn, done: () => { v.x = ex; v.z = ez; } });
        tw.add(0.11, (t) => { v.pop = Math.max(0.001, t); v.lift = -0.15 * (1 - t); }, { delay: t0 + 0.09, ease: easeOutBack, done: () => { v.pop = 1; v.lift = 0; } });
        for (const ring of [ringIn, ringOut]) if (ring) tw.add(0.3, (t) => (ring.scale = 1 + 0.35 * Math.sin(t * Math.PI)), { delay: t0, ease: easeOut, done: () => (ring.scale = 1) });
        t0 += 0.2;
      }
    });
    return { arrive: t0, end, dir };
  }

  /** Blob travel: a chain of bouncy hops, stretched along the flight, mouth opening at the front, droplets trailing. */
  private hopRun(v: BlobVisual, x0: number, z0: number, x1: number, z1: number, ux: number, uz: number, cells: number, dur: number, delay: number, final: boolean): void {
    const r = this.r;
    const tw = this.tw;
    const pitch = r.layout.pitch;
    const dist = Math.hypot(x1 - x0, z1 - z0);
    const hops = Math.max(1, Math.min(3, Math.round(cells)));
    const hopLen = dist / hops;
    const H = pitch * (0.12 + 0.05 * Math.min(2, hopLen / pitch));
    const hopDur = dur / hops;
    let lastTrail = -1;
    tw.add(
      dur,
      (t) => {
        const f = Math.min(hops - 1e-6, t * hops);
        const k = Math.floor(f);
        const u = f - k;
        const p = (k + u) / hops;
        v.x = x0 + (x1 - x0) * p;
        v.z = z0 + (z1 - z0) * p;
        v.moveDir = [ux, uz];
        v.lift = H * 4 * u * (1 - u);
        // Stretch along the flight velocity; compressed around each contact.
        const vy = (1 - 2 * u) * (4 * H) / Math.max(0.02, hopDur);
        const vh = hopLen / Math.max(0.02, hopDur);
        const vl = Math.hypot(vh, vy) || 1;
        const contact = Math.max(0, 1 - Math.min(u, 1 - u) / 0.13);
        const stretch = 0.46 * (1 - contact) - 0.2 * contact;
        v.squash = contact > 0.55 ? { axis: [0, 1, 0], amount: stretch } : { axis: [(ux * vh) / vl, vy / vl, (uz * vh) / vl], amount: stretch };
        // The mouth opens on the leading side toward the stop (the sketch's black crescent).
        v.mouth = smoothstep(0.3, 0.75, t) * (final ? 1 : 0.7);
        if (r.now - lastTrail > 0.035 && u > 0.1 && u < 0.9) {
          lastTrail = r.now;
          r.fx.trail(v.x, v.centerY + v.lift * 0.2, v.z, ux, uz, v.radius, k % 2 ? v.genome.rimColor : v.genome.baseColor, v.id * 7 + k);
        }
      },
      { delay, ease: linear },
    );
    if (!final) return;
    // Stop: the jelly keeps going (compression along the motion, a forward fan of droplets), the mouth
    // snaps shut, then the spring wobbles it out.
    tw.add(
      0.16,
      (t) => {
        v.lift = 0;
        v.squash = { axis: [ux, 0, uz], amount: -0.36 * (1 - easeOut(t)) };
        v.mouth = 1 - easeOut(Math.min(1, t * 1.6));
      },
      {
        delay: delay + dur,
        ease: linear,
        done: () => {
          v.squash = null;
          v.mouth = 0;
          r.blobs.driver.impulse(v.id, [ux, 0.35, uz], 0.9);
          v.jiggle = 1;
        },
      },
    );
    tw.after(delay + dur, () => {
      const g = v.genome;
      r.fx.splatFan(v.x, r.layout.top + v.radius * 0.35, v.z, ux, uz, v.radius, [g.baseColor, g.rimColor, g.highlightColor], v.id);
    });
  }

  /** Walker travel: position eased by body type (heavies overshoot and stumble), the drive does the rest. */
  private walkRun(v: BlobVisual, x0: number, z0: number, x1: number, z1: number, ux: number, uz: number, cells: number, dur: number, delay: number): void {
    const r = this.r;
    const tw = this.tw;
    const pitch = r.layout.pitch;
    const dx = x1 - x0;
    const dz = z1 - z0;
    if (v.body === 'heavy') {
      const os = Math.min(0.16, 0.08 + 0.025 * cells) * pitch;
      tw.add(
        dur,
        (t) => {
          const m = easeWalk(Math.min(1, t / 0.84));
          const h = t > 0.62 ? Math.sin((Math.PI * (t - 0.62)) / 0.38) : 0;
          v.x = x0 + dx * m + ux * os * h;
          v.z = z0 + dz * m + uz * os * h;
          v.moveDir = [ux, uz];
        },
        { delay, ease: linear },
      );
      // It catches itself: a stumble, a thud and some dust.
      tw.add(0.46, (t) => (v.stumble = Math.sin(Math.PI * t) * 0.85), { delay: delay + dur * 0.78, ease: linear, done: () => (v.stumble = 0) });
      tw.after(delay + dur * 0.8, () => {
        r.kick(0.1 + 0.03 * Math.min(4, v.tier - 7));
        r.particles.burst('spore', r.now, v.x + ux * v.radius * 0.6, r.layout.top + 0.04, v.z + uz * v.radius * 0.6, 7, { up: 0.35, spread: 0.8, life: 0.7, size: 0.07, colors: [r.palette.soil, r.palette.paper], seed: v.id });
      });
      return;
    }
    tw.add(
      dur,
      (t) => {
        const m = easeWalk(t);
        v.x = x0 + dx * m;
        v.z = z0 + dz * m;
        v.moveDir = [ux, uz];
      },
      { delay, ease: linear },
    );
  }

  // ---------------------------------------------------------------------------------------- merges

  /**
   * The Creatures v3 merge move of the mover's body type (leap toward the camera and devour, coil and
   * swallow, stomp, splash), sampled through the board's time warp: the mover and its partner follow the
   * sample, the move's events fire the splashes. Null when this build has no such move.
   */
  private playGenomeMove(m: BlobVisual, s: BlobVisual | undefined, from: [number, number], to: [number, number], dir: [number, number], tA: number, tier: number): MergeTimes | null {
    const r = this.r;
    const tw = this.tw;
    const kind = mergeMoveKind(m.body);
    const yaw = Math.atan2(dir[0], dir[1]);
    const cam = r.blobs.cameraLocal;
    const cx = cam.x - from[0];
    const cy = cam.y - r.layout.top;
    const cz = cam.z - from[1];
    const cl = Math.hypot(cx, cy, cz) || 1;
    const move = genomeMergeMove(
      kind,
      { from, yaw, scale: m.fit, mass: m.spec?.motion.mass ?? 1, bounce: m.spec?.motion.bounce ?? 0.75, bodyType: m.body, timeScale: 1 },
      { x: to[0], z: to[1], radius: Math.max(0.12, s?.radius ?? 0.25) },
      { height: r.layout.pitch * (1.3 + 0.08 * Math.min(5, Math.max(0, tier - 5))), camera: [cx / cl, cy / cl, cz / cl], thickness: (m.spec?.skeleton.width ?? 0.9) * m.fit },
    );
    if (!move) return null;
    const { warp, swallowAt, contactAt } = mergeWarp(move);
    const tContact = move.timeOf('contact');
    const tSwallow = move.timeOf('swallow');
    const devours = kind === 'leapToCamera' || kind === 'coilSwallow';
    const mouth = new Vector3();
    let smp: MoveSampleLike | null = null;
    let prevTm = -1;
    let hit = false;
    const onEvent = (ev: MoveEventLike): void => {
      if (!hit && (ev.type === 'contact' || ev.type === 'splash' || ev.type === 'stomp')) {
        hit = true;
        if (kind === 'stompMerge') {
          r.kick(0.55 + 0.08 * Math.min(4, Math.max(0, tier - 7)));
          r.fx.plateWave(this.tw, 0, to[0], to[1], 1.2);
        }
      } else if (ev.type === 'launch' && m.drive) {
        r.particles.burst('spore', r.now, m.x, r.layout.top + 0.03, m.z, 6, { up: 0.35, spread: 0.7, life: 0.6, size: 0.06, colors: [r.palette.soil, r.palette.paper], seed: m.id });
      } else if (ev.type === 'bite') m.rig?.poke(0.6);
    };
    tw.add(
      swallowAt,
      (u) => {
        const tm = warp(u * swallowAt);
        smp = move.sample(tm, smp ?? undefined);
        move.forEachEvent(prevTm, tm, onEvent);
        prevTm = tm;
        const q = smp;
        m.x = q.x;
        m.z = q.z;
        m.lift = q.lift;
        m.mouth = q.mouth;
        m.mouthRound = q.mouthRound ?? 0;
        m.squint = q.squint ?? 0;
        m.jiggle = Math.max(m.jiggle, q.jiggle);
        if (m.drive) {
          m.yawTarget = q.yaw;
          m.yawDirect = true;
          m.pitch = q.pitch;
          m.pitchBlend = 1;
          m.crouch = q.crouch;
          m.coil = 0;
          m.bulge = q.bulge;
          m.trumpet = q.trumpet;
          m.squash = { axis: [q.squashAxis[0], q.squashAxis[1], q.squashAxis[2]], amount: q.squash * 0.6 };
        } else {
          const ddx = to[0] - q.x;
          const ddz = to[1] - q.z;
          const dl = Math.hypot(ddx, ddz);
          if (dl > 1e-3) m.moveDir = [ddx / dl, ddz / dl];
          m.squash = { axis: [q.squashAxis[0], q.squashAxis[1], q.squashAxis[2]], amount: q.squash };
        }
        const p = q.partner;
        if (s && p) {
          s.x = p.x;
          s.z = p.z;
          s.lift = p.lift;
          s.pop = p.visible ? Math.max(0.001, p.scale) : 0.001;
          s.labelAlpha = p.scale;
          s.squash = s.drive ? null : { axis: [0, 1, 0], amount: p.squash };
          // Swallowed: after the bite the partner is sucked into the mover's mouth (up, in, stretched thin).
          if (devours && tContact >= 0 && tm > tContact) {
            const e = Math.min(1, (tm - tContact) / Math.max(0.05, (tSwallow > tContact ? tSwallow : tContact + 0.3) - tContact));
            const k = e * e * (3 - 2 * e);
            r.blobs.mouthWorld(m, mouth);
            s.x = p.x + (mouth.x - p.x) * k;
            s.z = p.z + (mouth.z - p.z) * k;
            s.lift = Math.max(p.lift, (mouth.y - r.layout.top - s.radius * 0.6) * k);
            s.pop = Math.max(0.001, Math.min(s.pop, 1 - k * 0.92));
            if (!s.drive) {
              const ax = mouth.x - p.x;
              const ay = mouth.y - (r.layout.top + s.radius);
              const az = mouth.z - p.z;
              const al = Math.hypot(ax, ay, az) || 1;
              s.squash = { axis: [ax / al, ay / al, az / al], amount: 0.55 * Math.sin(Math.PI * Math.min(1, k * 1.2)) };
            }
          }
        }
      },
      { delay: tA, ease: linear },
    );
    const impact = tA + contactAt;
    this.impactFx(impact, to, s ?? m, m, tier, kind === 'stompMerge' ? 'stomp' : kind === 'coilSwallow' ? 'coil' : kind === 'splashMerge' ? 'splash' : 'leap');
    return { impact, swap: tA + swallowAt };
  }

  /** Blob mover: one last bouncy hop into the partner, mouth wide — splash crown, ripples, ink; the bodies melt. */
  private mergeSplash(m: BlobVisual, s: BlobVisual | undefined, from: [number, number], to: [number, number], dir: [number, number], tA: number, tier: number): MergeTimes {
    const r = this.r;
    const tw = this.tw;
    const pitch = r.layout.pitch;
    const hop = 0.17;
    const H = pitch * 0.2;
    const [ux, uz] = dir;
    tw.add(
      hop,
      (t) => {
        m.x = from[0] + (to[0] - from[0]) * t * 0.85;
        m.z = from[1] + (to[1] - from[1]) * t * 0.85;
        m.lift = H * 4 * t * (1 - t);
        m.moveDir = [ux, uz];
        const vy = (1 - 2 * t) * 2;
        const vl = Math.hypot(1, vy);
        m.squash = { axis: [ux / vl, vy / vl, uz / vl], amount: 0.5 * Math.sin(Math.PI * Math.min(1, t * 1.1)) };
        m.mouth = 0.6 + 0.4 * smoothstep(0, 0.5, t);
      },
      { delay: tA, ease: linear },
    );
    const impact = tA + hop;
    if (s) {
      // The partner braces, then takes the hit.
      tw.add(0.14, (t) => (s.squash = s.drive ? null : { axis: [0, 1, 0], amount: 0.14 * Math.sin(Math.PI * t) }), { delay: impact - 0.14, ease: linear });
      tw.add(0.22, (t) => {
        s.squash = s.drive ? null : { axis: [ux, 0, uz], amount: -0.48 * Math.sin(Math.PI * t) };
        s.pop = 1 + 0.16 * Math.sin(Math.PI * t);
      }, { delay: impact, ease: linear });
    }
    tw.add(
      0.15,
      (t) => {
        m.x = to[0] - ux * pitch * 0.07 * (1 - t);
        m.z = to[1] - uz * pitch * 0.07 * (1 - t);
        m.lift = 0;
        m.pop = Math.max(0.001, 1 - 0.95 * easeIn(t));
        m.squash = { axis: [0, 1, 0], amount: -0.5 * t };
        m.mouth = 1 - t;
        m.labelAlpha = 1 - t;
      },
      { delay: impact, ease: linear },
    );
    this.impactFx(impact, to, s ?? m, m, tier, 'splash');
    return { impact, swap: impact + 0.17 };
  }

  /** Walkers: crouch, leap up toward the camera (the shadow shrinks), mouth ripped open, dive and devour. */
  private mergeLeap(m: BlobVisual, s: BlobVisual | undefined, from: [number, number], to: [number, number], tA: number, tier: number): MergeTimes {
    const r = this.r;
    const tw = this.tw;
    const pitch = r.layout.pitch;
    const crouch = 0.08;
    const rise = 0.22;
    const hang = 0.05;
    const dive = 0.13;
    const H = pitch * (1.25 + 0.12 * Math.min(5, Math.max(0, tier - 5)));
    // Apex: above the partner, drawn a little toward the camera.
    const cam = r.blobs.cameraLocal;
    let cx = cam.x - to[0];
    let cz = cam.z - to[1];
    const cl = Math.hypot(cx, cz) || 1;
    cx /= cl;
    cz /= cl;
    const apex: [number, number] = [to[0] + cx * pitch * 0.35, to[1] + cz * pitch * 0.35];
    const faceCam = Math.atan2(cx, cz);
    tw.add(crouch, (t) => { m.crouch = easeOut(t); m.mouth = 0; }, { delay: tA, ease: linear });
    tw.add(
      rise,
      (t) => {
        const e = easeOutCubic(t);
        m.x = from[0] + (apex[0] - from[0]) * e;
        m.z = from[1] + (apex[1] - from[1]) * e;
        m.lift = H * e;
        m.crouch = 1 - Math.min(1, t * 3);
        m.pitch = -0.95 * e;
        m.pitchBlend = e;
        m.yawTarget = faceCam;
        m.mouth = smoothstep(0.3, 0.85, t);
      },
      { delay: tA + crouch, ease: linear },
    );
    tw.add(hang, (t) => { m.lift = H + pitch * 0.04 * Math.sin(Math.PI * t); m.mouth = 1; }, { delay: tA + crouch + rise, ease: linear });
    const t3 = tA + crouch + rise + hang;
    tw.add(
      dive,
      (t) => {
        const e = easeIn(t);
        m.x = apex[0] + (to[0] - apex[0]) * e;
        m.z = apex[1] + (to[1] - apex[1]) * e;
        m.lift = H * (1 - e);
        m.pitch = -0.95 + 1.6 * easeInOut(t);
        m.pitchBlend = 1;
        m.mouth = 1;
      },
      { delay: t3, ease: linear },
    );
    const impact = t3 + dive;
    if (s) {
      // The partner looks up (a small squash) and is gulped down on impact.
      tw.add(0.2, (t) => { s.crouch = Math.sin(Math.PI * t) * 0.5; s.squash = s.drive ? null : { axis: [0, 1, 0], amount: -0.12 * Math.sin(Math.PI * t) }; }, { delay: impact - 0.24, ease: linear });
      tw.add(0.12, (t) => { s.pop = Math.max(0.001, 1 - easeIn(t)); s.squash = s.drive ? null : { axis: [0, 1, 0], amount: -0.5 * t }; s.labelAlpha = 1 - t; }, { delay: impact - 0.02, ease: linear });
    }
    // Landing: chew, straighten up.
    tw.add(
      0.26,
      (t) => {
        m.lift = 0;
        m.x = to[0];
        m.z = to[1];
        m.mouth = 0.75 * (1 - t) * (0.5 + 0.5 * Math.cos(t * Math.PI * 5));
        m.pitch = 0.65 * (1 - t);
        m.pitchBlend = 1 - easeOut(t);
      },
      { delay: impact, ease: linear, done: () => { m.mouth = 0; m.pitchBlend = 0; } },
    );
    this.impactFx(impact, to, s ?? m, m, tier, 'leap');
    return { impact, swap: impact + 0.15 };
  }

  /** Snake: slithers around the partner, coils about it, then swallows it head first. */
  private mergeCoil(m: BlobVisual, s: BlobVisual | undefined, from: [number, number], to: [number, number], tA: number, tier: number): MergeTimes {
    const tw = this.tw;
    const wrapD = 0.3;
    const swallow = 0.24;
    const hug = s ? s.radius / Math.max(0.02, m.fit) + 0.55 : 1.4;
    tw.add(
      wrapD,
      (t) => {
        const e = easeInOut(t);
        m.x = from[0] + (to[0] - from[0]) * e;
        m.z = from[1] + (to[1] - from[1]) * e;
        m.coil = e;
        m.coilRadius = hug;
        m.mouth = smoothstep(0.55, 1, t);
      },
      { delay: tA, ease: linear },
    );
    const impact = tA + wrapD;
    if (s) {
      tw.add(
        swallow,
        (t) => {
          const e = easeIn(t);
          // Toward the snake's head (inner end of the coil), shrinking into its mouth.
          const d = m.drive;
          const yaw = d?.yaw ?? 0;
          const hx = -Math.cos(yaw) * hug * m.fit * 0.8;
          const hz = Math.sin(yaw) * hug * m.fit * 0.8;
          s.x = to[0] + hx * e;
          s.z = to[1] + hz * e;
          s.pop = Math.max(0.001, 1 - e);
          s.labelAlpha = 1 - t;
          s.squash = s.drive ? null : { axis: [0, 1, 0], amount: 0.3 * e };
        },
        { delay: impact, ease: linear },
      );
    }
    tw.add(
      swallow + 0.12,
      (t) => {
        m.pop = 1 + 0.14 * Math.sin(Math.PI * t);
        m.mouth = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
      },
      { delay: impact, ease: linear, done: () => { m.mouth = 0; } },
    );
    this.impactFx(impact, to, s ?? m, m, tier, 'coil');
    return { impact, swap: impact + swallow };
  }

  /** Heavy: rears up and stomps the partner flat — dust ring, plate wave, shake. */
  private mergeStomp(m: BlobVisual, s: BlobVisual | undefined, from: [number, number], to: [number, number], dir: [number, number], tA: number, tier: number): MergeTimes {
    const r = this.r;
    const tw = this.tw;
    const pitch = r.layout.pitch;
    const rear = 0.17;
    const slam = 0.1;
    const lift = pitch * 0.3;
    const [ux, uz] = dir;
    const mid: [number, number] = [from[0] + (to[0] - from[0]) * 0.35, from[1] + (to[1] - from[1]) * 0.35];
    const land: [number, number] = [to[0] - ux * pitch * 0.12, to[1] - uz * pitch * 0.12];
    tw.add(
      rear,
      (t) => {
        const e = easeOut(t);
        m.x = from[0] + (mid[0] - from[0]) * e;
        m.z = from[1] + (mid[1] - from[1]) * e;
        m.lift = lift * e;
        m.pitch = -0.45 * e;
        m.pitchBlend = 1;
        m.crouch = t < 0.25 ? t / 0.25 : Math.max(0, 1 - (t - 0.25) * 3);
        m.mouth = 0.6 * e;
      },
      { delay: tA, ease: linear },
    );
    tw.add(
      slam,
      (t) => {
        const e = easeIn(t);
        m.x = mid[0] + (land[0] - mid[0]) * e;
        m.z = mid[1] + (land[1] - mid[1]) * e;
        m.lift = lift * (1 - e);
        m.pitch = -0.45 + 0.75 * e;
      },
      { delay: tA + rear, ease: linear },
    );
    const impact = tA + rear + slam;
    tw.add(0.4, (t) => { m.pitch = 0.3 * (1 - t); m.pitchBlend = 1 - easeOut(t); m.stumble = Math.sin(Math.PI * t) * 0.6; m.mouth = 0.6 * (1 - t); m.x = land[0] + (to[0] - land[0]) * easeOut(t); m.z = land[1] + (to[1] - land[1]) * easeOut(t); }, { delay: impact, ease: linear, done: () => { m.pitchBlend = 0; m.stumble = 0; m.mouth = 0; } });
    if (s) {
      tw.add(0.16, (t) => { s.squash = s.drive ? null : { axis: [0, 1, 0], amount: -0.62 * easeOut(t) }; s.pop = Math.max(0.001, 1 - 0.85 * t); s.labelAlpha = 1 - t; }, { delay: impact - 0.01, ease: linear });
    }
    tw.after(impact, () => {
      r.kick(0.55 + 0.08 * Math.min(4, Math.max(0, tier - 7)));
      r.fx.plateWave(this.tw, 0, to[0], to[1], 1.2);
    });
    this.impactFx(impact, to, s ?? m, m, tier, 'stomp');
    return { impact, swap: impact + 0.18 };
  }

  /** Splashes of an impact, scaled by the result tier: crown, droplet arcs, ripple rings, ink splats, spores or dust. */
  private impactFx(at: number, to: [number, number], s: BlobVisual, m: BlobVisual, tier: number, style: 'splash' | 'leap' | 'coil' | 'stomp'): void {
    const r = this.r;
    const tw = this.tw;
    const fx = r.fx;
    const pal = r.palette;
    const size = Math.max(0.18, s.radius);
    const g = s.genome;
    // Splashes in the zone's Earle palette (paper, sky, teal, neon) with a touch of the creatures' jelly.
    const colors = [pal.paper, pal.sky, pal.teal, g.baseColor, pal.paper, m.genome.baseColor];
    const seed = s.id * 13 + m.id;
    const k = 0.85 + 0.08 * Math.min(6, tier);
    if (style === 'stomp') {
      fx.dust(tw, at, to[0], to[1], size * k, seed);
      fx.inkSplats(tw, at, to[0], to[1], size * 1.1, seed, 5, pal.soilDeep);
      tw.after(at, () => r.emitJuice('merge'));
      return;
    }
    fx.crown(tw, at, to[0], to[1], size * (style === 'coil' ? 0.8 : 1.0) * k, colors, seed, style === 'leap' ? 1.25 : 1);
    fx.ripple(tw, at + 0.02, to[0], to[1], size * 0.9, size * (1.6 + 0.08 * Math.min(6, tier)), style === 'coil' ? pal.sky : pal.paper, tier >= 6 ? 2 : 1);
    fx.inkSplats(tw, at + 0.03, to[0], to[1], size, seed, style === 'splash' ? 4 : 5);
    tw.after(at + 0.05, () => r.particles.burst('spore', r.now, to[0], r.layout.top + size * 1.4, to[1], 8 + Math.min(8, tier), { up: 1.0, spread: 0.6, life: 1.1, size: 0.065, colors: [pal.neon, pal.pink, pal.paper], seed: seed + 3, ring: size * 0.5 }));
    tw.after(at, () => {
      r.kick(0.18 + 0.04 * Math.min(6, tier));
      r.emitJuice('merge');
    });
  }

  /** Droplets and spores when the child pops out of the merge. */
  private mergeBurst(target: [number, number], child: BlobVisual, tier: number): void {
    const r = this.r;
    const pal = r.palette;
    const rad = child.radius;
    const waist = r.layout.top + rad * 0.7;
    r.particles.burst('droplet', r.now, target[0], waist, target[1], 8 + Math.min(10, tier * 2), { up: 1.8 + tier * 0.1, spread: 1.3, life: 0.75, size: 0.07, colors: [pal.paper, pal.sky, child.genome.baseColor], seed: child.id, ring: rad * 1.05 });
  }

  // ---------------------------------------------------------------------------------------- gull drop

  /**
   * Flatsch — the gull brings this spawn. Its shadow crosses the board and passes the cell exactly at `releaseAt`
   * (`gullTimes`, shared with audio and haptics). The blob exists from the start of the move but is not drawn
   * (`pending`); at the release it falls from above the top of the view with gravity and a vertical stretch (its
   * contact shadow grows on its own, its shadow proxy only returns near the ground) and claps onto the plate at
   * `impactAt`: flat for a moment, then the spring, an "oof" toward the camera, crown, six ink splats, droplet ring,
   * ripple, plate wave, a small kick and camera punch; the eight neighbours are shoved away, the four direct ones hop.
   */
  private dropIn(e: SpawnEvent, blob: Blob, drop: GullDrop, spawnAt: number, finalState: LevelState, vis: (id: number) => BlobVisual | undefined): GullTimes {
    const r = this.r;
    const tw = this.tw;
    const { blobs, layout } = r;
    const pal = r.palette;
    const g = gullTimes(spawnAt);
    const [x, z] = layout.cellToLocal(e.at[0], e.at[1]);
    const top = layout.top;
    const v = blobs.makeVisual(blob, e.at);
    v.pending = true;
    v.pop = 1;
    v.labelAlpha = 0;
    // Above the top of the view: the camera's height over the plate, a little lower, never on the board.
    const cam = blobs.cameraLocal;
    const h0 = Math.min(9, Math.max(4, cam.y - top - 1.5));
    v.lift = h0;
    const flight = r.launchGull(drop, g, [x, z]);
    this.gullGust(flight, e.id, finalState, vis);
    // The "oof" (and the fall's leading edge) face the camera.
    let fx = cam.x - x;
    let fz = cam.z - z;
    const fl = Math.hypot(fx, fz) || 1;
    fx /= fl;
    fz /= fl;
    const fall = g.impactAt - g.releaseAt;
    tw.add(
      fall,
      (t) => {
        v.pending = false;
        v.lift = h0 * (1 - t * t);
        // Stretched along the fall, the faster the longer.
        v.squash = { axis: [0, 1, 0], amount: 0.18 + 0.5 * t };
        v.moveDir = [fx, fz];
        v.mouth = 0.25 * t;
      },
      { delay: g.releaseAt, ease: linear },
    );
    const impact = g.impactAt;
    // Impact: flat on the plate for 0.08 s, then the spring takes over (impulse + jiggle).
    tw.add(
      0.08,
      (t) => {
        v.pending = false;
        v.lift = 0;
        v.squash = { axis: [0, 1, 0], amount: -0.6 * (1 - 0.3 * t) };
        v.mouth = 0;
      },
      {
        delay: impact,
        ease: linear,
        done: () => {
          v.squash = null;
          blobs.driver.impulse(v.id, [0, 1, 0], 1.4);
          v.jiggle = 1;
        },
      },
    );
    // "Oof": the mouth pops open toward the camera and closes again.
    tw.add(
      0.36,
      (t) => {
        v.moveDir = [fx, fz];
        v.mouth = 0.95 * Math.sin(Math.PI * Math.min(1, t * 1.25)) * (t < 0.8 ? 1 : (1 - t) * 5);
      },
      { delay: impact + 0.03, ease: linear, done: () => (v.mouth = 0) },
    );
    tw.add(0.24, (t) => (v.labelAlpha = t), { delay: impact + 0.12, ease: easeOut, done: () => (v.labelAlpha = 1) });
    // Flatsch: a splash in the zone palette with the blob's jelly, bigger than any merge of its tier — it fell a long way.
    const size = Math.max(0.2, blobs.worldScale(blob.tier));
    const colors = [pal.paper, pal.sky, v.genome.baseColor, pal.teal, pal.paper, v.genome.rimColor];
    const seed = e.id * 17 + 5;
    r.fx.crown(tw, impact, x, z, size * 1.55, colors, seed, 1.5);
    r.fx.inkSplats(tw, impact + 0.01, x, z, size * 2.1, seed, 6);
    r.fx.ripple(tw, impact + 0.02, x, z, size * 1.1, size * 3.4, pal.paper, 2);
    r.fx.plateWave(tw, impact, x, z, 1.1, 2.4);
    tw.after(impact, () => {
      r.splat(new Vector3(x, top, z), 1.0, v.genome.baseColor);
      r.particles.burst('droplet', r.now, x, top + size * 0.4, z, 10, { up: 1.2, spread: 2.2, life: 0.55, size: 0.06, colors: [pal.paper, v.genome.baseColor, pal.sky], seed: seed + 1, ring: size * 1.2 });
      r.kick(0.18);
      r.punch(0.28);
      r.emitJuice('spawn');
      r.reportCreature(v, 'spawn');
    });
    // Neighbours: the eight around are shoved away from the impact, the four direct ones hop.
    const w = layout.w;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const cx = e.at[0] + dx;
        const cy = e.at[1] + dy;
        if (cx < 0 || cy < 0 || cx >= w || cy >= layout.h) continue;
        const nb = finalState.cells[cy * w + cx];
        if (!nb) continue;
        const diag = dx !== 0 && dy !== 0;
        const l = Math.hypot(dx, dy);
        const ux = dx / l;
        const uz = dy / l;
        const at = impact + 0.03 + (diag ? 0.03 : 0);
        tw.after(at, () => {
          const n = vis(nb.id);
          if (!n || n === v) return;
          blobs.driver.impulse(n.id, [ux, 0.35, uz], diag ? 0.55 : 0.9);
          n.jiggle = Math.max(n.jiggle, diag ? 0.6 : 1);
        });
        if (!diag) {
          tw.add(
            0.28,
            (t) => {
              const n = vis(nb.id);
              if (n && n !== v) n.lift = 0.1 * Math.sin(Math.PI * t);
            },
            {
              delay: at,
              ease: easeOut,
              done: () => {
                const n = vis(nb.id);
                if (n && n !== v) n.lift = 0;
              },
            },
          );
        }
      }
    }
    return g;
  }

  /**
   * The creatures the gull's shadow sweeps over flinch as it passes (the gust of its wings): a small spring kick along
   * the flight, the closer to the path the stronger. They feel the gull even where its shadow merges with others.
   */
  private gullGust(flight: GullFlight, spawnId: number, finalState: LevelState, vis: (id: number) => BlobVisual | undefined): void {
    const { blobs, layout } = this.r;
    const { enterAt, releaseAt } = flight.spec.times;
    const reach = flight.spec.span * 0.45;
    const c = { x: 0, z: 0, hx: 0, hz: 0 };
    const w = layout.w;
    finalState.cells.forEach((b, i) => {
      if (!b || b.id === spawnId) return;
      const [bx, bz] = layout.cellToLocal(i % w, Math.floor(i / w));
      let best = Infinity;
      let at = 0;
      let hx = 0;
      let hz = 0;
      for (let t = enterAt; t <= releaseAt + 0.35; t += 1 / 60) {
        gullCenter(flight, t, c);
        const d = Math.hypot(c.x - bx, c.z - bz);
        if (d < best) {
          best = d;
          at = t;
          hx = c.hx;
          hz = c.hz;
        }
      }
      if (best > reach) return;
      const k = 1 - best / reach;
      this.tw.after(at, () => {
        const n = vis(b.id);
        if (!n || n.pending) return;
        blobs.driver.impulse(n.id, [hx, -0.5, hz], 0.25 + 0.35 * k);
        n.jiggle = Math.max(n.jiggle, 0.35 + 0.4 * k);
      });
    });
  }

  private popOut(v: BlobVisual, delay: number, id: number): void {
    const r = this.r;
    const pal = r.palette;
    this.tw.add(
      POP_S * 2,
      (t) => {
        v.pop = 1 - t;
        v.lift = t * 0.5;
        v.labelAlpha = 1 - t;
      },
      { delay, ease: easeIn, done: () => r.blobs.removeVisual(v.id, r.props) },
    );
    this.tw.after(delay, () => r.particles.burst('droplet', r.now, v.x, v.centerY, v.z, 12, { up: 2.0, spread: 1.5, life: 0.75, size: 0.07, colors: [v.genome.baseColor, pal.paper], seed: id, ring: v.radius * 1.05 }));
  }

  private popIn(p: PropInstance, duration: number): void {
    p.scale = 0.001;
    this.tw.add(duration, (t) => { p.scale = Math.max(0.001, t); p.squash = 0.4 * Math.sin(t * Math.PI); }, { ease: easeSpring, done: () => { p.scale = 1; p.squash = 0; } });
  }

  /** A layer peels off: lifts, tilts and flies away from the sun, shrinking; removed at the end. */
  private peel(p: PropInstance, delay: number, key: string): void {
    const away = this.r.awayDir;
    this.tw.add(
      0.45,
      (t) => {
        p.oy = 0.4 * Math.sin(t * Math.PI * 0.8) + 0.1 * t;
        p.ox = away.x * 0.7 * t;
        p.oz = away.z * 0.7 * t;
        p.orx = 1.3 * t;
        p.orz = 0.5 * t;
        p.scale = 1 - 0.8 * t * t;
      },
      { delay, ease: easeOut, done: () => this.r.props.remove(key) },
    );
  }

  private flyAway(p: PropInstance, key: string, duration: number, vx: number, vy: number, vz: number): void {
    this.tw.add(
      duration,
      (t) => {
        p.ox = vx * t;
        p.oz = vz * t;
        p.oy = vy * t - 1.2 * t * t;
        p.orx = 2 * t;
        p.scale = 1 - t * t;
      },
      { ease: easeOut, done: () => this.r.props.remove(key) },
    );
  }

  private bounceBlobAt(state: LevelState, at: Coord, delay: number): void {
    const v = this.blobAtCell(state, at);
    if (!v) return;
    this.tw.add(POP_S * 2, (t) => (v.lift = 0.12 * Math.sin(t * Math.PI)), { delay, ease: easeOut, done: () => (v.lift = 0) });
  }

  private blobAtCell(state: LevelState, at: Coord): BlobVisual | undefined {
    const idx = at[1] * this.r.layout.w + at[0];
    const blob = state.cells[idx];
    return blob ? this.r.blobs.get(blob.id) : undefined;
  }

  private nearestSource(state: LevelState, at: Coord): number | null {
    const sources = state.level.spawn.sources;
    if (sources.length === 0) return null;
    let best: number | null = null;
    let bestD = Infinity;
    for (const [sx, sy] of sources) {
      const d = Math.abs(sx - at[0]) + Math.abs(sy - at[1]);
      if (d < bestD) {
        bestD = d;
        best = sy * this.r.layout.w + sx;
      }
    }
    return best;
  }

  /**
   * Depart: the creature leaves its cell for the plateau rim at `edge` in its own style (hop chain, walk,
   * slither, plod) and crouches there. Tagged 'exit'. Returns the time it stands at the rim.
   */
  exit(v: BlobVisual, edge: [number, number]): number {
    const r = this.r;
    const base = r.tweens;
    this.tw = { add: (d, a, o: TweenOptions = {}) => base.add(d, a, { ...o, tag: 'exit' }), after: (sec, fn) => base.after(sec, fn, 'exit') };
    const tw = this.tw;
    const x0 = v.x;
    const z0 = v.z;
    const dx = edge[0] - x0;
    const dz = edge[1] - z0;
    const len = Math.hypot(dx, dz);
    if (len < 1e-4) return 0;
    const ux = dx / len;
    const uz = dz / len;
    const cells = len / r.layout.pitch;
    const travel = travelTime(v.body, cells, v.tier) * 1.15;
    let lead = 0;
    if (v.drive) {
      const yaw = Math.atan2(ux, uz);
      lead = 0.1;
      v.yawTarget = yaw;
      this.walkRun(v, x0, z0, edge[0], edge[1], ux, uz, cells, travel, lead);
    } else {
      lead = 0.06;
      tw.add(lead, (t) => { v.moveDir = [ux, uz]; v.squash = { axis: [ux, 0, uz], amount: -0.24 * easeOut(t) }; }, { ease: linear });
      this.hopRun(v, x0, z0, edge[0], edge[1], ux, uz, cells, travel, lead, false);
    }
    const at = lead + travel;
    // Crouch at the rim before the jump (the hero takes over for the arc).
    tw.add(0.12, (t) => { v.crouch = easeOut(t); v.lift = 0; v.squash = v.drive ? null : { axis: [0, 1, 0], amount: -0.3 * easeOut(t) }; v.mouth = 0; }, { delay: at, ease: linear });
    return at + 0.12;
  }
}
