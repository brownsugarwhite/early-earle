// Prüfplan P0a (03.11.2026): Anzeige des Körpers auf einer gröberen Unterteilungsstufe — Stufe 1 ist das Spielnetz.
//
// Kein neuer Bau und keine neue Maske: Die Punkte einer Stufe d behalten ihren Index in jeder feineren Stufe (Punktpunkte),
// ihre Grenzlagen stehen also schon in den Lagen der Stufe L; und jede Ecke (f, i) einer Fläche der Stufe d ist Ecke 0 der
// Stufe-L-Fläche f·4^(L−d) + i·4^(L−d−1) (Kindflächen je Ecke in Eckenreihenfolge, `verfeinern`). Alle Eckenwerte der Anzeige
// (Lagen, Normalen, Deskriptoren, Atlas, Ruhelage, Gewichtsfarben) entstehen deshalb durch Umsortieren der Stufe-L-Werte.
// Die Normalen sind damit die der glatten Fläche an denselben Punkten („Grenznormalen“); scharfe Falten bleiben getrennt,
// weil die Stufe-L-Ecken es schon sind (Recherche `docs/research/2026-11-02-recherche-spielnetz.md`). Zum Vergleich gibt es
// die rohen Normalen aus den Flächen der Stufe d.
//
// Dazu das Maß des Prüfplans: der Umriss der Stufe d gegen den der Stufe L (die Grenzfläche, so gut die Anzeige sie kennt) in
// den drei Blättern, px bei 461 px je Kachel; der Editor rechnet sie in Gerätepixel bei Spielgröße um.
import { type Kaefig, alleFlaechen } from '../kaefig/halbkanten';
import type { Stufe } from '../subdivision/catmullClark';
import { type V3, zuDreiecken } from '../versuch/catmullClark';
import { umrissAusNetz } from '../versuch/umriss3d';
import type { V2 } from '../bezier';
import { ABWEICHUNG_PX, umrissStuecke } from './abweichung';
import type { WesenNetz } from './wesen';

/** Spiel-Budget je Wesen auf dem Brett (Plan „Wesen-Editor 2“): Dreiecke der Stufe 1 samt Maul und Zähnen. */
export const SPIEL_BUDGET = 8000;
/** Spielgröße: Höhe eines Wesens auf dem Brett in Gerätepixeln (Prüfplan, Annahme bis P0b). */
export const SPIEL_HOEHE_PX = 300;

export type Blatt3 = 'seite' | 'front' | 'top';

/** Anzeige der Spielstufe im Netz (`WesenInfo.spiel`). */
export type SpielAnzeige = {
  /** gezeigte Stufe (1 = Spielnetz); gleich der Bau-Stufe, wenn die Spielstufe hier nicht geht (`grund`) */
  stufe: number;
  /** Dreiecke des ganzen gezeigten Netzes und des Körpers allein (ohne angesetzte Teile, Wangen, Klingen) */
  dreiecke: number;
  koerperDreiecke: number;
  /** Umriss der Spielstufe gegen den der Bau-Stufe je Blatt (px bei 461 px je Kachel), nach einem genauen Bau */
  umriss?: Record<Blatt3, { max: number; mittel: number }>;
  /** warum die Spielstufe hier nicht gezeigt wird */
  grund?: string;
};

/** Reihenfolge der Ecken eines Vierecks im Fächer von `zuDreiecken`: (0, 1, 2), (0, 2, 3). */
const FAECHER = [0, 1, 2, 0, 2, 3] as const;

/**
 * Je Ecke der Anzeige auf Stufe d (Fächer je Viereck, 6 Ecken je Fläche) die Quellecke in der Anzeige der Stufe L.
 * Alle Flächen ab Stufe 1 sind Vierecke; `nFd` = Flächen der Stufe d.
 */
export function spielEcken(nFd: number, L: number, d: number): Uint32Array {
  if (d < 1 || d >= L) throw new Error(`Spielstufe ${d} nicht unter der Bau-Stufe ${L}`);
  const schritt = 4 ** (L - d);
  const eckenSchritt = 4 ** (L - d - 1);
  const out = new Uint32Array(6 * nFd);
  for (let f = 0; f < nFd; f++) {
    for (let k = 0; k < 6; k++) {
      const i = FAECHER[k]!;
      out[6 * f + k] = 6 * (f * schritt + i * eckenSchritt);
    }
  }
  return out;
}

/**
 * Eckenwerte (stride Floats je Ecke) der Stufe L auf die Ecken der Stufe d umsortieren; was hinter den `koerperEcken` Ecken
 * des Körpers hängt (angesetzte Teile, Wangen, Klingen), bleibt unverändert dahinter.
 */
export function eckenUmsortieren(quelle: Float32Array, ecken: Uint32Array, stride: number, koerperEcken: number): Float32Array {
  const rest = Math.max(0, quelle.length - koerperEcken * stride);
  const out = new Float32Array(ecken.length * stride + rest);
  for (let e = 0; e < ecken.length; e++) {
    const q = ecken[e]! * stride;
    const o = e * stride;
    for (let j = 0; j < stride; j++) out[o + j] = quelle[q + j]!;
  }
  if (rest) out.set(quelle.subarray(koerperEcken * stride), ecken.length * stride);
  return out;
}

/** Umriss eines Netzes in einem Blatt wie `blattAbweichungen` (Raster, Punkte auf die Silhouettenkanten gelegt). */
function umriss(punkte: V3[], flaechen: number[][], a: Blatt3, zellen = 240): V2[][] {
  const roh = umrissAusNetz({ punkte, flaechen, schaerfe: new Map() }, a, zellen);
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const p of punkte) {
    const u = a === 'front' ? p[2] : p[0];
    const v = a === 'top' ? p[2] : p[1];
    x0 = Math.min(x0, u);
    x1 = Math.max(x1, u);
    y0 = Math.min(y0, v);
    y1 = Math.max(y1, v);
  }
  const h = Math.max(x1 - x0, y1 - y0, 1e-6) / zellen;
  const st = umrissStuecke(punkte, flaechen, a, h);
  return roh.map((z) => z.map((p) => st.naechster(p, 2.5 * h) ?? p));
}

function abstandZuZug(p: V2, zug: readonly V2[]): number {
  let best = Infinity;
  const m = zug.length;
  for (let i = 0; i < m; i++) {
    const a = zug[i]!;
    const b = zug[(i + 1) % m]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l2 = dx * dx + dy * dy;
    const t = l2 > 1e-18 ? Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2)) : 0;
    const d = Math.hypot(a.x + t * dx - p.x, a.y + t * dy - p.y);
    if (d < best) best = d;
  }
  return best;
}

/** Abstand zweier Umrisse in beiden Richtungen (px bei 461 px je Kachel): max und Mittel über alle Punkte. */
function umrissAbstand(ist: V2[][], soll: V2[][]): { max: number; mittel: number } {
  let max = 0;
  let summe = 0;
  let n = 0;
  const hin = (von: V2[][], zu: V2[][]) => {
    for (const z of von) {
      for (const p of z) {
        let d = Infinity;
        for (const q of zu) d = Math.min(d, abstandZuZug(p, q));
        if (!Number.isFinite(d)) continue;
        max = Math.max(max, d);
        summe += d;
        n++;
      }
    }
  };
  hin(ist, soll);
  hin(soll, ist);
  return { max: max * ABWEICHUNG_PX, mittel: n ? (summe / n) * ABWEICHUNG_PX : 0 };
}

/** Umriss der Stufe d (erste n_d Punkte der Stufe L) gegen den der Stufe L in den drei Blättern. */
export function spielUmrissVergleich(punkteL: readonly V3[], flaechenL: number[][], kd: Kaefig): Record<Blatt3, { max: number; mittel: number }> {
  const punkteD = punkteL.slice(0, kd.n) as V3[];
  const flaechenD = alleFlaechen(kd);
  const out = {} as Record<Blatt3, { max: number; mittel: number }>;
  for (const a of ['seite', 'front', 'top'] as const) out[a] = umrissAbstand(umriss(punkteD, flaechenD, a), umriss(punkteL as V3[], flaechenL, a));
  return out;
}

/** px bei 461 px je Kachel → Gerätepixel bei Spielgröße (das Wesen `hoehe` Kacheln hoch auf SPIEL_HOEHE_PX Pixel). */
export function spielGeraetepixel(px: number, hoehe: number): number {
  return hoehe > 1e-9 ? (px * SPIEL_HOEHE_PX) / (ABWEICHUNG_PX * hoehe) : 0;
}

export type SpielOptionen = {
  /** Normalen der Spielstufe: Grenznormalen (Standard) oder roh aus den Flächen der Stufe d */
  normalen?: 'grenze' | 'roh';
  /** Flächen des Körpers auf Stufe L im gezeigten Netz (der Körperblock der Ecken); angesetztes dahinter bleibt */
  koerperFlaechenL: number;
  /** Punkte und Flächen der Stufe L für den Umrissvergleich (nur im genauen Bau); fehlt → `umriss` aus `umrissAlt` */
  punkteL?: readonly V3[];
  flaechenL?: number[][];
  umrissAlt?: Record<Blatt3, { max: number; mittel: number }>;
  /** die Spielstufe geht hier nicht (z. B. Augapfel-Höhle): Netz bleibt, `grund` wird gemeldet */
  grund?: string;
};

/**
 * Netz auf die Spielstufe d umstellen: Eckenwerte umsortiert, Normalen der Grenzfläche (oder roh), Treffer aus (Anzeige),
 * Kennzahlen in `spiel`. Ohne passende Stufe oder mit `grund` bleibt das Netz, wie es ist.
 */
export function spielNetz(netz: WesenNetz, stufen: readonly Stufe[], d: number, opt: SpielOptionen): { netz: WesenNetz; spiel: SpielAnzeige } {
  const L = stufen.length;
  const dreieckeL = netz.positionen.length / 9;
  const bleibt = (grund: string): { netz: WesenNetz; spiel: SpielAnzeige } => {
    const spiel: SpielAnzeige = { stufe: L, dreiecke: dreieckeL, koerperDreiecke: 2 * opt.koerperFlaechenL, grund };
    return { netz: { ...netz, info: { ...netz.info, spiel } }, spiel };
  };
  if (opt.grund) return bleibt(opt.grund);
  if (d < 1 || d >= L) return bleibt(`Stufe ${d} nicht unter ${L}`);
  const kL = stufen[L - 1]!.kaefig;
  const koerperEcken = 6 * kL.nF;
  if (opt.koerperFlaechenL !== kL.nF || netz.positionen.length < 3 * koerperEcken) return bleibt('anderes Netz');
  const kd = stufen[d - 1]!.kaefig;
  const ecken = spielEcken(kd.nF, L, d);
  const positionen = eckenUmsortieren(netz.positionen, ecken, 3, koerperEcken);
  const normalen = eckenUmsortieren(netz.normalen, ecken, 3, koerperEcken);
  if (opt.normalen === 'roh') {
    const punkte: V3[] = [];
    for (let i = 0; i < kd.n; i++) punkte.push([0, 0, 0]);
    // Lagen der Stufe d aus den umsortierten Ecken (jede Fläche beginnt mit ihrer Ecke 0)
    const flaechenD = alleFlaechen(kd);
    flaechenD.forEach((f, fi) => {
      for (let k = 0; k < 6; k++) {
        const v = f[FAECHER[k]!]!;
        const o = 3 * (6 * fi + k);
        punkte[v] = [positionen[o]!, positionen[o + 1]!, positionen[o + 2]!];
      }
    });
    const roh = zuDreiecken({ punkte, flaechen: flaechenD, schaerfe: new Map() }, 40).normalen;
    normalen.set(roh, 0);
  }
  const stride = (a: Float32Array | null) => (a ? a.length / (netz.positionen.length / 3) : 0);
  const desk = netz.deskriptoren ? eckenUmsortieren(netz.deskriptoren, ecken, stride(netz.deskriptoren), koerperEcken) : null;
  const ruhe = netz.ruhe && netz.ruhe.length === netz.positionen.length ? eckenUmsortieren(netz.ruhe, ecken, 3, koerperEcken) : null;
  const gewichtFarben = netz.gewichtFarben ? eckenUmsortieren(netz.gewichtFarben, ecken, stride(netz.gewichtFarben), koerperEcken) : null;
  const atlas = netz.atlas && netz.atlas.ecken.length === 2 * (netz.positionen.length / 3) ? { ...netz.atlas, ecken: eckenUmsortieren(netz.atlas.ecken, ecken, 2, koerperEcken) } : netz.atlas;
  let umriss = opt.umrissAlt;
  if (opt.punkteL && opt.flaechenL) umriss = spielUmrissVergleich(opt.punkteL, opt.flaechenL, kd);
  const spiel: SpielAnzeige = { stufe: d, dreiecke: positionen.length / 9, koerperDreiecke: 2 * kd.nF, ...(umriss ? { umriss } : {}) };
  return {
    netz: { ...netz, positionen, normalen, deskriptoren: desk, ruhe, gewichtFarben, atlas, treffer: null, info: { ...netz.info, spiel } },
    spiel,
  };
}
