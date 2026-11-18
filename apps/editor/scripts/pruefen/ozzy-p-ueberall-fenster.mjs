// Ozzy, Plan „Ozzy stabil und schnell“ (17.11.2026): Was macht P wo? Eine Übersicht, keine Prüfung (bis der Block „P überall gleich“
// gebaut ist; dann wird daraus die Probe mit den Kriterien des Plans).
// Je Versuch eine frische, einfache Form (Ellipse aus vier Punkten, aufgeblasen; ohne Linien, damit kein Klick eine vorhandene Linie
// trifft), dann in eine Ansicht, P, eine Geste aus Klicks. Die Klicks liegen in Blattkoordinaten der Fläche (Anteile der halben
// Ausdehnung der Form), `flaecheHin` bringt sie auf den Bildschirm: so ist es auf jeder Fläche dieselbe Geste.
// Gemeldet wird: Linien vorher → nachher, was neu ist (Kennung:Art:Punkte), die Meldung des Werks, umgeschlagene Dreiecke.
// Aufruf aus apps/editor, Ozzy auf 5205:
//   node scripts/pruefen/ozzy-p-ueberall.mjs [ordner für Bilder]
//   MIT=1 (mit Linie an der Spiegelkante) · NUR=einzelSeite,feldTop,… (Orte: unten in `orte`)
import { auf } from './ozzy-teile.mjs';

const aus = process.argv[2] ?? '';
const MIT = process.env.MIT === '1';
const { browser, s, O, klick, fehler } = await auf({ dichte: 1, extra: `ohneLinie=${MIT ? 0 : 1}` });
const cx = 720;
const cy = 450;
const rx = 230;
const ry = 140;
const k = 0.5523;
const ELLIPSE = [
  { x: cx + rx, y: cy, ein: [0, k * ry], aus: [0, -k * ry] },
  { x: cx, y: cy - ry, ein: [k * rx, 0], aus: [-k * rx, 0] },
  { x: cx - rx, y: cy, ein: [0, -k * ry], aus: [0, k * ry] },
  { x: cx, y: cy + ry, ein: [-k * rx, 0], aus: [k * rx, 0] },
];
const ruhig = async (t = 25000) => {
  await s.waitForTimeout(300);
  await s.waitForFunction(() => window.__ozzy.bearbeiten().an && !window.__ozzy.bearbeiten().beschaeftigt && !window.__ozzy.werk().griffWartet, null, { timeout: t });
  await s.waitForTimeout(250);
};
const frisch = async () => {
  await s.evaluate((a) => {
    window.__ozzy.form(a);
    window.__ozzy.aufblasen();
  }, ELLIPSE);
  await s.waitForFunction(() => window.__ozzy.werk().gezeigt && window.__ozzy.stand().zustand === 'ruhe', null, { timeout: 60000 });
  await ruhig(60000);
};
const linien = async () => (await O('werkLinienDaten')).map((l) => `${l.id}:${l.art}:${l.punkte.length}${l.haengt ? ':h' : ''}`);
/** Ort → Taste dorthin und Blatt der Fläche */
const orte = {
  einzelSeite: ['1', 'seite'],
  einzelFront: ['3', 'front'],
  einzelTop: ['7', 'top'],
  gewendetSeite: ['Shift+1', 'seite'],
  gewendetFront: ['Shift+3', 'front'],
  gewendetTop: ['Shift+7', 'top'],
  feldSeite: ['Tab', 'seite'],
  feldFront: ['Tab', 'front'],
  feldTop: ['Tab', 'top'],
  wandSeite: ['', 'seite'],
  wandFront: ['', 'front'],
  wandTop: ['', 'top'],
};
/** Gesten: Klicks in Anteilen der halben Ausdehnung der Form im Blatt (1 = ihr Rand), danach eine Taste */
const gesten = {
  'Form (4 Klicks, zu)': { p: [[-0.3, -0.3], [0.3, -0.3], [0.3, 0.3], [-0.3, 0.3], [-0.3, -0.3]], ende: '' },
  'gerade quer, ↩': { p: [[-1.3, 0.1], [1.3, 0.1]], ende: 'Enter' },
  'gerade hoch, ↩': { p: [[0.1, -1.3], [0.1, 1.3]], ende: 'Enter' },
  'gebogen quer (3 Klicks), ↩': { p: [[-1.3, 0.1], [0, -0.4], [1.3, 0.1]], ende: 'Enter' },
  'offen auf dem Körper (3 Klicks), ↩': { p: [[-0.4, 0], [0, -0.3], [0.4, 0]], ende: 'Enter' },
};
const NUR = (process.env.NUR ?? Object.keys(orte).join(',')).split(',');
console.log('| Ort | Geste | Linien | neu | Meldung | Zustand |\n| --- | --- | --- | --- | --- | --- |');
for (const ort of NUR) {
  const [taste, a] = orte[ort];
  for (const [name, g] of Object.entries(gesten)) {
    let zeile = '';
    try {
      await frisch();
      if (taste) {
        await s.keyboard.press(taste);
        await s.waitForTimeout(1900);
        await ruhig();
      }
      const R = await O('werkRoh');
      let ex = 0;
      let ey = 0;
      for (let i = 0; i < R.pos.length; i += 3) {
        const X = a === 'front' ? R.pos[i + 2] : R.pos[i];
        const Y = a === 'top' ? R.pos[i + 2] : -R.pos[i + 1];
        ex = Math.max(ex, Math.abs(X));
        ey = Math.max(ey, Math.abs(Y));
      }
      const vor = await linien();
      await s.keyboard.press('p');
      await s.waitForTimeout(350);
      const pts = [];
      let draussen = false;
      // in den Vier Ansichten muss die ganze Geste im Feld ihrer Ansicht liegen (sonst träfe ein Klick das Nachbarfeld)
      const feld = ort.startsWith('feld') ? (await O('felderJetzt'))?.[a] : null;
      for (const [u, v] of g.p) {
        const q = await O('flaecheHin', a, u * ex, v * ey);
        if (!q) throw new Error('keine Fläche');
        if (q.x < 4 || q.y < 60 || q.x > 1436 || q.y > 880) draussen = true;
        if (feld && (q.x < feld.x + 4 || q.x > feld.x + feld.w - 4 || q.y < feld.y + 4 || q.y > feld.y + feld.h - 4)) draussen = true;
        pts.push(q);
      }
      if (draussen) {
        // die Geste passt nicht in die Fläche (schmales Feld): kein Befund
        console.log(`| ${ort} | ${name} | – | – | nicht geprüft: die Geste passt nicht ins Feld | |`);
        await s.keyboard.press('v');
        continue;
      }
      for (const q of pts) await klick(q.x, q.y);
      if (g.ende) await s.keyboard.press(g.ende);
      await s.waitForTimeout(500);
      let unruhe = '';
      try {
        await ruhig(30000);
      } catch {
        unruhe = ' · kommt nicht zur Ruhe';
      }
      const nach = await linien();
      const b = await O('bearbeiten');
      const w = await O('werk');
      const neu = nach.filter((x) => !vor.includes(x));
      zeile = `| ${ort} | ${name} | ${vor.length} → ${nach.length} | ${neu.join(' ') || '–'} | ${(b.meldung || '').slice(0, 110)} | umgeschlagen ${w.umgeschlagen}${unruhe} |`;
      if (aus) await s.screenshot({ path: `${aus}/ozzy-p-${MIT ? 'mit' : 'ohne'}-${ort}-${name.replace(/[^a-zA-Z]+/g, '_')}.png` });
      // das Werkzeug verlassen, ohne Esc (Esc ginge ohne Werkzeug zurück aufs Blatt)
      await s.keyboard.press('v');
    } catch (e) {
      zeile = `| ${ort} | ${name} | – | – | Abbruch: ${String(e).slice(0, 160)} | |`;
    }
    console.log(zeile);
  }
}
if (fehler.length) console.log('Fehler:', [...new Set(fehler)].slice(0, 6).join(' | '));
await browser.close();
