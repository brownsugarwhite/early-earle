// Form zuerst (05.11.2026), Probe „Kiefer trennen“, mit der Maus.
// Maullinie ziehen, Knopf „Kiefer trennen“: Ober- und Unterlippe (rot, blau). Dann wie Florian: in der Front die Unterlippe schmaler
// und die Oberlippe breiter ziehen, in der Seite die Oberlippe über den Unterkiefer, den Anfang der Unterlippe am Umriss zurück
// (kürzerer Unterkiefer), Unterbiss (Unterlippe breiter und vorn hoch). Gemessen je Stand: dicht nach Lage (Körper und Inneres,
// offen), umgeklappte Dreiecke (sichtbar ≥ 1 Einheit², sonst Splitter), Breite der Lippen gegen die Form (Mitte der Lippe) und der
// Abstand zwischen ihnen in der Tiefe (Platz für Zähne); Bauzeit. Am Anfang: trennen und wieder zusammen ist bitgleich.
// Aufruf aus apps/editor: node scripts/pruefen/form-kiefer-trennen.mjs <ordner>
import { chromium } from '@playwright/test';

const ordner = process.argv[2] ?? '.';
const basis = process.env.FORM_URL ?? 'http://localhost:5193/form.html';
const browser = await chromium.launch();
const seite = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2 });
const fehler = [];
seite.on('console', (m) => {
  if (m.type() === 'error') fehler.push(m.text());
});
seite.on('pageerror', (e) => fehler.push(String(e)));
const fertig = async () => {
  await seite.waitForFunction(() => window.__form?.fein === true);
  await seite.waitForTimeout(300);
};
const pruefen = (geschlossen) =>
  seite.evaluate((geschlossen) => {
    const teile = [window.__formSzene.umriss.geometry, window.__formSzene.innen.geometry].filter((g) => g.index && g.attributes.position);
    const id = new Map();
    const kanten = new Map();
    let um = 0;
    let splitter = 0;
    for (const g of teile) {
      const p = g.attributes.position.array;
      const n = g.attributes.normal.array;
      const ind = g.index.array;
      const nr = (v) => {
        const k = `${p[3 * v].toFixed(3)},${p[3 * v + 1].toFixed(3)},${p[3 * v + 2].toFixed(3)}`;
        let r = id.get(k);
        if (r === undefined) id.set(k, (r = id.size));
        return r;
      };
      for (let t = 0; t < ind.length; t += 3) {
        const a = ind[t];
        const b = ind[t + 1];
        const c = ind[t + 2];
        const e = [nr(a), nr(b), nr(c)];
        if (e[0] !== e[1] && e[1] !== e[2] && e[2] !== e[0]) {
          for (let k = 0; k < 3; k++) {
            const x = e[k];
            const y = e[(k + 1) % 3];
            const key = x < y ? `${x},${y}` : `${y},${x}`;
            kanten.set(key, (kanten.get(key) ?? 0) + 1);
          }
        }
        const ab = [p[3 * b] - p[3 * a], p[3 * b + 1] - p[3 * a + 1], p[3 * b + 2] - p[3 * a + 2]];
        const ac = [p[3 * c] - p[3 * a], p[3 * c + 1] - p[3 * a + 1], p[3 * c + 2] - p[3 * a + 2]];
        const f = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
        const s = [0, 1, 2].map((i) => n[3 * a + i] + n[3 * b + i] + n[3 * c + i]);
        if (f[0] * s[0] + f[1] * s[1] + f[2] * s[2] < 0) {
          if (Math.hypot(...f) / 2 < 1) splitter++;
          else um++;
        }
      }
    }
    let offen = 0;
    let mehr = 0;
    for (const z of kanten.values()) {
      if (z < 2) offen++;
      if (z > 2) mehr++;
    }
    // geschlossen liegen die Lippen am Anfang aufeinander: verschweißt sind das Kanten mit vier Dreiecken (kein Fehler)
    return geschlossen ? { umgeklappt: um, splitter } : { offen, mehr, umgeklappt: um, splitter };
  }, geschlossen);
/** Breite der Lippen gegen die Form in ihrem mittleren Drittel (rechte Hälfte) und der Abstand in der Tiefe dazwischen */
const lippenMass = () =>
  seite.evaluate(() => {
    const l = window.__formSzene.lippen();
    if (!l) return null;
    const p = window.__formSzene.umriss.geometry.attributes.position.array;
    const mitte = (liste) => {
      const rechts = liste.filter((v) => p[3 * v + 2] > 0);
      return rechts.slice(Math.floor(rechts.length / 3), Math.ceil((2 * rechts.length) / 3));
    };
    const breiten = (liste) => {
      const r = [];
      for (const v of mitte(liste)) {
        const t = window.__formSzene.tiefe(p[3 * v], p[3 * v + 1]);
        if (t > 10) r.push(p[3 * v + 2] / t);
      }
      return r.length ? [Math.min(...r), Math.max(...r)] : null;
    };
    // Platz: je Punkt der Oberlippe der Unterschied in der Tiefe zum nächsten Punkt der Unterlippe (in der Seite)
    const oben = mitte(l.oben);
    const unten = l.unten.filter((v) => p[3 * v + 2] > 0);
    let platz = Infinity;
    let platzMax = 0;
    for (const v of oben) {
      let best = Infinity;
      let dz = 0;
      for (const w of unten) {
        const d = Math.hypot(p[3 * v] - p[3 * w], p[3 * v + 1] - p[3 * w + 1]);
        if (d < best) {
          best = d;
          dz = p[3 * v + 2] - p[3 * w + 2];
        }
      }
      platz = Math.min(platz, dz);
      platzMax = Math.max(platzMax, dz);
    }
    return { oben: breiten(l.oben), unten: breiten(l.unten), platz: [platz, platzMax] };
  });
const zahl = (v) => (v === null || v === undefined ? '–' : v.toFixed(2));
const stand = async (name, { bild = true, geschlossen = true } = {}) => {
  const p = await pruefen(geschlossen);
  const info = await seite.evaluate(() => ({ schnitt: window.__form.schnitt, maul: window.__form.maul, pose: window.__form.pose, ms: window.__form.ms }));
  const m = await lippenMass();
  const b = (q) => q?.map((x) => x.b ?? 1).map((x) => x.toFixed(2)).join('/');
  console.log(
    name,
    `· ${info.schnitt ? (info.schnitt.getrennt ? 'getrennt' : 'zusammen') : 'kein Schnitt'}`,
    `· Breiten oben ${b(info.maul?.punkte)}${info.maul?.unten ? `, unten ${b(info.maul.unten)}` : ''}`,
    m ? `· gemessen oben ${m.oben?.map(zahl).join('–')}, unten ${m.unten?.map(zahl).join('–')}, Platz ${m.platz.map((v) => v.toFixed(1)).join('–')}` : '',
    `· Pose ${info.pose.an ? `${info.pose.kiefer}°` : 'aus'}`,
    p.offen !== undefined ? `· offen ${p.offen}, mehr ${p.mehr}` : '',
    `· umgeklappt ${p.umgeklappt} (+ ${p.splitter} Splitter)`,
    `· Bau ${info.ms.toFixed(0)} ms`,
  );
  if (bild) await seite.screenshot({ path: `${ordner}/form-trennen-${name}.jpg`, type: 'jpeg', quality: 88 });
  return { ...p, ...info, mass: m };
};
const s = await (async () => {
  await seite.goto(basis);
  await fertig();
  return seite.evaluate(() => Math.min(document.getElementById('feld-seite').getBoundingClientRect().width, document.getElementById('feld-seite').getBoundingClientRect().height) / 560);
})();
const ort = (a, b) =>
  seite.evaluate(
    ([a, b]) => {
      const r = document.getElementById('feld-seite').getBoundingClientRect();
      const s = Math.min(r.width, r.height) / 560;
      return [r.left + r.width / 2 + a * s, r.top + r.height / 2 - b * s];
    },
    [a, b],
  );
const ziehen = async (punkte, warten = true) => {
  const [x0, y0] = punkte[0];
  await seite.mouse.move(x0, y0);
  await seite.mouse.down();
  for (let k = 1; k < punkte.length; k++) {
    const [xa, ya] = punkte[k - 1];
    const [xb, yb] = punkte[k];
    for (let i = 1; i <= 8; i++) {
      await seite.mouse.move(xa + ((xb - xa) * i) / 8, ya + ((yb - ya) * i) / 8);
      await seite.waitForTimeout(15);
    }
  }
  await seite.mouse.up();
  if (warten) await fertig();
};
const strich = async (liste) => {
  const p = [];
  for (const [x, y] of liste) p.push(await ort(x, y));
  await ziehen(p);
};
const pose = async (kiefer, an = true) => {
  await seite.evaluate(([k, an]) => window.__formPose({ kiefer: k, schaedel: 0, zuege: [] }, an), [kiefer, an]);
  await seite.waitForTimeout(250);
};
/** Bildschirmlage eines Lippenpunkts (l: 0 Ober-, 1 Unterlippe; i: Punkt) im Blatt mit dieser SVG */
const punktIn = (svgId, l, i) =>
  seite.evaluate(
    ([svgId, l, i]) => {
      const e = document.querySelector(`#${svgId} [data-mpunkt="${l}:${i}"]`);
      if (!e) return null;
      const r = e.getBoundingClientRect();
      return [r.x + r.width / 2, r.y + r.height / 2];
    },
    [svgId, l, i],
  );
const waehlen = async (l) => {
  await seite.click(`#kiefer-wahl [data-kiefer="${l}"]`);
  await seite.waitForTimeout(200);
};
const trennen = async () => {
  await seite.click('#kiefer-knopf');
  await fertig();
};
const netzLagen = () => seite.evaluate(() => Array.from(window.__formSzene.umriss.geometry.attributes.position.array).join(','));
/** einen Lippenpunkt in einem Blatt um (dx, dy) Welteinheiten ziehen (Bildschirm: y nach unten) */
const lippeZiehen = async (svgId, l, i, dx, dy) => {
  const p = await punktIn(svgId, l, i);
  if (!p) throw new Error(`Punkt ${l}:${i} fehlt in ${svgId}`);
  await ziehen([
    [p[0], p[1]],
    [p[0] + dx * s, p[1] + dy * s],
  ]);
};

// ---------- Kugel ----------
await strich([
  [-225, 6],
  [-150, 2],
  [-80, -4],
  [-20, -8],
]);
const vorher = await netzLagen();
await stand('kugel-zusammen', { bild: false });
// trennen und gleich wieder zusammen: bitgleich
await trennen();
await stand('kugel-getrennt');
await trennen();
console.log(`  trennen + zusammen bitgleich: ${(await netzLagen()) === vorher}`);
await trennen();
console.log(`  gewählt nach dem Trennen: ${await seite.evaluate(() => document.querySelector('#kiefer-wahl [aria-pressed="true"]')?.textContent)}`);
// Front: Unterlippe schmaler (mittlerer Punkt nach innen), Oberlippe breiter
await lippeZiehen('profil-front', 1, 1, -22, 0);
await stand('kugel-unten-schmal', { bild: false });
await waehlen(0);
await lippeZiehen('profil-front', 0, 1, 30, 0);
await stand('kugel-oben-breit', { bild: false });
// Seite: die Oberlippe hängt über den Unterkiefer
await lippeZiehen('zeichnung', 0, 1, 0, 14);
await stand('kugel-ueberbiss-zu');
for (const w of [20, 40, 55]) {
  await pose(w);
  await stand(`kugel-ueberbiss-${w}`, { bild: w === 40, geschlossen: false });
}
await pose(0, false);
// Unterkiefer kürzer: den Anfang der Unterlippe am Umriss nach unten
await waehlen(1);
await lippeZiehen('zeichnung', 1, 0, 6, 34);
await stand('kugel-unterkiefer-kurz');
await pose(40);
await stand('kugel-unterkiefer-kurz-40', { geschlossen: false });
await pose(0, false);
// ⌘Z dreimal (Pose aus, Pose an, der Zug): der Anfang der Unterlippe wieder vorn
const anfangKurz = await seite.evaluate(() => window.__form.maul.unten[0]);
for (let k = 0; k < 3; k++) await seite.keyboard.press('Meta+z');
await fertig();
const anfangZurueck = await seite.evaluate(() => window.__form.maul.unten[0]);
console.log(`  Anfang der Unterlippe: gezogen (${anfangKurz.x.toFixed(1)}, ${anfangKurz.y.toFixed(1)}), nach 3 × ⌘Z (${anfangZurueck.x.toFixed(1)}, ${anfangZurueck.y.toFixed(1)})`);

// ---------- Maulpunkte der Oberlippe: einfügen (Klick auf die gewählte Lippe), zwei mit ⇧ gemeinsam ziehen, einen löschen ----------
await waehlen(0);
const vorEinfuegen = await seite.evaluate(() => window.__form.maul.punkte.map((q) => ({ ...q })));
{
  const a = vorEinfuegen[0];
  const b = vorEinfuegen[1];
  const [lx, ly] = await ort((a.x + b.x) / 2, (a.y + b.y) / 2);
  await seite.mouse.click(lx, ly);
  await fertig();
}
const nachEinfuegen = await seite.evaluate(() => window.__form.maul.punkte.map((q) => ({ ...q })));
const p1 = await punktIn('zeichnung', 0, 1);
const p2 = await punktIn('zeichnung', 0, 2);
await seite.mouse.click(p1[0], p1[1]);
await seite.waitForTimeout(450);
await seite.keyboard.down('Shift');
await seite.mouse.click(p2[0], p2[1]);
await seite.keyboard.up('Shift');
await seite.waitForTimeout(450);
await lippeZiehen('zeichnung', 0, 1, -8, 10);
const nachZiehen = await seite.evaluate(() => window.__form.maul.punkte.map((q) => ({ ...q })));
const um = (j) => [nachZiehen[j].x - nachEinfuegen[j].x, nachZiehen[j].y - nachEinfuegen[j].y].map((v) => v.toFixed(1)).join(', ');
console.log(`  Oberlippe: Punkte ${vorEinfuegen.length} → ${nachEinfuegen.length}; mit ⇧ gezogen: Punkt 1 um (${um(1)}), Punkt 2 um (${um(2)}), Mundwinkel um (${um(nachZiehen.length - 1)})`);
await stand('kugel-punkte-gezogen', { bild: false });
const p3 = await punktIn('zeichnung', 0, 2);
await seite.mouse.click(p3[0], p3[1]);
await seite.waitForTimeout(450);
await seite.keyboard.press('Backspace');
await fertig();
console.log(`  gelöscht: ${await seite.evaluate(() => window.__form.maul.punkte.length)} Punkte, Unterlippe ${await seite.evaluate(() => window.__form.maul.unten?.length ?? 0)}`);
await stand('kugel-punkt-geloescht', { bild: false });

// ---------- Unterbiss: Unterlippe breiter und vorn über der Oberlippe ----------
await seite.evaluate(() => window.__formMaul(null));
await fertig();
await strich([
  [-225, 6],
  [-150, 2],
  [-80, -4],
  [-20, -8],
]);
await trennen();
await lippeZiehen('profil-front', 1, 1, 22, 0);
await lippeZiehen('zeichnung', 1, 1, 0, -12);
await stand('kugel-unterbiss-zu');
await pose(40);
await stand('kugel-unterbiss-40', { geschlossen: false });
await pose(0, false);

// ---------- Kopf: Überbiss mit Platz für Zähne ----------
await seite.evaluate(() =>
  window.__formSetzen([
    { x: -230, y: 10 },
    { x: -150, y: 60 },
    { x: 20, y: 120 },
    { x: 170, y: 60 },
    { x: 180, y: -60 },
    { x: 40, y: -110 },
    { x: -120, y: -55 },
    { x: -225, y: -25 },
  ]),
);
await fertig();
await strich([
  [-270, -6],
  [-200, -8],
  [-110, -6],
  [-15, 8],
]);
await trennen();
await lippeZiehen('profil-front', 1, 1, -18, 0);
await waehlen(0);
await lippeZiehen('profil-front', 0, 1, 24, 0);
await lippeZiehen('zeichnung', 0, 1, 0, 12);
await stand('kopf-ueberbiss-zu');
await pose(40);
await stand('kopf-ueberbiss-40', { geschlossen: false });
await pose(0, false);

console.log(fehler.length ? `Fehler im Fenster: ${fehler.join(' | ')}` : 'keine Fehler im Fenster');
await browser.close();
