import { norm3 } from './math';
import type { SquashState, Vec3 } from './types';

/** A squash as the renderer and the locomotion controller describe it (axis + signed amount). */
export interface SquashLike {
  axis: Vec3;
  amount: number;
}

/**
 * Combines the locomotion squash (jumps, splats, stomps) with the impulse driver's wobble (pokes,
 * slides). Amounts add; the axis is the magnitude-weighted blend, sign-aligned so the two never cancel
 * by pointing opposite ways. Keeps the result inside the range the volume-preserving map can show.
 */
export function combineSquash(motion: SquashLike, driver: SquashState, offsetScale = 0.22): { axis: Vec3; amount: number; offset: Vec3 } {
  const wa = Math.abs(motion.amount);
  const wb = Math.abs(driver.amount);
  let axis: Vec3;
  if (wa + wb < 1e-6) axis = [motion.axis[0], motion.axis[1], motion.axis[2]];
  else {
    const a = norm3(motion.axis);
    let b = norm3(driver.axis);
    if (a[0] * b[0] + a[1] * b[1] + a[2] * b[2] < 0) b = [-b[0], -b[1], -b[2]];
    axis = norm3([a[0] * wa + b[0] * wb, a[1] * wa + b[1] * wb, a[2] * wa + b[2] * wb]);
  }
  const amount = Math.max(-0.6, Math.min(1.2, motion.amount + driver.amount));
  return { axis, amount, offset: [driver.offset[0] * offsetScale, driver.offset[1] * offsetScale, driver.offset[2] * offsetScale] };
}
