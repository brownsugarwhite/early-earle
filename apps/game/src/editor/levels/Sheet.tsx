import { useState } from 'react';
import { useEditorStore, type TabId } from './editorStore';
import { RasterTab } from './tabs/RasterTab';
import { ElementsTab } from './tabs/ElementsTab';
import { GoalsTab } from './tabs/GoalsTab';
import { SpawnTab } from './tabs/SpawnTab';
import { SolverTab } from './tabs/SolverTab';
import { AsciiTab } from './tabs/AsciiTab';

const TABS: { id: TabId; label: string }[] = [
  { id: 'raster', label: 'Raster' },
  { id: 'elemente', label: 'Elemente' },
  { id: 'ziele', label: 'Ziele & Züge' },
  { id: 'spawn', label: 'Spawn' },
  { id: 'solver', label: 'Solver' },
  { id: 'ascii', label: 'ASCII' },
];

function ValidationBar() {
  const validation = useEditorStore((s) => s.validation);
  const setTab = useEditorStore((s) => s.setTab);
  const [open, setOpen] = useState(false);
  const { ok, errors, warnings } = validation;
  const total = errors.length + warnings.length;
  const summary = ok ? (warnings.length ? `Gültig · ${warnings.length} ${warnings.length === 1 ? 'Hinweis' : 'Hinweise'}` : 'Gültig') : `${errors.length} ${errors.length === 1 ? 'Fehler' : 'Fehler'}${warnings.length ? ` · ${warnings.length} Hinweise` : ''}`;
  return (
    <div className="ed-valid" data-ok={ok} data-testid="validation">
      <button type="button" className="ed-valid-summary" onClick={() => total && setOpen(!open)} aria-expanded={open} data-testid="validation-summary">
        <span className="ed-valid-mark" aria-hidden="true">{ok ? '✓' : '✗'}</span>
        {summary}
        {total ? <span className="ed-valid-chevron">{open ? '▴' : '▾'}</span> : null}
      </button>
      {open && total ? (
        <ul className="ed-issues" data-testid="validation-issues">
          {[...errors, ...warnings].map((iss, i) => (
            <li key={i} data-severity={iss.severity}>
              <button type="button" onClick={() => setTab(iss.tab)}>
                <b>{iss.where}</b> — {iss.message}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function Sheet() {
  const tab = useEditorStore((s) => s.tab);
  const sheet = useEditorStore((s) => s.sheet);
  const setTab = useEditorStore((s) => s.setTab);
  const cycleSheet = useEditorStore((s) => s.cycleSheet);
  const setSheet = useEditorStore((s) => s.setSheet);
  const loading = useEditorStore((s) => s.loading);
  const draft = useEditorStore((s) => s.draft);

  return (
    <section className="ed-sheet" data-size={sheet} data-testid="sheet">
      <div className="ed-sheet-top">
        <button type="button" className="ed-handle" onClick={cycleSheet} aria-label="Sheet-Größe wechseln" data-testid="sheet-handle">
          <span />
        </button>
        <ValidationBar />
        <div className="ed-sheet-size" role="radiogroup" aria-label="Sheet-Größe">
          {(['peek', 'half', 'full'] as const).map((s) => (
            <button key={s} type="button" role="radio" aria-checked={sheet === s} className="ed-mini" data-active={sheet === s} onClick={() => setSheet(s)} title={s === 'peek' ? 'Klein' : s === 'half' ? 'Halb' : 'Voll'}>
              {s === 'peek' ? '▁' : s === 'half' ? '▃' : '▇'}
            </button>
          ))}
        </div>
      </div>
      <nav className="ed-tabs" aria-label="Reiter">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className="ed-tab"
            data-active={tab === t.id}
            onClick={() => {
              setTab(t.id);
              if (sheet === 'peek') setSheet('half');
            }}
            data-testid={`tab-${t.id}`}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <div className="ed-sheet-body" data-testid="sheet-body">
        {loading && !draft ? <p className="ed-hint">Lädt …</p> : null}
        {draft ? (
          tab === 'raster' ? <RasterTab /> : tab === 'elemente' ? <ElementsTab /> : tab === 'ziele' ? <GoalsTab /> : tab === 'spawn' ? <SpawnTab /> : tab === 'solver' ? <SolverTab /> : <AsciiTab />
        ) : null}
      </div>
    </section>
  );
}
