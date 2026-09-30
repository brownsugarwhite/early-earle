import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { useGridStore } from '../lab/grid/gridStore';
import { bus } from '../state/bus';
import { planMove } from '../audio/timeline';
import { guessCreature } from '../audio/bodies';

/** Mirrors the board timeline in flow/LevelBoard.ts (SLIDE_S 0.14 s, MERGE_S 0.3 s): slide stop, merge pop. */
const SLIDE_MS = 140;
const MERGE_POP_MS = 140 + 300 * 0.4;

let installs = 0;
let dispose: (() => void) | null = null;

/**
 * Haptics for the game flow: light impact when the slide stops, medium on a merge, medium when the gull's drop
 * lands (the audio plan's `gullAt`, same times as the board), success on a win, warning on a loss, a soft tick on
 * rewind. Idempotent (ref-counted); no-op outside the native app. Returns the release function for `useEffect`.
 */
export function installHaptics(): () => void {
  installs += 1;
  if (!dispose) dispose = wire();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    installs -= 1;
    if (installs === 0) {
      dispose?.();
      dispose = null;
    }
  };
}

function wire(): () => void {
  if (!Capacitor.isNativePlatform()) return () => undefined;

  const timers = new Set<ReturnType<typeof setTimeout>>();
  const later = (ms: number, fn: () => void): ReturnType<typeof setTimeout> => {
    const t = setTimeout(() => {
      timers.delete(t);
      fn();
    }, ms);
    timers.add(t);
    return t;
  };
  const fire = (p: Promise<unknown>): void => {
    p.catch(() => undefined);
  };
  const light = (): void => fire(Haptics.impact({ style: ImpactStyle.Light }));
  const medium = (): void => fire(Haptics.impact({ style: ImpactStyle.Medium }));
  let pendingMerge: ReturnType<typeof setTimeout> | null = null;
  // The gull's splat: when it is due (performance.now ms), so a queued swipe can hurry it like the board.
  let gull: { timer: ReturnType<typeof setTimeout>; due: number } | null = null;
  const clearGull = (): void => {
    if (!gull) return;
    clearTimeout(gull.timer);
    timers.delete(gull.timer);
    gull = null;
  };
  const scheduleGull = (ms: number): void => {
    clearGull();
    const timer = later(ms, () => {
      gull = null;
      medium();
    });
    gull = { timer, due: performance.now() + ms };
  };

  const unsubscribe = useGridStore.subscribe((s, prev) => {
    const sameRun = s.level === prev.level && s.levelIndex === prev.levelIndex && s.attempt === prev.attempt;
    if (!sameRun) clearGull();
    if (sameRun && s.moveSeq !== prev.moveSeq) {
      if (s.lastMove && s.lastMove !== prev.lastMove) {
        later(SLIDE_MS, light);
        const plan = planMove(s.lastMove, { zone: 'tjorizo', prev: prev.state, guess: (tier, id, kind, material) => guessCreature('tjorizo', tier, id, kind, material) });
        if (plan.gullAt !== null) scheduleGull(plan.gullAt * 1000);
        if (s.lastMove.mergeCount > 0) {
          pendingMerge = later(MERGE_POP_MS, () => {
            pendingMerge = null;
            medium();
          });
        }
      } else if (!s.lastMove) {
        clearGull();
        light(); // rewind
      }
    }
    // A queued swipe plays the rest of the move 5× faster (board and audio): the splat comes sooner too.
    if (gull && s.pendingDir !== null && prev.pendingDir === null && s.animating) scheduleGull(Math.max(0, gull.due - performance.now()) / 5);
    const status = s.state?.status;
    if (sameRun && status !== prev.state?.status) {
      if (status === 'won') later(MERGE_POP_MS + 150, () => fire(Haptics.notification({ type: NotificationType.Success })));
      else if (status === 'lost') later(SLIDE_MS + 250, () => fire(Haptics.notification({ type: NotificationType.Warning })));
    }
  });

  // A renderer that reports completion moves the merge pop to the real moment.
  const onDone = (): void => {
    if (pendingMerge) {
      clearTimeout(pendingMerge);
      timers.delete(pendingMerge);
      pendingMerge = null;
      medium();
    }
  };
  bus.on('animationDone', onDone);

  return () => {
    unsubscribe();
    bus.off('animationDone', onDone);
    for (const t of timers) clearTimeout(t);
    timers.clear();
    pendingMerge = null;
    gull = null;
  };
}
