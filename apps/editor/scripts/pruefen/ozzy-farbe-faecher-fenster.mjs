// Ozzy, Paint-Modus, Etappe 6 (19.11.2026; Plan docs/plans/2026-11-19-ozzy-paint-modus.md, Abschnitt 17 und 18): die
// Ebenen-Ansicht: auffächern, Anordnung, drehen, antippen. Gebaut ist die schräg versetzte Anordnung; die Probe prüft über den
// Haken auch die Reihe nebeneinander. Das Malen auf den Kopien prüft `ozzy-farbe-faecher-malen-fenster.mjs`. An einer frischen
// Kugel auf Wachs: unten eine Ebene ganz in Blau, darüber eine Ebene mit einem runden Fleck in Rot.
//   70  Zusammengeschoben steht genau das Bild von vorher (kein Bildpunkt anders), nach dem Auffächern in beiden Anordnungen.
//   71  Aufgefächert steht je Ebene eine Kopie, und jede zeigt nur ihre Ebene (die untere blau ohne Fleck, die obere den Fleck auf Wachs).
//   72  Nebeneinander stehen die Kopien in einer Reihe und schneiden sich nicht; schräg versetzt liegt die obere Ebene weiter
//       rechts unten und vor der unteren.
//   73  Ins Leere ziehen dreht alle Kopien zugleich; jede bleibt an ihrem Platz und gleich groß.
//   74  Eine Kopie antippen: An ihrer Ebene wird gemalt. Esc schiebt die Kopien zusammen.
//   75  Keine Fehler in der Konsole.
// Dazu, ohne Kriterium: was ein Bild samt Grafikkarte kostet, zusammen und aufgefächert (auf dem hellen Solid: ein Bild seines
// Renderers, während gedreht wird; in Ruhe zeichnet er nicht neu).
// Aufruf aus apps/editor: GPU=1 OZZY_URL=http://localhost:5215/ozzy.html node scripts/pruefen/ozzy-farbe-faecher-fenster.mjs [ordner für Bilder]
// Auf dem hellen Solid: dasselbe mit MATERIAL='helles solid' davor.
import fs from 'node:fs';
import { auf, mitKarte } from './ozzy-teile.mjs';

const ordner = process.argv[2] ?? '';
const ROT = [1, 0, 0];
const BLAU = [0, 0, 1];
let schlecht = 0;
const ok = (name, gut, text = '') => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};
const z2 = (x) => (Number.isFinite(x) ? x.toFixed(2).replace('.', ',') : '–');

const MATERIAL = process.env.MATERIAL ?? 'wachs';
const HELL = MATERIAL !== 'wachs';
const t = await auf({ dichte: 1, extra: `ohneLinie=0&material=${encodeURIComponent(MATERIAL)}&fuellen=0` });
const { s, O, geladen, klick, fehler } = t;
const [cx, cy, R, k] = [720, 450, 150, 0.5523 * 150];
await O('form', [
  { x: cx + R, y: cy, ein: [0, -k], aus: [0, k] },
  { x: cx, y: cy + R, ein: [k, 0], aus: [-k, 0] },
  { x: cx - R, y: cy, ein: [0, k], aus: [0, -k] },
  { x: cx, y: cy - R, ein: [-k, 0], aus: [k, 0] },
]);
await s.waitForTimeout(300);
await O('aufblasen');
await geladen();
await s.waitForTimeout(800);
await O('blickSetzen', { gier: 0, neigung: 0, zoom: 1 });
await s.waitForTimeout(800);
await s.keyboard.press('b');
await s.waitForTimeout(500);
const M = [700, 440];
const r = 52;
await O('farbFuellen', M[0], M[1], BLAU);
await s.waitForTimeout(300);
const unten = (await O('farbEbenen')).ebenen[0].id;
const oben = await O('farbEbene', 'neu');
await s.keyboard.press('p');
await s.waitForTimeout(400);
for (let i = 0; i < 4; i++) {
  const w = (Math.PI / 2) * i - 0.4;
  const [x, y] = [M[0] + r * Math.cos(w), M[1] + r * Math.sin(w)];
  await s.mouse.move(x, y, { steps: 5 });
  await s.waitForTimeout(250);
  await s.mouse.down();
  for (let j = 1; j <= 6; j++) {
    await s.mouse.move(x - (0.55 * r * Math.sin(w) * j) / 6, y + (0.55 * r * Math.cos(w) * j) / 6);
    await s.waitForTimeout(22);
  }
  await s.mouse.up();
  await s.waitForTimeout(250);
}
await klick(M[0] + r * Math.cos(-0.4), M[1] + r * Math.sin(-0.4));
await s.waitForTimeout(400);
await s.keyboard.press('a');
await s.waitForTimeout(400);
await O('farbFuellen', M[0], M[1], ROT);
await s.waitForTimeout(400);
if ((await O('farbe')).ebenen.map((e) => `${e.linien}/${e.fuellungen}`).join() !== '0/1,1/1') throw new Error(`Vorbereitung: ${JSON.stringify((await O('farbe')).ebenen)}`);

/**
 * An den Stellen des Bilds (CSS-Pixel) lesen, was dort steht: 'rot', 'blau' oder 'anderes' (der Grund, Papier). Aus einem
 * Bildschirmfoto: Das helle Solid liegt auf einer eigenen Fläche über dem Raum.
 */
const farbe = async (punkte) => {
  await s.mouse.move(1380, 80);
  await s.waitForTimeout(350);
  const png = (await s.screenshot()).toString('base64');
  return s.evaluate(
    async ({ png, punkte }) => {
      const b = await createImageBitmap(await (await fetch(`data:image/png;base64,${png}`)).blob());
      const c = new OffscreenCanvas(b.width, b.height);
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(b, 0, 0);
      const f = b.width / window.innerWidth;
      return punkte.map(([x, y]) => {
        const d = g.getImageData(Math.round(x * f), Math.round(y * f), 1, 1).data;
        const [rr, gg, bb] = [d[0], d[1], d[2]];
        return rr > gg + 60 && rr > bb + 60 ? 'rot' : bb > gg + 60 && bb > rr + 60 ? 'blau' : 'anderes';
      });
    },
    { png, punkte },
  );
};
/** was ein Bild kostet (ms): auf Wachs samt Grafikkarte; auf dem hellen Solid ein Bild seines Renderers, während gedreht wird */
const kostenJetzt = async () => {
  if (!HELL) return (await mitKarte(s, 40)).gesamt;
  return s.evaluate(() => {
    const o = window.__ozzy;
    o.gast(true);
    o.film(true);
    const b = o.blickSetzen({});
    const z = [];
    for (let i = 0; i < 30; i++) {
      o.blickSetzen({ gier: b.gier + 0.002 * (i + 1) });
      o.bild(1 / 60);
      const m = o.gast();
      z.push(m.verzerren + m.zeichnen);
    }
    o.blickSetzen({ gier: b.gier });
    o.bild(1 / 60);
    o.film(false);
    o.gast(false);
    return z.sort((p, q) => p - q)[15];
  });
};
const AUS = { x: 380, y: 200, width: 700, height: 520 };
const bilder = {};
const schirm = async (name) => {
  await s.mouse.move(1380, 80);
  await s.waitForTimeout(350);
  bilder[name] = (await s.screenshot({ clip: AUS })).toString('base64');
  if (ordner) fs.writeFileSync(`${ordner}/ozzy-farbe-faecher-${HELL ? 'hell-' : ''}${name}.png`, Buffer.from(bilder[name], 'base64'));
};
const unterschied = (a, b) =>
  s.evaluate(
    async ({ a, b }) => {
      const lade = async (d) => createImageBitmap(await (await fetch(`data:image/png;base64,${d}`)).blob());
      const [A, B] = await Promise.all([lade(a), lade(b)]);
      const c = new OffscreenCanvas(A.width, A.height);
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(A, 0, 0);
      const p = g.getImageData(0, 0, A.width, A.height).data;
      g.clearRect(0, 0, A.width, A.height);
      g.drawImage(B, 0, 0);
      const q = g.getImageData(0, 0, A.width, A.height).data;
      let groesst = 0;
      for (let i = 0; i < p.length; i++) groesst = Math.max(groesst, Math.abs(p[i] - q[i]));
      return groesst;
    },
    { a: bilder[a], b: bilder[b] },
  );
/** warten, bis das Auffächern steht (auf oder zu) */
const steht = async (ziel) => {
  await s.waitForFunction((z) => Math.abs(window.__ozzy.faecher().f - z) < 1e-6, ziel, { timeout: 8000 });
  await s.waitForTimeout(250);
};
/** die Stelle einer Kopie, an der ein Ort der Form (CSS-Pixel im Bild der zusammengeschobenen Form) jetzt steht */
const aufKopie = (F, q, [x, y]) => [q.x + q.s * (x - F.kreis.x), q.y + q.s * (y - F.kreis.y)];

await O('malen', false);
await schirm('vorher');
await O('malen', true);
await s.waitForTimeout(400);
const kostenZu = await kostenJetzt();
const zeilen71 = [];
const zeilen72 = [];
let gut71 = true;
let gut72 = true;
let gut73 = true;
const zeilen73 = [];
const kosten = {};
for (const art of ['neben', 'schraeg']) {
  const auf0 = await O('faecher', true, art);
  await steht(1);
  const F = await O('faecher');
  const [A, B] = F.kopien;
  // 71: jede Kopie zeigt nur ihre Ebene. Der Fleck liegt bei M; daneben liegt auf der unteren Ebene Blau, auf der oberen nichts
  // (an der unteren Kopie links vom Fleck gelesen: Rechts von ihm liegt schräg versetzt die obere Kopie davor)
  const stellen = [aufKopie(F, A, M), aufKopie(F, A, [M[0] - 90, M[1]]), aufKopie(F, B, M), aufKopie(F, B, [M[0] + 90, M[1]])];
  const C = await farbe(stellen);
  const passt = auf0.offen && F.kopien.length === 2 && A.id === unten && B.id === oben && C.join() === 'blau,blau,rot,anderes';
  gut71 &&= passt;
  zeilen71.push(`${art}: untere Kopie am Fleck ${C[0]}, daneben ${C[1]}; obere Kopie am Fleck ${C[2]}, daneben ${C[3]}`);
  // 72: die Anordnung
  const d = F.kreis.r * 2 * A.s;
  // (die aktive Ebene ist die obere: nach dem Fleck gezeichnet)
  const [dx, dy] = [B.x - A.x, B.y - A.y];
  const lage = art === 'neben' ? Math.abs(dy) < 1 && dx >= 0.93 * d : dx > 0.3 * d && dx < 0.8 * d && dy > 0.1 * d;
  // (die Kopie der Ebene, an der gemalt wird, steht vorn und 5 % größer: hier die obere)
  gut72 &&= lage && Math.abs(B.s / A.s - 1.05) < 1e-6 && A.s <= 1 && B.rang === 1 && A.rang === 0;
  zeilen72.push(`${art}: Maßstab ${z2(A.s)}, die obere Kopie ${z2(dx / d)} Durchmesser weiter rechts und ${z2(dy / d)} tiefer`);
  if (ordner) fs.writeFileSync(`${ordner}/ozzy-farbe-faecher-${HELL ? 'hell-' : ''}${art}.png`, await s.screenshot());
  kosten[art] = await kostenJetzt();
  // 73: drehen, jede Kopie bleibt an ihrem Platz
  await s.mouse.move(1250, 760, { steps: 4 });
  await s.waitForTimeout(250);
  await s.mouse.down();
  for (let i = 1; i <= 30; i++) {
    await s.mouse.move(1250 - 4 * i, 760 - i);
    await s.waitForTimeout(16);
  }
  await s.waitForTimeout(500);
  const G = await O('faecher');
  await s.mouse.up();
  await s.waitForTimeout(900);
  const weit = Math.max(...G.kopien.map((q, i) => Math.hypot(q.x - F.kopien[i].x, q.y - F.kopien[i].y)));
  const gross = Math.max(...G.kopien.map((q, i) => Math.abs(q.s - F.kopien[i].s)));
  // (gedreht steht der Fleck woanders auf der Kopie: An seiner alten Stelle liegt auf der oberen Kopie jetzt Wachs oder er selbst)
  gut73 &&= weit < 2 && gross < 0.01;
  zeilen73.push(`${art}: nach dem Drehen liegt jede Kopie höchstens ${z2(weit)} Pixel neben ihrem Platz, Maßstab um ${z2(gross)} anders`);
  await O('blickSetzen', { gier: 0, neigung: 0, zoom: 1 });
  await s.waitForTimeout(600);
  await O('faecher', false);
  await steht(0);
}
ok('71 Aufgefächert steht je Ebene eine Kopie, und jede zeigt nur ihre Ebene', gut71, zeilen71.join(' · '));
ok('72 Nebeneinander in einer Reihe, ohne sich zu schneiden; schräg versetzt die obere Ebene weiter rechts unten', gut72, zeilen72.join(' · '));
ok('73 Ins Leere ziehen dreht alle Kopien zugleich; jede bleibt an ihrem Platz und gleich groß', gut73, zeilen73.join(' · '));
// 70: zusammengeschoben ist es das Bild von vorher
await O('malen', false);
await schirm('nachher');
const gleich = await unterschied('vorher', 'nachher');
await O('malen', true);
await s.waitForTimeout(400);
ok('70 Zusammengeschoben steht genau das Bild von vorher, nach dem Auffächern in beiden Anordnungen', gleich === 0, `größter Unterschied ${gleich} von 255`);
// 74: antippen wählt, Esc schiebt zusammen
{
  await O('faecher', true, 'neben');
  await steht(1);
  const F = await O('faecher');
  const [A, B] = F.kopien;
  await klick(A.x, A.y);
  await s.waitForTimeout(300);
  const a = (await O('farbEbenen')).ebenen.find((e) => e.aktiv)?.id;
  await klick(B.x, B.y);
  await s.waitForTimeout(300);
  const b = (await O('farbEbenen')).ebenen.find((e) => e.aktiv)?.id;
  // (daneben, im Leeren: Es bleibt dabei)
  await klick(F.kreis.x, 800);
  await s.waitForTimeout(300);
  const c = (await O('farbEbenen')).ebenen.find((e) => e.aktiv)?.id;
  // (antippen wählt nur: Ein Klick auf eine andere Kopie und einer ins Leere füllen nichts)
  const fuellungen = (await O('farbe')).ebenen.map((e) => e.fuellungen).join();
  await s.keyboard.press('Escape');
  await steht(0);
  const zu = !(await O('faecher')).offen;
  ok('74 Eine Kopie antippen: An ihrer Ebene wird gemalt. Esc schiebt die Kopien zusammen', a === unten && b === oben && c === oben && fuellungen === '1,1' && zu, `untere Kopie angetippt: aktiv ${a === unten ? 'die untere' : a}; obere: ${b === oben ? 'die obere' : b}; ins Leere: ${c === oben ? 'bleibt' : c}; Füllungen ${fuellungen}; nach Esc zu: ${zu}`);
}
console.log(`     gemessen (${MATERIAL}, 1440 × 900 Gerätepunkte): ein Bild samt Grafikkarte zusammen ${z2(kostenZu)} ms, aufgefächert mit zwei Kopien nebeneinander ${z2(kosten.neben)} ms, schräg versetzt ${z2(kosten.schraeg)} ms`);
ok('75 Keine Fehler in der Konsole', fehler.length === 0, fehler.slice(0, 3).join(' | '));
await t.browser.close();
console.log(schlecht ? `${schlecht} FEHL` : 'alles gut');
process.exit(schlecht ? 1 : 0);
