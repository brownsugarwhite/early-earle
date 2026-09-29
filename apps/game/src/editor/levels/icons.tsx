import type { ReactNode } from 'react';
import type { Dir, Material } from '@ee/core';
import type { BlobDef, ToolId, ToolParams } from './draft';

/**
 * Icon-Satz des Level-Editors im Earle × Neo-Brutalismus-Stil (STYLE.md §3/§8): nur gefüllte Flächen,
 * keine Konturen (kein `stroke`), harter Versatzschatten in Sonnenrichtung (Sonne rechts → Schatten nach
 * links unten). Filigrane Muster (Punktspiralen, Schraffur, Streifen) nur *innerhalb* der Formen.
 * Alle Glyphen zeichnen in eine 100×100-Box und lassen sich im Brett-SVG direkt als <g> verwenden.
 */

export const C = {
  ink: '#0f1c22',
  inkSoft: '#242c0b',
  paper: '#f7f6d8',
  khaki: '#b3bb6d',
  khakiDeep: '#606e4f',
  neon: '#b8ff2a',
  teal: '#22baa9',
  sky1: '#7ce6d5',
  sky2: '#caf5e4',
  rust: '#c8542a',
  pink: '#e5aed4',
  violet: '#937cc2',
  cyan: '#2de5f8',
  ice: '#dbf8fa',
  scrap: '#8d9a88',
  scrapDark: '#6f7c6a',
  pillar: '#3e645b',
  pillarLight: '#5f8c7f',
  oil: '#1a131b',
  withered: '#8a8556',
  deep: '#55563f',
  crack: '#3f4230',
  fire: '#f17023',
  gold: '#ddd042',
  red: '#db292f',
} as const;

/** Stufenfarben wie in der 3D-Vorschau (Tier 1 = pezenpez-Türkis, dann Blob-Sheet). */
export const TIER_COLORS = ['#7ce6d5', '#7ce6d5', '#22baa9', '#3fc96a', '#a8d84a', '#ddd042', '#f0a62a', '#f17023', '#db292f', '#e5aed4', '#937cc2', '#2de5f8', '#f7f6d8'];
export const tierColor = (tier: number): string => TIER_COLORS[Math.max(0, Math.min(tier, TIER_COLORS.length - 1))] ?? C.sky1;

/** Textfarbe mit genug Wertkontrast auf einer Füllung. */
export function inkOn(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b < 118 ? C.paper : C.ink;
}

/** Schattenversatz in Sonnenrichtung (entspricht `--sun-shadow: -8px 3px 0`). */
const SX = -6;
const SY = 3;

function Shadow({ children, dx = SX, dy = SY, color = C.inkSoft, opacity = 1 }: { children: ReactNode; dx?: number; dy?: number; color?: string; opacity?: number }) {
  return (
    <g transform={`translate(${dx} ${dy})`} fill={color} opacity={opacity}>
      {children}
    </g>
  );
}

function Label({ x = 50, y = 52, size = 30, fill = C.ink, children }: { x?: number; y?: number; size?: number; fill?: string; children: ReactNode }) {
  return (
    <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={size} fontWeight={900} fill={fill} fontFamily="'Helvetica Neue', Arial, sans-serif" style={{ pointerEvents: 'none' }}>
      {children}
    </text>
  );
}

// ---- Formen ------------------------------------------------------------------------------------

const BLOB_PATH = 'M50 18 C73 18 84 30 84 52 C84 72 72 82 50 82 C28 82 16 72 16 52 C16 30 27 18 50 18 Z';
const AMOEBA_PATH = 'M50 16 C62 14 70 24 78 26 C88 30 86 44 82 52 C78 60 86 70 76 78 C66 86 58 80 50 84 C40 88 30 82 24 74 C16 64 18 56 18 48 C18 38 14 28 24 22 C32 16 40 18 50 16 Z';
const CLOUD = (
  <>
    <circle cx={34} cy={58} r={19} />
    <circle cx={52} cy={44} r={24} />
    <circle cx={70} cy={58} r={18} />
    <rect x={30} y={56} width={42} height={20} />
  </>
);

function MaterialMark({ material }: { material: Material }) {
  switch (material) {
    case 'liquid':
      return (
        <g>
          <path d="M74 58 C80 66 82 70 82 73 C82 78 78 81 74 81 C70 81 66 78 66 73 C66 70 68 66 74 58 Z" transform="translate(-3 1.5)" fill={C.inkSoft} />
          <path d="M74 58 C80 66 82 70 82 73 C82 78 78 81 74 81 C70 81 66 78 66 73 C66 70 68 66 74 58 Z" fill={C.cyan} />
        </g>
      );
    case 'gas':
      return (
        <g fill={C.paper} opacity={0.92}>
          <circle cx={72} cy={74} r={6} />
          <circle cx={81} cy={64} r={4} />
          <circle cx={83} cy={77} r={3} />
        </g>
      );
    case 'fire':
      return (
        <g>
          <path d="M74 56 C80 64 84 68 82 75 C81 80 77 83 73 83 C68 83 64 79 65 73 C66 68 70 66 70 60 C72 62 73 64 74 56 Z" fill={C.fire} />
          <path d="M74 67 C77 71 78 74 77 77 C76 79 74 80 73 80 C71 80 69 78 70 75 C70 72 72 71 74 67 Z" fill={C.gold} />
        </g>
      );
    case 'jelly':
      return <rect x={68} y={66} width={13} height={13} fill={C.pink} transform="rotate(12 74 72)" />;
  }
}

export function blobLabel(b: Pick<BlobDef, 'tier' | 'kind'>): string {
  return b.kind === 'amoeba' ? 'A' : String(2 ** b.tier);
}

/** Start-Blob: Gummi-Form in Stufenfarbe mit Glanzlicht, Zahl, Materialzeichen. */
export function BlobGlyph({ blob, scale = 1, showNumber = true, dim = false }: { blob: BlobDef; scale?: number; showNumber?: boolean; dim?: boolean }) {
  const s = scale;
  const tf = s === 1 ? undefined : `translate(${50 - 50 * s} ${50 - 50 * s}) scale(${s})`;
  if (blob.kind === 'amoeba') {
    return (
      <g transform={tf} opacity={dim ? 0.55 : 1}>
        <path d={AMOEBA_PATH} transform={`translate(${SX} ${SY})`} fill={C.inkSoft} />
        <path d={AMOEBA_PATH} fill={C.paper} />
        <circle cx={38} cy={40} r={6} fill={TIER_COLORS[2]} />
        <circle cx={60} cy={34} r={5} fill={TIER_COLORS[5]} />
        <circle cx={64} cy={58} r={6} fill={TIER_COLORS[7]} />
        <circle cx={42} cy={64} r={5} fill={TIER_COLORS[10]} />
        <circle cx={52} cy={50} r={4} fill={TIER_COLORS[3]} />
      </g>
    );
  }
  const fill = tierColor(blob.tier);
  const text = blobLabel(blob);
  const size = text.length >= 4 ? 19 : text.length === 3 ? 24 : 30;
  return (
    <g transform={tf} opacity={dim ? 0.55 : 1}>
      <path d={BLOB_PATH} transform={`translate(${SX} ${SY})`} fill={C.inkSoft} />
      <path d={BLOB_PATH} fill={fill} />
      <ellipse cx={64} cy={31} rx={8} ry={4.5} fill={C.paper} opacity={0.85} transform="rotate(-24 64 31)" />
      <circle cx={73} cy={40} r={2.6} fill={C.paper} opacity={0.85} />
      {showNumber ? (
        <Label y={54} size={size} fill={inkOn(fill)}>
          {text}
        </Label>
      ) : null}
      {blob.material ? <MaterialMark material={blob.material} /> : null}
    </g>
  );
}

export function ScrapGlyph({ layers }: { layers: number }) {
  const slabs = [
    { x: 18, y: 64, w: 64 },
    { x: 24, y: 46, w: 52 },
    { x: 30, y: 28, w: 40 },
  ].slice(0, Math.max(1, Math.min(3, layers)));
  return (
    <g>
      {slabs.map((s, i) => (
        <g key={i}>
          <rect x={s.x + SX} y={s.y + SY} width={s.w} height={16} fill={C.inkSoft} />
          <rect x={s.x} y={s.y} width={s.w} height={16} fill={i % 2 ? C.scrapDark : C.scrap} />
          <rect x={s.x} y={s.y + 12} width={s.w} height={4} fill={i % 2 ? '#5c6858' : C.scrapDark} />
          <circle cx={s.x + 6} cy={s.y + 6} r={2.2} fill={C.inkSoft} />
          <circle cx={s.x + s.w - 6} cy={s.y + 6} r={2.2} fill={C.inkSoft} />
        </g>
      ))}
    </g>
  );
}

/** Schrottberg; `span` = Breite in Zellen-Einheiten (1 für Icons, ~2,1 auf dem Brett). */
export function MoundGlyph({ layers, span = 1 }: { layers: number; span?: number }) {
  const tiers = [
    { x: 8, y: 66, w: 84, h: 20 },
    { x: 16, y: 48, w: 68, h: 20 },
    { x: 26, y: 30, w: 48, h: 20 },
    { x: 36, y: 14, w: 28, h: 18 },
  ];
  return (
    <g transform={span === 1 ? undefined : `scale(${span})`}>
      {tiers.map((t, i) => (
        <g key={i}>
          <rect x={t.x + SX} y={t.y + SY} width={t.w} height={t.h} fill={C.inkSoft} />
          <rect x={t.x} y={t.y} width={t.w} height={t.h} fill={i % 2 ? C.scrapDark : C.scrap} />
          {Array.from({ length: Math.max(1, Math.floor(t.w / 18)) }, (_, k) => (
            <rect key={k} x={t.x + 6 + k * 18} y={t.y + 4} width={3} height={t.h - 8} fill={C.inkSoft} opacity={0.35} />
          ))}
        </g>
      ))}
      <rect x={62} y={4} width={32} height={22} fill={C.ink} />
      <Label x={78} y={15.5} size={15} fill={C.paper}>
        {`×${layers}`}
      </Label>
    </g>
  );
}

export function CrustOverlay() {
  return (
    <g>
      <path d={BLOB_PATH} fill={C.ice} opacity={0.62} transform="translate(50 50) scale(1.08) translate(-50 -50)" />
      <polygon points="20,44 30,22 38,46" fill={C.paper} opacity={0.9} />
      <polygon points="62,20 80,30 68,40" fill={C.paper} opacity={0.85} />
      <polygon points="70,64 86,58 80,80" fill={C.paper} opacity={0.8} />
      <polygon points="26,70 40,66 34,84" fill={C.paper} opacity={0.75} />
    </g>
  );
}

export function SleeperOverlay() {
  return (
    <g>
      <path d={BLOB_PATH} fill={C.ink} opacity={0.35} />
      <g fill={C.violet}>
        <Label x={72} y={26} size={22} fill={C.inkSoft}>
          z
        </Label>
        <Label x={76} y={24} size={22} fill={C.violet}>
          z
        </Label>
        <Label x={88} y={12} size={15} fill={C.violet}>
          z
        </Label>
      </g>
    </g>
  );
}

export function CageOverlay({ layers }: { layers: number }) {
  const rails = layers >= 3 ? [10, 36, 60, 83] : layers === 2 ? [10, 47, 83] : [10, 83];
  return (
    <g fill={C.ink}>
      {[20, 34, 48, 62, 76].map((x) => (
        <rect key={x} x={x} y={10} width={5} height={80} />
      ))}
      {rails.map((y) => (
        <rect key={y} x={12} y={y} width={76} height={7} />
      ))}
    </g>
  );
}

export function FogOverlay({ hasContent }: { hasContent: boolean }) {
  return (
    <g>
      <Shadow opacity={0.5}>{CLOUD}</Shadow>
      <g fill={C.paper} opacity={hasContent ? 0.86 : 0.95}>
        {CLOUD}
      </g>
      <Label y={58} size={30} fill={C.ink}>
        ?
      </Label>
    </g>
  );
}

// ---- Böden (füllen die Zelle, liegen unter Blobs) ---------------------------------------------------------

/** Hintergrundfarbe einer Zelle je Boden. */
export function floorFill(kind: string | undefined): string {
  switch (kind) {
    case 'oil':
      return C.oil;
    case 'withered':
      return C.withered;
    case 'deepWithered':
      return C.deep;
    default:
      return C.khaki;
  }
}

export function OilOrnament() {
  return (
    <g>
      <path d="M22 34 C34 26 48 30 56 34 C46 34 36 36 26 40 Z" fill={C.violet} opacity={0.85} />
      <path d="M50 70 C62 64 74 66 82 72 C72 72 62 74 54 76 Z" fill={C.cyan} opacity={0.7} />
      <path d="M60 22 C68 20 76 24 80 30 C74 28 66 26 60 26 Z" fill={C.pink} opacity={0.7} />
    </g>
  );
}

export function OilPuddle() {
  const d = 'M20 56 C18 40 34 30 50 34 C64 26 84 34 82 50 C88 62 76 80 58 76 C44 86 22 78 20 64 Z';
  return (
    <g>
      <path d={d} transform={`translate(${SX} ${SY})`} fill={C.inkSoft} />
      <path d={d} fill={C.oil} />
      <path d="M32 50 C40 42 52 42 58 46 C50 48 42 50 36 56 Z" fill={C.violet} opacity={0.9} />
      <path d="M54 64 C62 60 70 62 74 66 C68 66 62 68 56 70 Z" fill={C.cyan} opacity={0.75} />
    </g>
  );
}

export function CracksOrnament({ deep }: { deep: boolean }) {
  return (
    <g fill={C.crack} opacity={deep ? 0.95 : 0.75}>
      <polygon points="30,8 36,26 28,42 38,58 33,74 38,92 42,92 38,74 43,58 34,42 41,26 35,8" />
      <polygon points="64,8 70,22 62,36 70,50 66,58 70,58 74,50 66,36 74,22 68,8" />
      {deep ? <polygon points="70,64 78,74 74,92 78,92 82,74 74,64" /> : null}
      {deep ? <polygon points="8,48 20,52 30,46 30,50 20,56 8,52" /> : null}
    </g>
  );
}

/** Punktspirale im goldenen Winkel (Phyllotaxis) — Earle-Ornament für vergrabene Sporen. */
export function SporeOrnament({ size = 1 }: { size?: number }) {
  const dots: ReactNode[] = [];
  for (let i = 1; i <= 13; i++) {
    const a = (i * 137.508 * Math.PI) / 180;
    const r = 6.2 * Math.sqrt(i) * size;
    const x = 50 + r * Math.cos(a);
    const y = 50 + r * Math.sin(a);
    const rr = (3.6 - i * 0.12) * size;
    dots.push(<circle key={`s${i}`} cx={x + SX * 0.45} cy={y + SY * 0.45} r={rr} fill={C.inkSoft} />);
    dots.push(<circle key={`d${i}`} cx={x} cy={y} r={rr} fill={C.neon} />);
  }
  return (
    <g>
      <circle cx={50 + SX * 0.45} cy={50 + SY * 0.45} r={5 * size} fill={C.inkSoft} />
      <circle cx={50} cy={50} r={5 * size} fill={C.neon} />
      {dots}
    </g>
  );
}

const DIR_ROT: Record<Dir, number> = { right: 0, down: 90, left: 180, up: 270 };

export function CurrentOrnament({ dir, color = C.teal }: { dir: Dir; color?: string }) {
  const chevron = (x: number) => `${x},26 ${x + 18},50 ${x},74 ${x - 10},74 ${x + 8},50 ${x - 10},26`;
  return (
    <g transform={`rotate(${DIR_ROT[dir]} 50 50)`}>
      <polygon points={chevron(30)} transform={`translate(${SX * 0.6} ${SY * 0.6})`} fill={C.inkSoft} opacity={0.6} />
      <polygon points={chevron(56)} transform={`translate(${SX * 0.6} ${SY * 0.6})`} fill={C.inkSoft} opacity={0.6} />
      <polygon points={chevron(30)} fill={color} />
      <polygon points={chevron(56)} fill={color} />
    </g>
  );
}

const RING = (r1: number, r2: number) => `M50 ${50 - r1} a${r1} ${r1} 0 1 0 0.01 0 Z M50 ${50 - r2} a${r2} ${r2} 0 1 1 -0.01 0 Z`;

export function PortalRing({ id, big = false }: { id?: string; big?: boolean }) {
  const d = big ? RING(45, 36) : RING(32, 19);
  return (
    <g>
      <path d={d} fillRule="evenodd" transform={`translate(${SX} ${SY})`} fill={C.inkSoft} />
      <path d={d} fillRule="evenodd" fill={C.cyan} />
      {id && !big ? (
        <Label y={52} size={24} fill={C.ink}>
          {id}
        </Label>
      ) : null}
    </g>
  );
}

// ---- Bedrohungen ------------------------------------------------------------------------------------

export function RotGlyph({ period }: { period?: number | undefined }) {
  const d = 'M16 72 C16 42 32 26 50 26 C68 26 84 42 84 72 Z';
  return (
    <g>
      <path d={d} transform={`translate(${SX} ${SY})`} fill={C.inkSoft} />
      <path d={d} fill={C.rust} />
      <circle cx={36} cy={50} r={6} fill="#8a3a1c" />
      <circle cx={58} cy={40} r={4.5} fill="#8a3a1c" />
      <circle cx={66} cy={58} r={6} fill="#8a3a1c" />
      <circle cx={46} cy={62} r={3.5} fill="#8a3a1c" />
      <ellipse cx={24} cy={76} rx={6} ry={3.5} fill={C.rust} />
      <ellipse cx={76} cy={76} rx={7} ry={3.5} fill={C.rust} />
      {period !== undefined ? (
        <>
          <rect x={60} y={6} width={30} height={22} fill={C.ink} />
          <Label x={75} y={17.5} size={15} fill={C.paper}>
            {`${period}↻`}
          </Label>
        </>
      ) : null}
    </g>
  );
}

export function ToxicGlyph({ countdown }: { countdown?: number | undefined }) {
  return (
    <g>
      <Shadow>{CLOUD}</Shadow>
      <g fill={C.violet}>{CLOUD}</g>
      <circle cx={40} cy={52} r={4} fill={C.ink} opacity={0.35} />
      <circle cx={60} cy={46} r={3} fill={C.ink} opacity={0.35} />
      {countdown !== undefined ? (
        <Label y={60} size={26} fill={C.paper}>
          {countdown}
        </Label>
      ) : null}
    </g>
  );
}

export function StrayGlyph({ tier }: { tier?: number | undefined }) {
  const body = 'M50 26 C72 26 84 38 84 58 C84 76 70 86 50 86 C30 86 16 76 16 58 C16 38 28 26 50 26 Z';
  return (
    <g>
      <polygon points="24,36 30,8 44,30" transform={`translate(${SX} ${SY})`} fill={C.inkSoft} />
      <path d={body} transform={`translate(${SX} ${SY})`} fill={C.inkSoft} />
      <polygon points="24,36 30,8 44,30" fill={C.red} />
      <polygon points="56,30 70,8 76,36" fill={C.red} />
      <path d={body} fill={C.red} />
      <circle cx={39} cy={52} r={8} fill={C.paper} />
      <circle cx={61} cy={52} r={8} fill={C.paper} />
      <circle cx={42} cy={53} r={4} fill={C.ink} />
      <circle cx={64} cy={53} r={4} fill={C.ink} />
      {tier !== undefined ? (
        <Label y={73} size={17} fill={C.paper}>
          {2 ** tier}
        </Label>
      ) : null}
    </g>
  );
}

// ---- Layout & Spawn ---------------------------------------------------------------------------------------

export function SourceGlyph({ small = false }: { small?: boolean }) {
  const hex = (cx: number, cy: number, r: number) =>
    Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 3) * i + Math.PI / 6;
      return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
    }).join(' ');
  const g = (
    <g>
      <polygon points={hex(50, 64, 24)} transform={`translate(${SX} ${SY})`} fill={C.inkSoft} />
      <polygon points={hex(50, 64, 24)} fill={C.neon} />
      <polygon points={hex(50, 64, 11)} fill={C.ink} />
      <g fill={C.paper} opacity={0.95}>
        <circle cx={50} cy={28} r={11} />
        <circle cx={38} cy={33} r={7} />
        <circle cx={62} cy={31} r={8} />
      </g>
    </g>
  );
  return small ? <g transform="translate(4 52) scale(0.44)">{g}</g> : g;
}

export function PillarGlyph() {
  return (
    <g>
      <rect x={14 + SX} y={14 + SY} width={72} height={72} fill={C.inkSoft} />
      <rect x={14} y={14} width={72} height={72} fill={C.pillar} />
      <rect x={14} y={14} width={72} height={9} fill={C.pillarLight} />
      {[24, 38, 52, 66].map((x) => (
        <rect key={x} x={x} y={27} width={4} height={55} fill={C.pillarLight} opacity={0.75} />
      ))}
    </g>
  );
}

export function VoidGlyph() {
  return (
    <g>
      <rect x={10} y={10} width={80} height={80} fill={C.khaki} />
      <polygon points="30,10 58,10 50,34 66,52 48,70 56,90 26,90 34,70 20,50 36,32" fill={C.ink} />
      {[0, 1, 2, 3].map((i) => (
        <polygon key={i} points={`${34 + i * 6},${22 + i * 16} ${40 + i * 6},${22 + i * 16} ${34 + i * 6},${30 + i * 16} ${28 + i * 6},${30 + i * 16}`} fill={C.paper} opacity={0.12} />
      ))}
    </g>
  );
}

export function FenceGlyph() {
  return (
    <g>
      <rect x={8} y={20} width={34} height={60} fill={C.khaki} />
      <rect x={58} y={20} width={34} height={60} fill={C.khaki} />
      <rect x={44 + SX * 0.6} y={10 + SY * 0.6} width={12} height={80} fill={C.inkSoft} />
      <rect x={44} y={10} width={12} height={80} fill={C.ink} />
      {[22, 38, 54, 70].map((y) => (
        <circle key={y} cx={50} cy={y} r={2.4} fill={C.paper} opacity={0.75} />
      ))}
    </g>
  );
}

export function EraseGlyph() {
  return (
    <g transform="rotate(-32 50 50)">
      <rect x={16 + SX} y={34 + SY} width={68} height={32} fill={C.inkSoft} />
      <rect x={16} y={34} width={68} height={32} fill={C.pink} />
      <rect x={16} y={34} width={24} height={32} fill={C.paper} />
      <rect x={16} y={60} width={68} height={6} fill="#c98fb8" />
    </g>
  );
}

export function LineGlyph() {
  return (
    <g>
      <rect x={4} y={42} width={92} height={16} fill={C.neon} />
      <rect x={4} y={47} width={92} height={6} fill={C.paper} />
      <BlobGlyph blob={{ tier: 3 }} scale={0.62} showNumber={false} />
    </g>
  );
}

export function BurstGlyph() {
  const star = (r1: number, r2: number, n = 10) =>
    Array.from({ length: n * 2 }, (_, i) => {
      const a = (Math.PI / n) * i - Math.PI / 2;
      const r = i % 2 ? r2 : r1;
      return `${(50 + r * Math.cos(a)).toFixed(1)},${(50 + r * Math.sin(a)).toFixed(1)}`;
    }).join(' ');
  return (
    <g>
      <polygon points={star(44, 24)} transform={`translate(${SX} ${SY})`} fill={C.inkSoft} />
      <polygon points={star(44, 24)} fill="#f0a62a" />
      <polygon points={star(26, 14)} fill={C.gold} />
      <circle cx={50} cy={50} r={9} fill={C.paper} />
    </g>
  );
}

// ---- Zusammengesetzt -------------------------------------------------------------------------------------

/** Glyphe eines Werkzeugs mit seinen Parametern (Palette, Dock, Menüs). */
export function ToolGlyph({ tool, params }: { tool: ToolId; params?: ToolParams }) {
  const tier = params?.tier ?? 2;
  const blob: BlobDef = { tier };
  if (params && params.material !== 'zone') blob.material = params.material;
  switch (tool) {
    case 'void':
      return <VoidGlyph />;
    case 'pillar':
      return <PillarGlyph />;
    case 'fence':
      return <FenceGlyph />;
    case 'scrap':
      return <ScrapGlyph layers={params?.scrapLayers ?? 2} />;
    case 'scrapMound':
      return <MoundGlyph layers={params?.moundLayers ?? 4} />;
    case 'crust':
      return (
        <g>
          <BlobGlyph blob={blob} />
          <CrustOverlay />
        </g>
      );
    case 'sleeper':
      return (
        <g>
          <BlobGlyph blob={blob} />
          <SleeperOverlay />
        </g>
      );
    case 'cage':
      return (
        <g>
          <BlobGlyph blob={blob} scale={0.8} />
          <CageOverlay layers={params?.cageLayers ?? 1} />
        </g>
      );
    case 'fog':
      return (
        <g>
          {params?.withContent === false ? null : <BlobGlyph blob={blob} scale={0.7} dim />}
          <FogOverlay hasContent={params?.withContent !== false} />
        </g>
      );
    case 'oil':
      return <OilPuddle />;
    case 'current':
      return <CurrentOrnament dir={params?.dir ?? 'right'} />;
    case 'withered':
    case 'deepWithered':
      return (
        <g>
          <rect x={12 + SX} y={12 + SY} width={76} height={76} fill={C.inkSoft} />
          <rect x={12} y={12} width={76} height={76} fill={tool === 'deepWithered' ? C.deep : C.withered} />
          <g transform="translate(12 12) scale(0.76)">
            <CracksOrnament deep={tool === 'deepWithered'} />
          </g>
        </g>
      );
    case 'spore':
      return <SporeOrnament />;
    case 'portal':
      return <PortalRing id="a" />;
    case 'rot':
      return <RotGlyph />;
    case 'toxic':
      return <ToxicGlyph countdown={params?.countdown} />;
    case 'stray':
      return <StrayGlyph tier={params?.tier} />;
    case 'blob':
      return <BlobGlyph blob={blob} />;
    case 'source':
      return <SourceGlyph />;
    case 'amoeba':
      return <BlobGlyph blob={{ tier: 1, kind: 'amoeba' }} />;
    case 'erase':
      return <EraseGlyph />;
  }
}

export function ToolIcon({ tool, params, size = 40 }: { tool: ToolId; params?: ToolParams | undefined; size?: number }) {
  return (
    <svg className="ed-icon" viewBox="-8 -4 112 108" width={size} height={size} aria-hidden="true" focusable="false">
      <ToolGlyph tool={tool} {...(params ? { params } : {})} />
    </svg>
  );
}

/** Elementart (wie `countElementKinds`) → Glyphe, für die Level-Kette. */
export function KindGlyph({ kind }: { kind: string }) {
  switch (kind) {
    case 'pillar':
    case 'fence':
    case 'scrap':
    case 'scrapMound':
    case 'crust':
    case 'sleeper':
    case 'cage':
    case 'fog':
    case 'oil':
    case 'current':
    case 'withered':
    case 'deepWithered':
    case 'spore':
    case 'portal':
    case 'rot':
    case 'toxic':
    case 'stray':
    case 'amoeba':
      return <ToolGlyph tool={kind} />;
    case 'line':
      return <LineGlyph />;
    case 'burst':
      return <BurstGlyph />;
    default:
      return <BlobGlyph blob={{ tier: 2 }} />;
  }
}

export function KindIcon({ kind, size = 20 }: { kind: string; size?: number }) {
  return (
    <svg className="ed-icon" viewBox="-8 -4 112 108" width={size} height={size} aria-hidden="true" focusable="false">
      <KindGlyph kind={kind} />
    </svg>
  );
}

// ---- UI-Symbole (gefüllt, keine Striche) --------------------------------------------------------------

export type UiIconName = 'undo' | 'redo' | 'save' | 'play' | 'edit' | 'rewind' | 'restart' | 'next' | 'close' | 'back' | 'chevron' | 'eyedrop' | 'trash' | 'copy' | 'download' | 'share' | 'plus' | 'zoom' | 'check' | 'cross' | 'bot' | 'numbers';

/** Kleine UI-Symbole als gefüllte Polygone (24er-Box). */
export function UiIcon({ name, size = 22 }: { name: UiIconName; size?: number }) {
  let body: ReactNode;
  switch (name) {
    case 'undo':
      body = <path d="M9 4 L2 10 L9 16 L9 12 C14 12 18 13 20 19 C21 12 17 8 9 8 Z" />;
      break;
    case 'redo':
      body = <path d="M15 4 L22 10 L15 16 L15 12 C10 12 6 13 4 19 C3 12 7 8 15 8 Z" />;
      break;
    case 'save':
      body = (
        <path
          fillRule="evenodd"
          d="M3 3 H17 L21 7 V21 H3 Z M7 5 V9 H15 V5 Z M7 13 V19 H17 V13 Z"
        />
      );
      break;
    case 'play':
      body = <path d="M6 3 L20 12 L6 21 Z" />;
      break;
    case 'edit':
      body = <path d="M3 17 L14 6 L18 10 L7 21 H3 Z M15.5 4.5 L17.5 2.5 L21.5 6.5 L19.5 8.5 Z" />;
      break;
    case 'rewind':
      body = <path d="M11 5 V19 L2 12 Z M21 5 V19 L12 12 Z" />;
      break;
    case 'restart':
      body = <path d="M12 3 C7 3 3 7 3 12 H0 L5 18 L10 12 H7 C7 9 9 7 12 7 C15 7 17 9 17 12 C17 15 15 17 12 17 V21 C17 21 21 17 21 12 C21 7 17 3 12 3 Z" />;
      break;
    case 'next':
      body = <path d="M3 5 L12 12 L3 19 Z M12 5 L21 12 L12 19 Z" />;
      break;
    case 'close':
    case 'cross':
      body = <path d="M5 3 L12 10 L19 3 L21 5 L14 12 L21 19 L19 21 L12 14 L5 21 L3 19 L10 12 L3 5 Z" />;
      break;
    case 'back':
      body = <path d="M16 3 L7 12 L16 21 L18 19 L11 12 L18 5 Z" />;
      break;
    case 'chevron':
      body = <path d="M4 9 L12 17 L20 9 L18 7 L12 13 L6 7 Z" />;
      break;
    case 'eyedrop':
      body = <path d="M17 2 L22 7 L19 10 L20 11 L18 13 L11 6 L13 4 L14 5 Z M10 7 L17 14 L8 23 L4 23 L4 19 L1 20 L2 17 Z" />;
      break;
    case 'trash':
      body = <path d="M8 2 H16 V4 H21 V7 H3 V4 H8 Z M5 8 H19 L18 22 H6 Z" />;
      break;
    case 'copy':
      body = <path fillRule="evenodd" d="M7 2 H21 V16 H17 V20 H3 V6 H7 Z M9 4 V14 H19 V4 Z" />;
      break;
    case 'download':
      body = <path d="M10 2 H14 V11 H18 L12 17 L6 11 H10 Z M3 19 H21 V22 H3 Z" />;
      break;
    case 'share':
      body = <path d="M12 1 L18 7 H14 V15 H10 V7 H6 Z M3 11 H7 V19 H17 V11 H21 V22 H3 Z" />;
      break;
    case 'plus':
      body = <path d="M10 3 H14 V10 H21 V14 H14 V21 H10 V14 H3 V10 H10 Z" />;
      break;
    case 'zoom':
      body = <path d="M3 3 H10 V6 H6 V10 H3 Z M14 3 H21 V10 H18 V6 H14 Z M3 14 H6 V18 H10 V21 H3 Z M18 14 H21 V21 H14 V18 H18 Z" />;
      break;
    case 'check':
      body = <path d="M2 12 L5 9 L9 13 L19 3 L22 6 L9 19 Z" />;
      break;
    case 'bot':
      body = <path fillRule="evenodd" d="M11 1 H13 V4 H19 V20 H5 V4 H11 Z M8 8 V12 H11 V8 Z M13 8 V12 H16 V8 Z M8 15 V17 H16 V15 Z M1 9 H4 V15 H1 Z M20 9 H23 V15 H20 Z" />;
      break;
    case 'numbers':
      body = <path fillRule="evenodd" d="M2 4 H10 V20 H2 Z M5 7 V17 H7 V7 Z M14 4 H22 V12 H17 V17 H22 V20 H14 V9 H19 V7 H14 Z" />;
      break;
  }
  return (
    <svg className="ed-ui-icon" viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false" fill="currentColor">
      {body}
    </svg>
  );
}
