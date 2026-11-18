// Kanten im 3D (Versuch 12.10.): Sobald es Kantenlinien oder Ecken in den Silhouetten gibt, baut das 3D statt des
// Platzhalter-Lofts einen Catmull-Clark-Käfig aus den Profilen (Shapes → Loft → Käfig, `kantenKaefig`): Längslinien
// legen Ringpunkte auf die Linie, Querlinien kippen einen Ring, Ecken bekommen einen Ring bzw. eine Längslinie; die
// Härte wird Kantenschärfe (0 … 3 Stufen) mit Verlauf. Die Tiefe einer Kante (+ Grat, − Rinne) verschiebt die Ziele
// entlang der Linie nach außen bzw. innen, bevor der Käfig angepasst wird.

import type { Dokument } from '@ee/shape';
import { type KantenKaefig, type Netz, type V3, anZielAnpassen, kantenFlaeche, kantenKaefig, profilEcken, zuDreiecken } from '@ee/shape/versuch';
import { create } from 'zustand';

export type KantenInfo = { millisekunden: number; hinweise: string[]; linien: number; ecken: number; ringe: number };
export const useKantenInfo = create<{ info: KantenInfo | null }>(() => ({ info: null }));

/** Braucht der Körper den Kanten-Käfig (Kantenlinien oder sichtbare Ecken in einem Profil)? */
export function mitKanten(dok: Dokument): boolean {
  // Spanten (Versuch 12.10. nachmittags) bauen ebenfalls über den Käfig: Er glättet die Übergänge zwischen den Spanten
  if (dok.kanten?.length || dok.spanten?.length) return true;
  return eckenSpeicher(dok).length > 0;
}

let eckenZuletzt: { profile: Dokument['profile']; ecken: ReturnType<typeof profilEcken> } | null = null;
function eckenSpeicher(dok: Dokument) {
  if (eckenZuletzt?.profile !== dok.profile) eckenZuletzt = { profile: dok.profile, ecken: profilEcken(dok) };
  return eckenZuletzt.ecken;
}

/** Punktnormale des Käfigs (Mittel der Flächennormalen). */
function punktNormalen(n: Netz): V3[] {
  const acc: V3[] = n.punkte.map(() => [0, 0, 0]);
  for (const f of n.flaechen) {
    let nx = 0;
    let ny = 0;
    let nz = 0;
    for (let i = 0; i < f.length; i++) {
      const a = n.punkte[f[i]!]!;
      const b = n.punkte[f[(i + 1) % f.length]!]!;
      nx += (a[1] - b[1]) * (a[2] + b[2]);
      ny += (a[2] - b[2]) * (a[0] + b[0]);
      nz += (a[0] - b[0]) * (a[1] + b[1]);
    }
    for (const i of f) {
      const s = acc[i]!;
      s[0] += nx;
      s[1] += ny;
      s[2] += nz;
    }
  }
  return acc.map((v) => {
    const l = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0] / l, v[1] / l, v[2] / l];
  });
}

/**
 * Tiefe der Kantenlinien (+ Grat, − Rinne): Ziele der Käfigpunkte entlang der Linie entlang der Normalen verschieben,
 * an den Enden halb (die Kante läuft aus), dann neu anpassen. Ohne Tiefe unverändert.
 */
export function mitTiefe(kk: KantenKaefig, dok: Dokument, iterationen: number): KantenKaefig {
  const tiefen = kk.wege.filter((w) => w.quelle.art === 'linie' && (dok.kanten?.[w.quelle.index]?.tiefe ?? 0) !== 0);
  if (!tiefen.length) return kk;
  const n = punktNormalen(kk.roh);
  const ziel = kk.ziel.map((p) => [...p] as V3);
  for (const w of tiefen) {
    if (w.quelle.art !== 'linie') continue;
    const t = dok.kanten![w.quelle.index]!.tiefe!;
    for (const kette of [w.punkte, w.spiegel]) {
      kette.forEach((v, i) => {
        const ende = i === 0 || i === kette.length - 1 ? 0.5 : 1;
        const nv = n[v]!;
        const z = ziel[v]!;
        ziel[v] = [z[0] + nv[0] * t * ende, z[1] + nv[1] * t * ende, z[2] + nv[2] * t * ende];
      });
    }
  }
  const roh: Netz = { ...kk.roh, punkte: ziel.map((p) => [...p] as V3) };
  return { ...kk, roh, ziel, netz: anZielAnpassen(roh, ziel, iterationen, kk.stufen) };
}

type Bau = {
  profile: Dokument['profile'];
  kanten: Dokument['kanten'];
  spanten: Dokument['spanten'];
  hauptspant: number | undefined;
  schnell: boolean;
  kk: KantenKaefig;
  flaeche: ReturnType<typeof kantenFlaeche>;
};
let letzter: Bau | null = null;

/** Kanten-Käfig bauen (gemerkt je Profile und Kanten); `schnell` während einer Geste (weniger Anpass-Durchgänge). */
export function kantenBauen(dok: Dokument, schnell = false): Bau {
  if (
    letzter &&
    letzter.profile === dok.profile &&
    letzter.kanten === dok.kanten &&
    letzter.spanten === dok.spanten &&
    letzter.hauptspant === dok.hauptspant &&
    (!letzter.schnell || schnell)
  )
    return letzter;
  const t0 = performance.now();
  const iterationen = schnell ? 3 : 8;
  const kk = mitTiefe(kantenKaefig(dok, { iterationen }), dok, iterationen);
  const flaeche = kantenFlaeche(kk);
  letzter = { profile: dok.profile, kanten: dok.kanten, spanten: dok.spanten, hauptspant: dok.hauptspant, schnell, kk, flaeche };
  useKantenInfo.setState({
    info: { millisekunden: performance.now() - t0, hinweise: kk.hinweise, linien: dok.kanten?.length ?? 0, ecken: eckenSpeicher(dok).length, ringe: kk.ringe },
  });
  return letzter;
}

/** Dreiecke des Kanten-Körpers. Kleiner Glättungswinkel, sonst verschwinden harte Kanten in der Schattierung. */
export function kantenDreiecke(b: Bau) {
  return zuDreiecken(b.flaeche.netz, 10);
}

/** Linien des Kantenverlaufs im 3D (für die gewählte Kantenlinie), als Segmente. */
export function kantenVerlauf(b: Bau, linie: number): Float32Array | null {
  const wege = new Set(b.kk.wege.map((w, i) => (w.quelle.art === 'linie' && w.quelle.index === linie ? i : -1)).filter((i) => i >= 0));
  if (!wege.size) return null;
  const P = b.flaeche.netz.punkte;
  const seg: number[] = [];
  for (const k of b.flaeche.ketten) {
    if (!wege.has(k.weg)) continue;
    for (let i = 0; i + 1 < k.punkte.length; i++) {
      const a = P[k.punkte[i]!]!;
      const c = P[k.punkte[i + 1]!]!;
      seg.push(a[0], a[1], a[2], c[0], c[1], c[2]);
    }
  }
  return seg.length ? new Float32Array(seg) : null;
}
