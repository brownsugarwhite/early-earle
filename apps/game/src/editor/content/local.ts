/**
 * Local copies of content files, saved while the Mac is not reachable (iOS app away from the WLAN, static build).
 * Kept in localStorage per file (`ee.content.local.<dir>/<file>`): small JSON (levels a few KB, the genome
 * rules ~40 KB). The editors load a local copy in place of the bundled file and offer it again for the Mac once
 * the connection is back; "Teilen" exports it as a .json through the share sheet (./share.ts).
 */
const PREFIX = 'ee.content.local.';

export interface LocalFile {
  json: unknown;
  /** ms since epoch. */
  at: number;
}

const key = (dir: string, file: string) => `${PREFIX}${dir}/${file}`;

export function localGet(dir: string, file: string): LocalFile | null {
  try {
    const raw = localStorage.getItem(key(dir, file));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LocalFile>;
    return parsed && 'json' in parsed ? { json: parsed.json, at: typeof parsed.at === 'number' ? parsed.at : 0 } : null;
  } catch {
    return null;
  }
}

export function localPut(dir: string, file: string, json: unknown): boolean {
  try {
    localStorage.setItem(key(dir, file), JSON.stringify({ json, at: Date.now() } satisfies LocalFile));
    return true;
  } catch {
    return false; // storage full or blocked
  }
}

export function localRemove(dir: string, file: string): void {
  try {
    localStorage.removeItem(key(dir, file));
  } catch {
    /* ignore */
  }
}

/** File names with a local copy in `dir` (sorted). */
export function localList(dir: string): string[] {
  const out: string[] = [];
  const prefix = `${PREFIX}${dir}/`;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) {
        const rest = k.slice(prefix.length);
        if (!rest.includes('/')) out.push(rest);
      }
    }
  } catch {
    /* ignore */
  }
  return out.sort();
}

/** "vor 3 Min." / "um 14:05" for a local save time. */
export function formatLocalTime(at: number): string {
  if (!at) return '';
  const d = Date.now() - at;
  if (d < 60_000) return 'gerade eben';
  if (d < 3_600_000) return `vor ${Math.round(d / 60_000)} Min.`;
  const t = new Date(at);
  const hm = `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
  return d < 86_400_000 ? `um ${hm}` : `am ${t.getDate()}.${t.getMonth() + 1}. ${hm}`;
}
