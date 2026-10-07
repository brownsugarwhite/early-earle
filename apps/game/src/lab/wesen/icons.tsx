import type { ReactNode } from 'react';

/** Symbole des Wesen-Labs: gefüllte Flächen in einer 24er-Box, keine Striche (Konturen-Regel gilt auch hier). */
export type WesenIconName =
  | 'undo'
  | 'redo'
  | 'wuerfel'
  | 'schloss'
  | 'schlossOffen'
  | 'zurueck'
  | 'speichern'
  | 'teilen'
  | 'bild'
  | 'spiegeln'
  | 'bewegen'
  | 'kamera'
  | 'brett'
  | 'links'
  | 'rechts'
  | 'weg'
  | 'drehen';

export function WesenIcon({ name, size = 22 }: { name: WesenIconName; size?: number }) {
  let body: ReactNode;
  switch (name) {
    case 'undo':
      body = <path d="M9 4 L2 10 L9 16 L9 12 C14 12 18 13 20 19 C21 12 17 8 9 8 Z" />;
      break;
    case 'redo':
      body = <path d="M15 4 L22 10 L15 16 L15 12 C10 12 6 13 4 19 C3 12 7 8 15 8 Z" />;
      break;
    case 'wuerfel':
      body = <path fillRule="evenodd" d="M3 3 H21 V21 H3 Z M6.5 5 A1.5 1.5 0 1 0 6.5 8 A1.5 1.5 0 1 0 6.5 5 Z M12 10.5 A1.5 1.5 0 1 0 12 13.5 A1.5 1.5 0 1 0 12 10.5 Z M17.5 16 A1.5 1.5 0 1 0 17.5 19 A1.5 1.5 0 1 0 17.5 16 Z M17.5 5 A1.5 1.5 0 1 0 17.5 8 A1.5 1.5 0 1 0 17.5 5 Z M6.5 16 A1.5 1.5 0 1 0 6.5 19 A1.5 1.5 0 1 0 6.5 16 Z" />;
      break;
    case 'schloss':
      body = <path fillRule="evenodd" d="M7 10 V7 C7 4 9 2 12 2 C15 2 17 4 17 7 V10 H20 V22 H4 V10 Z M10 10 H14 V7 C14 5.8 13.2 5 12 5 C10.8 5 10 5.8 10 7 Z M11 14 V18 H13 V14 Z" />;
      break;
    case 'schlossOffen':
      body = <path fillRule="evenodd" d="M7 10 V7 C7 4 9 2 12 2 C15 2 17 4 17 7 V8 H14 V7 C14 5.8 13.2 5 12 5 C10.8 5 10 5.8 10 7 V10 H20 V22 H4 V10 Z M11 14 V18 H13 V14 Z" />;
      break;
    case 'zurueck':
      body = <path d="M12 3 C7 3 3 7 3 12 H0 L5 18 L10 12 H7 C7 9 9 7 12 7 C15 7 17 9 17 12 C17 15 15 17 12 17 V21 C17 21 21 17 21 12 C21 7 17 3 12 3 Z" />;
      break;
    case 'speichern':
      body = <path fillRule="evenodd" d="M3 3 H17 L21 7 V21 H3 Z M7 5 V9 H15 V5 Z M7 13 V19 H17 V13 Z" />;
      break;
    case 'teilen':
      body = <path d="M12 1 L18 7 H14 V15 H10 V7 H6 Z M3 11 H7 V19 H17 V11 H21 V22 H3 Z" />;
      break;
    case 'bild':
      body = <path fillRule="evenodd" d="M2 4 H22 V20 H2 Z M5 7 V15 L9 10 L13 15 L15 12.5 L19 17 V7 Z M16 8 A1.6 1.6 0 1 0 16 11.2 A1.6 1.6 0 1 0 16 8 Z" />;
      break;
    case 'spiegeln':
      body = <path d="M11 2 H13 V22 H11 Z M9 5 V19 L2 19 Z M15 5 L22 19 H15 Z" />;
      break;
    case 'bewegen':
      body = <path d="M12 1 L16 5 H13 V11 H19 V8 L23 12 L19 16 V13 H13 V19 H16 L12 23 L8 19 H11 V13 H5 V16 L1 12 L5 8 V11 H11 V5 H8 Z" />;
      break;
    case 'kamera':
      body = <path fillRule="evenodd" d="M2 7 H7 L9 4 H15 L17 7 H22 V20 H2 Z M12 9 A4 4 0 1 0 12 17 A4 4 0 1 0 12 9 Z" />;
      break;
    case 'brett':
      body = <path fillRule="evenodd" d="M2 2 H22 V22 H2 Z M5 5 V10 H10 V5 Z M14 5 V10 H19 V5 Z M5 14 V19 H10 V14 Z M14 14 V19 H19 V14 Z" />;
      break;
    case 'links':
      body = <path d="M16 3 L7 12 L16 21 L18 19 L11 12 L18 5 Z" />;
      break;
    case 'rechts':
      body = <path d="M8 3 L17 12 L8 21 L6 19 L13 12 L6 5 Z" />;
      break;
    case 'weg':
      body = <path d="M5 3 L12 10 L19 3 L21 5 L14 12 L21 19 L19 21 L12 14 L5 21 L3 19 L10 12 L3 5 Z" />;
      break;
    case 'drehen':
      body = <path d="M12 4 C17.5 4 22 6.5 22 10 C22 12.6 19.6 14.6 16 15.5 V12.8 C18.4 12.1 19.6 11 19.6 10 C19.6 8.2 16.4 6.4 12 6.4 C7.6 6.4 4.4 8.2 4.4 10 C4.4 11.6 7 13.2 11 13.5 V10.5 L15 14.7 L11 19 V15.9 C5.8 15.6 2 13.1 2 10 C2 6.5 6.5 4 12 4 Z" />;
      break;
  }
  return (
    <svg className="wl-icon" viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false" fill="currentColor">
      {body}
    </svg>
  );
}
