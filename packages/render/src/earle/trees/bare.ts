import { BufferGeometry, Float32BufferAttribute, Uint16BufferAttribute } from 'three/webgpu';
import { hash32, mulberry32 } from '@ee/world';

/**
 * Kahler Baum als feine Linienzeichnung (Bild 01 Hintergrund, Ebene_15/17, Bildschirmfoto 16.47.13): flache Karte in
 * der XY-Ebene (Einheit = Kronenradius, Fuß im Ursprung, Höhe ≈ 3.1), im Shader zur Kamera bzw. im Schattenpass zur
 * Sonne gedreht. Äste sind geschwungene, sich verjüngende Bänder (quadratische Bézierkurven), die sich wiederholt
 * gabeln; die Gesamtform bleibt in einer runden Hülle (Earles Fächerkronen), der Stamm läuft mit Wurzelanläufen unter
 * den Boden. Nie eine Kontur — das ganze Gebilde ist Ornament.
 */
export interface BareCardOptions {
  /** Gabelungstiefe (Standard 5). */
  depth?: number;
  /** Hülle: Mittelpunkt y und Halbachsen (Standard 1.95 / 1.15 / 1.15). */
  envelope?: { cy: number; rx: number; ry: number };
}

export function createBareCard(seed = 3, options: BareCardOptions = {}): BufferGeometry {
  const rand = mulberry32(hash32('bare-card-v3', seed));
  const depth = options.depth ?? 5;
  const env = options.envelope ?? { cy: 1.95, rx: 1.15, ry: 1.15 };
  const pos: number[] = [];
  const idx: number[] = [];

  /** Band entlang einer quadratischen Bézierkurve mit linear abnehmender Breite, `segs` Abschnitte. */
  const ribbon = (x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, w0: number, w1: number, segs: number) => {
    const base = pos.length / 3;
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const a = (1 - t) * (1 - t);
      const b = 2 * (1 - t) * t;
      const c = t * t;
      const x = a * x0 + b * cx + c * x1;
      const y = a * y0 + b * cy + c * y1;
      // Tangente (Ableitung) → Normale in der Ebene
      const dx = 2 * (1 - t) * (cx - x0) + 2 * t * (x1 - cx);
      const dy = 2 * (1 - t) * (cy - y0) + 2 * t * (y1 - cy);
      const l = Math.hypot(dx, dy) || 1;
      const nx = -dy / l;
      const ny = dx / l;
      const w = (w0 + (w1 - w0) * t) * 0.5;
      pos.push(x - nx * w, y - ny * w, 0, x + nx * w, y + ny * w, 0);
    }
    for (let i = 0; i < segs; i++) {
      const a = base + i * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  };

  const inside = (x: number, y: number) => (x / env.rx) ** 2 + ((y - env.cy) / env.ry) ** 2;

  const branch = (x: number, y: number, angle: number, length: number, width: number, level: number) => {
    let L = length;
    let x1 = x + Math.cos(angle) * L;
    let y1 = y + Math.sin(angle) * L;
    // In der Hülle bleiben (runde Earle-Krone): zu lange Äste kürzen
    for (let k = 0; k < 6 && level > 0 && inside(x1, y1) > 1; k++) {
      L *= 0.8;
      x1 = x + Math.cos(angle) * L;
      y1 = y + Math.sin(angle) * L;
    }
    const curl = (rand() - 0.5) * 0.35 * L;
    const cx = (x + x1) * 0.5 - Math.sin(angle) * curl;
    const cy = (y + y1) * 0.5 + Math.cos(angle) * curl + L * 0.06;
    const w1 = width * 0.64;
    ribbon(x, y, cx, cy, x1, y1, width, level >= depth ? 0.004 : w1, level >= depth ? 1 : level >= depth - 1 ? 2 : 3);
    if (level >= depth) return;
    // Endrichtung der Kurve (Ableitung am Ende) als Basis der Kinder
    const endAngle = Math.atan2(y1 - cy, x1 - cx);
    const children: number = level === 0 ? 3 : rand() < (level === 1 ? 0.4 : 0.18) ? 3 : 2;
    const spread = level === 0 ? 0.55 : 0.32 + 0.22 * rand();
    for (let i = 0; i < children; i++) {
      const off = (i / (children - 1) - 0.5) * 2 * spread;
      // Leichter Zug nach oben (Äste streben zum Licht), außen etwas nach außen fächernd
      let a = endAngle + off + (rand() - 0.5) * 0.18;
      a += (Math.PI / 2 - a) * 0.08;
      const l = L * (0.66 + 0.16 * rand());
      branch(x1, y1, a, l, w1, level + 1);
    }
  };

  // Stamm: leicht geschwungen, dicker Fuß; Gabelung bei ≈ 0.95
  const lean = (rand() - 0.5) * 0.12;
  branch(0, -0.14, Math.PI / 2 + lean, 1.08, 0.13, 0);
  // Wurzelanläufe (unter den Boden, damit der Fuß nie schwebt)
  for (let i = 0; i < 4; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const reach = 0.16 + 0.14 * rand();
    ribbon(0, 0.14, side * reach * 0.35, 0.03, side * reach, -0.1, 0.09, 0.02, 2);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setIndex(new Uint16BufferAttribute(idx, 1));
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}
