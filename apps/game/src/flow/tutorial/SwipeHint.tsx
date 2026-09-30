import { useEffect, useState } from 'react';
import type { Dir } from '@ee/core';
import { useGridStore } from '../../lab/grid/gridStore';
import { rexAfterFirstMove } from '../../lab/grid/rex';
import { useProgress } from '../../state/progress';
import { useFlowStore } from '../flowStore';
import { readHudBands } from '../hudBands';
import { FLOW_LEVELS } from '../levels';
import { HINT_DELAY_S, hintWanted, pickSwipeDirection } from './swipeDirection';

/** Drehung des Pfeils (er zeigt im SVG nach rechts). */
const ROTATION: Record<Dir, number> = { right: 0, down: 90, left: 180, up: 270 };

/** REX nach dem ersten Wisch in Level 1 (der erste Nachschub kommt). */
function afterFirstMoveLine(): string {
  return rexAfterFirstMove(1) ?? 'Da kommt Nachschub für uns.';
}

function useFirstLevelWins(): number {
  const id = FLOW_LEVELS[0]?.level.id;
  return useProgress((s) => (id ? (s.levels[id]?.wins ?? 0) : 0));
}

/**
 * Wisch-Hinweis in Level 1 (Iteration 4, Punkt 3): ein großer Papierpfeil mitten im freien Band über dem Brett, harter
 * Tintenschatten in Sonnenrichtung, keine Kontur; er gleitet in Wischrichtung (1,2 s, bei „weniger Bewegung“ still).
 * Erscheint ≈ 2,6 s nach der Landung im Level, solange Level 1 nie gewonnen und noch kein Zug gemacht ist. Liegt
 * außerhalb des nativen Zweigs (auch in der iOS-App), nimmt keine Zeiger an. Nach dem ersten Wisch wechselt REX zur
 * Vorschau-Zeile.
 */
export function SwipeHint() {
  const phase = useFlowStore((s) => s.phase);
  const playing = useFlowStore((s) => s.playing);
  const levelIndex = useGridStore((s) => s.levelIndex);
  const moveSeq = useGridStore((s) => s.moveSeq);
  const state = useGridStore((s) => s.state);
  const wins = useFirstLevelWins();
  const wanted = hintWanted({ phase, levelIndex, playing, moveSeq, status: state?.status, firstLevelWins: wins });
  const [ready, setReady] = useState(false);
  const [band, setBand] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setReady(false);
    if (!wanted) return undefined;
    const id = window.setTimeout(() => setReady(true), HINT_DELAY_S * 1000);
    return () => window.clearTimeout(id);
  }, [wanted]);

  // Centre of the free band between the top pill and the bottom row (native frames in the app, DOM on the web).
  useEffect(() => {
    if (!ready) return undefined;
    const measure = () => {
      const b = readHudBands('level');
      setBand({ x: b.w / 2, y: (b.top + b.bottom) / 2 });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [ready]);

  // After the first swipe of the tutorial REX points at the preview (unless the move brought its own line).
  useEffect(
    () =>
      useGridStore.subscribe((s, prev) => {
        if (s.levelIndex !== 0 || prev.moveSeq !== 0 || s.moveSeq !== 1 || !s.lastMove) return;
        if (s.rex !== prev.rex || s.state?.status !== 'playing') return;
        const id = FLOW_LEVELS[0]?.level.id;
        if (id && (useProgress.getState().levels[id]?.wins ?? 0) > 0) return;
        useGridStore.setState({ rex: afterFirstMoveLine() });
      }),
    [],
  );

  const dir = wanted && ready ? pickSwipeDirection(state) : null;
  if (!dir || !band) return null;
  return (
    <div className="swipe-hint" data-testid="swipe-hint" data-dir={dir} aria-hidden="true" style={{ left: `${band.x}px`, top: `${band.y}px` }}>
      <div className="swipe-hint-turn" style={{ transform: `rotate(${ROTATION[dir]}deg)` }}>
        <svg className="swipe-hint-arrow" viewBox="0 0 120 80" width="120" height="80">
          <path d="M4 26 H66 V4 L116 40 L66 76 V54 H4 Z" />
        </svg>
      </div>
    </div>
  );
}
