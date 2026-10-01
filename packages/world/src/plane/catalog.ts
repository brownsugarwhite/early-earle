import { proceduralRecipe, proceduralWorldSpec, type ProceduralRecipe } from './procedural';
import type { WorldSpec } from './types';

/**
 * Weltkatalog der unendlichen Ebene: Kennungen 0 … authored−1 sind die Autorenwelten (`content/zones/worlds/`), alle
 * anderen Kennungen (prozedurale Pfadwelten, Seitenzellen, Vorland) werden aus ihrem Index erzeugt und im Cache
 * gehalten (Obergrenze; eine erneute Erzeugung liefert dasselbe).
 */
export class WorldCatalog {
  private readonly cache = new Map<number, WorldSpec>();
  /** Obergrenze des Caches prozeduraler Welten. */
  capacity = 256;

  constructor(
    readonly authored: readonly WorldSpec[],
    readonly seed: number,
  ) {
    if (authored.length === 0) throw new Error('WorldCatalog needs at least one authored world');
  }

  get authoredCount(): number {
    return this.authored.length;
  }

  isAuthored(id: number): boolean {
    return id >= 0 && id < this.authored.length;
  }

  spec(id: number): WorldSpec {
    if (this.isAuthored(id)) return this.authored[id]!;
    const hit = this.cache.get(id);
    if (hit) return hit;
    const spec = proceduralWorldSpec(id, this.authored, this.seed);
    this.cache.set(id, spec);
    if (this.cache.size > this.capacity) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
    return spec;
  }

  /** Rezept einer prozeduralen Welt (Eltern, Mischanteil, Farbdreh) — für die Palette in `@ee/render`. */
  recipe(id: number): ProceduralRecipe | null {
    return this.isAuthored(id) ? null : proceduralRecipe(id, this.authored.length, this.seed);
  }
}
