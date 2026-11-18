import { useEffect, useState } from 'react';
import { useUi } from '../state/uiStore';

export function Hinweis() {
  const hinweis = useUi((s) => s.hinweis);
  const [sichtbar, setSichtbar] = useState(false);
  useEffect(() => {
    if (!hinweis) return;
    setSichtbar(true);
    const t = window.setTimeout(() => setSichtbar(false), 2200);
    return () => window.clearTimeout(t);
  }, [hinweis]);
  return <div className={sichtbar ? 'hinweis glas sichtbar' : 'hinweis glas'}>{hinweis?.text}</div>;
}
