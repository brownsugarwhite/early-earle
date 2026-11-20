// Schichten, Posen, Übergänge mit Taktleiste und Zyklen (Bauplan 3.2). Spannung ist ein Regler der Figur (16 h).
import type { ArtDaten, Feder, Herkunft, Id, Kurve } from './grund';

export interface Schicht {
  id: Id<'sch'>; figur: Id<'fig'>; name: string; ordnung: string;
  art: 'ersetzen' | 'addieren';
  regler: Id<'rg'>[];                    // Maske: diese Regler stellt die Schicht
  physik: boolean;                       // Schicht Physik: immer oben, nie posiert
  herkunft: Herkunft;
}
export interface Pose {
  id: Id<'po'>; schicht: Id<'sch'>; name: string; ordnung: string;
  gruppe?: string;                       // Gruppe der Posen-Reihe: 'stehen', 'gang', 'sprung', 'panne', 'erholung', 'laune'
  grundform?: true;                      // die erste Posenkarte
  in?: Id<'ue'>;                         // Zwischenpose eines gestalteten Übergangs
  werte: [Id<'rg'>, number][];           // sortiert nach Kennung
  kreuz?: { achse: Id<'rg'>; an: number; werte: [Id<'rg'>, number][] }[];   // Werte, die von einem anderen Regler abhängen
  gewicht: Id<'rg'>;                     // Gewicht dieser Pose (Posenkorrekturen hängen daran)
  verweilen?: Id<'zy'>;
  // Spannung ist ein Regler der Figur (Rolle 'spannung'); eine Pose setzt sie über `werte` (16 h)
  herkunft: Herkunft;
}
export interface Uebergang {
  id: Id<'ue'>; schicht: Id<'sch'>;
  von: Id<'po'> | 'jede'; nach: Id<'po'> | 'jede';   // 'jede → jede' trägt den Standard der Schicht (0,7 s, 0 %; die Schicht
                                                      // legt ihn beim Anlegen an); Vorrang 4.4
  art: 'standard' | 'ueber' | 'gestaltet' | 'gesperrt' | 'regie';
  feder?: Feder;                         // Standard je Paar
  ueber?: Id<'po'>[];
  variante?: { name: string; gewicht: number };
  unterbrechen: 'sofort' | 'halt' | 'nie';
  umkehrbar: boolean;
  nachklang: number;                     // Sekunden, in denen Zusatzbewegungen ausklingen
  takt?: Taktleiste;                     // 'gestaltet' und 'regie'
  herkunft: Herkunft;
}
export interface Taktleiste {
  abschnitte: TaktAbschnitt[];
  zusatz: Zusatzbewegung[];
  steht: StehBalken[];
  marken: Marke[];
  spuren: Spur[];                        // jeder gestaltete Übergang und Regie: Spuren beliebiger Regler, auch der Spannung (16 h)
}
export interface TaktAbschnitt { nach: Id<'po'>; dauer: number | { bis: string; hoechstens: number }; kurve: Kurve }
export interface Zusatzbewegung { art: string; von: number; bis: number; staerke: number | { aus: string }; daten: ArtDaten }
export interface StehBalken { rolle: string; von: number; bis: number }   // 'pfoten.hinten', 'pfoten.alle', 'hintern'
export interface Marke { bei: number; ereignis: string; klang?: Id<'kl'>; chance?: number }
export interface Spur { regler: Id<'rg'>; punkte: [zeit: number, wert: number, kurve: Kurve][] }
export interface Zyklus {
  id: Id<'zy'>; figur: Id<'fig'>; name: string;
  phase: Id<'rg'>;                       // Kreisregler 0 bis 1
  antrieb: 'zeit' | 'weg';
  frequenz?: number;                     // Hz bei Antrieb Zeit
  schritt?: number;                      // L je Umlauf bei Antrieb Weg
  zweite?: Id<'rg'>;                     // zweite Achse eines Felds (Gang: Tempo)
  zeilen: ZyklusZeile[];
  herkunft: Herkunft;
}
export interface ZyklusZeile {
  an: number;                            // Stelle auf der zweiten Achse (ohne zweite Achse: 0)
  posen: { bei: number; pose: Id<'po'> }[];
  kontakte: { rolle: string; von: number; bis: number }[];
}
