// Ozzy: alle Fenster-Proben als eine Reihe (Plan „Ozzy stabil und schnell“, A0; Vorschlag 1 der Übergabe vom 17.11.).
// Lässt jede `ozzy-*-fenster.mjs` nacheinander im Vordergrund laufen (mit Grafikkarte) und meldet je Probe eine Zeile: ihr letztes
// Wort, wie viele Kriterien nicht erfüllt sind, die Dauer. Nicht erfüllte Kriterien stehen darunter. Am Ende eine Zeile für alle;
// der Rückgabewert ist 1, wenn eine Probe nicht hält. Rund sieben Minuten; währenddessen nichts unter `src` ändern, nie zusammen mit
// vitest.
// Aufruf aus apps/editor, Ozzy auf 5205:
//   node scripts/pruefen/ozzy-alle.mjs            alle
//   node scripts/pruefen/ozzy-alle.mjs lasso werk nur die, deren Name eines der Wörter enthält
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const hier = path.dirname(fileURLToPath(import.meta.url));
const nur = process.argv.slice(2);
const proben = fs
  .readdirSync(hier)
  .filter((n) => /^ozzy-.*-fenster\.mjs$/.test(n))
  .filter((n) => !nur.length || nur.some((w) => n.includes(w)))
  .sort();
let schlecht = 0;
const t0 = Date.now();
for (const n of proben) {
  const t = Date.now();
  const r = spawnSync(process.execPath, [path.join(hier, n)], { cwd: path.join(hier, '..', '..'), env: { ...process.env, GPU: '1' }, encoding: 'utf8', timeout: 400000 });
  const aus = `${r.stdout ?? ''}${r.stderr ?? ''}`.trim().split('\n');
  const fehl = aus.filter((z) => z.startsWith('FEHL'));
  const letzte = aus[aus.length - 1] ?? '';
  const gut = r.status === 0 && fehl.length === 0 && /alles gut/.test(letzte);
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${n.replace(/^ozzy-|-fenster\.mjs$/g, '')}: ${letzte.slice(0, 120)} [${Math.round((Date.now() - t) / 1000)} s]`);
  for (const z of fehl) console.log(`     ${z.slice(0, 260)}`);
  if (!gut && !fehl.length) console.log(`     ${aus.slice(-3).join(' | ').slice(0, 400)}`);
}
console.log(`${proben.length} Proben in ${Math.round((Date.now() - t0) / 1000)} s: ${schlecht ? `${schlecht} halten nicht` : 'alle halten'}`);
process.exit(schlecht ? 1 : 0);
