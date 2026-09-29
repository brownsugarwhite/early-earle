import { useEffect, useState } from 'react';
import type { BotName } from '@ee/core';
import { useEditorStore } from '../editorStore';
import { usePreviewStore } from '../previewStore';
import { BOTS, BOT_LABEL, SEED_OPTIONS, useSolverStore, type BotRunState } from '../solverStore';
import { bandVerdict, VERDICT_LABEL } from '../solverClient';
import { getLevelFile } from '../contentClient';
import { Row, Section, Toggle } from '../ui';

const pct = (x: number) => `${Math.round(x * 100)} %`;
const num = (x: number | null | undefined, d = 1) => (x === null || x === undefined || !Number.isFinite(x) ? '—' : x.toFixed(d));

interface CalibrationEntry {
  id: string;
  bots: Partial<Record<BotName, { pWin: number; n: number; attemptsEst: number | null; meanMovesWon: number }>>;
  targetAttempts: [number, number];
  generatedAt?: string;
}

function useCalibration(levelId: string | undefined): CalibrationEntry | null | undefined {
  const endpoint = useEditorStore((s) => s.endpoint);
  const [entry, setEntry] = useState<CalibrationEntry | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    if (endpoint !== 'ok' || !levelId) {
      setEntry(null);
      return;
    }
    getLevelFile('_calibration.json')
      .then((raw) => {
        if (!alive) return;
        const file = raw as { generatedAt?: string; levels?: CalibrationEntry[] } | null;
        const e = file?.levels?.find((l) => l.id === levelId) ?? null;
        setEntry(e ? { ...e, ...(file?.generatedAt ? { generatedAt: file.generatedAt } : {}) } : null);
      })
      .catch(() => alive && setEntry(null));
    return () => {
      alive = false;
    };
  }, [endpoint, levelId]);
  return entry;
}

function RunStrip({ runs, onPick }: { runs: BotRunState['runs']; onPick: (attempt: number) => void }) {
  if (runs.length === 0) return null;
  return (
    <div className="ed-runs" aria-label="Einzelne Seeds">
      {runs.map((r) => (
        <button key={r.attempt} type="button" className="ed-run" data-won={r.won} title={`Versuch ${r.attempt}: ${r.won ? 'gewonnen' : 'verloren'} nach ${r.moves} Zügen — antippen zum Nachspielen`} onClick={() => onPick(r.attempt)} aria-label={`Versuch ${r.attempt} ${r.won ? 'gewonnen' : 'verloren'}`} />
      ))}
    </div>
  );
}

function BotCard({ bot, state, band, stale, onPick }: { bot: BotName; state: BotRunState; band: readonly [number, number]; stale: boolean; onPick: (attempt: number) => void }) {
  const s = state.summary;
  const progress = state.total > 0 ? state.n / state.total : 0;
  const pWin = s ? s.pWin : state.n > 0 ? state.wins / state.n : null;
  const verdict = s ? bandVerdict(s.attemptsEst, band) : null;
  return (
    <div className="ed-card" data-status={state.status} data-stale={stale ? 'true' : undefined} data-testid={`solver-card-${bot}`}>
      <header className="ed-card-head">
        <b>{BOT_LABEL[bot]}</b>
        <span className="ed-card-status">
          {state.status === 'running' ? `${state.n}/${state.total}` : state.status === 'done' ? `${s?.n} Seeds${s?.stoppedEarly ? ' (früh gestoppt)' : ''} · ${((s?.elapsedMs ?? 0) / 1000).toFixed(1)} s` : state.status === 'error' ? 'Fehler' : state.status === 'cancelled' ? 'abgebrochen' : '—'}
        </span>
      </header>
      {state.status === 'running' ? <div className="ed-progress" role="progressbar" aria-valuenow={Math.round(progress * 100)}><i style={{ width: `${progress * 100}%` }} /></div> : null}
      {state.status === 'error' ? <p className="ed-hint ed-error">{state.error}</p> : null}
      {pWin !== null ? (
        <div className="ed-metrics">
          <div className="ed-metric big">
            <b data-testid={`solver-pwin-${bot}`}>{pct(pWin)}</b>
            <span>Gewinnrate{s ? ` · ${pct(s.wilson[0])}–${pct(s.wilson[1])}` : ''}</span>
          </div>
          <div className="ed-metric">
            <b>{s ? (s.attemptsEst === null ? '∞' : num(s.attemptsEst, 2)) : '…'}</b>
            <span>Versuche</span>
          </div>
          <div className="ed-metric">
            <b>{s ? num(s.meanMovesWon, 1) : '…'}</b>
            <span>Züge (Sieg)</span>
          </div>
          <div className="ed-metric">
            <b>{s ? num(s.meanScore, 0) : '…'}</b>
            <span>Punkte</span>
          </div>
        </div>
      ) : null}
      {s ? (
        <>
          <p className="ed-hint">
            Spezialteile pro Wisch: Strahl {pct(s.specialFrequency.line)} · Knall {pct(s.specialFrequency.burst)} · gezündet {pct(s.specialFrequency.fired)} · Kombos {pct(s.specialFrequency.combo)}
          </p>
          {verdict ? (
            <p className="ed-verdict" data-verdict={verdict} data-testid={`solver-verdict-${bot}`}>
              {bot === 'novice' ? 'Band-Urteil: ' : 'Gegen das Band: '}
              <b>{VERDICT_LABEL[verdict]}</b> ({band[0]}–{band[1]}){bot !== 'novice' ? ' — kalibriert wird am Anfänger-Bot' : ''}
            </p>
          ) : null}
        </>
      ) : null}
      <RunStrip runs={state.runs} onPick={onPick} />
      {stale ? <p className="ed-hint">Der Entwurf hat sich seit diesem Lauf geändert.</p> : null}
    </div>
  );
}

export function SolverTab() {
  const validation = useEditorStore((s) => s.validation);
  const draft = useEditorStore((s) => s.draft);
  const bots = useSolverStore((s) => s.bots);
  const seeds = useSolverStore((s) => s.seeds);
  const stopEarly = useSolverStore((s) => s.stopEarly);
  const results = useSolverStore((s) => s.results);
  const running = useSolverStore((s) => s.running);
  const setBot = useSolverStore((s) => s.setBot);
  const setSeeds = useSolverStore((s) => s.setSeeds);
  const setStopEarly = useSolverStore((s) => s.setStopEarly);
  const run = useSolverStore((s) => s.run);
  const cancel = useSolverStore((s) => s.cancel);
  const setMode = usePreviewStore((s) => s.setMode);
  const setAttempt = usePreviewStore((s) => s.setAttempt);
  const calibration = useCalibration(draft?.id);
  const level = validation.level;
  const levelJson = level ? JSON.stringify(level) : '';
  const anySelected = BOTS.some((b) => bots[b]);

  const pick = (attempt: number) => {
    useEditorStore.getState().syncPreview();
    setAttempt(attempt);
    setMode('play');
    useEditorStore.getState().showToast(`Versuch ${attempt} nachspielen — wischen oder Pfeiltasten`, 'info');
  };

  return (
    <>
      <Section title="Bots">
        <Row>
          {BOTS.map((b) => (
            <Toggle key={b} label={BOT_LABEL[b]} on={bots[b]} onChange={(v) => setBot(b, v)} testId={`bot-${b}`} />
          ))}
        </Row>
        <Row>
          <label className="ed-field">
            <span className="ed-label">Seeds</span>
            <select className="ed-select" value={seeds} onChange={(e) => setSeeds(Number(e.target.value))} data-testid="solver-seeds">
              {SEED_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <Toggle label="Früh stoppen (±5 %)" on={stopEarly} onChange={setStopEarly} />
        </Row>
        <Row>
          {running ? (
            <button type="button" className="ed-btn" onClick={cancel} data-testid="solver-cancel">
              Abbrechen
            </button>
          ) : (
            <button type="button" className="ed-btn ed-btn-primary" disabled={!level || !anySelected} onClick={() => level && void run(level)} data-testid="solver-run">
              Bots laufen lassen
            </button>
          )}
          <button
            type="button"
            className="ed-btn"
            disabled={!level}
            onClick={() => {
              useEditorStore.getState().syncPreview();
              setMode('play');
              useEditorStore.getState().setSheet('peek');
            }}
            data-testid="solver-test"
          >
            Selbst testen
          </button>
        </Row>
        {!level ? <p className="ed-hint ed-error">Erst die Fehler beheben — der Solver braucht ein gültiges Level.</p> : null}
        <p className="ed-hint">Seeds wie in der Kalibrierung (Versuch n = hash32(id, n)); ein Worker pro Bot. Anfänger: Tiefe 1, verrauscht · Durchschnitt: Tiefe 2 · Stark: Tiefe 3.</p>
      </Section>
      {BOTS.filter((b) => results[b].status !== 'idle').map((b) => (
        <BotCard key={b} bot={b} state={results[b]} band={draft?.difficulty.targetAttempts ?? [1, 1.1]} stale={results[b].levelJson !== levelJson} onPick={pick} />
      ))}
      {calibration ? (
        <Section title="Kalibrierung (Datei)">
          <p className="ed-hint">
            _calibration.json{calibration.generatedAt ? ` vom ${new Date(calibration.generatedAt).toLocaleDateString('de-DE')}` : ''}:{' '}
            {(['novice', 'average', 'strong'] as BotName[])
              .filter((b) => calibration.bots[b])
              .map((b) => `${BOT_LABEL[b]} ${pct(calibration.bots[b]!.pWin)} (n=${calibration.bots[b]!.n}, ${num(calibration.bots[b]!.attemptsEst, 2)} Versuche)`)
              .join(' · ')}{' '}
            — Band {calibration.targetAttempts[0]}–{calibration.targetAttempts[1]}
          </p>
        </Section>
      ) : null}
    </>
  );
}
