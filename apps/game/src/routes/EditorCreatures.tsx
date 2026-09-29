import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ZONES, validateGenomeRules, type SlotId, type ZoneId } from '@ee/genome';
import { CanvasHost } from '../canvas/CanvasHost';
import { PerfBadge } from '../overlay/PerfBadge';
import { DEFAULT_CREATURE_LAB_SETTINGS, LabCreatureScene } from '../lab/creature/LabCreatureScene';
import { BUNDLED_RULES, BUNDLED_RULES_INPUT, downloadRules, fetchDevRulesInput, saveDevRules } from '../lab/creature/content';
import { UnlockTab } from '../lab/creature/editor/UnlockTab';
import { SocketTab } from '../lab/creature/editor/SocketTab';
import { ScaleTab } from '../lab/creature/editor/ScaleTab';
import { PaletteTab } from '../lab/creature/editor/PaletteTab';
import type { RulesDraft } from '../lab/creature/editor/editorState';
import '../lab/creature/creatureLab.css';

type Tab = 'tiers' | 'sockets' | 'scales' | 'palette' | 'json';
const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'tiers', label: 'Stufen' },
  { id: 'sockets', label: 'Sockel' },
  { id: 'scales', label: 'Skalen' },
  { id: 'palette', label: 'Palette' },
  { id: 'json', label: 'JSON' },
];

/**
 * Creature-Editor (touch-first): edits `content/genome/rules.json` — unlock schedule per zone/tier,
 * socket positions on a body map, scale ranges and palette ramps — with the tier gallery as a live
 * preview. Validation with the zod schema on every change; save via the dev endpoint, download as
 * fallback. Rules and modules are edited here, never single creatures.
 */
export function EditorCreatures() {
  const controller = useMemo(() => new LabCreatureScene({ rules: BUNDLED_RULES, framing: 'editor' }), []);
  const [draft, setDraft] = useState<RulesDraft>(BUNDLED_RULES_INPUT);
  const [zone, setZone] = useState<ZoneId>('tjorizo');
  const [slot, setSlot] = useState<SlotId>('eye');
  const [tab, setTab] = useState<Tab>('tiers');
  const [source, setSource] = useState<'Bundle' | 'Dev-Endpunkt'>('Bundle');
  const [toast, setToast] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [jsonText, setJsonText] = useState('');
  const [saving, setSaving] = useState(false);
  const validation = useMemo(() => validateGenomeRules(draft), [draft]);

  useEffect(() => {
    let alive = true;
    fetchDevRulesInput().then((r) => {
      if (alive && r) {
        setDraft(r);
        setSource('Dev-Endpunkt');
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  // Live preview: valid drafts re-resolve the gallery (debounced so sliders stay smooth).
  useEffect(() => {
    if (!validation.ok) return;
    const rules = validation.rules;
    const id = setTimeout(() => controller.setRules(rules), 120);
    return () => clearTimeout(id);
  }, [validation, controller]);

  useEffect(() => {
    controller.apply({ ...DEFAULT_CREATURE_LAB_SETTINGS, mode: 'gallery', zone, seed: 7 });
  }, [controller, zone]);

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

  return (
    <div className="ced-frame" data-testid="editor-creatures">
      <div className="ced-preview">
        <CanvasHost controller={controller} />
        <div className="ced-topbar">
          <Link to="/" className="lab-back">◀ Start</Link>
          <h1 className="ced-title">Creature-Editor · Galerie {zone}</h1>
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
          <button type="button" className="creature-btn" data-kind="action" onClick={save} disabled={!validation.ok || saving} data-testid="ed-save">
            Speichern
          </button>
          <button type="button" className="creature-btn" onClick={() => downloadRules(draft)} data-testid="ed-download">
            Download
          </button>
        </div>
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
