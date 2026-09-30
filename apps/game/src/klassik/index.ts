import { BoardRenderer } from '@ee/render';
import { audio } from '../audio/engine';
import { setCreatureChoice } from '../audio/bodies';
import { isZoneKey } from '../audio/scales';
import { useGridStore } from '../lab/grid/gridStore';
import { mountKlassikLayer } from './KlassikLayer';
import { installKlassikSession } from './session';

/**
 * Klassik-2048 (Iteration 4, Florian Punkt 7): einmal importiert (FlowView), meldet es den Karten-Einstieg an,
 * verdrahtet Sitzung, Brett-Hook, HUD und Bestwerte und hängt das Format-Blatt samt Stempel über die Szene.
 */
let dispose: (() => void) | null = null;

function install(): void {
  if (dispose || typeof window === 'undefined') return;
  const offSession = installKlassikSession({
    setCreatureChoice: (fn) => {
      // Nur dieses Feld der App-weiten Hooks; Sammlung („NEU!“) und andere bleiben.
      if (fn) BoardRenderer.defaultHooks.creatureFor = (blob) => fn(blob);
      else delete BoardRenderer.defaultHooks.creatureFor;
      setCreatureChoice(fn);
    },
    sfx: (id) => {
      const zone = useGridStore.getState().level?.zone;
      audio.sfx(id, isZoneKey(zone) ? { zone } : {});
    },
  });
  const unmount = mountKlassikLayer();
  dispose = () => {
    offSession();
    unmount();
  };
}

install();

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    dispose?.();
    dispose = null;
  });
}
