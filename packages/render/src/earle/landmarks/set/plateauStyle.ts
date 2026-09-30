import type { LandmarkAnchor } from '@ee/world';
import type { PlateauStyle } from '../../../board/BoardPlateau';
import { mixRgb } from '../../palette';
import type { LandmarkPalette } from './palette';

/**
 * Plateau style of a level board standing on a landmark anchor (for `LevelBoard.setSite`): the board is cut from the
 * landmark's own top — moss on basalt with striated rock skirts (`ledge`), flagstones on the ruin terrace with stone
 * skirts and a few blocks on the rim (`ruin`), a turf island in green marsh water with reed domes (`island`).
 */
export function landmarkPlateauStyle(site: LandmarkAnchor['site'], p: LandmarkPalette): PlateauStyle {
  switch (site) {
    case 'ruin':
      // worn flagstones with the ruin's striated stone skirts; the rim overgrown with the ruin's own dome bushes (no
      // crates: the box family is scrap)
      return {
        kind: 'ledge',
        top: mixRgb(p.stone[4]!, p.stone[3]!, 0.35),
        skirt: [p.stone[4]!, p.stone[3]!, p.stone[2]!, p.stone[1]!],
        shade: mixRgb(p.stone[1]!, p.stone[0]!, 0.4),
        ink: p.stone[0]!,
        pattern: 'none',
        striation: 1.3,
        rim: { family: 'dome', body: p.bush[1]!, light: p.bush[2]!, dot: p.bush[4]!, density: 0.45, height: 0.8 },
      };
    case 'island':
      return {
        kind: 'meadow',
        top: mixRgb(p.moss[3]!, p.moss[4]!, 0.3),
        skirt: [p.moss[2]!, p.earth[3]!, p.earth[2]!, p.earth[1]!],
        shade: mixRgb(p.earth[1]!, p.earth[0]!, 0.4),
        ink: p.earth[0]!,
        pattern: 'none',
        rim: { family: 'dome', body: p.marsh[2]!, light: p.marsh[4]!, dot: p.marsh[5]!, density: 0.7, height: 0.8 },
        pool: { water: p.swamp[1]!, band: p.swamp[4]! },
      };
    default:
      return {
        kind: 'ledge',
        top: mixRgb(p.moss[3]!, p.moss[4]!, 0.25),
        skirt: [p.rock[4]!, p.rock[3]!, p.rock[2]!, p.rock[1]!],
        shade: mixRgb(p.rock[1]!, p.rock[0]!, 0.4),
        ink: p.rock[0]!,
        pattern: 'none',
        striation: 1.7,
        rim: { family: 'shard', body: p.rock[2]!, light: p.rock[3]!, density: 0.28, height: 1.0 },
      };
  }
}
