// Verfeinern im Hintergrund (G4, 10.11.2026): Der Auftrag rechnet dasselbe wie die Schritte einzeln im Fenster, übersteht die Grenze
// zum Worker (structuredClone, große Felder ohne Kopie) und meldet „leer“, wenn nichts zu verfeinern ist.
import {
  type Haut,
  type Loop,
  LoopZug,
  einbetten,
  festlegen,
  griffeAnlegen,
  hautAus,
  kreuzungenZwischen,
  loopAusSchnitt,
  loopEinsetzen,
  mittlereKante,
  punktEinfuegen,
  rundAusSeite,
  verdichten,
  zerlegungsDaten,
} from '@ee/shape/dicht';
import { describe, expect, it } from 'vitest';
import { type VerfeinerAuftrag, felderZumUebergeben, gewichteAusFlach, hautAusFlach, hautFlach, nachbarnFlach, verfeinern } from './verfeinern';

/** Kugel mit zwei Loops (Ring waagerecht, Mitte), Kreuzungen als Punkte, Griffe angelegt; wie im Fenster nach zweimal L */
function kugelMitLoops(dreiecke: number): { h: Haut; loops: Loop[] } {
  const n = rundAusSeite(
    [
      { x: 150, y: 0 },
      { x: 0, y: 150 },
      { x: -150, y: 0 },
      { x: 0, y: -150 },
    ],
    { dreiecke },
  );
  let h = hautAus(n.positionen, n.indizes);
  let loops: Loop[] = [];
  for (const [a, A, B] of [
    ['seite', [-200, 0], [200, 0]],
    ['top', [-200, 0], [200, 0]],
  ] as const) {
    loops.push(loopAusSchnitt(h, a, [A[0], A[1]], [B[0], B[1]], loops.length + 1, 8)!);
    const r = loopEinsetzen(h, loops, loops.length - 1)!;
    h = r.haut;
    loops = r.loops;
  }
  const tol = 0.25 * mittlereKante(h);
  let k = 1;
  for (const f of kreuzungenZwischen(loops[0]!, loops[0]!.ruhe, loops[1]!, loops[1]!.ruhe, tol)) {
    punktEinfuegen(loops[0]!, f.sa, k);
    punktEinfuegen(loops[1]!, f.sb, k);
    k++;
  }
  for (const l of loops) griffeAnlegen(l);
  return { h, loops };
}

/** die Haut nach vorn gestreckt (wie nach einem weiten Zug), die Linien neu festgelegt */
function gestreckt(dreiecke: number): { h: Haut; loops: Loop[]; mk: number } {
  const { h, loops } = kugelMitLoops(dreiecke);
  const mk = mittlereKante(h);
  for (let v = 0; v < h.n; v++) if (h.pos[3 * v]! > 0) h.pos[3 * v] = h.pos[3 * v]! * 2.2;
  for (const l of loops) festlegen(h, l, true);
  return { h, loops, mk };
}

const auftragFuer = (h: Haut, loops: Loop[], mk: number, kurz: number, maxKante = 1.75 * mk): VerfeinerAuftrag => ({
  id: 7,
  haut: hautFlach(h),
  loops,
  maxKante,
  opt: { verborgen: null, kurz },
  kruemmung: true,
  gewichte: 'geometrie',
  loeserOpt: {},
});

describe('Verfeinern im Hintergrund', () => {
  it('die flache Haut ist dieselbe Haut', () => {
    const { h } = kugelMitLoops(1200);
    const f = hautFlach(h);
    expect(f.pos).not.toBe(h.pos);
    const zurueck = hautAusFlach(f);
    expect(Array.from(zurueck.pos)).toEqual(Array.from(h.pos));
    expect(zurueck.tri).toBe(h.tri);
    expect(zurueck.nachbarn).toEqual(h.nachbarn);
    expect(zurueck.spiegel).toBe(h.spiegel);
    const nb = nachbarnFlach(h);
    expect(nb.nbStart[h.n]).toBe(nb.nb.length);
  });

  it('rechnet dasselbe wie die Schritte einzeln, auch über die Grenze zum Worker', () => {
    const { h, loops, mk } = gestreckt(1200);
    // einzeln, wie bis zum 10.11. im Fenster
    const v = verdichten(h, loops, 1.75 * mk, { verborgen: null, kurz: 0.5 * mk })!;
    expect(v).not.toBeNull();
    const einbettung = einbetten(h, v.haut.pos, { nachbarn: v.haut.nachbarn, alt: v.alt });
    const einzeln = new LoopZug(v.haut, v.loops, null, true, 'kurven', 'geometrie', { nurZeilen: true }).auftrag!;
    const daten = einzeln.systeme.map((s) => zerlegungsDaten(s.n, s.zeilen, s.daempfung));

    // als Auftrag, hin und zurück wie durch `postMessage`
    const auftrag = auftragFuer(h, loops, mk, 0.5 * mk);
    const hin = structuredClone(auftrag, { transfer: [auftrag.haut.pos.buffer as ArrayBuffer] });
    const roh = verfeinern(hin);
    const felder = felderZumUebergeben(roh);
    expect(new Set(felder).size).toBe(felder.length);
    const r = structuredClone(roh, { transfer: felder as ArrayBuffer[] });
    expect(r.leer).toBe(false);
    if (r.leer) return;
    // übergeben, nicht kopiert: Die Felder des Absenders sind leer
    if (!roh.leer) expect(roh.haut.pos.byteLength).toBe(0);

    const neu = hautAusFlach(r.haut);
    expect(neu.n).toBe(v.haut.n);
    expect(neu.n).toBeGreaterThan(h.n);
    expect(Array.from(neu.pos)).toEqual(Array.from(v.haut.pos));
    expect(Array.from(neu.tri)).toEqual(Array.from(v.haut.tri));
    expect(Array.from(neu.spiegel)).toEqual(Array.from(v.haut.spiegel));
    expect(neu.nachbarn).toEqual(v.haut.nachbarn);
    expect(Array.from(r.alt)).toEqual(Array.from(v.alt));
    expect(r.neu).toBe(v.neu);
    expect(r.gelegt).toBe(v.gelegt);
    expect(Array.from(r.einbettung.tri)).toEqual(Array.from(einbettung.tri));
    expect(Array.from(r.einbettung.b)).toEqual(Array.from(einbettung.b));
    expect(Array.from(r.einbettung.o)).toEqual(Array.from(einbettung.o));
    const gew = gewichteAusFlach(r.gewStart, r.gewWert);
    expect(gew.length).toBe(einzeln.gew.length);
    for (let p = 0; p < gew.length; p++) expect(Array.from(gew[p]!)).toEqual(Array.from(einzeln.gew[p]!));
    expect(r.daten.length).toBe(daten.length);
    r.daten.forEach((d, i) => {
      expect(d.n).toBe(daten[i]!.n);
      expect(Array.from(d.perm)).toEqual(Array.from(daten[i]!.perm));
      expect(Array.from(d.Lp)).toEqual(Array.from(daten[i]!.Lp));
      expect(Array.from(d.Lx)).toEqual(Array.from(daten[i]!.Lx));
    });
    // die Loops des feineren Netzes: Proben und Stellen wie einzeln
    r.loops.forEach((l, i) => {
      expect(l.proben).toEqual(v.loops[i]!.proben);
      expect(Array.from(l.s)).toEqual(Array.from(v.loops[i]!.s));
      expect(Array.from(l.ruhe)).toEqual(Array.from(v.loops[i]!.ruhe));
    });
  });

  it('meldet „leer“, wenn nichts zu verfeinern ist', () => {
    const { h, loops } = kugelMitLoops(1200);
    const mk = mittlereKante(h);
    // die unberührte Kugel ohne Zusammenlegen, mit einer Schwelle über ihrer längsten Kante
    const r = verfeinern(auftragFuer(h, loops, mk, 0, 4 * mk));
    expect(r.leer).toBe(true);
    expect(felderZumUebergeben(r)).toEqual([]);
  });
});
