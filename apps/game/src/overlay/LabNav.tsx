import { Link } from 'react-router';
import { Glyph } from './glyphs';

/**
 * Navigation of every lab and editor: back to the Werkstatt (pink) and straight back to the game (sky).
 * In the iPhone app there is no URL bar — these two buttons are the way out. On narrow phones the game
 * button shows only the planet glyph (labelled for screen readers).
 */
export function LabNav({ game = true, className = '' }: { game?: boolean; className?: string }) {
  return (
    <nav className={`lab-nav ${className}`.trim()} aria-label="Navigation">
      <Link to="/werkstatt" className="lab-back" data-testid="lab-back" aria-label="Zur Werkstatt">
        <Glyph name="back" size={16} />
        <span>Werkstatt</span>
      </Link>
      {game ? (
        <Link to="/play" className="lab-play" data-testid="lab-game" aria-label="Zurück zum Spiel" title="Zurück zum Spiel">
          <Glyph name="planet" size={20} />
          <span className="lab-play-label">Spiel</span>
        </Link>
      ) : null}
    </nav>
  );
}
