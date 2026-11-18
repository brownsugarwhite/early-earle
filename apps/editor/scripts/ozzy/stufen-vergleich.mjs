// Vergleich „Stufen der glatten Anzeige“ (17.11.2026, Plan „Ozzy stabil und schnell“, Block A): zwei Stufen (wie gebaut), eine, keine.
// Gleiche Ansicht im Raum, die Zeit der Seifenhaut steht (`zeit(100)`), Muster stetig (`?uebergabeMuster=0`). Je Fassung ein
// Ausschnitt (400 × 400 um die Form, doppelte Dichte) und die Zeit je Bild samt Grafikkarte. Vergleich der Bilder z. B. mit
//   ffmpeg -i stufen-2.png -i stufen-1.png -lavfi psnr -f null -
// Aufruf aus apps/editor, Ozzy auf 5205: node scripts/ozzy/stufen-vergleich.mjs <ordner>
import { auf, mitKarte, z1 } from '../pruefen/ozzy-teile.mjs';

const aus = process.argv[2] ?? '.';
const FORM = process.env.NAME ?? 'strange bird';
for (const fein of ['', '1', '0']) {
  const { browser, s, O, geladen } = await auf({ form: FORM, extra: `bild=1&uebergabeMuster=0${fein ? `&fein=${fein}` : ''}` });
  await geladen();
  await s.waitForTimeout(3500);
  await O('zeit', 100);
  await s.waitForTimeout(800);
  const w = await O('werk');
  await s.screenshot({ path: `${aus}/stufen-${fein || '2'}.png`, clip: { x: 520, y: 250, width: 400, height: 400 } });
  const m = await mitKarte(s);
  console.log(`Stufen ${fein || '2 (wie gebaut)'}: ${w.feinePunkte} Punkte gezeigt · Rechnen ${z1(m.rechnen)} ms · mit Grafikkarte ${z1(m.gesamt)} ms`);
  await browser.close();
}
