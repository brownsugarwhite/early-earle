// Welt, Stoffe, Szenen und Dinge (Bauplan 3.2). Ein Ding stellt eine Figur mit einer Rolle in eine Welt; jedes Ding hat eine (16 d).
import type { Feder, Herkunft, Id, Wert } from './grund';

export interface Welt {
  id: Id<'welt'>; name: string;
  schwerkraft: number;                   // L/s²
  huegel: Id<'fig'>;                     // Figur, deren Fläche der Weltpfad ist
  rad: { radius: number; gewicht: number | 'boden'; lagerreibung: number; griff: { feder: Feder; hoechstkraft: number } };
  stoffe: Stoff[];
  standardStoff: string;
  herkunft: Herkunft;
}
export interface Stoff { name: string; haftung: Wert; rollwiderstand: number; abprall: number }
export interface Szene {
  id: Id<'sz'>; name: string; datei: string;
  welt: Id<'welt'>; saat: number;
  rahmen?: Id<'di'>; kamera?: Id<'di'>; musik?: Id<'di'>;
  herkunft: Herkunft;
}
export interface Ding {
  id: Id<'di'>; szene: Id<'sz'>; name: string;
  figur: Id<'fig'>;                      // Pflicht (16 d): Rahmen, Kamera und Musik sind Figuren ohne Teile (Regler, Schichten,
                                         // Posen, Übergänge); die Uhr ist ein Baustein am Ding des Rahmens
  art?: string;                          // Ding-Art für Regeln: 'duftstelle', 'pfuetze', 'stamm'
  rolle: 'figur' | 'fest' | 'lose' | 'zone' | 'bild' | 'rahmen';
  lage: { winkel: number; hoehe: number; drehung: number };   // auf dem Hügel: Grad vom Körbchen, L über dem Rand
  breite?: number;                       // Zone: Bogen in Grad
  stoff?: string;
  ebene: string;
  herkunft: Herkunft;
}
