// Entwurf einer Transaktion (Bauplan 3.2): vom Store erfüllt, von Handgriffen benutzt.
import type { Datensatz, DatensatzTabelle, DatensatzTyp } from './dokument';
import type { Id, Vorsilbe } from './grund';

export interface Entwurf {
  hole<T extends DatensatzTyp>(id: Id<T>): DatensatzTabelle[T] | undefined;
  alle<T extends DatensatzTyp>(typ: T): readonly DatensatzTabelle[T][];
  setze(d: Datensatz): void;             // neu oder ersetzen, immer ein neues Objekt
  loesche(id: string): void;
  kennung<V extends Vorsilbe>(v: V): Id<V>;   // aus dem Zufall, den der Store bekommt (3.3)
  ziel(id: string): void;                // der Datensatz, auf den die Geste zielt: bei Quelle florian bekommt nur er „dein“ (3.6 Nr. 10)
}
