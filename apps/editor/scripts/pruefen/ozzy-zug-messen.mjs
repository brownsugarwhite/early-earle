// Ozzy, Plan „Ozzy stabil und schnell“ (17.11.2026): der Zug an der Wand der Seite (1,5 s), je Fassung. Keine Prüfung, ein Werkzeug.
// Je Lauf: Rechnen je Bild (Median / 95 %), davon Werk, glatte Haut und Linien (Median), Abstand der Bilder (im Testbrowser an 60 Hz
// gebunden). Fassungen (`FASSUNGEN=ist,stufe`, Standard nur `ist`):
//   ist     wie gebaut
//   stufe   die glatte Anzeige mit einer festen Stufe (`?fein=1`)
// (Die Fassung „Bildtakt gemeldet“ des Messblatts vom 17.11. ist seit A1 gebaut: Ozzy meldet dem Werk, was sein Bild kostet.)
// Aufruf aus apps/editor, Ozzy auf 5205: [FORMEN="strange bird,maul handgemacht test"] node scripts/pruefen/ozzy-zug-messen.mjs
import { auf, quantil, z1 } from './ozzy-teile.mjs';

const lauf = async (form, name, { fein = '' } = {}) => {
  const { browser, s, O, geladen, fehler } = await auf({ form, extra: fein ? `fein=${fein}` : '' });
  await geladen();
  await s.waitForTimeout(2500);
  const L = await O('werkLinienDaten');
  const mitte = L.find((l) => l.art === 'mitte') ?? L[0];
  const p = mitte.punkte.find((x) => x.sichtbar);
  const a = (await O('ankerImBild', mitte.id, p.i, 'seite'))[0];
  await s.mouse.move(a.x, a.y, { steps: 4 });
  await s.waitForTimeout(400);
  await O('messen', true, {});
  await s.mouse.down();
  for (let k = 1; k <= 45; k++) {
    await s.mouse.move(a.x + 0.3 * k, a.y - k);
    await s.waitForTimeout(30);
  }
  await s.mouse.up();
  const B = await O('messen', false);
  const w = await O('werk');
  const ms = B.map((b) => b.ms);
  const ab = B.slice(1).map((b) => b.abstand);
  const teil = (k) => z1(quantil(B.map((b) => b.teile[k] ?? 0), 0.5));
  console.log(
    `| ${form} | ${name} | ${B.length} | ${z1(quantil(ms, 0.5))} / ${z1(quantil(ms, 0.95))} | ${teil(0)} · ${teil(1)} · ${teil(2)} | ${z1(quantil(ab, 0.5))} / ${z1(quantil(ab, 0.95))} | ${w.punkte} Rechenpunkte, ${w.feinePunkte} gezeigt${fehler.length ? ` · ${fehler.join(';').slice(0, 120)}` : ''} |`,
  );
  await browser.close();
};

console.log('| Form | Fassung | Bilder | Rechnen je Bild (Median / 95 %) | Werk · Haut · Linien (Median) | Abstand (Median / 95 %) | Netz |\n| --- | --- | --- | --- | --- | --- | --- |');
const FASSUNGEN = (process.env.FASSUNGEN ?? 'ist').split(',');
for (const form of (process.env.FORMEN ?? 'strange bird,maul handgemacht test').split(',')) {
  if (FASSUNGEN.includes('ist')) await lauf(form, 'wie gebaut');
  if (FASSUNGEN.includes('stufe')) await lauf(form, 'eine Stufe', { fein: '1' });
}
