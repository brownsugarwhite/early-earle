// Form zuerst (04.11.2026, Probe „Linien aus dem Netz“): Die Ansichten zeigen immer das echte Mesh.
//
// Florian bearbeitet eine Ansicht; sie führt (`GleichOptionen.fuehrend`). Die beiden anderen zeigen danach den Umriss des
// Körpers, der daraus entstanden ist. Ihre Punkte bleiben, wo die Linie noch auf dem Umriss liegt (bitgleich); nur wo sich der
// Umriss geändert hat, werden die Punkte dazwischen neu gesetzt — so wenige wie möglich, bis die Linie wieder auf dem Umriss
// liegt. So bleibt jede Ansicht eine Zeichnung mit Florians Punkten und ist doch nie anders als das Mesh.

import type { V2 } from '../bezier';
import { ganzerUmriss } from './prueffaelle';
import { type UmrissPunkt, punktAufStueck, umrissStuecke } from './umriss';

/** Welche Linie: die Seite (geschlossen) oder eine halbe Ansicht (Front: Achse x = 0, oben → unten; Top: Achse y = 0, links → rechts). */
export type LinienArt = 'seite' | 'front' | 'top';

/** Kubische Stücke der Linie, wie das Fenster sie zeichnet (halbe Ansichten über ihr Spiegelbild geschlossen). */
export function linienStueckeVon(p: readonly UmrissPunkt[], art: LinienArt): [V2, V2, V2, V2][] {
  if (art === 'seite') return umrissStuecke(p);
  return umrissStuecke(ganzerUmriss(p, art === 'front' ? 'x' : 'y')).slice(0, p.length - 1);
}

/**
 * Die halbe Linie einer Ansicht aus dem geschlossenen Umriss des Körpers: der Teil auf der Seite z ≥ 0 zwischen den beiden
 * äußersten Achsenkreuzungen, Front von oben nach unten, Top von links nach rechts (wie das Fenster sie führt).
 */
export function halbeLinie(schleife: readonly V2[], art: 'front' | 'top'): V2[] | null {
  const n = schleife.length;
  // Front: Achse u = x = 0, längs y; Top: Achse v = y = 0, längs x
  const quer = (q: V2) => (art === 'front' ? q.x : q.y);
  const laengs = (q: V2) => (art === 'front' ? q.y : q.x);
  const kreuz: { i: number; q: V2 }[] = [];
  for (let i = 0; i < n; i++) {
    const a = schleife[i]!;
    const b = schleife[(i + 1) % n]!;
    if (quer(a) > 0 === quer(b) > 0) continue;
    const t = quer(a) / (quer(a) - quer(b));
    const q = { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
    kreuz.push({ i, q: art === 'front' ? { x: 0, y: q.y } : { x: q.x, y: 0 } });
  }
  if (kreuz.length < 2) return null;
  // Anfang: Front oben (größtes y), Top links (kleinstes x); Ende: das andere Extrem
  const anfang = kreuz.reduce((m, k) => ((art === 'front' ? laengs(k.q) > laengs(m.q) : laengs(k.q) < laengs(m.q)) ? k : m));
  const ende = kreuz.reduce((m, k) => ((art === 'front' ? laengs(k.q) < laengs(m.q) : laengs(k.q) > laengs(m.q)) ? k : m));
  // von der Anfangskreuzung in die Richtung, die auf die Seite quer > 0 führt
  const vor = quer(schleife[(anfang.i + 1) % n]!) > 0;
  const weg: V2[] = [anfang.q];
  let i = vor ? (anfang.i + 1) % n : anfang.i;
  for (let s = 0; s < n; s++) {
    weg.push({ ...schleife[i]! });
    const naechster = vor ? (i + 1) % n : (i - 1 + n) % n;
    // die Kreuzung zwischen i und dem nächsten Punkt erreicht?
    const kante = vor ? i : naechster;
    if (kante === ende.i) break;
    i = naechster;
  }
  weg.push(ende.q);
  return weg;
}

/** Polylinie mit Bogenlängen. */
class Polylinie {
  readonly p: V2[];
  readonly s: Float64Array;
  readonly geschlossen: boolean;
  readonly laenge: number;
  constructor(p: readonly V2[], geschlossen: boolean) {
    this.p = p.map((q) => ({ x: q.x, y: q.y }));
    this.geschlossen = geschlossen;
    const m = this.p.length + (geschlossen ? 1 : 0);
    this.s = new Float64Array(m);
    for (let i = 1; i < m; i++) {
      const a = this.p[i - 1]!;
      const b = this.p[i % this.p.length]!;
      this.s[i] = this.s[i - 1]! + Math.hypot(b.x - a.x, b.y - a.y);
    }
    this.laenge = this.s[m - 1]!;
  }

  /** nächster Punkt: Abstand, Bogenlänge und Nummer der Strecke */
  naechster(q: V2): { d: number; s: number; i: number } {
    let best = Infinity;
    let bs = 0;
    let bi = 0;
    const m = this.p.length - (this.geschlossen ? 0 : 1);
    for (let i = 0; i < m; i++) {
      const a = this.p[i]!;
      const b = this.p[(i + 1) % this.p.length]!;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const l2 = dx * dx + dy * dy;
      const t = l2 > 0 ? Math.max(0, Math.min(1, ((q.x - a.x) * dx + (q.y - a.y) * dy) / l2)) : 0;
      const d = Math.hypot(a.x + t * dx - q.x, a.y + t * dy - q.y);
      if (d < best) {
        best = d;
        bs = this.s[i]! + t * (this.s[i + 1]! - this.s[i]!);
        bi = i;
      }
    }
    return { d: best, s: bs, i: bi };
  }

  /** Punkt bei Bogenlänge s (geschlossen: modulo Länge) */
  bei(s: number): V2 {
    let t = s;
    if (this.geschlossen) t = ((t % this.laenge) + this.laenge) % this.laenge;
    else t = Math.max(0, Math.min(this.laenge, t));
    let lo = 0;
    let hi = this.s.length - 1;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (this.s[m]! <= t) lo = m;
      else hi = m;
    }
    const a = this.p[lo % this.p.length]!;
    const b = this.p[hi % this.p.length]!;
    const f = this.s[hi]! > this.s[lo]! ? (t - this.s[lo]!) / (this.s[hi]! - this.s[lo]!) : 0;
    return { x: a.x + f * (b.x - a.x), y: a.y + f * (b.y - a.y) };
  }

  /** Drehung der Linie um s herum (Fenster ± w), in Grad — groß an Ecken */
  drehung(s: number, w: number): number {
    const a = this.bei(s - w);
    const m = this.bei(s);
    const b = this.bei(s + w);
    const w1 = Math.atan2(m.y - a.y, m.x - a.x);
    const w2 = Math.atan2(b.y - m.y, b.x - m.x);
    let d = Math.abs(w2 - w1);
    if (d > Math.PI) d = 2 * Math.PI - d;
    return (d * 180) / Math.PI;
  }
}

/**
 * Die Stücke von … bis − 1 (Nummern modulo der Stückzahl) als offene Polylinie mit Punktabstand ≤ h; `stueck[i]` ist die
 * Nummer des Stücks, zu dem Strecke i gehört.
 */
function kurvenLinie(stuecke: readonly [V2, V2, V2, V2][], von: number, bis: number, h: number): { linie: Polylinie; stueck: Int32Array } {
  const p: V2[] = [];
  const nr: number[] = [];
  for (let k = von; k < bis; k++) {
    const st = stuecke[k % stuecke.length]!;
    const grob = Math.hypot(st[1].x - st[0].x, st[1].y - st[0].y) + Math.hypot(st[2].x - st[1].x, st[2].y - st[1].y) + Math.hypot(st[3].x - st[2].x, st[3].y - st[2].y);
    const m = Math.max(4, Math.ceil(grob / h));
    for (let j = 0; j < m; j++) {
      p.push(punktAufStueck(st, j / m));
      nr.push(k);
    }
  }
  const letztes = stuecke[(bis - 1) % stuecke.length]!;
  p.push({ x: letztes[3].x, y: letztes[3].y });
  nr.push(bis - 1);
  return { linie: new Polylinie(p, false), stueck: Int32Array.from(nr) };
}

export type Nachfuehrung = {
  /** die Punkte danach (dasselbe Objekt, wenn nichts zu tun war) */
  punkte: UmrissPunkt[];
  /** neu gesetzte Punkte */
  neu: number;
  /** übernommene Punkte (bitgleich) */
  behalten: number;
  /** größter Abstand der Linie zum Umriss danach */
  rest: number;
};

/**
 * Die Punkte einer Linie dem Umriss des Körpers nachführen. Stücke, die auf dem Umriss liegen (≤ tol, in beide Richtungen),
 * bleiben samt ihren Punkten; dazwischen setzt der Gierige Punkte auf den Umriss, immer dort, wo die Linie am weitesten
 * danebenliegt, bis sie höchstens tol abweicht. Ecken des Umrisses (Drehung über ±1,5 tol mehr als 50°) werden Ecken.
 */
export function linieNachfuehren(alt: readonly UmrissPunkt[], umriss: readonly V2[], art: LinienArt, tol: number): Nachfuehrung {
  const geschlossen = art === 'seite';
  let ziel = new Polylinie(umriss, geschlossen);
  if (ziel.p.length < 3) return { punkte: [...alt], neu: 0, behalten: alt.length, rest: 0 };
  let punkte = alt.map((q) => ({ ...q }));
  // halbe Ansichten: Anfang und Ende auf der Achse gleiten auf die Kreuzungen des Umrisses
  if (!geschlossen) {
    const a0 = ziel.p[0]!;
    const a1 = ziel.p[ziel.p.length - 1]!;
    const erster = punkte[0]!;
    const letzter = punkte[punkte.length - 1]!;
    if (Math.hypot(erster.x - a0.x, erster.y - a0.y) > tol) punkte[0] = erster.ecke ? { ...a0, ecke: true } : { ...a0 };
    if (Math.hypot(letzter.x - a1.x, letzter.y - a1.y) > tol) punkte[punkte.length - 1] = letzter.ecke ? { ...a1, ecke: true } : { ...a1 };
  } else {
    // gleiche Umlaufrichtung wie die gezeichnete Linie
    let f = 0;
    for (const k of umrissStuecke(punkte)) f += k[0].x * k[3].y - k[3].x * k[0].y;
    if (f < 0) ziel = new Polylinie([...umriss].reverse(), true);
  }
  const prueft = (pk: UmrissPunkt[]) => stueckFehler(pk, art, ziel, tol);

  let fehler = prueft(punkte);
  if (fehler.every((f) => !f)) {
    const unveraendert = punkte.every((q, i) => q.x === alt[i]!.x && q.y === alt[i]!.y);
    return { punkte: unveraendert ? (alt as UmrissPunkt[]) : punkte, neu: 0, behalten: alt.length, rest: restAbstand(punkte, art, ziel) };
  }
  let neuGesetzt = 0;
  for (let runde = 0; runde < 16 && fehler.some((f) => f); runde++) {
    const m = punkte.length;
    const segZahl = geschlossen ? m : m - 1;
    const punktOk = punkte.map((q) => ziel.naechster(q).d <= tol);
    if (!geschlossen) {
      punktOk[0] = true;
      punktOk[m - 1] = true;
    }
    // ein Punkt neben dem Umriss gehört mit beiden Stücken in den Lauf; die Ränder eines Laufs sind dann Anker auf dem Umriss
    const imLauf = fehler.slice();
    for (let i = 0; i < m; i++) {
      if (punktOk[i]) continue;
      if (geschlossen || i > 0) imLauf[(i - 1 + segZahl) % segZahl] = true;
      if (geschlossen || i < m - 1) imLauf[i % segZahl] = true;
    }
    const laeufe: [number, number][] = [];
    if (imLauf.every((f) => f)) {
      if (geschlossen) {
        let best = 0;
        let bd = Infinity;
        punkte.forEach((q, i) => {
          const d = ziel.naechster(q).d;
          if (d < bd) {
            bd = d;
            best = i;
          }
        });
        laeufe.push([best, best]);
      } else laeufe.push([0, m - 1]);
    } else {
      // ab einem richtigen Stück zyklisch (offen: linear) zählen
      const start = geschlossen ? imLauf.findIndex((f) => !f) : 0;
      let k = 0;
      while (k < segZahl) {
        const s = (start + k) % segZahl;
        if (!imLauf[s]) {
          k++;
          continue;
        }
        let e = k;
        while (e + 1 < segZahl && imLauf[(start + e + 1) % segZahl]) e++;
        laeufe.push([s, (start + e + 1) % m]);
        k = e + 1;
      }
    }
    if (laeufe.length === 0) break;
    // je Runde ein Lauf (danach gelten die Nummern nicht mehr), dann neu prüfen
    const [a, b] = laeufe[0]!;
    const ergebnis = laufEinpassen(punkte, a, b, art, ziel, tol);
    punkte = ergebnis.punkte;
    neuGesetzt += ergebnis.neu;
    fehler = prueft(punkte);
  }
  let behalten = 0;
  for (const q of punkte) if (alt.some((p) => p.x === q.x && p.y === q.y)) behalten++;
  return { punkte, neu: neuGesetzt, behalten, rest: restAbstand(punkte, art, ziel) };
}

/** Je Stück: liegt es (in beide Richtungen) weiter als tol vom Umriss weg? */
function stueckFehler(punkte: UmrissPunkt[], art: LinienArt, ziel: Polylinie, tol: number): boolean[] {
  const stuecke = linienStueckeVon(punkte, art);
  const fehler = stuecke.map(() => false);
  const { linie, stueck } = kurvenLinie(stuecke, 0, stuecke.length, tol / 2);
  linie.p.forEach((q, i) => {
    if (ziel.naechster(q).d > tol) fehler[stueck[i]!] = true;
  });
  // umgekehrt: Stellen des Umrisses, die weiter als tol von der Linie liegen, machen das nächste Stück falsch
  const schritt = Math.max(tol / 2, ziel.laenge / 4000);
  for (let s = 0; s <= ziel.laenge; s += schritt) {
    const n = linie.naechster(ziel.bei(s));
    if (n.d > tol) fehler[stueck[n.i]!] = true;
  }
  return fehler;
}

/** Größter Abstand einer Linie zum Umriss des Körpers, in beide Richtungen (Seite: geschlossen, Front/Top: halbe Linie). */
export function linienAbstand(punkte: readonly UmrissPunkt[], art: LinienArt, umriss: readonly V2[]): number {
  return restAbstand([...punkte], art, new Polylinie(umriss, art === 'seite'));
}

/** größter Abstand Linie ↔ Umriss in beide Richtungen */
function restAbstand(punkte: UmrissPunkt[], art: LinienArt, ziel: Polylinie): number {
  const stuecke = linienStueckeVon(punkte, art);
  const { linie } = kurvenLinie(stuecke, 0, stuecke.length, 0.5);
  let rest = 0;
  for (const q of linie.p) rest = Math.max(rest, ziel.naechster(q).d);
  const schritt = ziel.laenge / 2000;
  for (let s = 0; s <= ziel.laenge; s += schritt) rest = Math.max(rest, linie.naechster(ziel.bei(s)).d);
  return rest;
}

/**
 * Die Punkte zwischen den Ankern a und b neu setzen (a, b bleiben): gierig auf den Umriss zwischen ihren Stellen, bis das
 * Stück höchstens tol abweicht.
 */
function laufEinpassen(
  punkte: UmrissPunkt[],
  a: number,
  b: number,
  art: LinienArt,
  ziel: Polylinie,
  tol: number,
): { punkte: UmrissPunkt[]; neu: number } {
  const m = punkte.length;
  const geschlossen = art === 'seite';
  const sa = ziel.naechster(punkte[a]!).s;
  let sb = ziel.naechster(punkte[b]!).s;
  if (geschlossen && sb <= sa) sb += ziel.laenge;
  if (!geschlossen && b === m - 1) sb = ziel.laenge;
  const s0 = !geschlossen && a === 0 ? 0 : sa;
  // die Punkte außerhalb des Laufs, in Reihenfolge ab a
  const aussen: UmrissPunkt[] = [];
  for (let q = b; q !== a; q = (q + 1) % m) {
    aussen.push(punkte[q]!);
    if (!geschlossen && q === m - 1) break;
  }
  const innen: { s: number; p: UmrissPunkt }[] = [];
  // eine Kurve bauen: halbe Ansichten in ihrer Reihenfolge, die Seite ab a
  const bauen = (): { pk: UmrissPunkt[]; erstes: number; letztes: number } => {
    if (geschlossen) {
      const pk = [punkte[a]!, ...innen.map((k) => k.p), ...aussen];
      return { pk, erstes: 0, letztes: innen.length + 1 };
    }
    const vor = punkte.slice(0, a + 1);
    const nach = punkte.slice(b);
    const pk = [...vor, ...innen.map((k) => k.p), ...nach];
    return { pk, erstes: a, letztes: a + innen.length + 1 };
  };
  const ecke = (s: number) => ziel.drehung(s, 1.5 * tol) > 50;
  /** größter Abstand im Lauf (in beide Richtungen) und die Stelle des Umrisses dazu */
  const abweichung = (): { schlimm: number; wo: number } => {
    const { pk, erstes, letztes } = bauen();
    const stuecke = linienStueckeVon(pk, art);
    const { linie: lauf } = kurvenLinie(stuecke, erstes, letztes, tol / 2);
    // die Stelle des Umrisses im Lauf, die am weitesten von der Linie liegt
    let schlimm = 0;
    let wo = -1;
    const schritt = Math.max(tol / 3, (sb - s0) / 600);
    for (let s = s0 + schritt; s < sb - schritt / 2; s += schritt) {
      const best = lauf.naechster(ziel.bei(s)).d;
      if (best > schlimm) {
        schlimm = best;
        wo = s;
      }
    }
    // und umgekehrt: Linienproben weit vom Umriss
    for (const l of lauf.p) {
      const n = ziel.naechster(l);
      // geschlossen: Bogenlängen hinter dem Anfang des Laufs zählen über das Ende hinaus
      const s = geschlossen && n.s < s0 ? n.s + ziel.laenge : n.s;
      if (n.d > schlimm && s > s0 && s < sb) {
        schlimm = n.d;
        wo = s;
      }
    }
    return { schlimm, wo };
  };
  for (let iter = 0; iter < 40; iter++) {
    const { schlimm, wo } = abweichung();
    if (schlimm <= tol || wo < 0) break;
    // auf eine nahe Ecke des Umrisses rasten
    let s = wo;
    let istEcke = false;
    let besteDrehung = 0;
    for (let ds = -3 * tol; ds <= 3 * tol; ds += tol / 4) {
      const t = wo + ds;
      if (t <= s0 || t >= sb) continue;
      const dr = ziel.drehung(t, 1.5 * tol);
      if (dr > 50 && dr > besteDrehung) {
        besteDrehung = dr;
        s = t;
        istEcke = true;
      }
    }
    if (innen.some((k) => Math.abs(k.s - s) < tol)) break;
    const q = ziel.bei(s);
    innen.push({ s, p: istEcke || ecke(s) ? { x: q.x, y: q.y, ecke: true } : { x: q.x, y: q.y } });
    innen.sort((p, q2) => p.s - q2.s);
  }
  // ausdünnen: Der Gierige setzt Punkte dort, wo es gerade am schlimmsten ist, oft mehrere dicht beieinander. Jeden Punkt
  // probeweise herausnehmen und weglassen, wenn die Linie ohne ihn auf dem Umriss bleibt.
  if (abweichung().schlimm <= tol) {
    for (let weg = true; weg && innen.length > 0; ) {
      weg = false;
      for (let k = 0; k < innen.length; k++) {
        const raus = innen.splice(k, 1)[0]!;
        if (abweichung().schlimm <= tol) {
          weg = true;
          break;
        }
        innen.splice(k, 0, raus);
      }
    }
  }
  const { pk } = bauen();
  // die Seite wieder ab dem alten ersten Punkt anordnen, damit Nummern außerhalb des Laufs möglichst bleiben
  if (geschlossen) {
    const start = pk.indexOf(punkte[0]!);
    if (start > 0) return { punkte: [...pk.slice(start), ...pk.slice(0, start)], neu: innen.length };
  }
  return { punkte: pk, neu: innen.length };
}
