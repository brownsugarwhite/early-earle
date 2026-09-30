import { z } from 'zod';
import { ZoneSchema } from '@ee/core';
import { contentFetch, contentUrl, useContentTarget } from '../content/target';
import { localGet, localPut, localRemove } from '../content/local';

/**
 * Data of the Map-Editor: the four zones (`content/zones/*.json`) and the ten Earle worlds
 * (`content/zones/worlds/NN.json`). Reads and writes like the other editors — the Mac's content/ folder (dev server,
 * or the Mac in the WLAN from the app), else the files bundled with the app plus local saves.
 */
export type MapKind = 'welt' | 'zone';
export type MapSource = 'Mac' | 'App' | 'Lokal';
export type Json = Record<string, unknown>;

export interface MapFile {
  kind: MapKind;
  dir: 'zones' | 'zones/worlds';
  file: string;
  json: Json;
  source: MapSource;
  /** A local save that the Mac does not have yet (loaded instead of the Mac's file). */
  pendingLocal: boolean;
}

const bundledZones = import.meta.glob<Json>('@content/zones/*.json', { eager: true, import: 'default' });
const bundledWorlds = import.meta.glob<Json>('@content/zones/worlds/*.json', { eager: true, import: 'default' });

const baseName = (path: string) => path.split('/').pop()!;
const dirOf = (kind: MapKind): MapFile['dir'] => (kind === 'welt' ? 'zones/worlds' : 'zones');

function bundled(kind: MapKind): Array<{ file: string; json: Json }> {
  const mods = kind === 'welt' ? bundledWorlds : bundledZones;
  return Object.entries(mods)
    .map(([path, json]) => ({ file: baseName(path), json: structuredClone(json) }))
    .sort((a, b) => a.file.localeCompare(b.file));
}

/** Worlds in reference order (01 … 10), zones in level order. */
export function sortFiles(files: MapFile[]): MapFile[] {
  const rank = (f: MapFile) => (f.kind === 'zone' ? (((f.json.levelRange as number[] | undefined)?.[0] ?? 999) as number) : Number((f.json.index as number | undefined) ?? 99));
  return [...files].sort((a, b) => (a.kind === b.kind ? rank(a) - rank(b) || a.file.localeCompare(b.file) : a.kind === 'welt' ? -1 : 1));
}

async function listMac(dir: MapFile['dir']): Promise<string[]> {
  const r = await contentFetch(contentUrl(dir), {}, 5000);
  if (!r.ok) throw new Error(`${r.status}`);
  const j = (await r.json()) as { files?: unknown };
  return Array.isArray(j.files) ? j.files.filter((f): f is string => typeof f === 'string' && /^[a-zA-Z0-9_.-]+\.json$/.test(f)) : [];
}

async function readMac(dir: MapFile['dir'], file: string): Promise<Json | null> {
  const r = await contentFetch(contentUrl(dir, file), {}, 5000);
  if (!r.ok) return null;
  return (await r.json()) as Json;
}

/** All zone and world files with their source; `online` = the Mac answered. */
export async function loadMapFiles(): Promise<{ online: boolean; files: MapFile[] }> {
  const out: MapFile[] = [];
  let online = await useContentTarget.getState().check();
  if (online) {
    try {
      for (const kind of ['welt', 'zone'] as const) {
        const dir = dirOf(kind);
        const names = await listMac(dir);
        const jsons = await Promise.all(names.map((f) => readMac(dir, f)));
        names.forEach((file, i) => {
          const json = jsons[i];
          if (!json) return;
          const local = localGet(dir, file);
          if (local && JSON.stringify(local.json) !== JSON.stringify(json)) out.push({ kind, dir, file, json: local.json as Json, source: 'Lokal', pendingLocal: true });
          else {
            if (local) localRemove(dir, file);
            out.push({ kind, dir, file, json, source: 'Mac', pendingLocal: false });
          }
        });
      }
    } catch {
      online = false;
      out.length = 0;
    }
  }
  if (!online) {
    for (const kind of ['welt', 'zone'] as const) {
      const dir = dirOf(kind);
      for (const { file, json } of bundled(kind)) {
        const local = localGet(dir, file);
        out.push(local ? { kind, dir, file, json: local.json as Json, source: 'Lokal', pendingLocal: false } : { kind, dir, file, json, source: 'App', pendingLocal: false });
      }
    }
  }
  return { online, files: sortFiles(out) };
}

export interface MapSaveResult {
  ok: boolean;
  target: 'mac' | 'lokal' | null;
  message: string;
}

export async function saveMapFile(f: Pick<MapFile, 'dir' | 'file'>, json: Json): Promise<MapSaveResult> {
  const path = `content/${f.dir}/${f.file}`;
  if (await useContentTarget.getState().check()) {
    try {
      const r = await contentFetch(contentUrl(f.dir, f.file), { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(json) }, 10000);
      if (!r.ok) {
        const body = (await r.json().catch(() => ({}))) as { error?: string };
        return { ok: false, target: 'mac', message: `Abgelehnt: ${body.error ?? r.status}` };
      }
      localRemove(f.dir, f.file);
      return { ok: true, target: 'mac', message: `Gespeichert auf dem Mac: ${path}` };
    } catch {
      /* connection lost → local */
    }
  }
  if (!localPut(f.dir, f.file, json)) return { ok: false, target: 'lokal', message: 'Lokaler Speicher voll — „Teilen“ nutzen' };
  return { ok: true, target: 'lokal', message: `Lokal gespeichert: ${f.file} — „Teilen“ schickt die Datei weiter` };
}

// ---- validation ----------------------------------------------------------------------------------------------

const Hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Farbe als #rrggbb');
const HexRamp = z.array(Hex).min(1);

/** Light schema for world files: what the renderer needs; everything else passes through untouched. */
const WorldSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().min(1),
    index: z.number().int().min(0),
    ref: z.string().min(1),
    name: z.string().min(1),
    zone: z.enum(['tjorizo', 'syrup', 'luzz', 'wooding']),
    palette: z
      .object({
        ink: Hex,
        terrain: HexRamp,
        canopy: HexRamp,
        sky: HexRamp,
        fog: HexRamp.optional(),
        fogAlpha: z.array(z.number().min(0).max(1)).optional(),
        accent: HexRamp.optional(),
        canopyVariants: z.array(HexRamp).optional(),
      })
      .passthrough(),
    terrain: z.object({ amplitude: z.number().min(0), wavelength: z.number().positive() }).passthrough(),
    vegetation: z.object({ density: z.number().min(0) }).passthrough(),
    fog: z.object({ start: z.number(), range: z.number().positive() }).passthrough(),
    view: z.object({ fov: z.number().min(10).max(120) }).passthrough(),
  })
  .passthrough();

export interface MapIssue {
  path: string;
  message: string;
}

export function validateMap(kind: MapKind, json: unknown): MapIssue[] {
  const r = (kind === 'zone' ? ZoneSchema : WorldSchema).safeParse(json);
  if (r.success) return [];
  return r.error.issues.slice(0, 12).map((i) => ({ path: i.path.join('.'), message: i.message }));
}

// ---- editing helpers ------------------------------------------------------------------------------------------

export function getAt(json: unknown, path: Array<string | number>): unknown {
  let cur: unknown = json;
  for (const k of path) {
    if (cur === null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string | number, unknown>)[k];
  }
  return cur;
}

/** Immutable set at a path (arrays and objects are copied along the way). */
export function setAt(json: Json, path: Array<string | number>, value: unknown): Json {
  const rec = (node: unknown, i: number): unknown => {
    if (i === path.length) return value;
    const key = path[i]!;
    const base = Array.isArray(node) ? [...node] : { ...((node as Record<string, unknown>) ?? {}) };
    (base as Record<string | number, unknown>)[key] = rec((node as Record<string | number, unknown> | undefined)?.[key], i + 1);
    return base;
  };
  return rec(json, 0) as Json;
}

export const isHex = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);
