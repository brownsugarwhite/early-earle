import { create } from 'zustand';
import { LEVELS } from '../../content/levels';
import {
  DEFAULT_TOOL_PARAMS,
  applyTool,
  blockerAt,
  emptyDraft,
  fenceIndex,
  isToolId,
  levelNumber,
  moundCells,
  normalizeDraft,
  serializeDraft,
  setFence,
  toolFromCell,
  toolInfo,
  toolPresent,
  type Cell,
  type LevelDraft,
  type StrokeAction,
  type ToolId,
  type ToolParams,
  type ZoneId,
} from './draft';
import { validateDraft, type ValidationResult } from './validation';
import { usePreviewStore } from './previewStore';
import { useSolverStore } from './solverStore';
import { FILE_NAME_RE, deleteLevelFile, getLevelFile, listLevelFiles, putLevelFile } from './contentClient';
import { buildTemplate, type TemplateId } from './templates';
import { haptic } from './haptics';
import { IS_NATIVE, useContentTarget } from '../content/target';
import { localGet, localList, localPut, localRemove } from '../content/local';
import { downloadJson, shareJson, shareMessage } from '../content/share';

/** Verzeichnis der Level im lokalen Speicher (wie content/levels). */
const LOCAL_DIR = 'levels';

export interface FileEntry {
  file: string;
  id: string;
  name: string;
  /** Es liegt ein lokaler, ungesicherter Entwurf für diese Datei vor. */
  hasDraft: boolean;
  /** Nur lokal (noch nie auf dem Mac gesichert). */
  localOnly?: boolean;
  /** Ohne Mac lokal gesichert — geht beim nächsten „Sichern“ mit Verbindung auf den Mac. */
  local?: boolean;
}

export type TabId = 'werkzeug' | 'ziele' | 'spawn' | 'solver' | 'kette' | 'datei' | 'ascii';
export const TAB_IDS: readonly TabId[] = ['werkzeug', 'ziele', 'spawn', 'solver', 'kette', 'datei', 'ascii'];
export type SheetSize = 'peek' | 'half' | 'full';

export interface Toast {
  id: number;
  text: string;
  kind: 'ok' | 'error' | 'info';
  action?: { label: string; run: () => void };
}

export interface ConfirmRequest {
  title: string;
  body?: string;
  ok: string;
  danger?: boolean;
  resolve: (ok: boolean) => void;
}

/** Kurzes Aufleuchten von Zellen nach einer Aktion (sichtbares „Haptik“-Feedback). */
export interface BoardFlash {
  cells: Cell[];
  kind: 'add' | 'remove' | 'error';
  seq: number;
}

interface Stroke {
  id: number;
  action: StrokeAction;
  fence: boolean;
}

export interface EditorState {
  endpoint: 'unknown' | 'ok' | 'offline';
  loading: boolean;
  busy: boolean;
  files: FileEntry[];
  /** Datei, aus der der Entwurf geladen wurde (null bei Neu/Duplikat/Vorlage). */
  activeFile: string | null;
  /** Datei, in die „Sichern“ schreibt. */
  targetFile: string;
  /** Normalisiertes JSON des geladenen Stands (für „ungesichert“ und Konfliktprüfung). */
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
  /** Sheet-Größe vor dem Testen (kommt beim Zurückschalten wieder). */
  sheetBeforePlay: SheetSize | null;
  /** Sheet-Größe vor dem Zellmenü (Handy: das Menü braucht die Bühne). */
  sheetBeforeMenu: SheetSize | null;
  tool: ToolId;
  toolParams: ToolParams;
  recentTools: ToolId[];
  opSeq: number;
  stroke: Stroke | null;
  pendingPortalId: string | null;
  cellMenu: Cell | null;
  flash: BoardFlash | null;
  toast: Toast | null;
  confirm: ConfirmRequest | null;
  /** Letzte Vorlage (für „nochmal würfeln“). */
  lastTemplate: { id: TemplateId; zone: ZoneId; file: string; reroll: number } | null;

  init: () => Promise<void>;
  refreshFiles: () => Promise<void>;
  openFile: (file: string) => Promise<void>;
  update: (fn: (d: LevelDraft) => LevelDraft, opKey?: string) => void;
  undo: () => void;
  redo: () => void;
  /** Einzelner Tipp mit dem aktuellen Werkzeug (schaltet um: setzen ↔ wegnehmen). */
  tapCell: (at: Cell) => void;
  strokeBegin: (at: Cell) => void;
  strokeTo: (at: Cell) => void;
  strokeEnd: () => void;
  /** Fossilwand an einer Kante: Tipp schaltet um, Wischen setzt/löscht wie der erste Übergang. */
  fenceEdge: (a: Cell, b: Cell, phase: 'tap' | 'begin' | 'move') => void;
  openCellMenu: (at: Cell) => void;
  closeCellMenu: () => void;
  editCell: (at: Cell, fn: (d: LevelDraft) => LevelDraft, key: string) => void;
  pickTool: (at: Cell) => void;
  save: () => Promise<boolean>;
  revert: () => void;
  duplicate: () => void;
  createNew: () => void;
  newFromTemplate: (id: TemplateId, zone: ZoneId) => void;
  deleteFile: (file?: string) => Promise<void>;
  download: () => void;
  share: () => Promise<void>;
  syncPreview: () => void;
  setTab: (tab: TabId) => void;
  /** Reiter öffnen und das Sheet mindestens auf `size` bringen. */
  openTab: (tab: TabId, size?: SheetSize) => void;
  setSheet: (sheet: SheetSize) => void;
  cycleSheet: () => void;
  setTool: (tool: ToolId) => void;
  setToolParams: (patch: Partial<ToolParams>) => void;
  setTargetFile: (file: string) => void;
  enterPlay: () => void;
  exitPlay: () => void;
  togglePlay: () => void;
  showToast: (text: string, kind?: Toast['kind'], action?: Toast['action']) => void;
  hideToast: () => void;
  requestConfirm: (req: Omit<ConfirmRequest, 'resolve'>) => Promise<boolean>;
  resolveConfirm: (ok: boolean) => void;
}

// ---- localStorage -------------------------------------------------------------------------

const DRAFT_PREFIX = 'ee.editor.levels.draft.';
const HIST_PREFIX = 'ee.editor.levels.hist.';
const HIST_INDEX_KEY = 'ee.editor.levels.histIndex';
const SESSION_KEY = 'ee.editor.levels.session';
const TOOLS_KEY = 'ee.editor.levels.tools';
const PENDING_TOAST_KEY = 'ee.editor.levels.pendingToast';
const HIST_LIMIT = 40;
const HIST_FILES = 16;
const SHEET_SIZES: readonly SheetSize[] = ['peek', 'half', 'full'];

interface StoredDraft {
  draft: unknown;
  activeFile: string | null;
  at: number;
}
interface StoredHist {
  v: 1;
  base: string;
  past: unknown[];
  future: unknown[];
  at: number;
}
interface Session {
  file: string | null;
  tab: TabId;
  sheet: SheetSize;
  attempt: number;
}
interface ToolPrefs {
  tool: ToolId;
  params: ToolParams;
  recent: ToolId[];
}

function lsGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function lsSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}
function lsRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignorieren */
  }
}
function lsKeys(prefix: string): string[] {
  const out: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) out.push(k);
    }
  } catch {
    /* ignorieren */
  }
  return out;
}
function readJson<T>(key: string): T | null {
  const raw = lsGet(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
const readStoredDraft = (file: string) => readJson<StoredDraft>(DRAFT_PREFIX + file);
const hasStoredDraft = (file: string) => lsGet(DRAFT_PREFIX + file) !== null;

function readSession(): Session | null {
  const s = readJson<Partial<Session>>(SESSION_KEY);
  if (!s) return null;
  const tab = TAB_IDS.includes(s.tab as TabId) ? (s.tab as TabId) : 'werkzeug';
  const sheet = SHEET_SIZES.includes(s.sheet as SheetSize) ? (s.sheet as SheetSize) : 'peek';
  return { file: typeof s.file === 'string' ? s.file : null, tab, sheet, attempt: typeof s.attempt === 'number' ? s.attempt : 1 };
}

function readToolPrefs(): ToolPrefs {
  const p = readJson<Partial<ToolPrefs>>(TOOLS_KEY);
  const tool = isToolId(p?.tool) ? p.tool : 'blob';
  const params = { ...DEFAULT_TOOL_PARAMS, ...(p?.params ?? {}) };
  const recent = Array.isArray(p?.recent) ? p.recent.filter(isToolId).slice(0, 6) : [];
  return { tool, params, recent: recent.length ? recent : ['blob', 'void', 'pillar', 'scrap'] };
}

function readHistory(file: string, base: string): { past: LevelDraft[]; future: LevelDraft[] } | null {
  const h = readJson<StoredHist>(HIST_PREFIX + file);
  if (!h || h.v !== 1 || h.base !== base) return null;
  return { past: h.past.map((d) => normalizeDraft(d)), future: h.future.map((d) => normalizeDraft(d)) };
}

function touchHistIndex(file: string | null, drop = false): void {
  const idx = readJson<Record<string, number>>(HIST_INDEX_KEY) ?? {};
  if (file) {
    if (drop) delete idx[file];
    else idx[file] = Date.now();
  }
  const files = Object.keys(idx).sort((a, b) => (idx[b] ?? 0) - (idx[a] ?? 0));
  for (const f of files.slice(HIST_FILES)) {
    lsRemove(HIST_PREFIX + f);
    delete idx[f];
  }
  lsSet(HIST_INDEX_KEY, JSON.stringify(idx));
}

let initStarted = false;
let autosaveTimer: ReturnType<typeof setTimeout> | null = null;
let histTimer: ReturnType<typeof setTimeout> | null = null;
let previewTimer: ReturnType<typeof setTimeout> | null = null;
let toastTimer: ReturnType<typeof setTimeout> | null = null;
let toastSeq = 0;
let flashSeq = 0;

const normalizedJson = (raw: unknown): string => JSON.stringify(normalizeDraft(raw));
const pad3 = (n: number) => String(n).padStart(3, '0');
const fileNameForNumber = (n: number): string => `${pad3(n)}.json`;
const isPhone = () => typeof window !== 'undefined' && window.innerWidth < 900 && !(window.innerHeight < 520 && window.innerWidth > window.innerHeight);

export const useEditorStore = create<EditorState>((set, get) => {
  const writeSession = () => {
    const { targetFile, tab, sheet, sheetBeforePlay } = get();
    const s: Session = { file: targetFile || null, tab, sheet: sheetBeforePlay ?? sheet, attempt: usePreviewStore.getState().attempt };
    lsSet(SESSION_KEY, JSON.stringify(s));
  };
  const writeToolPrefs = () => {
    const { tool, toolParams, recentTools } = get();
    lsSet(TOOLS_KEY, JSON.stringify({ tool, params: toolParams, recent: recentTools } satisfies ToolPrefs));
  };
  const writeHistoryNow = () => {
    histTimer = null;
    const { draft, targetFile, past, future } = get();
    if (!draft || !targetFile) return;
    if (past.length === 0 && future.length === 0) {
      lsRemove(HIST_PREFIX + targetFile);
      return;
    }
    const h: StoredHist = { v: 1, base: serializeDraft(draft), past: past.slice(-HIST_LIMIT), future: future.slice(0, HIST_LIMIT), at: Date.now() };
    if (!lsSet(HIST_PREFIX + targetFile, JSON.stringify(h))) {
      // Speicher voll: kürzen und nochmal.
      lsSet(HIST_PREFIX + targetFile, JSON.stringify({ ...h, past: h.past.slice(-10), future: h.future.slice(0, 5) }));
    }
    touchHistIndex(targetFile);
  };
  const autosaveNow = () => {
    autosaveTimer = null;
    const { draft, targetFile, activeFile, dirty } = get();
    if (!draft || !targetFile) return;
    if (dirty) {
      const stored: StoredDraft = { draft, activeFile, at: Date.now() };
      lsSet(DRAFT_PREFIX + targetFile, JSON.stringify(stored));
    } else lsRemove(DRAFT_PREFIX + targetFile);
    let files = get().files.map((f) => (f.file === targetFile && f.localOnly ? { ...f, name: draft.name ?? draft.id, id: draft.id } : f)).map((f) => ({ ...f, hasDraft: hasStoredDraft(f.file) }));
    // Neue, noch nie gesicherte Entwürfe tauchen sofort in der Kette auf.
    if (dirty && FILE_NAME_RE.test(targetFile) && !files.some((f) => f.file === targetFile)) {
      files = [...files, { file: targetFile, id: draft.id, name: draft.name ?? draft.id, hasDraft: true, localOnly: true }];
    }
    // Lokale Entwürfe ohne gespeicherten Stand verschwinden, wenn sie nicht mehr existieren (lokal gesicherte bleiben).
    files = files.filter((f) => !f.localOnly || f.hasDraft || f.local);
    set({ files });
  };
  const scheduleAutosave = () => {
    if (autosaveTimer) clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(autosaveNow, 250);
    if (histTimer) clearTimeout(histTimer);
    histTimer = setTimeout(writeHistoryNow, 700);
  };
  /** Vor einem Datei-/Entwurfswechsel ausstehende Schreibvorgänge sofort erledigen (sonst träfen sie den neuen Entwurf). */
  const flushAutosave = () => {
    if (autosaveTimer) {
      clearTimeout(autosaveTimer);
      autosaveNow();
    }
    if (histTimer) {
      clearTimeout(histTimer);
      writeHistoryNow();
    }
  };
  const isDirty = (draft: LevelDraft, savedJson: string | null): boolean => savedJson === null || serializeDraft(draft) !== savedJson;

  /** Vorschau nachziehen; während eines Strichs gedrosselt (Szene neu bauen kostet). */
  const syncPreviewSoon = () => {
    if (!get().stroke) {
      if (previewTimer) clearTimeout(previewTimer);
      previewTimer = null;
      get().syncPreview();
      return;
    }
    if (previewTimer) return;
    previewTimer = setTimeout(() => {
      previewTimer = null;
      get().syncPreview();
    }, 160);
  };

  const applyDraft = (draft: LevelDraft, patch: Partial<EditorState> = {}) => {
    const validation = validateDraft(draft);
    set({ draft, validation, dirty: isDirty(draft, patch.savedJson !== undefined ? patch.savedJson : get().savedJson), ...patch });
    scheduleAutosave();
    syncPreviewSoon();
    useSolverStore.getState().scheduleAuto(validation.level);
  };

  const flash = (cells: Cell[], kind: BoardFlash['kind']) => set({ flash: { cells, kind, seq: ++flashSeq } });

  const nextNumber = (): number => get().files.reduce((m, f) => Math.max(m, /^\d{3}\.json$/.test(f.file) ? levelNumber(f.file.replace(/\.json$/, '')) : 0), 0) + 1;

  /** Freier Dateiname (weder auf der Platte noch als lokaler Entwurf). */
  const uniqueFile = (base: string): string => {
    const taken = (f: string) => get().files.some((e) => e.file === f) || hasStoredDraft(f);
    if (!taken(`${base}.json`)) return `${base}.json`;
    for (let i = 2; i < 100; i++) if (!taken(`${base}-${i}.json`)) return `${base}-${i}.json`;
    return `${base}-${Date.now().toString(36)}.json`;
  };

  /** Woher der gesicherte Stand (`savedJson`) stammt: vom Mac bzw. Dev-Server oder aus App/lokalem Speicher. */
  let savedSource: 'mac' | 'local' = 'mac';

  /** Ohne Mac: den Entwurf als lokalen Stand sichern (übersteht Neustarts, geht später auf den Mac). */
  const saveLocal = (note: string): boolean => {
    const { draft, targetFile, activeFile } = get();
    if (!draft) return false;
    const json = normalizeDraft(draft);
    if (!localPut(LOCAL_DIR, targetFile, json)) {
      get().showToast('Lokaler Speicher voll — bitte „Teilen“ nutzen', 'error', { label: 'Teilen', run: () => void get().share() });
      haptic('error');
      return false;
    }
    lsRemove(DRAFT_PREFIX + targetFile);
    if (activeFile && activeFile !== targetFile) lsRemove(DRAFT_PREFIX + activeFile);
    savedSource = 'local';
    set({ activeFile: targetFile, savedJson: JSON.stringify(json), dirty: false, lastTemplate: null, endpoint: 'offline' });
    writeSession();
    writeHistoryNow();
    get().showToast(`${note}Lokal gespeichert: ${targetFile}`, 'ok', { label: 'Teilen', run: () => void get().share() });
    haptic('success');
    return true;
  };

  /** Neuen, noch ungesicherten Entwurf laden (Neu, Vorlage, Duplikat). */
  const loadFresh = (draft: LevelDraft, targetFile: string) => {
    flushAutosave();
    set({ activeFile: null, targetFile, past: [], future: [], lastOpKey: null, pendingPortalId: null, cellMenu: null, sheetBeforeMenu: null, loading: false });
    applyDraft(draft, { savedJson: null });
    writeSession();
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
    tab: 'werkzeug',
    sheet: 'peek',
    sheetBeforePlay: null,
    sheetBeforeMenu: null,
    ...(() => {
      const p = readToolPrefs();
      return { tool: p.tool, toolParams: p.params, recentTools: p.recent };
    })(),
    opSeq: 0,
    stroke: null,
    pendingPortalId: null,
    cellMenu: null,
    flash: null,
    toast: null,
    confirm: null,
    lastTemplate: null,

    init: async () => {
      if (get().draft || initStarted) return; // StrictMode: Effekt läuft doppelt
      initStarted = true;
      set({ loading: true });
      const session = readSession();
      const urlFile = new URLSearchParams(location.search).get('file');
      if (session) {
        set({ tab: session.tab, sheet: session.sheet });
        if (session.attempt) usePreviewStore.setState({ attempt: session.attempt });
      }
      await get().refreshFiles();
      const files = get().files;
      const wanted = urlFile && FILE_NAME_RE.test(urlFile) ? urlFile : session?.file;
      const file = (wanted && (files.some((f) => f.file === wanted) || hasStoredDraft(wanted)) ? wanted : null) ?? files[0]?.file ?? null;
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
      // Dev-Server (gleiche Herkunft) oder der Mac im WLAN (iOS-App); sonst die gebündelten Level + lokale Stände.
      if (await useContentTarget.getState().check()) {
        try {
          names = await listLevelFiles();
          set({ endpoint: 'ok' });
        } catch {
          names = null;
          set({ endpoint: 'offline' });
        }
      } else set({ endpoint: 'offline' });

      let entries: FileEntry[];
      if (names === null) {
        // Ohne Mac: die gebündelten Level (001…), Entwürfe und Sicherungen nur lokal.
        entries = LEVELS.map((l, i) => ({ file: fileNameForNumber(i + 1), id: l.id, name: l.name ?? l.id, hasDraft: hasStoredDraft(fileNameForNumber(i + 1)) }));
      } else {
        const numeric = names.filter((n) => /^\d{3}\.json$/.test(n)).sort();
        const drafts = names.filter((n) => n.startsWith('_') && n !== '_calibration.json').sort();
        entries = numeric.map((file, i) => {
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
        entries = [...entries, ...draftEntries];
      }
      // Ohne Mac lokal gesicherte Stände: markieren bzw. (neue Dateien) anhängen.
      const localSaved = new Set(localList(LOCAL_DIR).filter((f) => FILE_NAME_RE.test(f)));
      entries = entries.map((e) => (localSaved.has(e.file) ? { ...e, local: true } : e));
      for (const file of localSaved) {
        if (entries.some((e) => e.file === file)) continue;
        const raw = (localGet(LOCAL_DIR, file)?.json ?? null) as { id?: unknown; name?: unknown } | null;
        const id = typeof raw?.id === 'string' ? raw.id : file;
        entries.push({ file, id, name: typeof raw?.name === 'string' ? raw.name : id, hasDraft: hasStoredDraft(file), localOnly: true, local: true });
      }
      // Nur lokal vorhandene Entwürfe (Neu/Vorlage/Kopie, noch nie gesichert).
      const known = new Set(entries.map((e) => e.file));
      for (const key of lsKeys(DRAFT_PREFIX)) {
        const file = key.slice(DRAFT_PREFIX.length);
        if (known.has(file) || !FILE_NAME_RE.test(file)) continue;
        const stored = readStoredDraft(file);
        const raw = (stored?.draft ?? null) as { id?: unknown; name?: unknown } | null;
        const id = typeof raw?.id === 'string' ? raw.id : file;
        entries.push({ file, id, name: typeof raw?.name === 'string' ? raw.name : id, hasDraft: true, localOnly: true });
      }
      set({ files: entries });
    },

    openFile: async (file) => {
      flushAutosave();
      set({ loading: true, cellMenu: null, sheetBeforeMenu: null });
      let raw: unknown = null;
      if (get().endpoint === 'ok') {
        try {
          raw = await getLevelFile(file);
        } catch (e) {
          get().showToast(`Laden ging schief: ${e instanceof Error ? e.message : String(e)}`, 'error');
          set({ loading: false });
          return;
        }
      } else {
        const idx = get().files.findIndex((f) => f.file === file);
        raw = idx >= 0 && /^\d{3}\.json$/.test(file) ? (LEVELS[idx] ?? null) : null;
      }
      // Ohne Mac lokal gesichert: ohne Verbindung ist das der gesicherte Stand; mit Verbindung ein Stand, der noch
      // auf den Mac muss (lädt wie ein ungesicherter Entwurf, „Sichern“ schreibt ihn dorthin).
      const localSave = localGet(LOCAL_DIR, file);
      let pendingLocal: unknown = null;
      savedSource = get().endpoint === 'ok' ? 'mac' : 'local';
      if (localSave && get().endpoint !== 'ok') raw = localSave.json;
      else if (localSave) {
        if (raw !== null && normalizedJson(localSave.json) === normalizedJson(raw)) localRemove(LOCAL_DIR, file);
        else pendingLocal = localSave.json;
      }
      const stored = readStoredDraft(file);
      if (raw === null && !stored && pendingLocal === null) {
        get().showToast(`${file} gibt es nicht`, 'error');
        set({ loading: false });
        return;
      }
      const diskJson = raw === null ? null : normalizedJson(raw);
      let draft = raw === null ? null : normalizeDraft(raw);
      let restored = false;
      let fromLocal = false;
      if (stored) {
        const sd = normalizeDraft(stored.draft);
        if (diskJson === null || JSON.stringify(sd) !== diskJson) {
          draft = sd;
          restored = true;
        } else lsRemove(DRAFT_PREFIX + file);
      }
      if (!restored && pendingLocal !== null) {
        draft = normalizeDraft(pendingLocal);
        restored = true;
        fromLocal = true;
      }
      if (!draft) draft = emptyDraft();
      const activeFile = raw === null ? (stored?.activeFile ?? null) : file;
      const hist = readHistory(file, serializeDraft(draft));
      set({
        activeFile,
        targetFile: file,
        past: hist?.past ?? [],
        future: hist?.future ?? [],
        lastOpKey: null,
        pendingPortalId: null,
        loading: false,
        lastTemplate: null,
      });
      applyDraft(draft, { savedJson: diskJson });
      set({ dirty: restored || diskJson === null });
      writeSession();
      if (fromLocal) get().showToast('Lokal gesicherter Stand — „Sichern“ bringt ihn auf den Mac', 'info');
      else if (restored && raw !== null) get().showToast('Ungesicherten Stand wiederhergestellt', 'info');
    },

    update: (fn, opKey) => {
      const { draft, past, lastOpKey, lastOpAt } = get();
      if (!draft) return;
      const next = fn(draft);
      if (next === draft) return;
      const now = Date.now();
      const longOp = opKey !== undefined && (opKey.startsWith('stroke-') || opKey.startsWith('fence-'));
      const coalesce = opKey !== undefined && opKey === lastOpKey && (longOp || now - lastOpAt < 1000);
      const newPast = coalesce ? past : [...past.slice(-(HIST_LIMIT * 2 - 1)), draft];
      set({ past: newPast, future: [], lastOpKey: opKey ?? null, lastOpAt: now });
      applyDraft(next);
    },

    undo: () => {
      const { draft, past, future } = get();
      if (!draft || past.length === 0) return;
      const prev = past[past.length - 1]!;
      set({ past: past.slice(0, -1), future: [draft, ...future].slice(0, HIST_LIMIT * 2), lastOpKey: null, pendingPortalId: null });
      applyDraft(prev);
      haptic('select');
    },

    redo: () => {
      const { draft, past, future } = get();
      if (!draft || future.length === 0) return;
      const next = future[0]!;
      set({ past: [...past, draft].slice(-HIST_LIMIT * 2), future: future.slice(1), lastOpKey: null });
      applyDraft(next);
      haptic('select');
    },

    tapCell: (at) => {
      const { draft, tool, toolParams, pendingPortalId } = get();
      if (!draft || tool === 'fence') return;
      const action: StrokeAction = toolPresent(draft, tool, toolParams, at) ? 'remove' : 'add';
      const r = applyTool(draft, tool, toolParams, at, action, pendingPortalId);
      if (r.error) {
        flash([at], 'error');
        haptic('error');
        get().showToast(r.error, 'error');
        return;
      }
      if (r.pendingPortalId !== undefined) set({ pendingPortalId: r.pendingPortalId });
      if (r.draft === draft) {
        flash([at], 'error');
        return;
      }
      const opSeq = get().opSeq + 1;
      set({ opSeq });
      get().update(() => r.draft, `tap-${opSeq}`);
      flash(tool === 'scrapMound' && action === 'add' ? moundCells(at) : tool === 'scrapMound' ? moundCells(blockerAt(draft, at)?.at ?? at) : [at], action);
      haptic(action === 'add' ? 'tap' : 'select');
      if (tool === 'portal' && action === 'add') {
        const id = r.draft.floors.find((f) => f.kind === 'portal' && f.at[0] === at[0] && f.at[1] === at[1]);
        const pid = id && id.kind === 'portal' ? id.portalId : '?';
        get().showToast(r.pendingPortalId ? `Rohr ${pid}: jetzt die zweite Zelle` : `Rohr ${pid} verbunden`, 'info');
      }
    },

    strokeBegin: (at) => {
      const { draft, tool, toolParams, pendingPortalId } = get();
      if (!draft || tool === 'fence' || !toolInfo(tool).paint) return;
      const action: StrokeAction = toolPresent(draft, tool, toolParams, at) ? 'remove' : 'add';
      const id = get().opSeq + 1;
      set({ opSeq: id, stroke: { id, action, fence: false } });
      const r = applyTool(draft, tool, toolParams, at, action, pendingPortalId);
      if (!r.error && r.draft !== draft) {
        get().update(() => r.draft, `stroke-${id}`);
        flash([at], action);
        haptic('tap');
      }
    },

    strokeTo: (at) => {
      const { draft, tool, toolParams, stroke, pendingPortalId } = get();
      if (!draft || !stroke || stroke.fence) return;
      const present = toolPresent(draft, tool, toolParams, at);
      if (stroke.action === 'add' && present) return;
      if (stroke.action === 'remove' && !present && tool !== 'erase') return;
      const r = applyTool(draft, tool, toolParams, at, stroke.action, pendingPortalId);
      if (r.error || r.draft === draft) return;
      get().update(() => r.draft, `stroke-${stroke.id}`);
      flash([at], stroke.action);
      haptic('tap');
    },

    strokeEnd: () => {
      if (!get().stroke) return;
      set({ stroke: null });
      if (previewTimer) {
        clearTimeout(previewTimer);
        previewTimer = null;
      }
      get().syncPreview();
    },

    fenceEdge: (a, b, phase) => {
      const { draft, stroke } = get();
      if (!draft) return;
      const has = fenceIndex(draft, a, b) >= 0;
      if (phase === 'move') {
        if (!stroke?.fence) return;
        const next = setFence(draft, a, b, stroke.action === 'add');
        if (next !== draft) {
          get().update(() => next, `fence-${stroke.id}`);
          flash([a, b], stroke.action);
          haptic('tap');
        }
        return;
      }
      const id = get().opSeq + 1;
      const action: StrokeAction = has ? 'remove' : 'add';
      set({ opSeq: id, stroke: phase === 'begin' ? { id, action, fence: true } : get().stroke });
      const next = setFence(draft, a, b, !has);
      if (next === draft) {
        flash([a, b], 'error');
        haptic('error');
        return;
      }
      get().update(() => next, `fence-${id}`);
      flash([a, b], action);
      haptic('tap');
    },

    openCellMenu: (at) => {
      const { sheet, sheetBeforeMenu } = get();
      // Auf dem Handy braucht das Menü die Bühne: Sheet einklappen, beim Schließen zurück.
      if (isPhone() && sheet !== 'peek') set({ cellMenu: at, sheet: 'peek', sheetBeforeMenu: sheetBeforeMenu ?? sheet });
      else set({ cellMenu: at });
      haptic('press');
    },
    closeCellMenu: () => {
      const before = get().sheetBeforeMenu;
      set(before && get().sheet === 'peek' ? { cellMenu: null, sheet: before, sheetBeforeMenu: null } : { cellMenu: null, sheetBeforeMenu: null });
    },

    editCell: (at, fn, key) => {
      get().update(fn, `cell-${at[0]}-${at[1]}-${key}`);
      haptic('select');
    },

    pickTool: (at) => {
      const { draft, toolParams } = get();
      if (!draft) return;
      const picked = toolFromCell(draft, at, toolParams);
      if (!picked) {
        get().showToast('Hier liegt nichts zum Aufnehmen', 'info');
        return;
      }
      set({ toolParams: picked.params });
      get().closeCellMenu();
      get().setTool(picked.tool);
      get().showToast(`Pipette: ${toolInfo(picked.tool).label}`, 'ok');
    },

    save: async () => {
      const { draft, validation, targetFile, activeFile, savedJson, endpoint, busy } = get();
      if (!draft || busy) return false;
      if (!validation.ok) {
        get().showToast(`Nicht gesichert: ${validation.errors.length} ${validation.errors.length === 1 ? 'Fehler' : 'Fehler'}`, 'error');
        haptic('error');
        return false;
      }
      if (!FILE_NAME_RE.test(targetFile)) {
        get().showToast('Dateiname: nur Buchstaben, Ziffern, _ - . und .json', 'error');
        return false;
      }
      set({ busy: true });
      try {
        // Mac erreichbar (Dev-Server bzw. WLAN)? Sonst lokal sichern — „Teilen“ schickt die Datei weiter.
        if (!(await useContentTarget.getState().check())) {
          const ok = saveLocal('Mac nicht erreichbar · ');
          if (ok) await get().refreshFiles();
          return ok;
        }
        if (endpoint !== 'ok') set({ endpoint: 'ok' });
        let existing: unknown;
        try {
          existing = await getLevelFile(targetFile);
        } catch (e) {
          if (useContentTarget.getState().status !== 'offline') throw e;
          const ok = saveLocal('Verbindung weg · ');
          if (ok) await get().refreshFiles();
          return ok;
        }
        if (existing !== null) {
          if (targetFile !== activeFile) {
            if (!(await get().requestConfirm({ title: `${targetFile} überschreiben?`, body: 'Die Datei gibt es schon.', ok: 'Überschreiben', danger: true }))) return false;
          } else if (savedSource === 'local') {
            // Offline begonnen: nur nachfragen, wenn der Mac inzwischen einen anderen Stand hat als die App.
            const bundled = /^\d{3}\.json$/.test(targetFile) ? (LEVELS[levelNumber(targetFile.replace(/\.json$/, '')) - 1] ?? null) : null;
            if (bundled === null || normalizedJson(existing) !== normalizedJson(bundled)) {
              if (!(await get().requestConfirm({ title: 'Anderer Stand auf dem Mac', body: `${targetFile} ist auf dem Mac anders als dein lokaler Ausgangsstand. Mit deinem Stand überschreiben?`, ok: 'Überschreiben', danger: true }))) return false;
            }
          } else if (savedJson !== null && normalizedJson(existing) !== savedJson) {
            if (!(await get().requestConfirm({ title: 'Datei wurde inzwischen geändert', body: `${targetFile} hat sich auf der Platte geändert. Trotzdem überschreiben?`, ok: 'Überschreiben', danger: true }))) return false;
          }
        }
        const json = normalizeDraft(draft);
        const r = await putLevelFile(targetFile, json);
        if (!r.ok) {
          const issues = Array.isArray(r.body.issues) ? ` (${(r.body.issues as { message?: string }[]).map((i) => i.message ?? '').join('; ')})` : '';
          get().showToast(`Abgelehnt: ${r.body.error}${issues}`, 'error');
          return false;
        }
        const saved = JSON.stringify(json);
        lsRemove(DRAFT_PREFIX + targetFile);
        localRemove(LOCAL_DIR, targetFile);
        savedSource = 'mac';
        // „Sichern unter“: die Änderungen stecken jetzt in der neuen Datei, das Original bleibt unverändert.
        if (activeFile && activeFile !== targetFile) lsRemove(DRAFT_PREFIX + activeFile);
        set({ activeFile: targetFile, savedJson: saved, dirty: false, lastTemplate: null });
        writeSession();
        writeHistoryNow();
        // Vite lädt die Seite nach der Dateiänderung neu (JSON-HMR); der Hinweis überlebt das.
        lsSet(PENDING_TOAST_KEY, `Gespeichert auf dem Mac: ${targetFile}`);
        get().showToast(`Gespeichert auf dem Mac: ${targetFile}`, 'ok');
        haptic('success');
        await get().refreshFiles();
        setTimeout(() => lsRemove(PENDING_TOAST_KEY), 4000);
        return true;
      } catch (e) {
        get().showToast(`Sichern ging schief: ${e instanceof Error ? e.message : String(e)}`, 'error');
        return false;
      } finally {
        set({ busy: false });
      }
    },

    revert: () => {
      const { savedJson, dirty } = get();
      if (savedJson === null) {
        get().showToast('Noch nie gesichert — nichts zum Zurücksetzen', 'info');
        return;
      }
      if (!dirty) return;
      // Zurücksetzen ist ein normaler Schritt: „Rückgängig“ holt die Änderungen zurück.
      get().update(() => normalizeDraft(JSON.parse(savedJson)), 'revert');
      set({ pendingPortalId: null, cellMenu: null, sheetBeforeMenu: null });
      get().showToast('Auf den gesicherten Stand zurückgesetzt', 'info', { label: 'Rückgängig', run: () => get().undo() });
    },

    duplicate: () => {
      const { draft, activeFile, targetFile } = get();
      if (!draft) return;
      const base = (activeFile ?? targetFile).replace(/\.json$/, '').replace(/^_+/, '');
      const file = uniqueFile(`_kopie-${base}`);
      const copy: LevelDraft = { ...draft, id: `${draft.id}-kopie`, name: `${draft.name ?? draft.id} (Kopie)` };
      loadFresh(copy, file);
      get().showToast(`Kopie als Entwurf: ${file}`, 'ok');
    },

    createNew: () => {
      const { draft } = get();
      const no = nextNumber();
      const zone = draft?.zone ?? 'tjorizo';
      loadFresh(emptyDraft(`${zone}-${pad3(no)}`, zone), uniqueFile(`_neu-${pad3(no)}`));
    },

    newFromTemplate: (id, zone) => {
      const last = get().lastTemplate;
      const no = nextNumber();
      const again = last && last.id === id && last.zone === zone && last.file === get().targetFile && get().activeFile === null;
      if (again) {
        const reroll = last.reroll + 1;
        const d = buildTemplate(zone, id, no, reroll);
        get().update(() => d, `template-${reroll}`);
        set({ lastTemplate: { ...last, reroll } });
        get().showToast('Neu gewürfelt', 'info', { label: 'Rückgängig', run: () => get().undo() });
        return;
      }
      const file = uniqueFile(`_neu-${pad3(no)}`);
      loadFresh(buildTemplate(zone, id, no, 0), file);
      set({ lastTemplate: { id, zone, file, reroll: 0 } });
      get().showToast('Vorlage geladen — nochmal tippen würfelt neu', 'ok');
    },

    deleteFile: async (fileArg) => {
      const { activeFile, targetFile, endpoint, files } = get();
      const file = fileArg ?? activeFile ?? targetFile;
      const entry = files.find((f) => f.file === file);
      const onDisk = !!entry && !entry.localOnly;
      if (onDisk && !file.startsWith('_')) {
        get().showToast('Nur Entwürfe (_-Dateien) lassen sich löschen', 'error');
        return;
      }
      const ok = await get().requestConfirm({ title: `${file} löschen?`, body: onDisk && endpoint === 'ok' ? 'Die Datei verschwindet aus content/levels auf dem Mac.' : 'Der lokale Stand verschwindet.', ok: 'Löschen', danger: true });
      if (!ok) return;
      const current = file === (get().activeFile ?? get().targetFile) || file === get().targetFile;
      if (current && autosaveTimer) {
        clearTimeout(autosaveTimer);
        autosaveTimer = null;
      }
      if (current && histTimer) {
        clearTimeout(histTimer);
        histTimer = null;
      }
      lsRemove(DRAFT_PREFIX + file);
      lsRemove(HIST_PREFIX + file);
      localRemove(LOCAL_DIR, file);
      touchHistIndex(file, true);
      if (endpoint === 'ok' && onDisk) {
        try {
          await deleteLevelFile(file);
        } catch (e) {
          get().showToast(`Löschen ging schief: ${e instanceof Error ? e.message : String(e)}`, 'error');
          return;
        }
      }
      get().showToast(`Gelöscht: ${file}`, 'ok');
      haptic('warning');
      lsSet(PENDING_TOAST_KEY, `Gelöscht: ${file}`);
      setTimeout(() => lsRemove(PENDING_TOAST_KEY), 4000);
      await get().refreshFiles();
      if (!current) return;
      set({ targetFile: '', activeFile: null });
      const next = get().files.find((f) => f.file !== file);
      if (next) await get().openFile(next.file);
      else get().createNew();
    },

    download: () => {
      const { draft, targetFile } = get();
      if (!draft) return;
      // Die WKWebView der App lädt nichts herunter: dort übernimmt das Teilen-Blatt.
      if (IS_NATIVE) {
        void get().share();
        return;
      }
      const name = targetFile || 'level.json';
      if (downloadJson(name, normalizeDraft(draft))) get().showToast(`Heruntergeladen: ${name}`, 'ok');
      else get().showToast('Herunterladen ging schief', 'error');
    },

    share: async () => {
      const { draft, targetFile } = get();
      if (!draft) return;
      const name = targetFile || 'level.json';
      const outcome = await shareJson(name, normalizeDraft(draft), draft.name ?? draft.id);
      if (outcome !== 'abgebrochen') get().showToast(shareMessage(outcome, name), outcome === 'fehler' ? 'error' : 'ok');
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
    openTab: (tab, size = 'half') => {
      const { sheet } = get();
      const rank = (s: SheetSize) => SHEET_SIZES.indexOf(s);
      set({ tab, sheet: rank(sheet) < rank(size) ? size : sheet });
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
    setTool: (tool) => {
      const recent = [tool, ...get().recentTools.filter((t) => t !== tool)].slice(0, 6);
      set({ tool, recentTools: recent, pendingPortalId: tool === 'portal' ? get().pendingPortalId : null });
      writeToolPrefs();
      haptic('select');
    },
    setToolParams: (patch) => {
      set({ toolParams: { ...get().toolParams, ...patch } });
      writeToolPrefs();
    },
    setTargetFile: (file) => {
      set({ targetFile: file.trim() });
      writeSession();
      scheduleAutosave();
    },

    enterPlay: () => {
      const { validation, sheet } = get();
      if (!validation.level) {
        get().showToast('Erst die Fehler beheben, dann testen', 'error');
        haptic('error');
        return;
      }
      get().syncPreview();
      usePreviewStore.getState().setMode('play');
      set({ cellMenu: null, sheetBeforePlay: get().sheetBeforeMenu ?? sheet, sheetBeforeMenu: null, sheet: isPhone() ? 'peek' : sheet });
      haptic('press');
    },
    exitPlay: () => {
      usePreviewStore.getState().setMode('edit');
      get().syncPreview();
      const before = get().sheetBeforePlay;
      set({ sheet: before ?? get().sheet, sheetBeforePlay: null });
      writeSession();
      haptic('press');
    },
    togglePlay: () => {
      if (usePreviewStore.getState().mode === 'play') get().exitPlay();
      else get().enterPlay();
    },

    showToast: (text, kind = 'info', action) => {
      if (toastTimer) clearTimeout(toastTimer);
      const id = ++toastSeq;
      set({ toast: action ? { id, text, kind, action } : { id, text, kind } });
      toastTimer = setTimeout(
        () => {
          if (get().toast?.id === id) set({ toast: null });
        },
        kind === 'error' ? 5000 : action ? 4200 : 2600,
      );
    },
    hideToast: () => set({ toast: null }),
    requestConfirm: (req) =>
      new Promise<boolean>((resolve) => {
        get().confirm?.resolve(false);
        set({ confirm: { ...req, resolve } });
      }),
    resolveConfirm: (ok) => {
      const c = get().confirm;
      set({ confirm: null });
      c?.resolve(ok);
    },
  };
});
