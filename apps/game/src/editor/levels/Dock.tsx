import { canRewind } from '@ee/core';
import { toolInfo } from './draft';
import { useEditorStore } from './editorStore';
import { usePreviewStore } from './previewStore';
import { ToolIcon, UiIcon } from './icons';

/**
 * Schwebendes Dock über dem Sheet — alles Häufige im Daumenbereich:
 * Bauen: aktuelles Werkzeug · Rückgängig · Wiederholen · Sichern · TESTEN.
 * Testen: BAUEN · Zug zurück · Neustart · Nochmal (nächster Seed).
 * „Testen/Bauen“ ist die Hauptaktion und trägt die eine fette Verlaufskontur (STYLE.md §3, Zustand 2).
 */
export function Dock() {
  const mode = usePreviewStore((s) => s.mode);
  return (
    <div className="ed-dock" data-mode={mode} data-testid="dock" onPointerDown={(e) => e.stopPropagation()}>
      {mode === 'edit' ? <EditDock /> : <PlayDock />}
    </div>
  );
}

function TestToggle() {
  const mode = usePreviewStore((s) => s.mode);
  const togglePlay = useEditorStore((s) => s.togglePlay);
  const valid = useEditorStore((s) => s.validation.ok);
  const play = mode === 'play';
  return (
    <span className="ed-hero" data-mode={mode}>
      <button
        type="button"
        className="ed-hero-btn"
        onClick={togglePlay}
        data-testid={play ? 'edit-btn' : 'play-btn'}
        aria-pressed={play}
        aria-label={play ? 'Zurück zum Bauen' : 'Testen'}
        data-invalid={!valid && !play ? 'true' : undefined}
      >
        <UiIcon name={play ? 'edit' : 'play'} size={20} />
        <span>{play ? 'Bauen' : 'Testen'}</span>
      </button>
    </span>
  );
}

function EditDock() {
  const tool = useEditorStore((s) => s.tool);
  const params = useEditorStore((s) => s.toolParams);
  const tab = useEditorStore((s) => s.tab);
  const sheet = useEditorStore((s) => s.sheet);
  const pastLen = useEditorStore((s) => s.past.length);
  const futureLen = useEditorStore((s) => s.future.length);
  const dirty = useEditorStore((s) => s.dirty);
  const busy = useEditorStore((s) => s.busy);
  const valid = useEditorStore((s) => s.validation.ok);
  const endpoint = useEditorStore((s) => s.endpoint);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const save = useEditorStore((s) => s.save);
  const openTab = useEditorStore((s) => s.openTab);
  const setSheet = useEditorStore((s) => s.setSheet);
  const info = toolInfo(tool);
  const paletteOpen = tab === 'werkzeug' && sheet !== 'peek';
  const saveState = !valid ? 'invalid' : dirty ? 'dirty' : 'clean';
  const offline = endpoint !== 'ok';

  return (
    <>
      <button
        type="button"
        className="ed-dock-tool"
        onClick={() => (paletteOpen ? setSheet('peek') : openTab('werkzeug', 'half'))}
        aria-expanded={paletteOpen}
        aria-label={`Werkzeug: ${info.label} — Palette ${paletteOpen ? 'schließen' : 'öffnen'}`}
        data-testid="dock-tool"
        data-tool={tool}
      >
        <ToolIcon tool={tool} params={params} size={32} />
        <span className="ed-dock-tool-label">{info.label}</span>
      </button>
      <button type="button" className="ed-dock-btn" onClick={undo} disabled={pastLen === 0} aria-label="Rückgängig" data-testid="undo-btn">
        <UiIcon name="undo" />
      </button>
      <button type="button" className="ed-dock-btn" onClick={redo} disabled={futureLen === 0} aria-label="Wiederholen" data-testid="redo-btn">
        <UiIcon name="redo" />
      </button>
      <button
        type="button"
        className="ed-dock-btn ed-dock-save"
        data-state={saveState}
        onClick={() => void save()}
        disabled={!valid || busy}
        aria-label={
          saveState === 'invalid'
            ? 'Sichern gesperrt: Fehler'
            : saveState === 'dirty'
              ? offline
                ? 'Lokal sichern (Mac nicht erreichbar)'
                : 'Auf den Mac sichern (ungesicherte Änderungen)'
              : offline
                ? 'Lokal gespeichert'
                : 'Gespeichert auf dem Mac'
        }
        data-testid="save-btn"
        data-target={offline ? 'lokal' : 'mac'}
      >
        <UiIcon name={saveState === 'clean' ? 'check' : 'save'} />
        {saveState === 'dirty' ? <i className="ed-dock-dot" aria-hidden="true" /> : null}
      </button>
      <TestToggle />
    </>
  );
}

function PlayDock() {
  const history = usePreviewStore((s) => s.history);
  const rewindMove = usePreviewStore((s) => s.rewindMove);
  const restart = usePreviewStore((s) => s.restart);
  const nextAttempt = usePreviewStore((s) => s.nextAttempt);
  const attempt = usePreviewStore((s) => s.attempt);
  return (
    <>
      <TestToggle />
      <button type="button" className="ed-dock-btn" onClick={rewindMove} disabled={!history || !canRewind(history)} aria-label="Zug zurück" data-testid="rewind-btn">
        <UiIcon name="rewind" />
      </button>
      <button type="button" className="ed-dock-btn" onClick={restart} aria-label={`Neustart (Seed ${attempt})`} data-testid="restart-btn">
        <UiIcon name="restart" />
      </button>
      <button type="button" className="ed-dock-next" onClick={nextAttempt} aria-label="Nochmal mit dem nächsten Seed" data-testid="next-seed-btn">
        <UiIcon name="next" size={18} />
        <span>
          Nochmal
          <small>Seed {attempt + 1}</small>
        </span>
      </button>
    </>
  );
}
