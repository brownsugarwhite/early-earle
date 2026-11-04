// Plan „Liniennetz, Zielform, Käfig“ (16.10.), S4: Baumliste der erkannten Teile in der Tafel Körper (nur Anzeige). Zeiger
// über einem Eintrag hebt das Teil in allen Blättern hervor; der Schalter blendet die Teile in den Blättern aus.
import { useNetzStand, aktuellesNetz } from '../kern/netzStand';
import { useEditor } from '../state/editorStore';
import { useUi } from '../state/uiStore';
import { teilFarbe, teilKurvenEntfernen, teilName } from './TeilEbene';

const BLATT: Record<string, string> = { seite: 'Seite', front: 'Front', top: 'Top' };

export function TeilTafel() {
  useNetzStand((s) => s.version);
  const sicht = useUi((s) => s.teileSicht);
  const hover = useUi((s) => s.teilHover);
  const t = aktuellesNetz()?.netz.teile ?? null;
  const kurven = useEditor((s) => s.dok.teile);
  const setze = useUi.getState().setzeTeilHover;
  // Baum: Rumpf, darunter die Kinder je Elternteil (eingerückt)
  const tiefe = (i: number): number => {
    let d = 0;
    for (let k = t?.teile[i]?.eltern ?? -1; k >= 0 && d < 8; k = t?.teile[k]?.eltern ?? -1) d++;
    return d;
  };
  const reihenfolge: number[] = [];
  const kinder = (e: number) => (t ? t.teile.map((x, i) => (x.eltern === e ? i : -1)).filter((i) => i >= 0) : []);
  const besuche = (i: number) => {
    reihenfolge.push(i);
    for (const k of kinder(i)) besuche(k);
  };
  if (t?.teile.length) besuche(0);
  return (
    <>
      <div className="feld">
        <span>Teile (S4, nur Anzeige)</span>
        <b data-teile-zahl={t ? t.teile.length - 1 : -1}>{t ? (t.teile.length > 1 ? `${t.teile.length - 1} erkannt` : 'nur Rumpf') : '…'}</b>
      </div>
      <div className="umschalter stufen" role="group" aria-label="Teile">
        {(['aus', 'an'] as const).map((w) => (
          <button key={w} className={`chip${sicht === w ? ' aktiv' : ''}`} data-teile-sicht={w} onClick={() => useUi.getState().setzeTeileSicht(w)}>
            {w}
          </button>
        ))}
      </div>
      {t && (
        <ul className="teil-liste" data-teil-liste="">
          {reihenfolge.map((i) => {
            const x = t.teile[i]!;
            return (
              <li
                key={x.id}
                data-teil={x.id}
                data-teil-art={x.art}
                className={hover === x.id ? 'aktiv' : undefined}
                style={{ paddingLeft: 4 + 14 * tiefe(i) }}
                onPointerEnter={() => setze(x.id)}
                onPointerLeave={() => useUi.getState().teilHover === x.id && setze(null)}
              >
                <span className="teil-punkt" style={{ background: teilFarbe(i) }} />
                <span>{teilName(x.art, x.richtung)}</span>
                {x.art !== 'rumpf' && <small>{x.erkannt.map((b) => BLATT[b] ?? b).join(', ')}</small>}
                {(kurven ?? []).some((k) => k.teil === x.id) && (
                  <button className="chip klein" data-teil-automatisch={x.id} title="eigene Kurven dieses Teils entfernen — die Hülle rät die verdeckten Stücke wieder" onClick={() => teilKurvenEntfernen(x.id)}>
                    Automatisch
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <p className="hilfe">Aus den drei Zeichnungen gelesen: Mitte = auf der Mittelebene (Hals, Schwanz, Flossen auf der Mitte), Paar = links und rechts (Beine, Flügel, Seitenflossen). Ein Teil ist eine Ausbuchtung mit Kehle am Ansatz. In den Blättern: Flächen je Teil, gestrichelt der verdeckte Umriss eines Teils (geraten aus den Zeichnungen), dünn die Wirbelsäulen. Klick auf ein gestricheltes Stück macht es zu einer eigenen Kurve: Knoten ziehen formt sie, ihre Enden bleiben an der schwarzen Linie; „Automatisch“ nimmt sie zurück. Noch ohne Wirkung auf den Körper — gebaut wird damit ab S5.</p>
    </>
  );
}
