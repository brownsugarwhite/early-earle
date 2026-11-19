// Ozzy, Materialien neben der Seifenhaut (18.11.2026; Florian: „solid wie in http://localhost:5197/kurven.html?gewichte=geometrie“,
// „zebra“, „jelly und helles solid … ohne die extra outlines“, „dann auf weiß“, „das grüne Material dann ohne Bauch“, „Du kannst die
// Materialien erstmal ins Ozzy-Menü packen“), an „strange bird“ (NAME).
// Kriterien:
//   1  Solid (`?material=solid`): Im Raum trägt die Form die vier Töne des Prüffensters (Körperfarbe 0xe2b98e mal 70, 135, 200, 255
//      von 255 unter seinem Licht; geprüft: Die Mitte der Form ist sandfarben, Rot > Grün > Blau) und einen Umriss in Tinte; an den
//      Wänden und im Leeren bleibt das Papier weiß.
//   2  Zebra (Taste M von Solid aus): Schwarz und Weiß zu etwa gleichen Teilen auf der Form, keine Farbe.
//   2b Wachs (M weiter; 19.11., Florian: „Das Basismaterial, so wie es Z-Brush benutzt, aber mehr in magenta statt rot“): die Form in
//      Magenta (Rot und Blau über Grün) mit weichem Verlauf, kein Umriss in Tinte um die Form, das Papier bleibt weiß; mit dem
//      Farbton 0 (Feinregler „Material Wachs“) ist sie rot wie ZBrush.
//   3  Jelly (M weiter): die Form in Türkis auf dem weißen Raum (der dunkle Grund des Blaupause-Editors bleibt weg); das Bild des
//      Gasts liegt auf Ozzys Bild der Haut (höchstens 0,5 Gerätepunkte daneben).
//   4  Helles Solid (M weiter): der Körper weiß und lavendel, die Kante in Petrol; kein Türkis, kein dunkler Grund, keine Platten in
//      Rosa und Lila.
//   4b Grün (M weiter): die Form im Grün des alten Editors mit dunkleren Punkten, auf dem weißen Raum; sein Renderer ist erst jetzt
//      geladen.
//   5  M weiter: wieder die Seifenhaut; das Menü zeigt die Wahl (ein Knopf gedrückt), sie ist gemerkt (`ozzy.material`), und die
//      Flächen der Gäste sind verborgen.
//   6  Eingerastet (Taste 1) liegt mit Solid nur die Linienansicht im Bild (kein sandfarbener Körper), zurück im Raum (0) ist er wieder
//      da; ebenso mit Jelly (kein Türkis eingerastet, die Fläche des Gasts verborgen).
//   7  Jelly nach dem Drehen (ins Leere gezogen) und in den Vier Ansichten (Tab): Das Bild des Gasts liegt weiter auf Ozzys Bild.
//   8  Keine Fehler in der Konsole.
// Gemessen (kein Kriterium): wie lange ein Bild des Gasts braucht (Verzerren, Zeichnen bis die Grafikkarte fertig ist).
// Aufruf aus apps/editor: GPU=1 [NAME=…] node scripts/pruefen/ozzy-material-fenster.mjs [ordner für Bilder]
import { auf } from './ozzy-teile.mjs';

const ordner = process.argv[2] ?? '';
const NAME = process.env.NAME ?? 'strange bird';
const { browser, s, O, geladen, ruhig, ziehen, fehler } = await auf({ form: NAME, extra: 'material=solid' });
let schlecht = 0;
const ok = (name, gut, text = '') => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};
await geladen();
await s.waitForTimeout(1800);
await s.mouse.move(40, 20);
await s.waitForTimeout(400);

/** Farben im Kasten um die Mitte des Bilds (dort steht die Form): Anteile je Farbe */
const farben = async (name) => {
  const png = await s.screenshot({ clip: { x: 420, y: 180, width: 600, height: 520 } });
  if (ordner) (await import('node:fs')).writeFileSync(`${ordner}/ozzy-material-${name}.png`, png);
  return s.evaluate(async (daten) => {
    const bild = await createImageBitmap(await (await fetch(`data:image/png;base64,${daten}`)).blob());
    const c = new OffscreenCanvas(bild.width, bild.height);
    const g = c.getContext('2d');
    g.drawImage(bild, 0, 0);
    const P = g.getImageData(0, 0, bild.width, bild.height).data;
    let sand = 0, tinte = 0, weiss = 0, grau = 0, bunt = 0, tuerkis = 0, petrol = 0, lavendel = 0, rosa = 0, gruen = 0, punkt = 0, wachs = 0, rot = 0;
    const n = P.length / 4;
    for (let i = 0; i < P.length; i += 4) {
      const r = P[i], gg = P[i + 1], b = P[i + 2];
      const max = Math.max(r, gg, b), min = Math.min(r, gg, b);
      if (min > 244) weiss++;
      else if (r < 30 && gg > 40 && gg < 95 && b > 55 && b < 110) petrol++;
      else if (max < 60) tinte++;
      else if (gg > 120 && b > 120 && r < 0.62 * gg) tuerkis++;
      else if (gg > r + 25 && gg > b + 45 && gg >= 135) gruen++;
      else if (gg > r + 15 && gg > b + 30 && gg < 135) punkt++;
      else if (r > 215 && b > 228 && gg > 205 && gg < r && r < b) lavendel++;
      else if (r > 200 && gg < 170 && b > 140) rosa++;
      else if (r > gg + 25 && b > gg + 10 && r < 200) wachs++;
      else if (r > gg + 45 && r > b + 45 && gg < 0.62 * r && Math.abs(gg - b) < 14) rot++;
      else if (r > gg + 12 && gg > b + 12 && r > 110) sand++;
      else if (max - min < 14) grau++;
      else bunt++;
    }
    const mitte = 4 * (Math.floor(bild.height / 2) * bild.width + Math.floor(bild.width / 2));
    const a = (x) => x / n;
    return { wachs: a(wachs), rot: a(rot), sand: a(sand), tinte: a(tinte), weiss: a(weiss), grau: a(grau), bunt: a(bunt), tuerkis: a(tuerkis), petrol: a(petrol), lavendel: a(lavendel), rosa: a(rosa), gruen: a(gruen), punkt: a(punkt), mitte: [P[mitte], P[mitte + 1], P[mitte + 2]] };
  }, png.toString('base64'));
};
const p = (x) => `${(100 * x).toFixed(1).replace('.', ',')} %`;
const z2 = (x) => x.toFixed(2).replace('.', ',');
const menueJetzt = () => s.evaluate(() => [...document.querySelectorAll('#fassungen button')].map((b) => `${b.textContent}${b.getAttribute('aria-pressed') === 'true' ? '*' : ''}`));

// 1 Solid
const f1 = await farben('solid');
ok('1 Solid: vier sandfarbene Töne und ein Umriss in Tinte', (await O('material')) === 'Solid' && f1.sand > 0.05 && f1.tinte > 0.002 && f1.weiss > 0.3 && f1.bunt < 0.02, `sandfarben ${p(f1.sand)}, Tinte ${p(f1.tinte)}, weiß ${p(f1.weiss)}, anders bunt ${p(f1.bunt)}`);
// 2 Zebra
await s.keyboard.press('m');
await s.waitForTimeout(700);
const f2 = await farben('zebra');
ok('2 Zebra: Schwarz und Weiß auf der Form, keine Farbe', (await O('material')) === 'Zebra' && f2.sand < 0.002 && f2.tinte > 0.02 && f2.bunt < 0.02 && f2.tuerkis < 0.002, `Tinte ${p(f2.tinte)}, grau ${p(f2.grau)}, sandfarben ${p(f2.sand)}, bunt ${p(f2.bunt)}`);
// 2b Wachs: Magenta als Grundwert; mit dem Farbton 0 rot wie ZBrush
await s.keyboard.press('m');
await s.waitForTimeout(900);
const f2b = await farben('wachs');
const regler = async (wert) =>
  s.evaluate((v) => {
    const zeile = [...document.querySelectorAll('#regler-liste label')].find((l) => l.textContent.includes('Farbton'));
    const eingabe = zeile?.querySelector('input');
    if (!eingabe) return false;
    eingabe.value = String(v);
    eingabe.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }, wert);
const reglerDa = await regler(0);
await s.waitForTimeout(700);
const f2c = await farben('wachs-rot');
await regler(-40);
await s.waitForTimeout(500);
ok(
  '2b Wachs: Magenta mit weichem Verlauf, ohne Umriss; Farbton 0 ist rot wie ZBrush',
  (await O('material')) === 'Wachs' && f2b.wachs > 0.05 && f2b.sand < 0.002 && f2b.rot < 0.01 && f2b.weiss > 0.3 && f2b.tinte < f1.tinte + 0.03 && reglerDa && f2c.rot > 0.03 && f2c.wachs < 0.02,
  `Magenta ${p(f2b.wachs)}, rot ${p(f2b.rot)}, sehr dunkel ${p(f2b.tinte)}, weiß ${p(f2b.weiss)}; mit Farbton 0: rot ${p(f2c.rot)}, Magenta ${p(f2c.wachs)}`,
);
// 3 Jelly
await s.keyboard.press('m');
await s.waitForTimeout(2500);
const f3 = await farben('jelly');
const g3 = await O('gast');
ok(
  '3 Jelly: Türkis auf dem weißen Raum, auf Ozzys Bild der Haut',
  (await O('material')) === 'Jelly' && g3.sichtbar && f3.tuerkis > 0.05 && f3.weiss > 0.3 && f3.sand < 0.002 && f3.tinte < 0.01 && g3.abweichung >= 0 && g3.abweichung <= 0.5,
  `Türkis ${p(f3.tuerkis)}, weiß ${p(f3.weiss)}, dunkel ${p(f3.tinte)}; ${z2(g3.abweichung)} Gerätepunkte neben Ozzys Bild; Fenster des Gasts ${g3.fenster.join(' × ')}`,
);
// 4 helles Solid
await s.keyboard.press('m');
await s.waitForTimeout(2500);
const f4 = await farben('helles-solid');
const g4 = await O('gast');
ok(
  '4 helles Solid: weiß und lavendel mit Kante in Petrol, nichts drumherum',
  (await O('material')) === 'Helles Solid' && g4.sichtbar && f4.lavendel > 0.01 && f4.petrol > 0.002 && f4.tuerkis < 0.002 && f4.tinte < 0.01 && f4.rosa < 0.002 && f4.weiss > 0.5 && g4.abweichung <= 0.5,
  `lavendel ${p(f4.lavendel)}, Petrol ${p(f4.petrol)}, weiß ${p(f4.weiss)}, dunkel ${p(f4.tinte)}, Rosa und Lila ${p(f4.rosa)}; ${z2(g4.abweichung)} Gerätepunkte neben Ozzys Bild`,
);
// 4b Grün: sein Renderer wird erst jetzt geladen
const vorher = await O('gruen');
await s.keyboard.press('m');
await s.waitForFunction(() => window.__ozzy.gruen().sichtbar && window.__ozzy.gruen().bilder >= 2, null, { timeout: 60000 }).catch(() => undefined);
await s.waitForTimeout(1500);
const f4b = await farben('gruen');
const g4b = await O('gruen');
ok(
  '4b Grün: das Grün des alten Editors mit dunkleren Punkten, auf dem weißen Raum',
  (await O('material')) === 'Grün' && !vorher.geladen && g4b.sichtbar && f4b.gruen > 0.03 && f4b.punkt > 0.0015 && f4b.weiss > 0.5 && f4b.tuerkis < 0.002 && f4b.tinte < 0.01 && !(await O('gast')).sichtbar,
  `grün ${p(f4b.gruen)}, dunkles Grün (Punkte, Schatten) ${p(f4b.punkt)}, weiß ${p(f4b.weiss)}; vorher geladen ${vorher.geladen}; auf ${g4b.unterbau}, ${g4b.bilder} Bilder, letztes ${z2(g4b.zeichnen)} ms`,
);
// 5 weiter: Seifenhaut; Menü und Speicher
await s.keyboard.press('m');
await s.waitForTimeout(900);
const m5 = await O('material');
const menue = await menueJetzt();
const gemerkt = await s.evaluate(() => localStorage.getItem('ozzy.material'));
const f5 = await farben('seifenhaut');
const g5 = await O('gast');
ok(
  '5 M weiter: die Seifenhaut, im Menü gezeigt und gemerkt, die Flächen der Gäste verborgen',
  m5 === 'Seifenhaut' && menue.filter((x) => x.endsWith('*')).join() === 'Seifenhaut*' && ['Solid', 'Zebra', 'Wachs', 'Jelly', 'Helles Solid', 'Grün'].every((x) => menue.includes(x)) && gemerkt === 'seifenhaut' && f5.sand < 0.01 && f5.tuerkis < 0.01 && f5.gruen < 0.01 && !g5.sichtbar && !(await O('gruen')).sichtbar,
  `Material ${m5}; Menü ${menue.join(' ')}; gemerkt ${gemerkt}; Gast sichtbar ${g5.sichtbar}`,
);
// 6 eingerastet: nur die Linienansicht; zurück im Raum der Körper (Solid und Jelly)
const einUndAus = async (name) => {
  await O('material', name);
  await s.waitForTimeout(1200);
  await s.keyboard.press('1');
  await s.waitForTimeout(2200);
  await ruhig();
  await s.mouse.move(40, 20);
  await s.waitForTimeout(400);
  const ein = await farben(`${name}-eingerastet`);
  const gEin = await O('gast');
  await s.keyboard.press('0');
  await s.waitForTimeout(2200);
  await ruhig();
  await s.mouse.move(40, 20);
  await s.waitForTimeout(600);
  return { ein, gEin, aus: await farben(`${name}-zurueck`), gAus: await O('gast') };
};
const eS = await einUndAus('solid');
const eJ = await einUndAus('jelly');
ok(
  '6 eingerastet nur die Linienansicht, im Raum wieder der Körper',
  eS.ein.sand < 0.002 && eS.aus.sand > 0.05 && eJ.ein.tuerkis < 0.002 && !eJ.gEin.sichtbar && eJ.aus.tuerkis > 0.05 && eJ.gAus.sichtbar && eJ.gAus.deckung > 0.99,
  `Solid eingerastet sandfarben ${p(eS.ein.sand)}, zurück ${p(eS.aus.sand)}; Jelly eingerastet Türkis ${p(eJ.ein.tuerkis)} (Gast sichtbar ${eJ.gEin.sichtbar}), zurück ${p(eJ.aus.tuerkis)}`,
);
// 7 Jelly nach dem Drehen und in den Vier Ansichten
await ziehen(1250, 200, 1130, 250, { schritte: 10 });
await s.waitForTimeout(2500);
await ruhig();
const g7a = await O('gast');
const f7a = await farben('jelly-gedreht');
// Zeiten eines Bilds (Grafikkarte abgewartet): einmal neu zeichnen lassen
await O('gast', true);
await ziehen(1250, 200, 1262, 204, { schritte: 4 });
await s.waitForTimeout(1500);
await ruhig();
const zeit = await O('gast', false);
await s.keyboard.press('Tab');
await s.waitForTimeout(2600);
await ruhig();
await s.mouse.move(40, 20);
await s.waitForTimeout(600);
const g7b = await O('gast');
if (ordner) await s.screenshot({ path: `${ordner}/ozzy-material-jelly-vier.png` });
ok(
  '7 Jelly liegt nach dem Drehen und in den Vier Ansichten auf Ozzys Bild',
  g7a.sichtbar && g7a.abweichung >= 0 && g7a.abweichung <= 0.5 && f7a.tuerkis > 0.02 && g7b.sichtbar && g7b.abweichung >= 0 && g7b.abweichung <= 0.5,
  `gedreht ${z2(g7a.abweichung)} Gerätepunkte (Türkis ${p(f7a.tuerkis)}), Vier Ansichten ${z2(g7b.abweichung)} (Fenster des Gasts ${g7b.fenster.join(' × ')})`,
);
console.log(`     gemessen: ein Bild des Jelly im Raum: Verzerren ${z2(zeit.verzerren)} ms, Zeichnen ${z2(zeit.zeichnen)} ms (Fenster ${zeit.fenster.join(' × ')} Gerätepunkte); Körper vermessen ${z2(zeit.koerper)} ms`);
ok('8 keine Fehler in der Konsole', fehler.length === 0, [...new Set(fehler)].slice(0, 3).join(' | '));
console.log(schlecht ? `${schlecht} nicht erfüllt` : 'alles gut');
await browser.close();
