import { useEffect, useId, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import { PerfBadge } from './PerfBadge';
import { LabNav } from './LabNav';

export type LabSheetState = 'zu' | 'halb' | 'voll';
const SHEET_STATES: readonly LabSheetState[] = ['zu', 'halb', 'voll'];

/** Desktop and phones in landscape get a side panel (same breakpoint as the level editor's side sheet). */
export const LAB_SIDE_QUERY = '(min-width: 900px), (orientation: landscape) and (max-height: 520px)';
/** Half-open sheet: share of the frame, capped (keep in sync with `--lab-halb` in app.css). */
const HALB_FRACTION = 0.46;
const HALB_MAX_PX = 520;
const PANEL_KEY = 'ee.lab.panel';

function useMediaQuery(query: string): boolean {
  const [match, setMatch] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return match;
}

function storageGet(storage: 'session' | 'local', key: string): string | null {
  try {
    return (storage === 'session' ? sessionStorage : localStorage).getItem(key);
  } catch {
    return null;
  }
}
function storageSet(storage: 'session' | 'local', key: string, value: string): void {
  try {
    (storage === 'session' ? sessionStorage : localStorage).setItem(key, value);
  } catch {
    /* private mode / blocked: the state just is not remembered */
  }
}

/** `?sheet=zu|halb|voll` wins (links, screenshots); else the last state of this lab in this session; else closed. */
function initialSheet(search: string, key: string): LabSheetState {
  const q = new URLSearchParams(search).get('sheet');
  if (q === 'zu' || q === 'halb' || q === 'voll') return q;
  const s = storageGet('session', key);
  // Coming back to a lab never starts fully covered.
  if (s === 'halb' || s === 'voll') return 'halb';
  return 'zu';
}

function initialPanel(search: string): 'offen' | 'zu' {
  const q = new URLSearchParams(search).get('panel');
  if (q === 'zu' || q === 'offen') return q;
  return storageGet('local', PANEL_KEY) === 'zu' ? 'zu' : 'offen';
}

interface Drag {
  id: number;
  y0: number;
  x0: number;
  h0: number;
  samples: Array<{ y: number; t: number }>;
  vertical: boolean | null;
}

export interface LabFrameProps {
  title: string;
  /** The stage: canvas plus overlays; it always fills the area the controls leave free. */
  children: ReactNode;
  /** Settings: bottom sheet on phones (zu · halb · voll), side panel on desktop. */
  controls?: ReactNode;
  /** Quick actions in the sheet's bar — visible even when the sheet is closed. */
  peek?: ReactNode;
}

/**
 * Frame for every lab: the canvas (stage) resizes to the free area, the settings never hang over the view.
 * Phones: a bottom sheet with a grab handle, closed by default, snap points zu / halb / voll (voll overlays the
 * stage, which keeps its half-open size — no renderer resize while dragging). Desktop: a side panel that can be
 * hidden. The header carries the way back (Werkstatt, Spiel) and the perf badge.
 */
export function LabFrame({ title, children, controls, peek }: LabFrameProps) {
  const location = useLocation();
  const side = useMediaQuery(LAB_SIDE_QUERY);
  const hasSheet = controls != null || peek != null;
  const sheetKey = `ee.lab.sheet:${location.pathname}`;
  const [sheet, setSheetState] = useState<LabSheetState>(() => initialSheet(location.search, sheetKey));
  const [panel, setPanelState] = useState<'offen' | 'zu'>(() => initialPanel(location.search));
  const [dragH, setDragH] = useState<number | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const suppressClick = useRef(false);
  const bodyId = useId();
  const shortTitle = title.replace(/^P\d+[a-z]?\s+/i, '');

  const setSheet = (next: LabSheetState) => {
    setSheetState(next);
    storageSet('session', sheetKey, next);
  };
  const setPanel = (next: 'offen' | 'zu') => {
    setPanelState(next);
    storageSet('local', PANEL_KEY, next);
  };

  const snapHeights = (): Record<LabSheetState, number> => {
    const frame = frameRef.current;
    const H = frame?.clientHeight ?? window.innerHeight;
    const sheetEl = sheetRef.current;
    const padB = sheetEl ? parseFloat(getComputedStyle(sheetEl).paddingBottom) || 0 : 0;
    const zu = (headRef.current?.offsetHeight ?? 76) + padB;
    const headerBottom = headerRef.current && frame ? headerRef.current.getBoundingClientRect().bottom - frame.getBoundingClientRect().top : 110;
    return { zu, halb: Math.max(zu, Math.min(H * HALB_FRACTION, HALB_MAX_PX)), voll: Math.max(zu, H - headerBottom) };
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    suppressClick.current = false;
    if (side || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const h0 = sheetRef.current?.getBoundingClientRect().height ?? 0;
    drag.current = { id: e.pointerId, y0: e.clientY, x0: e.clientX, h0, samples: [{ y: e.clientY, t: performance.now() }], vertical: null };
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dy = e.clientY - d.y0;
    const dx = e.clientX - d.x0;
    if (d.vertical === null) {
      if (Math.abs(dy) < 8 && Math.abs(dx) < 8) return;
      d.vertical = Math.abs(dy) > Math.abs(dx);
      if (!d.vertical) {
        drag.current = null; // horizontal: the quick-action row scrolls
        return;
      }
      e.currentTarget.setPointerCapture(e.pointerId);
      suppressClick.current = true;
    }
    const snaps = snapHeights();
    d.samples.push({ y: e.clientY, t: performance.now() });
    if (d.samples.length > 6) d.samples.shift();
    setDragH(Math.max(snaps.zu * 0.85, Math.min(snaps.voll, d.h0 - dy)));
  };
  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.id !== e.pointerId || !d.vertical) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (e.type === 'pointerup' && e.clientY > 0) d.samples.push({ y: e.clientY, t: performance.now() });
    const first = d.samples[0]!;
    const last = d.samples[d.samples.length - 1]!;
    const v = (last.y - first.y) / Math.max(1, last.t - first.t); // px/ms, + = downwards
    const projected = d.h0 - (last.y - d.y0) - v * 180;
    const snaps = snapHeights();
    let best: LabSheetState = 'zu';
    for (const s of SHEET_STATES) if (Math.abs(snaps[s] - projected) < Math.abs(snaps[best] - projected)) best = s;
    setDragH(null);
    setSheet(best);
  };

  const onHandle = () => setSheet(sheet === 'zu' ? 'halb' : sheet === 'halb' ? 'voll' : 'zu');
  const onToggle = () => {
    if (side) setPanel('zu');
    else setSheet(sheet === 'zu' ? 'halb' : 'zu');
  };

  const open = side ? panel === 'offen' : sheet !== 'zu';
  return (
    <div
      ref={frameRef}
      className="lab-frame"
      data-layout={side ? 'side' : 'sheet'}
      data-sheet={sheet}
      data-panel={panel}
      data-has-sheet={hasSheet}
      data-testid="lab-frame"
    >
      <div className="lab-stage" data-testid="lab-stage">
        {children}
      </div>
      <header className="lab-header" ref={headerRef}>
        <LabNav />
        <h1 className="lab-title">{title}</h1>
        <PerfBadge />
        {hasSheet && side && panel === 'zu' ? (
          <button type="button" className="lab-panel-open" onClick={() => setPanel('offen')} data-testid="lab-panel-open" aria-label="Regler einblenden">
            ◂ Regler
          </button>
        ) : null}
      </header>
      {hasSheet ? (
        <section
          ref={sheetRef}
          className="lab-sheet"
          data-dragging={dragH !== null ? 'true' : undefined}
          style={dragH !== null ? ({ '--drag-h': `${dragH}px` } as CSSProperties) : undefined}
          data-testid="lab-sheet"
          aria-label={`Regler: ${shortTitle}`}
        >
          <div
            className="lab-sheet-head"
            ref={headRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onClickCapture={(e) => {
              // A drag that ends over a button must not also press it.
              if (!suppressClick.current) return;
              suppressClick.current = false;
              e.stopPropagation();
              e.preventDefault();
            }}
          >
            {side ? null : (
              <button type="button" className="lab-handle" onClick={onHandle} aria-label={`Regler ${sheet === 'zu' ? 'halb öffnen' : sheet === 'halb' ? 'ganz öffnen' : 'schließen'}`} data-testid="lab-sheet-handle">
                <span />
              </button>
            )}
            <div className="lab-sheet-bar">
              <button type="button" className="lab-sheet-toggle" onClick={onToggle} aria-expanded={open} aria-controls={controls ? bodyId : undefined} data-testid="lab-sheet-toggle">
                <b>{side ? 'Regler' : shortTitle}</b>
                <small>{side ? 'ausblenden ▸' : sheet === 'zu' ? 'Regler ▴' : 'Regler ▾'}</small>
              </button>
              {peek ? (
                <div className="lab-peek" data-testid="lab-peek">
                  {peek}
                </div>
              ) : null}
            </div>
          </div>
          {controls ? (
            <div id={bodyId} className="lab-sheet-body lab-controls" data-testid="lab-controls" inert={!side && sheet === 'zu' && dragH === null}>
              {controls}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
