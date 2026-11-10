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
//
// Mit Vorstufe (G4.4): Nach einer Kante, dem Löschen oder einem neuen Loop steht die Haut nicht zum Stand. Dann zerlegt und setzt
// der Auftrag zuerst (bis dahin im Hauptthread: Kante an hielt das Fenster 0,4 / 0,9 / 2,5 s an bei 5 200 / 11 000 / 23 400 Punkten)
// und meldet diesen Zwischenstand samt Zerlegung; danach räumt er auf wie nach dem Loslassen.
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
  loeserOpt: { richtung?: boolean; maxNormalen?: boolean; vorsicht?: boolean };
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
  // gekappt: Die Haut ist im Zug so weit gedehnt, dass das Netz auf das Vierfache wüchse; so läuft sie nur davon (dann verfällt es)
  if (!v || v.gekappt) return { id: a.id, leer: true, ms: [t1 - t0] };
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
  loeserOpt: { richtung?: boolean; maxNormalen?: boolean; vorsicht?: boolean };
  /** Setzen: Runden, bis sich die Form in einer Runde um weniger als `ruhe` bewegt (längs der Normalen), höchstens `maxRunden` */
  ruhe: number;
  maxRunden: number;
  /**
   * Vorstufe (G4.4): Die Haut steht nicht zum Stand (nach einer Kante, dem Löschen, einem neuen Loop). Dann vor dem Verdichten
   * zerlegen und setzen, bis die Form steht (höchstens `maxRundenZuerst`), und den Stand melden. `ziele`: je Loop ohne Pfad seine
   * Verschiebung (3 je Probe); sonst bleibt er, wo er liegt. Loops mit Pfad gehen auf ihren Pfad.
   */
  zuerstSetzen: boolean;
  ziele: (Float64Array | null)[] | null;
  maxRundenZuerst: number;
  /**
   * Die Vorstufe gilt nur, wenn die Haut darin zur Ruhe kommt (nach einem neuen Loop: Dort muss nichts geschehen, und mit einem
   * einzigen Loop hält nichts die Haut — gemessen schwingt ein neuer Löser dann bis 149 Einheiten je Runde aus und braucht 23 bis 36
   * Runden). Kommt sie nicht zur Ruhe, bleibt die Haut, wie sie war, und es gibt keinen Zwischenstand.
   */
  nurInRuhe: boolean;
};

/** Stand nach der Vorstufe: dasselbe Netz, gesetzt, mit seiner Zerlegung (die Lagen gehören dem Empfänger) */
export type Zwischenstand = {
  art: 'zwischen';
  id: number;
  pos: Float64Array;
  runden: number;
  gewStart: Int32Array | null;
  gewWert: Float64Array | null;
  daten: ZerlegungsDaten[];
  struktur: string;
  /** Dauer in ms: verdichten (0), Zeilen, zerlegen, setzen */
  ms: number[];
};

export type AufraeumErgebnis = {
  art: 'aufraeumen';
  id: number;
  /**
   * Vorstufe: 'gesetzt', oder 'verworfen' (mit `nurInRuhe` nicht zur Ruhe gekommen: Die Haut ist die des Auftrags geblieben).
   * `abgebrochen`: Beim Aufräumen kam die Haut nicht zu endlichen Lagen; es gilt der Stand davor (der des Auftrags oder der
   * Zwischenstand), ohne Zerlegung.
   */
  vorstufe: 'keine' | 'gesetzt' | 'verworfen';
  abgebrochen: boolean;
  /**
   * Die Haut ist eine andere als die, die der Empfänger hat (die des Auftrags, oder der gemeldete Zwischenstand): Das Netz ist
   * feiner geworden und hat sich gesetzt, oder (Vorstufe ohne Meldung) dasselbe Netz hat sich gesetzt. Sonst kommt nur die Zerlegung.
   */
  geaendert: boolean;
  haut: FlacheHaut | null;
  loops: Loop[] | null;
  /** je Punkt des neuen Netzes der Punkt des Netzes vom Auftrag (−1: neu); die gebliebenen stehen vorn. null: dasselbe Netz */
  alt: Int32Array | null;
  neu: number;
  gelegt: number;
  /** wie oft verdichtet wurde und wie viele Runden das Setzen brauchte */
  durchgaenge: number;
  runden: number;
  /**
   * die Zerlegung des letzten Netzes für das nächste Greifen: Gewichte flach, Daten, Struktur (`HautVorlage`); null bzw. leer: nicht
   * nach der Geometrie, oder sie ging schon mit dem Zwischenstand
   */
  gewStart: Int32Array | null;
  gewWert: Float64Array | null;
  daten: ZerlegungsDaten[];
  struktur: string;
  /** Dauer in ms: verdichten (alle Durchgänge), Zeilen, zerlegen, setzen */
  ms: number[];
  /** Vorsicht bei Unruhe: wie oft die Löser dieses Auftrags ihren Schritt halbiert haben oder stehen geblieben sind */
  unruhe: number;
};

/** Gewichte je Punkt als ein Feld mit Anfängen */
function gewichteFlach(gew: readonly Float64Array[]): { start: Int32Array; wert: Float64Array } {
  const start = new Int32Array(gew.length + 1);
  for (let p = 0; p < gew.length; p++) start[p + 1] = start[p]! + gew[p]!.length;
  const wert = new Float64Array(start[gew.length]!);
  for (let p = 0; p < gew.length; p++) wert.set(gew[p]!, start[p]!);
  return { start, wert };
}

/**
 * Wie weit draußen eine Haut höchstens liegen darf, bevor sie als davongelaufen gilt (10.11., Florian: „der Kopf bläst sich auf und
 * explodiert, dann ist es weg und die Seite hängt sich auf“): das Dreifache der größten Koordinate von Haut und Zielen der Linien,
 * dazu ein Stück (`kante`: die Kantenlänge, über der geteilt wird). Eine Haut, die zwischen ihren Linien steht, kommt dort nie hin;
 * eine, die davonläuft, ist nach wenigen Runden weit darüber (gemessen: 91 000 nach 27 Runden bei einer Form von 754).
 */
export function hautGrenze(pos: Float64Array, ziele: readonly Float64Array[], kante: number): number {
  let m = 0;
  for (let i = 0; i < pos.length; i++) {
    const v = pos[i]!;
    if (v > m) m = v;
    else if (-v > m) m = -v;
  }
  for (const z of ziele)
    for (let i = 0; i < z.length; i++) {
      const v = z[i]!;
      if (v > m) m = v;
      else if (-v > m) m = -v;
    }
  return 3 * m + 20 * kante;
}
/** alle Lagen endlich und innerhalb der Grenze? */
export function innerhalb(pos: Float64Array, grenze: number): boolean {
  for (let i = 0; i < pos.length; i++) {
    const v = pos[i]!;
    // (NaN vergleicht immer falsch)
    if (!(v <= grenze && v >= -grenze)) return false;
  }
  return true;
}

/**
 * (Vorstufe: zerlegen, setzen, melden;) verdichten, setzen bis zur Ruhe, nachverfeinern und wieder setzen; am Ende die Zerlegung des
 * letzten Netzes. `zwischen`: bekommt den Stand nach der Vorstufe; seine Felder dürfen dem Auftrag danach entzogen sein (der Worker
 * übergibt sie ohne Kopie), der Auftrag rührt sie nicht mehr an.
 */
export function aufraeumen(a: AufraeumAuftrag, zwischen?: (z: Zwischenstand) => void): AufraeumErgebnis {
  const ms = [0, 0, 0, 0];
  let h = hautAusFlach(a.haut);
  let loops = a.loops;
  let alt: Int32Array | null = null;
  let neu = 0;
  let gelegt = 0;
  let durchgaenge = 0;
  let runden = 0;
  let unruhe = 0;
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
  /**
   * Runden zu den Pfaden (Loops ohne Pfad: um `versch`), bis die Form steht; danach die Linien festlegen. Zurück: steht sie (in den
   * erlaubten Runden zur Ruhe gekommen), sind die Lagen endlich?
   */
  const setze = (vorlage: HautVorlage | null, versch: (Float64Array | null)[] | null, maxRunden: number): { steht: boolean; endlich: boolean } => {
    const t = uhr();
    const z = new LoopZug(h, loops, null, a.kruemmung, 'kurven', a.gewichte, vorlage ? { vorlage, ...a.loeserOpt } : a.loeserOpt);
    const ziele = loops.map((l, li) => (a.exakt[li] ? pfadVersatz(l, z.start[li]!) : (versch?.[li] ?? null)));
    const vor = new Float64Array(h.pos.length);
    // läuft die Haut beim Setzen davon (weiter draußen als das Dreifache von Haut und Zielen), gilt sie wie nicht endlich
    const grenze = hautGrenze(h.pos, z.lagen(ziele), a.maxKante);
    let steht = false;
    let endlich = true;
    for (let k = 0; k < maxRunden; k++) {
      vor.set(h.pos);
      const N = hautNormalen(h);
      z.schritt(ziele, 1);
      runden++;
      let weg = 0;
      for (let i = 0; i < vor.length; i += 3) {
        const d = Math.abs((h.pos[i]! - vor[i]!) * N[i]! + (h.pos[i + 1]! - vor[i + 1]!) * N[i + 1]! + (h.pos[i + 2]! - vor[i + 2]!) * N[i + 2]!);
        // (NaN vergleicht immer falsch: eigens prüfen)
        if (d > weg || d !== d) weg = d;
      }
      if (!Number.isFinite(weg) || !innerhalb(h.pos, grenze)) {
        endlich = false;
        break;
      }
      if (weg < a.ruhe) {
        steht = true;
        break;
      }
    }
    if (endlich) loops.forEach((l, li) => festlegen(h, l, !a.exakt[li]));
    unruhe += z.unruhe.stufen + (z.unruhe.fest ? 1 : 0);
    ms[3] = ms[3]! + uhr() - t;
    return { steht, endlich };
  };

  let z: ReturnType<typeof zerlege> = null;
  /** die Zerlegung `z` ging mit dem Zwischenstand hinaus: nicht mehr benutzen, nicht noch einmal schicken */
  let vergeben = false;
  /** die Vorstufe hat die Haut gesetzt, und niemand hat den Stand bekommen */
  let gesetzt = false;
  let vorstufe: AufraeumErgebnis['vorstufe'] = 'keine';
  if (a.zuerstSetzen) {
    z = zerlege();
    const vorher = Float64Array.from(h.pos);
    const r = setze(z ? z.vorlage : null, a.ziele, a.maxRundenZuerst);
    vorstufe = r.endlich && (r.steht || !a.nurInRuhe) ? 'gesetzt' : 'verworfen';
    if (vorstufe === 'verworfen') {
      // die Haut bleibt, wie sie war (die Zerlegung `z` gilt für genau diese Lagen)
      h.pos.set(vorher);
      loops.forEach((l, li) => festlegen(h, l, !a.exakt[li]));
    } else if (zwischen) {
      const g = z ? gewichteFlach(z.vorlage.gew) : null;
      zwischen({
        art: 'zwischen',
        id: a.id,
        pos: Float64Array.from(h.pos),
        runden,
        gewStart: g ? g.start : null,
        gewWert: g ? g.wert : null,
        daten: z ? z.daten : [],
        struktur: z ? (z.vorlage.struktur ?? '') : '',
        ms: [...ms],
      });
      vergeben = true;
    } else gesetzt = true;
  }
  const verdichtet = verdichte(a.opt);
  if (verdichtet || !z) {
    z = zerlege();
    vergeben = false;
  }
  let abgebrochen = false;
  if (verdichtet) {
    for (let k = 0; ; k++) {
      if (!setze(z ? z.vorlage : null, null, a.maxRunden).endlich) {
        abgebrochen = true;
        break;
      }
      if (k >= a.nachverfeinern || !verdichte(a.optNurTeilen)) break;
      z = zerlege();
    }
  }
  // die Haut ist beim Aufräumen nicht endlich geblieben: Es gilt der Stand davor (ohne Zerlegung; die passte zum verworfenen Netz)
  if (abgebrochen) return { art: 'aufraeumen', id: a.id, vorstufe, abgebrochen, geaendert: false, haut: null, loops: null, alt: null, neu: 0, gelegt: 0, durchgaenge, runden, gewStart: null, gewWert: null, daten: [], struktur: '', ms, unruhe };
  const geaendert = verdichtet || gesetzt;
  const g = z && !vergeben ? gewichteFlach(z.vorlage.gew) : null;
  return {
    art: 'aufraeumen',
    id: a.id,
    vorstufe,
    abgebrochen,
    geaendert,
    haut: geaendert ? { ...nachbarnFlach(h), pos: h.pos, tri: h.tri, n: h.n, spiegel: h.spiegel } : null,
    loops: geaendert ? loops : null,
    alt: verdichtet ? alt : null,
    neu,
    gelegt,
    durchgaenge,
    runden,
    gewStart: g ? g.start : null,
    gewWert: g ? g.wert : null,
    daten: z && !vergeben ? z.daten : [],
    struktur: z && !vergeben ? (z.vorlage.struktur ?? '') : '',
    ms,
    unruhe,
  };
}

/** Die Felder des Zwischenstands, die ohne Kopie aus dem Worker wandern */
export function zwischenZumUebergeben(z: Zwischenstand): ArrayBufferLike[] {
  const felder: ArrayBufferLike[] = [z.pos.buffer, ...z.daten.flatMap((d) => [d.perm.buffer, d.Lp.buffer, d.Li.buffer, d.Lx.buffer])];
  if (z.gewStart && z.gewWert) felder.push(z.gewStart.buffer, z.gewWert.buffer);
  return [...new Set(felder)];
}

/** Die Felder des Ergebnisses, die ohne Kopie aus dem Worker wandern */
export function aufgeraeumtZumUebergeben(e: AufraeumErgebnis): ArrayBufferLike[] {
  const felder: ArrayBufferLike[] = e.daten.flatMap((d) => [d.perm.buffer, d.Lp.buffer, d.Li.buffer, d.Lx.buffer]);
  if (e.gewStart && e.gewWert) felder.push(e.gewStart.buffer, e.gewWert.buffer);
  if (e.haut) felder.push(e.haut.pos.buffer, e.haut.tri.buffer, e.haut.nbStart.buffer, e.haut.nb.buffer, e.haut.spiegel.buffer);
  if (e.alt) felder.push(e.alt.buffer);
  return [...new Set(felder)];
}
