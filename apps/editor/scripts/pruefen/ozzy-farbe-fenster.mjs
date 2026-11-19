// Ozzy, Paint-Modus, Etappe 1 (19.11.2026; Plan docs/plans/2026-11-19-ozzy-paint-modus.md, Abschnitt 3.1): der Beweis. Florian: „Im
// paint mode will ich mit gewohnten tools linien auf die haut einzeichnen. […] Die flächen zwischen den linien kann ich dann […]
// einfärben und sie haben dann eine harte kante“. An einer frischen Kugel mit vier Linien (Mitte, drei Ringe).
// Kriterien (wie im Plan vorher festgelegt):
//   0  Bedienung: B schaltet den Paint-Modus; P zeichnet (eingerastet in der Seite, sechs Klicks, auf dem ersten geschlossen) eine
//      Farblinie auf die Haut, keine Linie der Form; ein Klick auf die Form im Raum füllt ihr Inneres; die Farbe steht auf Wachs
//      und auf dem hellen Solid.
//   1  Scharf bei jedem Zoom: Die Kante der Farbfläche ist bei 1-, 2- und 4-facher Vergrößerung (weiter zoomt Ozzy nicht) und auf
//      der Anzeige im Zug höchstens 1,5 Gerätepunkte breit (von 10 % bis 90 % des Übergangs) und liegt höchstens einen halben
//      Gerätepunkt neben der gezeichneten Kurve.
//   2  Bleibt auf der Haut: einen Punkt der Form weit ziehen und wieder zurück: Die Farblinien liegen danach höchstens 0,5 Einheiten
//      neben ihrer Lage davor. Fern vom Zug bewegt sich die Bemalung nicht weiter als die Haut dort. Bei keinem Netzwechsel liegt
//      ein Ort weiter als 0,5 Einheiten neben der neuen Haut.
//   3  Formt nicht: Nach jedem Handgriff am Bemalen ist die Form des Werks Zahl für Zahl dieselbe (Prüfsumme über Lagen, Dreiecke
//      und Linien). (Zwei Läufe im Fenster lassen sich nicht Zahl für Zahl vergleichen: Die Runden je Bild hängen an der Uhr.)
//   4  Tempo: Beim Ziehen an der Form kostet die Bemalung im Median höchstens 1 ms je Bild; beim Drehen kostet kein Bild über
//      16,7 ms und keines fällt aus.
//   5  Sichern, Laden, ⌘Z: ⌘Z nimmt Füllung, Zug an der Form und Farblinie in der Reihenfolge zurück, in der sie geschahen; nach
//      Sichern und Laden liegt die Farblinie an derselben Stelle.
//   6  Keine Fehler in der Konsole.
// Wie gemessen wird:
//   Kante: alle Bildpunkte der Zeichenfläche der Haut in einem Streifen um die Farblinie, jeder mit seinem Abstand von ihr und seinem
//   Wert zwischen den zwei Farben beiderseits (in linearem Licht); daraus das Profil quer zur Kante (in Stufen von einem Viertel
//   Gerätepunkt), für die ganze Farblinie und für jedes ihrer sechs Stücke. Kein Bildpunkt wird dafür gemischt: Eine Messung, die
//   zwischen Bildpunkten mittelt, zeichnet selbst weich (die erste Fassung der Probe las so 1,3 bis 1,9 Gerätepunkte).
//   Fern vom Zug: Ohne den dritten Ring gibt es an dieser Kugel keinen fernen Ort (jeder Ring hat dann nur drei Punkte, ein Zug am
//   Scheitel bewegt die Haut überall: 37 Einheiten am anderen Ende). Mit ihm liegt die zweite Farblinie hinter einer Linie, die der
//   Zug nicht bewegt. Gemessen wird, wie weit sich ihre Orte bewegen und wie weit die Haut dort (Abstand der alten Lagen von der
//   Haut im Zug).
// Aufruf aus apps/editor: GPU=1 OZZY_URL=http://localhost:5215/ozzy.html node scripts/pruefen/ozzy-farbe-fenster.mjs [ordner für Bilder]
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { auf, kugelMitRingen, quantil, seitenPunkt } from './ozzy-teile.mjs';

const ordner = process.argv[2] ?? '';
/** so weit wird der Punkt der Form gezogen (Einheiten des Werks); `WEITE=15` für einen kleinen Zug */
const WEITE = Number(process.env.WEITE ?? 55);
const ablage = fileURLToPath(new URL('../../../../wesen/', import.meta.url));
const PROBE = 'ozzy-probe-farbe';
const datei = `${ablage}${PROBE}.eewesen`;
if (fs.existsSync(datei)) fs.unlinkSync(datei);

const t = await auf({ extra: 'ohneLinie=0&material=wachs' });
const { browser, s, O, geladen, ruhig, klick, fehler } = t;
let schlecht = 0;
const ok = (name, gut, text = '') => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};
const z2 = (x) => (Number.isFinite(x) ? x.toFixed(2).replace('.', ',') : '–');
const bild = async (name) => {
  if (ordner) fs.writeFileSync(`${ordner}/ozzy-farbe-${name}.png`, await s.screenshot());
};
/** eine Zeichenfläche allein (ohne die Linien darüber), gleich nach einem gerechneten Bild */
const flaecheBild = (id = 'haut') =>
  s.evaluate((id2) => {
    const o = window.__ozzy;
    o.film(true);
    o.bild(1 / 60);
    const d = document.getElementById(id2).toDataURL('image/png');
    o.film(false);
    return d;
  }, id);
/** die Farbe einer Zeichenfläche an einer Stelle des Bilds (CSS-Pixel) */
const farbeBei = async (x, y, id = 'haut') =>
  s.evaluate(
    async ({ d, x, y }) => {
      const b = await createImageBitmap(await (await fetch(d)).blob());
      const c = new OffscreenCanvas(b.width, b.height);
      const g = c.getContext('2d');
      g.drawImage(b, 0, 0);
      const k = b.width / window.innerWidth;
      return Array.from(g.getImageData(Math.round(x * k), Math.round(y * k), 1, 1).data.slice(0, 4));
    },
    { d: await flaecheBild(id), x, y },
  );
/** die Farbe im Bild des Fensters (alle Zeichenflächen übereinander) an einer Stelle (CSS-Pixel) */
const schirmFarbe = async (x, y) => {
  const png = await s.screenshot({ clip: { x: Math.round(x) - 2, y: Math.round(y) - 2, width: 5, height: 5 } });
  return s.evaluate(async (b64) => {
    const b = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob());
    const c = new OffscreenCanvas(b.width, b.height);
    const g = c.getContext('2d');
    g.drawImage(b, 0, 0);
    return Array.from(g.getImageData(Math.floor(b.width / 2), Math.floor(b.height / 2), 1, 1).data.slice(0, 3));
  }, png.toString('base64'));
};
/** im Bild des Fensters um eine Stelle (CSS-Pixel): der dunkelste Bildpunkt nah an ihr (bis 2 Gerätepunkte) und der hellste im Ausschnitt */
const schirmHellDunkel = async (x, y) => {
  const png = await s.screenshot({ clip: { x: Math.round(x) - 5, y: Math.round(y) - 5, width: 10, height: 10 } });
  return s.evaluate(
    async ({ b64, fx, fy }) => {
      const b = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob());
      const c = new OffscreenCanvas(b.width, b.height);
      const g = c.getContext('2d');
      g.drawImage(b, 0, 0);
      const D = g.getImageData(0, 0, b.width, b.height).data;
      const k = b.width / 10;
      let hell = 0;
      let dunkel = 255;
      for (let v = 0; v < b.height; v++)
        for (let u = 0; u < b.width; u++) {
          const w = D[4 * (v * b.width + u) + 1];
          hell = Math.max(hell, w);
          if (Math.hypot(u + 0.5 - (5 + fx) * k, v + 0.5 - (5 + fy) * k) <= 2.5) dunkel = Math.min(dunkel, w);
        }
      return { hell, dunkel };
    },
    { b64: png.toString('base64'), fx: x - Math.round(x), fy: y - Math.round(y) },
  );
};
/** die Farblinie `nr` im Bild (CSS-Pixel) und ihre Mitte */
const imBild = async (nr = 0) => {
  const P = await O('farbLinieImBild', nr);
  return { P, mx: P.reduce((a, p) => a + p.x, 0) / P.length, my: P.reduce((a, p) => a + p.y, 0) / P.length };
};
/** die Orte der Farblinie `nr` auf der gezeigten Haut, in Einheiten des Werks */
const lagen = async (nr) => {
  const f = (await O('werk')).f;
  return (await O('farbLinieImRaum', nr)).map((p) => [p[0] * f, p[1] * f, p[2] * f]);
};
/** die Orte der Farblinie `nr` auf dem Rechennetz (Einheiten des Werks): Zahl für Zahl, was gespeichert ist */
const lagenNetz = async (nr) => {
  const L = (await O('farbe')).lagen[nr] ?? [];
  const aus = [];
  for (let i = 0; i + 2 < L.length; i += 3) aus.push([L[i], L[i + 1], L[i + 2]]);
  return aus;
};
const weg = (A, B) => {
  let g = 0;
  for (let i = 0; i < Math.min(A.length, B.length); i++) g = Math.max(g, Math.hypot(A[i][0] - B[i][0], A[i][1] - B[i][1], A[i][2] - B[i][2]));
  return A.length === B.length ? g : Infinity;
};

await kugelMitRingen(t);
// ein dritter Ring, quer bei x = −45: Hinter ihm bewegt ein Zug am Scheitel die Linien nicht
await s.keyboard.press('1');
await s.waitForTimeout(1700);
await ruhig();
await s.keyboard.press('p');
for (const Y of [-250, 250]) {
  const q = await O('flaecheHin', 'seite', -45, Y);
  await klick(q.x, q.y);
}
await s.keyboard.press('Enter');
await ruhig();
await s.keyboard.press('a');
await s.waitForTimeout(400);
const summe0 = await O('werkSumme');
const linienVorher = (await O('werk')).linien;

// ---------- 0 Bedienung ----------
await s.keyboard.press('b');
await s.waitForTimeout(400);
const an = await O('malen');
// P in der eingerasteten Seite: ein Sechseck um (58; −46) im Blatt, auf dem ersten Punkt geschlossen (auf ganzen Bildpunkten
// geklickt: Der Browser meldet der Maus nur ganze; und mit Abstand zu den Ringen: Dicht an einer Linie der Form rastet der Zeiger
// wie immer auf sie ein, der Punkt liegt dann dort, wo der Zeiger steht, nicht unter der Maus)
await s.keyboard.press('p');
await s.waitForTimeout(300);
const M = { X: 58, Y: -46, r: 36 };
const klicks = [];
for (let i = 0; i < 6; i++) {
  const q = await O('flaecheHin', 'seite', M.X + M.r * Math.cos((i * Math.PI) / 3), M.Y + M.r * Math.sin((i * Math.PI) / 3));
  klicks.push([Math.round(q.x), Math.round(q.y)]);
}
for (const [x, y] of [...klicks, klicks[0]]) await klick(x, y);
await s.mouse.move(40, 20);
await s.waitForTimeout(600);
await bild('0-seite-gezeichnet');
// die Farblinie ist in der Seite zu sehen: an der Mitte jeder Seite des Sechsecks steht ein Strich (dunkler als das Blatt daneben)
let striche = 0;
for (let i = 0; i < 6; i++) {
  const [ax, ay] = klicks[i];
  const [bx, by] = klicks[(i + 1) % 6];
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2;
  const l = Math.hypot(bx - ax, by - ay);
  void l;
  // ein Ausschnitt um die Mitte der Seite: Die Linie ist fein (ein Viertel bis einen halben Bildpunkt breit) und dunkelt das Blatt
  // dort, wo sie läuft; daneben ist es hell
  const r = await schirmHellDunkel(mx, my);
  if (r.hell - r.dunkel > 12) striche++;
}
const f0 = await O('farbe');
const nachP = (await O('werk')).linien;
// die Orte der Farblinie im Bild der Seite gegen das Sechseck der Klicks (CSS-Pixel), und der Maßstab der Seite
const inSeite = await O('farbLinieImBild', 0);
const abstandVomSechseck = (x, y) => {
  let d = Infinity;
  for (let i = 0; i < 6; i++) {
    const [ax, ay] = klicks[i];
    const [bx, by] = klicks[(i + 1) % 6];
    const u = Math.min(1, Math.max(0, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2)));
    d = Math.min(d, Math.hypot(x - ax - u * (bx - ax), y - ay - u * (by - ay)));
  }
  return d;
};
const nebenCss = inSeite.length ? Math.max(...inSeite.map((q) => abstandVomSechseck(q.x, q.y))) : NaN;
const s0 = await O('flaecheHin', 'seite', 0, 0);
const s1 = await O('flaecheHin', 'seite', 100, 0);
const seiteJeEinheit = Math.hypot(s1.x - s0.x, s1.y - s0.y) / 100;
/** so weit liegen die Orte neben der gezeichneten Kurve, in Einheiten des Werks */
const nebenEinheiten = nebenCss / seiteJeEinheit;
await s.keyboard.press('a');
await s.waitForTimeout(200);
await s.keyboard.press('0');
await s.waitForTimeout(1900);
await s.mouse.move(40, 20);
await s.waitForTimeout(400);
// im Raum füllt ein Klick in die Mitte der Farblinie
const A0 = await imBild(0);
const farbeDavor = (await O('farbe')).fuellungen;
await klick(A0.mx, A0.my);
await s.waitForTimeout(500);
const f1 = await O('farbe');
// die Farbe an der Stelle des Klicks: gelb, also Rot und Grün weit über Blau (auf Wachs mit seinem Licht)
const c1 = await farbeBei(A0.mx, A0.my);
await s.mouse.move(40, 20);
await s.waitForTimeout(300);
await bild('1-raum-gefuellt');
// dasselbe auf dem hellen Solid (aus dem Bild des Fensters gelesen: Seine Zeichenfläche gibt ihr Bild nicht her); daneben,
// außerhalb der Farblinie, steht keine Farbe
await O('material', 'Helles Solid');
await s.waitForTimeout(1500);
const c2 = await schirmFarbe(A0.mx, A0.my);
const c2aussen = await schirmFarbe(A0.mx + 1.6 * (A0.P[0].x - A0.mx), A0.my + 1.6 * (A0.P[0].y - A0.my));
await bild('1b-helles-solid');
await O('material', 'Wachs');
await s.waitForTimeout(900);
ok(
  '0 B schaltet den Paint-Modus, P zeichnet eine Farblinie (keine Linie der Form), ein Klick füllt, auf Wachs und auf dem hellen Solid',
  an && f0.linien === 1 && f0.orte > 30 && nachP === linienVorher && striche === 6 && f1.fuellungen === farbeDavor + 1 && f1.zeigt && c1[0] > c1[2] + 60 && c1[1] > c1[2] + 40 && c2[0] > c2[2] + 60 && c2[1] > c2[2] + 40 && Math.abs(c2aussen[0] - c2aussen[2]) < 40,
  `Paint-Modus ${an}; Farblinien ${f0.linien} (${f0.orte} Orte), Linien der Form ${linienVorher} → ${nachP}; in der Seite steht sie als Strich an ${striche} von 6 Seiten des Sechsecks; Füllungen ${farbeDavor} → ${f1.fuellungen}; Farbe am Klick auf Wachs ${c1.slice(0, 3).join(', ')}, auf dem hellen Solid ${c2.slice(0, 3).join(', ')} (daneben ${c2aussen.slice(0, 3).join(', ')}); Anzeige: ${f1.anzeige.innen} Dreiecke innen, ${f1.anzeige.rand} am Rand, ${f1.anzeige.ketten} Ketten`,
);

// ---------- 3 formt nicht (erster Teil): nach Zeichnen und Füllen ist die Form dieselbe ----------
const summe1 = await O('werkSumme');

// ---------- 1 scharf bei jedem Zoom ----------
// (Paint-Modus aus: Dann steht die Farblinie selbst nicht im Bild, nur die Kante der Fläche)
await s.keyboard.press('b');
await s.waitForTimeout(400);
/** das Profil quer zur Kante der Farbfläche an der Farblinie 0: Breite (10 % bis 90 %) und Lage (50 %) in Gerätepunkten */
const kanteMessen = async () => {
  const P = await O('farbLinieImBild', 0);
  const f = (await O('werk')).f;
  const R = (await O('farbLinieImRaum', 0)).map((q) => [q[0] * f, q[1] * f, q[2] * f]);
  return s.evaluate(
    async ({ d, P, R }) => {
      const b = await createImageBitmap(await (await fetch(d)).blob());
      const W = b.width;
      const H = b.height;
      const c = new OffscreenCanvas(W, H);
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(b, 0, 0);
      const D = g.getImageData(0, 0, W, H).data;
      const k = W / window.innerWidth;
      const lin = new Float32Array(256);
      for (let i = 0; i < 256; i++) {
        const v = i / 255;
        lin[i] = v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      }
      const n = P.length;
      const X = P.map((q) => q.x * k);
      const Y = P.map((q) => q.y * k);
      // Gerätepunkte je Einheit des Werks an der Farblinie (wo sie quer zum Blick läuft: das obere Zehntel der Strecken)
      const jeEinheit = [];
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const l3 = Math.hypot(R[j][0] - R[i][0], R[j][1] - R[i][1], R[j][2] - R[i][2]);
        if (l3 > 1e-6) jeEinheit.push(Math.hypot(X[j] - X[i], Y[j] - Y[i]) / l3);
      }
      jeEinheit.sort((a, b2) => a - b2);
      // Ecken der Farblinie auslassen (dort gibt es kein „quer zur Kante“)
      const aus = new Uint8Array(n);
      for (let i = 0; i < n; i++) {
        const a = (i - 1 + n) % n;
        const e = (i + 1) % n;
        const w = Math.abs(Math.atan2((X[i] - X[a]) * (Y[e] - Y[i]) - (Y[i] - Y[a]) * (X[e] - X[i]), (X[i] - X[a]) * (X[e] - X[i]) + (Y[i] - Y[a]) * (Y[e] - Y[i])));
        if (w > (12 * Math.PI) / 180) for (let q = -2; q <= 1; q++) aus[(i + q + n) % n] = 1;
      }
      // je Bildpunkt im Streifen: die nächste Strecke, der Abstand mit Vorzeichen
      let x0 = Infinity;
      let x1 = -Infinity;
      let y0 = Infinity;
      let y1 = -Infinity;
      for (let i = 0; i < n; i++) {
        x0 = Math.min(x0, X[i]);
        x1 = Math.max(x1, X[i]);
        y0 = Math.min(y0, Y[i]);
        y1 = Math.max(y1, Y[i]);
      }
      const RAND = 7;
      x0 = Math.max(0, Math.floor(x0) - RAND);
      y0 = Math.max(0, Math.floor(y0) - RAND);
      x1 = Math.min(W - 1, Math.ceil(x1) + RAND);
      y1 = Math.min(H - 1, Math.ceil(y1) + RAND);
      const bw = Math.max(1, x1 - x0 + 1);
      const bh = Math.max(1, y1 - y0 + 1);
      const dist = new Float32Array(bw * bh).fill(1e9);
      const quer = new Float32Array(bw * bh);
      const seg = new Int32Array(bw * bh).fill(-1);
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const ex = X[j] - X[i];
        const ey = Y[j] - Y[i];
        const l2 = ex * ex + ey * ey;
        if (l2 < 1e-9) continue;
        const l = Math.sqrt(l2);
        const u0 = Math.max(x0, Math.floor(Math.min(X[i], X[j]) - RAND));
        const u1 = Math.min(x1, Math.ceil(Math.max(X[i], X[j]) + RAND));
        const v0 = Math.max(y0, Math.floor(Math.min(Y[i], Y[j]) - RAND));
        const v1 = Math.min(y1, Math.ceil(Math.max(Y[i], Y[j]) + RAND));
        for (let y = v0; y <= v1; y++)
          for (let x = u0; x <= u1; x++) {
            const px = x + 0.5 - X[i];
            const py = y + 0.5 - Y[i];
            const u = (px * ex + py * ey) / l2;
            // (nur Bildpunkte, die quer vor der Strecke liegen, nicht vor einem ihrer Enden)
            if (u < 0 || u > 1) continue;
            const q = (ex * py - ey * px) / l;
            const o = (y - y0) * bw + (x - x0);
            if (Math.abs(q) < dist[o]) {
              dist[o] = Math.abs(q);
              quer[o] = q;
              seg[o] = i;
            }
          }
      }
      // die zwei Farben beiderseits, je Strecke (aus den Bildpunkten 3 bis 5,5 neben der Kante), über sieben Strecken gemittelt
      const sum = [new Float64Array(4 * n), new Float64Array(4 * n)];
      for (let o = 0; o < seg.length; o++) {
        const i = seg[o];
        if (i < 0 || aus[i]) continue;
        const a = Math.abs(quer[o]);
        if (a < 3 || a > 5.5) continue;
        const p = 4 * ((Math.floor(o / bw) + y0) * W + (o % bw) + x0);
        const S = sum[quer[o] > 0 ? 1 : 0];
        S[4 * i] += lin[D[p]];
        S[4 * i + 1] += lin[D[p + 1]];
        S[4 * i + 2] += lin[D[p + 2]];
        S[4 * i + 3] += 1;
      }
      const farbe = (seite, i) => {
        const r = [0, 0, 0, 0];
        for (let q = -3; q <= 3; q++) {
          const j = (i + q + n) % n;
          if (aus[j]) continue;
          for (let c2 = 0; c2 < 4; c2++) r[c2] += sum[seite][4 * j + c2];
        }
        return r[3] >= 6 ? [r[0] / r[3], r[1] / r[3], r[2] / r[3]] : null;
      };
      const bezug = [];
      let stellen = 0;
      for (let i = 0; i < n; i++) {
        const c0 = aus[i] ? null : farbe(0, i);
        const c1 = aus[i] ? null : farbe(1, i);
        if (!c0 || !c1) {
          bezug.push(null);
          continue;
        }
        const dc = [c1[0] - c0[0], c1[1] - c0[1], c1[2] - c0[2]];
        const l2 = dc[0] ** 2 + dc[1] ** 2 + dc[2] ** 2;
        // (nur, wo beiderseits wirklich zwei Farben stehen)
        if (l2 < 0.05 ** 2) {
          bezug.push(null);
          continue;
        }
        bezug.push({ c0, dc, l2 });
        stellen++;
      }
      // das Profil: Wert (0 … 1) über dem Abstand, in Stufen von einem Viertel Gerätepunkt; gesamt und je Sechstel der Farblinie
      const STUFE = 0.25;
      const WEIT = 2.5;
      const NB = Math.round((2 * WEIT) / STUFE);
      const G = 6;
      const S = new Float64Array((G + 1) * NB);
      const Z = new Float64Array((G + 1) * NB);
      for (let o = 0; o < seg.length; o++) {
        const i = seg[o];
        if (i < 0) continue;
        const B = bezug[i];
        if (!B) continue;
        const q = quer[o];
        if (Math.abs(q) >= WEIT) continue;
        const p = 4 * ((Math.floor(o / bw) + y0) * W + (o % bw) + x0);
        const v = ((lin[D[p]] - B.c0[0]) * B.dc[0] + (lin[D[p + 1]] - B.c0[1]) * B.dc[1] + (lin[D[p + 2]] - B.c0[2]) * B.dc[2]) / B.l2;
        const nb = Math.min(NB - 1, Math.floor((q + WEIT) / STUFE));
        const gr = Math.min(G - 1, Math.floor((i * G) / n));
        S[gr * NB + nb] += v;
        Z[gr * NB + nb] += 1;
        S[G * NB + nb] += v;
        Z[G * NB + nb] += 1;
      }
      const profil = (gr) => {
        const f2 = [];
        let zahl = 0;
        for (let nb = 0; nb < NB; nb++) {
          zahl += Z[gr * NB + nb];
          f2.push(Z[gr * NB + nb] > 0 ? S[gr * NB + nb] / Z[gr * NB + nb] : NaN);
        }
        const bei = (ziel) => {
          for (let nb = 1; nb < NB; nb++) {
            const a = f2[nb - 1];
            const e = f2[nb];
            if (!(a < ziel) || !(e >= ziel)) continue;
            return -WEIT + (nb - 0.5) * STUFE + (STUFE * (ziel - a)) / (e - a);
          }
          return NaN;
        };
        return { zahl, breite: bei(0.9) - bei(0.1), lage: bei(0.5), werte: f2.map((v) => Math.round(v * 100) / 100) };
      };
      const gruppen = [];
      for (let gr = 0; gr < G; gr++) gruppen.push(profil(gr));
      return { stellen, gesamt: profil(G), gruppen, jeEinheit: jeEinheit[Math.floor(0.9 * jeEinheit.length)] ?? NaN };
    },
    { d: await flaecheBild('haut'), P, R },
  );
};
/** was eine Messung der Kante ergibt: die breiteste und die am weitesten daneben liegende Stelle (Stücke mit genug Bildpunkten) */
const kanteLesen = (r) => {
  const G = r.gruppen.filter((g) => g.zahl >= 300 && Number.isFinite(g.breite) && Number.isFinite(g.lage));
  return {
    stuecke: G.length,
    breite: r.gesamt.breite,
    breiteGroesst: G.length ? Math.max(...G.map((g) => g.breite)) : NaN,
    lage: Math.abs(r.gesamt.lage),
    lageGroesst: G.length ? Math.max(...G.map((g) => Math.abs(g.lage))) : NaN,
    // so weit liegen die Orte selbst neben der gezeichneten Kurve, in Gerätepunkten dieses Bilds
    kurve: nebenEinheiten * r.jeEinheit,
    werte: r.gesamt.werte,
  };
};
const zoomAuf = async (ziel) => {
  for (let n = 0; n < 40; n++) {
    const z = (await O('blick')).zoom;
    if (Math.abs(Math.log(ziel / z)) < 0.005) break;
    // (das Rad zoomt um den Zeiger: auf die Mitte der Farblinie)
    const A = await imBild(0);
    await s.mouse.move(A.mx, A.my);
    await s.waitForTimeout(60);
    await s.mouse.wheel(0, Math.max(-240, Math.min(240, (-Math.log(ziel / z) / 0.0015) * 2)));
    await s.waitForTimeout(140);
  }
  await s.waitForTimeout(1500);
  await ruhig().catch(() => undefined);
  await s.mouse.move(40, 20);
  await s.waitForTimeout(500);
  return (await O('blick')).zoom;
};
await s.keyboard.press('Home');
await s.waitForTimeout(900);
const kanten = [];
for (const faktor of [1, 2, 4]) {
  const zoom = await zoomAuf(faktor);
  const r = kanteLesen(await kanteMessen());
  if (faktor === 4) await bild('2-kante-vierfach');
  kanten.push({ ...r, zoom, stufen: (await O('werk')).stufen });
}
await zoomAuf(1);
await s.keyboard.press('Home');
await s.waitForTimeout(900);
const kanteGut = (k) => k.stuecke >= 4 && k.breiteGroesst <= 1.5 && k.lageGroesst + k.kurve <= 0.5;
const kanteText = (k) => `Breite ${z2(k.breite)} (breitestes Stück ${z2(k.breiteGroesst)}), neben der Farblinie ${z2(k.lage)} (höchstens ${z2(k.lageGroesst)}), die Farblinie neben der gezeichneten Kurve ${z2(k.kurve)}`;

// ---------- 2 bleibt auf der Haut ----------
// eine zweite Farblinie fern vom Zug, hinter dem dritten Ring
const kreis = (mx, my, r) => {
  const g = 0.5523 * r;
  return [
    { X: mx + r, Y: my, aus: [0, g] },
    { X: mx, Y: my + r, aus: [-g, 0] },
    { X: mx - r, Y: my, aus: [0, -g] },
    { X: mx, Y: my - r, aus: [g, 0] },
  ];
};
// (mit P und echten Klicks an der Wand der Seite im Raum: ein Achteck um (−105; 32), mit Abstand zu den Linien der Form)
await O('malen', true);
await s.waitForTimeout(300);
await s.keyboard.press('p');
await s.waitForTimeout(300);
const wand = [];
for (let i = 0; i < 8; i++) {
  const q = await O('flaecheHin', 'seite', -105 + 18 * Math.cos((i * Math.PI) / 4), 32 + 18 * Math.sin((i * Math.PI) / 4));
  wand.push([q.x, q.y]);
}
for (const [x, y] of [...wand, wand[0]]) await klick(x, y);
await s.waitForTimeout(400);
await s.keyboard.press('a');
await s.waitForTimeout(200);
const anDerWand = (await O('farbe')).linien;
await s.mouse.move(40, 20);
await s.waitForTimeout(400);
await bild('2b-zwei-farblinien');
await O('malen', false);
await s.waitForTimeout(300);
// nichts ist gewählt: Unter einem gewählten Ring hinge der Tropfen „Maul formen“ über dem Anfasser an der Wand
// (Esc leert zuerst die Auswahl; ohne Auswahl ließe es die Luft ab)
if ((await O('werk')).auswahl !== '') {
  await s.keyboard.press('Escape');
  await s.waitForTimeout(400);
}
const gewaehlt = (await O('werk')).auswahl;
const p = await seitenPunkt(t, 1);
const summe2 = await O('werkSumme');
const L0 = [await lagen(0), await lagen(1)];
const N0 = [await lagenNetz(0), await lagenNetz(1)];
const nahWelt0 = await O('farbLinieImRaum', 0);
const fernWelt0 = await O('farbLinieImRaum', 1);
const fWerk = (await O('werk')).f;
const form0 = await O('radien');
const wechsel0 = (await O('farbe')).wechsel;
// den Scheitel (Kreuzung zweier Ringe) an der Wand des Tops `WEITE` (55) Einheiten nach außen ziehen, halten, loslassen
const ziehen = async (zielZ, imHalten) => {
  const a = (await O('ankerImBild', p.id, p.i, 'top')).filter((x) => !x.m && x.sichtbar)[0];
  const jetzt = (await O('werkLinienDaten')).find((l) => l.id === p.id).punkte[p.i];
  const ziel = await O('flaecheHin', 'top', jetzt.x, zielZ);
  if (!a || !ziel) return null;
  await s.mouse.move(a.x, a.y, { steps: 3 });
  await s.waitForTimeout(400);
  await O('farbKosten', true);
  await s.mouse.down();
  const N = 45;
  for (let k = 1; k <= N; k++) {
    await s.mouse.move(a.x + ((ziel.x - a.x) * k) / N, a.y + ((ziel.y - a.y) * k) / N);
    await s.waitForTimeout(22);
  }
  const kosten = await O('farbKosten', true);
  await s.waitForTimeout(700);
  const halten = imHalten ? await imHalten() : null;
  // (für die Suche nach der Abweichung: die Lagen im Halten, gleich nach dem Loslassen und in der Ruhe danach)
  const stufen = process.env.DIAG ? { halten: [await lagen(0), await lagen(1)], wechsel: (await O('farbe')).wechsel.zahl } : null;
  await s.mouse.up();
  if (stufen) {
    await s.waitForTimeout(60);
    stufen.los = [await lagen(0), await lagen(1)];
    stufen.wechselLos = (await O('farbe')).wechsel.zahl;
  }
  await ruhig();
  await s.waitForTimeout(400);
  if (stufen) {
    stufen.ruhe = [await lagen(0), await lagen(1)];
    stufen.wechselRuhe = (await O('farbe')).wechsel.zahl;
    console.log(`     Ruck: im Bild eines Netzwechsels bis ${z2((await O('farbe')).wechsel.ruck)}, in den Bildern sonst bis ${z2((await O('farbe')).wechsel.ruckSonst)} Einheiten neben dem Weg davor`);
    console.log(`     Zug nach z = ${Math.round(zielZ)}: im Halten → gleich nach dem Loslassen: nah ${z2(weg(stufen.halten[0], stufen.los[0]))}, fern ${z2(weg(stufen.halten[1], stufen.los[1]))} · → Ruhe: nah ${z2(weg(stufen.los[0], stufen.ruhe[0]))}, fern ${z2(weg(stufen.los[1], stufen.ruhe[1]))} · Netzwechsel bis zum Halten ${stufen.wechsel}, nach dem Loslassen ${stufen.wechselLos}, in der Ruhe ${stufen.wechselRuhe}`);
  }
  return { kosten, halten };
};
const hin = await ziehen(p.z + WEITE, async () => {
  const f = await O('farbe');
  const fern = await lagen(1);
  // wie weit hat sich die Haut dort bewegt, wo die ferne Farblinie lag?
  const haut = (await O('hautAbstand', fernWelt0)).map((d) => d * fWerk);
  const kante = kanteLesen(await kanteMessen());
  return { fehl: f.fehl, nah: await lagen(0), fern, haut: Math.max(...haut), kante, stufen: (await O('werk')).stufen };
});
await s.mouse.move(40, 20);
await s.waitForTimeout(400);
await bild('3-gezogen');
const wechsel1 = (await O('farbe')).wechsel;
const zurueckGezogen = await ziehen(p.z, null);
await s.mouse.move(40, 20);
await s.waitForTimeout(400);
const L2 = [await lagen(0), await lagen(1)];
// wie weit liegt die Haut selbst neben ihrer Lage davor, dort, wo die Farblinie am Zug lag?
const hautZurueck = Math.max(...(await O('hautAbstand', nahWelt0)).map((d) => d * fWerk));
const wechsel2 = (await O('farbe')).wechsel;
const form2 = await O('radien');
if (process.env.DIAG) {
  // häuft sich die Abweichung? Derselbe Zug noch zweimal hin und zurück
  let vor = L2;
  for (let runde = 2; runde <= 3; runde++) {
    await ziehen(p.z + WEITE, null);
    await ziehen(p.z, null);
    const L = [await lagen(0), await lagen(1)];
    console.log(`     Runde ${runde}: gegen die Runde davor nah ${z2(weg(vor[0], L[0]))}, fern ${z2(weg(vor[1], L[1]))} · gegen den Anfang nah ${z2(weg(L0[0], L[0]))}, fern ${z2(weg(L0[1], L[1]))}`);
    vor = L;
  }
}
const mitgegangen = hin ? weg(L0[0], hin.halten.nah) : NaN;
const fernBewegt = hin ? weg(L0[1], hin.halten.fern) : NaN;
const zurueckNah = weg(L0[0], L2[0]);
const zurueckFern = weg(L0[1], L2[1]);
const formZurueck = Math.max(Math.abs(form2.min - form0.min), Math.abs(form2.max - form0.max));
const gehalten = wechsel2.gehalten - wechsel0.gehalten;
const gesucht = wechsel2.gesucht - wechsel0.gesucht;
ok(
  '1 die Kante ist bei jedem Zoom und im Zug scharf und liegt auf der gezeichneten Kurve',
  kanten.every(kanteGut) && !!hin && hin.halten.kante.stuecke >= 4 && hin.halten.kante.breiteGroesst <= 1.5,
  `${kanten.map((k) => `${z2(k.zoom)}-fach (Stufe ${k.stufen} der Anzeige, ${k.stuecke} Stücke): ${kanteText(k)}`).join(' · ')} · im Zug (Stufe ${hin?.halten.stufen}, ${hin?.halten.kante.stuecke} Stücke): Breite ${z2(hin?.halten.kante.breite)} (breitestes Stück ${z2(hin?.halten.kante.breiteGroesst)}) · alles in Gerätepunkten; die Orte liegen ${z2(nebenEinheiten)} Einheiten (${z2(nebenCss * 2)} Gerätepunkte in der Seite) neben dem geklickten Sechseck`,
);
if (process.env.PROFIL) for (const k of kanten) console.log(`     Profil ${z2(k.zoom)}-fach: ${k.werte.join(' ')}`);
ok(
  '2 die Bemalung geht mit der Haut mit und kommt mit ihr zurück; fern vom Zug bewegt sie sich nicht weiter als die Haut dort; kein Ort verliert beim Netzwechsel die Haut',
  anDerWand === 2 && gewaehlt === '' && !!hin && !!zurueckGezogen && hin.halten.fehl === 0 && mitgegangen > 3 && zurueckNah <= 0.5 && zurueckFern <= 0.5 && fernBewegt <= hin.halten.haut + 0.5 && wechsel2.groesst <= 0.5 && wechsel2.zahl > wechsel0.zahl,
  `die zweite Farblinie mit P an der Wand gezeichnet (${anDerWand} Farblinien${gewaehlt === '' ? '' : `; gewählt blieb „${gewaehlt}“`}) · beim Zug um ${WEITE} Einheiten ging die Farblinie am Zug bis ${z2(mitgegangen)} Einheiten mit; nach dem Zug zurück liegt sie höchstens ${z2(zurueckNah)} Einheiten neben ihrer Lage davor, die ferne ${z2(zurueckFern)} (die Haut selbst liegt dort ${z2(hautZurueck)} neben ihrer Lage davor, der Umriss der Form ${z2(formZurueck)}) · fern vom Zug bewegte sich die Bemalung höchstens ${z2(fernBewegt)} Einheiten, die Haut dort ${z2(hin?.halten.haut)} · ${wechsel2.zahl - wechsel0.zahl} Netzwechsel (${wechsel1.zahl - wechsel0.zahl} hin, ${wechsel2.zahl - wechsel1.zahl} zurück): ${gehalten} Orte blieben in ihrem Dreieck, ${gesucht} wurden neu gesucht und lagen höchstens ${z2(wechsel2.groesst)} Einheiten neben der neuen Haut`,
);

// ---------- 3 formt nicht ----------
// (ein Handgriff am Bemalen nach den Zügen: füllen; die Form bleibt Zahl für Zahl)
const summe3 = await O('werkSumme');
const B0 = await imBild(1);
await O('malen', true);
await s.waitForTimeout(300);
await O('farbFuellen', B0.mx, B0.my, [0.2, 0.55, 0.8]);
await s.waitForTimeout(400);
const summe4 = await O('werkSumme');
ok(
  '3 formt nicht: Die Form des Werks ist nach jedem Handgriff am Bemalen Zahl für Zahl dieselbe',
  summe0 === summe1 && summe1 === summe2 && summe3 === summe4 && summe2 !== summe3,
  `vor dem Malen ${summe0}, nach Zeichnen und Füllen ${summe1}, nach der zweiten Farblinie ${summe2}; nach den Zügen ${summe3}, nach einer weiteren Füllung ${summe4}`,
);

// ---------- 4 Tempo ----------
await O('malen', false);
await s.waitForTimeout(300);
// drehen: ins Leere ziehen, die Bemalung steht im Bild
await O('farbKosten', true);
await O('messen', true);
await s.mouse.move(1250, 240, { steps: 3 });
await s.waitForTimeout(300);
await s.mouse.down();
for (let k = 1; k <= 60; k++) {
  await s.mouse.move(1250 - 3 * k, 240 + k);
  await s.waitForTimeout(16);
}
await s.mouse.up();
await s.waitForTimeout(900);
const bilder = (await O('messen', false)).filter((b) => b.abstand > 0);
const kostenDrehen = await O('farbKosten', true);
const abstaende = bilder.map((b) => b.abstand);
const bildMs = bilder.map((b) => b.ms);
const kostenZug = hin?.kosten ?? { bilder: 0, median: NaN, p95: NaN, groesst: NaN };
ok(
  '4 Tempo: Beim Ziehen an der Form kostet die Bemalung im Median höchstens 1 ms je Bild; beim Drehen kostet kein Bild über 16,7 ms und keines fällt aus',
  kostenZug.bilder > 20 && kostenZug.median <= 1 && bilder.length > 20 && Math.max(...bildMs) <= 16.7 && Math.max(...abstaende) < 25,
  `beim Ziehen (${kostenZug.bilder} Bilder): Median ${z2(kostenZug.median)} ms, 95 % ${z2(kostenZug.p95)} ms, größtes ${z2(kostenZug.groesst)} ms · beim Drehen (${bilder.length} Bilder): ein Bild kostet im Median ${z2(quantil(bildMs, 0.5))} ms, das teuerste ${z2(Math.max(...bildMs))} ms; Abstand der Bilder im Median ${z2(quantil(abstaende, 0.5))} ms, größter ${z2(Math.max(...abstaende))} ms; davon die Bemalung im Median ${z2(kostenDrehen.median)} ms, 95 % ${z2(kostenDrehen.p95)} ms`,
);

// ---------- 5 Sichern, Laden, ⌘Z ----------
// die Reihenfolge bis hier: … Farblinie, Füllung, Farblinie, Zug hin, Zug zurück, Füllung
const weg0 = await O('rueckweg');
const vorZ = await O('farbe');
const zurueck = async () => {
  await s.keyboard.press('Meta+z');
  await s.waitForTimeout(700);
  await ruhig().catch(() => undefined);
  const f = await O('farbe');
  return { l: f.linien, f: f.fuellungen, summe: await O('werkSumme') };
};
const u1 = await zurueck(); // die Füllung von eben
const u2 = await zurueck(); // der Zug zurück
const u3 = await zurueck(); // der Zug hin
const nachZuegen = [await lagenNetz(0), await lagenNetz(1)];
const u4 = await zurueck(); // die zweite Farblinie
const u5 = await zurueck(); // die erste Füllung
const u6 = await zurueck(); // die erste Farblinie
const nachZurueck = Math.max(weg(N0[0], nachZuegen[0]), weg(N0[1], nachZuegen[1]));
// noch einmal malen, sichern, laden
await O('malen', true);
await s.waitForTimeout(200);
await O('farbLinie', 'seite', kreis(40, -20, 45));
await s.waitForTimeout(300);
const C0 = await imBild(0);
await O('farbFuellen', C0.mx, C0.my, [0.97, 0.77, 0.27]);
await s.waitForTimeout(500);
const vorSichern = await O('farbe');
const vorSichernLagen = await lagenNetz(0);
const text = await O('sichern', PROBE);
const gesichert = fs.existsSync(datei);
await O('laden', PROBE);
await geladen();
await s.waitForTimeout(2500);
await O('material', 'Wachs');
await s.waitForTimeout(800);
const nachLaden = await O('farbe');
const nachLadenLagen = await lagenNetz(0);
await s.mouse.move(40, 20);
await s.waitForTimeout(300);
await bild('4-geladen');
const ladenWeg = weg(vorSichernLagen, nachLadenLagen);
ok(
  '5 ⌘Z nimmt Füllung, Züge und Farblinien in ihrer Reihenfolge zurück; nach Sichern und Laden liegt die Bemalung an derselben Stelle',
  vorZ.linien === 2 && vorZ.fuellungen === 2 && u1.f === 1 && u1.l === 2 && u1.summe === summe3 && u2.summe !== u1.summe && u2.l === 2 && u3.summe === summe2 && nachZurueck <= 0.01 && u4.l === 1 && u4.f === 1 && u5.f === 0 && u6.l === 0 && gesichert && nachLaden.linien === vorSichern.linien && nachLaden.fuellungen === vorSichern.fuellungen && nachLaden.orte === vorSichern.orte && ladenWeg <= 0.01,
  `Rückweg „${weg0}“; nach ⌘Z der Reihe nach (Farblinien/Füllungen): ${[u1, u2, u3, u4, u5, u6].map((x) => `${x.l}/${x.f}`).join(' → ')}; nach den zwei zurückgenommenen Zügen ist die Form die von vor den Zügen (${u3.summe === summe2}) und die Farblinien liegen ${z2(nachZurueck)} Einheiten neben ihrer Lage davor · ${String(text).slice(0, 60)} · geladen: ${nachLaden.linien} Farblinien, ${nachLaden.fuellungen} Füllungen, ${nachLaden.orte} Orte, ${z2(ladenWeg)} Einheiten neben der Lage vor dem Sichern`,
);
if (fs.existsSync(datei)) fs.unlinkSync(datei);

ok('6 keine Fehler in der Konsole', fehler.length === 0, [...new Set(fehler)].slice(0, 3).join(' | '));
console.log(schlecht ? `${schlecht} nicht erfüllt` : 'alles gut');
await browser.close();
