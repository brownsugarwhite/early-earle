import { useEffect, useMemo, useRef } from 'react';
import { CanvasHost } from '../canvas/CanvasHost';
import { LabFrame } from '../overlay/LabFrame';
import { GridLabScene } from '../lab/grid/GridLabScene';
import { useGridStore } from '../lab/grid/gridStore';
import { LEVELS } from '../content/levels';
import { canRewind, type Dir, type GoalProgress } from '@ee/core';

const GOAL_LABEL: Record<string, string> = {
  reachTier: 'Stufe erreichen',
  release: 'Aufbrüche',
  heal: 'Zellen heilen',
  collectSpores: 'Sporen',
  rescue: 'Retten',
  clearScrap: 'Schrott',
  deliver: 'Liefern',
  score: 'Punkte',
};

function goalText(g: GoalProgress): string {
  const label = GOAL_LABEL[g.type] ?? g.type;
  if (g.type === 'reachTier') return `${label}: ${2 ** g.target}${g.done ? ' ✓' : ''}`;
  return `${label}: ${g.progress}/${g.target}${g.done ? ' ✓' : ''}`;
}

export function LabGrid() {
  const controller = useMemo(() => new GridLabScene(), []);
  const level = useGridStore((s) => s.level);
  const state = useGridStore((s) => s.state);
  const history = useGridStore((s) => s.history);
  const levelIndex = useGridStore((s) => s.levelIndex);
  const showNumbers = useGridStore((s) => s.showNumbers);
  const rex = useGridStore((s) => s.rex);
  const move = useGridStore((s) => s.move);
  const loadLevel = useGridStore((s) => s.loadLevel);
  const restart = useGridStore((s) => s.restart);
  const rewindMove = useGridStore((s) => s.rewindMove);
  const toggleNumbers = useGridStore((s) => s.toggleNumbers);
  const swipe = useRef<{ x: number; y: number; id: number } | null>(null);

  useEffect(() => {
    if (!useGridStore.getState().state) loadLevel(0);
  }, [loadLevel]);

  useEffect(() => {
    const keys: Record<string, Dir> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
    const onKey = (e: KeyboardEvent) => {
      const dir = keys[e.key];
      if (dir) {
        e.preventDefault();
        move(dir);
      } else if (e.key === 'z' || e.key === 'Backspace') rewindMove();
      else if (e.key === 'r') restart();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [move, rewindMove, restart]);

  const onPointerDown = (e: React.PointerEvent) => {
    swipe.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
  };

  const next = state?.spawnQueue[0];
  const status = state?.status ?? 'playing';
  const levelNo = levelIndex + 1;
  const noLimit = (level?.moves ?? 0) >= 99;

  return (
    <LabFrame
      title={`P3 Grid-Lab — Level ${levelNo}${level ? ` · ${level.name ?? level.id}` : ''}`}
      controls={
        <>
          <div className="hud-row">
            <label className="hud-field">
              Level
              <select value={levelIndex} onChange={(e) => loadLevel(Number(e.target.value))}>
                {LEVELS.map((l, i) => (
                  <option key={l.id} value={i}>{i + 1} · {l.name ?? l.id}</option>
                ))}
              </select>
            </label>
            <button className="btn" onClick={rewindMove} disabled={!history || !canRewind(history)}>⟲ Rückspulen</button>
            <button className="btn" onClick={restart}>↻ Neu</button>
            <button className="btn" onClick={toggleNumbers}>{showNumbers ? 'Zahlen aus' : 'Zahlen an'}</button>
          </div>
          <div className="hud-row hud-stats">
            <span className="hud-pill">{noLimit ? 'Züge: frei' : `Züge: ${state?.movesLeft ?? 0}`}</span>
            <span className="hud-pill">Punkte: {state?.score ?? 0}</span>
            {next ? <span className="hud-pill">Nächster: {2 ** next.tier}{next.kind === 'amoeba' ? ' (Amöbe)' : ''}</span> : null}
            {state?.goalProgress.map((g, i) => (
              <span key={i} className={`hud-pill ${g.done ? 'done' : ''}`}>{goalText(g)}</span>
            ))}
          </div>
          {rex ? <div className="rex-line"><span className="rex-name">REX</span> {rex}</div> : null}
          {status !== 'playing' ? (
            <div className={`hud-banner ${status}`}>
              {status === 'won' ? 'Geschafft!' : 'Verloren.'}
              <button className="btn" onClick={() => (status === 'won' && levelIndex + 1 < LEVELS.length ? loadLevel(levelIndex + 1) : restart())}>
                {status === 'won' && levelIndex + 1 < LEVELS.length ? 'Weiter ▶' : 'Nochmal'}
              </button>
            </div>
          ) : null}
        </>
      }
    >
      <div className="swipe-layer" onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => (swipe.current = null)}>
        <CanvasHost controller={controller} />
      </div>
    </LabFrame>
  );
}
