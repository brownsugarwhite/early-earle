/**
 * Ozzy, Paint-Modus, Etappe 1 (19.11.2026): die Bemalung einer Form. Ebenen mit Farblinien (dichte Folgen von Orten auf der Haut)
 * und Füllungen (eine Saat und eine Farbe). Gespeichert werden nur Orte und Farben; alles andere (Ketten, Flächen, Bild) wird
 * daraus abgeleitet. Ohne DOM: Die Tests laufen in Node.
 *
 * Etappe 1 kennt eine Ebene, geschlossene Farblinien und harte Kanten. Die Felder für später (Anker mit Richtungen, Breite der
 * Weichheit) kommen mit den Etappen, die sie brauchen.
 */
import { type Karte, type Naechster, type Netz, type Ort, RAND, type V3, ortGespiegelt, ortGilt, ortIn, ortLage, orteUebergeben, punkteZuordnen, spur } from './ort';
import type { LinieOrte } from './ketten';
import { type FarbPunkt, type Richtung, punkteSchaetzen, richtungAus, richtungVektor } from './kurve';

export type Farbe = [number, number, number];
/**
 * Eine Farblinie: ihre Orte der Reihe nach (`stuetzen`, daran hängen Ketten und Flächen) und, seit Etappe 2, ihre Punkte zum
 * Anfassen (`punkte`: einzelne dieser Orte mit Richtungen, `kurve.ts`). Der erste Punkt ist der Ort 0; eine offene Farblinie endet
 * mit einem Punkt.
 */
export type Farblinie = LinieOrte & { punkte: FarbPunkt[] };
export type Fuellung = { id: number; saat: Ort; farbe: Farbe };
export type Ebene = { id: number; name: string; linien: Farblinie[]; fuellungen: Fuellung[] };
export type Bemalung = { ebenen: Ebene[]; aktiv: number; naechste: number };

export const leereBemalung = (): Bemalung => ({ ebenen: [{ id: 1, name: 'Ebene 1', linien: [], fuellungen: [] }], aktiv: 1, naechste: 2 });
export const istLeer = (b: Bemalung): boolean => b.ebenen.every((e) => !e.linien.length && !e.fuellungen.length);
export const aktiveEbene = (b: Bemalung): Ebene => b.ebenen.find((e) => e.id === b.aktiv) ?? b.ebenen[0]!;

const ortKopie = (o: Ort): Ort => ({ t: o.t, e: [o.e[0], o.e[1], o.e[2]], w: [o.w[0], o.w[1], o.w[2]] });
const richtungKopie = (g: Richtung | null): Richtung | null => (g ? [g[0], g[1], g[2]] : null);
export const punktKopie = (q: FarbPunkt): FarbPunkt => ({ i: q.i, ein: richtungKopie(q.ein), aus: richtungKopie(q.aus), knick: q.knick, ...(q.breite ? { breite: q.breite } : {}) });

/**
 * Etappe 4: die Breite des Verlaufs an jedem Ort einer Farblinie (Einheiten der Lagen), aus den Breiten ihrer Punkte. Zwischen zwei
 * Punkten fließt sie weich von der einen zur anderen, längs des Wegs über die Haut gemessen; an einem Punkt mit Breite null ist die
 * Kante hart, und der Verlauf läuft zu ihm hin aus. Zurück: null, wenn kein Punkt eine Breite hat (die ganze Farblinie ist hart).
 */
export function breitenLaengs(pos: ArrayLike<number>, l: Farblinie): Float32Array | null {
  const P = l.punkte;
  if (!P.some((q) => (q.breite ?? 0) > 0)) return null;
  const S = l.stuetzen;
  const n = S.length;
  const m = P.length;
  const aus = new Float32Array(n);
  // der Weg bis zu jedem Ort (und, geschlossen, zurück zum ersten)
  const weg = new Float64Array(n + 1);
  let vor = ortLage(pos, S[0]!);
  for (let i = 1; i <= n; i++) {
    const p = ortLage(pos, S[i % n]!);
    weg[i] = weg[i - 1]! + Math.hypot(p[0] - vor[0], p[1] - vor[1], p[2] - vor[2]);
    vor = p;
  }
  const stuecke = l.zu ? m : m - 1;
  for (let k = 0; k < stuecke; k++) {
    const a = P[k]!;
    const b = P[(k + 1) % m]!;
    const von = a.i;
    const bis = k + 1 < m ? b.i : n;
    const [wa, wb] = [a.breite ?? 0, b.breite ?? 0];
    const lang = Math.max(1e-12, weg[bis]! - weg[von]!);
    for (let i = von; i < bis; i++) {
      const u = (weg[i]! - weg[von]!) / lang;
      aus[i] = wa + (wb - wa) * u * u * (3 - 2 * u);
    }
  }
  // (offen: der letzte Ort ist der letzte Punkt)
  if (!l.zu) aus[n - 1] = P[m - 1]!.breite ?? 0;
  return aus;
}

/** eine tiefe Kopie (für ⌘Z und für den Stand eines ruhenden Objekts) */
export function kopie(b: Bemalung): Bemalung {
  return {
    aktiv: b.aktiv,
    naechste: b.naechste,
    ebenen: b.ebenen.map((e) => ({
      id: e.id,
      name: e.name,
      linien: e.linien.map((l) => ({ id: l.id, zu: l.zu, stuetzen: l.stuetzen.map(ortKopie), punkte: l.punkte.map(punktKopie) })),
      fuellungen: e.fuellungen.map((f) => ({ id: f.id, saat: ortKopie(f.saat), farbe: [f.farbe[0], f.farbe[1], f.farbe[2]] })),
    })),
  };
}

/** alle Orte der Bemalung (für die Übergabe beim Netzwechsel) */
export function* alleOrte(b: Bemalung): Generator<Ort> {
  for (const e of b.ebenen) {
    for (const l of e.linien) for (const o of l.stuetzen) yield o;
    for (const f of e.fuellungen) yield f.saat;
  }
}

/** die Zahl aller Orte der Bemalung */
export const ortZahl = (b: Bemalung): number => b.ebenen.reduce((s, e) => s + e.fuellungen.length + e.linien.reduce((t, l) => t + l.stuetzen.length, 0), 0);

/** Passt die Bemalung zu diesem Netz (jeder Ort nennt ein Dreieck, das es so gibt)? */
export function giltFuer(netz: Netz, b: Bemalung): boolean {
  for (const o of alleOrte(b)) if (!ortGilt(netz, o)) return false;
  return true;
}

/**
 * Netzwechsel: alle Orte an die neue Haut übergeben (`ort.ts`: Wer sein Dreieck behält, bleibt; die anderen werden gesucht). Orte
 * auf der Mittelebene (Enden einer Farblinie dort) bleiben auf ihr: Sie werden auf die Kante der Mittelebene zurückgelegt, die
 * ihnen am nächsten ist. `nAlt`: Zahl der Punkte der alten Haut. Zurück: wie viele Orte blieben, wie viele gesucht wurden und wie
 * weit der fernste von ihnen neben der neuen Haut lag.
 */
export function uebergeben(altPos: ArrayLike<number>, nAlt: number, neu: Karte, naechster: Naechster, b: Bemalung): { weit: number; gehalten: number; gesucht: number } {
  const aufMitte = new Set<Ort>();
  for (const e of b.ebenen)
    for (const l of e.linien) {
      if (l.zu) continue;
      for (const o of [l.stuetzen[0], l.stuetzen[l.stuetzen.length - 1]]) if (o && Math.min(o.w[0], o.w[1], o.w[2]) < RAND / 2) aufMitte.add(o);
    }
  const zu = punkteZuordnen(altPos, nAlt, neu.netz);
  // die Richtungen der Punkte als Vektoren: mit den Ecken, wie sie jetzt liegen, wo alle drei geblieben sind (dann dreht und dehnt
  // sich die Richtung mit der Haut), sonst wie sie lagen
  const Q = neu.netz.pos;
  const vektoren: { q: FarbPunkt; o: Ort; ein: V3 | null; aus: V3 | null }[] = [];
  for (const e of b.ebenen)
    for (const l of e.linien)
      for (const q of l.punkte) {
        if (!q.ein && !q.aus) continue;
        const o = l.stuetzen[q.i];
        if (!o) continue;
        const j = zu ? [zu[o.e[0]] ?? -1, zu[o.e[1]] ?? -1, zu[o.e[2]] ?? -1] : [-1, -1, -1];
        const neuDa = j[0]! >= 0 && j[1]! >= 0 && j[2]! >= 0;
        const vek = (g: Richtung | null): V3 | null => {
          if (!g) return null;
          if (!neuDa) return richtungVektor(altPos, o, g);
          const v: V3 = [0, 0, 0];
          for (let i = 0; i < 3; i++) for (let c = 0; c < 3; c++) v[c] = v[c]! + g[i]! * Q[3 * j[i]! + c]!;
          return v;
        };
        vektoren.push({ q, o, ein: vek(q.ein), aus: vek(q.aus) });
      }
  const r = orteUebergeben(altPos, neu, naechster, alleOrte(b), zu);
  for (const o of aufMitte) aufKanteDerMitte(neu, o);
  for (const v of vektoren) {
    v.q.ein = v.ein ? richtungAus(Q, v.o, v.ein) : null;
    v.q.aus = v.aus ? richtungAus(Q, v.o, v.aus) : null;
  }
  return r;
}

/** Vorzeichen der Hälfte, auf der ein Dreieck liegt (z ≥ 0: +1); an einer gespiegelten Form liegt kein Dreieck quer zur Mittelebene */
function haelfte(netz: Netz, t: number): number {
  const P = netz.pos;
  const tri = netz.tri;
  const z = P[3 * tri[3 * t]! + 2]! + P[3 * tri[3 * t + 1]! + 2]! + P[3 * tri[3 * t + 2]! + 2]!;
  return z >= 0 ? 1 : -1;
}

/** einen Ort auf die Kante seines Dreiecks legen, die in der Mittelebene liegt (das Gewicht der Ecke abseits wird null) */
function aufKanteDerMitte(k: Karte, o: Ort): void {
  const P = k.netz.pos;
  let fern = -1;
  let fernZ = 0;
  for (let i = 0; i < 3; i++) {
    const z = Math.abs(P[3 * o.e[i]! + 2]!);
    if (z > fernZ) {
      fernZ = z;
      fern = i;
    }
  }
  if (fern < 0) return;
  const a = (fern + 1) % 3;
  const b = (fern + 2) % 3;
  // nur, wenn die zwei anderen Ecken wirklich in der Ebene liegen
  if (Math.abs(P[3 * o.e[a]! + 2]!) > 1e-9 || Math.abs(P[3 * o.e[b]! + 2]!) > 1e-9) return;
  const s = o.w[a]! + o.w[b]!;
  const wa = s > 0 ? Math.min(1 - RAND, Math.max(RAND, o.w[a]! / s)) : 0.5;
  o.w[fern] = 0;
  o.w[a] = wa;
  o.w[b] = 1 - wa;
}

/** ein Punkt der Zeichnung für `linienAusTreffern`: welcher Treffer er ist, seine Richtungen als Vektoren (Einheiten der Lagen), Knick */
export type TrefferPunkt = { i: number; ein: V3 | null; aus: V3 | null; knick: boolean; breite?: number };

/**
 * Aus einer Folge von Treffern auf der Haut (dicht, der Reihe nach, wie gezeichnet) werden Farblinien. An einer gespiegelten Form
 * (`gespiegelt`) gilt die Hälfte z ≥ 0: Liegt alles auf der anderen, wird es gespiegelt. Läuft die Zeichnung über die Mittelebene,
 * gilt ihr längerer Teil (auf der anderen Hälfte: gespiegelt); er endet auf der Ebene, sein Spiegelbild schließt ihn. Was über die
 * Mitte hinausragt, fällt weg. Ein Treffer genau in der Mittelebene (ein Gewicht null gegenüber einer Kante dort) gehört zu beiden
 * Hälften: An ihm endet ein Lauf, ohne dass geschnitten wird. `zu`: Die Zeichnung ist geschlossen. `naechsteId`: vergibt Kennungen.
 * `punkte`: die Punkte der Zeichnung (fehlen sie, werden sie aus dem Verlauf geschätzt). Zurück: die Farblinien (leer, wenn zu
 * wenige Treffer bleiben).
 */
export function linienAusTreffern(k: Karte, treffer: readonly Ort[], zu: boolean, gespiegelt: boolean, naechsteId: () => number, punkte?: readonly TrefferPunkt[]): Farblinie[] {
  const pos = k.netz.pos;
  const spiegeln = gespiegelt && !!k.spiegel;
  /** liegt der Ort in der Mittelebene (auf einer Kante dort: das Gewicht der Ecke gegenüber ist null)? */
  const inEbene = (o: Ort): boolean => {
    if (!spiegeln) return false;
    for (let i = 0; i < 3; i++) if (o.w[i] === 0 && pos[3 * o.e[(i + 1) % 3]! + 2] === 0 && pos[3 * o.e[(i + 2) % 3]! + 2] === 0) return true;
    return false;
  };
  let orte = treffer.map((o): Ort => (inEbene(o) ? { t: o.t, e: [o.e[0], o.e[1], o.e[2]], w: [o.w[0], o.w[1], o.w[2]] } : ortIn(k.netz, o.t, o.w[0], o.w[1], o.w[2])));
  if (orte.length < (zu ? 3 : 2)) return [];
  const nachTreffer = new Map<number, TrefferPunkt>();
  for (const q of punkte ?? []) nachTreffer.set(q.i, q);
  /** eine Farblinie aus einem Lauf: `quelle` je Ort die Nummer seines Treffers (−1: neu, auf der Mittelebene); `gesp`: gespiegelt */
  const linie = (st: Ort[], quelle: number[], runZu: boolean, gesp: boolean): Farblinie => {
    if (!punkte) return { id: naechsteId(), zu: runZu, stuetzen: st, punkte: punkteSchaetzen(k.netz, st, runZu) };
    const m = (v: V3 | null): V3 | null => (v && gesp ? [v[0], v[1], -v[2]] : v);
    let P: FarbPunkt[] = [];
    st.forEach((o, j) => {
      const q = nachTreffer.get(quelle[j]!);
      if (!q) return;
      const ein = m(q.ein);
      const aus = m(q.aus);
      P.push({ i: j, ein: ein ? richtungAus(pos, o, ein) : null, aus: aus ? richtungAus(pos, o, aus) : null, knick: q.knick, ...(q.breite ? { breite: q.breite } : {}) });
    });
    if (runZu) {
      if (!P.length) P = punkteSchaetzen(k.netz, st, true);
      else if (P[0]!.i !== 0) {
        // die Punkte beginnen beim Ort 0: die Orte so weit weiterdrehen
        const r = P[0]!.i;
        st.push(...st.splice(0, r));
        for (const q of P) q.i -= r;
      }
    } else {
      // die Enden eines offenen Laufs sind Punkte (an der Mittelebene: Ecken)
      if (!P.length || P[0]!.i !== 0) P.unshift({ i: 0, ein: null, aus: null, knick: true });
      if (P[P.length - 1]!.i !== st.length - 1) P.push({ i: st.length - 1, ein: null, aus: null, knick: true });
      P[0]!.ein = null;
      P[P.length - 1]!.aus = null;
    }
    return { id: naechsteId(), zu: runZu, stuetzen: st, punkte: P };
  };
  const alle = orte.map((_, i) => i);
  if (!spiegeln) return [linie(orte, alle, zu, false)];
  const n = orte.length;
  /** je Ort: +1 auf der Hälfte z ≥ 0, −1 auf der anderen, 0 in der Mittelebene */
  let seite = orte.map((o) => (inEbene(o) ? 0 : haelfte(k.netz, o.t)));
  let gesp = false;
  if (seite.some((s) => s < 0)) {
    // der längere Teil gilt: Liegt er auf der anderen Hälfte, wird die ganze Zeichnung gespiegelt
    let plus = 0;
    let minus = 0;
    const L = orte.map((o) => ortLage(pos, o));
    for (let i = 0; i < (zu ? n : n - 1); i++) {
      const j = (i + 1) % n;
      const d = Math.sqrt((L[j]![0] - L[i]![0]) ** 2 + (L[j]![1] - L[i]![1]) ** 2 + (L[j]![2] - L[i]![2]) ** 2);
      if (seite[i]! >= 0 && seite[j]! >= 0) plus += d;
      else if (seite[i]! <= 0 && seite[j]! <= 0) minus += d;
      else {
        plus += d / 2;
        minus += d / 2;
      }
    }
    if (minus > plus || !seite.some((s) => s > 0)) {
      const g = orte.map((o) => ortGespiegelt(k, o));
      if (g.some((o) => !o)) return [];
      orte = g as Ort[];
      seite = seite.map((s) => -s);
      gesp = true;
    }
  }
  // (was in der Mittelebene liegt, steht im Dreieck der Hälfte z ≥ 0)
  orte = orte.map((o, i) => (seite[i] === 0 && haelfte(k.netz, o.t) < 0 ? (ortGespiegelt(k, o) ?? o) : o));
  if (!seite.some((s) => s < 0)) return [linie(orte, alle, zu, gesp)];
  // über die Mitte gezeichnet: die Läufe auf der Hälfte z ≥ 0, jeder von der Ebene zur Ebene
  /** der Ort auf der Mittelebene zwischen einem Ort davor (z ≥ 0) und einem dahinter (oder umgekehrt) */
  const aufEbene = (innen: Ort, aussen: Ort): Ort | null => {
    const st = spur(k, innen, aussen);
    if (!st) return null;
    for (const s of st) {
      if (haelfte(k.netz, s.t) < 0) break;
      if (s.aus < 0) continue;
      const g = k.nachbar[3 * s.t + s.aus]!;
      if (g < 0 || haelfte(k.netz, Math.floor(g / 3)) > 0) continue;
      const tri = k.netz.tri;
      const o: Ort = { t: s.t, e: [tri[3 * s.t]!, tri[3 * s.t + 1]!, tri[3 * s.t + 2]!], w: [1 - s.b1 - s.c1, s.b1, s.c1] };
      // (genau auf die Kante der Ebene: Daran erkennt jeder, der die Farblinie liest, ihr Ende auf der Mitte)
      aufKanteDerMitte(k, o);
      return o;
    }
    return null;
  };
  const aus: Farblinie[] = [];
  // an einem Wechsel auf diese Hälfte beginnen (bei einer offenen Zeichnung am Anfang)
  let start = 0;
  if (zu) {
    start = -1;
    for (let i = 0; i < n; i++)
      if (seite[i]! > 0 && seite[(i - 1 + n) % n]! <= 0) {
        start = i;
        break;
      }
    if (start < 0) return [];
  }
  let lauf: Ort[] | null = null;
  let quelle: number[] = [];
  const schluss = (): void => {
    if (lauf && lauf.length >= 2) aus.push(linie(lauf, quelle, false, gesp));
    lauf = null;
  };
  for (let j = 0; j < n; j++) {
    const i = (start + j) % n;
    const vor = (i - 1 + n) % n;
    const hatVor = zu || i > 0;
    const s = seite[i]!;
    if (s > 0) {
      if (!lauf) {
        lauf = [];
        quelle = [];
        if (hatVor && seite[vor]! < 0) {
          const m = aufEbene(orte[i]!, orte[vor]!);
          if (m) {
            lauf.push(m);
            quelle.push(-1);
          }
        } else if (hatVor && seite[vor] === 0) {
          // (der Ort davor liegt schon in der Ebene: Er ist der Anfang)
          lauf.push(orte[vor]!);
          quelle.push(vor);
        }
      }
      lauf.push(orte[i]!);
      quelle.push(i);
    } else if (lauf) {
      if (s === 0) {
        lauf.push(orte[i]!);
        quelle.push(i);
      } else {
        const m = aufEbene(orte[vor]!, orte[i]!);
        if (m) {
          lauf.push(m);
          quelle.push(-1);
        }
      }
      schluss();
    }
  }
  // (eine offene Zeichnung, die auf dieser Hälfte endet)
  schluss();
  return aus;
}

/**
 * Was gespeichert wird (`WesenStand.farbe`): Orte als Punkte des Netzes und Gewichte, Farben als Zahlen 0 … 1. Version 2 (Etappe 2)
 * trägt je Farblinie ihre Punkte: `p` die Nummern ihrer Orte, `g` je Punkt sechs Zahlen (Richtung „ein“, Richtung „aus“, zu den
 * Ecken in der Reihenfolge von `e`; NaN: keine), `k` je Punkt 1 für geknickt. Version 1 (Etappe 1) hat nur die Orte. Version 3
 * (Etappe 4) trägt dazu `b`: je Punkt die Breite seines Verlaufs (0: harte Kante).
 */
export type BemalungDatei = {
  version: 1 | 2 | 3;
  aktiv: number;
  naechste: number;
  ebenen: {
    id: number;
    name: string;
    linien: { id: number; zu: boolean; e: Int32Array; w: Float64Array; p?: Int32Array; g?: Float64Array; k?: Uint8Array; b?: Float64Array }[];
    fuellungen: { id: number; e: [number, number, number]; w: [number, number, number]; farbe: Farbe }[];
  }[];
};

export function alsDatei(b: Bemalung): BemalungDatei {
  return {
    version: 3,
    aktiv: b.aktiv,
    naechste: b.naechste,
    ebenen: b.ebenen.map((e) => ({
      id: e.id,
      name: e.name,
      linien: e.linien.map((l) => ({
        id: l.id,
        zu: l.zu,
        e: Int32Array.from(l.stuetzen.flatMap((o) => o.e)),
        w: Float64Array.from(l.stuetzen.flatMap((o) => o.w)),
        p: Int32Array.from(l.punkte.map((q) => q.i)),
        g: Float64Array.from(l.punkte.flatMap((q) => [...(q.ein ?? [NaN, NaN, NaN]), ...(q.aus ?? [NaN, NaN, NaN])])),
        k: Uint8Array.from(l.punkte.map((q) => (q.knick ? 1 : 0))),
        b: Float64Array.from(l.punkte.map((q) => q.breite ?? 0)),
      })),
      fuellungen: e.fuellungen.map((f) => ({ id: f.id, e: [...f.saat.e], w: [...f.saat.w], farbe: [...f.farbe] })),
    })),
  };
}

/**
 * Eine gespeicherte Bemalung auf ein Netz legen: Jeder Ort findet sein Dreieck über seine drei Punkte. Zurück: die Bemalung, oder
 * null, wenn sie nicht zu diesem Netz gehört (ein Ort nennt drei Punkte, die kein Dreieck bilden). Eine Farblinie ohne Punkte
 * (Version 1) bekommt sie aus ihrem Verlauf (`punkteSchaetzen`).
 */
export function ausDatei(k: Karte, d: BemalungDatei | null | undefined): Bemalung | null {
  if (!d || (d.version !== 1 && d.version !== 2 && d.version !== 3) || !Array.isArray(d.ebenen)) return null;
  const tri = k.netz.tri;
  /** der Ort i einer Liste; `zu`: Werte je Ecke in der Reihenfolge der Datei, die mit in die Reihenfolge des Dreiecks gehen */
  const ort = (e: ArrayLike<number>, w: ArrayLike<number>, i: number): { o: Ort; platz: [number, number, number] } | null => {
    const a = e[3 * i]!;
    const b = e[3 * i + 1]!;
    const c = e[3 * i + 2]!;
    const t = k.dreieck(a, b, c);
    if (t < 0) return null;
    // die Gewichte in die Reihenfolge der Ecken dieses Dreiecks
    const ecken: [number, number, number] = [tri[3 * t]!, tri[3 * t + 1]!, tri[3 * t + 2]!];
    const platz: [number, number, number] = [ecken.indexOf(a), ecken.indexOf(b), ecken.indexOf(c)];
    const g: [number, number, number] = [0, 0, 0];
    for (let j = 0; j < 3; j++) g[platz[j]!] = w[3 * i + j]!;
    return { o: { t, e: ecken, w: g }, platz };
  };
  const ebenen: Ebene[] = [];
  for (const e of d.ebenen) {
    const linien: Farblinie[] = [];
    for (const l of e.linien) {
      const st: Ort[] = [];
      const plaetze: [number, number, number][] = [];
      for (let i = 0; i < l.e.length / 3; i++) {
        const o = ort(l.e, l.w, i);
        if (!o) return null;
        st.push(o.o);
        plaetze.push(o.platz);
      }
      let punkte: FarbPunkt[] | null = null;
      if (l.p && l.g && l.k && l.p.length > 0 && l.g.length === 6 * l.p.length && l.k.length === l.p.length) {
        punkte = [];
        for (let q = 0; q < l.p.length; q++) {
          const i = l.p[q]!;
          const platz = plaetze[i];
          if (!platz || (q > 0 && i <= l.p[q - 1]!)) {
            punkte = null;
            break;
          }
          const richtung = (ab: number): Richtung | null => {
            if (!Number.isFinite(l.g![ab]!)) return null;
            const r: Richtung = [0, 0, 0];
            for (let j = 0; j < 3; j++) r[platz[j]!] = l.g![ab + j]!;
            return r;
          };
          const breite = l.b && l.b.length === l.p.length && Number.isFinite(l.b[q]!) && l.b[q]! > 0 ? l.b[q]! : 0;
          punkte.push({ i, ein: richtung(6 * q), aus: richtung(6 * q + 3), knick: l.k[q] === 1, ...(breite ? { breite } : {}) });
        }
        if (punkte && punkte[0]!.i !== 0) punkte = null;
      }
      linien.push({ id: l.id, zu: l.zu, stuetzen: st, punkte: punkte ?? punkteSchaetzen(k.netz, st, l.zu) });
    }
    const fuellungen: Fuellung[] = [];
    for (const f of e.fuellungen) {
      const o = ort(f.e, f.w, 0);
      if (!o) return null;
      fuellungen.push({ id: f.id, saat: o.o, farbe: [f.farbe[0], f.farbe[1], f.farbe[2]] });
    }
    ebenen.push({ id: e.id, name: e.name, linien, fuellungen });
  }
  if (!ebenen.length) return null;
  return { ebenen, aktiv: d.aktiv, naechste: d.naechste };
}
