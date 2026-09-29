import { useMemo } from 'react';
import { CanvasHost } from '../canvas/CanvasHost';
import { LabFrame } from '../overlay/LabFrame';
import { PlaceholderScene } from '../scenes/PlaceholderScene';

export function Play() {
  const controller = useMemo(() => new PlaceholderScene('#7ce6d5'), []);
  return (
    <LabFrame title="Spiel (Platzhalter)">
      <CanvasHost controller={controller} />
    </LabFrame>
  );
}
