// Plan vom 12.11.2026, Schritt 4b (13.11.): die Rechnung auf der Hälfte (`HautOptionen.halb`). Sie soll dieselbe Form geben wie die
// Rechnung über die ganze Haut, mit denselben Schnittstellen (Vorlage, Auftrag, Struktur). Zeiten misst
// `apps/editor/scripts/pruefen/form-halb.ts` an Florians Formen.
import { describe, expect, it } from 'vitest';
import { systemAusDaten, zerlegungsDaten } from '../loeser/zerlegung';
import { HautAusKurven, type HautOptionen, vorlageAusSystemen } from './ausKurven';
import type { Haut } from './kurven';
import { dreiLoops, falten, randHart, untenHinauf } from './kurvenFaelle';
import { type Loop, LoopZug, loopStruktur } from './loops';

type Fall = { h: Haut; loops: Loop[] };
const kopie = (f: Fall): Fall => ({ h: { ...f.h, pos: Float64Array.from(f.h.pos) }, loops: f.loops.map((l) => ({ ...l, ruhe: Float64Array.from(l.ruhe), punkte: l.punkte.map((p) => ({ ...p, ref: { ...p.ref }, cur: { ...p.cur } })) })) });
/** ein Zug über die ganze Haut nach der Geometrie: in Schritten zur Verschiebung, dann Runden */
function ziehen(f: Fall, versch: (Float64Array | null)[], opt: HautOptionen, schritte = 12, ende = 12): LoopZug {
  const z = new LoopZug(f.h, f.loops, null, true, 'kurven', 'geometrie', opt);
  for (let s = 1; s <= schritte; s++) z.schritt(versch.map((d) => (d ? d.map((x) => (x * s) / schritte) : null)), 2);
  z.schritt(versch, ende);
  return z;
}
function weit(a: Haut, b: Haut): number {
  let m = 0;
  for (let i = 0; i < a.pos.length; i += 3) m = Math.max(m, Math.hypot(a.pos[i]! - b.pos[i]!, a.pos[i + 1]! - b.pos[i + 1]!, a.pos[i + 2]! - b.pos[i + 2]!));
  return m;
}
function spiegelFehler(h: Haut): number {
  let m = 0;
  for (let v = 0; v < h.n; v++) {
    const w = h.spiegel[v]!;
    m = Math.max(m, Math.abs(h.pos[3 * v]! - h.pos[3 * w]!), Math.abs(h.pos[3 * v + 1]! - h.pos[3 * w + 1]!), Math.abs(h.pos[3 * v + 2]! + h.pos[3 * w + 2]!));
  }
  return m;
}

describe('Rechnung auf der Hälfte', () => {
  const start = dreiLoops();
  const zug = untenHinauf(start.loops, 60);

  it('gibt dieselbe Form wie über die ganze Haut', () => {
    const ganz = kopie(start);
    const halb = kopie(start);
    ziehen(ganz, zug, {});
    ziehen(halb, zug, { halb: true });
    // (die Haut hat sich dabei wirklich bewegt)
    expect(weit(ganz.h, start.h)).toBeGreaterThan(20);
    expect(weit(ganz.h, halb.h)).toBeLessThan(0.02);
    expect(spiegelFehler(halb.h)).toBe(0);
    expect(falten(halb.h).umgeklappt).toBe(falten(ganz.h).umgeklappt);
  });

  it('auch mit einer Kante und mit dem Normalfluss (sechs Spalten je Runde)', () => {
    const hart = kopie(start);
    randHart(hart.loops, true);
    for (const opt of [{}, { normalfluss: true }] as HautOptionen[]) {
      const ganz = kopie(hart);
      const halb = kopie(hart);
      ziehen(ganz, zug, opt);
      ziehen(halb, zug, { ...opt, halb: true });
      expect(weit(ganz.h, hart.h)).toBeGreaterThan(20);
      expect(weit(ganz.h, halb.h)).toBeLessThan(0.05);
      expect(spiegelFehler(halb.h)).toBe(0);
    }
  });

  it('Auftrag und Vorlage: zwei Systeme der Lagen und der Vorkonditionierer, eigene Struktur', () => {
    const f = kopie(start);
    const nur = new LoopZug(f.h, f.loops, null, true, 'kurven', 'geometrie', { halb: true, nurZeilen: true });
    const auftrag = nur.auftrag!;
    expect(auftrag.systeme).toHaveLength(3);
    expect(auftrag.struktur.endsWith(':h')).toBe(true);
    expect(auftrag.struktur).toBe(loopStruktur(f.h, f.loops, { halb: true }));
    expect(auftrag.struktur).not.toBe(loopStruktur(f.h, f.loops, {}));
    // die beiden Systeme der Lagen sind etwa halb so groß wie das ganze
    expect(auftrag.systeme[0]!.n + auftrag.systeme[1]!.n).toBe(f.h.n);
    expect(auftrag.systeme[0]!.n).toBeGreaterThan(auftrag.systeme[1]!.n);
    const vorlage = vorlageAusSystemen(
      auftrag.gew,
      auftrag.systeme.map((s) => systemAusDaten(zerlegungsDaten(s.n, s.zeilen, s.daempfung))),
      auftrag.struktur,
    );
    expect(vorlage.sysZ).toBeTruthy();
    // mit der Vorlage rechnet ein Löser auf der Hälfte dasselbe wie ohne; einer über die ganze Haut nimmt sie nicht
    const ohne = kopie(start);
    const mit = kopie(start);
    ziehen(ohne, zug, { halb: true });
    const z = ziehen(mit, zug, { halb: true, vorlage });
    expect((z.loeser as HautAusKurven).vorlageGenutzt).toBe(true);
    expect(weit(ohne.h, mit.h)).toBeLessThan(1e-6);
    const ganz = new LoopZug(kopie(start).h, start.loops, null, true, 'kurven', 'geometrie', { vorlage });
    expect((ganz.loeser as HautAusKurven).vorlageGenutzt).toBe(false);
    // und umgekehrt: eine Vorlage über die ganze Haut gilt nicht für die Hälfte
    const g = kopie(start);
    const ganzVorlage = new LoopZug(g.h, g.loops, null, true, 'kurven', 'geometrie', {}).vorlage!;
    expect(ganzVorlage.sysZ).toBeUndefined();
    const h2 = kopie(start);
    const halb = new LoopZug(h2.h, h2.loops, null, true, 'kurven', 'geometrie', { halb: true, vorlage: ganzVorlage });
    expect((halb.loeser as HautAusKurven).vorlageGenutzt).toBe(false);
  });

  it('hat ein Punkt kein Spiegelbild, rechnet der Löser still über die ganze Haut', () => {
    const f = kopie(start);
    const ohnePartner: Haut = { ...f.h, spiegel: Int32Array.from(f.h.spiegel, (w, v) => (v === 5 ? -1 : w)) };
    const z = new LoopZug(ohnePartner, f.loops, null, true, 'kurven', 'geometrie', { halb: true });
    expect((z.loeser as HautAusKurven).struktur.endsWith(':h')).toBe(false);
    expect(z.vorlage!.sysZ).toBeUndefined();
  });
});
