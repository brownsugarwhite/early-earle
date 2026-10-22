// Pose-Deltas an die Maullinie binden (Phase 2 M3, 15.10. nachts): Posen sind Käfig-Deltas je Punktnummer. Vorlagenpunkte
// (Ringe, Kappen) behalten ihre Nummer, solange Ringzahl und Ringpunkte bleiben; Maulpunkte (Unterlippe, Tasche,
// Winkelsäule) entstehen je Maultopologie neu und verschieben sich, wenn sich Winkelring, Ringanfang oder Pfadlänge
// ändern. Der Anker beschreibt einen Maulpunkt unabhängig davon: Rolle, Reihe und Anteil u entlang der Lippe (t / m).
import type { KaefigDelta, MaulAnker } from '../dokument';
import type { MaulAbleitung } from './maul';

/** Rollen: 0 Vorlagenpunkt (Nummer gilt), 1/2 Unterlippe rechts/links, 3/4 Tasche oben, 5/6 Tasche unten, 7/8 Winkelsäule, 9 sonstiger Maulpunkt. */
export type AnkerFeld = { rolle: Uint8Array; reihe: Uint8Array; u: Float32Array };

/** Anker je Käfigpunkt (n Punkte, n0 Vorlagenpunkte) aus den Karten der Maul-Ableitung. */
export function maulAnker(m: MaulAbleitung, n: number, n0: number): AnkerFeld {
  const rolle = new Uint8Array(n);
  const reihe = new Uint8Array(n);
  const u = new Float32Array(n);
  for (let i = n0; i < n; i++) rolle[i] = 9;
  const mL = Math.max(1, m.lage.m);
  const setze = (idx: number | undefined, r: number, re: number, uu: number) => {
    if (idx === undefined || idx < n0 || idx >= n) return;
    rolle[idx] = r;
    reihe[idx] = re;
    u[idx] = uu;
  };
  m.unten.forEach((idx, t) => setze(idx, 1, 0, t / mL));
  m.untenLinks.forEach((idx, t) => setze(idx, 2, 0, t / mL));
  const reihen = (feld: number[][], r: number) => feld.forEach((zeile, k) => zeile.forEach((idx, t) => setze(idx, r, k + 1, t / mL)));
  reihen(m.tasche.oben, 3);
  reihen(m.tasche.obenLinks, 4);
  reihen(m.tasche.unten, 5);
  reihen(m.tasche.untenLinks, 6);
  m.tasche.winkel.forEach((idx, k) => setze(idx, 7, k + 1, 1));
  m.tasche.winkelLinks.forEach((idx, k) => setze(idx, 8, k + 1, 1));
  return { rolle, reihe, u };
}

/** Anker eines Punkts für ein Pose-Delta (nur Maulpunkte mit bekannter Rolle; Vorlagenpunkte brauchen keinen). */
export function ankerVon(a: AnkerFeld | null | undefined, punkt: number): MaulAnker | undefined {
  if (!a || punkt < 0 || punkt >= a.rolle.length) return undefined;
  const r = a.rolle[punkt]!;
  if (r === 0 || r === 9) return undefined;
  return { rolle: r, reihe: a.reihe[punkt]!, u: a.u[punkt]! };
}

/**
 * Pose-Deltas auf die aktuelle Maultopologie umhängen: Deltas mit Anker, deren Punktnummer nicht mehr Rolle, Reihe und
 * Anteil trägt, wandern zum Punkt gleicher Rolle und Reihe mit dem nächsten Anteil u; gibt es keinen, entfallen sie.
 * Deltas ohne Anker (Vorlagenpunkte, ältere Dokumente) bleiben bei ihrer Nummer. Ohne Ankerfeld (kein Maul) entfallen
 * Deltas mit Anker, deren Nummer jenseits der Vorlage liegt.
 */
export function posenUmhaengen(deltas: readonly KaefigDelta[], a: AnkerFeld | null | undefined, n0: number): KaefigDelta[] {
  if (!deltas.some((d) => d.anker)) return deltas as KaefigDelta[];
  // Punkte je (Rolle, Reihe), nach u
  const gruppen = new Map<number, { u: number; p: number }[]>();
  if (a) {
    for (let p = 0; p < a.rolle.length; p++) {
      const r = a.rolle[p]!;
      if (r === 0 || r === 9) continue;
      const k = r * 256 + a.reihe[p]!;
      (gruppen.get(k) ?? gruppen.set(k, []).get(k)!).push({ u: a.u[p]!, p });
    }
  }
  const out: KaefigDelta[] = [];
  const belegt = new Set<number>();
  for (const d of deltas) {
    if (!d.anker) {
      out.push(d);
      belegt.add(d.punkt);
      continue;
    }
    if (!a) {
      if (d.punkt < n0) out.push(d);
      continue;
    }
    const passt = d.punkt < a.rolle.length && a.rolle[d.punkt] === d.anker.rolle && a.reihe[d.punkt] === d.anker.reihe && Math.abs(a.u[d.punkt]! - d.anker.u) < 1e-4;
    if (passt) {
      out.push(d);
      belegt.add(d.punkt);
      continue;
    }
    const g = gruppen.get(d.anker.rolle * 256 + d.anker.reihe);
    if (!g?.length) continue;
    let best = g[0]!;
    for (const q of g) if (Math.abs(q.u - d.anker.u) < Math.abs(best.u - d.anker.u)) best = q;
    // zwei alte Deltas auf demselben neuen Punkt: das erste gilt (die Pose wird gröber, nicht doppelt)
    if (belegt.has(best.p)) continue;
    belegt.add(best.p);
    out.push({ ...d, punkt: best.p, anker: { rolle: d.anker.rolle, reihe: d.anker.reihe, u: best.u } });
  }
  return out;
}
