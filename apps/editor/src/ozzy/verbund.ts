// Der Verbund, vom Fenster aus (Etappe 5, 19.11.2026): hält den Stand, der gezeigt wird, und gibt dem Rechner im Hintergrund den
// nächsten Auftrag, sobald er frei ist und sich etwas geändert hat (immer nur den neuesten Stand; was dazwischen lag, wird nie
// gerechnet). Zwei Rechner: einer für das Ziehen (grobe Stufe, wenige Millisekunden je Stand) und einer für die Ruhe (volle
// Feinheit). So wartet ein neuer Zug nie auf einen feinen Stand, der noch rechnet.
import type { HautNetz } from '../anfang/haut';
import type { VerbundAuftrag, VerbundErgebnis, VerbundKoerper, VerbundNetz } from './verbundRechnen';

/** ein Objekt im Verbund: sein Stand (`schl`) und, erst wenn der Rechner es braucht, eine Kopie seiner gezeigten Haut */
export type VerbundGlied = { id: number; schl: string; netz: () => VerbundNetz | null; spiegelbild: boolean; abzieher: boolean; rund: number };
/** was zu sehen sein soll: die Körper, ihre Glieder, und ob gerade gezogen wird (dann auf der groben Stufe) */
export type VerbundSoll = { schl: string; eilig: boolean; glieder: VerbundGlied[]; koerper: VerbundKoerper[]; alle: number[] };
/** was zu sehen ist: das Netz aller Körper, ihre Nähte und Umrisse, wer darin aufgeht und welche Abzieher beißen */
export type VerbundBild = {
  nr: number;
  schl: string;
  netz: HautNetz | null;
  naht: Float32Array;
  umriss: [Float32Array, Float32Array, Float32Array];
  glieder: Set<number>;
  abzieher: Set<number>;
  beisst: Set<number>;
  eilig: boolean;
  ms: number;
  dehnungRest: number;
};

type Kanal = { worker: Worker | null; laeuft: { nr: number; soll: VerbundSoll; seit: number } | null; hat: Map<number, string[]>; fertig: string; kaputt: boolean };
const kanal = (): Kanal => ({ worker: null, laeuft: null, hat: new Map(), fertig: '', kaputt: false });

export class Verbund {
  bild: VerbundBild | null = null;
  fehler = '';
  /** für Proben: Aufträge, Dauer der letzten (Rechner; samt Weg hin und zurück), je grob und fein */
  stand = { auftraege: [0, 0], ms: [0, 0], runde: [0, 0], verworfen: 0 };
  private zaehler = 0;
  private mindest = 0;
  private kanaele: [Kanal, Kanal] = [kanal(), kanal()];

  /** `geaendert`: Das Bild hat sich geändert, oder der Rechner ist frei für den nächsten Stand (noch ein Bild zeichnen) */
  constructor(private geaendert: () => void) {}

  /** rechnet gerade etwas */
  get beschaeftigt(): boolean {
    return this.kanaele.some((k) => k.laeuft !== null);
  }

  /**
   * Je Bild: Das soll zu sehen sein (null: kein Verbund). Passt das gezeigte Bild nicht dazu und ist der Rechner frei, geht ein
   * Auftrag hinaus. Zurück: Es wird noch gerechnet oder gewartet (die Bilder sollen weiterlaufen).
   */
  pflegen(soll: VerbundSoll | null): boolean {
    if (!soll) {
      this.bild = null;
      // (was noch unterwegs ist, gilt nicht mehr)
      this.mindest = this.zaehler;
      return false;
    }
    if (this.bild?.schl === soll.schl) return false;
    const i = soll.eilig ? 0 : 1;
    const k = this.kanaele[i];
    if (k.kaputt) return false;
    if (k.laeuft) return true;
    // (dieser Stand ist schon gerechnet und war nicht zu zeigen, etwa weil er scheiterte: nicht noch einmal)
    if (k.fertig === soll.schl) return false;
    if (!k.worker) {
      try {
        k.worker = new Worker(new URL('./verbund.worker.ts', import.meta.url), { type: 'module' });
      } catch (e) {
        k.kaputt = true;
        this.fehler = `Der Rechner für den Verbund startet nicht (${e instanceof Error ? e.message : String(e)})`;
        return false;
      }
      k.worker.onmessage = (e: MessageEvent<VerbundErgebnis>) => this.angekommen(i, e.data);
      k.worker.onerror = (e) => {
        k.kaputt = true;
        k.laeuft = null;
        this.fehler = `Der Rechner für den Verbund ist ausgefallen (${e.message})`;
        this.bild = null;
        this.geaendert();
      };
    }
    // nur die Netze mitschicken, die der Rechner noch nicht hat (er behält je Objekt die letzten zwei Stände, wie hier mitgezählt)
    const gibt = new Set(soll.alle);
    for (const id of [...k.hat.keys()]) if (!gibt.has(id)) k.hat.delete(id);
    const teile: VerbundAuftrag['teile'] = [];
    const felder: ArrayBuffer[] = [];
    for (const g of soll.glieder) {
      const liste = k.hat.get(g.id) ?? [];
      const j = liste.indexOf(g.schl);
      let netz: VerbundNetz | null = null;
      if (j >= 0) liste.splice(j, 1);
      else {
        netz = g.netz();
        if (!netz) return false;
        felder.push(netz.pos.buffer as ArrayBuffer, netz.normal.buffer as ArrayBuffer, netz.index.buffer as ArrayBuffer, netz.hoehe.buffer as ArrayBuffer, netz.blatt.buffer as ArrayBuffer, netz.dehnung.buffer as ArrayBuffer);
      }
      liste.unshift(g.schl);
      liste.length = Math.min(2, liste.length);
      k.hat.set(g.id, liste);
      teile.push({ id: g.id, schl: g.schl, netz, spiegelbild: g.spiegelbild, abzieher: g.abzieher, rund: g.rund });
    }
    const nr = ++this.zaehler;
    k.laeuft = { nr, soll, seit: performance.now() };
    this.stand.auftraege[i]!++;
    const auftrag: VerbundAuftrag = { nr, teile, koerper: soll.koerper, alle: soll.alle };
    k.worker.postMessage(auftrag, felder);
    return true;
  }

  private angekommen(i: number, e: VerbundErgebnis): void {
    const k = this.kanaele[i]!;
    const l = k.laeuft;
    k.laeuft = null;
    if (!l || l.nr !== e.nr) return;
    this.stand.ms[i] = e.ms;
    this.stand.runde[i] = performance.now() - l.seit;
    if (e.fehlt.length) {
      // der Rechner hat diese Netze nicht mehr: beim nächsten Auftrag wieder mitschicken
      for (const id of e.fehlt) k.hat.delete(id);
      this.geaendert();
      return;
    }
    k.fertig = l.soll.schl;
    if (e.nr <= this.mindest || (this.bild && e.nr < this.bild.nr)) {
      // überholt: Ein neuerer Stand ist schon zu sehen (oder es gibt keinen Verbund mehr)
      this.stand.verworfen++;
      this.geaendert();
      return;
    }
    if (e.fehler) {
      this.fehler = e.fehler;
      this.bild = null;
      this.mindest = e.nr;
      this.geaendert();
      return;
    }
    this.fehler = '';
    const n = e.netz;
    const N = n ? n.pos.length / 3 : 0;
    this.bild = {
      nr: e.nr,
      schl: l.soll.schl,
      // (der Verbund wird nie an der Spiegelebene geschnitten und ist ganz zu sehen)
      netz: n ? { ...n, seite: new Float32Array(N), sicht: new Float32Array(N).fill(1) } : null,
      naht: e.naht,
      umriss: e.umriss,
      glieder: new Set(l.soll.glieder.map((g) => g.id)),
      abzieher: new Set(l.soll.glieder.filter((g) => g.abzieher).map((g) => g.id)),
      beisst: new Set(e.beisst),
      eilig: l.soll.eilig,
      ms: e.ms,
      dehnungRest: e.dehnungRest,
    };
    this.geaendert();
  }
}
