// Ozzy, Shader (20.11.2026, Plan docs/plans/2026-11-20-ozzy-shader.md): ein Bild je Shader an einer gesicherten Form.
// Läuft auf Port 5219 (Eintrag `ozzy-shader`). Ist dort kein Server, startet das Skript für die Dauer des Laufs einen eigenen Vite
// (so bleiben die Fenster der anderen Sitzungen, wie sie sind). Bilder: die Zeichenfläche der Haut allein (ohne Linien und Tafeln),
// dazu mit SEITE=1 die ganze Seite mit der Tafel.
// Aufruf aus apps/editor:
//   node scripts/ozzy/shader-bilder.mjs <ordner> [id …]
//   NAME=<Form> BUEHNE=0 WARTEN=<ms> GIER=<Grad> NEIGUNG=<Grad> ZOOM=<z> SEITE=1 B=1200 H=800 REGLER='{"stil":1}'
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const hier = path.dirname(fileURLToPath(import.meta.url));
const editor = path.join(hier, '..', '..');
const PORT = Number(process.env.PORT ?? 5219);
const ordner = process.argv[2] ?? '.';
const nur = process.argv.slice(3);
const NAME = process.env.NAME ?? 'strange bird';
const WARTEN = Number(process.env.WARTEN ?? 2200);
fs.mkdirSync(ordner, { recursive: true });

const belegt = await new Promise((fertig) => {
  const c = net.connect(PORT, '127.0.0.1');
  c.once('connect', () => (c.end(), fertig(true)));
  c.once('error', () => fertig(false));
});
let server = null;
if (!belegt) {
  process.env.EDITOR_WEB = '1';
  const { createServer } = await import('vite');
  server = await createServer({ configFile: path.join(editor, 'vite.config.ts'), root: editor, logLevel: 'error', server: { port: PORT, strictPort: true, host: '127.0.0.1' } });
  await server.listen();
}
process.env.OZZY_URL = `http://127.0.0.1:${PORT}/ozzy.html`;
const { auf } = await import('../pruefen/ozzy-teile.mjs');
const B = Number(process.env.B ?? 1200);
const H = Number(process.env.H ?? 800);
const { browser, s, O, geladen, fehler } = await auf({ form: NAME, b: B, h: H, extra: [`shader=${nur[0] ?? 'comicdruck'}`, process.env.EXTRA ?? ''].filter(Boolean).join('&') });
try {
  await geladen();
  await s.mouse.move(5, 5);
  const blick = {};
  if (process.env.GIER) blick.gier = (Number(process.env.GIER) * Math.PI) / 180;
  if (process.env.NEIGUNG) blick.neigung = (Number(process.env.NEIGUNG) * Math.PI) / 180;
  if (process.env.ZOOM) blick.zoom = Number(process.env.ZOOM);
  if (Object.keys(blick).length) await O('blickSetzen', blick);
  const liste = nur.length ? nur : (await O('shader')).liste;
  for (const id of liste) {
    await O('shader', id, { buehne: process.env.BUEHNE !== '0', neu: true, ...(process.env.REGLER ? { regler: JSON.parse(process.env.REGLER) } : {}) });
    await s.waitForTimeout(WARTEN);
    const m = await O('shader');
    const bild = await s.evaluate(() => {
      window.__ozzy.film(true);
      window.__ozzy.bild(1 / 60);
      const url = document.getElementById('haut').toDataURL('image/png');
      window.__ozzy.film(false);
      return url;
    });
    fs.writeFileSync(path.join(ordner, `${id}.png`), Buffer.from(bild.split(',')[1], 'base64'));
    if (process.env.SEITE === '1') await s.screenshot({ path: path.join(ordner, `${id}-seite.png`) });
    console.log(`${id.padEnd(18)} ${m.wahl === id ? '' : `(gewählt: ${m.wahl}) `}${m.ms.toFixed(2).replace('.', ',')} ms auf dem Prozessor, ${m.bilder} Bilder${m.info ? ` ${JSON.stringify(m.info)}` : ''}`);
  }
  if (fehler.length) console.log(`Konsole:\n  ${[...new Set(fehler)].slice(0, 12).join('\n  ')}`);
  else console.log('Konsole ohne Fehler');
} finally {
  await browser.close();
  await server?.close();
}
