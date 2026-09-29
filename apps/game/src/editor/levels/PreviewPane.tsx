import { useCallback, useEffect, useRef } from 'react';
import { canRewind, type Dir, type GoalProgress } from '@ee/core';
import type { SceneController } from '../../canvas/SceneController';
import { CanvasHost } from '../../canvas/CanvasHost';
import { PerfBadge } from '../../overlay/PerfBadge';
import { GOAL_LABEL } from './draft';
import { useEditorStore } from './editorStore';
import { usePreviewStore } from './previewStore';

function goalText(g: GoalProgress): string {
  const label = GOAL_LABEL[g.type as keyof typeof GOAL_LABEL] ?? g.type;
  if (g.type === 'reachTier') return `${label} ${2 ** g.target}${g.done ? ' ✓' : ''}`;
  return `${label} ${g.progress}/${g.target}${g.done ? ' ✓' : ''}`;
}

const KEYS: Record<string, Dir> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };

/** 3D-Vorschau (CanvasHost) mit Versuch-Wähler; im Testmodus Wisch-/Tasten-Eingabe und Spiel-HUD. */
export function PreviewPane({ controller }: { controller: SceneController }) {
  const mode = usePreviewStore((s) => s.mode);
  const state = usePreviewStore((s) => s.state);
  const history = usePreviewStore((s) => s.history);
  const attempt = usePreviewStore((s) => s.attempt);
  const showNumbers = usePreviewStore((s) => s.showNumbers);
  const setMode = usePreviewStore((s) => s.setMode);
  const setAttempt = usePreviewStore((s) => s.setAttempt);
  const move = usePreviewStore((s) => s.move);
  const restart = usePreviewStore((s) => s.restart);
  const rewindMove = usePreviewStore((s) => s.rewindMove);
  const toggleNumbers = usePreviewStore((s) => s.toggleNumbers);
  const validationOk = useEditorStore((s) => s.validation.ok);
  const swipe = useRef<{ x: number; y: number; id: number } | null>(null);

  const exitPlay = useCallback(() => {
    setMode('edit');
    useEditorStore.getState().syncPreview();
  }, [setMode]);
  const enterPlay = () => {
    useEditorStore.getState().syncPreview();
    setMode('play');
    // Auf dem Handy braucht das Brett Platz: Sheet einklappen (Desktop legt beides nebeneinander).
    if (window.innerWidth < 900) useEditorStore.getState().setSheet('peek');
  };

  useEffect(() => {
    if (mode !== 'play') return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA')) return;
      const dir = KEYS[e.key];
      if (dir) {
        e.preventDefault();
        move(dir);
      } else if (e.key === 'Backspace') rewindMove();
      else if (e.key === 'r') restart();
      else if (e.key === 'Escape') exitPlay();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, move, rewindMove, restart, exitPlay]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (mode !== 'play') return;
    swipe.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s || s.id !== e.pointerId || mode !== 'play') return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
  };

  const next = state?.spawnQueue[0];
  const status = state?.status ?? 'playing';
  const noLimit = (state?.level.moves ?? 0) >= 99;

  return (
    <div className="ed-preview" data-mode={mode} data-testid="preview">
      <div className="ed-swipe" onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => (swipe.current = null)}>
        <CanvasHost controller={controller} />
      </div>
      <div className="ed-preview-hud">
        <div className="ed-hud-row">
          {mode === 'edit' ? (
            <>
              <span className="ed-pill">Vorschau</span>
              <span className="ed-pill ed-pill-ctl">
                <button type="button" className="ed-mini" aria-label="Voriger Versuch" onClick={() => setAttempt(attempt - 1)} disabled={attempt <= 1}>
                  −
                </button>
                Versuch {attempt}
                <button type="button" className="ed-mini" aria-label="Nächster Versuch" onClick={() => setAttempt(attempt + 1)}>
                  +
                </button>
              </span>
              <button type="button" className="ed-btn ed-btn-small ed-btn-primary" onClick={enterPlay} disabled={!validationOk} data-testid="play-btn">
                Testen ▶
              </button>
            </>
          ) : (
            <>
              <span className="ed-pill">{noLimit ? 'Züge: frei' : `Züge ${state?.movesLeft ?? 0}`}</span>
              <span className="ed-pill">Punkte {state?.score ?? 0}</span>
              {next ? <span className="ed-pill">Nächster {next.kind === 'amoeba' ? 'A' : 2 ** next.tier}</span> : null}
              {state?.goalProgress.map((g, i) => (
                <span key={i} className="ed-pill" data-done={g.done}>
                  {goalText(g)}
                </span>
              ))}
            </>
          )}
          {!validationOk && mode === 'edit' ? <span className="ed-pill ed-pill-warn">Zeigt den letzten gültigen Stand</span> : null}
        </div>
        {mode === 'play' && status !== 'playing' ? (
          <div className="ed-banner" data-status={status} data-testid="play-banner">
            {status === 'won' ? 'Geschafft!' : 'Verloren.'}
            <button type="button" className="ed-btn ed-btn-small" onClick={restart}>
              Nochmal
            </button>
            <button type="button" className="ed-btn ed-btn-small" onClick={() => setAttempt(attempt + 1)}>
              Nächster Versuch
            </button>
          </div>
        ) : null}
        {mode === 'play' ? (
          <div className="ed-hud-row ed-hud-bottom">
            <span className="ed-pill">Versuch {attempt}</span>
            <button type="button" className="ed-btn ed-btn-small" onClick={rewindMove} disabled={!history || !canRewind(history)} data-testid="rewind-btn">
              ⟲ Zurück
            </button>
            <button type="button" className="ed-btn ed-btn-small" onClick={restart} data-testid="restart-btn">
              ↻ Neu
            </button>
            <button type="button" className="ed-btn ed-btn-small" onClick={() => setAttempt(attempt + 1)}>
              Versuch +
            </button>
            <button type="button" className="ed-btn ed-btn-small" onClick={toggleNumbers}>
              {showNumbers ? 'Zahlen aus' : 'Zahlen an'}
            </button>
            <button type="button" className="ed-btn ed-btn-small ed-btn-primary" onClick={exitPlay} data-testid="edit-btn">
              ✕ Bearbeiten
            </button>
          </div>
        ) : null}
        <div className="ed-perf" data-play={mode === 'play'}>
          <PerfBadge />
        </div>
      </div>
    </div>
  );
}
