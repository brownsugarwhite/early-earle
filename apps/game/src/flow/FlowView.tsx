import { useEffect, useLayoutEffect, useMemo } from 'react';
import { useLocation } from 'react-router';
import { CanvasHost } from '../canvas/CanvasHost';
import { FLOW_LEVELS } from './levels';
import { FlowScene, type FlowSceneOptions } from './FlowScene';
import { FlowHud } from './FlowHud';
import { FlowSplash } from './FlowSplash';
import { useFlowStore } from './flowStore';
import { useGridStore } from '../lab/grid/gridStore';
import { useProgress } from '../state/progress';
import { bus } from '../state/bus';
import { applyProgressParams, parseProgressParams } from '../state/progressParams';
import { WERKSTATT_ENABLED } from '../overlay/WerkstattButton';
import { clampCurrent, STORY_AFTER_LEVEL_1 } from './progression/gate';
import { pickSwipeDirection } from './tutorial/swipeDirection';
import { installAudio } from '../audio/wiring';
import '../styles/flow.css';

/** The one-take composition: canvas + glass HUD + splash overlay. `/` starts at the splash, `/play` on the map. */
export function FlowView({ start }: FlowSceneOptions) {
  const { search } = useLocation();
  // Reset the store before the scene mounts (layout effect runs before CanvasHost's effect).
  useLayoutEffect(() => {
    // Werkstatt switches from the address (?mode=free, ?level=12, ?intro=1 …) — never in store builds, which always play
    // the real game.
    const { story } = applyProgressParams(parseProgressParams(search), useProgress.getState(), {
      enabled: WERKSTATT_ENABLED,
      firstLevelId: FLOW_LEVELS[0]?.level.id,
      nodeCount: FLOW_LEVELS.length,
      introStories: [STORY_AFTER_LEVEL_1],
    });
    if (!WERKSTATT_ENABLED && useProgress.getState().mode !== 'real') useProgress.getState().setMode('real');
    useFlowStore.getState().reset(start, FLOW_LEVELS.length);
    useFlowStore.getState().setPendingStory(story);
    // Gespeicherten Fortschritt fortsetzen: Held und Kamera starten am zuletzt gewählten Knoten (echt: nie hinter dem
    // erreichten, damit „Spielen“ immer ein offenes Level startet).
    const saved = useProgress.getState();
    useFlowStore.getState().setCurrent(clampCurrent(saved.current, saved, FLOW_LEVELS.length));
    // `search` is read once per mount (the scene is built per `start`, a changed query needs a reload anyway).
  }, [start]);
  // Fortschritt mitschreiben: gewählter Knoten, Versuche (Levelstart/Neu), Siege mit Bestwerten.
  useEffect(() => {
    const offFlow = useFlowStore.subscribe((s, prev) => {
      if (s.current !== prev.current) useProgress.getState().setCurrent(s.current);
    });
    const offGrid = useGridStore.subscribe((s, prev) => {
      if (!s.level) return;
      if (s.level.id !== prev.level?.id || s.attempt !== prev.attempt) useProgress.getState().recordAttempt(s.level.id);
      if (s.state?.status === 'won' && prev.state?.status !== 'won') {
        const flow = useFlowStore.getState();
        const node = flow.playing ?? flow.current;
        useProgress.getState().recordWin(s.level.id, node, s.state.score, s.state.movesLeft, FLOW_LEVELS.length);
      }
    });
    return () => {
      offFlow();
      offGrid();
    };
  }, []);
  // Dev/E2E: the stores the flow runs on (the scene itself is `window.__ee.controller`), and the swipe the hint would
  // show (tests win the tutorial levels whatever their layout).
  useEffect(() => {
    if (!import.meta.env.DEV) return undefined;
    const w = window as unknown as { __eeFlow?: unknown };
    w.__eeFlow = { flow: useFlowStore, grid: useGridStore, progress: useProgress, bus, pickSwipe: () => pickSwipeDirection(useGridStore.getState().state) };
    return () => {
      delete w.__eeFlow;
    };
  }, []);
  // Audio: procedural sound for moves, flow phases, REX, music and ambience (unlocks on the first tap).
  useEffect(() => installAudio(), []);
  const controller = useMemo(() => new FlowScene({ start }), [start]);
  return (
    <div className="flow-root">
      <CanvasHost controller={controller} />
      <FlowHud />
      <FlowSplash />
    </div>
  );
}
