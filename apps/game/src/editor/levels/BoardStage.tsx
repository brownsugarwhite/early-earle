import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  adjacent,
  cellKey,
  describeCell,
  moundCells,
  portalPairs,
  sameCell,
  sourceAdjacentCells,
  toolInfo,
  type BlockerDef,
  type Cell,
  type FloorDef,
  type LevelDraft,
  type MaskChar,
  type StartDef,
  type ThreatDef,
} from './draft';
import { useEditorStore, type BoardFlash } from './editorStore';
import {
  BlobGlyph,
  C,
  CageOverlay,
  CracksOrnament,
  CrustOverlay,
  CurrentOrnament,
  FogOverlay,
  MoundGlyph,
  OilOrnament,
  PillarGlyph,
  PortalRing,
  RotGlyph,
  ScrapGlyph,
  SleeperOverlay,
  SourceGlyph,
  SporeOrnament,
  StrayGlyph,
  ToxicGlyph,
  UiIcon,
  floorFill,
} from './icons';

/**
 * Das Brett als Bühne: eine SVG-Karte des Entwurfs (zeigt immer den aktuellen, auch ungültigen Stand),
 * direkt bedienbar. Tippen setzt/entfernt mit dem aktuellen Werkzeug, Ziehen malt, Halten (430 ms) öffnet
 * das Zellmenü, Wischen über Kanten setzt Fossilwände, zwei Finger zoomen und verschieben.
 */

export const UNIT = 100;
export const GAP = 12;
export const PITCH = UNIT + GAP;
export const PAD = 14;

export function boardViewBox(w: number, h: number): { x: number; y: number; w: number; h: number } {
  return { x: -PAD, y: -PAD, w: w * PITCH - GAP + 2 * PAD, h: h * PITCH - GAP + 2 * PAD };
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const LONG_PRESS_MS = 430;
const CHARGE_DELAY_MS = 130;

interface CellInfo {
  at: Cell;
  mask: MaskChar;
  start?: StartDef;
  blocker?: BlockerDef;
  moundPart?: boolean;
  floor?: FloorDef;
  threat?: ThreatDef;
  source: boolean;
}

function buildCells(d: LevelDraft): CellInfo[] {
  const list: CellInfo[] = [];
  const map = new Map<string, CellInfo>();
  for (let y = 0; y < d.grid.h; y++) {
    for (let x = 0; x < d.grid.w; x++) {
      const ch = d.grid.mask[y]?.charAt(x);
      const info: CellInfo = { at: [x, y], mask: ch === '#' ? '#' : ch === 'P' ? 'P' : '.', source: false };
      list.push(info);
      map.set(cellKey([x, y]), info);
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
  return list;
}

/** Inhalt einer Zelle (ohne Hintergrund) in 100er-Einheiten. */
function CellContent({ info }: { info: CellInfo }) {
  const { start, blocker, threat, moundPart } = info;
  if (blocker?.kind === 'scrapMound') return moundPart ? null : <MoundGlyph layers={blocker.layers} span={(2 * PITCH - GAP) / UNIT} />;
  if (blocker?.kind === 'scrap') return <ScrapGlyph layers={blocker.layers} />;
  const content = blocker && 'content' in blocker && blocker.content ? blocker.content : start?.blob;
  const nodes: React.ReactNode[] = [];
  if (content) {
    const scale = blocker?.kind === 'cage' ? 0.78 : blocker?.kind === 'fog' ? 0.72 : 0.94;
    nodes.push(<BlobGlyph key="blob" blob={content} scale={scale} dim={blocker?.kind === 'fog'} />);
  }
  if (blocker?.kind === 'crust') nodes.push(<CrustOverlay key="crust" />);
  else if (blocker?.kind === 'sleeper') nodes.push(<SleeperOverlay key="sleeper" />);
  else if (blocker?.kind === 'cage') nodes.push(<CageOverlay key="cage" layers={blocker.layers} />);
  else if (blocker?.kind === 'fog') nodes.push(<FogOverlay key="fog" hasContent={!!content} />);
  // Inhalt hinter Gittern/Nebel: Stufe als Plakette, damit man sie beim Bauen sieht.
  if (content && (blocker?.kind === 'cage' || blocker?.kind === 'fog')) nodes.push(<ContentBadge key="badge" text={content.kind === 'amoeba' ? 'A' : String(2 ** content.tier)} />);
  if (threat) {
    if (threat.kind === 'rot') nodes.push(<RotGlyph key="t" period={threat.period} />);
    else if (threat.kind === 'toxic') nodes.push(<ToxicGlyph key="t" countdown={threat.countdown} />);
    else nodes.push(<StrayGlyph key="t" tier={threat.tier} />);
  }
  return <>{nodes}</>;
}

function ContentBadge({ text }: { text: string }) {
  const w = 16 + text.length * 13;
  return (
    <g>
      <rect x={100 - w - 2} y={70} width={w} height={28} fill={C.ink} />
      <text x={100 - 2 - w / 2} y={85} textAnchor="middle" dominantBaseline="central" fontSize={20} fontWeight={900} fill={C.paper}>
        {text}
      </text>
    </g>
  );
}

function FloorLayer({ floor }: { floor: FloorDef }) {
  switch (floor.kind) {
    case 'oil':
      return <OilOrnament />;
    case 'withered':
    case 'deepWithered':
      return <CracksOrnament deep={floor.kind === 'deepWithered'} />;
    case 'spore':
      return <SporeOrnament size={1.15} />;
    case 'current':
      return <CurrentOrnament dir={floor.dir} color={C.teal} />;
    case 'portal':
      return <PortalRing big />;
  }
}

interface CellViewProps {
  info: CellInfo;
  /** Inhalts-Signatur: gleiche Signatur = gleiches Bild (spart Neuzeichnen beim Malen). */
  sig: string;
  spawnHint: boolean;
  selected: boolean;
  pendingPortal: boolean;
  issue: 'error' | 'warn' | null;
  popSeq: number;
  label: string;
}

const cellSig = (info: CellInfo): string => JSON.stringify([info.mask, info.start?.blob, info.blocker, info.moundPart, info.floor, info.threat, info.source]);

const sameCellView = (a: CellViewProps, b: CellViewProps): boolean =>
  a.sig === b.sig && a.spawnHint === b.spawnHint && a.selected === b.selected && a.pendingPortal === b.pendingPortal && a.issue === b.issue && a.popSeq === b.popSeq && a.label === b.label;

const CellView = memo(function CellView({ info, spawnHint, selected, pendingPortal, issue, popSeq, label }: CellViewProps) {
  const [x, y] = info.at;
  const tx = x * PITCH;
  const ty = y * PITCH;
  const common = {
    'data-testid': `cell-${x}-${y}`,
    'data-cell': '',
    'data-x': x,
    'data-y': y,
    'data-mask': info.mask,
    'data-selected': selected ? 'true' : undefined,
    role: 'button',
    'aria-label': label,
  } as const;
  if (info.mask === '#') {
    return (
      <g transform={`translate(${tx} ${ty})`} className="bd-cell" {...common}>
        <rect width={UNIT} height={UNIT} fill={C.ink} />
        {[0, 1, 2, 3, 4].map((i) => (
          <polygon key={i} points={`${i * 24 - 10},100 ${i * 24 + 4},100 ${i * 24 + 44},0 ${i * 24 + 30},0`} fill={C.paper} opacity={0.06} />
        ))}
        {issue ? <IssueMark kind={issue} /> : null}
      </g>
    );
  }
  const bg = selected ? C.neon : info.mask === 'P' ? C.pillar : floorFill(info.floor?.kind);
  return (
    <g transform={`translate(${tx} ${ty})`} className="bd-cell" {...common}>
      <g transform={selected ? 'translate(3 -4)' : undefined}>
        <rect x={selected ? -9 : -5} y={selected ? 6 : 3} width={UNIT} height={UNIT} fill={selected ? C.ink : C.khakiDeep} />
        <rect width={UNIT} height={UNIT} fill={bg} />
        {info.mask === 'P' ? (
          <g transform="translate(-6 -6) scale(1.12)">
            <PillarGlyph />
          </g>
        ) : null}
        {info.mask === '.' && info.floor ? <FloorLayer floor={info.floor} /> : null}
        {spawnHint && info.mask === '.' ? (
          <g fill={C.neon} opacity={0.9}>
            <polygon points="0,0 22,0 0,22" />
            <polygon points="100,100 78,100 100,78" />
          </g>
        ) : null}
        {info.mask === '.' && info.floor?.kind === 'portal' ? (
          <g className={pendingPortal ? 'bd-pulse' : undefined}>
            <rect x={0} y={0} width={30} height={30} fill={C.cyan} />
            <text x={15} y={16} textAnchor="middle" dominantBaseline="central" fontSize={22} fontWeight={900} fill={C.ink}>
              {info.floor.portalId}
            </text>
          </g>
        ) : null}
        {info.mask === '.' ? (
          <g key={popSeq} className={popSeq ? 'bd-pop' : undefined}>
            <CellContent info={info} />
          </g>
        ) : null}
        {info.source ? (
          <g transform={info.mask === 'P' ? 'translate(0 -48)' : undefined}>
            <SourceGlyph small />
          </g>
        ) : null}
        {issue ? <IssueMark kind={issue} /> : null}
      </g>
    </g>
  );
}, sameCellView);

function IssueMark({ kind }: { kind: 'error' | 'warn' }) {
  return (
    <g>
      <polygon points="100,0 100,34 66,0" fill={kind === 'error' ? C.rust : C.gold} />
      <text x={90} y={11} textAnchor="middle" dominantBaseline="central" fontSize={18} fontWeight={900} fill={kind === 'error' ? C.paper : C.ink}>
        !
      </text>
    </g>
  );
}

function Fences({ draft }: { draft: LevelDraft }) {
  return (
    <g className="bd-fences">
      {draft.fences.map((f, i) => {
        const horizontal = f.a[1] !== f.b[1];
        const minX = Math.min(f.a[0], f.b[0]);
        const minY = Math.min(f.a[1], f.b[1]);
        const r = horizontal
          ? { x: minX * PITCH - 8, y: minY * PITCH + UNIT + GAP / 2 - 9, w: UNIT + 16, h: 18 }
          : { x: minX * PITCH + UNIT + GAP / 2 - 9, y: minY * PITCH - 8, w: 18, h: UNIT + 16 };
        const dots = horizontal ? [0.2, 0.4, 0.6, 0.8].map((t) => [r.x + r.w * t, r.y + r.h / 2]) : [0.2, 0.4, 0.6, 0.8].map((t) => [r.x + r.w / 2, r.y + r.h * t]);
        return (
          <g key={`f${i}`}>
            <rect x={r.x - 5} y={r.y + 3} width={r.w} height={r.h} fill={C.inkSoft} opacity={0.7} />
            <rect x={r.x} y={r.y} width={r.w} height={r.h} fill={C.ink} />
            {dots.map(([cx, cy], k) => (
              <circle key={k} cx={cx} cy={cy} r={2.6} fill={C.paper} opacity={0.7} />
            ))}
          </g>
        );
      })}
    </g>
  );
}

/** Punkte in allen inneren Fugen: zeigen beim Fossilwand-Werkzeug, wo Wände hinkönnen. */
function FenceHints({ draft }: { draft: LevelDraft }) {
  const { w, h, mask } = draft.grid;
  const open = (x: number, y: number) => mask[y]?.charAt(x) !== '#';
  const dots: React.ReactNode[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x < w - 1 && open(x, y) && open(x + 1, y)) {
        for (const t of [0.3, 0.5, 0.7]) dots.push(<circle key={`v${x}-${y}-${t}`} cx={x * PITCH + UNIT + GAP / 2} cy={y * PITCH + UNIT * t} r={3.2} />);
      }
      if (y < h - 1 && open(x, y) && open(x, y + 1)) {
        for (const t of [0.3, 0.5, 0.7]) dots.push(<circle key={`h${x}-${y}-${t}`} cx={x * PITCH + UNIT * t} cy={y * PITCH + UNIT + GAP / 2} r={3.2} />);
      }
    }
  }
  return (
    <g fill={C.ink} opacity={0.55} className="bd-fence-hints">
      {dots}
    </g>
  );
}

/** Rohrpaare: Punktreihe (Ornament) von Zelle zu Zelle. */
function PortalLinks({ draft, strong }: { draft: LevelDraft; strong: boolean }) {
  const pairs = portalPairs(draft).filter((p) => p.b);
  if (!pairs.length) return null;
  return (
    <g className="bd-links" opacity={strong ? 1 : 0.45}>
      {pairs.map(({ id, a, b }) => {
        const ax = a[0] * PITCH + UNIT / 2;
        const ay = a[1] * PITCH + UNIT / 2;
        const bx = b![0] * PITCH + UNIT / 2;
        const by = b![1] * PITCH + UNIT / 2;
        const len = Math.hypot(bx - ax, by - ay);
        const n = Math.max(2, Math.floor(len / 22));
        const dots: React.ReactNode[] = [];
        for (let i = 1; i < n; i++) {
          const t = i / n;
          dots.push(<circle key={i} cx={ax + (bx - ax) * t} cy={ay + (by - ay) * t} r={i % 2 ? 5 : 3.5} />);
        }
        return (
          <g key={id}>
            <g fill={C.inkSoft} transform="translate(-3 1.5)" opacity={0.8}>
              {dots}
            </g>
            <g fill={C.cyan}>{dots}</g>
          </g>
        );
      })}
    </g>
  );
}

function FlashLayer({ flash }: { flash: BoardFlash | null }) {
  if (!flash) return null;
  const color = flash.kind === 'add' ? C.neon : flash.kind === 'remove' ? C.paper : C.rust;
  return (
    <g key={flash.seq} className="bd-flash" data-kind={flash.kind}>
      {flash.cells.map((c) => (
        <rect key={cellKey(c)} x={c[0] * PITCH} y={c[1] * PITCH} width={UNIT} height={UNIT} fill={color} />
      ))}
    </g>
  );
}

// ---- Gesten ----------------------------------------------------------------------------------------

interface Zoom {
  s: number;
  tx: number;
  ty: number;
}
const IDENTITY: Zoom = { s: 1, tx: 0, ty: 0 };

interface Press {
  id: number;
  x: number;
  y: number;
  u: number;
  v: number;
  cell: Cell;
  lastCell: Cell;
  lastU: number;
  lastV: number;
  moved: boolean;
  stroke: boolean;
  fenceStarted: boolean;
  longFired: boolean;
  timer: ReturnType<typeof setTimeout> | null;
  chargeTimer: ReturnType<typeof setTimeout> | null;
  touch: boolean;
}

interface Pinch {
  d0: number;
  mx0: number;
  my0: number;
  z0: Zoom;
}

export function BoardStage({ rect, hidden }: { rect: Rect; hidden: boolean }) {
  const draft = useEditorStore((s) => s.draft);
  const tool = useEditorStore((s) => s.tool);
  const cellMenu = useEditorStore((s) => s.cellMenu);
  const flash = useEditorStore((s) => s.flash);
  const pendingPortalId = useEditorStore((s) => s.pendingPortalId);
  const validation = useEditorStore((s) => s.validation);
  const tab = useEditorStore((s) => s.tab);
  const svgRef = useRef<SVGSVGElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const press = useRef<Press | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<Pinch | null>(null);
  const blockUntilUp = useRef(false);
  const [zoom, setZoom] = useState<Zoom>(IDENTITY);
  const [charge, setCharge] = useState<{ u: number; v: number; key: number } | null>(null);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  const w = draft?.grid.w ?? 4;
  const h = draft?.grid.h ?? 4;
  const vb = boardViewBox(w, h);

  useEffect(() => setZoom(IDENTITY), [w, h, rect.w, rect.h]);

  const cells = useMemo(() => (draft ? buildCells(draft) : []), [draft]);
  const spawnCells = useMemo(() => new Set(draft && (tool === 'source' || tab === 'spawn') ? sourceAdjacentCells(draft).map(cellKey) : []), [draft, tool, tab]);
  const issues = useMemo(() => {
    const m = new Map<string, 'error' | 'warn'>();
    for (const w of validation.warnings) for (const c of w.cells ?? []) if (!m.has(cellKey(c))) m.set(cellKey(c), 'warn');
    for (const e of validation.errors) for (const c of e.cells ?? []) m.set(cellKey(c), 'error');
    return m;
  }, [validation]);
  const flashKeys = useMemo(() => new Map((flash?.cells ?? []).map((c) => [cellKey(c), flash!.seq] as const)), [flash]);
  const pendingCellKey = useMemo(() => {
    if (!draft || !pendingPortalId) return null;
    const cands = draft.floors.filter((f) => f.kind === 'portal' && f.portalId === pendingPortalId);
    return cands.length === 1 ? cellKey(cands[0]!.at) : null;
  }, [draft, pendingPortalId]);

  /** Client-Koordinaten → Brett-Einheiten. */
  const toUnits = useCallback(
    (cx: number, cy: number): { u: number; v: number } => {
      const r = svgRef.current!.getBoundingClientRect();
      return { u: ((cx - r.left) / r.width) * vb.w + vb.x, v: ((cy - r.top) / r.height) * vb.h + vb.y };
    },
    [vb.w, vb.h, vb.x, vb.y],
  );
  /** Zelle unter einem Punkt (Fugen zählen zur näheren Zelle); null außerhalb. */
  const cellAt = useCallback(
    (u: number, v: number, clampTo = 0): Cell | null => {
      const x = Math.floor((u + GAP / 2) / PITCH);
      const y = Math.floor((v + GAP / 2) / PITCH);
      const within = (n: number, max: number) => n >= 0 && n < max;
      if (within(x, w) && within(y, h)) return [x, y];
      if (clampTo > 0 && u > -clampTo && v > -clampTo && u < w * PITCH - GAP + clampTo && v < h * PITCH - GAP + clampTo) return [Math.max(0, Math.min(w - 1, x)), Math.max(0, Math.min(h - 1, y))];
      return null;
    },
    [w, h],
  );
  /** Nächste innere Kante zu einem Punkt in einer Zelle. */
  const edgeNear = useCallback(
    (u: number, v: number, c: Cell): [Cell, Cell] | null => {
      const lx = u - c[0] * PITCH;
      const ly = v - c[1] * PITCH;
      const cand: { d: number; n: Cell }[] = [
        { d: lx, n: [c[0] - 1, c[1]] },
        { d: UNIT - lx, n: [c[0] + 1, c[1]] },
        { d: ly, n: [c[0], c[1] - 1] },
        { d: UNIT - ly, n: [c[0], c[1] + 1] },
      ];
      cand.sort((a, b) => a.d - b.d);
      for (const k of cand) if (k.n[0] >= 0 && k.n[1] >= 0 && k.n[0] < w && k.n[1] < h) return [c, k.n];
      return null;
    },
    [w, h],
  );

  const clearTimers = (p: Press | null) => {
    if (!p) return;
    if (p.timer) clearTimeout(p.timer);
    if (p.chargeTimer) clearTimeout(p.chargeTimer);
    p.timer = null;
    p.chargeTimer = null;
    setCharge(null);
  };

  const endStroke = () => {
    const st = useEditorStore.getState();
    if (st.stroke) st.strokeEnd();
  };

  /** Folgt der Linie vom letzten zum aktuellen Punkt, damit schnelle Striche keine Zellen überspringen. */
  const walk = (p: Press, u: number, v: number, visit: (from: Cell, to: Cell) => void) => {
    const du = u - p.lastU;
    const dv = v - p.lastV;
    const steps = Math.max(1, Math.ceil(Math.hypot(du, dv) / 24));
    for (let i = 1; i <= steps; i++) {
      const c = cellAt(p.lastU + (du * i) / steps, p.lastV + (dv * i) / steps);
      if (!c || sameCell(c, p.lastCell)) continue;
      visit(p.lastCell, c);
      p.lastCell = c;
    }
    p.lastU = u;
    p.lastV = v;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const st = useEditorStore.getState();
    // Erster Finger einer neuen Berührung: verwaiste Zeiger (z. B. außerhalb losgelassen) vergessen.
    if (e.isPrimary) {
      pointers.current.clear();
      pinch.current = null;
      blockUntilUp.current = false;
    }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    // Jeden Zeiger fangen, damit up/cancel sicher hier ankommen.
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* Zeiger schon weg */
    }
    if (pointers.current.size >= 2) {
      // Zweiter Finger: Zoom/Pan statt Malen.
      clearTimers(press.current);
      press.current = null;
      endStroke();
      const [a, b] = [...pointers.current.values()];
      pinch.current = { d0: Math.hypot(a!.x - b!.x, a!.y - b!.y), mx0: (a!.x + b!.x) / 2, my0: (a!.y + b!.y) / 2, z0: zoomRef.current };
      blockUntilUp.current = true;
      return;
    }
    if (blockUntilUp.current) return;
    const { u, v } = toUnits(e.clientX, e.clientY);
    const cell = cellAt(u, v, 26);
    if (!cell || !st.draft) return;
    e.preventDefault();
    // Offenes Zellmenü: der erste Tipp aufs Brett schließt nur (keine versehentliche Änderung).
    if (st.cellMenu) {
      st.closeCellMenu();
      blockUntilUp.current = true;
      return;
    }
    const p: Press = { id: e.pointerId, x: e.clientX, y: e.clientY, u, v, cell, lastCell: cell, lastU: u, lastV: v, moved: false, stroke: false, fenceStarted: false, longFired: false, timer: null, chargeTimer: null, touch: e.pointerType !== 'mouse' };
    press.current = p;
    p.chargeTimer = setTimeout(() => setCharge({ u, v, key: Date.now() }), CHARGE_DELAY_MS);
    p.timer = setTimeout(() => {
      if (press.current !== p || p.moved) return;
      p.longFired = true;
      clearTimers(p);
      useEditorStore.getState().openCellMenu(p.cell);
    }, LONG_PRESS_MS);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pz = pinch.current;
    if (pz && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      const mx = (a!.x + b!.x) / 2;
      const my = (a!.y + b!.y) / 2;
      const layer = layerRef.current!.getBoundingClientRect();
      const ox = layer.left + rect.x;
      const oy = layer.top + rect.y;
      const s = Math.max(1, Math.min(3.5, pz.z0.s * (d / Math.max(1, pz.d0))));
      const lx = (pz.mx0 - ox - pz.z0.tx) / pz.z0.s;
      const ly = (pz.my0 - oy - pz.z0.ty) / pz.z0.s;
      let tx = mx - ox - lx * s;
      let ty = my - oy - ly * s;
      const slack = 60;
      tx = Math.min(slack, Math.max(rect.w - rect.w * s - slack, tx));
      ty = Math.min(slack, Math.max(rect.h - rect.h * s - slack, ty));
      setZoom(s <= 1.01 ? IDENTITY : { s, tx, ty });
      return;
    }
    const p = press.current;
    if (!p || p.id !== e.pointerId || p.longFired) return;
    const dist = Math.hypot(e.clientX - p.x, e.clientY - p.y);
    const tolerance = p.touch ? 10 : 4;
    if (!p.moved && dist <= tolerance) return;
    const st = useEditorStore.getState();
    const { u, v } = toUnits(e.clientX, e.clientY);
    if (!p.moved) {
      p.moved = true;
      clearTimers(p);
      if (st.tool !== 'fence' && toolInfo(st.tool).paint) {
        st.strokeBegin(p.cell);
        p.stroke = true;
      }
    }
    if (st.tool === 'fence') {
      walk(p, u, v, (from, to) => {
        if (!adjacent(from, to)) return;
        useEditorStore.getState().fenceEdge(from, to, p.fenceStarted ? 'move' : 'begin');
        p.fenceStarted = true;
      });
    } else if (p.stroke) {
      walk(p, u, v, (_from, to) => useEditorStore.getState().strokeTo(to));
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 0) blockUntilUp.current = false;
    const p = press.current;
    if (!p || p.id !== e.pointerId) return;
    press.current = null;
    clearTimers(p);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    const st = useEditorStore.getState();
    if (p.longFired) return;
    if (p.moved) {
      endStroke();
      return;
    }
    if (e.type === 'pointercancel') return;
    if (st.tool === 'fence') {
      const edge = edgeNear(p.u, p.v, p.cell);
      if (edge) st.fenceEdge(edge[0], edge[1], 'tap');
      endStroke();
    } else st.tapCell(p.cell);
  };

  const onContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const { u, v } = toUnits(e.clientX, e.clientY);
    const c = cellAt(u, v);
    if (c) useEditorStore.getState().openCellMenu(c);
  };

  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    // Trackpad-Pinch (ctrl+wheel) zoomt das Brett; normales Scrollen bleibt ohne Wirkung.
    if (!e.ctrlKey) return;
    const layer = layerRef.current!.getBoundingClientRect();
    const ox = layer.left + rect.x;
    const oy = layer.top + rect.y;
    const z = zoomRef.current;
    const s = Math.max(1, Math.min(3.5, z.s * Math.exp(-e.deltaY / 200)));
    const lx = (e.clientX - ox - z.tx) / z.s;
    const ly = (e.clientY - oy - z.ty) / z.s;
    setZoom(s <= 1.01 ? IDENTITY : { s, tx: e.clientX - ox - lx * s, ty: e.clientY - oy - ly * s });
  };

  useEffect(() => () => clearTimers(press.current), []);

  if (!draft) return null;
  const zoomed = zoom.s > 1.01;

  return (
    <div
      ref={layerRef}
      className="bd-layer"
      data-hidden={hidden ? 'true' : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onContextMenu={onContextMenu}
      onWheel={onWheel}
    >
      <div className="bd-wrap" style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h, transform: `translate(${zoom.tx}px, ${zoom.ty}px) scale(${zoom.s})` }}>
        <svg
          ref={svgRef}
          className="bd-svg"
          data-testid="board"
          data-tool={tool}
          viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
          width={rect.w}
          height={rect.h}
          aria-label={`Brett ${w}×${h}, Werkzeug ${toolInfo(tool).label}`}
        >
          <rect x={vb.x - 8} y={vb.y + 6} width={vb.w} height={vb.h} fill={C.inkSoft} />
          <rect x={vb.x} y={vb.y} width={vb.w} height={vb.h} fill={C.khakiDeep} />
          {cells.map((info) => {
            const key = cellKey(info.at);
            return (
              <CellView
                key={key}
                info={info}
                sig={cellSig(info)}
                spawnHint={spawnCells.has(key)}
                selected={!!cellMenu && sameCell(cellMenu, info.at)}
                pendingPortal={pendingCellKey === key}
                issue={issues.get(key) ?? null}
                popSeq={flash?.kind === 'add' ? (flashKeys.get(key) ?? 0) : 0}
                label={`Zelle ${info.at[0]},${info.at[1]}: ${describeCell(draft, info.at)}`}
              />
            );
          })}
          <PortalLinks draft={draft} strong={tool === 'portal' || (!!cellMenu && draft.floors.some((f) => f.kind === 'portal' && sameCell(f.at, cellMenu)))} />
          <Fences draft={draft} />
          {tool === 'fence' ? <FenceHints draft={draft} /> : null}
          <FlashLayer flash={flash} />
          {charge ? <circle key={charge.key} className="bd-charge" cx={charge.u} cy={charge.v} r={46} fill={C.neon} /> : null}
        </svg>
      </div>
      {zoomed ? (
        <button
          type="button"
          className="ed-chip ed-zoom-reset"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setZoom(IDENTITY)}
          aria-label="Zoom zurücksetzen"
          style={{ left: rect.x + 8, top: rect.y + 8 }}
        >
          <UiIcon name="zoom" size={18} /> 1:1
        </button>
      ) : null}
    </div>
  );
}
