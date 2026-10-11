// Brücke zwischen Renderer und Electron-Hauptprozess (window.editorApi, per preload bereitgestellt).
// Im Web-Modus fehlt sie; dann speichert der Editor im localStorage (siehe speicher.ts).

export type BibliothekEintrag = {
  /** Dateiname ohne Endung, eindeutig im Bibliotheksordner */
  datei: string;
  name: string;
  /** Vorschau als data:-URL (PNG) */
  vorschau: string | null;
  geaendert: number;
};

export type SpeicherAuftrag = {
  /** vorhandene Datei überschreiben; null legt eine neue an */
  datei: string | null;
  name: string;
  json: string;
  vorschau: string | null;
};

export type MenueBefehl = 'neu' | 'speichern' | 'rueckgaengig' | 'wiederholen' | 'library' | 'maximieren' | 'ansicht-zuruecksetzen';

export interface EditorApi {
  bibliothekListe(): Promise<BibliothekEintrag[]>;
  bibliothekSpeichern(auftrag: SpeicherAuftrag): Promise<{ datei: string }>;
  bibliothekLaden(datei: string): Promise<string>;
  bibliothekZeigen(): Promise<void>;
  aufMenue(fn: (befehl: MenueBefehl) => void): () => void;
}
