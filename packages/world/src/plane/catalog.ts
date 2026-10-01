import { proceduralRecipe, proceduralWorldSpec, type ProceduralRecipe } from './procedural';
import type { WorldSpec } from './types';

export interface WorldCatalogOptions {
  /**
   * Altes Verhalten (Lab `?prozedural=1`): Kennungen ab `authored` sind prozedurale Welten. Standard false — dann gibt
   * es außer den Autorenwelten nur die angedeutete Welt (Route 15 + 1).
   */
  procedural?: boolean;
  /** Angedeutete Welt (Dateiwelt-Index, w16): Spezifikation aller fremden Kennungen ohne `procedural`. */
  hinted?: number;
}

/**
 * Weltkatalog der unendlichen Ebene: Kennungen 0 … authored−1 sind die Autorenwelten (`content/zones/worlds/`).
 * Ohne `procedural` (Route 15 + 1) gelten alle anderen Kennungen (Hinted-Varianten, W2) als die angedeutete Welt; mit
 * `procedural` werden sie aus ihrem Index erzeugt und im Cache gehalten (Obergrenze; eine erneute Erzeugung liefert
 * dasselbe).
 */
export class WorldCatalog {
  private readonly cache = new Map<number, WorldSpec>();
  /** Obergrenze des Caches prozeduraler Welten. */
  capacity = 256;
  readonly procedural: boolean;
  /** Angedeutete Welt (Index in `authored`). */
  readonly hinted: number;

  constructor(
    readonly authored: readonly WorldSpec[],
    readonly seed: number,
    options: WorldCatalogOptions = {},
  ) {
    if (authored.length === 0) throw new Error('WorldCatalog needs at least one authored world');
    this.procedural = options.procedural ?? false;
    this.hinted = Math.min(authored.length - 1, Math.max(0, options.hinted ?? authored.length - 1));
  }

  get authoredCount(): number {
    return this.authored.length;
  }

  isAuthored(id: number): boolean {
    return id >= 0 && id < this.authored.length;
  }

  spec(id: number): WorldSpec {
    if (this.isAuthored(id)) return this.authored[id]!;
    if (!this.procedural) return this.authored[this.hinted]!;
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

  /** Rezept einer prozeduralen Welt (Eltern, Mischanteil, Farbdreh) — für die Palette in `@ee/render`; sonst null. */
  recipe(id: number): ProceduralRecipe | null {
    return this.isAuthored(id) || !this.procedural ? null : proceduralRecipe(id, this.authored.length, this.seed);
  }
}
