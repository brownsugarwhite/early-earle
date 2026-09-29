import type { Blob, Coord, LevelState, MoveResult } from '@ee/core';
import type { Vec3 } from '@ee/genome';
import type { BoardRenderer } from './BoardRenderer';
import type { BlobVisual } from './BoardBlobs';
import type { PropInstance } from './BoardProps';
import { easeIn, easeInOut, easeOut, easeOutBack, easeOutCubic, easeSpring, easeSpringSoft, type TweenOptions } from './boardTween';
import { blossomDescs, jitter } from './boardElements';

/** Timings (seconds): slide 140 ms and merge blend 300 ms per the GDD, overlapping. */
export const SLIDE_S = 0.14;
export const MERGE_S = 0.3;
export const POP_S = 0.16;

export type JuiceKind = 'merge' | 'burst' | 'hit' | 'collect' | 'heal' | 'rescue' | 'release' | 'won' | 'calm' | 'spawn';

export interface TimelineHooks {
  /** Input may be accepted again (after slides + merges). */
  onInputOpen: () => void;
  /** Everything settled and the visuals match the final state. */
  onSettled: () => void;
}

const adjacent = (a: Coord, b: Coord): boolean => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1;

/**
 * Turns a move's events into wall-clock tweens on the board: slides (with portal dips and vent pushes),
 * merges with droplets and spores, side effects on the elements (peel, thaw, wake, unwind, lift, heal,
 * collect, burn), specials with plate flashes and a subtle shake, dynamics (rot growth, toxic ticks and
 * freezes, stray hops), graduation and spawns. Input opens after slides + merges; the state is reconciled
 * once the last tween ends.
 */
/** Tween calls of one move, all under the move's tag (so a newer move can fast-forward them). */
interface TweenScope {
  add(duration: number, apply: (t: number) => void, opts?: TweenOptions): void;
  after(seconds: number, fn: () => void): void;
}

export class BoardTimeline {
  private tw: TweenScope;

  constructor(private readonly r: BoardRenderer) {
    this.tw = { add: (d, a, o) => r.tweens.add(d, a, o), after: (sec, fn) => r.tweens.after(sec, fn) };
  }

  play(res: MoveResult<LevelState>, finalState: LevelState, hooks: TimelineHooks, tag: string): void {
    const r = this.r;
    const base = r.tweens;
    this.tw = {
      add: (d, a, o = {}) => base.add(d, a, { ...o, tag }),
      after: (sec, fn) => base.after(sec, fn, tag),
    };
    const tw = this.tw;
    // Heal memory first: the desired element set of the final state must already contain the blossoms.
    for (const e of res.events) if (e.type === 'heal' && e.to === 'healed') r.healed.add(e.at[1] * r.layout.w + e.at[0]);
    const { blobs, props, cells, layout } = r;
    const pal = r.palette;
    const now = () => r.now;
    let tEnd = 0;
    const slideEnd = SLIDE_S;
    const sideStart = slideEnd + MERGE_S * 0.4;
    const dynStart = slideEnd + MERGE_S + 0.05;
    const blobAt = (id: number): Blob | null => finalState.cells.find((b) => b?.id === id) ?? null;
    const cellIndex = (c: Coord) => c[1] * layout.w + c[0];
    const local = (c: Coord) => layout.cellToLocal(c[0], c[1]);
    const desired = r.desiredFor(finalState);
    const away = r.awayDir;
    const mark = (t: number) => (tEnd = Math.max(tEnd, t));
    // A merge result gets a new id; the settled visual is re-keyed only when its merge tween ends. Events that
    // name the result (promote, release, blasts) resolve it through this alias at build time.
    const alias = new Map<number, BlobVisual>();
    for (const e of res.events) {
      if (e.type !== 'merge') continue;
      const settled = blobs.get(e.ids[0]) ?? alias.get(e.ids[0]);
      if (settled) alias.set(e.resultId, settled);
    }
    const vis = (id: number): BlobVisual | undefined => blobs.get(id) ?? alias.get(id);

    // ---------------------------------------------------------------- phase 1: slides, pushes, stray hops
    for (const e of res.events) {
      if (e.type !== 'slide' && e.type !== 'push' && e.type !== 'strayMove') continue;
      const v = vis(e.id);
      if (!v) continue;
      if (e.type === 'slide') mark(this.slide(v, e.from, e.path, 0));
      else if (e.type === 'push') {
        const delay = dynStart;
        mark(this.slide(v, e.from, [e.to], delay, 0.2));
        // The vent under the pushed blob puffs.
        const [fx, fz] = local(e.from);
        tw.after(delay, () => r.particles.burst('spore', now(), fx, layout.top + 0.06, fz, 5, { up: 0.5, spread: 0.35, life: 0.6, size: 0.053, colors: [pal.paper, pal.sky], seed: e.id }));
      } else {
        const delay = dynStart;
        const from = local(e.from);
        const to = local(e.to);
        tw.add(
          0.24,
          (t) => {
            v.x = from[0] + (to[0] - from[0]) * t;
            v.z = from[1] + (to[1] - from[1]) * t;
            v.lift = 0.32 * Math.sin(t * Math.PI);
            v.squash = { axis: [0, 1, 0], amount: 0.3 * Math.sin(t * Math.PI) };
          },
          {
            delay,
            ease: easeInOut,
            done: () => {
              v.lift = 0;
              v.squash = null;
              blobs.driver.impulse(v.id, [0, 1, 0], 0.9);
              v.jiggle = 1;
              r.kick(0.12);
            },
          },
        );
        mark(delay + 0.24);
      }
    }

    // ---------------------------------------------------------------- everything else, in event order
    for (const e of res.events) {
      switch (e.type) {
        case 'merge': {
          const [settledId, movingId] = e.ids;
          const settled = vis(settledId);
          const moving = vis(movingId);
          const target = local(e.at);
          if (moving) {
            tw.add(
              MERGE_S * 0.6,
              (t) => {
                moving.x += (target[0] - moving.x) * t;
                moving.z += (target[1] - moving.z) * t;
                moving.pop = 1 - 0.85 * t;
                moving.labelAlpha = 1 - t;
              },
              { delay: slideEnd, ease: easeInOut, done: () => blobs.removeVisual(moving.id, props) },
            );
          }
          if (settled) {
            const resultBlob = blobAt(e.resultId) ?? { id: e.resultId, tier: e.tier, material: e.material, kind: 'normal' as const };
            let swapped = false;
            tw.add(
              MERGE_S * 0.7,
              (t) => {
                settled.squash = { axis: [0, 1, 0], amount: 0.55 * Math.sin(t * Math.PI) };
                settled.pop = 1 + 0.18 * Math.sin(t * Math.PI);
                if (t > 0.3 && !swapped) {
                  swapped = true;
                  blobs.setBlob(settled, resultBlob);
                  this.mergeSplash(target, settled, e.tier);
                }
              },
              {
                delay: slideEnd + MERGE_S * 0.35,
                ease: easeOut,
                done: () => {
                  settled.squash = null;
                  settled.pop = 1;
                  // Re-key first: the wobble belongs to the result's spring, which the visual reads from now on.
                  if (e.resultId !== settled.id) blobs.rekey(settled.id, e.resultId);
                  blobs.driver.impulse(settled.id, [0, 1, 0], 0.9);
                  settled.jiggle = 1;
                },
              },
            );
          }
          mark(slideEnd + MERGE_S * 1.05);
          break;
        }
        case 'promote': {
          const v = vis(e.id);
          if (!v) break;
          const delay = slideEnd + MERGE_S + 0.05;
          tw.after(delay, () => {
            const b = blobAt(e.id);
            if (b) blobs.setBlob(v, b);
            blobs.driver.impulse(v.id, [0, 1, 0], 1.1);
            v.jiggle = 1;
            r.particles.burst('droplet', now(), v.x, v.centerY + v.scale * 0.6, v.z, 10, { up: 1.6, spread: 1.2, life: 0.65, size: 0.06, colors: [pal.paper, pal.neon], seed: e.id, ring: v.scale * 0.9 });
          });
          mark(delay + 0.2);
          break;
        }
        case 'special': {
          const delay = slideEnd + MERGE_S;
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
            r.emitJuice('burst');
          });
          mark(delay + 0.5);
          break;
        }
        case 'tierBomb': {
          const delay = slideEnd + MERGE_S;
          e.removed.forEach((rm, k) => {
            const v = vis(rm.id);
            if (v) this.popOut(v, delay + k * 0.04, rm.id);
          });
          tw.after(delay, () => {
            r.kick(0.9);
            r.emitJuice('burst');
          });
          mark(delay + 0.5 + e.removed.length * 0.04);
          break;
        }
        case 'release':
        case 'deliver': {
          const v = vis(e.id);
          const delay = slideEnd + MERGE_S + 0.02;
          if (v) {
            const dir: Vec3 = [away.x * 0.6, 1, away.z * 0.6];
            let trail = 0;
            tw.add(
              0.5,
              (t) => {
                v.lift = t * t * 4.5;
                v.pop = 1 - 0.45 * t;
                v.squash = { axis: dir, amount: 0.5 * t };
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
          const delay = Math.max(tEnd, slideEnd + MERGE_S);
          const blob = blobAt(e.id);
          if (!blob) break;
          const v = blobs.makeVisual(blob, e.at);
          v.pop = 0.001;
          v.labelAlpha = 0;
          tw.add(
            POP_S * 1.6,
            (t) => {
              v.pop = Math.max(0.001, t);
              v.labelAlpha = t;
              v.squash = { axis: [0, 1, 0], amount: 0.35 * Math.sin(t * Math.PI) };
            },
            { delay, ease: easeSpring, done: () => (v.squash = null) },
          );
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
          const delay = sideStart;
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
          const delay = sideStart;
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
          const delay = sideStart;
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
          const delay = sideStart;
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
              r.particles.burst('droplet', now(), v.x, v.centerY, v.z, 12, { up: 1.5, spread: 1.2, life: 0.65, size: 0.06, colors: [pal.ice, pal.iceDeep, '#ffffff'], seed: e.id, ring: v.scale * 1.1 });
            });
            mark(delay + 0.5);
          }
          break;
        }
        case 'wake': {
          const v = vis(e.id);
          const delay = sideStart;
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
          const delay = sideStart;
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
          const delay = sideStart;
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
          const delay = sideStart;
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
              r.particles.burst('droplet', now(), v.x, v.centerY, v.z, 10, { up: 1.0, spread: 0.8, life: 0.55, size: 0.05, colors: [pal.ice, pal.toxic], seed: e.id, ring: v.scale * 1.1 });
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
              v.squash = { axis: [0, 1, 0], amount: 0.4 * Math.sin(t * Math.PI) };
            }, { delay, ease: easeOut, done: () => { v.lift = 0; v.squash = null; blobs.driver.impulse(v.id, [0, 1, 0], 1.0); v.jiggle = 1; } });
            tw.after(delay + 0.2, () => {
              const b = blobAt(e.id);
              if (b) blobs.setBlob(v, b);
              r.particles.burst('spore', now(), v.x, v.centerY + v.scale, v.z, 10, { up: 1.0, spread: 0.6, life: 0.8, size: 0.06, colors: [pal.paper, pal.rust, pal.pink], seed: e.id });
              r.emitJuice('calm');
            });
            mark(delay + 0.45);
          }
          break;
        }
        case 'goalProgress': {
          if (!e.done) break;
          const key = `goal:${e.index}:plinth`;
          const delay = Math.max(tEnd, slideEnd + MERGE_S);
          tw.after(delay, () => {
            props.setColor(key, pal.neon);
            const p = props.get(key);
            if (p) tw.add(0.4, (t) => (p.squash = 0.5 * Math.sin(t * Math.PI)), { ease: easeOut, done: () => (p.squash = 0) });
          });
          break;
        }
        case 'won': {
          const delay = Math.max(tEnd, slideEnd + MERGE_S) + 0.1;
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

    tw.after(slideEnd + MERGE_S, hooks.onInputOpen);
    tw.after(tEnd + 0.02, () => {
      r.reconcile(finalState);
      hooks.onSettled();
    });
  }

  // ---------------------------------------------------------------------------------------- helpers

  /** Slides a blob along `path` (portal jumps dip through the rings); returns the end time. */
  private slide(v: BlobVisual, from: Coord, path: Coord[], delay: number, duration = SLIDE_S): number {
    const r = this.r;
    const tw = this.tw;
    const { layout, props } = r;
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
    const impulseAxis: Vec3 = [0, 0, 1];
    runs.forEach((run, ri) => {
      const a = run[0]!;
      const b = run[run.length - 1]!;
      const [x0, z0] = layout.cellToLocal(a[0], a[1]);
      const [x1, z1] = layout.cellToLocal(b[0], b[1]);
      const dx = x1 - x0;
      const dz = z1 - z0;
      const len = Math.hypot(dx, dz);
      if (len > 1e-6) {
        const axis: Vec3 = [dx / len, 0, dz / len];
        impulseAxis[0] = axis[0];
        impulseAxis[2] = axis[2];
        const dur = ri === 0 && runs.length === 1 ? duration : duration * Math.max(0.5, Math.min(1, len / (layout.pitch * 2)));
        tw.add(
          dur,
          (t) => {
            v.x = x0 + dx * t;
            v.z = z0 + dz * t;
            v.squash = { axis, amount: 0.38 * Math.sin(t * Math.PI) };
          },
          { delay: t0, ease: easeOutCubic },
        );
        t0 += dur;
      } else {
        v.x = x1;
        v.z = z1;
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
    tw.after(t0, () => {
      v.squash = null;
      r.blobs.driver.impulse(v.id, impulseAxis, 0.75);
      v.jiggle = 1;
    });
    return t0;
  }

  private mergeSplash(target: [number, number], settled: BlobVisual, tier: number): void {
    const r = this.r;
    const pal = r.palette;
    // Droplets spray outward from the body's waist, spores rise from its crown — both start outside the body.
    const rad = settled.scale;
    const waist = r.layout.top + rad * 0.7;
    r.particles.burst('droplet', r.now, target[0], waist, target[1], 10 + Math.min(10, tier * 2), { up: 2.0 + tier * 0.1, spread: 1.5, life: 0.8, size: 0.075, colors: [settled.genome.baseColor, settled.genome.rimColor, pal.paper], seed: settled.id, ring: rad * 1.05 });
    r.particles.burst('spore', r.now, target[0], r.layout.top + rad * 2.1, target[1], 6 + Math.min(6, tier), { up: 1.0, spread: 0.55, life: 1.2, size: 0.065, colors: [pal.neon, settled.genome.highlightColor, pal.paper], seed: settled.id + 3, ring: rad * 0.4 });
    r.emitJuice('merge');
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
    this.tw.after(delay, () => r.particles.burst('droplet', r.now, v.x, v.centerY, v.z, 12, { up: 2.0, spread: 1.5, life: 0.75, size: 0.07, colors: [v.genome.baseColor, pal.paper], seed: id, ring: v.scale * 1.05 }));
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
}
