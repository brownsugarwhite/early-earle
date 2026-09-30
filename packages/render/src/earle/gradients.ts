import { cross, dot, float, floor, fract, fwidth, max, mix, screenCoordinate, smoothstep, sqrt, uniform, vec2, vec3, vec4 } from 'three/tsl';
import type { FloatNode, PaletteLookup, Vec3Node, Vec4Node } from './tsl';

/**
 * Earle-Verläufe (Florian, 2026-09-30: „Earle arbeitet bei seinen Flächen fast immer mit Verläufen“).
 *
 * Earles Serigrafien sind flache, messerscharf begrenzte Formen — aber *innerhalb* einer Form läuft die Farbe oft als
 * Irisdruck (Split Fountain, Airbrush) weich von einem Ton zum nächsten: Himmel vom hellen Horizont in den tiefen
 * Zenit, Hügel vom hellen Kamm ins tiefere Tal, Nebelbänke hell an ihrem Fuß, die Scheunenwand glühend aus der Mitte,
 * Kuppeln rot → violett → blau, Schnee von Creme in gesättigtes Blau, Fels zum Fuß hin dunkler, Wasser vom Ufer in
 * die Tiefe. Die Kanten (Silhouette, Terminator, Schlagschatten) bleiben die eine harte Tintenform.
 *
 * Dieses Modul ist das gemeinsame Vokabular dafür (alles ALU, keine Pässe, keine Texturen außer dem Paletten-Atlas):
 * - `fountain` — Irisdruck durch die Palettenstufen: 0 = harte Siebdruckstufen (alt), 1 = weicher Verlauf, dazwischen
 *   Bänder, die innen verlaufen; zu schmale Stufen (Ferne) bleiben hart. Der Stufenwert selbst trägt die Richtung des
 *   Verlaufs: Licht (N·L, auch über eine breite Verlaufsnormale), Kamm → Tal (Höhe), Distanz (Luftperspektive);
 * - `mixInk` — Mischung wie gedruckte Farbe (≈ sRGB/Gamma 2), nicht das zu helle Linear-Licht-Mischen;
 * - `aaSaw` — anti-aliasierter Sägezahn (Verlauf innerhalb einer Stufe, 1-px-Kante an der Stufe: Meißelhänge);
 * - `glow` — radialer Airbrush-Schein (Scheunenwand, Sonnenschein am Himmel);
 * - `hueRotate` — Farbton-Drehung um die Grauachse (Juwelenkuppeln: Rot oben, Violett/Blau unten);
 * - `dither` — ±½ LSB Rauschen im Bildraum gegen 8-Bit-Treppen in großen, flachen Verläufen (Himmel).
 *
 * Die Stärke hängt an drei geteilten Uniforms (ändern ohne Neukompilieren, Earle-Lab-Regler „Verläufe“, `?verlauf=`):
 * `earleGradients.surface` (Flächen), `.air` (Himmel, Luftperspektive, Nebelbänke), `.dither`.
 */
export const earleGradients = {
  /** Flächen (Gelände, Kronen, Fels, Wasser, Scheune, Müll, Pfad): 0 = harte Stufen, 1 = Verlauf. */
  surface: uniform(1),
  /** Himmel und Luftperspektive: 0 = gestuft (alt), 1 = weich. */
  air: uniform(1),
  /** Rauschen gegen 8-Bit-Stufen (0 = aus, 1 = ±½ LSB). */
  dither: uniform(1),
};

/** Alle Verläufe auf einmal stellen (Lab-Regler, URL): 0 = alter Siebdruck-Look mit harten Stufen, 1 = Verläufe. */
export function setGradientAmount(amount: number): void {
  const a = Math.min(1, Math.max(0, amount));
  earleGradients.surface.value = a;
  earleGradients.air.value = a;
}

function asNode(v: FloatNode | number): FloatNode {
  return typeof v === 'number' ? float(v) : v;
}

/**
 * Mischung wie Druckfarbe: in √-Raum (≈ sRGB-Gamma) statt Linear-Licht. Linear gemischt wird ein Verlauf von Tinte zu
 * Hell sofort grell; so verteilen sich die Töne gleichmäßig wie auf der Palette (Florians Stufen sind in sRGB gewählt).
 */
export function mixInk(a: Vec3Node, b: Vec3Node, t: FloatNode | number): Vec3Node {
  const s = mix(sqrt(a.max(0)), sqrt(b.max(0)), asNode(t));
  return s.mul(s) as unknown as Vec3Node;
}

/**
 * Pixel je Stufe: darunter kehrt ein Verlauf ganz zur harten Stufe zurück, darüber ist er voll weich. Flächen (Hügel,
 * Kuppeln) vertragen kurze Verläufe; die Luftperspektive braucht mehr Raum, sonst wird der ferne Boden am Horizont zu
 * einem weichen Lichthof statt zu klaren, gestaffelten Wertstufen.
 */
export const GRADIENT_ROOM_PX: readonly [number, number] = [10, 32];
export const AIR_ROOM_PX: readonly [number, number] = [24, 90];

/** Optionen der Irisdruck-Rampe. */
export interface FountainOptions {
  /** Höchster Stufenwert (Standard offen). */
  maxX?: FloatNode | number;
  /** Platzbedarf in Pixeln je Stufe: [ganz hart, ganz weich] (Standard `GRADIENT_ROOM_PX`). */
  roomPx?: readonly [number, number];
  /** Linear mischen statt wie Druckfarbe (billiger; für Luft/Nebel, deren Stufen nah beieinander liegen). */
  linear?: boolean;
  /**
   * Nachlauf des Verlaufs in Stufen (Standard 0.5 = zentriert: Bandmitte = Palettenfarbe). Größer = der Verlauf erreicht
   * jede Stufe später (Luftperspektive: Mittelgrund satter, die Ferne wird trotzdem voll neblig). Die harte Stufe
   * (soft 0) bleibt unabhängig davon an der alten Bandgrenze.
   */
  lag?: number;
}

/**
 * Irisdruck-Rampe durch eine Palettenzeile: `x` ist der kontinuierliche Stufenwert (0 … n−1), gelesen ab Stufe
 * `base`. `soft` 0 = harte Siebdruckstufe (exakte Palettenfarbe, 1-px-Übergang — wie das alte `bands`), 1 = weicher
 * Verlauf von Stufe zu Stufe (gemischt wie Druckfarbe).
 *
 * - **Bandmitten**: In der Mitte jedes alten Bandes liegt genau seine Palettenfarbe, dazwischen läuft sie zur
 *   Nachbarstufe — gleiche Helligkeit im Mittel wie die harten Stufen, nur ohne Kanten. Die harte Stufe (soft 0) liegt
 *   exakt auf den alten Bandgrenzen; beide Darstellungen stimmen in den Bandmitten überein und lassen sich nahtlos mischen.
 * - **Platz**: Ein Verlauf braucht Raum. Wird eine Stufe auf dem Bildschirm schmaler als ≈ 32 px (streifender Blick auf
 *   fernen Boden, Silhouetten kleiner Kronen), kehrt die Rampe weich zur harten Stufe zurück (≤ 10 px: ganz hart) —
 *   sonst sähe der zusammengedrückte Verlauf wie Unschärfe aus. So bleibt die Ferne grafisch klar, die großen Flächen
 *   werden weich.
 *
 * Zwei Nearest-Lookups wie bisher; Alpha (Nebelanteil) wird linear gemischt.
 */
export function fountain(lookup: PaletteLookup, x: FloatNode, row: FloatNode | number, base: number, soft: FloatNode | number, options: FountainOptions = {}): Vec4Node {
  const roomPx = options.roomPx ?? GRADIENT_ROOM_PX;
  const fw = fwidth(x);
  const room = smoothstep(float(1 / roomPx[0]), float(1 / roomPx[1]), fw);
  const s = asNode(soft).mul(room);
  // um den Nachlauf verschoben (Standard ½: Bandmitte = Palettenfarbe); die harte Stufe springt bei t = 1 − Nachlauf,
  // also genau an der alten Bandgrenze
  const lag = options.lag ?? 0.5;
  let xe = x.sub(lag).max(0);
  if (options.maxX !== undefined) xe = xe.min(asNode(options.maxX));
  const i = floor(xe);
  const t = xe.sub(i);
  // fwidth kann 0 sein (x konstant, z. B. geclampt) → smoothstep(a, a, …) wäre undefiniert
  const w = fw.max(1e-4).mul(0.5);
  const edge = smoothstep(float(1 - lag).sub(w), float(1 - lag).add(w), t);
  const k = mix(edge, t, s);
  const a = lookup.pal(i.add(base), row);
  const b = lookup.pal(i.add(base + 1), row);
  const rgb = options.linear ? mix(a.rgb, b.rgb, k) : mixInk(a.rgb as unknown as Vec3Node, b.rgb as unknown as Vec3Node, k);
  return vec4(rgb, mix(a.a, b.a, k)) as unknown as Vec4Node;
}

/**
 * Anti-aliasierter Sägezahn 0 → 1 je Periode: steigt innerhalb der Periode an und fällt an ihrer Kante in genau einem
 * Bildschirmpixel zurück (keine Treppe). Für „Stufen, die innen verlaufen“ in einem Bandwert (Meißelhänge).
 */
export function aaSaw(x: FloatNode): FloatNode {
  const f = fract(x);
  const w = fwidth(x).max(1e-4);
  return f.sub(smoothstep(float(1).sub(w), float(1), f)) as unknown as FloatNode;
}

/**
 * Radialer Glutverlauf 1 → 0 zwischen `inner` und `outer` (Abstand `d`), quadratisch ausklingend wie ein Airbrush:
 * Scheunenwand aus der Mitte, Sonnenschein am Horizont.
 */
export function glow(d: FloatNode, inner: FloatNode | number, outer: FloatNode | number): FloatNode {
  const g = smoothstep(asNode(outer), asNode(inner), d);
  return g.mul(g) as unknown as FloatNode;
}

/**
 * Farbton-Drehung um die Grauachse (Rodrigues) mit Kosinus und Sinus des Winkels (positiv = Rot → Gelb → Grün).
 * Juwelenkuppeln (Bild 02) drehen zur Unterseite hin negativ: Rot → Magenta → Violett → Blau. `cs`/`sn` am besten je
 * Vertex rechnen und interpolieren (der Winkel ändert sich langsam); die Drehung selbst ist ein paar Multiplikationen.
 * Direkt im Linearraum (billig; die Helligkeit bleibt, die Sättigung ändert sich leicht).
 */
export function hueRotate(c: Vec3Node, cs: FloatNode, sn: FloatNode): Vec3Node {
  const k = vec3(0.57735027, 0.57735027, 0.57735027);
  const r = c.mul(cs).add(cross(k, c).mul(sn)).add(k.mul(dot(k, c)).mul(float(1).sub(cs)));
  return max(r, vec3(0, 0, 0)) as unknown as Vec3Node;
}

/**
 * Gegen 8-Bit-Treppen in großen, weichen Verläufen (Himmel): Interleaved-Gradient-Noise im Bildraum
 * (stabil, schwimmt nicht mit dem Planeten), Amplitude ±½ LSB der sRGB-Ausgabe. Die Farbe ist Linear-Licht, 1 LSB
 * entspricht dort ≈ 2,2·√c / 255. Unsichtbar als Muster — nur die Stufen verschwinden (Earles eigenes Korn sind feine
 * Punkte, nie Rauschen; die Punkte bleiben Ornament).
 */
export function dither(color: Vec3Node, amount: FloatNode | number = earleGradients.dither): Vec3Node {
  const p = screenCoordinate.xy;
  const n = fract(float(52.9829189).mul(fract(dot(p, vec2(0.06711056, 0.00583715)))));
  const lsb = sqrt(color.max(1e-4)).mul(2.2 / 255);
  return color.add(lsb.mul(n.sub(0.5)).mul(asNode(amount))) as unknown as Vec3Node;
}

