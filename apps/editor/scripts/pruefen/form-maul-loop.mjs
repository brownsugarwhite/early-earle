// Form zuerst (05.11.2026), Maul als Loop (`kurven.html`), mit der Maus. Florian: „mit F als schmale Form ums Maul zeichnen,
// Mundwinkel als Punkte, ein Regler öffnet es.“
// 1. F: schmale Form in der Seite vorn über den Umriss (bzw. `FALL=front`: in der Front über die Mitte). Erwartet: ein Ring.
// 2. Regler „Maul“ auf 0/20/40/55°: Haut und Inneres dicht, nichts umgeklappt; der Mundwinkel ist ein Punkt (Ecke).
// 3. Offen einen Punkt der Unterlippe in der Seite nach unten ziehen: die Lippe folgt, das Maul bleibt dicht; ⌘Z bitgleich.
// Bilder 3D und Seite. Aufruf aus apps/editor: node scripts/pruefen/form-maul-loop.mjs <ordner>
import { chromium } from '@playwright/test';

const ordner = process.argv[2] ?? '.';
const fall = process.env.FALL ?? 'seite';
const basis = process.env.KURVEN_URL ?? 'http://localhost:5193/kurven.html';
const browser = await chromium.launch();
const seite = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });
const fehler = [];
seite.on('pageerror', (e) => fehler.push(String(e)));
seite.on('console', (m) => {
  if (m.type() === 'error') fehler.push(m.text());
});
await seite.goto(basis);
await seite.waitForFunction(() => window.__kurven !== undefined);
await seite.waitForTimeout(300);
const K = (f, ...a) => seite.evaluate(([f2, a2]) => window.__kurven[f2](...a2), [f, a]);
const bild = (a, p) => K('bild', a, p);
const regler = async (w) => {
  await seite.evaluate((v) => {
    const el = document.getElementById('maul-oeffnung');
    el.dispatchEvent(new PointerEvent('pointerdown'));
    el.value = String(v);
    el.dispatchEvent(new Event('input'));
    el.dispatchEvent(new Event('change'));
  }, w);
  await seite.waitForTimeout(250);
};
const felder = await K('felder');
const aufnahme = async (name, feld) => {
  const f = felder[feld];
  await seite.screenshot({ path: `${ordner}/form-maul-loop-${fall}-${name}-2026-11-05.jpg`, type: 'jpeg', quality: 90, clip: { x: f.x, y: f.y, width: f.w, height: f.h } });
};

// 1. schmale Form ums Maul
await seite.keyboard.press('f');
const n = 64;
const linse =
  fall === 'front'
    ? Array.from({ length: n + 1 }, (_, i) => ({ x: 0, y: -20 + 10 * Math.sin((2 * Math.PI * i) / n), z: 90 * Math.cos((2 * Math.PI * i) / n) }))
    : Array.from({ length: n + 1 }, (_, i) => ({ x: -115 + 60 * Math.cos((2 * Math.PI * i) / n), y: -20 + 9 * Math.sin((2 * Math.PI * i) / n), z: 0 }));
const pkt = [];
for (const p of linse) pkt.push(await bild(fall, p));
await seite.mouse.move(pkt[0].x, pkt[0].y);
await seite.mouse.down();
for (const p of pkt.slice(1)) {
  await seite.mouse.move(p.x, p.y);
  await seite.waitForTimeout(6);
}
await seite.mouse.up();
await seite.waitForTimeout(400);
await seite.keyboard.press('f');
const form = (await K('loops')).at(-1);
console.log(`${fall}: Form als ${form.art}, ${form.punkte.length} Punkte, ${form.proben} Proben · Meldung ${JSON.stringify(await K('meldung'))}`);

// 2. Regler
const t0 = Date.now();
await regler(0);
console.log(`  Maul angelegt in ${Date.now() - t0} ms (samt Warten)`);
const mund = (await K('loops')).find((l) => l.id === form.id);
const mw = mund.punkte.filter((p) => p.mundwinkel);
console.log(`  Mundwinkel: ${mw.length} Punkt, Ecke ${mw[0]?.ecke}, bei (${mw[0]?.ref.x.toFixed(1)}, ${mw[0]?.ref.y.toFixed(1)}, ${mw[0]?.ref.z.toFixed(1)})`);
if (fall === 'front') await K('kamera', { x: -820, y: 90, z: 280 }, { x: -60, y: -20, z: 0 });
else await K('kamera', { x: -620, y: 120, z: 520 }, { x: -60, y: -20, z: 0 });
await seite.waitForTimeout(200);
for (const w of [0, 20, 40, 55]) {
  await regler(w);
  const m = await K('maul');
  console.log(
    `  ${w}°: Öffnung ${m.oeffnung} Dreiecke, Inneres ${m.innen}, offene Kanten ${m.offeneKanten}, umgeschlagen Haut ${m.umgeschlagenHaut} / innen ${m.umgeschlagenInnen}`,
  );
  if (w === 0 || w === 40) {
    await aufnahme(`${w}-3d`, 'drei');
    await aufnahme(`${w}-${fall === 'front' ? 'front' : 'seite'}`, fall === 'front' ? 'front' : 'seite');
  }
}
const vorZug = await K('lagen');

// 3. offen: einen Punkt der Unterlippe in der Seite nach unten ziehen
await regler(30);
const unten = (await K('loops')).find((l) => l.id === form.id).punkte.filter((p) => !p.mundwinkel && p.kreuzung === null);
const tiefster = [...unten].sort((a, b) => a.ref.y - b.ref.y)[0];
const a = await bild('seite', tiefster.ref);
const b = await bild('seite', { ...tiefster.ref, y: tiefster.ref.y - 12 });
await seite.mouse.click(a.x, a.y);
await seite.waitForTimeout(150);
await seite.mouse.move(a.x, a.y);
await seite.mouse.down();
for (let i = 1; i <= 10; i++) {
  await seite.mouse.move(a.x, a.y + ((b.y - a.y) * i) / 10);
  await seite.waitForTimeout(25);
}
await seite.mouse.up();
await seite.waitForTimeout(500);
const z = await K('zeiten');
const m2 = await K('maul');
console.log(
  `  Unterlippe 12 nach unten (offen 30°): offene Kanten ${m2.offeneKanten}, umgeschlagen Haut ${m2.umgeschlagenHaut} / innen ${m2.umgeschlagenInnen}, ` +
    `Zug ${(z.zug.slice(-10).reduce((s, v) => s + v, 0) / Math.max(1, z.zug.slice(-10).length)).toFixed(1)} ms je Bewegung`,
);
await aufnahme('lippe-gezogen-3d', 'drei');
await seite.keyboard.press('Meta+z');
await seite.waitForTimeout(400);
const nach = await K('lagen');
let d = nach.length === vorZug.length ? 0 : Infinity;
for (let i = 0; i < nach.length && Number.isFinite(d); i++) d = Math.max(d, Math.abs(nach[i] - vorZug[i]));
console.log(`  ⌘Z: Haut wie vor dem Zug ${d.toExponential(1)}, Maul ${JSON.stringify(await K('maul').then((m) => m && m.winkel))}°`);
// weiter zurück: die Regler-Schritte (30, 55, 40, 20) und das Anlegen (0)
for (let k = 0; k < 5; k++) {
  await seite.keyboard.press('Meta+z');
  await seite.waitForTimeout(250);
}
const loops = await K('loops');
console.log(`  ⌘Z ×5: Maul ${JSON.stringify(await K('maul'))}, Mundwinkel-Punkte ${loops.flatMap((l) => l.punkte).filter((p) => p.mundwinkel).length}, Regler ${await seite.evaluate(() => document.getElementById('maul-oeffnung').value)}`);
console.log(fehler.length ? `Fehler: ${fehler.join(' | ')}` : 'keine Fehler in der Konsole');
await browser.close();
