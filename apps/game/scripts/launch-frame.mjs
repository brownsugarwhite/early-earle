#!/usr/bin/env node
/**
 * iOS-Startbild = erstes Bild des Loaders (Stamm als 4-%-Streifen, "0%", Schatten auf dem Splash-Ink):
 *
 *   node scripts/launch-frame.mjs            (startet selbst einen Vite-Server auf LAUNCH_PORT/E2E_PORT, Standard 4201)
 *   LAUNCH_URL=http://127.0.0.1:4201 node scripts/launch-frame.mjs   (vorhandener Server)
 *
 * Rendert `/?splash=launchframe` mit Playwright in genau dem Design-Rechteck (838 × 1428 → 430 × 733 pt, 3×) und
 * schreibt ios/App/App/Assets.xcassets/LaunchLoader.imageset. LaunchScreen.storyboard legt das Bild mit
 * scaleAspectFit an die Ränder — wie `object-fit: contain` in der Web-Ansicht (viewport-fit=cover), also
 * deckungsgleich mit dem ersten Web-Bild.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const here = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(here, '..');
const OUT_DIR = path.join(appDir, 'ios/App/App/Assets.xcassets/LaunchLoader.imageset');
const W = 430;
const H = Math.round((W * 1428) / 838);
const SCALE = 3;

let server = null;
let base = process.env.LAUNCH_URL;
if (!base) {
  const port = Number(process.env.LAUNCH_PORT ?? process.env.E2E_PORT ?? 4201);
  base = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, [path.join(appDir, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    cwd: appDir,
    env: { ...process.env, NO_SSL: '1' },
    stdio: ['ignore', 'ignore', 'inherit'],
    detached: true,
  });
  const deadline = Date.now() + 120_000;
  for (;;) {
    try {
      if ((await fetch(base)).status < 500) break;
    } catch {
      // noch nicht bereit
    }
    if (Date.now() > deadline) throw new Error(`Server ${base} nicht bereit`);
    await new Promise((r) => setTimeout(r, 300));
  }
}
const stop = () => {
  if (!server) return;
  try {
    process.kill(-server.pid, 'SIGKILL');
  } catch {
    // schon weg
  }
};

try {
  // echte GPU (Mac): die 3D-Szene lädt im Hintergrund mit, unter Software-GL würde sie die Seite ausbremsen
  const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: SCALE });
  await page.goto(`${base}/?splash=launchframe`, { waitUntil: 'load' });
  await page.waitForSelector('#ee-splash[data-progress="0"]', { state: 'attached', timeout: 120_000 });
  // Web-Fonts sind nicht beteiligt (Ziffern sind Umrisse); zwei Bilder für den stabilen Stand
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const png = await page.locator('#ee-splash .ee-box').screenshot({ timeout: 120_000 });
  await browser.close();
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'launch-loader@3x.png'), png);
  fs.writeFileSync(
    path.join(OUT_DIR, 'Contents.json'),
    JSON.stringify({ images: [{ idiom: 'universal', filename: 'launch-loader@3x.png', scale: '3x' }], info: { version: 1, author: 'xcode' } }, null, 2) + '\n',
  );
  console.log(`LaunchLoader ${W * SCALE}×${H * SCALE} px → ${path.relative(appDir, OUT_DIR)}`);
} finally {
  stop();
}
