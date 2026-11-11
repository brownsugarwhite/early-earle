// Normalfluss und Mittelebene (11.11.2026). Florian: „wenn du in der Front den mittleren obersten Punkt bewegst und damit spielst,
// bläst sich das Mesh auf und wird irgendwann zerrissen. Aber nur, wenn ich erst die beiden Loops daneben ziehe und dann erst den in
// der Mitte … Sobald ich die Mittelachse kreuze und dann wieder zurückfahre, wobbelt das Mesh und kommt oft nur sehr zerrissen mit
// schwarzen Rissen zur Ruhe … das muss richtig stabil werden.“ Nachgestellt an seiner gesicherten Form `test_kaputt`:
// (1) Der Loop der Mitte lag dort nur auf der Haut: Das Verdichten hatte zwei Kanten der Mittelebene quer gedreht, er ließ sich
//     nicht einsetzen. Das war die Hauptursache. Die Kette der Punkte der Mittelebene bleibt jetzt geschlossen (Verdichten), und
//     der Loop der Mitte schließt sie beim Einsetzen. Mit eingesetzter Mitte kommt seine Form in 92 von 92 Zügen zur Ruhe.
// (2) Um eine Linie, die nur aufliegt, kommt der Löser nie zur Ruhe (sie bindet Lagen, ist aber keine Quelle der Krümmung), und
//     seine Korrektur schiebt die Punkte der Haut längs der Fläche weiter, beim Hin und Her bis auf die andere Seite der
//     Mittelebene. Für diesen Fall (ein Loop ließ sich nicht einsetzen) rechnet der Löser von selbst mit dem Normalfluss: Die Haut
//     folgt den Linien, und die Korrektur bewegt jeden Punkt nur längs seiner Normale. Mit eingesetzten Linien bringt er an Florians
//     Formen nichts (Firefish 184 statt 188 von 196 Zügen zur Ruhe, ein Viertel mehr Zeit je Runde) und bleibt dort aus.
// (3) Die Linie eines Paars bleibt auf ihrer Seite der Mittelebene.
// (4) Ein verdrehter Griff legt die Linie über sich selbst (`linieKreuztSich`). Das Fenster baut dann Netz und Zerlegung nicht um,
//     bis sie wieder frei liegt: Eine Zerlegung von der gefalteten Haut ließ nach dem Zurückdrehen Knicke zurück.
import { describe, expect, it } from 'vitest';
import { loopEinsetzen } from './einsetzen';
import { type Haut, hautAus } from './kurven';
import {
  type Loop,
  LoopZug,
  griffZiehen,
  griffeAnlegen,
  kreuzungenZwischen,
  linieKreuztSich,
  loopAusSchnitt,
  mitteAbstand,
  mittlereKante,
  pfadLagen,
  punktEinfuegen,
  verschiebungLaengs,
} from './loops';
import { rundAusSeite } from './rund';
import { verdichten } from './verdichten';

function kugel(dreiecke = 1200): Haut {
  const n = rundAusSeite(
    [
      { x: 150, y: 0 },
      { x: 0, y: 150 },
      { x: -150, y: 0 },
      { x: 0, y: -150 },
    ],
    { dreiecke },
  );
  return hautAus(n.positionen, n.indizes);
}

/** Kugel mit zwei Ringen und dem Loop der Mitte; `mitteLose`: Der Loop der Mitte liegt nur auf der Haut (nicht eingesetzt) */
function kugelMitLoops(mitteLose = false): { h: Haut; loops: Loop[] } {
  let h = kugel();
  let loops: Loop[] = [];
  for (const [a, A, B] of [
    ['top', [-200, 0], [200, 0]],
    ['seite', [10, 200], [10, -200]],
    ['seite', [-200, 0], [200, 0]],
  ] as const) {
    const l = loopAusSchnitt(h, a, [A[0], A[1]], [B[0], B[1]], loops.length + 1, 8)!;
    loops.push(l);
    if (l.art === 'mitte' && mitteLose) continue;
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
  for (const l of loops) griffeAnlegen(l);
  return { h, loops };
}

/** Ziele: die obere Kreuzung auf der Mitte um `dy` hinauf */
function zielOben(loops: Loop[], dy: number): (Float64Array | null)[] {
  const m = loops.find((l) => l.art === 'mitte')!;
  const oben = m.punkte.reduce((b, p) => (p.ref.y > b.ref.y ? p : b)).kreuzung!;
  return loops.map((l) => {
    const i = l.punkte.findIndex((p) => p.kreuzung === oben);
    if (i < 0) return null;
    const d = verschiebungLaengs(
      l,
      l.punkte.map((_, q) => (q === i ? { x: 0, y: dy, z: 0 } : { x: 0, y: 0, z: 0 })),
    );
    if (l.art === 'mitte') for (let j = 0; j < l.proben.length; j++) d[3 * j + 2] = 0;
    return d;
  });
}

/** größter Abstand zweier Lagen (je Punkt) */
function abstand(a: Float64Array, b: Float64Array): number {
  let m = 0;
  for (let i = 0; i < a.length; i += 3) m = Math.max(m, Math.hypot(a[i]! - b[i]!, a[i + 1]! - b[i + 1]!, a[i + 2]! - b[i + 2]!));
  return m;
}

/** Punkte, die auf die Seite ihres Spiegelbilds geraten sind (gegen ihre Seite in `vorher`) */
function drueben(vorher: Float64Array, jetzt: Float64Array): number {
  let z = 0;
  for (let i = 2; i < vorher.length; i += 3) if (vorher[i] !== 0 && vorher[i]! * jetzt[i]! < 0) z++;
  return z;
}

/** wie im Fenster: je Mausschritt `je` Runden; die obere Kreuzung über die Wegpunkte (Höhen), am Ende `ruhe` Runden */
function spielen(z: LoopZug, loops: Loop[], weg: readonly number[], je: number, ruhe: number): void {
  let von = 0;
  let d = zielOben(loops, 0);
  for (const nach of weg) {
    for (let s = 1; s <= 12; s++) {
      d = zielOben(loops, von + ((nach - von) * s) / 12);
      for (let q = 0; q < je; q++) z.schritt(d, 1);
    }
    von = nach;
  }
  for (let r = 0; r < ruhe; r++) z.schritt(d, 1);
}

/**
 * Die drei Fälle: Linien eingesetzt (ohne Angabe rechnet der Löser dann wie bis zum 10.11.), Linien eingesetzt mit erzwungenem
 * Normalfluss, und eine Linie, die nur aufliegt (ohne Angabe rechnet der Löser dann von selbst mit dem Normalfluss).
 */
const FAELLE: readonly { name: string; lose: boolean; opt: { normalfluss?: boolean } }[] = [
  { name: 'eingesetzt', lose: false, opt: {} },
  { name: 'eingesetzt, Normalfluss erzwungen', lose: false, opt: { normalfluss: true } },
  { name: 'lose', lose: true, opt: {} },
];

describe('Normalfluss', () => {
  it('von selbst nur, wenn eine Linie nur aufliegt; mit eingesetzten Linien rechnet der Löser Bit für Bit wie ohne ihn', () => {
    for (const lose of [false, true]) {
      const a = kugelMitLoops(lose);
      const b = kugelMitLoops(lose);
      spielen(new LoopZug(a.h, a.loops, null, true, 'kurven', 'geometrie'), a.loops, [50], 5, 10);
      spielen(new LoopZug(b.h, b.loops, null, true, 'kurven', 'geometrie', { normalfluss: lose }), b.loops, [50], 5, 10);
      expect(abstand(a.h.pos, b.h.pos)).toBe(0);
    }
    // Gegenprobe: Die beiden Rechnungen unterscheiden sich (sonst prüfte der Vergleich oben nichts)
    const c = kugelMitLoops();
    const d = kugelMitLoops();
    spielen(new LoopZug(c.h, c.loops, null, true, 'kurven', 'geometrie', { normalfluss: true }), c.loops, [50], 5, 10);
    spielen(new LoopZug(d.h, d.loops, null, true, 'kurven', 'geometrie', { normalfluss: false }), d.loops, [50], 5, 10);
    expect(abstand(c.h.pos, d.h.pos)).toBeGreaterThan(0);
  });

  it('eine Haut, die steht, bleibt stehen (auch mit einer Linie, die nur aufliegt)', () => {
    for (const f of FAELLE) {
      const { h, loops } = kugelMitLoops(f.lose);
      const z = new LoopZug(h, loops, null, true, 'kurven', 'geometrie', f.opt);
      const ruhig = loops.map(() => null);
      for (let r = 0; r < 30; r++) z.schritt(ruhig, 1);
      const vor = Float64Array.from(h.pos);
      for (let r = 0; r < 40; r++) z.schritt(ruhig, 1);
      // gemessen: eingesetzt 0,007, eingesetzt mit Normalfluss 0,003, lose 0,007
      expect(abstand(vor, h.pos), f.name).toBeLessThan(0.1);
    }
    // ohne Normalfluss wandern die Punkte um die lose Linie weiter
    const { h, loops } = kugelMitLoops(true);
    const z = new LoopZug(h, loops, null, true, 'kurven', 'geometrie', { normalfluss: false });
    const ruhig = loops.map(() => null);
    for (let r = 0; r < 30; r++) z.schritt(ruhig, 1);
    const vor = Float64Array.from(h.pos);
    for (let r = 0; r < 40; r++) z.schritt(ruhig, 1);
    // gemessen: 9,6 in 40 Runden
    expect(abstand(vor, h.pos)).toBeGreaterThan(1);
  });

  it('nach einem Hin und Her liegt die Haut wieder, wo sie war, und kein Punkt ist auf die andere Seite geraten', () => {
    for (const f of FAELLE) {
      const a = kugelMitLoops(f.lose);
      const za = new LoopZug(a.h, a.loops, null, true, 'kurven', 'geometrie', f.opt);
      // die Form ohne den Ausflug: so viele Runden in Ruhe
      spielen(za, a.loops, [], 5, 60);
      const b = kugelMitLoops(f.lose);
      const start = Float64Array.from(b.h.pos);
      const zb = new LoopZug(b.h, b.loops, null, true, 'kurven', 'geometrie', f.opt);
      spielen(zb, b.loops, [50, -30, 60, 0], 5, 60);
      // gemessen: eingesetzt 0,14, eingesetzt mit Normalfluss 0,16, lose 0,18
      expect(abstand(a.h.pos, b.h.pos), f.name).toBeLessThan(1);
      expect(drueben(start, b.h.pos), f.name).toBe(0);
    }
  });

  it('ohne Normalfluss und ohne die Wand geraten um eine Linie, die nur aufliegt, Punkte auf die andere Seite der Mittelebene', () => {
    const b = kugelMitLoops(true);
    const start = Float64Array.from(b.h.pos);
    const zb = new LoopZug(b.h, b.loops, null, true, 'kurven', 'geometrie', { normalfluss: false, wand: false });
    spielen(zb, b.loops, [50, -30, 60, 0], 5, 60);
    // gemessen: 10 Punkte
    expect(drueben(start, b.h.pos)).toBeGreaterThan(0);
    // mit der Wand an der Spiegelebene (`hautWand`, seit dem 11.11.) kommt auch dann keiner hinüber
    const c = kugelMitLoops(true);
    const zc = new LoopZug(c.h, c.loops, null, true, 'kurven', 'geometrie', { normalfluss: false });
    spielen(zc, c.loops, [50, -30, 60, 0], 5, 60);
    expect(drueben(start, c.h.pos)).toBe(0);
  });
});

describe('Mittelebene', () => {
  /** je Punkt der Mittelebene: seine Nachbarn in der Mittelebene */
  const mitteNachbarn = (h: Haut): number[] => {
    const auf = new Set<number>();
    for (let v = 0; v < h.n; v++) if (Math.abs(h.pos[3 * v + 2]!) < 1e-9) auf.add(v);
    return [...auf].map((v) => h.nachbarn[v]!.filter((w) => auf.has(w)).length);
  };

  it('das Verdichten lässt die Kette der Mittelebene geschlossen (keine Kante der Mitte wird quer gedreht)', () => {
    // gedehnte Kugel ohne Loop der Mitte: Es wird geteilt, zusammengelegt und gedreht
    const h0 = kugel(2400);
    const h: Haut = { ...h0, pos: Float64Array.from(h0.pos, (w, i) => (i % 3 === 1 ? 1.7 * w : i % 3 === 0 ? 0.8 * w : w)) };
    const MK = mittlereKante(h0);
    let jetzt = h;
    for (let mal = 0; mal < 3; mal++) {
      const v = verdichten(jetzt, [], 1.4 * MK, { kurz: 0.5 * MK });
      if (!v) break;
      jetzt = v.haut;
      expect(mitteNachbarn(jetzt).every((n) => n === 2)).toBe(true);
    }
    expect(jetzt.n).toBeGreaterThan(h.n);
  });

  it('der Loop der Mitte lässt sich einsetzen, auch wenn Kanten der Mittelebene quer gedreht sind', () => {
    const h0 = kugel();
    // zwei Kanten der Mittelebene quer drehen (so hinterließ es das Verdichten bis zum 11.11.)
    const tri = Uint32Array.from(h0.tri);
    const auf = new Set<number>();
    for (let v = 0; v < h0.n; v++) if (Math.abs(h0.pos[3 * v + 2]!) < 1e-9) auf.add(v);
    let gedreht = 0;
    const benutzt = new Set<number>();
    for (let t1 = 0; t1 < tri.length && gedreht < 2; t1 += 3) {
      const e = [tri[t1]!, tri[t1 + 1]!, tri[t1 + 2]!];
      const ic = e.findIndex((v) => !auf.has(v));
      if (e.filter((v) => auf.has(v)).length !== 2 || ic < 0) continue;
      const c = e[ic]!;
      const x = e[(ic + 1) % 3]!;
      const y = e[(ic + 2) % 3]!;
      if (benutzt.has(x) || benutzt.has(y)) continue;
      // das Dreieck auf der anderen Seite der Kante (x, y)
      let t2 = -1;
      for (let t = 0; t < tri.length; t += 3) {
        if (t === t1) continue;
        const f = [tri[t]!, tri[t + 1]!, tri[t + 2]!];
        if (f.includes(x) && f.includes(y)) t2 = t;
      }
      if (t2 < 0) continue;
      const d = [tri[t2]!, tri[t2 + 1]!, tri[t2 + 2]!].find((v) => v !== x && v !== y)!;
      if (h0.spiegel[c] !== d) continue;
      tri[t1] = x;
      tri[t1 + 1] = d;
      tri[t1 + 2] = c;
      tri[t2] = y;
      tri[t2 + 1] = c;
      tri[t2 + 2] = d;
      benutzt.add(x);
      benutzt.add(y);
      gedreht++;
    }
    expect(gedreht).toBe(2);
    const h = hautAus(h0.pos, tri);
    expect(mitteNachbarn(h).some((n) => n !== 2)).toBe(true);
    const l = loopAusSchnitt(h, 'seite', [-200, 0], [200, 0], 1, 8);
    // (der Schnitt in der Seite längs der Mitte ist ein Ring; die Mitte entsteht aus einem Schnitt in der Front oder im Top)
    const m = loopAusSchnitt(h, 'top', [-200, 0], [200, 0], 2, 8)!;
    expect(l).not.toBeNull();
    expect(m.art).toBe('mitte');
    const r = loopEinsetzen(h, [m], 0);
    expect(r).not.toBeNull();
    expect(mitteNachbarn(r!.haut).every((n) => n === 2)).toBe(true);
    expect(r!.loops[0]!.proben.every((p) => p.ecken[0] === p.ecken[1] && p.ecken[1] === p.ecken[2])).toBe(true);
    expect(r!.loops[0]!.proben.length).toBe(auf.size);
  });

  it('die Linie eines Paars bleibt auf ihrer Seite: Wo ihr Pfad durch die Mittelebene ginge, hält sie Abstand', () => {
    let h = kugel();
    const paar = loopAusSchnitt(h, 'front', [60, 200], [60, -200], 1, 8)!;
    expect(paar.art).toBe('paar');
    const r = loopEinsetzen(h, [paar], 0)!;
    h = r.haut;
    const l = r.loops[0]!;
    // vier Punkte, damit der Loop einen Pfad hat
    for (const s of [0, 0.25, 0.5, 0.75]) punktEinfuegen(l, s * l.laenge);
    griffeAnlegen(l);
    const g = mitteAbstand(l);
    expect(g).toBeGreaterThan(0);
    // ein Punkt über die Mitte gezogen
    const P = l.punkte.map((p, i) => (i === 1 ? { ...p.ref, z: -40 } : p.ref));
    const roh = pfadLagen(l, P, undefined, true)!;
    const gehalten = pfadLagen(l, P)!;
    let rohMin = Infinity;
    let min = Infinity;
    for (let j = 2; j < roh.length; j += 3) {
      rohMin = Math.min(rohMin, roh[j]!);
      min = Math.min(min, gehalten[j]!);
    }
    expect(rohMin).toBeLessThan(-30);
    expect(min).toBeCloseTo(g, 9);
  });
});

describe('Linie kreuzt sich selbst', () => {
  it('erkennt einen verdrehten Griff und sonst keine Linie der Kugel', () => {
    const { loops } = kugelMitLoops();
    for (const l of loops) expect(linieKreuztSich(l), `Loop ${l.id}`).toBe(false);
    const m = loops.find((l) => l.art === 'mitte')!;
    const i = m.punkte.reduce((bi, p, k) => (p.ref.y > m.punkte[bi]!.ref.y ? k : bi), 0);
    const aus = m.punkte[i]!.aus!;
    const null3 = m.punkte.map(() => ({ x: 0, y: 0, z: 0 }));
    const lagenMit = (faktor: number): Float64Array => {
      // den Griff `aus` auf das `faktor`-Fache seiner Länge (negativ: auf die falsche Seite), der andere dreht mit
      const gv = griffZiehen(m, i, 'aus', { x: (faktor - 1) * aus.x, y: (faktor - 1) * aus.y, z: 0 });
      const d = verschiebungLaengs(
        m,
        null3,
        m.punkte.map((_, k) => (k === i ? gv : undefined)),
      );
      return Float64Array.from(m.ruhe, (w, k) => w + d[k]!);
    };
    // länger oder kürzer gezogen kreuzt sich die Linie nicht, auf die falsche Seite gedreht schon
    expect(linieKreuztSich(m, lagenMit(1.5))).toBe(false);
    expect(linieKreuztSich(m, lagenMit(0.5))).toBe(false);
    expect(linieKreuztSich(m, lagenMit(-2))).toBe(true);
  });

  it('eine Acht kreuzt sich; ein schmaler geschlossener Loop und sehr kurze Stücke kreuzen sich nicht', () => {
    const { loops } = kugelMitLoops();
    const zu = { ...loops.find((l) => l.art === 'mitte')! };
    const offen = { ...loops.find((l) => l.art === 'ring')! };
    const n = 120;
    const kurve = (f: (t: number) => [number, number]): Float64Array => {
      const L = new Float64Array(3 * n);
      for (let k = 0; k < n; k++) {
        const [x, y] = f((2 * Math.PI * k) / n);
        L[3 * k] = x;
        L[3 * k + 1] = y;
      }
      return L;
    };
    // Acht (Lemniskate): kreuzt sich in der Mitte
    expect(linieKreuztSich(zu, kurve((t) => [100 * Math.sin(t), 100 * Math.sin(t) * Math.cos(t)]))).toBe(true);
    // schmale Ellipse 100 : 10: die langen Seiten liegen nah beieinander, kreuzen sich aber nicht
    expect(linieKreuztSich(zu, kurve((t) => [100 * Math.cos(t), 10 * Math.sin(t)]))).toBe(false);
    // gerade Linie mit zwei fast gleichen Proben (ein sehr kurzes Stück): Die Stücke davor und dahinter berühren sich nicht „selbst“
    const gerade = new Float64Array(3 * n);
    for (let k = 0; k < n; k++) gerade[3 * k] = k < 60 ? k : k === 60 ? 59.001 : k - 1;
    expect(linieKreuztSich(offen, gerade)).toBe(false);
  });
});
