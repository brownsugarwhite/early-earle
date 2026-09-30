import { create } from 'zustand';
import type { GameMode } from '../state/progress';
import { classicSeedFor } from './formats';

/**
 * Klassik-Speicher (localStorage `ee.klassik.v1`), getrennt nach echtem und freiem Stand wie der Fortschritt:
 * Bestwert je Format, gestartete Durchgänge (Seed-Folge) und im Blatt gesehene Freischaltungen. Dazu der
 * flüchtige Zustand der Oberfläche (Blatt offen, „Bestwert!“-Stempel).
 */
export const KLASSIK_KEY = 'ee.klassik.v1';

export interface KlassikSlot {
  /** Bestwert (Punkte) je Format-ID. */
  best: Record<string, number>;
  /** Gestartete Durchgänge je Format-ID. */
  runs: Record<string, number>;
  /** Offene Formate, die der Spieler im Blatt schon gesehen hat (sonst leuchtet der Einstieg). */
  seen: string[];
}

interface PersistedKlassik {
  version: 1;
  slots: Record<GameMode, KlassikSlot>;
}

export const emptyKlassikSlot = (): KlassikSlot => ({ best: {}, runs: {}, seen: [] });

const count = (v: unknown): number => Math.max(0, Math.floor(Number(v) || 0));

function counts(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (raw && typeof raw === 'object') for (const [k, v] of Object.entries(raw)) if (count(v) > 0) out[k] = count(v);
  return out;
}

function sanitizeSlot(raw: unknown): KlassikSlot {
  const s = (raw && typeof raw === 'object' ? raw : {}) as Partial<KlassikSlot>;
  return { best: counts(s.best), runs: counts(s.runs), seen: Array.isArray(s.seen) ? s.seen.filter((x): x is string => typeof x === 'string') : [] };
}

/** Lädt den Klassik-Stand; fehlt er oder ist er kaputt, beginnen beide Stände leer. */
export function loadKlassik(storage: Pick<Storage, 'getItem'> | null): PersistedKlassik {
  const fresh: PersistedKlassik = { version: 1, slots: { real: emptyKlassikSlot(), free: emptyKlassikSlot() } };
  if (!storage) return fresh;
  try {
    const raw = storage.getItem(KLASSIK_KEY);
    if (!raw) return fresh;
    const parsed = JSON.parse(raw) as Partial<PersistedKlassik>;
    if (parsed.version !== 1 || !parsed.slots) return fresh;
    return { version: 1, slots: { real: sanitizeSlot(parsed.slots.real), free: sanitizeSlot(parsed.slots.free) } };
  } catch {
    return fresh;
  }
}

function saveKlassik(p: PersistedKlassik): void {
  try {
    localStorage.setItem(KLASSIK_KEY, JSON.stringify(p));
  } catch {
    /* privater Modus / Speicher voll: gilt dann nur für diese Sitzung */
  }
}

export interface KlassikState {
  slots: Record<GameMode, KlassikSlot>;
  /** Das Format-Blatt auf der Karte ist offen. */
  sheetOpen: boolean;
  /** Zähler des „Bestwert!“-Stempels: jede Erhöhung zeigt ihn einmal. */
  stamp: number;
  openSheet(): void;
  closeSheet(): void;
  toggleSheet(): void;
  bestOf(mode: GameMode, formatId: string): number;
  /** Trägt einen Punktestand ein; `true`, wenn er den Bestwert erhöht hat. */
  submitScore(mode: GameMode, formatId: string, score: number): boolean;
  /** Startet den nächsten Durchgang eines Formats: zählt ihn und liefert dessen Seed-Basis. */
  nextRun(mode: GameMode, formatId: string): number;
  /** Merkt offene Formate als gesehen. */
  markSeen(mode: GameMode, formatIds: string[]): void;
  showStamp(): void;
  /** Nur für Tests/Werkstatt: beide Stände leeren. */
  resetAll(): void;
}

export const useKlassik = create<KlassikState>((set, get) => {
  const initial = loadKlassik(typeof localStorage !== 'undefined' ? localStorage : null);
  const write = (mode: GameMode, fn: (slot: KlassikSlot) => KlassikSlot) => {
    const slots = { ...get().slots, [mode]: fn(get().slots[mode]) };
    set({ slots });
    saveKlassik({ version: 1, slots });
  };
  return {
    slots: initial.slots,
    sheetOpen: false,
    stamp: 0,
    openSheet: () => set({ sheetOpen: true }),
    closeSheet: () => {
      if (get().sheetOpen) set({ sheetOpen: false });
    },
    toggleSheet: () => set({ sheetOpen: !get().sheetOpen }),
    bestOf: (mode, formatId) => get().slots[mode].best[formatId] ?? 0,
    submitScore: (mode, formatId, score) => {
      if (score <= get().bestOf(mode, formatId)) return false;
      write(mode, (slot) => ({ ...slot, best: { ...slot.best, [formatId]: score } }));
      return true;
    },
    nextRun: (mode, formatId) => {
      const run = get().slots[mode].runs[formatId] ?? 0;
      write(mode, (slot) => ({ ...slot, runs: { ...slot.runs, [formatId]: run + 1 } }));
      return classicSeedFor(formatId, run);
    },
    markSeen: (mode, formatIds) => {
      const seen = get().slots[mode].seen;
      const fresh = formatIds.filter((id) => !seen.includes(id));
      if (fresh.length === 0) return;
      write(mode, (slot) => ({ ...slot, seen: [...slot.seen, ...fresh] }));
    },
    showStamp: () => set({ stamp: get().stamp + 1 }),
    resetAll: () => {
      const slots = { real: emptyKlassikSlot(), free: emptyKlassikSlot() };
      set({ slots, sheetOpen: false });
      saveKlassik({ version: 1, slots });
    },
  };
});
