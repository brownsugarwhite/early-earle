// Plan „Vektorillustration aus einem Liniennetz“ (20.10.), V5 „Linien exakt“: P-Linien als Käfigschleifen auf der Röhre mit
// dem Querschnitt aus der Sichthülle (`umrisse: 'exakt'`). Jede Linie wird in der Seitenansicht gegen die Sprossen der Leiter
// eingeordnet:
// - längs (kreuzt die Sprossen): eine Käfigreihe im Reihenplan, die in jedem Ring genau durch ihre Kreuzung läuft;
// - quer (läuft längs einer Sprosse): ein eigener Käfigring, dessen Sprosse in die Sehne der Linie gedreht wird — die
//   Nachbarringe drehen anteilig mit, damit kein Ring den nächsten kreuzt;
// - schräg, kurz, auf der Naht oder ohne Härte: wie bisher die Treppe (bzw. nichts).
// So liegt die Kante auf einer Schleife des Käfigs, die sich während eines Zugs nicht ändert, und der Bau braucht keinen
// eigenen Löser für Linien.
import type { V2 } from '../bezier';
import type { Leiter } from '../versuch/wirbelsaeule';
import type { KantenLinie } from './kanten';

export type LinienArt = 'reihe' | 'ring' | 'schraeg' | 'naht' | 'kurz' | 'weich';

/** Sprosse, auf die ein Ring einer Linie rastet: Anteil der Wirbelsäule und Anteile a (Rücken), b (Bauch) der Leiter. */
export type LinienSprosse = { f: number; a: number; b: number };

export type LinienEinordnung = {
  art: LinienArt;
  /** quer: Sehne der Linie (Seite), bis Rücken und Bauch verlängert; f = Anteil der Wirbelsäule der Sehnenmitte */
  sehne?: LinienSprosse;
  /** quer: größter Abstand der Linie von ihrer Sehne in der Seite (Welt) */
  pfeil?: number;
  /** längs: Sprossen durch Anfang und Ende der Linie (Richtung der Leiter dort) — dort endet die Kante genau */
  enden?: { anfang: LinienSprosse; ende: LinienSprosse };
  /** längs, aber schräg zu den Ringen: die Reihe darf sich weit von ihrer natürlichen Lage entfernen */
  schraeg?: true;
};

export type LinienRolle = 'quer' | 'anfang' | 'ende';
/** Ein Käfigring, der einer Linie gehört (Index in `dok.kanten`): Ring einer Querlinie bzw. Endring einer Längslinie. */
export type LinienRing = { linie: number; ring: number; rolle?: LinienRolle; /** Ring gehört schon einer anderen Linie (Ende) */ geteilt?: true };

/** Wunsch einer Linie an die Stationen: ein Ring auf dieser Sprosse. */
export type LinienWunsch = { linie: number; rolle: LinienRolle } & LinienSprosse;

/** Alle Ringwünsche der Linien (Querlinien zuerst, dann die Enden der Längslinien). */
export function linienWuensche(einordnung: readonly LinienEinordnung[]): LinienWunsch[] {
  const out: LinienWunsch[] = [];
  einordnung.forEach((e, linie) => {
    if (e.art === 'ring' && e.sehne) out.push({ linie, rolle: 'quer', ...e.sehne });
  });
  einordnung.forEach((e, linie) => {
    if (e.art === 'reihe' && e.enden) {
      out.push({ linie, rolle: 'anfang', ...e.enden.anfang });
      out.push({ linie, rolle: 'ende', ...e.enden.ende });
    }
  });
  return out;
}

/** Winkel zur Sprosse (Grad): darunter läuft die Linie quer (längs der Sprosse), darüber längs (über die Sprossen) */
const QUER_WINKEL = 35;
const LAENGS_WINKEL = 55;
/** schräg, aber sicher nicht längs einer Sprosse (Grad): eine solche Linie wird eine verzogene Reihe */
const SCHRAEG_WINKEL = 25;
/** so viel der Länge muss eine Art haben, sonst ist die Linie schräg */
const ANTEIL = 0.8;
/** so viel einer schrägen Linie muss sicher nicht längs einer Sprosse laufen, damit sie eine verzogene Reihe wird */
const SCHRAEG_ANTEIL = 0.95;
/** Linien näher an der Mittelebene sind Nahtlinien (2 px) */
const NAHT = 2 / 461;
/** kürzer (Seite) ist eine Linie zu kurz für eine Schleife (3 px) */
const KURZ = 3 / 461;
/** so viele Ringe beiderseits einer Linie drehen anteilig mit (bricht das die Reihenfolge, weiter ausgreifen) */
export const MIT_DREHEN = 3;
const WEITER = [5, 8];
/** kleinster Abstand zweier Ringe auf Rücken bzw. Bauch nach dem Drehen (Anteil des alten Abstands) */
const LUECKE = 0.25;

type V3 = readonly number[];

function punktBei(zug: readonly V2[], t: number): V2 {
  const n = zug.length - 1;
  const x = Math.min(n, Math.max(0, t * n));
  const i = Math.min(n - 1, Math.floor(x));
  const f = x - i;
  const a = zug[i]!;
  const b = zug[i + 1]!;
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
}

/** Schnitt der Geraden c + s·d mit einem Zug: Anteil t des Zugs und Parameter s, je Treffer. */
function schnitte(zug: readonly V2[], c: V2, d: V2): { t: number; s: number }[] {
  const out: { t: number; s: number }[] = [];
  const n = zug.length - 1;
  for (let i = 0; i < n; i++) {
    const a = zug[i]!;
    const b = zug[i + 1]!;
    const ex = b.x - a.x;
    const ey = b.y - a.y;
    const det = d.x * -ey - d.y * -ex;
    if (Math.abs(det) < 1e-18) continue;
    const rx = a.x - c.x;
    const ry = a.y - c.y;
    const s = (rx * -ey - ry * -ex) / det;
    const f = (d.x * ry - d.y * rx) / det;
    if (f < 0 || f > 1) continue;
    out.push({ t: (i + f) / n, s });
  }
  return out;
}

/** Wirbelsäulen-Anteil eines Punkts (Lot auf den Zug der Sprossenmitten, Bogenlänge). */
function anteilAufMitten(l: Leiter, p: V2): number {
  const mitten = l.paare.map((pr) => {
    const o = punktBei(l.ruecken, pr.a);
    const u = punktBei(l.bauch, pr.b);
    return { x: (o.x + u.x) / 2, y: (o.y + u.y) / 2 };
  });
  const cum = [0];
  for (let k = 1; k < mitten.length; k++) cum.push(cum[k - 1]! + Math.hypot(mitten[k]!.x - mitten[k - 1]!.x, mitten[k]!.y - mitten[k - 1]!.y));
  const L = cum[cum.length - 1]! || 1;
  let best = Infinity;
  let f = 0;
  for (let k = 0; k + 1 < mitten.length; k++) {
    const a = mitten[k]!;
    const b = mitten[k + 1]!;
    const ex = b.x - a.x;
    const ey = b.y - a.y;
    const l2 = ex * ex + ey * ey;
    const t = l2 > 1e-18 ? Math.min(1, Math.max(0, ((p.x - a.x) * ex + (p.y - a.y) * ey) / l2)) : 0;
    const d = Math.hypot(a.x + ex * t - p.x, a.y + ey * t - p.y);
    if (d < best) {
      best = d;
      f = (cum[k]! + (cum[k + 1]! - cum[k]!) * t) / L;
    }
  }
  return f;
}

/** Sprosse der Leiter bei Wirbelsäulen-Anteil f (Paare über die Bogenlänge der Sprossenmitten verteilt). */
function sprosseBei(l: Leiter, f: number): { o: V2; u: V2 } {
  const mitten = l.paare.map((pr) => {
    const o = punktBei(l.ruecken, pr.a);
    const u = punktBei(l.bauch, pr.b);
    return { x: (o.x + u.x) / 2, y: (o.y + u.y) / 2 };
  });
  const cum = [0];
  for (let k = 1; k < mitten.length; k++) cum.push(cum[k - 1]! + Math.hypot(mitten[k]!.x - mitten[k - 1]!.x, mitten[k]!.y - mitten[k - 1]!.y));
  const L = cum[cum.length - 1]!;
  const z = Math.min(L, Math.max(0, f * L));
  let k = 0;
  while (k < cum.length - 2 && cum[k + 1]! < z) k++;
  const d = cum[k + 1]! - cum[k]!;
  const t = d > 1e-12 ? (z - cum[k]!) / d : 0;
  const p = l.paare[k]!;
  const q = l.paare[k + 1]!;
  return { o: punktBei(l.ruecken, p.a + (q.a - p.a) * t), u: punktBei(l.bauch, p.b + (q.b - p.b) * t) };
}

/** Gerade c + s·d bis Rücken (s > 0) und Bauch (s < 0) verlängert (oder umgekehrt); null, wenn sie eine Linie verfehlt. */
function sprosseDurch(l: Leiter, c: V2, d: V2): { a: number; b: number } | null {
  const naechster = (xs: { t: number; s: number }[], vz: number) => xs.filter((x) => x.s * vz > 0).sort((x, y) => Math.abs(x.s) - Math.abs(y.s))[0];
  const zuRuecken = schnitte(l.ruecken, c, d);
  const zuBauch = schnitte(l.bauch, c, d);
  let r = naechster(zuRuecken, 1);
  let b = naechster(zuBauch, -1);
  if (!r || !b) {
    r = naechster(zuRuecken, -1);
    b = naechster(zuBauch, 1);
  }
  return r && b ? { a: r.t, b: b.t } : null;
}

/** Sprosse durch den Punkt p in Richtung der Leiter an seiner Stelle. */
function sprosseDurchPunkt(l: Leiter, p: V2): LinienSprosse | null {
  const f = anteilAufMitten(l, p);
  const sp = sprosseBei(l, f);
  const d = { x: sp.o.x - sp.u.x, y: sp.o.y - sp.u.y };
  const n = Math.hypot(d.x, d.y);
  if (n < 1e-12) return null;
  const ab = sprosseDurch(l, p, { x: d.x / n, y: d.y / n });
  return ab ? { f, ...ab } : null;
}

/**
 * Linien einordnen (Seitenansicht; Linien links gelten gespiegelt). Eine Querlinie bekommt ihre Sehne: die Gerade der
 * kleinsten Abstände durch ihre Proben, bis Rücken und Bauch verlängert; eine Längslinie die Sprossen durch ihre Enden.
 */
export function linienEinordnen(linien: readonly KantenLinie[], l: Leiter): LinienEinordnung[] {
  const sprossen = l.paare.map((pr) => ({ o: punktBei(l.ruecken, pr.a), u: punktBei(l.bauch, pr.b) }));
  return linien.map((ln) => {
    if (!ln.haerte.some((h) => h > 0)) return { art: 'weich' };
    const p: V3[] = ln.punkte;
    if (p.every((q) => Math.abs(q[2]!) < NAHT)) return { art: 'naht' };
    let laenge = 0;
    let quer = 0;
    let laengs = 0;
    let nichtQuer = 0;
    for (let k = 0; k + 1 < p.length; k++) {
      const a = p[k]!;
      const b = p[k + 1]!;
      const tx = b[0]! - a[0]!;
      const ty = b[1]! - a[1]!;
      const len = Math.hypot(tx, ty);
      if (len < 1e-12) continue;
      laenge += len;
      // nächste Sprosse der Leiter an der Mitte des Stücks
      const mx = (a[0]! + b[0]!) / 2;
      const my = (a[1]! + b[1]!) / 2;
      let best = Infinity;
      let sx = 0;
      let sy = 1;
      for (const sp of sprossen) {
        const ex = sp.o.x - sp.u.x;
        const ey = sp.o.y - sp.u.y;
        const l2 = ex * ex + ey * ey;
        const t = l2 > 1e-18 ? Math.min(1, Math.max(0, ((mx - sp.u.x) * ex + (my - sp.u.y) * ey) / l2)) : 0;
        const d = Math.hypot(sp.u.x + ex * t - mx, sp.u.y + ey * t - my);
        if (d < best) {
          best = d;
          sx = ex;
          sy = ey;
        }
      }
      const cos = Math.abs(tx * sx + ty * sy) / (len * Math.hypot(sx, sy) || 1);
      const winkel = (Math.acos(Math.min(1, cos)) * 180) / Math.PI;
      if (winkel < QUER_WINKEL) quer += len;
      else if (winkel > LAENGS_WINKEL) laengs += len;
      if (winkel > SCHRAEG_WINKEL) nichtQuer += len;
    }
    if (laenge < KURZ) return { art: 'kurz' };
    // längs; schräge Linien, die nirgends längs einer Sprosse laufen, als verzogene Reihe (die Form bleibt: „Form zuerst“)
    const schraeg = laengs < ANTEIL * laenge && quer < ANTEIL * laenge;
    if (laengs >= ANTEIL * laenge || (schraeg && nichtQuer >= SCHRAEG_ANTEIL * laenge)) {
      const a = p[0]!;
      const e = p[p.length - 1]!;
      const anfang = sprosseDurchPunkt(l, { x: a[0]!, y: a[1]! });
      const ende = sprosseDurchPunkt(l, { x: e[0]!, y: e[1]! });
      return { art: 'reihe', ...(anfang && ende ? { enden: { anfang, ende } } : {}), ...(schraeg ? { schraeg: true as const } : {}) };
    }
    if (quer < ANTEIL * laenge) return { art: 'schraeg' };
    // Sehne: Schwerpunkt und Hauptachse der Proben (Seite)
    let cx = 0;
    let cy = 0;
    for (const q of p) {
      cx += q[0]!;
      cy += q[1]!;
    }
    cx /= p.length;
    cy /= p.length;
    let sxx = 0;
    let sxy = 0;
    let syy = 0;
    for (const q of p) {
      const dx = q[0]! - cx;
      const dy = q[1]! - cy;
      sxx += dx * dx;
      sxy += dx * dy;
      syy += dy * dy;
    }
    const phi = 0.5 * Math.atan2(2 * sxy, sxx - syy);
    const d: V2 = { x: Math.cos(phi), y: Math.sin(phi) };
    const c: V2 = { x: cx, y: cy };
    // je Seite der Schnitt, der der Linie am nächsten liegt; Rücken und Bauch auf verschiedenen Seiten der Mitte
    const ab = sprosseDurch(l, c, d);
    if (!ab) return { art: 'schraeg' };
    let pfeil = 0;
    for (const q of p) pfeil = Math.max(pfeil, Math.abs((q[0]! - cx) * d.y - (q[1]! - cy) * d.x));
    const o = punktBei(l.ruecken, ab.a);
    const u = punktBei(l.bauch, ab.b);
    return { art: 'ring', sehne: { ...ab, f: anteilAufMitten(l, { x: (o.x + u.x) / 2, y: (o.y + u.y) / 2 }) }, pfeil };
  });
}

/**
 * Ringe der Linien in ihre Sprossen drehen: Der Ring einer Querlinie bekommt die Anteile (a, b) ihrer Sehne, ein Endring die
 * seiner Sprosse; die Ringe daneben nehmen die Änderung linear abnehmend mit (Ecken-, Reifen- und Endringe bleiben). Erst über
 * `MIT_DREHEN` Ringe, bricht das die Reihenfolge auf Rücken oder Bauch, über mehr (`WEITER`); passt es auch dann nicht, wird
 * die Linie nächst der Stelle nicht gedreht (Rückgabe: Linien, die nicht passten).
 */
export function linienRingeDrehen(ringe: { a: number; b: number }[], linien: readonly { ring: number; a: number; b: number; linie: number }[], fest: ReadonlySet<number>): number[] {
  const R = ringe.length;
  const alt = ringe.map((s) => ({ ...s }));
  let aktiv = [...linien];
  const verworfen: number[] = [];
  /** Drehen mit `weit` Ringen beiderseits; Rückgabe: Ring, an dem die Reihenfolge bricht (−1 = keiner) */
  const drehen = (weit: number): number => {
    const stuetzen = new Map<number, { da: number; db: number }>();
    for (const x of aktiv) stuetzen.set(x.ring, { da: x.a - alt[x.ring]!.a, db: x.b - alt[x.ring]!.b });
    const null0 = { da: 0, db: 0 };
    stuetzen.set(0, stuetzen.get(0) ?? null0);
    stuetzen.set(R - 1, stuetzen.get(R - 1) ?? null0);
    for (const i of fest) if (!stuetzen.has(i)) stuetzen.set(i, null0);
    for (const x of aktiv) {
      for (const i of [x.ring - weit - 1, x.ring + weit + 1]) {
        if (i <= 0 || i >= R - 1 || stuetzen.has(i)) continue;
        // nur, wenn kein anderer Linienring näher liegt
        if (aktiv.some((y) => y !== x && Math.abs(y.ring - i) <= weit)) continue;
        stuetzen.set(i, null0);
      }
    }
    const idx = [...stuetzen.keys()].sort((x, y) => x - y);
    for (let k = 0; k + 1 < idx.length; k++) {
      const i0 = idx[k]!;
      const i1 = idx[k + 1]!;
      const s0 = stuetzen.get(i0)!;
      const s1 = stuetzen.get(i1)!;
      for (let i = i0; i <= i1; i++) {
        // linear zwischen zwei Stützen (glatt gemessen: Ringabstände schwanken stärker, Reihen knicken mehr)
        const t = i1 > i0 ? (i - i0) / (i1 - i0) : 0;
        ringe[i] = { a: alt[i]!.a + s0.da + (s1.da - s0.da) * t, b: alt[i]!.b + s0.db + (s1.db - s0.db) * t };
      }
    }
    for (let i = 0; i + 1 < R; i++) {
      const ga = alt[i + 1]!.a - alt[i]!.a;
      const gb = alt[i + 1]!.b - alt[i]!.b;
      if (ringe[i + 1]!.a - ringe[i]!.a < LUECKE * ga || ringe[i + 1]!.b - ringe[i]!.b < LUECKE * gb) return i;
    }
    return -1;
  };
  while (aktiv.length) {
    let bruch = -1;
    for (const weit of [MIT_DREHEN, ...WEITER]) {
      bruch = drehen(weit);
      if (bruch < 0) return verworfen;
    }
    // die Linie nächst der Bruchstelle verwerfen (alle ihre Ringe)
    let best = aktiv[0]!;
    for (const x of aktiv) if (Math.abs(x.ring - bruch) < Math.abs(best.ring - bruch)) best = x;
    verworfen.push(best.linie);
    aktiv = aktiv.filter((x) => x.linie !== best.linie);
    for (let i = 0; i < R; i++) ringe[i] = { ...alt[i]! };
  }
  return verworfen;
}

/** Höhen v (1 oben … 0 unten) einer Linie auf einer Sprosse (Lot jeder Probe), kleinste und größte. */
export function linieAufSprosse(ln: KantenLinie, o: V2, u: V2): { vMin: number; vMax: number } | null {
  const ex = o.x - u.x;
  const ey = o.y - u.y;
  const l2 = ex * ex + ey * ey;
  if (l2 < 1e-18 || !ln.punkte.length) return null;
  let vMin = Infinity;
  let vMax = -Infinity;
  for (const q of ln.punkte) {
    const v = ((q[0]! - u.x) * ex + (q[1]! - u.y) * ey) / l2;
    vMin = Math.min(vMin, v);
    vMax = Math.max(vMax, v);
  }
  return { vMin: Math.max(0, vMin), vMax: Math.min(1, vMax) };
}

/**
 * Eine Käfigkante gehört zur Querlinie, wenn die Linie sie (bis auf Rundung) ganz deckt: Die Falte läuft nie über das
 * Linienende hinaus (mit halber Deckung lief sie bis eine halbe Kante weiter, Robbe 15 px), endet höchstens eine Kante davor;
 * kurze Linien bekommen Reihen genau auf ihre Enden (`querLinienEnden`)
 */
const DECKT = 0.98;

/**
 * Kanten (Reihe j → j + 1), die eine Querlinie auf ihrem (gedrehten) Ring deckt: die Linie überdeckt das Stück zwischen den
 * Höhen v (1 oben … 0 unten) der beiden Reihen; Härte = größte Härte der Linie dort.
 */
export function ringKanten(ln: KantenLinie, o: V2, u: V2, v: readonly number[]): { j: number; haerte: number }[] {
  const ex = o.x - u.x;
  const ey = o.y - u.y;
  const l2 = ex * ex + ey * ey;
  if (l2 < 1e-18) return [];
  const hv = ln.punkte.map((q, k) => ({ v: ((q[0]! - u.x) * ex + (q[1]! - u.y) * ey) / l2, h: ln.haerte[k] ?? 0 }));
  let vMin = Infinity;
  let vMax = -Infinity;
  for (const x of hv) {
    vMin = Math.min(vMin, x.v);
    vMax = Math.max(vMax, x.v);
  }
  const out: { j: number; haerte: number }[] = [];
  for (let j = 0; j + 1 < v.length; j++) {
    const hi = Math.max(v[j]!, v[j + 1]!);
    const lo = Math.min(v[j]!, v[j + 1]!);
    if (!(hi > lo) || Math.min(hi, vMax) - Math.max(lo, vMin) < DECKT * (hi - lo) - 1e-9) continue;
    let h = 0;
    for (const x of hv) if (x.v <= hi && x.v >= lo) h = Math.max(h, x.h);
    // keine Probe im Stück (sehr kurze Stücke): Härte der nächsten Probe
    if (h === 0) {
      let d = Infinity;
      for (const x of hv) {
        const dd = Math.abs(x.v - (hi + lo) / 2);
        if (dd < d) {
          d = dd;
          h = x.h;
        }
      }
    }
    if (h > 0) out.push({ j, haerte: Math.min(1, h) });
  }
  return out;
}
