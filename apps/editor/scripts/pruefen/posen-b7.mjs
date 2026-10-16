// B7 (Plan Teil B, Entwurf Posen §5/§6): Tafel „Posen & Leben“, Vorschau, Fächer, Undo mit Zielwechsel — mit echten
// Klicks, Reglern und Pinselstrichen auf Rex (Überbiss) und Kugel (ohne Maul). Je Schritt eine Prüfung; Bilder der Tafel
// und der Bühne. Über run-check.sh (eigener Vite auf 5192).
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
  let v = await version();
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(250);
    const w = await version();
    if (w === v) break;
    v = w;
  }
};
const hash = () => page.evaluate(() => window.__editor.netzHash());
const lagen = () => page.evaluate(() => Array.from(window.__editor.netzLagen()));
const rechteck = (feld) => page.evaluate((f) => window.__stores.rahmen.getState().rects[f], feld);
const zustand = () =>
  page.evaluate(() => {
    const ed = window.__stores.editor.getState();
    const ui = window.__stores.ui.getState();
    return { modus: ed.modus, vorschau: ui.vorschau, oeffnung: ui.oeffnung, staerke: ui.poseStaerke, posen: JSON.parse(JSON.stringify(ed.dok.posen)), deltas: ed.dok.kaefig?.deltas?.length ?? 0, verlauf: ed.verlauf.length, hinweis: ui.hinweis?.text ?? null };
  });
const ui = (f, ...a) => page.evaluate(([fn, args]) => window.__stores.ui.getState()[fn](...args), [f, a]);
/** React-Regler über den nativen Setter (Playwright-Falle, apps/editor/CLAUDE.md) */
const regler = async (sel, wert) => {
  const v0 = await version();
  await page.$eval(
    sel,
    (el, w) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(w));
      el.dispatchEvent(new Event('input', { bubbles: true }));
    },
    wert,
  );
  await warteBau(v0);
};
const klick = async (sel) => {
  const v0 = await version();
  await page.click(sel);
  await warteBau(v0);
};
const zug = async (von, dx, dy) => {
  await page.mouse.move(von.x, von.y);
  await page.waitForTimeout(100);
  const v0 = await version();
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) {
    await page.mouse.move(von.x + (dx * i) / 10, von.y + (dy * i) / 10);
    await page.waitForTimeout(40);
  }
  await page.mouse.up();
  await warteBau(v0);
};
const aufKoerper = async (x, y) => {
  const rc = await rechteck('creation');
  for (let r = 0; r <= 160; r += 12)
    for (let k = 0; k < Math.max(1, Math.round(r / 6)); k++) {
      const a = (2 * Math.PI * k) / Math.max(1, Math.round(r / 6));
      const px = x + r * Math.cos(a);
      const py = y + r * Math.sin(a);
      const t = await page.evaluate(([qx, qy]) => window.__editor.treffen(qx, qy), [px - rc.x, py - rc.y]);
      if (t) return { x: px, y: py };
    }
  return null;
};
const bilder = [];
const bild = async (name, feld) => {
  const rc = feld === 'tafel' ? await page.evaluate(() => { const r = document.querySelector('.leiste').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: Math.min(r.height, 900) }; }) : await rechteck(feld);
  const b = await page.screenshot({ clip: { x: rc.x, y: rc.y, width: rc.w, height: rc.h } });
  bilder.push({ name, src: `data:image/png;base64,${b.toString('base64')}` });
};
const laden = async (wesen) => {
  await ui('libraryUmschalten', true);
  await page.waitForTimeout(300);
  const v0 = await version();
  await page.click(`[data-pruefwesen="${wesen}"]`);
  const verwerfen = page.getByRole('button', { name: 'Verwerfen' });
  if (await verwerfen.isVisible({ timeout: 800 }).catch(() => false)) await verwerfen.click();
  await warteBau(v0);
};
const abstandMax = (a, b) => {
  if (a.length !== b.length) return Infinity;
  let m = 0;
  for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i] - b[i]));
  return m;
};

// ——— Rex: Posenliste, Vorschau, Fächer, Undo ———
await laden('rex');
await ui('setzeEbene', 'posen');
await page.waitForTimeout(600);
let s = await zustand();
pruefe('Tafel: Posenliste mit Grundform, Idle, Fressen', (await page.$$('[data-pose-zeile]')).length === 1 + s.posen.length && !!(await page.$('[data-pose-regler="fressen"]')), `${(await page.$$('[data-pose-zeile]')).length} Zeilen`);
pruefe('Bühne: Chip „✎ Grundform“ in Posen & Leben', (await page.textContent('[data-ziel-chip="editor"]'))?.includes('Grundform') ?? false);
const hGrund = await hash();
const lGrund = await lagen();

// Vorschau Fressen 50 % im Editor-Tab
await regler('[data-pose-regler="fressen"]', 0.5);
s = await zustand();
pruefe('Regler Fressen 50 %: Vorschau, Ziel bleibt Editor', s.modus === 'editor' && s.vorschau?.fressen === 0.5, JSON.stringify(s.vorschau));
pruefe('Vorschau ist zu sehen (Netz anders als die Grundform)', (await hash()) !== hGrund);
pruefe('Chip „Vorschau · Fressen 50 %“', ((await page.textContent('[data-vorschau-chip]')) ?? '').includes('Fressen 50 %'), (await page.textContent('[data-vorschau-chip]')) ?? 'fehlt');
pruefe('Vorschau ändert das Dokument nicht (kein Undo-Schritt)', s.verlauf === 0, `${s.verlauf} Schritte`);
await bild('Rex: Vorschau Fressen 50 % im Editor-Tab', 'creation');
// zweite Pose dazu
await regler('[data-pose-regler="idle"]', 0.3);
s = await zustand();
pruefe('Zwei Posen zugleich in der Vorschau', s.vorschau?.fressen === 0.5 && s.vorschau?.idle === 0.3, JSON.stringify(s.vorschau));
// Esc beendet
let v0 = await version();
await page.mouse.move(900, 500);
await page.keyboard.press('Escape');
await warteBau(v0);
s = await zustand();
pruefe('Esc beendet die Vorschau, Grundform bitgleich (R0)', s.vorschau === null && (await hash()) === hGrund, `vorschau ${JSON.stringify(s.vorschau)}`);
// × auf der Bühne
await regler('[data-pose-regler="fressen"]', 0.7);
await klick('[data-vorschau-aus]');
s = await zustand();
pruefe('× auf der Bühne beendet die Vorschau', s.vorschau === null && (await hash()) === hGrund);
// Stufenwechsel beendet
await regler('[data-pose-regler="fressen"]', 0.6);
v0 = await version();
await ui('setzeEbene', 'form');
await warteBau(v0);
s = await zustand();
pruefe('Stufenwechsel beendet die Vorschau', s.vorschau === null && (await hash()) === hGrund);

// Pinsel während einer Vorschau: der erste Druck beendet nur die Vorschau, der zweite formt
await ui('maximieren', 'creation');
await ui('setzeWerkzeug', 'ziehen');
await page.waitForTimeout(500);
v0 = await version();
await ui('setzeVorschau', { fressen: 0.5 });
await warteBau(v0);
let rc = await rechteck('creation');
let p = await aufKoerper(rc.x + rc.w * 0.5, rc.y + rc.h * 0.45);
const d0 = (await zustand()).deltas;
await zug(p, 0, -30);
s = await zustand();
pruefe('Pinsel während der Vorschau: erster Strich beendet nur die Vorschau', s.vorschau === null && s.deltas === d0 && (s.hinweis ?? '').includes('Vorschau beendet'), `Deltas ${d0} → ${s.deltas}, Hinweis „${s.hinweis}“`);
p = await aufKoerper(rc.x + rc.w * 0.5, rc.y + rc.h * 0.45);
await zug(p, 0, -30);
s = await zustand();
pruefe('… zweiter Strich formt die Grundform', s.deltas > d0, `Deltas ${d0} → ${s.deltas}`);
const hGrund2 = await hash();
const lGrund2 = await lagen();

// Undo mit Zielwechsel: Strich in Fressen, dann Editor-Tab, ⌘Z
v0 = await version();
await page.click('[data-tab="fressen"]');
await warteBau(v0);
p = await aufKoerper(rc.x + rc.w * 0.5, rc.y + rc.h * 0.45);
const formVor = (await zustand()).posen.find((q) => q.id === 'fressen').form.length;
await zug(p, 0, -25);
s = await zustand();
const formNach = s.posen.find((q) => q.id === 'fressen').form.length;
pruefe('Strich in Fressen formt die Pose', formNach > formVor, `${formVor} → ${formNach}`);
pruefe('Bühne: Chip „✎ Fressen“ und Rahmen in Posenfarbe', ((await page.textContent('[data-ziel-chip="fressen"]')) ?? '').includes('Fressen') && !!(await page.$('.vp-ober.pose-ziel[data-view="creation"]')));
v0 = await version();
await page.click('[data-tab="editor"]');
await warteBau(v0);
pruefe('Editor-Tab: Grundform bitgleich nach dem Strich in Fressen', (await hash()) === hGrund2);
v0 = await version();
await page.keyboard.press('Meta+z');
await warteBau(v0);
s = await zustand();
pruefe('⌘Z im Editor-Tab wechselt nach Fressen und nimmt den Strich zurück', s.modus === 'fressen' && s.posen.find((q) => q.id === 'fressen').form.length === formVor, `Ziel ${s.modus}, Form ${s.posen.find((q) => q.id === 'fressen').form.length}`);
pruefe('Hinweis „↶ Fressen: Form“', (s.hinweis ?? '') === '↶ Fressen: Form', s.hinweis ?? 'kein Hinweis');
v0 = await version();
await page.keyboard.press('Meta+Shift+z');
await warteBau(v0);
s = await zustand();
pruefe('⇧⌘Z stellt den Strich wieder her (in Fressen)', s.modus === 'fressen' && s.posen.find((q) => q.id === 'fressen').form.length === formNach, `Ziel ${s.modus}`);
await ui('setzeWerkzeug', 'auswahl');

// Posen & Leben in Fressen: Knochen- und Form-Abschnitt
await ui('setzeEbene', 'posen');
await page.waitForTimeout(500);
pruefe('Tafel in Fressen: Abschnitte Knochen und Form', !!(await page.$('[data-abschnitt="knochen"]')) && !!(await page.$('[data-abschnitt="form"]')) && !!(await page.$('[data-knochen-unten]')));
await bild('Rex: Tafel Posen & Leben in Fressen', 'tafel');
const lFressen = await lagen();

// Fächer: Duplizieren
await page.click('[data-pose-menue="fressen"]');
await page.waitForTimeout(200);
v0 = await version();
await page.locator('.kontextmenue').getByRole('button', { name: 'Duplizieren' }).click();
await warteBau(v0);
s = await zustand();
const kopie = s.posen.find((q) => q.name === 'Fressen Kopie');
pruefe('Duplizieren: neue freie Pose „Fressen Kopie“ mit Stellung und Haps, Ziel = Kopie', !!kopie && kopie.art === 'frei' && !!kopie.stellung && kopie.saat?.haps !== undefined && s.modus === kopie?.id, kopie ? `${kopie.id}, Form ${kopie.form.length}` : 'fehlt');
const lKopie = await lagen();
pruefe('Kopie zeigt dieselbe Form wie Fressen (≤ 1e-6)', abstandMax(lKopie, lFressen) <= 1e-6, abstandMax(lKopie, lFressen).toExponential(2));
// Umbenennen
await page.click(`[data-pose-menue="${kopie.id}"]`);
await page.waitForTimeout(200);
await page.locator('.kontextmenue').getByRole('button', { name: 'Umbenennen …' }).click();
await page.waitForTimeout(200);
await page.fill('.dialog input', 'Brüllen').catch(async () => {
  await page.keyboard.press('Meta+a');
  await page.keyboard.type('Brüllen');
});
await page.getByRole('button', { name: 'Umbenennen', exact: true }).click();
await page.waitForTimeout(300);
s = await zustand();
pruefe('Umbenennen: „Brüllen“ in Liste und Kopfzeile', s.posen.find((q) => q.id === kopie.id)?.name === 'Brüllen' && ((await page.textContent(`[data-tab="${kopie.id}"]`)) ?? '').includes('Brüllen'));
// Spiel-Pose
await page.click(`[data-pose-menue="${kopie.id}"]`);
await page.waitForTimeout(200);
await page.locator('.kontextmenue').getByRole('button', { name: 'Als Spiel-Pose markieren' }).click();
await page.waitForTimeout(300);
s = await zustand();
pruefe('Spiel-Pose markiert (★ in der Kopfzeile)', s.posen.find((q) => q.id === kopie.id)?.spiel === true && ((await page.textContent(`[data-tab="${kopie.id}"]`)) ?? '').includes('★'));
// Rechtsklick auf die Pille: derselbe Fächer, Knochen zurücksetzen
await page.click(`[data-tab="${kopie.id}"]`, { button: 'right' });
await page.waitForTimeout(200);
v0 = await version();
await page.locator('.kontextmenue').getByRole('button', { name: 'Knochen zurücksetzen' }).click();
await warteBau(v0);
s = await zustand();
const k2 = s.posen.find((q) => q.id === kopie.id);
pruefe('Rechtsklick auf die Pille → Knochen zurücksetzen (Stellung und Haps weg)', !k2.stellung && !k2.saat);
pruefe('… die Form der Pose bleibt dabei', k2.form.length === kopie.form.length, `${k2.form.length} Käfigpunkte`);
await page.click(`[data-pose-menue="${kopie.id}"]`);
await page.waitForTimeout(200);
v0 = await version();
await page.locator('.kontextmenue').getByRole('button', { name: 'Alles zurücksetzen' }).click();
await warteBau(v0);
s = await zustand();
const k3 = s.posen.find((q) => q.id === kopie.id);
pruefe('Alles zurücksetzen: ohne Knochen und Form zeigt die Pose die Grundform (≤ 1e-6, Float32)', !k3.form.length && !k3.stellung && abstandMax(await lagen(), lGrund2) <= 1e-6, abstandMax(await lagen(), lGrund2).toExponential(2));
// Löschen und Undo
await page.click(`[data-pose-menue="${kopie.id}"]`);
await page.waitForTimeout(200);
v0 = await version();
await page.locator('.kontextmenue').getByRole('button', { name: 'Löschen', exact: true }).click();
await warteBau(v0);
s = await zustand();
pruefe('Löschen: Pose weg, Ziel = Editor', !s.posen.some((q) => q.id === kopie.id) && s.modus === 'editor');
v0 = await version();
await page.keyboard.press('Meta+z');
await warteBau(v0);
s = await zustand();
pruefe('Undo: gelöschte Pose wieder da, Ziel = sie', s.posen.some((q) => q.id === kopie.id) && s.modus === kopie.id, `Ziel ${s.modus}, Hinweis „${s.hinweis}“`);
// Q / ⇧Q
const reihe = ['editor', ...s.posen.map((q) => q.id)];
v0 = await version();
await page.mouse.move(900, 500);
await page.keyboard.press('q');
await warteBau(v0);
let s2 = await zustand();
pruefe('Q: nächste Pose', s2.modus === reihe[(reihe.indexOf(s.modus) + 1) % reihe.length], `${s.modus} → ${s2.modus}`);
v0 = await version();
await page.keyboard.press('Shift+q');
await warteBau(v0);
s2 = await zustand();
pruefe('⇧Q: zurück', s2.modus === s.modus, s2.modus);
// Neue Pose ▾ Kopie von …
v0 = await version();
await page.click('[data-neue-pose]');
await page.click('[data-neue-pose-art="kopie"]');
await warteBau(v0);
s2 = await zustand();
pruefe('Neue Pose ▾ „Kopie von Brüllen“', s2.posen.some((q) => q.name === 'Brüllen Kopie') && s2.modus !== s.modus);

// ——— Kugel (ohne Maul): Vorschau einer geformten Idle-Pose ———
await laden('kugel');
v0 = await version();
await page.click('[data-tab="idle"]');
await warteBau(v0);
await ui('setzeEbene', 'form');
await ui('maximieren', 'creation');
await ui('setzeWerkzeug', 'aufblasen');
await page.waitForTimeout(500);
rc = await rechteck('creation');
p = await aufKoerper(rc.x + rc.w * 0.55, rc.y + rc.h * 0.5);
await zug(p, 20, -20);
await ui('setzeWerkzeug', 'auswahl');
s = await zustand();
pruefe('Kugel: Idle geformt (ohne Maul)', s.posen.find((q) => q.id === 'idle').form.length > 0);
const lIdle = await lagen();
v0 = await version();
await page.click('[data-tab="editor"]');
await warteBau(v0);
const lKugel = await lagen();
await ui('setzeEbene', 'posen');
await page.waitForTimeout(400);
await regler('[data-pose-regler="idle"]', 0.5);
const lHalb = await lagen();
// ohne Knochen ist die Mischung linear: halb = Mitte von Grundform und Idle
let mitte = 0;
for (let i = 0; i < lHalb.length; i++) mitte = Math.max(mitte, Math.abs(lHalb[i] - 0.5 * (lKugel[i] + lIdle[i])));
pruefe('Kugel: Vorschau Idle 50 % = Mitte von Grundform und Idle (ohne Knochen linear)', mitte < 1e-6, mitte.toExponential(2));
pruefe('Kugel: Knochen-Abschnitt fehlt im Editor-Tab', !(await page.$('[data-abschnitt="knochen"]')));
await bild('Kugel: Vorschau Idle 50 % in Posen & Leben', 'creation');

console.log(`\n${ok} bestanden, ${nein} nicht bestanden`);
if (fehler.length) console.log('Fehler im Browser:', fehler.slice(0, 6));
const html = `<!doctype html><meta charset="utf-8"><body style="margin:10px;font:13px -apple-system,Helvetica,sans-serif;background:#f4efe6"><h3>B7 — Posen &amp; Leben, Vorschau, Fächer, Undo mit Ziel · Abnahme offen</h3><div style="display:flex;flex-wrap:wrap;gap:8px">${bilder.map((b) => `<figure style="margin:0"><img src="${b.src}" style="height:420px"><figcaption>${b.name}</figcaption></figure>`).join('')}</div></body>`;
writeFileSync(resolve(AUSGABE, 'posen-b7.html'), html);
await browser.close();
process.exit(nein ? 1 : 0);
