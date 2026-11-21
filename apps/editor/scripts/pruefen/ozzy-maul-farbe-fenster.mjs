// Ozzy, die Ebene „Maul“ (Plan „Maul, Zähne, Zunge“, Etappe 4, 20.11.2026; zugleich die Probe P4), an „teat firefish“ (NAME) auf
// Wachs. Mit dem Maul entsteht im Paint-Modus eine Ebene „Maul“: die Zahnfleischlinie längs der Lippe in der Tasche, das Zahnfleisch
// heller, das Innere dunkelrot.
// Kriterien:
//   F1 Nach dem Schneiden, sobald das Werk ruht: Es gibt die Ebene „Maul“ (oben im Stapel) mit der Zahnfleischlinie und zwei Füllungen;
//      gewählt bleibt die Ebene von vorher.
//   F2 Geschlossen ist von außen keine Farbe zu sehen (ein Raster von Strahlen um den Kopf trifft nirgends Farbe).
//   F3 „Fressen“ an: Im offenen Maul stehen beide Farben (das Raster trifft das Innere und das Zahnfleisch).
//   F4 „Fressen“ aus und wieder an: Die Farblinien der Ebene liegen genau, wo sie lagen; das Raster trifft wieder beide Farben.
//   F4b Ein Punkt der Lippe in der Seite um 8 gezogen (das Netz wechselt dabei): Zu ist außen keine Farbe, offen stehen wieder
//      beide Farben, die Zahnfleischlinie hat ihren Weg.
//   F5 Paint-Modus, Ebene „Maul“ gewählt: Das Maul steht offen. Ein Klick füllt im Maul; eine andere Ebene gewählt: Das Maul
//      schließt; wieder „Maul“: Es öffnet, die neue Farbe sitzt an derselben Stelle.
//   F6 ⌘Z nimmt die Füllung zurück, dann das Maul: Die Ebene „Maul“ ist weg, außen ist keine Farbe.
//   F7 Keine Fehler in der Konsole.
// Aufruf aus apps/editor: GPU=1 [NAME=…] [LINIE='x,y;…'] node scripts/pruefen/ozzy-maul-farbe-fenster.mjs [ordner für Bilder]
import { chromium } from '@playwright/test';
import { flickenAnlegen } from './ozzy-teile.mjs';

const ordner = process.argv[2] ?? '';
const NAME = process.env.NAME ?? 'teat firefish';
const LINIE = (process.env.LINIE ?? '-860,172;-735,156;-700,152;-665,156;-640,165').split(';').map((t) => t.split(',').map(Number));
const basis = process.env.OZZY_URL ?? 'http://localhost:5205/ozzy.html';
const browser = await chromium.launch({ args: process.env.GPU === '1' ? ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] : [] });
const s = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const fehler = [];
s.on('pageerror', (e) => fehler.push(String(e)));
s.on('console', (m) => {
  if (m.type() === 'error') fehler.push(m.text());
});
await flickenAnlegen(s, undefined, fehler);
await s.goto(`${basis}?form=${encodeURIComponent(NAME)}`);
await s.waitForFunction(() => !!window.__ozzy);
const O = (f, ...a) => s.evaluate(([f2, a2]) => window.__ozzy[f2](...a2), [f, a]);
const ruhig = async (zeit = 120000) => {
  await s.waitForTimeout(300);
  await s.waitForFunction(() => window.__ozzy.bearbeiten().an && !window.__ozzy.bearbeiten().beschaeftigt && !window.__ozzy.werk().beschaeftigt, null, { timeout: zeit });
  await s.waitForTimeout(200);
};
await ruhig();
let schlecht = 0;
const ok = (name, gut, text = '') => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};
const bild = async (name) => {
  if (ordner) await s.screenshot({ path: `${ordner}/ozzy-maul-farbe-${name}.png` });
};
const klick = async (x, y) => {
  await s.mouse.move(x, y);
  await s.waitForTimeout(250);
  await s.mouse.down();
  await s.waitForTimeout(60);
  await s.mouse.up();
  await s.waitForTimeout(250);
};
await O('material', 'wachs');
await s.keyboard.press('1');
await s.waitForTimeout(1500);
await ruhig();
const ebenenVor = (await O('farbe')).ebenen;
// das Maul zeichnen und bestätigen
await s.keyboard.press('p');
await s.waitForTimeout(300);
for (const [x, y] of LINIE) {
  const q = await O('werkImBild', { x, y, z: 0 });
  await klick(q.x, q.y);
}
await s.keyboard.press('Enter');
await s.waitForTimeout(500);
await s.click('#maul-tropfen');
await s.waitForFunction(() => !window.__ozzy.maulStrich(), null, { timeout: 60000 }).catch(() => {});
await ruhig();
await s.waitForTimeout(2500);
await ruhig();
await s.keyboard.press('a');
await s.waitForTimeout(300);

const INNEN = '#6b1425';
const ZAHNFLEISCH = '#cf5a72';
/** ein Raster von Strahlen um das Maul (zwischen den Tropfen der Kiefer und dem Scharnier, mit Rand): je Farbe, wie oft getroffen, und ein Ort je Farbe */
const raster = async () => {
  const k = await O('kiefer');
  if (!k.scharnier) return { zahl: {}, ort: {}, gesamt: 0 };
  // (die Tropfen sind im Paint-Modus aus: Dann spannt das Raster ein Feld um das Scharnier)
  const P = [k.scharnier, k.oben, k.unten].filter(Boolean);
  const weit = Math.max(160, ...P.map((p) => Math.hypot(p.x - k.scharnier.x, p.y - k.scharnier.y)));
  const x0 = Math.min(...P.map((p) => p.x)) - (P.length < 3 ? weit : 60);
  const x1 = Math.max(...P.map((p) => p.x)) + (P.length < 3 ? weit : 60);
  const y0 = Math.min(...P.map((p) => p.y)) - (P.length < 3 ? weit : 60);
  const y1 = Math.max(...P.map((p) => p.y)) + (P.length < 3 ? weit : 60);
  return s.evaluate(
    ([a, b, c, d]) => {
      const zahl = {};
      const ort = {};
      const wo = [];
      let gesamt = 0;
      for (let y = b; y <= d; y += 5)
        for (let x = a; x <= c; x += 5) {
          const f = window.__ozzy.farbUnter(x, y);
          gesamt++;
          if (!f) continue;
          zahl[f] = (zahl[f] ?? 0) + 1;
          if (wo.length < 4) wo.push({ x, y });
          // (ein Ort mitten in einer Farbe: der, um den auch die vier Nachbarn dieselbe Farbe haben)
          if (!ort[f] && [-5, 5].every((e) => window.__ozzy.farbUnter(x + e, y) === f && window.__ozzy.farbUnter(x, y + e) === f)) ort[f] = { x, y };
        }
      return { zahl, ort, gesamt, wo };
    },
    [x0, y0, x1, y1],
  );
};
const text = (r) => `${Object.entries(r.zahl).map(([f, n]) => `${f}: ${n}`).join(', ') || 'keine Farbe'} (von ${r.gesamt} Strahlen)`;
const blick = async () => {
  await s.keyboard.press('0');
  await s.waitForTimeout(1800);
  await O('blickSetzen', { gier: -1.75, neigung: 0.05, zoom: 4 });
  await s.waitForTimeout(1200);
};

// F1 die Ebene
const f1 = await O('farbe');
const maul = f1.ebenen.find((e) => e.name === 'Maul');
ok(
  'F1 mit dem Maul gibt es die Ebene „Maul“: oben im Stapel, die Zahnfleischlinie, zwei Füllungen; gewählt bleibt die Ebene von vorher',
  !!maul && maul.linien === 1 && maul.fuellungen === 2 && f1.ebenen[f1.ebenen.length - 1].name === 'Maul' && !maul.aktiv && f1.ebenen.length === ebenenVor.length + 1 && f1.fehl === 0,
  `Ebenen ${ebenenVor.map((e) => e.name).join(', ')} → ${f1.ebenen.map((e) => `${e.name}${e.aktiv ? '*' : ''} (${e.linien} Linien, ${e.fuellungen} Füllungen)`).join(', ')}; Farblinien ohne Weg: ${f1.fehl}`,
);
if (maul) {
  await blick();
  // F2 zu: außen keine Farbe
  const r2 = await raster();
  await bild('1-zu');
  ok('F2 geschlossen ist von außen keine Farbe zu sehen', Object.keys(r2.zahl).length === 0 && r2.gesamt > 100, text(r2));
  // F3 „Fressen“ an
  await s.click('#fressen-knopf');
  await s.waitForTimeout(1500);
  await ruhig();
  const r3 = await raster();
  await bild('2-fressen');
  ok('F3 „Fressen“ an: im offenen Maul stehen das Innere und das Zahnfleisch', (r3.zahl[INNEN] ?? 0) > 5 && (r3.zahl[ZAHNFLEISCH] ?? 0) > 2 && (await O('farbe')).zeigt, text(r3));
  // F4 aus und wieder an: die Farblinien liegen, wo sie lagen
  await O('farbEbene', 'waehlen', maul.id);
  await s.waitForTimeout(300);
  const lagen4 = (await O('farbe')).lagen;
  await s.click('#fressen-knopf');
  await s.waitForTimeout(1500);
  await ruhig();
  const r4zu = await raster();
  await s.click('#fressen-knopf');
  await s.waitForTimeout(1500);
  await ruhig();
  const lagen4b = (await O('farbe')).lagen;
  const r4 = await raster();
  let weit = 0;
  if (lagen4.length === lagen4b.length && lagen4.every((l, i) => l.length === lagen4b[i].length)) lagen4.forEach((l, i) => l.forEach((v, j) => (weit = Math.max(weit, Math.abs(v - lagen4b[i][j])))));
  else weit = Infinity;
  ok(
    'F4 „Fressen“ aus und wieder an: die Farblinien liegen, wo sie lagen; zu keine Farbe außen, offen wieder beide',
    weit < 1e-9 && Object.keys(r4zu.zahl).length === 0 && (r4.zahl[INNEN] ?? 0) > 5 && (r4.zahl[ZAHNFLEISCH] ?? 0) > 2,
    `Farblinien höchstens ${Number.isFinite(weit) ? weit.toExponential(1) : 'andere Zahl von Orten'} neben vorher; zu: ${text(r4zu)}; offen: ${text(r4)}`,
  );
  await s.click('#fressen-knopf');
  await s.waitForTimeout(1500);
  await ruhig();
  // F4b an der Lippe ziehen (in der Seite, beide Lippen gehen zusammen), dann wieder ansehen
  {
    await s.keyboard.press('1');
    await s.waitForTimeout(1800);
    const Lv = (await O('werkLinienDaten')).find((l) => l.maulEcht);
    // (PUNKT=<n>: ein anderer Punkt der Lippe; ob die Zahnfleischlinie ihren Weg behält, hängt an der Stelle)
    const i = process.env.PUNKT ? Number(process.env.PUNKT) : Math.max(1, Math.round((Lv.punkte.length - 1) / 4));
    const vor = Lv.punkte[i];
    const q = await O('werkImBild', { x: vor.x, y: vor.y, z: vor.z });
    const z = await O('werkImBild', { x: vor.x, y: vor.y - 8, z: vor.z });
    await s.mouse.move(q.x, q.y);
    await s.waitForTimeout(300);
    await s.mouse.down();
    for (let k = 1; k <= 8; k++) {
      await s.mouse.move(q.x + ((z.x - q.x) * k) / 8, q.y + ((z.y - q.y) * k) / 8);
      await s.waitForTimeout(40);
    }
    await s.mouse.up();
    await ruhig();
    const Ln = (await O('werkLinienDaten')).find((l) => l.maulEcht);
    const ging = Math.hypot(Ln.punkte[i].x - vor.x, Ln.punkte[i].y - vor.y);
    const f4 = await O('farbe');
    await blick();
    const zu = await raster();
    // (trifft zu ein Strahl Farbe: wo, und ein Bild der Stelle)
    if (zu.wo?.length && ordner) {
      const o = zu.wo[0];
      console.log(`     zu trifft ein Strahl Farbe bei ${zu.wo.map((q) => `${q.x.toFixed(0)}/${q.y.toFixed(0)}`).join(', ')}`);
      await s.screenshot({ path: `${ordner}/ozzy-maul-farbe-2a-zu-aussen.png`, clip: { x: Math.max(0, o.x - 150), y: Math.max(0, o.y - 110), width: 300, height: 220 } });
      await s.screenshot({ path: `${ordner}/ozzy-maul-farbe-2a-zu-ganz.png` });
    }
    await s.click('#fressen-knopf');
    await s.waitForTimeout(1500);
    await ruhig();
    const offen = await raster();
    await bild('2b-nach-zug');
    await s.click('#fressen-knopf');
    await s.waitForTimeout(1500);
    await ruhig();
    ok(
      'F4b ein Punkt der Lippe gezogen (das Netz wechselt): zu außen keine Farbe, offen beide Farben, die Zahnfleischlinie hat ihren Weg',
      ging > 4 && f4.fehl === 0 && Object.keys(zu.zahl).length === 0 && (offen.zahl[INNEN] ?? 0) > 5 && (offen.zahl[ZAHNFLEISCH] ?? 0) > 2,
      `der Punkt ging ${ging.toFixed(1)}; Netzwechsel der Bemalung ${f4.wechsel.zahl} (gehalten ${f4.wechsel.gehalten}, gesucht ${f4.wechsel.gesucht}); ohne Weg ${f4.fehl}; zu: ${text(zu)}; offen: ${text(offen)}`,
    );
  }
  // F5 im Maul malen: Paint-Modus, die Ebene „Maul“ ist gewählt, das Maul steht offen
  await O('malen', true);
  await s.waitForTimeout(1200);
  const k5 = await O('kiefer');
  const r5 = await raster();
  const ort = r5.ort[INNEN];
  const NEU = [0.1, 0.6, 0.9];
  const NEU_HEX = '#1a99e6';
  let f5 = { offen: k5.blick, gefuellt: null, zu: null, wieder: null, danach: null };
  if (ort) {
    await O('farbFuellen', ort.x, ort.y, NEU);
    await s.waitForTimeout(800);
    f5.gefuellt = await O('farbUnter', ort.x, ort.y);
    await bild('3-gemalt');
    // eine andere Ebene: Das Maul schließt
    const andere = (await O('farbe')).ebenen.find((e) => e.name !== 'Maul');
    await O('farbEbene', 'waehlen', andere.id);
    await s.waitForTimeout(1200);
    f5.zu = (await O('kiefer')).blick;
    await O('farbEbene', 'waehlen', maul.id);
    await s.waitForTimeout(1200);
    f5.wieder = (await O('kiefer')).blick;
    f5.danach = await O('farbUnter', ort.x, ort.y);
  }
  ok(
    'F5 Paint-Modus mit der Ebene „Maul“: das Maul steht offen, ein Klick füllt im Maul; andere Ebene: zu; wieder „Maul“: offen, die Farbe sitzt',
    !!ort && f5.offen > 0.99 && f5.gefuellt === NEU_HEX && f5.zu === 0 && f5.wieder > 0.99 && f5.danach === NEU_HEX,
    `offen ${f5.offen}; im Raster ${text(r5)}; gefüllt bei ${ort ? `${ort.x}/${ort.y}` : 'keinem Ort'}: ${f5.gefuellt}; andere Ebene: Blick ${f5.zu}; wieder „Maul“: Blick ${f5.wieder}, Farbe ${f5.danach}`,
  );
  // F6 ⌘Z: erst die Füllung, dann das Maul
  await O('malen', false);
  await s.waitForTimeout(600);
  await s.keyboard.press('Meta+z');
  await s.waitForTimeout(700);
  const f6a = await O('farbe');
  for (let i = 0; i < 6 && (await O('werkLinienDaten')).some((l) => l.maulEcht); i++) {
    await s.keyboard.press('Meta+z');
    await ruhig();
  }
  await s.waitForTimeout(800);
  const f6 = await O('farbe');
  const r6 = await s.evaluate(() => {
    let farbig = 0;
    let gesamt = 0;
    for (let y = 150; y <= 750; y += 12)
      for (let x = 150; x <= 1290; x += 12) {
        gesamt++;
        if (window.__ozzy.farbUnter(x, y)) farbig++;
      }
    return { farbig, gesamt };
  });
  await bild('4-zurueck');
  ok(
    'F6 ⌘Z nimmt die Füllung zurück, dann das Maul: die Ebene „Maul“ ist weg, außen keine Farbe',
    f6a.ebenen.find((e) => e.name === 'Maul')?.fuellungen === 2 && !f6.ebenen.some((e) => e.name === 'Maul') && r6.farbig === 0 && !(await O('werkLinienDaten')).some((l) => l.maulEcht),
    `nach dem ersten ⌘Z: ${f6a.ebenen.map((e) => `${e.name} (${e.fuellungen} Füllungen)`).join(', ')}; am Ende Ebenen: ${f6.ebenen.map((e) => e.name).join(', ')}; ${r6.farbig} von ${r6.gesamt} Strahlen treffen Farbe`,
  );
}
ok('F7 keine Fehler in der Konsole', fehler.length === 0, fehler.slice(0, 4).join(' | '));
await browser.close();
console.log(schlecht ? `${schlecht} Kriterien nicht erfüllt` : 'alle Kriterien erfüllt');
process.exit(schlecht ? 1 : 0);
