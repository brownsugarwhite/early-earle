import type { PluginListenerHandle } from '@capacitor/core';

export interface GlassGoal {
  text: string;
  done?: boolean;
}

export interface GlassTop {
  /** Level name (chunky headline). */
  title: string;
  /** Small caps line above the title, e.g. "Tjorizo · Level 3". */
  subtitle?: string;
  /** Moves left ("∞" for no limit). */
  moves?: string | number;
  goals?: Array<GlassGoal | string>;
}

export interface GlassAction {
  id: string;
  label: string;
  /** SF Symbol name, e.g. "play.fill". */
  icon?: string;
  /** Uses the accent tint (pink) instead of the zone tint. */
  primary?: boolean;
  disabled?: boolean;
  /** Hex override of this pill's glass tint. */
  tint?: string;
  /** Always a round icon pill (label only for VoiceOver), e.g. the Werkstatt wrench next to "Spielen". */
  iconOnly?: boolean;
}

/** Partial HUD state: only the keys present are applied; `null` clears a section. */
export interface GlassHudState {
  top?: GlassTop | null;
  actions?: GlassAction[];
  rex?: string | null;
  /** Zone tint (hex) for the top pill and neutral actions. */
  tint?: string | null;
  /** Accent tint (hex) for primary actions. */
  accent?: string | null;
}

export interface GlassAvailability {
  /** A native overlay can be shown (iOS 16+). */
  available: boolean;
  /** The overlay uses real Liquid Glass (iOS 26+); otherwise a material blur. */
  glass: boolean;
  platform: 'ios' | 'android' | 'web';
  version?: string;
}

/** Heights in CSS px so the web HUD can offset its own elements. */
/** A native element's frame in CSS px of the web view (points). */
export interface GlassRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface GlassLayout {
  /** Bottom edge of the top pill (from the top of the web view). */
  top: number;
  /** Height of the action row measured from the bottom of the web view (0 when there are no actions). */
  bottom: number;
  safeTop: number;
  safeBottom: number;
  glass: boolean;
  /** REX line box (paper card), when shown. Older native builds omit it. */
  line?: GlassRect | null;
  /** Union of the action pills, when shown. Older native builds omit it. */
  actions?: GlassRect | null;
}

export interface GlassActionEvent {
  id: string;
}

export interface LiquidGlassPlugin {
  isAvailable(): Promise<GlassAvailability>;
  /** Applies the state and shows the overlay (fade in). */
  show(state: GlassHudState): Promise<{ glass: boolean }>;
  /** Applies a partial state; pills morph between states. */
  update(state: GlassHudState): Promise<{ glass: boolean }>;
  hide(): Promise<void>;
  /** Extra insets on top of the safe area (CSS px). */
  setSafeInsets(insets: { top?: number; bottom?: number }): Promise<void>;
  addListener(eventName: 'action', listener: (event: GlassActionEvent) => void): Promise<PluginListenerHandle>;
  addListener(eventName: 'layout', listener: (event: GlassLayout) => void): Promise<PluginListenerHandle>;
  removeAllListeners(): Promise<void>;
}
