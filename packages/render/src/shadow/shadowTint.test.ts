import { describe, expect, it } from 'vitest';
import { float, vec3 } from 'three/tsl';
import { ShadowTint } from './shadowTint';

describe('ShadowTint (Schattentönung je Welt)', () => {
  it('setzt, begrenzt und löscht Tönungen je Welt', () => {
    const tint = new ShadowTint(4);
    tint.set(2, '#3b5bdb', 1.4);
    const t = tint.get(2)!;
    expect(t.amount).toBe(1);
    expect(t.color.x).toBeGreaterThan(0);
    expect(t.color.z).toBeGreaterThan(t.color.x);
    tint.set(1, 0xff0000, -0.5);
    expect(tint.get(1)!.amount).toBe(0);
    tint.clear(2);
    expect(tint.get(2)!.amount).toBe(0);
    // außerhalb: ignoriert
    tint.set(9, '#ffffff', 1);
    expect(tint.get(9)).toBeNull();
  });

  it('liefert TSL-Knoten für Farbe, Stärke und die getönte Tinte', () => {
    const tint = new ShadowTint(8);
    const n = tint.node(float(3));
    expect(n.color).toBeTruthy();
    expect(n.amount).toBeTruthy();
    const ink = tint.tintInk(vec3(0.05, 0.06, 0.07) as never, float(3) as never, float(0.5) as never);
    expect((ink as unknown as { isNode: boolean }).isNode).toBe(true);
  });
});
