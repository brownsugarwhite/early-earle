import { useMemo } from 'react';
import { BoardGrid } from '../BoardGrid';
import { cellKey, sourceAdjacentCells, type LevelDraft } from '../draft';
import { useEditorStore } from '../editorStore';
import { Row, Seg, Section, Stepper, Toggle } from '../ui';

type TableRow = LevelDraft['spawn']['table'][number];

export function SpawnTab() {
  const draft = useEditorStore((s) => s.draft);
  const update = useEditorStore((s) => s.update);
  const place = useEditorStore((s) => s.place);
  const highlight = useMemo(() => new Set(draft ? sourceAdjacentCells(draft).map(cellKey) : []), [draft]);
  if (!draft) return null;
  const spawn = draft.spawn;
  const setSpawn = (p: Partial<LevelDraft['spawn']>, key?: string) => update((d) => ({ ...d, spawn: { ...d.spawn, ...p } }), key);
  const total = spawn.table.reduce((s, t) => s + t.weight, 0);
  const setRow = (i: number, row: TableRow, key?: string) => setSpawn({ table: spawn.table.map((r, k) => (k === i ? row : r)) }, key);

  return (
    <>
      <Section title="Gasquellen" aside={<span className="ed-stat"><b>{spawn.sources.length}</b> Quellen · <b>{highlight.size}</b> Spawn-Zellen</span>}>
        <p className="ed-hint">Tippen setzt oder löscht eine Gasquelle (auch auf Pfeilern). Hervorgehoben: Zellen, in denen gespawnt wird. Ohne Quellen spawnt es überall (Fallback).</p>
      </Section>
      <BoardGrid draft={draft} mode="tool" onTap={(at) => place(at, 'source')} highlight={highlight} testId="spawn-grid" />
      <Section
        title="Spawn-Tabelle"
        aside={
          <button type="button" className="ed-btn ed-btn-small" onClick={() => setSpawn({ table: [...spawn.table, { tier: 1, weight: 1 }] })} data-testid="spawn-add">
            + Zeile
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
            <span className="ed-stat">
              <b>{Math.round((100 * row.weight) / total)} %</b>
            </span>
            <button type="button" className="ed-btn ed-btn-sq ed-btn-ghost" aria-label="Zeile entfernen" disabled={spawn.table.length <= 1} onClick={() => setSpawn({ table: spawn.table.filter((_, k) => k !== i) })}>
              ✕
            </button>
          </div>
        ))}
      </Section>
      <Section title="Regeln">
        <Row>
          <Toggle label="Vorschau des nächsten Spawns" on={spawn.preview} onChange={(preview) => setSpawn({ preview })} />
          <Seg
            label="Fallback"
            value={spawn.fallback}
            onChange={(fallback) => setSpawn({ fallback })}
            options={[
              { value: 'none', label: 'keiner', title: 'Sind alle Quellen-Nachbarn belegt, spawnt nichts' },
              { value: 'anyEmpty', label: 'überall', title: 'Dann auf irgendeiner freien Zelle' },
            ]}
            testIdPrefix="fallback"
          />
        </Row>
        <p className="ed-hint">Nachtrag 11: Quellen in der Mitte füttern Blocker — Quellen an den Seiten mit Innen-Blockern funktionieren.</p>
      </Section>
    </>
  );
}
