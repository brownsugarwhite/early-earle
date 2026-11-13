// Die Geistermaus: Beim Start führt eine durchscheinende Maus die wichtigsten Gesten vor (dieselben Ereignisse wie eine
// echte Maus), danach stellt sie alles wieder her. „?“ zeigt sie noch einmal. Jede echte Taste, jedes Rad und jeder Klick
// beendet die Vorführung sofort.
// Filme (`?film=<name>`): die Filmuhr läuft Bild für Bild von außen (window.__film.schritt), wie in Runde 1.

import { PAR } from '../parameter.js';

const glatt = (u) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);
function aufWeg(w, u) {
  if (w.length === 1) return w[0];
  // gleichmäßig nach Bogenlänge
  let L = 0;
  const l = [0];
  for (let i = 1; i < w.length; i++) { L += Math.hypot(w[i][0] - w[i - 1][0], w[i][1] - w[i - 1][1]); l.push(L); }
  const s = u * L;
  let i = 1;
  while (i < w.length - 1 && l[i] < s) i++;
  const f = (s - l[i - 1]) / Math.max(1e-9, l[i] - l[i - 1]);
  return [w[i - 1][0] + (w[i][0] - w[i - 1][0]) * f, w[i - 1][1] + (w[i][1] - w[i - 1][1]) * f];
}

export function geistAnbinden(app, drehbuecher) {
  const sz = [];
  const geist = { x: -100, y: -100, knopf: null, rad: 0, spur: [], sichtbar: 0, an: false, taste: null, tasteT: 0 };
  app.geist = geist;
  let id = 7000;
  const ev = (x, y, knopf, extra = {}) => ({ pointerId: 7777, pointerType: 'mouse', clientX: x, clientY: y, button: knopf ?? 0, timeStamp: window.__filmZeit ?? performance.now(), geist: true, getCoalescedEvents: null, ...extra });
  const nach = (x, y) => {
    geist.x = x;
    geist.y = y;
    geist.spur.push([x, y]);
    if (geist.spur.length > 18) geist.spur.shift();
  };

  // ---- Szenen ----
  const G = {
    warte: (s) => sz.push({ s, f: () => {} }),
    tue: (fn) => sz.push({ s: 0, f: (u, k) => { if (!k.getan) { k.getan = true; fn(); } } }),
    // schweben zu einem Ort (Funktion → [x, y]), ohne Taste
    gehe: (wo, s = 0.6) => sz.push({ s, start: () => ({ a: [geist.x, geist.y], b: wo() }), f: (u, k) => {
      const g = glatt(u);
      const x = k.a[0] + (k.b[0] - k.a[0]) * g, y = k.a[1] + (k.b[1] - k.a[1]) * g;
      nach(x, y);
      app.eingabe.bewegen(ev(x, y, null));
    } }),
    // ziehen mit Taste (0 links, 2 rechts) entlang eines Wegs (Funktion → [[x, y], …])
    zieh: (weg, s, knopf = 0, opt = {}) => sz.push({ s, start: () => ({ w: weg(), id: id++ }), f: (u, k) => {
      const g = opt.gleich ? u : glatt(u);
      const p = aufWeg(k.w, g);
      if (!k.an) {
        k.an = true;
        nach(k.w[0][0], k.w[0][1]);
        geist.knopf = knopf;
        if (opt.taste) app.tasten.add(opt.taste);
        app.eingabe.runter(ev(k.w[0][0], k.w[0][1], knopf, { altKey: opt.taste === 'Alt', shiftKey: opt.taste === 'Shift' }));
        return;
      }
      nach(p[0], p[1]);
      app.eingabe.bewegen(ev(p[0], p[1], knopf));
      if (u >= 1 && !k.aus) {
        k.aus = true;
        app.eingabe.hoch(ev(p[0], p[1], knopf));
        if (opt.taste) app.tasten.delete(opt.taste);
        geist.knopf = null;
      }
    } }),
    klick: (wo, n = 1) => sz.push({ s: 0.13 * n + 0.12, start: () => ({ p: wo() }), f: (u, k) => {
      const schritte = Math.floor(u * n * 2 + 1e-6);
      while ((k.z || 0) < Math.min(schritte, n * 2)) {
        const z = k.z || 0;
        nach(k.p[0], k.p[1]);
        if (z % 2 === 0) { geist.knopf = 0; app.eingabe.runter(ev(k.p[0], k.p[1], 0)); }
        else { app.eingabe.hoch(ev(k.p[0], k.p[1], 0)); geist.knopf = null; }
        k.z = z + 1;
      }
    } }),
    // Rad: n Rasten (positiv = hinein), über s Sekunden verteilt
    rad: (wo, n, s = 0.8) => sz.push({ s, start: () => ({ p: wo(), z: 0 }), f: (u, k) => {
      const soll = Math.round(Math.abs(n) * u);
      while (k.z < soll) {
        k.z++;
        geist.rad = Math.sign(n);
        nach(k.p[0], k.p[1]);
        app.eingabe.rad(ev(k.p[0], k.p[1], null, { deltaY: -Math.sign(n) * 100, deltaX: 0, deltaMode: 0, ctrlKey: false }));
      }
      if (u >= 1) geist.rad = 0;
    } }),
    taste: (key, s = 0.5) => sz.push({ s, f: (u, k) => {
      if (!k.an) { k.an = true; geist.taste = key; geist.tasteT = 0; app.eingabe.taste({ key, geist: true }); }
      if (u >= 1 && !k.aus) { k.aus = true; app.eingabe.tasteHoch({ key, geist: true }); }
    } }),
  };

  // ---- Abspielen ----
  let i = -1, k = null, t0 = 0, laeuft = false, stand = null, fertigDann = null;
  function takt(t) {
    if (!laeuft) return false;
    if (i < 0 || (k && t - t0 >= sz[i].s * 1000)) {
      if (i >= 0) sz[i].f(1, k);
      i++;
      if (i >= sz.length) { ende(true); return false; }
      t0 = t;
      k = sz[i].start ? sz[i].start() : {};
    }
    const s = sz[i];
    s.f(s.s > 0 ? Math.min(1, (t - t0) / (s.s * 1000)) : 1, k);
    return true;
  }
  function start(name = 'start') {
    if (laeuft) ende(false);
    sz.length = 0;
    const db = drehbuecher[name] || drehbuecher.start;
    if (!db) return;
    stand = app.standMerken ? app.standMerken() : null;
    geist.x = app.W * 0.86;
    geist.y = app.H * 0.82;
    geist.spur = [];
    geist.an = true;
    db(G, app);
    i = -1;
    k = null;
    laeuft = true;
    app.vorfuehrung = true;
  }
  function ende(wiederherstellen) {
    laeuft = false;
    app.vorfuehrung = false;
    geist.an = false;
    geist.knopf = null;
    geist.rad = 0;
    if (app.eingabe.laeuft()) app.eingabe.hoch(ev(geist.x, geist.y, 0));
    if (wiederherstellen && stand && app.standZurueck) app.standZurueck(stand);
    stand = null;
    if (fertigDann) { const f = fertigDann; fertigDann = null; f(); }
  }
  app.vorfuehren = (name) => start(name);
  app.vorfuehrungStoppen = () => { if (laeuft) ende(true); };

  // ---- Zeichnen (in die Überlagerung) ----
  app.geistZeichnen = (c, dt) => {
    geist.sichtbar = Math.max(0, Math.min(1, geist.sichtbar + (geist.an ? dt * 4 : -dt * 3)));
    if (geist.sichtbar <= 0.01) return;
    const a = geist.sichtbar;
    c.save();
    // Spur
    c.lineCap = 'round';
    for (let j = 1; j < geist.spur.length; j++) {
      c.globalAlpha = a * (j / geist.spur.length) * 0.22;
      c.strokeStyle = '#ffffff';
      c.lineWidth = 6 * (j / geist.spur.length);
      c.beginPath();
      c.moveTo(geist.spur[j - 1][0], geist.spur[j - 1][1]);
      c.lineTo(geist.spur[j][0], geist.spur[j][1]);
      c.stroke();
    }
    // Pfeil
    c.translate(geist.x, geist.y);
    c.globalAlpha = a * 0.92;
    c.shadowColor = 'rgba(0,0,0,0.35)';
    c.shadowBlur = 8;
    c.fillStyle = '#ffffff';
    c.strokeStyle = '#141018';
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(0, 0); c.lineTo(0, 19); c.lineTo(4.6, 14.8); c.lineTo(8.2, 22.4); c.lineTo(11, 21.2); c.lineTo(7.4, 13.8); c.lineTo(13.4, 13.4); c.closePath();
    c.fill();
    c.stroke();
    c.shadowBlur = 0;
    // Maus mit gedrückter Taste und Rad
    c.translate(17, 20);
    const w = 14, h = 21, r = 7;
    c.globalAlpha = a * 0.9;
    c.fillStyle = 'rgba(20,16,24,0.55)';
    c.strokeStyle = '#ffffff';
    c.lineWidth = 1.3;
    c.beginPath();
    c.roundRect(0, 0, w, h, r);
    c.fill();
    c.stroke();
    if (geist.knopf === 0 || geist.knopf === 2) {
      c.save();
      c.beginPath();
      c.roundRect(0, 0, w, h, r);
      c.clip();
      c.fillStyle = geist.knopf === 2 ? '#ff72a9' : '#3bfcf2';
      c.fillRect(geist.knopf === 0 ? 0 : w / 2, 0, w / 2, h * 0.42);
      c.restore();
    }
    c.beginPath();
    c.moveTo(w / 2, 0); c.lineTo(w / 2, h * 0.42);
    c.moveTo(0, h * 0.42); c.lineTo(w, h * 0.42);
    c.stroke();
    if (geist.rad) {
      c.fillStyle = '#d4b3f5';
      const ph = ((window.__filmZeit ?? performance.now()) / 120) % 1;
      c.fillRect(w / 2 - 1.2, 3 + (geist.rad > 0 ? 1 - ph : ph) * 4, 2.4, 3);
    }
    c.restore();
  };

  // ---- Film und Start ----
  const film = PAR.get('film');
  if (film) {
    window.__filmZeit = 0;
    let gestartet = false;
    window.__film = {
      schritt(ms = 1000 / 30) {
        window.__filmZeit += ms;
        if (!gestartet && window.__filmZeit > 400) { gestartet = true; if (film !== 'leer') start(film); }
        const l = takt(window.__filmZeit);
        app.bild(window.__filmZeit);
        return l || geist.sichtbar > 0.01;
      },
      geist,
    };
    return { film: true };
  }
  app.geistTakt = (t) => takt(t);
  if (PAR.get('geist') !== '0') setTimeout(() => { if (!app.eingabe.laeuft()) start('start'); }, 1400);
  return { film: false };
}
