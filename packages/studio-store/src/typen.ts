// Schnittstelle des Stores (Bauplan 4.1; 3.6 Nr. 9 bis 11; Befund 3, 21, 30 a; F5), nur Typen. Der Store hält das Dokument als
// unveränderliche Datensätze, ändert es nur in Transaktionen mit einer Quelle und gibt jede Änderung als Diff weiter. Zufall und
// Prüfung bekommt er übergeben (Befund 15, 30 a): Er importiert weder einen globalen Zufall noch pruefen.ts.
//
// M1.5 erfüllt den Vertrag: `class Store implements StoreVertrag` mit dem Konstruktor aus `StoreKonstruktor` (store.ts),
// `diffVon` als `DiffVon` (diff.ts), `schutzVerletzt` als `SchutzVerletzt` (schutz.ts); dazu verlauf.ts und zusammenfuehren.ts.
//
// Regeln, die hier keinen eigenen Typ haben:
// - Herkunftsregel (3.6 Nr. 10, Befund 3): Bei der Quelle florian bekommt genau der Datensatz Herkunft 'dein', auf den die Geste zielt
//   (`Entwurf.ziel`); Folgeänderungen derselben Geste (neue Zeile in jedem Schlüssel, Kennungen, Reihenfolge-Indizes) behalten ihre
//   Herkunft. Nur die Quelle florian legt Datensätze 'dein' an.
// - Schutzregel (3.6 Nr. 9, Befund 21, 30 d): Datensätze 'dein', gepinnte Werte und `Teil.wieGezeichnet` ändert und löscht nur die
//   Quelle florian, ebenso Effekte und Chips einer Art mit `aufGezeichnet: 'nurFlorian'` an Teilen mit `wieGezeichnet`. Bindungen einer
//   fremden Quelle (`Projekt.quellen`) und ihre Schlüssel sind bis zum Umzug nur zum Ansehen: weder florian noch sitzung ändert sie;
//   nur die Übernahme (automatik) schreibt dort ihre gebauten Schlüssel neu. `Projekt` wird feldweise geschützt und zusammengeführt
//   (3.2). Das schützt gegen Versehen, nicht gegen Absicht; gegen alles andere hilft der Sicherungsring.
// - Verlauf (4.1): Eine Geste ist ein Schritt; Tastenschübe innerhalb von 500 ms sind ein Schritt; die Auswahl reist mit; Abgeleitetes
//   (Lauf, Stelle, Kamera) kommt nie in den Verlauf, fremde Transaktionen nie in Florians Verlauf; Grenze 500 Einträge oder 50 MB.
// - Zusammenführen (F5): je Datensatz; seit dem letzten Speichern beidseitig geändert gewinnt der lokale Stand, die fremde Fassung
//   kommt als verdrängt zurück (die Ablage legt sie unter „Fassungen“ ab, 4.9).
import type { Datensatz, DatensatzTabelle, DatensatzTyp, Diff, Dokument, Fehler } from '@ee/studio-format/typen/dokument';
import type { Entwurf } from '@ee/studio-format/typen/entwurf';
import type { Id } from '@ee/studio-format/typen/grund';

/**
 * Wer ändert: 'florian' vergibt nur der Server mit STUDIO_FLORIAN=1 gegen einen gültigen Sitzungsschlüssel (3.6 Nr. 9, 4.9);
 * 'automatik' sind Übernahme und Skripte über die Ablage; 'sitzung' der Editor ohne diese Freigabe (Bau- und Probe-Server);
 * 'migration' das Laden älterer Dateien.
 */
export type Quelle = 'florian' | 'automatik' | 'sitzung' | 'migration';

/** liegt im Format (3.2), weil Laufzeit und Spiel ihn ohne Store nehmen */
export type { Diff } from '@ee/studio-format/typen/dokument';

/** Auswahl im Editor; sie reist mit jedem Schritt des Verlaufs mit. `anker`: Teil und Stelle des Ankers in `Teil.anker` */
export interface Auswahl { figur?: Id<'fig'>; teile: Id<'teil'>[]; anker: [Id<'teil'>, number][] }

/** eine angenommene Änderung; `nummer` steigt je Store, `geste` ist die Marke aus `gesteBeginnen` */
export interface Transaktion { nummer: number; quelle: Quelle; diff: Diff; geste?: number; auswahlVor?: Auswahl; auswahlNach?: Auswahl }

/**
 * eine abgelehnte Änderung; der Store bleibt, wie er war. 'schutz': Schutzregel (Datensätze 'dein', gepinnt, wieGezeichnet,
 * „nurFlorian“, Bindungen einer Quelle); 'quelle': diese Quelle darf das nicht (etwa Datensätze 'dein' anlegen ohne florian);
 * 'ungueltig': die übergebene Prüfung meldet Fehler. `kennungen`: die betroffenen Datensätze
 */
export interface Abgelehnt { abgelehnt: true; grund: 'schutz' | 'quelle' | 'ungueltig'; kennungen: string[]; text: string }

/** Journal je Gerät (IndexedDB, 4.9): nicht gespeicherte Transaktionen überstehen ein Neuladen */
export interface JournalAblage {
  schreiben(t: Transaktion): Promise<void>;
  lesen(): Promise<Transaktion[]>;
  leeren(bis: number): Promise<void>;
}

/** Meldung der übergebenen Prüfung; der Typ liegt im Format (4.1), pruefen.ts aus M1.2 liefert ihn, der Store reicht ihn weiter */
export type { Fehler } from '@ee/studio-format/typen/dokument';

export interface StoreOptionen {
  /** füllt `aus` mit Zufallszahlen für neue Kennungen (`kennungAusZahlen`): Editor und Server crypto.getRandomValues, Tests ein Strom
   *  mit Saat (30 a); der Store prüft Kollisionen */
  zufall: (aus: Uint32Array) => void;
  /** Querregeln aus 3.6 nach jeder Transaktion, übergeben, nicht importiert (Befund 15) */
  pruefen: (dok: Dokument) => Fehler[];
  /** Einträge im Verlauf, Standard 500 (dazu höchstens 50 MB) */
  verlaufGrenze?: number;
  journal?: JournalAblage;
}

/** öffentliche Seite der Klasse `Store` (store.ts, M1.5) */
export interface StoreVertrag {
  get<T extends DatensatzTyp>(id: Id<T>): DatensatzTabelle[T] | undefined;
  alle<T extends DatensatzTyp>(typ: T): readonly DatensatzTabelle[T][];
  dokument(): Dokument;
  /** eine Transaktion: `tun` ändert über den Entwurf; Herkunftsregel über `Entwurf.ziel`, Schutzregel und Prüfung danach */
  aendern(quelle: Quelle, tun: (e: Entwurf) => void, auswahl?: Auswahl): Transaktion | Abgelehnt;
  /** alle Transaktionen bis gesteBeenden sind ein Schritt */
  gesteBeginnen(auswahl?: Auswahl): number;
  gesteBeenden(marke: number, auswahl?: Auswahl): void;
  /** setzt auf den Stand vor der Geste zurück */
  gesteAbbrechen(marke: number): void;
  zurueck(): Transaktion | null;
  wieder(): Transaktion | null;
  /** F5: je Datensatz die geänderte Seite; seit dem letzten Speichern beidseitig geändert: der lokale Stand gewinnt (er schreibt
   *  später), die fremde Fassung kommt in `verdraengt` zurück. Fremde Transaktionen kommen nie in Florians Verlauf. */
  fremdUebernehmen(d: Diff, quelle: Exclude<Quelle, 'florian'>): { uebernommen: Diff; verdraengt: Datensatz[] };
  /** Kennungen, die seit dem letzten Speichern geändert sind */
  ungespeichert(): ReadonlySet<string>;
  gespeichert(ids: Iterable<string>): void;
  /** gibt die Abmeldung zurück */
  abonnieren(h: (t: Transaktion) => void): () => void;
}

/** Konstruktor der Klasse `Store`: `new Store(dok, { zufall, pruefen })` */
export type StoreKonstruktor = new (dok: Dokument, o: StoreOptionen) => StoreVertrag;

/** Diff zwischen zwei Ständen, je Datensatz (diff.ts) */
export type DiffVon = (vorher: ReadonlyMap<string, Datensatz>, nachher: ReadonlyMap<string, Datensatz>) => Diff;

/** Kennungen, deren Änderung die Schutzregel verletzt (3.6 Nr. 9 samt Quellen und wieGezeichnet); leer: erlaubt (schutz.ts) */
export type SchutzVerletzt = (quelle: Quelle, d: Diff, dok: Dokument) => string[];
