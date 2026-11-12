// Erste Probe: Kugel mit Mittellinie, ein Punkt gezogen, alle vier Ansichten im Blatt.
import { kugel } from './netz.js';
import { Haut } from './haut.js';
import { linieAusPfad, abtasten } from './linien.js';
import { Zeichner } from './zeichner.js';
import { OrthoSicht, RaumSicht } from './ansichten.js';

const canvas = document.querySelector('canvas');
const z = new Zeichner(canvas);
const W = window.innerWidth, H = window.innerHeight;
z.groesse(W, H);
const netz = kugel(5, 1);
const haut = new Haut(netz);
const pfad = [];
for (let i = 0; i < 128; i++) { const a = (i / 128) * Math.PI * 2; pfad.push([Math.cos(a), Math.sin(a), 0]); }
const L = linieAusPfad('mitte', pfad, [], 4);
haut.linien.push(L);
haut.einbetten(L);
haut.struktur();
const vorn = L.punkte.reduce((a, b) => (b.p[0] < a.p[0] ? b : a));
vorn.p[0] -= 0.9; vorn.p[1] += 0.25;
haut.verformen();
z.netzSetzen(netz);

const sichten = { seite: new OrthoSicht('seite'), front: new OrthoSicht('front'), top: new OrthoSicht('top'), raum: new RaumSicht() };
const hw = W / 2, hh = H / 2;
const zoom = Math.min(hw, hh) / 3.2;
sichten.seite.setzen({ x: 0, y: 0, w: hw, h: hh }, zoom, [-0.4, 0, 0]);
sichten.front.setzen({ x: hw, y: 0, w: hw, h: hh }, zoom, [0, 0, 0]);
sichten.top.setzen({ x: 0, y: hh, w: hw, h: hh }, zoom, [-0.4, 0, 0]);
sichten.raum.setzen({ x: hw, y: hh, w: hw, h: hh });

function zuege() {
  const out = [];
  for (const z of abtasten(L, 24)) out.push({ ...z, zustand: 0 });
  return out;
}
function bild(t) {
  z.U.uZeit.value = t / 1000;
  z.netzAktualisieren();
  z.linienSetzen(zuege());
  z.punkteSetzen(L.punkte.map((P) => ({ p: P.p, gr: 4.5, zustand: 0 })));
  z.r.setScissorTest(false);
  z.r.setRenderTarget(null);
  z.r.setClearColor(0x000000, 1);
  z.r.clear();
  for (const n of ['seite', 'front', 'top']) {
    const s = sichten[n];
    z.illustration({ name: n, kamera: s.kamera, w: s.rect.w * z.dpr, h: s.rect.h * z.dpr, px: s.zoom * z.dpr, rect: s.rect, hinten: false }, null);
  }
  z.raum(sichten.raum.kamera, sichten.raum.rect, {});
  requestAnimationFrame(bild);
}
requestAnimationFrame(bild);
import * as THREE from 'three'; window.__THREE = THREE; window.__probe = { haut, netz, L, z };
