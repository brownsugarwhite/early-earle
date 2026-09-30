import { describe, expect, it, vi } from 'vitest';
import { BootProgress, BOOT_STEPS, DEFAULT_WEIGHTS, type BootStore, type StemDriver } from './bootProgress';
import type { EeBoot } from './bootInline';

/** Falsche Uhr + Timer, die von Hand vorrücken. */
function fakeEnv(start = 0) {
  let now = start;
  const timers: Array<{ at: number; fn: () => void }> = [];
  const env = {
    now: () => now,
    setTimer: (fn: () => void, ms: number) => {
      timers.push({ at: now + ms, fn });
      return timers.length;
    },
    raf: (cb: () => void) => void Promise.resolve().then(cb),
    advance(ms: number, boot?: BootProgress, frameMs = 16) {
      const end = now + ms;
      while (now < end) {
        now = Math.min(end, now + frameMs);
        for (const t of timers.filter((x) => x.at <= now)) {
          timers.splice(timers.indexOf(t), 1);
          t.fn();
        }
        boot?.tick(now);
      }
    },
    get time() {
      return now;
    },
  };
  return env;
}

function memStore(initial: string | null = null): BootStore & { value: string | null } {
  const s = { value: initial, get: () => s.value, set: (v: string) => void (s.value = v) };
  return s;
}

function fakeDriver(): StemDriver & { sets: Array<[number, number]>; mirrored: number[] } {
  let p = 0;
  const d = {
    sets: [] as Array<[number, number]>,
    mirrored: [] as number[],
    set: (v: number, ms: number) => {
      d.sets.push([v, ms]);
      p = v;
    },
    read: () => p,
    mirror: (v: number) => void d.mirrored.push(v),
  };
  return d;
}

function makeBoot(env = fakeEnv(), store: BootStore | null = memStore()) {
  const boot = new BootProgress({ now: env.now, setTimer: env.setTimer, raf: env.raf, storage: store });
  return boot;
}

describe('bootProgress', () => {
  it('Gewichte: Standard summiert 1', () => {
    const boot = makeBoot();
    const sum = BOOT_STEPS.reduce((a, s) => a + boot.weights[s], 0);
    expect(sum).toBeCloseTo(1, 9);
    expect(boot.weights.mount).toBeCloseTo(DEFAULT_WEIGHTS.mount, 9);
  });

  it('monoton bei Meldungen in beliebiger Reihenfolge', () => {
    const env = fakeEnv();
    const boot = makeBoot(env);
    boot.report('mapShaders', 0.6);
    boot.report('mapShaders', 0.2);
    expect(boot.fractions.mapShaders).toBe(0.6);
    let last = 0;
    let lastGoal = 0;
    const order = ['chunks', 'bundle', 'board', 'font', 'renderer', 'creatures', 'mount'] as const;
    for (const [i, s] of order.entries()) {
      boot.report(s, 0.5);
      boot.report(s, 0.25);
      env.advance(90, boot);
      if (i % 2) boot.done(s);
      expect(boot.goal()).toBeGreaterThanOrEqual(lastGoal);
      expect(boot.shown).toBeGreaterThanOrEqual(last);
      lastGoal = boot.goal();
      last = boot.shown;
    }
  });

  it('nie 1,0, solange ein Schritt fehlt', () => {
    const env = fakeEnv();
    const boot = makeBoot(env);
    for (const s of BOOT_STEPS) if (s !== 'chunks' && s !== 'frames') boot.done(s);
    boot.report('chunks', 0.999);
    env.advance(5000, boot);
    // frames hat ein Zeitlimit (3 s), chunks nicht gemeldet → bleibt offen
    expect(boot.complete).toBe(false);
    expect(boot.shown).toBeLessThanOrEqual(0.99);
    expect(boot.goal()).toBeLessThanOrEqual(0.99);
  });

  it('Mindestdauer 1,6 s mit falscher Uhr, danach 1,0', () => {
    const env = fakeEnv();
    const boot = makeBoot(env);
    const done = vi.fn();
    boot.onComplete(done);
    for (const s of BOOT_STEPS) boot.done(s);
    let t = 0;
    while (t < 1590) {
      env.advance(10, boot);
      t = env.time;
      expect(boot.shown).toBeLessThanOrEqual(t / 1600 + 1e-9);
    }
    expect(boot.complete).toBe(false);
    env.advance(40, boot);
    expect(boot.complete).toBe(true);
    expect(boot.shown).toBe(1);
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('Sprünge laufen mindestens 250 ms, der Abschluss dauert 180 ms', () => {
    const env = fakeEnv();
    const boot = makeBoot(env);
    env.advance(2000, boot);
    const before = boot.shown;
    boot.done('bundle');
    boot.done('mount');
    const target = boot.goal();
    env.advance(100, boot);
    expect(boot.shown - before).toBeLessThan((target - before) * 0.5);
    env.advance(150, boot);
    expect(boot.shown).toBeLessThan(target - 0.01);
    env.advance(1500, boot);
    expect(boot.shown).toBeGreaterThan(target - 0.005);
    // alles fertig: in 180 ms auf 1,0 (Mindestdauer längst vorbei)
    for (const s of BOOT_STEPS) boot.done(s);
    const tDone = env.time;
    env.advance(170, boot);
    expect(boot.complete).toBe(false);
    env.advance(30, boot);
    expect(boot.complete).toBe(true);
    expect(env.time - tDone).toBeLessThanOrEqual(200);
  });

  it('Zeitlimit: ein hängendes Versprechen erledigt den Schritt trotzdem', async () => {
    const env = fakeEnv();
    const boot = makeBoot(env);
    const never = new Promise<void>(() => undefined);
    const tracked = boot.track('creatures', never, 500);
    env.advance(480);
    expect(boot.isDone('creatures')).toBe(false);
    env.advance(40);
    await tracked;
    expect(boot.isDone('creatures')).toBe(true);
    // Fehler zählen ebenfalls als erledigt
    await boot.track('font', Promise.reject(new Error('404')), 1000);
    expect(boot.isDone('font')).toBe(true);
  });

  it('beforeBlock setzt das Compositor-Ziel für das Blockende und wartet zwei Bilder', async () => {
    const env = fakeEnv();
    const boot = makeBoot(env);
    const driver = fakeDriver();
    boot.driver = driver;
    for (const s of ['bundle', 'font', 'renderer'] as const) boot.done(s);
    env.advance(1500, boot);
    const shown = boot.shown;
    await boot.beforeBlock('mount');
    const [target, ms] = driver.sets[driver.sets.length - 1]!;
    expect(ms).toBe(450); // Standard vor gelernten Werten
    expect(target).toBeGreaterThan(shown);
    expect(target).toBeLessThanOrEqual(boot.goal({ mount: 1 }) + 1e-9);
    // Takte während der Blockade überschreiben das Compositor-Ziel nicht
    const n = driver.sets.length;
    env.advance(100, boot);
    expect(driver.sets.length).toBe(n);
    // Blockdauer wird gelernt, sobald der Schritt fertig ist
    env.advance(200);
    boot.done('mount');
    expect(boot.learnedData.blocks.mount).toBeCloseTo(300, 0);
    // danach steuert der Takt wieder
    env.advance(32, boot);
    expect(driver.sets.length).toBeGreaterThan(n);
  });

  it('gelernte Anteile: EMA in localStorage, nächster Start nutzt sie', () => {
    const store = memStore();
    const env = fakeEnv();
    const b1 = makeBoot(env, store);
    // gleichmäßig verteilte Fertigzeiten: 200, 400, … 1800 ms
    for (const s of BOOT_STEPS) {
      env.advance(200, b1);
      b1.done(s);
    }
    env.advance(400, b1);
    expect(b1.complete).toBe(true);
    const saved = JSON.parse(store.value!);
    expect(saved.n).toBe(1);
    expect(saved.at.bundle).toBeCloseTo(200, 0);
    expect(saved.at.frames).toBeCloseTo(1800, 0);
    // zweiter Start: Anteile = halb Standard, halb gelernte Zuwächse (alle 1/9)
    const env3 = fakeEnv();
    const b2 = makeBoot(env3, store);
    expect(b2.weights.bundle).toBeCloseTo((0.5 * DEFAULT_WEIGHTS.bundle + 0.5 / 9) / 1, 3);
    expect(b2.weights.font).toBeCloseTo(0.5 * DEFAULT_WEIGHTS.font + 0.5 / 9, 3);
    // EMA: neuer Wert zieht 40 % in seine Richtung
    for (const s of BOOT_STEPS) {
      env3.advance(s === 'bundle' ? 700 : 100, b2);
      b2.done(s);
    }
    env3.advance(2000, b2);
    const saved2 = JSON.parse(store.value!);
    expect(saved2.n).toBe(2);
    expect(saved2.at.bundle).toBeCloseTo(200 + (700 - 200) * 0.4, 0);
  });

  it('übernimmt den Inline-Boot ohne Sprung (__eeBoot)', () => {
    const env = fakeEnv(900);
    const boot = makeBoot(env);
    let stem = 0.13;
    const inline = {
      root: {} as HTMLElement,
      t0: 0,
      shown: 0.13,
      learned: null,
      setStem: (p: number) => void (stem = p),
      readStem: () => stem,
      mirror: vi.fn(),
      stop: vi.fn(),
      scaleOf: (p: number) => p,
      data: {} as EeBoot['data'],
    } satisfies EeBoot;
    boot.adopt(inline);
    expect(inline.stop).toHaveBeenCalled();
    expect(boot.shown).toBeCloseTo(0.13, 6);
    boot.done('bundle');
    env.advance(16, boot);
    expect(boot.shown).toBeGreaterThanOrEqual(0.13);
    expect(stem).toBeGreaterThanOrEqual(0.13);
    expect(inline.mirror).toHaveBeenCalled();
  });

  it('Schritt "frames": sechs gleichmäßige Bilder nach allen anderen', () => {
    const env = fakeEnv();
    const boot = makeBoot(env);
    for (const s of BOOT_STEPS) if (s !== 'frames') boot.done(s);
    for (const dt of [0.2, 0.05, 0.016, 0.016]) boot.frame(dt);
    expect(boot.isDone('frames')).toBe(false);
    for (let i = 0; i < 6; i++) boot.frame(0.017);
    expect(boot.isDone('frames')).toBe(true);
  });
});
