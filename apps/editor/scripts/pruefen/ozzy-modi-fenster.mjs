// Plan „Objekte, Spiegel und Nähte“ (18.11.2026), Etappe 1: die zwei Zeiger und der Objekt-Modus (Florian: „V ist schwarzer cursor
// für das ganze objekt und A ist weißer cursor für die punkte (edit) wie bei illustrator … auf schwarz darf es also nicht die farbe
// tauschen“), L wählt Verbundenes unter dem Zeiger, Q ist das Lasso.
//   A        nach dem Laden: Punkte, der Zeiger ist weiß gefüllt
//   V        Objekte: der Zeiger ist dunkel gefüllt, die Linien werden nicht bedient
//   Rückseite  von hinten (dunkler Grund): der weiße Zeiger bleibt weiß, der dunkle bleibt dunkel
//   Klick    auf die Form wählt sie (Schild darunter), daneben wählt ab; Doppelklick wechselt zu den Punkten
//   L        über der Form: alle Punkte gewählt; ⇧ + L: keiner
//   Q        das Lasso an und aus
//   ⌫        im Objekt-Modus löscht nur ein gewähltes Objekt
// Aufruf aus apps/editor: OZZY_URL=http://localhost:5211/ozzy.html node scripts/pruefen/ozzy-modi-fenster.mjs   BILD=<pfad ohne Endung>
import { auf } from './ozzy-teile.mjs';

const NAME = process.env.NAME ?? 'strange bird';
const BILD = process.env.BILD ?? '';
let schlecht = 0;
const ok = (name, gut, text = '') => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};
const { browser, s, O, geladen, ruhig, klick, fehler } = await auf({ form: NAME, dichte: 2 });
await geladen();
/**
 * Der Zeiger im Bild: in einem Kästchen um seine Spitze (CSS-Pixel) die deckenden hellen und die deckenden dunklen Bildpunkte der
 * Linien-Leinwand, gleich nach einem Bild gelesen (der Grund liegt auf einer anderen Leinwand und zählt nicht mit)
 */
const zeigerFarben = (x, y) =>
  s.evaluate(
    ([px, py]) => {
      const o = window.__ozzy;
      o.film(true);
      o.bild(1 / 60);
      const c = document.getElementById('linien');
      const gl = c.getContext('webgl2');
      const D = c.width / c.clientWidth;
      const b = Math.round(16 * D);
      const aus = new Uint8Array(4 * b * b);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.readPixels(Math.round((px - 3) * D), c.height - Math.round((py - 3) * D) - b, b, b, gl.RGBA, gl.UNSIGNED_BYTE, aus);
      o.film(false);
      let hell = 0;
      let dunkel = 0;
      for (let i = 0; i < aus.length; i += 4) {
        if (aus[i + 3] < 200) continue;
        if (aus[i] > 220 && aus[i + 1] > 220 && aus[i + 2] > 220) hell++;
        else if (aus[i] < 80 && aus[i + 1] < 80 && aus[i + 2] < 80) dunkel++;
      }
      return { hell, dunkel };
    },
    [x, y],
  );
const foto = async (name, x, y) => {
  if (BILD) await s.screenshot({ path: `${BILD}-${name}.png`, clip: { x: x - 70, y: y - 45, width: 160, height: 110 } });
};
// ein Ort im Leeren (links im Raum, weit weg von Linien und Form)
const LEER = [300, 520];
const zeigen = async () => {
  await s.mouse.move(LEER[0] - 30, LEER[1] - 20);
  await s.mouse.move(LEER[0], LEER[1], { steps: 4 });
  await s.waitForTimeout(500);
};

// ---------- A: Punkte, weißer Zeiger ----------
await zeigen();
let o = await O('objekt');
let z = await O('zeiger');
let f = await zeigerFarben(...LEER);
const txt = (q) => `${q.hell} helle, ${q.dunkel} dunkle Bildpunkte`;
ok('A (nach dem Laden): Punkte werden bedient, der Zeiger ist weiß mit dunklem Rand', !o.modus && o.werkzeug === 'auswahl' && z.farbe === 'weiss' && (await O('bearbeiten')).an && f.hell > 20 && f.dunkel > 10 && f.hell > f.dunkel / 2, txt(f));
await foto('a-hell', ...LEER);

// ---------- V: Objekte, dunkler Zeiger ----------
await s.keyboard.press('v');
await zeigen();
o = await O('objekt');
z = await O('zeiger');
f = await zeigerFarben(...LEER);
ok('V: Objekt-Modus, der Zeiger ist ganz dunkel, die Linien werden nicht bedient', o.modus && o.werkzeug === 'objekt' && z.farbe === 'dunkel' && !(await O('bearbeiten')).an && f.dunkel > 40 && f.hell === 0, txt(f));
await foto('v-hell', ...LEER);

// ---------- von hinten: dunkler Grund, keiner tauscht die Farbe ----------
await s.keyboard.press('Shift+Digit1');
await s.waitForTimeout(1800);
await zeigen();
const grund = await O('dunkelBei', LEER[0], LEER[1]);
f = await zeigerFarben(...LEER);
ok('V auf der dunklen Rückseite: bleibt dunkel, mit hellem Rand', grund > 0.5 && f.dunkel > 20 && f.hell > 10 && f.dunkel > f.hell / 2, `Grund dunkel ${grund.toFixed(2)}, ${txt(f)}`);
await foto('v-dunkel', ...LEER);
await s.keyboard.press('a');
await zeigen();
f = await zeigerFarben(...LEER);
ok('A auf der dunklen Rückseite: bleibt ganz weiß', f.hell > 40 && f.dunkel === 0 && (await O('zeiger')).farbe === 'weiss', txt(f));
await foto('a-dunkel', ...LEER);
await s.keyboard.press('0');
await s.waitForTimeout(1800);
await ruhig();

// ---------- V: Klick wählt, daneben wählt ab, Doppelklick → Punkte ----------
await s.keyboard.press('v');
const mitte = await O('werkImBild', { x: 0, y: 0, z: 0 });
await klick(mitte.x, mitte.y);
o = await O('objekt');
ok('V: Klick auf die Form wählt sie, das Schild hängt darunter', o.gewaehlt && !!o.schild && o.schild.y > mitte.y, o.schild ? `Schild „${o.schild.text}“ bei ${o.schild.x.toFixed(0)}, ${o.schild.y.toFixed(0)}` : 'kein Schild');
if (BILD) await s.screenshot({ path: `${BILD}-gewaehlt.png`, clip: { x: mitte.x - 280, y: mitte.y - 210, width: 560, height: 420 } });
await klick(LEER[0], LEER[1]);
o = await O('objekt');
ok('V: Klick daneben wählt ab', !o.gewaehlt && !o.schild);
await s.mouse.move(mitte.x, mitte.y, { steps: 3 });
await s.waitForTimeout(300);
await s.mouse.down();
await s.mouse.up();
await s.waitForTimeout(90);
await s.mouse.down();
await s.mouse.up();
await s.waitForTimeout(400);
o = await O('objekt');
ok('V: Doppelklick auf die Form wechselt zu ihren Punkten (A)', !o.modus && o.werkzeug === 'auswahl' && (await O('bearbeiten')).an);

// ---------- L: alles Verbundene unter dem Zeiger ----------
await s.mouse.move(mitte.x + 3, mitte.y + 3, { steps: 3 });
await s.waitForTimeout(400);
await s.keyboard.press('l');
await s.waitForTimeout(300);
let b = await O('bearbeiten');
ok('L über der Form: alle sichtbaren Punkte sind gewählt', b.auswahl.length > 0 && b.auswahl.length === b.sichtbar, `${b.auswahl.length} von ${b.sichtbar} sichtbaren Punkten`);
await s.keyboard.press('Shift+L');
await s.waitForTimeout(300);
b = await O('bearbeiten');
ok('⇧ + L: nichts mehr gewählt', b.auswahl.length === 0 && b.werkAuswahl.length === 0);
await s.mouse.move(LEER[0], LEER[1], { steps: 3 });
await s.waitForTimeout(300);
await s.keyboard.press('l');
await s.waitForTimeout(200);
ok('L im Leeren: wählt nichts', (await O('bearbeiten')).auswahl.length === 0);

// ---------- Q: das Lasso ----------
await s.keyboard.press('q');
ok('Q: Lasso an', (await O('objekt')).werkzeug === 'lasso' && (await O('zeiger')).art === 'schlinge');
await s.keyboard.press('q');
ok('Q noch einmal: zurück zu den Punkten', (await O('objekt')).werkzeug === 'auswahl');

// ---------- ⌫ im Objekt-Modus ----------
await s.keyboard.press('v');
await s.keyboard.press('Backspace');
await s.waitForTimeout(300);
ok('V, ⌫ ohne gewähltes Objekt: nichts geschieht', (await O('stand')).zustand === 'ruhe');
await klick(mitte.x, mitte.y);
await s.keyboard.press('Backspace');
await s.waitForTimeout(400);
ok('V, ⌫ mit gewähltem Objekt: die Luft geht ab', (await O('stand')).zustand !== 'ruhe', (await O('stand')).zustand);

ok('keine Fehler in der Konsole', fehler.length === 0, fehler.slice(0, 3).join(' | '));
console.log(schlecht ? `${schlecht} Punkte FEHLEN` : 'alles gut');
await browser.close();
process.exit(schlecht ? 1 : 0);
