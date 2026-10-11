import { useEffect, useState } from 'react';
import { ladeAusBibliothek } from '../aktionen';
import { useRahmen } from '../layout/animation';
import { useEditor } from '../state/editorStore';
import { useUi } from '../state/uiStore';
import { editorApi, useBibliothek } from './speicher';

const FAECHER = ['Wesen', 'Augen', 'Flügel', 'Mäuler', 'Beine', 'Schwänze', 'Ohren', 'Muster'] as const;
type Fach = (typeof FAECHER)[number];

/**
 * Earle-Ornament am Fuß der Library: geschichtete Hügelbänder in Flächenfarben, schlanke Pappeln,
 * Sonnenscheibe mit feinen Ringen. Linien nur als Ornament (Konturen-Regel), keine Umrisse.
 */
function Ornament() {
  const pappeln = [
    [34, 104, 46],
    [52, 110, 34],
    [71, 100, 58],
    [92, 112, 30],
    [248, 98, 52],
    [266, 104, 38],
    [352, 96, 62],
    [372, 104, 44],
  ].map(([x, fuss, h], i) => (
    <g key={i}>
      <path d={`M${x} ${fuss! - h!} C${x! + 7} ${fuss! - h! * 0.6} ${x! + 6} ${fuss! - 6} ${x} ${fuss} C${x! - 6} ${fuss! - 6} ${x! - 7} ${fuss! - h! * 0.6} ${x} ${fuss! - h!}Z`} fill="#8a1270" />
      <line x1={x} y1={fuss! - h! + 6} x2={x} y2={fuss} className="linie" />
    </g>
  ));
  const ringe = [14, 22, 30].map((r) => <circle key={r} cx={318} cy={64} r={r} fill="none" className="linie" />);
  const schraffur = Array.from({ length: 9 }, (_, i) => (
    <path key={i} d={`M0 ${150 + i * 6} C90 ${138 + i * 6} 170 ${158 + i * 6} 260 ${146 + i * 6} S360 ${140 + i * 6} 400 ${146 + i * 6}`} fill="none" className="linie zart" />
  ));
  return (
    <svg className="ornament" viewBox="0 0 400 210" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <circle cx={318} cy={64} r={38} fill="#ff0095" opacity={0.85} />
      {ringe}
      <path d="M0 112 C60 86 120 96 180 104 S300 80 400 92 V210 H0Z" fill="#3c0a37" />
      {pappeln}
      <path d="M0 132 C80 114 150 136 230 124 S340 106 400 120 V210 H0Z" fill="#75005c" />
      {schraffur}
      <path d="M0 170 C90 158 170 176 260 166 S360 158 400 164 V210 H0Z" fill="#9d1a7e" />
      <path d="M0 196 C100 188 200 200 300 192 S380 188 400 190 V210 H0Z" fill="url(#ornament-wiese)" />
      <defs>
        <linearGradient id="ornament-wiese" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#b5bb72" />
          <stop offset="1" stopColor="#d0ff47" />
        </linearGradient>
      </defs>
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
