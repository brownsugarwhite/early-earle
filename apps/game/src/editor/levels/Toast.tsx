import { useEditorStore } from './editorStore';

export function Toast() {
  const toast = useEditorStore((s) => s.toast);
  const hide = useEditorStore((s) => s.hideToast);
  if (!toast) return null;
  return (
    <div className="ed-toast" data-kind={toast.kind} role="status" data-testid="toast" onClick={hide}>
      {toast.text}
    </div>
  );
}
