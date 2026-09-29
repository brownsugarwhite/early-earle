/**
 * HUD juice hooks shared by the flow and the Grid-Lab: the board reports moments (merge, burst, …) and the
 * REX line box pulses via a body class (`app.css`), so the meter reacts without a React round trip.
 */
export type RexPulseKind = 'merge' | 'burst' | 'hit' | 'collect' | 'heal' | 'rescue' | 'release' | 'won' | 'calm' | 'spawn';

let timer: ReturnType<typeof setTimeout> | null = null;

export function pulseRex(kind: RexPulseKind): void {
  if (typeof document === 'undefined') return;
  const strong = kind === 'burst' || kind === 'won' || kind === 'release' || kind === 'rescue';
  const body = document.body;
  body.classList.remove('rex-pulse', 'rex-pulse-strong');
  // Restart the CSS animation even when the previous pulse is still running.
  void body.offsetWidth;
  body.classList.add(strong ? 'rex-pulse-strong' : 'rex-pulse');
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => body.classList.remove('rex-pulse', 'rex-pulse-strong'), strong ? 650 : 450);
}
