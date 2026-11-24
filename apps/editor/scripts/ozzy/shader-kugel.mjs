// Ozzy, Shader (21.11.2026): ein Shader an einer frisch aufgeblasenen Kugel, zum Vergleich mit Vorlagen, die eine Materialkugel
// zeigen (Florian: „kannst du versuchen dieses material wirklich genauso hinzubekommen?“). Blick gerade von vorn, quadratisch.
// Läuft auf Port 5219 (Eintrag `ozzy-shader`); ist dort kein Server, startet das Skript für die Dauer des Laufs einen eigenen Vite.
// Aufruf aus apps/editor:
//   node scripts/ozzy/shader-kugel.mjs <ziel.png> <id>
//   ZOOM=3.1 GIER=<Grad> NEIGUNG=<Grad> WARTEN=<ms> BUEHNE=0 REGLER='{"relief":1.2}' B=1000 DICHTE=1.8 RADIUS=115 (150: die flachere Linse
//   der Tropfschleim-Bilder vom 21.11.). Die frische Form bleibt eine liegende Linse; senkrecht von oben geht nicht (die Raumkiste
//   hält die Kamera, die Draufsicht zeigt im Shader nur das Blatt). Für Fell von schräg oben: NEIGUNG=64 ZOOM=2.0
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const hier = path.dirname(fileURLToPath(import.meta.url));
const editor = path.join(hier, '..', '..');
const PORT = Number(process.env.PORT ?? 5219);
const ziel = process.argv[2];
const id = process.argv[3];
if (!ziel || !id) {
  console.log('Aufruf: node scripts/ozzy/shader-kugel.mjs <ziel.png> <shader-id>');
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
const B = Number(process.env.B ?? 1000);
// (während des Aufblasens ein leichter Shader: Mit einem schweren laufen die Bilder langsam, das Aufblasen und die Fahrt der Kamera
// sind dann bei der Aufnahme noch nicht fertig, und der Blick landet je nach Lauf woanders)
const { browser, s, O, geladen, fehler } = await auf({ form: '', b: B, h: B, dichte: Number(process.env.DICHTE ?? 1.8), extra: 'shader=autolack' });
try {
  // ein Kreis, aufgeblasen. Halbmesser 115 = WERK_DICKE (main.ts), die größte halbe Dicke: Ein größerer Kreis gibt eine flachere
  // Linse (bei 150 lag sie mit einer halben Dicke von 115 da). Auch mit 115 bleibt sie eine liegende Linse, keine Kugel.
  const RK = Number(process.env.RADIUS ?? 115);
  const [cx, cy, R, k] = [B / 2, B / 2, RK, 0.5523 * RK];
  await O('form', [
    { x: cx + R, y: cy, ein: [0, -k], aus: [0, k] },
    { x: cx, y: cy + R, ein: [k, 0], aus: [-k, 0] },
    { x: cx - R, y: cy, ein: [0, k], aus: [0, -k] },
    { x: cx, y: cy - R, ein: [-k, 0], aus: [k, 0] },
  ]);
  await s.waitForTimeout(300);
  await O('aufblasen');
  await geladen();
  await s.waitForFunction(() => window.__ozzy.zustand() === 'ruhe', null, { timeout: 90000 });
  await s.waitForTimeout(500);
  await s.mouse.move(5, 5);
  await O('blickSetzen', {
    gier: (Number(process.env.GIER ?? 0) * Math.PI) / 180,
    neigung: (Number(process.env.NEIGUNG ?? 0) * Math.PI) / 180,
    zoom: Number(process.env.ZOOM ?? 3.1),
  });
  await O('shader', id, { buehne: process.env.BUEHNE !== '0', neu: true, ...(process.env.REGLER ? { regler: JSON.parse(process.env.REGLER) } : {}) });
  await s.waitForTimeout(Number(process.env.WARTEN ?? 3000));
  const bild = await s.evaluate(() => {
    window.__ozzy.film(true);
    window.__ozzy.bild(1 / 60);
    const url = document.getElementById('haut').toDataURL('image/png');
    window.__ozzy.film(false);
    return url;
  });
  fs.mkdirSync(path.dirname(path.resolve(ziel)), { recursive: true });
  fs.writeFileSync(ziel, Buffer.from(bild.split(',')[1], 'base64'));
  console.log(fehler.length ? `Konsole: ${fehler.slice(0, 3).join(' | ')}` : 'Konsole ohne Fehler');
} finally {
  await browser.close();
  if (server) await server.close();
}
