// Ozzy, Maul, Feinschlifflauf (20.11.2026), Block A: Sichern und Laden einer Form mit Maul, Zähnen und Zunge, an „teat firefish“
// (NAME) auf Wachs, in eine Probedatei (am Ende gelöscht).
// Kriterien:
//   S1 Die Form mit Maul, Zähnen (eine Reihe mit eigener Vorlage, ein Zahn mit eigenen Werten, ein gezogener Zahn, eine Farbe) und
//      Zunge (Werte einer Vorlage, Farbe, in „Fressen“ in eine Lage gelegt, in der Grundform an einem Zahn klebend) lässt sich sichern.
//   S2 Neu geladen: Das Maul ist da; die Werte der Zähne und der Zunge sind dieselben (auch einzelne Zähne, Farben, Kleben, Lage).
//   S3 Die Zähne stehen wie vorher (gleich viele Plätze, derselbe gezogene Zahn fehlt), ihr Netz ist endlich.
//   S4 Die Zunge klebt wieder an ihrem Zahn; in „Fressen“ liegt sie wieder in ihrer Lage (im Bild höchstens 3 Bildpunkte daneben).
//   S5 Keine Fehler in der Konsole.
// Aufruf aus apps/editor: GPU=1 [NAME=…] [LINIE='x,y;…'] node scripts/pruefen/ozzy-maul-sichern-fenster.mjs [ordner für Bilder]
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const ordner = process.argv[2] ?? '';
const NAME = process.env.NAME ?? 'teat firefish';
const LINIE = (process.env.LINIE ?? '-860,172;-735,156;-700,152;-665,156;-640,165').split(';').map((t) => t.split(',').map(Number));
const basis = process.env.OZZY_URL ?? 'http://localhost:5205/ozzy.html';
const ablage = fileURLToPath(new URL('../../../../wesen/', import.meta.url));
const PROBE = 'ozzy-probe-maul';
const datei = `${ablage}${PROBE}.eewesen`;
const aufraeumen = () => {
  if (fs.existsSync(datei)) fs.unlinkSync(datei);
};
aufraeumen();
const browser = await chromium.launch({ args: process.env.GPU === '1' ? ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] : [] });
let schlecht = 0;
const ok = (name, gut, text = '') => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};
const fehler = [];
try {
  const seite = async (form) => {
    const s = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
    s.on('pageerror', (e) => fehler.push(String(e)));
    s.on('console', (m) => {
      if (m.type() === 'error') fehler.push(m.text());
    });
    await s.goto(`${basis}?form=${encodeURIComponent(form)}`);
    await s.waitForFunction(() => !!window.__ozzy);
    const O = (f, ...a) => s.evaluate(([f2, a2]) => window.__ozzy[f2](...a2), [f, a]);
    const ruhig = async () => {
      await s.waitForTimeout(300);
      await s.waitForFunction(() => window.__ozzy.bearbeiten().an && !window.__ozzy.bearbeiten().beschaeftigt && !window.__ozzy.werk().beschaeftigt, null, { timeout: 120000 });
      await s.waitForTimeout(200);
    };
    const zungeRuht = async () => {
      for (let i = 0; i < 80; i++) {
        await s.waitForTimeout(100);
        const z = await O('zunge');
        if (!z.kette || (!z.laeuftNach && !z.kette.bewegt)) return;
      }
    };
    return { s, O, ruhig, zungeRuht };
  };
  /** „Fressen“ an, den Unterkiefer auf 50°, der Blick von der Seite: so wird vor dem Sichern und nach dem Laden gemessen */
  const inFressen = async ({ s, O, ruhig, zungeRuht }) => {
    await s.click('#fressen-knopf');
    await s.waitForTimeout(1500);
    await ruhig();
    await s.evaluate(() => {
      const r = document.getElementById('fressen-maul');
      r.value = '50';
      r.dispatchEvent(new Event('input', { bubbles: true }));
      r.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await s.waitForTimeout(1200);
    await O('blickSetzen', { gier: -1.6, neigung: 0.05, zoom: 4, schwenkX: 0, schwenkY: 0 });
    await s.waitForTimeout(1200);
    await zungeRuht();
  };

  // ---------- anlegen ----------
  const A = await seite(NAME);
  const { s, O, ruhig, zungeRuht } = A;
  await ruhig();
  await O('material', 'wachs');
  await s.keyboard.press('1');
  await s.waitForTimeout(1500);
  await ruhig();
  await s.keyboard.press('p');
  await s.waitForTimeout(300);
  for (const [x, y] of LINIE) {
    const q = await O('werkImBild', { x, y, z: 0 });
    await s.mouse.move(q.x, q.y);
    await s.waitForTimeout(250);
    await s.mouse.down();
    await s.waitForTimeout(60);
    await s.mouse.up();
    await s.waitForTimeout(250);
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
  await s.keyboard.press('Escape');
  await s.waitForTimeout(300);
  await s.keyboard.press('0');
  await s.waitForTimeout(1800);
  // Zähne: unten eine andere Vorlage und Größe; oben ein Zahn mit eigener Vorlage und Größe, einer gezogen; eine Farbe
  await O('zaehne', 'anfang');
  await s.waitForTimeout(600);
  {
    const z = (await O('zaehne')).werte;
    await O('zaehne', { oben: { ...z.oben, eigen: { 2: { form: 7, faktor: 1.4 }, 4: { weg: true } } }, unten: { ...z.unten, form: 1, groesse: 1.1 }, farbe: '#ddeeff' });
    await s.waitForTimeout(800);
  }
  // Zunge: die Werte der Vorlage „Spitz“ mit etwas Gabel und einer Farbe
  await O('zunge', { laenge: 0.84, breite: 0.66, dicke: 0.07, rille: 0.22, spitz: 1, gabel: 0.3, form: 1, farbe: '#c04060' });
  await s.waitForTimeout(800);
  await s.click('#zunge-tropfen');
  await s.waitForTimeout(1200);
  // in „Fressen“ in eine Lage legen (ziehen und loslassen)
  await inFressen(A);
  {
    const z = await O('zunge');
    const von = z.knoten[9];
    await s.mouse.move(von[0] + 50, von[1] - 50);
    await s.waitForTimeout(150);
    await s.mouse.move(von[0], von[1]);
    await s.waitForTimeout(250);
    await s.mouse.down();
    for (let k = 1; k <= 12; k++) {
      await s.mouse.move(von[0] - 5 * k, von[1] - 4 * k);
      await s.waitForTimeout(30);
    }
    await s.waitForTimeout(400);
    await s.mouse.up();
    await zungeRuht();
  }
  const vorPose = await O('zunge');
  if (ordner) await s.screenshot({ path: `${ordner}/ozzy-maul-sichern-1-vorher-fressen.png` });
  await s.click('#fressen-knopf');
  await s.waitForTimeout(1500);
  await ruhig();
  // in der Grundform an einen oberen Zahn kleben (über den Haken: Knoten 8 an Zahn 3 oben, an seiner Spitze)
  {
    const z = (await O('zunge')).werte;
    await O('zunge', { ...z, klebt: { k: 8, art: 'zahn', unten: false, gespiegelt: false, nr: 3, t: 1, d: [0, 0, 1] } });
    await zungeRuht();
  }
  const vor = { zaehne: await O('zaehne'), zunge: await O('zunge'), linien: (await O('werkLinienDaten')).length };
  if (ordner) await s.screenshot({ path: `${ordner}/ozzy-maul-sichern-2-vorher.png` });
  const text = await O('sichern', PROBE);
  await s.waitForTimeout(800);
  ok(
    'S1 die Form mit Maul, Zähnen und Zunge lässt sich sichern',
    fs.existsSync(datei) && fs.statSync(datei).size > 1000 && !/geht so nicht|fehl/i.test(text) && Array.isArray(vorPose.lage) && !!vor.zunge.klebt && !!vor.zunge.klebtJetzt && vor.zaehne.plaetze.length === 22,
    `Meldung „${text}“; Datei ${fs.existsSync(datei) ? `${Math.round(fs.statSync(datei).size / 1024)} kB` : 'fehlt'}; vorher: Zähne ${vor.zaehne.plaetze.length} Plätze, Zunge mit Lage (${vorPose.lage ? vorPose.lage.length : 0} Zahlen) und Kleben (${vor.zunge.klebt ? 'ja' : 'nein'})`,
  );
  await s.close();

  // ---------- neu laden ----------
  const B = await seite(PROBE);
  await B.ruhig();
  await B.O('material', 'wachs');
  await B.s.waitForTimeout(1500);
  await B.ruhig();
  // (die Zunge läuft erst, wenn ihr Tropfen oder die Pose das Maul zeigt: die Linse öffnen)
  await B.s.click('#zunge-tropfen');
  await B.s.waitForTimeout(1500);
  await B.zungeRuht();
  const nach = { zaehne: await B.O('zaehne'), zunge: await B.O('zunge'), linien: (await B.O('werkLinienDaten')).length, maul: (await B.O('werkLinienDaten')).some((l) => l.maulEcht) };
  if (ordner) await B.s.screenshot({ path: `${ordner}/ozzy-maul-sichern-3-nachher.png` });
  const gleich = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  ok(
    'S2 neu geladen: das Maul ist da; die Werte der Zähne und der Zunge sind dieselben (einzelne Zähne, Farben, Kleben, Lage)',
    nach.maul && nach.linien === vor.linien && gleich(nach.zaehne.werte, vor.zaehne.werte) && gleich(nach.zunge.werte, vor.zunge.werte) && gleich(nach.zunge.klebt, vor.zunge.klebt) && gleich(nach.zunge.lage, vor.zunge.lage) && nach.zaehne.werte.farbe === '#ddeeff' && nach.zunge.werte.farbe === '#c04060',
    `Maul ${nach.maul ? 'da' : 'FEHLT'}, Linien ${vor.linien} → ${nach.linien}; Werte der Zähne ${gleich(nach.zaehne.werte, vor.zaehne.werte) ? 'gleich' : 'ANDERS'}, der Zunge ${gleich(nach.zunge.werte, vor.zunge.werte) ? 'gleich' : 'ANDERS'}; Kleben ${gleich(nach.zunge.klebt, vor.zunge.klebt) ? 'gleich' : 'ANDERS'}, Lage ${gleich(nach.zunge.lage, vor.zunge.lage) ? 'gleich' : 'ANDERS'}`,
  );
  const platzSchl = (z) => z.plaetze.map((q) => `${q.unten ? 'u' : 'o'}${q.i}${q.gespiegelt ? 'm' : ''}:${q.form}`).join(' ');
  ok(
    'S3 die Zähne stehen wie vorher (gleich viele Plätze, derselbe gezogene Zahn fehlt), ihr Netz ist endlich',
    nach.zaehne.plaetze.length === vor.zaehne.plaetze.length && platzSchl(nach.zaehne) === platzSchl(vor.zaehne) && !!nach.zaehne.netz && nach.zaehne.netz.endlich && !nach.zaehne.plaetze.some((q) => !q.unten && !q.gespiegelt && q.i === 4),
    `Plätze ${vor.zaehne.plaetze.length} → ${nach.zaehne.plaetze.length}; Vorlagen und Nummern ${platzSchl(nach.zaehne) === platzSchl(vor.zaehne) ? 'gleich' : 'ANDERS'}; Netz ${nach.zaehne.netz ? `${nach.zaehne.netz.punkte} Punkte, endlich ${nach.zaehne.netz.endlich}` : 'keins'}`,
  );
  const klebtWieder = !!nach.zunge.klebtJetzt && !!nach.zunge.netz && nach.zunge.netz.endlich;
  await inFressen(B);
  const nachPose = await B.O('zunge');
  if (ordner) await B.s.screenshot({ path: `${ordner}/ozzy-maul-sichern-4-nachher-fressen.png` });
  let weg = 0;
  for (let k = 2; k < 11; k++) weg = Math.max(weg, Math.hypot(nachPose.knoten[k][0] - vorPose.knoten[k][0], nachPose.knoten[k][1] - vorPose.knoten[k][1]));
  ok(
    'S4 die Zunge klebt wieder an ihrem Zahn; in „Fressen“ liegt sie wieder in ihrer Lage',
    klebtWieder && nachPose.inPose && !nachPose.kette.bewegt && weg < 3 && Math.abs(nachPose.kette.laenge - vorPose.kette.laenge) < 0.5,
    `klebt nach dem Laden: ${klebtWieder ? 'ja' : 'NEIN'}; in „Fressen“: Knoten im Bild höchstens ${weg.toFixed(1)} px neben vorher, Länge ${vorPose.kette.laenge.toFixed(1)} → ${nachPose.kette.laenge.toFixed(1)}`,
  );
  ok('S5 keine Fehler in der Konsole', fehler.length === 0, fehler.slice(0, 4).join(' | '));
} finally {
  aufraeumen();
  await browser.close();
}
console.log(schlecht ? `${schlecht} Kriterien nicht erfüllt` : 'alle Kriterien erfüllt');
process.exit(schlecht ? 1 : 0);
