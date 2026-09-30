import rexJson from '@content/rex/lines.json';
import { useGridStore, type GridLabState } from '../lab/grid/gridStore';
import { useFlowStore, type FlowPhase, type FlowState } from '../flow/flowStore';
import { FLOW_LEVELS } from '../flow/levels';
import { audio, type AudioScene, type SceneMode } from './engine';
import { planMove } from './timeline';
import { guessCreature, loadCreatureRules } from './bodies';
import { isZoneKey, type ZoneKey } from './scales';
import { worldForZone } from './ambient';
import { moodForText, type RexMood } from './rex';
import type { Material } from './sfx';

/**
 * Binds the engine to the game: grid moves become timed sound plans, flow phases get their transitions
 * (hop, fly-in heave, jump, depart chime, landing), the zone and world pick music and ambience, REX's line
 * is babbled when it changes (a chirp instead for win/lose), and buttons tick (glass buttons tink).
 * Idempotent and ref-counted like the haptics (StrictMode mounts twice).
 */

/** Flow timings mirrored from FlowScene (T_HOP, T_RISE_AT, T_HERO_LAUNCH, T_HERO_FLIGHT). */
const T_HOP = 1.4;
const T_RISE_AT = 0.26;
const T_HERO_LAUNCH = 0.64;
const T_HERO_FLIGHT = 0.6;

const inLevel = (p: FlowPhase): boolean => p === 'flyIn' || p === 'level' || p === 'depart';

/** Trigger → mood for every known REX line. */
function moodIndex(): (text: string) => RexMood {
  const map = new Map<string, RexMood>();
  const triggers = (rexJson as { triggers?: Record<string, Array<{ lines: string[] }>> }).triggers ?? {};
  for (const [trigger, entries] of Object.entries(triggers)) {
    const mood: RexMood = /^(win|combo|celebrate|release|finale|intro)/.test(trigger) ? 'happy' : /^(lose|hard|idle)/.test(trigger) ? 'worried' : 'neutral';
    for (const e of entries) for (const line of e.lines) map.set(line, mood);
  }
  return (text) => map.get(text) ?? moodForText(text);
}

function sceneFor(flow: FlowState, grid: GridLabState): AudioScene {
  const phase = flow.phase;
  const node = inLevel(phase) ? (flow.playing ?? flow.current) : flow.current;
  const level = inLevel(phase) ? (grid.level ?? FLOW_LEVELS[node]?.level) : FLOW_LEVELS[node]?.level;
  const zone: ZoneKey = isZoneKey(level?.zone) ? level.zone : 'tjorizo';
  const mode: SceneMode = phase === 'splash' ? 'silent' : phase === 'flyIn' || phase === 'level' ? 'level' : 'map';
  return { zone, world: worldForZone(zone, node % 25), mode };
}

let installs = 0;
let dispose: (() => void) | null = null;

/** Installs the audio layer for the flow; returns the release function (for `useEffect`). */
export function installAudio(): () => void {
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
  audio.arm();
  void loadCreatureRules();
  const moodOf = moodIndex();

  // ------------------------------------------------------------------ scene (music + ambience)
  let sceneKey = '';
  const syncScene = (): void => {
    const sc = sceneFor(useFlowStore.getState(), useGridStore.getState());
    const key = `${sc.zone}|${sc.world}|${sc.mode}`;
    if (key === sceneKey) return;
    sceneKey = key;
    audio.setScene(sc);
  };
  syncScene();

  // ------------------------------------------------------------------ REX line
  let lastLine: string | null = null;
  let lineTimer: ReturnType<typeof setTimeout> | null = null;
  let quietUntil = 0;
  const syncLine = (): void => {
    const flow = useFlowStore.getState();
    if (flow.phase === 'splash' || flow.phase === 'hop') {
      lastLine = null;
      return;
    }
    const line = inLevel(flow.phase) ? useGridStore.getState().rex : flow.rex;
    if (line === lastLine) return;
    lastLine = line;
    if (lineTimer) clearTimeout(lineTimer);
    lineTimer = null;
    if (!line || audio.rexDriver !== 'store') return;
    // Let the line settle (depart → map sets two lines in one tick), then start with REX's jaw: the REX
    // character talks 0.12 s after a level line and 0.05 s after a map line (flow/Rex.ts).
    const delay = inLevel(flow.phase) ? 0.12 : 0.05;
    lineTimer = setTimeout(() => {
      lineTimer = null;
      if (performance.now() < quietUntil) return;
      audio.say(line, moodOf(line), Math.max(0, delay - 0.03));
    }, 30);
  };

  // ------------------------------------------------------------------ grid (moves)
  const offGrid = useGridStore.subscribe((s, prev) => {
    const sameRun = s.level === prev.level && s.levelIndex === prev.levelIndex && s.attempt === prev.attempt;
    if (!sameRun) {
      audio.cancelMove();
      const phase = useFlowStore.getState().phase;
      if (s.level === prev.level && s.attempt !== prev.attempt && phase === 'level') audio.sfx('restart', { zone: sceneFor(useFlowStore.getState(), s).zone });
    } else if (s.moveSeq !== prev.moveSeq) {
      if (s.lastMove && s.lastMove !== prev.lastMove) {
        const zone = sceneFor(useFlowStore.getState(), s).zone;
        const plan = planMove(s.lastMove, {
          zone,
          prev: prev.state,
          // The board draws the creatures of the level's zone (BoardRenderer.load → setCreatureZone).
          guess: (tier, id, kind, material: Material) => guessCreature(s.level?.zone ?? 'tjorizo', tier, id, kind, material),
        });
        audio.playMove(plan.sounds);
        if (plan.won) {
          quietUntil = performance.now() + (plan.endAt + 2.2) * 1000;
          audio.chirp('yay', plan.endAt + 1.05);
        } else if (plan.lost) {
          quietUntil = performance.now() + (plan.endAt + 1.8) * 1000;
          audio.chirp('ohno', plan.endAt + 0.7);
        } else if (plan.bigMergeAt !== null && s.rex === prev.rex) {
          audio.chirp('wow', plan.bigMergeAt + 0.45);
        }
      } else if (!s.lastMove) {
        audio.cancelMove();
        audio.sfx('rewind', { zone: sceneFor(useFlowStore.getState(), s).zone });
      }
    }
    if (s.pendingDir !== null && prev.pendingDir === null && s.animating) audio.hurry(5);
    if (s.level !== prev.level) syncScene();
    if (s.rex !== prev.rex) syncLine();
  });

  // ------------------------------------------------------------------ flow (phases)
  let departWon = false;
  const offFlow = useFlowStore.subscribe((s, prev) => {
    if (s.phase !== prev.phase) {
      const zone = sceneFor(s, useGridStore.getState()).zone;
      const from = prev.phase;
      switch (s.phase) {
        case 'hop':
          audio.sfx('hop', { zone }, 0.1);
          audio.sfx('land', { zone }, 0.1 + T_HOP - 0.32);
          break;
        case 'flyIn':
          audio.sfx('select', { zone });
          audio.sfx('flyIn', { zone }, 0.02);
          audio.sfx('rise', { zone }, T_RISE_AT);
          audio.sfx('heroJump', { zone }, T_HERO_LAUNCH - 0.1);
          audio.sfx('land', { zone }, T_HERO_LAUNCH + T_HERO_FLIGHT);
          break;
        case 'depart': {
          audio.cancelMove();
          const won = useGridStore.getState().state?.status === 'won';
          departWon = won;
          if (won) audio.sfx('depart', { zone }, 0.45);
          else audio.sfx('flyIn', { zone }, 0.25);
          audio.sfx('sink', { zone }, won ? 0.7 : 0.3);
          break;
        }
        case 'map':
          if (from === 'depart') {
            audio.sfx('land', { zone });
            // A won level opens the next node on the path.
            if (departWon) audio.sfx('nodeUnlock', { zone }, 0.15);
            departWon = false;
          }
          break;
        default:
          break;
      }
    } else if (s.phase === 'map' && s.current !== prev.current) {
      // Debug hop to the next node / progress without a level.
      audio.sfx('land', { zone: sceneFor(s, useGridStore.getState()).zone }, 0.85);
    }
    if (s.phase !== prev.phase || s.current !== prev.current || s.playing !== prev.playing) syncScene();
    if (s.phase !== prev.phase || s.rex !== prev.rex) syncLine();
  });

  // ------------------------------------------------------------------ UI taps
  const onPointer = (e: PointerEvent): void => {
    const target = e.target as Element | null;
    const el = target?.closest?.('button, a[href], [role="button"], select, summary');
    if (!el || (el as HTMLButtonElement).disabled || el.closest('[data-sfx="none"]')) return;
    audio.ui(el.classList.contains('glass') || el.classList.contains('glass-btn') ? 'glass' : 'tick');
  };
  document.addEventListener('pointerdown', onPointer, true);

  syncLine();

  return () => {
    offGrid();
    offFlow();
    document.removeEventListener('pointerdown', onPointer, true);
    if (lineTimer) clearTimeout(lineTimer);
    audio.cancelMove();
    audio.setScene({ mode: 'silent' });
  };
}
