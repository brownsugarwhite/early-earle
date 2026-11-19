// Film zum Paint-Modus, Etappe 6, erster Schritt (Plan docs/plans/2026-11-19-ozzy-paint-modus.md, Abschnitt 17): die Ebenen-Ansicht
// im Probebau, zwei Anordnungen zur Wahl. In echter Zeit aufgenommen, an Florians Form „strange bird“ auf Wachs, von der Seite, in
// einem kleinen Fenster. Vorbereitet (nicht im Film): drei Ebenen (der Verlauf, die Punkte, ein oranger Fleck). Im Film, je
// Fassung:
//   1  der Knopf über dem Stapel: Die Form fächert auf, je Ebene eine Kopie
//   2  ins Leere ziehen: Alle Kopien drehen zugleich, jede an ihrem Platz
//   3  eine Kopie antippen: An ihrer Ebene wird gemalt (ihre Linse im Stapel wird groß, ihre Farblinien stehen auf ihr)
//   4  der Knopf noch einmal: Die Kopien schieben sich wieder zu einer Form zusammen
// Fassung A: nebeneinander. Fassung B: schräg versetzt, die obere Ebene vorn.
// Was gilt, nennt der Film in einem kleinen Feld unten (im Fenster gibt es das nicht); über dem Stapel zeichnet er einen eigenen
// Pfeil (dort steht der Zeiger des Systems, den ein Mitschnitt nicht zeigt).
// Aufruf aus apps/editor: OZZY_URL=http://localhost:5215/ozzy.html node scripts/ozzy/paint-faecher-film.mjs <ziel.mp4>
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ebeneDrei, ebeneEins, ebeneZwei, oeffnen } from './paint-ebenen-szene.mjs';

const ziel = process.argv[2] ?? '../../docs/progress/ozzy/2026-11-19-paint-etappe-6-ansicht.mp4';
const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'ozzy-paint-film-'));
const t = await oeffnen({ film: ordner, fuellen: '0' });
const { s, O, t0 } = t;
// ---------- vorbereiten ----------
await ebeneEins(t);
await ebeneZwei(t);
await ebeneDrei(t);
await s.evaluate(() => {
  // das Feld für die Ansagen (nur im Film)
  const z = document.createElement('div');
  Object.assign(z.style, {
    position: 'fixed',
    left: '46%',
    top: '500px',
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
/** der Knopf über dem Stapel */
const knopf = () =>
  s.evaluate(() => {
    const r = document.querySelector('#ebenen .faecher svg').getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  });
/** ins Leere ziehen und zurück: Alle Kopien drehen zugleich */
const drehen = async (x, y) => {
  await s.mouse.move(x, y, { steps: 16 });
  await s.waitForTimeout(300);
  await s.mouse.down();
  for (let k = 1; k <= 44; k++) {
    await s.mouse.move(x - 3.4 * k, y - 0.35 * k);
    await s.waitForTimeout(24);
  }
  await s.waitForTimeout(500);
  for (let k = 44; k >= 0; k--) {
    await s.mouse.move(x - 3.4 * k, y - 0.35 * k);
    await s.waitForTimeout(24);
  }
  await s.waitForTimeout(450);
  await s.mouse.up();
  await s.waitForTimeout(700);
};
await s.mouse.move(600, 470, { steps: 6 });
await s.waitForTimeout(700);
// ---------- der Film ----------
const anfang = (Date.now() - t0) / 1000;
await sagen('Drei Ebenen auf einer Form', 1700);
await s.waitForTimeout(1900);
for (const [art, name] of [
  ['neben', 'Fassung A: nebeneinander'],
  ['schraeg', 'Fassung B: schräg versetzt'],
]) {
  // (die Anordnung, solange die Form zusammen ist: Davon ist nichts zu sehen)
  await O('faecher', false, art);
  await sagen(name, 2600);
  await s.waitForTimeout(500);
  await tippen(...(await knopf()), 26, 1700);
  await sagen('Ins Leere ziehen: Alle drehen zugleich', 3200);
  await drehen(610, 480);
  // die mittlere Kopie, dann die untere Ebene antippen
  const K = (await O('faecher')).kopien;
  await sagen('Eine Kopie antippen: Dort malst du', 3200);
  await tippen(K[1].x - 6, K[1].y + 4, 22, 1100);
  await tippen(K[0].x + 4, K[0].y + 6, 20, 1100);
  await sagen('Derselbe Knopf: wieder eine Form', 2200);
  await tippen(...(await knopf()), 24, 1900);
}
const E = (await O('farbe')).ebenen;
console.log(`Ende: ${E.map((e) => `${e.name}: ${e.linien} Farblinien, ${e.fuellungen} Füllungen`).join(' · ')}; Fehler: ${t.fehler.length}${t.fehler.length ? ` (${t.fehler[0]})` : ''}`);
await t.kontext.close();
const roh = fs.readdirSync(ordner).find((n) => n.endsWith('.webm'));
// (das ganze Fenster, anderthalbfach vergrößert)
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(Math.max(0, anfang - 0.1)), '-i', path.join(ordner, roh), '-vf', 'scale=1140:-2:flags=lanczos', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '19', '-movflags', '+faststart', '-an', ziel]);
fs.rmSync(ordner, { recursive: true, force: true });
console.log(`Film: ${ziel}`);
await t.browser.close();
