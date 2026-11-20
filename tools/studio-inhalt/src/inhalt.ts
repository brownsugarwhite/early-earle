// Zusammenbau der Inhalt-Skripte (Plan 2.2, 6.4): Sie legen den Inhalt der Demo über die Handgriffe an, so wie Florian es von Hand
// könnte (Herkunft „gebaut“, stabile Kennungen, idempotent, über Ablage und Store datensatzweise zusammengeführt).
//   pnpm --filter @ee/studio-inhalt inhalt                   alle eingetragenen Inhalt-Skripte der Reihe nach (bis zur laufenden Etappe)
//   pnpm --filter @ee/studio-inhalt inhalt -- <name>         nur eines, etwa huegel oder spielwiese
//   pnpm --filter @ee/studio-inhalt probeprojekt -- <name>   ein Probe-Projekt anlegen, etwa werkbank-probe oder bedienprobe
// Die Datei gehört der Integration. In M0 ist sie leer: Sie versteht die Aufrufe und meldet, dass noch nichts gebaut ist. Die
// Integration trägt jedes Skript nach seinem Paket unter SKRIPTE oder PROBEPROJEKTE ein. Ohne STUDIO_INHALT arbeiten die Skripte auf
// der Kopie in test-results/bau/inhalt (Plan 2.4).
import { pathToFileURL } from 'node:url';

/** Was ein Aufruf verlangt; `name` null heißt: alle Inhalt-Skripte */
export type InhaltAufruf = { art: 'inhalt'; name: string | null } | { art: 'probeprojekt'; name: string };

/** Ein Inhalt-Skript oder ein Probe-Projekt */
interface Skript {
  name: string;
  laufen(): Promise<void>;
}

/** Inhalt-Skripte in der Reihenfolge der Etappen; eingetragen von der Integration */
const SKRIPTE: readonly Skript[] = [];
/** Probe-Projekte (Plan 3.1, Befund 26); eingetragen von der Integration */
const PROBEPROJEKTE: readonly Skript[] = [];

const AUFRUF = [
  'Aufruf: pnpm --filter @ee/studio-inhalt inhalt [-- <name>]',
  '        pnpm --filter @ee/studio-inhalt probeprojekt -- <name>',
].join('\n');

/** Namen von Skripten und Probe-Projekten: Kleinbuchstaben, Ziffern, Bindestrich (ein Probe-Projekt wird ein Ordner) */
const NAME = /^[a-z0-9][a-z0-9-]{0,39}$/;

/** Liest die Argumente; ein `--`, das pnpm weiterreicht, zählt nicht. */
export function aufrufLesen(argumente: readonly string[]): InhaltAufruf | { fehler: string } {
  const worte = argumente.filter((a) => a !== '--');
  const art = worte[0] === 'probeprojekt' || worte[0] === 'inhalt' ? worte.shift() : 'inhalt';
  if (worte.length > 1) return { fehler: `zu viele Angaben: ${worte.join(' ')}` };
  const name = worte[0] ?? null;
  if (name !== null && !NAME.test(name)) return { fehler: `kein gültiger Name: „${name}“` };
  if (art === 'probeprojekt') return name === null ? { fehler: 'Name des Probe-Projekts fehlt' } : { art, name };
  return { art: 'inhalt', name };
}

/** Führt den Aufruf aus; gibt den Exitcode zurück */
export async function inhaltAusfuehren(aufruf: InhaltAufruf): Promise<number> {
  const liste = aufruf.art === 'inhalt' ? SKRIPTE : PROBEPROJEKTE;
  const was = aufruf.art === 'inhalt' ? 'Inhalt' : 'Probe-Projekt';
  const genannt = aufruf.name === null ? '' : ` „${aufruf.name}“`;
  if (liste.length === 0) {
    console.log(`${was}${genannt}: noch nichts gebaut. Die Integration trägt die Skripte nach ihren Paketen ein.`);
    return 0;
  }
  const gewaehlt = aufruf.name === null ? liste : liste.filter((s) => s.name === aufruf.name);
  if (gewaehlt.length === 0) {
    console.error(`${was}${genannt}: unbekannt. Eingetragen: ${liste.map((s) => s.name).join(', ')}`);
    return 2;
  }
  for (const s of gewaehlt) {
    console.log(`${was}: ${s.name}`);
    await s.laufen();
  }
  return 0;
}

const pfad = process.argv[1];
if (pfad !== undefined && import.meta.url === pathToFileURL(pfad).href) {
  const aufruf = aufrufLesen(process.argv.slice(2));
  if ('fehler' in aufruf) {
    console.error(`${aufruf.fehler}\n${AUFRUF}`);
    process.exitCode = 2;
  } else {
    process.exitCode = await inhaltAusfuehren(aufruf);
  }
}
