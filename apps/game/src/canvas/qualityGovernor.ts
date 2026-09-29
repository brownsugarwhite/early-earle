import { useAppStore, type QualityPref, type ResolvedQuality } from '../state/store';

/**
 * Adaptive Qualitätsstufe: Start in "Hoch"; fällt auf "Mobil", wenn die Frametime-p99 in drei
 * aufeinanderfolgenden 1-s-Fenstern über 20 ms liegt; steigt frühestens nach 60 s wieder auf "Hoch",
 * wenn 15 Fenster in Folge unter 12 ms bleiben (Hysterese). Die ersten zwei Fenster nach jedem
 * Wechsel werden ignoriert (Shader-Kompilierung). Eine feste Vorgabe (Hoch/Mobil) übersteuert alles.
 */
const DOWN_P99_MS = 20;
const UP_P99_MS = 12;
const DOWN_WINDOWS = 3;
const UP_WINDOWS = 15;
const MIN_UPGRADE_INTERVAL_MS = 60_000;
const SETTLE_WINDOWS = 2;

interface GovernorState {
  slow: number;
  fast: number;
  settle: number;
  lastChange: number;
}

const state: GovernorState = { slow: 0, fast: 0, settle: SETTLE_WINDOWS, lastChange: 0 };

export function resetQualityGovernor(): void {
  state.slow = 0;
  state.fast = 0;
  state.settle = SETTLE_WINDOWS;
  state.lastChange = performance.now();
  const s = useAppStore.getState();
  const target = prefToResolved(s.qualityPref);
  if (s.effectiveQuality !== target) s.setEffectiveQuality(target);
}

function prefToResolved(pref: QualityPref): ResolvedQuality {
  return pref === 'mobil' ? 'mobil' : 'hoch';
}

/** Einmal pro Perf-Fenster aufrufen (nach setPerf). */
export function governQuality(fps: number, p99Ms: number): void {
  const s = useAppStore.getState();
  if (s.qualityPref !== 'auto') {
    const forced = prefToResolved(s.qualityPref);
    if (s.effectiveQuality !== forced) s.setEffectiveQuality(forced);
    return;
  }
  if (fps <= 0) return; // Tab im Hintergrund oder noch kein Frame
  if (state.settle > 0) {
    state.settle--;
    return;
  }
  const now = performance.now();
  if (s.effectiveQuality === 'hoch') {
    state.slow = p99Ms > DOWN_P99_MS ? state.slow + 1 : 0;
    if (state.slow >= DOWN_WINDOWS) {
      s.setEffectiveQuality('mobil');
      state.slow = 0;
      state.fast = 0;
      state.settle = SETTLE_WINDOWS;
      state.lastChange = now;
    }
  } else {
    state.fast = p99Ms < UP_P99_MS ? state.fast + 1 : 0;
    if (state.fast >= UP_WINDOWS && now - state.lastChange > MIN_UPGRADE_INTERVAL_MS) {
      s.setEffectiveQuality('hoch');
      state.fast = 0;
      state.slow = 0;
      state.settle = SETTLE_WINDOWS;
      state.lastChange = now;
    }
  }
}
