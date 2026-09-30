import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CreatureChoice } from '@ee/render';
import { useFlowStore } from '../flow/flowStore';
import { useHudOverride } from '../flow/hudOverride';
import { mapEntry } from '../flow/mapEntries';
import { useGridStore } from '../lab/grid/gridStore';
import { LEVELS } from '../content/levels';
import { useProgress } from '../state/progress';
import { installKlassikSession, startKlassik } from './session';
import { useKlassik } from './store';

type ChoiceFn = ((blob: { id: number; tier: number }) => CreatureChoice) | null;

/** Eine Attrappe der Szene: nimmt Anflug und Verlassen an wie FlowScene (synchron, lädt über den Grid-Store). */
function fakeScene(): () => void {
  let last = -1;
  return useFlowStore.subscribe((s) => {
    const req = s.pending;
    if (!req || req.seq === last) return;
    last = req.seq;
    const flow = useFlowStore.getState();
    flow.clearRequest();
    if (req.kind === 'flyIn' && flow.phase === 'map') {
      flow.setPhase('flyIn');
      flow.setPlaying(req.node ?? flow.current);
      useGridStore.getState().loadLevel(req.node ?? flow.current);
      flow.setPhase('level');
    } else if (req.kind === 'leave' && flow.phase === 'level') {
      flow.setPhase('depart');
      flow.setPlaying(null);
      flow.setPhase('map');
    }
  });
}

/** Zieht, bis der Punktestand steigt (höchstens n Züge). */
function playUntilScore(min: number, n = 400): void {
  for (let i = 0; i < n && (useGridStore.getState().state?.score ?? 0) < min; i++) {
    const s = useGridStore.getState();
    if (s.state?.status !== 'playing') break;
    let moved = false;
    for (const d of ['left', 'down', 'right', 'up'] as const) {
      if (useGridStore.getState().move(d)) {
        useGridStore.getState().setAnimating(false);
        moved = true;
        break;
      }
    }
    if (!moved) break;
  }
}

describe('Klassik-Sitzung', () => {
  const choices: ChoiceFn[] = [];
  const sounds: string[] = [];
  let off: () => void = () => undefined;
  let offScene: () => void = () => undefined;

  beforeEach(() => {
    useKlassik.getState().resetAll();
    const p = useProgress.getState();
    p.setMode('free');
    p.resetSlot('free');
    p.resetSlot('real');
    useProgress.getState().unlockTo(3);
    useGridStore.getState().endClassic();
    useGridStore.getState().loadLevel(0);
    useFlowStore.getState().reset('map', LEVELS.length);
    useFlowStore.getState().setCurrent(3);
    useHudOverride.getState().set(null);
    choices.length = 0;
    sounds.length = 0;
    off = installKlassikSession({ setCreatureChoice: (fn) => choices.push(fn), sfx: (id) => sounds.push(id) });
    offScene = fakeScene();
  });

  afterEach(() => {
    offScene();
    off();
    vi.useRealTimers();
  });

  it('meldet den Karten-Einstieg an; er leuchtet, bis das Blatt offen war', () => {
    const e = mapEntry('classic');
    expect(e).toMatchObject({ label: 'Klassik', icon: 'square.grid.4x3.fill', glyph: '2048', order: 20, highlight: true });
    e!.open();
    expect(useKlassik.getState().sheetOpen).toBe(true);
    expect(mapEntry('classic')?.highlight).toBe(false);
    expect(useKlassik.getState().slots.free.seen).toContain('riss');
  });

  it('zeigt den Einstieg im echten Stand erst mit dem ersten offenen Format', () => {
    useProgress.getState().setMode('real');
    expect(mapEntry('classic')).toBeUndefined();
    useProgress.getState().unlockTo(5);
    expect(mapEntry('classic')?.highlight).toBe(true);
  });

  it('spielt Klassik am aktuellen Knoten und kehrt auf der Karte zur Geschichte zurück', () => {
    useKlassik.getState().openSheet();
    expect(startKlassik('4x4')).toBe(true);
    const g = useGridStore.getState();
    expect(useKlassik.getState().sheetOpen).toBe(false);
    expect(useFlowStore.getState().phase).toBe('level');
    expect(g.session).toBe('classic');
    expect(g.levelIndex).toBe(3);
    expect(g.level).toMatchObject({ id: 'klassik-4x4', zone: LEVELS[3]!.zone });
    // Brett-Hook gesetzt: bestes Wesen je Stufe (leere Sammlung → Tjorizo-Grundwesen)
    const hook = choices.at(-1);
    expect(hook).toBeTypeOf('function');
    expect(hook!({ id: 4, tier: 13 })).toEqual({ zone: 'tjorizo', seed: 4 * 31 + 7, tier: 12 });
    // HUD: Punkte statt Züge
    expect(useHudOverride.getState().override).toEqual({ title: 'Klassik 4×4', subtitle: 'Bestwert 0', moves: '0', movesLabel: 'Punkte', goals: [], lostText: 'Kein Zug mehr' });
    playUntilScore(8);
    const score = useGridStore.getState().state!.score;
    expect(useHudOverride.getState().override?.moves).toBe(String(score));
    expect(useKlassik.getState().bestOf('free', '4x4')).toBe(score);
    // Map: zurück zur Geschichte, Hook und HUD weg
    useFlowStore.getState().request('leave');
    expect(useFlowStore.getState().phase).toBe('map');
    expect(useGridStore.getState().session).toBe('story');
    expect(choices.at(-1)).toBeNull();
    expect(useHudOverride.getState().override).toBeNull();
    // der nächste Anflug spielt wieder das Level des Knotens
    useFlowStore.getState().request('flyIn', 3);
    expect(useGridStore.getState().level?.id).toBe(LEVELS[3]!.id);
  });

  it('startet nur offene Formate und nur auf der Karte', () => {
    useProgress.getState().setMode('real');
    expect(startKlassik('riss')).toBe(false);
    expect(useGridStore.getState().session).toBe('story');
    useProgress.getState().setMode('free');
    useFlowStore.getState().setPhase('level');
    expect(startKlassik('4x4')).toBe(false);
  });

  it('fällt zurück in die Geschichte, wenn die Szene den Anflug nicht annimmt', () => {
    vi.useFakeTimers();
    offScene();
    offScene = () => undefined;
    expect(startKlassik('3x3')).toBe(true);
    expect(useGridStore.getState().session).toBe('classic');
    vi.advanceTimersByTime(2500);
    expect(useGridStore.getState().session).toBe('story');
  });

  it('stempelt „Bestwert!“ einmal, wenn ein Durchgang den alten Bestwert überbietet', () => {
    useKlassik.getState().submitScore('free', '4x4', 4);
    expect(startKlassik('4x4')).toBe(true);
    expect(useHudOverride.getState().override?.subtitle).toBe('Bestwert 4');
    playUntilScore(40);
    expect(useGridStore.getState().state!.score).toBeGreaterThan(4);
    expect(useKlassik.getState().stamp).toBe(1);
    expect(sounds).toEqual(['newBest']);
    // ein neuer Versuch mit höherem Bestwert beginnt wieder bei null
    useGridStore.getState().restart();
    expect(useHudOverride.getState().override?.moves).toBe('0');
  });

  it('sagt ein neues Raster nach dem Sieg auf der Karte an (echter Stand)', () => {
    vi.useFakeTimers();
    useProgress.getState().setMode('real');
    useProgress.getState().unlockTo(4);
    expect(mapEntry('classic')).toBeUndefined();
    useFlowStore.getState().setPhase('depart');
    useProgress.getState().recordWin('tjorizo-005', 4, 100, 3, LEVELS.length);
    expect(mapEntry('classic')?.highlight).toBe(true);
    useFlowStore.getState().setRex('Weiter.');
    useFlowStore.getState().setPhase('map');
    vi.advanceTimersByTime(1000);
    expect(useFlowStore.getState().rex).toBe('Neues Raster frei!');
  });
});
