import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router';
import { LabNav } from '../../overlay/LabNav';
import { Glyph } from '../../overlay/glyphs';
import { UiIcon } from '../levels/icons';
import { IS_NATIVE, useContentTarget } from '../content/target';
import { downloadJson, shareJson, shareMessage } from '../content/share';
import { Poster } from './Poster';
import { PROCEDURAL_COUNT, ProceduralDetail, ProceduralList, useProceduralWorlds } from './procedural';
import { getAt, isHex, loadMapFiles, saveMapFile, setAt, validateMap, type Json, type MapFile, type MapKind } from './mapContent';

type Tab = 'farben' | 'werte' | 'text' | 'json';
const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'farben', label: 'Farben' },
  { id: 'werte', label: 'Werte' },
  { id: 'text', label: 'Text' },
  { id: 'json', label: 'JSON' },
];

const PAL_LABEL: Record<string, string> = {
  sky: 'Himmel',
  sun: 'Sonne',
  sunRing: 'Sonnenring',
  fog: 'Nebel',
  fogAlpha: 'Nebel-Deckkraft',
  terrain: 'Gelände',
  terrainLight: 'Gelände hell',
  terrainDark: 'Gelände dunkel',
  canopy: 'Kronen',
  canopyVariants: 'Kronen-Varianten',
  ink: 'Tinte',
  accent: 'Akzente',
  accents: 'Akzente',
};

interface NumberField {
  path: Array<string | number>;
  label: string;
  min: number;
  max: number;
  step: number;
}
const WORLD_NUMBERS: NumberField[] = [
  { path: ['terrain', 'amplitude'], label: 'Hügelhöhe', min: 0, max: 4, step: 0.05 },
  { path: ['terrain', 'wavelength'], label: 'Hügelbreite', min: 0.3, max: 3, step: 0.05 },
  { path: ['terrain', 'slope'], label: 'Neigung', min: 0, max: 1, step: 0.01 },
  { path: ['vegetation', 'density'], label: 'Baumdichte', min: 0, max: 1, step: 0.01 },
  { path: ['vegetation', 'clumpiness'], label: 'Gruppierung', min: 0, max: 1, step: 0.01 },
  { path: ['vegetation', 'trunkWidth'], label: 'Stammbreite', min: 0, max: 1.5, step: 0.01 },
  { path: ['fogStripes'], label: 'Nebelstreifen', min: 0, max: 1, step: 0.01 },
  { path: ['fog', 'start'], label: 'Nebel ab', min: 0, max: 30, step: 0.5 },
  { path: ['fog', 'range'], label: 'Nebel-Tiefe', min: 1, max: 40, step: 0.5 },
  { path: ['view', 'height'], label: 'Kamera-Höhe', min: 1, max: 20, step: 0.1 },
  { path: ['view', 'forward'], label: 'Kamera vor', min: 0, max: 20, step: 0.1 },
  { path: ['view', 'look'], label: 'Blickweite', min: 0, max: 20, step: 0.1 },
  { path: ['view', 'fov'], label: 'Brennweite (FOV)', min: 20, max: 90, step: 1 },
  { path: ['view', 'curvature'], label: 'Krümmung', min: 0, max: 0.4, step: 0.005 },
];
const ZONE_NUMBERS: NumberField[] = [
  { path: ['levelRange', 0], label: 'Level von', min: 1, max: 100, step: 1 },
  { path: ['levelRange', 1], label: 'Level bis', min: 1, max: 100, step: 1 },
];
const ZONE_IDS = ['tjorizo', 'syrup', 'luzz', 'wooding'] as const;
const MATERIALS = [
  ['jelly', 'Gelee'],
  ['liquid', 'Flüssig'],
  ['gas', 'Gas'],
  ['fire', 'Feuer'],
] as const;

const keyOf = (f: Pick<MapFile, 'dir' | 'file'>) => `${f.dir}/${f.file}`;
const DRAFT_PREFIX = 'ee.editor.map.draft.';
function readDraft(key: string): Json | null {
  try {
    const raw = localStorage.getItem(DRAFT_PREFIX + key);
    return raw ? (JSON.parse(raw) as Json) : null;
  } catch {
    return null;
  }
}
function writeDraft(key: string, json: Json | null): void {
  try {
    if (json) localStorage.setItem(DRAFT_PREFIX + key, JSON.stringify(json));
    else localStorage.removeItem(DRAFT_PREFIX + key);
  } catch {
    /* not remembered */
  }
}

function paletteOf(json: Json): Record<string, unknown> {
  return (json.palette ?? {}) as Record<string, unknown>;
}

/** A strip of the file's key colours for the list cards. */
function Strip({ json }: { json: Json }) {
  const p = paletteOf(json);
  const cols: string[] = [];
  for (const k of ['sky', 'terrain', 'canopy', 'terrainLight', 'terrainDark', 'accents', 'accent', 'ink']) {
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

function Swatch({ value, label, onChange, testId }: { value: string; label: string; onChange: (hex: string) => void; testId?: string }) {
  return (
    <label className="map-swatch" style={{ '--swatch': value } as CSSProperties} title={`${label}: ${value}`} data-testid={testId}>
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} aria-label={`${label} ${value}`} />
    </label>
  );
}

function PaletteRow({ name, value, onSet }: { name: string; value: unknown; onSet: (path: Array<string | number>, v: unknown) => void }) {
  const label = PAL_LABEL[name] ?? name;
  if (isHex(value)) {
    return (
      <div className="map-pal-row">
        <span className="map-pal-label">{label}</span>
        <div className="map-ramp">
          <Swatch value={value} label={label} onChange={(hex) => onSet([name], hex)} testId={`map-swatch-${name}`} />
          <code>{value}</code>
        </div>
      </div>
    );
  }
  if (Array.isArray(value) && value.length && value.every(isHex)) {
    return (
      <div className="map-pal-row">
        <span className="map-pal-label">
          {label} <small>{value.length}</small>
        </span>
        <div className="map-ramp">
          {value.map((c, i) => (
            <Swatch key={i} value={c} label={`${label} ${i + 1}`} onChange={(hex) => onSet([name, i], hex)} testId={`map-swatch-${name}-${i}`} />
          ))}
        </div>
      </div>
    );
  }
  if (Array.isArray(value) && value.length && value.every((r) => Array.isArray(r) && r.every(isHex))) {
    return (
      <div className="map-pal-row">
        <span className="map-pal-label">{label}</span>
        {(value as string[][]).map((ramp, j) => (
          <div className="map-ramp" key={j}>
            <small className="map-ramp-no">{j + 1}</small>
            {ramp.map((c, i) => (
              <Swatch key={i} value={c} label={`${label} ${j + 1}.${i + 1}`} onChange={(hex) => onSet([name, j, i], hex)} />
            ))}
          </div>
        ))}
      </div>
    );
  }
  if (Array.isArray(value) && value.length && value.every((n) => typeof n === 'number')) {
    return (
      <div className="map-pal-row">
        <span className="map-pal-label">{label}</span>
        <div className="map-alphas">
          {(value as number[]).map((n, i) => (
            <label key={i} className="map-alpha">
              <span>{i + 1}</span>
              <input type="range" min={0} max={1} step={0.01} value={n} onChange={(e) => onSet([name, i], Number(e.target.value))} aria-label={`${label} ${i + 1}`} />
              <output>{n.toFixed(2)}</output>
            </label>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

interface Session {
  key: string;
  past: Json[];
  future: Json[];
}

/**
 * Map-Editor (iPhone at 393 × 852 included): the four zones and ten Earle worlds as a list, each with a flat
 * serigraph poster of its palette; colours via the system colour picker, key values as sliders, texts, raw JSON.
 * Unsaved changes stay on the device; "Speichern" writes to the Mac (dev endpoint, from the app over the WLAN),
 * without a connection locally, "Teilen" hands the JSON to the share sheet.
 */
export function MapEditor() {
  const [files, setFiles] = useState<MapFile[] | null>(null);
  const [online, setOnline] = useState(false);
  const [kind, setKind] = useState<MapKind | 'prozedural'>('welt');
  // Prozedurale Welten ab Welt 11 (nur lesen): Auswahl nach Kennung
  const [procSel, setProcSel] = useState<number | null>(null);
  const procedural = useProceduralWorlds();
  const [selected, setSelected] = useState<string | null>(() => new URLSearchParams(location.search).get('file'));
  const [drafts, setDrafts] = useState<Record<string, Json>>({});
  const [tab, setTab] = useState<Tab>('farben');
  const [toast, setToast] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const session = useRef<Session>({ key: '', past: [], future: [] });
  // Undo/redo stacks live in a ref; this counter re-renders when only they change.
  const [, setHistTick] = useState(0);
  const macHost = useContentTarget((s) => s.host);

  const reload = async () => {
    const r = await loadMapFiles();
    setOnline(r.online);
    setFiles(r.files);
    const d: Record<string, Json> = {};
    for (const f of r.files) {
      const stored = readDraft(keyOf(f));
      if (stored && JSON.stringify(stored) !== JSON.stringify(f.json)) d[keyOf(f)] = stored;
      else if (stored) writeDraft(keyOf(f), null);
    }
    setDrafts(d);
  };
  useEffect(() => {
    void reload();
  }, []);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3600);
    return () => clearTimeout(id);
  }, [toast]);

  const file = files?.find((f) => keyOf(f) === selected) ?? null;
  const key = file ? keyOf(file) : '';
  const draft: Json | null = file ? (drafts[key] ?? file.json) : null;
  const dirty = !!file && !!drafts[key];
  const issues = useMemo(() => (file && draft ? validateMap(file.kind, draft) : []), [file, draft]);
  if (session.current.key !== key) session.current = { key, past: [], future: [] };

  // The JSON tab starts from the current draft whenever it opens or the file changes (not on every keystroke).
  const draftRef = useRef(draft);
  draftRef.current = draft;
  useEffect(() => {
    if (tab === 'json' && draftRef.current) setJsonText(JSON.stringify(draftRef.current, null, 2));
  }, [tab, key]);

  const commit = (next: Json, record = true) => {
    if (!file || !draft) return;
    if (record) {
      session.current.past.push(draft);
      if (session.current.past.length > 60) session.current.past.shift();
      session.current.future = [];
    }
    const same = JSON.stringify(next) === JSON.stringify(file.json);
    setDrafts((d) => {
      const out = { ...d };
      if (same) delete out[key];
      else out[key] = next;
      return out;
    });
    writeDraft(key, same ? null : next);
    setHistTick((n) => n + 1);
  };
  const set = (path: Array<string | number>, value: unknown) => draft && commit(setAt(draft, path, value));
  const undo = () => {
    const prev = session.current.past.pop();
    if (!prev || !draft) return;
    session.current.future.push(draft);
    commit(prev, false);
  };
  const redo = () => {
    const next = session.current.future.pop();
    if (!next || !draft) return;
    session.current.past.push(draft);
    commit(next, false);
  };

  const save = async () => {
    if (!file || !draft || issues.length) return;
    setSaving(true);
    const r = await saveMapFile(file, draft);
    setSaving(false);
    setToast({ kind: r.ok ? 'ok' : 'error', text: r.message });
    if (!r.ok) return;
    setFiles((fs) => (fs ? fs.map((f) => (keyOf(f) === key ? { ...f, json: draft, source: r.target === 'mac' ? 'Mac' : 'Lokal', pendingLocal: false } : f)) : fs));
    setDrafts((d) => {
      const out = { ...d };
      delete out[key];
      return out;
    });
    writeDraft(key, null);
    if (r.target === 'mac') setOnline(true);
  };
  const share = async () => {
    if (!file || !draft) return;
    const outcome = await shareJson(file.file, draft, String(draft.name ?? file.file));
    if (outcome !== 'abgebrochen') setToast({ kind: outcome === 'fehler' ? 'error' : 'ok', text: shareMessage(outcome, file.file) });
  };

  const target = (
    <span className="map-target" data-state={online ? 'mac' : 'lokal'} data-testid="save-target" title={online ? `Speichert auf dem Mac${macHost ? ` (${macHost})` : ''}` : 'Speichert lokal auf diesem Gerät'}>
      <Glyph name={online ? 'mac' : 'phone'} size={16} />
      {online ? 'Mac' : 'Lokal'}
      {online && macHost ? <span className="map-target-host">· {macHost}</span> : null}
    </span>
  );

  // ---- procedural world (read only) ----
  const procEntry = procSel !== null ? procedural.find((e) => e.id === procSel) : undefined;
  if (procEntry) {
    return (
      <div className="map-ed" data-testid="editor-map" data-procedural={procEntry.id + 1}>
        <header className="map-top">
          <button type="button" className="map-back" onClick={() => setProcSel(null)} data-testid="map-back" aria-label="Zur Liste">
            <UiIcon name="back" size={20} />
          </button>
          <div className="map-head-text">
            <b>{String(procEntry.json.name)}</b>
            <small>
              <i aria-hidden="true" />
              Prozedural · nur lesen
            </small>
          </div>
          {target}
        </header>
        <ProceduralDetail entry={procEntry} />
      </div>
    );
  }

  // ---- list ----
  if (!file || !draft) {
    const list = (files ?? []).filter((f) => f.kind === kind);
    return (
      <div className="map-ed" data-testid="editor-map">
        <header className="map-top">
          <LabNav />
          <h1 className="map-title">Map-Editor</h1>
          {target}
        </header>
        <div className="map-scroll">
          <div className="map-seg" role="radiogroup" aria-label="Art">
            {(
              [
                ['welt', 'Welten'],
                ['zone', 'Zonen'],
                ['prozedural', 'Prozedural'],
              ] as const
            ).map(([k, label]) => (
              <button key={k} type="button" role="radio" aria-checked={kind === k} className="map-chip" data-active={kind === k} onClick={() => setKind(k)} data-testid={`map-kind-${k}`}>
                {label} <small>{k === 'prozedural' ? PROCEDURAL_COUNT : (files ?? []).filter((f) => f.kind === k).length}</small>
              </button>
            ))}
          </div>
          {files === null ? <p className="map-hint">Lädt …</p> : null}
          {kind === 'prozedural' ? <ProceduralList entries={procedural} onOpen={setProcSel} /> : null}
          <ul className="map-list">
            {list.map((f) => {
              const d = drafts[keyOf(f)];
              const j = d ?? f.json;
              return (
                <li key={keyOf(f)}>
                  <button type="button" className="map-card" onClick={() => setSelected(keyOf(f))} data-testid={`map-file-${f.file.replace(/\.json$/, '')}`}>
                    <span className="map-card-no">{f.kind === 'welt' ? String(j.ref ?? f.file.replace('.json', '')) : String(j.id ?? '').slice(0, 3)}</span>
                    <span className="map-card-text">
                      <b>{String(j.name ?? f.file)}</b>
                      <small>
                        {f.kind === 'welt' ? `${String(j.zone ?? '')} · ${String(j.title ?? '')}` : `Level ${(j.levelRange as number[] | undefined)?.join('–') ?? '?'} · ${String(j.material ?? '')}`}
                      </small>
                      <Strip json={j} />
                    </span>
                    <span className="map-card-flag" data-kind={d ? 'dirty' : f.source === 'Lokal' ? 'local' : 'none'}>
                      {d ? 'ungesichert' : f.source === 'Lokal' ? 'lokal' : ''}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="map-hint">
            {online ? 'Speichern schreibt nach content/zones auf dem Mac.' : 'Mac nicht erreichbar: Änderungen bleiben auf dem Gerät, „Teilen“ schickt die JSON-Datei weiter.'} Welten sieht man im{' '}
            <Link to="/lab/earle">Earle-Lab</Link>.
          </p>
        </div>
        {toast ? <div className="map-toast" data-kind={toast.kind}>{toast.text}</div> : null}
      </div>
    );
  }

  // ---- detail ----
  const numbers = (file.kind === 'welt' ? WORLD_NUMBERS : ZONE_NUMBERS).filter((n) => typeof getAt(draft, n.path) === 'number');
  const palette = paletteOf(draft);
  return (
    <div className="map-ed" data-testid="editor-map" data-file={key}>
      <header className="map-top">
        <button type="button" className="map-back" onClick={() => setSelected(null)} data-testid="map-back" aria-label="Zur Liste">
          <UiIcon name="back" size={20} />
        </button>
        <div className="map-head-text">
          <b>{String(draft.name ?? file.file)}</b>
          <small data-dirty={dirty}>
            <i aria-hidden="true" />
            {dirty ? 'Ungesichert' : file.source === 'Mac' ? 'Auf dem Mac' : file.source === 'Lokal' ? 'Lokal gespeichert' : 'Stand der App'} · {file.dir}/{file.file}
          </small>
        </div>
        {target}
      </header>
      <div className="map-detail">
        <div className="map-poster-wrap">
          <Poster kind={file.kind} json={draft} />
        </div>
        <div className="map-panel">
          <div className="map-actions">
            <button type="button" className="map-btn map-icon" onClick={undo} disabled={session.current.past.length === 0} aria-label="Rückgängig" data-testid="map-undo">
              <UiIcon name="undo" size={20} />
            </button>
            <button type="button" className="map-btn map-icon" onClick={redo} disabled={session.current.future.length === 0} aria-label="Wiederholen" data-testid="map-redo">
              <UiIcon name="redo" size={20} />
            </button>
            <button type="button" className="map-btn map-save" data-target={online ? 'mac' : 'lokal'} onClick={() => void save()} disabled={!dirty || saving || issues.length > 0} data-testid="map-save">
              {saving ? 'Speichert …' : online ? 'Speichern' : 'Lokal speichern'}
              <small>{online ? 'auf dem Mac' : 'ohne Mac'}</small>
            </button>
            <button type="button" className="map-btn" onClick={() => void share()} data-testid="map-share">
              Teilen
            </button>
            {IS_NATIVE ? null : (
              <button type="button" className="map-btn" onClick={() => downloadJson(file.file, draft)}>
                JSON
              </button>
            )}
            {file.kind === 'welt' ? (
              <Link className="map-btn" to={`/lab/earle?world=${String(draft.ref ?? '')}`} data-testid="map-open-lab">
                Im Earle-Lab
              </Link>
            ) : null}
          </div>
          {issues.length ? (
            <pre className="map-issues" data-testid="map-issues">
              {issues.map((i) => `${i.path || '(Datei)'}: ${i.message}`).join('\n')}
            </pre>
          ) : null}
          <div className="map-tabs" role="tablist" aria-label="Bereiche">
            {TABS.map((t) => (
              <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className="map-chip" data-active={tab === t.id} onClick={() => setTab(t.id)} data-testid={`map-tab-${t.id}`}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="map-body">
            {tab === 'farben' ? (
              <div className="map-palette" data-testid="map-palette">
                {Object.entries(palette).map(([name, value]) => (
                  <PaletteRow key={name} name={name} value={value} onSet={(path, v) => set(['palette', ...path], v)} />
                ))}
                <p className="map-hint">Tippen öffnet die Farbwahl. Rampen laufen von dunkel nach hell bzw. vom Horizont nach oben.</p>
              </div>
            ) : null}
            {tab === 'werte' ? (
              <div className="map-numbers">
                {numbers.map((n) => {
                  const v = getAt(draft, n.path) as number;
                  return (
                    <label key={n.path.join('.')} className="map-num" data-testid={`map-num-${n.path.join('-')}`}>
                      <span>{n.label}</span>
                      <output>{Number.isInteger(n.step) ? v : v.toFixed(n.step < 0.01 ? 3 : 2)}</output>
                      <input type="range" min={n.min} max={n.max} step={n.step} value={v} onChange={(e) => set(n.path, Number(e.target.value))} />
                    </label>
                  );
                })}
                {numbers.length === 0 ? <p className="map-hint">Keine Zahlenwerte — alles Weitere im JSON.</p> : null}
              </div>
            ) : null}
            {tab === 'text' ? (
              <div className="map-texts">
                <label className="map-field">
                  <span>Name</span>
                  <input value={String(draft.name ?? '')} onChange={(e) => set(['name'], e.target.value)} data-testid="map-name" />
                </label>
                {typeof draft.title === 'string' ? (
                  <label className="map-field">
                    <span>Titel</span>
                    <input value={draft.title} onChange={(e) => set(['title'], e.target.value)} />
                  </label>
                ) : null}
                {file.kind === 'welt' ? (
                  <label className="map-field">
                    <span>Zone</span>
                    <select value={String(draft.zone ?? '')} onChange={(e) => set(['zone'], e.target.value)}>
                      {ZONE_IDS.map((z) => (
                        <option key={z} value={z}>
                          {z}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <label className="map-field">
                    <span>Material</span>
                    <select value={String(draft.material ?? '')} onChange={(e) => set(['material'], e.target.value)}>
                      {MATERIALS.map(([id, label]) => (
                        <option key={id} value={id}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            ) : null}
            {tab === 'json' ? (
              <div className="map-json">
                <textarea value={jsonText} onChange={(e) => setJsonText(e.target.value)} spellCheck={false} autoCapitalize="off" autoCorrect="off" data-testid="map-json" />
                <div className="map-actions">
                  <button
                    type="button"
                    className="map-btn map-save"
                    onClick={() => {
                      try {
                        commit(JSON.parse(jsonText) as Json);
                        setToast({ kind: 'ok', text: 'JSON übernommen' });
                      } catch (e) {
                        setToast({ kind: 'error', text: `Kein gültiges JSON: ${String(e)}` });
                      }
                    }}
                    data-testid="map-json-apply"
                  >
                    Übernehmen
                  </button>
                  <button type="button" className="map-btn" onClick={() => setJsonText(JSON.stringify(draft, null, 2))}>
                    Zurücksetzen
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      {toast ? (
        <div className="map-toast" data-kind={toast.kind} data-testid="map-toast">
          {toast.text}
        </div>
      ) : null}
    </div>
  );
}
