import { useEffect, useMemo, useRef } from 'react';
import { CanvasHost } from '../canvas/CanvasHost';
import { LabFrame } from '../overlay/LabFrame';
import { GridLabScene } from '../lab/grid/GridLabScene';
import { CREATURE_DEMO_INDEX, DEMO_LEVEL_INDEX, HERD_DEMO_INDEX, useGridStore } from '../lab/grid/gridStore';
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
  clearRot: 'Fäulnis',
  calmStrays: 'Streuner',
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
  const juice = useGridStore((s) => s.juice);
  const rex = useGridStore((s) => s.rex);
  const move = useGridStore((s) => s.move);
  const loadLevel = useGridStore((s) => s.loadLevel);
  const restart = useGridStore((s) => s.restart);
  const rewindMove = useGridStore((s) => s.rewindMove);
  const toggleNumbers = useGridStore((s) => s.toggleNumbers);
  const toggleJuice = useGridStore((s) => s.toggleJuice);
  const swipe = useRef<{ x: number; y: number; id: number } | null>(null);

  useEffect(() => {
    if (!useGridStore.getState().state) loadLevel(0);
  }, [loadLevel]);

  useEffect(() => {
    const keys: Record<string, Dir> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA')) return;
      const dir = keys[e.key];
      if (dir) {
        e.preventDefault();
        move(dir);
      } else if (e.key === 'z' || e.key === 'Backspace') rewindMove();
      else if (e.key === 'r') restart();
      else if (e.key === 'j') toggleJuice();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [move, rewindMove, restart, toggleJuice]);

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
  const isDemo = levelIndex === DEMO_LEVEL_INDEX || levelIndex === CREATURE_DEMO_INDEX || levelIndex === HERD_DEMO_INDEX;
  const levelNo = levelIndex + 1;
  const noLimit = (level?.moves ?? 0) >= 99;
  const title = levelIndex === CREATURE_DEMO_INDEX ? 'P3 Grid-Lab — Wesen-Schau' : levelIndex === HERD_DEMO_INDEX ? 'P3 Grid-Lab — Herde' : isDemo ? 'P3 Grid-Lab — Elemente-Schau' : `P3 Grid-Lab — Level ${levelNo}${level ? ` · ${level.name ?? level.id}` : ''}`;

  return (
    <LabFrame
      title={title}
      controls={
        <>
          <div className="hud-row">
            <label className="hud-field">
              Level
              <select value={levelIndex} onChange={(e) => loadLevel(Number(e.target.value))} data-testid="grid-level-select">
                <option value={DEMO_LEVEL_INDEX}>★ Elemente-Schau (alle Elemente)</option>
                <option value={CREATURE_DEMO_INDEX}>★ Wesen-Schau (Körpertypen, Merges)</option>
                <option value={HERD_DEMO_INDEX}>★ Herde (21 Arten, Mesh-Weg)</option>
                {LEVELS.map((l, i) => (
                  <option key={l.id} value={i}>{i + 1} · {l.name ?? l.id}</option>
                ))}
              </select>
            </label>
            <button className="btn" onClick={rewindMove} disabled={!history || !canRewind(history)}>⟲ Rückspulen</button>
            <button className="btn" onClick={restart}>↻ Neu</button>
            <button className="btn" onClick={toggleNumbers}>{showNumbers ? 'Zahlen aus' : 'Zahlen an'}</button>
            <button className={`btn${juice ? ' on' : ''}`} onClick={toggleJuice} data-testid="grid-juice" title="Partikel, Platten-Dip, Shake, REX-Puls (J)">Juice {juice ? 'an' : 'aus'}</button>
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
              <button className="btn" onClick={() => (status === 'won' && !isDemo && levelIndex + 1 < LEVELS.length ? loadLevel(levelIndex + 1) : restart())}>
                {status === 'won' && !isDemo && levelIndex + 1 < LEVELS.length ? 'Weiter ▶' : 'Nochmal'}
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
