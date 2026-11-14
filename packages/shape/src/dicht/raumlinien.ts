// Form zuerst (04.11.2026, Probe „Linien auf der Form“): Linien im Raum als Griffe, die Form ist die rundeste Fläche durch sie.
//
// Florians Modell: eine Form, Linien auf ihr, die Ansichten zeigen sie (der Umriss ist nur Shader). Eine Raumlinie ist eine
// Linie aus Punkten im Raum (x, y, z); jede Ansicht bewegt zwei ihrer drei Koordinaten. Gespeichert ist die Hälfte z ≥ 0, die
// andere ist ihr Spiegelbild; Anfang und Ende liegen auf der Mittelebene (z = 0), also auf dem Umriss der Seite.
//
// Die Seite legt das Volumen an (runder Körper, `rund.ts`): Tiefe √g(x, y) über der gezeichneten Fläche. Die Raumlinien sagen,
// wie tief die Form an ihren Stellen ist: z = s(x, y) · √g. Zwischen den Linien ist s ein glattes gewichtetes Mittel ihrer
// Werte: Eine einzige Linie streckt den ganzen Körper gleichmäßig (aus der Kugel wird ein Ellipsoid), eine Linie längs des
// Körpers hält die Breite Stelle für Stelle fest, und wo keine Linie den Querschnitt anders verlangt, bleibt er ein gestreckter
// Kreis. Wo sich Linien in der Seite kreuzen, teilen sie einen Punkt (Knoten).

import type { V2 } from '../bezier';
import type { Kante3D } from './kanten';

/** Ein Punkt einer Raumlinie; `knoten` verbindet ihn mit den Punkten anderer Linien an derselben Stelle. */
export type RaumPunkt = { x: number; y: number; z: number; ecke?: boolean; knoten?: number };

/** Eine Raumlinie: die Hälfte z ≥ 0, Anfang und Ende auf z = 0; `breite` ist die Strichdicke (0 = weich). */
export type RaumLinie = { punkte: RaumPunkt[]; breite: number };

type V3 = { x: number; y: number; z: number };
type Stueck3 = [V3, V3, V3, V3];

/** Die ganze Schleife: Hälfte und Spiegelbild (z → −z), geschlossen. */
function ganzeSchleife(h: readonly RaumPunkt[]): RaumPunkt[] {
  return [...h, ...h.slice(1, -1).reverse().map((q) => ({ ...q, z: -q.z }))];
}

/**
 * Kubische Stücke der Hälfte, wie das Fenster sie zeichnet: Griffe aus den Nachbarn wie in `umriss.ts` (Kreisbogen-Länge), über
 * das Spiegelbild geschlossen — Anfang und Ende kreuzen die Mittelebene senkrecht.
 */
export function raumStuecke(h: readonly RaumPunkt[]): Stueck3[] {
  const p = ganzeSchleife(h);
  const n = p.length;
  const tangente = (i: number): V3 | null => {
    const q = p[i]!;
    if (q.ecke) return null;
    const a = p[(i - 1 + n) % n]!;
    const b = p[(i + 1) % n]!;
    const t = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
    const l = Math.hypot(t.x, t.y, t.z);
    return l > 1e-12 ? { x: t.x / l, y: t.y / l, z: t.z / l } : null;
  };
  const griff = (t: V3 | null, s: V3, c: number): V3 => {
    if (!t) return { x: s.x / 3, y: s.y / 3, z: s.z / 3 };
    const cos = Math.max(0, Math.min(1, (t.x * s.x + t.y * s.y + t.z * s.z) / (c || 1)));
    const l = (2 * c) / (3 * (1 + cos));
    return { x: t.x * l, y: t.y * l, z: t.z * l };
  };
  const aus: Stueck3[] = [];
  for (let i = 0; i < h.length - 1; i++) {
    const a = p[i]!;
    const b = p[i + 1]!;
    const s = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
    const c = Math.hypot(s.x, s.y, s.z);
    const ga = griff(tangente(i), s, c);
    const gb = griff(tangente(i + 1), s, c);
    aus.push([
      { x: a.x, y: a.y, z: a.z },
      { x: a.x + ga.x, y: a.y + ga.y, z: a.z + ga.z },
      { x: b.x - gb.x, y: b.y - gb.y, z: b.z - gb.z },
      { x: b.x, y: b.y, z: b.z },
    ]);
  }
  return aus;
}

function punktAuf(k: Stueck3, t: number): V3 {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return {
    x: a * k[0].x + b * k[1].x + c * k[2].x + d * k[3].x,
    y: a * k[0].y + b * k[1].y + c * k[2].y + d * k[3].y,
    z: a * k[0].z + b * k[1].z + c * k[2].z + d * k[3].z,
  };
}

/** Die Hälfte abgetastet, Punktabstand ≈ s; `stueck[i]` = Nummer des Stücks der Probe i. */
export function raumAbtasten(l: RaumLinie, s: number): { p: V3[]; stueck: number[] } {
  const p: V3[] = [];
  const stueck: number[] = [];
  const st = raumStuecke(l.punkte);
  st.forEach((k, i) => {
    const grob = Math.hypot(k[1].x - k[0].x, k[1].y - k[0].y, k[1].z - k[0].z) + Math.hypot(k[2].x - k[1].x, k[2].y - k[1].y, k[2].z - k[1].z) + Math.hypot(k[3].x - k[2].x, k[3].y - k[2].y, k[3].z - k[2].z);
    const m = Math.max(2, Math.ceil(grob / s));
    for (let j = 0; j < m; j++) {
      p.push(punktAuf(k, j / m));
      stueck.push(i);
    }
  });
  const letzter = l.punkte[l.punkte.length - 1];
  if (letzter) {
    p.push({ x: letzter.x, y: letzter.y, z: letzter.z });
    stueck.push(Math.max(0, st.length - 1));
  }
  return { p, stueck };
}

/**
 * Die Linien zum Zeichnen (Bänder wie die Kanten): je Linie die ganze Schleife, beide Hälften. `tiefe` legt jede Probe auf die
 * Fläche (Tiefe der Form an ihrer Stelle in der Seite), sonst bleibt sie, wo die Linie ist.
 */
export function raumKanten(linien: readonly RaumLinie[], s: number, tiefe?: (x: number, y: number) => number): Kante3D[] {
  return linien.map((l, i) => {
    const { p } = raumAbtasten(l, s);
    if (tiefe) {
      for (const q of p) {
        const z = tiefe(q.x, q.y);
        if (z > 0) q.z = z;
      }
    }
    const ganz = [...p, ...p.slice(0, -1).reverse().map((q) => ({ ...q, z: -q.z }))];
    const lagen = new Float32Array(3 * ganz.length);
    ganz.forEach((q, k) => {
      lagen[3 * k] = q.x;
      lagen[3 * k + 1] = q.y;
      lagen[3 * k + 2] = q.z;
    });
    return { lagen, breite: new Float32Array(ganz.length).fill(l.breite), linie: i };
  });
}

/** Raster der Seite: halbe Dicke des runden Körpers (√g) auf (x0 + i·d, y0 + j·d). */
export type Dickenraster = { G: Float64Array; nx: number; ny: number; x0: number; y0: number; d: number };

/** √g bilinear an (x, y) (außen 0). */
function dickeBei(r: Dickenraster, x: number, y: number): number {
  const u = (x - r.x0) / r.d;
  const v = (y - r.y0) / r.d;
  const i = Math.floor(u);
  const j = Math.floor(v);
  if (i < 0 || j < 0 || i >= r.nx - 1 || j >= r.ny - 1) return 0;
  const t = u - i;
  const s = v - j;
  const g = (a: number, b: number) => Math.sqrt(Math.max(0, r.G[b * r.nx + a]!));
  return (1 - s) * ((1 - t) * g(i, j) + t * g(i + 1, j)) + s * ((1 - t) * g(i, j + 1) + t * g(i + 1, j + 1));
}

/**
 * Streckung s(x, y) der Tiefe auf dem Raster der Seite, so dass die Form durch alle Raumlinien geht: An jeder Probe einer Linie
 * ist s = z / √g; dazwischen ein glattes, nach Abstand gewichtetes Mittel (1 / (r² + d²)²). Es bleibt immer zwischen den Werten
 * der Linien (eine dünne Platte schoss an Spitzen auf das Doppelte), gibt mit einer einzigen gleichmäßigen Linie überall ihren
 * Wert (aus der Kugel wird ein Ellipsoid), und wo Linien den Querschnitt nicht anders verlangen, bleibt er ein gestreckter Kreis.
 * Ohne Linien: null.
 */
export function streckungAusLinien(r: Dickenraster, linien: readonly RaumLinie[]): Float64Array | null {
  // je Zelle der Mittelwert der Verhältnisse aller Proben, die in sie fallen
  const summe = new Map<number, { x: number; y: number; s: number; n: number }>();
  for (const l of linien) {
    // Proben im Abstand von etwa einer Zelle, höchstens 160 je Linie
    const laenge = raumAbtasten(l, r.d).p.length * r.d;
    const { p } = raumAbtasten(l, Math.max(r.d, laenge / 160));
    for (const q of p) {
      const g = dickeBei(r, q.x, q.y);
      // am Rand der Seite (Tiefe fast 0) sagt das Verhältnis nichts
      if (g < 2 * r.d || q.z <= 0) continue;
      const key = Math.round(q.x / r.d) * 100003 + Math.round(q.y / r.d);
      const e = summe.get(key);
      if (e) {
        e.x += q.x;
        e.y += q.y;
        e.s += q.z / g;
        e.n++;
      } else summe.set(key, { x: q.x, y: q.y, s: q.z / g, n: 1 });
    }
  }
  const cx: number[] = [];
  const cy: number[] = [];
  const cs: number[] = [];
  for (const e of summe.values()) {
    cx.push(e.x / e.n);
    cy.push(e.y / e.n);
    cs.push(e.s / e.n);
  }
  const m = cx.length;
  if (m === 0) return null;
  const e2 = r.d * r.d;
  const feld = new Float64Array(r.nx * r.ny);
  for (let j = 0; j < r.ny; j++) {
    const y = r.y0 + j * r.d;
    for (let i = 0; i < r.nx; i++) {
      const x = r.x0 + i * r.d;
      let s = 0;
      let w = 0;
      for (let k = 0; k < m; k++) {
        const q = (x - cx[k]!) ** 2 + (y - cy[k]!) ** 2 + e2;
        const g = 1 / (q * q);
        s += g * cs[k]!;
        w += g;
      }
      feld[j * r.nx + i] = Math.max(0.05, Math.min(20, s / w));
    }
  }
  return feld;
}

/**
 * Wo der Körper von vorn und von oben am breitesten ist: je Zeile (Höhe y) die Stelle x* mit der größten Tiefe, je Spalte
 * (Stelle x) die Höhe y* — die Linien, die der Umriss von Front und Top auf der Form zeigt.
 */
export type Kontur = {
  x0: number;
  y0: number;
  d: number;
  nx: number;
  ny: number;
  frontX: Float64Array;
  frontZ: Float64Array;
  topY: Float64Array;
  topZ: Float64Array;
  /** Tiefe der Form je Rasterpunkt (außen 0) */
  Z: Float64Array;
};

/** Tiefe der Form an (x, y), bilinear aus der Kontur (außen 0). */
export function tiefeAusKontur(k: Kontur, x: number, y: number): number {
  const u = (x - k.x0) / k.d;
  const v = (y - k.y0) / k.d;
  const i = Math.floor(u);
  const j = Math.floor(v);
  if (i < 0 || j < 0 || i >= k.nx - 1 || j >= k.ny - 1) return 0;
  const t = u - i;
  const s = v - j;
  const z = (a: number, b: number) => k.Z[b * k.nx + a]!;
  return (1 - s) * ((1 - t) * z(i, j) + t * z(i + 1, j)) + s * ((1 - t) * z(i, j + 1) + t * z(i + 1, j + 1));
}

export function konturAusTiefe(r: Dickenraster, feld: Float64Array | null): Kontur {
  const frontX = new Float64Array(r.ny);
  const frontZ = new Float64Array(r.ny);
  const topY = new Float64Array(r.nx);
  const topZ = new Float64Array(r.nx);
  const Z = new Float64Array(r.nx * r.ny);
  for (let j = 0; j < r.ny; j++) {
    for (let i = 0; i < r.nx; i++) {
      const g = r.G[j * r.nx + i]!;
      if (!(g > 0)) continue;
      const z = Math.sqrt(g) * (feld ? feld[j * r.nx + i]! : 1);
      Z[j * r.nx + i] = z;
      if (z > frontZ[j]!) {
        frontZ[j] = z;
        frontX[j] = r.x0 + i * r.d;
      }
      if (z > topZ[i]!) {
        topZ[i] = z;
        topY[i] = r.y0 + j * r.d;
      }
    }
  }
  return { x0: r.x0, y0: r.y0, d: r.d, nx: r.nx, ny: r.ny, frontX, frontZ, topY, topZ, Z };
}

/**
 * Die Linie, die der Umriss einer Ansicht auf der Form zeigt, als Raumlinie mit wenigen Punkten: Front von oben nach unten,
 * Top von links nach rechts, Anfang und Ende auf dem Umriss der Seite (z = 0).
 */
export function umrissLinie(k: Kontur, art: 'front' | 'top', tol: number): RaumLinie | null {
  const roh: V3[] = [];
  if (art === 'front') {
    for (let j = k.ny - 1; j >= 0; j--) if (k.frontZ[j]! > 0) roh.push({ x: k.frontX[j]!, y: k.y0 + j * k.d, z: k.frontZ[j]! });
  } else {
    for (let i = 0; i < k.nx; i++) if (k.topZ[i]! > 0) roh.push({ x: k.x0 + i * k.d, y: k.topY[i]!, z: k.topZ[i]! });
  }
  if (roh.length < 3) return null;
  // Enden auf die Mittelebene, wo die Tiefe auf 0 geht: nahe einem runden Ende ist z² fast linear in der Länge (Kreis), also
  // aus den beiden letzten Proben hinaus verlängert, höchstens eine Zelle (eine feste Zelle weiter lag an der Kugel 3 Einheiten
  // daneben, und die Linie brauchte dafür acht statt drei Punkte)
  const ende = (q: V3, p: V3, richtung: number): V3 => {
    const steig = (p.z * p.z - q.z * q.z) / k.d;
    const weiter = steig > 1e-9 ? Math.min(k.d, (q.z * q.z) / steig) : k.d;
    return art === 'front' ? { x: q.x, y: q.y + richtung * weiter, z: 0 } : { x: q.x + richtung * weiter, y: q.y, z: 0 };
  };
  const anfang = ende(roh[0]!, roh[1]!, art === 'front' ? 1 : -1);
  const schluss = ende(roh[roh.length - 1]!, roh[roh.length - 2]!, art === 'front' ? -1 : 1);
  // die Spitzen (sehr flach am Rand) glätten: gleitender Mittelwert über drei Proben
  const glatt = roh.map((q, i) => {
    const p0 = roh[Math.max(0, i - 1)]!;
    const p2 = roh[Math.min(roh.length - 1, i + 1)]!;
    return { x: (p0.x + 2 * q.x + p2.x) / 4, y: (p0.y + 2 * q.y + p2.y) / 4, z: (p0.z + 2 * q.z + p2.z) / 4 };
  });
  // wenige Punkte zum Greifen: Anfang, die tiefste Stelle, Ende; dann jeweils die Stelle, an der die Linie am weitesten neben dem
  // Umriss liegt, bis sie höchstens tol abweicht (höchstens 8 Punkte) — Punkte auf einem Kreis geben einen Kreis
  const voll = [anfang, ...glatt, schluss];
  let iMax = 0;
  for (let i = 1; i < voll.length; i++) if (voll[i]!.z > voll[iMax]!.z) iMax = i;
  const wahl = [...new Set([0, iMax, voll.length - 1])].sort((p, q) => p - q);
  while (wahl.length < 8) {
    const { p: proben } = raumAbtasten({ punkte: wahl.map((i) => ({ ...voll[i]! })), breite: 0 }, tol / 2);
    let schlimm = 0;
    let wo = -1;
    for (let i = 1; i < voll.length - 1; i++) {
      if (wahl.includes(i)) continue;
      const d = abstandZurLinie(voll[i]!, proben);
      if (d > schlimm) {
        schlimm = d;
        wo = i;
      }
    }
    if (schlimm <= tol || wo < 0) break;
    wahl.push(wo);
    wahl.sort((p, q) => p - q);
  }
  return { punkte: wahl.map((i) => ({ x: voll[i]!.x, y: voll[i]!.y, z: voll[i]!.z })), breite: 0 };
}

/** Abstand eines Punkts zu einer Polylinie im Raum. */
function abstandZurLinie(q: V3, p: readonly V3[]): number {
  let best = Infinity;
  for (let i = 0; i + 1 < p.length; i++) {
    const a = p[i]!;
    const b = p[i + 1]!;
    const ab = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
    const l2 = ab.x * ab.x + ab.y * ab.y + ab.z * ab.z;
    const t = l2 > 0 ? Math.max(0, Math.min(1, ((q.x - a.x) * ab.x + (q.y - a.y) * ab.y + (q.z - a.z) * ab.z) / l2)) : 0;
    best = Math.min(best, Math.hypot(a.x + t * ab.x - q.x, a.y + t * ab.y - q.y, a.z + t * ab.z - q.z));
  }
  return best;
}

/**
 * Wo sich zwei Linien in der Seite kreuzen, bekommen beide dort einen gemeinsamen Punkt (Knoten, Nummer aus `nummer`): Er liegt
 * auf beiden, und wer ihn in einer Ansicht zieht, zieht beide Linien. Liegt schon ein Punkt nahe der Kreuzung (`nah`), wird er
 * der Knoten. Ändert die Linien an Ort und Stelle; gibt die Zahl der Knoten zurück.
 */
export function verbinden(a: RaumLinie, b: RaumLinie, nummer: () => number, nah: number): number {
  const sa = raumAbtasten(a, nah / 2);
  const sb = raumAbtasten(b, nah / 2);
  const kr = kreuzungen(sa.p, sb.p);
  // je Linie: (Stück, Lage) der neuen Punkte, von hinten nach vorn einfügen
  type Neu = { stueck: number; t: number; p: RaumPunkt };
  const neuA: Neu[] = [];
  const neuB: Neu[] = [];
  const amEnde = (l: RaumLinie, i: number) => i === 0 || i === l.punkte.length - 1;
  for (const k of kr) {
    const ia = Math.floor(k.ia);
    const ib = Math.floor(k.ib);
    const pa = sa.p[ia]!;
    const qa = sa.p[ia + 1]!;
    const pb = sb.p[ib]!;
    const qb = sb.p[ib + 1]!;
    const za = pa.z + (k.ia - ia) * (qa.z - pa.z);
    const zb = pb.z + (k.ib - ib) * (qb.z - pb.z);
    // Kreuzungen auf der Mittelebene sind Enden, kein Knoten
    if (za <= nah / 4 && zb <= nah / 4) continue;
    const id = nummer();
    const p: RaumPunkt = { x: k.p.x, y: k.p.y, z: (za + zb) / 2, knoten: id };
    for (const [l, s, neu] of [
      [a, sa, neuA],
      [b, sb, neuB],
    ] as const) {
      const i = s === sa ? ia : ib;
      // ein vorhandener Punkt in der Nähe wird der Knoten
      const nahe = l.punkte.findIndex((q, j) => !amEnde(l, j) && Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z) < nah);
      if (nahe >= 0) l.punkte[nahe] = { ...l.punkte[nahe]!, x: p.x, y: p.y, z: p.z, knoten: id };
      else neu.push({ stueck: s.stueck[i]!, t: i, p: { ...p } });
    }
  }
  for (const [l, neu] of [
    [a, neuA],
    [b, neuB],
  ] as const) {
    neu.sort((p, q) => q.t - p.t);
    for (const n of neu) l.punkte.splice(n.stueck + 1, 0, n.p);
  }
  return kr.length;
}

/** Einen Punkt setzen; ist er ein Knoten, ziehen alle Punkte mit derselben Nummer mit. */
export function punktSetzen(linien: RaumLinie[], l: number, i: number, p: { x: number; y: number; z: number }): void {
  const alt = linien[l]!.punkte[i]!;
  linien[l]!.punkte[i] = { ...alt, x: p.x, y: p.y, z: p.z };
  if (alt.knoten === undefined) return;
  for (const linie of linien) {
    linie.punkte = linie.punkte.map((q) => (q.knoten === alt.knoten ? { ...q, x: p.x, y: p.y, z: p.z } : q));
  }
}

/** Kreuzungen zweier Linien in der Seite (x, y): Lage und Bogenanteil (Probe + Bruchteil) auf beiden. */
export function kreuzungen(a: readonly V3[], b: readonly V3[]): { p: V2; ia: number; ib: number }[] {
  const aus: { p: V2; ia: number; ib: number }[] = [];
  for (let i = 0; i + 1 < a.length; i++) {
    const p = a[i]!;
    const q = a[i + 1]!;
    for (let j = 0; j + 1 < b.length; j++) {
      const r = b[j]!;
      const s = b[j + 1]!;
      const d = (q.x - p.x) * (s.y - r.y) - (q.y - p.y) * (s.x - r.x);
      if (Math.abs(d) < 1e-12) continue;
      const t = ((r.x - p.x) * (s.y - r.y) - (r.y - p.y) * (s.x - r.x)) / d;
      const u = ((r.x - p.x) * (q.y - p.y) - (r.y - p.y) * (q.x - p.x)) / d;
      if (t < 0 || t >= 1 || u < 0 || u >= 1) continue;
      aus.push({ p: { x: p.x + t * (q.x - p.x), y: p.y + t * (q.y - p.y) }, ia: i + t, ib: j + u });
    }
  }
  return aus;
}
