// Bilder zum Paint-Modus, Etappe 3, zweiter Schritt (Plan docs/plans/2026-11-19-ozzy-paint-modus.md, Abschnitt 13): die Leiste im
// Paint-Modus in dreifacher Schärfe (mit A, mit dem Farbtropfen, mit der Pipette) und der Tropfen und der Ring am Zeiger. Das Bild
// `2-leiste-f.png` steht oben im Bildblatt `2026-11-19-paint-etappe-3-farben-bogen.jpg`. An „strange bird“ auf Wachs.
// Aufruf aus apps/editor: GPU=1 OZZY_URL=http://localhost:5215/ozzy.html node scripts/ozzy/paint-farben-blick.mjs <ordner>
import { auf } from '../pruefen/ozzy-teile.mjs';

const ordner = process.argv[2] ?? '.';
const t = await auf({ form: 'strange bird', dichte: 3, b: 1280, h: 800, extra: 'material=wachs&fuellen=0' });
const { s, O, geladen, fehler } = t;
await geladen();
await s.keyboard.press('b');
await s.waitForTimeout(900);
const oben = { x: 380, y: 0, width: 520, height: 110 };
await s.screenshot({ path: `${ordner}/1-leiste-a.png`, clip: oben });
await s.keyboard.press('f');
await s.mouse.move(640, 420, { steps: 4 });
await s.waitForTimeout(700);
await s.screenshot({ path: `${ordner}/2-leiste-f.png`, clip: oben });
await s.screenshot({ path: `${ordner}/3-zeiger-f.png`, clip: { x: 540, y: 340, width: 200, height: 160 } });
await s.keyboard.press('i');
await s.waitForTimeout(700);
await s.screenshot({ path: `${ordner}/4-leiste-i.png`, clip: oben });
await s.screenshot({ path: `${ordner}/5-zeiger-i.png`, clip: { x: 540, y: 340, width: 200, height: 160 } });
console.log(JSON.stringify(await O('farbLeiste')), fehler.length ? fehler : 'keine Fehler');
await t.browser.close();
