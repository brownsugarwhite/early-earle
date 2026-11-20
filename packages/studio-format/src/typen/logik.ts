// Bausteine, Drähte, Regeln und Aufgaben (Bauplan 3.2): Spiellogik ohne Code.
import type { ArtDaten, Herkunft, Id, Punkt, Wert } from './grund';

export interface Baustein {
  id: Id<'bs'>; art: string; an: Id<'di'>;
  regler: Record<string, Wert>;          // Grundwert jedes Kanals (16 e): eine Regler-Kennung gilt samt Draht und Hand, sonst die Zahl
  posen: Record<string, Id<'po'>>; daten: ArtDaten;
  herkunft: Herkunft;
}
export type Messwert = `${Id<'bs'>}.${string}` | `${Id<'di'>}.${string}`;
export interface Draht {
  id: Id<'dr'>; besitzer: Id<'fig'> | Id<'sz'>;
  quelle: Id<'rg'> | Messwert; ziel: Id<'rg'>;
  kennlinie: [ein: number, aus: number][];   // aufsteigend nach ein, außerhalb festgehalten
  kurve: 'weich' | 'linear';             // weich = PCHIP
  spiegel?: { ab: number; um: number; negieren: boolean };   // gespiegelte Hälfte der Quelle (Kreisregler ab < w < um,
                                                             // Linienregler ab ≤ w < um): Eingabe um − w, Ausgabe negiert (Befund 1)
  glaetten: number;                      // Zeitkonstante in s, 0 = keine
  herkunft: Herkunft;
}
export type Band = 'koerper' | 'regie' | 'spieler' | 'laune' | 'grund';
export type Vergleich = '=' | '!=' | '<' | '<=' | '>' | '>=';
export type Wertquelle = { messwert: Messwert } | { zustand: Id<'bs'> } | { regler: Id<'rg'> } | { zaehler: Id<'bs'> };
export interface Bedingung { links: Wertquelle; vergleich: Vergleich; rechts: number | string; rueckweg?: number }
export type Aktion =
  | { tun: 'pose'; ding: Id<'di'>; pose: Id<'po'>; variante?: string }
  | { tun: 'befehl'; baustein: Id<'bs'>; befehl: string; wert?: number }
  | { tun: 'klang'; klang: Id<'kl'>; lautstaerke?: number | { aus: Messwert } }
  | { tun: 'effekt'; effekt: Id<'ef'>; staerke?: number | { aus: Messwert } }
  | { tun: 'zaehler'; zaehler: Id<'bs'>; plus?: number; setzen?: number }
  | { tun: 'zeitlupe'; faktor: number; dauer: number }
  | { tun: 'kamerastoss'; staerke: number }
  | { tun: 'haptik'; staerke: 'leicht' | 'mittel' | 'stark' }
  | { tun: 'launeBeenden' }
  | { tun: 'zeigen' | 'verbergen'; ding: Id<'di'> }
  | { tun: 'stoss'; ding: Id<'di'>; kraft: Punkt };
interface RegelBasis {
  id: Id<'re'>; szene: Id<'sz'>;
  geltung: { art: string } | { ding: Id<'di'> };   // für eine Ding-Art oder ein einzelnes Ding
  band: Band; ordnung: string; aktiv: boolean;
  herkunft: Herkunft;
}
export interface RegelSobald extends RegelBasis {
  satz: 'sobald'; ereignis: string; falls: Bedingung[]; dann: Aktion[]; hoechstensAlle?: number;
}
export interface RegelSolange extends RegelBasis {
  satz: 'solange'; wenn: Bedingung[]; halte: { kanal: string; wert: number | string }[]; mindestens?: number;   // Kanal '<Ding>.<name>'
}
export interface RegelLaune extends RegelBasis {
  satz: 'laune'; name: string;
  wenn: { ereignis: string } | { chanceJeSekunde: number };
  falls: Bedingung[];
  haeufigkeit: { basis: number; launenRegler?: string };   // Launen-Regler des Vierbeiners: 'neugier', 'mut', 'sturheit', 'energie',
                                                          // 'verfressenheit' („Charakter“ heißen nur die drei Regler der Figur)
  ankuendigung: { pose: Id<'po'>; dauer: number };
  wirkung: { soll: [kanal: string, wert: number | string][]; pose?: Id<'po'>; dauer: [number, number] };
  ende: ({ zeit: 'um' } | { ereignis: string })[];
  danach?: Id<'po'>;
  ruhezeit: number;
}
export type Regel = RegelSobald | RegelSolange | RegelLaune;
export interface Aufgabe {
  id: Id<'au'>; szene: Id<'sz'>; text: string; ordnung: string;
  vorlage: 'mal' | 'ohne' | 'waehrend' | 'vor' | 'erreicht';
  ereignis?: string; anzahl?: number; zustand?: string; bis?: string; messwert?: Messwert; wert?: number;
  beweis?: string;                       // 'laeufe/<name>.json'
  herkunft: Herkunft;
}
