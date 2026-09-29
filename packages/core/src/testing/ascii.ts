/**
 * ASCII boards for tests, tools and the level editor's debug view.
 *
 * `levelFromAscii(board, options)` builds a validated `LevelDef` from a
 * whitespace-separated token grid. Tokens per cell:
 *
 *   .          empty cell            #   void ("Riss")         P   pillar
 *   X1..X3     scrap (layers)        M4..M8 / m  2×2 scrap mound (top-left / other cells)
 *   R<n>       rot (period n)        T<n> toxic (countdown)    H   empty fog cell
 *   <tier>     blob, e.g. 3          A   amoeba (tier 1)
 *
 * Blob modifiers (append to the tier): j jelly, l liquid, g gas, r fire (default: zone material);
 *   F frozen (crust), S sleeper, C caged (C2 = 2 layers), H hidden (fog),
 *   L line (row axis), V line (column axis), B burst, W stray.
 *
 * A floor can be attached with '/': `2/w` = tier 2 on a withered cell.
 *   o oil, w withered, d deep withered, s spore, ^ v < > current, @a..@z portal ids.
 *
 * `asciiTiers(state)` prints the board back: tiers with modifiers, `.` empty,
 * `#`, `P`, `X<n>` scrap, `M<n>` mound cells, `R<n>` rot, `H` fog.
 */

import type { Board, Coord } from '../model';
import {
  CELL_OPEN,
  CELL_PILLAR,
  F_AXIS_V,
  F_CAGED,
  F_FROZEN,
  F_HIDDEN,
  F_SLEEPER,
  KIND_AMOEBA,
  KIND_BURST,
  KIND_LINE,
  KIND_STRAY,
  MAT_FIRE,
  MAT_GAS,
  MAT_LIQUID,
  kindOf,
  materialOf,
} from '../model';
import { LevelSchema, type LevelDef, type LevelInput } from '../schema/level';

type Floor = NonNullable<LevelInput['floors']>[number];
type Blocker = NonNullable<LevelInput['blockers']>[number];
type Threat = NonNullable<LevelInput['threats']>[number];
type Start = NonNullable<LevelInput['start']>[number];
type BlobDef = Start['blob'];

export interface AsciiOptions {
  id?: string;
  zone?: LevelDef['zone'];
  moves?: number;
  cap?: number;
  goals?: LevelInput['goals'];
  lineAt?: number;
  burstAt?: number;
  spawn?: Partial<LevelInput['spawn']>;
  fences?: LevelInput['fences'];
  floors?: Floor[];
  /** Extra start blobs / blockers / threats not expressible in the grid. */
  start?: Start[];
  blockers?: Blocker[];
  threats?: Threat[];
}

const MAT_LETTER: Record<string, 'jelly' | 'liquid' | 'gas' | 'fire'> = {
  j: 'jelly',
  l: 'liquid',
  g: 'gas',
  r: 'fire',
};

function parseFloor(tok: string, at: Coord): Floor {
  switch (tok) {
    case 'o':
      return { kind: 'oil', at };
    case 'w':
      return { kind: 'withered', at };
    case 'd':
      return { kind: 'deepWithered', at };
    case 's':
      return { kind: 'spore', at };
    case '^':
      return { kind: 'current', at, dir: 'up' };
    case 'v':
      return { kind: 'current', at, dir: 'down' };
    case '<':
      return { kind: 'current', at, dir: 'left' };
    case '>':
      return { kind: 'current', at, dir: 'right' };
    default:
      if (tok.startsWith('@') && tok.length === 2)
        return { kind: 'portal', at, portalId: tok.slice(1) };
      throw new Error(`unknown floor token '${tok}'`);
  }
}

export function levelFromAscii(board: string, opts: AsciiOptions = {}): LevelDef {
  const rows = board
    .split('\n')
    .map((r) => r.trim())
    .filter((r) => r.length > 0)
    .map((r) => r.split(/\s+/));
  const w = rows[0]?.length ?? 0;
  const mask: string[] = [];
  const start: Start[] = [...(opts.start ?? [])];
  const blockers: Blocker[] = [...(opts.blockers ?? [])];
  const threats: Threat[] = [...(opts.threats ?? [])];
  const floors: Floor[] = [...(opts.floors ?? [])];

  rows.forEach((row, y) => {
    if (row.length !== w) throw new Error(`row ${y} has ${row.length} tokens, expected ${w}`);
    let maskRow = '';
    row.forEach((tok0, x) => {
      const at: Coord = [x, y];
      let tok = tok0;
      const slash = tok.indexOf('/');
      if (slash >= 0) {
        floors.push(parseFloor(tok.slice(slash + 1), at));
        tok = tok.slice(0, slash);
      }
      if (tok === '#') {
        maskRow += '#';
        return;
      }
      if (tok === 'P') {
        maskRow += 'P';
        return;
      }
      maskRow += '.';
      if (tok === '.' || tok === 'm') return;
      if (/^[owds^v<>@]/.test(tok)) {
        floors.push(parseFloor(tok, at));
        return;
      }
      let m: RegExpMatchArray | null;
      if ((m = /^X([1-3])$/.exec(tok))) {
        blockers.push({ kind: 'scrap', at, layers: Number(m[1]) });
        return;
      }
      if ((m = /^M([4-8])$/.exec(tok))) {
        blockers.push({ kind: 'scrapMound', at, size: [2, 2], layers: Number(m[1]) });
        return;
      }
      if ((m = /^R([1-9])$/.exec(tok))) {
        threats.push({ kind: 'rot', at, period: Number(m[1]) });
        return;
      }
      if ((m = /^T([1-9][0-9]?)$/.exec(tok))) {
        threats.push({ kind: 'toxic', at, countdown: Number(m[1]) });
        return;
      }
      if (tok === 'H') {
        blockers.push({ kind: 'fog', at });
        return;
      }
      // blob token
      m = /^(A|\d{1,2})([jlgr]?)(F|S|C[1-3]?|H|L|V|B|W)?$/.exec(tok);
      if (!m) throw new Error(`unknown token '${tok0}' at [${x},${y}]`);
      const blob: BlobDef = { tier: m[1] === 'A' ? 1 : Number(m[1]) };
      if (m[1] === 'A') blob.kind = 'amoeba';
      if (m[2]) blob.material = MAT_LETTER[m[2]]!;
      const mod = m[3] ?? '';
      if (mod === 'W') {
        threats.push({ kind: 'stray', at, tier: blob.tier });
        return;
      }
      if (mod === 'F') {
        blockers.push({ kind: 'crust', at, content: blob });
        return;
      }
      if (mod === 'S') {
        blockers.push({ kind: 'sleeper', at, content: blob });
        return;
      }
      if (mod.startsWith('C')) {
        const layers = mod.length > 1 ? Number(mod.slice(1)) : 1;
        blockers.push({ kind: 'cage', at, content: blob, layers });
        return;
      }
      if (mod === 'H') {
        blockers.push({ kind: 'fog', at, content: blob });
        return;
      }
      if (mod === 'L' || mod === 'V' || mod === 'B') {
        // Specials cannot be authored in level files; tests create them via `withSpecial`.
        start.push({ at, blob });
        pendingSpecials.push({ at, kind: mod === 'B' ? 'burst' : 'line', axisV: mod === 'V' });
        return;
      }
      start.push({ at, blob });
    });
    mask.push(maskRow);
  });

  // The schema wants at least 3×3; pad small test boards with void cells (coordinates stay).
  const padW = Math.max(w, 3);
  const paddedMask = mask.map((r) => r.padEnd(padW, '#'));
  while (paddedMask.length < 3) paddedMask.push('#'.repeat(padW));

  const goals: LevelInput['goals'] = opts.goals ?? [{ type: 'reachTier', tier: 12 }];
  const cap = opts.cap ?? 12;
  const input: LevelInput = {
    schemaVersion: 1,
    id: opts.id ?? 'test',
    zone: opts.zone ?? 'tjorizo',
    grid: { w: padW, h: paddedMask.length, mask: paddedMask },
    fences: opts.fences ?? [],
    floors,
    blockers,
    threats,
    start,
    spawn: {
      sources: [],
      table: [{ tier: 1, weight: 1 }],
      preview: true,
      fallback: 'anyEmpty',
      ...opts.spawn,
    },
    goals,
    moves: opts.moves ?? 30,
    cap,
    specials: { lineAt: opts.lineAt ?? 16, burstAt: opts.burstAt ?? 16 },
    difficulty: { targetAttempts: [1, 1.1] },
  };
  return LevelSchema.parse(input);
}

/** Specials requested through L/V/B tokens; applied by `applySpecialTokens` after createState. */
const pendingSpecials: { at: Coord; kind: 'line' | 'burst'; axisV: boolean }[] = [];

/**
 * Applies special-piece tokens (L/V/B) from the most recent `levelFromAscii`
 * call to a freshly created board (mutates it; use on the initial state only).
 */
export function applySpecialTokens(b: Board): void {
  for (const s of pendingSpecials) {
    const i = s.at[1] * b.geo.w + s.at[0];
    if (b.tiers[i] === 0) continue;
    const kind = s.kind === 'burst' ? KIND_BURST : KIND_LINE;
    let f = (b.flags[i]! & ~(0b111 << 2)) | (kind << 2);
    if (s.axisV) f |= F_AXIS_V;
    b.flags[i] = f;
  }
  pendingSpecials.length = 0;
}

/** Renders the board as tokens (one row per line), see module doc. */
export function asciiTiers(b: Board): string {
  const { w, h, cellType } = b.geo;
  const lines: string[] = [];
  for (let y = 0; y < h; y++) {
    const row: string[] = [];
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const ct = cellType[i]!;
      if (ct === CELL_PILLAR) {
        row.push('P');
        continue;
      }
      if (ct !== CELL_OPEN) {
        row.push('#');
        continue;
      }
      if (b.scrap[i]! > 0) {
        row.push(`X${b.scrap[i]}`);
        continue;
      }
      if (b.mound[i]! >= 0) {
        row.push(`M${b.moundLayers[b.mound[i]!]}`);
        continue;
      }
      if (b.rot[i]! > 0) {
        row.push(`R${b.rot[i]}`);
        continue;
      }
      const t = b.tiers[i]!;
      if (t === 0) {
        row.push(b.fog[i]! > 0 ? 'H' : '.');
        continue;
      }
      const f = b.flags[i]!;
      let tok = kindOf(f) === KIND_AMOEBA ? 'A' : String(t);
      const mat = materialOf(f);
      if (mat === MAT_LIQUID) tok += 'l';
      else if (mat === MAT_GAS) tok += 'g';
      else if (mat === MAT_FIRE) tok += 'r';
      if (f & F_FROZEN) tok += 'F';
      else if (f & F_SLEEPER) tok += 'S';
      else if (f & F_CAGED) tok += b.cage[i]! > 1 ? `C${b.cage[i]}` : 'C';
      else if (f & F_HIDDEN) tok += 'H';
      else if (kindOf(f) === KIND_LINE) tok += f & F_AXIS_V ? 'V' : 'L';
      else if (kindOf(f) === KIND_BURST) tok += 'B';
      else if (kindOf(f) === KIND_STRAY) tok += 'W';
      row.push(tok);
    }
    lines.push(row.join(' '));
  }
  return lines.join('\n');
}

/** Normalises an expected-board string for comparison with `asciiTiers`. */
export function normalizeAscii(s: string): string {
  return s
    .split('\n')
    .map((r) => r.trim().split(/\s+/).join(' '))
    .filter((r) => r.length > 0)
    .join('\n');
}

/**
 * Normalises an expected board and applies the same 3×3 void padding that
 * `levelFromAscii` applies, so small boards compare 1:1 with `asciiTiers`.
 */
export function expectedAscii(s: string): string {
  const rows = normalizeAscii(s)
    .split('\n')
    .map((r) => r.split(' '));
  const w = Math.max(rows[0]?.length ?? 0, 3);
  for (const r of rows) while (r.length < w) r.push('#');
  while (rows.length < 3) rows.push(new Array<string>(w).fill('#'));
  return rows.map((r) => r.join(' ')).join('\n');
}
