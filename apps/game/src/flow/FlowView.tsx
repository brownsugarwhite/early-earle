import { useEffect, useLayoutEffect, useMemo } from 'react';
import { CanvasHost } from '../canvas/CanvasHost';
import { FLOW_LEVELS } from './levels';
import { FlowScene, type FlowSceneOptions } from './FlowScene';
import { FlowHud } from './FlowHud';
import { FlowSplash } from './FlowSplash';
import { useFlowStore } from './flowStore';
import { useGridStore } from '../lab/grid/gridStore';
import { useProgress } from '../state/progress';
import { installAudio } from '../audio/wiring';
import '../klassik';
import '../styles/flow.css';

/** The one-take composition: canvas + glass HUD + splash overlay. `/` starts at the splash, `/play` on the map. */
export function FlowView({ start }: FlowSceneOptions) {
  // Reset the store before the scene mounts (layout effect runs before CanvasHost's effect).
  useLayoutEffect(() => {
    useFlowStore.getState().reset(start, FLOW_LEVELS.length);
    // Gespeicherten Fortschritt fortsetzen: Held und Kamera starten am zuletzt gewählten Knoten.
    const saved = useProgress.getState();
    useFlowStore.getState().setCurrent(Math.min(Math.max(saved.current, 0), FLOW_LEVELS.length - 1));
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
