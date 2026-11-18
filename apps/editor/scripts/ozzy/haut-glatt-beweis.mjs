// Beweisbild „Seifenhaut glatt“ (17.11.2026, Plan „Ozzy stabil und schnell“, Block A): gleiche Ansicht, vorher (wie gebaut) und
// nachher. Nachher heißt nur: Muster und Dehnung werden stetig weitergereicht statt vom nächsten Punkt kopiert (ein Flicken an
// `GlattPlan.weiterreichen` für diesen Lauf und der vorhandene Schalter `?uebergabeMuster=0`). Im Arbeitsbaum ändert sich nichts.
// Einmaliger Beweis. Seit dem 17.11. nachts ist A2 gebaut (`GlattPlan.mischen`, `uebernehmen` über Dreiecke, Übergabe von der Blase
// stetig): Beide Läufe zeigen jetzt dasselbe; das Bild „vorher“ liegt in docs/progress/ozzy/2026-11-17-seifenhaut-glatt-vorher-nachher.png.
// Aufruf aus apps/editor, Ozzy auf 5205: node scripts/ozzy/haut-glatt-beweis.mjs <ordner> ; schreibt hautbeweis-vorher.png und -nachher.png
import { auf } from '../pruefen/ozzy-teile.mjs';

const aus = process.argv[2] ?? '.';
const FORM = process.env.NAME ?? 'strange bird';
for (const [name, glatt] of [['vorher', false], ['nachher', true]]) {
  const { browser, s, geladen, fehler } = await auf({
    form: FORM,
    extra: `bild=1${glatt ? '&uebergabeMuster=0' : ''}`,
    flicken: glatt ? { '**/src/form/glattPlan.ts*': [['aus[S.n + i] = a !== 0 ? a : aus[S.K.b[i]];', 'aus[S.n + i] = 0.5 * (a + aus[S.K.b[i]]);']] } : {},
  });
  await geladen();
  await s.waitForTimeout(3500);
  // nah heran (Rad), damit man die Haut beurteilen kann
  await s.mouse.move(720, 470);
  for (let k = 0; k < 5; k++) {
    await s.mouse.wheel(0, -240);
    await s.waitForTimeout(60);
  }
  await s.waitForTimeout(1200);
  await s.mouse.move(60, 860);
  await s.waitForTimeout(600);
  await s.screenshot({ path: `${aus}/hautbeweis-${name}.png` });
  console.log(name, fehler.length ? fehler.join(' | ') : 'ok');
  await browser.close();
}
