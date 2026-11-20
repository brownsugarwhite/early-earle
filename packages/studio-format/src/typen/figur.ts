// Figur, Teil und Gruppe (Bauplan 3.2). Alles Gezeichnete ist eine Figur; ein Teil ist eine Fläche oder eine Linie aus Ankern.
import type { Form } from './form';
import type { Herkunft, Id, Wert } from './grund';

export interface Figur {
  id: Id<'fig'>; name: string; datei: string;
  einheitL: number;                      // Figur-Einheiten je Körperlänge L
  vorlage?: 'vierbeiner' | 'allgemein';  // Vorlage des Autorigs
  wurzel?: Id<'kn'>;
  lage: { x: Id<'rg'>; y: Id<'rg'>; drehung: Id<'rg'> };
  // Charakter und Spannung sind Regler der Figur mit Rollen (Regler.rolle), kein eigenes Feld (Befund 16 h, i)
  herkunft: Herkunft;
}
export interface Teil {
  id: Id<'teil'>; figur: Id<'fig'>; name: string;
  art: 'flaeche' | 'linie';
  farbe: 'schwarz' | 'weiss' | `#${string}`;
  ebene: string;                         // Bruchindex: Malreihenfolge in Ruhe
  gruppe?: Id<'gr'>;
  anker: Id<'an'>[];                     // Reihenfolge der Anker; jede Formzeile folgt ihr
  form?: Form;                           // Form ohne Ansicht: nur ohne Bindung mit Wirkung 'ansicht' („Grundform“ heißt nur die
                                         // erste Posenkarte, Befund 29)
  wieGezeichnet?: true;                  // Ozzys Teile (Übernahme): Effekte und Chips nur nach `aufGezeichnet` ihrer Art (30 d);
                                         // entfernen darf es nur die Quelle florian
  linie?: { offen: boolean; breite: [t: number, b: number][] };   // art 'linie': Breite längs der Kurve
  klemme?: { traeger: Id<'teil'>; rand: Wert; weich: number };     // Weiß bleibt im Träger
  hinter?: { teil: Id<'teil'>; tiefe: Wert };                       // Weiß liegt hinter diesem Schwarz und tritt weich davor
  partner?: Id<'teil'>;                  // Spiegelpartner
  rolle?: string;                        // Adresse für Regeln und Autorig: 'ohr', 'bein.vorn', 'kopf' (die Seite steht in `seite`)
  seite?: 'links' | 'rechts' | 'mitte';
  vorlageName?: string;                  // Name des Pfads in der Datei (in Illustrator der Name des Objekts)
  herkunft: Herkunft;
}
export interface Gruppe { id: Id<'gr'>; figur: Id<'fig'>; name: string; ordnung: string; herkunft: Herkunft }
