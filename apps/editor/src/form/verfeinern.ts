// Form zuerst (10.11.2026, Gegenprüfung Schritt G4): das Verfeinern im Zug als ein Auftrag, der ganz im Hintergrund rechnet.
// Bis dahin lief nur die Zerlegung im Worker; Verdichten, Einbetten und der Aufbau der Zeilen hielten den Zug im Hauptthread an
// (gemessen je Auslösen: 40–90 ms bei 5 200, rund 100 ms bei 11 000, 180–290 ms bei 23 400 Punkten, drei- bis viermal je Zug).
// Der Auftrag trägt die Haut flach (Felder statt 23 000 kleiner Listen) und die Loops; das Ergebnis ebenso, die großen Felder
// wandern ohne Kopie. Ohne DOM: Der Worker (`verfeinern.worker.ts`) und der Test rufen dieselbe Funktion.
//
// Zweiter Auftrag (G4.3): das Aufräumen nach dem Loslassen. Bis dahin lief es im Hauptthread und in Stufen: verdichten beim
// Loslassen, 30 ms später zerlegen (0,1–1,2 s Stillstand), setzen, bis zu dreimal nachverfeinern und wieder zerlegen und setzen,
// jede Stufe sichtbar. Hier rechnet alles verdeckt, bis die neue Haut steht; das Fenster wechselt einmal ein und bekommt die
// Zerlegung für das nächste Greifen gleich mit.
import {
  type Einbettung,
  type Haut,
  type HautGewichte,
  type HautVorlage,
  type Loop,
  LoopZug,
  type ZerlegungsDaten,
  einbetten,
  festlegen,
  hautNormalen,
  pfadVersatz,
  systemAusDaten,
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

// ---------- Aufräumen nach dem Loslassen (G4.3) ----------

export type AufraeumAuftrag = {
  art: 'aufraeumen';
  id: number;
  haut: FlacheHaut;
  loops: Loop[];
  /** je Loop: Die Linie ist ihr Pfad (beim Setzen ist ihr Ziel der Pfad; sonst bleibt sie, wo sie liegt) */
  exakt: boolean[];
  /** verdichten überhaupt (`?verdichten=0`: nur die Zerlegung für das nächste Greifen) */
  verdichten: boolean;
  maxKante: number;
  /** das erste Mal: teilen und zusammenlegen; danach höchstens `nachverfeinern`-mal nur teilen (wo die gesetzten Linien es brauchen) */
  opt: VerdichtenOptionen;
  optNurTeilen: VerdichtenOptionen;
  nachverfeinern: number;
  kruemmung: boolean;
  gewichte: HautGewichte;
  loeserOpt: { richtung?: boolean; maxNormalen?: boolean };
  /** Setzen: Runden, bis sich die Form in einer Runde um weniger als `ruhe` bewegt (längs der Normalen), höchstens `maxRunden` */
  ruhe: number;
  maxRunden: number;
};

export type AufraeumErgebnis = {
  art: 'aufraeumen';
  id: number;
  /** das Netz ist feiner geworden und hat sich gesetzt (sonst kommt nur die Zerlegung zurück) */
  geaendert: boolean;
  haut: FlacheHaut | null;
  loops: Loop[] | null;
  /** je Punkt des neuen Netzes der Punkt des Netzes vom Auftrag (−1: neu); die gebliebenen stehen vorn */
  alt: Int32Array | null;
  neu: number;
  gelegt: number;
  /** wie oft verdichtet wurde und wie viele Runden das Setzen brauchte */
  durchgaenge: number;
  runden: number;
  /** die Zerlegung des letzten Netzes für das nächste Greifen: Gewichte flach, Daten, Struktur (`HautVorlage`); null: nicht nach der Geometrie */
  gewStart: Int32Array | null;
  gewWert: Float64Array | null;
  daten: ZerlegungsDaten[];
  struktur: string;
  /** Dauer in ms: verdichten (alle Durchgänge), Zeilen, zerlegen, setzen */
  ms: number[];
};

/** Verdichten, setzen bis zur Ruhe, nachverfeinern und wieder setzen; am Ende die Zerlegung des letzten Netzes */
export function aufraeumen(a: AufraeumAuftrag): AufraeumErgebnis {
  const ms = [0, 0, 0, 0];
  let h = hautAusFlach(a.haut);
  let loops = a.loops;
  let alt: Int32Array | null = null;
  let neu = 0;
  let gelegt = 0;
  let durchgaenge = 0;
  let runden = 0;
  let verborgen = a.opt.verborgen ?? null;
  const verdichte = (opt: VerdichtenOptionen): boolean => {
    const t = uhr();
    const v = a.verdichten ? verdichten(h, loops, a.maxKante, { ...opt, verborgen }) : null;
    ms[0] = ms[0]! + uhr() - t;
    if (!v) return false;
    // die Zuordnung zum Netz vom Auftrag: über alle Durchgänge verkettet (gebliebene Punkte stehen in jedem vorn)
    alt = alt ? v.alt.map((w) => (w >= 0 ? alt![w]! : -1)) : v.alt;
    h = v.haut;
    loops = v.loops;
    verborgen = v.verborgen;
    neu += v.neu;
    gelegt += v.gelegt;
    durchgaenge++;
    return true;
  };
  /** die Zerlegung für das Netz von jetzt (null: nicht nach der Geometrie, dort zerlegt der Löser selbst) */
  const zerlege = (): { vorlage: HautVorlage; daten: ZerlegungsDaten[] } | null => {
    const t0 = uhr();
    const auftrag = new LoopZug(h, loops, null, a.kruemmung, 'kurven', a.gewichte, { nurZeilen: true, ...a.loeserOpt }).auftrag;
    const t1 = uhr();
    ms[1] = ms[1]! + t1 - t0;
    if (!auftrag) return null;
    const daten = auftrag.systeme.map((s) => zerlegungsDaten(s.n, s.zeilen, s.daempfung));
    ms[2] = ms[2]! + uhr() - t1;
    return { vorlage: { gew: auftrag.gew, sys: systemAusDaten(daten[0]!), cVor: daten[1] ? systemAusDaten(daten[1]) : null, struktur: auftrag.struktur }, daten };
  };
  /** Runden zu den Pfaden, bis die Form steht; danach die Linien festlegen */
  const setze = (vorlage: HautVorlage | null): void => {
    const t = uhr();
    const z = new LoopZug(h, loops, null, a.kruemmung, 'kurven', a.gewichte, vorlage ? { vorlage, ...a.loeserOpt } : a.loeserOpt);
    const ziele = loops.map((l, li) => (a.exakt[li] ? pfadVersatz(l, z.start[li]!) : null));
    const vor = new Float64Array(h.pos.length);
    for (let k = 0; k < a.maxRunden; k++) {
      vor.set(h.pos);
      const N = hautNormalen(h);
      z.schritt(ziele, 1);
      runden++;
      let weg = 0;
      for (let i = 0; i < vor.length; i += 3) {
        const d = Math.abs((h.pos[i]! - vor[i]!) * N[i]! + (h.pos[i + 1]! - vor[i + 1]!) * N[i + 1]! + (h.pos[i + 2]! - vor[i + 2]!) * N[i + 2]!);
        if (d > weg) weg = d;
      }
      if (weg < a.ruhe) break;
    }
    loops.forEach((l, li) => festlegen(h, l, !a.exakt[li]));
    ms[3] = ms[3]! + uhr() - t;
  };

  const geaendert = verdichte(a.opt);
  let z = zerlege();
  if (geaendert) {
    for (let k = 0; ; k++) {
      setze(z ? z.vorlage : null);
      if (k >= a.nachverfeinern || !verdichte(a.optNurTeilen)) break;
      z = zerlege();
    }
  }
  let gewStart: Int32Array | null = null;
  let gewWert: Float64Array | null = null;
  if (z) {
    const gew = z.vorlage.gew;
    gewStart = new Int32Array(h.n + 1);
    for (let p = 0; p < h.n; p++) gewStart[p + 1] = gewStart[p]! + gew[p]!.length;
    gewWert = new Float64Array(gewStart[h.n]!);
    for (let p = 0; p < h.n; p++) gewWert.set(gew[p]!, gewStart[p]!);
  }
  return {
    art: 'aufraeumen',
    id: a.id,
    geaendert,
    haut: geaendert ? { ...nachbarnFlach(h), pos: h.pos, tri: h.tri, n: h.n, spiegel: h.spiegel } : null,
    loops: geaendert ? loops : null,
    alt: geaendert ? alt : null,
    neu,
    gelegt,
    durchgaenge,
    runden,
    gewStart,
    gewWert,
    daten: z ? z.daten : [],
    struktur: z ? (z.vorlage.struktur ?? '') : '',
    ms,
  };
}

/** Die Felder des Ergebnisses, die ohne Kopie aus dem Worker wandern */
export function aufgeraeumtZumUebergeben(e: AufraeumErgebnis): ArrayBufferLike[] {
  const felder: ArrayBufferLike[] = e.daten.flatMap((d) => [d.perm.buffer, d.Lp.buffer, d.Li.buffer, d.Lx.buffer]);
  if (e.gewStart && e.gewWert) felder.push(e.gewStart.buffer, e.gewWert.buffer);
  if (e.haut) felder.push(e.haut.pos.buffer, e.haut.tri.buffer, e.haut.nbStart.buffer, e.haut.nb.buffer, e.haut.spiegel.buffer);
  if (e.alt) felder.push(e.alt.buffer);
  return [...new Set(felder)];
}
