// Ausschnitt eines Bildes (Kontaktbögen genauer ansehen): node bild-ausschnitt.mjs <bild.png> <aus.png> x y breite höhe
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
const [bild, aus, x, y, w, h] = process.argv.slice(2);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: Number(w), height: Number(h) }, deviceScaleFactor: 1 });
await p.setContent(`<body style="margin:0;overflow:hidden"><img src="data:image/png;base64,${readFileSync(bild).toString('base64')}" style="position:absolute;left:${-x}px;top:${-y}px"></body>`);
await p.waitForTimeout(300);
await p.screenshot({ path: aus });
await b.close();
