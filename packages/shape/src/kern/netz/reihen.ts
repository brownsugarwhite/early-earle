// Teil L (Plan „Linien als Kurvennetz“), L0: Längslinien als Reihen des Käfigs. Eine Linie auf der Haut kreuzt jeden Ring
// höchstens einmal; die Längsreihe j* (Ringpunkt j* in jedem Ring) wird genau auf diese Kreuzungen gelegt. Dazu wird im
// Querschnitt jedes gekreuzten Rings die Stützstelle j* auf die Kreuzung verschoben und ihre Nachbarn bis zum Fenster
// werden auf derselben Querschnittskurve gleichmäßig verteilt — die Kurve bleibt, nur die Abtastung wandert (anders als
// `umparametrisieren` beim alten Maul, das alle Punkte mit fester Zahl über und unter der Lippe neu verteilte; dort klappten
// Bäuche zur Flosse). Hinter den Linienenden läuft die Verschiebung über zwei Ringe aus. Nur Daten, kein Dokumentformat:
// L0 prüft die Bauweise, das Format kommt mit L1.
import type { V2 } from '../../bezier';
import type { Querschnitt, Sprosse } from '../ableiten';

type V3 = [number, number, number];

/** Linie auf der Haut (Kern-Einheiten), rechte Hälfte (z ≥ 0), dicht abgetastet, mit Kantigkeit je Punkt (0 … 1). */
export type NetzLinie = { punkte: V3[]; haerte: number[]; reihe?: number };

/** Kreuzung einer Linie mit einem Ring: Höhe v auf der Sprosse (0 unten … 1 oben), |z|, Anteil t der Linie, Kantigkeit. */
export type Kreuzung = { v: number; z: number; t: number; h: number };

/** Gelegte Reihe: Linie, Ringpunkt j*, je gekreuztem Ring die Kreuzung (Ringindex → Kreuzung). */
export type NetzReihe = { linie: number; j: number; kreuzungen: Map<number, Kreuzung> };

/** Kreuzung einer Linie mit der Ebene einer Sprosse (Sprosse in der Seitenebene, Ebene senkrecht dazu durch z). */
export function kreuzungMitSprosse(l: NetzLinie, sp: Sprosse): Kreuzung | null {
  const dx = sp.o.x - sp.u.x;
  const dy = sp.o.y - sp.u.y;
  const L2 = dx * dx + dy * dy;
  if (L2 < 1e-18) return null;
  const s = (p: V3) => (dx * (p[1] - sp.u.y) - dy * (p[0] - sp.u.x)) / Math.sqrt(L2);
  const n = l.punkte.length;
  for (let k = 0; k + 1 < n; k++) {
    const a = l.punkte[k]!;
    const b = l.punkte[k + 1]!;
    const sa = s(a);
    const sb = s(b);
    if ((sa > 0 && sb > 0) || (sa < 0 && sb < 0) || sa === sb) continue;
    const f = sa / (sa - sb);
    const p: V3 = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
    const v = ((p[0] - sp.u.x) * dx + (p[1] - sp.u.y) * dy) / L2;
    if (v < -0.02 || v > 1.02) continue;
    const t = (k + f) / Math.max(1, n - 1);
    const h0 = l.haerte[k] ?? 0;
    const h1 = l.haerte[k + 1] ?? h0;
    return { v: Math.min(1, Math.max(0, v)), z: Math.abs(p[2]), t, h: h0 + (h1 - h0) * f };
  }
  return null;
}

/** Querschnitt als Zug in Weltmaßen (Breite · W, Höhe · Sprossenlänge). */
function zugVon(q: Querschnitt, W: number, Lr: number): V2[] {
  return q.v.map((v, j) => ({ x: q.w[j]! * W, y: v * Lr }));
}

/** Bogenlängen eines Zugs. */
function bogen(zug: readonly V2[]): number[] {
  const s = [0];
  for (let i = 1; i < zug.length; i++) s.push(s[i - 1]! + Math.hypot(zug[i]!.x - zug[i - 1]!.x, zug[i]!.y - zug[i - 1]!.y));
  return s;
}

/** Bogenlänge des nächsten Punkts eines Zugs zu p. */
function parameterVon(zug: readonly V2[], s: readonly number[], p: V2): { s: number; d: number } {
  let best = { s: 0, d: Infinity };
  for (let i = 0; i + 1 < zug.length; i++) {
    const a = zug[i]!;
    const b = zug[i + 1]!;
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const l2 = abx * abx + aby * aby;
    const u = l2 > 1e-18 ? Math.min(1, Math.max(0, ((p.x - a.x) * abx + (p.y - a.y) * aby) / l2)) : 0;
    const d = Math.hypot(a.x + abx * u - p.x, a.y + aby * u - p.y);
    if (d < best.d) best = { s: s[i]! + (s[i + 1]! - s[i]!) * u, d };
  }
  return best;
}

/** Punkt bei Bogenlänge s eines Zugs. */
function punktBei(zug: readonly V2[], s: readonly number[], t: number): V2 {
  if (t <= 0) return zug[0]!;
  const L = s[s.length - 1]!;
  if (t >= L) return zug[zug.length - 1]!;
  let i = 0;
  while (i + 2 < s.length && s[i + 1]! < t) i++;
  const u = s[i + 1]! > s[i]! ? (t - s[i]!) / (s[i + 1]! - s[i]!) : 0;
  return { x: zug[i]!.x + (zug[i + 1]!.x - zug[i]!.x) * u, y: zug[i]!.y + (zug[i + 1]!.y - zug[i]!.y) * u };
}

/** Halbe Fensterbreite: so viele Stützstellen beiderseits von j* wandern mit (Ecken und die Naht begrenzen das Fenster). */
export const REIHE_FENSTER = 2;

/**
 * Querschnitt mit der Stützstelle j bei Bogenlänge sZiel (auf dem dichten Zug): Nachbarn bis zum Fenster gleichmäßig
 * zwischen den festen Fensterrändern, alles andere unverändert. null, wenn sZiel nicht zwischen den Fensterrändern liegt.
 */
function mitStuetze(q: Querschnitt, dichtZug: readonly V2[], dichtS: readonly number[], W: number, Lr: number, j: number, sZiel: number, breitAb: number): Querschnitt | null {
  const h = q.v.length - 1;
  const zug = zugVon(q, W, Lr);
  const sAlt = zug.map((p) => parameterVon(dichtZug, dichtS, p).s);
  const ecke = new Set(q.knoten.filter((_, k) => (q.haerte[k] ?? 0) > 0));
  // Breitenpunkte bleiben, wo sie sind: Die Ableitung wählt sie aus der unveränderten Vorlage (Stützstellen nahe der
  // größten Breite, Grenzlage = Top-Breite, samt den feinen Punkten ihrer Längskanten). Eine verschobene Stützstelle in
  // dieser Menge — oder eine, die durchs Umlegen in sie hineinrückt — zöge die Haut auf die Top-Silhouette (Kugel: 5–9 px)
  let wMax = 0;
  for (let k = 1; k < h; k++) wMax = Math.max(wMax, q.w[k]!);
  for (let k = 1; k < h; k++) if (k !== j && q.w[k]! >= breitAb * wMax) ecke.add(k);
  let jL = j - REIHE_FENSTER - 1;
  let jR = j + REIHE_FENSTER + 1;
  for (let k = j - 1; k > jL; k--) if (ecke.has(k) || k <= 0) jL = k;
  for (let k = j + 1; k < jR; k++) if (ecke.has(k) || k >= h) jR = k;
  jL = Math.max(0, jL);
  jR = Math.min(h, jR);
  if (!(sAlt[jL]! < sZiel - 1e-9 && sZiel < sAlt[jR]! - 1e-9)) return null;
  const v = q.v.slice();
  const w = q.w.slice();
  const setze = (k: number, s: number) => {
    const p = punktBei(dichtZug, dichtS, s);
    v[k] = Lr > 1e-12 ? p.y / Lr : q.v[k]!;
    w[k] = W > 1e-12 ? Math.max(0, p.x / W) : q.w[k]!;
  };
  for (let k = jL + 1; k < j; k++) setze(k, sAlt[jL]! + ((sZiel - sAlt[jL]!) * (k - jL)) / (j - jL));
  setze(j, sZiel);
  for (let k = j + 1; k < jR; k++) setze(k, sZiel + ((sAlt[jR]! - sZiel) * (k - j)) / (jR - j));
  return { v, w, haerte: q.haerte, knoten: q.knoten };
}

/**
 * Längslinien als Reihen legen: je Linie die Reihe j* (eingefroren oder die nächste an der Mitte der Linie), je gekreuztem
 * Ring die Stützstelle j* auf die Kreuzung, zwei Ringe Auslauf an den Enden. `dicht` = dieselben Querschnitte, fein
 * abgetastet (die Kurve, auf der verschoben wird); `Wr` = Breitenmaßstab je Ring (unverändert, damit die Form bleibt);
 * Ringe bis `maulBis` bleiben unberührt (das alte Maul verteilt sie selbst um).
 */
export function reihenLegen(ringQ: readonly Querschnitt[], sprossen: readonly Sprosse[], Wr: readonly number[], dicht: readonly Querschnitt[], linien: readonly NetzLinie[], maulBis = -1, breitAb = 0.95): { q: Querschnitt[]; reihen: NetzReihe[] } {
  const out = ringQ.slice();
  const R = ringQ.length;
  const reihen: NetzReihe[] = [];
  linien.forEach((l, li) => {
    const kreuzungen = new Map<number, Kreuzung>();
    for (let i = maulBis + 1; i < R; i++) {
      const k = kreuzungMitSprosse(l, sprossen[i]!);
      if (k) kreuzungen.set(i, k);
    }
    if (!kreuzungen.size) return;
    const ringe = [...kreuzungen.keys()].sort((a, b) => a - b);
    // Reihe: eingefroren oder die Stützstelle, die der Kreuzung am mittleren Ring am nächsten liegt
    let j = l.reihe ?? -1;
    if (j < 0) {
      const im = ringe[Math.floor(ringe.length / 2)]!;
      const q = out[im]!;
      const sp = sprossen[im]!;
      const Lr = Math.hypot(sp.o.x - sp.u.x, sp.o.y - sp.u.y);
      const kr = kreuzungen.get(im)!;
      let bd = Infinity;
      for (let jj = 1; jj + 1 < q.v.length; jj++) {
        const d = Math.hypot((q.w[jj]! * Wr[im]! - kr.z), (q.v[jj]! - kr.v) * Lr);
        if (d < bd) {
          bd = d;
          j = jj;
        }
      }
    }
    if (j < 1) return;
    // je Ring: Verschiebung der Stützstelle j als Anteil der Querschnittslänge (für den Auslauf an den Enden)
    const anteil = new Map<number, number>();
    for (const i of ringe) {
      const sp = sprossen[i]!;
      const Lr = Math.hypot(sp.o.x - sp.u.x, sp.o.y - sp.u.y);
      const dz = zugVon(dicht[i]!, Wr[i]!, Lr);
      const ds = bogen(dz);
      const kr = kreuzungen.get(i)!;
      const sZiel = parameterVon(dz, ds, { x: kr.z, y: kr.v * Lr }).s;
      const neu = mitStuetze(out[i]!, dz, ds, Wr[i]!, Lr, j, sZiel, breitAb);
      if (!neu) {
        kreuzungen.delete(i);
        continue;
      }
      const sAlt = parameterVon(dz, ds, { x: out[i]!.w[j]! * Wr[i]!, y: out[i]!.v[j]! * Lr }).s;
      anteil.set(i, (sZiel - sAlt) / (ds[ds.length - 1]! || 1));
      out[i] = neu;
    }
    // Auslauf: zwei Ringe hinter jedem Ende mit 2/3 und 1/3 der Verschiebung des Endrings
    const ende = (i0: number, schritt: number) => {
      const a0 = anteil.get(i0);
      if (a0 === undefined) return;
      for (let m = 1; m <= 2; m++) {
        const i = i0 + schritt * m;
        if (i <= maulBis || i < 0 || i >= R || kreuzungen.has(i)) break;
        const sp = sprossen[i]!;
        const Lr = Math.hypot(sp.o.x - sp.u.x, sp.o.y - sp.u.y);
        const dz = zugVon(dicht[i]!, Wr[i]!, Lr);
        const ds = bogen(dz);
        const sAlt = parameterVon(dz, ds, { x: out[i]!.w[j]! * Wr[i]!, y: out[i]!.v[j]! * Lr }).s;
        const neu = mitStuetze(out[i]!, dz, ds, Wr[i]!, Lr, j, sAlt + ((3 - m) / 3) * a0 * (ds[ds.length - 1]! || 1), breitAb);
        if (neu) out[i] = neu;
      }
    };
    const gelegt = [...anteil.keys()].sort((a, b) => a - b);
    if (gelegt.length) {
      ende(gelegt[0]!, -1);
      ende(gelegt[gelegt.length - 1]!, 1);
    }
    reihen.push({ linie: li, j, kreuzungen });
  });
  return { q: out, reihen };
}
