import { describe, expect, it } from 'vitest';
import { sweepPath, aroundPoint, SHADOW_K, type Pt, type Ring } from './longShadow';
import { LOGO } from './logo.gen';

/** Polygone aus M/L/Z-Pfaddaten. */
function polys(d: string): Pt[][] {
  const out: Pt[][] = [];
  for (const sub of d.split('M').filter(Boolean)) {
    const pts = sub
      .replace(/Z/g, '')
      .split('L')
      .map((s) => s.trim().split(/\s+/).map(Number) as unknown as Pt);
    out.push(pts);
  }
  return out;
}

function signedArea(r: ReadonlyArray<Pt>): number {
  let a = 0;
  for (let i = 0; i < r.length; i++) {
    const p = r[i]!;
    const q = r[(i + 1) % r.length]!;
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
}

/** Windungszahl eines Punkts bezüglich aller Teilpfade (nonzero ≠ 0 → gefüllt). */
function winding(d: string, p: Pt): number {
  let w = 0;
  for (const r of polys(d)) {
    for (let i = 0; i < r.length; i++) {
      const a = r[i]!;
      const b = r[(i + 1) % r.length]!;
      if (a[1] <= p[1]) {
        if (b[1] > p[1] && (b[0] - a[0]) * (p[1] - a[1]) - (p[0] - a[0]) * (b[1] - a[1]) > 0) w++;
      } else if (b[1] <= p[1] && (b[0] - a[0]) * (p[1] - a[1]) - (p[0] - a[0]) * (b[1] - a[1]) < 0) w--;
    }
  }
  return w;
}

function inRing(p: Pt, r: Ring): boolean {
  let inside = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const a = r[i]!;
    const b = r[j]!;
    if (a[1] > p[1] !== b[1] > p[1] && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}

/** Fläche mit Löchern (gerade-ungerade über alle Ringe). */
function inRegion(p: Pt, rings: ReadonlyArray<Ring>): boolean {
  let n = 0;
  for (const r of rings) if (inRing(p, r)) n++;
  return n % 2 === 1;
}

/** Brute force: liegt Q auf einer Spur L + (P − L)·s, s ∈ [1, F], mit P im Werfer? */
function sweptBrute(q: Pt, rings: ReadonlyArray<Ring>, light: Pt, f: number): boolean {
  for (let i = 0; i <= 2000; i++) {
    const s = 1 / f + ((1 - 1 / f) * i) / 2000; // P = L + (Q − L)·s
    const p: Pt = [light[0] + (q[0] - light[0]) * s, light[1] + (q[1] - light[1]) * s];
    if (inRegion(p, rings)) return true;
  }
  return false;
}

function hull(points: Pt[]): Pt[] {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: Pt, a: Pt, b: Pt) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Pt[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: Pt[] = [];
  for (const p of [...pts].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, p) <= 0) upper.pop();
    upper.push(p);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const L: Pt = [-800, -400];

describe('longShadow', () => {
  it('e = 0 (oder keine Ringe) ergibt keinen Schatten', () => {
    expect(sweepPath([[[0, 0], [10, 0], [10, 10]]], L, 0)).toBe('');
    expect(sweepPath([], L, 1)).toBe('');
  });

  it('jeder Teilpfad hat positive Fläche (Vierecke normiert, Außenring positiv)', () => {
    // Außenring positiv (y nach unten: im Bild im Uhrzeigersinn), Loch negativ
    const outer: Ring = [[100, 100], [200, 100], [200, 200], [100, 200]];
    expect(signedArea(outer)).toBeGreaterThan(0);
    const d = sweepPath([outer], L, 0.7);
    const sub = polys(d);
    expect(sub.length).toBe(5); // 4 Kanten + Fernkopie
    for (const r of sub) expect(signedArea(r)).toBeGreaterThan(0);
  });

  it('konvexer Werfer: Schatten = konvexe Hülle aus P ∪ P′', () => {
    const tri: Ring = [[300, 300], [360, 320], [320, 380]];
    const e = 0.4;
    const f = 1 + SHADOW_K * e;
    const d = sweepPath([tri], L, e);
    const far = tri.map((p) => [L[0] + (p[0] - L[0]) * f, L[1] + (p[1] - L[1]) * f] as Pt);
    const h = hull([...tri, ...far]);
    const rand = rng(7);
    let checked = 0;
    for (let i = 0; i < 4000; i++) {
      const q: Pt = [200 + rand() * 1200, 200 + rand() * 1200];
      // Randnähe auslassen (Rundung der Pfaddaten auf 0,1 px)
      const inside = inRing(q, h);
      const near = h.some((a, k) => {
        const b = h[(k + 1) % h.length]!;
        const t = Math.max(0, Math.min(1, ((q[0] - a[0]) * (b[0] - a[0]) + (q[1] - a[1]) * (b[1] - a[1])) / ((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2)));
        return Math.hypot(q[0] - a[0] - t * (b[0] - a[0]), q[1] - a[1] - t * (b[1] - a[1])) < 0.5;
      });
      if (near) continue;
      checked++;
      expect(winding(d, q) !== 0, `(${q[0].toFixed(1)}, ${q[1].toFixed(1)})`).toBe(inside);
    }
    expect(checked).toBeGreaterThan(3500);
  });

  it('Ring: das Loch bleibt hell, wo keine Spur hinfällt, und fängt den eigenen Schatten, wo sie hinfällt', () => {
    // Quadrat 200×200 mit Loch 120×120 (Loch negativ orientiert)
    const outer: Ring = [[400, 400], [600, 400], [600, 600], [400, 600]];
    const hole: Ring = [[440, 440], [440, 560], [560, 560], [560, 440]];
    expect(signedArea(hole)).toBeLessThan(0);
    const e = 0.03; // kurze Spur: ≈ 0,078 · Abstand zu L ≈ 90 px
    const f = 1 + SHADOW_K * e;
    const d = sweepPath([outer, hole], L, e);
    const rand = rng(3);
    let lit = 0;
    let shaded = 0;
    for (let i = 0; i < 1500; i++) {
      const q: Pt = [442 + rand() * 116, 442 + rand() * 116];
      const brute = sweptBrute(q, [outer, hole], L, f);
      expect(winding(d, q) !== 0).toBe(brute);
      if (brute) shaded++;
      else lit++;
    }
    // beides kommt im Loch vor: nahe der lichtzugewandten Kante Schatten, weiter hinten Licht
    expect(lit).toBeGreaterThan(100);
    expect(shaded).toBeGreaterThan(100);
  });

  it('Werfer-Matrix: Schatten eines gedrehten, skalierten Sterns = Schatten der transformierten Punkte', () => {
    const star = LOGO.casters.stars[1]![0]! as Ring;
    const c = LOGO.stars[1]!.center as unknown as Pt;
    const m = aroundPoint(c, 1.4, 0.8, 20, 5, -3);
    const moved = star.map((p) => [m[0] * p[0] + m[2] * p[1] + m[4], m[1] * p[0] + m[3] * p[1] + m[5]] as Pt);
    expect(sweepPath([star], L, 1, m)).toBe(sweepPath([moved], L, 1));
  });

  it('Regression: Florians Randstrahlen aus L haben die Steigungen 0,636 (über dem ®) und 1,07 (unter dem linken Stern)', () => {
    const light = LOGO.light as unknown as Pt;
    // Steigung der Tangentenstrahlen aus L: kleinste über alle ®-Punkte, größte über alle Punkte des linken Sterns
    const slope = (p: Pt) => (p[1] - light[1]) / (p[0] - light[0]);
    const regPts = LOGO.casters.reg.flat() as unknown as Pt[];
    const starPts = LOGO.casters.stars[0]!.flat() as unknown as Pt[];
    const top = Math.min(...regPts.map(slope));
    const bottom = Math.max(...starPts.map(slope));
    expect(top).toBeCloseTo(0.636, 2);
    expect(bottom).toBeCloseTo(1.07, 2);
  });

  it('1000 Punkte in unter 1 ms', () => {
    const ring: Pt[] = [];
    for (let i = 0; i < 1000; i++) {
      const a = (i / 1000) * Math.PI * 2;
      ring.push([500 + 80 * Math.cos(a), 600 + 80 * Math.sin(a)]);
    }
    let best = Infinity;
    for (let k = 0; k < 30; k++) {
      const t0 = performance.now();
      sweepPath([ring], L, 1);
      best = Math.min(best, performance.now() - t0);
    }
    expect(best).toBeLessThan(1);
  });
});
