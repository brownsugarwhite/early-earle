// Neue Punkte des Netzes in der zweiten Lage (21.11.2026, Etappe 8): Wächst das Netz in der Pose, liegen die neuen Punkte in der
// Grundform auf deren runder Fläche von vorher, nicht daneben.
import { type Haut, ergaenzen, hautAus, rundAusSeite, verdichten } from '@ee/shape/dicht';
import { describe, expect, it } from 'vitest';
import { type ZweiLagen, altMitgegangen, neuePunkteLegen } from './zweiteLage';

const R = 150;

/** eine Kugel, alle Punkte genau auf dem Radius, spiegelgleich */
function kugel(dreiecke = 1500): Haut {
  const n = rundAusSeite(
    [
      { x: R, y: 0 },
      { x: 0, y: R },
      { x: -R, y: 0 },
      { x: 0, y: -R },
    ],
    { dreiecke },
  );
  const h = hautAus(n.positionen, n.indizes);
  for (let v = 0; v < h.n; v++) {
    const l = Math.hypot(h.pos[3 * v]!, h.pos[3 * v + 1]!, h.pos[3 * v + 2]!);
    for (let k = 0; k < 3; k++) h.pos[3 * v + k] = (h.pos[3 * v + k]! * R) / l;
  }
  return h;
}

/** die Pose: die Kugel gestreckt, geschert und gebogen (spiegelgleich) */
const pose = (x: number, y: number, z: number): [number, number, number] => [1.5 * x + 0.25 * y, 0.8 * y + 0.0015 * x * x, 1.3 * z];

/**
 * Das Netz wächst in der Pose (`verdichten`); die Grundform bekommt dieselben Punkte. `lagen`: wie bis zum 21.11. (die alten bleiben,
 * die neuen liegen, wo sie in der Pose liegen, minus den gemittelten Versatz ihrer Nachbarn); `z`: was `neuePunkteLegen` braucht.
 */
function gewachsen(grund: Haut, lage: (x: number, y: number, z: number) => [number, number, number], maxKante: number) {
  const ruheAlt = new Float64Array(grund.pos.length);
  for (let v = 0; v < grund.n; v++) ruheAlt.set(lage(grund.pos[3 * v]!, grund.pos[3 * v + 1]!, grund.pos[3 * v + 2]!), 3 * v);
  const poseAlt: Haut = { ...grund, pos: ruheAlt };
  const v = verdichten(poseAlt, [], maxKante)!;
  const neu = v.haut;
  let m = 0;
  while (m < neu.n && v.alt[m]! >= 0) m++;
  const dAlt = new Float64Array(3 * m);
  for (let i = 0; i < m; i++) for (let k = 0; k < 3; k++) dAlt[3 * i + k] = neu.pos[3 * i + k]! - grund.pos[3 * v.alt[i]! + k]!;
  const d = ergaenzen(neu, dAlt, m, 3, true);
  const lagen = Float64Array.from(neu.pos, (x, i) => x - d[i]!);
  for (let i = 0; i < m; i++) for (let k = 0; k < 3; k++) lagen[3 * i + k] = grund.pos[3 * v.alt[i]! + k]!;
  const z: ZweiLagen = { alt: grund, altVon: altMitgegangen(poseAlt, neu.pos, v.alt), altNach: grund.pos, neu, altNr: v.alt };
  return { neu, alt: v.alt, m, lagen, z };
}

/** wie weit die neuen Punkte neben der Kugel liegen */
function nebenKugel(lagen: ArrayLike<number>, m: number): number {
  let max = 0;
  for (let v = m; 3 * v < lagen.length; v++) max = Math.max(max, Math.abs(Math.hypot(lagen[3 * v]!, lagen[3 * v + 1]!, lagen[3 * v + 2]!) - R));
  return max;
}

/** der größte Abstand der neuen Punkte von der Kugel, wenn `verdichten` die Kugel selbst verfeinert: genauer legt es keinen Punkt */
function massstab(grund: Haut, maxKante: number): number {
  const v = verdichten(grund, [], maxKante)!;
  let m = 0;
  while (m < v.haut.n && v.alt[m]! >= 0) m++;
  return nebenKugel(v.haut.pos, m);
}

/**
 * Zwei flache Kegel mit gemeinsamem Rand (oben und unten liegen in der Mitte nur 2 · `h` auseinander und treffen sich am Rand in
 * einer Falte, wie Gaumen und Boden eines geschlossenen Mauls an der Rachenlinie)
 */
function linse(h: number, ecken = 12, r = 100): Haut {
  const pos: number[] = [0, h, 0, 0, -h, 0];
  for (let i = 0; i < ecken; i++) {
    const w = ((i + 0.5) * 2 * Math.PI) / ecken;
    pos.push(r * Math.cos(w), 0, r * Math.sin(w));
  }
  const tri: number[] = [];
  for (let i = 0; i < ecken; i++) {
    const a = 2 + i;
    const b = 2 + ((i + 1) % ecken);
    tri.push(0, b, a, 1, a, b);
  }
  return hautAus(pos, tri);
}

describe('neue Punkte in der zweiten Lage', () => {
  it('liegen auf der runden Fläche der Grundform (eine Kugel), so genau wie `verdichten` selbst seine Punkte legt', () => {
    const grund = kugel();
    const { neu, m, lagen, z } = gewachsen(grund, pose, 24);
    expect(neu.n - m).toBeGreaterThan(100);
    const vorher = nebenKugel(lagen, m);
    const geblieben = lagen.slice(0, 3 * m);
    const gelegt = neuePunkteLegen(z, lagen);
    const nachher = nebenKugel(lagen, m);
    expect(gelegt).toBe(neu.n - m);
    // bis zum 21.11. (Ort der Pose minus der gemittelte Versatz der Nachbarn) lagen sie bis 0,8 neben der Kugel
    expect(vorher).toBeGreaterThan(0.6);
    expect(nachher).toBeLessThan(0.5 * vorher);
    expect(nachher).toBeLessThan(1.05 * massstab(grund, 14));
    // die gebliebenen Punkte sind unberührt
    expect(Array.from(lagen.slice(0, 3 * m))).toEqual(Array.from(geblieben));
  });

  it('nehmen ihren Platz mit, auch wo die Pose die Haut auf das Vierfache dehnt: kein Dreieck liegt in der Grundform verkehrt herum', () => {
    const grund = kugel();
    const { neu, m, lagen, z } = gewachsen(grund, (x, y, zz) => [x + 0.02 * x * Math.abs(x), y, zz], 30);
    expect(neu.n - m).toBeGreaterThan(100);
    /** Dreiecke des neuen Netzes, deren Normale in diesen Lagen nach innen zeigt */
    const verkehrt = (L: Float64Array): number => {
      let zahl = 0;
      for (let t = 0; t < neu.tri.length; t += 3) {
        const [a, b, c] = [3 * neu.tri[t]!, 3 * neu.tri[t + 1]!, 3 * neu.tri[t + 2]!];
        const u = [L[b]! - L[a]!, L[b + 1]! - L[a + 1]!, L[b + 2]! - L[a + 2]!];
        const w = [L[c]! - L[a]!, L[c + 1]! - L[a + 1]!, L[c + 2]! - L[a + 2]!];
        const nx = u[1]! * w[2]! - u[2]! * w[1]!;
        const ny = u[2]! * w[0]! - u[0]! * w[2]!;
        const nz = u[0]! * w[1]! - u[1]! * w[0]!;
        if (nx * (L[a]! + L[b]! + L[c]!) + ny * (L[a + 1]! + L[b + 1]! + L[c + 1]!) + nz * (L[a + 2]! + L[b + 2]! + L[c + 2]!) <= 0) zahl++;
      }
      return zahl;
    };
    // mit dem gemittelten Versatz lag ein neuer Punkt bis mehrere Einheiten längs der Fläche neben seiner Stelle
    const vorherNeben = nebenKugel(lagen, m);
    const vorherVerkehrt = verkehrt(lagen);
    neuePunkteLegen(z, lagen);
    expect(verkehrt(lagen)).toBe(0);
    expect(nebenKugel(lagen, m)).toBeLessThan(1.05 * massstab(grund, 14));
    expect(vorherNeben + vorherVerkehrt).toBeGreaterThan(1);
  });

  it('wo die Pose die Grundform nur verschiebt, teilt ein neuer Punkt den Versatz genau', () => {
    const grund = kugel();
    const { neu, m, lagen, z } = gewachsen(grund, (x, y, zz) => [x + 7, y - 3, zz], 14);
    const von = neu.pos;
    expect(neuePunkteLegen(z, lagen)).toBe(neu.n - m);
    let max = 0;
    for (let v = m; v < neu.n; v++) max = Math.max(max, Math.abs(von[3 * v]! - 7 - lagen[3 * v]!), Math.abs(von[3 * v + 1]! + 3 - lagen[3 * v + 1]!), Math.abs(von[3 * v + 2]! - lagen[3 * v + 2]!));
    expect(max).toBeLessThan(1e-9);
    // und ohne Versatz bleibt er, wo er ist (der Versatz der Pose bleibt dort genau null)
    const gleich = gewachsen(grund, (x, y, zz) => [x, y, zz], 14);
    neuePunkteLegen(gleich.z, gleich.lagen);
    for (let i = 3 * gleich.m; i < gleich.lagen.length; i++) expect(gleich.lagen[i]).toBe(gleich.neu.pos[i]);
  });

  it('spiegelgleich: Paare genau, Punkte der Mitte in der Mitte', () => {
    const grund = kugel();
    const { neu, m, lagen, z } = gewachsen(grund, pose, 24);
    neuePunkteLegen(z, lagen);
    let paare = 0;
    let mitte = 0;
    for (let v = m; v < neu.n; v++) {
      const w = neu.spiegel[v]!;
      if (w === v) {
        expect(lagen[3 * v + 2]).toBe(0);
        mitte++;
        continue;
      }
      expect(lagen[3 * w]).toBe(lagen[3 * v]);
      expect(lagen[3 * w + 1]).toBe(lagen[3 * v + 1]);
      expect(lagen[3 * w + 2]).toBe(-lagen[3 * v + 2]!);
      paare++;
    }
    expect(paare).toBeGreaterThan(50);
    expect(mitte).toBeGreaterThan(2);
  });

  it('mit harten Ecken liegt ein neuer Punkt flach auf seinem alten Dreieck', () => {
    const grund = kugel();
    const { neu, m, lagen, z } = gewachsen(grund, pose, 24);
    neuePunkteLegen({ ...z, hart: new Uint8Array(grund.n).fill(1) }, lagen);
    // flach auf der Kugel aus Dreiecken: innerhalb der Kugel, höchstens um den Stich einer Kante (Kanten um 17: rund 0,25)
    let max = 0;
    for (let v = m; v < neu.n; v++) {
      const r = Math.hypot(lagen[3 * v]!, lagen[3 * v + 1]!, lagen[3 * v + 2]!);
      expect(r).toBeLessThanOrEqual(R + 1e-9);
      max = Math.max(max, R - r);
    }
    expect(max).toBeGreaterThan(0.1);
    expect(max).toBeLessThan(1.2);
  });

  it('wo zwei Häute aufeinanderliegen, findet ein neuer Punkt seinen Platz auf seiner Seite', () => {
    // das Netz wächst in der flachen Linse (oben und unten liegen höchstens 0,04 auseinander); die andere Lage ist weit geöffnet
    const flach = linse(0.02);
    const offen = Float64Array.from(flach.pos, (x, i) => (i % 3 === 1 ? 5000 * x : x));
    const v = verdichten(flach, [], 60, { drehen: false })!;
    const neu = v.haut;
    let m = 0;
    while (m < neu.n && v.alt[m]! >= 0) m++;
    // welche neuen Punkte oben liegen, sagt ihr Ring (ein Nachbar ist die obere oder die untere Spitze oder liegt selbst dort)
    const oben = new Map<number, boolean>();
    for (let i = m; i < neu.n; i++) if (Math.abs(neu.pos[3 * i + 1]!) > 1e-4) oben.set(i, neu.pos[3 * i + 1]! > 0);
    expect(oben.size).toBeGreaterThan(20);
    // die Haut hat sich seit dem alten Netz ein wenig gesetzt: Jeder neue Punkt liegt knapp jenseits der anderen Haut
    for (const [i, o] of oben) neu.pos[3 * i + 1] = o ? -0.03 : 0.03;
    const lagen = new Float64Array(neu.pos.length);
    for (let i = 0; i < m; i++) for (let k = 0; k < 3; k++) lagen[3 * i + k] = offen[3 * v.alt[i]! + k]!;
    expect(neuePunkteLegen({ alt: flach, altVon: flach.pos, altNach: offen, neu, altNr: v.alt }, lagen)).toBe(neu.n - m);
    let falsch = 0;
    for (const [i, o] of oben) if (lagen[3 * i + 1]! > 0 !== o) falsch++;
    expect(falsch).toBe(0);
  });

  it('das alte Netz geht mit: gebliebene Punkte stehen, wo sie jetzt stehen, weggefallene bewegen sich wie ihre Nachbarn', () => {
    const grund = kugel();
    const v = verdichten(grund, [], 1000, { kurz: 12 })!;
    let m = 0;
    while (m < v.haut.n && v.alt[m]! >= 0) m++;
    expect(m).toBeLessThan(grund.n);
    // jeder gebliebene Punkt 5 weiter in x (ein Punkt, den `verdichten` beim Aufrichten selbst gerückt hat, zählt hier nicht)
    const verschoben = new Float64Array(3 * v.haut.n);
    for (let i = 0; i < m; i++) for (let k = 0; k < 3; k++) verschoben[3 * i + k] = grund.pos[3 * v.alt[i]! + k]! + (k === 0 ? 5 : 0);
    const mit = altMitgegangen(grund, verschoben, v.alt);
    const geblieben = new Set(Array.from(v.alt.slice(0, m)));
    let weg = 0;
    for (let w = 0; w < grund.n; w++) {
      if (!geblieben.has(w)) {
        weg++;
        if (!grund.nachbarn[w]!.some((x) => geblieben.has(x))) continue;
      }
      expect(mit[3 * w]).toBeCloseTo(grund.pos[3 * w]! + 5, 9);
      expect(mit[3 * w + 1]).toBeCloseTo(grund.pos[3 * w + 1]!, 9);
      expect(mit[3 * w + 2]).toBeCloseTo(grund.pos[3 * w + 2]!, 9);
    }
    expect(weg).toBeGreaterThan(10);
  });
});
