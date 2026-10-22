// Bedienelemente der Tafel (Plan 9.5): Regler, Blockpillen (Chips), Geste für Undo (ein Schritt je Zug). Aus der
// Seitenleiste herausgezogen, damit einzelne Tafel-Felder in eigenen Dateien liegen können.
import { useEditor } from '../state/editorStore';

export function Regler({ label, wert, min, max, schritt, anzeige, onChange, onStart, onEnde }: {
  label: string;
  wert: number;
  min: number;
  max: number;
  schritt: number;
  anzeige: string;
  onChange: (v: number) => void;
  onStart?: () => void;
  onEnde?: () => void;
}) {
  return (
    <label className="regler">
      <span>{label}</span>
      <input type="range" min={min} max={max} step={schritt} value={wert} onChange={(e) => onChange(Number(e.target.value))} onPointerDown={onStart} onPointerUp={onEnde} />
      <b>{anzeige}</b>
    </label>
  );
}

/** Chips einer Wahl; `gesperrt` = Grund, warum die Wahl hier nicht wirkt (ausgegraut, nicht wählbar, Grund als Tooltip). */
export function Chips<T extends string>({ werte, aktiv, text, attribut, onWahl, gesperrt }: { werte: readonly T[]; aktiv: T; text?: (w: T) => string; attribut: string; onWahl: (w: T) => void; gesperrt?: string | undefined }) {
  return (
    <div className="umschalter stufen" role="radiogroup" {...(gesperrt ? { title: gesperrt, 'data-gesperrt': '' } : {})}>
      {werte.map((w) => (
        <button key={w} className={aktiv === w ? 'chip aktiv' : 'chip'} {...{ [`data-${attribut}`]: w }} disabled={!!gesperrt} onClick={() => onWahl(w)}>
          {text ? text(w) : w}
        </button>
      ))}
    </div>
  );
}

/** Ein Undo-Schritt je Reglerzug */
export const geste = () => ({ onStart: () => useEditor.getState().beginGeste(), onEnde: () => useEditor.getState().endeGeste() });
