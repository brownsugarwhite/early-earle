// Verfeinern im Hintergrund (G4, 10.11.2026): Der Auftrag rechnet dasselbe wie die Schritte einzeln im Fenster, übersteht die Grenze
// zum Worker (structuredClone, große Felder ohne Kopie) und meldet „leer“, wenn nichts zu verfeinern ist.
import {
  type Haut,
  type HautVorlage,
  type Loop,
  LoopZug,
  einbetten,
  festlegen,
  griffeAnlegen,
  hatPfad,
  hautAus,
  hautNormalen,
  kreuzungenZwischen,
  loopAusSchnitt,
  loopEinsetzen,
  mittlereKante,
  pfadVersatz,
  punktEinfuegen,
  rundAusSeite,
  systemAusDaten,
  verdichten,
  zerlegungsDaten,
} from '@ee/shape/dicht';
import { describe, expect, it } from 'vitest';
import {
  type AufraeumAuftrag,
  type VerfeinerAuftrag,
  aufgeraeumtZumUebergeben,
  aufraeumen,
  felderZumUebergeben,
  gewichteAusFlach,
  hautAusFlach,
  hautFlach,
  nachbarnFlach,
  verfeinern,
} from './verfeinern';

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

// ---------- Aufräumen nach dem Loslassen (G4.3) ----------

const RUHE = 0.05;
const aufraeumAuftrag = (h: Haut, loops: Loop[], mk: number, maxKante = 1.75 * mk): AufraeumAuftrag => ({
  art: 'aufraeumen',
  id: 3,
  haut: hautFlach(h),
  loops,
  exakt: loops.map((l) => hatPfad(l)),
  verdichten: true,
  maxKante,
  opt: { verborgen: null, kurz: 0.5 * mk, genau: mk / 40, genauHaut: false },
  optNurTeilen: { verborgen: null, kurz: 0, genau: mk / 40, genauHaut: false },
  nachverfeinern: 3,
  kruemmung: true,
  gewichte: 'geometrie',
  loeserOpt: {},
  ruhe: RUHE,
  maxRunden: 12,
});
/** die Vorlage aus dem Ergebnis, wie das Fenster sie baut */
const vorlageAus = (r: ReturnType<typeof aufraeumen>): HautVorlage => ({
  gew: gewichteAusFlach(r.gewStart!, r.gewWert!),
  sys: systemAusDaten(r.daten[0]!),
  cVor: r.daten[1] ? systemAusDaten(r.daten[1]) : null,
  struktur: r.struktur,
});
const genutzt = (z: LoopZug): boolean => (z.loeser as unknown as { vorlageGenutzt: boolean }).vorlageGenutzt;

describe('Aufräumen nach dem Loslassen', () => {
  it('verdichtet, setzt bis zur Ruhe und liefert die Zerlegung für das nächste Greifen', () => {
    const { h, loops, mk } = gestreckt(1200);
    const nAlt = h.n;
    const auftrag = aufraeumAuftrag(h, loops, mk);
    const hin = structuredClone(auftrag, { transfer: [auftrag.haut.pos.buffer as ArrayBuffer] });
    const roh = aufraeumen(hin);
    const r = structuredClone(roh, { transfer: aufgeraeumtZumUebergeben(roh) as ArrayBuffer[] });
    expect(r.geaendert).toBe(true);
    expect(r.durchgaenge).toBeGreaterThanOrEqual(1);
    expect(r.runden).toBeGreaterThanOrEqual(1);
    const neu = hautAusFlach(r.haut!);
    expect(neu.n).toBeGreaterThan(nAlt);
    // die Zuordnung zum alten Netz: gebliebene Punkte vorn, danach nur neue; keine Nummer doppelt
    const alt = Array.from(r.alt!);
    expect(alt.length).toBe(neu.n);
    const m = alt.findIndex((w) => w < 0);
    expect(m).toBeGreaterThan(0);
    expect(alt.slice(m).every((w) => w === -1)).toBe(true);
    expect(alt.slice(0, m).every((w) => w >= 0 && w < nAlt)).toBe(true);
    expect(new Set(alt.slice(0, m)).size).toBe(m);
    // spiegelgleich und endlich
    for (let v = 0; v < neu.n; v++) {
      const w = neu.spiegel[v]!;
      expect(w).toBeGreaterThanOrEqual(0);
      expect(Math.abs(neu.pos[3 * v]! - neu.pos[3 * w]!)).toBeLessThan(1e-6);
      expect(Math.abs(neu.pos[3 * v + 2]! + neu.pos[3 * w + 2]!)).toBeLessThan(1e-6);
    }
    // die Haut steht: Ein neuer Löser mit der mitgelieferten Zerlegung übernimmt sie und bewegt die Form kaum noch
    const fertig = r.loops!;
    const z = new LoopZug(neu, fertig, null, true, 'kurven', 'geometrie', { vorlage: vorlageAus(r) });
    expect(genutzt(z)).toBe(true);
    const vor = Float64Array.from(neu.pos);
    const N = hautNormalen(neu);
    z.schritt(
      fertig.map((l, li) => (hatPfad(l) ? pfadVersatz(l, z.start[li]!) : null)),
      1,
    );
    let weg = 0;
    for (let i = 0; i < vor.length; i += 3)
      weg = Math.max(weg, Math.abs((neu.pos[i]! - vor[i]!) * N[i]! + (neu.pos[i + 1]! - vor[i + 1]!) * N[i + 1]! + (neu.pos[i + 2]! - vor[i + 2]!) * N[i + 2]!));
    expect(weg).toBeLessThan(4 * RUHE);
  });

  it('rechnet dasselbe wie die Schritte einzeln im Fenster', () => {
    const { h, loops, mk } = gestreckt(1200);
    const a = aufraeumAuftrag(h, loops, mk);
    // einzeln: verdichten, setzen bis zur Ruhe, festlegen, nachverfeinern (nur teilen), wieder setzen
    let hh: Haut = { ...h, pos: Float64Array.from(h.pos) };
    let ll = loops;
    const setze = () => {
      const z = new LoopZug(hh, ll, null, true, 'kurven', 'geometrie', {});
      const ziele = ll.map((l, li) => (a.exakt[li] ? pfadVersatz(l, z.start[li]!) : null));
      for (let k = 0; k < a.maxRunden; k++) {
        const vor = Float64Array.from(hh.pos);
        const N = hautNormalen(hh);
        z.schritt(ziele, 1);
        let weg = 0;
        for (let i = 0; i < vor.length; i += 3)
          weg = Math.max(weg, Math.abs((hh.pos[i]! - vor[i]!) * N[i]! + (hh.pos[i + 1]! - vor[i + 1]!) * N[i + 1]! + (hh.pos[i + 2]! - vor[i + 2]!) * N[i + 2]!));
        if (weg < a.ruhe) break;
      }
      ll.forEach((l, li) => festlegen(hh, l, !a.exakt[li]));
    };
    const v = verdichten(hh, ll, a.maxKante, a.opt)!;
    hh = v.haut;
    ll = v.loops;
    for (let k = 0; ; k++) {
      setze();
      if (k >= a.nachverfeinern) break;
      const w = verdichten(hh, ll, a.maxKante, a.optNurTeilen);
      if (!w) break;
      hh = w.haut;
      ll = w.loops;
    }
    const r = aufraeumen(aufraeumAuftrag(h, loops, mk));
    const neu = hautAusFlach(r.haut!);
    expect(neu.n).toBe(hh.n);
    expect(Array.from(neu.tri)).toEqual(Array.from(hh.tri));
    expect(Array.from(neu.pos)).toEqual(Array.from(hh.pos));
    r.loops!.forEach((l, i) => {
      expect(l.proben).toEqual(ll[i]!.proben);
      expect(Array.from(l.ruhe)).toEqual(Array.from(ll[i]!.ruhe));
    });
  });

  it('ohne etwas zu verfeinern kommt nur die Zerlegung zurück, und sie passt zum Stand', () => {
    const { h, loops } = kugelMitLoops(1200);
    const mk = mittlereKante(h);
    const a = { ...aufraeumAuftrag(h, loops, mk, 4 * mk), opt: { verborgen: null, kurz: 0 } };
    const r = aufraeumen(a);
    expect(r.geaendert).toBe(false);
    expect(r.haut).toBeNull();
    expect(r.alt).toBeNull();
    expect(r.daten.length).toBeGreaterThanOrEqual(1);
    const z = new LoopZug(h, loops, null, true, 'kurven', 'geometrie', { vorlage: vorlageAus(r) });
    expect(genutzt(z)).toBe(true);
    // eine Linie wird Kante: Die Vorlage passt nicht mehr, der Löser zerlegt selbst
    loops[0]!.kante = true;
    const z2 = new LoopZug(h, loops, null, true, 'kurven', 'geometrie', { vorlage: vorlageAus(r) });
    expect(genutzt(z2)).toBe(false);
  });
});
