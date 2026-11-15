/**
 * Auswahl (Konzept „Auswahl und Werkzeug P“, Florian, 15.11.2026: „Momentan kann ich keinen punkt auswählen und es soll auch eine
 * mehrfachselektion stattfinden können“). Hier die Rechnung auf dem Netz der 2D-Probe; wie es aussieht und bedient wird, steht in
 * `verhalten.ts`.
 *
 * - Ziehen: Alle gewählten Punkte gehen genau um denselben Weg mit, ihre Griffe mit ihnen; Stützen dazwischen mit fallendem Gewicht
 *   (zwischen zwei gewählten ganz).
 * - Löschen: Die Linie läuft durch die Nachbarn weiter, so nah am alten Verlauf wie möglich: Die Stücke über die gelöschten Punkte
 *   werden ein Stück, dessen Griffe in der alten Richtung stehen und dessen Längen nach den kleinsten Quadraten passen.
 */

import { type Linie, type Netz, type Stueck, bezier, kontrollpunkte, netzKopie } from './netz';
import { type V2, bezierAbl } from './stift';

const glatt = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** sichtbare Punkte im Rechteck */
export function punkteImRahmen(n: Netz, x0: number, y0: number, x1: number, y1: number): number[] {
  const [xa, xb] = [Math.min(x0, x1), Math.max(x0, x1)];
  const [ya, yb] = [Math.min(y0, y1), Math.max(y0, y1)];
  const aus: number[] = [];
  n.punkte.forEach((p, i) => {
    if (p.sichtbar && p.x >= xa && p.x <= xb && p.y >= ya && p.y <= yb) aus.push(i);
  });
  return aus;
}

/** alle sichtbaren Punkte einer Linie (der ganze Loop) */
export function punkteDerLinie(n: Netz, li: number): number[] {
  const l = n.linien[li];
  return l ? [...new Set(l.punkte.filter((p) => n.punkte[p]?.sichtbar))] : [];
}

/** mehrere Punkte um (dx, dy) ziehen (aus `start` in `ziel`) */
export function punkteZiehen(start: Netz, ziel: Netz, pis: readonly number[], dx: number, dy: number): void {
  const gewaehlt = new Set(pis);
  for (const pi of gewaehlt) {
    ziel.punkte[pi]!.x = start.punkte[pi]!.x + dx;
    ziel.punkte[pi]!.y = start.punkte[pi]!.y + dy;
  }
  const gewicht = new Map<number, number>();
  for (const l0 of start.linien) {
    const m = l0.stuecke.length;
    const np = l0.punkte.length;
    l0.punkte.forEach((p, pos) => {
      if (!gewaehlt.has(p)) return;
      for (const richtung of [1, -1]) {
        const glieder: { p: number; s: number }[] = [];
        let q = pos;
        let s = 0;
        for (let schritt = 0; schritt < m; schritt++) {
          const si = richtung > 0 ? q : q - 1;
          if (!l0.zu && (si < 0 || si >= m)) break;
          const k = kontrollpunkte(start, l0, ((si % m) + m) % m);
          s += Math.hypot(k[2] - k[0], k[3] - k[1]) + Math.hypot(k[4] - k[2], k[5] - k[3]) + Math.hypot(k[6] - k[4], k[7] - k[5]);
          q += richtung;
          const naechster = l0.punkte[((q % np) + np) % np]!;
          if (naechster === p || start.punkte[naechster]!.sichtbar) {
            glieder.push({ p: -1, s });
            break;
          }
          glieder.push({ p: naechster, s });
        }
        const gesamt = glieder.length ? glieder[glieder.length - 1]!.s : 1;
        for (const g of glieder) if (g.p >= 0) gewicht.set(g.p, (gewicht.get(g.p) ?? 0) + 1 - glatt(0, 1, g.s / gesamt));
      }
    });
  }
  for (const [p, w0] of gewicht) {
    if (gewaehlt.has(p)) continue;
    const w = Math.min(1, w0);
    ziel.punkte[p]!.x = start.punkte[p]!.x + dx * w;
    ziel.punkte[p]!.y = start.punkte[p]!.y + dy * w;
  }
}

/**
 * Ein Bézier-Stück von A nach B durch die Proben `pts` (A und B eingeschlossen), Griffe in den Richtungen tA (aus A) und tB (aus B
 * zurück): Längen nach den kleinsten Quadraten, zweimal nachparametrisiert (Schneider, „An Algorithm for Automatically Fitting
 * Digitized Curves“, 1990).
 */
export function stueckAnpassen(pts: readonly V2[], tA: V2, tB: V2): [number, number] {
  const N = pts.length;
  const A = pts[0]!;
  const B = pts[N - 1]!;
  const sehne = Math.hypot(B[0] - A[0], B[1] - A[1]);
  const u = new Float64Array(N);
  for (let i = 1; i < N; i++) u[i] = u[i - 1]! + Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]);
  const L = u[N - 1]! || 1;
  for (let i = 0; i < N; i++) u[i] = u[i]! / L;
  let ab: [number, number] = [sehne / 3, sehne / 3];
  for (let runde = 0; runde < 3; runde++) {
    let c00 = 0;
    let c01 = 0;
    let c11 = 0;
    let x0 = 0;
    let x1 = 0;
    for (let i = 0; i < N; i++) {
      const t = u[i]!;
      const v = 1 - t;
      const b0 = v * v * v;
      const b1 = 3 * v * v * t;
      const b2 = 3 * v * t * t;
      const b3 = t * t * t;
      const a1: V2 = [tA[0] * b1, tA[1] * b1];
      const a2: V2 = [tB[0] * b2, tB[1] * b2];
      c00 += a1[0] * a1[0] + a1[1] * a1[1];
      c01 += a1[0] * a2[0] + a1[1] * a2[1];
      c11 += a2[0] * a2[0] + a2[1] * a2[1];
      const rx = pts[i]![0] - (A[0] * (b0 + b1) + B[0] * (b2 + b3));
      const ry = pts[i]![1] - (A[1] * (b0 + b1) + B[1] * (b2 + b3));
      x0 += rx * a1[0] + ry * a1[1];
      x1 += rx * a2[0] + ry * a2[1];
    }
    const det = c00 * c11 - c01 * c01;
    let a = sehne / 3;
    let b = sehne / 3;
    if (Math.abs(det) > 1e-12) {
      a = (x0 * c11 - x1 * c01) / det;
      b = (c00 * x1 - c01 * x0) / det;
    }
    if (!(a > 1e-6 * sehne) || !(b > 1e-6 * sehne)) {
      a = sehne / 3;
      b = sehne / 3;
    }
    ab = [a, b];
    // nachparametrisieren: je Probe ein Newton-Schritt auf den nächsten Kurvenpunkt
    const k = [A[0], A[1], A[0] + tA[0] * a, A[1] + tA[1] * a, B[0] + tB[0] * b, B[1] + tB[1] * b, B[0], B[1]];
    for (let i = 1; i < N - 1; i++) {
      const t = u[i]!;
      const p = bezier(k, t);
      const d1 = bezierAbl(k, t);
      // zweite Ableitung
      const v = 1 - t;
      const d2: V2 = [
        6 * v * (k[4]! - 2 * k[2]! + k[0]!) + 6 * t * (k[6]! - 2 * k[4]! + k[2]!),
        6 * v * (k[5]! - 2 * k[3]! + k[1]!) + 6 * t * (k[7]! - 2 * k[5]! + k[3]!),
      ];
      const ex = p[0] - pts[i]![0];
      const ey = p[1] - pts[i]![1];
      const z = ex * d1[0] + ey * d1[1];
      const nn = d1[0] * d1[0] + d1[1] * d1[1] + ex * d2[0] + ey * d2[1];
      if (Math.abs(nn) > 1e-12) u[i] = Math.min(1, Math.max(0, t - z / nn));
    }
  }
  return ab;
}

const einheit = (v: V2): V2 => {
  const l = Math.hypot(v[0], v[1]);
  return l > 1e-12 ? [v[0] / l, v[1] / l] : [0, 0];
};

/** die Stücke von Stelle i bis j (Stück i … j − 1, geschlossen über das Ende hinaus) als ein angepasstes Stück */
function zusammenfassen(n: Netz, l: Linie, i: number, j: number): Stueck {
  const m = l.stuecke.length;
  const pts: V2[] = [];
  const je = 24;
  for (let q = i; q < j; q++) {
    const k = kontrollpunkte(n, l, q % m);
    for (let r = q === i ? 0 : 1; r <= je; r++) pts.push(bezier(k, r / je));
  }
  const erstes = l.stuecke[i % m]!;
  const letztes = l.stuecke[(j - 1) % m]!;
  let tA = einheit([erstes.g1x, erstes.g1y]);
  if (tA[0] === 0 && tA[1] === 0) tA = einheit([pts[1]![0] - pts[0]![0], pts[1]![1] - pts[0]![1]]);
  let tB = einheit([letztes.g2x, letztes.g2y]);
  const N = pts.length;
  if (tB[0] === 0 && tB[1] === 0) tB = einheit([pts[N - 2]![0] - pts[N - 1]![0], pts[N - 2]![1] - pts[N - 1]![1]]);
  const [a, b] = stueckAnpassen(pts, tA, tB);
  return { g1x: tA[0] * a, g1y: tA[1] * a, g2x: tB[0] * b, g2y: tB[1] * b, art: erstes.art };
}

/**
 * Punkte löschen. Eine Linie mit weniger als zwei Punkten verschwindet; an einer offenen Linie fallen gelöschte Enden mit ihren Stücken
 * weg. Punkte, die keine Linie mehr hat, verschwinden; die übrigen werden neu nummeriert. Ergebnis: das neue Netz und die neuen
 * Nummern (alt → neu, −1: weg).
 */
export function punkteLoeschen(n0: Netz, weg: ReadonlySet<number>): { netz: Netz; nummer: Int32Array } {
  const n = netzKopie(n0);
  const linien: Linie[] = [];
  for (const l of n.linien) {
    const np = l.punkte.length;
    const raus = l.punkte.map((p) => weg.has(p));
    if (!raus.some(Boolean)) {
      linien.push(l);
      continue;
    }
    const bleiben = raus.filter((r) => !r).length;
    if (bleiben < 2) continue;
    const knick = l.knick ?? l.punkte.map(() => false);
    const neu: Linie = { zu: l.zu, punkte: [], stuecke: [], knick: [] };
    if (l.zu) {
      const start = raus.indexOf(false);
      let i = start;
      do {
        let j = i + 1;
        while (raus[j % np]) j++;
        neu.punkte.push(l.punkte[i % np]!);
        neu.knick!.push(knick[i % np] ?? false);
        neu.stuecke.push(j === i + 1 ? { ...l.stuecke[i % np]! } : zusammenfassen(n, l, i, j));
        i = j;
      } while (i % np !== start);
    } else {
      const a = raus.indexOf(false);
      const b = raus.lastIndexOf(false);
      let i = a;
      neu.punkte.push(l.punkte[a]!);
      neu.knick!.push(knick[a] ?? false);
      while (i < b) {
        let j = i + 1;
        while (raus[j]) j++;
        neu.stuecke.push(j === i + 1 ? { ...l.stuecke[i]! } : zusammenfassen(n, l, i, j));
        neu.punkte.push(l.punkte[j]!);
        neu.knick!.push(knick[j] ?? false);
        i = j;
      }
    }
    linien.push(neu);
  }
  n.linien = linien;
  // Punkte ohne Linie fallen weg, die übrigen rücken auf
  const benutzt = new Uint8Array(n.punkte.length);
  for (const l of linien) for (const p of l.punkte) benutzt[p] = 1;
  const nummer = new Int32Array(n.punkte.length).fill(-1);
  const punkte: Netz['punkte'] = [];
  n.punkte.forEach((p, i) => {
    if (!benutzt[i]) return;
    nummer[i] = punkte.length;
    punkte.push(p);
  });
  n.punkte = punkte;
  for (const l of linien) l.punkte = l.punkte.map((p) => nummer[p]!);
  return { netz: n, nummer };
}
