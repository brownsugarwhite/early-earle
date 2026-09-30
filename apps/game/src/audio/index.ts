/**
 * Audio layer of early earle: procedural Web Audio (no samples). `installAudio()` binds it to the flow,
 * `SoundToggle` is the HUD switch, `useAudioSettings` the persisted mixer (localStorage `ee.audio.v1`).
 */
export { installAudio } from './wiring';
export { audio, type AudioScene, type EngineStats, type SceneMode } from './engine';
export { SoundToggle } from './SoundToggle';
export { useAudioSettings, AUDIO_STORAGE_KEY, type AudioSettings, type VolumeKey } from './settings';
export { SFX_IDS, type SfxId, type SfxParams, type Material, type BodyKind, type Coat } from './sfx';
export { ZONE_KEYS, ZONE_MUSIC, type ZoneKey } from './scales';
export { AMBIENT_PRESETS, WORLD_IDS, type WorldId } from './ambient';
export { PREVIEWS, PREVIEW_IDS, renderPreview, encodeWav, measure, benchOffline, type PreviewId } from './render';
