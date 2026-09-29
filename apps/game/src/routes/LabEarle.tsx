import { useMemo } from 'react';
import { CanvasHost } from '../canvas/CanvasHost';
import { LabFrame } from '../overlay/LabFrame';
import { PlaceholderScene } from '../scenes/PlaceholderScene';

export function LabEarle() {
  const controller = useMemo(() => new PlaceholderScene('#b3bb6d'), []);
  return (
    <LabFrame title="P2 Earle-Lab (Platzhalter)">
      <CanvasHost controller={controller} />
    </LabFrame>
  );
}
