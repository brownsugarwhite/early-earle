import type { Json, MapKind } from './mapContent';
import { isHex } from './mapContent';

const pick = (arr: unknown, i: number, fallback: string): string => {
  if (!Array.isArray(arr) || arr.length === 0) return fallback;
  const v = arr[Math.max(0, Math.min(arr.length - 1, i))];
  return isHex(v) ? v : fallback;
};
const one = (v: unknown, fallback: string): string => (isHex(v) ? v : fallback);

/** The poster's single accent (Earle's red barn / pink tower): the most colourful entry (largest chroma). */
function strongest(list: unknown, fallback: string): string {
  if (!Array.isArray(list)) return fallback;
  let best = fallback;
  let bestChroma = -1;
  for (const v of list) {
    if (!isHex(v)) continue;
    const n = parseInt(v.slice(1), 16);
    const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    const chroma = Math.max(...rgb) - Math.min(...rgb);
    if (chroma > bestChroma) {
      bestChroma = chroma;
      best = v;
    }
  }
  return best;
}

/** Dome tree: ink trunk, a flat dome, light dots only on the sun side (right) — Earle, no outlines. */
function Tree({ x, y, s, dome, dots, ink }: { x: number; y: number; s: number; dome: string; dots: string[]; ink: string }) {
  const r = 16 * s;
  const pts: Array<[number, number]> = [
    [0.55, -0.55],
    [0.75, -0.2],
    [0.35, -0.8],
    [0.85, 0.1],
    [0.1, -0.9],
    [0.6, 0.15],
    [0.45, -0.25],
  ];
  return (
    <g>
      <rect x={x - 1.2 * s} y={y - 4} width={2.4 * s} height={26 * s} fill={ink} />
      <path d={`M${x - r} ${y} a${r} ${r * 0.95} 0 0 1 ${2 * r} 0 z`} fill={dome} />
      {pts.map(([px, py], i) => (
        <circle key={i} cx={x + px * r * 0.95} cy={y + py * r * 0.85} r={1.5 * s} fill={dots[i % dots.length]} />
      ))}
    </g>
  );
}

/**
 * A flat serigraph poster of a world's or zone's palette (sky bands, sun, hills in terrain steps, fog stripes,
 * dome trees with sun-side dots, ink ground): every colour change is visible at once, without the 3D scene.
 */
export function Poster({ kind, json }: { kind: MapKind; json: Json }) {
  const p = (json.palette ?? {}) as Record<string, unknown>;
  const world = kind === 'welt';
  const ink = one(p.ink, '#0f1c22');
  const sky: string[] = world ? (Array.isArray(p.sky) ? (p.sky as unknown[]).filter(isHex) : []) : [pick(p.sky, 1, '#caf5e4'), pick(p.sky, 0, '#7ce6d5')];
  const skyBands = sky.length ? [...sky].reverse() : ['#1f5fb0', '#dcf5ee'];
  const terrain = world ? (p.terrain as unknown[]) : [p.terrainDark, p.terrainDark, p.terrainLight, p.terrainLight, p.terrainLight];
  const t = (i: number) => pick(terrain, i, '#606e4f');
  const canopy = world ? (p.canopy as unknown[]) : [ink, ink, ink, ...((p.accents as unknown[]) ?? [])];
  const c = (i: number) => pick(canopy, i, '#242c0b');
  const dotColors = world ? [c(3), c(4), c(4)] : [pick(p.accents, 0, '#c8542a'), pick(p.accents, 1, '#22baa9')];
  const fog = world ? (p.fog as unknown[]) : null;
  const fogAlpha = world && Array.isArray(p.fogAlpha) ? (p.fogAlpha as number[]) : [];
  const sun = world ? one(p.sun, '#f7f6d8') : '#f7f6d8';
  const sunRing = world ? one(p.sunRing, sun) : pick(p.sky, 1, '#caf5e4');
  const accent = strongest(world ? p.accent : p.accents, '#c8542a');
  const skyH = 118;
  const bandH = skyH / skyBands.length;

  return (
    <svg className="map-poster" viewBox="0 0 360 200" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Vorschau der Palette" data-testid="map-poster">
      {skyBands.map((col, i) => (
        <rect key={i} x={0} y={i * bandH} width={360} height={bandH + 0.5} fill={col} />
      ))}
      <circle cx={276} cy={58} r={27} fill={sunRing} />
      <circle cx={276} cy={58} r={19} fill={sun} />
      <path d="M0 122 C 50 100, 95 104, 140 116 C 190 98, 250 96, 300 110 C 325 104, 345 104, 360 108 V200 H0 Z" fill={t(4)} />
      {fog ? <rect x={0} y={110} width={360} height={7} fill={pick(fog, 4, t(4))} opacity={fogAlpha[4] ?? 0.8} /> : null}
      <path d="M0 140 C 60 118, 110 122, 170 136 C 220 122, 290 120, 360 132 V200 H0 Z" fill={t(3)} />
      {fog ? <rect x={0} y={130} width={360} height={5} fill={pick(fog, 3, t(3))} opacity={fogAlpha[3] ?? 0.6} /> : null}
      <path d="M0 156 C 70 138, 140 142, 200 154 C 250 142, 310 140, 360 150 V200 H0 Z" fill={t(2)} />
      <Tree x={70} y={136} s={0.8} dome={c(1)} dots={dotColors} ink={ink} />
      <Tree x={112} y={140} s={1} dome={c(0)} dots={dotColors} ink={ink} />
      <Tree x={236} y={140} s={0.9} dome={c(2)} dots={dotColors} ink={ink} />
      {/* One accent (the red barn / pink tower of the reference): a small gabled block. */}
      <path d="M290 150 h26 v-13 l-13 -10 l-13 10 z" fill={accent} />
      <path d="M0 176 C 80 160, 170 162, 240 172 C 290 164, 330 164, 360 170 V200 H0 Z" fill={t(1)} />
      {/* Long shadow in the sun direction (sun right → shadow falls left). */}
      <path d="M150 176 C 120 178, 60 182, 10 186 L 10 190 C 70 188, 130 184, 162 180 Z" fill={t(0)} />
      <Tree x={168} y={166} s={1.35} dome={c(0)} dots={dotColors} ink={ink} />
      <rect x={0} y={190} width={360} height={10} fill={ink} />
    </svg>
  );
}
