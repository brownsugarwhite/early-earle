import { countElementKinds } from '@ee/core';
import { BoardGrid } from '../BoardGrid';
import { MATERIAL_LABEL, TOOLS, ZONE_MATERIAL, toolInfo, type ToolId } from '../draft';
import { useEditorStore } from '../editorStore';
import { elementName } from '../validation';
import { Row, Seg, Section, Stepper, Toggle } from '../ui';

const GROUPS = ['Blobs', 'Blocker', 'Boden', 'Bedrohung', 'Spawn', 'Werkzeug'] as const;

const needsTier = new Set<ToolId>(['blob', 'cage', 'crust', 'sleeper', 'fog', 'stray']);
const needsMaterial = new Set<ToolId>(['blob', 'cage', 'crust', 'sleeper', 'fog']);

export function ElementsTab() {
  const draft = useEditorStore((s) => s.draft);
  const tool = useEditorStore((s) => s.tool);
  const params = useEditorStore((s) => s.toolParams);
  const pendingPortalId = useEditorStore((s) => s.pendingPortalId);
  const setTool = useEditorStore((s) => s.setTool);
  const setToolParams = useEditorStore((s) => s.setToolParams);
  const place = useEditorStore((s) => s.place);
  const erase = useEditorStore((s) => s.erase);
  if (!draft) return null;
  const info = toolInfo(tool);
  const kinds = [...countElementKinds(draft)];
  const tierMax = tool === 'blob' || tool === 'stray' ? Math.max(1, draft.cap - 1) : 11;
  const showContentParams = tool !== 'fog' || params.withContent;

  return (
    <>
      <Section
        title="Werkzeug"
        aside={
          <span className="ed-stat" data-testid="element-kinds">
            <b data-warn={kinds.length > 4 ? 'true' : undefined}>{kinds.length}/4</b> Arten
          </span>
        }
      >
        {GROUPS.map((g) => (
          <div className="ed-palette-group" key={g}>
            <span className="ed-label">{g}</span>
            <div className="ed-palette">
              {TOOLS.filter((t) => t.group === g).map((t) => (
                <button key={t.id} type="button" className="ed-tool" data-active={t.id === tool} data-tool={t.id} title={t.hint} onClick={() => setTool(t.id)} data-testid={`tool-${t.id}`}>
                  <span className="ed-tool-glyph">{t.glyph}</span>
                  <span className="ed-tool-label">{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
        <p className="ed-hint">
          <b>{info.label}:</b> {info.hint}. Tippen setzt, Gedrückthalten löscht die Zelle.
          {tool === 'portal' && pendingPortalId ? ` Rohr „${pendingPortalId}“ wartet auf die zweite Zelle.` : ''}
        </p>
        <Row>
          {tool === 'fog' ? <Toggle label="Mit Inhalt" on={params.withContent} onChange={(v) => setToolParams({ withContent: v })} /> : null}
          {needsTier.has(tool) && showContentParams ? (
            <Stepper label="Stufe" value={Math.min(params.tier, tierMax)} min={1} max={tierMax} onChange={(tier) => setToolParams({ tier })} format={(t) => `${t} (${2 ** t})`} testId="tool-tier" compact />
          ) : null}
          {tool === 'blob' ? (
            <Seg
              label="Art"
              value={params.blobKind}
              onChange={(blobKind) => setToolParams({ blobKind })}
              options={[
                { value: 'normal', label: 'Normal' },
                { value: 'amoeba', label: 'Amöbe' },
              ]}
            />
          ) : null}
          {needsMaterial.has(tool) && showContentParams ? (
            <Seg
              label="Material"
              value={params.material}
              onChange={(material) => setToolParams({ material })}
              options={[
                { value: 'zone', label: `Zone (${MATERIAL_LABEL[ZONE_MATERIAL[draft.zone]]})` },
                { value: 'jelly', label: 'Jelly' },
                { value: 'liquid', label: 'Flüssig' },
                { value: 'gas', label: 'Gas' },
                { value: 'fire', label: 'Feuer' },
              ]}
            />
          ) : null}
          {tool === 'scrap' ? (
            <Seg
              label="Lagen"
              value={String(params.scrapLayers)}
              onChange={(v) => setToolParams({ scrapLayers: Number(v) })}
              options={[
                { value: '1', label: '1' },
                { value: '2', label: '2' },
                { value: '3', label: '3' },
              ]}
            />
          ) : null}
          {tool === 'scrapMound' ? <Stepper label="Treffer" value={params.moundLayers} min={4} max={8} onChange={(moundLayers) => setToolParams({ moundLayers })} compact /> : null}
          {tool === 'cage' ? (
            <Seg
              label="Lagen"
              value={String(params.cageLayers)}
              onChange={(v) => setToolParams({ cageLayers: Number(v) })}
              options={[
                { value: '1', label: '1' },
                { value: '2', label: '2' },
                { value: '3', label: '3' },
              ]}
            />
          ) : null}
          {tool === 'current' ? (
            <Seg
              label="Richtung"
              value={params.dir}
              onChange={(dir) => setToolParams({ dir })}
              options={[
                { value: 'up', label: '↑' },
                { value: 'down', label: '↓' },
                { value: 'left', label: '←' },
                { value: 'right', label: '→' },
              ]}
            />
          ) : null}
          {tool === 'rot' ? <Stepper label="Periode" value={params.period} min={1} max={9} onChange={(period) => setToolParams({ period })} compact /> : null}
          {tool === 'toxic' ? <Stepper label="Countdown" value={params.countdown} min={1} max={30} onChange={(countdown) => setToolParams({ countdown })} compact /> : null}
        </Row>
      </Section>
      <BoardGrid draft={draft} mode="tool" onTap={(at) => place(at)} onLongPress={erase} />
      <p className="ed-hint" data-testid="element-kind-list">
        {kinds.length ? `Elementarten: ${kinds.map(elementName).join(', ')}` : 'Noch keine Elemente — reines Verschmelz-Level.'}
        {' '}Kruste und Schläfer nehmen einen vorhandenen Start-Blob als Inhalt.
      </p>
    </>
  );
}
