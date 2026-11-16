// Ozzy, Phase 3, der kleine Beweis (Plan 2026-11-16-ozzy.md, Abschnitt 8): Hält eine Form, deren einzige Linie die Silhouette ist?
// Im Prüffenster kurven.html: `__kurven.ablage.neuAusUmriss(anker)` bläst die Silhouette rund auf, die Silhouette wird die Linie der
// Mitte (ihre Anker die Punkte, ihre Griffe die Griffe). Zwei Silhouetten: ein Fisch (Schwanz mit vier Ecken) und eine Ellipse.
// Weg A (Florian, 16.11.: am Rechenkern nichts ändern, kein Unterschied zwischen seinen Kurven und dem Modell wie in Sitzung 4): Die
// Form ist, was die Rechnung aus der Linie macht; `neuAusUmriss` rechnet die Haut gleich über die ganze Haut neu (`hautNeuRechnen`).
// Kriterien (vorher festgelegt; 3b am 16.11. nachmittags geändert, siehe unten):
//   1  Die Seite deckt sich mit der Zeichnung: Punkte und Griffe der Linie sind die gezeichneten; die Linie liegt höchstens 0,5 neben
//      ihrem Pfad; kein Punkt der Haut liegt in der Seite weiter als 0,5 außerhalb der Silhouette. Kein umgeschlagenes Dreieck. Die
//      Form steht: in weiteren 1,5 s bewegt sie sich um weniger als 0,2.
//   2  Anfassen ohne Zug (Maus auf einem Punkt der Linie drücken und loslassen, zweimal an verschiedenen Punkten): Die Haut bewegt
//      sich um weniger als 0,2.
//   3  Der erste Zug ruckt nicht: einen Punkt der Linie 12 Einheiten nach oben ziehen. (a) Im ersten Bild, in dem sich die Haut bewegt,
//      bewegt sich keiner ihrer Punkte weiter als der Mausweg + 1, abseits (weiter als 120 vom Griff) keiner weiter als 0,2. (b) Nach
//      dem Loslassen kriecht nichts (in weiteren 1,5 s weniger als 0,2). Bis zum Weg A hieß 3b „abseits bleibt die Haut“: Wo eine
//      einzige Linie die ganze Form bestimmt, formt ihre Änderung die ganze Haut um; das ist jetzt eine Messung.
// Aufruf aus apps/editor: GPU=1 node scripts/pruefen/ozzy-silhouette-fenster.mjs [bild-ohne-endung]
//   KURVEN_URL (Standard http://localhost:5205/kurven.html?gewichte=geometrie)   FORM=fisch|ellipse|beide (Standard beide)
import { chromium } from '@playwright/test';

const BILD = process.argv[2] ?? '';
const WAHL = process.env.FORM ?? 'beide';
const basis = process.env.KURVEN_URL ?? 'http://localhost:5205/kurven.html?gewichte=geometrie';

const FISCH = [
  { x: 150, y: 0, ein: [0, -45], aus: [0, 45] },
  { x: 40, y: 85, ein: [55, 0], aus: [-60, 0] },
  { x: -90, y: 25, ein: [30, 25], aus: [0, 0] },
  { x: -150, y: 70, ein: [0, 0], aus: [0, 0] },
  { x: -150, y: -60, ein: [0, 0], aus: [0, 0] },
  { x: -90, y: -20, ein: [0, 0], aus: [30, -25] },
  { x: 40, y: -80, ein: [-60, 0], aus: [55, 0] },
];
const kx = 0.5523 * 140;
const ky = 0.5523 * 95;
const ELLIPSE = [
  { x: 140, y: 0, ein: [0, -ky], aus: [0, ky] },
  { x: 0, y: 95, ein: [kx, 0], aus: [-kx, 0] },
  { x: -140, y: 0, ein: [0, ky], aus: [0, -ky] },
  { x: 0, y: -95, ein: [-kx, 0], aus: [kx, 0] },
];
// je Form: die Punkte zum Anfassen (Nummer des Ankers) und der Punkt, der gezogen wird
const FORMEN = { fisch: { anker: FISCH, fassen: [1, 6], ziehen: 1 }, ellipse: { anker: ELLIPSE, fassen: [1, 2], ziehen: 1 } };

const browser = await chromium.launch({ args: process.env.GPU === '1' ? ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] : [] });
const seite = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });
const fehler = [];
seite.on('console', (m) => {
  if (m.type() === 'error') fehler.push(m.text());
});
seite.on('pageerror', (e) => fehler.push(String(e)));
await seite.goto(basis);
await seite.waitForFunction(() => window.__kurven !== undefined && window.__kurven.ablage.bereit());
await seite.waitForTimeout(400);
const K = (f, ...a) => seite.evaluate(([f2, a2]) => window.__kurven[f2](...a2), [f, a]);
const ruhig = async () => {
  await seite.waitForTimeout(250);
  await seite.waitForFunction(() => !window.__kurven.zeiten().beschaeftigt, null, { timeout: 180000 });
  await seite.waitForTimeout(150);
  await seite.waitForFunction(() => !window.__kurven.zeiten().beschaeftigt, null, { timeout: 180000 });
};
const bild = (a, p) => K('bild', a, p);
let schlecht = 0;
const ok = (name, gut, text = '') => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};
const z2 = (x) => x.toFixed(2).replace('.', ',');
const z3 = (x) => x.toFixed(3).replace('.', ',');

/** der Pfad der Silhouette, fein abgetastet (geschlossenes Vieleck) */
function vieleck(A) {
  const P = [];
  for (let i = 0; i < A.length; i++) {
    const p = A[i];
    const q = A[(i + 1) % A.length];
    const c = [
      [p.x, p.y],
      [p.x + p.aus[0], p.y + p.aus[1]],
      [q.x + q.ein[0], q.y + q.ein[1]],
      [q.x, q.y],
    ];
    for (let j = 0; j < 400; j++) {
      const t = j / 400;
      const u = 1 - t;
      const b = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
      P.push([b[0] * c[0][0] + b[1] * c[1][0] + b[2] * c[2][0] + b[3] * c[3][0], b[0] * c[0][1] + b[1] * c[1][1] + b[2] * c[2][1] + b[3] * c[3][1]]);
    }
  }
  return P;
}
/** wie weit (x, y) außerhalb des Vielecks liegt (0: innen) */
function aussen(P, x, y) {
  let innen = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [xi, yi] = P[i];
    const [xj, yj] = P[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) innen = !innen;
  }
  if (innen) return 0;
  let d = Infinity;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [ax, ay] = P[j];
    const dx = P[i][0] - ax;
    const dy = P[i][1] - ay;
    const L2 = dx * dx + dy * dy;
    const t = L2 > 0 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2)) : 0;
    d = Math.min(d, Math.hypot(ax + t * dx - x, ay + t * dy - y));
  }
  return d;
}
/** größte Bewegung je Punkt der Haut (gleiche Nummern), insgesamt und abseits eines Orts */
function bewegung(a, b, ort = null, weit = 0) {
  if (a.length !== b.length) return { alle: NaN, abseits: NaN, anders: `${a.length / 3} → ${b.length / 3} Punkte` };
  let alle = 0;
  let abseits = 0;
  for (let i = 0; i < a.length; i += 3) {
    const d = Math.hypot(a[i] - b[i], a[i + 1] - b[i + 1], a[i + 2] - b[i + 2]);
    alle = Math.max(alle, d);
    if (ort && Math.hypot(a[i] - ort.x, a[i + 1] - ort.y, a[i + 2] - ort.z) > weit) abseits = Math.max(abseits, d);
  }
  return { alle, abseits, anders: '' };
}
/** nächster Punkt eines Dreiecks zu p (Ericson) */
function amDreieck(p, a, b, c) {
  const sub = (u, v) => [u[0] - v[0], u[1] - v[1], u[2] - v[2]];
  const dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  const add = (u, v, s) => [u[0] + s * v[0], u[1] + s * v[1], u[2] + s * v[2]];
  const ab = sub(b, a);
  const ac = sub(c, a);
  const ap = sub(p, a);
  const d1 = dot(ab, ap);
  const d2 = dot(ac, ap);
  if (d1 <= 0 && d2 <= 0) return a;
  const bp = sub(p, b);
  const d3 = dot(ab, bp);
  const d4 = dot(ac, bp);
  if (d3 >= 0 && d4 <= d3) return b;
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) return add(a, ab, d1 / (d1 - d3));
  const cp = sub(p, c);
  const d5 = dot(ab, cp);
  const d6 = dot(ac, cp);
  if (d6 >= 0 && d5 <= d6) return c;
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) return add(a, ac, d2 / (d2 - d6));
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) return add(b, sub(c, b), (d4 - d3) / (d4 - d3 + (d5 - d6)));
  const den = 1 / (va + vb + vc);
  return add(add(a, ab, vb * den), ac, vc * den);
}
/** wie weit die Punkte der Haut von jetzt höchstens neben der Haut davor liegen (abseits eines Orts, wenn angegeben); auch nach neuem Netz */
function zurFlaeche(jetzt, lagen, dreiecke, ort = null, weit = 0) {
  const L = (i) => [lagen[3 * i], lagen[3 * i + 1], lagen[3 * i + 2]];
  const T = [];
  for (let t = 0; t < dreiecke.length; t += 3) T.push([L(dreiecke[t]), L(dreiecke[t + 1]), L(dreiecke[t + 2])]);
  let gross = 0;
  for (let i = 0; i < jetzt.length; i += 3) {
    const p = [jetzt[i], jetzt[i + 1], jetzt[i + 2]];
    if (ort && Math.hypot(p[0] - ort.x, p[1] - ort.y, p[2] - ort.z) <= weit) continue;
    let d = Infinity;
    for (const [a, b, c] of T) {
      const q = amDreieck(p, a, b, c);
      d = Math.min(d, Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]));
      if (d < 1e-4) break;
    }
    gross = Math.max(gross, d);
  }
  return gross;
}
const bilder = () => new Promise((r) => setTimeout(r, 60));
/** mit der Maus von einem Bildpunkt zum anderen ziehen */
const ziehen = async (von, nach, schritte = 14) => {
  await seite.mouse.move(von.x, von.y);
  await seite.waitForTimeout(60);
  await seite.mouse.down();
  for (let i = 1; i <= schritte; i++) {
    await seite.mouse.move(von.x + ((nach.x - von.x) * i) / schritte, von.y + ((nach.y - von.y) * i) / schritte);
    await seite.waitForTimeout(12);
  }
  await seite.waitForTimeout(60);
  await seite.mouse.up();
  await ruhig();
};

for (const name of WAHL === 'beide' ? ['fisch', 'ellipse'] : [WAHL]) {
  const f = FORMEN[name];
  console.log(`---------- ${name} (${f.anker.length} Anker) ----------`);
  const t0 = Date.now();
  const text = await seite.evaluate((a) => window.__kurven.ablage.neuAusUmriss(a), f.anker);
  const ms = Date.now() - t0;
  await ruhig();
  console.log(`     ${text} (${ms} ms bis die Form steht, dann Ruhe nach ${Date.now() - t0} ms)`);
  const loops = await K('loops');
  const lagen = await K('lagen');

  // ----- 1. die Seite deckt sich mit der Zeichnung -----
  const l = loops[0];
  ok('eine Linie, die Mitte', loops.length === 1 && l?.art === 'mitte', `${loops.length} Linien${l ? `, ${l.art}, ${l.punkte.length} Punkte` : ''}`);
  if (!l) continue;
  let punktFehler = 0;
  for (const a of f.anker) {
    const p = l.punkte.reduce((x, y) => (Math.hypot(y.ref.x - a.x, y.ref.y - a.y) < Math.hypot(x.ref.x - a.x, x.ref.y - a.y) ? y : x));
    const passt = (g, h) => Math.hypot(g.x - h[0], g.y - h[1], g.z);
    // die Linie kann andersherum laufen als die Zeichnung: dann ist ein ↔ aus
    const gr = Math.min(Math.max(passt(p.ein, a.ein), passt(p.aus, a.aus)), Math.max(passt(p.ein, a.aus), passt(p.aus, a.ein)));
    punktFehler = Math.max(punktFehler, Math.hypot(p.ref.x - a.x, p.ref.y - a.y, p.ref.z), gr);
  }
  ok('Punkte und Griffe der Linie sind die gezeichneten', l.punkte.length === f.anker.length && punktFehler < 1e-6, `${l.punkte.length} Punkte, größte Abweichung ${punktFehler.toExponential(1)}; Ecken ${l.punkte.filter((p) => p.ecke).length}`);
  const rest = (await K('pfadRest'))[0];
  ok('die Linie liegt auf ihrem Pfad (höchstens 0,5)', rest <= 0.5, `${z3(rest)}`);
  const P = vieleck(f.anker);
  let raus = 0;
  for (let i = 0; i < lagen.length; i += 3) raus = Math.max(raus, aussen(P, lagen[i], lagen[i + 1]));
  ok('in der Seite keine Haut außerhalb der Silhouette (höchstens 0,5)', raus <= 0.5, `${z3(raus)} weit draußen; ${lagen.length / 3} Punkte`);
  const umg = await K('umgeschlagen');
  ok('kein umgeschlagenes Dreieck', umg === 0, `${umg}`);
  {
    const tri = await K('dreiecke');
    await seite.waitForTimeout(1500);
    await ruhig();
    const steht = zurFlaeche(await K('lagen'), lagen, tri);
    ok('die Form steht (in 1,5 s weniger als 0,2)', steht < 0.2, z3(steht));
  }
  if (BILD) await seite.screenshot({ path: `${BILD}-${name}.jpg`, type: 'jpeg', quality: 88 });

  // ----- 2. Anfassen ohne Zug -----
  for (const nr of f.fassen) {
    const a = f.anker[nr];
    const vor = await K('lagen');
    const p = await bild('seite', { x: a.x, y: a.y, z: 0 });
    await seite.mouse.move(p.x, p.y);
    await seite.waitForTimeout(60);
    await seite.mouse.down();
    await seite.waitForTimeout(150);
    await seite.mouse.up();
    await ruhig();
    const b = bewegung(vor, await K('lagen'));
    ok(`Anfassen ohne Zug an Punkt ${nr}: die Haut bleibt (unter 0,2)`, b.alle < 0.2, b.anders || `${z3(b.alle)}; ${await K('meldung')}`);
  }

  // ----- 3. der erste Zug -----
  {
    const a = f.anker[f.ziehen];
    const ort = { x: a.x, y: a.y, z: 0 };
    const vor = await K('lagen');
    const vorTri = await K('dreiecke');
    const p0 = await bild('seite', ort);
    const p1 = await bild('seite', { ...ort, y: ort.y + 1 });
    const proEinheit = { x: p1.x - p0.x, y: p1.y - p0.y };
    await seite.mouse.move(p0.x, p0.y);
    await seite.waitForTimeout(60);
    await seite.mouse.down();
    // der erste Griff an einem neuen Netz wartet, bis der Hintergrund für diesen Stand bereit ist (höchstens 4 s)
    const tw = Date.now();
    await seite.waitForFunction(() => !window.__kurven.zeiten().griffWartet, null, { timeout: 8000 });
    const warten = Date.now() - tw;
    let erst = null;
    let schritt = 0;
    for (let i = 1; i <= 12; i++) {
      await seite.mouse.move(p0.x + i * proEinheit.x, p0.y + i * proEinheit.y);
      await bilder();
      if (!erst) {
        // Abstand zur Fläche davor (das Netz kann im ersten Bild wechseln: ein verfeinertes kommt aus dem Hintergrund)
        const jetzt = await K('lagen');
        const alle = zurFlaeche(jetzt, vor, vorTri);
        if (alle > 0.05) {
          erst = { alle, abseits: zurFlaeche(jetzt, vor, vorTri, ort, 120), punkte: `${vor.length / 3} → ${jetzt.length / 3} Punkte` };
          schritt = i;
        }
      }
    }
    // (bis zum Weg A: „abseits unter 0,2“; wo eine einzige Linie die ganze Form bestimmt, formt schon ein kleiner Zug die ganze Haut
    // um. Ein Sprung ist, was sich weiter bewegt als die Maus: vor Weg A im ersten Bild 17,5 bei 3 Einheiten Mausweg)
    ok(
      `erstes Bild, in dem sich die Haut bewegt (Maus ${schritt} Einheiten weit; der Griff wartete ${warten} ms): kein Sprung (alles höchstens Mausweg + 1, abseits höchstens Mausweg)`,
      !!erst && erst.alle <= schritt + 1 && erst.abseits <= schritt,
      erst ? `größte Bewegung ${z3(erst.alle)}, abseits ${z3(erst.abseits)}; ${erst.punkte}` : 'keine Bewegung',
    );
    await seite.waitForTimeout(120);
    await seite.mouse.up();
    await ruhig();
    const nach = await K('lagen');
    const nachTri = await K('dreiecke');
    const weg = zurFlaeche(nach, vor, vorTri, ort, 120);
    const nl = (await K('loops'))[0];
    const gezogen = nl.punkte.reduce((x, y) => (Math.hypot(y.ref.x - a.x, y.ref.y - a.y - 12) < Math.hypot(x.ref.x - a.x, x.ref.y - a.y - 12) ? y : x));
    await seite.waitForTimeout(1500);
    await ruhig();
    const kriecht = zurFlaeche(await K('lagen'), nach, nachTri);
    ok('nach dem Loslassen: der Punkt ist oben, nichts kriecht (in 1,5 s weniger als 0,2)', Math.abs(gezogen.ref.y - a.y - 12) < 1.5 && kriecht < 0.2, `Punkt ${z2(gezogen.ref.y - a.y)} nach oben; kriecht ${z3(kriecht)}; ${nach.length / 3} Punkte, umgeschlagen ${await K('umgeschlagen')}`);
    console.log(`     Messung: durch den Zug liegt die Haut abseits (über 120 vom Griff) bis ${z2(weg)} neben der Haut davor`);
    if (BILD) await seite.screenshot({ path: `${BILD}-${name}-gezogen.jpg`, type: 'jpeg', quality: 88 });
  }

  // ----- 4. Messung, kein Kriterium: eine zweite Linie (Ring quer durch den Körper); jetzt kreuzen sich Linien, die Haut setzt sich -----
  {
    const vor = await K('lagen');
    const vorTri = await K('dreiecke');
    await seite.keyboard.press('l');
    await ziehen(await bild('seite', { x: 30, y: 150, z: 0 }), await bild('seite', { x: 30, y: -150, z: 0 }));
    await ruhig();
    const jetzt = await K('lagen');
    const weg = zurFlaeche(jetzt, vor, vorTri);
    const ls = await K('loops');
    console.log(`     Messung, Ring bei x = 30: ${ls.map((l) => `${l.art} ${l.punkte.length}P`).join(', ')}; die Haut liegt danach bis ${z2(weg)} neben der Haut davor; umgeschlagen ${await K('umgeschlagen')}; ${await K('meldung')}`);
    if (BILD) await seite.screenshot({ path: `${BILD}-${name}-ring.jpg`, type: 'jpeg', quality: 88 });
    await seite.keyboard.press('Escape');
  }
}
ok('keine Fehler in der Konsole', fehler.length === 0, fehler.slice(0, 3).join(' | '));
console.log(schlecht ? `${schlecht} nicht erfüllt` : 'alles gut');
await browser.close();
