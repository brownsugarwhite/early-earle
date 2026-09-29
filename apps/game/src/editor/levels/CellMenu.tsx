import { useEffect } from 'react';
import type { Dir, Material } from '@ee/core';
import {
  DEFAULT_TOOL_PARAMS,
  MATERIAL_LABEL,
  ZONE_MATERIAL,
  cellLayers,
  describeCell,
  eraseCell,
  patchBlocker,
  patchFloor,
  patchStart,
  patchThreat,
  removeLayer,
  setMask,
  setSource,
  toolInfo,
  withBlob,
  type BlobDef,
  type Cell,
  type LevelDraft,
  type MaskChar,
  type ToolId,
} from './draft';
import { useEditorStore } from './editorStore';
import { ToolIcon, UiIcon } from './icons';
import { Seg, Stepper } from './ui';

/**
 * Langdruck-Menü einer Zelle: alle Ebenen (Maske, Blob, Blocker, Boden, Bedrohung, Quelle) mit großen
 * Bedienelementen. Jede Änderung ist ein Undo-Schritt (gleiche Regler werden zusammengefasst).
 */

type MaterialChoice = Material | 'zone';

function BlobControls({ blob, onChange, tierMax, idPrefix, showTier = true }: { blob: BlobDef; onChange: (b: BlobDef) => void; tierMax: number; idPrefix: string; showTier?: boolean }) {
  const zone = useEditorStore((s) => s.draft?.zone ?? 'tjorizo');
  return (
    <>
      {showTier && blob.kind !== 'amoeba' ? <TierStepper blob={blob} onChange={onChange} tierMax={tierMax} testId={`${idPrefix}-tier`} label="Inhalt" /> : null}
      <Seg<MaterialChoice>
        value={blob.material ?? 'zone'}
        onChange={(material) => onChange(withBlob(blob, { material }))}
        options={[
          { value: 'zone', label: 'Zone', title: `Zonenmaterial: ${MATERIAL_LABEL[ZONE_MATERIAL[zone]]}` },
          { value: 'jelly', label: 'Jelly' },
          { value: 'liquid', label: 'Flüssig' },
          { value: 'gas', label: 'Gas' },
          { value: 'fire', label: 'Feuer' },
        ]}
      />
      <Seg<'normal' | 'amoeba'>
        value={blob.kind === 'amoeba' ? 'amoeba' : 'normal'}
        onChange={(kind) => onChange(withBlob(blob, { kind }))}
        options={[
          { value: 'normal', label: 'Normaler Blob' },
          { value: 'amoeba', label: 'Amöbe (Joker)' },
        ]}
      />
    </>
  );
}

function TierStepper({ blob, onChange, tierMax, testId, label = 'Stufe', bare = false }: { blob: BlobDef; onChange: (b: BlobDef) => void; tierMax: number; testId: string; label?: string; bare?: boolean }) {
  return <Stepper label={label} hideLabel={bare} value={Math.min(blob.tier, tierMax)} min={1} max={tierMax} onChange={(tier) => onChange(withBlob(blob, { tier }))} format={(t) => `${2 ** t}`} testId={testId} compact />;
}

/** Eine Ebene der Zelle: Kopfzeile mit Icon, optionalem Regler (statt Titel) und Entfernen; darunter weitere Regler. */
function Layer({ tool, title, head, blob, onRemove, children, testId }: { tool: ToolId; title: string; head?: React.ReactNode; blob?: BlobDef; onRemove?: () => void; children?: React.ReactNode; testId?: string }) {
  return (
    <section className="cm-layer" data-testid={testId} aria-label={title}>
      <header className="cm-layer-head">
        <ToolIcon tool={tool} size={34} params={blob ? { ...DEFAULT_TOOL_PARAMS, tier: blob.tier, material: blob.material ?? 'zone' } : undefined} />
        {head ? <div className="cm-layer-ctl">{head}</div> : <b>{title}</b>}
        {onRemove ? (
          <button type="button" className="ed-btn ed-btn-sq ed-btn-ghost cm-remove" onClick={onRemove} aria-label={`${title} entfernen`}>
            <UiIcon name="trash" size={18} />
          </button>
        ) : null}
      </header>
      {children ? <div className="cm-layer-body">{children}</div> : null}
    </section>
  );
}

export function CellMenu({ placement }: { placement: { left: number; width: number; top?: number; bottom?: number; maxHeight: number } }) {
  const at = useEditorStore((s) => s.cellMenu);
  const draft = useEditorStore((s) => s.draft);
  const close = useEditorStore((s) => s.closeCellMenu);
  const editCell = useEditorStore((s) => s.editCell);
  const pickTool = useEditorStore((s) => s.pickTool);
  const showToast = useEditorStore((s) => s.showToast);
  const undo = useEditorStore((s) => s.undo);

  useEffect(() => {
    if (!at) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [at, close]);

  if (!at || !draft) return null;
  const c: Cell = at;
  if (c[0] >= draft.grid.w || c[1] >= draft.grid.h) return null;
  const L = cellLayers(draft, c);
  const edit = (fn: (d: LevelDraft) => LevelDraft, key: string) => editCell(c, fn, key);
  const tierMax = Math.max(1, draft.cap - 1);
  const blobInBlocker = L.blocker && (L.blocker.kind === 'cage' || L.blocker.kind === 'fog' || ((L.blocker.kind === 'crust' || L.blocker.kind === 'sleeper') && L.blocker.content));

  const setMaskTo = (m: MaskChar) => edit((d) => setMask(d, c, m), 'mask');
  const clearAll = () => {
    edit((d) => eraseCell(d, c), 'erase');
    showToast('Zelle geleert', 'info', { label: 'Rückgängig', run: undo });
  };

  return (
    <div
      className="cm-card"
      data-testid="cell-menu"
      role="dialog"
      aria-label={`Zelle ${c[0]},${c[1]}`}
      style={{ left: placement.left, width: placement.width, top: placement.top, bottom: placement.bottom, maxHeight: placement.maxHeight }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <header className="cm-head">
        <div className="cm-title">
          <b>
            Zelle {c[0]},{c[1]}
          </b>
          <span>{describeCell(draft, c)}</span>
        </div>
        <button type="button" className="ed-btn ed-btn-sq ed-btn-ghost" onClick={() => pickTool(c)} aria-label="Als Werkzeug übernehmen (Pipette)" data-testid="cell-menu-pick">
          <UiIcon name="eyedrop" size={20} />
        </button>
        <button type="button" className="ed-btn ed-btn-sq ed-btn-danger" onClick={clearAll} aria-label="Zelle leeren" data-testid="cell-menu-clear">
          <UiIcon name="trash" size={19} />
        </button>
        <button type="button" className="ed-btn ed-btn-sq" onClick={close} aria-label="Menü schließen" data-testid="cell-menu-close">
          <UiIcon name="close" size={18} />
        </button>
      </header>
      <div className="cm-body">
        {L.start && !blobInBlocker ? (
          <Layer
            tool={L.start.blob.kind === 'amoeba' ? 'amoeba' : 'blob'}
            title={L.start.blob.kind === 'amoeba' ? 'Amöbe' : `Blob ${2 ** L.start.blob.tier}`}
            blob={L.start.blob}
            head={L.start.blob.kind === 'amoeba' ? undefined : <TierStepper blob={L.start.blob} tierMax={tierMax} testId="cell-blob-tier" bare onChange={(b) => edit((d) => patchStart(d, c, () => b), 'blob')} />}
            onRemove={() => edit((d) => removeLayer(d, c, 'start'), 'rm-start')}
            testId="cell-layer-blob"
          >
            <BlobControls blob={L.start.blob} tierMax={tierMax} idPrefix="cell-blob" showTier={false} onChange={(b) => edit((d) => patchStart(d, c, () => b), 'blob')} />
          </Layer>
        ) : null}

        {L.blocker ? (
          <Layer tool={L.blocker.kind} title={toolInfo(L.blocker.kind).label} onRemove={() => edit((d) => removeLayer(d, c, 'blocker'), 'rm-blocker')} testId="cell-layer-blocker">
            {L.blocker.kind === 'scrap' ? (
              <Seg
                label="Lagen"
                value={String(L.blocker.layers)}
                onChange={(v) => edit((d) => patchBlocker(d, c, (b) => (b.kind === 'scrap' ? { ...b, layers: Number(v) } : b)), 'layers')}
                options={['1', '2', '3'].map((v) => ({ value: v, label: v }))}
                testIdPrefix="cell-layers"
              />
            ) : null}
            {L.blocker.kind === 'scrapMound' ? (
              <Stepper label="Treffer" value={L.blocker.layers} min={4} max={8} onChange={(n) => edit((d) => patchBlocker(d, c, (b) => (b.kind === 'scrapMound' ? { ...b, layers: n } : b)), 'layers')} compact />
            ) : null}
            {L.blocker.kind === 'cage' ? (
              <>
                <Seg
                  label="Lagen"
                  value={String(L.blocker.layers)}
                  onChange={(v) => edit((d) => patchBlocker(d, c, (b) => (b.kind === 'cage' ? { ...b, layers: Number(v) } : b)), 'layers')}
                  options={['1', '2', '3'].map((v) => ({ value: v, label: v }))}
                />
                <BlobControls blob={L.blocker.content} tierMax={tierMax} idPrefix="cell-content" onChange={(nb) => edit((d) => patchBlocker(d, c, (b) => (b.kind === 'cage' ? { ...b, content: nb } : b)), 'content')} />
              </>
            ) : null}
            {L.blocker.kind === 'crust' || L.blocker.kind === 'sleeper' || L.blocker.kind === 'fog' ? (
              (() => {
                const bk = L.blocker;
                const content = bk.content ?? (bk.kind !== 'fog' ? L.start?.blob : undefined);
                const own = !!bk.content;
                return (
                  <>
                    {bk.kind === 'fog' ? (
                      <button
                        type="button"
                        className="ed-chip ed-toggle"
                        data-active={own}
                        aria-pressed={own}
                        onClick={() =>
                          edit(
                            (d) =>
                              patchBlocker(d, c, (b) => {
                                if (b.kind !== 'fog') return b;
                                if (b.content) return { kind: 'fog', at: b.at };
                                return { ...b, content: { tier: 2 } };
                              }),
                            'fog-content',
                          )
                        }
                      >
                        <span className="ed-toggle-box" aria-hidden="true" />
                        Mit Inhalt
                      </button>
                    ) : null}
                    {content ? (
                      <BlobControls
                        blob={content}
                        tierMax={tierMax}
                        idPrefix="cell-content"
                        onChange={(nb) =>
                          edit((d) => {
                            if (own) return patchBlocker(d, c, (b) => (b.kind === 'crust' || b.kind === 'sleeper' || b.kind === 'fog' ? { ...b, content: nb } : b));
                            return patchStart(d, c, () => nb);
                          }, 'content')
                        }
                      />
                    ) : null}
                  </>
                );
              })()
            ) : null}
          </Layer>
        ) : null}

        {L.threat ? (
          <Layer tool={L.threat.kind} title={toolInfo(L.threat.kind).label} onRemove={() => edit((d) => removeLayer(d, c, 'threat'), 'rm-threat')} testId="cell-layer-threat">
            {L.threat.kind === 'rot' ? <Stepper label="Frisst alle" value={L.threat.period} min={1} max={9} format={(v) => `${v} Züge`} onChange={(n) => edit((d) => patchThreat(d, c, (t) => (t.kind === 'rot' ? { ...t, period: n } : t)), 'period')} compact /> : null}
            {L.threat.kind === 'toxic' ? <Stepper label="Countdown" value={L.threat.countdown} min={1} max={30} onChange={(n) => edit((d) => patchThreat(d, c, (t) => (t.kind === 'toxic' ? { ...t, countdown: n } : t)), 'countdown')} compact /> : null}
            {L.threat.kind === 'stray' ? <Stepper label="Stufe" value={L.threat.tier} min={1} max={tierMax} format={(t) => `${2 ** t}`} onChange={(n) => edit((d) => patchThreat(d, c, (t) => (t.kind === 'stray' ? { ...t, tier: n } : t)), 'stray-tier')} compact /> : null}
          </Layer>
        ) : null}

        {L.floor ? (
          <Layer tool={L.floor.kind} title={L.floor.kind === 'portal' ? `Rohr ${L.floor.portalId}` : toolInfo(L.floor.kind).label} onRemove={() => edit((d) => removeLayer(d, c, 'floor'), 'rm-floor')} testId="cell-layer-floor">
            {L.floor.kind === 'current' ? (
              <Seg<Dir>
                label="Richtung"
                value={L.floor.dir}
                onChange={(dir) => edit((d) => patchFloor(d, c, (f) => (f.kind === 'current' ? { ...f, dir } : f)), 'dir')}
                options={[
                  { value: 'up', label: '↑' },
                  { value: 'down', label: '↓' },
                  { value: 'left', label: '←' },
                  { value: 'right', label: '→' },
                ]}
              />
            ) : null}
            {L.floor.kind === 'portal' ? <p className="ed-hint">{L.portalPartner ? `Verbunden mit Zelle ${L.portalPartner[0]},${L.portalPartner[1]}` : 'Wartet auf die zweite Zelle — mit dem Rohr-Werkzeug antippen.'}</p> : null}
          </Layer>
        ) : null}
        <Seg<MaskChar>
          label="Zelle"
          value={L.mask}
          onChange={setMaskTo}
          testIdPrefix="cell-mask"
          options={[
            { value: '.', label: 'Frei' },
            { value: '#', label: 'Riss' },
            { value: 'P', label: 'Pfeiler' },
          ]}
        />

        {!L.start && !L.blocker && !L.floor && !L.threat && L.mask === '.' ? <p className="ed-hint">Leere Zelle — tippen setzt das aktuelle Werkzeug.</p> : null}
        {L.mask !== '#' ? (
          <div className="cm-row">
            <button type="button" className="ed-chip ed-toggle" data-active={L.source} aria-pressed={L.source} onClick={() => edit((d) => setSource(d, c, !L.source), 'source')} data-testid="cell-source">
              <span className="ed-toggle-box" aria-hidden="true" />
              Gasquelle
            </button>
          </div>
        ) : null}

      </div>
    </div>
  );
}
