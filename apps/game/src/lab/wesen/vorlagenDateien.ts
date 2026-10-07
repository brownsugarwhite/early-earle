import { create } from 'zustand';
import { ladeVorlagenDateien, type VorlagenDatei } from './content';

/** Liste der gespeicherten Vorlagen (content/creatures/vorlagen) für Auswahl und Blättern; lädt beim Start und nach dem Sichern. */
export interface VorlagenDateienState {
  dateien: VorlagenDatei[];
  /** null = noch nicht gefragt; true = Mac hat geantwortet. */
  online: boolean | null;
  laedt: boolean;
  laden: () => Promise<void>;
}

let lauf = 0;

export const useVorlagenDateien = create<VorlagenDateienState>((set) => ({
  dateien: [],
  online: null,
  laedt: false,
  laden: async () => {
    const id = ++lauf;
    set({ laedt: true });
    try {
      const r = await ladeVorlagenDateien();
      if (id === lauf) set({ dateien: r.dateien, online: r.online });
    } finally {
      if (id === lauf) set({ laedt: false });
    }
  },
}));
