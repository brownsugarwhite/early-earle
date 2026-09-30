/**
 * Einhängepunkte des Bretts für die App (Iteration 4): Sammlung ("NEU!"-Stempel) und Klassik (bestes gesammeltes
 * Wesen je Stufe). Die App setzt sie einmal über `BoardRenderer.defaultHooks`; einzelne Bretter können eigene setzen.
 * Alle Hooks sind optional; ohne Hooks verhält sich das Brett wie bisher.
 */

/** Ein Wesen, das auf dem Brett entstanden ist (Merge-Ergebnis oder Spawn). */
export interface MadeCreature {
  blobId: number;
  /** Genom-Zone, die das Aussehen bestimmt. */
  zone: string;
  tier: number;
  species: string;
  bodyType: string;
  /** Genom-Seed (reproduziert das Aussehen mit erzwungener Art). */
  seed: number;
  via: 'merge' | 'spawn';
  /** Zelle (x, y) auf dem Brett. */
  cell: readonly [number, number];
}

/** Wahl des Aussehens für einen Blob, z. B. in Klassik das beste gesammelte Wesen der Stufe. */
export interface CreatureChoice {
  zone: string;
  seed: number;
  /** Art erzwingen (sonst würfelt das Genom sie aus dem Seed). */
  species?: string;
  /** Aussehen einer anderen Stufe (z. B. über 12 hinaus gekappt). */
  tier?: number;
}

export interface BoardHooks {
  /** Aussehen eines Blobs überschreiben; `null`/`undefined` = Standard (Zone des Bretts, Seed aus der Blob-ID). */
  creatureFor?(blob: { id: number; tier: number }, boardZone: string): CreatureChoice | null | undefined;
  /** Beim Erscheinen eines Wesens (Merge-Wechsel, Spawn-Pop/Aufprall) gefragt: `true` zeigt den "NEU!"-Stempel. */
  isNewCreature?(c: MadeCreature): boolean;
  /** Der Stempel wurde gezeigt (Klang, Haptik). */
  stampShown?(c: MadeCreature): void;
}
