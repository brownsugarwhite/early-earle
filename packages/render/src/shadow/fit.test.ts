import { describe, expect, it } from 'vitest';
import { Matrix4, PerspectiveCamera, Quaternion, Vector3 } from 'three/webgpu';
import { CascadeFitter, createFitResult, quantizeTexel, splitDistances, type FitInput } from './fit';

const R = 32;

/** Kamera wie die Flow-Karte (iPhone-Preset): über dem Scheitel, Blick schräg nach vorn. */
function mapCamera(aspect = 852 / 393): PerspectiveCamera {
  const cam = new PerspectiveCamera(70, aspect, 0.3, 700);
  cam.position.set(0, R + 6.3, 5.6);
  cam.lookAt(0, R, -4);
  cam.updateMatrixWorld(true);
  cam.updateProjectionMatrix();
  return cam;
}

function sunDir(elDeg: number, azDeg: number): Vector3 {
  const el = (elDeg * Math.PI) / 180;
  const az = (azDeg * Math.PI) / 180;
  return new Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
}

/** Welliges Gelände 0..2 über der Kugel (analytisch, lokaler = Weltraum). */
function hills(rotation = new Quaternion()) {
  const inv = rotation.clone().invert();
  const d = new Vector3();
  return (dirWorld: Vector3): number => {
    d.copy(dirWorld).applyQuaternion(inv);
    return R + 1 + Math.sin(d.x * 40) * Math.cos(d.z * 33) * 1;
  };
}

function input(camera: PerspectiveCamera, surface: ((d: Vector3) => number) | null, epoch = 1): FitInput {
  return {
    camera,
    viewport: { width: 1704, height: 786 },
    shell: { center: new Vector3(), rMin: R - 0.3, rMax: R + 4.7, surface, surfaceEpoch: epoch },
    slab: null,
    clip: null,
    maxDistance: 700,
    sunDir: sunDir(10, 70),
    upRef: new Vector3(0, 1, 0),
    anchor: new Vector3(0, R, -4),
    casterReach: 60,
    sizes: [
      { width: 1024, height: 4096 },
      { width: 1024, height: 2048 },
      { width: 1024, height: 2048 },
    ],
    lambda: 0.72,
    padTexels: 4,
    blend: 0.14,
  };
}

describe('quantizeTexel', () => {
  it('rundet auf das 2^(1/8)-Raster auf', () => {
    for (const t of [0.0013, 0.004, 0.01, 0.2, 1.7]) {
      const q = quantizeTexel(t);
      expect(q).toBeGreaterThanOrEqual(t * (1 - 1e-9));
      expect(q).toBeLessThan(t * Math.pow(2, 1 / 8) * (1 + 1e-9));
      // idempotent: ein Rasterwert bleibt, wo er ist
      expect(quantizeTexel(q)).toBeCloseTo(q, 12);
    }
  });
});

describe('splitDistances', () => {
  it('steigt monoton und endet bei dMax', () => {
    const s = splitDistances(3, 4, 35, 0.72);
    expect(s).toHaveLength(3);
    expect(s[0]!).toBeGreaterThan(4);
    expect(s[1]!).toBeGreaterThan(s[0]!);
    expect(s[2]).toBe(35);
  });
});

describe('CascadeFitter', () => {
  it('liefert verschachtelte, auf das Texelgitter gesnappte Kaskaden mit gültigem Tiefenbereich', () => {
    const fit = new CascadeFitter().fit(input(mapCamera(), hills()), createFitResult(3));
    expect(fit.empty).toBe(false);
    expect(fit.rays).toBeGreaterThan(60);
    fit.cascades.forEach((c, k) => {
      expect(c.active).toBe(true);
      expect(c.near).toBeGreaterThan(0);
      expect(c.far).toBeGreaterThan(c.near);
      // Gitter: Ursprung ist ein ganzzahliges Vielfaches der Texelgröße (weltfestes Abtastgitter)
      expect(Math.abs(c.x0 / c.texelX - Math.round(c.x0 / c.texelX))).toBeLessThan(1e-6);
      expect(Math.abs(c.y0 / c.texelY - Math.round(c.y0 / c.texelY))).toBeLessThan(1e-6);
      if (k > 0) {
        // jede gröbere Kaskade deckt den Empfängerbedarf der feineren samt Filter-Fußabdruck (4 Texel)
        const f = fit.cascades[k - 1]!;
        expect(c.x0).toBeLessThanOrEqual(f.needX0 - 4 * f.texelX + 1e-9);
        expect(c.x1).toBeGreaterThanOrEqual(f.needX1 + 4 * f.texelX - 1e-9);
        expect(c.y0).toBeLessThanOrEqual(f.needY0 - 4 * f.texelY + 1e-9);
        expect(c.y1).toBeGreaterThanOrEqual(f.needY1 + 4 * f.texelY - 1e-9);
        expect(c.split).toBeGreaterThan(f.split);
      }
    });
    // Feine Kaskade deutlich feiner als die grobe
    expect(fit.cascades[0]!.texelY).toBeLessThan(fit.cascades[2]!.texelY);
  });

  it('deckt jeden sichtbaren Bodenpunkt mit der gröbsten Kaskade ab', () => {
    const cam = mapCamera();
    const surface = hills();
    const fit = new CascadeFitter().fit(input(cam, surface), createFitResult(3));
    const last = fit.cascades[2]!;
    const o = cam.position.clone();
    const d = new Vector3();
    const p = new Vector3();
    let checked = 0;
    for (let j = 0; j <= 20; j++) {
      for (let i = 0; i <= 20; i++) {
        d.set(-1 + i / 10, -1 + j / 10, 0.5).unproject(cam).sub(o).normalize();
        // Strahl zum Gelände marschieren (fein)
        for (let t = 0.3; t < 60; t += 0.02) {
          p.copy(d).multiplyScalar(t).add(o);
          const len = p.length();
          if (len <= surface(p.clone().divideScalar(len))) {
            const x = fit.X.dot(p);
            const y = fit.Y.dot(p);
            expect(x).toBeGreaterThanOrEqual(last.x0);
            expect(x).toBeLessThanOrEqual(last.x1);
            expect(y).toBeGreaterThanOrEqual(last.y0);
            expect(y).toBeLessThanOrEqual(last.y1);
            checked++;
            break;
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(200);
  });

  it('hält das Texelgitter stabil, während der Planet unter der Kamera rollt', () => {
    const cam = mapCamera();
    const fitter = new CascadeFitter();
    const out = createFitResult(3);
    fitter.fit(input(cam, hills()), out);
    const texels = out.cascades.map((c) => [c.texelX, c.texelY]);
    const psi = out.psi;
    let changes = 0;
    for (let step = 1; step <= 40; step++) {
      const q = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0.3).normalize(), (step * 0.25 * Math.PI) / 180);
      fitter.fit({ ...input(cam, hills(q), step), keepPsi: true, lockTexels: true }, out);
      out.cascades.forEach((c, k) => {
        if (c.texelX !== texels[k]![0] || c.texelY !== texels[k]![1]) changes++;
        texels[k] = [c.texelX, c.texelY];
      });
      expect(out.psi).toBe(psi);
    }
    // 10° Rollen: feine Kaskaden gesperrt, die gröbste deckt die rotationsinvariante Schale → kein Gitterwechsel
    expect(changes).toBe(0);
  });

  it('bleibt ohne Gelände-Rückruf konservativ (ganze Schale)', () => {
    const fit = new CascadeFitter().fit(input(mapCamera(), null), createFitResult(3));
    expect(fit.empty).toBe(false);
    // Schale reicht bis 4,7 über den Radius: die nächsten Empfänger liegen dicht vor der Kamera
    expect(fit.dMin).toBeLessThan(3);
  });
});

describe('Clip-Box (fitShadow im Kaskadenbetrieb)', () => {
  it('deckt auch den langen Schatten hinter der Box entlang des Sonnenstrahls ab (Lichtraum-Prisma)', () => {
    // Flache Bühne y ∈ [−1, 2], kleine Box um den Ursprung, Kamera schräg darüber
    const cam = new PerspectiveCamera(40, 1.6, 0.1, 200);
    cam.position.set(0, 9, 11);
    cam.lookAt(0, 0, 0);
    cam.updateMatrixWorld(true);
    cam.updateProjectionMatrix();
    const box = { min: new Vector3(-2, -1, -2), max: new Vector3(2, 2, 2), toLocal: new Matrix4() };
    const sun = sunDir(12, 62);
    const fit = new CascadeFitter().fit(
      {
        camera: cam,
        viewport: { width: 1280, height: 800 },
        shell: null,
        slab: { origin: new Vector3(), normal: new Vector3(0, 1, 0), hMin: -1, hMax: 2 },
        clip: box,
        maxDistance: 200,
        sunDir: sun,
        upRef: new Vector3(0, 1, 0),
        anchor: new Vector3(),
        casterReach: 20,
        sizes: [
          { width: 1024, height: 2048 },
          { width: 1024, height: 1024 },
        ],
        lambda: 0.72,
        padTexels: 4,
        blend: 0.14,
      },
      createFitResult(2),
    );
    const last = fit.cascades[1]!;
    // Schattenspitze eines 2 hohen Werfers am Boxrand: 2 / tan 12° ≈ 9,4 Einheiten vom Rand, entgegen der Sonne
    const away = new Vector3(-sun.x, 0, -sun.z).normalize();
    const tip = new Vector3(0, 2, 0).addScaledVector(away, 2 + 2 / Math.tan((12 * Math.PI) / 180)).setY(-0.7);
    // Punkt auf dem Sonnenstrahl durch die Boxecke → im Lichtraum-Rechteck (liegt „hinter“ der Box)
    const onRay = new Vector3(0, 2, 0).addScaledVector(sun, -((2 + 0.7) / sun.y));
    const inRect = (p: Vector3) => {
      const x = fit.X.dot(p);
      const y = fit.Y.dot(p);
      return x >= last.x0 && x <= last.x1 && y >= last.y0 && y <= last.y1;
    };
    expect(inRect(onRay)).toBe(true);
    // Der Schattenpunkt ist im Blick der Kamera → er muss abgedeckt sein, sofern sichtbar
    const ndc = tip.clone().project(cam);
    if (Math.abs(ndc.x) <= 1 && Math.abs(ndc.y) <= 1) expect(inRect(tip)).toBe(true);
  });
});

describe('Bodengefittete gröbste Kaskade (Schatten v3)', () => {
  const focused = (cam: PerspectiveCamera, surface: ((d: Vector3) => number) | null, epoch = 1, tol = 1.2): FitInput => {
    const base = input(cam, surface, epoch);
    return { ...base, shell: { ...base.shell!, coverTolerance: tol } };
  };

  it('spannt die gröbste Kaskade deutlich enger als die ganze Schale', () => {
    const cam = mapCamera();
    const shell = new CascadeFitter().fit(input(cam, hills()), createFitResult(3));
    const ground = new CascadeFitter().fit(focused(cam, hills()), createFitResult(3));
    const area = (f: typeof shell) => (f.cascades[2]!.x1 - f.cascades[2]!.x0) * (f.cascades[2]!.y1 - f.cascades[2]!.y0);
    expect(area(ground)).toBeLessThan(area(shell) * 0.8);
    expect(ground.dMax).toBeLessThanOrEqual(shell.dMax + 1e-9);
  });

  it('deckt weiter jeden sichtbaren Bodenpunkt ab', () => {
    const cam = mapCamera();
    const surface = hills();
    const fit = new CascadeFitter().fit(focused(cam, surface), createFitResult(3));
    const last = fit.cascades[2]!;
    const o = cam.position.clone();
    const d = new Vector3();
    const p = new Vector3();
    let checked = 0;
    for (let j = 0; j <= 20; j++) {
      for (let i = 0; i <= 20; i++) {
        d.set(-1 + i / 10, -1 + j / 10, 0.5).unproject(cam).sub(o).normalize();
        for (let t = 0.3; t < 60; t += 0.02) {
          p.copy(d).multiplyScalar(t).add(o);
          const len = p.length();
          if (len <= surface(p.clone().divideScalar(len))) {
            const x = fit.X.dot(p);
            const y = fit.Y.dot(p);
            expect(x).toBeGreaterThanOrEqual(last.x0);
            expect(x).toBeLessThanOrEqual(last.x1);
            expect(y).toBeGreaterThanOrEqual(last.y0);
            expect(y).toBeLessThanOrEqual(last.y1);
            checked++;
            break;
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(200);
  });

  it('nimmt Empfänger-Volumen über dem Boden in die Kaskaden ihrer Blicktiefe auf', () => {
    const cam = mapCamera();
    // Kugel 3 Einheiten über dem Boden vor der Kamera (Riesenbaum-Stamm, Brett)
    const center = new Vector3(0.4, R + 4.2, -3);
    const fit = new CascadeFitter().fit({ ...focused(cam, hills()), volumes: [{ center, radius: 0.8 }] }, createFitResult(3));
    const top = center.clone().add(new Vector3(0, 0.6, 0));
    const fwd = new Vector3(0, 0, -1).transformDirection(cam.matrixWorld);
    const depth = top.clone().sub(cam.position).dot(fwd);
    const covering = fit.cascades.filter((c, k) => k === fit.cascades.length - 1 || c.split >= depth + 1);
    expect(covering.length).toBeGreaterThan(0);
    for (const c of covering) {
      const x = fit.X.dot(top);
      const y = fit.Y.dot(top);
      expect(x).toBeGreaterThanOrEqual(c.x0);
      expect(x).toBeLessThanOrEqual(c.x1);
      expect(y).toBeGreaterThanOrEqual(c.y0);
      expect(y).toBeLessThanOrEqual(c.y1);
    }
  });

  it('deckt mit coverAbove auch verteilte Empfänger über dem Boden ab (Kronen), einseitig und billiger als ein breites Band', () => {
    const cam = mapCamera();
    const surface = hills();
    const withAbove = (above: number): FitInput => {
      const f = focused(cam, surface);
      return { ...f, shell: { ...f.shell!, coverAbove: above } };
    };
    const plain = new CascadeFitter().fit(focused(cam, surface), createFitResult(3));
    const above = new CascadeFitter().fit(withAbove(3), createFitResult(3));
    const wide = new CascadeFitter().fit(focused(cam, surface, 1, 3), createFitResult(3));
    const o = cam.position.clone();
    const fwd = new Vector3(0, 0, -1).transformDirection(cam.matrixWorld);
    const d = new Vector3();
    const p = new Vector3();
    const outside = (fit: typeof plain, q: Vector3): boolean => {
      const c = fit.cascades[2]!;
      const x = fit.X.dot(q);
      const y = fit.Y.dot(q);
      return x < c.x0 || x > c.x1 || y < c.y0 || y > c.y1;
    };
    let checked = 0;
    let missedPlain = 0;
    for (let j = 0; j <= 20; j++) {
      for (let i = 0; i <= 20; i++) {
        d.set(-1 + i / 10, -1 + j / 10, 0.5).unproject(cam).sub(o).normalize();
        for (let t = 0.3; t < 60; t += 0.02) {
          p.copy(d).multiplyScalar(t).add(o);
          const len = p.length();
          if (len <= surface(p.clone().divideScalar(len))) {
            const crown = p.clone().addScaledVector(p.clone().normalize(), 3);
            const depth = crown.clone().sub(o).dot(fwd);
            if (depth > cam.near && depth <= above.dMax) {
              expect(outside(above, crown)).toBe(false);
              if (outside(plain, crown)) missedPlain++;
              checked++;
            }
            break;
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(150);
    expect(missedPlain).toBeGreaterThan(0);
    const area = (f: typeof plain) => (f.cascades[2]!.x1 - f.cascades[2]!.x0) * (f.cascades[2]!.y1 - f.cascades[2]!.y0);
    expect(area(above)).toBeLessThan(area(wide));
  });

  it('hält beim Rollen auch die gröbste Kaskade meist still (Hysterese)', () => {
    const cam = mapCamera();
    const fitter = new CascadeFitter();
    const out = createFitResult(3);
    fitter.fit(focused(cam, hills()), out);
    let prev = [out.cascades[2]!.texelX, out.cascades[2]!.texelY];
    let changes = 0;
    for (let step = 1; step <= 40; step++) {
      const q = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0.3).normalize(), (step * 0.25 * Math.PI) / 180);
      fitter.fit({ ...focused(cam, hills(q), step), keepPsi: true, lockTexels: true }, out);
      const now = [out.cascades[2]!.texelX, out.cascades[2]!.texelY];
      if (now[0] !== prev[0] || now[1] !== prev[1]) changes++;
      prev = now;
    }
    // Hügel ziehen durch, die Bodenregion atmet: höchstens ein paar Stufenwechsel über 10° Rollen
    expect(changes).toBeLessThanOrEqual(3);
  });
});

describe('Gitter an der Ebene (Karte v5, R1)', () => {
  /** Verzug der Ebene bei k_t = 0: Schattenraum = Blickraum (die Kugel des Tests steht für die Anzeige). */
  const identity = { toShadow: (p: Vector3) => p, toView: (p: Vector3) => p };
  const planeInput = (cam: PerspectiveCamera, g: Vector3, epoch = 1): FitInput => {
    const base = input(cam, hills(), epoch);
    return { ...base, shell: { ...base.shell!, coverTolerance: 1.2 }, warp: identity, gridOffset: g, margin: [0.1, 0.2, 0.3] };
  };
  const nearlyMultiple = (v: number, t: number) => Math.abs(v / t - Math.round(v / t)) < 1e-6;

  it('snappt die Rechtecke in Ebenenkoordinaten: originPlane* sind Texelvielfache, x0 = originPlane − X · gridOffset', () => {
    const cam = mapCamera();
    const g = new Vector3(1234.5678, 0, -987.321);
    const fit = new CascadeFitter().fit(planeInput(cam, g), createFitResult(3));
    expect(fit.empty).toBe(false);
    for (const c of fit.cascades) {
      expect(c.active).toBe(true);
      expect(nearlyMultiple(c.originPlaneX, c.texelX)).toBe(true);
      expect(nearlyMultiple(c.originPlaneY, c.texelY)).toBe(true);
      expect(c.x0).toBeCloseTo(c.originPlaneX - fit.X.dot(g), 9);
      expect(c.y0).toBeCloseTo(c.originPlaneY - fit.Y.dot(g), 9);
    }
    expect(fit.eyePlane.clone().sub(g).distanceTo(fit.eye)).toBeLessThan(1e-9);
  });

  it('ein kleiner Versatz des Gitterursprungs ändert Texel nicht und verschiebt den Ursprung nur um den Versatz (± ein Texel Rundung)', () => {
    const cam = mapCamera();
    const d = new Vector3(0.0137, 0, 0.0211);
    const a = new CascadeFitter().fit(planeInput(cam, new Vector3(0, 0, 0)), createFitResult(3));
    const b = new CascadeFitter().fit(planeInput(cam, d), createFitResult(3));
    a.cascades.forEach((ca, k) => {
      const cb = b.cascades[k]!;
      expect(cb.texelX).toBe(ca.texelX);
      expect(cb.texelY).toBe(ca.texelY);
      // beide Ursprünge sind Texelvielfache in der Ebene; der Bedarf liegt um d verschoben → höchstens d + 1 Texel
      expect(Math.abs(cb.originPlaneX - ca.originPlaneX)).toBeLessThanOrEqual(Math.abs(a.X.dot(d)) + ca.texelX + 1e-9);
      expect(Math.abs(cb.originPlaneY - ca.originPlaneY)).toBeLessThanOrEqual(Math.abs(a.Y.dot(d)) + ca.texelY + 1e-9);
      expect(nearlyMultiple(cb.originPlaneX, cb.texelX)).toBe(true);
      // im Schattenraum liegt das Rechteck damit praktisch gleich (der Inhalt kennt nur den Schattenraum)
      expect(Math.abs(cb.x0 - ca.x0)).toBeLessThanOrEqual(ca.texelX + 1e-9);
    });
  });

  it('Rand: jedes Rechteck hält um seinen Rand Abstand zum Empfängerbedarf (fein 10 %, mittel 20 %, fern 30 %)', () => {
    const fit = new CascadeFitter().fit(planeInput(mapCamera(), new Vector3(5, 0, -7)), createFitResult(3));
    const margins = [0.1, 0.2, 0.3];
    fit.cascades.forEach((c, k) => {
      const m = margins[k]!;
      const w = c.needX1 - c.needX0;
      const h = c.needY1 - c.needY0;
      expect(w).toBeGreaterThan(0);
      // Rand je Seite ≥ m · Bedarf (minus ein Texel Rundung der Mitte)
      expect(c.needX0 - c.x0).toBeGreaterThanOrEqual(m * w - c.texelX);
      expect(c.x1 - c.needX1).toBeGreaterThanOrEqual(m * w - c.texelX);
      expect(c.needY0 - c.y0).toBeGreaterThanOrEqual(m * h - c.texelY);
      expect(c.y1 - c.needY1).toBeGreaterThanOrEqual(m * h - c.texelY);
      // Tiefenfenster deckt den Bedarf mit Rand
      const gL = fit.L.dot(new Vector3(5, 0, -7));
      expect(c.depthPlane0 - gL).toBeLessThanOrEqual(c.needZ0 - 2.9);
      expect(c.depthPlane1 - gL).toBeGreaterThanOrEqual(c.needZ1 + 2.9);
      expect(c.near).toBeGreaterThan(0);
      expect(c.far).toBeGreaterThan(c.near);
    });
  });

  it('Slide erhält originPlane*: ein Schwenk innerhalb des Rands behält Rechtecke, Tiefenfenster und Auge in der Ebene', () => {
    const cam = mapCamera();
    const fitter = new CascadeFitter();
    const out = createFitResult(3);
    const g0 = new Vector3(100, 0, -200);
    fitter.fit(planeInput(cam, g0), out);
    const before = out.cascades.map((c) => ({ ...c }));
    const eyeBefore = out.eyePlane.clone();
    // Schwenk um 0,3 vorwärts und 0,2 seitlich (gleicher Blick, gleiche Empfänger im Schattenraum)
    const g1 = g0.clone().add(new Vector3(0.2, 0, -0.3));
    fitter.fit({ ...planeInput(cam, g1, 2), keepPsi: true, lockTexels: true }, out);
    const delta = g1.clone().sub(g0);
    out.cascades.forEach((c, k) => {
      const b = before[k]!;
      expect(c.texelX).toBe(b.texelX);
      expect(c.texelY).toBe(b.texelY);
      expect(c.originPlaneX).toBe(b.originPlaneX);
      expect(c.originPlaneY).toBe(b.originPlaneY);
      expect(c.depthPlane0).toBe(b.depthPlane0);
      expect(c.depthPlane1).toBe(b.depthPlane1);
      // im Schattenraum rückt das Rechteck um genau den Fokusweg
      expect(c.x0).toBeCloseTo(b.x0 - out.X.dot(delta), 9);
      expect(c.y0).toBeCloseTo(b.y0 - out.Y.dot(delta), 9);
    });
    expect(out.eyePlane.distanceTo(eyeBefore)).toBeLessThan(1e-9);
    // Ein Schwenk weit über den Rand hinaus snappt neu — wieder auf Texelvielfache, und deckt den Bedarf
    const g2 = g0.clone().add(new Vector3(0, 0, -60));
    fitter.fit({ ...planeInput(cam, g2, 3), keepPsi: true, lockTexels: true }, out);
    out.cascades.forEach((c, k) => {
      const b = before[k]!;
      expect(c.originPlaneX).not.toBe(b.originPlaneX);
      expect(nearlyMultiple(c.originPlaneX, c.texelX)).toBe(true);
      expect(c.x0).toBeLessThanOrEqual(c.needX0);
      expect(c.x1).toBeGreaterThanOrEqual(c.needX1);
    });
  });
});
