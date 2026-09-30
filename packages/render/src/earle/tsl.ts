import { abs, clamp, float, floor, fract, fwidth, hash, int, max, mix, positionView, select, smoothstep, texture, time, uniform, vec2 } from 'three/tsl';
import type { Node, Texture, UniformNode } from 'three/webgpu';
import { AIR_ROOM_PX, earleGradients, fountain, fountain2 } from './gradients';

/** Typisierte TSL-Knoten (Swizzles und Operatoren hängen am Typparameter). */
export type FloatNode = Node<'float'>;
export type Vec2Node = Node<'vec2'>;
export type Vec3Node = Node<'vec3'>;
export type Vec4Node = Node<'vec4'>;
export type TSLUniform = UniformNode<'float', number>;
/** `uniformArray(...)` ohne die generischen Typen: Element-Zugriff über `element(int)`. */
export interface UniformArrayLike {
  element(i: unknown): FloatNode;
  array: number[];
}

/** `number` oder Float-Knoten → Float-Knoten. */
export function asFloat(v: FloatNode | number): FloatNode {
  return typeof v === 'number' ? float(v) : v;
}

/** Anti-aliasierte Stufe: 1-px-Übergang um `edge`, Breite aus `fwidth`. Kein Blur, keine Treppen. */
export function aaStep(edge: FloatNode | number, x: FloatNode): FloatNode {
  const w = fwidth(x).max(1e-4);
  const e = asFloat(edge);
  return smoothstep(e.sub(w), e.add(w), x);
}

/** Lookups in den Paletten-Atlas (Nearest-Filter, Level 0 → keine Uniformitätsprobleme in WGSL). */
export class PaletteLookup {
  constructor(
    readonly texture: Texture,
    readonly width: number,
    readonly height: number,
  ) {}

  /** Exakte Palettenfarbe (rgba) an Stufe `x`, Zeile `row`. */
  pal(x: FloatNode | number, row: FloatNode | number): Vec4Node {
    const u = asFloat(x).add(0.5).div(this.width);
    const v = asFloat(row).add(0.5).div(this.height);
    return texture(this.texture, vec2(u, v)).level(float(0)) as unknown as Vec4Node;
  }

  /**
   * Irisdruck-Rampe durch die Stufen (siehe `gradients.ts`): `soft` 0 = harte Bänder wie `bands`, 1 = weicher
   * Verlauf. Standard: der geteilte Flächen-Regler `earleGradients.surface`.
   */
  ramp(x: FloatNode, row: FloatNode | number, base: number, soft: FloatNode | number = earleGradients.surface): Vec4Node {
    return fountain(this, x, row, base, soft);
  }

  /**
   * Bänder: `x` ist ein kontinuierlicher Bandwert (0 .. steps-1). Innerhalb eines Bandes liegt die exakte
   * Palettenfarbe `base + floor(x)`; nur an der Bandgrenze wird ~1 px zur nächsten Stufe geblendet.
   */
  bands(x: FloatNode, row: FloatNode | number, base: number): Vec4Node {
    const i = floor(x);
    // fwidth kann 0 sein (x konstant, z. B. geclampt) → smoothstep(1, 1, …) wäre undefiniert
    const w = fwidth(x).max(1e-4);
    const t = smoothstep(float(1).sub(w), float(1), fract(x));
    return mix(this.pal(i.add(base), row), this.pal(i.add(base + 1), row), t);
  }
}

/** Gestufter Distanznebel (4–6 Stufen) aus der Nebelzeile des Atlas. */
export interface FogSettings {
  row: TSLUniform;
  /** Zweite Nebelzeile (Nachbarzone) und Mischung 0..1 für weiche Zonenübergänge. */
  rowB: TSLUniform;
  mix: TSLUniform;
  steps: TSLUniform;
  start: TSLUniform;
  /** 1 / Nebelstrecke (Welteinheiten von start bis volle Stufe). */
  invRange: TSLUniform;
}

export function createFogSettings(init: { row: number; rowB?: number; steps: number; start: number; range: number }): FogSettings {
  return {
    row: uniform(init.row),
    rowB: uniform(init.rowB ?? init.row),
    mix: uniform(0),
    steps: uniform(init.steps),
    start: uniform(init.start),
    invRange: uniform(1 / init.range),
  };
}

/** Anteil des Verlaufs in den Nebelstufen (1 = ganz weich, 0 = harte Stufen): ein Rest der Stufe bleibt als Band. */
export const FOG_SOFTNESS = 0.85;

/**
 * Luftperspektive: mischt `color` nach Distanz zur Kamera mit der Nebelfarbe (Alpha der Nebelzeile = Nebelanteil).
 * Die Nebelstufen bleiben als ferne Wertstufen erhalten, laufen aber innen weich zur nächsten (Irisdruck, siehe
 * `fountain`; `earleGradients.air` 0 = harte Stufen wie früher). Silhouetten (ein naher Hügel vor einem fernen)
 * bleiben dabei harte Wertsprünge — Earles gestaffelte Hügelbänder. `dist` optional (Standard: Länge von positionView).
 */
export function steppedFog(color: Vec3Node, fog: FogSettings, lookup: PaletteLookup, dist?: FloatNode): Vec3Node {
  const d = dist ?? positionView.length();
  const x = clamp(d.sub(fog.start).mul(fog.invRange), 0, 0.999).mul(fog.steps.sub(1));
  // Die fernste Stufe bleibt flach (wie bisher: Schleier über Nachbarwelten und Horizont in derselben Wertstufe),
  // die näheren Stufen laufen zur jeweils nächsten
  const soft = earleGradients.air.mul(FOG_SOFTNESS);
  const top = fog.steps.sub(2);
  // Nachlauf ¾ Stufe: der Mittelgrund bleibt satt (Earles klare Wertstufen), erst zur nächsten Stufe hin wird es neblig
  const air = { maxX: top, roomPx: AIR_ROOM_PX, linear: true, lag: 0.75 };
  const f = fountain2(lookup, x, fog.row, fog.rowB, fog.mix, 0, soft, air);
  return mix(color, f.rgb, f.a);
}

// --- Feine Vektortexturen (Streifen, Schraffur, Flechten) --------------------------------------------------
// Alle Muster laufen über eine Objekt-/Planetenraum-Koordinate (nie Screen-Space, sonst schwimmen sie beim Rollen),
// werden mit `fwidth` auf genau eine Bildschirmpixel-Kante anti-aliasiert und blenden aus, sobald die Periode unter
// ~2 px fällt (kein Moiré). Die Zeit kommt aus dem geteilten `patternTime`-Knoten (langsam, Sekunden).

/** Gemeinsame, langsame Zeit für Musterdrift (Sekunden × Geschwindigkeit). */
export const patternSpeed = uniform(1);
export const patternTime = time.mul(patternSpeed);

/** Fade 1 → 0, wenn die Periode `coord` (in Perioden) auf dem Bildschirm zu fein wird. */
export function periodFade(coord: FloatNode, minPeriodPx = 2.5): FloatNode {
  // fwidth(coord) = Perioden pro Pixel; 1/minPeriodPx Perioden pro Pixel ist die Grenze
  const fw = fwidth(coord).max(1e-5);
  return smoothstep(float(1 / minPeriodPx), float(1 / (minPeriodPx * 2.2)), fw);
}

/**
 * Parallele Linien: `coord` in Perioden (1 = eine Linie), `width` = Linienbreite als Anteil der Periode (0..1).
 * Liefert 0..1 (1 = auf der Linie), mit 1-px-AA und Moiré-Fade.
 */
export function stripeMask(coord: FloatNode, width: FloatNode | number): FloatNode {
  const f = fract(coord);
  const dist = abs(f.sub(0.5)); // 0 in der Periodenmitte, 0.5 am Rand
  const half = asFloat(width).mul(0.5);
  const fw = fwidth(coord).max(1e-5);
  const line = smoothstep(half.add(fw), half.sub(fw), dist);
  return line.mul(periodFade(coord));
}

/** Schraffur: Streifen mit Unterbrechungen (zweite Frequenz quer dazu) → kurze parallele Striche wie bei Earle. */
export function hatchMask(coord: FloatNode, across: FloatNode, width: FloatNode | number, gaps: FloatNode | number = 0.35): FloatNode {
  const lines = stripeMask(coord, width);
  const cell = floor(across);
  const h = hash(cell.add(floor(coord).mul(17.0)));
  const broken = select(h.lessThan(asFloat(gaps)), float(0), float(1));
  // Strichlänge ist die Zellenlänge quer: an den Zellgrenzen kurz ausblenden
  const g = fract(across);
  const ends = smoothstep(0.0, 0.08, g).mul(smoothstep(1.0, 0.92, g));
  return lines.mul(broken).mul(ends);
}

/**
 * Flechten-Mosaik: Zellen einer Kachelung mit gehashter Farbe (0..1) und Lückenmaske. `cellsU/V` in Zellen,
 * `fill` = Anteil belegter Zellen. Rückgabe: {mask 0..1, key 0..1 je Zelle}.
 */
export function lichenCells(u: FloatNode, v: FloatNode, fill: FloatNode | number, seed: FloatNode | number = 0): { mask: FloatNode; key: FloatNode } {
  const cu = floor(u);
  const cv = floor(v);
  const key = hash(cu.mul(53.0).add(cv.mul(911.0)).add(asFloat(seed).mul(7.0)));
  const key2 = hash(cu.mul(31.0).add(cv.mul(197.0)).add(asFloat(seed).mul(13.0)).add(3.0));
  const inside = select(key2.lessThan(asFloat(fill)), float(1), float(0));
  // Zellrand leicht abrunden: Kreis/Abstand zur Zellmitte
  const du = fract(u).sub(0.5);
  const dv = fract(v).sub(0.5);
  const r = max(abs(du), abs(dv));
  const fw = fwidth(u).add(fwidth(v)).mul(0.5).max(1e-5);
  const shape = smoothstep(float(0.5).add(fw), float(0.42).sub(fw), r);
  const fade = periodFade(u, 1.8).mul(periodFade(v, 1.8));
  return { mask: inside.mul(shape).mul(fade), key };
}

/** Farbe aus einer Palettenzeile nach einem Zufallsschlüssel 0..1 zwischen den Indizes `from..to`. */
export function palByKey(lookup: PaletteLookup, key: FloatNode, row: FloatNode | number, from: number, to: number): Vec3Node {
  const idx = floor(key.mul(to - from + 1)).clamp(0, to - from).add(from);
  return lookup.pal(idx, row).rgb;
}

/** Ganzzahl-Element eines Float-Uniform-Arrays (Index-Knoten wird gerundet). */
export function arrayElement(arr: UniformArrayLike, index: FloatNode): FloatNode {
  return arr.element(int(index.add(0.5).floor()));
}
