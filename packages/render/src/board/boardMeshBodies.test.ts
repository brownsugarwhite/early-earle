import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { uniform } from 'three/tsl';
import { parseGenomeRules, resolveCreature, type CreatureSpec, type Rot3, type Species } from '@ee/genome';
import { createBlobQualityUniforms } from '../blob/compileSdf';
import { createBlobShadingUniforms } from '../blob/blobShading';
import { createEyeGlyphTexture } from '../blob/faceGlyph';
import { meshBodyEligible } from '../creature/CreatureMeshBodies';
import { BoardMeshBodies } from './boardMeshBodies';
import { BoardProps, PROP_FAMILIES, PROP_GROUPS } from './BoardProps';
import { boardPaletteFor } from './boardPalette';

const rulesPath = join(dirname(fileURLToPath(import.meta.url)), '../../../../content/genome/rules.json');
const rules = parseGenomeRules(JSON.parse(readFileSync(rulesPath, 'utf8')));
const specOf = (species: Species, tier: number, seed: number): CreatureSpec => resolveCreature({ zone: 'wooding', tier, seed, species }, rules);
const I: Rot3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const make = (mobile = false): BoardMeshBodies => new BoardMeshBodies(36, createBlobShadingUniforms(), createBlobQualityUniforms(), createEyeGlyphTexture(), mobile);

describe('BoardMeshBodies (board mesh path)', () => {
  it('shares one species mesh across tiers and seeds (the elephant’s widest tier spread may take a second)', () => {
    const m = make();
    const species: Species[] = ['retriever', 'mouse', 'giraffe', 'rex', 'duck', 'elephant'];
    for (const s of species) {
      const shapes = new Set<string>();
      for (let tier = 6; tier <= 11; tier++) {
        for (let seed = 1; seed <= 4; seed++) {
          const spec = specOf(s, tier, seed);
          const alias = m.specFor(spec)!;
          expect(alias).not.toBeNull();
          shapes.add(`${alias.body.spheres.length}|${alias.tier}`);
          // The alias only re-keys the mesh: body, eye, skin and parts stay the creature's own.
          expect(alias.body).toBe(spec.body);
          expect(alias.parts).toBe(spec.parts);
          expect(alias.skin).toBe(spec.skin);
          expect(m.specFor(spec)).toBe(alias);
        }
      }
      expect(shapes.size, s).toBeLessThanOrEqual(s === 'elephant' ? 2 : 1);
    }
    expect(m.meshCount).toBeLessThanOrEqual(species.length + 1);
  });

  it('keeps blobs and gas/fire bodies off the mesh path', () => {
    const m = make();
    for (let seed = 1; seed <= 30; seed++) {
      const spec = resolveCreature({ zone: 'tjorizo', tier: 8, seed }, rules, { archetypes: true });
      expect(m.specFor(spec) !== null).toBe(meshBodyEligible(spec));
    }
  });

  it('prepares queued creatures lazily, at most one new mesh per pump, none while a move plays', () => {
    const m = make();
    let resolved = 0;
    for (const s of ['retriever', 'duck', 'giraffe'] as Species[]) {
      m.enqueue(`${s}`, () => {
        resolved++;
        return specOf(s, 7, 2);
      });
    }
    m.enqueue('retriever', () => specOf('retriever', 7, 9));
    expect(m.pending).toBe(3);
    expect(resolved).toBe(0);
    expect(m.pump(100, false)).toBe(true);
    expect(m.meshCount).toBe(0);
    m.pump(100);
    expect(m.meshCount).toBe(1);
    // The next mesh waits a few pumps (spread over frames).
    m.pump(100);
    expect(m.meshCount).toBe(1);
    while (m.pump(100));
    expect(m.meshCount).toBe(3);
    expect(m.pending).toBe(0);
  });

  it('draws one call per species mesh plus the coat passes of the preset', () => {
    const fur = specOf('retriever', 7, 5);
    const feather = specOf('duck', 7, 3);
    expect(fur.skin.coat).toBe('fur');
    for (const mobile of [false, true]) {
      const m = make(mobile);
      m.begin();
      for (const [slot, spec] of [fur, feather, specOf('retriever', 9, 5)].entries()) {
        const alias = m.specFor(spec)!;
        m.draw(slot, alias, spec.body, { center: [slot, 0, 0], scale: 0.3 }, {}, I);
      }
      m.end();
      const meshes = 2;
      const coats = feather.skin.coat === 'feather' ? (mobile ? 1 : 3) : mobile ? 1 : 2;
      expect(m.drawCalls, mobile ? 'Mobil' : 'Hoch').toBe(meshes + coats);
      m.shells = false;
      m.begin();
      m.end();
      expect(m.drawCalls).toBe(0);
    }
  });
});

describe('BoardProps draw groups', () => {
  it('cover every family once and draw in at most three calls', () => {
    const seen = PROP_GROUPS.flat();
    expect([...seen].sort()).toEqual([...PROP_FAMILIES].sort());
    const props = new BoardProps(boardPaletteFor({ sky: ['#7ce6d5'], terrainLight: '#b3bb6d', terrainDark: '#606e4f', ink: '#242c0b' }), uniform(0));
    PROP_FAMILIES.forEach((family, i) => props.add(`p${i}`, { family, x: i, y: 0, z: 0, sx: 1, sy: 1, sz: 1, color: '#c8542a' }, 0));
    props.update(0);
    expect(props.drawCalls).toBe(PROP_GROUPS.length);
    expect(PROP_GROUPS.length).toBeLessThanOrEqual(3);
    props.remove('p0');
    props.update(0);
    expect(props.count).toBe(PROP_FAMILIES.length - 1);
    props.dispose();
  });
});
