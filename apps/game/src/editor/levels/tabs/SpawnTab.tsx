import { sourceAdjacentCells, type LevelDraft } from '../draft';
import { useEditorStore } from '../editorStore';
import { ToolIcon, UiIcon } from '../icons';
import { Row, Seg, Section, Stepper, Toggle } from '../ui';

type TableRow = LevelDraft['spawn']['table'][number];

export function SpawnTab() {
  const draft = useEditorStore((s) => s.draft);
  const tool = useEditorStore((s) => s.tool);
  const update = useEditorStore((s) => s.update);
  const setTool = useEditorStore((s) => s.setTool);
  const setSheet = useEditorStore((s) => s.setSheet);
  if (!draft) return null;
  const spawn = draft.spawn;
  const spawnCells = sourceAdjacentCells(draft).length;
  const setSpawn = (p: Partial<LevelDraft['spawn']>, key?: string) => update((d) => ({ ...d, spawn: { ...d.spawn, ...p } }), key);
  const total = spawn.table.reduce((s, t) => s + t.weight, 0);
  const setRow = (i: number, row: TableRow, key?: string) => setSpawn({ table: spawn.table.map((r, k) => (k === i ? row : r)) }, key);

  return (
    <>
      <Section title="Gasquellen" aside={<span className="ed-stat"><b>{spawn.sources.length}</b> Quellen · <b>{spawnCells}</b> Spawn-Zellen</span>}>
        <p className="ed-hint">Grün markierte Zellen auf dem Brett: dort wird gespawnt. Ohne Quellen spawnt es überall.</p>
        <Row>
          <button
            type="button"
            className="ed-btn"
            data-active={tool === 'source'}
            onClick={() => {
              setTool('source');
              setSheet('peek');
            }}
            data-testid="spawn-pick-source"
          >
            <ToolIcon tool="source" size={30} /> {tool === 'source' ? 'Quellen setzen: aufs Brett tippen' : 'Quellen setzen'}
          </button>
        </Row>
      </Section>
      <Section
        title="Spawn-Tabelle"
        aside={
          <button type="button" className="ed-btn ed-btn-small" onClick={() => setSpawn({ table: [...spawn.table, { tier: 1, weight: 1 }] })} data-testid="spawn-add">
            <UiIcon name="plus" size={16} /> Zeile
          </button>
        }
      >
        {spawn.table.map((row, i) => (
          <div className="ed-goal" key={i} data-testid={`spawn-row-${i}`}>
            <Seg
              label="Stufe"
              value={String(row.tier)}
              onChange={(v) => setRow(i, { ...row, tier: Number(v) })}
              options={[
                { value: '1', label: '2' },
                { value: '2', label: '4' },
                { value: '3', label: '8' },
              ]}
            />
            <Stepper label="Gewicht" value={row.weight} min={1} max={99} onChange={(weight) => setRow(i, { ...row, weight }, `weight-${i}`)} compact />
            <Seg
              label="Art"
              value={row.kind ?? 'normal'}
              onChange={(v) => {
                const next: TableRow = { tier: row.tier, weight: row.weight };
                if (v === 'amoeba') next.kind = 'amoeba';
                setRow(i, next);
              }}
              options={[
                { value: 'normal', label: 'Normal' },
                { value: 'amoeba', label: 'Amöbe' },
              ]}
            />
            <span className="ed-stat ed-share">
              <b>{Math.round((100 * row.weight) / total)} %</b>
            </span>
            <button type="button" className="ed-btn ed-btn-sq ed-btn-ghost" aria-label="Zeile entfernen" disabled={spawn.table.length <= 1} onClick={() => setSpawn({ table: spawn.table.filter((_, k) => k !== i) })}>
              <UiIcon name="trash" size={18} />
            </button>
          </div>
        ))}
      </Section>
      <Section title="Regeln">
        <Row>
          <Toggle label="Nächsten Spawn zeigen" on={spawn.preview} onChange={(preview) => setSpawn({ preview })} />
          <Seg
            label="Wenn alle Quellen zu sind"
            value={spawn.fallback}
            onChange={(fallback) => setSpawn({ fallback })}
            options={[
              { value: 'none', label: 'nichts' },
              { value: 'anyEmpty', label: 'irgendwo' },
            ]}
            testIdPrefix="fallback"
          />
        </Row>
        <p className="ed-hint">Quellen in der Mitte füttern Blocker — Quellen am Rand mit Innen-Blockern funktionieren (GDD Nachtrag).</p>
      </Section>
    </>
  );
}
