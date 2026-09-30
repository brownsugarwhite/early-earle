import { Link } from 'react-router';

export function LabIndex() {
  return (
    <main className="page">
      <h1 className="display">Lab</h1>
      <p className="lede">Jeder Prototyp ist eine Route mit eigenem Perf-Badge. Hänge <code>?backend=webgl</code> an, um den WebGL2-Fallback zu erzwingen.</p>
      <nav className="tiles">
        <Link className="tile" to="/lab/blob">P1 Blob-Lab</Link>
        <Link className="tile" to="/lab/earle">P2 Earle-Lab</Link>
        <Link className="tile" to="/lab/grid">P3 Grid-Lab</Link>
        <Link className="tile" to="/lab/creature">P4 Genom-Lab</Link>
        <Link className="tile" to="/lab/tree">P2d Baum-Lab</Link>
        <Link className="tile" to="/lab/shadow">P2e Schatten-Lab</Link>
        <Link className="tile" to="/lab/rex">P7 REX-Lab</Link>
        <Link className="tile" to="/lab/audio">P8 Audio-Lab</Link>
        <Link className="tile" to="/">◀ Start</Link>
      </nav>
    </main>
  );
}
