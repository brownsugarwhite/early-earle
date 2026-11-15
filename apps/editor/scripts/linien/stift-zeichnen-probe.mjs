// Probe „Auswahl und Werkzeug P“ in 2D (15.11.2026, Kriterien im Plan docs/plans/2026-11-15-auswahl-und-stift.md, vorher
// festgelegt): echte Maus und Tasten an Florians Fisch. Aufruf aus apps/editor, Server auf 5199:
//   node scripts/linien/stift-zeichnen-probe.mjs [bilder.png]
// Ausgabe: JSON mit den Messwerten und bestanden/nicht je Kriterium; mit Pfad ein Streifen aus Standbildern.
import { chromium } from '@playwright/test';

const URL = process.env.URL ?? 'http://localhost:5199';
const bildPfad = process.argv[2];
const Z = 4;
const MITTE = [313, 203];
const B = 1000;
const H = 640;
const OX = B / 2 - MITTE[0] * Z;
const OY = H / 2 - MITTE[1] * Z;
const S = (p) => [p[0] * Z + OX, p[1] * Z + OY];

const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: B, height: H }, deviceScaleFactor: 2 });
const fehler = [];
page.on('pageerror', (e) => fehler.push(String(e)));
await page.goto(`${URL}/linien.html?bild=1`);
await page.waitForFunction(() => window.__linien);
await page.evaluate(
  ([z, ox, oy]) => {
    const L = window.__linien;
    L.ansicht.z = z;
    L.ansicht.ox = ox;
    L.ansicht.oy = oy;
    L.verhalten.setzeAnsicht(L.ansicht);
    L.verhalten.abtasten();
    L.anstossen();
  },
  [Z, OX, OY],
);
const warten = (ms = 160) => page.evaluate((m) => window.__linien.vorspulen(m), ms);
const hin = async (p, schritte = 12) => {
  const [x, y] = S(p);
  await page.mouse.move(x, y, { steps: schritte });
  await warten();
};
const klick = async (p) => {
  await hin(p);
  await page.mouse.down();
  await warten(60);
  await page.mouse.up();
  await warten();
};
const ziehen = async (p, griff, alt = null) => {
  await hin(p);
  await page.mouse.down();
  await warten(40);
  const [x, y] = S([p[0] + griff[0], p[1] + griff[1]]);
  await page.mouse.move(x, y, { steps: 10 });
  await warten(60);
  if (alt) {
    await page.keyboard.down('Alt');
    await warten(30);
    const [x2, y2] = S([p[0] + alt[0], p[1] + alt[1]]);
    await page.mouse.move(x2, y2, { steps: 10 });
    await warten(60);
  }
  await page.mouse.up();
  if (alt) await page.keyboard.up('Alt');
  await warten();
};
const stand = () =>
  page.evaluate(() => {
    const v = window.__linien.verhalten;
    return { punkte: v.netz.punkte.map((p) => ({ x: p.x, y: p.y, s: p.sichtbar })), linien: v.netz.linien.map((l) => ({ zu: l.zu, punkte: l.punkte.slice(), stuecke: l.stuecke.map((s) => ({ ...s })), knick: (l.knick ?? []).slice() })) };
  });
const bilder = [];
const bild = async (titel, mitte = MITTE) => {
  if (!bildPfad) return;
  await page.evaluate(() => window.__linien.anstossen());
  await new Promise((r) => setTimeout(r, 80));
  const [cx, cy] = S(mitte);
  const png = await page.screenshot({ clip: { x: Math.max(0, Math.min(B - 340, cx - 170)), y: Math.max(0, Math.min(H - 300, cy - 150)), width: 340, height: 300 } });
  bilder.push({ titel, bild: png.toString('base64') });
};

// Bézier und Abstand zweier Kurvenzüge
const bez = (k, t) => {
  const u = 1 - t;
  return [u * u * u * k[0] + 3 * u * u * t * k[2] + 3 * u * t * t * k[4] + t * t * t * k[6], u * u * u * k[1] + 3 * u * u * t * k[3] + 3 * u * t * t * k[5] + t * t * t * k[7]];
};
const proben = (stuecke, n = 400) => stuecke.flatMap((k) => Array.from({ length: n + 1 }, (_, i) => bez(k, i / n)));
const linienStuecke = (st, li) => {
  const l = st.linien[li];
  return l.stuecke.map((s, i) => {
    const a = st.punkte[l.punkte[i]];
    const b = st.punkte[l.punkte[(i + 1) % l.punkte.length]];
    return [a.x, a.y, a.x + s.g1x, a.y + s.g1y, b.x + s.g2x, b.y + s.g2y, b.x, b.y];
  });
};
/** größter Abstand eines Punkts von A zum Polygon B */
const abstand = (A, Bp) => {
  let max = 0;
  for (const p of A) {
    let m = Infinity;
    for (let i = 0; i + 1 < Bp.length; i++) {
      const [ax, ay] = Bp[i];
      const vx = Bp[i + 1][0] - ax;
      const vy = Bp[i + 1][1] - ay;
      const l2 = vx * vx + vy * vy;
      const f = l2 > 0 ? Math.min(1, Math.max(0, ((p[0] - ax) * vx + (p[1] - ay) * vy) / l2)) : 0;
      m = Math.min(m, Math.hypot(p[0] - ax - vx * f, p[1] - ay - vy * f));
    }
    max = Math.max(max, m);
  }
  return max;
};

const aus = { kriterien: {} };
await page.evaluate(() => window.__linien.verhalten.stiftSchalten(true));

// 1 · Loop mit vier Punkten: P1 Klick, P2 gezogen, P3 gezogen und mit ⌥ gebrochen, P4 Klick, geschlossen mit Ziehen auf P1
const AUGE = [305, 150];
const P1 = [309, 176];
const P2 = [334, 203];
const P3 = [311, 230];
const P4 = [290, 203];
const G = 11;
await klick(P1);
await bild('1 · P: Klick setzt den ersten Punkt');
await hin([P2[0] - 6, P2[1] - 9]);
await bild('2 · der Faden folgt dem Zeiger');
// Faden vor dem Drücken und Linie danach
await hin(P2);
const faden = await page.evaluate(() => {
  const v = window.__linien.verhalten;
  const e = v.werk.entwurf();
  const [x, y] = v.gezeichnet();
  const F = v.werk.faden({ art: 'frei', x, y }, [0, 0]);
  return { x: Array.from(F.x), y: Array.from(F.y), e };
});
await page.mouse.down();
await warten(40);
const nachDruck = await stand();
const neueLinie = nachDruck.linien.length - 1;
const fadenAbw = abstand(
  faden.x.map((x, i) => [x, faden.y[i]]),
  proben(linienStuecke(nachDruck, neueLinie)),
);
{
  const [x, y] = S([P2[0], P2[1] + G]);
  await page.mouse.move(x, y, { steps: 10 });
  await warten(60);
}
await bild('3 · Ziehen: Griffe aus dem Punkt');
await page.mouse.up();
await warten();
await hin(P3);
await page.mouse.down();
await warten(40);
{
  const [x, y] = S([P3[0] - 8, P3[1] + 7]);
  await page.mouse.move(x, y, { steps: 10 });
  await warten(60);
  await page.keyboard.down('Alt');
  const [x2, y2] = S([P3[0] - 8, P3[1] - 7.5]);
  await page.mouse.move(x2, y2, { steps: 10 });
  await warten(60);
}
await bild('4 · mit ⌥: gebrochen');
await page.mouse.up();
await page.keyboard.up('Alt');
await warten();
await ziehen(P4, [0, -G]);
await hin([P1[0] + 1.2, P1[1] + 1.5]);
await bild('5 · am ersten Punkt der Ring');
await ziehen(P1, [7, 2]);
await page.evaluate(() => window.__linien.vorspulen(250));
await bild('6 · geschlossen, die Welle läuft');
await page.evaluate(() => window.__linien.vorspulen(900));
const nachLoop = await stand();
const li = nachLoop.linien.length - 1;
const L = nachLoop.linien[li];
// erwarteter Loop: genau die gezogenen Griffe
const ist = linienStuecke(nachLoop, li);
const P3ist = P3;
const soll = [
  [P1[0], P1[1], P1[0] + 7, P1[1] + 2, P2[0], P2[1] - G, P2[0], P2[1]],
  [P2[0], P2[1], P2[0], P2[1] + G, P3ist[0] + 8, P3ist[1] - 7, P3ist[0], P3ist[1]],
  [P3ist[0], P3ist[1], P3ist[0] - 8, P3ist[1] - 7.5, P4[0], P4[1] + G, P4[0], P4[1]],
  [P4[0], P4[1], P4[0], P4[1] - G, P1[0] - 7, P1[1] - 2, P1[0], P1[1]],
];
const abwLoop = Math.max(abstand(proben(soll), proben(ist)), abstand(proben(ist), proben(soll)));
if (process.env.ZEIGEN) console.error(JSON.stringify({ L, pts: L.punkte.map((p) => [nachLoop.punkte[p].x, nachLoop.punkte[p].y]), soll, ist: ist.map((k) => k.map((v) => +v.toFixed(3))), je: soll.map((k) => +abstand(proben([k]), proben(ist)).toFixed(4)) }));
const neuePunkte = L.punkte.length;
const kreuzungen = L.punkte.filter((p) => nachLoop.linien.some((l, lj) => lj !== li && l.punkte.includes(p))).length;
aus.kriterien.loop = {
  geschlossen: L.zu,
  punkte: neuePunkte,
  kreuzungen,
  ohneKreuzungen: neuePunkte - kreuzungen,
  abweichungGriffe: +abwLoop.toFixed(5),
  fadenGleichLinie: +fadenAbw.toFixed(5),
  bestanden: L.zu && abwLoop < 0.01 && fadenAbw < 0.01 && neuePunkte - kreuzungen === 4,
};

// 2 · Abzweigung von Punkt zu Punkt, an beiden Enden gezogen
const A = await page.evaluate(() => {
  const v = window.__linien.verhalten;
  // zwei sichtbare Punkte am Auge (54 und 61 wie im Konzept) und ihre Griffpaare
  return [54, 61].map((pi) => ({ pi, x: v.netz.punkte[pi].x, y: v.netz.punkte[pi].y }));
});
const vorAst = await stand();
const paar = (st, pi) =>
  st.linien.flatMap((l, li) =>
    l.punkte.flatMap((p, k) => {
      if (p !== pi) return [];
      const m = l.stuecke.length;
      const aus = l.zu || k < m ? l.stuecke[k % m] : null;
      const ein = l.zu || k > 0 ? l.stuecke[(k - 1 + m) % m] : null;
      return [{ li, aus: aus ? [aus.g1x, aus.g1y] : null, ein: ein ? [ein.g2x, ein.g2y] : null }];
    }),
  );
await ziehen([A[0].x, A[0].y], [-6, -5]);
await ziehen([A[1].x, A[1].y], [-5, 6]);
await page.evaluate(() => window.__linien.vorspulen(900));
const nachAst = await stand();
const ast = nachAst.linien[nachAst.linien.length - 1];
const altPaare = A.map((a) => JSON.stringify(paar(vorAst, a.pi)));
const neuPaare = A.map((a) => JSON.stringify(paar(nachAst, a.pi).filter((q) => q.li < vorAst.linien.length)));
const sA = ast.stuecke[0];
const sE = ast.stuecke[ast.stuecke.length - 1];
const astOk =
  ast.punkte[0] === A[0].pi &&
  ast.punkte[ast.punkte.length - 1] === A[1].pi &&
  !ast.zu &&
  Math.hypot(sA.g1x + 6, sA.g1y + 5) < 0.01 &&
  Math.hypot(sE.g2x - 5, sE.g2y + 6) < 0.01;
aus.kriterien.abzweigung = {
  haengtAnBeiden: ast.punkte[0] === A[0].pi && ast.punkte[ast.punkte.length - 1] === A[1].pi,
  griffAnfang: [sA.g1x, sA.g1y].map((v) => +v.toFixed(4)),
  griffEnde: [sE.g2x, sE.g2y].map((v) => +v.toFixed(4)),
  altePaareUnveraendert: altPaare[0] === neuPaare[0] && altPaare[1] === neuPaare[1],
  bestanden: astOk && altPaare[0] === neuPaare[0] && altPaare[1] === neuPaare[1],
};
await bild('7 · Abzweigung von Punkt zu Punkt, an beiden Enden gezogen', AUGE);

// 3 · frei, zwei Punkte, ↩ schließt; dann Esc mitten im Zeichnen
const Q1 = [345, 160];
const Q2 = [360, 172];
await klick(Q1);
await ziehen(Q2, [3, 6]);
await page.keyboard.press('Enter');
await page.evaluate(() => window.__linien.vorspulen(900));
const nachEnter = await stand();
const zuEnter = nachEnter.linien[nachEnter.linien.length - 1];
const vorEsc = await stand();
await klick([350, 185]);
await klick([362, 190]);
await klick([356, 198]);
await page.keyboard.press('Escape');
await warten(300);
const nachEsc = await stand();
aus.kriterien.enterUndEsc = {
  enterGeschlossen: zuEnter.zu && zuEnter.punkte.length >= 2,
  escWieVorher: JSON.stringify(nachEsc) === JSON.stringify(vorEsc),
  bestanden: zuEnter.zu && JSON.stringify(nachEsc) === JSON.stringify(vorEsc),
};

// 4 · Auswahl: Rahmen, ⇧ dazu, Ziehen, ⌫
await page.keyboard.press('v');
await warten();
const rahmen = [
  [296, 128],
  [330, 158],
];
const imRahmen = await page.evaluate(
  ([a, b]) => {
    const v = window.__linien.verhalten;
    return v.netz.punkte.flatMap((p, i) => (p.sichtbar && p.x >= a[0] && p.x <= b[0] && p.y >= a[1] && p.y <= b[1] ? [i] : []));
  },
  rahmen,
);
// der Rahmen beginnt im Leeren: nahe der Ecke eine Stelle ohne Ziel suchen
for (const [dx, dy] of [[0, 0], [-2, 0], [0, -2], [-2, -2], [-4, -1], [-1, -4], [-4, -4], [-6, -2], [-2, -6], [-6, -6]]) {
  await hin([rahmen[0][0] + dx, rahmen[0][1] + dy]);
  const frei = await page.evaluate(() => !window.__linien.verhalten.haengt);
  if (frei) break;
}
await page.mouse.down();
{
  const [x, y] = S(rahmen[1]);
  await page.mouse.move(x, y, { steps: 14 });
  await warten(80);
}
await bild('8 · Rahmen', AUGE);
await page.mouse.up();
await warten(300);
const gewaehlt1 = await page.evaluate(() => [...window.__linien.verhalten.auswahl].sort((a, b) => a - b));
// ⇧-Klick auf einen Punkt außerhalb
const aussen = await page.evaluate(
  ([a, b]) => {
    const v = window.__linien.verhalten;
    const i = v.netz.punkte.findIndex((p) => p.sichtbar && !(p.x >= a[0] - 6 && p.x <= b[0] + 6 && p.y >= a[1] - 6 && p.y <= b[1] + 6) && Math.hypot(p.x - 313, p.y - 150) < 40);
    return { i, x: v.netz.punkte[i].x, y: v.netz.punkte[i].y };
  },
  rahmen,
);
await hin([aussen.x, aussen.y]);
await page.keyboard.down('Shift');
await page.mouse.down();
await warten(40);
await page.mouse.up();
await page.keyboard.up('Shift');
await warten(300);
const gewaehlt2 = await page.evaluate(() => [...window.__linien.verhalten.auswahl].sort((a, b) => a - b));
await bild('9 · gewählt (Rahmen und ⇧-Klick)', AUGE);
// Ziehen an einem gewählten Punkt: alle gehen genau um den Mausweg mit
const vorZug = await stand();
const griffPunkt = gewaehlt2.find((p) => p !== aussen.i);
await hin([vorZug.punkte[griffPunkt].x, vorZug.punkte[griffPunkt].y]);
await page.mouse.down();
await warten(40);
const weg = [6, -4];
{
  const [x, y] = S([vorZug.punkte[griffPunkt].x + weg[0], vorZug.punkte[griffPunkt].y + weg[1]]);
  await page.mouse.move(x, y, { steps: 12 });
  await warten(80);
}
await page.mouse.up();
await warten(200);
const nachZug = await stand();
const zugAbw = Math.max(...gewaehlt2.map((p) => Math.hypot(nachZug.punkte[p].x - vorZug.punkte[p].x - weg[0], nachZug.punkte[p].y - vorZug.punkte[p].y - weg[1])));
// ⌫: die gewählten Punkte verschwinden, geschlossene Linien bleiben geschlossen
const zuVor = nachZug.linien.filter((l) => l.zu).length;
await page.keyboard.press('Backspace');
await warten(400);
const nachLoeschen = await stand();
const zuNach = nachLoeschen.linien.filter((l) => l.zu).length;
aus.kriterien.auswahl = {
  imRahmenSoll: imRahmen.length,
  rahmenGenau: JSON.stringify(gewaehlt1) === JSON.stringify(imRahmen),
  umschaltDazu: gewaehlt2.length === gewaehlt1.length + 1 && gewaehlt2.includes(aussen.i),
  zugAbweichung: +zugAbw.toFixed(5),
  punkteVorher: nachZug.punkte.length,
  punkteNachher: nachLoeschen.punkte.length,
  geschlosseneVorher: zuVor,
  geschlosseneNachher: zuNach,
  bestanden: JSON.stringify(gewaehlt1) === JSON.stringify(imRahmen) && gewaehlt2.includes(aussen.i) && zugAbw < 0.01 && zuNach === zuVor,
};
await bild('10 · ⌫: gelöscht, die Linie läuft weiter', AUGE);
// 5 · Feinheiten wie in Illustrator: ⇧ rastet den Griff in 45°, Leertaste verschiebt beim Ziehen den Punkt, Klick auf den letzten
// Punkt zieht seinen Griff ein; dann Esc
await page.keyboard.press('p');
await warten();
const F1 = [372, 205];
const F2 = [392, 214];
await klick(F1);
await hin(F2);
await page.mouse.down();
await warten(40);
await page.keyboard.down('Shift');
{
  // 30° gezogen, mit ⇧ 45°
  const L = 10;
  const [x, y] = S([F2[0] + L * Math.cos(Math.PI / 6), F2[1] + L * Math.sin(Math.PI / 6)]);
  await page.mouse.move(x, y, { steps: 8 });
  await warten(60);
}
const griff45 = await page.evaluate(() => window.__linien.verhalten.werk.entwurf().aus);
await page.keyboard.up('Shift');
await warten(60);
// Leertaste: der Punkt geht mit, der Griff bleibt
const vorLeer = await page.evaluate(() => {
  const v = window.__linien.verhalten;
  const e = v.werk.entwurf();
  return { p: { ...v.netz.punkte[e.letzter] }, aus: e.aus };
});
await page.keyboard.down('Space');
{
  const [x, y] = S([F2[0] + 10 * Math.cos(Math.PI / 6) + 4, F2[1] + 10 * Math.sin(Math.PI / 6) + 3]);
  await page.mouse.move(x, y, { steps: 8 });
  await warten(60);
}
await page.keyboard.up('Space');
const nachLeer = await page.evaluate(() => {
  const v = window.__linien.verhalten;
  const e = v.werk.entwurf();
  return { p: { ...v.netz.punkte[e.letzter] }, aus: e.aus };
});
await page.mouse.up();
await warten();
// Klick auf den letzten Punkt: sein Griff fließt in ihn zurück
await hin([nachLeer.p.x, nachLeer.p.y]);
await page.mouse.down();
await warten(40);
await page.mouse.up();
await warten(300);
const nachEinziehen = await page.evaluate(() => window.__linien.verhalten.werk.entwurf().aus);
await page.keyboard.press('Escape');
await warten(200);
const w45 = (Math.atan2(griff45[1], griff45[0]) * 180) / Math.PI;
const verschoben = [nachLeer.p.x - vorLeer.p.x, nachLeer.p.y - vorLeer.p.y];
aus.kriterien.feinheiten = {
  griffWinkel: +w45.toFixed(3),
  leertastePunkt: verschoben.map((v) => +v.toFixed(3)),
  leertasteGriffGleich: Math.hypot(nachLeer.aus[0] - vorLeer.aus[0], nachLeer.aus[1] - vorLeer.aus[1]) < 1e-6,
  eingezogen: nachEinziehen,
  bestanden:
    Math.abs(w45 - 45) < 1e-6 &&
    Math.hypot(verschoben[0] - 4, verschoben[1] - 3) < 0.01 &&
    Math.hypot(nachLeer.aus[0] - vorLeer.aus[0], nachLeer.aus[1] - vorLeer.aus[1]) < 1e-6 &&
    nachEinziehen[0] === 0 &&
    nachEinziehen[1] === 0,
};
aus.fehler = fehler;
console.log(JSON.stringify(aus, null, 1));

if (bildPfad) {
  const f = 1;
  const html = `<html><body style="margin:0;background:#fff;font:13px -apple-system,Helvetica,sans-serif;color:#1f1a17">
<div style="display:grid;grid-template-columns:repeat(5,${340 * f}px);gap:16px 12px;padding:14px">${bilder
    .map((t) => `<figure style="margin:0"><img src="data:image/png;base64,${t.bild}" style="width:${340 * f}px;height:${300 * f}px;border:1px solid #e4e0da;display:block"><figcaption style="margin-top:6px">${t.titel}</figcaption></figure>`)
    .join('')}</div></body></html>`;
  const p2 = await browser.newPage({ viewport: { width: 5 * 340 + 4 * 12 + 28, height: 800 }, deviceScaleFactor: 1 });
  await p2.setContent(html);
  await p2.screenshot({ path: bildPfad, fullPage: true });
}
await browser.close();
