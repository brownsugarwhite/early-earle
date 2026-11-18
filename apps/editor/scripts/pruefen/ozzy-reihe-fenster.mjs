// Ozzy, mehrere Silhouetten auf einem Blatt (Plan „Objekte, Spiegel und Nähte“, Etappe 3, 18.11.2026): drei geschlossene Linien auf
// dem ersten Blatt, ↩.
// Kriterien:
//   1  Jede geschlossene Linie wird ein Objekt: drei Objekte, das größte ist „Form 1“ und am Ende das aktive.
//   2  Jedes Objekt liegt, wo es gezeichnet wurde, und ist so groß wie seine Zeichnung.
//   3  Der Raum steht vom ersten Objekt an (er richtet sich nach allen): Die Kamera bleibt, während die anderen aufblasen.
//   4  Luft ablassen am aktiven Objekt zeigt nur seine Zeichnung; ↩ bläst dieselbe Form wieder auf, die anderen bleiben.
//   5  Mit dem Plus: zwei Linien auf dem neuen Blatt werden zwei weitere Objekte.
//   6  Keine Fehler in der Konsole.
// Aufruf aus apps/editor: OZZY_URL=http://localhost:5211/ozzy.html node scripts/pruefen/ozzy-reihe-fenster.mjs [ordner für Bilder]
import { auf, z1 } from './ozzy-teile.mjs';

const ordner = process.argv[2] ?? '';
let schlecht = 0;
const ok = (name, gut, text = '') => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};
const t = await auf();
const { browser, s, O, fehler } = t;
const bild = async (name) => {
  if (ordner) await s.screenshot({ path: `${ordner}/${name}.png` });
};
const fertig = async () => {
  await s.waitForFunction(() => !window.__ozzy.reihe() && window.__ozzy.zustand() === 'ruhe' && window.__ozzy.werk().gezeigt && !window.__ozzy.werk().beschaeftigt, null, { timeout: 120000 });
  await s.waitForTimeout(400);
};
const kreis = (cx, cy, R) => {
  const k = 0.5523 * R;
  return [
    { x: cx + R, y: cy, ein: [0, -k], aus: [0, k] },
    { x: cx, y: cy + R, ein: [k, 0], aus: [-k, 0] },
    { x: cx - R, y: cy, ein: [0, k], aus: [0, -k] },
    { x: cx, y: cy - R, ein: [-k, 0], aus: [k, 0] },
  ];
};
// das Blatt: 1440 × 900, Mitte (720, 450); Welt x = Blatt x − 720, y = 450 − Blatt y
const FORMEN = [
  { cx: 640, cy: 470, R: 120 },
  { cx: 820, cy: 380, R: 60 },
  { cx: 520, cy: 330, R: 40 },
];
// die kleinste zuerst gezeichnet: Die Reihenfolge des Zeichnens zählt nicht, die Größe schon
await O('form', kreis(FORMEN[2].cx, FORMEN[2].cy, FORMEN[2].R));
await O('formDazu', kreis(FORMEN[0].cx, FORMEN[0].cy, FORMEN[0].R));
await O('formDazu', kreis(FORMEN[1].cx, FORMEN[1].cy, FORMEN[1].R));
await s.waitForTimeout(700);
await bild('reihe-0-blatt');
const t0 = Date.now();
await s.keyboard.press('Enter');
// Bilder unterwegs und die Kamera (wo ein fester Ort der Welt im Bild liegt)
const orte = [];
for (let k = 0; k < 14; k++) {
  await s.waitForTimeout(250);
  const r = await O('reihe');
  const o = await O('objekte');
  const w = await O('weltImBild', { x: 0, y: 0, z: 0 });
  orte.push({ ms: Date.now() - t0, warten: r ? r.warten : -1, imRaum: r ? r.imRaum : null, objekte: o.ruhende.length + 1, x: w.x, y: w.y });
  if (k === 3 || k === 6 || k === 9) await bild(`reihe-1-unterwegs-${k}`);
}
await fertig();
const dauer = Date.now() - t0;
const o1 = await O('objekte');
const alle = [{ id: o1.aktiv, kasten: o1.kasten }, ...o1.ruhende.map((r) => ({ id: r.id, kasten: r.kasten }))].sort((a, b) => a.id - b.id);
await bild('reihe-2-drei');
ok('1 drei Objekte, das größte ist Form 1 und das aktive', alle.length === 3 && o1.aktiv === 1 && alle[0].kasten.rx > alle[1].kasten.rx && alle[1].kasten.rx > alle[2].kasten.rx, `aktiv ${o1.aktiv}; Halbmesser ${alle.map((a) => `${a.id}: ${z1(a.kasten.rx)}`).join(', ')}; ${dauer} ms vom ↩ bis alle stehen`);
let weit = 0;
alle.forEach((a, i) => {
  const F = FORMEN[i];
  weit = Math.max(weit, Math.abs(a.kasten.cx - (F.cx - 720)), Math.abs(a.kasten.cy - (450 - F.cy)), Math.abs(a.kasten.rx - F.R), Math.abs(a.kasten.ry - F.R));
});
ok('2 jedes Objekt liegt, wo es gezeichnet wurde, und ist so groß wie seine Zeichnung', weit < 6, `größte Abweichung von Mitte oder Halbmesser ${z1(weit)} Bildpunkte`);
// die Kamera: sobald die Reihe im Raum ist, bleibt der Ort der Weltmitte im Bild stehen
const imRaum = orte.filter((x) => x.imRaum === true || x.warten === -1);
const dx = imRaum.length ? Math.max(...imRaum.map((x) => Math.hypot(x.x - imRaum[imRaum.length - 1].x, x.y - imRaum[imRaum.length - 1].y))) : 999;
ok('3 die Kamera bleibt stehen, während die folgenden Formen aufblasen', imRaum.length >= 3 && dx < 3, `${imRaum.length} Messungen im Raum, die Weltmitte wandert im Bild höchstens ${z1(dx)} Bildpunkte; Verlauf: ${orte.map((x) => `${x.ms} ms: ${x.objekte} Obj.`).filter((_, i) => i % 3 === 0).join(' · ')}`);

// ---------- 4 Luft ablassen am aktiven Objekt ----------
await s.keyboard.press('a');
await s.waitForTimeout(300);
await s.keyboard.press('Backspace');
await s.waitForFunction(() => window.__ozzy.zustand() === 'blatt', null, { timeout: 30000 });
await s.waitForTimeout(500);
const z4 = await O('zeichnung');
await bild('reihe-3-ablassen');
await s.keyboard.press('Enter');
await fertig();
const o4 = await O('objekte');
ok('4 Luft ablassen zeigt nur die Zeichnung dieses Objekts; ↩ bläst es wieder auf, die anderen bleiben', z4.geschlossene === 1 && o4.ruhende.length === 2 && o4.aktiv === 1 && Math.abs(o4.kasten.rx - FORMEN[0].R) < 6, `geschlossene Linien auf dem Blatt ${z4.geschlossene}; danach aktiv ${o4.aktiv}, ruhend ${o4.ruhende.map((r) => r.id)}, Halbmesser ${z1(o4.kasten.rx)}`);

// ---------- 5 das Plus mit zwei Linien ----------
await s.click('#plus');
await s.waitForTimeout(700);
await O('form', kreis(900, 620, 50), true);
await O('formDazu', kreis(1010, 560, 30));
await s.waitForTimeout(500);
await s.keyboard.press('Enter');
await fertig();
const o5 = await O('objekte');
await bild('reihe-4-fuenf');
const ids5 = [o5.aktiv, ...o5.ruhende.map((r) => r.id)].sort((a, b) => a - b);
ok('5 das Plus mit zwei Linien: zwei weitere Objekte', ids5.join(',') === '1,2,3,4,5' && o5.aktiv === 4, `Objekte ${ids5.join(', ')}, aktiv ${o5.aktiv}`);

ok('6 keine Fehler in der Konsole', fehler.length === 0, fehler.slice(0, 3).join(' | '));
console.log(schlecht ? `${schlecht} nicht erfüllt` : 'alles gut');
await browser.close();
process.exit(schlecht ? 1 : 0);
