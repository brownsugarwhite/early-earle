import { registerPlugin } from '@capacitor/core';
import type { LiquidGlassPlugin } from './definitions';

/** Native on iOS (Swift class `LiquidGlassPlugin`), no-op web implementation elsewhere. */
export const LiquidGlass = registerPlugin<LiquidGlassPlugin>('LiquidGlass', {
  web: () => import('./web').then((m) => new m.LiquidGlassWeb()),
});

export type * from './definitions';
