// Flache Dreiecke an den Linien (10.11.2026, G5). Gemessen blieben nach dem Aufräumen an den Linien Dreiecke ohne Fläche stehen (drei
// aufeinanderfolgende Punkte einer Linie als Dreieck, der mittlere mit drei Nachbarn). Sie entstanden beim Zusammenlegen. Die Tests
// halten fest: (1) mit dem Schutz entstehen sie nicht, ohne ihn schon (derselbe Fall); (2) vorhandene werden aufgelöst, ohne einen
// Punkt zu bewegen; (3) gleich nach dem Einsetzen eines Loops fallen fast aufeinander liegende Punkte der Linie zusammen, fern der
// Linien bleibt das Netz, wie es ist.
import { describe, expect, it } from 'vitest';
import { loopEinsetzen } from './einsetzen';
import { type Haut, hautAus } from './kurven';
import { type Loop, griffeAnlegen, kreuzungenZwischen, loopAusSchnitt, mittlereKante, punktEinfuegen } from './loops';
import { rundAusSeite } from './rund';
import { nadelnZusammenlegen, verdichten } from './verdichten';

type Schnitt = readonly ['seite' | 'top', readonly [number, number], readonly [number, number]];
/** schräge Schnitte: Sie schneiden viele Ecken des Netzes knapp ab */
const SCHRAEG: Schnitt[] = [
  ['seite', [-200, 17], [200, 31]],
  ['top', [-200, 0], [200, 0]],
  ['seite', [23, 200], [41, -200]],
  ['seite', [-200, 80], [200, 52]],
  ['seite', [-90, 200], [-70, -200]],
];
const ACHSEN: Schnitt[] = [
  ['seite', [-200, 0], [200, 0]],
  ['top', [-200, 0], [200, 0]],
  ['seite', [10, 200], [10, -200]],
];

function kugelMitLoops(dreiecke: number, schnitte: readonly Schnitt[]): { h: Haut; loops: Loop[]; MK: number } {
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
  const MK = mittlereKante(h);
  let loops: Loop[] = [];
  let k = 1;
  for (const [a, A, B] of schnitte) {
    loops.push(loopAusSchnitt(h, a, [A[0], A[1]], [B[0], B[1]], loops.length + 1, 8)!);
    const r = loopEinsetzen(h, loops, loops.length - 1)!;
    h = r.haut;
    loops = r.loops;
    const neu = loops[loops.length - 1]!;
    for (let i = 0; i < loops.length - 1; i++)
      for (const f of kreuzungenZwischen(loops[i]!, loops[i]!.ruhe, neu, neu.ruhe, 0.25 * MK)) {
        punktEinfuegen(loops[i]!, f.sa, k);
        punktEinfuegen(neu, f.sb, k);
        k++;
      }
    griffeAnlegen(neu);
  }
  return { h, loops, MK };
}
const kopie = (h: Haut, loops: readonly Loop[]): { h: Haut; loops: Loop[] } => ({
  h: { ...h, pos: Float64Array.from(h.pos) },
  loops: loops.map((l) => ({ ...l, ruhe: Float64Array.from(l.ruhe), punkte: l.punkte.map((p) => ({ ...p })) })),
});

/** Punkte auf den Linien (samt Spiegelbild) */
function aufLinien(h: Haut, loops: readonly Loop[]): Uint8Array {
  const kette = new Uint8Array(h.n);
  for (const l of loops)
    for (const p of l.proben) {
      kette[p.ecken[0]] = 1;
      const s = h.spiegel[p.ecken[0]]!;
      if (s >= 0) kette[s] = 1;
    }
  return kette;
}
/**
 * `flach`: Dreiecke unter 5°, deren drei Ecken auf Linien liegen und die keine sehr kurze Kante haben; `nadel`: unter 5° mit einer
 * Kante unter 0,11 Startkanten zwischen zwei Punkten auf Linien; `wenig`: Punkte mit höchstens drei Nachbarn
 */
function zaehlen(h: Haut, loops: readonly Loop[], MK: number): { flach: number; nadel: number; unter1: number; wenig: number } {
  const P = h.pos;
  const T = h.tri;
  const kette = aufLinien(h, loops);
  const L = (a: number, b: number) => Math.hypot(P[3 * a]! - P[3 * b]!, P[3 * a + 1]! - P[3 * b + 1]!, P[3 * a + 2]! - P[3 * b + 2]!);
  let flach = 0;
  let nadel = 0;
  let unter1 = 0;
  for (let t = 0; t < T.length / 3; t++) {
    const e = [T[3 * t]!, T[3 * t + 1]!, T[3 * t + 2]!];
    const l = [L(e[1]!, e[2]!), L(e[2]!, e[0]!), L(e[0]!, e[1]!)];
    let wmin = 180;
    for (let k = 0; k < 3; k++) {
      const a = l[k]!;
      const b = l[(k + 1) % 3]!;
      const c = l[(k + 2) % 3]!;
      wmin = Math.min(wmin, (Math.acos(Math.max(-1, Math.min(1, (b * b + c * c - a * a) / Math.max(1e-30, 2 * b * c)))) * 180) / Math.PI);
    }
    if (wmin < 1) unter1++;
    if (wmin >= 5) continue;
    const k = e.filter((v) => kette[v]).length;
    const kurz = Math.min(...l) < 0.11 * MK;
    if (!kurz && k === 3) flach++;
    else if (kurz && k >= 2) nadel++;
  }
  return { flach, nadel, unter1, wenig: h.nachbarn.filter((x) => x.length <= 3).length };
}
/** geschlossen (jede Kante zwei Dreiecke) und spiegelgleich (Partner gespiegelt gelegen, Mitte bei z = 0; wie das Startnetz auf 1e-9) */
function heil(h: Haut): { offen: number; schief: boolean } {
  const z = new Map<number, number>();
  for (let t = 0; t < h.tri.length; t += 3)
    for (let e = 0; e < 3; e++) {
      const a = h.tri[t + e]!;
      const b = h.tri[t + ((e + 1) % 3)]!;
      const k = Math.min(a, b) * 4194304 + Math.max(a, b);
      z.set(k, (z.get(k) ?? 0) + 1);
    }
  let offen = 0;
  for (const c of z.values()) if (c !== 2) offen++;
  let schief = 0;
  for (let v = 0; v < h.n; v++) {
    const w = h.spiegel[v]!;
    if (w < 0 || h.spiegel[w] !== v) {
      schief = Infinity;
      continue;
    }
    schief = Math.max(schief, Math.hypot(h.pos[3 * v]! - h.pos[3 * w]!, h.pos[3 * v + 1]! - h.pos[3 * w + 1]!, h.pos[3 * v + 2]! + h.pos[3 * w + 2]!));
  }
  return { offen, schief: schief > 1e-9 };
}

describe('flache Dreiecke an den Linien', () => {
  it('beim Zusammenlegen entstehen sie mit dem Schutz nicht (ohne ihn schon, derselbe Fall)', () => {
    const { h, loops, MK } = kugelMitLoops(2000, SCHRAEG);
    const opt = { kurz: 0.5 * MK, genau: MK / 40 };
    const a = kopie(h, loops);
    const ohne = verdichten(a.h, a.loops, 1.75 * MK, { ...opt, flachSchutz: false })!;
    const zOhne = zaehlen(ohne.haut, ohne.loops, MK);
    // so war es bis zum 10.11.: Der Fall taugt nur, solange er die flachen Dreiecke ohne Schutz wirklich hervorbringt
    expect(zOhne.flach).toBeGreaterThan(8);
    expect(zOhne.wenig).toBeGreaterThan(0);

    const b = kopie(h, loops);
    const mit = verdichten(b.h, b.loops, 1.75 * MK, opt)!;
    const zMit = zaehlen(mit.haut, mit.loops, MK);
    expect(zMit.flach).toBe(0);
    expect(zMit.nadel).toBe(0);
    expect(zMit.unter1).toBe(0);
    expect(zMit.wenig).toBe(0);
    expect(heil(mit.haut)).toEqual({ offen: 0, schief: false });
    // der Schutz verhindert einzelne Zusammenlegungen, er lässt das Netz nicht dichter werden (hier 2 058 Punkte vor dem Verdichten)
    expect(mit.gelegt).toBeGreaterThan(0.9 * ohne.gelegt);
    expect(mit.haut.n).toBeLessThan(1.02 * ohne.haut.n);
    // die Linien behalten ihre Punkte
    mit.loops.forEach((l, i) => expect(l.punkte.length).toBe(loops[i]!.punkte.length));
  });

  it('vorhandene werden aufgelöst, ohne einen Punkt zu bewegen', () => {
    const { h, loops, MK } = kugelMitLoops(2000, SCHRAEG);
    const opt = { kurz: 0.5 * MK, genau: MK / 40 };
    const a = kopie(h, loops);
    const alt = verdichten(a.h, a.loops, 1.75 * MK, { ...opt, flachSchutz: false })!;
    const vorher = zaehlen(alt.haut, alt.loops, MK);
    expect(vorher.flach).toBeGreaterThan(8);
    // dasselbe Netz noch einmal, jetzt mit dem Auflösen: Es ist nichts zu teilen; aufgelöst wird durch Drehen
    const neu = verdichten(alt.haut, alt.loops, 1.75 * MK, { ...opt, drehen: false, entspannen: false });
    expect(neu).not.toBeNull();
    expect(neu!.geloest).toBeGreaterThan(0);
    const nachher = zaehlen(neu!.haut, neu!.loops, MK);
    expect(nachher.flach).toBe(0);
    expect(nachher.wenig).toBe(0);
    expect(heil(neu!.haut)).toEqual({ offen: 0, schief: false });
    // jeder Punkt, der bleibt, liegt genau, wo er lag
    const lagen = new Set<string>();
    for (let v = 0; v < alt.haut.n; v++) lagen.add(`${alt.haut.pos[3 * v]},${alt.haut.pos[3 * v + 1]},${alt.haut.pos[3 * v + 2]}`);
    for (let v = 0; v < neu!.haut.n; v++) expect(lagen.has(`${neu!.haut.pos[3 * v]},${neu!.haut.pos[3 * v + 1]},${neu!.haut.pos[3 * v + 2]}`)).toBe(true);
    // und ein zweites Mal ist nichts mehr aufzulösen (zusammengelegt wird je Aufruf in höchstens drei Runden; davon kann etwas bleiben)
    const noch = verdichten(neu!.haut, neu!.loops, 1.75 * MK, { ...opt, drehen: false, entspannen: false });
    expect(noch?.geloest ?? 0).toBe(0);
    if (noch) expect(zaehlen(noch.haut, noch.loops, MK).flach).toBe(0);
  });

  it('ohne flache Dreiecke bleibt ein ruhiges Netz, wie es ist', () => {
    const { h, loops, MK } = kugelMitLoops(2000, SCHRAEG);
    const opt = { kurz: 0.5 * MK, genau: MK / 40 };
    const a = kopie(h, loops);
    const v = verdichten(a.h, a.loops, 1.75 * MK, opt)!;
    // nichts zu teilen, nichts zusammenzulegen, nichts aufzulösen: dasselbe Netz
    expect(verdichten(v.haut, v.loops, 1.75 * MK, { kurz: 0, genau: MK / 40 })).toBeNull();
  });

  it('gleich nach dem Einsetzen fallen fast aufeinander liegende Punkte der Linie zusammen, fern der Linien bleibt das Netz', () => {
    const { h, loops, MK } = kugelMitLoops(2000, ACHSEN);
    const vorher = zaehlen(h, loops, MK);
    expect(vorher.nadel).toBeGreaterThan(20);
    const a = kopie(h, loops);
    const v = nadelnZusammenlegen(a.h, a.loops, MK)!;
    expect(v).not.toBeNull();
    expect(v.neu).toBe(0);
    expect(v.gedreht).toBe(0);
    expect(v.gelegt).toBeGreaterThan(10);
    const nachher = zaehlen(v.haut, v.loops, MK);
    expect(nachher.nadel).toBe(0);
    expect(nachher.flach).toBe(0);
    expect(nachher.wenig).toBe(0);
    expect(heil(v.haut)).toEqual({ offen: 0, schief: false });
    // die Linien behalten ihre Punkte und Kreuzungen
    v.loops.forEach((l, i) => {
      expect(l.punkte.length).toBe(loops[i]!.punkte.length);
      expect(l.punkte.map((p) => p.kreuzung)).toEqual(loops[i]!.punkte.map((p) => p.kreuzung));
    });
    // kein Punkt wurde bewegt (Zusammenlegen lässt den bleibenden Punkt, wo er ist; entspannt wird hier nicht)
    const lagen = new Set<string>();
    for (let w = 0; w < h.n; w++) lagen.add(`${h.pos[3 * w]},${h.pos[3 * w + 1]},${h.pos[3 * w + 2]}`);
    for (let w = 0; w < v.haut.n; w++) expect(lagen.has(`${v.haut.pos[3 * w]},${v.haut.pos[3 * w + 1]},${v.haut.pos[3 * w + 2]}`)).toBe(true);
    // weggefallen ist nur, was auf einer Linie oder gleich neben ihr lag (höchstens 0,22 Startkanten von einem Punkt einer Linie)
    const kette = aufLinien(h, loops);
    const geblieben = new Set<string>();
    for (let w = 0; w < v.haut.n; w++) geblieben.add(`${v.haut.pos[3 * w]},${v.haut.pos[3 * w + 1]},${v.haut.pos[3 * w + 2]}`);
    for (let w = 0; w < h.n; w++) {
      if (geblieben.has(`${h.pos[3 * w]},${h.pos[3 * w + 1]},${h.pos[3 * w + 2]}`)) continue;
      const nah = kette[w] === 1 || h.nachbarn[w]!.some((u) => kette[u] === 1 && Math.hypot(h.pos[3 * w]! - h.pos[3 * u]!, h.pos[3 * w + 1]! - h.pos[3 * u + 1]!, h.pos[3 * w + 2]! - h.pos[3 * u + 2]!) < 0.22 * MK);
      expect(nah).toBe(true);
    }
    // ein zweites Mal ist nichts mehr zu tun
    expect(nadelnZusammenlegen(v.haut, v.loops, MK)).toBeNull();
  });
});
