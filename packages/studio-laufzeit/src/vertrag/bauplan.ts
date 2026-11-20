// Vertrag: der Bauplan (Plan 4.3). Er übersetzt die Datensätze eines Dokuments in gepackte Felder und baut nur Teilpläne neu, deren
// Quellen sich änderten (`bauplan/bauen.ts`, Zusammenbau). Alle Indizes beziehen sich auf den OrdnungPlan, −1 heißt „keiner“. Ein
// Bauplan ist unveränderlich: Ein Neubau legt neue Teilpläne an und übernimmt die unveränderten.
//
// Ordnung des Ankerpuffers (eine Regel für alle Teilpläne und Schritte; je Anker 6 Zahlen: p, Ein-Griff, Aus-Griff absolut): Die Anker
// stehen Teil für Teil in der Folge von OrdnungPlan.teile, je Teil in der Folge von Teil.anker. Der erste Anker eines Teils ist die
// Summe der Ankerzahlen (Teil.anker.length) aller Teile davor. Kurvenstücke ebenso: Teil für Teil, je Teil Stück k von Anker k nach
// k + 1; ein geschlossenes Teil hat so viele Stücke wie Anker (das letzte zurück zu Anker 0), ein offenes eines weniger. Geschlossen
// ist eine Fläche und eine Linie mit `linie.offen === false`; eine Linie ohne `linie` ist offen. Gerechnet wird das an einer Stelle:
// `ankerBereiche` in `bauplan/ordnung.ts` (je Neubau aus dem Dokument, weil ein Anker mehr die Ordnung nicht ändert).
//
// Lage einer Figur (`Figur.lage`): Ihre Regler x, y (L) und Drehung (Grad) setzen sie in die Welt,
// p_Welt = (x, y) + D(Drehung) · p / einheitL (p in Figur-Einheiten; D dreht wie in vertrag/welt.ts). `knochenStellen` (Schritt 13)
// stellt sie vor jeden Wurzelknochen der Figur und schreibt sie zusätzlich hinter die Knochen in `matrizen`; `aufhaengen` bildet die
// Anker jedes Teils damit ab, auch die der Teile ohne Aufhängung. So stehen alle Anker in BildStand.anker und alle Strecken in
// BildDaten in der Welt; BildStand.ruhe bleibt in Figur-Einheiten. Fehlt ein Regler der Lage (−1), gilt dort 0.
//
// Ergänzungen M0 gegenüber Plan 4.3 (die Integration trägt sie dort nach): OrdnungPlan.listen; im ReglerPlan raster, spiegelAb,
// spiegelUm, mitSpiegel, mitUm, hinweise; TeilPlan.geschlossen; im KnochenPlan figur, erster und anzahl je Teil (alle Teile),
// figurLage, figurEinheit und die Lage in `matrizen`; AbflachPlan.teile; PhysikPlan.chipStand; LogikPlan.bausteinStand.
import type { DatensatzTyp } from '@ee/studio-format/typen/dokument';
import type { Mischart } from '@ee/studio-format/typen/form';
import type { ArtDaten, Feder, Id, Punkt } from '@ee/studio-format/typen/grund';
import type { Baustein, Draht, Messwert, Regel } from '@ee/studio-format/typen/logik';
import type { Huelle } from '@ee/studio-format/typen/physik';
import type { Taktleiste, Uebergang, ZyklusZeile } from '@ee/studio-format/typen/posen';
import type { Ding } from '@ee/studio-format/typen/welt';
import type { StoffWerte } from './welt';
import type { ZeichenModell } from './zeichenmodell';

export interface Bauplan {
  stand: number;                    // steigt bei jedem Neubau
  ordnung: OrdnungPlan; regler: ReglerPlan; form: FormPlan; knochen: KnochenPlan; abflach: AbflachPlan;
  posen: PosenPlan; physik: PhysikPlan; logik: LogikPlan; zeichen: ZeichenModell;
}

/**
 * Feste Nummern aller Datensätze (`bauplan/ordnung.ts`): je Datensatztyp 0, 1, 2 …; `index` gibt zu jeder Kennung ihre Nummer in
 * ihrem Typ. Teile, Regler und Knochen stehen nach ihrem Besitzer gruppiert (Figuren vor Szenen), darin nach Kennung; so liegen die
 * Anker einer Figur im Puffer beieinander. Die Regel je Typ steht in `bauplan/ordnung.ts`.
 */
export interface OrdnungPlan {
  index: ReadonlyMap<string, number>; figuren: Id<'fig'>[]; teile: Id<'teil'>[]; regler: Id<'rg'>[]; knochen: Id<'kn'>[];
  /** Ergänzung M0: die Kennungen jedes Datensatztyps in Nummernfolge (figuren, teile, regler und knochen sind dieselben Felder) */
  listen: { [T in DatensatzTyp]: Id<T>[] };
}

/**
 * Regler (`bauplan/regler.ts`), je Regler eine Zahl, Bereiche zwei. Ausgleich: federF = 1/dauer (dauer ≤ 0: +∞, sofort),
 * federZeta = 1 − federung (Konzept 6.4). Ohne Höchsttempo steht +∞ dort (Vorsicht: ∞ · 0 ist NaN; ohne Zeit gilt Ist = Soll).
 */
export interface ReglerPlan {
  anzahl: number; bereich: Float64Array; standard: Float64Array; kreis: Uint8Array;
  federF: Float64Array; federZeta: Float64Array; hoechsttempo: Float64Array;
  nachlauf: Float64Array;           // s je Regler (16 b)
  folge: Int32Array;                // Reihenfolge nach Drähten; ein Kreis ist ein Hinweis
  /** Ergänzung M0: Fangraster der Leiste je Regler (`fangen`, 4.7) */
  raster: Float64Array;
  /** Ergänzung M0: gespiegelte Hälfte je Regler mit Spiegelregel (sonst NaN): Kreisregler ab < w < um, Linienregler ab ≤ w < um */
  spiegelAb: Float64Array; spiegelUm: Float64Array;
  /** Ergänzung M0 (`Spiegelregel.regler`, Befund 8): je Regler der Regler, dessen Spiegelregel ihn mitspiegelt (−1: keiner), und das
   *  um seines Mitspiegelns (Wert um − w; sonst NaN). In `folge` kommt der spiegelnde Regler vor dem mitgespiegelten. */
  mitSpiegel: Int32Array; mitUm: Float64Array;
  /** Ergänzung M0: Hinweise dieses Teilplans (Kreis in den Drähten, doppelt mitgespiegelt); sie bleiben, solange er bleibt */
  hinweise: readonly string[];
}

/** je Teil nach OrdnungPlan ein TeilPlan (teile[i].teil = i); ankerZahl: alle Anker des Puffers */
export interface FormPlan { teile: TeilPlan[]; ankerZahl: number }
export interface TeilPlan {
  teil: number; figur: number; erster: number; anzahl: number;   // erster Anker im Puffer (je Anker 6 Zahlen; Regel im Kopf)
  /** Ergänzung M0: geschlossene Kurve (Regel im Kopf), aus `ankerBereiche` */
  geschlossen: boolean;
  glatt: Uint8Array; form: Float64Array | null;                  // glatt je Anker nach der Regel in 3.2 (typen/form.ts); Teil.form
  ansicht: AnsichtPlan | null; zusaetze: ZusatzPlan[];
}
export interface AnsichtPlan {
  regler: number; mischart: Mischart; periodisch: boolean;
  abschnitte: ListenPlan[];         // ohne Übernahme genau einer über den ganzen Bereich
  spiegel: SpiegelPlan | null;      // mit Abschnitten nur für Malreihenfolge, Wechsel und mitgespiegelte Regler (3.2)
  spitzen: SpitzenPlan[];           // je Spitzenführung eine (Ozzy: 45°–90° und gespiegelt 270°–315°)
}
export interface ListenPlan {
  von: number; bis: number; art: 'liste' | 'gespiegelt';
  xs: Float64Array;                 // Stellen der mischenden Schlüssel (ruhende sind schon heraus, form/ruhen.ts)
  groessen: Float64Array;           // je Schlüssel und Anker die Mischgrößen der Mischart
  steigungen: Float64Array;         // PCHIP-Steigungen, vorab
  quelle: number;                   // 'gespiegelt': Index der Bindung, die gespiegelt wird
}
/** zwei Achsen: volles Gitter nach der Feldregel (4.4), fehlende Gitterpunkte ergänzt hier, nie in der Datei */
export interface ZusatzPlan { achsen: [number] | [number, number]; xs: Float64Array; ys: Float64Array | null; versatz: Float64Array; steigungen: Float64Array }

export interface SpiegelPlan { ab: number; um: number; achseX: number; partner: Int32Array; umnummern: (Int32Array | null)[]; reihenfolgeTauschen: boolean }
/** je Spitze u, h; regelBindung: deren Schlüssel die Spitzenregel prüft (gespiegelt: der Partner) */
export interface SpitzenPlan { von: number; bis: number; anker: Int32Array; rahmenVon: Float64Array; rahmenBis: Float64Array; gespiegelt: boolean; regelBindung: number }
/**
 * Knochen (Schritte 11 und 13). `matrizen` (von `knochenStellen` geschrieben, von `aufhaengen` gelesen) hat 6 · (anzahl + Figuren)
 * Zahlen: je Knochen seine 2 × 3-Matrix in der Welt (die Lage der Figur eingerechnet), dahinter je Figur (Index nach OrdnungPlan) die
 * Matrix ihrer Lage (Kopf dieser Datei). BildStand.knochen sind die ersten 6 · anzahl Zahlen.
 */
export interface KnochenPlan {
  anzahl: number; folge: Int32Array;                  // Eltern vor Kindern
  eltern: Int32Array; gelenk: Float64Array;           // 2 Zahlen je Knochen
  winkel: Int32Array; verschiebung: Int32Array;       // Reglerindizes (verschiebung: 2 je Knochen)
  anheftungen: { knochen: number; teil: number; anker: Int32Array; gewichte: Float64Array; mls: Float64Array }[];
  achsen: AchsenPlan[];
  /**
   * je Teil nach OrdnungPlan einer (teile[i].teil = i), mit Figur und seinen Ankern im Puffer (Ergänzung M0: figur, erster, anzahl
   * aus `ankerBereiche`). Ein Teil ohne Aufhängung steht hier mit art 'starr' und knochen = [−1]: Es folgt nur der Lage seiner Figur.
   */
  teile: { teil: number; figur: number; erster: number; anzahl: number; art: 'starr' | 'achse' | 'gewichte'; knochen: Int32Array; gewichte: GewichtePlan | null; griffe: GewichtePlan | null; mischung: 'drehzentren' | 'linear' }[];
  /** Ergänzung M0 (`Figur.lage`): je Figur nach OrdnungPlan die Reglerindizes ihrer Lage x, y, Drehung (3 Zahlen, −1: keiner) */
  figurLage: Int32Array;
  /** Ergänzung M0: je Figur nach OrdnungPlan ihr `einheitL` (Figur-Einheiten je L) */
  figurEinheit: Float64Array;
}   // 'achse': knochen = [Achse, Eltern], gewichte w je Anker (fehlt: 1); Befund 17
/** ankerLage: u je Anker, Projektion auf die Ruheachse; rMin wie in rueckgratBauen */
export interface AchsenPlan { knochen: number; laenge: number; abstand: number; biegungWurzel: number; biegungEnde: number; beugung: 1 | -1; boden: boolean; rMin: number; ankerLage: Float64Array }
/** 4 je Anker; Zentren je Ansichtsschlüssel */
export interface GewichtePlan { knochen: Int32Array; gewicht: Float64Array; zentren: Float64Array }
/** Stückzahl je Kurvenstück (16 k): nach Wang aus dem größten Kontrollpolygon dieses Stücks über alle Schlüssel, mal 1,25 für Knochen
 *  und Zusätze, Toleranz 0,25 Bildpunkte bei der Zoomstufe; Zoomstufen sind Potenzen von 1,25 (`zoomstufe` ist der Exponent, 0 heißt
 *  Maßstab 1); höchstens 64 je Stück; nie je Bild neu. Im Spiel gilt die Stufe des größten Kameramaßstabs der Szene, im Editor die
 *  aktuelle. `stueckzahl` und `ersteStrecke` je Kurvenstück in der Folge aus dem Kopf dieser Datei; `streckenZahl`: Strecken aller
 *  gezeichneten Teile eines Durchgangs (eine Auswertung); Aufbau von `bernstein` und `ersteStrecke` legt `bauplan/abflachen.ts` fest. */
export interface AbflachPlan {
  stueckzahl: Int32Array; bernstein: Float64Array; streckenZahl: number; ersteStrecke: Int32Array; zoomstufe: number;
  /** Ergänzung M0: je Teil nach OrdnungPlan (teile[i] gehört zu Teil i) */
  teile: AbflachTeil[];
}
/**
 * Was Schritt 16 je Teil braucht: seine Anker und Kurvenstücke (`ankerBereiche`) und sein Platz im Zeichenmodell (feldsatz: Index in
 * ZeichenModell.feldsaetze, kanal: 0 bis KANAELE − 1 darin; −1: das Teil wird nicht als Feld gezeichnet, etwa ein gebackenes Ding).
 */
export interface AbflachTeil { erster: number; anzahl: number; geschlossen: boolean; erstesStueck: number; stuecke: number; feldsatz: number; kanal: number }
export interface PosenPlan {
  schichten: { regler: Int32Array; art: 'ersetzen' | 'addieren'; physik: boolean; posen: Int32Array; standard: number }[];   // standard: Übergang 'jede → jede'
  posen: { schicht: number; werte: Float64Array; kreuz: { achse: number; an: number; werte: Float64Array }[]; gewicht: number; verweilen: number }[];
  uebergaenge: { schicht: number; von: number; nach: number; art: Uebergang['art']; feder: Feder; ueber: Int32Array; taktleiste: Taktleiste | null; unterbrechen: Uebergang['unterbrechen'] }[];
  zyklen: { phase: number; antrieb: 'zeit' | 'weg'; frequenz: number; schritt: number; zweite: number; zeilen: ZyklusZeile[] }[];
}
export interface PhysikPlan {
  chips: { art: string; an: number; f: number; zeta: number; ausgang: number; daten: ArtDaten }[];   // je Chip nach OrdnungPlan
  huellen: Huelle[][];                                // je Figur aus ihrem Körpermodell (koerper, glieder; Befund 6)
  welt: { kette: Punkt[]; dinge: { ding: number; rolle: Ding['rolle']; huellen: Huelle[]; stoff: StoffWerte }[]; feld: Float32Array; feldMass: [x0: number, y0: number, zelle: number] } | null;
  /** Ergänzung M0 (vertrag/chip.ts): Stand von Chip i in Lauf.figur von chipStand[i] bis chipStand[i + 1] (Länge nach
   *  `Chipart.standLaenge`); chips.length + 1 Zahlen, die letzte ist die Länge von Lauf.figur */
  chipStand: Int32Array;
}
export interface LogikPlan {
  regeln: Regel[];                                    // nach Band, dann ordnung
  kanaele: string[]; bausteine: Baustein[];           // Kanal '<Ding>.<name>': Reglernamen der Bausteinart, 'pose.<Schicht>', 'zeitfaktor'
  draehte: { quelle: number | Messwert; ziel: number; kennlinie: Float64Array; steigungen: Float64Array; spiegel: Draht['spiegel'] | null; glaetten: number }[];
  folge: Int32Array;                                  // Drähte in der Folge ihres Graphen
  /** Ergänzung M0 (vertrag/baustein.ts): `bausteine` stehen nach OrdnungPlan; Stand von Baustein i in Lauf.bausteine von
   *  bausteinStand[i] bis bausteinStand[i + 1] (Länge nach `Bausteinart.standLaenge`); die letzte Zahl ist die Länge von Lauf.bausteine */
  bausteinStand: Int32Array;
}

// ---------- leere Teilpläne ----------

/** leerer OrdnungPlan: keine Datensätze */
export function leererOrdnungPlan(): OrdnungPlan {
  const listen: OrdnungPlan['listen'] = {
    prj: [], vl: [], kl: [], sf: [], fig: [], teil: [], gr: [], rg: [], bd: [], sl: [], we: [], kn: [], af: [], km: [],
    sch: [], po: [], ue: [], zy: [], ch: [], vb: [], ef: [], kc: [], welt: [], sz: [], di: [], bs: [], dr: [], re: [], au: [],
  };
  return { index: new Map(), figuren: listen.fig, teile: listen.teil, regler: listen.rg, knochen: listen.kn, listen };
}

/** leerer ReglerPlan: keine Regler */
export function leererReglerPlan(): ReglerPlan {
  return {
    anzahl: 0, bereich: new Float64Array(0), standard: new Float64Array(0), kreis: new Uint8Array(0), federF: new Float64Array(0),
    federZeta: new Float64Array(0), hoechsttempo: new Float64Array(0), nachlauf: new Float64Array(0), folge: new Int32Array(0),
    raster: new Float64Array(0), spiegelAb: new Float64Array(0), spiegelUm: new Float64Array(0), mitSpiegel: new Int32Array(0),
    mitUm: new Float64Array(0), hinweise: [],
  };
}

/**
 * Bauplan ohne Inhalt, Stand 0: für Teilpläne, die noch niemand baut (der Zusammenbau setzt sie ein), und für Tests eines einzelnen
 * Teilplans (`{ ...leererBauplan(), form: … }`).
 */
export function leererBauplan(zoomstufe = 0): Bauplan {
  return {
    stand: 0,
    ordnung: leererOrdnungPlan(),
    regler: leererReglerPlan(),
    form: { teile: [], ankerZahl: 0 },
    knochen: {
      anzahl: 0, folge: new Int32Array(0), eltern: new Int32Array(0), gelenk: new Float64Array(0), winkel: new Int32Array(0),
      verschiebung: new Int32Array(0), anheftungen: [], achsen: [], teile: [], figurLage: new Int32Array(0),
      figurEinheit: new Float64Array(0),
    },
    abflach: {
      stueckzahl: new Int32Array(0), bernstein: new Float64Array(0), streckenZahl: 0, ersteStrecke: new Int32Array(0), zoomstufe, teile: [],
    },
    posen: { schichten: [], posen: [], uebergaenge: [], zyklen: [] },
    physik: { chips: [], huellen: [], welt: null, chipStand: Int32Array.of(0) },
    logik: { regeln: [], kanaele: [], bausteine: [], draehte: [], folge: new Int32Array(0), bausteinStand: Int32Array.of(0) },
    zeichen: { teile: [], feldsaetze: [], verbindungen: [], effekte: [], klemmen: [], hinter: [], uniforms: [], gebacken: [] },
  };
}
