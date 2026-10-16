// B7 (Plan Teil B, Entwurf Posen §6 „Bühne“): Chip „✎ Fressen“ zeigt, was bearbeitet wird (in einer Pose färbt sich dazu
// der Rahmen der Bühne), und während einer Vorschau „Vorschau · Brüllen 40 % ×“ — was gezeigt wird. Ein Klick auf ×
// beendet die Vorschau (wie Esc, Bearbeiten, Ziel- oder Stufenwechsel).
import { anzeigeGewichte } from '../kern/kernBau';
import { poseTitel, useEditor, vorschauBeenden, vorschauLaeuft } from '../state/editorStore';
import { useUi } from '../state/uiStore';

const HILFE_POSE = 'Bearbeitet wird die Pose: Pinsel G/I, die schwarzen Linien, Rot/Blau und die Knochen formen sie; der Editor-Tab bleibt die Grundform.';
const HILFE_GRUND = 'Bearbeitet wird die Grundform (Editor-Tab); Posen wählst du oben oder in der Posenliste.';

/** Text der gezeigten Gewichte: „Fressen 40 % · Idle 20 %“ (absteigend), ohne Gewichte „Grundform“. */
export function gewichteText(g: Readonly<Record<string, number>>, name: (id: string) => string): string {
  const e = Object.entries(g)
    .filter(([, w]) => w > 0)
    .sort((a, b) => b[1] - a[1]);
  if (!e.length) return 'Grundform';
  return e.map(([id, w]) => `${name(id)} ${Math.round(w * 100)} %`).join(' · ');
}

export function ZielChips() {
  const modus = useEditor((s) => s.modus);
  const dok = useEditor((s) => s.dok);
  const ebene = useUi((s) => s.ebene);
  // Abonnieren, damit die Anzeige jeder Gewichtsänderung folgt
  useUi((s) => s.vorschau);
  useUi((s) => s.oeffnung);
  useUi((s) => s.poseStaerke);
  const laeuft = vorschauLaeuft(modus);
  const zeigeZiel = modus !== 'editor' || ebene === 'posen';
  if (!zeigeZiel && !laeuft) return null;
  const name = (id: string) => poseTitel(dok, id);
  return (
    <div className="ziel-chips" data-ziel-chips="">
      {zeigeZiel && (
        <span className={modus === 'editor' ? 'ziel-chip glas' : 'ziel-chip glas pose'} data-ziel-chip={modus} title={modus === 'editor' ? HILFE_GRUND : HILFE_POSE}>
          ✎ {modus === 'editor' ? 'Grundform' : name(modus)}
        </span>
      )}
      {laeuft && (
        <span className="vorschau-chip glas" data-vorschau-chip="">
          Vorschau · {gewichteText(anzeigeGewichte(), name)}
          <button className="vorschau-aus" data-vorschau-aus="" title="Vorschau beenden (Esc)" onClick={() => vorschauBeenden(useEditor.getState().modus)}>
            ×
          </button>
        </span>
      )}
    </div>
  );
}
