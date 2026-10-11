import { useEffect, useState } from 'react';
import { ladeAusBibliothek } from '../aktionen';
import { useRahmen } from '../layout/animation';
import { useEditor } from '../state/editorStore';
import { useUi } from '../state/uiStore';
import { editorApi, useBibliothek } from './speicher';

const FAECHER = ['Wesen', 'Augen', 'Flügel', 'Mäuler', 'Beine', 'Schwänze', 'Ohren', 'Muster'] as const;
type Fach = (typeof FAECHER)[number];

/** Earle-Ornament: geschichtete Hügelbänder mit feinen Baumstrichen (Linien nur als Ornament). */
function Ornament() {
  const striche = Array.from({ length: 34 }, (_, i) => {
    const x = 8 + i * 11.4 + (i % 3) * 2;
    const h = 18 + ((i * 37) % 23);
    return <line key={i} x1={x} y1={64 - h * 0.15} x2={x} y2={64 - h} />;
  });
  return (
    <svg className="ornament" viewBox="0 0 400 120" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 70 C60 40 120 52 180 60 S300 30 400 48 V120 H0Z" fill="#4a0a3f" />
      <g className="baeume">{striche}</g>
      <path d="M0 88 C80 70 150 92 230 80 S340 62 400 76 V120 H0Z" fill="#75005c" />
      <path d="M0 104 C90 92 170 110 260 100 S360 92 400 98 V120 H0Z" fill="#9d1a7e" />
    </svg>
  );
}

export function LibraryPanel() {
  const r = useRahmen((s) => s.rects?.library ?? null);
  const offen = useUi((s) => s.library);
  const { eintraege, geladen, neuLaden } = useBibliothek();
  const aktuelleDatei = useEditor((s) => s.datei);
  const [fach, setFach] = useState<Fach>('Wesen');

  useEffect(() => {
    if (offen) void neuLaden();
  }, [offen, neuLaden]);

  if (!r) return null;
  return (
    <aside className={offen ? 'library offen' : 'library'} style={{ left: r.x, top: r.y, width: r.w, height: r.h }} aria-hidden={!offen}>
      <div className="vp-titel">library</div>
      <div className="library-glas glas">
        <div className="faecher">
          {FAECHER.map((f) => (
            <button key={f} className={f === fach ? 'chip aktiv' : 'chip'} onClick={() => setFach(f)}>
              {f}
            </button>
          ))}
        </div>
        <div className="karten">
          {fach === 'Wesen' &&
            eintraege.map((e) => (
              <button key={e.datei} className={e.datei === aktuelleDatei ? 'karte aktiv' : 'karte'} onClick={() => ladeAusBibliothek(e.datei)} title={`${e.name} laden`}>
                <div className="karte-bild">{e.vorschau ? <img src={e.vorschau} alt="" draggable={false} /> : <div className="karte-leer" />}</div>
                <div className="karte-name">{e.name}</div>
              </button>
            ))}
          {fach === 'Wesen' && geladen && eintraege.length === 0 && <div className="leer">Noch keine Wesen gespeichert. „Speichern“ legt das aktuelle Wesen mit Vorschaubild hier ab.</div>}
          {fach !== 'Wesen' && <div className="leer">Das Fach „{fach}“ füllt sich mit der Bauweise der Wesen.</div>}
        </div>
        {editorApi && (
          <button className="ordner" onClick={() => void editorApi?.bibliothekZeigen()}>
            Ordner im Finder zeigen
          </button>
        )}
        <Ornament />
      </div>
    </aside>
  );
}
