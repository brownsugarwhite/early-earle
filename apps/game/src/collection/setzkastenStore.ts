import { create } from 'zustand';
import type { ZoneId } from '@ee/genome';

/** Was die Karte zu einem angetippten Fach zeigt. */
export interface CreatureCard {
  key: string;
  zone: ZoneId;
  tier: number;
  species: string;
  /** Erspielt (sonst Silhouette: noch nicht gefunden). */
  earned: boolean;
  /** Globale Levelnummer des ersten Fundes. */
  level: number | null;
  /** Anteil der Linien mit diesem Aussehen (Seltenheit). */
  p: number;
}

/**
 * Zustand des Setzkastens zwischen DOM-Schicht (Kopf, Reiter, Karte) und 3D-Szene: welche Zone aufgeschlagen ist,
 * welches Fach angetippt wurde, ob die Szene schon zeichnet.
 */
export interface SetzkastenState {
  /** Die DOM-Schicht ist offen (auch während die Szene noch montiert). */
  open: boolean;
  /** Die 3D-Szene zeichnet (erstes Bild fertig): der deckende Hintergrund der DOM-Schicht darf weg. */
  ready: boolean;
  /** Schließt gerade (Animation). */
  closing: boolean;
  zone: ZoneId;
  card: CreatureCard | null;
  setOpen(open: boolean): void;
  setReady(ready: boolean): void;
  setClosing(closing: boolean): void;
  setZone(zone: ZoneId): void;
  setCard(card: CreatureCard | null): void;
}

export const useSetzkasten = create<SetzkastenState>((set) => ({
  open: false,
  ready: false,
  closing: false,
  zone: 'tjorizo',
  card: null,
  setOpen: (open) => set({ open }),
  setReady: (ready) => set({ ready }),
  setClosing: (closing) => set({ closing }),
  setZone: (zone) => set({ zone, card: null }),
  setCard: (card) => set({ card }),
}));
