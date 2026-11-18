// Ozzy, Materialien neben der Seifenhaut (18.11.2026; Florian: „solid wie in http://localhost:5197/kurven.html?gewichte=geometrie“,
// „zebra“, „Du kannst die Materialien erstmal ins Ozzy-Menü packen“), an „strange bird“ (NAME).
// Kriterien:
//   1  Solid (`?material=solid`): Im Raum trägt die Form die vier Töne des Prüffensters (Körperfarbe 0xe2b98e mal 70, 135, 200, 255
//      von 255 unter seinem Licht; geprüft: Die Mitte der Form ist sandfarben, Rot > Grün > Blau) und einen Umriss in Tinte; an den
//      Wänden und im Leeren bleibt das Papier weiß.
//   2  Zebra (Taste M von Solid aus): Schwarz und Weiß zu etwa gleichen Teilen auf der Form, keine Farbe.
//   3  M weiter: wieder die Seifenhaut; das Menü zeigt die Wahl (ein Knopf gedrückt), und sie ist gemerkt (`ozzy.material`).
//   4  Eingerastet (Taste 1) liegt mit Solid nur die Linienansicht im Bild (kein sandfarbener Körper), zurück im Raum (0) ist er wieder da.
//   5  Keine Fehler in der Konsole.
// Aufruf aus apps/editor: GPU=1 [NAME=…] node scripts/pruefen/ozzy-material-fenster.mjs [ordner für Bilder]
import { auf } from './ozzy-teile.mjs';

const ordner = process.argv[2] ?? '';
const NAME = process.env.NAME ?? 'strange bird';
const { browser, s, O, geladen, ruhig, fehler } = await auf({ form: NAME, extra: 'material=solid' });
let schlecht = 0;
const ok = (name, gut, text = '') => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};
await geladen();
await s.waitForTimeout(1800);
await s.mouse.move(40, 20);
await s.waitForTimeout(400);

/** Farben im Kasten um die Mitte des Bilds (dort steht die Form): Anteile sandfarben, Tinte, weiß, bunt */
const farben = async (name) => {
  const png = await s.screenshot({ clip: { x: 420, y: 180, width: 600, height: 520 } });
  if (ordner) (await import('node:fs')).writeFileSync(`${ordner}/ozzy-material-${name}.png`, png);
  return s.evaluate(async (daten) => {
    const bild = await createImageBitmap(await (await fetch(`data:image/png;base64,${daten}`)).blob());
    const c = new OffscreenCanvas(bild.width, bild.height);
    const g = c.getContext('2d');
    g.drawImage(bild, 0, 0);
    const P = g.getImageData(0, 0, bild.width, bild.height).data;
    let sand = 0, tinte = 0, weiss = 0, grau = 0, bunt = 0;
    const n = P.length / 4;
    for (let i = 0; i < P.length; i += 4) {
      const r = P[i], gg = P[i + 1], b = P[i + 2];
      const max = Math.max(r, gg, b), min = Math.min(r, gg, b);
      if (min > 244) weiss++;
      else if (max < 60) tinte++;
      else if (r > gg + 12 && gg > b + 12 && r > 110) sand++;
      else if (max - min < 14) grau++;
      else bunt++;
    }
    const mitte = 4 * (Math.floor(bild.height / 2) * bild.width + Math.floor(bild.width / 2));
    return { sand: sand / n, tinte: tinte / n, weiss: weiss / n, grau: grau / n, bunt: bunt / n, mitte: [P[mitte], P[mitte + 1], P[mitte + 2]] };
  }, png.toString('base64'));
};
const p = (x) => `${(100 * x).toFixed(1).replace('.', ',')} %`;

// 1 Solid
const f1 = await farben('solid');
ok('1 Solid: vier sandfarbene Töne und ein Umriss in Tinte', (await O('material')) === 'Solid' && f1.sand > 0.05 && f1.tinte > 0.002 && f1.weiss > 0.3 && f1.bunt < 0.02, `sandfarben ${p(f1.sand)}, Tinte ${p(f1.tinte)}, weiß ${p(f1.weiss)}, anders bunt ${p(f1.bunt)}`);
// 2 Zebra
await s.keyboard.press('m');
await s.waitForTimeout(700);
const f2 = await farben('zebra');
ok('2 Zebra: Schwarz und Weiß auf der Form, keine Farbe', (await O('material')) === 'Zebra' && f2.sand < 0.002 && f2.tinte > 0.02 && f2.bunt < 0.02, `Tinte ${p(f2.tinte)}, grau ${p(f2.grau)}, sandfarben ${p(f2.sand)}, bunt ${p(f2.bunt)}`);
// 3 weiter: Seifenhaut; Menü und Speicher
await s.keyboard.press('m');
await s.waitForTimeout(700);
const m3 = await O('material');
const menue = await s.evaluate(() => [...document.querySelectorAll('#fassungen button')].map((b) => `${b.textContent}${b.getAttribute('aria-pressed') === 'true' ? '*' : ''}`));
const gemerkt = await s.evaluate(() => localStorage.getItem('ozzy.material'));
const f3 = await farben('seifenhaut');
ok('3 M weiter: die Seifenhaut, im Menü gezeigt und gemerkt', m3 === 'Seifenhaut' && menue.filter((x) => x.endsWith('*')).join() === 'Seifenhaut*' && menue.includes('Solid') && menue.includes('Zebra') && gemerkt === 'seifenhaut' && f3.sand < 0.01, `Material ${m3}; Menü ${menue.join(' ')}; gemerkt ${gemerkt}`);
// 4 eingerastet mit Solid: nur die Linienansicht; zurück im Raum der Körper
await O('material', 'solid');
await s.keyboard.press('1');
await s.waitForTimeout(2200);
await ruhig();
await s.mouse.move(40, 20);
await s.waitForTimeout(400);
const f4 = await farben('solid-eingerastet');
await s.keyboard.press('0');
await s.waitForTimeout(2200);
await ruhig();
await s.mouse.move(40, 20);
await s.waitForTimeout(400);
const f5 = await farben('solid-zurueck');
ok('4 eingerastet nur die Linienansicht, im Raum wieder der Körper', f4.sand < 0.002 && f5.sand > 0.05, `eingerastet sandfarben ${p(f4.sand)}, zurück im Raum ${p(f5.sand)}`);
ok('5 keine Fehler in der Konsole', fehler.length === 0, [...new Set(fehler)].slice(0, 3).join(' | '));
console.log(schlecht ? `${schlecht} nicht erfüllt` : 'alles gut');
await browser.close();
