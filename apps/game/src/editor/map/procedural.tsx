import { useMemo, type CSSProperties } from 'react';
import { Link } from 'react-router';
import { proceduralWorld } from '@ee/render';
import { WorldCatalog } from '@ee/world';
import { planetWorlds } from '../../lab/earle/zones';
import { isHex, type Json } from './mapContent';
import { Poster } from './Poster';

/** Seed der Karte (MapWorld) — dieselben prozeduralen Welten wie im Spiel und im Earle-Lab. */
const MAP_SEED = 7;
/** Prozedurale Welten in der Liste: Welt 11 … 40 (wie der Weltwähler des Earle-Labs). */
export const PROCEDURAL_COUNT = 30;

export interface ProceduralEntry {
  /** Weltkennung (0-basiert; 10 = Welt 11). */
  id: number;
  json: Json;
  parents: [string, string];
  mix: number;
  hue: number;
}

/**
 * Die prozeduralen Welten ab Welt 11 (ADR 0002: nach Level 100 erzeugt die Ebene ihre Welten aus den zehn Autorenwelten
 * — zwei Eltern, Mischanteil, Farbdreh). Sie haben keine Datei: der Editor zeigt sie nur (Poster, Palette, Werte als
 * JSON); ändern lassen sie sich über ihre Eltern.
 */
export function useProceduralWorlds(): ProceduralEntry[] {
  return useMemo(() => {
    const authored = planetWorlds();
    const catalog = new WorldCatalog(
      authored.map((w) => w.params),
      MAP_SEED,
    );
    const out: ProceduralEntry[] = [];
    for (let k = 0; k < PROCEDURAL_COUNT; k++) {
      const id = authored.length + k;
      const w = proceduralWorld(id, authored, catalog);
      const r = catalog.recipe(id);
      const a = authored[r?.parentA ?? 0]!;
      const b = authored[r?.parentB ?? 0]!;
      out.push({
        id,
        parents: [a.name, b.name],
        mix: r?.t ?? 0,
        hue: r?.hue ?? 0,
        json: {
          ref: String(id + 1),
          name: w.name,
          zone: 'prozedural',
          title: `aus ${a.name} und ${b.name}`,
          palette: w.palette as unknown as Json,
          terrain: w.params.terrain as unknown as Json,
          vegetation: w.params.vegetation as unknown as Json,
          fog: w.fog,
          fogStripes: w.fogStripes,
          view: w.view as unknown as Json,
          ground: w.ground,
        },
      });
    }
    return out;
  }, []);
}

function Strip({ json }: { json: Json }) {
  const p = (json.palette ?? {}) as Record<string, unknown>;
  const cols: string[] = [];
  for (const k of ['sky', 'terrain', 'canopy', 'accent', 'ink']) {
    const v = p[k];
    if (isHex(v)) cols.push(v);
    else if (Array.isArray(v)) for (const c of v.slice(0, 3)) if (isHex(c)) cols.push(c);
  }
  return (
    <span className="map-strip" aria-hidden="true">
      {cols.slice(0, 10).map((c, i) => (
        <i key={i} style={{ background: c }} />
      ))}
    </span>
  );
}

/** Liste der prozeduralen Welten (Karten wie die Autorenwelten, Kennzeichen „nur lesen“). */
export function ProceduralList({ entries, onOpen }: { entries: ProceduralEntry[]; onOpen: (id: number) => void }) {
  return (
    <ul className="map-list" data-testid="map-procedural-list">
      {entries.map((e) => (
        <li key={e.id}>
          <button type="button" className="map-card" onClick={() => onOpen(e.id)} data-testid={`map-proc-${e.id + 1}`}>
            <span className="map-card-no">{e.id + 1}</span>
            <span className="map-card-text">
              <b>{String(e.json.name)}</b>
              <small>
                {e.parents[0]} × {e.parents[1]} · {Math.round(e.mix * 100)} % · Farbdreh {Math.round(e.hue)}°
              </small>
              <Strip json={e.json} />
            </span>
            <span className="map-card-flag" data-kind="local">
              nur lesen
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Detail einer prozeduralen Welt: Poster, Palette (ohne Farbwahl), Rezept, Werte als JSON (nur lesen), Earle-Lab. */
export function ProceduralDetail({ entry }: { entry: ProceduralEntry }) {
  const palette = (entry.json.palette ?? {}) as Record<string, unknown>;
  return (
    <div className="map-detail" data-testid="map-procedural-detail">
      <div className="map-poster-wrap">
        <Poster kind="welt" json={entry.json} />
      </div>
      <div className="map-panel">
        <div className="map-actions">
          <Link className="map-btn" to={`/lab/earle?world=${entry.id + 1}`} data-testid="map-open-lab">
            Im Earle-Lab
          </Link>
        </div>
        <p className="map-hint">
          Prozedural erzeugt (ADR 0002): {entry.parents[0]} × {entry.parents[1]}, Mischanteil {Math.round(entry.mix * 100)} %, Farbdreh {Math.round(entry.hue)}°. Keine Datei —
          sie folgt ihren Elternwelten; ändern lässt sie sich dort.
        </p>
        <div className="map-palette">
          {Object.entries(palette).map(([name, value]) => {
            const list = isHex(value) ? [value] : Array.isArray(value) ? (value as unknown[]).flat().filter(isHex) : [];
            if (list.length === 0) return null;
            return (
              <div className="map-pal-row" key={name}>
                <span className="map-pal-label">{name}</span>
                <div className="map-ramp">
                  {list.map((c, i) => (
                    <span key={i} className="map-swatch" style={{ '--swatch': c } as CSSProperties} title={`${name} ${i + 1}: ${c}`} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div className="map-json">
          <textarea readOnly value={JSON.stringify(entry.json, null, 2)} spellCheck={false} data-testid="map-json" />
        </div>
      </div>
    </div>
  );
}
