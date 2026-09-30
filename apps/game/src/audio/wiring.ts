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
import { SFX_IDS, type Material, type SfxId } from './sfx';
import { bus, type BusEvents } from '../state/bus';

/**
 * Binds the engine to the game: grid moves become timed sound plans, the flow's choreography beats (`flow/cue`: hop,
 * fly-in heave, jumps, landings, the plateau sinking, creatures moving out, hops along the path, the unlock, a locked
 * node) play their sounds at the exact moment, the zone and world pick music and ambience, REX's line is babbled
 * when it changes (a chirp instead for win/lose), and buttons tick (glass buttons tink).
 * Idempotent and ref-counted like the haptics (StrictMode mounts twice).
 */

/** The flow's board resolves creatures with the Tjorizo genome for every level (FlowScene `ZONE`). */
const BOARD_ZONE = 'tjorizo';

/** Phases that show (or head into) a level: its REX line, its zone. */
const inLevel = (p: FlowPhase): boolean => p === 'flyIn' || p === 'level' || p === 'depart' || p === 'intro';
const SFX = new Set<string>(SFX_IDS);

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
  const mode: SceneMode = phase === 'splash' ? 'silent' : phase === 'flyIn' || phase === 'level' || phase === 'intro' ? 'level' : 'map';
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
          guess: (tier, id, kind, material: Material) => guessCreature(BOARD_ZONE, tier, id, kind, material),
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

  // ------------------------------------------------------------------ flow (phases and choreography beats)
  const offFlow = useFlowStore.subscribe((s, prev) => {
    // A move still sounding when the level is left (win, map button) stops with it.
    if (s.phase !== prev.phase && s.phase === 'depart') audio.cancelMove();
    if (s.phase !== prev.phase || s.current !== prev.current || s.playing !== prev.playing) syncScene();
    if (s.phase !== prev.phase || s.rex !== prev.rex) syncLine();
  });
  // The scene reports every beat when it happens (scene clock, also when frames are slow): the cue is the sound id.
  const onCue = ({ cue, strength }: BusEvents['flow/cue']): void => {
    if (!SFX.has(cue)) return;
    const zone = sceneFor(useFlowStore.getState(), useGridStore.getState()).zone;
    audio.sfx(cue as SfxId, strength === undefined ? { zone } : { zone, vel: strength });
  };
  bus.on('flow/cue', onCue);

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
    bus.off('flow/cue', onCue);
    document.removeEventListener('pointerdown', onPointer, true);
    if (lineTimer) clearTimeout(lineTimer);
    audio.cancelMove();
    audio.setScene({ mode: 'silent' });
  };
}
