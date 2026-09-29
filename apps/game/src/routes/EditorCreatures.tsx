import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { BODY_TYPE_LABELS, ZONES, validateGenomeRules, type BodyType, type SlotId, type ZoneId } from '@ee/genome';
import { CanvasHost } from '../canvas/CanvasHost';
import { PerfBadge } from '../overlay/PerfBadge';
import { DEFAULT_CREATURE_LAB_SETTINGS, LabCreatureScene, type BodyChoice, type LabMode } from '../lab/creature/LabCreatureScene';
import { BUNDLED_RULES, BUNDLED_RULES_INPUT, downloadRules, fetchDevRulesInput, saveDevRules } from '../lab/creature/content';
import { UnlockTab } from '../lab/creature/editor/UnlockTab';
import { BodyTab } from '../lab/creature/editor/BodyTab';
import { SocketTab } from '../lab/creature/editor/SocketTab';
import { ScaleTab } from '../lab/creature/editor/ScaleTab';
import { PaletteTab } from '../lab/creature/editor/PaletteTab';
import { TIERS, type RulesDraft } from '../lab/creature/editor/editorState';
import '../lab/creature/creatureLab.css';

type Tab = 'tiers' | 'bodies' | 'sockets' | 'scales' | 'palette' | 'json';
const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'tiers', label: 'Stufen' },
  { id: 'bodies', label: 'Körper' },
  { id: 'sockets', label: 'Sockel' },
  { id: 'scales', label: 'Skalen' },
  { id: 'palette', label: 'Palette' },
  { id: 'json', label: 'JSON' },
];
type Preview = 'gallery' | 'single' | 'compare' | 'motion';
const PREVIEWS: Array<{ id: Preview; label: string }> = [
  { id: 'gallery', label: 'Galerie' },
  { id: 'single', label: 'Einzeln' },
  { id: 'compare', label: 'Vergleichen' },
  { id: 'motion', label: 'Bewegung' },
];
const HISTORY_MAX = 80;

/**
 * Creature-Editor (touch-first): edits `content/genome/rules.json` — unlock schedule per zone/tier
 * (with quick slot toggles), body archetypes (thresholds, presets, motion character), socket positions
 * on a body map, scale ranges and palette ramps — with a sticky live preview (gallery, one creature,
 * two tiers side by side, or the walking archetype). Undo/redo over every change, validation with the
 * zod schema, save via the dev endpoint, download as fallback. Rules and modules are edited here,
 * never single creatures.
 */
export function EditorCreatures() {
  const controller = useMemo(() => new LabCreatureScene({ rules: BUNDLED_RULES, framing: 'editor' }), []);
  const [draft, setDraftRaw] = useState<RulesDraft>(BUNDLED_RULES_INPUT);
  const history = useRef<{ past: RulesDraft[]; future: RulesDraft[] }>({ past: [], future: [] });
  const [histSize, setHistSize] = useState({ past: 0, future: 0 });
  const [zone, setZone] = useState<ZoneId>('tjorizo');
  const [slot, setSlot] = useState<SlotId>('eye');
  const [body, setBody] = useState<BodyType>('quadruped');
  const [tab, setTab] = useState<Tab>('tiers');
  // `?preview=single|compare|motion|gallery` picks the initial preview (links, smoke tests).
  const [preview, setPreview] = useState<Preview>(() => {
    const q = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('preview') : null;
    return PREVIEWS.some((p) => p.id === q) ? (q as Preview) : 'gallery';
  });
  const [tierA, setTierA] = useState(4);
  const [tierB, setTierB] = useState(7);
  const [source, setSource] = useState<'Bundle' | 'Dev-Endpunkt'>('Bundle');
  const [toast, setToast] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [jsonText, setJsonText] = useState('');
  const [saving, setSaving] = useState(false);
  const validation = useMemo(() => validateGenomeRules(draft), [draft]);

  /** Every edit goes through here so it can be undone. */
  const setDraft = useCallback((next: RulesDraft) => {
    setDraftRaw((cur) => {
      const h = history.current;
      h.past.push(cur);
      if (h.past.length > HISTORY_MAX) h.past.shift();
      h.future = [];
      setHistSize({ past: h.past.length, future: 0 });
      return next;
    });
  }, []);
  const undo = useCallback(() => {
    setDraftRaw((cur) => {
      const h = history.current;
      const prev = h.past.pop();
      if (!prev) return cur;
      h.future.push(cur);
      setHistSize({ past: h.past.length, future: h.future.length });
      return prev;
    });
  }, []);
  const redo = useCallback(() => {
    setDraftRaw((cur) => {
      const h = history.current;
      const next = h.future.pop();
      if (!next) return cur;
      h.past.push(cur);
      setHistSize({ past: h.past.length, future: h.future.length });
      return next;
    });
  }, []);

  useEffect(() => {
    let alive = true;
    fetchDevRulesInput().then((r) => {
      if (alive && r) {
        setDraftRaw(r);
        history.current = { past: [], future: [] };
        setHistSize({ past: 0, future: 0 });
        setSource('Dev-Endpunkt');
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  // Keyboard: ⌘Z / Ctrl+Z undo, ⇧⌘Z or Ctrl+Y redo (not while typing JSON).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT')) return;
      if (e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.key.toLowerCase() === 'z' && e.shiftKey) || e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  // Live preview: valid drafts re-resolve the preview (debounced so sliders stay smooth).
  useEffect(() => {
    if (!validation.ok) return;
    const rules = validation.rules;
    const id = setTimeout(() => controller.setRules(rules), 120);
    return () => clearTimeout(id);
  }, [validation, controller]);

  useEffect(() => {
    const mode: LabMode = preview === 'gallery' ? 'gallery' : preview === 'single' ? 'single' : preview === 'compare' ? 'compare' : 'motion';
    const bodyType: BodyChoice = preview === 'motion' ? body : 'auto';
    controller.apply({ ...DEFAULT_CREATURE_LAB_SETTINGS, mode, zone, seed: 7, tier: preview === 'motion' ? Math.max(5, tierA) : tierA, compareTier: tierB, bodyType });
    if (preview === 'motion') setTimeout(() => controller.act('walk'), 50);
  }, [controller, zone, preview, tierA, tierB, body]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if (tab === 'json') setJsonText(JSON.stringify(draft, null, 2));
  }, [tab, draft]);

  const save = async () => {
    setSaving(true);
    const r = await saveDevRules(draft);
    setSaving(false);
    setToast({ kind: r.ok ? 'ok' : 'error', text: r.message });
    if (r.ok) setSource('Dev-Endpunkt');
  };

  const applyJson = () => {
    try {
      setDraft(JSON.parse(jsonText) as RulesDraft);
      setToast({ kind: 'ok', text: 'JSON übernommen' });
    } catch (e) {
      setToast({ kind: 'error', text: `Kein gültiges JSON: ${String(e)}` });
    }
  };

  const tierChips = (value: number, onPick: (t: number) => void, testId: string) => (
    <div className="ced-quick" data-testid={testId}>
      {TIERS.map((t) => (
        <button key={t} type="button" className="ced-chip" data-active={t === value} onClick={() => onPick(t)}>
          {t}
        </button>
      ))}
    </div>
  );

  return (
    <div className="ced-frame" data-testid="editor-creatures">
      <div className="ced-preview">
        <CanvasHost controller={controller} />
        <div className="ced-topbar">
          <Link to="/" className="lab-back">◀ Start</Link>
          <h1 className="ced-title">Creature-Editor · {PREVIEWS.find((p) => p.id === preview)?.label} {zone}</h1>
          <PerfBadge />
        </div>
      </div>
      <div className="ced-sheet">
        <div className="ced-tabs">
          {ZONES.map((z) => (
            <button key={z} type="button" className="ced-chip" data-active={z === zone} onClick={() => setZone(z)} data-testid={`ed-zone-${z}`}>
              {z}
            </button>
          ))}
          <span style={{ flex: 1 }} />
          <span className="ced-undo">
            <button type="button" className="creature-btn" onClick={undo} disabled={histSize.past === 0} title="Rückgängig (⌘Z)" data-testid="ed-undo">
              ↶ {histSize.past || ''}
            </button>
            <button type="button" className="creature-btn" onClick={redo} disabled={histSize.future === 0} title="Wiederholen (⇧⌘Z)" data-testid="ed-redo">
              ↷ {histSize.future || ''}
            </button>
          </span>
          <button type="button" className="creature-btn" data-kind="action" onClick={save} disabled={!validation.ok || saving} data-testid="ed-save">
            Speichern
          </button>
          <button type="button" className="creature-btn" onClick={() => downloadRules(draft)} data-testid="ed-download">
            Download
          </button>
        </div>
        <div className="ced-tabs">
          <span className="creature-label">Vorschau</span>
          {PREVIEWS.map((p) => (
            <button key={p.id} type="button" className="ced-chip" data-active={p.id === preview} onClick={() => setPreview(p.id)} data-testid={`ed-preview-${p.id}`}>
              {p.label}
            </button>
          ))}
        </div>
        {preview !== 'gallery' ? (
          <div className="ced-tabs">
            <span className="creature-label">{preview === 'compare' ? 'Stufe A' : 'Stufe'}</span>
            {tierChips(tierA, setTierA, 'ed-preview-tier')}
            {preview === 'compare' ? (
              <>
                <span className="creature-label">gegen</span>
                {tierChips(tierB, setTierB, 'ed-preview-tier-b')}
              </>
            ) : null}
            {preview === 'motion' ? (
              <div className="ced-quick">
                {(['blob', 'snake', 'quadruped', 'biped', 'heavy'] as const).map((b) => (
                  <button key={b} type="button" className="ced-chip" data-active={b === body} onClick={() => setBody(b)}>
                    {BODY_TYPE_LABELS[b]}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="ced-tabs">
          {TABS.map((t) => (
            <button key={t.id} type="button" className="ced-chip" data-active={t.id === tab} onClick={() => setTab(t.id)} data-testid={`ed-tab-${t.id}`}>
              {t.label}
            </button>
          ))}
          <span className="creature-info" data-testid="ed-status" data-warn={!validation.ok}>
            {validation.ok ? `gültig · Quelle: ${source}` : `ungültig (${validation.issues.length} Fehler)`}
          </span>
        </div>
        {validation.ok ? null : (
          <pre className="ced-issues" data-testid="ed-issues">
            {validation.issues.slice(0, 12).map((i) => `${i.path || '(root)'}: ${i.message}`).join('\n')}
          </pre>
        )}
        <div className="ced-body">
          {tab === 'tiers' ? <UnlockTab draft={draft} zone={zone} onChange={setDraft} /> : null}
          {tab === 'bodies' ? <BodyTab draft={draft} zone={zone} onChange={setDraft} selected={body} setSelected={setBody} /> : null}
          {tab === 'sockets' ? <SocketTab draft={draft} onChange={setDraft} slot={slot} setSlot={setSlot} /> : null}
          {tab === 'scales' ? <ScaleTab draft={draft} onChange={setDraft} slot={slot} setSlot={setSlot} /> : null}
          {tab === 'palette' ? <PaletteTab draft={draft} zone={zone} onChange={setDraft} /> : null}
          {tab === 'json' ? (
            <div className="ced-section">
              <textarea className="ced-json" value={jsonText} onChange={(e) => setJsonText(e.target.value)} spellCheck={false} data-testid="ed-json" />
              <div className="creature-row">
                <button type="button" className="creature-btn" data-kind="action" onClick={applyJson} data-testid="ed-json-apply">
                  Übernehmen
                </button>
                <button type="button" className="creature-btn" onClick={() => setJsonText(JSON.stringify(draft, null, 2))}>
                  Zurücksetzen
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
      {toast ? (
        <div className="ced-toast" data-kind={toast.kind} data-testid="ed-toast">
          {toast.text}
        </div>
      ) : null}
    </div>
  );
}
