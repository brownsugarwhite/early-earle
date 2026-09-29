import { Link } from 'react-router';

export function Home() {
  return (
    <main className="page">
      <h1 className="display">early earle</h1>
      <p className="lede">Produktionsstand P0 — Scaffold. Neo-Brutalismus trifft Eyvind Earle.</p>
      <nav className="tiles">
        <Link className="tile" to="/play">Spielen</Link>
        <Link className="tile" to="/lab">Lab (Prototypen)</Link>
        <Link className="tile" to="/editor/levels">Level-Editor</Link>
        <Link className="tile" to="/editor/creatures">Creature-Editor</Link>
        <Link className="tile" to="/editor/map">Map-Editor</Link>
      </nav>
    </main>
  );
}
