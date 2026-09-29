import { SPECIAL_OFF, countElementKinds } from '@ee/core';
import {
  MATERIAL_LABEL,
  TOOLS,
  TOOL_GROUPS,
  TOOL_HAS_MATERIAL,
  TOOL_HAS_TIER,
  ZONE_MATERIAL,
  openCellCount,
  resizeGrid,
  sourceAdjacentCells,
  toolInfo,
  type ToolId,
} from '../draft';
import { useEditorStore } from '../editorStore';
import { elementName } from '../validation';
import { ToolIcon } from '../icons';
import { Row, Seg, Stepper, Toggle } from '../ui';

/** Elementart (countElementKinds) eines Werkzeugs, falls es eine zählt. */
const KIND_OF: Partial<Record<ToolId, string>> = {
  pillar: 'pillar',
  fence: 'fence',
  scrap: 'scrap',
  scrapMound: 'scrapMound',
  crust: 'crust',
  sleeper: 'sleeper',
  cage: 'cage',
  fog: 'fog',
  oil: 'oil',
  current: 'current',
  withered: 'withered',
  deepWithered: 'deepWithered',
  spore: 'spore',
  portal: 'portal',
  rot: 'rot',
  toxic: 'toxic',
  stray: 'stray',
  amoeba: 'amoeba',
};

function specialValue(v: number): string {
  return v >= SPECIAL_OFF ? 'aus' : String(v);
}

function ToolParamsPanel() {
  const draft = useEditorStore((s) => s.draft);
  const tool = useEditorStore((s) => s.tool);
  const p = useEditorStore((s) => s.toolParams);
  const pendingPortalId = useEditorStore((s) => s.pendingPortalId);
  const setToolParams = useEditorStore((s) => s.setToolParams);
  if (!draft) return null;
  const info = toolInfo(tool);
  const tierMax = Math.max(1, draft.cap - 1);
  const showContent = tool !== 'fog' || p.withContent;
  const gesture =
    tool === 'fence'
      ? 'Über eine Kante wischen · nahe der Kante tippen'
      : tool === 'portal'
        ? pendingPortalId
          ? `Rohr ${pendingPortalId}: jetzt die zweite Zelle antippen`
          : 'Zwei Zellen nacheinander antippen'
        : tool === 'scrapMound'
          ? 'Links oben antippen (2×2)'
          : 'Tippen setzt · nochmal tippen nimmt weg · ziehen malt';

  return (
    <section className="ed-params" data-testid="tool-params" data-tool={tool}>
      <header className="ed-params-head">
        <ToolIcon tool={tool} params={p} size={38} />
        <div>
          <b>
            {info.label} <span>· {info.hint}</span>
          </b>
          <small>{gesture}</small>
        </div>
      </header>
      <Row>
        {tool === 'fog' ? <Toggle label="Mit Inhalt" on={p.withContent} onChange={(v) => setToolParams({ withContent: v })} /> : null}
        {TOOL_HAS_TIER.has(tool) && showContent ? (
          <Stepper label={tool === 'stray' ? 'Stufe' : tool === 'blob' ? 'Stufe' : 'Inhalt'} value={Math.min(p.tier, tierMax)} min={1} max={tierMax} onChange={(tier) => setToolParams({ tier })} format={(t) => `${2 ** t}`} testId="tool-tier" compact />
        ) : null}
        {tool === 'scrap' ? (
          <Seg label="Lagen" value={String(p.scrapLayers)} onChange={(v) => setToolParams({ scrapLayers: Number(v) })} options={['1', '2', '3'].map((v) => ({ value: v, label: v }))} testIdPrefix="tool-layers" />
        ) : null}
        {tool === 'scrapMound' ? <Stepper label="Treffer" value={p.moundLayers} min={4} max={8} onChange={(moundLayers) => setToolParams({ moundLayers })} compact /> : null}
        {tool === 'cage' ? <Seg label="Lagen" value={String(p.cageLayers)} onChange={(v) => setToolParams({ cageLayers: Number(v) })} options={['1', '2', '3'].map((v) => ({ value: v, label: v }))} /> : null}
        {tool === 'current' ? (
          <Seg
            label="Richtung"
            value={p.dir}
            onChange={(dir) => setToolParams({ dir })}
            options={[
              { value: 'up', label: '↑' },
              { value: 'down', label: '↓' },
              { value: 'left', label: '←' },
              { value: 'right', label: '→' },
            ]}
            testIdPrefix="tool-dir"
          />
        ) : null}
        {tool === 'rot' ? <Stepper label="Frisst alle" value={p.period} min={1} max={9} format={(v) => `${v} Züge`} onChange={(period) => setToolParams({ period })} compact /> : null}
        {tool === 'toxic' ? <Stepper label="Countdown" value={p.countdown} min={1} max={30} onChange={(countdown) => setToolParams({ countdown })} compact /> : null}
      </Row>
      {TOOL_HAS_MATERIAL.has(tool) && showContent ? (
        <Seg
          label="Material"
          value={p.material}
          onChange={(material) => setToolParams({ material })}
          options={[
            { value: 'zone', label: `Zone · ${MATERIAL_LABEL[ZONE_MATERIAL[draft.zone]]}` },
            { value: 'jelly', label: 'Jelly' },
            { value: 'liquid', label: 'Flüssig' },
            { value: 'gas', label: 'Gas' },
            { value: 'fire', label: 'Feuer' },
          ]}
        />
      ) : null}
      {tool === 'source' ? (
        <p className="ed-hint">
          {draft.spawn.sources.length} Quellen · {sourceAdjacentCells(draft).length} Spawn-Zellen (grün markiert)
        </p>
      ) : null}
    </section>
  );
}

export function ToolsTab() {
  const draft = useEditorStore((s) => s.draft);
  const tool = useEditorStore((s) => s.tool);
  const params = useEditorStore((s) => s.toolParams);
  const recentTools = useEditorStore((s) => s.recentTools);
  const setTool = useEditorStore((s) => s.setTool);
  const update = useEditorStore((s) => s.update);
  if (!draft) return null;
  const kinds = countElementKinds(draft);
  const recent = (['erase', ...recentTools.filter((t) => t !== 'erase')] as ToolId[]).slice(0, 6);
  const voids = draft.grid.mask.join('').split('#').length - 1;

  const tile = (id: ToolId, where: 'recent' | 'palette') => {
    const info = toolInfo(id);
    const kind = KIND_OF[id];
    return (
      <button
        key={`${where}-${id}`}
        type="button"
        className={where === 'recent' ? 'ed-recent-tool' : 'ed-tool-tile'}
        data-active={id === tool}
        data-tool={id}
        data-used={kind && kinds.has(kind) ? 'true' : undefined}
        aria-pressed={id === tool}
        onClick={(e) => {
          setTool(id);
          // Aus der Palette gewählt: nach oben zu den Einstellungen des Werkzeugs.
          if (where === 'palette') e.currentTarget.closest('.ed-sheet-body')?.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        data-testid={where === 'recent' ? `recent-${id}` : `tool-${id}`}
      >
        <ToolIcon tool={id} params={id === tool ? params : undefined} size={where === 'recent' ? 34 : 40} />
        <span>{info.label}</span>
      </button>
    );
  };

  return (
    <>
      <div className="ed-recent" data-testid="recent-tools" role="toolbar" aria-label="Zuletzt benutzt">
        {recent.map((id) => tile(id, 'recent'))}
      </div>
      <ToolParamsPanel />
      {TOOL_GROUPS.map((g) => (
        <section className="ed-palette-group" key={g} data-group={g}>
          <h4 className="ed-label">{g}</h4>
          <div className="ed-palette">{TOOLS.filter((t) => t.group === g).map((t) => tile(t.id, 'palette'))}</div>
          {g === 'Layout' ? (
            <Row>
              <Stepper label="Breite" value={draft.grid.w} min={3} max={8} onChange={(w) => update((d) => resizeGrid(d, w, d.grid.h), 'size')} testId="grid-w" compact />
              <Stepper label="Höhe" value={draft.grid.h} min={3} max={8} onChange={(h) => update((d) => resizeGrid(d, d.grid.w, h), 'size')} testId="grid-h" compact />
              <span className="ed-stat">
                <b>{openCellCount(draft)}</b> Zellen · <b>{voids}</b> Risse · <b>{draft.fences.length}</b> Wände
              </span>
            </Row>
          ) : null}
          {g === 'Spezial' ? (
            <>
              <Seg
                label="Strahl-Blob ab (Verschmelzungen pro Wisch)"
                value={specialValue(draft.specials.lineAt)}
                onChange={(v) => update((d) => ({ ...d, specials: { ...d.specials, lineAt: v === 'aus' ? 16 : Number(v) } }), 'lineAt')}
                options={['aus', '2', '3', '4'].map((v) => ({ value: v, label: v }))}
                testIdPrefix="special-line"
              />
              <Seg
                label="Knall-Blob ab"
                value={specialValue(draft.specials.burstAt)}
                onChange={(v) => update((d) => ({ ...d, specials: { ...d.specials, burstAt: v === 'aus' ? 16 : Number(v) } }), 'burstAt')}
                options={['aus', '3', '4', '5'].map((v) => ({ value: v, label: v }))}
                testIdPrefix="special-burst"
              />
            </>
          ) : null}
        </section>
      ))}
      <p className="ed-hint" data-testid="element-kind-list">
        <b data-warn={kinds.size > 4 ? 'true' : undefined}>{kinds.size}/4 Arten</b>
        {kinds.size ? ` · ${[...kinds].map(elementName).join(', ')}` : ' · reines Verschmelz-Level'}. Eine Idee pro Level.
      </p>
    </>
  );
}
