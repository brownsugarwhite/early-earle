import { describe, expect, it } from 'vitest';
import { neuesDokument } from '../dokument';
import { allePunkte, alleFlaechen, kaefigAusFlaechen, pruefeKaefig, volumen, type V3 } from '../kaefig/halbkanten';
import { kaefigAusProfilen } from '../versuch/kaefig';
import { type Netz, kante, unterteilenMehrfach } from '../versuch/catmullClark';
import { anwenden3, nichtNull } from './matrix';
import { grenzMaske, unterteilung, verfeinern } from './catmullClark';

declare const process: { env: Record<string, string | undefined> };
/** CI-Rechner sind langsamer und lassen alle Pakete parallel laufen (Plan 20.10., V0): dort gilt das Doppelte der Zeitgrenze. */
const ZEIT = process.env.CI ? 2 : 1;

declare const console: { log: (...a: unknown[]) => void };
const uhr = (globalThis as { performance?: { now(): number } }).performance;
const jetzt = () => (uhr ? uhr.now() : Date.now());

function wuerfel(): Netz {
  const p: V3[] = [
    [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
    [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1],
  ];
  const f = [
    [0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7],
  ];
  return { punkte: p, flaechen: f, schaerfe: new Map() };
}

function alsKaefig(netz: Netz) {
  const k = kaefigAusFlaechen(netz.punkte, netz.flaechen);
  for (let e = 0; e < k.nE; e++) k.eSchaerfe[e] = netz.schaerfe.get(kante(k.eA[e]!, k.eB[e]!)) ?? 0;
  for (const [i, s] of netz.eckSchaerfe ?? []) k.vSchaerfe[i] = s;
  return k;
}

function maxAbweichung(a: Float64Array, b: readonly V3[]): number {
  let m = 0;
  for (let i = 0; i < b.length; i++) for (let c = 0; c < 3; c++) m = Math.max(m, Math.abs(a[3 * i + c]! - b[i]![c]!));
  return m;
}

describe('Catmull-Clark als Matrix gegen das Orakel', () => {
  it('Würfel mit halbscharfen Kanten und Punktschärfe, drei Stufen', () => {
    const netz = wuerfel();
    // Kanten: eine ganz scharf (2,5), zwei halbscharf (0,3 / 1,2 verschiedene Werte), ein Zug mit Verlauf
    netz.schaerfe.set(kante(0, 1), 2.5);
    netz.schaerfe.set(kante(1, 2), 1.2);
    netz.schaerfe.set(kante(2, 3), 0.4);
    netz.schaerfe.set(kante(4, 5), 0.7);
    netz.schaerfe.set(kante(5, 6), 0.7);
    netz.schaerfe.set(kante(6, 7), 3);
    netz.schaerfe.set(kante(2, 6), 1.5);
    netz.eckSchaerfe = new Map([[7, 1.6], [4, 0.3]]);
    const k = alsKaefig(netz);
    expect(pruefeKaefig(k).ok).toBe(true);
    let orakel = netz;
    let stufe = k;
    for (let L = 1; L <= 3; L++) {
      orakel = unterteilenMehrfach(orakel, 1);
      const st = verfeinern(stufe);
      expect(st.kaefig.n).toBe(orakel.punkte.length);
      expect(st.kaefig.nF).toBe(orakel.flaechen.length);
      expect(maxAbweichung(st.kaefig.xyz, orakel.punkte)).toBeLessThan(1e-9);
      // gleiche Flächenlisten
      expect(alleFlaechen(st.kaefig)).toEqual(orakel.flaechen);
      // gleiche Kindschärfen
      for (let e = 0; e < st.kaefig.nE; e++) {
        const soll = orakel.schaerfe.get(kante(st.kaefig.eA[e]!, st.kaefig.eB[e]!)) ?? 0;
        expect(Math.abs(st.kaefig.eSchaerfe[e]! - soll)).toBeLessThan(1e-12);
      }
      for (let v = 0; v < st.kaefig.n; v++) {
        const soll = orakel.eckSchaerfe?.get(v) ?? 0;
        expect(Math.abs(st.kaefig.vSchaerfe[v]! - soll)).toBeLessThan(1e-12);
      }
      expect(pruefeKaefig(st.kaefig).ok).toBe(true);
      stufe = st.kaefig;
    }
    // zusammengesetzte Matrix liefert dieselben Lagen
    const u = unterteilung(k, 3);
    expect(maxAbweichung(anwenden3(u.matrix, k.xyz), orakel.punkte)).toBeLessThan(1e-9);
  });

  it('Röhre mit Polen (Dreiecke an den Enden), zwei Stufen', () => {
    const netz = kaefigAusProfilen(neuesDokument(), 6, 8);
    netz.schaerfe.set(kante(0, 1), 1.3);
    netz.schaerfe.set(kante(1, 2), 1.3);
    const k = alsKaefig(netz);
    const orakel = unterteilenMehrfach(netz, 2);
    const u = unterteilung(k, 2);
    expect(maxAbweichung(anwenden3(u.matrix, k.xyz), orakel.punkte)).toBeLessThan(1e-9);
    expect(alleFlaechen(u.stufen[1]!.kaefig)).toEqual(orakel.flaechen);
    expect(volumen(u.stufen[1]!.kaefig)).toBeGreaterThan(0);
  });

  it('Grenzflächen-Maske: Ebene bleibt Ebene, Würfelecke landet bei ½, Falte und Ecke', () => {
    // Ebene 5×5 (innere Punkte regulär)
    const p: V3[] = [];
    const f: number[][] = [];
    for (let j = 0; j < 5; j++) for (let i = 0; i < 5; i++) p.push([i, 0.3 * i + 0.1 * j, j]);
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) f.push([j * 5 + i, j * 5 + i + 1, (j + 1) * 5 + i + 1, (j + 1) * 5 + i]);
    const ebene = kaefigAusFlaechen(p, f);
    const g = anwenden3(grenzMaske(ebene), ebene.xyz);
    for (let i = 0; i < 25; i++) if (i % 5 !== 0 && i % 5 !== 4 && i >= 5 && i < 20) expect(Math.abs(g[3 * i + 1]! - (0.3 * g[3 * i]! + 0.1 * g[3 * i + 2]!))).toBeLessThan(1e-12);
    // Würfel: Grenzlage der Ecke (1,1,1) ist (½,½,½)
    const w = alsKaefig(wuerfel());
    const gw = anwenden3(grenzMaske(w), w.xyz);
    expect(gw[3 * 6]).toBeCloseTo(0.5, 12);
    expect(gw[3 * 6 + 1]).toBeCloseTo(0.5, 12);
    expect(gw[3 * 6 + 2]).toBeCloseTo(0.5, 12);
    // Unterteilen und Grenze: nähert sich der direkt gerechneten Grenze der Stufe 5 (Konvergenz)
    const u3 = unterteilung(w, 3);
    const u6 = unterteilung(w, 6);
    const g3 = anwenden3(u3.grenze, w.xyz);
    const g6 = anwenden3(u6.grenze, w.xyz);
    // Punkt 0 … 7 bleiben die ersten Indizes in jeder Stufe
    let d = 0;
    for (let i = 0; i < 8 * 3; i++) d = Math.max(d, Math.abs(g3[i]! - g6[i]!));
    expect(d).toBeLessThan(1e-6);
    // Ecke mit Punktschärfe ≥ 1 bleibt, Punkt mit drei scharfen Kanten bleibt
    const w2 = alsKaefig(wuerfel());
    w2.vSchaerfe[6] = 1;
    const g2 = anwenden3(grenzMaske(w2), w2.xyz);
    expect(g2[3 * 6]).toBeCloseTo(1, 12);
    const netz3 = wuerfel();
    netz3.schaerfe.set(kante(1, 2), 2);
    netz3.schaerfe.set(kante(2, 3), 2);
    netz3.schaerfe.set(kante(2, 6), 2);
    const w3 = alsKaefig(netz3);
    const g3b = anwenden3(grenzMaske(w3), w3.xyz);
    expect(g3b[3 * 2]).toBeCloseTo(1, 12);
    expect(g3b[3 * 2 + 1]).toBeCloseTo(1, 12);
  });

  it('Tempo: Röhre 24×16 mit Kappen, Stufe 3, Matrix-Vektor-Multiplikation', () => {
    const netz = kaefigAusProfilen(neuesDokument(), 24, 16);
    const k = alsKaefig(netz);
    const t0 = jetzt();
    const u = unterteilung(k, 3);
    const t1 = jetzt();
    const x = k.xyz.slice();
    const out = new Float64Array(3 * u.grenze.zeilen);
    let best = Infinity;
    for (let i = 0; i < 20; i++) {
      const a = jetzt();
      anwenden3(u.grenze, x, out);
      best = Math.min(best, jetzt() - a);
    }
    console.log(`Stufe 3: ${u.grenze.zeilen} Punkte, ${nichtNull(u.grenze)} Gewichte; Aufbau ${(t1 - t0).toFixed(0)} ms, Zugschritt (Matrix · Käfig) ${best.toFixed(2)} ms`);
    expect(best).toBeLessThan(16 * ZEIT);
    expect(allePunkte(k).length).toBe(k.n);
  });
});
