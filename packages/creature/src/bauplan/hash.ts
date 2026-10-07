import { hash32 } from '../math/rng';
import type { Bauplan } from './schema';

/** Stabile Serialisierung (sortierte Schlüssel), damit gleiche Baupläne gleiche Hashes ergeben. */
export function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const o = value as Record<string, unknown>;
    return `{${Object.keys(o)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableJson(o[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

/** Hash der formbestimmenden Felder: gleiche Form ⇒ gleiches Mesh (Cache-Schlüssel). */
export function shapeHash(b: Bauplan, resolution: number): number {
  const { koerper, hals, kopf, maul, augen, unterkoerper, schwanz, anbauten, seed } = b;
  return hash32(stableJson({ koerper, hals, kopf, maul, augen, unterkoerper, schwanz, anbauten, seed, resolution }));
}

/** Hash der Stilfelder (Material, Muster, Farben): Umfärben braucht kein neues Mesh. */
export function styleHash(b: Bauplan): number {
  return hash32(stableJson({ material: b.material, muster: b.muster, zaehne: b.zaehne, zunge: b.zunge }));
}
