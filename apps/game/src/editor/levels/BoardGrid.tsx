import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { adjacent, cellKey, moundCells, sameCell, type BlockerDef, type Cell, type FloorDef, type LevelDraft, type MaskChar, type StartDef, type ThreatDef } from './draft';

/** Stufenfarben wie in der 3D-Vorschau. */
const TIER_COLORS = ['#7ce6d5', '#7ce6d5', '#22baa9', '#3fc96a', '#a8d84a', '#ddd042', '#f0a62a', '#f17023', '#db292f', '#e5aed4', '#937cc2', '#2de5f8', '#f7f6d8'];
const tierColor = (tier: number): string => TIER_COLORS[Math.min(tier, TIER_COLORS.length - 1)] ?? '#7ce6d5';

export type GridMode = 'mask' | 'fence' | 'tool';

interface CellInfo {
  mask: MaskChar;
  start?: StartDef;
  blocker?: BlockerDef;
  moundPart?: boolean;
  floor?: FloorDef;
  threat?: ThreatDef;
  source: boolean;
}

export interface BoardGridProps {
  draft: LevelDraft;
  mode: GridMode;
  onPaintStart?: (at: Cell) => void;
  onPaintMove?: (at: Cell) => void;
  onFence?: (a: Cell, b: Cell, newStroke: boolean) => void;
  onTap?: (at: Cell) => void;
  onLongPress?: (at: Cell) => void;
  /** Zellen (cellKey), die hervorgehoben werden (z. B. Spawn-Nachbarn). */
  highlight?: ReadonlySet<string>;
  maxCell?: number;
  testId?: string;
}

const GAP = 6;
const LONG_PRESS_MS = 480;
const MOVE_TOLERANCE = 9;

function buildCells(d: LevelDraft): Map<string, CellInfo> {
  const map = new Map<string, CellInfo>();
  for (let y = 0; y < d.grid.h; y++) {
    for (let x = 0; x < d.grid.w; x++) {
      const ch = d.grid.mask[y]?.charAt(x);
      map.set(cellKey([x, y]), { mask: ch === '#' ? '#' : ch === 'P' ? 'P' : '.', source: false });
    }
  }
  const at = (c: Cell) => map.get(cellKey(c));
  for (const s of d.start) {
    const c = at(s.at);
    if (c) c.start = s;
  }
  for (const b of d.blockers) {
    if (b.kind === 'scrapMound') {
      moundCells(b.at).forEach((mc, i) => {
        const c = at(mc);
        if (!c) return;
        c.blocker = b;
        if (i > 0) c.moundPart = true;
      });
    } else {
      const c = at(b.at);
      if (c) c.blocker = b;
    }
  }
  for (const f of d.floors) {
    const c = at(f.at);
    if (c) c.floor = f;
  }
  for (const t of d.threats) {
    const c = at(t.at);
    if (c) c.threat = t;
  }
  for (const s of d.spawn.sources) {
    const c = at(s);
    if (c) c.source = true;
  }
  return map;
}

const FLOOR_GLYPH: Record<FloorDef['kind'], string> = { oil: 'Öl', current: '', withered: 'w', deepWithered: 'd', spore: '●', portal: '@' };
const DIR_ARROW = { up: '↑', down: '↓', left: '←', right: '→' } as const;
const MAT_LETTER = { jelly: 'j', liquid: 'l', gas: 'g', fire: 'r' } as const;

function blobText(blob: StartDef['blob']): string {
  if (blob.kind === 'amoeba') return 'A';
  return String(2 ** blob.tier);
}

function CellGlyphs({ info }: { info: CellInfo }) {
  const { start, blocker, floor, threat, source, moundPart } = info;
  const nodes: React.ReactNode[] = [];
  if (floor) {
    const txt = floor.kind === 'current' ? DIR_ARROW[floor.dir] : floor.kind === 'portal' ? `@${floor.portalId}` : FLOOR_GLYPH[floor.kind];
    nodes.push(
      <span key="floor" className="bg-floor" data-kind={floor.kind}>
        {txt}
      </span>,
    );
  }
  if (source) nodes.push(<span key="src" className="bg-source" title="Gasquelle">◆</span>);
  if (blocker && blocker.kind === 'scrap') {
    nodes.push(
      <span key="scrap" className="bg-scrap" data-layers={blocker.layers}>
        {Array.from({ length: blocker.layers }, (_, i) => (
          <i key={i} />
        ))}
        <b>X{blocker.layers}</b>
      </span>,
    );
  } else if (blocker && blocker.kind === 'scrapMound') {
    nodes.push(
      <span key="mound" className="bg-mound" data-part={moundPart}>
        {moundPart ? 'm' : `M${blocker.layers}`}
      </span>,
    );
  } else {
    const content = start?.blob ?? blocker?.content;
    if (content) {
      nodes.push(
        <span key="blob" className="bg-blob" data-kind={content.kind ?? 'normal'} style={{ background: content.kind === 'amoeba' ? '#f7f6d8' : tierColor(content.tier) }}>
          {blobText(content)}
          {content.material ? <small>{MAT_LETTER[content.material]}</small> : null}
        </span>,
      );
    }
    if (blocker) {
      const badge =
        blocker.kind === 'crust' ? 'F' : blocker.kind === 'sleeper' ? 'S' : blocker.kind === 'cage' ? `C${blocker.layers > 1 ? blocker.layers : ''}` : 'H';
      nodes.push(
        <span key="blk" className="bg-badge" data-kind={blocker.kind}>
          {badge}
        </span>,
      );
    }
  }
  if (threat) {
    const txt = threat.kind === 'rot' ? `R${threat.period}` : threat.kind === 'toxic' ? `T${threat.countdown}` : `W${threat.tier}`;
    nodes.push(
      <span key="threat" className="bg-threat" data-kind={threat.kind}>
        {txt}
      </span>,
    );
  }
  return <>{nodes}</>;
}

function cellFromPoint(x: number, y: number, root: HTMLElement): Cell | null {
  const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-cell]');
  if (!el || !root.contains(el)) return null;
  return [Number(el.dataset.x), Number(el.dataset.y)];
}

/**
 * 2D-Rasterkarte zum Malen (Maske), Zäune ziehen und Elemente setzen. Alle Zellen ≥ 44 px,
 * Ziehen malt, Gedrückthalten entfernt (Werkzeug-Modus), Ziehen über eine Kante setzt eine Fossilwand.
 */
export function BoardGrid({ draft, mode, onPaintStart, onPaintMove, onFence, onTap, onLongPress, highlight, maxCell = 72, testId = 'board-grid' }: BoardGridProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<Cell | null>(null);
  const drag = useRef<{ id: number; start: Cell; last: Cell; moved: boolean; longFired: boolean; crossings: number; x: number; y: number; timer: ReturnType<typeof setTimeout> | null } | null>(null);
  const cells = useMemo(() => buildCells(draft), [draft]);
  const { w, h } = draft.grid;

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  useEffect(() => setSelected(null), [mode, draft.grid.w, draft.grid.h]);

  const cs = Math.max(44, Math.min(maxCell, Math.floor((Math.max(0, width - 8) - (w - 1) * GAP) / w)));
  const pitch = cs + GAP;

  const clearTimer = () => {
    const d = drag.current;
    if (d?.timer) clearTimeout(d.timer);
    if (d) d.timer = null;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const root = wrapRef.current!;
    const cell = cellFromPoint(e.clientX, e.clientY, root);
    if (!cell) return;
    e.preventDefault();
    // Capture auf dem Element mit den Handlern (nicht auf dem Wrapper): sonst kommen move/up nie hier an.
    e.currentTarget.setPointerCapture(e.pointerId);
    clearTimer();
    drag.current = { id: e.pointerId, start: cell, last: cell, moved: false, longFired: false, crossings: 0, x: e.clientX, y: e.clientY, timer: null };
    if (mode === 'mask') onPaintStart?.(cell);
    else if (mode === 'tool' && onLongPress) {
      drag.current.timer = setTimeout(() => {
        const d = drag.current;
        if (!d || d.moved) return;
        d.longFired = true;
        onLongPress(d.start);
        try {
          navigator.vibrate?.(12);
        } catch {
          /* nicht verfügbar */
        }
      }, LONG_PRESS_MS);
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dist = Math.hypot(e.clientX - d.x, e.clientY - d.y);
    if (dist > MOVE_TOLERANCE) clearTimer();
    const cell = cellFromPoint(e.clientX, e.clientY, wrapRef.current!);
    if (!cell || sameCell(cell, d.last)) return;
    if (dist <= MOVE_TOLERANCE) return;
    d.moved = true;
    if (mode === 'mask') onPaintMove?.(cell);
    else if (mode === 'fence') {
      if (adjacent(d.last, cell)) {
        onFence?.(d.last, cell, d.crossings === 0);
        d.crossings++;
      }
      setSelected(null);
    }
    d.last = cell;
  };

  const finish = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    clearTimer();
    drag.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (d.moved || d.longFired) return;
    if (mode === 'tool') onTap?.(d.start);
    else if (mode === 'fence') {
      if (selected && adjacent(selected, d.start)) {
        onFence?.(selected, d.start, true);
        setSelected(null);
      } else setSelected(sameCell(selected ?? [-1, -1], d.start) ? null : d.start);
    }
  };

  const fenceBars = draft.fences.map((f, i) => {
    const a = f.a;
    const b = f.b;
    const horizontal = a[1] !== b[1]; // Zaun zwischen zwei Zeilen → waagerechter Balken
    const minX = Math.min(a[0], b[0]);
    const minY = Math.min(a[1], b[1]);
    const style: React.CSSProperties = horizontal
      ? { left: minX * pitch + 4, top: minY * pitch + cs + GAP / 2 - 5, width: cs - 8, height: 10 }
      : { left: minX * pitch + cs + GAP / 2 - 5, top: minY * pitch + 4, width: 10, height: cs - 8 };
    return <span key={`f${i}`} className="bg-fence" style={style} />;
  });

  const rows: React.ReactNode[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const key = cellKey([x, y]);
      const info = cells.get(key)!;
      rows.push(
        <div
          key={key}
          className="bg-cell"
          data-cell
          data-x={x}
          data-y={y}
          data-mask={info.mask}
          data-selected={selected && sameCell(selected, [x, y]) ? 'true' : undefined}
          data-hl={highlight?.has(key) ? 'true' : undefined}
          data-testid={`cell-${x}-${y}`}
          role="button"
          aria-label={`Zelle ${x},${y}`}
        >
          {info.mask === '.' ? <CellGlyphs info={info} /> : info.mask === 'P' ? <span className="bg-pillar">P</span> : null}
          {info.mask !== '.' && info.source ? <span className="bg-source">◆</span> : null}
        </div>,
      );
    }
  }

  return (
    <div className="bg-wrap" ref={wrapRef}>
      <div
        className="bg-grid"
        data-testid={testId}
        data-mode={mode}
        style={{ gridTemplateColumns: `repeat(${w}, ${cs}px)`, gridAutoRows: `${cs}px`, gap: GAP, width: w * pitch - GAP }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finish}
        onPointerCancel={finish}
        onContextMenu={(e) => e.preventDefault()}
      >
        {rows}
        {fenceBars}
      </div>
    </div>
  );
}
