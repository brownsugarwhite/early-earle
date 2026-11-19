// Ozzy, Material „Wachs“ (19.11.2026): Vergleichsbild gegen Florians Vorlage aus ZBrush („MatCap Red Wax“,
// docs/look/ozzy/paint/2026-11-19-zbrush-matcap-red-wax.png). Eine frische Kugel in Ozzy (Kreis auf dem Blatt, aufgeblasen), einmal
// mit dem Farbton der Vorlage (`?wachs=0`: ZBrushs Rot) und einmal mit dem Grundwert (Magenta), gleich groß neben die Kugel der Vorlage
// gelegt. Zeile 1: alle drei auf dem Grund der Vorlage (die Kugeln aus Ozzy sind dafür ausgeschnitten: Farben vergleicht man nur auf
// gleichem Grund; genommen ist die Zeichenfläche der Haut allein, ohne die Linien des Raums darüber). Zeile 2: Ozzy, wie es ist
// (Papier, Raum), in einer Reihe von Farbtönen zum Aussuchen.
// Gemessen wird dabei, wie weit Ozzys rote Kugel von der Vorlage abweicht (ohne die Drahtlinien der Vorlage).
// Aufruf aus apps/editor: OZZY_URL=http://localhost:5215/ozzy.html node scripts/ozzy/wachs-vergleich.mjs [ziel.png] [töne, mit Komma]
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { auf } from '../pruefen/ozzy-teile.mjs';

const hier = dirname(fileURLToPath(import.meta.url));
const wurzel = resolve(hier, '../../../..');
const ziel = process.argv[2] ?? resolve(wurzel, 'docs/progress/ozzy/2026-11-19-wachs-vergleich.png');
const TOENE = (process.argv[3] ?? '0,-20,-30,-40,-50,-60').split(',').map(Number);
const vorlage = readFileSync(resolve(wurzel, 'docs/look/ozzy/paint/2026-11-19-zbrush-matcap-red-wax.png')).toString('base64');
/** die Kugel in der Vorlage (ausgemessen: Mitte und Halbmesser in Bildpunkten des Bildschirmfotos) */
const ZB = { cx: 604, cy: 387.5, r: 203.5 };

/** eine frische Kugel mit dem Farbton `ton`; zurück: das Fenster und die Zeichenfläche der Haut allein (PNG, base64) */
async function kugel(ton) {
  const { browser, s, O, geladen, fehler } = await auf({ extra: `material=wachs&wachs=${ton}` });
  const [cx, cy, R, k] = [720, 450, 150, 0.5523 * 150];
  await O('form', [
    { x: cx + R, y: cy, ein: [0, -k], aus: [0, k] },
    { x: cx, y: cy + R, ein: [k, 0], aus: [-k, 0] },
    { x: cx - R, y: cy, ein: [0, k], aus: [0, -k] },
    { x: cx, y: cy - R, ein: [-k, 0], aus: [k, 0] },
  ]);
  await s.waitForTimeout(300);
  await O('aufblasen');
  await geladen();
  await s.waitForTimeout(2200);
  await s.mouse.move(40, 20);
  await s.waitForTimeout(500);
  const png = await s.screenshot();
  // die Haut allein: ein Bild rechnen und die Zeichenfläche sofort lesen (danach räumt der Browser sie ab)
  const haut = await s.evaluate(() => {
    const o = window.__ozzy;
    o.film(true);
    o.bild(1 / 60);
    const daten = document.getElementById('haut').toDataURL('image/png');
    o.film(false);
    return daten.slice(daten.indexOf(',') + 1);
  });
  if (fehler.length) console.log('Fehler in der Konsole:', [...new Set(fehler)].slice(0, 3).join(' | '));
  await browser.close();
  return { fenster: png.toString('base64'), haut };
}

const bilder = [];
const haeute = [];
for (const t of TOENE) {
  const k = await kugel(t);
  bilder.push(k.fenster);
  haeute.push(k.haut);
}

// den Bogen in einer leeren Seite zusammensetzen (Bildvergleiche laufen im Browser, wie bei den anderen Proben)
const { browser, s } = await auf({ dichte: 1, b: 1600, h: 1000 });
const ergebnis = await s.evaluate(
  async ({ vorlage, bilder, haeute, TOENE, ZB }) => {
    const laden = async (b64) => createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob());
    const V = await laden(vorlage);
    const B = [];
    for (const b of bilder) B.push(await laden(b));
    const HB = [];
    for (const b of haeute) HB.push(await laden(b));
    const lesen = (bild) => {
      const c = new OffscreenCanvas(bild.width, bild.height);
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(bild, 0, 0);
      return g.getImageData(0, 0, bild.width, bild.height);
    };
    /** die Kugel in Ozzys Bild: alle farbigen Bildpunkte um die Mitte (nicht weiß, nicht grau) */
    const finden = (bild) => {
      const D = lesen(bild);
      let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
      for (let y = Math.floor(D.height * 0.2); y < D.height * 0.8; y++)
        for (let x = Math.floor(D.width * 0.3); x < D.width * 0.7; x++) {
          const o = (y * D.width + x) * 4;
          const r = D.data[o], g = D.data[o + 1], b = D.data[o + 2];
          if (Math.max(r, g, b) - Math.min(r, g, b) > 24 && r > g + 16) {
            if (x < x0) x0 = x;
            if (x > x1) x1 = x;
            if (y < y0) y0 = y;
            if (y > y1) y1 = y;
          }
        }
      // die Mitte von oben her: Der untere Rand ist fast schwarz und fällt aus der Suche (die Kugel ist rund, Halbmesser aus der Breite)
      const r = (x1 - x0 + 1) / 2;
      return { cx: (x0 + x1 + 1) / 2, cy: y0 + r, r, rh: (y1 - y0 + 1) / 2, daten: D };
    };
    const K = B.map(finden);
    /** dieselbe Kugel auf der Zeichenfläche der Haut allein (für Messung und Zeile 1) */
    const KH = HB.map(finden);
    // ---- messen: Ozzys rote Kugel gegen die Vorlage, beide über die Normale abgetastet ----
    const VD = lesen(V);
    const iRot = TOENE.indexOf(0);
    let mess = null;
    if (iRot >= 0) {
      const k = KH[iRot];
      const quantil = (D, x0, y0) => {
        // die Drahtlinien der Vorlage heraus: 60-%-Quantil je Kanal über 5 × 5
        const aus = [0, 0, 0];
        for (let c = 0; c < 3; c++) {
          const w = [];
          for (let b = -2; b <= 2; b++) for (let a = -2; a <= 2; a++) w.push(D.data[((y0 + b) * D.width + x0 + a) * 4 + c]);
          w.sort((p, q) => p - q);
          aus[c] = w[15];
        }
        return aus;
      };
      const mittel = (D, x, y, h) => {
        const aus = [0, 0, 0];
        let n = 0;
        for (let b = -h; b <= h; b++) for (let a = -h; a <= h; a++) {
          const o = ((Math.round(y) + b) * D.width + Math.round(x) + a) * 4;
          aus[0] += D.data[o]; aus[1] += D.data[o + 1]; aus[2] += D.data[o + 2];
          n++;
        }
        return aus.map((z) => z / n);
      };
      const summe = [0, 0, 0];
      let n = 0, groesst = 0;
      for (let v = -0.9; v <= 0.9001; v += 0.02) for (let u = -0.9; u <= 0.9001; u += 0.02) {
        if (u * u + v * v > 0.9 * 0.9) continue;
        const a = quantil(VD, Math.round(ZB.cx + u * ZB.r), Math.round(ZB.cy - v * ZB.r));
        const b = mittel(k.daten, k.cx + u * k.r, k.cy - v * k.r, 1);
        for (let c = 0; c < 3; c++) {
          const e = a[c] - b[c];
          summe[c] += e * e;
          groesst = Math.max(groesst, Math.abs(e));
        }
        n++;
      }
      mess = { rms: summe.map((z) => Math.sqrt(z / n)), groesst, stellen: n, kugel: { cx: k.cx, cy: k.cy, r: k.r, rh: k.rh } };
    }
    // ---- der Bogen ----
    const D = 2 * ZB.r; // Durchmesser im Bogen: wie in der Vorlage
    const FELD = 470, RAND = 26, KOPF = 96, TEXT = 70;
    const iGrund = TOENE.indexOf(-40) >= 0 ? TOENE.indexOf(-40) : TOENE.length - 1;
    const breite = RAND + 3 * (FELD + RAND);
    const klein = Math.floor((breite - RAND) / TOENE.length) - RAND;
    const hoehe = KOPF + FELD + TEXT + 40 + klein + TEXT + RAND;
    const c = new OffscreenCanvas(breite, hoehe);
    const g = c.getContext('2d');
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, breite, hoehe);
    g.fillStyle = '#1f1a17';
    g.font = '600 30px -apple-system, "Helvetica Neue", Arial, sans-serif';
    g.fillText('Material „Wachs“: ZBrush neben Ozzy', RAND, 44);
    g.font = '18px -apple-system, "Helvetica Neue", Arial, sans-serif';
    g.fillStyle = '#67696b';
    g.fillText('Oben: gleiche Größe, gleicher Grund (die Kugeln aus Ozzy sind auf den Grund der Vorlage gelegt). Unten: Ozzy, wie es ist, in sechs Farbtönen.', RAND, 76);
    const titel = (x, y, a, b) => {
      g.fillStyle = '#1f1a17';
      g.font = '600 20px -apple-system, "Helvetica Neue", Arial, sans-serif';
      g.fillText(a, x, y + 28);
      g.fillStyle = '#67696b';
      g.font = '16px -apple-system, "Helvetica Neue", Arial, sans-serif';
      g.fillText(b, x, y + 52);
    };
    // Zeile 1, Feld 1: die Vorlage (Ausschnitt um die Kugel)
    const q0 = { x: ZB.cx - FELD / 2, y: ZB.cy - FELD / 2 };
    const feldX = (i) => RAND + i * (FELD + RAND);
    g.drawImage(V, q0.x, q0.y, FELD, FELD, feldX(0), KOPF, FELD, FELD);
    titel(feldX(0), KOPF + FELD, 'ZBrush: „MatCap Red Wax“', 'deine Vorlage (Kugel mit Drahtlinien, grob unterteilt)');
    // Felder 2 und 3: der Grund der Vorlage ohne Kugel (ihre Spalte links neben der Kugel, über die Breite gezogen), darauf Ozzys Kugel
    const aufGrund = (i, k, bild) => {
      const x = feldX(i);
      g.drawImage(V, 900, q0.y, 1, FELD, x, KOPF, FELD, FELD);
      g.save();
      g.beginPath();
      g.arc(x + FELD / 2, KOPF + FELD / 2, D / 2 - 0.6, 0, 2 * Math.PI);
      g.clip();
      const f = D / (2 * k.r);
      g.imageSmoothingQuality = 'high';
      g.drawImage(bild, k.cx - k.r, k.cy - k.r, 2 * k.r, 2 * k.r, x + FELD / 2 - D / 2, KOPF + FELD / 2 - D / 2, 2 * k.r * f, 2 * k.r * f);
      g.restore();
    };
    if (iRot >= 0) {
      aufGrund(1, KH[iRot], HB[iRot]);
      titel(feldX(1), KOPF + FELD, 'Ozzy: Wachs im Rot der Vorlage', mess ? `Farbton 0; im Mittel ${mess.rms.map((z) => z.toFixed(1).replace('.', ',')).join(' / ')} von 255 Stufen neben ZBrush` : 'Farbton 0');
    }
    aufGrund(2, KH[iGrund], HB[iGrund]);
    titel(feldX(2), KOPF + FELD, 'Ozzy: Wachs in Magenta (Grundwert)', `Farbton ${TOENE[iGrund]}: nur der Farbton ist gedreht`);
    // Zeile 2: Ozzy, wie es ist
    const y2 = KOPF + FELD + TEXT + 40;
    TOENE.forEach((t, i) => {
      const k = K[i];
      const x = RAND + i * (klein + RAND);
      const aus = 2.5 * k.r; // Ausschnitt um die Kugel
      g.imageSmoothingQuality = 'high';
      g.drawImage(B[i], k.cx - aus / 2, k.cy - aus / 2, aus, aus, x, y2, klein, klein);
      g.strokeStyle = '#e0e5e8';
      g.strokeRect(x + 0.5, y2 + 0.5, klein - 1, klein - 1);
      g.fillStyle = '#1f1a17';
      g.font = '600 18px -apple-system, "Helvetica Neue", Arial, sans-serif';
      g.fillText(`Farbton ${t}${t === 0 ? ' (Rot wie ZBrush)' : i === iGrund ? ' (Grundwert)' : ''}`, x, y2 + klein + 26);
    });
    const blob = await c.convertToBlob({ type: 'image/png' });
    const puffer = new Uint8Array(await blob.arrayBuffer());
    let roh = '';
    for (let i = 0; i < puffer.length; i += 8192) roh += String.fromCharCode(...puffer.subarray(i, i + 8192));
    return { png: btoa(roh), mess, kugeln: K.map((k) => ({ cx: k.cx, cy: k.cy, r: k.r, rh: k.rh })), breite, hoehe };
  },
  { vorlage, bilder, haeute, TOENE, ZB },
);
await browser.close();
writeFileSync(ziel, Buffer.from(ergebnis.png, 'base64'));
const z = (x) => x.toFixed(2).replace('.', ',');
console.log(`Bogen ${ergebnis.breite} × ${ergebnis.hoehe}: ${ziel}`);
console.log('Kugeln in Ozzys Bild (Gerätepunkte):', ergebnis.kugeln.map((k) => `Mitte ${k.cx.toFixed(1)}, ${k.cy.toFixed(1)}, halbe Breite ${k.r.toFixed(1)}, halbe Höhe ${k.rh.toFixed(1)}`).join(' | '));
if (ergebnis.mess) console.log(`Ozzy (Farbton 0) gegen die Vorlage ohne Drahtlinien, innerhalb 90 % des Halbmessers, ${ergebnis.mess.stellen} Stellen: RMS Rot / Grün / Blau ${ergebnis.mess.rms.map(z).join(' / ')} von 255, größte Abweichung ${z(ergebnis.mess.groesst)}`);
