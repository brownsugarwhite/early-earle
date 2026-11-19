// Ozzy, Paint-Modus, Etappe 3, zweiter Schritt (19.11.2026; Plan docs/plans/2026-11-19-ozzy-paint-modus.md, Abschnitt 13): Farben als
// Tropfen unter der Leiste, der Farbtropfen (F), die Pipette (I). An einer frischen Kugel auf Wachs, ohne Einlaufen (`fuellen=0`:
// Die Farbe steht gleich nach dem Klick).
//   30  Farbtropfen, Pipette und die Farben stehen nur im Paint-Modus in der Leiste; F und I tun außerhalb nichts.
//   31  F: Der Tropfen hängt überall über der Form am Zeiger, auch über einer Farblinie (mit A hängt dort die Farblinie); ein Klick
//       auf die Farblinie füllt und greift nichts.
//   32  Einen Tropfen der Leiste antippen wählt seine Farbe; der Klick mit F füllt mit ihr.
//   33  I: Der Ring am Zeiger zeigt die Farbe unter ihm (leer, wo keine liegt). Ein Klick nimmt sie auf: Steht sie in der Leiste,
//       ist ihr Tropfen gewählt, sonst kommt sie als neuer dazu; danach gilt der Farbtropfen. Auf freier Haut ändert sich nichts.
//   34  ⌥ + Klick mit dem Farbtropfen nimmt die Farbe auf wie die Pipette.
//   35  Einen Tropfen aus der Leiste auf die Form ziehen füllt dort mit seiner Farbe; neben der Form losgelassen geschieht nichts;
//       auf dem Mülleimer losgelassen ist die Farbe verworfen.
//   36  Die Farbe des gewählten Tropfens ändern (über das Farbfeld, wie der Farbwähler); nach dem Neuladen stehen dieselben Farben da.
//   37  B aus dem Farbtropfen heraus: zurück bei den Punkten, die Farben sind weg.
//   38  Keine Fehler in der Konsole.
// Aufruf aus apps/editor: GPU=1 OZZY_URL=http://localhost:5215/ozzy.html node scripts/pruefen/ozzy-farbe-tropfen-fenster.mjs [ordner für Bilder]
import fs from 'node:fs';
import { auf } from './ozzy-teile.mjs';

const ordner = process.argv[2] ?? '';
const t = await auf({ dichte: 1, extra: 'ohneLinie=0&material=wachs&fuellen=0' });
const { browser, s, O, geladen, klick, ziehen, fehler } = t;
let schlecht = 0;
const ok = (name, gut, text = '') => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};
/** ein Bild rechnen und die Farben der Haut an den Stellen lesen (CSS-Pixel) */
const lesen = async (punkte) =>
  s.evaluate((punkte) => {
    const o = window.__ozzy;
    o.bild(1 / 60);
    const haut = document.getElementById('haut');
    const c = new OffscreenCanvas(haut.width, haut.height);
    const g = c.getContext('2d');
    g.drawImage(haut, 0, 0);
    const k = haut.width / window.innerWidth;
    return punkte.map(([x, y]) => Array.from(g.getImageData(Math.round(x * k), Math.round(y * k), 1, 1).data.slice(0, 3)));
  }, punkte);
/** die Mitte des Tropfens Nummer i in der Leiste (CSS-Pixel); −1: der hohle mit dem Plus */
const tropfenBei = (i) =>
  s.evaluate((i) => {
    const b = i < 0 ? document.querySelector('#farbleiste button.farbe.neu') : document.querySelectorAll('#farbleiste .reihe button.farbe')[i];
    const r = b.getBoundingClientRect();
    return [r.left + r.width / 2, r.top + 10];
  }, i);
const leiste = () => O('farbLeiste');
const blau = (c) => c[2] > c[0] + 50 && c[2] > 120;
const rot = (c) => c[0] > c[2] + 70 && c[0] > c[1] + 50;

const [cx, cy, R, k] = [720, 450, 150, 0.5523 * 150];
await O('form', [
  { x: cx + R, y: cy, ein: [0, -k], aus: [0, k] },
  { x: cx, y: cy + R, ein: [k, 0], aus: [-k, 0] },
  { x: cx - R, y: cy, ein: [0, k], aus: [0, -k] },
  { x: cx, y: cy - R, ein: [-k, 0], aus: [k, 0] },
]);
await s.waitForTimeout(300);
await O('aufblasen');
await geladen();
await s.waitForTimeout(800);

// ---------- 30: nur im Paint-Modus ----------
{
  const malGruppe = () => s.evaluate(() => !document.querySelector('#leiste .mal-gruppe').hidden);
  const vorher = { farben: (await leiste()).zu_sehen, werkzeuge: await malGruppe() };
  await s.keyboard.press('f');
  await s.waitForTimeout(200);
  const nachF = (await leiste()).werkzeug;
  const meldung = (await O('bearbeiten')).meldung;
  await s.keyboard.press('i');
  await s.waitForTimeout(200);
  const nachI = (await leiste()).werkzeug;
  await s.keyboard.press('b');
  await s.waitForTimeout(700);
  const drin = { farben: (await leiste()).zu_sehen, werkzeuge: await malGruppe() };
  ok(
    '30 Farbtropfen, Pipette und die Farben stehen nur im Paint-Modus in der Leiste; F und I tun außerhalb nichts',
    !vorher.farben && !vorher.werkzeuge && nachF === 'auswahl' && nachI === 'auswahl' && /Paint-Modus/.test(meldung) && drin.farben && drin.werkzeuge,
    `vor B: Farben ${vorher.farben}, Werkzeuge ${vorher.werkzeuge}; F → ${nachF} („${meldung}“), I → ${nachI}; nach B: Farben ${drin.farben}, Werkzeuge ${drin.werkzeuge}`,
  );
}

// eine geschlossene Farblinie (Fünfeck)
await s.keyboard.press('p');
await s.waitForTimeout(400);
const M = [690, 420];
const ecken = [0, 1, 2, 3, 4].map((i) => [Math.round(M[0] + 55 * Math.cos((i * 2 * Math.PI) / 5)), Math.round(M[1] + 45 * Math.sin((i * 2 * Math.PI) / 5))]);
for (const [x, y] of [...ecken, ecken[0]]) await klick(x, y);
await s.keyboard.press('a');
await s.waitForTimeout(400);
const aussen = [800, 520];
if (ordner) fs.writeFileSync(`${ordner}/ozzy-farbe-tropfen-0.png`, await s.screenshot());

// ---------- 31: F hängt überall, greift nichts ----------
{
  const E = ecken[2];
  await s.mouse.move(E[0], E[1], { steps: 4 });
  await s.waitForTimeout(500);
  const mitA = { tropfen: (await leiste()).tropfen, haengt: (await O('bearbeiten')).haengt };
  await s.keyboard.press('f');
  await s.mouse.move(E[0] + 1, E[1], { steps: 2 });
  await s.waitForTimeout(500);
  const mitF = { werkzeug: (await leiste()).werkzeug, tropfen: (await leiste()).tropfen, haengt: (await O('bearbeiten')).haengt };
  const f0 = await O('farbe');
  await klick(E[0], E[1]);
  const f1 = await O('farbe');
  const b = await O('bearbeiten');
  ok(
    '31 F: Der Tropfen hängt auch über einer Farblinie am Zeiger; ein Klick dort füllt und greift nichts',
    mitA.haengt && mitA.tropfen === null && mitF.werkzeug === 'tropfen' && mitF.tropfen !== null && !mitF.haengt && f1.fuellungen === f0.fuellungen + 1 && b.auswahl.length === 0 && f1.linien === f0.linien,
    `mit A am Punkt der Farblinie: hängt ${mitA.haengt}, Tropfen ${mitA.tropfen}; mit F: hängt ${mitF.haengt}, Tropfen „${mitF.tropfen}“; Klick: Füllungen ${f0.fuellungen} → ${f1.fuellungen}, gewählt ${b.auswahl.length}`,
  );
  await s.keyboard.press('Meta+z');
  await s.waitForTimeout(300);
}

// ---------- 32: antippen wählt, F füllt mit der Farbe ----------
{
  const [x, y] = await tropfenBei(5);
  await klick(x, y);
  const L = await leiste();
  await klick(M[0], M[1]);
  await s.mouse.move(1380, 700);
  const [c] = await lesen([[M[0], M[1]]]);
  const zeichen = await s.evaluate(() => getComputedStyle(document.querySelector('#leiste .werkzeug svg .farbe')).fill);
  ok('32 Einen Tropfen der Leiste antippen wählt seine Farbe; der Klick mit F füllt mit ihr', L.wahl === 5 && L.gewaehlt === '#3f7fd0' && L.werkzeug === 'tropfen' && blau(c) && /63, 127, 208/.test(zeichen), `gewählt ${L.gewaehlt} (Tropfen ${L.wahl}), das Zeichen in der Leiste ${zeichen}; im Fünfeck steht ${c.join(', ')}`);
}

// ---------- 33: die Pipette ----------
{
  // zuerst Gelb wählen, dann mit I über dem blauen Fünfeck und über freier Haut
  const [gx, gy] = await tropfenBei(1);
  await klick(gx, gy);
  await s.keyboard.press('i');
  await s.mouse.move(M[0], M[1], { steps: 4 });
  await s.waitForTimeout(400);
  const ueberBlau = await leiste();
  const ringFarbe = await s.evaluate(() => getComputedStyle(document.getElementById('farbtropfen')).backgroundColor);
  await s.mouse.move(aussen[0], aussen[1], { steps: 4 });
  await s.waitForTimeout(400);
  const ueberFrei = await leiste();
  // auf freier Haut: nichts ändert sich
  await klick(aussen[0], aussen[1]);
  const nachFrei = await leiste();
  const meldung = (await O('bearbeiten')).meldung;
  // auf dem blauen Fünfeck: Blau steht in der Leiste, sein Tropfen ist gewählt, weiter mit dem Farbtropfen
  await klick(M[0], M[1]);
  const nachBlau = await leiste();
  // eine Farbe, die nicht in der Leiste steht (gesetzt über den Haken), aufnehmen: Sie kommt als neuer Tropfen dazu
  await O('farbFuellen', aussen[0], aussen[1], [0.2, 0.7, 0.3]);
  await s.waitForTimeout(300);
  await s.keyboard.press('i');
  await klick(aussen[0], aussen[1]);
  const nachNeu = await leiste();
  ok(
    '33 I: Der Ring zeigt die Farbe unter dem Zeiger; ein Klick nimmt sie auf (vorhandener Tropfen gewählt, sonst ein neuer), dann gilt der Farbtropfen',
    ueberBlau.werkzeug === 'pipette' &&
      ueberBlau.tropfen === 'pipette' &&
      /63, 127, 208/.test(ringFarbe) &&
      ueberFrei.tropfen === 'pipette leer' &&
      nachFrei.gewaehlt === '#f6c445' &&
      nachFrei.werkzeug === 'pipette' &&
      /keine Farbe/.test(meldung) &&
      nachBlau.gewaehlt === '#3f7fd0' &&
      nachBlau.wahl === 5 &&
      nachBlau.farben.length === 8 &&
      nachBlau.werkzeug === 'tropfen' &&
      nachNeu.gewaehlt === '#33b34d' &&
      nachNeu.farben.length === 9 &&
      nachNeu.wahl === 8 &&
      nachNeu.werkzeug === 'tropfen',
    `über Blau: Ring „${ueberBlau.tropfen}“ in ${ringFarbe}; über freier Haut: „${ueberFrei.tropfen}“, Klick dort: gewählt bleibt ${nachFrei.gewaehlt} („${meldung}“); Klick auf Blau: ${nachBlau.gewaehlt}, Tropfen ${nachBlau.wahl} von ${nachBlau.farben.length}, Werkzeug ${nachBlau.werkzeug}; neue Farbe: ${nachNeu.gewaehlt}, Tropfen ${nachNeu.wahl} von ${nachNeu.farben.length}`,
  );
}

// ---------- 34: ⌥ + Klick mit dem Farbtropfen ----------
{
  const [gx, gy] = await tropfenBei(1);
  await klick(gx, gy);
  const f0 = await O('farbe');
  await s.keyboard.down('Alt');
  await s.mouse.move(M[0], M[1], { steps: 4 });
  await s.waitForTimeout(400);
  const ring = (await leiste()).tropfen;
  await klick(M[0], M[1]);
  await s.keyboard.up('Alt');
  await s.waitForTimeout(200);
  const L = await leiste();
  const f1 = await O('farbe');
  ok('34 ⌥ + Klick mit dem Farbtropfen nimmt die Farbe auf wie die Pipette', ring === 'pipette' && L.gewaehlt === '#3f7fd0' && L.werkzeug === 'tropfen' && f1.fuellungen === f0.fuellungen, `Ring „${ring}“; gewählt ${L.gewaehlt}, Werkzeug ${L.werkzeug}, Füllungen ${f0.fuellungen} → ${f1.fuellungen}`);
}

// ---------- 35: einen Tropfen aus der Leiste ziehen ----------
{
  // mit A (das Ziehen füllt mit jedem Werkzeug)
  await s.keyboard.press('a');
  await s.waitForTimeout(300);
  const ziel = [640, 530];
  const [rx, ry] = await tropfenBei(3);
  const f0 = await O('farbe');
  await s.mouse.move(rx, ry, { steps: 3 });
  await s.waitForTimeout(200);
  await s.mouse.down();
  for (let i = 1; i <= 12; i++) {
    await s.mouse.move(rx + ((ziel[0] - rx) * i) / 12, ry + ((ziel[1] - ry) * i) / 12);
    await s.waitForTimeout(25);
  }
  await s.waitForTimeout(150);
  const imZug = await leiste();
  const huelle = await s.evaluate(() => document.querySelectorAll('#farbleiste .reihe button.farbe')[3].classList.contains('unterwegs'));
  if (ordner) fs.writeFileSync(`${ordner}/ozzy-farbe-tropfen-zug.png`, await s.screenshot());
  await s.mouse.up();
  await s.waitForTimeout(700);
  const f1 = await O('farbe');
  const L1 = await leiste();
  await s.mouse.move(1380, 700);
  const [c] = await lesen([ziel]);
  // neben der Form losgelassen: nichts
  const [ox, oy] = await tropfenBei(2);
  await ziehen(ox, oy, 1100, 300);
  const f2 = await O('farbe');
  const L2 = await leiste();
  // auf dem Mülleimer losgelassen: die Farbe ist verworfen
  const muell = await s.evaluate(() => {
    const r = [...document.querySelectorAll('#leiste button.werkzeug')].find((b) => b.title.startsWith('Mülleimer')).getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  });
  const [ox2, oy2] = await tropfenBei(2);
  await ziehen(ox2, oy2, muell[0], muell[1]);
  const f3 = await O('farbe');
  const L3 = await leiste();
  ok(
    '35 Einen Tropfen auf die Form ziehen füllt dort; neben der Form geschieht nichts; auf dem Mülleimer ist die Farbe verworfen',
    imZug.tropfen === 'zieht' &&
      huelle &&
      f1.fuellungen === f0.fuellungen + 1 &&
      rot(c) &&
      L1.gewaehlt === '#e4503a' &&
      L1.werkzeug === 'auswahl' &&
      f2.fuellungen === f1.fuellungen &&
      L2.farben.length === L1.farben.length &&
      L2.gewaehlt === '#f08a3c' &&
      f3.fuellungen === f2.fuellungen &&
      L3.farben.length === L2.farben.length - 1 &&
      !L3.farben.includes('#f08a3c'),
    `im Zug: Tropfen „${imZug.tropfen}“, Hülle in der Leiste ${huelle}; losgelassen auf der Form: Füllungen ${f0.fuellungen} → ${f1.fuellungen}, dort steht ${c.join(', ')}, gewählt ${L1.gewaehlt}; neben der Form: Füllungen ${f2.fuellungen}, Farben ${L2.farben.length}; auf dem Mülleimer: Farben ${L2.farben.length} → ${L3.farben.length}, Füllungen ${f3.fuellungen}`,
  );
  if (ordner) fs.writeFileSync(`${ordner}/ozzy-farbe-tropfen-1.png`, await s.screenshot());
}

// ---------- 37: B aus dem Farbtropfen heraus ----------
{
  await s.keyboard.press('f');
  await s.waitForTimeout(200);
  const mitF = (await leiste()).werkzeug;
  await s.keyboard.press('b');
  await s.waitForTimeout(600);
  const L = await leiste();
  await s.keyboard.press('b');
  await s.waitForTimeout(600);
  ok('37 B aus dem Farbtropfen heraus: zurück bei den Punkten, die Farben sind weg', mitF === 'tropfen' && L.werkzeug === 'auswahl' && !L.zu_sehen && L.tropfen === null, `mit F: ${mitF}; nach B: Werkzeug ${L.werkzeug}, Farben zu sehen ${L.zu_sehen}`);
}

// ---------- 36: Farbe ändern, sie bleibt über das Neuladen ----------
{
  const vor = await leiste();
  await s.evaluate(() => {
    const f = document.getElementById('farbe-farbe');
    f.value = '#12ab89';
    f.dispatchEvent(new Event('input', { bubbles: true }));
    f.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await s.waitForTimeout(200);
  const nach = await leiste();
  await s.reload();
  await s.waitForFunction(() => !!window.__ozzy);
  await s.waitForTimeout(500);
  const neu = await leiste();
  ok(
    '36 Die Farbe des gewählten Tropfens ändern; nach dem Neuladen stehen dieselben Farben da',
    nach.farben.length === vor.farben.length && nach.farben[vor.wahl] === '#12ab89' && nach.gewaehlt === '#12ab89' && JSON.stringify(neu.farben) === JSON.stringify(nach.farben) && neu.wahl === nach.wahl && neu.gewaehlt === '#12ab89',
    `Tropfen ${vor.wahl}: ${vor.farben[vor.wahl]} → ${nach.farben[vor.wahl]}; nach dem Neuladen: ${neu.farben.length} Farben, gewählt ${neu.gewaehlt}`,
  );
}

ok('38 Keine Fehler in der Konsole', fehler.length === 0, fehler.slice(0, 3).join(' | '));
console.log(schlecht ? `${schlecht} FEHL` : 'alles gut');
await browser.close();
process.exit(schlecht ? 1 : 0);
