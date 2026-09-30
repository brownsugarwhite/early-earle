import { clamp, cross, dot, float, floor, fract, fwidth, max, mix, screenCoordinate, smoothstep, sqrt, uniform, vec2, vec3, vec4 } from 'three/tsl';
import type { FloatNode, PaletteLookup, Vec3Node, Vec4Node } from './tsl';

/**
 * Earle-Verläufe: Siebdruckstufen mit Verlauf innen (Florian, 2026-09-30: „Earle benutzt Cel-Shading zusammen mit den
 * Verläufen … große gleichfarbige Flächen wie Wiesen, Schnee und Wüste bekommen zusätzlich einen Verlauf“).
 *
 * Earles Serigrafien sind Schichten mit messerscharfen Kanten, und jede Schicht trägt ihren eigenen Verlauf (Irisdruck
 * pro Sieb): die Wiese in Ebene 20 ist eine harte Form und läuft in sich von Grün nach Gelb, die fernen Hügelbänder in
 * Ebene 19 sind je am Kamm hell und am Fuß tief, die Facetten des Monolithen in Ebene 45 bleiben hart und die rote
 * Fläche verläuft darin. **Der Verlauf läuft nie über eine Stufenkante**: die Stufen der Lichtbänder, des Himmels und
 * der Luftperspektive bleiben genau wie im Siebdruck (`verlauf=0`), der Verlauf liegt nur innerhalb jeder Stufe und
 * erreicht höchstens ≈ 30–45 % des Abstands zur Nachbarstufe — jede Kante bleibt ein sichtbarer harter Sprung.
 *
 * Das Vokabular (alles ALU, keine Pässe, keine Texturen außer dem Paletten-Atlas):
 * - `stepRamp` — harte Palettenstufe (exakte Farbe, 1-px-Kante wie `PaletteLookup.bands`) plus Verlauf innen nach einer
 *   großräumigen Koordinate `g` ∈ [−1, 1] (Kamm → Tal, Hang zur Sonne, Tiefe, oben → unten) oder als Sägezahn je Stufe
 *   (`saw`: Himmelsbänder, Wertstufen der Luftperspektive — jede Stufe verläuft in sich, dann der Sprung);
 * - `shiftTone` — Farbe innerhalb ihrer Fläche zum helleren bzw. dunkleren Nachbarton schieben (Wasser, Muster-Flächen);
 * - `mixInk` — Mischung wie gedruckte Farbe (≈ sRGB/Gamma 2), nicht das zu helle Linear-Licht-Mischen;
 * - `aaSaw` — anti-aliasierter Sägezahn (Meißelschichten im Bandwert);
 * - `glow` — radialer Airbrush-Schein (Sonnenschein am Himmel, dezent);
 * - `hueRotate` — Farbton-Drehung um die Grauachse (Juwelenkuppeln, innerhalb ihrer Facetten);
 * - `dither` — ±½ LSB Rauschen im Bildraum gegen 8-Bit-Treppen in den Himmelsverläufen.
 *
 * Die Stärke hängt an drei geteilten Uniforms (ändern ohne Neukompilieren, Earle-Lab-Regler „Verläufe“, `?verlauf=`):
 * `earleGradients.surface` (Flächen), `.air` (Himmel, Luftperspektive, Nebelbänke), `.dither`. 0 = reiner Siebdruck
 * (die harten Stufen allein), 1 = Stufen plus Verlauf innen.
 */
export const earleGradients = {
  /** Flächen (Gelände, Kronen, Fels, Wasser, Scheune, Müll, Pfad, Plateau): 0 = nur Stufen, 1 = Stufen + Verlauf innen. */
  surface: uniform(1),
  /** Himmel, Luftperspektive, Nebelbänke: 0 = nur Stufen (alt), 1 = Stufen + Verlauf innen. */
  air: uniform(1),
  /** Rauschen gegen 8-Bit-Stufen (0 = aus, 1 = ±½ LSB). */
  dither: uniform(1),
};

/**
 * Wie weit der Verlauf innerhalb einer Stufe höchstens zum Nachbarton reicht (Anteil des Abstands zur Nachbarstufe).
 * Großräumige Verläufe (Kamm → Tal) laufen über beide Seiten einer Kante gleich — die Kante behält ihren vollen Sprung.
 */
export const STEP_GRADIENT = 0.4;
/**
 * Sägezahn je Stufe (Himmel, Luftperspektive): ± dieser Anteil um die Stufenfarbe; der Sprung an der Kante bleibt
 * (1 − 2·Anteil) des Stufenabstands, bei 0,2 also 60 %.
 */
export const SAW_GRADIENT = 0.2;

/** Alle Verläufe auf einmal stellen (Lab-Regler, URL): 0 = reiner Siebdruck (nur Stufen), 1 = Stufen + Verlauf innen. */
export function setGradientAmount(amount: number): void {
  const a = Math.min(1, Math.max(0, amount));
  earleGradients.surface.value = a;
  earleGradients.air.value = a;
}

function asNode(v: FloatNode | number): FloatNode {
  return typeof v === 'number' ? float(v) : v;
}

/**
 * Mischung wie Druckfarbe: in √-Raum (≈ sRGB-Gamma) statt Linear-Licht. `t` darf über 0..1 hinausgehen (ein Verlauf,
 * der über die Stufe hinaus gedacht ist); das Ergebnis bleibt ≥ 0.
 */
export function mixInk(a: Vec3Node, b: Vec3Node, t: FloatNode | number): Vec3Node {
  const s = max(mix(sqrt(a.max(0)), sqrt(b.max(0)), asNode(t)), vec3(0, 0, 0));
  return s.mul(s) as unknown as Vec3Node;
}

/** Optionen von `stepRamp`. */
export interface StepRampOptions {
  /**
   * Sägezahn je Stufe statt großräumiger Koordinate: der Verlauf beginnt in jeder Stufe neu (−1 am Stufenanfang, +1 am
   * Ende) und springt an der Kante zurück — Himmelsbänder und Wertstufen der Luftperspektive. `g` wird dann ignoriert.
   */
  saw?: boolean;
  /** Linear mischen statt wie Druckfarbe (billiger; Himmel und Luft, deren Stufen nah beieinander liegen). */
  linear?: boolean;
}

/**
 * Siebdruckstufe mit Verlauf innen. `x` ist der kontinuierliche Stufenwert (0 … n−1) ab Palettenstufe `base`: innerhalb
 * einer Stufe liegt ihre exakte Palettenfarbe, an der Kante ≈ 1 px Übergang zur nächsten (wie `PaletteLookup.bands`).
 * Dazu der Verlauf: `g` ∈ [−1, 1] (großräumig, z. B. Kamm → Tal) schiebt die Farbe um `g · amount` des Abstands zur
 * nächsten Stufe (g > 0) bzw. von ihr weg (g < 0). Weil `g` auf beiden Seiten einer Kante gleich ist, bleibt der Sprung
 * dort voll erhalten. Mit `saw` läuft der Verlauf je Stufe als Sägezahn (siehe `StepRampOptions`). `amount` 0 ergibt
 * exakt die harten Stufen. Zwei Nearest-Lookups wie `bands`; Alpha (Nebelanteil) läuft mit.
 */
export function stepRamp(lookup: PaletteLookup, x: FloatNode, row: FloatNode | number, base: number, g: FloatNode | number, amount: FloatNode | number, options: StepRampOptions = {}): Vec4Node {
  const { i, t } = stepMix(x, g, amount, options);
  const a = lookup.pal(i.add(base), row);
  const b = lookup.pal(i.add(base + 1), row);
  return blend(a, b, t, options);
}

/**
 * `stepRamp` für zwei Palettenzeilen, gemischt mit `k` (z. B. Nebel der Blick-Welt A und B während der Überblendung):
 * Stufe und Verlauf werden einmal gerechnet, nur die Lookups doppeln sich.
 */
export function stepRamp2(
  lookup: PaletteLookup,
  x: FloatNode,
  rowA: FloatNode | number,
  rowB: FloatNode | number,
  k: FloatNode | number,
  base: number,
  g: FloatNode | number,
  amount: FloatNode | number,
  options: StepRampOptions = {},
): Vec4Node {
  const { i, t } = stepMix(x, g, amount, options);
  const a = mix(lookup.pal(i.add(base), rowA), lookup.pal(i.add(base), rowB), asNode(k)) as unknown as Vec4Node;
  const b = mix(lookup.pal(i.add(base + 1), rowA), lookup.pal(i.add(base + 1), rowB), asNode(k)) as unknown as Vec4Node;
  return blend(a, b, t, options);
}

/**
 * Stufe `i` und Mischwert `t` zwischen Stufe i und i+1: harte Kante (1 px) plus Verlauf. An der Kante wird zwischen dem
 * Verlauf am Ende der Stufe und dem am Anfang der nächsten überblendet — kein Überschwingen, keine Lichtlinie.
 */
function stepMix(x: FloatNode, g: FloatNode | number, amount: FloatNode | number, options: StepRampOptions): { i: FloatNode; t: FloatNode } {
  const i = floor(x);
  const f = x.sub(i);
  // fwidth kann 0 sein (x konstant, z. B. geclampt) → smoothstep(1, 1, …) wäre undefiniert
  const w = fwidth(x).max(1e-4);
  const edge = smoothstep(float(1).sub(w), float(1), f);
  const a = asNode(amount);
  if (options.saw) {
    // −1 am Stufenanfang … +1 am Ende; an der Kante zum Anfang der nächsten Stufe (1 − a)
    const inner = f.mul(2).sub(1).mul(a);
    return { i: i as unknown as FloatNode, t: mix(inner, float(1).sub(a), edge) as unknown as FloatNode };
  }
  // Zur dunkleren Seite 70 %: der Abstand zur tieferen Stufe wird aus dem zur helleren geschätzt (ein Lookup weniger),
  // so bleibt der Verlauf auch bei ungleichen Stufen unter ≈ 45 % und die Lichtfläche weit weg von der Tinte
  const gn = asNode(g);
  const shift = gn.max(0).add(gn.min(0).mul(0.7)).mul(a);
  return { i: i as unknown as FloatNode, t: edge.add(shift) as unknown as FloatNode };
}

function blend(a: Vec4Node, b: Vec4Node, t: FloatNode, options: StepRampOptions): Vec4Node {
  const rgb = options.linear ? max(mix(a.rgb, b.rgb, t), vec3(0, 0, 0)) : mixInk(a.rgb as unknown as Vec3Node, b.rgb as unknown as Vec3Node, t);
  return vec4(rgb, mix(a.a, b.a, clamp(t, 0, 1))) as unknown as Vec4Node;
}

/**
 * Farbe innerhalb ihrer Fläche verschieben: `g` > 0 zum helleren Ton `lighter`, `g` < 0 zum dunkleren `darker`, um
 * höchstens `amount` (wie `stepRamp`, für Flächen, deren Farbe aus einem Muster kommt: Wasser, Plateau).
 */
export function shiftTone(c: Vec3Node, lighter: Vec3Node, darker: Vec3Node, g: FloatNode, amount: FloatNode | number): Vec3Node {
  const k = g.mul(asNode(amount));
  return mixInk(c, mix(darker, lighter, k.greaterThan(0).select(float(1), float(0))) as unknown as Vec3Node, k.abs());
}

/**
 * Anti-aliasierter Sägezahn 0 → 1 je Periode: steigt innerhalb der Periode an und fällt an ihrer Kante in genau einem
 * Bildschirmpixel zurück (keine Treppe). Für Meißelschichten im Bandwert.
 */
export function aaSaw(x: FloatNode): FloatNode {
  const f = fract(x);
  const w = fwidth(x).max(1e-4);
  return f.sub(smoothstep(float(1).sub(w), float(1), f)) as unknown as FloatNode;
}

/**
 * Radialer Schein 1 → 0 zwischen `inner` und `outer` (Abstand `d`), quadratisch ausklingend wie ein Airbrush
 * (Sonnenschein am Himmel).
 */
export function glow(d: FloatNode, inner: FloatNode | number, outer: FloatNode | number): FloatNode {
  const g = smoothstep(asNode(outer), asNode(inner), d);
  return g.mul(g) as unknown as FloatNode;
}

/**
 * Farbton-Drehung um die Grauachse (Rodrigues) mit Kosinus und Sinus des Winkels (positiv = Rot → Gelb → Grün).
 * Juwelenkuppeln (Bild 02) drehen zur Unterseite hin negativ: Rot → Magenta → Violett. `cs`/`sn` am besten je Vertex
 * rechnen und interpolieren (der Winkel ändert sich langsam); die Drehung selbst ist ein paar Multiplikationen. Direkt
 * im Linearraum (billig; die Helligkeit bleibt, die Sättigung ändert sich leicht). Sie verschiebt nur den Farbton,
 * nie den Wert — die Facettenkanten bleiben harte Sprünge.
 */
export function hueRotate(c: Vec3Node, cs: FloatNode, sn: FloatNode): Vec3Node {
  const k = vec3(0.57735027, 0.57735027, 0.57735027);
  const r = c.mul(cs).add(cross(k, c).mul(sn)).add(k.mul(dot(k, c)).mul(float(1).sub(cs)));
  return max(r, vec3(0, 0, 0)) as unknown as Vec3Node;
}

/**
 * Gegen 8-Bit-Treppen in den Himmelsverläufen: Interleaved-Gradient-Noise im Bildraum (stabil, schwimmt nicht mit dem
 * Planeten), Amplitude ±½ LSB der sRGB-Ausgabe. Die Farbe ist Linear-Licht, 1 LSB entspricht dort ≈ 2,2·√c / 255.
 * Unsichtbar als Muster — nur die Treppen verschwinden (Earles eigenes Korn sind feine Punkte; die bleiben Ornament).
 */
export function dither(color: Vec3Node, amount: FloatNode | number = earleGradients.dither): Vec3Node {
  const p = screenCoordinate.xy;
  const n = fract(float(52.9829189).mul(fract(dot(p, vec2(0.06711056, 0.00583715)))));
  const lsb = sqrt(color.max(1e-4)).mul(2.2 / 255);
  return color.add(lsb.mul(n.sub(0.5)).mul(asNode(amount))) as unknown as Vec3Node;
}
