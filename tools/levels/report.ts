/**
 * Kurvenbericht für Florian und Nicole: Soll-Band gegen gemessene Versuche je Level.
 *
 *   pnpm --filter @ee/tools-levels report [--png]
 *
 * Liest `content/levels/_calibration.json` und die Kurve (`curveSpec`), schreibt
 *   docs/progress/level-kurve-184.svg  (Band je Level, Ist-Punkt nach Typgruppe, Zonengrenzen)
 *   docs/progress/level-kurve-184.md   (Tabelle je Zone: Typen, Soll, Ist, Abweichungen)
 *   docs/progress/level-kurve-184.png  (mit --png, über Playwright aus apps/game)
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  curveSpecs,
  generateLevel,
  goalLabel,
  LAST_LEVEL,
  LEGACY_LAST_LEVEL,
  levelSpec,
  spikeLevels,
  TUNING,
  validateCurve,
  ZONE_RANGES,
  ZONE_WORLDS,
  zoneSetOf,
  type CalibrationEntry,
  type CurveLevelInfo,
  type CurveSpec,
} from '@ee/core';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const calFile = resolve(root, 'content/levels/_calibration.json');
const outSvg = resolve(root, 'docs/progress/level-kurve-184.svg');
const outMd = resolve(root, 'docs/progress/level-kurve-184.md');
const outPng = resolve(root, 'docs/progress/level-kurve-184.png');

interface CalFile {
  generatedAt: string;
  solverVersion: string;
  seeds: number;
  levels: (CalibrationEntry & { name?: string })[];
}
const cal = JSON.parse(readFileSync(calFile, 'utf8')) as CalFile;
const byIndex = new Map(cal.levels.map((e) => [Number(e.file.replace('.json', '')), e] as const));
const curve = curveSpecs();

type Group = 'leicht' | 'normal' | 'spitze';
const groupOf = (c: CurveSpec): Group =>
  c.type === 'hard' || c.type === 'superhard' || c.type === 'boss'
    ? 'spitze'
    : c.type === 'normal' || c.type === 'combine'
      ? 'normal'
      : 'leicht';

// Referenzpalette (dataviz, Slots 1–3 validieren auch paarweise), Text in neutraler Tinte.
const COLOR: Record<Group, string> = { leicht: '#1baf7a', normal: '#2a78d6', spitze: '#eb6834' };
const INK = '#0b0b0b';
const INK2 = '#52514e';
const MUTED = '#8a8984';
const SURFACE = '#fcfcfb';
const BAND = '#dcdbd5';
const GRID = '#ecebe6';
const CRITICAL = '#c4262e';

const att = (i: number) => byIndex.get(i)?.bots.novice?.attemptsEst ?? null;
const strong = (i: number) => byIndex.get(i)?.bots.strong?.pWin ?? null;
const inBand = (c: CurveSpec) => {
  const a = att(c.index);
  return a !== null && a >= c.targetAttempts[0] - 1e-9 && a <= c.targetAttempts[1] + 1e-9;
};

// ---- SVG ------------------------------------------------------------------------------------

const W = 1600;
const H = 600;
const M = { l: 64, r: 24, t: 70, b: 92 };
const plotW = W - M.l - M.r;
const plotH = H - M.t - M.b;
const YMAX = 5.4;
const x = (i: number) => M.l + ((i - 0.5) / LAST_LEVEL) * plotW;
const y = (v: number) => M.t + plotH - ((Math.min(v, YMAX) - 1) / (YMAX - 1)) * plotH;
const step = plotW / LAST_LEVEL;
const f2 = (v: number) => v.toFixed(2).replace('.', ',');
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const parts: string[] = [];
parts.push(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="-apple-system, 'Helvetica Neue', Arial, sans-serif">`,
  `<title>Schwierigkeitskurve Level 1–184: Soll-Band und gemessene Versuche (Anfänger-Bot)</title>`,
  `<rect width="${W}" height="${H}" fill="${SURFACE}"/>`,
  `<text x="${M.l}" y="28" font-size="20" font-weight="600" fill="${INK}">Schwierigkeitskurve 184 Level — Versuche je Level (Anfänger-Bot)</text>`,
  `<text x="${M.l}" y="50" font-size="13" fill="${INK2}">Graues Band = Soll (curveSpec), Punkt = gemessen (1 / Gewinnrate). Kalibrierung ${esc(cal.generatedAt.slice(0, 10))}, Solver ${esc(cal.solverVersion)}, ≤ ${cal.seeds} Seeds.</text>`,
);
// Zonen: dezente Wechselflächen, Grenzen, Beschriftung
ZONE_RANGES.forEach(([a, b], z) => {
  const x0 = M.l + ((a - 1) / LAST_LEVEL) * plotW;
  const x1 = M.l + (b / LAST_LEVEL) * plotW;
  if (z % 2 === 1) parts.push(`<rect x="${x0}" y="${M.t}" width="${x1 - x0}" height="${plotH}" fill="#f4f3ef"/>`);
  parts.push(
    `<text x="${(x0 + x1) / 2}" y="${M.t - 8}" font-size="11" text-anchor="middle" fill="${INK2}">${z + 1} · ${ZONE_WORLDS[z]}</text>`,
  );
});
// Raster
for (const v of [1, 1.5, 2, 3, 4, 5]) {
  parts.push(
    `<line x1="${M.l}" x2="${W - M.r}" y1="${y(v)}" y2="${y(v)}" stroke="${GRID}" stroke-width="1"/>`,
    `<text x="${M.l - 8}" y="${y(v) + 4}" font-size="11" text-anchor="end" fill="${INK2}">${String(v).replace('.', ',')}</text>`,
  );
}
for (const [a] of ZONE_RANGES.slice(1)) {
  const xb = M.l + ((a - 1) / LAST_LEVEL) * plotW;
  parts.push(`<line x1="${xb}" x2="${xb}" y1="${M.t}" y2="${M.t + plotH}" stroke="${MUTED}" stroke-width="1" stroke-dasharray="2 3"/>`);
}
// eingefrorene Level 1–50
const xL = M.l + (LEGACY_LAST_LEVEL / LAST_LEVEL) * plotW;
parts.push(
  `<line x1="${xL}" x2="${xL}" y1="${M.t}" y2="${M.t + plotH}" stroke="${INK2}" stroke-width="1.5"/>`,
  `<text x="${xL - 6}" y="${M.t + 16}" font-size="11" text-anchor="end" fill="${INK2}">1–50 eingefroren (alte Bänder)</text>`,
  `<text x="${xL + 6}" y="${M.t + 16}" font-size="11" fill="${INK2}">51–184 nach der Kurve</text>`,
);
// Bänder
for (const c of curve) {
  const [lo, hi] = c.targetAttempts;
  const bw = Math.max(2, step - 2);
  parts.push(
    `<rect x="${x(c.index) - bw / 2}" y="${y(hi)}" width="${bw}" height="${Math.max(1.5, y(lo) - y(hi))}" rx="1" fill="${BAND}"><title>${c.index} ${c.type}: Soll ${f2(lo)}–${f2(hi)}</title></rect>`,
  );
}
// Ist-Punkte
const outside: CurveSpec[] = [];
for (const c of curve) {
  const a = att(c.index);
  const g = groupOf(c);
  if (a === null) {
    outside.push(c);
    parts.push(`<text x="${x(c.index)}" y="${y(YMAX) + 4}" font-size="12" text-anchor="middle" fill="${CRITICAL}">∞</text>`);
    continue;
  }
  const cx = x(c.index);
  const cy = y(a);
  const tip = `${c.index} ${byIndex.get(c.index)?.name ?? ''} (${c.type}): ${f2(a)} Versuche, Soll ${f2(c.targetAttempts[0])}–${f2(c.targetAttempts[1])}`;
  if (c.type === 'boss')
    parts.push(
      `<path d="M ${cx} ${cy - 5.5} L ${cx + 5.5} ${cy} L ${cx} ${cy + 5.5} L ${cx - 5.5} ${cy} Z" fill="${COLOR[g]}" stroke="${SURFACE}" stroke-width="1.5"><title>${esc(tip)}</title></path>`,
    );
  else
    parts.push(
      `<circle cx="${cx}" cy="${cy}" r="${c.type === 'superhard' ? 5 : 3.6}" fill="${COLOR[g]}" stroke="${SURFACE}" stroke-width="1.5"><title>${esc(tip)}</title></circle>`,
    );
  if (!inBand(c)) {
    outside.push(c);
    parts.push(`<circle cx="${cx}" cy="${cy}" r="7.5" fill="none" stroke="${CRITICAL}" stroke-width="1.5"/>`);
  }
  if (c.landmark) parts.push(`<text x="${cx}" y="${cy - 10}" font-size="10" text-anchor="middle" fill="${INK2}">${esc(c.landmark.split(' (')[0]!)}</text>`);
}
// x-Achse
for (const i of [1, 14, 26, 38, 50, 62, 74, 86, 98, 114, 124, 136, 148, 160, 172, 184])
  parts.push(`<text x="${x(i)}" y="${M.t + plotH + 18}" font-size="11" text-anchor="middle" fill="${INK2}">${i}</text>`);
parts.push(
  `<text x="${M.l + plotW / 2}" y="${M.t + plotH + 38}" font-size="12" text-anchor="middle" fill="${INK2}">Level (Zonengrenzen gestrichelt)</text>`,
  `<text transform="translate(18 ${M.t + plotH / 2}) rotate(-90)" font-size="12" text-anchor="middle" fill="${INK2}">Versuche (1 / Gewinnrate Anfänger)</text>`,
);
// Legende
const ly = H - 26;
let lx = M.l;
const legend = (shape: string, label: string) => {
  parts.push(shape.replace(/\$X/g, String(lx + 6)).replace(/\$Y/g, String(ly - 4)));
  parts.push(`<text x="${lx + 16}" y="${ly}" font-size="12" fill="${INK}">${label}</text>`);
  lx += 16 + label.length * 6.6 + 22;
};
legend(`<rect x="$X" y="$Y" width="10" height="10" transform="translate(-5 -5)" fill="${BAND}"/>`, 'Soll-Band');
legend(`<circle cx="$X" cy="$Y" r="4" fill="${COLOR.leicht}"/>`, 'Lehren, Üben, Spaß');
legend(`<circle cx="$X" cy="$Y" r="4" fill="${COLOR.normal}"/>`, 'Normal, Kombi');
legend(`<circle cx="$X" cy="$Y" r="4" fill="${COLOR.spitze}"/>`, 'Hart (groß: superhart)');
legend(`<path d="M $X ${ly - 9.5} l 5.5 5.5 l -5.5 5.5 l -5.5 -5.5 Z" fill="${COLOR.spitze}"/>`, 'Boss');
legend(`<circle cx="$X" cy="$Y" r="6" fill="none" stroke="${CRITICAL}" stroke-width="1.5"/>`, `außerhalb des Bands (${outside.length})`);
parts.push('</svg>');
writeFileSync(outSvg, parts.join('\n') + '\n');

// ---- Markdown -------------------------------------------------------------------------------

const infos: CurveLevelInfo[] = curve.map((c) => {
  const spec = levelSpec(c.index);
  const info: CurveLevelInfo = { index: c.index, level: generateLevel(spec), fixed: spec.board !== undefined };
  if (c.index > LEGACY_LAST_LEVEL) info.zoneSet = zoneSetOf(c.index);
  return info;
});
const report = validateCurve(curve, cal.levels, infos);
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length === 0 ? NaN : s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};
const TYPE_DE: Record<string, string> = {
  tutorial: 'Tutorial',
  intro: 'Lehren',
  practice: 'Üben',
  normal: 'Normal',
  fun: 'Spaß',
  combine: 'Kombi',
  hard: '**Hart**',
  superhard: '**Superhart**',
  boss: '**Boss**',
};
const knobs = (i: number) => {
  const t = TUNING[i];
  if (!t) return '';
  const p: string[] = [];
  if (t.dial) p.push(`Ziel ${t.dial > 0 ? '+' : ''}${t.dial}`);
  if (t.start) p.push(`Start ${t.start > 0 ? '+' : ''}${t.start}`);
  if (t.t2) p.push(`Spawn-2 ×${t.t2}`);
  return p.join(', ');
};
const tuned = Object.entries(TUNING).filter(([, t]) => t.dial || t.start || t.t2).length;

const md: string[] = [];
md.push(
  '# Schwierigkeitskurve 184 Level',
  '',
  `Stand: Kalibrierung ${cal.generatedAt.slice(0, 16).replace('T', ' ')} UTC, Solver ${cal.solverVersion}, je Bot ≤ ${cal.seeds} Seeds (Wilson-Abbruch ±0,05). Erzeugt mit \`pnpm --filter @ee/tools-levels report\`.`,
  '',
  '![Soll-Band und gemessene Versuche je Level](level-kurve-184.svg)',
  '',
  '**Lesart.** Versuche = 1 / Gewinnrate des Anfänger-Bots (Proxy für menschliche Versuche, GDD 6.4). Das Soll-Band kommt aus `packages/core/src/generator/curve.ts`: Zonenschablone (Lehren · Üben · Normal · Spaß · **Hart** · Atempause · Kombi · Normal · **Hart** · Spaß · Normal · **Boss**), globale Rampe `1 + (b − 1)·(1 + 0,045·(z − 1))`, Deckel 5 (bis Zone 10: 4,5), Zonenstart ≤ 1,2, Atempause nach jeder Spitze ≤ 1,35. Level 1–50 sind eingefroren (Inhalt, IDs und Bänder unverändert).',
  '',
  '## Überblick',
  '',
  '| Zone | Welt | Level | Typenfolge | Anfänger-Versuche min / Median / max | starker Bot min | außerhalb |',
  '|---|---|---|---|---|---|---|',
);
ZONE_RANGES.forEach(([a, b], z) => {
  const list = curve.filter((c) => c.index >= a && c.index <= b);
  const atts = list.map((c) => att(c.index)).filter((v): v is number => v !== null);
  const strongs = list.filter((c) => c.type !== 'boss').map((c) => strong(c.index) ?? 0);
  const seq = list.map((c) => (c.spike ? c.type[0]!.toUpperCase() : c.type[0]!)).join('');
  const off = list.filter((c) => !inBand(c)).map((c) => c.index);
  md.push(
    `| ${z + 1} | ${ZONE_WORLDS[z]} | ${a}–${b} | \`${seq}\` | ${f2(Math.min(...atts))} / ${f2(median(atts))} / ${f2(Math.max(...atts))} | ${Math.round(Math.min(...strongs) * 100)} % | ${off.length ? off.join(', ') : '–'} |`,
  );
});
md.push(
  '',
  'Typenfolge: t Tutorial, i Lehren (intro), p Üben, n Normal, f Spaß, c Kombi, **H** Hart, **S** Superhart, **B** Boss. „starker Bot min“ ohne Boss.',
  '',
  `**Spitzen für die Karte** (\`spikeLevels()\`, ersetzt \`[13, 38, 63, 88]\` in \`packages/world/src/plane/path.ts\`): ${spikeLevels().join(', ')}.`,
  '',
  `**Nachjustierung:** alle ${Object.keys(TUNING).length} Level 51–184 haben ein kalibriertes Zugbudget (\`tuning.ts\`), ${tuned} davon zusätzlich Zielgröße, Startmasse oder Spawn-Rate.`,
  '',
  `**Kurven-Checks:** ${report.errors.length} Fehler, ${report.warnings.length} Warnungen.`,
  '',
);
const groups = new Map<string, string[]>();
for (const w of report.issues) {
  const k = `${w.severity === 'error' ? 'Fehler' : 'Warnung'} · Check ${w.check}`;
  groups.set(k, [...(groups.get(k) ?? []), w.message]);
}
for (const [k, msgs] of groups) {
  md.push(`- ${k} (${msgs.length}): ${msgs.slice(0, 12).join('; ')}${msgs.length > 12 ? ' …' : ''}`);
}
md.push('');
ZONE_RANGES.forEach(([a, b], z) => {
  md.push(
    `## Zone ${z + 1} · ${ZONE_WORLDS[z]} · Level ${a}–${b}${a <= LEGACY_LAST_LEVEL ? ' (eingefroren)' : ''}`,
    '',
    '| Level | Name | Typ | Ziel | Raster | Züge | Soll | Ist | stark | Abweichung | Regler |',
    '|---|---|---|---|---|---|---|---|---|---|---|',
  );
  for (const c of curve.filter((x) => x.index >= a && x.index <= b)) {
    const e = byIndex.get(c.index);
    const info = infos[c.index - 1]!;
    const a2 = att(c.index);
    const s = strong(c.index);
    const [lo, hi] = c.targetAttempts;
    const dev =
      a2 === null ? '**nie gewonnen**' : a2 < lo - 1e-9 ? `leichter (−${f2(lo - a2)})` : a2 > hi + 1e-9 ? `**schwerer (+${f2(a2 - hi)})**` : '';
    md.push(
      `| ${c.index} | ${esc(e?.name ?? '')} | ${TYPE_DE[c.type]}${c.newElement ? ` (${c.newElement})` : ''} | ${info.level.goals.map(goalLabel).join(' + ')} | ${info.level.grid.w}×${info.level.grid.h}${info.fixed ? ' fest' : ''} | ${info.level.moves} | ${f2(lo)}–${f2(hi)} | ${a2 === null ? '∞' : f2(a2)} | ${s === null ? '–' : `${Math.round(s * 100)} %`} | ${dev} | ${knobs(c.index)} |`,
    );
  }
  md.push('');
});
writeFileSync(outMd, md.join('\n'));
console.log(`wrote ${outSvg}\nwrote ${outMd}`);

// ---- PNG (optional) -------------------------------------------------------------------------

if (process.argv.includes('--png')) {
  // Playwright liegt in apps/game (E2E); hier nur geliehen, daher ein schmaler Typ.
  interface Shot {
    launch(): Promise<{
      newPage(o: { viewport: { width: number; height: number }; deviceScaleFactor: number }): Promise<{
        setContent(html: string): Promise<void>;
        locator(sel: string): { screenshot(o: { path: string }): Promise<unknown> };
      }>;
      close(): Promise<void>;
    }>;
  }
  const req = createRequire(resolve(root, 'apps/game/package.json'));
  const { chromium } = req('@playwright/test') as { chromium: Shot };
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
  await page.setContent(`<html><body style="margin:0">${readFileSync(outSvg, 'utf8')}</body></html>`);
  await page.locator('svg').screenshot({ path: outPng });
  await browser.close();
  console.log(`wrote ${outPng}`);
}
