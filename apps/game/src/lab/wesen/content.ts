import type { Bauplan } from '@ee/creature';
import type { WesenStil } from '@ee/render';
import { contentFetch, contentUrl, useContentTarget } from '../../editor/content/target';
import { localGet, localList, localPut, localRemove } from '../../editor/content/local';
import { shareJson, type ShareOutcome } from '../../editor/content/share';
import { bereinigeBauplan, bereinigeStil } from './regler';

/**
 * Wesen-Dateien im Repo (`content/creatures/`): Vorlagen als `vorlagen/<id>.json` (`{ schemaVersion: 1, ...Bauplan }`)
 * und die Stil-Vorgabe als `stil.json`. Gelesen und geschrieben wie in den anderen Editoren: über den Dev-Endpunkt
 * auf dem Mac (`/__content/creatures/…`), ohne Verbindung lokal (Browser-Speicher) plus „Teilen“; das App-Bündel
 * (`import.meta.glob`) ist der Rückfall ohne Mac.
 */

export const VORLAGEN_DIR = 'creatures/vorlagen';
export const STIL_DIR = 'creatures';
export const STIL_FILE = 'stil.json';
const FILE_RE = /^[a-zA-Z0-9_.-]+\.json$/;

export type DateiOrt = 'Mac' | 'App' | 'Lokal';

export interface VorlagenDatei {
  file: string;
  name: string;
  bauplan: Bauplan;
  ort: DateiOrt;
}

// Gebündelte Dateien (Rückfall ohne Mac). Selbst-akzeptierend: Neue oder geänderte Dateien (Sichern auf dem Mac)
// laden nur dieses Modul neu, nicht das Lab — der Verlauf bleibt erhalten; im Dev-Server liest das Lab ohnehin vom Mac.
const BUNDLE_VORLAGEN = import.meta.glob<unknown>('@content/creatures/vorlagen/*.json', { eager: true, import: 'default' });
const BUNDLE_STIL = import.meta.glob<unknown>('@content/creatures/stil.json', { eager: true, import: 'default' });
if (import.meta.hot) import.meta.hot.accept();

const baseName = (p: string) => p.split('/').pop() ?? p;

function eintrag(file: string, json: unknown, ort: DateiOrt): VorlagenDatei {
  const bauplan = bereinigeBauplan(json);
  return { file, name: bauplan.name || file.replace(/\.json$/, ''), bauplan, ort };
}

/** Vorlagen aus dem App-Bündel. */
export function gebuendelteVorlagen(): VorlagenDatei[] {
  return Object.entries(BUNDLE_VORLAGEN)
    .map(([p, json]) => eintrag(baseName(p), json, 'App'))
    .sort((a, b) => a.name.localeCompare(b.name, 'de'));
}

/** Stil-Vorgabe aus dem App-Bündel (null, solange `content/creatures/stil.json` fehlt). */
export function gebuendelterStil(): WesenStil | null {
  const json = Object.values(BUNDLE_STIL)[0];
  return json ? bereinigeStil(json) : null;
}

/** Dateiname aus einem Wesennamen: klein, Umlaute ausgeschrieben, sonst nur a–z, 0–9 und Bindestrich. */
export function dateiId(name: string): string {
  const s = name
    .trim()
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return s || 'wesen';
}

/** JSON einer Vorlagendatei: `schemaVersion` zuerst, dann der vollständige Bauplan (alle Vorgaben ausgeschrieben). */
export function vorlagenJson(b: Bauplan): Record<string, unknown> {
  return { ...b, schemaVersion: 1 };
}

/** JSON der Stil-Vorgabe. */
export function stilJson(stil: WesenStil): Record<string, unknown> {
  return { schemaVersion: 1, ...stil };
}

async function leseMac(dir: string, file: string): Promise<unknown | null> {
  const r = await contentFetch(contentUrl(dir, file), {}, 5000);
  if (!r.ok) return null;
  return (await r.json()) as unknown;
}

async function listeMac(dir: string): Promise<string[]> {
  const r = await contentFetch(contentUrl(dir), {}, 5000);
  if (r.status === 404) return []; // älterer Endpunkt: Ordner gibt es noch nicht (erste Vorlage legt ihn an)
  if (!r.ok) throw new Error(`${r.status}`);
  const j = (await r.json()) as { files?: unknown };
  return Array.isArray(j.files) ? j.files.filter((f): f is string => typeof f === 'string' && FILE_RE.test(f) && !f.startsWith('_')) : [];
}

/**
 * Alle gespeicherten Vorlagen: mit Mac dessen Ordner (eine lokale Fassung, die der Mac noch nicht hat, gewinnt);
 * ohne Mac das App-Bündel plus lokale Sicherungen. `online` = der Mac hat geantwortet.
 */
export async function ladeVorlagenDateien(): Promise<{ online: boolean; dateien: VorlagenDatei[] }> {
  const lokal = new Map(localList(VORLAGEN_DIR).map((f) => [f, localGet(VORLAGEN_DIR, f)] as const));
  const out = new Map<string, VorlagenDatei>();
  let online = false;
  if (await useContentTarget.getState().check()) {
    try {
      const names = await listeMac(VORLAGEN_DIR);
      const jsons = await Promise.all(names.map((f) => leseMac(VORLAGEN_DIR, f).catch(() => null)));
      names.forEach((f, i) => {
        const json = jsons[i];
        if (json) out.set(f, eintrag(f, json, 'Mac'));
      });
      online = true;
    } catch {
      online = false;
    }
  }
  if (!online) for (const d of gebuendelteVorlagen()) out.set(d.file, d);
  for (const [f, l] of lokal) {
    if (!l) continue;
    const mac = out.get(f);
    if (online && mac && JSON.stringify(vorlagenJson(mac.bauplan)) === JSON.stringify(vorlagenJson(bereinigeBauplan(l.json)))) {
      localRemove(VORLAGEN_DIR, f); // Mac hat denselben Stand: lokale Kopie erledigt
      continue;
    }
    out.set(f, eintrag(f, l.json, 'Lokal'));
  }
  return { online, dateien: [...out.values()].sort((a, b) => a.name.localeCompare(b.name, 'de')) };
}

/** Stil-Vorgabe: Mac (oder lokale Fassung), sonst Bündel. null = keine Datei (Standard des Materials gilt). */
export async function ladeStilVorgabe(): Promise<{ stil: WesenStil; quelle: 'Mac' | 'App' | 'Lokal' } | null> {
  const lokal = localGet(STIL_DIR, STIL_FILE);
  if (lokal) return { stil: bereinigeStil(lokal.json), quelle: 'Lokal' };
  if (await useContentTarget.getState().check()) {
    try {
      // erst nachsehen, dann lesen (keine 404 im Log, solange es noch keine stil.json gibt)
      if (!(await listeMac(STIL_DIR)).includes(STIL_FILE)) return null;
      const json = await leseMac(STIL_DIR, STIL_FILE);
      if (json) return { stil: bereinigeStil(json), quelle: 'Mac' };
      return null;
    } catch {
      /* offline → Bündel */
    }
  }
  const b = gebuendelterStil();
  return b ? { stil: b, quelle: 'App' } : null;
}

export interface SpeicherErgebnis {
  ok: boolean;
  ziel: 'mac' | 'lokal' | null;
  /** Datei existiert schon (nur mit `pruefen`): Rückfrage nötig. */
  existiert?: boolean;
  text: string;
}

async function schreibe(dir: string, file: string, json: unknown, label: string, pruefen: boolean): Promise<SpeicherErgebnis> {
  if (!FILE_RE.test(file)) return { ok: false, ziel: null, text: 'Dateiname: nur Buchstaben, Ziffern, _ - . und .json' };
  if (await useContentTarget.getState().check()) {
    try {
      if (pruefen && (await listeMac(dir)).includes(file)) return { ok: false, ziel: 'mac', existiert: true, text: `${file} gibt es schon` };
      const r = await contentFetch(contentUrl(dir, file), { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(json) }, 10000);
      if (!r.ok) {
        const body = (await r.json().catch(() => ({}))) as { error?: string };
        return { ok: false, ziel: 'mac', text: `Abgelehnt: ${body.error ?? `${r.status} ${r.statusText}`}` };
      }
      localRemove(dir, file);
      return { ok: true, ziel: 'mac', text: `Gespeichert auf dem Mac: content/${dir}/${file}` };
    } catch {
      /* Verbindung weg → lokal */
    }
  }
  if (!localPut(dir, file, json)) return { ok: false, ziel: 'lokal', text: 'Lokaler Speicher voll — „Teilen“ nutzen' };
  return { ok: true, ziel: 'lokal', text: `Mac nicht erreichbar · lokal gesichert (${label}) — „Teilen“ schickt die Datei weiter` };
}

/**
 * Vorlage sichern: `content/creatures/vorlagen/<file>` auf dem Mac, sonst lokal. Mit `pruefen` meldet es eine schon
 * vorhandene Datei, statt sie zu überschreiben (Rückfrage im Panel).
 */
export function sichereVorlage(file: string, b: Bauplan, pruefen: boolean): Promise<SpeicherErgebnis> {
  return schreibe(VORLAGEN_DIR, file, vorlagenJson(b), file, pruefen);
}

/** Stil-Vorgabe sichern: `content/creatures/stil.json`. */
export function sichereStil(stil: WesenStil): Promise<SpeicherErgebnis> {
  return schreibe(STIL_DIR, STIL_FILE, stilJson(stil), STIL_FILE, false);
}

/** Teilen-Menü (App, Safari) bzw. Download (Desktop). */
export function teileVorlage(file: string, b: Bauplan): Promise<ShareOutcome> {
  return shareJson(file, vorlagenJson(b), `Wesen-Vorlage ${b.name}`);
}
