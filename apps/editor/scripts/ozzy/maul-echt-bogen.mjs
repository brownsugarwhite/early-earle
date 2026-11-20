// Setzt das Bildblatt zur Probe `maul-echt-probe.mjs` (das Maul als echte Form: Abziehen anwenden, Tropfen „Maul“, „Fressen“).
// Aufruf aus apps/editor: node scripts/ozzy/maul-echt-bogen.mjs <ordner mit den Aufnahmen> [ziel.jpg]
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const hier = path.dirname(fileURLToPath(import.meta.url));
const ordner = path.resolve(process.argv[2] ?? '.');
const ziel = path.resolve(process.argv[3] ?? path.resolve(hier, '../../../../docs/progress/ozzy/2026-11-20-maul-echte-form-probe.jpg'));
const schrift = `file://${path.resolve(hier, '../../../../assets/fonts/lobster/Lobster-Regular.ttf')}`;
const b = (name, text) => `<figure><div class="rahmen"><img src="file://${path.join(ordner, `${name}.png`)}"></div><figcaption>${text}</figcaption></figure>`;
const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><style>
@font-face { font-family: Lobster; src: url('${schrift}'); }
html, body { margin: 0; background: #fff; }
body { width: 2400px; padding: 44px 44px 36px; box-sizing: border-box; font-family: -apple-system, 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #17202a; }
h1 { font-family: Lobster, serif; font-weight: 400; font-size: 64px; margin: 0 0 6px; }
p.unter { font-size: 25px; margin: 0 0 28px; color: #4a5560; }
.gitter { display: grid; grid-template-columns: repeat(3, 1fr); gap: 26px; }
figure { margin: 0; }
.rahmen { border: 1px solid #d6d2cb; border-radius: 6px; overflow: hidden; aspect-ratio: 1440 / 900; }
img { display: block; width: 100%; height: 100%; object-fit: cover; }
figcaption { font-size: 23px; line-height: 1.32; margin-top: 10px; }
</style></head><body>
<h1>Ozzy · Das Maul als echte Form</h1>
<p class="unter">20.11.2026 · Probe in Ozzy selbst (Fenster 5205), mit dem, was Ozzy heute kann · kein Code geändert · eine Form ohne eigene Linien, das Maul als zweites Objekt gezeichnet</p>
<div class="gitter">
${b('echt-0-zwei', '<b>1 · Zwei Objekte:</b> der Körper und davor, flach, der Raum des Mauls.')}
${b('echt-1-abgezogen-b', '<b>2 · Abziehen angewendet</b> (⌥ + Klick, Sitzung „Objekte“): Die Tasche ist jetzt Haut der Form. Ihr Rand ist eine Linie mit Kante und Punkten (rechts an der Wand zu sehen): die Lippe. An ihr erscheint der Tropfen „Maul“.')}
${b('echt-2-fressen-50-b', '<b>3 · „Fressen“, 50°</b> (Kieferknochen von Sitzung 4): Der Unterkiefer öffnet. Nichts schlägt neu um (6 Dreiecke vorher wie nachher).')}
</div></body></html>`;
const datei = path.join(ordner, 'echt-bogen.html');
fs.writeFileSync(datei, html);
const br = await chromium.launch();
const s = await br.newPage({ viewport: { width: 2400, height: 900 }, deviceScaleFactor: 1 });
await s.goto(`file://${datei}`);
await s.waitForTimeout(600);
await s.screenshot({ path: ziel, fullPage: true, type: 'jpeg', quality: 88 });
await br.close();
console.log(ziel);
