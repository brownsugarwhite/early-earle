import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BODY_TYPE_LABELS, ZONES, validateGenomeRules, type BodyType, type SlotId, type ZoneId } from '@ee/genome';
import { CanvasHost } from '../canvas/CanvasHost';
import { PerfBadge } from '../overlay/PerfBadge';
import { LabNav } from '../overlay/LabNav';
import { DEFAULT_CREATURE_LAB_SETTINGS, LabCreatureScene, type BodyChoice, type LabMode } from '../lab/creature/LabCreatureScene';
import { BUNDLED_RULES, BUNDLED_RULES_INPUT, downloadRules, loadRulesInput, saveRules, shareRules, type RulesSource } from '../lab/creature/content';
import { UnlockTab } from '../lab/creature/editor/UnlockTab';
import { BodyTab } from '../lab/creature/editor/BodyTab';
import { SocketTab } from '../lab/creature/editor/SocketTab';
import { ScaleTab } from '../lab/creature/editor/ScaleTab';
import { PaletteTab } from '../lab/creature/editor/PaletteTab';
import { TIERS, type RulesDraft } from '../lab/creature/editor/editorState';
import { IS_NATIVE, useContentTarget } from '../editor/content/target';
import { shareMessage } from '../editor/content/share';
import { UiIcon } from '../editor/levels/icons';
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
const MOTION_BODIES = ['blob', 'snake', 'quadruped', 'biped', 'heavy'] as const;
const HISTORY_MAX = 80;
const SOURCE_LABEL: Record<RulesSource, string> = { Bundle: 'Stand der App', Mac: 'vom Mac', Lokal: 'lokal gespeichert' };

/**
 * Wesen-Editor (touch-first, iPhone at 393 × 852 included): edits `content/genome/rules.json` — unlock schedule per
 * zone/tier (with quick slot toggles), body archetypes (thresholds, presets, motion character), socket positions
 * on a body map, scale ranges and palette ramps — with a live preview on top (gallery, one creature, two tiers
 * side by side, or the walking archetype). Undo/redo over every change, validation with the zod schema. Saves on
 * the Mac (dev endpoint, from the app over the WLAN); without a connection locally, with "Teilen" as JSON.
 * Rules and modules are edited here, never single creatures.
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
  const [source, setSource] = useState<RulesSource>('Bundle');
  const [toast, setToast] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [jsonText, setJsonText] = useState('');
  const [saving, setSaving] = useState(false);
  const validation = useMemo(() => validateGenomeRules(draft), [draft]);
  const status = useContentTarget((s) => s.status);
  const online = status === 'verbunden';

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
    void loadRulesInput().then((r) => {
      if (alive && r) {
        setDraftRaw(r.input);
        history.current = { past: [], future: [] };
        setHistSize({ past: 0, future: 0 });
        setSource(r.source);
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
    const r = await saveRules(draft);
    setSaving(false);
    setToast({ kind: r.ok ? 'ok' : 'error', text: r.message });
    if (r.ok) setSource(r.target === 'mac' ? 'Mac' : 'Lokal');
  };
  const share = async () => {
    const outcome = await shareRules(draft);
    if (outcome !== 'abgebrochen') setToast({ kind: outcome === 'fehler' ? 'error' : 'ok', text: shareMessage(outcome, 'rules.json') });
  };

  const applyJson = () => {
    try {
      setDraft(JSON.parse(jsonText) as RulesDraft);
      setToast({ kind: 'ok', text: 'JSON übernommen' });
    } catch (e) {
      setToast({ kind: 'error', text: `Kein gültiges JSON: ${String(e)}` });
    }
  };

  const tierSelect = (label: string, value: number, onPick: (t: number) => void, testId: string) => (
    <label className="ced-pick" data-testid={testId}>
      <span>{label}</span>
      <select value={value} onChange={(e) => onPick(Number(e.target.value))} aria-label={label}>
        {TIERS.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="ced-frame" data-testid="editor-creatures">
      <div className="ced-preview">
        <CanvasHost controller={controller} />
        <div className="ced-topbar">
          <LabNav />
          <h1 className="ced-title">
            Wesen-Editor · {PREVIEWS.find((p) => p.id === preview)?.label} {zone}
          </h1>
          <PerfBadge />
        </div>
        {/* Vorschau-Steuerung unten auf der Vorschau: eine wischbare Zeile. */}
        <div className="ced-preview-bar" role="group" aria-label="Vorschau">
          {PREVIEWS.map((p) => (
            <button key={p.id} type="button" className="ced-chip" data-active={p.id === preview} onClick={() => setPreview(p.id)} data-testid={`ed-preview-${p.id}`}>
              {p.label}
            </button>
          ))}
          {preview !== 'gallery' ? tierSelect(preview === 'compare' ? 'Stufe A' : 'Stufe', tierA, setTierA, 'ed-preview-tier') : null}
          {preview === 'compare' ? tierSelect('gegen', tierB, setTierB, 'ed-preview-tier-b') : null}
          {preview === 'motion' ? (
            <label className="ced-pick">
              <span>Körper</span>
              <select value={body} onChange={(e) => setBody(e.target.value as BodyType)} aria-label="Körper">
                {MOTION_BODIES.map((b) => (
                  <option key={b} value={b}>
                    {BODY_TYPE_LABELS[b]}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      </div>
      <div className="ced-sheet">
        <div className="ced-actions">
          <span className="ced-undo">
            <button type="button" className="creature-btn ced-icon-btn" onClick={undo} disabled={histSize.past === 0} title="Rückgängig (⌘Z)" aria-label="Rückgängig" data-testid="ed-undo">
              <UiIcon name="undo" size={20} /> {histSize.past || ''}
            </button>
            <button type="button" className="creature-btn ced-icon-btn" onClick={redo} disabled={histSize.future === 0} title="Wiederholen (⇧⌘Z)" aria-label="Wiederholen" data-testid="ed-redo">
              <UiIcon name="redo" size={20} /> {histSize.future || ''}
            </button>
          </span>
          <button type="button" className="creature-btn ced-save" data-kind="action" onClick={save} disabled={!validation.ok || saving} data-target={online ? 'mac' : 'lokal'} data-testid="ed-save">
            {saving ? 'Speichert …' : online ? 'Speichern' : 'Lokal speichern'}
            <small>{online ? 'auf dem Mac' : 'ohne Mac'}</small>
          </button>
          <button type="button" className="creature-btn" onClick={() => void share()} data-testid="ed-share">
            Teilen
          </button>
          {IS_NATIVE ? null : (
            <button type="button" className="creature-btn" onClick={() => downloadRules(draft)} data-testid="ed-download">
              Download
            </button>
          )}
        </div>
        <div className="ced-row" role="group" aria-label="Zone">
          {ZONES.map((z) => (
            <button key={z} type="button" className="ced-chip" data-active={z === zone} onClick={() => setZone(z)} data-testid={`ed-zone-${z}`}>
              {z}
            </button>
          ))}
        </div>
        <div className="ced-row" role="tablist" aria-label="Bereiche">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={t.id === tab} className="ced-chip ced-tab" data-active={t.id === tab} onClick={() => setTab(t.id)} data-testid={`ed-tab-${t.id}`}>
              {t.label}
            </button>
          ))}
        </div>
        <p className="creature-info ced-status" data-testid="ed-status" data-warn={!validation.ok}>
          {validation.ok ? `gültig · ${SOURCE_LABEL[source]}` : `ungültig (${validation.issues.length} Fehler)`}
        </p>
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
