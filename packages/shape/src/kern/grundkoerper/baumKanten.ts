// Plan „Liniennetz, Zielform, Käfig“ (17.10.), S7.4: P-Linien (mit P auf die Haut gezeichnete Kantenlinien) auf dem
// Baum-Körper mindestens wie auf der Röhre (`kern/kanten.ts`): je Linienpunkt der nächste Käfigpunkt (Ziele vor dem Löser,
// Abstand nur in den zwei gezeichneten Koordinaten, unter fast gleich nahen der sichtbare), aufeinanderfolgende Punkte über
// den kürzesten Weg im Käfig verbunden (Treppe über Streifen und Ansätze hinweg), Schärfe aus der Härte (1 = scharf, sonst
// 3 × Härte), immer gespiegelt. Genau auf der Linie liegen die Falten erst mit S8. DOM-frei.

import type { BaumKaefig } from '../../kaefig/baumKaefig';
import { kanteZwischen } from '../../kaefig/halbkanten';
import type { KantenLinie } from '../kanten';

/** Setzt die Falten der Linien auf den Käfig des Baums; liefert die Zahl der geschärften Käfigkanten (rechts und links). */
export function baumKantenFalten(bk: BaumKaefig, ziele: Float64Array, linien: readonly KantenLinie[], schaerfeMax: number): number {
  const k = bk.kaefig;
  const n = k.n;
  const P = (p: number, d: 0 | 1 | 2) => ziele[3 * p + d]!;
  let gesetzt = 0;
  const setze = (a: number, b: number, s: number) => {
    const e = kanteZwischen(k, a, b);
    if (e >= 0 && s > k.eSchaerfe[e]!) {
      k.eSchaerfe[e] = s;
      gesetzt++;
    }
  };
  // kürzester Weg im Käfig (Dijkstra, Kantenlänge aus den Zielen)
  const weg = (von: number, nach: number): number[] => {
    if (von === nach) return [von];
    const dist = new Float64Array(n).fill(Infinity);
    const vor = new Int32Array(n).fill(-1);
    const fertig = new Uint8Array(n);
    dist[von] = 0;
    const offen: number[] = [von];
    while (offen.length) {
      // kleinste Entfernung (die Wege sind kurz, eine lineare Suche genügt)
      let bi = 0;
      for (let i = 1; i < offen.length; i++) if (dist[offen[i]!]! < dist[offen[bi]!]!) bi = i;
      const p = offen[bi]!;
      offen[bi] = offen[offen.length - 1]!;
      offen.pop();
      if (fertig[p]) continue;
      fertig[p] = 1;
      if (p === nach) break;
      for (let h = k.vKStart[p]!; h < k.vKStart[p + 1]!; h++) {
        const e = k.vKanten[h]!;
        const q = k.eA[e] === p ? k.eB[e]! : k.eA[e]!;
        if (fertig[q]) continue;
        const d = dist[p]! + Math.hypot(P(p, 0) - P(q, 0), P(p, 1) - P(q, 1), P(p, 2) - P(q, 2));
        if (d < dist[q]!) {
          dist[q] = d;
          vor[q] = p;
          offen.push(q);
        }
      }
    }
    if (vor[nach]! < 0) return [];
    const out = [nach];
    while (out[out.length - 1] !== von) out.push(vor[out[out.length - 1]!]!);
    return out.reverse();
  };
  for (const linie of linien) {
    const b = linie.blick;
    // Kandidaten auf der Seite, von der die Linie gezeichnet ist (Seite: rechte Hälfte und Naht)
    const erlaubt = (p: number): boolean => (b === 'seite' ? P(p, 2) >= -1e-9 : true);
    const abstand = (p: number, q: readonly number[]): number => {
      const dx = P(p, 0) - q[0]!;
      const dy = P(p, 1) - q[1]!;
      const dz = P(p, 2) - q[2]!;
      return b === 'seite' ? dx * dx + dy * dy : b === 'top' || b === 'unten' ? dx * dx + dz * dz : dy * dy + dz * dz;
    };
    // fehlende Koordinate: unter fast gleich nahen Kandidaten gewinnt die sichtbare Fläche
    const vorzug = (p: number): number => (b === 'seite' ? P(p, 2) : b === 'top' ? P(p, 1) : b === 'unten' ? -P(p, 1) : b === 'front' ? -P(p, 0) : P(p, 0));
    const folge: { p: number; h: number }[] = [];
    linie.punkte.forEach((q, i) => {
      let best = -1;
      let dBest = Infinity;
      for (let p = 0; p < n; p++) {
        if (!erlaubt(p)) continue;
        const d = abstand(p, q);
        if (d < dBest) {
          dBest = d;
          best = p;
        }
      }
      if (best < 0) return;
      const schranke = dBest * 1.3 + 1e-12;
      let vBest = vorzug(best);
      for (let p = 0; p < n; p++) {
        if (!erlaubt(p) || abstand(p, q) > schranke) continue;
        const v = vorzug(p);
        if (v > vBest) {
          vBest = v;
          best = p;
        }
      }
      const h = linie.haerte[i] ?? 0;
      const letzte = folge[folge.length - 1];
      if (!letzte || letzte.p !== best) folge.push({ p: best, h });
      else letzte.h = Math.max(letzte.h, h);
    });
    for (let s = 0; s + 1 < folge.length; s++) {
      const a = folge[s]!;
      const c = folge[s + 1]!;
      const h = Math.max(a.h, c.h);
      const sch = h >= 1 ? schaerfeMax : 3 * h;
      if (sch <= 0) continue;
      const w = weg(a.p, c.p);
      for (let i = 0; i + 1 < w.length; i++) {
        setze(w[i]!, w[i + 1]!, sch);
        setze(bk.spiegel[w[i]!]!, bk.spiegel[w[i + 1]!]!, sch);
      }
    }
  }
  return gesetzt;
}
