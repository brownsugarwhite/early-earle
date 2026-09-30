import { Link } from 'react-router';
import { Glyph } from './glyphs';
import { IS_NATIVE } from '../editor/content/target';

/**
 * Whether the Werkstatt (labs + editors) is reachable from the game: always in dev and in the iOS app (test
 * builds for Florian and Nicole), in a static web build only with VITE_WERKSTATT=1; VITE_WERKSTATT=0 hides it
 * everywhere (store builds).
 */
export const WERKSTATT_ENABLED: boolean =
  import.meta.env.VITE_WERKSTATT === '0' ? false : import.meta.env.VITE_WERKSTATT === '1' || import.meta.env.DEV || IS_NATIVE;

/** Native glass pill for the map's action row (plugins/liquid-glass): icon only, SF Symbol wrench. */
export const WERKSTATT_GLASS_ACTION = { id: 'werkstatt', label: 'Werkstatt', icon: 'wrench.and.screwdriver.fill', iconOnly: true } as const;

/** Square glass button next to the sound toggle on the map (CSS HUD on the web; the app shows the native pill). */
export function WerkstattButton() {
  return (
    <Link to="/werkstatt" className="glass-btn glass werkstatt-btn" data-testid="werkstatt-btn" aria-label="Werkstatt: Labs und Editoren" title="Werkstatt">
      <Glyph name="wrench" size={22} />
    </Link>
  );
}
