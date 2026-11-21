// Rendert Abläufe als PNG-Folge (60 fps) im Headless-Chromium und kodiert sie mit ffmpeg.
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { SP, playwrightPath } from './lib.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require(playwrightPath);
const [seqs, outDir] = [process.argv[2].split(','), process.argv[3]]; const W = 1920, H = 1080, FPS = 60;
const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
await page.goto('file://' + new URL('./seite/test.html', import.meta.url).pathname); await page.evaluate(([w, h]) => { const c = document.getElementById('c'); c.width = w; c.height = h; }, [W, H]);
for (const s of seqs) {
  const dur = await page.evaluate(k => ILLUDIY.SEQ[k].dur, s); const n = Math.round((dur + 0.7) * FPS); const dir = `${SP}/frames_${s}`; fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
  const el = await page.$('#c');
  for (let i = 0; i < n; i++) { await page.evaluate(([k, t]) => window.shot(k, t), [s, i / FPS]); await el.screenshot({ path: `${dir}/${String(i).padStart(4, '0')}.png` }); }
  const out = `${outDir}/${s}.mp4`;
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', `${dir}/%04d.png`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '16', '-preset', 'slow', '-movflags', '+faststart', out]);
  console.log(s, n, 'Bilder ->', out, (fs.statSync(out).size / 1024 / 1024).toFixed(2), 'MB');
}
await browser.close();
