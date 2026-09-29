/**
 * Zehn Welten auf einem Planeten mit vier Story-Zonen (Breitenbänder). Der Levelpfad ist eine Spirale von Pol zu
 * Pol; jede Breite hat genau eine Pfadlänge. "Nah" = innerhalb ±`halfWidth` Länge um den Pfad → Story-Welt des
 * Bands; "Fern" = die gegenüberliegende Seite → eine oder zwei weitere Welten je Band (Nord-/Südhälfte). Beides
 * ergibt diagonale Spiralstreifen, die beim Rollen der Kugel abwechselnd sichtbar werden.
 *
 * Die Entscheidung läuft auf CPU (Streuung, Kamera) und GPU (Terrainzeile) über dieselbe Funktion: kontinuierliche
 * Zonenkoordinate plus cos/sin des Längenabstands zum Pfad (beides interpolierbar, keine Sprünge an ±180°).
 */

export interface WorldTables {
  /** Welt-Index der nahen (Story-)Welt je Zonenband (Nordhälfte bzw. einzige). */
  nearWorld: number[];
  /** Zweite nahe Welt (Südhälfte des Bands, z. B. das erste Wäldchen am Ende des Pfads) oder -1. */
  nearWorldB?: number[];
  /** Welt-Index der fernen Welt je Band (Nordhälfte bzw. einzige). */
  farWorldA: number[];
  /** Zweite ferne Welt (Südhälfte des Bands) oder -1. */
  farWorldB: number[];
  /** Anteil der Zonenkoordinate (0..1), ab dem die ferne Welt B beginnt (flächengleiche Teilung des Bands). */
  farSplit: number[];
}

/** Länge (rad) des Spiralpfads auf Breite `lat` (rad). `margin` = polare Randzone ohne Pfad (rad). */
export function pathLongitude(lat: number, turns: number, margin: number): number {
  const span = Math.PI - 2 * margin;
  const s = Math.min(1, Math.max(0, (Math.PI / 2 - margin - lat) / span));
  return s * turns * Math.PI * 2;
}

/** Winkel auf (-π, π] wickeln. */
export function wrapAngle(a: number): number {
  let x = a % (Math.PI * 2);
  if (x > Math.PI) x -= Math.PI * 2;
  if (x <= -Math.PI) x += Math.PI * 2;
  return x;
}

/**
 * Welt-Index aus Zonenkoordinate und Pfadseite. Muss exakt der Shader-Entscheidung entsprechen
 * (`worldIndexNode` in @ee/render).
 */
export function decideWorld(zoneCoord: number, cosDelta: number, cosHalfWidth: number, tables: WorldTables): number {
  const zones = tables.nearWorld.length;
  const z = Math.min(zones - 1, Math.max(0, Math.floor(zoneCoord)));
  const firstHalf = zoneCoord - z < (tables.farSplit[z] ?? 0.5);
  if (cosDelta > cosHalfWidth) {
    const nb = tables.nearWorldB?.[z] ?? -1;
    return nb < 0 || firstHalf ? (tables.nearWorld[z] ?? 0) : nb;
  }
  const b = tables.farWorldB[z] ?? -1;
  if (b < 0 || firstHalf) return tables.farWorldA[z] ?? tables.nearWorld[z] ?? 0;
  return b;
}

/**
 * Flächengleiche Teilung eines Breitenbands [latHi, latLo] (rad, latHi > latLo): Anteil 0..1 von oben, an dem
 * beide Hälften dieselbe Kugelfläche haben (an den Polen liegt die Grenze deshalb näher am Pol).
 */
export function areaSplit(latHi: number, latLo: number): number {
  const phi = Math.asin((Math.sin(latHi) + Math.sin(latLo)) / 2);
  return (latHi - phi) / (latHi - latLo);
}

/** Weiche Gewichte für Parameter-Überblendung an den Weltgrenzen (Terrainform), 0..1. */
export function smoothstep01(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
