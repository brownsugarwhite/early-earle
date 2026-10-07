import { useId, useState } from 'react';
import { shareMessage } from '../../editor/content/share';
import { STIL_DIR, STIL_FILE, VORLAGEN_DIR, dateiId, sichereStil, sichereVorlage, teileVorlage } from './content';
import { WESEN_VORLAGEN } from './presets';
import { stilGleich } from './regler';
import { useVorlagenDateien } from './vorlagenDateien';
import { useWesenStore, vorlageBauplan } from './wesenStore';
import { WesenIcon } from './icons';

/**
 * Laden und Sichern im Wesen-Lab: Vorlagen aus presets.ts und aus `content/creatures/vorlagen` (Mac, App-Bündel,
 * lokal) in einer Auswahl mit Blättern; Name → Dateiname, Sichern auf den Mac (sonst lokal) mit Rückfrage vor dem
 * Überschreiben fremder Dateien, Teilen; Stil-Vorgabe (`content/creatures/stil.json`) im Tab „Licht & Stil“.
 */

const st = () => useWesenStore.getState();

interface Eintrag {
  wert: string;
  name: string;
  laden: () => void;
}

function useEintraege(): { lab: Eintrag[]; dateien: Eintrag[] } {
  const dateien = useVorlagenDateien((s) => s.dateien);
  return {
    lab: WESEN_VORLAGEN.map((v) => ({
      wert: v.id,
      name: v.name,
      laden: () => {
        const b = vorlageBauplan(v.id);
        if (b) st().ladeBauplan(b, { art: 'vorlage', id: v.id });
      },
    })),
    dateien: dateien.map((d) => ({
      wert: `datei:${d.file}`,
      name: `${d.name} · ${d.ort === 'Mac' ? d.file : d.ort === 'App' ? `${d.file} (App)` : `${d.file} (lokal)`}`,
      laden: () => st().ladeBauplan(d.bauplan, { art: 'datei', id: d.file, ort: d.ort }),
    })),
  };
}

/** Vorlagen und gespeicherte Dateien: Auswahl plus Blättern (◀ ▶). */
export function VorlagenWahl() {
  const quelle = useWesenStore((s) => s.quelle);
  const { lab, dateien } = useEintraege();
  const alle = [...lab, ...dateien];
  const wert = quelle.art === 'vorlage' ? quelle.id : quelle.art === 'datei' ? `datei:${quelle.id}` : '';
  const bekannt = alle.some((e) => e.wert === wert);
  const idx = alle.findIndex((e) => e.wert === wert);
  const blaettern = (d: number) => {
    const n = alle.length;
    const start = idx < 0 ? (d > 0 ? -1 : 0) : idx;
    alle[(start + d + n) % n]?.laden();
  };
  return (
    <div className="wl-vorlage">
      <button type="button" className="wl-btn wl-btn--icon" onClick={() => blaettern(-1)} aria-label="Vorige Vorlage" data-testid="wl-vorlage-zurueck">
        <WesenIcon name="links" />
      </button>
      <label className="wl-vorlage-wahl">
        <span className="wl-sr">Vorlage</span>
        <select value={bekannt ? wert : ''} onChange={(e) => alle.find((x) => x.wert === e.target.value)?.laden()} data-testid="wesen-vorlage">
          {!bekannt ? <option value="">{quelle.art === 'datei' ? quelle.id : 'eigener Entwurf'}</option> : null}
          <optgroup label="Lab-Vorlagen">
            {lab.map((e) => (
              <option key={e.wert} value={e.wert}>
                {e.name}
              </option>
            ))}
          </optgroup>
          {dateien.length > 0 ? (
            <optgroup label="Gespeichert (content/creatures/vorlagen)">
              {dateien.map((e) => (
                <option key={e.wert} value={e.wert}>
                  {e.name}
                </option>
              ))}
            </optgroup>
          ) : null}
        </select>
      </label>
      <button type="button" className="wl-btn wl-btn--icon" onClick={() => blaettern(1)} aria-label="Nächste Vorlage" data-testid="wl-vorlage-weiter">
        <WesenIcon name="rechts" />
      </button>
    </div>
  );
}

/** Lab-Vorlagen als Schnellwahl: eine wischbare Chipreihe, ein Tipp lädt (Kennungen `wesen-vorlage-<id>`). */
export function VorlagenChips() {
  const quelle = useWesenStore((s) => s.quelle);
  const { lab } = useEintraege();
  return (
    <div className="wl-chipreihe" role="group" aria-label="Lab-Vorlagen">
      {lab.map((e) => {
        const aktiv = quelle.art === 'vorlage' && quelle.id === e.wert;
        return (
          <button key={e.wert} type="button" className="wl-chip" data-active={aktiv} aria-pressed={aktiv} onClick={e.laden} data-testid={`wesen-vorlage-${e.wert}`}>
            {e.name}
          </button>
        );
      })}
    </div>
  );
}

/** Name, Zieldatei, Sichern und Teilen. */
export function DateiBereich() {
  const name = useWesenStore((s) => s.bauplan.name);
  const quelle = useWesenStore((s) => s.quelle);
  const online = useVorlagenDateien((s) => s.online);
  const [frage, setFrage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const id = useId();
  const file = `${dateiId(name)}.json`;
  const eigene = quelle.art === 'datei' && quelle.id === file;

  const sichern = async (ueberschreiben: boolean) => {
    if (busy) return;
    setBusy(true);
    setFrage(null);
    try {
      const b = st().bauplan;
      const r = await sichereVorlage(file, b, !ueberschreiben && !eigene);
      if (r.existiert) {
        setFrage(file);
        return;
      }
      st().melde(r.text, r.ok ? 'ok' : 'fehler');
      if (r.ok) {
        st().merkeDatei(file, r.ziel === 'mac' ? 'Mac' : 'Lokal');
        void useVorlagenDateien.getState().laden();
      }
    } finally {
      setBusy(false);
    }
  };

  const teilen = async () => {
    const outcome = await teileVorlage(file, st().bauplan);
    st().melde(shareMessage(outcome, file), outcome === 'fehler' ? 'fehler' : 'info');
  };

  return (
    <section className="wl-datei" aria-label="Datei">
      <div className="wl-datei-zeile">
        <label className="wl-feld" htmlFor={id}>
          <span className="wl-sr">Name des Wesens</span>
          <input
            id={id}
            type="text"
            value={name}
            maxLength={60}
            placeholder="Name des Wesens"
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            onChange={(e) => st().setzeBauplanWert('name', e.target.value, 'name')}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void sichern(false);
            }}
            data-testid="wl-name"
          />
        </label>
        <button type="button" className="wl-btn wl-btn--haupt" disabled={busy || !name.trim()} onClick={() => void sichern(false)} data-testid="wl-speichern" title={online === false ? 'Mac nicht erreichbar: sichert lokal in diesem Browser' : 'Sichert nach content/creatures/vorlagen auf dem Mac'}>
          <WesenIcon name="speichern" size={20} />
          <span>Speichern</span>
        </button>
        <button type="button" className="wl-btn wl-btn--icon" onClick={() => void teilen()} aria-label="Teilen (JSON)" title="Als JSON teilen oder herunterladen" data-testid="wl-teilen">
          <WesenIcon name="teilen" size={20} />
        </button>
      </div>
      <small className="wl-datei-ziel" data-testid="wl-datei-ziel">
        → content/{VORLAGEN_DIR}/{file}
        {eigene ? ' (geladen)' : ''}
        {online === false ? ' · ohne Mac: lokal' : ''}
      </small>
      {frage ? (
        <div className="wl-frage" role="alertdialog" aria-label="Datei überschreiben?" data-testid="wl-frage">
          <span>„{frage}“ gibt es schon. Überschreiben?</span>
          <button type="button" className="wl-btn wl-btn--akt" onClick={() => void sichern(true)} data-testid="wl-ueberschreiben">
            Überschreiben
          </button>
          <button type="button" className="wl-btn" onClick={() => setFrage(null)}>
            Abbrechen
          </button>
        </div>
      ) : null}
    </section>
  );
}

/** Stil-Vorgabe (Tab „Licht & Stil“): Stand, Abweichung, als Vorgabe sichern. */
export function StilVorgabeBereich() {
  const abweichend = useWesenStore((s) => !stilGleich(s.stil, s.stilVorgabe));
  const quelle = useWesenStore((s) => s.stilQuelle);
  const [busy, setBusy] = useState(false);
  const sichern = async () => {
    setBusy(true);
    try {
      const stil = st().stil;
      const r = await sichereStil(stil);
      st().melde(r.text, r.ok ? 'ok' : 'fehler');
      if (r.ok) st().setStilVorgabe(stil, r.ziel === 'mac' ? 'Mac' : 'Lokal');
    } finally {
      setBusy(false);
    }
  };
  const herkunft = quelle === 'Standard' ? 'Standard des Materials (noch keine stil.json)' : quelle === 'App' ? `content/${STIL_DIR}/${STIL_FILE} (App)` : quelle === 'Lokal' ? `${STIL_FILE} lokal (Mac fehlt noch)` : `content/${STIL_DIR}/${STIL_FILE}`;
  return (
    <section className="wl-gruppe" aria-label="Stil-Vorgabe" data-testid="wl-stil-vorgabe">
      <h3 className="wl-gruppe-titel">Stil-Vorgabe für alle Wesen</h3>
      <p className="wl-inaktiv">
        Vorgabe: {herkunft}. {abweichend ? 'Der Stil hier weicht davon ab.' : 'Der Stil hier entspricht ihr.'}
      </p>
      <div className="wl-knopfreihe">
        <button type="button" className="wl-btn wl-btn--haupt" disabled={busy || !abweichend} onClick={() => void sichern()} data-testid="wl-stil-sichern">
          <WesenIcon name="speichern" size={20} />
          <span>Als Vorgabe sichern</span>
        </button>
      </div>
    </section>
  );
}
