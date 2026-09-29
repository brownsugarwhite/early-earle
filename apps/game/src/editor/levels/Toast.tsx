import { useEditorStore } from './editorStore';

export function Toast() {
  const toast = useEditorStore((s) => s.toast);
  const hide = useEditorStore((s) => s.hideToast);
  if (!toast) return null;
  return (
    <div className="ed-toast" data-kind={toast.kind} role="status" data-testid="toast" onClick={hide}>
      <span>{toast.text}</span>
      {toast.action ? (
        <button
          type="button"
          className="ed-toast-action"
          onClick={(e) => {
            e.stopPropagation();
            toast.action?.run();
            hide();
          }}
          data-testid="toast-action"
        >
          {toast.action.label}
        </button>
      ) : null}
    </div>
  );
}
