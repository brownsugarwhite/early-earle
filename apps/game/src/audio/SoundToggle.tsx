import { useAudioSettings } from './settings';
import './audio.css';

/** Speaker glyph as filled shapes (no strokes/outlines): cone + two wave arcs, or cone + a filled cross. */
function SpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <svg className="sound-icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
      <path d="M3 9h4l5-4.5v15L7 15H3z" fill="currentColor" />
      {muted ? (
        <path d="M15.3 8.2l1.4-1.4 2.3 2.3 2.3-2.3 1.4 1.4-2.3 2.3 2.3 2.3-1.4 1.4-2.3-2.3-2.3 2.3-1.4-1.4 2.3-2.3z" fill="currentColor" transform="translate(-1.2 1.2)" />
      ) : (
        <>
          <path d="M14.6 8.1a5 5 0 0 1 0 7.8l-1.3-1.5a3 3 0 0 0 0-4.8z" fill="currentColor" />
          <path d="M17.2 5.1a9 9 0 0 1 0 13.8l-1.3-1.5a7 7 0 0 0 0-10.8z" fill="currentColor" />
        </>
      )}
    </svg>
  );
}

/**
 * Sound on/off for the flow HUD: a square glass button next to the actions (same neo-brutalist glass, hard
 * sun shadow, no outline). The setting persists (localStorage `ee.audio.v1`); unmuting is itself the
 * gesture that unlocks audio on iOS.
 */
export function SoundToggle({ className = '' }: { className?: string }) {
  const muted = useAudioSettings((s) => s.muted);
  const toggle = useAudioSettings((s) => s.toggleMuted);
  return (
    <button
      type="button"
      className={`glass-btn glass sound-toggle ${className}`.trim()}
      data-testid="sound-toggle"
      data-muted={muted}
      aria-pressed={!muted}
      aria-label={muted ? 'Ton einschalten' : 'Ton ausschalten'}
      title={muted ? 'Ton an' : 'Ton aus'}
      onClick={toggle}
    >
      <SpeakerIcon muted={muted} />
    </button>
  );
}
