import { BoardGrid } from '../BoardGrid';
import { openCellCount, resizeGrid } from '../draft';
import { useEditorStore } from '../editorStore';
import { Row, Seg, Section, Stepper } from '../ui';

export function RasterTab() {
  const draft = useEditorStore((s) => s.draft);
  const rasterMode = useEditorStore((s) => s.rasterMode);
  const setRasterMode = useEditorStore((s) => s.setRasterMode);
  const update = useEditorStore((s) => s.update);
  const paintStart = useEditorStore((s) => s.paintStart);
  const paintMove = useEditorStore((s) => s.paintMove);
  const fenceStroke = useEditorStore((s) => s.fenceStroke);
  if (!draft) return null;
  const pillars = draft.grid.mask.join('').split('P').length - 1;
  const voids = draft.grid.mask.join('').split('#').length - 1;
  return (
    <>
      <Section title="Raster">
        <Row>
          <Stepper label="Breite" value={draft.grid.w} min={3} max={8} onChange={(w) => update((d) => resizeGrid(d, w, d.grid.h), 'size')} testId="grid-w" compact />
          <Stepper label="Höhe" value={draft.grid.h} min={3} max={8} onChange={(h) => update((d) => resizeGrid(d, d.grid.w, h), 'size')} testId="grid-h" compact />
        </Row>
        <Seg
          label="Modus"
          value={rasterMode}
          onChange={setRasterMode}
          testIdPrefix="raster-mode"
          options={[
            { value: 'mask', label: 'Maske malen', title: 'Tippen wechselt · → # → P, Ziehen malt' },
            { value: 'fence', label: 'Fossilwand', title: 'Über eine Kante ziehen oder zwei Nachbarzellen antippen' },
          ]}
        />
        <p className="ed-hint">
          {rasterMode === 'mask' ? 'Tippen wechselt Zelle → Riss → Pfeiler. Ziehen malt dasselbe Zeichen weiter.' : 'Über eine Kante ziehen setzt oder löscht eine Fossilwand. Zwei Nachbarzellen antippen geht auch.'}
        </p>
      </Section>
      <BoardGrid draft={draft} mode={rasterMode} onPaintStart={paintStart} onPaintMove={paintMove} onFence={fenceStroke} />
      <Row>
        <span className="ed-stat">
          <b>{openCellCount(draft)}</b> Zellen
        </span>
        <span className="ed-stat">
          <b>{voids}</b> Risse
        </span>
        <span className="ed-stat">
          <b>{pillars}</b> Pfeiler
        </span>
        <span className="ed-stat">
          <b>{draft.fences.length}</b> Fossilwände
        </span>
      </Row>
      <p className="ed-hint">GDD 5.2: unregelmäßige Bretter und Innenpfeiler brechen die Ecken-Strategie; Ziele in der Mitte sind schwer, am Rand leicht.</p>
    </>
  );
}
