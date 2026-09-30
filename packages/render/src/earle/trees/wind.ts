import { BufferGeometry, Float32BufferAttribute, Uint32BufferAttribute } from 'three/webgpu';
import { hash32, mulberry32 } from '@ee/world';

/**
 * Windbaum (Ebene 29, Welt 14): ein knorriger, gedrungener Baum auf der Landzunge, vom Wind zur Seite gedrückt — als
 * flache Karte in der XY-Ebene (Einheit = Kronenradius, Fuß im Ursprung), im Shader zur Kamera bzw. im Schattenpass zur
 * Sonne gedreht und immer zur Leeseite (+x) geneigt. Aufbau wie bei Earle:
 * - ein kurzer, gedrehter Stamm, der sich schräg zur Leeseite hebt und nach einem Knick in vier bis sechs Hauptäste
 *   aufspreizt;
 * - jeder Ast knickt mehrfach (knorrig), gabelt sich asymmetrisch und wird zur Haarlinie; die Äste füllen eine
 *   Fächer- bzw. Schirmhülle, die zur Leeseite hin weit ausläuft;
 * - an den äußeren Zweigspitzen sitzt feines Spitzenwerk: Büschel aus kurzen, gefächerten Strichen (die dichte,
 *   gekrauste Kronenkante im Gegenlicht). Diese Striche tragen z = 1 — der Shader kann sie je Baum wegnehmen (der
 *   zweite, kahle Baum im Bild).
 * Nie eine Kontur: das Gebilde ist Ornament, der Himmel scheint zwischen den Ästen durch.
 */
export interface WindCardOptions {
  /** Gabelungstiefe (Standard 6; Mobil 5). */
  depth?: number;
  /** Büschel je Zweigspitze (Striche, Standard 9; Mobil 6). */
  tuft?: number;
}

export interface WindCard {
  geometry: BufferGeometry;
  /** Höhe und Breite der Hülle (Einheit Kronenradius) für Schatten, Nähe-Ausblendung und Sichtlinie. */
  height: number;
  width: number;
}

export function createWindCard(seed = 5, options: WindCardOptions = {}): WindCard {
  const rand = mulberry32(hash32('wind-card', seed));
  const depth = options.depth ?? 6;
  const tuftN = options.tuft ?? 9;
  const pos: number[] = [];
  const idx: number[] = [];
  // Hülle: gekippte Ellipse zur Leeseite (Mitte, Halbachsen, Drehung)
  const env = { cx: 0.95, cy: 1.55, rx: 1.75, ry: 0.95, rot: 0.32 };
  const inside = (x: number, y: number): number => {
    const dx = x - env.cx;
    const dy = y - env.cy;
    const c = Math.cos(-env.rot);
    const s = Math.sin(-env.rot);
    const u = dx * c - dy * s;
    const v = dx * s + dy * c;
    return (u / env.rx) ** 2 + (v / env.ry) ** 2;
  };

  /** Band entlang einer Punktfolge (Breite w0 → w1), z = Schicht (0 Ast, 1 Büschel). */
  const strip = (pts: Array<[number, number]>, w0: number, w1: number, z: number) => {
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
      const t = n > 1 ? i / (n - 1) : 0;
      const w = (w0 + (w1 - w0) * Math.pow(t, 0.85)) * 0.5;
      const p = pts[i]!;
      pos.push(p[0] - nx * w, p[1] - ny * w, z, p[0] + nx * w, p[1] + ny * w, z);
    }
    for (let i = 0; i < n - 1; i++) {
      const a = base + i * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  };

  /** Knorriger Ast: Schritte mit Knicken (abwechselnd, unregelmäßig), leichter Zug zur Leeseite und nach oben. */
  const grow = (x: number, y: number, angle: number, length: number, level: number): Array<[number, number]> => {
    let L = length;
    // in der Hülle bleiben (die Äste enden an der Kronenkante)
    for (let k = 0; k < 8; k++) {
      if (inside(x + Math.cos(angle) * L, y + Math.sin(angle) * L) <= 1.02 || level === 0) break;
      L *= 0.8;
    }
    const segs = level === 0 ? 5 : level < 3 ? 4 : level < depth - 1 ? 3 : 2;
    const pts: Array<[number, number]> = [[x, y]];
    let a = angle;
    let px = x;
    let py = y;
    const step = L / segs;
    let kink = rand() < 0.5 ? 1 : -1;
    for (let i = 0; i < segs; i++) {
      // Knick: wechselnde Richtung, stärker an dicken Ästen (Ebene 29: kantige, gedrehte Äste)
      a += kink * (0.18 + rand() * 0.34) * (level < 2 ? 1.2 : 0.8);
      kink = rand() < 0.7 ? -kink : kink;
      // Wind: leicht zur Leeseite (0 rad) und etwas nach oben
      a += (0.35 - a) * 0.05;
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

  /** Büschel an einer Zweigspitze: kurze Striche, gefächert in Wuchsrichtung, nach außen etwas länger. */
  const tuft = (x: number, y: number, angle: number, scale: number) => {
    const n = tuftN;
    for (let i = 0; i < n; i++) {
      const f = n > 1 ? i / (n - 1) - 0.5 : 0;
      const a = angle + f * 2.1 + (rand() - 0.5) * 0.3;
      const len = scale * (0.09 + rand() * 0.07) * (1 - Math.abs(f) * 0.5);
      const sx = x + Math.cos(angle) * scale * 0.02;
      const sy = y + Math.sin(angle) * scale * 0.02;
      const mx = sx + Math.cos(a) * len * 0.55 + Math.cos(a + 1.57) * len * 0.08 * (rand() - 0.5);
      const my = sy + Math.sin(a) * len * 0.55 + Math.sin(a + 1.57) * len * 0.08 * (rand() - 0.5);
      strip(
        [
          [sx, sy],
          [mx, my],
          [sx + Math.cos(a) * len, sy + Math.sin(a) * len],
        ],
        0.012 * scale,
        0.004 * scale,
        1,
      );
    }
  };

  const branch = (x: number, y: number, angle: number, length: number, width: number, level: number) => {
    const last = level >= depth;
    const pts = grow(x, y, angle, length, level);
    strip(pts, width, last ? 0.004 : width * 0.66, 0);
    const [ex, ey] = pts[pts.length - 1]!;
    const a1 = endAngle(pts);
    // Spitzenwerk nur außen in der Hülle (die gekrauste Kronenkante), im Innern bleibt das Astwerk frei
    if (last || level >= depth - 1) {
      if (inside(ex, ey) > 0.45) tuft(ex, ey, a1, 1);
      if (last) return;
    }
    const L = Math.hypot(ex - x, ey - y);
    // Seitentrieb mitten am Ast (knorrig, kurz)
    if (level >= 1 && level < depth - 1 && rand() < 0.55) {
      const i = Math.max(1, Math.min(pts.length - 1, Math.round(pts.length * (0.4 + rand() * 0.3))));
      const [mx, my] = pts[i]!;
      const side = rand() < 0.5 ? -1 : 1;
      branch(mx, my, a1 + side * (0.6 + rand() * 0.45), L * (0.45 + rand() * 0.15), width * 0.5, Math.min(depth, level + 2));
    }
    // Gabel: zwei bis drei Triebe, asymmetrisch gespreizt
    const n = level < 2 && rand() < 0.45 ? 3 : 2;
    for (let k = 0; k < n; k++) {
      const off = n === 3 ? (k - 1) * (0.45 + rand() * 0.2) : (k === 0 ? -1 : 1) * (0.22 + rand() * 0.32);
      branch(ex, ey, a1 + off + (rand() - 0.5) * 0.12, L * (0.72 + rand() * 0.14), width * (k === 0 ? 0.72 : 0.6), level + 1);
    }
  };

  // Stamm: kurz, gedreht, schräg zur Leeseite; Knick bei ≈ 0.8
  const trunk: Array<[number, number]> = [
    [0, -0.18],
    [0.02, 0.2],
    [0.13, 0.5],
    [0.09, 0.72],
    [0.24, 0.95],
  ];
  strip(trunk, 0.2, 0.12, 0);
  // Wurzelanläufe unter den Boden
  for (const side of [-1, 1, 1]) {
    strip(
      [
        [0.02, 0.12],
        [side * 0.12, 0.0],
        [side * (0.22 + rand() * 0.1), -0.12],
      ],
      0.1,
      0.03,
      0,
    );
  }
  // Hauptäste: vier bis sechs, gefächert von steil (links oben) bis flach zur Leeseite
  const limbs = 4 + Math.floor(rand() * 3);
  for (let i = 0; i < limbs; i++) {
    const t = limbs > 1 ? i / (limbs - 1) : 0.5;
    const a = 1.85 - t * 1.6 + (rand() - 0.5) * 0.15;
    branch(0.24, 0.95, a, 0.7 + rand() * 0.35 + t * 0.25, 0.1 - t * 0.02, 1);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setIndex(new Uint32BufferAttribute(idx, 1));
  g.computeBoundingSphere();
  return { geometry: g, height: env.cy + env.ry + 0.2, width: env.cx + env.rx };
}
