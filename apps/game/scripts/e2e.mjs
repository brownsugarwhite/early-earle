/**
 * Startet den Vite-Dev-Server selbst (ohne SSL, 127.0.0.1:4173 oder E2E_PORT), wartet auf Bereitschaft,
 * führt die Playwright-Smoke-Tests aus und beendet den Server hart (SIGKILL auf die Prozessgruppe).
 * Grund: Playwrights eigener webServer-Teardown wartete minutenlang auf Vite (Port blieb belegt).
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(here, '..');
// Parallel agents/worktrees: each run gets its own port (E2E_PORT), Playwright reads the same variable.
const port = Number(process.env.E2E_PORT ?? 4173);
const url = `http://127.0.0.1:${port}/`;

const server = spawn(
  process.execPath,
  [path.join(appDir, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
  { cwd: appDir, env: { ...process.env, NO_SSL: '1' }, stdio: ['ignore', 'ignore', 'inherit'], detached: true },
);

function killServer() {
  try {
    process.kill(-server.pid, 'SIGKILL');
  } catch {
    try { server.kill('SIGKILL'); } catch { /* schon weg */ }
  }
}
process.on('exit', killServer);
process.on('SIGINT', () => { killServer(); process.exit(130); });
process.on('SIGTERM', () => { killServer(); process.exit(143); });

// Cold starts after a merge (dependency pre-bundling) under load can take longer than a minute.
const deadline = Date.now() + 180_000;
let ready = false;
while (Date.now() < deadline) {
  try {
    const r = await fetch(url);
    if (r.status < 500) { ready = true; break; }
  } catch { /* noch nicht bereit */ }
  await new Promise((res) => setTimeout(res, 300));
}
if (!ready) {
  console.error(`Dev-Server unter ${url} nicht bereit`);
  killServer();
  process.exit(2);
}
console.log(`Dev-Server bereit: ${url}`);

const pw = spawn(
  path.join(appDir, 'node_modules/.bin/playwright'),
  ['test', ...process.argv.slice(2)],
  { cwd: appDir, env: { ...process.env, PW_REUSE_SERVER: '1' }, stdio: 'inherit' },
);
pw.on('exit', (code, signal) => {
  killServer();
  process.exit(code ?? (signal ? 1 : 0));
});
