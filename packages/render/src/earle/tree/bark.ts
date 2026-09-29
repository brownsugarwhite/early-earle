import { abs, float, floor, fract, fwidth, hash, length, mix, sin, smoothstep, step, vec2 } from 'three/tsl';
import type { FloatNode, PaletteLookup, TSLUniform, Vec2Node, Vec3Node } from '../tsl';

const PI2 = Math.PI * 2;

export interface BarkShadeOptions {
  lookup: PaletteLookup;
  barkRow: number;
  lichenRow: number;
  /** Rindenkoordinaten: x = Umlauf (0..1, Naht dupliziert), y = Höhe entlang des Stamms (Bruchteil). */
  bark: Vec2Node;
  /** Umfang in Welteinheiten an der Stelle (Zahl oder Knoten, z. B. Attribut je Ring) → isotrope Zellen. */
  circumference: FloatNode | number;
  /** Länge in Welteinheiten, über die v von 0 bis 1 läuft. */
  length: number;
  /** Baum-Uhr in Sekunden (eigener Uniform statt `time`, damit die Szene sie anhalten kann). */
  clock: TSLUniform;
  /** Bänder je Umlauf (Standard 14). */
  bands?: number;
  /** Anteil der Bänder mit Flechtenstreifen (0..1, Standard 0.5). */
  lichen?: number;
  /** Haarlinien je Oberflächeneinheit (Standard 12). */
  hairlines?: number;
  /** Flecken-Zellen je Oberflächeneinheit (Standard 14 → Flecken ≈ 0,05 Einheiten). */
  lichenCells?: number;
  /** Index der Lichtkante und des seltenen Flechtenrots in der Rindenzeile. */
  edgeIndex?: number;
  redIndex?: number;
  /** Helligkeit der Flechten auf der Schattenseite (0..1, Standard 0.42). */
  lichenShadeGain?: number;
  seed?: number;
}

/** 1-px-Kante an `edge` mit vorgegebener Breite (fwidth der *stetigen* Koordinate, nicht der fract-Sprünge). */
function edge(e: FloatNode | number, x: FloatNode, w: FloatNode): FloatNode {
  const ee = typeof e === 'number' ? float(e) : e;
  return smoothstep(ee.sub(w), ee.add(w), x);
}

/**
 * Animierte, sehr feine Vektortextur der Rinde (Ebene 21/35/37):
 * 1. **Längsbänder**: schwarz-blaue Streifen, die mit der Höhe wogen; Breite je Band aus einem Hash. Lichtseite:
 *    Bänder werden zu leuchtendem Blau, Schattenseite: dunkelblau auf Tinte.
 * 2. **Haarlinien**: gestrichelte, hauchdünne Linien in Stammrichtung (Earles gekämmte Striche), weißblau in den
 *    Bändern, dunkelblau in den Zwischenräumen — nur auf der Lichtseite.
 * 3. **Flechten im Bänderfeld** (Ebene 21/35): ein Teil der Bänder trägt nahe seiner Lichtkante einen Streifen aus
 *    winzigen, hash-gestreuten Zellen (Blau/Cyan/Weiß, etwas Grün/Limette, selten Rot), der mit dem Grat wogt und
 *    entlang der Höhe zu Kolonien klumpt; `fwidth`-Antialiasing.
 * 4. **Lichtkanten**: kräftiger cyan-weißer Doppelstrich innen an den Bandkanten der Lichtseite, dazu eine Reihe
 *    heller Randpunkte.
 * Alles atmet minimal (Drift der Koordinaten, Radius der Flecken) über die Baum-Uhr.
 */
export function createBarkShade(o: BarkShadeOptions): (lit: FloatNode, ndl: FloatNode) => Vec3Node {
  const K = o.bands ?? 14;
  const lichen = Math.max(0, Math.min(1, o.lichen ?? 0.5));
  const hair = o.hairlines ?? 12;
  const cells = o.lichenCells ?? 14;
  const edgeIdx = o.edgeIndex ?? 4;
  const redIdx = o.redIndex ?? -1;
  const gain = o.lichenShadeGain ?? 0.42;
  const seed = Math.floor(o.seed ?? 1) * 97;
  const circ = typeof o.circumference === 'number' ? float(o.circumference) : o.circumference;
  const sv = o.length;
  const pal = (i: FloatNode | number, row: number) => o.lookup.pal(i, row).rgb;

  return (lit, ndl) => {
    const t = o.clock;
    const u0 = o.bark.x;
    const v0 = o.bark.y;

    // (0) Atmen: sehr subtile Drift der Koordinaten
    const u = u0.add(sin(v0.mul(7.0).add(t.mul(0.31))).mul(0.0022)).add(sin(v0.mul(2.1).sub(t.mul(0.17))).mul(0.0035));
    const v = v0.add(sin(u0.mul(PI2 * 2.0).add(t.mul(0.23))).mul(0.004));

    // (1) Längsbänder
    const wob = sin(v.mul(5.7).add(u.mul(PI2 * 2))).mul(0.2).add(sin(v.mul(13.0).sub(u.mul(PI2 * 5)).add(seed * 0.01)).mul(0.08));
    const x = u.mul(K).add(wob);
    const band = floor(x);
    const f = fract(x);
    const aaX = fwidth(x).max(1e-4);
    const hB = hash(band.add(seed + 1));
    const hB2 = hash(band.add(seed + 41));
    const w = hB.mul(0.32).add(0.24); // Breite des blauen Anteils 0.24..0.56 (Ebene 21: Tinte und Blau halten sich die Waage)
    const isBlue = float(1).sub(edge(w, f, aaX));

    const ink = pal(0, o.barkRow);
    const blueDark = pal(1, o.barkRow);
    const blue = pal(2, o.barkRow);
    const blueLight = pal(3, o.barkRow);
    const streak = pal(4, o.barkRow);

    const litBand = mix(mix(blueDark, blue, smoothstep(0.05, 0.4, ndl)), blueLight, smoothstep(0.5, 0.9, ndl));
    const shadeCol = mix(ink, blueDark, isBlue.mul(0.8));
    let col = mix(shadeCol, mix(ink, litBand, isBlue), lit);
    // Lichtkanten: kräftiger cyan-weißer Strich innen an der Bandkante, dünner Zweitstrich am Bandanfang (Ebene 21)
    // — Ornament in der Form, kein Umriss
    const edgeCol = pal(edgeIdx, o.barkRow);
    const litEdge = lit.mul(smoothstep(0.12, 0.45, ndl));
    const edgeA = float(1).sub(edge(0.03, abs(f.sub(w).add(0.045)), aaX));
    const edgeB = float(1).sub(edge(0.016, abs(f.sub(0.035)), aaX)).mul(step(0.35, hB2));
    col = mix(col, edgeCol, edgeA.mul(litEdge));
    col = mix(col, mix(blueLight, edgeCol, 0.6), edgeB.mul(litEdge).mul(0.85));

    // (2) Haarlinien in Stammrichtung, gestrichelt, driften kaum merklich
    const sU = u.mul(circ);
    const sV = v.mul(sv);
    const hx = sU.mul(hair).add(sin(sV.mul(0.9).add(hB2.mul(6.0))).mul(0.35));
    const hl = fract(hx);
    const aaH = fwidth(hx).max(1e-4);
    const line = float(1).sub(edge(0.07, abs(hl.sub(0.5)), aaH));
    const lineId = floor(hx);
    const lineOn = step(0.4, hash(lineId.add(2048).add(seed + 7)));
    const dash = smoothstep(0.15, 0.55, sin(sV.mul(1.7).add(hash(lineId.add(2048).add(seed + 9)).mul(PI2)).add(t.mul(0.05))));
    const hairMask = line.mul(dash).mul(lineOn).mul(lit);
    col = mix(col, streak, hairMask.mul(isBlue).mul(0.75));
    col = mix(col, blueDark, hairMask.mul(float(1).sub(isBlue)).mul(0.6));

    // (3) Flechten im Bänderfeld: Streifen im blauen Teil nahe der Lichtkante ausgewählter Bänder, winzige Zellen,
    //     Kolonien entlang der Höhe (dicht, dann Lücken) — folgen dem Grat, weil sie in Bandkoordinaten liegen
    const hB3 = hash(band.add(seed + 77));
    const onBand = step(hB3, float(lichen));
    const a0 = w.mul(0.28);
    const a1 = w.mul(0.93);
    const streakMask = edge(a0, f, aaX).mul(float(1).sub(edge(a1, f, aaX))).mul(onBand);
    const colony = smoothstep(0.35, 0.8, sin(sV.mul(0.33).add(hB.mul(6.3))).mul(0.3).add(sin(sV.mul(1.07).add(hB2.mul(4.1))).mul(0.25)).add(0.5));
    const bandW = circ.div(K);
    // Zellen doppelt so hoch wie breit → Flechten als senkrechte Tupfer, die zu Streifen verschmelzen
    const p = vec2(f.mul(bandW).mul(cells), sV.mul(cells * 0.55));
    const cell = floor(p);
    const cellId = cell.x.add(64).add(cell.y.add(4096).mul(128)).add(band.mul(7919)).add(seed);
    const h1 = hash(cellId);
    const h2 = hash(cellId.add(11));
    const h3 = hash(cellId.add(23));
    const h4 = hash(cellId.add(37));
    const h5 = hash(cellId.add(53));
    const cc = cell.add(0.5).add(vec2(h1, h2).sub(0.5).mul(0.6));
    const d = length(p.sub(cc));
    const r = float(0.34).add(h3.mul(0.34)).mul(sin(t.mul(0.5).add(h1.mul(PI2))).mul(0.08).add(1));
    const aaP = fwidth(p).x.max(1e-4);
    const present = step(float(0.9).sub(colony.mul(0.72)), h2);
    const lichenMask = float(1).sub(edge(r, d, aaP)).mul(present).mul(streakMask);
    let lichenCol: Vec3Node = pal(floor(h4.mul(7.99)), o.lichenRow);
    if (redIdx >= 0) lichenCol = mix(lichenCol, pal(redIdx, o.barkRow), step(0.97, h5));
    col = mix(col, lichenCol.mul(mix(float(gain), float(1), lit)), lichenMask);

    // (4) Randpunkte an den Bandkanten der Lichtseite
    const ry = sV.mul(6.0).add(hB.mul(5.0));
    const cy = floor(ry);
    const hr = hash(cy.add(2048).add(band.mul(97)).add(seed + 3));
    const dy = fract(ry).sub(0.5);
    const dx = f.sub(w).mul(circ.div(K).mul(6.0));
    const rd = length(vec2(dx, dy));
    const aaR = fwidth(ry).max(1e-4);
    const rim = float(1).sub(edge(0.22, rd, aaR)).mul(step(0.45, hr)).mul(lit).mul(smoothstep(0.3, 0.65, ndl));
    col = mix(col, streak, rim);
    return col;
  };
}
