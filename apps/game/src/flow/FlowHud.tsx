import { useEffect } from 'react';
import { Link } from 'react-router';
import { canRewind, type GoalProgress, type LevelDef } from '@ee/core';
import { FLOW_LEVELS, flowLevelNo, zoneName } from './levels';
import { useProgress } from '../state/progress';
import { useGridStore } from '../lab/grid/gridStore';
import { PerfBadge } from '../overlay/PerfBadge';
import { installHaptics } from '../native/haptics';
import {
  hideNativeGlass,
  syncNativeGlass,
  useNativeGlass,
  useNativeGlassActions,
  type GlassAction,
  type GlassHudState,
} from '../native/liquidGlass';
import { useFlowStore, type FlowPhase } from './flowStore';
import { SoundToggle } from '../audio/SoundToggle';
import { useAudioSettings } from '../audio/settings';

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

/** Zone tints mirrored from flow.css: sky glass on the map, khaki in the level, pink primary action. */
const TINT_MAP = '#7ce6d5';
const TINT_LEVEL = '#b3bb6d';
const ACCENT = '#e5aed4';

interface HudFacts {
  phase: FlowPhase;
  subtitle: string;
  title: string;
  moves: string;
  goals: Array<{ text: string; done: boolean }>;
  rex: string | null;
  status: string;
  rewindable: boolean;
  muted: boolean;
}

/** The native overlay's mirror of the store: same texts and actions as the CSS HUD (ids → handlers below). */
function nativeHudState(f: HudFacts): GlassHudState | null {
  if (f.phase === 'splash' || f.phase === 'hop') return null;
  const actions: GlassAction[] = [];
  if (f.phase === 'map') actions.push({ id: 'play', label: 'Spielen', icon: 'play.fill', primary: true });
  if (f.phase === 'level') {
    if (f.status === 'lost') {
      actions.push(
        { id: 'restart', label: 'Nochmal', icon: 'arrow.counterclockwise', primary: true },
        { id: 'map', label: 'Map', icon: 'map.fill' },
      );
    } else {
      actions.push(
        { id: 'rewind', label: 'Zurück', icon: 'arrow.uturn.backward', disabled: !f.rewindable },
        { id: 'restart', label: 'Neu', icon: 'arrow.counterclockwise' },
        { id: 'map', label: 'Map', icon: 'map.fill' },
      );
    }
  }
  if (f.phase === 'map' || f.phase === 'level') actions.push({ id: 'sound', label: 'Ton', icon: f.muted ? 'speaker.slash.fill' : 'speaker.wave.2.fill' });
  return {
    top: { title: f.title, subtitle: f.subtitle, moves: f.moves, goals: f.goals },
    actions,
    rex: f.rex,
    tint: f.phase === 'level' ? TINT_LEVEL : TINT_MAP,
    accent: ACCENT,
  };
}

/**
 * HUD chrome over the one-take scene: top pill (level, moves, goals), bottom action row, REX line box.
 * In the iOS app the native Liquid-Glass overlay (plugins/liquid-glass) takes over pills, actions and the
 * REX line; here only the dev strip stays. On the web the glass fallback (`.glass`) renders: blur + saturate,
 * inset 1-px highlight, hard sun-direction shadow, no outlines.
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
  const native = useNativeGlass();
  const muted = useAudioSettings((s) => s.muted);
  const toggleMuted = useAudioSettings((s) => s.toggleMuted);

  // Haptics for the whole flow (native only; no-op on the web).
  useEffect(() => installHaptics(), []);

  const inLevel = phase === 'flyIn' || phase === 'level' || phase === 'depart';
  const mapLevel = FLOW_LEVELS[current]?.level;
  const shownLevel = inLevel ? level : mapLevel;
  const levelNo = inLevel && level ? (flowLevelNo(level) ?? current + 1) : current + 1;
  const status = state?.status ?? 'playing';
  const noLimit = (shownLevel?.moves ?? 0) >= 99;
  const rex = inLevel ? gridRex : flowRex;
  const rewindable = !!history && canRewind(history) && status === 'playing';

  const subtitle = `${zoneName(shownLevel)} · Level ${levelNo}`;
  const title = shownLevel?.name ?? shownLevel?.id ?? 'early earle';
  const moves = noLimit ? '∞' : inLevel && state ? String(state.movesLeft) : String(shownLevel?.moves ?? '–');
  const goals = inLevel && state ? state.goalProgress.map((g) => ({ text: goalText(g), done: g.done })) : goalPreview(shownLevel).map((text) => ({ text, done: false }));

  // Mirror to the native overlay; the JSON key keeps the effect quiet while nothing visible changed.
  const nativeState = native.active ? nativeHudState({ phase, subtitle, title, moves, goals, rex, status, rewindable, muted }) : null;
  const nativeJson = nativeState ? JSON.stringify(nativeState) : '';
  useEffect(() => {
    if (!native.active) return;
    void syncNativeGlass(nativeJson ? (JSON.parse(nativeJson) as GlassHudState) : null);
  }, [native.active, nativeJson]);
  useEffect(
    () => () => {
      void hideNativeGlass();
    },
    [],
  );
  useNativeGlassActions((id) => {
    switch (id) {
      case 'play':
        request('flyIn', useFlowStore.getState().current);
        break;
      case 'rewind':
        rewindMove();
        break;
      case 'restart':
        restart();
        break;
      case 'map':
        request('leave');
        break;
      case 'sound':
        toggleMuted();
        break;
      default:
        break;
    }
  }, native.active);

  return (
    <div className="flow-hud" data-flow-state={phase} data-native-glass={native.active} data-testid="flow-hud">
      {native.active ? null : (
        <>
          <header className="hud-top glass" data-testid="hud-top">
            <h1 className="hud-title">
              <small>{subtitle}</small>
              {title}
            </h1>
            <div className="hud-stat">
              <b>{moves}</b>
              <span>Züge</span>
            </div>
            {goals.map((g, i) => (
              <span key={i} className="hud-goal" data-done={g.done}>
                {g.text}
                {g.done ? ' ✓' : ''}
              </span>
            ))}
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
                  <button className="glass-btn glass" onClick={rewindMove} disabled={!rewindable}>
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
              {phase === 'map' || phase === 'level' ? <SoundToggle /> : null}
            </div>
          </footer>
        </>
      )}

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
      <button
        className="dev-btn"
        title="Fortschritt zurücksetzen (Level 1)"
        onClick={() => {
          useProgress.getState().resetAll();
          location.reload();
        }}
      >
        ↺ 0
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
