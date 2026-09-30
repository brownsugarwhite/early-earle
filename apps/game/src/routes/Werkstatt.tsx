import type { CSSProperties } from 'react';
import { Link, useLocation } from 'react-router';
import { Glyph } from '../overlay/glyphs';
import { WERKSTATT_EDITORS, WERKSTATT_LABS, type WerkstattEntry } from '../overlay/werkstattCatalog';
import { ConnectionCard } from '../editor/content/ConnectionCard';

function Tile({ entry }: { entry: WerkstattEntry }) {
  return (
    <li>
      <Link to={entry.to} className="ws-tile" style={{ '--tile': entry.color } as CSSProperties} data-testid={`ws-${entry.id}`}>
        <span className="ws-glyph" aria-hidden="true">
          <Glyph name={entry.glyph} size={30} />
        </span>
        <span className="ws-text">
          <b>{entry.name}</b>
          <small>{entry.desc}</small>
        </span>
        {entry.code ? (
          <span className="ws-code" aria-hidden="true">
            {entry.code}
          </span>
        ) : null}
        <span className="ws-go" aria-hidden="true">
          <Glyph name="chevron" size={16} />
        </span>
      </Link>
    </li>
  );
}

/**
 * `/werkstatt` (also `/lab`): every lab and editor with a German name and a one-line description, the save
 * target (Mac or local, with the Mac address in the app) and the way back to the game. Reachable in the iOS app
 * through the wrench on the map (native glass pill) — the app has no URL bar.
 */
export function Werkstatt() {
  // `?test=1` (earlyearle://werkstatt?test=1): full connection test with a write on open.
  const autoTest = new URLSearchParams(useLocation().search).get('test') === '1';
  return (
    <div className="page-scroll ws-scroll">
      <main className="page werkstatt" data-testid="werkstatt">
        <nav className="ws-top" aria-label="Navigation">
          <Link to="/play" className="ws-back" data-testid="werkstatt-game">
            <Glyph name="back" size={18} />
            Zurück zum Spiel
          </Link>
        </nav>
        <header className="ws-head">
          <span className="ws-mark" aria-hidden="true">
            <Glyph name="wrench" size={40} />
          </span>
          <div>
            <h1 className="ws-title">Werkstatt</h1>
            <p className="ws-lede">Labs und Editoren zum Ausprobieren.</p>
          </div>
        </header>

        <ConnectionCard autoTest={autoTest} />

        <section className="ws-group" aria-labelledby="ws-h-editoren">
          <h2 id="ws-h-editoren" className="ws-h">
            Editoren
          </h2>
          <ul className="ws-list">
            {WERKSTATT_EDITORS.map((e) => (
              <Tile key={e.id} entry={e} />
            ))}
          </ul>
        </section>

        <section className="ws-group" aria-labelledby="ws-h-labs">
          <h2 id="ws-h-labs" className="ws-h">
            Labs
          </h2>
          <ul className="ws-list">
            {WERKSTATT_LABS.map((e) => (
              <Tile key={e.id} entry={e} />
            ))}
          </ul>
        </section>

        <p className="ws-foot">
          Regler liegen unten im Sheet: antippen oder hochziehen. Direkt öffnen, z. B. aus Kurzbefehlen: <code>earlyearle://lab/earle</code>
        </p>
      </main>
    </div>
  );
}
