import { test, expect, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { WESEN_VORLAGEN } from '../src/lab/wesen/presets.ts';

// Screenshot-Harness des Grundformen-Labs (Wesen-Werkstatt L1): je Vorlage aus `presets.ts` ein Bild 900×700 im
// Referenzmodus (weißer Grund, Bögen-Kamera, Standbild) nach `docs/progress/wesen-lab-<id>[-TAG].png`, dazu der
// Kontaktbogen aller Vorlagen `docs/progress/wesen-lab-kontaktbogen[-TAG].png` (Kopfzeile: Commit, Backend, Datum).
// Echte GPU wie die anderen Harnesses, nur auf Wunsch; Bedienung: docs/progress/wesen-lab-README.md.
//
//   EE_SHOTS=1 [EE_VORLAGEN=keil,loch] [EE_SHOTS_TAG=vorher] E2E_PORT=4471 node apps/game/scripts/e2e.mjs e2e/wesen-shots.spec.ts
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
/** Ohne WebGPU-Adapter fällt die App auf WebGL2 zurück; solche Bilder sind mit GPU-Bildern nicht vergleichbar. */
const ALLOW_WEBGL2 = !!process.env.EE_ALLOW_WEBGL2;
/** Ansicht der Bilder: `referenz` (Bögen-Kamera, Standard), `held` (freie Ansicht) oder `brett` (Spielsicht). */
const ANSICHT = ['held', 'brett', 'referenz'].includes(process.env.EE_ANSICHT ?? '') ? process.env.EE_ANSICHT! : 'referenz';
const GPU_ERROR = /WGSL|ShaderModule|pipeline creation failed|Invalid RenderPipeline|unresolved value|Invalid (BindGroup|Buffer|Texture)/i;

function auswahl(): typeof WESEN_VORLAGEN {
  const want = (process.env.EE_VORLAGEN ?? '')
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (want.length === 0) return WESEN_VORLAGEN;
  const unknown = want.filter((id) => !WESEN_VORLAGEN.some((v) => v.id === id));
  if (unknown.length > 0 && process.env.EE_SHOTS) throw new Error(`EE_VORLAGEN: unbekannt ${unknown.join(', ')} (vorhanden: ${WESEN_VORLAGEN.map((v) => v.id).join(', ')})`);
  return WESEN_VORLAGEN.filter((v) => want.includes(v.id));
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

/** Ohne Bedienflächen: Kopfzeile, Regler und Perf-Badge aus, die Bühne füllt das Fenster. */
const CLEAN_CSS = `
  .lab-header, .lab-sheet, .perf-badge, .wl-ref-hinweis { display: none !important; }
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

interface Stand {
  vertices: number;
  triangles: number;
  bones: number;
  teeth: number;
  buildMs: number;
  resolution: number;
}

/**
 * Wartet, bis das Wesen fein gebaut ist (Info-Zeile ohne „fein folgt“, Szene ohne offenen Bau), die Kamera ihre feste
 * Ansicht erreicht hat und der Kiefer steht; dann noch ein paar Bilder.
 */
async function waitFertig(page: Page): Promise<Stand> {
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
  await page.waitForTimeout(700); // Kiefer und letzte Kamerabilder setzen sich
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null)))));
  return page.evaluate(() => (window as unknown as { __wesenLab: { controller: { getStats(): Stand } } }).__wesenLab.controller.getStats());
}

// --- Kontaktbogen --------------------------------------------------------------------------------------------------

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

interface Feld {
  titel: string;
  unter: string;
  png: Buffer;
}

async function writeKontaktbogen(page: Page, file: string, titel: string, unter: string, felder: Feld[]): Promise<void> {
  const spalten = felder.length <= 4 ? felder.length : felder.length <= 9 ? 3 : 4;
  const figs = felder
    .map((f) => `<figure><img src="data:image/png;base64,${f.png.toString('base64')}"><figcaption><b>${esc(f.titel)}</b> <span>${esc(f.unter)}</span></figcaption></figure>`)
    .join('');
  const html = `<!doctype html><meta charset="utf-8"><style>
    html,body{margin:0;background:#161619}
    #m{display:inline-block;padding:20px 22px 18px;background:#161619;color:#e8e6df;font:14px/1.35 -apple-system,'Helvetica Neue',sans-serif}
    h1{margin:0 0 14px;font-size:20px;font-weight:700} h1 span{font-weight:400;color:#a9a79f;font-size:14px;margin-left:10px}
    .grid{display:grid;grid-template-columns:repeat(${spalten},450px);gap:16px 18px}
    figure{margin:0} img{display:block;width:450px;height:350px;object-fit:contain;background:#fff}
    figcaption{margin-top:6px} figcaption span{color:#a9a79f}
  </style><div id="m"><h1>${esc(titel)}<span>${esc(unter)}</span></h1><div class="grid">${figs}</div></div>`;
  const mp = await page.context().newPage();
  try {
    await mp.setViewportSize({ width: 2400, height: 2400 });
    await mp.setContent(html);
    await mp.evaluate(() => Promise.all([...document.images].map((i) => i.decode())));
    await mp.locator('#m').screenshot({ path: file });
  } finally {
    await mp.close();
  }
}

// --- Test ----------------------------------------------------------------------------------------------------------

test(`Wesen-Lab: Vorlagen im ${ANSICHT === 'referenz' ? 'Referenzmodus' : ANSICHT} plus Kontaktbogen`, async ({ page }, testInfo) => {
  mkdirSync(OUT, { recursive: true });
  const errors = collectErrors(page);
  await hideChrome(page);
  // Jede Seite frisch: kein Entwurf, kein Stil, keine Ansicht aus einem früheren Lauf (Referenzbilder liegen in IndexedDB
  // und erscheinen nur, wenn eins geladen wurde — der Harness lädt keins)
  await page.addInitScript(() => {
    try {
      localStorage.clear();
    } catch {
      /* egal */
    }
  });
  const commit = commitLabel();
  const stamp = new Date().toISOString().slice(0, 10);
  const felder: Feld[] = [];
  let backend = 'unbekannt';
  for (const v of auswahl()) {
    await page.goto(`/lab/wesen?vorlage=${v.id}&panel=zu&sheet=zu&boden=weiss&ansicht=${ANSICHT}&standbild=1`);
    backend = await requireBackend(page);
    const s = await waitFertig(page);
    const png = await page.screenshot({ path: `${OUT}wesen-lab-${v.id}${SUFFIX}.png` });
    await testInfo.attach(`wesen-lab-${v.id}.png`, { body: png, contentType: 'image/png' });
    const zeile = `${s.triangles} Dreiecke · ${s.teeth} Zähne · ${s.resolution}³ in ${s.buildMs} ms`;
    felder.push({ titel: v.name, unter: `${v.id} · ${zeile}`, png });
    console.log(`${v.id.padEnd(16)} ${zeile}`);
  }
  await writeKontaktbogen(page, `${OUT}wesen-lab-kontaktbogen${SUFFIX}.png`, 'Wesen-Lab · Vorlagen', `${TAG || 'ohne Tag'} · ${commit} · ${stamp} · ${backend} · Ansicht ${ANSICHT}`, felder);
  // Fehler melden, ohne die Bilder zu verlieren (sie sind schon geschrieben)
  expect.soft(errors, 'GPU-/Seitenfehler').toEqual([]);
});
