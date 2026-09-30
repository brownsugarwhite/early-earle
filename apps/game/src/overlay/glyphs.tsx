import type { ReactNode } from 'react';

/**
 * Glyphs for the lab chrome and the Werkstatt: filled shapes only (no strokes, no outlines — STYLE.md §3),
 * 24 × 24 grid, `currentColor`. Holes are cut with even-odd fills.
 */
export type GlyphName =
  | 'back'
  | 'planet'
  | 'wrench'
  | 'levels'
  | 'creature'
  | 'map'
  | 'earle'
  | 'tree'
  | 'shadow'
  | 'grid'
  | 'blob'
  | 'genome'
  | 'rex'
  | 'falls'
  | 'audio'
  | 'mac'
  | 'phone'
  | 'share'
  | 'chevron';

const PATHS: Record<GlyphName, ReactNode> = {
  back: <path d="M16 3 L7 12 L16 21 L18 19 L11 12 L18 5 Z" />,
  // Planet with a ring (the game: map on the planet).
  planet: (
    <>
      <circle cx="12" cy="12" r="6.4" />
      <path fillRule="evenodd" transform="rotate(-18 12 12)" d="M1 12 a11 3.7 0 1 0 22 0 a11 3.7 0 1 0 -22 0 Z M3.3 12 a8.7 1.9 0 1 0 17.4 0 a8.7 1.9 0 1 0 -17.4 0 Z" />
    </>
  ),
  // Open-jaw wrench (the Werkstatt).
  wrench: <path d="M20.9 5.5 A5.5 5.5 0 0 1 13.69 12.99 L7.44 19.24 A1.9 1.9 0 0 1 4.76 16.56 L11.01 10.31 A5.5 5.5 0 0 1 18.5 3.1 L15.65 5.95 L18.05 8.35 Z" />,
  levels: <path d="M2 2h9v9H2z M13 2h9v9h-9z M2 13h9v9H2z M13 13h9v9h-9z" />,
  creature: <path fillRule="evenodd" d="M12 3c5 0 9 4 9 9.5S17.5 21 12 21 3 18 3 12.5 7 3 12 3z M12.1 10.5a2.4 2.4 0 1 0 4.8 0a2.4 2.4 0 1 0 -4.8 0z" />,
  map: (
    <>
      <circle cx="17.5" cy="6.5" r="3.2" />
      <path d="M1 21 C4.5 12.5 8.5 12 12.5 17 C15.5 13.5 19.5 13 23 17 V22 H1 Z" />
    </>
  ),
  earle: (
    <>
      <path d="M1 18 C5 14 9 14 12 16.5 C15 14 19 13.5 23 16 V22 H1 Z" />
      <path d="M4 13 a4.5 4.5 0 0 1 9 0 Z M8 13 h1.2 v5 H8 Z" />
      <path d="M14 11 a3.5 4.5 0 0 1 7 0 Z M17 11 h1 v5 h-1 Z" />
    </>
  ),
  tree: <path d="M12 1.5a8.5 7.5 0 0 1 8.5 7.5c0 2.2-1.3 3.5-3.5 3.5H13v10h-2v-10H7c-2.2 0-3.5-1.3-3.5-3.5A8.5 7.5 0 0 1 12 1.5z" />,
  shadow: (
    <>
      <circle cx="20" cy="4.5" r="2.6" />
      <path d="M14.5 7h3.5v12.5h-3.5z M1 19.5h13.5V22H1z" />
    </>
  ),
  grid: <path d="M2 2h6v6H2z M9 2h6v6H9z M16 2h6v6h-6z M2 9h6v6H2z M9 9h6v6H9z M16 9h6v6h-6z M2 16h6v6H2z M9 16h6v6H9z M16 16h6v6h-6z" />,
  blob: <path fillRule="evenodd" d="M12 2C12 2 4.5 10 4.5 15a7.5 7.5 0 0 0 15 0C19.5 10 12 2 12 2z M7.8 13.5a1.5 2.3 0 1 0 3 0a1.5 2.3 0 1 0 -3 0z" />,
  genome: (
    <>
      <path fillRule="evenodd" d="M3 10.5a9 6.2 0 1 0 18 0a9 6.2 0 1 0 -18 0z M13.6 9.2a1.9 1.9 0 1 0 3.8 0a1.9 1.9 0 1 0 -3.8 0z" />
      <path d="M6 14h2.6v8H6z M15.4 14H18v8h-2.6z" />
    </>
  ),
  rex: <path fillRule="evenodd" d="M5 3h9a7 7 0 0 1 7 7v3h-7v2h6v2a4 4 0 0 1-4 4H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z M7.4 8.8a2.6 2.6 0 1 0 5.2 0a2.6 2.6 0 1 0 -5.2 0z" />,
  // Crag with a waterfall into a pool (the landmarks lab).
  falls: (
    <>
      <path d="M2.5 22 L4.6 7.5 L7.6 2.5 L10.4 4.6 L12 22 Z M10.8 5.2 H15.6 V7 H10.9 Z" />
      <path d="M13.2 7 h2.4 v11.4 h-2.4z M16.9 8.6 h1 v8.6 h-1z" />
      <path d="M9.6 20.6a6.8 1.9 0 1 0 13.6 0a6.8 1.9 0 1 0 -13.6 0z" />
    </>
  ),
  audio: (
    <>
      <path d="M2 9h4l5.5-4.8v15.6L6 15H2z" />
      <path d="M14.6 8.1a5 5 0 0 1 0 7.8l-1.3-1.5a3 3 0 0 0 0-4.8z" />
      <path d="M17.4 5.1a9 9 0 0 1 0 13.8l-1.3-1.5a7 7 0 0 0 0-10.8z" />
    </>
  ),
  mac: <path fillRule="evenodd" d="M3 4h18v12H3z M5 6v8h14V6z M1 18h22v2.5H1z" />,
  phone: <path fillRule="evenodd" d="M7 1h10a2 2 0 0 1 2 2v18a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2z M7 4v15h10V4z" />,
  share: <path d="M12 1 L18 7 H14 V15 H10 V7 H6 Z M3 11 H7 V19 H17 V11 H21 V22 H3 Z" />,
  chevron: <path d="M8 3 L17 12 L8 21 L6 19 L13 12 L6 5 Z" />,
};

export function Glyph({ name, size = 20, className }: { name: GlyphName; size?: number; className?: string }) {
  return (
    <svg className={className ? `glyph ${className}` : 'glyph'} viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false" fill="currentColor">
      {PATHS[name]}
    </svg>
  );
}
