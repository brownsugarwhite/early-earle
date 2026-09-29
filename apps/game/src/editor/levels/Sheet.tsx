import { useEffect, useRef, useState } from 'react';
import { useEditorStore, type SheetSize, type TabId } from './editorStore';
import { ToolsTab } from './tabs/ToolsTab';
import { GoalsTab } from './tabs/GoalsTab';
import { SpawnTab } from './tabs/SpawnTab';
import { SolverTab } from './tabs/SolverTab';
import { ChainTab } from './tabs/ChainTab';
import { FileTab } from './tabs/FileTab';
import { AsciiTab } from './tabs/AsciiTab';

const TABS: { id: TabId; label: string }[] = [
  { id: 'werkzeug', label: 'Werkzeug' },
  { id: 'ziele', label: 'Ziele' },
  { id: 'spawn', label: 'Spawn' },
  { id: 'solver', label: 'Solver' },
  { id: 'kette', label: 'Kette' },
  { id: 'datei', label: 'Datei' },
  { id: 'ascii', label: 'ASCII' },
];

const SIZES: readonly SheetSize[] = ['peek', 'half', 'full'];

/** Sheet ist Seitenleiste (Desktop, Handy quer) statt Bottom-Sheet. */
export const sideSheetQuery = '(min-width: 900px), (orientation: landscape) and (max-height: 520px)';

interface Drag {
  id: number;
  y0: number;
  x0: number;
  h0: number;
  samples: { y: number; t: number }[];
  vertical: boolean | null;
}

/**
 * Bottom-Sheet mit drei Rastpunkten (klein · halb · voll). Griff und Reiterleiste lassen sich vertikal ziehen,
 * beim Loslassen rastet das Sheet am nächsten Punkt ein (Wischtempo zählt mit). Tippen auf den Griff wechselt
 * klein ↔ halb. Die Größe wird gemerkt.
 */
export function Sheet() {
  const tab = useEditorStore((s) => s.tab);
  const sheet = useEditorStore((s) => s.sheet);
  const setTab = useEditorStore((s) => s.setTab);
  const setSheet = useEditorStore((s) => s.setSheet);
  const loading = useEditorStore((s) => s.loading);
  const draft = useEditorStore((s) => s.draft);
  const ref = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLElement>(null);
  const drag = useRef<Drag | null>(null);
  const suppressClick = useRef(false);
  const [dragH, setDragH] = useState<number | null>(null);

  const side = () => window.matchMedia(sideSheetQuery).matches;

  // Neuer Reiter beginnt oben; der aktive Reiter rutscht ins Bild.
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
    tabsRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  }, [tab]);
  // Eingeklappt zeigt das Sheet seinen Anfang (im Werkzeug-Reiter: die zuletzt benutzten Werkzeuge).
  useEffect(() => {
    if (sheet === 'peek') bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [sheet]);
  const snapHeights = (): Record<SheetSize, number> => {
    const main = ref.current?.parentElement?.getBoundingClientRect().height ?? window.innerHeight;
    const el = ref.current;
    const peek = el ? parseFloat(getComputedStyle(el).getPropertyValue('--peek-px')) || 150 : 150;
    return { peek, half: main * 0.5, full: main - 12 };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (side() || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const h0 = ref.current?.getBoundingClientRect().height ?? 0;
    drag.current = { id: e.pointerId, y0: e.clientY, x0: e.clientX, h0, samples: [{ y: e.clientY, t: performance.now() }], vertical: null };
    suppressClick.current = false;
  };
  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dy = e.clientY - d.y0;
    const dx = e.clientX - d.x0;
    if (d.vertical === null) {
      if (Math.abs(dy) < 8 && Math.abs(dx) < 8) return;
      d.vertical = Math.abs(dy) > Math.abs(dx);
      if (!d.vertical) {
        drag.current = null; // horizontales Scrollen der Reiter
        return;
      }
      e.currentTarget.setPointerCapture(e.pointerId);
      suppressClick.current = true;
    }
    const snaps = snapHeights();
    const h = Math.max(snaps.peek * 0.8, Math.min(snaps.full, d.h0 - dy));
    d.samples.push({ y: e.clientY, t: performance.now() });
    if (d.samples.length > 6) d.samples.shift();
    setDragH(h);
  };
  const onPointerUp = (e: React.PointerEvent<HTMLElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.id !== e.pointerId || !d.vertical) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    const snaps = snapHeights();
    // Letzte verlässliche Position: pointerup liefert auf manchen Geräten keine Koordinaten.
    if (e.clientY > 0 && e.type === 'pointerup') d.samples.push({ y: e.clientY, t: performance.now() });
    const first = d.samples[0]!;
    const last = d.samples[d.samples.length - 1]!;
    const v = (last.y - first.y) / Math.max(1, last.t - first.t); // px/ms, + = nach unten
    const cur = d.h0 - (last.y - d.y0);
    const projected = cur - v * 180;
    let best: SheetSize = 'peek';
    for (const s of SIZES) if (Math.abs(snaps[s] - projected) < Math.abs(snaps[best] - projected)) best = s;
    setDragH(null);
    setSheet(best);
  };

  const onHandleClick = () => {
    if (suppressClick.current) return;
    setSheet(sheet === 'peek' ? 'half' : 'peek');
  };

  return (
    <section ref={ref} className="ed-sheet" data-size={sheet} data-dragging={dragH !== null ? 'true' : undefined} style={dragH !== null ? ({ '--drag-h': `${dragH}px` } as React.CSSProperties) : undefined} data-testid="sheet">
      <div className="ed-sheet-head" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
        <button type="button" className="ed-handle" onClick={onHandleClick} aria-label={sheet === 'peek' ? 'Sheet aufziehen' : 'Sheet einklappen'} data-testid="sheet-handle">
          <span />
        </button>
        <nav className="ed-tabs" aria-label="Reiter" ref={tabsRef}>
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className="ed-tab"
              data-active={tab === t.id}
              aria-current={tab === t.id ? 'page' : undefined}
              onClick={() => {
                if (suppressClick.current) return;
                if (tab === t.id && sheet !== 'peek' && !side()) setSheet('peek');
                else {
                  setTab(t.id);
                  if (sheet === 'peek') setSheet('half');
                }
              }}
              data-testid={`tab-${t.id}`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="ed-sheet-body" data-testid="sheet-body" data-tab={tab} ref={bodyRef}>
        {loading && !draft ? <p className="ed-hint">Lädt …</p> : null}
        {draft ? (
          tab === 'werkzeug' ? (
            <ToolsTab />
          ) : tab === 'ziele' ? (
            <GoalsTab />
          ) : tab === 'spawn' ? (
            <SpawnTab />
          ) : tab === 'solver' ? (
            <SolverTab />
          ) : tab === 'kette' ? (
            <ChainTab />
          ) : tab === 'datei' ? (
            <FileTab />
          ) : (
            <AsciiTab />
          )
        ) : null}
      </div>
    </section>
  );
}
