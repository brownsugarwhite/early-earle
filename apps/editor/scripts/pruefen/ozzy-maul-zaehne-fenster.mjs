// Ozzy, die Zähne und ihre Linse (Plan „Maul, Zähne, Zunge“, Etappe 5, erste und zweite Scheibe, 20.11.2026), an „teat firefish“
// (NAME) auf Wachs. Kriterien:
//   Z1 Mit dem Maul hängt unter der Leiste der Tropfen „Zähne“; Zähne gibt es noch keine, die Linse ist zu.
//   Z2 Ein Tipp: Das Maul hat zwei Zahnreihen (oben zwölf, unten elf), sie sprießen bei offenem Maul. Die Linse ist offen (sie gilt
//      beiden Reihen, die Perle „#“, die Vorlage „Tropfen“), der Tropfen ist gedrückt, das Maul bleibt offen.
//   L1 Der Drehregler, mit der Maus um gut 60° gedreht: vier Rasten, oben 12 → 16 Zähne, unten 15 (einer weniger).
//   L2 Ein Tipp auf das Zeichen „Spitz“ am Formenring: Beide Reihen tragen die Vorlage, die Linse zeigt sie, die Zähne werden länger.
//   L3 Die Perle „G“ angetippt und am Rad der Maus gedreht: Die Größe beider Reihen wächst.
//   L4 Die Perle der unteren Reihe angetippt: Die Linse gilt ihr allein; „#“ und das Rad der Maus stellen nur ihre Anzahl.
//   L5 ⌘Z nimmt Griff für Griff zurück (Anzahl unten, Größe, Vorlage, Anzahl); die Linse zeigt jeweils, was gilt.
//   L6 Esc schließt die Linse: Das Maul geht zu, kein Zahn hat Länge, der Tropfen ist nicht mehr gedrückt. Ein Tipp auf den Tropfen
//      öffnet sie wieder, noch einer schließt sie. (Ist noch etwas gewählt, leert das erste Esc die Auswahl.)
//   L7 Bei offener Linse an der Form gezogen (in der Seite, ein Punkt fern vom Maul): Solange gezogen wird, ist das Maul zu und kein
//      Zahn hat Länge; die Linse bleibt offen. Danach steht das Maul wieder offen, die Zähne sind da (12 und 11), es ist ein Schritt.
//   Z3 „Fressen“ an: Die Zähne stehen im offenen Maul (ihr Netz ist endlich; der längste ist zwischen 5 und 45 Einheiten lang). Den
//      Unterkiefer weiter geöffnet: Sie gehen mit, keiner wird kürzer. In der Pose stellt die Linse wie in der Grundform (eine Rast am
//      Rad der Maus: 12 → 13 und 12; ⌘Z nimmt es zurück).
// Dazu, nur zur Kenntnis: wie lange das Stellen eines Werts dauert (Plätze neu lesen) und die zwei Bilder danach.
//   Z4 „Fressen“ aus: wieder zu, kein Zahn hat Länge.
//   Z5 ⌘Z nimmt die Zähne zurück (der Tropfen hängt weiter da), ein weiteres das Maul.
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
const gedrueckt = () => s.evaluate(() => document.getElementById('zaehne-tropfen').getAttribute('aria-pressed') === 'true');
/** ein Ort an der Linse: Winkel in Grad (0 rechts, 90 unten), Abstand von ihrer Mitte als Rand über dem runden Feld (CSS-Pixel) */
const anLinse = async (grad, ueber) => {
  const l = (await O('zaehne')).linse;
  const r = l.innen / 2 + ueber;
  const w = (grad * Math.PI) / 180;
  return [l.mitte[0] + r * Math.cos(w), l.mitte[1] + r * Math.sin(w)];
};
/** Ringe der Linse (Abstand über dem runden Feld): Formenring 20, Drehregler 46, Perlen und Reihen 48 */
const FORMEN = 20;
const RAD = 46;
const PERLEN = 48;
const perleGrad = (i) => (0.62 + 0.115 * i) * 180;
const reiheGrad = (i) => -(0.3 - 0.115 * i) * 180;
/** am Rad der Maus drehen, über der Linse: `bogen` im Bogenmaß (15° sind eine Rast). Der Weg zählt hier in Gerätepunkten (zwei je CSS-Pixel) */
const mausRad = async (bogen) => {
  const l = (await O('zaehne')).linse;
  await s.mouse.move(l.mitte[0], l.mitte[1]);
  await s.waitForTimeout(120);
  await s.mouse.wheel(0, (-bogen / 0.004) * 2);
  await s.waitForTimeout(500);
};
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

// Z1 der Tropfen
const z1 = await O('zaehne');
ok('Z1 mit dem Maul hängt unter der Leiste der Tropfen „Zähne“; Zähne gibt es noch keine, die Linse ist zu', z1.tropfen && z1.werte === null && z1.netz === null && !z1.linse.offen && !(await gedrueckt()), `Tropfen ${z1.tropfen ? 'da' : 'fehlt'}; Werte ${z1.werte ? 'schon da' : 'keine'}; Linse ${z1.linse.offen ? 'offen' : 'zu'}`);
// Z2 ein Tipp: sie sprießen, die Linse geht auf
const schritte0 = (await O('kiefer')).schritte;
await s.click('#zaehne-tropfen');
let weit = 0;
let blick = 0;
let gesprossen = false;
for (let i = 0; i < 40; i++) {
  const z = await O('zaehne');
  const k = await O('kiefer');
  weit = Math.max(weit, z.lang);
  blick = Math.max(blick, k.blick);
  if (z.spriesst) gesprossen = true;
  if (i === 14) await bild('1-spriessen');
  if (gesprossen && !z.spriesst) break;
  await s.waitForTimeout(100);
}
await s.waitForTimeout(600);
const z2 = await O('zaehne');
const k2 = await O('kiefer');
const zahl = (z) => [z.plaetze.filter((q) => !q.unten).length, z.plaetze.filter((q) => q.unten).length];
const [oben2, unten2] = zahl(z2);
await bild('2-linse');
ok(
  'Z2 ein Tipp: zwei Zahnreihen (oben zwölf, unten elf), sie sprießen bei offenem Maul; die Linse ist offen (beide Reihen, Perle „#“, Vorlage „Tropfen“), der Tropfen gedrückt, das Maul bleibt offen',
  !!z2.werte && oben2 === 12 && unten2 === 11 && gesprossen && blick > 0.9 && !!z2.netz && z2.netz.endlich && z2.lang > 5 && k2.blick > 0.95 && z2.linse.offen && z2.linse.reihen.oben && z2.linse.reihen.unten && z2.linse.perle === '#' && z2.linse.vorlage === 0 && z2.tropfen && (await gedrueckt()) && k2.schritte === schritte0 + 1,
  `Plätze oben ${oben2}, unten ${unten2} (davon Spiegelbilder ${z2.plaetze.filter((q) => q.gespiegelt).length}); Blick beim Sprießen bis ${blick.toFixed(2)}, danach ${k2.blick.toFixed(2)}; längster Zahn ${z2.lang.toFixed(1)}; Linse ${z2.linse.offen ? 'offen' : 'zu'}, Perle „${z2.linse.perle}“, Vorlage ${z2.linse.vorlage}, Durchmesser ${z2.linse.innen}`,
);
if (z2.werte && z2.linse.offen) {
  // L1 der Drehregler: gut 60° im Uhrzeigersinn (vier Rasten)
  {
    const [x0, y0] = await anLinse(-10, RAD);
    await s.mouse.move(x0, y0);
    await s.waitForTimeout(200);
    await s.mouse.down();
    for (let g = -10; g <= 52; g += 2) {
      const [x, y] = await anLinse(g, RAD);
      await s.mouse.move(x, y);
      await s.waitForTimeout(16);
    }
    // (kurz halten: Losgelassen im Schwung liefe das Rad nach)
    await s.waitForTimeout(250);
    await s.mouse.up();
    await s.waitForTimeout(700);
  }
  const l1 = await O('zaehne');
  const k1 = await O('kiefer');
  const [o1, u1] = zahl(l1);
  await bild('3-sechzehn');
  ok('L1 der Drehregler, um gut 60° gedreht: vier Rasten, oben 12 → 16 Zähne, unten 15; ein Schritt für ⌘Z', l1.werte.oben.anzahl === 16 && l1.werte.unten.anzahl === 15 && o1 === 16 && u1 === 15 && k1.schritte === schritte0 + 2, `oben ${l1.werte.oben.anzahl} (Plätze ${o1}), unten ${l1.werte.unten.anzahl} (Plätze ${u1}); Reichweite unten ${l1.werte.unten.bis.toFixed(3)} (oben ${l1.werte.oben.bis.toFixed(2)}); Schritte +${k1.schritte - schritte0 - 1}`);
  // L2 der Formenring: das Zeichen „Spitz“ (das zweite, 45° rechts der Marke)
  {
    const [x, y] = await anLinse(-45, FORMEN);
    await klick(x, y);
    await s.waitForTimeout(900);
  }
  const l2 = await O('zaehne');
  await bild('4-spitz');
  ok('L2 ein Tipp auf „Spitz“ am Formenring: beide Reihen tragen die Vorlage, die Linse zeigt sie, die Zähne werden länger', l2.werte.oben.form === 1 && l2.werte.unten.form === 1 && l2.linse.vorlage === 1 && !l2.linse.wechselt && l2.netz.endlich && l2.lang > l1.lang + 0.5, `Vorlage oben ${l2.werte.oben.form}, unten ${l2.werte.unten.form}, an der Marke ${l2.linse.vorlage}; längster Zahn ${l1.lang.toFixed(1)} → ${l2.lang.toFixed(1)}`);
  // L3 die Perle „G“ und das Rad der Maus
  {
    const [x, y] = await anLinse(perleGrad(1), PERLEN);
    await klick(x, y);
    await mausRad(0.4);
  }
  const l3 = await O('zaehne');
  ok('L3 die Perle „G“ angetippt, am Rad der Maus gedreht: die Größe beider Reihen wächst', l3.linse.perle === 'G' && l3.werte.oben.groesse > l2.werte.oben.groesse + 0.05 && Math.abs(l3.werte.unten.groesse - l3.werte.oben.groesse) < 1e-9 && l3.werte.oben.anzahl === 16, `Perle „${l3.linse.perle}“; Größe ${l2.werte.oben.groesse.toFixed(2)} → oben ${l3.werte.oben.groesse.toFixed(2)}, unten ${l3.werte.unten.groesse.toFixed(2)}`);
  // L4 die untere Reihe allein: ihre Perle, dann „#“ und das Rad der Maus (zwei Rasten)
  {
    const [x, y] = await anLinse(reiheGrad(1), PERLEN);
    await klick(x, y);
    const [x2, y2] = await anLinse(perleGrad(0), PERLEN);
    await klick(x2, y2);
    // (gut zwei Rasten: 32°)
    await mausRad(0.56);
  }
  const l4 = await O('zaehne');
  const [o4, u4] = zahl(l4);
  await bild('5-unten-allein');
  ok('L4 die Perle der unteren Reihe angetippt: Die Linse gilt ihr allein; „#“ und das Rad der Maus stellen nur ihre Anzahl', !l4.linse.reihen.oben && l4.linse.reihen.unten && l4.linse.perle === '#' && l4.werte.oben.anzahl === 16 && l4.werte.unten.anzahl === 17 && o4 === 16 && u4 === 17, `gilt oben ${l4.linse.reihen.oben}, unten ${l4.linse.reihen.unten}; oben ${l4.werte.oben.anzahl}, unten ${l4.werte.unten.anzahl} (Plätze ${o4}/${u4})`);
  // L5 ⌘Z: Griff für Griff zurück
  const stufen = [];
  await zurueck();
  const a = await O('zaehne');
  stufen.push(a.werte?.unten.anzahl === 15 && a.werte.oben.anzahl === 16);
  await zurueck();
  const b = await O('zaehne');
  stufen.push(!!b.werte && Math.abs(b.werte.oben.groesse - l2.werte.oben.groesse) < 1e-9 && b.werte.oben.form === 1);
  await zurueck();
  const c = await O('zaehne');
  stufen.push(c.werte?.oben.form === 0 && c.werte.unten.form === 0 && c.linse.vorlage === 0 && c.werte.oben.anzahl === 16);
  await zurueck();
  const d = await O('zaehne');
  stufen.push(d.werte?.oben.anzahl === 12 && d.werte.unten.anzahl === 11 && d.linse.offen);
  ok('L5 ⌘Z nimmt Griff für Griff zurück (Anzahl unten, Größe, Vorlage, Anzahl); die Linse zeigt jeweils, was gilt', stufen.every(Boolean), `Anzahl unten ${stufen[0] ? 'gut' : 'FEHL'}, Größe ${stufen[1] ? 'gut' : 'FEHL'}, Vorlage ${stufen[2] ? 'gut' : 'FEHL'} (an der Marke ${c.linse.vorlage}), Anzahl ${stufen[3] ? 'gut' : 'FEHL'} (oben ${d.werte?.oben.anzahl}, unten ${d.werte?.unten.anzahl})`);
  // L7 bei offener Linse an der Form ziehen: in der Seite der Punkt, der am weitesten vom Maul weg liegt
  {
    await s.keyboard.press('1');
    await s.waitForTimeout(1600);
    await ruhig();
    const linien = await O('werkLinienDaten');
    const maul = linien.find((l) => l.maulEcht);
    const mx = maul.punkte.reduce((m, p) => m + p.x, 0) / maul.punkte.length;
    let fern = null;
    for (const l of linien) for (const p of l.punkte) if (p.sichtbar && Math.abs(p.z) < 1e-6 && (!fern || Math.abs(p.x - mx) > Math.abs(fern.x - mx))) fern = p;
    const von = await O('werkImBild', { x: fern.x, y: fern.y, z: 0 });
    const vor = await O('bearbeiten');
    await s.mouse.move(von.x - 120, von.y - 120);
    await s.waitForTimeout(250);
    await s.mouse.move(von.x, von.y);
    await s.waitForTimeout(300);
    await s.mouse.down();
    for (let k = 1; k <= 6; k++) {
      await s.mouse.move(von.x + 2 * k, von.y - 3 * k);
      await s.waitForTimeout(60);
    }
    await s.waitForTimeout(500);
    const mitten = await O('zaehne');
    const kMitten = await O('kiefer');
    await s.mouse.up();
    await ruhig();
    await s.waitForTimeout(900);
    const nach = await O('zaehne');
    const kNach = await O('kiefer');
    const b7 = await O('bearbeiten');
    const [o7, u7] = zahl(nach);
    const fernNach = (await O('werkLinienDaten')).flatMap((l) => l.punkte).reduce((m, p) => Math.max(m, Math.abs(p.x - mx)), 0);
    await bild('5b-seite-gezogen');
    // (die Linse steht auch nach dem Wechsel der Ansicht oben rechts unter der Tafel „Fressen“)
    const tafel = await s.evaluate(() => {
      const t = document.getElementById('fressen');
      return t.offsetTop + t.offsetHeight;
    });
    const linseOben = nach.linse.mitte[1] - (nach.linse.innen + 132) / 2;
    ok(
      'L7 bei offener Linse an der Form gezogen: solange ist das Maul zu und kein Zahn hat Länge, die Linse bleibt offen; danach steht das Maul wieder offen, die Zähne sind da, es ist ein Schritt',
      mitten.linse.offen && mitten.lang < 0.01 && nach.linse.offen && kNach.blick > 0.95 && o7 === 12 && u7 === 11 && nach.netz.endlich && nach.lang > 5 && b7.schritte === vor.schritte + 1 && Math.abs(linseOben - tafel - 2) < 2,
      `Linse ${linseOben.toFixed(0)} unter dem oberen Rand (Tafel bis ${tafel}); beim Ziehen: Linse ${mitten.linse.offen ? 'offen' : 'zu'}, längster Zahn ${mitten.lang.toFixed(3)}, Blick ${kMitten.blick.toFixed(2)}; danach: Blick ${kNach.blick.toFixed(2)}, Plätze ${o7}/${u7}, längster ${nach.lang.toFixed(1)}; Schritte +${b7.schritte - vor.schritte}; der ferne Punkt lag ${Math.abs(fern.x - mx).toFixed(0)} vom Maul, jetzt der fernste ${fernNach.toFixed(0)}`,
    );
    await zurueck();
    await s.keyboard.press('0');
    await s.waitForTimeout(1600);
    await O('blickSetzen', { gier: -1.6, neigung: 0.05, zoom: 4 });
    await s.waitForTimeout(1000);
  }
  // L6 Esc schließt die Linse (ist noch etwas gewählt, leert das erste Esc die Auswahl); der Tropfen öffnet und schließt sie
  const b0 = await O('bearbeiten');
  const gewaehlt = b0.auswahl.length + b0.werkAuswahl.length;
  await s.keyboard.press('Escape');
  await s.waitForTimeout(500);
  let escZahl = 1;
  if ((await O('zaehne')).linse.offen) {
    await s.keyboard.press('Escape');
    escZahl = 2;
  }
  await s.waitForTimeout(1200);
  const e1 = await O('zaehne');
  const ke = await O('kiefer');
  const gedr1 = await gedrueckt();
  await s.click('#zaehne-tropfen');
  await s.waitForTimeout(900);
  const e2 = await O('zaehne');
  const gedr2 = await gedrueckt();
  await s.click('#zaehne-tropfen');
  await s.waitForTimeout(1200);
  const e3 = await O('zaehne');
  ok(
    'L6 Esc schließt die Linse: das Maul geht zu, kein Zahn hat Länge, der Tropfen ist nicht mehr gedrückt; der Tropfen öffnet sie wieder und schließt sie',
    !e1.linse.offen && ke.blick === 0 && e1.lang < 0.01 && !gedr1 && !!e1.werte && e2.linse.offen && gedr2 && e2.linse.reihen.oben && e2.linse.reihen.unten && e2.lang > 5 && !e3.linse.offen && e3.lang < 0.01 && e3.werte.oben.anzahl === 12,
    `nach ${escZahl} × Esc (gewählt war: ${gewaehlt}): Linse ${e1.linse.offen ? 'offen' : 'zu'}, Blick ${ke.blick.toFixed(2)}, längster Zahn ${e1.lang.toFixed(3)}; nach dem Tipp: ${e2.linse.offen ? 'offen' : 'zu'} (längster ${e2.lang.toFixed(1)}); nach dem zweiten: ${e3.linse.offen ? 'offen' : 'zu'}`,
  );
  // Z3 „Fressen“ an
  await s.click('#fressen-knopf');
  await s.waitForTimeout(1500);
  await ruhig();
  const z3 = await O('zaehne');
  await bild('6-fressen');
  // den Unterkiefer weiter auf (der Regler der Tafel)
  await s.evaluate(() => {
    const r = document.getElementById('fressen-maul');
    r.value = '55';
    r.dispatchEvent(new Event('input', { bubbles: true }));
    r.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await s.waitForTimeout(900);
  const z3b = await O('zaehne');
  await bild('7-weiter');
  // in der Pose: die Linse auf, eine Rast am Rad der Maus (die Perle „#“ gilt noch), ⌘Z, die Linse zu
  await s.click('#zaehne-tropfen');
  await s.waitForTimeout(700);
  await mausRad(0.3);
  const p1 = await O('zaehne');
  const [op, up] = zahl(p1);
  await zurueck();
  const p2 = await O('zaehne');
  // (nur zur Kenntnis: die Zeit für das Stellen eines Werts und die zwei Bilder danach, fünfmal)
  const zeiten = await s.evaluate(async () => {
    const z = window.__ozzy.zaehne().werte;
    const aus = [];
    for (let i = 0; i < 5; i++) {
      const w = { oben: { ...z.oben, groesse: 0.9 + 0.02 * i }, unten: { ...z.unten, groesse: 0.9 + 0.02 * i } };
      const t0 = performance.now();
      window.__ozzy.zaehne(w);
      const t1 = performance.now();
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      aus.push([t1 - t0, performance.now() - t1]);
    }
    window.__ozzy.zaehne(z);
    return aus;
  });
  await s.waitForTimeout(400);
  await s.click('#zaehne-tropfen');
  await s.waitForTimeout(700);
  const p3 = await O('zaehne');
  const inPose = p1.linse.offen && p1.werte.oben.anzahl === 13 && p1.werte.unten.anzahl === 12 && op === 13 && up === 12 && p1.netz.endlich && p2.werte.oben.anzahl === 12 && p2.werte.unten.anzahl === 11 && !p3.linse.offen && (await O('pose')).an;
  const mittel = (i) => zeiten.reduce((m, t) => m + t[i], 0) / zeiten.length;
  console.log(`     (zur Kenntnis: ein Wert gestellt ${mittel(0).toFixed(1)} ms, die zwei Bilder danach ${mittel(1).toFixed(0)} ms; fünfmal gemittelt, in der Pose bei 55°)`);
  const massen = z3.plaetze.map((q) => q.mass);
  ok(
    'Z3 „Fressen“ an: die Zähne stehen im offenen Maul; den Unterkiefer weiter geöffnet: sie gehen mit, keiner wird kürzer; in der Pose stellt die Linse wie in der Grundform',
    !!z3.netz && z3.netz.endlich && z3.lang > 5 && z3.lang < 45 && !!z3b.netz && z3b.netz.endlich && z3b.lang >= z3.lang - 0.01 && (await O('pose')).kiefer === 55 && inPose,
    `offen (34°/8°): längster Zahn ${z3.lang.toFixed(1)}; bei 55°: ${z3b.lang.toFixed(1)}; Maße der Zähne ${Math.min(...massen).toFixed(1)} bis ${Math.max(...massen).toFixed(1)}; die Linse in der Pose: ${p1.werte.oben.anzahl} und ${p1.werte.unten.anzahl} (Plätze ${op}/${up}), nach ⌘Z ${p2.werte.oben.anzahl} und ${p2.werte.unten.anzahl}`,
  );
  // Z4 „Fressen“ aus
  await s.click('#fressen-knopf');
  await s.waitForTimeout(1500);
  await ruhig();
  const z4 = await O('zaehne');
  ok('Z4 „Fressen“ aus: wieder zu, kein Zahn hat Länge', !!z4.netz && z4.lang < 0.01 && !(await O('pose')).an, `längster Zahn ${z4.lang.toFixed(3)}`);
  // Z5 ⌘Z: erst der Regler und die Werte der Zeitmessung, dann die Zähne, dann das Maul
  let weg = false;
  for (let i = 0; i < 16; i++) {
    await zurueck();
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
  ok('Z5 ⌘Z nimmt die Zähne zurück (der Tropfen hängt weiter da), ein weiteres das Maul', weg && z5.werte === null && z5.netz === null && z5.tropfen && !z5.linse.offen && maulNoch && maulWeg, `Zähne ${z5.werte ? 'noch da' : 'weg'}, Tropfen ${z5.tropfen ? 'da' : 'fehlt'}; das Maul danach ${maulWeg ? 'weg' : 'noch da'}`);
}
ok('Z6 keine Fehler in der Konsole', fehler.length === 0, fehler.slice(0, 4).join(' | '));
await browser.close();
console.log(schlecht ? `${schlecht} Kriterien nicht erfüllt` : 'alle Kriterien erfüllt');
process.exit(schlecht ? 1 : 0);
