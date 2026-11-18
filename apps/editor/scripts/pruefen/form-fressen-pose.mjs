// Form zuerst (05.11.2026), Fressen-Pose im Fenster `kurven.html`, mit der Maus. Florian: „Warum kann man in der Pose nicht einfach
// ganz normal die Bézier-Punkte bearbeiten und den Blendshape erstellen?“
// 1. F: schmale Form ums Maul (Seite, vorn über den Umriss; `FALL=front`: in der Front über die Mitte), Knopf „Fressen“: Maul 30°.
// 2. In der Pose den untersten Punkt der Unterlippe in der Seite nach unten ziehen: Blendshape, die Grundform bleibt bitgleich.
// 3. Regler Maul auf 45° und Kopf auf 10°: der Zug bleibt (er gehört zur Ruhe der Pose).
// 4. Zurück in die Grundform: bitgleich wie am Anfang. Dort einen Loop schneiden und als Ganzes nach oben ziehen; wieder in die
//    Pose: sie folgt der Grundform, der Zug an der Lippe bleibt.
// 5. ⌘Z bis zum Anfang.
// Bilder 3D und Seite. Aufruf aus apps/editor: node scripts/pruefen/form-fressen-pose.mjs <ordner>
import { chromium } from '@playwright/test';

const ordner = process.argv[2] ?? '.';
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
const felder = await K('felder');
const aufnahme = async (name, feld) => {
  const f = felder[feld];
  await seite.screenshot({ path: `${ordner}/form-fressen-${process.env.FALL ?? 'seite'}-${name}-2026-11-05.jpg`, type: 'jpeg', quality: 90, clip: { x: f.x, y: f.y, width: f.w, height: f.h } });
};
const regler = async (id, w) => {
  await seite.evaluate(
    ([id2, v]) => {
      const el = document.getElementById(id2);
      el.dispatchEvent(new PointerEvent('pointerdown'));
      el.value = String(v);
      el.dispatchEvent(new Event('input'));
      el.dispatchEvent(new Event('change'));
    },
    [id, w],
  );
  await seite.waitForTimeout(250);
};
/**
 * Größte Abweichung zweier Lagenlisten. Hat das Verdichten Punkte zusammengelegt (neu nummeriert), über die Lage: die alten Punkte,
 * die es noch gibt, genau an Ort (gleiche Lage), wie viele weggefallen sind, und wie weit die übrigen neuen vom nächsten alten liegen.
 */
const unterschied = (a, b) => {
  if (a.length === b.length) {
    let d = 0;
    for (let i = 0; i < a.length; i++) d = Math.max(d, Math.abs(a[i] - b[i]));
    return d;
  }
  const schl = (p, i) => `${p[3 * i]},${p[3 * i + 1]},${p[3 * i + 2]}`;
  const alt = new Set();
  for (let i = 0; i < b.length / 3; i++) alt.add(schl(b, i));
  let gleich = 0;
  let neuWeit = 0;
  for (let i = 0; i < a.length / 3; i++) {
    if (alt.has(schl(a, i))) {
      gleich++;
      continue;
    }
    let m = Infinity;
    for (let j = 0; j < b.length / 3; j++) m = Math.min(m, Math.hypot(a[3 * i] - b[3 * j], a[3 * i + 1] - b[3 * j + 1], a[3 * i + 2] - b[3 * j + 2]));
    neuWeit = Math.max(neuWeit, m);
  }
  return `neu nummeriert: ${gleich} von ${b.length / 3} alten Punkten genau an Ort, ${b.length / 3 - gleich} weggefallen, ${a.length / 3 - gleich} neue bis ${neuWeit.toFixed(2)} vom nächsten alten`;
};
const ziehen = async (a, von, nach, schritte = 12) => {
  const p = await bild(a, von);
  const q = await bild(a, nach);
  // ohne Klick vorher: Ein zweiter Druck kurz danach wäre ein Doppelklick (auf einer Linie ein neuer Punkt, auf einem Punkt Ecke)
  await seite.mouse.move(p.x, p.y);
  await seite.mouse.down();
  for (let i = 1; i <= schritte; i++) {
    await seite.mouse.move(p.x + ((q.x - p.x) * i) / schritte, p.y + ((q.y - p.y) * i) / schritte);
    await seite.waitForTimeout(25);
  }
  await seite.mouse.up();
  await seite.waitForTimeout(500);
};
const maulZeile = (m) => !m ? "kein Maul" : `offene Kanten ${m.offeneKanten}, umgeschlagen Haut ${m.umgeschlagenHaut} / innen ${m.umgeschlagenInnen}`;
const anfang = await K('lagen');

// 1. schmale Form ums Maul, dann „Fressen“
await seite.keyboard.press('f');
const n = 64;
const pkt = [];
const fall = process.env.FALL ?? 'seite';
for (let i = 0; i <= n; i++) {
  const c = Math.cos((2 * Math.PI * i) / n);
  const si = Math.sin((2 * Math.PI * i) / n);
  pkt.push(await bild(fall, fall === 'front' ? { x: 0, y: -20 + 10 * si, z: 90 * c } : { x: -115 + 60 * c, y: -20 + 9 * si, z: 0 }));
}
await seite.mouse.move(pkt[0].x, pkt[0].y);
await seite.mouse.down();
for (const p of pkt.slice(1)) {
  await seite.mouse.move(p.x, p.y);
  await seite.waitForTimeout(6);
}
await seite.mouse.up();
await seite.waitForTimeout(400);
// nach dem Zeichnen ist F wieder aus (ein zweites F schaltete es wieder an, jeder Zug zeichnete dann eine neue Form)
const grundMitMaul = await K('lagen');
await seite.click('#knopf-pose');
await seite.waitForTimeout(400);
await K('kamera', { x: -620, y: 120, z: 520 }, { x: -60, y: -20, z: 0 });
await seite.waitForTimeout(200);
console.log(`1. Fressen: ${JSON.stringify(await K('pose'))}; ${maulZeile(await K('maul'))}; Grundform ${unterschied(await K('grundLagen'), grundMitMaul)}`);
await aufnahme('1-pose-3d', 'drei');
await aufnahme('1-pose-seite', 'seite');

// 2. in der Pose: untersten Punkt der Unterlippe nach unten
const mund = (await K('loops')).find((l) => l.punkte.some((p) => p.mundwinkel));
// nur Punkte, die man sieht (die Enden eines Rings ohne Kreuzung halten nur Griffe)
const unten = [...mund.punkte].filter((p) => !p.mundwinkel && p.sichtbar !== false).sort((a, b) => a.ref.y - b.ref.y)[0];
await ziehen('seite', unten.ref, { ...unten.ref, y: unten.ref.y - 25 });
const z = await K('zeiten');
const ms = z.zug.slice(-10);
console.log(
  `2. Unterlippe 25 nach unten: ${JSON.stringify(await K('pose'))}; ${maulZeile(await K('maul'))}; Grundform ${unterschied(await K('grundLagen'), grundMitMaul)}; ` +
    `Zug ${(ms.reduce((s, v) => s + v, 0) / Math.max(1, ms.length)).toFixed(1)} ms je Bewegung`,
);
await aufnahme('2-lippe-3d', 'drei');
await aufnahme('2-lippe-seite', 'seite');
const nachLippe = await K('lagen');

// 3. Knochen: Maul 45°, Kopf 10°
await regler('maul-oeffnung', 45);
await regler('kopf-oeffnung', 10);
console.log(`3. Maul 45°, Kopf 10°: ${JSON.stringify(await K('pose'))}; ${maulZeile(await K('maul'))}`);
await aufnahme('3-knochen-3d', 'drei');
await regler('maul-oeffnung', 30);
await regler('kopf-oeffnung', 0);
console.log(`   zurück auf 30°/0°: Pose wie nach dem Zug ${unterschied(await K('lagen'), nachLippe)}`);

// 4. Grundform: bitgleich; Loop schneiden und als Ganzes hoch, dann wieder in die Pose
await seite.click('#knopf-pose');
await seite.waitForTimeout(400);
console.log(`4. Grundform: ${JSON.stringify(await K('pose'))}; wie vor der Pose ${unterschied(await K('lagen'), grundMitMaul)}`);
await aufnahme('4-grund-3d', 'drei');
await seite.keyboard.press('l');
const a = await bild('seite', { x: 60, y: 200, z: 0 });
const b = await bild('seite', { x: 60, y: -200, z: 0 });
await seite.mouse.move(a.x, a.y);
await seite.mouse.down();
await seite.mouse.move(b.x, b.y, { steps: 8 });
await seite.mouse.up();
await seite.waitForTimeout(400);
const ring = (await K('loops')).at(-1);
// eine Stelle oben auf dem Ring, nicht sein Ende (dort endet die Trefferlinie)
const oben = Array.from({ length: ring.proben }, (_, j) => ({ x: ring.ruhe[3 * j], y: ring.ruhe[3 * j + 1], z: ring.ruhe[3 * j + 2] })).sort((p, q) => Math.abs(p.y - 100) - Math.abs(q.y - 100))[0];
// oberes Ende des Rings (auf der Mitte): Lage in der Grundform und in der Pose
const ringPunkt = async () => {
  const l = (await K('loops')).find((x) => x.id === ring.id);
  let o = { x: 0, y: -Infinity, z: 0 };
  for (let j = 0; j < l.proben; j++) if (l.ruhe[3 * j + 1] > o.y) o = { x: l.ruhe[3 * j], y: l.ruhe[3 * j + 1], z: l.ruhe[3 * j + 2] };
  return o;
};
const p0 = await ringPunkt();
await ziehen('seite', oben, { ...oben, y: oben.y + 30 });
const p1 = await ringPunkt();
console.log(`   Ring geschnitten und an (${oben.x.toFixed(0)}, ${oben.y.toFixed(0)}) 30 hoch gezogen: oberes Ende (${p0.x.toFixed(1)}, ${p0.y.toFixed(1)}) → (${p1.x.toFixed(1)}, ${p1.y.toFixed(1)}, ${p1.z.toFixed(1)}), Netz ${(await K('pose')).punkte} Punkte`);
await seite.click('#knopf-pose');
await seite.waitForTimeout(500);
const p2 = await ringPunkt();
console.log(
  `   wieder Fressen: ${JSON.stringify(await K('pose'))}; ${maulZeile(await K('maul'))}; dasselbe Ende in der Pose (${p2.x.toFixed(1)}, ${p2.y.toFixed(1)}, ${p2.z.toFixed(1)})`,
);
await aufnahme('4-pose-folgt-3d', 'drei');
await aufnahme('4-pose-folgt-seite', 'seite');

// 5. ⌘Z bis zum Anfang
for (let k = 0; k < 12; k++) {
  await seite.keyboard.press('Meta+z');
  await seite.waitForTimeout(200);
}
console.log(`5. ⌘Z ×12: ${JSON.stringify(await K('pose'))}; Haut wie am Anfang ${unterschied(await K('lagen'), anfang)}, Loops ${(await K('loops')).length}`);
console.log(fehler.length ? `Fehler: ${fehler.join(' | ')}` : 'keine Fehler in der Konsole');
await browser.close();
