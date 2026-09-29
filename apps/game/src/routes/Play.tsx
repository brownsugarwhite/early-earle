import { FlowView } from '../flow/FlowView';

/** `/play`: the flow starting on the map (no splash). */
export function Play() {
  return <FlowView start="map" />;
}
