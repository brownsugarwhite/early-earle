import { BufferGeometry, Float32BufferAttribute, Uint16BufferAttribute } from 'three/webgpu';
import { hash32, mulberry32 } from '@ee/world';

/**
 * Kahler Baum als feine Linienzeichnung (Ebene 15/17/43, Bild 01 Hintergrund, 16.47.13): flache Karte in der XY-Ebene
 * (Einheit = Kronenradius, Fuß im Ursprung, Höhe ≈ 3.1), im Shader zur Kamera bzw. im Schattenpass zur Sonne gedreht.
 * Wie bei Earle: lange, sanft geschwungene Striche, die zum Licht streben (die Richtung dreht sich Schritt für Schritt
 * nach oben), asymmetrische Gabeln (ein Leittrieb läuft weiter, Seitenäste zweigen ab, auch mitten am Ast), feine Zweige,
 * die sich am Ende einrollen; die Breite verjüngt sich stetig bis zur Haarlinie. Die Gesamtform bleibt in einer runden
 * Vasenhülle; der Stamm läuft mit Wurzelanläufen unter den Boden. Nie eine Kontur — das ganze Gebilde ist Ornament.
 */
export interface BareCardOptions {
  /** Gabelungstiefe (Standard 5). */
  depth?: number;
  /** Hülle: Mittelpunkt y und Halbachsen (Standard 1.95 / 1.15 / 1.15). */
  envelope?: { cy: number; rx: number; ry: number };
}

export function createBareCard(seed = 3, options: BareCardOptions = {}): BufferGeometry {
  const rand = mulberry32(hash32('bare-card-v4', seed));
  const depth = options.depth ?? 5;
  const env = options.envelope ?? { cy: 1.95, rx: 1.15, ry: 1.15 };
  const pos: number[] = [];
  const idx: number[] = [];

  /** Band entlang einer Punktfolge, Breite von w0 auf w1 (stetig verjüngt). */
  const strip = (pts: Array<[number, number]>, w0: number, w1: number) => {
    const base = pos.length / 3;
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)]!;
      const b = pts[Math.min(n - 1, i + 1)]!;
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const l = Math.hypot(dx, dy) || 1;
      const nx = -dy / l;
      const ny = dx / l;
      const t = i / (n - 1);
      const w = (w0 + (w1 - w0) * Math.pow(t, 0.9)) * 0.5;
      const p = pts[i]!;
      pos.push(p[0] - nx * w, p[1] - ny * w, 0, p[0] + nx * w, p[1] + ny * w, 0);
    }
    for (let i = 0; i < n - 1; i++) {
      const a = base + i * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  };

  const inside = (x: number, y: number) => (x / env.rx) ** 2 + ((y - env.cy) / env.ry) ** 2;

  /**
   * Ast ab (x, y) in Richtung `angle`: `segs` Schritte, jede Richtung dreht sich ein wenig zum Licht (nach oben) und
   * um einen eigenen Schwung; zu lange Äste werden in der Hülle gekürzt. Liefert die Punkte.
   */
  const grow = (x: number, y: number, angle: number, length: number, level: number, segs: number, curl: number): Array<[number, number]> => {
    let L = length;
    for (let k = 0; k < 7; k++) {
      // Endpunkt grob schätzen (gerade), in der Hülle bleiben
      const ex = x + Math.cos(angle) * L;
      const ey = y + Math.sin(angle) * L;
      if (level === 0 || inside(ex, ey) <= 1) break;
      L *= 0.82;
    }
    const pts: Array<[number, number]> = [[x, y]];
    let a = angle;
    let px = x;
    let py = y;
    const step = L / segs;
    for (let i = 0; i < segs; i++) {
      // zum Licht: der Winkel zieht Richtung π/2, dazu ein eigener, sanfter Schwung (Earles S-Kurven)
      a += (Math.PI / 2 - a) * (0.08 + 0.04 * level) + curl * (1 - (i / segs) * 1.6);
      px += Math.cos(a) * step;
      py += Math.sin(a) * step;
      pts.push([px, py]);
    }
    return pts;
  };

  const endAngle = (pts: Array<[number, number]>): number => {
    const a = pts[pts.length - 2]!;
    const b = pts[pts.length - 1]!;
    return Math.atan2(b[1] - a[1], b[0] - a[0]);
  };

  const branch = (x: number, y: number, angle: number, length: number, width: number, level: number) => {
    const last = level >= depth;
    const segs = level === 0 ? 5 : last ? 2 : level >= depth - 2 ? 3 : 4;
    const curl = (rand() - 0.5) * (level === 0 ? 0.05 : 0.11);
    const pts = grow(x, y, angle, length, level, segs, curl);
    const w1 = last ? 0.003 : width * 0.62;
    strip(pts, width, w1);
    if (last) return;
    const a1 = endAngle(pts);
    const [ex, ey] = pts[pts.length - 1]!;
    const L = Math.hypot(ex - x, ey - y);
    // Seitenzweig mitten am Ast (ab der zweiten Ebene): kurz, feiner, zur Außenseite
    if (level >= 1 && level < depth - 1 && rand() < 0.5) {
      const i = Math.max(1, Math.round(pts.length * (0.45 + rand() * 0.2)));
      const [mx, my] = pts[Math.min(pts.length - 1, i)]!;
      const side = rand() < 0.5 ? -1 : 1;
      branch(mx, my, a1 + side * (0.55 + rand() * 0.35), L * (0.42 + 0.14 * rand()), width * 0.52, Math.min(depth, level + 2));
    }
    if (level === 0) {
      // Stamm → drei bis vier Hauptäste in einer Vase (Ebene 15)
      const n = 3 + (rand() < 0.4 ? 1 : 0);
      for (let i = 0; i < n; i++) {
        const off = (i / (n - 1) - 0.5) * 1.15 + (rand() - 0.5) * 0.14;
        branch(ex, ey, a1 + off, L * (0.62 + 0.14 * rand()), width * 0.62, 1);
      }
      return;
    }
    // Leittrieb läuft weiter, ein Seitenast zweigt ab (asymmetrisch, wie gewachsen)
    const side = rand() < 0.5 ? -1 : 1;
    branch(ex, ey, a1 - side * (0.08 + rand() * 0.14), L * (0.72 + 0.12 * rand()), width * 0.7, level + 1);
    branch(ex, ey, a1 + side * (0.42 + rand() * 0.32), L * (0.56 + 0.14 * rand()), width * 0.55, level + 1);
  };

  // Stamm: leicht geschwungen, dicker Fuß; Gabelung bei ≈ 0.9
  const lean = (rand() - 0.5) * 0.12;
  branch(0, -0.14, Math.PI / 2 + lean, 1.02, 0.09, 0);
  // Wurzelanläufe (unter den Boden, damit der Fuß nie schwebt)
  for (let i = 0; i < 4; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const reach = 0.16 + 0.14 * rand();
    strip(
      [
        [0, 0.14],
        [side * reach * 0.3, 0.04],
        [side * reach * 0.7, -0.04],
        [side * reach, -0.1],
      ],
      0.085,
      0.018,
    );
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setIndex(new Uint16BufferAttribute(idx, 1));
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}
