// Typprüfung eines Studio-Pakets (Skript `typecheck` jedes Studio-Pakets, Plan 2.3 Nr. 1), im Ordner des Pakets gestartet:
//   1. tsconfig.json: alles im Paket (Quellen, Tests, Konfiguration). Über die Typen von vitest kommt Node mit; für Tests ist das richtig.
//   2. tsconfig.quellen.json, wenn das Paket sie hat und src/ Quellen ohne Tests hat: nur die Quellen (ohne *.test.ts und
//      *.testhilfe.ts) und damit ohne Node. So fällt `process`, `Buffer` oder `setTimeout` in einem Paket ohne Node auf, auch wenn die
//      Tests daneben Node-Typen haben. Ein Paket ohne Quellen überspringt diesen Schritt (sonst meldete tsc TS18003).
// tsc kommt aus dem Paket selbst (typescript steht in den devDependencies jedes Studio-Pakets). Der zweite Schritt läuft nur, wenn der
// erste grün ist. Exitcode: der des ersten roten Laufs, sonst 0.
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const ORDNER = process.cwd();
const QUELLEN_KONFIG = 'tsconfig.quellen.json';

/** Gibt es unter `ordner` eine Quelle, die kein Test, keine Testhilfe und keine Typdeklaration ist? */
function hatQuellen(ordner) {
  if (!existsSync(ordner)) return false;
  for (const e of readdirSync(ordner, { withFileTypes: true })) {
    const p = path.join(ordner, e.name);
    if (e.isDirectory()) {
      if (hatQuellen(p)) return true;
    } else if (/\.tsx?$/.test(e.name) && !/\.d\.ts$/.test(e.name) && !/\.(test|testhilfe)\.tsx?$/.test(e.name)) {
      return true;
    }
  }
  return false;
}

/** tsc --noEmit über eine Konfiguration; die Ausgabe geht unverändert weiter (scripts/studio-pruefen.mjs liest die Fehlerzeilen). */
function pruefen(tsc, konfig, ueberschrift) {
  const r = spawnSync(process.execPath, [tsc, '--noEmit', '-p', konfig], { cwd: ORDNER, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const ausgabe = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  if (r.error) {
    console.error(`studio-typen: tsc ließ sich nicht starten (${r.error.message})`);
    return 1;
  }
  if (r.status !== 0) {
    if (ueberschrift) console.log(ueberschrift);
    process.stdout.write(ausgabe);
  }
  return r.status ?? 1;
}

function main() {
  let tsc;
  try {
    tsc = createRequire(path.join(ORDNER, 'package.json')).resolve('typescript/bin/tsc');
  } catch {
    console.error(`studio-typen: typescript fehlt in ${ORDNER} (devDependencies)`);
    return 1;
  }
  const alles = pruefen(tsc, 'tsconfig.json', '');
  if (alles !== 0) return alles;
  if (!existsSync(path.join(ORDNER, QUELLEN_KONFIG)) || !hatQuellen(path.join(ORDNER, 'src'))) return 0;
  return pruefen(
    tsc,
    QUELLEN_KONFIG,
    `Quellen ohne Tests (${QUELLEN_KONFIG}), ohne Node-Typen: Dieses Paket läuft im Browser oder im Simulationspfad (Plan 2.1, 2.3 Nr. 1).`,
  );
}

process.exit(main());
