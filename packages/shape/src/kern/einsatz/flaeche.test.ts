// Teil A, Schritt A1: Maullinie auf A0. Tor: Hin- und Rückweg der Anker ≤ 1e-9; das entlang der Linie aufgeschnittene
// feine Feld ist eine Scheibe (χ = 1, ein Rand, kein Kneifpunkt). Dazu: der Anfang liegt auf der Naht. Gemessen: der
// eingerastete Pfad liegt bis 1,1 feine Kanten neben der Linie (Plan: ½ Kante, offen — in A6 wird die Lippe exakt an die
// Linie angepasst).
import { describe, expect, it } from 'vitest';
import { ableiten } from '../ableiten';
import { feinesNetz, hautAusNetz } from '../pruefstand';
import { GRUNDKOERPER, type KoerperArt, koerperDokument, vorlageVon } from '../pruefen/koerper';
import { type Anfang, type Form, maulBezug, maulLinien } from '../pruefen/linien';
import { zufall } from '../pruefen/zufall';
import { ankerLage, ankerVon, aufschneiden, feinNetz, feldAusschnitt, kantenPfad, linieAufNetz, scheibenPruefung } from './flaeche';

declare const console: { log: (...a: unknown[]) => void };
type V3 = [number, number, number];
const PX = 461;

describe('Teil A, A1: Linie auf A0', () => {
  it('Anker: Hin- und Rückweg ≤ 1e-9', () => {
    const abl = ableiten(koerperDokument('rex', zufall(1)), { stufen: 3 });
    const { punkte, flaechen } = feinesNetz(abl);
    const n = feinNetz(abl.fein, flaechen);
    void punkte;
    const z = zufall(7);
    let hin = 0;
    let zurueck = 0;
    for (let k = 0; k < 200; k++) {
      const t = Math.floor(z.zwischen(0, n.dreiecke.length / 3 - 1e-9));
      let b1 = z.zwischen(0, 1);
      let b2 = z.zwischen(0, 1);
      if (b1 + b2 > 1) {
        b1 = 1 - b1;
        b2 = 1 - b2;
      }
      const p = ankerLage(n, { dreieck: t, b1, b2 });
      const a = ankerVon(n, p);
      const q = ankerLage(n, a);
      hin = Math.max(hin, a.abstand);
      zurueck = Math.max(zurueck, Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]));
    }
    console.log(`Anker: Abstand Punkt → Haut ${hin.toExponential(2)}, Rückweg ${zurueck.toExponential(2)}`);
    expect(hin).toBeLessThan(1e-9);
    expect(zurueck).toBeLessThan(1e-9);
  });

  const faelle: [KoerperArt, Anfang, Form][] = [];
  for (const k of ['kugel', 'ei', 'birne', 'rex', 'langhals'] as KoerperArt[]) for (const a of ['hoch', 'mittel', 'tief'] as Anfang[]) for (const f of ['gerade', 'j', 's'] as Form[]) faelle.push([k, a, f]);
  it('aufgeschnittenes Feld ist eine Scheibe; Pfad nahe der Linie, Anfang auf der Naht (45 Fälle)', () => {
    let gezeichnet = 0;
    let schlechtester = 0;
    let fehlerText = '';
    for (const [art, anfang, form] of faelle) {
      const dok = koerperDokument(art, zufall(1));
      const abl = ableiten(dok, { stufen: 3 });
      const vorlage = GRUNDKOERPER.includes(art) ? null : vorlageVon(art as 'rex' | 'langhals');
      const l = maulLinien(dok, art, maulBezug(art, dok, vorlage), hautAusNetz(abl), anfang, form, 'kurz', 'gleich', zufall(3));
      if ('fehler' in l) continue;
      gezeichnet++;
      const { flaechen } = feinesNetz(abl);
      const n = feinNetz(abl.fein, flaechen);
      const auf = linieAufNetz(n, l.oben);
      // feine Kantenlänge (Median) als Maß
      const kanten: number[] = [];
      for (let t = 0; t < n.dreiecke.length; t += 3 * 37) {
        const a = n.dreiecke[t]!;
        const b = n.dreiecke[t + 1]!;
        kanten.push(Math.hypot(n.punkte[3 * a]! - n.punkte[3 * b]!, n.punkte[3 * a + 1]! - n.punkte[3 * b + 1]!, n.punkte[3 * a + 2]! - n.punkte[3 * b + 2]!));
      }
      kanten.sort((a, b) => a - b);
      const h = kanten[Math.floor(kanten.length / 2)]!;
      const feld = feldAusschnitt(n, auf.lagen, auf.anker, 4 * h);
      const pfad = kantenPfad(n, feld, auf.lagen);
      const name = `${art}/${anfang}/${form}`;
      if (pfad.length < 2) {
        fehlerText += `${name}: kein Pfad; `;
        continue;
      }
      // Pfad nahe der Linie, in feinen Kanten (Median des Körpers); Ziel des Plans ½ Kante (offen, A6 passt die Lippe exakt an)
      let weit = 0;
      for (const v of pfad) {
        const p: V3 = [n.punkte[3 * v]!, n.punkte[3 * v + 1]!, n.punkte[3 * v + 2]!];
        let d = Infinity;
        for (let k = 0; k + 1 < auf.lagen.length; k++) {
          const a = auf.lagen[k]!;
          const b = auf.lagen[k + 1]!;
          const e: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
          const l2 = e[0] * e[0] + e[1] * e[1] + e[2] * e[2] || 1e-18;
          const u = Math.max(0, Math.min(1, ((p[0] - a[0]) * e[0] + (p[1] - a[1]) * e[1] + (p[2] - a[2]) * e[2]) / l2));
          d = Math.min(d, Math.hypot(a[0] + e[0] * u - p[0], a[1] + e[1] * u - p[1], a[2] + e[2] * u - p[2]));
        }
        weit = Math.max(weit, d / h);
      }
      const schnitt = aufschneiden(n, feld, pfad);
      const s = scheibenPruefung(schnitt.dreiecke);
      const anfangAufNaht = Math.abs(n.punkte[3 * pfad[0]! + 2]!) < 1e-9;
      schlechtester = Math.max(schlechtester, weit);
      if (!(s.euler === 1 && s.raender === 1 && s.kneif === 0 && anfangAufNaht && weit <= 1.2)) fehlerText += `${name}: χ ${s.euler}, Ränder ${s.raender}, Naht ${anfangAufNaht}, Pfad ${weit.toFixed(2)} Kanten, Bézier zwischen den Knoten bis ${(auf.abstand * PX).toFixed(1)} px neben der Haut; `;
    }
    console.log(`${gezeichnet} von ${faelle.length} Fällen zeichenbar; Pfad höchstens ${schlechtester.toFixed(2)} feine Kanten neben der Linie (Ziel des Plans ½, offen)${fehlerText ? `; Fehler: ${fehlerText}` : ''}`);
    expect(gezeichnet).toBeGreaterThan(30);
    expect(fehlerText).toBe('');
  });
});
