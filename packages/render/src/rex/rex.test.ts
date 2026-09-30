import { describe, expect, it } from 'vitest';
import { RexAnimator } from './rexAnimator';
import { jawAt, syllableSchedule, vowelGroups } from './rexSyllables';
import { REX_HEIGHT, REX_RIM_CUT, chooseBoardSpot, mapPlacementToCamera, placeRexOnMap, type RexMapLayoutInput } from './rexPlacement';

describe('REX talk timing', () => {
  it('counts German vowel groups (diphthongs once)', () => {
    expect(vowelGroups('Hallo')).toEqual(['a', 'o']);
    expect(vowelGroups('Kleines')).toEqual(['ei', 'e']);
    expect(vowelGroups('Hm')).toEqual([]);
  });

  it('builds a monotonic schedule with pauses and line flags', () => {
    const s = syllableSchedule('Zwei Gleiche. Schieb sie zusammen!');
    expect(s.exclaim).toBe(true);
    expect(s.question).toBe(false);
    for (let i = 1; i < s.syllables.length; i++) expect(s.syllables[i]!.t0).toBeGreaterThanOrEqual(s.syllables[i - 1]!.t1 - 1e-9);
    // The full stop pauses the jaw.
    const gap = s.syllables.findIndex((x, i) => i > 0 && x.t0 - s.syllables[i - 1]!.t1 > 0.25);
    expect(gap).toBeGreaterThan(0);
    for (let t = 0; t < s.duration; t += 0.01) {
      const j = jawAt(s, t);
      expect(j).toBeGreaterThanOrEqual(0);
      expect(j).toBeLessThanOrEqual(1.2);
    }
    expect(syllableSchedule('Nochmal?').question).toBe(true);
  });
});

describe('REX animator', () => {
  const run = (fps: number, seconds: number): RexAnimator => {
    const a = new RexAnimator({ seed: 5 });
    const script: Array<[number, (x: RexAnimator) => void]> = [
      [0.5, (x) => x.cheer(2)],
      [2.0, (x) => x.talk('Dreifach! Dreifach!')],
      [2.2, (x) => x.despair()],
      [4.0, (x) => x.point([1, 0.2, 0.4])],
      [6.0, (x) => x.dizzy()],
    ];
    let t = 0;
    const dt = 1 / fps;
    let k = 0;
    while (t < seconds - 1e-9) {
      while (k < script.length && script[k]![0] <= t + 1e-9) script[k++]![1](a);
      a.update(dt);
      t += dt;
    }
    return a;
  };

  it('is frame-rate independent and deterministic', () => {
    const a = run(60, 8);
    const b = run(30, 8);
    const c = run(120, 8);
    const pick = (x: RexAnimator) => [x.pose.headPitch, x.pose.jaw, x.pose.armL.raise, x.pose.tailYaw[3], x.pose.emerge, x.spin];
    for (const [u, v] of [
      [pick(a), pick(b)],
      [pick(a), pick(c)],
    ]) {
      u!.forEach((val, i) => expect(val).toBeCloseTo(v![i]!, 9));
    }
  });

  it('hides below the rim and peeks back up', () => {
    const a = new RexAnimator({ seed: 1 });
    a.hide();
    for (let i = 0; i < 60; i++) a.update(1 / 60);
    expect(a.hidden).toBe(true);
    expect(a.invisible).toBe(true);
    a.peek();
    expect(a.hidden).toBe(false);
    for (let i = 0; i < 120; i++) a.update(1 / 60);
    expect(a.pose.emerge).toBeGreaterThan(0.9);
    expect(a.invisible).toBe(false);
  });

  it('returns to idle after an action and honours the time scale', () => {
    const a = new RexAnimator({ seed: 2 });
    a.timeScale = 0.5;
    a.cheer();
    expect(a.action).toBe('cheer');
    for (let i = 0; i < 60; i++) a.update(1 / 60);
    expect(a.action).toBe('cheer'); // 1 s wall clock = 0.5 s animation
    for (let i = 0; i < 120; i++) a.update(1 / 60);
    expect(a.action).toBe('idle');
  });
});

describe('REX placement', () => {
  const phone: RexMapLayoutInput = {
    width: 393,
    height: 852,
    safe: { top: 59, right: 0, bottom: 34, left: 0 },
    hudTop: 120,
    hudBottom: 696,
    lineBox: { left: 16, right: 377, top: 696, bottom: 744 },
    actions: { left: 121, right: 271, top: 756, bottom: 804 },
    avoid: [{ x: 196, y: 579, r: 46, weight: 3 }],
  };

  it('stands on the line box on a phone, clear of the current node', () => {
    const p = placeRexOnMap(phone);
    expect(p.stance).toBe('onBox');
    expect(p.rimY).toBeLessThanOrEqual(696);
    expect(p.overlap).toBe(0);
    expect(p.rimY - p.visible).toBeGreaterThan(phone.hudTop);
    // Never covers the node: its box keeps clear of the node circle.
    const half = (p.visible * 0.92) / 2;
    const nearestX = Math.max(p.x - half, Math.min(196, p.x + half));
    expect(Math.hypot(nearestX - 196, Math.max(0, 579 - p.rimY))).toBeGreaterThan(0);
  });

  it('moves to the free corner when the path comes his way', () => {
    const right = placeRexOnMap({ ...phone, avoid: [...phone.avoid, { x: 330, y: 640, r: 30, weight: 1.5 }] });
    expect(right.side).toBe('left');
    const left = placeRexOnMap({ ...phone, avoid: [...phone.avoid, { x: 60, y: 640, r: 30, weight: 1.5 }] });
    expect(left.side).toBe('right');
  });

  it('uses the free bottom corner beside a narrow line box on desktop', () => {
    const p = placeRexOnMap({
      width: 1280,
      height: 800,
      safe: { top: 0, right: 0, bottom: 0, left: 0 },
      hudTop: 70,
      hudBottom: 690,
      lineBox: { left: 380, right: 900, top: 690, bottom: 730 },
      actions: { left: 570, right: 710, top: 740, bottom: 788 },
      avoid: [{ x: 640, y: 544, r: 46, weight: 3 }],
    });
    expect(p.stance).toBe('corner');
    expect(p.rimY).toBe(800);
  });

  it('converts to camera space: the rim line sits where REX is cut', () => {
    const p = placeRexOnMap(phone);
    const fov = 52;
    const depth = 1.6;
    const c = mapPlacementToCamera(p, { width: 393, height: 852, fovDeg: fov }, depth);
    const tanHalf = Math.tan((fov * Math.PI) / 360);
    // The body point at the cut height lies on the clip plane (n · p = 0).
    const cutY = c.y + REX_RIM_CUT * c.scale;
    const d = c.clip[1] * cutY + c.clip[2] * c.z;
    expect(Math.abs(d)).toBeLessThan(1e-3);
    // Visible part (head top − cut) spans `visible` px.
    const px = ((REX_HEIGHT - REX_RIM_CUT) * c.scale * 852) / (2 * depth * tanHalf);
    expect(px).toBeCloseTo(p.visible, 3);
  });

  it('picks a board spot that covers no cells', () => {
    // Simple top-down projection: 60 px per unit, board centred.
    const spot = chooseBoardSpot({
      footprint: { minX: -2.4, maxX: 2.4, minZ: -2.9, maxZ: 2.4 },
      cells: { minX: -1.62, maxX: 1.62, minZ: -1.62, maxZ: 1.62 },
      topY: 0.35,
      groundY: 0,
      rexHeight: 1.4,
      project: (x, y, z) => ({ x: 640 + x * 60, y: 400 + z * 60 - y * 25 }),
      width: 1280,
      height: 800,
      hudTop: 80,
      hudBottom: 690,
    });
    const cells = { left: 640 - 1.62 * 60, right: 640 + 1.62 * 60, top: 400 - 1.62 * 60 - 0.35 * 25, bottom: 400 + 1.62 * 60 };
    const ix = Math.max(0, Math.min(spot.rect.right, cells.right) - Math.max(spot.rect.left, cells.left));
    const iy = Math.max(0, Math.min(spot.rect.bottom, cells.bottom) - Math.max(spot.rect.top, cells.top));
    expect(ix * iy).toBe(0);
  });

  it('phones: peeks into the top-right corner behind the board, under the pill, clear of the grid', () => {
    // Portrait level camera from above: the grid fills the width, its far edge ≈ 250 px from the top.
    const W = 393;
    const H = 852;
    const project = (x: number, y: number, z: number) => ({ x: W / 2 + x * 85, y: 420 + z * 80 - y * 70 });
    const spot = chooseBoardSpot({
      footprint: { minX: -3.2, maxX: 3.2, minZ: -3.6, maxZ: 3.0 },
      cells: { minX: -2.02, maxX: 2.02, minZ: -2.02, maxZ: 2.02 },
      topY: 0.35,
      groundY: 0,
      rexHeight: 1.1,
      project,
      width: W,
      height: H,
      hudTop: 70,
      hudBottom: 720,
      corner: 'topRight',
    });
    expect(spot.kind).toBe('back');
    expect(spot.side).toBe('right');
    // Right half, below the pill, above the grid's far edge, on screen.
    expect((spot.rect.left + spot.rect.right) / 2).toBeGreaterThan(W * 0.55);
    expect(spot.rect.right).toBeLessThanOrEqual(W);
    expect(spot.rect.top).toBeGreaterThanOrEqual(70);
    const gridTop = project(0, 0.35, -2.02).y;
    expect(spot.rect.bottom).toBeLessThanOrEqual(gridTop + 1);
  });
});
