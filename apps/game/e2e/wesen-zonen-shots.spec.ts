import { test, expect, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Bilder der Musterzonen (Bild 17): je Fall eine Vorlage aus `presets.ts` mit Muster-Übersteuerung (Zonen, Farben,
// Muster), Maul zu, Bögen-Kamera, weißer Grund → `docs/progress/wesen-zonen-<fall>[-TAG].png` und ein Kontaktbogen
// `docs/progress/wesen-zonen-kontaktbogen[-TAG].png` (unter jedem Bild die Einstellung). Echte GPU, nur auf Wunsch:
//
//   EE_SHOTS=1 [EE_FAELLE=krokodil,orca] [EE_SHOTS_TAG=x] [EE_DPR=2] E2E_PORT=4485 node apps/game/scripts/e2e.mjs e2e/wesen-zonen-shots.spec.ts
//
// Referenz zum Vergleich: optional ein Bildstreifen pro Fall (`ref`, Pfad relativ zum Repo), rechts daneben gestellt.
test.skip(!process.env.EE_SHOTS, 'nur mit EE_SHOTS=1');
test.use({
  launchOptions: { args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] },
  deviceScaleFactor: Number(process.env.EE_DPR ?? 1),
  viewport: { width: 900, height: 700 },
});
test.setTimeout(600_000);

const REPO = fileURLToPath(new URL('../../../', import.meta.url));
const OUT = `${REPO}docs/progress/`;
const TAG = (process.env.EE_SHOTS_TAG ?? '').trim().replace(/[^A-Za-z0-9_-]/g, '');
const SUFFIX = TAG ? `-${TAG}` : '';

interface Fall {
  id: string;
  titel: string;
  vorlage: string;
  /** Bauplan-Pfade → Werte (Objekte erlaubt), nach dem Laden der Vorlage gesetzt. */
  setze: Array<[string, unknown]>;
  maul?: 'zu' | 'bau';
  ref?: string;
}

const ZONE = (art: string, lage: number, breite: number, federung: number, farbe: string, muster = 'frei') => ({ art, lage, breite, federung, farbe, muster });

const FAELLE: Fall[] = [
  {
    id: 'krokodil',
    titel: 'Krokodil (Bild 17): Schuppen, heller Latz mit Schuppen im Zonenton',
    vorlage: 'grundform10',
    setze: [
      ['muster.typ', 'schuppen'],
      ['muster.dichte', 0.45],
      ['muster.groesse', 0.45],
      ['muster.glimmer', 0.2],
      ['muster.farben.grund', '#6f9a3a'],
      ['muster.farben.muster', '#4d7426'],
      ['muster.zone1', ZONE('latz', 0.55, 0.62, 0.25, '#e6e2ae', 'ton')],
    ],
  },
  {
    id: 'orca',
    titel: 'Orca (Bild 17): weißer Bauch, Augenfleck',
    vorlage: 'grundform10',
    setze: [
      ['muster.glimmer', 0.15],
      ['muster.farben.grund', '#26303f'],
      ['muster.zone1', ZONE('latz', 0.5, 0.75, 0.2, '#eef0f2')],
      ['muster.zone2', ZONE('maske', 0.72, 0.35, 0.2, '#eef0f2')],
    ],
  },
  {
    id: 'clownfisch',
    titel: 'Clownfisch (Bild 17): zwei weiße Bänder',
    vorlage: 'fest',
    setze: [
      ['muster.glimmer', 0.2],
      ['muster.farben.grund', '#f07a2a'],
      ['muster.zone1', ZONE('band', 0.62, 0.16, 0.15, '#f7f3ea')],
      ['muster.zone2', ZONE('band', 0.25, 0.12, 0.15, '#f7f3ea')],
    ],
  },
  {
    id: 'schuppenband',
    titel: 'Schuppen nur im Band (Bild 17, Fisch mit Schuppenband)',
    vorlage: 'fest',
    setze: [
      ['muster.typ', 'schuppen'],
      ['muster.dichte', 0.5],
      ['muster.groesse', 0.35],
      ['muster.glimmer', 0.2],
      ['muster.farben.grund', '#2f6fd0'],
      ['muster.zone1', ZONE('band', 0.45, 0.2, 0.2, '#4fd0e0', 'nurTon')],
    ],
  },
  {
    id: 'tiger',
    titel: 'Tiger (Bild 9): weißer Latz, Streifen bleiben draußen',
    vorlage: 'vierbeiner',
    setze: [],
    maul: 'zu',
  },
  {
    id: 'rottweiler',
    titel: 'Hund schwarz-loh: Latz, Brauenpunkte, Socken',
    vorlage: 'retriever',
    setze: [
      ['muster.typ', 'uni'],
      ['muster.glimmer', 0.1],
      ['muster.farben.grund', '#24201f'],
      ['muster.zone1', ZONE('latz', 0.45, 0.5, 0.3, '#b86a2c')],
      ['muster.zone2', ZONE('maske', 0.95, 0.05, 0.2, '#b86a2c')],
      ['muster.zone3', ZONE('socken', 0.45, 0.5, 0.25, '#b86a2c')],
    ],
    maul: 'zu',
  },
  {
    id: 'rueckenstreifen',
    titel: 'Rex mit Rückenstreifen und heller Schwanzspitze',
    vorlage: 'keil',
    setze: [
      ['muster.glimmer', 0.1],
      ['muster.zone1', ZONE('ruecken', 0.8, 0.35, 0.3, '#221b28')],
      ['muster.zone2', ZONE('spitze', 0.3, 0.5, 0.3, '#d9cbe0')],
    ],
    maul: 'zu',
  },
  {
    id: 'aal',
    titel: 'Aal (Bild 13): heller Bauch, Schuppen im Bauchton',
    vorlage: 'aal',
    setze: [],
    maul: 'zu',
  },
];

function auswahl(): Fall[] {
  const want = (process.env.EE_FAELLE ?? '')
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return want.length === 0 ? FAELLE : FAELLE.filter((f) => want.includes(f.id));
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

const CLEAN_CSS = `
  .lab-header, .lab-sheet, .perf-badge, .wl-ref-hinweis { display: none !important; }
  .lab-stage { right: 0 !important; bottom: 0 !important; }
`;

async function vorbereiten(page: Page, errors: string[]): Promise<void> {
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error' || (m.type() === 'warning' && /WGSL|ShaderModule|pipeline creation failed|unresolved value/i.test(m.text()))) errors.push(m.text().slice(0, 400));
  });
  await page.addInitScript((css) => {
    try {
      localStorage.clear();
    } catch {
      /* egal */
    }
    const add = () => {
      const s = document.createElement('style');
      s.textContent = css;
      document.documentElement.appendChild(s);
    };
    if (document.documentElement) add();
    else document.addEventListener('DOMContentLoaded', add, { once: true });
  }, CLEAN_CSS);
}

async function waitFertig(page: Page): Promise<void> {
  const info = page.getByTestId('wesen-lab-info');
  await expect(info).toContainText('Vertices', { timeout: 120_000 });
  await expect(info).not.toContainText('fein folgt', { timeout: 120_000 });
  await page.waitForFunction(
    () => {
      const w = (window as unknown as { __wesenLab?: { controller: { getStats(): { pending: boolean; vertices: number }; cameraSettled: boolean } } }).__wesenLab;
      if (!w) return false;
      const s = w.controller.getStats();
      return s.vertices > 0 && !s.pending && w.controller.cameraSettled;
    },
    undefined,
    { timeout: 120_000, polling: 100 },
  );
  await page.waitForTimeout(700);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null)))));
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

test('Wesen-Lab: Musterzonen', async ({ page }) => {
  mkdirSync(OUT, { recursive: true });
  const errors: string[] = [];
  await vorbereiten(page, errors);
  const felder: Array<{ titel: string; unter: string; png: Buffer; ref?: Buffer }> = [];
  for (const f of auswahl()) {
    await page.goto(`/lab/wesen?vorlage=${f.vorlage}&panel=zu&sheet=zu&boden=weiss&ansicht=referenz&standbild=1`);
    const badge = page.getByTestId('perf-badge');
    await expect(badge).toHaveAttribute('data-backend', /webgpu/, { timeout: 60_000 });
    await waitFertig(page);
    for (const [k, v] of f.setze) {
      await page.evaluate(([key, val]) => (window as unknown as { __wesenLab: { store: { getState(): { setzeBauplanWert(k: string, v: unknown): void } } } }).__wesenLab.store.getState().setzeBauplanWert(key as string, val), [k, v] as const);
    }
    if (f.maul === 'zu') {
      await page.evaluate(() => (window as unknown as { __wesenLab: { controller: { setOpenness(o: number): void } } }).__wesenLab.controller.setOpenness(0));
      await page.waitForTimeout(1200);
    }
    await page.waitForTimeout(500);
    await waitFertig(page);
    const png = await page.screenshot({ path: `${OUT}wesen-zonen-${f.id}${SUFFIX}.png` });
    const refPfad = f.ref ? `${REPO}${f.ref}` : '';
    const ref = refPfad && existsSync(refPfad) ? readFileSync(refPfad) : undefined;
    const unter = f.setze.map(([k, v]) => `${k.replace('muster.', '')}=${typeof v === 'object' ? Object.values(v as Record<string, unknown>).join('/') : String(v)}`).join(' · ') || 'Vorlage';
    felder.push(ref ? { titel: f.titel, unter, png, ref } : { titel: f.titel, unter, png });
    console.log(`${f.id.padEnd(16)} ${unter}`);
  }
  const img = (b: Buffer) => `<img src="data:image/png;base64,${b.toString('base64')}">`;
  const figs = felder.map((f) => `<figure><div class="bilder">${img(f.png)}${f.ref ? img(f.ref) : ''}</div><figcaption><b>${esc(f.titel)}</b><br><span>${esc(f.unter)}</span></figcaption></figure>`).join('');
  const html = `<!doctype html><meta charset="utf-8"><style>
    html,body{margin:0;background:#161619}
    #m{display:inline-block;padding:20px 22px 18px;background:#161619;color:#e8e6df;font:13px/1.35 -apple-system,'Helvetica Neue',sans-serif}
    h1{margin:0 0 14px;font-size:20px} h1 span{font-weight:400;color:#a9a79f;font-size:14px;margin-left:10px}
    .grid{display:grid;grid-template-columns:repeat(4,auto);gap:16px 18px;align-items:start}
    figure{margin:0;width:420px} .bilder{display:flex;gap:6px} img{display:block;width:420px;height:327px;object-fit:contain;background:#fff}
    figcaption{margin-top:6px} figcaption span{color:#a9a79f;font-size:11px}
  </style><div id="m"><h1>Musterzonen<span>${esc(TAG || 'ohne Tag')} · ${esc(commitLabel())} · ${new Date().toISOString().slice(0, 10)}</span></h1><div class="grid">${figs}</div></div>`;
  const mp = await page.context().newPage();
  try {
    await mp.setViewportSize({ width: 2400, height: 2400 });
    await mp.setContent(html);
    await mp.evaluate(() => Promise.all([...document.images].map((i) => i.decode())));
    await mp.locator('#m').screenshot({ path: `${OUT}wesen-zonen-kontaktbogen${SUFFIX}.png` });
  } finally {
    await mp.close();
  }
  expect.soft(errors, 'GPU-/Seitenfehler').toEqual([]);
});
