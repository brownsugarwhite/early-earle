import { describe, expect, it } from 'vitest';
import { type Farblinie, aktiveEbene, alsDatei, ausDatei, breitenLaengs, leereBemalung } from './bemalung';
import { flaechenRechnen } from './flaechen';
import { FERN } from './fliessen';
import { kettenAller } from './ketten';
import { naechsterAuf } from './naechster';
import { type Netz, type Ort, karteVon, ortIn } from './ort';
import { weichAnteil, weichFeld } from './weich';

// ---------- Prüfnetz: eine Kugel aus einem unterteilten Oktaeder (spiegelgleich an z = 0), wie in `fliessen.test.ts` ----------

function kugel(stufen: number, r = 100): Netz & { spiegel: Int32Array; pos: Float64Array; tri: Uint32Array } {
  const P: number[][] = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  let T: number[][] = [[0, 2, 4], [2, 1, 4], [1, 3, 4], [3, 0, 4], [2, 0, 5], [1, 2, 5], [3, 1, 5], [0, 3, 5]];
  for (let s = 0; s < stufen; s++) {
    const mitte = new Map<string, number>();
    const m = (a: number, b: number): number => {
      const k = a < b ? `${a},${b}` : `${b},${a}`;
      let i = mitte.get(k);
      if (i === undefined) {
        const x = [(P[a]![0]! + P[b]![0]!) / 2, (P[a]![1]! + P[b]![1]!) / 2, (P[a]![2]! + P[b]![2]!) / 2];
        const l = Math.hypot(x[0]!, x[1]!, x[2]!);
        i = P.length;
        P.push([x[0]! / l, x[1]! / l, x[2]! / l]);
        mitte.set(k, i);
      }
      return i;
    };
    const N: number[][] = [];
    for (const [a, b, c] of T as [number, number, number][]) {
      const ab = m(a, b), bc = m(b, c), ca = m(c, a);
      N.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
    }
    T = N;
  }
  const n = P.length;
  const pos = new Float64Array(3 * n);
  P.forEach((p, i) => {
    pos[3 * i] = r * p[0]!;
    pos[3 * i + 1] = r * p[1]!;
    pos[3 * i + 2] = Math.abs(p[2]!) < 1e-12 ? 0 : r * p[2]!;
  });
  const schl = (x: number, y: number, z: number): string => `${Math.round(x * 1e6)},${Math.round(y * 1e6)},${Math.round(z * 1e6)}`;
  const wo = new Map<string, number>();
  for (let i = 0; i < n; i++) wo.set(schl(pos[3 * i]!, pos[3 * i + 1]!, pos[3 * i + 2]!), i);
  const spiegel = new Int32Array(n);
  for (let i = 0; i < n; i++) spiegel[i] = wo.get(schl(pos[3 * i]!, pos[3 * i + 1]!, -pos[3 * i + 2]!)) ?? -1;
  return { pos, tri: Uint32Array.from(T.flat()), n, spiegel };
}

describe('Farbe, Etappe 4: weiche Kanten', () => {
  // (Stufe 5: 4098 Punkte, Kanten um 6 Einheiten: etwa so fein wie das Rechennetz einer Form)
  const netz = kugel(5);
  const k = karteVon(netz);
  const nah = naechsterAuf(netz);
  const ortBei = (x: number, y: number, z: number): Ort => {
    const r = nah(x, y, z);
    return ortIn(netz, r.t, r.wa, r.wb, r.wc);
  };
  /** ein Breitenkreis (Höhe z0) als Farblinie mit vier Punkten, jeder mit seiner Breite */
  const kreis = (z0: number, breiten: [number, number, number, number], id = 1): Farblinie => {
    const rho = Math.sqrt(1e4 - z0 * z0);
    const stuetzen = Array.from({ length: 96 }, (_, j) => ortBei(rho * Math.cos((2 * Math.PI * j) / 96), rho * Math.sin((2 * Math.PI * j) / 96), z0));
    return { id, zu: true, stuetzen, punkte: [0, 24, 48, 72].map((i, q) => ({ i, ein: null, aus: null, knick: false, ...(breiten[q]! > 0 ? { breite: breiten[q]! } : {}) })) };
  };
  const breiten = (l: { stuetzen: Ort[] }): Float32Array | null => breitenLaengs(netz.pos, l as Farblinie);
  /** der Weg über die Kugel von einem Punkt des Netzes bis zum Breitenkreis der Höhe z0 */
  const zumKreis = (v: number, z0: number): number => 100 * Math.abs(Math.acos(Math.min(1, Math.max(-1, netz.pos[3 * v + 2]! / 100))) - Math.acos(z0 / 100));

  it('die Breite fließt längs der Farblinie von Punkt zu Punkt, bis hinunter auf null', () => {
    const l = kreis(60, [20, 0, 10, 0]);
    const w = breitenLaengs(netz.pos, l)!;
    expect(w.length).toBe(96);
    expect(w[0]).toBeCloseTo(20, 5);
    expect(w[24]).toBeCloseTo(0, 5);
    expect(w[48]).toBeCloseTo(10, 5);
    expect(w[72]).toBeCloseTo(0, 5);
    // auf halbem Weg die Mitte; dazwischen ohne Sprung, nie über die Breiten der zwei Punkte hinaus
    expect(Math.abs(w[12]! - 10)).toBeLessThan(0.6);
    for (let i = 0; i < 24; i++) {
      expect(w[i]!).toBeGreaterThanOrEqual(w[i + 1]!);
      expect(w[i]! - w[i + 1]!).toBeLessThan(1.4);
    }
    // am Punkt selbst läuft sie flach ein (kein Knick im Verlauf)
    expect(w[0]! - w[1]!).toBeLessThan(0.2);
    expect(w[23]! - w[24]!).toBeLessThan(0.2);
    // ohne Breite: nichts
    expect(breitenLaengs(netz.pos, kreis(60, [0, 0, 0, 0]))).toBeNull();
  });

  it('die Ketten tragen die Breite je Punkt, von Dreieck zu Dreieck ohne Sprung', () => {
    const l = kreis(60, [20, 0, 10, 0]);
    const { ketten, fehl } = kettenAller(k, [l], false, breiten);
    expect(fehl).toEqual([]);
    expect(ketten.length).toBeGreaterThan(20);
    for (const c of ketten) {
      expect(c.w).toBeDefined();
      expect(c.w!.length).toBe(c.p.length / 2);
      for (const x of c.w!) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(20 + 1e-6);
      }
    }
    // der Reihe nach: Wo eine Kette endet, beginnt die nächste mit derselben Breite
    for (let i = 0; i < ketten.length; i++) {
      const a = ketten[i]!;
      const b = ketten[(i + 1) % ketten.length]!;
      expect(Math.abs(a.w![a.w!.length - 1]! - b.w![0]!)).toBeLessThan(1e-6);
    }
    // ohne Breiten bleiben die Ketten, wie sie waren
    expect(kettenAller(k, [kreis(60, [0, 0, 0, 0])], false, breiten).ketten.every((c) => c.w === undefined)).toBe(true);
  });

  it('das Feld: Abstand zur Farblinie über die Haut, die Breite dort, die Füllung jenseits', () => {
    const l = kreis(60, [18, 18, 18, 18]);
    const { ketten } = kettenAller(k, [l], false, breiten);
    const fl = flaechenRechnen(k, ketten, [
      { ort: ortBei(0, 0, 100), farbe: 0 },
      { ort: ortBei(0, 0, -100), farbe: 1 },
    ]);
    const F = weichFeld(k, fl)!;
    expect(F.groesst).toBeCloseTo(18, 4);
    let imVerlauf = 0;
    let fehler = 0;
    for (let v = 0; v < netz.n; v++) {
      const soll = zumKreis(v, 60);
      const z = netz.pos[3 * v + 2]!;
      if (soll < 16) {
        // im Verlauf: der Abstand stimmt, die Breite ist die der Farblinie, jenseits liegt die andere Füllung
        expect(F.d[v]).toBeLessThan(FERN);
        fehler = Math.max(fehler, Math.abs(F.d[v]! - soll));
        expect(Math.abs(F.w[v]! - 18)).toBeLessThan(0.01);
        expect(F.fremd[v]).toBe(z > 60 ? 1 : 0);
        imVerlauf++;
      } else if (soll > 18 + 14) {
        // weit jenseits des Verlaufs: nichts (oder ein Wert ohne Wirkung)
        expect(weichAnteil(F.d[v]!, F.w[v]!)).toBe(0);
      }
    }
    expect(imVerlauf).toBeGreaterThan(100);
    // (das Netz liegt innerhalb der Kugel, die Farblinie läuft in Sehnen)
    expect(fehler).toBeLessThan(0.8);
  });

  it('der Anteil der anderen Farbe: an der Farblinie die Hälfte, am Rand des Verlaufs nichts, dazwischen stetig fallend', () => {
    expect(weichAnteil(0, 10)).toBeCloseTo(0.5, 9);
    expect(weichAnteil(10, 10)).toBe(0);
    expect(weichAnteil(25, 10)).toBe(0);
    expect(weichAnteil(3, 0)).toBe(0);
    let vor = 0.5;
    for (let d = 0.5; d <= 10; d += 0.5) {
      const a = weichAnteil(d, 10);
      expect(a).toBeLessThan(vor);
      vor = a;
    }
  });

  it('kein Verlauf geht über eine andere Farblinie hinweg', () => {
    // ein weicher Kreis (Breite 34) und ein harter, 18 Einheiten daneben: Der Verlauf endet am harten
    const weich = kreis(60, [34, 34, 34, 34], 1);
    const hart = kreis(45, [0, 0, 0, 0], 2);
    const { ketten } = kettenAller(k, [weich, hart], false, breiten);
    const fl = flaechenRechnen(k, ketten, [
      { ort: ortBei(0, 0, 100), farbe: 0 },
      { ort: ortBei(80, 0, 50), farbe: 1 },
      { ort: ortBei(0, 0, -100), farbe: 2 },
    ]);
    const F = weichFeld(k, fl)!;
    let dahinter = 0;
    for (let v = 0; v < netz.n; v++) {
      const z = netz.pos[3 * v + 2]!;
      // hinter dem harten Kreis (er liegt beim Bogen 17,7 vom weichen; der Verlauf reichte ohne ihn bis 34)
      if (z < 44.5 && zumKreis(v, 60) < 33) {
        expect(weichAnteil(F.d[v]!, F.w[v]!)).toBe(0);
        dahinter++;
      }
      // und davor steht er: zwischen den zwei Kreisen ist die andere Farbe noch zu sehen
      if (z > 47 && z < 58) expect(weichAnteil(F.d[v]!, F.w[v]!)).toBeGreaterThan(0.02);
    }
    expect(dahinter).toBeGreaterThan(20);
  });

  it('wo die Breite auf null läuft, wird der Verlauf schmal: Das Feld folgt der Breite längs der Farblinie', () => {
    const l = kreis(60, [24, 0, 24, 0]);
    const w = breitenLaengs(netz.pos, l)!;
    const { ketten } = kettenAller(k, [l], false, breiten);
    const fl = flaechenRechnen(k, ketten, [
      { ort: ortBei(0, 0, 100), farbe: 0 },
      { ort: ortBei(0, 0, -100), farbe: 1 },
    ]);
    const F = weichFeld(k, fl)!;
    let geprueft = 0;
    for (let v = 0; v < netz.n; v++) {
      if (zumKreis(v, 60) > 5 || F.d[v]! >= FERN) continue;
      // die Breite an der Stelle der Farblinie, die dem Punkt gegenüberliegt
      const winkel = Math.atan2(netz.pos[3 * v + 1]!, netz.pos[3 * v]!);
      const i = ((Math.round((winkel / (2 * Math.PI)) * 96) % 96) + 96) % 96;
      expect(Math.abs(F.w[v]! - w[i]!)).toBeLessThan(3.5);
      geprueft++;
    }
    expect(geprueft).toBeGreaterThan(20);
  });

  it('gespiegelt: Das Feld ist auf beiden Hälften dasselbe', () => {
    // ein Kreis um die Richtung +x auf der Hälfte z ≥ 0 geht nicht; ein Breitenkreis oben und sein Spiegelbild unten
    const l = kreis(60, [16, 16, 16, 16]);
    const { ketten } = kettenAller(k, [l], true, breiten);
    const fl = flaechenRechnen(k, ketten, [
      { ort: ortBei(0, 0, 100), farbe: 0 },
      { ort: ortBei(0, 0, -100), farbe: 0 },
      { ort: ortBei(100, 0, 0), farbe: 1 },
    ]);
    const F = weichFeld(k, fl)!;
    let zahl = 0;
    for (let v = 0; v < netz.n; v++) {
      const m = netz.spiegel[v]!;
      if (m < 0 || F.d[v]! >= FERN) continue;
      expect(Math.abs(F.d[v]! - F.d[m]!)).toBeLessThan(1e-3);
      expect(Math.abs(F.w[v]! - F.w[m]!)).toBeLessThan(1e-3);
      expect(F.fremd[v]).toBe(F.fremd[m]);
      zahl++;
    }
    expect(zahl).toBeGreaterThan(100);
  });

  it('kein Verlauf schlägt durch ein dünnes Teil auf die Rückseite: Der Abstand zählt über die Haut, nicht durch die Form', () => {
    // eine flache Linse: die Kugel auf ein Zwanzigstel gedrückt. Oben ein weicher Kreis (Breite 30) beim Halbmesser 60; die
    // Unterseite liegt nur rund 8 Einheiten darunter, über die Haut aber 80 entfernt (bis zum Rand und zurück)
    const flach = kugel(5);
    for (let v = 0; v < flach.n; v++) flach.pos[3 * v + 2] = flach.pos[3 * v + 2]! * 0.05;
    const kf = karteVon(flach);
    const nahF = naechsterAuf(flach);
    const bei = (x: number, y: number, z: number): Ort => {
      const r = nahF(x, y, z);
      return ortIn(flach, r.t, r.wa, r.wb, r.wc);
    };
    const hoch = (rho: number): number => 0.05 * Math.sqrt(1e4 - rho * rho);
    const stuetzen = Array.from({ length: 96 }, (_, j) => bei(60 * Math.cos((2 * Math.PI * j) / 96), 60 * Math.sin((2 * Math.PI * j) / 96), hoch(60)));
    const l: Farblinie = { id: 1, zu: true, stuetzen, punkte: [0, 24, 48, 72].map((i) => ({ i, ein: null, aus: null, knick: false, breite: 30 })) };
    const { ketten, fehl } = kettenAller(kf, [l], false, (x) => breitenLaengs(flach.pos, x as Farblinie));
    expect(fehl).toEqual([]);
    const fl = flaechenRechnen(kf, ketten, [
      { ort: bei(0, 0, 5), farbe: 0 },
      { ort: bei(0, 0, -5), farbe: 1 },
    ]);
    const F = weichFeld(kf, fl)!;
    let oben = 0;
    let unten = 0;
    for (let v = 0; v < flach.n; v++) {
      const [x, y, z] = [flach.pos[3 * v]!, flach.pos[3 * v + 1]!, flach.pos[3 * v + 2]!];
      const rho = Math.hypot(x, y);
      if (Math.abs(rho - 60) > 12) continue;
      if (z > 0.5) {
        // oben, nah an der Farblinie: im Verlauf
        expect(weichAnteil(F.d[v]!, F.w[v]!)).toBeGreaterThan(0.1);
        oben++;
      } else if (z < -0.5) {
        // genau darunter, auf der Rückseite: nichts
        expect(weichAnteil(F.d[v]!, F.w[v]!)).toBe(0);
        unten++;
      }
    }
    expect(oben).toBeGreaterThan(40);
    expect(unten).toBeGreaterThan(40);
  });

  it('ohne weiche Farblinie gibt es kein Feld', () => {
    const { ketten } = kettenAller(k, [kreis(60, [0, 0, 0, 0])], false, breiten);
    expect(weichFeld(k, flaechenRechnen(k, ketten, [{ ort: ortBei(0, 0, 100), farbe: 0 }]))).toBeNull();
  });

  it('Sichern und Laden halten die Breiten; eine Datei ohne Breiten ist hart', () => {
    const b = leereBemalung();
    aktiveEbene(b).linien.push(kreis(60, [20, 0, 7.5, 0]));
    const d = alsDatei(b);
    expect(d.version).toBe(3);
    const zurueck = ausDatei(k, JSON.parse(JSON.stringify(d, (_, x) => (ArrayBuffer.isView(x) ? Array.from(x as unknown as ArrayLike<number>) : x))))!;
    expect(zurueck.ebenen[0]!.linien[0]!.punkte.map((q) => q.breite ?? 0)).toEqual([20, 0, 7.5, 0]);
    // Version 2 (ohne `b`): alles hart
    const alt = { ...d, version: 2 as const, ebenen: d.ebenen.map((e) => ({ ...e, linien: e.linien.map(({ b: _ohne, ...l }) => l) })) };
    expect(ausDatei(k, alt)!.ebenen[0]!.linien[0]!.punkte.every((q) => !q.breite)).toBe(true);
  });
});
