// Film zum Paint-Modus, Etappe 6 (Plan docs/plans/2026-11-19-ozzy-paint-modus.md, Abschnitt 18): die Ebenen-Ansicht, wie sie
// gebaut ist (schräg versetzt). In echter Zeit aufgenommen, an Florians Form „strange bird“ auf Wachs, von der Seite, in einem
// kleinen Fenster. Vorbereitet (nicht im Film): drei Ebenen (der Verlauf, die Punkte, ein oranger Fleck). Im Film:
//   1  der Knopf über dem Stapel: Die Form fächert auf, je Ebene eine Kopie; vorn steht die, an der gemalt wird
//   2  ins Leere ziehen: Alle Kopien drehen zugleich
//   3  eine andere Kopie antippen: Sie tritt vor
//   4  auf ihr malen: mit P einen Punkt zeichnen, mit dem Farbtropfen füllen (die Farbe läuft ein)
//   5  ein Farbtropfen aus der Leiste, auf eine andere Kopie gezogen: Er füllt auf ihrer Ebene
//   6  das Plus: Die neue Ebene bekommt ihre Kopie, sie wächst
//   7  das Rad zoomt zum Zeiger hin; auf der neuen Kopie ein Auge, auf eigener Ebene; Pos1 passt die Reihe wieder ein
//   8  X: Die Kopien schieben sich wieder zu einer Form zusammen
// Was gilt, nennt der Film in einem kleinen Feld unten (im Fenster gibt es das nicht); über Leiste und Stapel zeichnet er einen
// eigenen Pfeil (dort steht der Zeiger des Systems, den ein Mitschnitt nicht zeigt).
// Aufruf aus apps/editor: OZZY_URL=http://localhost:5215/ozzy.html node scripts/ozzy/paint-faecher-film.mjs <ziel.mp4>
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ebeneDrei, ebeneEins, ebeneZwei, FLECK, maus, oeffnen, PUNKT_R, tropfenBei } from './paint-ebenen-szene.mjs';

const ziel = process.argv[2] ?? '../../docs/progress/ozzy/2026-11-19-paint-etappe-6.mp4';
const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'ozzy-paint-film-'));
const t = await oeffnen({ film: ordner, fuellen: '0' });
const { s, O, t0 } = t;
const { fleck } = maus(s, { ruhig: true });
// ---------- vorbereiten ----------
await ebeneEins(t);
const zwei = await ebeneZwei(t);
const drei = (await ebeneDrei(t)).id;
const eins = (await O('farbEbenen')).ebenen.at(-1).id;
/** die erste Stelle, um die herum die Form liegt (für einen Fleck mit Halbmesser r) */
const platz = async (stellen, r) => {
  for (const [x, y] of stellen) {
    let frei = true;
    for (let i = 0; i < 8 && frei; i++) frei = await O('farbOrtFrei', x + 1.3 * r * Math.cos((Math.PI * i) / 4), y + 1.5 * r * Math.sin((Math.PI * i) / 4));
    if (frei) return [x, y];
  }
  throw new Error(`Kein Platz auf der Form bei ${JSON.stringify(stellen)}`);
};
await s.keyboard.press('p');
await s.waitForTimeout(300);
const NEU = await platz([[436, 300], [440, 312], [274, 330]], PUNKT_R);
const AUGE_R = 8;
const AUGE = await platz([[262, 268], [270, 276], [282, 284], [296, 290]], AUGE_R);
await s.keyboard.press('a');
await s.waitForTimeout(300);
// (im Film läuft die Farbe ein, wie Florian es gewählt hat: „Tinte“)
await O('farbFliessen', 'tinte');
await s.evaluate(() => {
  // das Feld für die Ansagen (nur im Film)
  const z = document.createElement('div');
  Object.assign(z.style, {
    position: 'fixed',
    left: '46%',
    top: '508px',
    transform: 'translateX(-50%)',
    padding: '5px 13px 6px',
    border: '0.5px solid rgba(31,26,23,0.5)',
    borderRadius: '999px',
    background: 'rgba(255,255,255,0.94)',
    font: '500 14px -apple-system, Helvetica Neue, Helvetica, Arial, sans-serif',
    color: '#1f1a17',
    zIndex: '9',
    opacity: '0',
    transition: 'opacity 160ms ease',
    pointerEvents: 'none',
    whiteSpace: 'nowrap',
  });
  document.body.append(z);
  window.__sagen = (text, ms = 1500) => {
    z.textContent = text;
    z.style.opacity = '1';
    clearTimeout(window.__sagenZeit);
    window.__sagenZeit = setTimeout(() => (z.style.opacity = '0'), ms);
  };
  // der Pfeil des Films über Leiste und Stapel
  const p = document.createElement('div');
  p.innerHTML = '<svg viewBox="0 0 20 20" width="22" height="22"><path d="M5.2 3.2l9.9 6.2-4.1 1.2 2.3 4.6-1.9 1-2.3-4.7-3 3.1z" fill="#ffffff" stroke="#1f1a17" stroke-width="1.05" stroke-linejoin="round" /></svg>';
  Object.assign(p.style, { position: 'fixed', left: '0', top: '0', zIndex: '10', pointerEvents: 'none', display: 'none' });
  document.body.append(p);
  window.addEventListener(
    'pointermove',
    (e) => {
      p.style.display = e.target instanceof HTMLCanvasElement ? 'none' : 'block';
      p.style.transform = `translate(${e.clientX - 5.7}px, ${e.clientY - 3.5}px)`;
    },
    true,
  );
  // (die Zeile unten im Fenster stünde hinter dem Feld)
  document.getElementById('hinweis').style.visibility = 'hidden';
});
const sagen = (text, ms) => s.evaluate(([x, m]) => window.__sagen(x, m), [text, ms ?? 1500]);
const tippen = async (x, y, schritte = 22, danach = 550) => {
  await s.mouse.move(x, y, { steps: schritte });
  await s.waitForTimeout(380);
  await s.mouse.down();
  await s.waitForTimeout(70);
  await s.mouse.up();
  await s.waitForTimeout(danach);
};
/** die Mitte eines Stücks der Seite */
const mitte = (wahl) =>
  s.evaluate((w) => {
    const r = document.querySelector(w).getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  }, wahl);
const K0 = (await O('faecher')).kreis;
/** die Stelle einer Kopie, an der ein Ort der Form (CSS-Pixel im Bild der zusammengeschobenen Form) jetzt steht */
const aufKopie = (F, q, [x, y]) => [q.x + (q.s * (x - K0.x) * F.kreis.r) / K0.r, q.y + (q.s * (y - K0.y) * F.kreis.r) / K0.r];
const kopie = (F, id) => F.kopien.find((q) => q.id === id);
await s.mouse.move(600, 470, { steps: 6 });
await s.waitForTimeout(700);
// ---------- der Film ----------
const anfang = (Date.now() - t0) / 1000;
await sagen('Drei Ebenen auf einer Form', 1700);
await s.waitForTimeout(1900);
// 1: auffächern
await sagen('Der Knopf über dem Stapel (oder X): je Ebene eine Kopie', 3000);
await tippen(...(await mitte('#ebenen .faecher svg')), 26, 2100);
// 2: drehen
await sagen('Ins Leere ziehen: Alle drehen zugleich', 3000);
{
  const [x, y] = [640, 500];
  await s.mouse.move(x, y, { steps: 16 });
  await s.waitForTimeout(300);
  await s.mouse.down();
  for (let k = 1; k <= 40; k++) {
    await s.mouse.move(x - 3.2 * k, y - 0.3 * k);
    await s.waitForTimeout(24);
  }
  await s.waitForTimeout(450);
  for (let k = 40; k >= 0; k--) {
    await s.mouse.move(x - 3.2 * k, y - 0.3 * k);
    await s.waitForTimeout(24);
  }
  await s.waitForTimeout(400);
  await s.mouse.up();
  await s.waitForTimeout(600);
}
// 3: eine andere Kopie antippen
let F = await O('faecher');
await sagen('Eine Kopie antippen: Sie tritt vor', 2800);
await tippen(kopie(F, zwei).x - 8, kopie(F, zwei).y + 2, 22, 1500);
// 4: auf ihr malen
F = await O('faecher');
const Z = aufKopie(F, kopie(F, zwei), NEU);
await sagen('Auf der vorderen malst du: P zeichnet', 3400);
await s.keyboard.press('p');
await s.waitForTimeout(500);
await fleck(Z[0], Z[1], PUNKT_R * kopie(F, zwei).s);
await s.waitForTimeout(400);
await sagen('Der Farbtropfen füllt', 2400);
await s.keyboard.press('f');
await s.waitForTimeout(500);
await tippen(Z[0], Z[1], 10, 1900);
// 5: ein Farbtropfen aus der Leiste auf eine andere Kopie
F = await O('faecher');
{
  const ort = aufKopie(F, kopie(F, eins), [FLECK.x, FLECK.y]);
  // (der vierte Tropfen der Leiste: Rot)
  const [rx, ry] = await tropfenBei(s, 3);
  await sagen('Ein Tropfen aus der Leiste füllt auf der Kopie, auf die er fällt', 3600);
  await s.mouse.move(rx, ry, { steps: 22 });
  await s.waitForTimeout(450);
  await s.mouse.down();
  for (let i = 1; i <= 30; i++) {
    await s.mouse.move(rx + ((ort[0] - rx) * i) / 30, ry + ((ort[1] - ry) * i) / 30);
    await s.waitForTimeout(24);
  }
  await s.waitForTimeout(350);
  await s.mouse.up();
  await s.waitForTimeout(2300);
}
// 6: das Plus
await sagen('Das Plus: eine neue Ebene, ihre Kopie wächst', 3000);
await tippen(...(await mitte('#ebenen .ebene.neu .linse')), 26, 2000);
// 7: heranzoomen, ein Auge auf der neuen Ebene
F = await O('faecher');
{
  const vorn0 = F.kopien.find((q) => q.aktiv);
  const hin = aufKopie(F, vorn0, AUGE);
  await sagen('Das Rad zoomt zum Zeiger hin', 2600);
  await s.mouse.move(hin[0] + 30, hin[1] + 24, { steps: 16 });
  await s.waitForTimeout(350);
  for (let i = 0; i < 12; i++) {
    await s.mouse.wheel(0, -40);
    await s.waitForTimeout(45);
  }
  await s.waitForTimeout(1200);
  // (Schwarz: der achte Tropfen der Leiste)
  await tippen(...(await tropfenBei(s, 7)), 20, 500);
  F = await O('faecher');
  const vorn = F.kopien.find((q) => q.aktiv);
  const ort = aufKopie(F, vorn, AUGE);
  await sagen('Darauf ein Auge, auf eigener Ebene', 3400);
  await s.keyboard.press('p');
  await s.waitForTimeout(500);
  await fleck(ort[0], ort[1], (AUGE_R * vorn.s * F.kreis.r) / K0.r);
  await s.waitForTimeout(300);
  await s.keyboard.press('f');
  await s.waitForTimeout(400);
  await tippen(ort[0], ort[1], 8, 1700);
  await s.keyboard.press('a');
  await s.waitForTimeout(300);
  await sagen('Pos1 passt die Reihe wieder ein', 1900);
  await s.mouse.move(600, 500, { steps: 12 });
  await s.keyboard.press('Home');
  await s.waitForTimeout(1500);
}
// 8: zusammenschieben
await sagen('X: wieder eine Form', 2200);
await s.mouse.move(610, 480, { steps: 12 });
await s.keyboard.press('x');
await s.waitForTimeout(2600);
const E = (await O('farbe')).ebenen;
console.log(`Ende: ${E.map((e) => `${e.name}: ${e.linien} Farblinien, ${e.fuellungen} Füllungen`).join(' · ')}; Fehler: ${t.fehler.length}${t.fehler.length ? ` (${t.fehler[0]})` : ''}; Ebene 3 war ${drei}`);
await t.kontext.close();
const roh = fs.readdirSync(ordner).find((n) => n.endsWith('.webm'));
// (das ganze Fenster, anderthalbfach vergrößert)
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(Math.max(0, anfang - 0.1)), '-i', path.join(ordner, roh), '-vf', 'scale=1140:-2:flags=lanczos', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '19', '-movflags', '+faststart', '-an', ziel]);
fs.rmSync(ordner, { recursive: true, force: true });
console.log(`Film: ${ziel}`);
await t.browser.close();
