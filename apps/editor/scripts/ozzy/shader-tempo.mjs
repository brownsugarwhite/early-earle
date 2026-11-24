// Ozzy, Shader (24.11.2026): wie lange ein Bild dauert, je Shader, an „strange bird“ im Blick der Bilder (je Bild selbst gezeichnet,
// danach ein Bildpunkt zurückgelesen: so zählt die Arbeit der Grafikkarte mit). „Stand“: der Blick steht, „bewegt“: der Blick dreht sich (Fell rechnet dann weniger
// Schalen in kleinerer Auflösung). Median und 90 %.
// Aufruf aus apps/editor (Port 5219, Eintrag `ozzy-shader`; ist dort kein Server, startet das Skript einen eigenen Vite):
//   node scripts/ozzy/shader-tempo.mjs <id> [<id> …]     ZOOM=2.4 NAME='strange bird' B=1200 H=800 DICHTE=2
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const hier = path.dirname(fileURLToPath(import.meta.url));
const editor = path.join(hier, '..', '..');
const PORT = Number(process.env.PORT ?? 5219);
const ids = process.argv.slice(2);
if (!ids.length) {
  console.log('Aufruf: node scripts/ozzy/shader-tempo.mjs <id> [<id> …]');
  process.exit(1);
}
const belegt = await new Promise((fertig) => {
  const c = net.connect(PORT, 'localhost');
  c.once('connect', () => (c.end(), fertig(true)));
  c.once('error', () => fertig(false));
});
let server = null;
if (!belegt) {
  process.env.EDITOR_WEB = '1';
  const { createServer } = await import('vite');
  server = await createServer({ configFile: path.join(editor, 'vite.config.ts'), root: editor, logLevel: 'error', server: { port: PORT, strictPort: true, host: 'localhost' } });
  await server.listen();
}
process.env.OZZY_URL = `http://localhost:${PORT}/ozzy.html`;
const { auf } = await import('../pruefen/ozzy-teile.mjs');
const { browser, s, O, geladen, fehler } = await auf({
  form: process.env.NAME ?? 'strange bird',
  b: Number(process.env.B ?? 1200),
  h: Number(process.env.H ?? 800),
  dichte: Number(process.env.DICHTE ?? 2),
  extra: 'shader=autolack',
});
const gier0 = (-30 * Math.PI) / 180;
const neigung0 = (8 * Math.PI) / 180;
const zahl = (b, q) => {
  const a = b.map((x) => x.abstand).filter((x) => x > 0).sort((x, y) => x - y);
  return a.length ? a[Math.min(a.length - 1, Math.floor(q * a.length))] : NaN;
};
const f = (x) => x.toFixed(1).replace('.', ',');
try {
  await geladen();
  await s.mouse.move(5, 5);
  await O('blickSetzen', { gier: gier0, neigung: neigung0, zoom: Number(process.env.ZOOM ?? 2.4) });
  for (const id of ids) {
    await O('shader', id, { buehne: true, neu: true });
    await s.waitForTimeout(2500);
    // je Bild selbst zeichnen und auf die Grafikkarte warten (ein Bildpunkt zurückgelesen): so zählt die Arbeit der Karte mit
    const messe = (bewegt) =>
      s.evaluate(
        async ([bewegt2, g0]) => {
          const o = window.__ozzy;
          const c = document.getElementById('haut');
          const gl = c.getContext('webgl2');
          const px = new Uint8Array(4);
          o.film(true);
          const zeiten = [];
          for (let i = 0; i < 40; i++) {
            if (bewegt2) o.blickSetzen({ gier: g0 + i * 0.01 });
            const t0 = performance.now();
            o.bild(1 / 60);
            gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
            zeiten.push(performance.now() - t0);
            await new Promise((r) => setTimeout(r, 5));
          }
          o.film(false);
          return zeiten.slice(5).map((ms) => ({ abstand: ms }));
        },
        [bewegt, gier0],
      );
    const stand = await messe(false);
    const bewegt = await messe(true);
    console.log(`${id.padEnd(20)} Stand ${f(zahl(stand, 0.5))} ms (90 %: ${f(zahl(stand, 0.9))}) · bewegt ${f(zahl(bewegt, 0.5))} ms (90 %: ${f(zahl(bewegt, 0.9))}) · ${stand.length}/${bewegt.length} Bilder`);
  }
  console.log(fehler.length ? `Konsole: ${fehler.slice(0, 3).join(' | ')}` : 'Konsole ohne Fehler');
} finally {
  await browser.close();
  if (server) await server.close();
}
