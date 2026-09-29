import { Link } from 'react-router';
import { levelNumber } from './draft';
import { useEditorStore } from './editorStore';

function fileLabel(file: string): string {
  const base = file.replace(/\.json$/, '');
  const n = levelNumber(base);
  return /^\d{3}$/.test(base) && n ? String(n) : base;
}

export function TopBar() {
  const files = useEditorStore((s) => s.files);
  const activeFile = useEditorStore((s) => s.activeFile);
  const targetFile = useEditorStore((s) => s.targetFile);
  const dirty = useEditorStore((s) => s.dirty);
  const busy = useEditorStore((s) => s.busy);
  const loading = useEditorStore((s) => s.loading);
  const endpoint = useEditorStore((s) => s.endpoint);
  const validation = useEditorStore((s) => s.validation);
  const savedJson = useEditorStore((s) => s.savedJson);
  const past = useEditorStore((s) => s.past);
  const future = useEditorStore((s) => s.future);
  const openFile = useEditorStore((s) => s.openFile);
  const refreshFiles = useEditorStore((s) => s.refreshFiles);
  const save = useEditorStore((s) => s.save);
  const revert = useEditorStore((s) => s.revert);
  const duplicate = useEditorStore((s) => s.duplicate);
  const createNew = useEditorStore((s) => s.createNew);
  const deleteFile = useEditorStore((s) => s.deleteFile);
  const download = useEditorStore((s) => s.download);
  const share = useEditorStore((s) => s.share);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const setTargetFile = useEditorStore((s) => s.setTargetFile);
  const isNew = activeFile === null;
  const canShare = typeof navigator !== 'undefined' && typeof (navigator as Navigator & { share?: unknown }).share === 'function';
  const offline = endpoint !== 'ok';

  return (
    <header className="ed-top" data-testid="editor-top">
      <div className="ed-top-row">
        <Link to="/" className="ed-back" aria-label="Zur Startseite">
          ◀
        </Link>
        <h1 className="ed-title">Level-Editor</h1>
        <select className="ed-picker" data-testid="level-picker" value={isNew ? '' : (activeFile ?? '')} onChange={(e) => e.target.value && void openFile(e.target.value)} onFocus={() => void refreshFiles()} aria-label="Level wählen" disabled={loading}>
          {isNew ? <option value="">{targetFile} (neu)</option> : null}
          {files.map((f) => (
            <option key={f.file} value={f.file}>
              {f.hasDraft ? '● ' : ''}
              {fileLabel(f.file)} · {f.name}
            </option>
          ))}
        </select>
        <span className="ed-dot" data-dirty={dirty} title={dirty ? 'Ungespeicherte Änderungen' : 'Gespeichert'} data-testid="dirty-dot" />
        <button type="button" className="ed-btn ed-btn-primary ed-save" onClick={() => void save()} disabled={!validation.ok || busy || loading} data-testid="save-btn" title={offline ? 'Kein Dev-Endpunkt: lädt die Datei herunter' : 'PUT /__content/levels'}>
          {offline ? 'Download' : busy ? '…' : 'Speichern'}
        </button>
      </div>
      <div className="ed-top-actions">
        <button type="button" className="ed-btn ed-btn-sq" onClick={undo} disabled={past.length === 0} aria-label="Rückgängig" title="Rückgängig (⌘Z)" data-testid="undo-btn">
          ↶
        </button>
        <button type="button" className="ed-btn ed-btn-sq" onClick={redo} disabled={future.length === 0} aria-label="Wiederholen" title="Wiederholen (⇧⌘Z)" data-testid="redo-btn">
          ↷
        </button>
        <button type="button" className="ed-btn ed-btn-small" onClick={revert} disabled={!dirty || savedJson === null} data-testid="revert-btn">
          Zurücksetzen
        </button>
        <button type="button" className="ed-btn ed-btn-small" onClick={duplicate} data-testid="duplicate-btn">
          Duplizieren
        </button>
        <button type="button" className="ed-btn ed-btn-small" onClick={createNew} data-testid="new-btn">
          Neu
        </button>
        <button type="button" className="ed-btn ed-btn-small ed-btn-danger" onClick={() => void deleteFile()} disabled={!(activeFile ?? targetFile).startsWith('_')} data-testid="delete-btn" title="Nur _-Dateien (Entwürfe)">
          Löschen
        </button>
        <button type="button" className="ed-btn ed-btn-small" onClick={download} data-testid="download-btn">
          ⬇ JSON
        </button>
        {canShare ? (
          <button type="button" className="ed-btn ed-btn-small" onClick={() => void share()} data-testid="share-btn">
            Teilen
          </button>
        ) : null}
        <label className="ed-file">
          <span className="ed-label">Datei</span>
          <input className="ed-input mono" value={targetFile} onChange={(e) => setTargetFile(e.target.value)} data-testid="file-name" spellCheck={false} autoCapitalize="off" autoCorrect="off" aria-label="Dateiname" />
        </label>
        <span className="ed-endpoint" data-state={endpoint} data-testid="endpoint-state">
          {endpoint === 'ok' ? 'Dev-Endpunkt' : endpoint === 'offline' ? 'Nur lokal' : '…'}
        </span>
      </div>
    </header>
  );
}
