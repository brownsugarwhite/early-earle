// B3 (Plan „Maul als Einsatz, Werkzeug-Harmonie und Posen“, Teil B): Posenliste im echten Editor mit echten Klicks und
// Zügen. Rex (Prüfwesen mit Maul) und Kugel ohne Maul:
// - Tabs Editor · Idle · Fressen; Idle ohne Form und Stellung = Grundpose (bitgleich);
// - Pinsel G in Fressen schreibt Ruhe-Deltas mit Bezugs-Käfig in die Pose; der Editor-Tab bleibt bitgleich;
// - Knochen in Idle (Unterkiefer drehen auf der Bühne) schreibt Idles Stellung; Fressen bleibt unverändert;
// - Undo nimmt den Knochenzug zurück; Laden (Kopie des Dokuments) zeigt dieselbe Pose;
// - Grundform danach mit dem Pinsel ändern: Fressen folgt (Netz neu, Form der Pose unverändert im Dokument).
// Über run-check.sh (eigener Vite auf 5192, nie Florians 5180).
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const AUSGABE = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/pruefen-ausgabe');
const url = process.env.EDITOR_URL ?? 'http://localhost:5192';
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const page = await browser.newPage({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 1 });
page.on('dialog', (d) => d.accept());
const fehler = [];
page.on('pageerror', (e) => fehler.push(String(e).slice(0, 240)));
page.on('console', (m) => {
  if (m.type() === 'error') fehler.push(m.text().slice(0, 240));
});
await page.goto(`${url}/?bauweise=kern&look=earle`);
await page.waitForFunction(() => window.__editor && window.__editor.vertices() > 0, null, { timeout: 60_000 });

let ok = 0;
let nein = 0;
const pruefe = (name, bed, info = '') => {
  if (bed) ok++;
  else nein++;
  console.log(`${bed ? '✓' : '✗'} ${name}${info ? ' — ' + info : ''}`);
};
const version = () => page.evaluate(() => window.__editor.netzVersion());
const warteBau = async (v0) => {
  await page.waitForFunction((v) => window.__editor.netzVersion() > v, v0, { timeout: 30_000 }).catch(() => {});
  // der neueste Auftrag gewinnt: kurz warten, bis keiner mehr nachkommt
  let v = await version();
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(250);
    const w = await version();
    if (w === v) break;
    v = w;
  }
};
const hash = () => page.evaluate(() => window.__editor.netzHash());
const tab = async (id) => {
  const v0 = await version();
  await page.click(`[data-tab="${id}"]`);
  await warteBau(v0);
};
const pose = (id) => page.evaluate((id) => JSON.parse(JSON.stringify(window.__stores.editor.getState().dok.posen.find((p) => p.id === id) ?? null)), id);
const rect = () => page.evaluate(() => window.__stores.rahmen.getState().rects.creation);
const griffe = async () => {
  const rc = await rect();
  const g = await page.evaluate(() => window.__editor.knochen?.() ?? []);
  return Object.fromEntries(g.map((x) => [x.art, { x: rc.x + x.px, y: rc.y + x.py }]));
};
const zug = async (von, dx, dy) => {
  await page.mouse.move(von.x, von.y);
  await page.waitForTimeout(120);
  const v0 = await version();
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) {
    await page.mouse.move(von.x + (dx * i) / 10, von.y + (dy * i) / 10);
    await page.waitForTimeout(50);
  }
  await page.mouse.up();
  await warteBau(v0);
};
// erster Punkt mit Treffer auf dem Körper in der Nähe von (x, y) (Seitenpixel), Suche in Ringen
const aufKoerper = async (x, y) => {
  const rc = await rect();
  for (let r = 0; r <= 120; r += 12)
    for (let k = 0; k < Math.max(1, Math.round(r / 6)); k++) {
      const a = (2 * Math.PI * k) / Math.max(1, Math.round(r / 6));
      const px = x + r * Math.cos(a);
      const py = y + r * Math.sin(a);
      const t = await page.evaluate(([qx, qy]) => window.__editor.treffen(qx, qy), [px - rc.x, py - rc.y]);
      if (t) return { x: px, y: py };
    }
  return null;
};
const werkzeug = async (w) => {
  await page.evaluate((w) => window.__stores.ui.getState().setzeWerkzeug?.(w), w);
  await page.waitForTimeout(150);
};
const bild = async (name) => {
  const rc = await rect();
  const b = await page.screenshot({ clip: { x: rc.x + rc.w * 0.12, y: rc.y + rc.h * 0.1, width: rc.w * 0.76, height: rc.h * 0.8 } });
  return { name, src: `data:image/png;base64,${b.toString('base64')}` };
};
const bilder = [];

// ---------- Rex ----------
await page.evaluate(() => window.__stores.ui.getState().libraryUmschalten(true));
await page.waitForTimeout(300);
const v0 = await version();
await page.click('[data-pruefwesen="rex"]');
const verwerfen = page.getByRole('button', { name: 'Verwerfen' });
if (await verwerfen.isVisible({ timeout: 800 }).catch(() => false)) await verwerfen.click();
await warteBau(v0);
await page.evaluate(() => {
  const ui = window.__stores.ui.getState();
  ui.setzeEbene('posen');
  ui.maximieren('creation');
  ui.setzeKamera({ azimut: (-25 * Math.PI) / 180, elevation: (6 * Math.PI) / 180, distanz: 1.5, ziel: [-0.12, 0.27, 0] });
});
await warteBau(await version());
const tabs = await page.evaluate(() => Array.from(document.querySelectorAll('[data-tab]')).map((e) => e.getAttribute('data-tab')));
pruefe('Tabs Editor · Idle · Fressen', tabs[0] === 'editor' && tabs.includes('idle') && tabs.includes('fressen'), tabs.join(' · '));
const hEditor = await hash();
bilder.push(await bild('Rex · Editor (Grundpose)'));
await tab('idle');
pruefe('Idle ohne Form und Stellung = Grundpose (bitgleich)', (await hash()) === hEditor);
await tab('fressen');
const hF0 = await hash();
pruefe('Fressen zeigt die Pose', hF0 !== hEditor);
bilder.push(await bild('Rex · Fressen vorher'));
// Pinsel G in Fressen: unterhalb des Kiefer-Zug-Griffs auf der Haut ziehen (Griffe fangen im Umkreis von 12 px)
await page.evaluate(() => window.__stores.ui.getState().setzeWerkzeug?.('ziehen'));
await page.waitForTimeout(200);
const g0 = await griffe();
const start = g0['kiefer-zug'] ? { x: g0['kiefer-zug'].x + 10, y: g0['kiefer-zug'].y + 34 } : null;
pruefe('Kiefergriffe auf der Bühne', !!start, Object.keys(g0).join(', '));
if (start) await zug(start, -8, 40);
const fressen1 = await pose('fressen');
const n3 = await page.evaluate(() => window.__editor.wesen?.()?.kaefigPunkte ?? null);
pruefe('Pinsel in Fressen: Ruhe-Deltas in der Pose', fressen1?.form?.length > 0, `${fressen1?.form?.length ?? 0} Punkte`);
pruefe('… mit Bezugs-Käfig, ohne Migrationsmarke', Array.isArray(fressen1?.bezug) && fressen1.bezug.length > 0 && fressen1.bezug.length % 3 === 0 && !fressen1.formAlt, `Bezug ${fressen1?.bezug?.length ?? 0} Werte${n3 ? `, Käfig ${n3}` : ''}`);
const hF1 = await hash();
pruefe('Fressen verändert', hF1 !== hF0);
bilder.push(await bild('Rex · Fressen nach Pinsel G'));
await tab('editor');
pruefe('Editor-Tab danach bitgleich die Grundpose', (await hash()) === hEditor);
// Pinsel in Idle: Idles eigene Form (danach Undo)
await tab('idle');
{
  const p = start ? await aufKoerper(start.x, start.y) : null;
  if (p) await zug(p, 10, -30);
  const idleForm = await pose('idle');
  pruefe('Pinsel in Idle schreibt Idles Form', idleForm?.form?.length > 0, `${idleForm?.form?.length ?? 0} Punkte`);
  pruefe('Fressen unverändert durch Idles Pinsel', JSON.stringify((await pose('fressen'))?.form) === JSON.stringify(fressen1?.form));
  const v = await version();
  await page.evaluate(() => window.__stores.editor.getState().rueckgaengig());
  await warteBau(v);
  pruefe('Undo nimmt Idles Pinselstrich zurück', ((await pose('idle'))?.form?.length ?? 0) === 0 && (await hash()) === hEditor);
}
// Knochen in Idle: Unterkiefer an der Spitze drehen (Auswahlwerkzeug; mit aktivem Pinsel hat der Pinsel Vorrang)
await werkzeug('auswahl');
const g1 = await griffe();
pruefe('Knochengriffe in Idle', !!g1['kiefer-dreh'], Object.keys(g1).join(', '));
const fressenVorIdle = JSON.stringify(await pose('fressen'));
if (g1['kiefer-dreh']) await zug(g1['kiefer-dreh'], 0, 45);
const idle1 = await pose('idle');
pruefe('Idle hat eigene Kieferstellung', typeof idle1?.stellung?.kiefer?.winkel === 'number' && Math.abs(idle1.stellung.kiefer.winkel) > 1, JSON.stringify(idle1?.stellung ?? null));
pruefe('Fressen unverändert durch Idles Knochen', JSON.stringify(await pose('fressen')) === fressenVorIdle);
const hIdle = await hash();
pruefe('Idle zeigt die offene Stellung', hIdle !== hEditor);
bilder.push(await bild('Rex · Idle mit eigener Kieferstellung'));
await tab('fressen');
pruefe('Fressen-Tab unverändert (Idles Knochen wirken nicht auf Fressen)', (await hash()) === hF1);
await tab('idle');
// Undo: der Knochenzug war ein Schritt
{
  const v = await version();
  await page.evaluate(() => window.__stores.editor.getState().rueckgaengig());
  await warteBau(v);
  const idle2 = await pose('idle');
  pruefe('Undo nimmt Idles Knochen zurück', !idle2?.stellung, JSON.stringify(idle2?.stellung ?? null));
  pruefe('Idle wieder = Grundpose', (await hash()) === hEditor);
}
// Laden einer Kopie: dieselbe Fressen-Pose
{
  const v = await version();
  await page.evaluate(() => {
    const d = JSON.parse(JSON.stringify(window.__stores.editor.getState().dok));
    window.__stores.editor.getState().laden(d, null);
  });
  await warteBau(v);
  pruefe('Laden startet im Editor-Tab mit der Grundpose', (await page.evaluate(() => window.__stores.editor.getState().modus)) === 'editor' && (await hash()) === hEditor);
  await page.evaluate(() => window.__stores.ui.getState().setzeEbene('posen'));
  await tab('fressen');
  pruefe('Nach dem Laden dieselbe Fressen-Pose (bitgleich)', (await hash()) === hF1);
}
// Grundform danach ändern (Pinsel im Editor-Tab am Kopf): Fressen folgt, die Form der Pose bleibt im Dokument
{
  await tab('editor');
  await page.evaluate(() => window.__stores.ui.getState().setzeEbene('form'));
  await werkzeug('ziehen');
  await page.waitForTimeout(400);
  const formVor = JSON.stringify((await pose('fressen'))?.form);
  const p = start ? await aufKoerper(start.x + 20, start.y - 60) : null;
  pruefe('Treffer am Kopf für den Grundform-Zug', !!p);
  if (p) await zug(p, 0, -40);
  const hEditor2 = await hash();
  pruefe('Grundform geändert', hEditor2 !== hEditor);
  await page.evaluate(() => window.__stores.ui.getState().setzeEbene('posen'));
  await tab('fressen');
  const hF2 = await hash();
  pruefe('Fressen folgt der Grundform (neues Netz)', hF2 !== hF1 && hF2 !== hEditor2);
  pruefe('Form der Pose im Dokument unverändert (Übertrag beim Auswerten)', JSON.stringify((await pose('fressen'))?.form) === formVor);
  bilder.push(await bild('Rex · Fressen nach Änderung der Grundform'));
}

// ---------- Kugel ohne Maul ----------
{
  const v = await version();
  await page.evaluate(() => window.__stores.editor.getState().neu());
  await warteBau(v);
  await page.evaluate(() => {
    const ui = window.__stores.ui.getState();
    ui.setzeEbene('posen');
    ui.maximieren('creation');
    ui.setzeKamera({ azimut: (-40 * Math.PI) / 180, elevation: (10 * Math.PI) / 180, distanz: 2.0, ziel: [0, 0.25, 0] });
  });
  await warteBau(await version());
  const hK = await hash();
  await tab('fressen');
  pruefe('Kugel: Fressen ohne Form = Grundpose', (await hash()) === hK);
  await page.evaluate(() => window.__stores.ui.getState().setzeWerkzeug?.('ziehen'));
  const rc = await rect();
  await zug({ x: rc.x + rc.w * 0.5, y: rc.y + rc.h * 0.45 }, 30, -40);
  const f = await pose('fressen');
  pruefe('Kugel: Pinsel in Fressen schreibt die Pose', f?.form?.length > 0 && Array.isArray(f?.bezug), `${f?.form?.length ?? 0} Punkte`);
  pruefe('Kugel: Fressen verändert', (await hash()) !== hK);
  bilder.push(await bild('Kugel · Fressen nach Pinsel G'));
  await tab('editor');
  pruefe('Kugel: Editor-Tab bitgleich', (await hash()) === hK);
}

pruefe('keine Seitenfehler', fehler.length === 0, fehler.slice(0, 3).join(' | '));
console.log(`\n${ok} ✓, ${nein} ✗`);
const html = `<html><body style="margin:0;background:#1b2229;font:13px monospace;color:#ddd"><div style="display:grid;grid-template-columns:repeat(3,560px);gap:4px;padding:4px">${bilder.map((b) => `<div><div style="padding:3px">${b.name}</div><img src="${b.src}" style="width:560px;display:block"></div>`).join('')}</div></body></html>`;
writeFileSync(resolve(AUSGABE, 'posen-b3.html'), html);
const zeige = await browser.newPage({ viewport: { width: 1700, height: 900 }, deviceScaleFactor: 1 });
await zeige.setContent(html);
await zeige.waitForTimeout(400);
await zeige.screenshot({ path: resolve(AUSGABE, 'posen-b3.png'), fullPage: true });
console.log('Bild', resolve(AUSGABE, 'posen-b3.png'));
await browser.close();
process.exit(nein ? 1 : 0);
