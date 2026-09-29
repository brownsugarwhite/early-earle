import { useEffect, useMemo } from 'react';
import { EditorPreviewScene } from '../editor/levels/EditorPreviewScene';
import { useEditorStore } from '../editor/levels/editorStore';
import { usePreviewStore } from '../editor/levels/previewStore';
import { TopBar } from '../editor/levels/TopBar';
import { PreviewPane } from '../editor/levels/PreviewPane';
import { Sheet } from '../editor/levels/Sheet';
import { Toast } from '../editor/levels/Toast';
import '../styles/editor.css';

/**
 * `/editor/levels` — touch-first Level-Editor: Kopfleiste (Level, Speichern), 3D-Vorschau des Entwurfs,
 * Bottom-Sheet mit Raster · Elemente · Ziele & Züge · Spawn · Solver · ASCII. Schreibt über den Dev-Endpunkt
 * nach content/levels; ohne Endpunkt Download/Teilen. Entwürfe liegen zusätzlich in localStorage.
 */
export function EditorLevels() {
  const controller = useMemo(() => new EditorPreviewScene(), []);
  const init = useEditorStore((s) => s.init);

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
      if (e.key.toLowerCase() === 'z' && !typing) {
        e.preventDefault();
        if (e.shiftKey) useEditorStore.getState().redo();
        else useEditorStore.getState().undo();
      } else if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        void useEditorStore.getState().save();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Beim Verlassen der Route den Testmodus beenden, damit die nächste Vorschau wieder den Entwurf zeigt.
  useEffect(() => () => usePreviewStore.setState({ mode: 'edit' }), []);

  return (
    <div className="ed-root" data-testid="editor-levels">
      <TopBar />
      <div className="ed-main">
        <PreviewPane controller={controller} />
        <Sheet />
      </div>
      <Toast />
    </div>
  );
}
