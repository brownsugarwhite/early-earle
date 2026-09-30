import { create } from 'zustand';
import { bus } from './bus';

/**
 * Spielfortschritt, lokal gespeichert (localStorage; im WKWebView der App bleibt er über Neustarts erhalten).
 * Später: Sync über Firebase (Plan §8), Capacitor Preferences als robustere Ablage.
 *
 * Zwei getrennte Stände: **echt** (wie im fertigen Spiel: gesperrte Level, Tutorial, begrenztes Scrollen) und
 * **frei** (Entwicklung: jede Stelle der Welt, jedes Level). Beide zählen Versuche, Siege und Sammlung für sich.
 * Die Felder `reached`, `current`, `levels`, `collection` und `seen` spiegeln immer den aktiven Stand, damit
 * bestehende Selektoren weiter funktionieren.
 *
 * - `reached`: höchster freigeschalteter Knoten (0-basiert, = globale Levelnummer − 1)
 * - `current`: zuletzt gewählter Knoten (Kamera/Held starten dort)
 * - `levels[id]`: Bestwerte pro Level
 * - `collection[key]`: erspielte Wesen, Schlüssel = Aussehen `${zone}:${tier}:${species}`
 */
export type GameMode = 'real' | 'free';

export interface LevelRecord {
  /** Anzahl Siege. */
  wins: number;
  /** Anzahl Versuche insgesamt (Start eines Levels). */
  attempts: number;
  /** Bester Punktestand. */
  bestScore: number;
  /** Meiste übrige Züge bei einem Sieg. */
  bestMovesLeft: number;
}

/** Ein erspieltes Wesen: für den Setzkasten, die Map und Klassik (bestes Wesen je Stufe). */
export interface CollectionEntry {
  /** `${zone}:${tier}:${species}` */
  key: string;
  /** Genom-Zone, die das Aussehen bestimmt (tjorizo | syrup | luzz | wooding). */
  zone: string;
  tier: number;
  /** blob | snake | retriever | mouse | giraffe | rex | duck | elephant */
  species: string;
  /** blob | snake | quadruped | biped | heavy */
  bodyType: string;
  /** Genom-Seed des ersten Fundes: reproduziert das Aussehen (mit erzwungener Art). */
  seed: number;
  /** Level und Knoten des ersten Fundes (Wohnort auf der Map). */
  levelId: string;
  node: number;
  /** Zeitpunkt des ersten Fundes (ms seit Epoche). */
  at: number;
  /** Wie oft dieses Wesen erschaffen wurde. */
  count: number;
  /** Im Setzkasten angesehen. */
  seen: boolean;
  /** Wohnt schon auf der Map. */
  placedOnMap: boolean;
}

/** Was die Erkennung eines neuen Wesens liefert (der Rest wird ergänzt). */
export type CollectInput = Pick<CollectionEntry, 'zone' | 'tier' | 'species' | 'bodyType' | 'seed' | 'levelId' | 'node'>;

export interface SlotSeen {
  /** Intro (Splash → Level 1) wurde gespielt. */
  intro: boolean;
  /** Gesehene REX-Szenen (z. B. 'afterLevel1'). */
  stories: string[];
}

export interface Slot {
  reached: number;
  current: number;
  levels: Record<string, LevelRecord>;
  collection: Record<string, CollectionEntry>;
  seen: SlotSeen;
}

interface PersistedV2 {
  version: 2;
  mode: GameMode;
  slots: Record<GameMode, Slot>;
}

export interface ProgressState extends Slot {
  mode: GameMode;
  slots: Record<GameMode, Slot>;
  /** Anzahl abgeschlossener Level (für Wachstum und Statistik). */
  completedCount: () => number;
  /** Anzahl Wesen, die im Setzkasten noch nicht angesehen wurden. */
  unseenCount: () => number;
  recordAttempt: (levelId: string) => void;
  recordWin: (levelId: string, node: number, score: number, movesLeft: number, nodeCount: number) => void;
  setCurrent: (node: number) => void;
  setMode: (mode: GameMode) => void;
  /** Trägt ein erschaffenes Wesen ein; `isNew`, wenn es das erste seiner Art (Zone, Stufe, Art) ist. */
  recordCollect: (input: CollectInput) => { isNew: boolean; entry: CollectionEntry };
  /** Das Wesen wohnt jetzt auf der Map. */
  markPlaced: (key: string) => void;
  /** Im Setzkasten angesehen (ohne Schlüssel: alle). */
  markSeen: (keys?: string[]) => void;
  markIntroSeen: () => void;
  markStorySeen: (id: string) => void;
  /** Nur für Entwicklung/Werkstatt: Stand zurücksetzen (ohne Angabe: der aktive). */
  resetSlot: (mode?: GameMode) => void;
  /** Nur für Entwicklung/Werkstatt: alles bis Knoten `node` freischalten (setzt `current` dorthin). */
  unlockTo: (node: number) => void;
  /** Nur für Entwicklung/Werkstatt: Sammlung füllen (z. B. mit dem ganzen Katalog). */
  fillCollection: (inputs: CollectInput[]) => void;
  /** Nur für Entwicklung/Werkstatt: Sammlung leeren. */
  clearCollection: () => void;
  /**
   * Nur für Entwicklung/Werkstatt („Intro nochmal“): im echten Stand Intro und die genannten REX-Szenen wieder
   * ungesehen, Siege von Level `firstLevelId` auf 0 (Versuche und Bestwerte bleiben).
   */
  resetIntro: (firstLevelId: string, stories?: string[]) => void;
  /** Nur für Entwicklung/Tests: setzt den aktiven Stand zurück (wie `resetSlot()`). */
  resetAll: () => void;
}

export const PROGRESS_KEY = 'ee.progress.v2';
const LEGACY_KEY = 'ee.progress.v1';

export const emptySlot = (): Slot => ({ reached: 0, current: 0, levels: {}, collection: {}, seen: { intro: false, stories: [] } });
const emptyRecord = (): LevelRecord => ({ wins: 0, attempts: 0, bestScore: 0, bestMovesLeft: 0 });
export const collectionKey = (zone: string, tier: number, species: string): string => `${zone}:${tier}:${species}`;

const num = (v: unknown): number => Math.max(0, Math.floor(Number(v) || 0));

function sanitizeSlot(raw: unknown): Slot {
  const s = (raw && typeof raw === 'object' ? raw : {}) as Partial<Slot>;
  const seen = (s.seen && typeof s.seen === 'object' ? s.seen : {}) as Partial<SlotSeen>;
  return {
    reached: num(s.reached),
    current: num(s.current),
    levels: s.levels && typeof s.levels === 'object' ? s.levels : {},
    collection: s.collection && typeof s.collection === 'object' ? s.collection : {},
    seen: { intro: seen.intro === true, stories: Array.isArray(seen.stories) ? seen.stories.filter((x) => typeof x === 'string') : [] },
  };
}

/**
 * Lädt v2; fehlt v2, wird ein v1-Stand (bisheriger Entwicklungsstand) einmalig in den freien Stand übernommen.
 * Neue Installationen und übernommene Stände starten im echten Modus (so erscheint nach dem Update das Intro).
 * v1 wird nie gelöscht (Rückweg und alte Testdaten bleiben lesbar).
 */
export function loadProgress(storage: Pick<Storage, 'getItem'> | null): PersistedV2 {
  const fresh: PersistedV2 = { version: 2, mode: 'real', slots: { real: emptySlot(), free: emptySlot() } };
  if (!storage) return fresh;
  try {
    const raw = storage.getItem(PROGRESS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedV2>;
      if (parsed.version === 2 && parsed.slots) {
        return {
          version: 2,
          mode: parsed.mode === 'free' ? 'free' : 'real',
          slots: { real: sanitizeSlot(parsed.slots.real), free: sanitizeSlot(parsed.slots.free) },
        };
      }
    }
    const legacy = storage.getItem(LEGACY_KEY);
    if (legacy) {
      const v1 = JSON.parse(legacy) as { version?: number; reached?: number; current?: number; levels?: Record<string, LevelRecord> };
      if (v1.version === 1) {
        // Der Entwicklungsstand bekam nie ein Intro zu sehen, in Level 1 ist man dort längst gewesen.
        const free = sanitizeSlot({ reached: v1.reached, current: v1.current, levels: v1.levels, seen: { intro: true, stories: [] } });
        return { ...fresh, slots: { real: emptySlot(), free } };
      }
    }
  } catch {
    /* kaputter Eintrag: frisch beginnen */
  }
  return fresh;
}

function saveProgress(p: PersistedV2): void {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
  } catch {
    /* privater Modus / Speicher voll: Fortschritt gilt dann nur für diese Sitzung */
  }
}

const mirror = (slot: Slot): Slot => ({
  reached: slot.reached,
  current: slot.current,
  levels: slot.levels,
  collection: slot.collection,
  seen: slot.seen,
});

export const useProgress = create<ProgressState>((set, get) => {
  const initial = loadProgress(typeof localStorage !== 'undefined' ? localStorage : null);
  const persist = () => {
    const { mode, slots } = get();
    saveProgress({ version: 2, mode, slots });
  };
  /** Schreibt den aktiven Stand (und seinen Spiegel) und speichert. */
  const writeActive = (fn: (slot: Slot) => Slot) => {
    const { mode, slots } = get();
    const next = fn(slots[mode]);
    set({ slots: { ...slots, [mode]: next }, ...mirror(next) });
    persist();
  };
  return {
    mode: initial.mode,
    slots: initial.slots,
    ...mirror(initial.slots[initial.mode]),
    completedCount: () => Object.values(get().levels).filter((r) => r.wins > 0).length,
    unseenCount: () => Object.values(get().collection).filter((e) => !e.seen).length,
    recordAttempt: (levelId) =>
      writeActive((slot) => {
        const rec = { ...(slot.levels[levelId] ?? emptyRecord()) };
        rec.attempts += 1;
        return { ...slot, levels: { ...slot.levels, [levelId]: rec } };
      }),
    recordWin: (levelId, node, score, movesLeft, nodeCount) => {
      const first = (get().levels[levelId]?.wins ?? 0) === 0;
      writeActive((slot) => {
        const rec = { ...(slot.levels[levelId] ?? emptyRecord()) };
        rec.wins += 1;
        rec.bestScore = Math.max(rec.bestScore, score);
        rec.bestMovesLeft = Math.max(rec.bestMovesLeft, movesLeft);
        const reached = Math.min(Math.max(slot.reached, node + 1), Math.max(0, nodeCount - 1));
        return { ...slot, levels: { ...slot.levels, [levelId]: rec }, reached };
      });
      bus.emit('progress/won', { levelId, node, first, mode: get().mode });
    },
    setCurrent: (node) => {
      if (node === get().current) return;
      writeActive((slot) => ({ ...slot, current: node }));
    },
    setMode: (mode) => {
      if (mode === get().mode) return;
      set({ mode, ...mirror(get().slots[mode]) });
      persist();
      bus.emit('progress/mode', { mode });
    },
    recordCollect: (input) => {
      const key = collectionKey(input.zone, input.tier, input.species);
      const prev = get().collection[key];
      const entry: CollectionEntry = prev
        ? { ...prev, count: prev.count + 1 }
        : { ...input, key, at: Date.now(), count: 1, seen: false, placedOnMap: false };
      writeActive((slot) => ({ ...slot, collection: { ...slot.collection, [key]: entry } }));
      bus.emit('collection/added', { key, isNew: !prev, entry });
      return { isNew: !prev, entry };
    },
    markPlaced: (key) => {
      const e = get().collection[key];
      if (!e || e.placedOnMap) return;
      writeActive((slot) => ({ ...slot, collection: { ...slot.collection, [key]: { ...e, placedOnMap: true } } }));
      bus.emit('collection/placed', { key });
    },
    markSeen: (keys) => {
      const col = get().collection;
      const targets = keys ?? Object.keys(col);
      if (!targets.some((k) => col[k]?.seen === false)) return;
      writeActive((slot) => {
        const collection = { ...slot.collection };
        for (const k of targets) {
          const e = collection[k];
          if (e && !e.seen) collection[k] = { ...e, seen: true };
        }
        return { ...slot, collection };
      });
    },
    markIntroSeen: () => {
      if (get().seen.intro) return;
      writeActive((slot) => ({ ...slot, seen: { ...slot.seen, intro: true } }));
    },
    markStorySeen: (id) => {
      if (get().seen.stories.includes(id)) return;
      writeActive((slot) => ({ ...slot, seen: { ...slot.seen, stories: [...slot.seen.stories, id] } }));
    },
    resetSlot: (mode) => {
      const target = mode ?? get().mode;
      const slots = { ...get().slots, [target]: emptySlot() };
      set({ slots, ...(target === get().mode ? mirror(slots[target]) : {}) });
      persist();
    },
    unlockTo: (node) =>
      writeActive((slot) => ({
        ...slot,
        reached: Math.max(0, node),
        current: Math.max(0, node),
        seen: { ...slot.seen, intro: slot.seen.intro || node > 0 },
      })),
    fillCollection: (inputs) =>
      writeActive((slot) => {
        const collection = { ...slot.collection };
        const now = Date.now();
        for (const input of inputs) {
          const key = collectionKey(input.zone, input.tier, input.species);
          if (!collection[key]) collection[key] = { ...input, key, at: now, count: 1, seen: false, placedOnMap: false };
        }
        return { ...slot, collection };
      }),
    clearCollection: () => writeActive((slot) => ({ ...slot, collection: {} })),
    resetIntro: (firstLevelId, stories = []) => {
      const { mode, slots } = get();
      const real = slots.real;
      const levels = { ...real.levels };
      const rec = levels[firstLevelId];
      if (rec) levels[firstLevelId] = { ...rec, wins: 0 };
      const next: Slot = { ...real, levels, seen: { intro: false, stories: real.seen.stories.filter((s) => !stories.includes(s)) } };
      set({ slots: { ...slots, real: next }, ...(mode === 'real' ? mirror(next) : {}) });
      persist();
    },
    resetAll: () => get().resetSlot(),
  };
});
