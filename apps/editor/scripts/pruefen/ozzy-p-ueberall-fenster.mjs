// Ozzy, C2 im Plan „Ozzy stabil und schnell“ (18.11.2026): P quer über die Form, auf jeder Fläche gleich. (Bis dahin eine Übersicht
// ohne Kriterien, `ozzy-p-ueberall.mjs`; ihr Befund vom 17.11.: gebogen quer gab in der Seite „Keine Form“, in der Front einen Ring
// mit 32 umgeschlagenen Dreiecken.)
// Eine frische, einfache Form (Ellipse aus vier Punkten, aufgeblasen; ohne Linien, damit kein Klick eine vorhandene Linie trifft).
// Je Lage (eingerastet, gewendet, im Feld der Vier Ansichten, an der Wand im Raum; je Seite, Front, Top) dieselben Gesten in
// Blattkoordinaten der Fläche (Anteile der halben Ausdehnung der Form; `flaecheHin` bringt sie auf den Bildschirm):
//   gerade quer               Klick im Leeren, Klick im Leeren gegenüber, ↩
//   gebogen quer              Klick im Leeren, ein Punkt auf der Form (versetzt), Klick im Leeren gegenüber, ↩
//   gebogen auf einer Seite   (Front und Top) dasselbe auf einer Hälfte der Form: ein Loop dort, sein Spiegelbild gegenüber
// Kriterien:
//   1  Jede Geste gibt in jeder Lage genau einen neuen Loop, ohne Meldung, ohne umgeschlagene Dreiecke und ohne Punkt ohne
//      Spiegelbild; ein ⌘Z nimmt ihn zurück.
//   2  Je Ansicht ist der Befund in allen vier Lagen derselbe (Art des Loops, Zahl seiner sichtbaren Punkte).
//   3  Gebogen: Der Punkt auf der Form ist ein Punkt des Loops (sichtbar; läuft der Loop auch hinten über den Strich, vorn und hinten).
//   4  Keine Fehler in der Konsole.
// Passt eine Geste nicht in ein Feld der Vier Ansichten (schmales Feld), ist sie dort nicht geprüft; je Ansicht müssen mindestens
// zwei Lagen geprüft sein.
// Aufruf aus apps/editor, Ozzy auf 5205: node scripts/pruefen/ozzy-p-ueberall-fenster.mjs [ordner für Bilder]
//   NUR=einzelSeite,feldTop,… (Lagen: unten in `orte`)
import { auf } from './ozzy-teile.mjs';

const aus = process.argv[2] ?? '';
const { browser, s, O, klick, fehler } = await auf({ dichte: 1, extra: 'ohneLinie=1' });
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
let schlecht = 0;
const ok = (name, gut, text = '') => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};
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
const linien = async () => (await O('werkLinienDaten')).map((l) => ({ id: l.id, art: l.art, sichtbar: l.punkte.filter((q) => q.sichtbar).length }));
/** Lage → Taste dorthin und Blatt der Fläche */
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
/**
 * Gesten je Ansicht: Klicks in Anteilen der halben Ausdehnung der Form im Blatt (1 = ihr Rand), dann ↩. „Quer“ läuft in Front und
 * Top einmal über die Mitte (im Top liegt die Mitte waagerecht: Der Strich läuft dort senkrecht); „auf einer Seite“ bleibt auf einer
 * Hälfte. Dazu, was der Loop sein soll und wie viele sichtbare Punkte er mindestens hat (der gezeichnete Punkt vorn; läuft der Loop
 * auch hinten über den Strich, auch hinten).
 */
const quer = [
  [-1.3, 0.1],
  [1.3, 0.1],
];
const bogen = [
  [-1.3, 0.1],
  [0.15, -0.35],
  [1.3, 0.1],
];
const hoch = (g) => g.map(([u, v]) => [v, u]);
const gestenFuer = {
  seite: { 'gerade quer': { p: quer, punkte: 0 }, 'gebogen quer': { p: bogen, punkte: 1 } },
  front: {
    'gerade quer': { p: quer, punkte: 0 },
    'gebogen quer': { p: bogen, punkte: 1 },
    'gebogen auf einer Seite': { p: [[0.5, -1.3], [0.65, 0.15], [0.45, 1.3]], punkte: 2 },
  },
  top: {
    'gerade quer': { p: hoch(quer), punkte: 0 },
    'gebogen quer': { p: hoch(bogen), punkte: 1 },
    'gebogen auf einer Seite': { p: [[-1.3, 0.5], [0.15, 0.62], [1.3, 0.45]], punkte: 2 },
  },
};
const NUR = (process.env.NUR ?? Object.keys(orte).join(',')).split(',');
/** je Ansicht und Geste: Befund je Lage */
const befunde = {};
for (const ort of NUR) {
  const [taste, a] = orte[ort];
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
  for (const [name, G] of Object.entries(gestenFuer[a])) {
    const g = G.p;
    const vor = await linien();
    const umgVor = (await O('werk')).umgeschlagen;
    await s.keyboard.press('p');
    await s.waitForTimeout(350);
    const pts = [];
    let draussen = false;
    // in den Vier Ansichten muss die ganze Geste im Feld ihrer Ansicht liegen (sonst träfe ein Klick das Nachbarfeld)
    const feld = ort.startsWith('feld') ? (await O('felderJetzt'))?.[a] : null;
    for (const [u, v] of g) {
      const q = await O('flaecheHin', a, u * ex, v * ey);
      if (!q || q.x < 4 || q.y < 60 || q.x > 1436 || q.y > 880) draussen = true;
      else if (feld && (q.x < feld.x + 4 || q.x > feld.x + feld.w - 4 || q.y < feld.y + 4 || q.y > feld.y + feld.h - 4)) draussen = true;
      pts.push(q);
    }
    if (draussen) {
      console.log(`     ${ort}, ${name}: nicht geprüft (die Geste passt nicht ins Feld)`);
      await s.keyboard.press('v');
      continue;
    }
    for (const q of pts) await klick(q.x, q.y);
    await s.keyboard.press('Enter');
    await s.waitForTimeout(500);
    await ruhig(30000);
    const nach = await linien();
    const b = await O('bearbeiten');
    const w = await O('werk');
    const st = await O('standPruefen');
    const neu = nach.filter((x) => !vor.some((y) => y.id === x.id));
    if (aus) await s.screenshot({ path: `${aus}/ozzy-p-ueberall-${ort}-${name.replace(/ /g, '-')}.png` });
    // das Werkzeug verlassen, ohne Esc (Esc ginge ohne Werkzeug zurück aufs Blatt), dann zurück
    await s.keyboard.press('v');
    await s.keyboard.press('Meta+z');
    await ruhig(30000);
    const zurueck = (await linien()).length === vor.length;
    const befund = neu.map((l) => `${l.art} mit ${l.sichtbar} sichtbaren Punkten`).join(' + ') || 'nichts';
    const gut = neu.length === 1 && !b.meldung && w.umgeschlagen <= umgVor && st.ohne === 0 && zurueck && neu[0].sichtbar >= G.punkte;
    ok(`${ort}, ${name}`, gut, `${befund}${b.meldung ? `; Meldung „${String(b.meldung).slice(0, 90)}“` : ''}; umgeschlagen ${umgVor} → ${w.umgeschlagen}, ohne Spiegelbild ${st.ohne}${zurueck ? '' : '; ⌘Z nahm ihn nicht zurück'}`);
    ((befunde[`${a}, ${name}`] ??= {})[ort] = befund);
  }
}
for (const [fall, je] of Object.entries(befunde)) {
  const werte = [...new Set(Object.values(je))];
  ok(`${fall}: in allen geprüften Lagen derselbe Befund`, werte.length === 1 && (Object.keys(je).length >= 2 || NUR.length < 12), `${Object.entries(je).map(([o, b]) => `${o.replace(/Seite|Front|Top/, '')}: ${b}`).join(' · ')}`);
}
ok('keine Fehler in der Konsole', fehler.length === 0, [...new Set(fehler)].slice(0, 3).join(' | '));
console.log(schlecht ? `${schlecht} nicht erfüllt` : 'alles gut');
await browser.close();
