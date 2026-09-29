import { useEffect, useMemo } from 'react';
import { EditorPreviewScene } from '../editor/levels/EditorPreviewScene';
import { useEditorStore } from '../editor/levels/editorStore';
import { usePreviewStore } from '../editor/levels/previewStore';
import { TopBar } from '../editor/levels/TopBar';
import { Stage } from '../editor/levels/Stage';
import { Sheet } from '../editor/levels/Sheet';
import { Toast } from '../editor/levels/Toast';
import { ConfirmDialog } from '../editor/levels/ConfirmDialog';
import '../styles/editor.css';

/**
 * `/editor/levels` — Level-Editor, iPhone zuerst: oben Level + Status-Chips, in der Mitte das Brett als Bühne
 * (direkt bemalen, halten = Zellmenü, zwei Finger = Zoom) mit 3D-Vorschau, darunter das schwebende Dock
 * (Werkzeug · Rückgängig · Wiederholen · Sichern · Testen) und das rastende Bottom-Sheet mit den Reitern
 * Werkzeug · Ziele · Spawn · Solver · Kette · Datei · ASCII. Schreibt über den Dev-Endpunkt nach
 * content/levels; ohne Endpunkt Download/Teilen. Entwürfe und Undo-Verlauf liegen zusätzlich in localStorage.
 */
export function EditorLevels() {
  const controller = useMemo(() => new EditorPreviewScene(), []);
  const init = useEditorStore((s) => s.init);
  const mode = usePreviewStore((s) => s.mode);
  const sheet = useEditorStore((s) => s.sheet);
  const endpoint = useEditorStore((s) => s.endpoint);

  useEffect(() => {
    void init();
  }, [init]);

  // Seite festhalten: kein Gummiband-Scrollen, kein Browser-Zoom per Pinch/Doppeltipp (Safari: gesture*-Events).
  useEffect(() => {
    const html = document.documentElement;
    html.classList.add('ed-lock');
    const stop = (e: Event) => e.preventDefault();
    const onTouchMove = (e: TouchEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.touches.length > 1 || (t?.closest('.ed-stage') && !t.closest('.cm-body'))) e.preventDefault();
    };
    document.addEventListener('gesturestart', stop);
    document.addEventListener('gesturechange', stop);
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      html.classList.remove('ed-lock');
      document.removeEventListener('gesturestart', stop);
      document.removeEventListener('gesturechange', stop);
      document.removeEventListener('touchmove', onTouchMove);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT');
      const st = useEditorStore.getState();
      const meta = e.metaKey || e.ctrlKey;
      if (meta) {
        const k = e.key.toLowerCase();
        if (k === 'z' && !typing) {
          e.preventDefault();
          if (e.shiftKey) st.redo();
          else st.undo();
        } else if (k === 'y' && !typing) {
          e.preventDefault();
          st.redo();
        } else if (k === 's') {
          e.preventDefault();
          void st.save();
        }
        return;
      }
      if (typing || e.altKey || st.confirm) return;
      if (e.key === 'Escape' && st.cellMenu) {
        st.closeCellMenu();
        return;
      }
      if (usePreviewStore.getState().mode === 'play') {
        if (e.key === 't' || e.key === 'T') st.exitPlay();
        return;
      }
      if (e.key === 't' || e.key === 'T') st.enterPlay();
      else if (e.key === 'e' || e.key === 'E') st.setTool('erase');
      else if (/^[1-6]$/.test(e.key)) {
        const recent = ['erase', ...st.recentTools.filter((t) => t !== 'erase')].slice(0, 6);
        const tool = recent[Number(e.key) - 1];
        if (tool) st.setTool(tool as typeof st.tool);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Beim Verlassen der Route den Testmodus beenden, damit die nächste Vorschau wieder den Entwurf zeigt.
  useEffect(() => () => usePreviewStore.getState().setMode('edit'), []);

  return (
    <div className="ed-root" data-testid="editor-levels" data-mode={mode} data-endpoint={endpoint}>
      <TopBar />
      <div className="ed-main" data-sheet={sheet}>
        <Stage controller={controller} />
        <Sheet />
      </div>
      <Toast />
      <ConfirmDialog />
    </div>
  );
}
