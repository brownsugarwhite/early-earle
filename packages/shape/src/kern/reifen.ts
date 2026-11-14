// Wesen-Editor 2, Phase 1 / M3: Reifen = Spanten als Ringe des Käfigs (Plan 4.2, 9.6). Ein Reifen ist ein Käfigring, der
// auf die Station eines gezeichneten Spants gerastet ist (`stationenWaehlen`); seine Perlen sind die Ringpunkte der
// Spant-Knoten (`vorlageBei(...).knoten`). Hier: der Verlauf eines Rings auf der feinen Fläche (Kette der feinen Punkte je
// Käfigkante über alle Stufen; Punktpunkte behalten ihren Index, Kantenpunkte liegen bei nV + e) und die Perlen.

import { type Kaefig, kanteZwischen } from '../kaefig/halbkanten';
import type { Unterteilung } from '../subdivision/catmullClark';

/** Kette der feinen Punktindizes entlang der Käfigkante (a, b) der Stufe `stufe` bis zur letzten Stufe; [] ohne Kante. */
export function feinKette(unt: Unterteilung, basis: Kaefig, a: number, b: number, stufe = 0): number[] {
  const k = stufe === 0 ? basis : unt.stufen[stufe - 1]!.kaefig;
  if (stufe === unt.stufen.length) return [a, b];
  const e = kanteZwischen(k, a, b);
  if (e < 0) return [];
  const m = k.n + e;
  const links = feinKette(unt, basis, a, m, stufe + 1);
  const rechts = feinKette(unt, basis, m, b, stufe + 1);
  if (!links.length || !rechts.length) return [];
  return [...links, ...rechts.slice(1)];
}

/**
 * Verlauf eines Käfigrings auf der feinen Fläche als Liniensegmente (Paare von Punktindizes der Stufe L). Kanten, die der
 * Ring nicht mehr hat (Maulschlitz, Beinfeld), lassen eine Lücke.
 */
export function ringSegmente(unt: Unterteilung, basis: Kaefig, ring: number, N: number): Uint32Array {
  const out: number[] = [];
  for (let j = 0; j < N; j++) {
    const kette = feinKette(unt, basis, ring * N + j, ring * N + ((j + 1) % N));
    for (let i = 0; i + 1 < kette.length; i++) out.push(kette[i]!, kette[i + 1]!);
  }
  return Uint32Array.from(out);
}
