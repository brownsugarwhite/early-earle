import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_SPECIES_RULES, SPECIES, SPECIES_LABELS, ZONES, materialForTierRules, paletteFor, speciesRuleFor, type ZoneId } from '@ee/genome';
import { PATTERN_KINDS, PATTERN_LABELS, REX_PALETTE, TJORIZO_PALETTE, boardPaletteFor, speciesPalette } from '@ee/render';
import { BARK_PALETTE, BLOSSOM_CENTER_PALETTE, BLOSSOM_PALETTE, DOME_FAMILIES, LICHEN_PALETTE, MOTIF_PALETTE, SNOW_PALETTE, STAR_PALETTE } from '@ee/render/earle/tree/index.ts';
import type { ExportContext } from '../context';

/**
 * Materialien/Paletten: alle Farbquellen des Spiels als Farbreihen — die zehn Weltpaletten (Himmel, Terrain,
 * Kronen, Nebel, Akzente, Monolith, Scheune), die Zonendateien, die Genom-Paletten der Blob-Linien je Zone und
 * Stufe, Arten- und Musterfarben, REX, Brett (je Zone), Riesenbaum (Rinde, Flechten, Kronenfamilien, Blüten,
 * Sternnadeln) und die UI-Tokens. Blender legt daraus Farbstreifen und benannte Materialien an.
 */

export interface PaletteRow {
  name: string;
  colors: string[];
  /** Optional names per colour (e.g. "Tinte", "Licht 1"). */
  labels?: string[];
}

export interface PaletteGroup {
  group: string;
  rows: PaletteRow[];
}

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

export async function exportPalettes(ctx: ExportContext): Promise<{ file: string; groups: number; rows: number }> {
  const groups: PaletteGroup[] = [];
  const { WORLD_CONTENTS, ZONE_CONTENTS } = await import('@/lab/earle/zones');

  // Welten
  groups.push({
    group: 'Welten',
    rows: WORLD_CONTENTS.flatMap((w) => {
      const p = w.palette;
      const n = `Welt ${w.id.slice(1)} ${w.name}`;
      const rows: PaletteRow[] = [
        { name: `${n} · Himmel`, colors: [...p.sky, p.sun, p.sunRing] },
        { name: `${n} · Terrain`, colors: [p.ink, ...p.terrain], labels: ['Tinte', ...p.terrain.map((_, i) => `Licht ${i + 1}`)] },
        { name: `${n} · Kronen`, colors: [p.ink, ...p.canopy] },
        { name: `${n} · Nebel`, colors: p.fog },
        { name: `${n} · Akzente`, colors: p.accent, labels: ['Stamm hell', 'Streifen 1', 'Streifen 2', 'kahle Bäume', 'Flechte 1', 'Flechte 2', 'Requisit A', 'Requisit B'] },
      ];
      (p.canopyVariants ?? []).forEach((v, i) => rows.push({ name: `${n} · Kronen ${i + 2}`, colors: [p.ink, ...v] }));
      if (p.monolith) rows.push({ name: `${n} · Monolith`, colors: p.monolith });
      if (p.barn) rows.push({ name: `${n} · Scheune`, colors: p.barn });
      return rows;
    }),
  });

  // Zonendateien + Tjorizo-Palette
  groups.push({
    group: 'Zonen',
    rows: [
      ...ZONE_CONTENTS.map((z) => ({ name: `Zone ${z.name ?? z.id}`, colors: [...z.palette.sky, z.palette.terrainLight, z.palette.terrainDark, z.palette.ink, ...(z.palette.accents ?? [])] })),
      { name: 'Tjorizo · Terrain (handabgestimmt)', colors: [TJORIZO_PALETTE.ink, ...TJORIZO_PALETTE.terrain] },
      { name: 'Tjorizo · Himmel', colors: TJORIZO_PALETTE.sky },
    ],
  });

  // Genom: Blob-Linien je Zone (Grund, Innen, Rand, Glanz, Bläschen) und Zonenkonstanten
  const genome: PaletteRow[] = [];
  for (const zone of ZONES as readonly ZoneId[]) {
    const zr = ctx.rules.zones[zone];
    genome.push({ name: `${cap(zone)} · Tinte/Knochen/Akzent`, colors: [zr.tints.ink ?? '#0f1c22', zr.tints.bone ?? '#f7f6d8', zr.tints.accent ?? '#22baa9'], labels: ['Tinte', 'Knochen', 'Akzent'] });
    const base: string[] = [];
    const inner: string[] = [];
    for (let t = 1; t <= 12; t++) {
      const p = paletteFor(zone, t, materialForTierRules(ctx.rules, zone, t));
      base.push(p.baseColor);
      inner.push(p.innerColor);
    }
    genome.push({ name: `${cap(zone)} · Blob Grundfarbe Stufe 1–12`, colors: base });
    genome.push({ name: `${cap(zone)} · Blob Innenfarbe Stufe 1–12`, colors: inner });
  }
  groups.push({ group: 'Genom (Blob-Linien)', rows: genome });

  // Arten
  groups.push({
    group: 'Arten',
    rows: SPECIES.filter((s) => s !== 'blob').map((s) => {
      const r = speciesRuleFor(ctx.rules, s);
      const d = DEFAULT_SPECIES_RULES[s];
      return { name: SPECIES_LABELS[s], colors: [r.color ?? d.color ?? '#888888', r.accent ?? d.accent ?? '#666666'], labels: ['Artfarbe', 'Akzent'] };
    }),
  });

  // Muster
  groups.push({
    group: 'Muster',
    rows: PATTERN_KINDS.filter((k) => k !== 'none').map((k) => {
      const p = speciesPalette(k);
      const colors = [p.ground, p.ink, p.light, p.light2].filter((c): c is string => typeof c === 'string');
      return { name: `Muster ${PATTERN_LABELS[k]}`, colors, labels: [...(p.ground ? ['Grund'] : []), 'Tinte', 'Licht', 'Licht 2'] };
    }),
  });

  // REX
  const rex = REX_PALETTE as unknown as Record<string, string | readonly string[]>;
  groups.push({ group: 'REX', rows: Object.entries(rex).map(([k, v]) => ({ name: `REX · ${k}`, colors: Array.isArray(v) ? [...v] : [v as string] })) });

  // Brett je Zone
  groups.push({
    group: 'Spielfeld',
    rows: ZONE_CONTENTS.map((z) => {
      const b = boardPaletteFor(z.palette) as unknown as Record<string, string | string[]>;
      const colors: string[] = [];
      const labels: string[] = [];
      for (const [k, v] of Object.entries(b)) {
        for (const c of Array.isArray(v) ? v : [v]) {
          colors.push(c);
          labels.push(k);
        }
      }
      return { name: `Brett ${z.name ?? z.id}`, colors, labels };
    }),
  });

  // Riesenbaum
  groups.push({
    group: 'Riesenbaum',
    rows: [
      { name: 'Rinde', colors: [...BARK_PALETTE] },
      { name: 'Flechten', colors: [...LICHEN_PALETTE] },
      // Riesenbaum v3: Kuppelfamilien im Verlauf (Tinte, drei Lichtbänder, Punkte Schatten/Licht/Saum, Akzent)
      ...DOME_FAMILIES.map((f) => ({ name: `Kuppelfamilie ${f.name}`, colors: [...f.steps] })),
      { name: 'Kronenblüten', colors: [...MOTIF_PALETTE] },
      { name: 'Schnee', colors: [...SNOW_PALETTE] },
      { name: 'Blüten', colors: [...BLOSSOM_PALETTE] },
      { name: 'Blütenmitten', colors: [...BLOSSOM_CENTER_PALETTE] },
      { name: 'Sternnadeln', colors: [...STAR_PALETTE] },
    ],
  });

  // UI-Tokens (apps/game/src/styles/tokens.css)
  try {
    const css = readFileSync(join(ctx.root, 'apps/game/src/styles/tokens.css'), 'utf8');
    const tokens = [...css.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => ({ name: m[1]!, color: m[2]! }));
    groups.push({ group: 'UI-Tokens', rows: [{ name: 'Design-Tokens', colors: tokens.map((t) => t.color), labels: tokens.map((t) => `--${t.name}`) }] });
  } catch (e) {
    ctx.warn('paletten', `tokens.css: ${String(e)}`);
  }

  const file = ctx.writeJson('paletten.json', { groups });
  const rows = groups.reduce((n, g) => n + g.rows.length, 0);
  ctx.log(`Paletten: ${groups.length} Gruppen, ${rows} Reihen`);
  return { file, groups: groups.length, rows };
}
