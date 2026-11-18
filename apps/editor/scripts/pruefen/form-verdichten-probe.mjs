// Form zuerst (05.11.2026), das Netz verdichtet sich selbst (`kurven.html`), mit der Maus: einen Kopf herausziehen wie in Florians
// Bild. Ein Ring quer vorn (L in der Seite), dann den Ring als Ganzes weit nach vorn oben ziehen, danach noch einmal weiter.
// Gemessen je Zug: Punkte, längste Kante gegen die Grenze, Zeit des Verdichtens, umgeklappte Dreiecke; Bilder Seite und 3D, mit
// und ohne Verdichten (`?verdichten=0`).
// Aufruf aus apps/editor: node scripts/pruefen/form-verdichten-probe.mjs <ordner>
import { chromium } from '@playwright/test';

const ordner = process.argv[2] ?? '.';
const basis = process.env.KURVEN_URL ?? 'http://localhost:5193/kurven.html';
const browser = await chromium.launch();
const seite = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });
const fehler = [];
seite.on('console', (m) => {
  if (m.type() === 'error') fehler.push(m.text());
});
seite.on('pageerror', (e) => fehler.push(String(e)));
const K = (f, ...a) => seite.evaluate(([f2, a2]) => window.__kurven[f2](...a2), [f, a]);
const bild = (a, p) => K('bild', a, p);
const xy = (p) => [p.x, p.y];
const ziehen = async ([x, y], [x2, y2], schritte = 20) => {
  await seite.mouse.move(x, y);
  await seite.mouse.down();
  for (let i = 1; i <= schritte; i++) {
    await seite.mouse.move(x + ((x2 - x) * i) / schritte, y + ((y2 - y) * i) / schritte);
    await seite.waitForTimeout(15);
  }
  await seite.mouse.up();
  await seite.waitForTimeout(300);
};
const laengsteKante = () =>
  seite.evaluate(() => {
    const p = window.__kurven.lagen();
    const t = window.__kurven.dreiecke();
    let m = 0;
    for (let i = 0; i < t.length; i += 3)
      for (let e = 0; e < 3; e++) {
        const a = t[i + e];
        const b = t[i + ((e + 1) % 3)];
        m = Math.max(m, Math.hypot(p[3 * a] - p[3 * b], p[3 * a + 1] - p[3 * b + 1], p[3 * a + 2] - p[3 * b + 2]));
      }
    return m;
  });
const umgeklappt = (vorherLagen, vorherTri) =>
  seite.evaluate(
    ([v, tv]) => {
      // nur zählen, solange sich die Dreiecke nicht geändert haben (vor dem Verdichten); sonst die Lagen vorher nicht vergleichbar
      const p = window.__kurven.lagen();
      const t = window.__kurven.dreiecke();
      if (t.length !== tv.length) return null;
      const n = (q, a, b, c) => {
        const ab = [q[3 * b] - q[3 * a], q[3 * b + 1] - q[3 * a + 1], q[3 * b + 2] - q[3 * a + 2]];
        const ac = [q[3 * c] - q[3 * a], q[3 * c + 1] - q[3 * a + 1], q[3 * c + 2] - q[3 * a + 2]];
        return [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
      };
      let z = 0;
      for (let i = 0; i < t.length; i += 3) {
        const a = n(v, t[i], t[i + 1], t[i + 2]);
        const b = n(p, t[i], t[i + 1], t[i + 2]);
        if (a[0] * b[0] + a[1] * b[1] + a[2] * b[2] < 0) z++;
      }
      return z;
    },
    [vorherLagen, vorherTri],
  );

/** Dreiecke, deren Normale gegen die mittlere Normale ihrer Ecken zeigt (umgeschlagen), samt Lage des schlimmsten */
const umgeschlagen = () =>
  seite.evaluate(() => {
    const p = window.__kurven.lagen();
    const t = window.__kurven.dreiecke();
    const n = p.length / 3;
    const vn = new Float64Array(3 * n);
    const fn = [];
    for (let i = 0; i < t.length; i += 3) {
      const [a, b, c] = [t[i], t[i + 1], t[i + 2]];
      const ab = [p[3 * b] - p[3 * a], p[3 * b + 1] - p[3 * a + 1], p[3 * b + 2] - p[3 * a + 2]];
      const ac = [p[3 * c] - p[3 * a], p[3 * c + 1] - p[3 * a + 1], p[3 * c + 2] - p[3 * a + 2]];
      const f = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
      fn.push(f);
      for (const v of [a, b, c]) for (let k = 0; k < 3; k++) vn[3 * v + k] += f[k];
    }
    let z = 0;
    const orte = [];
    for (let i = 0; i < t.length; i += 3) {
      const f = fn[i / 3];
      const lf = Math.hypot(...f) || 1;
      let m = [0, 0, 0];
      for (const v of [t[i], t[i + 1], t[i + 2]]) for (let k = 0; k < 3; k++) m[k] += vn[3 * v + k];
      const lm = Math.hypot(...m) || 1;
      if ((f[0] * m[0] + f[1] * m[1] + f[2] * m[2]) / (lf * lm) < 0) {
        z++;
        orte.push([0, 1, 2].map((k) => Math.round((p[3 * t[i] + k] + p[3 * t[i + 1] + k] + p[3 * t[i + 2] + k]) / 3)));
      }
    }
    return { zahl: z, orte: orte.slice(0, 6) };
  });

for (const [name, url] of [
  ['verdichtet', basis],
  ['fest', `${basis}?verdichten=0`],
]) {
  await seite.goto(url);
  await seite.waitForFunction(() => window.__kurven !== undefined);
  await seite.waitForTimeout(400);
  await seite.keyboard.press('l');
  await ziehen(xy(await bild('seite', { x: -80, y: 200, z: 0 })), xy(await bild('seite', { x: -80, y: -200, z: 0 })), 6);
  await seite.keyboard.press('Escape');
  const ring = (await K('loops')).at(-1);
  const aufRing = { x: ring.ruhe[3 * 8], y: ring.ruhe[3 * 8 + 1], z: ring.ruhe[3 * 8 + 2] };
  const zeilen = [];
  let ziel = { ...aufRing };
  for (const [dx, dy] of [
    [-160, 70],
    [-120, 50],
  ]) {
    const l0 = await K('lagen');
    const t0 = await K('dreiecke');
    ziel = { ...ziel, x: ziel.x + dx, y: ziel.y + dy };
    const von = (await K('loops')).find((l) => l.id === ring.id);
    const start = { x: von.ruhe[3 * 8], y: von.ruhe[3 * 8 + 1], z: von.ruhe[3 * 8 + 2] };
    await ziehen(xy(await bild('seite', start)), xy(await bild('seite', { ...start, x: start.x + dx, y: start.y + dy })));
    const z = await K('zeiten');
    zeilen.push(
      `Zug ${dx}/${dy}: Punkte ${z.punkte}, längste Kante ${(await laengsteKante()).toFixed(1)}, verdichtet ${z.verdichtung ? `+${z.verdichtung.neu} in ${z.verdichtung.ms} ms` : '—'} (Stufen bisher ${z.stufen}, letzte ${z.stufeMs} ms), ` +
        `je Mausbewegung ${(z.zug.slice(-10).reduce((s, v) => s + v, 0) / 10).toFixed(1)} ms, umgeklappt ${(await umgeklappt(l0, t0)) ?? 'n. v. (neu verdichtet)'}, ` +
        `umgeschlagen ${JSON.stringify(await umgeschlagen())}`,
    );
  }
  console.log(`${name}: ${zeilen.join(' · ')} · Maße ${JSON.stringify(await K('masse'))} · schief ${(await K('symmetrie')).toExponential(1)}`);
  await K('ausschnitt', 'seite', { cx: -260, cy: -90, zoom: 1.3 });
  const fs = (await K('felder')).seite;
  await seite.screenshot({ path: `${ordner}/form-verdichten-${name}-seite-2026-11-05.jpg`, type: 'jpeg', quality: 88, clip: { x: fs.x, y: fs.y, width: fs.w, height: fs.h } });
  await K('kamera', { x: -560, y: 330, z: 520 }, { x: -330, y: 110, z: 0 });
  await seite.waitForTimeout(250);
  const f3 = (await K('felder')).drei;
  await seite.screenshot({ path: `${ordner}/form-verdichten-${name}-3d-2026-11-05.jpg`, type: 'jpeg', quality: 88, clip: { x: f3.x, y: f3.y, width: f3.w, height: f3.h } });
  // ⌘Z zweimal: zurück zum Ring
  await seite.keyboard.press('Meta+z');
  await seite.keyboard.press('Meta+z');
  await seite.waitForTimeout(200);
  console.log(`  ⌘Z ×2: Punkte ${(await K('zeiten')).punkte}, Maße ${JSON.stringify(await K('masse'))}`);
}
console.log('Fehler im Fenster:', fehler.length ? fehler : 'keine');
await browser.close();
