// Plan vom 12.11.2026, Schritt 5, Etappe 2b (14.11.): in der Pose wie in der Grundform, im Fenster mit der Maus, an Florians Form.
// Florian: „verschieben und bearbeiten sollte ich alles ohne Probleme können. Dann ist es ja ein einfacher Morph der Punkte und
// Handles von einer zur anderen Position, während die Kieferknochen sich bewegen.“
//   1  Seine Form laden (NAME, Standard „maul handgemacht test“), die Lippenlinie wählen (RING, Standard 14).
//   2  „Fressen“ an und aus: die Grundform bitgleich. Wieder an: die Pose wie beim ersten Mal (höchstens 0,05).
//   3  In der Pose den untersten Punkt der Unterlippe 25 nach unten ziehen (Seite): Er liegt gezeigt dort, wohin er gezogen wurde;
//      fern vom Maul bewegt sich die Haut höchstens 1; nichts schlägt zusätzlich um; die Linien liegen höchstens 0,5 neben ihrem
//      Pfad. ⌘Z führt zurück.
//   4  Derselbe Zug fern vom Maul (ein Punkt 25 nach oben), einmal in der Grundform, einmal in der Pose: dieselbe Haut (in der Ruhe
//      verglichen, höchstens 0,5 auseinander).
//   5  Die Regler ändern die Ruhe der Pose nicht (bitgleich).
//   6  In der Pose kein Löschen und kein neuer Punkt (Meldung, nichts ändert sich).
// Aufruf aus apps/editor: GPU=1 [NAME=…] [RING=…] node scripts/pruefen/form-pose-fenster.mjs [bild-ohne-endung]
import { chromium } from '@playwright/test';

const BILD = process.argv[2] ?? '';
const NAME = process.env.NAME ?? 'maul handgemacht test';
const RING = Number(process.env.RING ?? 14);
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
const z2 = (x) => x.toFixed(2).replace('.', ',');
const groesster = (A, B) => {
  if (A.length !== B.length) return Infinity;
  let m = 0;
  for (let i = 0; i < A.length; i++) m = Math.max(m, Math.abs(A[i] - B[i]));
  return m;
};
/** größter Abstand der Punkte von A (aus `nur`) zur Fläche B (Dreiecke T über den Lagen PB) */
const zurFlaeche = (PA, PB, T, nur = null) => {
  const tri = [];
  for (let t = 0; t < T.length; t += 3) {
    const a = [PB[3 * T[t]], PB[3 * T[t] + 1], PB[3 * T[t] + 2]];
    const b = [PB[3 * T[t + 1]], PB[3 * T[t + 1] + 1], PB[3 * T[t + 1] + 2]];
    const c = [PB[3 * T[t + 2]], PB[3 * T[t + 2] + 1], PB[3 * T[t + 2] + 2]];
    tri.push({ a, b, c, lo: [0, 1, 2].map((k) => Math.min(a[k], b[k], c[k])), hi: [0, 1, 2].map((k) => Math.max(a[k], b[k], c[k])) });
  }
  const sub = (p, q) => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
  const dot = (p, q) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
  const zuDreieck = (p, { a, b, c }) => {
    // nächster Punkt des Dreiecks (Ericson, Real-Time Collision Detection)
    const ab = sub(b, a);
    const ac = sub(c, a);
    const ap = sub(p, a);
    const d1 = dot(ab, ap);
    const d2 = dot(ac, ap);
    let q;
    if (d1 <= 0 && d2 <= 0) q = a;
    else {
      const bp = sub(p, b);
      const d3 = dot(ab, bp);
      const d4 = dot(ac, bp);
      if (d3 >= 0 && d4 <= d3) q = b;
      else {
        const vc = d1 * d4 - d3 * d2;
        if (vc <= 0 && d1 >= 0 && d3 <= 0) {
          const v = d1 / (d1 - d3);
          q = [a[0] + v * ab[0], a[1] + v * ab[1], a[2] + v * ab[2]];
        } else {
          const cp = sub(p, c);
          const d5 = dot(ab, cp);
          const d6 = dot(ac, cp);
          if (d6 >= 0 && d5 <= d6) q = c;
          else {
            const vb = d5 * d2 - d1 * d6;
            if (vb <= 0 && d2 >= 0 && d6 <= 0) {
              const w = d2 / (d2 - d6);
              q = [a[0] + w * ac[0], a[1] + w * ac[1], a[2] + w * ac[2]];
            } else {
              const va = d3 * d6 - d5 * d4;
              if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
                const w = (d4 - d3) / (d4 - d3 + (d5 - d6));
                q = [b[0] + w * (c[0] - b[0]), b[1] + w * (c[1] - b[1]), b[2] + w * (c[2] - b[2])];
              } else {
                const den = 1 / (va + vb + vc);
                const v = vb * den;
                const w = vc * den;
                q = [a[0] + ab[0] * v + ac[0] * w, a[1] + ab[1] * v + ac[1] * w, a[2] + ab[2] * v + ac[2] * w];
              }
            }
          }
        }
      }
    }
    return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
  };
  let weit = 0;
  for (let v = 0; v < PA.length / 3; v++) {
    if (nur && !nur(v)) continue;
    const p = [PA[3 * v], PA[3 * v + 1], PA[3 * v + 2]];
    let best = Infinity;
    for (const t of tri) {
      if (p[0] < t.lo[0] - best || p[0] > t.hi[0] + best || p[1] < t.lo[1] - best || p[1] > t.hi[1] + best || p[2] < t.lo[2] - best || p[2] > t.hi[2] + best) continue;
      best = Math.min(best, zuDreieck(p, t));
    }
    weit = Math.max(weit, best);
  }
  return weit;
};
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
const zurueck = async () => {
  await seite.keyboard.press('Meta+z');
  await ruhig();
};

// ---------- 1. seine Form, die Lippenlinie gewählt ----------
await seite.evaluate((n) => window.__kurven.ablage.laden(n), NAME);
await ruhig();
await seite.keyboard.press('Home');
await seite.waitForTimeout(300);
const L0 = (await K('loops')).find((l) => l.id === RING);
if (!L0) throw new Error(`in „${NAME}“ gibt es keinen Loop ${RING}`);
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
    const leer = await bild('seite', { x: 0, y: 900, z: 0 });
    await seite.mouse.click(leer.x, leer.y);
    await seite.waitForTimeout(450);
  }
  return false;
};
ok(`„${NAME}“ geladen, die Lippenlinie (Loop ${RING}) gewählt`, await waehlen());
await ruhig();
const grund0 = await K('lagen');
const umg0 = await K('umgeschlagen');

// ---------- 2. an, aus, an ----------
await seite.click('#knopf-pose');
await ruhig();
const pose1 = await K('lagen');
const p1 = await K('pose');
ok('„Fressen“: die Pose ist an', p1.an === true, `Unterkiefer ${p1.kiefer}°, Schädel ${p1.schaedel}°; ${await K('meldung')}`);
await seite.click('#knopf-pose');
await ruhig();
ok('aus: die Grundform bitgleich', groesster(await K('lagen'), grund0) === 0, `größter Unterschied ${groesster(await K('lagen'), grund0).toExponential(1)}`);
await seite.click('#knopf-pose');
await ruhig();
const pose2 = await K('lagen');
ok('wieder an: die Pose wie beim ersten Mal', groesster(pose2, pose1) <= 0.05, `größter Unterschied ${groesster(pose2, pose1) === Infinity ? 'andere Punktzahl' : z2(groesster(pose2, pose1))}`);
const umgPose = await K('umgeschlagen');
const umgRuhe0 = await K('ruheUmgeschlagen');
if (BILD) await seite.screenshot({ path: `${BILD}-1-pose.jpg`, type: 'jpeg', quality: 88 });

// ---------- 3. an der Unterlippe ziehen ----------
let lippenZug = null;
{
  const Ls = await K('loops');
  const L = Ls.find((l) => l.id === RING);
  // der unterste sichtbare Punkt der Lippenlinie, wie gezeigt
  const p = [...L.punkte].filter((q) => q.sichtbar).sort((a, b) => a.ref.y - b.ref.y)[0];
  const ruheVor = await K('ruheLagen');
  const gezeigtVor = await K('lagen');
  const iP = L.punkte.indexOf(p);
  const ruheP0 = (await K('ruheLoops')).find((l) => l.id === RING).punkte[iP].ref;
  const T = await K('dreiecke');
  const von = await bild('seite', p.ref);
  const zielOrt = { ...p.ref, y: p.ref.y - 25 };
  await ziehen(von, await bild('seite', zielOrt));
  const Ln = (await K('loops')).find((l) => l.id === RING);
  const pn = [...Ln.punkte].filter((q) => q.sichtbar).sort((a, b) => Math.hypot(a.ref.x - zielOrt.x, a.ref.y - zielOrt.y, a.ref.z - zielOrt.z) - Math.hypot(b.ref.x - zielOrt.x, b.ref.y - zielOrt.y, b.ref.z - zielOrt.z))[0];
  const daneben = Math.hypot(pn.ref.x - zielOrt.x, pn.ref.y - zielOrt.y, pn.ref.z - zielOrt.z);
  ok('Punkt der Unterlippe 25 nach unten: Er liegt gezeigt dort, wohin er gezogen wurde', daneben < 1, `(${z1(p.ref.x)} ${z1(p.ref.y)}) → (${z1(pn.ref.x)} ${z1(pn.ref.y)}), ${z2(daneben)} neben dem Ziel`);
  const gezeigtNach = await K('lagen');
  const Tn = await K('dreiecke');
  // fern vom Maul: Punkte der Haut von vorher, weiter als 150 vom gezogenen Punkt; ihr Abstand zur Haut danach
  const fern = zurFlaeche(gezeigtVor, gezeigtNach, Tn, (v) => Math.hypot(gezeigtVor[3 * v] - p.ref.x, gezeigtVor[3 * v + 1] - p.ref.y, Math.abs(gezeigtVor[3 * v + 2]) - Math.abs(p.ref.z)) > 150);
  ok('fern vom Maul bewegt sich die Haut höchstens 1', fern <= 1, `${z2(fern)} (${gezeigtVor.length / 3} → ${gezeigtNach.length / 3} Punkte)`);
  const umg = await K('umgeschlagen');
  const umgRuhe = await K('ruheUmgeschlagen');
  const ruheP1 = (await K('ruheLoops')).find((l) => l.id === RING).punkte[iP].ref;
  lippenZug = { i: iP, von: ruheP0, d: { x: ruheP1.x - ruheP0.x, y: ruheP1.y - ruheP0.y, z: ruheP1.z - ruheP0.z }, umgPose: umg, umgRuhe };
  ok('nichts schlägt zusätzlich um', umg <= umgPose, `umgeschlagen ${umg} gezeigt, ${umgRuhe} in der Ruhe der Pose (in der Pose davor ${umgPose} gezeigt und ${umgRuhe0} in der Ruhe, Grundform ${umg0})`);
  if (process.env.DIAG) {
    // wo die umgeschlagenen Dreiecke der gezeigten Pose liegen
    const P = await K('lagen');
    const TT = await K('dreiecke');
    const nor = new Float64Array(P.length);
    const fl = [];
    for (let t = 0; t < TT.length; t += 3) {
      const [a, b, c] = [TT[t], TT[t + 1], TT[t + 2]];
      const u = [P[3 * b] - P[3 * a], P[3 * b + 1] - P[3 * a + 1], P[3 * b + 2] - P[3 * a + 2]];
      const v = [P[3 * c] - P[3 * a], P[3 * c + 1] - P[3 * a + 1], P[3 * c + 2] - P[3 * a + 2]];
      const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      fl.push(n);
      for (const w of [a, b, c]) for (let k = 0; k < 3; k++) nor[3 * w + k] += n[k];
    }
    for (let t = 0; t < TT.length; t += 3) {
      let sk = 0;
      for (const w of [TT[t], TT[t + 1], TT[t + 2]]) for (let k = 0; k < 3; k++) sk += fl[t / 3][k] * nor[3 * w + k];
      if (sk >= 0) continue;
      const m = [0, 1, 2].map((k) => (P[3 * TT[t] + k] + P[3 * TT[t + 1] + k] + P[3 * TT[t + 2] + k]) / 3);
      console.log(`     umgeschlagen bei (${z1(m[0])} ${z1(m[1])} ${z1(m[2])}) Fläche ${z2(Math.hypot(...fl[t / 3]) / 2)}, ${z1(Math.hypot(m[0] - pn.ref.x, m[1] - pn.ref.y, Math.abs(m[2]) - Math.abs(pn.ref.z)))} vom gezogenen Punkt`);
    }
  }
  const rest = await K('pfadRest');
  ok('die Linien liegen höchstens 0,5 neben ihrem Pfad', Math.max(...rest) <= 0.5, `größte Abweichung ${z2(Math.max(...rest))}`);
  ok('spiegelgleich', (await K('symmetrie')) < 1e-6);
  if (BILD) await seite.screenshot({ path: `${BILD}-2-gezogen.jpg`, type: 'jpeg', quality: 88 });
  await zurueck();
  const ruheZurueck = await K('ruheLagen');
  ok('⌘Z: die Ruhe der Pose wie vor dem Zug', groesster(ruheZurueck, ruheVor) < 1e-9, `größter Unterschied ${groesster(ruheZurueck, ruheVor) === Infinity ? 'andere Punktzahl' : groesster(ruheZurueck, ruheVor).toExponential(1)}`);
  void T;
}

// ---------- 6. in der Pose kein Löschen und kein neuer Punkt ----------
{
  const vor = await K('loops');
  const L = vor.find((l) => l.id === RING);
  const p = [...L.punkte].filter((q) => q.sichtbar).sort((a, b) => a.ref.y - b.ref.y)[0];
  const q = await bild('seite', p.ref);
  await seite.mouse.click(q.x, q.y);
  await ruhig();
  await seite.keyboard.press('Delete');
  await ruhig();
  const m1 = await K('meldung');
  const nach1 = await K('loops');
  ok('in der Pose löschen: nichts wird gelöscht, eine Meldung sagt warum', nach1.length === vor.length && nach1.every((l, i) => l.punkte.length === vor[i].punkte.length) && /in der Grundform/.test(m1), m1);
  // Doppelklick auf die Lippenlinie zwischen ihren Punkten
  let j = 0;
  for (let i = 1; i < L.s.length; i++) if (Math.abs(L.s[i] - 0.3 * L.laenge) < Math.abs(L.s[j] - 0.3 * L.laenge)) j = i;
  const d = await bild('seite', { x: L.ruhe[3 * j], y: L.ruhe[3 * j + 1], z: L.ruhe[3 * j + 2] });
  await seite.mouse.dblclick(d.x, d.y);
  await ruhig();
  const m2 = await K('meldung');
  const nach2 = await K('loops');
  ok('in der Pose Doppelklick auf eine Linie: kein neuer Punkt', nach2.every((l, i) => l.punkte.length === vor[i].punkte.length) && /in der Grundform/.test(m2), m2);
  const leer = await bild('seite', { x: 0, y: 900, z: 0 });
  await seite.mouse.click(leer.x, leer.y);
  await ruhig();
}

// ---------- 5. die Regler ändern die Ruhe nicht ----------
{
  const vor = await K('ruheLagen');
  const regler = async (id, wert) => {
    await seite.$eval(
      id,
      (el, v) => {
        el.dispatchEvent(new Event('pointerdown', { bubbles: true }));
        el.value = String(v);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      },
      wert,
    );
    await ruhig();
  };
  await regler('#maul-oeffnung', 45);
  const gezeigt45 = await K('lagen');
  await regler('#maul-oeffnung', p1.kiefer);
  const nach = await K('ruheLagen');
  ok('die Regler ändern die Ruhe der Pose nicht', groesster(nach, vor) === 0 && groesster(gezeigt45, pose2) > 5, `Ruhe: größter Unterschied ${groesster(nach, vor) === Infinity ? 'andere Punktzahl' : groesster(nach, vor).toExponential(1)}; gezeigt bei 45° um ${z1(groesster(gezeigt45, pose2))} anders`);
}

// ---------- 4. derselbe Zug fern vom Maul, in der Grundform und in der Pose ----------
{
  // ein sichtbarer Punkt einer anderen Linie, weit vom Maul (am weitesten von der Mitte der Lippenlinie), nicht auf der Mittelebene
  const Ls = await K('loops');
  const L = Ls.find((l) => l.id === RING);
  const mx = L.punkte.reduce((s, q) => s + q.ref.x, 0) / L.punkte.length;
  const my = L.punkte.reduce((s, q) => s + q.ref.y, 0) / L.punkte.length;
  let fernP = null;
  let weit = 0;
  for (const l of Ls) {
    if (l.id === RING) continue;
    for (const q of l.punkte) {
      if (!q.sichtbar || Math.abs(q.ref.z) < 20) continue;
      const d = Math.hypot(q.ref.x - mx, q.ref.y - my);
      if (d > weit) {
        weit = d;
        fernP = { l: l.id, ref: q.ref };
      }
    }
  }
  const zugFern = async () => {
    const von = await bild('seite', fernP.ref);
    await ziehen(von, await bild('seite', { ...fernP.ref, y: fernP.ref.y + 25 }));
  };
  // in der Pose
  await zugFern();
  const inPose = { P: await K('ruheLagen'), T: await K('dreiecke') };
  if (BILD) await seite.screenshot({ path: `${BILD}-3-fern-pose.jpg`, type: 'jpeg', quality: 88 });
  await zurueck();
  // in der Grundform
  await seite.click('#knopf-pose');
  await ruhig();
  ok('zurück in der Grundform: bitgleich wie am Anfang', groesster(await K('lagen'), grund0) === 0, `größter Unterschied ${groesster(await K('lagen'), grund0).toExponential(1)}`);
  await zugFern();
  const inGrund = { P: await K('lagen'), T: await K('dreiecke') };
  if (BILD) await seite.screenshot({ path: `${BILD}-4-fern-grund.jpg`, type: 'jpeg', quality: 88 });
  const a = zurFlaeche(inPose.P, inGrund.P, inGrund.T);
  const b = zurFlaeche(inGrund.P, inPose.P, inPose.T);
  ok(
    `derselbe Zug fern vom Maul (Punkt von Loop ${fernP.l}, ${z1(weit)} vom Maul, 25 nach oben): in der Pose dieselbe Haut wie in der Grundform`,
    Math.max(a, b) <= 0.5,
    `größter Abstand der beiden Häute ${z2(Math.max(a, b))} (${inPose.P.length / 3} und ${inGrund.P.length / 3} Punkte)`,
  );
  await zurueck();
  // zum Vergleich derselbe Zug an der Lippe in der Grundform (der Punkt um dasselbe wie in der Ruhe der Pose): schlägt dort dasselbe um?
  if (lippenZug) {
    const Lg = (await K('loops')).find((l) => l.id === RING);
    const q = Lg.punkte[lippenZug.i];
    const von = await bild('seite', q.ref);
    await ziehen(von, await bild('seite', { x: q.ref.x + lippenZug.d.x, y: q.ref.y + lippenZug.d.y, z: q.ref.z }));
    const umgGrund = await K('umgeschlagen');
    console.log(`     derselbe Zug an der Lippe in der Grundform (um ${z1(lippenZug.d.x)} / ${z1(lippenZug.d.y)}): umgeschlagen ${umgGrund} (in der Pose ${lippenZug.umgRuhe} in der Ruhe, ${lippenZug.umgPose} gezeigt; davor ${umg0})`);
    await zurueck();
  }
}
ok('keine Fehler in der Konsole', fehler.length === 0, fehler.slice(0, 3).join(' | ').slice(0, 400));
console.log(schlecht === 0 ? 'alle Punkte erfüllt' : `${schlecht} Punkt${schlecht === 1 ? '' : 'e'} nicht erfüllt`);
await browser.close();
process.exit(schlecht === 0 ? 0 : 1);
