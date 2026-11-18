// Ozzy, S15 im Plan „wie es weitergeht“ (17.11.2026): der Lichtring, an „strange bird“ (NAME), in den Vier Ansichten.
// Kriterien:
//   1  P, ein Klick im Leeren links der Form, der Zeiger rechts im Leeren: Der Lichtring ist da.
//   2  Er folgt dem Zeiger (der Zeiger 20 px tiefer: ein anderer Ring).
//   3  Nach dem zweiten Klick steht er; nach ↩ liegt der neue Loop auf ihm (jeder Punkt höchstens 1 px daneben, im Maßstab des Raums).
//   4  Danach ist kein Lichtring mehr da.
//   5  Keine Fehler in der Konsole.
// Aufruf aus apps/editor: GPU=1 [NAME=…] node scripts/pruefen/ozzy-lichtring-fenster.mjs [ordner für Bilder]
import { chromium } from '@playwright/test';

const ordner = process.argv[2] ?? '';
const NAME = process.env.NAME ?? 'strange bird';
const basis = process.env.OZZY_URL ?? 'http://localhost:5205/ozzy.html';
const browser = await chromium.launch({ args: process.env.GPU === '1' ? ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] : [] });
const s = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const fehler = [];
s.on('pageerror', (e) => fehler.push(String(e)));
s.on('console', (m) => {
  if (m.type() === 'error') fehler.push(m.text());
});
await s.goto(`${basis}?form=${encodeURIComponent(NAME)}`);
await s.waitForFunction(() => !!window.__ozzy);
const O = (f, ...a) => s.evaluate(([f2, a2]) => window.__ozzy[f2](...a2), [f, a]);
const ruhig = async () => {
  await s.waitForTimeout(300);
  await s.waitForFunction(() => window.__ozzy.bearbeiten().an && !window.__ozzy.bearbeiten().beschaeftigt, null, { timeout: 60000 });
  await s.waitForTimeout(200);
};
let schlecht = 0;
const ok = (name, gut, text = '') => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};
const z2 = (x) => x.toFixed(2).replace('.', ',');
await ruhig();
const skala = (await O('blick')).massstab / (await O('werk')).f;
await s.keyboard.press('Tab');
await s.waitForTimeout(1200);
await ruhig();
// die Gerade in der Seite: in der größten Lücke der Punkte, in der mittleren Hälfte der Höhe (wie die Probe zu S8)
const P = (await O('netzPunkte')).filter((p) => p.sichtbar && p.a === 'seite');
const xs = P.map((p) => p.x);
const ys = P.map((p) => p.y).sort((a, b) => a - b);
const x0 = Math.min(...xs);
const x1 = Math.max(...xs);
const q1 = ys[Math.floor(ys.length * 0.25)];
const q3 = ys[Math.floor(ys.length * 0.75)];
let y = (q1 + q3) / 2;
let best = -1;
for (let i = 0; i + 1 < ys.length; i++) {
  const c = (ys[i] + ys[i + 1]) / 2;
  if (c < q1 || c > q3) continue;
  if (ys[i + 1] - ys[i] > best) {
    best = ys[i + 1] - ys[i];
    y = c;
  }
}
const klick = async (x, yy) => {
  await s.mouse.move(x, yy, { steps: 3 });
  await s.waitForTimeout(250);
  await s.mouse.down();
  await s.waitForTimeout(60);
  await s.mouse.up();
  await s.waitForTimeout(250);
};
await s.keyboard.press('p');
await s.waitForTimeout(300);
await klick(x0 - 40, y);
await s.mouse.move(x1 + 40, y, { steps: 8 });
await s.waitForTimeout(400);
const r1 = await O('lichtring');
ok('1 der Lichtring ist da', !!r1 && r1.proben > 10, r1 ? `${r1.proben} Proben, ${r1.zu ? 'geschlossen' : 'offen'}, ${r1.spiegeln ? 'mit Spiegelbild' : 'ohne'}` : 'keiner');
if (ordner) await s.screenshot({ path: `${ordner}/ozzy-lichtring.png` });
await s.mouse.move(x1 + 40, y + 20, { steps: 3 });
await s.waitForTimeout(400);
const r2 = await O('lichtring');
const anders = !!r1 && !!r2 && (r1.proben !== r2.proben || r1.pos.some((v, i) => Math.abs(v - r2.pos[i]) > 1e-6));
ok('2 er folgt dem Zeiger', anders, r2 ? `${r2.proben} Proben` : 'keiner');
await klick(x1 + 40, y);
const r3 = await O('lichtring');
const vorher = (await O('werkLinienDaten')).length;
await s.keyboard.press('Enter');
await ruhig();
const L = await O('werkLinienDaten');
const neu = L.length > vorher ? L[L.length - 1] : null;
// jeder Punkt des neuen Loops: Abstand zum Lichtring (mit Spiegelbild), in Bildpunkten des Raums
let groesster = Infinity;
if (neu && r3) {
  const pos = r3.pos;
  const ringe = r3.spiegeln ? [1, -1] : [1];
  const abst = (p) => {
    let d = Infinity;
    for (const sz of ringe) {
      const n = pos.length / 3;
      for (let i = 0; i + 1 < (r3.zu ? n + 1 : n); i++) {
        const a = [pos[3 * (i % n)], pos[3 * (i % n) + 1], sz * pos[3 * (i % n) + 2]];
        const j = (i + 1) % n;
        const b = [pos[3 * j], pos[3 * j + 1], sz * pos[3 * j + 2]];
        const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
        const ap = [p.x - a[0], p.y - a[1], p.z - a[2]];
        const t = Math.max(0, Math.min(1, (ab[0] * ap[0] + ab[1] * ap[1] + ab[2] * ap[2]) / Math.max(1e-12, ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2)));
        d = Math.min(d, Math.hypot(ap[0] - t * ab[0], ap[1] - t * ab[1], ap[2] - t * ab[2]));
      }
    }
    return d;
  };
  groesster = Math.max(...neu.punkte.map(abst)) * skala;
}
ok('3 nach ↩ liegt der neue Loop auf dem Lichtring', !!r3 && !!neu && groesster <= 1, neu ? `Loop ${neu.id} (${neu.art}, ${neu.punkte.length} Punkte), größter Abstand ${z2(groesster)} px` : 'kein neuer Loop');
const r4 = await O('lichtring');
ok('4 danach kein Lichtring', r4 === null);
ok('5 keine Fehler in der Konsole', fehler.length === 0, fehler.slice(0, 3).join(' | '));
console.log(schlecht ? `${schlecht} nicht erfüllt` : 'alles gut');
await browser.close();
