import { parseGenomeRules, validateGenomeRules, type GenomeRules, type GenomeRulesInput } from '@ee/genome';
import rulesJson from '@content/genome/rules.json';
import { contentFetch, contentUrl, useContentTarget } from '../../editor/content/target';
import { localGet, localPut, localRemove } from '../../editor/content/local';
import { downloadJson, shareJson, type ShareOutcome } from '../../editor/content/share';

/** Module URLs by asset id: bundled by Vite (hashed in the build, served from /@fs in dev). */
const glbs = import.meta.glob('@content/genome/assets/*.glb', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
export const MODULE_URLS: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(glbs).map(([path, url]) => [path.split('/').pop()!.replace(/\.glb$/, ''), url]),
);

/** Rules shipped with the build (content/genome/rules.json). */
export const BUNDLED_RULES: GenomeRules = parseGenomeRules(rulesJson);
export const BUNDLED_RULES_INPUT: GenomeRulesInput = rulesJson as unknown as GenomeRulesInput;

const DIR = 'genome';
const FILE = 'rules.json';

/** Where the editor's working copy came from. */
export type RulesSource = 'Bundle' | 'Mac' | 'Lokal';

/**
 * The editor's working copy: the Mac's file (dev server, or the Mac in the WLAN from the app); a local save the
 * Mac does not have yet wins over it (saving writes it there). Without a Mac: the local save, else null (bundle).
 */
export async function loadRulesInput(): Promise<{ input: GenomeRulesInput; source: RulesSource } | null> {
  const local = localGet(DIR, FILE);
  if (await useContentTarget.getState().check()) {
    try {
      const r = await contentFetch(contentUrl(DIR, FILE));
      if (r.ok) {
        const mac = (await r.json()) as GenomeRulesInput;
        if (local && JSON.stringify(local.json) !== JSON.stringify(mac)) return { input: local.json as GenomeRulesInput, source: 'Lokal' };
        if (local) localRemove(DIR, FILE);
        return { input: mac, source: 'Mac' };
      }
    } catch {
      /* offline → local copy or bundle */
    }
  }
  return local ? { input: local.json as GenomeRulesInput, source: 'Lokal' } : null;
}

export interface SaveResult {
  ok: boolean;
  /** Where it went: the Mac's content/ folder or this device. */
  target: 'mac' | 'lokal' | null;
  message: string;
}

/** Validates (zod), then writes to the Mac (content/genome/rules.json); without a connection keeps it locally. */
export async function saveRules(input: GenomeRulesInput): Promise<SaveResult> {
  const v = validateGenomeRules(input);
  if (!v.ok) return { ok: false, target: null, message: v.issues.map((i) => `${i.path}: ${i.message}`).join('\n') };
  if (await useContentTarget.getState().check()) {
    try {
      const r = await contentFetch(contentUrl(DIR, FILE), { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) }, 10000);
      if (!r.ok) {
        const body = (await r.json().catch(() => ({}))) as { error?: string };
        return { ok: false, target: 'mac', message: body.error ?? `${r.status} ${r.statusText}` };
      }
      localRemove(DIR, FILE);
      return { ok: true, target: 'mac', message: 'Gespeichert auf dem Mac: content/genome/rules.json' };
    } catch {
      /* connection lost → keep it locally */
    }
  }
  if (!localPut(DIR, FILE, input)) return { ok: false, target: 'lokal', message: 'Lokaler Speicher voll — „Teilen“ nutzen' };
  return { ok: true, target: 'lokal', message: 'Lokal gespeichert — „Teilen“ schickt rules.json weiter' };
}

/** Share sheet (app, Safari) or download (desktop browser) for the working copy. */
export function shareRules(input: GenomeRulesInput): Promise<ShareOutcome> {
  return shareJson(FILE, input, 'Wesen-Regeln (rules.json)');
}

/** Browser download (desktop); in the app use shareRules. */
export function downloadRules(input: GenomeRulesInput, filename = FILE): void {
  downloadJson(filename, input);
}
