// Was baut der Editor aus einem Dokument der Prüfreihe? Marken im Seitenumriss, eingefrorene Stationen, Lippen-px.
// FALL=name; Aufruf über run-check.sh
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const AUSGABE = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/pruefen-ausgabe');
const faelle = JSON.parse(readFileSync(resolve(AUSGABE, 'pruefreihe.json'), 'utf-8'));
const url = process.env.EDITOR_URL ?? 'http://localhost:5192';
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const page = await browser.newPage({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 1 });
await page.goto(`${url}/?bauweise=kern&look=earle&palette=blob`);
await page.waitForFunction(() => window.__editor && window.__editor.vertices() > 0, null, { timeout: 60_000 });
for (const name of (process.env.FALL ?? 'kugel-unterbiss-florian').split(',')) {
  const f = faelle[name];
  const vorher = { marken: f.dok.profile.seite.knoten.map((k) => k.marke ?? '-').join(','), stationen: !!f.dok.kaefig?.stationen };
  await page.evaluate((d) => { window.__stores.editor.getState().laden(d, null); window.__stores.ui.getState().setzeEbene('maul'); }, f.dok);
  await page.waitForTimeout(3000);
  const nach = await page.evaluate(() => {
    const d = window.__stores.editor.getState().dok;
    return { marken: d.profile.seite.knoten.map((k) => k.marke ?? '-').join(','), stationen: d.kaefig?.stationen ? d.kaefig.stationen.ringe.slice(0, 5).map((x) => +x.toFixed(4)) : null, unten: !!d.maul?.zu.unten, wesen: window.__editor.wesen?.() ? { lippen: window.__editor.wesen().lippen, vorlage: window.__editor.wesen().vorlage } : null };
  });
  console.log(name, 'Dokument:', JSON.stringify(vorher), '→ im Editor:', JSON.stringify(nach));
}
await browser.close();
