/** Client für den Dev-Endpunkt `/__content/levels` (apps/game/vite-plugins/contentApi.ts). */

const base = () => import.meta.env.BASE_URL + '__content/levels';

export const FILE_NAME_RE = /^[a-zA-Z0-9_.-]+\.json$/;

export async function listLevelFiles(): Promise<string[]> {
  const r = await fetch(base(), { signal: AbortSignal.timeout(5000) });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  const j = (await r.json()) as { files?: unknown };
  if (!Array.isArray(j.files)) throw new Error('unerwartete Antwort');
  return j.files.filter((f): f is string => typeof f === 'string' && f.endsWith('.json'));
}

/** Liest eine Datei; `null` bei 404. */
export async function getLevelFile(file: string): Promise<unknown | null> {
  const r = await fetch(`${base()}/${file}`, { signal: AbortSignal.timeout(5000) });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}

export interface PutError {
  error: string;
  issues?: unknown;
}

export async function putLevelFile(file: string, json: unknown): Promise<{ ok: true } | { ok: false; status: number; body: PutError }> {
  const r = await fetch(`${base()}/${file}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(json),
  });
  if (r.ok) return { ok: true };
  let body: PutError = { error: `${r.status} ${r.statusText}` };
  try {
    body = (await r.json()) as PutError;
  } catch {
    /* kein JSON */
  }
  return { ok: false, status: r.status, body };
}

export async function deleteLevelFile(file: string): Promise<void> {
  const r = await fetch(`${base()}/${file}`, { method: 'DELETE' });
  if (!r.ok) {
    let msg = `${r.status} ${r.statusText}`;
    try {
      msg = ((await r.json()) as { error?: string }).error ?? msg;
    } catch {
      /* kein JSON */
    }
    throw new Error(msg);
  }
}
