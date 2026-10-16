// Kontaktbogen aus Bildern (Ausschnitte, Zeilen mit Überschrift), gerendert per Playwright (kein PIL auf dem Mac).
// Aufruf: node kontaktbogen.mjs <spec.json> <aus.png>
// spec: { "titel": "…", "hoehe": 420, "zeilen": [{ "titel": "…", "bilder": [{ "pfad": "…", "x": 0, "y": 0, "w": 600, "h": 480, "unter": "…" }] }] }
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const [specPfad, aus] = process.argv.slice(2);
const spec = JSON.parse(readFileSync(specPfad, 'utf8'));
const H = spec.hoehe ?? 420;
const esc = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
const zeilen = spec.zeilen
  .map((z) => {
    const bilder = z.bilder
      .map((b) => {
        const daten = readFileSync(b.pfad).toString('base64');
        const s = H / b.h;
        return `<figure style="margin:0;width:${Math.round(b.w * s)}px"><div style="width:${Math.round(b.w * s)}px;height:${H}px;overflow:hidden;position:relative;border-radius:6px"><img src="data:image/png;base64,${daten}" style="position:absolute;left:${-b.x * s}px;top:${-b.y * s}px;transform-origin:0 0;transform:scale(${s})"></div><figcaption>${esc(b.unter)}</figcaption></figure>`;
      })
      .join('');
    return `<section><h2>${esc(z.titel)}</h2><div class="reihe">${bilder}</div></section>`;
  })
  .join('');
const html = `<!doctype html><meta charset="utf-8"><style>
body{margin:0;padding:24px 28px;background:#19232b;color:#f1ead9;font:15px/1.35 -apple-system,'Helvetica Neue',sans-serif;width:max-content}
h1{font-size:22px;margin:0 0 14px} h2{font-size:16px;margin:18px 0 8px;color:#c8f560}
.reihe{display:flex;gap:12px} figcaption{font-size:13px;color:#c9c2b0;margin-top:5px;max-width:100%}
</style><h1>${esc(spec.titel)}</h1>${zeilen}`;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 800, height: 600 }, deviceScaleFactor: 1 });
await p.setContent(html);
await p.waitForTimeout(500);
await p.screenshot({ path: aus, fullPage: true });
await b.close();
