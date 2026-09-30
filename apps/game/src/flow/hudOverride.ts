import { create } from 'zustand';

/**
 * Überschreibt Texte der HUD-Pille im Level, solange ein anderer Spielmodus läuft (Klassik: Punkte statt Züge,
 * Bestwert statt Ziele). `null` = normales Level-HUD. Gilt für das Web-HUD und das native Glas-HUD.
 */
export interface HudOverride {
  title?: string;
  subtitle?: string;
  /** Große Zahl rechts (statt der übrigen Züge). */
  moves?: string;
  /** Beschriftung der großen Zahl (statt "Züge"). */
  movesLabel?: string;
  /** Ersetzt die Ziel-Chips (leer = keine). */
  goals?: Array<{ text: string; done: boolean }>;
  /** Text des Banners, wenn der Versuch vorbei ist (statt "Verloren."). */
  lostText?: string;
}

interface HudOverrideState {
  override: HudOverride | null;
  set(override: HudOverride | null): void;
}

export const useHudOverride = create<HudOverrideState>((set) => ({
  override: null,
  set: (override) => set({ override }),
}));
