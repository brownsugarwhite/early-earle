// Form zuerst (10.11.2026): der Schutz des Fensters, wenn die Haut davonläuft oder beim Rechnen ein Fehler fällt (Florian: „dann
// ist es weg und die Seite hängt sich auf“). Die Fälle werden über Prüfhaken ausgelöst (`davonProbe`: die nächste Runde gilt als
// davongelaufen; `fehlerProbe`: das nächste Bild wirft einen Fehler), der Rest läuft wie mit der Maus:
//   A  im Zug davongelaufen: Der Zug ist zurückgenommen, die Haut steht Bit für Bit wie vor dem Zug, die Punkte der Loops auch,
//      die Statuszeile sagt es; die Maus loszulassen ändert nichts mehr; danach lässt sich wie sonst ziehen
//   B  im Nachlauf davongelaufen (gleich nach dem Loslassen): zurück zum Stand vor dem Zug, die Liste von ⌘Z ist um ihn kürzer
//   C  Fehler in einem Bild während eines Zugs: Die Schleife der Bilder läuft weiter, der Zug ist zurückgenommen, die Statuszeile
//      nennt den Fehler; danach lässt sich wie sonst ziehen
//   D  Fehler in einem Bild ohne Zug: Die Form bleibt, die Schleife läuft weiter
// Aufruf aus apps/editor: node scripts/pruefen/form-schutz-probe.mjs   (KURVEN_URL)
import { chromium } from '@playwright/test';

const basis = process.env.KURVEN_URL ?? 'http://localhost:5193/kurven.html?gewichte=geometrie';
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const seite = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
const fehler = [];
seite.on('console', (m) => {
  if (m.type() === 'error') fehler.push(m.text());
});
seite.on('pageerror', (e) => fehler.push(String(e)));
await seite.goto(basis);
await seite.waitForFunction(() => window.__kurven !== undefined && window.__kurven.ablage.bereit());
await seite.waitForTimeout(400);
const K = (f, ...a) => seite.evaluate(([f2, a2]) => window.__kurven[f2](...a2), [f, a]);
const bild = async (a, p) => {
  const b = await K('bild', a, p);
  return [b.x, b.y];
};
const ruhig = async () => {
  await seite.waitForTimeout(150);
  await seite.waitForFunction(() => !window.__kurven.zeiten().beschaeftigt, null, { timeout: 120000 });
};
const bilderWarten = (n = 4) => seite.evaluate((k) => new Promise((r) => {
  const f = () => (--k <= 0 ? r(true) : requestAnimationFrame(f));
  requestAnimationFrame(f);
}), n);
let schlecht = 0;
const ok = (name, gut, text = '') => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};
const schneiden = async (a, P, Q) => {
  await seite.keyboard.press('l');
  const [x, y] = await bild(a, { ...P, z: 0 });
  const [x2, y2] = await bild(a, { ...Q, z: 0 });
  await seite.mouse.move(x, y);
  await seite.mouse.down();
  await seite.mouse.move(x2, y2, { steps: 8 });
  await seite.mouse.up();
  await ruhig();
};
/** Stand zum Vergleichen: Lagen der Haut, Punkte der Loops, Zähler */
const stand = async () => {
  const [P, L, z, m] = await Promise.all([K('lagen'), K('loops'), K('zeiten'), K('meldung')]);
  return { P, punkte: JSON.stringify(L.map((l) => l.punkte.map((p) => [p.ref.x, p.ref.y, p.ref.z, p.ein, p.aus]))), z, m };
};
const gleich = (a, b) => a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
const abstand = (a, b) => (a.length !== b.length ? Infinity : a.reduce((m, v, i) => Math.max(m, Math.abs(v - b[i])), 0));
const oben = async () => {
  let best = null;
  for (const l of await K('loops')) for (const q of l.punkte) if (q.sichtbar !== false && (!best || q.ref.y > best.y)) best = q.ref;
  return best;
};
/** drücken und in `n` Schritten ziehen, ohne loszulassen */
const anfangen = async (von, nach, n = 10) => {
  const [x, y] = await bild('seite', von);
  const [x2, y2] = await bild('seite', nach);
  await seite.mouse.move(x, y);
  await seite.mouse.down();
  for (let i = 1; i <= n; i++) {
    await seite.mouse.move(x + ((x2 - x) * i) / n, y + ((y2 - y) * i) / n);
    await seite.waitForTimeout(16);
  }
  return [x2, y2];
};

await schneiden('seite', { x: -200, y: 0 }, { x: 200, y: 0 });
await schneiden('top', { x: -200, y: 0 }, { x: 200, y: 0 });
await schneiden('seite', { x: 10, y: 200 }, { x: 10, y: -200 });
await seite.keyboard.press('Escape');
// einmal ziehen und ruhen lassen: Danach ist für den Stand nichts mehr offen (das Netz ist aufgeräumt)
{
  const p = await oben();
  const [x, y] = await anfangen(p, { ...p, y: p.y + 20 });
  void x;
  void y;
  await seite.mouse.up();
  await ruhig();
}

// ---------- A: im Zug davongelaufen ----------
{
  const S0 = await stand();
  const p = await oben();
  const [x, y] = await anfangen(p, { ...p, y: p.y + 40 });
  const mitten = await K('lagen');
  await K('davonProbe');
  await seite.mouse.move(x, y - 3);
  await bilderWarten(6);
  const S1 = await stand();
  ok('A im Zug davongelaufen: zurückgenommen', S1.z.davon === S0.z.davon + 1 && gleich(S1.P, S0.P) && S1.punkte === S0.punkte, `Zähler ${S0.z.davon} → ${S1.z.davon}; im Zug hatte sich die Haut bis ${abstand(mitten, S0.P).toFixed(1)} bewegt; danach gegen vor dem Zug ${abstand(S1.P, S0.P)}; Punkte der Loops ${S1.punkte === S0.punkte ? 'wie vorher' : 'ANDERS'}`);
  ok('A Meldung', /auseinandergelaufen/.test(S1.m), JSON.stringify(S1.m));
  // weiterziehen und loslassen ändert nichts mehr
  await seite.mouse.move(x, y - 30, { steps: 4 });
  await seite.mouse.up();
  await ruhig();
  const S2 = await stand();
  ok('A nach dem Loslassen', gleich(S2.P, S0.P) && S2.punkte === S0.punkte && S2.z.davon === S1.z.davon, `Haut gegen vor dem Zug ${abstand(S2.P, S0.P)}`);
  // danach lässt sich wie sonst ziehen
  const q = await oben();
  await anfangen(q, { ...q, y: q.y + 25 });
  await seite.mouse.up();
  await ruhig();
  const S3 = await stand();
  const q2 = await oben();
  ok('A danach ziehen', Math.abs(q2.y - q.y - 25) < 0.5 && S3.z.davon === S1.z.davon && S3.P.every(Number.isFinite), `oberer Punkt ${q.y.toFixed(1)} → ${q2.y.toFixed(1)}`);
}

// ---------- B: im Nachlauf davongelaufen ----------
{
  await ruhig();
  const S0 = await stand();
  const p = await oben();
  let traf = false;
  // schnell und weit ziehen und sofort loslassen: Die Haut steht dann noch nicht, der Nachlauf rechnet
  const [x, y] = await bild('seite', p);
  const [x2, y2] = await bild('seite', { ...p, y: p.y + 70 });
  await seite.mouse.move(x, y);
  await seite.mouse.down();
  await seite.mouse.move(x2, y2, { steps: 3 });
  await seite.mouse.up();
  traf = await seite.evaluate(() => {
    const k = window.__kurven;
    if (!k.zeiten().nachlauf) return false;
    k.davonProbe();
    return true;
  });
  await bilderWarten(6);
  await ruhig();
  const S1 = await stand();
  if (!traf) console.log('     B: Der Nachlauf lief nach dem Loslassen nicht (die Haut stand schon); nicht geprüft');
  else {
    ok('B im Nachlauf davongelaufen: zurück zum Stand vor dem Zug', S1.z.davon === S0.z.davon + 1 && gleich(S1.P, S0.P) && S1.punkte === S0.punkte, `Zähler ${S0.z.davon} → ${S1.z.davon}; Haut gegen vor dem Zug ${abstand(S1.P, S0.P)}`);
    // ⌘Z nimmt jetzt den Zug davor zurück (den aus A), nicht diesen
    await seite.keyboard.press('Meta+z');
    await ruhig();
    const S2 = await stand();
    ok('B ⌘Z danach', !gleich(S2.P, S0.P) && S2.P.every(Number.isFinite), `⌘Z nimmt den Zug davor zurück (${S2.P.length === S0.P.length ? `Haut bis ${abstand(S2.P, S0.P).toFixed(1)} anders` : `sein Netz: ${S0.P.length / 3} → ${S2.P.length / 3} Punkte`})`);
  }
}

// ---------- C: Fehler in einem Bild während eines Zugs ----------
{
  await ruhig();
  const S0 = await stand();
  const p = await oben();
  const [x, y] = await anfangen(p, { ...p, y: p.y + 40 });
  await K('fehlerProbe');
  await seite.mouse.move(x, y - 3);
  await bilderWarten(6);
  const S1 = await stand();
  ok('C Fehler im Zug: zurückgenommen, Schleife läuft', S1.z.fehler === S0.z.fehler + 1 && gleich(S1.P, S0.P) && S1.punkte === S0.punkte, `Fehler ${S0.z.fehler} → ${S1.z.fehler}; Haut gegen vor dem Zug ${abstand(S1.P, S0.P)}`);
  ok('C Meldung', /Fehler aufgetreten \(Probe\)/.test(S1.m), JSON.stringify(S1.m));
  await seite.mouse.up();
  await ruhig();
  const q = await oben();
  await anfangen(q, { ...q, y: q.y + 25 });
  await seite.mouse.up();
  await ruhig();
  const q2 = await oben();
  ok('C danach ziehen', Math.abs(q2.y - q.y - 25) < 0.5, `oberer Punkt ${q.y.toFixed(1)} → ${q2.y.toFixed(1)}`);
}

// ---------- D: Fehler in einem Bild ohne Zug ----------
{
  await ruhig();
  const S0 = await stand();
  await K('fehlerProbe');
  await bilderWarten(6);
  const S1 = await stand();
  ok('D Fehler ohne Zug: die Form bleibt', S1.z.fehler === S0.z.fehler + 1 && gleich(S1.P, S0.P), `Meldung ${JSON.stringify(S1.m)}`);
  const q = await oben();
  await anfangen(q, { ...q, y: q.y - 20 });
  await seite.mouse.up();
  await ruhig();
  const q2 = await oben();
  ok('D danach ziehen', Math.abs(q2.y - q.y + 20) < 0.5, `oberer Punkt ${q.y.toFixed(1)} → ${q2.y.toFixed(1)}`);
}

// in der Konsole stehen genau die zwei Fehler der Probe (C und D)
const fremd = fehler.filter((t) => !/Fehler beim Rechnen/.test(t));
ok('Konsole', fremd.length === 0 && fehler.length === 2, fehler.length ? `${fehler.length} Meldungen: ${fehler.slice(0, 3).join(' | ').slice(0, 200)}` : 'keine');
console.log(schlecht ? `${schlecht} FEHLER` : 'alles gut');
await browser.close();
