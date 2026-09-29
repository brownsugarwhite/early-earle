import { useMemo } from 'react';
import { CanvasHost } from '../canvas/CanvasHost';
import { LabFrame } from '../overlay/LabFrame';
import { PlaceholderScene } from '../scenes/PlaceholderScene';

export function LabGrid() {
  const controller = useMemo(() => new PlaceholderScene('#e5aed4'), []);
  return (
    <LabFrame title="P3 Grid-Lab (Platzhalter)">
      <CanvasHost controller={controller} />
    </LabFrame>
  );
}
