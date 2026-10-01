import { test, expect, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Review-Harness der Zonen-Nachschärfung (Baustelle A2): je Welt eine Montage Referenz | Lab quer | Lab hoch | Karte
// Handy nach `docs/progress/nachschaerfung-wNN[-TAG].png`, dazu das Paar Verlauf 0 / 1 (Lab quer) nach
// `nachschaerfung-wNN-verlauf[-TAG].png`. Vorher-/Nachher-Bilder entstehen mit demselben Aufruf und nur anderem Tag.
// Echte GPU (wie progression-shots), nur auf Wunsch; Bedienung: docs/progress/nachschaerfung-README.md.
//
//   EE_SHOTS=1 [EE_WORLDS=08,09] [EE_SHOTS_TAG=vorher] E2E_PORT=4341 node apps/game/scripts/e2e.mjs e2e/nachschaerfung-shots.spec.ts
test.skip(!process.env.EE_SHOTS, 'nur mit EE_SHOTS=1');
test.use({
  launchOptions: { args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] },
  deviceScaleFactor: Number(process.env.EE_DPR ?? 1),
});
test.setTimeout(420_000);

const REPO = fileURLToPath(new URL('../../../', import.meta.url));
const OUT = `${REPO}docs/progress/`;
const REFS = `${REPO}apps/game/public/refs/`;
const WORLD_DIR = `${REPO}content/zones/worlds/`;

const TAG = (process.env.EE_SHOTS_TAG ?? '').trim().replace(/[^A-Za-z0-9_-]/g, '');
const SUFFIX = TAG ? `-${TAG}` : '';
/** Höhe der Bilder in der Montage (px); das Paar Verlauf 0 / 1 zeigt das Lab quer in voller Höhe (760). */
const MONTAGE_H = Math.max(240, Number(process.env.EE_MONTAGE_H ?? 640));
/** Karte: `first` = erster Knoten der Welt (Standard), `mid` = Mitte der Welt (dort steht meist das Fokus-Element). */
const KARTE_NODE = process.env.EE_NODE === 'mid' ? 'mid' : 'first';
/** Qualität der Karte auf dem Handy (die Lab-Bilder haben feste Stufen: quer Hoch, hoch Mobil). */
const KARTE_QUALITY = process.env.EE_KARTE_QUALITY === 'hoch' ? 'hoch' : 'mobil';
/** Ohne WebGPU-Adapter fällt die App auf WebGL2 zurück; solche Bilder sind mit GPU-Bildern nicht vergleichbar. */
const ALLOW_WEBGL2 = !!process.env.EE_ALLOW_WEBGL2;

const SIZE_QUER = { width: 1200, height: 760 } as const;
const SIZE_HOCH = { width: 390, height: 844 } as const;
const SIZE_KARTE = { width: 393, height: 852 } as const;

const GPU_ERROR = /WGSL|ShaderModule|pipeline creation failed|Invalid RenderPipeline|unresolved value|Invalid (BindGroup|Buffer|Texture)/i;

interface WorldInfo {
  ref: string;
  name: string;
  title: string;
}

/** Alle Welten aus `content/zones/worlds/NN.json` (15/16 erscheinen von selbst, sobald ihre Dateien da sind). */
function allWorlds(): WorldInfo[] {
  return readdirSync(WORLD_DIR)
    .filter((f) => /^\d+\.json$/.test(f))
    .sort()
    .map((f) => {
      const j = JSON.parse(readFileSync(WORLD_DIR + f, 'utf8')) as { ref?: string; name?: string; title?: string };
      return { ref: j.ref ?? f.replace(/\.json$/, ''), name: j.name ?? '', title: j.title ?? '' };
    });
}

/** `EE_WORLDS=08,09` (auch `8`, `w08`); ohne Angabe alle. */
function selectedWorlds(): WorldInfo[] {
  const all = allWorlds();
  const want = (process.env.EE_WORLDS ?? '')
    .split(/[\s,;]+/)
    .map((s) => s.trim().replace(/^w/i, ''))
    .filter(Boolean)
    .map((s) => s.padStart(2, '0'));
  if (want.length === 0) return all;
  const unknown = want.filter((r) => !all.some((w) => w.ref === r));
  if (unknown.length > 0 && process.env.EE_SHOTS) throw new Error(`EE_WORLDS: unbekannte Welt(en) ${unknown.join(', ')} (vorhanden: ${all.map((w) => w.ref).join(', ')})`);
  return all.filter((w) => want.includes(w.ref));
}

function commitLabel(): string {
  try {
    const run = (args: string[]) => execFileSync('git', args, { cwd: REPO, encoding: 'utf8' }).trim();
    const hash = run(['rev-parse', '--short', 'HEAD']);
    const dirty = run(['status', '--porcelain', '--untracked-files=no', '--', 'apps', 'packages', 'content']) !== '';
    return dirty ? `${hash} + Änderungen` : hash;
  } catch {
    return 'ohne Git';
  }
}

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error' || (m.type() === 'warning' && GPU_ERROR.test(m.text()))) errors.push(m.text().slice(0, 400));
  });
  return errors;
}

/** Ohne Bedienflächen: Bilder zeigen die Welt, nicht die Lab-Kopfzeile, die Regler, die Dev-Leiste oder das HUD. */
const CLEAN_CSS = `
  .lab-header, .lab-sheet, .earle-world-tag, .earle-ref, .perf-badge, .flow-dev, [data-testid="flow-hud"] { display: none !important; }
  .lab-stage { right: 0 !important; bottom: 0 !important; }
`;

async function hideChrome(page: Page): Promise<void> {
  await page.addInitScript((css) => {
    const add = () => {
      const s = document.createElement('style');
      s.textContent = css;
      document.documentElement.appendChild(s);
    };
    if (document.documentElement) add();
    else document.addEventListener('DOMContentLoaded', add, { once: true });
  }, CLEAN_CSS);
}

async function requireBackend(page: Page): Promise<string> {
  const badge = page.getByTestId('perf-badge');
  await expect(badge).toHaveAttribute('data-backend', /webgpu|webgl2/, { timeout: 60_000 });
  const backend = (await badge.getAttribute('data-backend')) ?? 'unbekannt';
  if (backend !== 'webgpu' && !ALLOW_WEBGL2) throw new Error(`Backend ${backend}: kein WebGPU-Adapter (EE_ALLOW_WEBGL2=1 erlaubt das trotzdem)`);
  return backend;
}

interface Stable {
  /** Ruhig geworden (sonst: Zeitgrenze erreicht, das Bild zeigt den letzten Stand). */
  ok: boolean;
  ms: number;
  drawCalls: number;
  note: string;
}

/**
 * Wartet, bis das Bild steht: keine Chunk-Ladungen mehr, Draw Calls, geladene Chunks, Bäume/Punkte/Requisiten und die
 * Kamera unverändert über `holdMs` (mindestens acht Bilder). Lab: `window.__earleLab.getStats()`; Karte:
 * `window.__flow.stats()` + `view()` (die Gleitfahrt ist zu Ende, die Pipelines des Bretts sind aufgewärmt).
 */
async function waitStable(page: Page, kind: 'lab' | 'flow', maxMs = 120_000, holdMs = 1500): Promise<Stable> {
  return page.evaluate(
    async ([k, max, hold]) => {
      type S = {
        drawCalls: number;
        streaming: { loaded: number; builtThisFrame: number };
        chunks?: number;
        trees?: number;
        dots?: number;
        props?: number;
        worldIndex?: number;
        focus?: { x: number; z: number };
        chunkBuilds?: number;
        warm?: boolean;
      };
      const w = window as unknown as {
        __earleLab?: { getStats(): S };
        __flow?: { stats(): S | null; view(): { x: number; z: number; yaw: number; phase: string } };
      };
      const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r(null)));
      const t0 = performance.now();
      let sig = '';
      let since = performance.now();
      let frames = 0;
      let last = 0;
      while (performance.now() - t0 < max) {
        await nextFrame();
        let s: S | null = null;
        let view = '';
        if (k === 'lab') s = w.__earleLab?.getStats() ?? null;
        else if (w.__flow) {
          s = w.__flow.stats();
          const v = w.__flow.view();
          view = `${v.x.toFixed(3)}|${v.z.toFixed(3)}|${v.yaw.toFixed(3)}|${v.phase}`;
        }
        if (!s) {
          sig = '';
          continue;
        }
        const f = s.focus ? `${s.focus.x.toFixed(3)}|${s.focus.z.toFixed(3)}` : '';
        const next = [s.drawCalls, s.streaming.loaded, s.chunks, s.trees, s.dots, s.props, s.worldIndex, s.chunkBuilds, f, view].join(',');
        const quiet = s.streaming.builtThisFrame === 0 && s.drawCalls > 0 && (k === 'lab' || s.warm === true);
        last = s.drawCalls;
        if (!quiet || next !== sig) {
          sig = next;
          since = performance.now();
          frames = 0;
        } else frames++;
        if (quiet && frames >= 8 && performance.now() - since >= hold) {
          await nextFrame();
          await nextFrame();
          return { ok: true, ms: Math.round(performance.now() - t0), drawCalls: last, note: '' };
        }
      }
      return { ok: false, ms: Math.round(performance.now() - t0), drawCalls: last, note: `nicht ruhig nach ${Math.round(max / 1000)} s` };
    },
    [kind, maxMs, holdMs] as const,
  );
}

/** Lab-Regler „Verläufe“ (geteilter Uniform, kein Neukompilieren). Die Adresse kennt `?verlauf=` (noch) nicht. */
async function setVerlauf(page: Page, value: 0 | 1): Promise<string> {
  await page.waitForSelector('[data-testid="earle-verlauf"] input[type="range"]', { state: 'attached', timeout: 60_000 });
  await page.evaluate((v) => {
    const input = document.querySelector<HTMLInputElement>('[data-testid="earle-verlauf"] input[type="range"]')!;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, String(v));
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
  const expected = value === 0 ? /^Stufen$/ : /^100 %$/;
  await expect.poll(() => page.locator('[data-testid="earle-verlauf"] output').textContent(), { timeout: 10_000 }).toMatch(expected);
  return (await page.locator('[data-testid="earle-verlauf"] output').textContent()) ?? '';
}

interface LabShot {
  png: Buffer;
  stable: Stable;
  backend: string;
  world: string;
}

/** Lab-Planet einer Welt (`?world=NN&p=1`, Verlauf, Größe, Qualität), ruhig abwarten, Bild aufnehmen. */
async function labShot(page: Page, ref: string, size: { width: number; height: number }, quality: 'hoch' | 'mobil', verlauf: 0 | 1): Promise<LabShot> {
  await page.setViewportSize(size);
  await page.goto(`/lab/earle?world=${ref}&p=1&quality=${quality}&verlauf=${verlauf}&panel=zu&sheet=zu`);
  const backend = await requireBackend(page);
  await page.waitForFunction(() => !!(window as unknown as { __earleLab?: unknown }).__earleLab, undefined, { timeout: 60_000 });
  await setVerlauf(page, verlauf);
  const stable = await waitStable(page, 'lab');
  const world = await page.evaluate(() => (window as unknown as { __earleLab: { getStats(): { world: string } } }).__earleLab.getStats().world);
  return { png: await page.screenshot(), stable, backend, world };
}

interface RouteInfo {
  ref: string;
  first: number;
  levels: number;
  future: boolean;
}

/** Route aus dem Code (`AUTHORED_ROUTE` in zones.ts, über den Dev-Server geladen): erster Knoten und Länge je Welt. */
async function readRoute(page: Page): Promise<{ route: RouteInfo[]; levelCount: number }> {
  return page.evaluate(async (url) => {
    const z = (await import(/* @vite-ignore */ url)) as {
      AUTHORED_ROUTE: Array<{ world: number; levels: number; future?: boolean }>;
      WORLD_CONTENTS: Array<{ ref: string }>;
      LEVEL_COUNT: number;
    };
    let n = 0;
    const route: Array<{ ref: string; first: number; levels: number; future: boolean }> = [];
    for (const r of z.AUTHORED_ROUTE) {
      route.push({ ref: z.WORLD_CONTENTS[r.world]!.ref, first: n, levels: r.levels, future: !!r.future });
      n += r.levels;
    }
    return { route, levelCount: z.LEVEL_COUNT };
  }, '/src/lab/earle/zones.ts');
}

interface KarteShot {
  png: Buffer;
  stable: Stable;
  backend: string;
  node: number;
}

/** Karte (Handy, freier Modus): Fortschritt gesetzt, Held am Knoten (oder am letzten Autorenlevel), Ansicht auf den Knoten. */
async function karteShot(page: Page, node: number, levelCount: number): Promise<KarteShot> {
  const current = Math.min(node, levelCount - 1);
  await page.addInitScript(
    ([cur, last, quality]) => {
      const slot = { reached: last, current: cur, levels: {}, collection: {}, seen: { intro: true, stories: ['afterLevel1'] } };
      localStorage.setItem('ee.progress.v2', JSON.stringify({ version: 2, mode: 'free', slots: { free: slot, real: slot } }));
      localStorage.setItem('ee.qualityPref', quality);
    },
    [current, levelCount - 1, KARTE_QUALITY] as const,
  );
  await page.setViewportSize(SIZE_KARTE);
  await page.goto(`/play?mode=free&quality=${KARTE_QUALITY}`);
  await expect(page.getByTestId('flow-hud')).toHaveAttribute('data-flow-state', 'map', { timeout: 90_000 });
  const backend = await requireBackend(page);
  // die Flow-Szene kann nach dem Map-Zustand noch einmal mounten: erst warten, bis ihre Debug-API steht
  await page.waitForFunction(() => !!(window as unknown as { __flow?: unknown }).__flow, undefined, { timeout: 60_000 });
  if (node !== current) await page.evaluate((n) => (window as unknown as { __flow: { goToNode(i: number): void } }).__flow.goToNode(n), node);
  const stable = await waitStable(page, 'flow');
  return { png: await page.screenshot(), stable, backend, node };
}

// --- Montage -----------------------------------------------------------------------------------------------------

interface Panel {
  label: string;
  sub?: string;
  /** PNG-Daten; ohne: Platzhalter mit `missing`. */
  png?: Buffer | undefined;
  missing?: string;
  /** Breite/Höhe des Platzhalters (Seitenverhältnis des fehlenden Bildes). */
  ratio?: number;
  maxWidth?: number;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function writeMontage(page: Page, file: string, title: string, subtitle: string, panels: Panel[], height: number): Promise<void> {
  const figs = panels
    .map((p) => {
      const cap = `<figcaption><b>${esc(p.label)}</b>${p.sub ? ` <span>${esc(p.sub)}</span>` : ''}</figcaption>`;
      if (p.png) {
        const max = p.maxWidth ? `max-width:${p.maxWidth}px;` : '';
        return `<figure><img src="data:image/png;base64,${p.png.toString('base64')}" style="height:${height}px;${max}">${cap}</figure>`;
      }
      const w = Math.round(height * (p.ratio ?? 0.46));
      return `<figure><div class="missing" style="height:${height}px;width:${w}px">${esc(p.missing ?? 'fehlt')}</div>${cap}</figure>`;
    })
    .join('');
  const html = `<!doctype html><meta charset="utf-8"><style>
    html,body{margin:0;background:#161619}
    #m{display:inline-block;padding:20px 22px 18px;background:#161619;color:#e8e6df;font:14px/1.35 -apple-system,'Helvetica Neue',sans-serif}
    h1{margin:0 0 14px;font-size:20px;font-weight:700} h1 span{font-weight:400;color:#a9a79f;font-size:14px;margin-left:10px}
    .row{display:flex;gap:18px;align-items:flex-start}
    figure{margin:0} img{display:block;width:auto;object-fit:contain;background:#000}
    figcaption{margin-top:7px} figcaption span{color:#a9a79f}
    .missing{display:flex;align-items:center;justify-content:center;text-align:center;padding:12px;box-sizing:border-box;background:#222226;color:#8d8b84;font-size:13px}
  </style><div id="m"><h1>${esc(title)}<span>${esc(subtitle)}</span></h1><div class="row">${figs}</div></div>`;
  const mp = await page.context().newPage();
  try {
    await mp.setViewportSize({ width: 8000, height: 2400 });
    await mp.setContent(html);
    await mp.evaluate(() => Promise.all([...document.images].map((i) => i.decode())));
    await mp.locator('#m').screenshot({ path: file });
  } finally {
    await mp.close();
  }
}

// --- Tests -------------------------------------------------------------------------------------------------------

const WORLDS = selectedWorlds();

for (const w of WORLDS) {
  test(`Welt ${w.ref} ${w.name}: Referenz | Lab quer | Lab hoch | Karte Handy, Verlauf 0 / 1`, async ({ page }, testInfo) => {
    mkdirSync(OUT, { recursive: true });
    const errors = collectErrors(page);
    await hideChrome(page);
    const commit = commitLabel();
    const stamp = new Date().toISOString().slice(0, 10);
    const subtitle = `${TAG || 'ohne Tag'} · ${commit} · ${stamp}`;
    const notes: string[] = [];
    const note = (what: string, s: Stable) => {
      if (!s.ok) {
        notes.push(`${what}: ${s.note}`);
        testInfo.annotations.push({ type: 'unruhig', description: `Welt ${w.ref} ${what}: ${s.note}` });
      }
    };

    // (a) Lab quer, Hoch, Verlauf 1 — und (e) dasselbe Bild mit Verlauf 0
    const quer = await labShot(page, w.ref, SIZE_QUER, 'hoch', 1);
    note('Lab quer', quer.stable);
    if (!quer.world.startsWith(w.ref)) notes.push(`Lab quer zeigt „${quer.world}“`);
    await testInfo.attach(`w${w.ref}-lab-quer.png`, { body: quer.png, contentType: 'image/png' });
    const route = await readRoute(page);
    await setVerlauf(page, 0);
    const stufen = await waitStable(page, 'lab');
    note('Lab quer, Verlauf 0', stufen);
    const querStufen = await page.screenshot();
    await testInfo.attach(`w${w.ref}-lab-quer-verlauf0.png`, { body: querStufen, contentType: 'image/png' });

    // (b) Lab hoch, Mobil
    const hoch = await labShot(page, w.ref, SIZE_HOCH, 'mobil', 1);
    note('Lab hoch', hoch.stable);
    await testInfo.attach(`w${w.ref}-lab-hoch.png`, { body: hoch.png, contentType: 'image/png' });

    // (c) Karte Handy am ersten Knoten der Welt
    const entry = route.route.find((r) => r.ref === w.ref);
    let karte: KarteShot | undefined;
    if (entry) {
      const node = KARTE_NODE === 'mid' ? entry.first + Math.floor(entry.levels / 2) : entry.first;
      karte = await karteShot(page, node, route.levelCount);
      note('Karte', karte.stable);
      await testInfo.attach(`w${w.ref}-karte-handy.png`, { body: karte.png, contentType: 'image/png' });
    } else notes.push('Welt nicht auf der Route (keine Karte)');

    // (d) Montage Referenz | Lab quer | Lab hoch | Karte Handy
    const refFile = `${REFS}${w.ref}.png`;
    const refPng = existsSync(refFile) ? readFileSync(refFile) : undefined;
    const noteSuffix = notes.length ? ` · ${notes.join(' · ')}` : '';
    await writeMontage(
      page,
      `${OUT}nachschaerfung-w${w.ref}${SUFFIX}.png`,
      `Welt ${w.ref} · ${w.name}`,
      `${subtitle} · ${quer.backend}${noteSuffix}`,
      [
        { label: `Referenz ${w.ref}`, sub: w.title, png: refPng, missing: `Referenz fehlt (apps/game/public/refs/${w.ref}.png)`, ratio: 1, maxWidth: 900 },
        { label: 'Lab quer', sub: `${SIZE_QUER.width}×${SIZE_QUER.height} · Hoch · Verlauf 1`, png: quer.png },
        { label: 'Lab hoch', sub: `${SIZE_HOCH.width}×${SIZE_HOCH.height} · Mobil`, png: hoch.png },
        {
          label: 'Karte Handy',
          sub: karte ? `${SIZE_KARTE.width}×${SIZE_KARTE.height} · ${KARTE_QUALITY} · Knoten ${karte.node}` : `${SIZE_KARTE.width}×${SIZE_KARTE.height}`,
          png: karte?.png,
          missing: 'Welt nicht auf der Route',
          ratio: SIZE_KARTE.width / SIZE_KARTE.height,
        },
      ],
      MONTAGE_H,
    );

    // (e) Paar Verlauf 0 / 1 (Lab quer, Hoch)
    await writeMontage(
      page,
      `${OUT}nachschaerfung-w${w.ref}-verlauf${SUFFIX}.png`,
      `Welt ${w.ref} · ${w.name} · Verlauf`,
      `${subtitle} · ${quer.backend}`,
      [
        { label: 'Verlauf 0', sub: 'nur Stufen (Siebdruck)', png: querStufen },
        { label: 'Verlauf 1', sub: 'Stufen plus Verlauf innen', png: quer.png },
      ],
      SIZE_QUER.height,
    );

    const ms = (s?: Stable) => (s ? `${s.ok ? '' : 'UNRUHIG '}${s.ms} ms/${s.drawCalls} dc` : '–');
    console.log(`Welt ${w.ref} ${w.name}: quer ${ms(quer.stable)} · hoch ${ms(hoch.stable)} · karte ${ms(karte?.stable)}${notes.length ? ` · ${notes.join(' · ')}` : ''}`);
    testInfo.annotations.push({ type: 'draw calls', description: `quer ${quer.stable.drawCalls}, hoch ${hoch.stable.drawCalls}, karte ${karte?.stable.drawCalls ?? '–'}` });
    // Fehler melden, ohne die Bilder zu verlieren (sie sind schon geschrieben)
    expect.soft(errors, 'GPU-/Seitenfehler').toEqual([]);
  });
}
