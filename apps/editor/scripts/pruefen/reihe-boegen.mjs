// Kontaktbögen der Zufallsreihe (Plan Teil V3): je Fehlerklasse die schlechtesten Fälle im echten Editor — Seitenblatt
// mit schwarzer, roter, blauer Linie und Δ im Titel (wie Florians Bildschirmfotos), Bühne zu (schräg, Seite) und offen
// (50 %, 100 %), dazu die Maße. Aufruf über run-check.sh (eigener Vite auf 5192, nie 5180):
//   apps/editor/scripts/pruefen/run-check.sh apps/editor/scripts/pruefen/reihe-boegen.mjs
//   REIHE=<json-Datei in pruefen-ausgabe> JE=<Fälle je Klasse> NAME=<Präfix> KLASSEN=hoch,winkel,…
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const AUSGABE = resolve(WURZEL, 'apps/editor/pruefen-ausgabe');
const REIHE = process.env.REIHE ?? 'zufallsreihe-20261015-200.json';
const JE = Number(process.env.JE ?? 6);
const NAME = process.env.NAME ?? 'ausgangslage';
const reihe = JSON.parse(readFileSync(resolve(AUSGABE, REIHE), 'utf-8'));

/** Fehlerklassen nach Florians Befunden (15.10.); ein Fall kann in mehreren Klassen stehen. */
const KLASSEN = {
  einfach: { titel: 'Einfache Mäuler (gerade Linie vorn, Kiefer gleich)', passt: (f) => f.form === 'gerade' && f.kiefer === 'gleich' && (f.anfang === 'mittel' || f.anfang === 'tief') },
  hoch: { titel: 'Hohes Maul (Anfang hoch über der Mitte)', passt: (f) => f.anfang === 'hoch' },
  winkel: { titel: 'Mundwinkel in jeder Form (J, S, senkrechtes Ende)', passt: (f) => f.form === 'j' || f.form === 's' || f.form === 'senkrecht' },
  lage: { titel: 'Maul an anderer Stelle (unter dem Kinn, seitlich, am Hals)', passt: (f) => f.anfang === 'kinn' || f.anfang === 'seitlich' || f.anfang === 'hals' },
  kiefer: { titel: 'Kiefer getrennt: Über- und Unterbiss', passt: (f) => f.kiefer !== 'gleich' },
  bearbeitung: { titel: 'Körper nach dem Maul geändert (Schädel, Kinn, Schnauze, Pinsel)', passt: (f) => f.bearbeitung !== 'keine' && f.bearbeitung !== 'anfang' && f.bearbeitung !== 'mundwinkel' },
  vorlagen: { titel: 'Florians Wesen (Rex, Tiger-Kasten, Langhals, Drache, Robbe)', passt: (f) => ['rex', 'kasten', 'langhals', 'drache', 'robbe'].includes(f.koerper) },
};
const gewaehlt = process.env.KLASSEN?.split(',') ?? Object.keys(KLASSEN);

const f1 = (x) => (x === null || x === undefined ? '–' : Number.isFinite(x) ? x.toFixed(1) : '∞');
function masszeile(e) {
  const m = e.masse;
  if (!m) return e.fehler ?? '';
  const lu = m.lippe.unten;
  const paare = m.paare.map((p) => `${Math.round(p.oeffnung * 100)}%:${p.haut}`).join(' ');
  const kiefer = m.kiefer ? ` · Kiefer rot→unten ${f1(m.kiefer.rotZiehtUnten)} blau→oben ${f1(m.kiefer.blauZiehtOben)} px` : '';
  return `Schwere ${f1(e.schwere)} · Formtreue fern ${f1(m.formtreue.fern.max)} nah ${f1(m.formtreue.nah.max)} px · Δ mit ${f1(m.delta.mit.seite)}/${f1(m.delta.mit.front)}/${f1(m.delta.mit.top)} ohne ${f1(m.delta.ohne.seite)}/${f1(m.delta.ohne.front)}/${f1(m.delta.ohne.top)} · Lippe rot ${f1(Math.max(m.lippe.oben.seite, m.lippe.oben.front, m.lippe.oben.top))}${lu ? ` blau ${f1(Math.max(lu.seite, lu.front, lu.top))}` : ''} px · Faltenzuwachs ${f1(m.falten.fern.max)}/${f1(m.falten.nah.max)}° · umgeklappt ${m.umgeklappt} · Durchdringungen (Haut) ${paare}${kiefer}`;
}

const url = process.env.EDITOR_URL ?? 'http://localhost:5192';
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const page = await browser.newPage({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 200)));
await page.goto(`${url}/?bauweise=kern&look=earle&palette=blob`);
await page.waitForFunction(() => window.__editor && window.__editor.vertices() > 0, null, { timeout: 60_000 });

const datenUrl = (b) => `data:image/png;base64,${b.toString('base64')}`;
async function buehne(kam) {
  await page.evaluate((k) => window.__stores.ui.getState().setzeKamera(k), kam);
  await page.waitForTimeout(700);
  const rc = await page.evaluate(() => window.__stores.rahmen.getState().rects.creation);
  return datenUrl(await page.screenshot({ clip: { x: rc.x + rc.w * 0.1, y: rc.y + rc.h * 0.05, width: rc.w * 0.8, height: rc.h * 0.9 } }));
}
async function seitenblatt() {
  const rc = await page.evaluate(() => window.__stores.rahmen.getState().rects.seite);
  return datenUrl(await page.screenshot({ clip: { x: rc.x, y: rc.y, width: rc.w, height: rc.h } }));
}

for (const k of gewaehlt) {
  const kl = KLASSEN[k];
  if (!kl) continue;
  // Rang: Summe der Verstöße auf Log-Skala (viele schwere Fehler zuerst; die Schwere selbst ist bei 1000 gekappt)
  const rang = (e) => (e.verstoesse ? e.verstoesse.reduce((s, v) => s + Math.log10(1 + Math.min(1e6, v.schwelle > 0 ? v.wert / v.schwelle : v.wert + 1)), 0) : 1e9);
  const kandidaten = reihe.eintraege.filter((e) => e.dok && kl.passt(e.fall)).sort((a, b) => rang(b) - rang(a));
  const auswahl = kandidaten.slice(0, JE);
  const zeilen = [];
  for (const e of auswahl) {
    const mitte = e.maul ? [(e.maul.start[0] + e.maul.ecke[0]) / 2, (e.maul.start[1] + e.maul.ecke[1]) / 2, 0] : [0, 0.25, 0];
    const dist = e.maul ? Math.min(2.0, Math.max(0.6, 6 * e.maul.laenge)) : 1.4;
    // Seitenblatt im Riss (Körper-Stufe), dann Bühne
    await page.evaluate((d) => {
      const ui = window.__stores.ui.getState();
      ui.setzeOeffnung(0);
      window.__stores.editor.getState().laden(d, null);
      ui.setzeEbene('form');
      ui.maximieren(null);
    }, e.dok);
    await page.waitForTimeout(2600);
    const bilder = [await seitenblatt()];
    // Bühne in der Stufe „Haut“: keine Reifen-Perlen und kein Kieferknopf über dem Körper
    await page.evaluate(() => {
      const ui = window.__stores.ui.getState();
      ui.setzeEbene('haut');
      ui.maximieren('creation');
    });
    await page.waitForTimeout(900);
    // Kamera: Azimut 0 = von der Seite (+z), −π/2 = von vorn (Schnauze bei −x), `three/kamera.ts`
    bilder.push(await buehne({ azimut: -0.75, elevation: 0.15, distanz: dist, ziel: mitte }));
    bilder.push(await buehne({ azimut: 0, elevation: 0, distanz: dist, ziel: mitte }));
    await page.evaluate(() => window.__stores.ui.getState().setzeOeffnung(0.5));
    await page.waitForTimeout(1300);
    bilder.push(await buehne({ azimut: -0.75, elevation: 0.1, distanz: dist * 1.05, ziel: [mitte[0], mitte[1] - 0.02, 0] }));
    await page.evaluate(() => window.__stores.ui.getState().setzeOeffnung(1));
    await page.waitForTimeout(1300);
    bilder.push(await buehne({ azimut: 0, elevation: 0.05, distanz: dist * 1.1, ziel: [mitte[0], mitte[1] - 0.04, 0] }));
    await page.evaluate(() => window.__stores.ui.getState().setzeOeffnung(0));
    zeilen.push({ name: e.fall.id, mass: masszeile(e), bilder });
    console.log(k, e.fall.id);
  }
  const n = kandidaten.length;
  const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#1b2530;color:#eee;font:13px/1.35 -apple-system,Helvetica,sans-serif}
h1{font-size:18px;margin:10px 10px 2px}.u{margin:0 10px 8px;color:#9ab}.t{padding:8px 10px 0;font-weight:600;font-family:monospace}.m{padding:2px 10px;color:#bcd;font-family:monospace;font-size:12px}
.z{display:grid;grid-template-columns:330px repeat(4,250px);gap:4px;padding:4px 10px 6px}img{width:100%;height:210px;object-fit:cover;background:#ccc}.z img:first-child{object-fit:contain;background:#e9e4d8}.l{display:grid;grid-template-columns:330px repeat(4,250px);gap:4px;padding:0 10px;color:#9ab;font-size:11px}</style>
<h1>Ausgangslage · ${kl.titel}</h1><div class="u">Heutiger Maulbau (Stand c97497b), Zufallsreihe Startwert ${reihe.start}, ${n} Fälle dieser Klasse, gezeigt die ${auswahl.length} schlechtesten. Schwellen der neuen Bauweise: Formtreue ≤ 0,25 px, Δ-Zuwachs ≤ 0,5 px, Lippe ≤ 1 px, Faltenzuwachs ≤ 2°, 0 umgeklappte Flächen, 0 Durchdringungen mit Haut beim Öffnen.</div>
<div class="l"><div>Seitenblatt (Linien, Δ)</div><div>zu, schräg</div><div>zu, Seite</div><div>offen 50 %</div><div>offen 100 %, Seite</div></div>
${zeilen.map((r) => `<div class="t">${r.name}</div><div class="m">${r.mass}</div><div class="z">${r.bilder.map((b) => `<img src="${b}">`).join('')}</div>`).join('')}`;
  const datei = resolve(AUSGABE, `${NAME}-${k}`);
  writeFileSync(`${datei}.html`, html);
  const p2 = await browser.newPage({ viewport: { width: 1380, height: 400 }, deviceScaleFactor: 1 });
  await p2.goto(`file://${datei}.html`);
  await p2.screenshot({ path: `${datei}.png`, fullPage: true });
  await p2.close();
  console.log('Bogen', `${datei}.png`);
}
await browser.close();
