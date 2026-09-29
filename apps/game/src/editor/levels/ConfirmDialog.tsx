import { useEffect, useRef } from 'react';
import { useEditorStore } from './editorStore';

/** Bestätigung nur für Zerstörerisches (Löschen, Überschreiben) — großes Ziel, klare Farben, kein Browser-Dialog. */
export function ConfirmDialog() {
  const confirm = useEditorStore((s) => s.confirm);
  const resolve = useEditorStore((s) => s.resolveConfirm);
  const okRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!confirm) return;
    okRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') resolve(false);
      else if (e.key === 'Enter') resolve(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirm, resolve]);

  if (!confirm) return null;
  return (
    <div className="ed-confirm-backdrop" onPointerDown={() => resolve(false)}>
      <div className="ed-confirm" role="alertdialog" aria-modal="true" aria-label={confirm.title} data-testid="confirm-dialog" onPointerDown={(e) => e.stopPropagation()}>
        <b className="ed-confirm-title">{confirm.title}</b>
        {confirm.body ? <p className="ed-confirm-body">{confirm.body}</p> : null}
        <div className="ed-confirm-actions">
          <button type="button" className="ed-btn" onClick={() => resolve(false)} data-testid="confirm-cancel">
            Abbrechen
          </button>
          <button ref={okRef} type="button" className={`ed-btn ${confirm.danger ? 'ed-btn-danger' : 'ed-btn-primary'}`} onClick={() => resolve(true)} data-testid="confirm-ok">
            {confirm.ok}
          </button>
        </div>
      </div>
    </div>
  );
}
