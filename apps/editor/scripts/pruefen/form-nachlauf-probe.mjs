// Form zuerst (10.11.2026), Gegenprüfung G4.2/G4.3: Nachlauf und Aufräumen im Hintergrund dürfen einen geänderten Stand nicht anfassen.
// Drei Loops wie in form-loslassen-probe.mjs, die obere Kreuzung in der Seite schnell 90 Einheiten hinauf.
//   A  loslassen und sofort ⌘Z: Der Stand vor dem Zug ist wieder da und bleibt (kein Nachlauf, kein Einwechseln mehr)
//   B  loslassen, warten bis der Hintergrund fertig ist (das Netz ist feiner), dann ⌘Z: wieder der Stand vor dem Zug
//   C  loslassen und sofort denselben Punkt wieder greifen und weiterziehen: kein Fehler, am Ende ein Stand, der steht
//   D  loslassen, warten bis der Hintergrund rechnet, dann ⌘Z: der Stand vor dem Zug, der Auftrag verfällt
//   E  wie D, aber K (Kante an) statt ⌘Z: der Auftrag verfällt; seit G4.4 beginnt einer für den Stand mit der Kante (erst die
//      gesetzte Haut als Zwischenstand, dann das Aufräumen); zweimal ⌘Z führt genau zum Anfang
//   F  wie D, aber ein neuer Loop: der Auftrag verfällt, der Loop ist da, seit G4.4 setzt sich die Haut zu ihm im Hintergrund
//   H  der Auftrag meldet einen Fehler: das Fenster räumt selbst auf (verdichtet), der Hintergrund bleibt für spätere Stände
//   G  der Worker fällt aus, während er rechnet: das Fenster räumt selbst auf, der nächste Zug läuft ohne Hintergrund
// (Ein Auftrag, der nur die Zerlegung für das nächste Greifen bringt, ändert die Haut nicht; er zählt hier nicht als „angewendet“.)
// Aufruf aus apps/editor: node scripts/pruefen/form-nachlauf-probe.mjs   (KURVEN_URL, GPU=1)
import { chromium } from '@playwright/test';

const basis = process.env.KURVEN_URL ?? 'http://localhost:5193/kurven.html?gewichte=geometrie';
const browser = await chromium.launch(process.env.GPU ? { args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] } : {});
const seite = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
const fehler = [];
seite.on('console', (m) => {
  if (m.type() === 'error') fehler.push(m.text());
});
seite.on('pageerror', (e) => fehler.push(String(e)));
await seite.goto(basis);
await seite.waitForFunction(() => window.__kurven !== undefined);
await seite.waitForTimeout(400);
const K = (f, ...a) => seite.evaluate(([f2, a2]) => window.__kurven[f2](...a2), [f, a]);
const bild = async (a, p) => {
  const b = await K('bild', a, p);
  return [b.x, b.y];
};
const stand = () => seite.evaluate(() => ({ P: window.__kurven.lagen(), z: window.__kurven.zeiten() }));
const abstand = (a, b) => {
  if (a.P.length !== b.P.length) return Infinity;
  let m = 0;
  for (let i = 0; i < a.P.length; i++) m = Math.max(m, Math.abs(a.P[i] - b.P[i]));
  return m;
};
// warten, bis nichts mehr rechnet und nichts mehr ansteht (viermal hintereinander ruhig: zwischen zwei Aufträgen liegen 30 ms)
const ruhig = async () => {
  let still = 0;
  for (let k = 0; k < 400 && still < 4; k++) {
    await seite.waitForTimeout(100);
    const z = await K('zeiten');
    still = (z.beschaeftigt ?? (z.nachlauf || z.aufraeumen)) ? 0 : still + 1;
  }
};
const ziehen = async ([x, y], [x2, y2], n, loslassen = true) => {
  await seite.mouse.move(x, y);
  await seite.mouse.down();
  for (let i = 1; i <= n; i++) await seite.mouse.move(x + ((x2 - x) * i) / n, y + ((y2 - y) * i) / n);
  if (loslassen) await seite.mouse.up();
};
for (const [a, A, B] of [
  ['seite', { x: -200, y: 0 }, { x: 200, y: 0 }],
  ['top', { x: -200, y: 0 }, { x: 200, y: 0 }],
  ['seite', { x: 10, y: 200 }, { x: 10, y: -200 }],
]) {
  await seite.keyboard.press('l');
  await ziehen(await bild(a, { ...A, z: 0 }), await bild(a, { ...B, z: 0 }), 6);
  await seite.waitForTimeout(1500);
}
await seite.keyboard.press('Escape');
await ruhig();
const oben = async () => {
  const L = await K('loops');
  const senkrecht = L.find((l) => l.art === 'ring' && !l.punkte.every((p) => Math.abs(p.ref.y) < 30));
  return senkrecht.punkte.filter((q) => q.sichtbar !== false).reduce((b, q) => (q.ref.y > b.ref.y ? q : b)).ref;
};
// einmal kurz ziehen und zurück, damit die Haut nach der Geometrie steht (das erste Greifen formt sie um)
{
  const p = await oben();
  await ziehen(await bild('seite', p), await bild('seite', { ...p, y: p.y + 6 }), 4);
  await ruhig();
}
const ok = (name, bedingung, text) => console.log(`${bedingung ? 'gut ' : 'FEHL'} ${name}: ${text}`);

// ---------- A: loslassen und sofort ⌘Z ----------
const S0 = await stand();
const nr0 = S0.z.auftrag?.nr ?? -1;
const auftragText = (z, nrVorher) => (z.auftrag && z.auftrag.nr !== nrVorher ? (z.auftrag.angewendet ? (z.auftrag.geaendert ? 'angewendet' : 'nur die Zerlegung') : 'verfallen') : 'keiner');
// n Schritte zurück; steht danach wieder der Stand S?
const zurueck = async (n, S) => {
  for (let k = 0; k < n; k++) {
    await seite.keyboard.press('Meta+z');
    await seite.waitForTimeout(150);
  }
  await ruhig();
  return abstand(S, await stand());
};
let p = await oben();
await ziehen(await bild('seite', p), await bild('seite', { ...p, y: p.y + 90 }), 5);
const nachLos = await K('zeiten');
await seite.keyboard.press('Meta+z');
const SA = await stand();
ok('A sofort ⌘Z', abstand(S0, SA) < 1e-9, `Stand gegen vor dem Zug ${abstand(S0, SA).toExponential(1)} (beim Loslassen: Nachlauf ${nachLos.nachlauf}, Hintergrund ${nachLos.aufraeumen})`);
await seite.waitForTimeout(3000);
await ruhig();
const SA2 = await stand();
// (war der Nachlauf beim ⌘Z schon fertig, lief der Auftrag schon: Dann verfällt er)
ok('A bleibt', abstand(S0, SA2) < 1e-9 && auftragText(SA2.z, nr0) !== 'angewendet', `3 s später ${abstand(S0, SA2).toExponential(1)}, ${SA2.z.punkte} Punkte (vorher ${S0.z.punkte}); Auftrag im Hintergrund: ${auftragText(SA2.z, nr0)}`);

// ---------- B: loslassen, Hintergrund abwarten, dann ⌘Z ----------
p = await oben();
await ziehen(await bild('seite', p), await bild('seite', { ...p, y: p.y + 90 }), 5);
await ruhig();
const SB1 = await stand();
ok('B Hintergrund', auftragText(SB1.z, nr0) === 'angewendet', `Auftrag ${auftragText(SB1.z, nr0)}, ${SA2.z.punkte} → ${SB1.z.punkte} Punkte, ${SB1.z.auftrag?.durchgaenge ?? 0}-mal verdichtet`);
await seite.keyboard.press('Meta+z');
await seite.waitForTimeout(300);
const SB2 = await stand();
ok('B ⌘Z', abstand(S0, SB2) < 1e-9, `Stand gegen vor dem Zug ${abstand(S0, SB2).toExponential(1)}, ${SB2.z.punkte} Punkte`);
await ruhig();

// ---------- C: loslassen und sofort wieder greifen und weiterziehen ----------
p = await oben();
const [ax, ay] = await bild('seite', p);
const [bx, by] = await bild('seite', { ...p, y: p.y + 60 });
await ziehen([ax, ay], [bx, by], 5);
const zC = await K('zeiten');
await ziehen([bx, by], [bx, by - 40], 5);
const zC2 = await K('zeiten');
await ruhig();
const SC = await stand();
const pC = await oben();
ok('C gleich wieder gegriffen', Number.isFinite(SC.P[0]) && zC2.zerlegen < 50, `beim ersten Loslassen Nachlauf ${zC.nachlauf}, Hintergrund ${zC.aufraeumen}; zerlegt beim zweiten Greifen ${zC2.zerlegen} ms; Punkt jetzt bei y ${pC.y.toFixed(1)} (Start ${p.y.toFixed(1)}), ${SC.z.punkte} Punkte, Auftrag ${SC.z.auftrag?.angewendet ? 'angewendet' : 'nicht angewendet'}`);
{
  const d = await zurueck(2, S0);
  ok('C zwei Schritte zurück', d < 1e-9, `Stand gegen den Anfang ${d.toExponential(1)}`);
}

// warten, bis der Auftrag im Hintergrund läuft (der Nachlauf davor ist dann fertig); false: Er war schon fertig, bevor man hinsah
const hintergrundLaeuft = async () => {
  for (let k = 0; k < 600; k++) {
    const z = await K('zeiten');
    if (z.aufraeumen) return true;
    if (!z.nachlauf) return false;
    await seite.waitForTimeout(4);
  }
  return false;
};

// ---------- D: ⌘Z, während der Hintergrund rechnet ----------
{
  const S = await stand();
  const nr = S.z.auftrag?.nr ?? -1;
  p = await oben();
  await ziehen(await bild('seite', p), await bild('seite', { ...p, y: p.y + 90 }), 5);
  const lief = await hintergrundLaeuft();
  await seite.keyboard.press('Meta+z');
  const S1 = await stand();
  ok('D ⌘Z im Hintergrund', lief && abstand(S, S1) < 1e-9, `Hintergrund rechnete ${lief ? 'ja' : 'nein'}; Stand gegen vor dem Zug ${abstand(S, S1).toExponential(1)}`);
  await seite.waitForTimeout(1500);
  await ruhig();
  const S2 = await stand();
  ok('D bleibt', abstand(S, S2) < 1e-9 && auftragText(S2.z, nr) !== 'angewendet', `später ${abstand(S, S2).toExponential(1)}, ${S2.z.punkte} Punkte (vorher ${S.z.punkte}); Auftrag ${auftragText(S2.z, nr)}`);
}

// ---------- E: Kante an, während der Hintergrund rechnet ----------
{
  const S = await stand();
  const nr = S.z.auftrag?.nr ?? -1;
  p = await oben();
  await ziehen(await bild('seite', p), await bild('seite', { ...p, y: p.y + 40 }), 5);
  const lief = await hintergrundLaeuft();
  await seite.keyboard.press('k');
  await seite.waitForTimeout(1500);
  await ruhig();
  const S2 = await stand();
  const endlich = S2.P.every(Number.isFinite);
  // der Auftrag des Zugs gehört zum Stand davor und verfällt; für den Stand mit der Kante beginnt ein neuer (erst der Zwischenstand)
  const zw = S2.z.zwischen;
  ok('E Kante im Hintergrund', lief && endlich && !!zw && zw.nr > nr && !S2.z.ruheOffen, `Hintergrund rechnete ${lief ? 'ja' : 'nein'}; die Kante: gesetzte Haut nach ${zw?.gesamt ?? '?'} ms (${zw?.runden ?? '?'} Runden), danach Auftrag ${auftragText(S2.z, nr)}; ${S2.z.punkte} Punkte`);
  const d = await zurueck(2, S0);
  ok('E zwei Schritte zurück', d < 1e-9, `Stand gegen den Anfang ${d.toExponential(1)}`);
}

// ---------- F: neuer Loop, während der Hintergrund rechnet ----------
{
  const S = await stand();
  const nr = S.z.auftrag?.nr ?? -1;
  const zahl = (await K('loops')).length;
  p = await oben();
  await ziehen(await bild('seite', p), await bild('seite', { ...p, y: p.y + 40 }), 5);
  const lief = await hintergrundLaeuft();
  await seite.keyboard.press('l');
  await ziehen(await bild('seite', { x: -220, y: -60, z: 0 }), await bild('seite', { x: 220, y: -60, z: 0 }), 6);
  await seite.waitForTimeout(1500);
  await seite.keyboard.press('Escape');
  await ruhig();
  const S2 = await stand();
  const zahl2 = (await K('loops')).length;
  const zw = S2.z.zwischen;
  ok('F Loop im Hintergrund', lief && zahl2 === zahl + 1 && S2.P.every(Number.isFinite) && !!zw && zw.nr > nr && !S2.z.ruheOffen, `Hintergrund rechnete ${lief ? 'ja' : 'nein'}; Loops ${zahl} → ${zahl2}; die Haut setzt sich zum neuen Loop nach ${zw?.gesamt ?? '?'} ms, danach Auftrag ${auftragText(S2.z, nr)}; ${S2.z.punkte} Punkte`);
  const d = await zurueck(2, S0);
  ok('F zwei Schritte zurück', d < 1e-9 && (await K('loops')).length === zahl, `Stand gegen den Anfang ${d.toExponential(1)}, Loops ${(await K('loops')).length}`);
}

// ---------- H: der Auftrag meldet einen Fehler ----------
{
  const S = await stand();
  const nr = S.z.auftrag?.nr ?? -1;
  p = await oben();
  await ziehen(await bild('seite', p), await bild('seite', { ...p, y: p.y + 60 }), 5);
  const lief = await hintergrundLaeuft();
  const nrFehler = (await K('zeiten')).auftragNr;
  await K('auftragFehler');
  const gleich = await K('zeiten');
  await seite.waitForTimeout(2500);
  await ruhig();
  const S1 = await stand();
  // das späte Ergebnis des gescheiterten Auftrags darf nicht mehr ankommen (spätere Aufträge für neue Stände schon)
  ok('H Fehler im Auftrag', lief && !gleich.aufraeumen && !S1.z.hintergrundAus && S1.z.punkte > S.z.punkte && S1.P.every(Number.isFinite) && S1.z.auftrag?.nr !== nrFehler, `Hintergrund rechnete ${lief ? 'ja' : 'nein'}; im Fenster verdichtet: ${S.z.punkte} → ${S1.z.punkte} Punkte; der gescheiterte Auftrag ${nrFehler} kam nicht mehr an (letzter: ${S1.z.auftrag?.nr ?? '–'}, vorher ${nr})`);
  const d = await zurueck(1, S0);
  ok('H ein Schritt zurück', d < 1e-9, `Stand gegen den Anfang ${d.toExponential(1)}`);
}

// ---------- G: der Worker fällt aus, während er rechnet ----------
{
  const S = await stand();
  p = await oben();
  await ziehen(await bild('seite', p), await bild('seite', { ...p, y: p.y + 60 }), 5);
  const lief = await hintergrundLaeuft();
  await K('ausfall');
  await seite.waitForTimeout(1500);
  await ruhig();
  const S1 = await stand();
  ok('G Ausfall', lief && S1.z.hintergrundAus === true && !S1.z.aufraeumen && S1.z.punkte >= S.z.punkte && S1.P.every(Number.isFinite), `Hintergrund rechnete ${lief ? 'ja' : 'nein'}; ohne Hintergrund weiter: ${S1.z.hintergrundAus}; ${S.z.punkte} → ${S1.z.punkte} Punkte (im Fenster verdichtet ${S1.z.verdichtung?.neu ?? 0} neu)`);
  p = await oben();
  await ziehen(await bild('seite', p), await bild('seite', { ...p, y: p.y + 50 }), 8);
  const zLos = await K('zeiten');
  await seite.waitForTimeout(1500);
  await ruhig();
  const S2 = await stand();
  const p2 = await oben();
  ok('G Zug ohne Hintergrund', !zLos.nachlauf && !zLos.aufraeumen && S2.P.every(Number.isFinite) && p2.y > p.y + 40, `Punkt ${p.y.toFixed(1)} → ${p2.y.toFixed(1)}, ${S2.z.punkte} Punkte, kein Nachlauf und kein Auftrag (wie mit ?hintergrund=0)`);
}

const sym = await K('symmetrie');
ok('Spiegelgleichheit', (typeof sym === 'number' ? sym : (sym?.max ?? 0)) < 1e-6, JSON.stringify(sym));
ok('Konsole', fehler.length === 0, fehler.length ? fehler.slice(0, 3).join(' | ') : 'keine Fehler');
await browser.close();
