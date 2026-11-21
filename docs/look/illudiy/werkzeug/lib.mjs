import { createRequire } from 'node:module';
import fs from 'node:fs';
// Pfade relativ zu diesem Ordner: Quelle ist das Originalbild, Zwischenstände landen in ./arbeit (nicht im Repo).
const here = new URL('.', import.meta.url).pathname;
const repo = new URL('../../../../', import.meta.url).pathname;
const pnpm = repo + 'node_modules/.pnpm/';
const find = name => pnpm + fs.readdirSync(pnpm).find(d => d.startsWith(name + '@')) + '/node_modules/' + name;
const require = createRequire(import.meta.url);
export const sharp = require(find('sharp'));
export const playwrightPath = find('playwright');
export const SRC = here + '../illudiy-original.webp';
export const SP = here + 'arbeit';
fs.mkdirSync(SP, { recursive: true }); fs.mkdirSync(SP + '/page', { recursive: true });
export async function loadRaw() {
  const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}
