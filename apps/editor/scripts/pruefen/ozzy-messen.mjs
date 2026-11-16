// Ozzy, S1 im Plan „wie es weitergeht“ (16.11.2026): Tempo und Ruhe messen, an Florians drei Formen, in festen Abläufen.
// Je Ablauf: Rechenzeit je Bild (Median, 95 %), Abstand der Bilder (im Testbrowser, nur als Verhältnis lesen) und Sprünge der
// Seifenhaut: Steht ihre Zeit (kein Fließen) und bewegt sich nichts, ist jede Änderung des Bilds ein Sprung (99 % der Bildpunkte im
// Bereich ändern sich um höchstens p99 von 255). Während Bewegung zählt ein Bild als Sprung, wenn es sich viel stärker ändert als
// seine Nachbarn. Dazu, ob in dem Bild das Werk sein Netz gewechselt hat.
// Aufruf aus apps/editor: GPU=1 [FORMEN="teat firefish,strange bird,maul handgemacht test"] node scripts/pruefen/ozzy-messen.mjs [ordner]
//   OZZY_URL (Standard http://localhost:5205/ozzy.html). Schreibt eine Tabelle (Markdown) auf die Konsole und mit [ordner] als Datei.
import { writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const ordner = process.argv[2] ?? '';
const FORMEN = (process.env.FORMEN ?? 'teat firefish,strange bird,maul handgemacht test').split(',');
const ozzyUrl = process.env.OZZY_URL ?? 'http://localhost:5205/ozzy.html';
const browser = await chromium.launch({ args: process.env.GPU === '1' ? ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] : [] });
const s = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const fehler = [];
s.on('pageerror', (e) => fehler.push(String(e)));
s.on('console', (m) => {
  if (m.type() === 'error') fehler.push(m.text());
});
const O = (f, ...a) => s.evaluate(([f2, a2]) => window.__ozzy[f2](...a2), [f, a]);
const ruhig = async () => {
  await s.waitForTimeout(250);
  await s.waitForFunction(() => window.__ozzy.bearbeiten().an && !window.__ozzy.bearbeiten().beschaeftigt && !window.__ozzy.pose().lauf, null, { timeout: 90000 });
  await s.waitForTimeout(200);
};
const q = (A, p) => {
  if (!A.length) return NaN;
  const B = [...A].sort((a, b) => a - b);
  return B[Math.min(B.length - 1, Math.floor(p * B.length))];
};
const z1 = (x) => (Number.isFinite(x) ? x.toFixed(1).replace('.', ',') : '–');
/** Sprünge: ohne Bewegung jede Änderung über der Schwelle; in Bewegung viel stärker als die Nachbarn */
const spruenge = (B, still) => {
  const out = [];
  for (let i = 1; i < B.length; i++) {
    const b = B[i];
    if (b.p99 < 0) continue;
    if (still) {
      if (b.p99 >= 6) out.push(b);
      continue;
    }
    const n = [B[i - 2], B[i - 1], B[i + 1], B[i + 2]].filter((x) => x && x.p99 >= 0).map((x) => x.diff);
    const m = n.length ? n.reduce((a, c) => a + c, 0) / n.length : 0;
    if (b.diff > 4 * m + 0.5 && b.p99 >= 20) out.push(b);
  }
  return out;
};
const zeilen = [];
const ablauf = async (form, name, f, o = {}) => {
  await O('messen', true, o);
  await f();
  const B = await O('messen', false);
  const ms = B.map((b) => b.ms);
  const ab = B.slice(1).map((b) => b.abstand);
  const sp = o.pixel ? spruenge(B, !!o.still) : [];
  const beimNetz = sp.filter((b, i) => {
    const j = B.indexOf(b);
    return j > 0 && B[j].netz !== B[j - 1].netz;
  }).length;
  // Teile: Median je Teil (Werk rechnet, Haut der Anzeige, Linien, Seifenhaut zeichnen, Linien zeichnen)
  const teile = [0, 1, 2, 3, 4].map((k) => z1(q(B.map((b) => b.teile[k]), 0.5))).join(' · ');
  const zeile = `| ${form} | ${name} | ${B.length} | ${z1(q(ms, 0.5))} / ${z1(q(ms, 0.95))} | ${teile} | ${z1(q(ab, 0.5))} / ${z1(q(ab, 0.95))} | ${o.pixel ? `${sp.length}${sp.length ? ` (größte ${Math.max(...sp.map((b) => b.p99))}, beim Netzwechsel ${beimNetz})` : ''}` : '–'} |`;
  zeilen.push(zeile);
  console.log(zeile);
  return B;
};

zeilen.push('| Form | Ablauf | Bilder | Rechnen je Bild ms (Median / 95 %) | davon (Median): Werk · Haut · Linien · Seifenhaut zeichnen · Linien zeichnen | Abstand ms (Median / 95 %) | Sprünge der Haut |', '| --- | --- | --- | --- | --- | --- | --- |');
console.log(zeilen.join('\n'));
for (const form of FORMEN) {
  // Laden und Aufblasen: die Messung läuft ab dem Laden, Bereich um die Mitte
  await s.goto(`${ozzyUrl}?form=${encodeURIComponent(form)}`);
  await s.waitForFunction(() => !!window.__ozzy);
  await ablauf(
    form,
    'Laden und Aufblasen',
    async () => {
      await s.waitForFunction(() => window.__ozzy.werk().gezeigt && window.__ozzy.bearbeiten().an, null, { timeout: 90000 });
      await ruhig();
    },
    { pixel: true, bereich: { x: 720 - 300, y: 450 - 230, w: 600, h: 460 } },
  );
  await ablauf(form, 'Ruhe nach dem Laden (3 s)', () => s.waitForTimeout(3000), { pixel: true, still: true });
  // Drehen: ins Leere ziehen
  await ablauf(form, 'Drehen (1,5 s)', async () => {
    await s.mouse.move(200, 750);
    await s.mouse.down();
    for (let k = 1; k <= 45; k++) {
      await s.mouse.move(200 + 4 * k, 750 - k);
      await s.waitForTimeout(30);
    }
    await s.mouse.up();
    await s.waitForTimeout(800);
  });
  await ruhig();
  await ablauf(form, 'Einrasten (1) und heraus (0)', async () => {
    await s.keyboard.press('1');
    await s.waitForTimeout(1300);
    await s.keyboard.press('0');
    await s.waitForTimeout(1300);
  }, { pixel: true });
  await ablauf(form, 'Vier Ansichten auf und zu', async () => {
    await s.keyboard.press('Tab');
    await s.waitForTimeout(1400);
    await s.keyboard.press('Tab');
    await s.waitForTimeout(1400);
  });
  await ruhig();
  // Zug an der Wand der Seite: ein Punkt der Linie der Mitte, dann Ruhe mit stehender Haut
  const L = await O('werkLinienDaten');
  const mitte = L.find((l) => l.art === 'mitte') ?? L[0];
  const p = mitte.punkte.find((x) => x.sichtbar);
  const a = (await O('ankerImBild', mitte.id, p.i, 'seite'))[0];
  if (a) {
    await ablauf(form, 'Zug an der Wand (1 s)', async () => {
      await s.mouse.move(a.x, a.y, { steps: 4 });
      await s.waitForTimeout(350);
      await s.mouse.down();
      for (let k = 1; k <= 30; k++) {
        await s.mouse.move(a.x, a.y - k);
        await s.waitForTimeout(30);
      }
      await s.mouse.up();
    });
    await ablauf(form, 'nach dem Zug (4 s, Haut steht)', () => s.waitForTimeout(4000), { pixel: true, still: true });
    await s.keyboard.press('Meta+z');
    await ruhig();
  }
  // Pinsel an der Blase: der Punkt mit dem größten z
  {
    const Ls = await O('werkLinienDaten');
    let best = null;
    for (const l of Ls) for (const x of l.punkte) if (x.sichtbar && (!best || x.z > best.z)) best = x;
    const b = await O('werkImBild', { x: best.x, y: best.y, z: best.z });
    await s.mouse.move(b.x + 3, b.y + 2, { steps: 6 });
    await s.waitForTimeout(450);
    if ((await O('pinsel')).ziel) {
      await ablauf(form, 'Pinsel (1 s)', async () => {
        await s.mouse.down();
        for (let k = 1; k <= 20; k++) {
          await s.mouse.move(b.x + 3, b.y + 2 - k);
          await s.waitForTimeout(40);
        }
        await s.mouse.up();
      });
      await ablauf(form, 'nach dem Pinsel (4 s, Haut steht)', () => s.waitForTimeout(4000), { pixel: true, still: true });
      await s.keyboard.press('Meta+z');
      await ruhig();
    }
  }
}
if (fehler.length) console.log(`Fehler: ${fehler.slice(0, 3).join(' | ')}`);
if (ordner) writeFileSync(`${ordner}/ozzy-messen.md`, `${zeilen.join('\n')}\n`);
await browser.close();
