import { useEffect, useRef } from 'react';
import type { Dir, GoalProgress } from '@ee/core';
import { CanvasHost } from '../../canvas/CanvasHost';
import { PerfBadge } from '../../overlay/PerfBadge';
import { GOAL_LABEL } from './draft';
import type { EditorPreviewScene } from './EditorPreviewScene';
import { useEditorStore } from './editorStore';
import { usePreviewStore } from './previewStore';
import { BlobGlyph, UiIcon } from './icons';
import type { Rect } from './BoardStage';

function goalText(g: GoalProgress): string {
  const label = GOAL_LABEL[g.type as keyof typeof GOAL_LABEL] ?? g.type;
  if (g.type === 'reachTier') return `${label} ${2 ** g.target}${g.done ? ' ✓' : ''}`;
  return `${label} ${g.progress}/${g.target}${g.done ? ' ✓' : ''}`;
}

const KEYS: Record<string, Dir> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
const SWIPE_PX = 30;

export type PreviewVariant = 'pip' | 'split' | 'full' | 'hidden';

/**
 * 3D-Vorschau (derselbe Renderer wie das Spiel). Bauen: kleines Fenster (Handy) oder rechte Hälfte (Desktop),
 * antippen = Testen. Testen: füllt die Bühne, Wischen spielt, zwei Finger zoomen/verschieben die Kamera.
 * Der Canvas bleibt immer eingehängt — das Umschalten ist sofort da.
 */
export function PreviewPane({ controller, rect, variant }: { controller: EditorPreviewScene; rect: Rect | null; variant: PreviewVariant }) {
  const mode = usePreviewStore((s) => s.mode);
  const state = usePreviewStore((s) => s.state);
  const attempt = usePreviewStore((s) => s.attempt);
  const move = usePreviewStore((s) => s.move);
  const view = usePreviewStore((s) => s.view);
  const resetView = usePreviewStore((s) => s.resetView);
  const showNumbers = usePreviewStore((s) => s.showNumbers);
  const toggleNumbers = usePreviewStore((s) => s.toggleNumbers);
  const validationOk = useEditorStore((s) => s.validation.ok);
  const enterPlay = useEditorStore((s) => s.enterPlay);
  const exitPlay = useEditorStore((s) => s.exitPlay);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const swipe = useRef<{ id: number; x: number; y: number; done: boolean; blocked: boolean } | null>(null);
  const pinch = useRef<{ d0: number; mx: number; my: number; zoom: number; panX: number; panZ: number } | null>(null);

  useEffect(() => {
    if (mode !== 'play') return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA')) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const dir = KEYS[e.key];
      const ps = usePreviewStore.getState();
      if (dir) {
        e.preventDefault();
        ps.move(dir);
      } else if (e.key === 'Backspace') ps.rewindMove();
      else if (e.key === 'r') ps.restart();
      else if (e.key === 'n') ps.nextAttempt();
      else if (e.key === 'Escape') exitPlay();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, exitPlay]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (mode !== 'play') return;
    if (e.isPrimary) {
      pointers.current.clear();
      pinch.current = null;
    }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const v = usePreviewStore.getState().view;
      pinch.current = { d0: Math.hypot(a!.x - b!.x, a!.y - b!.y), mx: (a!.x + b!.x) / 2, my: (a!.y + b!.y) / 2, zoom: v.zoom, panX: v.panX, panZ: v.panZ };
      if (swipe.current) swipe.current.blocked = true;
      return;
    }
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* Zeiger schon weg */
    }
    swipe.current = { id: e.pointerId, x: e.clientX, y: e.clientY, done: false, blocked: false };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (mode !== 'play') return;
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pz = pinch.current;
    if (pz && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      const mx = (a!.x + b!.x) / 2;
      const my = (a!.y + b!.y) / 2;
      const k = controller.worldPerPixel();
      usePreviewStore.getState().setView({
        zoom: Math.max(0.6, Math.min(3, pz.zoom * (d / Math.max(1, pz.d0)))),
        panX: pz.panX - (mx - pz.mx) * k,
        panZ: pz.panZ - (my - pz.my) * k,
      });
      return;
    }
    const s = swipe.current;
    if (!s || s.id !== e.pointerId || s.done || s.blocked) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_PX) return;
    s.done = true;
    move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    const s = swipe.current;
    if (s && s.id === e.pointerId) swipe.current = null;
  };

  const onPipClick = () => {
    if (mode === 'edit') enterPlay();
  };

  const next = state?.spawnQueue[0];
  const status = state?.status ?? 'playing';
  const noLimit = (state?.level.moves ?? 0) >= 99;
  const hostStyle: React.CSSProperties = rect ? { left: rect.x, top: rect.y, width: rect.w, height: rect.h } : { left: 0, top: 0, width: 2, height: 2 };
  const viewChanged = view.zoom !== 1 || view.panX !== 0 || view.panZ !== 0;

  return (
    <div className="ed-preview" data-mode={mode} data-variant={rect ? variant : 'hidden'} data-testid="preview" style={hostStyle}>
      <div
        className="ed-swipe"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={variant === 'pip' || variant === 'split' ? onPipClick : undefined}
        role={mode === 'edit' ? 'button' : undefined}
        aria-label={mode === 'edit' ? '3D-Vorschau — antippen zum Testen' : 'Spielfeld — wischen zum Ziehen'}
      >
        <CanvasHost controller={controller} />
      </div>
      {mode === 'edit' && rect ? (
        <div className="ed-pip-label" aria-hidden="true">
          {validationOk ? (
            <>
              <UiIcon name="play" size={14} /> 3D · Testen
            </>
          ) : (
            'Letzter gültiger Stand'
          )}
        </div>
      ) : null}
      {mode === 'play' ? (
        <div className="ed-hud" data-testid="play-hud">
          <div className="ed-hud-row">
            <span className="ed-pill" data-testid="hud-moves">
              {noLimit ? 'Züge frei' : `Züge ${state?.movesLeft ?? 0}`}
            </span>
            {state?.level.goals.some((g) => g.type === 'score') ? <span className="ed-pill">Punkte {state?.score ?? 0}</span> : null}
            {next ? (
              <span className="ed-pill ed-pill-next">
                Nächster
                <svg viewBox="0 0 100 100" width={24} height={24} aria-hidden="true">
                  <BlobGlyph blob={next.kind === 'amoeba' ? { tier: 1, kind: 'amoeba' } : { tier: next.tier }} showNumber={false} />
                </svg>
                {next.kind === 'amoeba' ? 'A' : 2 ** next.tier}
              </span>
            ) : null}
            <span className="ed-pill ed-pill-seed">Seed {attempt}</span>
            <button type="button" className="ed-pill ed-pill-btn" data-active={showNumbers} aria-pressed={showNumbers} onPointerDown={(e) => e.stopPropagation()} onClick={toggleNumbers} aria-label={showNumbers ? 'Zahlen ausblenden' : 'Zahlen zeigen'}>
              123
            </button>
          </div>
          <div className="ed-hud-row">
            {state?.goalProgress.map((g, i) => (
              <span key={i} className="ed-pill ed-pill-goal" data-done={g.done}>
                {goalText(g)}
              </span>
            ))}
          </div>
          {viewChanged ? (
            <button type="button" className="ed-chip ed-hud-reset" onPointerDown={(e) => e.stopPropagation()} onClick={resetView} aria-label="Kamera zurücksetzen">
              <UiIcon name="zoom" size={18} /> 1:1
            </button>
          ) : null}
        </div>
      ) : null}
      {mode === 'play' && status !== 'playing' ? (
        <div className="ed-banner" data-status={status} data-testid="play-banner" onPointerDown={(e) => e.stopPropagation()}>
          <b>{status === 'won' ? 'Geschafft!' : 'Verloren.'}</b>
          <span>
            Seed {attempt} · {state?.moveNo ?? 0} Züge
          </span>
          <div className="ed-banner-actions">
            <button type="button" className="ed-btn ed-btn-primary" onClick={() => usePreviewStore.getState().nextAttempt()} data-testid="banner-next">
              <UiIcon name="next" size={18} /> Nochmal
            </button>
            <button type="button" className="ed-btn" onClick={() => usePreviewStore.getState().restart()}>
              <UiIcon name="restart" size={18} /> Gleicher Seed
            </button>
          </div>
        </div>
      ) : null}
      <div className="ed-perf" data-play={mode === 'play'}>
        <PerfBadge />
      </div>
    </div>
  );
}
