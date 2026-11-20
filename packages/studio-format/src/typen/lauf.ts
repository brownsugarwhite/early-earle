// Lauf-Dateien (Bauplan 3.2): Beweise, Merker und Fehlerberichte unter laeufe/<name>.json; keine Datensätze.
import type { Id, Punkt } from './grund';

export interface LaufDatei {
  format: 'studio-lauf'; version: 1;
  szene: Id<'sz'>; inhalt: string;       // Revision des Projekts beim Aufnehmen
  saat: number; takte: number;
  eingaben: EingabeEintrag[];            // nur Änderungen, mit Taktnummer
  pruefsummen: [takt: number, summe: number][];   // alle 60 Takte
  merker: { takt: number; notiz: string }[];
}
export interface EingabeEintrag { takt: number; finger?: { an: boolean; x: number; y: number }; tippen?: Punkt; knopf?: string }
