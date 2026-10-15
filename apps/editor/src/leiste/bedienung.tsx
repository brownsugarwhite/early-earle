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

export function Chips<T extends string>({ werte, aktiv, text, attribut, onWahl }: { werte: readonly T[]; aktiv: T; text?: (w: T) => string; attribut: string; onWahl: (w: T) => void }) {
  return (
    <div className="umschalter stufen" role="radiogroup">
      {werte.map((w) => (
        <button key={w} className={aktiv === w ? 'chip aktiv' : 'chip'} {...{ [`data-${attribut}`]: w }} onClick={() => onWahl(w)}>
          {text ? text(w) : w}
        </button>
      ))}
    </div>
  );
}

/** Ein Undo-Schritt je Reglerzug */
export const geste = () => ({ onStart: () => useEditor.getState().beginGeste(), onEnde: () => useEditor.getState().endeGeste() });
