import type { Ansicht } from '@ee/shape';

export type ViewId = Ansicht | 'creation';
export const VIEWS: readonly ViewId[] = ['seite', 'front', 'top', 'creation'];

export type Rect = { x: number; y: number; w: number; h: number };

/** Beschriftung über dem Viewport und unten links/rechts darin (wie Florians Vorlage). */
export const VIEW_TEXTE: Record<ViewId, { titel: string; links?: string; rechts?: string }> = {
  seite: { titel: 'side', links: 'front', rechts: 'back' },
  front: { titel: 'front', links: 'left', rechts: 'right' },
  top: { titel: 'top', links: 'front', rechts: 'back' },
  creation: { titel: 'creation' },
};
