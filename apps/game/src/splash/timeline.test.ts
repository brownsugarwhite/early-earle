import { describe, expect, it } from 'vitest';
import { Timeline, easeOut, frames, keys } from './timeline';
import { flameShape, makeTongue, flameStep, embers, noise1 } from './flame';
import type { Pt } from './longShadow';
import { LOGO } from './logo.gen';

interface State {
  x: number;
  scale: number;
  pose: string;
  visible: boolean;
}

/** Eine kleine Choreografie wie im Splash: Fall, gestufte Pose, Sprung, offene Leerlauf-Spur. */
function build(state: State, log: string[]): Timeline {
  const tl = new Timeline();
  tl.reset = () => {
    state.x = 0;
    state.scale = 0;
    state.pose = 'none';
    state.visible = false;
  };
  tl.add({ t0: 0.2, dur: 0.5, ease: easeOut, apply: (p) => ((state.x = 100 * p), (state.visible = true)) });
  tl.add({ t0: 0.7, dur: 0.3, steps: 3, apply: (p) => (state.scale = keys([0, 1.5, 0.9, 1])(p)) });
  tl.add({ t0: 1.0, dur: 0.24, apply: (p) => (state.pose = frames(['a', 'b', 'c'])(p)) });
  tl.add({ t0: 1.3, dur: Infinity, fps: 12, apply: (_p, t) => (state.x = 100 + Math.round(t * 12)) });
  tl.call(0.25, () => log.push('clack'));
  tl.call(0.7, () => log.push('stamp'), 'stamp');
  tl.call(1.0, () => log.push('pop'));
  return tl;
}

describe('Zeitleiste', () => {
  it('seek(t) ergibt denselben Zustand wie schrittweises Abspielen', () => {
    for (const T of [0.1, 0.33, 0.71, 0.9, 1.05, 1.2, 1.9, 3.3]) {
      const a: State = { x: 0, scale: 0, pose: '', visible: false };
      const tlA = build(a, []);
      tlA.seek(0);
      for (let t = 0; t < T - 1e-9; t += 1 / 60) tlA.update(Math.min(1 / 60, T - t));
      const b: State = { x: 0, scale: 0, pose: '', visible: false };
      build(b, []).seek(T);
      expect(a, `t=${T}`).toEqual(b);
    }
  });

  it('Aufrufe feuern genau einmal, beim Springen gar nicht', () => {
    const s: State = { x: 0, scale: 0, pose: '', visible: false };
    const log: string[] = [];
    const tl = build(s, log);
    tl.seek(0);
    for (let i = 0; i < 200; i++) tl.update(1 / 60);
    expect(log).toEqual(['clack', 'stamp', 'pop']);
    // Springen über Aufrufe hinweg löst nichts aus, Weiterspielen auch nicht
    const log2: string[] = [];
    const tl2 = build({ ...s }, log2);
    tl2.seek(0.8);
    for (let i = 0; i < 60; i++) tl2.update(1 / 60);
    expect(log2).toEqual(['pop']);
  });

  it('gestufte Spur hält Posen: 3 Stufen über 0,3 s', () => {
    const s: State = { x: 0, scale: 0, pose: '', visible: false };
    const tl = build(s, []);
    const seen = new Set<number>();
    for (let t = 0.7; t <= 1.0; t += 0.01) {
      tl.seek(t);
      seen.add(Math.round(s.scale * 1000) / 1000);
    }
    // 0 (am Start), dann drei gehaltene Posen
    expect([...seen].sort()).toEqual([0, 0.9, 1, 1.5].sort());
  });

  it('Schnellvorlauf (×6), Schnappen ans Ende und reduzierte Bewegung (Schnitt) enden im selben Zustand', () => {
    const end = 1.3; // Ende der endlichen Spuren
    const fast: State = { x: 0, scale: 0, pose: '', visible: false };
    const tlF = build(fast, []);
    tlF.timeScale = 6;
    tlF.seek(0);
    while (tlF.time < end) tlF.update(1 / 60);
    tlF.seek(end); // Leerlauf beginnt bei 1,3: gleicher Bezugspunkt
    const cut: State = { x: 0, scale: 0, pose: '', visible: false };
    build(cut, []).seek(end);
    const snap: State = { x: 0, scale: 0, pose: '', visible: false };
    const tlS = build(snap, []);
    tlS.seek(0.5);
    // Schnappen: Rest in 120 ms
    tlS.timeScale = (end - tlS.time) / 0.12;
    tlS.cancelCalls((tag) => tag === 'stamp');
    while (tlS.time < end - 1e-9) tlS.update(Math.min(1 / 60, (end - tlS.time) / tlS.timeScale));
    expect(fast).toEqual(cut);
    expect(snap).toEqual(cut);
    expect(tlF.duration).toBeCloseTo(1.24, 5); // offene Leerlauf-Spur zählt nicht
  });

  it('beim Schnappen bleibt nur der Stempel', () => {
    const log: string[] = [];
    const tl = build({ x: 0, scale: 0, pose: '', visible: false }, log);
    tl.seek(0.5);
    tl.cancelCalls((tag) => tag === 'stamp');
    tl.timeScale = 10;
    for (let i = 0; i < 30; i++) tl.update(1 / 60);
    expect(log).toEqual(['stamp']);
  });
});

describe('Flamme', () => {
  const big = makeTongue(LOGO.flame.rest[0] as unknown as Pt[], 492);
  const small = makeTongue(LOGO.flame.rest[1] as unknown as Pt[]);

  it('deterministisch pro Seed und Zeit, anderer Seed → andere Form', () => {
    const a = flameShape(big, 1.234, 7);
    const b = flameShape(big, 1.234, 7);
    const c = flameShape(big, 1.234, 8);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it('in 12-fps-Stufen: innerhalb einer Stufe identisch', () => {
    expect(flameStep(1.0)).toBeCloseTo(1.0, 9);
    expect(flameShape(small, 1.01, 3)).toEqual(flameShape(small, 1.08, 3));
    expect(flameShape(small, 1.01, 3)).not.toEqual(flameShape(small, 1.09, 3));
  });

  it('die Basis bleibt stehen (mit dem Bogen verschmolzen)', () => {
    for (let t = 0; t < 10; t += 0.37) {
      const s = flameShape(big, t, 7);
      big.rest.forEach((p, i) => {
        if (p[1] >= big.baseY) {
          expect(s[i]![0]).toBeCloseTo(p[0], 6);
          expect(s[i]![1]).toBeCloseTo(p[1], 6);
        }
      });
    }
  });

  it('begrenzt: Auslenkung höchstens Rauschamplitude plus Einrollen', () => {
    let maxD = 0;
    for (let t = 0; t < 30; t += 0.083) {
      for (const tongue of [big, small]) {
        const s = flameShape(tongue, t, 7);
        tongue.rest.forEach((p, i) => {
          const d = Math.hypot(s[i]![0] - p[0], s[i]![1] - p[1]);
          maxD = Math.max(maxD, d);
        });
      }
    }
    // 6 px Rauschen (x) + 2,7 px (y) + Einrollen 14° um die Basis bei ≈ 105 px Höhe ≈ 26 px
    expect(maxD).toBeLessThan(6 * 1.1 + 2.7 + 0.25 * big.height);
    expect(maxD).toBeGreaterThan(1);
  });

  it('Rauschen bleibt in [−1, 1], Glut steigt und schrumpft in Stufen', () => {
    for (let x = -20; x < 20; x += 0.173) {
      const v = noise1(x, 5);
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
    }
    const tip: Pt = [366, 406];
    let seen = 0;
    const sizes = new Set<number>();
    for (let t = 0; t < 30; t += 0.05) {
      for (const e of embers(t, tip, 7)) {
        seen++;
        sizes.add(e.size);
        expect(e.y).toBeLessThan(tip[1]);
        expect(e.y).toBeGreaterThan(tip[1] - 60);
      }
    }
    expect(seen).toBeGreaterThan(20);
    expect([...sizes].sort()).toEqual([1.8, 3, 4.2]);
  });
});
