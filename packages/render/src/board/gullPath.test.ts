import { describe, expect, it } from 'vitest';
import {
  GULL_INDEX,
  GULL_MAX_HEIGHT,
  GULL_STRETCH,
  GULL_VERTS,
  awayInUV,
  gullCasterMatrix,
  gullCenter,
  gullOutline,
  gullPose,
  gullRestOutline,
  gullSpan,
  planGullFlight,
  projectToGround,
  type GullFlight,
  type GullFlightSpec,
} from './gullPath';

const deg = (d: number): number => (d * Math.PI) / 180;
/** Sonne aus Höhe/Azimut (brettlokal, Azimut von −z im Uhrzeigersinn über +x). */
const sunAt = (elevation: number, azimuth: number): [number, number, number] => [
  Math.cos(deg(elevation)) * Math.sin(deg(azimuth)),
  Math.sin(deg(elevation)),
  -Math.cos(deg(elevation)) * Math.cos(deg(azimuth)),
];

const TIMES = { enterAt: 0.2, callAt: 0.45, releaseAt: 1.0, impactAt: 1.42, exitAt: 2.1 };

function spec(over: Partial<GullFlightSpec> = {}): GullFlightSpec {
  return {
    cell: [0.405, -0.405],
    ground: 0.03,
    camera: [0, 9.5, 4.2],
    sun: sunAt(10, 70),
    side: 1,
    corridor: 0,
    span: gullSpan(4 * 0.81),
    times: TIMES,
    ...over,
  };
}

/** Wendet eine column-major-Matrix auf einen Punkt an. */
function apply(m: ArrayLike<number>, x: number, y: number, z: number): [number, number, number] {
  return [m[0]! * x + m[4]! * y + m[8]! * z + m[12]!, m[1]! * x + m[5]! * y + m[9]! * z + m[13]!, m[2]! * x + m[6]! * y + m[10]! * z + m[14]!];
}

function casterVertices(flightSpec: GullFlightSpec, t: number, planned?: GullFlight): { world: [number, number, number][]; uv: Float32Array; c: { x: number; z: number; hx: number; hz: number } } {
  const flight = planned ?? planGullFlight(flightSpec);
  const c = gullCenter(flight, t);
  const pose = gullPose(flight, t);
  const uv = gullOutline(flightSpec.span, pose, awayInUV(flight, c.hx, c.hz), new Float32Array(GULL_VERTS * 2));
  const m = gullCasterMatrix(flight, c.x, c.z, c.hx, c.hz);
  const world: [number, number, number][] = [];
  for (let i = 0; i < GULL_VERTS; i++) world.push(apply(m, uv[i * 2]!, 0, uv[i * 2 + 1]!));
  return { world, uv, c };
}

describe('Möwenschatten: Umriss', () => {
  it('21 Dreiecke über den Eckpunkten; Spannweite der Ruhepose = Spannweite', () => {
    expect(GULL_INDEX.length).toBe(21 * 3);
    for (const i of GULL_INDEX) expect(i).toBeLessThan(GULL_VERTS);
    for (const span of [1.7, 2.1, 2.5]) {
      const uv = gullRestOutline(span);
      let minV = Infinity;
      let maxV = -Infinity;
      let minU = Infinity;
      let maxU = -Infinity;
      for (let i = 0; i < GULL_VERTS; i++) {
        minU = Math.min(minU, uv[i * 2]!);
        maxU = Math.max(maxU, uv[i * 2]!);
        minV = Math.min(minV, uv[i * 2 + 1]!);
        maxV = Math.max(maxV, uv[i * 2 + 1]!);
      }
      expect(maxV - minV).toBeCloseTo(span, 5);
      // Körper vom Kopf bis zum Schwanz ≈ 0,42 der Spannweite (Silbermöwe), symmetrisch
      expect(maxU - minU).toBeCloseTo(0.42 * span, 5);
      expect(maxV).toBeCloseTo(-minV, 6);
    }
  });

  it('Spannweite aus der Brettbreite: 0,55 × Breite, zwischen 1,7 und 2,5', () => {
    expect(gullSpan(1 * 0.81)).toBe(1.7);
    expect(gullSpan(4 * 0.81)).toBeCloseTo(1.782, 3);
    expect(gullSpan(5 * 0.81)).toBeCloseTo(2.2275, 3);
    expect(gullSpan(8 * 0.81)).toBe(2.5);
  });
});

describe('Möwenschatten: Flug', () => {
  it('der Schatten steht beim Abwurf genau über der Zielzelle', () => {
    for (const corridor of [0, 1, 2] as const) {
      for (const side of [-1, 1] as const) {
        const f = planGullFlight(spec({ corridor, side }));
        const c = gullCenter(f, TIMES.releaseAt);
        expect(c.x).toBeCloseTo(0.405, 12);
        expect(c.z).toBeCloseTo(-0.405, 12);
        expect(c.hx).toBeCloseTo(f.f[0], 12);
        expect(c.hz).toBeCloseTo(f.f[1], 12);
      }
    }
  });

  it('fliegt schräg von der Kamera weg: ±35°/55°/45° zur Bildschirm-Senkrechten, Seite nach `side`', () => {
    const s0 = spec();
    // Bildschirm-oben am Boden = von der Kamera durch die Zelle
    const ux = s0.cell[0] - s0.camera[0];
    const uz = s0.cell[1] - s0.camera[2];
    const ul = Math.hypot(ux, uz);
    const expected = [35, 55, 45];
    for (const corridor of [0, 1, 2] as const) {
      for (const side of [-1, 1] as const) {
        const f = planGullFlight(spec({ corridor, side }));
        const along = (f.f[0] * ux + f.f[1] * uz) / ul;
        // rechts = (−u.z, u.x)
        const across = (f.f[0] * -uz + f.f[1] * ux) / ul;
        expect((Math.acos(along) * 180) / Math.PI).toBeCloseTo(expected[corridor]!, 6);
        expect(Math.sign(across)).toBe(side);
      }
    }
  });

  it('kommt von außerhalb und fliegt hinaus (≥ 5 Einheiten vor, ≥ 8 nach dem Abwurf)', () => {
    const f = planGullFlight(spec({ times: { enterAt: 0.4, callAt: 0.65, releaseAt: 1.2, impactAt: 1.62, exitAt: 2.3 } }));
    const a = gullCenter(f, 0.4);
    const b = gullCenter(f, 2.3);
    expect(Math.hypot(a.x - 0.405, a.z + 0.405)).toBeGreaterThan(5);
    expect(Math.hypot(b.x - 0.405, b.z + 0.405)).toBeGreaterThan(8);
  });

  it('jeder Werfer-Eckpunkt fällt entlang der Sonne exakt auf den entworfenen, 1,35× gestreckten Umriss', () => {
    for (const sun of [sunAt(10, 70), sunAt(12, 62), sunAt(10, -110), sunAt(25, 20)]) {
      for (const corridor of [0, 1, 2] as const) {
        const s = spec({ sun, corridor, side: corridor === 1 ? -1 : 1 });
        const flight = planGullFlight(s);
        for (const t of [TIMES.releaseAt, 0.5, 1.7]) {
          const { world, uv, c } = casterVertices(s, t);
          const [ax, az] = flight.away;
          const rx = -c.hz;
          const rz = c.hx;
          world.forEach((p, i) => {
            const u = uv[i * 2]!;
            const v = uv[i * 2 + 1]!;
            // entworfener Bodenpunkt: C + S(uH + vR), S streckt entlang A um 1,35
            const gx = u * c.hx + v * rx;
            const gz = u * c.hz + v * rz;
            const d = gx * ax + gz * az;
            const ex = c.x + gx + (GULL_STRETCH - 1) * d * ax;
            const ez = c.z + gz + (GULL_STRETCH - 1) * d * az;
            const [px, pz] = projectToGround(p, flight.sun, s.ground);
            expect(px).toBeCloseTo(ex, 9);
            expect(pz).toBeCloseTo(ez, 9);
          });
        }
      }
    }
  });

  it('die Werferfläche steht senkrecht zur Sonne (volle Auflösung der Schattenkarte)', () => {
    const flight = planGullFlight(spec());
    const c = gullCenter(flight, 1.3);
    const m = gullCasterMatrix(flight, c.x, c.z, c.hx, c.hz);
    const [lx, ly, lz] = flight.sun;
    expect(m[0]! * lx + m[1]! * ly + m[2]! * lz).toBeCloseTo(0, 12);
    expect(m[8]! * lx + m[9]! * ly + m[10]! * lz).toBeCloseTo(0, 12);
  });

  it('bleibt in der Kaskade: alle Eckpunkte im ganzen Flug zwischen 0,75 und 1,6 Einheiten über dem Brett', () => {
    let top = 0;
    for (const span of [1.7, 2.1, 2.5]) {
      for (const sun of [sunAt(10, 70), sunAt(12, 62), sunAt(9, -80), sunAt(12, 180)]) {
        for (const corridor of [0, 1, 2] as const) {
          for (const side of [-1, 1] as const) {
            const s = spec({ span, sun, corridor, side });
            const flight = planGullFlight(s);
            for (let t = TIMES.enterAt; t <= TIMES.exitAt; t += 1 / 90) {
              for (const p of casterVertices(s, t, flight).world) {
                const h = p[1] - s.ground;
                top = Math.max(top, h);
                expect(h).toBeLessThanOrEqual(1.6);
                expect(h).toBeGreaterThan(0.75);
              }
            }
          }
        }
      }
    }
    expect(top).toBeLessThanOrEqual(GULL_MAX_HEIGHT + 1e-9);
  }, 60_000);

  it('schlägt im Anflug (Spannweite schwankt), gleitet beim Abwurf mit voller Spannweite, legt sich im Abflug in die Kurve', () => {
    const s = spec({ span: 1.8 });
    const flight = planGullFlight(s);
    const widthAt = (t: number): number => {
      const pose = gullPose(flight, t);
      const uv = gullOutline(s.span, pose, [0, 0], new Float32Array(GULL_VERTS * 2));
      let lo = Infinity;
      let hi = -Infinity;
      for (let i = 0; i < GULL_VERTS; i++) {
        lo = Math.min(lo, uv[i * 2 + 1]!);
        hi = Math.max(hi, uv[i * 2 + 1]!);
      }
      return hi - lo;
    };
    const approach: number[] = [];
    for (let t = TIMES.enterAt; t < TIMES.releaseAt - 0.5; t += 1 / 60) approach.push(widthAt(t));
    expect(Math.min(...approach)).toBeLessThan(0.75 * s.span);
    expect(Math.max(...approach)).toBeGreaterThan(0.97 * s.span);
    for (let t = TIMES.releaseAt - 0.12; t <= TIMES.releaseAt + 0.05; t += 1 / 120) expect(widthAt(t)).toBeGreaterThan(0.99 * s.span);
    // zwei Schläge nach dem Abwurf, dann Schräglage
    const out: number[] = [];
    for (let t = TIMES.releaseAt + 0.1; t < TIMES.releaseAt + 0.7; t += 1 / 120) out.push(widthAt(t));
    expect(Math.min(...out)).toBeLessThan(0.75 * s.span);
    expect(Math.abs(gullPose(flight, TIMES.exitAt).bank)).toBeGreaterThan(0.5);
    expect(gullPose(flight, TIMES.releaseAt).bank).toBeCloseTo(0, 12);
    // Ruck beim Loslassen: kurz, nur danach
    expect(gullPose(flight, TIMES.releaseAt - 0.01).jolt).toBe(0);
    expect(gullPose(flight, TIMES.releaseAt + 0.12).jolt).toBeGreaterThan(0.2);
    expect(gullPose(flight, TIMES.releaseAt + 0.5).jolt).toBe(0);
  });
});
