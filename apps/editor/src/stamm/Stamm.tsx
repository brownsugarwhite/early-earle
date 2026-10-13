// Plan 9.3: der Stamm — senkrechte Spalte links mit der Initiale des Wesens als Wurzel und neun Knospen (Stufen).
// Knospe hohl = leer, gefüllt = hat Inhalt, Ring = aktiv; Label beim Hover und an der aktiven Knospe; ⌘1 … ⌘9.

import { useRahmen } from '../layout/animation';
import { useKernAnzeige } from '../kern/kernBau';
import { useEditor } from '../state/editorStore';
import { type Ebene, useUi } from '../state/uiStore';
import { STUFEN } from './stufen';

/** Hat die Stufe schon Inhalt am Wesen? (hohl ↔ gefüllt) */
function gefuellt(id: Ebene, hatMaul: boolean, hatAugen: boolean, beine: string, stil: string, palette: string): boolean {
  switch (id) {
    case 'form':
      return true;
    case 'maul':
    case 'zaehne':
      return hatMaul;
    case 'augen':
      return hatAugen;
    case 'teile':
      return beine !== 'aus';
    case 'fell':
      return stil === 'fell';
    case 'haut':
      return stil === 'feuer' || stil === 'gas' || palette !== 'blob';
    default:
      return false;
  }
}

export function Stamm() {
  const r = useRahmen((s) => s.rects?.stamm ?? null);
  const ebene = useUi((s) => s.ebene);
  const name = useEditor((s) => s.dok.name);
  const hatMaul = useEditor((s) => !!s.dok.maul || !!s.dok.ausstattung?.maulLinie);
  const hatAugen = useEditor((s) => !!s.dok.ausstattung?.augen);
  const maulChip = useKernAnzeige((s) => s.maul);
  const beine = useKernAnzeige((s) => s.beine);
  const stil = useKernAnzeige((s) => s.stil);
  const palette = useKernAnzeige((s) => s.palette);
  if (!r) return null;
  const initiale = (name.trim()[0] ?? 'W').toUpperCase();
  const aktiv = STUFEN.find((s) => s.id === ebene) ?? STUFEN[0]!;
  return (
    <nav className="stamm" data-stamm="" style={{ left: r.x, top: r.y, width: r.w, height: r.h }} aria-label="Stufen">
      <div className="initiale" style={{ background: aktiv.farbe }} title={name}>
        {initiale}
      </div>
      <div className="stamm-linie" />
      {STUFEN.map((st) => {
        const voll = gefuellt(st.id, hatMaul || maulChip !== 'aus', hatAugen, beine, stil, palette);
        const istAktiv = st.id === ebene;
        return (
          <button
            key={st.id}
            type="button"
            className={`knospe${voll ? ' voll' : ''}${istAktiv ? ' aktiv' : ''}`}
            style={{ '--stufe': st.farbe } as React.CSSProperties}
            data-stufe={st.id}
            title={`${st.name} (⌘${st.taste})${st.phase ? ` · ${st.phase}` : ''}`}
            tabIndex={-1}
            onClick={() => useUi.getState().setzeEbene(st.id)}
          >
            <span className="knospe-label">{st.name}</span>
          </button>
        );
      })}
    </nav>
  );
}
