import { WebPlugin } from '@capacitor/core';
import type { GlassAvailability, GlassHudState, LiquidGlassPlugin } from './definitions';

/** Web/Android: no native overlay — the CSS glass HUD stays in charge. */
export class LiquidGlassWeb extends WebPlugin implements LiquidGlassPlugin {
  async isAvailable(): Promise<GlassAvailability> {
    return { available: false, glass: false, platform: 'web' };
  }

  async show(_state: GlassHudState): Promise<{ glass: boolean }> {
    return { glass: false };
  }

  async update(_state: GlassHudState): Promise<{ glass: boolean }> {
    return { glass: false };
  }

  async hide(): Promise<void> {}

  async setSafeInsets(_insets: { top?: number; bottom?: number }): Promise<void> {}
}
