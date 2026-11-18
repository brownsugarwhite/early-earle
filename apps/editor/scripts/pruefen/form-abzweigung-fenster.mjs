// Plan vom 12.11.2026, Zwischenschritt „Abzweigungen“ (14.11.), Etappe 3: P im Fenster, mit der Maus, an Florians Form.
// Florian: „Ich will zum beispiel bei einem edgeloop mit 4 punkten (z.B. kreis), die gegenüberliegenden punkte verbinden können,
// indem ich mit p von einem punkt zum anderen ziehe. Wenn ich das bei beiden paaren mache ergibt sich dadurch ein kreuz mit einem
// punkt in der kreuzung, die ich sehr exakt formen kann...z.B zu einem horn.“
//   1  Seine Form laden (NAME, Standard „test_kaputt“: vier Linien). Mit dem Stift einen Kreis mit vier Punkten in ein Feld zeichnen.
//   2  P: Klick auf Punkt 0, Klick auf Punkt 2 (nach dem ersten Klick bleibt das Werkzeug an); dann in einem Zug von Punkt 1 zu
//      Punkt 3 gezogen: zwei Abzweigungen, jede hängt an zwei Punkten des Kreises und teilt sie; in der Kreuzung ein gemeinsamer
//      Punkt. Die Form bleibt.
//   3  Den Punkt in der Kreuzung herausziehen (Front, zur Seite): beide Linien gehen mit, der Kreis bleibt.
//   4  Löschen: der Kreis allein nicht (an ihm hängen Abzweigungen), ein Punkt mit Abzweigung nicht; eine Abzweigung ja.
//   5  P: Klick auf eine Stelle einer Linie ohne Punkt (der Punkt entsteht sofort, das Werkzeug bleibt an), Esc nimmt ihn zurück.
//      Noch einmal: Klick auf die Linie, Klick auf die Haut (ein Punkt dazwischen), Klick auf einen Punkt des Kreises.
//   6  P von einem Punkt des Kreises zu seinem Spiegelbild (Front): Die Linie endet auf der Mitte.
//   7  ⌘Z bis zum Anfang: die Form wie geladen.
// Aufruf aus apps/editor: GPU=1 [NAME="test_kaputt"] node scripts/pruefen/form-abzweigung-fenster.mjs [bild-ohne-endung]
//   KURVEN_URL (Standard http://localhost:5197/kurven.html?gewichte=geometrie)   KREIS="x,y,r" (im Blatt Seite; Standard -55,50,25)
import { chromium } from '@playwright/test';

const BILD = process.argv[2] ?? '';
const NAME = process.env.NAME ?? 'test_kaputt';
const [KX, KY, KR] = (process.env.KREIS ?? '-55,50,25').split(',').map(Number);
const basis = process.env.KURVEN_URL ?? 'http://localhost:5197/kurven.html?gewichte=geometrie';
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
const z1 = (x) => x.toFixed(1).replace('.', ',');
const z2 = (x) => x.toFixed(2).replace('.', ',');
const weit = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const kasten = (P) => {
  const a = [Infinity, Infinity, Infinity];
  const b = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < P.length; i += 3)
    for (let k = 0; k < 3; k++) {
      a[k] = Math.min(a[k], P[i + k]);
      b[k] = Math.max(b[k], P[i + k]);
    }
  return [...a, ...b];
};
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
/** eine Abzweigung mit P: im Blatt `a` von einem Ort zum anderen (Orte in der Form; `spiegel`: das Spiegelbild des Orts) */
const abzweigen = async (a, von, nach, spiegelNach = false) => {
  await seite.keyboard.press('p');
  const p0 = await bild(a, von);
  const p1 = await bild(a, spiegelNach ? { ...nach, z: -nach.z } : nach);
  await ziehen(p0, p1);
  return K('meldung');
};

// ---------- 1. seine Form, dazu der Kreis mit vier Punkten (Stift, vier glatte Punkte) ----------
const geladen = await seite.evaluate((n) => window.__kurven.ablage.laden(n), NAME);
await ruhig();
const anfang = { lagen: await K('lagen'), loops: await K('loops') };
console.log(`     „${NAME}“ geladen (${JSON.stringify(geladen).slice(0, 60)}): ${anfang.lagen.length / 3} Punkte, ${anfang.loops.length} Linien (${anfang.loops.map((l) => `${l.art} ${l.punkte.length}P`).join(', ')})`);
{
  await seite.keyboard.press('p');
  const h = 0.5523 * KR;
  // vier Anker gegen den Uhrzeigersinn, jeder mit dem Griff längs des Kreises
  const anker = [
    [KX + KR, KY, 0, h],
    [KX, KY + KR, -h, 0],
    [KX - KR, KY, 0, -h],
    [KX, KY - KR, h, 0],
  ];
  for (const [x, y, gx, gy] of anker) {
    const p = await bild('seite', { x, y, z: 0 });
    const g = await bild('seite', { x: x + gx, y: y + gy, z: 0 });
    await seite.mouse.move(p.x, p.y);
    await seite.mouse.down();
    for (let i = 1; i <= 6; i++) {
      await seite.mouse.move(p.x + ((g.x - p.x) * i) / 6, p.y + ((g.y - p.y) * i) / 6);
      await seite.waitForTimeout(10);
    }
    await seite.mouse.up();
    await seite.waitForTimeout(60);
  }
  const erster = await bild('seite', { x: anker[0][0], y: anker[0][1], z: 0 });
  await seite.mouse.click(erster.x, erster.y);
  await ruhig();
}
const mitKreis = { lagen: await K('lagen'), loops: await K('loops') };
const kreis = mitKreis.loops.at(-1);
ok('der Kreis: eine Linie dazu, vier Punkte', mitKreis.loops.length === anfang.loops.length + 1 && kreis.punkte.filter((p) => p.sichtbar).length === 4, `${kreis.art}, ${kreis.punkte.length} Punkte; ${await K('meldung')}`);
if (BILD) await seite.screenshot({ path: `${BILD}-1-kreis.jpg`, type: 'jpeg', quality: 88 });
const KP = kreis.punkte.map((p) => p.ref);
const kastenVorher = kasten(mitKreis.lagen);

// ---------- 2. die gegenüberliegenden Punkte verbinden ----------
// mit zwei Klicks: Nach dem ersten bleibt das Werkzeug an, nichts ist gewählt, noch keine neue Linie
await seite.keyboard.press('p');
{
  const q = await bild('seite', KP[0]);
  await seite.mouse.click(q.x, q.y);
  await ruhig();
}
const mBeginn = await K('meldung');
ok('P, Klick auf einen Punkt: Die Abzweigung beginnt, das Werkzeug bleibt an', /^Abzweigung: Sie beginnt hier/.test(mBeginn) && (await K('loops')).length === mitKreis.loops.length, mBeginn);
{
  const q = await bild('seite', KP[2]);
  await seite.mouse.click(q.x, q.y);
  await ruhig();
}
const m1 = await K('meldung');
const nach1 = await K('loops');
ok('Klick auf den gegenüberliegenden Punkt: eine Abzweigung', nach1.length === mitKreis.loops.length + 1 && nach1.at(-1).art === 'ring' && nach1.at(-1).haengt?.[0] === true && nach1.at(-1).haengt?.[1] === true, m1);
const m2 = await abzweigen('seite', KP[1], KP[3]);
const nach2 = { lagen: await K('lagen'), loops: await K('loops') };
ok('in einem Zug von Punkt 1 zu Punkt 3 gezogen: die zweite', nach2.loops.length === mitKreis.loops.length + 2 && nach2.loops.at(-1).haengt?.[0] === true, m2);
{
  const kr = nach2.loops.find((l) => l.id === kreis.id);
  const [a1, a2] = nach2.loops.slice(-2);
  const enden = [a1.punkte[0], a1.punkte.at(-1), a2.punkte[0], a2.punkte.at(-1)];
  const amKreis = enden.map((e) => kr.punkte.find((p) => p.kreuzung !== null && p.kreuzung === e.kreuzung));
  ok(
    'jede hängt an zwei Punkten des Kreises und teilt sie',
    amKreis.every((p, i) => p && weit(p.ref, enden[i].ref) < 1e-6) && new Set(amKreis).size === 4,
    `Enden ${enden.map((e) => `K${e.kreuzung}`).join(' ')}; größter Abstand Ende–Punkt ${Math.max(...amKreis.map((p, i) => (p ? weit(p.ref, enden[i].ref) : Infinity))).toExponential(1)}`,
  );
  const mitteA = a1.punkte.filter((p) => p.kreuzung !== null && a2.punkte.some((q) => q.kreuzung === p.kreuzung));
  ok('in der Kreuzung liegt ein gemeinsamer Punkt', mitteA.length === 1 && weit(mitteA[0].ref, a2.punkte.find((q) => q.kreuzung === mitteA[0].kreuzung).ref) < 1e-6, mitteA.length ? `bei (${z1(mitteA[0].ref.x)} ${z1(mitteA[0].ref.y)} ${z1(mitteA[0].ref.z)})` : 'keiner');
  const kb = kasten(nach2.lagen);
  const bewegt = Math.max(...kb.map((x, i) => Math.abs(x - kastenVorher[i])));
  const krBewegt = Math.max(...kr.punkte.map((p, i) => weit(p.ref, KP[i])));
  ok('die Form bleibt: Ausdehnung wie vorher, die Punkte des Kreises am Ort', bewegt < 1 && krBewegt < 0.5, `Ausdehnung um höchstens ${z2(bewegt)} anders, Punkte des Kreises um höchstens ${z2(krBewegt)} bewegt`);
  ok('nichts umgeschlagen, spiegelgleich', (await K('umgeschlagen')) === 0 && (await K('symmetrie')) < 1e-6, `umgeschlagen ${await K('umgeschlagen')}, Abweichung ${(await K('symmetrie')).toExponential(1)}`);
}
if (BILD) await seite.screenshot({ path: `${BILD}-2-kreuz.jpg`, type: 'jpeg', quality: 88 });

/** wo umgeschlagene Dreiecke liegen (gegen die Summe der Normalen ihrer Ecken): Mitte und Fläche */
const woUmgeschlagen = async () => {
  const P = await K('lagen');
  const T = await K('dreiecke');
  const nor = new Float64Array(P.length);
  const fl = [];
  for (let t = 0; t < T.length; t += 3) {
    const [a, b, c] = [T[t], T[t + 1], T[t + 2]];
    const u = [P[3 * b] - P[3 * a], P[3 * b + 1] - P[3 * a + 1], P[3 * b + 2] - P[3 * a + 2]];
    const v = [P[3 * c] - P[3 * a], P[3 * c + 1] - P[3 * a + 1], P[3 * c + 2] - P[3 * a + 2]];
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    fl.push(n);
    for (const w of [a, b, c]) for (let k = 0; k < 3; k++) nor[3 * w + k] += n[k];
  }
  const aus = [];
  for (let t = 0; t < T.length; t += 3) {
    let sk = 0;
    for (const w of [T[t], T[t + 1], T[t + 2]]) for (let k = 0; k < 3; k++) sk += fl[t / 3][k] * nor[3 * w + k];
    if (sk >= 0) continue;
    const m = [0, 1, 2].map((k) => (P[3 * T[t] + k] + P[3 * T[t + 1] + k] + P[3 * T[t + 2] + k]) / 3);
    aus.push(`(${z1(m[0])} ${z1(m[1])} ${z1(m[2])}) Fläche ${z2(Math.hypot(...fl[t / 3]) / 2)}`);
  }
  return aus;
};

/** was unter einem Bildpunkt obenauf liegt (Linie, Punkt, Spiegelbild, Griff) */
const obenauf = (q) =>
  seite.evaluate(
    ([x, y]) => {
      const el = document.elementFromPoint(x, y);
      return el ? { l: el.getAttribute('data-l'), i: el.getAttribute('data-i'), m: el.getAttribute('data-m'), g: el.getAttribute('data-g') } : null;
    },
    [q.x, q.y],
  );
/**
 * Eine Stelle im Blatt `a` auf der Linie `id`, an der sie obenauf liegt und kein Punkt in der Nähe ist (als Bildpunkt); `nahe`: die
 * Stelle, die diesem Bildpunkt am nächsten liegt (sonst die erste).
 */
const stelleAufLinie = (a, id, nahe = null) =>
  seite.evaluate(
    ([a2, id2, nahe2]) => {
      let best = null;
      let gut = Infinity;
      const blatt = document.getElementById(`blatt-${a2}`);
      const punkte = [...blatt.querySelectorAll('[data-i]')].filter((e) => Number(e.getAttribute('data-i')) >= 0).map((e) => e.getBoundingClientRect());
      for (const el of blatt.querySelectorAll(`[data-l="${id2}"]`)) {
        if (el.getAttribute('data-i') !== null && Number(el.getAttribute('data-i')) >= 0) continue;
        if (el.getAttribute('data-m') === '1' || el.getAttribute('data-g') || typeof el.getTotalLength !== 'function') continue;
        const lang = el.getTotalLength();
        const m = el.getScreenCTM();
        for (let k = 1; k < 160; k++) {
          const q = el.getPointAtLength((lang * k) / 160).matrixTransform(m);
          if (punkte.some((r) => Math.hypot(r.left + r.width / 2 - q.x, r.top + r.height / 2 - q.y) < 10)) continue;
          const oben = document.elementFromPoint(q.x, q.y);
          if (!oben || oben.getAttribute('data-l') !== String(id2) || (oben.getAttribute('data-i') !== null && Number(oben.getAttribute('data-i')) >= 0) || oben.getAttribute('data-m') === '1') continue;
          if (!nahe2) return { x: q.x, y: q.y };
          const d = Math.hypot(q.x - nahe2.x, q.y - nahe2.y);
          if (d < gut) {
            gut = d;
            best = { x: q.x, y: q.y };
          }
        }
      }
      return best;
    },
    [a, id, nahe],
  );

// ---------- 3. den Punkt in der Kreuzung herausziehen ----------
{
  const L = await K('loops');
  const [a1, a2] = L.slice(-2);
  const kp = a1.punkte.find((p) => p.kreuzung !== null && a2.punkte.some((q) => q.kreuzung === p.kreuzung));
  // im Blatt Seite wählen (dort liegt er frei), dann mit G im Blatt Front zur Seite ziehen (z), Klick beendet
  const blatt = 'front';
  const inSeite = await bild('seite', kp.ref);
  const oben = await obenauf(inSeite);
  await seite.mouse.click(inSeite.x, inSeite.y);
  await ruhig();
  const zielOrt = { ...kp.ref, z: kp.ref.z + 60 };
  const von = await bild('front', kp.ref);
  const bis = await bild('front', zielOrt);
  await seite.mouse.move(von.x, von.y);
  await seite.waitForTimeout(80);
  await seite.keyboard.press('g');
  for (let i = 1; i <= 20; i++) {
    await seite.mouse.move(von.x + ((bis.x - von.x) * i) / 20, von.y + ((bis.y - von.y) * i) / 20);
    await seite.waitForTimeout(14);
  }
  await seite.mouse.down();
  await seite.mouse.up();
  await ruhig();
  const D = await K('loops');
  const [d1, d2] = D.slice(-2);
  const p1 = d1.punkte.find((p) => p.kreuzung === kp.kreuzung);
  const p2 = d2.punkte.find((p) => p.kreuzung === kp.kreuzung);
  const kr = D.find((l) => l.id === kreis.id);
  const krBewegt = Math.max(...kr.punkte.map((p, i) => weit(p.ref, KP[i])));
  ok(`den Punkt in der Kreuzung um 60 herausgezogen (Blatt ${blatt}): Beide Linien gehen mit`, !!p1 && !!p2 && weit(p1.ref, zielOrt) < 2 && weit(p1.ref, p2.ref) < 1e-6, p1 ? `z ${z1(kp.ref.z)} → ${z1(p1.ref.z)}; die Punkte der beiden Linien liegen ${weit(p1.ref, p2.ref).toExponential(1)} auseinander` : `obenauf lag ${JSON.stringify(oben)}`);
  ok('der Kreis bleibt, nichts umgeschlagen, spiegelgleich', krBewegt < 0.5 && (await K('umgeschlagen')) === 0 && (await K('symmetrie')) < 1e-6, `Punkte des Kreises um höchstens ${z2(krBewegt)} bewegt; umgeschlagen ${await K('umgeschlagen')}`);
  if (BILD) await seite.screenshot({ path: `${BILD}-3-horn.jpg`, type: 'jpeg', quality: 88 });
}

const kastenHorn = kasten(await K('lagen'));

// ---------- 4. Löschen ----------
{
  const L0 = await K('loops');
  const zahl = L0.length;
  // der Kreis allein: an ihm hängen die Abzweigungen
  const aufKreis = await stelleAufLinie('seite', kreis.id);
  if (aufKreis) {
    await seite.mouse.click(aufKreis.x, aufKreis.y);
    await seite.keyboard.press('Delete');
    await ruhig();
  }
  const m4a = await K('meldung');
  ok('der Kreis allein lässt sich nicht löschen', !!aufKreis && (await K('loops')).length === zahl && /hängen 2 Abzweigungen/.test(m4a), m4a || 'keine Stelle auf dem Kreis gefunden');
  // ein Punkt des Kreises, an dem eine Abzweigung hängt
  const pk = await bild('seite', KP[0]);
  await seite.mouse.click(pk.x, pk.y);
  await seite.keyboard.press('Delete');
  await ruhig();
  const m4b = await K('meldung');
  const L1 = await K('loops');
  ok('ein Punkt, an dem eine Abzweigung hängt, bleibt', L1.length === zahl && L1.find((l) => l.id === kreis.id).punkte.length === 4 && /solange eine Abzweigung an ihm hängt/.test(m4b), m4b);
  // die zweite Abzweigung
  const a2 = L0.at(-1);
  const aufAst = await stelleAufLinie('seite', a2.id);
  if (aufAst) {
    await seite.mouse.click(aufAst.x, aufAst.y);
    await seite.keyboard.press('Delete');
    await ruhig();
  }
  const L2 = await K('loops');
  const kr = L2.find((l) => l.id === kreis.id);
  ok(
    'eine Abzweigung lässt sich löschen: Die Punkte des Kreises bleiben und sind dort wieder gewöhnliche Punkte',
    !!aufAst && L2.length === zahl - 1 && !L2.some((l) => l.id === a2.id) && kr.punkte.length === 4 && kr.punkte[1].kreuzung === null && kr.punkte[3].kreuzung === null && kr.punkte[0].kreuzung !== null,
    `${L2.length} Linien (vorher ${zahl}); Kreuzungen an den Punkten des Kreises: ${kr.punkte.map((p) => (p.kreuzung === null ? '–' : `K${p.kreuzung}`)).join(' ')}; ${await K('meldung')}`,
  );
  await seite.keyboard.press('Meta+z');
  await ruhig();
  ok('⌘Z: die Abzweigung ist wieder da', (await K('loops')).length === zahl && (await K('loops')).at(-1).haengt?.[0] === true);
}

// ---------- 5. Start auf einer Linie ohne Punkt; Abbruch; ein Punkt dazwischen ----------
{
  const L0 = await K('loops');
  // die Linie der geladenen Form, die im Blatt Seite dem Kreis am nächsten kommt: ihre nächste freie Stelle, und der Punkt des
  // Kreises, der ihr am nächsten liegt
  let wirt = null;
  let stelle = null;
  let zielPunkt = null;
  let nah = Infinity;
  const mitteKreis = await bild('seite', { x: KX, y: KY, z: 0 });
  for (const l of anfang.loops) {
    if (l.art === 'mitte') continue;
    const q = await stelleAufLinie('seite', l.id, mitteKreis);
    if (!q) continue;
    const d = Math.hypot(q.x - mitteKreis.x, q.y - mitteKreis.y);
    if (d < nah) {
      nah = d;
      stelle = q;
      wirt = l;
    }
  }
  if (wirt && stelle) {
    let dz = Infinity;
    for (const ref of KP) {
      const q = await bild('seite', ref);
      const d = Math.hypot(q.x - stelle.x, q.y - stelle.y);
      if (d < dz) {
        dz = d;
        zielPunkt = q;
      }
    }
  }
  const punkteWirt = async () => (await K('loops')).find((l) => l.id === wirt.id).punkte.length;
  const w0 = wirt ? L0.find((l) => l.id === wirt.id).punkte.length : 0;
  // Klick auf die Linie: Der Punkt entsteht sofort; Esc nimmt ihn zurück
  if (wirt) {
    await seite.keyboard.press('p');
    await seite.mouse.click(stelle.x, stelle.y);
    await ruhig();
  }
  const m5a = await K('meldung');
  ok('P, Klick auf eine Linie ohne Punkt: Der Punkt ist sofort gesetzt, das Werkzeug bleibt an', !!wirt && (await punkteWirt()) === w0 + 1 && /der Punkt ist gesetzt/.test(m5a) && (await K('loops')).length === L0.length, wirt ? `Linie ${wirt.id} (${wirt.art}): ${w0} → ${await punkteWirt()} Punkte; ${m5a}` : 'keine freie Stelle auf einer Linie gefunden');
  await seite.keyboard.press('Escape');
  await ruhig();
  ok('Esc: abgebrochen, der Punkt ist wieder weg', !!wirt && (await punkteWirt()) === w0 && (await K('loops')).length === L0.length, wirt ? `${await punkteWirt()} Punkte` : '');
  // noch einmal, mit einem Punkt dazwischen (auf der Haut, wo nichts liegt)
  let dazwischen = null;
  if (wirt) {
    await seite.keyboard.press('p');
    await seite.mouse.click(stelle.x, stelle.y);
    await ruhig();
    // eine freie Stelle auf der Haut neben der Mitte zwischen Anfang und Ende (nichts unter dem Zeiger, etwas Abstand zu beiden)
    const mx = (stelle.x + zielPunkt.x) / 2;
    const my = (stelle.y + zielPunkt.y) / 2;
    suche: for (const r of [14, 20, 26, 10]) {
      for (let w = 0; w < 12; w++) {
        const q = { x: mx + r * Math.cos((w * Math.PI) / 6), y: my + r * Math.sin((w * Math.PI) / 6) };
        if (Math.hypot(q.x - stelle.x, q.y - stelle.y) < 10 || Math.hypot(q.x - zielPunkt.x, q.y - zielPunkt.y) < 10) continue;
        const o = await obenauf(q);
        if (o && o.l === null && o.g === null) {
          dazwischen = q;
          break suche;
        }
      }
    }
    if (dazwischen) {
      await seite.mouse.click(dazwischen.x, dazwischen.y);
      await seite.waitForTimeout(120);
    }
    await seite.mouse.click(zielPunkt.x, zielPunkt.y);
    await ruhig();
  }
  const m5 = await K('meldung');
  const L1 = await K('loops');
  const neu = L1.at(-1);
  const w1 = wirt ? L1.find((l) => l.id === wirt.id) : null;
  ok(
    'Klick auf die Linie, Klick auf die Haut, Klick auf einen Punkt des Kreises: eine Abzweigung mit einem eigenen Punkt dazwischen',
    !!wirt && !!dazwischen && L1.length === L0.length + 1 && neu.haengt?.[0] === true && neu.haengt?.[1] === true && w1.punkte.length === w0 + 1 && w1.punkte.some((p) => p.kreuzung !== null && p.kreuzung === neu.punkte[0].kreuzung) && neu.punkte.filter((p) => p.sichtbar && p.kreuzung === null).length >= 1 && L1.find((l) => l.id === kreis.id).punkte.length === 4,
    wirt ? `Linie ${wirt.id}: ${w0} → ${w1.punkte.length} Punkte; die Abzweigung hat ${neu.punkte.length} Punkte (${neu.punkte.map((p) => (p.kreuzung === null ? (p.ecke ? 'Ecke' : 'glatt') : `K${p.kreuzung}`)).join(', ')}); ${m5}` : 'keine freie Stelle auf einer Linie gefunden',
  );
  {
    const kb = kasten(await K('lagen'));
    const anders = Math.max(...kb.map((x, i) => Math.abs(x - kastenHorn[i])));
    ok('danach: die Form bleibt, nichts umgeschlagen, spiegelgleich', anders < 1 && (await K('umgeschlagen')) === 0 && (await K('symmetrie')) < 1e-6, `Ausdehnung um höchstens ${z2(anders)} anders; umgeschlagen ${await K('umgeschlagen')}`);
  }
  if (BILD) await seite.screenshot({ path: `${BILD}-5-von-linie.jpg`, type: 'jpeg', quality: 88 });
}

// ---------- 6. zum Spiegelbild: Die Linie endet auf der Mitte ----------
{
  const L0 = await K('loops');
  const kr = L0.find((l) => l.id === kreis.id);
  // der Punkt des Kreises, dessen Spiegelbild im Blatt Front obenauf liegt
  let m6 = 'kein Punkt des Kreises liegt im Blatt Front samt Spiegelbild obenauf';
  let getan = false;
  for (const p of kr.punkte) {
    const hier = await bild('front', p.ref);
    const dort = await bild('front', { ...p.ref, z: -p.ref.z });
    const o1 = await obenauf(hier);
    const o2 = await obenauf(dort);
    if (process.env.DIAG) console.log(`     Punkt (${z1(p.ref.x)} ${z1(p.ref.y)} ${z1(p.ref.z)}): hier ${JSON.stringify(o1)}, dort ${JSON.stringify(o2)}`);
    // hier der Punkt, dort das Spiegelbild seiner Linie an derselben Stelle (Punkte der anderen Seite sind nicht zu greifen; obenauf
    // kann auch das Ende einer Abzweigung liegen: Es ist derselbe Punkt)
    if (!o1 || !o2 || o1.i === null || Number(o1.i) < 0 || o1.l !== o2.l || o1.m === '1' || o2.m !== '1') continue;
    await seite.keyboard.press('p');
    await ziehen(hier, dort, 24);
    m6 = await K('meldung');
    getan = true;
    break;
  }
  const L1 = await K('loops');
  const neu = L1.at(-1);
  ok(
    'P von einem Punkt zu seinem Spiegelbild: eine Linie, die am Punkt hängt und auf der Mitte endet',
    getan && L1.length === L0.length + 1 && neu.haengt?.[0] === true && neu.haengt?.[1] === false && Math.abs(neu.punkte.at(-1).ref.z) < 1e-9 && neu.punkte[0].ref.z > 1,
    m6,
  );
  {
    const kb = kasten(await K('lagen'));
    const anders = Math.max(...kb.map((x, i) => Math.abs(x - kastenHorn[i])));
    ok('danach: die Form bleibt, nichts umgeschlagen, spiegelgleich', anders < 1 && (await K('umgeschlagen')) === 0 && (await K('symmetrie')) < 1e-6, `Ausdehnung um höchstens ${z2(anders)} anders; umgeschlagen ${await K('umgeschlagen')}; die Linie hat ${neu.punkte.filter((q) => q.sichtbar).length} Punkte`);
    if (process.env.DIAG) {
      console.log(`     die Linie: ${neu.punkte.map((q) => `(${z1(q.ref.x)} ${z1(q.ref.y)} ${z1(q.ref.z)}${q.kreuzung !== null ? ` K${q.kreuzung}` : ''}${q.sichtbar ? '' : ' verborgen'})`).join(' ')}`);
      for (const t of await woUmgeschlagen()) console.log(`     umgeschlagen bei ${t}`);
    }
  }
  if (BILD) await seite.screenshot({ path: `${BILD}-6-zur-mitte.jpg`, type: 'jpeg', quality: 88 });
}

// ---------- 7. zurück bis zum Anfang ----------
{
  for (let k = 0; k < 16 && (await K('loops')).length > anfang.loops.length; k++) {
    await seite.keyboard.press('Meta+z');
    await ruhig();
  }
  const z = await K('lagen');
  let rest = z.length === anfang.lagen.length ? 0 : Infinity;
  if (rest === 0) for (let i = 0; i < z.length; i++) rest = Math.max(rest, Math.abs(z[i] - anfang.lagen[i]));
  ok('⌘Z bis zum Anfang: die Form wie geladen', (await K('loops')).length === anfang.loops.length && rest < 1e-9, `${z.length / 3} Punkte, Rest ${rest === Infinity ? 'andere Punktzahl' : rest.toExponential(1)}`);
}
ok('keine Fehler in der Konsole', fehler.length === 0, fehler.slice(0, 3).join(' | ').slice(0, 400));
console.log(schlecht === 0 ? 'alle Punkte erfüllt' : `${schlecht} Punkt${schlecht === 1 ? '' : 'e'} nicht erfüllt`);
await browser.close();
process.exit(schlecht === 0 ? 0 : 1);
