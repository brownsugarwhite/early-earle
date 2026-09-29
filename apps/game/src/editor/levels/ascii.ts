import { SPECIAL_OFF } from '@ee/core';
import { GOAL_LABEL, MATERIAL_LABEL, STYLE_LABEL, ZONE_LABEL, cellKey, goalText, moundCells, type BlobDef, type FloorDef, type LevelDraft } from './draft';

/**
 * ASCII-Ansicht eines Entwurfs im Token-Format von `levelFromAscii` (packages/core/src/testing/ascii.ts):
 * damit lässt sich ein Brett aus dem Bericht direkt in einen Test übernehmen.
 */

const MAT_LETTER = { jelly: 'j', liquid: 'l', gas: 'g', fire: 'r' } as const;

function blobToken(b: BlobDef): string {
  const base = b.kind === 'amoeba' ? 'A' : String(b.tier);
  return base + (b.material ? MAT_LETTER[b.material] : '');
}

function floorSuffix(f: FloorDef): string {
  switch (f.kind) {
    case 'oil':
      return '/o';
    case 'withered':
      return '/w';
    case 'deepWithered':
      return '/d';
    case 'spore':
      return '/s';
    case 'current':
      return f.dir === 'up' ? '/^' : f.dir === 'down' ? '/v' : f.dir === 'left' ? '/<' : '/>';
    case 'portal':
      return `/@${f.portalId}`;
  }
}

export function draftToAscii(d: LevelDraft): string {
  const { w, h, mask } = d.grid;
  const tokens: string[][] = [];
  const startAt = new Map(d.start.map((s) => [cellKey(s.at), s.blob] as const));
  const floorAt = new Map(d.floors.map((f) => [cellKey(f.at), f] as const));
  const threatAt = new Map(d.threats.map((t) => [cellKey(t.at), t] as const));
  const blockerAt = new Map<string, { b: LevelDraft['blockers'][number]; part: boolean }>();
  for (const b of d.blockers) {
    if (b.kind === 'scrapMound') moundCells(b.at).forEach((c, i) => blockerAt.set(cellKey(c), { b, part: i > 0 }));
    else blockerAt.set(cellKey(b.at), { b, part: false });
  }
  for (let y = 0; y < h; y++) {
    const row: string[] = [];
    for (let x = 0; x < w; x++) {
      const key = cellKey([x, y]);
      const ch = mask[y]?.charAt(x) ?? '.';
      if (ch === '#' || ch === 'P') {
        row.push(ch);
        continue;
      }
      let tok = '.';
      const blk = blockerAt.get(key);
      const start = startAt.get(key);
      const threat = threatAt.get(key);
      if (blk) {
        const b = blk.b;
        if (b.kind === 'scrap') tok = `X${b.layers}`;
        else if (b.kind === 'scrapMound') tok = blk.part ? 'm' : `M${b.layers}`;
        else {
          const content = b.content ?? start;
          if (b.kind === 'crust') tok = content ? `${blobToken(content)}F` : '?F';
          else if (b.kind === 'sleeper') tok = content ? `${blobToken(content)}S` : '?S';
          else if (b.kind === 'cage') tok = `${blobToken(b.content)}C${b.layers > 1 ? b.layers : ''}`;
          else tok = content ? `${blobToken(content)}H` : 'H';
        }
      } else if (threat) {
        tok = threat.kind === 'rot' ? `R${threat.period}` : threat.kind === 'toxic' ? `T${threat.countdown}` : `${threat.tier}W`;
      } else if (start) tok = blobToken(start);
      const floor = floorAt.get(key);
      if (floor) tok += floorSuffix(floor);
      row.push(tok);
    }
    tokens.push(row);
  }
  const widths = Array.from({ length: w }, (_, x) => Math.max(...tokens.map((r) => r[x]?.length ?? 1)));
  return tokens.map((r) => r.map((t, x) => t.padEnd(widths[x] ?? 1)).join(' ').trimEnd()).join('\n');
}

/** Kopf- und Fußzeilen für Berichte: Ziele, Züge, Kappe, Spezialteile, Spawn, Zäune, Band. */
export function draftSummary(d: LevelDraft): string {
  const lines: string[] = [];
  lines.push(`${d.id}${d.name ? ` · ${d.name}` : ''} · ${ZONE_LABEL[d.zone]} · ${d.grid.w}×${d.grid.h}`);
  lines.push(`Ziele: ${d.goals.map(goalText).join(' · ')}`);
  const specials = [d.specials.lineAt < SPECIAL_OFF ? `Strahl ab ${d.specials.lineAt}` : null, d.specials.burstAt < SPECIAL_OFF ? `Knall ab ${d.specials.burstAt}` : null].filter(Boolean);
  lines.push(`Züge: ${d.moves >= 99 ? 'frei' : d.moves} · Kappe: ${d.cap}${specials.length ? ` · ${specials.join(' · ')}` : ''}`);
  const total = d.spawn.table.reduce((s, t) => s + t.weight, 0);
  const table = d.spawn.table.map((t) => `${t.kind === 'amoeba' ? 'A' : 2 ** t.tier} ${Math.round((100 * t.weight) / total)} %`).join(', ');
  lines.push(`Spawn: ${table} · Quellen: ${d.spawn.sources.length ? d.spawn.sources.map((s) => `[${s[0]},${s[1]}]`).join(' ') : 'keine'} · Fallback: ${d.spawn.fallback === 'anyEmpty' ? 'überall' : 'keiner'}`);
  if (d.fences.length) lines.push(`Zäune: ${d.fences.map((f) => `[${f.a[0]},${f.a[1]}]–[${f.b[0]},${f.b[1]}]`).join(' ')}`);
  const [lo, hi] = d.difficulty.targetAttempts;
  lines.push(`Band: ${lo}–${hi} Versuche${d.difficulty.style ? ` · ${STYLE_LABEL[d.difficulty.style]}` : ''}`);
  return lines.join('\n');
}

export const LEGEND = [
  ['.', 'freie Zelle'],
  ['#', 'Riss'],
  ['P', 'Pfeiler'],
  ['2 / 2l', 'Blob Stufe 2 (l flüssig, g Gas, r Feuer, j Jelly)'],
  ['A', 'Amöbe'],
  ['X2', 'Schrott, 2 Lagen'],
  ['M4 / m', 'Schrottberg 2×2 (links oben) / weitere Zellen'],
  ['3F', 'Kruste um Stufe 3'],
  ['3S', 'Schläfer'],
  ['2C2', 'Käfig mit 2 Lagen'],
  ['H / 2H', 'Nebel (leer / mit Blob)'],
  ['R3', 'Fäulnis, Periode 3'],
  ['T5', 'Giftwolke, Countdown 5'],
  ['1W', 'Streuner Stufe 1'],
  ['/o /w /d /s', 'Boden: Öl, verdorrt, tief verdorrt, Spore'],
  ['/^ /v /< />', 'Gasstrom'],
  ['/@a', 'Rohr a'],
] as const;

export { GOAL_LABEL, MATERIAL_LABEL };
