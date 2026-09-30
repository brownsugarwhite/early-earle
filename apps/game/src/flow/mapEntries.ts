import { create } from 'zustand';

/**
 * Einstiege auf der Karte (Iteration 4): Setzkasten und Klassik melden sich hier an, FlowHud zeigt dafür einen
 * Knopf im Web und eine runde Pille im nativen Glas-HUD. So müssen die Baustellen FlowHud nicht anfassen.
 */
export interface MapEntry {
  /** Aktions-ID (auch die ID der nativen Pille), z. B. 'collection' oder 'classic'. */
  id: string;
  /** Beschriftung (VoiceOver, Web-Tooltip). */
  label: string;
  /** SF Symbol der nativen Pille. */
  icon: string;
  /** Kurzes Zeichen für den Web-Knopf. */
  glyph: string;
  /** Reihenfolge in der Aktionszeile (kleiner = weiter links). */
  order?: number;
  open(): void;
  /** Hervorheben (Akzent-Tönung), z. B. solange es ungesehene Wesen gibt. */
  highlight?: boolean;
}

interface MapEntriesState {
  entries: MapEntry[];
  register(entry: MapEntry): () => void;
  /** Aktualisiert Felder eines Eintrags (z. B. `highlight`). */
  patch(id: string, patch: Partial<MapEntry>): void;
}

const sorted = (entries: MapEntry[]) => [...entries].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

export const useMapEntries = create<MapEntriesState>((set, get) => ({
  entries: [],
  register: (entry) => {
    set({ entries: sorted([...get().entries.filter((e) => e.id !== entry.id), entry]) });
    return () => set({ entries: get().entries.filter((e) => e !== entry) });
  },
  patch: (id, patch) => set({ entries: get().entries.map((e) => (e.id === id ? { ...e, ...patch } : e)) }),
}));

export function mapEntry(id: string): MapEntry | undefined {
  return useMapEntries.getState().entries.find((e) => e.id === id);
}
