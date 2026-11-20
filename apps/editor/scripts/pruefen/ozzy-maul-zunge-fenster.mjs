// Ozzy, die Zunge (Plan „Maul, Zähne, Zunge“, Etappe 6, erste Scheibe, 20.11.2026), an „teat firefish“ (NAME) auf Wachs.
// Kriterien:
//   U1 Mit dem Maul hängt unter der Leiste der Tropfen „Zunge“; eine Zunge gibt es noch nicht.
//   U2 Ein Tipp: Das Maul hat eine Zunge. Sie wächst bei offenem Maul, ihr Netz ist endlich, der Tropfen ist gedrückt und hält das
//      Maul offen; im offenen Maul hat sie ihre Dicke. Ein Schritt für ⌘Z.
//   U3 Sie trägt ihre eigene Farbe: Ein Bildpunkt auf ihr ist rosa; mit einer anderen Farbe (Grün) ist er grün.
//   U4 Sie lebt: In „Fressen“ den Unterkiefer mit einem Ruck weiter geöffnet, ist ihre Spitze gleich danach nicht an ihrem Platz
//      (sie kommt nach); nach kurzer Zeit liegt sie dort und ruht.
//   U5 Gummi: an ihr gegriffen und aus dem Maul gezogen, ist sie deutlich länger als in Ruhe; losgelassen schnellt sie zurück und
//      ruht wieder.
//   U6 ⌘Z nimmt die Zunge zurück (der Tropfen hängt weiter da, nicht gedrückt).
//   U7 Zunge und Zähne zusammen: In „Fressen“ stehen beide im Maul (23 Zähne, die Zunge mit ihrer Dicke), ihre Netze sind endlich.
//   U8 Keine Fehler in der Konsole.
// Aufruf aus apps/editor: GPU=1 [NAME=…] [LINIE='x,y;…'] node scripts/pruefen/ozzy-maul-zunge-fenster.mjs [ordner für Bilder]
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
  if (ordner) await s.screenshot({ path: `${ordner}/ozzy-maul-zunge-${name}.png` });
};
const klick = async (x, y) => {
  await s.mouse.move(x, y);
  await s.waitForTimeout(250);
  await s.mouse.down();
  await s.waitForTimeout(60);
  await s.mouse.up();
  await s.waitForTimeout(250);
};
const gedrueckt = () => s.evaluate(() => document.getElementById('zunge-tropfen').getAttribute('aria-pressed') === 'true');
/** die Farbe eines Bildpunkts der Haut (CSS-Pixel), gleich nach einem Bild gelesen */
const punktFarbe = (x, y) =>
  s.evaluate(
    ([px, py]) => {
      window.__ozzy.bild();
      const c = document.getElementById('haut');
      const D = c.width / c.getBoundingClientRect().width;
      const k = document.createElement('canvas');
      k.width = k.height = 3;
      const z = k.getContext('2d');
      z.drawImage(c, Math.round(px * D) - 1, Math.round(py * D) - 1, 3, 3, 0, 0, 3, 3);
      const d = z.getImageData(1, 1, 1, 1).data;
      return [d[0], d[1], d[2], d[3]];
    },
    [x, y],
  );
const zurueck = async () => {
  await s.keyboard.press('Meta+z');
  await s.waitForTimeout(700);
};

await O('material', 'wachs');
await s.keyboard.press('1');
await s.waitForTimeout(1500);
await ruhig();
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
await s.keyboard.press('0');
await s.waitForTimeout(1800);
await O('blickSetzen', { gier: -1.6, neigung: 0.05, zoom: 4 });
await s.waitForTimeout(1200);

// U1 der Tropfen
const u1 = await O('zunge');
ok('U1 mit dem Maul hängt unter der Leiste der Tropfen „Zunge“; eine Zunge gibt es noch nicht', u1.tropfen && u1.werte === null && u1.netz === null && !u1.offen && !(await gedrueckt()), `Tropfen ${u1.tropfen ? 'da' : 'fehlt'}; Werte ${u1.werte ? 'schon da' : 'keine'}`);
// U2 ein Tipp: sie wächst
const schritte0 = (await O('kiefer')).schritte;
await s.click('#zunge-tropfen');
let gewachsen = false;
let blick = 0;
for (let i = 0; i < 30; i++) {
  const z = await O('zunge');
  blick = Math.max(blick, (await O('kiefer')).blick);
  if (z.waechst) gewachsen = true;
  if (i === 8) await bild('1-waechst');
  if (gewachsen && !z.waechst) break;
  await s.waitForTimeout(100);
}
await s.waitForTimeout(1500);
const u2 = await O('zunge');
const k2 = await O('kiefer');
await bild('2-liegt');
ok(
  'U2 ein Tipp: das Maul hat eine Zunge; sie wächst bei offenem Maul, ihr Netz ist endlich, der Tropfen ist gedrückt und hält das Maul offen; ein Schritt für ⌘Z',
  !!u2.werte && gewachsen && !!u2.netz && u2.netz.endlich && u2.netz.punkte === 156 && u2.offen && (await gedrueckt()) && k2.blick > 0.95 && !!u2.kette && u2.kette.dick > 0.5 && !u2.kette.bewegt && k2.schritte === schritte0 + 1,
  `Netz ${u2.netz ? `${u2.netz.punkte} Punkte, ${u2.netz.dreiecke} Dreiecke, endlich ${u2.netz.endlich}` : 'keins'}; Blick ${k2.blick.toFixed(2)}; Dicke in der Mitte ${u2.kette ? (100 * u2.kette.dick).toFixed(0) : '?'} %; Länge ${u2.kette?.laenge.toFixed(1)} (Mittellinie des Bodens ${u2.kette?.lang.toFixed(1)}); sie ${u2.kette?.bewegt ? 'bewegt sich noch' : 'ruht'}`,
);
if (u2.werte && u2.kette) {
  // U3 ihre Farbe
  const f3 = await punktFarbe(u2.mitte[0], u2.mitte[1]);
  await O('zunge', { ...u2.werte, farbe: '#22cc44' });
  await s.waitForTimeout(500);
  const f3b = await punktFarbe(u2.mitte[0], u2.mitte[1]);
  await zurueck();
  const f3c = await punktFarbe(u2.mitte[0], u2.mitte[1]);
  ok(
    'U3 sie trägt ihre eigene Farbe: ein Bildpunkt auf ihr ist rosa; mit einer anderen Farbe (Grün) ist er grün',
    f3[3] > 200 && f3[0] > 140 && f3[0] > 1.3 * f3[1] && f3b[1] > 1.3 * f3b[0] && f3c[0] > 1.3 * f3c[1] && (await O('zunge')).werte.farbe === undefined,
    `rosa: rot ${f3[0]}, grün ${f3[1]}, blau ${f3[2]}; grün gesetzt: rot ${f3b[0]}, grün ${f3b[1]}, blau ${f3b[2]}; nach ⌘Z: rot ${f3c[0]}, grün ${f3c[1]}, blau ${f3c[2]}`,
  );
  // U4 sie lebt: in „Fressen“ den Unterkiefer mit einem Ruck weiter auf
  await s.click('#fressen-knopf');
  await s.waitForTimeout(1500);
  await ruhig();
  await s.waitForTimeout(1500);
  const vorRuck = (await O('zunge')).kette;
  const lauf = await s.evaluate(async () => {
    const bildWarten = () => new Promise((r) => requestAnimationFrame(r));
    const r = document.getElementById('fressen-maul');
    r.value = '62';
    r.dispatchEvent(new Event('input', { bubbles: true }));
    r.dispatchEvent(new Event('change', { bubbles: true }));
    let groesste = 0;
    let bewegtGesehen = false;
    let ruhtNach = -1;
    const t0 = performance.now();
    for (let i = 0; i < 400; i++) {
      await bildWarten();
      const k = window.__ozzy.zunge().kette;
      if (!k) break;
      groesste = Math.max(groesste, k.spitzeAb);
      if (k.bewegt) bewegtGesehen = true;
      else if (bewegtGesehen && performance.now() - t0 > 250) {
        ruhtNach = performance.now() - t0;
        break;
      }
    }
    const k = window.__ozzy.zunge().kette;
    return { groesste, bewegtGesehen, ruhtNach, am: k ? k.spitzeAb : -1, lang: k ? k.lang : 1 };
  });
  await bild('3-fressen');
  ok(
    'U4 sie lebt: den Unterkiefer mit einem Ruck weiter geöffnet, ist die Spitze gleich danach nicht an ihrem Platz; nach kurzer Zeit liegt sie dort und ruht',
    !!vorRuck && !vorRuck.bewegt && lauf.bewegtGesehen && lauf.groesste > 0.03 * lauf.lang && lauf.ruhtNach > 0 && lauf.ruhtNach < 4000 && lauf.am < 0.03 * lauf.lang && (await O('pose')).kiefer === 62,
    `die Spitze war bis ${lauf.groesste.toFixed(1)} von ihrem Platz (Mittellinie ${lauf.lang.toFixed(0)}); sie ruhte nach ${lauf.ruhtNach.toFixed(0)} ms, dann ${lauf.am.toFixed(2)} daneben`,
  );
  // U5 Gummi: greifen, aus dem Maul ziehen, loslassen
  {
    const z = await O('zunge');
    // (aus dem Maul hinaus: in der Richtung von der Mitte der Zunge zu ihrer Spitze)
    const r = [z.spitze[0] - z.mitte[0], z.spitze[1] - z.mitte[1]];
    const rl = Math.hypot(r[0], r[1]) || 1;
    const weg = 110;
    await s.mouse.move(z.vorn[0] + 80, z.vorn[1] - 80);
    await s.waitForTimeout(200);
    await s.mouse.move(z.vorn[0], z.vorn[1]);
    await s.waitForTimeout(250);
    await s.mouse.down();
    for (let k = 1; k <= 14; k++) {
      await s.mouse.move(z.vorn[0] + (r[0] / rl) * ((weg * k) / 14), z.vorn[1] + (r[1] / rl) * ((weg * k) / 14));
      await s.waitForTimeout(30);
    }
    await s.waitForTimeout(700);
    const gezogen = (await O('zunge')).kette;
    await bild('4-gezogen');
    await s.mouse.up();
    let ruhtNach = -1;
    const t0 = Date.now();
    for (let i = 0; i < 60; i++) {
      await s.waitForTimeout(100);
      if (!(await O('zunge')).kette.bewegt) {
        ruhtNach = Date.now() - t0;
        break;
      }
    }
    const danach = (await O('zunge')).kette;
    ok(
      'U5 Gummi: an ihr gegriffen und aus dem Maul gezogen, ist sie deutlich länger als in Ruhe; losgelassen schnellt sie zurück und ruht',
      gezogen.greift && gezogen.laenge > 1.2 * gezogen.ruheLaenge && !danach.greift && !danach.bewegt && danach.laenge < 1.06 * danach.ruheLaenge && ruhtNach > 0,
      `gezogen: Länge ${gezogen.laenge.toFixed(1)} bei ${gezogen.ruheLaenge.toFixed(1)} in Ruhe (${(100 * (gezogen.laenge / gezogen.ruheLaenge - 1)).toFixed(0)} % gedehnt), gegriffen ${gezogen.greift}; losgelassen: ruht nach ${ruhtNach} ms, Länge ${danach.laenge.toFixed(1)}`,
    );
  }
  await s.click('#fressen-knopf');
  await s.waitForTimeout(1500);
  await ruhig();
  // U6 ⌘Z: erst der Regler, dann die Zunge
  let weg = false;
  for (let i = 0; i < 6; i++) {
    await zurueck();
    if ((await O('zunge')).werte === null) {
      weg = true;
      break;
    }
  }
  await s.waitForTimeout(800);
  const u6 = await O('zunge');
  ok('U6 ⌘Z nimmt die Zunge zurück (der Tropfen hängt weiter da, nicht gedrückt)', weg && u6.werte === null && u6.netz === null && u6.tropfen && !u6.offen && !(await gedrueckt()) && (await O('werkLinienDaten')).some((l) => l.maulEcht), `Zunge ${u6.werte ? 'noch da' : 'weg'}, Tropfen ${u6.tropfen ? 'da' : 'fehlt'}, gedrückt ${u6.offen}`);
}
// U7 Zunge und Zähne zusammen
if ((await O('werkLinienDaten')).some((l) => l.maulEcht)) {
  await O('zunge', 'anfang');
  await O('zaehne', 'anfang');
  await s.waitForTimeout(600);
  await s.click('#fressen-knopf');
  await s.waitForTimeout(1500);
  await ruhig();
  await s.waitForTimeout(1800);
  const zu = await O('zunge');
  const za = await O('zaehne');
  await bild('5-beides');
  ok(
    'U7 Zunge und Zähne zusammen: in „Fressen“ stehen beide im Maul, ihre Netze sind endlich',
    !!zu.netz && zu.netz.endlich && !!zu.kette && zu.kette.dick > 0.5 && !zu.kette.bewegt && za.plaetze.length === 23 && !!za.netz && za.netz.endlich && za.lang > 5,
    `Zunge: Dicke ${zu.kette ? (100 * zu.kette.dick).toFixed(0) : '?'} %, ${zu.kette?.bewegt ? 'bewegt sich' : 'ruht'}; Zähne: ${za.plaetze.length}, längster ${za.lang.toFixed(1)}`,
  );
  await s.click('#fressen-knopf');
  await s.waitForTimeout(1200);
}
ok('U8 keine Fehler in der Konsole', fehler.length === 0, fehler.slice(0, 4).join(' | '));
await browser.close();
console.log(schlecht ? `${schlecht} Kriterien nicht erfüllt` : 'alle Kriterien erfüllt');
process.exit(schlecht ? 1 : 0);
