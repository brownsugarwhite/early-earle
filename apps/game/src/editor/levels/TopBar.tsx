import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { levelNumber } from './draft';
import { useEditorStore } from './editorStore';
import { SolverChip } from './SolverChip';
import { UiIcon } from './icons';

function fileLabel(file: string): string {
  const base = file.replace(/\.json$/, '');
  return /^\d{3}$/.test(base) ? String(levelNumber(base)) : base;
}

function ValidationChip() {
  const validation = useEditorStore((s) => s.validation);
  const openTab = useEditorStore((s) => s.openTab);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { ok, errors, warnings } = validation;
  const total = errors.length + warnings.length;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [open]);

  const label = ok ? (warnings.length ? `${warnings.length}` : '') : `${errors.length}`;
  return (
    <div className="ed-valid" data-ok={ok} data-testid="validation" ref={ref}>
      <button
        type="button"
        className="ed-valid-chip"
        onClick={() => total && setOpen(!open)}
        aria-expanded={open}
        aria-label={ok ? (warnings.length ? `Gültig, ${warnings.length} Hinweise` : 'Gültig') : `${errors.length} Fehler`}
        data-testid="validation-summary"
        data-warn={ok && warnings.length ? 'true' : undefined}
      >
        <UiIcon name={ok ? 'check' : 'cross'} size={18} />
        {label ? <span>{label}</span> : null}
      </button>
      {open && total ? (
        <ul className="ed-issues" data-testid="validation-issues">
          {[...errors, ...warnings].map((iss, i) => (
            <li key={i} data-severity={iss.severity}>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  openTab(iss.tab, 'half');
                }}
              >
                <b>{iss.where}</b> {iss.message}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function TopBar() {
  const draft = useEditorStore((s) => s.draft);
  const activeFile = useEditorStore((s) => s.activeFile);
  const targetFile = useEditorStore((s) => s.targetFile);
  const dirty = useEditorStore((s) => s.dirty);
  const endpoint = useEditorStore((s) => s.endpoint);
  const openTab = useEditorStore((s) => s.openTab);
  const localSaved = useEditorStore((s) => s.files.some((f) => f.file === s.targetFile && f.local));
  const isNew = activeFile === null;
  // Speicherziel sichtbar: auf dem Mac (Dev-Server/WLAN) oder lokal auf dem Gerät.
  const status = isNew || dirty ? 'Ungesichert' : endpoint === 'ok' ? 'Auf dem Mac' : localSaved ? 'Lokal gespeichert' : 'Stand der App';

  return (
    <header className="ed-top" data-testid="editor-top" data-endpoint={endpoint}>
      <Link to="/werkstatt" className="ed-back" aria-label="Zur Werkstatt" data-testid="lab-back">
        <UiIcon name="back" size={20} />
      </Link>
      <h1 className="ed-title">Level-Editor</h1>
      <button type="button" className="ed-level" onClick={() => openTab('kette', 'full')} data-testid="level-button" aria-label={`Level wählen — ${targetFile}`}>
        <span className="ed-level-no" data-file={targetFile}>
          {targetFile ? fileLabel(targetFile) : '…'}
        </span>
        <span className="ed-level-text">
          <b>{draft?.name ?? draft?.id ?? 'Lädt …'}</b>
          <small data-dirty={dirty} data-testid="dirty-dot">
            <i aria-hidden="true" />
            {status}
          </small>
        </span>
      </button>
      <ValidationChip />
      <SolverChip />
      <span className="ed-endpoint-state" data-state={endpoint} data-testid="endpoint-state" aria-hidden="true" />
    </header>
  );
}
