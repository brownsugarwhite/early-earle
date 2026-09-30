/** Florian's Mac in the home WLAN, HTTP dev server (`pnpm --filter @ee/game dev:http`). */
export const DEFAULT_MAC_URL = 'http://192.168.1.55:5174';
const MAC_PORT = '5174';

/**
 * "192.168.1.55" → "http://192.168.1.55:5174"; keeps an explicit scheme and port; drops paths, queries and
 * trailing slashes. Only http(s); anything unparsable → null.
 */
export function normalizeMacUrl(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `http://${raw}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    if (!u.hostname) return null;
    const explicitPort = /^[a-z]+:\/\/[^/?#]+:\d+/i.test(withScheme);
    const port = explicitPort ? u.port : MAC_PORT;
    return `${u.protocol}//${u.hostname}${port ? `:${port}` : ''}`;
  } catch {
    return null;
  }
}
