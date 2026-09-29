import { FlowView } from '../flow/FlowView';

/** `/`: the whole take from the splash. Labs and editors stay reachable via the dev strip ("Lab", "Editor"). */
export function Home() {
  return <FlowView start="splash" />;
}
