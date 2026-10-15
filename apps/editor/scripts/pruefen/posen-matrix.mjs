// B6 (Plan Teil B): Matrix „jedes Werkzeug × jede Pose“ mit echten Zügen. Kugel (ohne Maul), Rex (Überbiss), Tiger
// (Plattenmaul) × Idle, Fressen, eine neue freie Pose × Pinsel (G), Aufblasen (I), schwarze Linie in Seite, Front und Top,
// Rot/Blau der Pose, Knochen. Je Zelle:
// - die Bearbeitung landet in dieser Pose (ihre Daten ändern sich, das Bild ändert sich);
// - andere Posen und die Grundform (Profile, Pinsel-Deltas) bleiben gleich;
// - Undo stellt Pose und Bild exakt wieder her.
// Am Ende je Körper: Editor-Tab bitgleich. Lippen und Knochen nur, wo es ein Maul gibt.
// Über run-check.sh (eigener Vite auf 5192). Ausgabe: Tabelle in der Konsole und apps/editor/pruefen-ausgabe/posen-matrix.json.
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
const rechteck = (feld) => page.evaluate((f) => window.__stores.rahmen.getState().rects[f], feld);
const posen = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__stores.editor.getState().dok.posen)));
const grundform = () => page.evaluate(() => {
  const d = window.__stores.editor.getState().dok;
  return JSON.stringify({ profile: d.profile, deltas: d.kaefig?.deltas ?? [], maul: d.maul ?? null, spanten: d.spanten ?? null });
});
const zug = async (von, dx, dy, schritte = 10) => {
  await page.mouse.move(von.x, von.y);
  await page.waitForTimeout(100);
  const v0 = await version();
  await page.mouse.down();
  for (let i = 1; i <= schritte; i++) {
    await page.mouse.move(von.x + (dx * i) / schritte, von.y + (dy * i) / schritte);
    await page.waitForTimeout(40);
  }
  await page.mouse.up();
  await warteBau(v0);
};
const ui = (f, ...a) => page.evaluate(([f, a]) => window.__stores.ui.getState()[f]?.(...a), [f, a]);
const tab = async (id) => {
  const v0 = await version();
  await page.click(`[data-tab="${id}"]`);
  await warteBau(v0);
};
const imRechteck = (rc, k) => k.x >= rc.x && k.x <= rc.x + rc.w && k.y >= rc.y && k.y <= rc.y + rc.h;
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

// Werkzeuge: Vorbereiten + Zug; liefern false, wenn nichts zu greifen war
const werkzeuge = {
  async pinsel() {
    await ui('setzeEbene', 'form');
    await ui('maximieren', 'creation');
    await ui('setzeWerkzeug', 'ziehen');
    await page.waitForTimeout(500);
    const rc = await rechteck('creation');
    const p = await aufKoerper(rc.x + rc.w * 0.5, rc.y + rc.h * 0.45);
    if (!p) return false;
    await zug(p, 0, -30);
    return true;
  },
  async aufblasen() {
    await ui('setzeEbene', 'form');
    await ui('maximieren', 'creation');
    await ui('setzeWerkzeug', 'aufblasen');
    await page.waitForTimeout(500);
    const rc = await rechteck('creation');
    const p = await aufKoerper(rc.x + rc.w * 0.55, rc.y + rc.h * 0.5);
    if (!p) return false;
    // Aufblasen rechnet „nach rechts minus nach unten“ (pinsel.ts): nach rechts oben = nach außen
    await zug(p, 20, -20);
    return true;
  },
  ...Object.fromEntries(
    ['seite', 'front', 'top'].map((feld) => [
      `linie-${feld}`,
      async () => {
        await ui('setzeEbene', 'form');
        await ui('maximieren', null);
        await ui('setzeWerkzeug', 'auswahl');
        await page.waitForTimeout(700);
        const rc = await rechteck(feld);
        const alle = await page.$$eval('[data-pose-knoten] .knoten-punkt', (els) => els.map((e) => {
          const r = e.getBoundingClientRect();
          return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
        }));
        const k0 = alle.filter((k) => imRechteck(rc, k));
        if (k0.length < 2) return false;
        const m = { x: k0.reduce((s, k) => s + k.x, 0) / k0.length, y: k0.reduce((s, k) => s + k.y, 0) / k0.length };
        const innen = k0.filter((k) => {
          const l = Math.hypot(k.x - m.x, k.y - m.y) || 1;
          const z = { x: k.x + (20 * (k.x - m.x)) / l, y: k.y + (20 * (k.y - m.y)) / l };
          return z.x > rc.x + 30 && z.x < rc.x + rc.w - 30 && z.y > rc.y + 30 && z.y < rc.y + rc.h - 30;
        });
        const w = innen.length ? innen : k0;
        const a = w.reduce((p, q) => (Math.hypot(q.x - m.x, q.y - m.y) > Math.hypot(p.x - m.x, p.y - m.y) ? q : p), w[0]);
        const l = Math.hypot(a.x - m.x, a.y - m.y) || 1;
        await zug(a, (20 * (a.x - m.x)) / l, (20 * (a.y - m.y)) / l);
        return true;
      },
    ]),
  ),
  async lippe() {
    await ui('setzeEbene', 'maul');
    await ui('maximieren', null);
    await ui('setzeWerkzeug', 'auswahl');
    await page.waitForTimeout(700);
    const rc = await rechteck('seite');
    const alle = await page.$$eval('[data-pose-maulknoten] .maul-punkt', (els) => els.map((e) => {
      const r = e.getBoundingClientRect();
      return { id: e.parentElement.getAttribute('data-pose-maulknoten'), x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }));
    const k = alle.filter((q) => imRechteck(rc, q));
    if (!k.length) return false;
    // ein innerer Knoten (nicht Anfang, nicht Mundwinkel), sonst der erste
    const innen = k.filter((q) => !q.id.endsWith(':0'));
    const ziel = innen[Math.floor(innen.length / 2)] ?? k[0];
    await zug(ziel, 0, 15);
    return true;
  },
  async knochen() {
    await ui('setzeEbene', 'posen');
    await ui('maximieren', 'creation');
    await ui('setzeWerkzeug', 'auswahl');
    await page.waitForTimeout(700);
    const rc = await rechteck('creation');
    const g = await page.evaluate(() => window.__editor.knochen?.() ?? []);
    const d = g.find((x) => x.art === 'kiefer-dreh') ?? g[0];
    if (!d) return false;
    await zug({ x: rc.x + d.px, y: rc.y + d.py }, 0, 30);
    return true;
  },
};

const KOERPER = ['kugel', 'rex', 'tiger'];
const POSEN = ['idle', 'fressen', 'p_matrix'];
const MIT_MAUL = new Set(['rex', 'tiger']);
const ergebnis = [];
let ok = 0;
let nein = 0;
for (const wesen of KOERPER) {
  await ui('libraryUmschalten', true);
  await page.waitForTimeout(300);
  let v0 = await version();
  await page.click(`[data-pruefwesen="${wesen}"]`);
  const verwerfen = page.getByRole('button', { name: 'Verwerfen' });
  if (await verwerfen.isVisible({ timeout: 800 }).catch(() => false)) await verwerfen.click();
  await warteBau(v0);
  await ui('setzeEbene', 'form');
  await page.waitForTimeout(500);
  const hEditor = await hash();
  const g0 = await grundform();
  // freie Pose anlegen, zurück zum Editor-Tab
  v0 = await version();
  await page.evaluate(() => window.__stores.editor.getState().poseHinzu('p_matrix', 'Matrix'));
  await warteBau(v0);
  await tab('editor');
  for (const id of POSEN) {
    await tab(id);
    for (const [name, wz] of Object.entries(werkzeuge)) {
      if ((name === 'lippe' || name === 'knochen') && !MIT_MAUL.has(wesen)) continue;
      const vorPosen = await posen();
      const hVor = await hash();
      const gegriffen = await wz();
      if (!gegriffen) {
        ergebnis.push({ wesen, pose: id, werkzeug: name, ok: false, grund: 'nichts zu greifen' });
        nein++;
        console.log(`✗ ${wesen} · ${id} · ${name}: nichts zu greifen`);
        continue;
      }
      const nachPosen = await posen();
      const hNach = await hash();
      const diese = (ps) => JSON.stringify(ps.find((p) => p.id === id) ?? null);
      const andere = (ps) => JSON.stringify(ps.filter((p) => p.id !== id));
      const inPose = diese(nachPosen) !== diese(vorPosen);
      const andereGleich = andere(nachPosen) === andere(vorPosen);
      const grundGleich = (await grundform()) === g0;
      const sichtbar = hNach !== hVor;
      v0 = await version();
      await page.evaluate(() => window.__stores.editor.getState().rueckgaengig());
      await warteBau(v0);
      const undoPose = diese(await posen()) === diese(vorPosen);
      const undoBild = (await hash()) === hVor;
      const alle = inPose && andereGleich && grundGleich && sichtbar && undoPose && undoBild;
      const fehlt = [!inPose && 'nicht in der Pose', !andereGleich && 'andere Pose geändert', !grundGleich && 'Grundform geändert', !sichtbar && 'Bild gleich', !undoPose && 'Undo Pose', !undoBild && 'Undo Bild'].filter(Boolean);
      ergebnis.push({ wesen, pose: id, werkzeug: name, ok: alle, fehlt });
      if (alle) ok++;
      else nein++;
      console.log(`${alle ? '✓' : '✗'} ${wesen} · ${id} · ${name}${fehlt.length ? ' — ' + fehlt.join(', ') : ''}`);
      // zurück in den Tab (Undo kann das Ziel wechseln)
      if ((await page.evaluate(() => window.__stores.editor.getState().modus)) !== id) await tab(id);
    }
  }
  await tab('editor');
  await ui('setzeEbene', 'form');
  await page.waitForTimeout(400);
  const bitgleich = (await hash()) === hEditor && (await grundform()) === g0;
  if (bitgleich) ok++;
  else nein++;
  console.log(`${bitgleich ? '✓' : '✗'} ${wesen}: Editor-Tab bitgleich nach der Matrix`);
}
const sauber = fehler.length === 0;
if (sauber) ok++;
else nein++;
console.log(`${sauber ? '✓' : '✗'} keine Seitenfehler${sauber ? '' : ' — ' + fehler.slice(0, 3).join(' | ')}`);
console.log(`\n${ok} ✓, ${nein} ✗`);
writeFileSync(resolve(AUSGABE, 'posen-matrix.json'), JSON.stringify({ ok, nein, ergebnis, fehler }, null, 1));
await browser.close();
process.exit(nein ? 1 : 0);
