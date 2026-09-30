import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { BoardRenderer, type BoardHooks, type MadeCreature } from '@ee/render';
import type { ZoneId } from '@ee/genome';
import { useGridStore } from '../lab/grid/gridStore';
import { rexLine } from '../lab/grid/rex';
import { useFlowStore } from '../flow/flowStore';
import { useMapEntries } from '../flow/mapEntries';
import { useProgress } from '../state/progress';
import { BUNDLED_RULES } from '../lab/creature/content';
import { audio } from '../audio/engine';
import { isZoneKey } from '../audio/scales';
import { wireCollection, type CollectionWiring } from './wiring';
import { destroySetzkasten, openSetzkasten, prewarmSetzkasten } from './Setzkasten';
import { installMapCreaturesDemo } from './mapDemo';

export { catalogInputs, catalogFor, catalogEntry, levelIdOf, rarityOf, seedFor, SPECIES_NAME, ZONE_NAME, ZONE_LEVELS } from './catalog';
export { earnedFromEvents, blobSeed, type EarnedLook } from './earn';
export { openSetzkasten, closeSetzkasten, isSetzkastenOpen } from './Setzkasten';

/** ID des Karten-Einstiegs (auch die ID der nativen Pille). */
export const COLLECTION_ENTRY_ID = 'collection';

let installs = 0;
let dispose: (() => void) | null = null;
let current: CollectionWiring | null = null;

/**
 * Installiert die Sammlung für den Flow (FlowView, einmal; ref-gezählt wie Audio und Haptik): verbucht erschaffene
 * Wesen, beantwortet die Brett-Hooks (`isNewCreature` → "NEU!", `stampShown` → Klang, Haptik), meldet den Karten-
 * Einstieg "Setzkasten" an (hervorgehoben, solange ungesehene Wesen warten). Rückgabe: Freigabe (für `useEffect`).
 */
export function installCollection(): () => void {
  installs += 1;
  if (!dispose) dispose = wire();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    installs -= 1;
    if (installs === 0) {
      dispose?.();
      dispose = null;
    }
  };
}

/** Neue Wesen des laufenden Levelversuchs in Fundreihenfolge (der Aufbruch schickt sie auf die Map). */
export function foundThisLevel(): readonly import('../state/progress').CollectionEntry[] {
  return current?.found ?? [];
}

/** Level-Lauf, in dem REX den ersten Stempel schon kommentiert hat. */
let rexRun = '';

function stampFeedback(made: MadeCreature): void {
  if (import.meta.env.DEV) {
    // Tests zählen die gezeigten Stempel.
    const ee = ((window as unknown as { __ee?: Record<string, unknown> }).__ee ??= {});
    ee['stamps'] = ((ee['stamps'] as number | undefined) ?? 0) + 1;
  }
  const zone: ZoneId | undefined = isZoneKey(made.zone) ? (made.zone as ZoneId) : undefined;
  audio.sfx('stamp', zone ? { zone, tier: made.tier } : { tier: made.tier });
  audio.sfx('newCreature', zone ? { zone, tier: made.tier } : { tier: made.tier }, 0.08);
  if (Capacitor.isNativePlatform()) void Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => undefined);
  // REX kommentiert den ersten Stempel eines Levelversuchs ("Neu! Ab in den Setzkasten."), nie über Sieg/Niederlage.
  const grid = useGridStore.getState();
  const run = `${grid.level?.id ?? ''}#${grid.attempt}`;
  if (run !== rexRun && grid.state?.status === 'playing') {
    rexRun = run;
    const line = rexLine('collection.new');
    if (line) useGridStore.setState({ rex: line });
  }
}

function wire(): () => void {
  const wiring = wireCollection({
    grid: useGridStore,
    flow: useFlowStore,
    record: (input) => useProgress.getState().recordCollect(input),
    rules: () => BUNDLED_RULES,
    onStamp: stampFeedback,
    dev: import.meta.env.DEV,
    warn: (m) => console.warn(m),
  });
  current = wiring;
  // Brett-Hooks der App: die der Sammlung zu denen anderer Baustellen (Klassik: creatureFor).
  const mine: BoardHooks = wiring.hooks;
  BoardRenderer.defaultHooks = { ...BoardRenderer.defaultHooks, ...mine };
  const offEntry = registerEntry();
  const offDemo = installMapCreaturesDemo();
  // Den Setzkasten vorwärmen, sobald die Karte eine Weile ruht (das erste Öffnen zeigt sofort ein Bild).
  const warmTimer = setTimeout(
    () =>
      void prewarmSetzkasten().catch((e: unknown) => {
        if (import.meta.env.DEV) console.warn('[setzkasten] Vorwärmen fehlgeschlagen', e);
      }),
    6000,
  );
  return () => {
    clearTimeout(warmTimer);
    destroySetzkasten();
    offDemo();
    offEntry();
    const hooks = { ...BoardRenderer.defaultHooks };
    if (hooks.isNewCreature === mine.isNewCreature) delete hooks.isNewCreature;
    if (hooks.stampShown === mine.stampShown) delete hooks.stampShown;
    BoardRenderer.defaultHooks = hooks;
    wiring.dispose();
    current = null;
  };
}

/** Der Karten-Einstieg "Setzkasten"; `highlight` folgt den ungesehenen Wesen (Fund, Ansehen, Moduswechsel). */
function registerEntry(): () => void {
  const unseen = () => useProgress.getState().unseenCount() > 0;
  let lit = unseen();
  useMapEntries.getState().register({ id: COLLECTION_ENTRY_ID, label: 'Setzkasten', icon: 'square.grid.3x3.fill', glyph: '▦', order: 10, open: openSetzkasten, highlight: lit });
  const off = useProgress.subscribe((s, prev) => {
    if (s.collection === prev.collection && s.mode === prev.mode) return;
    const now = unseen();
    if (now === lit) return;
    lit = now;
    useMapEntries.getState().patch(COLLECTION_ENTRY_ID, { highlight: now });
  });
  return () => {
    off();
    useMapEntries.setState({ entries: useMapEntries.getState().entries.filter((e) => e.id !== COLLECTION_ENTRY_ID) });
  };
}
