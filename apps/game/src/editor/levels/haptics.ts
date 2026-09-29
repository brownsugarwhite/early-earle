import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

/**
 * Taktiles Feedback für den Editor: in der nativen App über Capacitor (Taptic Engine), im Browser über
 * `navigator.vibrate` (Android). Auf iOS-Safari gibt es keine Vibration — dort trägt das sichtbare
 * Feedback (Stempel-Animation auf der Zelle, eingedrückte Knöpfe) allein.
 */
export type HapticKind = 'tap' | 'select' | 'press' | 'success' | 'warning' | 'error';

const native = (() => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
})();

const VIBRATE_MS: Record<HapticKind, number | number[]> = {
  tap: 6,
  select: 4,
  press: 14,
  success: [10, 40, 16],
  warning: [16, 50, 16],
  error: [24, 40, 24],
};

let last = 0;

export function haptic(kind: HapticKind = 'tap'): void {
  // Beim Malen feuern viele Zellen hintereinander: höchstens alle 35 ms.
  const now = performance.now();
  if (kind === 'tap' && now - last < 35) return;
  last = now;
  if (native) {
    const fire = (p: Promise<unknown>) => void p.catch(() => undefined);
    switch (kind) {
      case 'tap':
      case 'select':
        fire(Haptics.impact({ style: ImpactStyle.Light }));
        break;
      case 'press':
        fire(Haptics.impact({ style: ImpactStyle.Medium }));
        break;
      case 'success':
        fire(Haptics.notification({ type: NotificationType.Success }));
        break;
      case 'warning':
        fire(Haptics.notification({ type: NotificationType.Warning }));
        break;
      case 'error':
        fire(Haptics.notification({ type: NotificationType.Error }));
        break;
    }
    return;
  }
  try {
    navigator.vibrate?.(VIBRATE_MS[kind]);
  } catch {
    /* nicht verfügbar */
  }
}
