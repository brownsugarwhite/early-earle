// Ozzy, Plan „Ozzy stabil und schnell“ (17.11.2026): der Zug an der Wand der Seite (1,5 s), je Fassung. Keine Prüfung, ein Werkzeug.
// Je Lauf: Rechnen je Bild (Median / 95 %), davon Werk, glatte Haut und Linien (Median), Abstand der Bilder (im Testbrowser an 60 Hz
// gebunden). Fassungen:
//   wie gebaut
//   Bildtakt gemeldet   Ozzy meldet dem Werk, was sein Bild ohne die Runden des Lösers kostet (Flicken; Prüfbericht vom 17.11., 3.1)
//   eine Stufe          die glatte Anzeige mit einer statt zwei Stufen (`?fein=1`)
//   beides
// Aufruf aus apps/editor, Ozzy auf 5205: [FORMEN="strange bird,maul handgemacht test"] node scripts/pruefen/ozzy-zug-messen.mjs
import { auf, quantil, z1 } from './ozzy-teile.mjs';

const TAKT = {
  '**/src/form/werk.ts*': [['performance.now() - bildT0 - bildGerechnetMs', '(globalThis.__bildRest ?? (performance.now() - bildT0 - bildGerechnetMs))']],
  '**/src/ozzy/main.ts*': [['stat.bildMs = performance.now() - t0;', 'stat.bildMs = performance.now() - t0; globalThis.__bildRest = stat.bildMs - mess.teile[0];']],
};

const lauf = async (form, name, { takt = false, fein = '' } = {}) => {
  const { browser, s, O, geladen, fehler } = await auf({ form, extra: fein ? `fein=${fein}` : '', flicken: takt ? TAKT : {} });
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
for (const form of (process.env.FORMEN ?? 'strange bird,maul handgemacht test').split(',')) {
  await lauf(form, 'wie gebaut');
  await lauf(form, 'Bildtakt gemeldet', { takt: true });
  await lauf(form, 'eine Stufe', { fein: '1' });
  await lauf(form, 'Bildtakt + eine Stufe', { takt: true, fein: '1' });
}
