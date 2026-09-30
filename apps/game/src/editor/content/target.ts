import { create } from 'zustand';
import { Capacitor } from '@capacitor/core';
import { DEFAULT_MAC_URL, normalizeMacUrl } from './macUrl';

/**
 * Where the editors read and write `content/` (the dev endpoint `/__content/...` of the Vite server on the Mac,
 * apps/game/vite-plugins/contentApi.ts):
 *
 * - `dev`: the page itself comes from the Vite dev server (Mac browser, or Safari on the iPhone against the Mac) —
 *   same origin, nothing to configure.
 * - `mac`: the iOS app (capacitor://localhost) or a static build — the endpoint lives on the Mac's HTTP dev server
 *   in the LAN (`pnpm --filter @ee/game dev:http`, port 5174). The address is configurable in the Werkstatt; the dev
 *   server answers CORS for the app origin, iOS allows the plain-HTTP LAN request via `NSAllowsLocalNetworking`.
 *
 * When the Mac cannot be reached the editors save locally (./local.ts) and offer the JSON through the share sheet.
 */
export type ContentMode = 'dev' | 'mac';
export type ContentStatus = 'unbekannt' | 'prüft' | 'verbunden' | 'offline';

export { DEFAULT_MAC_URL, normalizeMacUrl };
const MAC_KEY = 'ee.werkstatt.mac';
const CHECK_TIMEOUT_MS = 2500;
/** A fresh answer is reused this long (every editor asks on start and before saving). */
const CHECK_TTL_MS = 8000;

export const IS_NATIVE = (() => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
})();

export const CONTENT_MODE: ContentMode = import.meta.env.DEV && !IS_NATIVE ? 'dev' : 'mac';

function readMacUrl(): string {
  try {
    const stored = localStorage.getItem(MAC_KEY);
    const n = stored ? normalizeMacUrl(stored) : null;
    if (n) return n;
  } catch {
    /* storage blocked */
  }
  const fromEnv = import.meta.env.VITE_MAC_URL as string | undefined;
  return (fromEnv && normalizeMacUrl(fromEnv)) || DEFAULT_MAC_URL;
}

export interface ContentTargetState {
  mode: ContentMode;
  macUrl: string;
  status: ContentStatus;
  /** Host name of the Mac (from the endpoint's ping), when known. */
  host: string | null;
  /** Last problem in plain German (for the Werkstatt card). */
  error: string | null;
  checkedAt: number;
  /** Result of the last write test (Werkstatt „Testen“), null = not tested since the address changed. */
  write: { ok: boolean; message: string } | null;
  setMacUrl: (url: string) => boolean;
  /** Probes the endpoint (cached for a few seconds unless `force`). Resolves to "reachable". */
  check: (force?: boolean) => Promise<boolean>;
  /** Full test: ping, then write and delete a throwaway file (content/genome/_werkstatt-test.json). */
  testWrite: () => Promise<boolean>;
  /** A request failed on the network: show the local fallback until the next check. */
  markOffline: (error: string) => void;
}

let inflight: Promise<boolean> | null = null;
let writeInflight: Promise<boolean> | null = null;
/** Throwaway file of the write test: in genome/ (no module globs there, so no reload in open dev tabs), `_` = deletable. */
const WRITE_TEST_FILE = '_werkstatt-test.json';

export const useContentTarget = create<ContentTargetState>((set, get) => ({
  mode: CONTENT_MODE,
  macUrl: readMacUrl(),
  status: 'unbekannt',
  host: null,
  error: null,
  checkedAt: 0,
  write: null,
  setMacUrl: (url) => {
    const n = normalizeMacUrl(url);
    if (!n) return false;
    try {
      localStorage.setItem(MAC_KEY, n);
    } catch {
      /* not remembered */
    }
    set({ macUrl: n, status: 'unbekannt', host: null, error: null, checkedAt: 0, write: null });
    return true;
  },
  testWrite: () => {
    // One test at a time (a second tap, or React's double effect in dev, joins the running one).
    if (writeInflight) return writeInflight;
    const run = async (): Promise<boolean> => {
      if (!(await get().check(true))) {
        set({ write: { ok: false, message: 'Mac nicht erreichbar' } });
        return false;
      }
      const url = contentUrl('genome', WRITE_TEST_FILE);
      try {
        const put = await contentFetch(url, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ schemaVersion: 1, test: 'werkstatt', at: new Date().toISOString() }) }, 6000);
        if (!put.ok) {
          set({ write: { ok: false, message: `Schreiben abgelehnt (${put.status})` } });
          return false;
        }
        const del = await contentFetch(url, { method: 'DELETE' }, 6000).catch(() => null);
        set({ write: { ok: true, message: del?.ok ? 'Schreiben geht' : 'Schreiben geht (Testdatei liegt noch)' } });
        return true;
      } catch {
        set({ write: { ok: false, message: 'Schreiben: keine Verbindung' } });
        return false;
      }
    };
    writeInflight = run().finally(() => {
      writeInflight = null;
    });
    return writeInflight;
  },
  check: (force = false) => {
    const s = get();
    if (!force && s.checkedAt && Date.now() - s.checkedAt < CHECK_TTL_MS && (s.status === 'verbunden' || s.status === 'offline')) {
      return Promise.resolve(s.status === 'verbunden');
    }
    if (inflight) return inflight;
    set({ status: 'prüft' });
    inflight = probe(contentBase())
      .then((r) => {
        set({ status: r.ok ? 'verbunden' : 'offline', host: r.host, error: r.error, checkedAt: Date.now() });
        return r.ok;
      })
      .finally(() => {
        inflight = null;
      });
    return inflight;
  },
  markOffline: (error) => set({ status: 'offline', error, checkedAt: Date.now() }),
}));

/** Base URL of the endpoint without trailing slash, e.g. "/__content" or "http://192.168.1.55:5174/__content". */
export function contentBase(): string {
  const { mode, macUrl } = useContentTarget.getState();
  return mode === 'dev' ? `${import.meta.env.BASE_URL}__content` : `${macUrl}/__content`;
}

/** URL of a directory listing or a file, e.g. contentUrl('levels', '003.json'). */
export function contentUrl(dir: string, file?: string): string {
  return `${contentBase()}/${dir}${file ? `/${file}` : ''}`;
}

/** fetch with a timeout; network failures (no route, CORS, ATS) flip the target to offline. */
export async function contentFetch(url: string, init: RequestInit = {}, timeoutMs = 6000): Promise<Response> {
  try {
    return await fetch(url, { cache: 'no-store', ...init, signal: init.signal ?? AbortSignal.timeout(timeoutMs) });
  } catch (e) {
    useContentTarget.getState().markOffline(describeNetworkError(e));
    throw e;
  }
}

function describeNetworkError(e: unknown): string {
  if (e instanceof DOMException && (e.name === 'TimeoutError' || e.name === 'AbortError')) return 'keine Antwort (Zeitüberschreitung)';
  return 'keine Verbindung';
}

async function probe(base: string): Promise<{ ok: boolean; host: string | null; error: string | null }> {
  try {
    const r = await fetch(`${base}/`, { cache: 'no-store', signal: AbortSignal.timeout(CHECK_TIMEOUT_MS) });
    if (r.ok) {
      const j = (await r.json().catch(() => ({}))) as { host?: unknown };
      return { ok: true, host: typeof j.host === 'string' ? j.host : null, error: null };
    }
    // Older endpoint without the ping answers 400 ("dir fehlt") — reachable all the same.
    if (r.status === 400) return { ok: true, host: null, error: null };
    return { ok: false, host: null, error: `Antwort ${r.status}` };
  } catch (e) {
    return { ok: false, host: null, error: describeNetworkError(e) };
  }
}

/** Human-readable save target for toasts and status chips. */
export function targetLabel(online: boolean): string {
  return online ? 'auf dem Mac' : 'lokal';
}
