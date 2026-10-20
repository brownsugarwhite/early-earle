// Plan 20.10., V0: Tastenfallen im echten Editor (eigener Vite über run-check.sh, nie 5180).
// ⌘R lädt nicht neu (Standardaktion verhindert, Seite bleibt), ⌃R/⌘R setzen wie bisher einen Reifen bzw. geben den Hinweis,
// [ und ] wirken auch mit ⌥ (deutsche Mac-Tastatur: ⌥5/⌥6).
// Aufruf: apps/editor/scripts/pruefen/run-check.sh apps/editor/scripts/pruefen/v0-tasten.mjs
import { chromium } from '@playwright/test';

const url = process.env.EDITOR_URL ?? 'http://localhost:5192';
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const page = await browser.newPage({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 300)));
let fehler = 0;
const pruefe = (ok, text) => {
  console.log(`${ok ? '  ok  ' : '  FEHL'} ${text}`);
  if (!ok) fehler++;
};

await page.goto(`${url}/`);
await page.waitForFunction(() => window.__stores && window.__editor && window.__editor.vertices() > 0, null, { timeout: 90_000 });
await page.waitForTimeout(1200);
// Merker: überlebt nur, wenn die Seite nicht neu lädt; danach registrierter Lauscher sieht, ob der Editor die Taste verhindert
await page.evaluate(() => {
  window.__marke = 42;
  window.addEventListener('keydown', (e) => {
    window.__letzte = { key: e.key, meta: e.metaKey, ctrl: e.ctrlKey, verhindert: e.defaultPrevented };
  });
});
await page.mouse.move(5, 5);
await page.keyboard.press('Meta+r');
await page.waitForTimeout(1500);
const nachCmdR = await page.evaluate(() => ({ marke: window.__marke ?? null, letzte: window.__letzte ?? null, hinweis: window.__stores.ui.getState().hinweis ?? null }));
pruefe(nachCmdR.marke === 42, `⌘R: Seite nicht neu geladen (Merker ${nachCmdR.marke})`);
pruefe(!!nachCmdR.letzte?.verhindert, `⌘R: Standardaktion verhindert (${JSON.stringify(nachCmdR.letzte)})`);
pruefe(String(nachCmdR.hinweis?.text ?? nachCmdR.hinweis ?? '').includes('⌘R'), `⌘R ohne Körper unter dem Zeiger: Hinweis „${JSON.stringify(nachCmdR.hinweis)}“`);
await page.keyboard.press('Control+r');
await page.waitForTimeout(600);
const nachCtrlR = await page.evaluate(() => ({ marke: window.__marke ?? null, letzte: window.__letzte ?? null }));
pruefe(nachCtrlR.marke === 42 && !!nachCtrlR.letzte?.verhindert, '⌃R: wie bisher, Seite bleibt');
// [ ] mit ⌥ wie auf der deutschen Tastatur (⌥5 = [, ⌥6 = ])
const r0 = await page.evaluate(() => window.__stores.ui.getState().pinselRadius);
await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: '[', code: 'Digit5', altKey: true, bubbles: true })));
const r1 = await page.evaluate(() => window.__stores.ui.getState().pinselRadius);
await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: ']', code: 'Digit6', altKey: true, bubbles: true })));
const r2 = await page.evaluate(() => window.__stores.ui.getState().pinselRadius);
pruefe(Math.abs(r1 - r0 * 0.8) < 1e-12, `⌥5 ([): Radius ${r0.toFixed(3)} → ${r1.toFixed(3)}`);
pruefe(Math.abs(r2 - r1 * 1.25) < 1e-12, `⌥6 (]): Radius ${r1.toFixed(3)} → ${r2.toFixed(3)}`);
// [ ohne ⌥ (US-Tastatur) wirkt weiter
await page.keyboard.press('BracketLeft');
const r3 = await page.evaluate(() => window.__stores.ui.getState().pinselRadius);
pruefe(Math.abs(r3 - r2 * 0.8) < 1e-12, `[ ohne ⌥: Radius ${r2.toFixed(3)} → ${r3.toFixed(3)}`);
await browser.close();
console.log(fehler ? `${fehler} Fehler` : 'alles grün');
process.exit(fehler ? 1 : 0);
