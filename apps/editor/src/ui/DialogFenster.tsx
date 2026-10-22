import { useEffect, useRef, useState } from 'react';
import { useUi } from '../state/uiStore';

export function DialogFenster() {
  const dialog = useUi((s) => s.dialog);
  const [wert, setWert] = useState('');
  const eingabe = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!dialog) return;
    setWert(dialog.eingabe ?? '');
    window.setTimeout(() => eingabe.current?.focus(), 30);
  }, [dialog]);

  if (!dialog) return null;
  const schliessen = () => useUi.getState().oeffneDialog(null);
  const primaer = dialog.knoepfe.find((k) => k.primaer);
  return (
    <div className="dialog-grund" onPointerDown={(e) => e.target === e.currentTarget && schliessen()}>
      <form
        className="dialog glas"
        onSubmit={(e) => {
          e.preventDefault();
          schliessen();
          primaer?.aktion(wert);
        }}
      >
        <div className="dialog-titel">{dialog.titel}</div>
        {dialog.text && <div className="dialog-text">{dialog.text}</div>}
        {dialog.eingabe !== undefined && <input ref={eingabe} className="dialog-eingabe" value={wert} placeholder="Name des Wesens" onChange={(e) => setWert(e.target.value)} />}
        <div className="dialog-knoepfe">
          {dialog.knoepfe.map((k) => (
            <button
              key={k.label}
              type={k.primaer ? 'submit' : 'button'}
              className={k.primaer ? 'pille aktiv' : 'pille'}
              onClick={
                k.primaer
                  ? undefined
                  : () => {
                      schliessen();
                      k.aktion(wert);
                    }
              }
            >
              {k.label}
            </button>
          ))}
        </div>
      </form>
    </div>
  );
}
