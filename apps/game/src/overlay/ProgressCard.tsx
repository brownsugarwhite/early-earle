import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Glyph } from './glyphs';
import { useProgress, type CollectInput, type GameMode } from '../state/progress';
import { FLOW_LEVELS } from '../flow/levels';
import { STORY_AFTER_LEVEL_1 } from '../flow/progression/gate';
import { catalogInputs } from '../collection/catalog';
import { BUNDLED_RULES } from '../lab/creature/content';
import './progressCard.css';

/**
 * Katalog aller Wesen für „Sammlung füllen“: der ganze Wesen-Katalog der Sammlung (253 Wesen mit den mitgelieferten
 * Genom-Regeln). Tests oder Labs können ihn über `registerCollectionCatalog` ersetzen.
 */
let catalog: (() => CollectInput[]) | null = () => catalogInputs(BUNDLED_RULES);
export function registerCollectionCatalog(fn: (() => CollectInput[]) | null): void {
  catalog = fn;
}

const LEVEL_COUNT = FLOW_LEVELS.length;

/** Ein Knopf, der beim ersten Tipp „Wirklich?“ fragt und erst beim zweiten auslöst. */
function ConfirmButton({ label, onConfirm, testId }: { label: string; onConfirm: () => void; testId: string }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return undefined;
    const id = window.setTimeout(() => setArmed(false), 3500);
    return () => window.clearTimeout(id);
  }, [armed]);
  return (
    <button
      type="button"
      className="ws-btn ws-prog-danger"
      data-armed={armed}
      data-testid={testId}
      onClick={() => {
        if (!armed) {
          setArmed(true);
          return;
        }
        setArmed(false);
        onConfirm();
      }}
    >
      {armed ? 'Wirklich?' : label}
    </button>
  );
}

/**
 * Werkstatt-Karte „Fortschritt“ (Iteration 4, Punkt 4): echter Modus (wie im fertigen Spiel: gesperrte Level,
 * Intro, begrenztes Scrollen) oder freier Modus (Entwicklung: jede Stelle, jedes Level). Dazu die Entwickler-Aktionen
 * des Stands: zurücksetzen, bis Level N freischalten, Intro nochmal, Sammlung leeren/füllen.
 */
export function ProgressCard() {
  const mode = useProgress((s) => s.mode);
  const realReached = useProgress((s) => s.slots.real.reached);
  const freeReached = useProgress((s) => s.slots.free.reached);
  const collected = useProgress((s) => Object.keys(s.collection).length);
  const setMode = useProgress((s) => s.setMode);
  const navigate = useNavigate();
  const [level, setLevel] = useState(() => String(useProgress.getState().reached + 1));
  const levelNo = Number.parseInt(level, 10);
  const levelOk = Number.isFinite(levelNo) && levelNo >= 1 && levelNo <= LEVEL_COUNT;
  const firstId = FLOW_LEVELS[0]?.level.id;

  const modes: Array<{ id: GameMode; label: string }> = [
    { id: 'real', label: 'Echt' },
    { id: 'free', label: 'Frei' },
  ];

  return (
    <section className="ws-prog" data-mode={mode} data-testid="progress-card" aria-labelledby="ws-h-fortschritt">
      <div className="ws-prog-row">
        <span className="ws-prog-icon" aria-hidden="true">
          <Glyph name="planet" size={26} />
        </span>
        <div className="ws-prog-text">
          <b id="ws-h-fortschritt">Fortschritt</b>
          <small data-testid="progress-summary">
            Echt: Level {realReached + 1} · Frei: Level {freeReached + 1}
          </small>
        </div>
        <div className="ws-prog-seg" role="group" aria-label="Modus">
          {modes.map((m) => (
            <button key={m.id} type="button" className="ws-prog-seg-btn" aria-pressed={mode === m.id} data-testid={`progress-mode-${m.id}`} onClick={() => setMode(m.id)}>
              {m.label}
            </button>
          ))}
        </div>
      </div>
      <p className="ws-conn-hint">
        {mode === 'real' ? 'Wie im fertigen Spiel: nur offene Level, Intro, Karte begrenzt.' : 'Entwicklung: jede Stelle der Welt, jedes Level.'}
      </p>
      <form
        className="ws-conn-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!levelOk) return;
          useProgress.getState().unlockTo(levelNo - 1);
        }}
      >
        <label className="ws-field ws-prog-level">
          <span>Bis Level</span>
          <input type="number" inputMode="numeric" min={1} max={LEVEL_COUNT} value={level} aria-invalid={!levelOk} onChange={(e) => setLevel(e.target.value)} data-testid="progress-level" />
        </label>
        <button type="submit" className="ws-btn ws-btn-primary" disabled={!levelOk} data-testid="progress-unlock">
          Freischalten
        </button>
      </form>
      <div className="ws-prog-actions">
        <button
          type="button"
          className="ws-btn"
          data-testid="progress-intro"
          disabled={!firstId}
          onClick={() => {
            if (!firstId) return;
            const p = useProgress.getState();
            p.resetIntro(firstId, [STORY_AFTER_LEVEL_1]);
            p.setMode('real');
            navigate('/');
          }}
        >
          Intro nochmal
        </button>
        <ConfirmButton label="Echt zurücksetzen" testId="progress-reset-real" onConfirm={() => useProgress.getState().resetSlot('real')} />
        <ConfirmButton label={`Sammlung leeren (${collected})`} testId="progress-clear-collection" onConfirm={() => useProgress.getState().clearCollection()} />
        {catalog ? (
          <button type="button" className="ws-btn" data-testid="progress-fill-collection" onClick={() => catalog && useProgress.getState().fillCollection(catalog())}>
            Sammlung füllen
          </button>
        ) : null}
      </div>
    </section>
  );
}
