import { useLayoutEffect, useMemo } from 'react';
import { CanvasHost } from '../canvas/CanvasHost';
import { FLOW_LEVELS } from './levels';
import { FlowScene, type FlowSceneOptions } from './FlowScene';
import { FlowHud } from './FlowHud';
import { FlowSplash } from './FlowSplash';
import { useFlowStore } from './flowStore';
import '../styles/flow.css';

/** The one-take composition: canvas + glass HUD + splash overlay. `/` starts at the splash, `/play` on the map. */
export function FlowView({ start }: FlowSceneOptions) {
  // Reset the store before the scene mounts (layout effect runs before CanvasHost's effect).
  useLayoutEffect(() => {
    useFlowStore.getState().reset(start, FLOW_LEVELS.length);
  }, [start]);
  const controller = useMemo(() => new FlowScene({ start }), [start]);
  return (
    <div className="flow-root">
      <CanvasHost controller={controller} />
      <FlowHud />
      <FlowSplash />
    </div>
  );
}
