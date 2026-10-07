import { create } from 'zustand';

/**
 * Referenzbild des Wesen-Labs (Look-Vertrag Regel 15): ein Bild über der Ansicht mit Deckkraft, Spiegeln, Verschieben
 * und Skalieren. Das Bild bleibt im Browser (IndexedDB), nie im Repo; Lage und Deckkraft stehen in `localStorage`
 * (`ee.lab.wesen.referenz`). Ohne IndexedDB (privates Fenster) lebt das Bild nur bis zum Neuladen.
 */

const LAGE_KEY = 'ee.lab.wesen.referenz';
const DB_NAME = 'ee-lab-wesen';
const DB_STORE = 'referenz';
const DB_KEY = 'bild';
/** Längste Kante beim Ablegen (größere Bilder werden verkleinert: Speicher, Dekodierzeit auf dem iPhone). */
const MAX_KANTE = 2400;

export interface ReferenzLage {
  /** Versatz in Anteilen der Bühnenbreite/-höhe (bleibt beim Größenwechsel der Bühne relativ). */
  x: number;
  y: number;
  /** Skalierung relativ zum Einpassen in die Bühne. */
  s: number;
  deckkraft: number;
  spiegeln: boolean;
}

export interface ReferenzState extends ReferenzLage {
  /** Objekt-URL des Bildes (null = keins). */
  url: string | null;
  name: string | null;
  /** Bild verschieben/skalieren statt die Kamera zu drehen. */
  bewegen: boolean;
  laedt: boolean;
  setze: (patch: Partial<ReferenzLage>) => void;
  setBewegen: (on: boolean) => void;
  einpassen: () => void;
  /** Bild übernehmen (Datei, Drop, Einfügen): verkleinern, ablegen, anzeigen. */
  ladeDatei: (file: Blob, name?: string) => Promise<boolean>;
  entfernen: () => Promise<void>;
  /** Abgelegtes Bild beim Start zurückholen. */
  wiederherstellen: () => Promise<void>;
}

const START: ReferenzLage = { x: 0, y: 0, s: 1, deckkraft: 0.5, spiegeln: false };

function leseLage(): ReferenzLage {
  try {
    const raw = localStorage.getItem(LAGE_KEY);
    if (!raw) return { ...START };
    const j = JSON.parse(raw) as Partial<ReferenzLage>;
    const num = (v: unknown, d: number, lo: number, hi: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
    return { x: num(j.x, 0, -2, 2), y: num(j.y, 0, -2, 2), s: num(j.s, 1, 0.05, 20), deckkraft: num(j.deckkraft, 0.5, 0, 1), spiegeln: j.spiegeln === true };
  } catch {
    return { ...START };
  }
}

function schreibeLage(l: ReferenzLage): void {
  try {
    localStorage.setItem(LAGE_KEY, JSON.stringify({ x: l.x, y: l.y, s: l.s, deckkraft: l.deckkraft, spiegeln: l.spiegeln }));
  } catch {
    /* nicht gemerkt */
  }
}

// --- IndexedDB ----------------------------------------------------------------------------------------------------

function oeffneDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('kein IndexedDB'));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(DB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB'));
  });
}

async function dbTx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await oeffneDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(DB_STORE, mode);
      const req = fn(tx.objectStore(DB_STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error('IndexedDB'));
    });
  } finally {
    db.close();
  }
}

interface Abgelegt {
  blob: Blob;
  name: string;
}

async function verkleinere(file: Blob): Promise<Blob> {
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return file;
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, MAX_KANTE / Math.max(bmp.width, bmp.height));
  if (k >= 1) {
    bmp.close();
    return file;
  }
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  return new Promise((resolve) => c.toBlob((b) => resolve(b ?? file), 'image/png'));
}

// --- Store --------------------------------------------------------------------------------------------------------

export const useReferenz = create<ReferenzState>((set, get) => {
  const neueUrl = (blob: Blob | null, name: string | null) => {
    const alt = get().url;
    if (alt) URL.revokeObjectURL(alt);
    set({ url: blob ? URL.createObjectURL(blob) : null, name });
  };
  const lagePatch = (patch: Partial<ReferenzLage>) => {
    set(patch);
    schreibeLage(get());
  };
  return {
    ...leseLage(),
    url: null,
    name: null,
    bewegen: false,
    laedt: false,
    setze: lagePatch,
    setBewegen: (bewegen) => set({ bewegen }),
    einpassen: () => lagePatch({ x: 0, y: 0, s: 1 }),
    ladeDatei: async (file, name = 'Referenz') => {
      if (!file.type.startsWith('image/')) return false;
      set({ laedt: true });
      try {
        const blob = await verkleinere(file).catch(() => file);
        neueUrl(blob, name);
        lagePatch({ x: 0, y: 0, s: 1 });
        await dbTx('readwrite', (s) => s.put({ blob, name } satisfies Abgelegt, DB_KEY)).catch(() => undefined);
        return true;
      } finally {
        set({ laedt: false });
      }
    },
    entfernen: async () => {
      neueUrl(null, null);
      set({ bewegen: false });
      await dbTx('readwrite', (s) => s.delete(DB_KEY)).catch(() => undefined);
    },
    wiederherstellen: async () => {
      if (get().url) return;
      const a = await dbTx<Abgelegt | undefined>('readonly', (s) => s.get(DB_KEY) as IDBRequest<Abgelegt | undefined>).catch(() => undefined);
      if (a?.blob && !get().url) neueUrl(a.blob, a.name ?? 'Referenz');
    },
  };
});

/** Erstes Bild aus einer Ablage (Drag-and-drop, Einfügen). */
export function bildAusDaten(dt: DataTransfer | null): File | null {
  if (!dt) return null;
  for (const f of Array.from(dt.files)) if (f.type.startsWith('image/')) return f;
  for (const item of Array.from(dt.items ?? [])) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const f = item.getAsFile();
      if (f) return f;
    }
  }
  return null;
}
