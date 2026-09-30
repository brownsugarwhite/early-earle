import { useEffect, useState } from 'react';
import { Glyph } from '../../overlay/glyphs';
import { useContentTarget } from './target';

const hostOf = (url: string) => url.replace(/^https?:\/\//, '');

/**
 * Save target of the editors, as a card (Werkstatt): connected to the Mac → saves go straight into `content/`;
 * not reachable → saves stay on the device and can be shared as JSON. „Testen“ pings the Mac and writes/deletes
 * a throwaway file. In the app the Mac address is editable (default http://192.168.1.55:5174).
 * `autoTest` (Werkstatt `?test=1`, e.g. `earlyearle://werkstatt?test=1`) runs the full test on open.
 */
export function ConnectionCard({ autoTest = false }: { autoTest?: boolean }) {
  const mode = useContentTarget((s) => s.mode);
  const macUrl = useContentTarget((s) => s.macUrl);
  const status = useContentTarget((s) => s.status);
  const host = useContentTarget((s) => s.host);
  const error = useContentTarget((s) => s.error);
  const write = useContentTarget((s) => s.write);
  const setMacUrl = useContentTarget((s) => s.setMacUrl);
  const check = useContentTarget((s) => s.check);
  const testWrite = useContentTarget((s) => s.testWrite);
  const [draft, setDraft] = useState(macUrl);
  const [invalid, setInvalid] = useState(false);
  const [testing, setTesting] = useState(false);

  const runTest = async () => {
    setTesting(true);
    await testWrite();
    setTesting(false);
  };

  // Once on open: the full test when asked for (?test=1), else just the ping.
  useEffect(() => {
    if (autoTest) void runTest();
    else void check(true);
  }, []);
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
        <button type="button" className="ws-btn" onClick={() => void runTest()} disabled={testing || status === 'prüft'} data-testid="werkstatt-check">
          {testing ? 'Teste …' : 'Testen'}
        </button>
      </div>
      {write ? (
        <p className="ws-conn-write" data-ok={write.ok} data-testid="werkstatt-write">
          {write.ok ? '✓' : '✕'} {write.message}
        </p>
      ) : null}
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
            if (ok) void runTest();
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
            Übernehmen
          </button>
          <small className="ws-conn-note">Auf dem Mac: pnpm --filter @ee/game dev:http · gleiches WLAN</small>
        </form>
      ) : null}
    </section>
  );
}
