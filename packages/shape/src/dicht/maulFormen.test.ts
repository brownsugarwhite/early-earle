import { describe, expect, it } from 'vitest';
import { loopEinsetzen } from './einsetzen';
import { type Haut, type V3, hautAus } from './kurven';
import { falten } from './kurvenFaelle';
import { type Loop, formAusZeichnung, griffeAnlegen, griffeBei, istSichtbar, knickAm, loopAusSchnitt, mittlereKante, pfadLagen, punktEinfuegen } from './loops';
import { type MaulGeformt, maulFormen, maulFormenSchritte } from './maulFormen';
import { rundAusSeite } from './rund';
import type { UmrissPunkt } from './umriss';

const log = (...a: unknown[]) => (globalThis as unknown as { console: { log: (...x: unknown[]) => void } }).console.log(...a);
const kreis = (r: number): UmrissPunkt[] => [
  { x: r, y: 0 },
  { x: 0, y: r },
  { x: -r, y: 0 },
  { x: 0, y: -r },
];
const lage = (P: ArrayLike<number>, v: number): V3 => ({ x: P[3 * v]!, y: P[3 * v + 1]!, z: P[3 * v + 2]! });

/**
 * Kugel mit einer schmalen Form ums Maul, in der Seite vorn über den Umriss gezeichnet (wie im Fenster mit F), mit Griffen;
 * `mitMitte`: vorher eine Mittellinie mit vier Punkten (wie von Hand gezogen und gesetzt)
 */
function maulKugel(mitMitte = false): { haut: Haut; loops: Loop[]; maul: Loop } {
  const netz = rundAusSeite(kreis(150), { dreiecke: 3000 });
  let h = hautAus(netz.positionen, netz.indizes);
  let loops: Loop[] = [];
  if (mitMitte) {
    const r = loopEinsetzen(h, [loopAusSchnitt(h, 'top', [-600, 0], [600, 0], 1, 8)!], 0)!;
    h = r.haut;
    loops = r.loops;
    const m = loops[0]!;
    for (let k = 0; k < 4; k++) punktEinfuegen(m, ((k + 0.5) / 4) * m.laenge);
    griffeAnlegen(m, m.ruhe, true);
  }
  const n = 64;
  const uv = Array.from({ length: n }, (_, i): [number, number] => [-115 + 60 * Math.cos((2 * Math.PI * i) / n), -20 + 14 * Math.sin((2 * Math.PI * i) / n)]);
  const knoten = Array.from({ length: n / 8 }, (_, i) => 8 * i);
  const r = loopEinsetzen(h, [...loops, formAusZeichnung(h, 'seite', uv, knoten, 2)!], loops.length)!;
  const maul = r.loops[r.loops.length - 1]!;
  griffeAnlegen(maul, maul.ruhe, true);
  return { haut: r.haut, loops: r.loops, maul };
}

/** verfeinert wird unterwegs wie im Fenster nach einem Zug (ohne das trägt die Fläche zwischen den Lippen die Form nicht) */
const wieImFenster = (haut: Haut) => {
  const mk = mittlereKante(haut) / 1.3;
  return { maxKante: 1.75 * mk, opt: { kurz: 0.5 * mk, genau: mk / 40, genauHaut: true, genauFlaeche: mk / 16, flachSchutz: true } };
};

/**
 * Das Maul von der Seite, im Schnitt durch die Mitte: der Knick der Haut an beiden Lippen (Grad) und wie tief die Tasche reicht
 * (Anteil des Wegs von der Mitte zwischen den Lippen zum Mundwinkel)
 */
function schnitt(h: Haut, L: Loop): { knick: number[]; tiefe: number } {
  const enden = [L.proben[0]!.ecken[0], L.proben[L.proben.length - 1]!.ecken[0]];
  const inMitte = (v: number): number[] => h.nachbarn[v]!.filter((u) => Math.abs(h.pos[3 * u + 2]!) < 1e-6);
  const knick = enden.map((v) => {
    const p = lage(h.pos, v);
    const r = inMitte(v).map((u) => ({ x: h.pos[3 * u]! - p.x, y: h.pos[3 * u + 1]! - p.y }));
    expect(r.length).toBe(2);
    const c = (r[0]!.x * r[1]!.x + r[0]!.y * r[1]!.y) / (Math.hypot(r[0]!.x, r[0]!.y) * Math.hypot(r[1]!.x, r[1]!.y));
    return 180 - (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI;
  });
  const a = lage(h.pos, enden[0]!);
  const b = lage(h.pos, enden[1]!);
  const W = L.punkte.find((p) => p.mundwinkel)!;
  const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const zu = { x: W.ref.x - m.x, y: W.ref.y - m.y };
  const w2 = zu.x * zu.x + zu.y * zu.y;
  // von der einen Lippe den Schnitt entlang zur anderen, auf dem kürzeren Weg (durchs Maul)
  let tiefe = 0;
  let kurz = Infinity;
  for (const erster of inMitte(enden[0]!)) {
    let vor = enden[0]!;
    let v = erster;
    let t = 0;
    let zahl = 0;
    while (v !== enden[1] && zahl < 5000) {
      const q = lage(h.pos, v);
      t = Math.max(t, ((q.x - m.x) * zu.x + (q.y - m.y) * zu.y) / w2);
      const weiter = inMitte(v).find((u) => u !== vor);
      if (weiter === undefined) break;
      vor = v;
      v = weiter;
      zahl++;
    }
    if (v === enden[1] && zahl < kurz) {
      kurz = zahl;
      tiefe = t;
    }
  }
  return { knick, tiefe };
}

/** Was an jedem geformten Maul gilt */
function pruefen(r: MaulGeformt, maulId: number): Loop {
  const L = r.loops.find((l) => l.id === maulId)!;
  expect(L.kante).toBe(true);
  expect(L.maulGeformt).toBe(true);
  expect(L.punkte.filter((p) => p.mundwinkel).length).toBe(1);
  expect(r.steht).toBe(true);
  for (let v = 0; v < r.haut.n; v++) expect(r.haut.spiegel[v]).toBeGreaterThanOrEqual(0);
  for (let k = 0; k < r.haut.pos.length; k++) expect(Number.isFinite(r.haut.pos[k])).toBe(true);
  // die Lippenlinie läuft an der Mitte rund durch (Griffe quer zur Mittelebene)
  for (const i of [0, L.punkte.length - 1]) {
    const g = griffeBei(L, i);
    expect(knickAm(L, i)).toBe(0);
    expect(Math.hypot(g.aus!.x, g.aus!.y)).toBeLessThan(1e-6 * Math.abs(g.aus!.z));
  }
  // jede Linie liegt im Netz auf ihrem Pfad
  for (const l of r.loops) {
    const P = pfadLagen(l)!;
    let neben = 0;
    for (let k = 0; k < P.length; k += 3) neben = Math.max(neben, Math.hypot(P[k]! - l.ruhe[k]!, P[k + 1]! - l.ruhe[k + 1]!, P[k + 2]! - l.ruhe[k + 2]!));
    expect(neben).toBeLessThan(0.5);
  }
  return L;
}

describe('Maul formen (wie von Hand: Lippen hart, an den Lippen knickt die Haut ins Maul, keine Punkte im Maul)', () => {
  it('an der Kugel ohne weitere Linien: dazu kommt nur die Mittellinie mit ihren zwei Punkten an den Lippen', () => {
    const { haut, loops, maul } = maulKugel();
    const vorher = Float64Array.from(haut.pos);
    const sichtbarVorher = maul.punkte.filter(istSichtbar).length;
    // in Schritten, wie das Fenster es zeigt
    const lauf = maulFormenSchritte(haut, loops, maul.id, { naechsteId: 3, naechsteKreuzung: 1, verdichten: wieImFenster(haut) });
    let zwischen = 0;
    let erster: boolean | null = null;
    let schritt = lauf.next();
    while (!schritt.done) {
      if (erster === null) erster = schritt.value.netzNeu;
      zwischen++;
      schritt = lauf.next();
    }
    const r = schritt.value;
    if ('fehler' in r) throw new Error(r.fehler);
    expect(erster).toBe(true);
    expect(zwischen).toBeGreaterThan(100);
    // die Eingaben bleiben, wie sie waren
    expect(Array.from(haut.pos)).toEqual(Array.from(vorher));
    expect(maul.kante).toBeUndefined();
    const L = pruefen(r, maul.id);
    expect(r.loops.length).toBe(2);
    expect(r.mitteNeu).toBe(true);
    const M = r.loops.find((l) => l.id === r.mitte)!;
    expect(M.art).toBe('mitte');
    expect(M.punkte.length).toBe(2);
    for (let i = 0; i < 2; i++) expect(Math.abs(knickAm(M, i) - 95)).toBeLessThan(0.01);
    expect(L.punkte.filter(istSichtbar).length).toBeLessThanOrEqual(sichtbarVorher + 1);
    const s = schnitt(r.haut, L);
    const f = falten(r.haut);
    log(
      `Maul geformt (Kugel ohne Linien): ${r.haut.n} Punkte, ${r.runden} Runden, ${zwischen} Zwischenstände; Knick an den Lippen ${s.knick.map((x) => x.toFixed(1)).join('° und ')}°, ` +
        `Tasche ${s.tiefe.toFixed(2)} des Wegs zum Mundwinkel; umgeschlagen ${f.umgeklappt}`,
    );
    // Florian: „von der Seite mit je 90 bis 100 Grad eingeknickt“ (im Netz gemessen: je nach Maschen ein paar Grad neben den 95° der Linie)
    for (const k of s.knick) {
      expect(k).toBeGreaterThan(85);
      expect(k).toBeLessThan(110);
    }
    expect(s.tiefe).toBeGreaterThan(0.4);
    expect(f.umgeklappt).toBeLessThanOrEqual(12);
  }, 120000);

  it('ohne die Mittellinie (zum Ansehen): läuft durch oder sagt, dass die Haut so nicht zur Ruhe kommt', () => {
    const { haut, loops, maul } = maulKugel();
    const r = maulFormen(haut, loops, maul.id, { naechsteId: 3, naechsteKreuzung: 1, verdichten: wieImFenster(haut), ohneMitte: true });
    if ('fehler' in r) {
      log(`Maul formen ohne Mittellinie: ${r.fehler}`);
      expect(r.fehler).toMatch(/Ruhe|Netz/);
      return;
    }
    expect(r.loops.length).toBe(1);
    expect(r.mitte).toBe(-1);
    expect(r.loops[0]!.punkte.every((p) => p.kreuzung === undefined)).toBe(true);
    for (let k = 0; k < r.haut.pos.length; k++) expect(Number.isFinite(r.haut.pos[k])).toBe(true);
    const s = schnitt(r.haut, r.loops[0]!);
    log(`Maul formen ohne Mittellinie: Knick an den Lippen ${s.knick.map((x) => x.toFixed(1)).join('° und ')}°, Tasche ${s.tiefe.toFixed(2)} (nicht eingestellt: ergibt sich)`);
  }, 120000);

  it('mit einer Mittellinie, die es schon gibt: Sie knickt an beiden Lippen um 95° ins Maul, der Körper dahinter bleibt', () => {
    const { haut, loops, maul } = maulKugel(true);
    const vorher = Float64Array.from(haut.pos);
    const mittePunkte = loops[0]!.punkte.length;
    const r = maulFormen(haut, loops, maul.id, { naechsteId: 3, naechsteKreuzung: 1, verdichten: wieImFenster(haut) });
    if ('fehler' in r) throw new Error(r.fehler);
    const L = pruefen(r, maul.id);
    expect(r.loops.length).toBe(2);
    expect(r.mitteNeu).toBe(false);
    expect(r.mitte).toBe(loops[0]!.id);
    const M = r.loops.find((l) => l.id === r.mitte)!;
    // dazu kommen nur die zwei Punkte an den Lippen; dort knickt die Mittellinie um 95°
    expect(M.punkte.length).toBe(mittePunkte + 2);
    for (const k of [L.punkte[0]!.kreuzung, L.punkte[L.punkte.length - 1]!.kreuzung]) {
      const i = M.punkte.findIndex((p) => p.kreuzung === k);
      expect(i).toBeGreaterThanOrEqual(0);
      expect(Math.abs(knickAm(M, i) - 95)).toBeLessThan(0.01);
    }
    let aussen = 0;
    for (let v = 0; v < r.haut.n; v++) {
      const a = r.alt[v]!;
      if (a < 0 || vorher[3 * a]! < -40) continue;
      aussen = Math.max(aussen, Math.hypot(r.haut.pos[3 * v]! - vorher[3 * a]!, r.haut.pos[3 * v + 1]! - vorher[3 * a + 1]!, r.haut.pos[3 * v + 2]! - vorher[3 * a + 2]!));
    }
    const s = schnitt(r.haut, L);
    log(
      `Maul geformt (Kugel mit Mittellinie, ${mittePunkte} Punkte): ${r.haut.n} Punkte, ${r.runden} Runden; Knick an den Lippen ${s.knick.map((x) => x.toFixed(1)).join('° und ')}°, ` +
        `Tasche ${s.tiefe.toFixed(2)}; hinter dem Maul (x > −40) bewegt sich die Haut um höchstens ${aussen.toFixed(2)}; umgeschlagen ${falten(r.haut).umgeklappt}`,
    );
    for (const k of s.knick) {
      expect(k).toBeGreaterThan(85);
      expect(k).toBeLessThan(110);
    }
    expect(s.tiefe).toBeGreaterThan(0.4);
    expect(aussen).toBeLessThan(8);
    expect(falten(r.haut).umgeklappt).toBeLessThanOrEqual(12);
  }, 120000);

  it('sagt, warum es nicht geht: kein Ring, oder ein Ring ohne Griffe', () => {
    const { haut, loops, maul } = maulKugel();
    expect(maulFormen(haut, loops, 99, { naechsteId: 3, naechsteKreuzung: 1 })).toHaveProperty('fehler');
    const ohne: Loop = { ...maul, punkte: maul.punkte.map((p) => ({ s: p.s, ref: p.ref, cur: p.cur })) };
    expect(maulFormen(haut, [ohne], maul.id, { naechsteId: 3, naechsteKreuzung: 1 })).toHaveProperty('fehler');
  });
});
