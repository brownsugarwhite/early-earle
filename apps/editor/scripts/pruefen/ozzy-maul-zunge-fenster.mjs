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
// Zweite Scheibe (die Linse der Zunge):
//   N1 Ein Tipp auf den Tropfen „Zunge“ öffnet die Linse für die Zunge: vier Zeichen am Formenring, sechs Perlen, keine Reihen,
//      eine Perle für die Farbe; in der Linse liegt die Zunge (rosa Bildpunkte); das Maul steht offen, nur dieser Tropfen ist gedrückt.
//   N2 Ein Tipp auf „Spitz“ am Formenring: Die Zunge trägt die Werte der Vorlage, die Linse zeigt sie an der Marke; die gezeigten
//      Werte laufen den gesetzten nach und kommen an. Ein Schritt.
//   N3 „Gespalten“: Sie hat eine Gabel. „Lang“: Sie reicht über die Lippe hinaus (Knoten vor der Lippe) und hängt dort durch.
//   N4 Die Perle „B“ angetippt, am Rad der Maus gedreht: Ihre Breite ändert sich, sonst nichts. Ein Schritt.
//   N5 Die Perle „G“ (Gabel) und das Rad der Maus: Die lange Zunge bekommt eine Gabel.
//   N6 Die Farbe über die Perle der Linse: Die Zunge trägt sie im Maul und in der Linse, die Perle zeigt sie.
//   N7 ⌘Z nimmt Griff für Griff zurück (Farbe, Gabel, Breite, Lang, Gespalten, Spitz); die Marke folgt.
//   N8 Der Tropfen „Zähne“ stellt die Linse auf die Zähne um (acht Zeichen, zwei Reihen), der Tropfen „Zunge“ wieder zurück.
//   N9 ⌫ bei offener Linse nimmt die Zunge (ein Schritt, die Linse schließt); ⌘Z holt sie zurück.
//   N10 Esc schließt die Linse: Das Maul geht zu, kein Tropfen ist gedrückt.
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
  !!u2.werte && gewachsen && !!u2.netz && u2.netz.endlich && u2.netz.punkte === 222 && u2.offen && (await gedrueckt()) && k2.blick > 0.95 && !!u2.kette && u2.kette.dick > 0.5 && !u2.kette.bewegt && k2.schritte === schritte0 + 1,
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
  await ruhig();

  // ---------- die Linse der Zunge ----------
  const FORMEN = 20;
  const PERLEN = 48;
  const perleGrad = (i) => (0.62 + 0.115 * i) * 180;
  const anLinse = async (grad, ueber) => {
    const l = (await O('zunge')).linse;
    const r = l.innen / 2 + ueber;
    const w = (grad * Math.PI) / 180;
    return [l.mitte[0] + r * Math.cos(w), l.mitte[1] + r * Math.sin(w)];
  };
  /** am Rad der Maus drehen, über der Linse (der Weg zählt in Gerätepunkten: zwei je CSS-Pixel) */
  const mausRad = async (bogen) => {
    const l = (await O('zunge')).linse;
    await s.mouse.move(l.mitte[0], l.mitte[1]);
    await s.waitForTimeout(120);
    await s.mouse.wheel(0, (-bogen / 0.004) * 2);
    await s.waitForTimeout(500);
  };
  /** warten, bis die gezeigten Werte angekommen sind und die Zunge ruht */
  const zungeRuht = async () => {
    for (let i = 0; i < 80; i++) {
      await s.waitForTimeout(100);
      const z = await O('zunge');
      if (!z.kette || (!z.laeuftNach && !z.kette.bewegt)) return true;
    }
    return false;
  };
  const ringe = () =>
    s.evaluate(() => ({
      zeichen: document.querySelectorAll('#linse .ring-zeichen').length,
      perlen: [...document.querySelectorAll('#linse .perle text')].map((t) => t.textContent).join(''),
      reihen: document.querySelectorAll('#linse .reihe').length,
      farbe: document.querySelector('#linse .farbperle circle')?.getAttribute('fill') ?? null,
      namen: [...document.querySelectorAll('#linse .ring-zeichen title')].map((t) => t.textContent).join(','),
    }));
  /** die Bildpunkte der Linse: wie viele im runden Feld etwas zeigen und ihre mittlere Farbe */
  const linseBild = () =>
    s.evaluate(() => {
      window.__ozzy.linseZeichnen();
      const c = document.querySelector('#linse canvas.linse-bild');
      const k = document.createElement('canvas');
      k.width = k.height = 64;
      const z = k.getContext('2d');
      z.drawImage(c, 0, 0, 64, 64);
      const d = z.getImageData(0, 0, 64, 64).data;
      let n = 0;
      const sum = [0, 0, 0];
      let [oben, unten] = [64, -1];
      for (let y = 0; y < 64; y++) {
        for (let x = 0; x < 64; x++) {
          const i = 4 * (y * 64 + x);
          if (d[i + 3] < 128) continue;
          n++;
          sum[0] += d[i];
          sum[1] += d[i + 1];
          sum[2] += d[i + 2];
          oben = Math.min(oben, y);
          unten = Math.max(unten, y);
        }
      }
      return { anteil: n / (64 * 64), farbe: n ? sum.map((v) => Math.round(v / n)) : [0, 0, 0], hoch: n ? (unten - oben + 1) / 64 : 0 };
    });
  const zaehneGedrueckt = () => s.evaluate(() => document.getElementById('zaehne-tropfen').getAttribute('aria-pressed') === 'true');
  const schritteJetzt = async () => (await O('kiefer')).schritte;

  // N1 der Tropfen öffnet die Linse für die Zunge
  await s.click('#zunge-tropfen');
  await s.waitForTimeout(1200);
  await zungeRuht();
  const n1 = await O('zunge');
  const r1 = await ringe();
  const b1 = await linseBild();
  await bild('6-linse');
  ok(
    'N1 der Tropfen „Zunge“ öffnet die Linse für die Zunge: vier Zeichen, sechs Perlen, keine Reihen, eine Perle für die Farbe; in der Linse liegt die Zunge; das Maul steht offen, nur dieser Tropfen ist gedrückt',
    n1.linse.offen && n1.offen && n1.linse.perle === 'L' && n1.linse.vorlage === 0 && r1.zeichen === 4 && r1.perlen === 'LBDRSG' && r1.reihen === 0 && !!r1.farbe && r1.namen === 'Rund,Spitz,Gespalten,Lang' && b1.anteil > 0.08 && b1.hoch > 0.5 && b1.farbe[0] > 1.3 * b1.farbe[1] && (await gedrueckt()) && !(await zaehneGedrueckt()) && (await O('kiefer')).blick > 0.95 && !(await O('zaehne')).linse.offen,
    `Zeichen ${r1.zeichen} (${r1.namen}), Perlen „${r1.perlen}“, Reihen ${r1.reihen}, Farbperle ${r1.farbe}; Perle „${n1.linse.perle}“, Vorlage ${n1.linse.vorlage}; in der Linse: ${(100 * b1.anteil).toFixed(0)} % des Felds, ${(100 * b1.hoch).toFixed(0)} % hoch, Farbe ${b1.farbe.join('/')}`,
  );
  // N2 „Spitz“: das zweite Zeichen von vieren steht rechts (90° neben der Marke)
  const s0 = await schritteJetzt();
  {
    const [x, y] = await anLinse(0, FORMEN);
    await klick(x, y);
  }
  const lief = (await O('zunge')).laeuftNach;
  const kam = await zungeRuht();
  const n2 = await O('zunge');
  await bild('7-spitz');
  ok(
    'N2 ein Tipp auf „Spitz“: die Zunge trägt die Werte der Vorlage, die Linse zeigt sie an der Marke; die gezeigten Werte laufen nach und kommen an; ein Schritt',
    n2.werte.form === 1 && n2.werte.spitz === 1 && n2.werte.gabel === 0 && Math.abs(n2.werte.laenge - 0.84) < 1e-9 && n2.linse.vorlage === 1 && lief && kam && !n2.laeuftNach && Math.abs(n2.gezeigt.spitz - 1) < 1e-9 && n2.netz.endlich && (await schritteJetzt()) === s0 + 1,
    `Vorlage ${n2.werte.form}, Spitze ${n2.werte.spitz}, Länge ${n2.werte.laenge}; an der Marke ${n2.linse.vorlage}; lief nach: ${lief}, angekommen: ${kam}; Schritte +${(await schritteJetzt()) - s0}`,
  );
  // N3 „Gespalten“ und „Lang“ (jeweils das Zeichen rechts neben dem, das an der Marke steht)
  {
    const [x, y] = await anLinse(0, FORMEN);
    await klick(x, y);
  }
  await zungeRuht();
  const n3a = await O('zunge');
  const b3a = await linseBild();
  await bild('8-gespalten');
  {
    const [x, y] = await anLinse(0, FORMEN);
    await klick(x, y);
  }
  await zungeRuht();
  await s.waitForTimeout(600);
  const n3b = await O('zunge');
  await bild('9-lang');
  ok(
    'N3 „Gespalten“: sie hat eine Gabel; „Lang“: sie reicht über die Lippe hinaus und hängt dort durch',
    n3a.werte.form === 2 && n3a.werte.gabel === 1 && n3a.platz.gabel > 0.05 * n3a.kette.ruheLaenge && n3a.platz.draussen === 0 && n3a.netz.endlich && b3a.anteil > 0.04 && n3b.werte.form === 3 && n3b.linse.vorlage === 3 && n3b.platz.draussen >= 2 && n3b.platz.gabel === 0 && n3b.kette.ruheLaenge > 1.02 * n3b.kette.lang && n3b.kette.spitzeAb > 0.03 * n3b.kette.lang && !n3b.kette.bewegt && n3b.netz.endlich && (await schritteJetzt()) === s0 + 3,
    `gespalten: Gabel ${n3a.platz.gabel.toFixed(1)} bei Länge ${n3a.kette.ruheLaenge.toFixed(1)}; lang: ${n3b.platz.draussen} Knoten vor der Lippe, Länge ${n3b.kette.ruheLaenge.toFixed(1)} bei Mittellinie ${n3b.kette.lang.toFixed(1)}, die Spitze hängt ${n3b.kette.spitzeAb.toFixed(1)} unter ihrem Platz; Schritte +${(await schritteJetzt()) - s0}`,
  );
  // N4 die Perle „B“ und das Rad der Maus
  {
    const [x, y] = await anLinse(perleGrad(1), PERLEN);
    await klick(x, y);
    await mausRad(-0.5);
  }
  await zungeRuht();
  const n4 = await O('zunge');
  ok(
    'N4 die Perle „B“ angetippt, am Rad der Maus gedreht: ihre Breite ändert sich, sonst nichts; ein Schritt',
    n4.linse.perle === 'B' && n4.werte.breite < n3b.werte.breite - 0.05 && n4.werte.laenge === n3b.werte.laenge && n4.werte.dicke === n3b.werte.dicke && n4.werte.form === 3 && (await schritteJetzt()) === s0 + 4,
    `Perle „${n4.linse.perle}“; Breite ${n3b.werte.breite} → ${n4.werte.breite}; Schritte +${(await schritteJetzt()) - s0}`,
  );
  // N5 die Perle „G“ (Gabel)
  {
    const [x, y] = await anLinse(perleGrad(5), PERLEN);
    await klick(x, y);
    await mausRad(1.2);
  }
  await zungeRuht();
  const n5 = await O('zunge');
  await bild('10-lang-gabel');
  ok('N5 die Perle „G“ und das Rad der Maus: die lange Zunge bekommt eine Gabel', n5.linse.perle === 'G' && n5.werte.gabel > 0.3 && n5.platz.gabel > 0 && n5.werte.breite === n4.werte.breite && n5.netz.endlich && (await schritteJetzt()) === s0 + 5, `Perle „${n5.linse.perle}“; Gabel ${n5.werte.gabel}; Schritte +${(await schritteJetzt()) - s0}`);
  // N6 die Farbe über das Farbfeld der Linse
  await s.evaluate(() => {
    document.querySelector('#linse .farbperle').dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await s.waitForTimeout(200);
  await s.evaluate(() => {
    const f = document.querySelector('#linse .linse-farbfeld');
    f.value = '#2244ee';
    f.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await s.waitForTimeout(600);
  await s.keyboard.press('Escape').catch(() => {});
  await s.waitForTimeout(300);
  const n6 = await O('zunge');
  const b6 = await linseBild();
  const r6 = await ringe();
  const f6 = n6.mitte ? await punktFarbe(n6.mitte[0], n6.mitte[1]) : [0, 0, 0, 0];
  await bild('11-farbe');
  ok(
    'N6 die Farbe über die Perle der Linse: die Zunge trägt sie im Maul und in der Linse, die Perle zeigt sie',
    n6.werte?.farbe === '#2244ee' && r6.farbe === '#2244ee' && b6.farbe[2] > 1.3 * b6.farbe[0] && f6[2] > 1.3 * f6[0] && n6.linse.offen && (await schritteJetzt()) === s0 + 6,
    `Farbe ${n6.werte?.farbe}; Perle ${r6.farbe}; in der Linse ${b6.farbe.join('/')}; im Maul ${f6.slice(0, 3).join('/')}; Linse ${n6.linse.offen ? 'offen' : 'zu'}; Schritte +${(await schritteJetzt()) - s0}`,
  );
  // N7 ⌘Z: Griff für Griff zurück
  {
    const stufen = [];
    await zurueck();
    let z = await O('zunge');
    stufen.push(z.werte?.farbe === undefined && z.werte?.gabel === n5.werte.gabel);
    await zurueck();
    z = await O('zunge');
    stufen.push(z.werte?.gabel === 0 && z.werte?.breite === n4.werte.breite);
    await zurueck();
    z = await O('zunge');
    stufen.push(z.werte?.breite === n3b.werte.breite && z.werte?.form === 3);
    await zurueck();
    await zungeRuht();
    z = await O('zunge');
    stufen.push(z.werte?.form === 2 && z.linse.vorlage === 2 && z.linse.offen);
    await zurueck();
    await zungeRuht();
    z = await O('zunge');
    stufen.push(z.werte?.form === 1 && z.linse.vorlage === 1);
    await zurueck();
    await zungeRuht();
    z = await O('zunge');
    stufen.push(z.werte?.form === 0 && z.linse.vorlage === 0 && z.werte?.laenge === 0.78 && z.linse.offen && (await schritteJetzt()) === s0);
    ok('N7 ⌘Z nimmt Griff für Griff zurück (Farbe, Gabel, Breite, Lang, Gespalten, Spitz); die Marke folgt', stufen.every(Boolean), ['Farbe', 'Gabel', 'Breite', 'Lang', 'Gespalten', 'Spitz'].map((n, i) => `${n} ${stufen[i] ? 'gut' : 'FEHL'}`).join(', '));
  }
  // N8 der Tropfen „Zähne“ stellt die Linse um, der Tropfen „Zunge“ wieder zurück
  await s.click('#zaehne-tropfen');
  await s.waitForTimeout(900);
  const n8a = await O('zaehne');
  const n8az = await O('zunge');
  const r8a = await ringe();
  await bild('12-zaehne');
  await s.click('#zunge-tropfen');
  await s.waitForTimeout(900);
  const n8b = await O('zunge');
  const r8b = await ringe();
  const b8 = await linseBild();
  ok(
    'N8 der Tropfen „Zähne“ stellt die Linse auf die Zähne um (acht Zeichen, zwei Reihen), der Tropfen „Zunge“ wieder zurück',
    n8a.linse.offen && !n8az.linse.offen && !n8az.offen && r8a.zeichen === 8 && r8a.reihen === 2 && r8a.perlen === '#GNVS' && n8a.linse.perle === '#' && n8b.linse.offen && !(await O('zaehne')).linse.offen && r8b.zeichen === 4 && r8b.reihen === 0 && r8b.perlen === 'LBDRSG' && b8.farbe[0] > 1.3 * b8.farbe[1] && (await gedrueckt()) && !(await zaehneGedrueckt()),
    `bei den Zähnen: ${r8a.zeichen} Zeichen, ${r8a.reihen} Reihen, Perlen „${r8a.perlen}“; zurück bei der Zunge: ${r8b.zeichen} Zeichen, ${r8b.reihen} Reihen, Perlen „${r8b.perlen}“, Farbe in der Linse ${b8.farbe.join('/')}`,
  );
  // N9 ⌫ nimmt die Zunge, ⌘Z holt sie zurück (sind an der Form noch Punkte gewählt, gilt ⌫ ihnen: Esc leert erst die Auswahl)
  {
    const gewaehlt = (await O('bearbeiten')).auswahl.length;
    if (gewaehlt > 0) {
      await s.keyboard.press('Escape');
      await s.waitForTimeout(400);
    }
    const linseBlieb = (await O('zunge')).linse.offen && (await O('bearbeiten')).auswahl.length === 0;
    console.log(`     (vor ⌫: ${gewaehlt} Punkte der Form waren gewählt; Esc hat die Auswahl geleert, die Linse blieb ${linseBlieb ? 'offen' : 'NICHT offen'})`);
    const sv = await schritteJetzt();
    await s.keyboard.press('Backspace');
    await s.waitForTimeout(900);
    const weg = await O('zunge');
    const form = (await O('werkLinienDaten')).length;
    const sn = await schritteJetzt();
    await zurueck();
    await s.waitForTimeout(600);
    const da = await O('zunge');
    ok('N9 ⌫ bei offener Linse nimmt die Zunge (ein Schritt, die Linse schließt, die Form bleibt); ⌘Z holt sie zurück', weg.werte === null && weg.netz === null && !weg.linse.offen && sn === sv + 1 && form > 0 && !!da.werte && !!da.netz && da.werte.laenge === 0.78, `nach ⌫: Zunge ${weg.werte ? 'noch da' : 'weg'}, Linse ${weg.linse.offen ? 'offen' : 'zu'}, Schritte +${sn - sv}, Linien der Form ${form}; nach ⌘Z: ${da.werte ? 'wieder da' : 'fehlt'}`);
  }
  // N10 Esc schließt die Linse
  await s.click('#zunge-tropfen');
  await s.waitForTimeout(900);
  const offenVor = (await O('zunge')).linse.offen;
  for (let i = 0; i < 2 && (await O('zunge')).linse.offen; i++) {
    await s.keyboard.press('Escape');
    await s.waitForTimeout(500);
  }
  await s.waitForTimeout(900);
  const n10 = await O('zunge');
  ok('N10 Esc schließt die Linse: das Maul geht zu, kein Tropfen ist gedrückt', offenVor && !n10.linse.offen && !n10.offen && !(await gedrueckt()) && !(await zaehneGedrueckt()) && (await O('kiefer')).blick < 0.05 && !!n10.werte && (await O('werkLinienDaten')).length > 0, `vorher ${offenVor ? 'offen' : 'zu'}, danach ${n10.linse.offen ? 'offen' : 'zu'}; Blick ${(await O('kiefer')).blick.toFixed(2)}`);
}
ok('U8 keine Fehler in der Konsole', fehler.length === 0, fehler.slice(0, 4).join(' | '));
await browser.close();
console.log(schlecht ? `${schlecht} Kriterien nicht erfüllt` : 'alle Kriterien erfüllt');
process.exit(schlecht ? 1 : 0);
