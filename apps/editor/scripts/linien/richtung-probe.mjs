// Probe „Richtungen statt Griffe“ (Plan vom 15.11.2026, Nächste Schritte 1): an der Kreuzung aus den Konzeptbildern eine Richtung um
// 30° drehen, rund und geknickt; die Linie folgt dem Zeiger auf 0,1° genau, beim Drücken und Loslassen springt nichts. Dazu
// Einrasten, Doppelklick, Schwung, im Raum auf der Haut, mit ⇧ aus der Haut und spiegelgleich.
// Aufruf aus apps/editor, Server auf 5199: node scripts/linien/richtung-probe.mjs
import { chromium } from '@playwright/test';

const URL = process.env.URL ?? 'http://localhost:5199';
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1000, height: 640 }, deviceScaleFactor: 2 });
const fehler = [];
page.on('pageerror', (e) => fehler.push(String(e)));

// ---------- 2D an seinem Fisch: Kreuzung Punkt 55, Linie 2, Seite „aus“ ----------
await page.goto(`${URL}/linien.html`);
await page.waitForFunction(() => window.__linien);
const r2 = await page.evaluate(() => {
  const L = window.__linien;
  const v = L.verhalten;
  const a = L.ansicht;
  const PI = 55;
  const LI = 2;
  const grad = (w) => (w * 180) / Math.PI;
  const wd = (x, y) => {
    let d = x - y;
    while (d > 180) d -= 360;
    while (d <= -180) d += 360;
    return d;
  };
  const stelle = () => v.netz.linien[LI].punkte.indexOf(PI);
  const griff = (seite) => {
    const l = v.netz.linien[LI];
    const k = stelle();
    const m = l.punkte.length;
    const s = seite === 'aus' ? l.stuecke[k] : l.stuecke[(k - 1 + m) % m];
    return seite === 'aus' ? [s.g1x, s.g1y] : [s.g2x, s.g2y];
  };
  const w = (g) => grad(Math.atan2(g[1], g[0]));
  const len = (g) => Math.hypot(g[0], g[1]);
  const schirm = (x, y) => [x * a.z + a.ox, y * a.z + a.oy];
  const proben = () => v.proben.map((P) => Array.from(P.x).concat(Array.from(P.y)));
  const abw = (A, B) => {
    let m = 0;
    A.forEach((q, i) => q.forEach((x, j) => (m = Math.max(m, Math.abs(x - B[i][j])))));
    return m;
  };
  /** Zeiger auf die Nadel der Seite „aus“, 60 % ihrer Länge vom Punkt */
  const aufNadel = () => {
    const k = stelle();
    const P = v.proben[LI];
    const ziel = P.stueckS[k] + 0.6 * v.nadelLaenge(LI, k, 'aus');
    let best = 0;
    for (let i = 0; i < P.n; i++) if (Math.abs(P.s[i] - ziel) < Math.abs(P.s[best] - ziel)) best = i;
    v.zeigerWeg();
    v.tropfen = [];
    // die Probe läuft schneller als eine Hand: Zwei Drücke hintereinander wären sonst ein Doppelklick
    v.klick = null;
    L.vorspulen(400);
    const [sx, sy] = schirm(P.x[best], P.y[best]);
    L.zeigerHin(sx + 30, sy + 30, 16);
    L.vorspulen(100);
    for (let i = 1; i <= 10; i++) {
      L.zeigerHin(sx + 30 * (1 - i / 10), sy + 30 * (1 - i / 10), 16);
      L.vorspulen(16);
    }
    L.vorspulen(500);
    const t = v.tropfen.find((q) => q.zustand === 'folgt');
    return t ? t.ziel : null;
  };
  /** nach dem Drücken: den Zeiger so bewegen, dass die Spitze des Hebels um `grad` gedreht und auf `u`-fachen Abstand kommt */
  const drehenUm = (wGrad, u = 1) => {
    const sp = v.griff.spitze;
    const p = v.netz.punkte[PI];
    const dx = sp[0] - p.x;
    const dy = sp[1] - p.y;
    const c = Math.cos((wGrad * Math.PI) / 180);
    const s = Math.sin((wGrad * Math.PI) / 180);
    const zx = p.x + (c * dx - s * dy) * u;
    const zy = p.y + (s * dx + c * dy) * u;
    const [sx, sy] = schirm(v.griff.mx + zx - sp[0], v.griff.my + zy - sp[1]);
    L.zeigerHin(sx, sy, 16);
    L.vorspulen(700);
    // Zeiger und Spitze des Griffs: gezeichneter Zeiger = Maus + Versatz
    const gz = [v.zeiger.x + v.versatz.x, v.zeiger.y + v.versatz.y];
    return { zeigerAufSpitze: Math.hypot(gz[0] - zx, gz[1] - zy) };
  };
  const out = {};
  const ga0 = griff('aus');
  const ge0 = griff('ein');
  out.start = { knick: !!v.netz.linien[LI].knick?.[stelle()], fluchtGrad: +Math.abs(wd(w(ga0), w(ge0) + 180)).toFixed(2) };
  // 1. rund um 30°
  out.ziel = aufNadel();
  const vorher = proben();
  v.druecken();
  L.vorspulen(60);
  out.druck = { abweichung: abw(proben(), vorher) };
  const z1 = drehenUm(30);
  const ga1 = griff('aus');
  const ge1 = griff('ein');
  out.rund30 = {
    aus: +wd(w(ga1), w(ga0)).toFixed(3),
    ein: +wd(w(ge1), w(ge0)).toFixed(3),
    laenge: +(len(ga1) / len(ga0)).toFixed(4),
    zeigerAufSpitze: +z1.zeigerAufSpitze.toFixed(4),
  };
  const vorLos = proben();
  // seit dem 15.11. nachmittags (Florian): Der Zeiger bleibt nach dem Loslassen an der Spitze, statt zur Maus zurückzugleiten
  const zeigerVorLos = [v.zeiger.x + v.versatz.x, v.zeiger.y + v.versatz.y];
  v.loslassen();
  L.vorspulen(700);
  const zeigerNachLos = [v.zeiger.x + v.versatz.x, v.zeiger.y + v.versatz.y];
  out.los = {
    abweichung: abw(proben(), vorLos),
    zeigerBleibt: +Math.hypot(zeigerNachLos[0] - zeigerVorLos[0], zeigerNachLos[1] - zeigerVorLos[1]).toFixed(4),
    knick: !!v.netz.linien[LI].knick?.[stelle()],
  };
  v.rueckgaengig();
  out.zurueck = { aus: +wd(w(griff('aus')), w(ga0)).toFixed(4) };
  // 2. mit ⌥ geknickt um 30°
  aufNadel();
  v.druecken();
  L.vorspulen(60);
  v.alt = true;
  drehenUm(30);
  const ga2 = griff('aus');
  const ge2 = griff('ein');
  v.loslassen();
  v.alt = false;
  L.vorspulen(700);
  out.knick30 = { aus: +wd(w(ga2), w(ga0)).toFixed(3), ein: +wd(w(ge2), w(ge0)).toFixed(3), knick: !!v.netz.linien[LI].knick?.[stelle()] };
  // 3. Einrasten: die geknickte Richtung bis auf 3° zurück in die Flucht
  aufNadel();
  v.druecken();
  L.vorspulen(60);
  drehenUm(-27);
  v.loslassen();
  L.vorspulen(700);
  out.einrasten = { flucht: +Math.abs(wd(w(griff('aus')), w(griff('ein')) + 180)).toFixed(4), knick: !!v.netz.linien[LI].knick?.[stelle()] };
  // 4. Doppelklick: rund → Knick (nichts bewegt sich), dann geknickt gedreht, Doppelklick: rund, dreht sich in die Flucht
  aufNadel();
  const ga4 = griff('aus');
  v.druecken();
  v.loslassen();
  v.druecken();
  v.loslassen();
  L.vorspulen(800);
  out.doppel1 = { knick: !!v.netz.linien[LI].knick?.[stelle()], bewegt: +Math.abs(wd(w(griff('aus')), w(ga4))).toFixed(4) };
  aufNadel();
  v.druecken();
  L.vorspulen(60);
  drehenUm(25);
  v.loslassen();
  L.vorspulen(700);
  const vorDoppel = +Math.abs(wd(w(griff('aus')), w(griff('ein')) + 180)).toFixed(2);
  aufNadel();
  v.druecken();
  v.loslassen();
  v.druecken();
  v.loslassen();
  L.vorspulen(1500);
  out.doppel2 = { vorher: vorDoppel, flucht: +Math.abs(wd(w(griff('aus')), w(griff('ein')) + 180)).toFixed(4), knick: !!v.netz.linien[LI].knick?.[stelle()] };
  // 5. Schwung: am Ring bleibt er, auf 1,5-fachem Abstand wird er 1,4-fach
  aufNadel();
  const ga5 = griff('aus');
  v.druecken();
  L.vorspulen(60);
  drehenUm(0, 1.05);
  const l105 = len(griff('aus')) / len(ga5);
  drehenUm(0, 1.5);
  const l15 = len(griff('aus')) / len(ga5);
  v.loslassen();
  L.vorspulen(500);
  out.schwung = { amRing: +l105.toFixed(4), weit: +l15.toFixed(4) };
  return out;
});
console.log('2D', JSON.stringify(r2));

// ---------- Raum: teat firefish, Anker 3, Linie 1, Seite „aus“ ----------
await page.goto(`${URL}/raum.html`);
await page.waitForFunction(() => window.__raum && window.__raum.verhalten.netz.punkte.length > 0);
const r3 = await page.evaluate(() => {
  const Q = window.__raum;
  const v = Q.verhalten;
  const R = Q.raum;
  const ANKER = 3;
  const LI = 1;
  Q.vorspulen(1500);
  const lage = (arr, i) => ({ x: arr[i * 3], y: arr[i * 3 + 1], z: arr[i * 3 + 2] });
  const sub = (p, q) => ({ x: p.x - q.x, y: p.y - q.y, z: p.z - q.z });
  const dot = (p, q) => p.x * q.x + p.y * q.y + p.z * q.z;
  const len = (p) => Math.hypot(p.x, p.y, p.z);
  const grad = (w) => (w * 180) / Math.PI;
  const aufNadel = () => {
    const l = v.netz.linien[LI];
    const k = l.punkte.indexOf(ANKER);
    const P = v.proben[LI];
    const ziel = P.stueckS[k] + 0.6 * v.nadelLaenge(LI, k, 'aus');
    let best = 0;
    for (let i = 0; i < P.n; i++) if (Math.abs(P.s[i] - ziel) < Math.abs(P.s[best] - ziel)) best = i;
    v.zeigerWeg();
    v.tropfen = [];
    v.klick = null;
    Q.vorspulen(300);
    Q.zeigerHin(P.x[best] + 25, P.y[best] + 25, 16);
    Q.vorspulen(60);
    for (let i = 1; i <= 10; i++) {
      Q.zeigerHin(P.x[best] + 25 * (1 - i / 10), P.y[best] + 25 * (1 - i / 10), 16);
      Q.vorspulen(16);
    }
    Q.vorspulen(500);
    const t = v.tropfen.find((q) => q.zustand === 'folgt');
    return t ? t.ziel : null;
  };
  /** Zeiger so, dass die Spitze auf dem Ring um `w` Grad weiterliegt (Bildschirm) */
  const drehenUm = (wGrad) => {
    const D = R.dreh;
    const c = Math.cos((wGrad * Math.PI) / 180);
    const s = Math.sin((wGrad * Math.PI) / 180);
    const M = D.mitte ?? D.H;
    const T = { x: M.x + D.rho0 * (c * D.e1.x + s * D.e2.x), y: M.y + D.rho0 * (c * D.e1.y + s * D.e2.y), z: M.z + D.rho0 * (c * D.e1.z + s * D.e2.z) };
    const ts = R.schirm(T);
    Q.zeigerHin(v.griff.mx + ts[0] - v.griff.spitze[0], v.griff.my + ts[1] - v.griff.spitze[1], 16);
    Q.vorspulen(700);
  };
  /** Winkel einer Richtung um die Achse gegen ihre Lage vorher (Grad), ihr Anteil längs der Achse und ihre Länge */
  const um = (vorher, nachher, achse) => {
    const p0 = sub(vorher, { x: achse.x * dot(vorher, achse), y: achse.y * dot(vorher, achse), z: achse.z * dot(vorher, achse) });
    const p1 = sub(nachher, { x: achse.x * dot(nachher, achse), y: achse.y * dot(nachher, achse), z: achse.z * dot(nachher, achse) });
    const kr = { x: p0.y * p1.z - p0.z * p1.y, y: p0.z * p1.x - p0.x * p1.z, z: p0.x * p1.y - p0.y * p1.x };
    return { winkel: grad(Math.atan2(dot(kr, achse), dot(p0, p1))), achsAnteil: dot(nachher, achse) - dot(vorher, achse), laenge: len(nachher) / len(vorher) };
  };
  const out = {};
  out.ziel = aufNadel();
  const griffe0 = R.griffe.slice();
  v.kippen = false;
  v.druecken();
  Q.vorspulen(60);
  let m = 0;
  R.griffe.forEach((x, i) => (m = Math.max(m, Math.abs(x - griffe0[i]))));
  out.druck = { abweichung: m };
  const D = R.dreh;
  const H = D.H;
  const A0 = sub(D.A0, H);
  const P0 = sub(D.P0, H);
  const achse = D.achse;
  const armG = D.armG;
  const gegenG = D.gegenG;
  const armZw = D.armZw;
  out.ebene = { flach: D.flach, rundAmAnfang: !D.knick0 };
  drehenUm(30);
  const A1 = sub(lage(R.griffe, armG), H);
  const P1 = sub(lage(R.griffe, gegenG), H);
  // Bildschirm: Spitze des Griffs und gezeichneter Zeiger in derselben Richtung vom Punkt aus
  const B = R.drehBild();
  const gz = [v.zeiger.x + v.versatz.x, v.zeiger.y + v.versatz.y];
  const wSp = grad(Math.atan2(B.spitze[1] - B.nabe[1], B.spitze[0] - B.nabe[0]));
  const wZ = grad(Math.atan2(gz[1] - B.nabe[1], gz[0] - B.nabe[0]));
  const zw = armZw >= 0 ? lage(R.griffe, armZw) : null;
  const an = lage(R.griffe, armG);
  out.haut30 = {
    arm: um(A0, A1, achse),
    gegen: um(P0, P1, achse),
    bildschirmGrad: +(((wSp - wZ + 540) % 360) - 180).toFixed(4),
    spiegel: zw ? Math.max(Math.abs(zw.x - an.x), Math.abs(zw.y - an.y), Math.abs(zw.z + an.z)) : null,
  };
  v.loslassen();
  Q.vorspulen(600);
  R.rueckgaengig();
  // ⇧: aus der Haut kippen um 20°, schräg gesehen (in der Seite steht diese Ebene genau auf der Kante)
  R.zeigeAnsicht('schraeg');
  Q.vorspulen(3000);
  aufNadel();
  v.kippen = true;
  v.druecken();
  Q.vorspulen(60);
  const D2 = R.dreh;
  const n = D2.e2;
  const B0 = sub(D2.A0, D2.H);
  drehenUm(20);
  const B1 = sub(lage(R.griffe, D2.armG), D2.H);
  const zuN = (p) => grad(Math.acos(dot(p, n) / len(p)));
  out.kippen20 = { flach: D2.flach, winkelZurSenkrechten: +(zuN(B0) - zuN(B1)).toFixed(4), um: um(B0, B1, D2.achse) };
  v.loslassen();
  v.kippen = false;
  Q.vorspulen(500);
  R.rueckgaengig();
  // ⇧ während des Haltens (Florian, 15.11.): auf der Haut 20° drehen, ⇧ an (kein Sprung, der Ring schwenkt), 25° aus der Haut,
  // ⇧ aus (kein Sprung), 30° weiter: um die Senkrechte, die Neigung bleibt
  aufNadel();
  v.kippen = false;
  v.druecken();
  Q.vorspulen(60);
  const D4 = R.dreh;
  const nH = D4.n;
  const neigung = (p) => grad(Math.asin(dot(p, nH) / len(p)));
  const arm = () => sub(lage(R.griffe, D4.armG), D4.H);
  drehenUm(20);
  const K1 = arm();
  v.kippen = true;
  Q.vorspulen(16);
  const K2 = arm();
  const schwenk1 = R.dreh.schwenk ? R.dreh.schwenk.f.x : null;
  Q.vorspulen(80);
  const schwenk2 = R.dreh.schwenk ? R.dreh.schwenk.f.x : null;
  Q.vorspulen(500);
  const schwenkFertig = R.dreh.schwenk === null;
  const aufrecht = Math.abs(dot(R.dreh.achse, nH));
  drehenUm(25);
  const K3 = arm();
  v.kippen = false;
  Q.vorspulen(16);
  const K4 = arm();
  Q.vorspulen(500);
  drehenUm(30);
  const K5 = arm();
  const sprung = (p, q) => len(sub(p, q)) / R.radius;
  const quer = (p) => sub(p, { x: nH.x * dot(p, nH), y: nH.y * dot(p, nH), z: nH.z * dot(p, nH) });
  const azimut = (p, q) => {
    const a = quer(p);
    const b = quer(q);
    return grad(Math.acos(Math.min(1, Math.max(-1, dot(a, b) / (len(a) * len(b))))));
  };
  out.kippenDynamisch = {
    sprungBeiShift: sprung(K1, K2),
    schwenk: [schwenk1, schwenk2, schwenkFertig],
    ringAchseZurSenkrechten: +aufrecht.toFixed(4),
    neigungVorher: +neigung(K2).toFixed(3),
    neigungMitShift: +neigung(K3).toFixed(3),
    sprungBeiLoslassen: sprung(K3, K4),
    neigungDanach: +neigung(K5).toFixed(3),
    azimutDanach: +azimut(K4, K5).toFixed(3),
  };
  out.kippenDynamisch.bestanden =
    out.kippenDynamisch.sprungBeiShift < 1e-6 &&
    out.kippenDynamisch.sprungBeiLoslassen < 1e-6 &&
    schwenk1 !== null && schwenk1 > 0 && schwenk1 < 1 && schwenk2 > schwenk1 && schwenkFertig &&
    aufrecht < 0.01 &&
    Math.abs(out.kippenDynamisch.neigungMitShift - out.kippenDynamisch.neigungVorher) > 10 &&
    Math.abs(out.kippenDynamisch.neigungDanach - out.kippenDynamisch.neigungMitShift) < 0.5 &&
    out.kippenDynamisch.azimutDanach > 10;
  v.loslassen();
  Q.vorspulen(500);
  R.rueckgaengig();
  // ⌥: geknickt um 30°, dann Einrasten
  aufNadel();
  v.druecken();
  Q.vorspulen(60);
  v.alt = true;
  drehenUm(30);
  const D3 = R.dreh;
  const C1 = sub(lage(R.griffe, D3.gegenG), D3.H);
  out.knick30 = { arm: um(sub(D3.A0, D3.H), sub(lage(R.griffe, D3.armG), D3.H), D3.achse).winkel, gegen: um(sub(D3.P0, D3.H), C1, D3.achse).winkel };
  v.loslassen();
  v.alt = false;
  Q.vorspulen(600);
  out.knick30.knick = R.knick[LI][v.netz.linien[LI].punkte.indexOf(ANKER)];
  return out;
});
console.log('Raum', JSON.stringify(r3));
console.log('Fehler', JSON.stringify(fehler));
await browser.close();
