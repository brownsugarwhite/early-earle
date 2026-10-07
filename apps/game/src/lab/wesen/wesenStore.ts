import { create } from 'zustand';
import { parseBauplan, stableJson, type Bauplan } from '@ee/creature';
import { STIL_STANDARD, type WesenStil } from '@ee/render';
import { WESEN_VORLAGEN } from './presets';
import { bereinigeBauplan, bereinigeStil, isTabId, setzeTabZurueck, setzeWert, wuerfleTab, type TabId } from './regler';

/**
 * Zustand des Grundformen-Labs: Bauplan und Stil mit Verlauf (Rückgängig/Wiederholen, 60 Schritte; ein Zug am Regler
 * ist ein Schritt), Schlösser je Regler, Ausgangsstand für „Zurücksetzen“, Ansicht. Der Entwurf sichert sich selbst
 * (`ee.lab.wesen.entwurf`, Stil in `ee.lab.wesen.stil`); die Szene hört über `subscribe` mit, ohne React.
 */

export const ENTWURF_KEY = 'ee.lab.wesen.entwurf';
export const STIL_KEY = 'ee.lab.wesen.stil';
export const HIST_LIMIT = 60;
/** Gleiche Änderung (gleicher Regler) innerhalb dieser Zeit = ein Schritt, auch ohne gemeldeten Zug (Tastatur). */
const COALESCE_MS = 1000;

export type WesenAnsicht = 'held' | 'referenz' | 'brett';
export type WesenBoden = 'wiese' | 'weiss';
export type StilQuelle = 'Standard' | 'App' | 'Mac' | 'Lokal';

/** Woher der Stand kommt: Vorlage aus `presets.ts`, Datei aus `content/creatures/vorlagen` oder ein neuer Entwurf. */
export interface WesenQuelle {
  art: 'vorlage' | 'datei' | 'neu';
  /** Vorlagen-Id bzw. Dateiname (`<id>.json`). */
  id: string;
  /** Datei: wo sie gelesen wurde. */
  ort?: 'Mac' | 'App' | 'Lokal';
}

interface Schnappschuss {
  bauplan: Bauplan;
  stil: WesenStil;
  basis: Bauplan;
  quelle: WesenQuelle;
}

export interface Meldung {
  id: number;
  text: string;
  art: 'ok' | 'info' | 'fehler';
}

export interface WesenState {
  bauplan: Bauplan;
  stil: WesenStil;
  /** Ausgangsstand für „Zurücksetzen“ (geladene Vorlage oder Datei). */
  basis: Bauplan;
  /** Stil-Vorgabe (content/creatures/stil.json bzw. Standard des Materials). */
  stilVorgabe: WesenStil;
  stilQuelle: StilQuelle;
  quelle: WesenQuelle;
  /** Regler-Kennung → vom Würfel ausgenommen. */
  schloss: Record<string, boolean>;
  past: Schnappschuss[];
  future: Schnappschuss[];
  lastOpKey: string | null;
  lastOpAt: number;
  /** Ein Zug am Regler läuft (Zeiger unten): alle Werte dieses Reglers bilden einen Schritt. */
  geste: boolean;
  tab: TabId;
  ansicht: WesenAnsicht;
  boden: WesenBoden;
  spin: boolean;
  /** Kieferöffnung der Vorschau (Animationsziel, nicht Teil des Bauplans). */
  offen: number;
  /** Vorschau folgt der gebauten Öffnung (`maul.oeffnung`), bis Maul auf/zu oder der Vorschau-Regler sie übernimmt. */
  offenFolgt: boolean;
  meldung: Meldung | null;

  /** Bauplan-Wert über einen Pfad setzen (ungültige Werte verwirft das Schema). */
  setzeBauplanWert: (key: string, value: unknown, opKey?: string) => void;
  setzeStilWert: (key: string, value: unknown, opKey?: string) => void;
  /** Vorlage oder Datei laden: neuer Ausgangsstand, rückgängig machbar. */
  ladeBauplan: (b: Bauplan, quelle: WesenQuelle) => void;
  wuerfeln: (tab: TabId, rnd?: () => number) => void;
  zuruecksetzen: (tab: TabId) => void;
  schalteSchloss: (id: string) => void;
  beginGeste: () => void;
  endeGeste: () => void;
  undo: () => void;
  redo: () => void;
  setTab: (tab: TabId) => void;
  setAnsicht: (a: WesenAnsicht) => void;
  setBoden: (b: WesenBoden) => void;
  setSpin: (on: boolean) => void;
  setOffen: (o: number) => void;
  /** Vorschau wieder „wie gebaut“ (folgt `maul.oeffnung`). */
  offenWieGebaut: () => void;
  setStilVorgabe: (stil: WesenStil, quelle: StilQuelle) => void;
  /** Nach dem Sichern: Stand gilt als Datei (für Zurücksetzen und die Anzeige). */
  merkeDatei: (file: string, ort: 'Mac' | 'Lokal') => void;
  melde: (text: string, art?: Meldung['art']) => void;
}

// --- Speicher -----------------------------------------------------------------------------------------------------

interface Entwurf {
  v: 1;
  bauplan: unknown;
  basis?: unknown;
  quelle?: WesenQuelle;
  schloss?: Record<string, boolean>;
  tab?: string;
  /** Ansicht und Boden (Referenzmodus bleibt nach dem Neuladen). */
  ansicht?: string;
  boden?: string;
  at: number;
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
    /* privat/voll: Entwurf bleibt nur im Speicher */
  }
}

function leseJson(key: string): unknown {
  const raw = lsGet(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function istQuelle(q: unknown): q is WesenQuelle {
  return !!q && typeof q === 'object' && typeof (q as WesenQuelle).id === 'string' && ['vorlage', 'datei', 'neu'].includes((q as WesenQuelle).art);
}

/** Bauplan einer Vorlage aus `presets.ts` (null bei unbekannter Id). */
export function vorlageBauplan(id: string): Bauplan | null {
  const v = WESEN_VORLAGEN.find((x) => x.id === id);
  return v ? parseBauplan(v.bauplan) : null;
}

const ERSTE_VORLAGE = WESEN_VORLAGEN[0]!;

function anfang(): Pick<WesenState, 'bauplan' | 'basis' | 'quelle'> {
  const b = parseBauplan(ERSTE_VORLAGE.bauplan);
  return { bauplan: b, basis: b, quelle: { art: 'vorlage', id: ERSTE_VORLAGE.id } };
}

// --- Store --------------------------------------------------------------------------------------------------------

let meldungSeq = 0;
let meldungTimer: ReturnType<typeof setTimeout> | null = null;
/** Boden vor dem Referenzmodus (der weißen Grund erzwingt); beim Verlassen kommt er zurück. */
let bodenVorReferenz: WesenBoden | null = null;

function schnapp(s: WesenState): Schnappschuss {
  return { bauplan: s.bauplan, stil: s.stil, basis: s.basis, quelle: s.quelle };
}

export const useWesenStore = create<WesenState>((set, get) => {
  /** Kern jeder Änderung: neuer Stand, Verlauf mit Zusammenfassung gleicher Züge. */
  const aendere = (next: { bauplan: Bauplan; stil: WesenStil }, opKey?: string) => {
    const s = get();
    if (next.bauplan === s.bauplan && next.stil === s.stil) return;
    const now = Date.now();
    const coalesce = opKey !== undefined && opKey === s.lastOpKey && (s.geste || now - s.lastOpAt < COALESCE_MS);
    const past = coalesce ? s.past : [...s.past, schnapp(s)].slice(-HIST_LIMIT);
    set({ bauplan: next.bauplan, stil: next.stil, past, future: [], lastOpKey: opKey ?? null, lastOpAt: now });
  };

  return {
    ...anfang(),
    stil: { ...STIL_STANDARD },
    stilVorgabe: { ...STIL_STANDARD },
    stilQuelle: 'Standard',
    schloss: {},
    past: [],
    future: [],
    lastOpKey: null,
    lastOpAt: 0,
    geste: false,
    tab: 'maul',
    ansicht: 'held',
    boden: 'wiese',
    spin: false,
    offen: 0.3,
    offenFolgt: true,
    meldung: null,

    setzeBauplanWert: (key, value, opKey = key) => {
      const s = get();
      let next: Bauplan;
      try {
        next = parseBauplan(setzeWert(s.bauplan, key, value));
      } catch {
        return;
      }
      aendere({ bauplan: next, stil: s.stil }, `b:${opKey}`);
    },

    setzeStilWert: (key, value, opKey = key) => {
      const s = get();
      aendere({ bauplan: s.bauplan, stil: bereinigeStil(setzeWert(s.stil, key, value)) }, `s:${opKey}`);
    },

    ladeBauplan: (b, quelle) => {
      const s = get();
      const past = [...s.past, schnapp(s)].slice(-HIST_LIMIT);
      set({ bauplan: b, basis: b, quelle, past, future: [], lastOpKey: null, lastOpAt: Date.now(), offenFolgt: true });
    },

    wuerfeln: (tab, rnd) => {
      const s = get();
      aendere(wuerfleTab(tab, s.bauplan, s.stil, s.schloss, rnd));
    },

    zuruecksetzen: (tab) => {
      const s = get();
      aendere(setzeTabZurueck(tab, s.bauplan, s.stil, s.basis, s.stilVorgabe));
    },

    schalteSchloss: (id) => {
      const schloss = { ...get().schloss };
      if (schloss[id]) delete schloss[id];
      else schloss[id] = true;
      set({ schloss });
    },

    beginGeste: () => set({ geste: true }),
    endeGeste: () => set({ geste: false, lastOpKey: null }),

    undo: () => {
      const s = get();
      const prev = s.past[s.past.length - 1];
      if (!prev) return;
      set({ ...prev, past: s.past.slice(0, -1), future: [schnapp(s), ...s.future].slice(0, HIST_LIMIT), lastOpKey: null });
    },

    redo: () => {
      const s = get();
      const next = s.future[0];
      if (!next) return;
      set({ ...next, past: [...s.past, schnapp(s)].slice(-HIST_LIMIT), future: s.future.slice(1), lastOpKey: null });
    },

    setTab: (tab) => set({ tab }),
    setAnsicht: (ansicht) =>
      set((s) => {
        if (ansicht === s.ansicht) return {};
        const patch: Partial<WesenState> = { ansicht };
        if (ansicht === 'referenz') {
          bodenVorReferenz = s.boden;
          patch.boden = 'weiss';
        } else if (s.ansicht === 'referenz') {
          patch.boden = bodenVorReferenz ?? 'wiese';
          bodenVorReferenz = null;
        }
        // Feste Ansichten stehen still (Vergleich mit dem Bogen, Spielsicht)
        if (ansicht !== 'held') patch.spin = false;
        return patch;
      }),
    setBoden: (boden) => set({ boden }),
    setSpin: (spin) => set({ spin }),
    setOffen: (offen) => set({ offen, offenFolgt: false }),
    offenWieGebaut: () => set({ offenFolgt: true }),
    setStilVorgabe: (stil, stilQuelle) => set({ stilVorgabe: stil, stilQuelle }),
    merkeDatei: (file, ort) => set((s) => ({ quelle: { art: 'datei', id: file, ort }, basis: s.bauplan })),

    melde: (text, art = 'info') => {
      if (meldungTimer) clearTimeout(meldungTimer);
      set({ meldung: { id: ++meldungSeq, text, art } });
      meldungTimer = setTimeout(() => set({ meldung: null }), art === 'fehler' ? 9000 : 5000);
    },
  };
});

// --- Autosave -----------------------------------------------------------------------------------------------------

let entwurfTimer: ReturnType<typeof setTimeout> | null = null;
let stilTimer: ReturnType<typeof setTimeout> | null = null;

function schreibeEntwurf(): void {
  entwurfTimer = null;
  const s = useWesenStore.getState();
  const e: Entwurf = { v: 1, bauplan: s.bauplan, basis: s.basis, quelle: s.quelle, schloss: s.schloss, tab: s.tab, ansicht: s.ansicht, boden: s.boden, at: Date.now() };
  lsSet(ENTWURF_KEY, JSON.stringify(e));
}

function schreibeStil(): void {
  stilTimer = null;
  lsSet(STIL_KEY, JSON.stringify(useWesenStore.getState().stil));
}

/** Sofort sichern (Seite wird verborgen/geschlossen). */
export function sichereEntwurfJetzt(): void {
  if (entwurfTimer) {
    clearTimeout(entwurfTimer);
    schreibeEntwurf();
  }
  if (stilTimer) {
    clearTimeout(stilTimer);
    schreibeStil();
  }
}

let autosaveAn = false;

/** Ab dem Start des Labs: Änderungen nach 250 ms Ruhe in den Browser-Speicher. */
function autosaveEinschalten(): void {
  if (autosaveAn) return;
  autosaveAn = true;
  useWesenStore.subscribe((s, p) => {
    if (s.bauplan !== p.bauplan || s.basis !== p.basis || s.quelle !== p.quelle || s.schloss !== p.schloss || s.tab !== p.tab || s.ansicht !== p.ansicht || s.boden !== p.boden) {
      if (entwurfTimer) clearTimeout(entwurfTimer);
      entwurfTimer = setTimeout(schreibeEntwurf, 250);
    }
    if (s.stil !== p.stil) {
      if (stilTimer) clearTimeout(stilTimer);
      stilTimer = setTimeout(schreibeStil, 250);
    }
  });
}

// --- Start --------------------------------------------------------------------------------------------------------

export interface StartParameter {
  /** `?vorlage=<id>`: Vorlage aus presets.ts (oder Datei-Id); hat Vorrang vor dem Entwurf. */
  vorlage?: string | null;
  ansicht?: string | null;
  boden?: string | null;
  spin?: string | null;
  /** Datei-Baupläne (Bündel/Mac), damit `?vorlage=` auch gespeicherte Vorlagen findet. */
  dateien?: ReadonlyArray<{ file: string; bauplan: Bauplan; ort: 'Mac' | 'App' | 'Lokal' }>;
  /** Stil-Vorgabe aus content/creatures/stil.json (Bündel), sonst Standard. */
  stilVorgabe?: { stil: WesenStil; quelle: StilQuelle } | null;
}

let gestartet = false;

/**
 * Startet das Lab: beim ersten Mal den Entwurf und den Stil aus dem Browser-Speicher, `?vorlage=` hat Vorrang
 * (der vorige Stand bleibt per Rückgängig erreichbar). Ansicht und Boden aus der Adresse. Mehrfachaufrufe (React
 * StrictMode, Rückkehr ins Lab) laden den Entwurf nicht erneut.
 */
export function starteWesenLab(p: StartParameter): void {
  const st = useWesenStore.getState();
  const erstesMal = !gestartet;
  gestartet = true;
  const patch: Partial<WesenState> = {};
  if (erstesMal) {
    if (p.stilVorgabe) {
      patch.stilVorgabe = p.stilVorgabe.stil;
      patch.stilQuelle = p.stilVorgabe.quelle;
    }
    const gespeicherterStil = leseJson(STIL_KEY);
    patch.stil = gespeicherterStil ? bereinigeStil(gespeicherterStil) : { ...(patch.stilVorgabe ?? st.stilVorgabe) };
    const e = leseJson(ENTWURF_KEY) as Entwurf | null;
    if (e && e.v === 1 && e.bauplan) {
      patch.bauplan = bereinigeBauplan(e.bauplan);
      patch.basis = e.basis ? bereinigeBauplan(e.basis) : patch.bauplan;
      patch.quelle = istQuelle(e.quelle) ? e.quelle : { art: 'neu', id: 'entwurf' };
      if (e.schloss && typeof e.schloss === 'object') patch.schloss = Object.fromEntries(Object.entries(e.schloss).filter(([, v]) => v === true));
      if (isTabId(e.tab)) patch.tab = e.tab;
      if (e.ansicht === 'held' || e.ansicht === 'referenz' || e.ansicht === 'brett') patch.ansicht = e.ansicht;
      if (e.boden === 'wiese' || e.boden === 'weiss') patch.boden = e.boden;
    }
  }
  const ansicht = p.ansicht === 'referenz' || p.ansicht === 'brett' || p.ansicht === 'held' ? p.ansicht : null;
  if (ansicht) patch.ansicht = ansicht;
  if (p.boden === 'weiss' || p.boden === 'wiese') patch.boden = p.boden;
  else if (ansicht === 'referenz') patch.boden = 'weiss';
  if (p.spin === '1') patch.spin = true;
  useWesenStore.setState(patch);
  autosaveEinschalten();
  if (p.vorlage) {
    const s = useWesenStore.getState();
    const v = vorlageBauplan(p.vorlage);
    const datei = v ? null : (p.dateien ?? []).find((d) => d.file === `${p.vorlage}.json` || d.file === p.vorlage);
    const quelle: WesenQuelle | null = v ? { art: 'vorlage', id: p.vorlage } : datei ? { art: 'datei', id: datei.file, ort: datei.ort } : null;
    const b = v ?? datei?.bauplan ?? null;
    // Schon geladen und unverändert (z. B. Neuladen mit derselben Adresse): nichts tun
    const unveraendert = s.quelle.art === quelle?.art && s.quelle.id === quelle.id && stableJson(s.bauplan) === stableJson(s.basis);
    if (b && quelle && !unveraendert) {
      // Frischer Lauf (keine Vorgeschichte): ohne Verlaufsschritt; sonst bleibt der Entwurf per Rückgängig erreichbar.
      if (erstesMal && s.past.length === 0 && !leseJson(ENTWURF_KEY)) useWesenStore.setState({ bauplan: b, basis: b, quelle });
      else s.ladeBauplan(b, quelle);
    }
  }
}

/** Öffnung, die die Vorschau zeigt: gebaute Öffnung oder das Ziel von Maul auf/zu bzw. Vorschau-Regler. */
export function vorschauOeffnung(s: Pick<WesenState, 'offen' | 'offenFolgt' | 'bauplan'>): number {
  return s.offenFolgt ? s.bauplan.maul.oeffnung : s.offen;
}

/** Nur für Tests: Store auf den Anfang. */
export function _resetWesenStore(): void {
  gestartet = false;
  useWesenStore.setState({ ...anfang(), stil: { ...STIL_STANDARD }, stilVorgabe: { ...STIL_STANDARD }, stilQuelle: 'Standard', schloss: {}, past: [], future: [], lastOpKey: null, lastOpAt: 0, geste: false, tab: 'maul', ansicht: 'held', boden: 'wiese', spin: false, offen: 0.3, offenFolgt: true, meldung: null });
}
