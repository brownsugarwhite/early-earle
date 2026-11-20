// Das Maul als echte Form (20.11.2026): Aus einer Linie in der Seitenebene wird ein Maul, das Haut und Linien der Form ist. Die Haut
// bleibt geschlossen, die Spiegelpaare genau, kein Punkt liegt auf einem anderen, die Lippen sind Zwillinge, die Rechnung kommt
// danach zur Ruhe.
import {
  type Haut,
  type Loop,
  LoopZug,
  griffeAnlegen,
  hatPfad,
  hautAus,
  hautSeiten,
  istMaulLinie,
  kreuzungenZwischen,
  loopAusSchnitt,
  loopEinsetzen,
  mittlereKante,
  nadelnZusammenlegen,
  pfadAbweichung,
  pfadLagen,
  punktEinfuegen,
  rundAusSeite,
  zwillinge,
  zwillingsFehler,
} from '@ee/shape/dicht';
import { describe, expect, it } from 'vitest';
import { MAUL_HAAR, kieferSeiten, maulSchneidenMit } from './maulEcht';
import { Profil } from '../maulstudie/schnitt';
import { manifoldLaden } from './naht';

const R = 150;
/** eine gespiegelte Kugel mit drei Linien (Ring waagerecht, Mitte, Ring senkrecht), ihre Kreuzungen als Punkte, mit Griffen */
function kugel(): { h: Haut; loops: Loop[] } {
  const n = rundAusSeite(
    [
      { x: R, y: 0 },
      { x: 0, y: R },
      { x: -R, y: 0 },
      { x: 0, y: -R },
    ],
    { dreiecke: 1500 },
  );
  let h = hautAus(n.positionen, n.indizes);
  let loops: Loop[] = [];
  for (const [a, A, B] of [
    ['seite', [-200, 0], [200, 0]],
    ['top', [-200, 0], [200, 0]],
    ['seite', [10, 200], [10, -200]],
  ] as const) {
    loops.push(loopAusSchnitt(h, a, [A[0], A[1]], [B[0], B[1]], loops.length + 1, 8)!);
    const r = loopEinsetzen(h, loops, loops.length - 1)!;
    h = r.haut;
    loops = r.loops;
  }
  const tol = 0.25 * mittlereKante(h);
  let k = 1;
  for (let i = 0; i < loops.length; i++)
    for (let j = i + 1; j < loops.length; j++)
      for (const f of kreuzungenZwischen(loops[i]!, loops[i]!.ruhe, loops[j]!, loops[j]!.ruhe, tol)) {
        punktEinfuegen(loops[i]!, f.sa, k);
        punktEinfuegen(loops[j]!, f.sb, k);
        k++;
      }
  for (const l of loops) griffeAnlegen(l, l.ruhe, true);
  return { h, loops };
}
const IDS = { naechsteId: 100, naechsteKreuzung: 1000 };

/** offene Kanten und Kanten mit mehr als zwei Dreiecken */
function kantenFehler(h: Haut): number {
  const zahl = new Map<number, number>();
  for (let t = 0; t < h.tri.length; t += 3)
    for (let e = 0; e < 3; e++) {
      const a = h.tri[t + e]!;
      const b = h.tri[t + ((e + 1) % 3)]!;
      const k = Math.min(a, b) * h.n + Math.max(a, b);
      zahl.set(k, (zahl.get(k) ?? 0) + 1);
    }
  let schlecht = 0;
  for (const n of zahl.values()) if (n !== 2) schlecht++;
  return schlecht;
}
/** Punkte ohne sauberen Spiegelpartner (er zeigt nicht zurück, oder liegt nicht gespiegelt) */
function paarFehler(h: Haut): number {
  let schlecht = 0;
  for (let v = 0; v < h.n; v++) {
    const s = h.spiegel[v]!;
    if (s < 0 || h.spiegel[s] !== v) {
      schlecht++;
      continue;
    }
    const d = Math.hypot(h.pos[3 * v]! - h.pos[3 * s]!, h.pos[3 * v + 1]! - h.pos[3 * s + 1]!, h.pos[3 * v + 2]! + h.pos[3 * s + 2]!);
    if (d > 1e-9) schlecht++;
  }
  return schlecht;
}
/** Punkte, die der Kern beim Neulesen der Paare nicht auseinanderhalten könnte (gleiche auf 0,001 gerundete Lage) */
function amSelbenOrt(h: Haut): number {
  const gesehen = new Set<string>();
  let doppelt = 0;
  for (let v = 0; v < h.n; v++) {
    const k = `${Math.round(h.pos[3 * v]! * 1e3)},${Math.round(h.pos[3 * v + 1]! * 1e3)},${Math.round(h.pos[3 * v + 2]! * 1e3)}`;
    if (gesehen.has(k)) doppelt++;
    gesehen.add(k);
  }
  return doppelt;
}
/** die Rechnung von heute bis zur Ruhe: Linien auf ihre Pfade, dann Runden; zurück: Runden, und ob sie steht */
function rechnen(h: Haut, loops: readonly Loop[], ende = 120): { runden: number; steht: boolean } {
  const z = new LoopZug(h, loops, null, true, 'kurven', 'geometrie', {});
  const versch = loops.map((l) => {
    const p = pfadLagen(l) ?? Float64Array.from(l.ruhe);
    return Float64Array.from(p, (x, k) => x - l.ruhe[k]!);
  });
  for (let s = 1; s <= 10; s++) z.schritt(versch.map((d) => d.map((x) => (x * s) / 10)), 2);
  for (let r = 0; r < ende; r++) {
    const vor = Float64Array.from(h.pos);
    z.schritt(versch, 1);
    let w = 0;
    for (let i = 0; i < vor.length; i += 3) w = Math.max(w, Math.hypot(h.pos[i]! - vor[i]!, h.pos[i + 1]! - vor[i + 1]!, h.pos[i + 2]! - vor[i + 2]!));
    if (!Number.isFinite(w)) throw new Error('die Haut ist nicht endlich');
    if (w < 0.02) return { runden: r + 1, steht: true };
  }
  return { runden: ende, steht: false };
}

describe('das Maul als echte Form', () => {
  it('aus einer Linie: geschlossene Haut, genaue Spiegelpaare, kein Punkt auf einem anderen, Lippen als Zwillinge', async () => {
    const wasm = await manifoldLaden();
    const d = kugel();
    const mk = mittlereKante(d.h);
    // vom Mundwinkel (in der Kugel) nach vorn links hinaus; kreuzt den waagerechten Ring und die Mitte
    const linie = [
      { x: -50, y: 20 },
      { x: -100, y: 0 },
      { x: -150, y: -18 },
      { x: -190, y: -30 },
    ];
    const r = maulSchneidenMit(wasm, { haut: d.h, loops: d.loops }, linie, { ...IDS, mk });
    if ('fehler' in r) throw new Error(r.fehler);
    expect(kantenFehler(r.haut)).toBe(0);
    expect(paarFehler(r.haut)).toBe(0);
    expect(amSelbenOrt(r.haut)).toBe(0);
    // die Mittelkante trennt das Netz weiter in zwei Hälften (daran liest die Anzeige, welche Hälfte vorn liegt)
    const seiten = hautSeiten(r.haut);
    expect(seiten).not.toBeNull();
    let vorn = 0;
    let hinten = 0;
    let mitteZahl = 0;
    for (let v = 0; v < r.haut.n; v++) {
      if (seiten![v] === 1) vorn++;
      else if (seiten![v] === -1) hinten++;
      else mitteZahl++;
    }
    expect(vorn).toBe(hinten);
    expect(mitteZahl).toBeGreaterThan(10);
    // die Lippe: der letzte Loop, hart, ein Maul aus einer Linie mit dem Haarspalt, ihr Mundwinkel in der Mitte ihrer Punkte
    const lippe = r.loops[r.loops.length - 1]!;
    expect(lippe.id).toBe(r.lippe);
    expect(lippe.kante).toBe(true);
    expect(istMaulLinie(lippe)).toBe(true);
    expect(lippe.maulLinie).toBe(MAUL_HAAR);
    const zw = zwillinge(lippe);
    expect(zw).not.toBeNull();
    expect(zw!.paare.length).toBeGreaterThanOrEqual(1);
    expect(zwillingsFehler(lippe, 'erste')!).toBeLessThan(1e-9);
    // im Maul: die Rachenlinie (hart) und die Mitte von Gaumen und Boden (in der Spiegelebene); jede Linie hat ihren Pfad
    expect(r.loops.filter((l) => l.kante && l !== lippe).length).toBe(1);
    for (const l of r.loops) {
      expect(hatPfad(l)).toBe(true);
      expect(pfadAbweichung(l)).toBeLessThan(1);
    }
    // die Linien der Form, die das Maul kreuzen, sind an der Lippe geschnitten
    expect(r.geschnitten).toBeGreaterThanOrEqual(2);
    expect(r.loops.length).toBeGreaterThan(d.loops.length + 3);
    // welcher Kiefer: Die Tasche ist in Gaumen und Boden getrennt, beide Seiten kommen vor
    const profil = new Profil([...linie]);
    const sk = kieferSeiten(r.haut, r.loops, r.lippe, { profil, C: linie[0]! });
    expect(sk.getrennt).toBe(true);
    let innenLinks = 0;
    let innenRechts = 0;
    for (let v = 0; v < r.haut.n; v++) {
      if (sk.aussen[v]) continue;
      if (sk.seite[v]! > 0) innenLinks++;
      else innenRechts++;
    }
    expect(innenLinks).toBeGreaterThan(5);
    expect(innenRechts).toBeGreaterThan(5);
  });

  it('danach: Nadeln weg, die Rechnung kommt zur Ruhe, die Kugel bleibt eine Kugel', async () => {
    const wasm = await manifoldLaden();
    const d = kugel();
    const mk = mittlereKante(d.h);
    const linie = [
      { x: -50, y: 20 },
      { x: -100, y: 0 },
      { x: -150, y: -18 },
      { x: -190, y: -30 },
    ];
    const r = maulSchneidenMit(wasm, { haut: d.h, loops: d.loops }, linie, { ...IDS, mk });
    if ('fehler' in r) throw new Error(r.fehler);
    const n = nadelnZusammenlegen(r.haut, r.loops, mk);
    const h = n ? n.haut : r.haut;
    const loops = n ? n.loops : r.loops;
    expect(kantenFehler(h)).toBe(0);
    expect(paarFehler(h)).toBe(0);
    const e = rechnen(h, loops);
    expect(e.steht).toBe(true);
    expect(paarFehler(h)).toBe(0);
    // außen bleibt die Kugel: kein Punkt weiter als 4 vom Radius (ohne Maul liegt die gerechnete Kugel bis rund 2 daneben)
    const profil = new Profil([...linie]);
    const lippe = loops.find((l) => istMaulLinie(l))!;
    const sk = kieferSeiten(h, loops, lippe.id, { profil, C: linie[0]! });
    let weit = 0;
    for (let v = 0; v < h.n; v++) {
      if (!sk.aussen[v]) continue;
      weit = Math.max(weit, Math.abs(Math.hypot(h.pos[3 * v]!, h.pos[3 * v + 1]!, h.pos[3 * v + 2]!) - R));
    }
    expect(weit).toBeLessThan(4);
    // die Lippen sind nach dem Rechnen noch Zwillinge
    expect(zwillingsFehler(lippe, 'erste')!).toBeLessThan(1e-9);
  });

  it('sagt, warum es nicht geht: die Linie trifft die Form nicht', async () => {
    const wasm = await manifoldLaden();
    const d = kugel();
    const mk = mittlereKante(d.h);
    const r = maulSchneidenMit(
      wasm,
      { haut: d.h, loops: d.loops },
      [
        { x: -300, y: 0 },
        { x: -400, y: 0 },
      ],
      { ...IDS, mk },
    );
    expect('fehler' in r).toBe(true);
  });
});
