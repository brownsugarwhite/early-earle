// Klang-Chips (Bauplan 3.2): ein Klang an einem Teil, einer Figur, einem Ding oder einem Übergang.
import type { Herkunft, Id, Wert } from './grund';

export interface KlangChip {
  id: Id<'kc'>; an: Id<'teil'> | Id<'fig'> | Id<'di'> | Id<'ue'>;
  klang: Id<'kl'>;
  ausloeser: { marke: string } | { kontakt: { mindest: number } } | { zustand: string } | { draht: Id<'dr'> };
  lautstaerke: Wert | { aus: string };
  aktiv: boolean;
  herkunft: Herkunft;
}
