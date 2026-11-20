// Fassade der Laufzeit (Plan 4.2; Konzept 10.3): gleich für Editor und Spiel. Zusammenbau-Datei: Nur die Integration ändert sie und
// verdrahtet nach jeder Welle die Schritte der Rechenkette, die gebaut sind; fehlende Schritte überspringt sie.
//
// Stand M0 (noch nichts verdrahtet außer Ordnung und Reglern):
// - bauen: Ordnung und ReglerPlan, die übrigen Teilpläne leer; ein Lauf mit den Reglern entsteht dabei (Werkbank ohne Szene). Die
//   Felder der Schichten, Chips und Bausteine haben die Länge, die der Bauplan sagt (PhysikPlan.chipStand, LogikPlan.bausteinStand);
//   ändert sie sich, beginnen sie neu in Ruhe. Die ChipLauf und BausteinLauf hält die Fassade, sobald Schritt 7 und 8 verdrahtet sind.
// - takt: zählt nur; die Schritte 1 bis 9 fehlen noch. vorlauf sammelt Zeit (Kappung 0,25 s) und rechnet höchstens 5 Takte.
// - hand und wert: Durchlauf ohne Zeit ohne Drähte, also Ist = Soll = Hand (regler/hand.ts mit M1.3, regler/durchlauf.ts mit M1.7).
// - bild und auswerten: gezeigte Werte = Ist (ohne Mischen); sie hängen an BildDaten nichts an, solange Form und Abflachung fehlen
//   (Leeren zu Beginn jedes Bilds: `bildDatenLeeren`, wer zeichnet; vertrag/bilddaten.ts).
// - merken und zurueck: der ganze Lauf und die Welt; spulen nur auf den laufenden Takt (Archiv und Spulen kommen mit M5).
// - warum: sagt, dass es noch nicht verdrahtet ist.
import type { Diff, Dokument } from '@ee/studio-format/typen/dokument';
import type { Id } from '@ee/studio-format/typen/grund';
import type { Band } from '@ee/studio-format/typen/logik';
import { pruefsumme } from '@ee/studio-rechnen/pruefsumme';
import { bauen as planBauen } from './bauplan/bauen';
import { indexVon } from './bauplan/ordnung';
import type { Bauplan } from './vertrag/bauplan';
import type { BildDaten } from './vertrag/bilddaten';
import type { BildStand } from './vertrag/bildstand';
import type { RohEingabe } from './vertrag/eingabe';
import type { Ereignis } from './vertrag/ereignis';
import type { Anforderung, Lauf, Schluesselstand } from './vertrag/lauf';
import type { WarumAntwort, WarumFrage } from './vertrag/warum';
import type { WeltAdapter } from './vertrag/welt';

export interface LaufzeitOptionen { welt: WeltAdapter; editor: boolean }

/** Länge eines Takts in Sekunden (60 Hz; Zeitlupe ändert nur, wie schnell Takte folgen) */
export const TAKT = 1 / 60;
/** vorlauf sammelt höchstens so viel Zeit und rechnet höchstens so viele Takte je Aufruf */
const KAPPUNG = 0.25, TAKTE_JE_AUFRUF = 5;

export class Laufzeit {
  private readonly welt: WeltAdapter;
  /** im Editor laufen die Wächter (Schritt 15) mit; noch nicht verdrahtet */
  private readonly editor: boolean;
  private plan: Bauplan | null = null;
  private lauf: Lauf | null = null;
  /** Szene des Laufs (null: Werkbank); der Takt braucht sie, sobald Welt und Logik verdrahtet sind */
  private szene: Id<'sz'> | null = null;
  private zeit = 0;
  private faktor = 1;
  /** Anforderungen für den nächsten Takt (Schritt 4) */
  private readonly anforderungen: Anforderung[] = [];
  private stand: BildStand = standAnlegen(0, 0, 0);

  constructor(o: LaufzeitOptionen) {
    this.welt = o.welt;
    this.editor = o.editor;
  }

  /** Bauplan aus dem Dokument; mit `diff` nur, was sich änderte. Hinweise des Bauplans (etwa ein Kreis in den Drähten) */
  bauen(dok: Dokument, diff?: Diff, o?: { zoomstufe?: number }): { plan: Bauplan; hinweise: string[] } {
    const alt = this.plan;
    const plan = planBauen(dok, alt ?? undefined, diff, o);
    this.plan = plan;
    if (this.lauf === null) this.lauf = laufAnlegen(plan, 0);
    else {
      if (alt !== null && plan.regler !== alt.regler) this.lauf = laufAnpassen(this.lauf, alt, plan);
      laufLaengenAnpassen(this.lauf, plan);
    }
    if (this.stand.anker.length !== 6 * plan.form.ankerZahl || this.stand.regler.length !== plan.regler.anzahl ||
      this.stand.knochen.length !== 6 * plan.knochen.anzahl) {
      this.stand = standAnlegen(plan.form.ankerZahl, plan.knochen.anzahl, plan.regler.anzahl);
    }
    return { plan, hinweise: [...plan.regler.hinweise] };
  }

  /** neuer Lauf; `szene` null: nur Figuren (Werkbank), kein Spiel */
  starten(szene: Id<'sz'> | null, saat: number): void {
    const plan = this.planNoetig('starten');
    this.szene = szene;
    this.lauf = laufAnlegen(plan, saat);
    this.zeit = 0;
    this.anforderungen.length = 0;
  }

  /** sammelt Zeit, rechnet 0 bis 5 Takte (Kappung 0,25 s), gibt alpha (Anteil des nächsten Takts) */
  vorlauf(sekunden: number, roh: RohEingabe): number {
    if (sekunden > 0) this.zeit = Math.min(this.zeit + sekunden * this.faktor, KAPPUNG);
    for (let n = 0; n < TAKTE_JE_AUFRUF && this.zeit >= TAKT; n++) {
      this.takt(roh);
      this.zeit -= TAKT;
    }
    return Math.min(this.zeit / TAKT, 1);
  }

  /** genau ein Takt (Schritte 1 bis 9) */
  takt(roh: RohEingabe): void {
    const lauf = this.laufNoetig('takt');
    void roh;   // Schritt 1 (takt/eingabe.ts) ist noch nicht verdrahtet
    lauf.regler.vorher.set(lauf.regler.ist);
    // Schritte 2 bis 9 sind noch nicht verdrahtet; das Postfach des Takts bleibt leer
    lauf.ereignisse = lauf.postfach;
    lauf.postfach = [];
    this.anforderungen.length = 0;
    lauf.takt++;
  }

  /** = auswerten mit den gemischten Werten und Lagen; Schritt 10 (Mischen) ist noch nicht verdrahtet: gezeigt wird Ist */
  bild(alpha: number, aus: BildDaten): BildStand {
    void alpha;
    return this.auswerten(this.laufNoetig('bild').regler.ist, null, aus);
  }

  /** Schritte 10 bis 16 aus gegebenen Reglerwerten und Körperlagen, ohne den Lauf zu ändern; hängt an `aus` an (16 j) */
  auswerten(werte: Float64Array, lagen: Float64Array | null, aus: BildDaten): BildStand {
    const plan = this.planNoetig('auswerten');
    const n = plan.regler.anzahl;
    if (werte.length < n) throw new RangeError(`Laufzeit.auswerten: ${werte.length} Werte für ${n} Regler`);
    void lagen;   // Körperlagen braucht erst die Kopplung (M5)
    this.stand.regler.set(werte.subarray(0, n));
    // Form, Knochen, Wächter (nur im Editor) und Abflachen sind noch nicht verdrahtet: keine Anker, an `aus` hängt nichts an
    void aus;
    return this.stand;
  }

  /**
   * Leiste, Anfasser, Prüfstand: ohne laufenden Takt ein Durchlauf ohne Zeit (hier noch ohne Drähte: Ist = Soll = Hand). Verdrahtet
   * nach Welle A: `handSetzen` aus regler/hand.ts (klemmt und faltet, vertrag/lauf.ts), dann der Durchlauf aus regler/durchlauf.ts.
   */
  hand(regler: Id<'rg'>, wert: number): void {
    const lauf = this.laufNoetig('hand'), i = this.reglerIndex(regler, 'hand');
    lauf.regler.hand[i] = wert;
    lauf.regler.soll[i] = wert;
    lauf.regler.ist[i] = wert;
  }

  anfordern(schicht: Id<'sch'>, pose: Id<'po'>, quelle: Band | 'hand', variante?: string): void {
    const plan = this.planNoetig('anfordern');
    const s = indexVon(plan.ordnung, schicht), p = indexVon(plan.ordnung, pose);
    if (s < 0 || p < 0) throw new RangeError(`Laufzeit.anfordern: ${schicht} oder ${pose} steht nicht im Bauplan`);
    this.anforderungen.push(variante === undefined ? { schicht: s, pose: p, band: quelle } : { schicht: s, pose: p, band: quelle, variante });
  }

  wert(regler: Id<'rg'>): number {
    return this.laufNoetig('wert').regler.ist[this.reglerIndex(regler, 'wert')]!;
  }

  /** ändert nur, wie schnell Takte folgen; die Länge eines Takts bleibt 1/60 s */
  zeitlupe(faktor: number): void {
    if (!(faktor >= 0) || !Number.isFinite(faktor)) throw new RangeError(`Laufzeit.zeitlupe: Faktor ${String(faktor)}`);
    this.faktor = faktor;
  }

  merken(): Schluesselstand {
    const lauf = this.laufNoetig('merken');
    return { takt: lauf.takt, lauf: laufSichern(lauf), welt: this.welt.merken() };
  }

  zurueck(s: Schluesselstand): void {
    const lauf = this.laufNoetig('zurueck');
    laufLaden(s.lauf, lauf);
    this.welt.zuruecksetzen(s.welt);
    this.zeit = 0;
    this.anforderungen.length = 0;
  }

  spulen(takt: number): void {
    const lauf = this.laufNoetig('spulen');
    if (takt !== lauf.takt) throw new Error('Laufzeit.spulen: Archiv und Spulen sind noch nicht verdrahtet (takt/archiv.ts, takt/spulen.ts)');
  }

  /** Prüfsumme des Laufs (Takt, Regler, Schichten, Figur, Logik, Bausteine, Ströme) über der Prüfsumme der Welt */
  pruefsumme(): number {
    const lauf = this.laufNoetig('pruefsumme'), r = lauf.regler;
    return pruefsumme([Float64Array.of(lauf.takt), r.soll, r.ist, r.versatz, r.tempo, lauf.schichten, lauf.figur, lauf.logik,
      lauf.bausteine, lauf.stroeme], this.welt.pruefsumme());
  }

  /** Postfach des letzten Takts */
  ereignisse(): readonly Ereignis[] {
    return this.lauf?.ereignisse ?? [];
  }

  warum(frage: WarumFrage): WarumAntwort {
    void frage;
    return { saetze: ['„Warum?“ ist noch nicht verdrahtet (logik/warum.ts).'], beteiligte: [] };
  }

  private planNoetig(was: string): Bauplan {
    if (this.plan === null) throw new Error(`Laufzeit.${was}: zuerst bauen`);
    return this.plan;
  }

  private laufNoetig(was: string): Lauf {
    if (this.lauf === null) throw new Error(`Laufzeit.${was}: zuerst bauen`);
    return this.lauf;
  }

  private reglerIndex(regler: Id<'rg'>, was: string): number {
    const i = indexVon(this.planNoetig(was).ordnung, regler);
    if (i < 0 || i >= this.planNoetig(was).regler.anzahl) throw new RangeError(`Laufzeit.${was}: ${regler} ist kein Regler im Bauplan`);
    return i;
  }
}

// ---------- Lauf und Bildstand ----------

function standAnlegen(anker: number, knochen: number, regler: number): BildStand {
  return {
    anker: new Float64Array(6 * anker), ruhe: new Float64Array(6 * anker), knochen: new Float64Array(6 * knochen),
    regler: new Float64Array(regler), marken: new Float64Array(0),
  };
}

/** Länge eines Felds aus seinen Versätzen (vertrag/bauplan.ts: die letzte Zahl; ohne Zahlen 0) */
function standLaenge(versatz: Int32Array): number {
  return versatz.length === 0 ? 0 : versatz[versatz.length - 1]!;
}

/** Lauf in Ruhe: Regler auf ihrer Ruhestelle, keine Hand (NaN); Schichten, Chips und Bausteine lauter Nullen (ihre Ruhe) */
function laufAnlegen(plan: Bauplan, saat: number): Lauf {
  const n = plan.regler.anzahl, ruhe = plan.regler.standard;
  return {
    takt: 0, saat, zeitfaktor: 1,
    regler: {
      soll: Float64Array.from(ruhe), ist: Float64Array.from(ruhe), versatz: new Float64Array(n), tempo: new Float64Array(n),
      vorher: Float64Array.from(ruhe), hand: new Float64Array(n).fill(NaN),
    },
    schichten: new Float64Array(4 * plan.posen.schichten.length),
    figur: new Float64Array(standLaenge(plan.physik.chipStand)), logik: new Float64Array(0),
    bausteine: new Float64Array(standLaenge(plan.logik.bausteinStand)),
    stroeme: new Uint32Array(0), protokoll: [], postfach: [], ereignisse: [], pruefsummen: new Uint32Array(0),
  };
}

/**
 * Felder der Schichten, Chips und Bausteine auf die Längen eines neuen Plans; ein Feld, dessen Länge sich ändert, beginnt neu in Ruhe
 * (Umziehen Kennung für Kennung kommt mit den Schritten, die diese Felder füllen, M4 und M5)
 */
function laufLaengenAnpassen(lauf: Lauf, plan: Bauplan): void {
  const schichten = 4 * plan.posen.schichten.length, figur = standLaenge(plan.physik.chipStand);
  const bausteine = standLaenge(plan.logik.bausteinStand);
  if (lauf.schichten.length !== schichten) lauf.schichten = new Float64Array(schichten);
  if (lauf.figur.length !== figur) lauf.figur = new Float64Array(figur);
  if (lauf.bausteine.length !== bausteine) lauf.bausteine = new Float64Array(bausteine);
}

/** Reglerfelder auf einen neuen Plan umziehen, Kennung für Kennung; neue Regler stehen auf ihrer Ruhestelle */
function laufAnpassen(lauf: Lauf, alt: Bauplan, neu: Bauplan): Lauf {
  const n = neu.regler.anzahl, ids = neu.ordnung.regler, r = lauf.regler;
  const felder = [r.soll, r.ist, r.versatz, r.tempo, r.vorher, r.hand];
  const neue = [Float64Array.from(neu.regler.standard), Float64Array.from(neu.regler.standard), new Float64Array(n), new Float64Array(n),
    Float64Array.from(neu.regler.standard), new Float64Array(n).fill(NaN)];
  for (let i = 0; i < n; i++) {
    const j = indexVon(alt.ordnung, ids[i]!);
    if (j < 0 || j >= alt.regler.anzahl) continue;
    for (let f = 0; f < felder.length; f++) neue[f]![i] = felder[f]![j]!;
  }
  const [soll, ist, versatz, tempo, vorher, hand] = neue as [Float64Array, Float64Array, Float64Array, Float64Array, Float64Array, Float64Array];
  return { ...lauf, regler: { soll, ist, versatz, tempo, vorher, hand } };
}

/** schreibt einen Lauf in ein Feld aus Zahlen: Kopf, Felder mit Länge, Protokolllänge, Postfach und Ereignisse */
function laufSichern(lauf: Lauf): ArrayBuffer {
  const r = lauf.regler;
  const felder: ArrayLike<number>[] = [r.soll, r.ist, r.versatz, r.tempo, r.vorher, r.hand, lauf.schichten, lauf.figur, lauf.logik,
    lauf.bausteine, lauf.stroeme, lauf.pruefsummen];
  const zahlen: number[] = [lauf.takt, lauf.saat, lauf.zeitfaktor, lauf.protokoll.length];
  for (const f of felder) {
    zahlen.push(f.length);
    for (let i = 0; i < f.length; i++) zahlen.push(f[i]!);
  }
  for (const liste of [lauf.postfach, lauf.ereignisse]) {
    zahlen.push(liste.length);
    for (const e of liste) {
      zahlen.push(e.takt, e.staerke, e.ort === undefined ? 0 : 1, e.ort?.[0] ?? 0, e.ort?.[1] ?? 0);
      for (const text of [e.quelle, e.name]) {
        zahlen.push(text.length);
        for (let i = 0; i < text.length; i++) zahlen.push(text.charCodeAt(i));
      }
    }
  }
  return Float64Array.from(zahlen).buffer;
}

/** liest einen gesicherten Lauf zurück in `lauf` (Felder gleicher Länge); das Protokoll wird auf den gesicherten Stand gekürzt */
function laufLaden(puffer: ArrayBuffer, lauf: Lauf): void {
  const z = new Float64Array(puffer);
  let i = 0;
  const lies = (): number => {
    if (i >= z.length) throw new RangeError('Laufzeit.zurueck: Schlüsselstand zu kurz');
    return z[i++]!;
  };
  lauf.takt = lies();
  lauf.saat = lies();
  lauf.zeitfaktor = lies();
  const protokoll = lies();
  if (protokoll > lauf.protokoll.length) throw new RangeError('Laufzeit.zurueck: Schlüsselstand aus einem anderen Lauf');
  lauf.protokoll.length = protokoll;
  const r = lauf.regler;
  for (const f of [r.soll, r.ist, r.versatz, r.tempo, r.vorher, r.hand, lauf.schichten, lauf.figur, lauf.logik, lauf.bausteine,
    lauf.stroeme, lauf.pruefsummen]) {
    const n = lies();
    if (n !== f.length) throw new RangeError('Laufzeit.zurueck: Schlüsselstand zu einem anderen Bauplan');
    for (let k = 0; k < n; k++) f[k] = lies();
  }
  const listen: Ereignis[][] = [];
  for (let l = 0; l < 2; l++) {
    const liste: Ereignis[] = [];
    for (let n = lies(); n > 0; n--) {
      const takt = lies(), staerke = lies(), mitOrt = lies(), x = lies(), y = lies();
      const texte: string[] = [];
      for (let t = 0; t < 2; t++) {
        let text = '';
        for (let m = lies(); m > 0; m--) text += String.fromCharCode(lies());
        texte.push(text);
      }
      const e: Ereignis = { takt, quelle: texte[0]!, name: texte[1]!, staerke };
      if (mitOrt === 1) e.ort = [x, y];
      liste.push(e);
    }
    listen.push(liste);
  }
  lauf.postfach = listen[0]!;
  lauf.ereignisse = listen[1]!;
}
