// Aufruf aus dem Repo: node apps/editor/scripts/pruefen/spielstufe-bild.mjs
// Umgebung: NAMEN (Standard rex,langhals), AUSGABE (Ordner der JSON-Netze aus `spielstufe.ts` mit BILD=1, Standard
// apps/editor/pruefen-ausgabe), KACHEL (px, Standard 480), ZIEL (Ordner für die PNGs, Standard docs/progress/editor).
//
// Spielstufe (02.11.2026), Sichtprobe: Stufe 1 (Spiel) neben Stufe 3 (Editor) als Cel-Bild — Spalten: Stufe 1 flach
// (Dreiecksnormalen, so sähe ein ungeglättetes Spielnetz aus), Stufe 1 mit glatten Punktnormalen, Stufe 1 mit den Normalen der
// Grenzfläche (aus Stufe 3 an denselben Käfigpunkten; Punktnummern bleiben über die Stufen), Stufe 3 Grenzfläche; Zeilen: Seite
// (orthografisch, von +z) mit der gezeichneten Seitenkurve (rot, 1 px) und eine 45°-Ansicht (orthografisch). three.js
// (MeshToonMaterial, 3 Cel-Stufen) kommt aus `apps/editor/node_modules/three/build` über `page.route` (kein CDN).
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const hier = dirname(fileURLToPath(import.meta.url));
const repo = resolve(hier, '../../../..');
const AUSGABE = resolve(process.env.AUSGABE ?? resolve(repo, 'apps/editor/pruefen-ausgabe'));
const ZIEL = resolve(process.env.ZIEL ?? resolve(repo, 'docs/progress/editor'));
const THREE = resolve(repo, 'apps/editor/node_modules/three/build');
const NAMEN = (process.env.NAMEN ?? 'rex,langhals').split(',').filter(Boolean);
const KACHEL = Number(process.env.KACHEL ?? 480);
const DATUM = '2026-11-02';

const html = (name) => `<!doctype html><html><head><meta charset="utf-8">
<script type="importmap">{"imports":{"three":"https://local.three/three.module.js"}}</script>
<style>body{margin:0;background:#f4efe6;font:13px/1.3 -apple-system,Helvetica,sans-serif;color:#222}canvas#bogen{display:block}</style>
</head><body><canvas id="bogen"></canvas>
<script type="module">
import * as THREE from 'three';
const K = ${KACHEL};
const SPALTEN = ['Stufe 1 flach (Dreiecksnormalen)', 'Stufe 1, glatte Punktnormalen', 'Stufe 1, Normalen der Grenzfläche', 'Stufe 3 Grenzfläche (Editor)'];
const ZEILEN = ['Seite (+z), rot = gezeichnete Kurve', '45°'];
const daten = await (await fetch('https://local.three/daten/${name}.json')).json();
const bogen = document.getElementById('bogen');
const KOPF = 44;
bogen.width = 4 * K;
bogen.height = KOPF + 2 * (K + 22);
const g2 = bogen.getContext('2d');
g2.fillStyle = '#f4efe6';
g2.fillRect(0, 0, bogen.width, bogen.height);
g2.fillStyle = '#222';
g2.font = 'bold 16px -apple-system, Helvetica, sans-serif';
g2.fillText('Spielstufe · ' + daten.name + ' · Stufe 1 (Spiel, ' + (daten.stufe1.flaechen.length * 2) + ' Dreiecke) neben Stufe 3 (Editor, ' + (daten.stufe3.flaechen.length * 2) + ' Dreiecke) · Cel-Stufen · ' + '${DATUM}' + ' · Abnahme offen', 10, 22);
g2.font = '13px -apple-system, Helvetica, sans-serif';
g2.fillText('Beide orthografisch, gleicher Maßstab. Stufe 1 als reine Catmull-Clark-Lage; Normalen der Grenzfläche = Punktnormalen der Stufe 3 an denselben Käfigpunkten.', 10, 38);

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(K, K);
renderer.setClearColor(0xf4efe6, 1);
// drei Cel-Stufen
const stufen = new Uint8Array([70, 160, 255]);
const verlauf = new THREE.DataTexture(stufen, 3, 1, THREE.RedFormat);
verlauf.minFilter = THREE.NearestFilter;
verlauf.magFilter = THREE.NearestFilter;
verlauf.generateMipmaps = false;
verlauf.needsUpdate = true;
const material = new THREE.MeshToonMaterial({ color: 0xe0955a, gradientMap: verlauf });

const geometrie = (positionen, flaechen, normalen, flach) => {
  const idx = [];
  for (const f of flaechen) for (let k = 1; k + 1 < f.length; k++) idx.push(f[0], f[k], f[k + 1]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(Float32Array.from(positionen), 3));
  g.setIndex(idx);
  if (flach) {
    const n = g.toNonIndexed();
    n.computeVertexNormals();
    return n;
  }
  g.setAttribute('normal', new THREE.Float32BufferAttribute(Float32Array.from(normalen), 3));
  return g;
};
const s1 = daten.stufe1;
const s3 = daten.stufe3;
const geos = [
  geometrie(s1.positionen, s1.flaechen, null, true),
  geometrie(s1.positionen, s1.flaechen, s1.normalen, false),
  geometrie(s1.positionen, s1.flaechen, s1.grenzNormalen, false),
  geometrie(s3.positionen, s3.flaechen, s3.normalen, false),
];
// Rahmen aus Stufe 3
const box = new THREE.Box3().setFromBufferAttribute(geos[3].getAttribute('position'));
const mitte = box.getCenter(new THREE.Vector3());
const groesse = box.getSize(new THREE.Vector3());
const halb = 0.5 * Math.max(groesse.x, groesse.y, groesse.z) * 1.12;

const licht = new THREE.DirectionalLight(0xffffff, 2.2);
licht.position.set(-0.45, 0.8, 0.55);
const umgebung = new THREE.AmbientLight(0xffffff, 0.35);

const kamera = (zeile) => {
  const cam = new THREE.OrthographicCamera(-halb, halb, halb, -halb, 0.01, 10);
  if (zeile === 0) cam.position.set(mitte.x, mitte.y, mitte.z + 3);
  else {
    const az = -Math.PI / 4;
    const el = (25 * Math.PI) / 180;
    cam.position.set(mitte.x + 3 * Math.cos(el) * Math.sin(az), mitte.y + 3 * Math.sin(el), mitte.z + 3 * Math.cos(el) * Math.cos(az));
  }
  cam.lookAt(mitte);
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld();
  return cam;
};

for (let zeile = 0; zeile < 2; zeile++) {
  const cam = kamera(zeile);
  for (let spalte = 0; spalte < 4; spalte++) {
    const szene = new THREE.Scene();
    szene.add(licht.clone(), umgebung.clone());
    szene.add(new THREE.Mesh(geos[spalte], material));
    renderer.render(szene, cam);
    const x0 = spalte * K;
    const y0 = KOPF + zeile * (K + 22);
    g2.drawImage(renderer.domElement, x0, y0);
    if (zeile === 0) {
      // gezeichnete Seitenkurve in Bildpixeln (orthografisch: Welt → NDC → Kachel)
      g2.strokeStyle = '#c8102e';
      g2.lineWidth = 1;
      g2.beginPath();
      daten.umrisse.seite.forEach(([x, y], i) => {
        const v = new THREE.Vector3(x, y, 0).project(cam);
        const px = x0 + ((v.x + 1) / 2) * K;
        const py = y0 + ((1 - v.y) / 2) * K;
        if (i === 0) g2.moveTo(px, py);
        else g2.lineTo(px, py);
      });
      g2.closePath();
      g2.stroke();
    }
    g2.fillStyle = '#222';
    g2.fillText(SPALTEN[spalte] + (spalte === 0 ? ' · ' + ZEILEN[zeile] : ''), x0 + 8, y0 + K + 15);
  }
}
window.fertig = true;
</script></body></html>`;

mkdirSync(ZIEL, { recursive: true });
const browser = await chromium.launch();
try {
  for (const name of NAMEN) {
    const json = resolve(AUSGABE, `spielstufe-netz-${name}.json`);
    if (!existsSync(json)) {
      console.log(`${name}: ${json} fehlt (spielstufe.ts mit BILD=1 laufen lassen)`);
      continue;
    }
    const page = await browser.newPage({ viewport: { width: 4 * KACHEL + 20, height: 2 * KACHEL + 120 }, deviceScaleFactor: 1 });
    page.on('pageerror', (e) => console.log(`${name}: Seitenfehler ${e.message}`));
    page.on('console', (m) => {
      if (m.type() === 'error' || m.type() === 'warning') console.log(`${name}: ${m.type()} ${m.text()}`);
    });
    await page.route('https://local.three/**', (route) => {
      const url = new URL(route.request().url());
      if (url.pathname.startsWith('/daten/')) return route.fulfill({ body: readFileSync(json), contentType: 'application/json' });
      const datei = resolve(THREE, basename(url.pathname));
      if (!existsSync(datei)) return route.fulfill({ status: 404, body: '' });
      return route.fulfill({ body: readFileSync(datei), contentType: 'application/javascript' });
    });
    await page.setContent(html(name));
    await page.waitForFunction(() => window.fertig === true, null, { timeout: 120000 });
    const ziel = resolve(ZIEL, `spielstufe-${name}-${DATUM}.png`);
    await page.locator('#bogen').screenshot({ path: ziel });
    console.log(`${name}: ${ziel}`);
    await page.close();
  }
} finally {
  await browser.close();
}
