// Film zum Paint-Modus, Etappe 5 (Plan docs/plans/2026-11-19-ozzy-paint-modus.md, Abschnitt 16): Ebenen. In echter Zeit aufgenommen,
// an Florians Form „strange bird“ auf Wachs, von der Seite, in einem kleinen Fenster (Leiste, Form und Stapel zusammen im Bild).
// Vorbereitet (nicht im Film): Ebene 1 mit dem Verlauf (der Körper blau, ein heller Fleck mit weicher Kante). Im Film:
//   1  das Plus im Stapel: eine zweite Ebene, über der ersten; mit P vier Punkte darauf, mit dem Farbtropfen gelb gefüllt
//   2  der Punkt neben der Linse: die Ebene aus- und wieder einblenden
//   3  die Linse nach unten ziehen: Die Punkte liegen unter dem Verlauf und sind zugedeckt; wieder hinauf
//   4  die untere Linse antippen: Dort wird jetzt gemalt; ihren Verlauf breiter ziehen, die Punkte bleiben darüber
//   5  das Plus: eine dritte Ebene dazwischen, grün gefüllt (sie deckt den Verlauf, die Punkte bleiben oben); auf den Mülleimer
//      gezogen ist sie wieder weg
//   6  den Paint-Modus verlassen (B): das Ergebnis ohne Farblinien; ein wenig drehen
// Tasten und Handgriffe am Stapel nennt der Film in einem kleinen Feld unten (im Fenster gibt es das nicht); über Leiste und Stapel
// zeichnet er einen eigenen Pfeil (dort steht der Zeiger des Systems, den ein Mitschnitt nicht zeigt).
// Aufruf aus apps/editor: OZZY_URL=http://localhost:5215/ozzy.html node scripts/ozzy/paint-ebenen-film.mjs <ziel.mp4>
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { FLECK, GRUEN, PUNKTE, PUNKT_R, ebeneEins, imStapel, knopfBei, maus, oeffnen, tropfenBei } from './paint-ebenen-szene.mjs';

const ziel = process.argv[2] ?? '../../docs/progress/ozzy/2026-11-19-paint-etappe-5.mp4';
const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'ozzy-paint-film-'));
const t = await oeffnen({ film: ordner, fuellen: '0' });
const { s, O, t0 } = t;
// ---------- vorbereiten ----------
await ebeneEins(t);
await O('farbFliessen', 'tinte');
const unten = (await O('farbEbenen')).ebenen[0].id;
await s.evaluate(() => {
  // das Feld für Tasten und Handgriffe (nur im Film)
  const z = document.createElement('div');
  Object.assign(z.style, {
    position: 'fixed',
    left: '50%',
    top: '486px',
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
const taste = async (k, text, danach = 800) => {
  await sagen(text, 1100);
  await s.waitForTimeout(250);
  await s.keyboard.press(k);
  await s.waitForTimeout(danach);
};
const { klick } = maus(s, { ruhig: true });
/** ein Punkt mit P: wie `fleck`, zügig (vier gezogene Punkte, auf dem ersten geschlossen) */
const punkt = async (x, y, r) => {
  for (let i = 0; i < 4; i++) {
    const w = (Math.PI / 2) * i - 0.4;
    const [px, py] = [x + r * Math.cos(w), y + 1.15 * r * Math.sin(w)];
    await s.mouse.move(px, py, { steps: i ? 5 : 12 });
    await s.waitForTimeout(110);
    await s.mouse.down();
    for (let k = 1; k <= 5; k++) {
      await s.mouse.move(px - (0.55 * r * Math.sin(w) * k) / 5, py + (0.63 * r * Math.cos(w) * k) / 5);
      await s.waitForTimeout(18);
    }
    await s.mouse.up();
    await s.waitForTimeout(110);
  }
  await s.mouse.move(x + r * Math.cos(-0.4), y + 1.15 * r * Math.sin(-0.4), { steps: 5 });
  await s.waitForTimeout(150);
  await s.mouse.down();
  await s.waitForTimeout(60);
  await s.mouse.up();
  await s.waitForTimeout(260);
};
const tippen = async (x, y, schritte = 22, danach = 550) => {
  await s.mouse.move(x, y, { steps: schritte });
  await s.waitForTimeout(380);
  await s.mouse.down();
  await s.waitForTimeout(70);
  await s.mouse.up();
  await s.waitForTimeout(danach);
};
/** langsam ziehen (an, aus), am Ende halten */
const ziehen = async (x0, y0, x1, y1, schritte = 28, halten = 500) => {
  await s.mouse.move(x0, y0, { steps: 18 });
  await s.waitForTimeout(380);
  await s.mouse.down();
  await s.waitForTimeout(160);
  for (let k = 1; k <= schritte; k++) {
    const u = k / schritte;
    const e = u * u * (3 - 2 * u);
    await s.mouse.move(x0 + (x1 - x0) * e, y0 + (y1 - y0) * e);
    await s.waitForTimeout(24);
  }
  await s.waitForTimeout(halten);
  await s.mouse.up();
  await s.waitForTimeout(450);
};
await s.mouse.move(560, 420, { steps: 6 });
await s.waitForTimeout(700);
// ---------- der Film ----------
const anfang = (Date.now() - t0) / 1000;
await s.waitForTimeout(900);
// 1  eine zweite Ebene; vier Punkte darauf
await sagen('Plus: eine neue Ebene', 1600);
await tippen(...(await imStapel(s, unten)).plus, 30, 900);
const oben = (await O('farbEbenen')).ebenen[0].id;
await taste('p', 'P', 500);
for (const [x, y] of PUNKTE) await punkt(x, y, PUNKT_R);
await s.waitForTimeout(300);
await taste('f', 'F  Farbtropfen', 500);
for (const [x, y] of PUNKTE) {
  await s.mouse.move(x, y, { steps: 8 });
  await s.waitForTimeout(220);
  await s.mouse.down();
  await s.waitForTimeout(60);
  await s.mouse.up();
  await s.waitForTimeout(430);
}
await taste('a', 'A', 500);
await s.mouse.move(560, 400, { steps: 14 });
await s.waitForTimeout(900);
// 2  aus- und einblenden
await sagen('Der Punkt: ausblenden, einblenden', 2600);
await tippen(...(await imStapel(s, oben)).auge, 26, 1100);
await tippen(...(await imStapel(s, oben)).auge, 2, 900);
// 3  ordnen: nach unten, wieder hinauf
{
  await sagen('Ziehen: ordnen', 2000);
  const S = await imStapel(s, oben);
  await ziehen(S.linse[0], S.linse[1], S.linse[0], S.linse[1] + S.hoch, 22, 300);
  await s.waitForTimeout(900);
  const S2 = await imStapel(s, oben);
  await ziehen(S2.linse[0], S2.linse[1], S2.linse[0], S2.linse[1] - S2.hoch, 22, 300);
  await s.waitForTimeout(500);
}
// 4  an der unteren Ebene malen: ihren Verlauf breiter ziehen
{
  await sagen('Antippen: Hier malst du', 1800);
  await tippen(...(await imStapel(s, unten)).linse, 22, 900);
  const P = (await O('farbPunkte', 0)).punkte;
  // (der Punkt rechts oben am Fleck: Dort liegen zwei der gelben Punkte in der Nähe)
  const q = P.reduce((a, b) => (b.x - b.y > a.x - a.y ? b : a));
  await klick(q.x, q.y, 22, 400);
  await s.waitForTimeout(500);
  const g = (await O('farbWeichGriffe'))[0];
  const lang = Math.hypot(g.gx - g.x, g.gy - g.y);
  const [ux, uy] = [(g.gx - g.x) / lang, (g.gy - g.y) / lang];
  await ziehen(g.gx + ux * 4, g.gy + uy * 4, g.gx + ux * 24, g.gy + uy * 24, 30, 500);
  await s.keyboard.press('Escape');
  await s.mouse.move(560, 400, { steps: 14 });
  await s.waitForTimeout(800);
}
// 5  eine dritte Ebene dazwischen, grün gefüllt; auf den Mülleimer
{
  await sagen('Plus: eine Ebene dazwischen', 1700);
  await tippen(...(await imStapel(s, unten)).plus, 24, 900);
  const mitte = (await O('farbEbenen')).ebenen[1].id;
  // Grün antippen (der siebte Tropfen), dann mit dem Farbtropfen auf die Form
  await tippen(...(await tropfenBei(s, 6)), 26, 450);
  await taste('f', 'F  Farbtropfen', 400);
  await s.mouse.move(FLECK.x + 110, FLECK.y + 20, { steps: 18 });
  await s.waitForTimeout(380);
  await s.mouse.down();
  await s.waitForTimeout(60);
  await s.mouse.up();
  await s.waitForTimeout(1900);
  await taste('a', 'A', 300);
  await sagen('Auf den Mülleimer: löschen', 2200);
  const S = await imStapel(s, mitte);
  const muell = await knopfBei(s, 'Mülleimer');
  // (erst zur Seite aus dem Stapel heraus, dann zum Mülleimer: Auf und ab im Stapel hieße ordnen)
  await s.mouse.move(S.linse[0], S.linse[1], { steps: 18 });
  await s.waitForTimeout(380);
  await s.mouse.down();
  await s.waitForTimeout(160);
  for (let k = 1; k <= 12; k++) {
    await s.mouse.move(S.linse[0] - 6 * k, S.linse[1] - 0.5 * k);
    await s.waitForTimeout(20);
  }
  const [ax, ay] = [S.linse[0] - 72, S.linse[1] - 6];
  for (let k = 1; k <= 36; k++) {
    const u = k / 36;
    const e = u * u * (3 - 2 * u);
    await s.mouse.move(ax + (muell[0] - ax) * e, ay + (muell[1] - ay) * e);
    await s.waitForTimeout(22);
  }
  await s.waitForTimeout(350);
  await s.mouse.up();
  await s.waitForTimeout(450);
  await s.mouse.move(560, 400, { steps: 16 });
  await s.waitForTimeout(900);
}
// 6  ohne Farblinien, ein wenig drehen und zurück
await taste('b', 'B  zurück zur Form', 1300);
await s.mouse.move(600, 470, { steps: 12 });
await s.waitForTimeout(300);
await s.mouse.down();
for (let k = 1; k <= 40; k++) {
  await s.mouse.move(600 - 2.6 * k, 470 - 0.3 * k);
  await s.waitForTimeout(24);
}
await s.waitForTimeout(600);
for (let k = 40; k >= 0; k--) {
  await s.mouse.move(600 - 2.6 * k, 470 - 0.3 * k);
  await s.waitForTimeout(24);
}
await s.waitForTimeout(500);
await s.mouse.up();
await s.waitForTimeout(900);
const E = (await O('farbe')).ebenen;
console.log(`Ende: ${E.map((e) => `${e.name}: ${e.linien} Farblinien, ${e.fuellungen} Füllungen`).join(' · ')}; Fehler: ${t.fehler.length}${t.fehler.length ? ` (${t.fehler[0]})` : ''}; Grün: ${GRUEN.map((c) => c.toFixed(2)).join(' ')}`);
await t.kontext.close();
const roh = fs.readdirSync(ordner).find((n) => n.endsWith('.webm'));
// (das ganze Fenster, anderthalbfach vergrößert)
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(Math.max(0, anfang - 0.1)), '-i', path.join(ordner, roh), '-vf', 'scale=1140:-2:flags=lanczos', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '19', '-movflags', '+faststart', '-an', ziel]);
fs.rmSync(ordner, { recursive: true, force: true });
console.log(`Film: ${ziel}`);
await t.browser.close();
