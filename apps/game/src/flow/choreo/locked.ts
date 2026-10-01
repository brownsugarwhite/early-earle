import { rexLine } from '../../lab/grid/rex';
import { useFlowStore } from '../flowStore';
import type { PathLayout } from '../path';
import type { FlowStage } from './stage';

/** REX, wenn ein gesperrter Knoten angetippt wird (bis die Inhalte eine Zeile `locked` liefern). */
export const LOCKED_LINE = 'Noch zu. Erst der davor.';
/** REX am Torknoten der angedeuteten Zone (Route 15 + 1), bis die Inhalte eine Zeile `gate` liefern. */
export const GATE_LINE = 'Hier wächst die nächste Welt. Bald.';

/** Ist `node` der Torknoten (der letzte Knoten, vor der angedeuteten Zone 16)? */
export function isGateNode(layout: PathLayout, node: number): boolean {
  return node === layout.lastNode && layout.node(node).gate === true;
}

/** REX-Zeile am Torknoten (`gate`). */
export function gateLine(node: number): string {
  return rexLine('gate', { seed: node }) ?? GATE_LINE;
}

/**
 * Echter Modus, Tipp auf einen gesperrten Knoten: der Stein schüttelt den Kopf, REX sagt warum, ein kurzer Klang —
 * sonst passiert nichts (kein Anflug, keine Kamerafahrt).
 */
export function refuseNode(stage: FlowStage, node: number): void {
  stage.path.wobble(node);
  useFlowStore.getState().setRex(isGateNode(stage.layout, node) ? gateLine(node) : (rexLine('locked', { seed: node }) ?? LOCKED_LINE));
  stage.cue('locked');
}
