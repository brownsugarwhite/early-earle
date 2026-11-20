// Ozzy, die Zähne (Plan „Maul, Zähne, Zunge“, Etappe 5, erste Scheibe, 20.11.2026), an „teat firefish“ (NAME) auf Wachs.
// Kriterien:
//   Z1 Mit dem Maul hängt unter der Leiste der Tropfen „Zähne“; Zähne gibt es noch keine.
//   Z2 Ein Tipp: Das Maul hat zwei Zahnreihen (oben zwölf, unten elf). Sie sprießen bei offenem Maul; danach ist das Maul zu, die
//      Zähne stecken darin (keiner hat Länge), der Tropfen ist weg.
//   Z3 „Fressen“ an: Die Zähne stehen im offenen Maul (jeder Kiefer hat seine; ihr Netz ist endlich; der längste ist zwischen 5 und
//      45 Einheiten lang). Den Unterkiefer weiter geöffnet: Sie gehen mit (das Netz ändert sich), keiner wird kürzer.
//   Z4 „Fressen“ aus: wieder zu, kein Zahn hat Länge.
//   Z5 ⌘Z nimmt die Zähne zurück (der Tropfen hängt wieder), ein weiteres das Maul.
//   Z6 Keine Fehler in der Konsole.
// Aufruf aus apps/editor: GPU=1 [NAME=…] [LINIE='x,y;…'] node scripts/pruefen/ozzy-maul-zaehne-fenster.mjs [ordner für Bilder]
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
  if (ordner) await s.screenshot({ path: `${ordner}/ozzy-maul-zaehne-${name}.png` });
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

// Z1 der Tropfen
const z1 = await O('zaehne');
ok('Z1 mit dem Maul hängt unter der Leiste der Tropfen „Zähne“; Zähne gibt es noch keine', z1.tropfen && z1.werte === null && z1.netz === null, `Tropfen ${z1.tropfen ? 'da' : 'fehlt'}; Werte ${z1.werte ? 'schon da' : 'keine'}`);
// Z2 ein Tipp: sie sprießen
const schritte0 = (await O('kiefer')).schritte;
await s.click('#zaehne-tropfen');
let weit = 0;
let blick = 0;
let gesprossen = false;
for (let i = 0; i < 50; i++) {
  const z = await O('zaehne');
  const k = await O('kiefer');
  weit = Math.max(weit, z.lang);
  blick = Math.max(blick, k.blick);
  if (z.spriesst) gesprossen = true;
  if (i === 14) await bild('1-spriessen');
  if (gesprossen && !z.spriesst && k.blick === 0) break;
  await s.waitForTimeout(100);
}
await ruhig();
const z2 = await O('zaehne');
const oben = z2.plaetze.filter((q) => !q.unten).length;
const unten = z2.plaetze.filter((q) => q.unten).length;
ok(
  'Z2 ein Tipp: zwei Zahnreihen (oben zwölf, unten elf), sie sprießen bei offenem Maul; danach zu, die Zähne stecken im Maul, der Tropfen ist weg',
  !!z2.werte && z2.werte.oben.anzahl === 12 && z2.werte.unten.anzahl === 11 && oben === 12 && unten === 11 && gesprossen && blick > 0.9 && weit > 5 && !!z2.netz && z2.netz.endlich && z2.lang < 0.01 && !z2.tropfen && (await O('kiefer')).schritte === schritte0 + 1,
  `Plätze oben ${oben}, unten ${unten} (davon Spiegelbilder ${z2.plaetze.filter((q) => q.gespiegelt).length}); beim Sprießen: Blick bis ${blick.toFixed(2)}, längster Zahn bis ${weit.toFixed(1)}; danach: Netz ${z2.netz ? `${z2.netz.punkte} Punkte, ${z2.netz.dreiecke} Dreiecke, endlich ${z2.netz.endlich}` : 'keins'}, längster ${z2.lang.toFixed(3)}; Tropfen ${z2.tropfen ? 'noch da' : 'weg'}`,
);
if (z2.werte) {
  // Z3 „Fressen“ an
  await s.click('#fressen-knopf');
  await s.waitForTimeout(1500);
  await ruhig();
  const z3 = await O('zaehne');
  await bild('2-fressen');
  // den Unterkiefer weiter auf (der Regler der Tafel)
  await s.evaluate(() => {
    const r = document.getElementById('fressen-maul');
    r.value = '55';
    r.dispatchEvent(new Event('input', { bubbles: true }));
    r.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await s.waitForTimeout(900);
  const z3b = await O('zaehne');
  await bild('3-weiter');
  const massen = z2.plaetze.map((q) => q.mass);
  ok(
    'Z3 „Fressen“ an: die Zähne stehen im offenen Maul; den Unterkiefer weiter geöffnet: sie gehen mit, keiner wird kürzer',
    !!z3.netz && z3.netz.endlich && z3.lang > 5 && z3.lang < 45 && !!z3b.netz && z3b.netz.endlich && z3b.lang >= z3.lang - 0.01 && (await O('pose')).kiefer === 55,
    `offen (34°/8°): längster Zahn ${z3.lang.toFixed(1)}; bei 55°: ${z3b.lang.toFixed(1)}; Maße der Zähne ${Math.min(...massen).toFixed(1)} bis ${Math.max(...massen).toFixed(1)}`,
  );
  // Z4 „Fressen“ aus
  await s.click('#fressen-knopf');
  await s.waitForTimeout(1500);
  await ruhig();
  const z4 = await O('zaehne');
  ok('Z4 „Fressen“ aus: wieder zu, kein Zahn hat Länge', !!z4.netz && z4.lang < 0.01 && !(await O('pose')).an, `längster Zahn ${z4.lang.toFixed(3)}`);
  // Z5 ⌘Z: erst der Regler, dann die Zähne, dann das Maul
  let weg = false;
  for (let i = 0; i < 6; i++) {
    await s.keyboard.press('Meta+z');
    await s.waitForTimeout(600);
    if ((await O('zaehne')).werte === null) {
      weg = true;
      break;
    }
  }
  await s.waitForTimeout(600);
  const z5 = await O('zaehne');
  const maulNoch = (await O('werkLinienDaten')).some((l) => l.maulEcht);
  await s.keyboard.press('Meta+z');
  await ruhig();
  const maulWeg = !(await O('werkLinienDaten')).some((l) => l.maulEcht);
  ok('Z5 ⌘Z nimmt die Zähne zurück (der Tropfen hängt wieder), ein weiteres das Maul', weg && z5.werte === null && z5.netz === null && z5.tropfen && maulNoch && maulWeg, `Zähne ${z5.werte ? 'noch da' : 'weg'}, Tropfen ${z5.tropfen ? 'da' : 'fehlt'}; das Maul danach ${maulWeg ? 'weg' : 'noch da'}`);
}
ok('Z6 keine Fehler in der Konsole', fehler.length === 0, fehler.slice(0, 4).join(' | '));
await browser.close();
console.log(schlecht ? `${schlecht} Kriterien nicht erfüllt` : 'alle Kriterien erfüllt');
process.exit(schlecht ? 1 : 0);
