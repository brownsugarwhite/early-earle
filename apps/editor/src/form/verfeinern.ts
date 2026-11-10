// Form zuerst (10.11.2026, Gegenprüfung Schritt G4): das Verfeinern im Zug als ein Auftrag, der ganz im Hintergrund rechnet.
// Bis dahin lief nur die Zerlegung im Worker; Verdichten, Einbetten und der Aufbau der Zeilen hielten den Zug im Hauptthread an
// (gemessen je Auslösen: 40–90 ms bei 5 200, rund 100 ms bei 11 000, 180–290 ms bei 23 400 Punkten, drei- bis viermal je Zug).
// Der Auftrag trägt die Haut flach (Felder statt 23 000 kleiner Listen) und die Loops; das Ergebnis ebenso, die großen Felder
// wandern ohne Kopie. Ohne DOM: Der Worker (`verfeinern.worker.ts`) und der Test rufen dieselbe Funktion.
import {
  type Einbettung,
  type Haut,
  type HautGewichte,
  type Loop,
  LoopZug,
  type ZerlegungsDaten,
  einbetten,
  verdichten,
  zerlegungsDaten,
} from '@ee/shape/dicht';

/** Haut ohne verschachtelte Listen: Nachbarn je Punkt als ein Feld mit Anfängen */
export type FlacheHaut = { pos: Float64Array; tri: Uint32Array; n: number; nbStart: Int32Array; nb: Int32Array; spiegel: Int32Array };

/** Nachbarn flach (hängt nur am Netz, nicht an den Lagen) */
export function nachbarnFlach(h: Haut): { nbStart: Int32Array; nb: Int32Array } {
  const nbStart = new Int32Array(h.n + 1);
  for (let v = 0; v < h.n; v++) nbStart[v + 1] = nbStart[v]! + h.nachbarn[v]!.length;
  const nb = new Int32Array(nbStart[h.n]!);
  for (let v = 0; v < h.n; v++) nb.set(h.nachbarn[v]!, nbStart[v]!);
  return { nbStart, nb };
}

/** Die Haut flach, mit einer Kopie der Lagen (die Haut im Fenster rechnet weiter) */
export function hautFlach(h: Haut, nachbarn = nachbarnFlach(h)): FlacheHaut {
  return { pos: Float64Array.from(h.pos), tri: h.tri, n: h.n, nbStart: nachbarn.nbStart, nb: nachbarn.nb, spiegel: h.spiegel };
}

export function hautAusFlach(f: FlacheHaut): Haut {
  const nachbarn: number[][] = new Array<number[]>(f.n);
  for (let v = 0; v < f.n; v++) nachbarn[v] = Array.from(f.nb.subarray(f.nbStart[v]!, f.nbStart[v + 1]!));
  return { pos: f.pos, tri: f.tri, n: f.n, nachbarn, spiegel: f.spiegel };
}

export type VerdichtenOptionen = NonNullable<Parameters<typeof verdichten>[3]>;

export type VerfeinerAuftrag = {
  id: number;
  haut: FlacheHaut;
  loops: Loop[];
  /** Kanten darüber werden geteilt */
  maxKante: number;
  opt: VerdichtenOptionen;
  /** wie beim Löser des Fensters: Krümmung folgt den Loops, Gewichte, Schalter der Beweise */
  kruemmung: boolean;
  gewichte: HautGewichte;
  loeserOpt: { richtung?: boolean; maxNormalen?: boolean };
};

export type VerfeinerErgebnis =
  | { id: number; leer: true; ms: number[] }
  | {
      id: number;
      leer: false;
      haut: FlacheHaut;
      loops: Loop[];
      /** je neuer Punkt der alte, aus dem er kam (−1: neu) */
      alt: Int32Array;
      neu: number;
      gelegt: number;
      /** jeder Punkt des neuen Netzes als Stelle auf der alten Haut */
      einbettung: Einbettung;
      /** Gewichte der Matrix je Punkt und Nachbar, flach */
      gewStart: Int32Array;
      gewWert: Float64Array;
      /** die Zerlegungen (Lagen, Vorkonditionierer der Krümmung) */
      daten: ZerlegungsDaten[];
      /** Dauer in ms: verdichten, einbetten, Zeilen, zerlegen */
      ms: number[];
    };

const uhr = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/** Der ganze Auftrag: verdichten, die neuen Punkte auf der alten Haut einbetten, Zeilen der Matrix bauen, zerlegen */
export function verfeinern(a: VerfeinerAuftrag): VerfeinerErgebnis {
  const t0 = uhr();
  const h = hautAusFlach(a.haut);
  const v = verdichten(h, a.loops, a.maxKante, a.opt);
  const t1 = uhr();
  if (!v) return { id: a.id, leer: true, ms: [t1 - t0] };
  const einbettung = einbetten(h, v.haut.pos, { nachbarn: v.haut.nachbarn, alt: v.alt });
  const t2 = uhr();
  const auftrag = new LoopZug(v.haut, v.loops, null, a.kruemmung, 'kurven', a.gewichte, { nurZeilen: true, ...a.loeserOpt }).auftrag;
  if (!auftrag) return { id: a.id, leer: true, ms: [t1 - t0, t2 - t1] };
  const t3 = uhr();
  const daten = auftrag.systeme.map((s) => zerlegungsDaten(s.n, s.zeilen, s.daempfung));
  const t4 = uhr();
  const gewStart = new Int32Array(v.haut.n + 1);
  for (let p = 0; p < v.haut.n; p++) gewStart[p + 1] = gewStart[p]! + auftrag.gew[p]!.length;
  const gewWert = new Float64Array(gewStart[v.haut.n]!);
  for (let p = 0; p < v.haut.n; p++) gewWert.set(auftrag.gew[p]!, gewStart[p]!);
  return {
    id: a.id,
    leer: false,
    haut: { ...nachbarnFlach(v.haut), pos: v.haut.pos, tri: v.haut.tri, n: v.haut.n, spiegel: v.haut.spiegel },
    loops: v.loops,
    alt: v.alt,
    neu: v.neu,
    gelegt: v.gelegt,
    einbettung,
    gewStart,
    gewWert,
    daten,
    ms: [t1 - t0, t2 - t1, t3 - t2, t4 - t3],
  };
}

/** Gewichte je Punkt aus dem flachen Feld (Ausschnitte, keine Kopien) */
export function gewichteAusFlach(start: Int32Array, wert: Float64Array): Float64Array[] {
  const n = start.length - 1;
  const gew = new Array<Float64Array>(n);
  for (let v = 0; v < n; v++) gew[v] = wert.subarray(start[v]!, start[v + 1]!);
  return gew;
}

/** Die Felder des Ergebnisses, die ohne Kopie aus dem Worker wandern */
export function felderZumUebergeben(e: VerfeinerErgebnis): ArrayBufferLike[] {
  if (e.leer) return [];
  const felder: ArrayBufferLike[] = [
    e.haut.pos.buffer,
    e.haut.tri.buffer,
    e.haut.nbStart.buffer,
    e.haut.nb.buffer,
    e.haut.spiegel.buffer,
    e.alt.buffer,
    e.einbettung.tri.buffer,
    e.einbettung.b.buffer,
    e.einbettung.o.buffer,
    e.gewStart.buffer,
    e.gewWert.buffer,
    ...e.daten.flatMap((d) => [d.perm.buffer, d.Lp.buffer, d.Li.buffer, d.Lx.buffer]),
  ];
  // jedes Feld nur einmal (zwei Sichten auf denselben Speicher ließen das Übergeben scheitern)
  return [...new Set(felder)];
}
