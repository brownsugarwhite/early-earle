import type { CreatureChoice } from '@ee/render';
import { useFlowStore } from '../flow/flowStore';
import { useHudOverride } from '../flow/hudOverride';
import { useMapEntries, type MapEntry } from '../flow/mapEntries';
import { useGridStore } from '../lab/grid/gridStore';
import { rexLine } from '../lab/grid/rex';
import { bus } from '../state/bus';
import { useProgress } from '../state/progress';
import { bestCreatureFor } from './choice';
import { formatById, formatOpen, openFormatIds } from './formats';
import { useKlassik } from './store';

/**
 * Klassik im Spiel: gespielt wird am aktuellen Knoten der Karte, über die vorhandenen Anfragen der Szene
 * (`startClassic` + `request('flyIn')`, zurück mit `request('leave')`); FlowScene bleibt unberührt.
 *
 * - Sitzung: zurück auf der Karte (oder am Splash) gilt wieder die Geschichte.
 * - Wesen: solange Klassik läuft, wählt der Brett-Hook `creatureFor` das beste gesammelte Wesen je Stufe
 *   (und die Klang-Schätzung dasselbe, damit Merge-Zeitpunkte und Schritte zum Brett passen).
 * - HUD: Punkte statt Züge, Bestwert statt Level, keine Ziele, „Kein Zug mehr“ am Ende.
 * - Bestwert: wird live gespeichert; überbietet ein Durchgang einen früheren Bestwert, kommt einmal der Stempel.
 * - Einstieg: der runde Knopf „2048“ auf der Karte, sobald ein Format offen ist; er leuchtet, bis neue Formate
 *   im Blatt gesehen wurden. Schaltet ein Sieg ein Format frei, sagt REX es nach der Rückkehr auf die Karte.
 */

export const KLASSIK_ENTRY_ID = 'classic';
/** Pause nach der Landung auf der Karte, bevor REX das neue Raster ansagt (die Szene setzt vorher ihre Zeile). */
const UNLOCK_LINE_DELAY_MS = 900;

export interface KlassikAdapters {
  /** Setzt (Funktion) oder entfernt (null) den Wesen-Hook des Bretts und der Klang-Schätzung. */
  setCreatureChoice(fn: ((blob: { id: number; tier: number }) => CreatureChoice) | null): void;
  /** Klang (Platzhalter bis zur Audio-Baustelle). */
  sfx(id: 'newBest'): void;
}

const activeMode = () => useProgress.getState().mode;

/** Wesenwahl der laufenden Sitzung: aus der Sammlung des aktiven Stands. */
export function classicCreatureFor(blob: { id: number; tier: number }): CreatureChoice {
  return bestCreatureFor(blob.tier, blob.id, useProgress.getState().collection);
}

/**
 * Startet Klassik im Format `formatId` am aktuellen Knoten (nur auf der Karte, nur offene Formate). Die Szene nimmt
 * den Anflug an und lädt über `loadLevel` das Format; ignoriert sie ihn, gilt sofort wieder die Geschichte.
 */
export function startKlassik(formatId: string): boolean {
  const p = useProgress.getState();
  const format = formatById(formatId);
  const flow = useFlowStore.getState();
  if (!format || !formatOpen(format, p.mode, p.reached) || flow.phase !== 'map') return false;
  const seed = useKlassik.getState().nextRun(p.mode, format.id);
  useKlassik.getState().closeSheet();
  if (!useGridStore.getState().startClassic(format.id, seed)) return false;
  flow.request('flyIn', flow.current);
  verifyFlyIn(0);
  return true;
}

/** Hat die Szene den Anflug abgeholt? Noch offen: warten; abgeholt, aber noch auf der Karte: zurück zur Geschichte. */
function verifyFlyIn(tries: number): void {
  const f = useFlowStore.getState();
  if (useGridStore.getState().session !== 'classic' || f.phase !== 'map') return;
  if (f.pending && tries < 20) {
    setTimeout(() => verifyFlyIn(tries + 1), 100);
    return;
  }
  useGridStore.getState().endClassic();
}

/** Installiert die Klassik-Verdrahtung; liefert die Aufräumfunktion (HMR, Tests). */
export function installKlassikSession(adapters: KlassikAdapters): () => void {
  const offs: Array<() => void> = [];
  let hooked = false;
  let ownsOverride = false;
  let hudJson = '';
  /** Laufender Durchgang: Format, Versuch und Bestwert zu seinem Beginn (für den Stempel). */
  let run: { key: string; startBest: number; stamped: boolean } | null = null;
  let pendingUnlockLine = false;
  let lineTimer: ReturnType<typeof setTimeout> | null = null;

  // ---------------------------------------------------------------- Einstieg auf der Karte
  const entry: MapEntry = {
    id: KLASSIK_ENTRY_ID,
    label: 'Klassik',
    icon: 'square.grid.4x3.fill',
    glyph: '2048',
    order: 20,
    open: () => useKlassik.getState().toggleSheet(),
  };
  const removeEntry = () => {
    const entries = useMapEntries.getState().entries;
    if (entries.some((e) => e.id === KLASSIK_ENTRY_ID)) useMapEntries.setState({ entries: entries.filter((e) => e.id !== KLASSIK_ENTRY_ID) });
  };
  const syncEntry = () => {
    const p = useProgress.getState();
    const open = openFormatIds(p.mode, p.reached);
    if (open.length === 0) {
      removeEntry();
      return;
    }
    const seen = useKlassik.getState().slots[p.mode].seen;
    const highlight = open.some((id) => !seen.includes(id));
    const current = useMapEntries.getState().entries.find((e) => e.id === KLASSIK_ENTRY_ID);
    if (!current) useMapEntries.getState().register({ ...entry, highlight });
    else if ((current.highlight ?? false) !== highlight) useMapEntries.getState().patch(KLASSIK_ENTRY_ID, { highlight });
  };

  // ---------------------------------------------------------------- Freischaltung nach einem Sieg
  let known = { mode: activeMode(), open: new Set(openFormatIds(activeMode(), useProgress.getState().reached)) };
  const onWon = () => {
    const p = useProgress.getState();
    const now = openFormatIds(p.mode, p.reached);
    if (p.mode === known.mode && now.some((id) => !known.open.has(id))) pendingUnlockLine = true;
    known = { mode: p.mode, open: new Set(now) };
    syncEntry();
  };
  bus.on('progress/won', onWon);
  offs.push(() => bus.off('progress/won', onWon));
  offs.push(
    useProgress.subscribe((s, prev) => {
      // Moduswechsel: die Freischaltungen des anderen Stands gelten als bekannt (keine Ansage).
      if (s.mode !== prev.mode) known = { mode: s.mode, open: new Set(openFormatIds(s.mode, s.reached)) };
      if (s.mode !== prev.mode || s.reached !== prev.reached) syncEntry();
    }),
  );
  offs.push(
    useKlassik.subscribe((s, prev) => {
      if (s.sheetOpen && !prev.sheetOpen) {
        // Das Blatt zeigt alle offenen Formate: gesehen, der Einstieg hört auf zu leuchten.
        const p = useProgress.getState();
        useKlassik.getState().markSeen(p.mode, openFormatIds(p.mode, p.reached));
      }
      if (s.slots !== prev.slots) syncEntry();
    }),
  );

  // ---------------------------------------------------------------- Flow: Sitzung endet auf der Karte
  offs.push(
    useFlowStore.subscribe((s, prev) => {
      if (s.phase === prev.phase) return;
      if (s.phase === 'map' || s.phase === 'splash' || s.phase === 'hop') useGridStore.getState().endClassic();
      if (s.phase !== 'map') useKlassik.getState().closeSheet();
      if (s.phase === 'map' && pendingUnlockLine) {
        pendingUnlockLine = false;
        if (lineTimer) clearTimeout(lineTimer);
        lineTimer = setTimeout(() => {
          lineTimer = null;
          if (useFlowStore.getState().phase === 'map') useFlowStore.getState().setRex(rexLine('classic.unlock') ?? 'Neues Raster frei!');
        }, UNLOCK_LINE_DELAY_MS);
      }
    }),
  );

  // ---------------------------------------------------------------- Brett: Wesen-Hook, HUD, Bestwert
  const syncHud = () => {
    const g = useGridStore.getState();
    if (g.session !== 'classic' || !g.classicFormat) {
      if (ownsOverride) {
        ownsOverride = false;
        hudJson = '';
        useHudOverride.getState().set(null);
      }
      return;
    }
    const score = g.state?.score ?? 0;
    const best = Math.max(useKlassik.getState().bestOf(activeMode(), g.classicFormat.id), score);
    const next = {
      title: `Klassik ${g.classicFormat.name}`,
      subtitle: `Bestwert ${best}`,
      moves: String(score),
      movesLabel: 'Punkte',
      goals: [],
      lostText: 'Kein Zug mehr',
    };
    const json = JSON.stringify(next);
    if (json === hudJson && ownsOverride) return;
    hudJson = json;
    ownsOverride = true;
    useHudOverride.getState().set(next);
  };

  const syncBoard = () => {
    const g = useGridStore.getState();
    const classic = g.session === 'classic' && !!g.classicFormat;
    if (classic !== hooked) {
      hooked = classic;
      adapters.setCreatureChoice(classic ? classicCreatureFor : null);
    }
    if (!classic || !g.classicFormat || !g.level || !g.state) {
      run = null;
      syncHud();
      return;
    }
    const mode = activeMode();
    const id = g.classicFormat.id;
    const key = `${mode}|${id}|${g.level.id}|${g.levelIndex}|${g.attempt}`;
    if (!run || run.key !== key) run = { key, startBest: useKlassik.getState().bestOf(mode, id), stamped: false };
    const score = g.state.score;
    if (useKlassik.getState().submitScore(mode, id, score) && run.startBest > 0 && score > run.startBest && !run.stamped) {
      run.stamped = true;
      useKlassik.getState().showStamp();
      adapters.sfx('newBest');
      bus.emit('flow/cue', { cue: 'newBest' });
    }
    syncHud();
  };
  offs.push(
    useGridStore.subscribe((s, prev) => {
      if (s.session !== prev.session || s.classicFormat !== prev.classicFormat || s.state !== prev.state || s.level !== prev.level || s.attempt !== prev.attempt) syncBoard();
    }),
  );

  syncEntry();
  syncBoard();

  return () => {
    for (const off of offs) off();
    if (lineTimer) clearTimeout(lineTimer);
    if (hooked) adapters.setCreatureChoice(null);
    if (ownsOverride) useHudOverride.getState().set(null);
    removeEntry();
  };
}
