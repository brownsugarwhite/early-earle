import { centroid, polygonArea, type Poly } from './geometry';
import type { PlaneFeatureHost } from './host';
import type { RockColumn } from './types';

/**
 * Roter Monolith (Ebene 45, Welt 13): ein riesiger Tafelberg-Turm auf einem gestuften Plateau. Aufbau von unten:
 * vier Plateaustufen (breite, schräg auslaufende Bänke, nach vorn links weit ausgezogen wie die lange Flanke im Bild),
 * ein Gesims mit Zahnfries und der verjüngte Schaft. Der Schaft ist asymmetrisch: die rechte
 * Kante steht fast senkrecht, die linke steigt steil nach rechts oben (Untersicht mit starker Perspektive). Links
 * zwei Rücksprünge (schwarze Streifen mit einem roten dazwischen), vorn die breite Schauseite (rosa Glut bis tiefes Rot).
 *
 * Lokaler Rahmen: a = x (rechts), b = z (zur Kamera, die Karte und das Lab blicken nach −z). Höhen absolut (Gelände +
 * Stufen). Die Schauseite zeigt immer nach +z (zur Kamera), die Stufen ziehen nach links vorn aus.
 */

export interface MonolithBuilt {
  columns: RockColumn[];
  ledges: Array<{ x: number; y: number; z: number; step: number; radius: number }>;
  footprint: number;
  /** Geländehöhe am Fuß (Bezug der Wandverläufe). */
  ground: number;
  /** Weiße Pferde vor dem Plateau (a, b, Blickrichtung). */
  herd: Array<[number, number, number]>;
}

/** Versenkung der Füße unter den tiefsten Geländepunkt (nichts schwebt). */
const SINK = 0.55;

function column(poly: Poly, base: number, top: number, o: Partial<Pick<RockColumn, 'bevel' | 'shoulder' | 'cap' | 'tilt' | 'capStyle' | 'tier' | 'part' | 'taper'>> = {}): RockColumn {
  let p = poly;
  let shoulder = o.shoulder;
  let cap = o.cap;
  if (polygonArea(p) < 0) {
    p = [...p].reverse();
    shoulder = shoulder ? [...shoulder].reverse() : undefined;
    cap = cap ? [...cap].reverse() : undefined;
  }
  const [cx, cy] = centroid(p);
  let r = 0;
  for (const [x, y] of p) r = Math.max(r, Math.hypot(x - cx, y - cy));
  return {
    polygon: p,
    cx,
    cy,
    r,
    base,
    top,
    taper: o.taper ?? 1,
    bevel: o.bevel ?? 0,
    ...(shoulder ? { shoulder } : {}),
    ...(cap ? { cap } : {}),
    apex: 0,
    apexOffset: [0, 0],
    tilt: o.tilt ?? [0, 0],
    capStyle: o.capStyle ?? 0,
    tier: o.tier ?? 0,
    part: o.part ?? 0,
  };
}

/** Polygon um seinen Schwerpunkt nach außen versetzen (grob, für konvexe bis leicht konkave Umrisse). */
function inflate(poly: Poly, d: number): Poly {
  const [cx, cy] = centroid(poly);
  return poly.map(([x, y]) => {
    const dx = x - cx;
    const dy = y - cy;
    const l = Math.hypot(dx, dy) || 1;
    return [x + (dx / l) * d, y + (dy / l) * d] as [number, number];
  });
}

/** Stufenumriss: gefastes Rechteck mit leicht gewellten Kanten (a0..a1, b0..b1), vorn links weit ausgezogen. */
function tierOutline(a0: number, a1: number, b0: number, b1: number, pull: number, rand: () => number): Poly {
  const pts: Poly = [];
  const jit = () => (rand() - 0.5) * 0.35;
  // Rückseite (b0) von rechts nach links, linke Flanke, Front (b1) von links nach rechts, rechte Flanke
  pts.push([a1 - 1.2, b0 + jit()], [a0 * 0.35, b0 - 0.3 + jit()], [a0 + 1.0, b0 + 0.4]);
  pts.push([a0, b0 + (b1 - b0) * 0.45 + jit()]);
  // Flanke vorn links: weit nach links vorn gezogen (lange schwarze Diagonale der Plateaukante)
  pts.push([a0 - pull, b1 - 0.9], [a0 - pull * 0.6, b1 + 0.2]);
  for (let i = 1; i <= 4; i++) pts.push([a0 - pull * 0.6 + (a1 - 1.4 - (a0 - pull * 0.6)) * (i / 5), b1 + 0.25 + jit() * 0.6]);
  pts.push([a1 - 1.0, b1], [a1, b1 - 1.1], [a1 + 0.2, b0 + (b1 - b0) * 0.4 + jit()], [a1 - 0.2, b0 + 0.8]);
  return pts;
}

/**
 * Baut den Monolithen um den Rahmen (Mitte auf dem Gelände). `size` = Breite der untersten Stufe, `height` = Gesamthöhe.
 */
export function buildMonolith(host: PlaneFeatureHost, cx: number, cz: number, size: number, height: number, rand: () => number): MonolithBuilt {
  const s = size / 20;
  const H = height;
  const g = (a: number, b: number) => host.baseHeightAt(cx + a, cz + b);
  const foot = (poly: Poly): number => {
    let lo = Infinity;
    for (const [a, b] of poly) lo = Math.min(lo, g(a, b));
    const [ca, cb] = centroid(poly);
    return Math.min(lo, g(ca, cb)) - SINK;
  };
  const ground = g(0, 0);
  const columns: RockColumn[] = [];
  const ledges: MonolithBuilt['ledges'] = [];
  const S = (p: Poly): Poly => p.map(([a, b]) => [a * s, b * s]);

  // --- Plateaustufen: je eine kurze gezahnte Wand und darüber eine breite, zur Kamera geneigte Bank (Pyramide) ---------
  const tiers = [
    { a0: -12.0, a1: 10.0, b0: -8.5, b1: 10.0, pull: 4.5, top: 0.04, run: 3.0 },
    { a0: -9.2, a1: 7.8, b0: -6.6, b1: 7.6, pull: 3.0, top: 0.08, run: 2.4 },
    { a0: -6.5, a1: 6.0, b0: -5.0, b1: 5.4, pull: 1.6, top: 0.12, run: 1.8 },
    { a0: -4.4, a1: 4.5, b0: -3.7, b1: 3.8, pull: 0.5, top: 0.16, run: 0.9 },
  ];
  let below = -Infinity;
  let belowShare = 0;
  tiers.forEach((t, i) => {
    const outline = S(tierOutline(t.a0, t.a1, t.b0, t.b1, t.pull, rand));
    const top = ground + H * t.top;
    const base = i === 0 ? foot(outline) : below - 0.25;
    // Bank: 60 % der Stufenhöhe als Schräge über `run`, darunter die Wand mit dem Zahnfries
    const rise = H * (t.top - belowShare) * 0.6;
    const shoulder = inflate(outline, -0.08 * s);
    const cap = inflate(outline, -t.run * s);
    columns.push(column(outline, base, top, { bevel: rise, shoulder, cap, tier: i, part: 1 }));
    below = top;
    belowShare = t.top;
    // Anker: vorn links auf der Bank (vom Pfad aus zuerst erreichbar)
    const la = (t.a0 - t.pull * 0.3 + t.run + 0.6) * s;
    const lb = (t.b1 - t.run - 0.6) * s;
    ledges.push({ x: la, y: lb, z: top, step: i, radius: Math.min(1.1, 0.5 + 0.25 * s) });
  });

  // Die langen schwarzen Diagonalen über das Plateau malt das Material als flache Tintenkeile auf die Stufen (Earle
  // setzt sie gegen jedes Licht; eine echte Rippe läge mit der Sonne der Komposition im Licht)

  // --- Gesims mit Zahnfries und Schaft ------------------------------------------------------------------------------
  // Grundriss des Schafts (Blick von vorn): breite Schauseite, links zwei Rücksprünge
  const shaftBase = S([
    [-2.9, -2.3],
    [2.9, -2.1],
    [3.05, 1.6],
    [2.65, 2.25],
    [-1.7, 2.3],
    [-1.7, 1.2],
    [-2.4, 1.15],
    [-2.4, 0.3],
    [-2.9, 0.25],
  ]);
  const corniceTop = ground + H * 0.19;
  const cornice = inflate(shaftBase, 0.42 * s);
  columns.push(column(cornice, below - 0.25, corniceTop, { tier: 4, part: 1, capStyle: 1 }));
  // Schaft: oben auf die Hälfte verjüngt um einen Punkt rechts (rechte Kante fast senkrecht), leicht nach hinten
  const pivotA = 2.2 * s;
  const shaftTop: Poly = shaftBase.map(([a, b]) => [pivotA + (a - pivotA) * 0.46, b * 0.52 - 0.35 * s]);
  columns.push(column(shaftBase, corniceTop - 0.3, ground + H, { shoulder: shaftTop, capStyle: 1, part: 0 }));

  let footprint = 0;
  for (const c of columns) for (const [x, y] of c.polygon) footprint = Math.max(footprint, Math.hypot(x, y));
  // Pferde: drei grasen vorn am Plateau (eines links, zwei beisammen rechts, Ebene 45), einige weiter draußen
  const herdDesign: Array<[number, number]> = [
    [-4.6, 10.7],
    [2.2, 10.5],
    [3.2, 10.6],
    [12.6, 3.5],
    [13.4, 4.4],
    [-15.5, 12.5],
    [-9.5, -11.5],
  ];
  const herd: Array<[number, number, number]> = herdDesign.map(([a, b]) => [(a + (rand() - 0.5) * 0.6) * s, (b + (rand() - 0.5) * 0.4) * s, rand() < 0.5 ? -1 : 1]);
  return { columns, ledges, footprint, ground, herd };
}
