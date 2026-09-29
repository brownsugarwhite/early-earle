import type { BotName } from '@ee/core';
import { useEditorStore } from '../editorStore';
import { usePreviewStore } from '../previewStore';
import { BOTS, BOT_LABEL, SEED_OPTIONS, useSolverStore, type BotRunState } from '../solverStore';
import { bandVerdict, VERDICT_LABEL } from '../solverClient';
import { CALIBRATION, calibrationFor, calibrationMatches, de } from '../chain';
import { UiIcon } from '../icons';
import { Row, Section, Toggle } from '../ui';

const pct = (x: number) => `${Math.round(x * 100)} %`;
const num = (x: number | null | undefined, d = 1) => (x === null || x === undefined || !Number.isFinite(x) ? '—' : de(x, d));

function replay(attempt: number) {
  const ed = useEditorStore.getState();
  ed.syncPreview();
  usePreviewStore.getState().setAttempt(attempt);
  ed.enterPlay();
  ed.showToast(`Seed ${attempt} nachspielen — wischen oder Pfeiltasten`, 'info');
}

function RunStrip({ runs }: { runs: BotRunState['runs'] }) {
  if (runs.length === 0) return null;
  const lost = runs.filter((r) => !r.won).slice(0, 6);
  return (
    <>
      <div className="ed-runs" aria-label="Einzelne Seeds (antippen = nachspielen)">
        {runs.map((r) => (
          <button key={r.attempt} type="button" className="ed-run" data-won={r.won} onClick={() => replay(r.attempt)} aria-label={`Seed ${r.attempt} ${r.won ? 'gewonnen' : 'verloren'} nach ${r.moves} Zügen — nachspielen`} />
        ))}
      </div>
      {lost.length ? (
        <div className="ed-lost" aria-label="Verlorene Seeds">
          {lost.map((r) => (
            <button key={r.attempt} type="button" className="ed-chip ed-lost-seed" onClick={() => replay(r.attempt)} data-testid={`replay-${r.attempt}`}>
              <UiIcon name="play" size={14} /> Seed {r.attempt}
              <small>{r.moves} Züge</small>
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
}

function BotCard({ bot, state, band, stale }: { bot: BotName; state: BotRunState; band: readonly [number, number]; stale: boolean }) {
  const s = state.summary;
  const progress = state.total > 0 ? state.n / state.total : 0;
  const pWin = s ? s.pWin : state.n > 0 ? state.wins / state.n : null;
  const verdict = s ? bandVerdict(s.attemptsEst, band) : null;
  return (
    <div className="ed-card" data-status={state.status} data-stale={stale ? 'true' : undefined} data-testid={`solver-card-${bot}`}>
      <header className="ed-card-head">
        <b>
          {BOT_LABEL[bot]}
          {state.auto ? <small className="ed-auto-tag">Auto</small> : null}
        </b>
        <span className="ed-card-status">
          {state.status === 'running' ? `${state.n}/${state.total}` : state.status === 'done' ? `${s?.n} Seeds${s?.stoppedEarly ? ' (früh gestoppt)' : ''} · ${de((s?.elapsedMs ?? 0) / 1000, 1)} s` : state.status === 'error' ? 'Fehler' : state.status === 'cancelled' ? 'abgebrochen' : '—'}
        </span>
      </header>
      {state.status === 'running' ? (
        <div className="ed-progress" role="progressbar" aria-valuenow={Math.round(progress * 100)}>
          <i style={{ width: `${progress * 100}%` }} />
        </div>
      ) : null}
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
              <b>{VERDICT_LABEL[verdict]}</b> ({de(band[0], 1)}–{de(band[1], 1)}){bot !== 'novice' ? ' — kalibriert wird am Anfänger-Bot' : ''}
            </p>
          ) : null}
        </>
      ) : null}
      <RunStrip runs={state.runs} />
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
  const autoCheck = useSolverStore((s) => s.autoCheck);
  const results = useSolverStore((s) => s.results);
  const running = useSolverStore((s) => s.running);
  const setBot = useSolverStore((s) => s.setBot);
  const setSeeds = useSolverStore((s) => s.setSeeds);
  const setStopEarly = useSolverStore((s) => s.setStopEarly);
  const setAutoCheck = useSolverStore((s) => s.setAutoCheck);
  const run = useSolverStore((s) => s.run);
  const cancel = useSolverStore((s) => s.cancel);
  const level = validation.level;
  const levelJson = level ? JSON.stringify(level) : '';
  const anySelected = BOTS.some((b) => bots[b]);
  const calibration = draft ? calibrationFor(draft.id) : null;
  const calibFresh = calibration && level ? calibrationMatches(calibration, level) : false;

  return (
    <>
      <Section title="Bots">
        <Row>
          {BOTS.map((b) => (
            <Toggle key={b} label={BOT_LABEL[b]} on={bots[b]} onChange={(v) => setBot(b, v)} testId={`bot-${b}`} />
          ))}
        </Row>
        <Row>
          <label className="ed-field ed-field-narrow">
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
          <Toggle label="Auto-Check nach jeder Änderung" on={autoCheck} onChange={setAutoCheck} testId="solver-auto" />
        </Row>
        <Row>
          {running ? (
            <button type="button" className="ed-btn" onClick={cancel} data-testid="solver-cancel">
              <UiIcon name="close" size={18} /> Abbrechen
            </button>
          ) : (
            <button type="button" className="ed-btn ed-btn-primary" disabled={!level || !anySelected} onClick={() => level && void run(level)} data-testid="solver-run">
              <UiIcon name="bot" size={18} /> Bots laufen lassen
            </button>
          )}
          <button type="button" className="ed-btn" disabled={!level} onClick={() => useEditorStore.getState().enterPlay()} data-testid="solver-test">
            <UiIcon name="play" size={18} /> Selbst testen
          </button>
        </Row>
        {!level ? <p className="ed-hint ed-error">Erst die Fehler beheben — der Solver braucht ein gültiges Level.</p> : <p className="ed-hint">Läuft im Hintergrund weiter — der Chip oben zeigt das Ergebnis. Seed n = derselbe Zufall wie Versuch n.</p>}
      </Section>
      {BOTS.filter((b) => results[b].status !== 'idle').map((b) => (
        <BotCard key={b} bot={b} state={results[b]} band={draft?.difficulty.targetAttempts ?? [1, 1.1]} stale={results[b].levelJson !== levelJson} />
      ))}
      {calibration ? (
        <Section title="Kalibrierung (Datei)">
          <p className="ed-hint">
            _calibration.json{CALIBRATION?.generatedAt ? ` vom ${new Date(CALIBRATION.generatedAt).toLocaleDateString('de-DE')}` : ''}
            {calibFresh ? '' : ' — veraltet, der Stand hat sich seitdem geändert'}:{' '}
            {(['novice', 'average', 'strong'] as BotName[])
              .filter((b) => calibration.bots[b])
              .map((b) => `${BOT_LABEL[b]} ${pct(calibration.bots[b]!.pWin)} (n=${calibration.bots[b]!.n}, ${num(calibration.bots[b]!.attemptsEst, 2)} V)`)
              .join(' · ')}{' '}
            — Band {de(calibration.targetAttempts[0], 1)}–{de(calibration.targetAttempts[1], 1)}
          </p>
        </Section>
      ) : null}
    </>
  );
}
