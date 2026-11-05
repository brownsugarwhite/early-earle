// Form zuerst (05.11.2026), Beweis „Kurven als Wahrheit“: Kurven auf der Form sind die Griffe, die Haut ist dazwischen so rund wie
// möglich.
//
// Florian: Kanten, Edgeloops und Kiefer sind dieselbe Sache; der Umriss ist nur Ergebnis; bearbeitet werden Griffe auf Loops und
// Kanten (Bézier-Punkte, Einflusskreis wie O in Blender); die Form bläst sich immer zur optimalen Rundung auf. Vorbild ist
// FiberMesh (Nealen, Igarashi, Sorkine, Alexa 2007): Der Startumriss wird die erste Kurve auf der Fläche, weitere Kurven liegen
// auf ihr. Die Haut ist ein dichtes Netz mit fester Verbindung (nichts verschmilzt; schiebt man ein Ende in ein anderes, steckt es
// darin). Nach jeder Änderung der Kurven werden ihre Lagen neu gelöst: Jeder Punkt behält seine Krümmung (längs der Normale, mit
// der Kantenlänge gestreckt) und seine Verteilung in der Fläche (mit der Normale gedreht), die Haut geht durch alle Kurven. Gelöst
// wird nur im Einflussbereich (wie der Kreis von O): Außerhalb bleibt jeder Punkt, wo er ist; ohne Bereich bewegt sich der ganze
// Körper mit (gemessen: Kopf 50 nach unten → Rücken 6–8 Einheiten anders, 20–30 geglitten).
//
// Verworfen (gemessen): die Krümmung zwischen den Kurven nach FiberMesh neu verteilen (Rückkopplung mit der gelösten Krümmung) —
// auf dem ungleichmäßigen Netz aus Surface Nets schaukelt sie sich auf (Schritte 0,13 → 0,28 → 0,69 ohne jede Änderung); die
// Krümmung allein ohne die Verteilung in der Fläche lässt die Kugel zusammenfallen (Radius 52–157).

import { type NormalSystem, type NormalZeile, normalSystem } from '../loeser/normalSystem';

export type V3 = { x: number; y: number; z: number };

/** Ein Punkt einer Kurve mit Bézier-Griffen (relativ zum Punkt). Fehlen sie, ergeben sie sich aus den Nachbarn (rund). */
export type KurvenPunkt = V3 & { ein?: V3; aus?: V3 };

/**
 * Eine Kurve auf der Form. `mitte`: geschlossen in der Mittelebene (z = 0), der Startumriss. `ring`: die Hälfte z ≥ 0 eines Rings
 * um den Körper, Anfang und Ende auf der Mittelebene; die andere Hälfte ist ihr Spiegelbild.
 */
export type Kurve = { art: 'mitte' | 'ring'; punkte: KurvenPunkt[] };

export type Stueck3 = [V3, V3, V3, V3];

const minus = (a: V3, b: V3): V3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const plus = (a: V3, b: V3): V3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const mal = (a: V3, s: number): V3 => ({ x: a.x * s, y: a.y * s, z: a.z * s });
const laenge = (a: V3): number => Math.hypot(a.x, a.y, a.z);
const punkt = (a: V3): V3 => ({ x: a.x, y: a.y, z: a.z });

/**
 * Wirksame Griffe jedes Punkts (relativ, `ein` zum Vorgänger, `aus` zum Nachfolger): gesetzte, sonst rund aus den Nachbarn (Richtung
 * der Parabel durch drei Punkte, Länge wie ein Kreisbogen über der Sehne). Ein Ring kreuzt die Mittelebene senkrecht, so schließt er
 * sich glatt mit seinem Spiegelbild.
 */
export function kurvenGriffe(k: Kurve): { ein: V3; aus: V3 }[] {
  const p = k.punkte;
  const n = p.length;
  const zu = k.art === 'mitte';
  const richtung = (i: number): V3 => {
    if (!zu && i === 0) return { x: 0, y: 0, z: 1 };
    if (!zu && i === n - 1) return { x: 0, y: 0, z: -1 };
    const q = p[i]!;
    const a = p[(i - 1 + n) % n]!;
    const b = p[(i + 1) % n]!;
    const va = minus(q, a);
    const vb = minus(b, q);
    const da = laenge(va);
    const db = laenge(vb);
    const t = da > 1e-9 && db > 1e-9 ? plus(mal(va, db / da), mal(vb, da / db)) : minus(b, a);
    const l = laenge(t);
    return l > 1e-12 ? mal(t, 1 / l) : { x: 1, y: 0, z: 0 };
  };
  // Kreisbogen mit Sehne c und Winkel θ zwischen Richtung und Sehne: Griff = 2c / (3 (1 + cos θ))
  const griff = (t: V3, sehne: V3): number => {
    const c = laenge(sehne);
    const cos = Math.max(0, Math.min(1, (t.x * sehne.x + t.y * sehne.y + t.z * sehne.z) / (c || 1)));
    return (2 * c) / (3 * (1 + cos));
  };
  return p.map((q, i) => {
    const t = richtung(i);
    const vor = zu || i > 0 ? p[(i - 1 + n) % n]! : null;
    const nach = zu || i < n - 1 ? p[(i + 1) % n]! : null;
    const ein = q.ein ?? (vor ? mal(t, -griff(t, minus(q, vor))) : { x: 0, y: 0, z: 0 });
    const aus = q.aus ?? (nach ? mal(t, griff(t, minus(nach, q))) : { x: 0, y: 0, z: 0 });
    return { ein, aus };
  });
}

/** Kubische Stücke der Kurve (der Startumriss geschlossen, ein Ring nur seine Hälfte z ≥ 0). */
export function kurvenStuecke(k: Kurve): Stueck3[] {
  const p = k.punkte;
  const g = kurvenGriffe(k);
  const n = p.length;
  const aus: Stueck3[] = [];
  for (let i = 0; i < (k.art === 'mitte' ? n : n - 1); i++) {
    const j = (i + 1) % n;
    aus.push([punkt(p[i]!), plus(p[i]!, g[i]!.aus), plus(p[j]!, g[j]!.ein), punkt(p[j]!)]);
  }
  return aus;
}

export function aufStueck(s: Stueck3, t: number): V3 {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return {
    x: a * s[0].x + b * s[1].x + c * s[2].x + d * s[3].x,
    y: a * s[0].y + b * s[1].y + c * s[2].y + d * s[3].y,
    z: a * s[0].z + b * s[1].z + c * s[2].z + d * s[3].z,
  };
}

/** Proben der Kurve im Abstand ≈ s: Lage, Stück und Parameter (ohne den Endpunkt eines geschlossenen Startumrisses). */
export function kurveAbtasten(k: Kurve, s: number): { p: V3[]; stueck: number[]; t: number[] } {
  const p: V3[] = [];
  const stueck: number[] = [];
  const t: number[] = [];
  const st = kurvenStuecke(k);
  st.forEach((q, i) => {
    const grob = laenge(minus(q[1], q[0])) + laenge(minus(q[2], q[1])) + laenge(minus(q[3], q[2]));
    const m = Math.max(2, Math.ceil(grob / s));
    for (let j = 0; j < m; j++) {
      p.push(aufStueck(q, j / m));
      stueck.push(i);
      t.push(j / m);
    }
  });
  if (k.art === 'ring' && st.length > 0) {
    p.push(punkt(k.punkte[k.punkte.length - 1]!));
    stueck.push(st.length - 1);
    t.push(1);
  }
  return { p, stueck, t };
}

/** Die ganze Kurve als Polylinie zum Zeichnen: der Startumriss geschlossen, ein Ring mit seinem Spiegelbild (geschlossen). */
export function kurveGanz(k: Kurve, s: number): V3[] {
  const { p } = kurveAbtasten(k, s);
  if (k.art === 'mitte') return [...p, p[0]!];
  return [...p, ...p.slice(0, -1).reverse().map((q) => ({ ...q, z: -q.z }))];
}

/** Die Haut: Lagen (3 je Punkt), Dreiecke (nach außen), Nachbarn je Punkt, Spiegelpunkt je Punkt (z → −z; −1: keiner). */
export type Haut = { pos: Float64Array; tri: Uint32Array; n: number; nachbarn: number[][]; spiegel: Int32Array };

export function hautAus(positionen: ArrayLike<number>, indizes: ArrayLike<number>): Haut {
  const n = positionen.length / 3;
  const pos = Float64Array.from(positionen);
  const tri = Uint32Array.from(indizes);
  const sets: Set<number>[] = Array.from({ length: n }, () => new Set());
  for (let t = 0; t < tri.length; t += 3) {
    for (let e = 0; e < 3; e++) {
      const a = tri[t + e]!;
      const b = tri[t + ((e + 1) % 3)]!;
      sets[a]!.add(b);
      sets[b]!.add(a);
    }
  }
  // Das Netz ist spiegelgleich gebaut (Raster spiegelgleich in z): Partner über die gerundete Lage finden
  const schluessel = (x: number, y: number, zz: number) => `${Math.round(x * 1e3)},${Math.round(y * 1e3)},${Math.round(zz * 1e3)}`;
  const karte = new Map<string, number>();
  for (let v = 0; v < n; v++) karte.set(schluessel(pos[3 * v]!, pos[3 * v + 1]!, pos[3 * v + 2]!), v);
  const spiegel = new Int32Array(n).fill(-1);
  for (let v = 0; v < n; v++) spiegel[v] = karte.get(schluessel(pos[3 * v]!, pos[3 * v + 1]!, -pos[3 * v + 2]!)) ?? -1;
  return { pos, tri, n, nachbarn: sets.map((s) => [...s]), spiegel };
}

/** Normalen je Punkt (Dreiecke nach Fläche gewichtet). */
export function hautNormalen(h: Haut): Float64Array {
  const nor = new Float64Array(3 * h.n);
  const p = h.pos;
  for (let t = 0; t < h.tri.length; t += 3) {
    const a = h.tri[t]!;
    const b = h.tri[t + 1]!;
    const c = h.tri[t + 2]!;
    const abx = p[3 * b]! - p[3 * a]!;
    const aby = p[3 * b + 1]! - p[3 * a + 1]!;
    const abz = p[3 * b + 2]! - p[3 * a + 2]!;
    const acx = p[3 * c]! - p[3 * a]!;
    const acy = p[3 * c + 1]! - p[3 * a + 1]!;
    const acz = p[3 * c + 2]! - p[3 * a + 2]!;
    const fx = aby * acz - abz * acy;
    const fy = abz * acx - abx * acz;
    const fz = abx * acy - aby * acx;
    for (const v of [a, b, c]) {
      nor[3 * v] = nor[3 * v]! + fx;
      nor[3 * v + 1] = nor[3 * v + 1]! + fy;
      nor[3 * v + 2] = nor[3 * v + 2]! + fz;
    }
  }
  for (let v = 0; v < h.n; v++) {
    const l = Math.hypot(nor[3 * v]!, nor[3 * v + 1]!, nor[3 * v + 2]!) || 1;
    nor[3 * v] = nor[3 * v]! / l;
    nor[3 * v + 1] = nor[3 * v + 1]! / l;
    nor[3 * v + 2] = nor[3 * v + 2]! / l;
  }
  return nor;
}

/** Nächster Punkt eines Dreiecks zu q (baryzentrisch, nach Ericson). */
function naechsterImDreieck(q: V3, a: V3, b: V3, c: V3): [number, number, number] {
  const ab = minus(b, a);
  const ac = minus(c, a);
  const ap = minus(q, a);
  const d1 = ab.x * ap.x + ab.y * ap.y + ab.z * ap.z;
  const d2 = ac.x * ap.x + ac.y * ap.y + ac.z * ap.z;
  if (d1 <= 0 && d2 <= 0) return [1, 0, 0];
  const bp = minus(q, b);
  const d3 = ab.x * bp.x + ab.y * bp.y + ab.z * bp.z;
  const d4 = ac.x * bp.x + ac.y * bp.y + ac.z * bp.z;
  if (d3 >= 0 && d4 <= d3) return [0, 1, 0];
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) {
    const v = d1 / (d1 - d3);
    return [1 - v, v, 0];
  }
  const cp = minus(q, c);
  const d5 = ab.x * cp.x + ab.y * cp.y + ab.z * cp.z;
  const d6 = ac.x * cp.x + ac.y * cp.y + ac.z * cp.z;
  if (d6 >= 0 && d5 <= d6) return [0, 0, 1];
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) {
    const w = d2 / (d2 - d6);
    return [1 - w, 0, w];
  }
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
    const w = (d4 - d3) / (d4 - d3 + (d5 - d6));
    return [0, 1 - w, w];
  }
  const den = 1 / (va + vb + vc);
  const v = vb * den;
  const w = vc * den;
  return [1 - v - w, v, w];
}

/** Wo eine Kurve auf der Haut liegt: je Probe (Stück, Parameter, gespiegelt) ein Punkt eines Dreiecks (baryzentrisch). */
export type Anheftung = {
  stueck: Int32Array;
  t: Float64Array;
  spiegel: Uint8Array;
  ecken: Int32Array;
  b: Float64Array;
};

/** Eine Kurve an die Haut heften: Proben im Abstand ≈ s, jede am nächsten Punkt der Haut (ein Ring auch gespiegelt). */
export function kurveAnheften(h: Haut, k: Kurve, s: number): Anheftung {
  const { p, stueck, t } = kurveAbtasten(k, s);
  const proben: { q: V3; stueck: number; t: number; spiegel: number }[] = [];
  p.forEach((q, i) => {
    proben.push({ q, stueck: stueck[i]!, t: t[i]!, spiegel: 0 });
    // auf der Mittelebene liegen Ringenden schon einmal
    if (k.art === 'ring' && Math.abs(q.z) > 1e-6) proben.push({ q: { ...q, z: -q.z }, stueck: stueck[i]!, t: t[i]!, spiegel: 1 });
  });
  const P = h.pos;
  const ecke = (v: number): V3 => ({ x: P[3 * v]!, y: P[3 * v + 1]!, z: P[3 * v + 2]! });
  // Mittelpunkte und Radien der Dreiecke, um fern liegende schnell zu überspringen
  const m = h.tri.length / 3;
  const mx = new Float64Array(m);
  const my = new Float64Array(m);
  const mz = new Float64Array(m);
  const mr = new Float64Array(m);
  for (let f = 0; f < m; f++) {
    const a = ecke(h.tri[3 * f]!);
    const b = ecke(h.tri[3 * f + 1]!);
    const c = ecke(h.tri[3 * f + 2]!);
    mx[f] = (a.x + b.x + c.x) / 3;
    my[f] = (a.y + b.y + c.y) / 3;
    mz[f] = (a.z + b.z + c.z) / 3;
    mr[f] = Math.max(
      Math.hypot(a.x - mx[f]!, a.y - my[f]!, a.z - mz[f]!),
      Math.hypot(b.x - mx[f]!, b.y - my[f]!, b.z - mz[f]!),
      Math.hypot(c.x - mx[f]!, c.y - my[f]!, c.z - mz[f]!),
    );
  }
  const stuecke: number[] = [];
  const ts: number[] = [];
  const spiegel: number[] = [];
  const ecken: number[] = [];
  const bs: number[] = [];
  const dazu = (pr: { stueck: number; t: number }, sp: number, v: readonly number[], b: readonly number[]) => {
    stuecke.push(pr.stueck);
    ts.push(pr.t);
    spiegel.push(sp);
    ecken.push(...v);
    bs.push(...b);
  };
  for (const pr of proben) {
    let best = Infinity;
    let wahl = 0;
    let bary: [number, number, number] = [1, 0, 0];
    for (let f = 0; f < m; f++) {
      const dm = Math.hypot(pr.q.x - mx[f]!, pr.q.y - my[f]!, pr.q.z - mz[f]!) - mr[f]!;
      if (dm >= best) continue;
      const a = ecke(h.tri[3 * f]!);
      const b = ecke(h.tri[3 * f + 1]!);
      const c = ecke(h.tri[3 * f + 2]!);
      const w = naechsterImDreieck(pr.q, a, b, c);
      const d = Math.hypot(w[0] * a.x + w[1] * b.x + w[2] * c.x - pr.q.x, w[0] * a.y + w[1] * b.y + w[2] * c.y - pr.q.y, w[0] * a.z + w[1] * b.z + w[2] * c.z - pr.q.z);
      if (d < best) {
        best = d;
        wahl = f;
        bary = w;
      }
    }
    const v = [h.tri[3 * wahl]!, h.tri[3 * wahl + 1]!, h.tri[3 * wahl + 2]!];
    dazu(pr, pr.spiegel, v, bary);
    // Proben auf der Mittelebene an beide Hälften: sonst hängt die Kurve an einer Seite, und der Körper wird beim Ziehen schief
    const w = v.map((u) => h.spiegel[u]!);
    if (Math.abs(pr.q.z) < 1e-6 && w.every((u) => u >= 0) && w.some((u, e) => u !== v[e])) dazu(pr, 1, w, bary);
  }
  return {
    stueck: Int32Array.from(stuecke),
    t: Float64Array.from(ts),
    spiegel: Uint8Array.from(spiegel),
    ecken: Int32Array.from(ecken),
    b: Float64Array.from(bs),
  };
}

/**
 * Löser der Haut für feste Anheftungen und einen Einflussbereich: einmal zerlegt (nur die Punkte im Bereich sind Unbekannte, die
 * anderen bleiben, wo sie sind), je Zug nur Einsetzen. Bezug sind die Haut und die Kurven beim Anlegen: Ohne Änderung bleibt
 * alles genau so. Gleichmäßiger Laplace (Mittel der Nachbarn); als Normalgleichungen ist das biharmonisch, der Übergang an den
 * Rand des Bereichs bleibt glatt.
 */
export class HautLoeser {
  private readonly sys: NormalSystem;
  /** Unbekannte → Punkt der Haut */
  private readonly frei: Int32Array;
  /** Punkt der Haut → Unbekannte (−1: bleibt) */
  private readonly nr: Int32Array;
  /** Punkte, deren Laplace-Zeile eine Unbekannte enthält */
  private readonly zeilen: Int32Array;
  /** Proben mit einer Unbekannten: Kurve, Anheftung, Probe, Punkt der Haut und Probe der Kurve beim Anlegen */
  private readonly proben: { kurve: number; a: Anheftung; j: Int32Array; haut0: Float64Array; kurve0: Float64Array }[];
  private readonly ruhe: Vermessung;
  readonly zeitZerlegen: number;

  constructor(
    private readonly h: Haut,
    anheftungen: readonly { kurve: number; a: Anheftung }[],
    kurven: readonly Kurve[],
    /** 1 = darf sich bewegen; fehlt: die ganze Haut */
    bereich: Uint8Array | null = null,
    private readonly gewicht = 100,
  ) {
    const n = h.n;
    const P = h.pos;
    const nr = new Int32Array(n).fill(-1);
    const frei: number[] = [];
    for (let v = 0; v < n; v++) {
      if (bereich && !bereich[v]) continue;
      nr[v] = frei.length;
      frei.push(v);
    }
    this.nr = nr;
    this.frei = Int32Array.from(frei);
    const zeilen: NormalZeile[] = [];
    const lapZeilen: number[] = [];
    for (let i = 0; i < n; i++) {
      const nb = h.nachbarn[i]!;
      const d = nb.length || 1;
      const index: number[] = [];
      const wert: number[] = [];
      if (nr[i]! >= 0) {
        index.push(nr[i]!);
        wert.push(1);
      }
      for (const j of nb) {
        if (nr[j]! < 0) continue;
        index.push(nr[j]!);
        wert.push(-1 / d);
      }
      if (index.length === 0) continue;
      lapZeilen.push(i);
      zeilen.push({ index, wert, gewicht: 1 });
    }
    this.zeilen = Int32Array.from(lapZeilen);
    this.proben = [];
    for (const { kurve, a } of anheftungen) {
      const k = kurven[kurve];
      if (!k) continue;
      const st = kurvenStuecke(k);
      const js: number[] = [];
      for (let j = 0; j < a.stueck.length; j++) {
        const index: number[] = [];
        const wert: number[] = [];
        for (let e = 0; e < 3; e++) {
          const v = a.ecken[3 * j + e]!;
          if (nr[v]! < 0) continue;
          index.push(nr[v]!);
          wert.push(a.b[3 * j + e]!);
        }
        if (index.length === 0) continue;
        js.push(j);
        zeilen.push({ index, wert, gewicht });
      }
      const haut0 = new Float64Array(3 * js.length);
      const kurve0 = new Float64Array(3 * js.length);
      js.forEach((j, u) => {
        const q = aufStueck(st[a.stueck[j]!]!, a.t[j]!);
        kurve0[3 * u] = q.x;
        kurve0[3 * u + 1] = q.y;
        kurve0[3 * u + 2] = q.z;
        for (let e = 0; e < 3; e++) {
          const v = a.ecken[3 * j + e]!;
          for (let c = 0; c < 3; c++) haut0[3 * u + c] = haut0[3 * u + c]! + a.b[3 * j + e]! * P[3 * v + c]!;
        }
      });
      this.proben.push({ kurve, a, j: Int32Array.from(js), haut0, kurve0 });
    }
    const nachbarn = frei.map((v) => h.nachbarn[v]!.filter((j) => nr[j]! >= 0).map((j) => nr[j]!));
    const t0 = Date.now();
    this.sys = normalSystem(frei.length, zeilen, nachbarn, 1e-9);
    this.zeitZerlegen = Date.now() - t0;
    this.ruhe = vermessen(h);
  }

  /** Anzahl der Punkte, die sich bewegen dürfen */
  get anzahl(): number {
    return this.frei.length;
  }

  /**
   * Lagen neu: `iterationen` Runden; die Kurven geben die Ziele ihrer Proben (der Punkt der Haut macht die Verschiebung seiner
   * Probe seit dem Anlegen mit). Je Punkt: Laplace = Verteilung beim Anlegen (mit der Normale gedreht, mit den Kanten gestreckt)
   * + Krümmung beim Anlegen · Kantenlänge² längs der Normale.
   */
  schritt(kurven: readonly Kurve[], iterationen = 2): void {
    const h = this.h;
    const P = h.pos;
    const nr = this.nr;
    const r = this.ruhe;
    const stuecke = kurven.map((k) => kurvenStuecke(k));
    const nf = this.frei.length;
    for (let it = 0; it < iterationen; it++) {
      const m = vermessen(h);
      const rhs = new Float64Array(3 * nf);
      for (const i of this.zeilen) {
        const nb = h.nachbarn[i]!;
        const d = nb.length || 1;
        const t = drehen(r.nor, m.nor, i, r.tang);
        const s = Math.sqrt(m.kante2[i]! / r.kante2[i]!);
        // wie die Verteilung nur mit der Kante gestreckt (nicht mit ihrem Quadrat): eine gleichmäßig vergrößerte Kugel bleibt so
        // genau eine Kugel; mit Kante² blähte sich die höher gezogene Kugel in der Tiefe auf (150 → 186)
        const k = r.kap[i]! * r.kante2[i]! * s;
        let dx = s * t[0] + k * m.nor[3 * i]!;
        let dy = s * t[1] + k * m.nor[3 * i + 1]!;
        let dz = s * t[2] + k * m.nor[3 * i + 2]!;
        // was fest bleibt, auf die rechte Seite
        if (nr[i]! < 0) {
          dx -= P[3 * i]!;
          dy -= P[3 * i + 1]!;
          dz -= P[3 * i + 2]!;
        }
        for (const j of nb) {
          if (nr[j]! >= 0) continue;
          dx += P[3 * j]! / d;
          dy += P[3 * j + 1]! / d;
          dz += P[3 * j + 2]! / d;
        }
        const u = nr[i]!;
        if (u >= 0) {
          rhs[3 * u] = rhs[3 * u]! + dx;
          rhs[3 * u + 1] = rhs[3 * u + 1]! + dy;
          rhs[3 * u + 2] = rhs[3 * u + 2]! + dz;
        }
        for (const j of nb) {
          const w = nr[j]!;
          if (w < 0) continue;
          rhs[3 * w] = rhs[3 * w]! - dx / d;
          rhs[3 * w + 1] = rhs[3 * w + 1]! - dy / d;
          rhs[3 * w + 2] = rhs[3 * w + 2]! - dz / d;
        }
      }
      for (const { kurve, a, j: js, haut0, kurve0 } of this.proben) {
        const st = stuecke[kurve];
        if (!st) continue;
        for (let u = 0; u < js.length; u++) {
          const j = js[u]!;
          const q = aufStueck(st[a.stueck[j]!]!, a.t[j]!);
          let zx = haut0[3 * u]! + q.x - kurve0[3 * u]!;
          let zy = haut0[3 * u + 1]! + q.y - kurve0[3 * u + 1]!;
          let zz = haut0[3 * u + 2]! + (a.spiegel[j] ? -1 : 1) * (q.z - kurve0[3 * u + 2]!);
          for (let e = 0; e < 3; e++) {
            const v = a.ecken[3 * j + e]!;
            if (nr[v]! >= 0) continue;
            const b = a.b[3 * j + e]!;
            zx -= b * P[3 * v]!;
            zy -= b * P[3 * v + 1]!;
            zz -= b * P[3 * v + 2]!;
          }
          for (let e = 0; e < 3; e++) {
            const v = nr[a.ecken[3 * j + e]!]!;
            if (v < 0) continue;
            const w = this.gewicht * a.b[3 * j + e]!;
            rhs[3 * v] = rhs[3 * v]! + w * zx;
            rhs[3 * v + 1] = rhs[3 * v + 1]! + w * zy;
            rhs[3 * v + 2] = rhs[3 * v + 2]! + w * zz;
          }
        }
      }
      const x = this.sys.loesen(rhs);
      for (let u = 0; u < nf; u++) {
        const v = this.frei[u]!;
        P[3 * v] = x[3 * u]!;
        P[3 * v + 1] = x[3 * u + 1]!;
        P[3 * v + 2] = x[3 * u + 2]!;
      }
    }
  }
}

/**
 * Je Punkt der Laplace (Punkt − Mittel der Nachbarn): sein Anteil längs der Normale ist Krümmung · Kantenlänge², der Rest liegt
 * in der Fläche und sagt nur, wie die Punkte verteilt sind (beim Netz aus Surface Nets ist er viel größer).
 */
function vermessen(h: Haut): Vermessung {
  const n = h.n;
  const P = h.pos;
  const nor = hautNormalen(h);
  const kap = new Float64Array(n);
  const kante2 = new Float64Array(n);
  const tang = new Float64Array(3 * n);
  for (let i = 0; i < n; i++) {
    const nb = h.nachbarn[i]!;
    let sx = 0;
    let sy = 0;
    let sz = 0;
    let e2 = 0;
    for (const j of nb) {
      sx += P[3 * j]!;
      sy += P[3 * j + 1]!;
      sz += P[3 * j + 2]!;
      e2 += (P[3 * j]! - P[3 * i]!) ** 2 + (P[3 * j + 1]! - P[3 * i + 1]!) ** 2 + (P[3 * j + 2]! - P[3 * i + 2]!) ** 2;
    }
    const d = nb.length || 1;
    const lx = P[3 * i]! - sx / d;
    const ly = P[3 * i + 1]! - sy / d;
    const lz = P[3 * i + 2]! - sz / d;
    const k = lx * nor[3 * i]! + ly * nor[3 * i + 1]! + lz * nor[3 * i + 2]!;
    kante2[i] = Math.max(e2 / d, 1e-9);
    kap[i] = k / kante2[i]!;
    tang[3 * i] = lx - k * nor[3 * i]!;
    tang[3 * i + 1] = ly - k * nor[3 * i + 1]!;
    tang[3 * i + 2] = lz - k * nor[3 * i + 2]!;
  }
  return { nor, kap, kante2, tang };
}

/** Einfluss wie O in Blender („glatt“): 1 in der Mitte, 0 am Rand des Kreises. */
export function einfluss(d: number, r: number): number {
  if (d >= r) return 0;
  const u = 1 - d / r;
  return u * u * (3 - 2 * u);
}

/**
 * Einflussbereich auf der Haut: Punkte im Abstand < r um einen der Mittelpunkte (oder sein Spiegelbild), dazu die Punkte unter
 * den Proben der Stücke, die sich ändern (`stuecke`: Kurve → Nummern), mit `ringe` Nachbarringen darum.
 */
export function einflussBereich(
  h: Haut,
  zentren: readonly V3[],
  r: number,
  anheftungen: readonly { kurve: number; a: Anheftung }[] = [],
  stuecke: ReadonlyMap<number, ReadonlySet<number>> = new Map(),
  ringe = 3,
): Uint8Array {
  const P = h.pos;
  const aus = new Uint8Array(h.n);
  for (let v = 0; v < h.n; v++) {
    for (const c of zentren) {
      const dx = P[3 * v]! - c.x;
      const dy = P[3 * v + 1]! - c.y;
      const dz = Math.min(Math.abs(P[3 * v + 2]! - c.z), Math.abs(P[3 * v + 2]! + c.z));
      if (dx * dx + dy * dy + dz * dz < r * r) {
        aus[v] = 1;
        break;
      }
    }
  }
  let rand: number[] = [];
  for (const { kurve, a } of anheftungen) {
    const s = stuecke.get(kurve);
    if (!s) continue;
    for (let j = 0; j < a.stueck.length; j++) {
      if (!s.has(a.stueck[j]!)) continue;
      for (let e = 0; e < 3; e++) {
        const v = a.ecken[3 * j + e]!;
        if (!aus[v]) {
          aus[v] = 1;
          rand.push(v);
        }
      }
    }
  }
  for (let k = 0; k < ringe; k++) {
    const neu: number[] = [];
    for (const v of rand) {
      for (const j of h.nachbarn[v]!) {
        if (aus[j]) continue;
        aus[j] = 1;
        neu.push(j);
      }
    }
    rand = neu;
  }
  return aus;
}

/** Nächste Stelle einer Kurve zu q (abgetastet, dann im Stück verfeinert): Stück, Parameter, Lage. */
export function stelleAufKurve(k: Kurve, q: V3): { stueck: number; t: number; p: V3 } {
  const st = kurvenStuecke(k);
  let best = Infinity;
  let bs = 0;
  let bt = 0;
  st.forEach((s, i) => {
    for (let j = 0; j <= 32; j++) {
      const p = aufStueck(s, j / 32);
      const d = laenge(minus(p, q));
      if (d < best) {
        best = d;
        bs = i;
        bt = j / 32;
      }
    }
  });
  let schritt = 1 / 64;
  for (let k2 = 0; k2 < 20; k2++) {
    for (const t of [bt - schritt, bt + schritt]) {
      if (t < 0 || t > 1) continue;
      const d = laenge(minus(aufStueck(st[bs]!, t), q));
      if (d < best) {
        best = d;
        bt = t;
      }
    }
    schritt /= 2;
  }
  return { stueck: bs, t: bt, p: aufStueck(st[bs]!, bt) };
}

type Vermessung = { nor: Float64Array; kap: Float64Array; kante2: Float64Array; tang: Float64Array };

/** Vektor v (Punkt i) mit der kleinsten Drehung, die die Normale a in die Normale b überführt (Rodrigues). */
function drehen(a: Float64Array, b: Float64Array, i: number, v: Float64Array): [number, number, number] {
  const ax = a[3 * i]!;
  const ay = a[3 * i + 1]!;
  const az = a[3 * i + 2]!;
  const bx = b[3 * i]!;
  const by = b[3 * i + 1]!;
  const bz = b[3 * i + 2]!;
  const vx = v[3 * i]!;
  const vy = v[3 * i + 1]!;
  const vz = v[3 * i + 2]!;
  let kx = ay * bz - az * by;
  let ky = az * bx - ax * bz;
  let kz = ax * by - ay * bx;
  const sin = Math.hypot(kx, ky, kz);
  const cos = ax * bx + ay * by + az * bz;
  if (sin < 1e-12) return cos >= 0 ? [vx, vy, vz] : [-vx, -vy, -vz];
  kx /= sin;
  ky /= sin;
  kz /= sin;
  const kv = kx * vx + ky * vy + kz * vz;
  return [
    vx * cos + (ky * vz - kz * vy) * sin + kx * kv * (1 - cos),
    vy * cos + (kz * vx - kx * vz) * sin + ky * kv * (1 - cos),
    vz * cos + (kx * vy - ky * vx) * sin + kz * kv * (1 - cos),
  ];
}

/**
 * Ein Ring um den Körper an einer Stelle der Seite (wie ein Loop-Schnitt): der Schnitt der Haut mit der Ebene durch die Strecke
 * a → b, senkrecht zur Seite; seine Hälfte z ≥ 0 mit wenigen Punkten (Anfang und Ende auf der Mittelebene, dazwischen die
 * tiefste Stelle, dann jeweils die Stelle größter Abweichung, bis die Kurve höchstens `tol` abweicht, höchstens 7 Punkte).
 */
export function ringAusSchnitt(h: Haut, a: { x: number; y: number }, b: { x: number; y: number }, tol: number): Kurve | null {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const L = Math.hypot(dx, dy);
  if (L < 1e-6) return null;
  // Normale der Ebene in der Seite, Lage längs der Strecke
  const nx = -dy / L;
  const ny = dx / L;
  const P = h.pos;
  const abst = (v: number) => (P[3 * v]! - a.x) * nx + (P[3 * v + 1]! - a.y) * ny;
  const laengs = (x: number, y: number) => ((x - a.x) * dx + (y - a.y) * dy) / (L * L);
  // Schnittpunkte auf Kanten, die Hälfte z ≥ 0, innerhalb der Strecke
  const pkt: V3[] = [];
  for (let t = 0; t < h.tri.length; t += 3) {
    for (let e = 0; e < 3; e++) {
      const u = h.tri[t + e]!;
      const v = h.tri[t + ((e + 1) % 3)]!;
      if (u > v) continue;
      const du = abst(u);
      const dv = abst(v);
      if (du < 0 === dv < 0) continue;
      const s = du / (du - dv);
      const q = {
        x: P[3 * u]! + s * (P[3 * v]! - P[3 * u]!),
        y: P[3 * u + 1]! + s * (P[3 * v + 1]! - P[3 * u + 1]!),
        z: P[3 * u + 2]! + s * (P[3 * v + 2]! - P[3 * u + 2]!),
      };
      const l = laengs(q.x, q.y);
      if (q.z >= 0 && l >= 0 && l <= 1) pkt.push(q);
    }
  }
  if (pkt.length < 3) return null;
  // nach dem Winkel um die Mitte der Ebene (längs, z) ordnen: von einem Ende über z > 0 zum anderen
  let cl = 0;
  for (const q of pkt) cl += laengs(q.x, q.y);
  cl /= pkt.length;
  const winkel = (q: V3) => Math.atan2(q.z, (laengs(q.x, q.y) - cl) * L);
  pkt.sort((p1, p2) => winkel(p1) - winkel(p2));
  // Enden auf die Mittelebene
  const anfang = { ...pkt[0]!, z: 0 };
  const ende = { ...pkt[pkt.length - 1]!, z: 0 };
  const voll = [anfang, ...pkt, ende];
  let iMax = 0;
  for (let i = 1; i < voll.length; i++) if (voll[i]!.z > voll[iMax]!.z) iMax = i;
  const wahl = [...new Set([0, iMax, voll.length - 1])].sort((p1, p2) => p1 - p2);
  const abweichung = (k: Kurve): { d: number; i: number } => {
    const proben = kurveAbtasten(k, tol / 2).p;
    let schlimm = 0;
    let wo = -1;
    for (let i = 1; i < voll.length - 1; i++) {
      if (wahl.includes(i)) continue;
      let best = Infinity;
      for (const q of proben) best = Math.min(best, laenge(minus(q, voll[i]!)));
      if (best > schlimm) {
        schlimm = best;
        wo = i;
      }
    }
    return { d: schlimm, i: wo };
  };
  while (wahl.length < 7) {
    const { d, i } = abweichung({ art: 'ring', punkte: wahl.map((j) => punkt(voll[j]!)) });
    if (d <= tol || i < 0) break;
    wahl.push(i);
    wahl.sort((p1, p2) => p1 - p2);
  }
  return { art: 'ring', punkte: wahl.map((j) => punkt(voll[j]!)) };
}
