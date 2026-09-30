/** URL scheme of the iOS app (Info.plist CFBundleURLTypes): earlyearle://werkstatt, earlyearle://lab/earle?world=08 … */
export const APP_SCHEME = 'earlyearle';

/** The app's own routes a link may open: game, Werkstatt, labs, editors. */
const ALLOWED = /^\/(?:werkstatt|lab(?:\/[a-z-]+)?|editor\/[a-z-]+|play)?$/;

/**
 * `earlyearle://lab/earle?world=08` → `/lab/earle?world=08`; `earlyearle://` → `/`. Anything else (other schemes,
 * unknown or odd paths) → null.
 */
export function routeFromAppUrl(url: string): string | null {
  const m = new RegExp(`^${APP_SCHEME}:\\/\\/([^?#]*)(\\?[^#]*)?`, 'i').exec(url.trim());
  if (!m) return null;
  const path = `/${(m[1] ?? '').replace(/^\/+|\/+$/g, '')}`;
  if (!ALLOWED.test(path)) return null;
  return path + (m[2] ?? '');
}
