// B4 (Plan Teil B): Löser im posierten Raum — Bedingungen erfüllt, örtlich (außerhalb des Bereichs exakt 0), spiegelgleich
// in ebenen Posen, auch in schiefen Posen (gerollter Oberkiefer), Anker halten, Tempo je Geste und Zugschritt.
import { describe, expect, it } from 'vitest';
import { standardPosen } from '../dokument';
import { MAUL_STANDARD, ableitenMitMaul, kieferGewichteSetzen, maulOptionenVorlage } from '../kern/maul';
import { maulLinieAusDokument } from '../kern/maulDokument';
import { kaefigNachbarn, spiegelIndex } from '../kern/pinsel';
import { posenAuswerten, posenFuerBau } from '../kern/posen/posen';
import { kugelMaulDokument } from '../kern/pruefstand';
import { posenLoeserBauen } from './posenLoeser';

declare const process: { env: Record<string, string | undefined> };
/** CI-Rechner sind langsamer und lassen alle Pakete parallel laufen (Plan 20.10., V0): dort gilt das Doppelte der Zeitgrenze. */
const ZEIT = process.env.CI ? 2 : 1;

const jetzt = () => ((globalThis as { performance?: { now(): number } }).performance ?? Date).now();

const OPT = { ...MAUL_STANDARD, ...maulOptionenVorlage('vorn'), haps: 0.6 };
function aufbau(stellung?: Record<string, unknown>) {
  const dok = kugelMaulDokument('ueberbiss');
  const abl = ableitenMitMaul(dok, maulLinieAusDokument(dok)!, { stufen: 2 }, OPT);
  abl.maul.opt = OPT;
  kieferGewichteSetzen(abl.maul, OPT);
  let posen = posenFuerBau(standardPosen(), null, abl.vorlage.kaefig.n, OPT);
  if (stellung) posen = posen.map((p) => (p.id === 'fressen' ? { ...p, stellung: { ...p.stellung, ...stellung } } : p));
  const r = posenAuswerten(abl, abl, OPT, posen, { fressen: 1 });
  const b = r.bearbeitung!;
  const n = abl.kaefig.n;
  const G = abl.unterteilung.grenze;
  const zeile = (f: number) => ({ index: Array.from(G.index.subarray(G.start[f]!, G.start[f + 1]!)), wert: Array.from(G.wert.subarray(G.start[f]!, G.start[f + 1]!)) });
  const ruheFein = abl.fein;
  // feiner Punkt oben auf dem Kopf (Naht, größtes y) und einer weit hinten (Naht, größtes x)
  let oben = -1;
  let hinten = -1;
  for (let f = 0; f < ruheFein.length / 3; f++) {
    if (Math.abs(ruheFein[3 * f + 2]!) > 1e-9) continue;
    if (oben < 0 || ruheFein[3 * f + 1]! > ruheFein[3 * oben + 1]!) oben = f;
    if (hinten < 0 || ruheFein[3 * f]! > ruheFein[3 * hinten]!) hinten = f;
  }
  let yMin = Infinity;
  let yMax = -Infinity;
  for (let i = 1; i < b.ruhe.length; i += 3) {
    yMin = Math.min(yMin, b.ruhe[i]!);
    yMax = Math.max(yMax, b.ruhe[i]!);
  }
  const H = yMax - yMin;
  const mitte = [ruheFein[3 * oben]!, ruheFein[3 * oben + 1]!, ruheFein[3 * oben + 2]!];
  const bereich: number[] = [];
  for (let i = 0; i < n; i++) if (Math.hypot(b.ruhe[3 * i]! - mitte[0]!, b.ruhe[3 * i + 1]! - mitte[1]!, b.ruhe[3 * i + 2]! - mitte[2]!) < 0.3 * H) bereich.push(i);
  return { abl, b, n, zeile, oben, hinten, bereich, nachbarn: kaefigNachbarn(abl.kaefig.fStart, abl.kaefig.fVerts, n), spiegel: spiegelIndex(b.ruhe, n) };
}

describe('B4: Löser im posierten Raum', () => {
  it('Griff oben am Kopf (Seite x, y): Ziel erreicht, außerhalb des Bereichs exakt 0, ebene Pose bleibt spiegelgleich', () => {
    const a = aufbau();
    const z = a.zeile(a.oben);
    const L = posenLoeserBauen({ n: a.n, nachbarn: a.nachbarn, ruhe: a.b.ruhe, dreh: a.b.dreh, spiegel: a.spiegel, bereich: a.bereich, bedingungen: [{ ...z, achsen: [0, 1], gewicht: 1e3 }] });
    const ziel = [0.02, 0.03];
    const d = L.loesen([ziel]);
    const v = L.versatz(z.index, z.wert, d);
    expect(Math.abs(v[0] - ziel[0]!)).toBeLessThan(0.02 * 0.036);
    expect(Math.abs(v[1] - ziel[1]!)).toBeLessThan(0.02 * 0.036);
    const drin = new Set(a.bereich.flatMap((i) => [i, a.spiegel[i]!]));
    let aussen = 0;
    for (let i = 0; i < a.n; i++) if (!drin.has(i)) aussen = Math.max(aussen, Math.abs(d[3 * i]!), Math.abs(d[3 * i + 1]!), Math.abs(d[3 * i + 2]!));
    expect(aussen).toBe(0);
    // spiegelgleich in der Ruhe (und in der ebenen Pose)
    let sp = 0;
    for (let i = 0; i < a.n; i++) {
      const q = a.spiegel[i]!;
      if (q < 0 || q === i) continue;
      sp = Math.max(sp, Math.abs(d[3 * i]! - d[3 * q]!), Math.abs(d[3 * i + 1]! - d[3 * q + 1]!), Math.abs(d[3 * i + 2]! + d[3 * q + 2]!));
    }
    expect(sp).toBeLessThan(1e-12);
    // Tempo: Zerlegen einmal je Geste, Lösen je Zugschritt
    expect(L.zeitZerlegen).toBeLessThan(400 * ZEIT);
    const t0 = jetzt();
    for (let k = 0; k < 20; k++) L.loesen([[0.001 * k, 0.002 * k]]);
    expect((jetzt() - t0) / 20).toBeLessThan(16 * ZEIT);
  });

  it('schiefe Pose (Oberkiefer gerollt): das Ziel wird im posierten Raum erreicht', () => {
    const a = aufbau({ schaedel: { winkel: OPT.winkelOben, rollen: 20 } });
    const z = a.zeile(a.oben);
    const L = posenLoeserBauen({ n: a.n, nachbarn: a.nachbarn, ruhe: a.b.ruhe, dreh: a.b.dreh, spiegel: a.spiegel, bereich: a.bereich, bedingungen: [{ ...z, achsen: [0, 1], gewicht: 1e3 }] });
    const d = L.loesen([[-0.015, 0.025]]);
    const v = L.versatz(z.index, z.wert, d);
    expect(Math.abs(v[0] + 0.015)).toBeLessThan(0.03 * 0.025);
    expect(Math.abs(v[1] - 0.025)).toBeLessThan(0.03 * 0.025);
  });

  it('Anker halten: ein zweiter Punkt mit Ziel 0 bleibt fast stehen, der Griff erreicht sein Ziel', () => {
    const a = aufbau();
    const z = a.zeile(a.oben);
    // Anker: ein Nahtpunkt am Rand des Bereichs (weit vom Griff, aber noch beweglich)
    const G = a.abl.unterteilung.grenze;
    const ruheFein = a.abl.fein;
    let anker = -1;
    let best = -Infinity;
    for (let f = 0; f < ruheFein.length / 3; f++) {
      if (Math.abs(ruheFein[3 * f + 2]!) > 1e-9) continue;
      const zf = { index: G.index.subarray(G.start[f]!, G.start[f + 1]!) };
      if (![...zf.index].every((j) => a.bereich.includes(j))) continue;
      const dd = Math.hypot(ruheFein[3 * f]! - ruheFein[3 * a.oben]!, ruheFein[3 * f + 1]! - ruheFein[3 * a.oben + 1]!);
      if (dd > best) {
        best = dd;
        anker = f;
      }
    }
    expect(anker).toBeGreaterThanOrEqual(0);
    const za = a.zeile(anker);
    const L = posenLoeserBauen({ n: a.n, nachbarn: a.nachbarn, ruhe: a.b.ruhe, dreh: a.b.dreh, spiegel: a.spiegel, bereich: a.bereich, bedingungen: [{ ...z, achsen: [0, 1], gewicht: 1e3 }, { ...za, achsen: [0, 1], gewicht: 1e2 }] });
    const d = L.loesen([[0.02, 0.03], [0, 0]]);
    const vg = L.versatz(z.index, z.wert, d);
    const va = L.versatz(za.index, za.wert, d);
    expect(Math.hypot(vg[0] - 0.02, vg[1] - 0.03)).toBeLessThan(0.05 * 0.036);
    expect(Math.hypot(va[0], va[1])).toBeLessThan(0.1 * 0.036);
  });
});
