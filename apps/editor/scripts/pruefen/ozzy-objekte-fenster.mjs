// Ozzy, mehrere Objekte (Plan „Objekte, Spiegel und Nähte“, Etappe 3, erste Scheibe, 18.11.2026): eine frische Kugel, dann mit dem
// Plus ein zweites Objekt daneben.
// Kriterien:
//   1  Das Plus öffnet das leere Blatt; die Kugel steht blass darin (sie ruht), das Werkzeug zeichnet.
//   2  Esc auf dem leeren Blatt führt zurück in den Raum: ein Objekt, die Kugel ist wieder das aktive, unverändert.
//   3  Plus, ein Kreis rechts neben der Kugel, ↩: Das zweite Objekt bläst auf und ist das aktive; die Kugel ruht und bleibt im Bild.
//   4  V: Klick auf die Kugel macht sie zum aktiven Objekt (Schild „Form 1“), Klick auf das zweite wieder dieses („Form 2“). Die
//      Formen sind nach dem Wechsel dieselben (Punkte, Linien).
//   4c Luft ablassen (⌫ ohne Auswahl) am aktiven Objekt: zurück zu seiner Zeichnung, das andere steht blass; ↩ bläst dieselbe Form auf.
//   5  Jedes Objekt hat seinen Spiegel: Das zweite auf „aus“; nach dem Wechsel zur Kugel steht der Knopf auf Clipping, zurück auf „aus“.
//   6  A: Klick auf das ruhende Objekt macht es zum aktiven; ein Punkt seiner Linie lässt sich ziehen, das andere Objekt bleibt.
//   7  ⌘Z nimmt den Zug am aktiven Objekt zurück.
//   8  V, ⌫ am gewählten zweiten Objekt: Es ist weg, die Kugel ist das aktive und einzige Objekt.
//   9  Keine Fehler in der Konsole.
// Aufruf aus apps/editor: OZZY_URL=http://localhost:5211/ozzy.html node scripts/pruefen/ozzy-objekte-fenster.mjs [ordner für Bilder]
import { auf, z1 } from './ozzy-teile.mjs';

const ordner = process.argv[2] ?? '';
let schlecht = 0;
const ok = (name, gut, text = '') => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};
const t = await auf({ extra: 'ohneLinie=0' });
const { browser, s, O, ruhig, geladen, klick, fehler } = t;
const bild = async (name) => {
  if (ordner) await s.screenshot({ path: `${ordner}/${name}.png` });
};
const still = async () => {
  await s.waitForTimeout(300);
  await s.waitForFunction(() => !window.__ozzy.werk().beschaeftigt && !window.__ozzy.werk().griffWartet, null, { timeout: 90000 });
  await s.waitForTimeout(250);
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
/** der Ort der Mitte eines Kastens (Raum) im Bild */
const imBild = async (k) => O('weltImBild', { x: k.cx, y: k.cy, z: 0 });

// die erste Form: eine Kugel links der Mitte
await O('form', kreis(600, 450, 130));
await s.waitForTimeout(300);
await O('aufblasen');
await geladen();
const w0 = await O('werk');
const o0 = await O('objekte');
ok('0 eine Kugel, ein Objekt', o0.aktiv === 1 && o0.ruhende.length === 0 && w0.linien === 1, `aktiv ${o0.aktiv}, ruhend ${o0.ruhende.length}, ${w0.punkte} Punkte, ${w0.linien} Linie`);

// ---------- 1 das Plus ----------
await s.click('#plus');
await s.waitForTimeout(900);
const o1 = await O('objekte');
const z1a = await O('zustand');
await bild('objekte-1-plus-blatt');
ok('1 das Plus: leeres Blatt, die Kugel ruht und steht blass darin', z1a === 'blatt' && o1.ruhende.length === 1 && o1.ruhende[0].id === 1 && o1.ruheSicht < 0.6, `Zustand ${z1a}, ruhend ${o1.ruhende.map((r) => r.id)}, Sicht ${o1.ruheSicht.toFixed(2)}`);

// ---------- 2 Esc: zurück ----------
await s.keyboard.press('Escape');
await s.waitForTimeout(600);
await geladen();
const o2 = await O('objekte');
const w2 = await O('werk');
ok('2 Esc: zurück im Raum, die Kugel ist wieder das aktive Objekt', (await O('zustand')) === 'ruhe' && o2.aktiv === 1 && o2.ruhende.length === 0 && w2.punkte === w0.punkte && w2.linien === w0.linien, `aktiv ${o2.aktiv}, ruhend ${o2.ruhende.length}, ${w2.punkte} Punkte`);

// ---------- 3 Plus, ein Kreis rechts daneben, aufblasen ----------
await s.click('#plus');
await s.waitForTimeout(700);
await O('form', kreis(900, 430, 80), true);
await s.waitForTimeout(300);
await O('aufblasen');
await s.waitForTimeout(600);
await bild('objekte-2-aufblasen');
await geladen();
const o3 = await O('objekte');
const w3 = await O('werk');
await bild('objekte-3-zwei');
ok(
  '3 das zweite Objekt bläst auf und ist das aktive; die Kugel ruht',
  o3.aktiv === 2 && o3.ruhende.length === 1 && o3.ruhende[0].id === 1 && o3.ruhende[0].gezeigt > 0 && w3.linien === 1 && Math.abs(o3.kasten.cx - o3.ruhende[0].kasten.cx - 300) < 8,
  `aktiv ${o3.aktiv}, ruhend ${o3.ruhende.map((r) => r.id)}; Mitten ${z1(o3.ruhende[0].kasten.cx)} und ${z1(o3.kasten.cx)} (300 auseinander), Halbmesser ${z1(o3.ruhende[0].kasten.rx)} und ${z1(o3.kasten.rx)}; ${w3.punkte} Punkte am neuen`,
);

// ---------- 4 V: wählen wechselt das aktive Objekt ----------
await s.keyboard.press('v');
await s.waitForTimeout(300);
const K1 = o3.ruhende[0].kasten;
const K2 = o3.kasten;
const B1 = await imBild(K1);
const B2 = await imBild(K2);
await klick(B1.x, B1.y);
await still();
const o4 = await O('objekte');
const w4 = await O('werk');
const s4 = (await O('objekt')).schild;
await bild('objekte-4-form-1');
ok('4 V, Klick auf die Kugel: Sie ist das aktive Objekt', o4.aktiv === 1 && o4.ruhende.length === 1 && o4.ruhende[0].id === 2 && w4.punkte === w0.punkte && s4?.text === 'Form 1', `aktiv ${o4.aktiv}, ruhend ${o4.ruhende.map((r) => r.id)}, ${w4.punkte} Punkte, Schild „${s4?.text}“`);
await klick(B2.x, B2.y);
await still();
const o4b = await O('objekte');
const w4b = await O('werk');
const s4b = (await O('objekt')).schild;
ok('4b Klick auf das zweite: wieder dieses', o4b.aktiv === 2 && o4b.ruhende[0]?.id === 1 && w4b.punkte === w3.punkte && s4b?.text === 'Form 2', `aktiv ${o4b.aktiv}, ${w4b.punkte} Punkte, Schild „${s4b?.text}“`);

// ---------- 4c Luft ablassen am aktiven Objekt: zurück zu seiner Zeichnung, das andere bleibt; ↩ bläst dieselbe Form wieder auf ----------
await s.keyboard.press('a');
await s.waitForTimeout(300);
await s.keyboard.press('Backspace');
await s.waitForFunction(() => window.__ozzy.zustand() === 'blatt', null, { timeout: 20000 });
await s.waitForTimeout(500);
const o4c = await O('objekte');
await bild('objekte-4c-abgelassen');
await s.keyboard.press('Enter');
await s.waitForTimeout(400);
await geladen();
const o4d = await O('objekte');
const w4d = await O('werk');
ok(
  '4c Luft ablassen und wieder aufblasen: dasselbe Objekt, das andere bleibt stehen',
  o4c.aktiv === 2 && o4c.ruhende.length === 1 && o4c.ruheSicht < 0.6 && o4d.aktiv === 2 && o4d.ruhende.length === 1 && w4d.punkte === w3.punkte && Math.abs(o4d.kasten.cx - K2.cx) < 0.5,
  `auf dem Blatt: aktiv ${o4c.aktiv}, ruhend ${o4c.ruhende.map((r) => r.id)}, Sicht ${o4c.ruheSicht.toFixed(2)}; danach aktiv ${o4d.aktiv}, ${w4d.punkte} Punkte, Mitte ${z1(o4d.kasten.cx)}`,
);
await s.keyboard.press('v');
await s.waitForTimeout(300);
await klick(B2.x, B2.y);
await still();

// ---------- 5 jedes Objekt hat seinen Spiegel ----------
await O('spiegelSetzen', 'aus');
await still();
const sp2 = await O('spiegel');
await klick(B1.x, B1.y);
await still();
const sp1 = await O('spiegel');
await klick(B2.x, B2.y);
await still();
const sp2b = await O('spiegel');
ok('5 der Spiegel gehört dem Objekt', sp2.zustand === 'aus' && sp1.zustand === 'clip' && !sp1.frei && sp2b.zustand === 'aus' && sp2b.frei, `Form 2: ${sp2.zustand}, Form 1: ${sp1.zustand}, wieder Form 2: ${sp2b.zustand}`);

// ---------- 6 A: Klick auf das ruhende Objekt, ein Punkt gezogen ----------
await s.keyboard.press('a');
await s.waitForTimeout(300);
await klick(B1.x, B1.y);
await still();
const o6 = await O('objekte');
let gezogen = false;
const vor6 = o6.kasten;
{
  const L = await O('werkLinienDaten');
  const m = L[0];
  const p = m.punkte.filter((q) => q.sichtbar).reduce((a, b) => (b.y > a.y ? b : a));
  const A = (await O('ankerImBild', m.id, p.i)).filter((x) => !x.m && x.sichtbar)[0];
  if (A) {
    await s.mouse.move(A.x + 20, A.y + 16, { steps: 3 });
    await s.mouse.move(A.x, A.y, { steps: 6 });
    await s.waitForTimeout(400);
    await s.mouse.down();
    for (let k = 1; k <= 20; k++) {
      await s.mouse.move(A.x, A.y - 3 * k);
      await s.waitForTimeout(20);
    }
    await s.waitForTimeout(400);
    await s.mouse.up();
    gezogen = true;
  }
}
await ruhig();
const o6b = await O('objekte');
await bild('objekte-5-gezogen');
ok(
  '6 A, Klick auf das ruhende Objekt: Es ist das aktive, sein Punkt lässt sich ziehen, das andere bleibt',
  o6.aktiv === 1 && gezogen && o6b.kasten.ry > vor6.ry + 5 && Math.abs(o6b.ruhende[0].kasten.rx - K2.rx) < 0.01,
  `aktiv ${o6.aktiv}; Höhe der Kugel ${z1(vor6.ry)} → ${z1(o6b.kasten.ry)}; das andere ${z1(K2.rx)} → ${z1(o6b.ruhende[0]?.kasten.rx)}`,
);

// ---------- 7 ⌘Z ----------
await s.keyboard.press('Meta+z');
await ruhig();
const o7 = await O('objekte');
ok('7 ⌘Z nimmt den Zug am aktiven Objekt zurück', o7.aktiv === 1 && Math.abs(o7.kasten.ry - vor6.ry) < 1, `Höhe ${z1(o7.kasten.ry)}`);

// ---------- 8 V, ⌫ am zweiten Objekt ----------
await s.keyboard.press('v');
await s.waitForTimeout(300);
const B2b = await imBild((await O('objekte')).ruhende[0].kasten);
await klick(B2b.x, B2b.y);
await still();
const vor8 = await O('objekte');
await s.keyboard.press('Backspace');
await s.waitForTimeout(600);
await still();
const o8 = await O('objekte');
const w8 = await O('werk');
await bild('objekte-6-geloescht');
ok('8 ⌫ am gewählten zweiten Objekt: nur die Kugel bleibt', vor8.aktiv === 2 && o8.aktiv === 1 && o8.ruhende.length === 0 && (await O('zustand')) === 'ruhe' && w8.punkte === w0.punkte, `vorher aktiv ${vor8.aktiv}; danach aktiv ${o8.aktiv}, ruhend ${o8.ruhende.length}, ${w8.punkte} Punkte`);
ok('9 keine Fehler in der Konsole', fehler.length === 0, fehler.slice(0, 3).join(' | '));
await browser.close();
console.log(schlecht ? `${schlecht} nicht erfüllt` : 'alles gut');
