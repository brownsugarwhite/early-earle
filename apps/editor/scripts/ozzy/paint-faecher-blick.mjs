// Standbilder zum Paint-Modus, Etappe 6 (Plan docs/plans/2026-11-19-ozzy-paint-modus.md, Abschnitt 17): die Ebenen-Ansicht im
// Probebau, zwei Anordnungen zur Wahl. An Florians Form „strange bird“ auf Wachs, drei Ebenen (der Verlauf, die Punkte, ein
// oranger Fleck).
//   z      die drei Ebenen übereinander
//   n1, n2 nebeneinander: auf halbem Weg, aufgefächert;  n3: gedreht;  n4: die mittlere Kopie angetippt
//   s1, s2 schräg versetzt: auf halbem Weg, aufgefächert;  s3: gedreht;  s4: die mittlere Kopie angetippt
// Aufruf aus apps/editor: OZZY_URL=http://localhost:5215/ozzy.html node scripts/ozzy/paint-faecher-blick.mjs <ordner>
import fs from 'node:fs';
import { ebeneDrei, ebeneEins, ebeneZwei, oeffnen } from './paint-ebenen-szene.mjs';

const ordner = process.argv[2];
if (!ordner) throw new Error('Aufruf: node scripts/ozzy/paint-faecher-blick.mjs <ordner>');
fs.mkdirSync(ordner, { recursive: true });
const t = await oeffnen({ fuellen: '0' });
const { s, O } = t;
const bild = async (name) => {
  await s.waitForTimeout(350);
  fs.writeFileSync(`${ordner}/${name}.png`, await s.screenshot());
};
await s.evaluate(() => (document.getElementById('hinweis').style.visibility = 'hidden'));
await ebeneEins(t);
await ebeneZwei(t);
await ebeneDrei(t);
await s.mouse.move(560, 500, { steps: 4 });
await bild('z');
/** das Auffächern bis zu einer Stelle rechnen (Bild für Bild, mit fester Zeit) */
const bis = async (stelle) => {
  await O('film', true);
  for (let i = 0; i < 400; i++) {
    await O('bild', 1 / 60);
    const f = (await O('faecher')).f;
    if (stelle < 1 ? f >= stelle : Math.abs(f - 1) < 1e-3) break;
  }
};
for (const [art, k] of [
  ['neben', 'n'],
  ['schraeg', 's'],
]) {
  const offen = await O('faecher', true, art);
  if (!offen.offen) throw new Error(`Die Ebenen-Ansicht öffnet nicht: ${JSON.stringify(offen)} · ${await O('meldung').catch(() => '')}`);
  await bis(0.45);
  await bild(`${k}1`);
  await bis(1);
  await O('film', false);
  await bild(`${k}2`);
  // drehen: ins Leere ziehen
  await s.mouse.move(600, 520, { steps: 4 });
  await s.mouse.down();
  for (let i = 1; i <= 20; i++) {
    await s.mouse.move(600 - 4 * i, 520 - 0.5 * i);
    await s.waitForTimeout(20);
  }
  await s.waitForTimeout(500);
  await bild(`${k}3`);
  for (let i = 19; i >= 0; i--) {
    await s.mouse.move(600 - 4 * i, 520 - 0.5 * i);
    await s.waitForTimeout(20);
  }
  await s.waitForTimeout(500);
  await s.mouse.up();
  await s.waitForTimeout(600);
  // die mittlere Kopie antippen
  const F = await O('faecher');
  const m = F.kopien[1];
  await s.mouse.move(m.x, m.y, { steps: 5 });
  await s.waitForTimeout(250);
  await s.mouse.down();
  await s.waitForTimeout(60);
  await s.mouse.up();
  await s.waitForTimeout(500);
  await bild(`${k}4`);
  console.log(`${art}: ${F.kopien.map((q) => `${q.id}@${Math.round(q.x)};${Math.round(q.y)}×${q.s.toFixed(2)}`).join(' ')} · aktiv ${(await O('farbEbenen')).ebenen.find((e) => e.aktiv)?.name}`);
  await O('faecher', false);
  await bis(0);
  await O('film', false);
  await s.waitForTimeout(300);
}
console.log(`Bilder in ${ordner}; Fehler: ${t.fehler.length}${t.fehler.length ? ` (${t.fehler.slice(0, 2).join(' | ')})` : ''}`);
await t.browser.close();
