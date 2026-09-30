import { useEffect, useState } from 'react';
import { Glyph } from '../../overlay/glyphs';
import { useContentTarget } from './target';

const hostOf = (url: string) => url.replace(/^https?:\/\//, '');

/**
 * Save target of the editors, as a card (Werkstatt): connected to the Mac → saves go straight into `content/`;
 * not reachable → saves stay on the device and can be shared as JSON. In the app the Mac address is editable
 * (default http://192.168.1.55:5174) with a connection test.
 */
export function ConnectionCard() {
  const mode = useContentTarget((s) => s.mode);
  const macUrl = useContentTarget((s) => s.macUrl);
  const status = useContentTarget((s) => s.status);
  const host = useContentTarget((s) => s.host);
  const error = useContentTarget((s) => s.error);
  const setMacUrl = useContentTarget((s) => s.setMacUrl);
  const check = useContentTarget((s) => s.check);
  const [draft, setDraft] = useState(macUrl);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    void check(true);
  }, [check]);
  useEffect(() => setDraft(macUrl), [macUrl]);

  const online = status === 'verbunden';
  const checking = status === 'prüft' || status === 'unbekannt';
  const title = checking ? 'Prüfe Verbindung …' : online ? (mode === 'dev' ? 'Speichert direkt auf dem Mac' : 'Mac verbunden') : mode === 'dev' ? 'Kein Dev-Endpunkt' : 'Mac nicht erreichbar';
  const sub = online
    ? `${host ?? 'Dev-Server'}${mode === 'mac' ? ` · ${hostOf(macUrl)}` : ''}`
    : checking
      ? hostOf(macUrl)
      : `${error ?? 'keine Verbindung'}${mode === 'mac' ? ` · ${hostOf(macUrl)}` : ''}`;

  return (
    <section className="ws-conn" data-status={status} data-testid="werkstatt-connection" aria-live="polite">
      <div className="ws-conn-row">
        <span className="ws-conn-icon" aria-hidden="true">
          <Glyph name={online ? 'mac' : 'phone'} size={26} />
        </span>
        <div className="ws-conn-text">
          <b data-testid="werkstatt-connection-title">{title}</b>
          <small>{sub}</small>
        </div>
        <button type="button" className="ws-btn" onClick={() => void check(true)} disabled={status === 'prüft'} data-testid="werkstatt-check">
          Prüfen
        </button>
      </div>
      <p className="ws-conn-hint">
        {online
          ? 'Editoren speichern direkt in content/ auf dem Mac.'
          : 'Editoren speichern lokal auf diesem Gerät. „Teilen“ schickt die JSON-Datei weiter, z. B. per AirDrop.'}
      </p>
      {mode === 'mac' ? (
        <form
          className="ws-conn-form"
          onSubmit={(e) => {
            e.preventDefault();
            const ok = setMacUrl(draft);
            setInvalid(!ok);
            if (ok) void check(true);
          }}
        >
          <label className="ws-field">
            <span>Mac-Adresse</span>
            <input
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setInvalid(false);
              }}
              inputMode="url"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              aria-invalid={invalid}
              placeholder="http://192.168.1.55:5174"
              data-testid="werkstatt-mac-url"
            />
          </label>
          <button type="submit" className="ws-btn ws-btn-primary" data-testid="werkstatt-mac-test">
            Verbindung testen
          </button>
          <small className="ws-conn-note">Auf dem Mac: pnpm --filter @ee/game dev:http · gleiches WLAN</small>
        </form>
      ) : null}
    </section>
  );
}
