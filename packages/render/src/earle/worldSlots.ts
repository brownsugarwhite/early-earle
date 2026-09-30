import { waterFromSky, rockFromTerrain, type PaletteAtlas, type WorldPalette, type WorldRows } from './palette';

/**
 * Welt-Slots der unendlichen Ebene (ADR 0002): Shader können keine unbegrenzten Weltindizes nachschlagen. Jede sichtbare
 * Welt bekommt einen Slot — einen festen Block von `SLOT_ROWS` Zeilen im Paletten-Atlas und einen Platz in den
 * Uniform-Tabellen (Terrain, Felsen, Wasser, Bäume). Vertex-Attribute und Instanzen tragen den Slot, nie die Welt.
 * Slots werden nach Gebrauch vergeben (am längsten unbenutzt zuerst ersetzt, nie ein Slot, den ein geladener Chunk oder
 * Inhalt noch braucht).
 */

/** Anzahl gleichzeitiger Welten (Blickweite ≈ 60 Einheiten, Welten ≈ 34–42 Einheiten groß → selten über 14). */
export const SLOT_COUNT = 24;
/** Zeilen je Slot im Atlas. */
export const SLOT_ROWS = 16;
/** Zeilen des Karten-Atlas (Slots + benannte Zeilen anderer Module: Riesenbaum, Müll, …). */
export const PLANET_ATLAS_HEIGHT = 512;

/** Feste Zeilen eines Slots. */
export function slotRows(slot: number): WorldRows {
  const b = slot * SLOT_ROWS;
  return {
    terrain: b,
    canopy: b + 1,
    canopyRows: [b + 1, b + 2, b + 3, b + 4],
    sky: b + 5,
    fog: b + 6,
    accent: b + 7,
    monolith: b + 8,
    barn: b + 9,
    water: b + 10,
    rock: b + 11,
    snow: b + 12,
  };
}

/** Slot einer Atlaszeile (−1 = keine Slotzeile). */
export function slotOfRow(row: number): number {
  return row < SLOT_COUNT * SLOT_ROWS ? Math.floor(row / SLOT_ROWS) : -1;
}

/** Schreibt eine Weltpalette in die Zeilen eines Slots. */
export function writeSlotPalette(atlas: PaletteAtlas, slot: number, p: WorldPalette): WorldRows {
  const rows = slotRows(slot);
  const terrain = [p.ink, ...p.terrain];
  atlas.setRow(rows.terrain, terrain);
  atlas.setRow(rows.canopy, [p.ink, ...p.canopy]);
  const variants = p.canopyVariants ?? [];
  for (let i = 0; i < 3; i++) atlas.setRow(rows.canopyRows[i + 1]!, [p.ink, ...(variants[i] ?? p.canopy)]);
  atlas.setRow(rows.sky, [...p.sky, p.sun, p.sunRing]);
  atlas.setRow(rows.fog, p.fog, p.fogAlpha);
  atlas.setRow(rows.accent, p.accent.slice(0, 8));
  atlas.setRow(rows.monolith, p.monolith ?? terrain);
  atlas.setRow(rows.barn, p.barn ?? terrain);
  atlas.setRow(rows.water, (p.water ?? waterFromSky(p)).slice(0, 8));
  atlas.setRow(rows.rock, (p.rock ?? rockFromTerrain(p)).slice(0, 8));
  atlas.setRow(rows.snow, (p.snow ?? terrain).slice(0, 8));
  return { ...rows, canopyRows: [rows.canopy, ...rows.canopyRows.slice(1, 1 + Math.max(0, Math.min(3, variants.length)))] };
}

export interface SlotListener {
  /** Ein Slot wurde (neu) belegt: Tabellen der Materialien nachführen. */
  (slot: number, world: number): void;
}

export class WorldSlots {
  private readonly worldOfSlot = new Int32Array(SLOT_COUNT).fill(-1 << 30);
  private readonly slotOfWorld = new Map<number, number>();
  private readonly lastUse = new Float64Array(SLOT_COUNT);
  private readonly rows: WorldRows[] = [];
  private clock = 0;
  /** Welten, die in diesem Durchgang gebraucht werden (nicht ersetzbar). */
  private readonly pinned = new Set<number>();
  /** Zahl der Ersetzungen (Diagnose). */
  evictions = 0;

  constructor(
    private readonly atlas: PaletteAtlas,
    private readonly palette: (world: number) => WorldPalette,
    private readonly onAssign: SlotListener,
  ) {
    atlas.reserve(SLOT_COUNT * SLOT_ROWS);
    for (let s = 0; s < SLOT_COUNT; s++) this.rows.push(slotRows(s));
  }

  /** Slot einer Welt (belegt ihn bei Bedarf). */
  slotOf(world: number): number {
    const hit = this.slotOfWorld.get(world);
    if (hit !== undefined) {
      this.lastUse[hit] = ++this.clock;
      return hit;
    }
    let slot = -1;
    for (let s = 0; s < SLOT_COUNT; s++) {
      if (this.worldOfSlot[s] === -1 << 30) {
        slot = s;
        break;
      }
    }
    if (slot < 0) {
      let best = Infinity;
      for (let s = 0; s < SLOT_COUNT; s++) {
        if (this.pinned.has(this.worldOfSlot[s]!)) continue;
        if (this.lastUse[s]! < best) {
          best = this.lastUse[s]!;
          slot = s;
        }
      }
      if (slot < 0) {
        // alles gebraucht (extremer Überblick): den ältesten trotzdem ersetzen
        slot = 0;
        for (let s = 1; s < SLOT_COUNT; s++) if (this.lastUse[s]! < this.lastUse[slot]!) slot = s;
      }
      this.slotOfWorld.delete(this.worldOfSlot[slot]!);
      this.evictions++;
    }
    this.worldOfSlot[slot] = world;
    this.slotOfWorld.set(world, slot);
    this.lastUse[slot] = ++this.clock;
    this.rows[slot] = writeSlotPalette(this.atlas, slot, this.palette(world));
    this.onAssign(slot, world);
    return slot;
  }

  /** Slot einer Welt, ohne zu belegen (−1 = keiner). */
  peek(world: number): number {
    return this.slotOfWorld.get(world) ?? -1;
  }

  /** Welt eines Slots (−1 = frei). */
  worldOf(slot: number): number {
    const w = this.worldOfSlot[slot] ?? -1;
    return w === -1 << 30 ? -1 : w;
  }

  /** Zeilen eines Slots. */
  rowsOf(slot: number): WorldRows {
    return this.rows[slot] ?? slotRows(slot);
  }

  /** Zeilen der Welt (belegt ihren Slot bei Bedarf). */
  rowsOfWorld(world: number): WorldRows {
    return this.rowsOf(this.slotOf(world));
  }

  /** Welten, die gerade gebraucht werden (geladene Chunks, Inhalt, Blick-Welt) — sie werden nicht ersetzt. */
  pin(worlds: Iterable<number>): void {
    this.pinned.clear();
    for (const w of worlds) this.pinned.add(w);
  }

  /** Alle belegten Slots (Slot → Welt). */
  entries(): Array<[number, number]> {
    const out: Array<[number, number]> = [];
    for (let s = 0; s < SLOT_COUNT; s++) {
      const w = this.worldOf(s);
      if (w !== -1) out.push([s, w]);
    }
    return out;
  }
}
