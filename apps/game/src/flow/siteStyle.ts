import { mixHex } from '@ee/genome';
import type { PlateauStyle, WorldPalette } from '@ee/render';
import { DOME_FAMILIES } from '@ee/render/earle/tree/index.ts';
import type { NodeSite } from './path';

/**
 * The level plays IN the place its node visits: the plateau is cut from the local ground in the local Earle palette
 * and framed by the local vegetation. A meadow is a low sunlit hilltop with a few dome bushes, a grove a clearing
 * among tall domes, a ledge a rock shelf with striated walls (red rust towers in the golden meadow, the Earle
 * monoliths), a trash field rusty soil with scrap and a neon glint, a shore a sand bar in its pool (oil, syrup,
 * water), the crown of the giant tree a flattened dome with dotted skin among crown puffs, snow a drift with pines.
 * `palette` = the local world's palette (authored or procedural), `zone` its story zone (syrup shores).
 */
export function plateauStyleFor(site: NodeSite, palette: WorldPalette, zone?: string): PlateauStyle {
  const p = palette;
  const t = p.terrain;
  const t0 = t[0] ?? '#303020';
  const t1 = t[1] ?? t0;
  const t2 = t[2] ?? t1;
  const t3 = t[3] ?? t2;
  const t4 = t[4] ?? t3;
  const ink = p.ink;
  const c = p.canopy;
  const body = mixHex(c[0] ?? ink, c[1] ?? ink, 0.35);
  const bodyLight = c[1] ?? body;
  const dot = c[4] ?? c[3] ?? t4;
  const meadowTop = mixHex(mixHex(t3, t4, 0.3), '#f3e27a', 0.08);
  const meadowSkirt: [string, string, string, string] = [t2, t1, mixHex(t1, t0, 0.55), mixHex(t0, ink, 0.45)];
  const shade = mixHex(t0, ink, 0.5);
  switch (site) {
    case 'grove':
      return {
        kind: 'meadow',
        top: mixHex(meadowTop, t2, 0.25),
        skirt: meadowSkirt,
        shade,
        ink,
        pattern: 'none',
        rim: { family: 'dome', body, light: bodyLight, dot, density: 1.25, height: 1.15 },
      };
    case 'ledge': {
      // Rock: the red rust towers where the world has them, otherwise a cool stone from the terrain's dark steps.
      const m = p.monolith;
      const rock = m ? [m[4]!, m[3]!, m[2]!, m[1]!] : [mixHex(t2, '#9a8f7a', 0.55), mixHex(t1, '#7a6f62', 0.5), mixHex(t0, '#4a4038', 0.45), mixHex(t0, ink, 0.6)];
      return {
        kind: 'ledge',
        top: mixHex(meadowTop, t2, 0.2),
        skirt: [rock[0]!, rock[1]!, rock[2]!, rock[3]!],
        shade: mixHex(rock[3]!, ink, 0.4),
        ink,
        pattern: 'none',
        striation: 1.7,
        rim: { family: 'shard', body: rock[2]!, light: rock[1]!, density: 0.32, height: 1.1 },
      };
    }
    case 'trash': {
      const soil = mixHex(mixHex(t1, '#6a4b2e', 0.55), ink, 0.12);
      return {
        kind: 'meadow',
        top: soil,
        skirt: ['#8a4a2a', '#6a3420', mixHex('#4a2418', ink, 0.2), mixHex('#2a1410', ink, 0.5)],
        shade: mixHex('#2a1410', ink, 0.55),
        ink,
        pattern: 'hatch',
        patternColor: mixHex(soil, ink, 0.35),
        striation: 1.3,
        // Scrap with a neon glint (the start world's gas): every fourth piece.
        rim: { family: 'box', body: mixHex('#8a3a22', ink, 0.35), light: '#b8ff2a', density: 0.7, height: 0.9 },
      };
    }
    case 'shore': {
      const sand = mixHex(t4, '#f2e2b0', 0.5);
      const syrup = zone === 'syrup';
      const water = syrup ? '#2a1206' : mixHex(ink, '#10202a', 0.4);
      const band = syrup ? '#f17023' : (p.accent[7] ?? '#7ce6d5');
      return {
        kind: 'bar',
        top: sand,
        skirt: [mixHex(sand, t2, 0.25), mixHex(sand, t1, 0.45), mixHex(sand, water, 0.55), mixHex(water, ink, 0.3)],
        shade: mixHex(t1, ink, 0.55),
        ink,
        pattern: 'none',
        striation: 0.4,
        rim: { family: 'spire', body: mixHex(t0, ink, 0.3), light: t1, density: 0.22, height: 0.7 },
        pool: { water, band },
      };
    }
    case 'crown': {
      // The crown's violet dome family (giant tree v3: ink, three light bands, dots shade/lit/bright, accent).
      const v = (DOME_FAMILIES.find((d) => d.name === 'violet') ?? DOME_FAMILIES[0]!).steps;
      const f = { ink: v[0], bands: [v[1], v[2]] as const, dots: [v[4], v[5], v[6]] as const };
      return {
        kind: 'crown',
        top: f.bands[1],
        skirt: [f.bands[1], f.bands[0], mixHex(f.bands[0], f.ink, 0.5), f.ink],
        shade: f.ink,
        ink: f.ink,
        pattern: 'dots',
        patternColor: f.dots[1],
        striation: 0.3,
        rim: { family: 'dome', body: f.bands[0], light: f.bands[1], dot: f.dots[2], density: 1.1, height: 0.8 },
      };
    }
    case 'snow':
      return {
        kind: 'drift',
        top: '#f4f2ec',
        skirt: ['#dfe6ee', '#b8c8dc', '#8aa0c0', '#4a5a7a'],
        shade: '#3a4a6a',
        ink,
        pattern: 'snow',
        patternColor: '#c8d4e4',
        striation: 0.5,
        rim: { family: 'spire', body: '#0a0d14', light: '#12161e', density: 0.9, height: 1.5 },
      };
    case 'bark':
    case 'meadow':
    default:
      return {
        kind: 'meadow',
        top: meadowTop,
        skirt: meadowSkirt,
        shade,
        ink,
        pattern: 'none',
        rim: { family: 'dome', body, light: bodyLight, dot, density: 0.55, height: 0.85 },
      };
  }
}
