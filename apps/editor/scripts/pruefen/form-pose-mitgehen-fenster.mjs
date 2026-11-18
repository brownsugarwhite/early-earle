// Plan vom 12.11.2026, Schritt 5, Etappe 3 (14.11.): Die Pose geht mit der Grundform mit. Im Fenster mit der Maus, an Florians Form.
//   1  Seine Form laden (NAME, Standard „maul handgemacht test“), die Lippenlinie wählen (RING, Standard 14), „Fressen“ an. In der
//      Pose einen Punkt der Unterlippe 15 nach unten ziehen. Zurück in die Grundform.
//   2  In der Grundform nacheinander ändern; nach jeder Änderung wieder in die Pose und zurück:
//      0  nichts ändern (nur verlassen und wieder betreten)
//      A  einen Punkt fern vom Maul 15 ziehen, dorthin, wo keine andere Linie liegt (danach verfeinert sich das Netz)
//      B  einen Punkt der Lippenlinie 10 nach oben ziehen (einen, vor und hinter dem im Seitenblatt kein anderer liegt)
//      C  neben dem in der Pose gezogenen Punkt einen Punkt auf der Lippenlinie einfügen (Doppelklick)
//      D  eine Linie quer über den Körper schneiden (L)
// Kriterien (im Plan, Schritt 5, Etappe 3): der Zug an der Lippe bleibt; die Linien der Pose gehen mit; die Haut der Pose bleibt, wo
// sich die Grundform nicht geändert hat, und zeigt deren Änderung; nichts geht kaputt; die Grundform bleibt beim Verlassen bitgleich.
// Aufruf aus apps/editor: GPU=1 [NAME=…] [RING=…] [NUR=0ABCD] node scripts/pruefen/form-pose-mitgehen-fenster.mjs [bild-ohne-endung]
import { chromium } from '@playwright/test';
import { folgenAbstand, pfadFolge, zurFlaeche, zurFolge } from './form-pose-teile.mjs';

const BILD = process.argv[2] ?? '';
const NAME = process.env.NAME ?? 'maul handgemacht test';
const RING = Number(process.env.RING ?? 14);
const NUR = process.env.NUR ?? '0ABCD';
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
  await seite.waitForTimeout(300);
  await seite.waitForFunction(() => !window.__kurven.zeiten().beschaeftigt, null, { timeout: 240000 });
  await seite.waitForTimeout(200);
  await seite.waitForFunction(() => !window.__kurven.zeiten().beschaeftigt, null, { timeout: 240000 });
};
const bild = (a, p) => K('bild', a, p);
let schlecht = 0;
const ok = (name, gut, text = '') => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};
const z1 = (x) => x.toFixed(1).replace('.', ',');
const z2 = (x) => (Number.isFinite(x) ? x.toFixed(2).replace('.', ',') : 'nicht vergleichbar');
const groesster = (A, B) => {
  if (A.length !== B.length) return Infinity;
  let m = 0;
  for (let i = 0; i < A.length; i++) m = Math.max(m, Math.abs(A[i] - B[i]));
  return m;
};
const weg = (p, q) => ({ x: p.x - q.x, y: p.y - q.y, z: p.z - q.z });
const lang = (v) => Math.hypot(v.x, v.y, v.z);
const ziehen = async (von, nach, schritte = 20) => {
  await seite.mouse.move(von.x, von.y);
  await seite.waitForTimeout(80);
  await seite.mouse.down();
  for (let i = 1; i <= schritte; i++) {
    await seite.mouse.move(von.x + ((nach.x - von.x) * i) / schritte, von.y + ((nach.y - von.y) * i) / schritte);
    await seite.waitForTimeout(18);
  }
  await seite.mouse.up();
  await ruhig();
};
const leerKlick = async () => {
  const leer = await bild('seite', { x: 0, y: 900, z: 0 });
  await seite.mouse.click(leer.x, leer.y);
  await seite.waitForTimeout(450);
};

// ---------- Stand lesen ----------
/** Art je Linie (`ring` ist offen, alles andere geschlossen) */
let arten = new Map();
const artenLesen = async () => {
  arten = new Map((await K('loops')).map((l) => [l.id, l.art]));
};
/** die Linien, wie gerechnet wird: in der Grundform die der Grundform, in der Pose die der Ruhe der Pose */
const grundStand = async () => ({ P: await K('lagen'), T: await K('dreiecke'), L: await K('ruheLoops'), umg: await K('umgeschlagen') });
const poseStand = async () => ({ R: await K('ruheLagen'), T: await K('dreiecke'), L: await K('ruheLoops'), umg: await K('umgeschlagen'), umgRuhe: await K('ruheUmgeschlagen') });
const linie = (L, id) => L.find((l) => l.id === id);
/** Versatz je Punkt (Ort und Griffe) der Linien der Pose gegen die der Grundform; null bei anderer Punktzahl */
const versatz = (Lp, Lg) => {
  const out = new Map();
  for (const l of Lp) {
    const g = linie(Lg, l.id);
    out.set(
      l.id,
      g && g.punkte.length === l.punkte.length
        ? l.punkte.map((p, i) => ({ d: weg(p.ref, g.punkte[i].ref), ein: p.ein && g.punkte[i].ein ? weg(p.ein, g.punkte[i].ein) : null, aus: p.aus && g.punkte[i].aus ? weg(p.aus, g.punkte[i].aus) : null }))
        : null,
    );
  }
  return out;
};
/** größter Unterschied zweier Versätze über alle Linien und Punkte, die es in beiden gibt (Ort, Griffe); dazu wo */
const versatzUnterschied = (A, B) => {
  let m = 0;
  let wo = '';
  for (const [id, a] of A) {
    const b = B.get(id);
    if (!a || !b || a.length !== b.length) {
      if (B.has(id)) return { m: Infinity, wo: `Loop ${id}: andere Punktzahl` };
      continue;
    }
    a.forEach((x, i) => {
      for (const k of ['d', 'ein', 'aus']) {
        if (!x[k] || !b[i][k]) continue;
        const u = lang(weg(x[k], b[i][k]));
        if (u > m) {
          m = u;
          wo = `Loop ${id}, Punkt ${i}, ${k === 'd' ? 'Ort' : `Griff ${k}`}`;
        }
      }
    });
  }
  return { m, wo };
};
const pfadVon = (L, id) => {
  const l = linie(L, id);
  return l ? pfadFolge(l.punkte, arten.get(id) !== 'ring') : [];
};
/** größter Abstand der Pfade aller Linien, die es in beiden Ständen gibt (jede Richtung); dazu welche Linie */
const verlaufUnterschied = (La, Lb) => {
  let m = 0;
  let wo = '';
  for (const l of La) {
    if (!linie(Lb, l.id)) continue;
    const u = folgenAbstand(pfadVon(La, l.id), pfadVon(Lb, l.id));
    if (u > m) {
      m = u;
      wo = `Loop ${l.id}`;
    }
  }
  return { m, wo };
};

// ---------- 1. seine Form, die Lippenlinie gewählt, die Pose mit einem Zug an der Lippe ----------
await seite.evaluate((n) => window.__kurven.ablage.laden(n), NAME);
await ruhig();
await seite.keyboard.press('Home');
await seite.waitForTimeout(300);
if (!(await K('loops')).find((l) => l.id === RING)) throw new Error(`in „${NAME}“ gibt es keinen Loop ${RING}`);
const waehlen = async () => {
  for (const f of [0.3, 0.2, 0.4, 0.12, 0.6, 0.7, 0.85]) {
    const L = (await K('loops')).find((l) => l.id === RING);
    let j = 0;
    for (let i = 1; i < L.s.length; i++) if (Math.abs(L.s[i] - f * L.laenge) < Math.abs(L.s[j] - f * L.laenge)) j = i;
    const q = await bild('seite', { x: L.ruhe[3 * j], y: L.ruhe[3 * j + 1], z: L.ruhe[3 * j + 2] });
    await seite.mouse.click(q.x, q.y);
    await seite.waitForTimeout(200);
    const g = await K('auswahl');
    if (g.length === 1 && g[0].l === RING && g[0].i < 0) return true;
    await leerKlick();
  }
  return false;
};
ok(`„${NAME}“ geladen, die Lippenlinie (Loop ${RING}) gewählt`, await waehlen());
await ruhig();
const poseAn = async () => {
  await seite.click('#knopf-pose');
  await ruhig();
  return (await K('pose')).an === true;
};
const poseAus = async (g, tag) => {
  await seite.click('#knopf-pose');
  await ruhig();
  const P = await K('lagen');
  ok(`${tag}: Verlassen: die Grundform bitgleich wie vor dem Betreten`, (await K('pose')).an === false && groesster(P, g.P) === 0, `größter Unterschied ${groesster(P, g.P) === Infinity ? 'andere Punktzahl' : groesster(P, g.P).toExponential(1)}`);
};
// das erste „Fressen“ richtet das Maul ein (die Linie wird das Maul der Form): einmal an und aus, dann erst der Stand der Grundform
ok('„Fressen“: die Pose ist an', await poseAn(), await K('meldung'));
await seite.click('#knopf-pose');
await ruhig();
await artenLesen();
const grund0 = await grundStand();
ok('„Fressen“ wieder an', await poseAn(), await K('meldung'));
const poseLeer = await poseStand();
/** Summe der Punkte aller Linien */
const punktZahl = (L) => L.reduce((n, l) => n + l.punkte.length, 0);
/** größte Abweichung je Linie (aus einem Haken) mit ihrer Linie */
const mitLinie = (werte, L) => {
  let k = 0;
  for (let i = 1; i < werte.length; i++) if (werte[i] > werte[k]) k = i;
  return `größte Abweichung ${z2(werte[k] ?? 0)}${werte[k] > 0.5 ? ` (Loop ${L[k]?.id})` : ''}`;
};
/** liegt im Seitenblatt ein sichtbarer Punkt einer anderen Kreuzung näher als 9 an diesem? (dann greift die Maus vielleicht den) */
const freiImBlatt = (Ls, q) => !Ls.some((l) => l.punkte.some((x) => x !== q && x.sichtbar && (x.kreuzung === null || x.kreuzung !== q.kreuzung) && Math.hypot(x.ref.x - q.ref.x, x.ref.y - q.ref.y) < 9));
// ein Punkt der Unterlippe an der Seite (nicht auf der Mitte, nicht der Mundwinkel): der unterste, wie gezeigt
const lip = { i: -1, ref: null };
{
  const Ls = await K('loops');
  const L = Ls.find((l) => l.id === RING);
  const wahl = L.punkte.map((q, i) => ({ q, i })).filter(({ q }) => q.sichtbar && Math.abs(q.ref.z) > 5 && !q.mundwinkel && freiImBlatt(Ls, q));
  const p = (wahl.length ? wahl : L.punkte.map((q, i) => ({ q, i })).filter(({ q }) => q.sichtbar)).sort((a, b) => a.q.ref.y - b.q.ref.y)[0];
  lip.i = p.i;
  const von = await bild('seite', p.q.ref);
  await ziehen(von, await bild('seite', { ...p.q.ref, y: p.q.ref.y - 15 }));
}
let vor = { g: grund0, p: await poseStand() };
{
  const rest = await K('pfadRest');
  ok('nach dem Zug liegen die Linien der Pose höchstens 0,5 neben ihrem Pfad', Math.max(...rest) <= 0.5, mitLinie(rest, vor.p.L));
}
lip.ref = linie(vor.p.L, RING).punkte[lip.i].ref;
const lipVersatz = () => weg(linie(vor.p.L, RING).punkte[lip.i].ref, linie(vor.g.L, RING).punkte[lip.i].ref);
const zug0 = lipVersatz();
ok('in der Pose einen Punkt der Unterlippe 15 nach unten gezogen', lang(zug0) > 8, `Punkt ${lip.i} der Lippenlinie, Versatz gegen die Grundform (${z1(zug0.x)} ${z1(zug0.y)} ${z1(zug0.z)}); umgeschlagen gezeigt ${vor.p.umg} (Pose davor ${poseLeer.umg}, Grundform ${grund0.umg})`);
/** so viel mehr als die Grundform darf die Pose umgeschlagen zeigen (ihr Stand vor den Änderungen der Grundform) */
const mehrAmAnfang = vor.p.umg - grund0.umg;
if (BILD) await seite.screenshot({ path: `${BILD}-1-pose-vorher.jpg`, type: 'jpeg', quality: 88 });
/** wie viele Punkte von P an einem Ort von Q liegen (auf ein Millionstel genau: Umrechnen rundet in der letzten Stelle) */
const amSelbenOrt = (P, Q) => {
  const ort = (A, v) => `${Math.round(A[v] * 1e6)} ${Math.round(A[v + 1] * 1e6)} ${Math.round(A[v + 2] * 1e6)}`;
  const alt = new Set();
  for (let v = 0; v < Q.length; v += 3) alt.add(ort(Q, v));
  let n = 0;
  for (let v = 0; v < P.length; v += 3) if (alt.has(ort(P, v))) n++;
  return n;
};
const grundInPose = await K('grundLagen');
// zurück in die Grundform: Ein Zug in der Pose verfeinert das gemeinsame Netz, die Grundform bleibt dieselbe Fläche und dieselben Linien
await seite.click('#knopf-pose');
await ruhig();
{
  const g = await grundStand();
  const li = versatzUnterschied(versatz(g.L, grund0.L), versatz(grund0.L, grund0.L));
  ok('nach dem Zug in der Pose hat die Grundform dieselben Linien (höchstens 0,05)', li.m <= 0.05, `${z2(li.m)}${li.wo ? ` (${li.wo})` : ''}`);
  // Das gemeinsame Netz hat sich dabei geändert (verdichtet, aufgeräumt): Punkte der Grundform, die es noch gibt, liegen, wo sie lagen;
  // wie weit die Flächen auseinander liegen, ist die Feinheit des Netzes (zur Kenntnis, kein Kriterium)
  console.log(`     das gemeinsame Netz danach: ${grund0.P.length / 3} → ${g.P.length / 3} Punkte, davon ${amSelbenOrt(g.P, grund0.P)} am selben Ort (noch in der Pose: ${amSelbenOrt(grundInPose, grund0.P)} von ${grundInPose.length / 3}; beim Verlassen bewegt: ${g.P.length === grundInPose.length ? z2(groesster(g.P, grundInPose)) : 'andere Punktzahl'}); neue Punkte bis ${z2(zurFlaeche(g.P, grund0.P, grund0.T))} neben der alten Fläche der Grundform, entfallene bis ${z2(zurFlaeche(grund0.P, g.P, g.T))} neben der neuen`);
  vor = { g, p: vor.p };
}

/** am Maul: Punkte der Haut näher als 120 am gezogenen Punkt der Lippe (in der Ruhe der Pose) */
const amMaul = (P) => (v) => Math.hypot(P[3 * v] - lip.ref.x, P[3 * v + 1] - lip.ref.y, Math.abs(P[3 * v + 2]) - Math.abs(lip.ref.z)) < 120;
/** Kriterium 4: nichts geht kaputt */
const heil = async (tag, g, p) => {
  const rest = await K('pfadRest');
  ok(`${tag}: die Linien liegen höchstens 0,5 neben ihrem Pfad`, Math.max(...rest) <= 0.5, mitLinie(rest, p.L));
  const neben = await K('pfadRestGezeigt');
  ok(`${tag}: gezeichnet liegt jede Linie höchstens 0,5 neben der gezeigten Haut`, Math.max(...neben) <= 0.5, mitLinie(neben, p.L));
  ok(`${tag}: spiegelgleich`, (await K('symmetrie')) < 1e-6);
  ok(`${tag}: nichts schlägt zusätzlich um`, p.umg - g.umg <= mehrAmAnfang, `gezeigt ${p.umg}, Grundform ${g.umg} (vor den Änderungen ${vor0.p.umg} und ${grund0.umg})`);
};
const vor0 = vor;
/** Kriterium 1: der Zug an der Lippe bleibt (`i`: der gezogene Punkt in der Linie von jetzt) */
const zugBleibt = (tag, g, p, i, grenze) => {
  const jetzt = weg(linie(p.L, RING).punkte[i].ref, linie(g.L, RING).punkte[i].ref);
  const u = lang(weg(jetzt, lipVersatz()));
  ok(`${tag}: der Zug an der Lippe bleibt (höchstens ${String(grenze).replace('.', ',')})`, u <= grenze, `Versatz (${z1(jetzt.x)} ${z1(jetzt.y)} ${z1(jetzt.z)}), ${z2(u)} anders als vorher`);
};
/** Kriterium 3: am Maul bleibt die Haut der Pose */
const hautBleibt = (tag, p) => {
  const u = Math.max(zurFlaeche(vor.p.R, p.R, p.T, amMaul(vor.p.R)), zurFlaeche(p.R, vor.p.R, vor.p.T, amMaul(p.R)));
  ok(`${tag}: am Maul bleibt die Haut der Pose (höchstens 0,5)`, u <= 0.5, `${z2(u)} (${vor.p.R.length / 3} → ${p.R.length / 3} Punkte)`);
};

// ---------- 0. nichts geändert: verlassen und wieder betreten ----------
if (NUR.includes('0')) {
  const tag = '0 (nichts geändert)';
  const g = vor.g;
  if (process.env.DIAG) {
    // gleich nach dem Betreten (bevor der Hintergrund rechnet) und danach: Wann weicht die Haut der Pose ab?
    await seite.click('#knopf-pose');
    const gleich = { R: await K('ruheLagen'), rest: await K('pfadRest'), zeiten: await K('zeiten') };
    await ruhig();
    const spaeter = { R: await K('ruheLagen'), rest: await K('pfadRest') };
    console.log(`     DIAG gleich nach dem Betreten: Haut ${z2(groesster(gleich.R, vor.p.R))} anders als beim Verlassen, Linien ${z2(Math.max(...gleich.rest))} neben dem Pfad, beschäftigt ${gleich.zeiten.beschaeftigt}; nach der Ruhe: Haut ${z2(groesster(spaeter.R, vor.p.R))}, Linien ${z2(Math.max(...spaeter.rest))}; dazwischen bewegt ${z2(groesster(spaeter.R, gleich.R))}`);
    await seite.click('#knopf-pose');
    await ruhig();
  }
  ok(`${tag}: die Pose ist an`, await poseAn(), await K('meldung'));
  const p = await poseStand();
  const u = groesster(p.R, vor.p.R);
  ok(`${tag}: die Haut der Pose ist dieselbe wie beim Verlassen (höchstens 0,05)`, u <= 0.05, u === Infinity ? `andere Punktzahl (${vor.p.R.length / 3} → ${p.R.length / 3})` : z2(u));
  zugBleibt(tag, g, p, lip.i, 0.05);
  const v = versatzUnterschied(versatz(vor.p.L, vor.g.L), versatz(p.L, g.L));
  ok(`${tag}: jeder Punkt der Linien behält seinen Versatz samt Griffen (höchstens 0,05)`, v.m <= 0.05, `${z2(v.m)}${v.wo ? ` (${v.wo})` : ''}`);
  await heil(tag, g, p);
  await poseAus(g, tag);
  vor = { g, p };
}

// ---------- A. einen Punkt fern vom Maul ziehen ----------
// ein sichtbarer Punkt einer anderen Linie, weit vom Maul, nicht auf der Mitte; gezogen wird 15 in die Richtung (hoch, runter, vor,
// zurück), in der er den Proben der anderen Linien am fernsten bleibt (sonst entstehen neue Kreuzungen: das ist Fall D)
let fernP = null;
{
  const Ls = await K('loops');
  const L = Ls.find((l) => l.id === RING);
  const mx = L.punkte.reduce((s, q) => s + q.ref.x, 0) / L.punkte.length;
  const my = L.punkte.reduce((s, q) => s + q.ref.y, 0) / L.punkte.length;
  let fernste = 0;
  for (const l of Ls) for (const q of l.punkte) fernste = Math.max(fernste, Math.hypot(q.ref.x - mx, q.ref.y - my));
  let best = -1;
  for (const l of Ls) {
    if (l.id === RING) continue;
    for (const q of l.punkte) {
      const weit = Math.hypot(q.ref.x - mx, q.ref.y - my);
      if (!q.sichtbar || Math.abs(q.ref.z) < 20 || weit < 0.5 * fernste || !freiImBlatt(Ls, q)) continue;
      for (const d of [
        [0, 15],
        [0, -15],
        [15, 0],
        [-15, 0],
      ]) {
        const z = { x: q.ref.x + d[0], y: q.ref.y + d[1], z: q.ref.z };
        let frei = Infinity;
        for (const o of Ls) {
          if (o.id === l.id) continue;
          for (let j = 0; j < o.ruhe.length; j += 3) {
            if (Math.hypot(o.ruhe[j] - q.ref.x, o.ruhe[j + 1] - q.ref.y, o.ruhe[j + 2] - q.ref.z) < 3) continue;
            frei = Math.min(frei, Math.hypot(o.ruhe[j] - z.x, o.ruhe[j + 1] - z.y, o.ruhe[j + 2] - z.z));
          }
        }
        if (frei > best) {
          best = frei;
          fernP = { l: l.id, ref: q.ref, ziel: z, mx, weit, frei };
        }
      }
    }
  }
}
if (NUR.includes('A') && !fernP) ok('A: ein freier Punkt fern vom Maul', false, 'keiner gefunden');
if (NUR.includes('A') && fernP) {
  const tag = `A (Punkt von Loop ${fernP.l} fern vom Maul um 15 gezogen)`;
  await ziehen(await bild('seite', fernP.ref), await bild('seite', fernP.ziel));
  await leerKlick();
  await ruhig();
  const g = await grundStand();
  ok(`${tag}: ein reiner Zug (die Linien haben dieselben Punkte wie vorher)`, punktZahl(g.L) === punktZahl(vor.g.L), `${z1(fernP.weit)} vom Maul, ${z1(fernP.frei)} frei; Punkte ${punktZahl(vor.g.L)} → ${punktZahl(g.L)}, Netz ${vor.g.P.length / 3} → ${g.P.length / 3}, umgeschlagen ${vor.g.umg} → ${g.umg}`);
  ok(`${tag}: die Pose ist an`, await poseAn(), await K('meldung'));
  const p = await poseStand();
  zugBleibt(tag, g, p, lip.i, 0.05);
  const u = versatzUnterschied(versatz(vor.p.L, vor.g.L), versatz(p.L, g.L));
  ok(`${tag}: jeder Punkt der Linien behält seinen Versatz samt Griffen (höchstens 0,05)`, u.m <= 0.05, `${z2(u.m)}${u.wo ? ` (${u.wo})` : ''}`);
  hautBleibt(tag, p);
  // die Änderung der Grundform ist in der Pose: um den gezogenen Punkt liegt die Haut der Pose auf der der Grundform
  const ziel = fernP.ziel;
  const nah = (v) => Math.hypot(g.P[3 * v] - ziel.x, g.P[3 * v + 1] - ziel.y, Math.abs(g.P[3 * v + 2]) - Math.abs(ziel.z)) < 60;
  const a = zurFlaeche(g.P, p.R, p.T, nah);
  ok(`${tag}: die Pose zeigt die Änderung der Grundform (um den gezogenen Punkt höchstens 0,5 neben der Grundform)`, a <= 0.5, `${z2(a)} (Netz ${vor.g.P.length / 3} → ${g.P.length / 3} Punkte)`);
  await heil(tag, g, p);
  if (BILD) await seite.screenshot({ path: `${BILD}-A.jpg`, type: 'jpeg', quality: 88 });
  await poseAus(g, tag);
  vor = { g, p };
}

// ---------- B. einen Punkt der Lippenlinie ziehen ----------
if (NUR.includes('B')) {
  const tag = 'B (Punkt der Lippenlinie 10 nach oben)';
  const Ls = await K('loops');
  const L = Ls.find((l) => l.id === RING);
  const wahl = L.punkte.map((q, i) => ({ q, i })).filter(({ q, i }) => q.sichtbar && Math.abs(q.ref.z) > 5 && !q.mundwinkel && i !== lip.i && freiImBlatt(Ls, q));
  const b = (wahl.length ? wahl : [{ q: L.punkte[lip.i], i: lip.i }]).sort((x, y) => y.q.ref.y - x.q.ref.y)[0];
  await ziehen(await bild('seite', b.q.ref), await bild('seite', { ...b.q.ref, y: b.q.ref.y + 10 }));
  await leerKlick();
  await ruhig();
  const g = await grundStand();
  const bewegt = lang(weg(linie(g.L, RING).punkte[b.i].ref, linie(vor.g.L, RING).punkte[b.i].ref));
  ok(`${tag}: ein reiner Zug am Punkt ${b.i} der Lippenlinie`, bewegt > 5 && punktZahl(g.L) === punktZahl(vor.g.L), `in der Grundform um ${z1(bewegt)} bewegt; Punkte ${punktZahl(vor.g.L)} → ${punktZahl(g.L)}, umgeschlagen ${vor.g.umg} → ${g.umg}`);
  ok(`${tag}: die Pose ist an`, await poseAn(), await K('meldung'));
  const p = await poseStand();
  zugBleibt(tag, g, p, lip.i, 0.05);
  const u = versatzUnterschied(versatz(vor.p.L, vor.g.L), versatz(p.L, g.L));
  ok(`${tag}: jeder Punkt der Linien behält seinen Versatz samt Griffen (höchstens 0,05)`, u.m <= 0.05, `${z2(u.m)}${u.wo ? ` (${u.wo})` : ''}`);
  await heil(tag, g, p);
  if (BILD) await seite.screenshot({ path: `${BILD}-B.jpg`, type: 'jpeg', quality: 88 });
  await poseAus(g, tag);
  vor = { g, p };
}

// ---------- C. einen Punkt auf der Lippenlinie einfügen ----------
if (NUR.includes('C')) {
  const tag = 'C (neuer Punkt auf der Lippenlinie)';
  const L = (await K('loops')).find((l) => l.id === RING);
  // die Mitte des Stücks zwischen dem in der Pose gezogenen Punkt und seinem Nachbarn (der sichtbare, sonst der andere)
  const k = lip.i + 1 < L.punkte.length ? lip.i + 1 : lip.i - 1;
  const sm = (L.punkte[lip.i].s + L.punkte[k].s) / 2;
  let j = 0;
  for (let i = 1; i < L.s.length; i++) if (Math.abs(L.s[i] - sm) < Math.abs(L.s[j] - sm)) j = i;
  const d = await bild('seite', { x: L.ruhe[3 * j], y: L.ruhe[3 * j + 1], z: L.ruhe[3 * j + 2] });
  await seite.mouse.dblclick(d.x, d.y);
  await ruhig();
  await leerKlick();
  await ruhig();
  const g = await grundStand();
  const alt = linie(vor.g.L, RING).punkte;
  const neu = linie(g.L, RING).punkte;
  // welcher Punkt von jetzt war welcher von vorher (am selben Ort)
  const war = neu.map((q) => alt.findIndex((x) => lang(weg(x.ref, q.ref)) < 1e-6));
  const iNeu = war.indexOf(-1);
  ok(`${tag}: die Lippenlinie hat einen Punkt mehr`, neu.length === alt.length + 1 && iNeu >= 0, `${alt.length} → ${neu.length} Punkte; ${await K('meldung')}`);
  ok(`${tag}: die Pose ist an`, await poseAn(), await K('meldung'));
  const p = await poseStand();
  const iLip = war.indexOf(lip.i);
  if (iLip >= 0) zugBleibt(tag, g, p, iLip, 0.5);
  else ok(`${tag}: der Zug an der Lippe bleibt`, false, 'der gezogene Punkt ist in der Grundform nicht mehr am selben Ort');
  if (iNeu >= 0) {
    const a = zurFolge(Object.values(linie(p.L, RING).punkte[iNeu].ref), pfadVon(vor.p.L, RING));
    ok(`${tag}: der neue Punkt liegt auf der Linie der Pose, wie sie war (höchstens 0,5)`, a <= 0.5, z2(a));
  }
  const u = verlaufUnterschied(vor.p.L, p.L);
  ok(`${tag}: jede Linie behält in der Pose ihren Verlauf (höchstens 0,5)`, u.m <= 0.5, `${z2(u.m)}${u.wo ? ` (${u.wo})` : ''}`);
  hautBleibt(tag, p);
  await heil(tag, g, p);
  if (BILD) await seite.screenshot({ path: `${BILD}-C.jpg`, type: 'jpeg', quality: 88 });
  await poseAus(g, tag);
  if (iLip >= 0) lip.i = iLip;
  vor = { g, p };
}

// ---------- D. eine Linie quer über den Körper schneiden ----------
if (NUR.includes('D') && fernP) {
  const tag = 'D (Linie quer über den Körper geschnitten)';
  // zwischen Maul und dem fernen Punkt, vier Fünftel des Wegs
  const xs = fernP.mx + 0.8 * (fernP.ref.x - fernP.mx);
  // von knapp über dem Körper bis knapp darunter
  let oben = -Infinity;
  let unten = Infinity;
  for (let v = 0; v < vor.g.P.length; v += 3) {
    if (Math.abs(vor.g.P[v] - xs) > 12) continue;
    oben = Math.max(oben, vor.g.P[v + 1]);
    unten = Math.min(unten, vor.g.P[v + 1]);
  }
  await seite.keyboard.press('l');
  const a = await bild('seite', { x: xs, y: oben + 40, z: 0 });
  const b = await bild('seite', { x: xs, y: unten - 40, z: 0 });
  await seite.mouse.move(a.x, a.y);
  await seite.mouse.down();
  await seite.mouse.move(b.x, b.y, { steps: 8 });
  await seite.mouse.up();
  await ruhig();
  await leerKlick();
  await ruhig();
  await artenLesen();
  const g = await grundStand();
  const neueLinien = g.L.filter((l) => !linie(vor.g.L, l.id));
  const mehrPunkte = g.L.filter((l) => linie(vor.g.L, l.id) && linie(vor.g.L, l.id).punkte.length !== l.punkte.length).map((l) => `Loop ${l.id}: ${linie(vor.g.L, l.id).punkte.length} → ${l.punkte.length}`);
  ok(`${tag}: eine neue Linie`, neueLinien.length === 1, `bei x = ${z1(xs)}: ${neueLinien.map((l) => `Loop ${l.id} mit ${l.punkte.length} Punkten`).join(', ')}; andere Punktzahl: ${mehrPunkte.join(', ') || 'keine'}; ${await K('meldung')}`);
  ok(`${tag}: die Pose ist an`, await poseAn(), await K('meldung'));
  const p = await poseStand();
  const gleich = linie(g.L, RING).punkte.length === linie(vor.g.L, RING).punkte.length;
  if (gleich) zugBleibt(tag, g, p, lip.i, 0.05);
  else ok(`${tag}: der Zug an der Lippe bleibt`, false, 'die Lippenlinie hat eine andere Punktzahl (hier nicht erwartet)');
  const u = verlaufUnterschied(vor.p.L, p.L);
  ok(`${tag}: jede alte Linie behält in der Pose ihren Verlauf (höchstens 0,5)`, u.m <= 0.5, `${z2(u.m)}${u.wo ? ` (${u.wo})` : ''}`);
  hautBleibt(tag, p);
  await heil(tag, g, p);
  if (BILD) await seite.screenshot({ path: `${BILD}-D.jpg`, type: 'jpeg', quality: 88 });
  await poseAus(g, tag);
  vor = { g, p };
}

// ---------- Bild danach: die Pose nach allen Änderungen ----------
if (BILD) {
  await poseAn();
  await seite.screenshot({ path: `${BILD}-2-pose-nachher.jpg`, type: 'jpeg', quality: 88 });
}
ok('keine Fehler in der Konsole', fehler.length === 0, fehler.slice(0, 3).join(' | ').slice(0, 400));
console.log(schlecht === 0 ? 'alle Punkte erfüllt' : `${schlecht} Punkt${schlecht === 1 ? '' : 'e'} nicht erfüllt`);
await browser.close();
