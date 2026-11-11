// Die Wand an der Spiegelebene (11.11.2026). Florian: „Momentan ist es ja genau das Problem, dass, wenn ein Teil einer Kurve über
// die Spiegelkante kommt, das Mesh rissig wird. Hinziehen und Zurückziehen geht dann gar nicht mehr.“ Wie beim Spiegeln in Blender
// (Clipping): Die Hälfte z ≥ 0 ist die Wahrheit, die andere ihr Spiegelbild, und kein Punkt kommt auf die andere Seite.
import { describe, expect, it } from 'vitest';
import { loopEinsetzen } from './einsetzen';
import { type Haut, hautAus, hautSeiten } from './kurven';
import { type Loop, LoopZug, griffeAnlegen, loopAusSchnitt, pfadLagen, punktEinfuegen } from './loops';
import { rundAusSeite } from './rund';

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

/** Kugel mit dem Loop der Mitte und einem Loop auf einer Seite (vier Punkte, Griffe) */
function kugelMitPaar(): { h: Haut; loops: Loop[]; paar: Loop } {
  let h = kugel();
  let loops: Loop[] = [];
  for (const [a, A, B] of [
    ['seite', [-200, 0], [200, 0]],
    ['front', [60, 200], [60, -200]],
  ] as const) {
    const l = loopAusSchnitt(h, a, [A[0], A[1]], [B[0], B[1]], loops.length + 1, 8)!;
    loops.push(l);
    const r = loopEinsetzen(h, loops, loops.length - 1)!;
    h = r.haut;
    loops = r.loops;
  }
  const paar = loops.find((l) => l.art === 'paar')!;
  for (const s of [0, 0.25, 0.5, 0.75]) punktEinfuegen(paar, s * paar.laenge);
  for (const l of loops) griffeAnlegen(l);
  return { h, loops, paar };
}

/** Punkte auf der falschen Seite der Spiegelebene und wie tief der tiefste dort liegt */
function drueben(h: Haut, seite: Int8Array): { zahl: number; tief: number } {
  let zahl = 0;
  let tief = 0;
  for (let v = 0; v < h.n; v++) {
    const d = -seite[v]! * h.pos[3 * v + 2]!;
    if (d > 1e-9) {
      zahl++;
      tief = Math.max(tief, d);
    }
  }
  return { zahl, tief };
}

/** umgeklappte Dreiecke: Normale gegen die Summe der Normalen ihrer Ecken */
function umgeklappt(h: Haut): number {
  const P = h.pos;
  const T = h.tri;
  const vn = new Float64Array(P.length);
  const fn = new Float64Array(T.length);
  for (let i = 0; i < T.length; i += 3) {
    const a = 3 * T[i]!;
    const b = 3 * T[i + 1]!;
    const c = 3 * T[i + 2]!;
    const ux = P[b]! - P[a]!;
    const uy = P[b + 1]! - P[a + 1]!;
    const uz = P[b + 2]! - P[a + 2]!;
    const vx = P[c]! - P[a]!;
    const vy = P[c + 1]! - P[a + 1]!;
    const vz = P[c + 2]! - P[a + 2]!;
    fn[i] = uy * vz - uz * vy;
    fn[i + 1] = uz * vx - ux * vz;
    fn[i + 2] = ux * vy - uy * vx;
    for (const v of [a, b, c]) {
      vn[v] = vn[v]! + fn[i]!;
      vn[v + 1] = vn[v + 1]! + fn[i + 1]!;
      vn[v + 2] = vn[v + 2]! + fn[i + 2]!;
    }
  }
  let z = 0;
  for (let i = 0; i < T.length; i += 3) {
    const a = 3 * T[i]!;
    const b = 3 * T[i + 1]!;
    const c = 3 * T[i + 2]!;
    if (fn[i]! * (vn[a]! + vn[b]! + vn[c]!) + fn[i + 1]! * (vn[a + 1]! + vn[b + 1]! + vn[c + 1]!) + fn[i + 2]! * (vn[a + 2]! + vn[b + 2]! + vn[c + 2]!) < 0) z++;
  }
  return z;
}

function abstand(a: Float64Array, b: Float64Array): number {
  let m = 0;
  for (let i = 0; i < a.length; i += 3) m = Math.max(m, Math.hypot(a[i]! - b[i]!, a[i + 1]! - b[i + 1]!, a[i + 2]! - b[i + 2]!));
  return m;
}

/**
 * Den äußersten Punkt des Loops auf einer Seite über die Spiegelebene ziehen (bis `weit` dahinter), halten, zurückziehen, halten.
 * Wie im Fenster: zwölf Mausschritte je Weg, je Schritt fünf Runden, die Linie bleibt auf ihrer Seite (`pfadLagen`).
 */
function hinUndZurueck(wand: boolean, weit: number) {
  const { h, loops, paar } = kugelMitPaar();
  const seite = hautSeiten(h)!;
  const z = new LoopZug(h, loops, null, true, 'kurven', 'geometrie', { wand });
  const li = loops.indexOf(paar);
  const i = paar.punkte.reduce((b, p, k) => (p.ref.z > paar.punkte[b]!.ref.z ? k : b), 0);
  const z0 = paar.punkte[i]!.ref.z;
  const ziel = (zz: number): (Float64Array | null)[] =>
    loops.map((l, k) => {
      if (k !== li) return null;
      const P = l.punkte.map((p, q) => (q === i ? { ...p.ref, z: zz } : p.ref));
      const L = pfadLagen(l, P)!;
      return Float64Array.from(L, (w, j) => w - l.ruhe[j]!);
    });
  let d = ziel(z0);
  // erst setzen: die Form ohne den Ausflug
  for (let r = 0; r < 60; r++) z.schritt(d, 1);
  const start = Float64Array.from(h.pos);
  let schlimmste = { zahl: 0, tief: 0 };
  const merken = () => {
    const x = drueben(h, seite);
    if (x.zahl > schlimmste.zahl) schlimmste = x;
  };
  const weg = (von: number, nach: number) => {
    for (let s = 1; s <= 12; s++) {
      d = ziel(von + ((nach - von) * s) / 12);
      for (let q = 0; q < 5; q++) {
        z.schritt(d, 1);
        merken();
      }
    }
    for (let r = 0; r < 60; r++) {
      z.schritt(d, 1);
      merken();
    }
  };
  weg(z0, -weit);
  const drin = { ...drueben(h, seite), umgeklappt: umgeklappt(h) };
  weg(-weit, z0);
  return { z0, schlimmste, drin, zurueck: { ...drueben(h, seite), umgeklappt: umgeklappt(h), abstand: abstand(start, h.pos) } };
}

describe('Wand an der Spiegelebene', () => {
  it('jede Hälfte kennt ihre Seite: gleich viele Punkte rechts und links, die Mittelkante dazwischen', () => {
    const { h } = kugelMitPaar();
    const seite = hautSeiten(h)!;
    expect(seite).not.toBeNull();
    let r = 0;
    let l = 0;
    let m = 0;
    for (let v = 0; v < h.n; v++) {
      if (seite[v] === 1) r++;
      else if (seite[v] === -1) l++;
      else m++;
      // die Seite stimmt mit der Lage überein, und das Spiegelbild liegt auf der anderen
      if (seite[v] !== 0) {
        expect(Math.sign(h.pos[3 * v + 2]!)).toBe(seite[v]);
        expect(seite[h.spiegel[v]!]).toBe(-seite[v]!);
      } else expect(h.spiegel[v]).toBe(v);
    }
    expect(r).toBe(l);
    expect(m).toBeGreaterThan(20);
  });

  it('ein Teil einer Kurve über die Spiegelkante gezogen und zurück: kein Punkt kommt hinüber, danach liegt die Haut wie vorher', () => {
    const mit = hinUndZurueck(true, 60);
    // im ganzen Ablauf kein Punkt auf der falschen Seite
    expect(mit.schlimmste.zahl).toBe(0);
    // zurückgezogen: kein Dreieck umgeklappt, die Haut liegt wie vorher (gemessen: 2,8 Einheiten bei einem Radius von 150)
    expect(mit.zurueck.zahl).toBe(0);
    expect(mit.zurueck.umgeklappt).toBe(0);
    expect(mit.zurueck.abstand).toBeLessThan(5);
    // Gegenprobe ohne Wand (wie bis zum 11.11.): Punkte geraten hinüber (gemessen: 10 Punkte, bis 2,3 Einheiten tief)
    const ohne = hinUndZurueck(false, 60);
    expect(ohne.schlimmste.zahl).toBeGreaterThan(0);
  });
});
