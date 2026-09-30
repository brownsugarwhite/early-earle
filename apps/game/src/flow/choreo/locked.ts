import { rexLine } from '../../lab/grid/rex';
import { useFlowStore } from '../flowStore';
import type { FlowStage } from './stage';

/** REX, wenn ein gesperrter Knoten angetippt wird (bis die Inhalte eine Zeile `locked` liefern). */
export const LOCKED_LINE = 'Noch zu. Erst der davor.';

/**
 * Echter Modus, Tipp auf einen gesperrten Knoten: der Stein schüttelt den Kopf, REX sagt warum, ein kurzer Klang —
 * sonst passiert nichts (kein Anflug, keine Kamerafahrt).
 */
export function refuseNode(stage: FlowStage, node: number): void {
  stage.path.wobble(node);
  useFlowStore.getState().setRex(rexLine('locked', { seed: node }) ?? LOCKED_LINE);
  stage.cue('locked');
}
