/**
 * Ozzy, Paint-Modus, Etappe 1 (19.11.2026): die Bemalung einer Form. Ebenen mit Farblinien (dichte Folgen von Orten auf der Haut)
 * und Füllungen (eine Saat und eine Farbe). Gespeichert werden nur Orte und Farben; alles andere (Ketten, Flächen, Bild) wird
 * daraus abgeleitet. Ohne DOM: Die Tests laufen in Node.
 *
 * Etappe 1 kennt eine Ebene, geschlossene Farblinien und harte Kanten. Die Felder für später (Anker mit Richtungen, Breite der
 * Weichheit) kommen mit den Etappen, die sie brauchen.
 */
import { type Karte, type Naechster, type Netz, type Ort, RAND, ortGespiegelt, ortGilt, ortIn, orteUebergeben, spur } from './ort';
import type { LinieOrte } from './ketten';

export type Farbe = [number, number, number];
export type Farblinie = LinieOrte;
export type Fuellung = { id: number; saat: Ort; farbe: Farbe };
export type Ebene = { id: number; name: string; linien: Farblinie[]; fuellungen: Fuellung[] };
export type Bemalung = { ebenen: Ebene[]; aktiv: number; naechste: number };

export const leereBemalung = (): Bemalung => ({ ebenen: [{ id: 1, name: 'Ebene 1', linien: [], fuellungen: [] }], aktiv: 1, naechste: 2 });
export const istLeer = (b: Bemalung): boolean => b.ebenen.every((e) => !e.linien.length && !e.fuellungen.length);
export const aktiveEbene = (b: Bemalung): Ebene => b.ebenen.find((e) => e.id === b.aktiv) ?? b.ebenen[0]!;

const ortKopie = (o: Ort): Ort => ({ t: o.t, e: [o.e[0], o.e[1], o.e[2]], w: [o.w[0], o.w[1], o.w[2]] });

/** eine tiefe Kopie (für ⌘Z und für den Stand eines ruhenden Objekts) */
export function kopie(b: Bemalung): Bemalung {
  return {
    aktiv: b.aktiv,
    naechste: b.naechste,
    ebenen: b.ebenen.map((e) => ({
      id: e.id,
      name: e.name,
      linien: e.linien.map((l) => ({ id: l.id, zu: l.zu, stuetzen: l.stuetzen.map(ortKopie) })),
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

/** Passt die Bemalung zu diesem Netz (jeder Ort nennt ein Dreieck, das es so gibt)? */
export function giltFuer(netz: Netz, b: Bemalung): boolean {
  for (const o of alleOrte(b)) if (!ortGilt(netz, o)) return false;
  return true;
}

/**
 * Netzwechsel: alle Orte an die neue Haut übergeben (`ort.ts`). Orte auf der Mittelebene (Enden einer Farblinie dort) bleiben auf
 * ihr: Sie werden auf die Kante der Mittelebene zurückgelegt, die ihnen am nächsten ist. Zurück: der größte Weg eines Orts.
 */
export function uebergeben(altPos: ArrayLike<number>, neu: Karte, naechster: Naechster, b: Bemalung): number {
  const aufMitte = new Set<Ort>();
  for (const e of b.ebenen)
    for (const l of e.linien) {
      if (l.zu) continue;
      for (const o of [l.stuetzen[0], l.stuetzen[l.stuetzen.length - 1]]) if (o && Math.min(o.w[0], o.w[1], o.w[2]) < RAND / 2) aufMitte.add(o);
    }
  const weit = orteUebergeben(altPos, neu.netz, naechster, alleOrte(b));
  for (const o of aufMitte) aufKanteDerMitte(neu, o);
  return weit;
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

/**
 * Aus einer Folge von Treffern auf der Haut (dicht, der Reihe nach, wie gezeichnet) werden Farblinien. An einer gespiegelten Form
 * (`gespiegelt`) gilt die Hälfte z ≥ 0: Liegt alles auf der anderen, wird es gespiegelt; läuft die Zeichnung über die Mittelebene,
 * bleibt der Teil auf der Hälfte z ≥ 0 und endet auf der Ebene (sein Spiegelbild schließt ihn). `zu`: Die Zeichnung ist geschlossen.
 * `naechsteId`: vergibt Kennungen. Zurück: die Farblinien (leer, wenn zu wenige Treffer bleiben).
 */
export function linienAusTreffern(k: Karte, treffer: readonly Ort[], zu: boolean, gespiegelt: boolean, naechsteId: () => number): Farblinie[] {
  const orte = treffer.map((o) => ortIn(k.netz, o.t, o.w[0], o.w[1], o.w[2]));
  if (orte.length < (zu ? 3 : 2)) return [];
  if (!gespiegelt || !k.spiegel) return [{ id: naechsteId(), zu, stuetzen: orte }];
  const seite = orte.map((o) => haelfte(k.netz, o.t));
  if (seite.every((s) => s < 0)) {
    const g = orte.map((o) => ortGespiegelt(k, o));
    if (g.some((o) => !o)) return [];
    return [{ id: naechsteId(), zu, stuetzen: g as Ort[] }];
  }
  if (seite.every((s) => s > 0)) return [{ id: naechsteId(), zu, stuetzen: orte }];
  // über die Mitte gezeichnet: die Läufe auf der Hälfte z ≥ 0, jeder von der Ebene zur Ebene
  const n = orte.length;
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
      return { t: s.t, e: [tri[3 * s.t]!, tri[3 * s.t + 1]!, tri[3 * s.t + 2]!], w: [1 - s.b1 - s.c1, s.b1, s.c1] };
    }
    return null;
  };
  const aus: Farblinie[] = [];
  // an einem Wechsel von der anderen Hälfte auf diese beginnen (bei einer offenen Zeichnung am Anfang)
  let start = 0;
  if (zu) {
    start = -1;
    for (let i = 0; i < n; i++)
      if (seite[i]! > 0 && seite[(i - 1 + n) % n]! < 0) {
        start = i;
        break;
      }
    if (start < 0) return [];
  }
  let lauf: Ort[] | null = null;
  for (let j = 0; j < n; j++) {
    const i = (start + j) % n;
    const vor = (i - 1 + n) % n;
    const hatVor = zu || i > 0;
    if (seite[i]! > 0) {
      if (!lauf) {
        lauf = [];
        if (hatVor && seite[vor]! < 0) {
          const m = aufEbene(orte[i]!, orte[vor]!);
          if (m) lauf.push(m);
        }
      }
      lauf.push(orte[i]!);
    } else if (lauf) {
      const m = aufEbene(orte[vor]!, orte[i]!);
      if (m) lauf.push(m);
      if (lauf.length >= 2) aus.push({ id: naechsteId(), zu: false, stuetzen: lauf });
      lauf = null;
    }
  }
  if (lauf) {
    // (geschlossen: Der Lauf endet am Wechsel vor dem Start)
    if (zu) {
      const letzter = (start - 1 + n) % n;
      const m = seite[letzter]! < 0 ? aufEbene(lauf[lauf.length - 1]!, orte[letzter]!) : null;
      if (m) lauf.push(m);
    }
    if (lauf.length >= 2) aus.push({ id: naechsteId(), zu: false, stuetzen: lauf });
  }
  return aus;
}

/** Was gespeichert wird (`WesenStand.farbe`): Orte als Punkte und Gewichte, Farben als Zahlen 0 … 1. Version 1. */
export type BemalungDatei = {
  version: 1;
  aktiv: number;
  naechste: number;
  ebenen: {
    id: number;
    name: string;
    linien: { id: number; zu: boolean; e: Int32Array; w: Float64Array }[];
    fuellungen: { id: number; e: [number, number, number]; w: [number, number, number]; farbe: Farbe }[];
  }[];
};

export function alsDatei(b: Bemalung): BemalungDatei {
  return {
    version: 1,
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
      })),
      fuellungen: e.fuellungen.map((f) => ({ id: f.id, e: [...f.saat.e], w: [...f.saat.w], farbe: [...f.farbe] })),
    })),
  };
}

/**
 * Eine gespeicherte Bemalung auf ein Netz legen: Jeder Ort findet sein Dreieck über seine drei Punkte. Zurück: die Bemalung, oder
 * null, wenn sie nicht zu diesem Netz gehört (ein Ort nennt drei Punkte, die kein Dreieck bilden).
 */
export function ausDatei(k: Karte, d: BemalungDatei | null | undefined): Bemalung | null {
  if (!d || d.version !== 1 || !Array.isArray(d.ebenen)) return null;
  const tri = k.netz.tri;
  const ort = (e: ArrayLike<number>, w: ArrayLike<number>, i: number): Ort | null => {
    const a = e[3 * i]!;
    const b = e[3 * i + 1]!;
    const c = e[3 * i + 2]!;
    const t = k.dreieck(a, b, c);
    if (t < 0) return null;
    // die Gewichte in die Reihenfolge der Ecken dieses Dreiecks
    const ecken: [number, number, number] = [tri[3 * t]!, tri[3 * t + 1]!, tri[3 * t + 2]!];
    const g: [number, number, number] = [0, 0, 0];
    [a, b, c].forEach((v, j) => {
      g[ecken.indexOf(v)] = w[3 * i + j]!;
    });
    return { t, e: ecken, w: g };
  };
  const ebenen: Ebene[] = [];
  for (const e of d.ebenen) {
    const linien: Farblinie[] = [];
    for (const l of e.linien) {
      const st: Ort[] = [];
      for (let i = 0; i < l.e.length / 3; i++) {
        const o = ort(l.e, l.w, i);
        if (!o) return null;
        st.push(o);
      }
      linien.push({ id: l.id, zu: l.zu, stuetzen: st });
    }
    const fuellungen: Fuellung[] = [];
    for (const f of e.fuellungen) {
      const o = ort(f.e, f.w, 0);
      if (!o) return null;
      fuellungen.push({ id: f.id, saat: o, farbe: [f.farbe[0], f.farbe[1], f.farbe[2]] });
    }
    ebenen.push({ id: e.id, name: e.name, linien, fuellungen });
  }
  if (!ebenen.length) return null;
  return { ebenen, aktiv: d.aktiv, naechste: d.naechste };
}
