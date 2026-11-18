// VERSUCH (12.10.2026 nachts): Maul auf der Wirbelsäule. Florian: „Kannst du es kombinieren, dass es auch mit dem Maul
// funktioniert?“
//
// Der Maul-Käfig (`maul.ts`) rechnet entlang x: Stationen, Projektion auf die Fläche, Stirn, Rachen, Kappe. Statt ihn
// umzuschreiben, läuft er in einem gestreckten Raum der Wirbelsäule:
//   x' = Länge entlang der Wirbelsäule ab der Schnauze, y' = Abstand senkrecht dazu (zur Rückenlinie positiv), z bleibt.
// Darin ist jeder Ring der Wirbelsäule eine Ebene x' = konst., die Schnauze liegt vorn bei kleinem x', der Rücken oben –
// genau die Annahmen des Maul-Käfigs, für jeden Hals. Danach wird jeder Käfigpunkt zurück in die Welt gelegt; die
// Anpassung an die Ziele (Unterteilung) geschieht in der Welt.

import type { V2 } from '../bezier';
import type { Dokument } from '../dokument';
import { pfadAbtasten, vollerPfad } from '../profil';
import { vorlageBei } from '../spanten';
import type { V3 } from './catmullClark';
import { MAUL_STANDARD, type MaulEingabe, type MaulKaefig, type MaulOptionen, maulKaefig } from './maul';
import type { RingKontext } from './tigerKaefig';
import { WIRBEL_STANDARD, wirbelKaefig } from './wirbelsaeule';

export type Wirbelraum = {
  laenge: number;
  /** Welt (x, y) → gestreckt (x' = Länge entlang der Wirbelsäule, y' = Abstand senkrecht dazu) */
  inGestreckt: (p: V2) => V2;
  /** gestreckt → Welt */
  inWelt: (q: V2) => V2;
  /** Querschnitte im gestreckten Raum (für den Maul-Käfig) */
  ringKontext: RingKontext;
};

type Rahmen = { s: number; o: V2; n: V2; t: V2; uO: number; uU: number; w: number; c: number; liegend: number; vorlage: boolean };

const plus = (a: V2, b: V2, k = 1): V2 => ({ x: a.x + b.x * k, y: a.y + b.y * k });
const minus = (a: V2, b: V2): V2 => ({ x: a.x - b.x, y: a.y - b.y });
const punkt = (a: V2, b: V2) => a.x * b.x + a.y * b.y;
const einheit = (a: V2): V2 => {
  const l = Math.hypot(a.x, a.y) || 1;
  return { x: a.x / l, y: a.y / l };
};

/** Gestreckter Raum der Wirbelsäule (feine Stationen, damit die Abbildung glatt bleibt). */
export function wirbelraum(dok: Dokument, ringe = 72): Wirbelraum {
  const wk = wirbelKaefig(dok, { ...WIRBEL_STANDARD, ringe, iterationen: 1, stufen: 1 });
  const C = wk.laenge!;
  const vorn = wk.spitzen!.vorn;
  const hinten = wk.spitzen!.hinten;
  const rahmen: Rahmen[] = wk.sprossen.map((sp) => {
    const o = sp.o!;
    const n = einheit(minus(sp.oben, sp.unten));
    return { s: sp.s!, o, n, t: { x: 0, y: 0 }, uO: punkt(minus(sp.oben, o), n), uU: punkt(minus(sp.unten, o), n), w: sp.breite, c: sp.flanke, liegend: sp.liegend, vorlage: !!sp.vorlage };
  });
  // Richtung entlang der Wirbelsäule (zur nächsten Station hin): Normale um 90° gedreht, Vorzeichen nach dem Verlauf
  rahmen.forEach((r, i) => {
    const nach = rahmen[Math.min(rahmen.length - 1, i + 1)]!;
    const vor = rahmen[Math.max(0, i - 1)]!;
    const verlauf = minus(nach.o, vor.o);
    let t = { x: r.n.y, y: -r.n.x };
    if (punkt(t, verlauf) < 0) t = { x: -t.x, y: -t.y };
    r.t = t;
  });
  const erster = rahmen[0]!;
  const letzter = rahmen[rahmen.length - 1]!;
  const kappe = (t: number) => Math.sqrt(Math.max(0, 1 - (1 - Math.min(1, Math.max(0, t))) ** 2));

  /** Rahmen an der Stelle s (zwischen den Stationen linear, an den Spitzen zur Spitze hin kleiner) */
  const rahmenBei = (s: number): Rahmen => {
    if (s <= erster.s) {
      const t = erster.s > 1e-9 ? s / erster.s : 1;
      const k = kappe(t);
      return { ...erster, s, o: plus(vorn, minus(erster.o, vorn), t), uO: erster.uO * k, uU: erster.uU * k, w: erster.w * k };
    }
    if (s >= letzter.s) {
      const t = C - letzter.s > 1e-9 ? (C - s) / (C - letzter.s) : 1;
      const k = kappe(t);
      return { ...letzter, s, o: plus(hinten, minus(letzter.o, hinten), t), uO: letzter.uO * k, uU: letzter.uU * k, w: letzter.w * k };
    }
    let i = 0;
    while (i < rahmen.length - 2 && rahmen[i + 1]!.s < s) i++;
    const a = rahmen[i]!;
    const b = rahmen[i + 1]!;
    const l = (s - a.s) / (b.s - a.s || 1);
    const m = (x: number, y: number) => x + (y - x) * l;
    return {
      s,
      o: { x: m(a.o.x, b.o.x), y: m(a.o.y, b.o.y) },
      n: einheit({ x: m(a.n.x, b.n.x), y: m(a.n.y, b.n.y) }),
      t: einheit({ x: m(a.t.x, b.t.x), y: m(a.t.y, b.t.y) }),
      uO: m(a.uO, b.uO),
      uU: m(a.uU, b.uU),
      w: m(a.w, b.w),
      c: m(a.c, b.c),
      liegend: m(a.liegend, b.liegend),
      vorlage: a.vorlage && b.vorlage,
    };
  };

  const inWelt = (q: V2): V2 => {
    const r = rahmenBei(q.x);
    return plus(r.o, r.n, q.y);
  };

  const inGestreckt = (p: V2): V2 => {
    // vor der ersten Station: parallele Sprossen zur Spitze hin
    const g0 = punkt(minus(p, erster.o), erster.t);
    let best: V2 | null = null;
    if (g0 < 0) {
      const nenner = punkt(minus(erster.o, vorn), erster.t);
      const s = nenner > 1e-12 ? erster.s * (punkt(minus(p, vorn), erster.t) / nenner) : erster.s + g0;
      const r = rahmenBei(s);
      best = { x: s, y: punkt(minus(p, r.o), r.n) };
    }
    const gL = punkt(minus(p, letzter.o), letzter.t);
    if (gL > 0) {
      const nenner = punkt(minus(hinten, letzter.o), letzter.t);
      const s = nenner > 1e-12 ? letzter.s + (C - letzter.s) * (gL / nenner) : letzter.s + gL;
      const r = rahmenBei(s);
      const kand = { x: s, y: punkt(minus(p, r.o), r.n) };
      if (!best || Math.abs(kand.y) < Math.abs(best.y)) best = kand;
    }
    // zwischen zwei Sprossen: Vorzeichenwechsel des Abstands zur Sprossenlinie
    for (let i = 0; i + 1 < rahmen.length; i++) {
      const a = rahmen[i]!;
      const b = rahmen[i + 1]!;
      const ga = punkt(minus(p, a.o), a.t);
      const gb = punkt(minus(p, b.o), b.t);
      if (ga < 0 || gb > 0) continue;
      const l = ga / (ga - gb || 1);
      const s = a.s + (b.s - a.s) * l;
      const r = rahmenBei(s);
      const kand = { x: s, y: punkt(minus(p, r.o), r.n) };
      if (!best || Math.abs(kand.y) < Math.abs(best.y)) best = kand;
    }
    return best ?? { x: Math.min(C, Math.max(0, punkt(minus(p, vorn), erster.t))), y: punkt(minus(p, erster.o), erster.n) };
  };

  // Querschnitte im gestreckten Raum: Vorlage aus der Front (das Wesen liegt) oder oval mit der Flanke in c
  let xMinW = Infinity;
  let xMaxW = -Infinity;
  for (const q of pfadAbtasten(vollerPfad(dok.profile.seite), 24)) {
    xMinW = Math.min(xMinW, q.x);
    xMaxW = Math.max(xMaxW, q.x);
  }
  const ring = (f: number, R: number): V3[] => {
    const s = f * C;
    const r = rahmenBei(s);
    const out: V3[] = [];
    if (r.vorlage) {
      const mitte = inWelt({ x: s, y: (r.uO + r.uU) / 2 });
      const fx = Math.min(1, Math.max(0, (mitte.x - xMinW) / (xMaxW - xMinW || 1)));
      const q = vorlageBei(dok, fx, R / 2).q;
      const qMax = Math.max(...q.map((x) => x.x)) || 1;
      for (let j = 0; j < R; j++) {
        const v = q[j <= R / 2 ? j : R - j]!;
        const u = r.uU + v.y * (r.uO - r.uU);
        out.push([s, u, (j <= R / 2 ? 1 : -1) * (v.x / qMax) * r.w]);
      }
      return out;
    }
    for (let j = 0; j < R; j++) {
      const th = (2 * Math.PI * j) / R;
      const co = Math.cos(th);
      const yn = co >= 0 ? r.c + (1 - r.c) * co : r.c + r.c * co;
      out.push([s, r.uU + yn * (r.uO - r.uU), Math.sin(th) * r.w]);
    }
    return out;
  };
  const seite = pfadAbtasten(vollerPfad(dok.profile.seite), 24).map(inGestreckt);
  return { laenge: C, inGestreckt, inWelt, ringKontext: { xMin: 0, xMax: C, tMin: 0, tMax: C, seite, ring } };
}

/**
 * Maul-Käfig auf der Wirbelsäule: Lippenlinien und offener Umriss in den gestreckten Raum, dort der Maul-Käfig wie
 * entlang x, danach alle Punkte zurück in die Welt (gleiche Topologie wie entlang x).
 */
export function maulKaefigAufWirbel(dok: Dokument, eingabe: MaulEingabe, opt: MaulOptionen = MAUL_STANDARD): MaulKaefig {
  const raum = wirbelraum(dok);
  const gestreckt = (p: V3): V3 => {
    const q = raum.inGestreckt({ x: p[0], y: p[1] });
    return [q.x, q.y, p[2]];
  };
  const welt = (p: V3): V3 => {
    const q = raum.inWelt({ x: p[0], y: p[1] });
    return [q.x, q.y, p[2]];
  };
  const lippen = <L extends { oben: V3[]; unten?: V3[] }>(l: L): L => ({ ...l, oben: l.oben.map(gestreckt), ...(l.unten ? { unten: l.unten.map(gestreckt) } : {}) });
  const umrissAuf = eingabe.dokAuf ? pfadAbtasten(vollerPfad(eingabe.dokAuf.profile.seite), 24).map(raum.inGestreckt) : undefined;
  const mk = maulKaefig(dok, { zu: lippen(eingabe.zu), ...(eingabe.auf ? { auf: lippen(eingabe.auf) } : {}), ...(umrissAuf ? { umrissAuf } : {}) }, opt, raum.ringKontext);
  return {
    ...mk,
    netz: { ...mk.netz, punkte: mk.netz.punkte.map(welt) },
    zielZu: mk.zielZu.map(welt),
    zielAuf: mk.zielAuf ? mk.zielAuf.map(welt) : null,
    // die Kieferbewegungen gelten im gestreckten Raum; das Rig rechnet sie aus den Netzen in der Welt neu
    kiefer: null,
  };
}
