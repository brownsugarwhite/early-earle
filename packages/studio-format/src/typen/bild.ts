// Verbindungen und Effekte (Bauplan 3.2). Was ein Effekt an Teilen mit `wieGezeichnet` darf, steht im Register seiner Art (30 d).
import type { ArtDaten, Herkunft, Id, Wert } from './grund';

export interface Verbindung {
  id: Id<'vb'>; figur: Id<'fig'>;
  a: Id<'teil'> | Id<'gr'>; b: Id<'teil'> | Id<'gr'>;
  art: 'verschmelzen' | 'fuge';
  mass: Wert;                            // Stärke der weichen Vereinigung oder Breite der Fuge (Figur-Einheiten)
  nachKante: boolean;                    // Vereinigung nach Kantenrichtung (sminN des Prototyps)
  herkunft: Herkunft;
}
export interface Effekt {
  id: Id<'ef'>; besitzer: Id<'fig'> | Id<'sz'>;
  art: string;                           // Liste in studio-format/src/arten/effekte.ts
  aktiv: boolean;
  wo: (Id<'teil'> | Id<'gr'> | Id<'fig'> | 'welt' | 'kamera')[];   // an Teilen mit `wieGezeichnet` wirkt nur, was `aufGezeichnet`
                                                                    // der Art erlaubt (30 d); Kontakt- und Bodenschatten
                                                                    // sind 'nurFlorian' wie die übrigen Effekte (Befund 9)
  staerke: Wert; weichheit: Wert;
  profil?: [abstand: number, wert: number][];
  rauschen?: { koernung: number; tempo: number };
  zeit?: 'fliessend' | 'gestuft';
  daten: ArtDaten;
  herkunft: Herkunft;
}
