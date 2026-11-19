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
export type Kette = { t: number; linie: number; p: number[]; ein: number; aus: number; zu: boolean; gespiegelt: boolean };

/** die Stücke einer Farblinie der Reihe nach (null: Ein Weg zwischen zwei Orten ließ sich nicht finden) */
export function stueckeVon(k: Karte, l: LinieOrte): Stueck[] | null {
  const S = l.stuetzen;
  const n = S.length;
  if (n < 2) return null;
  const aus: Stueck[] = [];
  const bis = l.zu ? n : n - 1;
  for (let i = 0; i < bis; i++) {
    const st = spur(k, S[i]!, S[(i + 1) % n]!);
    if (!st) return null;
    for (const s of st) aus.push(s);
  }
  return aus;
}

/** aufeinanderfolgende Stücke im selben Dreieck zu Ketten fügen */
export function kettenAus(stuecke: readonly Stueck[], linie: number, zu: boolean): Kette[] {
  const aus: Kette[] = [];
  let jetzt: Kette | null = null;
  for (const s of stuecke) {
    // ein neues Dreieck, oder dasselbe nach einem Gang über eine Kante hinaus und wieder herein
    if (!jetzt || jetzt.t !== s.t || s.ein >= 0) {
      jetzt = { t: s.t, linie, p: [s.b0, s.c0], ein: s.ein, aus: -1, zu: false, gespiegelt: false };
      aus.push(jetzt);
    }
    jetzt.p.push(s.b1, s.c1);
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
  return { t, linie: c.linie, p, ein: kante(c.ein), aus: kante(c.aus), zu: c.zu, gespiegelt: true };
}

/**
 * Alle Ketten aller Farblinien, bei einer gespiegelten Form samt ihren Spiegelbildern. `fehl`: Farblinien, deren Weg sich nicht
 * finden ließ (sie fehlen dann in der Anzeige; ihre Orte bleiben).
 */
export function kettenAller(k: Karte, linien: readonly LinieOrte[], spiegeln: boolean): { ketten: Kette[]; fehl: number[] } {
  const ketten: Kette[] = [];
  const fehl: number[] = [];
  for (const l of linien) {
    const st = stueckeVon(k, l);
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
  return { ketten, fehl };
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
