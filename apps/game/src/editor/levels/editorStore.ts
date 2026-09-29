import { create } from 'zustand';
import { LEVELS } from '../../content/levels';
import {
  DEFAULT_TOOL_PARAMS,
  cycleMask,
  emptyDraft,
  levelNumber,
  maskAt,
  normalizeDraft,
  placeTool,
  removeAt,
  setMask,
  toggleFence,
  type Cell,
  type LevelDraft,
  type MaskChar,
  type ToolId,
  type ToolParams,
} from './draft';
import { validateDraft, type ValidationResult } from './validation';
import { usePreviewStore } from './previewStore';
import { FILE_NAME_RE, deleteLevelFile, getLevelFile, listLevelFiles, putLevelFile } from './contentClient';

export interface FileEntry {
  file: string;
  id: string;
  name: string;
  /** Es liegt ein lokaler, ungespeicherter Entwurf für diese Datei vor. */
  hasDraft: boolean;
}

export type TabId = 'raster' | 'elemente' | 'ziele' | 'spawn' | 'solver' | 'ascii';
export type SheetSize = 'peek' | 'half' | 'full';
export type RasterMode = 'mask' | 'fence';

export interface Toast {
  id: number;
  text: string;
  kind: 'ok' | 'error' | 'info';
}

export interface EditorState {
  endpoint: 'unknown' | 'ok' | 'offline';
  loading: boolean;
  busy: boolean;
  files: FileEntry[];
  /** Datei, aus der der Entwurf geladen wurde (null bei Neu/Duplikat). */
  activeFile: string | null;
  /** Datei, in die „Speichern“ schreibt. */
  targetFile: string;
  /** Normalisiertes JSON des geladenen Stands (für „ungespeichert“ und Konfliktprüfung). */
  savedJson: string | null;
  draft: LevelDraft | null;
  dirty: boolean;
  validation: ValidationResult;
  past: LevelDraft[];
  future: LevelDraft[];
  lastOpKey: string | null;
  lastOpAt: number;
  tab: TabId;
  sheet: SheetSize;
  tool: ToolId;
  toolParams: ToolParams;
  rasterMode: RasterMode;
  paintChar: MaskChar;
  strokeId: number;
  pendingPortalId: string | null;
  toast: Toast | null;

  init: () => Promise<void>;
  refreshFiles: () => Promise<void>;
  openFile: (file: string) => Promise<void>;
  update: (fn: (d: LevelDraft) => LevelDraft, opKey?: string) => void;
  undo: () => void;
  redo: () => void;
  paintStart: (at: Cell) => void;
  paintMove: (at: Cell) => void;
  fenceStroke: (a: Cell, b: Cell, newStroke: boolean) => void;
  place: (at: Cell, tool?: ToolId) => void;
  erase: (at: Cell) => void;
  save: () => Promise<boolean>;
  revert: () => void;
  duplicate: () => void;
  createNew: () => void;
  deleteFile: () => Promise<void>;
  download: () => void;
  share: () => Promise<void>;
  syncPreview: () => void;
  setTab: (tab: TabId) => void;
  setSheet: (sheet: SheetSize) => void;
  cycleSheet: () => void;
  setTool: (tool: ToolId) => void;
  setToolParams: (patch: Partial<ToolParams>) => void;
  setRasterMode: (mode: RasterMode) => void;
  setTargetFile: (file: string) => void;
  showToast: (text: string, kind?: Toast['kind']) => void;
  hideToast: () => void;
}

// ---- localStorage -------------------------------------------------------------------------

const DRAFT_PREFIX = 'ee.editor.levels.draft.';
const SESSION_KEY = 'ee.editor.levels.session';
const PENDING_TOAST_KEY = 'ee.editor.levels.pendingToast';

interface StoredDraft {
  draft: unknown;
  activeFile: string | null;
  at: number;
}
interface Session {
  file: string | null;
  tab: TabId;
  sheet: SheetSize;
  attempt: number;
}

function lsGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function lsSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* privat / voll */
  }
}
function lsRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignorieren */
  }
}
function readStoredDraft(file: string): StoredDraft | null {
  const raw = lsGet(DRAFT_PREFIX + file);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredDraft;
  } catch {
    return null;
  }
}
function hasStoredDraft(file: string): boolean {
  return lsGet(DRAFT_PREFIX + file) !== null;
}
function readSession(): Session | null {
  const raw = lsGet(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

let initStarted = false;
let autosaveTimer: ReturnType<typeof setTimeout> | null = null;
let toastTimer: ReturnType<typeof setTimeout> | null = null;
let toastSeq = 0;

const normalizedJson = (raw: unknown): string => JSON.stringify(normalizeDraft(raw));

function fileNameForNumber(n: number): string {
  return `${String(n).padStart(3, '0')}.json`;
}

export const useEditorStore = create<EditorState>((set, get) => {
  const writeSession = () => {
    const { targetFile, tab, sheet } = get();
    const s: Session = { file: targetFile || null, tab, sheet, attempt: usePreviewStore.getState().attempt };
    lsSet(SESSION_KEY, JSON.stringify(s));
  };
  const autosaveNow = () => {
    autosaveTimer = null;
    const { draft, targetFile, activeFile, dirty } = get();
    if (!draft || !targetFile) return;
    if (dirty) {
      const stored: StoredDraft = { draft, activeFile, at: Date.now() };
      lsSet(DRAFT_PREFIX + targetFile, JSON.stringify(stored));
    } else lsRemove(DRAFT_PREFIX + targetFile);
    set({ files: get().files.map((f) => ({ ...f, hasDraft: hasStoredDraft(f.file) })) });
  };
  const scheduleAutosave = () => {
    if (autosaveTimer) clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(autosaveNow, 250);
  };
  /** Vor einem Datei-/Entwurfswechsel den ausstehenden Autosave sofort schreiben (sonst träfe er den neuen Entwurf). */
  const flushAutosave = () => {
    if (!autosaveTimer) return;
    clearTimeout(autosaveTimer);
    autosaveNow();
  };
  const isDirty = (draft: LevelDraft, savedJson: string | null): boolean => savedJson === null || JSON.stringify(normalizeDraft(draft)) !== savedJson;

  const applyDraft = (draft: LevelDraft, patch: Partial<EditorState> = {}) => {
    const validation = validateDraft(draft);
    set({ draft, validation, dirty: isDirty(draft, patch.savedJson !== undefined ? patch.savedJson : get().savedJson), ...patch });
    scheduleAutosave();
    get().syncPreview();
  };

  return {
    endpoint: 'unknown',
    loading: true,
    busy: false,
    files: [],
    activeFile: null,
    targetFile: '',
    savedJson: null,
    draft: null,
    dirty: false,
    validation: { ok: false, level: null, errors: [], warnings: [] },
    past: [],
    future: [],
    lastOpKey: null,
    lastOpAt: 0,
    tab: 'raster',
    sheet: 'half',
    tool: 'blob',
    toolParams: { ...DEFAULT_TOOL_PARAMS },
    rasterMode: 'mask',
    paintChar: '#',
    strokeId: 0,
    pendingPortalId: null,
    toast: null,

    init: async () => {
      if (get().draft || initStarted) return; // StrictMode: Effekt läuft doppelt
      initStarted = true;
      set({ loading: true });
      const session = readSession();
      const urlFile = new URLSearchParams(location.search).get('file');
      if (session) {
        set({ tab: session.tab ?? 'raster', sheet: session.sheet ?? 'half' });
        if (session.attempt) usePreviewStore.setState({ attempt: session.attempt });
      }
      await get().refreshFiles();
      const files = get().files;
      const wanted = urlFile && FILE_NAME_RE.test(urlFile) ? urlFile : session?.file;
      const file = (wanted && (files.some((f) => f.file === wanted) || hasStoredDraft(wanted) ? wanted : null)) ?? files[0]?.file ?? null;
      if (file) await get().openFile(file);
      else get().createNew();
      const pending = lsGet(PENDING_TOAST_KEY);
      if (pending) {
        lsRemove(PENDING_TOAST_KEY);
        get().showToast(pending, 'ok');
      }
      set({ loading: false });
    },

    refreshFiles: async () => {
      let names: string[] | null = null;
      if (import.meta.env.DEV) {
        try {
          names = await listLevelFiles();
          set({ endpoint: 'ok' });
        } catch {
          names = null;
          set({ endpoint: 'offline' });
        }
      } else set({ endpoint: 'offline' });

      if (names === null) {
        // Produktions-Build: die gebündelten Level (001…), Entwürfe nur lokal.
        const bundled: FileEntry[] = LEVELS.map((l, i) => ({ file: fileNameForNumber(i + 1), id: l.id, name: l.name ?? l.id, hasDraft: false }));
        set({ files: bundled.map((f) => ({ ...f, hasDraft: hasStoredDraft(f.file) })) });
        return;
      }
      const numeric = names.filter((n) => /^\d{3}\.json$/.test(n)).sort();
      const drafts = names.filter((n) => n.startsWith('_') && n !== '_calibration.json').sort();
      const entries: FileEntry[] = numeric.map((file, i) => {
        const l = LEVELS[i];
        return { file, id: l?.id ?? file, name: l?.name ?? l?.id ?? file, hasDraft: hasStoredDraft(file) };
      });
      const draftEntries = await Promise.all(
        drafts.map(async (file): Promise<FileEntry> => {
          try {
            const raw = (await getLevelFile(file)) as { id?: unknown; name?: unknown } | null;
            const id = typeof raw?.id === 'string' ? raw.id : file;
            const name = typeof raw?.name === 'string' ? raw.name : id;
            return { file, id, name, hasDraft: hasStoredDraft(file) };
          } catch {
            return { file, id: file, name: '—', hasDraft: hasStoredDraft(file) };
          }
        }),
      );
      set({ files: [...entries, ...draftEntries] });
    },

    openFile: async (file) => {
      flushAutosave();
      set({ loading: true });
      let raw: unknown = null;
      if (get().endpoint === 'ok') {
        try {
          raw = await getLevelFile(file);
        } catch (e) {
          get().showToast(`Laden fehlgeschlagen: ${e instanceof Error ? e.message : String(e)}`, 'error');
          set({ loading: false });
          return;
        }
      } else {
        const idx = get().files.findIndex((f) => f.file === file);
        raw = idx >= 0 ? LEVELS[idx] ?? null : null;
      }
      const stored = readStoredDraft(file);
      if (raw === null && !stored) {
        get().showToast(`${file} nicht gefunden`, 'error');
        set({ loading: false });
        return;
      }
      const diskJson = raw === null ? null : normalizedJson(raw);
      let draft = raw === null ? null : normalizeDraft(raw);
      let restored = false;
      if (stored) {
        const sd = normalizeDraft(stored.draft);
        if (diskJson === null || JSON.stringify(sd) !== diskJson) {
          draft = sd;
          restored = true;
        } else lsRemove(DRAFT_PREFIX + file);
      }
      if (!draft) draft = emptyDraft();
      const activeFile = raw === null ? (stored?.activeFile ?? null) : file;
      set({
        activeFile,
        targetFile: file,
        past: [],
        future: [],
        lastOpKey: null,
        pendingPortalId: null,
        loading: false,
      });
      applyDraft(draft, { savedJson: diskJson });
      set({ dirty: restored || diskJson === null });
      writeSession();
      if (restored) get().showToast('Lokalen Entwurf wiederhergestellt', 'info');
    },

    update: (fn, opKey) => {
      const { draft, past, lastOpKey, lastOpAt } = get();
      if (!draft) return;
      const next = fn(draft);
      if (next === draft) return;
      const now = Date.now();
      const coalesce = opKey !== undefined && opKey === lastOpKey && now - lastOpAt < 1000;
      const newPast = coalesce ? past : [...past.slice(-59), draft];
      set({ past: newPast, future: [], lastOpKey: opKey ?? null, lastOpAt: now });
      applyDraft(next);
    },

    undo: () => {
      const { draft, past, future } = get();
      if (!draft || past.length === 0) return;
      const prev = past[past.length - 1]!;
      set({ past: past.slice(0, -1), future: [draft, ...future].slice(0, 60), lastOpKey: null, pendingPortalId: null });
      applyDraft(prev);
    },

    redo: () => {
      const { draft, past, future } = get();
      if (!draft || future.length === 0) return;
      const next = future[0]!;
      set({ past: [...past, draft].slice(-60), future: future.slice(1), lastOpKey: null });
      applyDraft(next);
    },

    paintStart: (at) => {
      const { draft } = get();
      if (!draft) return;
      const ch = cycleMask(maskAt(draft, at));
      const strokeId = get().strokeId + 1;
      set({ paintChar: ch, strokeId });
      get().update((d) => setMask(d, at, ch), `paint-${strokeId}`);
    },

    paintMove: (at) => {
      const { paintChar, strokeId } = get();
      get().update((d) => setMask(d, at, paintChar), `paint-${strokeId}`);
    },

    fenceStroke: (a, b, newStroke) => {
      const strokeId = newStroke ? get().strokeId + 1 : get().strokeId;
      if (newStroke) set({ strokeId });
      get().update((d) => toggleFence(d, a, b), `fence-${strokeId}`);
    },

    place: (at, toolOverride) => {
      const { draft, tool, toolParams, pendingPortalId } = get();
      if (!draft) return;
      const r = placeTool(draft, toolOverride ?? tool, toolParams, at, pendingPortalId);
      if (r.error) {
        get().showToast(r.error, 'error');
        return;
      }
      if (r.pendingPortalId !== undefined) set({ pendingPortalId: r.pendingPortalId });
      get().update(() => r.draft);
    },

    erase: (at) => {
      get().update((d) => removeAt(d, at));
    },

    save: async () => {
      const { draft, validation, targetFile, activeFile, savedJson, endpoint, busy } = get();
      if (!draft || busy) return false;
      if (!validation.ok) {
        get().showToast(`Nicht gespeichert: ${validation.errors.length} Fehler`, 'error');
        return false;
      }
      if (!FILE_NAME_RE.test(targetFile)) {
        get().showToast('Dateiname: nur Buchstaben, Ziffern, _ - . und .json', 'error');
        return false;
      }
      if (endpoint !== 'ok') {
        get().download();
        return false;
      }
      set({ busy: true });
      try {
        const existing = await getLevelFile(targetFile);
        if (existing !== null) {
          if (targetFile !== activeFile) {
            if (!window.confirm(`${targetFile} existiert schon. Überschreiben?`)) return false;
          } else if (savedJson !== null && normalizedJson(existing) !== savedJson) {
            if (!window.confirm(`${targetFile} wurde inzwischen auf der Platte geändert. Überschreiben?`)) return false;
          }
        }
        const json = normalizeDraft(draft);
        const r = await putLevelFile(targetFile, json);
        if (!r.ok) {
          const issues = Array.isArray(r.body.issues) ? ` (${(r.body.issues as { message?: string }[]).map((i) => i.message ?? '').join('; ')})` : '';
          get().showToast(`Speichern abgelehnt: ${r.body.error}${issues}`, 'error');
          return false;
        }
        const saved = JSON.stringify(json);
        lsRemove(DRAFT_PREFIX + targetFile);
        set({ activeFile: targetFile, savedJson: saved, dirty: false });
        writeSession();
        // Vite lädt die Seite nach der Dateiänderung neu (JSON-HMR); der Hinweis überlebt das.
        lsSet(PENDING_TOAST_KEY, `Gespeichert: ${targetFile}`);
        get().showToast(`Gespeichert: ${targetFile}`, 'ok');
        await get().refreshFiles();
        setTimeout(() => lsRemove(PENDING_TOAST_KEY), 4000);
        return true;
      } catch (e) {
        get().showToast(`Speichern fehlgeschlagen: ${e instanceof Error ? e.message : String(e)}`, 'error');
        return false;
      } finally {
        set({ busy: false });
      }
    },

    revert: () => {
      const { savedJson, targetFile } = get();
      lsRemove(DRAFT_PREFIX + targetFile);
      if (savedJson === null) {
        get().showToast('Kein gespeicherter Stand — Entwurf bleibt', 'info');
        return;
      }
      set({ past: [], future: [], pendingPortalId: null });
      applyDraft(normalizeDraft(JSON.parse(savedJson)));
      get().showToast('Zurückgesetzt', 'info');
    },

    duplicate: () => {
      const { draft, activeFile, targetFile } = get();
      if (!draft) return;
      flushAutosave();
      const base = (activeFile ?? targetFile).replace(/\.json$/, '').replace(/^_/, '');
      const copy: LevelDraft = { ...draft, id: `${draft.id}-kopie`, name: `${draft.name ?? draft.id} (Kopie)` };
      set({ activeFile: null, targetFile: `_kopie-${base}.json`, past: [], future: [], pendingPortalId: null });
      applyDraft(copy, { savedJson: null });
      writeSession();
      get().showToast('Kopie angelegt — Dateiname prüfen, dann speichern', 'info');
    },

    createNew: () => {
      flushAutosave();
      const { files, draft } = get();
      const maxNo = files.reduce((m, f) => Math.max(m, levelNumber(f.file.replace(/\.json$/, ''))), 0);
      const no = maxNo + 1;
      const zone = draft?.zone ?? 'tjorizo';
      const d = emptyDraft(`${zone}-${String(no).padStart(3, '0')}`, zone);
      set({ activeFile: null, targetFile: `_neu-${String(no).padStart(3, '0')}.json`, past: [], future: [], pendingPortalId: null, loading: false });
      applyDraft(d, { savedJson: null });
      writeSession();
    },

    deleteFile: async () => {
      const { activeFile, targetFile, endpoint, files } = get();
      const file = activeFile ?? targetFile;
      if (!file.startsWith('_')) {
        get().showToast('Nur _-Dateien (Entwürfe) lassen sich löschen', 'error');
        return;
      }
      if (!window.confirm(`${file} wirklich löschen?`)) return;
      lsRemove(DRAFT_PREFIX + file);
      if (endpoint === 'ok' && files.some((f) => f.file === file)) {
        try {
          await deleteLevelFile(file);
        } catch (e) {
          get().showToast(`Löschen fehlgeschlagen: ${e instanceof Error ? e.message : String(e)}`, 'error');
          return;
        }
      }
      get().showToast(`Gelöscht: ${file}`, 'ok');
      lsSet(PENDING_TOAST_KEY, `Gelöscht: ${file}`);
      setTimeout(() => lsRemove(PENDING_TOAST_KEY), 4000);
      await get().refreshFiles();
      const next = get().files.find((f) => f.file !== file);
      if (next) await get().openFile(next.file);
      else get().createNew();
    },

    download: () => {
      const { draft, targetFile } = get();
      if (!draft) return;
      const text = JSON.stringify(normalizeDraft(draft), null, 2) + '\n';
      const blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = targetFile || 'level.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      get().showToast(`Heruntergeladen: ${a.download}`, 'ok');
    },

    share: async () => {
      const { draft, targetFile } = get();
      if (!draft) return;
      const text = JSON.stringify(normalizeDraft(draft), null, 2) + '\n';
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (typeof nav.share !== 'function') {
        get().download();
        return;
      }
      try {
        const file = new File([text], targetFile || 'level.json', { type: 'application/json' });
        if (nav.canShare?.({ files: [file] })) await nav.share({ files: [file], title: draft.name ?? draft.id });
        else await nav.share({ title: draft.name ?? draft.id, text });
        get().showToast('Geteilt', 'ok');
      } catch (e) {
        if (!(e instanceof DOMException && e.name === 'AbortError')) get().showToast('Teilen fehlgeschlagen', 'error');
      }
    },

    syncPreview: () => {
      const { validation } = get();
      const preview = usePreviewStore.getState();
      if (validation.level && preview.mode === 'edit') preview.loadDraft(validation.level);
    },

    setTab: (tab) => {
      set({ tab });
      writeSession();
    },
    setSheet: (sheet) => {
      set({ sheet });
      writeSession();
    },
    cycleSheet: () => {
      const { sheet } = get();
      get().setSheet(sheet === 'peek' ? 'half' : sheet === 'half' ? 'full' : 'peek');
    },
    setTool: (tool) => set({ tool, pendingPortalId: tool === 'portal' ? get().pendingPortalId : null }),
    setToolParams: (patch) => set({ toolParams: { ...get().toolParams, ...patch } }),
    setRasterMode: (rasterMode) => set({ rasterMode }),
    setTargetFile: (file) => {
      set({ targetFile: file.trim() });
      writeSession();
      scheduleAutosave();
    },
    showToast: (text, kind = 'info') => {
      if (toastTimer) clearTimeout(toastTimer);
      const id = ++toastSeq;
      set({ toast: { id, text, kind } });
      toastTimer = setTimeout(() => {
        if (get().toast?.id === id) set({ toast: null });
      }, kind === 'error' ? 5000 : 2800);
    },
    hideToast: () => set({ toast: null }),
  };
});
