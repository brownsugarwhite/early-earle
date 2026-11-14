// Form zuerst (06.11.2026), Teil A: Stift P wie in Illustrator (`kurven.html`), mit der Maus.
// A. Seite: vier Anker ums Auge (oben glatt nach rechts gezogen, rechts ein Klick = Ecke, unten glatt nach links, links glatt nach
//    oben), Klick auf den ersten schließt. Erwartet: ein Loop mit vier Punkten, rechts eine Ecke; die Linie liegt im Blatt auf der
//    gezeichneten Bézier-Form; die Griffe der glatten Punkte zeigen im Blatt genau wie gezogen; die Haut ändert sich nicht.
// B. Den oberen Punkt 20 nach oben ziehen: 0 umgeklappt. C. ⌘Z bis vor A.
// D. Front: vier Anker quer über die Mitte, ⏎ schließt. Erwartet: ein Ring.
// Aufruf aus apps/editor: node scripts/pruefen/form-stift-probe.mjs <ordner für Bilder>
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
await seite.goto(basis);
await seite.waitForFunction(() => window.__kurven !== undefined);
await seite.waitForTimeout(400);
const K = (f, ...a) => seite.evaluate(([f2, a2]) => window.__kurven[f2](...a2), [f, a]);
const loops = () => K('loops');
const bild = (a, p) => K('bild', a, p);
const umgeklappt = () =>
  seite.evaluate(() => {
    const p = window.__kurven.lagen();
    const t = window.__kurven.dreiecke();
    const fn = [];
    const vn = new Float64Array(p.length);
    for (let i = 0; i < t.length; i += 3) {
      const [a, b, c] = [t[i], t[i + 1], t[i + 2]];
      const ab = [p[3 * b] - p[3 * a], p[3 * b + 1] - p[3 * a + 1], p[3 * b + 2] - p[3 * a + 2]];
      const ac = [p[3 * c] - p[3 * a], p[3 * c + 1] - p[3 * a + 1], p[3 * c + 2] - p[3 * a + 2]];
      const f = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
      fn.push(f);
      for (const v of [a, b, c]) for (let k = 0; k < 3; k++) vn[3 * v + k] += f[k];
    }
    let z = 0;
    for (let i = 0; i < t.length; i += 3) {
      const f = fn[i / 3];
      const m = [0, 1, 2].map((k) => vn[3 * t[i] + k] + vn[3 * t[i + 1] + k] + vn[3 * t[i + 2] + k]);
      if (f[0] * m[0] + f[1] * m[1] + f[2] * m[2] < 0) z++;
    }
    return z;
  });

/** Anker setzen: Druck an p, mit Griff bis p + g ziehen (g in Welt-Einheiten des Blatts; null = Klick, eine Ecke) */
const anker = async (blatt, p, g) => {
  const a = await bild(blatt, p);
  await seite.mouse.move(a.x, a.y);
  await seite.mouse.down();
  if (g) {
    const b = await bild(blatt, { x: p.x + g.x, y: p.y + g.y, z: p.z + g.z });
    for (let i = 1; i <= 6; i++) await seite.mouse.move(a.x + ((b.x - a.x) * i) / 6, a.y + ((b.y - a.y) * i) / 6);
  }
  await seite.mouse.up();
  await seite.waitForTimeout(120);
};

// ---------- A. Seite ----------
const vorher = await K('masse');
const loopsVorher = (await loops()).length;
await seite.keyboard.press('p');
const A = [
  { p: { x: -60, y: 85, z: 0 }, g: { x: 22, y: 0, z: 0 } },
  { p: { x: -22, y: 45, z: 0 }, g: null },
  { p: { x: -60, y: 8, z: 0 }, g: { x: -22, y: 0, z: 0 } },
  { p: { x: -98, y: 45, z: 0 }, g: { x: 0, y: 22, z: 0 } },
];
for (const { p, g } of A) await anker('seite', p, g);
await K('ausschnitt', 'seite', { cx: -60, cy: -45, zoom: 2.2 });
await seite.waitForTimeout(150);
let f = (await K('felder')).seite;
await seite.screenshot({ path: `${ordner}/form-stift-zeichnen-2026-11-06.jpg`, type: 'jpeg', quality: 88, clip: { x: f.x, y: f.y, width: f.w, height: f.h } });
await K('ausschnitt', 'seite', { cx: 0, cy: 0, zoom: 1 });
await seite.waitForTimeout(100);
// schließen: Klick auf den ersten Anker
const p0 = await bild('seite', A[0].p);
await seite.mouse.click(p0.x, p0.y);
await seite.waitForTimeout(500);
const L = await loops();
const l = L.at(-1);
const sichtbar = l.punkte.filter((p) => p.sichtbar !== false);
console.log(`A Seite: ${L.length - loopsVorher} neuer Loop (${l.art}), ${sichtbar.length} Punkte, Ecken ${sichtbar.map((p) => (p.ecke ? '◆' : '●')).join('')}, Griffe gespeichert ${l.pfad}`);
// Linie im Blatt gegen die gezeichnete Form (Bézier aus den Ankern, je Stück 40 Proben)
const zeichnung = [];
for (let i = 0; i < A.length; i++) {
  const p = A[i];
  const q = A[(i + 1) % A.length];
  const c = [p.p, { x: p.p.x + (p.g?.x ?? 0), y: p.p.y + (p.g?.y ?? 0) }, { x: q.p.x - (q.g?.x ?? 0), y: q.p.y - (q.g?.y ?? 0) }, q.p];
  for (let k = 0; k < 40; k++) {
    const t = k / 40;
    const u = 1 - t;
    const b = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
    zeichnung.push({ x: b.reduce((s, w, j) => s + w * c[j].x, 0), y: b.reduce((s, w, j) => s + w * c[j].y, 0) });
  }
}
const linie = Array.from({ length: l.proben }, (_, j) => ({ x: l.ruhe[3 * j], y: l.ruhe[3 * j + 1] }));
const abstandZu = (q, poly) => {
  let m = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((q.x - a.x) * dx + (q.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
    m = Math.min(m, Math.hypot(q.x - a.x - t * dx, q.y - a.y - t * dy));
  }
  return m;
};
const s0 = (await K('ausschnitt', 'seite')).zoom;
const skala = (await bild('seite', { x: 1, y: 0, z: 0 })).x - (await bild('seite', { x: 0, y: 0, z: 0 })).x;
let weit = 0;
for (const q of zeichnung) weit = Math.max(weit, abstandZu(q, linie));
console.log(`  Linie im Blatt neben der Zeichnung: höchstens ${(weit * skala).toFixed(2)} px (Zoom ${s0})`);
// Griffe im Blatt gegen die gezogenen (Richtung und Länge)
for (const { p, g } of A) {
  const i = l.punkte.findIndex((q) => Math.hypot(q.ref.x - p.x, q.ref.y - p.y) < 3);
  if (i < 0) {
    console.log(`  Anker (${p.x}, ${p.y}): kein Punkt`);
    continue;
  }
  const q = l.punkte[i];
  if (!g) {
    console.log(`  Anker (${p.x}, ${p.y}): Ecke ${q.ecke}`);
    continue;
  }
  const w = (v) => (Math.atan2(v.y, v.x) * 180) / Math.PI;
  console.log(
    `  Anker (${p.x}, ${p.y}): Griff im Blatt ${q.aus.x.toFixed(1)}/${q.aus.y.toFixed(1)} (gezogen ${g.x}/${g.y}), Richtung ${(w(q.aus) - w(g)).toFixed(2)}° daneben, ` +
      `Tiefe ${q.aus.z.toFixed(1)}, Gegenüber ${(180 - Math.abs(w(q.ein) - w(q.aus))).toFixed(2)}° (glatt 0)`,
  );
}
console.log(`  Haut: Maße vorher ${JSON.stringify(vorher)}, nachher ${JSON.stringify(await K('masse'))} · umgeklappt ${await umgeklappt()}`);
await K('ausschnitt', 'seite', { cx: -60, cy: -45, zoom: 2.2 });
await seite.waitForTimeout(150);
f = (await K('felder')).seite;
await seite.screenshot({ path: `${ordner}/form-stift-fertig-2026-11-06.jpg`, type: 'jpeg', quality: 88, clip: { x: f.x, y: f.y, width: f.w, height: f.h } });
await K('ausschnitt', 'seite', { cx: 0, cy: 0, zoom: 1 });
await seite.waitForTimeout(100);

// ---------- B. Oberen Punkt hochziehen ----------
await seite.keyboard.press('Escape');
const oben = l.punkte.find((q) => Math.hypot(q.ref.x - A[0].p.x, q.ref.y - A[0].p.y) < 3);
const a0 = await bild('seite', oben.ref);
const a1 = await bild('seite', { ...oben.ref, y: oben.ref.y + 20 });
await seite.mouse.move(a0.x, a0.y);
await seite.mouse.down();
for (let i = 1; i <= 10; i++) {
  await seite.mouse.move(a0.x, a0.y + ((a1.y - a0.y) * i) / 10);
  await seite.waitForTimeout(20);
}
await seite.mouse.up();
await seite.waitForTimeout(500);
const l2 = (await loops()).find((x) => x.id === l.id);
const o2 = l2.punkte.find((q) => Math.abs(q.s - oben.s) < 1e-6);
console.log(`B oben 20 hoch: Punkt bei y ${o2.ref.y.toFixed(1)} (vorher ${oben.ref.y.toFixed(1)}), Griff ${o2.aus.x.toFixed(1)}/${o2.aus.y.toFixed(1)} · umgeklappt ${await umgeklappt()}`);

// ---------- C. ⌘Z ----------
await seite.keyboard.press('Meta+z');
await seite.keyboard.press('Meta+z');
await seite.waitForTimeout(300);
console.log(`C ⌘Z ×2: Loops ${(await loops()).length} (vorher ${loopsVorher}), Maße ${JSON.stringify(await K('masse'))}`);

// ---------- D. Front quer über die Mitte ----------
await seite.keyboard.press('p');
const F = [
  { p: { x: 0, y: 60, z: -45 }, g: null },
  { p: { x: 0, y: 60, z: 45 }, g: null },
  { p: { x: 0, y: 15, z: 45 }, g: null },
  { p: { x: 0, y: 15, z: -45 }, g: null },
];
for (const { p, g } of F) await anker('front', p, g);
await seite.keyboard.press('Enter');
await seite.waitForTimeout(500);
const r = (await loops()).at(-1);
// (08.11.) die Linie im Blatt gegen die gezeichnete Hälfte z ≥ 0 (drei gerade Stücke)
const haelfte = [
  [{ x: 0, y: 60 }, { x: 45, y: 60 }],
  [{ x: 45, y: 60 }, { x: 45, y: 15 }],
  [{ x: 45, y: 15 }, { x: 0, y: 15 }],
];
let dWeit = 0;
for (let j = 0; j < r.proben; j++) {
  const q = { x: r.ruhe[3 * j + 2], y: r.ruhe[3 * j + 1] };
  dWeit = Math.max(dWeit, Math.min(...haelfte.map(([a, b]) => abstandZu(q, [a, b]))));
}
const skalaF = (await bild('front', { x: 0, y: 0, z: 1 })).x - (await bild('front', { x: 0, y: 0, z: 0 })).x;
console.log(
  `D Front: ${r.art}, sichtbare Punkte ${r.punkte.filter((p) => p.sichtbar !== false).length}, unsichtbare Enden ${r.punkte.filter((p) => p.sichtbar === false).length}, ` +
    `Linie im Blatt bis ${(dWeit * skalaF).toFixed(2)} px neben der Zeichnung · umgeklappt ${await umgeklappt()}`,
);
console.log(fehler.length ? `Fehler: ${fehler.join(' | ')}` : 'keine Fehler in der Konsole');
await browser.close();
