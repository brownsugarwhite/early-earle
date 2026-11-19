// Ozzy, Paint-Modus, Etappe 6 (19.11.2026; Plan docs/plans/2026-11-19-ozzy-paint-modus.md, Abschnitt 18): in der Ebenen-Ansicht
// malen. An einer frischen Kugel auf Wachs: unten eine Ebene ganz in Blau, darüber eine Ebene mit einem runden Fleck in Rot;
// aufgefächert in der gebauten Anordnung (schräg versetzt).
//   76  P auf der vorderen Kopie: Jeder Punkt liegt höchstens einen Gerätepunkt neben dem Klick; ein Klick mit A füllt die neue
//       Fläche, und sie liegt auf der Ebene dieser Kopie.
//   77  Eine andere Kopie antippen: Sie tritt vor (vor die anderen, ein wenig größer). Dort gezeichnet und gefüllt, liegt es auf
//       ihrer Ebene.
//   78  Einen Punkt einer Farblinie auf der vorderen Kopie ziehen: Er bleibt unter dem Zeiger.
//   79  Der Tropfen am Faden eines gewählten Punkts: Wegziehen macht die Kante dort weich.
//   80  Ein Farbtropfen aus der Leiste, auf eine andere Kopie gezogen, füllt auf ihrer Ebene; an ihr wird von da an gemalt.
//   81  Die Pipette nimmt von jeder Kopie die Farbe ihrer Ebene; die vordere Kopie bleibt die vordere.
//   82  Das Rad zoomt zum Zeiger hin, für alle Kopien zugleich: Was unter dem Zeiger lag, bleibt dort. Pos1 passt die Reihe wieder ein.
//   83  Aus- und einblenden, anlegen und ordnen: Die Kopien rücken und wachsen, keine springt.
//   84  Freihand, Formen und Objekte gibt es aufgefächert nicht; Esc beendet erst P, dann schiebt es die Kopien zusammen.
//   85  Zusammengeschoben stehen Zoom und Schwenk wieder wie vor dem Auffächern.
//   86  Keine Fehler in der Konsole.
// Dazu, ohne Kriterium: was ein Bild samt Grafikkarte kostet, zusammen und aufgefächert, solange die Farblinien bedient werden.
// Aufruf aus apps/editor: GPU=1 OZZY_URL=http://localhost:5215/ozzy.html node scripts/pruefen/ozzy-farbe-faecher-malen-fenster.mjs [ordner für Bilder]
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
/** ein runder Fleck mit P um einen Ort des Bilds: vier gezogene Punkte, auf dem ersten geschlossen. Zurück: wo gedrückt wurde */
const fleck = async ([mx, my], r) => {
  const orte = [];
  for (let i = 0; i < 4; i++) {
    const w = (Math.PI / 2) * i - 0.4;
    const [x, y] = [Math.round(mx + r * Math.cos(w)), Math.round(my + r * Math.sin(w))];
    orte.push([x, y]);
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
  await klick(orte[0][0], orte[0][1]);
  await s.waitForTimeout(400);
  return orte;
};
const M = [700, 440];
await O('farbFuellen', M[0], M[1], BLAU);
await s.waitForTimeout(300);
const unten = (await O('farbEbenen')).ebenen[0].id;
const oben = await O('farbEbene', 'neu');
await s.keyboard.press('p');
await s.waitForTimeout(400);
await fleck(M, 52);
await s.keyboard.press('a');
await s.waitForTimeout(400);
await O('farbFuellen', M[0], M[1], ROT);
await s.waitForTimeout(400);
const zahlen = async () => (await O('farbe')).ebenen.map((e) => `${e.linien}/${e.fuellungen}`).join();
if ((await zahlen()) !== '0/1,1/1') throw new Error(`Vorbereitung: ${await zahlen()}`);
const aktiv = async () => (await O('farbEbenen')).ebenen.find((e) => e.aktiv)?.id;
/** warten, bis das Auffächern steht (auf oder zu) und keine Kopie mehr rückt */
const steht = async (ziel) => {
  await s.waitForFunction((z) => Math.abs(window.__ozzy.faecher().f - z) < 1e-6, ziel, { timeout: 8000 });
  await s.waitForTimeout(700);
};
/** die Stelle einer Kopie, an der ein Ort der Form (CSS-Pixel im Bild der zusammengeschobenen Form) jetzt steht */
const aufKopie = (F, q, [x, y]) => [q.x + (q.s * (x - K0.x) * F.kreis.r) / K0.r, q.y + (q.s * (y - K0.y) * F.kreis.r) / K0.r];
const kopie = (F, id) => F.kopien.find((q) => q.id === id);
const blick0 = await O('blickSetzen', {});
const kostenZu = (await mitKarte(s, 40)).gesamt;
// (der Kreis um die Form, bevor aufgefächert und gezoomt wird: An ihm misst `aufKopie`)
const K0 = (await O('faecher')).kreis;

await O('faecher', true);
await steht(1);
let F = await O('faecher');
if (!F.offen || F.art !== 'schraeg' || F.kopien.length !== 2) throw new Error(`Die Ebenen-Ansicht steht nicht: ${JSON.stringify(F)}`);
const kostenAuf = (await mitKarte(s, 40)).gesamt;

// 76: P auf der vorderen Kopie (der oberen Ebene)
{
  const B = kopie(F, oben);
  const Z = aufKopie(F, B, [790, 520]);
  await s.keyboard.press('p');
  await s.waitForTimeout(400);
  const orte = await fleck(Z, 22);
  const P = await O('farbPunkte', 1);
  const weit = P ? Math.max(...P.punkte.map((p, i) => Math.hypot(p.x - orte[i][0], p.y - orte[i][1]))) : NaN;
  if (ordner) fs.writeFileSync(`${ordner}/ozzy-farbe-faecher-malen-${MATERIAL === 'wachs' ? '' : 'hell-'}p.png`, await s.screenshot());
  await s.keyboard.press('a');
  await s.waitForTimeout(400);
  const wahl = (await O('farbLeiste')).gewaehlt;
  await klick(Z[0], Z[1]);
  await s.waitForTimeout(500);
  const z = await zahlen();
  const dort = await O('farbUnter', Z[0], Z[1]);
  // (an derselben Stelle der Form auf der anderen Kopie liegt weiter nur das Blau ihrer Ebene)
  const A = kopie(F, unten);
  const drueben = await O('farbUnter', ...aufKopie(F, A, [650, 380]));
  ok(
    '76 P auf der vorderen Kopie: jeder Punkt höchstens einen Gerätepunkt neben dem Klick; ein Klick füllt, auf ihrer Ebene',
    !!P && P.zu && P.punkte.length === 4 && weit <= 1 && z === '0/1,2/2' && dort === wahl && drueben === '#0000ff' && B.aktiv,
    `Punkte höchstens ${z2(weit)} Pixel neben dem Klick; Farblinien/Füllungen je Ebene ${z}; an der Stelle ${dort} (gewählt ${wahl}); auf der anderen Kopie ${drueben}`,
  );
}
// 77: die andere Kopie antippen: Sie tritt vor; dort zeichnen und füllen
let Z1 = [0, 0];
{
  const A0 = kopie(F, unten);
  await klick(A0.x, A0.y);
  await s.waitForTimeout(900);
  F = await O('faecher');
  const A = kopie(F, unten);
  const B = kopie(F, oben);
  const vorn = (await aktiv()) === unten && A.aktiv && A.rang === 1 && B.rang === 0 && Math.abs(A.s / B.s - 1.05) < 1e-3;
  Z1 = aufKopie(F, A, [650, 520]);
  await s.keyboard.press('p');
  await s.waitForTimeout(400);
  const orte = await fleck(Z1, 22);
  const P = await O('farbPunkte', 0);
  const weit = P ? Math.max(...P.punkte.map((p, i) => Math.hypot(p.x - orte[i][0], p.y - orte[i][1]))) : NaN;
  await s.keyboard.press('a');
  await s.waitForTimeout(400);
  await klick(Z1[0], Z1[1]);
  await s.waitForTimeout(500);
  const z = await zahlen();
  if (ordner) fs.writeFileSync(`${ordner}/ozzy-farbe-faecher-malen-${MATERIAL === 'wachs' ? '' : 'hell-'}andere.png`, await s.screenshot());
  ok('77 Eine andere Kopie antippen: Sie tritt vor; dort gezeichnet und gefüllt, liegt es auf ihrer Ebene', vorn && weit <= 1 && z === '1/2,2/2', `vorn und 5 % größer: ${vorn}; Punkte höchstens ${z2(weit)} Pixel neben dem Klick; Farblinien/Füllungen je Ebene ${z}`);
}
// 78: einen Punkt ziehen
{
  const P0 = (await O('farbPunkte', 0)).punkte[0];
  const ziel = [P0.x + 14, P0.y - 9];
  await s.mouse.move(P0.x, P0.y, { steps: 4 });
  await s.waitForTimeout(350);
  await s.mouse.down();
  for (let i = 1; i <= 10; i++) {
    await s.mouse.move(P0.x + (14 * i) / 10, P0.y - (9 * i) / 10);
    await s.waitForTimeout(25);
  }
  await s.waitForTimeout(250);
  await s.mouse.up();
  await s.waitForTimeout(500);
  const P1 = (await O('farbPunkte', 0)).punkte[0];
  const weit = Math.hypot(P1.x - ziel[0], P1.y - ziel[1]);
  ok('78 Einen Punkt auf der vorderen Kopie ziehen: Er bleibt unter dem Zeiger', weit <= 1.5 && (await zahlen()) === '1/2,2/2', `nach dem Zug ${z2(weit)} Pixel neben dem Zeiger`);
}
// 79: der Tropfen am Faden
{
  let G = (await O('farbWeichGriffe'))[0];
  if (!G) {
    const P0 = (await O('farbPunkte', 0)).punkte[0];
    await klick(P0.x, P0.y);
    await s.waitForTimeout(400);
    G = (await O('farbWeichGriffe'))[0];
  }
  let text = 'kein Tropfen am Faden';
  let gut = false;
  if (G) {
    const lang = Math.hypot(G.gx - G.x, G.gy - G.y);
    const [ux, uy] = [(G.gx - G.x) / lang, (G.gy - G.y) / lang];
    const [x0, y0] = [G.gx + 4 * ux, G.gy + 4 * uy];
    await s.mouse.move(x0, y0, { steps: 4 });
    await s.waitForTimeout(350);
    await s.mouse.down();
    for (let i = 1; i <= 10; i++) {
      await s.mouse.move(x0 + 2 * i * ux, y0 + 2 * i * uy);
      await s.waitForTimeout(25);
    }
    await s.waitForTimeout(250);
    await s.mouse.up();
    await s.waitForTimeout(500);
    const G1 = (await O('farbWeichGriffe')).find((g) => g.linie === G.linie && g.punkt === G.punkt);
    const lang1 = G1 ? Math.hypot(G1.gx - G1.x, G1.gy - G1.y) : NaN;
    gut = !!G1 && G.breite === 0 && G1.breite > 0 && Math.abs(lang1 - (lang + 20)) < 2.5;
    text = `Breite vorher ${z2(G.breite)}, nachher ${z2(G1?.breite ?? NaN)} Einheiten; der Faden ${z2(lang)} → ${z2(lang1)} Pixel (20 gezogen)`;
  }
  if (ordner) fs.writeFileSync(`${ordner}/ozzy-farbe-faecher-malen-${MATERIAL === 'wachs' ? '' : 'hell-'}weich.png`, await s.screenshot());
  ok('79 Der Tropfen am Faden: Wegziehen macht die Kante dort weich', gut, text);
  await s.keyboard.press('Escape');
  await s.waitForTimeout(300);
}
// 80: ein Farbtropfen aus der Leiste auf die andere Kopie
{
  F = await O('faecher');
  const B = kopie(F, oben);
  const ziel = aufKopie(F, B, [720, 560]);
  const [rx, ry] = await s.evaluate(() => {
    const r = document.querySelectorAll('#farbleiste .reihe button.farbe')[3].getBoundingClientRect();
    return [r.left + r.width / 2, r.top + 10];
  });
  const farbe3 = (await O('farbLeiste')).farben[3];
  await s.mouse.move(rx, ry, { steps: 3 });
  await s.waitForTimeout(200);
  await s.mouse.down();
  for (let i = 1; i <= 14; i++) {
    await s.mouse.move(rx + ((ziel[0] - rx) * i) / 14, ry + ((ziel[1] - ry) * i) / 14);
    await s.waitForTimeout(25);
  }
  await s.waitForTimeout(150);
  await s.mouse.up();
  await s.waitForTimeout(1100);
  const z = await zahlen();
  F = await O('faecher');
  const jetzt = await aktiv();
  // (die Kopie ist vorgetreten und steht etwas größer: dieselbe Stelle der Form liegt jetzt ein wenig daneben)
  const dort = await O('farbUnter', ...aufKopie(F, kopie(F, oben), [720, 560]));
  ok('80 Ein Farbtropfen aus der Leiste auf eine andere Kopie: füllt auf ihrer Ebene, an ihr wird von da an gemalt', z === '1/2,2/3' && jetzt === oben && dort === farbe3 && kopie(F, oben).rang === 1, `Farblinien/Füllungen je Ebene ${z}; aktiv ${jetzt === oben ? 'die obere' : jetzt}; dort liegt ${dort} (gezogen ${farbe3})`);
}
// 81: die Pipette nimmt von jeder Kopie
{
  F = await O('faecher');
  const A = kopie(F, unten);
  await s.keyboard.press('i');
  await s.waitForTimeout(300);
  await klick(...aufKopie(F, A, [720, 380]));
  await s.waitForTimeout(400);
  const L = await O('farbLeiste');
  const jetzt = await aktiv();
  ok('81 Die Pipette nimmt von jeder Kopie die Farbe ihrer Ebene; die vordere bleibt die vordere', L.gewaehlt === '#0000ff' && jetzt === oben && L.werkzeug === 'tropfen', `aufgenommen ${L.gewaehlt}; aktiv ${jetzt === oben ? 'die obere' : jetzt}; Werkzeug ${L.werkzeug}`);
  await s.keyboard.press('a');
  await s.waitForTimeout(300);
}
// 82: das Rad zoomt zum Zeiger hin, alle Kopien zugleich; Pos1 passt wieder ein
{
  const F0 = await O('faecher');
  const B0 = kopie(F0, oben);
  const Zg = [B0.x + 30, B0.y - 20];
  await s.mouse.move(Zg[0], Zg[1], { steps: 3 });
  await s.waitForTimeout(250);
  await s.mouse.wheel(0, -200);
  await s.waitForTimeout(700);
  const F1 = await O('faecher');
  const zoom = F1.zoom;
  // jede Kopie: ihre Mitte geht vom Zeiger aus auseinander, ihr Kreis wächst mit
  let weit = 0;
  let gross = 0;
  for (const q0 of F0.kopien) {
    const q1 = kopie(F1, q0.id);
    weit = Math.max(weit, Math.hypot(q1.x - (Zg[0] + zoom * (q0.x - Zg[0])), q1.y - (Zg[1] + zoom * (q0.y - Zg[1]))));
    gross = Math.max(gross, Math.abs((q1.s * F1.kreis.r) / (q0.s * F0.kreis.r) - zoom));
  }
  if (ordner) fs.writeFileSync(`${ordner}/ozzy-farbe-faecher-malen-${MATERIAL === 'wachs' ? '' : 'hell-'}zoom.png`, await s.screenshot());
  // (gezoomt wird weiter gemalt: ein Klick mit dem Farbtropfen füllt auf der vorderen Kopie)
  await s.keyboard.press('Home');
  await s.waitForTimeout(600);
  const F2 = await O('faecher');
  const zurueck = Math.max(...F0.kopien.map((q0) => Math.hypot(kopie(F2, q0.id).x - q0.x, kopie(F2, q0.id).y - q0.y)));
  ok('82 Das Rad zoomt zum Zeiger hin, alle Kopien zugleich; Pos1 passt die Reihe wieder ein', zoom > 1.2 && weit < 1.5 && gross < 0.01 && Math.abs(F2.zoom - 1) < 1e-6 && zurueck < 0.5, `Zoom ${z2(zoom)}: Mitten höchstens ${z2(weit)} Pixel neben ihrem Ort, Größe um ${z2(gross)} anders; nach Pos1 Zoom ${z2(F2.zoom)}, ${z2(zurueck)} Pixel neben dem Platz von vorher`);
}
// 83: aus- und einblenden, anlegen, ordnen: Die Kopien rücken und wachsen, keine springt
{
  /** Bild für Bild rechnen, bis alles steht; zurück: je Bild die Kopien */
  const lauf = async (bilder = 150) =>
    s.evaluate((bilder) => {
      const o = window.__ozzy;
      o.film(true);
      const aus = [];
      for (let i = 0; i < bilder; i++) {
        o.bild(1 / 60);
        aus.push(o.faecher().kopien.map((q) => ({ id: q.id, x: q.x, y: q.y, s: q.s })));
      }
      o.film(false);
      return aus;
    }, bilder);
  /** der größte Sprung einer Kopie von einem Bild zum nächsten (Pixel), unter den Kopien, die in beiden Bildern stehen */
  const sprung = (reihe, vorher) => {
    let groesst = 0;
    let alt = vorher;
    for (const bild of reihe) {
      for (const q of bild) {
        const p = alt.find((a) => a.id === q.id);
        if (p) groesst = Math.max(groesst, Math.hypot(q.x - p.x, q.y - p.y));
      }
      alt = bild;
    }
    return groesst;
  };
  // (ein Sprung wäre der ganze Weg in einem Bild, hier mindestens 76 Pixel; die Feder geht am schnellsten 14 Pixel je Bild)
  const SPRUNG = 20;
  const zeilen = [];
  let gut = true;
  const F0 = (await O('faecher')).kopien;
  // ausblenden: Die untere Kopie geht, die obere rückt in die Mitte
  await O('farbEbene', 'zeigen', unten, false);
  let r = await lauf();
  let ende = r[r.length - 1];
  let sp = sprung(r, F0);
  const weg = Math.hypot(ende[0].x - F0.find((q) => q.id === oben).x, ende[0].y - F0.find((q) => q.id === oben).y);
  gut &&= ende.length === 1 && ende[0].id === oben && sp < SPRUNG && weg > 40;
  zeilen.push(`ausgeblendet: eine Kopie bleibt, sie rückt ${z2(weg)} Pixel, größter Schritt je Bild ${z2(sp)}`);
  // einblenden: Die Kopie wächst an ihrem Platz, die andere macht Platz
  await O('farbEbene', 'zeigen', unten, true);
  const vor = ende;
  r = await lauf();
  ende = r[r.length - 1];
  sp = sprung(r, vor);
  const erste = r[0].find((q) => q.id === unten)?.s ?? NaN;
  const letzte = ende.find((q) => q.id === unten)?.s ?? NaN;
  const wieder = Math.max(...F0.map((q0) => Math.hypot(ende.find((q) => q.id === q0.id).x - q0.x, ende.find((q) => q.id === q0.id).y - q0.y)));
  gut &&= ende.length === 2 && erste < 0.35 * letzte && sp < SPRUNG && wieder < 0.5;
  zeilen.push(`eingeblendet: Die Kopie wächst von ${z2(erste)} auf ${z2(letzte)}, größter Schritt je Bild ${z2(sp)}, am Ende ${z2(wieder)} Pixel neben den Plätzen von vorher`);
  // anlegen: Die neue Ebene bekommt ihre Kopie (blank), sie wächst vorn
  const neu = await O('farbEbene', 'neu');
  const vor2 = ende;
  r = await lauf();
  ende = r[r.length - 1];
  sp = sprung(r, vor2);
  const F3 = await O('faecher');
  const erste3 = r[0].find((q) => q.id === neu)?.s ?? NaN;
  gut &&= ende.length === 3 && kopie(F3, neu)?.aktiv === true && kopie(F3, neu).rang === 2 && erste3 < 0.35 * kopie(F3, neu).s && sp < SPRUNG;
  zeilen.push(`angelegt: drei Kopien, die neue wächst von ${z2(erste3)} auf ${z2(kopie(F3, neu)?.s ?? NaN)} und steht vorn, größter Schritt je Bild ${z2(sp)}`);
  if (ordner) fs.writeFileSync(`${ordner}/ozzy-farbe-faecher-malen-${MATERIAL === 'wachs' ? '' : 'hell-'}drei.png`, await s.screenshot());
  // ordnen: Die mittlere Ebene nach ganz unten (der Platz zählt von oben), ihre Kopie tauscht den Platz mit der unteren
  const vor3 = ende;
  await O('farbEbene', 'ordnen', oben, 2);
  r = await lauf();
  ende = r[r.length - 1];
  sp = sprung(r, vor3);
  const getauscht = Math.hypot(ende.find((q) => q.id === oben).x - vor3.find((q) => q.id === unten).x, ende.find((q) => q.id === oben).y - vor3.find((q) => q.id === unten).y);
  gut &&= sp < SPRUNG && getauscht < 12;
  zeilen.push(`geordnet: Die Kopie steht ${z2(getauscht)} Pixel neben dem Platz der anderen, größter Schritt je Bild ${z2(sp)}`);
  // (zurück: ⌘Z nimmt das Ordnen und die neue Ebene zurück)
  await s.keyboard.press('Meta+z');
  await s.waitForTimeout(500);
  await s.keyboard.press('Meta+z');
  await s.waitForTimeout(900);
  const z = await zahlen();
  gut &&= z === '1/2,2/3' && (await O('faecher')).kopien.length === 2;
  ok('83 Aus- und einblenden, anlegen und ordnen: Die Kopien rücken und wachsen, keine springt', gut, zeilen.join(' · '));
}
// 84: Werkzeuge und Esc
{
  await O('farbEbene', 'waehlen', oben);
  await s.waitForTimeout(600);
  await s.keyboard.press('v');
  await s.waitForTimeout(250);
  const nachV = (await O('farbLeiste')).werkzeug;
  await s.keyboard.press('p');
  await s.waitForTimeout(300);
  const nachP = (await O('farbLeiste')).werkzeug;
  await s.keyboard.press('Escape');
  await s.waitForTimeout(300);
  const offen1 = (await O('faecher')).offen;
  const nachEsc = (await O('farbLeiste')).werkzeug;
  // 85: vor dem Zusammenschieben zoomen und schwenken
  const F0 = await O('faecher');
  await s.mouse.move(F0.kopien[0].x, F0.kopien[0].y, { steps: 3 });
  await s.mouse.wheel(0, -150);
  await s.waitForTimeout(500);
  const gezoomt = (await O('faecher')).zoom;
  await s.keyboard.press('Escape');
  await steht(0);
  const offen2 = (await O('faecher')).offen;
  ok('84 Objekte (V) gibt es aufgefächert nicht; Esc beendet erst P, dann schiebt es die Kopien zusammen', nachV !== 'objekt' && nachP === 'p' && nachEsc === 'auswahl' && offen1 && !offen2, `nach V: ${nachV}; nach P: ${nachP}; nach Esc: ${nachEsc}, noch offen: ${offen1}; nach dem zweiten Esc offen: ${offen2}`);
  const b1 = await O('blickSetzen', {});
  const gleich = Math.abs(b1.zoom - blick0.zoom) < 1e-9 && Math.abs(b1.schwenkX - blick0.schwenkX) < 1e-9 && Math.abs(b1.schwenkY - blick0.schwenkY) < 1e-9;
  ok('85 Zusammengeschoben stehen Zoom und Schwenk wieder wie vor dem Auffächern', gezoomt > 1.1 && gleich, `aufgefächert gezoomt auf ${z2(gezoomt)}; danach Zoom ${z2(b1.zoom)} (vorher ${z2(blick0.zoom)}), Schwenk ${z2(b1.schwenkX)}; ${z2(b1.schwenkY)}`);
}
console.log(`     gemessen (${MATERIAL}, 1440 × 900 Gerätepunkte): ein Bild samt Grafikkarte zusammen ${z2(kostenZu)} ms, aufgefächert mit zwei Kopien ${z2(kostenAuf)} ms`);
ok('86 Keine Fehler in der Konsole', fehler.length === 0, fehler.slice(0, 3).join(' | '));
await t.browser.close();
console.log(schlecht ? `${schlecht} FEHL` : 'alles gut');
process.exit(schlecht ? 1 : 0);
