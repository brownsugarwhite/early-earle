import { describe, expect, it } from 'vitest';
import { BAND_MARGIN, KEEP_GAP, focalClearRadius, macroCenterline, macroZLength } from './macro';
import { ridgeTrainCrest } from './flank';
import { ROUTE, authoredSpecs, testField, testLayout } from './testWorlds';

/**
 * Makroformen des Pfads (W3): die Mittellinien der Route aus `content/zones/route.json` (Seed 7, wie im Spiel).
 */
describe('Makroform-Mittellinien der Route', () => {
  const layout = testLayout();
  const specs = authoredSpecs();
  const shaped = ROUTE.entries.flatMap((e, k) => (layout.shapeOf(k) ? [{ k, e }] : []));

  it('trägt in jeder spielbaren Welt außer dem Riesenbaum eine Form', () => {
    expect(shaped.map(({ e }) => e.shape)).toEqual([
      'meander',
      'serpentine',
      'climb',
      'meander',
      'spiral',
      'meander',
      'serpentine',
      'meander',
      'meander',
      'ridge',
      'meander',
      'spiral',
      'meander',
      'climb',
    ]);
    // Riesenbaum (w01) und Torabschnitt (w16) bleiben gerade, ebenso Vorland und Abschnitte hinter dem Tor
    for (const k of [-3, -1, 8, 15, 16, 40, 10_000]) expect(layout.macro(k).shape, `Abschnitt ${k}`).toBe('straight');
  });

  it('beginnt und endet auf dem Rückgrat mit dessen Tangente (C¹ zum Nachbarn)', () => {
    for (const { k } of shaped) {
      const seg = layout.segment(k);
      const m = layout.macro(k);
      const a = m.pts[0]!;
      const b = m.pts[m.pts.length - 1]!;
      expect(a[0]).toBeCloseTo(layout.backbone(seg.zStart), 6);
      expect(a[1]).toBeCloseTo(seg.zStart, 6);
      expect(b[0]).toBeCloseTo(layout.backbone(seg.zEnd), 6);
      expect(b[1]).toBeCloseTo(seg.zEnd, 6);
      for (const [i, j, z] of [
        [0, 1, seg.zStart],
        [m.pts.length - 2, m.pts.length - 1, seg.zEnd],
      ] as const) {
        const p = m.pts[i]!;
        const q = m.pts[j]!;
        const l = Math.hypot(q[0] - p[0], q[1] - p[1]);
        const s = layout.backboneSlope(z);
        const bl = Math.hypot(s, 1);
        // Laufrichtung des Rückgrats: (−x_b', −1)
        const dot = ((q[0] - p[0]) * (-s / bl) + (q[1] - p[1]) * (-1 / bl)) / l;
        expect(dot, `Abschnitt ${k} Tangente bei z ${z.toFixed(1)}`).toBeGreaterThan(0.995);
      }
    }
  });

  it('bleibt im Band (bandHalf − 6) und im z-Bereich seines Abschnitts, ohne sich zu schneiden', () => {
    for (const { k } of shaped) {
      const seg = layout.segment(k);
      const m = layout.macro(k);
      for (const [x, z] of m.pts) {
        expect(Math.abs(x - layout.backbone(z)), `Abschnitt ${k} bei z ${z.toFixed(1)}`).toBeLessThanOrEqual(layout.bandHalf(z) - BAND_MARGIN + 1e-6);
        expect(z).toBeLessThanOrEqual(seg.zStart + 1e-6);
        expect(z).toBeGreaterThanOrEqual(seg.zEnd - 1e-6);
      }
      const P = m.pts.filter((_, i) => i % 2 === 0);
      for (let i = 0; i + 1 < P.length; i++) {
        for (let j = i + 2; j + 1 < P.length; j++) {
          const [ax, az] = P[i]!;
          const [bx, bz] = P[i + 1]!;
          const [cx, cz] = P[j]!;
          const [dx, dz] = P[j + 1]!;
          const d1 = (dx - cx) * (az - cz) - (dz - cz) * (ax - cx);
          const d2 = (dx - cx) * (bz - cz) - (dz - cz) * (bx - cx);
          const d3 = (bx - ax) * (cz - az) - (bz - az) * (cx - ax);
          const d4 = (bx - ax) * (dz - az) - (bz - az) * (dx - ax);
          expect(d1 * d2 < 0 && d3 * d4 < 0, `Abschnitt ${k}: Schnitt ${i}/${j}`).toBe(false);
        }
      }
    }
  });

  it('hat die Bogenlänge levels × nodeSpacing (± 5 %), gleichabständig abgetastet', () => {
    for (const { k } of shaped) {
      const seg = layout.segment(k);
      const m = layout.macro(k);
      const want = seg.levels * ROUTE.nodeSpacing;
      expect(Math.abs(m.length - want) / want, `Abschnitt ${k}: ${m.length.toFixed(2)} statt ${want}`).toBeLessThan(0.05);
      const step = m.length / (m.pts.length - 1);
      expect(step).toBeGreaterThan(0.25);
      expect(step).toBeLessThan(0.35);
      for (let i = 1; i < m.pts.length; i++) expect(m.s[i]! - m.s[i - 1]!).toBeCloseTo(step, 1);
    }
  });

  it('ist deterministisch (gleicher Seed, beliebige Reihenfolge) und hängt am Seed', () => {
    const again = testLayout();
    for (const { k } of [...shaped].reverse()) expect(again.macro(k).pts).toEqual(layout.macro(k).pts);
    const other = testLayout(8);
    const differs = shaped.some(({ k }) => JSON.stringify(other.macro(k).pts) !== JSON.stringify(layout.macro(k).pts));
    expect(differs).toBe(true);
  });

  it('z-Länge in route.json = macroZLength(Form, levels × nodeSpacing, Parameter)', () => {
    for (const { e } of shaped) expect(e.length, `${specs[e.world]!.id} ${e.shape}`).toBe(macroZLength(e.shape!, e.levels * ROUTE.nodeSpacing, e.shapeParams ?? {}));
    // ohne Form: z-Länge = Bogenlänge, Mäander ohne Ausschlag ebenso
    expect(macroZLength('straight', 50.4)).toBe(50.4);
    expect(macroZLength('meander', 50.4, { amplitude: 0.01 })).toBeCloseTo(50.4, 1);
    // gefaltete Formen sind kürzer in z als Mäander
    expect(macroZLength('serpentine', 50.4)).toBeLessThan(macroZLength('meander', 50.4));
  });

  it('Serpentine: z läuft vor und zurück, Mäander nur vorwärts', () => {
    const z = (k: number): number[] => layout.macro(k).pts.map((p) => p[1]);
    const back = (zs: number[]): number => zs.reduce((acc, v, i) => (i > 0 && v > zs[i - 1]! ? acc + (v - zs[i - 1]!) : acc), 0);
    for (const { k, e } of shaped) {
      if (e.shape === 'serpentine') expect(back(z(k)), `Abschnitt ${k}`).toBeGreaterThan(0.5);
      if (e.shape === 'meander' || e.shape === 'climb') expect(back(z(k)), `Abschnitt ${k}`).toBe(0);
    }
  });

  it('Schnecke: umläuft ihr Zentrum mit Abstand ≥ Freiraum + 2 (das Fokus-Element steht dort)', () => {
    const field = testField();
    for (const { k, e } of shaped) {
      if (e.shape !== 'spiral') continue;
      const m = field.layout.macro(k);
      expect(m.centre).not.toBeNull();
      const focal = field.focalSlot(`p${k}`)!;
      expect(focal.position[0]).toBeCloseTo(m.centre![0], 9);
      expect(focal.position[2]).toBeCloseTo(m.centre![1], 9);
      const want = Math.max(e.shapeParams?.radius ?? 0, focal.clearRadius + 2);
      let near = Infinity;
      let sweep = 0;
      let prev: number | null = null;
      for (const [x, z] of m.pts) {
        near = Math.min(near, Math.hypot(x - m.centre![0], z - m.centre![1]));
        const a = Math.atan2(z - m.centre![1], x - m.centre![0]);
        if (prev !== null) {
          let d = a - prev;
          if (d > Math.PI) d -= 2 * Math.PI;
          if (d < -Math.PI) d += 2 * Math.PI;
          sweep += d;
        }
        prev = a;
      }
      expect(near, `Abschnitt ${k}`).toBeGreaterThanOrEqual(want - 0.1);
      // der Weg läuft um das Zentrum herum (mehr als ein halber Umlauf vom Rückgrat aus gesehen)
      expect(Math.abs(sweep), `Abschnitt ${k} Umlauf`).toBeGreaterThan(Math.PI * 0.75);
    }
  });

  it('hält Fokus-Elemente und Begleiter frei (≥ Freiraum + 1)', () => {
    const field = testField();
    for (const { k } of shaped) {
      const key = `p${k}`;
      for (const slot of [field.focalSlot(key), ...field.companionSlots(key)]) {
        if (!slot?.instance || slot.clearRadius <= 0) continue;
        const d = field.layout.macro(k).distance(slot.position[0], slot.position[2]);
        expect(d, `${slot.id} (${slot.instance.kind})`).toBeGreaterThanOrEqual(slot.clearRadius + 1);
      }
    }
    expect(focalClearRadius('winterOak', 2.3)).toBeCloseTo(5.52, 9);
    expect(KEEP_GAP).toBeGreaterThan(2);
  });

  it('Gratweg: die Querschenkel liegen auf Kammlinien der Hügelstaffel', () => {
    const ridge = shaped.find(({ e }) => e.shape === 'ridge')!;
    const spec = specs[ridge.e.world]!.terrain.ridges!;
    const m = layout.macro(ridge.k);
    let across = 0;
    let onCrest = 0;
    m.pts.forEach(([x, z], i) => {
      // quer laufend: Normale längs z
      if (Math.abs(m.normals[i]![1]) < 0.97) return;
      across++;
      if (Math.abs(ridgeTrainCrest(spec, layout.seed, x, z) - z) < 1.6) onCrest++;
    });
    expect(across).toBeGreaterThan(10);
    expect(onCrest / across).toBeGreaterThan(0.6);
  });

  it('liefert Abstand, nächsten Punkt, Seite und äußere Lage über Abschnittsgrenzen hinweg', () => {
    const k = shaped.find(({ e }) => e.shape === 'serpentine')!.k;
    const m = layout.macro(k);
    const i = Math.floor(m.pts.length / 3);
    const [x, z] = m.pts[i]!;
    const [nx, nz] = m.normals[i]!;
    expect(layout.pathDistance(x, z)).toBeLessThan(1e-6);
    const off = layout.pathNearest(x + nx * 1.5, z + nz * 1.5);
    expect(off.k).toBe(k);
    expect(off.d).toBeCloseTo(1.5, 2);
    expect(off.side).toBe(1);
    expect(layout.pathSide(x - nx * 1.5, z - nz * 1.5)).toBe(-1);
    // äußere Lage: mindestens so weit außen wie jede Probe in der Nähe
    for (const side of [-1, 1]) {
      const env = layout.pathEnvelope(z, side);
      for (const p of m.pts) if (Math.abs(p[1] - z) <= 4) expect(env).toBeGreaterThanOrEqual(side * (p[0] - layout.backbone(p[1])) - 1e-4);
    }
  });

  it('formt auch ohne Weltspezifikation und weit draußen gerade, schnell und deterministisch', () => {
    const straight = macroCenterline({ k: 3, zStart: -10, zEnd: -40 }, (z) => z * 0.1, () => 30, 7, 'straight');
    for (const [x, z] of straight.pts) expect(x).toBeCloseTo(z * 0.1, 9);
    expect(straight.length).toBeCloseTo(30 * Math.hypot(1, 0.1), 6);
    const t0 = performance.now();
    const far = testLayout(7, { procedural: true });
    for (let k = 9990; k < 10_000; k++) expect(far.macro(k).shape).toBe('straight');
    expect(performance.now() - t0).toBeLessThan(500);
  });
});
