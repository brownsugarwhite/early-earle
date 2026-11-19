/**
 * Ozzy, Paint-Modus, Etappe 1 (19.11.2026): von der Farblinie zu ihren Ketten je Dreieck.
 *
 * Eine Farblinie ist eine dichte Folge von Orten auf der Haut (`stuetzen`). Zwischen zwei Orten läuft sie gerade über die Haut
 * (`spur`). Daraus entstehen Ketten: je Dreieck, durch das die Farblinie läuft, ein Linienzug in den Gewichten dieses Dreiecks, von
 * Kante zu Kante (oder geschlossen im Inneren, oder mit einem freien Ende). Die Ketten sind abgeleitet: Nach jedem Netzwechsel
 * entstehen sie neu aus den Orten; gespeichert werden nur die Orte.
 *
 * Gespiegelte Formen: Gemalt wird auf der Hälfte z ≥ 0 (wie ein Ring der Form), das Spiegelbild jeder Kette kommt hier dazu. Eine
 * Farblinie, die auf der Mittelebene beginnt oder endet, schließt sich dort mit ihrem Spiegelbild.
 */
import { type Karte, type Ort, RAND, type Stueck, spur } from './ort';

/** eine Farblinie auf der Haut: ihre Orte der Reihe nach; `zu`: Sie schließt vom letzten zum ersten */
export type LinieOrte = { id: number; zu: boolean; stuetzen: Ort[] };

/**
 * Eine Kette: der Linienzug einer Farblinie in einem Dreieck, in den Gewichten seiner zweiten und dritten Ecke (b, c je Punkt).
 * `ein`, `aus`: die Kante, auf der sie beginnt und endet (−1: im Inneren, ein freies Ende oder ein geschlossener Zug). `zu`: ein
 * geschlossener Zug ganz in diesem Dreieck (der letzte Punkt ist der erste).
 */
export type Kette = {
  t: number;
  linie: number;
  p: number[];
  ein: number;
  aus: number;
  zu: boolean;
  gespiegelt: boolean;
  /** Etappe 2: Die Kette beginnt (`kEin`) oder endet (`kAus`) an einer Kreuzung im Inneren des Dreiecks (ihre Nummer im Dreieck) */
  kEin?: number;
  kAus?: number;
  /** Etappe 4: je Punkt die Breite des Verlaufs dort (fehlt: die Farblinie ist hart) */
  w?: number[];
};

/** ein Stück einer Farblinie in einem Dreieck, dazu (Etappe 4) die Breite des Verlaufs an seinem Anfang und Ende */
export type BreitStueck = Stueck & { w0?: number; w1?: number };

/**
 * Die Stücke einer Farblinie der Reihe nach (null: Ein Weg zwischen zwei Orten ließ sich nicht finden). `breiten` (Etappe 4): die
 * Breite des Verlaufs an jedem Ort; die Stücke zwischen zwei Orten teilen sie unter sich auf.
 */
export function stueckeVon(k: Karte, l: LinieOrte, breiten?: ArrayLike<number> | null): BreitStueck[] | null {
  const S = l.stuetzen;
  const n = S.length;
  if (n < 2) return null;
  const aus: BreitStueck[] = [];
  const bis = l.zu ? n : n - 1;
  for (let i = 0; i < bis; i++) {
    const st = spur(k, S[i]!, S[(i + 1) % n]!);
    if (!st) return null;
    if (breiten) {
      const wa = breiten[i]!;
      const wb = breiten[(i + 1) % n]!;
      st.forEach((s, j) => aus.push({ ...s, w0: wa + ((wb - wa) * j) / st.length, w1: wa + ((wb - wa) * (j + 1)) / st.length }));
    } else for (const s of st) aus.push(s);
  }
  return aus;
}

/** aufeinanderfolgende Stücke im selben Dreieck zu Ketten fügen */
export function kettenAus(stuecke: readonly BreitStueck[], linie: number, zu: boolean): Kette[] {
  const aus: Kette[] = [];
  let jetzt: Kette | null = null;
  // (Etappe 4) mit Breiten trägt jede Kette je Punkt eine
  const breit = stuecke.length > 0 && stuecke[0]!.w0 !== undefined;
  for (const s of stuecke) {
    // ein neues Dreieck, oder dasselbe nach einem Gang über eine Kante hinaus und wieder herein
    if (!jetzt || jetzt.t !== s.t || s.ein >= 0) {
      jetzt = { t: s.t, linie, p: [s.b0, s.c0], ein: s.ein, aus: -1, zu: false, gespiegelt: false };
      if (breit) jetzt.w = [s.w0 ?? 0];
      aus.push(jetzt);
    }
    jetzt.p.push(s.b1, s.c1);
    jetzt.w?.push(s.w1 ?? 0);
    jetzt.aus = s.aus;
    if (s.aus >= 0) jetzt = null;
  }
  if (zu && aus.length) {
    const erste = aus[0]!;
    const letzte = aus[aus.length - 1]!;
    if (erste === letzte) {
      // die ganze Farblinie in einem Dreieck: ein geschlossener Zug
      if (erste.ein < 0 && erste.aus < 0) erste.zu = true;
    } else if (erste.ein < 0 && letzte.aus < 0 && erste.t === letzte.t) {
      // sie beginnt mitten in einem Dreieck und endet dort: Anfang und Ende sind eine Kette
      letzte.p.pop();
      letzte.p.pop();
      letzte.p.push(...erste.p);
      if (letzte.w && erste.w) {
        letzte.w.pop();
        letzte.w.push(...erste.w);
      }
      letzte.aus = erste.aus;
      aus.shift();
    }
  }
  if (!zu && aus.length) {
    // eine offene Farblinie, die auf einer Kante beginnt oder endet (auf der Mittelebene: dort schließt ihr Spiegelbild an): Ein
    // Ort im Inneren hält `RAND` Abstand vom Rand, ein Gewicht von null heißt also: genau auf der Kante gegenüber dieser Ecke
    const kanteVon = (b: number, c: number): number => {
      const w = [1 - b - c, b, c];
      for (let i = 0; i < 3; i++) if (w[i]! < RAND / 2) return (i + 1) % 3;
      return -1;
    };
    const erste = aus[0]!;
    const letzte = aus[aus.length - 1]!;
    if (erste.ein < 0) erste.ein = kanteVon(erste.p[0]!, erste.p[1]!);
    if (letzte.aus < 0) letzte.aus = kanteVon(letzte.p[letzte.p.length - 2]!, letzte.p[letzte.p.length - 1]!);
  }
  return aus;
}

/** das Spiegelbild einer Kette im Spiegelbild ihres Dreiecks (dieselbe Folge der Punkte) oder null */
export function ketteGespiegelt(k: Karte, c: Kette): Kette | null {
  const sp = k.netz.spiegel;
  if (!sp || !k.spiegel) return null;
  const t = k.spiegel[c.t]!;
  if (t < 0 || t === c.t) return null;
  const tri = k.netz.tri;
  const von = [tri[3 * c.t]!, tri[3 * c.t + 1]!, tri[3 * c.t + 2]!];
  const nach = [tri[3 * t]!, tri[3 * t + 1]!, tri[3 * t + 2]!];
  // wohin jede Ecke des Dreiecks im Spiegelbild fällt
  const platz = von.map((v) => nach.indexOf(sp[v]!));
  if (platz.some((x) => x < 0)) return null;
  const p: number[] = [];
  for (let i = 0; i < c.p.length; i += 2) {
    const w = [1 - c.p[i]! - c.p[i + 1]!, c.p[i]!, c.p[i + 1]!];
    const g = [0, 0, 0];
    for (let e = 0; e < 3; e++) g[platz[e]!] = w[e]!;
    p.push(g[1]!, g[2]!);
  }
  /** die Kante (Ecke e → e + 1) im Spiegelbild: die Kante zwischen den Plätzen ihrer zwei Ecken */
  const kante = (e: number): number => {
    if (e < 0) return -1;
    const a = platz[e]!;
    const b = platz[(e + 1) % 3]!;
    return (a + 1) % 3 === b ? a : b;
  };
  return { t, linie: c.linie, p, ein: kante(c.ein), aus: kante(c.aus), zu: c.zu, gespiegelt: true, ...(c.w ? { w: c.w.slice() } : {}) };
}

/**
 * Alle Ketten aller Farblinien, bei einer gespiegelten Form samt ihren Spiegelbildern. `fehl`: Farblinien, deren Weg sich nicht
 * finden ließ (sie fehlen dann in der Anzeige; ihre Orte bleiben).
 */
export function kettenAller(k: Karte, linien: readonly LinieOrte[], spiegeln: boolean, breiten?: (l: LinieOrte) => ArrayLike<number> | null): { ketten: Kette[]; fehl: number[] } {
  const ketten: Kette[] = [];
  const fehl: number[] = [];
  for (const l of linien) {
    const st = stueckeVon(k, l, breiten?.(l));
    if (!st) {
      fehl.push(l.id);
      continue;
    }
    const eigene = kettenAus(st, l.id, l.zu);
    for (const c of eigene) ketten.push(c);
    if (spiegeln)
      for (const c of eigene) {
        const m = ketteGespiegelt(k, c);
        if (m) ketten.push(m);
      }
  }
  return { ketten: kreuzungenTeilen(ketten), fehl };
}

/**
 * Etappe 2: Wo sich zwei Ketten im selben Dreieck kreuzen, werden beide dort geteilt: Aus zwei Ketten werden vier, die an der
 * Kreuzung enden oder beginnen (`kAus`, `kEin`). So trennen zwei gekreuzte Farblinien vier Flächen (`flaechen.ts` verbindet an
 * einer Kreuzung je zwei Nachbarn im Umlauf). Eine Kette, die sich selbst kreuzt, bleibt, wie sie ist.
 */
export function kreuzungenTeilen(ketten: readonly Kette[]): Kette[] {
  const aus: Kette[] = [];
  for (const liste of jeDreieck(ketten).values()) {
    if (liste.length < 2) {
      for (const c of liste) aus.push(c);
      continue;
    }
    let L = liste.slice();
    let knoten = 0;
    /** die erste Kreuzung zweier Ketten: Stück i von A bei u, Stück j von B bei v; nicht an einem Ende, an dem beide schon geteilt sind */
    const finden = (A: Kette, B: Kette): { i: number; u: number; j: number; v: number; x: number; y: number } | null => {
      for (let i = 0; i + 3 < A.p.length; i += 2) {
        const ax = A.p[i]!;
        const ay = A.p[i + 1]!;
        const ux = A.p[i + 2]! - ax;
        const uy = A.p[i + 3]! - ay;
        for (let j = 0; j + 3 < B.p.length; j += 2) {
          const bx = B.p[j]!;
          const by = B.p[j + 1]!;
          const vx = B.p[j + 2]! - bx;
          const vy = B.p[j + 3]! - by;
          const d = ux * vy - uy * vx;
          if (Math.abs(d) < 1e-18) continue;
          const u = ((bx - ax) * vy - (by - ay) * vx) / d;
          const v = ((bx - ax) * uy - (by - ay) * ux) / d;
          if (u < 0 || u > 1 || v < 0 || v > 1) continue;
          // (am gemeinsamen Ende zweier schon geteilter Ketten: dieselbe Kreuzung, nicht noch einmal)
          const amEndeA = (i === 0 && u < 1e-9 && A.kEin !== undefined) || (i + 4 >= A.p.length && u > 1 - 1e-9 && A.kAus !== undefined);
          const amEndeB = (j === 0 && v < 1e-9 && B.kEin !== undefined) || (j + 4 >= B.p.length && v > 1 - 1e-9 && B.kAus !== undefined);
          if (amEndeA || amEndeB) continue;
          // (beide treffen sich auf dem Rand des Dreiecks, etwa eine Farblinie und ihr Spiegelbild auf der Mitte: Dort wird nicht
          // geteilt, `flaechen.ts` ordnet die zwei im Umlauf am Rand)
          const amRandA = (i === 0 && u < 1e-9 && A.ein >= 0) || (i + 4 >= A.p.length && u > 1 - 1e-9 && A.aus >= 0);
          const amRandB = (j === 0 && v < 1e-9 && B.ein >= 0) || (j + 4 >= B.p.length && v > 1 - 1e-9 && B.aus >= 0);
          if (amRandA && amRandB) continue;
          return { i, u, j, v, x: ax + u * ux, y: ay + u * uy };
        }
      }
      return null;
    };
    const teilen = (c: Kette, i: number, u: number, x: number, y: number, k: number): [Kette, Kette] => {
      const vorn: Kette = { ...c, p: [...c.p.slice(0, i + 2), x, y], aus: -1, zu: false, kAus: k };
      const hinten: Kette = { ...c, p: [x, y, ...c.p.slice(i + 2)], ein: -1, zu: false, kEin: k };
      if (c.w) {
        // (die Breite an der Kreuzung: zwischen den zwei Punkten des geteilten Stücks)
        const j = i / 2;
        const wx = c.w[j]! + (c.w[j + 1]! - c.w[j]!) * u;
        vorn.w = [...c.w.slice(0, j + 1), wx];
        hinten.w = [wx, ...c.w.slice(j + 1)];
      }
      if (c.kEin === undefined) delete vorn.kEin;
      if (c.kAus === undefined) delete hinten.kAus;
      return [vorn, hinten];
    };
    for (let runde = 0; runde < 200; runde++) {
      let gefunden = false;
      for (let a = 0; a < L.length && !gefunden; a++)
        for (let b = a + 1; b < L.length && !gefunden; b++) {
          const A = L[a]!;
          const B = L[b]!;
          // (ein geschlossener Zug im Dreieck wird nicht geteilt: Er hat keinen Anfang)
          if (A.zu || B.zu) continue;
          const k = finden(A, B);
          if (!k) continue;
          const [a1, a2] = teilen(A, k.i, k.u, k.x, k.y, knoten);
          const [b1, b2] = teilen(B, k.j, k.v, k.x, k.y, knoten);
          knoten++;
          L = [...L.slice(0, a), a1, a2, ...L.slice(a + 1, b), b1, b2, ...L.slice(b + 1)];
          gefunden = true;
        }
      if (!gefunden) break;
    }
    for (const c of L) aus.push(c);
  }
  return aus;
}

/** die Ketten nach Dreieck geordnet */
export function jeDreieck(ketten: readonly Kette[]): Map<number, Kette[]> {
  const aus = new Map<number, Kette[]>();
  for (const c of ketten) {
    const l = aus.get(c.t);
    if (l) l.push(c);
    else aus.set(c.t, [c]);
  }
  return aus;
}
