import { parseGenomeRules, validateGenomeRules, type GenomeRules, type GenomeRulesInput } from '@ee/genome';
import rulesJson from '@content/genome/rules.json';

/** Module URLs by asset id: bundled by Vite (hashed in the build, served from /@fs in dev). */
const glbs = import.meta.glob('@content/genome/assets/*.glb', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
export const MODULE_URLS: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(glbs).map(([path, url]) => [path.split('/').pop()!.replace(/\.glb$/, ''), url]),
);

/** Rules shipped with the build (content/genome/rules.json). */
export const BUNDLED_RULES: GenomeRules = parseGenomeRules(rulesJson);
export const BUNDLED_RULES_INPUT: GenomeRulesInput = rulesJson as unknown as GenomeRulesInput;

const endpoint = () => import.meta.env.BASE_URL + '__content/genome/rules.json';

/** Live rules from the dev endpoint (the editor's working copy); null when unavailable (static build). */
export async function fetchDevRulesInput(): Promise<GenomeRulesInput | null> {
  try {
    const r = await fetch(endpoint(), { cache: 'no-store' });
    if (!r.ok) return null;
    return (await r.json()) as GenomeRulesInput;
  } catch {
    return null;
  }
}

export interface SaveResult {
  ok: boolean;
  message: string;
}

/** Validates locally (zod), then PUTs into content/genome/rules.json via the dev endpoint. */
export async function saveDevRules(input: GenomeRulesInput): Promise<SaveResult> {
  const v = validateGenomeRules(input);
  if (!v.ok) return { ok: false, message: v.issues.map((i) => `${i.path}: ${i.message}`).join('\n') };
  try {
    const r = await fetch(endpoint(), { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) });
    if (!r.ok) {
      const body = (await r.json().catch(() => ({}))) as { error?: string; issues?: unknown };
      return { ok: false, message: body.error ?? `${r.status} ${r.statusText}` };
    }
    return { ok: true, message: 'Gespeichert: content/genome/rules.json' };
  } catch (e) {
    return { ok: false, message: `Endpunkt nicht erreichbar (${String(e)}) — Download nutzen` };
  }
}

/** Fallback when the endpoint is not there (static build): offers the JSON as a download. */
export function downloadRules(input: GenomeRulesInput, filename = 'rules.json'): void {
  const blob = new Blob([JSON.stringify(input, null, 2) + '\n'], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
