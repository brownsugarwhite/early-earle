// Plan vom 12.11.2026, Schritt 6, „Kanten neu“ (13.11.): Eine Kante trägt ihren Winkel selbst.
//
// Florian: „Bei der Maulkante ohne Punkte muss dann eingestellt sein, dass das Maul vom Lippenstart von der Seite mit je 90 bis 100
// Grad eingeknickt ist, auch ohne Punkt, und beim Mundwinkel ca. 70 Grad nach innen abknicken.“ („Ja, es meint den Knick quer an
// den Mundwinkeln nach innen.“)
//
// Bis dahin ergab sich der Winkel an einer Kante aus der Form; einstellen ließ er sich nur über die Griffe einer kreuzenden Linie.
// Ein einzelner Ring bestimmt die Form aber nicht: Ohne kreuzende Linie landete die Haut je nach Netz woanders.
//
// Jetzt kann ein Punkt einer Linie den Knick der Haut quer über die Linie angeben (`LoopPunkt.knick`, Grad, nach innen: in den
// Körper); zwischen den Punkten mit Angabe gleitet er. Gerechnet wird er über die erste Reihe der Haut innen an der Linie (innen:
// was die Linie umschließt): Jeder ihrer Punkte wird in jeder Runde um die Linie gedreht geführt, bis er um den Winkel gegen die
// Haut außen abknickt; sein Abstand zur Linie bleibt. Für den Löser ist die Reihe eine Liste von Bindungen (ein Loop ohne Kette,
// der nur Orte hält); am Löser selbst ändert sich nichts. `LoopZug` legt die Reihe an und führt sie in jedem Schritt nach, also
// in jeder Rechnung des Fensters (Zug, Nachlauf, Hintergrund).
//
// Beweis und Messwerte: `apps/editor/scripts/pruefen/form-kante-winkel.ts` (Kugel auf drei Netzen und Florians Modell
// „simple_mouth_more simple“: 94° bis 95° an den Lippen, 72° bis 74° am Mundwinkel; ohne die Führung läuft der Winkel davon).

import type { Haut, V3 } from './kurven';
import type { Loop } from './loops';

const lage = (P: ArrayLike<number>, v: number): V3 => ({ x: P[3 * v]!, y: P[3 * v + 1]!, z: P[3 * v + 2]! });
const minus = (a: V3, b: V3): V3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const plus = (a: V3, b: V3): V3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const mal = (a: V3, f: number): V3 => ({ x: a.x * f, y: a.y * f, z: a.z * f });
const punkt = (a: V3, b: V3): number => a.x * b.x + a.y * b.y + a.z * b.z;
const kreuz = (a: V3, b: V3): V3 => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
const betrag = (a: V3): number => Math.hypot(a.x, a.y, a.z);
const einheit = (a: V3): V3 => {
  const l = betrag(a);
  return l > 1e-12 ? mal(a, 1 / l) : { x: 0, y: 0, z: 0 };
};

/** Die Linie gibt einen Knick vor (mindestens einer ihrer Punkte trägt die Angabe) */
export const hatKnick = (l: Loop): boolean => l.punkte.some((p) => p.knick !== undefined);

/**
 * Der vorgegebene Knick (Grad) an der Stelle s der Linie: zwischen den Punkten mit Angabe gleitend, vor dem ersten und nach dem
 * letzten eines Rings wie dieser (dort setzt er sich im Spiegelbild fort), ein geschlossener Loop ringsum. Null ohne Angabe.
 */
export function knickSoll(l: Loop, s: number): number | null {
  const K = l.punkte.filter((p) => p.knick !== undefined);
  if (K.length === 0) return null;
  const zu = l.art !== 'ring';
  let i = K.findIndex((p) => p.s > s);
  if (i < 0) i = K.length;
  if (!zu && (i === 0 || i === K.length)) return K[i === 0 ? 0 : K.length - 1]!.knick!;
  const a = i === 0 ? K[K.length - 1]! : K[i - 1]!;
  const b = i === K.length ? K[0]! : K[i]!;
  const weg = (((b.s - a.s) % l.laenge) + l.laenge) % l.laenge;
  const bis = (((s - a.s) % l.laenge) + l.laenge) % l.laenge;
  const f = weg > 1e-9 ? Math.max(0, Math.min(1, bis / weg)) : 0;
  return a.knick! + f * (b.knick! - a.knick!);
}

/** Die erste Reihe der Haut innen an einer Linie, die einen Knick vorgibt */
export type KnickReihe = {
  /** Netzpunkte der Linie rundum: die Hälfte z ≥ 0, dann ihr Spiegelbild zurück */
  kette: number[];
  /** je Kettenglied die Probe der Linie (für den Winkel und für ihr Ziel), und ob es das Spiegelbild ist */
  probe: number[];
  gespiegelt: boolean[];
  /** 1 = innen (was die Linie umschließt) */
  innen: Uint8Array;
  /** Kettenglied je Netzpunkt, −1: nicht auf der Linie */
  aufKette: Int32Array;
  /** Dreiecke je Netzpunkt */
  um: number[][];
  /** Punkte der ersten Reihe innen (z ≥ 0): je anliegendem Punkt der Linie der Abstand längs und quer, wie er beim Anlegen war */
  punkte: { w: number; an: { k: number; laengs: number; quer: number }[] }[];
};

function tangente(P: ArrayLike<number>, R: Pick<KnickReihe, 'kette'>, k: number): V3 {
  const m = R.kette.length;
  return einheit(minus(lage(P, R.kette[(k + 1) % m]!), lage(P, R.kette[(k - 1 + m) % m]!)));
}

/**
 * Die erste Reihe innen an der Linie `l` anlegen. Nur für einen Ring, der ins Netz eingesetzt ist (seine Hälfte und ihr Spiegelbild
 * umschließen ein Stück Haut); null, wenn es so nicht geht oder innen kein Punkt der Haut an der Linie liegt.
 */
export function knickReihe(h: Haut, l: Loop): KnickReihe | null {
  if (l.art !== 'ring' || l.proben.length < 3) return null;
  if (!l.proben.every((p) => p.ecken[0] === p.ecken[1] && p.ecken[1] === p.ecken[2])) return null;
  const halb = l.proben.map((p) => p.ecken[0]);
  const n = halb.length;
  const kette = [...halb];
  const probe = halb.map((_, j) => j);
  const gespiegelt = halb.map(() => false);
  for (let j = n - 2; j >= 1; j--) {
    const s = h.spiegel[halb[j]!]!;
    if (s < 0) return null;
    kette.push(s);
    probe.push(j);
    gespiegelt.push(true);
  }
  const aufKette = new Int32Array(h.n).fill(-1);
  kette.forEach((v, k) => {
    if (aufKette[v]! < 0) aufKette[v] = k;
  });
  // innen: was die Linie umschließt (alle Teile der Haut neben der Linie außer dem größten)
  const teil = new Int32Array(h.n).fill(-1);
  const groesse: number[] = [];
  for (let v0 = 0; v0 < h.n; v0++) {
    if (teil[v0]! >= 0 || aufKette[v0]! >= 0) continue;
    const nr = groesse.length;
    let zahl = 0;
    const stapel = [v0];
    teil[v0] = nr;
    while (stapel.length) {
      const v = stapel.pop()!;
      zahl++;
      for (const u of h.nachbarn[v]!) {
        if (teil[u]! >= 0 || aufKette[u]! >= 0) continue;
        teil[u] = nr;
        stapel.push(u);
      }
    }
    groesse.push(zahl);
  }
  if (groesse.length < 2) return null;
  const aussen = groesse.indexOf(Math.max(...groesse));
  const innen = Uint8Array.from(teil, (t) => (t >= 0 && t !== aussen ? 1 : 0));
  const um: number[][] = Array.from({ length: h.n }, () => []);
  for (let f = 0; f < h.tri.length / 3; f++) for (let e = 0; e < 3; e++) um[h.tri[3 * f + e]!]!.push(f);
  const R: KnickReihe = { kette, probe, gespiegelt, innen, aufKette, um, punkte: [] };
  for (let w = 0; w < h.n; w++) {
    if (!innen[w] || h.pos[3 * w + 2]! < -1e-9) continue;
    const an: KnickReihe['punkte'][number]['an'] = [];
    for (const x of h.nachbarn[w]!) {
      const k = aufKette[x]!;
      if (k < 0) continue;
      const t = tangente(h.pos, R, k);
      const d = minus(lage(h.pos, w), lage(h.pos, x));
      const laengs = punkt(d, t);
      an.push({ k, laengs, quer: betrag(minus(d, mal(t, laengs))) });
    }
    if (an.length) R.punkte.push({ w, an });
  }
  return R.punkte.length ? R : null;
}

/** An einem Punkt der Linie: Tangente, die Richtung der Haut außen von der Linie weg, ihre Normale nach außen; null ohne Haut außen */
export function knickRahmen(h: Haut, R: KnickReihe, k: number): { t: V3; uAussen: V3; nAussen: V3 } | null {
  const x = R.kette[k]!;
  const p = lage(h.pos, x);
  const t = tangente(h.pos, R, k);
  let u = { x: 0, y: 0, z: 0 };
  for (const j of h.nachbarn[x]!) {
    if (R.innen[j] || R.aufKette[j]! >= 0) continue;
    const d = minus(lage(h.pos, j), p);
    u = plus(u, einheit(minus(d, mal(t, punkt(d, t)))));
  }
  if (betrag(u) < 1e-9) return null;
  const uAussen = einheit(u);
  // die Normale der Haut außen: aus ihren Dreiecken an diesem Punkt
  let nRef = { x: 0, y: 0, z: 0 };
  for (const f of R.um[x]!) {
    const e = [h.tri[3 * f]!, h.tri[3 * f + 1]!, h.tri[3 * f + 2]!];
    if (e.some((v) => R.innen[v])) continue;
    if (e.every((v) => R.aufKette[v]! >= 0)) continue;
    const a = lage(h.pos, e[0]!);
    nRef = plus(nRef, kreuz(minus(lage(h.pos, e[1]!), a), minus(lage(h.pos, e[2]!), a)));
  }
  let nAussen = einheit(kreuz(t, uAussen));
  if (punkt(nAussen, nRef) < 0) nAussen = mal(nAussen, -1);
  return { t, uAussen, nAussen };
}

/**
 * Ziele der ersten Reihe (3 je Punkt der Reihe): jeder Punkt um die Linie gedreht, bis er um den vorgegebenen Winkel gegen die Haut
 * außen nach innen abknickt (geradeaus weiter wäre 0°). Die Haut außen wird gemessen, wie sie jetzt liegt. `linie`: wohin die Proben
 * der Linie in diesem Schritt sollen (3 je Probe; sonst wo ihre Netzpunkte liegen): Die Reihe geht mit der Linie mit.
 */
export function knickZiele(h: Haut, l: Loop, R: KnickReihe, linie?: ArrayLike<number>): Float64Array {
  const Z = new Float64Array(3 * R.punkte.length);
  const rahmenBei = new Map<number, ReturnType<typeof knickRahmen>>();
  const anker = (k: number): V3 => {
    if (!linie) return lage(h.pos, R.kette[k]!);
    const p = lage(linie, R.probe[k]!);
    return R.gespiegelt[k] ? { x: p.x, y: p.y, z: -p.z } : p;
  };
  R.punkte.forEach((q, i) => {
    let s = { x: 0, y: 0, z: 0 };
    let zahl = 0;
    for (const a of q.an) {
      let r = rahmenBei.get(a.k);
      if (r === undefined) {
        r = knickRahmen(h, R, a.k);
        rahmenBei.set(a.k, r);
      }
      const soll = knickSoll(l, l.s[R.probe[a.k]!]!);
      if (!r || soll === null) continue;
      const w = (soll * Math.PI) / 180;
      // geradeaus weiter wäre −uAussen; um den Winkel in den Körper gedreht (gegen die Normale außen)
      const uInnen = plus(mal(r.uAussen, -Math.cos(w)), mal(r.nAussen, -Math.sin(w)));
      s = plus(s, plus(anker(a.k), plus(mal(r.t, a.laengs), mal(uInnen, a.quer))));
      zahl++;
    }
    const z = zahl ? mal(s, 1 / zahl) : lage(h.pos, q.w);
    if (Math.abs(h.pos[3 * q.w + 2]!) < 1e-9) z.z = 0;
    Z[3 * i] = z.x;
    Z[3 * i + 1] = z.y;
    Z[3 * i + 2] = z.z;
  });
  return Z;
}

/**
 * Die Reihe als Loop ohne Kette: Jede Probe bindet einen Punkt der Haut (drei verschiedene Ecken, das Gewicht ganz auf der ersten;
 * so gilt sie dem Löser nicht als eingesetzte Linie, sie trägt keine Krümmung und keine Kante). Die Spiegelhälfte geht mit.
 */
export function knickLoop(h: Haut, R: KnickReihe, id: number): Loop {
  const proben = R.punkte.map((q) => {
    const f = R.um[q.w]![0]!;
    const andere = [h.tri[3 * f]!, h.tri[3 * f + 1]!, h.tri[3 * f + 2]!].filter((v) => v !== q.w);
    return { ecken: [q.w, andere[0]!, andere[1]!] as [number, number, number], b: [1, 0, 0] as [number, number, number] };
  });
  const ruhe = new Float64Array(3 * proben.length);
  R.punkte.forEach((q, i) => ruhe.set([h.pos[3 * q.w]!, h.pos[3 * q.w + 1]!, h.pos[3 * q.w + 2]!], 3 * i));
  return { id, art: 'paar', proben, s: Float64Array.from(proben, (_, i) => i), laenge: Math.max(1, proben.length), ruhe, punkte: [] };
}

/**
 * Gemessen: der Knick der Haut quer über die Linie am Kettenglied k (Grad): die Richtung der Haut außen von der Linie weg gegen die
 * der Haut innen, beide aus den Nachbarpunkten quer zur Linie (0 = die Haut läuft gerade durch). NaN, wo innen oder außen kein Punkt
 * der Haut anliegt.
 */
export function knickQuer(h: Haut, R: KnickReihe, k: number): number {
  const r = knickRahmen(h, R, k);
  if (!r) return NaN;
  const x = R.kette[k]!;
  const p = lage(h.pos, x);
  let u = { x: 0, y: 0, z: 0 };
  for (const j of h.nachbarn[x]!) {
    if (!R.innen[j]) continue;
    const d = minus(lage(h.pos, j), p);
    u = plus(u, einheit(minus(d, mal(r.t, punkt(d, r.t)))));
  }
  if (betrag(u) < 1e-9) return NaN;
  const c = punkt(einheit(u), mal(r.uAussen, -1));
  return (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI;
}

/** Die Führungen einer Form: je Linie mit vorgegebenem Knick ihre erste Reihe und der Loop, der sie hält */
export type KnickFuehrung = { l: Loop; li: number; R: KnickReihe; loop: Loop };

/** Für jede Linie, die einen Knick vorgibt, die erste Reihe anlegen (Nummern der Loops ab −1 abwärts: Sie gehören nicht zur Form) */
export function knickFuehrungen(h: Haut, loops: readonly Loop[]): KnickFuehrung[] {
  const out: KnickFuehrung[] = [];
  loops.forEach((l, li) => {
    if (!hatKnick(l)) return;
    const R = knickReihe(h, l);
    if (R) out.push({ l, li, R, loop: knickLoop(h, R, -1 - out.length) });
  });
  return out;
}
