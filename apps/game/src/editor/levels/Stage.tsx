import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { BoardStage, PITCH, UNIT, boardViewBox, type Rect } from './BoardStage';
import { CellMenu } from './CellMenu';
import { Dock } from './Dock';
import type { EditorPreviewScene } from './EditorPreviewScene';
import { useEditorStore } from './editorStore';
import { PreviewPane, type PreviewVariant } from './PreviewPane';
import { usePreviewStore } from './previewStore';

const M = 12;
/** Platz, den das schwebende Dock unten braucht. */
const DOCK_RESERVE = 82;
const PIP_MIN = 104;

interface Layout {
  kind: 'split' | 'stack';
  board: Rect;
  preview: Rect | null;
  variant: PreviewVariant;
  /** Bereich, in dem das Zellmenü erscheint. */
  menuArea: Rect;
  /** Freie Fläche links neben dem 3D-Fenster (Handy) für Gesten-Hinweise. */
  hint: Rect | null;
}

function computeLayout(W: number, H: number, gw: number, gh: number, play: boolean): Layout {
  const vb = boardViewBox(gw, gh);
  const aspect = vb.w / vb.h;
  const fit = (area: Rect, alignBottom: boolean): Rect => {
    const w = Math.max(0, Math.min(area.w, area.h * aspect));
    const h = w / aspect;
    return { x: Math.round(area.x + (area.w - w) / 2), y: Math.round(alignBottom ? area.y + area.h - h : area.y + (area.h - h) / 2), w: Math.round(w), h: Math.round(h) };
  };
  const usableH = Math.max(0, H - DOCK_RESERVE - M);
  // Breite Bühne (Desktop, Tablet quer): Brett links, 3D rechts — beides immer sichtbar.
  const wide = W >= 760 && W >= H * 0.95;
  if (wide) {
    const half = (W - 3 * M) / 2;
    const left: Rect = { x: M, y: M, w: half, h: usableH };
    const right: Rect = { x: 2 * M + half, y: M, w: half, h: usableH };
    const board = fit(left, false);
    return play
      ? { kind: 'split', board, preview: { x: 0, y: 0, w: W, h: H - DOCK_RESERVE + 6 }, variant: 'full', menuArea: right, hint: null }
      : { kind: 'split', board, preview: right, variant: 'split', menuArea: right, hint: null };
  }
  const area: Rect = { x: M, y: M, w: Math.max(0, W - 2 * M), h: usableH };
  // Brett unten (Daumennähe), darüber — wenn Platz ist — die 3D-Vorschau als kleines Fenster.
  let board = fit(area, true);
  if (!play && board.y - M < PIP_MIN + M) {
    // Knapp: Brett etwas verkleinern, solange die Zellen ≥ 56 px bleiben, damit das 3D-Fenster Platz hat.
    const shrunk = fit({ ...area, y: area.y + PIP_MIN + M, h: area.h - PIP_MIN - M }, true);
    const cellPx = (shrunk.w * UNIT) / vb.w;
    if (cellPx >= 56) board = shrunk;
  }
  const leftover = board.y - M;
  let preview: Rect | null = null;
  if (play) preview = { x: 0, y: 0, w: W, h: H - DOCK_RESERVE + 6 };
  else if (leftover >= PIP_MIN + M) {
    const ph = Math.min(leftover - M, 200);
    const pw = Math.min(area.w * 0.58, Math.round(ph * 1.4));
    preview = { x: W - M - pw, y: M, w: pw, h: ph };
  }
  const hint = !play && preview && preview.x - 2 * M >= 120 ? { x: M, y: M, w: preview.x - 2 * M, h: preview.h } : null;
  return { kind: 'stack', board, preview, variant: play ? 'full' : preview ? 'pip' : 'hidden', menuArea: { x: M, y: M, w: area.w, h: usableH }, hint };
}

/** Gesten-Spickzettel bzw. Hinweis zum aktuellen Schritt (kein Hover nötig). */
function StageHint({ rect }: { rect: Rect }) {
  const tool = useEditorStore((s) => s.tool);
  const pending = useEditorStore((s) => s.pendingPortalId);
  let lines: string[];
  let strong = false;
  if (tool === 'portal' && pending) {
    lines = [`Rohr ${pending}:`, 'jetzt die zweite', 'Zelle antippen'];
    strong = true;
  } else if (tool === 'fence') lines = ['Über eine Kante', 'wischen setzt', 'Fossilwände'];
  else if (tool === 'scrapMound') lines = ['Schrottberg:', 'links oben antippen', '(2×2 Zellen)'];
  else lines = ['Tippen setzt', 'Ziehen malt', 'Halten = Zellmenü', '2 Finger zoomen'];
  return (
    <div className="ed-stage-hint" data-strong={strong} style={{ left: rect.x, top: rect.y, width: rect.w, maxHeight: rect.h }} aria-live="polite">
      {lines.map((l) => (
        <span key={l}>{l}</span>
      ))}
    </div>
  );
}

/**
 * Die Bühne: Brett (Bauen), 3D-Vorschau (Bild-im-Bild oder daneben; beim Testen voll), Zellmenü und Dock.
 */
export function Stage({ controller }: { controller: EditorPreviewScene }) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const mode = usePreviewStore((s) => s.mode);
  const gw = useEditorStore((s) => s.draft?.grid.w ?? 4);
  const gh = useEditorStore((s) => s.draft?.grid.h ?? 4);
  const cellMenu = useEditorStore((s) => s.cellMenu);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, []);

  const layout = useMemo(() => computeLayout(size.w, size.h, gw, gh, mode === 'play'), [size.w, size.h, gw, gh, mode]);

  const menuPlacement = useMemo(() => {
    const a = layout.menuArea;
    const width = Math.min(a.w, 460);
    const left = a.x + (a.w - width) / 2;
    if (layout.kind === 'split') return { left, width, top: a.y, maxHeight: a.h };
    // Das Menü nutzt den Platz über oder unter der gewählten Zelle — die Zelle selbst bleibt sichtbar.
    const vb = boardViewBox(gw, gh);
    const scale = layout.board.h / vb.h;
    const row = cellMenu ? cellMenu[1] : 0;
    const cellTop = layout.board.y + (row * PITCH - vb.y) * scale;
    const cellBottom = cellTop + UNIT * scale;
    const below = size.h - DOCK_RESERVE + 4 - (cellBottom + 10);
    const above = cellTop - 10 - a.y;
    if (below >= above) return { left, width, bottom: DOCK_RESERVE - 4, maxHeight: Math.max(220, Math.round(below)) };
    return { left, width, top: a.y, maxHeight: Math.max(220, Math.round(above)) };
  }, [layout, cellMenu, gw, gh, size.h]);

  return (
    <div className="ed-stage" ref={ref} data-mode={mode} data-layout={layout.kind}>
      {size.w > 0 ? <BoardStage rect={layout.board} hidden={mode === 'play'} /> : null}
      {size.w > 0 && layout.hint && !cellMenu ? <StageHint rect={layout.hint} /> : null}
      {/* Der Canvas bleibt immer eingehängt (ein Renderer, sofortiges Umschalten). */}
      <PreviewPane controller={controller} rect={size.w > 0 ? layout.preview : null} variant={layout.variant} />
      {size.w > 0 && cellMenu && mode === 'edit' ? <CellMenu placement={menuPlacement} /> : null}
      <Dock />
    </div>
  );
}
