import { create } from 'zustand';

/** Persisted audio settings (localStorage `ee.audio.v1`). Volumes are 0..1 on top of each bus's base level. */
export interface AudioSettings {
  muted: boolean;
  master: number;
  music: number;
  sfx: number;
  ambient: number;
  voice: number;
}

export type VolumeKey = Exclude<keyof AudioSettings, 'muted'>;

export const AUDIO_STORAGE_KEY = 'ee.audio.v1';

export const DEFAULT_AUDIO_SETTINGS: Readonly<AudioSettings> = {
  muted: false,
  master: 0.8,
  music: 0.7,
  sfx: 0.85,
  ambient: 0.6,
  voice: 0.8,
};

const clamp01 = (v: unknown, fallback: number): number => (typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback);

/** Reads the stored settings; anything missing or malformed falls back to the defaults. */
export function loadAudioSettings(): AudioSettings {
  const d = DEFAULT_AUDIO_SETTINGS;
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(AUDIO_STORAGE_KEY) : null;
    if (!raw) return { ...d };
    const o = JSON.parse(raw) as Partial<Record<keyof AudioSettings, unknown>>;
    return {
      muted: typeof o.muted === 'boolean' ? o.muted : d.muted,
      master: clamp01(o.master, d.master),
      music: clamp01(o.music, d.music),
      sfx: clamp01(o.sfx, d.sfx),
      ambient: clamp01(o.ambient, d.ambient),
      voice: clamp01(o.voice, d.voice),
    };
  } catch {
    return { ...d };
  }
}

function persist(s: AudioSettings): void {
  try {
    localStorage.setItem(AUDIO_STORAGE_KEY, JSON.stringify({ v: 1, muted: s.muted, master: s.master, music: s.music, sfx: s.sfx, ambient: s.ambient, voice: s.voice }));
  } catch {
    // private mode / blocked storage: the setting lives for this session only
  }
}

export interface AudioSettingsState extends AudioSettings {
  setMuted: (muted: boolean) => void;
  toggleMuted: () => void;
  setVolume: (key: VolumeKey, value: number) => void;
  reset: () => void;
}

const pick = (s: AudioSettingsState): AudioSettings => ({ muted: s.muted, master: s.master, music: s.music, sfx: s.sfx, ambient: s.ambient, voice: s.voice });

/** Sound toggle and mixer state for the HUD and the Audio-Lab; the engine follows it. */
export const useAudioSettings = create<AudioSettingsState>((set, get) => ({
  ...loadAudioSettings(),
  setMuted: (muted) => {
    set({ muted });
    persist(pick(get()));
  },
  toggleMuted: () => get().setMuted(!get().muted),
  setVolume: (key, value) => {
    set({ [key]: Math.min(1, Math.max(0, value)) } as Pick<AudioSettings, VolumeKey>);
    persist(pick(get()));
  },
  reset: () => {
    set({ ...DEFAULT_AUDIO_SETTINGS });
    persist(pick(get()));
  },
}));
