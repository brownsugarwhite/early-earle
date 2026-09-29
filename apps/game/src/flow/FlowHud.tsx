import { Link } from 'react-router';
import { canRewind, type GoalProgress, type LevelDef } from '@ee/core';
import { FLOW_LEVELS, flowLevelNo } from './levels';
import { useGridStore } from '../lab/grid/gridStore';
import { PerfBadge } from '../overlay/PerfBadge';
import { useFlowStore, type FlowPhase } from './flowStore';

const GOAL_LABEL: Record<string, string> = {
  reachTier: 'Stufe',
  release: 'Aufbrüche',
  heal: 'Heilen',
  collectSpores: 'Sporen',
  rescue: 'Retten',
  clearScrap: 'Schrott',
  deliver: 'Liefern',
  score: 'Punkte',
};

function goalText(g: GoalProgress): string {
  const label = GOAL_LABEL[g.type] ?? g.type;
  if (g.type === 'reachTier') return `${label} ${2 ** g.target}`;
  return `${label} ${g.progress}/${g.target}`;
}

/** Goal preview for a level that is not loaded yet (map view, Best-Fiends practice: show the goal before). */
function goalPreview(level: LevelDef | undefined): string[] {
  if (!level) return [];
  return level.goals.map((g) => {
    const label = GOAL_LABEL[g.type] ?? g.type;
    switch (g.type) {
      case 'reachTier':
        return `${label} ${2 ** g.tier}`;
      case 'deliver':
        return `${label} ${g.count} × ${2 ** g.tier}`;
      case 'release':
      case 'collectSpores':
      case 'rescue':
        return `${label} ${g.count}`;
      case 'score':
        return `${label} ${g.points}`;
      default:
        return label;
    }
  });
}

const DEV_PHASES: Array<{ label: string; kind: 'splash' | 'map' | 'flyIn' | 'depart' }> = [
  { label: 'Splash', kind: 'splash' },
  { label: 'Map', kind: 'map' },
  { label: 'FlyIn', kind: 'flyIn' },
  { label: 'Depart', kind: 'depart' },
];

/**
 * HUD chrome over the one-take scene: top pill (level, moves, goals), bottom action row, REX line box.
 * Glass fallback (`.glass`): blur + saturate, inset 1-px highlight, hard sun-direction shadow, no outlines.
 */
export function FlowHud() {
  const phase = useFlowStore((s) => s.phase);
  const current = useFlowStore((s) => s.current);
  const flowRex = useFlowStore((s) => s.rex);
  const request = useFlowStore((s) => s.request);
  const level = useGridStore((s) => s.level);
  const state = useGridStore((s) => s.state);
  const history = useGridStore((s) => s.history);
  const gridRex = useGridStore((s) => s.rex);
  const rewindMove = useGridStore((s) => s.rewindMove);
  const restart = useGridStore((s) => s.restart);

  const inLevel = phase === 'flyIn' || phase === 'level' || phase === 'depart';
  const mapLevel = FLOW_LEVELS[current]?.level;
  const shownLevel = inLevel ? level : mapLevel;
  const levelNo = inLevel && level ? (flowLevelNo(level) ?? current + 1) : current + 1;
  const status = state?.status ?? 'playing';
  const noLimit = (shownLevel?.moves ?? 0) >= 99;
  const rex = inLevel ? gridRex : flowRex;

  return (
    <div className="flow-hud" data-flow-state={phase} data-testid="flow-hud">
      <header className="hud-top glass" data-testid="hud-top">
        <h1 className="hud-title">
          <small>Tjorizo · Level {levelNo}</small>
          {shownLevel?.name ?? shownLevel?.id ?? 'early earle'}
        </h1>
        {inLevel && state ? (
          <>
            <div className="hud-stat">
              <b>{noLimit ? '∞' : state.movesLeft}</b>
              <span>Züge</span>
            </div>
            {state.goalProgress.map((g, i) => (
              <span key={i} className="hud-goal" data-done={g.done}>
                {goalText(g)}
                {g.done ? ' ✓' : ''}
              </span>
            ))}
          </>
        ) : (
          <>
            <div className="hud-stat">
              <b>{noLimit ? '∞' : (shownLevel?.moves ?? '–')}</b>
              <span>Züge</span>
            </div>
            {goalPreview(shownLevel).map((t, i) => (
              <span key={i} className="hud-goal">
                {t}
              </span>
            ))}
          </>
        )}
      </header>

      <footer className="hud-bottom">
        {rex ? (
          <div className="flow-rex" data-testid="rex-line">
            <span className="rex-name">REX</span> {rex}
          </div>
        ) : null}
        {phase === 'level' && status === 'lost' ? (
          <div className="hud-banner-flow">
            Verloren.
            <button className="glass-btn" onClick={restart}>
              Nochmal
            </button>
          </div>
        ) : null}
        <div className="hud-actions">
          {phase === 'map' ? (
            <button className="glass-btn glass primary" data-testid="play-btn" onClick={() => request('flyIn', current)}>
              Spielen ▶
            </button>
          ) : null}
          {phase === 'level' ? (
            <>
              <button className="glass-btn glass" onClick={rewindMove} disabled={!history || !canRewind(history) || status !== 'playing'}>
                ⟲ Zurück
              </button>
              <button className="glass-btn glass" onClick={restart}>
                ↻ Neu
              </button>
              <button className="glass-btn glass" onClick={() => request('leave')}>
                ◀ Map
              </button>
            </>
          ) : null}
        </div>
      </footer>

      {import.meta.env.DEV ? <DevStrip phase={phase} /> : null}
    </div>
  );
}

/** Dev-only strip: jump between phases, perf badge, links to the labs and editors. */
function DevStrip({ phase }: { phase: FlowPhase }) {
  const request = useFlowStore((s) => s.request);
  const toggleNumbers = useGridStore((s) => s.toggleNumbers);
  const showNumbers = useGridStore((s) => s.showNumbers);
  return (
    <div className="flow-dev" data-testid="flow-dev">
      <span className="dev-btn" data-active="false">
        Flow
      </span>
      {DEV_PHASES.map((p) => (
        <button key={p.kind} className="dev-btn" data-active={phase === p.kind || (p.kind === 'flyIn' && phase === 'level')} onClick={() => request(p.kind)}>
          {p.label}
        </button>
      ))}
      <button className="dev-btn" onClick={toggleNumbers}>
        {showNumbers ? '123' : '· · ·'}
      </button>
      <Link className="dev-link" to="/lab">
        Lab
      </Link>
      <Link className="dev-link" to="/editor/levels">
        Editor
      </Link>
      <PerfBadge />
    </div>
  );
}
