import { abs, float, floor, fract, fwidth, hash, length, max, mix, sin, smoothstep, step, vec2, vec3 } from 'three/tsl';
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
  /** Flechten-Adern (0–4, Standard 3). */
  lichenStrips?: number;
  /** Haarlinien je Oberflächeneinheit (Standard 12). */
  hairlines?: number;
  /** Flecken-Zellen je Oberflächeneinheit (Standard 8 → Flecken ≈ 0,1 Einheiten). */
  lichenCells?: number;
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
 * 3. **Flechten-Adern**: 2–4 senkrechte Adern mit hash-gestreuten Flecken (Rot/Grün/Gelb/Weiß/Türkis), Radien so
 *    groß, dass Nachbarn zu Klumpen verschmelzen; `fwidth`-Antialiasing.
 * 4. **Randpunkte**: Reihe heller Punkte an den Bandkanten der Lichtseite.
 * Alles atmet minimal (Drift der Koordinaten, Radius der Flecken) über die Baum-Uhr.
 */
export function createBarkShade(o: BarkShadeOptions): (lit: FloatNode, ndl: FloatNode) => Vec3Node {
  const K = o.bands ?? 14;
  const strips = Math.max(0, Math.min(4, o.lichenStrips ?? 3));
  const hair = o.hairlines ?? 12;
  const cells = o.lichenCells ?? 8;
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
    const shadeCol = mix(ink, blueDark, isBlue.mul(0.55));
    let col = mix(shadeCol, mix(ink, litBand, isBlue), lit);
    // Lichtkante: feiner weißblauer Strich innen an der Bandkante (Ebene 21) — Ornament in der Form, kein Umriss
    const edgeD = abs(f.sub(w).add(0.035));
    const edgeLine = float(1).sub(edge(0.022, edgeD, aaX)).mul(lit).mul(smoothstep(0.2, 0.55, ndl));
    col = mix(col, mix(blueLight, streak, 0.6), edgeLine);

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

    // (3) Flechten-Adern mit verschmelzenden Flecken; Breite in Welteinheiten (am Wurzelanlauf bleiben es Adern),
    //     Dichte klumpt entlang der Höhe (Flecken-Kolonien und Lücken statt eines gleichmäßigen Bandes)
    let lichenMask: FloatNode = float(0);
    let lichenCol: Vec3Node = vec3(0, 0, 0);
    const aaU = fwidth(u).max(1e-4);
    for (let i = 0; i < strips; i++) {
      const c = (i + 0.5) / strips + (i % 2 ? 0.07 : -0.05);
      const centre = float(c).add(sin(v.mul(3.7).add(i * 2.3)).mul(0.05)).add(sin(v.mul(11.0).sub(i)).mul(0.012));
      const patch = smoothstep(0.25, 0.8, sin(sV.mul(0.47).add(i * 1.7 + seed * 0.013)).mul(0.5).add(sin(sV.mul(1.31).sub(i * 0.9)).mul(0.3)).add(0.5));
      const hwWorld = float(0.55).add(sin(v.mul(6.1).add(i)).mul(0.18)).mul(patch.mul(0.85).add(0.4));
      const hw = hwWorld.div(circ);
      const du = fract(u.sub(centre).add(0.5)).sub(0.5);
      const strip = float(1).sub(edge(hw, abs(du), aaU));
      const p = vec2(du.mul(circ).mul(cells), sV.mul(cells));
      const cell = floor(p);
      const cellId = cell.x.add(2048).add(cell.y.add(2048).mul(4096)).add(i * 131 + seed);
      const h1 = hash(cellId);
      const h2 = hash(cellId.add(11));
      const h3 = hash(cellId.add(23));
      const h4 = hash(cellId.add(37));
      const cc = cell.add(0.5).add(vec2(h1, h2).sub(0.5).mul(0.7));
      const d = length(p.sub(cc));
      const r = float(0.3).add(h3.mul(0.34)).mul(sin(t.mul(0.5).add(h1.mul(PI2))).mul(0.1).add(1));
      const aaP = fwidth(p).x.max(1e-4);
      const present = step(float(0.75).sub(patch.mul(0.6)), h2);
      const m = float(1).sub(edge(r, d, aaP)).mul(present).mul(strip);
      const ci = pal(floor(h4.mul(7.99)), o.lichenRow);
      lichenCol = mix(lichenCol, ci, m);
      lichenMask = max(lichenMask, m);
    }
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
