import type { BoardRenderer } from './BoardRenderer';
import { MOTIF } from './BoardProps';
import { easeIn, easeOut, easeOutCubic, type TweenOptions } from './boardTween';

/** Tween calls of one move (tagged, so a newer move can hurry or fast-forward them). */
export interface FxScope {
  add(duration: number, apply: (t: number) => void, opts?: TweenOptions): void;
  after(seconds: number, fn: () => void): void;
}

const hash = (a: number, b: number): number => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/**
 * Merge and landing splashes in the Earle palette, built from the board's own props and particles (no glow,
 * no transparency): liquid crowns (a ring of body-coloured spikes that shoots up and falls back), droplet
 * arcs, ripple rings running over the plates, ink splats that shrink away, dust rings for stomps and a plate
 * wave. Every effect is a set of tagged tweens, so a hurried move plays its splashes faster too.
 */
export class BoardFx {
  private seq = 0;

  constructor(private readonly r: BoardRenderer) {}

  private key(kind: string): string {
    return `fx:${kind}:${++this.seq}`;
  }

  /** Liquid crown: `n` spikes around the impact, leaning out, up and back down in ≈ 0.34 s, plus droplet arcs. */
  crown(tw: FxScope, delay: number, x: number, z: number, radius: number, colors: readonly string[], seed: number, height = 1): void {
    const r = this.r;
    const top = r.layout.top;
    const n = 8;
    const keys: string[] = [];
    tw.after(delay, () => {
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + hash(seed, k) * 0.5;
        const c = Math.cos(a);
        const s = Math.sin(a);
        const lean = 0.55 + hash(seed, k + 9) * 0.35;
        const half = -lean / 2;
        const key = this.key('crown');
        const tall = radius * (0.75 + hash(seed, k + 3) * 0.6) * height;
        const p = r.props.add(
          key,
          {
            family: 'spire',
            x: x + c * radius * 0.95,
            y: top,
            z: z + s * radius * 0.95,
            sx: radius * 0.34,
            sy: tall,
            sz: radius * 0.34,
            quat: [-s * Math.sin(half), 0, c * Math.sin(half), Math.cos(half)],
            color: colors[k % colors.length] ?? '#ffffff',
            motif: MOTIF.tipLight,
          },
          r.now,
        );
        if (!p) continue;
        p.scale = 0.001;
        keys.push(key);
        const kk = k;
        tw.add(
          0.34 + hash(seed, kk + 5) * 0.08,
          (t) => {
            const up = t < 0.3 ? easeOut(t / 0.3) : 1 - easeIn((t - 0.3) / 0.7);
            p.scale = Math.max(0.001, up);
            p.ox = c * radius * 0.35 * t;
            p.oz = s * radius * 0.35 * t;
          },
          { done: () => r.props.remove(key) },
        );
      }
      r.particles.burst('droplet', r.now, x, top + radius * 0.2, z, 14, { up: 2.4 * height, spread: 1.7, life: 0.85, size: 0.07, colors: [...colors], seed, ring: radius * 0.9 });
    });
  }

  /** Ripple rings running over the plates from `r0` to `r1` (board units). */
  ripple(tw: FxScope, delay: number, x: number, z: number, r0: number, r1: number, color: string, rings = 2): void {
    const r = this.r;
    const top = r.layout.top;
    for (let i = 0; i < rings; i++) {
      const key = this.key('ripple');
      tw.after(delay + i * 0.11, () => {
        const p = r.props.add(key, { family: 'hoop', x, y: top + 0.003, z, sx: r0 * 2, sy: 1, sz: r0 * 2, color }, r.now);
        if (!p) return;
        const grow = (r1 - r0) / Math.max(1e-3, r0) * (1 - i * 0.25);
        tw.add(
          0.7,
          (t) => {
            p.scale = 1 + grow * t;
            // Thinner as it spreads: the hoop sinks into the plates at the end.
            p.oy = -0.012 * t * t * (1 + grow);
          },
          { ease: easeOutCubic, done: () => r.props.remove(key) },
        );
      });
    }
  }

  /** Ink splats around an impact: flat irregular discs that snap open and shrink away over ≈ 1.4 s. */
  inkSplats(tw: FxScope, delay: number, x: number, z: number, radius: number, seed: number, n = 4, color?: string): void {
    const r = this.r;
    const top = r.layout.top;
    const ink = color ?? r.palette.ink;
    tw.after(delay, () => {
      for (let k = 0; k < n; k++) {
        const a = hash(seed, k * 3) * Math.PI * 2;
        const d = radius * (0.9 + hash(seed, k * 3 + 1) * 0.7);
        const size = radius * (0.2 + hash(seed, k * 3 + 2) * 0.28);
        const key = this.key('ink');
        const p = r.props.add(key, { family: 'disc', x: x + Math.cos(a) * d, y: top + 0.003 + k * 0.0004, z: z + Math.sin(a) * d, ry: a, sx: size * 1.3, sy: 0.004, sz: size, color: ink }, r.now);
        if (!p) continue;
        p.scale = 0.001;
        tw.add(
          1.4 + hash(seed, k) * 0.4,
          (t) => {
            p.scale = Math.max(0.001, t < 0.05 ? t / 0.05 : 1 - easeIn((t - 0.05) / 0.95));
          },
          { ease: (t) => t, done: () => r.props.remove(key) },
        );
      }
    });
  }

  /** Stomp dust: a soil-coloured ring rolling outward, dust puffs and a low spray of grit. */
  dust(tw: FxScope, delay: number, x: number, z: number, radius: number, seed: number): void {
    const r = this.r;
    const pal = r.palette;
    const top = r.layout.top;
    this.ripple(tw, delay, x, z, radius * 0.6, radius * 2.0, pal.soil, 2);
    tw.after(delay, () => {
      r.particles.burst('spore', r.now, x, top + 0.05, z, 18, { up: 0.5, spread: 1.4, life: 0.9, size: 0.09, colors: [pal.soil, pal.paper, pal.soilDeep], seed, ring: radius * 0.8 });
      r.particles.burst('droplet', r.now, x, top + 0.05, z, 10, { up: 1.1, spread: 1.6, life: 0.55, size: 0.045, colors: [pal.soilDeep, pal.crack, pal.soil], seed: seed + 1, ring: radius * 0.6 });
    });
  }

  /** Plates around a point jump in a travelling wave (stomps, big landings). */
  plateWave(tw: FxScope, delay: number, x: number, z: number, strength: number, reach = 2.6): void {
    const r = this.r;
    const pitch = r.layout.pitch;
    const affected = r.cells.cells
      .map((c) => ({ c, d: Math.hypot(c.x - x, c.z - z) / pitch }))
      .filter((e) => e.d <= reach);
    tw.add(
      0.6,
      (t) => {
        for (const { c, d } of affected) {
          const local = t * 3.2 - d * 0.55;
          c.lift = local > 0 && local < 1 ? Math.sin(Math.PI * local) * 0.05 * strength * (1 - d / (reach + 0.5)) : 0;
        }
      },
      { ease: (t) => t, delay, done: () => { for (const { c } of affected) c.lift = 0; } },
    );
  }

  /** Droplets flicked off the trailing side of a moving blob. */
  trail(x: number, y: number, z: number, dx: number, dz: number, radius: number, color: string, seed: number): void {
    const r = this.r;
    const j = hash(seed, r.now * 60) - 0.5;
    r.particles.emit('droplet', r.now, x - dx * radius * 0.85 - dz * j * radius * 0.6, y, z - dz * radius * 0.85 + dx * j * radius * 0.6, -dx * (0.35 + Math.abs(j)) - dz * j * 0.5, 0.55 + Math.abs(j), -dz * (0.35 + Math.abs(j)) + dx * j * 0.5, 0.5, 0.035 + Math.abs(j) * 0.03, color, seed);
  }

  /** Forward fan of droplets where a sliding blob stops (the jelly keeps going). */
  splatFan(x: number, y: number, z: number, dx: number, dz: number, radius: number, colors: readonly string[], seed: number): void {
    const r = this.r;
    for (let k = 0; k < 7; k++) {
      const a = (hash(seed, k) - 0.5) * 1.6;
      const c = Math.cos(a);
      const s = Math.sin(a);
      const fx = dx * c - dz * s;
      const fz = dz * c + dx * s;
      const sp = 0.7 + hash(seed, k + 7) * 0.9;
      r.particles.emit('droplet', r.now, x + fx * radius * 0.8, y, z + fz * radius * 0.8, fx * sp, 0.9 + hash(seed, k + 3) * 0.8, fz * sp, 0.55, 0.04 + hash(seed, k + 5) * 0.03, colors[k % colors.length] ?? '#ffffff', k);
    }
  }
}
