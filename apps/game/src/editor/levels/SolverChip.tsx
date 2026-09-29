import { useMemo } from 'react';
import { calibrationFor, calibrationMatches, de, VERDICT_SHORT } from './chain';
import { useEditorStore } from './editorStore';
import { bandVerdict, type BandVerdict } from './solverClient';
import { useSolverStore } from './solverStore';
import { UiIcon } from './icons';

/**
 * Immer sichtbarer Solver-Chip: Versuche (Anfänger-Bot) und Band-Urteil als Farbe. Quelle in dieser Reihenfolge:
 * laufender/frischer Lauf für genau diesen Stand → Cache früherer Läufe → `_calibration.json` (wenn der Stand passt).
 * Antippen öffnet den Solver-Reiter.
 */
export function SolverChip() {
  const level = useEditorStore((s) => s.validation.level);
  const openTab = useEditorStore((s) => s.openTab);
  const novice = useSolverStore((s) => s.results.novice);
  const fresh = useSolverStore((s) => s.fresh);
  const running = useSolverStore((s) => s.running);
  const autoRunning = useSolverStore((s) => s.autoRunning);

  const info = useMemo(() => {
    if (!level) return { kind: 'invalid' as const };
    const json = JSON.stringify(level);
    const band = level.difficulty.targetAttempts;
    if (novice.levelJson === json && novice.status === 'running') return { kind: 'running' as const, n: novice.n, total: novice.total };
    if (novice.levelJson === json && novice.status === 'done' && novice.summary) {
      return { kind: 'result' as const, attempts: novice.summary.attemptsEst, verdict: bandVerdict(novice.summary.attemptsEst, band), source: 'frisch' };
    }
    const f = fresh[level.id];
    if (f && f.levelJson === json) return { kind: 'result' as const, attempts: f.attemptsEst, verdict: bandVerdict(f.attemptsEst, band), source: 'frisch' };
    const cal = calibrationFor(level.id);
    if (cal?.bots.novice && calibrationMatches(cal, level)) {
      return { kind: 'result' as const, attempts: cal.bots.novice.attemptsEst, verdict: bandVerdict(cal.bots.novice.attemptsEst, band), source: 'Datei' };
    }
    if (f) return { kind: 'stale' as const, attempts: f.attemptsEst, verdict: f.verdict as BandVerdict };
    return { kind: 'none' as const };
  }, [level, novice, fresh]);

  const busy = running || autoRunning;
  let text: string;
  let verdict: BandVerdict | 'none' | 'invalid' | 'running' = 'none';
  let title: string;
  switch (info.kind) {
    case 'invalid':
      text = '—';
      verdict = 'invalid';
      title = 'Solver: erst gültig machen';
      break;
    case 'running':
      text = `${info.n}/${info.total}`;
      verdict = 'running';
      title = 'Bots spielen …';
      break;
    case 'result':
      text = info.attempts === null ? '∞' : de(info.attempts);
      verdict = info.verdict;
      title = `Anfänger-Bot: ${text} Versuche · ${VERDICT_SHORT[info.verdict]} (${info.source})`;
      break;
    case 'stale':
      text = info.attempts === null ? '∞' : de(info.attempts);
      verdict = 'none';
      title = 'Veraltet — der Entwurf hat sich geändert';
      break;
    default:
      text = 'Bots';
      title = 'Noch nicht gemessen';
  }

  return (
    <button
      type="button"
      className="ed-solver-chip"
      data-verdict={verdict}
      data-stale={info.kind === 'stale' ? 'true' : undefined}
      data-busy={busy ? 'true' : undefined}
      onClick={() => openTab('solver', 'half')}
      aria-label={title}
      data-testid="solver-chip"
    >
      <UiIcon name="bot" size={18} />
      <span className="ed-solver-chip-val">{text}</span>
      {info.kind === 'running' ? <i className="ed-solver-chip-bar" style={{ width: `${(100 * info.n) / Math.max(1, info.total)}%` }} /> : null}
    </button>
  );
}
