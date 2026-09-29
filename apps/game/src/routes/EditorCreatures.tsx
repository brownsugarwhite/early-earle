import { useEffect, useState } from 'react';
import { Link } from 'react-router';

/** Platzhalter: listet die JSON-Dateien über den Dev-Endpunkt. Der echte Editor folgt mit P3/P4. */
export function EditorCreatures() {
  const [files, setFiles] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetch(import.meta.env.BASE_URL + '__content/genome')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status + ' ' + r.statusText))))
      .then((j: { files: string[] }) => setFiles(j.files))
      .catch((e: Error) => setError(e.message));
  }, []);
  return (
    <main className="page">
      <h1 className="display">Creature-Editor</h1>
      <p className="lede">Inhalte aus <code>content/genome/</code> (Dev-Endpunkt).</p>
      {error ? <p className="error">Endpunkt nicht erreichbar: {error} (nur im Dev-Server verfügbar)</p> : null}
      <ul className="list">{(files ?? []).map((f) => <li key={f}>{f}</li>)}</ul>
      {files && files.length === 0 ? <p>Noch keine Dateien.</p> : null}
      <Link className="tile" to="/">◀ Start</Link>
    </main>
  );
}
