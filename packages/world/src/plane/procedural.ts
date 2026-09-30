import { hash32, mulberry32 } from '../rng';
import type { TreeFamily, TreeKind } from '../scatterTrees';
import type { LakeSpec, RiverSpec, RockSpec, WorldFeatureSpec } from '../features/types';
import type { FocalSpec, PlanetPropSpec, PlanetTerrainShape, WorldSpec } from './types';

/**
 * Prozedurale Welten (ADR 0002): jede Welt ab Index `authored` entsteht deterministisch aus ihrem Index — zwei
 * Elternwelten (Autorenwelten, per Hash gewählt), ein Mischanteil, ein Farbdreh und kleine Mutationen. Gelände,
 * Vegetationsfamilie (Arten, Haine, Rinde, Schnee), Requisiten und Merkmale kommen hier aus den Eltern; die Palette
 * mischt `@ee/render` mit demselben Rezept. Nie zweimal dieselbe Kombination (stetige Parameter je Index).
 */

export interface ProceduralRecipe {
  id: number;
  /** Elternwelten (Indizes der Autorenwelten) und Mischanteil t (0 = A, 1 = B). */
  parentA: number;
  parentB: number;
  t: number;
  /** Farbdreh der Palette in Grad (OKLab-Farbwinkel). */
  hue: number;
  /** Sättigungs- und Helligkeitsfaktor der Palette. */
  chroma: number;
  light: number;
  /** Eigener Seed der Welt (Mutationen, Merkmale). */
  seed: number;
}

/** Rezept einer prozeduralen Welt. */
export function proceduralRecipe(id: number, authored: number, seed: number): ProceduralRecipe {
  const n = Math.max(1, authored);
  const rand = mulberry32(hash32('procedural-world', id, seed));
  const a = Math.floor(rand() * n);
  let b = Math.floor(rand() * (n - 1));
  if (n > 1 && b >= a) b += 1;
  if (n === 1) b = a;
  // Mischanteil fern der Enden: jede Welt ist erkennbar neu, keine Kopie einer Elternwelt
  const t = 0.22 + 0.56 * rand();
  // Farbdreh: große Sprünge, damit Nachbarn sich deutlich unterscheiden (Earle: je Bild eine Palette)
  const hue = (rand() - 0.5) * 150;
  const chroma = 0.85 + rand() * 0.3;
  const light = 0.92 + rand() * 0.14;
  return { id, parentA: a, parentB: b, t, hue, chroma, light, seed: hash32('procedural-seed', id, seed) };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function mixRange(a: [number, number], b: [number, number], t: number): [number, number] {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
}

function mixTerrain(a: PlanetTerrainShape, b: PlanetTerrainShape, t: number, rand: () => number): PlanetTerrainShape {
  const amplitude = lerp(a.amplitude, b.amplitude, t) * (0.82 + rand() * 0.42);
  const wavelength = lerp(a.wavelength ?? 1, b.wavelength ?? 1, t) * (0.86 + rand() * 0.34);
  const ridge = Math.min(0.9, Math.max(0, lerp(a.ridge ?? 0, b.ridge ?? 0, t) + (rand() < 0.2 ? rand() * 0.35 : 0)));
  const floor = Math.min(0.7, Math.max(0, lerp(a.floor ?? 0, b.floor ?? 0, t)));
  const slope = Math.min(0.9, Math.max(0, lerp(a.slope ?? 0, b.slope ?? 0, t) + (rand() - 0.5) * 0.2));
  return { amplitude: Math.max(0.6, Math.min(3.6, amplitude)), wavelength: Math.max(0.6, Math.min(2.4, wavelength)), ridge, floor, slope };
}

function mixKinds(a: Partial<Record<TreeKind, number>>, b: Partial<Record<TreeKind, number>>, t: number, rand: () => number): Partial<Record<TreeKind, number>> {
  const out: Partial<Record<TreeKind, number>> = {};
  const keys = new Set<TreeKind>([...(Object.keys(a) as TreeKind[]), ...(Object.keys(b) as TreeKind[])]);
  for (const k of keys) {
    const w = (a[k] ?? 0) * (1 - t) + (b[k] ?? 0) * t;
    // kleine Anteile fallen gelegentlich weg, große schwanken leicht
    if (w < 0.08 && rand() < 0.5) continue;
    out[k] = w * (0.75 + rand() * 0.5);
  }
  if (Object.keys(out).length === 0) out.dome = 1;
  return out;
}

function mixVegetation(a: TreeFamily, b: TreeFamily, t: number, rand: () => number): TreeFamily {
  const dom = t < 0.5 ? a : b;
  const other = t < 0.5 ? b : a;
  const out: TreeFamily = {
    ...dom,
    density: Math.max(0.05, lerp(a.density, b.density, t) * (0.8 + rand() * 0.4)),
    clumpiness: Math.min(1, Math.max(0, lerp(a.clumpiness, b.clumpiness, t))),
    kinds: mixKinds(a.kinds, b.kinds, t, rand),
    scale: mixRange(a.scale, b.scale, t),
  };
  // Haine: von der dominanten Elternwelt, mit atmender Dichte und verschobenen Höhenlinien
  const grove = dom.grove ?? other.grove;
  if (grove) {
    out.grove = {
      ...grove,
      cover: Math.min(0.8, Math.max(0.05, grove.cover * (0.7 + rand() * 0.6))),
      ...(grove.contours ? { contours: grove.contours.map((c) => Math.min(0.95, Math.max(0.05, c + (rand() - 0.5) * 0.12))) } : {}),
      wavelength: (grove.wavelength ?? 9) * (0.8 + rand() * 0.45),
    };
  }
  // Schnee und Rinde gelegentlich vom anderen Elternteil
  if (rand() < 0.3 && other.bark) out.bark = other.bark;
  if (rand() < 0.25 && other.snow !== undefined && other.snow > 0) out.snow = other.snow;
  delete out.focalTree;
  if (dom.focalTree && rand() < 0.7) out.focalTree = dom.focalTree;
  return out;
}

function mixProps(a: PlanetPropSpec | undefined, b: PlanetPropSpec | undefined, t: number, rand: () => number): PlanetPropSpec {
  const out: PlanetPropSpec = {};
  for (const k of ['pools', 'barns', 'rocks', 'animals'] as const) {
    const v = lerp(a?.[k] ?? 0, b?.[k] ?? 0, t);
    if (v > 0) out[k] = v * (0.7 + rand() * 0.6);
  }
  return out;
}

function scaleCount<T extends { count: number }>(spec: T, f: number): T {
  return { ...spec, count: Math.max(1, Math.round(spec.count * f)) };
}

function mixFeatures(a: WorldFeatureSpec | undefined, b: WorldFeatureSpec | undefined, t: number, rand: () => number): WorldFeatureSpec | undefined {
  const pick = <K extends keyof WorldFeatureSpec>(k: K): WorldFeatureSpec[K] | undefined => {
    const va = a?.[k];
    const vb = b?.[k];
    if (va !== undefined && vb !== undefined) return rand() < 1 - t ? va : vb;
    return va ?? vb;
  };
  const out: WorldFeatureSpec = { seed: Math.floor(rand() * 1000) };
  const lakes = pick('lakes') as LakeSpec | undefined;
  const rivers = pick('rivers') as RiverSpec | undefined;
  // Mehr Wasser (Florian): prozedurale Welten haben fast immer einen Weiher, oft einen Fluss
  if (lakes) out.lakes = scaleCount(lakes, 0.8 + rand() * 0.8);
  else if (rand() < 0.65) out.lakes = { count: 1 + Math.floor(rand() * 2), radius: [1.6, 2.8], pathDistance: [4, 10] };
  if (rivers) out.rivers = scaleCount(rivers, 0.7 + rand() * 0.6);
  else if (rand() < 0.3) out.rivers = { count: 1, width: [0.8, 1.2], length: [10, 18], pathDistance: [4, 9], meander: 0.6 };
  const rocksA = a?.rocks ?? [];
  const rocksB = b?.rocks ?? [];
  const rocks: RockSpec[] = [];
  for (const r of [...rocksA, ...rocksB]) {
    if (rand() >= 0.55) continue;
    const scaled = scaleCount(r, 0.6 + rand() * 0.8);
    // Der Monolith (Welt 13) bleibt ein Unikat seiner Welt; Türme, Tafelfelsen und Nadeln dürfen wandern
    if (r.kind !== 'monolith') rocks.push(scaled);
  }
  if (rocks.length > 0) out.rocks = rocks;
  const snow = pick('snowFields');
  if (snow) out.snowFields = snow;
  const drifts = pick('drifts');
  if (drifts && snow) out.drifts = drifts;
  const chisel = lerp(a?.chisel ?? 0, b?.chisel ?? 0, t);
  if (chisel > 0.05) out.chisel = chisel;
  return Object.keys(out).length > 1 ? out : undefined;
}

function mixFocal(a: FocalSpec | undefined, b: FocalSpec | undefined, t: number, rand: () => number): FocalSpec | undefined {
  const dom = t < 0.5 ? (a ?? b) : (b ?? a);
  if (!dom) return undefined;
  const lateral = (rand() < 0.5 ? -1 : 1) * (4 + rand() * 5);
  return { ...dom, along: 0.3 + rand() * 0.4, lateral };
}

/** Spezifikation (Gelände, Vegetation, Requisiten, Merkmale) einer prozeduralen Welt. */
export function proceduralWorldSpec(id: number, authored: readonly WorldSpec[], seed: number): WorldSpec {
  const recipe = proceduralRecipe(id, authored.length, seed);
  const A = authored[recipe.parentA] ?? authored[0]!;
  const B = authored[recipe.parentB] ?? A;
  const rand = mulberry32(recipe.seed);
  const t = recipe.t;
  const features = mixFeatures(A.features, B.features, t, rand);
  const focal = mixFocal(A.focal, B.focal, t, rand);
  return {
    id: `p${id}`,
    terrain: mixTerrain(A.terrain, B.terrain, t, rand),
    vegetation: mixVegetation(A.vegetation as TreeFamily, B.vegetation as TreeFamily, t, rand),
    props: mixProps(A.props, B.props, t, rand),
    ...(features ? { features } : {}),
    ...(focal ? { focal } : {}),
  };
}
