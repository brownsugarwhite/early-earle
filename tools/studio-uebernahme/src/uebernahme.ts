// Zusammenbau der Übernahme (Plan 2.2, 6.1, 6.2): Ozzy kommt als Daten nach Studio, nie als Code.
//   pnpm --filter @ee/studio-uebernahme uebernehmen               alles
//   pnpm --filter @ee/studio-uebernahme uebernehmen -- --kopf     nur der Kopf (so startet sie auch der Server, wenn Florian im
//                                                                 Prototyp speichert; Plan 4.9)
// Die Datei gehört der Integration. In M0 ist sie leer: Sie versteht die Aufrufe und meldet, dass noch nichts gebaut ist. Die Schritte
// bauen M1.8 (Kopf) und M4.4 (Haltungen und Abläufe); die Integration trägt sie danach unter SCHRITTE ein.
// Geschrieben wird später nur über Ablage und Store (Quelle automatik), datensatzweise; Florians Dateien unter docs/look/ozzy-figur/
// und apps/editor/ liest die Übernahme nur (Plan 6.3).
import { pathToFileURL } from 'node:url';

/** Was ein Aufruf verlangt */
export interface UebernahmeAufruf {
  /** nur der Kopf (`--kopf`), sonst alles */
  nurKopf: boolean;
}

/** Ein Schritt der Übernahme; `kopf` gehört zum Kopf und läuft auch mit `--kopf` */
interface Schritt {
  name: string;
  kopf: boolean;
  laufen(): Promise<void>;
}

/** Eingetragen von der Integration nach M1.8 und M4.4, in der Reihenfolge von Plan 6.2 */
const SCHRITTE: readonly Schritt[] = [];

const AUFRUF = 'Aufruf: pnpm --filter @ee/studio-uebernahme uebernehmen [-- --kopf]';

/** Liest die Argumente; ein `--`, das pnpm weiterreicht, zählt nicht. */
export function aufrufLesen(argumente: readonly string[]): UebernahmeAufruf | { fehler: string } {
  let nurKopf = false;
  for (const a of argumente) {
    if (a === '--') continue;
    if (a === '--kopf') nurKopf = true;
    else return { fehler: `unbekannte Angabe „${a}“` };
  }
  return { nurKopf };
}

/** Führt den Aufruf aus; gibt den Exitcode zurück */
export async function uebernehmen(aufruf: UebernahmeAufruf): Promise<number> {
  const was = aufruf.nurKopf ? 'Übernahme des Kopfs' : 'Übernahme';
  const schritte = SCHRITTE.filter((s) => !aufruf.nurKopf || s.kopf);
  if (schritte.length === 0) {
    console.log(`${was}: noch nichts gebaut. Die Schritte entstehen in M1.8 (Kopf) und M4.4 (Haltungen und Abläufe).`);
    return 0;
  }
  for (const s of schritte) {
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
    process.exitCode = await uebernehmen(aufruf);
  }
}
